"""SmartGrow coordinator.

Samples sensors every 60 s via DataUpdateCoordinator but throttles decision
cadence internally: fan every 3 min, dehumidifier every 5 min — mirroring the
proven production automations (faster sampling only feeds the "on change"
paths).

In dry-run mode (default) nothing is commanded; decisions are recorded on
diagnostic entities and logged.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, TypedDict

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    ATTR_ENTITY_ID,
    CONF_ENTITY_ID,
    STATE_ON,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_registry import async_entries_for_config_entry
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .adaptation import AdaptationEngine
from .const import (
    CONF_DEHUM_ENTITY,
    CONF_FAN_ENTITY,
    CONF_LEGACY_DEHUM_AUTOMATION,
    CONF_LEGACY_VENT_AUTOMATION,
    CONF_LUNG_RH_ENTITY,
    CONF_LUNG_TEMP_ENTITY,
    CONF_STAGE_ENTITY,
    CONF_TENT_RH_ENTITY,
    CONF_TENT_TEMP_ENTITY,
    DEFAULTS,
    DOMAIN,
    FanDecisionDict,
)
from .logic import dehumid_control, fan_control
from .logic.params import ControlParams, SensorInputs

_LOGGER = logging.getLogger(__name__)

SCAN_INTERVAL = timedelta(seconds=60)
FAN_CADENCE_S = 180  # proven: every 3 minutes
DEHUM_CADENCE_S = 300  # proven: every 5 minutes
STALE_LIMIT_S = 15 * 60  # availability: sensors stale > 15 min
LEGACY_WARN_MIN_INTERVAL_S = 3600  # log legacy detection at most hourly


class DecisionRecord(TypedDict):
    """One evaluated decision, kept in a bounded trace for get_control_trace."""

    ts: float
    kind: str
    action: str
    reason: str
    fan_target: int
    inputs: dict[str, float | str | bool]
    dry_run: bool


@dataclass(slots=True)
class RuntimeOptions:
    """Options-flow backed ControlParams plus integration switches."""

    dry_run: bool = True
    adaptation_enabled: bool = True
    control: ControlParams = ControlParams()

    @classmethod
    def from_entry(cls, entry: ConfigEntry) -> RuntimeOptions:
        """Build from a config entry's options/data with defaults."""
        opts = dict(DEFAULTS)
        opts.update(entry.options)
        control = ControlParams(
            fan_floor_day=opts["fan_floor_day"],
            fan_floor_night=opts["fan_floor_night"],
            delta_gain=opts["delta_gain"],
            vpd_gain=opts["vpd_gain"],
            need_gain=opts["need_gain"],
            temp_gain=opts["temp_gain"],
            cold_clamp=opts["cold_clamp"],
            dehum_sat_trigger=opts["dehum_sat_trigger"],
            dehum_dry_floor=opts["dehum_dry_floor"],
            adaptation_enabled=opts["adaptation_enabled"],
        )
        return cls(
            dry_run=opts["dry_run"],
            adaptation_enabled=opts["adaptation_enabled"],
            control=control,
        )


class SmartGrowCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Samples sensors, throttles decisions, (non-)actuates."""

    config_entry: ConfigEntry

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialise the coordinator from a config entry."""
        super().__init__(
            hass,
            _LOGGER,
            config_entry=entry,
            name=DOMAIN,
            update_interval=SCAN_INTERVAL,
        )
        self.entry = entry
        self.options_rt = RuntimeOptions.from_entry(entry)
        self.engine = AdaptationEngine(enabled=self.options_rt.adaptation_enabled)
        self.trace: list[DecisionRecord] = []
        self.last_fan_ts: float = 0.0
        self.last_dehum_ts: float = 0.0
        self.last_dehum_action: str = "no_change"
        self.dehum_on: bool = False
        self.last_fan_decision: fan_control.FanDecision | None = None
        self.last_dehum_decision: dehumid_control.DehumDecision | None = None
        self.cycles_24h: list[float] = []
        self.legacy_last_warned: dict[str, float] = {}
        self.last_sample_ts: float | None = None  # availability/staleness
        self.last_inputs: SensorInputs | None = None

    # -- entity id helpers -------------------------------------------------
    @property
    def source_entities(self) -> dict[str, str]:
        """Map of role -> source entity_id from the config entry."""
        data = {**self.entry.data}
        return {
            "fan": data[CONF_FAN_ENTITY],
            "dehum": data[CONF_DEHUM_ENTITY],
            "tent_temp": data[CONF_TENT_TEMP_ENTITY],
            "tent_rh": data[CONF_TENT_RH_ENTITY],
            "lung_temp": data[CONF_LUNG_TEMP_ENTITY],
            "lung_rh": data[CONF_LUNG_RH_ENTITY],
            "stage": data.get(CONF_STAGE_ENTITY, ""),
        }

    @property
    def device_info(self) -> DeviceInfo:
        """DeviceInfo shared by all entities of this entry."""
        return DeviceInfo(
            identifiers={(DOMAIN, self.entry.entry_id)},
            name="SmartGrow",
            manufacturer="SmartGrow",
            model="Grow tent climate controller",
            sw_version="0.1.1",
            configuration_url=None,
        )

    # -- sampling ------------------------------------------------------------
    def _read_float(self, entity_id: str) -> float:
        state = self.hass.states.get(entity_id)
        if state is None or state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            raise UpdateFailed(f"{entity_id} unavailable")
        try:
            return float(state.state)
        except ValueError as err:
            raise UpdateFailed(f"{entity_id} not numeric: {state.state}") from err

    def _read_fan_pct(self, entity_id: str) -> float:
        """Read fan percentage: from the percentage attribute (fan domain),
        falling back to the numeric state (e.g. a template sensor)."""
        state = self.hass.states.get(entity_id)
        if state is None or state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            raise UpdateFailed(f"{entity_id} unavailable")
        pct = state.attributes.get("percentage")
        if pct is not None:
            try:
                return float(pct)
            except (TypeError, ValueError) as err:
                raise UpdateFailed(
                    f"{entity_id} percentage not numeric: {pct}"
                ) from err
        try:
            return float(state.state)
        except ValueError as err:
            raise UpdateFailed(f"{entity_id} not numeric: {state.state}") from err

    def _read_bool(self, entity_id: str, on_states: set[str] | None = None) -> bool:
        state = self.hass.states.get(entity_id)
        if state is None or state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            raise UpdateFailed(f"{entity_id} unavailable")
        if on_states is not None:
            return state.state in on_states
        return state.state == STATE_ON

    def _gather_inputs(self) -> SensorInputs:
        src = self.source_entities
        stage_entity_state = (
            self.hass.states.get(src["stage"]) if src["stage"] else None
        )
        stage = (stage_entity_state.state if stage_entity_state else "") or "Flowering"
        is_day = self._read_bool(src["dehum"]) is not None and self._lamp_is_on()
        return SensorInputs(
            tent_temp=self._read_float(src["tent_temp"]),
            tent_rh=self._read_float(src["tent_rh"]),
            lung_temp=self._read_float(src["lung_temp"]),
            lung_rh=self._read_float(src["lung_rh"]),
            vpd=self._read_vpd(),
            fan_pct=self._read_fan_pct(src["fan"]),
            is_day=is_day,
            stage=stage,
            timestamp=time.time(),
        )

    def _read_vpd(self) -> float:
        """Prefer the production VPD template sensor if configured."""
        data = self.entry.data
        vpd_entity = data.get("vpd_entity")
        if vpd_entity:
            return self._read_float(vpd_entity)
        # Fallback: compute from tent temp/RH (same Magnus math).
        from .logic.physics import vpd_kpa

        return vpd_kpa(
            self._read_float(self.source_entities["tent_temp"]),
            self._read_float(self.source_entities["tent_rh"]),
        )

    def _lamp_is_on(self) -> bool:
        """Day/night from the lamp entity when configured, else 12/12 clock."""
        data = self.entry.data
        lamp = data.get("lamp_entity")
        if lamp:
            return self._read_bool(lamp)
        hour = time.localtime().tm_hour
        return 6 <= hour < 18

    # -- coordinator update -------------------------------------------------
    async def _async_update_data(self) -> dict[str, Any]:
        """Sample sensors and run throttled decisions."""
        try:
            inputs = self._gather_inputs()
        except UpdateFailed as err:
            raise UpdateFailed(str(err)) from err
        self.last_inputs = inputs
        self.last_sample_ts = time.time()

        now = time.time()
        base = self.options_rt.control
        # Adaptation may rewrite gains/margins (watchdog-guarded).
        if self.engine.check_watchdog(base):
            params = base
        else:
            params = base.with_updates(adaptation_enabled=False)
            self.hass.add_job(self._async_raise_watchdog_issue)

        result: dict[str, Any] = {"inputs": inputs, "ts": now}

        # Fan: proven 3-minute cadence.
        if now - self.last_fan_ts >= FAN_CADENCE_S:
            self.last_fan_ts = now
            decision = fan_control.compute_fan(inputs, params)
            self.last_fan_decision = decision
            await self._apply_fan(decision, inputs)
            result["fan"] = decision

        # Dehumidifier: proven 5-minute cadence.
        if now - self.last_dehum_ts >= DEHUM_CADENCE_S:
            self.last_dehum_ts = now
            decision = dehumid_control.compute_dehum(inputs, params, self.dehum_on)
            self.last_dehum_decision = decision
            await self._apply_dehum(decision, inputs)
            result["dehum"] = decision

        self._check_legacy_automations()
        return result

    # -- actuation / dry-run -------------------------------------------------
    async def _apply_fan(
        self, decision: fan_control.FanDecision, inputs: SensorInputs
    ) -> None:
        fan_entity = self.entry.data[CONF_FAN_ENTITY]
        if self.options_rt.dry_run:
            _LOGGER.debug(
                "DRY-RUN fan -> %d%% (active term: %s)",
                decision.fan_target,
                decision.active_term,
            )
            self._record(
                "fan", "dry_run", decision.active_term, decision.fan_target, inputs
            )
        else:
            await self.hass.services.async_call(
                "fan",
                "turn_on" if decision.fan_target > 0 else "turn_off",
                (
                    {ATTR_ENTITY_ID: fan_entity, "percentage": decision.fan_target}
                    if decision.fan_target > 0
                    else {ATTR_ENTITY_ID: fan_entity}
                ),
                blocking=True,
            )
            self._record(
                "fan", "command", decision.active_term, decision.fan_target, inputs
            )

    async def _apply_dehum(
        self, decision: dehumid_control.DehumDecision, inputs: SensorInputs
    ) -> None:
        dehum_entity = self.entry.data[CONF_DEHUM_ENTITY]
        if decision.action == "no_change":
            self._record("dehum", "no_change", decision.reason, -1, inputs)
            return
        self.dehum_on = decision.action == "on"
        if self.options_rt.dry_run:
            _LOGGER.debug("DRY-RUN dehum -> %s (%s)", decision.action, decision.reason)
            self._record("dehum", "dry_run", decision.reason, -1, inputs)
        else:
            await self.hass.services.async_call(
                "switch" if dehum_entity.startswith("switch.") else "humidifier",
                "turn_on" if self.dehum_on else "turn_off",
                {ATTR_ENTITY_ID: dehum_entity},
                blocking=True,
            )
            self._record("dehum", "command", decision.reason, -1, inputs)
        # cycle counting for the last 24h (oscillation visibility)
        if self.cycles_24h and self.cycles_24h[-1] is not None:
            pass
        self.cycles_24h.append(time.time())
        self.cycles_24h[:] = [t for t in self.cycles_24h if time.time() - t <= 86400]

    def _record(
        self, kind: str, action: str, reason: str, fan_target: int, inputs: SensorInputs
    ) -> None:
        self.trace.append(
            DecisionRecord(
                ts=time.time(),
                kind=kind,
                action=action,
                reason=reason,
                fan_target=fan_target,
                inputs={
                    "tent_temp": inputs.tent_temp,
                    "tent_rh": inputs.tent_rh,
                    "lung_temp": inputs.lung_temp,
                    "lung_rh": inputs.lung_rh,
                    "vpd": inputs.vpd,
                    "fan_pct": inputs.fan_pct,
                    "is_day": inputs.is_day,
                    "stage": inputs.stage,
                },
                dry_run=self.options_rt.dry_run,
            )
        )
        if len(self.trace) > 500:
            self.trace[:] = self.trace[-500:]

    # -- legacy automation detection ------------------------------------------
    @callback
    def _check_legacy_automations(self) -> None:
        """Log (hourly max) if legacy automations fired while dry-running."""
        if not self.options_rt.dry_run:
            return
        now = time.time()
        for key in (CONF_LEGACY_VENT_AUTOMATION, CONF_LEGACY_DEHUM_AUTOMATION):
            entity_id = self.entry.data.get(key)
            if not entity_id:
                continue
            state = self.hass.states.get(entity_id)
            if state is None or state.attributes.get("last_triggered") is None:
                continue
            last = state.attributes["last_triggered"].timestamp()
            if now - last < LEGACY_WARN_MIN_INTERVAL_S and (
                now - self.legacy_last_warned.get(key, 0) >= LEGACY_WARN_MIN_INTERVAL_S
            ):
                self.legacy_last_warned[key] = now
                _LOGGER.warning(
                    "Legacy automation %s triggered while SmartGrow is in "
                    "dry-run: both systems may fight. Disable the legacy "
                    "automations to cut over.",
                    entity_id,
                )

    # -- watchdog repair -------------------------------------------------------
    async def _async_raise_watchdog_issue(self) -> None:
        """Create a repair issue when the adaptation watchdog trips."""
        from .repairs import async_create_watchdog_issue

        await async_create_watchdog_issue(
            self.hass, self.entry, self.engine.disabled_reason
        )

    # -- staleness ---------------------------------------------------------------
    def stale_seconds(self) -> float | None:
        """Seconds since last successful sensor sample (None if never)."""
        if self.last_sample_ts is None:
            return None
        return time.time() - self.last_sample_ts

    def is_stale(self) -> bool:
        """True when sensors are staler than the 15-minute limit."""
        age = self.stale_seconds()
        return age is None or age > STALE_LIMIT_S

    # -- registry helpers ------------------------------------------------------
    def entities_for_entry(self) -> list[str]:
        """Entity ids registered for this config entry."""
        entity_reg = dr.async_get(self.hass)
        return [
            entry.entity_id
            for entry in async_entries_for_config_entry(
                entity_reg, self.entry.entry_id  # type: ignore[arg-type]
            )
        ]


def async_get_coordinator(
    hass: HomeAssistant, entry: ConfigEntry
) -> SmartGrowCoordinator:
    """Fetch the coordinator stored by async_setup_entry."""
    runtime = hass.data[DOMAIN][entry.entry_id]
    return runtime["coordinator"]


class CoordinatorError(HomeAssistantError):
    """Raised when MCP tools cannot reach the coordinator."""


# Re-exported for the entity platforms.
__all__ = [
    "SmartGrowCoordinator",
    "RuntimeOptions",
    "async_get_coordinator",
    "FanDecisionDict",
]


class _Unused(TypedDict):  # pragma: no cover - typing anchor only
    """Keeps CONF_ENTITY_ID import referenced for future HA validators."""


_unused: type[_Unused] = _Unused
_ = CONF_ENTITY_ID
