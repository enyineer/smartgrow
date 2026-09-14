var _Symbol$metadata, _u$litPropertyMetadat, _u$reactiveElementVer, _w$litHtmlVersions, _rt$litElementHydrate, _rt$litElementVersion, _jt;
function t(t, e, s, n) {
  var i,
    r = arguments.length,
    a = r < 3 ? e : null === n ? n = Object.getOwnPropertyDescriptor(e, s) : n;
  if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) a = Reflect.decorate(t, e, s, n);else for (var o = t.length - 1; o >= 0; o--) (i = t[o]) && (a = (r < 3 ? i(a) : r > 3 ? i(e, s, a) : i(e, s)) || a);
  return r > 3 && a && Object.defineProperty(e, s, a), a;
}
"function" == typeof SuppressedError && SuppressedError;
const e = globalThis,
  s = e.ShadowRoot && (void 0 === e.ShadyCSS || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype,
  n = Symbol(),
  i = new WeakMap();
let r = class {
  constructor(t, e, s) {
    if (this._$cssResult$ = !0, s !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (s && void 0 === t) {
      const s = void 0 !== e && 1 === e.length;
      s && (t = i.get(e)), void 0 === t && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), s && i.set(e, t));
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
    return (t => new r("string" == typeof t ? t : t + "", void 0, n))(e);
  })(t) : t,
  {
    is: o,
    defineProperty: l,
    getOwnPropertyDescriptor: c,
    getOwnPropertyNames: d,
    getOwnPropertySymbols: p,
    getPrototypeOf: h
  } = Object,
  u = globalThis,
  f = u.trustedTypes,
  g = f ? f.emptyScript : "",
  m = u.reactiveElementPolyfillSupport,
  v = (t, e) => t,
  _ = {
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
  y = (t, e) => !o(t, e),
  $ = {
    attribute: !0,
    type: String,
    converter: _,
    reflect: !1,
    useDefault: !1,
    hasChanged: y
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
  static createProperty(t, e = $) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const s = Symbol(),
        n = this.getPropertyDescriptor(t, s, e);
      void 0 !== n && l(this.prototype, t, n);
    }
  }
  static getPropertyDescriptor(t, e, s) {
    var _c;
    const {
      get: n,
      set: i
    } = (_c = c(this.prototype, t)) !== null && _c !== void 0 ? _c : {
      get() {
        return this[e];
      },
      set(t) {
        this[e] = t;
      }
    };
    return {
      get: n,
      set(e) {
        const r = n === null || n === void 0 ? void 0 : n.call(this);
        i !== null && i !== void 0 && i.call(this, e), this.requestUpdate(t, r, s);
      },
      configurable: !0,
      enumerable: !0
    };
  }
  static getPropertyOptions(t) {
    var _this$elementProperti;
    return (_this$elementProperti = this.elementProperties.get(t)) !== null && _this$elementProperti !== void 0 ? _this$elementProperti : $;
  }
  static _$Ei() {
    if (this.hasOwnProperty(v("elementProperties"))) return;
    const t = h(this);
    t.finalize(), void 0 !== t.l && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(v("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(v("properties"))) {
      const t = this.properties,
        e = [...d(t), ...p(t)];
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
    return ((t, n) => {
      if (s) t.adoptedStyleSheets = n.map(t => t instanceof CSSStyleSheet ? t : t.styleSheet);else for (const s of n) {
        const n = document.createElement("style"),
          i = e.litNonce;
        void 0 !== i && n.setAttribute("nonce", i), n.textContent = s.cssText, t.appendChild(n);
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
      n = this.constructor._$Eu(t, s);
    if (void 0 !== n && !0 === s.reflect) {
      var _s$converter;
      const i = (void 0 !== ((_s$converter = s.converter) === null || _s$converter === void 0 ? void 0 : _s$converter.toAttribute) ? s.converter : _).toAttribute(e, s.type);
      this._$Em = t, null == i ? this.removeAttribute(n) : this.setAttribute(n, i), this._$Em = null;
    }
  }
  _$AK(t, e) {
    const s = this.constructor,
      n = s._$Eh.get(t);
    if (void 0 !== n && this._$Em !== n) {
      var _t$converter, _ref, _this$_$Ej;
      const t = s.getPropertyOptions(n),
        i = "function" == typeof t.converter ? {
          fromAttribute: t.converter
        } : void 0 !== ((_t$converter = t.converter) === null || _t$converter === void 0 ? void 0 : _t$converter.fromAttribute) ? t.converter : _;
      this._$Em = n;
      const r = i.fromAttribute(e, t.type);
      this[n] = (_ref = r !== null && r !== void 0 ? r : (_this$_$Ej = this._$Ej) === null || _this$_$Ej === void 0 ? void 0 : _this$_$Ej.get(n)) !== null && _ref !== void 0 ? _ref : r, this._$Em = null;
    }
  }
  requestUpdate(t, e, s, n = !1, i) {
    if (void 0 !== t) {
      var _s$hasChanged, _this$_$Ej2;
      const r = this.constructor;
      if (!1 === n && (i = this[t]), s !== null && s !== void 0 ? s : s = r.getPropertyOptions(t), !(((_s$hasChanged = s.hasChanged) !== null && _s$hasChanged !== void 0 ? _s$hasChanged : y)(i, e) || s.useDefault && s.reflect && i === ((_this$_$Ej2 = this._$Ej) === null || _this$_$Ej2 === void 0 ? void 0 : _this$_$Ej2.get(t)) && !this.hasAttribute(r._$Eu(t, s)))) return;
      this.C(t, e, s);
    }
    !1 === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t, e, {
    useDefault: s,
    reflect: n,
    wrapped: i
  }, r) {
    var _this$_$Ej3, _ref2, _this$_$Eq;
    s && !((_this$_$Ej3 = this._$Ej) !== null && _this$_$Ej3 !== void 0 ? _this$_$Ej3 : this._$Ej = new Map()).has(t) && (this._$Ej.set(t, (_ref2 = r !== null && r !== void 0 ? r : e) !== null && _ref2 !== void 0 ? _ref2 : this[t]), !0 !== i || void 0 !== r) || (this._$AL.has(t) || (this.hasUpdated || s || (e = void 0), this._$AL.set(t, e)), !0 === n && this._$Em !== t && ((_this$_$Eq = this._$Eq) !== null && _this$_$Eq !== void 0 ? _this$_$Eq : this._$Eq = new Set()).add(t));
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
          n = this[e];
        !0 !== t || this._$AL.has(e) || void 0 === n || this.C(e, void 0, s, n);
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
}, b[v("elementProperties")] = new Map(), b[v("finalized")] = new Map(), m !== null && m !== void 0 && m({
  ReactiveElement: b
}), ((_u$reactiveElementVer = u.reactiveElementVersions) !== null && _u$reactiveElementVer !== void 0 ? _u$reactiveElementVer : u.reactiveElementVersions = []).push("2.1.2");
const w = globalThis,
  x = t => t,
  k = w.trustedTypes,
  A = k ? k.createPolicy("lit-html", {
    createHTML: t => t
  }) : void 0,
  S = "$lit$",
  E = `lit$${Math.random().toFixed(9).slice(2)}$`,
  O = "?" + E,
  C = `<${O}>`,
  M = document,
  P = () => M.createComment(""),
  N = t => null === t || "object" != typeof t && "function" != typeof t,
  T = Array.isArray,
  U = "[ \t\n\f\r]",
  R = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,
  H = /-->/g,
  j = />/g,
  z = RegExp(`>|${U}(?:([^\\s"'>=/]+)(${U}*=${U}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"),
  L = /'/g,
  D = /"/g,
  F = /^(?:script|style|textarea|title)$/i,
  B = (t => (e, ...s) => ({
    _$litType$: t,
    strings: e,
    values: s
  }))(1),
  I = Symbol.for("lit-noChange"),
  W = Symbol.for("lit-nothing"),
  V = new WeakMap(),
  G = M.createTreeWalker(M, 129);
function q(t, e) {
  if (!T(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== A ? A.createHTML(e) : e;
}
const Z = (t, e) => {
  const s = t.length - 1,
    n = [];
  let i,
    r = 2 === e ? "<svg>" : 3 === e ? "<math>" : "",
    a = R;
  for (let e = 0; e < s; e++) {
    const s = t[e];
    let o,
      l,
      c = -1,
      d = 0;
    for (; d < s.length && (a.lastIndex = d, l = a.exec(s), null !== l);) d = a.lastIndex, a === R ? "!--" === l[1] ? a = H : void 0 !== l[1] ? a = j : void 0 !== l[2] ? (F.test(l[2]) && (i = RegExp("</" + l[2], "g")), a = z) : void 0 !== l[3] && (a = z) : a === z ? ">" === l[0] ? (a = i !== null && i !== void 0 ? i : R, c = -1) : void 0 === l[1] ? c = -2 : (c = a.lastIndex - l[2].length, o = l[1], a = void 0 === l[3] ? z : '"' === l[3] ? D : L) : a === D || a === L ? a = z : a === H || a === j ? a = R : (a = z, i = void 0);
    const p = a === z && t[e + 1].startsWith("/>") ? " " : "";
    r += a === R ? s + C : c >= 0 ? (n.push(o), s.slice(0, c) + S + s.slice(c) + E + p) : s + E + (-2 === c ? e : p);
  }
  return [q(t, r + (t[s] || "<?>") + (2 === e ? "</svg>" : 3 === e ? "</math>" : "")), n];
};
class J {
  constructor({
    strings: t,
    _$litType$: e
  }, s) {
    let n;
    this.parts = [];
    let i = 0,
      r = 0;
    const a = t.length - 1,
      o = this.parts,
      [l, c] = Z(t, e);
    if (this.el = J.createElement(l, s), G.currentNode = this.el.content, 2 === e || 3 === e) {
      const t = this.el.content.firstChild;
      t.replaceWith(...t.childNodes);
    }
    for (; null !== (n = G.nextNode()) && o.length < a;) {
      if (1 === n.nodeType) {
        if (n.hasAttributes()) for (const t of n.getAttributeNames()) if (t.endsWith(S)) {
          const e = c[r++],
            s = n.getAttribute(t).split(E),
            a = /([.?@])?(.*)/.exec(e);
          o.push({
            type: 1,
            index: i,
            name: a[2],
            strings: s,
            ctor: "." === a[1] ? tt : "?" === a[1] ? et : "@" === a[1] ? st : Q
          }), n.removeAttribute(t);
        } else t.startsWith(E) && (o.push({
          type: 6,
          index: i
        }), n.removeAttribute(t));
        if (F.test(n.tagName)) {
          const t = n.textContent.split(E),
            e = t.length - 1;
          if (e > 0) {
            n.textContent = k ? k.emptyScript : "";
            for (let s = 0; s < e; s++) n.append(t[s], P()), G.nextNode(), o.push({
              type: 2,
              index: ++i
            });
            n.append(t[e], P());
          }
        }
      } else if (8 === n.nodeType) if (n.data === O) o.push({
        type: 2,
        index: i
      });else {
        let t = -1;
        for (; -1 !== (t = n.data.indexOf(E, t + 1));) o.push({
          type: 7,
          index: i
        }), t += E.length - 1;
      }
      i++;
    }
  }
  static createElement(t, e) {
    const s = M.createElement("template");
    return s.innerHTML = t, s;
  }
}
function K(t, e, s = t, n) {
  var _s$_$Co, _i, _i2, _i2$_$AO, _s$_$Co2;
  if (e === I) return e;
  let i = void 0 !== n ? (_s$_$Co = s._$Co) === null || _s$_$Co === void 0 ? void 0 : _s$_$Co[n] : s._$Cl;
  const r = N(e) ? void 0 : e._$litDirective$;
  return ((_i = i) === null || _i === void 0 ? void 0 : _i.constructor) !== r && ((_i2 = i) !== null && _i2 !== void 0 && (_i2$_$AO = _i2._$AO) !== null && _i2$_$AO !== void 0 && _i2$_$AO.call(_i2, !1), void 0 === r ? i = void 0 : (i = new r(t), i._$AT(t, s, n)), void 0 !== n ? ((_s$_$Co2 = s._$Co) !== null && _s$_$Co2 !== void 0 ? _s$_$Co2 : s._$Co = [])[n] = i : s._$Cl = i), void 0 !== i && (e = K(t, i._$AS(t, e.values), i, n)), e;
}
class Y {
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
      n = ((_t$creationScope = t === null || t === void 0 ? void 0 : t.creationScope) !== null && _t$creationScope !== void 0 ? _t$creationScope : M).importNode(e, !0);
    G.currentNode = n;
    let i = G.nextNode(),
      r = 0,
      a = 0,
      o = s[0];
    for (; void 0 !== o;) {
      var _o;
      if (r === o.index) {
        let e;
        2 === o.type ? e = new X(i, i.nextSibling, this, t) : 1 === o.type ? e = new o.ctor(i, o.name, o.strings, this, t) : 6 === o.type && (e = new nt(i, this, t)), this._$AV.push(e), o = s[++a];
      }
      r !== ((_o = o) === null || _o === void 0 ? void 0 : _o.index) && (i = G.nextNode(), r++);
    }
    return G.currentNode = M, n;
  }
  p(t) {
    let e = 0;
    for (const s of this._$AV) void 0 !== s && (void 0 !== s.strings ? (s._$AI(t, s, e), e += s.strings.length - 2) : s._$AI(t[e])), e++;
  }
}
class X {
  get _$AU() {
    var _this$_$AM$_$AU, _this$_$AM;
    return (_this$_$AM$_$AU = (_this$_$AM = this._$AM) === null || _this$_$AM === void 0 ? void 0 : _this$_$AM._$AU) !== null && _this$_$AM$_$AU !== void 0 ? _this$_$AM$_$AU : this._$Cv;
  }
  constructor(t, e, s, n) {
    var _n$isConnected;
    this.type = 2, this._$AH = W, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = s, this.options = n, this._$Cv = (_n$isConnected = n === null || n === void 0 ? void 0 : n.isConnected) !== null && _n$isConnected !== void 0 ? _n$isConnected : !0;
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
    t = K(this, t, e), N(t) ? t === W || null == t || "" === t ? (this._$AH !== W && this._$AR(), this._$AH = W) : t !== this._$AH && t !== I && this._(t) : void 0 !== t._$litType$ ? this.$(t) : void 0 !== t.nodeType ? this.T(t) : (t => T(t) || "function" == typeof (t === null || t === void 0 ? void 0 : t[Symbol.iterator]))(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== W && N(this._$AH) ? this._$AA.nextSibling.data = t : this.T(M.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var _this$_$AH;
    const {
        values: e,
        _$litType$: s
      } = t,
      n = "number" == typeof s ? this._$AC(t) : (void 0 === s.el && (s.el = J.createElement(q(s.h, s.h[0]), this.options)), s);
    if (((_this$_$AH = this._$AH) === null || _this$_$AH === void 0 ? void 0 : _this$_$AH._$AD) === n) this._$AH.p(e);else {
      const t = new Y(n, this),
        s = t.u(this.options);
      t.p(e), this.T(s), this._$AH = t;
    }
  }
  _$AC(t) {
    let e = V.get(t.strings);
    return void 0 === e && V.set(t.strings, e = new J(t)), e;
  }
  k(t) {
    T(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let s,
      n = 0;
    for (const i of t) n === e.length ? e.push(s = new X(this.O(P()), this.O(P()), this, this.options)) : s = e[n], s._$AI(i), n++;
    n < e.length && (this._$AR(s && s._$AB.nextSibling, n), e.length = n);
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
  constructor(t, e, s, n, i) {
    this.type = 1, this._$AH = W, this._$AN = void 0, this.element = t, this.name = e, this._$AM = n, this.options = i, s.length > 2 || "" !== s[0] || "" !== s[1] ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = W;
  }
  _$AI(t, e = this, s, n) {
    const i = this.strings;
    let r = !1;
    if (void 0 === i) t = K(this, t, e, 0), r = !N(t) || t !== this._$AH && t !== I, r && (this._$AH = t);else {
      const n = t;
      let a, o;
      for (t = i[0], a = 0; a < i.length - 1; a++) o = K(this, n[s + a], e, a), o === I && (o = this._$AH[a]), r || (r = !N(o) || o !== this._$AH[a]), o === W ? t = W : t !== W && (t += (o !== null && o !== void 0 ? o : "") + i[a + 1]), this._$AH[a] = o;
    }
    r && !n && this.j(t);
  }
  j(t) {
    t === W ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t !== null && t !== void 0 ? t : "");
  }
}
class tt extends Q {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === W ? void 0 : t;
  }
}
class et extends Q {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== W);
  }
}
class st extends Q {
  constructor(t, e, s, n, i) {
    super(t, e, s, n, i), this.type = 5;
  }
  _$AI(t, e = this) {
    var _K;
    if ((t = (_K = K(this, t, e, 0)) !== null && _K !== void 0 ? _K : W) === I) return;
    const s = this._$AH,
      n = t === W && s !== W || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive,
      i = t !== W && (s === W || n);
    n && this.element.removeEventListener(this.name, this, s), i && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var _this$options$host, _this$options;
    "function" == typeof this._$AH ? this._$AH.call((_this$options$host = (_this$options = this.options) === null || _this$options === void 0 ? void 0 : _this$options.host) !== null && _this$options$host !== void 0 ? _this$options$host : this.element, t) : this._$AH.handleEvent(t);
  }
}
class nt {
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
const it = w.litHtmlPolyfillSupport;
it !== null && it !== void 0 && it(J, X), ((_w$litHtmlVersions = w.litHtmlVersions) !== null && _w$litHtmlVersions !== void 0 ? _w$litHtmlVersions : w.litHtmlVersions = []).push("3.3.3");
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
      const n = (_s$renderBefore = s === null || s === void 0 ? void 0 : s.renderBefore) !== null && _s$renderBefore !== void 0 ? _s$renderBefore : e;
      let i = n._$litPart$;
      if (void 0 === i) {
        var _s$renderBefore2;
        const t = (_s$renderBefore2 = s === null || s === void 0 ? void 0 : s.renderBefore) !== null && _s$renderBefore2 !== void 0 ? _s$renderBefore2 : null;
        n._$litPart$ = i = new X(e.insertBefore(P(), t), t, void 0, s !== null && s !== void 0 ? s : {});
      }
      return i._$AI(t), i;
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
    return I;
  }
}
at._$litElement$ = !0, at.finalized = !0, (_rt$litElementHydrate = rt.litElementHydrateSupport) === null || _rt$litElementHydrate === void 0 ? void 0 : _rt$litElementHydrate.call(rt, {
  LitElement: at
});
const ot = rt.litElementPolyfillSupport;
ot !== null && ot !== void 0 && ot({
  LitElement: at
}), ((_rt$litElementVersion = rt.litElementVersions) !== null && _rt$litElementVersion !== void 0 ? _rt$litElementVersion : rt.litElementVersions = []).push("4.2.2");
const lt = {
    attribute: !0,
    type: String,
    converter: _,
    reflect: !1,
    hasChanged: y
  },
  ct = (t = lt, e, s) => {
    const {
      kind: n,
      metadata: i
    } = s;
    let r = globalThis.litPropertyMetadata.get(i);
    if (void 0 === r && globalThis.litPropertyMetadata.set(i, r = new Map()), "setter" === n && ((t = Object.create(t)).wrapped = !0), r.set(s.name, t), "accessor" === n) {
      const {
        name: n
      } = s;
      return {
        set(s) {
          const i = e.get.call(this);
          e.set.call(this, s), this.requestUpdate(n, i, t, !0, s);
        },
        init(e) {
          return void 0 !== e && this.C(n, void 0, t, e), e;
        }
      };
    }
    if ("setter" === n) {
      const {
        name: n
      } = s;
      return function (s) {
        const i = this[n];
        e.call(this, s), this.requestUpdate(n, i, t, !0, s);
      };
    }
    throw Error("Unsupported decorator location: " + n);
  };
function dt(t) {
  return (e, s) => "object" == typeof s ? ct(t, e, s) : ((t, e, s) => {
    const n = e.hasOwnProperty(s);
    return e.constructor.createProperty(s, t), n ? Object.getOwnPropertyDescriptor(e, s) : void 0;
  })(t, e, s);
}
function pt(t) {
  return dt({
    ...t,
    state: !0,
    attribute: !1
  });
}
const ht = ((t, ...e) => {
    const s = 1 === t.length ? t[0] : e.reduce((e, s, n) => e + (t => {
      if (!0 === t._$cssResult$) return t.cssText;
      if ("number" == typeof t) return t;
      throw Error("Value passed to 'css' function must be a 'css' function result: " + t + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
    })(s) + t[n + 1], t[0]);
    return new r(s, t, n);
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
`,
  ut = "smartgrow_smartgrow",
  ft = {
    low: 1.3,
    high: 1.6
  },
  gt = /^-?\d+(\.\d+)?$/;
function mt(t) {
  if (null == t) return null;
  const e = String(t).trim();
  if (0 === e.length) return null;
  const s = e.toLowerCase();
  if ("unknown" === s || "unavailable" === s || "none" === s || "off" === s || "on" === s) return null;
  if (!gt.test(e)) return null;
  const n = Number(e);
  return Number.isFinite(n) ? n : null;
}
function vt(t) {
  if (null == t) return null;
  const e = String(t).trim().toLowerCase();
  return "on" === e || "true" === e || "1" === e || "off" !== e && "false" !== e && "0" !== e && null;
}
function _t(t, e, s) {
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
const $t = ["fan_target", "fan_dah_term", "fan_vpd_term", "fan_need_term", "fan_temp_term", "active_fan_term", "ah_tent", "ah_lung_room", "dehumidifier_decision", "dehumidifier_cycles_24h", "dry_run", "cycles_24h", "stage", "adaptation", "oscillation_warning", "legacy_automation_warning", "dah"];
function bt(t) {
  const e = t.replace(/^(sensor|binary_sensor|switch|number|select|update)\./, "");
  for (const t of $t) if (e.endsWith("_" + t)) {
    const s = e.slice(0, e.length - t.length - 1);
    return s.length > 0 ? s : null;
  }
  return null;
}
function wt(t) {
  var _e$entities, _e$devices;
  if (!t) return [];
  const e = t,
    s = (_e$entities = e.entities) !== null && _e$entities !== void 0 ? _e$entities : {},
    n = (_e$devices = e.devices) !== null && _e$devices !== void 0 ? _e$devices : {},
    i = new Map(),
    r = (t, e) => {
      const s = bt(t);
      if (!s) return;
      const n = e === null || e === void 0 ? void 0 : e.device_id;
      n && !i.has(n) && i.set(n, s);
    };
  for (const [t, e] of Object.entries(s)) {
    var _e$entity_id;
    r((_e$entity_id = e === null || e === void 0 ? void 0 : e.entity_id) !== null && _e$entity_id !== void 0 ? _e$entity_id : t, e);
  }
  if (0 === i.size && t.states) {
    const e = new Set();
    for (const s of Object.keys(t.states)) {
      const t = bt(s);
      t && e.add(t);
    }
    return Array.from(e).sort().map(t => ({
      device_id: "prefix:" + t,
      label: t,
      prefix: t
    }));
  }
  const a = [];
  for (const [t, e] of i) {
    const s = n[t],
      i = ((s === null || s === void 0 ? void 0 : s.name_by_user) || (s === null || s === void 0 ? void 0 : s.name) || e).trim();
    a.push({
      device_id: t,
      label: i,
      prefix: e
    });
  }
  return a.sort((t, e) => t.label.localeCompare(e.label)), a;
}
function xt(t, e) {
  const s = t.replace(/^sensor\./, "").replace(/^binary_sensor\./, "").replace(/^switch\./, ""),
    n = [["fan_target", "fan_target", "sensor"], ["fan_dah_term", "fan_dah_term", "sensor"], ["fan_vpd_term", "fan_vpd_term", "sensor"], ["fan_need_term", "fan_need_term", "sensor"], ["fan_temp_term", "fan_temp_term", "sensor"], ["active_fan_term", "active_fan_term", "sensor"], ["dah", "dah", "sensor"], ["ah_tent", "ah_tent", "sensor"], ["ah_lung_room", "ah_lung_room", "sensor"], ["dehumidifier_decision", "dehumidifier_decision", "sensor"], ["humidifier_decision", "humidifier_decision", "sensor"], ["dry_run", "dry_run", "sensor"], ["phase", "phase", "sensor"], ["cycles_24h", "cycles_24h", "sensor"], ["stage", "stage", "select"], ["adaptation", "adaptation", "switch"], ["oscillation_warning", "oscillation_warning", "binary_sensor"], ["legacy_automation_warning", "legacy_automation_warning", "binary_sensor"]],
    i = {};
  for (const [t, r, a] of n) {
    const n = e === null || e === void 0 ? void 0 : e[t];
    n && n.length > 0 ? i[t] = n : i[t] = `${a}.${s}_${r}`;
  }
  for (const [t, s] of Object.entries(e !== null && e !== void 0 ? e : {})) !(t in i) && s && (i[t] = s);
  return i;
}
function kt(t, e) {
  if (!(t !== null && t !== void 0 && t.states)) return {};
  const s = e.replace(/^sensor\./, "").replace(/^binary_sensor\./, "").replace(/^switch\./, ""),
    n = [`sensor.${s}_sources`, `sensor.${s}_configured_sources`];
  for (const e of Object.keys(t.states)) (e.endsWith("_smartgrow_configured_sources") || e.endsWith("_smartgrow_sources")) && n.push(e);
  for (const e of n) {
    var _s$attributes;
    const s = t.states[e];
    if (!s) continue;
    const n = (_s$attributes = s.attributes) !== null && _s$attributes !== void 0 ? _s$attributes : {},
      i = {};
    for (const [t, e] of Object.entries(n)) t.endsWith("_entity") && "string" == typeof e && e.length > 0 && (i[t] = e);
    "number" == typeof n.vpd_computed && (i.vpd_computed = n.vpd_computed);
    for (const t of ["wavemaker_mode", "lights_on_time", "lights_off_time"]) {
      const e = n[t];
      "string" == typeof e && e.length > 0 && (i[t] = e);
    }
    for (const t of ["wavemaker_run_s", "wavemaker_every_min"]) {
      const e = n[t];
      "number" == typeof e && (i[t] = e);
    }
    if (Object.keys(i).length > 0) return i;
  }
  return {};
}
function At(t, e) {
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
  const n = "unavailable" === s.state || "unknown" === s.state;
  return {
    entityId: e,
    state: s.state,
    attrs: (_s$attributes2 = s.attributes) !== null && _s$attributes2 !== void 0 ? _s$attributes2 : {},
    missing: !1,
    unavailable: n
  };
}
function St(t, e, s) {
  var _e$vpd, _a$attrs, _At$attrs$stage_confl, _At;
  const n = At(t, e.fan_target),
    i = At(t, e.dah),
    r = At(t, e.stage),
    a = At(t, e.dehumidifier_decision),
    o = function (t, e, _t$states) {
      if (!e.phase) return "unknown";
      const s = t === null || t === void 0 || (_t$states = t.states) === null || _t$states === void 0 || (_t$states = _t$states[e.phase]) === null || _t$states === void 0 ? void 0 : _t$states.state;
      return "day" === s || "night" === s ? s : "unknown";
    }(t, e),
    l = function (t, e) {
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
    c = (!r || r.missing) && s ? s : l,
    d = function (t, _t$attrs2) {
      const e = t === null || t === void 0 || (_t$attrs2 = t.attrs) === null || _t$attrs2 === void 0 ? void 0 : _t$attrs2.friendly_name;
      if ("string" == typeof e && e.length > 0) {
        const t = e.replace(/\s+(fan\s+target|fan\s+ΔAH\s+term|fan\s+VPD\s+term|fan\s+need\s+term|fan\s+temp\s+term|active\s+fan\s+term|ΔAH|AH.*|dehumidifier.*|dry\s+run.*|dehumidifier.*cycles.*|cycles.*24\s?h.*|stage|adaptation.*|oscillation.*|legacy.*)$/i, "");
        if (t.length > 0) return t.trim();
      }
      return "SmartGrow";
    }(n.missing ? a : n),
    p = Object.values(e).filter(t => !!t),
    h = p.some(e => {
      var _t$states2;
      return void 0 !== (t === null || t === void 0 || (_t$states2 = t.states) === null || _t$states2 === void 0 ? void 0 : _t$states2[e]);
    }),
    u = null !== mt(n.state) || null !== mt(i.state) || null !== mt(At(t, e.fan_vpd_term).state),
    f = kt(t, e.fan_target ? function (t, _t$fan_target) {
      return ((_t$fan_target = t.fan_target) !== null && _t$fan_target !== void 0 ? _t$fan_target : "").replace(/^sensor\./, "").replace(/_fan_target$/, "");
    }(e) : "");
  let g = null;
  const m = At(t, (_e$vpd = e.vpd) !== null && _e$vpd !== void 0 ? _e$vpd : "");
  if (m.missing || (g = mt(m.state)), null === g) {
    const t = f.vpd_computed;
    if ("number" == typeof t) g = t;else if ("string" == typeof t) {
      const e = Number.parseFloat(t);
      Number.isFinite(e) && (g = e);
    }
  }
  const v = At(t, e.dry_run),
    _ = At(t, e.adaptation),
    y = At(t, e.oscillation_warning),
    $ = At(t, e.legacy_automation_warning),
    b = (_a$attrs = a.attrs) !== null && _a$attrs !== void 0 ? _a$attrs : {},
    w = b.fan_pct,
    x = "string" == typeof f.lamp_switch_entity ? f.lamp_switch_entity : void 0,
    k = "string" == typeof f.wavemaker_entity ? f.wavemaker_entity : void 0,
    A = At(t, e.lamp),
    S = A.missing ? null : vt(A.state),
    E = At(t, x),
    O = E.missing || E.unavailable ? null : vt(E.state),
    C = At(t, k),
    M = C.missing || C.unavailable ? null : vt(C.state),
    P = (_t$states3 => {
      if (!k) return null;
      const e = t === null || t === void 0 || (_t$states3 = t.states) === null || _t$states3 === void 0 ? void 0 : _t$states3[k],
        s = e ? e.last_changed : void 0;
      if (!s) return null;
      const n = Date.parse(s);
      return Number.isFinite(n) ? n : null;
    })(),
    N = (_At$attrs$stage_confl = (_At = At(t, e.stage)) === null || _At === void 0 || (_At = _At.attrs) === null || _At === void 0 ? void 0 : _At.stage_conflict) !== null && _At$attrs$stage_confl !== void 0 ? _At$attrs$stage_confl : null;
  return {
    device: d,
    stage: r && !r.missing ? String(r.state) : "",
    phase: o,
    fanTarget: mt(n.state),
    fanActual: Ot(t, n),
    terms: {
      dah: mt(At(t, e.fan_dah_term).state),
      vpd: mt(At(t, e.fan_vpd_term).state),
      need: mt(At(t, e.fan_need_term).state),
      temp: mt(At(t, e.fan_temp_term).state)
    },
    activeTerm: Et(At(t, e.active_fan_term)),
    dah: mt(i.state),
    vpd: g,
    bandLow: c.low,
    bandHigh: c.high,
    dehumAction: a && !a.missing ? String(a.state) : null,
    dehumReason: "string" == typeof b.reason ? b.reason : null,
    dehumFanPct: "number" == typeof w ? w : null,
    dryRun: vt(v.state),
    adaptation: vt(_.state),
    oscillationWarning: vt(y.state),
    legacyWarning: vt($.state),
    cycles24h: mt(At(t, e.cycles_24h).state),
    stageConflict: N,
    dehumBand: {
      low: "number" == typeof b.band_low ? b.band_low : null,
      high: "number" == typeof b.band_high ? b.band_high : null,
      depth: "number" == typeof b.band_depth ? b.band_depth : null
    },
    lightsOn: "string" == typeof f.lights_on_time ? f.lights_on_time : null,
    lightsOff: "string" == typeof f.lights_off_time ? f.lights_off_time : null,
    wavemaker: {
      entity: k !== null && k !== void 0 ? k : null,
      mode: "string" == typeof f.wavemaker_mode ? f.wavemaker_mode : null,
      runS: "number" == typeof f.wavemaker_run_s ? f.wavemaker_run_s : null,
      everyMin: "number" == typeof f.wavemaker_every_min ? f.wavemaker_every_min : null,
      isOn: M,
      lastChangedMs: P
    },
    lampOn: S,
    masterOn: O,
    lampEntity: "string" == typeof e.lamp ? e.lamp : null,
    masterEntity: x !== null && x !== void 0 ? x : null,
    empty: !h || !u && !h
  };
}
function Et(t) {
  if (!t || t.missing || t.unavailable) return null;
  const e = String(t.state).trim(),
    s = e.toLowerCase();
  return ["dah", "delta", "vpd", "need", "temp", "floor", "min_fan"].some(t => s.includes(t)) ? e : null;
}
function Ot(t, e) {
  var _e$attrs, _t$states4;
  const s = e === null || e === void 0 || (_e$attrs = e.attrs) === null || _e$attrs === void 0 ? void 0 : _e$attrs.fan_entity;
  if ("string" == typeof s && t !== null && t !== void 0 && (_t$states4 = t.states) !== null && _t$states4 !== void 0 && _t$states4[s]) {
    var _e$attributes$percent, _e$attributes;
    const e = t.states[s],
      n = mt(String((_e$attributes$percent = (_e$attributes = e.attributes) === null || _e$attributes === void 0 ? void 0 : _e$attributes.percentage) !== null && _e$attributes$percent !== void 0 ? _e$attributes$percent : ""));
    if (null !== n) return n;
  }
  return null;
}
function Ct(t) {
  if (!t || "string" != typeof t) return null;
  const e = t.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!e) return null;
  const s = Number(e[1]),
    n = Number(e[2]),
    i = e[3] ? Number(e[3]) : 0;
  return s > 23 || n > 59 || i > 59 ? null : 3600 * s + 60 * n + i;
}
function Mt(t, e) {
  const s = Ct(t.on),
    n = Ct(t.off);
  if (null === s || null === n) return null;
  const i = function (t) {
      const e = new Date(t);
      return 3600 * e.getHours() + 60 * e.getMinutes() + e.getSeconds();
    }(e),
    r = (s >= n ? i >= s || i < n : i >= s && i < n) ? "off" : "on";
  let a = ("off" === r ? n : s) - i;
  return a <= 0 && (a += 86400), {
    ms: 1e3 * a,
    next: r
  };
}
function Pt(t) {
  const e = Math.max(0, Math.floor(t / 1e3)),
    s = Math.floor(e / 3600),
    n = Math.floor(e % 3600 / 60);
  return s > 0 ? `${s} h ${n} m` : n > 0 ? `${n} min` : `${e % 60} s`;
}
const Nt = new Map();
const Tt = ["fan_target", "fan_dah_term", "fan_vpd_term", "fan_need_term", "fan_temp_term", "active_fan_term", "dah", "ah_tent", "ah_lung_room", "dehumidifier_decision", "dry_run", "cycles_24h"];
class Ut extends at {
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
    for (const [s, n] of Object.entries(t)) void 0 === n && delete e[s];
    this.configChanged(e);
  }
  _deviceChanged(t) {
    const e = t.target.value;
    if (!e) return void this._apply({
      device_id: void 0,
      prefix: void 0
    });
    const s = wt(this.hass).find(t => t.device_id === e);
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
      n = {
        ...((_this$_config$entitie = (_this$_config = this._config) === null || _this$_config === void 0 ? void 0 : _this$_config.entities) !== null && _this$_config$entitie !== void 0 ? _this$_config$entitie : {})
      };
    s ? n[t] = s : delete n[t], this._apply({
      entities: Object.keys(n).length ? n : void 0
    });
  }
  createRenderRoot() {
    return this;
  }
  render() {
    var _this$_config$prefix, _ref3, _this$_config$device_, _s$find, _this$_config$title;
    if (!this._config) return W;
    const t = (_this$_config$prefix = this._config.prefix) !== null && _this$_config$prefix !== void 0 ? _this$_config$prefix : ut,
      e = xt(t, this._config.entities),
      s = wt(this.hass),
      n = (_ref3 = (_this$_config$device_ = this._config.device_id) !== null && _this$_config$device_ !== void 0 ? _this$_config$device_ : (_s$find = s.find(t => {
        var _this$_config$prefix2, _this$_config2;
        return t.prefix === ((_this$_config$prefix2 = (_this$_config2 = this._config) === null || _this$_config2 === void 0 ? void 0 : _this$_config2.prefix) !== null && _this$_config$prefix2 !== void 0 ? _this$_config$prefix2 : "");
      })) === null || _s$find === void 0 ? void 0 : _s$find.device_id) !== null && _ref3 !== void 0 ? _ref3 : "",
      i = "width:100%;box-sizing:border-box;padding:10px 12px;margin:2px 0 10px;border:1px solid var(--divider-color,#444);border-radius:6px;background:var(--card-background-color,#1c1c1c);color:var(--primary-text-color,#eee);font-size:14px",
      r = "font-size:0.85rem;opacity:0.75;margin-top:6px";
    return B`
      <div style="display:flex;flex-direction:column;gap:2px;padding:8px">
        ${s.length > 0 ? B`
              <label for="sg-device" style=${r}>SmartGrow device</label>
              <select id="sg-device" style=${i} @change=${this._deviceChanged}>
                <option value="">— pick device —</option>
                ${s.map(t => B`<option value=${t.device_id} ?selected=${t.device_id === n}>
                    ${t.label}${t.prefix ? ` (${t.prefix})` : ""}
                  </option>`)}
              </select>
            ` : B`<div style=${r}>
              No SmartGrow devices found — set the entity prefix manually below.
            </div>`}

        <label for="sg-prefix" style=${r}>Entity prefix</label>
        <input
          id="sg-prefix"
          type="text"
          style=${i}
          .value=${t}
          placeholder=${ut}
          @change=${this._prefixChanged}
        />

        <label for="sg-title" style=${r}>Title (optional)</label>
        <input
          id="sg-title"
          type="text"
          style=${i}
          .value=${(_this$_config$title = this._config.title) !== null && _this$_config$title !== void 0 ? _this$_config$title : ""}
          @change=${this._titleChanged}
        />

        <div style=${r}>Override individual entities (empty = derive from prefix / integration config):</div>
        ${Tt.map(t => {
      var _this$_config$entitie2, _this$_config3, _e$t;
      return B`
            <label for=${"sg-ent-" + t} style=${r}>${t}</label>
            <input
              id=${"sg-ent-" + t}
              type="text"
              style=${i}
              .value=${(_this$_config$entitie2 = (_this$_config3 = this._config) === null || _this$_config3 === void 0 || (_this$_config3 = _this$_config3.entities) === null || _this$_config3 === void 0 ? void 0 : _this$_config3[t]) !== null && _this$_config$entitie2 !== void 0 ? _this$_config$entitie2 : ""}
              placeholder=${(_e$t = e[t]) !== null && _e$t !== void 0 ? _e$t : t}
              @change=${e => this._entityChanged(t, e)}
            />
          `;
    })}
        ${["vpd", "camera", "lamp"].map(t => {
      var _this$_config$entitie3, _this$_config4, _this$_config5, _e$t2;
      return B`
          <label for=${"sg-ent-" + t} style=${r}>${t} (external — from integration config)</label>
          <input
            id=${"sg-ent-" + t}
            type="text"
            style=${i}
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
}
t([dt({
  attribute: !1
})], Ut.prototype, "hass", void 0), t([pt()], Ut.prototype, "_config", void 0), customElements.get("smartgrow-card-editor") || customElements.define("smartgrow-card-editor", Ut);
const Rt = "0.1.0",
  Ht = "smartgrow-card";
class jt extends at {
  constructor() {
    super(...arguments), this._sparkPoints = [], this._drawerOpen = !1;
  }
  static async getConfigElement() {
    return document.createElement("smartgrow-card-editor");
  }
  static getStubConfig(t) {
    return {
      type: `custom:${Ht}`
    };
  }
  setConfig(t) {
    if (!t || "object" != typeof t) throw new Error("Invalid configuration");
    this._config = {
      prefix: ut,
      show_setup_hint: !0,
      ...t
    }, this._sparkLoadedFor = void 0, this._sparkPoints = [];
  }
  getCardSize() {
    return 7;
  }
  willUpdate(t) {
    super.willUpdate(t), this._config && this.hass && this._maybeLoadSparkline();
  }
  _ids() {
    var _this$_config$prefix3, _this$_config6, _this$_config7, _this$hass, _jt$_prefixOverride, _this$_config9;
    const t = (_this$_config$prefix3 = (_this$_config6 = this._config) === null || _this$_config6 === void 0 ? void 0 : _this$_config6.prefix) !== null && _this$_config$prefix3 !== void 0 ? _this$_config$prefix3 : ut;
    let e = xt(t, (_this$_config7 = this._config) === null || _this$_config7 === void 0 ? void 0 : _this$_config7.entities);
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
      s && s !== t && (jt._prefixOverride = s, e = xt(s, (_this$_config8 = this._config) === null || _this$_config8 === void 0 ? void 0 : _this$_config8.entities));
    }
    const n = (_jt$_prefixOverride = jt._prefixOverride) !== null && _jt$_prefixOverride !== void 0 ? _jt$_prefixOverride : t;
    return jt._prefixOverride = null, function (t, e, s, n, _t$states5) {
      const i = {
          ...s
        },
        r = kt(t, e),
        a = ["vpd", "camera", "lamp"];
      for (const t of a) {
        const e = n === null || n === void 0 ? void 0 : n[t];
        if (e && e.length > 0) {
          i[t] = e;
          continue;
        }
        const s = r[`${t}_entity`];
        "string" == typeof s && s && (i[t] = s);
      }
      if (i.phase && !(t !== null && t !== void 0 && (_t$states5 = t.states) !== null && _t$states5 !== void 0 && _t$states5[i.phase])) for (const e of Object.keys((_t$states6 = t === null || t === void 0 ? void 0 : t.states) !== null && _t$states6 !== void 0 ? _t$states6 : {})) {
        var _t$states6;
        if (/^sensor\..*_smartgrow_phase$/.test(e)) {
          i.phase = e;
          break;
        }
      }
      return i;
    }(this.hass, n, e, (_this$_config9 = this._config) === null || _this$_config9 === void 0 ? void 0 : _this$_config9.entities);
  }
  _openCamera(t) {
    const e = new CustomEvent("hass-more-info", {
      bubbles: !0,
      composed: !0,
      detail: {
        entityId: t
      }
    });
    this.dispatchEvent(e);
  }
  async _maybeLoadSparkline() {
    var _this$hass$states;
    const t = this._ids().dah;
    if (t && this.hass && (_this$hass$states = this.hass.states) !== null && _this$hass$states !== void 0 && _this$hass$states[t] && this._sparkLoadedFor !== t) {
      this._sparkLoadedFor = t;
      try {
        const e = await async function (t, e, s, n = Date.now()) {
          const i = `${e}@${s}`,
            r = Nt.get(i);
          if (r && n - r.at < 3e5) return r.data;
          const a = new Date(n - 3600 * s * 1e3),
            o = new Date(n);
          try {
            const s = await t.callApi("GET", "history/period", `filter_entity_id=${encodeURIComponent(e)}`, `start=${encodeURIComponent(a.toISOString())}`, `end=${encodeURIComponent(o.toISOString())}`, "minimal_response", "no_attributes");
            return Nt.set(i, {
              at: n,
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
          const n = [];
          for (const t of s) if (Array.isArray(t)) for (const e of t) {
            const t = mt(e === null || e === void 0 ? void 0 : e.state);
            if (null === t || !(e !== null && e !== void 0 && e.last_changed)) continue;
            const s = Date.parse(e.last_changed);
            Number.isFinite(s) && n.push({
              t: s,
              v: t
            });
          }
          return n;
        }(e !== null && e !== void 0 ? e : {}, t);
      } catch {
        this._sparkPoints = [];
      }
    }
  }
  _renderSetupHint(t) {
    var _this$_config0, _this$_config$prefix4, _this$_config1;
    return !1 === ((_this$_config0 = this._config) === null || _this$_config0 === void 0 ? void 0 : _this$_config0.show_setup_hint) ? W : B`
      <div class="setup-hint">
        <div>🌱 SmartGrow entities not found.</div>
        <div>
          Expected prefix <code>${(_this$_config$prefix4 = (_this$_config1 = this._config) === null || _this$_config1 === void 0 ? void 0 : _this$_config1.prefix) !== null && _this$_config$prefix4 !== void 0 ? _this$_config$prefix4 : ut}</code>
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
    var _this$_config$title2, _ref4, _this$_config$camera_, _this$_config10, _e$wavemaker$mode, _e$dehumBand$high, _this$_config$dehum_p, _this$_config11, _ref5, _e$dehumReason, _$$label, _e$lightsOn, _e$lightsOff, _e$wavemaker$entity, _e$wavemaker$mode2;
    if (!this._config || !this.hass) return B``;
    const t = this._ids(),
      e = St(this.hass, t, ft),
      s = Date.now();
    if (e.empty) {
      const e = Object.values(t).filter(t => {
        var _this$hass2;
        return !!t && !((_this$hass2 = this.hass) !== null && _this$hass2 !== void 0 && (_this$hass2 = _this$hass2.states) !== null && _this$hass2 !== void 0 && _this$hass2[t]);
      });
      return B`<ha-card>${this._renderSetupHint(e)}</ha-card>`;
    }
    const n = (_this$_config$title2 = this._config.title) !== null && _this$_config$title2 !== void 0 ? _this$_config$title2 : e.device,
      i = null !== e.fanActual ? B`<span class="fan-sub">actual ${Math.round(e.fanActual)} %</span>` : W,
      r = (a = e.vpd, o = e.bandLow, l = e.bandHigh, null !== a && Number.isFinite(a) && l > o ? _t((a - o) / (l - o), -.25, 1.25) : null);
    var a, o, l;
    const c = null === (d = r) ? "unknown" : d < 0 ? "low" : d > 1 ? "high" : "ok";
    var d;
    const p = null === r ? null : _t((r + .25) / 1.5 * 100, 0, 100),
      h = _t(.25 / 1.5 * 100, 0, 100),
      u = _t(1.25 / 1.5 * 100, 0, 100),
      f = function (t, e, s, n) {
        const i = t.filter(t => Number.isFinite(t.v));
        if (i.length < 2 || e <= 0 || s <= 0) return null;
        const r = i.map(t => t.v);
        let a = Math.min(...r),
          o = Math.max(...r);
        if (o - a < .05) {
          const t = (o + a) / 2;
          a = t - .025, o = t + .025;
        }
        const l = i[0].t,
          c = i[i.length - 1].t - l || 1,
          d = i.map(t => ({
            x: n + (t.t - l) / c * (e - 2 * n),
            y: s - n - (t.v - a) / (o - a) * (s - 2 * n)
          })),
          p = d.map((t, e) => `${0 === e ? "M" : "L"}${t.x.toFixed(1)},${t.y.toFixed(1)}`).join(" ");
        return {
          line: p,
          area: `${p} L${d[d.length - 1].x.toFixed(1)},${s - n} L${d[0].x.toFixed(1)},${s - n} Z`,
          min: a,
          max: o
        };
      }(this._sparkPoints, 300, 54, 4),
      g = yt(At(this.hass, t.dehumidifier_decision)),
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
      v = (_ref4 = (_this$_config$camera_ = (_this$_config10 = this._config) === null || _this$_config10 === void 0 ? void 0 : _this$_config10.camera_entity) !== null && _this$_config$camera_ !== void 0 ? _this$_config$camera_ : t.camera) !== null && _ref4 !== void 0 ? _ref4 : null,
      _ = null !== e.cycles24h ? `${e.cycles24h} cyc/24h` : "",
      y = Mt({
        on: e.lightsOn,
        off: e.lightsOff
      }, s),
      $ = function (t, e, s, n, i, _t$mode) {
        const r = (_t$mode = t.mode) !== null && _t$mode !== void 0 ? _t$mode : "none";
        if ("none" === r || null === r) return {
          visible: !1,
          running: null,
          countdownMs: null,
          label: null
        };
        if (null === e) return {
          visible: !0,
          running: null,
          countdownMs: null,
          label: "interval" === r ? "pump unreachable" : null
        };
        if ("with_lights" === r) return null === i ? {
          visible: !0,
          running: e,
          countdownMs: null,
          label: null
        } : {
          visible: !0,
          running: e,
          countdownMs: null,
          label: e === i ? null : "should be " + (i ? "on" : "off")
        };
        const a = Number(t.runS),
          o = Number(t.everyMin);
        if (!Number.isFinite(a) || !Number.isFinite(o) || a <= 0 || o <= 0) return {
          visible: !0,
          running: e,
          countdownMs: null,
          label: null
        };
        if (null === s || !Number.isFinite(s)) return {
          visible: !0,
          running: e,
          countdownMs: null,
          label: null
        };
        const l = Math.max(0, n - s);
        if (e) {
          const t = 1e3 * a - l;
          return {
            visible: !0,
            running: !0,
            countdownMs: Math.max(0, t),
            label: `mixing ${Pt(Math.max(0, t))}`
          };
        }
        const c = 60 * o * 1e3 - 1e3 * a - l;
        return {
          visible: !0,
          running: !1,
          countdownMs: Math.max(0, c),
          label: `next run in ${Pt(Math.max(0, c))}`
        };
      }({
        mode: e.wavemaker.mode,
        runS: e.wavemaker.runS,
        everyMin: e.wavemaker.everyMin
      }, e.wavemaker.isOn, e.wavemaker.lastChangedMs, s, "day" === e.phase || "night" !== e.phase && null),
      b = !e.wavemaker.entity && "none" === ((_e$wavemaker$mode = e.wavemaker.mode) !== null && _e$wavemaker$mode !== void 0 ? _e$wavemaker$mode : "none"),
      w = (_e$dehumBand$high = e.dehumBand.high) !== null && _e$dehumBand$high !== void 0 ? _e$dehumBand$high : e.bandHigh,
      x = null !== e.dehumBand.low && null !== e.dehumBand.depth ? e.dehumBand.low + e.dehumBand.depth : null,
      k = t => _t((t + .25) / 2 * 100, 0, 100),
      A = t => (t - e.bandLow) / (e.bandHigh - e.bandLow),
      S = A(w),
      E = null !== x ? A(x) : null,
      O = null !== e.dehumBand.depth ? S : null,
      C = [];
    if ("day" === e.phase) {
      const t = !0 === e.lampOn && !1 !== e.masterOn;
      null === e.lampOn || t || C.push({
        text: !1 === e.masterOn ? "Lamp dark during day — master plug OFF" : "Lamp dark during day — dimmer OFF",
        cls: ""
      });
    }
    "low" === c ? C.push({
      text: "VPD below band — too humid",
      cls: ""
    }) : "high" === c && C.push({
      text: "VPD above band — too dry",
      cls: ""
    });
    const M = C.length,
      P = (_this$_config$dehum_p = (_this$_config11 = this._config) === null || _this$_config11 === void 0 ? void 0 : _this$_config11.dehum_power_entity) !== null && _this$_config$dehum_p !== void 0 ? _this$_config$dehum_p : null;
    let N = null,
      T = !1;
    if (P) {
      var _this$hass3;
      const t = mt((_this$hass3 = this.hass) === null || _this$hass3 === void 0 || (_this$hass3 = _this$hass3.states) === null || _this$hass3 === void 0 || (_this$hass3 = _this$hass3[P]) === null || _this$hass3 === void 0 ? void 0 : _this$hass3.state);
      null === t ? N = "power ?" : !0 === g.on && t <= 2 ? (N = "standby — commanded ON", T = !0) : N = `${Math.round(t)} W`;
    }
    return B`
      <ha-card>
        <div class="header">
          <div class="title">${n}</div>
          ${e.stage ? B`<div class="stage" title=${e.stageConflict ? `legacy helper says: ${e.stageConflict}` : ""}>${e.stage}${e.stageConflict ? " ⚠︎" : ""}</div>` : W}
          <div class="phase-chip ${e.phase}">${e.phase}</div>
          <div class="header-icons">
            ${!0 === e.dryRun ? B`<span class="badge-dry">DRY</span>` : W}
            ${M > 0 ? B`<span class="alert-pill">${M}</span>` : W}
            ${v ? B`<button
                  class="camera-icon"
                  title="Open live camera stream"
                  @click=${() => this._openCamera(v)}
                >
                  <ha-icon icon="mdi:cctv"></ha-icon>
                </button>` : W}
          </div>
        </div>
        ${e.stageConflict ? B`<div class="stage-conflict" style="font-size:0.78rem;opacity:0.8;margin:-4px 0 4px;color:var(--warning-color,#ffb000)">
              ⚠︎ legacy helper disagrees: ${e.stageConflict}
            </div>` : W}

        <div class="gauge-row">
          <div class="gauge">
            <div class="fan-big">${null !== e.fanTarget ? `${Math.round(e.fanTarget)} %` : "—"}</div>
            <div class="fan-sub">fan target ${i}</div>
          </div>
          <div style="flex:1">
            <div class="fan-sub">VPD ${null !== e.vpd ? e.vpd.toFixed(2) : "—"} kPa · band ${e.bandLow.toFixed(1)}–${e.bandHigh.toFixed(1)}</div>
            <div class="band-bar">
              <div class="band-ok" style="left:${h}%; width:${u - h}%"></div>
              ${null !== E && null !== O ? B`<div style="position:absolute;top:2px;bottom:2px;background:color-mix(in srgb, var(--sgc-warn) 45%, transparent);border-radius:5px;left:${k(E)}%;width:${Math.max(2, k(O) - k(E))}%"></div>` : W}
              ${null !== p ? B`<div class="band-marker ${"ok" === c ? "" : c}" style="left:${p}%"></div>` : W}
            </div>
            <div class="band-labels"><span>humid</span><span>${"unknown" === c ? "VPD unknown" : "low" === c ? "too humid — below band" : "high" === c ? "too dry — above band" : "in band"}</span><span>too dry</span></div>
          </div>
        </div>

        <div class="spark-wrap">
          <div class="spark-title">ΔAH tent↔lung · last ${24} h ${null !== e.dah ? `· now ${e.dah.toFixed(2)} g/m³` : ""}</div>
          ${f ? B`
                <svg class="spark-svg" viewBox="0 0 300 54" preserveAspectRatio="none">
                  <path class="spark-area" d="${f.area}"></path>
                  <path class="spark-line" d="${f.line}"></path>
                </svg>
              ` : B`<div class="spark-empty">no history yet — recording…</div>`}
        </div>

        <div class="status-grid" style=${b ? "grid-template-columns: 1fr 1fr 1fr;" : ""}>
          <div class="tile">
            <div class="tile-name"><span class="dot ${null !== e.fanTarget && e.fanTarget > 0 ? "on" : ""}"></span>Fan</div>
            <div class="tile-value">${null !== e.fanTarget ? `${Math.round(e.fanTarget)} %` : "—"}</div>
            <div class="tile-sub">${e.activeTerm ? `term: ${e.activeTerm}` : "actual " + (null !== e.fanActual ? Math.round(e.fanActual) + " %" : "—")}</div>
          </div>
          <div class="tile">
            <div class="tile-name"><span class="dot ${!0 === g.on ? "on" : !1 === g.on ? "off" : "warn"}"></span>Dehum</div>
            <div class="tile-value">${g.label}</div>
            <div class="tile-sub">${(_ref5 = (_e$dehumReason = e.dehumReason) !== null && _e$dehumReason !== void 0 ? _e$dehumReason : _) !== null && _ref5 !== void 0 ? _ref5 : ""}</div>
          </div>
          <div class="tile">
            <div class="tile-name"><span class="dot ${!0 === e.lampOn ? "on" : !1 === e.lampOn ? "off" : "warn"}"></span>Lamp</div>
            <div class="tile-value">${null === e.lampOn ? "—" : e.lampOn ? "ON" : "OFF"}</div>
            <div class="tile-sub">
              ${y ? `${"on" === y.next ? "on in" : "off in"} ${Pt(y.ms)}` : !1 === e.masterOn ? "plug off" : ""}
            </div>
          </div>
          ${b ? W : B`<div class="tile">
                <div class="tile-name"><span class="dot ${!0 === $.running ? "on" : !1 === $.running ? "off" : "warn"}"></span>Wave</div>
                <div class="tile-value">${$.visible ? null === $.running ? "—" : $.running ? "ON" : "idle" : "off"}</div>
                <div class="tile-sub">${(_$$label = $.label) !== null && _$$label !== void 0 ? _$$label : e.wavemaker.entity ? "" : "not configured"}</div>
              </div>`}
        </div>

        ${C.length > 0 ? B`<div class="alert-strip">
              ${C.map(t => B`<div class="alert-row ${t.cls}">⚠️ ${t.text}</div>`)}
            </div>` : W}

        <div class="chip-row">
          ${null !== e.dryRun ? B`<span class="chip ${e.dryRun ? "dryrun" : "off"}">${e.dryRun ? "DRY RUN" : "live"}</span>` : W}
          ${null !== e.adaptation ? B`<span class="chip ${e.adaptation ? "on" : "off"}">adaptation ${e.adaptation ? "on" : "off"}</span>` : W}
          ${_ ? B`<span class="chip">${_}</span>` : W}
          ${N ? B`<span class="chip ${T ? "warn" : ""}">${N}</span>` : W}
        </div>
        ${g.reason ? B`<p class="dehum-reason">reason: ${g.reason}</p>` : W}

        <div class="terms">
          ${m.map(t => B`
              <div class="term ${t.active ? "active" : ""}">
                <div class="term-name">
                  <span>${t.label}</span>
                  <span class="val">${null !== t.value ? `${t.value.toFixed(0)}%` : "—"}</span>
                </div>
                <div class="term-bar">
                  <div class="term-fill" style="width:${function (t) {
      return null !== t && Number.isFinite(t) ? _t(t, 0, 100) : 0;
    }(t.value)}%"></div>
                </div>
              </div>
            `)}
        </div>
        ${e.activeTerm ? B`<div class="fan-sub" style="margin-top:6px">active term: ${e.activeTerm}</div>` : W}

        <button
          class="drawer-toggle"
          @click=${() => {
      this._drawerOpen = !this._drawerOpen;
    }}
        >
          ${this._drawerOpen ? "Details ▴" : "Details ▾"}
        </button>
        ${this._drawerOpen ? B`<div class="drawer">
              <div class="section">Schedule</div>
              <div class="row"><span class="k">Lights on</span><span class="v">${(_e$lightsOn = e.lightsOn) !== null && _e$lightsOn !== void 0 ? _e$lightsOn : "—"}</span></div>
              <div class="row"><span class="k">Lights off</span><span class="v">${(_e$lightsOff = e.lightsOff) !== null && _e$lightsOff !== void 0 ? _e$lightsOff : "—"}</span></div>
              ${y ? B`<div class="row"><span class="k">Next switch</span><span class="v">${y.next} in ${Pt(y.ms)}</span></div>` : W}
              <div class="section">Wavemaker</div>
              <div class="row"><span class="k">Entity</span><span class="v">${(_e$wavemaker$entity = e.wavemaker.entity) !== null && _e$wavemaker$entity !== void 0 ? _e$wavemaker$entity : "not configured"}</span></div>
              <div class="row"><span class="k">Mode</span><span class="v">${(_e$wavemaker$mode2 = e.wavemaker.mode) !== null && _e$wavemaker$mode2 !== void 0 ? _e$wavemaker$mode2 : "—"}</span></div>
              ${null !== e.wavemaker.runS ? B`<div class="row"><span class="k">Run</span><span class="v">${e.wavemaker.runS} s</span></div>` : W}
              ${null !== e.wavemaker.everyMin ? B`<div class="row"><span class="k">Every</span><span class="v">${e.wavemaker.everyMin} min</span></div>` : W}
              <div class="section">Dehumidifier</div>
              <div class="row"><span class="k">Band</span><span class="v">${null !== e.dehumBand.low ? `${e.dehumBand.low.toFixed(2)} – ${null !== e.dehumBand.high ? e.dehumBand.high.toFixed(2) : "?"} kPa` : "—"}</span></div>
              ${null !== e.dehumBand.depth && null !== e.dehumBand.low && null !== x ? B`<div class="row"><span class="k">Window</span><span class="v">${x.toFixed(2)} → ${(e.dehumBand.low + e.dehumBand.depth).toFixed(2)} kPa</span></div>` : W}
              <div class="row"><span class="k">Cycles 24h</span><span class="v">${_ || "—"}</span></div>
              <div class="row"><span class="k">Power</span><span class="v">${N !== null && N !== void 0 ? N : "configure dehum_power_entity"}</span></div>
              <div class="section">Diagnostics</div>
              <div class="row"><span class="k">Master plug</span><span class="v">${null === e.masterOn ? "not configured" : e.masterOn ? "on" : "off"}</span></div>
              <div class="row"><span class="k">Lamp dimmer</span><span class="v">${null === e.lampOn ? "—" : e.lampOn ? "on" : "off"}</span></div>
              ${e.oscillationWarning ? B`<div class="row"><span class="k">Oscillation</span><span class="v">warning active</span></div>` : W}
              ${e.legacyWarning ? B`<div class="row"><span class="k">Legacy automations</span><span class="v">still active</span></div>` : W}
            </div>` : W}
      </ha-card>
    `;
  }
}
_jt = jt;
_jt.styles = ht;
_jt._prefixOverride = null;
t([dt({
  attribute: !1
})], jt.prototype, "hass", void 0), t([pt()], jt.prototype, "_config", void 0), t([pt()], jt.prototype, "_sparkPoints", void 0), t([pt()], jt.prototype, "_drawerOpen", void 0), customElements.get("smartgrow-card") || customElements.define("smartgrow-card", jt), window.customCards = window.customCards || [], window.customCards.push({
  type: "smartgrow-card",
  name: "SmartGrow Card",
  description: "Grow-tent overview for the SmartGrow integration: fan gauge, VPD band, ΔAH sparkline, dehumidifier chip.",
  documentationURL: "https://github.com/niggo/smartgrow-card"
});
export { Ht as CARD_NAME, Rt as CARD_VERSION, jt as SmartGrowCard, Ut as SmartGrowCardEditor };
