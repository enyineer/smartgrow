export { SmartGrowCard, CARD_VERSION, CARD_NAME } from "./smartgrow-card";
export { SmartGrowCuringCard, CARD_NAME as CURING_CARD_NAME } from "./curing-card";
export { SmartGrowCardEditor } from "./smartgrow-card-editor";

// Side-effect imports ensure the custom elements register on load.
import "./smartgrow-card";
import "./smartgrow-card-editor";
import "./curing-card";

// Tell HA about the cards (best-effort; works with or without the resource helper).
(window as unknown as Window).customCards = (window as unknown as Window).customCards || [];
(window as unknown as Window).customCards.push({
  type: "smartgrow-card",
  name: "SmartGrow Card",
  description: "Grow-tent overview for the SmartGrow integration: fan gauge, VPD band, ΔAH sparkline, dehumidifier chip.",
  documentationURL: "https://github.com/enyineer/smartgrow",
});
(window as unknown as Window).customCards.push({
  type: "smartgrow-curing-card",
  name: "SmartGrow Curing Card",
  description: "Curing-jar grid for a SmartGrow Curing device: per-jar temp/RH/status tiles.",
  documentationURL: "https://github.com/enyineer/smartgrow",
});
