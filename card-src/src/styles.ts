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

  @media (max-width: 450px) {
    .terms {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;
