"""Unit tests for the humidifier cascade law (mirror of the dehum law).

compute_humid had zero direct coverage despite being live logic; these pin
every branch: wet-ceiling veto, band-reached OFF, hold, saturation assist,
severity backstop and the dead zone.
"""

from __future__ import annotations

from custom_components.smartgrow.logic import humid_control
from custom_components.smartgrow.logic.params import ControlParams
from tests.conftest_logic import make_inputs

P = ControlParams()
DAY = dict(is_day=True, stage="Flowering")


def _hum(vpd: float, lung_rh: float, fan_pct: float, hum_is_on: bool):
    """Build inputs at comfortable temps and run compute_humid."""
    inputs = make_inputs(24.0, 45, 22.0, lung_rh, vpd, fan_pct, **DAY)
    return humid_control.compute_humid(inputs, P, hum_is_on=hum_is_on)


class TestHumidControl:
    def test_off_over_wet_ceiling(self) -> None:
        """Lung RH above the wet ceiling vetoes humidification entirely."""
        d = _hum(vpd=1.9, lung_rh=P.hum_wet_ceiling + 5, fan_pct=40, hum_is_on=True)
        assert d.action == "off"
        assert d.reason == "over_wet_ceiling"

    def test_off_when_band_reached(self) -> None:
        """VPD inside the band (<= high + margin): nothing to humidify."""
        high = P.band_high("Flowering", True)
        d = _hum(vpd=high + P.hum_vpd_margin, lung_rh=45, fan_pct=40, hum_is_on=True)
        assert d.action == "off"
        assert d.reason == "band_reached"

    def test_hold_still_needed(self) -> None:
        """ON unit stays ON while VPD remains above the band ceiling."""
        high = P.band_high("Flowering", True)
        d = _hum(
            vpd=high + P.hum_vpd_margin + 0.1,
            lung_rh=45,
            fan_pct=40,
            hum_is_on=True,
        )
        assert d.action == "on"
        assert d.reason == "hold_still_needed"

    def test_saturation_assist(self) -> None:
        """Saturated fan + RH below ceiling minus hysteresis assists ON."""
        high = P.band_high("Flowering", True)
        d = _hum(
            vpd=high + P.hum_vpd_margin + 0.1,
            lung_rh=P.hum_wet_ceiling - P.hum_hysteresis - 1,
            fan_pct=P.hum_sat_trigger + 1,
            hum_is_on=False,
        )
        assert d.action == "on"
        assert d.reason == "saturation_assist"

    def test_saturation_assist_needs_rh_headroom(self) -> None:
        """Same fan saturation but RH too close to the ceiling: no ASSIST.

        The assist branch is vetoed (RH above ceiling-hysteresis); with the
        unit idle the law falls through to the severity backstop, which can
        still start ON when VPD is deep enough.
        """
        high = P.band_high("Flowering", True)
        d = _hum(
            vpd=high + P.hum_vpd_margin + 0.1,
            lung_rh=P.hum_wet_ceiling - P.hum_hysteresis + 1,
            fan_pct=P.hum_sat_trigger + 1,
            hum_is_on=False,
        )
        # margin+0.1 is BELOW severity (0.05+0.1 = 0.15 = severity edge):
        # not deep enough for the backstop -> dead zone / no assist.
        assert d.reason in ("severity_backstop", "dead_zone")

    def test_severity_backstop(self) -> None:
        """VPD deep above the band engages even without fan saturation."""
        high = P.band_high("Flowering", True)
        d = _hum(
            vpd=high + P.hum_severity + 0.1,
            lung_rh=45,
            fan_pct=30,
            hum_is_on=False,
        )
        assert d.action == "on"
        assert d.reason == "severity_backstop"

    def test_dead_zone(self) -> None:
        """Above band but below severity with no assist: no_change."""
        high = P.band_high("Flowering", True)
        between = (max(P.hum_vpd_margin, P.hum_severity) + min(P.hum_vpd_margin, P.hum_severity)) / 2
        d = _hum(
            vpd=high + between,
            lung_rh=45,
            fan_pct=30,
            hum_is_on=False,
        )
        assert d.action == "no_change"
        assert d.reason == "dead_zone"
