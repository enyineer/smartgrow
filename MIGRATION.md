# Migrating from the YAML automations to SmartGrow

This is the real migration path for the box this project was ported from (vent control automation + dehumidifier cascade automation), written so it can be followed step by step.

## Before you start

- Both legacy automations are running and you are happy with the climate otherwise.
- You know which entities are which: exhaust fan (`fan.` with percentage), dehumidifier (`switch.` or `humidifier.`), tent temp/RH, lung-room temp/RH, the VPD template sensor, the lamp.

## Phase 1 — Install in dry-run (day 0)

1. Install SmartGrow via HACS and add the integration.
2. In the config flow, select your entities **and** the two legacy `automation.` entities (vent + dehumidifier). Keep **dry-run ON**.
3. Let everything run unchanged. SmartGrow only observes and logs.

## Phase 2 — Shadow comparison (days 1–2)

Watch:

- `sensor.smartgrow_fan_target` vs the real fan % — they should track within ~10 pp.
- `sensor.smartgrow_dehumidifier_decision` vs the dehumidifier power plug.
- `sensor.smartgrow_dehumidifier_cycles_24h` — your historical baseline included the bad oscillation day (26+ flips); SmartGrow targets ≤ 6.
- `binary_sensor.smartgrow_legacy_automation_warning` — will be on; that is expected while the old automations still run.

If `sensor.smartgrow_sensor_staleness` climbs, an entity is unreachable — fix that before cutting over.

## Phase 3 — Cutover (day 2 or 3, ideally morning)

1. **Disable the legacy vent automation** (not delete — disable, so rollback is one click).
2. **Disable the legacy dehumidifier automation.**
3. Confirm `binary_sensor.smartgrow_legacy_automation_warning` goes off and stays off.
4. Turn **off** `switch.smartgrow_dry_run`. SmartGrow now commands the devices.
5. Leave the old automations disabled but in place for at least a week.

## Phase 4 — First 48 h of live control

Check daily:

- **Cycles/24h ≤ 6** — if the oscillation warning fires, raise the dehumidifier anti-churn margin in options (0.05 → 0.10–0.15 kPa), or leave adaptation enabled and let it widen.
- **VPD inside band** most of the time; excursions should be brief.
- **Cold nights**: the `cold` attribute on the fan target sensor will show the cold clamp working (humidity terms halved, dehumidifier backstop may engage).
- **Fan floor comfort**: if night noise bothers you, lower `fan_floor_night`; if the tent smells stale, raise `fan_floor_day`.

## Rollback

Turn `switch.smartgrow_dry_run` **on** (SmartGrow stops commanding), re-enable both legacy automations. Nothing else to undo — no YAML was modified, no devices were reconfigured.

## Decommission (after a clean week)

Delete the disabled legacy automations. Keep the VPD template sensor if you bound it in the config flow. Keep the helpers (stage, band) if you bound them — otherwise manage the stage via the `select.smartgrow_stage` entity or the MCP `set_targets` tool.

## Notes for this specific box

- The lung room (intake air) is where the dehumidifier lives — the dry floor of 44 % protects it from over-drying.
- The recorded 2026-09-03 churn (19 fast dehumidifier cycles during the day) is the regression fixture: if you ever see that pattern again with SmartGrow, file it — it should be impossible with the cascade + margins.
- The fan parity investigation (`tests/FAN_PARITY_FINDING.md`) suggests the recorded fan trace in that window did not follow the full ΔAH/need terms. After cutover, compare `sensor.smartgrow_fan_target` against the real fan for a day; if SmartGrow consistently commands higher than you are used to during moisture spikes, that is the ΔAH term doing what the brief's law specifies — tune `delta_gain` down if unwanted.
