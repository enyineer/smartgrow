var _Symbol$metadata, _u$litPropertyMetadat, _u$reactiveElementVer, _w$litHtmlVersions, _rt$litElementHydrate, _rt$litElementVersion, _Class;
function t(t, e, s, i) {
  var n,
    r = arguments.length,
    a = r < 3 ? e : null === i ? i = Object.getOwnPropertyDescriptor(e, s) : i;
  if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) a = Reflect.decorate(t, e, s, i);else for (var o = t.length - 1; o >= 0; o--) (n = t[o]) && (a = (r < 3 ? n(a) : r > 3 ? n(e, s, a) : n(e, s)) || a);
  return r > 3 && a && Object.defineProperty(e, s, a), a;
}
"function" == typeof SuppressedError && SuppressedError;
const e = globalThis,
  s = e.ShadowRoot && (void 0 === e.ShadyCSS || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype,
  i = Symbol(),
  n = new WeakMap();
let r = class {
  constructor(t, e, s) {
    if (this._$cssResult$ = !0, s !== i) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (s && void 0 === t) {
      const s = void 0 !== e && 1 === e.length;
      s && (t = n.get(e)), void 0 === t && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), s && n.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const a = s ? t => t : t => t instanceof CSSStyleSheet ? (t => {
    let e = "";
    for (const s of t.cssRules) e += s.cssText;
    return (t => new r("string" == typeof t ? t : t + "", void 0, i))(e);
  })(t) : t,
  {
    is: o,
    defineProperty: c,
    getOwnPropertyDescriptor: l,
    getOwnPropertyNames: d,
    getOwnPropertySymbols: h,
    getPrototypeOf: p
  } = Object,
  u = globalThis,
  f = u.trustedTypes,
  g = f ? f.emptyScript : "",
  m = u.reactiveElementPolyfillSupport,
  _ = (t, e) => t,
  v = {
    toAttribute(t, e) {
      switch (e) {
        case Boolean:
          t = t ? g : null;
          break;
        case Object:
        case Array:
          t = null == t ? t : JSON.stringify(t);
      }
      return t;
    },
    fromAttribute(t, e) {
      let s = t;
      switch (e) {
        case Boolean:
          s = null !== t;
          break;
        case Number:
          s = null === t ? null : Number(t);
          break;
        case Object:
        case Array:
          try {
            s = JSON.parse(t);
          } catch (t) {
            s = null;
          }
      }
      return s;
    }
  },
  $ = (t, e) => !o(t, e),
  y = {
    attribute: !0,
    type: String,
    converter: v,
    reflect: !1,
    useDefault: !1,
    hasChanged: $
  };
(_Symbol$metadata = Symbol.metadata) !== null && _Symbol$metadata !== void 0 ? _Symbol$metadata : Symbol.metadata = Symbol("metadata"), (_u$litPropertyMetadat = u.litPropertyMetadata) !== null && _u$litPropertyMetadat !== void 0 ? _u$litPropertyMetadat : u.litPropertyMetadata = new WeakMap();
let b = class extends HTMLElement {
  static addInitializer(t) {
    var _this$l;
    this._$Ei(), ((_this$l = this.l) !== null && _this$l !== void 0 ? _this$l : this.l = []).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = y) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const s = Symbol(),
        i = this.getPropertyDescriptor(t, s, e);
      void 0 !== i && c(this.prototype, t, i);
    }
  }
  static getPropertyDescriptor(t, e, s) {
    var _l;
    const {
      get: i,
      set: n
    } = (_l = l(this.prototype, t)) !== null && _l !== void 0 ? _l : {
      get() {
        return this[e];
      },
      set(t) {
        this[e] = t;
      }
    };
    return {
      get: i,
      set(e) {
        const r = i === null || i === void 0 ? void 0 : i.call(this);
        n !== null && n !== void 0 && n.call(this, e), this.requestUpdate(t, r, s);
      },
      configurable: !0,
      enumerable: !0
    };
  }
  static getPropertyOptions(t) {
    var _this$elementProperti;
    return (_this$elementProperti = this.elementProperties.get(t)) !== null && _this$elementProperti !== void 0 ? _this$elementProperti : y;
  }
  static _$Ei() {
    if (this.hasOwnProperty(_("elementProperties"))) return;
    const t = p(this);
    t.finalize(), void 0 !== t.l && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(_("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(_("properties"))) {
      const t = this.properties,
        e = [...d(t), ...h(t)];
      for (const s of e) this.createProperty(s, t[s]);
    }
    const t = this[Symbol.metadata];
    if (null !== t) {
      const e = litPropertyMetadata.get(t);
      if (void 0 !== e) for (const [t, s] of e) this.elementProperties.set(t, s);
    }
    this._$Eh = new Map();
    for (const [t, e] of this.elementProperties) {
      const s = this._$Eu(t, e);
      void 0 !== s && this._$Eh.set(s, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const s = new Set(t.flat(1 / 0).reverse());
      for (const t of s) e.unshift(a(t));
    } else void 0 !== t && e.push(a(t));
    return e;
  }
  static _$Eu(t, e) {
    const s = e.attribute;
    return !1 === s ? void 0 : "string" == typeof s ? s : "string" == typeof t ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var _this$constructor$l;
    this._$ES = new Promise(t => this.enableUpdating = t), this._$AL = new Map(), this._$E_(), this.requestUpdate(), (_this$constructor$l = this.constructor.l) === null || _this$constructor$l === void 0 ? void 0 : _this$constructor$l.forEach(t => t(this));
  }
  addController(t) {
    var _this$_$EO, _t$hostConnected;
    ((_this$_$EO = this._$EO) !== null && _this$_$EO !== void 0 ? _this$_$EO : this._$EO = new Set()).add(t), void 0 !== this.renderRoot && this.isConnected && ((_t$hostConnected = t.hostConnected) === null || _t$hostConnected === void 0 ? void 0 : _t$hostConnected.call(t));
  }
  removeController(t) {
    var _this$_$EO2;
    (_this$_$EO2 = this._$EO) === null || _this$_$EO2 === void 0 || _this$_$EO2.delete(t);
  }
  _$E_() {
    const t = new Map(),
      e = this.constructor.elementProperties;
    for (const s of e.keys()) this.hasOwnProperty(s) && (t.set(s, this[s]), delete this[s]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    var _this$shadowRoot;
    const t = (_this$shadowRoot = this.shadowRoot) !== null && _this$shadowRoot !== void 0 ? _this$shadowRoot : this.attachShadow(this.constructor.shadowRootOptions);
    return ((t, i) => {
      if (s) t.adoptedStyleSheets = i.map(t => t instanceof CSSStyleSheet ? t : t.styleSheet);else for (const s of i) {
        const i = document.createElement("style"),
          n = e.litNonce;
        void 0 !== n && i.setAttribute("nonce", n), i.textContent = s.cssText, t.appendChild(i);
      }
    })(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    var _this$renderRoot, _this$_$EO3;
    (_this$renderRoot = this.renderRoot) !== null && _this$renderRoot !== void 0 ? _this$renderRoot : this.renderRoot = this.createRenderRoot(), this.enableUpdating(!0), (_this$_$EO3 = this._$EO) === null || _this$_$EO3 === void 0 ? void 0 : _this$_$EO3.forEach(t => {
      var _t$hostConnected2;
      return (_t$hostConnected2 = t.hostConnected) === null || _t$hostConnected2 === void 0 ? void 0 : _t$hostConnected2.call(t);
    });
  }
  enableUpdating(t) {}
  disconnectedCallback() {
    var _this$_$EO4;
    (_this$_$EO4 = this._$EO) === null || _this$_$EO4 === void 0 || _this$_$EO4.forEach(t => {
      var _t$hostDisconnected;
      return (_t$hostDisconnected = t.hostDisconnected) === null || _t$hostDisconnected === void 0 ? void 0 : _t$hostDisconnected.call(t);
    });
  }
  attributeChangedCallback(t, e, s) {
    this._$AK(t, s);
  }
  _$ET(t, e) {
    const s = this.constructor.elementProperties.get(t),
      i = this.constructor._$Eu(t, s);
    if (void 0 !== i && !0 === s.reflect) {
      var _s$converter;
      const n = (void 0 !== ((_s$converter = s.converter) === null || _s$converter === void 0 ? void 0 : _s$converter.toAttribute) ? s.converter : v).toAttribute(e, s.type);
      this._$Em = t, null == n ? this.removeAttribute(i) : this.setAttribute(i, n), this._$Em = null;
    }
  }
  _$AK(t, e) {
    const s = this.constructor,
      i = s._$Eh.get(t);
    if (void 0 !== i && this._$Em !== i) {
      var _t$converter, _ref, _this$_$Ej;
      const t = s.getPropertyOptions(i),
        n = "function" == typeof t.converter ? {
          fromAttribute: t.converter
        } : void 0 !== ((_t$converter = t.converter) === null || _t$converter === void 0 ? void 0 : _t$converter.fromAttribute) ? t.converter : v;
      this._$Em = i;
      const r = n.fromAttribute(e, t.type);
      this[i] = (_ref = r !== null && r !== void 0 ? r : (_this$_$Ej = this._$Ej) === null || _this$_$Ej === void 0 ? void 0 : _this$_$Ej.get(i)) !== null && _ref !== void 0 ? _ref : r, this._$Em = null;
    }
  }
  requestUpdate(t, e, s, i = !1, n) {
    if (void 0 !== t) {
      var _s$hasChanged, _this$_$Ej2;
      const r = this.constructor;
      if (!1 === i && (n = this[t]), s !== null && s !== void 0 ? s : s = r.getPropertyOptions(t), !(((_s$hasChanged = s.hasChanged) !== null && _s$hasChanged !== void 0 ? _s$hasChanged : $)(n, e) || s.useDefault && s.reflect && n === ((_this$_$Ej2 = this._$Ej) === null || _this$_$Ej2 === void 0 ? void 0 : _this$_$Ej2.get(t)) && !this.hasAttribute(r._$Eu(t, s)))) return;
      this.C(t, e, s);
    }
    !1 === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t, e, {
    useDefault: s,
    reflect: i,
    wrapped: n
  }, r) {
    var _this$_$Ej3, _ref2, _this$_$Eq;
    s && !((_this$_$Ej3 = this._$Ej) !== null && _this$_$Ej3 !== void 0 ? _this$_$Ej3 : this._$Ej = new Map()).has(t) && (this._$Ej.set(t, (_ref2 = r !== null && r !== void 0 ? r : e) !== null && _ref2 !== void 0 ? _ref2 : this[t]), !0 !== n || void 0 !== r) || (this._$AL.has(t) || (this.hasUpdated || s || (e = void 0), this._$AL.set(t, e)), !0 === i && this._$Em !== t && ((_this$_$Eq = this._$Eq) !== null && _this$_$Eq !== void 0 ? _this$_$Eq : this._$Eq = new Set()).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (t) {
      Promise.reject(t);
    }
    const t = this.scheduleUpdate();
    return null != t && (await t), !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      var _this$renderRoot2;
      if ((_this$renderRoot2 = this.renderRoot) !== null && _this$renderRoot2 !== void 0 ? _this$renderRoot2 : this.renderRoot = this.createRenderRoot(), this._$Ep) {
        for (const [t, e] of this._$Ep) this[t] = e;
        this._$Ep = void 0;
      }
      const t = this.constructor.elementProperties;
      if (t.size > 0) for (const [e, s] of t) {
        const {
            wrapped: t
          } = s,
          i = this[e];
        !0 !== t || this._$AL.has(e) || void 0 === i || this.C(e, void 0, s, i);
      }
    }
    let t = !1;
    const e = this._$AL;
    try {
      var _this$_$EO5;
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), (_this$_$EO5 = this._$EO) !== null && _this$_$EO5 !== void 0 && _this$_$EO5.forEach(t => {
        var _t$hostUpdate;
        return (_t$hostUpdate = t.hostUpdate) === null || _t$hostUpdate === void 0 ? void 0 : _t$hostUpdate.call(t);
      }), this.update(e)) : this._$EM();
    } catch (e) {
      throw t = !1, this._$EM(), e;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {}
  _$AE(t) {
    var _this$_$EO6;
    (_this$_$EO6 = this._$EO) !== null && _this$_$EO6 !== void 0 && _this$_$EO6.forEach(t => {
      var _t$hostUpdated;
      return (_t$hostUpdated = t.hostUpdated) === null || _t$hostUpdated === void 0 ? void 0 : _t$hostUpdated.call(t);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$EM() {
    this._$AL = new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Eq && (this._$Eq = this._$Eq.forEach(t => this._$ET(t, this[t]))), this._$EM();
  }
  updated(t) {}
  firstUpdated(t) {}
};
b.elementStyles = [], b.shadowRootOptions = {
  mode: "open"
}, b[_("elementProperties")] = new Map(), b[_("finalized")] = new Map(), m !== null && m !== void 0 && m({
  ReactiveElement: b
}), ((_u$reactiveElementVer = u.reactiveElementVersions) !== null && _u$reactiveElementVer !== void 0 ? _u$reactiveElementVer : u.reactiveElementVersions = []).push("2.1.2");
const w = globalThis,
  x = t => t,
  A = w.trustedTypes,
  k = A ? A.createPolicy("lit-html", {
    createHTML: t => t
  }) : void 0,
  S = "$lit$",
  E = `lit$${Math.random().toFixed(9).slice(2)}$`,
  C = "?" + E,
  P = `<${C}>`,
  O = document,
  U = () => O.createComment(""),
  T = t => null === t || "object" != typeof t && "function" != typeof t,
  R = Array.isArray,
  H = "[ \t\n\f\r]",
  M = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,
  N = /-->/g,
  j = />/g,
  z = RegExp(`>|${H}(?:([^\\s"'>=/]+)(${H}*=${H}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"),
  L = /'/g,
  D = /"/g,
  F = /^(?:script|style|textarea|title)$/i,
  I = (t => (e, ...s) => ({
    _$litType$: t,
    strings: e,
    values: s
  }))(1),
  W = Symbol.for("lit-noChange"),
  B = Symbol.for("lit-nothing"),
  V = new WeakMap(),
  G = O.createTreeWalker(O, 129);
function q(t, e) {
  if (!R(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== k ? k.createHTML(e) : e;
}
const Z = (t, e) => {
  const s = t.length - 1,
    i = [];
  let n,
    r = 2 === e ? "<svg>" : 3 === e ? "<math>" : "",
    a = M;
  for (let e = 0; e < s; e++) {
    const s = t[e];
    let o,
      c,
      l = -1,
      d = 0;
    for (; d < s.length && (a.lastIndex = d, c = a.exec(s), null !== c);) d = a.lastIndex, a === M ? "!--" === c[1] ? a = N : void 0 !== c[1] ? a = j : void 0 !== c[2] ? (F.test(c[2]) && (n = RegExp("</" + c[2], "g")), a = z) : void 0 !== c[3] && (a = z) : a === z ? ">" === c[0] ? (a = n !== null && n !== void 0 ? n : M, l = -1) : void 0 === c[1] ? l = -2 : (l = a.lastIndex - c[2].length, o = c[1], a = void 0 === c[3] ? z : '"' === c[3] ? D : L) : a === D || a === L ? a = z : a === N || a === j ? a = M : (a = z, n = void 0);
    const h = a === z && t[e + 1].startsWith("/>") ? " " : "";
    r += a === M ? s + P : l >= 0 ? (i.push(o), s.slice(0, l) + S + s.slice(l) + E + h) : s + E + (-2 === l ? e : h);
  }
  return [q(t, r + (t[s] || "<?>") + (2 === e ? "</svg>" : 3 === e ? "</math>" : "")), i];
};
class J {
  constructor({
    strings: t,
    _$litType$: e
  }, s) {
    let i;
    this.parts = [];
    let n = 0,
      r = 0;
    const a = t.length - 1,
      o = this.parts,
      [c, l] = Z(t, e);
    if (this.el = J.createElement(c, s), G.currentNode = this.el.content, 2 === e || 3 === e) {
      const t = this.el.content.firstChild;
      t.replaceWith(...t.childNodes);
    }
    for (; null !== (i = G.nextNode()) && o.length < a;) {
      if (1 === i.nodeType) {
        if (i.hasAttributes()) for (const t of i.getAttributeNames()) if (t.endsWith(S)) {
          const e = l[r++],
            s = i.getAttribute(t).split(E),
            a = /([.?@])?(.*)/.exec(e);
          o.push({
            type: 1,
            index: n,
            name: a[2],
            strings: s,
            ctor: "." === a[1] ? tt : "?" === a[1] ? et : "@" === a[1] ? st : Q
          }), i.removeAttribute(t);
        } else t.startsWith(E) && (o.push({
          type: 6,
          index: n
        }), i.removeAttribute(t));
        if (F.test(i.tagName)) {
          const t = i.textContent.split(E),
            e = t.length - 1;
          if (e > 0) {
            i.textContent = A ? A.emptyScript : "";
            for (let s = 0; s < e; s++) i.append(t[s], U()), G.nextNode(), o.push({
              type: 2,
              index: ++n
            });
            i.append(t[e], U());
          }
        }
      } else if (8 === i.nodeType) if (i.data === C) o.push({
        type: 2,
        index: n
      });else {
        let t = -1;
        for (; -1 !== (t = i.data.indexOf(E, t + 1));) o.push({
          type: 7,
          index: n
        }), t += E.length - 1;
      }
      n++;
    }
  }
  static createElement(t, e) {
    const s = O.createElement("template");
    return s.innerHTML = t, s;
  }
}
function K(t, e, s = t, i) {
  var _s$_$Co, _n, _n2, _n2$_$AO, _s$_$Co2;
  if (e === W) return e;
  let n = void 0 !== i ? (_s$_$Co = s._$Co) === null || _s$_$Co === void 0 ? void 0 : _s$_$Co[i] : s._$Cl;
  const r = T(e) ? void 0 : e._$litDirective$;
  return ((_n = n) === null || _n === void 0 ? void 0 : _n.constructor) !== r && ((_n2 = n) !== null && _n2 !== void 0 && (_n2$_$AO = _n2._$AO) !== null && _n2$_$AO !== void 0 && _n2$_$AO.call(_n2, !1), void 0 === r ? n = void 0 : (n = new r(t), n._$AT(t, s, i)), void 0 !== i ? ((_s$_$Co2 = s._$Co) !== null && _s$_$Co2 !== void 0 ? _s$_$Co2 : s._$Co = [])[i] = n : s._$Cl = n), void 0 !== n && (e = K(t, n._$AS(t, e.values), n, i)), e;
}
class X {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    var _t$creationScope;
    const {
        el: {
          content: e
        },
        parts: s
      } = this._$AD,
      i = ((_t$creationScope = t === null || t === void 0 ? void 0 : t.creationScope) !== null && _t$creationScope !== void 0 ? _t$creationScope : O).importNode(e, !0);
    G.currentNode = i;
    let n = G.nextNode(),
      r = 0,
      a = 0,
      o = s[0];
    for (; void 0 !== o;) {
      var _o;
      if (r === o.index) {
        let e;
        2 === o.type ? e = new Y(n, n.nextSibling, this, t) : 1 === o.type ? e = new o.ctor(n, o.name, o.strings, this, t) : 6 === o.type && (e = new it(n, this, t)), this._$AV.push(e), o = s[++a];
      }
      r !== ((_o = o) === null || _o === void 0 ? void 0 : _o.index) && (n = G.nextNode(), r++);
    }
    return G.currentNode = O, i;
  }
  p(t) {
    let e = 0;
    for (const s of this._$AV) void 0 !== s && (void 0 !== s.strings ? (s._$AI(t, s, e), e += s.strings.length - 2) : s._$AI(t[e])), e++;
  }
}
class Y {
  get _$AU() {
    var _this$_$AM$_$AU, _this$_$AM;
    return (_this$_$AM$_$AU = (_this$_$AM = this._$AM) === null || _this$_$AM === void 0 ? void 0 : _this$_$AM._$AU) !== null && _this$_$AM$_$AU !== void 0 ? _this$_$AM$_$AU : this._$Cv;
  }
  constructor(t, e, s, i) {
    var _i$isConnected;
    this.type = 2, this._$AH = B, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = s, this.options = i, this._$Cv = (_i$isConnected = i === null || i === void 0 ? void 0 : i.isConnected) !== null && _i$isConnected !== void 0 ? _i$isConnected : !0;
  }
  get parentNode() {
    var _t2;
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return void 0 !== e && 11 === ((_t2 = t) === null || _t2 === void 0 ? void 0 : _t2.nodeType) && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = K(this, t, e), T(t) ? t === B || null == t || "" === t ? (this._$AH !== B && this._$AR(), this._$AH = B) : t !== this._$AH && t !== W && this._(t) : void 0 !== t._$litType$ ? this.$(t) : void 0 !== t.nodeType ? this.T(t) : (t => R(t) || "function" == typeof (t === null || t === void 0 ? void 0 : t[Symbol.iterator]))(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== B && T(this._$AH) ? this._$AA.nextSibling.data = t : this.T(O.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var _this$_$AH;
    const {
        values: e,
        _$litType$: s
      } = t,
      i = "number" == typeof s ? this._$AC(t) : (void 0 === s.el && (s.el = J.createElement(q(s.h, s.h[0]), this.options)), s);
    if (((_this$_$AH = this._$AH) === null || _this$_$AH === void 0 ? void 0 : _this$_$AH._$AD) === i) this._$AH.p(e);else {
      const t = new X(i, this),
        s = t.u(this.options);
      t.p(e), this.T(s), this._$AH = t;
    }
  }
  _$AC(t) {
    let e = V.get(t.strings);
    return void 0 === e && V.set(t.strings, e = new J(t)), e;
  }
  k(t) {
    R(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let s,
      i = 0;
    for (const n of t) i === e.length ? e.push(s = new Y(this.O(U()), this.O(U()), this, this.options)) : s = e[i], s._$AI(n), i++;
    i < e.length && (this._$AR(s && s._$AB.nextSibling, i), e.length = i);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    for ((_this$_$AP = this._$AP) === null || _this$_$AP === void 0 ? void 0 : _this$_$AP.call(this, !1, !0, e); t !== this._$AB;) {
      var _this$_$AP;
      const e = x(t).nextSibling;
      x(t).remove(), t = e;
    }
  }
  setConnected(t) {
    var _this$_$AP2;
    void 0 === this._$AM && (this._$Cv = t, (_this$_$AP2 = this._$AP) === null || _this$_$AP2 === void 0 ? void 0 : _this$_$AP2.call(this, t));
  }
}
class Q {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, s, i, n) {
    this.type = 1, this._$AH = B, this._$AN = void 0, this.element = t, this.name = e, this._$AM = i, this.options = n, s.length > 2 || "" !== s[0] || "" !== s[1] ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = B;
  }
  _$AI(t, e = this, s, i) {
    const n = this.strings;
    let r = !1;
    if (void 0 === n) t = K(this, t, e, 0), r = !T(t) || t !== this._$AH && t !== W, r && (this._$AH = t);else {
      const i = t;
      let a, o;
      for (t = n[0], a = 0; a < n.length - 1; a++) o = K(this, i[s + a], e, a), o === W && (o = this._$AH[a]), r || (r = !T(o) || o !== this._$AH[a]), o === B ? t = B : t !== B && (t += (o !== null && o !== void 0 ? o : "") + n[a + 1]), this._$AH[a] = o;
    }
    r && !i && this.j(t);
  }
  j(t) {
    t === B ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t !== null && t !== void 0 ? t : "");
  }
}
class tt extends Q {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === B ? void 0 : t;
  }
}
class et extends Q {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== B);
  }
}
class st extends Q {
  constructor(t, e, s, i, n) {
    super(t, e, s, i, n), this.type = 5;
  }
  _$AI(t, e = this) {
    var _K;
    if ((t = (_K = K(this, t, e, 0)) !== null && _K !== void 0 ? _K : B) === W) return;
    const s = this._$AH,
      i = t === B && s !== B || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive,
      n = t !== B && (s === B || i);
    i && this.element.removeEventListener(this.name, this, s), n && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var _this$options$host, _this$options;
    "function" == typeof this._$AH ? this._$AH.call((_this$options$host = (_this$options = this.options) === null || _this$options === void 0 ? void 0 : _this$options.host) !== null && _this$options$host !== void 0 ? _this$options$host : this.element, t) : this._$AH.handleEvent(t);
  }
}
class it {
  constructor(t, e, s) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    K(this, t);
  }
}
const nt = w.litHtmlPolyfillSupport;
nt !== null && nt !== void 0 && nt(J, Y), ((_w$litHtmlVersions = w.litHtmlVersions) !== null && _w$litHtmlVersions !== void 0 ? _w$litHtmlVersions : w.litHtmlVersions = []).push("3.3.3");
const rt = globalThis;
class at extends b {
  constructor() {
    super(...arguments), this.renderOptions = {
      host: this
    }, this._$Do = void 0;
  }
  createRenderRoot() {
    var _this$renderOptions, _this$renderOptions$r;
    const t = super.createRenderRoot();
    return (_this$renderOptions$r = (_this$renderOptions = this.renderOptions).renderBefore) !== null && _this$renderOptions$r !== void 0 ? _this$renderOptions$r : _this$renderOptions.renderBefore = t.firstChild, t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = ((t, e, s, _s$renderBefore) => {
      const i = (_s$renderBefore = s === null || s === void 0 ? void 0 : s.renderBefore) !== null && _s$renderBefore !== void 0 ? _s$renderBefore : e;
      let n = i._$litPart$;
      if (void 0 === n) {
        var _s$renderBefore2;
        const t = (_s$renderBefore2 = s === null || s === void 0 ? void 0 : s.renderBefore) !== null && _s$renderBefore2 !== void 0 ? _s$renderBefore2 : null;
        i._$litPart$ = n = new Y(e.insertBefore(U(), t), t, void 0, s !== null && s !== void 0 ? s : {});
      }
      return n._$AI(t), n;
    })(e, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var _this$_$Do;
    super.connectedCallback(), (_this$_$Do = this._$Do) === null || _this$_$Do === void 0 ? void 0 : _this$_$Do.setConnected(!0);
  }
  disconnectedCallback() {
    var _this$_$Do2;
    super.disconnectedCallback(), (_this$_$Do2 = this._$Do) === null || _this$_$Do2 === void 0 ? void 0 : _this$_$Do2.setConnected(!1);
  }
  render() {
    return W;
  }
}
at._$litElement$ = !0, at.finalized = !0, (_rt$litElementHydrate = rt.litElementHydrateSupport) === null || _rt$litElementHydrate === void 0 ? void 0 : _rt$litElementHydrate.call(rt, {
  LitElement: at
});
const ot = rt.litElementPolyfillSupport;
ot !== null && ot !== void 0 && ot({
  LitElement: at
}), ((_rt$litElementVersion = rt.litElementVersions) !== null && _rt$litElementVersion !== void 0 ? _rt$litElementVersion : rt.litElementVersions = []).push("4.2.2");
const ct = t => (e, s) => {
    void 0 !== s ? s.addInitializer(() => {
      customElements.define(t, e);
    }) : customElements.define(t, e);
  },
  lt = {
    attribute: !0,
    type: String,
    converter: v,
    reflect: !1,
    hasChanged: $
  },
  dt = (t = lt, e, s) => {
    const {
      kind: i,
      metadata: n
    } = s;
    let r = globalThis.litPropertyMetadata.get(n);
    if (void 0 === r && globalThis.litPropertyMetadata.set(n, r = new Map()), "setter" === i && ((t = Object.create(t)).wrapped = !0), r.set(s.name, t), "accessor" === i) {
      const {
        name: i
      } = s;
      return {
        set(s) {
          const n = e.get.call(this);
          e.set.call(this, s), this.requestUpdate(i, n, t, !0, s);
        },
        init(e) {
          return void 0 !== e && this.C(i, void 0, t, e), e;
        }
      };
    }
    if ("setter" === i) {
      const {
        name: i
      } = s;
      return function (s) {
        const n = this[i];
        e.call(this, s), this.requestUpdate(i, n, t, !0, s);
      };
    }
    throw Error("Unsupported decorator location: " + i);
  };
function ht(t) {
  return (e, s) => "object" == typeof s ? dt(t, e, s) : ((t, e, s) => {
    const i = e.hasOwnProperty(s);
    return e.constructor.createProperty(s, t), i ? Object.getOwnPropertyDescriptor(e, s) : void 0;
  })(t, e, s);
}
function pt(t) {
  return ht({
    ...t,
    state: !0,
    attribute: !1
  });
}
const ut = ((t, ...e) => {
    const s = 1 === t.length ? t[0] : e.reduce((e, s, i) => e + (t => {
      if (!0 === t._$cssResult$) return t.cssText;
      if ("number" == typeof t) return t;
      throw Error("Value passed to 'css' function must be a 'css' function result: " + t + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
    })(s) + t[i + 1], t[0]);
    return new r(s, t, i);
  })`
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
`,
  ft = "smartgrow_smartgrow",
  gt = {
    low: 1.3,
    high: 1.6
  },
  mt = /^-?\d+(\.\d+)?$/;
function _t(t) {
  if (null == t) return null;
  const e = String(t).trim();
  if (0 === e.length) return null;
  const s = e.toLowerCase();
  if ("unknown" === s || "unavailable" === s || "none" === s || "off" === s || "on" === s) return null;
  if (!mt.test(e)) return null;
  const i = Number(e);
  return Number.isFinite(i) ? i : null;
}
function vt(t) {
  if (null == t) return null;
  const e = String(t).trim().toLowerCase();
  return "on" === e || "true" === e || "1" === e || "off" !== e && "false" !== e && "0" !== e && null;
}
function $t(t, e, s) {
  return Math.min(s, Math.max(e, t));
}
function yt(t) {
  var _t$attrs;
  if (!t || t.missing) return {
    label: "—",
    on: null,
    reason: null
  };
  const e = function (t) {
      if (null == t) return null;
      const e = String(t).trim().toLowerCase();
      return "unavailable" === e || "unknown" === e ? null : "on" === e || "true" === e || "off" !== e && "false" !== e && (!(!e.endsWith("_on") && "turned_on" !== e) || !e.endsWith("_off") && "turned_off" !== e && null);
    }(t.state),
    s = "string" == typeof ((_t$attrs = t.attrs) === null || _t$attrs === void 0 ? void 0 : _t$attrs.reason) ? t.attrs.reason : null;
  return {
    label: t.unavailable ? "unavailable" : null === e ? String(t.state) : e ? "ON" : "OFF",
    on: e,
    reason: s
  };
}
const bt = ["fan_target", "fan_dah_term", "fan_vpd_term", "fan_need_term", "fan_temp_term", "active_fan_term", "ah_tent", "ah_lung_room", "dehumidifier_decision", "dehumidifier_cycles_24h", "dry_run", "cycles_24h", "stage", "adaptation", "oscillation_warning", "legacy_automation_warning", "dah"];
function wt(t) {
  const e = t.replace(/^(sensor|binary_sensor|switch|number|select|update)\./, "");
  for (const t of bt) if (e.endsWith("_" + t)) {
    const s = e.slice(0, e.length - t.length - 1);
    return s.length > 0 ? s : null;
  }
  return null;
}
function xt(t) {
  var _e$entities, _e$devices;
  if (!t) return [];
  const e = t,
    s = (_e$entities = e.entities) !== null && _e$entities !== void 0 ? _e$entities : {},
    i = (_e$devices = e.devices) !== null && _e$devices !== void 0 ? _e$devices : {},
    n = new Map(),
    r = (t, e) => {
      const s = wt(t);
      if (!s) return;
      const i = e === null || e === void 0 ? void 0 : e.device_id;
      i && !n.has(i) && n.set(i, s);
    };
  for (const [t, e] of Object.entries(s)) {
    var _e$entity_id;
    r((_e$entity_id = e === null || e === void 0 ? void 0 : e.entity_id) !== null && _e$entity_id !== void 0 ? _e$entity_id : t, e);
  }
  if (0 === n.size && t.states) {
    const e = new Set();
    for (const s of Object.keys(t.states)) {
      const t = wt(s);
      t && e.add(t);
    }
    return Array.from(e).sort().map(t => ({
      device_id: "prefix:" + t,
      label: t,
      prefix: t
    }));
  }
  const a = [];
  for (const [t, e] of n) {
    const s = i[t],
      n = ((s === null || s === void 0 ? void 0 : s.name_by_user) || (s === null || s === void 0 ? void 0 : s.name) || e).trim();
    a.push({
      device_id: t,
      label: n,
      prefix: e
    });
  }
  return a.sort((t, e) => t.label.localeCompare(e.label)), a;
}
function At(t, e) {
  const s = t.replace(/^sensor\./, "").replace(/^binary_sensor\./, "").replace(/^switch\./, ""),
    i = [["fan_target", "fan_target", "sensor"], ["fan_dah_term", "fan_dah_term", "sensor"], ["fan_vpd_term", "fan_vpd_term", "sensor"], ["fan_need_term", "fan_need_term", "sensor"], ["fan_temp_term", "fan_temp_term", "sensor"], ["active_fan_term", "active_fan_term", "sensor"], ["dah", "dah", "sensor"], ["ah_tent", "ah_tent", "sensor"], ["ah_lung_room", "ah_lung_room", "sensor"], ["dehumidifier_decision", "dehumidifier_decision", "sensor"], ["humidifier_decision", "humidifier_decision", "sensor"], ["dry_run", "dry_run", "sensor"], ["phase", "phase", "sensor"], ["cycles_24h", "cycles_24h", "sensor"], ["stage", "stage", "select"], ["adaptation", "adaptation", "switch"], ["oscillation_warning", "oscillation_warning", "binary_sensor"], ["legacy_automation_warning", "legacy_automation_warning", "binary_sensor"]],
    n = {};
  for (const [t, r, a] of i) {
    const i = e === null || e === void 0 ? void 0 : e[t];
    i && i.length > 0 ? n[t] = i : n[t] = `${a}.${s}_${r}`;
  }
  for (const [t, s] of Object.entries(e !== null && e !== void 0 ? e : {})) !(t in n) && s && (n[t] = s);
  return n;
}
function kt(t, e) {
  if (!(t !== null && t !== void 0 && t.states)) return {};
  const s = e.replace(/^sensor\./, "").replace(/^binary_sensor\./, "").replace(/^switch\./, ""),
    i = [`sensor.${s}_sources`, `sensor.${s}_configured_sources`];
  for (const e of Object.keys(t.states)) (e.endsWith("_smartgrow_configured_sources") || e.endsWith("_smartgrow_sources")) && i.push(e);
  for (const e of i) {
    var _s$attributes;
    const s = t.states[e];
    if (!s) continue;
    const i = (_s$attributes = s.attributes) !== null && _s$attributes !== void 0 ? _s$attributes : {},
      n = {};
    for (const [t, e] of Object.entries(i)) t.endsWith("_entity") && "string" == typeof e && e.length > 0 && (n[t] = e);
    if ("number" == typeof i.vpd_computed && (n.vpd_computed = i.vpd_computed), Object.keys(n).length > 0) return n;
  }
  return {};
}
function St(t, e) {
  var _s$attributes2;
  if (!e || !t || !t.states) return {
    entityId: e,
    missing: !0,
    unavailable: !1
  };
  const s = t.states[e];
  if (!s) return {
    entityId: e,
    missing: !0,
    unavailable: !1
  };
  const i = "unavailable" === s.state || "unknown" === s.state;
  return {
    entityId: e,
    state: s.state,
    attrs: (_s$attributes2 = s.attributes) !== null && _s$attributes2 !== void 0 ? _s$attributes2 : {},
    missing: !1,
    unavailable: i
  };
}
function Et(t, e, s) {
  var _e$vpd, _a$attrs, _St$attrs$stage_confl, _St;
  const i = St(t, e.fan_target),
    n = St(t, e.dah),
    r = St(t, e.stage),
    a = St(t, e.dehumidifier_decision),
    o = function (t, e, _t$states) {
      if (!e.phase) return "unknown";
      const s = t === null || t === void 0 || (_t$states = t.states) === null || _t$states === void 0 || (_t$states = _t$states[e.phase]) === null || _t$states === void 0 ? void 0 : _t$states.state;
      return "day" === s || "night" === s ? s : "unknown";
    }(t, e),
    c = function (t, e) {
      if (!t) return {
        low: 1.3,
        high: 1.6
      };
      const s = String(t).trim();
      return "Seedling" === s ? "night" === e ? {
        low: .6,
        high: .9
      } : {
        low: .8,
        high: 1.1
      } : "Vegetative" === s ? "night" === e ? {
        low: .9,
        high: 1.2
      } : {
        low: 1.1,
        high: 1.4
      } : "Flowering" === s ? "night" === e ? {
        low: 1.3,
        high: 1.6
      } : {
        low: 1.5,
        high: 1.8
      } : {
        low: 1.3,
        high: 1.6
      };
    }(r === null || r === void 0 ? void 0 : r.state, o),
    l = (!r || r.missing) && s ? s : c,
    d = function (t, _t$attrs2) {
      const e = t === null || t === void 0 || (_t$attrs2 = t.attrs) === null || _t$attrs2 === void 0 ? void 0 : _t$attrs2.friendly_name;
      if ("string" == typeof e && e.length > 0) {
        const t = e.replace(/\s+(fan\s+target|fan\s+ΔAH\s+term|fan\s+VPD\s+term|fan\s+need\s+term|fan\s+temp\s+term|active\s+fan\s+term|ΔAH|AH.*|dehumidifier.*|dry\s+run.*|dehumidifier.*cycles.*|cycles.*24\s?h.*|stage|adaptation.*|oscillation.*|legacy.*)$/i, "");
        if (t.length > 0) return t.trim();
      }
      return "SmartGrow";
    }(i.missing ? a : i),
    h = Object.values(e).filter(t => !!t),
    p = h.some(e => {
      var _t$states2;
      return void 0 !== (t === null || t === void 0 || (_t$states2 = t.states) === null || _t$states2 === void 0 ? void 0 : _t$states2[e]);
    }),
    u = null !== _t(i.state) || null !== _t(n.state) || null !== _t(St(t, e.fan_vpd_term).state);
  let f = null;
  const g = St(t, (_e$vpd = e.vpd) !== null && _e$vpd !== void 0 ? _e$vpd : "");
  if (g.missing || (f = _t(g.state)), null === f) {
    const s = kt(t, e.fan_target ? function (t, _t$fan_target) {
        return ((_t$fan_target = t.fan_target) !== null && _t$fan_target !== void 0 ? _t$fan_target : "").replace(/^sensor\./, "").replace(/_fan_target$/, "");
      }(e) : ""),
      i = s.vpd_computed;
    if ("number" == typeof i) f = i;else if ("string" == typeof i) {
      const t = Number.parseFloat(i);
      Number.isFinite(t) && (f = t);
    }
  }
  const m = St(t, e.dry_run),
    _ = St(t, e.adaptation),
    v = St(t, e.oscillation_warning),
    $ = St(t, e.legacy_automation_warning),
    y = (_a$attrs = a.attrs) !== null && _a$attrs !== void 0 ? _a$attrs : {},
    b = y.fan_pct,
    w = (_St$attrs$stage_confl = (_St = St(t, e.stage)) === null || _St === void 0 || (_St = _St.attrs) === null || _St === void 0 ? void 0 : _St.stage_conflict) !== null && _St$attrs$stage_confl !== void 0 ? _St$attrs$stage_confl : null;
  return {
    device: d,
    stage: r && !r.missing ? String(r.state) : "",
    phase: o,
    fanTarget: _t(i.state),
    fanActual: Pt(t, i),
    terms: {
      dah: _t(St(t, e.fan_dah_term).state),
      vpd: _t(St(t, e.fan_vpd_term).state),
      need: _t(St(t, e.fan_need_term).state),
      temp: _t(St(t, e.fan_temp_term).state)
    },
    activeTerm: Ct(St(t, e.active_fan_term)),
    dah: _t(n.state),
    vpd: f,
    bandLow: l.low,
    bandHigh: l.high,
    dehumAction: a && !a.missing ? String(a.state) : null,
    dehumReason: "string" == typeof y.reason ? y.reason : null,
    dehumFanPct: "number" == typeof b ? b : null,
    dryRun: vt(m.state),
    adaptation: vt(_.state),
    oscillationWarning: vt(v.state),
    legacyWarning: vt($.state),
    cycles24h: _t(St(t, e.cycles_24h).state),
    stageConflict: w,
    empty: !p || !u && !p
  };
}
function Ct(t) {
  if (!t || t.missing || t.unavailable) return null;
  const e = String(t.state).trim(),
    s = e.toLowerCase();
  return ["dah", "delta", "vpd", "need", "temp", "floor", "min_fan"].some(t => s.includes(t)) ? e : null;
}
function Pt(t, e) {
  var _e$attrs, _t$states3;
  const s = e === null || e === void 0 || (_e$attrs = e.attrs) === null || _e$attrs === void 0 ? void 0 : _e$attrs.fan_entity;
  if ("string" == typeof s && t !== null && t !== void 0 && (_t$states3 = t.states) !== null && _t$states3 !== void 0 && _t$states3[s]) {
    var _e$attributes$percent, _e$attributes;
    const e = t.states[s],
      i = _t(String((_e$attributes$percent = (_e$attributes = e.attributes) === null || _e$attributes === void 0 ? void 0 : _e$attributes.percentage) !== null && _e$attributes$percent !== void 0 ? _e$attributes$percent : ""));
    if (null !== i) return i;
  }
  return null;
}
const Ot = new Map();
const Ut = ["fan_target", "fan_dah_term", "fan_vpd_term", "fan_need_term", "fan_temp_term", "active_fan_term", "dah", "ah_tent", "ah_lung_room", "dehumidifier_decision", "dry_run", "cycles_24h"];
let Tt = class extends at {
  setConfig(t) {
    this._config = t;
  }
  configChanged(t) {
    this._config = t, this.dispatchEvent(new CustomEvent("config-changed", {
      detail: {
        config: t
      },
      bubbles: !0,
      composed: !0
    }));
  }
  _apply(t) {
    if (!this._config) return;
    const e = {
      ...this._config,
      ...t
    };
    for (const [s, i] of Object.entries(t)) void 0 === i && delete e[s];
    this.configChanged(e);
  }
  _deviceChanged(t) {
    const e = t.target.value;
    if (!e) return void this._apply({
      device_id: void 0,
      prefix: void 0
    });
    const s = xt(this.hass).find(t => t.device_id === e);
    this._apply({
      device_id: e,
      prefix: s ? s.prefix : void 0
    });
  }
  _prefixChanged(t) {
    const e = t.target.value.trim();
    this._apply({
      prefix: e || void 0
    });
  }
  _titleChanged(t) {
    const e = t.target.value.trim();
    this._apply({
      title: e || void 0
    });
  }
  _entityChanged(t, e) {
    var _this$_config$entitie, _this$_config;
    const s = e.target.value.trim(),
      i = {
        ...((_this$_config$entitie = (_this$_config = this._config) === null || _this$_config === void 0 ? void 0 : _this$_config.entities) !== null && _this$_config$entitie !== void 0 ? _this$_config$entitie : {})
      };
    s ? i[t] = s : delete i[t], this._apply({
      entities: Object.keys(i).length ? i : void 0
    });
  }
  createRenderRoot() {
    return this;
  }
  render() {
    var _this$_config$prefix, _ref3, _this$_config$device_, _s$find, _this$_config$title;
    if (!this._config) return B;
    const t = (_this$_config$prefix = this._config.prefix) !== null && _this$_config$prefix !== void 0 ? _this$_config$prefix : ft,
      e = At(t, this._config.entities),
      s = xt(this.hass),
      i = (_ref3 = (_this$_config$device_ = this._config.device_id) !== null && _this$_config$device_ !== void 0 ? _this$_config$device_ : (_s$find = s.find(t => {
        var _this$_config$prefix2, _this$_config2;
        return t.prefix === ((_this$_config$prefix2 = (_this$_config2 = this._config) === null || _this$_config2 === void 0 ? void 0 : _this$_config2.prefix) !== null && _this$_config$prefix2 !== void 0 ? _this$_config$prefix2 : "");
      })) === null || _s$find === void 0 ? void 0 : _s$find.device_id) !== null && _ref3 !== void 0 ? _ref3 : "",
      n = "width:100%;box-sizing:border-box;padding:10px 12px;margin:2px 0 10px;border:1px solid var(--divider-color,#444);border-radius:6px;background:var(--card-background-color,#1c1c1c);color:var(--primary-text-color,#eee);font-size:14px",
      r = "font-size:0.85rem;opacity:0.75;margin-top:6px";
    return I`
      <div style="display:flex;flex-direction:column;gap:2px;padding:8px">
        ${s.length > 0 ? I`
              <label for="sg-device" style=${r}>SmartGrow device</label>
              <select id="sg-device" style=${n} @change=${this._deviceChanged}>
                <option value="">— pick device —</option>
                ${s.map(t => I`<option value=${t.device_id} ?selected=${t.device_id === i}>
                    ${t.label}${t.prefix ? ` (${t.prefix})` : ""}
                  </option>`)}
              </select>
            ` : I`<div style=${r}>
              No SmartGrow devices found — set the entity prefix manually below.
            </div>`}

        <label for="sg-prefix" style=${r}>Entity prefix</label>
        <input
          id="sg-prefix"
          type="text"
          style=${n}
          .value=${t}
          placeholder=${ft}
          @change=${this._prefixChanged}
        />

        <label for="sg-title" style=${r}>Title (optional)</label>
        <input
          id="sg-title"
          type="text"
          style=${n}
          .value=${(_this$_config$title = this._config.title) !== null && _this$_config$title !== void 0 ? _this$_config$title : ""}
          @change=${this._titleChanged}
        />

        <div style=${r}>Override individual entities (empty = derive from prefix / integration config):</div>
        ${Ut.map(t => {
      var _this$_config$entitie2, _this$_config3, _e$t;
      return I`
            <label for=${"sg-ent-" + t} style=${r}>${t}</label>
            <input
              id=${"sg-ent-" + t}
              type="text"
              style=${n}
              .value=${(_this$_config$entitie2 = (_this$_config3 = this._config) === null || _this$_config3 === void 0 || (_this$_config3 = _this$_config3.entities) === null || _this$_config3 === void 0 ? void 0 : _this$_config3[t]) !== null && _this$_config$entitie2 !== void 0 ? _this$_config$entitie2 : ""}
              placeholder=${(_e$t = e[t]) !== null && _e$t !== void 0 ? _e$t : t}
              @change=${e => this._entityChanged(t, e)}
            />
          `;
    })}
        ${["vpd", "camera", "lamp"].map(t => {
      var _this$_config$entitie3, _this$_config4, _this$_config5, _e$t2;
      return I`
          <label for=${"sg-ent-" + t} style=${r}>${t} (external — from integration config)</label>
          <input
            id=${"sg-ent-" + t}
            type="text"
            style=${n}
            .value=${(_this$_config$entitie3 = (_this$_config4 = this._config) === null || _this$_config4 === void 0 || (_this$_config4 = _this$_config4.entities) === null || _this$_config4 === void 0 ? void 0 : _this$_config4[t]) !== null && _this$_config$entitie3 !== void 0 ? _this$_config$entitie3 : (_this$_config5 = this._config) !== null && _this$_config5 !== void 0 && _this$_config5.camera_entity && "camera" === t ? this._config.camera_entity : ""}
            placeholder=${(_e$t2 = e[t]) !== null && _e$t2 !== void 0 ? _e$t2 : "auto from integration sources"}
            @change=${e => {
        if (this._entityChanged(t, e), "camera" === t) {
          const t = e.target.value.trim();
          this._apply({
            camera_entity: t || void 0
          });
        }
      }}
          />
        `;
    })}
      </div>
    `;
  }
};
var Rt;
t([ht({
  attribute: !1
})], Tt.prototype, "hass", void 0), t([pt()], Tt.prototype, "_config", void 0), Tt = t([ct("smartgrow-card-editor")], Tt), customElements.get("smartgrow-card-editor") || customElements.define("smartgrow-card-editor", Tt);
const Ht = "0.1.0",
  Mt = "smartgrow-card";
let Nt = (_Class = class Nt extends at {
  constructor() {
    super(...arguments), this._sparkPoints = [];
  }
  static async getConfigElement() {
    return document.createElement("smartgrow-card-editor");
  }
  static getStubConfig(t) {
    return {
      type: `custom:${Mt}`
    };
  }
  setConfig(t) {
    if (!t || "object" != typeof t) throw new Error("Invalid configuration");
    this._config = {
      prefix: ft,
      show_setup_hint: !0,
      ...t
    }, this._sparkLoadedFor = void 0, this._sparkPoints = [];
  }
  getCardSize() {
    return 6;
  }
  willUpdate(t) {
    super.willUpdate(t), this._config && this.hass && this._maybeLoadSparkline();
  }
  _ids() {
    var _this$_config$prefix3, _this$_config6, _this$_config7, _this$hass, _Rt$_prefixOverride, _this$_config9;
    const t = (_this$_config$prefix3 = (_this$_config6 = this._config) === null || _this$_config6 === void 0 ? void 0 : _this$_config6.prefix) !== null && _this$_config$prefix3 !== void 0 ? _this$_config$prefix3 : ft;
    let e = At(t, (_this$_config7 = this._config) === null || _this$_config7 === void 0 ? void 0 : _this$_config7.entities);
    const s = e.fan_target;
    if (s && !((_this$hass = this.hass) !== null && _this$hass !== void 0 && (_this$hass = _this$hass.states) !== null && _this$hass !== void 0 && _this$hass[s])) {
      var _this$_config8;
      const s = function (t) {
        if (!(t !== null && t !== void 0 && t.states)) return null;
        for (const e of Object.keys(t.states)) {
          const t = e.match(/^sensor\.(.+)_fan_target$/);
          if (t) return t[1];
        }
        return null;
      }(this.hass);
      s && s !== t && (Rt._prefixOverride = s, e = At(s, (_this$_config8 = this._config) === null || _this$_config8 === void 0 ? void 0 : _this$_config8.entities));
    }
    const i = (_Rt$_prefixOverride = Rt._prefixOverride) !== null && _Rt$_prefixOverride !== void 0 ? _Rt$_prefixOverride : t;
    return Rt._prefixOverride = null, function (t, e, s, i, _t$states4) {
      const n = {
          ...s
        },
        r = kt(t, e),
        a = ["vpd", "camera", "lamp"];
      for (const t of a) {
        const e = i === null || i === void 0 ? void 0 : i[t];
        if (e && e.length > 0) {
          n[t] = e;
          continue;
        }
        const s = r[`${t}_entity`];
        "string" == typeof s && s && (n[t] = s);
      }
      if (n.phase && !(t !== null && t !== void 0 && (_t$states4 = t.states) !== null && _t$states4 !== void 0 && _t$states4[n.phase])) for (const e of Object.keys((_t$states5 = t === null || t === void 0 ? void 0 : t.states) !== null && _t$states5 !== void 0 ? _t$states5 : {})) {
        var _t$states5;
        if (/^sensor\..*_smartgrow_phase$/.test(e)) {
          n.phase = e;
          break;
        }
      }
      return n;
    }(this.hass, i, e, (_this$_config9 = this._config) === null || _this$_config9 === void 0 ? void 0 : _this$_config9.entities);
  }
  async _maybeLoadSparkline() {
    var _this$hass$states;
    const t = this._ids().dah;
    if (t && this.hass && (_this$hass$states = this.hass.states) !== null && _this$hass$states !== void 0 && _this$hass$states[t] && this._sparkLoadedFor !== t) {
      this._sparkLoadedFor = t;
      try {
        const e = await async function (t, e, s, i = Date.now()) {
          const n = `${e}@${s}`,
            r = Ot.get(n);
          if (r && i - r.at < 3e5) return r.data;
          const a = new Date(i - 3600 * s * 1e3),
            o = new Date(i);
          try {
            const s = await t.callApi("GET", "history/period", `filter_entity_id=${encodeURIComponent(e)}`, `start=${encodeURIComponent(a.toISOString())}`, `end=${encodeURIComponent(o.toISOString())}`, "minimal_response", "no_attributes");
            return Ot.set(n, {
              at: i,
              data: s
            }), s;
          } catch {
            return null;
          }
        }(this.hass, t, 24);
        this._sparkPoints = function (t, e) {
          if (!t || "object" != typeof t) return [];
          const s = t[e];
          if (!Array.isArray(s)) return [];
          const i = [];
          for (const t of s) if (Array.isArray(t)) for (const e of t) {
            const t = _t(e === null || e === void 0 ? void 0 : e.state);
            if (null === t || !(e !== null && e !== void 0 && e.last_changed)) continue;
            const s = Date.parse(e.last_changed);
            Number.isFinite(s) && i.push({
              t: s,
              v: t
            });
          }
          return i;
        }(e !== null && e !== void 0 ? e : {}, t);
      } catch {
        this._sparkPoints = [];
      }
    }
  }
  _renderSetupHint(t) {
    var _this$_config0, _this$_config$prefix4, _this$_config1;
    return !1 === ((_this$_config0 = this._config) === null || _this$_config0 === void 0 ? void 0 : _this$_config0.show_setup_hint) ? B : I`
      <div class="setup-hint">
        <div>🌱 SmartGrow entities not found.</div>
        <div>
          Expected prefix <code>${(_this$_config$prefix4 = (_this$_config1 = this._config) === null || _this$_config1 === void 0 ? void 0 : _this$_config1.prefix) !== null && _this$_config$prefix4 !== void 0 ? _this$_config$prefix4 : ft}</code>
          (${t.slice(0, 3).join(", ")}…).
        </div>
        <div>
          Set up the SmartGrow integration first, or edit this card to pick
          your entities.
        </div>
      </div>
    `;
  }
  render() {
    var _this$_config$title2, _ref4, _this$_config$camera_, _this$_config10, _this$hass$auth$acces, _this$hass3;
    if (!this._config || !this.hass) return I``;
    const t = this._ids(),
      e = Et(this.hass, t, gt);
    if (e.empty) {
      const e = Object.values(t).filter(t => {
        var _this$hass2;
        return !!t && !((_this$hass2 = this.hass) !== null && _this$hass2 !== void 0 && (_this$hass2 = _this$hass2.states) !== null && _this$hass2 !== void 0 && _this$hass2[t]);
      });
      return I`<ha-card>${this._renderSetupHint(e)}</ha-card>`;
    }
    const s = (_this$_config$title2 = this._config.title) !== null && _this$_config$title2 !== void 0 ? _this$_config$title2 : e.device,
      i = null !== e.fanActual ? I`<span class="fan-sub">actual ${Math.round(e.fanActual)} %</span>` : B,
      n = (r = e.vpd, a = e.bandLow, o = e.bandHigh, null !== r && Number.isFinite(r) && o > a ? $t((r - a) / (o - a), -.25, 1.25) : null);
    var r, a, o;
    const c = null === (l = n) ? "unknown" : l < 0 ? "low" : l > 1 ? "high" : "ok";
    var l;
    const d = null === n ? null : $t((n + .25) / 1.5 * 100, 0, 100),
      h = $t(.25 / 1.5 * 100, 0, 100),
      p = $t(1.25 / 1.5 * 100, 0, 100),
      u = function (t, e, s, i) {
        const n = t.filter(t => Number.isFinite(t.v));
        if (n.length < 2 || e <= 0 || s <= 0) return null;
        const r = n.map(t => t.v);
        let a = Math.min(...r),
          o = Math.max(...r);
        if (o - a < .05) {
          const t = (o + a) / 2;
          a = t - .025, o = t + .025;
        }
        const c = n[0].t,
          l = n[n.length - 1].t - c || 1,
          d = n.map(t => ({
            x: i + (t.t - c) / l * (e - 2 * i),
            y: s - i - (t.v - a) / (o - a) * (s - 2 * i)
          })),
          h = d.map((t, e) => `${0 === e ? "M" : "L"}${t.x.toFixed(1)},${t.y.toFixed(1)}`).join(" ");
        return {
          line: h,
          area: `${h} L${d[d.length - 1].x.toFixed(1)},${s - i} L${d[0].x.toFixed(1)},${s - i} Z`,
          min: a,
          max: o
        };
      }(this._sparkPoints, 300, 54, 4),
      f = yt(St(this.hass, t.dehumidifier_decision)),
      g = yt(St(this.hass, t.humidifier_decision)),
      m = [{
        key: "dah",
        label: "ΔAH",
        value: e.terms.dah,
        active: "dah" === e.activeTerm
      }, {
        key: "vpd",
        label: "VPD",
        value: e.terms.vpd,
        active: "vpd" === e.activeTerm
      }, {
        key: "need",
        label: "need",
        value: e.terms.need,
        active: "need" === e.activeTerm
      }, {
        key: "temp",
        label: "temp",
        value: e.terms.temp,
        active: "temp" === e.activeTerm
      }],
      _ = (_ref4 = (_this$_config$camera_ = (_this$_config10 = this._config) === null || _this$_config10 === void 0 ? void 0 : _this$_config10.camera_entity) !== null && _this$_config$camera_ !== void 0 ? _this$_config$camera_ : t.camera) !== null && _ref4 !== void 0 ? _ref4 : null,
      v = _ ? `/api/camera_proxy_stream/${_}?token=${(_this$hass$auth$acces = (_this$hass3 = this.hass) === null || _this$hass3 === void 0 || (_this$hass3 = _this$hass3.auth) === null || _this$hass3 === void 0 ? void 0 : _this$hass3.accessToken) !== null && _this$hass$auth$acces !== void 0 ? _this$hass$auth$acces : ""}` : null,
      $ = null !== e.cycles24h ? `${e.cycles24h} cyc/24h` : "";
    return I`
      <ha-card>
        <div class="header">
          <div class="title">${s}</div>
          ${e.stage ? I`<div class="stage" title=${e.stageConflict ? `legacy helper says: ${e.stageConflict}` : ""}>${e.stage}${e.stageConflict ? " ⚠︎" : ""}</div>` : B}
          <div class="phase-chip ${e.phase}">${e.phase}</div>
        </div>
        ${e.stageConflict ? I`<div class="stage-conflict" style="font-size:0.78rem;opacity:0.8;margin:-4px 0 4px;color:var(--warning-color,#ffb000)">
              ⚠︎ legacy helper disagrees: ${e.stageConflict}
            </div>` : B}

        <div class="gauge-row">
          <div class="gauge">
            <div class="fan-big">${null !== e.fanTarget ? `${Math.round(e.fanTarget)} %` : "—"}</div>
            <div class="fan-sub">fan target ${i}</div>
          </div>
          <div style="flex:1">
            <div class="fan-sub">VPD ${null !== e.vpd ? e.vpd.toFixed(2) : "—"} kPa · band ${e.bandLow.toFixed(1)}–${e.bandHigh.toFixed(1)}</div>
            <div class="band-bar">
              <div class="band-ok" style="left:${h}%; width:${p - h}%"></div>
              ${null !== d ? I`<div class="band-marker ${"ok" === c ? "" : c}" style="left:${d}%"></div>` : B}
            </div>
            <div class="band-labels"><span>drier</span><span>${"unknown" === c ? "VPD unknown" : "low" === c ? "below band" : "high" === c ? "above band" : "in band"}</span><span>humid</span></div>
          </div>
        </div>

        <div class="spark-wrap">
          <div class="spark-title">ΔAH tent↔lung · last ${24} h ${null !== e.dah ? `· now ${e.dah.toFixed(2)} g/m³` : ""}</div>
          ${u ? I`
                <svg class="spark-svg" viewBox="0 0 300 54" preserveAspectRatio="none">
                  <path class="spark-area" d="${u.area}"></path>
                  <path class="spark-line" d="${u.line}"></path>
                </svg>
              ` : I`<div class="spark-empty">no history yet — recording…</div>`}
        </div>

        <div class="chip-row">
          <span class="chip ${null === f.on ? "" : f.on ? "on" : "off"}">
            💧 dehum ${f.label}
          </span>
          ${null !== e.dryRun ? I`<span class="chip ${e.dryRun ? "dryrun" : "off"}">${e.dryRun ? "DRY RUN" : "live"}</span>` : B}
          ${null !== e.adaptation ? I`<span class="chip ${e.adaptation ? "on" : "off"}">adaptation ${e.adaptation ? "on" : "off"}</span>` : B}
          ${$ ? I`<span class="chip">${$}</span>` : B}
        </div>
        ${null !== g.on ? I`<span class="chip ${g.on ? "on" : "off"}">💦 hum ${g.label}</span>${g.reason ? I`<span class="chip-note"> ${g.reason}</span>` : B}` : B}
        ${f.reason ? I`<p class="dehum-reason">reason: ${f.reason}</p>` : B}
        ${_ ? I`<img class="camera-thumb" src=${v} alt="tent camera" loading="lazy" />` : B}

        <div class="terms">
          ${m.map(t => I`
              <div class="term ${t.active ? "active" : ""}">
                <div class="term-name">
                  <span>${t.label}</span>
                  <span class="val">${null !== t.value ? `${t.value.toFixed(0)}%` : "—"}</span>
                </div>
                <div class="term-bar">
                  <div class="term-fill" style="width:${function (t) {
      return null !== t && Number.isFinite(t) ? $t(t, 0, 100) : 0;
    }(t.value)}%"></div>
                </div>
              </div>
            `)}
        </div>
        ${e.activeTerm ? I`<div class="fan-sub" style="margin-top:6px">active term: ${e.activeTerm}</div>` : B}

        ${e.oscillationWarning || e.legacyWarning ? I`
              <div class="warning-banner">
                ⚠️
                ${e.oscillationWarning ? I`<span>dehumidifier oscillation</span>` : B}
                ${e.oscillationWarning && e.legacyWarning ? I`<span>·</span>` : B}
                ${e.legacyWarning ? I`<span>legacy automations still active</span>` : B}
              </div>
            ` : B}
      </ha-card>
    `;
  }
}, Rt = _Class, _Class.styles = ut, _Class._prefixOverride = null, _Class);
t([ht({
  attribute: !1
})], Nt.prototype, "hass", void 0), t([pt()], Nt.prototype, "_config", void 0), t([pt()], Nt.prototype, "_sparkPoints", void 0), Nt = Rt = t([ct("smartgrow-card")], Nt), customElements.get("smartgrow-card") || customElements.define("smartgrow-card", Nt), window.customCards = window.customCards || [], window.customCards.push({
  type: "smartgrow-card",
  name: "SmartGrow Card",
  description: "Grow-tent overview for the SmartGrow integration: fan gauge, VPD band, ΔAH sparkline, dehumidifier chip.",
  documentationURL: "https://github.com/niggo/smartgrow-card"
});
export { Mt as CARD_NAME, Ht as CARD_VERSION, Nt as SmartGrowCard, Tt as SmartGrowCardEditor };
