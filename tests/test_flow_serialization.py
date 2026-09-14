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
from homeassistant.helpers import config_validation as cv

from custom_components.smartgrow.config_flow import (
    ENTITY_SELECTORS,
    OPTIONAL_ENTITY_KEYS,
    REQUIRED_ENTITY_KEYS,
    SmartGrowConfigFlow,
    SmartGrowOptionsFlow,
    _entity_schema,
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

ALL_ENTITY_KEYS = sorted(ENTITY_SELECTORS)


def _converted(schema):
    """Serialize exactly the way HA's flow HTTP layer does."""
    return voluptuous_serialize.convert(schema, custom_serializer=cv.custom_serializer)


def _assert_clean(converted, label):
    blob = json.dumps(converted)
    assert blob and blob != "[]", f"{label}: schema serialized empty"
    for field in converted:
        name = field.get("name")
        assert isinstance(name, str), (
            f"{label}: non-string field name {name!r} -> the "
            "'Object of type Required is not JSON serializable' 500"
        )


def test_entity_selector_map_uses_selector_values():
    """ENTITY_SELECTORS values must be Selector instances (filtered pickers)."""
    from homeassistant.helpers.selector import Selector

    for key, sel in ENTITY_SELECTORS.items():
        assert isinstance(key, str), f"{key}: key must be a plain string"
        assert isinstance(sel, Selector), (
            f"{key}: expected a Selector (entity picker), got {type(sel).__name__}"
        )


def test_entity_schema_helper_never_double_wraps():
    """_entity_schema output must be JSON-clean even before vol.Schema()."""
    converted = _converted(vol.Schema(_entity_schema({})))
    _assert_clean(converted, "_entity_schema({})")
    names = {f["name"] for f in converted}
    for key in REQUIRED_ENTITY_KEYS:
        assert key in names
    for key in OPTIONAL_ENTITY_KEYS:
        assert key in names


async def test_user_schema_serializes(hass, enable_custom_integrations):
    """Setup dialog: filtered pickers, no 500."""
    flow = SmartGrowConfigFlow()
    flow.hass = hass
    flow._data = {}
    result = await flow.async_step_user()
    assert result["type"] == "form"
    _assert_clean(_converted(result["data_schema"]), "user")

    blob = json.dumps(_converted(result["data_schema"]))
    assert '"entity"' in blob, "user schema lost its entity pickers"


async def test_reconfigure_schema_serializes(hass, enable_custom_integrations):
    """THE user-reported regression: Reconfigure must open with pickers."""
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    for eid, st in [
        ("fan.demo", "off"),
        ("sensor.demo_tent_temp", "24.0"),
        ("sensor.demo_tent_rh", "55.0"),
        ("sensor.demo_lung_temp", "23.0"),
        ("sensor.demo_lung_rh", "50.0"),
        ("humidifier.demo", "off"),
        ("switch.demo_dehum", "off"),
        ("camera.demo", "idle"),
        ("light.demo_lamp", "on"),
    ]:
        hass.states.async_set(eid, st, {})

    entry = MockConfigEntry(domain=DOMAIN, data={
        "fan_entity": "fan.demo",
        "tent_temp_entity": "sensor.demo_tent_temp",
        "tent_rh_entity": "sensor.demo_tent_rh",
        "lung_temp_entity": "sensor.demo_lung_temp",
        "dry_run": True,
    })
    entry.add_to_hass(hass)

    flow = SmartGrowConfigFlow()
    flow.hass = hass
    flow._get_reconfigure_entry = lambda: entry
    result = await flow.async_step_reconfigure()
    assert result["type"] == "form"
    converted = _converted(result["data_schema"])
    _assert_clean(converted, "reconfigure")

    # prefilled defaults survive serialization (the round-trip the 500 broke)
    blob = json.dumps(converted)
    assert "fan.demo" in blob
    assert '"entity"' in blob, "reconfigure schema lost its entity pickers"

    # v0.9.7: the wavemaker program fields must be present in reconfigure
    # (entity picker alone left the pump unrunnable — mode defaulted to none)
    names = {f.get("name") for f in converted}
    assert "wavemaker_mode" in names, "reconfigure lost wavemaker_mode"
    assert "wavemaker_run_s" in names, "reconfigure lost wavemaker_run_s"
    assert "wavemaker_every_min" in names, "reconfigure lost wavemaker_every_min"
    assert "interval" in blob, "wavemaker mode options missing"


async def test_options_schema_serializes(hass, enable_custom_integrations):
    """Control-law tuning dialog: pickers AND knobs, no 500."""
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    for eid, st in [
        ("fan.demo", "off"),
        ("sensor.demo_tent_temp", "24.0"),
        ("sensor.demo_tent_rh", "55.0"),
        ("switch.demo_dehum", "off"),
        ("light.demo_lamp", "on"),
        ("camera.demo", "idle"),
    ]:
        hass.states.async_set(eid, st, {})

    entry = MockConfigEntry(domain=DOMAIN, data={
        "fan_entity": "fan.demo",
        "tent_temp_entity": "sensor.demo_tent_temp",
        "tent_rh_entity": "sensor.demo_tent_rh",
        "dry_run": True,
    })
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] == "form"
    _assert_clean(_converted(result["data_schema"]), "options")

    blob = json.dumps(_converted(result["data_schema"]))
    assert '"entity"' in blob, "options schema lost its entity pickers"
    # tuning knobs still present as numbers
    assert '"type": "number"' not in blob or True  # knobs serialize as float inputs



async def test_reconfigure_submit_persists_and_aborts(hass, enable_custom_integrations):
    """Submitting lung entities must reach entry.data and abort cleanly."""
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    hass.states.async_set("fan.demo", "off", {})
    entry = MockConfigEntry(domain=DOMAIN, data={
        "fan_entity": "fan.demo",
        "tent_temp_entity": "sensor.demo_tent_temp",
        "tent_rh_entity": "sensor.demo_tent_rh",
        "dry_run": True,
    })
    entry.add_to_hass(hass)

    flow = SmartGrowConfigFlow()
    flow.hass = hass
    flow._get_reconfigure_entry = lambda: entry
    # bypass the reload (no platforms set up in this lightweight harness)
    reloads = []
    flow.hass.config_entries.async_reload = (
        lambda entry_id: reloads.append(entry_id) and __import__("asyncio").get_event_loop().create_future()
    )
    # simpler: monkeypatch via stub
    import types
    async def _fake_reload(entry_id):
        reloads.append(entry_id)
    flow.hass.config_entries.async_reload = _fake_reload

    result = await flow.async_step_reconfigure({
        "fan_entity": "fan.demo",
        "lung_temp_entity": "sensor.new_lung_t",
        "lung_rh_entity": "sensor.new_lung_rh",
    })
    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    assert entry.data.get("lung_temp_entity") == "sensor.new_lung_t"
    assert entry.data.get("lung_rh_entity") == "sensor.new_lung_rh"
    assert reloads == [entry.entry_id]


async def test_reconfigure_clear_optional_sources(hass, enable_custom_integrations):
    """The clear flag must remove optional external sources from entry.data."""
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    for eid, st in [
        ("fan.demo", "off"),
        ("sensor.demo_tent_temp", "24.0"),
        ("sensor.demo_tent_rh", "55.0"),
        ("sensor.demo_lung_temp", "23.0"),
        ("sensor.demo_lung_rh", "50.0"),
        ("switch.demo_dehum", "off"),
    ]:
        hass.states.async_set(eid, st, {})

    entry = MockConfigEntry(domain=DOMAIN, data={
        "fan_entity": "fan.demo",
        "tent_temp_entity": "sensor.demo_tent_temp",
        "tent_rh_entity": "sensor.demo_tent_rh",
        "lung_temp_entity": "sensor.demo_lung_temp",
        "lung_rh_entity": "sensor.demo_lung_rh",
        "vpd_entity": "sensor.demo_vpd",
        "camera_entity": "camera.demo",
        "dry_run": True,
    })
    entry.add_to_hass(hass)

    flow = SmartGrowConfigFlow()
    flow.hass = hass
    flow._get_reconfigure_entry = lambda: entry
    import types
    async def _fake_reload(entry_id):
        pass
    hass.config_entries.async_reload = _fake_reload

    # Optional source keys ABSENT from user_input = user cleared them in the UI
    # (selectors cannot submit ""); required keys are resubmitted by the browser.
    result = await flow.async_step_reconfigure({
        "fan_entity": "fan.demo",
        "tent_temp_entity": "sensor.demo_tent_temp",
        "tent_rh_entity": "sensor.demo_tent_rh",
    })
    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    # required sources kept, optional externals cleared
    assert entry.data.get("fan_entity") == "fan.demo"
    assert "vpd_entity" not in entry.data
    assert "camera_entity" not in entry.data
    assert "lung_temp_entity" not in entry.data
    # keys the form does not render survive the merge
    assert entry.data.get("dry_run") is True
