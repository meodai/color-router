var z = (a) => {
  throw TypeError(a);
};
var j = (a, t, e) => t.has(a) || z("Cannot " + e);
var n = (a, t, e) => (j(a, t, "read from private field"), e ? e.call(a) : t.get(a)), p = (a, t, e) => t.has(a) ? z("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(a) : t.set(a, e), E = (a, t, e, s) => (j(a, t, "write to private field"), s ? s.call(a, e) : t.set(a, e), e), h = (a, t, e) => (j(a, t, "access private method"), e);
import { parse as F, formatHex as _, wcagContrast as v, interpolate as tt, converter as B } from "culori";
class S {
  constructor(t) {
    this.key = t, this.type = Symbol.for("ColorReference");
  }
}
class M {
  constructor(t, e, s) {
    this.fn = t, this.args = e, this.dependencies = s, this.type = Symbol.for("ColorFunction");
  }
  execute(t) {
    const e = this.args.map(
      (s) => typeof s == "string" && t.has(s) ? t.resolve(s) : s
    );
    return this.fn(...e);
  }
}
class $ extends Error {
  constructor(t) {
    super(t), this.name = "PaletteError";
  }
}
class I extends Error {
  constructor(t) {
    super(`Circular dependency detected: ${t.join(" -> ")}`), this.path = t, this.name = "CircularDependencyError";
  }
}
var u, m, C, y, b, x, R, P, k, c, V, U, D, K, J, L, Q, G, q, T, X, H, Y;
class rt {
  constructor(t = {}) {
    p(this, c);
    p(this, u, /* @__PURE__ */ new Map());
    p(this, m, /* @__PURE__ */ new Map());
    p(this, C, /* @__PURE__ */ new Map());
    p(this, y, /* @__PURE__ */ new Map());
    p(this, b, /* @__PURE__ */ new Map());
    p(this, x, "auto");
    p(this, R, /* @__PURE__ */ new Set());
    p(this, P, new EventTarget());
    p(this, k, /* @__PURE__ */ new Map());
    E(this, x, t.mode || "auto"), h(this, c, Y).call(this);
  }
  // --- CUSTOM FUNCTIONS ---
  registerFunction(t, e) {
    if (this[t] || t === "ref" || t === "func")
      throw new $(`Function name "${t}" is reserved.`);
    n(this, k).set(t, e), this._logCallback && this._logCallback(`Registered function '${t}'.`);
  }
  func(t, ...e) {
    if (!n(this, k).has(t))
      throw new $(`Custom function "${t}" is not registered.`);
    const s = n(this, k).get(t), r = e.filter((i) => typeof i == "string" && i.includes("."));
    return new M(s, e, r);
  }
  // --- PALETTE MANAGEMENT ---
  createPalette(t, e = {}) {
    const { extends: s, overrides: r = {} } = e;
    if (n(this, u).has(t)) throw new $(`Palette "${t}" already exists.`);
    if (s && !n(this, u).has(s))
      throw new $(`Base palette "${s}" does not exist.`);
    if (n(this, u).set(t, { extends: s, overrides: r }), this._logCallback && this._logCallback(`Palette '${t}' created${s ? ` extending '${s}'` : ""}.`), s && Object.keys(r).length > 0)
      for (const [i, o] of Object.entries(r))
        this.define(`${t}.${i}`, o);
  }
  extendPalette(t, e, s = {}) {
    return this.createPalette(t, { extends: e, overrides: s });
  }
  copyPalette(t, e) {
    if (!n(this, u).has(t))
      throw new $(`Source palette "${t}" does not exist.`);
    if (n(this, u).has(e))
      throw new $(`Target palette "${e}" already exists.`);
    const s = this.getAllKeysForPalette(t);
    this.createPalette(e);
    for (const r of s) {
      const i = r.split(".").slice(1).join("."), o = this.getDefinitionForKey(r);
      this.define(`${e}.${i}`, o);
    }
    this._logCallback && this._logCallback(`Copied palette '${t}' to '${e}'.`);
  }
  deletePalette(t) {
    if (!n(this, u).has(t)) throw new $(`Palette "${t}" does not exist.`);
    const e = this.getAllKeysForPalette(t);
    for (const s of e)
      n(this, m).delete(s), n(this, C).delete(s), n(this, y).delete(s), n(this, b).delete(s);
    n(this, u).delete(t), this._logCallback && this._logCallback(`Deleted palette '${t}'.`);
  }
  // --- COLOR DEFINITION & MODIFICATION ---
  define(t, e) {
    const [s] = t.split(".");
    if (!n(this, u).has(s))
      throw new $(`Palette "${s}" does not exist. Create it first.`);
    h(this, c, V).call(this, t, e);
  }
  set(t, e) {
    if (!this.has(t)) throw new $(`Color "${t}" is not defined. Use .define() first.`);
    h(this, c, V).call(this, t, e);
  }
  flush() {
    if (n(this, x) !== "batch") return;
    const t = h(this, c, q).call(this, Array.from(n(this, R))), e = [];
    for (const s of t) {
      const r = n(this, C).get(s);
      h(this, c, D).call(this, s);
      const i = n(this, C).get(s);
      r !== i && (e.push({ key: s, oldValue: r, newValue: i }), h(this, c, H).call(this, s, i, r));
    }
    e.length > 0 && (n(this, P).dispatchEvent(new CustomEvent("change", { detail: e })), n(this, P).dispatchEvent(new CustomEvent("batch-complete", { detail: e })), this._logCallback && this._logCallback(`Flush complete. ${e.length} colors updated.`)), n(this, R).clear();
  }
  resolve(t) {
    if (!n(this, C).has(t))
      try {
        h(this, c, D).call(this, t);
      } catch {
        return "invalid";
      }
    return n(this, C).get(t);
  }
  // --- UTILITY & HELPER FUNCTIONS ---
  has(t) {
    let [e, s] = t.split(".");
    for (; e; ) {
      if (n(this, m).has(`${e}.${s}`)) return !0;
      const r = n(this, u).get(e);
      if (!r || !r.extends) break;
      e = r.extends;
    }
    return !1;
  }
  on(t, e) {
    n(this, P).addEventListener(t, e);
  }
  watch(t, e) {
    this.on(`watch:${t}`, (s) => {
      const r = s;
      e(r.detail.newValue, r.detail.oldValue);
    });
  }
  // --- PUBLIC API FOR REFERENCES & BUILT-IN FUNCTIONS ---
  ref(t) {
    return new S(t);
  }
  // --- PUBLIC GETTERS FOR UI ---
  getAllPalettes() {
    return Array.from(n(this, u).entries()).map(([t, e]) => ({ name: t, config: e }));
  }
  getAllKeysForPalette(t) {
    return h(this, c, J).call(this, t);
  }
  getDefinitionForKey(t) {
    return h(this, c, K).call(this, t);
  }
  valueToString(t) {
    return h(this, c, T).call(this, t);
  }
  get mode() {
    return n(this, x);
  }
  set mode(t) {
    E(this, x, t);
  }
  get batchQueueSize() {
    return n(this, R).size;
  }
  // --- DEPENDENCY ANALYSIS ---
  getDependencies(t) {
    return Array.from(n(this, b).get(t) || []);
  }
  getDependents(t) {
    return Array.from(n(this, y).get(t) || []);
  }
  getConnectionGraph() {
    const t = {};
    for (const [e, s] of n(this, b).entries())
      t[e] = Array.from(s);
    return t;
  }
  // --- INTERNAL ACCESSORS FOR RENDERER ---
  _getDefinition(t) {
    return h(this, c, K).call(this, t);
  }
  _getCustomFunctions() {
    return n(this, k);
  }
  getPaletteDependencies(t) {
    const e = this.getAllKeysForPalette(t), s = /* @__PURE__ */ new Set();
    for (const r of e) {
      const i = this.getDependencies(r);
      for (const o of i)
        o.startsWith(`${t}.`) || s.add(o);
    }
    return Array.from(s);
  }
  resolvePalette(t) {
    const e = this.getAllKeysForPalette(t), s = {};
    for (const r of e) {
      const i = r.split(".").slice(1).join(".");
      s[i] = this.resolve(r);
    }
    return s;
  }
  // --- RENDERER ACCESS ---
  createRenderer(t) {
    if (!this._ColorRenderer)
      throw new Error("ColorRenderer class not injected. Please call setColorRenderer() first.");
    return new this._ColorRenderer(this, t);
  }
  // Method to inject ColorRenderer class to avoid circular imports
  setColorRenderer(t) {
    this._ColorRenderer = t;
  }
  // Method to set logging callback for UI integration
  setLogCallback(t) {
    this._logCallback = t;
  }
  // Legacy render method for backwards compatibility
  render(t = "css-variables") {
    return this.createRenderer(t).render();
  }
}
u = new WeakMap(), m = new WeakMap(), C = new WeakMap(), y = new WeakMap(), b = new WeakMap(), x = new WeakMap(), R = new WeakMap(), P = new WeakMap(), k = new WeakMap(), c = new WeakSet(), V = function(t, e) {
  if (typeof e == "string" && !F(e))
    throw new $(`Invalid color value: "${e}". Must be a valid CSS color or a router function.`);
  n(this, m).set(t, e), h(this, c, L).call(this, t, e), n(this, x) === "auto" ? h(this, c, U).call(this, t) : n(this, R).add(t), this._logCallback && this._logCallback(`Defined '${t}' = ${h(this, c, T).call(this, e)}`);
}, // --- RESOLUTION & REACTIVITY ---
U = function(t) {
  const e = h(this, c, G).call(this, t), s = [];
  for (const r of e) {
    const i = n(this, C).get(r);
    h(this, c, D).call(this, r);
    const o = n(this, C).get(r);
    i !== o && (s.push({ key: r, oldValue: i, newValue: o }), h(this, c, H).call(this, r, o, i));
  }
  s.length > 0 && n(this, P).dispatchEvent(new CustomEvent("change", { detail: s }));
}, D = function(t, e = []) {
  if (e.includes(t)) throw new I([...e, t]);
  const s = h(this, c, K).call(this, t);
  let r;
  return s instanceof S ? r = h(this, c, D).call(this, s.key, [...e, t]) : s instanceof M ? r = s.execute(this) : r = h(this, c, X).call(this, s), n(this, C).set(t, r), r;
}, K = function(t) {
  let [e, s] = t.split(".");
  for (; e; ) {
    const r = `${e}.${s}`;
    if (n(this, m).has(r)) return n(this, m).get(r);
    const i = n(this, u).get(e);
    if (!i || !i.extends) break;
    e = i.extends;
  }
  throw new $(`Color '${t}' not found in palette hierarchy.`);
}, J = function(t) {
  const e = /* @__PURE__ */ new Set();
  let s = t;
  const r = [];
  for (; s && !r.includes(s); ) {
    r.unshift(s);
    const i = n(this, u).get(s);
    s = i == null ? void 0 : i.extends;
  }
  for (const i of r) {
    const o = `${i}.`;
    for (const l of n(this, m).keys())
      l.startsWith(o) && e.add(l.split(".").slice(1).join("."));
  }
  return Array.from(e).map((i) => `${t}.${i}`);
}, // --- DEPENDENCY GRAPH ---
L = function(t, e) {
  var r;
  if (n(this, b).has(t))
    for (const i of n(this, b).get(t))
      (r = n(this, y).get(i)) == null || r.delete(t);
  n(this, b).set(t, /* @__PURE__ */ new Set());
  const s = h(this, c, Q).call(this, e);
  for (const i of s)
    n(this, y).has(i) || n(this, y).set(i, /* @__PURE__ */ new Set()), n(this, y).get(i).add(t), n(this, b).get(t).add(i);
}, Q = function(t) {
  return t instanceof S ? [t.key] : t instanceof M ? t.dependencies : [];
}, G = function(t) {
  const e = /* @__PURE__ */ new Set(), s = [], r = this;
  function i(o) {
    e.has(o) || (e.add(o), (n(r, y).get(o) || []).forEach(i), s.push(o));
  }
  return i(t), s.reverse();
}, q = function(t) {
  const e = [], s = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set(), i = this, o = (l) => {
    if (!s.has(l)) {
      if (r.has(l)) throw new I([...r, l]);
      r.add(l), (n(i, b).get(l) || []).forEach((d) => {
        t.includes(d) && o(d);
      }), r.delete(l), s.add(l), e.push(l);
    }
  };
  for (const l of t)
    s.has(l) || o(l);
  return e;
}, T = function(t) {
  var e;
  if (t instanceof S) return `ref('${t.key}')`;
  if (t instanceof M) {
    const s = ((e = [...n(this, k).entries()].find(([i, o]) => o === t.fn)) == null ? void 0 : e[0]) || t.fn.name.replace("bound ", ""), r = t.args.map((i) => typeof i == "string" ? `'${i}'` : i).join(", ");
    return `${s}(${r})`;
  }
  return `'${t}'`;
}, X = function(t) {
  const e = F(t);
  return e ? _(e) : "#00000000";
}, H = function(t, e, s) {
  n(this, P).dispatchEvent(new CustomEvent(`watch:${t}`, {
    detail: { newValue: e, oldValue: s }
  }));
}, // Register built-in functions during construction
Y = function() {
  this.registerFunction("bestContrastWith", (t, e) => {
    if (!F(t)) return "#000000";
    if (!e)
      return v("#fff", t) >= v("#000", t) ? "#ffffff" : "#000000";
    if (!n(this, u).has(e))
      return console.warn(`Palette "${e}" not found, falling back to black/white`), v("#fff", t) >= v("#000", t) ? "#ffffff" : "#000000";
    const s = this.getAllKeysForPalette(e);
    if (s.length === 0)
      return console.warn(`Palette "${e}" has no colors, falling back to black/white`), v("#fff", t) >= v("#000", t) ? "#ffffff" : "#000000";
    let r = null, i = 0;
    for (const o of s)
      try {
        const l = this.resolve(o);
        if (l && l !== "invalid") {
          const d = v(l, t);
          d > i && (i = d, r = l);
        }
      } catch {
        continue;
      }
    if (r)
      return r;
    for (const o of s)
      try {
        const l = this.resolve(o);
        if (l && l !== "invalid")
          return l;
      } catch {
        continue;
      }
    return "#000000";
  }), this.registerFunction("colorMix", (t, e, s = "50%", r = "lab") => {
    try {
      const i = F(t), o = F(e);
      if (!i || !o) return t;
      const l = tt([i, o], r), d = parseFloat(s) / 100;
      return _(l(d));
    } catch {
      return t;
    }
  }), this.registerFunction("relativeTo", (t, e) => {
    try {
      const s = F(t);
      if (!s) return t;
      if (e.includes("/ 0.8")) {
        const r = { ...s, alpha: 0.8 };
        return _(r);
      }
      return _(s);
    } catch {
      return t;
    }
  }), this.registerFunction("minContrastWith", (t, e = 1.5) => {
    if (!F(t)) return "#000000";
    const s = v("#fff", t), r = v("#000", t);
    return s >= e ? "#ffffff" : r >= e ? "#000000" : s >= r ? "#ffffff" : "#000000";
  }), this.registerFunction("lighten", (t, e) => {
    try {
      const s = F(t);
      if (!s) return t;
      const i = B("hsl")(s);
      return i && typeof i.l == "number" ? (i.l = Math.min(1, i.l + e), _(i)) : t;
    } catch {
      return t;
    }
  }), this.registerFunction("darken", (t, e) => {
    try {
      const s = F(t);
      if (!s) return t;
      const i = B("hsl")(s);
      return i && typeof i.l == "number" ? (i.l = Math.max(0, i.l - e), _(i)) : t;
    } catch {
      return t;
    }
  });
};
var g, f, A, w, O, Z, W, N;
class nt {
  constructor(t, e = "css-variables") {
    p(this, w);
    p(this, g);
    p(this, f);
    p(this, A, /* @__PURE__ */ new Map());
    E(this, g, t), E(this, f, e === "css" ? "css-variables" : e), h(this, w, O).call(this);
  }
  // Register a custom function renderer for this format
  registerFunctionRenderer(t, e) {
    n(this, A).has(n(this, f)) || n(this, A).set(n(this, f), /* @__PURE__ */ new Map()), n(this, A).get(n(this, f)).set(t, e);
  }
  // Main render method
  render() {
    const t = /* @__PURE__ */ new Set();
    n(this, g).getAllPalettes().forEach(({ name: r }) => {
      n(this, g).getAllKeysForPalette(r).forEach((i) => t.add(i));
    });
    const e = Array.from(t).sort();
    if (n(this, f) === "json") {
      const r = {};
      for (const i of e)
        r[i] = n(this, g).resolve(i);
      return JSON.stringify(r, null, 2);
    }
    let s = "";
    for (const r of e) {
      const i = n(this, g)._getDefinition(r), o = h(this, w, Z).call(this, i, r);
      n(this, f) === "css-variables" ? s += `  --${r.replace(/\./g, "-")}: ${o};
` : n(this, f) === "scss" && (s += `$${r.replace(/\./g, "-")}: ${o};
`);
    }
    return n(this, f) === "css-variables" ? `:root {
${s}}` : s;
  }
  // Get the current format
  get format() {
    return n(this, f);
  }
  // Set a new format
  set format(t) {
    E(this, f, t === "css" ? "css-variables" : t), h(this, w, O).call(this);
  }
}
g = new WeakMap(), f = new WeakMap(), A = new WeakMap(), w = new WeakSet(), // Register built-in function renderers for different formats
O = function() {
  this.registerFunctionRenderer("colorMix", (t) => {
    const [e, s, r = "50%", i = "lab"] = t, l = 100 - (r.includes("%") ? parseFloat(r) : parseFloat(r) * 100);
    return `color-mix(in ${i}, ${e} ${l}%, ${s})`;
  }), this.registerFunctionRenderer("lighten", (t) => {
    const [e, s] = t, r = Math.round(parseFloat(s) * 100);
    return `color-mix(in oklch, ${e} ${100 - r}%, white)`;
  }), this.registerFunctionRenderer("darken", (t) => {
    const [e, s] = t, r = Math.round(parseFloat(s) * 100);
    return `color-mix(in oklch, ${e} ${100 - r}%, black)`;
  }), n(this, f) === "scss" && (this.registerFunctionRenderer("lighten", (t) => {
    const [e, s] = t, r = Math.round(parseFloat(s) * 100);
    return `lighten(${e}, ${r}%)`;
  }), this.registerFunctionRenderer("darken", (t) => {
    const [e, s] = t, r = Math.round(parseFloat(s) * 100);
    return `darken(${e}, ${r}%)`;
  }), this.registerFunctionRenderer("colorMix", (t) => {
    const [e, s, r = "50%"] = t, i = r.includes("%") ? parseFloat(r) : parseFloat(r) * 100;
    return `mix(${s}, ${e}, ${i}%)`;
  }));
}, // Render a color definition value (ColorReference, ColorFunction, or raw color)
Z = function(t, e) {
  return t instanceof S ? h(this, w, W).call(this, t.key) : t instanceof M ? h(this, w, N).call(this, t, e) : n(this, g).resolve(e);
}, // Render a color reference
W = function(t) {
  return n(this, f) === "scss" ? `$${t.replace(/\./g, "-")}` : n(this, f) === "css-variables" ? `var(--${t.replace(/\./g, "-")})` : n(this, g).resolve(t);
}, // Render a color function
N = function(t, e) {
  var o;
  const s = n(this, A).get(n(this, f));
  if (!s)
    return n(this, g).resolve(e);
  const r = ((o = [...n(this, g)._getCustomFunctions().entries()].find(([l, d]) => d === t.fn)) == null ? void 0 : o[0]) || "unknown", i = s.get(r);
  if (!i)
    return n(this, g).resolve(e);
  try {
    const l = t.args.map((d) => typeof d == "string" && d.includes(".") && n(this, g).has(d) ? h(this, w, W).call(this, d) : d);
    return i(l);
  } catch (l) {
    return console.warn(`Failed to render function ${r}:`, l), n(this, g).resolve(e);
  }
};
export {
  I as CircularDependencyError,
  M as ColorFunction,
  S as ColorReference,
  nt as ColorRenderer,
  rt as ColorRouter,
  $ as PaletteError
};
