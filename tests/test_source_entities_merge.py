"""Runtime source-entity resolution must merge options over data.

The sources sensor (_source) is options-first; source_entities was data-only,
so the runtime disagreed with the dashboard: phase went 'unknown' and the
master-plug logic silently lost its entity while the sources sensor showed
both configured (v0.10.4 regression report).
"""
from unittest.mock import MagicMock

from custom_components.smartgrow.coordinator import SmartGrowCoordinator


def _coordinator_with(data: dict, options: dict) -> SmartGrowCoordinator:
    c = object.__new__(SmartGrowCoordinator)
    c.entry = MagicMock()
    c.entry.data = data
    c.entry.options = options
    return c


def test_options_override_data_for_lamp():
    c = _coordinator_with(
        {"fan_entity": "fan.f", "tent_temp_entity": "sensor.t",
         "tent_rh_entity": "sensor.rh", "lamp_entity": "light.old"},
        {"lamp_entity": "light.new"},
    )
    assert c.source_entities["lamp"] == "light.new"


def test_master_plug_visible_via_options():
    c = _coordinator_with(
        {"fan_entity": "fan.f", "tent_temp_entity": "sensor.t",
         "tent_rh_entity": "sensor.rh"},
        {"lamp_switch_entity": "switch.growlampe_master"},
    )
    assert c.source_entities["lamp_switch"] == "switch.growlampe_master"


def test_data_still_used_when_option_absent():
    c = _coordinator_with(
        {"fan_entity": "fan.f", "tent_temp_entity": "sensor.t",
         "tent_rh_entity": "sensor.rh", "camera_entity": "camera.cam"},
        {},
    )
    assert c.source_entities["camera"] == "camera.cam"
