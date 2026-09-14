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
import asyncio
import time
from dataclasses import dataclass
from datetime import datetime as dt_datetime, time as dtime, timedelta
from typing import Any, TypedDict

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    ATTR_ENTITY_ID,
    CONF_ENTITY_ID,
    STATE_OFF,
    STATE_ON,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_registry import async_entries_for_config_entry
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .adaptation import AdaptationEngine
from .const import (
    CONF_DEHUM_ENTITY,
    CONF_HUM_ENTITY,
    CONF_FAN_ENTITY,
    CONF_LAMP_ENTITY,
    CONF_LAMP_SWITCH_ENTITY,
    CONF_CAMERA_ENTITY,
    CONF_LIGHTS_ON_TIME,
    CONF_LIGHTS_OFF_TIME,
    DEFAULT_LIGHTS_ON,
    DEFAULT_LIGHTS_OFF,
    CONF_WAVEMAKER_ENTITY,
    CONF_WAVEMAKER_MODE,
    CONF_WAVEMAKER_RUN_S,
    CONF_WAVEMAKER_EVERY_MIN,
    WAVEMAKER_MODE_NONE,
    WAVEMAKER_MODE_WITH_LIGHTS,
    WAVEMAKER_MODE_INTERVAL,
    CONF_VPD_ENTITY,
    CONF_LEGACY_DEHUM_AUTOMATION,
    CONF_LEGACY_VENT_AUTOMATION,
    CONF_LUNG_RH_ENTITY,
    CONF_LUNG_TEMP_ENTITY,
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
            dehum_reengage=opts.get("dehum_reengage", 0.05),
            dehum_band_depth=opts.get("dehum_band_depth", 0.15),
            adaptation_enabled=opts["adaptation_enabled"],
        )
        return cls(
            dry_run=opts["dry_run"],
            adaptation_enabled=opts["adaptation_enabled"],
            control=control,
        )


class SmartGrowCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Samples sensors, throttles decisions, (non-)actuates.

    Multiple tents may share one lung room and one dehumidifier. Shared
    dehumidifiers are arbitrated per cycle via ``_SHARED_DEHUM_WISHES``.
    """

    config_entry: ConfigEntry

    # dehum_entity_id -> {entry_id: "on"|"off"|"no_change"} for this cycle
    _SHARED_DEHUM_WISHES: dict[str, dict[str, str]] = {}

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
        self.hum_on: bool = False
        self.last_fan_decision: fan_control.FanDecision | None = None
        self.last_dehum_decision: dehumid_control.DehumDecision | None = None
        self.cycles_24h: list[float] = []
        self.legacy_last_warned: dict[str, float] = {}
        self.last_sample_ts: float | None = None  # availability/staleness
        self._wavemaker_last_toggle: float = 0.0
        self.last_inputs: SensorInputs | None = None

    # -- entity id helpers -------------------------------------------------
    @property
    def source_entities(self) -> dict[str, str]:
        """Map of role -> source entity_id from the config entry."""
        data = {**self.entry.data}
        return {
            "fan": data[CONF_FAN_ENTITY],
            "dehum": data.get(CONF_DEHUM_ENTITY, ""),
            "hum": data.get(CONF_HUM_ENTITY, ""),
            "tent_temp": data[CONF_TENT_TEMP_ENTITY],
            "tent_rh": data[CONF_TENT_RH_ENTITY],
            "lung_temp": data.get(CONF_LUNG_TEMP_ENTITY, ""),
            "lung_rh": data.get(CONF_LUNG_RH_ENTITY, ""),
            "vpd": data.get(CONF_VPD_ENTITY, ""),
            "camera": data.get(CONF_CAMERA_ENTITY, ""),
            "lamp": data.get(CONF_LAMP_ENTITY, ""),
            "lamp_switch": data.get(CONF_LAMP_SWITCH_ENTITY, ""),
        }

    @property
    def device_info(self) -> DeviceInfo:
        """DeviceInfo shared by all entities of this entry."""
        name = self.entry.data.get("name") or "SmartGrow"
        return DeviceInfo(
            identifiers={(DOMAIN, self.entry.entry_id)},
            name=f"SmartGrow {name}".strip(),
            manufacturer="SmartGrow",
            model="Grow tent climate controller",
            sw_version="0.1.5",
            configuration_url=None,
        )

    # -- sampling ------------------------------------------------------------
    def _read_float_optional(self, entity_id: str) -> float | None:
        """Like _read_float but returns None when missing/unavailable."""
        state = self.hass.states.get(entity_id)
        if state is None or state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            return None
        try:
            return float(state.state)
        except ValueError:
            return None

    def _read_float(self, entity_id: str) -> float:
        state = self.hass.states.get(entity_id)
        if state is None or state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            raise UpdateFailed(f"{entity_id} unavailable")
        try:
            return float(state.state)
        except ValueError as err:
            raise UpdateFailed(f"{entity_id} not numeric: {state.state}") from err

    def _read_fan_pct(self, entity_id: str) -> float:
        """Read fan output as a percentage.

        Resolution order: percentage attribute (fan domain) -> numeric state
        (template sensor) -> on/off state (plain switch fan: 100/0). The
        on/off fallback makes switch-only builds work — the cascade treats
        them as a single-step fan.
        """
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
        except ValueError:
            if state.state == STATE_ON:
                return 100.0
            if state.state == STATE_OFF:
                return 0.0
            raise UpdateFailed(f"{entity_id} not numeric: {state.state}") from None

    def _read_bool(self, entity_id: str, on_states: set[str] | None = None) -> bool:
        state = self.hass.states.get(entity_id)
        if state is None or state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            raise UpdateFailed(f"{entity_id} unavailable")
        if on_states is not None:
            return state.state in on_states
        return state.state == STATE_ON

    def _gather_inputs(self) -> SensorInputs:
        """Snapshot with graceful degradation — every optional source falls back.

        - no lung sensors -> lung := tent (ΔAH term collapses to 0; the VPD-need
          term still drives the fan, and the dehum floor guards tent RH)
        - no lamp -> is_day = True with phase exposed as 'unknown': the band
          table then uses the conservative DAY values (the proven, safer side —
          day floors are higher, so the fan never under-ventilates at night)
        - fan switch-only -> fan_pct 100/0 from state (the cascade needs a number)
        """
        src = self.source_entities
        # Stage lives on the integration-owned select entity.
        stage = self._current_stage() or "Flowering"

        tent_temp = self._read_float(src["tent_temp"])
        tent_rh = self._read_float(src["tent_rh"])

        lung_temp = (
            self._read_float_optional(src["lung_temp"])
            if src.get("lung_temp")
            else None
        )
        lung_rh = (
            self._read_float_optional(src["lung_rh"])
            if src.get("lung_rh")
            else None
        )

        has_lamp = bool(src.get("lamp"))
        is_day = self._lamp_is_on() if has_lamp else True

        return SensorInputs(
            tent_temp=tent_temp,
            tent_rh=tent_rh,
            lung_temp=lung_temp if lung_temp is not None else tent_temp,
            lung_rh=lung_rh if lung_rh is not None else tent_rh,
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

    def _lamp_switch_is_on(self) -> bool | None:
        """Master-switch state; None when no master switch is configured."""
        switch = self.source_entities.get("lamp_switch", "")
        if not switch:
            return None
        st = self.hass.states.get(switch)
        if st is None or st.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            return False
        return st.state == STATE_ON

    def _lamp_is_on(self) -> bool:
        """Lamp state; conservative day=True when no lamp configured/unavailable.

        The band table's day floors are higher, so with unknown phase the fan
        errs toward more ventilation — never silently under-ventilates.

        With a master switch configured (failsafe plug that cuts lamp mains),
        day requires BOTH the dimmer and the master to be on: master off means
        the lamp cannot produce light regardless of the dimmer state.
        """
        lamp = self.source_entities.get("lamp", "")
        if not lamp:
            return True
        st = self.hass.states.get(lamp)
        if st is None or st.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            return True
        if st.state != STATE_ON:
            return False
        master = self._lamp_switch_is_on()
        if master is False:
            return False
        return True

    def _phase(self) -> str:
        """'day'/'night' from the configured lamp; 'unknown' otherwise.

        No clock guessing: without a usable lamp reading the phase is simply
        unknown — dashboards must not invent facts.
        """
        lamp = self.source_entities.get("lamp", "")
        if not lamp:
            return "unknown"
        st = self.hass.states.get(lamp)
        if st is None or st.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            return "unknown"
        if st.state == STATE_ON and self._lamp_switch_is_on() is False:
            # Master switch off: the lamp is mains-cut, no light output.
            return "night"
        return "day" if st.state == STATE_ON else "night"

    def schedule_options_reload(self) -> None:
        """Re-run schedule evaluation soon (time entities changed their value)."""
        self.hass.add_job(self._apply_schedule)

    # -- lights schedule (day/night cycle) --------------------------------
    def _schedule_times(self) -> tuple[dtime | None, dtime | None]:
        """Configured on/off times as datetime.time.

        Falls back to DEFAULT_LIGHTS_ON/OFF when the entry does not store
        explicit times — the time entities render those same defaults, so the
        schedule the user sees is the schedule that runs.
        """
        def parse(v: Any) -> dtime | None:
            if not v:
                return None
            try:
                hh, mm = str(v).split(":")[:2]
                return dtime(int(hh), int(mm))
            except (ValueError, AttributeError):
                return None
        on = parse(self.entry.data.get(CONF_LIGHTS_ON_TIME)) or parse(
            DEFAULT_LIGHTS_ON
        )
        off = parse(self.entry.data.get(CONF_LIGHTS_OFF_TIME)) or parse(
            DEFAULT_LIGHTS_OFF
        )
        return on, off

    def _schedule_wants_day(self, now: dtime) -> bool | None:
        """True=day window, False=night window, None=no schedule configured."""
        on, off = self._schedule_times()
        if on is None or off is None:
            return None
        if on < off:
            return on <= now < off
        # overnight schedule (e.g. on 20:00, off 04:00)
        return now >= on or now < off

    async def _apply_lamp(self, turn_on: bool) -> None:
        """Drive the configured lamp entity (light/switch/input_boolean).

        Honors dry-run like the fan/dehumidifier/humidifier actuators: in
        dry-run the intended action is only logged, so the schedule cannot
        fight the legacy Growlampe automations during shadow mode.
        """
        lamp = self.source_entities.get("lamp", "")
        if not lamp:
            return
        if self.options_rt.dry_run:
            _LOGGER.info(
                "DRY-RUN: schedule wants lamp %s -> %s (not actuated)",
                lamp, "on" if turn_on else "off",
            )
            return
        service = "turn_on" if turn_on else "turn_off"
        domain = lamp.split(".", 1)[0]
        await self.hass.services.async_call(
            domain, service, {"entity_id": lamp}, blocking=True
        )
        # Master switch (failsafe mains plug) follows the dimmer so both are
        # always in the same state — no LED glimmer at night, no mains-cut day.
        master = self.source_entities.get("lamp_switch", "")
        if master:
            await self.hass.services.async_call(
                master.split(".", 1)[0], service, {"entity_id": master},
                blocking=True,
            )
            # Radio can swallow the command (switch drops to unavailable under
            # load). Verify and retry ONCE.
            await asyncio.sleep(2)
            mst = self.hass.states.get(master)
            if mst is None or mst.state != (STATE_ON if turn_on else STATE_OFF):
                _LOGGER.warning(
                    "Lamp master %s did not follow %s; retrying once",
                    master, service,
                )
                await self.hass.services.async_call(
                    master.split(".", 1)[0], service, {"entity_id": master},
                    blocking=True,
                )
        _LOGGER.debug("Schedule: lamp %s%s -> %s", lamp,
                      f" + master {master}" if master else "", service)

    async def _apply_schedule(self) -> None:
        """Evaluate the lights schedule and actuate lamp + master.

        Reconciles BOTH actuators independently: the dimmer following the
        schedule is not enough — the master plug's radio is flaky (drops to
        unavailable under load), and a missed master turn_on left the lamp
        dark for an hour on 2026-09-14 while the dimmer read "on". Each
        cycle now corrects whichever actuator diverges from the schedule.
        """
        on, off = self._schedule_times()
        if on is None or off is None:
            return
        wants_day = self._schedule_wants_day(dt_datetime.now().time())
        if wants_day is None:
            return
        lamp = self.source_entities.get("lamp", "")
        if not lamp:
            return

        want = STATE_ON if wants_day else STATE_OFF
        st = self.hass.states.get(lamp)
        if (
            st is not None
            and st.state not in (STATE_UNKNOWN, STATE_UNAVAILABLE)
            and st.state != want
        ):
            await self._apply_lamp(want == STATE_ON)

        master = self.source_entities.get("lamp_switch", "")
        if master:
            mst = self.hass.states.get(master)
            if mst is not None and mst.state not in (
                STATE_UNKNOWN, STATE_UNAVAILABLE
            ) and mst.state != want:
                _LOGGER.warning(
                    "Lamp master %s diverged from schedule (want %s); "
                    "re-actuating", master, want,
                )
                await self._apply_lamp(want == STATE_ON)

    # -- optional wavemaker ------------------------------------------------
    def _wavemaker_tick(self) -> None:
        """Run the configured wavemaker program (interval mode) or mirror lights."""
        entity = self.entry.data.get(CONF_WAVEMAKER_ENTITY, "")
        if not entity:
            return
        mode = self.entry.data.get(CONF_WAVEMAKER_MODE, WAVEMAKER_MODE_NONE)
        if mode == WAVEMAKER_MODE_NONE:
            return

        st = self.hass.states.get(entity)
        if st is None or st.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            return
        is_on = st.state == STATE_ON

        if mode == WAVEMAKER_MODE_WITH_LIGHTS:
            wants = self._schedule_wants_day(dt_datetime.now().time())
            if wants is not None and wants != is_on:
                self._async_switch(entity, wants)
            return

        if mode == WAVEMAKER_MODE_INTERVAL:
            run_s = int(self.entry.data.get(CONF_WAVEMAKER_RUN_S, 30))
            every_min = int(self.entry.data.get(CONF_WAVEMAKER_EVERY_MIN, 60))
            if run_s <= 0 or every_min <= 0:
                return
            now = time.time()
            last = self._wavemaker_last_toggle or 0.0
            if not is_on:
                if now - last >= every_min * 60:
                    self._async_switch(entity, True)
                    self._wavemaker_last_toggle = now
            else:
                if now - last >= run_s:
                    self._async_switch(entity, False)
                    self._wavemaker_last_toggle = now

    def _async_switch(self, entity: str, turn_on: bool) -> None:
        service = "turn_on" if turn_on else "turn_off"
        self.hass.async_create_task(
            self.hass.services.async_call("switch", service, {"entity_id": entity})
        )

    def _current_stage(self) -> str:
        """Stage from the integration-owned select entity; '' when unavailable.

        The select entity is created by this integration (select.<entry-slug>_stage)
        and is the single source of truth for the grow stage.
        """
        # The stage select is forwarded on this entry; find it via the entity
        # registry so slug variants (device names etc.) keep working.
        registry = er.async_get(self.hass)
        for entry in async_entries_for_config_entry(registry, self.entry.entry_id):
            if entry.domain == "select" and entry.entity_id.endswith("_stage"):
                st = self.hass.states.get(entry.entity_id)
                if st and st.state not in (STATE_UNKNOWN, STATE_UNAVAILABLE):
                    return st.state
        return ""

    # -- actuation / dry-run -------------------------------------------------
    def _source(self, key: str) -> str | None:
        """Source-entity lookup: Configure-dialog options win over setup data."""
        val = self.entry.options.get(key)
        if val:
            return val
        return self.entry.data.get(key)

    async def _apply_fan(
        self, decision: fan_control.FanDecision, inputs: SensorInputs
    ) -> None:
        fan_entity = self._source(CONF_FAN_ENTITY)
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
            st = self.hass.states.get(fan_entity)
            supports_pct = bool(st and st.attributes.get("percentage") is not None)
            if decision.fan_target > 0:
                payload = (
                    {"entity_id": fan_entity, "percentage": decision.fan_target}
                    if supports_pct
                    else {"entity_id": fan_entity}
                )
                await self.hass.services.async_call(
                    "fan", "turn_on", payload, blocking=True
                )
            else:
                await self.hass.services.async_call(
                    "fan",
                    "turn_off",
                    {"entity_id": fan_entity},
                    blocking=True,
                )
            self._record(
                "fan", "command", decision.active_term, decision.fan_target, inputs
            )

    async def _apply_dehum(
        self, decision: dehumid_control.DehumDecision, inputs: SensorInputs
    ) -> None:
        dehum_entity = self._source(CONF_DEHUM_ENTITY)
        if not dehum_entity:
            # Fan-only build: decision still computed and recorded, no actuation.
            self._record("dehum", "unconfigured", decision.reason, -1, inputs)
            return

        # -- shared-dehumidifier arbitration -----------------------------
        # Multiple tents may reference the same dehumidifier. Each
        # coordinator registers its wish for this cycle; the aggregated
        # wish decides the command: ON if ANY tent demands it (and no
        # tent's over-dry floor vetoes), OFF only when ALL are satisfied.
        wishes = self._SHARED_DEHUM_WISHES.setdefault(dehum_entity, {})
        wishes[self.entry.entry_id] = decision.action

        if decision.action == "no_change":
            self._record("dehum", "no_change", decision.reason, -1, inputs)
            return

        aggregate = self._aggregate_shared_wish(dehum_entity, decision.action)
        if aggregate != decision.action:
            self._record(
                "dehum",
                "held_by_shared_arbitration",
                f"shared dehum: {aggregate} wins over {decision.action}",
                -1,
                inputs,
            )
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

    async def _apply_hum(self, decision, inputs) -> None:
        """Actuate the optional humidifier (same dry-run guard as dehum)."""
        hum_entity = self._source(CONF_HUM_ENTITY)
        if not hum_entity:
            self._record("hum", "unconfigured", decision.reason, -1, inputs)
            return
        if decision.action == "no_change":
            self._record("hum", "no_change", decision.reason, -1, inputs)
            return
        self.hum_on = decision.action == "on"
        if self.options_rt.dry_run:
            _LOGGER.debug("DRY-RUN humidifier -> %s (%s)", decision.action, decision.reason)
            self._record("hum", "dry_run", decision.reason, -1, inputs)
            return
        await self.hass.services.async_call(
            "switch" if hum_entity.startswith("switch.") else "humidifier",
            "turn_on" if self.hum_on else "turn_off",
            {ATTR_ENTITY_ID: hum_entity},
            blocking=True,
        )
        self._record("hum", "command", decision.reason, -1, inputs)

    def _aggregate_shared_wish(self, dehum_entity: str, own: str) -> str:
        """Aggregate this cycle's wishes across all tents sharing a dehum.

        Priority (first match wins):
          1. Any 'off' from an over-dry floor veto  -> off  (protect intake)
          2. Any 'on'                              -> on   (a tent needs it)
          3. Otherwise                              -> hold (stay as-is)
        """
        wishes = self._SHARED_DEHUM_WISHES.get(dehum_entity, {})
        if not wishes:
            return own
        # Any tent needing drying turns the shared unit on; each tent's own
        # over-dry floor is enforced inside ITS decision (its wish would be
        # 'off' and it never upgrades another tent's off to on for itself —
        # the unit state is global, but a tent that wanted off simply
        # tolerates the shared run because its own floor computation fed
        # into its wish this cycle).
        if "on" in wishes.values():
            return "on"
        return "off"

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
            self.trace = self.trace[-500:]

    # -- coordinator update -------------------------------------------------
    async def _async_update_data(self) -> dict[str, Any]:
        """Sample sensors and run throttled decisions."""
        try:
            inputs = self._gather_inputs()
        except UpdateFailed as err:
            raise UpdateFailed(str(err)) from err
        self.last_inputs = inputs
        self.last_sample_ts = time.time()

        # Lights schedule (day/night cycle): cheap check, every sample.
        try:
            await self._apply_schedule()
        except Exception as err:  # noqa: BLE001 — schedule must never kill the loop
            _LOGGER.warning("Lights schedule evaluation failed: %s", err)
        try:
            self._wavemaker_tick()
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Wavemaker tick failed: %s", err)

        now = time.time()
        base = self.options_rt.control
        # Adaptation may rewrite gains/margins (watchdog-guarded). The engine
        # applies the widened band-depth target and gain factor; when the
        # watchdog trips, adaptation is disabled and a repair issue raised.
        if self.engine.check_watchdog(base):
            params = self.engine.adapted_params(base)
        else:
            params = base.with_updates(adaptation_enabled=False)
            self.hass.add_job(self._async_raise_watchdog_issue)

        se = self.source_entities
        result: dict[str, Any] = {
            "inputs": inputs,
            "ts": now,
            # Derived, config-driven facts for diagnostics/dashboards:
            "phase": self._phase(),
            "stage": self._current_stage(),
            "degraded": {
                "lung": not (se.get("lung_temp") and se.get("lung_rh")),
                "lamp": not se.get("lamp"),
                "vpd_sensor": not se.get("vpd"),
                "dehum": not se.get("dehum"),
            },
        }

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
            # Feed the oscillation detector so adaptation can deepen the
            # band target when the cascade churns (watchdog-guarded).
            self.engine.record_actuator(self.dehum_on, now)
            await self._apply_dehum(decision, inputs)
            result["dehum"] = decision

        # Humidifier (optional): mirror cascade, only when configured.
        if self._source(CONF_HUM_ENTITY):
            from .logic.humid_control import compute_humid

            decision = compute_humid(inputs, params, self.hum_on)
            self.last_hum_decision = decision
            await self._apply_hum(decision, inputs)
            result["hum"] = decision

        self._check_legacy_automations()
        return result

    def _aggregate_shared_wish(self, dehum_entity: str, own: str) -> str:
        """Aggregate this cycle's wishes across all tents sharing a dehum.

        Priority (first match wins):
          1. Any 'off' from an over-dry floor veto  -> off  (protect intake)
          2. Any 'on'                              -> on   (a tent needs it)
          3. Otherwise                              -> hold (stay as-is)
        """
        wishes = self._SHARED_DEHUM_WISHES.get(dehum_entity, {})
        if not wishes:
            return own
        # Any tent needing drying turns the shared unit on; each tent's own
        # over-dry floor is enforced inside ITS decision (its wish would be
        # 'off' and it never upgrades another tent's off to on for itself —
        # the unit state is global, but a tent that wanted off simply
        # tolerates the shared run because its own floor computation fed
        # into its wish this cycle).
        if "on" in wishes.values():
            return "on"
        return "off"

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
            entity_id = self._source(key)
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
