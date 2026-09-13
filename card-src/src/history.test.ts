import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchHistory, clearHistoryCache } from "./history";
import type { HomeAssistant } from "./types";

const mkHass = (impl: (...args: unknown[]) => Promise<unknown>): HomeAssistant =>
  ({ callApi: vi.fn(impl) }) as unknown as HomeAssistant;

beforeEach(() => clearHistoryCache());

describe("fetchHistory", () => {
  it("calls the history API with filter params", async () => {
    let captured: unknown[] = [];
    const hass = mkHass(async (...args: unknown[]) => {
      captured = args;
      return { "sensor.x": [[{ state: "1", last_changed: "2026-09-10T00:00:00Z" }]] };
    });
    const data = await fetchHistory(hass, "sensor.x", 24, Date.UTC(2026, 8, 10, 12));
    expect(data).not.toBeNull();
    const [method, path] = captured as [string, string];
    expect(method).toBe("GET");
    expect(path).toBe("history/period");
    void path;
  });

  it("serves repeat calls from cache", async () => {
    const callApi = vi.fn(async () => ({ "sensor.x": [[{ state: "1", last_changed: "2026-09-10T00:00:00Z" }]] }));
    const hass = { callApi } as unknown as HomeAssistant;
    await fetchHistory(hass, "sensor.x", 24, 1000);
    await fetchHistory(hass, "sensor.x", 24, 2000);
    expect(callApi).toHaveBeenCalledTimes(1);
  });

  it("refetches after the TTL expires", async () => {
    const callApi = vi.fn(async () => ({ "sensor.x": [[{ state: "1", last_changed: "2026-09-10T00:00:00Z" }]] }));
    const hass = { callApi } as unknown as HomeAssistant;
    const t0 = Date.UTC(2026, 8, 10, 12);
    await fetchHistory(hass, "sensor.x", 24, t0);
    await fetchHistory(hass, "sensor.x", 24, t0 + 10 * 60 * 1000);
    expect(callApi).toHaveBeenCalledTimes(2);
  });

  it("returns null when the API throws", async () => {
    const hass = mkHass(async () => {
      throw new Error("boom");
    });
    const data = await fetchHistory(hass, "sensor.x", 24);
    expect(data).toBeNull();
  });
});
