// Solfall - particles, rings, floating text, screen shake, flashes, hit-freeze and slow motion,
// and the heavier layer on top of them: smoke and dust, shards, cut marks, floor cracks and scorch
// marks, flashes of light, a camera that is knocked about by blows, and ready-made mixes of those
// for the things that happen most (F.hit, F.thud, F.boom, F.shatter, F.land).
'use strict';
(function () {
  const F = G.fx = {
    parts: [], rings: [], texts: [], decals: [], lights: [], cuts: [],
    shakeAmp: 0, shakeX: 0, shakeY: 0,
    kx: 0, ky: 0, kvx: 0, kvy: 0,          // camera kick: a sprung offset
    rattleA: 0, rattleX: 0, rattleY: 0,    // the struck boss shivers during hit-freeze
    flashA: 0, flashC: '255,255,255', flashDecay: 4,
    vigA: 0, vigC: '255,40,40', vigDecay: 2,
    zoom: 0, joltCd: 0,
  };
  const MAX_PARTS = 1700, MAX_DECALS = 22;
  const FLOOR = G.FLOOR, rnd = G.rand;
  const sprites = new Map(), puffs = new Map(), vigs = new Map(), dustCols = new Map();
  const SMOKE = '84,78,100', GRIT = '30,26,40';

  // Soft round glow sprite, cached per colour.
  F.glow = function (color) {
    let c = sprites.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, G.rgba(color, 1));
    g.addColorStop(0.25, G.rgba(color, 0.55));
    g.addColorStop(0.6, G.rgba(color, 0.14));
    g.addColorStop(1, G.rgba(color, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    sprites.set(color, c);
    return c;
  };

  // A flatter, cloudier sprite for smoke and dust. It is drawn solid, not as light.
  function puff(color) {
    let c = puffs.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, G.rgba(color, 0.9));
    g.addColorStop(0.45, G.rgba(color, 0.62));
    g.addColorStop(0.8, G.rgba(color, 0.16));
    g.addColorStop(1, G.rgba(color, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    puffs.set(color, c);
    return c;
  }

  function vigSprite(color) {
    let c = vigs.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = 320; c.height = 180;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(160, 90, 60, 160, 90, 196);
    g.addColorStop(0, G.rgba(color, 0)); g.addColorStop(0.55, G.rgba(color, 0.1)); g.addColorStop(1, G.rgba(color, 0.9));
    x.fillStyle = g; x.fillRect(0, 0, 320, 180);
    vigs.set(color, c);
    return c;
  }

  // Dust takes a little of the arena's light, so it belongs to the place it is kicked up in.
  F.dustCol = function () {
    const rim = G.pal().rim;
    let c = dustCols.get(rim);
    if (!c) {
      const r = rim.split(',').map(Number);
      c = [0, 1, 2].map((i) => Math.round(186 * 0.6 + r[i] * 0.4)).join(',');
      dustCols.set(rim, c);
    }
    return c;
  };

  F.reset = function () {
    F.parts.length = 0; F.rings.length = 0; F.texts.length = 0;
    F.decals.length = 0; F.lights.length = 0; F.cuts.length = 0;
    F.shakeAmp = 0; F.flashA = 0; F.zoom = 0; F.vigA = 0;
    F.kx = F.ky = F.kvx = F.kvy = 0; F.rattleA = 0; F.joltCd = 0;
    F.glints.length = 0; F.imp = null;
  };

  // kind: 'glow' (soft light), 'spark' (a streak along its motion), 'chunk' (tumbling debris),
  // 'shard' (a tumbling sliver of light), 'smoke' (a solid puff that swells and thins).
  F.spawn = function (p) {
    if (F.parts.length >= MAX_PARTS) return;
    p.max = p.life;
    if (p.grav == null) p.grav = 0;
    if (p.drag == null) p.drag = 0;
    if (!p.kind) p.kind = 'glow';
    F.parts.push(p);
  };

  // o: n, color, speed [a,b], life [a,b], size [a,b], angle, spread, grav, drag, kind, jitter, len, wob, a, grow
  F.burst = function (x, y, o) {
    const n = o.n || 8;
    const sp = o.speed || [60, 240];
    const lf = o.life || [0.25, 0.6];
    const sz = o.size || [3, 7];
    const spread = o.spread == null ? G.TAU : o.spread;
    const ang = o.angle || 0;
    for (let i = 0; i < n; i++) {
      const a = ang + rnd(-spread / 2, spread / 2);
      const v = rnd(sp[0], sp[1]);
      F.spawn({
        x: x + (o.jitter ? rnd(-o.jitter, o.jitter) : 0),
        y: y + (o.jitter ? rnd(-o.jitter, o.jitter) : 0),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: rnd(lf[0], lf[1]), size: rnd(sz[0], sz[1]),
        color: o.color || G.COL.white, grav: o.grav || 0, drag: o.drag || 0,
        kind: o.kind || 'glow', rot: rnd(0, 6.28), vr: rnd(-8, 8),
        len: o.len, wob: o.wob, a: o.a, grow: o.grow,
      });
    }
  };

  F.ring = function (x, y, o) {
    F.rings.push({
      x, y, r0: o.r0 || 0, r1: o.r1 || 120, life: o.life || 0.4, max: o.life || 0.4,
      width: o.width || 4, color: o.color || G.COL.white, alpha: o.alpha || 0.9,
    });
  };

  // o.pop: the number hops up and falls in a small arc instead of drifting straight up.
  F.text = function (x, y, str, o) {
    o = o || {};
    F.texts.push({
      x, y, str, color: o.color || G.COL.white, size: o.size || 18,
      life: o.life || 0.8, max: o.life || 0.8, vy: o.vy == null ? (o.pop ? -190 : -60) : o.vy, bold: o.bold !== false,
      vx: o.pop ? rnd(-55, 55) : 0, g: o.pop ? 520 : 0,
    });
  };

  F.shake = function (a) {
    F.shakeAmp = Math.max(F.shakeAmp, a);
    if (a >= 14) F.jolt(a / 14); // anything this hard is felt across the whole arena
  };
  // Full-screen flashes follow the Screen flashes setting, and are never allowed to strobe: a second
  // flash within a third of a second of the last comes through at a third of its strength.
  let lastFlash = -1;
  F.flash = function (color, a, dur) {
    const set = G.settings.flash == null ? 1 : G.settings.flash;
    if (set <= 0) return;
    const now = performance.now();
    a *= set * (now - lastFlash < 340 ? 0.35 : 1);
    lastFlash = now;
    F.flashC = color; F.flashA = Math.max(F.flashA, a); F.flashDecay = Math.max(a, 0.01) / (dur || 0.25);
  };
  F.stop = function (t) { G.hitstop = Math.max(G.hitstop || 0, t); };
  F.slow = function (scale, dur) { G.slowScale = scale; G.slowT = dur; };
  F.punch = function (z) { F.zoom = Math.max(F.zoom, z); };
  // Knock the view about (dx, dy) pixels; it springs back. Unlike shake, it has a direction.
  F.kick = function (dx, dy) {
    F.kvx = G.clamp(F.kvx + dx * 60, -1100, 1100); F.kvy = G.clamp(F.kvy + dy * 60, -1100, 1100);
  };
  F.rattle = function (a) { F.rattleA = Math.max(F.rattleA, a); };
  // Coloured edges of the screen (red when the hero is hurt).
  F.vig = function (color, a, dur) {
    a *= G.settings.flash == null ? 1 : Math.max(0.3, G.settings.flash); // kept faintly even when flashes are off: it says you were hit
    F.vigC = color; F.vigA = Math.max(F.vigA, a); F.vigDecay = a / (dur || 0.5);
  };

  // A burst of light that lights nothing but reads as if it did.
  F.light = function (x, y, r, color, life, a) {
    if (F.lights.length > 40) F.lights.shift();
    F.lights.push({ x, y, r, color, life: life || 0.15, max: life || 0.15, a: a == null ? 0.5 : a });
  };

  // The bright line a blade leaves where it lands.
  F.cut = function (x, y, ang, len, w, color, hot, life) {
    if (F.cuts.length > 40) F.cuts.shift();
    F.cuts.push({ x, y, ang, len, w, color, hot: hot || G.COL.white, life: life || 0.2, max: life || 0.2 });
  };

  // A star of light on a blade's edge: the moment before a swing comes out. It stands in for the
  // red warning a melee hit used to draw, so the eye stays on the weapon and not on the floor.
  F.glints = [];
  F.glint = function (x, y, size, color, life) {
    if (F.glints.length > 24) F.glints.shift();
    F.glints.push({ x, y, size: size || 26, color: color || G.COL.white, life: life || 0.24, max: life || 0.24, rot: rnd(-0.3, 0.3) });
  };

  // An impact frame: for a few frames the whole picture is inverted and streaked with lines that
  // run in to the point of the blow. Kept for the biggest hits only, and never twice within half
  // a second, so it stays a punctuation mark and cannot strobe.
  let lastImp = -1;
  F.imp = null;
  F.impact = function (x, y, dur) {
    const now = performance.now();
    if (now - lastImp < 520) return;
    lastImp = now;
    const lines = [];
    for (let i = 0; i < 30; i++) lines.push({ a: (i + rnd(0, 0.9)) / 30 * G.TAU, r: rnd(90, 260), w: rnd(0.006, 0.03) });
    F.imp = { x, y, t: dur || 0.075, max: dur || 0.075, lines };
  };

  // ------------------------------------------------------------------ marks left on the floor
  function decal(d) {
    if (F.decals.length >= MAX_DECALS) F.decals.shift();
    d.age = 0;
    F.decals.push(d);
  }
  // Cracks running down the face of the floor slab from where something heavy came down.
  F.crack = function (x, power, col) {
    const lines = [], n = 3 + Math.round(2 * power), w = 12 + 16 * power;
    for (let i = 0; i < n; i++) {
      let px = x + rnd(-w, w) * 0.7, py = FLOOR + 2, a = Math.PI / 2 + rnd(-1.15, 1.15);
      const pts = [px, py], segs = 3 + (Math.random() < 0.5 ? 1 : 0);
      for (let k = 0; k < segs; k++) {
        a += rnd(-0.6, 0.6);
        const L = rnd(7, 15) * Math.sqrt(power);
        px += Math.cos(a) * L; py = Math.min(FLOOR + 74, py + Math.abs(Math.sin(a)) * L + 1);
        pts.push(px, py);
      }
      lines.push(pts);
    }
    decal({ kind: 'crack', x, w, lines, col: col || G.pal().boss, life: 8 });
  };
  // A burnt patch on the floor, with an edge that glows until it cools.
  F.scorch = function (x, w, col) {
    decal({ kind: 'scorch', x, w, col: col || G.pal().boss, life: 6 });
  };

  // ------------------------------------------------------------------ ready-made mixes
  // Dust or smoke puffs. o: dir (-1 | 0 | 1), speed [a,b], size [a,b], life [a,b], up, a, color, jitter
  F.dust = function (x, y, n, o) {
    o = o || {};
    const sp = o.speed || [20, 90], sz = o.size || [5, 10], lf = o.life || [0.45, 0.9];
    const col = o.color || F.dustCol();
    for (let i = 0; i < n; i++) {
      const v = rnd(sp[0], sp[1]), life = rnd(lf[0], lf[1]), size = rnd(sz[0], sz[1]);
      F.spawn({
        kind: 'smoke', color: col, a: (o.a || 0.4) * 1.5,
        x: x + rnd(-1, 1) * (o.jitter || 4), y: y - rnd(0, 4),
        vx: o.dir ? o.dir * v + rnd(-15, 15) : rnd(-1, 1) * v, vy: -rnd(4, o.up == null ? 34 : o.up),
        life, size: size * 1.3, grow: size * 2.1 / life, drag: 3.2, grav: -26,
      });
    }
  };

  // A footfall.
  F.step = function (x, y, dir) {
    F.dust(x, y, 2, { dir, speed: [14, 60], size: [4, 7], life: [0.3, 0.55], up: 24, a: 0.34 });
  };

  // The hero lands. k: 0 (a hop) to 1 (a long fall).
  F.land = function (x, y, k) {
    for (const d of [-1, 1]) F.dust(x + d * 6, y, 2 + Math.round(3 * k), { dir: d, speed: [30, 110 + 170 * k], size: [4, 8 + 5 * k], up: 24 });
    if (k > 0.55) {
      F.shake(1.5 + 2.5 * k); F.kick(0, 2 + 3 * k);
      F.burst(x, y - 2, { n: 3, color: GRIT, speed: [80, 240], angle: -Math.PI / 2, spread: 2.2, life: [0.4, 0.7], size: [2, 3.5], kind: 'chunk', grav: 1500 });
    }
  };

  // Something heavy meets the ground at (x, y). power: about 0.5 (a heavy step) to 2 (a boss lands).
  F.thud = function (x, y, power, o) {
    o = o || {};
    const p = power;
    for (const d of [-1, 1]) {
      F.dust(x + d * 10 * p, y, Math.round(2 + 3.5 * p), { dir: d, speed: [50, 150 + 190 * p], size: [6 + 2 * p, 10 + 7 * p], life: [0.45, 0.9 + 0.2 * p], up: 30 + 26 * p, a: 0.44, jitter: 10 * p });
    }
    F.dust(x, y, Math.round(1 + 2 * p), { speed: [10, 50], size: [8, 12 + 6 * p], life: [0.6, 1.1], up: 70 + 40 * p, a: 0.36, jitter: 14 * p });
    F.burst(x, y - 3, { n: Math.round(2 + 4 * p), color: GRIT, speed: [130, 300 + 170 * p], angle: -Math.PI / 2, spread: 2.3, life: [0.5, 1], size: [2, 3.5 + 1.5 * p], kind: 'chunk', grav: 1500 });
    if (p >= 0.9 && y >= FLOOR - 1 && !o.noCrack) F.crack(x, Math.min(2, p), o.col);
    F.kick(0, 2.4 * p);
    if (G.arena.gust) G.arena.gust(x, y - 20, p);
  };

  // What an explosion leaves behind: a flash of light, smoke, drifting embers, a burnt floor.
  F.boom = function (x, y, r, o) {
    o = o || {};
    const col = o.col || G.pal().boss, k = G.clamp(r / 120, 0.3, 2.2);
    F.light(x, y, r * 2.3, o.hot || col, 0.22 + 0.06 * k, 0.6);
    const n = G.clamp(Math.round(r / 15), 3, 12);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, G.TAU), d = rnd(0, r * 0.55), life = rnd(0.7, 1.4), size = rnd(r * 0.16, r * 0.34);
      F.spawn({
        kind: 'smoke', color: SMOKE, a: 0.6, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7,
        vx: Math.cos(a) * rnd(20, 90), vy: Math.sin(a) * rnd(10, 60) - rnd(20, 70),
        life, size, grow: size * 1.2 / life, drag: 2, grav: -40,
      });
    }
    F.burst(x, y, { n: G.clamp(Math.round(r / 9), 4, 18), color: col, speed: [20, 60 + r], life: [0.8, 1.9], size: [1.4, 3], drag: 1.6, grav: -46, wob: 90, jitter: r * 0.4 });
    if (y + r * 0.6 >= FLOOR - 4) {
      F.scorch(x, Math.min(150, r * 0.75), col);
      for (const d of [-1, 1]) F.dust(x + d * r * 0.4, FLOOR, 2 + Math.round(2 * k), { dir: d, speed: [60, 120 + r], size: [7, 11 + 4 * k], life: [0.5, 1], up: 40, a: 0.4 });
    }
    F.kick(0, 1.5 + 1.5 * k);
    if (G.arena.gust) G.arena.gust(x, y, k);
  };

  // Streaks flying straight out from a point: the "impact" lines of a heavy blow.
  F.lines = function (x, y, n, color, o) {
    o = o || {};
    const r0 = o.r0 || 26, sp = o.speed || [700, 1300];
    for (let i = 0; i < n; i++) {
      const a = (i + rnd(0, 1)) / n * G.TAU, v = rnd(sp[0], sp[1]), r = rnd(r0 * 0.6, r0 * 1.4);
      F.spawn({ kind: 'spark', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.1, 0.2), size: rnd(1.6, 2.8), color, len: 0.055, drag: 3 });
    }
  };

  // Slivers of light knocked out of something.
  F.shards = function (x, y, n, color, o) {
    o = o || {};
    F.burst(x, y, {
      n, color, kind: 'shard', angle: o.angle == null ? -Math.PI / 2 : o.angle, spread: o.spread == null ? G.TAU : o.spread,
      speed: o.speed || [140, 520], life: o.life || [0.5, 1.1], size: o.size || [3, 7], grav: 1250, drag: 0.6, jitter: o.jitter || 0,
    });
  };

  // The hero's weapon lands. ang: the direction of the blow.
  // o: heavy, thrust, power, col and hot (the hero's light), foe (the colour knocked out of the target)
  F.hit = function (x, y, ang, o) {
    o = o || {};
    const p = (o.heavy ? 1 : o.thrust ? 0.7 : 0.45) * (o.power || 1);
    const col = o.col || G.COL.star, hot = o.hot || G.COL.starHot, foe = o.foe || G.pal().boss;
    const c = Math.cos(ang), s = Math.sin(ang);
    F.cut(x, y, ang + rnd(-0.35, 0.35), 70 + 100 * p, 4 + 8 * p, col, hot);
    F.light(x, y, 50 + 100 * p, col, 0.1 + 0.08 * p, 0.2 + 0.45 * p);
    // sparks carry on the way the blade was going, a few spit back
    F.burst(x, y, { n: Math.round(5 + 10 * p), color: hot, kind: 'spark', angle: ang, spread: 1.5, speed: [180, 460 + 420 * p], life: [0.12, 0.3 + 0.12 * p], size: [1.8, 3 + 1.4 * p], drag: 2.4, grav: 500 });
    F.burst(x, y, { n: Math.round(2 + 3 * p), color: col, kind: 'spark', angle: ang + Math.PI, spread: 1.9, speed: [90, 300], life: [0.1, 0.25], size: [1.5, 2.5], grav: 500 });
    F.burst(x, y, { n: 2 + Math.round(2 * p), color: col, speed: [20, 120], life: [0.2, 0.4], size: [5, 9 + 3 * p] });
    F.shards(x, y, Math.round(1 + 5 * p), foe, { angle: ang - 0.35 * c, spread: 1.7, speed: [120, 340 + 240 * p], size: [2.5, 4.5 + 3 * p] });
    if (o.heavy) {
      F.lines(x, y, 9, hot);
      F.dust(x, y, 3, { speed: [30, 120], size: [8, 15], life: [0.3, 0.6], up: 50, a: 0.26, color: SMOKE, jitter: 10 });
    }
    F.kick(c * (1.2 + 4.6 * p), s * (1.2 + 4.6 * p));
    F.rattle(1.6 + 4.4 * p);
  };

  // A glancing or blocked blow: a small white tick.
  F.tink = function (x, y, ang) {
    F.cut(x, y, ang + Math.PI / 2, 34, 3, '200,200,220', G.COL.white);
    F.burst(x, y, { n: 5, color: '200,200,220', speed: [60, 240], life: [0.1, 0.25], kind: 'spark', size: [1.5, 2.5], angle: ang + Math.PI, spread: 2.2 });
  };

  // Something made of light breaks apart.
  F.shatter = function (x, y, color, n, o) {
    o = o || {};
    F.shards(x, y, n, color, { speed: o.speed || [160, 640], size: o.size || [3, 8], jitter: o.jitter || 10 });
    F.lines(x, y, Math.min(16, 6 + n / 2), o.hot || color, { r0: o.r0 || 30 });
    F.light(x, y, o.r || 200, color, 0.25, 0.6);
  };

  // A small thing of light bursts (an orb cut down, a knife knocked away).
  F.pop = function (x, y, color, r) {
    F.shards(x, y, 4, color, { speed: [100, 360], size: [2, 4.5], life: [0.35, 0.7] });
    F.light(x, y, (r || 13) * 5, color, 0.14, 0.5);
  };

  // The hero takes a blow from the side dir points away from.
  F.hurt = function (x, y, dir, color) {
    F.vig('255,40,40', 0.45, 0.55);
    F.shards(x, y, 9, color, { speed: [160, 520], size: [2.5, 5.5] });
    F.lines(x, y, 10, '255,150,150', { r0: 22 });
    F.light(x, y, 150, '255,90,90', 0.2, 0.6);
    F.kick(dir * 9, -4);
  };

  // A blow hard enough to shake the whole arena: dust lifts along the floor, grit drops from the
  // platforms, and the arena itself reacts (G.arena.bump).
  F.jolt = function (power) {
    if (F.joltCd > 0) return;
    F.joltCd = 0.3;
    const p = Math.min(2.4, power), dc = F.dustCol();
    const n = Math.round(5 * p);
    for (let i = 0; i < n; i++) {
      const x = rnd(G.cam.x + 56, G.cam.x + G.W - 56), life = rnd(0.5, 1), size = rnd(5, 10); // across whatever is in view
      F.spawn({ kind: 'smoke', color: dc, a: 0.34, x, y: FLOOR - 2, vx: rnd(-14, 14), vy: -rnd(20, 60) * p, life, size, grow: size * 1.5 / life, drag: 2.6, grav: -18 });
      F.spawn({ kind: 'chunk', color: GRIT, x: x + rnd(-40, 40), y: FLOOR - 3, vx: rnd(-30, 30), vy: -rnd(90, 210) * Math.sqrt(p), life: rnd(0.45, 0.7), size: rnd(1.8, 3.2), grav: 1500, rot: 0, vr: rnd(-8, 8) });
    }
    if (G.arena.bump) G.arena.bump(p);
  };

  // ------------------------------------------------------------------ update
  F.update = function (dt) {
    const parts = F.parts;
    let w = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.vy += p.grav * dt;
      if (p.wob) p.vx += Math.sin(p.life * 9 + p.rot) * p.wob * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'chunk' || p.kind === 'shard') {
        p.rot += p.vr * dt;
        if (p.y > FLOOR - 2 && p.vy > 0) {
          // debris big enough to matter raises a little dust where it first lands
          if (p.kind === 'chunk' && !p.hit && p.size > 5 && p.vy > 260) {
            p.hit = true;
            F.dust(p.x, FLOOR, 1, { speed: [10, 40], size: [3, 6], life: [0.25, 0.45], up: 26, a: 0.28 });
          }
          p.y = FLOOR - 2; p.vy *= -0.35; p.vx *= 0.6; p.vr *= 0.5;
        }
      }
      parts[w++] = p;
    }
    parts.length = w;

    for (const list of [F.rings, F.lights, F.cuts, F.glints]) {
      w = 0;
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        r.life -= dt;
        if (r.life > 0) list[w++] = r;
      }
      list.length = w;
    }

    w = 0;
    for (let i = 0; i < F.decals.length; i++) {
      const d = F.decals[i];
      d.life -= dt; d.age += dt;
      if (d.life > 0) F.decals[w++] = d;
    }
    F.decals.length = w;

    w = 0;
    for (let i = 0; i < F.texts.length; i++) {
      const t = F.texts[i];
      t.life -= dt; t.y += t.vy * dt; t.x += t.vx * dt;
      if (t.g) { t.vy += t.g * dt; t.vx *= Math.exp(-2 * dt); } else t.vy *= Math.exp(-3 * dt);
      if (t.life > 0) F.texts[w++] = t;
    }
    F.texts.length = w;
  };

  // Uses real time so shake and flashes keep moving through hit-freeze.
  F.updateScreen = function (dt) {
    const set = G.settings.shake;
    F.shakeAmp *= Math.exp(-9 * dt);
    if (F.shakeAmp < 0.2) F.shakeAmp = 0;
    // the kick: a spring pulled back to rest, a little under-damped so it settles with one small rebound
    F.kvx += (-F.kx * 1440 - F.kvx * 42) * dt; F.kvy += (-F.ky * 1440 - F.kvy * 42) * dt;
    F.kx += F.kvx * dt; F.ky += F.kvy * dt;
    const s = F.shakeAmp * set;
    F.shakeX = rnd(-s, s) + F.kx * set; F.shakeY = rnd(-s, s) + F.ky * set;
    F.rattleA *= Math.exp(-20 * dt);
    if (F.rattleA < 0.3) F.rattleA = 0;
    F.rattleX = rnd(-1, 1) * F.rattleA * set; F.rattleY = rnd(-0.5, 0.5) * F.rattleA * set;
    if (F.flashA > 0) F.flashA = Math.max(0, F.flashA - F.flashDecay * dt);
    if (F.vigA > 0) F.vigA = Math.max(0, F.vigA - F.vigDecay * dt);
    F.zoom *= Math.exp(-7 * dt);
    if (F.zoom < 0.0005) F.zoom = 0;
    if (F.joltCd > 0) F.joltCd -= dt;
    if (F.imp) { F.imp.t -= dt; if (F.imp.t <= 0) F.imp = null; }
  };

  // ------------------------------------------------------------------ drawing
  // Cracks and scorch marks, drawn straight onto the floor (before anything stands on it).
  F.drawDecals = function (ctx) {
    if (!F.decals.length) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const d of F.decals) {
      const al = Math.min(1, d.life / 1.5), heat = Math.max(0, 1 - d.age / 1.5);
      if (d.kind === 'crack') {
        ctx.fillStyle = 'rgba(0,0,0,' + 0.6 * al + ')';
        ctx.beginPath(); ctx.ellipse(d.x, FLOOR + 2, d.w, 4, 0, 0, G.TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,' + 0.75 * al + ')'; ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (const pts of d.lines) { ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); }
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = G.rgba(d.col, (0.7 * heat * heat + 0.2) * al); ctx.lineWidth = 1 + 0.6 * heat;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.fillStyle = 'rgba(0,0,0,' + 0.5 * al + ')';
        ctx.beginPath(); ctx.ellipse(d.x, FLOOR + 3, d.w, 5.5, 0, 0, G.TAU); ctx.fill();
        if (heat > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = G.rgba(d.col, 0.5 * heat);
          ctx.beginPath(); ctx.ellipse(d.x, FLOOR + 2, d.w * 0.8, 3, 0, 0, G.TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    }
  };

  // Smoke and dust: solid puffs that swell as they thin. They are drawn behind the hero, the
  // duelling bosses and every warning, so however much is in the air it never hides the fight.
  F.drawSmoke = function (ctx) {
    const parts = F.parts;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.kind !== 'smoke') continue;
      const k = p.life / p.max, r = p.size + (p.grow || 0) * (p.max - p.life);
      ctx.globalAlpha = Math.min(1, (p.a || 0.4) * Math.min(1, (1 - k) * 8) * Math.pow(k, 0.7));
      ctx.drawImage(puff(p.color), p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  };

  F.draw = function (ctx) {
    const parts = F.parts;
    // light first, so smoke and debris sit in front of it
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < F.lights.length; i++) {
      const l = F.lights[i], k = l.life / l.max;
      ctx.globalAlpha = l.a * k * k;
      ctx.drawImage(F.glow(l.color), l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // solid debris
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.kind !== 'chunk') continue;
      const k = p.life / p.max;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, k * 3);
      ctx.fillStyle = G.rgba(p.color, 1);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.kind === 'chunk' || p.kind === 'smoke') continue;
      const k = p.life / p.max;
      if (p.kind === 'spark') {
        const len = p.len || 0.035;
        ctx.strokeStyle = G.rgba(p.color, k);
        ctx.lineWidth = p.size * (0.4 + 0.6 * k);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * len, p.y - p.vy * len);
        ctx.stroke();
      } else if (p.kind === 'shard') {
        const c = Math.cos(p.rot) * p.size, s = Math.sin(p.rot) * p.size;
        ctx.fillStyle = G.rgba(p.color, Math.min(1, k * 2.2));
        ctx.beginPath();
        ctx.moveTo(p.x + c, p.y + s);
        ctx.lineTo(p.x - c * 0.6 - s * 0.42, p.y - s * 0.6 + c * 0.42);
        ctx.lineTo(p.x - c * 0.6 + s * 0.42, p.y - s * 0.6 - c * 0.42);
        ctx.closePath(); ctx.fill();
      } else {
        const s = p.size * (0.5 + 0.5 * k) * 2.2;
        ctx.globalAlpha = k;
        ctx.drawImage(F.glow(p.color), p.x - s, p.y - s, s * 2, s * 2);
        ctx.globalAlpha = 1;
      }
    }
    // cut marks: a sliver that snaps out to full length, then thins away
    for (let i = 0; i < F.cuts.length; i++) {
      const q = F.cuts[i], k = q.life / q.max;
      const L = q.len * (0.45 + 0.55 * G.ease.outCubic(Math.min(1, (1 - k) * 4))) / 2, w = q.w * k;
      const c = Math.cos(q.ang), s = Math.sin(q.ang);
      for (const [col, ws, al] of [[q.color, 1, 0.75], [q.hot, 0.42, 1]]) {
        ctx.fillStyle = G.rgba(col, al * Math.min(1, k * 1.6));
        ctx.beginPath();
        ctx.moveTo(q.x - c * L, q.y - s * L);
        ctx.lineTo(q.x - s * w * ws, q.y + c * w * ws);
        ctx.lineTo(q.x + c * L, q.y + s * L);
        ctx.lineTo(q.x + s * w * ws, q.y - c * w * ws);
        ctx.closePath(); ctx.fill();
      }
    }
    // glints: a four-pointed star that snaps open and thins away
    for (let i = 0; i < F.glints.length; i++) {
      const g = F.glints[i], k = g.life / g.max, open = G.ease.outCubic(Math.min(1, (1 - k) * 3.2));
      const L = g.size * (0.35 + 0.65 * open), w = Math.max(0.6, g.size * 0.11 * k);
      ctx.globalAlpha = Math.min(1, k * 2.4);
      ctx.drawImage(F.glow(g.color), g.x - L * 0.8, g.y - L * 0.8, L * 1.6, L * 1.6);
      ctx.fillStyle = G.rgba(G.COL.white, 1);
      for (let q = 0; q < 2; q++) {
        const a = g.rot + q * Math.PI / 2, c = Math.cos(a), s = Math.sin(a), LL = q ? L * 0.55 : L;
        ctx.beginPath();
        ctx.moveTo(g.x - c * LL, g.y - s * LL); ctx.lineTo(g.x - s * w, g.y + c * w);
        ctx.lineTo(g.x + c * LL, g.y + s * LL); ctx.lineTo(g.x + s * w, g.y - c * w);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < F.rings.length; i++) {
      const r = F.rings[i];
      const k = 1 - r.life / r.max;
      const rad = G.lerp(r.r0, r.r1, G.ease.outCubic(k));
      ctx.strokeStyle = G.rgba(r.color, r.alpha * (1 - k));
      ctx.lineWidth = r.width * (1 - k * 0.7);
      ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0.1, rad), 0, G.TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < F.texts.length; i++) {
      const t = F.texts[i];
      const k = t.life / t.max;
      const pop = 1 + (t.g ? 0.7 : 0.35) * Math.max(0, (k - 0.8) / 0.2);
      ctx.font = (t.bold ? '700 ' : '500 ') + Math.round(t.size * pop) + 'px Bahnschrift, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,' + 0.55 * Math.min(1, k * 2) + ')';
      ctx.fillText(t.str, t.x + 1.5, t.y + 2);
      ctx.fillStyle = G.rgba(t.color, Math.min(1, k * 2));
      ctx.fillText(t.str, t.x, t.y);
    }
  };

  F.drawFlash = function (ctx) {
    if (F.vigA > 0) {
      ctx.globalAlpha = Math.min(1, F.vigA);
      ctx.drawImage(vigSprite(F.vigC), 0, 0, G.W, G.H);
      ctx.globalAlpha = 1;
    }
    if (F.flashA > 0) {
      ctx.fillStyle = G.rgba(F.flashC, Math.min(1, F.flashA));
      ctx.fillRect(-60, -60, G.W + 120, G.H + 120);
    }
    if (F.imp) {
      const m = F.imp, x = m.x - G.cam.x, y = m.y - G.cam.y, far = 1600;
      // with Screen flashes turned off the picture is not inverted; the lines alone carry it
      if ((G.settings.flash == null ? 1 : G.settings.flash) > 0) {
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#fff'; ctx.fillRect(-60, -60, G.W + 120, G.H + 120);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = '#000';
      ctx.beginPath();
      for (const l of m.lines) {
        ctx.moveTo(x + Math.cos(l.a) * l.r, y + Math.sin(l.a) * l.r);
        ctx.lineTo(x + Math.cos(l.a - l.w) * far, y + Math.sin(l.a - l.w) * far);
        ctx.lineTo(x + Math.cos(l.a + l.w) * far, y + Math.sin(l.a + l.w) * far);
        ctx.closePath();
      }
      ctx.fill();
    }
  };
})();
