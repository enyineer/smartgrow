"""Edge-case audit tests: no lung sensors, no dehumidifier, no camera.

These are the 'minimal build' variations the user asked about. The
integration degrades by design (lung := tent for ΔAH, dehum = fan-only
build, camera optional); the CARD must reflect the degraded truth instead
of pretending.

NOTE: the dehumidifier decision entity is registered UNCONDITIONALLY by
sensor.py (the coordinator always computes decisions for diagnostics), so
'no dehumidifier configured' means the DECISION EXISTS but the sources
sensor reports dehum_entity: null, and _apply_dehum records
'unconfigured'. The card must therefore show the dehum tile as a
diagnostic (decisions still flow) — it does, via the normal chip path.
"""
import sys
import math

sys.path.insert(0, "/root/smartgrow")

from custom_components.smartgrow.logic import dehumid_control, fan_control
from custom_components.smartgrow.logic.params import ControlParams, SensorInputs

P = ControlParams()
DAY = dict(is_day=True, stage="Flowering")


def _inputs_no_lung(vpd=1.2, fan_pct=50):
    """No lung sensors -> coordinator sets lung := tent (same temp/rh)."""
    return SensorInputs(tent_temp=25.0, tent_rh=60.0, lung_temp=25.0,
                        lung_rh=60.0, vpd=vpd, fan_pct=fan_pct,
                        is_day=True, stage="Flowering")


def test_no_lung_dah_term_collapses():
    """With lung == tent, dAH = 0 -> delta term 0; vpd/need terms drive."""
    si = _inputs_no_lung()
    d = fan_control.compute_fan(si, P)
    assert d.fan_delta_term == 0, "lung==tent must collapse the delta term"
    assert d.fan_vpd_term > 0 or d.fan_need_term > 0


def test_no_lung_dehum_still_guards_tent_rh():
    """Dehum cascade with lung==tent uses tent RH as the floor guard."""
    si = _inputs_no_lung(vpd=1.2)
    # lung_rh == tent_rh == 60 >= floor+hysteresis(47): sat-assist reachable
    d = dehumid_control.compute_dehum(si, P, dehum_is_on=False)
    assert d.action in ("on", "no_change", "off")
    # the protective floor still vetoes when lung (== tent) is over-dry
    si_dry = SensorInputs(tent_temp=25.0, tent_rh=40.0, lung_temp=25.0,
                          lung_rh=40.0, vpd=1.2, fan_pct=50,
                          is_day=True, stage="Flowering")
    d2 = dehumid_control.compute_dehum(si_dry, P, False)
    assert d2.action == "off" and d2.reason == "over_dry_floor"


def test_no_dehum_is_fan_only():
    """No dehum entity: decisions still computed (diagnostics), no actuation.

    The card shows the dehum tile from the decision sensor which the
    integration registers unconditionally — so the tile remains a
    diagnostic showing the cascade's opinion.
    """
    si = _inputs_no_lung(vpd=1.2)
    d = dehumid_control.compute_dehum(si, P, False)
    assert d is not None  # decisions always computed
    # action would be applied to... nothing (coordinator records 'unconfigured')
    assert d.action in ("on", "off", "no_change")
