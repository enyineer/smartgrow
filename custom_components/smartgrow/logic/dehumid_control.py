"""Dehumidifier cascade logic — exact port of the production YAML automation.

Pure module: no Home Assistant imports. Level-triggered with an intentional
dead zone (no change) between the OFF and ON conditions — that gap is the
proven anti-churn hysteresis and must NOT be closed.

Evaluated in production every 5 minutes and on changes.
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
    vpd_margin: float
    severity_depth: float
    fan_pct: float
    was_on: bool


def compute_dehum(
    inputs: SensorInputs,
    params: ControlParams,
    dehum_is_on: bool,
) -> DehumDecision:
    """Evaluate the level-triggered cascade exactly as the proven automation.

    Ported logic (dead zone intentional):

        OFF if  lung_rh < 44                    (over-dry floor)
             or tent_vpd >= low - 0.05          (band reached)
        ON  if  (dehum_is_on and vpd < low - 0.05)          # hold while needed
             or (fan_pct >= 70 and lung_rh >= floor + 3)      # saturation assist
             or vpd < low - 0.1                  # severity backstop (cold nights)
        else: no change (dead zone by design)
    """
    low = params.effective_band_low(inputs.stage, inputs.is_day)
    margin = params.dehum_vpd_margin
    sat_trigger = params.dehum_sat_trigger
    dry_floor = params.dehum_dry_floor
    hysteresis = params.dehum_hysteresis
    severity = params.dehum_severity

    common: dict[str, Any] = dict(
        lung_rh=inputs.lung_rh,
        dry_floor=dry_floor,
        sat_trigger=sat_trigger,
        band_low=low,
        vpd_margin=margin,
        severity_depth=severity,
        fan_pct=inputs.fan_pct,
        was_on=dehum_is_on,
    )

    # --- OFF conditions (checked first, mirroring the YAML ordering) ---
    if inputs.lung_rh < dry_floor:
        return DehumDecision(action="off", reason="over_dry_floor", **common)
    if inputs.vpd >= low - margin:
        return DehumDecision(action="off", reason="band_reached", **common)

    # --- ON conditions ---
    if dehum_is_on and inputs.vpd < low - margin:
        return DehumDecision(action="on", reason="hold_still_needed", **common)
    if inputs.fan_pct >= sat_trigger and inputs.lung_rh >= dry_floor + hysteresis:
        return DehumDecision(action="on", reason="saturation_assist", **common)
    if inputs.vpd < low - severity:
        return DehumDecision(action="on", reason="severity_backstop", **common)

    # --- dead zone: no change, by design ---
    return DehumDecision(action="no_change", reason="dead_zone", **common)
