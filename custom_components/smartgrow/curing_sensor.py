"""Diagnostic sensors for a SmartGrow Curing device.

Per jar: a status sensor (ok / too_warm / ... with temp+rh+reasons attrs).
Plus one summary sensor across all jars.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.sensor import (
    EntityCategory,
    SensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .curing_coordinator import CuringCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the curing jar sensors."""
    coordinator: CuringCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    entities: list[SensorEntity] = [CuringSummarySensor(coordinator, entry)]
    entities.extend(
        JarStatusSensor(coordinator, entry, temp_entity) for temp_entity in entry.data.get("jar_temp_entities", [])
    )
    async_add_entities(entities)


def _uid(entry: ConfigEntry, name: str) -> str:
    return f"smartgrow_{entry.entry_id}_{name}"


class _CuringEntity(SensorEntity):
    """Base: curing coordinator entity wiring."""

    _attr_has_entity_name = True
    coordinator: CuringCoordinator
    entry: ConfigEntry

    def __init__(self, coordinator: CuringCoordinator, entry: ConfigEntry) -> None:
        self.coordinator = coordinator
        self.entry = entry

    @property
    def device_info(self):
        return self.coordinator.device_info

    @property
    def available(self) -> bool:
        return self.coordinator.last_update_success


class CuringSummarySensor(_CuringEntity):
    """One-line health of the whole curing set."""

    _attr_name = "Curing status"
    _attr_icon = "mdi:jar-canned-medicine"

    def __init__(self, coordinator: CuringCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "curing_summary")

    @property
    def native_value(self) -> str | None:
        data = self.coordinator.data or {}
        return data.get("worst")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        data = self.coordinator.data or {}
        jars = data.get("jars", [])
        bad = [j for j in jars if j["status"] not in ("ok", "temp_only", "rh_only")]
        return {
            "ok_count": data.get("ok_count", 0),
            "total": data.get("total", 0),
            "temp_band": list(data.get("temp_band", ())),
            "rh_band": list(data.get("rh_band", ())),
            "needs_attention": [j["name"] for j in bad],
        }


class JarStatusSensor(_CuringEntity):
    """Per-jar status: ok / too_warm / too_humid / unavailable / ..."""

    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_icon = "mdi:jar-canned-medicine"

    def __init__(
        self,
        coordinator: CuringCoordinator,
        entry: ConfigEntry,
        temp_entity: str,
    ) -> None:
        super().__init__(coordinator, entry)
        self._temp_entity = temp_entity
        self._attr_name = f"Curing {coordinator._jar_label(temp_entity)}"
        self._attr_unique_id = _uid(entry, f"jar_{temp_entity}")

    def _jar(self) -> dict[str, Any] | None:
        data = self.coordinator.data or {}
        for j in data.get("jars", []):
            if j["temp_entity"] == self._temp_entity:
                return j
        return None

    @property
    def native_value(self) -> str | None:
        jar = self._jar()
        return jar["status"] if jar else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        jar = self._jar()
        if not jar:
            return {}
        return {
            "temperature": jar["temp"],
            "humidity": jar["rh"],
            "rh_entity": jar["rh_entity"],
            "reasons": jar["reasons"],
        }
