"""Humidifier logic — mirror of the dehumidifier cascade.

Level-triggered with dead zone, for early-stage grows where seedlings/
clones need higher RH than the lung room provides.

    ON  if  lung_rh > wet_ceiling              (too dry floor mirror)
         or tent_vpd < high + 0.05 reversed? 

    Actually: humidifier ON raises RH, which LOWERS VPD. The band already
    handles the upper VPD bound. The humidifier should fire when VPD is
    ABOVE the band (too dry) — the same condition that drives the fan —
    but only when the fan alone cannot fix it (fan at max) or severity
    demands it. Mirror of dehum:

        ON  if  fan_pct >= sat_trigger and lung_rh <= ceiling - 3
             or vpd > high + severity        (severity backstop)
             or (hum_is_on and vpd > high + margin)  # hold while needed
        OFF if lung_rh > wet_ceiling          (over-wet ceiling)
             or vpd <= high + margin          (band reached)
        else: no change
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .params import ControlParams, SensorInputs


@dataclass(frozen=True, slots=True)
class HumidDecision:
    """Humidifier cascade outcome plus firing reasons."""

    action: str  # "on", "off", "no_change"
    reason: str
    lung_rh: float
    wet_ceiling: float
    sat_trigger: float
    band_high: float
    vpd_margin: float
    severity_depth: float
    fan_pct: float
    was_on: bool


def compute_humid(
    inputs: SensorInputs,
    params: ControlParams,
    hum_is_on: bool,
) -> HumidDecision:
    """Evaluate the humidifier cascade (mirror of dehum)."""
    high = params.band_high(inputs.stage, inputs.is_day)
    margin = params.hum_vpd_margin
    sat_trigger = params.hum_sat_trigger
    wet_ceiling = params.hum_wet_ceiling
    hysteresis = params.hum_hysteresis
    severity = params.hum_severity

    common: dict[str, Any] = dict(
        lung_rh=inputs.lung_rh,
        wet_ceiling=wet_ceiling,
        sat_trigger=sat_trigger,
        band_high=high,
        vpd_margin=margin,
        severity_depth=severity,
        fan_pct=inputs.fan_pct,
        was_on=hum_is_on,
    )

    # --- OFF conditions (mirroring YAML ordering) ---
    if inputs.lung_rh > wet_ceiling:
        return HumidDecision(action="off", reason="over_wet_ceiling", **common)
    if inputs.vpd <= high + margin:
        return HumidDecision(action="off", reason="band_reached", **common)

    # --- ON conditions ---
    if hum_is_on and inputs.vpd > high + margin:
        return HumidDecision(action="on", reason="hold_still_needed", **common)
    if inputs.fan_pct >= sat_trigger and inputs.lung_rh <= wet_ceiling - hysteresis:
        return HumidDecision(action="on", reason="saturation_assist", **common)
    if inputs.vpd > high + severity:
        return HumidDecision(action="on", reason="severity_backstop", **common)

    return HumidDecision(action="no_change", reason="dead_zone", **common)
