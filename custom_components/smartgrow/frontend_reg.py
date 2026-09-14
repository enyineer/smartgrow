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

import json
import pathlib

_BASE_URL = "/smartgrow/smartgrow-card.js"
# Versioned PATH (not just query): companion-app webviews have been observed
# serving heuristically cached bytes for the same path regardless of query.
# A fresh path per release guarantees a fresh fetch.
_VERSION = json.loads(
    (pathlib.Path(__file__).parent / "manifest.json").read_text()
)["version"]
_VERSIONED_PATH = f"/smartgrow/v{_VERSION}/smartgrow-card.js"
_URL = _VERSIONED_PATH

_LOGGER = logging.getLogger(__name__)

__all__ = ["async_register_frontend", "remove_extra_js_url"]


async def _async_register_lovelace_resource(hass: HomeAssistant) -> None:
    """Register the card as a Lovelace storage resource (idempotent).

    Lovelace resources are AWAITED before dashboards and the card picker
    render; ``add_extra_js_url`` alone is fire-and-forget, so on cold caches
    (companion app restarts, first visits) the card module can lose the race
    and the picker tile spins forever. Storage-mode resource registration is
    what HACS does for every card — deterministic loading.
    """
    lovelace_data = hass.data.get("lovelace")
    if not lovelace_data:
        _LOGGER.debug("Lovelace not loaded yet; skipping resource registration")
        return
    collection = lovelace_data.resources
    # YAML-mode collections have no create API.
    if type(collection).__name__ != "ResourceStorageCollection":
        _LOGGER.info(
            "Lovelace resources in YAML mode; add %s as a module resource manually", _URL
        )
        return
    items = collection.async_items()
    for item in items:
        if item.get("url") == _URL:
            _LOGGER.debug("SmartGrow lovelace resource already registered")
            return
        # Upgrade ANY stale SmartGrow URL (plain or old-versioned) to the current
        # versioned one. v0.7.7's guard only matched the plain path, so a stored
        # /smartgrow/vOLD/... URL survived restarts and 404'd once the old static
        # path disappeared with the old version -> Lovelace "Configuration error".
        if item.get("url", "").startswith("/smartgrow/") and item.get("url") != _URL:
            await collection.async_update_item(item["id"], {"url": _URL})
            _LOGGER.debug("Updated SmartGrow lovelace resource to %s", _URL)
            return
    await collection.async_create_item({"url": _URL, "type": "module"})
    _LOGGER.debug("SmartGrow lovelace resource registered: %s", _URL)


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Serve the bundled card and register it with the Lovelace frontend."""
    import pathlib

    card_path = pathlib.Path(__file__).parent / "frontend" / "smartgrow-card.js"
    if not card_path.exists():
        _LOGGER.warning("SmartGrow card bundle missing at %s", card_path)
        return

    async def _serve_card_no_cache(request):
        """Serve the card with explicit no-cache (webview heuristic-buster).

        StaticPathConfig(cache_headers=False) sends NO Cache-Control header at
        all, which lets companion-app webviews heuristic-cache the JS for the
        plain URL — stale bytes then render "Configuration error" for days.
        An explicit no-cache forces etag revalidation on every load.
        """
        from aiohttp import web as aioweb

        response = aioweb.FileResponse(card_path)
        response.headers["Cache-Control"] = "no-cache, must-revalidate, max-age=0"
        return response

    # versioned path: static is fine (fresh URL per release)
    await hass.http.async_register_static_paths(
        [StaticPathConfig(_VERSIONED_PATH, str(card_path), cache_headers=False)]
    )
    # plain path: custom handler with explicit no-cache headers
    hass.http.app.router.add_route("GET", _BASE_URL, _serve_card_no_cache)
    # Wildcard route: ANY old versioned path serves the CURRENT bundle, so an app
    # cached on /smartgrow/v0.7.8/... gets working bytes instead of a 404 ->
    # "Configuration error". Regex registered directly on the aiohttp router.
    import re

    async def _serve_current_card(request):
        from aiohttp import web as aioweb

        return aioweb.FileResponse(card_path)

    _versioned_re = re.compile(r"^/smartgrow/v[^/]+/smartgrow-card\.js$")
    for route in list(hass.http.app.router.routes()):
        if getattr(route, "resource", None) and _versioned_re.match(
            getattr(route.resource, "canonical", "") or ""
        ):
            break
    else:
        hass.http.app.router.add_route(
            "GET", "/smartgrow/{v:.*}/smartgrow-card.js", _serve_current_card
        )
    # Belt: extra_js (works once loaded, also outside dashboards)
    add_extra_js_url(hass, _URL)
    # Suspenders: awaited Lovelace resource (deterministic in picker/dashboard)
    await _async_register_lovelace_resource(hass)
    _LOGGER.debug("SmartGrow card registered at %s", _URL)


CARD_URL = _URL
"""Versioned URL of the bundled card (stable within a release)."""
