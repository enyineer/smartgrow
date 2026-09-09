# SmartGrow — HACS Component Build Brief (P0→P3)

## Mission
Build a production-quality Home Assistant custom component (HACS) called **SmartGrow** (`smartgrow` domain) that ports a *production-proven* grow-tent climate control law from HA YAML automations into a proper Python integration. It must be **thoroughly tested against real recorded data fixtures** and have **polished UI components** (config flow, options flow, Lovelace-ready entities). User wakes up tomorrow to a ready-to-install, git-initialized repo.

## Proven control law (port EXACTLY this — it runs in production today)

### Fan controller ("Vent Control", evaluated every 3 min + on sensor changes)
```
low, high = STAGE_BANDS[stage][day_or_night]      # Flowering day 1.5/night 1.3 etc.
max_temp, min_temp = STAGE_TEMP[stage][day_or_night]  # e.g. Flowering: max 28 day/25 night, min 20 day/18 night
min_fan = options.fan_floor_day if is_day else options.fan_floor_night   # defaults 28/20

# Absolute humidity (Magnus), g/m³:
es = 6.112 * (rh/100) * e**((17.62*t)/(243.12+t))     # hPa
ah = 216.7 * es / (273.15 + t)                        # g/m³  (es is hPa here; consistent)

d_ah      = max(0, ah_tent - ah_lung)
cold      = tent_temp < min_temp
cold_mult = 0.5 if cold else 1.0

fan_delta = d_ah * 35 * cold_mult
fan_vpd   = max(0, low - vpd) * 50 * cold_mult
fan_temp  = min(max(0, temp - (max_temp - 2)) * 25, 100)
fan_need  = round((50 + (low - vpd) * 200) * cold_mult)  if vpd < low else 0

fan_target = int(min(max(fan_delta, fan_vpd, fan_temp, min_fan, fan_need), 100))
```
STAGE_BANDS (day/night lows; highs for display): Seedling [0.8,0.6]/[1.1,0.9], Vegetative [1.1,0.9]/[1.5,1.3], Flowering [1.5,1.3]/[1.8,1.6].
STAGE_TEMP max: Seedling 28/25, Vegetative 29/26, Flowering 28/25 (day/night; night = day−3). min: Seedling 20/20, Vegetative 19/19, Flowering 20/18.

### Dehumidifier cascade (level-triggered, evaluate every 5 min + on changes)
```
OFF if  lung_rh < 44                          (over-dry floor, configurable, default 44)
     or tent_vpd >= low - 0.05                (band reached; 0.05 anti-churn margin)
ON if  (dehum_is_on and tent_vpd < low - 0.05)         # hold while still needed
    or (fan_pct >= 70 and lung_rh >= 47)               # saturation assist (47 = floor+3 hysteresis)
    or tent_vpd < low - 0.1                            # severity backstop (cold nights)
else: no change (dead-zone by design — this gap is intentional, do NOT close it)
```

## Key design decisions (user-confirmed, non-negotiable)
1. **Dry-run default**: integration ships with `dry_run: true`. While dry-run is on, the component only logs/records what it WOULD command (via a diagnostic sensor + log), and a companion `binary_sensor.dry_run_warning` fires if it detects the legacy automations still actuating (see below). Cutover = user flips dry_run off AND disables their old automations manually.
2. **Legacy automation detection**: config flow optionally accepts the entity_ids of existing `automation.` entities (vent + dehum). If provided and they trigger while dry-run is on, set warning attribute + log once per hour max.
3. **Adaptation (P2) ships implemented but `adaptation_enabled: false` by default.** (User override choice: they explicitly want adaptation ON by default — but P0 safety: implement a convergence watchdog: if adapted params drift >40% from safe defaults, auto-disable adaptation + raise repair issue. Document this.)
4. **MCP via HA's built-in MCP Server integration**: expose tools by registering them with HA's MCP server (HA 2025.8+ `mcp_server` / assist API). Do NOT run a separate HTTP server. Tools: `get_climate_summary`, `get_control_trace`, `get_adaptation_state`, `set_targets(stage, band_low_day, band_low_night)`, `set_adaptation(enabled, aggressiveness)`, `force_recalibrate()`, `get_parameter_explanations()`. NO raw fan setpoint tool.
5. **Language**: English UI, German translations via `translations/de.json`.
6. **Repo**: full GitHub-ready — git init, MIT LICENSE, README (EN with DE section), GitHub Actions CI (hassfest + HACS validate + pytest), `hacs.json`.

## Real test fixtures (ALREADY EXPORTED — use these, do not invent data)
Located in `/root/smartgrow_fixtures/` — 7 days of real 5-min-or-on-change history from the production box:
- `sensor__temp_rh_sensor_temperature.csv` (88), `sensor__temp_rh_sensor_humidity.csv` (75) — tent
- `sensor__0xa4c138be0ce5db67_temperature.csv` (20), `sensor__0xa4c138be0ce5db67_humidity.csv` (14) — lung room (slow cadence!)
- `sensor__growbox_vpd.csv` (157), `sensor__growbox_vpd_ziel.csv` (5), `sensor__growbox_phase.csv` (5), `light__growlampe_light_0.csv` (5), `input_select__growbox_stage.csv` (1)
- `sensor__dehumidifier_power.csv` (477), `humidifier__153931628935292_humidifier.csv` (886 — includes the 26-flip oscillation night! great negative test), `sensor__ec_luefter_percentage.csv` (91 — actual fan outputs)

**Test philosophy (user-confirmed): fixture replay.** The core test suite replays these CSVs through the control law on a simulated clock and asserts:
- Fan outputs stay within ±10pp of recorded `ec_luefter_percentage` where the old automation drove the fan (exclude periods where params differed historically — document exclusions)
- Dehum decisions: assert NO ON-command when recorded dehumidifier_power stayed <50W for >15 min after, and ON when power ramped within 10 min (fuzzy match, allow ±5 min alignment)
- Oscillation regression: replay the 26-flip night segment; assert v7 hysteresis produces ≤6 flips in the same window (the historical bug is the negative fixture)
- Cold-night segment: assert severity backstop engages when VPD < low−0.1 even with fan < 70%
- Unit tests for Magnus AH (known-good pairs: 24.3°C/41%→? — compute with reference impl, assert templates and Python agree to 1e-6), stage band lookups, clamp behavior, dead-zone hold behavior
- Property tests (hypothesis): fan_target ∈ [0,100], monotonic in d_ah (higher delta never lowers target), cold-clamp halves humidity terms exactly

## Architecture requirements
- `custom_components/smartgrow/` standard layout: `__init__.py` (coordinator), `config_flow.py`, `options_flow`, `fan_control.py` + `dehumid_control.py` (pure logic modules — no HA imports, fully unit-testable), `sensor.py`, `binary_sensor.py`, `switch.py` (dry-run switch + adaptation switch), `number.py` (floors, gains, thresholds — all options as Number entities where sensible), `select.py` (stage), `mcp.py`, `translations/{en,de}.json`, `manifest.json` (version 0.1.0, afterDependencies none, iot_class local_polling)
- **Pure logic separation is mandatory**: all control math lives in `logic/` modules taking plain dicts/floats, returning decisions. HA layer only marshals entity states → logic → service calls. This is what makes the fixture replay clean.
- Coordinator (DataUpdateCoordinator) ticks every 60s (not 3min — faster sampling, decision cadence still throttled internally to 3min for fan / 5min for dehum to mirror proven behavior)
- Entities: diagnostic sensor `fan_target`, `fan_delta_term`, `fan_vpd_term`, `fan_need_term`, `fan_temp_term`, `active_term` (which won the max), `d_ah`, `ah_tent`, `ah_lung`, `dehum_decision`, `dry_run`, `cycles_24h`, `oscillation_warning` (binary), repair issues for unreachable-band detection (tent RH target < lung achievable floor → info issue with explanation, this is the lesson from our night-band math)
- Config flow: pick fan entity, dehum entity, tent temp/RH, lung temp/RH, stage select, legacy automation entities (optional), dry_run (default true). Options flow: floors, gains, sat trigger, lung floor, cold clamp, band table, adaptation toggle.
- **UI polish**: descriptive state attributes, device_class + state_class where applicable, icons (`mdi:fan`, `mdi:air-humidifier`, `mdi:sprout`), friendly names, sensible unique_ids (`smartgrow_{entry_id}_{name}`), restore state, proper availability templating (unavailable if sensors stale >15min with `stale` diagnostic sensor).

## P1–P3 scope (implement fully)
- **P1 adaptation** (`adaptation.py`): oscillation detector (flips/24h, amplitude; auto-widen hysteresis ±, capped), gain adaptation via measured d(ΔAH)/d(fan%) sensitivity with convergence watchdog (freeze at ±40% from defaults, auto-disable + repair issue), transpiration model: rolling per-(phase,stage) mean moisture input g/m³·h over trailing 7 days → predictive pre-boost: when phase flips to day, pre-apply last-learned lamp-on excursion estimate. All adaptation writes to `options` via internal store with parameter history + confidence; every adapted value exposes an attribute `adapted: true, from_default: X`. `adaptation_enabled` switch defaults OFF... EXCEPT user chose ON — so ship ON but with the watchdog; document prominently.
- **P2 MCP** (`mcp.py`): register with HA MCP server integration API. Tools as listed. `get_parameter_explanations()` returns human-readable current params + why they changed + expected effect.
- **P3 proactivity**: unreachable-band detection → repair issue; nightly self-check; optional Telegram-agnostic notification via HA notify config entry.

## Deliverables checklist
- [ ] Repo `/root/smartgrow/` git-init'd, MIT, README (EN+DE summary), CI (hassfest, HACS validate, pytest with fixtures bundled under `tests/fixtures/` — copy from /root/smartgrow_fixtures/)
- [ ] `pytest` green: unit + fixture-replay + property tests, coverage ≥90% on logic modules
- [ ] `hassfest --validate` and HACS action validation pass
- [ ] Config flow + options flow implemented, translations EN/DE complete (no missing keys)
- [ ] Dry-run default ON, legacy-automation warning sensor
- [ ] MCP tools registered, documented in README with example agent prompts
- [ ] CHANGELOG.md, MIGRATION.md (how to cut over from YAML automations — mirror our real migration path)
- [ ] A `docs/CONTROL_LAW.md` explaining the physics (Magnus AH, why ΔAH, why fan% as demand signal) — derived from the Reddit post draft at `/root/.hermes/cron/grow/reddit_post_de.md` (good source, but use only facts from this brief)
- [ ] Final report: what was built, test results (numbers!), known limitations, install instructions, and the exact cutover steps for Niggo's box (which automations to disable, what to watch first 48h)

## Quality bar
- No stubs, no TODOs, no placeholder logic. Every function implemented.
- Type hints everywhere, ruff clean, black formatted.
- If a test exposes a real flaw in the control law (not the port), STOP and document it in the final report rather than papering over it — we learned in production that silent paper-overs are the worst failure mode.
