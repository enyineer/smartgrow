"""Shared SmartGrow entity base."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .coordinator import SmartGrowCoordinator


class SmartGrowEntity(CoordinatorEntity[SmartGrowCoordinator]):
    """Base entity wiring device info and availability."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self.entry = entry

    @property
    def device_info(self) -> DeviceInfo:
        """Tie the entity to the SmartGrow device."""
        return self.coordinator.device_info

    @property
    def available(self) -> bool:
        """Unavailable when source sensors are stale > 15 min."""
        return not self.coordinator.is_stale()
