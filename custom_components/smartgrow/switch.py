"""Switches: dry-run master and adaptation toggle."""

from __future__ import annotations

import logging

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .const import UNIQUE_ID_TEMPLATE
from .coordinator import SmartGrowCoordinator, async_get_coordinator
from .entity import SmartGrowEntity

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up SmartGrow switches."""
    coordinator = async_get_coordinator(hass, entry)
    async_add_entities(
        [DryRunSwitch(coordinator, entry), AdaptationSwitch(coordinator, entry)]
    )


def _uid(entry: ConfigEntry, name: str) -> str:
    return UNIQUE_ID_TEMPLATE.format(entry_id=entry.entry_id, name=name)


class DryRunSwitch(SmartGrowEntity, SwitchEntity, RestoreEntity):
    """Master dry-run: on = observe/log only, off = command real devices."""

    _attr_name = "SmartGrow dry run"
    _attr_icon = "mdi:restart-alert"

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "dry_run_switch")
        self._attr_is_on = coordinator.options_rt.dry_run

    async def async_added_to_hass(self) -> None:
        last = await self.async_get_last_state()
        if last is not None and last.state in ("on", "off"):
            self._attr_is_on = last.state == "on"

    @property
    def is_on(self) -> bool:
        return self.coordinator.options_rt.dry_run

    @property
    def extra_state_attributes(self):
        return {
            "safety": (
                "Cutover = disable legacy automations first, then flip this off."
                if self.is_on
                else None
            )
        }

    async def async_turn_on(self, **kwargs) -> None:
        """Enable dry-run (safe observation mode)."""
        await self._persist_and_apply(True)

    async def async_turn_off(self, **kwargs) -> None:
        """Disable dry-run — SmartGrow takes real control."""
        await self._persist_and_apply(False)

    async def _persist_and_apply(self, value: bool) -> None:
        """Persist dry-run in entry.options so reloads keep it.

        Mutating options_rt in memory only silently reverted on every entry
        reload (config flow submits, reconfigure) because RuntimeOptions is
        rebuilt from entry options where dry_run defaulted to True.
        """
        new_options = {**self.entry.options, "dry_run": value}
        self.hass.config_entries.async_update_entry(
            self.entry, options=new_options
        )
        self.coordinator.options_rt.dry_run = value
        self._attr_is_on = value
        self.async_write_ha_state()


class AdaptationSwitch(SmartGrowEntity, SwitchEntity, RestoreEntity):
    """Toggles P1 adaptation (ships ON with the convergence watchdog)."""

    _attr_name = "SmartGrow adaptation"
    _attr_icon = "mdi:tune-vertical"

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = _uid(entry, "adaptation_switch")
        self._attr_is_on = coordinator.options_rt.adaptation_enabled

    async def async_added_to_hass(self) -> None:
        last = await self.async_get_last_state()
        if last is not None and last.state in ("on", "off"):
            self._attr_is_on = last.state == "on"

    @property
    def is_on(self) -> bool:
        return self.coordinator.engine.enabled

    async def async_turn_on(self, **kwargs) -> None:
        """Enable adaptation (watchdog-guarded)."""
        engine = self.coordinator.engine
        engine.enabled = True
        engine.disabled_reason = None
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs) -> None:
        """Disable adaptation — fixed safe defaults only."""
        self.coordinator.engine.enabled = False
        self.coordinator.engine.disabled_reason = "disabled by user"
        self._attr_is_on = False
        self.async_write_ha_state()
