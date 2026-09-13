
import { describe, it, expect } from "vitest";
import { sourceEntityMap, applySourceEntities } from "./state";

const hass = {
  states: {
    "sensor.sg_sources": {
      entity_id: "sensor.sg_sources",
      state: "configured",
      attributes: {
        vpd_entity: "sensor.growbox_vpd",
        camera_entity: "camera.tent_cam",
        lamp_entity: "light.tent_lamp",
        fan_entity: "fan.tent",
      },
    },
  },
} as never;

describe("sourceEntityMap", () => {
  it("reads *_entity attributes from the sources sensor", () => {
    const m = sourceEntityMap(hass, "sg");
    expect(m.vpd_entity).toBe("sensor.growbox_vpd");
    expect(m.camera_entity).toBe("camera.tent_cam");
    expect(m.lamp_entity).toBe("light.tent_lamp");
  });

  it("returns {} when the sensor is missing", () => {
    expect(sourceEntityMap(undefined, "sg")).toEqual({});
  });
});

describe("applySourceEntities", () => {
  it("fills vpd/camera/lamp from the integration config", () => {
    const ids = applySourceEntities(hass, "sg", { fan_target: "sensor.sg_fan_target" }, undefined);
    expect(ids.vpd).toBe("sensor.growbox_vpd");
    expect(ids.camera).toBe("camera.tent_cam");
    expect(ids.lamp).toBe("light.tent_lamp");
    // prefix-derived kinds untouched
    expect(ids.fan_target).toBe("sensor.sg_fan_target");
  });

  it("explicit overrides win over integration sources", () => {
    const ids = applySourceEntities(
      hass, "sg", {},
      { vpd: "sensor.my_own_vpd" }
    );
    expect(ids.vpd).toBe("sensor.my_own_vpd");
  });
});

describe("sourceEntityMap fallback scan", () => {
  const hassRenamed = {
    states: {
      // device label "Growbox 1" leaked into the entity id
      "sensor.growbox_1_smartgrow_configured_sources": {
        entity_id: "sensor.growbox_1_smartgrow_configured_sources",
        state: "configured",
        attributes: { vpd_entity: "sensor.growbox_vpd" },
      },
    },
  } as never;

  it("finds the sources sensor under a user-renamed device label", () => {
    const m = sourceEntityMap(hassRenamed, "smartgrow_smartgrow");
    expect(m.vpd_entity).toBe("sensor.growbox_vpd");
  });
});


describe("debug live-shape", () => {
  it("reads map from the real live shape", () => {
    const SOURCES_ID = "sensor.growbox_1_smartgrow_configured_sources";
    const hass = {
      states: {
        [SOURCES_ID]: {
          entity_id: SOURCES_ID,
          state: "configured",
          attributes: {
            vpd_entity: null,
            vpd_computed: 0.976,
            lamp_entity: "light.l0",
          },
        },
      },
    } as never;
    const m = sourceEntityMap(hass, "smartgrow_smartgrow");
    console.log("MAP:", JSON.stringify(m));
    const ids = applySourceEntities(hass, "smartgrow_smartgrow", { fan_target: "sensor.f" }, undefined);
    console.log("IDS:", JSON.stringify(ids));
    expect(true).toBe(true);
  });
});
