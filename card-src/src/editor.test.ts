import { describe, it, expect } from "vitest";
import { resolveEntityIds } from "./state";
import { DEFAULT_PREFIX } from "./const";
import type { SmartGrowCardConfig } from "./types";

/** Mirror of the editor's config-merge logic, kept as pure functions for testing. */
function applyPrefix(cfg: SmartGrowCardConfig, prefix: string): SmartGrowCardConfig {
  return prefix ? { ...cfg, prefix } : { ...cfg, prefix: undefined };
}

function applyEntityOverride(
  cfg: SmartGrowCardConfig,
  key: string,
  value: string
): SmartGrowCardConfig {
  const entities = { ...(cfg.entities ?? {}) };
  if (value) entities[key as keyof SmartGrowCardConfig["entities"]] = value as never;
  else delete entities[key as keyof SmartGrowCardConfig["entities"]];
  return Object.keys(entities).length ? { ...cfg, entities } : { ...cfg, entities: undefined };
}

describe("editor config merging", () => {
  const base: SmartGrowCardConfig = { type: "custom:smartgrow-card" };

  it("defaults the prefix", () => {
    const ids = resolveEntityIds(DEFAULT_PREFIX, undefined);
    expect(ids.fan_target).toBe("sensor.smartgrow_smartgrow_fan_target");
  });

  it("keeps prefix edits", () => {
    const cfg = applyPrefix(base, "smartgrow_tent2");
    expect(cfg.prefix).toBe("smartgrow_tent2");
    const ids = resolveEntityIds(cfg.prefix!, undefined);
    expect(ids.fan_target).toBe("sensor.smartgrow_tent2_fan_target");
  });

  it("clears the prefix back to default when emptied", () => {
    const cfg = applyPrefix({ ...base, prefix: "x" }, "");
    expect(cfg.prefix).toBeUndefined();
    const ids = resolveEntityIds(cfg.prefix ?? DEFAULT_PREFIX, undefined);
    expect(ids.fan_target).toBe("sensor.smartgrow_smartgrow_fan_target");
  });

  it("adds and removes entity overrides", () => {
    let cfg = applyEntityOverride(base, "fan_target", "sensor.my_fan");
    expect(cfg.entities?.fan_target).toBe("sensor.my_fan");
    cfg = applyEntityOverride(cfg, "fan_target", "");
    expect(cfg.entities).toBeUndefined();
  });

  it("keeps other overrides when one is removed", () => {
    let cfg = applyEntityOverride(base, "fan_target", "sensor.a");
    cfg = applyEntityOverride(cfg, "dah", "sensor.b");
    cfg = applyEntityOverride(cfg, "fan_target", "");
    expect(cfg.entities?.dah).toBe("sensor.b");
    expect(cfg.entities?.fan_target).toBeUndefined();
    const ids = resolveEntityIds(DEFAULT_PREFIX, cfg.entities);
    expect(ids.fan_target).toBe("sensor.smartgrow_smartgrow_fan_target");
    expect(ids.dah).toBe("sensor.b");
  });
});
