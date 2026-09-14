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
  toNumber,
} from "./state";
import {
  nextLightsSwitch,
  formatCountdown,
  wavemakerStatus,
} from "./time";
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

  @state() private _drawerOpen = false;

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
    return 7;
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
    const now = Date.now();

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
    const markerLeft =
      vpdPos === null ? null : clamp(((vpdPos + 0.25) / 1.5) * 100, 0, 100);
    const bandLeftPct = clamp(((0 + 0.25) / 1.5) * 100, 0, 100);
    const bandRightPct = clamp(((1 + 0.25) / 1.5) * 100, 0, 100);

    const spark = sparklineGeometry(this._sparkPoints, 300, 54, 4);
    const dehum = dehumChip(getBacking(this.hass, ids.dehumidifier_decision));

    const terms = [
      { key: "dah", label: "ΔAH", value: s.terms.dah, active: s.activeTerm === "dah" },
      { key: "vpd", label: "VPD", value: s.terms.vpd, active: s.activeTerm === "vpd" },
      { key: "need", label: "need", value: s.terms.need, active: s.activeTerm === "need" },
      { key: "temp", label: "temp", value: s.terms.temp, active: s.activeTerm === "temp" },
    ];

    const cameraEntity =
      this._config?.camera_entity ??
      (ids.camera ?? null);
    const cycleTxt = s.cycles24h !== null ? `${s.cycles24h} cyc/24h` : "";

    // --- New: lights countdown + wavemaker + alerts ---
    const lightsCountdown = nextLightsSwitch(
      { on: s.lightsOn, off: s.lightsOff },
      now
    );
    const wm = wavemakerStatus(
      { mode: s.wavemaker.mode, runS: s.wavemaker.runS, everyMin: s.wavemaker.everyMin },
      s.wavemaker.isOn,
      s.wavemaker.lastChangedMs,
      now,
      s.phase === "day" ? true : s.phase === "night" ? false : null
    );
    // Unconfigured (mode none + no entity) -> hide the tile entirely: a dead
    // "off" tile implies a configured pump that is idle, which is misleading.
    const wmHidden = !s.wavemaker.entity && (s.wavemaker.mode ?? "none") === "none";

    // Effective band overlay: prefer the decision sensor's adaptation-aware
    // window; fall back to the stage table when the sensor is missing.
    const effHigh = s.dehumBand.high ?? s.bandHigh;
    const reengage =
      s.dehumBand.low !== null && s.dehumBand.depth !== null
        ? s.dehumBand.low + s.dehumBand.depth
        : null;

    const span = 2.0; // -0.25..1.75 render window in band-position units
    const pct = (pos: number) => clamp(((pos + 0.25) / span) * 100, 0, 100);
    const bandPosAbs = (v: number) => (v - s.bandLow) / (s.bandHigh - s.bandLow);
    const okR = bandPosAbs(effHigh);
    const winL = reengage !== null ? bandPosAbs(reengage) : null;
    const winR = s.dehumBand.depth !== null ? okR : null;

    // Alert strip: lamp-dark-during-day, VPD out of band, sensor degraded.
    const alerts: Array<{ text: string; cls: string }> = [];
    if (s.phase === "day") {
      const lampLit = s.lampOn === true && (s.masterOn !== false);
      if (s.lampOn !== null && !lampLit) {
        alerts.push({
          text:
            s.masterOn === false
              ? "Lamp dark during day — master plug OFF"
              : "Lamp dark during day — dimmer OFF",
          cls: "",
        });
      }
    }
    if (vpdKey === "low") {
      alerts.push({ text: "VPD below band — too humid", cls: "" });
    } else if (vpdKey === "high") {
      alerts.push({ text: "VPD above band — too dry", cls: "" });
    }
    const alertCount = alerts.length;

    // Dehum power override (ground-truth verification), card-config only.
    const powerId = this._config?.dehum_power_entity ?? null;
    let powerTxt: string | null = null;
    let powerWarn = false;
    if (powerId) {
      const pv = toNumber(this.hass?.states?.[powerId]?.state);
      if (pv === null) {
        powerTxt = "power ?";
      } else if (dehum.on === true && pv <= 2) {
        powerTxt = "standby — commanded ON";
        powerWarn = true;
      } else {
        powerTxt = `${Math.round(pv)} W`;
      }
    }

    return html`
      <ha-card>
        <div class="header">
          <div class="title">${title}</div>
          ${s.stage
            ? html`<div class="stage" title=${s.stageConflict ? `legacy helper says: ${s.stageConflict}` : ""}>${s.stage}${s.stageConflict ? " ⚠︎" : ""}</div>`
            : nothing}
          <div class="phase-chip ${s.phase}">${s.phase}</div>
          <div class="header-icons">
            ${s.dryRun === true ? html`<span class="badge-dry">DRY</span>` : nothing}
            ${alertCount > 0 ? html`<span class="alert-pill">${alertCount}</span>` : nothing}
            ${cameraEntity
              ? html`<button
                  class="camera-icon"
                  title="Open live camera stream"
                  @click=${() => this._openCamera(cameraEntity!)}
                >
                  <ha-icon icon="mdi:cctv"></ha-icon>
                </button>`
              : nothing}
          </div>
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
              ${winL !== null && winR !== null
                ? html`<div style="position:absolute;top:2px;bottom:2px;background:color-mix(in srgb, var(--sgc-warn) 45%, transparent);border-radius:5px;left:${pct(winL)}%;width:${Math.max(2, pct(winR) - pct(winL))}%"></div>`
                : nothing}
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

        <div class="status-grid" style=${wmHidden ? "grid-template-columns: 1fr 1fr 1fr;" : ""}>
          <div class="tile">
            <div class="tile-name"><span class="dot ${s.fanTarget !== null && s.fanTarget > 0 ? "on" : ""}"></span>Fan</div>
            <div class="tile-value">${s.fanTarget !== null ? `${Math.round(s.fanTarget)} %` : "—"}</div>
            <div class="tile-sub">${s.activeTerm ? `term: ${s.activeTerm}` : "actual " + (s.fanActual !== null ? Math.round(s.fanActual) + " %" : "—")}</div>
          </div>
          <div class="tile">
            <div class="tile-name"><span class="dot ${dehum.on === true ? "on" : dehum.on === false ? "off" : "warn"}"></span>Dehum</div>
            <div class="tile-value">${dehum.label}</div>
            <div class="tile-sub">${s.dehumReason ?? cycleTxt ?? ""}</div>
          </div>
          <div class="tile">
            <div class="tile-name"><span class="dot ${s.lampOn === true ? "on" : s.lampOn === false ? "off" : "warn"}"></span>Lamp</div>
            <div class="tile-value">${s.lampOn === null ? "—" : s.lampOn ? "ON" : "OFF"}</div>
            <div class="tile-sub">
              ${lightsCountdown
                ? `${lightsCountdown.next === "on" ? "on in" : "off in"} ${formatCountdown(lightsCountdown.ms)}`
                : s.masterOn === false
                  ? "plug off"
                  : ""}
            </div>
          </div>
          ${wmHidden
            ? nothing
            : html`<div class="tile">
                <div class="tile-name"><span class="dot ${wm.running === true ? "on" : wm.running === false ? "off" : "warn"}"></span>Wave</div>
                <div class="tile-value">${wm.visible ? (wm.running === null ? "—" : wm.running ? "ON" : "idle") : "off"}</div>
                <div class="tile-sub">${wm.label ?? (s.wavemaker.entity ? "" : "not configured")}</div>
              </div>`}
        </div>

        ${alerts.length > 0
          ? html`<div class="alert-strip">
              ${alerts.map(
                (al) => html`<div class="alert-row ${al.cls}">⚠️ ${al.text}</div>`
              )}
            </div>`
          : nothing}

        <div class="chip-row">
          ${s.dryRun !== null
            ? html`<span class="chip ${s.dryRun ? "dryrun" : "off"}">${s.dryRun ? "DRY RUN" : "live"}</span>`
            : nothing}
          ${s.adaptation !== null
            ? html`<span class="chip ${s.adaptation ? "on" : "off"}">adaptation ${s.adaptation ? "on" : "off"}</span>`
            : nothing}
          ${cycleTxt ? html`<span class="chip">${cycleTxt}</span>` : nothing}
          ${powerTxt ? html`<span class="chip ${powerWarn ? "warn" : ""}">${powerTxt}</span>` : nothing}
        </div>
        ${dehum.reason ? html`<p class="dehum-reason">reason: ${dehum.reason}</p>` : nothing}

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

        <button
          class="drawer-toggle"
          @click=${() => { this._drawerOpen = !this._drawerOpen; }}
        >
          ${this._drawerOpen ? "Details ▴" : "Details ▾"}
        </button>
        ${this._drawerOpen
          ? html`<div class="drawer">
              <div class="section">Schedule</div>
              <div class="row"><span class="k">Lights on</span><span class="v">${s.lightsOn ?? "—"}</span></div>
              <div class="row"><span class="k">Lights off</span><span class="v">${s.lightsOff ?? "—"}</span></div>
              ${lightsCountdown
                ? html`<div class="row"><span class="k">Next switch</span><span class="v">${lightsCountdown.next} in ${formatCountdown(lightsCountdown.ms)}</span></div>`
                : nothing}
              <div class="section">Wavemaker</div>
              <div class="row"><span class="k">Entity</span><span class="v">${s.wavemaker.entity ?? "not configured"}</span></div>
              <div class="row"><span class="k">Mode</span><span class="v">${s.wavemaker.mode ?? "—"}</span></div>
              ${s.wavemaker.runS !== null
                ? html`<div class="row"><span class="k">Run</span><span class="v">${s.wavemaker.runS} s</span></div>`
                : nothing}
              ${s.wavemaker.everyMin !== null
                ? html`<div class="row"><span class="k">Every</span><span class="v">${s.wavemaker.everyMin} min</span></div>`
                : nothing}
              <div class="section">Dehumidifier</div>
              <div class="row"><span class="k">Band</span><span class="v">${s.dehumBand.low !== null ? `${s.dehumBand.low.toFixed(2)} – ${s.dehumBand.high !== null ? s.dehumBand.high.toFixed(2) : "?"} kPa` : "—"}</span></div>
              ${s.dehumBand.depth !== null && s.dehumBand.low !== null && reengage !== null
                ? html`<div class="row"><span class="k">Window</span><span class="v">${reengage.toFixed(2)} → ${(s.dehumBand.low + s.dehumBand.depth).toFixed(2)} kPa</span></div>`
                : nothing}
              <div class="row"><span class="k">Cycles 24h</span><span class="v">${cycleTxt || "—"}</span></div>
              <div class="row"><span class="k">Power</span><span class="v">${powerTxt ?? "configure dehum_power_entity"}</span></div>
              <div class="section">Diagnostics</div>
              <div class="row"><span class="k">Master plug</span><span class="v">${s.masterOn === null ? "not configured" : s.masterOn ? "on" : "off"}</span></div>
              <div class="row"><span class="k">Lamp dimmer</span><span class="v">${s.lampOn === null ? "—" : s.lampOn ? "on" : "off"}</span></div>
              ${s.oscillationWarning
                ? html`<div class="row"><span class="k">Oscillation</span><span class="v">warning active</span></div>`
                : nothing}
              ${s.legacyWarning
                ? html`<div class="row"><span class="k">Legacy automations</span><span class="v">still active</span></div>`
                : nothing}
            </div>`
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
