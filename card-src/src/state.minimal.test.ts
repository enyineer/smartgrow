/**
 * Minimal-build edge cases: no lung sensors, no dehum, no camera.
 *
 * The integration degrades by design; the card must surface the degraded
 * truth (lung "not configured", dehum tile as diagnostic) without
 * NaN/undefined leaking into the render.
 */
import { describe, it, expect } from "vitest";
import {
  parseSmartGrowState,
  applySourceEntities,
  resolveEntityIds,
} from "./state";
import type { HomeAssistant } from "./types-ha";

const PREFIX = "smartgrow_smartgrow";

function hassWith(states: Record<string, { state: string; attributes?: Record<string, unknown> }>): HomeAssistant {
  const out = { states: {} } as unknown as HomeAssistant;
  for (const [eid, def] of Object.entries(states)) {
    (out.states as Record<string, unknown>)[eid] = {
      entity_id: eid, state: def.state, attributes: def.attributes ?? {}, last_changed: "2026-09-15T12:00:00+00:00",
    };
  }
  return out;
}

const BASE = {
  "sensor.smartgrow_smartgrow_fan_target": { state: "55" },
  "sensor.smartgrow_smartgrow_dehumidifier_decision": {
    state: "on",
    attributes: { reason: "below_band", band_low: 1.5, band_high: 1.65, band_depth: 0.15 },
  },
  "sensor.smartgrow_smartgrow_stage": { state: "Flowering" },
  "sensor.smartgrow_smartgrow_adaptation": { state: "on" },
  "sensor.smartgrow_smartgrow_tent_temp": { state: "25.0" },
  "sensor.smartgrow_smartgrow_tent_rh": { state: "60" },
  "sensor.smartgrow_smartgrow_lung_temp": { state: "24.0" },
  "sensor.smartgrow_smartgrow_lung_rh": { state: "55" },
  "sensor.growbox_vpd": { state: "1.40" },
};

function idsWith(sources: Record<string, unknown>) {
  const hass = hassWith({
    ...BASE,
    "sensor.growbox_1_smartgrow_configured_sources": {
      state: "configured",
      attributes: sources,
    },
  });
  const ids = applySourceEntities(
    hass,
    PREFIX,
    resolveEntityIds(PREFIX, undefined),
    undefined
  );
  return { hass, ids };
}

function parse(hass: HomeAssistant) {
  return parseSmartGrowState(hass, applySourceEntities(hass, PREFIX, resolveEntityIds(PREFIX, undefined), undefined), { low: 1.3, high: 1.6 });
}

function sourcesFor(lung: boolean, dehum: boolean, camera: boolean) {
  const a: Record<string, unknown> = {
    fan_entity: "fan.demo",
    tent_temp_entity: "sensor.demo_tent_temp",
    tent_rh_entity: "sensor.demo_tent_rh",
    vpd_entity: "sensor.growbox_vpd",
    lamp_entity: "light.demo_lamp",
    vpd_computed: 1.4,
  };
  if (lung) {
    a.lung_temp_entity = "sensor.demo_lung_temp";
    a.lung_rh_entity = "sensor.demo_lung_rh";
  }
  if (dehum) a.dehum_entity = "switch.demo_dehum";
  if (camera) a.camera_entity = "camera.demo";
  return a;
}

describe("minimal builds", () => {
  it("no lung sensors: lungConfigured false, tent values still read", () => {
    const hass = hassWith({
      ...BASE,
      "sensor.demo_tent_temp": { state: "25.0" },
      "sensor.demo_tent_rh": { state: "60" },
      "sensor.growbox_1_smartgrow_configured_sources": {
        state: "configured",
        attributes: sourcesFor(false, true, false),
      },
    });
    const s = parse(hass);
    expect(s.lungConfigured).toBe(false);
    expect(s.tentTemp).toBe(25.0);
    expect(s.tentRh).toBe(60);
    expect(s.lungTemp).toBeNull();
  });

  it("no dehum: decision entity is integration-owned and still parsed", () => {
    const hass = hassWith({
      ...BASE,
      "sensor.growbox_1_smartgrow_configured_sources": {
        state: "configured",
        attributes: sourcesFor(true, false, false),
      },
    });
    const s = parse(hass);
    expect(s.dehumAction).toBe("on");
    expect(s.dehumBand.low).toBe(1.5);
  });

  it("no camera: camera id resolves to undefined without throw", () => {
    const hass = hassWith({
      ...BASE,
      "sensor.growbox_1_smartgrow_configured_sources": {
        state: "configured",
        attributes: sourcesFor(true, true, false),
      },
    });
    const ids = applySourceEntities(hass, PREFIX, resolveEntityIds(PREFIX, undefined), undefined);
    expect(ids.camera).toBeUndefined();
  });

  it("no sources sensor at all: parses without throw; vpd null unless linked id exists", () => {
    const hass = hassWith({ ...BASE });
    const s = parseSmartGrowState(
      hass,
      applySourceEntities(hass, PREFIX, resolveEntityIds(PREFIX, undefined), undefined),
      { low: 1.3, high: 1.6 }
    );
    expect(s.lungConfigured).toBe(false);
    // 'sensor.growbox_vpd' is not prefix-derived and sources is absent, so
    // the card cannot know the id -> vpd null -> render shows 'VPD unknown'.
    expect(s.vpd).toBeNull();
  });
});
