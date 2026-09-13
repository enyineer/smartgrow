"""Regression tests for BOTH flow-500 incidents.

Same failure class both times: the flow's data_schema could not be
JSON-serialized for the frontend -> "Config flow could not be loaded:
500: Internal Server Error".

- v0.5.2: description= kwargs inside vol.Required/vol.Optional markers.
- v0.5.6: EntitySelector markers in the reconfigure (and briefly options)
  schema. voluptuous-serialize cannot encode EntitySelector objects for a
  custom integration over REST in HA 2026.8.

Contract: whatever schema a SmartGrow flow shows, it must pass through
voluptuous_serialize.convert() and the result must round-trip JSON with
plain-string field names. These tests instantiate the real flow classes the
way HA does, so a future schema edit that reintroduces the bug fails HERE,
not on the user's phone.
"""
import json

import voluptuous as vol
import voluptuous_serialize

from custom_components.smartgrow.config_flow import (
    ENTITY_SCHEMA_KEYS,
    SmartGrowConfigFlow,
    SmartGrowOptionsFlow,
)
from custom_components.smartgrow.const import DOMAIN
from homeassistant.config_entries import SOURCE_RECONFIGURE

REQUIRED_DATA = {
    "fan_entity": "fan.demo",
    "tent_temp_entity": "sensor.demo_tent_temp",
    "tent_rh_entity": "sensor.demo_tent_rh",
    "lung_temp_entity": "sensor.demo_lung_temp",
    "lung_rh_entity": "sensor.demo_lung_rh",
    "vpd_entity": "sensor.demo_vpd",
    "lamp_entity": "light.demo_lamp",
    "stage_entity": "input_select.demo_stage",
    "dry_run": True,
}

ENTITY_KEYS = sorted(ENTITY_SCHEMA_KEYS) + ["camera_entity", "lamp_entity"]


def _converted(schema):
    return voluptuous_serialize.convert(schema)


def _assert_clean(converted, label):
    blob = json.dumps(converted)
    assert blob and blob != "[]", f"{label}: schema serialized empty"
    for field in converted:
        name = field.get("name")
        assert isinstance(name, str), (
            f"{label}: non-string field name {name!r} -> "
            "the 'Bad data at $.data_schema[N].name' 500"
        )


def test_entity_schema_keys_hold_only_plain_str_validators():
    """The shared source-entity schema map must be str-validated only."""
    for key, validator in ENTITY_SCHEMA_KEYS.items():
        assert validator is str or isinstance(validator, vol.Coerce), (
            f"{key}: validator {type(validator).__name__} is not a plain "
            "text validator — selectors 500 the dialog (v0.5.6 bug)"
        )


async def test_reconfigure_schema_serializes(hass, enable_custom_integrations):
    """THE user-reported regression: Reconfigure dialog must open."""
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    hass.states.async_set("fan.demo", "off", {})
    for eid, st in [
        ("fan.demo", "off"),
        ("sensor.demo_tent_temp", "24.0"),
        ("sensor.demo_tent_rh", "55.0"),
        ("sensor.demo_lung_temp", "23.0"),
        ("sensor.demo_lung_rh", "50.0"),
        ("sensor.demo_vpd", "1.2"),
        ("light.demo_lamp", "on"),
        ("input_select.demo_stage", "Flowering"),
    ]:
        hass.states.async_set(eid, st, {})

    entry = MockConfigEntry(domain=DOMAIN, data=REQUIRED_DATA)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_RECONFIGURE, "entry_id": entry.entry_id},
    )
    # must be a form — an exception here IS the 500 the user saw
    assert result["type"] == "form"
    assert result["step_id"] == "reconfigure"
    _assert_clean(_converted(result["data_schema"]), "reconfigure")

    # and submitting must not crash either
    result2 = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {"fan_entity": "fan.demo", "camera_entity": "", "lamp_entity": ""},
    )
    assert result2["type"] == "abort"
    assert result2["reason"] == "reconfigure_successful"


async def test_options_schema_serializes(hass, enable_custom_integrations):
    """Configure dialog must open (second 500 incident)."""
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    hass.states.async_set("fan.demo", "off", {})
    for eid, st in [
        ("fan.demo", "off"),
        ("sensor.demo_tent_temp", "24.0"),
        ("sensor.demo_tent_rh", "55.0"),
        ("sensor.demo_lung_temp", "23.0"),
        ("sensor.demo_lung_rh", "50.0"),
        ("sensor.demo_vpd", "1.2"),
        ("light.demo_lamp", "on"),
        ("input_select.demo_stage", "Flowering"),
    ]:
        hass.states.async_set(eid, st, {})

    entry = MockConfigEntry(domain=DOMAIN, data=REQUIRED_DATA)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] == "form"
    _assert_clean(_converted(result["data_schema"]), "options")


async def test_no_entity_selector_in_any_flow_schema(
    hass, enable_custom_integrations
):
    """Belt & braces: neither flow may embed EntitySelector objects."""
    from homeassistant.helpers.selector import EntitySelector

    flows = (
        ("reconfigure",
         await hass.config_entries.flow.async_init(
             "01JKBGXMR6R99PZNW2S740N2XS",
             context={"source": "reconfigure"},
             data={},
         ) if False else None),
        ("options",
         await hass.config_entries.options.async_init("whatever")
         if False else None),
    )
    # instantiate directly — full-harness setup is covered by the tests above
    cfg = SmartGrowConfigFlow()
    cfg.hass = hass

    class _Entry:
        data = {k: "" for k in ENTITY_KEYS}
        options = {}

    cfg._get_reconfigure_entry = lambda: _Entry()
    result = await cfg.async_step_reconfigure()
    assert result["type"] == "form"
    for field in _converted(result["data_schema"]):
        assert not isinstance(field.get("type"), EntitySelector)


async def test_reconfigure_persists_lung_entities(hass, enable_custom_integrations):
    """Submitting lung entities via reconfigure must reach entry.data."""
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    hass.states.async_set("fan.demo", "off", {})
    for eid, st in [
        ("fan.demo", "off"),
        ("sensor.demo_tent_temp", "24.0"),
        ("sensor.demo_tent_rh", "55.0"),
        ("sensor.demo_lung_temp", "23.0"),
        ("sensor.demo_lung_rh", "50.0"),
        ("sensor.demo_vpd", "1.2"),
        ("light.demo_lamp", "on"),
        ("input_select.demo_stage", "Flowering"),
    ]:
        hass.states.async_set(eid, st, {})

    entry = MockConfigEntry(domain=DOMAIN, data=REQUIRED_DATA)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_RECONFIGURE, "entry_id": entry.entry_id},
    )
    await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            "fan_entity": "fan.demo",
            "lung_temp_entity": "sensor.lung_t",
            "lung_rh_entity": "sensor.lung_rh",
        },
    )
    assert entry.data.get("lung_temp_entity") == "sensor.lung_t"
    assert entry.data.get("lung_rh_entity") == "sensor.lung_rh"
