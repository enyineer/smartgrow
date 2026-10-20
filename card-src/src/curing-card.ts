/**
 * SmartGrow Curing Card — jar-grid view for a Curing device.
 *
 * A curing SmartGrow device publishes a summary sensor
 * (sensor.<prefix>_curing_status) plus one sensor per jar. This card is the
 * dedicated view for that device type; the tent controller card
 * (smartgrow-card) never renders jars, and this card never renders tent
 * controls — two device types, two card types.
 */
import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import { cardStyles } from "./styles";
import {
  discoverCuringSummary,
  parseCuringState,
  curingIsFine,
  curingStatusIsFine,
} from "./state";
import type { HomeAssistant } from "./types-ha";

export const CARD_NAME = "smartgrow-curing-card";

export class SmartGrowCuringCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: { type: string; title?: string };

  public static async getConfigElement(): Promise<HTMLElement> {
    // The curing card is config-free (auto-discovers the device); HA falls
    // back to the stub when no editor is provided, so return a stub element.
    const el = document.createElement("ha-card");
    el.textContent = "SmartGrow Curing card needs no configuration.";
    return el;
  }

  public static getStubConfig(): { type: string } {
    return { type: `custom:${CARD_NAME}` };
  }

  public setConfig(config: { type: string; title?: string }): void {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration");
    }
    this._config = { title: "Curing", ...config };
  }

  public getCardSize(): number {
    return 6;
  }

  static styles = cardStyles;

  protected render() {
    if (!this._config || !this.hass) return html``;
    const summaryEntity = discoverCuringSummary(this.hass);
    const curing = summaryEntity
      ? parseCuringState(this.hass, summaryEntity)
      : null;

    if (!curing) {
      return html`<ha-card>
        <div class="setup-hint">
          <div>🫙 No Curing device found.</div>
          <div>
            Set up a SmartGrow "Curing jars" device in the integration first.
          </div>
        </div>
      </ha-card>`;
    }

    const title = this._config?.title ?? "Curing";
    const fine = curingIsFine(curing);
    const statusCls = fine ? "ok" : "warn";
    const statusTxt =
      curing.worst === "ok"
        ? "all jars in band"
        : curing.worst === "unavailable"
          ? "jars unreachable"
          : curing.worst === "sensors_down"
            ? "some jars offline"
            : curing.worst.replace(/_/g, " ");
    const tb = curing.tempBand;
    const rb = curing.rhBand;
    return html`<ha-card>
      <div class="header">
        <div class="title">${title}</div>
        <div class="stage">Curing</div>
        <div class="phase-chip curing ${statusCls === "ok" ? "drying" : "alert"}">
          ${curing.okCount ?? "?"}/${curing.total ?? "?"} ok
        </div>
        <div class="header-icons"></div>
      </div>

      <div class="gauge-row">
        <div class="gauge">
          <div class="fan-big">${statusTxt}</div>
          <div class="fan-sub">
            ${tb ? `${tb[0]}–${tb[1]} °C` : ""}${tb && rb ? " · " : ""}${rb ? `${rb[0]}–${rb[1]} % RH` : ""}
          </div>
        </div>
      </div>

      ${curing.jars.length
        ? html`<div class="jar-grid">
            ${curing.jars.map(
              (jar) => html`
                <div class="jar ${curingStatusIsFine(jar.status) ? "jar-ok" : "jar-bad"}">
                  <div class="jar-name">${jar.name}</div>
                  <div class="jar-reading">
                    ${jar.temp !== null ? html`<span>${jar.temp.toFixed(1)} °C</span>` : nothing}
                    ${jar.rh !== null ? html`<span>${Math.round(jar.rh)} %</span>` : nothing}
                    ${jar.temp === null && jar.rh === null ? html`<span class="jar-missing">no data</span>` : nothing}
                  </div>
                  ${jar.reasons.length
                    ? html`<div class="jar-reasons">${jar.reasons.join(", ")}</div>`
                    : nothing}
                </div>
              `
            )}
          </div>`
        : html`<div class="setup-hint">
            <div>Jar sensors not found yet — first update pending.</div>
          </div>`}

      ${curing.needsAttention.length
        ? html`<div class="alert-strip">
            check: ${curing.needsAttention.join(", ")}
          </div>`
        : nothing}
    </ha-card>`;
  }

}

if (!customElements.get("smartgrow-curing-card")) {
  customElements.define("smartgrow-curing-card", SmartGrowCuringCard);
}

declare global {
  interface Window {
    customCards: Array<Record<string, string | boolean>>;
  }
}
(window as unknown as Window).customCards =
  (window as unknown as Window).customCards || [];
(window as unknown as Window).customCards.push({
  type: CARD_NAME,
  name: "SmartGrow Curing Card",
  description: "Curing-jar grid for a SmartGrow Curing device: per-jar temp/RH/status.",
  documentationURL: "https://github.com/enyineer/smartgrow",
});
