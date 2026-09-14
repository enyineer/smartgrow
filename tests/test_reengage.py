"""Regression: the re-engage offset (v0.9.3).

The window law originally re-engaged the dehumidifier only below band_low,
so the average coasted to the very edge of the band before each cycle.
The re-engage offset moves the ON threshold to band_low + dehum_reengage
(default 0.05) so the unit re-fires earlier and the average sits higher.
"""
from custom_components.smartgrow.logic import dehumid_control
from custom_components.smartgrow.logic.params import ControlParams, SensorInputs

P = ControlParams()  # night low 1.3, reengage 0.05 -> ON at <1.35, OFF at 1.45
NIGHT = dict(is_day=False, stage="Flowering")


def si(vpd, fan_pct=50, lung_rh=53):
    return SensorInputs(tent_temp=25.0, tent_rh=58.0, lung_temp=25.1,
                        lung_rh=lung_rh, vpd=vpd, fan_pct=fan_pct,
                        is_day=False, stage="Flowering")


def test_reengages_above_band_low():
    """Idle at 1.32 (above low, below low+reengage) -> ON."""
    d = dehumid_control.compute_dehum(si(1.32), P, dehum_is_on=False)
    assert d.action == "on"
    assert d.reason == "below_band"


def test_still_guards_above_reengage():
    """Idle at/above low+reengage -> stays off."""
    d = dehumid_control.compute_dehum(si(1.35), P, dehum_is_on=False)
    assert d.action == "off"
    assert d.reason == "band_edge_guard"
    d = dehumid_control.compute_dehum(si(1.40), P, dehum_is_on=False)
    assert d.action == "off"


def test_zero_reengage_restores_edge_trigger():
    """reengage=0 -> ON strictly below band_low (v0.9.0 behavior)."""
    p = P.with_updates(dehum_reengage=0.0)
    d = dehumid_control.compute_dehum(si(1.31), p, dehum_is_on=False)
    assert d.action == "off"
    d = dehumid_control.compute_dehum(si(1.29), p, dehum_is_on=False)
    assert d.action == "on"


def test_window_top_unchanged():
    """OFF target stays band_low + depth (1.45) while ON."""
    d = dehumid_control.compute_dehum(si(1.44), P, dehum_is_on=True)
    assert d.action == "on"
    assert d.reason == "hold_to_depth"
    d = dehumid_control.compute_dehum(si(1.45), P, dehum_is_on=True)
    assert d.action == "off"
    assert d.reason == "target_depth_reached"


def test_from_entry_reads_reengage():
    """RuntimeOptions.from_entry carries the reengage option."""
    from types import SimpleNamespace
    from custom_components.smartgrow.coordinator import RuntimeOptions

    entry = SimpleNamespace(
        entry_id="x",
        options={"dehum_reengage": 0.1, "dehum_band_depth": 0.2},
        data={},
    )
    ro = RuntimeOptions.from_entry(entry)
    assert ro.control.dehum_reengage == 0.1
    assert ro.control.dehum_band_depth == 0.2
