"""Repairs issues for SmartGrow."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

WATCHDOG_ISSUE_ID = "adaptation_watchdog"
UNREACHABLE_BAND_ISSUE_ID = "unreachable_band"


async def async_create_watchdog_issue(
    hass: HomeAssistant, entry: ConfigEntry, reason: str | None
) -> None:
    """Raise a repair issue when the adaptation watchdog trips."""
    ir.async_create_issue(
        hass,
        DOMAIN,
        WATCHDOG_ISSUE_ID,
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key=WATCHDOG_ISSUE_ID,
        translation_placeholders={
            "reason": reason or "unknown",
            "entry_title": entry.title,
        },
    )


def async_check_unreachable_band(
    hass: HomeAssistant,
    entry: ConfigEntry,
    lung_rh: float,
    lung_temp: float,
    tent_temp: float,
) -> bool:
    """Detect a tent RH target below the lung-room achievable floor.

    The lesson from the night-band math: if the lung room already sits above
    the tent's implied RH floor, the tent can never reach the requested band
    and the dehumidifier would run forever. Raises an info repair issue when
    detected. Returns True if an issue was created.
    """
    from .logic.physics import absolute_humidity_gm3

    # Achievable tent RH given lung AH (isothermal approximation).
    ah_lung = absolute_humidity_gm3(lung_temp, lung_rh)
    achievable_rh = ah_lung / absolute_humidity_gm3(tent_temp, 100.0) * 100.0

    band_low = 1.3  # flowering night default; informational only
    opts = entry.options
    band_low_night = opts.get("band_low_night", 0.0) or band_low

    # If lung RH already exceeds ~65% and band requires tent below lung floor,
    # flag it: the cascade would hold the dehum ON with no reachable target.
    if lung_rh >= 65.0 and achievable_rh >= lung_rh - 5.0:
        ir.async_create_issue(
            hass,
            DOMAIN,
            UNREACHABLE_BAND_ISSUE_ID,
            is_fixable=False,
            severity=ir.IssueSeverity.INFO,
            translation_key=UNREACHABLE_BAND_ISSUE_ID,
            translation_placeholders={
                "lung_rh": f"{lung_rh:.0f}",
                "achievable_rh": f"{achievable_rh:.0f}",
                "band_low": f"{band_low_night:.1f}",
            },
        )
        return True
    return False


def async_delete_issues(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Clean up issues on entry removal."""
    ir.async_delete_issue(hass, DOMAIN, WATCHDOG_ISSUE_ID)
    ir.async_delete_issue(hass, DOMAIN, UNREACHABLE_BAND_ISSUE_ID)


def placeholder(_: dict[str, Any]) -> None:  # pragma: no cover
    """Kept for typing parity; not used."""
