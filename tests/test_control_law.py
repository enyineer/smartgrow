"""Unit tests for band tables, clamps and the fan/dehumid control laws."""

from __future__ import annotations

import pytest

from custom_components.smartgrow.logic import dehumid_control, fan_control
from custom_components.smartgrow.logic.params import (
    STAGE_BANDS,
    STAGE_TEMP_MAX,
    STAGE_TEMP_MIN,
    ControlParams,
)
from tests.conftest_logic import make_inputs

P = ControlParams()


class TestStageTables:
    def test_night_bands_below_day(self) -> None:
        for stage in STAGE_BANDS:
            day, night = STAGE_BANDS[stage]
            assert night < day

    def test_night_temp_max_is_day_minus_3(self) -> None:
        for stage in STAGE_TEMP_MAX:
            day, night = STAGE_TEMP_MAX[stage]
            assert night == pytest.approx(day - 3.0)

    def test_flowering_values_match_brief(self) -> None:
        assert STAGE_BANDS["Flowering"] == (1.5, 1.3)
        assert STAGE_BANDS["Vegetative"] == (1.1, 0.9)
        assert STAGE_BANDS["Seedling"] == (0.8, 0.6)
        assert STAGE_TEMP_MIN["Flowering"] == (20.0, 18.0)

    def test_effective_band_low_override(self) -> None:
        p = P.with_updates(band_low_day=1.4, band_low_night=1.2)
        assert p.effective_band_low("Flowering", True) == 1.4
        assert p.effective_band_low("Flowering", False) == 1.2
        assert P.effective_band_low("Flowering", True) == 1.5
        assert P.effective_band_low("Vegetative", False) == 0.9


class TestFanControl:
    def test_floor_hold_when_equal_moisture(self) -> None:
        """Equal AH tent/lung and VPD in band -> floor."""
        inputs = make_inputs(24.0, 55, 24.0, 55, 1.6, 30, is_day=True)
        d = fan_control.compute_fan(inputs, P)
        assert d.fan_target == 28  # day floor
        assert d.active_term == "min_fan"
        assert d.d_ah == pytest.approx(0.0, abs=1e-9)

    def test_delta_term_drives_fan(self) -> None:
        """Tent moister than lung -> fan scales with d_ah * 35."""
        inputs = make_inputs(24.3, 59, 23.9, 54, 1.6, 30, is_day=True)
        d = fan_control.compute_fan(inputs, P)
        expected = d.d_ah * 35
        assert d.fan_delta_term == pytest.approx(expected)
        assert d.fan_target >= expected - 1  # floor may dominate slightly

    def test_clamp_at_100(self) -> None:
        inputs = make_inputs(32.0, 90, 18.0, 30, 0.2, 30, is_day=True)
        d = fan_control.compute_fan(inputs, P)
        assert d.fan_target == 100

    def test_need_term_active_below_band(self) -> None:
        inputs = make_inputs(24.0, 60, 20.0, 40, 1.2, 30, is_day=True)
        d = fan_control.compute_fan(inputs, P)
        # vpd 1.2 < low 1.5 -> need = round((50 + 0.3*200)) = 110 (uncapped term;
        # only the final max/min clamps the *target* to 100)
        assert d.fan_need_term == 110.0
        assert d.fan_target == 100

    def test_need_term_zero_in_band(self) -> None:
        inputs = make_inputs(24.0, 60, 20.0, 40, 1.55, 30, is_day=True)
        d = fan_control.compute_fan(inputs, P)
        assert d.fan_need_term == 0.0

    def test_temp_emergency_term(self) -> None:
        """temp above max-2 engages the heat term: (t-(max-2))*25, capped at 100."""
        # AH equal (delta=0), VPD in band (need=0), min_fan 28 < 37.5, so heat wins.
        inputs = make_inputs(27.5, 45.5, 27.5, 45.5, 1.6, 30, is_day=True)
        d = fan_control.compute_fan(inputs, P)
        assert d.fan_temp_term == pytest.approx((27.5 - 26.0) * 25)
        assert d.active_term == "temp"

    def test_cold_clamp_halves_humidity_terms(self) -> None:
        """Below min temp, delta/vpd/need terms are halved (cold_mult)."""
        # Same RH values in both rooms so only temperature differs; compare
        # each scenario against its own warm reference at the same temps.
        warm = make_inputs(21.0, 59, 21.0, 54, 1.4, 30, is_day=False)
        cold = make_inputs(17.0, 59, 17.0, 54, 1.4, 30, is_day=False)
        dc = fan_control.compute_fan(cold, P)
        # Recompute the terms the cold decision *would* have had unclamped:
        from custom_components.smartgrow.logic.physics import (
            absolute_humidity_gm3 as ah,
        )

        d_ah_cold = max(0.0, ah(17.0, 59) - ah(17.0, 54))
        assert dc.fan_delta_term == pytest.approx(d_ah_cold * 35 * 0.5)
        assert dc.fan_vpd_term == pytest.approx(max(0.0, 1.3 - 1.4) * 50 * 0.5)
        assert dc.cold_mult == 0.5
        # Warm decision is unclamped:
        dw = fan_control.compute_fan(warm, P)
        assert dw.cold_mult == 1.0
        # need term is rounded after halving; vpd 1.25 < night low 1.3
        cold = make_inputs(17.0, 59, 17.0, 54, 1.25, 30, is_day=False)
        dc = fan_control.compute_fan(cold, P)
        assert dc.fan_need_term == round((50 + (1.3 - 1.25) * 200) * 0.5)

    def test_cold_clamp_configurable(self) -> None:
        p = P.with_updates(cold_clamp=0.0)
        inputs = make_inputs(17.0, 80, 16.0, 70, 1.0, 30, is_day=False)
        d = fan_control.compute_fan(inputs, p)
        assert d.fan_delta_term == 0.0
        assert d.fan_vpd_term == 0.0

    def test_night_floor(self) -> None:
        inputs = make_inputs(24.0, 55, 24.0, 55, 1.6, 30, is_day=False)
        d = fan_control.compute_fan(inputs, P)
        # 24C at night flowering: max_temp 25 -> temp term = (24-23)*25 = 25
        # (heat term engages before max, by design: pre-emptive cooling)
        assert d.fan_target == 25
        assert d.active_term == "temp"

    def test_active_term_identifies_winner(self) -> None:
        inputs = make_inputs(24.0, 61, 20.0, 40, 1.6, 30, is_day=True)
        d = fan_control.compute_fan(inputs, P)
        terms = {
            "delta": d.fan_delta_term,
            "vpd": d.fan_vpd_term,
            "temp": d.fan_temp_term,
            "min_fan": d.min_fan,
            "need": d.fan_need_term,
        }
        winner = max(terms, key=terms.get)
        assert d.active_term == winner


class TestDehumControl:
    DAY = dict(is_day=True, stage="Flowering")

    def test_off_on_over_dry_lung(self) -> None:
        inputs = make_inputs(24.0, 65, 22.0, 40, 1.2, 80, **self.DAY)
        d = dehumid_control.compute_dehum(inputs, P, dehum_is_on=True)
        assert d.action == "off"
        assert d.reason == "over_dry_floor"

    def test_off_when_target_depth_reached(self) -> None:
        """OFF only at band_low + depth (1.5 + 0.15 = 1.65)."""
        inputs = make_inputs(24.0, 45, 22.0, 50, 1.65, 40, **self.DAY)
        d = dehumid_control.compute_dehum(inputs, P, dehum_is_on=True)
        assert d.action == "off"
        assert d.reason == "target_depth_reached"

    def test_on_when_below_band(self) -> None:
        """Below band_low -> ON even if previously off (the window trigger)."""
        inputs = make_inputs(24.0, 55, 22.0, 50, 1.46, 40, **self.DAY)
        d = dehumid_control.compute_dehum(inputs, P, dehum_is_on=False)
        assert d.action == "on"
        assert d.reason == "below_band"

    def test_off_guard_when_idle_above_reengage(self) -> None:
        """Idle above low+reengage (1.5+0.05=1.55): stay off."""
        inputs = make_inputs(24.0, 55, 22.0, 50, 1.56, 40, **self.DAY)
        d = dehumid_control.compute_dehum(inputs, P, dehum_is_on=False)
        assert d.action == "off"
        assert d.reason == "band_edge_guard"

    def test_reengage_between_low_and_reengage_line(self) -> None:
        """Idle between band_low and low+reengage: re-engages ON (v0.9.3)."""
        inputs = make_inputs(24.0, 55, 22.0, 50, 1.52, 40, **self.DAY)
        d = dehumid_control.compute_dehum(inputs, P, dehum_is_on=False)
        assert d.action == "on"
        assert d.reason == "below_band"

    def test_hold_until_depth(self) -> None:
        """ON and VPD between low and low+depth: keep running."""
        inputs = make_inputs(24.0, 65, 22.0, 55, 1.55, 60, **self.DAY)
        d = dehumid_control.compute_dehum(inputs, P, dehum_is_on=True)
        assert d.action == "on"
        assert d.reason == "hold_to_depth"

    def test_saturation_assist(self) -> None:
        """Assist extends an ON run inside the window (never starts idle)."""
        inputs = make_inputs(24.0, 65, 22.0, 55, 1.55, 75, **self.DAY)
        d = dehumid_control.compute_dehum(inputs, P, dehum_is_on=True)
        assert d.action == "on"
        assert d.reason == "hold_to_depth"

    def test_no_in_window_restart_from_assist(self) -> None:
        """v0.9.1: idle + in-window + fan saturated + RH high stays OFF.

        Regression for the live failure: a boosted fan crossing sat_trigger
        restarted the unit right after each completed pull.
        """
        inputs = make_inputs(24.0, 65, 22.0, 55, 1.55, 75, **self.DAY)
        d = dehumid_control.compute_dehum(inputs, P, dehum_is_on=False)
        assert d.action == "off"
        assert d.reason == "band_edge_guard"

    def test_saturation_assist_needs_rh_hysteresis(self) -> None:
        """fan >= 70, lung RH below floor+3, dehum already ON -> keep running
        only until depth; here it holds (vpd < low+depth)."""
        inputs = make_inputs(24.0, 65, 22.0, 45.5, 1.55, 75, **self.DAY)
        d = dehumid_control.compute_dehum(inputs, P, dehum_is_on=True)
        assert d.action == "on"  # hold until target depth
        assert d.reason == "hold_to_depth"

    def test_severity_backstop_cold_night(self) -> None:
        """Deep below the band at night engages even with fan < 70%.

        Under the in-band hysteresis law any vpd < low is 'below_band';
        the severity backstop remains as defense-in-depth (same action).
        """
        inputs = make_inputs(18.0, 70, 17.0, 60, 1.15, 40, is_day=False)
        d = dehumid_control.compute_dehum(inputs, P, dehum_is_on=False)
        assert d.action == "on"
        assert d.reason in ("below_band", "severity_backstop")

    def test_dead_zone_no_change(self) -> None:
        """ON unit between low and low+depth with RH floor veto risk: hold."""
        # ON, vpd 1.55 in (low, low+depth): holds (below_band). The no_change
        # dead zone now only exists between OFF-guard edge and sat-assist RH
        # hysteresis: idle, vpd in [low, low+depth), fan >= 70 but RH too low.
        inputs = make_inputs(24.0, 65, 22.0, 45.5, 1.55, 75, **self.DAY)
        d = dehumid_control.compute_dehum(inputs, P, dehum_is_on=False)
        assert d.action == "off"
        assert d.reason == "band_edge_guard"

    def test_hysteresis_window_is_real(self) -> None:
        """Document the in-band window boundaries (low=1.5, re=0.05, d=0.15).

        ON line: vpd < low + reengage (1.55). OFF line: low + depth (1.65).
        """
        # Idle at low exactly: inside re-engage zone -> ON
        at_low = make_inputs(24.0, 63, 22.0, 55, 1.50, 40, **self.DAY)
        assert dehumid_control.compute_dehum(at_low, P, False).action == "on"
        # Idle at the re-engage line exactly: strict <, so guard holds OFF
        at_re = make_inputs(24.0, 63, 22.0, 55, 1.55, 40, **self.DAY)
        assert dehumid_control.compute_dehum(at_re, P, False).action == "off"
        # Just below the re-engage line: ON
        below = make_inputs(24.0, 63, 22.0, 55, 1.5499, 40, **self.DAY)
        assert dehumid_control.compute_dehum(below, P, False).action == "on"
        # ON unit mid-window: keeps running
        mid = make_inputs(24.0, 63, 22.0, 55, 1.60, 40, **self.DAY)
        d_mid = dehumid_control.compute_dehum(mid, P, True)
        assert d_mid.action == "on"
        assert d_mid.reason == "hold_to_depth"
        # ON unit at target depth (low+depth): OFF
        at_depth = make_inputs(24.0, 63, 22.0, 55, 1.65, 40, **self.DAY)
        assert dehumid_control.compute_dehum(at_depth, P, True).action == "off"

    def test_options_reconfigure_triggers(self) -> None:
        """Options reconfigure: lower dry floor AND sat trigger together."""
        p = P.with_updates(
            dehum_sat_trigger=50.0, dehum_dry_floor=50.0, dehum_severity=0.2
        )
        # Lowered thresholds let the assist hold an ON run inside the window
        # even with moderate fan; the hold (below_band/hold_to_depth) would
        # fire anyway below the band, so assert in-window ON semantics:
        inputs = make_inputs(24.0, 65, 22.0, 55, 1.55, 55, **self.DAY)
        d = dehumid_control.compute_dehum(inputs, p, dehum_is_on=True)
        assert d.action == "on"
        assert d.reason == "hold_to_depth"
        # ...and the lowered sat trigger itself engages below the band:
        inputs2 = make_inputs(24.0, 65, 22.0, 55, 1.45, 55, **self.DAY)
        d2 = dehumid_control.compute_dehum(inputs2, p, dehum_is_on=False)
        assert d2.action == "on"
        assert d2.reason in ("below_band", "saturation_assist")
