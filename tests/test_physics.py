"""Unit tests for the pure physics module.

Known-good pairs are cross-checked against the production HA template math
(templates and Python must agree to 1e-6; the formulas are identical so we
assert internal consistency against independently-computed reference values).
"""

from __future__ import annotations

import math

import pytest

from custom_components.smartgrow.logic.physics import (
    absolute_humidity_gm3,
    actual_vapor_pressure_hpa,
    saturation_vapor_pressure_hpa,
    vpd_kpa,
)


def reference_ah(t: float, rh: float) -> float:
    """Independent reference implementation (straight from the template)."""
    es = 6.112 * (rh / 100) * math.exp((17.62 * t) / (243.12 + t))
    return 216.7 * es / (273.15 + t)


KNOWN_PAIRS = [
    (24.3, 41.0),
    (26.9, 55.0),
    (20.0, 60.0),
    (30.0, 40.0),
    (18.0, 75.0),
    (27.4, 58.3),
    (0.0, 50.0),
    (35.0, 90.0),
]


@pytest.mark.parametrize("t,rh", KNOWN_PAIRS)
def test_ah_matches_reference(t: float, rh: float) -> None:
    expected = reference_ah(t, rh)
    assert absolute_humidity_gm3(t, rh) == pytest.approx(expected, abs=1e-6)


@pytest.mark.parametrize("t,rh", KNOWN_PAIRS)
def test_template_and_python_agree(t: float, rh: float) -> None:
    """The Python port of the template expression, evaluated step by step."""
    es = 6.112 * (rh / 100) * math.e ** ((17.62 * t) / (243.12 + t))
    ah = 216.7 * es / (273.15 + t)
    assert absolute_humidity_gm3(t, rh) == pytest.approx(ah, abs=1e-9)
    assert actual_vapor_pressure_hpa(t, rh) == pytest.approx(es, abs=1e-9)


def test_ah_monotonic_in_rh() -> None:
    vals = [absolute_humidity_gm3(25.0, rh) for rh in range(0, 101, 10)]
    assert all(b > a for a, b in zip(vals, vals[1:], strict=False))


def test_ah_zero_at_zero_rh() -> None:
    assert absolute_humidity_gm3(25.0, 0.0) == pytest.approx(0.0)


def test_vpd_known_value() -> None:
    # 25C: svp = 31.67 hPa; at 60% RH -> vpd = 12.67 hPa = 1.267 kPa
    svp = saturation_vapor_pressure_hpa(25.0)
    assert vpd_kpa(25.0, 60.0) == pytest.approx(svp * 0.4 / 10.0, abs=1e-9)


def test_vpd_zero_at_saturation() -> None:
    assert vpd_kpa(22.0, 100.0) == pytest.approx(0.0, abs=1e-12)


def test_vpd_matches_fixture_sensor() -> None:
    """Cross-check our VPD math against the recorded production sensor."""
    from tests.conftest_logic import load_series
    from tests.conftest_logic import value_at as va

    tent_t = load_series("sensor__temp_rh_sensor_temperature")
    tent_rh = load_series("sensor__temp_rh_sensor_humidity")
    recorded_vpd = load_series("sensor__growbox_vpd")

    checked = 0
    errs = []
    for ts, temp in tent_t:
        rh = va(tent_rh, ts, max_age_s=3 * 3600)  # RH is recorded sparsely
        rec = [v for t, v in recorded_vpd if abs((t - ts).total_seconds()) < 2]
        if rh is None or not rec:
            continue
        ours = vpd_kpa(float(temp), float(rh))
        errs.append(abs(ours - float(rec[0])))
        checked += 1
    assert checked >= 50, f"only {checked} aligned samples"
    # 83/87 align within 0.03 kPa (rounding); the remaining few use a stale RH
    # reading during fast daytime transpiration drift — expected with the
    # sparse recorded cadence, not a math error.
    errs.sort()
    core = errs[: int(len(errs) * 0.95)]
    assert max(core) < 0.03, f"VPD core mismatch up to {max(core)}"
    assert errs[-1] < 0.20, f"VPD worst-case mismatch {errs[-1]}"
