"""Dehumidifier cascade logic — in-band hysteresis window.

Pure module: no Home Assistant imports. Level-triggered with an intentional
hysteresis WINDOW *inside* the band: the dehumidifier switches ON when VPD
falls out of the band (below band_low) and switches OFF only when it has
pushed VPD to band_low + band_depth. The time-average therefore sits
*inside* the band instead of sawtoothing around its lower edge.

Evaluated in production every 5 minutes and on changes.

Guards (unchanged from the proven original):
    - over-dry floor: lung RH below dehum_dry_floor force-stops the unit
    - severity backstop: VPD below band_low - dehum_severity turns it on
      regardless of the window (cold nights)
    - saturation assist: fan at/above sat_trigger with lung RH at/above
      dry_floor + hysteresis assists drying
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .params import ControlParams, SensorInputs


@dataclass(frozen=True, slots=True)
class DehumDecision:
    """Cascade outcome plus the reasons that fired (for diagnostics)."""

    action: str  # "on", "off" or "no_change"
    reason: str
    lung_rh: float
    dry_floor: float
    sat_trigger: float
    band_low: float
    band_depth: float
    band_high: float  # OFF threshold = band_low + band_depth
    vpd_margin: float
    severity_depth: float
    fan_pct: float
    was_on: bool


def compute_dehum(
    inputs: SensorInputs,
    params: ControlParams,
    dehum_is_on: bool,
) -> DehumDecision:
    """Evaluate the in-band hysteresis cascade.

    OFF if  lung_rh < dry_floor                     (over-dry floor)
         or (dehum_is_on and vpd >= low + depth)    (target depth reached)
         or (not dehum_is_on and vpd >= low - margin)  (hysteresis guard)

    ON  if  (not dehum_is_on and vpd < low)         (fell out of band)
         or (dehum_is_on and vpd < low)             (hold until depth)
         or fan_pct >= sat_trigger and lung_rh >= floor + hysteresis
         or vpd < low - severity                    (severity backstop)

    else: no change (dead zone by design)
    """
    low = params.effective_band_low(inputs.stage, inputs.is_day)
    depth = params.dehum_band_depth
    margin = params.dehum_vpd_margin
    sat_trigger = params.dehum_sat_trigger
    dry_floor = params.dehum_dry_floor
    hysteresis = params.dehum_hysteresis
    severity = params.dehum_severity
    off_target = low + depth

    common: dict[str, Any] = dict(
        lung_rh=inputs.lung_rh,
        dry_floor=dry_floor,
        sat_trigger=sat_trigger,
        band_low=low,
        band_depth=depth,
        band_high=off_target,
        vpd_margin=margin,
        severity_depth=severity,
        fan_pct=inputs.fan_pct,
        was_on=dehum_is_on,
    )

    # --- OFF conditions (checked first, mirroring the YAML ordering) ---
    if inputs.lung_rh < dry_floor:
        return DehumDecision(action="off", reason="over_dry_floor", **common)
    if dehum_is_on and inputs.vpd >= off_target:
        return DehumDecision(action="off", reason="target_depth_reached", **common)

    # --- ON conditions ---
    if dehum_is_on and inputs.vpd < off_target:
        # Hold: keep running until the target depth inside the band.
        return DehumDecision(action="on", reason="hold_to_depth", **common)
    if inputs.vpd < low:
        return DehumDecision(action="on", reason="below_band", **common)
    if inputs.fan_pct >= sat_trigger and inputs.lung_rh >= dry_floor + hysteresis:
        return DehumDecision(action="on", reason="saturation_assist", **common)
    if not dehum_is_on and inputs.vpd >= low:
        # Idle inside the window without triggers: stay off (hysteresis).
        return DehumDecision(action="off", reason="band_edge_guard", **common)
    if inputs.vpd < low - severity:
        return DehumDecision(action="on", reason="severity_backstop", **common)

    # --- dead zone: no change, by design ---
    return DehumDecision(action="no_change", reason="dead_zone", **common)
