import { describe, it, expect } from "vitest";
import { parseSmartGrowState, applySourceEntities, resolveEntityIds, phaseOf } from "./state";
import type { HomeAssistant } from "./types";

// LIVE snapshot pulled from production HA
import live from "./live-states.json";

const hass = { states: live } as unknown as HomeAssistant;

describe("LIVE production data through the real card parser", () => {
  it("resolves vpd/camera/lamp and computes a sane card state", () => {
    const prefix = "smartgrow_smartgrow";
    let ids = resolveEntityIds(prefix, undefined);
    ids = applySourceEntities(hass, prefix, ids, undefined);
    console.log("ids.vpd    =", ids.vpd);
    console.log("ids.camera =", ids.camera);
    console.log("ids.lamp   =", ids.lamp);
    const s = parseSmartGrowState(hass, ids, { low: 1.5, high: 1.8 });
    console.log("s.vpd      =", s.vpd);
    console.log("s.phase    =", s.phase);
    console.log("s.dah      =", s.dah);
    console.log("s.empty    =", s.empty);
    // the four field symptoms must never come back:
    expect(s.vpd).not.toBeNull();           // VPD unknown
    expect(s.phase).not.toBe("unknown");    // day pill unknown
    expect((s.dah ?? 0)).toBeGreaterThan(0.2); // ΔAH = 0.00 collapse
    expect(ids.camera).toBeTruthy();        // camera image broken
  });
});
