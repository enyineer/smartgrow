/**
 * Regression tests for the four symptoms Niggo reported on 2026-09-13:
 *  1. "VPD unknown"            -> card must fall back to sources.vpd_computed
 *  2. "day pill unknown"       -> phaseOf must use the lamp from sources.lamp_entity
 *  3. "ΔAH tent − lung 0.00"   -> dah sensor state must surface, not collapse
 *  4. "camera image broken"    -> ids.camera must resolve via sources.camera_entity
 * All four were caused by the integration's sources map being wiped (options
 * replace) — but the card must ALSO handle each gracefully.
 */
import { describe, it, expect } from "vitest";
import {
  parseSmartGrowState,
  phaseOf,
  applySourceEntities,
  sourceEntityMap,
} from "./state";
import type { HomeAssistant } from "./types";

const SOURCES_ID = "sensor.growbox_1_smartgrow_configured_sources";

const LIVE: Record<string, any> = {
  [SOURCES_ID]: {
    state: "configured",
    attributes: {
      fan_entity: "fan.ec_luefter",
      tent_temp_entity: "sensor.temp_rh_sensor_temperature",
      tent_rh_entity: "sensor.temp_rh_sensor_humidity",
      lung_temp_entity: "sensor.0xa4c138be0ce5db67_temperature",
      lung_rh_entity: "sensor.0xa4c138be0ce5db67_humidity",
      dehum_entity: "switch.dehumidifier",
      hum_entity: "humidifier.x",
      lamp_entity: "light.growlampe_light_0",
      camera_entity: "camera.growbox_growcam_hd_stream",
      vpd_entity: null, // deliberately unlinked -> computed fallback
      vpd_computed: 0.976,
    },
  },
  "fan.ec_luefter": { state: "on", attributes: { percentage: 74 } },
  "sensor.temp_rh_sensor_temperature": { state: "23.4" },
  "sensor.temp_rh_sensor_humidity": { state: "66" },
  "sensor.0xa4c138be0ce5db67_temperature": { state: "24.0" },
  "sensor.0xa4c138be0ce5db67_humidity": { state: "59" },
  "light.growlampe_light_0": { state: "on" },
  "camera.growbox_growcam_hd_stream": { state: "idle", attributes: {} },
  // integration-owned diagnostics (prefix smartgrow_smartgrow)
  "sensor.smartgrow_smartgrow_fan_target": { state: "100" },
  "sensor.smartgrow_smartgrow_fan_dah_term": { state: "0" },
  "sensor.smartgrow_smartgrow_fan_vpd_term": { state: "22.7" },
  "sensor.smartgrow_smartgrow_fan_need_term": { state: "155" },
  "sensor.smartgrow_smartgrow_fan_temp_term": { state: "0" },
  "sensor.smartgrow_smartgrow_active_fan_term": { state: "need" },
  "sensor.smartgrow_smartgrow_dah": { state: "1.04" },
  "sensor.smartgrow_smartgrow_ah_tent": { state: "13.85" },
  "sensor.smartgrow_smartgrow_ah_lung_room": { state: "12.81" },
  "sensor.smartgrow_smartgrow_dehumidifier_decision": {
    state: "on",
    attributes: { reason: "hold_still_needed", fan_pct: 74 },
  },
  "sensor.smartgrow_smartgrow_dry_run": { state: "on" },
  "sensor.growbox_1_smartgrow_phase": { state: "day" },
  "select.smartgrow_smartgrow_stage": { state: "Flowering" },
};

const hass = () => ({ states: LIVE }) as unknown as HomeAssistant;

const baseIds = {
  fan_target: "sensor.smartgrow_smartgrow_fan_target",
  fan_dah_term: "sensor.smartgrow_smartgrow_fan_dah_term",
  fan_vpd_term: "sensor.smartgrow_smartgrow_fan_vpd_term",
  fan_need_term: "sensor.smartgrow_smartgrow_fan_need_term",
  fan_temp_term: "sensor.smartgrow_smartgrow_fan_temp_term",
  active_fan_term: "sensor.smartgrow_smartgrow_active_fan_term",
  dah: "sensor.smartgrow_smartgrow_dah",
  ah_tent: "sensor.smartgrow_smartgrow_ah_tent",
  ah_lung_room: "sensor.smartgrow_smartgrow_ah_lung_room",
  dehumidifier_decision: "sensor.smartgrow_smartgrow_dehumidifier_decision",
  dry_run: "sensor.smartgrow_smartgrow_dry_run",
  stage: "select.smartgrow_smartgrow_stage",
  phase: "sensor.growbox_1_smartgrow_phase",
};

describe("regression: the four card symptoms", () => {
  it("1. VPD falls back to vpd_computed when no sensor is linked", () => {
    const ids = applySourceEntities(hass(), "smartgrow_smartgrow", { ...baseIds }, undefined);
    const s = parseSmartGrowState(hass(), ids);
    expect(s.vpd).toBeCloseTo(0.976, 3);
    expect(s.vpd).not.toBeNull();
  });

  it("2. day pill resolves via sources lamp entity", () => {
    const ids = applySourceEntities(hass(), "smartgrow_smartgrow", { ...baseIds }, undefined);
    expect(ids.lamp).toBe("light.growlampe_light_0");
    const phase = phaseOf(hass(), ids as never);
    expect(phase).toBe("day");
  });

  it("3. ΔAH surfaces the real tent/lung difference", () => {
    const ids = applySourceEntities(hass(), "smartgrow_smartgrow", { ...baseIds }, undefined);
    const s = parseSmartGrowState(hass(), ids);
    // tent 13.85 vs lung 12.81 -> dAH ≈ 1.04 g/m³, NOT 0.00
    expect(s.dah).not.toBeNull();
    expect(s.dah as number).toBeGreaterThan(0.5);
    // the ΔAH fan % term is a different thing (0 when lung is drier than tent)
    expect(s.terms.dah).toBe(0);
  });

  it("4. camera entity resolves via sources for the img element", () => {
    const ids = applySourceEntities(hass(), "smartgrow_smartgrow", { ...baseIds }, undefined);
    expect(ids.camera).toBe("camera.growbox_growcam_hd_stream");
    // and the entity exists in hass states so the <img> src renders
    expect(hass().states?.["camera.growbox_growcam_hd_stream"]).toBeTruthy();
  });

  it("sources map tolerates a missing sources sensor", () => {
    const empty = { states: {} } as unknown as HomeAssistant;
    expect(sourceEntityMap(empty, "x")).toEqual({});
    // and applySourceEntities keeps prefix-derived ids intact
    const ids = applySourceEntities(empty, "smartgrow_smartgrow", { ...baseIds }, undefined);
    expect(ids.fan_target).toBe(baseIds.fan_target);
  });
});
