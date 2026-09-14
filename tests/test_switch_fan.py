"""Regression: switch-plug fans (domain != fan) must be configurable and
driven via their own domain (v0.10.1).

The fan entity selector was fan-domain-only, locking out smart-plug fans;
_apply_fan hardcoded the 'fan' service domain, which would fail for a
switch.* entity even if one were configured.
"""
from unittest.mock import MagicMock

from custom_components.smartgrow.config_flow import ENTITY_SELECTORS
from custom_components.smartgrow.const import CONF_FAN_ENTITY
from custom_components.smartgrow.logic import fan_control
from custom_components.smartgrow.logic.params import ControlParams, SensorInputs


def test_fan_selector_allows_switch_and_input_boolean():
    cfg = ENTITY_SELECTORS[CONF_FAN_ENTITY].config
    assert "switch" in cfg["domain"], cfg
    assert "input_boolean" in cfg["domain"], cfg
    assert "fan" in cfg["domain"], cfg


def _decision():
    return fan_control.FanDecision(
        fan_target=60, fan_delta_term=60, fan_vpd_term=0, fan_temp_term=0,
        fan_need_term=0, min_fan=20, active_term="delta", d_ah=1.0,
        ah_tent=13.0, ah_lung=12.0, cold=False, cold_mult=1.0,
    )


def _inputs():
    return SensorInputs(tent_temp=25, tent_rh=60, lung_temp=25, lung_rh=55,
                        vpd=1.2, fan_pct=0, is_day=True)


async def _register_and_drive(hass, fan_entity):
    calls = []

    async def _record_call(call):
        calls.append(
            (call.domain, call.service, call.data.get("entity_id"),
             call.data.get("percentage"))
        )

    hass.services.async_register("switch", "turn_on", _record_call)
    hass.services.async_register("switch", "turn_off", _record_call)
    hass.services.async_register("fan", "turn_on", _record_call)
    hass.services.async_register("fan", "turn_off", _record_call)

    from custom_components.smartgrow.coordinator import SmartGrowCoordinator

    c = MagicMock(spec=SmartGrowCoordinator)
    c.hass = hass

    def _source(key):
        return fan_entity if key == CONF_FAN_ENTITY else ""

    c._source = _source
    c.options_rt = MagicMock()
    c.options_rt.dry_run = False
    c._record = MagicMock()
    c._apply_fan = SmartGrowCoordinator._apply_fan.__get__(c)
    await c._apply_fan(_decision(), _inputs())
    return calls


async def test_apply_fan_switch_domain(hass):
    """A switch.* fan gets switch.turn_on / switch.turn_off calls."""
    hass.states.async_set("switch.plug_fan", "off", {})
    calls = await _register_and_drive(hass, "switch.plug_fan")
    assert ("switch", "turn_on", "switch.plug_fan", None) in calls


async def test_apply_fan_fan_domain_unchanged(hass):
    """A real fan still gets fan.turn_on with percentage payload."""
    hass.states.async_set("fan.ec_luefter", "off",
                          {"percentage": 0, "supported_features": 15})
    calls = await _register_and_drive(hass, "fan.ec_luefter")
    assert ("fan", "turn_on", "fan.ec_luefter", 60) in calls
