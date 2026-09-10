"""Diagnostic sensors for SmartGrow."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import UNIQUE_ID_TEMPLATE
from .coordinator import SmartGrowCoordinator, async_get_coordinator
from .entity import SmartGrowEntity

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up SmartGrow diagnostic sensors."""
    coordinator = async_get_coordinator(hass, entry)
    entities: list[SensorEntity] = [
        FanTargetSensor(coordinator, entry),
        FanDeltaTermSensor(coordinator, entry),
        FanVpdTermSensor(coordinator, entry),
        FanNeedTermSensor(coordinator, entry),
        FanTempTermSensor(coordinator, entry),
        ActiveTermSensor(coordinator, entry),
        DAhSensor(coordinator, entry),
        AhTentSensor(coordinator, entry),
        AhLungSensor(coordinator, entry),
        DehumDecisionSensor(coordinator, entry),
        DryRunSensor(coordinator, entry),
        Cycles24hSensor(coordinator, entry),
        StaleSensor(coordinator, entry),
    ]
    async_add_entities(entities)


def _uid(entry: ConfigEntry, name: str) -> str:
    return UNIQUE_ID_TEMPLATE.format(entry_id=entry.entry_id, name=name)


class _TermSensor(SmartGrowEntity, SensorEntity):
    """Base for numeric fan-term diagnostic sensors."""

    _attr_icon = "mdi:fan"
    _attr_native_unit_of_measurement = "%"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self.coordinator = coordinator
        self.entry = entry

    @property
    def available(self) -> bool:
        return not self.coordinator.is_stale()

    def _decision(self):
        return self.coordinator.last_fan_decision


class FanTargetSensor(_TermSensor):
    """The last computed fan target (what WOULD be / is commanded)."""

    _attr_name = "SmartGrow fan target"

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "fan_target")

    @property
    def native_value(self) -> int | None:
        d = self._decision()
        return d.fan_target if d else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        d = self._decision()
        if not d:
            return {}
        return {
            "dry_run": self.coordinator.options_rt.dry_run,
            "cold": d.cold,
            "cold_multiplier": d.cold_mult,
            "min_fan": d.min_fan,
        }


class FanDeltaTermSensor(_TermSensor):
    _attr_name = "SmartGrow fan ΔAH term"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "fan_delta_term")

    @property
    def native_value(self) -> float | None:
        d = self._decision()
        return round(d.fan_delta_term, 1) if d else None


class FanVpdTermSensor(_TermSensor):
    _attr_name = "SmartGrow fan VPD term"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "fan_vpd_term")

    @property
    def native_value(self) -> float | None:
        d = self._decision()
        return round(d.fan_vpd_term, 1) if d else None


class FanNeedTermSensor(_TermSensor):
    _attr_name = "SmartGrow fan need term"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "fan_need_term")

    @property
    def native_value(self) -> float | None:
        d = self._decision()
        return round(d.fan_need_term, 1) if d else None


class FanTempTermSensor(_TermSensor):
    _attr_name = "SmartGrow fan temp term"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "fan_temp_term")

    @property
    def native_value(self) -> float | None:
        d = self._decision()
        return round(d.fan_temp_term, 1) if d else None


class ActiveTermSensor(_TermSensor):
    """Which term won the max() — the 'why is the fan at X%' answer."""

    _attr_name = "SmartGrow active fan term"
    _attr_icon = "mdi:debug-step-over"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "active_term")

    @property
    def native_value(self) -> str | None:
        d = self._decision()
        return d.active_term if d else None


class DAhSensor(_TermSensor):
    """ΔAH between tent and lung room, g/m³ — the moisture-transport signal."""

    _attr_name = "SmartGrow ΔAH"
    _attr_native_unit_of_measurement = "g/m³"
    _attr_icon = "mdi:water"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "d_ah")

    @property
    def native_value(self) -> float | None:
        d = self._decision()
        return round(d.d_ah, 2) if d else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        d = self._decision()
        if not d:
            return {}
        return {"ah_tent": round(d.ah_tent, 2), "ah_lung": round(d.ah_lung, 2)}


class AhTentSensor(DAhSensor):
    _attr_name = "SmartGrow AH tent"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "ah_tent")

    @property
    def native_value(self) -> float | None:
        d = self._decision()
        return round(d.ah_tent, 2) if d else None


class AhLungSensor(DAhSensor):
    _attr_name = "SmartGrow AH lung room"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "ah_lung")

    @property
    def native_value(self) -> float | None:
        d = self._decision()
        return round(d.ah_lung, 2) if d else None


class DehumDecisionSensor(SmartGrowEntity, SensorEntity):
    """Last dehumidifier cascade decision."""

    _attr_name = "SmartGrow dehumidifier decision"
    _attr_icon = "mdi:air-humidifier"

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self.coordinator = coordinator
        self.entry = entry
        self._attr_unique_id = _uid(entry, "dehum_decision")

    @property
    def available(self) -> bool:
        return not self.coordinator.is_stale()

    @property
    def native_value(self) -> str | None:
        d = self.coordinator.last_dehum_decision
        return d.action if d else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        d = self.coordinator.last_dehum_decision
        if not d:
            return {}
        return {
            "reason": d.reason,
            "band_low": d.band_low,
            "vpd_margin": d.vpd_margin,
            "fan_pct": d.fan_pct,
            "lung_rh": d.lung_rh,
            "was_on": d.was_on,
        }


class DryRunSensor(SmartGrowEntity, SensorEntity):
    """Whether SmartGrow is in dry-run (records instead of commanding)."""

    _attr_name = "SmartGrow dry run"
    _attr_icon = "mdi:restart"

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self.coordinator = coordinator
        self.entry = entry
        self._attr_unique_id = _uid(entry, "dry_run")

    @property
    def native_value(self) -> str:
        return "on" if self.coordinator.options_rt.dry_run else "off"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "cutover_hint": (
                "Disable your legacy vent/dehum automations, then switch dry_run off "
                "in the integration options."
            )
        }


class Cycles24hSensor(SmartGrowEntity, SensorEntity):
    """Dehumidifier cycles in the last 24 h (oscillation visibility)."""

    _attr_name = "SmartGrow dehumidifier cycles 24h"
    _attr_icon = "mdi:counter"
    _attr_native_unit_of_measurement = "cycles"
    _attr_state_class = SensorStateClass.TOTAL

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self.coordinator = coordinator
        self.entry = entry
        self._attr_unique_id = _uid(entry, "cycles_24h")

    @property
    def available(self) -> bool:
        return not self.coordinator.is_stale()

    @property
    def native_value(self) -> int:
        return len(self.coordinator.cycles_24h)


class StaleSensor(SmartGrowEntity, SensorEntity):
    """Seconds since the last good sensor sample."""

    _attr_name = "SmartGrow sensor staleness"
    _attr_device_class = SensorDeviceClass.DURATION
    _attr_native_unit_of_measurement = "s"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_entity_category = "diagnostic"

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self.coordinator = coordinator
        self.entry = entry
        self._attr_unique_id = _uid(entry, "stale")

    @property
    def native_value(self) -> int | None:
        age = self.coordinator.stale_seconds()
        return int(age) if age is not None else None
