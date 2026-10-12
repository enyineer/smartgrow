"""Integration tests for the Curing device: entry setup + coordinator."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.smartgrow.const import DOMAIN

JARS = [
    "sensor.jar1_temperature",
    "sensor.jar2_temperature",
]

ENTRY_DATA = {
    "device_type": "curing",
    "name": "Curing jars",
    "jar_temp_entities": list(JARS),
    "curing_temp_min": 15.0,
    "curing_temp_max": 23.0,
    "curing_rh_min": 55.0,
    "curing_rh_max": 65.0,
    "curing_alert_cooldown_h": 6.0,
}


def _set_states(hass, temp1="18.0", rh1="62.0", temp2="26.0", rh2="60.0"):
    hass.states.async_set(JARS[0], temp1, {"device_class": "temperature", "friendly_name": "Glas 1 temperature"})
    hass.states.async_set("sensor.jar1_humidity", rh1, {"device_class": "humidity"})
    hass.states.async_set(JARS[1], temp2, {"device_class": "temperature", "friendly_name": "Glas 2 temperature"})
    hass.states.async_set("sensor.jar2_humidity", rh2, {"device_class": "humidity"})


@pytest.fixture
def _no_sibling(hass):
    """Registry-less sensors: sibling falls back to the _humidity stem."""
    with patch(
        "custom_components.smartgrow.curing_coordinator.discover_rh_sibling",
        side_effect=lambda hass, eid: eid.replace("_temperature", "_humidity"),
    ):
        yield


async def test_curing_entry_sets_up_sensor_platform_only(hass, enable_custom_integrations, _no_sibling):
    """Curing entries forward ONLY the sensor platform; no switch/number/select/time."""
    entry = MockConfigEntry(domain=DOMAIN, data=ENTRY_DATA)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    # entity domains that got entities for this entry:
    states = hass.states
    assert states.get("sensor.smartgrow_curing_jars_curing_status") is not None
    # none of the grow actuators/diagnostics may exist:
    for forbidden in (
        "switch.smartgrow_curing_jars_dry_run",
        "select.smartgrow_curing_jars_stage",
        "number.smartgrow_curing_jars_fan_floor_day",
        "time.smartgrow_curing_jars_lights_on",
        "binary_sensor.smartgrow_curing_jars_vpd_low",
    ):
        assert states.get(forbidden) is None, forbidden


async def test_coordinator_evaluates_jars(hass, enable_custom_integrations, _no_sibling):
    entry = MockConfigEntry(domain=DOMAIN, data=ENTRY_DATA)
    entry.add_to_hass(hass)
    _set_states(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    data = coordinator.data
    assert data["total"] == 2
    assert data["ok_count"] == 1
    assert data["worst"] == "too_warm"
    jar2 = next(j for j in data["jars"] if j["name"].endswith("2"))
    assert jar2["status"] == "too_warm"
    assert jar2["rh_entity"] == "sensor.jar2_humidity"


async def test_unavailable_jar_alerts_via_persistent_notification(hass, enable_custom_integrations, _no_sibling):
    entry = MockConfigEntry(domain=DOMAIN, data=ENTRY_DATA)
    entry.add_to_hass(hass)
    _set_states(hass, temp2="unavailable", rh2="unavailable")
    calls = []

    from homeassistant.core import ServiceCall

    async def _capture(call: ServiceCall) -> None:
        calls.append((call.domain, call.service))

    # Register REAL services (the ServiceRegistry rejects attribute injection)
    hass.services.async_register("persistent_notification", "create", _capture)
    hass.services.async_register("notify", "persistent_notification", _capture)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert ("persistent_notification", "create") in calls, calls


async def test_per_jar_cooldown_prevents_spam(hass, enable_custom_integrations, _no_sibling):
    """Same deviating jar inside the cooldown window must not re-alert."""
    entry = MockConfigEntry(domain=DOMAIN, data=ENTRY_DATA)
    entry.add_to_hass(hass)
    _set_states(hass)  # jar2 too_warm -> alerts once
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    now = coordinator._last_alert.get(
        "Glas 2 temperature" if "Glas 2 temperature" in coordinator._last_alert else next(iter(coordinator._last_alert))
    )
    assert now, "jar2 deviation should have armed its cooldown"

    calls = []

    async def _capture(call) -> None:
        calls.append((call.domain, call.service))

    hass.services.async_register("persistent_notification", "create", _capture)

    await coordinator.async_refresh()
    await coordinator.async_refresh()
    assert calls == [], "second refresh re-alerted inside the cooldown window"


async def test_grow_entry_still_gets_full_platforms(hass, enable_custom_integrations):
    """Regression guard: the grow path keeps all platforms."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={
            "name": "Growbox 1",
            "fan_entity": "fan.demo",
            "tent_temp_entity": "sensor.demo_tent_temp",
            "tent_rh_entity": "sensor.demo_tent_rh",
        },
    )
    entry.add_to_hass(hass)
    hass.states.async_set("fan.demo", "off")
    hass.states.async_set("sensor.demo_tent_temp", "24.0")
    hass.states.async_set("sensor.demo_tent_rh", "55.0")
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    # entity id is device-qualified (smartgrow_growbox_1_smartgrow_*)
    assert hass.states.get("sensor.smartgrow_growbox_1_smartgrow_configured_sources") is not None


async def test_curing_entry_reloads_cleanly(hass, enable_custom_integrations, _no_sibling):
    """Regression: unloading un-forwarded platforms made reload fail
    (failed_unload) because async_unload_entry passed ALL grow platforms."""
    entry = MockConfigEntry(domain=DOMAIN, data=ENTRY_DATA)
    entry.add_to_hass(hass)
    _set_states(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get("sensor.smartgrow_curing_jars_curing_status") is not None
