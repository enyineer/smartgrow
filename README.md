# SmartGrow

**Grow-tent climate control for Home Assistant — fan + dehumidifier cascade, ported from a production-proven YAML automation into a proper HACS custom component.**

SmartGrow replays the exact control law that has been running on a real grow box (fan % as a max of demand terms; a level-triggered dehumidifier cascade with an intentional dead zone), wrapped in a first-class HA integration: config flow, dry-run safety, diagnostics, MCP tools for AI agents, and a fixture-tested core.

---

## Highlights

- **Faithful port** — the control math is expression-for-expression identical to the proven production automation (pure Python modules, no HA imports, 95%+ test coverage, replayed against 7 days of real recorded data).
- **Dry-run first** — ships with `dry_run: on`. It logs and records decisions without touching your devices, and a `binary_sensor` warns while your legacy automations still actuate.
- **Explainable** — every fan % comes with the winning term (`active_term`), all term values, ΔAH, cold-clamp state; every dehumidifier decision carries its reason.
- **Adaptation (opt-out)** — oscillation detection with auto-widening hysteresis, measured ΔAH/fan sensitivity gain correction, a 7-day transpiration model with lamp-on pre-boost — all guarded by a convergence watchdog that auto-disables on >40% drift from safe defaults and raises a repair issue.
- **MCP-ready** — 7 tools registered with HA's built-in MCP Server / Assist API (no extra server): ask your agent "why did the fan run at 80%?" and get the traced answer.
- **Physics done right** — absolute humidity via the Magnus formula (RH lies across temperature differences), VPD bands per stage/phase, cold-night clamp that halves humidity demand instead of freezing the tent.

## Installation

### HACS (custom repository)

1. HACS → ⋮ → *Custom repositories* → add `https://github.com/niggo/smartgrow` (category: *Integration*).
2. Install **SmartGrow**.
3. Restart Home Assistant.
4. *Settings → Devices & Services → Add Integration* → **SmartGrow**.

### Manual

Copy `custom_components/smartgrow/` into your HA `config/custom_components/` directory and restart.

## Setup

The config flow asks for:

| Field | Notes |
|---|---|
| Exhaust fan | percentage-controlled `fan.*` entity |
| Dehumidifier | `switch.*` or `humidifier.*` |
| Tent temp/RH, lung-room temp/RH | the lung room is where your intake air comes from |
| VPD sensor | optional — the tent VPD template sensor if you have one; otherwise computed |
| Lamp | optional — drives day/night (else a 12/12 clock) |
| Legacy automations | optional — SmartGrow warns while they still fire during dry-run |

**Options** expose the proven tunables: fan floors (28/20), gains (ΔAH 35, VPD 50, need 200, temp 25), cold clamp (0.5), saturation trigger (70%), dry floor (44% lung RH), band overrides, adaptation on/off + aggressiveness, dry-run. Each also exists as a `number` entity for live tuning.

## Cutover (from YAML automations)

1. Install with **dry-run ON** (default). Let it observe for 24–48 h.
2. Compare `sensor.smartgrow_fan_target` against your recorded fan % and `sensor.smartgrow_dehumidifier_decision` against your dehumidifier power.
3. **Disable the legacy vent + dehumidifier automations** (the dry-run warning sensor must go and stay off).
4. Flip `switch.smartgrow_dry_run` off. SmartGrow now commands the devices.
5. Watch the first 48 h: cycles/24h should stay ≤ 6; if the oscillation warning fires, raise the anti-churn margin (or let adaptation do it).

Full details in [MIGRATION.md](MIGRATION.md).

## MCP tools (for agents / Assist)

Once the HA **MCP Server** integration is set up (or via any Assist pipeline), SmartGrow exposes:

| Tool | Purpose |
|---|---|
| `get_climate_summary` | current tent/lung climate, VPD vs band, fan/dehum state |
| `get_control_trace` | recent decisions with reasons (newest first) |
| `get_adaptation_state` | adaptation status, flips/24h, learned parameters |
| `set_targets(stage, band_low_day, band_low_night)` | set VPD band lows |
| `set_adaptation(enabled, aggressiveness)` | toggle/tune adaptation |
| `force_recalibrate` | reset learned state to safe defaults |
| `get_parameter_explanations` | human-readable why + expected effect per parameter |

Example agent prompts:

> "Warum lief der Lüfter letzte Nacht auf 80 %?" → `get_control_trace` + `get_climate_summary`
> "Stell das VPD-Soll nachts auf 1.2" → `set_targets(stage="Flowering", band_low_day=1.5, band_low_night=1.2)`
> "Wie steht's um die Adaptation?" → `get_adaptation_state`

There is deliberately **no raw fan setpoint tool** — the fan is driven by the control law, not ad-hoc commands.

## Entities

Diagnostic sensors: fan target + all four terms + `active_term`, ΔAH / AH tent / AH lung, dehumidifier decision (+ reason), dry-run state, cycles/24h, staleness.
Binary sensors: legacy-automation warning, oscillation warning.
Switches: dry-run, adaptation.
Numbers: floors, gains, cold clamp, saturation trigger, dry floor.
Select: grow stage.

## Development

```bash
uv venv && uv pip install -e '.[test]'
pytest --cov=custom_components/smartgrow/logic --cov=custom_components/smartgrow/adaptation
```

The test suite replays real recorded fixture data (`tests/fixtures/`) through the control law: fan parity, dehumidifier ON/OFF alignment against recorded power, and the 26-flip oscillation regression.

## Lovelace card

There is a companion **SmartGrow Card** — a HACS lovelace custom card that renders the whole tent in one glanceable view: fan target (vs actual), VPD vs band bar, 24 h ΔAH sparkline, dehumidifier chip with its reason, the active-term breakdown, and dry-run/adaptation/warning indicators.

1. HACS → ⋮ → *Custom repositories* → add `https://github.com/enyineer/smartgrow-card` (category: *Lovelace*).
2. Add the card to a dashboard — `type: custom:smartgrow-card` with your entity prefix, or pick entities in the UI editor.

A YAML-only dashboard without custom cards is in [docs/lovelace-example.yaml](docs/lovelace-example.yaml).

## Dokumentation (DE)

**Warum absolute Feuchte?** Relative Luftfeuchte "lügt" bei Temperaturunterschieden: 59 % LF bei 24,3 °C enthält fast exakt so viel Wasser wie 54 % bei 23,9 °C. SmartGrow vergleicht daher ΔAH (g/m³) zwischen Zelt und Lungenraum, berechnet über die Magnus-Formel — genau wie die bewährte Produktionsregelung. Details in [docs/CONTROL_LAW.md](docs/CONTROL_LAW.md).

**Sicherheitskonzept:** Auslieferung im Probemodus; Umschaltung erst nach Deaktivierung der Alt-Automatisierungen; Adaption mit Watchdog (Auto-Aus bei >40 % Parameterdrift + Reparatur-Meldung).

## License

MIT — see [LICENSE](LICENSE).
