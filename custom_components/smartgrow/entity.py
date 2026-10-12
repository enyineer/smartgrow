"""Shared SmartGrow entity base."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .coordinator import SmartGrowCoordinator


class SmartGrowEntity(CoordinatorEntity[SmartGrowCoordinator]):
    """Base entity wiring device info and availability.

    The coordinator is re-acquired in async_added_to_hass: on entry reload a
    NEW coordinator instance replaces the old one in hass.data, but HA keeps
    the existing entity objects (same unique_ids). Entities that kept the
    constructor's coordinator stay bound to the dead instance - their data
    freezes (phase stuck 'unknown') while the new coordinator cycles unseen.
    """

    _attr_has_entity_name = True

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self.entry = entry

    async def async_added_to_hass(self) -> None:
        """Rebind to the CURRENT coordinator before registering the listener."""
        runtime = self.hass.data["smartgrow"].get(self.entry.entry_id)
        if runtime is not None and runtime["coordinator"] is not self.coordinator:
            self.coordinator = runtime["coordinator"]
        await super().async_added_to_hass()

    @property
    def device_info(self) -> DeviceInfo:
        """Tie the entity to the SmartGrow device."""
        return self.coordinator.device_info

    @property
    def available(self) -> bool:
        """Unavailable when source sensors are stale > 15 min."""
        return not self.coordinator.is_stale()
