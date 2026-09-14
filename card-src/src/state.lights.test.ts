/**
 * Lights schedule source precedence: integration-owned time.* entities are
 * the source of truth (they self-default even when entry.data was never
 * persisted); sources-sensor attrs are only a fallback.
 */
import { describe, it, expect } from "vitest";
import { parseSmartGrowState, resolveEntityIds, applySourceEntities } from "./state";
import type { HomeAssistant } from "./types-ha";

const PREFIX = "growbox_1_smartgrow";

function hassWith(states: Record<string, { state: string; attributes?: Record<string, unknown> }>): HomeAssistant {
  const out = { states: {} } as unknown as HomeAssistant;
  for (const [eid, def] of Object.entries(states)) {
    (out.states as Record<string, unknown>)[eid] = {
      entity_id: eid, state: def.state, attributes: def.attributes ?? {}, last_changed: "2026-09-15T12:00:00+00:00",
    };
  }
  return out;
}

function sourcesAttrs(lightsOn?: string, lightsOff?: string) {
  return {
    fan_entity: "fan.demo",
    tent_temp_entity: "sensor.demo_tent_temp",
    tent_rh_entity: "sensor.demo_tent_rh",
    vpd_entity: "sensor.growbox_vpd",
    ...(lightsOn ? { lights_on_time: lightsOn } : {}),
    ...(lightsOff ? { lights_off_time: lightsOff } : {}),
  };
}

describe("lights schedule source precedence", () => {
  it("time.* entities win when present (entry.data never persisted)", () => {
    const hass = hassWith({
      "time.growbox_1_smartgrow_lights_on": { state: "20:00" },
      "time.growbox_1_smartgrow_lights_off": { state: "08:00" },
      "sensor.growbox_1_smartgrow_configured_sources": {
        state: "configured",
        attributes: sourcesAttrs(), // attrs absent: the v0.10.2 bug
      },
      "sensor.growbox_vpd": { state: "1.4" },
    });
    const ids = applySourceEntities(hass, PREFIX, resolveEntityIds(PREFIX, undefined), undefined);
    const s = parseSmartGrowState(hass, ids, { low: 1.3, high: 1.6 });
    expect(s.lightsOn).toBe("20:00");
    expect(s.lightsOff).toBe("08:00");
  });

  it("falls back to sources attrs when time.* entities are missing", () => {
    const hass = hassWith({
      "sensor.growbox_1_smartgrow_configured_sources": {
        state: "configured",
        attributes: sourcesAttrs("19:30", "07:30"),
      },
      "sensor.growbox_vpd": { state: "1.4" },
    });
    const ids = applySourceEntities(hass, PREFIX, resolveEntityIds(PREFIX, undefined), undefined);
    const s = parseSmartGrowState(hass, ids, { low: 1.3, high: 1.6 });
    expect(s.lightsOn).toBe("19:30");
    expect(s.lightsOff).toBe("07:30");
  });

  it("neither present: null -> countdown hidden, no throw", () => {
    const hass = hassWith({ "sensor.growbox_vpd": { state: "1.4" } });
    const ids = applySourceEntities(hass, PREFIX, resolveEntityIds(PREFIX, undefined), undefined);
    const s = parseSmartGrowState(hass, ids, { low: 1.3, high: 1.6 });
    expect(s.lightsOn).toBeNull();
    expect(s.lightsOff).toBeNull();
  });
});
