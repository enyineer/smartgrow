class CSSStyleSheetShim {
  constructor(){ this.cssRules = []; }
  replace(){ return Promise.resolve(); }
  replaceSync(){ }
  insertRule(){ return 0; }
  deleteRule(){}
}
global.CSSStyleSheet = CSSStyleSheetShim;
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'https://homeassistant.local:8443/dashboard-growbox' });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.customElements = dom.window.customElements;
global.ShadowRoot = dom.window.ShadowRoot;
global.Document = dom.window.Document;
global.navigator = dom.window.navigator;
global.localStorage = dom.window.localStorage;

const live = require('./src/live-states.json');

(async () => {
  await import('./dist/smartgrow-card.js');
  const cls = customElements.get('smartgrow-card');
  const inst = new cls();
  inst.setConfig({ type: 'custom:smartgrow-card', device_id: '821deec2724ea223225626755f54435c',
                   prefix: 'smartgrow_smartgrow', title: 'Growbox' });
  const hass = {
    states: live,
    callApi: async () => [],
    auth: { accessToken: 'tok' },
    connection: { subscribeMessage: async () => () => {} },
    callService: async () => {},
  };
  try {
    inst.hass = hass;
    const out = await inst.render();
    console.log('full lifecycle render OK');
  } catch (e) {
    console.log('render THREW:', e.message);
  }
  // also render twice (update path)
  try {
    inst.hass = { ...hass, states: { ...live } };
    await inst.render();
    console.log('second render OK');
  } catch (e) {
    console.log('second render THREW:', e.message);
  }
})();
