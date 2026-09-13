import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { DEFAULT_PREFIX, ENTITY_KINDS } from "./const";
import { resolveEntityIds, listSmartGrowDevices } from "./state";
import type { SmartGrowCardConfig, SmartGrowEntities } from "./types";

const FORM_ENTITY_KEYS = ENTITY_KINDS;

/**
 * Editor built ENTIRELY on native form elements (<select>, <input>).
 *
 * No ha-textfield / ha-device-picker: those are HA-internal custom elements
 * that do not reliably upgrade inside the companion app's card-dialog
 * shadow context (fields rendered invisible on some Android WebViews —
 * the "can't configure the device" bug). Native inputs render everywhere.
 */
@customElement("smartgrow-card-editor")
export class SmartGrowCardEditor extends LitElement {
  // The Lovelace dialog assigns `hass` after creation (loosely typed — we only
  // read registry maps off it, never HA-frontend component APIs).
  @property({ attribute: false }) public hass?: Record<string, unknown>;

  @state() private _config?: SmartGrowCardConfig;

  setConfig(config: SmartGrowCardConfig): void {
    this._config = config;
  }

  configChanged(cfg: SmartGrowCardConfig): void {
    this._config = cfg;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: cfg },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _apply(partial: Partial<SmartGrowCardConfig>): void {
    if (!this._config) return;
    const next: SmartGrowCardConfig = { ...this._config, ...partial };
    // Drop keys explicitly set to undefined (e.g. cleared prefix).
    for (const [k, v] of Object.entries(partial)) {
      if (v === undefined) delete (next as unknown as Record<string, unknown>)[k];
    }
    this.configChanged(next);
  }

  private _deviceChanged(ev: Event): void {
    const sel = ev.target as HTMLSelectElement;
    const value = sel.value;
    if (!value) {
      this._apply({ device_id: undefined, prefix: undefined });
      return;
    }
    const devices = listSmartGrowDevices(this.hass as never);
    const chosen = devices.find((d) => d.device_id === value);
    this._apply({ device_id: value, prefix: chosen ? chosen.prefix : undefined });
  }

  private _prefixChanged(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const val = input.value.trim();
    this._apply({ prefix: val || undefined });
  }

  private _titleChanged(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const val = input.value.trim();
    this._apply({ title: val || undefined });
  }

  private _entityChanged(key: string, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const val = input.value.trim();
    const entities: SmartGrowEntities = { ...(this._config?.entities ?? {}) };
    if (val) entities[key as keyof SmartGrowEntities] = val;
    else delete entities[key as keyof SmartGrowEntities];
    this._apply({ entities: Object.keys(entities).length ? entities : undefined });
  }

  protected createRenderRoot(): HTMLElement {
    // Native (no shadow DOM): native <select>/<input> + inline styles render
    // identically in every context, and the dialog's own CSS variables apply.
    return this;
  }

  protected render() {
    if (!this._config) return nothing;
    const prefix = this._config.prefix ?? DEFAULT_PREFIX;
    const ids = resolveEntityIds(prefix, this._config.entities);
    const devices = listSmartGrowDevices(this.hass as never);
    const activeDevice =
      this._config.device_id ??
      (devices.find((d) => d.prefix === (this._config?.prefix ?? ""))?.device_id ?? "");

    const inputStyle =
      "width:100%;box-sizing:border-box;padding:10px 12px;margin:2px 0 10px;border:1px solid var(--divider-color,#444);border-radius:6px;background:var(--card-background-color,#1c1c1c);color:var(--primary-text-color,#eee);font-size:14px";
    const labelStyle = "font-size:0.85rem;opacity:0.75;margin-top:6px";

    return html`
      <div style="display:flex;flex-direction:column;gap:2px;padding:8px">
        ${devices.length > 0
          ? html`
              <label for="sg-device" style=${labelStyle}>SmartGrow device</label>
              <select id="sg-device" style=${inputStyle} @change=${this._deviceChanged}>
                <option value="">— pick device —</option>
                ${devices.map(
                  (d) => html`<option value=${d.device_id} ?selected=${d.device_id === activeDevice}>
                    ${d.label}${d.prefix ? ` (${d.prefix})` : ""}
                  </option>`
                )}
              </select>
            `
          : html`<div style=${labelStyle}>
              No SmartGrow devices found — set the entity prefix manually below.
            </div>`}

        <label for="sg-prefix" style=${labelStyle}>Entity prefix</label>
        <input
          id="sg-prefix"
          type="text"
          style=${inputStyle}
          .value=${prefix}
          placeholder=${DEFAULT_PREFIX}
          @change=${this._prefixChanged}
        />

        <label for="sg-title" style=${labelStyle}>Title (optional)</label>
        <input
          id="sg-title"
          type="text"
          style=${inputStyle}
          .value=${this._config.title ?? ""}
          @change=${this._titleChanged}
        />

        <div style=${labelStyle}>Override individual entities (empty = derive from prefix / integration config):</div>
        ${FORM_ENTITY_KEYS.map(
          (kind: string) => html`
            <label for=${"sg-ent-" + kind} style=${labelStyle}>${kind}</label>
            <input
              id=${"sg-ent-" + kind}
              type="text"
              style=${inputStyle}
              .value=${this._config?.entities?.[kind as keyof SmartGrowEntities] ?? ""}
              placeholder=${ids[kind] ?? kind}
              @change=${(ev: Event) => this._entityChanged(kind, ev)}
            />
          `
        )}
        ${["vpd", "camera", "lamp"].map((kind: string) => html`
          <label for=${"sg-ent-" + kind} style=${labelStyle}>${kind} (external — from integration config)</label>
          <input
            id=${"sg-ent-" + kind}
            type="text"
            style=${inputStyle}
            .value=${this._config?.entities?.[kind as keyof SmartGrowEntities]
              ?? (this._config?.camera_entity && kind === "camera" ? this._config.camera_entity : "")}
            placeholder=${ids[kind] ?? "auto from integration sources"}
            @change=${(ev: Event) => {
              this._entityChanged(kind, ev);
              if (kind === "camera") {
                const val = (ev.target as HTMLInputElement).value.trim();
                this._apply({ camera_entity: val || undefined });
              }
            }}
          />
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "smartgrow-card-editor": SmartGrowCardEditor;
  }
}

if (!customElements.get("smartgrow-card-editor")) {
  customElements.define("smartgrow-card-editor", SmartGrowCardEditor);
}
