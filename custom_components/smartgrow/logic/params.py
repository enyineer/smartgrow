"""Stage band tables, tunable parameters and defaults for SmartGrow.

All values mirror the production YAML helpers as recorded on the box
(``input_select.growbox_stage``, ``sensor.growbox_vpd_ziel`` etc.).
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace

STAGES: tuple[str, ...] = ("Seedling", "Vegetative", "Flowering")

# VPD band *lows* (day, night) per stage. Highs are for display only.
STAGE_BANDS: dict[str, tuple[float, float]] = {
    "Seedling": (0.8, 0.6),
    "Vegetative": (1.1, 0.9),
    "Flowering": (1.5, 1.3),
}
STAGE_BANDS_HIGH: dict[str, tuple[float, float]] = {
    "Seedling": (1.1, 0.9),
    "Vegetative": (1.5, 1.3),
    "Flowering": (1.8, 1.6),
}

# max_temp (day, night): night = day - 3. min_temp (day, night).
STAGE_TEMP_MAX: dict[str, tuple[float, float]] = {
    "Seedling": (28.0, 25.0),
    "Vegetative": (29.0, 26.0),
    "Flowering": (28.0, 25.0),
}
STAGE_TEMP_MIN: dict[str, tuple[float, float]] = {
    "Seedling": (20.0, 20.0),
    "Vegetative": (19.0, 19.0),
    "Flowering": (20.0, 18.0),
}

DEFAULT_STAGE = "Flowering"


@dataclass(frozen=True, slots=True)
class ControlParams:
    """Every tunable the control law consumes.

    Defaults are the proven production values. Adaptation may rewrite the
    ``gain``/``threshold`` fields; the watchdog compares drift against this
    baseline.
    """

    # Fan floors (percent).
    fan_floor_day: float = 28.0
    fan_floor_night: float = 20.0

    # Fan gains.
    delta_gain: float = 35.0
    vpd_gain: float = 50.0
    need_gain: float = 200.0
    temp_gain: float = 25.0

    # Cold clamp multiplier.
    cold_clamp: float = 0.5

    # Dehumidifier cascade.
    dehum_sat_trigger: float = 70.0  # fan % that signals saturation assist
    dehum_dry_floor: float = 44.0  # lung RH below this -> over-dry, force OFF
    dehum_hysteresis: float = 3.0  # sat assist needs lung_rh >= floor + hysteresis
    dehum_vpd_margin: float = 0.05  # hysteresis guard just below the band low
    dehum_reengage: float = 0.05  # ON threshold offset above band low
    dehum_band_depth: float = 0.15  # OFF target depth into the band above low
    dehum_severity: float = 0.1

    # Humidifier cascade (mirror of dehum; for seedling/clone stages).
    hum_sat_trigger: float = 70.0
    hum_wet_ceiling: float = 70.0  # lung RH above this -> over-wet, force OFF
    hum_hysteresis: float = 3.0
    hum_vpd_margin: float = 0.05
    hum_severity: float = 0.1  # severity backstop depth below band low

    # VPD band overrides (0 = use stage default).
    band_low_day: float = 0.0
    band_low_night: float = 0.0

    # Adaptation (see adaptation.py).
    adaptation_enabled: bool = True
    adaptation_aggressiveness: float = 1.0

    def effective_band_low(self, stage: str, is_day: bool) -> float:
        """Return the active VPD band low (options override stage table)."""
        if is_day:
            default = STAGE_BANDS.get(stage, STAGE_BANDS[DEFAULT_STAGE])[0]
            override = self.band_low_day
        else:
            default = STAGE_BANDS.get(stage, STAGE_BANDS[DEFAULT_STAGE])[1]
            override = self.band_low_night
        return override if override else default

    def band_high(self, stage: str, is_day: bool) -> float:
        """Return the display band high for the stage/phase."""
        idx = 0 if is_day else 1
        return STAGE_BANDS_HIGH.get(stage, STAGE_BANDS_HIGH[DEFAULT_STAGE])[idx]

    def temp_max(self, stage: str, is_day: bool) -> float:
        """Return the max temperature setpoint for the stage/phase."""
        idx = 0 if is_day else 1
        return STAGE_TEMP_MAX.get(stage, STAGE_TEMP_MAX[DEFAULT_STAGE])[idx]

    def temp_min(self, stage: str, is_day: bool) -> float:
        """Return the min temperature setpoint for the stage/phase."""
        idx = 0 if is_day else 1
        return STAGE_TEMP_MIN.get(stage, STAGE_TEMP_MIN[DEFAULT_STAGE])[idx]

    def fan_floor(self, is_day: bool) -> float:
        """Return the minimum fan percentage for the phase."""
        return self.fan_floor_day if is_day else self.fan_floor_night

    def with_updates(self, **changes: float | bool) -> ControlParams:
        """Return a copy with adapted values applied (records nothing here)."""
        return replace(self, **changes)


@dataclass(frozen=True, slots=True)
class SensorInputs:
    """A snapshot of sensor readings, in native units.

    ``vpd`` is the tent VPD in kPa — in production this comes from the
    recorded template sensor; it is an input (not recomputed) so the port
    consumes exactly the same signal the proven automation consumed.
    """

    tent_temp: float
    tent_rh: float
    lung_temp: float
    lung_rh: float
    vpd: float
    fan_pct: float  # current fan output (demand signal for the dehum cascade)
    is_day: bool
    stage: str = DEFAULT_STAGE
    timestamp: float | None = None  # unix seconds, for adaptation bookkeeping


@dataclass(frozen=True, slots=True)
class AdaptedValue:
    """An adapted parameter with provenance, for entity attributes."""

    value: float
    default: float
    adapted: bool
    confidence: float
    reason: str


@dataclass(slots=True)
class AdaptationState:
    """Runtime adaptation state (options-store backed in the HA layer)."""

    hysteresis_widen: float = 0.0  # extra anti-churn margin, capped
    delta_gain_factor: float = 1.0  # measured sensitivity correction
    transpiration: dict[str, float] = field(
        default_factory=dict
    )  # "phase|stage" -> g/m3 h
    confidence: dict[str, float] = field(default_factory=dict)
    history: list[dict[str, float | str]] = field(default_factory=list)
    disabled_reason: str | None = None

    def adapted_params(self, base: ControlParams) -> ControlParams:
        """Apply adapted values onto ``base`` if within watchdog bounds."""
        if not base.adaptation_enabled:
            return base
        margin = base.dehum_vpd_margin + self.hysteresis_widen
        delta_gain = base.delta_gain * self.delta_gain_factor
        return base.with_updates(dehum_vpd_margin=margin, delta_gain=delta_gain)
