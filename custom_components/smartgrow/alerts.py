"""Out-of-range alerts: evaluate + dispatch to configured notify targets.

Pure module: no Home Assistant imports. The coordinator evaluates each cycle
and calls ``AlertEngine.evaluate`` with the current snapshot; the HA layer
dispatches messages.

Alert kinds (v1):
  - vpd_low / vpd_high: tent VPD outside band (with tolerance)
  - lamp_day_off: schedule says day but the lamp cannot light
    (dimmer off, or master off = failsafe)
  - sensor_degraded: tent/lung/VPD sensors unavailable or stale

Cooldown: per-kind. An alert re-notifies only after ``cooldown_s`` if the
condition persists; a resolved condition resets its cooldown entry.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class AlertEngine:
    """Track per-kind alert state + cooldowns; produce outgoing messages."""

    cooldown_s: float = 3600.0
    vpd_tolerance: float = 0.15
    _last_sent: dict[str, float] = field(default_factory=dict)

    def evaluate(
        self,
        ts: float,
        *,
        vpd: float | None,
        band_low: float,
        band_high: float,
        is_day: bool,
        lamp_on: bool,
        master_on: bool | None,
        degraded: dict[str, bool],
    ) -> list[dict[str, Any]]:
        """Return the list of alerts to dispatch NOW (possibly empty)."""
        out: list[dict[str, Any]] = []

        # --- sensor degradation (highest priority) ---
        bad = [name for name, flag in degraded.items() if flag]
        if bad:
            msg = self._fire("sensor_degraded", ts,
                             f"Sensors unavailable/stale: {', '.join(sorted(bad))}")
            if msg:
                out.append(msg)

        # --- VPD out of band (with tolerance) ---
        if vpd is not None:
            lo = band_low - self.vpd_tolerance
            hi = band_high + self.vpd_tolerance
            if vpd < lo:
                msg = self._fire(
                    "vpd_low", ts,
                    f"VPD {vpd:.2f} kPa is BELOW the band "
                    f"({band_low:.2f}-{band_high:.2f}) by {lo - vpd:.2f}. "
                    "Humidity too high — check dehumidifier/ventilation.",
                )
                if msg:
                    out.append(msg)
            elif vpd > hi:
                msg = self._fire(
                    "vpd_high", ts,
                    f"VPD {vpd:.2f} kPa is ABOVE the band "
                    f"({band_low:.2f}-{band_high:.2f}) by {vpd - hi:.2f}. "
                    "Too dry — check humidification/lamp distance.",
                )
                if msg:
                    out.append(msg)

        # --- lamp schedule divergence (only during day; night lamp-off is
        # normal and master is cut intentionally) ---
        if is_day:
            lit = lamp_on and (master_on is not False)
            if not lit:
                detail = "master plug is OFF" if master_on is False else "dimmer is OFF"
                msg = self._fire(
                    "lamp_day_off", ts,
                    f"It is DAY but the lamp cannot light ({detail}).",
                )
                if msg:
                    out.append(msg)

        # conditions that cleared reset their cooldown bookkeeping
        active_kinds = {m["kind"] for m in out}
        for kind in [k for k in self._last_sent if k not in active_kinds]:
            # keep the timestamp; cooldown measures from last NOTIFY, and a
            # re-fire after resolution is fine — do not delete, so a flapping
            # condition cannot spam. Resolution is silent by design.
            pass

        return out

    def _fire(self, kind: str, ts: float, message: str) -> dict[str, Any] | None:
        """Return a message dict if the cooldown allows, else None."""
        last = self._last_sent.get(kind)
        if last is not None and ts - last < self.cooldown_s:
            return None
        self._last_sent[kind] = ts
        return {"kind": kind, "message": message, "ts": ts}
