# Changelog

## 0.1.0 — initial release

- Fan control law: exact port of the production vent automation (ΔAH transport, VPD demand/escalation, pre-emptive heat term, phase floors, cold clamp).
- Dehumidifier cascade: level-triggered with intentional dead zone, saturation assist at fan ≥ 70 %, severity backstop, 44 % lung-RH dry floor.
- Dry-run mode by default; legacy-automation warning binary sensor.
- Config flow + options flow; Number/Select entities for live tuning; stage select.
- Diagnostic sensors: fan target + 4 terms + active term, ΔAH, AH tent/lung, dehum decision + reason, cycles/24h, staleness.
- P1 adaptation (on by default, watchdog-guarded): oscillation detector with auto-widening hysteresis, measured ΔAH/fan sensitivity gain correction, 7-day transpiration model with lamp-on pre-boost, force recalibrate.
- MCP tools via HA's built-in MCP Server/Assist API: get_climate_summary, get_control_trace, get_adaptation_state, set_targets, set_adaptation, force_recalibrate, get_parameter_explanations. No raw fan setpoint tool by design.
- Repair issues: adaptation watchdog trip; unreachable-band detection.
- Translations: English, German (key-complete).
- Test suite: 88 tests — unit, fixture replay (real 7-day recorded data), oscillation regression, hypothesis property tests; ≥95 % coverage on logic modules.
- CI: hassfest, HACS validate, pytest.
