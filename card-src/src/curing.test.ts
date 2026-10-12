import { describe, expect, it } from "vitest";
import {
  discoverCuringSummary,
  parseCuringState,
  curingIsFine,
  curingStatusIsFine,
} from "./state";
import type { HomeAssistant } from "./types-ha";

function hassWith(states: Record<string, { state: string; attributes?: Record<string, unknown> }>): HomeAssistant {
  return {
    states: Object.fromEntries(
      Object.entries(states).map(([eid, s]) => [
        eid,
        {
          entity_id: eid,
          state: s.state,
          attributes: { friendly_name: eid, ...s.attributes },
          last_changed: "",
          last_updated: "",
          context: { id: "x", parent_id: null, user_id: null },
        },
      ])
    ),
  } as unknown as HomeAssistant;
}

describe("curing state", () => {
  it("discovers the summary sensor", () => {
    const hass = hassWith({
      "sensor.jars_curing_summary": { state: "ok" },
      "sensor.growbox_1_smartgrow_fan_target": { state: "40" },
    });
    expect(discoverCuringSummary(hass)).toBe("sensor.jars_curing_summary");
  });

  it("returns null when no curing device exists (grow-only install)", () => {
    const hass = hassWith({
      "sensor.growbox_1_smartgrow_fan_target": { state: "40" },
    });
    expect(discoverCuringSummary(hass)).toBeNull();
  });

  it("parses summary + jars", () => {
    const hass = hassWith({
      "sensor.jars_curing_summary": {
        state: "too_warm",
        attributes: {
          ok_count: 1,
          total: 2,
          temp_band: [15, 23],
          rh_band: [55, 65],
          needs_attention: ["Glas 2"],
        },
      },
      "sensor.jars_curing_glas_1": {
        state: "ok",
        attributes: { temperature: 18.1, humidity: 62, reasons: [] },
      },
      "sensor.jars_curing_glas_2": {
        state: "too_warm",
        attributes: { temperature: 26.2, humidity: 60, reasons: ["temp 26.2 > 23 °C"] },
      },
      // a non-jar sensor that must NOT be picked up:
      "sensor.jars_curing_summary_x": { state: "something" },
    });
    const s = parseCuringState(hass, "sensor.jars_curing_summary")!;
    expect(s.worst).toBe("too_warm");
    expect(s.okCount).toBe(1);
    expect(s.total).toBe(2);
    expect(s.tempBand).toEqual([15, 23]);
    expect(s.needsAttention).toEqual(["Glas 2"]);
    expect(s.jars.map((j) => j.entityId)).toEqual([
      "sensor.jars_curing_glas_1",
      "sensor.jars_curing_glas_2",
    ]);
    expect(s.jars[0].temp).toBe(18.1);
    expect(s.jars[1].status).toBe("too_warm");
  });

  it("classifies fine statuses", () => {
    expect(curingIsFine({ worst: "ok" } as never)).toBe(true);
    expect(curingIsFine({ worst: "too_humid" } as never)).toBe(false);
    expect(curingStatusIsFine("temp_only")).toBe(true);
    expect(curingStatusIsFine("unavailable")).toBe(false);
  });

  it("survives a missing summary entity", () => {
    const hass = hassWith({});
    expect(parseCuringState(hass, "sensor.nope_curing_summary")).toBeNull();
  });
});
