/**
 * Device-label prefix discovery: the integration registers some entities
 * under time.<device>_smartgrow_* (e.g. growbox_1_smartgrow) while the card
 * prefix is the entity prefix (smartgrow_smartgrow). The card must follow the
 * ids that actually exist — "Lights on/off: -" was exactly this bug.
 */
import { describe, it, expect } from "vitest";
import {
  parseSmartGrowState,
  resolveEntityIds,
  applySourceEntities,
} from "./state";
import type { HomeAssistant } from "./types-ha";

const PREFIX = "smartgrow_smartgrow";

function hassWith(states: Record<string, { state: string }>): HomeAssistant {
  const out = { states: {} } as unknown as HomeAssistant;
  for (const [eid, def] of Object.entries(states)) {
    (out.states as Record<string, unknown>)[eid] = {
      entity_id: eid, state: def.state, attributes: {}, last_changed: "2026-09-15T12:00:00+00:00",
    };
  }
  return out;
}

describe("device-label lights discovery", () => {
  it("finds time.growbox_1_smartgrow_lights_* when prefix-derived ids are absent", () => {
    const hass = hassWith({
      "sensor.smartgrow_smartgrow_fan_target": { state: "55" },
      "sensor.smartgrow_smartgrow_dehumidifier_decision": { state: "off" },
      "time.growbox_1_smartgrow_lights_on": { state: "20:00:00" },
      "time.growbox_1_smartgrow_lights_off": { state: "08:00:00" },
      "sensor.growbox_1_smartgrow_configured_sources": {
        state: "configured",
        attributes: { fan_entity: "fan.demo" },
      } as never,
      "sensor.growbox_vpd": { state: "1.4" },
    });
    const ids = applySourceEntities(hass, PREFIX, resolveEntityIds(PREFIX, undefined), undefined);
    const s = parseSmartGrowState(hass, ids, { low: 1.3, high: 1.6 });
    expect(s.lightsOn).toBe("20:00:00");
    expect(s.lightsOff).toBe("08:00:00");
  });

  it("prefers the prefix-derived id when it exists (no wrong grab)", () => {
    const hass = hassWith({
      "sensor.smartgrow_smartgrow_fan_target": { state: "55" },
      "time.smartgrow_smartgrow_lights_on": { state: "19:00:00" },
      "time.smartgrow_smartgrow_lights_off": { state: "07:00:00" },
      "time.growbox_1_smartgrow_lights_on": { state: "20:00:00" },
      "time.growbox_1_smartgrow_lights_off": { state: "08:00:00" },
      "sensor.growbox_vpd": { state: "1.4" },
    });
    const ids = applySourceEntities(hass, PREFIX, resolveEntityIds(PREFIX, undefined), undefined);
    const s = parseSmartGrowState(hass, ids, { low: 1.3, high: 1.6 });
    expect(s.lightsOn).toBe("19:00:00");
    expect(s.lightsOff).toBe("07:00:00");
  });
});
