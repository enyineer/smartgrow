function t(t,e,s,i){var n,r=arguments.length,a=r<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,s,i);else for(var o=t.length-1;o>=0;o--)(n=t[o])&&(a=(r<3?n(a):r>3?n(e,s,a):n(e,s))||a);return r>3&&a&&Object.defineProperty(e,s,a),a}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,s=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,i=Symbol(),n=new WeakMap;let r=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==i)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const s=void 0!==e&&1===e.length;s&&(t=n.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&n.set(e,t))}return t}toString(){return this.cssText}};const a=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return(t=>new r("string"==typeof t?t:t+"",void 0,i))(e)})(t):t,{is:o,defineProperty:c,getOwnPropertyDescriptor:l,getOwnPropertyNames:d,getOwnPropertySymbols:h,getPrototypeOf:p}=Object,u=globalThis,g=u.trustedTypes,f=g?g.emptyScript:"",m=u.reactiveElementPolyfillSupport,v=(t,e)=>t,_={toAttribute(t,e){switch(e){case Boolean:t=t?f:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},$=(t,e)=>!o(t,e),y={attribute:!0,type:String,converter:_,reflect:!1,useDefault:!1,hasChanged:$};Symbol.metadata??=Symbol("metadata"),u.litPropertyMetadata??=new WeakMap;let b=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=y){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);void 0!==i&&c(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:n}=l(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const r=i?.call(this);n?.call(this,e),this.requestUpdate(t,r,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??y}static _$Ei(){if(this.hasOwnProperty(v("elementProperties")))return;const t=p(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(v("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(v("properties"))){const t=this.properties,e=[...d(t),...h(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,i)=>{if(s)t.adoptedStyleSheets=i.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of i){const i=document.createElement("style"),n=e.litNonce;void 0!==n&&i.setAttribute("nonce",n),i.textContent=s.cssText,t.appendChild(i)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(void 0!==i&&!0===s.reflect){const n=(void 0!==s.converter?.toAttribute?s.converter:_).toAttribute(e,s.type);this._$Em=t,null==n?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=s.getPropertyOptions(i),n="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:_;this._$Em=i;const r=n.fromAttribute(e,t.type);this[i]=r??this._$Ej?.get(i)??r,this._$Em=null}}requestUpdate(t,e,s,i=!1,n){if(void 0!==t){const r=this.constructor;if(!1===i&&(n=this[t]),s??=r.getPropertyOptions(t),!((s.hasChanged??$)(n,e)||s.useDefault&&s.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:n},r){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??e??this[t]),!0!==n||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,s,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};b.elementStyles=[],b.shadowRootOptions={mode:"open"},b[v("elementProperties")]=new Map,b[v("finalized")]=new Map,m?.({ReactiveElement:b}),(u.reactiveElementVersions??=[]).push("2.1.2");const w=globalThis,x=t=>t,A=w.trustedTypes,S=A?A.createPolicy("lit-html",{createHTML:t=>t}):void 0,E="$lit$",k=`lit$${Math.random().toFixed(9).slice(2)}$`,C="?"+k,P=`<${C}>`,O=document,U=()=>O.createComment(""),H=t=>null===t||"object"!=typeof t&&"function"!=typeof t,T=Array.isArray,R="[ \t\n\f\r]",M=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,N=/-->/g,j=/>/g,L=RegExp(`>|${R}(?:([^\\s"'>=/]+)(${R}*=${R}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),z=/'/g,D=/"/g,F=/^(?:script|style|textarea|title)$/i,I=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),W=Symbol.for("lit-noChange"),B=Symbol.for("lit-nothing"),V=new WeakMap,q=O.createTreeWalker(O,129);function G(t,e){if(!T(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(e):e}const Z=(t,e)=>{const s=t.length-1,i=[];let n,r=2===e?"<svg>":3===e?"<math>":"",a=M;for(let e=0;e<s;e++){const s=t[e];let o,c,l=-1,d=0;for(;d<s.length&&(a.lastIndex=d,c=a.exec(s),null!==c);)d=a.lastIndex,a===M?"!--"===c[1]?a=N:void 0!==c[1]?a=j:void 0!==c[2]?(F.test(c[2])&&(n=RegExp("</"+c[2],"g")),a=L):void 0!==c[3]&&(a=L):a===L?">"===c[0]?(a=n??M,l=-1):void 0===c[1]?l=-2:(l=a.lastIndex-c[2].length,o=c[1],a=void 0===c[3]?L:'"'===c[3]?D:z):a===D||a===z?a=L:a===N||a===j?a=M:(a=L,n=void 0);const h=a===L&&t[e+1].startsWith("/>")?" ":"";r+=a===M?s+P:l>=0?(i.push(o),s.slice(0,l)+E+s.slice(l)+k+h):s+k+(-2===l?e:h)}return[G(t,r+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class J{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let n=0,r=0;const a=t.length-1,o=this.parts,[c,l]=Z(t,e);if(this.el=J.createElement(c,s),q.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=q.nextNode())&&o.length<a;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(E)){const e=l[r++],s=i.getAttribute(t).split(k),a=/([.?@])?(.*)/.exec(e);o.push({type:1,index:n,name:a[2],strings:s,ctor:"."===a[1]?tt:"?"===a[1]?et:"@"===a[1]?st:Q}),i.removeAttribute(t)}else t.startsWith(k)&&(o.push({type:6,index:n}),i.removeAttribute(t));if(F.test(i.tagName)){const t=i.textContent.split(k),e=t.length-1;if(e>0){i.textContent=A?A.emptyScript:"";for(let s=0;s<e;s++)i.append(t[s],U()),q.nextNode(),o.push({type:2,index:++n});i.append(t[e],U())}}}else if(8===i.nodeType)if(i.data===C)o.push({type:2,index:n});else{let t=-1;for(;-1!==(t=i.data.indexOf(k,t+1));)o.push({type:7,index:n}),t+=k.length-1}n++}}static createElement(t,e){const s=O.createElement("template");return s.innerHTML=t,s}}function K(t,e,s=t,i){if(e===W)return e;let n=void 0!==i?s._$Co?.[i]:s._$Cl;const r=H(e)?void 0:e._$litDirective$;return n?.constructor!==r&&(n?._$AO?.(!1),void 0===r?n=void 0:(n=new r(t),n._$AT(t,s,i)),void 0!==i?(s._$Co??=[])[i]=n:s._$Cl=n),void 0!==n&&(e=K(t,n._$AS(t,e.values),n,i)),e}class X{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??O).importNode(e,!0);q.currentNode=i;let n=q.nextNode(),r=0,a=0,o=s[0];for(;void 0!==o;){if(r===o.index){let e;2===o.type?e=new Y(n,n.nextSibling,this,t):1===o.type?e=new o.ctor(n,o.name,o.strings,this,t):6===o.type&&(e=new it(n,this,t)),this._$AV.push(e),o=s[++a]}r!==o?.index&&(n=q.nextNode(),r++)}return q.currentNode=O,i}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class Y{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=B,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=K(this,t,e),H(t)?t===B||null==t||""===t?(this._$AH!==B&&this._$AR(),this._$AH=B):t!==this._$AH&&t!==W&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>T(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==B&&H(this._$AH)?this._$AA.nextSibling.data=t:this.T(O.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=J.createElement(G(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new X(i,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=V.get(t.strings);return void 0===e&&V.set(t.strings,e=new J(t)),e}k(t){T(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const n of t)i===e.length?e.push(s=new Y(this.O(U()),this.O(U()),this,this.options)):s=e[i],s._$AI(n),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=x(t).nextSibling;x(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class Q{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,n){this.type=1,this._$AH=B,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=n,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=B}_$AI(t,e=this,s,i){const n=this.strings;let r=!1;if(void 0===n)t=K(this,t,e,0),r=!H(t)||t!==this._$AH&&t!==W,r&&(this._$AH=t);else{const i=t;let a,o;for(t=n[0],a=0;a<n.length-1;a++)o=K(this,i[s+a],e,a),o===W&&(o=this._$AH[a]),r||=!H(o)||o!==this._$AH[a],o===B?t=B:t!==B&&(t+=(o??"")+n[a+1]),this._$AH[a]=o}r&&!i&&this.j(t)}j(t){t===B?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class tt extends Q{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===B?void 0:t}}class et extends Q{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==B)}}class st extends Q{constructor(t,e,s,i,n){super(t,e,s,i,n),this.type=5}_$AI(t,e=this){if((t=K(this,t,e,0)??B)===W)return;const s=this._$AH,i=t===B&&s!==B||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==B&&(s===B||i);i&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class it{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){K(this,t)}}const nt=w.litHtmlPolyfillSupport;nt?.(J,Y),(w.litHtmlVersions??=[]).push("3.3.3");const rt=globalThis;class at extends b{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,s)=>{const i=s?.renderBefore??e;let n=i._$litPart$;if(void 0===n){const t=s?.renderBefore??null;i._$litPart$=n=new Y(e.insertBefore(U(),t),t,void 0,s??{})}return n._$AI(t),n})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}}at._$litElement$=!0,at.finalized=!0,rt.litElementHydrateSupport?.({LitElement:at});const ot=rt.litElementPolyfillSupport;ot?.({LitElement:at}),(rt.litElementVersions??=[]).push("4.2.2");const ct=t=>(e,s)=>{void 0!==s?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},lt={attribute:!0,type:String,converter:_,reflect:!1,hasChanged:$},dt=(t=lt,e,s)=>{const{kind:i,metadata:n}=s;let r=globalThis.litPropertyMetadata.get(n);if(void 0===r&&globalThis.litPropertyMetadata.set(n,r=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),r.set(s.name,t),"accessor"===i){const{name:i}=s;return{set(s){const n=e.get.call(this);e.set.call(this,s),this.requestUpdate(i,n,t,!0,s)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=s;return function(s){const n=this[i];e.call(this,s),this.requestUpdate(i,n,t,!0,s)}}throw Error("Unsupported decorator location: "+i)};function ht(t){return(e,s)=>"object"==typeof s?dt(t,e,s):((t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}function pt(t){return ht({...t,state:!0,attribute:!1})}const ut=((t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,s,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1],t[0]);return new r(s,t,i)})`
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

  @media (max-width: 450px) {
    .terms {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`,gt="smartgrow",ft={low:1.3,high:1.6},mt=/^-?\d+(\.\d+)?$/;function vt(t){if(null==t)return null;const e=String(t).trim();if(0===e.length)return null;const s=e.toLowerCase();if("unknown"===s||"unavailable"===s||"none"===s||"off"===s||"on"===s)return null;if(!mt.test(e))return null;const i=Number(e);return Number.isFinite(i)?i:null}function _t(t){if(null==t)return null;const e=String(t).trim().toLowerCase();return"on"===e||"true"===e||"1"===e||"off"!==e&&"false"!==e&&"0"!==e&&null}function $t(t,e,s){return Math.min(s,Math.max(e,t))}function yt(t){if(!t||t.missing)return{label:"—",on:null,reason:null};const e=function(t){if(null==t)return null;const e=String(t).trim().toLowerCase();return"unavailable"===e||"unknown"===e?null:"on"===e||"true"===e||"off"!==e&&"false"!==e&&(!(!e.endsWith("_on")&&"turned_on"!==e)||!e.endsWith("_off")&&"turned_off"!==e&&null)}(t.state),s="string"==typeof t.attrs?.reason?t.attrs.reason:null;return{label:t.unavailable?"unavailable":null===e?String(t.state):e?"ON":"OFF",on:e,reason:s}}function bt(t,e){const s=t.replace(/^sensor\./,"").replace(/^binary_sensor\./,"").replace(/^switch\./,""),i=[["fan_target","fan_target","sensor"],["fan_dah_term","fan_dah_term","sensor"],["fan_vpd_term","fan_vpd_term","sensor"],["fan_need_term","fan_need_term","sensor"],["fan_temp_term","fan_temp_term","sensor"],["active_fan_term","active_fan_term","sensor"],["dah","dah","sensor"],["ah_tent","ah_tent","sensor"],["ah_lung_room","ah_lung_room","sensor"],["dehumidifier_decision","dehumidifier_decision","sensor"],["dry_run","dry_run","sensor"],["cycles_24h","cycles_24h","sensor"],["stage","stage","select"],["adaptation","adaptation","switch"],["oscillation_warning","oscillation_warning","binary_sensor"],["legacy_automation_warning","legacy_automation_warning","binary_sensor"]],n={};for(const[t,r,a]of i){const i=e?.[t];i&&i.length>0?n[t]=i:n[t]=`${a}.${s}_${r}`}for(const[t,s]of Object.entries(e??{}))!(t in n)&&s&&(n[t]=s);return n}function wt(t,e){if(!e||!t||!t.states)return{entityId:e,missing:!0,unavailable:!1};const s=t.states[e];if(!s)return{entityId:e,missing:!0,unavailable:!1};const i="unavailable"===s.state||"unknown"===s.state;return{entityId:e,state:s.state,attrs:s.attributes??{},missing:!1,unavailable:i}}function xt(t,e,s){const i=wt(t,e.fan_target),n=wt(t,e.dah),r=wt(t,e.stage),a=wt(t,e.dehumidifier_decision),o=function(t){const e=wt(t,"lamp");if(!e.missing&&e.state){const t=_t(e.state);if(null!==t)return t?"day":"night"}try{const t=(new Date).getHours();return t>=6&&t<18?"day":"night"}catch{return"unknown"}}(t),c=function(t,e){if(!t)return{low:1.3,high:1.6};const s=String(t).trim();return"Seedling"===s?"night"===e?{low:.6,high:.9}:{low:.8,high:1.1}:"Vegetative"===s?"night"===e?{low:.9,high:1.2}:{low:1.1,high:1.4}:"Flowering"===s?"night"===e?{low:1.3,high:1.6}:{low:1.5,high:1.8}:{low:1.3,high:1.6}}(r?.state,o),l=(!r||r.missing)&&s?s:c,d=function(t){const e=t?.attrs?.friendly_name;if("string"==typeof e&&e.length>0){const t=e.replace(/\s+(fan\s+target|fan\s+ΔAH\s+term|fan\s+VPD\s+term|fan\s+need\s+term|fan\s+temp\s+term|active\s+fan\s+term|ΔAH|AH.*|dehumidifier.*|dry\s+run.*|dehumidifier.*cycles.*|cycles.*24\s?h.*|stage|adaptation.*|oscillation.*|legacy.*)$/i,"");if(t.length>0)return t.trim()}return"SmartGrow"}(i.missing?a:i),h=Object.values(e).filter(t=>!!t),p=h.some(e=>void 0!==t?.states?.[e]),u=null!==vt(i.state)||null!==vt(n.state)||null!==vt(wt(t,e.fan_vpd_term).state),g=vt(wt(t,e.vpd??"").state),f=wt(t,e.dry_run),m=wt(t,e.adaptation),v=wt(t,e.oscillation_warning),_=wt(t,e.legacy_automation_warning),$=a.attrs??{},y=$.fan_pct;return{device:d,stage:r&&!r.missing?String(r.state):"",phase:o,fanTarget:vt(i.state),fanActual:St(t,i),terms:{dah:vt(wt(t,e.fan_dah_term).state),vpd:vt(wt(t,e.fan_vpd_term).state),need:vt(wt(t,e.fan_need_term).state),temp:vt(wt(t,e.fan_temp_term).state)},activeTerm:At(wt(t,e.active_fan_term)),dah:vt(n.state),vpd:g,bandLow:l.low,bandHigh:l.high,dehumAction:a&&!a.missing?String(a.state):null,dehumReason:"string"==typeof $.reason?$.reason:null,dehumFanPct:"number"==typeof y?y:null,dryRun:_t(f.state),adaptation:_t(m.state),oscillationWarning:_t(v.state),legacyWarning:_t(_.state),cycles24h:vt(wt(t,e.cycles_24h).state),empty:!p||!u&&!p}}function At(t){if(!t||t.missing||t.unavailable)return null;const e=String(t.state).trim(),s=e.toLowerCase();return["dah","delta","vpd","need","temp","floor","min_fan"].some(t=>s.includes(t))?e:null}function St(t,e){const s=e?.attrs?.fan_entity;if("string"==typeof s&&t?.states?.[s]){const e=t.states[s],i=vt(String(e.attributes?.percentage??""));if(null!==i)return i}return null}const Et=new Map;const kt=["fan_target","fan_dah_term","fan_vpd_term","fan_need_term","fan_temp_term","active_fan_term","dah","ah_tent","ah_lung_room","dehumidifier_decision","dry_run","cycles_24h"];let Ct=class extends at{setConfig(t){this._config=t}configChanged(t){this._config=t,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:t},bubbles:!0,composed:!0}))}_valueChanged(t,e){if(!this._config)return;const s=e.target,i=(s?.value??"").trim();if(!i){const{[t]:e,...s}=this._config;return void this.configChanged({type:this._config.type,...s})}this.configChanged({...this._config,[t]:i})}_entityChanged(t,e){if(!this._config)return;const s=e.target,i=(s?.value??"").trim(),n={...this._config.entities??{}};if(i?n[t]=i:delete n[t],0===Object.keys(n).length){const{entities:t,...e}=this._config;this.configChanged({...e})}else this.configChanged({...this._config,entities:n})}render(){if(!this._config)return B;const t=this._config.prefix??gt,e=bt(t,this._config.entities);return I`
      <div class="card-config" style="display:flex;flex-direction:column;gap:8px;padding:8px">
        <ha-textfield
          label="Entity prefix"
          .value=${t}
          placeholder=${gt}
          @change=${t=>this._valueChanged("prefix",t)}
        ></ha-textfield>
        <ha-textfield
          label="Title (optional)"
          .value=${this._config.title??""}
          @change=${t=>this._valueChanged("title",t)}
        ></ha-textfield>

        <div style="font-size:0.85rem;opacity:0.7">
          Or override individual entities (empty = derive from prefix):
        </div>
        ${kt.map(t=>I`
            <ha-textfield
              label=${t}
              .value=${this._config?.entities?.[t]??""}
              placeholder=${e[t]??t}
              @change=${e=>this._entityChanged(t,e)}
            ></ha-textfield>
          `)}
      </div>
    `}};t([ht({attribute:!1})],Ct.prototype,"hass",void 0),t([pt()],Ct.prototype,"_config",void 0),Ct=t([ct("smartgrow-card-editor")],Ct),customElements.define("smartgrow-card-editor",Ct);const Pt="0.1.0",Ot="smartgrow-card";let Ut=class extends at{constructor(){super(...arguments),this._sparkPoints=[]}static async getConfigElement(){return document.createElement("smartgrow-card-editor")}static getStubConfig(t){return{type:`custom:${Ot}`,prefix:gt}}setConfig(t){if(!t||"object"!=typeof t)throw new Error("Invalid configuration");this._config={prefix:gt,show_setup_hint:!0,...t},this._sparkLoadedFor=void 0,this._sparkPoints=[]}getCardSize(){return 6}static{this.styles=ut}willUpdate(t){super.willUpdate(t),this._config&&this.hass&&this._maybeLoadSparkline()}_ids(){return bt(this._config?.prefix??gt,this._config?.entities)}async _maybeLoadSparkline(){const t=this._ids().dah;if(t&&this.hass&&this.hass.states?.[t]&&this._sparkLoadedFor!==t){this._sparkLoadedFor=t;try{const e=await async function(t,e,s,i=Date.now()){const n=`${e}@${s}`,r=Et.get(n);if(r&&i-r.at<3e5)return r.data;const a=new Date(i-3600*s*1e3),o=new Date(i);try{const s=await t.callApi("GET","history/period",`filter_entity_id=${encodeURIComponent(e)}`,`start=${encodeURIComponent(a.toISOString())}`,`end=${encodeURIComponent(o.toISOString())}`,"minimal_response","no_attributes");return Et.set(n,{at:i,data:s}),s}catch{return null}}(this.hass,t,24);this._sparkPoints=function(t,e){if(!t||"object"!=typeof t)return[];const s=t[e];if(!Array.isArray(s))return[];const i=[];for(const t of s)if(Array.isArray(t))for(const e of t){const t=vt(e?.state);if(null===t||!e?.last_changed)continue;const s=Date.parse(e.last_changed);Number.isFinite(s)&&i.push({t:s,v:t})}return i}(e??{},t)}catch{this._sparkPoints=[]}}}_renderSetupHint(t){return!1===this._config?.show_setup_hint?B:I`
      <div class="setup-hint">
        <div>🌱 SmartGrow entities not found.</div>
        <div>
          Expected prefix <code>${this._config?.prefix??gt}</code>
          (${t.slice(0,3).join(", ")}…).
        </div>
        <div>
          Set up the SmartGrow integration first, or edit this card to pick
          your entities.
        </div>
      </div>
    `}render(){if(!this._config||!this.hass)return I``;const t=this._ids(),e=xt(this.hass,t,ft);if(e.empty){const e=Object.values(t).filter(t=>!!t&&!this.hass?.states?.[t]);return I`<ha-card>${this._renderSetupHint(e)}</ha-card>`}const s=this._config.title??e.device,i=null!==e.fanActual?I`<span class="fan-sub">actual ${Math.round(e.fanActual)} %</span>`:B,n=(r=e.vpd,a=e.bandLow,o=e.bandHigh,null!==r&&Number.isFinite(r)&&o>a?$t((r-a)/(o-a),-.25,1.25):null);var r,a,o;const c=null===(l=n)?"unknown":l<0?"low":l>1?"high":"ok";var l;const d=null===n?null:$t((n+.25)/1.5*100,0,100),h=$t(.25/1.5*100,0,100),p=$t(1.25/1.5*100,0,100),u=function(t,e,s,i){const n=t.filter(t=>Number.isFinite(t.v));if(n.length<2||e<=0||s<=0)return null;const r=n.map(t=>t.v);let a=Math.min(...r),o=Math.max(...r);if(o-a<.05){const t=(o+a)/2;a=t-.025,o=t+.025}const c=n[0].t,l=n[n.length-1].t-c||1,d=n.map(t=>({x:i+(t.t-c)/l*(e-2*i),y:s-i-(t.v-a)/(o-a)*(s-2*i)})),h=d.map((t,e)=>`${0===e?"M":"L"}${t.x.toFixed(1)},${t.y.toFixed(1)}`).join(" ");return{line:h,area:`${h} L${d[d.length-1].x.toFixed(1)},${s-i} L${d[0].x.toFixed(1)},${s-i} Z`,min:a,max:o}}(this._sparkPoints,300,54,4),g=yt(wt(this.hass,t.dehumidifier_decision)),f=[{key:"dah",label:"ΔAH",value:e.terms.dah,active:"dah"===e.activeTerm},{key:"vpd",label:"VPD",value:e.terms.vpd,active:"vpd"===e.activeTerm},{key:"need",label:"need",value:e.terms.need,active:"need"===e.activeTerm},{key:"temp",label:"temp",value:e.terms.temp,active:"temp"===e.activeTerm}],m=null!==e.cycles24h?`${e.cycles24h} cyc/24h`:"";return I`
      <ha-card>
        <div class="header">
          <div class="title">${s}</div>
          ${e.stage?I`<div class="stage">${e.stage}</div>`:B}
          <div class="phase-chip ${e.phase}">${e.phase}</div>
        </div>

        <div class="gauge-row">
          <div class="gauge">
            <div class="fan-big">${null!==e.fanTarget?`${Math.round(e.fanTarget)} %`:"—"}</div>
            <div class="fan-sub">fan target ${i}</div>
          </div>
          <div style="flex:1">
            <div class="fan-sub">VPD ${null!==e.vpd?e.vpd.toFixed(2):"—"} kPa · band ${e.bandLow.toFixed(1)}–${e.bandHigh.toFixed(1)}</div>
            <div class="band-bar">
              <div class="band-ok" style="left:${h}%; width:${p-h}%"></div>
              ${null!==d?I`<div class="band-marker ${"ok"===c?"":c}" style="left:${d}%"></div>`:B}
            </div>
            <div class="band-labels"><span>drier</span><span>${"unknown"===c?"VPD unknown":"low"===c?"below band":"high"===c?"above band":"in band"}</span><span>humid</span></div>
          </div>
        </div>

        <div class="spark-wrap">
          <div class="spark-title">ΔAH tent↔lung · last ${24} h ${null!==e.dah?`· now ${e.dah.toFixed(2)} g/m³`:""}</div>
          ${u?I`
                <svg class="spark-svg" viewBox="0 0 300 54" preserveAspectRatio="none">
                  <path class="spark-area" d="${u.area}"></path>
                  <path class="spark-line" d="${u.line}"></path>
                </svg>
              `:I`<div class="spark-empty">no history yet — recording…</div>`}
        </div>

        <div class="chip-row">
          <span class="chip ${null===g.on?"":g.on?"on":"off"}">
            💧 dehum ${g.label}
          </span>
          ${null!==e.dryRun?I`<span class="chip ${e.dryRun?"dryrun":"off"}">${e.dryRun?"DRY RUN":"live"}</span>`:B}
          ${null!==e.adaptation?I`<span class="chip ${e.adaptation?"on":"off"}">adaptation ${e.adaptation?"on":"off"}</span>`:B}
          ${m?I`<span class="chip">${m}</span>`:B}
        </div>
        ${g.reason?I`<p class="dehum-reason">reason: ${g.reason}</p>`:B}

        <div class="terms">
          ${f.map(t=>I`
              <div class="term ${t.active?"active":""}">
                <div class="term-name">
                  <span>${t.label}</span>
                  <span class="val">${null!==t.value?`${t.value.toFixed(0)}%`:"—"}</span>
                </div>
                <div class="term-bar">
                  <div class="term-fill" style="width:${function(t){return null!==t&&Number.isFinite(t)?$t(t,0,100):0}(t.value)}%"></div>
                </div>
              </div>
            `)}
        </div>
        ${e.activeTerm?I`<div class="fan-sub" style="margin-top:6px">active term: ${e.activeTerm}</div>`:B}

        ${e.oscillationWarning||e.legacyWarning?I`
              <div class="warning-banner">
                ⚠️
                ${e.oscillationWarning?I`<span>dehumidifier oscillation</span>`:B}
                ${e.oscillationWarning&&e.legacyWarning?I`<span>·</span>`:B}
                ${e.legacyWarning?I`<span>legacy automations still active</span>`:B}
              </div>
            `:B}
      </ha-card>
    `}};t([ht({attribute:!1})],Ut.prototype,"hass",void 0),t([pt()],Ut.prototype,"_config",void 0),t([pt()],Ut.prototype,"_sparkPoints",void 0),Ut=t([ct("smartgrow-card")],Ut),customElements.define("smartgrow-card",Ut),window.customCards=window.customCards||[],window.customCards.push({type:"smartgrow-card",name:"SmartGrow Card",description:"Grow-tent overview for the SmartGrow integration: fan gauge, VPD band, ΔAH sparkline, dehumidifier chip.",documentationURL:"https://github.com/niggo/smartgrow-card"});export{Ot as CARD_NAME,Pt as CARD_VERSION,Ut as SmartGrowCard,Ct as SmartGrowCardEditor};
