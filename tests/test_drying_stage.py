"""Drying stage: controller + coordinator branch tests.

While the stage select is Drying:
  - the exhaust fan runs a 55-58% RH hysteresis (ON above, OFF below, hold in
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
        drying_rh_on=58.0,
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
    """stage=Drying + RH 56 (inside 55-58 band) -> fan holds OFF, no VPD
    cascade. (ON threshold is 58 since the mold-guard tightening.)"""
    c = _coordinator("Drying", rh=56.0)
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


def test_drying_branch_returns_result_instead_of_set_updated_data():
    """async_set_updated_data() inside _async_update_data re-enters the
    coordinator: it assigned data, then the outer `self.data = await ...`
    stored None — data was permanently None-ish and the phase sensor froze
    at 'unknown' while control kept working (v0.12.4-0.12.11 bug)."""
    import inspect

    from custom_components.smartgrow.coordinator import SmartGrowCoordinator

    src = inspect.getsource(SmartGrowCoordinator._async_update_data)
    assert "self.async_set_updated_data(" not in src


@pytest.mark.asyncio
async def test_dry_run_gates_drying_dehum_and_wavemaker():
    """Dry-run must gate EVERY drying actuation path.

    Live gap (2026-10): flipping dry-run ON in Drying still commanded the
    dehumidifier (direct service call, no gate) and the wavemaker force-off
    - the user asked for zero actuation after jarring and dry-run would
    have lied. The dehum decision still publishes; no service calls out.
    """
    c = _coordinator("Drying", rh=70.0, fan_state="off")  # RH above threshold
    c.options_rt.dry_run = True
    c._apply_lamp = AsyncMock()
    c._wavemaker_tick = AsyncMock()
    c.hass.states.get = lambda eid: {
        "fan.f": SimpleNamespace(state="off"),
        "light.lamp": SimpleNamespace(state="off"),
        "switch.master": SimpleNamespace(state="off"),
        "switch.umwalzpumpe": SimpleNamespace(state="on"),  # wm on
        "humidifier.h": SimpleNamespace(state="off"),
    }.get(eid)
    c.entry.data["wavemaker_entity"] = "switch.umwalzpumpe"
    c.entry.data["dehum_entity"] = "humidifier.h"
    c.last_dehum_decision = None
    await c._async_update_data()
    # fan turn_on gated:
    fan_calls = [call for call in c.hass.services.async_call.call_args_list if call.args[:2] == ("fan", "turn_on")]
    assert fan_calls == [], "dry-run must not command the fan"
    # dehum turn_on gated:
    humid_calls = [call for call in c.hass.services.async_call.call_args_list if call.args[0] == "humidifier"]
    assert humid_calls == [], "dry-run must not command the dehumidifier"
    # wavemaker force-off gated:
    wm_calls = [call for call in c.hass.services.async_call.call_args_list if call.args[:2] == ("switch", "turn_off")]
    assert wm_calls == [], "dry-run must not command the wavemaker"
    # decision still published (honest display):
    assert c.last_dehum_decision is not None
    assert c.last_dehum_decision.action == "on"  # WOULD be on, but wasn't commanded


@pytest.mark.asyncio
async def test_curing_stage_is_watch_only():
    """Stage 'Curing' = tent empty: NO actuation at all (fan, dehum, lamp
    schedule included), even at extreme RH. Cure is watched by the curing
    device, not the grow controller."""
    c = _coordinator("Curing", rh=80.0)  # absurd RH - still nothing commanded
    c.options_rt.dry_run = False
    c._apply_lamp = AsyncMock()
    c._apply_schedule = AsyncMock()
    c._wavemaker_tick = AsyncMock()
    c.hass.states.get = lambda eid: {
        "fan.f": SimpleNamespace(state="off"),
        "light.lamp": SimpleNamespace(state="off"),
        "switch.master": SimpleNamespace(state="off"),
        "humidifier.h": SimpleNamespace(state="off"),
    }.get(eid)
    c.entry.data["dehum_entity"] = "humidifier.h"
    c.last_dehum_decision = None
    await c._async_update_data()
    # NOTHING commanded:
    assert c.hass.services.async_call.call_args_list == [], "Curing stage must not actuate anything"
    # watch-only result published:
    assert c.last_inputs is not None


def test_curing_stage_in_select_options():
    from custom_components.smartgrow.const import STAGES

    assert "Curing" in STAGES


def test_band_tables_curing_falls_back():
    """Band lookups with stage 'Curing' must not KeyError (fallback defaults)."""
    from custom_components.smartgrow.logic.params import ControlParams

    p = ControlParams()
    assert p.effective_band_low("Curing", True) is not None
    assert p.band_high("Curing", False) is not None
    assert p.temp_max("Curing", True) is not None
