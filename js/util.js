// Solfall - shared constants and maths helpers.
'use strict';

const G = window.G = {};

G.VERSION = '3.1j';
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
    if (key === 'asc') G.ascMemo = null;
    if (key === 'sol') G.solMemo = null; // (v3.0e: who has beaten Sol: their second weapon) // (v3.0d: the Ascension ladders are read every frame from a copy)
    try { localStorage.setItem('solfall.' + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  },
};

G.settings = Object.assign(
  { music: 0.55, sfx: 0.8, shake: 1, flash: 1, numbers: true, polish: true, difficulty: 1, hints: true, firstFoe: 'random', keys: null },
  G.store.load('settings', {})
);
G.saveSettings = () => G.store.save('settings', G.settings);

// Difficulty tuning: tele scales telegraph time, pace scales the gaps between attacks.
// G.POISE scales every boss's stagger bar (v2.9l: 2, was 1); Kairo's Gathered Sun bar is its own.
G.POISE = 2;
G.DIFFS = [
  { name: 'Gentle', hp: 7, bossHp: 1.425, tele: 1.1, pace: 1.0, stagger: 4.8 }, // (v2.9l: bossHp 0.95; v2.9j: bossHp 0.85; v2.9i: tele 1.3, pace 1.3)
  { name: 'Standard', hp: 5, bossHp: 1.8, tele: 0.9, pace: 0.8, stagger: 4.0 }, // (v2.9l: bossHp 1.2; v2.9j: bossHp 1.1; v2.9i: tele 0.95, pace 0.9; v2.9h: bossHp 1.0, tele 1.0, pace 1.0)
  { name: 'Merciless', hp: 4, bossHp: 1.875, tele: 0.8, pace: 0.7, stagger: 3.2 }, // (v2.9l: bossHp 1.25; v2.9j: bossHp 1.15)
];
G.diff = () => G.DIFFS[G.settings.difficulty] || G.DIFFS[1];
// (v3.0c) Ascension: five steps above Merciless, a ladder for each hero, opened by beating Sol on Merciless
// and climbed by beating her on the step below. Difficulty 3..7 is Ascension +1..+5, and each step keeps
// everything below it:
//   +1 Quickened      warnings 15% shorter, 10% less rest between attacks
//   +2 Hardened       bosses 15% more health, a stagger bar 25% longer, staggers 20% shorter
//   +3 Their own way  each boss fights one way of its own harder (G.twist(), in each boss's file)
//   +4 Lean road      two boons offered instead of three, 25% fewer Motes, the merchant 25% dearer
//   +5 Ill omens      an omen on every trial, two from trial IV
G.ASC = [null,
  { name: 'Quickened', note: 'Merciless, with shorter warnings and less rest' },
  { name: 'Hardened', note: 'bosses have more health and a longer stagger bar' },
  { name: 'Their own way', note: 'each boss fights one of its own ways harder' },
  { name: 'Lean road', note: 'two boons offered, fewer Motes, a dearer merchant' },
  { name: 'Ill omens', note: 'an omen every trial, two from trial IV' }];
for (let n = 1; n <= 5; n++) {
  const m = G.DIFFS[2];
  G.DIFFS[2 + n] = Object.assign({}, m, {
    name: 'Ascension +' + n, asc: n,
    tele: m.tele * 0.85, pace: m.pace * 0.9,
    bossHp: m.bossHp * (n >= 2 ? 1.15 : 1), poise: n >= 2 ? 1.25 : 1, stagger: m.stagger * (n >= 2 ? 0.8 : 1),
    motes: n >= 4 ? 0.75 : 1, shop: n >= 4 ? 1.25 : 1, lean: n >= 4, omens: n >= 5,
  });
}
G.ascLevel = (d) => (G.DIFFS[d == null ? G.settings.difficulty : d] || {}).asc || 0;
G.twist = () => G.ascLevel() >= 3;
// each hero's ladder: { open: the highest step open (0: none yet), best: the highest step beaten }
G.ascOf = (hero) => (G.ascMemo || (G.ascMemo = G.store.load('asc', {}) || {}))[hero || G.settings.hero] || { open: 0, best: 0 };
// (v3.0d) What each step beaten unlocks for that hero (the first time):
//   +1 the Ascendant costume (costumes.js)      +2 their own relic (relics.js)
//   +3 a third item slot (motes.js)             +4 their own boon (run.js)
//   +5 a golden aura, the title "The Unfallen", and a star over their alcove in the Hall
G.ASC_UNLOCKS = [null, 'costume', 'relic', 'slot', 'boon', 'aura'];
G.ascBest = (hero) => G.ascOf(hero).best || 0;
// (v3.0e) boons built on a weapon or special a hero's second form does not have are not offered with it
G.BOON_NEED = { split: 'lance', pinlance: 'lance', twinstar: 'lance', aftershock: 'starfall', starborn: 'starfall', quiver: 'burst', harvest: 'burst', hanging: 'draw', secondsun: 'draw', fault: 'charge', unbroken: 'charge' };
G.heroCan = (need) => { const h = G.hero(); return need === 'draw' ? !!h.draw : need === 'charge' ? !!h.heavy : h.special === need; };
G.boonOpen = (b) => (!b.asc || G.ascBest(G.run.hero) >= b.asc) && (!G.BOON_NEED[b.id] || G.heroCan(G.BOON_NEED[b.id]));
G.heroTitle = (h) => (G.ascBest(h.id) >= 5 ? G.T('The Unfallen') : h.title);
// the difficulties this hero can choose (the Brazier steps through them)
G.diffChoices = (hero) => { const out = [0, 1, 2], o = G.ascOf(hero).open; for (let n = 1; n <= o; n++) out.push(2 + n); return out; };
// a hero without that step open drops to the highest they have
G.fitDiff = function () {
  const c = G.diffChoices();
  if (!c.includes(G.settings.difficulty)) { G.settings.difficulty = Math.min(G.settings.difficulty, c[c.length - 1]); G.saveSettings(); }
};
