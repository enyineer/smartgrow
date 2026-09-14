import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import { cardStyles } from "./styles";
import {
  DEFAULT_PREFIX,
  HISTORY_HOURS,
  VPD_BAND_RANGE,
} from "./const";
import {
  parseSmartGrowState,
  resolveEntityIds,
  applySourceEntities,
  discoverPrefix,
  getBacking,
  dehumChip,
  normalizeTerm,
  bandPosition,
  vpdColorKey,
  sparklineGeometry,
  historyToPoints,
  clamp,
} from "./state";
import type { SmartGrowCardConfig } from "./types";
import type { HomeAssistant } from "./types-ha";
import type { ParsedState } from "./state";
import { fetchHistory } from "./history";

import "./smartgrow-card-editor";

export const CARD_VERSION = "0.1.0";
export const CARD_NAME = "smartgrow-card";

export class SmartGrowCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SmartGrowCardConfig;

  @state() private _sparkPoints: Array<{ t: number; v: number }> = [];

  private _sparkLoadedFor?: string;

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement("smartgrow-card-editor");
  }

  public static getStubConfig(_hass: HomeAssistant): SmartGrowCardConfig {
    // No prefix: _ids() auto-discovers the real prefix from live states at
    // render time, so the stub works for any integration naming.
    return { type: `custom:${CARD_NAME}` };
  }

  public setConfig(config: SmartGrowCardConfig): void {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration");
    }
    this._config = {
      prefix: DEFAULT_PREFIX,
      show_setup_hint: true,
      ...config,
    };
    this._sparkLoadedFor = undefined;
    this._sparkPoints = [];
  }

  public getCardSize(): number {
    return 6;
  }

  static styles = cardStyles;

  private static _prefixOverride: string | null = null;

  protected willUpdate(changed: Map<string, unknown>): void {
    super.willUpdate(changed);
    if (this._config && this.hass) {
      this._maybeLoadSparkline();
    }
  }

  private _ids() {
    const configured = this._config?.prefix ?? DEFAULT_PREFIX;
    let ids = resolveEntityIds(configured, this._config?.entities);
    // Auto-discovery: if the configured prefix matches nothing but a SmartGrow
    // fan_target exists under another prefix (device renamed, multiple tents),
    // follow the entities that actually exist.
    const fanId: string | undefined = ids.fan_target;
    if (fanId && !this.hass?.states?.[fanId]) {
      const found = discoverPrefix(this.hass);
      if (found && found !== configured) {
        SmartGrowCard._prefixOverride = found;
        ids = resolveEntityIds(found, this._config?.entities);
      }
    }
    // External sources (VPD sensor, camera, lamp) live in the integration's
    // configured sources — the prefix cannot derive them.
    const prefix = SmartGrowCard._prefixOverride ?? configured;
    SmartGrowCard._prefixOverride = null;
    return applySourceEntities(this.hass, prefix, ids, this._config?.entities);
  }

  private _openCamera(entityId: string): void {
    const ev = new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId },
    });
    this.dispatchEvent(ev);
  }

  private async _maybeLoadSparkline(): Promise<void> {
    const ids = this._ids();
    const entityId = ids.dah;
    if (!entityId || !this.hass || !this.hass.states?.[entityId]) return;
    if (this._sparkLoadedFor === entityId) return;
    this._sparkLoadedFor = entityId;
    try {
      const history = await fetchHistory(this.hass, entityId, HISTORY_HOURS);
      this._sparkPoints = historyToPoints(history ?? {}, entityId);
    } catch {
      this._sparkPoints = [];
    }
  }

  private _renderSetupHint(missingIds: string[]) {
    if (this._config?.show_setup_hint === false) return nothing;
    return html`
      <div class="setup-hint">
        <div>🌱 SmartGrow entities not found.</div>
        <div>
          Expected prefix <code>${this._config?.prefix ?? DEFAULT_PREFIX}</code>
          (${missingIds.slice(0, 3).join(", ")}…).
        </div>
        <div>
          Set up the SmartGrow integration first, or edit this card to pick
          your entities.
        </div>
      </div>
    `;
  }

  protected render() {
    if (!this._config || !this.hass) return html``;
    const ids = this._ids();
    const s = parseSmartGrowState(this.hass, ids, VPD_BAND_RANGE);

    if (s.empty) {
      const missingIds = (Object.values(ids) as (string | undefined)[]).filter(
        (id): id is string => !!id && !this.hass?.states?.[id]
      );
      return html`<ha-card>${this._renderSetupHint(missingIds)}</ha-card>`;
    }

    const title = this._config.title ?? s.device;
    const fanActualHtml =
      s.fanActual !== null
        ? html`<span class="fan-sub">actual ${Math.round(s.fanActual)} %</span>`
        : nothing;

    const vpdPos = bandPosition(s.vpd, s.bandLow, s.bandHigh);
    const vpdKey = vpdColorKey(vpdPos);
    const bandPctLow = clamp(0, 0, 100);
    const bandPctHigh = clamp(100, 0, 100);
    const okLeft = 0;
    const okRight = 100;
    void bandPctLow;
    void bandPctHigh;
    void okLeft;
    void okRight;
    const markerLeft = vpdPos === null ? null : clamp(((vpdPos + 0.25) / 1.5) * 100, 0, 100);
    const bandLeftPct = clamp(((0 + 0.25) / 1.5) * 100, 0, 100);
    const bandRightPct = clamp(((1 + 0.25) / 1.5) * 100, 0, 100);

    const spark = sparklineGeometry(this._sparkPoints, 300, 54, 4);
    const dehum = dehumChip(getBacking(this.hass, ids.dehumidifier_decision));
    const humE = getBacking(this.hass, ids.humidifier_decision);
    const hum = dehumChip(humE);

    const terms = [
      { key: "dah", label: "ΔAH", value: s.terms.dah, active: s.activeTerm === "dah" },
      { key: "vpd", label: "VPD", value: s.terms.vpd, active: s.activeTerm === "vpd" },
      { key: "need", label: "need", value: s.terms.need, active: s.activeTerm === "need" },
      { key: "temp", label: "temp", value: s.terms.temp, active: s.activeTerm === "temp" },
    ];

    const cameraEntity =
      this._config?.camera_entity ??
      (ids.camera ?? null);
    // No inline stream: <img>/multipart streams in the companion webview have
    // proven fragile (auth-token 403s, broken-image states). Instead render a
    // button that opens the HA-native more-info dialog for the camera — HA
    // renders the live stream there with correct auth, always.
    const cycleTxt = s.cycles24h !== null ? `${s.cycles24h} cyc/24h` : "";

    return html`
      <ha-card>
        <div class="header">
          <div class="title">${title}</div>
          ${s.stage
            ? html`<div class="stage" title=${s.stageConflict ? `legacy helper says: ${s.stageConflict}` : ""}>${s.stage}${s.stageConflict ? " ⚠︎" : ""}</div>`
            : nothing}
          <div class="phase-chip ${s.phase}">${s.phase}</div>
        </div>
        ${s.stageConflict
          ? html`<div class="stage-conflict" style="font-size:0.78rem;opacity:0.8;margin:-4px 0 4px;color:var(--warning-color,#ffb000)">
              ⚠︎ legacy helper disagrees: ${s.stageConflict}
            </div>`
          : nothing}

        <div class="gauge-row">
          <div class="gauge">
            <div class="fan-big">${s.fanTarget !== null ? `${Math.round(s.fanTarget)} %` : "—"}</div>
            <div class="fan-sub">fan target ${fanActualHtml}</div>
          </div>
          <div style="flex:1">
            <div class="fan-sub">VPD ${s.vpd !== null ? s.vpd.toFixed(2) : "—"} kPa · band ${s.bandLow.toFixed(1)}–${s.bandHigh.toFixed(1)}</div>
            <div class="band-bar">
              <div class="band-ok" style="left:${bandLeftPct}%; width:${bandRightPct - bandLeftPct}%"></div>
              ${markerLeft !== null
                ? html`<div class="band-marker ${vpdKey === "ok" ? "" : vpdKey}" style="left:${markerLeft}%"></div>`
                : nothing}
            </div>
            <div class="band-labels"><span>humid</span><span>${vpdKey === "unknown" ? "VPD unknown" : vpdKey === "low" ? "too humid — below band" : vpdKey === "high" ? "too dry — above band" : "in band"}</span><span>too dry</span></div>
          </div>
        </div>

        <div class="spark-wrap">
          <div class="spark-title">ΔAH tent↔lung · last ${HISTORY_HOURS} h ${s.dah !== null ? `· now ${s.dah.toFixed(2)} g/m³` : ""}</div>
          ${spark
            ? html`
                <svg class="spark-svg" viewBox="0 0 300 54" preserveAspectRatio="none">
                  <path class="spark-area" d="${spark.area}"></path>
                  <path class="spark-line" d="${spark.line}"></path>
                </svg>
              `
            : html`<div class="spark-empty">no history yet — recording…</div>`}
        </div>

        <div class="chip-row">
          <span class="chip ${dehum.on === null ? "" : dehum.on ? "on" : "off"}">
            💧 dehum ${dehum.label}
          </span>
          ${s.dryRun !== null
            ? html`<span class="chip ${s.dryRun ? "dryrun" : "off"}">${s.dryRun ? "DRY RUN" : "live"}</span>`
            : nothing}
          ${s.adaptation !== null
            ? html`<span class="chip ${s.adaptation ? "on" : "off"}">adaptation ${s.adaptation ? "on" : "off"}</span>`
            : nothing}
          ${cycleTxt ? html`<span class="chip">${cycleTxt}</span>` : nothing}
        </div>
        ${hum.on !== null
          ? html`<span class="chip ${hum.on ? "on" : "off"}">💦 hum ${hum.label}</span>${hum.reason ? html`<span class="chip-note"> ${hum.reason}</span>` : nothing}`
          : nothing}
        ${dehum.reason ? html`<p class="dehum-reason">reason: ${dehum.reason}</p>` : nothing}
        ${cameraEntity
          ? html`<button
              class="camera-open"
              title="Open live camera stream"
              @click=${() => this._openCamera(cameraEntity!)}
            >
              <ha-icon icon="mdi:cctv"></ha-icon>
              <span>Live camera</span>
            </button>`
          : nothing}

        <div class="terms">
          ${terms.map(
            (t) => html`
              <div class="term ${t.active ? "active" : ""}">
                <div class="term-name">
                  <span>${t.label}</span>
                  <span class="val">${t.value !== null ? `${t.value.toFixed(0)}%` : "—"}</span>
                </div>
                <div class="term-bar">
                  <div class="term-fill" style="width:${normalizeTerm(t.value)}%"></div>
                </div>
              </div>
            `
          )}
        </div>
        ${s.activeTerm
          ? html`<div class="fan-sub" style="margin-top:6px">active term: ${s.activeTerm}</div>`
          : nothing}

        ${s.oscillationWarning || s.legacyWarning
          ? html`
              <div class="warning-banner">
                ⚠️
                ${s.oscillationWarning ? html`<span>dehumidifier oscillation</span>` : nothing}
                ${s.oscillationWarning && s.legacyWarning ? html`<span>·</span>` : nothing}
                ${s.legacyWarning ? html`<span>legacy automations still active</span>` : nothing}
              </div>
            `
          : nothing}
      </ha-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "smartgrow-card": SmartGrowCard;
  }
}

export type { SmartGrowCardConfig, ParsedState };
export type { HomeAssistant } from "./types";

if (!customElements.get("smartgrow-card")) {
  customElements.define("smartgrow-card", SmartGrowCard);
}
