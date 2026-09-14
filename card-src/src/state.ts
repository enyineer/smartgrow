/**
 * Pure state-parsing / normalisation helpers — no Lit, no DOM.
 * Everything here is unit-tested and safe to call from the card or editor.
 */

import type { EntityBacking } from "./types";
import type { HAEntity, HomeAssistant } from "./types-ha";

export type Phase = "day" | "night" | "unknown";

export interface ParsedState {
  device: string;
  stage: string;
  phase: Phase;
  fanTarget: number | null;
  fanActual: number | null;
  terms: { dah: number | null; vpd: number | null; need: number | null; temp: number | null };
  activeTerm: string | null;
  dah: number | null;
  vpd: number | null;
  bandLow: number;
  bandHigh: number;
  dehumAction: string | null;
  dehumReason: string | null;
  dehumFanPct: number | null;
  dryRun: boolean | null;
  adaptation: boolean | null;
  oscillationWarning: boolean | null;
  legacyWarning: boolean | null;
  cycles24h: number | null;
  /** legacy input_select.growbox_stage disagrees with the SmartGrow stage select */
  stageConflict: string | null;
  /** true if no resolved entity exists at all → setup hint */
  empty: boolean;
  /** Effective dehum window from the decision sensor attrs (adaptation-aware). */
  dehumBand: { low: number | null; high: number | null; depth: number | null };
  lightsOn: string | null;
  lightsOff: string | null;
  wavemaker: {
    entity: string | null;
    mode: string | null;
    runS: number | null;
    everyMin: number | null;
    isOn: boolean | null;
    lastChangedMs: number | null;
  };
  lampOn: boolean | null;
  masterOn: boolean | null;
  lampEntity: string | null;
  masterEntity: string | null;
  /** Absolute climate readings for the tent/lung mini-row. */
  tentTemp: number | null;
  tentRh: number | null;
  lungTemp: number | null;
  lungRh: number | null;
  lungConfigured: boolean;
}

const NUMERIC_STATE_RE = /^-?\d+(\.\d+)?$/;

/** Parse a HA state string as a finite number; null when unavailable/unknown/non-numeric. */
export function toNumber(state: string | undefined | null): number | null {
  if (state === undefined || state === null) return null;
  const s = String(state).trim();
  if (s.length === 0) return null;
  const lower = s.toLowerCase();
  if (lower === "unknown" || lower === "unavailable" || lower === "none" || lower === "off" || lower === "on") {
    return null;
  }
  if (!NUMERIC_STATE_RE.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Parse a boolean-ish HA state ("on"/"off"/"true"/"false"/1/0). */
export function toBool(state: string | undefined | null): boolean | null {
  if (state === undefined || state === null) return null;
  const s = String(state).trim().toLowerCase();
  if (s === "on" || s === "true" || s === "1") return true;
  if (s === "off" || s === "false" || s === "0") return false;
  return null;
}

/** Clamp a number into [min,max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Map a stage label + phase to a VPD band. Returns the flowering fallback
 * (1.3–1.6) for unknown labels.
 */
export function bandForStage(stage: string | undefined, phase: Phase): { low: number; high: number } {
  if (!stage) return { low: 1.3, high: 1.6 };
  const key = String(stage).trim();
  if (key === "Seedling") return phase === "night" ? { low: 0.6, high: 0.9 } : { low: 0.8, high: 1.1 };
  if (key === "Vegetative") return phase === "night" ? { low: 0.9, high: 1.2 } : { low: 1.1, high: 1.4 };
  if (key === "Flowering") return phase === "night" ? { low: 1.3, high: 1.6 } : { low: 1.5, high: 1.8 };
  return { low: 1.3, high: 1.6 };
}

/**
 * Normalise a fan term value to a 0–100 % contribution bar.
 * Terms are already in percent; negative values (defensive) clamp to 0.
 */
export function normalizeTerm(v: number | null): number {
  if (v === null || !Number.isFinite(v)) return 0;
  return clamp(v, 0, 100);
}

/**
 * Position of a VPD value inside a band: 0 = at/below band low,
 * 1 = at/above band high, 0.5 = mid-band. Values outside the band
 * extend linearly, clamped to [-0.25, 1.25] for rendering.
 */
export function bandPosition(vpd: number | null, low: number, high: number): number | null {
  if (vpd === null || !Number.isFinite(vpd)) return null;
  if (!(high > low)) return null;
  const raw = (vpd - low) / (high - low);
  return clamp(raw, -0.25, 1.25);
}

/** Colour key for a VPD position. */
export function vpdColorKey(pos: number | null): "low" | "ok" | "high" | "unknown" {
  if (pos === null) return "unknown";
  if (pos < 0) return "low";
  if (pos > 1) return "high";
  return "ok";
}

/** Resolve the dehumidifier on/off from the decision sensor state. */
export function dehumOn(state: string | undefined | null): boolean | null {
  if (state === undefined || state === null) return null;
  const s = String(state).trim().toLowerCase();
  if (s === "unavailable" || s === "unknown") return null;
  if (s === "on" || s === "true") return true;
  if (s === "off" || s === "false") return false;
  // The integration emits action labels like "hold_on"/"hold_off"/"assist_on"
  if (s.endsWith("_on") || s === "turned_on") return true;
  if (s.endsWith("_off") || s === "turned_off") return false;
  return null;
}

/** Build the dehumidifier chip label + reason from the decision entity. */
export function dehumChip(e: EntityBacking | undefined): {
  label: string;
  on: boolean | null;
  reason: string | null;
} {
  if (!e || e.missing) return { label: "—", on: null, reason: null };
  const on = dehumOn(e.state);
  const reason = typeof e.attrs?.reason === "string" ? (e.attrs.reason as string) : null;
  const label =
    e.unavailable ? "unavailable" : on === null ? String(e.state) : on ? "ON" : "OFF";
  return { label, on, reason };
}

export interface ResolvedEntityIds {
  [kind: string]: string | undefined;
}

/** Discover the entity prefix by scanning hass states for a known SmartGrow slug. */
export function discoverPrefix(hass: HomeAssistant | undefined): string | null {
  if (!hass?.states) return null;
  for (const eid of Object.keys(hass.states)) {
    const m = eid.match(/^sensor\.(.+)_fan_target$/);
    if (m) return m[1];
  }
  return null;
}


/** Known entity slugs the integration creates (order matters for prefix stripping). */
const KNOWN_SLUGS = [
  "fan_target", "fan_dah_term", "fan_vpd_term", "fan_need_term", "fan_temp_term",
  "active_fan_term", "ah_tent", "ah_lung_room", "dehumidifier_decision",
  "dehumidifier_cycles_24h", "dry_run", "cycles_24h", "stage", "adaptation",
  "oscillation_warning", "legacy_automation_warning", "dah",
];

/** Strip the domain + a known slug off an entity_id → the device prefix. */
export function derivePrefixFromEntityId(entityId: string): string | null {
  const stripped = entityId.replace(/^(sensor|binary_sensor|switch|number|select|update)\./, "");
  for (const slug of KNOWN_SLUGS) {
    if (stripped.endsWith("_" + slug)) {
      const prefix = stripped.slice(0, stripped.length - slug.length - 1);
      return prefix.length > 0 ? prefix : null;
    }
  }
  return null;
}

export interface DeviceOption {
  device_id: string;
  label: string;
  prefix: string;
}

type EntityRegistryEntry = { device_id?: string; entity_id?: string };
type DeviceRegistryEntry = { name?: string; name_by_user?: string };

/**
 * List candidate SmartGrow devices from plain hass registry data (no services,
 * no HA frontend components — works in every webview and dialog context).
 * A device qualifies when any of its entities yields a derivable prefix.
 */
export function listSmartGrowDevices(
  hass: HomeAssistant | undefined
): DeviceOption[] {
  if (!hass) return [];
  type Reg = { entities?: Record<string, EntityRegistryEntry>; devices?: Record<string, DeviceRegistryEntry> };
  const reg = hass as unknown as Reg;
  const entities = reg.entities ?? {};
  const devices = reg.devices ?? {};

  const byDevice = new Map<string, string>(); // device_id -> prefix (first hit)
  const consider = (entityId: string, info: EntityRegistryEntry | undefined) => {
    const prefix = derivePrefixFromEntityId(entityId);
    if (!prefix) return;
    const devId = info?.device_id;
    if (devId && !byDevice.has(devId)) byDevice.set(devId, prefix);
  };
  for (const [eid, info] of Object.entries(entities)) {
    consider((info?.entity_id as string) ?? eid, info);
  }
  // Fallback: some hosts expose no entity registry on stripped hass objects —
  // derive devices straight from state keys grouped by prefix.
  if (byDevice.size === 0 && hass.states) {
    const prefixes = new Set<string>();
    for (const eid of Object.keys(hass.states)) {
      const prefix = derivePrefixFromEntityId(eid);
      if (prefix) prefixes.add(prefix);
    }
    return Array.from(prefixes).sort().map((prefix) => ({
      device_id: "prefix:" + prefix,
      label: prefix,
      prefix,
    }));
  }
  const out: DeviceOption[] = [];
  for (const [deviceId, prefix] of byDevice) {
    const dev = devices[deviceId];
    const label = (dev?.name_by_user || dev?.name || prefix).trim();
    out.push({ device_id: deviceId, label, prefix });
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}
/** Compose final entity ids from prefix + explicit overrides. */
export function resolveEntityIds(
  prefix: string,
  overrides: Record<string, string | undefined> | undefined
): ResolvedEntityIds {
  const base = prefix.replace(/^sensor\./, "").replace(/^binary_sensor\./, "").replace(/^switch\./, "");
  const kinds: Array<[string, string, string]> = [
    ["fan_target", "fan_target", "sensor"],
    ["fan_dah_term", "fan_dah_term", "sensor"],
    ["fan_vpd_term", "fan_vpd_term", "sensor"],
    ["fan_need_term", "fan_need_term", "sensor"],
    ["fan_temp_term", "fan_temp_term", "sensor"],
    ["active_fan_term", "active_fan_term", "sensor"],
    ["dah", "dah", "sensor"],
    ["ah_tent", "ah_tent", "sensor"],
    ["ah_lung_room", "ah_lung_room", "sensor"],
    ["dehumidifier_decision", "dehumidifier_decision", "sensor"],
    ["humidifier_decision", "humidifier_decision", "sensor"],
    ["dry_run", "dry_run", "sensor"],
    ["phase", "phase", "sensor"],
    ["cycles_24h", "cycles_24h", "sensor"],
    ["stage", "stage", "select"],
    ["adaptation", "adaptation", "switch"],
    ["oscillation_warning", "oscillation_warning", "binary_sensor"],
    ["legacy_automation_warning", "legacy_automation_warning", "binary_sensor"],
  ];
  const out: ResolvedEntityIds = {};
  for (const [kind, slug, domain] of kinds) {
    const explicit = overrides?.[kind];
    if (explicit && explicit.length > 0) {
      out[kind] = explicit;
    } else {
      out[kind] = `${domain}.${base}_${slug}`;
    }
  }
  // Pass through extra overrides (e.g. "vpd") that have no prefix-derived default.
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (!(key in out) && value) out[key] = value;
  }
  return out;
}

/**
 * Source-entity map the INTEGRATION publishes (sensor.<prefix>_sources,
 * attributes = {vpd_entity, camera_entity, lamp_entity, ...}). External
 * inputs like the VPD sensor or camera are user-configured in the
 * integration and cannot be derived from the prefix — this is the
 * config-as-source-of-truth channel for the card.
 */
export function sourceEntityMap(
  hass: HomeAssistant | undefined,
  prefix: string
): Record<string, string | number | null> {
  if (!hass?.states) return {};
  const base = prefix
    .replace(/^sensor\./, "")
    .replace(/^binary_sensor\./, "")
    .replace(/^switch\./, "");
  const candidates = [`sensor.${base}_sources`, `sensor.${base}_configured_sources`];
  // The device label may be user-set ("Growbox 1") and leak into the entity id
  // (sensor.growbox_1_smartgrow_configured_sources) — scan for the slug too.
  for (const eid of Object.keys(hass.states)) {
    if (eid.endsWith("_smartgrow_configured_sources") || eid.endsWith("_smartgrow_sources")) {
      candidates.push(eid);
    }
  }
  for (const sourcesId of candidates) {
    const e = hass.states[sourcesId];
    if (!e) continue;
    const attrs = (e.attributes ?? {}) as Record<string, unknown>;
    const out: Record<string, string | number | null> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (k.endsWith("_entity") && typeof v === "string" && v.length > 0) {
        out[k] = v;
      }
    }
    // Numeric extras the card consumes directly (not entity references).
    if (typeof attrs.vpd_computed === "number") {
      out.vpd_computed = attrs.vpd_computed;
    }
    // Wavemaker + schedule config for the card status/countdown sections.
    for (const k of ["wavemaker_mode", "lights_on_time", "lights_off_time"] as const) {
      const v = attrs[k];
      if (typeof v === "string" && v.length > 0) out[k] = v;
    }
    for (const k of ["wavemaker_run_s", "wavemaker_every_min"] as const) {
      const v = attrs[k];
      if (typeof v === "number") out[k] = v;
    }
    if (Object.keys(out).length > 0) return out;
  }
  return {};
}

/** Best-effort entity prefix for the sources sensor, from any resolved id. */
export function sourcesPrefix(ids: ResolvedEntityIds): string {
  const fan = ids.fan_target ?? "";
  return fan.replace(/^sensor\./, "").replace(/_fan_target$/, "");
}

/**
 * Fill kinds the prefix CANNOT derive (vpd, camera, lamp) from the
 * integration's sources sensor. Explicit card overrides always win.
 */
export function applySourceEntities(
  hass: HomeAssistant | undefined,
  prefix: string,
  ids: ResolvedEntityIds,
  overrides: Record<string, string | undefined> | undefined
): ResolvedEntityIds {
  const out = { ...ids };
  const sources = sourceEntityMap(hass, prefix);
  const externalKinds = ["vpd", "camera", "lamp"] as const;
  for (const kind of externalKinds) {
    const explicit = overrides?.[kind];
    if (explicit && explicit.length > 0) {
      out[kind] = explicit;
      continue;
    }
    const fromIntegration = sources[`${kind}_entity`];
    if (typeof fromIntegration === "string" && fromIntegration) {
      out[kind] = fromIntegration;
    }
  }
  // Integration-owned entities can also carry the device label in their id
  // (sensor.growbox_1_smartgrow_phase). If the prefix-derived id does not
  // exist, follow the one that does.
  if (out.phase && !hass?.states?.[out.phase]) {
    for (const eid of Object.keys(hass?.states ?? {})) {
      if (/^sensor\..*_smartgrow_phase$/.test(eid)) {
        out.phase = eid;
        break;
      }
    }
  }
  return out;
}

/** Fetch + wrap a single entity from hass.states. */
export function getBacking(hass: HomeAssistant | undefined, entityId: string | undefined): EntityBacking {
  if (!entityId || !hass || !hass.states) return { entityId, missing: true, unavailable: false };
  const e = hass.states[entityId] as HAEntity | undefined;
  if (!e) return { entityId, missing: true, unavailable: false };
  const unavailable = e.state === "unavailable" || e.state === "unknown";
  return { entityId, state: e.state, attrs: e.attributes ?? {}, missing: false, unavailable };
}

/** Pull the device/entry name out of any resolved entity's friendly_name. */
export function deviceName(e: EntityBacking | undefined): string {
  const fn = e?.attrs?.friendly_name;
  if (typeof fn === "string" && fn.length > 0) {
    // "SmartGrow fan target" → "SmartGrow"; "SmartGrow Kitchen fan target" → "SmartGrow Kitchen"
    const stripped = fn.replace(/\s+(fan\s+target|fan\s+ΔAH\s+term|fan\s+VPD\s+term|fan\s+need\s+term|fan\s+temp\s+term|active\s+fan\s+term|ΔAH|AH.*|dehumidifier.*|dry\s+run.*|dehumidifier.*cycles.*|cycles.*24\s?h.*|stage|adaptation.*|oscillation.*|legacy.*)$/i, "");
    if (stripped.length > 0) return stripped.trim();
  }
  return "SmartGrow";
}

/** Parse the full card model from hass states. Pure — no DOM access. */
export function parseSmartGrowState(
  hass: HomeAssistant | undefined,
  ids: ResolvedEntityIds,
  fallbackBand?: { low: number; high: number }
): ParsedState {
  const fanTargetE = getBacking(hass, ids.fan_target);
  const dahE = getBacking(hass, ids.dah);
  const stageE = getBacking(hass, ids.stage);
  const dehumE = getBacking(hass, ids.dehumidifier_decision);

  const phase = phaseOf(hass, ids);
  const band = bandForStage(stageE?.state, phase);
  const useFallbackBand = !stageE || stageE.missing;
  const finalBand = useFallbackBand && fallbackBand ? fallbackBand : band;

  const device = deviceName(fanTargetE.missing ? dehumE : fanTargetE);

  const resolved: string[] = Object.values(ids).filter((x): x is string => !!x);
  const anyPresent = resolved.some((id) => hass?.states?.[id] !== undefined);
  const anyNumeric =
    toNumber(fanTargetE.state) !== null ||
    toNumber(dahE.state) !== null ||
    toNumber(getBacking(hass, ids.fan_vpd_term).state) !== null;

  const sourcesCache = sourceEntityMap(hass, ids.fan_target ? sourcesPrefix(ids) : "");

  // VPD: linked sensor if the user configured one; otherwise the coordinator's
  // computed value (Magnus over tent temp/RH) published on the sources sensor.
  let vpd: number | null = null;
  const vpdE = getBacking(hass, ids.vpd ?? "");
  if (!vpdE.missing) {
    vpd = toNumber(vpdE.state);
  }
  if (vpd === null) {
    // No linked sensor: use the coordinator's computed VPD from the sources
    // sensor. sourceEntityMap handles the renamed-device-label scan.
    const computed = sourcesCache["vpd_computed"];
    if (typeof computed === "number") vpd = computed;
    else if (typeof computed === "string") {
      const n = Number.parseFloat(computed);
      if (Number.isFinite(n)) vpd = n;
    }
  }

  const dryRunE = getBacking(hass, ids.dry_run);
  const adaptationE = getBacking(hass, ids.adaptation);
  const oscE = getBacking(hass, ids.oscillation_warning);
  const legacyE = getBacking(hass, ids.legacy_automation_warning);

  const dehumAttrs = dehumE.attrs ?? {};
  const fanPctAttr = dehumAttrs.fan_pct;

  // Stage conflict: the legacy helper (input_select.growbox_stage) drives the
  // still-active automations; if it disagrees with the SmartGrow stage select,
  // one of them is stale — surface it instead of silently picking one.
  // Stage conflict: the integration computes it from the user-configured
  // legacy entity (optional config field) — the card never reads foreign ids.
  const masterId =
    typeof sourcesCache.lamp_switch_entity === "string"
      ? (sourcesCache.lamp_switch_entity as string)
      : undefined;
  const wavemakerId =
    typeof sourcesCache.wavemaker_entity === "string"
      ? (sourcesCache.wavemaker_entity as string)
      : undefined;
  const lampE = getBacking(hass, ids.lamp);
  const lampOn = lampE.missing ? null : toBool(lampE.state);
  const masterB = getBacking(hass, masterId);
  const masterOn = masterB.missing || masterB.unavailable ? null : toBool(masterB.state);
  const wmB = getBacking(hass, wavemakerId);
  const wmOn = wmB.missing || wmB.unavailable ? null : toBool(wmB.state);
  const wmLastChanged = (() => {
    if (!wavemakerId) return null;
    const e = hass?.states?.[wavemakerId];
    const ts = e ? (e as { last_changed?: string }).last_changed : undefined;
    if (!ts) return null;
    const t = Date.parse(ts);
    return Number.isFinite(t) ? t : null;
  })();

  const stageConflict: string | null =
    (getBacking(hass, ids.stage)?.attrs?.stage_conflict as string | undefined) ?? null;

  const tentTempId =
    typeof sourcesCache.tent_temp_entity === 'string'
      ? (sourcesCache.tent_temp_entity as string)
      : undefined;
  const tentRhId =
    typeof sourcesCache.tent_rh_entity === 'string'
      ? (sourcesCache.tent_rh_entity as string)
      : undefined;
  const tentTempE = getBacking(hass, tentTempId);
  const tentRhE = getBacking(hass, tentRhId);
  const lungTempId =
    typeof sourcesCache.lung_temp_entity === "string"
      ? (sourcesCache.lung_temp_entity as string)
      : undefined;
  const lungRhId =
    typeof sourcesCache.lung_rh_entity === "string"
      ? (sourcesCache.lung_rh_entity as string)
      : undefined;
  const lungConfigured = !!(lungTempId && lungRhId);
  const lungTemp = lungConfigured
    ? toNumber(getBacking(hass, lungTempId).state)
    : null;
  const lungRh = lungConfigured
    ? toNumber(getBacking(hass, lungRhId).state)
    : null;

  return {
    device,
    stage: stageE && !stageE.missing ? String(stageE.state) : "",
    phase,
    fanTarget: toNumber(fanTargetE.state),
    fanActual: fanActualOf(hass, fanTargetE),
    terms: {
      dah: toNumber(getBacking(hass, ids.fan_dah_term).state),
      vpd: toNumber(getBacking(hass, ids.fan_vpd_term).state),
      need: toNumber(getBacking(hass, ids.fan_need_term).state),
      temp: toNumber(getBacking(hass, ids.fan_temp_term).state),
    },
    activeTerm: activeTermOf(getBacking(hass, ids.active_fan_term)),
    dah: toNumber(dahE.state),
    vpd,
    bandLow: finalBand.low,
    bandHigh: finalBand.high,
    dehumAction: dehumE && !dehumE.missing ? String(dehumE.state) : null,
    dehumReason: typeof dehumAttrs.reason === "string" ? dehumAttrs.reason : null,
    dehumFanPct: typeof fanPctAttr === "number" ? fanPctAttr : null,
    dryRun: toBool(dryRunE.state),
    adaptation: toBool(adaptationE.state),
    oscillationWarning: toBool(oscE.state),
    legacyWarning: toBool(legacyE.state),
    cycles24h: toNumber(getBacking(hass, ids.cycles_24h).state),
    stageConflict,
    dehumBand: {
      low: typeof dehumAttrs.band_low === "number" ? dehumAttrs.band_low : null,
      high: typeof dehumAttrs.band_high === "number" ? dehumAttrs.band_high : null,
      depth: typeof dehumAttrs.band_depth === "number" ? dehumAttrs.band_depth : null,
    },
    lightsOn:
      typeof sourcesCache.lights_on_time === "string"
        ? (sourcesCache.lights_on_time as string)
        : null,
    lightsOff:
      typeof sourcesCache.lights_off_time === "string"
        ? (sourcesCache.lights_off_time as string)
        : null,
    wavemaker: {
      entity: wavemakerId ?? null,
      mode:
        typeof sourcesCache.wavemaker_mode === "string"
          ? (sourcesCache.wavemaker_mode as string)
          : null,
      runS:
        typeof sourcesCache.wavemaker_run_s === "number"
          ? (sourcesCache.wavemaker_run_s as number)
          : null,
      everyMin:
        typeof sourcesCache.wavemaker_every_min === "number"
          ? (sourcesCache.wavemaker_every_min as number)
          : null,
      isOn: wmOn,
      lastChangedMs: wmLastChanged,
    },
    lampOn,
    masterOn,
    lampEntity: typeof ids.lamp === "string" ? ids.lamp : null,
    masterEntity: masterId ?? null,
    tentTemp: tentTempE.missing ? null : toNumber(tentTempE.state),
    tentRh: tentRhE.missing ? null : toNumber(tentRhE.state),
    lungTemp,
    lungRh,
    lungConfigured,
    empty: !anyPresent || (!anyNumeric && !anyPresent),
  };
}

/** active_term normalisation: keep known labels, null otherwise. */
export function activeTermOf(e: EntityBacking): string | null {
  if (!e || e.missing || e.unavailable) return null;
  const s = String(e.state).trim();
  const known = ["dah", "delta", "vpd", "need", "temp", "floor", "min_fan"];
  const lower = s.toLowerCase();
  if (known.some((k) => lower.includes(k))) return s;
  return null;
}

/** Best-effort actual fan %: a configured `fan_actual` override or the linked fan entity's pct. */
function fanActualOf(hass: HomeAssistant | undefined, fanTargetE: EntityBacking): number | null {
  const linked = fanTargetE?.attrs?.fan_entity;
  if (typeof linked === "string" && hass?.states?.[linked]) {
    const fan = hass.states[linked] as HAEntity;
    const pct = toNumber(String(fan.attributes?.percentage ?? ""));
    if (pct !== null) return pct;
  }
  return null;
}

/**
 * Phase: exclusively from the integration's phase sensor, which derives it
 * from the user-configured lamp entity. No name guessing, no clock.
 */
export function phaseOf(
  hass: HomeAssistant | undefined,
  ids: ResolvedEntityIds
): "day" | "night" | "unknown" {
  if (!ids.phase) return "unknown";
  const state = hass?.states?.[ids.phase]?.state;
  if (state === "day" || state === "night") return state;
  return "unknown";
}



export function sparklineGeometry(
  points: Array<{ t: number; v: number }>,
  width: number,
  height: number,
  pad: number
): { line: string; area: string; min: number; max: number } | null {
  const usable = points.filter((p) => Number.isFinite(p.v));
  if (usable.length < 2 || width <= 0 || height <= 0) return null;
  const values = usable.map((p) => p.v);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 0.05) {
    const mid = (max + min) / 2;
    min = mid - 0.025;
    max = mid + 0.025;
  }
  const t0 = usable[0].t;
  const t1 = usable[usable.length - 1].t;
  const span = t1 - t0 || 1;
  const coords = usable.map((p) => ({
    x: pad + ((p.t - t0) / span) * (width - 2 * pad),
    y: height - pad - ((p.v - min) / (max - min)) * (height - 2 * pad),
  }));
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${height - pad} L${coords[0].x.toFixed(1)},${height - pad} Z`;
  return { line, area, min, max };
}

export function historyToPoints(
  history: Record<string, Array<Array<{ state: string; last_changed: string }>>> | undefined,
  entityId: string
): Array<{ t: number; v: number }> {
  if (!history || typeof history !== "object") return [];
  const seriesList = (history as Record<string, Array<Array<{ state: string; last_changed: string }>>>)[
    entityId
  ];
  if (!Array.isArray(seriesList)) return [];
  const out: Array<{ t: number; v: number }> = [];
  for (const series of seriesList) {
    if (!Array.isArray(series)) continue;
    for (const p of series) {
      const v = toNumber(p?.state);
      if (v === null || !p?.last_changed) continue;
      const t = Date.parse(p.last_changed);
      if (!Number.isFinite(t)) continue;
      out.push({ t, v });
    }
  }
  return out;
}
