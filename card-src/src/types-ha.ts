export interface LovelaceCard {
  hass?: unknown;
  getCardSize?(): number;
  setConfig?(config: unknown): void;
}

export interface LovelaceCardEditor {
  hass?: unknown;
  lovelace?: unknown;
  setConfig(config: unknown): void;
}

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes?: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

export interface HAHistoryResponse {
  [entityId: string]: Array<Array<{ state: string; last_changed: string }>>;
}

/** The slice of the Home Assistant object the card needs. */
export interface HomeAssistant {
  states: Record<string, HAEntity | undefined>;
  callApi<T = unknown>(method: "GET" | "POST", apiPath: string, ...params: string[]): Promise<T>;
  // Allow structural assignment from the full custom-card-helpers HomeAssistant.
  [key: string]: unknown;
}
