var ct = (i) => {
  throw TypeError(i);
};
var Z = (i, t, e) => t.has(i) || ct("Cannot " + e);
var o = (i, t, e) => (Z(i, t, "read from private field"), e ? e.call(i) : t.get(i)), g = (i, t, e) => t.has(i) ? ct("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(i) : t.set(i, e), E = (i, t, e, s) => (Z(i, t, "write to private field"), s ? s.call(i, e) : t.set(i, e), e), d = (i, t, e) => (Z(i, t, "access private method"), e);
import { parse as V, wcagContrast as T, interpolate as Ft, formatHex as N, converter as at } from "culori";
function Mt(i, t) {
  if (!V(i)) return "#000000";
  if (!t)
    return T("#fff", i) >= T("#000", i) ? "#ffffff" : "#000000";
  if (!this.getAllPalettes().find((n) => n.name === t))
    return console.warn(`Palette "${t}" not found, falling back to black/white`), T("#fff", i) >= T("#000", i) ? "#ffffff" : "#000000";
  const e = this.getAllKeysForPalette(t);
  if (e.length === 0)
    return console.warn(`Palette "${t}" has no colors, falling back to black/white`), T("#fff", i) >= T("#000", i) ? "#ffffff" : "#000000";
  let s = null, r = 0;
  for (const n of e)
    try {
      const c = this.resolve(n);
      if (c && c !== "invalid") {
        const a = T(c, i);
        a > r && (r = a, s = c);
      }
    } catch {
      continue;
    }
  if (s)
    return s;
  for (const n of e)
    try {
      const c = this.resolve(n);
      if (c && c !== "invalid")
        return c;
    } catch {
      continue;
    }
  return "#000000";
}
const kt = {
  "css-variables": (i) => "",
  scss: (i) => "",
  json: (i) => ""
};
function Rt(i, t, e = 0.5, s = "lab") {
  try {
    const r = V(i), n = V(t);
    if (!r || !n) return i;
    const c = Ft([r, n], s), a = typeof e == "string" ? parseFloat(e) / 100 : e;
    return N(c(a));
  } catch {
    return i;
  }
}
const St = {
  "css-variables": (i) => {
    const [t, e, s = 0.5, r = "lab"] = i, c = 100 - (typeof s == "string" && s.includes("%") ? parseFloat(s) : parseFloat(s) * 100);
    return `color-mix(in ${r}, ${t} ${c}%, ${e})`;
  },
  scss: (i) => {
    const [t, e, s = 0.5] = i, r = typeof s == "string" && s.includes("%") ? parseFloat(s) : parseFloat(s) * 100;
    return `mix(${e}, ${t}, ${r}%)`;
  },
  json: (i) => ""
};
function _t(i, t) {
  try {
    const e = V(i);
    if (!e) return i;
    if (t.includes("/ 0.8")) {
      const s = { ...e, alpha: 0.8 };
      return N(s);
    }
    return N(e);
  } catch {
    return i;
  }
}
const jt = {
  "css-variables": (i) => {
    const [t, e] = i;
    return `rgb(from ${t} ${e})`;
  },
  scss: (i) => "",
  json: (i) => ""
};
function Et(i, t = 1.5) {
  if (!V(i)) return "#000000";
  const e = T("#fff", i), s = T("#000", i);
  return e >= t ? "#ffffff" : s >= t ? "#000000" : e >= s ? "#ffffff" : "#000000";
}
const At = {
  "css-variables": (i) => "",
  scss: (i) => "",
  json: (i) => ""
};
function Dt(i, t) {
  try {
    const e = V(i);
    if (!e) return i;
    const r = at("hsl")(e);
    return r && typeof r.l == "number" ? (r.l = Math.min(1, r.l + t), N(r)) : i;
  } catch {
    return i;
  }
}
const Tt = {
  "css-variables": (i) => {
    const [t, e] = i, s = Math.round(parseFloat(e) * 100);
    return `color-mix(in oklch, ${t} ${100 - s}%, white)`;
  },
  scss: (i) => {
    const [t, e] = i, s = Math.round(parseFloat(e) * 100);
    return `lighten(${t}, ${s}%)`;
  },
  json: (i) => ""
};
function Kt(i, t) {
  try {
    const e = V(i);
    if (!e) return i;
    const r = at("hsl")(e);
    return r && typeof r.l == "number" ? (r.l = Math.max(0, r.l - t), N(r)) : i;
  } catch {
    return i;
  }
}
const Lt = {
  "css-variables": (i) => {
    const [t, e] = i, s = Math.round(parseFloat(e) * 100);
    return `color-mix(in oklch, ${t} ${100 - s}%, black)`;
  },
  scss: (i) => {
    const [t, e] = i, s = Math.round(parseFloat(e) * 100);
    return `darken(${t}, ${s}%)`;
  },
  json: (i) => ""
};
class U {
  constructor(t) {
    this.key = t, this.type = Symbol.for("ColorReference");
  }
}
class I {
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
class F extends Error {
  constructor(t) {
    super(t), this.name = "PaletteError";
  }
}
class Y extends Error {
  constructor(t) {
    super(`Circular dependency detected: ${t.join(" -> ")}`), this.path = t, this.name = "CircularDependencyError";
  }
}
var m, K, R, A, S, O, G, B, L, J, $, f, tt, ht, Q, et, lt, ft, dt, ut, pt, st, gt, nt, $t;
class Gt {
  constructor(t = {}) {
    g(this, f);
    g(this, m, /* @__PURE__ */ new Map());
    g(this, K, /* @__PURE__ */ new Map());
    g(this, R, /* @__PURE__ */ new Map());
    g(this, A, /* @__PURE__ */ new Map());
    g(this, S, /* @__PURE__ */ new Map());
    g(this, O, "auto");
    g(this, G, /* @__PURE__ */ new Set());
    g(this, B, new EventTarget());
    g(this, L, /* @__PURE__ */ new Map());
    g(this, J);
    g(this, $);
    E(this, O, t.mode || "auto"), d(this, f, $t).call(this);
  }
  // --- CUSTOM FUNCTIONS ---
  registerFunction(t, e) {
    if (this[t] || t === "ref" || t === "func")
      throw new F(`Function name "${t}" is reserved.`);
    o(this, L).set(t, e), o(this, $) && o(this, $).call(this, `Registered function '${t}'.`);
  }
  func(t, ...e) {
    if (!o(this, L).has(t))
      throw new F(`Custom function "${t}" is not registered.`);
    const s = o(this, L).get(t), r = e.filter((n) => typeof n == "string" && n.includes("."));
    return new I(s, e, r);
  }
  // --- PALETTE MANAGEMENT ---
  createPalette(t, e = {}) {
    const { extends: s, overrides: r = {} } = e;
    if (o(this, m).has(t)) throw new F(`Palette "${t}" already exists.`);
    if (s && !o(this, m).has(s))
      throw new F(`Base palette "${s}" does not exist.`);
    if (o(this, m).set(t, { extends: s, overrides: r }), o(this, $) && o(this, $).call(this, `Palette '${t}' created${s ? ` extending '${s}'` : ""}.`), s && Object.keys(r).length > 0)
      for (const [n, c] of Object.entries(r))
        this.define(`${t}.${n}`, c);
  }
  extendPalette(t, e, s = {}) {
    return this.createPalette(t, { extends: e, overrides: s });
  }
  copyPalette(t, e) {
    if (!o(this, m).has(t))
      throw new F(`Source palette "${t}" does not exist.`);
    if (o(this, m).has(e))
      throw new F(`Target palette "${e}" already exists.`);
    const s = this.getAllKeysForPalette(t);
    this.createPalette(e);
    for (const r of s) {
      const n = r.split(".").slice(1).join("."), c = this.getDefinitionForKey(r);
      this.define(`${e}.${n}`, c);
    }
    o(this, $) && o(this, $).call(this, `Copied palette '${t}' to '${e}'.`);
  }
  deletePalette(t) {
    if (!o(this, m).has(t)) throw new F(`Palette "${t}" does not exist.`);
    const e = this.getAllKeysForPalette(t);
    for (const s of e)
      o(this, K).delete(s), o(this, R).delete(s), o(this, A).delete(s), o(this, S).delete(s);
    o(this, m).delete(t), o(this, $) && o(this, $).call(this, `Deleted palette '${t}'.`);
  }
  // --- COLOR DEFINITION & MODIFICATION ---
  define(t, e) {
    const [s] = t.split(".");
    if (!o(this, m).has(s))
      throw new F(`Palette "${s}" does not exist. Create it first.`);
    d(this, f, tt).call(this, t, e);
  }
  set(t, e) {
    if (!this.has(t)) throw new F(`Color "${t}" is not defined. Use .define() first.`);
    d(this, f, tt).call(this, t, e);
  }
  flush() {
    if (o(this, O) !== "batch") return;
    const t = d(this, f, pt).call(this, Array.from(o(this, G))), e = [];
    for (const s of t) {
      const r = o(this, R).get(s);
      d(this, f, Q).call(this, s);
      const n = o(this, R).get(s);
      r !== n && (e.push({ key: s, oldValue: r, newValue: n }), d(this, f, nt).call(this, s, n, r));
    }
    e.length > 0 && (o(this, B).dispatchEvent(new CustomEvent("change", { detail: e })), o(this, B).dispatchEvent(new CustomEvent("batch-complete", { detail: e })), o(this, $) && o(this, $).call(this, `Flush complete. ${e.length} colors updated.`)), o(this, G).clear();
  }
  resolve(t) {
    if (!o(this, R).has(t))
      try {
        d(this, f, Q).call(this, t);
      } catch (e) {
        return o(this, $) && o(this, $).call(this, `Failed to resolve '${t}': ${e.message}`), "invalid";
      }
    return o(this, R).get(t);
  }
  // --- UTILITY & HELPER FUNCTIONS ---
  has(t) {
    let [e, s] = t.split(".");
    const r = /* @__PURE__ */ new Set();
    for (; e; ) {
      if (r.has(e))
        throw new Y([...r, e]);
      if (r.add(e), o(this, K).has(`${e}.${s}`)) return !0;
      const n = o(this, m).get(e);
      if (!n || !n.extends) break;
      e = n.extends;
    }
    return !1;
  }
  on(t, e) {
    o(this, B).addEventListener(t, e);
  }
  watch(t, e) {
    this.on(`watch:${t}`, (s) => {
      const r = s;
      e(r.detail.newValue, r.detail.oldValue);
    });
  }
  // --- PUBLIC API FOR REFERENCES & BUILT-IN FUNCTIONS ---
  ref(t) {
    return new U(t);
  }
  // --- PUBLIC GETTERS FOR UI ---
  getAllPalettes() {
    return Array.from(o(this, m).entries()).map(([t, e]) => ({ name: t, config: e }));
  }
  getAllKeysForPalette(t) {
    return d(this, f, lt).call(this, t);
  }
  valueToString(t) {
    return d(this, f, st).call(this, t);
  }
  // Get raw value for editing (without quotes or formatting)
  getRawValue(t) {
    var e;
    if (t instanceof U) return `ref('${t.key}')`;
    if (t instanceof I) {
      const s = ((e = [...o(this, L).entries()].find(([n, c]) => c === t.fn)) == null ? void 0 : e[0]) || t.fn.name.replace("bound ", ""), r = t.args.map((n) => typeof n == "string" ? `'${n}'` : n).join(", ");
      return `${s}(${r})`;
    }
    return t;
  }
  get mode() {
    return o(this, O);
  }
  set mode(t) {
    E(this, O, t);
  }
  get batchQueueSize() {
    return o(this, G).size;
  }
  // --- DEPENDENCY ANALYSIS ---
  getDependencies(t) {
    return Array.from(o(this, S).get(t) || []);
  }
  getDependents(t) {
    return Array.from(o(this, A).get(t) || []);
  }
  getConnectionGraph() {
    const t = {};
    for (const [e, s] of o(this, S).entries())
      t[e] = Array.from(s);
    return t;
  }
  // --- RENDERER INTEGRATION METHODS ---
  // These methods provide controlled access to internal state for renderers
  getDefinitionForKey(t) {
    try {
      return d(this, f, et).call(this, t);
    } catch (e) {
      throw new F(`Failed to get definition for key '${t}': ${e.message}`);
    }
  }
  getCustomFunctions() {
    return new Map(o(this, L));
  }
  getPaletteDependencies(t) {
    const e = this.getAllKeysForPalette(t), s = /* @__PURE__ */ new Set();
    for (const r of e) {
      const n = this.getDependencies(r);
      for (const c of n)
        c.startsWith(`${t}.`) || s.add(c);
    }
    return Array.from(s);
  }
  resolvePalette(t) {
    const e = this.getAllKeysForPalette(t), s = {};
    for (const r of e) {
      const n = r.split(".").slice(1).join(".");
      s[n] = this.resolve(r);
    }
    return s;
  }
  // --- RENDERER ACCESS ---
  createRenderer(t) {
    if (!o(this, J))
      throw new Error("ColorRenderer class not injected. Please call setColorRenderer() first.");
    return new (o(this, J))(this, t);
  }
  // Method to inject ColorRenderer class to avoid circular imports
  setColorRenderer(t) {
    E(this, J, t);
  }
  // Method to set logging callback for UI integration
  setLogCallback(t) {
    E(this, $, t);
  }
}
m = new WeakMap(), K = new WeakMap(), R = new WeakMap(), A = new WeakMap(), S = new WeakMap(), O = new WeakMap(), G = new WeakMap(), B = new WeakMap(), L = new WeakMap(), J = new WeakMap(), $ = new WeakMap(), f = new WeakSet(), tt = function(t, e) {
  if (typeof e == "string" && !V(e))
    throw new F(`Invalid color value: "${e}". Must be a valid CSS color or a router function.`);
  o(this, K).set(t, e), d(this, f, ft).call(this, t, e), o(this, O) === "auto" ? d(this, f, ht).call(this, t) : o(this, G).add(t), o(this, $) && o(this, $).call(this, `Defined '${t}' = ${d(this, f, st).call(this, e)}`);
}, // --- RESOLUTION & REACTIVITY ---
ht = function(t) {
  const e = d(this, f, ut).call(this, t), s = [];
  for (const r of e) {
    const n = o(this, R).get(r);
    d(this, f, Q).call(this, r);
    const c = o(this, R).get(r);
    n !== c && (s.push({ key: r, oldValue: n, newValue: c }), d(this, f, nt).call(this, r, c, n));
  }
  s.length > 0 && o(this, B).dispatchEvent(new CustomEvent("change", { detail: s }));
}, Q = function(t, e = []) {
  if (e.includes(t)) throw new Y([...e, t]);
  const s = d(this, f, et).call(this, t);
  let r;
  return s instanceof U ? r = d(this, f, Q).call(this, s.key, [...e, t]) : s instanceof I ? r = s.execute(this) : r = d(this, f, gt).call(this, s), o(this, R).set(t, r), r;
}, et = function(t) {
  let [e, s] = t.split(".");
  const r = /* @__PURE__ */ new Set();
  for (; e; ) {
    if (r.has(e))
      throw new Y([...r, e]);
    r.add(e);
    const n = `${e}.${s}`;
    if (o(this, K).has(n)) return o(this, K).get(n);
    const c = o(this, m).get(e);
    if (!c || !c.extends) break;
    e = c.extends;
  }
  throw new F(`Color '${t}' not found in palette hierarchy.`);
}, lt = function(t) {
  const e = /* @__PURE__ */ new Set();
  let s = t;
  const r = [], n = /* @__PURE__ */ new Set();
  for (; s && !n.has(s); ) {
    n.add(s), r.unshift(s);
    const c = o(this, m).get(s);
    s = c == null ? void 0 : c.extends;
  }
  if (s && n.has(s))
    throw new Y([...n, s]);
  for (const c of r) {
    const a = `${c}.`;
    for (const h of o(this, K).keys())
      h.startsWith(a) && e.add(h.split(".").slice(1).join("."));
  }
  return Array.from(e).map((c) => `${t}.${c}`);
}, // --- DEPENDENCY GRAPH ---
ft = function(t, e) {
  var r;
  if (o(this, S).has(t))
    for (const n of o(this, S).get(t))
      (r = o(this, A).get(n)) == null || r.delete(t);
  o(this, S).set(t, /* @__PURE__ */ new Set());
  const s = d(this, f, dt).call(this, e);
  for (const n of s)
    o(this, A).has(n) || o(this, A).set(n, /* @__PURE__ */ new Set()), o(this, A).get(n).add(t), o(this, S).get(t).add(n);
}, dt = function(t) {
  return t instanceof U ? [t.key] : t instanceof I ? t.dependencies : [];
}, ut = function(t) {
  const e = /* @__PURE__ */ new Set(), s = [], r = this;
  function n(c) {
    e.has(c) || (e.add(c), (o(r, A).get(c) || []).forEach(n), s.push(c));
  }
  return n(t), s.reverse();
}, pt = function(t) {
  const e = [], s = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set(), n = this, c = (a) => {
    if (s.has(a)) return;
    if (r.has(a)) throw new Y([...r, a]);
    r.add(a);
    const h = o(n, S).get(a);
    if (h)
      for (const u of h)
        t.includes(u) && c(u);
    r.delete(a), s.add(a), e.push(a);
  };
  for (const a of t)
    if (!s.has(a))
      try {
        c(a);
      } catch (h) {
        if (h instanceof Y)
          o(this, $) && o(this, $).call(this, `Circular dependency detected for '${a}': ${h.message}`), s.has(a) || (s.add(a), e.push(a));
        else
          throw h;
      }
  return e;
}, st = function(t) {
  var e;
  if (t instanceof U) return `ref('${t.key}')`;
  if (t instanceof I) {
    const s = ((e = [...o(this, L).entries()].find(([n, c]) => c === t.fn)) == null ? void 0 : e[0]) || t.fn.name.replace("bound ", ""), r = t.args.map((n) => typeof n == "string" ? `'${n}'` : n).join(", ");
    return `${s}(${r})`;
  }
  return `'${t}'`;
}, gt = function(t) {
  const e = V(t);
  return e ? N(e) : "#00000000";
}, nt = function(t, e, s) {
  o(this, B).dispatchEvent(new CustomEvent(`watch:${t}`, {
    detail: { newValue: e, oldValue: s }
  }));
}, // Register built-in functions during construction
$t = function() {
  this.registerFunction("bestContrastWith", Mt.bind(this)), this.registerFunction("colorMix", Rt), this.registerFunction("relativeTo", _t), this.registerFunction("minContrastWith", Et), this.registerFunction("lighten", Dt), this.registerFunction("darken", Kt);
};
var b, y, X, M, rt, wt, ot, yt;
class Vt {
  constructor(t, e = "css-variables") {
    g(this, M);
    g(this, b);
    g(this, y);
    g(this, X, /* @__PURE__ */ new Map());
    E(this, b, t), E(this, y, e === "css" ? "css-variables" : e), d(this, M, rt).call(this);
  }
  // Register a custom function renderer for this format
  registerFunctionRenderer(t, e) {
    o(this, X).has(o(this, y)) || o(this, X).set(o(this, y), /* @__PURE__ */ new Map()), o(this, X).get(o(this, y)).set(t, e);
  }
  // Main render method
  render() {
    const t = /* @__PURE__ */ new Set();
    o(this, b).getAllPalettes().forEach(({ name: r }) => {
      o(this, b).getAllKeysForPalette(r).forEach((n) => t.add(n));
    });
    const e = Array.from(t).sort();
    if (o(this, y) === "json") {
      const r = {};
      for (const n of e)
        r[n] = o(this, b).resolve(n);
      return JSON.stringify(r, null, 2);
    }
    let s = "";
    for (const r of e) {
      const n = o(this, b).getDefinitionForKey(r), c = d(this, M, wt).call(this, n, r);
      o(this, y) === "css-variables" ? s += `  --${r.replace(/\./g, "-")}: ${c};
` : o(this, y) === "scss" && (s += `$${r.replace(/\./g, "-")}: ${c};
`);
    }
    return o(this, y) === "css-variables" ? `:root {
${s}}` : s;
  }
  // Get the current format
  get format() {
    return o(this, y);
  }
  // Set a new format
  set format(t) {
    E(this, y, t === "css" ? "css-variables" : t), d(this, M, rt).call(this);
  }
}
b = new WeakMap(), y = new WeakMap(), X = new WeakMap(), M = new WeakSet(), // Register built-in function renderers for different formats
rt = function() {
  const t = [
    { name: "bestContrastWith", renderers: kt },
    { name: "colorMix", renderers: St },
    { name: "relativeTo", renderers: jt },
    { name: "minContrastWith", renderers: At },
    { name: "lighten", renderers: Tt },
    { name: "darken", renderers: Lt }
  ];
  for (const { name: e, renderers: s } of t) {
    const r = s[o(this, y)];
    r && this.registerFunctionRenderer(e, r);
  }
}, // Render a color definition value (ColorReference, ColorFunction, or raw color)
wt = function(t, e) {
  return t instanceof U ? d(this, M, ot).call(this, t.key) : t instanceof I ? d(this, M, yt).call(this, t, e) : o(this, b).resolve(e);
}, // Render a color reference
ot = function(t) {
  return o(this, y) === "scss" ? `$${t.replace(/\./g, "-")}` : o(this, y) === "css-variables" ? `var(--${t.replace(/\./g, "-")})` : o(this, b).resolve(t);
}, // Render a color function
yt = function(t, e) {
  var c;
  const s = o(this, X).get(o(this, y));
  if (!s)
    return o(this, b).resolve(e);
  const r = ((c = [...o(this, b).getCustomFunctions().entries()].find(([a, h]) => h === t.fn)) == null ? void 0 : c[0]) || "unknown", n = s.get(r);
  if (!n)
    return o(this, b).resolve(e);
  try {
    const a = t.args.map((u) => typeof u == "string" && u.includes(".") && o(this, b).has(u) ? d(this, M, ot).call(this, u) : u), h = n(a);
    return h === "" ? o(this, b).resolve(e) : h;
  } catch (a) {
    return console.warn(`Failed to render function ${r}:`, a), o(this, b).resolve(e);
  }
};
const Wt = (i) => Math.sqrt(Math.pow(i.w, 2) + Math.pow(i.h, 2)), Ht = (i, t = {}) => {
  const {
    gap: e = 0,
    useMaxDiagonal: s = !0,
    padding: r = 0.2
  } = t;
  let n = [...i];
  const c = Math.max(...n.map((l) => l.h)), a = Math.max(...n.map((l) => l.w)), h = Math.max(c, a);
  let u = 0;
  n = n.map((l) => {
    const { w: W, h: j } = l, H = Math.max(W, j), z = Wt(
      s ? { w: H, h: H } : l
    );
    return u += z, l.diagonal = z, l.diagonalHalf = z / 2, l;
  });
  const p = e * (n.length - 1), v = u + p, C = Math.max(v / Math.PI, h + e * 2), x = C + a + e * 2, k = C + c + e * 2, w = {
    w: x + x * r,
    h: k + k * r,
    r: C / 2,
    centerX: 0,
    centerY: 0
  };
  w.centerX = w.w / 2, w.centerY = w.h / 2;
  const D = [];
  return n.reduce((l, W) => {
    const j = W.diagonalHalf, H = (l + j) / (v - p);
    return D.push(H), l + W.diagonal;
  }, 0), n = n.map((l, W) => {
    l.angle = 360 * D[W] % 360, l.angleRadians = l.angle * (Math.PI / 180), l.cx = w.centerX + C / 2 * Math.cos(l.angleRadians), l.cy = w.centerY + C / 2 * Math.sin(l.angleRadians);
    const j = l.cy - l.h / 2, H = l.cy + l.h / 2, z = l.cx - l.w / 2, Ct = l.cx + l.w / 2;
    return l.top = j, l.left = z, l.bottom = H, l.right = Ct, l;
  }), {
    tableItems: n,
    tableBoundingRect: w
  };
}, Ot = (i, t, e = {}) => {
  const {
    widthPerLetter: s = 7,
    fontSize: r = 10,
    lineHeight: n = 1.5,
    itemPadding: c = [10, 5]
  } = e, a = [i, ...Object.keys(t)], h = Math.max(...a.map((x) => x.length)), u = r * n + c[1] * 2, p = h * s + c[0] * 2, v = a.length * u, C = {};
  return a.forEach((x, k) => {
    const w = k * u, D = w + u / 2 + r / 2 - 1;
    C[x] = {
      rectTop: w,
      textTop: D,
      height: u
    };
  }), {
    w: p,
    h: v,
    title: i,
    colors: t,
    topPositions: C
  };
};
var _, q, P, it, bt, xt, mt, Pt, vt;
class Xt extends Vt {
  constructor(e, s = {}) {
    super(e, "json");
    g(this, P);
    g(this, _);
    g(this, q);
    E(this, q, e), E(this, _, {
      gap: 20,
      useMaxDiagonal: !0,
      padding: 0.2,
      widthPerLetter: 7,
      fontSize: 10,
      lineHeight: 1.5,
      itemPadding: [10, 5],
      showConnections: !0,
      strokeWidth: 2,
      dotRadius: 5,
      ...s
    });
  }
  /**
   * Get the router instance
   */
  get router() {
    return o(this, q);
  }
  /**
   * Main render method
   */
  render() {
    const e = this.router, s = e.getAllPalettes();
    if (s.length === 0)
      return d(this, P, it).call(this, 200, 100, '<text x="100" y="50" text-anchor="middle" font-family="monospace">No palettes defined</text>');
    const r = s.map(({ name: x }) => {
      const k = e.getAllKeysForPalette(x), w = {};
      return k.forEach((D) => {
        const l = D.split(".").slice(1).join(".");
        w[l] = e.resolve(D);
      }), Ot(x, w, o(this, _));
    }), n = Ht(r, o(this, _)), c = d(this, P, xt).call(this, n.tableItems, n.tableBoundingRect), a = d(this, P, mt).call(this, e, c), h = d(this, P, Pt).call(this, a), u = d(this, P, vt).call(this, c), p = n.tableItems.map(
      (x) => d(this, P, bt).call(this, x, x.left, x.top)
    ).join(""), C = `
      <style>
        .palette-table {
          fill: white;
          stroke: black;
          stroke-width: 1;
        }
        .palette-table__row {
          fill: none;
          stroke: black;
          stroke-width: 1;
        }
        .palette-table__row--header {
          fill: black;
        }
        text {
          font-family: monospace;
        }
        .palette-table__label {
          fill: black;
        }
        .palette-table__label--header {
          font-weight: bold;
          fill: white;
        }
        .connections-bg {
          opacity: 0.8;
        }
        .connections {
          opacity: 0.9;
        }
        .dots {
          cursor: pointer;
        }
        .dots circle:hover {
          stroke-width: 2;
          r: ${(o(this, _).dotRadius || 5) + 1};
        }
      </style>
    ` + h + `<g class="tables">${p}</g>` + u;
    return d(this, P, it).call(this, n.tableBoundingRect.w, n.tableBoundingRect.h, C);
  }
}
_ = new WeakMap(), q = new WeakMap(), P = new WeakSet(), /**
 * Create SVG element with viewBox
 */
it = function(e, s, r) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${e} ${s}">${r}</svg>`;
}, /**
 * Generate SVG group for a table item (palette)
 */
bt = function(e, s, r) {
  if (!e.title || !e.colors || !e.topPositions) return "";
  const { w: n, h: c, title: a, colors: h, topPositions: u } = e, { fontSize: p, itemPadding: v = [10, 5] } = o(this, _), x = [a, ...Object.keys(h)].map((k) => {
    const w = k === a, { rectTop: D, textTop: l, height: W } = u[k], j = w ? "" : h[k], H = `<rect class="palette-table__row ${w ? "palette-table__row--header" : ""}" width="${n}" height="${W}" y="${D}" 
        ${j ? `data-color="${j}"` : ""} />`, z = `<text class="palette-table__label ${w ? "palette-table__label--header" : ""}" x="${v[0]}" y="${l}" font-size="${p}"
        ${j ? `data-color="${j}"` : ""}>${k}</text>`;
    return H + z;
  }).join("");
  return `<g transform="translate(${s}, ${r})">
      <rect class="palette-table" width="${n}" height="${c}" />
      ${x}
    </g>`;
}, /**
 * Extract connection points from table items
 */
xt = function(e, s) {
  const r = {};
  return e.forEach((n) => {
    !n.title || !n.colors || !n.topPositions || Object.keys(n.colors).forEach((c) => {
      const a = `${n.title}.${c}`, h = n.topPositions[c], u = n.left < s.centerX, p = u ? n.left + n.w : n.left, v = h.rectTop + h.height / 2 + n.top;
      r[a] = {
        key: a,
        x: p,
        y: v,
        isLeft: u,
        color: n.colors[c] || "#000000",
        colorName: c
      };
    });
  }), r;
}, /**
 * Find connections between colors (references and function dependencies)
 */
mt = function(e, s) {
  const r = [], n = /* @__PURE__ */ new Set();
  return Object.keys(s).forEach((c) => {
    const a = e.getDependencies(c), h = s[c];
    h && a.forEach((u) => {
      const p = s[u];
      if (p) {
        const v = `${c}->${u}`, C = `${u}->${c}`;
        !n.has(v) && !n.has(C) && (r.push({ from: h, to: p }), n.add(v));
      }
    });
  }), r;
}, /**
 * Generate SVG paths for connections
 */
Pt = function(e) {
  if (!o(this, _).showConnections || e.length === 0) return "";
  const { strokeWidth: s = 2 } = o(this, _), r = e.map((c) => {
    const { from: a, to: h } = c, p = 40 + Math.abs(a.y - h.y) * 0.3;
    return `<path d="${`M ${a.x} ${a.y} C ${a.x + (a.isLeft ? p : -p)} ${a.y}, ${h.x + (h.isLeft ? p : -p)} ${h.y}, ${h.x} ${h.y}`}" stroke="#000" stroke-width="${s + 1.5}" fill="none" />`;
  }).join(""), n = e.map((c) => {
    const { from: a, to: h } = c, p = 40 + Math.abs(a.y - h.y) * 0.3;
    return `<path d="${`M ${a.x} ${a.y} C ${a.x + (a.isLeft ? p : -p)} ${a.y}, ${h.x + (h.isLeft ? p : -p)} ${h.y}, ${h.x} ${h.y}`}" stroke="${a.color}" stroke-width="${s}" fill="none" data-color="${a.color}" />`;
  }).join("");
  return `
      <g class="connections-bg">${r}</g>
      <g class="connections">${n}</g>
    `;
}, /**
 * Generate SVG dots for connection points
 */
vt = function(e) {
  const { dotRadius: s = 5 } = o(this, _);
  return `<g class="dots">${Object.values(e).map((n) => `<circle cx="${n.x}" cy="${n.y}" r="${s}" 
        fill="${n.color}" stroke="black" stroke-width="1" 
        data-color="${n.color}" data-key="${n.key}" />`).join("")}</g>`;
};
export {
  Y as CircularDependencyError,
  I as ColorFunction,
  U as ColorReference,
  Vt as ColorRenderer,
  Gt as ColorRouter,
  F as PaletteError,
  Xt as SVGRenderer,
  Ot as createTableItemFromPalette,
  Ht as tableView
};
