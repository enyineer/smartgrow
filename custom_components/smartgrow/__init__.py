"""Support for the SmartGrow integration."""

from __future__ import annotations

import logging
from typing import cast

from homeassistant.config_entries import ConfigEntry
from .const import CONF_DRY_RUN
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import DEFAULTS, DOMAIN
from .coordinator import RuntimeOptions, SmartGrowCoordinator
from .frontend_reg import CARD_URL, async_register_frontend, remove_extra_js_url

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [
    "sensor",
    "binary_sensor",
    "switch",
    "number",
    "select",
    "time",
]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the SmartGrow integration (YAML-free; config entries only)."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up SmartGrow from a config entry."""
    coordinator = SmartGrowCoordinator(hass, entry)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {
        "coordinator": coordinator,
        "options": RuntimeOptions.from_entry(entry),
    }
    if not hass.data.get(f"{DOMAIN}_frontend_registered"):
        try:
            await async_register_frontend(hass)
            hass.data[f"{DOMAIN}_frontend_registered"] = True
        except Exception as err:  # noqa: BLE001 — card is optional, never block setup
            _LOGGER.warning("SmartGrow card registration failed: %s", err)
            hass.data[f"{DOMAIN}_frontend_registered"] = False
    await coordinator.async_config_entry_first_refresh()
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    async def _async_clear_source(call) -> None:
        """Remove a source-entity key from entry data (device/service panel)."""
        key: str = call.data.get("key", "")
        allowed = {
            "vpd_entity", "lamp_entity", "camera_entity", "hum_entity",
            "dehum_entity", "lung_temp_entity", "lung_rh_entity",
        }
        if key not in allowed:
            _LOGGER.warning("clear_source: refusing unknown key %s", key)
            return
        if key in entry.data:
            new_data = {k: v for k, v in entry.data.items() if k != key}
            hass.config_entries.async_update_entry(entry, data=new_data)
            await hass.config_entries.async_reload(entry.entry_id)
            _LOGGER.info("cleared source %s from %s", key, entry.title)

    if not hass.services.has_service(DOMAIN, "clear_source"):
        # Register once per hass — the handler resolves the target entry from
        # hass.data at call time (per-entry closures break entry unload).
        hass.services.async_register(DOMAIN, "clear_source", _async_clear_source)
    return True


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload the entry when options change."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok and not hass.data[DOMAIN]:
        remove_extra_js_url(hass, CARD_URL)
        hass.data.pop(f"{DOMAIN}_frontend_registered", None)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id)
    return unload_ok


_ = DEFAULTS
_ = CONF_DRY_RUN
_ = cast
