import { describe, it, expect } from "vitest";
import { wavemakerStatus } from "./time";

// Pin the "unconfigured" semantics the card tile relies on:
// mode none + no entity -> invisible; card hides the tile on that signal.

describe("wavemaker unconfigured semantics", () => {
  it("mode none + entity null -> invisible", () => {
    const s = wavemakerStatus(
      { mode: "none", runS: null, everyMin: null },
      null,
      null,
      0,
      null
    );
    expect(s.visible).toBe(false);
    expect(s.label).toBeNull();
  });

  it("mode null (never configured) -> invisible", () => {
    const s = wavemakerStatus(
      { mode: null, runS: null, everyMin: null },
      null,
      null,
      0,
      null
    );
    expect(s.visible).toBe(false);
  });

  it("entity configured but mode none -> invisible (config gap)", () => {
    const s = wavemakerStatus(
      { mode: "none", runS: null, everyMin: null },
      false,
      0,
      0,
      null
    );
    expect(s.visible).toBe(false);
  });

  it("mode set but entity missing -> visible with unreachable (card hides via entity check)", () => {
    const s = wavemakerStatus(
      { mode: "interval", runS: 120, everyMin: 180 },
      null,
      null,
      0,
      null
    );
    expect(s.visible).toBe(true);
    expect(s.label).toContain("unreachable");
  });
});
