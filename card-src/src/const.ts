/** Default entity-id prefix (integration entry slug), e.g. "smartgrow_smartgrow". */
export const DEFAULT_PREFIX = "smartgrow_smartgrow";

/** Days of dAH history to render in the sparkline. */
export const HISTORY_HOURS = 24;

/** Default VPD band range the card visualises (kPa), overridden by the stage. */
export const VPD_BAND_RANGE: { low: number; high: number } = { low: 1.3, high: 1.6 };

/** VPD band (low/high kPa) per grow stage — matches the integration tables. */
export const STAGE_BANDS: Record<string, { low: number; high: number }> = {
  Seedling: { low: 0.8, high: 1.1 },
  Vegetative: { low: 1.1, high: 1.4 },
  Flowering: { low: 1.5, high: 1.8 },
};

/** Kinds of known SmartGrow entities, used for prefix-based resolution. */
export const ENTITY_KINDS = [
  "fan_target",
  "fan_dah_term",
  "fan_vpd_term",
  "fan_need_term",
  "fan_temp_term",
  "active_fan_term",
  "dah",
  "ah_tent",
  "ah_lung_room",
  "dehumidifier_decision",
  "dry_run",
  "cycles_24h",
] as const;

export type EntityKind = (typeof ENTITY_KINDS)[number];

export const GITHUB_URL = "https://github.com/niggo/smartgrow-card";
