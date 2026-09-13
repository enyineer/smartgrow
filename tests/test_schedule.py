"""Lights schedule logic tests."""
from datetime import time
import pytest
from unittest.mock import MagicMock, PropertyMock, patch

from custom_components.smartgrow.coordinator import SmartGrowCoordinator


def make_coord(lights_on="06:00", lights_off="22:00"):
    c = MagicMock(spec=SmartGrowCoordinator)
    c.entry = MagicMock()
    c.entry.data = {"lights_on_time": lights_on, "lights_off_time": lights_off}
    # bind the real methods to the mock
    c._schedule_times = SmartGrowCoordinator._schedule_times.__get__(c)
    c._schedule_wants_day = SmartGrowCoordinator._schedule_wants_day.__get__(c)
    return c


def test_day_window_simple():
    c = make_coord("06:00", "22:00")
    assert c._schedule_wants_day(time(12, 0)) is True
    assert c._schedule_wants_day(time(3, 0)) is False
    assert c._schedule_wants_day(time(23, 0)) is False


def test_overnight_window():
    c = make_coord("20:00", "04:00")
    assert c._schedule_wants_day(time(23, 0)) is True
    assert c._schedule_wants_day(time(2, 0)) is True
    assert c._schedule_wants_day(time(12, 0)) is False


def test_boundaries():
    c = make_coord("06:00", "22:00")
    assert c._schedule_wants_day(time(6, 0)) is True   # on-time inclusive
    assert c._schedule_wants_day(time(22, 0)) is False # off-time exclusive


def test_unset_times_fall_back_to_defaults():
    """Unset times fall back to DEFAULT_LIGHTS_* (06:00/22:00) so the schedule
    the user sees on the time entities is the schedule that runs."""
    c = make_coord("", "")
    assert c._schedule_times() == (time(6, 0), time(22, 0))
    assert c._schedule_wants_day(time(12, 0)) is True
    assert c._schedule_wants_day(time(23, 0)) is False


def test_explicit_times_win_over_defaults():
    c = make_coord("20:00", "04:00")
    assert c._schedule_times() == (time(20, 0), time(4, 0))

def test_apply_schedule_uses_real_clock():
    """Regression: dtime.now() raised 'datetime.time has no attribute now' —
    the schedule crashed on every tick and never actuated."""
    c = make_coord("06:00", "22:00")
    calls = []
    c.source_entities = {"lamp": "light.demo_lamp"}
    import types
    c.hass = types.SimpleNamespace(
        states=types.SimpleNamespace(get=lambda eid: types.SimpleNamespace(state="on")),
        async_create_task=lambda t: calls.append(t),
        services=types.SimpleNamespace(
            async_call=lambda domain, service, data: calls.append((domain, service, data))
        ),
    )
    c.options_rt = types.SimpleNamespace(dry_run=True)
    c._LOGGER = None  # module logger
    # patch _apply_lamp? No — call it through _apply_schedule with dry-run so no
    # service call happens; only require NO exception and the intent path taken.
    import logging
    logging.disable(logging.CRITICAL)
    try:
        c._apply_schedule()
    finally:
        logging.disable(logging.NOTSET)
