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


def test_no_schedule():
    c = make_coord("", "")
    assert c._schedule_wants_day(time(12, 0)) is None
