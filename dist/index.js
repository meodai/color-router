var ct = (d) => {
  throw TypeError(d);
};
var Z = (d, t, e) => t.has(d) || ct("Cannot " + e);
var r = (d, t, e) => (Z(d, t, "read from private field"), e ? e.call(d) : t.get(d)), g = (d, t, e) => t.has(d) ? ct("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(d) : t.set(d, e), A = (d, t, e, s) => (Z(d, t, "write to private field"), s ? s.call(d, e) : t.set(d, e), e), f = (d, t, e) => (Z(d, t, "access private method"), e);
import { parse as K, formatHex as Y, wcagContrast as L, interpolate as Ct, converter as at } from "culori";
class I {
  constructor(t) {
    this.key = t, this.type = Symbol.for("ColorReference");
  }
}
class J {
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
class C extends Error {
  constructor(t) {
    super(t), this.name = "PaletteError";
  }
}
class U extends Error {
  constructor(t) {
    super(`Circular dependency detected: ${t.join(" -> ")}`), this.path = t, this.name = "CircularDependencyError";
  }
}
var x, T, R, j, S, B, G, W, V, N, $, l, tt, ht, Q, et, lt, ft, dt, ut, pt, st, gt, nt, $t;
class At {
  constructor(t = {}) {
    g(this, l);
    g(this, x, /* @__PURE__ */ new Map());
    g(this, T, /* @__PURE__ */ new Map());
    g(this, R, /* @__PURE__ */ new Map());
    g(this, j, /* @__PURE__ */ new Map());
    g(this, S, /* @__PURE__ */ new Map());
    g(this, B, "auto");
    g(this, G, /* @__PURE__ */ new Set());
    g(this, W, new EventTarget());
    g(this, V, /* @__PURE__ */ new Map());
    g(this, N);
    g(this, $);
    A(this, B, t.mode || "auto"), f(this, l, $t).call(this);
  }
  // --- CUSTOM FUNCTIONS ---
  registerFunction(t, e) {
    if (this[t] || t === "ref" || t === "func")
      throw new C(`Function name "${t}" is reserved.`);
    r(this, V).set(t, e), r(this, $) && r(this, $).call(this, `Registered function '${t}'.`);
  }
  func(t, ...e) {
    if (!r(this, V).has(t))
      throw new C(`Custom function "${t}" is not registered.`);
    const s = r(this, V).get(t), o = e.filter((n) => typeof n == "string" && n.includes("."));
    return new J(s, e, o);
  }
  // --- PALETTE MANAGEMENT ---
  createPalette(t, e = {}) {
    const { extends: s, overrides: o = {} } = e;
    if (r(this, x).has(t)) throw new C(`Palette "${t}" already exists.`);
    if (s && !r(this, x).has(s))
      throw new C(`Base palette "${s}" does not exist.`);
    if (r(this, x).set(t, { extends: s, overrides: o }), r(this, $) && r(this, $).call(this, `Palette '${t}' created${s ? ` extending '${s}'` : ""}.`), s && Object.keys(o).length > 0)
      for (const [n, i] of Object.entries(o))
        this.define(`${t}.${n}`, i);
  }
  extendPalette(t, e, s = {}) {
    return this.createPalette(t, { extends: e, overrides: s });
  }
  copyPalette(t, e) {
    if (!r(this, x).has(t))
      throw new C(`Source palette "${t}" does not exist.`);
    if (r(this, x).has(e))
      throw new C(`Target palette "${e}" already exists.`);
    const s = this.getAllKeysForPalette(t);
    this.createPalette(e);
    for (const o of s) {
      const n = o.split(".").slice(1).join("."), i = this.getDefinitionForKey(o);
      this.define(`${e}.${n}`, i);
    }
    r(this, $) && r(this, $).call(this, `Copied palette '${t}' to '${e}'.`);
  }
  deletePalette(t) {
    if (!r(this, x).has(t)) throw new C(`Palette "${t}" does not exist.`);
    const e = this.getAllKeysForPalette(t);
    for (const s of e)
      r(this, T).delete(s), r(this, R).delete(s), r(this, j).delete(s), r(this, S).delete(s);
    r(this, x).delete(t), r(this, $) && r(this, $).call(this, `Deleted palette '${t}'.`);
  }
  // --- COLOR DEFINITION & MODIFICATION ---
  define(t, e) {
    const [s] = t.split(".");
    if (!r(this, x).has(s))
      throw new C(`Palette "${s}" does not exist. Create it first.`);
    f(this, l, tt).call(this, t, e);
  }
  set(t, e) {
    if (!this.has(t)) throw new C(`Color "${t}" is not defined. Use .define() first.`);
    f(this, l, tt).call(this, t, e);
  }
  flush() {
    if (r(this, B) !== "batch") return;
    const t = f(this, l, pt).call(this, Array.from(r(this, G))), e = [];
    for (const s of t) {
      const o = r(this, R).get(s);
      f(this, l, Q).call(this, s);
      const n = r(this, R).get(s);
      o !== n && (e.push({ key: s, oldValue: o, newValue: n }), f(this, l, nt).call(this, s, n, o));
    }
    e.length > 0 && (r(this, W).dispatchEvent(new CustomEvent("change", { detail: e })), r(this, W).dispatchEvent(new CustomEvent("batch-complete", { detail: e })), r(this, $) && r(this, $).call(this, `Flush complete. ${e.length} colors updated.`)), r(this, G).clear();
  }
  resolve(t) {
    if (!r(this, R).has(t))
      try {
        f(this, l, Q).call(this, t);
      } catch (e) {
        return r(this, $) && r(this, $).call(this, `Failed to resolve '${t}': ${e.message}`), "invalid";
      }
    return r(this, R).get(t);
  }
  // --- UTILITY & HELPER FUNCTIONS ---
  has(t) {
    let [e, s] = t.split(".");
    const o = /* @__PURE__ */ new Set();
    for (; e; ) {
      if (o.has(e))
        throw new U([...o, e]);
      if (o.add(e), r(this, T).has(`${e}.${s}`)) return !0;
      const n = r(this, x).get(e);
      if (!n || !n.extends) break;
      e = n.extends;
    }
    return !1;
  }
  on(t, e) {
    r(this, W).addEventListener(t, e);
  }
  watch(t, e) {
    this.on(`watch:${t}`, (s) => {
      const o = s;
      e(o.detail.newValue, o.detail.oldValue);
    });
  }
  // --- PUBLIC API FOR REFERENCES & BUILT-IN FUNCTIONS ---
  ref(t) {
    return new I(t);
  }
  // --- PUBLIC GETTERS FOR UI ---
  getAllPalettes() {
    return Array.from(r(this, x).entries()).map(([t, e]) => ({ name: t, config: e }));
  }
  getAllKeysForPalette(t) {
    return f(this, l, lt).call(this, t);
  }
  valueToString(t) {
    return f(this, l, st).call(this, t);
  }
  // Get raw value for editing (without quotes or formatting)
  getRawValue(t) {
    var e;
    if (t instanceof I) return `ref('${t.key}')`;
    if (t instanceof J) {
      const s = ((e = [...r(this, V).entries()].find(([n, i]) => i === t.fn)) == null ? void 0 : e[0]) || t.fn.name.replace("bound ", ""), o = t.args.map((n) => typeof n == "string" ? `'${n}'` : n).join(", ");
      return `${s}(${o})`;
    }
    return t;
  }
  get mode() {
    return r(this, B);
  }
  set mode(t) {
    A(this, B, t);
  }
  get batchQueueSize() {
    return r(this, G).size;
  }
  // --- DEPENDENCY ANALYSIS ---
  getDependencies(t) {
    return Array.from(r(this, S).get(t) || []);
  }
  getDependents(t) {
    return Array.from(r(this, j).get(t) || []);
  }
  getConnectionGraph() {
    const t = {};
    for (const [e, s] of r(this, S).entries())
      t[e] = Array.from(s);
    return t;
  }
  // --- RENDERER INTEGRATION METHODS ---
  // These methods provide controlled access to internal state for renderers
  getDefinitionForKey(t) {
    try {
      return f(this, l, et).call(this, t);
    } catch (e) {
      throw new C(`Failed to get definition for key '${t}': ${e.message}`);
    }
  }
  getCustomFunctions() {
    return new Map(r(this, V));
  }
  getPaletteDependencies(t) {
    const e = this.getAllKeysForPalette(t), s = /* @__PURE__ */ new Set();
    for (const o of e) {
      const n = this.getDependencies(o);
      for (const i of n)
        i.startsWith(`${t}.`) || s.add(i);
    }
    return Array.from(s);
  }
  resolvePalette(t) {
    const e = this.getAllKeysForPalette(t), s = {};
    for (const o of e) {
      const n = o.split(".").slice(1).join(".");
      s[n] = this.resolve(o);
    }
    return s;
  }
  // --- RENDERER ACCESS ---
  createRenderer(t) {
    if (!r(this, N))
      throw new Error("ColorRenderer class not injected. Please call setColorRenderer() first.");
    return new (r(this, N))(this, t);
  }
  // Method to inject ColorRenderer class to avoid circular imports
  setColorRenderer(t) {
    A(this, N, t);
  }
  // Method to set logging callback for UI integration
  setLogCallback(t) {
    A(this, $, t);
  }
}
x = new WeakMap(), T = new WeakMap(), R = new WeakMap(), j = new WeakMap(), S = new WeakMap(), B = new WeakMap(), G = new WeakMap(), W = new WeakMap(), V = new WeakMap(), N = new WeakMap(), $ = new WeakMap(), l = new WeakSet(), tt = function(t, e) {
  if (typeof e == "string" && !K(e))
    throw new C(`Invalid color value: "${e}". Must be a valid CSS color or a router function.`);
  r(this, T).set(t, e), f(this, l, ft).call(this, t, e), r(this, B) === "auto" ? f(this, l, ht).call(this, t) : r(this, G).add(t), r(this, $) && r(this, $).call(this, `Defined '${t}' = ${f(this, l, st).call(this, e)}`);
}, // --- RESOLUTION & REACTIVITY ---
ht = function(t) {
  const e = f(this, l, ut).call(this, t), s = [];
  for (const o of e) {
    const n = r(this, R).get(o);
    f(this, l, Q).call(this, o);
    const i = r(this, R).get(o);
    n !== i && (s.push({ key: o, oldValue: n, newValue: i }), f(this, l, nt).call(this, o, i, n));
  }
  s.length > 0 && r(this, W).dispatchEvent(new CustomEvent("change", { detail: s }));
}, Q = function(t, e = []) {
  if (e.includes(t)) throw new U([...e, t]);
  const s = f(this, l, et).call(this, t);
  let o;
  return s instanceof I ? o = f(this, l, Q).call(this, s.key, [...e, t]) : s instanceof J ? o = s.execute(this) : o = f(this, l, gt).call(this, s), r(this, R).set(t, o), o;
}, et = function(t) {
  let [e, s] = t.split(".");
  const o = /* @__PURE__ */ new Set();
  for (; e; ) {
    if (o.has(e))
      throw new U([...o, e]);
    o.add(e);
    const n = `${e}.${s}`;
    if (r(this, T).has(n)) return r(this, T).get(n);
    const i = r(this, x).get(e);
    if (!i || !i.extends) break;
    e = i.extends;
  }
  throw new C(`Color '${t}' not found in palette hierarchy.`);
}, lt = function(t) {
  const e = /* @__PURE__ */ new Set();
  let s = t;
  const o = [], n = /* @__PURE__ */ new Set();
  for (; s && !n.has(s); ) {
    n.add(s), o.unshift(s);
    const i = r(this, x).get(s);
    s = i == null ? void 0 : i.extends;
  }
  if (s && n.has(s))
    throw new U([...n, s]);
  for (const i of o) {
    const c = `${i}.`;
    for (const a of r(this, T).keys())
      a.startsWith(c) && e.add(a.split(".").slice(1).join("."));
  }
  return Array.from(e).map((i) => `${t}.${i}`);
}, // --- DEPENDENCY GRAPH ---
ft = function(t, e) {
  var o;
  if (r(this, S).has(t))
    for (const n of r(this, S).get(t))
      (o = r(this, j).get(n)) == null || o.delete(t);
  r(this, S).set(t, /* @__PURE__ */ new Set());
  const s = f(this, l, dt).call(this, e);
  for (const n of s)
    r(this, j).has(n) || r(this, j).set(n, /* @__PURE__ */ new Set()), r(this, j).get(n).add(t), r(this, S).get(t).add(n);
}, dt = function(t) {
  return t instanceof I ? [t.key] : t instanceof J ? t.dependencies : [];
}, ut = function(t) {
  const e = /* @__PURE__ */ new Set(), s = [], o = this;
  function n(i) {
    e.has(i) || (e.add(i), (r(o, j).get(i) || []).forEach(n), s.push(i));
  }
  return n(t), s.reverse();
}, pt = function(t) {
  const e = [], s = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), n = this, i = (c) => {
    if (s.has(c)) return;
    if (o.has(c)) throw new U([...o, c]);
    o.add(c);
    const a = r(n, S).get(c);
    if (a)
      for (const u of a)
        t.includes(u) && i(u);
    o.delete(c), s.add(c), e.push(c);
  };
  for (const c of t)
    if (!s.has(c))
      try {
        i(c);
      } catch (a) {
        if (a instanceof U)
          r(this, $) && r(this, $).call(this, `Circular dependency detected for '${c}': ${a.message}`), s.has(c) || (s.add(c), e.push(c));
        else
          throw a;
      }
  return e;
}, st = function(t) {
  var e;
  if (t instanceof I) return `ref('${t.key}')`;
  if (t instanceof J) {
    const s = ((e = [...r(this, V).entries()].find(([n, i]) => i === t.fn)) == null ? void 0 : e[0]) || t.fn.name.replace("bound ", ""), o = t.args.map((n) => typeof n == "string" ? `'${n}'` : n).join(", ");
    return `${s}(${o})`;
  }
  return `'${t}'`;
}, gt = function(t) {
  const e = K(t);
  return e ? Y(e) : "#00000000";
}, nt = function(t, e, s) {
  r(this, W).dispatchEvent(new CustomEvent(`watch:${t}`, {
    detail: { newValue: e, oldValue: s }
  }));
}, // Register built-in functions during construction
$t = function() {
  this.registerFunction("bestContrastWith", (t, e) => {
    if (!K(t)) return "#000000";
    if (!e)
      return L("#fff", t) >= L("#000", t) ? "#ffffff" : "#000000";
    if (!r(this, x).has(e))
      return console.warn(`Palette "${e}" not found, falling back to black/white`), L("#fff", t) >= L("#000", t) ? "#ffffff" : "#000000";
    const s = this.getAllKeysForPalette(e);
    if (s.length === 0)
      return console.warn(`Palette "${e}" has no colors, falling back to black/white`), L("#fff", t) >= L("#000", t) ? "#ffffff" : "#000000";
    let o = null, n = 0;
    for (const i of s)
      try {
        const c = this.resolve(i);
        if (c && c !== "invalid") {
          const a = L(c, t);
          a > n && (n = a, o = c);
        }
      } catch {
        continue;
      }
    if (o)
      return o;
    for (const i of s)
      try {
        const c = this.resolve(i);
        if (c && c !== "invalid")
          return c;
      } catch {
        continue;
      }
    return "#000000";
  }), this.registerFunction("colorMix", (t, e, s = "50%", o = "lab") => {
    try {
      const n = K(t), i = K(e);
      if (!n || !i) return t;
      const c = Ct([n, i], o), a = parseFloat(s) / 100;
      return Y(c(a));
    } catch {
      return t;
    }
  }), this.registerFunction("relativeTo", (t, e) => {
    try {
      const s = K(t);
      if (!s) return t;
      if (e.includes("/ 0.8")) {
        const o = { ...s, alpha: 0.8 };
        return Y(o);
      }
      return Y(s);
    } catch {
      return t;
    }
  }), this.registerFunction("minContrastWith", (t, e = 1.5) => {
    if (!K(t)) return "#000000";
    const s = L("#fff", t), o = L("#000", t);
    return s >= e ? "#ffffff" : o >= e ? "#000000" : s >= o ? "#ffffff" : "#000000";
  }), this.registerFunction("lighten", (t, e) => {
    try {
      const s = K(t);
      if (!s) return t;
      const n = at("hsl")(s);
      return n && typeof n.l == "number" ? (n.l = Math.min(1, n.l + e), Y(n)) : t;
    } catch {
      return t;
    }
  }), this.registerFunction("darken", (t, e) => {
    try {
      const s = K(t);
      if (!s) return t;
      const n = at("hsl")(s);
      return n && typeof n.l == "number" ? (n.l = Math.max(0, n.l - e), Y(n)) : t;
    } catch {
      return t;
    }
  });
};
var P, y, X, M, ot, wt, rt, yt;
class Mt {
  constructor(t, e = "css-variables") {
    g(this, M);
    g(this, P);
    g(this, y);
    g(this, X, /* @__PURE__ */ new Map());
    A(this, P, t), A(this, y, e === "css" ? "css-variables" : e), f(this, M, ot).call(this);
  }
  // Register a custom function renderer for this format
  registerFunctionRenderer(t, e) {
    r(this, X).has(r(this, y)) || r(this, X).set(r(this, y), /* @__PURE__ */ new Map()), r(this, X).get(r(this, y)).set(t, e);
  }
  // Main render method
  render() {
    const t = /* @__PURE__ */ new Set();
    r(this, P).getAllPalettes().forEach(({ name: o }) => {
      r(this, P).getAllKeysForPalette(o).forEach((n) => t.add(n));
    });
    const e = Array.from(t).sort();
    if (r(this, y) === "json") {
      const o = {};
      for (const n of e)
        o[n] = r(this, P).resolve(n);
      return JSON.stringify(o, null, 2);
    }
    let s = "";
    for (const o of e) {
      const n = r(this, P).getDefinitionForKey(o), i = f(this, M, wt).call(this, n, o);
      r(this, y) === "css-variables" ? s += `  --${o.replace(/\./g, "-")}: ${i};
` : r(this, y) === "scss" && (s += `$${o.replace(/\./g, "-")}: ${i};
`);
    }
    return r(this, y) === "css-variables" ? `:root {
${s}}` : s;
  }
  // Get the current format
  get format() {
    return r(this, y);
  }
  // Set a new format
  set format(t) {
    A(this, y, t === "css" ? "css-variables" : t), f(this, M, ot).call(this);
  }
}
P = new WeakMap(), y = new WeakMap(), X = new WeakMap(), M = new WeakSet(), // Register built-in function renderers for different formats
ot = function() {
  this.registerFunctionRenderer("colorMix", (t) => {
    const [e, s, o = "50%", n = "lab"] = t, c = 100 - (o.includes("%") ? parseFloat(o) : parseFloat(o) * 100);
    return `color-mix(in ${n}, ${e} ${c}%, ${s})`;
  }), this.registerFunctionRenderer("lighten", (t) => {
    const [e, s] = t, o = Math.round(parseFloat(s) * 100);
    return `color-mix(in oklch, ${e} ${100 - o}%, white)`;
  }), this.registerFunctionRenderer("darken", (t) => {
    const [e, s] = t, o = Math.round(parseFloat(s) * 100);
    return `color-mix(in oklch, ${e} ${100 - o}%, black)`;
  }), r(this, y) === "scss" && (this.registerFunctionRenderer("lighten", (t) => {
    const [e, s] = t, o = Math.round(parseFloat(s) * 100);
    return `lighten(${e}, ${o}%)`;
  }), this.registerFunctionRenderer("darken", (t) => {
    const [e, s] = t, o = Math.round(parseFloat(s) * 100);
    return `darken(${e}, ${o}%)`;
  }), this.registerFunctionRenderer("colorMix", (t) => {
    const [e, s, o = "50%"] = t, n = o.includes("%") ? parseFloat(o) : parseFloat(o) * 100;
    return `mix(${s}, ${e}, ${n}%)`;
  }));
}, // Render a color definition value (ColorReference, ColorFunction, or raw color)
wt = function(t, e) {
  return t instanceof I ? f(this, M, rt).call(this, t.key) : t instanceof J ? f(this, M, yt).call(this, t, e) : r(this, P).resolve(e);
}, // Render a color reference
rt = function(t) {
  return r(this, y) === "scss" ? `$${t.replace(/\./g, "-")}` : r(this, y) === "css-variables" ? `var(--${t.replace(/\./g, "-")})` : r(this, P).resolve(t);
}, // Render a color function
yt = function(t, e) {
  var i;
  const s = r(this, X).get(r(this, y));
  if (!s)
    return r(this, P).resolve(e);
  const o = ((i = [...r(this, P).getCustomFunctions().entries()].find(([c, a]) => a === t.fn)) == null ? void 0 : i[0]) || "unknown", n = s.get(o);
  if (!n)
    return r(this, P).resolve(e);
  try {
    const c = t.args.map((a) => typeof a == "string" && a.includes(".") && r(this, P).has(a) ? f(this, M, rt).call(this, a) : a);
    return n(c);
  } catch (c) {
    return console.warn(`Failed to render function ${o}:`, c), r(this, P).resolve(e);
  }
};
const kt = (d) => Math.sqrt(Math.pow(d.w, 2) + Math.pow(d.h, 2)), Rt = (d, t = {}) => {
  const {
    gap: e = 0,
    useMaxDiagonal: s = !0,
    padding: o = 0.2
  } = t;
  let n = [...d];
  const i = Math.max(...n.map((h) => h.h)), c = Math.max(...n.map((h) => h.w)), a = Math.max(i, c);
  let u = 0;
  n = n.map((h) => {
    const { w: H, h: D } = h, O = Math.max(H, D), z = kt(
      s ? { w: O, h: O } : h
    );
    return u += z, h.diagonal = z, h.diagonalHalf = z / 2, h;
  });
  const p = e * (n.length - 1), F = u + p, v = Math.max(F / Math.PI, a + e * 2), b = v + c + e * 2, k = v + i + e * 2, w = {
    w: b + b * o,
    h: k + k * o,
    r: v / 2,
    centerX: 0,
    centerY: 0
  };
  w.centerX = w.w / 2, w.centerY = w.h / 2;
  const _ = [];
  return n.reduce((h, H) => {
    const D = H.diagonalHalf, O = (h + D) / (F - p);
    return _.push(O), h + H.diagonal;
  }, 0), n = n.map((h, H) => {
    h.angle = 360 * _[H] % 360, h.angleRadians = h.angle * (Math.PI / 180), h.cx = w.centerX + v / 2 * Math.cos(h.angleRadians), h.cy = w.centerY + v / 2 * Math.sin(h.angleRadians);
    const D = h.cy - h.h / 2, O = h.cy + h.h / 2, z = h.cx - h.w / 2, vt = h.cx + h.w / 2;
    return h.top = D, h.left = z, h.bottom = O, h.right = vt, h;
  }), {
    tableItems: n,
    tableBoundingRect: w
  };
}, St = (d, t, e = {}) => {
  const {
    widthPerLetter: s = 7,
    fontSize: o = 10,
    lineHeight: n = 1.5,
    itemPadding: i = [10, 5]
  } = e, c = [d, ...Object.keys(t)], a = Math.max(...c.map((b) => b.length)), u = o * n + i[1] * 2, p = a * s + i[0] * 2, F = c.length * u, v = {};
  return c.forEach((b, k) => {
    const w = k * u, _ = w + u / 2 + o / 2 - 1;
    v[b] = {
      rectTop: w,
      textTop: _,
      height: u
    };
  }), {
    w: p,
    h: F,
    title: d,
    colors: t,
    topPositions: v
  };
};
var E, q, m, it, xt, bt, Pt, mt, Ft;
class jt extends Mt {
  constructor(e, s = {}) {
    super(e, "json");
    g(this, m);
    g(this, E);
    g(this, q);
    A(this, q, e), A(this, E, {
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
    return r(this, q);
  }
  /**
   * Main render method
   */
  render() {
    const e = this.router, s = e.getAllPalettes();
    if (s.length === 0)
      return f(this, m, it).call(this, 200, 100, '<text x="100" y="50" text-anchor="middle" font-family="monospace">No palettes defined</text>');
    const o = s.map(({ name: b }) => {
      const k = e.getAllKeysForPalette(b), w = {};
      return k.forEach((_) => {
        const h = _.split(".").slice(1).join(".");
        w[h] = e.resolve(_);
      }), St(b, w, r(this, E));
    }), n = Rt(o, r(this, E)), i = f(this, m, bt).call(this, n.tableItems, n.tableBoundingRect), c = f(this, m, Pt).call(this, e, i), a = f(this, m, mt).call(this, c), u = f(this, m, Ft).call(this, i), p = n.tableItems.map(
      (b) => f(this, m, xt).call(this, b, b.left, b.top)
    ).join(""), v = `
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
          r: ${(r(this, E).dotRadius || 5) + 1};
        }
      </style>
    ` + a + `<g class="tables">${p}</g>` + u;
    return f(this, m, it).call(this, n.tableBoundingRect.w, n.tableBoundingRect.h, v);
  }
}
E = new WeakMap(), q = new WeakMap(), m = new WeakSet(), /**
 * Create SVG element with viewBox
 */
it = function(e, s, o) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${e} ${s}">${o}</svg>`;
}, /**
 * Generate SVG group for a table item (palette)
 */
xt = function(e, s, o) {
  if (!e.title || !e.colors || !e.topPositions) return "";
  const { w: n, h: i, title: c, colors: a, topPositions: u } = e, { fontSize: p, itemPadding: F = [10, 5] } = r(this, E), b = [c, ...Object.keys(a)].map((k) => {
    const w = k === c, { rectTop: _, textTop: h, height: H } = u[k], D = w ? "" : a[k], O = `<rect class="palette-table__row ${w ? "palette-table__row--header" : ""}" width="${n}" height="${H}" y="${_}" 
        ${D ? `data-color="${D}"` : ""} />`, z = `<text class="palette-table__label ${w ? "palette-table__label--header" : ""}" x="${F[0]}" y="${h}" font-size="${p}"
        ${D ? `data-color="${D}"` : ""}>${k}</text>`;
    return O + z;
  }).join("");
  return `<g transform="translate(${s}, ${o})">
      <rect class="palette-table" width="${n}" height="${i}" />
      ${b}
    </g>`;
}, /**
 * Extract connection points from table items
 */
bt = function(e, s) {
  const o = {};
  return e.forEach((n) => {
    !n.title || !n.colors || !n.topPositions || Object.keys(n.colors).forEach((i) => {
      const c = `${n.title}.${i}`, a = n.topPositions[i], u = n.left < s.centerX, p = u ? n.left + n.w : n.left, F = a.rectTop + a.height / 2 + n.top;
      o[c] = {
        key: c,
        x: p,
        y: F,
        isLeft: u,
        color: n.colors[i] || "#000000",
        colorName: i
      };
    });
  }), o;
}, /**
 * Find connections between colors (references and function dependencies)
 */
Pt = function(e, s) {
  const o = [], n = /* @__PURE__ */ new Set();
  return Object.keys(s).forEach((i) => {
    const c = e.getDependencies(i), a = s[i];
    a && c.forEach((u) => {
      const p = s[u];
      if (p) {
        const F = `${i}->${u}`, v = `${u}->${i}`;
        !n.has(F) && !n.has(v) && (o.push({ from: a, to: p }), n.add(F));
      }
    });
  }), o;
}, /**
 * Generate SVG paths for connections
 */
mt = function(e) {
  if (!r(this, E).showConnections || e.length === 0) return "";
  const { strokeWidth: s = 2 } = r(this, E), o = e.map((i) => {
    const { from: c, to: a } = i, p = 40 + Math.abs(c.y - a.y) * 0.3;
    return `<path d="${`M ${c.x} ${c.y} C ${c.x + (c.isLeft ? p : -p)} ${c.y}, ${a.x + (a.isLeft ? p : -p)} ${a.y}, ${a.x} ${a.y}`}" stroke="#000" stroke-width="${s + 1.5}" fill="none" />`;
  }).join(""), n = e.map((i) => {
    const { from: c, to: a } = i, p = 40 + Math.abs(c.y - a.y) * 0.3;
    return `<path d="${`M ${c.x} ${c.y} C ${c.x + (c.isLeft ? p : -p)} ${c.y}, ${a.x + (a.isLeft ? p : -p)} ${a.y}, ${a.x} ${a.y}`}" stroke="${c.color}" stroke-width="${s}" fill="none" data-color="${c.color}" />`;
  }).join("");
  return `
      <g class="connections-bg">${o}</g>
      <g class="connections">${n}</g>
    `;
}, /**
 * Generate SVG dots for connection points
 */
Ft = function(e) {
  const { dotRadius: s = 5 } = r(this, E);
  return `<g class="dots">${Object.values(e).map((n) => `<circle cx="${n.x}" cy="${n.y}" r="${s}" 
        fill="${n.color}" stroke="black" stroke-width="1" 
        data-color="${n.color}" data-key="${n.key}" />`).join("")}</g>`;
};
export {
  U as CircularDependencyError,
  J as ColorFunction,
  I as ColorReference,
  Mt as ColorRenderer,
  At as ColorRouter,
  C as PaletteError,
  jt as SVGRenderer,
  St as createTableItemFromPalette,
  Rt as tableView
};
