"""Manual plug toggles must get the full run_s window.

User turns the wavemaker ON directly at the plug (outside the component's
interval schedule). The component observed the ON with a stale
_wavemaker_last_toggle and cut it within one tick - killing a manual run
seconds after it started. Now an externally-driven ON is adopted as the
start of a run: the component leaves it alone for the full run_s (120 s
default, user runs 120 s / 180 min interval).
"""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from custom_components.smartgrow.coordinator import SmartGrowCoordinator

CONF = {
    "wavemaker_entity": "switch.pump",
    "wavemaker_mode": "interval",
    "wavemaker_run_s": "120",
    "wavemaker_every_min": "180",
}


def _coordinator(state: str, last_toggle: float, seen_on: bool):
    c = object.__new__(SmartGrowCoordinator)
    c.entry = MagicMock()
    c.entry.data = CONF
    c.entry.options = {}
    c.hass = MagicMock()
    c.hass.states.get.return_value = SimpleNamespace(state=state)
    c.hass.async_create_task = _record_task
    c._wavemaker_last_toggle = last_toggle
    c._wavemaker_seen_on = seen_on
    c._async_switch = _noop_switch
    return c


async def _noop_switch(entity, turn_on):  # record-less stand-in
    return None


_TASKS = []


def _record_task(coro):
    _TASKS.append(coro)
    coro.close()
    return coro


@pytest.mark.parametrize("now", [1000.0])
def test_manual_on_is_adopted_not_killed(now):
    c = _coordinator("on", last_toggle=0.0, seen_on=False)
    with __import__("unittest").mock.patch("time.time", return_value=now):
        import asyncio
        asyncio.get_event_loop().run_until_complete(c._wavemaker_tick())
    # adopt: clock starts at `now`; NOT scheduled off immediately
    assert c._wavemaker_last_toggle == now


def test_manual_on_still_cut_after_run_s():
    """After run_s has elapsed since adoption, the component cuts it."""
    import asyncio
    c = _coordinator("on", last_toggle=1000.0 - 121, seen_on=True)
    with __import__("unittest").mock.patch("time.time", return_value=1000.0):
        asyncio.get_event_loop().run_until_complete(c._wavemaker_tick())
    # seen_on=True and past run_s -> scheduled off (task created)
    assert len(_TASKS) == 1
