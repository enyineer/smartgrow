"""Shared fixtures and helpers for the SmartGrow test suite."""

from __future__ import annotations

import csv
import datetime as dt
from pathlib import Path

from custom_components.smartgrow.logic.params import ControlParams, SensorInputs

FIXTURE_DIR = Path(__file__).parent / "fixtures"

ENTITY_ALIASES = {
    "temp_rh_sensor_temperature": "tent_temp",
    "temp_rh_sensor_humidity": "tent_rh",
    "0xa4c138be0ce5db67_temperature": "lung_temp",
    "0xa4c138be0ce5db67_humidity": "lung_rh",
    "growbox_vpd": "vpd",
    "growbox_vpd_ziel": "vpd_target",
    "growbox_phase": "phase",
    "dehumidifier_power": "dehum_power",
    "ec_luefter_percentage": "fan_pct",
    "growlampe_light_0": "lamp",
    "growbox_stage": "stage",
    "153931628935292_humidifier": "humidifier",
}


def load_series(name: str) -> list[tuple[dt.datetime, float | str]]:
    """Load a fixture CSV as a sorted list of (datetime, value)."""
    path = FIXTURE_DIR / f"{name}.csv"
    rows: list[tuple[dt.datetime, float | str]] = []
    with open(path, newline="") as fh:
        for rec in csv.DictReader(fh):
            ts = dt.datetime.fromisoformat(rec["ts"])
            raw = rec["state"]
            try:
                value: float | str = float(raw)
            except ValueError:
                value = raw
            rows.append((ts, value))
    rows.sort(key=lambda r: r[0])
    return rows


def load_all() -> dict[str, list[tuple[dt.datetime, float | str]]]:
    """Load all known fixture series into a dict keyed by friendly name."""
    out = {}
    for fname, friendly in ENTITY_ALIASES.items():
        candidates = [p for p in FIXTURE_DIR.glob(f"*{fname}*.csv")]
        if candidates:
            out[friendly] = load_series(candidates[0].name.replace(".csv", ""))
    return out


def value_at(
    series: list[tuple[dt.datetime, float | str]],
    ts: dt.datetime,
    max_age_s: float = 3600.0,
) -> float | str | None:
    """Last value at or before ts (None if older than max_age_s)."""
    best: float | str | None = None
    best_ts: dt.datetime | None = None
    for t, v in series:
        if t <= ts:
            best, best_ts = v, t
        else:
            break
    if best is None or best_ts is None:
        return None
    if (ts - best_ts).total_seconds() > max_age_s:
        return None
    return best


def phase_is_day(phase_value: str) -> bool:
    """Fixture phases are German: Tag = day."""
    return str(phase_value).strip().lower() == "tag"


def make_inputs(
    tent_temp: float,
    tent_rh: float,
    lung_temp: float,
    lung_rh: float,
    vpd: float,
    fan_pct: float,
    is_day: bool,
    stage: str = "Flowering",
) -> SensorInputs:
    """Convenience SensorInputs builder."""
    return SensorInputs(
        tent_temp=tent_temp,
        tent_rh=tent_rh,
        lung_temp=lung_temp,
        lung_rh=lung_rh,
        vpd=vpd,
        fan_pct=fan_pct,
        is_day=is_day,
        stage=stage,
    )


DEFAULT_PARAMS = ControlParams()
