import { describe, it, expect } from "vitest";
import {
  nextLightsSwitch,
  formatCountdown,
  wavemakerStatus,
} from "./time";

// 2026-09-14 is a Monday. Use UTC-stable epochs via Date.UTC + local offset
// is NOT needed: the helpers read local wall-clock via Date methods, so tests
// construct Dates at explicit local hours with new Date(y, m, d, h, min).
const at = (h: number, min: number, s = 0): number =>
  new Date(2026, 8, 14, h, min, s).getTime(); // Sep 14 2026

describe("nextLightsSwitch (overnight 20:00 -> 08:00)", () => {
  const win = { on: "20:00", off: "08:00" };

  it("inside overnight window at 23:00 -> next switch off at 08:00", () => {
    const c = nextLightsSwitch(win, at(23, 0));
    expect(c).toEqual({ ms: 9 * 3600 * 1000, next: "off" });
  });

  it("inside overnight window at 02:00 -> off in 6 h", () => {
    const c = nextLightsSwitch(win, at(2, 0));
    expect(c).toEqual({ ms: 6 * 3600 * 1000, next: "off" });
  });

  it("outside window at 12:00 -> next switch on at 20:00", () => {
    const c = nextLightsSwitch(win, at(12, 0));
    expect(c).toEqual({ ms: 8 * 3600 * 1000, next: "on" });
  });

  it("at exactly 20:00 (window edge) -> inside, off in 12 h", () => {
    const c = nextLightsSwitch(win, at(20, 0));
    expect(c).toEqual({ ms: 12 * 3600 * 1000, next: "off" });
  });

  it("at exactly 08:00 (window edge) -> outside, on in 12 h", () => {
    const c = nextLightsSwitch(win, at(8, 0));
    expect(c).toEqual({ ms: 12 * 3600 * 1000, next: "on" });
  });

  it("one minute before lights-on: on in 60 s", () => {
    const c = nextLightsSwitch(win, at(19, 59));
    expect(c).toEqual({ ms: 60 * 1000, next: "on" });
  });

  it("missing off time -> null (never guess)", () => {
    expect(nextLightsSwitch({ on: "20:00", off: null }, at(12, 0))).toBeNull();
  });

  it("invalid time string -> null", () => {
    expect(nextLightsSwitch({ on: "25:99", off: "08:00" }, at(12, 0))).toBeNull();
  });

  it("daytime window (08:00 -> 20:00) works too", () => {
    const dayWin = { on: "08:00", off: "20:00" };
    expect(nextLightsSwitch(dayWin, at(12, 0))).toEqual({
      ms: 8 * 3600 * 1000,
      next: "off",
    });
    expect(nextLightsSwitch(dayWin, at(23, 0))).toEqual({
      ms: 9 * 3600 * 1000,
      next: "on",
    });
  });
});

describe("formatCountdown", () => {
  it("formats hours+minutes", () => {
    expect(formatCountdown((6 * 3600 + 12 * 60) * 1000)).toBe("6 h 12 m");
  });
  it("formats minutes only", () => {
    expect(formatCountdown(42 * 60 * 1000)).toBe("42 min");
  });
  it("formats seconds only", () => {
    expect(formatCountdown(23 * 1000)).toBe("23 s");
  });
  it("clamps negative to 0 s", () => {
    expect(formatCountdown(-5000)).toBe("0 s");
  });
});

describe("wavemakerStatus", () => {
  const cfg = { mode: "interval", runS: 120, everyMin: 180 };

  it("mode none -> invisible", () => {
    const s = wavemakerStatus({ mode: "none", runS: 120, everyMin: 180 }, false, 0, 0, true);
    expect(s.visible).toBe(false);
  });

  it("interval idle: counts down to next run", () => {
    // pump went off 10 min ago, every 180 min, run 120 s
    const now = 10 * 60 * 1000;
    const s = wavemakerStatus(cfg, false, 0, now, null);
    expect(s.running).toBe(false);
    expect(s.label).toContain("next run in");
    expect(s.countdownMs).toBe(180 * 60 * 1000 - 120 * 1000 - 10 * 60 * 1000);
  });

  it("interval running: counts down the run", () => {
    // pump switched on 60 s ago, run 120 s
    const onAt = 1000 * 1000;
    const now = onAt + 60 * 1000;
    const s = wavemakerStatus(cfg, true, onAt, now, null);
    expect(s.running).toBe(true);
    expect(s.label).toContain("mixing");
    expect(s.countdownMs).toBe(60 * 1000);
  });

  it("interval run overdue: countdown clamps to 0", () => {
    const onAt = 1000 * 1000;
    const now = onAt + 500 * 1000; // way past run_s
    const s = wavemakerStatus(cfg, true, onAt, now, null);
    expect(s.countdownMs).toBe(0);
  });

  it("interval idle overdue: countdown clamps to 0", () => {
    const offAt = 0;
    const now = 1000 * 1000 * 1000; // far future
    const s = wavemakerStatus(cfg, false, offAt, now, null);
    expect(s.countdownMs).toBe(0);
  });

  it("run_s/every_min <= 0 -> visible but no countdown label", () => {
    const s = wavemakerStatus(
      { mode: "interval", runS: 0, everyMin: 0 },
      false,
      0,
      0,
      null
    );
    expect(s.visible).toBe(true);
    expect(s.countdownMs).toBeNull();
  });

  it("switch unreadable -> pump unreachable label", () => {
    const s = wavemakerStatus(cfg, null, 0, 0, null);
    expect(s.visible).toBe(true);
    expect(s.running).toBeNull();
    expect(s.label).toContain("unreachable");
  });

  it("with_lights day + pump on: no divergence label", () => {
    const s = wavemakerStatus(
      { mode: "with_lights", runS: null, everyMin: null },
      true,
      0,
      0,
      true
    );
    expect(s.running).toBe(true);
    expect(s.label).toBeNull();
  });

  it("with_lights divergence: label says should be on/off", () => {
    const day = wavemakerStatus(
      { mode: "with_lights", runS: null, everyMin: null },
      false,
      0,
      0,
      true
    );
    expect(day.label).toContain("should be on");
    const night = wavemakerStatus(
      { mode: "with_lights", runS: null, everyMin: null },
      true,
      0,
      0,
      false
    );
    expect(night.label).toContain("should be off");
  });
});
