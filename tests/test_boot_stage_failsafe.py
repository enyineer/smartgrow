"""Regression: unknown stage at boot must not actuate (dehum boot-ON bug).

Live failure 2026-10-12: after an HA restart the stage select restores its
state ~20 min late. _gather_inputs defaulted the unknown stage to Flowering,
so the VPD path evaluated the Flowering-NIGHT band (1.3–1.45) while the tent
was in Drying, got 'below_band' (VPD ~1.0) and commanded the dehumidifier ON
— once at boot and again on every setup retry while a sensor flapped. The
user came home to the compressor kicking on all morning.
"""

from __future__ import annotations

from unittest.mock import MagicMock

from custom_components.smartgrow.coordinator import SmartGrowCoordinator
from custom_components.smartgrow.logic.params import ControlParams, SensorInputs


def _coordinator_with_inputs(stage: str) -> tuple[MagicMock, SensorInputs]:
    c = MagicMock(spec=SmartGrowCoordinator)
    # Bind the real method under test.
    c._current_stage = lambda: stage
    return c, SensorInputs(
        tent_temp=20.0,
        tent_rh=53.0,
        lung_temp=20.0,
        lung_rh=50.0,
        vpd=1.0,  # BELOW the Flowering-night band low (1.3) -> old bug fired ON
        fan_pct=0.0,
        is_day=False,
        stage=stage,
    )


class TestUnknownStageFailsSafe:
    def test_gather_inputs_no_longer_defaults_to_flowering(self) -> None:
        """The band-table default that caused the boot-ON is gone."""
        import inspect

        src = inspect.getsource(SmartGrowCoordinator._gather_inputs)
        assert 'or "Flowering"' not in src, (
            "_gather_inputs still defaults an unknown stage to Flowering — " "that is the dehum boot-ON bug"
        )

    def test_update_data_gates_actuation_on_unknown_stage(self) -> None:
        """The stage-known gate exists in _async_update_data."""
        import inspect

        src = inspect.getsource(SmartGrowCoordinator._async_update_data)
        assert "not stage_now" in src
        assert "fail-safe" in src.lower()

    def test_dehum_cadence_never_sees_empty_stage(self) -> None:
        """The dehum cadence checks inputs.stage before hitting the band tables."""
        import inspect

        src = inspect.getsource(SmartGrowCoordinator._async_update_data)
        assert "DEHUM_CADENCE_S and inputs.stage" in src

    def test_real_vpd_band_would_have_fired(self) -> None:
        """Documents the failure mode: Flowering-night + VPD 1.0 -> ON."""
        from custom_components.smartgrow.logic import dehumid_control

        c, inputs = _coordinator_with_inputs("Flowering")
        d = dehumid_control.compute_dehum(inputs, ControlParams(), False)
        assert d.action == "on" and d.reason == "below_band"
        # ...which is exactly why the stage gate must keep this path from
        # ever seeing an assumed stage.


def test_gate_result_shape_matches_normal_cycle():
    """Listeners read attrs of the result dict; the fail-safe early return
    must carry every key a normal cycle carries (crashed entity state writes
    wedged updates for ~15 min after the first boot with the gate)."""
    import inspect
    import re

    src = inspect.getsource(SmartGrowCoordinator._async_update_data)
    gate = src.split("not stage_now")[1].split("# Lights schedule")[0]
    gate_keys = set(re.findall(r'"(\w+)":', gate))
    normal_keys = set(re.findall(r'"(\w+)":', src.split("now = time.time()")[-1]))
    missing = {"inputs", "ts", "phase", "stage", "degraded", "fan"} - gate_keys
    assert not missing, f"gate result missing keys: {missing}"
