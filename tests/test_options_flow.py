"""Options flow must initialize without touching the read-only config_entry property."""
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.smartgrow.const import DOMAIN

DATA = {
    "fan_entity": "fan.demo",
    "dehum_entity": "humidifier.demo",
    "tent_temp_entity": "sensor.demo_tent_temp",
    "tent_rh_entity": "sensor.demo_tent_rh",
    "lung_temp_entity": "sensor.demo_lung_temp",
    "lung_rh_entity": "sensor.demo_lung_rh",
    "vpd_entity": "sensor.demo_vpd",
    "lamp_entity": "light.demo_lamp",
    "stage_entity": "input_select.demo_stage",
    "dry_run": True,
}


async def test_options_flow_init(hass, enable_custom_integrations):
    """Regression: assigning self.config_entry raises AttributeError on HA >= 2025.3
    (read-only property), which surfaced as HTTP 500 on the Configure dialog."""
    from homeassistant.core import State

    for eid, st in [
        ("fan.demo", "off"),
        ("humidifier.demo", "off"),
        ("sensor.demo_tent_temp", "24.0"),
        ("sensor.demo_tent_rh", "55.0"),
        ("sensor.demo_lung_temp", "23.0"),
        ("sensor.demo_lung_rh", "50.0"),
        ("sensor.demo_vpd", "1.2"),
        ("light.demo_lamp", "off"),
        ("input_select.demo_stage", "Flowering"),
    ]:
        hass.states.async_set(eid, st, {})

    entry = MockConfigEntry(domain=DOMAIN, data=DATA)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    flow = await hass.config_entries.options.async_init(entry.entry_id)
    assert flow["type"] == "form"
    assert flow["step_id"] == "init"
