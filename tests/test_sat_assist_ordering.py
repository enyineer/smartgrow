"""Regression: the exact live failure Niggo caught on 2026-09-15.

Idle unit + VPD inside the window + boosted fan (>= 70%) + lung RH >=
floor + hysteresis: the dehumidifier must STAY OFF. The v0.9.0 ordering
evaluated saturation_assist before band_edge_guard, so the assist
restarted the unit immediately after every completed pull (20 cycles/24h,
running mid-band) — defeating the in-band hysteresis window.
"""
from custom_components.smartgrow.logic import dehumid_control
from custom_components.smartgrow.logic.params import ControlParams, SensorInputs

P = ControlParams()


def si(vpd, fan_pct, lung_rh):
    return SensorInputs(tent_temp=25.0, tent_rh=58.0, lung_temp=25.1,
                        lung_rh=lung_rh, vpd=vpd, fan_pct=fan_pct,
                        is_day=False, stage="Flowering")


def test_live_failure_case_stays_off():
    """The exact reported state: OFF, vpd 1.47, fan 72, lung 53 -> OFF."""
    d = dehumid_control.compute_dehum(si(1.47, 72, 53), P, dehum_is_on=False)
    assert d.action == "off"
    assert d.reason == "band_edge_guard"


def test_assist_still_fires_below_band():
    """Below band_low the assist keeps its original meaning."""
    d = dehumid_control.compute_dehum(si(1.25, 72, 53), P, dehum_is_on=False)
    assert d.action == "on"
    assert d.reason == "below_band"


def test_assist_fires_in_window_only_when_on():
    """ON unit inside the window holds (assist/hold semantics unchanged)."""
    d = dehumid_control.compute_dehum(si(1.40, 72, 53), P, dehum_is_on=True)
    assert d.action == "on"
    assert d.reason == "hold_to_depth"


def test_dry_floor_veto_still_first():
    """Over-dry lung veto wins regardless of everything else."""
    d = dehumid_control.compute_dehum(si(1.25, 90, 40), P, dehum_is_on=False)
    assert d.action == "off"
    assert d.reason == "over_dry_floor"


def test_window_exit_unchanged():
    """ON unit at/above target depth exits the window."""
    d = dehumid_control.compute_dehum(si(1.46, 50, 50), P, dehum_is_on=True)
    assert d.action == "off"
    assert d.reason == "target_depth_reached"
