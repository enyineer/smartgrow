"""Pure curing logic: jar evaluation for the SmartGrow Curing device.

No Home Assistant imports — fully unit-testable. A curing device owns NO
actuators: the entire job is watching jar temp/RH pairs against target
bands and reporting deviations.

Status semantics (mirror of the legacy template sensors, plus explicit
unavailable handling):
  ok          both readings inside band
  too_cold    temp < temp_min
  too_warm    temp > temp_max
  too_dry     rh < rh_min
  too_humid   rh > rh_max
  temp_only   humidity sibling missing/unavailable; temp in band
  rh_only     temperature sensor missing; rh in band
  unavailable both readings missing
Combined deviations report the WORST direction first (temp wins over rh —
temperature drives mold risk exponentially via equilibrium moisture).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# Jar statuses that should raise an alert
ALERT_STATUSES = frozenset({"too_cold", "too_warm", "too_dry", "too_humid", "unavailable"})


@dataclass(slots=True)
class JarReading:
    """One sample of one jar."""

    temp: float | None
    rh: float | None


@dataclass(slots=True)
class JarStatus:
    """Evaluation result for one jar."""

    name: str
    temp_entity: str
    rh_entity: str
    temp: float | None
    rh: float | None
    status: str
    reasons: list[str]

    def as_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "temp_entity": self.temp_entity,
            "rh_entity": self.rh_entity,
            "temp": self.temp,
            "rh": self.rh,
            "status": self.status,
            "reasons": list(self.reasons),
        }


def _status_for(
    temp: float | None,
    rh: float | None,
    temp_min: float,
    temp_max: float,
    rh_min: float,
    rh_max: float,
) -> tuple[str, list[str]]:
    """Map a (temp, rh) pair to a jar status + human reasons."""
    reasons: list[str] = []
    temp_bad: str | None = None
    rh_bad: str | None = None

    if temp is not None:
        if temp < temp_min:
            temp_bad = "too_cold"
            reasons.append(f"temp {temp:.1f} < {temp_min:.0f} °C")
        elif temp > temp_max:
            temp_bad = "too_warm"
            reasons.append(f"temp {temp:.1f} > {temp_max:.0f} °C")
    if rh is not None:
        if rh < rh_min:
            rh_bad = "too_dry"
            reasons.append(f"RH {rh:.0f}% < {rh_min:.0f}%")
        elif rh > rh_max:
            rh_bad = "too_humid"
            reasons.append(f"RH {rh:.0f}% > {rh_max:.0f}%")

    # Temperature deviation dominates (mold risk driver).
    if temp_bad:
        return temp_bad, reasons
    if rh_bad:
        return rh_bad, reasons
    if temp is None and rh is None:
        return "unavailable", ["sensor unavailable"]
    if rh is None:
        return "temp_only", ["humidity sibling missing"]
    if temp is None:
        return "rh_only", ["temperature missing"]
    return "ok", []


def evaluate_jar(
    name: str,
    temp_entity: str,
    rh_entity: str,
    reading: JarReading,
    *,
    temp_min: float,
    temp_max: float,
    rh_min: float,
    rh_max: float,
) -> JarStatus:
    """Evaluate one jar against the curing bands."""
    status, reasons = _status_for(reading.temp, reading.rh, temp_min, temp_max, rh_min, rh_max)
    return JarStatus(
        name=name,
        temp_entity=temp_entity,
        rh_entity=rh_entity,
        temp=reading.temp,
        rh=reading.rh,
        status=status,
        reasons=reasons,
    )


def worst_status(statuses: list[JarStatus]) -> str:
    """Aggregate status: worst of all jars, 'ok' when all fine."""
    rank = {
        "unavailable": 5,
        "too_cold": 4,
        "too_warm": 4,
        "too_dry": 3,
        "too_humid": 3,
        "temp_only": 1,
        "rh_only": 1,
        "ok": 0,
    }
    if not statuses:
        return "unavailable"
    return max(statuses, key=lambda s: rank.get(s.status, 5)).status


def alert_message(
    bad: list[JarStatus],
    *,
    temp_min: float,
    temp_max: float,
    rh_min: float,
    rh_max: float,
) -> str:
    """Human alert body for the out-of-band jars (legacy wording, English)."""
    lines: list[str] = []
    for j in bad:
        if j.temp is not None and j.rh is not None:
            lines.append(f"• {j.name}: {j.temp}°C, {j.rh}% RH — {', '.join(j.reasons)}")
        else:
            lines.append(f"• {j.name}: {', '.join(j.reasons)}")
    return (
        "Curing check — deviations detected:\n"
        + "\n".join(lines)
        + f"\nTargets: {temp_min:.0f}–{temp_max:.0f} °C, {rh_min:.0f}–{rh_max:.0f}% RH"
    )
