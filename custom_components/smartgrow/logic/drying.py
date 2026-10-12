"""Drying-stage controller: RH hysteresis + lamp-off for the drying room.

While the stage select is ``Drying`` the plant is harvested and hanging:
transpiration is gone, VPD is meaningless, and the goals invert — the
exhaust fan exists ONLY to keep tent RH inside the 55-58 % drying window
(below 45 % dries too fast = hay; above 65 % = mold). Lamp must stay OFF.

The fan law for drying is a two-point hysteresis on tent RH:
  RH >= drying_rh_on (58 %)  -> exhaust + dehum ON (mold guard)
  RH <= drying_rh_off (55 %) -> exhaust OFF (0 %)
  in between                 -> hold previous output
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class DryingDecision:
    """One drying-cycle decision, mirroring fan/dehum decision shapes."""

    action: str  # "on" | "off" | "hold"
    fan_target: int  # 0 or 100
    reason: str
    tent_rh: float | None


def compute_drying_fan(
    tent_rh: float | None,
    rh_on: float,
    rh_off: float,
    current: bool,
) -> DryingDecision:
    """Hysteresis fan control for the drying stage.

    ``current`` is the fan's previous demand (True = running). Missing RH
    fails SAFE to the previous demand with a degraded reason — a stuck
    sensor must not silently stop airflow for hanging buds.
    """
    if tent_rh is None:
        return DryingDecision("hold", 100 if current else 0, "rh_unavailable_fail_safe", None)
    if tent_rh >= rh_on:
        return DryingDecision("on", 100, "rh_above_on_threshold", tent_rh)
    if tent_rh <= rh_off:
        return DryingDecision("off", 0, "rh_below_off_threshold", tent_rh)
    return DryingDecision(
        "hold",
        100 if current else 0,
        "inside_hysteresis_band",
        tent_rh,
    )


def drying_alerts(
    tent_rh: float | None,
    rh_floor: float,
    ts: float,
    *,
    last_alerts: dict[str, float],
    cooldown_s: float = 3600.0,
) -> list[dict[str, Any]]:
    """Drying-specific alerts: mold risk (high RH) + too-fast dry (low RH).

    ``last_alerts`` maps kind -> last notify ts (mutated like AlertEngine).
    """
    out: list[dict[str, Any]] = []
    if tent_rh is None:
        return out

    def fire(kind: str, message: str) -> None:
        last = last_alerts.get(kind)
        if last is not None and ts - last < cooldown_s:
            return
        last_alerts[kind] = ts
        out.append({"kind": kind, "message": message, "ts": ts})

    if tent_rh >= 65.0:
        fire(
            "drying_mold_risk",
            f"Drying RH {tent_rh:.0f}% >= 65% — mold risk on hanging buds. " "Increase exhaust/airflow now.",
        )
    elif tent_rh <= rh_floor:
        fire(
            "drying_too_fast",
            f"Drying RH {tent_rh:.0f}% <= {rh_floor:.0f}% — buds drying too "
            "fast (hay risk). Reduce exhaust airflow.",
        )
    return out
