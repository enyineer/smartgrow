"""Fan ("Vent Control") logic — exact port of the production YAML automation.

Pure module: no Home Assistant imports. Evaluated in production every
3 minutes and on sensor changes; the coordinator preserves that cadence.
"""

from __future__ import annotations

from dataclasses import dataclass

from .params import ControlParams, SensorInputs
from .physics import absolute_humidity_gm3


@dataclass(frozen=True, slots=True)
class FanDecision:
    """The fan decision plus every contributing term (for diagnostics)."""

    fan_target: int
    fan_delta_term: float
    fan_vpd_term: float
    fan_temp_term: float
    fan_need_term: float
    min_fan: float
    active_term: str  # which term won the max
    d_ah: float
    ah_tent: float
    ah_lung: float
    cold: bool
    cold_mult: float


def compute_fan(inputs: SensorInputs, params: ControlParams) -> FanDecision:
    """Compute the fan setpoint exactly as the proven automation does.

    Ported expression-for-expression from the production YAML:

        es = 6.112 * (rh/100) * e**((17.62*t)/(243.12+t))   # hPa
        ah = 216.7 * es / (273.15 + t)                      # g/m^3
        d_ah      = max(0, ah_tent - ah_lung)
        cold      = tent_temp < min_temp
        cold_mult = 0.5 if cold else 1.0
        fan_delta = d_ah * 35 * cold_mult
        fan_vpd   = max(0, low - vpd) * 50 * cold_mult
        fan_temp  = min(max(0, temp - (max_temp - 2)) * 25, 100)
        fan_need  = round((50 + (low - vpd) * 200) * cold_mult) if vpd < low else 0
        fan_target = int(min(max(fan_delta, fan_vpd, fan_temp, min_fan, fan_need), 100))
    """
    low = params.effective_band_low(inputs.stage, inputs.is_day)
    max_temp = params.temp_max(inputs.stage, inputs.is_day)
    min_temp = params.temp_min(inputs.stage, inputs.is_day)
    min_fan = params.fan_floor(inputs.is_day)

    ah_tent = absolute_humidity_gm3(inputs.tent_temp, inputs.tent_rh)
    ah_lung = absolute_humidity_gm3(inputs.lung_temp, inputs.lung_rh)

    d_ah = max(0.0, ah_tent - ah_lung)
    cold = inputs.tent_temp < min_temp
    cold_mult = params.cold_clamp if cold else 1.0

    fan_delta = d_ah * params.delta_gain * cold_mult
    fan_vpd = max(0.0, low - inputs.vpd) * params.vpd_gain * cold_mult
    fan_temp = min(
        max(0.0, inputs.tent_temp - (max_temp - 2.0)) * params.temp_gain, 100.0
    )
    if inputs.vpd < low:
        fan_need = round((50.0 + (low - inputs.vpd) * params.need_gain) * cold_mult)
    else:
        fan_need = 0.0

    fan_target = int(
        min(max(fan_delta, fan_vpd, fan_temp, float(min_fan), float(fan_need)), 100.0)
    )

    terms: dict[str, float] = {
        "delta": fan_delta,
        "vpd": fan_vpd,
        "temp": fan_temp,
        "min_fan": float(min_fan),
        "need": float(fan_need),
    }
    active_term = max(terms, key=lambda k: terms[k])

    return FanDecision(
        fan_target=fan_target,
        fan_delta_term=fan_delta,
        fan_vpd_term=fan_vpd,
        fan_temp_term=fan_temp,
        fan_need_term=float(fan_need),
        min_fan=min_fan,
        active_term=active_term,
        d_ah=d_ah,
        ah_tent=ah_tent,
        ah_lung=ah_lung,
        cold=cold,
        cold_mult=cold_mult,
    )
