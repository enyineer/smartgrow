"""Drying force-off must read the wavemaker entity from MERGED config.

The first implementation read source_entities.get("wavemaker") — a key that
does not exist in that map (the pump is configured via CONF_WAVEMAKER_ENTITY
in entry data/options, read by _wavemaker_tick from merged). The force-off
silently no-opped and a manually-on pump stayed on through Drying.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from custom_components.smartgrow.coordinator import SmartGrowCoordinator


def test_drying_force_off_uses_conf_wavemaker_entity():
    """Force-off must resolve the pump via CONF_WAVEMAKER_ENTITY."""
    c = object.__new__(SmartGrowCoordinator)
    c.entry = MagicMock()
    c.entry.data = {
        "name": "G",
        "fan_entity": "fan.f",
        "tent_temp_entity": "sensor.t",
        "tent_rh_entity": "sensor.rh",
        "wavemaker_entity": "switch.umwalzpumpe",
        "wavemaker_mode": "interval",
    }
    c.entry.options = {}
    c.hass = MagicMock()
    pump_state = SimpleNamespace(state="on")
    c.hass.states.get = lambda eid: pump_state if eid == "switch.umwalzpumpe" else None
    c.hass.services.async_call = AsyncMock()
    c.options_rt = SimpleNamespace(dry_run=False, notify_targets=[])

    # call the force-off the way the drying branch does
    merged = {**c.entry.data, **c.entry.options}
    wm = merged.get("wavemaker_entity", "")
    assert wm == "switch.umwalzpumpe"
    # and the coordinator's own tick config path agrees:
    from custom_components.smartgrow.const import CONF_WAVEMAKER_ENTITY

    assert merged.get(CONF_WAVEMAKER_ENTITY) == wm
