import { describe, it, expect } from "vitest";
import { phaseOf, parseSmartGrowState, resolveEntityIds } from "./state";

function mkHass(states: Record<string, { state: string; attributes?: Record<string, unknown> }>) {
  return { states } as never;
}

const ids = resolveEntityIds("smartgrow_smartgrow", undefined);

describe("phaseOf (integration-sourced only)", () => {
  it("returns what the integration phase sensor reports (night)", () => {
    const hass = mkHass({
      "sensor.smartgrow_smartgrow_phase": { state: "night" },
    });
    expect(phaseOf(hass, ids)).toBe("night");
  });
  it("returns day when the integration says day", () => {
    const hass = mkHass({
      "sensor.smartgrow_smartgrow_phase": { state: "day" },
    });
    expect(phaseOf(hass, ids)).toBe("day");
  });
  it("unknown when the phase sensor is missing — never guesses from the clock", () => {
    const hass = mkHass({});
    expect(phaseOf(hass, ids)).toBe("unknown");
  });
});

describe("parseSmartGrowState degradation", () => {
  it("marks lamp-less installs degraded but still parses", () => {
    const hass = mkHass({
      "sensor.smartgrow_smartgrow_fan_target": { state: "40" },
      "sensor.smartgrow_smartgrow_phase": { state: "unknown" },
      "sensor.smartgrow_smartgrow_degraded": {
        state: "ok",
        attributes: {
          lamp: true,
          lung: false,
          vpd_sensor: true,
          dehum: false,
        },
      },
    });
    const s = parseSmartGrowState(hass, ids);
    expect(s.fanTarget).toBe(40);
    expect(s.phase).toBe("unknown");
  });
});
