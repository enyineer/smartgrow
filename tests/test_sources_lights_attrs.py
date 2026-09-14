"""Sources sensor must publish the live lights schedule times.

The card's Details drawer shows "Lights on/off" from these attrs; they were
always None because they were never published (v0.10.3 regression report).
The time entities are the source of truth — read them via the registry.
"""
import pytest

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.smartgrow.const import DOMAIN, UNIQUE_ID_TEMPLATE

ENTRY_ID = "01M254NZM08DV0PP3J0SECKEPR"


@pytest.fixture
def config_entry(hass):
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=ENTRY_ID,
        data={
            "name": "Growbox 1",
            "fan_entity": "fan.test",
            "tent_temp_entity": "sensor.test_temp",
            "tent_rh_entity": "sensor.test_rh",
        },
    )
    entry.add_to_hass(hass)
    return entry


async def test_sources_publishes_lights_times(hass: HomeAssistant, config_entry):
    from unittest.mock import patch
    from custom_components.smartgrow.coordinator import SmartGrowCoordinator

    # deterministic registry entries (production pattern)
    from homeassistant.helpers import entity_registry as er
    reg = er.async_get(hass)
    ids = {}
    for slug, state in (("lights_on_time", "20:00:00"), ("lights_off_time", "08:00:00")):
        uid = UNIQUE_ID_TEMPLATE.format(entry_id=config_entry.entry_id, name=slug)
        entry = reg.async_get_or_create(
            "time", DOMAIN, uid,
            config_entry=config_entry,
            suggested_object_id=f"smartgrow_{slug}",
        )
        ids[slug] = entry.entity_id
    # live time entity states, as the user's box has them
    hass.states.async_set(ids["lights_on_time"], "20:00:00")
    hass.states.async_set(ids["lights_off_time"], "08:00:00")

    entry = config_entry
    with patch.object(SmartGrowCoordinator, "__init__", lambda self, hass, entry: None):
        coordinator = SmartGrowCoordinator(hass, entry)
        coordinator.hass = hass
        coordinator.entry = entry

    from custom_components.smartgrow.sensor import SourcesSensor
    sensor = SourcesSensor(coordinator, entry)
    attrs = sensor.extra_state_attributes

    assert attrs["lights_on_time"] == "20:00:00"
    assert attrs["lights_off_time"] == "08:00:00"


async def test_sources_lights_times_none_when_entities_missing(hass, config_entry):
    from unittest.mock import patch
    from custom_components.smartgrow.coordinator import SmartGrowCoordinator

    entry = config_entry
    with patch.object(SmartGrowCoordinator, "__init__", lambda self, hass, entry: None):
        coordinator = SmartGrowCoordinator(hass, entry)
        coordinator.hass = hass
        coordinator.entry = entry

    from custom_components.smartgrow.sensor import SourcesSensor
    sensor = SourcesSensor(coordinator, entry)
    attrs = sensor.extra_state_attributes

    assert attrs["lights_on_time"] is None
    assert attrs["lights_off_time"] is None
