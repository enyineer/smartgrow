"""Night->day transition: downstream consumers must see post-flip state.

Mirror of test_alert_day_transition (day->night): _apply_schedule turns the
lamp ON mid-tick; the pre-schedule inputs snapshot still says is_day=False
(night band 1.3-1.45). Without a re-gather, the fan/dehum compute and the
vpd_high alert evaluated against the NIGHT band for one tick — vpd >= 1.61
(day band territory) fired a spurious vpd_high at every lights_on
transition. The coordinator now re-gathers once when day-ness diverged.
"""
import asyncio
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.smartgrow.const import DOMAIN
from custom_components.smartgrow.coordinator import SmartGrowCoordinator


def _make(hass: HomeAssistant, data: dict) -> SmartGrowCoordinator:
    entry = MockConfigEntry(domain=DOMAIN, data=data)
    entry.add_to_hass(hass)
    c = object.__new__(SmartGrowCoordinator)
    c.entry = entry
    c.hass = hass
    return c


def test_update_regathers_after_schedule_flips_lamp(hass):
    """Night->day: schedule turns lamp on mid-tick; inputs must follow."""
    from homeassistant.const import STATE_ON, STATE_OFF
    from unittest.mock import AsyncMock

    c = _make(hass, {
        "name": "Growbox 1",
        "fan_entity": "fan.f",
        "tent_temp_entity": "sensor.t",
        "tent_rh_entity": "sensor.rh",
        "lamp_entity": "light.lamp",
    })
    hass.states.async_set("fan.f", "on")
    hass.states.async_set("sensor.t", "25.0")
    hass.states.async_set("sensor.rh", "60")
    hass.states.async_set("light.lamp", STATE_OFF)  # night

    pre = c._gather_inputs()
    assert pre.is_day is False

    # schedule flips the lamp on mid-tick (what _apply_schedule does)
    async def fake_schedule():
        hass.states.async_set("light.lamp", STATE_ON)

    c._apply_schedule = fake_schedule
    c._wavemaker_tick = AsyncMock()
    from custom_components.smartgrow.logic.params import ControlParams
    c.options_rt = SimpleNamespace(control=ControlParams(), dry_run=False)
    c.engine = MagicMock()
    c.engine.check_watchdog.return_value = True
    c.engine.adapted_params.side_effect = lambda base: base
    c.hass.add_job = lambda *a, **k: None
    c.last_fan_ts = 0.0
    c.last_dehum_ts = 0.0
    c.dehum_on = False
    c.hum_on = False
    c._check_legacy_automations = lambda: None
    c._dispatch_alerts = AsyncMock()
    c._apply_fan = AsyncMock()
    c._apply_dehum = AsyncMock()
    c._apply_hum = AsyncMock()
    c.last_inputs = None
    c.last_sample_ts = None
    c.trace = []

    with patch.object(c, "_gather_inputs", wraps=c._gather_inputs) as spy:
        asyncio.get_event_loop().run_until_complete(c._async_update_data())

    # inputs were refreshed at least twice (pre + post-flip re-gather) and
    # the stored snapshot has the post-transition day state
    assert spy.call_count >= 2
    assert c.last_inputs.is_day is True
