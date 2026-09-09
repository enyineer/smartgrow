"""Unit tests for the adaptation engine (P1): oscillation, gain, transpiration."""

from __future__ import annotations

import pytest

from custom_components.smartgrow.adaptation import (
    GAIN_MIN_SAMPLES,
    TRANSPIRATION_MIN_SAMPLES,
    AdaptationEngine,
    GainEstimator,
    OscillationDetector,
    TranspirationModel,
)
from custom_components.smartgrow.logic.params import ControlParams

BASE = ControlParams()
T0 = 1_000_000.0


class TestOscillationDetector:
    def test_counts_flips_only_on_change(self) -> None:
        det = OscillationDetector()
        det.record(True, T0)
        assert det.record(True, T0 + 10) == 0
        assert det.record(False, T0 + 20) == 1
        assert det.record(False, T0 + 30) == 1
        assert det.record(True, T0 + 40) == 2

    def test_window_prunes_old_flips(self) -> None:
        det = OscillationDetector()
        day_s = 86400.0
        for i in range(10):
            det.record(i % 2 == 0, T0 + i * 3600)
        assert det.flips_per_24h(T0 + 9 * 3600) == 9
        # 25h later, all flips are out of the window
        assert det.flips_per_24h(T0 + 9 * 3600 + day_s + 3600) == 0


class TestGainEstimator:
    def test_needs_minimum_samples(self) -> None:
        est = GainEstimator()
        for i in range(GAIN_MIN_SAMPLES - 1):
            assert est.record(10.0 + i * 0.1, 1.0, T0 + i) is None
        assert est.samples and len(est.samples) == GAIN_MIN_SAMPLES - 1

    def test_factor_moves_toward_measured_sensitivity(self) -> None:
        est = GainEstimator()
        # Simulate a system twice as sensitive as the prior: dAH = 0.2 per fan%
        for i in range(200):
            fan = 10.0 + i * 0.5
            est.record(fan, 0.2 * fan, T0 + i)
        assert est.factor < 1.0  # should reduce gain to compensate
        assert 0.6 <= est.factor <= 1.0

    def test_degenerate_window_keeps_factor(self) -> None:
        est = GainEstimator()
        for i in range(GAIN_MIN_SAMPLES):
            est.record(5.0, 1.0, T0 + i)  # zero variance in fan
        assert est.factor == 1.0

    def test_non_positive_fan_ignored(self) -> None:
        est = GainEstimator()
        assert est.record(0.0, 1.0, T0) is None
        assert est.record(-1.0, 1.0, T0 + 1) is None
        assert not est.samples


class TestTranspirationModel:
    def test_mean_requires_min_samples(self) -> None:
        model = TranspirationModel()
        for i in range(TRANSPIRATION_MIN_SAMPLES - 1):
            model.record("day|Flowering", 1.5, T0 + i * 3600)
        assert model.mean_rate("day|Flowering") is None

    def test_mean_and_pre_boost(self) -> None:
        model = TranspirationModel()
        for i in range(TRANSPIRATION_MIN_SAMPLES + 5):
            model.record("day|Flowering", 2.0, T0 + i * 3600)
        assert model.mean_rate("day|Flowering") == pytest.approx(2.0)
        assert model.pre_boost("day|Flowering") == pytest.approx(2.0)

    def test_pre_boost_unlearned_is_zero(self) -> None:
        model = TranspirationModel()
        assert model.pre_boost("night|Seedling") == 0.0

    def test_seven_day_window_prunes(self) -> None:
        model = TranspirationModel()
        week = 7 * 86400.0
        for i in range(TRANSPIRATION_MIN_SAMPLES):
            model.record("day|Flowering", 2.0, T0 + i)
        model.record("day|Flowering", 2.0, T0 + week + 10)
        # old samples pruned, only the new one remains -> under min
        assert model.mean_rate("day|Flowering") is None

    def test_nonpositive_rate_ignored(self) -> None:
        model = TranspirationModel()
        model.record("day|Flowering", 0.0, T0)
        model.record("day|Flowering", -1.0, T0 + 1)
        assert model.buckets.get("day|Flowering") in (None, [])


class TestAdaptationEngine:
    def test_disabled_engine_records_nothing(self) -> None:
        engine = AdaptationEngine(enabled=False)
        assert engine.record_sensitivity(10.0, 1.0, T0) is None
        engine.record_moisture_input("day|Flowering", 2.0, T0)
        assert engine.transpiration.buckets == {}

    def test_pre_boost_respects_enabled(self) -> None:
        engine = AdaptationEngine(enabled=True)
        for i in range(TRANSPIRATION_MIN_SAMPLES + 1):
            engine.record_moisture_input("day|Flowering", 2.5, T0 + i)
        assert engine.pre_boost(True, "Flowering") > 0
        engine.enabled = False
        assert engine.pre_boost(True, "Flowering") == 0.0

    def test_force_recalibrate_resets_state(self) -> None:
        engine = AdaptationEngine()
        engine.widen = 0.04
        engine.gain.factor = 0.8
        result = engine.force_recalibrate(BASE)
        assert result["gain_samples_cleared"] is True
        assert engine.widen == 0.0
        assert engine.gain.factor == 1.0
        assert engine.confidence == 0.0
        assert any(h["param"] == "recalibrate" for h in engine.parameter_history)

    def test_adapted_value_attributes(self) -> None:
        engine = AdaptationEngine()
        attrs = engine.adapted_value("delta_gain", 35.0)
        assert attrs["adapted"] is False
        assert attrs["from_default"] == 35.0
        assert attrs["value"] == pytest.approx(35.0)
        engine.gain.factor = 1.1
        attrs = engine.adapted_value("delta_gain", 35.0)
        assert attrs["adapted"] is True
        assert attrs["value"] == pytest.approx(38.5)

    def test_snapshot_keys(self) -> None:
        engine = AdaptationEngine()
        snap = engine.snapshot()
        for key in (
            "enabled",
            "disabled_reason",
            "aggressiveness",
            "flips_24h",
            "hysteresis_widen_kpa",
            "delta_gain_factor",
            "gain_samples",
            "confidence",
            "transpiration_buckets",
            "parameter_history",
        ):
            assert key in snap

    def test_record_sensitivity_updates_confidence(self) -> None:
        engine = AdaptationEngine()
        for i in range(150):
            engine.record_sensitivity(10.0 + i * 0.2, 1.0, T0 + i)
        assert engine.confidence > 0
        assert engine.parameter_history
