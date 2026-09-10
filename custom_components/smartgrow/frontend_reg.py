"""Frontend registration: serve the bundled Lovelace card.

The card JS is built from the smartgrow-card source (Lit/TypeScript) and
bundled here so a single HACS install delivers both the integration and
its dashboard card. Registered on setup via:

- ``http.async_register_static_paths``: serve the file at
  ``/smartgrow/smartgrow-card.js``
- ``frontend.add_extra_js_url``: make every Lovelace dashboard load it
  automatically, so ``custom:smartgrow-card`` works without the user
  manually adding a resource.
"""

from __future__ import annotations

import logging

from homeassistant.components.frontend import add_extra_js_url, remove_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

_URL = "/smartgrow/smartgrow-card.js"

_LOGGER = logging.getLogger(__name__)

__all__ = ["async_register_frontend", "remove_extra_js_url"]


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Serve the bundled card and auto-load it in the frontend."""
    import pathlib

    card_path = pathlib.Path(__file__).parent / "frontend" / "smartgrow-card.js"
    if not card_path.exists():
        _LOGGER.warning("SmartGrow card bundle missing at %s", card_path)
        return

    await hass.http.async_register_static_paths(
        [StaticPathConfig(_URL, str(card_path), cache_headers=False)]
    )
    add_extra_js_url(hass, _URL)
    _LOGGER.debug("SmartGrow card registered at %s", _URL)
