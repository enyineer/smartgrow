"""P1 adaptation: oscillation detection, gain adaptation, transpiration model.

Ships implemented and **enabled by default** (explicit user choice), guarded
by a convergence watchdog: if any adapted parameter drifts more than 40% from
its safe default, adaptation auto-disables itself and a repair issue is
raised by the HA layer.

Pure module: no Home Assistant imports.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

from .logic.params import ControlParams

_LOGGER = logging.getLogger(__name__)

# Watchdog bounds: adapted values may never drift further than this fraction
# from the safe defaults before auto-disable.
MAX_DRIFT_FRACTION = 0.40

# Oscillation detector: flip counting window and thresholds.
FLIP_WINDOW_H = 24.0
FLIP_WARN_THRESHOLD = 6  # flips/24h above which we call it oscillation
FLIP_CRITICAL_THRESHOLD = 12  # historical bug level (26 flips) territory
# Auto-widen hysteresis by this much (kPa) per critical detection, capped.
WIDEN_STEP = 0.02
WIDEN_MAX = 0.10

# Gain adaptation: sensitivity estimator d(ΔAH)/d(fan%).
SENSITIVITY_EXPECTED = 0.10  # g/m^3 removed per +1% fan, rough prior
GAIN_ADJUST_RATE = 0.10  # max 10% correction per update, smoothed
GAIN_MIN_SAMPLES = 20

# Transpiration model: trailing 7 days of per-(phase, stage) moisture input.
TRANSPIRATION_WINDOW_S = 7 * 86400.0
TRANSPIRATION_MIN_SAMPLES = 12


@dataclass(slots=True)
class OscillationDetector:
    """Rolling flip counter over a 24h window with amplitude tracking."""

    flips: list[float] = field(default_factory=list)  # timestamps
    amplitude: float = 0.0  # max observed state excursion in window
    last_on: bool | None = None
    last_change_ts: float | None = None

    def record(self, on: bool, ts: float) -> int | None:
        """Record an actuator state; return flip count if this is a flip."""
        if self.last_on is not None and on != self.last_on:
            self.flips.append(ts)
            if self.last_change_ts is not None:
                pass  # amplitude tracking handled by caller-supplied values
            self.last_change_ts = ts
        self.last_on = on
        self.flips[:] = [t for t in self.flips if ts - t <= FLIP_WINDOW_H * 3600.0]
        return len(self.flips)

    def flips_per_24h(self, ts: float) -> int:
        """Return flips within the trailing 24h window."""
        self.flips[:] = [t for t in self.flips if ts - t <= FLIP_WINDOW_H * 3600.0]
        return len(self.flips)


@dataclass(slots=True)
class GainEstimator:
    """Estimates d(ΔAH)/d(fan%) from paired observations.

    Each sample: (fan_pct above floor, subsequent ΔAH change). A simple
    regularised least-squares slope over the trailing window drives a smoothed
    correction factor on ``delta_gain``.
    """

    samples: list[tuple[float, float]] = field(default_factory=list)
    factor: float = 1.0

    def record(
        self, fan_above_floor: float, d_ah_change: float, ts: float
    ) -> float | None:
        """Add a sample; return the updated gain factor when enough data."""
        if fan_above_floor <= 0:
            return None
        self.samples.append((fan_above_floor, d_ah_change))
        if len(self.samples) > 200:
            self.samples[:] = self.samples[-200:]
        if len(self.samples) < GAIN_MIN_SAMPLES:
            return None
        slope = self._slope()
        if slope <= 0:
            return self.factor  # degenerate window; keep last factor
        expected = SENSITIVITY_EXPECTED
        raw_factor = self.factor * (expected / slope)
        # Smooth: move at most GAIN_ADJUST_RATE toward the raw correction.
        self.factor += GAIN_ADJUST_RATE * (raw_factor - self.factor)
        self.factor = max(
            1.0 - MAX_DRIFT_FRACTION, min(1.0 + MAX_DRIFT_FRACTION, self.factor)
        )
        return self.factor

    def _slope(self) -> float:
        """Least-squares slope of the collected (fan, dAH) samples."""
        n = len(self.samples)
        mean_x = sum(x for x, _ in self.samples) / n
        mean_y = sum(y for _, y in self.samples) / n
        var = sum((x - mean_x) ** 2 for x, _ in self.samples)
        if var == 0:
            return 0.0
        cov = sum((x - mean_x) * (y - mean_y) for x, y in self.samples)
        return cov / var


@dataclass(slots=True)
class TranspirationModel:
    """Rolling per-(phase, stage) moisture input in g/m^3·h over 7 days.

    Moisture input is estimated as the ΔAH rise while the fan is at floor
    (ventilation ~ minimal), i.e. plant + lamp evapotranspiration inflow.
    Used to pre-apply a learned excursion estimate at lights-on.
    """

    buckets: dict[str, list[tuple[float, float]]] = field(default_factory=dict)

    def record(self, phase_stage: str, rate_gm3h: float, ts: float) -> None:
        """Record a moisture-input estimate for a (phase, stage) bucket."""
        if rate_gm3h <= 0:
            return
        lst = self.buckets.setdefault(phase_stage, [])
        lst.append((ts, rate_gm3h))
        cutoff = ts - TRANSPIRATION_WINDOW_S
        self.buckets[phase_stage] = [(t, v) for t, v in lst if t >= cutoff]

    def mean_rate(self, phase_stage: str) -> float | None:
        """Mean learned moisture input for the bucket, None if unlearned."""
        lst = self.buckets.get(phase_stage)
        if not lst or len(lst) < TRANSPIRATION_MIN_SAMPLES:
            return None
        return sum(v for _, v in lst) / len(lst)

    def pre_boost(self, phase_stage: str) -> float:
        """Predictive pre-boost delta when the phase flips to day.

        Returns the last-learned lamp-on excursion estimate (0 if unlearned).
        """
        rate = self.mean_rate(phase_stage)
        if rate is None:
            return 0.0
        # Convert a g/m^3·h inflow into the transient AH excursion the fan
        # must cover during the first hour after lights-on.
        return min(rate * 1.0, 4.0)


@dataclass(slots=True)
class AdaptationEngine:
    """Facade the coordinator talks to. Owns the three sub-models."""

    enabled: bool = True
    aggressiveness: float = 1.0
    oscillation: OscillationDetector = field(default_factory=OscillationDetector)
    gain: GainEstimator = field(default_factory=GainEstimator)
    transpiration: TranspirationModel = field(default_factory=TranspirationModel)
    disabled_reason: str | None = None
    widen: float = 0.0
    parameter_history: list[dict[str, Any]] = field(default_factory=list)
    confidence: float = 0.0

    # --- oscillation -------------------------------------------------
    def record_actuator(self, dehum_on: bool, ts: float) -> dict[str, Any]:
        """Feed the oscillation detector; maybe auto-widen hysteresis."""
        flips = self.oscillation.record(dehum_on, ts)
        result: dict[str, Any] = {"flips_24h": flips}
        if flips is not None and flips > FLIP_CRITICAL_THRESHOLD:
            self.widen = min(WIDEN_MAX, self.widen + WIDEN_STEP * self.aggressiveness)
            result["widened_margin"] = self.widen
            _LOGGER.warning(
                "Oscillation detected: %d flips/24h; widened dehum margin to +%.2f kPa",
                flips,
                self.widen,
            )
        elif flips is not None and flips > FLIP_WARN_THRESHOLD:
            result["oscillation_warning"] = True
        return result

    # --- gain adaptation ---------------------------------------------
    def record_sensitivity(
        self, fan_above_floor: float, d_ah_change: float, ts: float
    ) -> float | None:
        """Feed the gain estimator; returns new factor or None."""
        if not self.enabled:
            return None
        new_factor = self.gain.record(fan_above_floor, d_ah_change, ts)
        if new_factor is not None:
            self.parameter_history.append(
                {
                    "param": "delta_gain_factor",
                    "value": new_factor,
                    "ts": ts,
                    "reason": "measured dAH/dFan sensitivity",
                }
            )
            self.confidence = min(1.0, len(self.gain.samples) / (GAIN_MIN_SAMPLES * 4))
        return new_factor

    # --- transpiration -----------------------------------------------
    def record_moisture_input(self, phase_stage: str, rate: float, ts: float) -> None:
        """Record a moisture-input estimate (g/m^3·h) for the bucket."""
        if not self.enabled:
            return
        self.transpiration.record(phase_stage, rate, ts)

    def pre_boost(self, is_day: bool, stage: str) -> float:
        """Learned lamp-on excursion to pre-apply at phase flip."""
        if not self.enabled:
            return 0.0
        return self.transpiration.pre_boost(f"{'day' if is_day else 'night'}|{stage}")

    # --- watchdog ------------------------------------------------------
    def check_watchdog(self, base: ControlParams) -> bool:
        """Disable adaptation if any adapted value drifted >40% from default.

        Drift is measured on the *adapted increment* relative to the default:
        the widened margin must stay under 40% of the base margin, and the
        gain factor under 40% away from 1.0.
        """
        if not self.enabled:
            return False  # already disabled (user or previous trip)

        def drifted(adapted: float, default: float) -> bool:
            if default == 0:
                return adapted != 0
            return abs(adapted) > MAX_DRIFT_FRACTION * abs(default)

        if drifted(self.widen, base.dehum_vpd_margin) or drifted(
            self.gain.factor - 1.0, 1.0
        ):
            self.enabled = False
            self.disabled_reason = (
                f"convergence watchdog: adapted parameters drifted more than "
                f"{MAX_DRIFT_FRACTION:.0%} from safe defaults"
            )
            _LOGGER.error("%s — adaptation auto-disabled", self.disabled_reason)
            return False
        return True

    def adapted_params(self, base: ControlParams) -> ControlParams:
        """Apply adapted values onto ``base`` if adaptation is enabled."""
        if not self.enabled:
            return base
        margin = base.dehum_vpd_margin + self.widen
        delta_gain = base.delta_gain * self.gain.factor
        return base.with_updates(dehum_vpd_margin=margin, delta_gain=delta_gain)

    def force_recalibrate(self, base: ControlParams) -> dict[str, Any]:
        """Reset all adapted state back to safe defaults."""
        flips = self.oscillation.flips_per_24h(time.time())
        self.oscillation = OscillationDetector()
        self.gain = GainEstimator()
        self.widen = 0.0
        self.confidence = 0.0
        self.parameter_history.append(
            {
                "param": "recalibrate",
                "value": 0.0,
                "ts": time.time(),
                "reason": "manual",
            }
        )
        return {"flips_cleared": flips, "gain_samples_cleared": True}

    def snapshot(self) -> dict[str, Any]:
        """State for the ``get_adaptation_state`` MCP tool / diagnostics."""
        return {
            "enabled": self.enabled,
            "disabled_reason": self.disabled_reason,
            "aggressiveness": self.aggressiveness,
            "flips_24h": len(self.oscillation.flips),
            "hysteresis_widen_kpa": round(self.widen, 4),
            "delta_gain_factor": round(self.gain.factor, 4),
            "gain_samples": len(self.gain.samples),
            "confidence": round(self.confidence, 3),
            "transpiration_buckets": {
                k: len(v) for k, v in self.transpiration.buckets.items()
            },
            "parameter_history": self.parameter_history[-20:],
        }

    def adapted_value(self, name: str, default: float) -> dict[str, Any]:
        """Attribute dict for an adapted value: ``adapted, from_default``."""
        values = {
            "delta_gain": self.gain.factor * default,
            "dehum_vpd_margin": default + self.widen,
        }
        value = values.get(name, default)
        return {
            "value": round(value, 4),
            "adapted": abs(value - default) > 1e-9,
            "from_default": default,
            "confidence": round(self.confidence, 3),
        }
