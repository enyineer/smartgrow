"""Time entities: lights-on / lights-off schedule (day/night cycle)."""

from __future__ import annotations

import logging
from datetime import time

from homeassistant.components.time import TimeEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .const import (
    DEFAULT_LIGHTS_OFF,
    DEFAULT_LIGHTS_ON,
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
    """Set up the schedule time entities."""
    coordinator = async_get_coordinator(hass, entry)
    async_add_entities([
        LightsOnTime(coordinator, entry),
        LightsOffTime(coordinator, entry),
    ])


def _parse(value: str | None, default: str) -> time:
    """Parse 'HH:MM' into datetime.time, tolerant of garbage."""
    try:
        hh, mm = (value or default).split(":")[:2]
        return time(int(hh), int(mm))
    except (ValueError, AttributeError):
        return time.fromisoformat(default)


class _ScheduleTimeBase(SmartGrowEntity, TimeEntity, RestoreEntity):
    """Base: restore last value, publish to coordinator options."""

    _attr_should_poll = False

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry, key: str, default: str) -> None:
        super().__init__(coordinator, entry)
        self._key = key
        self._attr_unique_id = UNIQUE_ID_TEMPLATE.format(entry_id=entry.entry_id, name=key)
        self._attr_native_value = _parse(entry.data.get(key), default)

    async def async_added_to_hass(self) -> None:
        last = await self.async_get_last_state()
        if last is not None and last.state not in (None, "unknown", "unavailable"):
            try:
                hh, mm = last.state.split(":")[:2]
                self._attr_native_value = time(int(hh), int(mm))
            except (ValueError, AttributeError):
                pass

    async def async_set_value(self, value: time) -> None:
        self._attr_native_value = value
        self.async_write_ha_state()
        # Persist into the entry so restarts and the coordinator see it
        new_data = {**self.entry.data, self._key: value.strftime("%H:%M")}
        self.hass.config_entries.async_update_entry(self.entry, data=new_data)
        self.coordinator.schedule_options_reload()


class LightsOnTime(_ScheduleTimeBase):
    """Time the grow lamp switches on (day start)."""

    _attr_name = "SmartGrow lights on"
    _attr_icon = "mdi:weather-sunset-up"

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry, "lights_on_time", DEFAULT_LIGHTS_ON)


class LightsOffTime(_ScheduleTimeBase):
    """Time the grow lamp switches off (day end)."""

    _attr_name = "SmartGrow lights off"
    _attr_icon = "mdi:weather-sunset-down"

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry, "lights_off_time", DEFAULT_LIGHTS_OFF)
