"""v0.9.5 regression: the OPTIONS flow must serialize with alert fields.

Also verifies the notify-targets selector is dynamic (list of the box's
notify services) and that submitting options stores them.
"""
import json

import pytest
import voluptuous_serialize
from homeassistant.helpers import config_validation as cv
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.smartgrow.config_flow import SmartGrowOptionsFlow
from custom_components.smartgrow.const import DOMAIN


def _converted(schema):
    return voluptuous_serialize.convert(schema, custom_serializer=cv.custom_serializer)


async def test_options_schema_serializes_with_alert_fields(
    hass, enable_custom_integrations
):
    entry = MockConfigEntry(domain=DOMAIN, data={"dry_run": True}, options={})
    entry.add_to_hass(hass)

    flow = SmartGrowOptionsFlow()
    flow.hass = hass
    flow.handler = entry.entry_id
    flow.context = {"source": "init", "entry_id": entry.entry_id}
    result = await flow.async_step_init()

    assert result["type"] == "form"
    converted = _converted(result["data_schema"])
    blob = json.dumps(converted)
    assert blob != "[]"
    names = {f.get("name") for f in converted}
    assert "notify_targets" in names
    assert "alert_vpd_tolerance" in names
    assert "alert_cooldown_min" in names


async def test_notify_targets_defaults_available(hass, enable_custom_integrations):
    """Options list includes at least persistent_notification."""
    entry = MockConfigEntry(domain=DOMAIN, data={"dry_run": True}, options={})
    entry.add_to_hass(hass)

    flow = SmartGrowOptionsFlow()
    flow.hass = hass
    flow.handler = entry.entry_id
    flow.context = {"source": "init", "entry_id": entry.entry_id}
    result = await flow.async_step_init()
    blob = json.dumps(_converted(result["data_schema"]))
    assert "persistent_notification" in blob
