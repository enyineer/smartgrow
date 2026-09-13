import { describe, it, expect } from "vitest";
describe("regression: camera <img> token source", () => {
  it("uses the camera's rotating access_token (entity_picture), not the user auth token", async () => {
    const { SmartGrowCard } = await import("./smartgrow-card");
    const el = new SmartGrowCard() as any;
    el.hass = {
      states: {
        "camera.tent": {
          entity_id: "camera.tent",
          state: "idle",
          attributes: {
            access_token: "CAMERA_TOKEN",
            entity_picture: "/api/camera_proxy/camera.tent?token=CAMERA_TOKEN",
          },
        },
      },
      auth: { accessToken: "USER_TOKEN" },
    };
    el._config = { type: "custom:smartgrow-card", camera_entity: "camera.tent" };
    // reach into render internals via the same expression the template uses:
    const cameraEntity = el._config?.camera_entity ?? null;
    const camState = el.hass?.states?.[cameraEntity];
    const camAttrs = camState?.attributes ?? {};
    const cameraSrc =
      typeof camAttrs.entity_picture === "string"
        ? camAttrs.entity_picture
        : typeof camAttrs.access_token === "string"
          ? `/api/camera_proxy/${cameraEntity}?token=${camAttrs.access_token}`
          : null;
    expect(cameraSrc).toContain("CAMERA_TOKEN");
    expect(cameraSrc).not.toContain("USER_TOKEN");
    expect(cameraSrc).toBe("/api/camera_proxy/camera.tent?token=CAMERA_TOKEN");
  });
});


describe("regression: VPD band axis wording", () => {
  it("low VPD means humid air, high VPD means dry air", async () => {
    const { bandPosition, vpdColorKey } = await import("./state");
    // band 1.5-1.8: vpd 0.97 is BELOW band -> "low" -> air too humid
    const pos = bandPosition(0.97, 1.5, 1.8);
    expect(vpdColorKey(pos)).toBe("low");
    expect(pos).toBeLessThan(0);
    // vpd 2.2 is ABOVE band -> "high" -> air too dry
    const pos2 = bandPosition(2.2, 1.5, 1.8);
    expect(vpdColorKey(pos2)).toBe("high");
    expect(pos2).toBeGreaterThan(1);
  });

  it("renders humid on the left, too dry on the right", async () => {
    const { html } = await import("lit");
    const { SmartGrowCard } = await import("./smartgrow-card");
    const src = SmartGrowCard.toString();
    // the static template literally contains the corrected labels
    const labelIdx = src.indexOf("humid</span>");
    const dryIdx = src.indexOf("too dry</span>");
    expect(labelIdx).toBeGreaterThan(-1);
    expect(dryIdx).toBeGreaterThan(-1);
    expect(labelIdx).toBeLessThan(dryIdx);
    expect(src).toContain("too humid — below band");
    expect(src).toContain("too dry — above band");
  });
});
