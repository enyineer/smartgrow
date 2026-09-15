"""The night-transition tick must not fire lamp_day_off.

On the tick where the schedule turns the lamp off, _gather_inputs ran
BEFORE _apply_schedule, so inputs.is_day was still True (lamp was on).
_dispatch_alerts then re-read the now-off lamp and announced
"It is DAY but the lamp cannot light" at every lights_off transition.
Day-ness for the lamp alert must come from the SCHEDULE verdict evaluated
at dispatch time, not from the stale inputs snapshot.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock

from custom_components.smartgrow.alerts import AlertEngine
from custom_components.smartgrow.coordinator import SmartGrowCoordinator


def _engine():
    return AlertEngine()


def test_engine_semantics_unchanged():
    """The engine itself keeps firing when told is_day=True + lamp dark."""
    out = _engine().evaluate(
        1000.0, vpd=1.55, band_low=1.5, band_high=1.65,
        is_day=True, lamp_on=False, master_on=True, degraded={},
    )
    assert [m for m in out if m["kind"] == "lamp_day_off"]


def test_dispatch_uses_schedule_day_not_stale_inputs():
    """Coordinator passes the schedule verdict, not inputs.is_day.

    Simulated: inputs.is_day=True (gathered pre-flip) while the schedule
    verdict is now night -> the alert must NOT fire.
    """
    c = object.__new__(SmartGrowCoordinator)
    c.alerts = _engine()
    c.options_rt = SimpleNamespace(notify_targets=[])
    c.entry = MagicMock()
    c.entry.data = {"name": "Growbox 1", "fan_entity": "fan.f",
                    "tent_temp_entity": "sensor.t", "tent_rh_entity": "sensor.rh"}
    c.entry.options = {}
    # schedule verdict: night (returns False)
    c._schedule_wants_day = lambda t: False
    c.hass = MagicMock()

    fired = []

    class SpyEngine(AlertEngine):
        def evaluate(self, *a, **kw):
            fired.append(kw.get("is_day"))
            return []

    c.alerts = SpyEngine()
    import asyncio
    asyncio.get_event_loop().run_until_complete(
        c._dispatch_alerts(
            1000.0,
            SimpleNamespace(stage="Flowering", is_day=True, vpd=1.55),
            SimpleNamespace(
                effective_band_low=lambda s, d: 1.5,
                band_high=lambda s, d: 1.65,
            ),
            {"degraded": {}},
        )
    )
    # the engine received the schedule's verdict (False), not the stale
    # inputs.is_day (True)
    assert fired == [False], fired
