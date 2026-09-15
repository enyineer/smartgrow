"""Master-plug radio flaps must not fire lamp_day_off alerts.

The MQTT master plug drops its connection briefly (~45 s) many times per
night. HA reports it 'unavailable'; the coordinator mapped that to False
("off") and the alert engine announced "master plug is OFF" — bogus (the
plug was never off, and v0.9.4 self-heal never even needed to act).
Unavailable now maps to None (unknown): alerts fire only on a REAL off.
"""
from custom_components.smartgrow.alerts import AlertEngine


def _engine():
    return AlertEngine()


def test_unavailable_master_does_not_alert():
    eng = _engine()
    # master_on=None is what the coordinator now reports for unavailable
    out = eng.evaluate(
        1000.0, vpd=1.55, band_low=1.5, band_high=1.65,
        is_day=True, lamp_on=True, master_on=None,
        degraded={},
    )
    assert not [m for m in out if m["kind"] == "lamp_day_off"]


def test_real_off_master_still_alerts():
    eng = _engine()
    out = eng.evaluate(
        1000.0, vpd=1.55, band_low=1.5, band_high=1.65,
        is_day=True, lamp_on=True, master_on=False,
        degraded={},
    )
    assert [m for m in out if m["kind"] == "lamp_day_off"]


def test_dark_dimmer_still_alerts():
    eng = _engine()
    out = eng.evaluate(
        1000.0, vpd=1.55, band_low=1.5, band_high=1.65,
        is_day=True, lamp_on=False, master_on=True,
        degraded={},
    )
    assert [m for m in out if m["kind"] == "lamp_day_off"]
