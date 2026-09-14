"""Regression: alert engine + notify target dispatch (v0.9.5)."""
from custom_components.smartgrow.alerts import AlertEngine


def _eng(**kw):
    return AlertEngine(**kw)


def test_vpd_low_fires():
    eng = _eng(vpd_tolerance=0.15, cooldown_s=3600)
    out = eng.evaluate(ts=0.0, vpd=1.10, band_low=1.3, band_high=1.6,
                       is_day=False, lamp_on=False, master_on=None,
                       degraded={})
    assert len(out) == 1 and out[0]["kind"] == "vpd_low"


def test_vpd_within_tolerance_is_silent():
    eng = _eng(vpd_tolerance=0.15, cooldown_s=3600)
    out = eng.evaluate(ts=0.0, vpd=1.20, band_low=1.3, band_high=1.6,
                       is_day=False, lamp_on=False, master_on=None,
                       degraded={})
    assert out == []


def test_vpd_high_fires():
    eng = _eng(vpd_tolerance=0.15, cooldown_s=3600)
    out = eng.evaluate(ts=0.0, vpd=1.80, band_low=1.3, band_high=1.6,
                       is_day=True, lamp_on=True, master_on=True,
                       degraded={})
    assert out[0]["kind"] == "vpd_high"


def test_cooldown_suppresses_repeat():
    eng = _eng(vpd_tolerance=0.15, cooldown_s=3600)
    a = eng.evaluate(ts=0, vpd=1.0, band_low=1.3, band_high=1.6,
                     is_day=False, lamp_on=False, master_on=None, degraded={})
    assert a
    b = eng.evaluate(ts=1800, vpd=1.0, band_low=1.3, band_high=1.6,
                     is_day=False, lamp_on=False, master_on=None, degraded={})
    assert b == []  # within cooldown
    c = eng.evaluate(ts=3700, vpd=1.0, band_low=1.3, band_high=1.6,
                     is_day=False, lamp_on=False, master_on=None, degraded={})
    assert c  # cooldown elapsed -> re-alert


def test_day_with_dark_lamp_fires():
    eng = _eng()
    out = eng.evaluate(ts=0, vpd=1.4, band_low=1.3, band_high=1.6,
                       is_day=True, lamp_on=True, master_on=False,
                       degraded={})
    assert out[0]["kind"] == "lamp_day_off"


def test_night_dark_lamp_is_silent():
    eng = _eng()
    out = eng.evaluate(ts=0, vpd=1.4, band_low=1.3, band_high=1.6,
                       is_day=False, lamp_on=False, master_on=False,
                       degraded={})
    assert out == []


def test_degraded_sensor_fires():
    eng = _eng()
    out = eng.evaluate(ts=0, vpd=None, band_low=1.3, band_high=1.6,
                       is_day=False, lamp_on=False, master_on=None,
                       degraded={"lung": True})
    assert out[0]["kind"] == "sensor_degraded"
