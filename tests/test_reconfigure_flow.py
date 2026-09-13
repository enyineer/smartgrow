"""Reconfigure flow must init and submit without crashing (regression for 500)."""
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.smartgrow.const import DOMAIN

DATA = {
    "name": "Growbox 1",
    "fan_entity": "fan.demo",
    "dehum_entity": "switch.demo",
    "tent_temp_entity": "sensor.demo_tent_temp",
    "tent_rh_entity": "sensor.demo_tent_rh",
    "lung_temp_entity": "sensor.demo_lung_temp",
    "lung_rh_entity": "sensor.demo_lung_rh",
    "vpd_entity": "sensor.demo_vpd",
    "lamp_entity": "light.demo_lamp",
    "camera_entity": "camera.demo",
    "lights_on_time": "06:00",
    "lights_off_time": "22:00",
    "dry_run": True,
}


async def test_reconfigure_flow_init_and_submit(hass, enable_custom_integrations):
    """The reconfigure step must serve a form and accept input (no 500/AttributeError)."""
    for eid, st in [
        ("fan.demo", "off"), ("switch.demo", "off"),
        ("sensor.demo_tent_temp", "24.0"), ("sensor.demo_tent_rh", "55.0"),
        ("sensor.demo_lung_temp", "23.0"), ("sensor.demo_lung_rh", "50.0"),
        ("sensor.demo_vpd", "1.2"), ("light.demo_lamp", "off"),
        ("camera.demo", "idle"), ("humidifier.demo", "off"),
    ]:
        hass.states.async_set(eid, st, {})

    entry = MockConfigEntry(domain=DOMAIN, data=DATA)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    # init the reconfigure flow through the flow manager (what HA does internally)
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": "reconfigure", "entry_id": entry.entry_id}
    )
    assert result["type"] == "form"
    assert result["step_id"] == "reconfigure"
    assert result["data_schema"].schema, "schema must contain fields"

    # submit it
    user_input = {
        "fan_entity": "fan.demo2",
        "tent_temp_entity": "sensor.demo_tent_temp",
        "tent_rh_entity": "sensor.demo_tent_rh",
        "dehum_entity": "switch.demo",
        "hum_entity": "humidifier.demo",
        "lung_temp_entity": "sensor.demo_lung_temp",
        "lung_rh_entity": "sensor.demo_lung_rh",
        "camera_entity": "camera.demo",
    }
    result2 = await hass.config_entries.flow.async_configure(result["flow_id"], user_input)
    await hass.async_block_till_done()
    # Reconfigure flows end with an abort(reconfigure_successful), not create_entry.
    assert result2["type"] == "abort"
    assert result2["reason"] == "reconfigure_successful"
    # entities persisted
    assert entry.data["fan_entity"] == "fan.demo2"
    assert entry.data["camera_entity"] == "camera.demo"
