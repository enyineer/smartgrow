
"""Regression: lamp master switch (failsafe mains plug) drives together with dimmer.

The Growlampe is a dimmable light plus a "Growlampe Master" smart plug that fully
cuts mains (no LED glimmer at night). Both must switch together on schedule
changes, and day/night detection must treat master-off as night.
"""
from unittest.mock import patch

from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNAVAILABLE

from custom_components.smartgrow.const import CONF_LAMP_ENTITY, CONF_LAMP_SWITCH_ENTITY


def _make_coordinator(hass, entry_data):
    """Mock-based coordinator with the real lamp/phase methods bound."""
    from unittest.mock import MagicMock

    from custom_components.smartgrow.coordinator import SmartGrowCoordinator

    from custom_components.smartgrow.const import (
        CONF_FAN_ENTITY,
        CONF_TENT_RH_ENTITY,
        CONF_TENT_TEMP_ENTITY,
    )

    data = {
        CONF_FAN_ENTITY: "fan.f",
        CONF_TENT_TEMP_ENTITY: "sensor.t",
        CONF_TENT_RH_ENTITY: "sensor.h",
        **entry_data,
    }
    async def _noop_coro():
        return None

    calls: list[tuple[str, str, str]] = []

    class _Services:
        def async_call(self, domain, service, data=None, **kw):
            calls.append((domain, service, data["entity_id"]))
            return _noop_coro()

    class _Hass:
        services = _Services()
        states = hass.states

        def async_create_task(self, coro):
            coro.close()  # service call already recorded synchronously

    c = MagicMock(spec=SmartGrowCoordinator)
    c.entry = MagicMock()
    c.entry.data = data
    c.entry.options = {}
    c.hass = _Hass()
    c.options_rt = MagicMock()
    c._calls = calls
    c.options_rt.dry_run = False
    c.source_entities = SmartGrowCoordinator.source_entities.fget(c)
    for name in ("_lamp_switch_is_on", "_lamp_is_on", "_phase", "_apply_lamp"):
        setattr(c, name, getattr(SmartGrowCoordinator, name).__get__(c))
    return c


def _set(hass, eid, state):
    hass.states.async_set(eid, state)


async def test_apply_lamp_drives_both(hass):
    """With dimmer + master configured, both receive the same service call."""
    coord = _make_coordinator(hass, {
        CONF_LAMP_ENTITY: "light.growlampe_light_0",
        CONF_LAMP_SWITCH_ENTITY: "switch.growlampe_master",
    })
    coord._apply_lamp(True)
    coord._apply_lamp(False)
    assert coord._calls == [
        ("light", "turn_on", "light.growlampe_light_0"),
        ("switch", "turn_on", "switch.growlampe_master"),
        ("light", "turn_off", "light.growlampe_light_0"),
        ("switch", "turn_off", "switch.growlampe_master"),
    ]


async def test_apply_lamp_single_when_no_master(hass):
    """No master configured -> only the dimmer is driven (old behavior)."""
    coord = _make_coordinator(hass, {CONF_LAMP_ENTITY: "light.growlampe_light_0"})
    coord._apply_lamp(True)
    assert coord._calls == [("light", "turn_on", "light.growlampe_light_0")]


async def test_phase_master_off_is_night(hass):
    """Dimmer reports on but master off -> the lamp cannot light -> night."""
    coord = _make_coordinator(hass, {
        CONF_LAMP_ENTITY: "light.growlampe_light_0",
        CONF_LAMP_SWITCH_ENTITY: "switch.growlampe_master",
    })
    _set(hass, "light.growlampe_light_0", STATE_ON)
    _set(hass, "switch.growlampe_master", STATE_OFF)
    assert coord._phase() == "night"
    assert coord._lamp_is_on() is False


async def test_phase_master_on_is_day(hass):
    """Dimmer on + master on -> day."""
    coord = _make_coordinator(hass, {
        CONF_LAMP_ENTITY: "light.growlampe_light_0",
        CONF_LAMP_SWITCH_ENTITY: "switch.growlampe_master",
    })
    _set(hass, "light.growlampe_light_0", STATE_ON)
    _set(hass, "switch.growlampe_master", STATE_ON)
    assert coord._phase() == "day"
    assert coord._lamp_is_on() is True


async def test_phase_master_unavailable_counts_off(hass):
    """Master unavailable (radio drop) must not be read as day-capable."""
    coord = _make_coordinator(hass, {
        CONF_LAMP_ENTITY: "light.growlampe_light_0",
        CONF_LAMP_SWITCH_ENTITY: "switch.growlampe_master",
    })
    _set(hass, "light.growlampe_light_0", STATE_ON)
    _set(hass, "switch.growlampe_master", STATE_UNAVAILABLE)
    assert coord._phase() == "night"


async def test_lamp_switch_in_optional_schema():
    """The reconfigure/user schema renders the master-switch entity picker."""
    from custom_components.smartgrow.config_flow import _entity_schema

    schema = _entity_schema({})
    assert any(getattr(k, "schema", k) == CONF_LAMP_SWITCH_ENTITY or
               str(k) == CONF_LAMP_SWITCH_ENTITY for k in schema)
