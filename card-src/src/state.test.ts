import { describe, it, expect } from "vitest";
import {
  toNumber,
  toBool,
  clamp,
  bandForStage,
  normalizeTerm,
  bandPosition,
  vpdColorKey,
  dehumOn,
  dehumChip,
  resolveEntityIds,
  getBacking,
  deviceName,
  parseSmartGrowState,
  activeTermOf,
  phaseOf,
  sparklineGeometry,
  historyToPoints,
} from "./state";
import type { HomeAssistant, HAEntity } from "./types";

const hassWith = (states: Record<string, Partial<HAEntity>>): HomeAssistant =>
  ({
    states: Object.fromEntries(
      Object.entries(states).map(([k, v]) => [k, { entity_id: k, state: "unknown", attributes: {}, ...v }])
    ),
    callApi: async () => [],
  }) as unknown as HomeAssistant;

describe("toNumber", () => {
  it("parses plain numeric states", () => {
    expect(toNumber("42")).toBe(42);
    expect(toNumber("12.5")).toBe(12.5);
    expect(toNumber("-3.25")).toBe(-3.25);
    expect(toNumber(" 7 ")).toBe(7);
  });

  it("returns null for HA sentinel states", () => {
    expect(toNumber("unavailable")).toBeNull();
    expect(toNumber("unknown")).toBeNull();
    expect(toNumber("none")).toBeNull();
    expect(toNumber("")).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
  });

  it("returns null for non-numeric junk", () => {
    expect(toNumber("12 %")).toBeNull();
    expect(toNumber("abc")).toBeNull();
    expect(toNumber("1.2.3")).toBeNull();
  });
});

describe("toBool", () => {
  it("parses on/off/true/false/1/0", () => {
    expect(toBool("on")).toBe(true);
    expect(toBool("OFF")).toBe(false);
    expect(toBool("true")).toBe(true);
    expect(toBool("false")).toBe(false);
    expect(toBool("1")).toBe(true);
    expect(toBool("0")).toBe(false);
  });

  it("returns null otherwise", () => {
    expect(toBool("unavailable")).toBeNull();
    expect(toBool("maybe")).toBeNull();
    expect(toBool(undefined)).toBeNull();
  });
});

describe("clamp", () => {
  it("clamps into range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe("bandForStage", () => {
  it("returns documented bands per stage/phase", () => {
    expect(bandForStage("Seedling", "day")).toEqual({ low: 0.8, high: 1.1 });
    expect(bandForStage("Seedling", "night")).toEqual({ low: 0.6, high: 0.9 });
    expect(bandForStage("Vegetative", "day")).toEqual({ low: 1.1, high: 1.4 });
    expect(bandForStage("Flowering", "night")).toEqual({ low: 1.3, high: 1.6 });
  });

  it("falls back to the 1.3-1.6 band for unknown stages", () => {
    expect(bandForStage(undefined, "day")).toEqual({ low: 1.3, high: 1.6 });
    expect(bandForStage("Bloom", "night")).toEqual({ low: 1.3, high: 1.6 });
    expect(bandForStage("", "day")).toEqual({ low: 1.3, high: 1.6 });
  });
});

describe("normalizeTerm", () => {
  it("normalises term values to 0-100", () => {
    expect(normalizeTerm(0)).toBe(0);
    expect(normalizeTerm(70)).toBe(70);
    expect(normalizeTerm(140)).toBe(100);
    expect(normalizeTerm(-20)).toBe(0);
    expect(normalizeTerm(null)).toBe(0);
    expect(normalizeTerm(NaN)).toBe(0);
  });
});

describe("bandPosition", () => {
  it("positions inside the band", () => {
    expect(bandPosition(1.3, 1.3, 1.6)).toBeCloseTo(0);
    expect(bandPosition(1.45, 1.3, 1.6)).toBeCloseTo(0.5);
    expect(bandPosition(1.6, 1.3, 1.6)).toBeCloseTo(1);
  });

  it("extends and clamps outside the band", () => {
    expect(bandPosition(1.2, 1.3, 1.6)).toBe(-0.25); // extends below, clamped to -0.25
    expect(bandPosition(0.5, 1.3, 1.6)).toBe(-0.25);
    expect(bandPosition(2.5, 1.3, 1.6)).toBe(1.25);
  });

  it("returns null for missing vpd or degenerate band", () => {
    expect(bandPosition(null, 1.3, 1.6)).toBeNull();
    expect(bandPosition(NaN, 1.3, 1.6)).toBeNull();
    expect(bandPosition(1.4, 1.6, 1.3)).toBeNull();
  });
});

describe("vpdColorKey", () => {
  it("classifies the position", () => {
    expect(vpdColorKey(-0.1)).toBe("low");
    expect(vpdColorKey(0.5)).toBe("ok");
    expect(vpdColorKey(1.1)).toBe("high");
    expect(vpdColorKey(null)).toBe("unknown");
  });
});

describe("dehumOn / dehumChip", () => {
  it("parses on/off states", () => {
    expect(dehumOn("on")).toBe(true);
    expect(dehumOn("off")).toBe(false);
    expect(dehumOn("unavailable")).toBeNull();
  });

  it("parses action-style states", () => {
    expect(dehumOn("hold_on")).toBe(true);
    expect(dehumOn("assist_off")).toBe(false);
    expect(dehumOn("weird")).toBeNull();
  });

  it("builds a chip from a backing entity", () => {
    expect(dehumChip(undefined)).toEqual({ label: "—", on: null, reason: null });
    expect(dehumChip({ missing: true, unavailable: false })).toEqual({ label: "—", on: null, reason: null });
    const chip = dehumChip({ missing: false, unavailable: false, state: "on", attrs: { reason: "fan saturation" } });
    expect(chip).toEqual({ label: "ON", on: true, reason: "fan saturation" });
    const un = dehumChip({ missing: false, unavailable: true, state: "unavailable", attrs: {} });
    expect(un.label).toBe("unavailable");
  });
});

describe("resolveEntityIds", () => {
  it("derives ids from a prefix", () => {
    const ids = resolveEntityIds("smartgrow_smartgrow", undefined);
    expect(ids.fan_target).toBe("sensor.smartgrow_smartgrow_fan_target");
    expect(ids.dah).toBe("sensor.smartgrow_smartgrow_dah");
    expect(ids.stage).toBe("select.smartgrow_smartgrow_stage");
    expect(ids.adaptation).toBe("switch.smartgrow_smartgrow_adaptation");
    expect(ids.oscillation_warning).toBe("binary_sensor.smartgrow_smartgrow_oscillation_warning");
  });

  it("strips a domain from the prefix if the user pasted one", () => {
    const ids = resolveEntityIds("sensor.smartgrow_tent", undefined);
    expect(ids.fan_target).toBe("sensor.smartgrow_tent_fan_target");
  });

  it("lets explicit overrides win", () => {
    const ids = resolveEntityIds("smartgrow_x", { fan_target: "sensor.my_fan", dah: "sensor.my_dah" });
    expect(ids.fan_target).toBe("sensor.my_fan");
    expect(ids.dah).toBe("sensor.my_dah");
    expect(ids.stage).toBe("select.smartgrow_x_stage");
  });

  it("passes through override-only kinds like vpd", () => {
    const ids = resolveEntityIds("smartgrow_x", { vpd: "sensor.tent_vpd" });
    expect(ids.vpd).toBe("sensor.tent_vpd");
    expect(ids.fan_target).toBe("sensor.smartgrow_x_fan_target");
  });
});

describe("getBacking / deviceName", () => {
  it("marks missing entities", () => {
    const b = getBacking(hassWith({}), "sensor.nope");
    expect(b.missing).toBe(true);
    expect(getBacking(undefined, "sensor.nope").missing).toBe(true);
    expect(getBacking(hassWith({ "sensor.a": { state: "3" } }), "sensor.a").state).toBe("3");
  });

  it("flags unavailable entities", () => {
    expect(getBacking(hassWith({ "sensor.a": { state: "unavailable" } }), "sensor.a").unavailable).toBe(true);
    expect(getBacking(hassWith({ "sensor.a": { state: "unknown" } }), "sensor.a").unavailable).toBe(true);
    expect(getBacking(hassWith({ "sensor.a": { state: "5" } }), "sensor.a").unavailable).toBe(false);
  });

  it("derives a device name from friendly_name", () => {
    expect(deviceName({ missing: true, unavailable: false })).toBe("SmartGrow");
    expect(
      deviceName({ missing: false, unavailable: false, attrs: { friendly_name: "SmartGrow fan target" } })
    ).toBe("SmartGrow");
    expect(
      deviceName({ missing: false, unavailable: false, attrs: { friendly_name: "Tent 2 dehumidifier decision" } })
    ).toBe("Tent 2");
  });
});

describe("activeTermOf", () => {
  it("accepts known term labels", () => {
    expect(activeTermOf({ missing: false, unavailable: false, state: "dah" })).toBe("dah");
    expect(activeTermOf({ missing: false, unavailable: false, state: "need" })).toBe("need");
    expect(activeTermOf({ missing: false, unavailable: false, state: "min_fan" })).toBe("min_fan");
  });

  it("rejects missing/unavailable/unknown labels", () => {
    expect(activeTermOf({ missing: true, unavailable: false })).toBeNull();
    expect(activeTermOf({ missing: false, unavailable: true, state: "dah" })).toBeNull();
    expect(activeTermOf({ missing: false, unavailable: false, state: "bananas" })).toBeNull();
  });
});

describe("phaseOf", () => {
  it("reflects the integration phase sensor", () => {
    const ids = resolveEntityIds("smartgrow_smartgrow", undefined);
    expect(phaseOf(hassWith({
      "sensor.smartgrow_smartgrow_phase": { state: "night" },
    }), ids)).toBe("night");
  });
  it("unknown without the sensor — the card never invents a phase", () => {
    const ids = resolveEntityIds("smartgrow_smartgrow", undefined);
    expect(phaseOf(hassWith({}), ids)).toBe("unknown");
  });
});
describe("parseSmartGrowState", () => {
  const ids = resolveEntityIds("smartgrow_smartgrow", undefined);

  it("reports empty when nothing exists", () => {
    const s = parseSmartGrowState(hassWith({}), ids);
    expect(s.empty).toBe(true);
  });

  it("reports empty even when only unrelated entities exist", () => {
    const s = parseSmartGrowState(hassWith({ "sensor.other": { state: "1" } }), ids);
    expect(s.empty).toBe(true);
  });

  it("parses a fully populated state", () => {
    const hass = hassWith({
      "sensor.smartgrow_smartgrow_fan_target": { state: "64", attributes: { friendly_name: "SmartGrow fan target", fan_entity: "fan.tent" } },
      "sensor.smartgrow_smartgrow_fan_dah_term": { state: "52.5" },
      "sensor.smartgrow_smartgrow_fan_vpd_term": { state: "10" },
      "sensor.smartgrow_smartgrow_fan_need_term": { state: "0" },
      "sensor.smartgrow_smartgrow_fan_temp_term": { state: "0" },
      "sensor.smartgrow_smartgrow_active_fan_term": { state: "dah" },
      "sensor.smartgrow_smartgrow_dah": { state: "1.5" },
      "sensor.smartgrow_smartgrow_ah_tent": { state: "11.2" },
      "sensor.smartgrow_smartgrow_ah_lung_room": { state: "9.7" },
      "sensor.smartgrow_smartgrow_dehumidifier_decision": {
        state: "hold_off",
        attributes: { reason: "band reached", fan_pct: 64 },
      },
      "sensor.smartgrow_smartgrow_dry_run": { state: "on" },
      "switch.smartgrow_smartgrow_adaptation": { state: "on" },
      "binary_sensor.smartgrow_smartgrow_oscillation_warning": { state: "off" },
      "binary_sensor.smartgrow_smartgrow_legacy_automation_warning": { state: "off" },
      "sensor.smartgrow_smartgrow_cycles_24h": { state: "2" },
      "select.smartgrow_smartgrow_stage": { state: "Flowering" },
      "sensor.tent_vpd": { state: "1.42" },
      "fan.tent": { state: "on", attributes: { percentage: 60 } },
    });
    const s = parseSmartGrowState(hass, { ...ids, vpd: "sensor.tent_vpd" });
    expect(s.empty).toBe(false);
    expect(s.device).toBe("SmartGrow");
    expect(s.fanTarget).toBe(64);
    expect(s.fanActual).toBe(60);
    expect(s.terms.dah).toBeCloseTo(52.5);
    expect(s.terms.vpd).toBe(10);
    expect(s.activeTerm).toBe("dah");
    expect(s.dah).toBeCloseTo(1.5);
    expect(s.vpd).toBeCloseTo(1.42);
    // Band follows the stage table (day/night decided by the test-run clock)…
    expect([1.3, 1.5]).toContain(s.bandLow); // day/night dependent
    expect(s.dehumAction).toBe("hold_off");
    expect(s.dehumReason).toBe("band reached");
    expect(s.dehumFanPct).toBe(64);
    expect(s.dryRun).toBe(true);
    expect(s.adaptation).toBe(true);
    expect(s.oscillationWarning).toBe(false);
    expect(s.cycles24h).toBe(2);
    expect(s.stage).toBe("Flowering");
  });

  it("handles unavailable fan target gracefully", () => {
    const hass = hassWith({ "sensor.smartgrow_smartgrow_fan_target": { state: "unavailable" } });
    const s = parseSmartGrowState(hass, ids);
    expect(s.empty).toBe(false);
    expect(s.fanTarget).toBeNull();
  });

  it("prefers an explicit fallback band when the stage sensor is missing", () => {
    const hass = hassWith({ "sensor.smartgrow_smartgrow_fan_target": { state: "30" } });
    const s = parseSmartGrowState(hass, ids, { low: 1.3, high: 1.6 });
    expect(s.bandLow).toBe(1.3);
    expect(s.bandHigh).toBe(1.6);
  });
});

describe("sparklineGeometry / historyToPoints", () => {
  it("returns null for fewer than 2 points", () => {
    expect(sparklineGeometry([], 300, 54, 4)).toBeNull();
    expect(sparklineGeometry([{ t: 0, v: 1 }], 300, 54, 4)).toBeNull();
  });

  it("builds an svg path over a series", () => {
    const pts = [
      { t: 0, v: 1 },
      { t: 10, v: 2 },
      { t: 20, v: 3 },
    ];
    const g = sparklineGeometry(pts, 300, 54, 4)!;
    expect(g.line.startsWith("M")).toBe(true);
    expect(g.area).toContain("Z");
    expect(g.min).toBe(1);
    expect(g.max).toBe(3);
  });

  it("widens a flat series to avoid a degenerate scale", () => {
    const g = sparklineGeometry(
      [
        { t: 0, v: 2 },
        { t: 1, v: 2 },
      ],
      300,
      54,
      4
    )!;
    expect(g.max - g.min).toBeCloseTo(0.05);
  });

  it("converts HA history tuples to points, dropping junk", () => {
    const pts = historyToPoints(
      {
        "sensor.x": [
          [
            { state: "1.5", last_changed: "2026-09-10T00:00:00Z" },
            { state: "unavailable", last_changed: "2026-09-10T00:05:00Z" },
            { state: "2.0", last_changed: "2026-09-10T00:10:00Z" },
            { state: "3", last_changed: "not-a-date" },
          ],
        ],
      },
      "sensor.x"
    );
    expect(pts).toHaveLength(2);
    expect(pts[0].v).toBeCloseTo(1.5);
  });

  it("returns [] for malformed history", () => {
    expect(historyToPoints(undefined, "sensor.x")).toEqual([]);
    expect(historyToPoints({}, "sensor.x")).toEqual([]);
    expect(historyToPoints({ "sensor.x": [] }, "sensor.x")).toEqual([]);
    expect(historyToPoints({ "sensor.x": [null as never] }, "sensor.x")).toEqual([]);
  });
});
