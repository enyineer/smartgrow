# SmartGrow Card Rework — Edge-Case Test Plan

Scope: vitest + jsdom suites in `card-src/src/` (state derivation, pure helpers, render
assertions, config, countdown math) plus a flagged list of what only the real-browser
playwright harness (`/dashboard-growbox/0`, ≥10-run A/B gate) can prove.

Ground rules baked into the plan (from the integration, not guesses):
- The card reads ONLY integration-published entities + the sources sensor
  (`*_configured_sources` attrs incl. `vpd_computed`, `wavemaker_*`). No name-guessing,
  no clock fallback for phase. `vpd_entity: null` = "use `vpd_computed`", never "unknown".
- Dehum decision states live in `sensor.<prefix>_dehumidifier_decision`
  (`state` = on/off/…, `attributes.reason` ∈ below_band, hold_to_depth,
  target_depth_reached, band_edge_guard, over_dry_floor, saturation_assist,
  severity_backstop, dead_zone, no_change; record-level states unconfigured,
  dry_run, held_by_shared_arbitration).
- Wavemaker: mode none/with_lights/interval; interval math in the coordinator is
  `off → on` after `every_min`, `on → off` after `run_s`; `run_s<=0 or every_min<=0`
  = never runs. The card has NO clock into the coordinator — countdown must derive
  from pump `last_changed` + attrs. **`last_changed` resets on unavailable flaps** —
  this is the #1 countdown trap to test.
- Lamp doctrine: dimmer + master plug must BOTH be on to call the lamp lit;
  master off/unreachable → phase night (failsafe), and the schedule crosses
  midnight in production (20:00→08:00, `on >= off` branch).
- Adaptation: switch on/off, engine confidence 0..1 (0 until ≥ GAIN_MIN_SAMPLES),
  oscillation = flips/24h > limit (warn 6, critical 12; incident was 26/day).

---

## A. State-derivation edge cases (`parseSmartGrowState`, `getBacking`, `toNumber`, `toBool`)

### A1. Missing entities (not in hass.states at all)
- [ ] Given no fan_target entity in states, when parsed, then `fanTarget === null` and `s.empty === true` → render shows setup hint.
- [ ] Given EVERY resolved id missing, when parsed, then `empty === true` and no field is NaN.
- [ ] Given only the sources sensor exists (all prefix entities missing), when parsed, then `empty === true` but `ids.vpd`/`ids.camera`/`ids.lamp` still resolve (sources scan is prefix-independent).
- [ ] Given phase sensor missing, when parsed, then `phase === "unknown"` — never a clock-derived value.
- [ ] Given `ids.vpd` missing but sources has numeric `vpd_computed`, when parsed, then `s.vpd === vpd_computed` (regression #1).
- [ ] Given sources sensor missing AND vpd missing, when parsed, then `s.vpd === null` → gauge renders "VPD —" and label "VPD unknown", no throw.
- [ ] Given `hass === undefined` / `hass.states === undefined`, when parsed, then returns an all-null `ParsedState` with `empty === true` (no throw) — this is also the hass-flap shape.
- [ ] Given stage select missing, when parsed, then fallback band `{1.3, 1.6}` used (card passes `VPD_BAND_RANGE`); given stage present but empty-string state, then same fallback via `bandForStage`.

### A2. unavailable / unknown entities
- [ ] Given fan_target `state: "unavailable"`, when parsed, then `fanTarget === null`, gauge shows `—`, and `empty === false` (entity exists → not a setup problem; must NOT show the setup hint).
- [ ] Given fan_target `"unknown"`, when parsed, then same as unavailable.
- [ ] Given dehum decision `unavailable`, when chip built, then `label === "unavailable"`, `on === null`, chip gets neither `on` nor `off` class.
- [ ] Given dehum decision state `"on"` but `attributes.reason` missing/undefined, when parsed, then `dehumReason === null` and no `reason:` line renders.
- [ ] Given dehum `attributes.reason` is a non-string (number/object), when parsed, then `dehumReason === null` (typeof guard holds).
- [ ] Given pump switch flaps `on → unavailable → on`, when countdown derived, then elapsed uses the LAST `last_changed` (flap resets the window) and never goes negative — pin the chosen semantics in the helper, then assert them.
- [ ] Given ALL numeric sensors `unavailable` but entities present, when parsed, then `empty === false` and every value slot renders `—` (the "radio flap for ⅔ of the day" production shape must not blank the card).

### A3. Weird values
- [ ] `toNumber`: `"12"`→12, `"12.5"`→12.5, `"-3.2"`→-3.2, `"+5"`→null, `"1e3"`→null (regex rejects), `"0"`→0 (NOT null), `"0.0"`→0, `""`→null, `" 42 "`→42 (trim), `"NaN"`→null, `"Infinity"`→null.
- [ ] `toNumber`: `"on"/"off"/"none"/"unknown"/"unavailable"` → null (sentinel list complete).
- [ ] Given `attributes.fan_pct: 0`, when parsed, then `dehumFanPct === 0` (0 is a number, not missing); given `fan_pct: "74"` (string), then `dehumFanPct === null` (documented: numbers only).
- [ ] Given `vpd_computed` as string `"0.976"` in sources, when parsed, then parsed via parseFloat; as `true`/object, then ignored.
- [ ] Given fan_target `"-5"`, when rendered, then gauge shows `-5 %` (parse allows negatives; display must not crash) — or clamp if rework decides so; pick one and pin it.
- [ ] Given term value `-20`, when `normalizeTerm`, then `0`; given `155` (live need-term!), then `100`; given NaN, then `0` and bar width `0%` (not `NaN%` in the style attr).
- [ ] Given band `{low: 1.8, high: 1.5}` (degenerate), when `bandPosition`, then `null` → marker omitted, label "VPD unknown".
- [ ] `bandPosition` clamps: vpd −1 → −0.25, vpd 99 → 1.25; markerLeft clamps into [0,100] so the marker never leaves the bar.
- [ ] `toBool`: `"1"/"true"/"on"` → true, `"0"/"false"/"off"` → false, `"yes"` → null; given dry_run switch missing → `dryRun === null` → NO chip renders (not "off").
- [ ] `dehumOn`: `"hold_on"/"assist_on"` → true, `"hold_off"` → false, `"turned_on"/"turned_off"` → bool, `"dead_zone"` → null (reason strings are NOT on/off).

### A4. Dehum decision state machine (card view of each)
- [ ] For each reason ∈ {below_band, hold_to_depth, target_depth_reached, band_edge_guard, over_dry_floor, saturation_assist, severity_backstop, dead_zone}: given decision on/off with that reason attr, when rendered, then chip ON/OFF class correct AND the reason string appears verbatim in the `reason:` line.
- [ ] Given record-state `unconfigured` surfaced on the decision sensor, when parsed, then chip shows the raw state string, `on === null` (no on/off class).
- [ ] Given `held_by_shared_arbitration` with reason `shared dehum: off wins over on`, when rendered, then that reason text surfaces (user must see WHY the unit stayed off).
- [ ] Given `dry_run` record state on the decision sensor, when rendered, then both the decision chip AND the DRY RUN chip reflect their own entities independently (decision comes from decision sensor, dry-run chip from dry_run entity — a dry_run decision value must not corrupt `dehum.on`).
- [ ] Given humidifier_decision entity missing, when rendered, then NO `💦 hum` chip; given it present with `on`, then chip + reason note render.
- [ ] Given cycles_24h `"4"`, when rendered, then "4 cyc/24h" chip; given `unavailable`, then NO cycles chip and no "NaN cyc".

### A5. Phase / lamp / master
- [ ] Given phase sensor `day` and stage `Flowering`, when parsed, then band `{1.5,1.8}`; `night` → `{1.3,1.6}` (band follows phase, matches integration tables).
- [ ] Given phase sensor present but state `"unknown"`, when parsed, then `phase === "unknown"` and chip renders class `unknown` (never flips to a day/night guess).
- [ ] Given stage conflict attr on the stage select, when rendered, then `⚠︎` on the stage pill AND the "legacy helper disagrees" line with the conflicting value.
- [ ] Lamp/master (card-consumable shape): given card reads lamp entity + master plug from sources, then dimmer on + master unavailable → phase display follows the integration phase sensor (`night` per failsafe), and any card-side "lamp on" affordance does NOT claim lit — the card must never contradict the integration's doctrine.

### A6. Adaptation & warnings
- [ ] Given adaptation switch `on`/`off`/missing → chip "adaptation on"/"adaptation off"/no chip respectively.
- [ ] Given confidence attr `0` on adaptation entity, when rendered (if rework surfaces it), then "0%" not "NaN%" or blank — 0 is meaningful (cold start).
- [ ] Given confidence `0.9999`, when formatted, then rounds sanely and never shows `100.00000001`.
- [ ] Given oscillation_warning `on`, when rendered, then warning banner "dehumidifier oscillation"; given legacy_warning `on` too, then BOTH phrases with the `·` separator; given only legacy, then only "legacy automations still active".
- [ ] Given flips counter ≥ warn threshold in attrs, when rendered, then the oscillation binary_sensor is what drives the banner (card must not re-derive thresholds from raw flips — assert no duplicate logic).

### A7. Prefix / discovery / sources
- [ ] Given prefix `smartgrow_smartgrow` matches nothing but `sensor.growbox_1_smartgrow_phase` exists (renamed device), when `_ids()` runs, then phase id followed via the `*_smartgrow_phase` scan (v0.7.1 regression).
- [ ] Given no prefix and auto-discovery finds `sensor.x_fan_target`, when `_ids()` runs, then ids rebuilt under `x` (device-renamed tent).
- [ ] Given TWO tents' entities in states, when discovering, then the FIRST `*_fan_target` match wins deterministically — assert sorted/stable choice, not object-key-order luck.
- [ ] Given sources sensor under device-qualified id (`sensor.growbox_1_smartgrow_configured_sources`), when `sourceEntityMap` runs, then found via suffix scan; given BOTH `<prefix>_sources` and `<prefix>_configured_sources` exist, then the FIRST candidate wins — pin the precedence.
- [ ] Given sources attrs include non-`*_entity` keys and empty-string entity values, when mapped, then only non-empty `*_entity` strings pass through.

---

## B. Countdown / time-math pure functions — RECOMMENDATION: extract before testing

Extract `wavemakerCountdown`/`lightsWindow`-style helpers into `state.ts` (or a new
`time.ts`) as PURE functions taking `(now: number, lastChanged: number, runS: number,
everyMin: number)` and `(now: Date, on: string, off: string)`. The card currently has
NO such helpers — the rework must add them, and the coordinator's semantics are the
spec (`run_s<=0 or every_min<=0 → never`, off→on after every_min, on→off after run_s).

- [ ] Given pump off, lastChanged 10 min ago, everyMin 60 → remaining 50 min; countdown text "50m" (unit format pinned).
- [ ] Given pump ON, lastChanged 10 s ago, runS 30 → remaining 20 s ("20s"); at exactly `runS` → 0, not negative.
- [ ] Given elapsed > window (coordinator stalled), then remaining clamps to 0 — never negative countdown.
- [ ] Given `runS = 0` or `everyMin = 0` or negative, then countdown hidden ("—" / no element), mirroring the coordinator's never-runs rule.
- [ ] Given `everyMin`/`runS` arrive as strings `"60"`/`"30"` from attrs, then either coerced or countdown hidden — must not produce NaN text; pin one behavior.
- [ ] Given pump `unavailable`, then countdown shows "—" (unknown), NOT a frozen number and NOT 0.
- [ ] Given pump missing in interval mode, then no countdown element.
- [ ] Given lastChanged in the FUTURE (host clock skew / HA restart), then remaining = full window (clamp at max), not negative.
- [ ] Given lastChanged invalid date string, then countdown hidden, no NaN.
- [ ] **Flap reset:** given lastChanged bumps on a 2 s `unavailable` flap mid-window, then countdown restarts from full — assert this is surfaced as the displayed behavior (and file the product decision: it's honest to `last_changed`, but the user sees the window "extend").
- [ ] Lights window (if card shows "lights off in Xh"): `20:00→08:00` at 23:00 → 9 h to off; at 07:00 → 1 h to on; `on < off` simple window (06:00→22:00) at 12:00 → 10 h to off; boundaries: at exactly on/off time, pin inclusive/exclusive per coordinator (`on <= now < off`).
- [ ] Midnight rollover: countdown crossing 00:00 computes via absolute timestamps — construct with `Date` objects or injected `now`, never call `new Date()` inside the helper (injectability is the point of extraction).
- [ ] DST edge: window spanning a DST jump — assert helper works on UTC ms arithmetic and doesn't assume 24 h days (if helper is ms-based this is free; pin it with a test anyway).
- [ ] Given mode `none` or `with_lights`, then NO countdown (interval-only feature).
- [ ] Stress: 500 rapid now-ticks with unchanged lastChanged → helper stays pure & monotonic (countdown only decreases), no allocation leaks in a loop.

---

## C. Render output assertions per state (jsdom; mount the real element, assert shadow DOM)

Pattern: `el.setConfig(...); el.hass = mkHass(states); await el.updateComplete;` then
assert against `el.shadowRoot`. Pin text, element presence/absence, and class names —
NOT whole-DOM snapshots for everything (snapshot only where listed in §E).

### C1. Setup / empty
- [ ] Given `empty` state, then `ha-card` renders the `.setup-hint` div, mentions the expected prefix, lists ≤3 missing ids, and does NOT render gauge/chips/terms.
- [ ] Given `show_setup_hint: false` + empty state, then hint suppressed (bare ha-card) — and the rest of the card must still NOT render (hint flag ≠ render-anyway).
- [ ] Given config set but `hass` still undefined, then render returns empty html`` without throwing (pre-connection mount).

### C2. Fully-populated happy path (fixture: live-states.json shape)
- [ ] Title = config title when set; falls back to `s.device` (from friendly_name) when unset; friendly_name stripped of the trailing role ("Growbox 1 SmartGrow fan target" → "Growbox 1 SmartGrow").
- [ ] Fan gauge: `Math.round` applied (73.6 → "74 %"); target null → "—".
- [ ] `actual NN %` span present iff `fanActual !== null` (linked fan `percentage` attr); absent otherwise.
- [ ] VPD line: value `.toFixed(2)` + " kPa · band X–Y"; band numbers from stage/phase; marker element present iff vpd !== null.
- [ ] Band label matrix: pos<0 → "too humid — below band"; 0..1 → "in band"; >1 → "too dry — above band"; null → "VPD unknown"; left/right axis always "humid"/"too dry" (v0.x wording regression).
- [ ] Sparkline: `<svg.spark-svg>` with 2 paths when ≥2 finite points; `.spark-empty` ("no history yet — recording…") when 0/1 points or fetch failed; header "ΔAH tent↔lung · last 24 h · now N.NN g/m³"; `now` segment absent when dah null.
- [ ] Chips: dehum chip text `💧 dehum ON|OFF|unavailable|<raw>`; class `on`/`off`/none exactly per §A4.
- [ ] DRY RUN vs "live" chip per dryRun bool; hidden when null.
- [ ] Camera: button `.camera-open` with `mdi:cctv` + "Live camera" iff camera resolved; clicking dispatches `hass-more-info` with `detail.entityId` (assert via event listener, NOT navigation); NO `<img>`/stream URL anywhere in the DOM (user directive — assert absence).
- [ ] Camera entity configured but entity missing from states → button STILL renders if id resolves (more-info handles absence) — pin chosen behavior.
- [ ] Terms row: 4 terms always render; value `NN%` or `—`; `.term-fill` width = `normalizeTerm(v)%` and never `NaN%`; active term gets `.active` class AND "active term: X" line; unknown active label → no line, no term active.
- [ ] Warning banner: exact element/text combos per §A6.
- [ ] hum chip + reason note per §A4.

### C3. Render per dehum/state matrix (table-driven)
- [ ] Table: for each (decision state × reason × dryRun × adaptation × oscillation × legacy) → expected chip text/class + banner + reason line. Implement as one `it.each` over a literal matrix so a new reason fails loudly until added.
- [ ] Same matrix with VPD below/in/above band → marker class `low`/`` (none)/`high` and label wording (axis-physics regression).

### C4. Update behavior
- [ ] Hass object REPLACED (connection flap): new `hass` reference with same states → re-render produces identical output; `hass: undefined` transiently → empty render, no throw; hass restored → full render returns (no stuck empty state).
- [ ] Rapid successive updates: 50 `hass` assignments in a microtask loop → final DOM matches final states; no duplicated chips (Lit template stability), no unhandled rejections from concurrent `_maybeLoadSparkline`.
- [ ] Sparkline dedup: same entity id across updates → `_sparkLoadedFor` prevents refetch (spy on fetch, assert 1 call); entity id CHANGES (override edit) → refetch fires; fetch rejects → `_sparkPoints = []` and `.spark-empty` shows (no unhandled promise rejection).
- [ ] Entity flaps unavailable→on rapidly: gauge goes `—` → value → `—` without the setup hint ever flashing (empty stays false because entity exists).

### C5. Config validation (`setConfig` + editor)
- [ ] `setConfig(null)` / `setConfig("x")` / `setConfig(42)` → throws "Invalid configuration".
- [ ] Minimal valid `{type: "custom:smartgrow-card"}` → accepted; prefix defaults to `DEFAULT_PREFIX`, `show_setup_hint` defaults true.
- [ ] Missing title → falls back to device name at render (config-side: no throw).
- [ ] Missing `device_id`/`prefix` entirely → no throw; auto-discovery path engages at render.
- [ ] Extra unknown keys (`{..., foo: 1}`) → accepted and preserved-or-ignored (pin which), never throws.
- [ ] `prefix: "sensor.smartgrow_smartgrow"` (domain pasted) → stripped by `resolveEntityIds` (existing behavior, keep a test).
- [ ] `entities` overrides: empty strings treated as unset (falls through to prefix-derived); override to a nonexistent entity → that value slot renders `—` while OTHERS still render (partial-override degradation).
- [ ] `camera_entity`/`lamp_entity` top-level overrides win over sources-sensor resolution (explicit > integration > none).
- [ ] `getStubConfig` returns `{type: ...}` with no prefix; `getCardSize()` = 6.
- [ ] Editor: prefix edit kept; emptied → default restored; override add/remove keeps siblings (existing editor tests — keep green through rework).

---

## D. THE 15 MUST-HAVE cases (ship gate — in priority order)

1. **Empty→setup hint:** no SmartGrow entities in states → `.setup-hint` renders, prefix named, no gauge chips; and given entity present but ALL `unavailable` → hint does NOT render (A1 vs A2 distinction — the radio-flap misdiagnosis guard).
2. **VPD computed fallback:** no vpd sensor + `vpd_computed` in sources → gauge shows the value (regression #1); sources missing entirely → "VPD unknown" wording, no crash.
3. **Phase never guessed:** phase sensor missing/`unknown` → chip `unknown`; never day/night from clock, lamp entity, or time-of-day.
4. **Renamed-device phase:** prefix-derived phase id missing but `sensor.*_smartgrow_phase` exists → resolved (v0.7.1 live bug).
5. **`toNumber` sentinel/zero table:** `"0"`→0, sentinels & junk → null, `"155"`→155 (live fixture values) — every downstream `—` rendering depends on this one function.
6. **Dehum chip matrix:** all 12 decision states (7 in-band reasons + unconfigured/dry_run/held_by_shared_arbitration + unavailable + missing) → exact chip label + class + reason line per §C3 table.
7. **Dehum `dead_zone` is null-class:** `state: "no_change"`, reason `dead_zone` → chip shows raw state, NO on/off class (a green "OFF" during dead_zone misleads the user into thinking the unit is commanded off).
8. **Warning banner combos:** oscillation-only / legacy-only / both / neither → exact banner content (the 26-flips/day incident visibility).
9. **Countdown pure-math table:** every §B numeric case incl. clamp-at-0, `run_s/every_min<=0` hidden, flap-reset semantics — countdown ships only if this table is green.
10. **Countdown injectable now:** helper takes `now` as a parameter; a test constructs midnight-crossing + DST-spanning cases — if `new Date()` appears inside the helper, this test is impossible and that's the design smell to fix first.
11. **Camera button contract:** button renders iff camera resolved; click dispatches `hass-more-info` with the right entityId; ZERO `<img>`/`camera_proxy`/`accessToken` strings in the DOM (prod-proven 403 trap).
12. **Render survival sweep:** for each of {hass undefined, all entities missing, all unavailable, sources wiped (empty attrs), degenerate band, NaN term values} → render completes, no throw, no "NaN"/"undefined"/"[object" text anywhere in `shadowRoot.textContent` (assert with a single regex over the whole shadow DOM).
13. **Hass-flap rapid update:** 50 successive hass swaps + one `undefined` in the middle → final DOM correct, no rejected promise, sparkline fetched once.
14. **Config robustness:** null/non-object throw; minimal config + unknown keys + empty-string overrides accepted; partial override degrades only the overridden slot.
15. **Live-fixture gate:** re-run `live.test.ts` assertions (vpd≠null, phase≠unknown, dah>0.2, camera truthy) AND add: no NaN in rendered output when the full production snapshot is mounted — the fixture IS the acceptance oracle for "not broken on the real tent".

---

## E. Visual regression strategy without screenshots

- **InnerHTML/outerHTML snapshots of PARTS, not whole cards:** wrap each region in the
  rework with a stable class or `part` attribute (`header`, `gauge-row`, `chip-row`,
  `band-bar`, `spark-wrap`, `warning-banner`) and snapshot per-part
  (`el.shadowRoot.querySelector('.chip-row')!.innerHTML`) via vitest `toMatchSnapshot`.
  Whole-card snapshots are too brittle (any copy tweak re-baselines everything);
  per-part snapshots localize diffs and survive unrelated edits.
- **Snapshot the STATE, not just markup:** for each §C3 matrix row, snapshot
  `{chipText, chipClass, bannerText, reasonLine}` as a tiny JSON object — diffable,
  reviewable, and immune to class-name refactors that don't change meaning.
- **Class-contract tests over pixel tests:** assert `phase-chip day|night|unknown`,
  `band-marker low|high|""`, `chip on|off|dryrun` — the visual system is class-driven
  (`styles.ts`), so class presence IS the visual assertion in jsdom.
- **Geometry stays pure:** `sparklineGeometry` path strings are deterministic — snapshot
  the `d` attributes for fixed inputs (golden path strings), incl. the flat-data
  ±0.025 min/max expansion branch.
- **Real-browser visual checks** stay in the playwright harness (below) — jsdom
  computes no layout, so bar widths/marker overlap/overflow are unverifiable here.

---

## F. What jsdom CANNOT cover — real-browser harness (playwright, `/dashboard-growbox/0`)

1. **Custom-element registration & dual-import race:** the #1 production failure mode
   (module fetched-but-never-executed, `@customElement` double-define, "Configuration
   error" with no console error). jsdom always executes the module exactly once — this
   class is INVISIBLE to vitest. Gate: ≥10 consecutive real loads, 10/10 render
   `smartgrow-card`, 0 `hui-error-card`.
2. **Lit stylesheet application / actual layout:** CSS custom properties
   (`--warning-color`), `adoptedStyleSheets` with real `CSSStyleSheet` (jsdom needs the
   shim), grid/flex overflow of the band bar, marker clamping VISUALLY, term bars
   exceeding 100% width.
3. **`ha-card` / `ha-icon` / more-info dialog integration:** the `hass-more-info` event
   must open the real HA dialog with a live camera stream (auth via HA's own pipeline).
   jsdom has no `ha-*` elements and no auth.
4. **Real `fetchHistory` against the HA REST API** (cache TTL, 401 on expired token,
   empty-history 404/200-with-empty shape) — jsdom tests use fakes.
5. **Timing real to production:** 60 s coordinator cadence, sparkline TTL refetch under
   real latency, `last_changed` actually advancing (incl. a real radio flap on the pump
   resetting the countdown).
6. **WebView parity:** desktop Chromium passing ≠ Android companion WebView — the two
   past WebView-only failures (ES2021 `??=` parse error, dialog hang) are exactly why
   the ES2020/babel chrome-75 target must be verified by loading the SERVED bundle
   (`/smartgrow/smartgrow-card.js?v=<ver>`) in the harness, not just in vitest.
7. **The served-bytes gate:** after release, fetch ALL historical `/smartgrow/v*/`
   URLs and byte-compare with `dist/smartgrow-card.js` (wildcard rule) — no unit test
   can see what HA actually serves.
8. **Long-run visual states:** oscillation banner persistence, lamp-day-off warning
   chip appearing after a real watchdog event — replay on the dashboard, not in jsdom.

Harness checklist per release: load dashboard → assert card element defined & rendered →
screenshot for eyeball diff → click camera button → dialog streams → console clean →
A/B ×10 → served-bundle byte-compare → one Android companion-app look for any
phone-facing change.

---

## G. Suite organization (proposed files)

- `state.edge.test.ts` — §A (table-driven `it.each` over sentinel/value matrices).
- `time.test.ts` — §B (pure countdown/lights-window helpers; created WITH the extraction).
- `render.test.ts` — §C1/C2/C4/C5 mount-based assertions (jsdom env, real Lit element,
  CSSStyleSheet shim like `full-lifecycle.test.cjs`).
- `dehum.matrix.test.ts` — §C3/D6/D7 decision-state table.
- Extend `regressions.test.ts` — the four symptoms stay; add renamed-phase and
  sources-wiped-bundle cases.
- `live.test.ts` — stays the production-snapshot gate; add the NaN-free render assert (D15).
