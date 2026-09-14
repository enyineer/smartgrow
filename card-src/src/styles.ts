import { css } from "lit";

export const cardStyles = css`
  :host {
    --sgc-accent: var(--accent-color, #ff9800);
    --sgc-ok: var(--success-color, #43a047);
    --sgc-warn: var(--warning-color, #ffa600);
    --sgc-error: var(--error-color, #db4437);
    --sgc-card-bg: var(--card-background-color, var(--primary-background-color, #fff));
    --sgc-primary: var(--primary-text-color, #212121);
    --sgc-secondary: var(--secondary-text-color, #727272);
    --sgc-divider: var(--divider-color, rgba(0, 0, 0, 0.12));
    --sgc-state-on: var(--state-icon-active-color, var(--sgc-ok));
    --sgc-radius: var(--ha-card-border-radius, 12px);
  }
  ha-card {
    background: var(--sgc-card-bg);
    color: var(--sgc-primary);
    border-radius: var(--sgc-radius);
    padding: 16px;
    display: block;
  }
  .header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;
  }
  .header .title {
    font-size: 1.15rem;
    font-weight: 600;
    flex: 1;
  }
  .header .stage {
    font-size: 0.85rem;
    color: var(--sgc-secondary);
  }
  .phase-chip {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--sgc-divider);
    color: var(--sgc-secondary);
  }
  .phase-chip.day {
    background: color-mix(in srgb, var(--sgc-warn) 20%, transparent);
    color: var(--sgc-warn);
  }
  .phase-chip.night {
    background: color-mix(in srgb, var(--info-color, #2196f3) 20%, transparent);
    color: var(--info-color, #2196f3);
  }
  .header-icons {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .badge-dry {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--sgc-warn) 25%, transparent);
    color: var(--sgc-warn);
  }
  .alert-pill {
    font-size: 0.72rem;
    font-weight: 700;
    min-width: 20px;
    text-align: center;
    padding: 2px 6px;
    border-radius: 10px;
    background: var(--sgc-error);
    color: #fff;
  }
  .camera-icon {
    background: none;
    border: none;
    color: var(--sgc-secondary);
    cursor: pointer;
    padding: 2px;
    display: inline-flex;
  }

  .gauge-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 8px 0;
  }
  .gauge {
    --gauge-color: var(--sgc-accent);
    min-width: 120px;
  }
  .fan-numbers {
    flex: 1;
  }
  .fan-big {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.1;
  }
  .fan-sub {
    color: var(--sgc-secondary);
    font-size: 0.85rem;
  }

  .band-bar {
    position: relative;
    height: 14px;
    border-radius: 7px;
    background: var(--sgc-divider);
    margin: 6px 0 2px;
    overflow: visible;
  }
  .band-ok {
    position: absolute;
    top: 0;
    bottom: 0;
    background: color-mix(in srgb, var(--sgc-ok) 35%, transparent);
    border-radius: 7px;
  }
  .band-marker {
    position: absolute;
    top: -3px;
    width: 4px;
    height: 20px;
    border-radius: 2px;
    background: var(--sgc-primary);
    transform: translateX(-2px);
    transition: left 0.4s ease;
  }
  .band-marker.low {
    background: var(--sgc-info, #2196f3);
  }
  .band-marker.high {
    background: var(--sgc-error);
  }
  .band-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.72rem;
    color: var(--sgc-secondary);
  }

  .spark-wrap {
    margin: 10px 0 4px;
  }
  .spark-title {
    font-size: 0.8rem;
    color: var(--sgc-secondary);
    margin-bottom: 2px;
  }
  .spark-svg {
    width: 100%;
    height: 54px;
    display: block;
  }
  .spark-line {
    fill: none;
    stroke: var(--sgc-accent);
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .spark-area {
    fill: color-mix(in srgb, var(--sgc-accent) 15%, transparent);
    stroke: none;
  }
  .spark-empty {
    font-size: 0.8rem;
    color: var(--sgc-secondary);
    font-style: italic;
  }

  .status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 10px 0;
  }
  .tile {
    background: color-mix(in srgb, var(--sgc-divider) 40%, transparent);
    border-radius: 10px;
    padding: 8px 10px;
    min-width: 0;
  }
  .tile .tile-name {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sgc-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .tile .tile-value {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 2px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tile .tile-sub {
    font-size: 0.72rem;
    color: var(--sgc-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tile .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    background: var(--sgc-divider);
  }
  .tile .dot.on {
    background: var(--sgc-state-on);
  }
  .tile .dot.off {
    background: var(--sgc-secondary);
  }
  .tile .dot.warn {
    background: var(--sgc-error);
  }
  .tile.unavailable .tile-value {
    color: var(--sgc-secondary);
    font-weight: 400;
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78rem;
    padding: 3px 10px;
    border-radius: 12px;
    background: var(--sgc-divider);
    color: var(--sgc-secondary);
  }
  .chip.on {
    background: color-mix(in srgb, var(--sgc-ok) 22%, transparent);
    color: var(--sgc-ok);
  }
  .chip.off {
    background: color-mix(in srgb, var(--sgc-secondary) 18%, transparent);
  }
  .chip.warn {
    background: color-mix(in srgb, var(--sgc-error) 20%, transparent);
    color: var(--sgc-error);
    font-weight: 600;
  }
  .chip.dryrun {
    background: color-mix(in srgb, var(--sgc-warn) 22%, transparent);
    color: var(--sgc-warn);
  }
  .chip.reason {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .alert-strip {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 8px 0;
  }
  .alert-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    padding: 5px 8px;
    border-radius: 6px;
    border-left: 3px solid var(--sgc-error);
    background: color-mix(in srgb, var(--sgc-error) 10%, transparent);
  }
  .alert-row.info {
    border-left-color: var(--info-color, #2196f3);
    background: color-mix(in srgb, var(--info-color, #2196f3) 10%, transparent);
  }

  .terms {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 6px;
  }
  .term {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .term-name {
    font-size: 0.72rem;
    color: var(--sgc-secondary);
    display: flex;
    justify-content: space-between;
  }
  .term-name .val {
    font-variant-numeric: tabular-nums;
  }
  .term-bar {
    height: 6px;
    border-radius: 3px;
    background: var(--sgc-divider);
    overflow: hidden;
  }
  .term-fill {
    height: 100%;
    border-radius: 3px;
    background: var(--sgc-secondary);
    transition: width 0.4s ease;
  }
  .term.active .term-fill {
    background: var(--sgc-accent);
  }
  .term.active .term-name {
    color: var(--sgc-primary);
    font-weight: 600;
  }

  .setup-hint {
    text-align: center;
    padding: 12px;
    color: var(--sgc-secondary);
  }
  .setup-hint code {
    background: var(--sgc-divider);
    padding: 2px 6px;
    border-radius: 4px;
  }
  .setup-hint a {
    color: var(--sgc-accent);
  }

  .warning-banner {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 0.8rem;
    background: color-mix(in srgb, var(--sgc-error) 15%, transparent);
    color: var(--sgc-error);
  }

  .dehum-reason {
    font-size: 0.75rem;
    color: var(--sgc-secondary);
    margin: 2px 0 0;
    font-style: italic;
  }

  .camera-open {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    margin: 8px 0;
    border: 1px solid var(--divider-color, #444);
    border-radius: 8px;
    background: var(--card-background-color, #1c1c1c);
    color: var(--primary-text-color, #eee);
    font-size: 14px;
    cursor: pointer;
  }
  .camera-open:hover {
    filter: brightness(1.15);
  }

  .drawer-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    background: none;
    border: none;
    border-top: 1px solid var(--sgc-divider);
    color: var(--sgc-secondary);
    font-size: 0.8rem;
    padding: 8px 0 2px;
    cursor: pointer;
  }
  .drawer {
    padding-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .drawer .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.8rem;
  }
  .drawer .row .k {
    color: var(--sgc-secondary);
    flex-shrink: 0;
  }
  .drawer .row .v {
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .drawer .section {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sgc-secondary);
    border-bottom: 1px solid var(--sgc-divider);
    padding-bottom: 2px;
    margin-top: 4px;
  }

  @media (max-width: 450px) {
    .terms {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;
