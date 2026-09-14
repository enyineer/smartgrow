
class CSSStyleSheetShim {
  constructor(){ this.cssRules = []; }
  replace(){ return Promise.resolve(); }
  replaceSync(){ }
  insertRule(){ return 0; }
  deleteRule(){}
}
global.CSSStyleSheet = CSSStyleSheetShim;
CSSStyleSheet.prototype.replace = function(){ return Promise.resolve(); };
CSSStyleSheet.prototype.replaceSync = function(){};

const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'https://homeassistant.local:8443/' });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.customElements = dom.window.customElements;
global.ShadowRoot = dom.window.ShadowRoot;
global.Document = dom.window.Document;
global.CSSStyleSheet = global.CSSStyleSheet || class { replace(){return Promise.resolve()} replaceSync(){} insertRule(){return 0} deleteRule(){} };
global.navigator = dom.window.navigator;
global.localStorage = dom.window.localStorage;

(async () => {
  await import('./dist/smartgrow-card.js');
  const cls = customElements.get('smartgrow-card');
  console.log('element defined:', !!cls);
  const inst = new cls();
  try {
    inst.setConfig({ type: 'custom:smartgrow-card', device_id: '821deec2724ea223225626755f54435c',
                     prefix: 'smartgrow_smartgrow', title: 'Growbox' });
    console.log('setConfig OK');
    inst.hass = JSON.parse(require('fs').readFileSync('src/live-states.json') && 'null') || null;
    // build minimal hass from the live snapshot
    const live = require('./src/live-states.json');
    inst.hass = { states: live, callApi: async () => [], auth: { accessToken: 'x' } };
    try {
      const out = await inst.render();
      console.log('render OK');
    } catch (e) {
      console.log('render THREW:', e.message);
    }
  } catch (e) {
    console.log('setConfig THREW:', e.message);
  }
})();
