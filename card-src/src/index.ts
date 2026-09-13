export { SmartGrowCard, CARD_VERSION, CARD_NAME } from "./smartgrow-card";
export { SmartGrowCardEditor } from "./smartgrow-card-editor";

// Side-effect imports ensure the custom elements register on load.
import "./smartgrow-card";
import "./smartgrow-card-editor";

// Tell HA about the card (best-effort; works with or without the resource helper).
(window as unknown as Window).customCards = (window as unknown as Window).customCards || [];
(window as unknown as Window).customCards.push({
  type: "smartgrow-card",
  name: "SmartGrow Card",
  description: "Grow-tent overview for the SmartGrow integration: fan gauge, VPD band, ΔAH sparkline, dehumidifier chip.",
  documentationURL: "https://github.com/niggo/smartgrow-card",
});
