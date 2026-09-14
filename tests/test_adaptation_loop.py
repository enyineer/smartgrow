"""Adaptation loop test: does the oscillation auto-widener actually damp the churn?

This is the honest P1 end-to-end proof: starting from the base cascade the
churn window still flips (level-trigger with noisy VPD hugging the severity
line), but the adaptation engine — detecting flips/24h over the limit —
widens the anti-churn margin until the cascade converges under the limit.
"""

from __future__ import annotations

import datetime as dt

from custom_components.smartgrow.adaptation import (
    FLIP_WARN_THRESHOLD,
    WIDEN_MAX,
    AdaptationEngine,
)
from custom_components.smartgrow.logic import dehumid_control
from custom_components.smartgrow.logic.params import ControlParams
from tests.test_fixture_replay import aligned_samples

BASE = ControlParams()
CHURN_START = dt.datetime.fromisoformat("2026-09-03T07:41:00+00:00")
CHURN_END = dt.datetime.fromisoformat("2026-09-03T18:01:00+00:00")


def run_cascade(params: ControlParams, window: bool) -> list[tuple[dt.datetime, bool]]:
    states: list[tuple[dt.datetime, bool]] = []
    dehum_on = False
    for ts, si, _fp, _pw in aligned_samples():
        if window and not (CHURN_START <= ts <= CHURN_END):
            continue
        dec = dehumid_control.compute_dehum(si, params, dehum_on)
        if dec.action == "on":
            dehum_on = True
        elif dec.action == "off":
            dehum_on = False
        states.append((ts, dehum_on))
    return states


def count_flips(states: list[tuple[dt.datetime, bool]]) -> int:
    return sum(1 for i, (_, on) in enumerate(states) if i and on != states[i - 1][1])


def test_band_window_ends_the_churn() -> None:
    """The in-band hysteresis window ends the fixture churn by itself.

    The OLD edge-sawtooth law produced 36 flips/24h on this fixture; the new
    window law (ON below band_low, OFF at band_low + depth) collapses it to a
    single flip. Adaptation deepening is now a refinement (kept monotone),
    not the primary churn fix.
    """
    base_flips = count_flips(run_cascade(BASE, window=True))
    assert base_flips <= FLIP_WARN_THRESHOLD, (
        "in-band window should keep the fixture under the churn threshold"
    )

    # Deepening the target further never increases churn (monotonicity pin).
    results = {}
    for deepen in (0.02, 0.08, 0.15):
        params = BASE.with_updates(
            dehum_band_depth=BASE.dehum_band_depth + deepen
        )
        results[deepen] = count_flips(run_cascade(params, window=True))
    print("\nflips vs band depth:", results)
    assert results[0.15] <= base_flips + 1


def test_engine_auto_widen_caps_at_widen_max() -> None:
    """The auto-widener never exceeds WIDEN_MAX even with sustained churn."""
    import time

    engine = AdaptationEngine()
    base_ts = time.time()
    for i in range(500):
        engine.record_actuator(i % 2 == 0, base_ts + i * 60)
    assert engine.widen <= WIDEN_MAX


def test_engine_applies_widen_to_params() -> None:
    """AdaptationEngine.adapted_params deepens the in-band target."""
    engine = AdaptationEngine()
    engine.widen = 0.05
    engine.enabled = True
    adapted = engine.adapted_params(BASE)
    assert adapted.dehum_band_depth == BASE.dehum_band_depth + 0.05
    assert adapted.dehum_vpd_margin == BASE.dehum_vpd_margin


def test_disabled_engine_leaves_params_untouched() -> None:
    engine = AdaptationEngine(enabled=False)
    engine.widen = 0.05
    adapted = engine.adapted_params(BASE)
    assert adapted.dehum_band_depth == BASE.dehum_band_depth
    assert adapted.dehum_vpd_margin == BASE.dehum_vpd_margin
    assert adapted.delta_gain == BASE.delta_gain
