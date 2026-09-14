"""Number entities: floors, gains and thresholds as live-tunable controls."""

from __future__ import annotations

import logging

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    UNIQUE_ID_TEMPLATE,
)
from .coordinator import SmartGrowCoordinator, async_get_coordinator
from .entity import SmartGrowEntity

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up SmartGrow number entities."""
    coordinator = async_get_coordinator(hass, entry)
    async_add_entities(
        [
            FanFloorDayNumber(coordinator, entry),
            FanFloorNightNumber(coordinator, entry),
            DeltaGainNumber(coordinator, entry),
            VpdGainNumber(coordinator, entry),
            NeedGainNumber(coordinator, entry),
            TempGainNumber(coordinator, entry),
            ColdClampNumber(coordinator, entry),
            DehumBandDepthNumber(coordinator, entry),
            DehumSatTriggerNumber(coordinator, entry),
            DehumDryFloorNumber(coordinator, entry),
        ]
    )


def _uid(entry: ConfigEntry, name: str) -> str:
    return UNIQUE_ID_TEMPLATE.format(entry_id=entry.entry_id, name=name)


class SmartGrowNumber(SmartGrowEntity, NumberEntity):
    """Base number bound to a ControlParams field."""

    _attr_mode = NumberMode.BOX

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)

    def _param(self) -> float:
        raise NotImplementedError

    def _set_param(self, value: float) -> None:
        raise NotImplementedError

    @property
    def native_value(self) -> float:
        return self._param()

    async def async_set_native_value(self, value: float) -> None:
        self._set_param(value)
        self.async_write_ha_state()


class FanFloorDayNumber(SmartGrowNumber):
    _attr_name = "SmartGrow fan floor day"
    _attr_icon = "mdi:fan-chevron-up"
    _attr_native_min_value = 0
    _attr_native_max_value = 100
    _attr_native_step = 1

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "fan_floor_day")

    def _param(self) -> float:
        return self.coordinator.options_rt.control.fan_floor_day

    def _set_param(self, value: float) -> None:
        self.coordinator.options_rt.control = (
            self.coordinator.options_rt.control.with_updates(fan_floor_day=value)
        )


class FanFloorNightNumber(FanFloorDayNumber):
    _attr_name = "SmartGrow fan floor night"
    _attr_icon = "mdi:fan-chevron-down"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "fan_floor_night")

    def _param(self) -> float:
        return self.coordinator.options_rt.control.fan_floor_night

    def _set_param(self, value: float) -> None:
        self.coordinator.options_rt.control = (
            self.coordinator.options_rt.control.with_updates(fan_floor_night=value)
        )


class DeltaGainNumber(FanFloorDayNumber):
    _attr_name = "SmartGrow ΔAH gain"
    _attr_icon = "mdi:tune"
    _attr_native_min_value = 0
    _attr_native_max_value = 100
    _attr_native_step = 1

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "delta_gain")

    def _param(self) -> float:
        return self.coordinator.options_rt.control.delta_gain

    def _set_param(self, value: float) -> None:
        self.coordinator.options_rt.control = (
            self.coordinator.options_rt.control.with_updates(delta_gain=value)
        )


class VpdGainNumber(DeltaGainNumber):
    _attr_name = "SmartGrow VPD gain"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "vpd_gain")

    def _param(self) -> float:
        return self.coordinator.options_rt.control.vpd_gain

    def _set_param(self, value: float) -> None:
        self.coordinator.options_rt.control = (
            self.coordinator.options_rt.control.with_updates(vpd_gain=value)
        )


class NeedGainNumber(DeltaGainNumber):
    _attr_name = "SmartGrow need gain"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "need_gain")

    def _param(self) -> float:
        return self.coordinator.options_rt.control.need_gain

    def _set_param(self, value: float) -> None:
        self.coordinator.options_rt.control = (
            self.coordinator.options_rt.control.with_updates(need_gain=value)
        )


class TempGainNumber(DeltaGainNumber):
    _attr_name = "SmartGrow temp gain"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "temp_gain")

    def _param(self) -> float:
        return self.coordinator.options_rt.control.temp_gain

    def _set_param(self, value: float) -> None:
        self.coordinator.options_rt.control = (
            self.coordinator.options_rt.control.with_updates(temp_gain=value)
        )


class ColdClampNumber(DeltaGainNumber):
    _attr_name = "SmartGrow cold clamp"
    _attr_icon = "mdi:snowflake"
    _attr_native_min_value = 0
    _attr_native_max_value = 1
    _attr_native_step = 0.05

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "cold_clamp")

    def _param(self) -> float:
        return self.coordinator.options_rt.control.cold_clamp

    def _set_param(self, value: float) -> None:
        self.coordinator.options_rt.control = (
            self.coordinator.options_rt.control.with_updates(cold_clamp=value)
        )


class DehumBandDepthNumber(DeltaGainNumber):
    _attr_name = "SmartGrow dehumidifier band depth"
    _attr_icon = "mdi:arrow-collapse-down"
    _attr_native_min_value = 0.05
    _attr_native_max_value = 0.5
    _attr_native_step = 0.05

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "dehum_band_depth")

    def _param(self) -> float:
        return self.coordinator.options_rt.control.dehum_band_depth

    def _set_param(self, value: float) -> None:
        self.coordinator.options_rt.control = (
            self.coordinator.options_rt.control.with_updates(dehum_band_depth=value)
        )


class DehumSatTriggerNumber(DeltaGainNumber):
    _attr_name = "SmartGrow dehumidifier saturation trigger"
    _attr_icon = "mdi:air-humidifier"
    _attr_native_min_value = 0
    _attr_native_max_value = 100
    _attr_native_step = 1

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "dehum_sat_trigger")

    def _param(self) -> float:
        return self.coordinator.options_rt.control.dehum_sat_trigger

    def _set_param(self, value: float) -> None:
        self.coordinator.options_rt.control = (
            self.coordinator.options_rt.control.with_updates(dehum_sat_trigger=value)
        )


class DehumDryFloorNumber(DehumSatTriggerNumber):
    _attr_name = "SmartGrow dehumidifier dry floor"

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "dehum_dry_floor")

    def _param(self) -> float:
        return self.coordinator.options_rt.control.dehum_dry_floor

    def _set_param(self, value: float) -> None:
        self.coordinator.options_rt.control = (
            self.coordinator.options_rt.control.with_updates(dehum_dry_floor=value)
        )
