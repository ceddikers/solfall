// Solfall - shared constants and maths helpers.
'use strict';

const G = window.G = {};

G.VERSION = '1.9b';
G.bgK = 1; // how many pixels per unit the painted backdrops are kept at (set in game.js, resize)
G.W = 1280;          // logical view size
G.H = 720;
G.FLOOR = 612;       // y of the arena floor surface
G.WALL_L = 36;       // inner faces of the arena walls
G.WALL_R = 1244;
G.TAU = Math.PI * 2;

G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
G.lerp = (a, b, t) => a + (b - a) * t;
// Frame-rate independent smoothing towards a target.
G.damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
G.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
G.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

// Visual randomness (particles and so on).
G.rand = (a, b) => a + Math.random() * (b - a);
G.pick = (arr) => arr[(Math.random() * arr.length) | 0];

// Seedable randomness for gameplay decisions, so a run can be replayed from a seed later.
G.seed = function (s) {
  let a = s >>> 0;
  G.rng = function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
G.seed((Date.now() ^ (Math.random() * 1e9)) >>> 0);
G.rrand = (a, b) => a + G.rng() * (b - a);
G.rpick = (arr) => arr[(G.rng() * arr.length) | 0];
G.shuffle = function (arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (G.rng() * (i + 1)) | 0;
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
};

G.ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  inBack: (t) => { const c = 1.70158; return (c + 1) * t * t * t - c * t * t; },
};

// Shortest signed difference between two angles.
G.angDiff = function (a, b) {
  let d = (b - a) % G.TAU;
  if (d > Math.PI) d -= G.TAU;
  if (d < -Math.PI) d += G.TAU;
  return d;
};

// Distance from a point to a line segment.
G.distPointSeg = function (px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = G.clamp(t, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};

// Rectangles here are centre + half extents: {cx, cy, hw, hh}.
G.rectsOverlap = (a, b) =>
  Math.abs(a.cx - b.cx) < a.hw + b.hw && Math.abs(a.cy - b.cy) < a.hh + b.hh;

G.circleRect = function (cx, cy, r, b) {
  const nx = G.clamp(cx, b.cx - b.hw, b.cx + b.hw);
  const ny = G.clamp(cy, b.cy - b.hh, b.cy + b.hh);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
};

// Colours are 'r,g,b' strings so alpha can be applied cheaply.
G.rgba = (c, a) => 'rgba(' + c + ',' + a + ')';

G.COL = {
  star: '150,225,255',     // the hero's light
  starHot: '235,250,255',
  danger: '255,96,56',     // telegraphs
  white: '255,255,255',
};

// Rounded rectangle path helper.
G.roundRect = function (ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

// Generator helpers used to script boss attacks. Each generator receives the frame's dt from yield.
G.seq = {
  wait: function* (t) {
    let e = 0;
    while (e < t) e += yield;
  },
  tween: function* (obj, props, dur, ease) {
    ease = ease || G.ease.inOutCubic;
    const from = {};
    for (const k in props) from[k] = obj[k];
    let e = 0;
    while (e < dur) {
      e += yield;
      const k = ease(G.clamp(e / dur, 0, 1));
      for (const p in props) obj[p] = G.lerp(from[p], props[p], k);
    }
    for (const p in props) obj[p] = props[p];
  },
  par: function* (...gens) {
    let alive = gens;
    while (alive.length) {
      const dt = yield;
      alive = alive.filter((g) => !g.next(dt).done);
    }
  },
};

// Persistent settings and records.
G.store = {
  load(key, fallback) {
    try {
      const v = localStorage.getItem('solfall.' + key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  save(key, value) {
    try { localStorage.setItem('solfall.' + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  },
};

G.settings = Object.assign(
  { music: 0.55, sfx: 0.8, shake: 1, flash: 1, numbers: true, polish: true, difficulty: 1, hints: true, firstFoe: 'random', keys: null },
  G.store.load('settings', {})
);
G.saveSettings = () => G.store.save('settings', G.settings);

// Difficulty tuning: tele scales telegraph time, pace scales the gaps between attacks.
G.DIFFS = [
  { name: 'Gentle', hp: 7, bossHp: 0.85, tele: 1.3, pace: 1.3, stagger: 4.8 },
  { name: 'Standard', hp: 5, bossHp: 1.0, tele: 1.0, pace: 1.0, stagger: 4.0 },
  { name: 'Merciless', hp: 4, bossHp: 1.15, tele: 0.8, pace: 0.7, stagger: 3.2 },
];
G.diff = () => G.DIFFS[G.settings.difficulty] || G.DIFFS[1];
