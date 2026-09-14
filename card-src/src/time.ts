/**
 * Pure countdown / schedule-window math for the card.
 * `now` is always an injected parameter (Date.now()-style epoch ms) so every
 * branch is testable — no `new Date()` inside these helpers.
 */

export interface LightsWindow {
  /** "HH:MM" or "HH:MM:SS" local lights-on time (e.g. 20:00). */
  on: string | null;
  /** "HH:MM" or "HH:MM:SS" local lights-off time (e.g. 08:00). */
  off: string | null;
}

export interface Countdown {
  /** ms until the next switch; 0 when due now/clamped. */
  ms: number;
  /** Which switch comes next. */
  next: "on" | "off";
}

function parseHm(v: string | null | undefined): number | null {
  if (!v || typeof v !== "string") return null;
  const m = v.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  const s = m[3] ? Number(m[3]) : 0;
  if (h > 23 || mi > 59 || s > 59) return null;
  return h * 3600 + mi * 60 + s;
}

/** Seconds-of-day for a Date, in the HA-local sense the schedule uses. */
function secondsOfDay(nowMs: number): number {
  const d = new Date(nowMs);
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

/**
 * Next lamp switch inside the (possibly overnight) lights window.
 * Mirrors the coordinator: `on >= off` means the window spans midnight.
 * Returns null when either time is missing/invalid.
 */
export function nextLightsSwitch(
  window: LightsWindow,
  nowMs: number
): Countdown | null {
  const onS = parseHm(window.on);
  const offS = parseHm(window.off);
  if (onS === null || offS === null) return null;
  const now = secondsOfDay(nowMs);
  const overnight = onS >= offS;

  // Day window [on, off): next switch = off when inside, on when outside.
  // Overnight window [on, 24h) + [0, off): same wording, different geometry.
  const inside =
    overnight ? now >= onS || now < offS : now >= onS && now < offS;
  const next: "on" | "off" = inside ? "off" : "on";
  const targetS = next === "off" ? offS : onS;

  let delta = targetS - now;
  if (delta <= 0) delta += 24 * 3600;
  return { ms: delta * 1000, next };
}

/** "6 h 12 m" / "42 min" / "23 s" — compact human countdown. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} m`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

export interface WavemakerConfig {
  mode: string | null | undefined; // "none" | "with_lights" | "interval"
  runS: number | null | undefined;
  everyMin: number | null | undefined;
}

export interface WavemakerStatus {
  visible: boolean;
  running: boolean | null; // null = unknown (switch state unreadable)
  /** ms until the pump switches (to ON when idle, to OFF when running). */
  countdownMs: number | null;
  /** "run in 42 min" / "mixing 18 s" text, null when hidden. */
  label: string | null;
}

/**
 * Interval-mode countdown from the pump switch's last_changed (epoch ms).
 * `lastChangedMs` resets on radio flaps — accepted semantics: the countdown
 * restarts, which matches the coordinator's own `_wavemaker_last_toggle`
 * reset on coordinator reload. `with_lights` mirrors the lamp: report the
 * running state only, no interval countdown.
 */
export function wavemakerStatus(
  cfg: WavemakerConfig,
  isOn: boolean | null,
  lastChangedMs: number | null,
  nowMs: number,
  isDay: boolean | null
): WavemakerStatus {
  const mode = cfg.mode ?? "none";
  if (mode === "none" || mode === null) {
    return { visible: false, running: null, countdownMs: null, label: null };
  }
  if (isOn === null) {
    return {
      visible: true,
      running: null,
      countdownMs: null,
      label: mode === "interval" ? "pump unreachable" : null,
    };
  }
  if (mode === "with_lights") {
    if (isDay === null) {
      return { visible: true, running: isOn, countdownMs: null, label: null };
    }
    const want = isDay;
    return {
      visible: true,
      running: isOn,
      countdownMs: null,
      label: isOn === want ? null : `should be ${want ? "on" : "off"}`,
    };
  }
  // interval
  const runS = Number(cfg.runS);
  const everyMin = Number(cfg.everyMin);
  if (!Number.isFinite(runS) || !Number.isFinite(everyMin) || runS <= 0 || everyMin <= 0) {
    return { visible: true, running: isOn, countdownMs: null, label: null };
  }
  if (lastChangedMs === null || !Number.isFinite(lastChangedMs)) {
    return { visible: true, running: isOn, countdownMs: null, label: null };
  }
  const elapsed = Math.max(0, nowMs - lastChangedMs);
  if (isOn) {
    const remain = runS * 1000 - elapsed;
    return {
      visible: true,
      running: true,
      countdownMs: Math.max(0, remain),
      label: `mixing ${formatCountdown(Math.max(0, remain))}`,
    };
  }
  const everyMs = everyMin * 60 * 1000;
  const runMs = runS * 1000;
  const remain = everyMs - runMs - elapsed;
  return {
    visible: true,
    running: false,
    countdownMs: Math.max(0, remain),
    label: `next run in ${formatCountdown(Math.max(0, remain))}`,
  };
}
