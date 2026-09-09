"""Property-based tests (hypothesis) for the SmartGrow control law."""

from __future__ import annotations

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from custom_components.smartgrow.logic import dehumid_control, fan_control
from custom_components.smartgrow.logic.params import ControlParams
from tests.conftest_logic import make_inputs

P = ControlParams()

temperatures = st.floats(min_value=5.0, max_value=40.0)
humidity = st.floats(min_value=20.0, max_value=99.0)
vpds = st.floats(min_value=0.1, max_value=4.0)
fans = st.floats(min_value=0.0, max_value=100.0)


@given(temperatures, humidity, temperatures, humidity, vpds, fans, st.booleans())
@settings(max_examples=300, deadline=None)
def test_fan_target_always_in_range(
    t_tent: float,
    rh_tent: float,
    t_lung: float,
    rh_lung: float,
    vpd: float,
    fan: float,
    is_day: bool,
) -> None:
    inputs = make_inputs(t_tent, rh_tent, t_lung, rh_lung, vpd, fan, is_day)
    d = fan_control.compute_fan(inputs, P)
    assert 0 <= d.fan_target <= 100


@given(temperatures, humidity, temperatures, vpds, fans, st.booleans())
@settings(max_examples=300, deadline=None)
def test_fan_monotonic_in_d_ah(
    t_tent: float,
    rh: float,
    t_lung: float,
    vpd: float,
    fan: float,
    is_day: bool,
) -> None:
    """A higher moisture gap never lowers the fan target."""
    rh_lung_low = max(rh - 20.0, 1.0)  # bigger gap
    inputs_low = make_inputs(t_tent, rh, t_lung, rh_lung_low, vpd, fan, is_day)
    inputs_high = make_inputs(t_tent, rh, t_lung, rh, vpd, fan, is_day)
    d_low = fan_control.compute_fan(inputs_low, P)
    d_high = fan_control.compute_fan(inputs_high, P)
    assert d_low.d_ah >= d_high.d_ah - 1e-9
    assert d_low.fan_target >= d_high.fan_target


@given(st.floats(min_value=5.0, max_value=35.0), humidity, vpds, st.booleans())
@settings(max_examples=300, deadline=None)
def test_cold_clamp_halves_humidity_terms_exactly(
    t: float,
    rh: float,
    vpd: float,
    is_day: bool,
) -> None:
    """Cold multiplies the VPD terms by exactly cold_clamp.

    Identical temperatures in both rooms keep ΔAH = 0, so the VPD terms are
    directly comparable between the cold and warm scenarios.
    """
    stage = "Flowering"
    min_temp = P.temp_min(stage, is_day)
    low = P.effective_band_low(stage, is_day)
    warm_t = min_temp + 5.0
    cold_t = min_temp - 5.0
    warm = make_inputs(warm_t, rh, warm_t, rh, vpd, 30.0, is_day)
    cold = make_inputs(cold_t, rh, cold_t, rh, vpd, 30.0, is_day)
    d_warm = fan_control.compute_fan(warm, P)
    d_cold = fan_control.compute_fan(cold, P)
    assert d_cold.cold is True
    assert d_warm.cold is False
    if vpd < low:
        expected_warm = max(0.0, low - vpd) * P.vpd_gain
        assert d_warm.fan_vpd_term == pytest.approx(expected_warm)
        assert d_cold.fan_vpd_term == pytest.approx(P.cold_clamp * expected_warm)


@given(temperatures, humidity, temperatures, humidity, vpds, fans, st.booleans())
@settings(max_examples=300, deadline=None)
def test_dehum_action_is_in_enum(
    t_tent: float,
    rh_tent: float,
    t_lung: float,
    rh_lung: float,
    vpd: float,
    fan: float,
    is_day: bool,
) -> None:
    inputs = make_inputs(t_tent, rh_tent, t_lung, rh_lung, vpd, fan, is_day)
    for on in (True, False):
        d = dehumid_control.compute_dehum(inputs, P, on)
        assert d.action in ("on", "off", "no_change")


@given(temperatures, humidity, temperatures, humidity, vpds, fans, st.booleans())
@settings(max_examples=300, deadline=None)
def test_dehum_never_on_when_over_dry(
    t_tent: float,
    rh_tent: float,
    t_lung: float,
    vpd: float,
    fan: float,
    is_day: bool,
    on: bool,
) -> None:
    """Lung RH below the dry floor always forces OFF, whatever else."""
    inputs = make_inputs(t_tent, rh_tent, t_lung, 30.0, vpd, fan, is_day)
    d = dehumid_control.compute_dehum(inputs, P, on)
    assert d.action == "off"
    assert d.reason == "over_dry_floor"


@given(vpds, fans, st.booleans())
@settings(max_examples=200, deadline=None)
def test_dead_zone_is_hysteretic(
    vpd: float,
    fan: float,
    is_day: bool,
) -> None:
    """No dead-zone violation: a state change requires crossing a margin.

    Inside the dead zone [low-severity, low-margin) with fan below the sat
    trigger and lung RH comfortable, the dehum never NEWLY switches ON from
    OFF (that would be churn); a hold-ON is fine (still-needed) only when
    vpd < low-margin strictly.
    """
    low = P.effective_band_low("Flowering", is_day)
    margin = P.dehum_vpd_margin
    severity = P.dehum_severity
    zone_lo = low - severity
    zone_hi = low - margin
    if zone_lo >= zone_hi or not (zone_lo <= vpd < zone_hi):
        return
    if fan >= P.dehum_sat_trigger:
        return
    inputs = make_inputs(24.0, 60, 22.0, 55.0, vpd, fan, is_day)
    d_off = dehumid_control.compute_dehum(inputs, P, dehum_is_on=False)
    assert d_off.action == "no_change"  # OFF state holds: no spurious ON


@given(temperatures, humidity, temperatures, humidity, vpds, fans, st.booleans())
@settings(max_examples=200, deadline=None)
def test_active_term_is_argmax(
    t_tent: float,
    rh_tent: float,
    t_lung: float,
    rh_lung: float,
    vpd: float,
    fan: float,
    is_day: bool,
) -> None:
    inputs = make_inputs(t_tent, rh_tent, t_lung, rh_lung, vpd, fan, is_day)
    d = fan_control.compute_fan(inputs, P)
    terms = {
        "delta": d.fan_delta_term,
        "vpd": d.fan_vpd_term,
        "temp": d.fan_temp_term,
        "min_fan": d.min_fan,
        "need": d.fan_need_term,
    }
    assert terms[d.active_term] == max(terms.values())
