"""Drying stage: controller + coordinator branch tests.

While the stage select is Drying:
  - the exhaust fan runs a 55-62% RH hysteresis (ON above, OFF below, hold in
    between), NOT the VPD law;
  - lamp + master are forced OFF every tick (schedule must not relight);
  - VPD fan/dehum cascades are skipped entirely;
  - mold-risk / too-fast-dry alerts fire with cooldown.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.smartgrow.logic.drying import (
    compute_drying_fan,
    drying_alerts,
)


class TestComputeDryingFan:
    def test_high_rh_turns_on(self):
        d = compute_drying_fan(63.0, 62.0, 55.0, current=False)
        assert d.action == "on" and d.fan_target == 100

    def test_low_rh_turns_off(self):
        d = compute_drying_fan(50.0, 62.0, 55.0, current=True)
        assert d.action == "off" and d.fan_target == 0

    def test_band_holds_previous(self):
        d = compute_drying_fan(58.0, 62.0, 55.0, current=True)
        assert d.action == "hold" and d.fan_target == 100
        d = compute_drying_fan(56.0, 62.0, 55.0, current=False)
        assert d.action == "hold" and d.fan_target == 0

    def test_missing_rh_fails_safe(self):
        """Stuck sensor must not silently stop airflow over hanging buds."""
        d = compute_drying_fan(None, 62.0, 55.0, current=True)
        assert d.action == "hold" and d.fan_target == 100
        assert d.reason == "rh_unavailable_fail_safe"


class TestDryingAlerts:
    def test_mold_risk_fires_above_65(self):
        last: dict[str, float] = {}
        out = drying_alerts(66.0, 45.0, 1000.0, last_alerts=last)
        assert out and out[0]["kind"] == "drying_mold_risk"
        # cooldown suppresses immediate re-fire
        assert drying_alerts(67.0, 45.0, 1100.0, last_alerts=last) == []
        # after cooldown fires again
        assert drying_alerts(67.0, 45.0, 1000.0 + 3601, last_alerts=last)

    def test_too_fast_fires_below_floor(self):
        out = drying_alerts(44.0, 45.0, 1000.0, last_alerts={})
        assert out and out[0]["kind"] == "drying_too_fast"

    def test_healthy_band_is_silent(self):
        assert drying_alerts(58.0, 45.0, 1000.0, last_alerts={}) == []


def _coordinator(stage: str, rh: float | None, fan_state: str = "off"):
    from custom_components.smartgrow.coordinator import SmartGrowCoordinator

    c = object.__new__(SmartGrowCoordinator)
    c.entry = MagicMock()
    c.entry.data = {
        "name": "Growbox 1",
        "fan_entity": "fan.f",
        "tent_temp_entity": "sensor.t",
        "tent_rh_entity": "sensor.rh",
        "lamp_entity": "light.lamp",
        "lamp_switch_entity": "switch.master",
    }
    c.entry.options = {}
    c.hass = MagicMock()
    states = {
        "fan.f": SimpleNamespace(state=fan_state),
        "light.lamp": SimpleNamespace(state="off"),
        "switch.master": SimpleNamespace(state="off"),
    }
    c.hass.states.get = lambda eid: states.get(eid)
    c.hass.services.async_call = AsyncMock()
    c.hass.add_job = lambda *a, **k: None
    from custom_components.smartgrow.logic.params import ControlParams

    ctl = ControlParams(
        drying_rh_on=62.0,
        drying_rh_off=55.0,
        drying_rh_floor=45.0,
        drying_lamp_off=True,
    )
    c.options_rt = SimpleNamespace(control=ctl, dry_run=False, notify_targets=[])
    c._current_stage = lambda: stage
    c._gather_inputs = lambda: SimpleNamespace(
        tent_temp=19.0,
        tent_rh=rh,
        lung_temp=19.0,
        lung_rh=rh,
        vpd=0.5,
        fan_pct=0,
        is_day=False,
        stage=stage,
    )
    c._apply_schedule = AsyncMock()
    c._wavemaker_tick = AsyncMock()
    c.last_inputs = None
    c.last_sample_ts = None
    c._drying_fan_demand = False
    c._drying_alerts = {}
    c._apply_lamp = AsyncMock()
    return c


@pytest.mark.asyncio
async def test_drying_branch_runs_fan_hysteresis():
    """stage=Drying + RH 58 (inside band) -> fan holds OFF, no VPD cascade."""
    c = _coordinator("Drying", rh=58.0)
    c.async_set_updated_data = lambda data: None
    await c._async_update_data()
    # fan off held, no turn_on dispatched
    c.hass.services.async_call.assert_not_called()


@pytest.mark.asyncio
async def test_drying_branch_turns_fan_on_above_threshold():
    c = _coordinator("Drying", rh=63.0, fan_state="off")
    c.async_set_updated_data = lambda data: None
    await c._async_update_data()
    args = c.hass.services.async_call.call_args_list
    assert any(call.args[0] == "fan" and call.args[1] == "turn_on" for call in args), args
    assert c._drying_fan_demand is True


@pytest.mark.asyncio
async def test_drying_branch_enforces_lamp_off():
    """Schedule/stray relights are overridden every tick while Drying."""
    c = _coordinator("Drying", rh=58.0)
    c.hass.states.get = lambda eid: {
        "fan.f": SimpleNamespace(state="off"),
        "light.lamp": SimpleNamespace(state="on"),  # someone turned it on
        "switch.master": SimpleNamespace(state="off"),
    }.get(eid)
    c.async_set_updated_data = lambda data: None
    await c._async_update_data()
    c._apply_lamp.assert_awaited_with(False)


@pytest.mark.asyncio
async def test_flowering_stage_skips_drying_branch():
    """Normal stages must NOT enter the drying controller."""
    c = _coordinator("Flowering", rh=58.0)
    c.async_set_updated_data = lambda data: None
    c.engine = MagicMock()
    c.engine.check_watchdog.return_value = True
    c.engine.adapted_params.side_effect = lambda base: base
    c.last_fan_ts = 0.0
    c.last_dehum_ts = 0.0
    c.dehum_on = False
    c.hum_on = False
    c.trace = []
    c._source = lambda key: ""
    c._record = lambda *a, **k: None
    c._apply_fan = AsyncMock()
    c._apply_dehum = AsyncMock()
    c._apply_hum = AsyncMock()
    c._check_legacy_automations = lambda: None
    c._dispatch_alerts = AsyncMock()
    c._current_stage = lambda: "Flowering"
    await c._async_update_data()
    c._apply_fan.assert_awaited()  # VPD law ran, not the drying hysteresis


def test_drying_dehum_decision_published():
    """The drying branch must OVERWRITE the dehum decision sensor with the
    drying_rh_band decision — a stale pre-boot VPD decision ('on'/below_band)
    made the card claim the dehum was running while it was off."""
    import inspect

    from custom_components.smartgrow.coordinator import SmartGrowCoordinator

    src = inspect.getsource(SmartGrowCoordinator)
    assert 'reason="drying_rh_band"' in src
    assert "last_dehum_decision = dehumid_control.DehumDecision(" in src
