
"""Regression: stale versioned lovelace resource URLs must be upgraded.

v0.7.7's guard only matched the plain ``/smartgrow/smartgrow-card.js`` URL, so a
stored ``/smartgrow/v0.7.8/...`` survived a version bump; once the integration
restarted with a newer version the old static path vanished (404) and Lovelace
rendered "Configuration error".
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock

from custom_components.smartgrow.frontend_reg import _async_register_lovelace_resource


class ResourceStorageCollection:
    def __init__(self, stored_url):
        self.async_items = lambda: [{"id": "res1", "url": stored_url, "type": "module"}]
        self.async_update_item = AsyncMock()
        self.async_create_item = AsyncMock()


def _collection(stored_url):
    return ResourceStorageCollection(stored_url)


async def test_stale_versioned_url_upgraded(hass):
    """A stored vOLD URL is rewritten to the current versioned URL."""
    collection = _collection("/smartgrow/v0.7.8/smartgrow-card.js")
    lovelace = {"resources": collection}
    hass.data["lovelace"] = SimpleNamespace(resources=collection)

    await _async_register_lovelace_resource(hass)

    collection.async_update_item.assert_awaited_once()
    args = collection.async_update_item.await_args
    assert args.args[1]["url"].startswith("/smartgrow/v")
    assert args.args[1]["url"].endswith("/smartgrow-card.js")
    collection.async_create_item.assert_not_awaited()


async def test_plain_url_upgraded(hass):
    """The legacy plain URL is still upgraded (v0.7.7 behavior kept)."""
    collection = _collection("/smartgrow/smartgrow-card.js")
    hass.data["lovelace"] = SimpleNamespace(resources=collection)

    await _async_register_lovelace_resource(hass)

    collection.async_update_item.assert_awaited_once()


async def test_current_url_left_alone(hass):
    """The current versioned URL is not touched (idempotent)."""
    from custom_components.smartgrow.frontend_reg import _URL

    collection = _collection(_URL)
    hass.data["lovelace"] = SimpleNamespace(resources=collection)

    await _async_register_lovelace_resource(hass)

    collection.async_update_item.assert_not_awaited()
    collection.async_create_item.assert_not_awaited()
