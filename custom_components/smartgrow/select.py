"""Select entity: grow stage."""

from __future__ import annotations

import logging

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .const import STAGES, UNIQUE_ID_TEMPLATE
from .coordinator import SmartGrowCoordinator, async_get_coordinator
from .entity import SmartGrowEntity

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the SmartGrow stage select."""
    coordinator = async_get_coordinator(hass, entry)
    async_add_entities([StageSelect(coordinator, entry)])


class StageSelect(SmartGrowEntity, SelectEntity, RestoreEntity):
    """Grow stage: drives the VPD band / temperature table lookup."""

    _attr_name = "SmartGrow stage"
    _attr_icon = "mdi:sprout"
    _attr_options = list(STAGES)

    def __init__(self, coordinator: SmartGrowCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = UNIQUE_ID_TEMPLATE.format(
            entry_id=entry.entry_id, name="stage"
        )
        self._attr_current_option = "Flowering"

    async def async_added_to_hass(self) -> None:
        """Restore last stage, or follow the configured source entity."""
        last = await self.async_get_last_state()
        if last is not None and last.state in STAGES:
            self._attr_current_option = last.state

    @property
    def current_option(self) -> str | None:
        """Prefer a configured input_select source when present."""
        src = self.coordinator.source_entities.get("stage")
        if src:
            state = self.hass.states.get(src)
            if state is not None and state.state in STAGES:
                return state.state
        return self._attr_current_option

    async def async_select_option(self, option: str) -> None:
        """Set the stage locally (and mirror to a source select if bound)."""
        if option not in STAGES:
            raise ValueError(f"Unknown stage: {option}")
        self._attr_current_option = option
        src = self.coordinator.source_entities.get("stage")
        if src and src.startswith("select."):
            await self.hass.services.async_call(
                "select",
                "select_option",
                {"entity_id": src, "option": option},
                blocking=False,
            )
        self.async_write_ha_state()
