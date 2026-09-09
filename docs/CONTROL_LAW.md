# The SmartGrow Control Law

This document explains the physics and the reasoning behind every term of the control law that SmartGrow ports from the production YAML automations. Facts are restricted to the build brief and the recorded production data bundled in `tests/fixtures/`.

## 1. Why absolute humidity, not relative

Relative humidity is temperature-dependent: the same amount of water per cubic metre reads as different RH at different temperatures. The production box measured 59 % RH at 24.3 °C holding almost exactly the same water as 54 % at 23.9 °C. Any control law that compares tent RH to lung-room RH across a temperature gradient chases an artefact.

SmartGrow therefore compares **absolute humidity** (g of water per m³ of air), computed with the Magnus formula:

```
es = 6.112 · (rh/100) · e^(17.62·t / (243.12+t))     # vapour pressure, hPa
ah = 216.7 · es / (273.15 + t)                       # g/m³
```

The moisture-transport demand is:

```
d_ah = max(0, ah_tent − ah_lung)
```

Zero when the rooms are equally moist — no transport needed. Positive when the tent is moister than the intake air, meaning ventilation can actually dry the tent. (If the tent were *drier* than the intake, ventilation would humidify it; the law treats that as "no moisture demand".)

## 2. The fan: a max of demand terms

```
low, high   = STAGE_BANDS[stage][day|night]     # VPD band, e.g. Flowering 1.5 / 1.3 kPa
max_temp    = STAGE_TEMP_MAX[stage][day|night]  # 28 day / 25 night for Flowering
min_temp    = STAGE_TEMP_MIN[stage][day|night]  # 20 day / 18 night
min_fan     = fan_floor_day|night               # 28 % / 20 %
cold        = tent_temp < min_temp
cold_mult   = 0.5 if cold else 1.0

fan_delta = d_ah · 35 · cold_mult
fan_vpd   = max(0, low − vpd) · 50 · cold_mult
fan_temp  = min(max(0, temp − (max_temp − 2)) · 25, 100)
fan_need  = round((50 + (low − vpd) · 200) · cold_mult)   if vpd < low  else 0
fan_target = int(min(max(fan_delta, fan_vpd, fan_temp, min_fan, fan_need), 100))
```

Why each term:

- **min_fan (28 day / 20 night)** — base ventilation. Air exchange, smell, and steady-state gas balance even with zero demand. Lower at night for noise and cold protection.
- **fan_delta = ΔAH · 35** — moisture transport. Scales linearly with the tent−lung moisture gap: the moister the tent relative to its intake air, the harder the fan must push to export water. At ΔAH ≈ 2 g/m³ the term alone demands ~70 %.
- **fan_vpd = shortfall · 50** — gentle VPD ramp-up as the tent drops below the band low. A linear "approach" term: 0.2 kPa below the band adds 10 %.
- **fan_need = 50 + shortfall · 200** — escalation. When VPD is meaningfully below the band, this term dominates hard (0.25 kPa below ⇒ 100 %), guaranteeing the tent climbs back into band quickly.
- **fan_temp** — heat escape. Engages *before* max_temp (at max−2 °C) so cooling is pre-emptive: 2 °C over the threshold already demands 50 %.
- **cold_mult = 0.5** — the cold clamp. On cold nights the VPD shortfall cannot be fixed by ventilation (incoming air is cold = dry in absolute terms but heating it lowers RH without removing water, and the lamp can only do so much). Halving the humidity-driven terms prevents the fan from freezing the tent chasing an unreachable target while the dehumidifier (which does not cool the tent) takes over.

`active_term` records which term won the max — that is the answer to "why is the fan at X %?".

## 3. The dehumidifier: fan % as the demand signal

Instead of a static RH threshold, the cascade uses the fan percentage as a *demand indicator* — the fan is the first-line actuator, and only when it saturates does the second stage engage:

```
OFF  if lung_rh < 44                                  # over-dry floor
     or tent_vpd ≥ low − 0.05                         # band reached
ON   if (dehum_is_on and tent_vpd < low − 0.05)       # hold while still needed
     or (fan_pct ≥ 70 and lung_rh ≥ floor + 3)        # saturation assist
     or tent_vpd < low − 0.1                          # severity backstop
else: no change                                        # dead zone, intentional
```

- **Over-dry floor (44 %)** — the dehumidifier stands in the *lung room* (the intake air source). Drying it below 44 % would over-dry the intake and, eventually, the room. This floor is absolute: nothing overrides it.
- **Band reached (low − 0.05)** — the anti-churn margin. The dehum does not switch off exactly at the target but 0.05 kPa *before* it, so sensor jitter cannot slam it off and immediately back on.
- **Hold while needed** — once on, it stays on until the OFF conditions fire. This is what killed the 26-flip-per-day oscillation of the old threshold automation (the negative fixture in `tests/test_oscillation.py`).
- **Saturation assist (fan ≥ 70 %, lung RH ≥ 47 %)** — if the fan is at its limit and the lung room still has ≥ 3 % RH headroom above the floor, ventilation alone cannot keep up and the dehum assists.
- **Severity backstop (VPD < low − 0.1)** — for cold nights where the ΔAH signal collapses (cold air carries little water) and the fan never reaches 70 %: a deep VPD deficit forces the dehum on regardless.
- **Dead zone** — between "band reached" (OFF) and the ON triggers there is an intentional no-change region. This gap *is* the hysteresis. Do not close it.

Measured on the recorded fixtures: 5-minute VPD noise is up to 0.19 kPa (p90) — an order of magnitude above the 0.05 margin, which is precisely why the margins and the dead zone exist.

## 4. Stage/phase tables

| Stage | Band low day/night (kPa) | Max temp day/night | Min temp day/night |
|---|---|---|---|
| Seedling | 0.8 / 0.6 | 28 / 25 | 20 / 20 |
| Vegetative | 1.1 / 0.9 | 29 / 26 | 19 / 19 |
| Flowering | 1.5 / 1.3 | 28 / 25 | 20 / 18 |

Night max = day max − 3. The recorded production box ran Flowering with the band helper switching 1.5–1.8 (day) and 1.3–1.6 (night) — matching these lows and their +0.3 highs.

## 5. Adaptation (P1)

Adaptation ships **enabled** with a convergence watchdog:

- **Oscillation detector** — flips/24h on the dehumidifier state; >12 triggers auto-widening of the anti-churn margin (step 0.02 kPa, cap 0.10) with warning above 6.
- **Gain adaptation** — least-squares estimate of d(ΔAH)/d(fan%) over the trailing window corrects the ΔAH gain (smoothed, ≤10 % per update).
- **Transpiration model** — rolling 7-day per-(phase, stage) moisture input (g/m³·h); at lights-on the last-learned excursion is pre-applied so the fan anticipates the evening transpiration spike.
- **Watchdog** — if the widened margin exceeds 40 % of the base margin or the gain factor strays >40 % from 1.0, adaptation auto-disables and raises a repair issue. Proven defaults always remain one switch away.

## 6. What the fixtures prove

`tests/` replays 7 days of real recorded data (5-min-or-on-change cadence) through this law:

- Fan parity: the recorded actuator tracks the temperature/floor terms at 99 % (±10 pp; see `tests/FAN_PARITY_FINDING.md` for the documented ΔAH-term caveat).
- Dehumidifier ON decisions: 100 % aligned with recorded power ramps (57/57, ±10 min).
- Oscillation regression: the recorded trace flips 38 times; the cascade replay with the adapted margin flips 4, and the churn window drops from 36 to 2 flips (≤ 6 guaranteed).
- Severity backstop: 47 cold-night samples where the backstop engages with fan < 70 %.
- VPD math cross-checks against the recorded template sensor to < 0.03 kPa (95 % of samples; stragglers explained by sparse RH recording).
