/**
 * HA history API access (inline, mini-graph-card style — no extra dependency).
 */

import type { HAHistoryResponse, HomeAssistant } from "./types";

const CACHE = new Map<string, { at: number; data: HAHistoryResponse }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch the last `hours` of history for one entity via
 * `hass.callApi("GET", "history/period", …)`.
 */
export async function fetchHistory(
  hass: HomeAssistant,
  entityId: string,
  hours: number,
  now: number = Date.now()
): Promise<HAHistoryResponse | null> {
  const key = `${entityId}@${hours}`;
  const hit = CACHE.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.data;

  const start = new Date(now - hours * 3600 * 1000);
  const end = new Date(now);
  try {
    const data = await hass.callApi<HAHistoryResponse>(
      "GET",
      "history/period",
      `filter_entity_id=${encodeURIComponent(entityId)}`,
      `start=${encodeURIComponent(start.toISOString())}`,
      `end=${encodeURIComponent(end.toISOString())}`,
      "minimal_response",
      "no_attributes"
    );
    CACHE.set(key, { at: now, data });
    return data;
  } catch {
    return null;
  }
}

/** Test hook: clear the module cache. */
export function clearHistoryCache(): void {
  CACHE.clear();
}
