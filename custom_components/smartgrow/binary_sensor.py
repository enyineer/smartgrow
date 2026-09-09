"""Binary sensors: dry-run warning (legacy automation detected) + oscillation."""

from __future__ import annotations

import logging
import time
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event

from .const import (
    CONF_LEGACY_DEHUM_AUTOMATION,
    CONF_LEGACY_VENT_AUTOMATION,
    UNIQUE_ID_TEMPLATE,
)
from .coordinator import SmartGrowCoordinator, async_get_coordinator
from .entity import SmartGrowEntity

_LOGGER = logging.getLogger(__name__)

OSCILLATION_FLIP_LIMIT = 6  # per 24 h — the v7 hysteresis guarantee


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up SmartGrow binary sensors."""
    coordinator = async_get_coordinator(hass, entry)
    entities: list[BinarySensorEntity] = [
        DryRunWarningSensor(coordinator, entry, hass),
        OscillationWarningSensor(coordinator, entry),
    ]
    async_add_entities(entities)


def _uid(entry: ConfigEntry, name: str) -> str:
    return UNIQUE_ID_TEMPLATE.format(entry_id=entry.entry_id, name=name)


class DryRunWarningSensor(SmartGrowEntity, BinarySensorEntity):
    """Fires when legacy automations actuate while SmartGrow is dry-running."""

    _attr_name = "SmartGrow legacy automation warning"
    _attr_icon = "mdi:alert"

    def __init__(
        self, coordinator: SmartGrowCoordinator, entry: ConfigEntry, hass: HomeAssistant
    ) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "dry_run_warning")
        self._legacy_triggered: dict[str, float] = {}
        self._unsubs = []
        watch = [
            entity_id
            for entity_id in (
                entry.data.get(CONF_LEGACY_VENT_AUTOMATION),
                entry.data.get(CONF_LEGACY_DEHUM_AUTOMATION),
            )
            if entity_id
        ]
        if watch:
            self._unsubs.append(
                async_track_state_change_event(hass, watch, self._handle_legacy_state)
            )

    async def async_will_remove_from_hass(self) -> None:
        for unsub in self._unsubs:
            unsub()

    @callback
    def _handle_legacy_state(self, event: Event) -> None:
        new_state = event.data.get("new_state")
        if new_state is None:
            return
        last_triggered = new_state.attributes.get("last_triggered")
        if last_triggered is not None:
            self._legacy_triggered[new_state.entity_id] = last_triggered.timestamp()
            self.async_write_ha_state()

    @property
    def is_on(self) -> bool:
        """True when a watched legacy automation triggered in the last hour."""
        if not self.coordinator.options_rt.dry_run:
            return False
        now = time.time()
        return any(now - ts < 3600 for ts in self._legacy_triggered.values())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "legacy_entities": dict(self._legacy_triggered),
            "hint": (
                (
                    "Legacy automations are still actuating. Disable them, then turn "
                    "dry_run off."
                )
                if self.is_on
                else None
            ),
        }


class OscillationWarningSensor(SmartGrowEntity, BinarySensorEntity):
    """On when dehumidifier flips/24h exceeds the hysteresis guarantee."""

    _attr_name = "SmartGrow oscillation warning"
    _attr_icon = "mdi:waveform"

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "oscillation_warning")

    @property
    def is_on(self) -> bool:
        return len(self.coordinator.cycles_24h) > OSCILLATION_FLIP_LIMIT

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "cycles_24h": len(self.coordinator.cycles_24h),
            "limit": OSCILLATION_FLIP_LIMIT,
            "note": (
                "The 2026-09-03 production incident produced 26 flips/day; the "
                "level-triggered cascade with anti-churn margin is the fix."
            ),
        }
