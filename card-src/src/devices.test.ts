import { describe, it, expect } from "vitest";
import { derivePrefixFromEntityId, listSmartGrowDevices } from "./state";

describe("derivePrefixFromEntityId", () => {
  it("strips domain + slug (integration default: doubled prefix)", () => {
    expect(derivePrefixFromEntityId("sensor.smartgrow_smartgrow_fan_target")).toBe("smartgrow_smartgrow");
  });
  it("handles multi-tent prefixes", () => {
    expect(derivePrefixFromEntityId("sensor.smartgrow_kitchen_fan_target")).toBe("smartgrow_kitchen");
  });
  it("handles all domains", () => {
    expect(derivePrefixFromEntityId("switch.smartgrow_smartgrow_adaptation")).toBe("smartgrow_smartgrow");
    expect(derivePrefixFromEntityId("binary_sensor.smartgrow_smartgrow_oscillation_warning")).toBe("smartgrow_smartgrow");
    expect(derivePrefixFromEntityId("select.smartgrow_smartgrow_stage")).toBe("smartgrow_smartgrow");
  });
  it("returns null for unknown slugs", () => {
    expect(derivePrefixFromEntityId("sensor.unrelated_temperature")).toBeNull();
  });
});

describe("listSmartGrowDevices", () => {
  it("derives devices from entity registry", () => {
    const hass = {
      entities: {
        "sensor.sg1_fan_target": { device_id: "dev1", entity_id: "sensor.smartgrow_smartgrow_fan_target" },
        "sensor.sg2_fan_target": { device_id: "dev2", entity_id: "sensor.smartgrow_tent2_fan_target" },
      },
      devices: { dev1: { name: "SmartGrow" }, dev2: { name_by_user: "Tent 2" } },
      states: {},
    };
    const devices = listSmartGrowDevices(hass as never);
    expect(devices).toHaveLength(2);
    expect(devices[0].label).toBe("SmartGrow");
    expect(devices[0].prefix).toBe("smartgrow_smartgrow");
    expect(devices[1].label).toBe("Tent 2");
    expect(devices[1].prefix).toBe("smartgrow_tent2");
  });
  it("falls back to prefix grouping when registry is missing (stripped hass)", () => {
    const hass = {
      states: {
        "sensor.smartgrow_smartgrow_fan_target": { state: "10" },
        "sensor.smartgrow_smartgrow_dah": { state: "1" },
      },
    };
    const devices = listSmartGrowDevices(hass as never);
    expect(devices).toHaveLength(1);
    expect(devices[0].prefix).toBe("smartgrow_smartgrow");
    expect(devices[0].device_id).toBe("prefix:smartgrow_smartgrow");
  });
  it("returns empty for undefined hass", () => {
    expect(listSmartGrowDevices(undefined)).toEqual([]);
  });
});
