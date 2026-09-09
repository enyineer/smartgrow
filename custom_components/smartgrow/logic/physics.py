"""Pure physics helpers for SmartGrow.

No Home Assistant imports — fully unit-testable. The formulas here are the
exact ones used by the production YAML automations (Magnus equation for
vapour pressure, derived absolute humidity and VPD).
"""

from __future__ import annotations

import math


def actual_vapor_pressure_hpa(
    temperature_c: float, relative_humidity_pct: float
) -> float:
    """Return the actual water-vapour pressure in hPa (Magnus formula).

    This reproduces the production template expression:

        es = 6.112 * (rh / 100) * exp((17.62 * t) / (243.12 + t))

    Note: despite the historical name ``es`` the expression includes the RH
    factor, so the result is the *actual* vapour pressure, not saturation.
    The name is kept to mirror the proven production formula.
    """
    rh = min(max(relative_humidity_pct, 0.0), 100.0)
    return (
        6.112
        * (rh / 100.0)
        * math.exp((17.62 * temperature_c) / (243.12 + temperature_c))
    )


def absolute_humidity_gm3(temperature_c: float, relative_humidity_pct: float) -> float:
    """Return absolute humidity in g/m^3 from the production template:

    ah = 216.7 * es / (273.15 + t)      # es in hPa
    """
    es = actual_vapor_pressure_hpa(temperature_c, relative_humidity_pct)
    return 216.7 * es / (273.15 + temperature_c)


def saturation_vapor_pressure_hpa(temperature_c: float) -> float:
    """Return saturation vapour pressure in hPa (Magnus, RH=100%)."""
    return 6.112 * math.exp((17.62 * temperature_c) / (243.12 + temperature_c))


def vpd_kpa(temperature_c: float, relative_humidity_pct: float) -> float:
    """Return air VPD in kPa.

    VPD = (svp - actual) / 10  (hPa -> kPa), equivalent to svp * (1 - rh/100).
    Used for cross-checking the recorded ``sensor.growbox_vpd`` template.
    """
    rh = min(max(relative_humidity_pct, 0.0), 100.0)
    svp = saturation_vapor_pressure_hpa(temperature_c)
    return (svp * (1.0 - rh / 100.0)) / 10.0
