import type { LovelaceCard, LovelaceCardEditor } from "./types-ha";

export type SmartGrowCardConfig = {
  type: string;
  /** SmartGrow device (from the device picker) — auto-fills the prefix. */
  device_id?: string;
  /** Entity id prefix, e.g. "smartgrow_smartgrow" — the default. */
  prefix?: string;
  /** Optional explicit overrides (win over prefix). */
  entities?: SmartGrowEntities;
  title?: string;
  /** Show the setup hint when entities are missing (default: true). */
  show_setup_hint?: boolean;
  /** Grow lamp entity used for day/night phase (default: auto-discovered). */
  lamp_entity?: string;
  /** Camera entity for the live tent view. */
  camera_entity?: string;
};

export type SmartGrowEntities = {
  fan_target?: string;
  fan_dah_term?: string;
  fan_vpd_term?: string;
  fan_need_term?: string;
  fan_temp_term?: string;
  active_fan_term?: string;
  dah?: string;
  ah_tent?: string;
  ah_lung_room?: string;
  dehumidifier_decision?: string;
  humidifier_decision?: string;
  camera?: string;
  dry_run?: string;
  cycles_24h?: string;
  vpd?: string;
  stage?: string;
  adaptation?: string;
  oscillation_warning?: string;
  legacy_automation_warning?: string;
};

export type EntityBacking = {
  entityId?: string;
  state?: string;
  attrs?: Record<string, unknown>;
  missing: boolean;
  unavailable: boolean;
};

declare global {
  interface Window {
    customCards: Array<Record<string, string | boolean>>;
  }
}

export type { LovelaceCard, LovelaceCardEditor };
export type { HAEntity, HAHistoryResponse, HomeAssistant } from "./types-ha";
