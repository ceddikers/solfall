// Solfall - The Eclipsed Warden: a core, two hands, three phases.
// Attacks are generator scripts; each yield hands control back for one simulation step.
'use strict';
(function () {
  const { wait, tween, par } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards, DANGER = G.COL.danger;
  const WL = G.WALL_L, WR = G.WALL_R;

  const B = G.boss = {
    BASE_HP: 5400, id: 'warden', reckonName: 'ECLIPSE', name: 'THE ECLIPSED WARDEN', short: 'The Warden', theme: 'warden',
    blurb: 'A dimmed sun and its two hands',
    tips: [
      'Slash downward in the air to bounce off a hand and stay above the shockwaves.',
      'The hands are stuck after a slam, a clap or a rocket punch. Three slashes fit in that window.',
      'A Star Lance aimed upward reaches the core from the ground. Hold up and fire.',
      'When the floor burns, the platforms are safe.',
      'A hand that takes enough damage breaks, and the Warden is weaker until it mends.',
      'Count the blinks. The eye shuts once for each lance it is about to throw.',
      'A fist that glows and trembles on the way up lands for two health, and a second wave follows the first.',
    ],
    hudCols: [null, ['#ff8a3c', '#ffd07a'], ['#ff3c5a', '#ffa2ac'], ['#b6a6ff', '#ffffff']],
  };
  G.bosses = { warden: B };
  const HOME_Y = [0, 214, 214, 250];

  function mkHand(side) {
    return mkPose({
      id: 'hand' + side, side, x: 640 + side * 320, y: -120, rot: 0, curl: 0.12,
      ctrl: true, hurt: false, hurtDmg: 1, alive: true, flash: 0, stuck: false, hot: 0,
      hp: 1, maxHp: 1, broken: 0, // a hand that runs out of health lies broken for a while
      fc: [0.12, 0.12, 0.12, 0.12], tc: 0.12, fp: 0, fpT: 0, // (drawn: each finger's curl, the thumb's, the index pointing)
      rg: mkHandRig(), // (drawn: its bones)
    });
  }

  // ------------------------------------------------------------------ the pose layer (v2.5c)
  // Where a hand or the core is *drawn* can lead or trail where it *is*: a dip before a heave, a wrist
  // cocked back, a squash on landing, a tremble, fingers that close one after another. Scripts set
  // targets for it each step (o.pt: cleared before every step, so a pose lets go by itself when a move
  // ends or is cut short) and kick it (o.pv); the drawn pose (o.pp) follows on springs a little under
  // damped, so it lags, carries past once and settles. None of it moves a hit area: boxes, hazards and
  // targets still come from x, y, rot and curl alone.
  const PCH = ['x', 'y', 'r', 'c', 's', 'g'];
  // x, y: offset (px); r: turn (rad); c: curl (a hand's fingers; below 0 they splay); s: stretch (taller
  // and narrower above 0, squashed below); g: grow (both ways)
  const PSPR = { x: [330, 22], y: [330, 22], r: [300, 20], c: [520, 34], s: [400, 18], g: [360, 17] };
  const FRATE = [34, 27, 21, 16]; // (the fingers follow the hand's curl, the first finger first, the little one last)
  function mkPose(o) {
    o.pt = { x: 0, y: 0, r: 0, c: 0, s: 0, g: 0, sh: 0 };
    o.pp = { x: 0, y: 0, r: 0, c: 0, s: 0, g: 0 };
    o.pv = { x: 0, y: 0, r: 0, c: 0, s: 0, g: 0 };
    o.shk = 0; o.tilt = 0; o.tiltV = 0; o.st = 0; o.va = 0; o.svx = 0; o.svy = 0; o.ox0 = o.x; o.oy0 = o.y;
    return o;
  }
  function poseClear(o) { const t = o.pt; t.x = t.y = t.r = t.c = t.s = t.g = t.sh = 0; o.fpT = 0; }
  // tiltK: how far the top of it trails sideways motion; stK: how fast it must go to stretch
  function poseStep(o, dt, tiltK, stK) {
    if (!(dt > 0)) return;
    for (const ch of PCH) {
      const sp = PSPR[ch];
      o.pv[ch] += ((o.pt[ch] - o.pp[ch]) * sp[0] - o.pv[ch] * sp[1]) * dt;
      o.pp[ch] += o.pv[ch] * dt;
    }
    o.shk = G.damp(o.shk, o.pt.sh, 14, dt);
    // how fast it really moves (a jump of hundreds of px in one step is a teleport, not motion)
    let vx = (o.x - o.ox0) / dt, vy = (o.y - o.oy0) / dt;
    if (Math.abs(o.x - o.ox0) > 260 || Math.abs(o.y - o.oy0) > 260) vx = vy = 0;
    o.ox0 = o.x; o.oy0 = o.y;
    o.svx = G.damp(o.svx, G.clamp(vx, -5000, 5000), 30, dt); o.svy = G.damp(o.svy, G.clamp(vy, -5000, 5000), 30, dt);
    // drawn out a little along its path when it moves fast
    const sp = Math.hypot(o.svx, o.svy);
    if (sp > 1) o.va = Math.atan2(o.svy, o.svx);
    o.st = G.damp(o.st, G.clamp((sp - 500) / stK, 0, 0.09), 20, dt);
    // a hanging weight: its top trails behind sideways motion and swings past once when it stops
    if (tiltK) {
      const tt = G.clamp(-o.svx * tiltK, -0.2, 0.2) * (o.hurt ? 0.35 : 1);
      o.tiltV += ((tt - o.tilt) * 150 - o.tiltV * 9) * dt;
      o.tilt += o.tiltV * dt;
    }
    if (o.fc) {
      const cd = G.clamp(o.curl + o.pp.c, -0.3, 1);
      for (let i = 0; i < 4; i++) o.fc[i] = G.damp(o.fc[i], cd, FRATE[i], dt);
      o.tc = G.damp(o.tc, cd, 20, dt);
      o.fp = G.damp(o.fp, o.fpT, 16, dt);
    }
  }
  // a tremble with no per-frame randomness in it: two sines, out of step
  const NOPOSE = { x: 0, y: 0, r: 0, c: 0, s: 0, g: 0 };
  const quiver = (t, s) => Math.sin(t * 61 + s) * 0.62 + Math.sin(t * 37.3 + s * 2.1) * 0.38;

  // ------------------------------------------------------------------ the bones (v2.5c, drawing only)
  // Under the pose layer, every piece on its own spring: each finger a chain of three joints (the thumb
  // two) that fold one after another, fling apart as the hand lets go and trail a fast move; the wrist
  // bends between the palm and the stub of void below it, which trails two wisps; the palm flops on the
  // wrist when the hand stops short; the core's halo, corona, rim, eye and iris each lag and settle on
  // their own; the Pendulum's chain bows and whips; the shards rock one after another. Kept on h.rg and
  // c.rg and stepped after the pose (rigStep). No hit area reads any of it, and nothing in it draws a
  // random number, so a seeded fight plays out exactly as before. A hand with no rig (the Afterhands'
  // fist) is drawn from its curl alone.
  const FJ = [1.4, 1.5, 0.9], FSEG = [0.44, 0.32, 0.24], FW = [23, 21.5, 19.5]; // a finger: fold per joint at a full fist, bone lengths, widths
  const TJ = [0.62, 0.72], TSEG = [0.62, 0.38], TW = [23, 21];                  // the thumb
  const SPLAY = [-1, -0.35, 0.35, 1];                                           // how far each finger leans out as they spread
  function sprung(o, t, dt, w, z) { // one value on a spring (sub-stepped as js/draw.js does)
    const n = Math.max(1, Math.ceil(w * dt / 0.35)), s = dt / n;
    for (let i = 0; i < n; i++) { o.v += ((t - o.x) * w * w - 2 * z * w * o.v) * s; o.x += o.v * s; }
    if (!isFinite(o.x) || !isFinite(o.v)) { o.x = t; o.v = 0; }
    return o.x;
  }
  const sp0 = (x) => ({ x: x || 0, v: 0 });
  const clampSp = (o, m) => { if (o.x > m) { o.x = m; if (o.v > 0) o.v = 0; } else if (o.x < -m) { o.x = -m; if (o.v < 0) o.v = 0; } };
  function bones(st, want, dt, o) { // G.draw.angleChain, guarded: a chain that ever goes wrong starts over from its pose
    const a = G.draw.angleChain(st, want, dt, o);
    for (let i = 0; i < a.length; i++) if (!isFinite(a[i]) || !isFinite(st.v[i]) || Math.abs(a[i]) > 6) { st.a = null; return G.draw.angleChain(st, want, 0, o); }
    return a;
  }
  function mkHandRig() {
    return {
      fin: [0, 1, 2, 3].map(() => ({ c: {}, l: {} })), th: { c: {}, l: {} }, wisp: [{}, {}],
      spread: sp0(), wr: sp0(), fl: sp0(), w3: [0, 0, 0], w5: [0, 0, 0, 0, 0],
      pvx: 0, pvy: 0, kx: 0, pR: null, pcd: null,
    };
  }
  function mkCoreRig() {
    return {
      pvx: 0, pvy: 0, pk: 0,
      hx: sp0(), hy: sp0(), kx: sp0(), ky: sp0(), rx: sp0(), ry: sp0(), sx: sp0(), sy: sp0(), // offsets: halo, corona, rim, eye
      ex: sp0(), ey: sp0(), dx: sp0(), dy: sp0(), tw: sp0(),  // the rim's wobble; the corona's flames leaning back, its twist
      lid: sp0(1), ix: sp0(), iy: sp0(), b1: sp0(), b2: sp0(), // the lid, the iris; the chain's bow and whip
      sh: {}, w6: [0, 0, 0, 0, 0, 0],
    };
  }
  function handRig(h, dt) {
    const g = h.rg;
    if (!g || !h.alive || !(dt > 0)) return;
    const pp = h.pp, R = h.rot + pp.r + (h.tilt || 0), cs = Math.cos(R), sn = Math.sin(R), sd = h.side, t = B.t;
    // how it moves (from its smoothed speed), put in the hand's own frame: fingers up, thumb to the left
    const ax = G.clamp((h.svx - g.pvx) / dt, -14000, 14000), ay = G.clamp((h.svy - g.pvy) / dt, -14000, 14000);
    g.pvx = h.svx; g.pvy = h.svy;
    const alx = (ax * cs + ay * sn) * sd, aly = -ax * sn + ay * cs, vlx = (h.svx * cs + h.svy * sn) * sd;
    // a blow landing on it (its knock-back, or a tremble a script puts in it) jolts it sideways
    const kj = G.clamp(((h.kx || 0) - g.kx) / dt, -4000, 4000), klx = kj * cs * sd; g.kx = h.kx || 0;
    let dR = g.pR == null ? 0 : G.angDiff(g.pR, R) / dt; g.pR = R; dR = G.clamp(dR, -30, 30);
    // the curl it is told to make, and how fast it opens or closes
    const cd = G.clamp(h.curl + pp.c, -0.3, 1), dc = g.pcd == null ? 0 : G.clamp((cd - g.pcd) / dt, -60, 60); g.pcd = cd;
    // letting go fast flings the fingers apart (closing fast bunches them), and they settle back
    sprung(g.spread, Math.max(0, -cd) * 1.4, dt, 10, 0.34);
    g.spread.v += (Math.max(0, -dc - 1.5) * 10 - Math.max(0, dc - 1.5) * 3) * dt;
    if (g.spread.x > 1.6) { g.spread.x = 1.6; g.spread.v = Math.min(0, g.spread.v); } else if (g.spread.x < -0.6) { g.spread.x = -0.6; g.spread.v = Math.max(0, g.spread.v); }
    const drag = G.clamp(-vlx * 0.00011, -0.32, 0.32), push = -alx * 0.0032, cpush = aly * 0.0025 + Math.abs(alx) * 0.0004, w = g.w3;
    for (let i = 0; i < 4; i++) {
      let fc = G.clamp(h.fc[i], -0.3, 1);
      if (i === 0 && h.fp > 0.01) fc = G.lerp(fc, -0.12, h.fp);
      fc += 0.035 * Math.sin(t * 1.25 + i * 0.85 + sd) * (1 - Math.abs(fc)); // (a slow ripple through them at rest)
      const f = g.fin[i];
      // folding: the knuckle first, the tip last, each tip swinging a little past
      for (let k = 0; k < 3; k++) w[k] = FJ[k] * fc;
      bones(f.c, w, dt, { w0: 36, w1: 21, z0: 0.55, z1: 0.3, follow: 0.3, push: cpush });
      // leaning in the plane: trailing a fast move, thrown by a stop or a blow
      for (let k = 0; k < 3; k++) w[k] = drag * (0.22 + 0.14 * k);
      bones(f.l, w, dt, { w0: 30, w1: 17, z0: 0.5, z1: 0.27, follow: 0.45, push });
      if (klx) for (let k = 0; k < 3; k++) f.l.v[k] -= klx * 0.0011 * (0.5 + 0.25 * k);
    }
    const tc = G.clamp(h.tc, -0.3, 1), th = g.th, w2 = [TJ[0] * tc, TJ[1] * tc];
    bones(th.c, w2, dt, { w0: 30, w1: 19, z0: 0.55, z1: 0.32, follow: 0.3, push: cpush });
    w2[0] = drag * 0.2; w2[1] = drag * 0.3;
    bones(th.l, w2, dt, { w0: 26, w1: 16, z0: 0.5, z1: 0.3, follow: 0.45, push });
    // the wrist: the stub below the palm trails the way it moves and the way it turns, and holds back
    // against a cocked palm; the palm itself flops forward on the wrist when the hand stops short
    sprung(g.wr, G.clamp(vlx * 0.00017 - (pp.r * 0.45 + dR * 0.035) * sd, -0.55, 0.55), dt, 10, 0.3);
    g.wr.v += alx * 0.0016 * dt + klx * 0.0012;
    clampSp(g.wr, 0.7);
    sprung(g.fl, 0, dt, 13, 0.38);
    g.fl.v -= alx * 0.0011 * dt + klx * 0.0006;
    clampSp(g.fl, 0.12);
    // two wisps of void off the end of it: stiff at the root, loose at the tip
    const wd = G.clamp(vlx * 0.00028, -0.8, 0.8) - g.wr.x * 0.5, w5 = g.w5;
    for (let s = 0; s < 2; s++) {
      for (let k = 0; k < 5; k++) w5[k] = wd * 0.2 + 0.06 * Math.sin(t * 1.7 + k * 0.9 + s * 2.3 + sd);
      bones(g.wisp[s], w5, dt, { w0: 16, w1: 8, z0: 0.42, z1: 0.3, follow: 0.7, push: alx * 0.0012 });
    }
  }
  function coreRig(c, dt) {
    const g = c.rg;
    if (!g || !(dt > 0)) return;
    const ax = G.clamp((c.svx - g.pvx) / dt, -14000, 14000), ay = G.clamp((c.svy - g.pvy) / dt, -14000, 14000);
    g.pvx = c.svx; g.pvy = c.svy;
    // each part lags the disc by its own amount and swings back past it: the halo of light loosest
    const off = (ox, oy, k, w, z, m) => {
      sprung(ox, 0, dt, w, z); sprung(oy, 0, dt, w, z);
      ox.v -= ax * k * dt; oy.v -= ay * k * dt;
      const d = Math.hypot(ox.x, oy.x);
      if (d > m) { ox.x *= m / d; oy.x *= m / d; }
    };
    off(g.hx, g.hy, 0.5, 7.5, 0.4, 30);
    off(g.kx, g.ky, 0.35, 10, 0.36, 20);
    off(g.rx, g.ry, 0.22, 17, 0.42, 6);
    off(g.sx, g.sy, 0.3, 13, 0.3, c.r * 0.1);
    // the rim stretches along a hard start or stop and wobbles back; a blow landing squashes it
    sprung(g.ex, 0, dt, 15, 0.22); sprung(g.ey, 0, dt, 15, 0.22);
    g.ex.v += (Math.abs(ax) - Math.abs(ay)) * 0.0003 * dt; g.ey.v += (Math.abs(ay) - Math.abs(ax)) * 0.0003 * dt;
    const dk = (c.kick || 0) - g.pk; g.pk = c.kick || 0;
    if (dk > 0.04) { g.ex.v += dk * 1.4; g.ey.v -= dk * 1.4; g.sy.v += dk * 60; }
    clampSp(g.ex, 0.06); clampSp(g.ey, 0.06);
    // the corona's flames lean back from the way it moves, and the ring of them twists a little
    sprung(g.dx, G.clamp(-c.svx * 0.012, -26, 26), dt, 7, 0.42); sprung(g.dy, G.clamp(-c.svy * 0.012, -26, 26), dt, 7, 0.42);
    g.dx.v -= ax * 0.004 * dt; g.dy.v -= ay * 0.004 * dt;
    clampSp(g.dx, 34); clampSp(g.dy, 34);
    sprung(g.tw, G.clamp(c.svx * 0.00022, -0.2, 0.2), dt, 5.5, 0.32);
    g.tw.v += ax * 0.00002 * dt; clampSp(g.tw, 0.3);
    // the lid opens wide past where it is told and settles (it is never drawn more shut than told,
    // so the blinks that count the lances stay as crisp as they were); the iris overshoots a glance
    const lidT = (c.blink > 0 ? Math.max(0.06, Math.abs(c.blink / 0.17 * 2 - 1)) : 1) * c.open;
    sprung(g.lid, lidT, dt, 30, 0.5); clampSp(g.lid, 1.18);
    sprung(g.ix, c.lx, dt, 20, 0.38); sprung(g.iy, c.ly, dt, 20, 0.38);
    clampSp(g.ix, 1.3); clampSp(g.iy, 1.3);
    // the Pendulum's chain bows away from a sideways pull and whips back
    let ap = 0;
    if (B.chain && !B.chain.snap) {
      const ux = PIV_X - c.x, uy = PIV_Y - c.y, L = Math.hypot(ux, uy) || 1;
      ap = (ax * -uy + ay * ux) / L;
    }
    sprung(g.b1, 0, dt, 6, 0.22); sprung(g.b2, 0, dt, 15, 0.3);
    g.b1.v -= ap * 0.04 * dt; g.b2.v += ap * 0.02 * dt;
    clampSp(g.b1, 45); clampSp(g.b2, 16);
    // the shards rock one after another as it moves
    const w6 = g.w6;
    for (let i = 0; i < 6; i++) w6[i] = 0;
    bones(g.sh, w6, dt, { w0: 14, w1: 9, z0: 0.35, z1: 0.25, follow: 0.5, push: -ax * 0.0012 });
  }

  B.reset = function () {
    B.maxHp = Math.round(B.BASE_HP * G.diff().bossHp);
    B.hp = B.maxHp;
    B.phase = 1; B.poise = 0; B.poiseMax = 440; B.staggered = false;
    B.invuln = true; B.active = false; B.dead = false; B.dying = false; B.toppled = false; B.down = false;
    B.script = null; B.attackName = ''; B.bag = []; B.lastAtk = ''; B.forceNext = G.corrupt.opener(B, 1) || 'slam';
    B.t = 0; B.spread = 318; B.rays = []; B.shardR = 900; B.shardsOut = false; B.hasShards = false;
    B.core = {
      x: 640, y: -200, r: 84, ctrl: true, open: 1, charge: 0, flash: 0,
      lx: 0, ly: 0, pulse: 0, spinHint: 0, hurt: false, jit: 0, sun: 0, embedded: false,
      blink: 0, blinkT: 3,
      vx: 0, vy: 0, swell: 0, swellT: 0, swellV: 0, flA: 0, flK: 0, // (the Flare and the Sunspot)
      crA: -Math.PI / 2, crK: 0, daze: 0, hurtDmg: 0, // (the Corona's crown, the Charge's daze, v2.1a)
    };
    mkPose(B.core); B.core.rg = mkCoreRig();
    B.spots = []; B.orbit = []; B.above = 0;
    B.hands = [mkHand(-1), mkHand(1)];
    for (const h of B.hands) h.hp = h.maxHp = Math.round(B.maxHp * 0.07);
    B.shardA = 0; B.shardSpin = 0.9; B.haloR = 0; B.haloHurt = false;
    B.campT = 0; B.campPlat = null; B.lastStand = false; B.airT = 0;
    B.halo = { kind: 'blade' };
    B.chain = null; B.shardPose = null; B.shardPoseK = 0; B.shardHold = false;
    G.bounds = null;
  };

  // Idle pose for the title screen backdrop.
  B.attract = function () {
    B.reset();
    B.core.y = HOME_Y[1]; B.core.ctrl = false;
    B.spread = 430;
    for (const h of B.hands) { h.ctrl = false; h.x = 640 + h.side * B.spread; h.y = HOME_Y[1] + 128; }
  };

  // A hand can attack and be struck only while it is whole.
  const usable = (h) => h.alive && h.broken <= 0;
  const usableHands = () => B.hands.filter(usable);

  // ------------------------------------------------------------------ targets and damage
  // strike: the box a hero's blows can land in, which also takes in the thumb and the fingertips of an
  // open hand (v2.1b: they were drawn up to 30 px outside it). Without it, the box its blows hurt with.
  function handBox(h, strike) {
    const o = strike ? 1 - h.curl : 0;
    const ox = -16 * o * h.side, oy = G.lerp(-18, 6, h.curl) - 4 * o, hw = 62 + 16 * o, hh = G.lerp(92, 62, h.curl) + 4 * o;
    const s = Math.sin(h.rot), c = Math.cos(h.rot);
    return {
      cx: h.x + ox * c - oy * s, cy: h.y + ox * s + oy * c,
      hw: Math.abs(c) * hw + Math.abs(s) * hh, hh: Math.abs(s) * hw + Math.abs(c) * hh,
    };
  }

  B.handBox = handBox; // (read by tools/hitbox-check.js)

  B.targets = function () {
    const out = [];
    if (!B.active || B.dead || (B.dying && !B.toppled)) return out;
    const c = B.core;
    // the whole drawn disc and its burning rim (v2.1b: r * 0.96 left the rim, 13 px all round, untouchable)
    out.push({ id: 'core', kind: 'core', cx: c.x, cy: c.y, r: (c.r + 9) * (1 + (c.swell || 0)) });
    for (const h of B.hands) {
      if (!usable(h) || h.sunk >= 1) continue; // (a hand sunk into the floor, the Afterhands, cannot be reached)
      const b = handBox(h, true);
      out.push({ id: h.id, kind: 'hand', ref: h, cx: b.cx, cy: b.cy, hw: b.hw, hh: b.hh });
    }
    return out;
  };

  B.damage = function (amount, t, info) {
    // toppled at nothing: any blow ends it, plainly (E is the finishing blow, see finish.js)
    // (blows still in the air as it goes down pass through: the choice comes once it is down)
    if (B.toppled) { if (!B.down) return false; B.core.flash = 1; B.finishOff(false); return true; }
    if (!B.active || B.dead || B.dying || B.invuln) return false;
    // a Reckoning's ward takes the blow; the one that breaks it throws the Warden down
    if (B.ward) {
      B.core.flash = 1;
      if (G.moments.wardHit(B, amount, info)) stagger();
      return true;
    }
    amount = G.sets.amp(amount, info); // (the Gloam mark: sets.js)
    let mult = t.kind === 'core' ? 1.5 : 1;
    if (B.staggered) mult *= 1.4 * G.relics.staggerK();
    if (B.hands.some((h) => h.alive && h.broken > 0)) mult *= 1.25; // exposed while a hand lies broken
    const dmg = Math.round(amount * mult);
    const floorHp = B.phase === 1 ? Math.floor(B.maxHp * 2 / 3) : B.phase === 2 ? Math.floor(B.maxHp / 3) : 0;
    B.hp = Math.max(floorHp, B.hp - dmg);
    G.player.stats.dmg += dmg; G.flow.dealt(dmg); G.sets.dealt(amount, info); G.relics.dealt(amount, info); G.run.tally(dmg, info);
    // (an ember burning, info.tick, hurts without a flinch, a number or any stagger)
    if (!info.tick) {
      if (t.kind === 'core') B.core.flash = 1; else t.ref.flash = 1;
      // struck parts recoil away from the blow
      const push = (info.dir || G.sign(t.cx - G.player.x) || 1) * (info.lance ? 16 : info.heavy ? 12 : 7);
      if (t.kind === 'core') B.core.kick = Math.min(1, (B.core.kick || 0) + (info.heavy ? 0.9 : 0.5));
      else if (t.ref) t.ref.kx = G.clamp((t.ref.kx || 0) + push, -22, 22);
      if (G.settings.numbers) {
        G.fx.text(info.x + G.rand(-12, 12), info.y - 16, String(dmg), {
          color: (t.kind === 'core' || B.staggered || info.finisher) ? '255,226,140' : '255,255,255',
          size: info.finisher ? 28 : info.heavy ? 23 : 17, life: info.finisher ? 0.8 : 0.65, pop: true,
        });
      }
      if (!B.staggered) {
        // heroes differ in how hard they stagger (info.poise); the Sunstone relic speeds it for everyone
        B.poise += (amount * (t.kind === 'hand' ? 1.5 : (B.phase === 3 ? 1.35 : 0.9)) * (info.poise || 1) + (info.lance ? 60 : 0))
          * G.relics.poiseK();
      }
    }
    if (B.hp <= 0) die();
    else if (B.phase < 3 && B.hp <= floorHp) beginPhase(B.phase + 1);
    else {
      if (t.kind === 'hand' && t.ref && usable(t.ref)) {
        t.ref.hp -= dmg;
        if (t.ref.hp <= 0) breakHand(t.ref);
      }
      if (!B.staggered && B.poise >= B.poiseMax) stagger();
    }
    return true;
  };

  // A hand's health ran out: it drops, the Warden loses the attacks that need it, and takes more damage.
  function breakHand(h) {
    const busy = h.ctrl;
    h.broken = hard() ? 9 : 12; h.hp = 0;
    h.hurt = false; h.hot = 0; h.stuck = false; h.ctrl = false;
    B.poise = Math.min(B.poiseMax - 1, B.poise + B.poiseMax * 0.3);
    G.player.gain(40);
    G.audio.play('shatter');
    G.fx.stop(0.1); G.fx.shake(13); G.fx.flash(G.pal().hot, 0.25, 0.3);
    G.fx.ring(h.x, h.y, { r0: 30, r1: 220, life: 0.5, color: G.pal().hot, width: 9 });
    G.fx.burst(h.x, h.y, { n: 16, color: '24,20,34', speed: [150, 620], life: [0.7, 1.4], size: [6, 13], kind: 'chunk', grav: 1400 });
    G.fx.burst(h.x, h.y, { n: 22, color: G.pal().hot, speed: [200, 760], life: [0.3, 0.8], kind: 'spark', size: [2, 5] });
    G.fx.shatter(h.x, h.y, G.pal().boss, 22, { hot: G.pal().hot, r: 320, jitter: 40, r0: 50 });
    G.fx.dust(h.x, h.y, 6, { speed: [30, 160], size: [12, 22], life: [0.6, 1.2], up: 60, a: 0.4, color: '84,78,100', jitter: 40 });
    G.ui.callout('HAND BROKEN', 'The Warden is exposed');
    // if it broke in the middle of its own attack, that attack is cut short
    if (busy && !B.staggered) { interrupt(); B.script = flinch(); }
  }
  function* flinch() {
    B.core.open = 0.3;
    yield* wait(0.9);
    B.core.open = 1;
    release();
  }

  // ------------------------------------------------------------------ script control
  function release() {
    const c = B.core;
    c.ctrl = false; c.charge = 0; c.pulse = 0; c.spinHint = 0; c.hurt = false; c.embedded = false; c.jit = 0; c.swellT = 0; c.hurtDmg = 0;
    for (const h of B.hands) { h.ctrl = false; h.hurt = false; h.stuck = false; h.hot = 0; }
    B.shardsOut = false; B.shardSpin = 0.9; B.haloR = 0; B.haloHurt = false;
    G.wind = 0; G.bounds = null;
    // the corrupted attacks' pieces: a chain still showing is let go and fades (see drawChain);
    // shards held in a pose drift back to their circle (see drawShards)
    if (B.chain && !B.chain.snap) B.chain.snap = 0.001;
    B.shardHold = false;
  }
  function interrupt() {
    B.script = null; B.attackName = '';
    release();
    H.clear(true);
  }

  function pushPlayer(force) {
    const P = G.player, c = B.core;
    if (P.dead) return;
    if (G.dist(P.x, P.y, c.x, c.y) < 520) {
      P.vx = (G.sign(P.x - c.x) || 1) * (force || 560); P.vy = -380; P.stun = 0.3;
      P.onGround = false; P.plat = null; P.dashT = 0; P.atk = null;
    }
  }

  function stagger() {
    interrupt();
    B.staggered = true; B.poise = B.poiseMax;
    G.audio.play('stagger');
    G.fx.stop(0.12); G.fx.shake(14); G.fx.flash(G.COL.starHot, 0.3, 0.3); G.fx.impact(B.core.x, B.core.y, 0.07);
    G.fx.ring(B.core.x, B.core.y, { r0: 60, r1: 320, life: 0.6, color: G.COL.starHot, width: 10 });
    G.fx.burst(B.core.x, B.core.y, { n: 30, color: G.pal().hot, speed: [200, 700], life: [0.3, 0.8], kind: 'spark', size: [2, 5] });
    G.fx.shatter(B.core.x, B.core.y, G.pal().boss, 20, { hot: G.pal().hot, r: 340, jitter: 30, r0: 60 });
    G.fx.punch(0.022);
    G.ui.callout('STAGGERED', 'Strike the core');
    G.relics.onStagger(); // (the Offered Hilt's echoes, the Sunstone: relics.js)
    B.script = staggerScript();
  }
  // thrown down from outside the fight (the Dying Light pair)
  B.forceStagger = function () {
    if (B.active && !B.dead && !B.dying && !B.invuln && !B.staggered && !B.ward) stagger();
  };

  function* staggerScript() {
    const c = B.core, dur = G.diff().stagger + G.relics.staggerAdd();
    c.ctrl = true;
    const drops = [tween(c, { y: FLOOR - 112, open: 0.06 }, 0.42, E.inCubic)];
    for (const h of B.hands) {
      if (!usable(h)) continue;
      h.ctrl = true;
      drops.push(tween(h, { x: G.clamp(c.x + h.side * 310, 110, 1170), y: FLOOR - 56, rot: h.side * 0.55, curl: 0.35 }, 0.48, E.inCubic));
    }
    yield* par(...drops);
    c.pv.s -= 2.6; for (const h of B.hands) if (usable(h)) { h.pv.s -= 2; h.pv.c -= 2; } // (it lands with its weight, v2.5c)
    G.fx.shake(10); G.audio.play('boom');
    G.fx.burst(c.x, FLOOR - 6, { n: 16, color: '190,190,210', speed: [60, 300], angle: -Math.PI / 2, spread: 3, life: [0.3, 0.7], size: [3, 7] });
    let e = 0;
    while (e < dur) {
      e += yield;
      B.poise = B.poiseMax * (1 - e / dur);
    }
    B.staggered = false; B.poise = 0;
    B.poiseMax = Math.min(900, B.poiseMax * 1.25);
    G.fx.ring(c.x, c.y, { r0: 40, r1: 300, life: 0.45, color: G.pal().boss, width: 8 });
    G.audio.play('ring'); G.fx.shake(8);
    pushPlayer(480);
    yield* tween(c, { y: HOME_Y[B.phase], open: 1 }, 0.6, E.outBack);
    release();
  }

  function beginPhase(n) {
    interrupt();
    B.invuln = true; B.staggered = false; B.poise = 0;
    B.phase = n; B.bag = []; B.above = 0;
    for (const h of B.hands) { h.broken = 0; h.hp = h.maxHp; } // a new phase makes the hands whole
    G.player.onPhase(); // the Wardstone relic recharges each phase
    B.script = n === 2 ? toPhase2() : toPhase3();
  }

  // Totality: the Warden drives both hands into the floor and tears two slabs of it up into the air.
  // The platforms are its doing, and the floor it has broken open is what burns next.
  function* toPhase2() {
    G.arena.layout('warden', 2, { hold: true }); // they stay in the floor until its hands haul them up
    const c = B.core, [L, R] = B.hands, plats = G.arena.platforms.filter((p) => !p.gone);
    c.ctrl = L.ctrl = R.ctrl = true;
    B.forceNext = G.corrupt.opener(B, 2) || 'tide';
    G.ui.letterbox(true);
    G.fx.impact(c.x, c.y, 0.09); G.fx.shake(16); G.fx.slow(0.25, 0.7);
    G.audio.play('stagger');
    pushPlayer();
    yield* par(
      tween(c, { x: 640, y: 236, open: 0.1 }, 0.7),
      tween(L, { x: plats[0].x + plats[0].w / 2, y: 330, curl: 1, rot: 0 }, 0.7),
      tween(R, { x: plats[1].x + plats[1].w / 2, y: 330, curl: 1, rot: 0 }, 0.7)
    );
    yield* wait(0.25);
    // down, into the floor
    for (const h of [L, R]) h.hot = 1;
    yield* par(tween(L, { y: FLOOR - 40 }, 0.11, E.inQuad), tween(R, { y: FLOOR - 40 }, 0.11, E.inQuad));
    for (const h of [L, R]) impactFx(h.x, true);
    G.fx.impact(640, FLOOR - 60, 0.08);
    G.arena.setPhase(2, 1.8);
    G.audio.setIntensity(2);
    G.audio.play('roar'); G.audio.play('card');
    G.ui.card('', 'TOTALITY', '');
    pushPlayer();
    yield* wait(0.35);
    // and up again, with the ground in its fists
    G.arena.raisePlatforms();
    c.open = 1;
    let e = 0;
    const y0 = L.y, y1 = plats[0].top + 74;
    while (e < 1.6) {
      const dt = yield;
      e += dt;
      const k = E.outCubic(Math.min(1, e / 1.6));
      L.y = R.y = G.lerp(y0, y1, k);
      c.y = G.lerp(236, 196, k);
      G.fx.shake(6 * (1 - e / 1.6));
      for (const h of [L, R]) {
        if (Math.random() < dt * 40) G.fx.burst(h.x + G.rand(-90, 90), h.y - 60, { n: 1, color: '24,20,34', speed: [20, 200], angle: Math.PI / 2, spread: 1.2, life: [0.5, 1], size: [4, 9], kind: 'chunk', grav: 1400 });
        if (Math.random() < dt * 14) G.fx.dust(h.x + G.rand(-80, 80), FLOOR, 1, { speed: [10, 70], size: [8, 14], life: [0.6, 1.1], up: 70, a: 0.36 });
      }
    }
    for (const h of [L, R]) h.hot = 0;
    yield* par(
      tween(L, { x: 640 - 400, y: 250, curl: 0, rot: -0.35 }, 0.45, E.outBack),
      tween(R, { x: 640 + 400, y: 250, curl: 0, rot: 0.35 }, 0.45, E.outBack)
    );
    G.fx.ring(c.x, c.y, { r0: c.r, r1: 760, life: 0.9, color: G.PAL[2].boss, width: 12, alpha: 0.7 });
    G.ui.letterbox(false);
    B.poiseMax = 500; B.invuln = false;
    release();
  }

  function* toPhase3() {
    const c = B.core, [L, R] = B.hands;
    c.ctrl = L.ctrl = R.ctrl = true;
    B.forceNext = 'dive';
    G.ui.letterbox(true);
    G.fx.impact(c.x, c.y, 0.09); G.fx.shake(16); G.fx.slow(0.25, 0.7);
    G.audio.play('stagger');
    yield* par(
      tween(c, { x: 640, y: 280, open: 0.1 }, 0.8),
      tween(L, { x: 640 - 210, y: 290, curl: 1, rot: 0.2 }, 0.8),
      tween(R, { x: 640 + 210, y: 290, curl: 1, rot: -0.2 }, 0.8)
    );
    // the Warden crushes its own hands into shards
    c.jit = 3;
    for (const h of [L, R]) h.hot = 1;
    yield* par(
      tween(L, { x: 640 - 120 }, 0.7, E.inCubic),
      tween(R, { x: 640 + 120 }, 0.7, E.inCubic)
    );
    for (const h of [L, R]) {
      h.alive = false; h.hurt = false;
      G.fx.burst(h.x, h.y, { n: 26, color: '24,20,34', speed: [150, 700], life: [0.8, 1.6], size: [6, 14], kind: 'chunk', grav: 1400 });
      G.fx.burst(h.x, h.y, { n: 30, color: G.PAL[3].hot, speed: [200, 800], life: [0.3, 0.9], kind: 'spark', size: [2, 5] });
    }
    G.audio.play('shatter');
    G.fx.flash(G.COL.white, 0.9, 0.9); G.fx.shake(24); G.fx.stop(0.12);
    G.arena.setPhase(3, 1.8);
    G.arena.layout('warden', 3); // the wings fall away; three steps rise towards the black sun
    G.audio.setIntensity(3);
    G.audio.play('roar'); G.audio.play('card');
    G.ui.card('', 'BLACK SUN', '');
    B.hasShards = true; B.shardR = 30;
    pushPlayer();
    c.jit = 0; c.open = 1;
    const rise = tween(c, { y: HOME_Y[3] }, 1.0, E.outCubic);
    let e = 0, ringT = 0;
    while (e < 2.0) {
      const dt = yield;
      e += dt; ringT -= dt;
      rise.next(dt);
      G.fx.shake(6 * (1 - e / 2));
      if (ringT <= 0 && e < 1.2) {
        ringT = 0.28;
        G.fx.ring(c.x, c.y, { r0: c.r, r1: 760, life: 0.9, color: G.PAL[3].boss, width: 12, alpha: 0.7 });
      }
    }
    G.ui.letterbox(false);
    B.poiseMax = 540; B.invuln = false;
    release();
  }

  // At nothing it does not die yet: the eclipse sinks to the floor with its hands either side, and
  // stays there until it is finished (see finish.js).
  function die() {
    interrupt();
    B.dying = true; B.invuln = true; B.hp = 0; B.staggered = false; B.poise = 0;
    // a Dawnbreak that empties the bar is the ending itself: no topple, it dies when the Dawnbreak is done
    if (G.state !== 'fight' || G.player.ulting) { G.onBossDying(false); B.script = deathScript(); return; }
    B.toppled = true; B.down = false;
    G.onBossToppled();
    B.script = toppleScript();
  }
  // fin: the hero's finishing blow (E); otherwise a plain blow ended it
  B.finishOff = function (fin) {
    if (!B.toppled) return false;
    B.toppled = false; B.down = false;
    G.onBossDying(fin);
    B.script = deathScript();
    return true;
  };
  function* toppleScript() {
    const c = B.core, cx = G.clamp(c.x, 300, 980);
    c.ctrl = true;
    G.audio.play('stagger'); G.fx.stop(0.14); G.fx.shake(16); G.fx.punch(0.03);
    G.fx.impact(c.x, c.y, 0.08);
    G.fx.shatter(c.x, c.y, G.pal().boss, 20, { hot: G.pal().hot, r: 340, jitter: 30, r0: 60 });
    const drops = [tween(c, { x: cx, y: FLOOR - 112, open: 0.06 }, 0.5, E.inCubic)];
    for (const h of B.hands) {
      if (!h.alive) continue;
      h.ctrl = true;
      drops.push(tween(h, { x: G.clamp(cx + h.side * 310, 110, 1170), y: FLOOR - 56, rot: h.side * 0.55, curl: 0.35 }, 0.56, E.inCubic));
    }
    yield* par(...drops);
    c.pv.s -= 2.6; for (const h of B.hands) if (h.alive) { h.pv.s -= 2; h.pv.c -= 2; }
    G.fx.shake(12); G.audio.play('boom');
    G.fx.burst(c.x, FLOOR - 6, { n: 16, color: '190,190,210', speed: [60, 300], angle: -Math.PI / 2, spread: 3, life: [0.3, 0.7], size: [3, 7] });
    yield* wait(0.15);
    B.down = true;
    while (B.toppled) { yield; c.jit = 0.6; }
  }

  function* deathScript() {
    const c = B.core;
    c.ctrl = true; c.open = 0.1;
    B.shardsOut = true;
    while (G.finish.busy || G.player.ulting) yield; // the hero's finishing blow (or Dawnbreak) first
    G.fx.slow(0.12, 1.3); G.fx.shake(22);
    if (!G.finish.played) { G.fx.flash(G.COL.white, 0.8, 0.7); G.fx.stop(0.2); G.fx.impact(c.x, c.y, 0.1); }
    G.audio.play('bossDie');
    yield* tween(c, { x: G.clamp(c.x, 300, 980), y: 290 }, 0.9, E.outCubic);
    let e = 0, next = 0;
    while (e < 2.5) {
      const dt = yield;
      e += dt; next -= dt;
      c.jit = 2 + e * 3;
      if (next <= 0) {
        next = Math.max(0.07, 0.24 - e * 0.07);
        B.rays.push({ a: G.rand(0, G.TAU), w: G.rand(0.02, 0.07), t: 0 });
        const a = G.rand(0, G.TAU), rr = G.rand(0, c.r);
        G.fx.burst(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, { n: 12, color: G.pal().hot, speed: [100, 600], life: [0.3, 0.8], size: [4, 10] });
        G.fx.shards(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, 6, G.pal().boss, { speed: [160, 600] });
        G.fx.light(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, 220, G.pal().hot, 0.18, 0.5);
        G.fx.shake(7 + e * 4);
      }
    }
    // the eclipse breaks
    G.fx.flash(G.PAL[4].hot, 1, 2.2); G.fx.shake(30);
    G.fx.burst(c.x, c.y, { n: 90, color: G.PAL[4].boss, speed: [200, 1100], life: [0.6, 1.8], size: [4, 12], drag: 1.2 });
    G.fx.burst(c.x, c.y, { n: 40, color: '18,14,24', speed: [200, 900], life: [1, 2], size: [8, 16], kind: 'chunk', grav: 1300 });
    G.fx.shatter(c.x, c.y, G.PAL[4].boss, 46, { hot: G.PAL[4].hot, r: 600, speed: [220, 980], size: [4, 11], jitter: 50, r0: 70 });
    G.fx.burst(c.x, c.y, { n: 46, color: G.PAL[4].boss, speed: [30, 280], life: [1.4, 3.2], size: [1.6, 3.6], grav: 30, wob: 110, drag: 1.2, jitter: 80 });
    if (G.arena.gust) G.arena.gust(c.x, c.y, 2.4);
    G.arena.setPhase(4, 2.6);
    B.dead = true; B.rays.length = 0; B.hasShards = false; c.jit = 0;
    G.audio.play('victory');
    yield* tween(c, { sun: 1, y: 236 }, 2.4, E.outCubic);
    yield* wait(0.7);
    G.onBossDead();
  }

  B.intro = function () { B.script = introScript(); };
  function* introScript() {
    const c = B.core, [L, R] = B.hands;
    yield* wait(0.5);
    G.audio.play('charge', { dur: 1.6 });
    yield* par(
      tween(c, { y: HOME_Y[1] }, 1.7, E.outCubic),
      tween(L, { y: HOME_Y[1] + 128 }, 1.9, E.outBack),
      tween(R, { y: HOME_Y[1] + 128 }, 2.0, E.outBack)
    );
    G.audio.play('roar'); G.audio.play('card');
    G.ui.card('', 'THE ECLIPSED WARDEN', G.run.trial > 1 ? 'Trial ' + G.roman(G.run.trial) + ' \u00b7 it remembers you' : 'Keeper of the dimmed sun');
    G.fx.shake(12);
    G.fx.ring(c.x, c.y, { r0: c.r, r1: 700, life: 0.9, color: G.pal().boss, width: 12, alpha: 0.7 });
    c.charge = 1;
    yield* wait(1.0);
    B.active = true; B.invuln = false;
    release();
  }

  // ------------------------------------------------------------------ attack selection
  const BAGS = {
    // the Flare and the Sunspot (v2.0a) are the core's alone, so they are there in every phase
    // and the Spears, the Charge and the Orbit (v2.1a), the core's alone too. (The Corona is not in a bag:
    // it is the answer to a hero riding over its head, see think)
    1: ['slam', 'sweep', 'clap', 'lance', 'rain', 'flick', 'crossfire', 'sunburst', 'flare', 'sunspot', 'spears', 'charge', 'orbit'],
    2: ['slam2', 'sweep2', 'clap', 'lance3', 'rain', 'pulse', 'comb', 'rocket', 'tide', 'fan', 'cage', 'duet', 'crossfire', 'flick', 'sunburst', 'flare', 'sunspot', 'spears', 'charge', 'orbit'],
    3: ['dive', 'storm', 'wheel', 'singularity', 'rain', 'pulse', 'fan', 'halo', 'dive', 'flare', 'sunspot', 'spears', 'charge', 'orbit'],
  };
  B.bags = BAGS; // (read by tools/motion-check.js)
  // How many whole hands an attack needs. Attacks that need more than are left are skipped.
  const NEEDS = {
    sunburst: 1, slam: 1, sweep: 1, clap: 2, slam2: 1, sweep2: 1, comb: 2, rocket: 1,
    flick: 1, crossfire: 2, cage: 2, swat: 1, duet: 1, duetSlam: 1, duetSweep: 1,
    // the corrupted two need none: with no hand left (phase III, or both broken) the shards do the hands' part
    afterhands: 0, pendulum: 0,
  };
  // A corrupted Warden's own two (corrupt.js): the Afterhands in every phase, the Pendulum from phase II.
  B.corruptBags = { 1: ['afterhands'], 2: ['afterhands', 'pendulum'], 3: ['afterhands', 'pendulum'] };
  const canUse = (name) => (NEEDS[name] || 0) <= usableHands().length;

  function refillBag() {
    const src = BAGS[B.phase].concat(G.corrupt.extra(B, B.phase)); // (a corrupted Warden's own two, corrupt.js)
    for (let tries = 0; tries < 8; tries++) {
      B.bag = G.shuffle(src.slice());
      let ok = B.bag[B.bag.length - 1] !== B.lastAtk;
      for (let i = 1; i < B.bag.length && ok; i++) if (B.bag[i] === B.bag[i - 1]) ok = false;
      if (ok) break;
    }
  }
  function nextAttack() {
    if (B.forceNext) {
      const f = B.forceNext;
      B.forceNext = '';
      if (canUse(f)) { B.lastAtk = f; return f; }
    }
    // resting on a platform for too long gets it knocked down
    if (B.phase === 2 && B.campT > 2.4 && B.lastAtk !== 'swat' && canUse('swat') && G.arena.platforms.length && G.arena.platforms.every((p) => p.rise >= 1)) {
      B.campT = 0; B.lastAtk = 'swat';
      return 'swat';
    }
    // nor will it let you live in the air: something aimed comes up after you
    if (B.airT > 2.4) {
      const pick = B.phase === 3 ? 'storm' : canUse('flick') ? 'flick' : B.phase === 2 ? 'lance3' : 'lance';
      if (pick !== B.lastAtk) { B.airT = 0; B.lastAtk = pick; return pick; }
    }
    for (let guard = 0; guard < 40; guard++) {
      if (!B.bag.length) refillBag();
      const n = B.bag.pop();
      if (canUse(n)) { B.lastAtk = n; return n; }
    }
    B.lastAtk = B.phase === 3 ? 'rain' : 'lance';
    return B.lastAtk;
  }

  const ABOVE_T = 1.4; // (as the other bosses, js/bosskit.js)
  function* think() {
    const low = B.phase === 3 && B.hp < B.maxHp * 0.12;
    const gap = [0, 0.95, 0.75, 0.6][B.phase] * G.diff().pace * (low ? 0.55 : 1);
    yield* wait(gap);
    let name = G.debug.forceAttack || '';
    // the last stand: once, when the Warden is nearly spent
    if (!name && low && !B.lastStand) { B.lastStand = true; name = 'supernova'; }
    if (!name && G.moments.due(B)) name = 'reckoning';
    // a hero who keeps riding over its head (bouncing on the core, or hanging above it) is answered from
    // below, at where they are: the Corona (v2.1a)
    if (!name && B.above >= ABOVE_T && B.lastAtk !== 'corona') { name = 'corona'; B.lastAtk = name; B.above = 0; }
    if (!name) name = nextAttack();
    if (!ATTACKS[name] || !canUse(name)) name = B.phase === 3 ? 'rain' : 'lance';
    B.attackName = name;
    yield* ATTACKS[name]();
    // back to rest: a hand that was used shakes itself out and flexes on its way home; if it was the
    // core's doing alone, the eye closes for a moment
    const used = B.hands.filter((h) => h.ctrl && usable(h));
    for (const h of used) h.flex = 1;
    if (!used.length && !B.core.embedded) B.core.blink = 0.24;
    B.attackName = '';
    release();
  }

  // ------------------------------------------------------------------ attack helpers
  const hard = () => G.fierce();
  const gentle = () => G.settings.difficulty === 0;

  // A column warning that scripts move and fill by hand.
  function columnMark(x, w) {
    return H.add({
      kind: 'mark', layer: 'under', x, w, k: 0, locked: false,
      update() { },
      draw(ctx) {
        const l = this.x - this.w / 2, top = FLOOR - 330;
        const late = this.locked ? 0.5 + 0.5 * Math.sin(this.t * 55) : 0;
        const g = ctx.createLinearGradient(0, top, 0, FLOOR);
        g.addColorStop(0, G.rgba(DANGER, 0));
        g.addColorStop(1, G.rgba(DANGER, 0.12 + 0.1 * this.k + 0.12 * late));
        ctx.fillStyle = g; ctx.fillRect(l, top, this.w, FLOOR - top);
        ctx.fillStyle = G.rgba(DANGER, 0.14 + 0.1 * late);
        ctx.beginPath(); ctx.ellipse(this.x, FLOOR - 1, this.w / 2, 10, 0, 0, G.TAU); ctx.fill();
        ctx.fillStyle = G.rgba(DANGER, 0.36);
        ctx.beginPath(); ctx.ellipse(this.x, FLOOR - 1, this.w / 2 * this.k, 10 * this.k, 0, 0, G.TAU); ctx.fill();
        ctx.strokeStyle = G.rgba(DANGER, 0.55 + 0.4 * this.k); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(this.x, FLOOR - 1, this.w / 2, 10, 0, 0, G.TAU); ctx.stroke();
      },
    });
  }

  // One-step damage check for an impact.
  function crush(x, cy, hw, hh, dmg) {
    H.add({
      kind: 'crush', x, dmg,
      update() { if (this.t > 0.07) this.dead = true; },
      hits(P) { return G.rectsOverlap(P.box(), { cx: x, cy, hw, hh }); },
    });
  }
  // The core landing: round, as the core is (v2.1b: a box round it reached 60 px past the drawn disc
  // along the floor; the shockwaves that follow carry the blow out along it).
  function crushCore(dmg) {
    const c = B.core, x = c.x, y = c.y, r = c.r + 12;
    H.add({
      kind: 'crush', x, dmg,
      update() { if (this.t > 0.07) this.dead = true; },
      hits(P) { return G.circleRect(x, y, r, P.box()); },
    });
  }

  function impactFx(x, big) {
    const P = G.pal();
    G.fx.shake(big ? 22 : 15); G.fx.punch(big ? 0.035 : 0.02);
    G.audio.play('slam');
    G.fx.ring(x, FLOOR - 4, { r0: 20, r1: big ? 260 : 170, life: 0.4, color: P.hot, width: 8 });
    G.fx.thud(x, FLOOR, big ? 2 : 1.3, { col: P.boss });
    G.fx.light(x, FLOOR - 30, big ? 320 : 220, P.hot, 0.2, 0.5);
    G.fx.burst(x, FLOOR - 6, { n: big ? 14 : 8, color: '22,18,32', speed: [150, 560], angle: -Math.PI / 2, spread: 2.2, life: [0.6, 1.2], size: [5, 11], kind: 'chunk', grav: 1500 });
    G.fx.burst(x, FLOOR - 6, { n: big ? 24 : 12, color: P.boss, speed: [150, 600], angle: -Math.PI / 2, spread: 2.6, life: [0.2, 0.6], kind: 'spark', size: [2, 4], grav: 900 });
  }

  function nearHand() {
    const alive = usableHands();
    const P = G.player;
    return alive.sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x))[0];
  }
  const other = (h) => B.hands.find((o) => o !== h);

  // ------------------------------------------------------------------ phase 1 attacks
  function* slam(h, o) {
    const T = G.diff().tele, P = G.player;
    if (!usable(h)) return;
    h.ctrl = true; h.stuck = false;
    G.audio.play('charge', { dur: 0.95 * T });
    const m = columnMark(h.x, 156);
    let e = 0;
    // heavy: the fist glows and trembles all the way up. It lands for two, and a second wave follows the first.
    const trackT = o.track * T * (o.heavy ? 1.2 : 1);
    // (v2.5c) Each form has its own body from the first moment it comes over:
    //   plain: a tight fist upright, drawn up a little as it clenches (one finger after another)
    //   heavy: the fist swells, its wrist turned back, glowing and trembling all the way
    //   late:  plain until the lock, where it already starts to open and cock back as it rises
    while (e < trackT) {
      const dt = yield;
      e += dt;
      const k = e / trackT, g = E.outCubic(Math.min(1, k / 0.35));
      if (o.heavy) {
        h.hot = 1; h.pt.g = 0.09 * g; h.pt.r = h.side * 0.3 * g; h.pt.sh = 3 + 2.5 * k;
        if (Math.random() < dt * 40) G.fx.spawn({ x: h.x + G.rand(-50, 50), y: h.y + G.rand(-40, 60), vx: G.rand(-30, 30), vy: -G.rand(40, 140), life: G.rand(0.3, 0.6), size: G.rand(2, 4.5), color: DANGER, wob: 50, rot: G.rand(0, 6) });
      } else {
        h.pt.y = -12 * Math.sin(Math.PI * Math.min(1, k / 0.5)); h.pt.s = 0.03 * g;
      }
      const tx = G.clamp(P.x + P.vx * 0.14, WL + 80, WR - 80);
      h.x = G.damp(h.x, tx, 7.5, dt); h.y = G.damp(h.y, 226, 7, dt);
      h.curl = G.damp(h.curl, 1, 12, dt); h.rot = G.damp(h.rot, 0, 12, dt);
      m.x = h.x; m.k = e / trackT * 0.7;
    }
    m.locked = true; h.hot = 1;
    const y0 = h.y, lockT = 0.27 * T, lift = o.late ? 58 : 36;
    e = 0;
    while (e < lockT) {
      e += yield;
      const k = Math.min(1, e / lockT);
      h.y = y0 - lift * E.outCubic(k);
      m.k = 0.7 + 0.3 * k;
      // drawn: the weight settles first (a short dip, squashed), then it hauls up, slowing as it rises
      const dip = k < 0.3 ? Math.sin(Math.PI * k / 0.3) : 0, up = E.outCubic(G.clamp((k - 0.12) / 0.88, 0, 1));
      h.pt.y = y0 + 14 * dip - lift * up - h.y;
      h.pt.s = -0.07 * dip + 0.05 * up * (1 - 0.6 * k);
      if (o.heavy) { h.pt.g = 0.09; h.pt.r = h.side * (0.3 + 0.16 * up); h.pt.sh = 5.5; }
      else if (o.late) { h.pt.r = -h.side * 0.14 * up; h.pt.c = -0.22 * up; h.pt.sh = 1.5 * up; }
      else { h.pt.r = h.side * 0.1 * up; h.pt.sh = k > 0.6 ? 1.2 : 0; }
    }
    if (o.late) {
      // the delayed blow (v2.1a): it draws up higher and hangs there, knuckles cocked back, opening and
      // closing once before it drops, a breath after a hero who goes on the flash expects it
      yield* during(0.36 * T, (k, dt, q) => {
        h.y = y0 - 58 - 8 * Math.sin(Math.PI * k);
        h.rot = -h.side * 0.18 * Math.sin(Math.PI * k);
        h.curl = 1 - 0.3 * Math.sin(Math.PI * Math.min(1, k * 1.6));
        h.pt.r = -h.side * 0.14 * (1 - k * k); h.pt.c = -0.22 * (1 - k); h.pt.sh = 1.5 + 1.5 * k;
      });
      h.curl = 1; h.rot = 0;
    }
    h.hurt = true; h.hurtDmg = o.heavy ? 2 : 1;
    // the fall: it speeds up all the way, drawn out by it (and the cocked wrist whips straight)
    yield* par(tween(h, { y: FLOOR - 64 }, 0.085, E.inQuad), during(0.085, () => { h.pt.s = 0.07; if (o.heavy) h.pt.g = 0.09; }));
    m.dead = true;
    // it lands: squashed on the floor, a small rebound, the fingers jarred
    h.pv.s -= o.heavy ? 2.6 : 2; h.pv.y -= o.heavy ? 70 : 110; h.pv.c -= 1.5;
    impactFx(h.x, !!o.heavy);
    H.shockwave(h.x - 56, -1, o.wave, 46);
    H.shockwave(h.x + 56, 1, o.wave, 46);
    yield* wait(0.07);
    h.hurt = false; h.hot = 0; h.stuck = true;
    if (o.heavy) {
      // the heat still in it: it pounds the floor once more, from where it lies
      yield* during(0.42, (k) => { h.pt.s = -0.05 * E.inQuad(k); h.pt.y = -10 * E.inQuad(k); h.pt.sh = 2.5 * k; });
      G.fx.shake(8); G.audio.play('boom');
      h.pv.s -= 2; h.pv.y += 120;
      H.shockwave(h.x - 56, -1, o.wave, 46);
      H.shockwave(h.x + 56, 1, o.wave, 46);
      yield* wait(0.4); // it took more out of the hand: it is stuck for longer
    }
    // stuck fast: it strains to pull free (bunching down against the floor), and tears loose at the end
    if (o.stuck > 0.3) {
      const sy = h.y;
      yield* during(o.stuck, (k, dt, q) => {
        h.kx = Math.sin(q * 31) * (0.6 + 2.2 * k * k);
        h.rot = Math.sin(q * 6.5) * 0.05 * k;
        if (k < 0.82) h.pt.s = -0.05 * E.inQuad(k / 0.82);
        else { h.y = G.lerp(sy, sy - 22, E.outQuad((k - 0.82) / 0.18)); h.pt.s = 0.05; }
        if (Math.random() < dt * (3 + 8 * k)) G.fx.dust(h.x + G.rand(-56, 56), FLOOR, 1, { speed: [10, 60], size: [4, 8], up: 20, a: 0.3 });
      });
      h.rot = 0;
      G.fx.burst(h.x, FLOOR - 8, { n: 6, color: '22,18,32', speed: [80, 260], angle: -Math.PI / 2, spread: 1.6, life: [0.4, 0.8], size: [3, 7], kind: 'chunk', grav: 1500 });
    } else yield* wait(o.stuck);
    h.stuck = false;
  }

  function* atkSlam() {
    // (v2.1a: stuck for longer, the opening a slam gives; and a delayed form, not with the heavy one)
    const heavy = chance(0.3, 'heavy');
    yield* slam(nearHand(), { track: 0.72, stuck: 1.55, wave: 470, heavy, late: !heavy && chance(0.3, 'late') });
  }

  function* sweepOnce(h, fromX, toX, tele, seen) {
    const dir = G.sign(toX - fromX);
    H.lane({ x: WL, y: FLOOR - 116, w: WR - WL, h: 116, dir, dur: tele });
    G.audio.play('charge', { dur: tele });
    h.hot = 1;
    // (v2.5c) the wind-up: it coils, fingers drawing in to a scoop, crouches and leans back from the way
    // it will go; then holds there, trembling more and more
    const xs = h.x;
    yield* during(tele, (k) => {
      h.x = G.lerp(xs, fromX - dir * 26, E.outCubic(k));
      const q = E.inOutQuad(Math.min(1, k / 0.55));
      h.pt.c = 0.38 * q; h.pt.r = -dir * 0.22 * q; h.pt.s = -0.06 * q;
      h.pt.sh = k > 0.65 ? 2.6 * (k - 0.65) / 0.35 : 0;
    });
    h.hurtDmg = 1;
    G.audio.play('sweep');
    const dur = 0.66, x0 = h.x;
    let e = 0;
    while (e < dur) {
      e += yield;
      // a beat of grace as it starts, so a jump on the flash clears it even right beside the hand
      h.hurt = e > 0.09;
      h.x = G.lerp(x0, toX, E.inOutQuad(Math.min(1, e / dur)));
      // (it uncoils: fingers flat and splayed, dragging along the floor)
      h.pt.c = -0.2;
      // (did the hero go over it? the Sweep's return answers a jump)
      if (seen && !G.player.onGround && Math.abs(h.x - G.player.x) < 80) seen.jumped = true;
      G.fx.shake(2.5);
      G.fx.burst(h.x - dir * 50, FLOOR - 4, { n: 1, color: '190,190,210', speed: [40, 200], angle: -Math.PI / 2, spread: 2, life: [0.3, 0.6], size: [4, 8] });
      G.fx.burst(h.x - dir * 40, FLOOR - G.rand(10, 100), { n: 1, color: G.pal().boss, speed: [40, 200], angle: dir > 0 ? Math.PI : 0, spread: 0.8, life: [0.2, 0.4], size: [3, 6] });
    }
    h.hurt = false; h.hot = 0;
    // its weight carries it a little past where it stops, and it settles back
    h.pv.x += dir * 220;
    G.fx.dust(h.x + dir * 50, FLOOR, 3, { dir, speed: [30, 160], size: [6, 10], up: 30 });
  }

  function* sweep(h, back, branch) {
    const T = G.diff().tele;
    h.ctrl = true;
    const fromX = h.side > 0 ? WR - 70 : WL + 70, toX = h.side > 0 ? WL + 70 : WR - 70;
    // the hand lies on its side, low enough that one jump clears it (it comes down with its weight, v2.5c)
    yield* tween(h, { x: fromX, y: FLOOR - 58, curl: 0.3, rot: -h.side * Math.PI / 2 }, 0.5);
    h.pv.s -= 1.6; h.pv.c -= 2;
    G.fx.dust(h.x, FLOOR, 3, { speed: [20, 120], size: [6, 10], up: 30 });
    const seen = {};
    yield* sweepOnce(h, fromX, toX, 0.8 * T, seen);
    if (back) {
      yield* wait(0.2);
      yield* sweepOnce(h, toX, fromX, 0.55 * T);
    } else if (branch && seen.jumped && chance(0.6, 'return')) {
      // (v2.1a) it felt the hero go over it: the hand skids into the wall, rolls over onto its other
      // side with a heave, and comes back along the floor
      const dir = G.sign(toX - fromX), r0 = h.rot;
      G.fx.dust(h.x + dir * 40, FLOOR, 4, { dir: -dir, speed: [40, 200], size: [6, 11], up: 50 });
      G.fx.shake(4); G.audio.play('boom');
      yield* during(0.34, (k, dt) => {
        h.rot = G.lerp(r0, -r0, E.inOutCubic(k));
        h.y = FLOOR - 58 - Math.sin(Math.PI * k) * 46;
        h.x = toX + dir * 10 * Math.sin(Math.PI * k);
        h.curl = 0.3 + 0.4 * Math.sin(Math.PI * k);
      });
      h.pv.s -= 1.4;
      yield* sweepOnce(h, toX, fromX, 0.5 * T);
    }
    yield* wait(0.35);
  }
  function* atkSweep() { yield* sweep(G.rpick(usableHands()), false, true); }
  function* atkSweep2() { yield* sweep(G.rpick(usableHands()), true); }

  function* atkClap() {
    const [L, R] = B.hands, T = G.diff().tele, P = G.player;
    L.ctrl = R.ctrl = true;
    let cx = G.clamp(P.x, 240, 1040);
    yield* par(
      // (v2.1b: 16 px lower, from FLOOR - 125, so the palms meet at the head of a hero standing under
      // them, as the blow does: they used to close a hand's breadth above it and hurt all the same)
      tween(L, { x: cx - 340, y: FLOOR - 109, curl: 0, rot: 0.3 }, 0.5),
      tween(R, { x: cx + 340, y: FLOOR - 109, curl: 0, rot: -0.3 }, 0.5)
    );
    const m = columnMark(cx, 236);
    G.audio.play('charge', { dur: 0.95 * T });
    let e = 0;
    const tt = 0.65 * T;
    // (v2.5c) two open palms held wide, fingers splayed, leaning back further and further: the silhouette
    // only the Clap has; at the lock they draw back and up, arms cocked, and hold, trembling
    while (e < tt) {
      const dt = yield;
      e += dt;
      cx = G.damp(cx, G.clamp(P.x, 200, 1080), 5.5, dt);
      L.x = cx - 340; R.x = cx + 340; m.x = cx; m.k = e / tt * 0.7;
      const k = e / tt;
      for (const h of [L, R]) { h.pt.c = -0.22 * Math.min(1, k * 2); h.pt.r = h.side * 0.14 * E.inOutQuad(k); h.pt.y = 4 * Math.sin(B.t * 5 + h.side); }
    }
    m.locked = true; L.hot = R.hot = 1;
    const lockT = 0.3 * T;
    e = 0;
    while (e < lockT) {
      e += yield;
      const k = Math.min(1, e / lockT);
      L.x = cx - 340 - 44 * E.outCubic(k); R.x = cx + 340 + 44 * E.outCubic(k);
      m.k = 0.7 + 0.3 * k;
      for (const h of [L, R]) {
        h.pt.c = -0.26; h.pt.r = h.side * (0.14 + 0.22 * E.outCubic(k)); h.pt.y = -14 * E.outCubic(k);
        h.pt.s = 0.04 * k; h.pt.sh = k > 0.55 ? 2 : 0;
      }
    }
    // shut: they swing in, faster and faster, leaning into it
    yield* par(
      tween(L, { x: cx - 60, rot: 0 }, 0.1, E.inQuad), tween(R, { x: cx + 60, rot: 0 }, 0.1, E.inQuad),
      during(0.1, () => { for (const h of [L, R]) { h.pt.r = -h.side * 0.1; h.pt.c = -0.1; } })
    );
    m.dead = true;
    // the palms meet: squeezed, they bounce apart a little and settle back, fingers flung open
    for (const h of [L, R]) { h.pv.x += h.side * 380; h.pv.s += 2.2; h.pv.c -= 4; }
    crush(cx, FLOOR - 107, 112, 112, 2); // (from the tips of the longest fingers, 8 px under them, to the floor)
    const pal = G.pal();
    G.audio.play('clap');
    G.fx.shake(18); G.fx.punch(0.025); G.fx.flash(pal.hot, 0.2, 0.2);
    G.fx.ring(cx, FLOOR - 125, { r0: 30, r1: 300, life: 0.45, color: pal.hot, width: 10 });
    G.fx.burst(cx, FLOOR - 125, { n: 34, color: pal.boss, speed: [200, 800], life: [0.2, 0.7], kind: 'spark', size: [2, 5] });
    G.fx.shatter(cx, FLOOR - 125, pal.boss, 12, { hot: pal.hot, r: 360, r0: 40 });
    for (const d of [-1, 1]) G.fx.dust(cx + d * 60, FLOOR, 6, { dir: d, speed: [160, 560], size: [8, 15], life: [0.5, 1], up: 50 });
    if (G.arena.gust) G.arena.gust(cx, FLOOR - 125, 2);
    if (B.phase >= 2) {
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.36;
        H.orb(cx, FLOOR - 190, Math.cos(a) * 560, Math.sin(a) * 560, { grav: 1000, r: 12 });
      }
    }
    L.hot = R.hot = 0; L.stuck = R.stuck = true;
    yield* wait(B.phase === 1 ? 1.15 : 0.9);
    L.stuck = R.stuck = false;
  }

  // blink: the eye shuts once, quickly, for each lance it is about to throw. That is the tell.
  function* lances(n, blink) {
    const c = B.core, T = G.diff().tele, P = G.player;
    if (blink) {
      c.blink = 0; c.blinkT = Math.max(c.blinkT, 2.4); // no idle blink in the middle of the count
      yield* wait(0.2);
      for (let k = 0; k < n; k++) {
        G.audio.play('uiMove');
        G.fx.ring(c.x, c.y, { r0: 104, r1: 62, life: 0.16, color: '255,236,190', width: 3 });
        yield* tween(c, { open: 0.06 }, 0.07, E.inQuad);
        yield* tween(c, { open: 1 }, 0.09, E.outQuad);
        yield* wait(0.13);
      }
      yield* wait(0.12);
    }
    for (let i = 0; i < n; i++) {
      const tele = (i === 0 ? 0.85 : 0.55) * T;
      c.charge = 1;
      G.audio.play('charge', { dur: tele });
      const bm = H.beam({
        ox: c.x, oy: c.y, ang: Math.atan2(P.y - 22 - c.y, P.x - c.x),
        tele, lock: 0.28 * T, active: 0.34, width: 42,
        follow(b, dt) {
          b.ox = c.x; b.oy = c.y;
          if (!b.locked) {
            const ta = Math.atan2(P.y - 22 - c.y, P.x - c.x);
            b.ang += G.angDiff(b.ang, ta) * Math.min(1, dt * 10);
          }
        },
      });
      // (v2.5c, drawn only) it draws itself in as the lance gathers and trembles once it is locked; the
      // throw jolts it back off the line, and its free hands with it
      let thrown = false;
      yield* during(tele + 0.34 + (i < n - 1 ? 0.1 : 0.3), (k, dt, e) => {
        if (e < tele) { const q = e / tele; c.pt.g = -0.045 * E.inOutQuad(q); c.pt.sh = q > 0.68 ? 1.3 : 0; }
        else if (!thrown) {
          thrown = true;
          c.pv.x -= Math.cos(bm.ang) * 320; c.pv.y -= Math.sin(bm.ang) * 320; c.pv.g += 1.4;
          for (const h of usableHands()) if (!h.ctrl) { h.pv.x -= Math.cos(bm.ang) * 200; h.pv.y -= Math.sin(bm.ang) * 200; h.pv.c -= 2; }
        }
      });
    }
    c.charge = 0;
  }
  const chance = (p, tag) => G.kit.chance(p, tag);
  function* atkLance() { yield* lances(chance(0.45, 'n2') ? 2 : 1, true); }
  function* atkLance3() {
    // one, two or three; with variants turned off for a test it is three, as it always was
    const n = G.debug.variant === 'plain' ? 3 : chance(0.34, 'n1') ? 1 : chance(0.5, 'n2') ? 2 : 3;
    yield* lances(n, true);
  }

  function* atkRain() {
    const c = B.core, T = G.diff().tele, P = G.player;
    const n = [0, 8, 11, 14][B.phase] + (hard() ? 2 : 0);
    const gap = [0, 0.27, 0.23, 0.19][B.phase];
    c.charge = 1;
    G.audio.play('charge', { dur: 0.5 * T });
    // (v2.5c, drawn only) it sinks and squats before it throws; each throw upward heaves it down a
    // little, and its raised hands pump with it
    yield* during(0.5 * T, (k) => { const q = E.inOutQuad(k); c.pt.y = 14 * q; c.pt.s = -0.06 * q; });
    for (let i = 0; i < n; i++) {
      G.audio.play('orb');
      c.pv.y += 200; c.pv.s += 1.3;
      for (const h of usableHands()) if (!h.ctrl) { h.pv.y -= 230; h.pv.c -= 2.5; }
      G.fx.spawn({ x: c.x + G.rand(-30, 30), y: c.y - c.r, vx: G.rand(-120, 120), vy: -1100, life: 0.4, size: 12, color: G.pal().boss });
      const x = i % 2 === 0
        ? G.clamp(P.x + P.vx * 0.35 + G.rrand(-24, 24), WL + 50, WR - 50)
        : G.rrand(WL + 60, WR - 60);
      H.meteor({ x, tele: 0.85 * T });
      yield* wait(gap);
    }
    c.charge = 0;
    yield* wait(0.7);
  }

  // ------------------------------------------------------------------ phase 2 attacks
  function* atkSlam2() {
    const a = nearHand(), b = usable(other(a)) ? other(a) : a;
    const n = hard() ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const h = i % 2 === 0 ? a : b, last = i === n - 1;
      yield* slam(h, { track: i === 0 ? 0.62 : 0.5, stuck: last ? 1.35 : 0.12, wave: 540, late: last && chance(0.35, 'late') });
      if (!last) h.ctrl = false;
    }
  }

  function* atkPulse() {
    const c = B.core, T = G.diff().tele;
    c.ctrl = true;
    G.ui.hint('ring', 'Dash through the rings');
    yield* tween(c, { x: 640, y: 300 }, 0.6);
    const n = (B.phase === 3 ? 3 : 2) + (hard() ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const tt = (i === 0 ? 0.85 : 0.55) * T;
      c.charge = 1;
      G.audio.play('charge', { dur: tt });
      let e = 0;
      // (v2.5c, drawn only) it draws in on itself as the ring gathers, trembling at the last, and the
      // ring bursts out of it with a swell (its free hands clench close, then are flung wide)
      while (e < tt) { e += yield; c.pulse = Math.min(1, e / tt); c.pt.g = -0.07 * E.inQuad(c.pulse); c.pt.sh = c.pulse > 0.75 ? 1.4 : 0; }
      c.pulse = 0;
      c.pv.g += 2.2;
      for (const h of usableHands()) if (!h.ctrl) { h.pv.x += h.side * 300; h.pv.c -= 5; }
      H.ring({ x: c.x, y: c.y, r: c.r, speed: gentle() ? 440 : 530, thick: 26, maxR: 1000 });
      G.audio.play('ring'); G.fx.shake(8);
      yield* wait(0.5);
    }
    c.charge = 0;
    yield* wait(0.5);
  }

  function* atkComb() {
    const [L, R] = B.hands, T = G.diff().tele;
    L.ctrl = R.ctrl = true;
    yield* par(
      tween(L, { x: 330, y: 96, rot: Math.PI, curl: 0.1 }, 0.6),
      tween(R, { x: 950, y: 96, rot: -Math.PI, curl: 0.1 }, 0.6)
    );
    const lanes = 11, lw = (WR - WL) / lanes;
    const volleys = hard() ? 4 : 3;
    let parity = G.rng() < 0.5 ? 0 : 1;
    for (let v = 0; v < volleys; v++) {
      L.hot = R.hot = 1;
      G.audio.play('charge', { dur: 0.85 * T });
      let first = true;
      for (let i = 0; i < lanes; i++) {
        if (i % 2 !== parity) continue;
        H.zone({
          x: WL + i * lw + 7, y: -60, w: lw - 14, h: FLOOR + 60, tele: 0.85 * T, active: 0.4, style: 'column',
          onFire: first ? () => { G.audio.play('beam'); G.fx.shake(7); } : null,
        });
        first = false;
      }
      // (v2.5c) upside down at the top of the view, the fingers draw in to claws and the hands pull up as
      // the columns fill; as they burst the hands rake down, fingers flung open
      let raked = false;
      yield* during(0.85 * T + 0.1, (k, dt, e) => {
        const q = Math.min(1, e / (0.85 * T));
        for (const h of [L, R]) { h.pt.c = 0.45 * E.inOutQuad(q); h.pt.y = -16 * E.outQuad(q); h.pt.sh = q > 0.75 ? 1.8 : 0; }
        if (!raked && q >= 1) { raked = true; for (const h of [L, R]) { h.pv.y += 520; h.pv.c -= 7; } }
      });
      parity = 1 - parity;
    }
    yield* wait(0.55);
    L.hot = R.hot = 0;
  }

  function* atkRocket() {
    const P = G.player, T = G.diff().tele;
    const h = G.rpick(usableHands());
    h.ctrl = true;
    const sx = h.side > 0 ? WR - 78 : WL + 78, dir = -h.side;
    const aimY = () => G.clamp(P.y - 36, 150, FLOOR - 66);
    yield* tween(h, { x: sx, y: aimY(), curl: 1, rot: -h.side * Math.PI / 2 }, 0.5);
    const total = 0.9 * T;
    const m = H.lane({ x: WL, y: h.y - 64, w: WR - WL, h: 128, dir, dur: total });
    G.audio.play('charge', { dur: total });
    let e = 0;
    // (v2.5c) a fist on its side at the wall, knuckles leading: it settles back against the stone as it
    // follows the hero up and down, rumbling
    while (e < 0.62 * T) {
      const dt = yield;
      e += dt;
      h.y = G.damp(h.y, aimY(), 6, dt);
      m.y = h.y - 64;
      h.pt.x = h.side * 8 * E.outQuad(Math.min(1, e / (0.62 * T))); h.pt.sh = 0.8;
    }
    h.hot = 1;
    // the pull-back: it winds tight against the wall like a spring, wrist twisting back, trembling harder
    yield* par(tween(h, { x: sx + h.side * 34 }, 0.28 * T, E.outCubic), during(0.28 * T, (k) => {
      const q = E.outQuad(k);
      h.pt.s = 0.09 * q; h.pt.r = h.side * 0.28 * q; h.pt.x = h.side * 8 * (1 - k); h.pt.sh = 1 + 2.6 * k;
    }));
    h.hurt = true; h.hurtDmg = 1;
    G.audio.play('streak');
    const tx = h.side > 0 ? WL + 60 : WR - 60, x0 = h.x;
    e = 0;
    while (e < 0.4) {
      e += yield;
      h.x = G.lerp(x0, tx, E.inQuad(Math.min(1, e / 0.4)));
      G.fx.burst(h.x - dir * 60, h.y + G.rand(-40, 40), { n: 2, color: G.pal().boss, speed: [40, 240], angle: dir > 0 ? Math.PI : 0, spread: 0.7, life: [0.2, 0.5], size: [4, 9] });
    }
    h.hurt = false; h.hot = 0; h.stuck = true;
    h.pv.s += 2.4; h.pv.x -= dir * 260; // (squashed against the far wall, it rebounds a little and settles into it)
    G.fx.shake(16); G.fx.punch(0.02); G.audio.play('slam');
    G.fx.dust(h.x + dir * 50, h.y, 9, { dir: -dir, speed: [80, 420], size: [9, 16], life: [0.5, 1], up: 90, a: 0.42, jitter: 40 });
    G.fx.burst(h.x + dir * 50, h.y, { n: 10, color: '22,18,32', speed: [150, 520], angle: dir > 0 ? Math.PI : 0, spread: 2.2, life: [0.6, 1.1], size: [5, 10], kind: 'chunk', grav: 1500 });
    G.fx.kick(dir * 8, 0);
    for (let i = 0; i < 4; i++) {
      H.orb(h.x + dir * 30, h.y - 20, -dir * G.rrand(140, 460), -G.rrand(280, 640), { grav: 1100, r: 11 });
    }
    yield* wait(1.15);
    h.stuck = false;
  }

  function* atkTide() {
    const c = B.core, T = G.diff().tele;
    G.ui.hint('tide', 'The floor will burn. Get onto a platform');
    c.charge = 1; B.tideLit = false;
    G.audio.play('charge', { dur: 1.45 * T });
    H.zone({
      x: WL, y: FLOOR - 34, w: WR - WL, h: 34, tele: 1.45 * T, active: 2.7, style: 'tide', popVy: -780,
      onFire() { G.audio.play('tide'); G.fx.shake(7); },
    });
    // it sinks and bears down as the floor fills (its free hands press it), and heaves up as it burns
    const tt = 1.45 * T;
    yield* during(tt + 0.3, (k, dt, e) => {
      const q = E.inOutQuad(Math.min(1, e / tt));
      if (e < tt) { c.pt.y = 18 * q; c.pt.s = -0.06 * q; c.pt.sh = q > 0.8 ? 1.3 : 0; }
      else if (!B.tideLit) {
        B.tideLit = true; c.pv.y -= 340; c.pv.g += 1.2;
        for (const h of usableHands()) if (!h.ctrl) { h.pv.y += 260; h.pv.c -= 4; }
      }
    });
    yield* lances(hard() ? 2 : 1);
    yield* wait(0.9);
  }

  // ------------------------------------------------------------------ phase 3 attacks
  function* atkDive() {
    const c = B.core, T = G.diff().tele, P = G.player;
    c.ctrl = true;
    yield* tween(c, { y: -190 }, 0.5, E.inBack);
    c.x = G.clamp(P.x, 150, 1130);
    const m = columnMark(c.x, 236);
    G.audio.play('charge', { dur: 1.15 * T });
    let e = 0;
    const tt = 0.85 * T;
    while (e < tt) {
      const dt = yield;
      e += dt;
      c.x = G.damp(c.x, G.clamp(P.x + P.vx * 0.15, 150, 1130), 6.5, dt);
      m.x = c.x; m.k = e / tt * 0.7;
    }
    m.locked = true;
    const lockT = 0.3 * T;
    e = 0;
    while (e < lockT) { e += yield; m.k = 0.7 + 0.3 * Math.min(1, e / lockT); }
    c.hurt = true;
    // (v2.5c, drawn only) drawn out by the fall, squashed flat by the floor, and it settles
    yield* par(tween(c, { y: FLOOR - c.r + 16 }, 0.16, E.inQuad), during(0.16, () => { c.pt.s = 0.07; }));
    m.dead = true;
    c.pv.s -= 3; c.pv.g += 0.6;
    impactFx(c.x, true);
    crushCore(2);
    H.shockwave(c.x - 90, -1, 600, 54);
    H.shockwave(c.x + 90, 1, 600, 54);
    // debris always lands in the same two rings, so staying close to the core is the safe choice
    for (const [ang, speed] of [[-0.8, 680], [-0.4, 520], [0.4, 520], [0.8, 680]]) {
      const a = -Math.PI / 2 + ang;
      H.orb(c.x, FLOOR - 120, Math.cos(a) * speed, Math.sin(a) * speed, { grav: 1000, r: 12 });
    }
    yield* wait(0.08);
    c.hurt = false; c.embedded = true; c.open = 0.25;
    // stuck in the floor it strains to rise (bunching), and heaves itself up out of it
    yield* during(hard() ? 1.2 : 1.6, (k) => { c.pt.s = -0.05 * E.inQuad(k); c.pt.sh = k > 0.75 ? 1.6 : 0; });
    c.embedded = false; c.open = 1;
    c.pv.s += 1.6;
    yield* tween(c, { y: HOME_Y[3] }, 0.7, E.outCubic);
  }

  function* atkStorm() {
    const T = G.diff().tele, P = G.player, c = B.core;
    const n = hard() ? 9 : 7;
    B.shardsOut = true;
    G.audio.play('charge', { dur: 0.4 });
    // (v2.5c, drawn only) it draws in as the shards fly out to their places, and each line it throws jolts it
    yield* during(0.4, (k) => { c.pt.g = -0.06 * E.outQuad(k); c.pt.sh = 1.2 * k; });
    // aimed lines to step away from, then one flat line along the ground to jump
    const angles = [0.55, -0.55, 1.1, -1.1, Math.PI / 2];
    let lastA = null;
    for (let i = 0; i < n; i++) {
      let a = G.rpick(angles);
      if (a === lastA) a = G.rpick(angles);
      lastA = a;
      if (i === n - 1) a = 0;
      if (G.rng() < 0.5) a += Math.PI;
      const px = P.x, py = P.y - 22, dx = Math.cos(a), dy = Math.sin(a);
      H.beam({
        ox: px - dx * 1500, oy: py - dy * 1500, ang: a, tele: 0.62 * T, lock: 0.16 * T,
        active: 0.14, fade: 0.22, width: 30, clip: false, sfx: 'streak', shake: 3, maxLen: 3000,
      });
      c.pv.g += 0.7; c.pv.x -= dx * 90; c.pv.y -= dy * 90;
      yield* during(hard() ? 0.32 : 0.4, () => { c.pt.g = -0.03; });
    }
    yield* wait(0.62 * T + 0.3);
    B.shardsOut = false;
    yield* wait(0.35);
  }

  function* atkWheel() {
    const c = B.core, T = G.diff().tele, P = G.player;
    c.ctrl = true;
    G.ui.hint('wheel', 'Dash through the turning beams');
    yield* tween(c, { x: 640, y: 330 }, 0.6);
    const dir = G.rng() < 0.5 ? 1 : -1;
    const spin = dir * (hard() ? 1.2 : gentle() ? 0.85 : 1.0);
    const total = G.TAU / Math.abs(spin);
    c.charge = 1; c.spinHint = dir;
    G.audio.play('charge', { dur: T });
    for (const a of [0, Math.PI]) {
      H.beam({
        ox: c.x, oy: c.y, ang: a, tele: T, lock: T, active: total, fade: 0.25, spin, width: 34, shake: 6,
        follow(b) { b.ox = c.x; b.oy = c.y; },
      });
    }
    // (v2.5c, drawn only) it winds itself back against the way it will turn, squeezed and trembling,
    // and the turn starting throws it the other way; while the beams turn it leans into them
    yield* during(T, (k) => { const q = E.inOutQuad(k); c.pt.x = -dir * 10 * q; c.pt.g = -0.05 * q; c.pt.sh = k > 0.7 ? 1.4 : 0; });
    c.pv.x += dir * 260; c.pv.g += 1.4;
    c.spinHint = 0;
    let e = 0, next = 1.0, hum = 0.5;
    while (e < total) {
      const dt = yield;
      e += dt; next -= dt; hum -= dt;
      c.pt.x = dir * 6;
      if (hum <= 0) { hum = 0.48; G.audio.play('beam'); }
      if (next <= 0 && !gentle()) {
        next = 1.2;
        H.meteor({ x: G.clamp(P.x + P.vx * 0.3, WL + 50, WR - 50), tele: 0.8 * T });
      }
    }
    c.charge = 0;
    yield* wait(0.5);
  }

  function* atkSingularity() {
    const c = B.core, T = G.diff().tele, P = G.player;
    c.ctrl = true;
    G.ui.hint('pull', 'Get clear of the circle before it collapses');
    yield* tween(c, { x: 640, y: 300 }, 0.6);
    const R = 390, tele = 1.7 * T;
    H.blast({ x: c.x, y: c.y, r: R, tele, dmg: 2 });
    G.audio.play('pull');
    c.charge = 1;
    let e = 0;
    while (e < tele) {
      const dt = yield;
      e += dt;
      const dx = c.x - P.x;
      G.wind = Math.abs(dx) > 14 ? G.sign(dx) * 140 : 0;
      c.jit = 1 + 3 * e / tele;
      c.pt.g = -0.1 * E.inQuad(e / tele); // (v2.5c, drawn only: it draws in on itself)
      for (let i = 0; i < 2; i++) {
        const a = G.rand(0, G.TAU), r = G.rand(R * 0.7, R + 160);
        G.fx.spawn({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 1.6, life: 0.5, size: 4, color: G.pal().boss, kind: 'spark' });
      }
    }
    G.wind = 0; c.charge = 0; c.jit = 0;
    G.fx.flash(G.pal().hot, 0.35, 0.4); G.fx.punch(0.04);
    c.open = 0.12; c.pv.g += 3;
    // spent, it sags
    yield* during(hard() ? 1.0 : 1.4, (k) => { c.pt.y = 10 * E.outQuad(Math.min(1, k * 3)); c.pt.s = -0.04; });
    c.open = 1;
  }

  // ------------------------------------------------------------------ more patterns
  function* delayed(t, gen) { yield* wait(t); yield* gen; }

  // A few aimed meteors in a row.
  function* meteors(n, gap) {
    const T = G.diff().tele, P = G.player;
    for (let i = 0; i < n; i++) {
      H.meteor({ x: G.clamp(P.x + G.rrand(-20, 20), WL + 50, WR - 50), tele: 0.85 * T });
      yield* wait(gap);
    }
  }

  // A warning drawn by a function, with no damage of its own. Scripts end it with mark.dead = true.
  function sketch(draw) {
    return H.add({ kind: 'mark', layer: 'under', update() { }, draw });
  }

  // Flick: a hand points and fires orbs at where you stand. Step aside, jump them, or cut them down.
  function* atkFlick() {
    const T = G.diff().tele, P = G.player;
    const h = G.rpick(usableHands());
    if (!h) return;
    h.ctrl = true;
    const n = (B.phase === 1 ? 3 : 4) + (hard() ? 1 : 0), aimT = 0.36 * T;
    yield* tween(h, { x: h.side > 0 ? WR - 170 : WL + 170, y: 250, curl: 0.75, rot: -h.side * 0.9 }, 0.5);
    // (v2.5c) a pointing hand, the only one it has: the first finger straightens and the hand turns to
    // aim it at the mark, draws back along the line and tightens; the flick snaps it back the other way
    let aimR = 0;
    const point = (a, u) => { h.fpT = 1; aimR = G.clamp(G.angDiff(h.rot, a + Math.PI / 2), -1.3, 1.3); h.pt.r = aimR * u; };
    for (let i = 0; i < n; i++) {
      h.hot = 1;
      G.audio.play('charge', { dur: aimT });
      const tx = P.x, ty = P.y - 22;
      const m = sketch(function (ctx) {
        ctx.strokeStyle = G.rgba(DANGER, 0.25 + 0.55 * Math.min(1, this.t / aimT)); ctx.lineWidth = 2;
        ctx.setLineDash([9, 8]);
        ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(tx, ty, 16, 0, G.TAU); ctx.stroke();
      });
      yield* during(aimT, (k) => {
        const a = Math.atan2(ty - h.y, tx - h.x), u = E.outCubic(Math.min(1, k / 0.6));
        point(a, i === 0 ? u : 1);
        h.pt.x = -Math.cos(a) * 12 * u; h.pt.y = -Math.sin(a) * 12 * u;
        h.pt.c = 0.15 * u; h.pt.sh = k > 0.7 ? 1.4 : 0;
      });
      m.dead = true;
      const a = Math.atan2(ty - h.y, tx - h.x);
      H.orb(h.x + Math.cos(a) * 40, h.y + Math.sin(a) * 40, Math.cos(a) * 600, Math.sin(a) * 600, { r: 14 });
      G.audio.play('orb');
      h.hot = 0;
      h.pv.x -= Math.cos(a) * 480; h.pv.y -= Math.sin(a) * 480; h.pv.c -= 3; h.pv.r -= aimR * 2.5;
      // it stays pointing where it threw, then (between throws) follows the hero round
      yield* during(0.3, (k) => { point(Math.atan2(P.y - 22 - h.y, P.x - h.x), 1); });
    }
    yield* wait(0.45);
  }

  // Crossfire: one hand fires along the floor, then the other fires at jumping height.
  // Jump the first beam and be back on the ground for the second.
  function* atkCrossfire() {
    const T = G.diff().tele;
    const lo = G.rng() < 0.5 ? B.hands[0] : B.hands[1], hi = other(lo);
    lo.ctrl = hi.ctrl = true;
    const yLow = FLOOR - 26, yHigh = FLOOR - 165, wallX = (h) => (h.side > 0 ? WR - 64 : WL + 64);
    yield* par(
      tween(lo, { x: wallX(lo), y: FLOOR - 62, curl: 0.05, rot: -lo.side * Math.PI / 2 }, 0.55),
      tween(hi, { x: wallX(hi), y: yHigh, curl: 0.05, rot: -hi.side * Math.PI / 2 }, 0.55)
    );
    const order = hard() ? [lo, hi, lo] : [lo, hi], tele = 0.9 * T, gap = 0.75;
    lo.hot = hi.hot = 1;
    G.audio.play('charge', { dur: tele });
    order.forEach((h, i) => {
      H.beam({
        ox: h.x, oy: h === lo ? yLow : yHigh, ang: h.side > 0 ? Math.PI : 0,
        tele: tele + i * gap, lock: tele + i * gap, active: 0.26, fade: 0.2, width: 40, clip: false, shake: 6,
      });
    });
    // (v2.5c) flat palms on the walls, one low and one high, fingers splayed wide and pressed back into
    // the stone (not the curled scoop of the Sweep); the one about to fire squeezes and trembles, and
    // each is thrown back against its wall as its beam goes
    const fired = order.map(() => false);
    yield* during(tele + (order.length - 1) * gap + 0.45, (k, dt, e) => {
      const g = E.outCubic(Math.min(1, e / (tele * 0.6)));
      for (const h of [lo, hi]) { h.pt.c = -0.28 * g; h.pt.x = h.side * 7 * g; h.pt.sh = 1.2 * g; }
      order.forEach((h, i) => {
        const at = tele + i * gap;
        if (!fired[i] && e >= at) { fired[i] = true; h.pv.x += h.side * 320; h.pv.c -= 4; }
        else if (!fired[i] && at - e < 0.32) { h.pt.s = 0.06; h.pt.c = -0.1; h.pt.sh = 2.8; }
      });
    });
    lo.hot = hi.hot = 0;
    yield* wait(0.3);
  }

  // Fan: the core throws fans of orbs with gaps between them, each fan offset from the last.
  // Stand in a gap, or cut an orb out of the air.
  function* atkFan() {
    const c = B.core, T = G.diff().tele;
    c.ctrl = true;
    yield* tween(c, { x: 640, y: 262 }, 0.55);
    const waves = (B.phase === 3 ? 4 : 3) + (hard() ? 1 : 0), speed = B.phase === 3 ? 380 : 330, aimT = 0.6 * T;
    for (let w = 0; w < waves; w++) {
      c.charge = 1;
      G.audio.play('charge', { dur: aimT });
      const angs = [];
      for (let a = 0.52 + (w % 2) * 0.175; a <= 2.63; a += 0.35) angs.push(a);
      const m = sketch(function (ctx) {
        const k = Math.min(1, this.t / aimT);
        ctx.strokeStyle = G.rgba(DANGER, 0.25 + 0.55 * k); ctx.lineWidth = 2.5;
        for (const a of angs) {
          const r0 = c.r + 12, r1 = r0 + 90 * k;
          ctx.beginPath(); ctx.moveTo(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0); ctx.lineTo(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1); ctx.stroke();
        }
      });
      // (v2.5c, drawn only) it draws up and in as it aims, then is thrown back up by the fan it throws
      // down; its spread hands sweep in with it
      yield* during(aimT, (k) => { c.pt.y = -10 * E.outQuad(k); c.pt.g = -0.035 * k; c.pt.sh = k > 0.75 ? 1 : 0; });
      m.dead = true;
      for (const a of angs) H.orb(c.x + Math.cos(a) * c.r, c.y + Math.sin(a) * c.r, Math.cos(a) * speed, Math.sin(a) * speed, { r: 12 });
      G.audio.play('orb'); G.fx.shake(4); c.kick = 0.7;
      c.pv.y -= 240; c.pv.g += 1;
      for (const h of usableHands()) if (!h.ctrl) { h.pv.x -= h.side * 260; h.pv.r -= h.side * 2; }
      yield* wait(0.5);
    }
    c.charge = 0;
    yield* wait(0.9);
  }

  // Cage: both hands plant either side of you and hold you in while embers fall.
  // The planted hands are open to attack, and breaking one ends the cage.
  function* atkCage() {
    const [L, R] = B.hands, T = G.diff().tele, P = G.player;
    L.ctrl = R.ctrl = true;
    const half = 230, cx = G.clamp(P.x, WL + 300, WR - 300);
    yield* par(
      tween(L, { x: cx - half, y: 240, curl: 1, rot: 0 }, 0.5),
      tween(R, { x: cx + half, y: 240, curl: 1, rot: 0 }, 0.5)
    );
    const mL = columnMark(cx - half, 150), mR = columnMark(cx + half, 150), tt = 0.8 * T;
    G.audio.play('charge', { dur: tt });
    L.hot = R.hot = 1;
    let e = 0;
    // (v2.5c) two fists, knuckles turned in toward the hero between them: they heave up together, set
    // themselves (bunching, heavier) and hold, trembling, until they drop
    while (e < tt) {
      e += yield;
      const k = Math.min(1, e / tt);
      mL.k = mR.k = k; mL.locked = mR.locked = k > 0.7;
      const up = k < 0.35 ? E.outQuad(k / 0.35) : 1 - E.inOutQuad(Math.min(1, (k - 0.35) / 0.4));
      for (const h of [L, R]) {
        h.pt.y = -26 * up; h.pt.r = -h.side * 0.26 * E.outCubic(Math.min(1, k / 0.4));
        h.pt.s = k > 0.35 ? -0.06 * Math.min(1, (k - 0.35) / 0.4) : 0.04 * up;
        h.pt.sh = k > 0.7 ? 2.6 : 0;
      }
    }
    L.hurt = R.hurt = true; L.hurtDmg = R.hurtDmg = 1;
    yield* par(tween(L, { y: FLOOR - 64 }, 0.09, E.inQuad), tween(R, { y: FLOOR - 64 }, 0.09, E.inQuad),
      during(0.09, () => { L.pt.s = R.pt.s = 0.06; }));
    mL.dead = mR.dead = true;
    for (const h of [L, R]) { h.pv.s -= 2; h.pv.y -= 100; h.pv.c -= 1.5; }
    impactFx(cx - half, false); impactFx(cx + half, false);
    yield* wait(0.07);
    L.hurt = R.hurt = false; L.hot = R.hot = 0; L.stuck = R.stuck = true;
    const l = cx - half + 76, r = cx + half - 76;
    if (P.x > l - 16 && P.x < r + 16 && !P.dead) {
      // caught: the hands are walls until they let go
      G.bounds = { l, r };
      G.ui.hint('cage', 'Caged. Break a hand, or dodge until it lets go');
      const n = hard() ? 5 : 4;
      for (let i = 0; i < n; i++) {
        H.meteor({ x: G.clamp(P.x + G.rrand(-24, 24), l + 6, r - 6), tele: 0.8 * T, blastR: 50 });
        yield* wait(hard() ? 0.9 : 1.1); // each ember has all but landed before the next is aimed
      }
      yield* wait(0.5);
      G.bounds = null;
    } else {
      yield* wait(1.3); // it missed: a free opening on two planted hands
    }
    L.stuck = R.stuck = false;
    yield* wait(0.3);
  }

  // Swat: the answer to resting on a platform. A fist knocks it out of the sky for a while.
  function* atkSwat() {
    const T = G.diff().tele;
    const pl = (B.campPlat && B.campPlat.rise >= 1) ? B.campPlat : G.arena.platforms.find((p) => p.rise >= 1);
    if (!pl) return;
    const px = pl.x + pl.w / 2;
    const h = usableHands().sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
    if (!h) return;
    h.ctrl = true;
    G.ui.hint('swat', 'It will not let you rest up there');
    yield* tween(h, { x: px, y: pl.top - 250, curl: 1, rot: 0 }, 0.5);
    const tt = 0.75 * T;
    h.hot = 1;
    G.audio.play('charge', { dur: tt });
    H.zone({ x: pl.x - 4, y: pl.top - 200, w: pl.w + 8, h: 204, tele: tt, active: 0.1, fade: 0.15, style: 'column' });
    // (v2.5c) a backhand: after a short dip the wrist turns right back as it rises, and holds, trembling;
    // it whips straight on the way down and carries through
    yield* par(tween(h, { y: pl.top - 286 }, tt, E.outCubic), during(tt, (k) => {
      const dip = k < 0.22 ? Math.sin(Math.PI * k / 0.22) : 0;
      h.pt.y = 12 * dip; h.pt.s = -0.06 * dip;
      h.pt.r = h.side * 0.55 * E.outCubic(G.clamp((k - 0.1) / 0.6, 0, 1));
      h.pt.sh = k > 0.72 ? 2 : 0;
    }));
    h.hurt = true; h.hurtDmg = 1;
    h.pv.r -= h.side * 4;
    yield* par(tween(h, { y: pl.top - 60 }, 0.08, E.inQuad), during(0.08, () => { h.pt.s = 0.06; }));
    h.pv.s -= 1.8; h.pv.y -= 90;
    G.arena.dropPlatform(pl, hard() ? 8 : 5.5);
    G.fx.shake(15); G.audio.play('slam');
    G.fx.ring(px, pl.top, { r0: 20, r1: 180, life: 0.4, color: G.pal().hot, width: 8 });
    G.fx.burst(px, pl.top, { n: 16, color: '22,18,32', speed: [150, 560], life: [0.6, 1.2], size: [5, 11], kind: 'chunk', grav: 1500 });
    G.fx.dust(px, pl.top, 8, { speed: [40, 260], size: [8, 14], life: [0.5, 1], up: 60, jitter: 60 });
    G.fx.kick(0, 6);
    yield* wait(0.07);
    h.hurt = false; h.hot = 0; h.stuck = true;
    yield* wait(0.6);
    h.stuck = false;
  }

  // Duets: a hand and the core attack together.
  function* atkDuetSlam() {
    const h = nearHand();
    if (!h) { yield* lances(1); return; }
    yield* par(slam(h, { track: 0.62, stuck: 1.0, wave: 520 }), delayed(0.35, lances(1)));
  }
  function* atkDuetSweep() {
    const h = G.rpick(usableHands());
    if (!h) { yield* meteors(3, 0.5); return; }
    yield* par(sweep(h, false), delayed(0.5, meteors(3, 0.55)));
  }
  function* atkDuet() { yield* (G.rng() < 0.5 ? atkDuetSlam() : atkDuetSweep()); }

  // Halo (phase 3): the shards become a turning ring of blades around a low, slow core.
  // Outside the ring is safe, inside it is safe, and inside is where the core can be hit.
  function* atkHalo() {
    const c = B.core, T = G.diff().tele, P = G.player;
    c.ctrl = true;
    G.ui.hint('halo', 'Slip inside the ring of blades');
    const R = 210;
    yield* tween(c, { x: G.clamp(c.x, 300, 980), y: FLOOR - 170 }, 0.6);
    B.haloR = R; B.shardSpin = 1.6;
    c.charge = 1;
    G.audio.play('charge', { dur: T });
    const m = sketch(function (ctx) {
      const k = Math.min(1, this.t / T), live = B.haloHurt;
      ctx.save();
      ctx.beginPath(); ctx.rect(-80, -400, G.W + 160, FLOOR + 400); ctx.clip();
      ctx.strokeStyle = G.rgba(DANGER, live ? 0.3 : 0.3 + 0.5 * k); ctx.lineWidth = live ? 2 : 3;
      ctx.setLineDash([16, 10]); ctx.lineDashOffset = -this.t * 70;
      ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, G.TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });
    // (v2.5c, drawn only) it settles, squat and heavy, as the ring of blades widens round it
    yield* during(T, (k) => { c.pt.s = -0.06 * E.inOutQuad(k); c.pt.sh = k > 0.75 ? 1.2 : 0; });
    c.pv.g += 1.4;
    B.haloHurt = true;
    G.audio.play('sweep');
    const dur = hard() ? 6.5 : 5.5;
    let e = 0, hum = 0;
    while (e < dur) {
      const dt = yield;
      e += dt; hum -= dt;
      c.x = G.clamp(c.x + G.clamp(P.x - c.x, -110 * dt, 110 * dt), 250, 1030);
      if (hum <= 0) { hum = 0.7; G.audio.play('streak'); }
    }
    m.dead = true;
    B.haloHurt = false; B.haloR = 0; B.shardSpin = 0.9;
    c.charge = 0; c.open = 0.2;
    yield* wait(hard() ? 0.8 : 1.1);
    c.open = 1;
    yield* tween(c, { y: HOME_Y[3] }, 0.6, E.outCubic);
  }

  // Supernova: the last stand, once, when the Warden is nearly spent. Rings, a turning beam, then a collapse.
  function* atkSupernova() {
    const c = B.core, T = G.diff().tele, P = G.player;
    c.ctrl = true;
    G.ui.callout('LAST LIGHT', 'It burns everything it has left');
    G.audio.play('roar');
    G.fx.shake(16); G.fx.flash(G.pal().hot, 0.4, 0.5);
    yield* tween(c, { x: 640, y: 310 }, 0.7);
    // two rings
    for (let i = 0; i < 2; i++) {
      const tt = (i === 0 ? 0.8 : 0.55) * T;
      c.charge = 1;
      G.audio.play('charge', { dur: tt });
      let e = 0;
      while (e < tt) { e += yield; c.pulse = Math.min(1, e / tt); c.pt.g = -0.08 * E.inQuad(c.pulse); c.pt.sh = c.pulse > 0.7 ? 1.8 : 0; }
      c.pulse = 0; c.pv.g += 2.6;
      H.ring({ x: c.x, y: c.y, r: c.r, speed: gentle() ? 440 : 530, thick: 26, maxR: 1000 });
      G.audio.play('ring'); G.fx.shake(8);
      yield* wait(0.55);
    }
    // half a turn of the wheel
    const dir = G.rng() < 0.5 ? 1 : -1, spin = dir * (gentle() ? 0.9 : 1.05), total = Math.PI / Math.abs(spin);
    c.spinHint = dir;
    G.audio.play('charge', { dur: T });
    for (const a of [0, Math.PI]) {
      H.beam({
        ox: c.x, oy: c.y, ang: a, tele: T, lock: T, active: total, fade: 0.25, spin, width: 34, shake: 6,
        follow(b) { b.ox = c.x; b.oy = c.y; },
      });
    }
    yield* wait(T);
    c.spinHint = 0;
    let e = 0, hum = 0;
    while (e < total) { const dt = yield; e += dt; hum -= dt; if (hum <= 0) { hum = 0.48; G.audio.play('beam'); } }
    yield* wait(0.35);
    // the collapse
    const R = 390, tele = 1.6 * T;
    H.blast({ x: c.x, y: c.y, r: R, tele, dmg: 2 });
    G.audio.play('pull');
    e = 0;
    while (e < tele) {
      const dt = yield;
      e += dt;
      const dx = c.x - P.x;
      G.wind = Math.abs(dx) > 14 ? G.sign(dx) * 140 : 0;
      c.jit = 1 + 3 * e / tele;
      for (let i = 0; i < 2; i++) {
        const a = G.rand(0, G.TAU), r = G.rand(R * 0.7, R + 160);
        G.fx.spawn({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 1.6, life: 0.5, size: 4, color: G.pal().boss, kind: 'spark' });
      }
    }
    G.wind = 0; c.charge = 0; c.jit = 0;
    G.fx.flash(G.pal().hot, 0.4, 0.4); G.fx.punch(0.04);
    c.open = 0.12;
    yield* wait(1.6); // spent: the best opening of the fight
    c.open = 1;
    yield* tween(c, { y: HOME_Y[3] }, 0.6, E.outCubic);
  }

  // Sunburst: the one attack you answer by going to a place, not leaving one. The core climbs and
  // burns the whole arena; each hand it has left plants itself as a wall, and only the ground
  // behind a hand, between it and the arena wall, stays in shadow.
  function* atkSunburst() {
    const c = B.core, T = G.diff().tele, P = G.player;
    const hands = usableHands();
    if (!hands.length) return;
    c.ctrl = true;
    G.ui.hint('shadow', 'It will burn everything. Get behind a hand, in its shadow');
    // with one hand left, it stands on the hero's side so the shadow can be reached
    const spots = hands.length > 1 ? null : [P.x < 640 ? 420 : 860];
    const moves = [tween(c, { x: 640, y: 150, open: 1 }, 0.6)];
    hands.forEach((h) => {
      h.ctrl = true; h.stuck = false;
      moves.push(tween(h, { x: spots ? spots[0] : (h.side < 0 ? 420 : 860), y: FLOOR - 74, rot: 0, curl: 0 }, 0.6, E.inOutCubic));
    });
    // (v2.5c) the hands hop up and come down hard to plant themselves, palms out, fingers spread
    moves.push(during(0.6, (k) => { for (const h of hands) { h.pt.y = -34 * Math.sin(Math.PI * Math.min(1, k * 1.12)); h.pt.c = -0.2 * k; } }));
    yield* par(...moves);
    for (const h of hands) { G.fx.thud(h.x, FLOOR, 1.1); h.stuck = true; h.pv.s -= 2.2; h.pv.c -= 3; }
    G.fx.shake(9); G.audio.play('slam');
    const shades = hands.map((h) => (h.x < 640 ? { x0: WL, x1: h.x - 62 } : { x0: h.x + 62, x1: WR }));
    const tele = 1.7 * T, active = 0.55;
    G.audio.play('charge', { dur: tele });
    const hz = H.add({
      kind: 'sunburst', layer: 'under', tele, active, shades, dmg: hard() ? 2 : 1, fired: false, srcX: 640,
      get firing() { return this.t >= this.tele && this.t < this.tele + this.active; },
      safe(x, y) { return y > FLOOR - 140 && this.shades.some((s) => x > s.x0 + 6 && x < s.x1 - 6); },
      update() {
        c.charge = Math.min(1, this.t / this.tele);
        if (this.t >= this.tele && !this.fired) {
          this.fired = true; c.charge = 0;
          G.audio.play('boom'); G.audio.play('beam');
          G.fx.shake(16); G.fx.flash(G.pal().hot, 0.3, 0.4);
          G.fx.ring(c.x, c.y, { r0: c.r, r1: 900, life: 0.7, color: G.pal().hot, width: 14 });
          for (let x = WL + 60; x < WR; x += 90) if (!this.safe(x, FLOOR)) { G.fx.scorch(x, 40, G.pal().boss); G.fx.dust(x, FLOOR, 1, { speed: [10, 60], size: [8, 13], life: [0.6, 1.1], up: 90, a: 0.34, color: '84,78,100' }); }
        }
        if (this.t >= this.tele + this.active + 0.3) this.dead = true;
      },
      hits(Pl) { return this.firing && !this.safe(Pl.x, Pl.y); },
      draw(ctx) {
        const pal = G.pal(), k = Math.min(1, this.t / this.tele), late = k > 0.8 && k < 1 ? 0.5 + 0.5 * Math.sin(this.t * 55) : 0;
        const top = -60, f = this.firing ? 1 : this.t > this.tele ? Math.max(0, 1 - (this.t - this.tele - this.active) / 0.3) : 0;
        ctx.save();
        ctx.beginPath(); ctx.rect(WL, top, WR - WL, FLOOR - top);
        // everything but the shadows
        for (const s of this.shades) ctx.rect(s.x1, FLOOR - 184, s.x0 - s.x1, 184);
        ctx.clip('evenodd');
        if (this.t < this.tele) {
          ctx.fillStyle = G.rgba(DANGER, 0.05 + 0.1 * k + 0.08 * late);
          ctx.fillRect(WL, top, WR - WL, FLOOR - top);
          // the light gathering: rays reaching further down as it fills
          ctx.strokeStyle = G.rgba(DANGER, 0.16 + 0.2 * k); ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i <= 14; i++) { const x = WL + (WR - WL) * i / 14; ctx.moveTo(c.x, c.y); ctx.lineTo(G.lerp(c.x, x, k), G.lerp(c.y, FLOOR, k)); }
          ctx.stroke();
          ctx.fillStyle = G.rgba(DANGER, 0.3);
          ctx.fillRect(WL, FLOOR - 6, (WR - WL) * k, 6);
        } else if (f > 0) {
          ctx.globalCompositeOperation = 'lighter';
          // (v1.6d: the burn is the boss's colour laid over the arena, hot only round the core; it used to be near white from wall to wall)
          ctx.fillStyle = G.rgba(pal.boss, 0.34 * f); ctx.fillRect(WL, top, WR - WL, FLOOR - top);
          const g = ctx.createRadialGradient(c.x, c.y, 20, c.x, c.y, 760);
          g.addColorStop(0, G.rgba(pal.hot, 0.6 * f)); g.addColorStop(0.35, G.rgba(pal.hot, 0.2 * f)); g.addColorStop(1, G.rgba(pal.hot, 0.06 * f));
          ctx.fillStyle = g; ctx.fillRect(WL, top, WR - WL, FLOOR - top);
        }
        ctx.restore();
        // the shadows themselves: dark, edged in the hero's own pale light, so they read as shelter
        // (no word on them: the dark and the frame say it)
        for (const s of this.shades) {
          ctx.fillStyle = 'rgba(4,4,14,' + (0.3 + 0.25 * k) + ')';
          ctx.fillRect(s.x0, FLOOR - 184, s.x1 - s.x0, 184);
          ctx.strokeStyle = G.rgba(G.COL.star, 0.55 + 0.35 * Math.sin(this.t * 6)); ctx.lineWidth = 2.5;
          ctx.setLineDash([12, 8]); ctx.lineDashOffset = -this.t * 30;
          ctx.strokeRect(s.x0 + 2, FLOOR - 184, s.x1 - s.x0 - 4, 184);
          ctx.setLineDash([]);
        }
      },
    });
    // the planted hands brace against the light (leaning away from the core, fingers digging in), and the
    // core, high up, swells and trembles as it fills; as it burns they are rocked back
    let rocked = false;
    yield* during(tele + active + 0.3, (k, dt, e) => {
      const q = Math.min(1, e / tele);
      for (const h of hands) {
        h.pt.r = (h.x < 640 ? -1 : 1) * 0.14 * E.inOutQuad(q); h.pt.c = 0.25 * q; h.pt.s = -0.05 * q;
        h.pt.sh = q > 0.75 && q < 1 ? 1.6 : 0;
      }
      if (e < tele) { c.pt.g = 0.05 * E.inQuad(q); c.pt.sh = q > 0.8 ? 1.4 : 0; }
      else if (!rocked) { rocked = true; c.pv.g -= 1.5; for (const h of hands) { h.pv.r += (h.x < 640 ? -1 : 1) * 2.5; h.pv.s -= 1.2; } }
    });
    c.charge = 0;
    // the hands stay planted a moment longer: time to hit one
    yield* wait(hard() ? 0.8 : 1.2);
    for (const h of hands) h.stuck = false;
  }

  // Reckoning: the core comes down within reach, wards itself and gathers a blast (moments.js).
  // It is not left alone to be struck (v1.7b): while it gathers, its hands guard it (see guarding).
  function* reckoning() {
    const c = B.core;
    c.ctrl = true;
    const moves = [tween(c, { x: 640, y: FLOOR - 196, open: 1 }, 0.8)];
    for (const h of B.hands) {
      if (!usable(h)) continue;
      h.ctrl = true;
      moves.push(tween(h, { x: 640 + h.side * 480, y: 190, rot: h.side * 0.3, curl: 1 }, 0.8));
    }
    yield* par(...moves);
    const gather = G.moments.gather(B, () => ({ x: c.x, y: c.y, r: c.r + 24 })), guard = guarding();
    let done = false;
    while (!done) { const dt = yield; done = gather.next(dt).done; guard.next(dt); }
    // only reached when the ward held: whichever hand is in the middle of a blow finishes it
    while (!guard.next(yield).done) { /* until it is back at its post */ }
    yield* tween(c, { y: HOME_Y[B.phase] }, 0.6, E.outBack);
  }

  // The Eclipse is guarded. While the core gathers, its hands come down in turn on wherever the hero
  // stands: step out from under the fist, jump the wave it sends along the floor, and get back to
  // work. A hand lies where it fell for a moment, and a blow to it is a blow to the ward, so the
  // hand that just missed is the easiest thing to hit. With no hand left to guard it, the gathering
  // light itself falls on the hero instead. (Breaking the ward ends all of this from outside.)
  function* guarding() {
    const P = G.player;
    // a hand that has come down lies where it fell for a moment (the easiest thing to hit), then goes back to its post
    function* lie(h) {
      h.stuck = true;
      yield* wait(0.5);
      h.stuck = false;
      yield* tween(h, { x: 640 + h.side * 480, y: 190, rot: h.side * 0.3, curl: 1 }, 0.4);
    }
    let turn = P.x < 640 ? -1 : 1, down = null; // the hand on the hero's side comes first
    yield* wait(0.3);
    while (B.ward) {
      const hands = usableHands();
      if (!hands.length) {
        H.meteor({ x: G.clamp(P.x + G.rrand(-20, 20), WL + 50, WR - 50), tele: 0.8 * G.diff().tele });
        yield* wait(1.1);
        continue;
      }
      const h = hands.find((q) => q.side === turn && q !== down) || hands.find((q) => q !== down) || hands[0];
      turn = -turn;
      const blow = slam(h, { track: B.phase >= 2 ? 0.5 : 0.6, stuck: 0, wave: 400 });
      if (down && down !== h) yield* par(lie(down), blow);        // one gets up as the other comes down
      else {
        // only one hand left: while it gets up, the gathering light falls on the hero instead
        if (down) { H.meteor({ x: G.clamp(P.x + G.rrand(-20, 20), WL + 50, WR - 50), tele: 0.8 * G.diff().tele }); yield* lie(down); }
        yield* blow;
      }
      down = h; h.stuck = true;
      yield* wait(0.2 * G.diff().tele);
    }
    if (down) yield* lie(down);
  }

  // ------------------------------------------------------------------ corrupted only (corrupt.js)
  // The void bleeding through: two attacks only a corrupted Warden uses, drawn in black and blood.
  const VCOL = () => G.corrupt.COL;

  // Afterhands: the eye shuts and both hands sink flat into the floor, as if listening. Void handprints
  // bloom along the path the hero has just walked, laid one by one as they follow; then fists punch up
  // out of the floor from each print, in the order they were laid. Keep moving, never double back.
  // (A print warns of a blow from something under the floor that cannot be seen, so it is drawn.)
  const FIST = { alive: true, x: 0, y: 0, rot: 0, curl: 1, side: 1, hurt: false, hot: 0, broken: 0, stuck: false, flash: 0, kx: 0, hp: 1, maxHp: 1, sunk: 0 };
  function drawPrint(ctx, x, k, glow, a, side) {
    if (k <= 0 || a <= 0) return;
    ctx.save();
    ctx.translate(x, FLOOR + 1); ctx.scale(side * k * 1.12, 0.3 * k);
    // seen from above, then laid flat on the floor: a palm, four long fingers spread and reaching away, a thumb
    ctx.beginPath();
    ctx.ellipse(0, 4, 32, 30, 0, 0, G.TAU);
    for (const [fx, fl, fa] of [[-22, 46, -0.3], [-8, 58, -0.1], [8, 56, 0.1], [22, 42, 0.3]]) {
      const cx = fx + Math.sin(fa) * fl / 2, cy = -18 - Math.cos(fa) * fl / 2;
      ctx.moveTo(cx + 7 * Math.cos(fa), cy + 7 * Math.sin(fa)); ctx.ellipse(cx, cy, 7, fl / 2, fa, 0, G.TAU);
    }
    ctx.moveTo(-40 + 7 * Math.cos(-1.1), 2 + 7 * Math.sin(-1.1)); ctx.ellipse(-40, 2, 7, 20, -1.1, 0, G.TAU);
    ctx.fillStyle = 'rgba(5,0,3,' + (0.88 * a) + ')'; ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(VCOL().blood, (0.4 + 0.5 * glow) * a); ctx.lineWidth = 4; ctx.stroke();
    if (glow > 0) { ctx.fillStyle = G.rgba(DANGER, (0.1 + 0.22 * glow) * a); ctx.fill(); }
    ctx.restore();
  }

  // One print and the fist that comes up out of it. fireAt: seconds from being laid to the blow.
  function afterhand(x, fireAt, side, last) {
    const RISE = 0.08, HOLD = 0.16, DROP = 0.22, FADE = 0.45;
    return H.add({
      kind: 'afterhand', layer: 'under', x, fireAt, side, last, hw: 40, reach: 360, rise: 0, fired: false, srcX: x,
      get live() { return this.t >= this.fireAt && this.t < this.fireAt + RISE + HOLD; },
      update(dt) {
        const e = this.t - this.fireAt, VC = VCOL();
        if (e < 0) {
          // the print gathers as its moment comes: void welling up out of it
          if (e > -0.35 && Math.random() < dt * 30) G.fx.spawn({ x: this.x + G.rand(-30, 30), y: FLOOR - 2, vx: G.rand(-10, 10), vy: -G.rand(60, 170), life: G.rand(0.3, 0.6), size: G.rand(3, 6), color: VC.void, wob: 30 });
          return;
        }
        if (!this.fired) {
          this.fired = true;
          G.audio.play('stomp'); if (this.last) G.audio.play('slam');
          G.fx.shake(this.last ? 10 : 6); G.fx.kick(0, -2.5);
          G.fx.crack(this.x, 0.9, VC.blood);
          G.fx.burst(this.x, FLOOR - 4, { n: 7, color: '14,4,10', speed: [200, 560], angle: -Math.PI / 2, spread: 1.3, life: [0.5, 1], size: [4, 9], kind: 'chunk', grav: 1500 });
          G.fx.burst(this.x, FLOOR - 8, { n: 10, color: VC.blood, speed: [200, 700], angle: -Math.PI / 2, spread: 0.9, life: [0.15, 0.4], kind: 'spark', size: [2, 4], grav: 600 });
          for (const d of [-1, 1]) G.fx.dust(this.x + d * 26, FLOOR, 2, { dir: d, speed: [60, 200], size: [7, 12], life: [0.4, 0.8], up: 40, a: 0.34, color: '40,10,24' });
          G.fx.ripple(this.x, FLOOR - 170, 190, 0.3, 0.7);
          // the rush of the punch: streaks running up the arm
          for (let i = 0; i < 6; i++) G.fx.spawn({ kind: 'spark', x: this.x + G.rand(-30, 30), y: FLOOR - G.rand(10, 120), vx: G.rand(-30, 30), vy: -G.rand(900, 1500), life: G.rand(0.12, 0.22), size: G.rand(1.4, 2.4), color: VC.blood, len: 0.05, drag: 3 });
        }
        // up fast with a little overshoot, held at the top, then down slower than it came
        this.rise = e < RISE ? E.outBack(e / RISE) : e < RISE + HOLD ? 1 : Math.max(0, 1 - E.inQuad(Math.min(1, (e - RISE - HOLD) / DROP)));
        if (e > RISE + HOLD + DROP + FADE) this.dead = true;
      },
      hits(P) {
        if (!this.live) return false;
        const top = FLOOR - this.reach * Math.min(1, this.rise);
        return G.rectsOverlap(P.box(), { cx: this.x, cy: (top + FLOOR) / 2, hw: this.hw, hh: (FLOOR - top) / 2 });
      },
      danger() { return this.t < this.fireAt + RISE + HOLD ? [this.x, this.hw + 16, this.fireAt - this.t] : null; },
      draw(ctx) {
        const e = this.t - this.fireAt, VC = VCOL();
        const bloom = E.outBack(Math.min(1, this.t / 0.2));
        const glow = e < 0 ? G.clamp(1 + e / 0.35, 0, 1) * (0.8 + 0.2 * Math.sin(this.t * 40)) : 1;
        const fade = e < RISE + HOLD + DROP ? 1 : Math.max(0, 1 - (e - RISE - HOLD - DROP) / FADE);
        drawPrint(ctx, this.x, bloom, glow * fade, fade, this.side);
        if (this.rise <= 0) return;
        const top = FLOOR - this.reach * this.rise, fy = top + 42;
        ctx.save();
        ctx.beginPath(); ctx.rect(this.x - 150, -400, 300, FLOOR + 401); ctx.clip();
        // the forearm: void, edged in blood, coming up out of the print
        if (fy + 24 < FLOOR) {
          const g = ctx.createLinearGradient(0, fy, 0, FLOOR);
          g.addColorStop(0, '#14050c'); g.addColorStop(1, '#020001');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(this.x - 33, FLOOR + 2); ctx.lineTo(this.x - 25, fy + 24); ctx.lineTo(this.x + 25, fy + 24); ctx.lineTo(this.x + 33, FLOOR + 2); ctx.closePath(); ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = G.rgba(VC.blood, 0.55); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(this.x - 33, FLOOR); ctx.lineTo(this.x - 25, fy + 24); ctx.moveTo(this.x + 33, FLOOR); ctx.lineTo(this.x + 25, fy + 24); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
        // and the fist: the Warden's own, clenched, knuckles up, leaning into the blow
        ctx.translate(this.x, fy); ctx.rotate(this.side * 0.1 * this.rise); ctx.scale(0.7, 0.7);
        FIST.side = this.side;
        drawHand(ctx, FIST);
        ctx.restore();
      },
    });
  }

  function* atkAfterhands() {
    const c = B.core, T = G.diff().tele, P = G.player;
    const hands = usableHands(), shards = !hands.length && B.hasShards;
    const n = [0, 5, 6, 7][B.phase], gap = [0, 0.2, 0.18, 0.16][B.phase], lag = 0.3, beat = 0.42 * T, roll = 0.11;
    const home = HOME_Y[B.phase];
    c.ctrl = true;
    // where the hero has been: each print goes where they were a moment ago
    const hist = [];
    const track = () => { hist.push(B.t, P.x); };
    const pastX = (t) => { for (let i = hist.length - 2; i >= 0; i -= 2) if (hist[i] <= t) return hist[i + 1]; return hist.length ? hist[1] : P.x; };
    // the tell: the eye shuts, and the hands lay themselves down on the floor ...
    G.audio.play('charge', { dur: 0.9 * T });
    const lay = [tween(c, { y: home + 26, open: 0.05 }, 0.55)];
    for (const h of hands) {
      h.ctrl = true; h.stuck = false;
      h.sunk = 0.5; // (lying on the floor: drawn cut off at it, still within reach)
      lay.push(tween(h, { x: G.clamp(c.x + h.side * 290, 110, 1170), y: FLOOR - 56, rot: -h.side * Math.PI / 2, curl: 0.05 }, 0.55));
    }
    if (shards) {
      // (with no hands left, its shards come down point first and go in instead)
      B.shardSink = 0; B.shardHold = true;
      B.shardPose = (i) => ({ x: c.x + (i - 2.5) * 96, y: G.lerp(FLOOR - 64, FLOOR + 50, B.shardSink), a: 0 });
      lay.push(tween(B, { shardPoseK: 1 }, 0.55));
    }
    yield* par(...lay);
    for (const h of hands) G.fx.thud(h.x, FLOOR, 0.6, { noCrack: true });
    yield* wait(0.1 * T); // a breath, palms on the stone
    // ... and sink into it, as if listening for footsteps
    for (const h of hands) h.sunk = 1;
    G.audio.play('pull');
    const holes = hands.map((h) => h.x).concat(shards ? [c.x] : []);
    const pool = sketch(function (ctx) {
      // where they went in, the floor is a hole of void
      if (this.out && this.t0 == null) this.t0 = this.t;
      const k = Math.min(1, this.t / 0.3) * (this.t0 == null ? 1 : Math.max(0, 1 - (this.t - this.t0) / 0.5));
      if (k <= 0) return;
      for (const x of holes) {
        const w = (shards ? 300 : 80) * (0.94 + 0.06 * Math.sin(this.t * 5 + x));
        ctx.fillStyle = 'rgba(4,0,2,' + (0.75 * k) + ')';
        ctx.beginPath(); ctx.ellipse(x, FLOOR + 1, w, 8, 0, 0, G.TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = G.rgba(VCOL().blood, 0.4 * k); ctx.lineWidth = 2; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    const sinkT = 0.4 * T;
    const sink = [tween(c, { y: home + 40 }, sinkT)];
    for (const h of hands) sink.push(tween(h, { y: FLOOR + 100 }, sinkT, E.inCubic));
    if (shards) sink.push(tween(B, { shardSink: 1 }, sinkT, E.inCubic));
    sink.push((function* () {
      let e = 0;
      while (e < sinkT) {
        const dt = yield;
        e += dt; track();
        for (const x of holes) if (Math.random() < dt * 30) G.fx.spawn({ x: x + G.rand(-60, 60), y: FLOOR - 2, vx: G.rand(-20, 20), vy: -G.rand(40, 120), life: G.rand(0.4, 0.8), size: G.rand(4, 8), color: VCOL().void, wob: 30 });
      }
    })());
    yield* par(...sink);
    G.fx.shake(5);
    for (const x of holes) G.fx.dust(x, FLOOR, 3, { speed: [30, 120], size: [8, 13], life: [0.5, 0.9], up: 40, a: 0.3, color: '40,10,24', jitter: 40 });
    // listening: the shut eye trembles while the prints follow the hero
    c.jit = 0.7;
    for (let i = 0; i < n; i++) {
      track();
      afterhand(G.clamp(pastX(B.t - lag), WL + 44, WR - 44), (n - 1 - i) * gap + beat + i * roll, i % 2 ? 1 : -1, i === n - 1);
      G.audio.play('blink');
      let w = 0;
      while (w < gap) { w += yield; track(); }
    }
    // the eye flies open as the first fist comes (quick, but a tween, not a cut)
    yield* wait(Math.max(0, beat - gap - 0.2));
    c.jit = 0;
    yield* tween(c, { open: 1 }, 0.2, E.inOutQuad);
    c.charge = 1;
    yield* wait((n - 1) * roll + 0.3);
    // back to rest: the hands climb back out of the floor, and the core rises to its place
    c.charge = 0;
    pool.out = true;
    B.shardHold = false;
    const up = [tween(c, { y: home }, 0.65)];
    for (const h of hands) {
      // up out of the floor to its place beside the core, a little past it, and settling back
      const hx = G.clamp(c.x + h.side * B.spread, 90, 1190), hy = home + 128;
      up.push((function* () { yield* tween(h, { x: hx, y: hy - 22, rot: h.side * 0.1, curl: 0.3 }, 0.55); yield* tween(h, { y: hy, curl: 0.15 }, 0.22, E.inOutQuad); })());
    }
    yield* par(...up);
    pool.dead = true;
  }

  // Pendulum: the core is torn loose on a chain of void and swings across the arena like a bell's
  // clapper, lowest (hero height) in the middle, three or four swings each faster than the last,
  // throwing embers off the floor at each pass; then it hangs at one end until the chain gives, and
  // comes down. Go through it at the bottom (a jump, or a dash). High up is no shelter: the arc rises
  // to the sides, and the slabs in its way are knocked down. Nor are the ends: the embers land there,
  // and the last blow falls on the end the hero was hugging.
  // (at the bottom the disc gouges the floor: low enough that nothing on the ground is under it,
  // and a double jump clears it with room to spare)
  const PIV_X = 640, PIV_Y = -700, CHAIN = FLOOR - 66 - PIV_Y, SWING = 0.43;
  const swingAt = (th, R) => ({ x: PIV_X + Math.sin(th) * (R || CHAIN), y: PIV_Y + Math.cos(th) * (R || CHAIN) });
  // A point on the chain d above the core's centre, set off to one side of it, and the chain's lean.
  function onChain(d, off) {
    const c = B.core, dx = PIV_X - c.x, dy = PIV_Y - c.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    return { x: c.x + ux * d - uy * off, y: c.y + uy * d + ux * off, lean: Math.atan2(uy, ux) + Math.PI / 2 };
  }
  // Where a hand holds the chain: j = 0 just above the core, 1 further up; the palm beside the chain,
  // the curled fingers over it.
  function grip(j, side) {
    const q = onChain(B.core.r + 62 + j * 104, side * 44);
    return { x: q.x, y: q.y, rot: -side * Math.PI / 2 + q.lean };
  }

  // The swinging core: contact, and the slabs it (or its chain) knocks out of the sky.
  function pendulumBody() {
    return H.add({
      kind: 'pendulum', layer: 'under', dmg: 1, x: 640, srcX: 640,
      update() {
        const c = B.core;
        this.x = this.srcX = c.x;
        for (const p of G.arena.platforms) {
          if (p.gone || p.rise < 0.6 || p.downT > 0) continue;
          const byCore = G.circleRect(c.x, c.y, c.r * 0.9, { cx: p.x + p.w / 2, cy: p.y + 8, hw: p.w / 2, hh: 10 });
          const t = (p.y - PIV_Y) / (c.y - PIV_Y), cx = PIV_X + (c.x - PIV_X) * t;
          const byChain = B.chain && !B.chain.snap && t > 0 && t < 1 && cx > p.x && cx < p.x + p.w;
          if (!byCore && !byChain) continue;
          G.arena.dropPlatform(p, 4.5);
          const px = byCore ? G.clamp(c.x, p.x, p.x + p.w) : cx;
          G.audio.play('boom'); G.fx.shake(8);
          G.fx.burst(px, p.y + 6, { n: 12, color: '22,10,18', speed: [150, 520], life: [0.6, 1.2], size: [5, 11], kind: 'chunk', grav: 1500 });
          G.fx.burst(px, p.y + 6, { n: 10, color: VCOL().blood, speed: [150, 520], life: [0.15, 0.4], kind: 'spark', size: [2, 4], grav: 700 });
          G.fx.dust(px, p.y, 5, { speed: [40, 220], size: [8, 14], life: [0.5, 1], up: 50, jitter: 40 });
        }
      },
      hits(P) { const c = B.core; return G.circleRect(c.x, c.y, c.r * 0.86, P.box()); },
      // dangerous at the hero's height only where its arc comes down that far
      danger(P) { const c = B.core, b = P.box(); return Math.abs(c.y - b.cy) < c.r + b.hh + 12 ? [c.x, c.r + 24, 0] : null; },
    });
  }

  function* atkPendulum() {
    const c = B.core, T = G.diff().tele, P = G.player;
    const hands = usableHands(), shards = !hands.length && B.hasShards;
    const n = B.phase === 3 ? 4 : 3, slow = gentle() ? 1.15 : 1, durs = [1.2, 1.0, 0.86, 0.74];
    const end = P.x < 640 ? -1 : 1;    // it will come down at the end the hero is at now,
    const s0 = n % 2 ? -end : end;      // so it is hauled back to whichever side makes that so
    c.ctrl = true;
    const ch = B.chain = { k: 0, strain: 0, snap: 0, trail: [] };
    // a chain of void comes down out of the dark and takes the core
    G.audio.play('pull');
    const order = hands.slice().sort((a, b) => b.side - a.side); // the right hand lower, the left above it
    const settle = [tween(ch, { k: 1 }, 0.55, E.inCubic), tween(c, { x: 640, y: HOME_Y[B.phase] - 16 }, 0.55)];
    for (const h of order) { h.ctrl = true; h.stuck = false; settle.push(tween(h, { y: h.y - 30, curl: 0.5 }, 0.55)); }
    yield* par(...settle);
    // torn loose
    G.audio.play('boom'); G.fx.shake(9); G.fx.ripple(c.x, c.y, 300, 0.35, 0.9);
    G.fx.burst(c.x, c.y - c.r, { n: 14, color: VCOL().void, speed: [60, 260], life: [0.5, 1], size: [4, 9] });
    G.fx.burst(c.x, c.y - c.r, { n: 10, color: VCOL().blood, speed: [150, 500], life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
    c.kick = 1; c.jit = 2.5;
    // the tell: torn loose, the core sags down on the chain, and both hands catch hold of it above the core ...
    if (shards) {
      // (with no hands left, its shards clamp on the chain in pairs instead)
      B.shardHold = true;
      B.shardPose = (i) => { const q = onChain(c.r + 46 + Math.floor(i / 2) * 58, i % 2 ? 22 : -22); return { x: q.x, y: q.y, a: q.lean }; };
    }
    const from = order.map((h) => ({ x: h.x, y: h.y, rot: h.rot, curl: h.curl })), cy0 = c.y, takeT = 0.55;
    let e = 0, caught = false;
    while (e < takeT) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / takeT), kh = E.inOutCubic(k);
      // a heavy thing dropping until the chain catches it short: it falls, dips past, and settles
      const fall = k < 0.55 ? 1.1 * (k / 0.55) * (k / 0.55) : 1 + 0.1 * (1 - E.inOutCubic((k - 0.55) / 0.45));
      c.y = G.lerp(cy0, 350, fall);
      if (k >= 0.55 && !caught) { caught = true; G.audio.play('stomp'); G.fx.shake(5); c.kick = 0.6; }
      c.jit = 2.5 * (1 - k);
      // the hands home in on a grip that is itself still moving, and are on it exactly at the end
      order.forEach((h, j) => { const g = grip(j, h.side), f = from[j]; h.x = G.lerp(f.x, g.x, kh); h.y = G.lerp(f.y, g.y, kh); h.rot = G.lerp(f.rot, g.rot, kh); h.curl = G.lerp(f.curl, 1, kh); });
      if (shards) B.shardPoseK = kh;
    }
    c.jit = 0;
    // ... and haul it back, the chain paying out, with a creak
    G.audio.play('pull');
    const R0 = Math.hypot(c.x - PIV_X, c.y - PIV_Y), haulT = 0.85 * T;
    e = 0;
    while (e < haulT) {
      const dt = yield;
      e += dt;
      const k = E.inOutCubic(Math.min(1, e / haulT));
      const p = swingAt(s0 * SWING * k, G.lerp(R0, CHAIN, k));
      c.x = p.x; c.y = p.y;
      order.forEach((h, j) => { const g = grip(j, h.side); h.x = g.x; h.y = g.y; h.rot = g.rot; });
      ch.strain = k * 0.6;
    }
    // held at full draw: the chain strains and the hands tremble on it
    G.audio.play('charge', { dur: 0.32 * T });
    e = 0;
    while (e < 0.32 * T) {
      const dt = yield;
      e += dt;
      c.jit = 1.2; ch.strain = 0.6 + 0.4 * Math.min(1, e / (0.32 * T));
      for (const h of order) h.kx = G.rand(-3, 3);
      if (Math.random() < dt * 24) { const q = onChain(c.r + G.rand(20, 320), 0); G.fx.spawn({ kind: 'spark', x: q.x, y: q.y, vx: G.rand(-120, 120), vy: G.rand(-120, 40), life: G.rand(0.1, 0.25), size: G.rand(1.2, 2.2), color: VCOL().blood, len: 0.05 }); }
    }
    c.jit = 0; ch.strain = 0.35;
    // let go: the hands throw it, open, and pull back up into the dark out of its way; it falls
    B.shardHold = false;
    const clearing = par(...order.map((h) => tween(h, { x: h.x + h.side * 90, y: -190, rot: h.side * 0.5, curl: 0.05 }, 0.6, E.inOutCubic)));
    let cleared = !order.length;
    const body = pendulumBody();
    let th0 = s0 * SWING;
    for (let i = 0; i < n; i++) {
      const d = durs[i] * slow, dir = -Math.sign(th0);
      G.audio.play('whoosh');
      let passed = false;
      e = 0;
      while (e < d) {
        const dt = yield;
        e += dt;
        // a pendulum's own motion: slow at the ends, fastest through the bottom
        const p = swingAt(th0 * Math.cos(Math.PI * Math.min(1, e / d)));
        c.x = p.x; c.y = p.y;
        ch.trail.push({ x: c.x, y: c.y, t: B.t });
        while (ch.trail.length && ch.trail[0].t < B.t - 0.22) ch.trail.shift();
        if (!cleared) cleared = clearing.next(dt).done;
        if (Math.random() < dt * 40) G.fx.spawn({ x: c.x + G.rand(-60, 60), y: c.y + G.rand(-60, 60), vx: -dir * G.rand(20, 80), vy: -G.rand(10, 60), life: G.rand(0.4, 0.8), size: G.rand(4, 8), color: VCOL().void, wob: 30 });
        if (!passed && e >= d / 2) { passed = true; scrape(dir, i === n - 1); }
      }
      th0 = -th0;
      // at the top of each swing it hangs for a breath, and tolls
      G.audio.play('bell'); G.fx.shake(3);
      if (i < n - 1) yield* wait(0.05);
    }
    // the end: it hangs at the top of its last swing, the chain draws it up as it strains ... and gives
    const m = columnMark(c.x, 236), hangT = 0.65 * T, y0 = c.y;
    G.audio.play('charge', { dur: hangT });
    e = 0;
    while (e < hangT) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / hangT);
      m.k = k; m.locked = k > 0.7; ch.strain = 0.35 + 0.65 * k; c.jit = 2.2 * k;
      c.y = y0 - 40 * E.outCubic(k);
    }
    c.jit = 0;
    ch.snap = 0.001; // (it falls apart and fades: see drawChain)
    G.audio.play('shatter');
    body.dmg = 2;
    yield* tween(c, { y: FLOOR - c.r + 16 }, 0.17, E.inQuad);
    m.dead = true; body.dead = true;
    impactFx(c.x, true);
    crushCore(2);
    G.fx.impact(c.x, FLOOR - 60, 0.07);
    G.fx.crack(c.x, 2, VCOL().blood);
    yield* wait(0.08);
    c.embedded = true;
    yield* tween(c, { open: 0.25 }, 0.2);
    yield* wait(hard() ? 0.9 : 1.2); // spent and stuck in the floor: the opening
    // back to rest: it works itself loose of the floor, then rises to its place; the hands come home with it
    yield* tween(c, { y: c.y + 8, open: 0.5 }, 0.16, E.inOutQuad);
    c.embedded = false;
    G.fx.dust(c.x, FLOOR, 4, { speed: [30, 140], size: [8, 14], life: [0.5, 1], up: 50, a: 0.36, jitter: 50 });
    // (to where its idle drift will be when it gets there, so the drift takes over without a jolt)
    const hx = 640 + Math.sin((B.t + 0.8) * 0.45) * (B.phase === 3 ? 190 : 70);
    const home = [tween(c, { x: hx, y: HOME_Y[B.phase], open: 1 }, 0.8, E.inOutCubic)];
    for (const h of order) home.push(tween(h, { x: G.clamp(hx + h.side * B.spread, 90, 1190), y: HOME_Y[B.phase] + 128, rot: h.side * 0.1, curl: 0.15 }, 0.8, E.inOutCubic));
    yield* par(...home);

    // the bottom of a pass: it scrapes the floor and throws embers on ahead, to land at the end it is
    // swinging to (not on the last pass: what lands on that end is the core itself)
    function scrape(dir, last) {
      const VC = VCOL();
      G.audio.play('streak'); G.fx.shake(6); G.fx.kick(dir * 3, 0);
      G.fx.scorch(c.x, 80, VC.blood);
      G.fx.burst(c.x, FLOOR - 4, { n: 18, color: VC.blood, speed: [200, 700], angle: dir > 0 ? -Math.PI + 0.45 : -0.45, spread: 0.8, life: [0.15, 0.45], kind: 'spark', size: [2, 4], grav: 900 });
      G.fx.dust(c.x, FLOOR, 4, { dir: -dir, speed: [60, 240], size: [8, 14], life: [0.4, 0.9], up: 40, a: 0.36, color: '40,10,24' });
      const cnt = last ? 0 : (B.phase === 3 ? 4 : 3) + (hard() ? 1 : 0);
      for (let k = 0; k < cnt; k++) H.orb(c.x + dir * 40, FLOOR - 50, dir * G.rrand(240, 520), -G.rrand(460, 700), { grav: 1100, r: 11 });
    }
  }

  // ------------------------------------------------------------------ the core's own two (v2.0a)
  // The Flare and the Sunspot are the core's alone, so they carry on into phase III, where the hands
  // are gone. Both move the core on a spring: it gathers before it throws, gives with the throw, and
  // carries past where it settles once.

  // A span of time: fn(k 0..1, dt, elapsed) every step.
  function* during(dur, fn) { let e = 0; while (e < dur) { const dt = yield; e += dt; fn(Math.min(1, e / dur), dt, e); } }
  // The core on a spring, a little under-damped: it is heavy, so it overshoots once and settles.
  function coreTo(tx, ty, dt, k, z) {
    const c = B.core; k = k || 55; z = z || 8.5;
    c.vx = (c.vx || 0) + ((tx - c.x) * k - (c.vx || 0) * z) * dt;
    c.vy = (c.vy || 0) + ((ty - c.y) * k - (c.vy || 0) * z) * dt;
    c.x += c.vx * dt; c.y += c.vy * dt;
  }
  // where its idle drift will be in `ahead` seconds, so the drift takes over without a jolt
  const driftAt = (ahead) => ({
    x: 640 + Math.sin((B.t + ahead) * 0.45) * (B.phase === 3 ? 190 : 70),
    y: HOME_Y[B.phase] + Math.sin((B.t + ahead) * 0.9) * 14,
  });
  // back to rest: it rides the spring home to where the drift will be, the swell going out of it
  function* coreHome(dur) {
    const c = B.core;
    c.swellT = 0;
    yield* during(dur, (k, dt) => { const d = driftAt(dur * (1 - k)); coreTo(d.x, d.y, dt, 26 + 30 * k, 9); });
    c.vx = c.vy = 0;
  }

  G.audio.define('flare', () => {
    const S = G.audio.synth;
    S.noise({ dur: 0.42, vol: 0.32, type: 'bandpass', f0: 260, f1: 1700, q: 0.7, attack: 0.03 });
    S.noise({ dur: 0.55, vol: 0.2, type: 'lowpass', f0: 700, f1: 160, q: 0.8, attack: 0.05 });
    S.tone({ type: 'sawtooth', f0: 96, f1: 52, dur: 0.5, vol: 0.09, attack: 0.03 });
  });
  G.audio.define('spot', (o) => {
    const S = G.audio.synth, hv = o && o.heavy;
    S.noise({ dur: hv ? 0.32 : 0.18, vol: hv ? 0.3 : 0.22, type: 'bandpass', f0: hv ? 620 : 1100, f1: hv ? 120 : 240, q: 2.2 });
    S.tone({ type: 'sine', f0: hv ? 110 : 170, f1: hv ? 38 : 70, dur: hv ? 0.42 : 0.24, vol: hv ? 0.3 : 0.18 });
  });
  G.audio.vary.spot = 1.5;

  // ---- FLARE
  // The corona swells out on one side and a loop of fire lashes out of it. Where it swells is the tell:
  // low on a side, the loop slaps the floor and rakes it to the wall on that side (jump it); high, it
  // climbs up over the hero and comes down on them from above (step out from under). Phase II lashes
  // both sides in turn; phase III is quicker, a lash along the floor is hauled back and rakes it again
  // on the way home, and a blow from above throws waves both ways and leaves the floor burning.
  function* atkFlare() {
    const c = B.core, P = G.player;
    c.ctrl = true; c.vx = c.vy = 0;
    let side = Math.abs(P.x - c.x) < 40 ? (G.rng() < 0.5 ? -1 : 1) : G.sign(P.x - c.x);
    const n = B.phase === 1 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      yield* lash(side, chance(0.5, i === 0 ? 'high' : 'high2'));
      side = -side;
    }
    yield* coreHome(0.6);
  }

  function* lash(side, high) {
    const c = B.core, P = G.player, P3 = B.phase === 3;
    const T = G.diff().tele * (P3 ? 0.85 : 1);
    const x0 = c.x, y0 = c.y;
    c.flA = side > 0 ? (high ? -0.95 : 0.62) : (high ? Math.PI + 0.95 : Math.PI - 0.62);
    // the wind-up: the corona bulges out on that side while the core draws back from it (rising to
    // throw down, sinking to throw up); the last of it trembles
    const tell = 0.8 * T;
    G.audio.play('charge', { dur: tell });
    yield* during(tell, (k, dt) => {
      const e = E.inOutQuad(k);
      c.flK = e; c.swellT = 0.065 * e; c.charge = 0.4 * e;
      coreTo(x0 - side * 36 * e, y0 + (high ? 20 : -18) * e, dt, 42, 9);
      c.jit = k > 0.72 ? (k - 0.72) / 0.28 * 1.8 : 0;
      if (Math.random() < dt * 26 * e) {
        const a = c.flA + G.rand(-0.35, 0.35);
        G.fx.spawn({ x: c.x + Math.cos(a) * c.r * 1.1, y: c.y + Math.sin(a) * c.r * 1.1, vx: Math.cos(a) * G.rand(30, 110), vy: Math.sin(a) * G.rand(30, 110) - 30, life: G.rand(0.3, 0.6), size: G.rand(3, 6), color: G.pal().boss, wob: 40 });
      }
    });
    c.jit = 0;
    // the throw: the core gives with it, a hard shrug toward the side it throws at
    const fl = flareBody(side, high);
    G.audio.play('flare');
    c.kick = 1; c.swellT = -0.035; c.charge = 0;
    c.vx += side * 300; c.vy += high ? -150 : 130;
    G.fx.kick(side * 3, high ? -2 : 2);
    if (!high) yield* rake(fl, side, x0, y0, T, P3);
    else yield* overhead(fl, side, x0, y0, T, P3);
    // the loop is drawn back into the corona and the bulge goes down
    const tx = fl.tx, ty = fl.ty;
    yield* during(0.3, (k, dt) => {
      const rt = fl.root(), e = E.inOutQuad(k);
      fl.tx = G.lerp(tx, rt.x, e); fl.ty = G.lerp(ty, rt.y, e); fl.fade = 1 - e * 0.7;
      c.flK = 0.35 * (1 - k);
      coreTo(x0, y0, dt, 34, 8);
    });
    fl.dead = true; c.flK = 0;
  }

  // low: it slaps the floor beside the core and the tip runs along it to the wall
  function* rake(fl, side, x0, y0, T, P3) {
    const c = B.core;
    const sx = G.clamp(c.x + side * 52, WL + 30, WR - 30);
    const r0 = fl.root(), sy = FLOOR - 6;
    yield* during(0.12, (k, dt) => {
      const e = E.inQuad(k);
      fl.tx = G.lerp(r0.x + side * 40, sx, e); fl.ty = G.lerp(r0.y + 30, sy, e);
      coreTo(x0 + side * 16, y0 + 8, dt, 50, 8);
    });
    // the slap
    G.fx.shake(7); G.fx.kick(0, 3); G.audio.play('slam');
    G.fx.thud(sx, FLOOR, 0.8, { col: G.pal().boss });
    G.fx.scorch(sx, 60, G.pal().boss);
    G.fx.burst(sx, FLOOR - 6, { n: 14, color: G.pal().hot, speed: [150, 520], angle: side > 0 ? -0.5 : -Math.PI + 0.5, spread: 1.2, life: [0.15, 0.4], kind: 'spark', size: [2, 3.5], grav: 900 });
    fl.crest = true; fl.crestX = sx; fl.ty = sy; fl.dir = side;
    let e = 0;
    const speed = P3 ? 660 : 560; // (about a ground wave's pace: a jump on sight clears it)
    while (true) {
      const dt = yield;
      e += dt;
      fl.crestX += side * speed * G.lerp(0.35, 1, Math.min(1, e / 0.4)) * dt;
      fl.tx = fl.crestX;
      coreTo(x0 + side * 22, y0 + 6, dt, 34, 8);
      c.flK = G.lerp(1, 0.45, Math.min(1, e / 0.5));
      if (Math.random() < dt * 22) G.fx.dust(fl.crestX - side * 20, FLOOR, 1, { dir: -side, speed: [20, 90], size: [5, 9], up: 30, a: 0.3 });
      if (fl.crestX < WL + 10 || fl.crestX > WR - 10) break;
    }
    // it breaks on the wall
    const wx = G.clamp(fl.crestX, WL + 12, WR - 12);
    G.fx.shake(6); G.audio.play('boom');
    G.fx.burst(wx, FLOOR - 26, { n: 14, color: G.pal().boss, speed: [80, 320], angle: side > 0 ? Math.PI * 1.25 : -Math.PI * 0.25, spread: 1.4, life: [0.25, 0.6], size: [3, 7] });
    G.fx.dust(wx, FLOOR, 4, { dir: -side, speed: [40, 200], size: [6, 11], up: 70 });
    if (P3) {
      // phase III: the core hauls the lash back, and its tip rakes the floor all the way home again
      fl.crestX = wx; fl.dir = -side;
      c.vx -= side * 160;
      G.audio.play('flare');
      e = 0;
      while (true) {
        const dt = yield;
        e += dt;
        fl.crestX -= side * 620 * G.lerp(0.4, 1, Math.min(1, e / 0.3)) * dt;
        fl.tx = fl.crestX;
        coreTo(x0 - side * 14, y0 + 4, dt, 34, 8);
        if (Math.random() < dt * 22) G.fx.dust(fl.crestX + side * 20, FLOOR, 1, { dir: side, speed: [20, 90], size: [5, 9], up: 30, a: 0.3 });
        if ((fl.crestX - sx) * side <= 0) break;
      }
    }
    fl.crest = false;
    yield* during(0.1, (k, dt) => coreTo(x0 + side * 10, y0, dt, 34, 8));
  }

  // high: it climbs over the hero, hangs there, and comes down
  function* overhead(fl, side, x0, y0, T, P3) {
    const c = B.core, P = G.player;
    const r0 = fl.root(), top = 104;
    let tx = G.clamp(P.x, WL + 70, WR - 70);
    const m = columnMark(tx, 132);
    // up and over
    yield* during(0.3, (k, dt) => {
      const e = E.outCubic(k);
      tx = G.damp(tx, G.clamp(P.x, WL + 70, WR - 70), 5, dt);
      fl.tx = G.lerp(r0.x, tx, e); fl.ty = G.lerp(r0.y, top, E.outQuad(k)) - Math.sin(Math.PI * k) * 40;
      m.x = tx; m.k = 0.25 * k;
      coreTo(x0 + side * 14, y0 - 10, dt, 46, 8);
    });
    // it hangs over the hero, following them
    const aimT = 0.42 * T, lockT = 0.26 * T;
    yield* during(aimT, (k, dt, e) => {
      tx = G.damp(tx, G.clamp(P.x + P.vx * 0.12, WL + 70, WR - 70), 6, dt);
      fl.tx = tx; fl.ty = top + Math.sin(e * 9) * 5;
      m.x = tx; m.k = 0.25 + 0.45 * k;
      coreTo(x0 + side * 10, y0 - 6, dt, 40, 9);
    });
    // locked: it shivers and draws up a touch before it falls
    m.locked = true;
    G.audio.play('charge', { dur: lockT });
    yield* during(lockT, (k, dt) => {
      fl.tx = tx + G.rand(-2.5, 2.5); fl.ty = top - 16 * E.outQuad(k);
      m.k = 0.7 + 0.3 * k;
      c.flK = 1 - 0.3 * k;
      coreTo(x0 + side * 6, y0 - 14 * k, dt, 40, 9);
    });
    // down, the whole loop cracking after it; the core is yanked toward the blow
    fl.falling = true;
    c.vy += 180; c.vx += Math.sign(tx - c.x) * 90;
    const fy = fl.ty;
    yield* during(0.13, (k, dt) => {
      fl.tx = tx; fl.ty = G.lerp(fy, FLOOR - 8, E.inQuad(k));
      coreTo(x0, y0 + 14, dt, 40, 8);
    });
    fl.falling = false; fl.impactT = 0.08;
    m.dead = true;
    const Pl = G.pal();
    G.fx.shake(13); G.fx.punch(0.02); G.fx.kick(0, 4); G.audio.play('slam');
    G.fx.thud(tx, FLOOR, 1.3, { col: Pl.boss });
    G.fx.ripple(tx, FLOOR - 30, 220, 0.3, 0.8);
    G.fx.scorch(tx, 90, Pl.boss);
    G.fx.burst(tx, FLOOR - 8, { n: 22, color: Pl.hot, speed: [160, 620], angle: -Math.PI / 2, spread: 2.4, life: [0.15, 0.45], kind: 'spark', size: [2, 4], grav: 900 });
    G.fx.burst(tx, FLOOR - 8, { n: 10, color: Pl.boss, speed: [60, 260], angle: -Math.PI / 2, spread: 2.6, life: [0.35, 0.8], size: [5, 10] });
    if (G.arena.gust) G.arena.gust(tx, FLOOR - 30, 1);
    if (P3) {
      H.shockwave(tx - 50, -1, 440, 44);
      H.shockwave(tx + 50, 1, 440, 44);
      H.pool({ x: tx, w: 150, tele: 0.25, active: 1.3 });
    }
    // it lies there a moment, burning
    yield* during(0.2, (k, dt) => coreTo(x0, y0 + 6, dt, 36, 8));
  }

  // The loop itself: a lash of fire from the side of the core to its tip (fl.tx, fl.ty), which the
  // scripts move. Only the tip hurts: as it runs along the floor (crest), as it falls, as it lands.
  function flareBody(side, high) {
    const c = B.core;
    return H.add({
      kind: 'flare', layer: 'over', side, high, ang: c.flA,
      tx: c.x + Math.cos(c.flA) * c.r, ty: c.y + Math.sin(c.flA) * c.r,
      crest: false, crestX: 0, falling: false, impactT: 0, fade: 1, dmg: 1,
      root() { return { x: c.x + Math.cos(this.ang) * c.r * 0.95, y: c.y + Math.sin(this.ang) * c.r * 0.95 }; },
      ctl(rt) {
        if (!this.high) {
          // low: it lies along the floor behind its tip, like a dragged lash
          const run = Math.abs(this.tx - rt.x);
          return { x: this.tx - this.side * Math.min(170, run * 0.5), y: Math.min(FLOOR - 12, this.ty + 50) };
        }
        return { x: (rt.x + this.tx) / 2 + this.side * 40, y: Math.min(rt.y, this.ty) - 120 };
      },
      update(dt) {
        this.impactT = Math.max(0, this.impactT - dt);
        this.srcX = this.crest ? this.crestX - (this.dir || this.side) * 30 : this.tx;
        // fire licks off along the lash
        const rt = this.root(), q = this.ctl(rt);
        if (Math.random() < 0.7 * this.fade) {
          const u = Math.random(), iu = 1 - u;
          const x = iu * iu * rt.x + 2 * iu * u * q.x + u * u * this.tx, y = iu * iu * rt.y + 2 * iu * u * q.y + u * u * this.ty;
          G.fx.spawn({ x, y, vx: G.rand(-30, 30), vy: -G.rand(40, 140), life: G.rand(0.25, 0.5), size: G.rand(3, 6), color: G.pal().boss, wob: 50 });
        }
      },
      hits(P) {
        if (this.crest) return G.rectsOverlap(P.box(), { cx: this.crestX, cy: FLOOR - 24, hw: 15, hh: 22 });
        // falling: the burning tip, and the stretch it has just come down through (v2.1b: a box 116 wide
        // and 180 tall round it, where nothing of the lash is drawn)
        if (this.falling) return Math.abs(P.x - this.tx) < 19 && P.y > this.ty - 20 && P.y - 43 < this.ty + 8;
        // landing: the tip where it strikes the floor and the burst of sparks off it (v2.1b: from 70
        // either side and 90 up, where nothing is drawn but the scorch on the floor)
        if (this.impactT > 0) return Math.abs(P.x - this.tx) < 26 && P.y > FLOOR - 36;
        return false;
      },
      draw(ctx) {
        const Pl = G.pal(), rt = this.root(), q = this.ctl(rt), f = this.fade, N = 22;
        const pts = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N, iu = 1 - u;
          // it writhes a little along its length, more toward the tip
          const w = Math.sin(B.t * 17 + u * 9) * 5 * u * (this.crest ? 0.4 : 1);
          pts.push([iu * iu * rt.x + 2 * iu * u * q.x + u * u * this.tx, iu * iu * rt.y + 2 * iu * u * q.y + u * u * this.ty + w]);
        }
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (const [col, ws, al] of [[Pl.boss, 2, 0.13], [Pl.boss, 1, 0.62], [Pl.hot, 0.28, 0.62]]) { // (fire, not light: a thin hot heart)
          ctx.strokeStyle = G.rgba(col, al * f);
          for (let i = 0; i < N; i++) {
            const u = i / N;
            ctx.lineWidth = G.lerp(24, 8, u) * ws * f;
            ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
          }
        }
        // the tip running along the floor: a wave of fire
        if (this.crest) {
          const d = this.dir || this.side, x = this.crestX, F = FLOOR, h = 52 * (1 + 0.08 * Math.sin(this.t * 40));
          ctx.fillStyle = G.rgba(Pl.boss, 0.3);
          ctx.beginPath(); ctx.moveTo(x - d * 84, F); ctx.quadraticCurveTo(x - d * 10, F - h * 0.5, x + d * 8, F - h * 1.15); ctx.quadraticCurveTo(x + d * 20, F - h * 0.4, x + d * 22, F); ctx.closePath(); ctx.fill();
          ctx.fillStyle = G.rgba(Pl.boss, 0.85);
          ctx.beginPath(); ctx.moveTo(x - d * 54, F); ctx.quadraticCurveTo(x - d * 6, F - h * 0.45, x + d * 6, F - h); ctx.quadraticCurveTo(x + d * 15, F - h * 0.4, x + d * 16, F); ctx.closePath(); ctx.fill();
          ctx.fillStyle = G.rgba(Pl.hot, 0.95);
          ctx.beginPath(); ctx.moveTo(x - d * 22, F); ctx.quadraticCurveTo(x, F - h * 0.4, x + d * 5, F - h * 0.8); ctx.quadraticCurveTo(x + d * 10, F - h * 0.3, x + d * 10, F); ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  }

  // ---- SUNSPOT
  // Dark spots creep over the burning rim of the core, then tear loose as dark orbs that drift out,
  // hang, and dive at where the hero is (a mark shows where each will land). How the spots gather is
  // the tell: left scattered, several light divers one after another (each can be cut down); crawling
  // together into one, a single heavy diver that bursts wide on the floor for 2 (dash through the
  // burst, or be well clear). Phase II has more spots; in phase III every diver bounces once off the
  // floor, on the way it came down, and comes down again (its new mark shows where).
  function* atkSunspot() {
    const c = B.core, T = G.diff().tele;
    c.ctrl = true; c.vx = c.vy = 0;
    const x0 = c.x, y0 = c.y;
    const one = chance(0.35, 'gathered');
    const n = [0, 3, 4, 4][B.phase] + (hard() ? 1 : 0); // (phase III's bounce is what makes it harder)
    B.spots = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + ((i + 0.5) / n - 0.5) * 2.7 + G.rand(-0.1, 0.1);
      B.spots.push({ a, a0: a, s: 0, size: G.rand(0.85, 1.1), born: i * 0.13, merge: 0 });
    }
    // the spots creep in one after another while the core rises and strains (its eye narrows); spots that
    // will be one heavy diver crawl together over the rim in the second half
    const tell = 0.95 * T;
    G.audio.play('charge', { dur: tell });
    yield* during(tell, (k, dt, e) => {
      const g = E.inOutQuad(k);
      c.swellT = 0.05 * g; c.open = 1 - 0.35 * g;
      coreTo(x0, y0 - 24 * g, dt, 40, 9);
      for (const s of B.spots) {
        s.s = G.clamp((e - s.born) / 0.32, 0, 1);
        if (one && k > 0.42) { s.merge = E.inOutCubic((k - 0.42) / 0.58); s.a = G.lerp(s.a0, -Math.PI / 2, s.merge); }
      }
      c.jit = k > 0.82 ? 1.2 : 0;
    });
    c.jit = 0;
    if (one) B.spots = [{ a: -Math.PI / 2, a0: -Math.PI / 2, s: 1, size: 2.1, born: 0, merge: 1 }];
    // they tear loose, each with a shudder through the core away from it
    const gap = [0, 0.5, 0.42, 0.42][B.phase];
    const order = B.spots.slice().sort((p, q) => Math.abs(q.a + Math.PI / 2) - Math.abs(p.a + Math.PI / 2)); // the outermost first
    for (let i = 0; i < order.length; i++) {
      const s = order[i];
      const sx = c.x + Math.cos(s.a) * c.r, sy = c.y + Math.sin(s.a) * c.r;
      B.spots.splice(B.spots.indexOf(s), 1);
      // (the heavy one swings out toward the hero as it tears loose)
      diver(sx, sy, one ? -Math.PI / 2 + G.clamp((G.player.x - c.x) / 400, -1, 1) * 0.75 : s.a, one);
      G.audio.play('spot', { heavy: one });
      c.kick = one ? 1 : 0.55; c.open = 1;
      c.vx -= Math.cos(s.a) * (one ? 170 : 90); c.vy -= Math.sin(s.a) * (one ? 170 : 90);
      G.fx.burst(sx, sy, { n: one ? 12 : 6, color: '10,6,16', speed: [40, 180], life: [0.4, 0.8], size: [5, 10], angle: s.a, spread: 1.2 });
      G.fx.burst(sx, sy, { n: one ? 10 : 5, color: G.pal().boss, speed: [100, 340], life: [0.15, 0.35], kind: 'spark', size: [1.8, 3], angle: s.a, spread: 1.4 });
      if (one) G.fx.shake(6);
      if (i < order.length - 1) yield* during(gap, (k, dt) => coreTo(x0, y0 - 24, dt, 40, 9));
    }
    // it hangs back and watches them fall, then goes home
    let e = 0;
    while (e < 5 && H.list.some((h) => h.kind === 'spot' && !h.dead)) {
      const dt = yield;
      e += dt;
      coreTo(x0, y0 - 18 + Math.sin(e * 3) * 4, dt, 36, 9);
    }
    yield* coreHome(0.6);
  }

  // One dark orb torn off the core. It drifts out from where it tore, hangs, takes aim (a mark on the
  // floor follows the hero, then locks), and dives; it bursts where it lands. Phase III: it bounces once.
  function diver(x, y, a, heavy) {
    const P = G.player, T = G.diff().tele, P3 = B.phase === 3;
    const r = heavy ? 27 : 15, R = heavy ? 120 : 52;
    const sp = heavy ? 300 : 380;
    const clampX = (v) => G.clamp(v, WL + 50, WR - 50);
    return H.add({
      kind: 'spot', layer: 'over', x, y, r, heavy, st: 'drift', e: 0, dmg: heavy ? 2 : 1,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      mx: clampX(P.x), mk: 0, locked: false, R, bounced: false, slashable: !heavy, srcX: x,
      aimT: (heavy ? 0.5 : 0.4) * T, lockT: (heavy ? 0.26 : 0.2) * T, diveT: heavy ? 0.4 : 0.32,
      update(dt) {
        this.e += dt;
        this.srcX = this.x;
        if (this.st !== 'boom' && Math.random() < 0.6) G.fx.spawn({ kind: 'smoke', color: '10,6,16', a: 0.5, x: this.x + G.rand(-4, 4), y: this.y + G.rand(-4, 4), vx: G.rand(-15, 15), vy: G.rand(-30, -5), life: G.rand(0.3, 0.6), size: this.r * 0.7, grow: this.r * 1.2, drag: 2 });
        switch (this.st) {
          case 'drift': // out from the core, slowing as it goes
            this.vx *= Math.exp(-2.6 * dt); this.vy *= Math.exp(-2.6 * dt);
            if (this.y < 80 && this.vy < 0) this.vy *= Math.exp(-14 * dt); // (it keeps below the top of the view)
            this.x += this.vx * dt; this.y += (this.vy - (this.y < 80 ? 0 : 30)) * dt;
            if (this.e > 0.5) { this.st = 'aim'; this.e = 0; this.hy = this.y; }
            break;
          case 'aim': // it hangs, bobbing; the floor where it will land is marked and follows the hero
            this.y = this.hy + Math.sin(this.e * 7) * 4;
            this.mx = G.damp(this.mx, clampX(P.x + P.vx * 0.1), 7, dt);
            this.mk = this.e / this.aimT * 0.7;
            // the heavy one is drawn across to hang over its mark, so it falls like a stone
            if (this.heavy) this.sway(dt);
            if (this.e >= this.aimT) { this.st = 'lock'; this.e = 0; this.locked = true; }
            break;
          case 'lock': // it draws up and shivers, then goes
            this.y = this.hy - 14 * G.ease.outQuad(Math.min(1, this.e / this.lockT));
            if (this.heavy) this.sway(dt); else this.x += G.rand(-1.2, 1.2);
            this.mk = 0.7 + 0.3 * Math.min(1, this.e / this.lockT);
            if (this.e >= this.lockT) { this.st = 'dive'; this.e = 0; this.sx = this.x; this.sy = this.y; G.audio.play('streak'); }
            break;
          case 'dive': {
            const k = Math.min(1, this.e / this.diveT), q = G.ease.inQuad(k);
            this.x = G.lerp(this.sx, this.mx, q); this.y = G.lerp(this.sy, FLOOR - this.r * 0.6, q);
            if (k >= 1) this.land(this.R, this.dmg, this.heavy);
            break;
          }
          case 'hop': // the bounce: a plain arc on the way it was going
            this.vy += 1500 * dt;
            this.x += this.vx * dt; this.y += this.vy * dt;
            if (this.y >= FLOOR - this.r * 0.6 && this.vy > 0) { this.y = FLOOR - this.r * 0.6; this.land(this.heavy ? 84 : 46, 1, false); }
            break;
          case 'boom':
            if (this.e >= 0.09) {
              if (P3 && !this.bounced) {
                // up again, carrying on the way it came down (straight down: out from the middle)
                this.bounced = true; this.st = 'hop'; this.e = 0;
                const dir = Math.abs(this.x - this.sx) > 20 ? G.sign(this.x - this.sx) : (G.sign(this.x - 640) || 1);
                this.vy = -640;
                const air = 2 * 640 / 1500, want = heavy ? 200 : 240;
                const lx = clampX(this.x + dir * want);
                this.vx = (lx - this.x) / air; this.mx = lx; this.mk = 0.4; this.locked = true;
              } else this.dead = true;
            }
            break;
        }
        if (this.st === 'hop') this.mk = Math.min(1, this.mk + dt * 1.2);
      },
      sway(dt) { // (on a spring: it swings in under its own weight and settles)
        this.svx = (this.svx || 0) + ((this.mx - this.x) * 16 - (this.svx || 0) * 6.5) * dt;
        this.x += this.svx * dt;
      },
      land(R, dmg, big) {
        this.st = 'boom'; this.e = 0; this.R = R; this.dmg = dmg; this.mk = 0; this.big = big;
        const Pl = G.pal();
        G.audio.play(big ? 'slam' : 'boom');
        G.fx.shake(big ? 15 : 5); G.fx.kick(0, big ? 4 : 1.5);
        G.fx.thud(this.x, FLOOR, big ? 1.6 : 0.6, { col: Pl.boss });
        G.fx.boom(this.x, FLOOR - 10, R * 0.75, { col: Pl.boss, hot: Pl.hot });
        G.fx.ring(this.x, FLOOR - 6, { r0: this.r, r1: R * 1.05, life: big ? 0.36 : 0.26, color: Pl.boss, width: big ? 8 : 5 }); // (how far the burst reached)
        G.fx.burst(this.x, FLOOR - 8, { n: big ? 18 : 8, color: '10,6,16', speed: [80, big ? 420 : 240], angle: -Math.PI / 2, spread: 2.6, life: [0.4, 0.9], size: [5, big ? 14 : 9] });
        if (big) { G.fx.ripple(this.x, FLOOR - 30, 300, 0.36, 1); G.fx.punch(0.025); if (G.fx.jolt) G.fx.jolt(1.2); }
      },
      slash() {
        this.dead = true; G.audio.play('orbPop');
        G.fx.pop(this.x, this.y, G.pal().boss, this.r);
        G.fx.burst(this.x, this.y, { n: 6, color: '10,6,16', speed: [40, 160], life: [0.3, 0.6], size: [4, 8] });
      },
      hits(Pp) {
        // the burst reaches as far as the ring drawn for it has spread (see land: F.ring eases out over
        // its life), at most R - 8 (v2.1b: it was all of R - 8 from its first frame, while the ring had
        // barely left the orb)
        if (this.st === 'boom') {
          const k = Math.min(1, (this.e + 1 / 120) / (this.big ? 0.36 : 0.26));
          const ring = G.lerp(this.r, this.R * 1.05, G.ease.outCubic(k)) + 8;
          return G.circleRect(this.x, FLOOR - 8, Math.min(ring, this.R - 8), Pp.box());
        }
        return G.circleRect(this.x, this.y, this.r * 0.8, Pp.box());
      },
      draw(ctx) {
        const Pl = G.pal();
        // where it will land
        if ((this.st === 'aim' || this.st === 'lock' || this.st === 'dive' || this.st === 'hop') && this.mk > 0) {
          const k = Math.min(1, this.mk), late = this.locked ? 0.5 + 0.5 * Math.sin(this.t * 50) : 0, w = this.st === 'hop' ? (this.heavy ? 84 : 46) : this.R;
          ctx.fillStyle = G.rgba(DANGER, 0.1 + 0.1 * k + 0.08 * late);
          ctx.beginPath(); ctx.ellipse(this.mx, FLOOR - 1, w, 9, 0, 0, G.TAU); ctx.fill();
          ctx.fillStyle = G.rgba(DANGER, 0.32);
          ctx.beginPath(); ctx.ellipse(this.mx, FLOOR - 1, w * k, 9 * k, 0, 0, G.TAU); ctx.fill();
          ctx.strokeStyle = G.rgba(DANGER, 0.5 + 0.4 * k); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(this.mx, FLOOR - 1, w, 9, 0, 0, G.TAU); ctx.stroke();
        }
        if (this.st === 'boom') return;
        // the orb: a dark body with a dull ring of the sun's colour round it, darker at the heart
        const rr = this.r * (1 + 0.07 * Math.sin(this.t * 14)) * (this.st === 'lock' ? 1.08 : 1);
        ctx.fillStyle = 'rgba(2,1,4,0.35)';
        ctx.beginPath(); ctx.arc(this.x, this.y, rr * 1.7, 0, G.TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        // a ragged little corona: a piece of the eclipse torn off, still burning at the edge
        ctx.fillStyle = G.rgba(Pl.boss, 0.55);
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * G.TAU + this.t * 0.8, L = rr * (0.25 + 0.3 * (0.5 + 0.5 * Math.sin(this.t * 11 + i * 2.3))), da = 0.2;
          ctx.moveTo(this.x + Math.cos(a - da) * rr, this.y + Math.sin(a - da) * rr);
          ctx.lineTo(this.x + Math.cos(a) * (rr + L), this.y + Math.sin(a) * (rr + L));
          ctx.lineTo(this.x + Math.cos(a + da) * rr, this.y + Math.sin(a + da) * rr);
        }
        ctx.fill();
        ctx.strokeStyle = G.rgba(Pl.boss, 0.5); ctx.lineWidth = rr * 0.5;
        ctx.beginPath(); ctx.arc(this.x, this.y, rr * 1.05, 0, G.TAU); ctx.stroke();
        ctx.strokeStyle = G.rgba(DANGER, 0.85); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.x, this.y, rr * 1.0, 0, G.TAU); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#050208';
        ctx.beginPath(); ctx.arc(this.x, this.y, rr * 0.88, 0, G.TAU); ctx.fill();
      },
    });
  }

  // ================================================================== v2.1a: from the boss study
  // (docs/boss-study.md) An answer to a hero who rides over its head (Corona), a wall with a gap
  // (Spears), a chain of rushes that ends in a crash and a long opening (Charge), and embers that
  // circle before they are let go (Orbit). All four are the core's alone, so they are there in every
  // phase, phase III included.
  G.audio.define('wCrown', () => { // light gathering on the crown: a rising, breathy swell
    const S = G.audio.synth;
    S.tone({ type: 'sine', f0: 150, f1: 420, dur: 0.6, vol: 0.12, attack: 0.3 });
    S.noise({ dur: 0.6, vol: 0.12, type: 'bandpass', f0: 600, f1: 2200, q: 1.4, attack: 0.35 });
  });
  G.audio.define('wSpear', () => { // one spear taking its place in the rank: a short glassy shimmer
    const S = G.audio.synth;
    S.tone({ type: 'triangle', f0: 640, f1: 940, dur: 0.16, vol: 0.05 });
    S.noise({ dur: 0.14, vol: 0.06, type: 'highpass', f0: 2600, f1: 3400, q: 0.7 });
  });
  G.audio.vary.wSpear = 2;
  G.audio.define('wVolley', () => { // the rank let go: a long rushing hiss under a low drone
    const S = G.audio.synth;
    S.noise({ dur: 0.8, vol: 0.24, type: 'bandpass', f0: 1900, f1: 480, q: 0.8, attack: 0.03 });
    S.tone({ type: 'sawtooth', f0: 120, f1: 64, dur: 0.55, vol: 0.07 });
  });
  G.audio.define('wRush', () => { // the core thrown at the hero: a hollow, heavy whoosh
    const S = G.audio.synth;
    S.noise({ dur: 0.28, vol: 0.3, type: 'bandpass', f0: 380, f1: 1500, q: 0.9, attack: 0.01 });
    S.tone({ type: 'sine', f0: 86, f1: 44, dur: 0.32, vol: 0.22 });
  });
  G.audio.vary.wRush = 1.5;
  G.audio.define('wWhir', (o) => { // embers circling: a whirr, higher and tighter when they spin fast
    const S = G.audio.synth, fast = o && o.fast;
    S.noise({ dur: (o && o.dur) || 0.9, vol: 0.11, type: 'bandpass', f0: fast ? 900 : 360, f1: fast ? 1600 : 520, q: 3, attack: 0.2 });
  });
  G.audio.define('wFling', () => {
    const S = G.audio.synth;
    S.noise({ dur: 0.13, vol: 0.17, type: 'bandpass', f0: 2300, f1: 700, q: 1.6 });
  });
  G.audio.vary.wFling = 1.5;

  // The hands keep out of the core's way while it works alone: spread wide, a little above it.
  function handsWide(dt, spread, lift) {
    const c = B.core;
    for (const h of usableHands()) {
      h.ctrl = true;
      const tx = G.clamp(c.x + h.side * (spread || 340), 90, 1190), ty = G.clamp(c.y + (lift == null ? 60 : lift), 100, FLOOR - 120);
      h.x = G.damp(h.x, tx, 4.5, dt); h.y = G.damp(h.y, ty, 4.5, dt);
      h.rot = G.damp(h.rot, h.side * 0.3, 6, dt); h.curl = G.damp(h.curl, 0.3, 6, dt);
    }
  }
  // A free hand's part in what the core alone is doing (v2.5c), each its own shape, so the hands say it
  // too: lances, raised and drawn in toward the core with the palms turned out, fingers spread, as if
  // drawing the light between them; rain, lifted, open, fingers up, heaving with each throw; the rings,
  // clenching and drawn in as a ring gathers, flung open as it goes; the burning floor, pressed down
  // flat, fingers out along it; the fan, turned out wide, fingers splayed. Drawn only, eased in and out
  // (h.gk), and kept close to where the hand really drifts, which is where it can be struck.
  function gesture(h, dt) {
    const c = B.core, s = h.side, n = B.attackName;
    // (the Tide presses the floor until it burns, then throws its lances like the Lance)
    const tidePress = n === 'tide' && !B.tideLit;
    let g = null;
    if (n === 'lance' || n === 'lance3' || (n === 'tide' && !tidePress)) g = [-s * 22, -18, s * 0.5, -0.24, 0];
    else if (n === 'rain') g = [-s * 10, -24, s * 0.3, -0.22, 0.03];
    else if (n === 'pulse') { const p = c.pulse || 0; g = [-s * 26 * E.inQuad(p), 6 * p, -s * 0.25 * p, 0.85 * p, -0.04 * p]; }
    else if (tidePress) g = [s * 8, 22, s * 0.8, -0.18, -0.05];
    else if (n === 'fan') g = [s * 18, -6, s * 0.7, -0.26, 0];
    h.gk = G.damp(h.gk || 0, g ? 1 : 0, 5, dt);
    if (g) h.gl = g;
    const k = h.gk, q = h.gl;
    if (!q || k < 0.002) return;
    h.pt.x += q[0] * k; h.pt.y += q[1] * k; h.pt.r += q[2] * k; h.pt.c += q[3] * k; h.pt.s += q[4] * k;
  }

  // The eye shuts once for each of what is coming (the Warden's count, as for its lances).
  function* blinks(n) {
    const c = B.core;
    c.blink = 0; c.blinkT = Math.max(c.blinkT, 3);
    yield* during(0.18, (k, dt) => handsWide(dt));
    for (let k = 0; k < n; k++) {
      G.audio.play('uiMove');
      G.fx.ring(c.x, c.y, { r0: 104, r1: 62, life: 0.16, color: G.pal().hot, width: 3 });
      yield* tween(c, { open: 0.06 }, 0.07, E.inQuad);
      yield* tween(c, { open: 1 }, 0.09, E.outQuad);
      yield* during(0.13, (q, dt) => handsWide(dt));
    }
  }

  // ---- CORONA
  // The answer to a hero riding over its head (bouncing on the core, or hanging in the air above it for
  // a second and a half). The light of the corona gathers on its crown while it sinks under them, and
  // the column under the hero is marked; then a fan of five rays bursts up through where they are and
  // embers erupt up the column. Moving off sideways answers it; staying up there does not. Phase II:
  // the fan sweeps to the side the crown leans to (go the other way). Phase III: a second fan,
  // between the first one's rays, aimed again at where the hero went.
  function* atkCorona() {
    const c = B.core, P = G.player, P2 = B.phase >= 2, P3 = B.phase === 3;
    const T = G.diff().tele * (P3 ? 0.92 : 1);
    c.ctrl = true; c.vx = c.vy = 0;
    const x0 = c.x, y0 = c.y;
    const fans = P3 ? 2 : 1;
    for (let f = 0; f < fans; f++) {
      const tell = (f === 0 ? 0.8 : 0.55) * T;
      // phase II: the side the fan will sweep to; the crown leans that way
      const sweep = P2 ? (chance(0.5, f === 0 ? 'left' : 'left2') ? -1 : 1) : 0;
      const aim = G.clamp(Math.atan2(P.y - 22 - c.y, P.x - c.x), -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
      c.crA = -Math.PI / 2 + sweep * 0.45;
      G.audio.play('wCrown');
      // the column under the hero: embers will erupt up it as the rays go
      const colX = G.clamp(P.x, WL + 50, WR - 50);
      const col = H.zone({ x: colX - 40, y: -80, w: 80, h: FLOOR + 80, tele: tell, active: 0.24, style: 'embers', onFire() { G.audio.play('boom'); G.fx.shake(4); } });
      corona(col, emberColumn);
      for (let i = 0; i < 5; i++) {
        const a = aim + (i - 2) * 0.34 + (f === 1 ? 0.17 : 0);
        H.beam({
          ox: c.x, oy: c.y, ang: a, tele: tell, lock: 0.32 * T, active: P2 ? 0.42 : 0.2, fade: 0.25, width: 24, maxLen: 1400,
          spin: sweep * 1.45, sfx: i === 2 ? 'beam' : false, shake: i === 2 ? 6 : 0,
          follow(b) { b.ox = c.x + Math.cos(b.ang) * c.r * 0.9; b.oy = c.y + Math.sin(b.ang) * c.r * 0.9; },
        });
        corona(H.list[H.list.length - 1], coronaRay);
      }
      // the wind-up: it sinks and draws in under the hero, the crown swelling; the last of it trembles
      yield* during(tell, (k, dt) => {
        const e = E.inOutQuad(k);
        c.crK = e; c.swellT = 0.05 * e; c.charge = 0.3 * e;
        coreTo(x0 - sweep * 16 * e, y0 + 28 * e, dt, 42, 9);
        c.jit = k > 0.74 ? (k - 0.74) / 0.26 * 1.6 : 0;
        handsWide(dt, 360, 40);
        if (Math.random() < dt * 30 * e) {
          const a = c.crA + G.rand(-0.7, 0.7), rr = c.r * G.rand(1.6, 2.2);
          // motes of light drawn in to the crown
          G.fx.spawn({ x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr, vx: -Math.cos(a) * 150, vy: -Math.sin(a) * 150, life: 0.35, size: G.rand(2, 4), color: G.pal().boss, kind: 'spark' });
        }
      });
      c.jit = 0;
      // the burst: it heaves up with the rays, and the column erupts
      c.kick = 1; c.swellT = -0.04; c.charge = 0; c.vy -= 280; c.vx += sweep * 140;
      G.fx.kick(0, -3);
      G.fx.burst(colX, FLOOR - 6, { n: 16, color: G.pal().boss, speed: [320, 900], angle: -Math.PI / 2, spread: 0.3, life: [0.35, 0.8], size: [3, 6], grav: 300 });
      G.fx.dust(colX, FLOOR, 3, { speed: [40, 160], size: [6, 11], up: 60 });
      yield* during(P2 ? 0.42 : 0.24, (k, dt) => { c.crK = 0.5 * (1 - k); coreTo(x0, y0 + 12, dt, 30, 8); handsWide(dt, 360, 40); });
      if (f < fans - 1) yield* during(0.08, (k, dt) => coreTo(x0, y0 + 8, dt, 34, 8));
    }
    c.crK = 0;
    yield* coreHome(0.6);
  }

  // The Corona's rays and column are warned like any beam or column, but once they go they are drawn
  // as fire, not as white light: (hazard, fired draw) keeps the shared warning and swaps the rest
  function corona(h, fired) {
    const warn = h.draw;
    h.draw = function (ctx) { if (this.t < this.tele) warn.call(this, ctx); else fired.call(this, ctx); };
  }
  function coronaRay(ctx) {
    const Pl = G.pal();
    const f = this.firing ? Math.min(1, (this.t - this.tele) / 0.04) : Math.max(0, 1 - (this.t - this.tele - this.active) / this.fade);
    if (f <= 0) return;
    const w = this.width * f * (1 + 0.08 * Math.sin(this.t * 70));
    ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
    for (const [col, ws, al] of [[Pl.boss, 1.9, 0.1], [Pl.boss, 0.7, 0.42], [Pl.hot, 0.18, 0.36]]) {
      ctx.strokeStyle = G.rgba(col, al * f); ctx.lineWidth = w * ws;
      ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ex, this.ey); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // embers erupting up the column: tongues of the sun's colour, flickering, thinning as they rise
  function emberColumn(ctx) {
    const Pl = G.pal();
    const f = this.firing ? Math.min(1, (this.t - this.tele) / 0.05) : Math.max(0, 1 - (this.t - this.tele - this.active) / this.fade);
    if (f <= 0) return;
    const cx = this.x + this.w / 2, top = -40;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, FLOOR, 0, top);
    g.addColorStop(0, G.rgba(Pl.boss, 0.4 * f)); g.addColorStop(1, G.rgba(Pl.boss, 0.06 * f));
    ctx.fillStyle = g; ctx.fillRect(this.x + this.w * 0.12, top, this.w * 0.76, FLOOR - top);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const x = cx + (i - 2) * this.w * 0.17 + Math.sin(this.t * 23 + i * 2.1) * 4, h = (FLOOR - top) * (0.6 + 0.4 * Math.sin(this.t * 17 + i * 1.3));
      ctx.strokeStyle = G.rgba(i === 2 ? Pl.hot : Pl.boss, (i === 2 ? 0.4 : 0.32) * f); ctx.lineWidth = i === 2 ? 4 : 7;
      ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x + Math.sin(this.t * 9 + i) * 8, FLOOR - h); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- SPEARS
  // Spears of light form in a rank along the far wall, from the top of the view to the floor, all but
  // where the core hangs: the gap in the rank is at its height. It sinks low (the gap is at the floor:
  // stay down) or rises to the height of a jump (the gap is in the air: be up in it as the rank passes,
  // stand on a platform, or dash through). Then the rank is let go across the arena. Phase II sends a
  // second back from the other wall; in phase III the core bobs between the two heights as the rank
  // crosses, and the gap goes with it. A core that sinks to the floor can be struck while it waits.
  const SP_LOW = FLOOR - 76, SP_HIGH = FLOOR - 206;
  function* atkSpears() {
    const c = B.core, P = G.player, T = G.diff().tele, P3 = B.phase === 3;
    c.ctrl = true; c.vx = c.vy = 0;
    const n = B.phase === 1 ? 1 : 2;
    let from = P.x < 640 ? 1 : -1; // it forms on the far side from the hero: the whole arena to cross
    for (let i = 0; i < n; i++) {
      const high = chance(0.5, i === 0 ? 'high' : 'high2');
      const gy = high ? SP_HIGH : SP_LOW;
      const w = spearWall(from);
      const tell = (i === 0 ? 1.05 : 0.72) * T, cx0 = c.x, cy0 = c.y;
      G.audio.play('charge', { dur: tell });
      // the core goes to the gap's height, leaning a little away from the rank as it forms
      let next = 0;
      yield* during(tell, (k, dt, e) => {
        const g = E.inOutQuad(Math.min(1, k * 1.5));
        coreTo(G.lerp(cx0, 640 + from * 30, g), G.lerp(cy0, gy, g), dt, 30, 8.5);
        w.form = k;
        c.swellT = 0.03 * k; c.open = 1 - 0.25 * k;
        handsWide(dt, 400, -170);
        if (e >= next) { next += 0.09; G.audio.play('wSpear'); }
      });
      w.form = 1; w.go = true;
      G.audio.play('wVolley'); G.fx.shake(4); G.fx.kick(-w.dir * 2, 0);
      c.kick = 0.6; c.vx += w.dir * 60;
      // it holds the gap open while the rank crosses (phase III: it bobs between the two heights)
      let e = 0;
      const bob0 = high ? -Math.PI / 2 : Math.PI / 2; // (starts at the height it showed)
      while (!w.dead) {
        const dt = yield;
        e += dt;
        const ty = P3 ? (SP_LOW + SP_HIGH) / 2 - Math.sin(bob0 + e * 3.4) * (SP_LOW - SP_HIGH) / 2 : gy;
        coreTo(640 + from * 12, ty, dt, 40, 9);
        c.swellT = 0.03; c.open = 0.75;
        handsWide(dt, 400, -170);
      }
      c.swellT = 0; c.open = 1;
      from = -from;
      if (i < n - 1) yield* during(0.15, (k, dt) => coreTo(640, c.y, dt, 30, 8));
    }
    yield* coreHome(0.8);
  }

  // A rank of spears from the top of the view to the floor, with a gap where the core is (the gap goes
  // with the core). Only the heads hurt: the shafts behind them are light that trails off.
  const SP_ROWS = [];
  for (let y = -6; y < FLOOR - 4; y += 23) SP_ROWS.push(y);
  function spearWall(from) {
    const c = B.core;
    return H.add({
      kind: 'spears', layer: 'over', from, dir: -from, x: from > 0 ? WR - 4 : WL + 4, form: 0, go: false, v: 0, dmg: 1,
      gapTop: 0, gapBot: 0, srcX: 0,
      update(dt) {
        // the gap: from a little above the core's middle to below it, tall enough for a hero
        this.gapTop = c.y - 76; this.gapBot = c.y + 102;
        if (this.go) {
          this.v = Math.min(580, this.v + 1500 * dt);
          this.x += this.dir * this.v * dt;
          if ((this.dir > 0 && this.x > WR + 90) || (this.dir < 0 && this.x < WL - 90)) this.dead = true;
          // where its lowest heads skim the floor, sparks and dust
          if (this.gapBot < FLOOR - 30 && Math.random() < dt * 30) {
            G.fx.burst(this.x, FLOOR - 4, { n: 1, color: G.pal().hot, speed: [80, 260], angle: this.dir > 0 ? -2.6 : -0.5, spread: 0.6, life: [0.15, 0.3], kind: 'spark', size: [1.5, 3], grav: 800 });
            G.fx.dust(this.x - this.dir * 20, FLOOR, 1, { dir: -this.dir, speed: [20, 80], size: [5, 9], up: 24, a: 0.25 });
          }
        }
        this.srcX = this.x - this.dir * 30;
      },
      // how present the spear on a row is: 0 in the gap, 1 out of it (soft at the edges)
      here(y) { const d = Math.max(this.gapTop - y, y - this.gapBot); return G.clamp((d + 4) / 16, 0, 1); },
      hits(Pp) {
        if (!this.go) return false;
        const b = Pp.box();
        // the band of the heads
        const hx = this.x - this.dir * 10;
        if (Math.abs(b.cx - hx) > b.hw + 16) return false;
        // hurt by any head drawn across the hero (v2.1b: it was anywhere outside the gap, so a low core
        // left a strip on the floor under the gap that cut with no spear in it, and the air over the top)
        const top = b.cy - b.hh, bot = b.cy + b.hh;
        for (const y of SP_ROWS) if (y > top - 8 && y < bot + 8 && this.here(y) > 0.3) return true;
        return false;
      },
      draw(ctx) {
        const Pl = G.pal(), d = this.dir, N = SP_ROWS.length;
        // (it fades as it goes into the far wall)
        const past = this.go ? (d > 0 ? this.x - WR : WL - this.x) : -1, out = G.clamp(1 - past / 80, 0, 1);
        if (out <= 0) return;
        ctx.lineCap = 'round';
        for (let i = 0; i < N; i++) {
          const y = SP_ROWS[i], pres = this.here(y);
          if (pres <= 0.01) continue;
          // they form outward from the gap, one after another
          const near = y < this.gapTop ? (this.gapTop - y) / 600 : (y - this.gapBot) / 600;
          const s = G.clamp((this.form * 1.25 - near) / 0.25, 0, 1);
          if (s <= 0) continue;
          const a = pres * E.outCubic(s) * out;
          // a spear slides out of the wall as it forms; in flight, a trail of light behind its head
          const hx = this.x - d * (1 - E.outBack(s)) * 70 + (this.go ? 0 : Math.sin(this.t * 6 + i) * 2 * d);
          const L = this.go ? 80 + Math.min(150, this.v * 0.28) : 70;
          // the shaft: dark, with the sun's colour along it; in flight a smear of it trails behind
          const g = ctx.createLinearGradient(hx - d * L, 0, hx, 0);
          g.addColorStop(0, G.rgba(Pl.boss, 0)); g.addColorStop(1, G.rgba(Pl.boss, 0.5 * a));
          ctx.strokeStyle = g; ctx.lineWidth = 9;
          ctx.beginPath(); ctx.moveTo(hx - d * L, y); ctx.lineTo(hx - d * 20, y); ctx.stroke();
          ctx.strokeStyle = 'rgba(8,5,14,' + (0.85 * a) + ')'; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(hx - d * Math.min(L, 64), y); ctx.lineTo(hx - d * 20, y); ctx.stroke();
          // the head: a long dark blade with a burning edge
          ctx.fillStyle = 'rgba(8,5,14,' + (0.92 * a) + ')';
          ctx.beginPath(); ctx.moveTo(hx + d * 8, y); ctx.lineTo(hx - d * 24, y - 8); ctx.lineTo(hx - d * 18, y); ctx.lineTo(hx - d * 24, y + 8); ctx.closePath(); ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = G.rgba(Pl.boss, 0.35 * a);
          ctx.beginPath(); ctx.moveTo(hx + d * 8, y); ctx.lineTo(hx - d * 24, y - 8); ctx.lineTo(hx - d * 18, y); ctx.lineTo(hx - d * 24, y + 8); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = G.rgba(Pl.hot, 0.7 * a); ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(hx - d * 24, y - 8); ctx.lineTo(hx + d * 8, y); ctx.lineTo(hx - d * 24, y + 8); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
      },
    });
  }

  // ---- CHARGE
  // The core comes for the hero itself: it blinks once for each rush (two, three, four by phase; one
  // more in the long form), then draws back from the hero, eye narrowed, and hurls itself at where they
  // are, a short way past them; it turns and goes again. The last rush does not stop: it carries on into
  // the floor (or a wall) and crashes. Then it lies there dazed and dimmed for a long moment: the time to
  // punish. Each rush is dodged by stepping out of its line during the draw-back, or a dash through it.
  function* atkCharge() {
    const c = B.core, P = G.player, P3 = B.phase === 3;
    const T = G.diff().tele * (P3 ? 0.9 : 1);
    c.ctrl = true; c.vx = c.vy = 0;
    const n = [0, 2, 3, 4][B.phase] + (chance(0.35, 'long') ? 1 : 0);
    yield* blinks(n);
    let ax = 0, ay = 1;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      const tell = (i === 0 ? 0.66 : 0.5) * T, sx = c.x, sy = c.y;
      G.audio.play('charge', { dur: tell });
      // the draw-back: it pulls away from the hero, the corona streaming back from its face; the aim
      // follows them, then holds for the last half (it trembles), so a step out of the line is in time
      yield* during(tell, (k, dt) => {
        if (k < 0.48) {
          const tx = P.x, ty = Math.min(P.y - 22, FLOOR - c.r + 16);
          const d = Math.hypot(tx - c.x, ty - c.y) || 1;
          ax = (tx - c.x) / d; ay = (ty - c.y) / d;
        }
        // (it draws back further when it is close, so a rush always comes from a fair distance)
        const back = Math.max(50, 300 - Math.hypot(P.x - sx, P.y - 22 - sy)), e = E.outQuad(k);
        coreTo(sx - ax * back * e, Math.min(sy - ay * back * e, FLOOR - 250), dt, 60, 10);
        c.open = 1 - 0.55 * e; c.swellT = 0.045 * e; c.charge = 0.35 * e;
        c.flA = Math.atan2(-ay, -ax); c.flK = 0.55 * e;
        c.jit = k > 0.48 ? 1.4 : 0;
        handsWide(dt, 380, -150);
      });
      c.jit = 0; c.open = 0.7; c.flK = 0;
      // the rush
      c.hurt = true; c.hurtDmg = 1;
      G.audio.play('wRush'); G.fx.kick(ax * 3, ay * 3); c.kick = 0.7;
      const reach = Math.hypot(P.x - c.x, P.y - 22 - c.y) + 130;
      let run = 0, v = 0, wall = 0, floor = false;
      while (true) {
        const dt = yield;
        v = Math.min(last ? 1450 : 1250, v + 9500 * dt);
        const step = v * dt;
        c.x += ax * step; c.y += ay * step; run += step;
        if (Math.random() < 0.9) G.fx.spawn({ x: c.x - ax * c.r * 0.9 + G.rand(-20, 20), y: c.y - ay * c.r * 0.9 + G.rand(-20, 20), vx: -ax * 160, vy: -ay * 160, life: 0.25, size: G.rand(4, 8), color: G.pal().boss });
        handsWide(dt, 380, -150);
        const fy = FLOOR - c.r + 16, lo = WL + c.r * 0.82, hi = WR - c.r * 0.82;
        if (c.y >= fy) { c.y = fy; floor = true; }
        if (c.x <= lo) { c.x = lo; wall = -1; }
        if (c.x >= hi) { c.x = hi; wall = 1; }
        if (c.y < 70) { c.y = 70; ay = Math.abs(ay); }
        if (last ? (floor || wall) : (run >= Math.min(reach, 420) || floor || wall)) break;
      }
      if (!last) {
        // it brakes on a spring and swings back up, turning on the hero again
        c.hurt = false;
        c.vx = ax * v * 0.22; c.vy = ay * v * 0.22;
        if (floor) { c.vy = -Math.abs(c.vy) - 120; G.fx.dust(c.x, FLOOR, 3, { speed: [40, 180], size: [6, 10], up: 50 }); G.fx.shake(4); }
        const bx = G.clamp(c.x + ax * 40, WL + 140, WR - 140), by = Math.min(c.y, FLOOR - 290);
        yield* during(0.26, (k, dt) => { coreTo(bx, by, dt, 46, 9); handsWide(dt, 380, -150); });
        c.open = 1;
        continue;
      }
      // the crash
      c.hurt = false;
      const ix = c.x, iy = floor ? FLOOR : c.y;
      impactFx(floor ? ix : ix + wall * c.r * 0.8, true);
      if (floor) {
        crushCore(2); // (the core's own breadth: it lands where it is)
        if (B.phase >= 2) { H.shockwave(ix - 90, -1, 560, 50); H.shockwave(ix + 90, 1, 560, 50); }
        G.fx.ripple(ix, FLOOR - 40, 300, 0.36, 1);
      } else {
        crush(c.x + wall * 30, c.y, 100, 110, 2);
        G.fx.burst(c.x + wall * c.r * 0.8, iy, { n: 14, color: '22,18,32', speed: [120, 460], angle: wall > 0 ? Math.PI : 0, spread: 1.6, life: [0.6, 1.1], size: [5, 11], kind: 'chunk', grav: 1500 });
      }
      if (G.arena.gust) G.arena.gust(ix, iy - 30, 1.3);
      // dazed: dimmed, the eye half shut and swimming, stars round it; it is open the whole time
      c.embedded = true; c.daze = 1; c.open = 0.18;
      const dazeT = [0, 1.9, 1.7, 1.5][B.phase];
      yield* during(dazeT, (k, dt, e) => {
        c.daze = 1;
        c.open = 0.18 + 0.1 * Math.sin(e * 3);
        c.jit = k > 0.85 ? 1.2 : 0;
        handsWide(dt, 380, -150);
      });
      c.jit = 0; c.embedded = false;
      // it tears itself loose and rises, coming to as it goes: the eye opens, the daze fades
      c.vy = -300; c.daze = 0.999;
      G.fx.dust(c.x, floor ? FLOOR : c.y, 4, { speed: [40, 200], size: [6, 12], up: 70 });
      const o0 = c.open, rx = c.x, ry = c.y;
      yield* during(0.35, (k, dt) => { c.open = G.lerp(o0, 1, E.inOutQuad(k)); coreTo(rx, ry - 90, dt, 30, 8); handsWide(dt, 380, -150); });
    }
    yield* coreHome(0.8);
  }

  // ---- ORBIT
  // Embers are drawn out of the corona and set circling the core. How fast they circle is the tell:
  // slowly, and they are flung one by one, each at the hero from where the orbit has carried it (keep
  // moving); in a whirl, and they all fly out at once as a ring (stand in a gap between them, or cut
  // one down). Phase II has two rings, turning opposite ways (the second ring is let go a moment
  // after the first, its embers between the first one's). In phase III the embers bounce once off a
  // wall.
  function* atkOrbit() {
    const c = B.core, P = G.player, T = G.diff().tele, P2 = B.phase >= 2, P3 = B.phase === 3;
    c.ctrl = true; c.vx = c.vy = 0;
    const x0 = c.x, y0 = c.y;
    const burst = chance(0.45, 'burst');
    // (a whirl looses a full ring of eight; flung one by one, six a ring, so a walking hero has the room)
    const rings = P2 ? 2 : 1, per = burst ? 8 : 6;
    B.orbit = [];
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < per; i++) {
        B.orbit.push({ ring: j, a: (i + j * 0.5) / per * G.TAU, R: c.r + 46 + j * 44, s: 0, born: (i + j * per) * 0.045, spin: (j ? -1 : 1) * (burst ? 4.4 : 1.15) });
      }
    }
    const tell = 1.0 * T;
    G.audio.play('wWhir', { fast: burst, dur: tell + 0.4 });
    yield* during(tell, (k, dt, e) => {
      for (const o of B.orbit) { o.s = G.clamp((e - o.born) / 0.3, 0, 1); o.a += o.spin * (0.35 + 0.65 * k) * dt; }
      coreTo(x0, y0 - 14 * E.inOutQuad(k), dt, 40, 9);
      c.swellT = 0.03 * k; c.charge = 0.25 * k;
      handsWide(dt, 380, -140);
    });
    c.charge = 0;
    const tint = null, wallB = P3;
    const fling = (o, vx, vy) => {
      const ex = c.x + Math.cos(o.a) * o.R, ey = c.y + Math.sin(o.a) * o.R;
      H.orb(ex, ey, vx, vy, {
        r: 11, tint, steer: wallB ? (b) => {
          if (b.bounced) return;
          if ((b.x < WL + b.r && b.vx < 0) || (b.x > WR - b.r && b.vx > 0)) {
            b.vx = -b.vx; b.bounced = true;
            G.fx.burst(b.x, b.y, { n: 5, color: G.pal().boss, speed: [60, 200], life: [0.15, 0.35], kind: 'spark', size: [1.5, 3] });
          }
        } : null,
      });
    };
    if (burst) {
      // all at once, ring by ring: out along their radius, carrying a little of their spin
      for (let j = 0; j < rings; j++) {
        const ring = B.orbit.filter((o) => o.ring === j);
        for (const o of ring) {
          const sp = 330, ra = o.a, tg = o.a + Math.PI / 2 * Math.sign(o.spin);
          fling(o, Math.cos(ra) * sp + Math.cos(tg) * 40, Math.sin(ra) * sp + Math.sin(tg) * 40);
        }
        B.orbit = B.orbit.filter((o) => o.ring !== j);
        G.audio.play('wFling'); G.audio.play('flare');
        c.kick = 1; c.swellT = -0.03; G.fx.shake(5);
        G.fx.ring(c.x, c.y, { r0: c.r, r1: c.r + 150 + j * 44, life: 0.3, color: G.pal().boss, width: 5 });
        yield* during(j < rings - 1 ? 0.5 : 0.35, (k, dt) => {
          for (const o of B.orbit) o.a += o.spin * dt;
          coreTo(x0, y0 - 6, dt, 36, 9); handsWide(dt, 380, -140);
        });
      }
    } else {
      // one by one: each as the orbit carries it round to face the hero, flung straight at them; the
      // inner ring first, then (phase II) a beat while the outer one closes in, then the outer
      const gap = [0, 0.32, 0.3, 0.26][B.phase];
      while (B.orbit.length) {
        const ring = Math.min(...B.orbit.map((o) => o.ring)), left = B.orbit.filter((o) => o.ring === ring);
        const ha = Math.atan2(P.y - 22 - c.y, P.x - c.x);
        let best = null, bd = 9;
        for (const o of left) { const d = Math.abs(G.angDiff(o.a, ha)); if (d < bd) { bd = d; best = o; } }
        const ex = c.x + Math.cos(best.a) * best.R, ey = c.y + Math.sin(best.a) * best.R;
        const d = Math.hypot(P.x - ex, P.y - 22 - ey) || 1, sp = 560;
        fling(best, (P.x - ex) / d * sp, (P.y - 22 - ey) / d * sp);
        B.orbit.splice(B.orbit.indexOf(best), 1);
        G.audio.play('wFling');
        c.kick = 0.45; c.vx -= (P.x - ex) / d * 50; c.vy -= (P.y - 22 - ey) / d * 50;
        const beat = left.length === 1 && B.orbit.length > 1;
        if (beat) G.audio.play('wWhir', { dur: 1 });
        yield* during(beat ? 1.0 : gap, (k, dt) => {
          for (const o of B.orbit) { o.a += o.spin * dt; if (beat) o.R = G.damp(o.R, c.r + 46, 4, dt); }
          coreTo(x0, y0 - 10, dt, 36, 9); handsWide(dt, 380, -140);
        });
      }
    }
    c.swellT = 0;
    yield* during(0.3, (k, dt) => { coreTo(x0, y0, dt, 34, 9); handsWide(dt, 380, -140); });
    yield* coreHome(0.6);
  }

  const ATTACKS = B.ATTACKS = {
    reckoning, sunburst: atkSunburst,
    slam: atkSlam, sweep: atkSweep, clap: atkClap, lance: atkLance, rain: atkRain,
    flick: atkFlick, crossfire: atkCrossfire,
    slam2: atkSlam2, sweep2: atkSweep2, lance3: atkLance3, pulse: atkPulse, comb: atkComb,
    rocket: atkRocket, tide: atkTide,
    fan: atkFan, cage: atkCage, swat: atkSwat, duet: atkDuet, duetSlam: atkDuetSlam, duetSweep: atkDuetSweep,
    dive: atkDive, storm: atkStorm, wheel: atkWheel, singularity: atkSingularity,
    halo: atkHalo, supernova: atkSupernova,
    afterhands: atkAfterhands, pendulum: atkPendulum,
    flare: atkFlare, sunspot: atkSunspot,
    corona: atkCorona, spears: atkSpears, charge: atkCharge, orbit: atkOrbit,
  };

  // ------------------------------------------------------------------ update
  B.update = function (dt) {
    B.t += dt;
    const c = B.core, P = G.player;
    c.flash = Math.max(0, c.flash - dt * 6);
    for (const h of B.hands) { h.flash = Math.max(0, h.flash - dt * 6); h.kx = (h.kx || 0) * Math.exp(-13 * dt); }
    c.kick = (c.kick || 0) * Math.exp(-11 * dt);
    // the core's swell is a spring (it overshoots as it lets go); the Flare's bulge and the Sunspot's
    // spots fade on their own once their attack is over or cut short
    c.swellV = (c.swellV || 0) + (((c.swellT || 0) - (c.swell || 0)) * 140 - (c.swellV || 0) * 11) * dt;
    c.swell = (c.swell || 0) + c.swellV * dt;
    if (B.attackName !== 'flare') c.flK = Math.max(0, (c.flK || 0) - dt * 3);
    if (B.attackName !== 'corona') c.crK = Math.max(0, (c.crK || 0) - dt * 3);
    if (B.attackName !== 'charge' || c.daze < 1) c.daze = Math.max(0, (c.daze || 0) - dt * 2.5);
    if (B.orbit && B.orbit.length && B.attackName !== 'orbit') {
      for (const o of B.orbit) o.s -= dt * 3;
      B.orbit = B.orbit.filter((o) => o.s > 0);
    }
    if (B.spots && B.spots.length && B.attackName !== 'sunspot') {
      for (const s of B.spots) s.fade = (s.fade == null ? 1 : s.fade) - dt * 3;
      B.spots = B.spots.filter((s) => s.fade > 0);
    }
    for (const r of B.rays) r.t += dt;

    poseClear(c);
    for (const h of B.hands) poseClear(h);
    if (B.script) {
      if (B.script.next(dt).done) B.script = null;
    }
    if (!B.script && B.active && !B.dead && !B.dying && G.state === 'fight' && !P.dead) B.script = think();

    // idle drift for anything a script is not holding
    if (!c.ctrl && !B.dead) {
      const wide = B.phase === 3 ? 190 : 70;
      c.x = G.damp(c.x, 640 + Math.sin(B.t * 0.45) * wide, 2.2, dt);
      c.y = G.damp(c.y, HOME_Y[B.phase] + Math.sin(B.t * 0.9) * 14, 2.6, dt);
      c.open = G.damp(c.open, 1, 6, dt);
    }
    for (const h of B.hands) {
      if (!h.alive) continue;
      if (h.broken > 0) {
        // lying broken on the floor until it knits itself back together
        h.broken -= dt; h.gk = 0;
        h.x = G.clamp(h.x, 110, 1170);
        h.y = G.damp(h.y, FLOOR - 50, 9, dt); h.rot = G.damp(h.rot, h.side * 1.25, 8, dt); h.curl = G.damp(h.curl, 0.6, 8, dt);
        if (h.broken <= 0) {
          h.broken = 0; h.hp = h.maxHp;
          G.audio.play('ring');
          G.fx.ring(h.x, h.y, { r0: 150, r1: 40, life: 0.45, color: G.pal().boss, width: 7 });
        }
        continue;
      }
      // a hand that sank into the floor (the Afterhands) is drawn cut off at the floor until it is clear of it
      if (h.sunk && !h.ctrl && h.y < FLOOR - 60) h.sunk = 0;
      if (h.ctrl) { h.gk = 0; continue; } // (a hand at work holds its own pose; the springs carry it over)
      // while the core works alone, a free hand shapes what it is about to do (drawn only)
      gesture(h, dt);
      const tx = G.clamp(c.x + h.side * (B.spread + Math.sin(B.t * 0.8 + h.side) * 16), 90, 1190);
      const ty = c.y + 128 + Math.cos(B.t * 1.1 + h.side * 2) * 18;
      h.x = G.damp(h.x, tx, 4.5, dt); h.y = G.damp(h.y, ty, 4.5, dt);
      // after an attack: it shakes itself out, closes to a fist once and opens again
      const fl = h.flex || 0;
      h.flex = Math.max(0, fl - dt * 1.7);
      h.rot = G.damp(h.rot, h.side * 0.1 + Math.sin(B.t * 27 + h.side) * 0.16 * fl * fl, 7, dt);
      h.curl = G.damp(h.curl, 0.13 + 0.07 * Math.sin(B.t * 1.3 + h.side * 1.7) + 0.8 * Math.sin(Math.PI * Math.min(1, fl * 1.25)) * (fl > 0 ? 1 : 0), fl > 0 ? 12 : 7, dt);
    }
    // the drawn pose follows on its springs (after every script and drift has had its say this step)
    poseStep(c, dt, 0, 14000);
    for (const h of B.hands) poseStep(h, dt, 0.00016, 9000);
    // and under it the bones, each on its own spring
    coreRig(c, dt);
    for (const h of B.hands) handRig(h, dt);

    // an occasional blink while it is not busy
    c.blink = Math.max(0, c.blink - dt);
    if (!B.staggered && !B.dying && !B.attackName && c.charge <= 0 && c.open > 0.9) {
      c.blinkT -= dt;
      if (c.blinkT <= 0) { c.blink = 0.17; c.blinkT = G.rand(2.4, 6); }
    }

    // the eye follows the player
    const dx = P.x - c.x, dy = P.y - 22 - c.y, d = Math.hypot(dx, dy) || 1;
    c.lx = G.damp(c.lx, dx / d, 8, dt); c.ly = G.damp(c.ly, dy / d, 8, dt);

    // how long the player has been resting on a platform (see the swat attack)
    B.airT = G.clamp(B.airT + (!P.onGround && P.y < FLOOR - 110 && !P.dead ? dt : -dt * 0.7), 0, 4);
    // riding over its head: bouncing on the core or hanging just above it (the Corona answers it)
    const over = !P.dead && B.active && !B.staggered && Math.abs(P.x - c.x) < c.r + 64 && P.y < c.y - c.r * 0.55 && P.y > c.y - c.r - 360;
    B.above = G.clamp((B.above || 0) + (over ? dt : -dt * 0.5), 0, ABOVE_T + 1);
    if (P.plat && !P.dead) { B.campT = Math.min(4, B.campT + dt); B.campPlat = P.plat; }
    else B.campT = Math.max(0, B.campT - dt * 0.5);

    // shards circle the core in phase 3; the halo attack widens the circle into a ring of blades
    B.shardA += B.shardSpin * dt;
    // shards a script held in a pose (the corrupted attacks) drift back to their circle once let go
    if (!B.shardHold && B.shardPoseK > 0) B.shardPoseK = Math.max(0, B.shardPoseK - dt * 2.2 * (0.4 + B.shardPoseK));
    // a chain of void that has been let go or has snapped falls apart and fades
    if (B.chain && B.chain.snap) { B.chain.snap += dt; if (B.chain.snap > 0.6) B.chain = null; }
    if (B.hasShards) B.shardR = G.damp(B.shardR, B.shardsOut ? 1100 : (B.haloR || c.r + 74), B.shardsOut ? 3 : 5, dt);

    // contact damage while a part is mid-attack
    if (G.canHurt()) {
      for (const h of B.hands) {
        if (!h.hurt || !usable(h)) continue;
        const b = handBox(h);
        b.hw *= 0.8; b.hh *= 0.88;
        if (G.rectsOverlap(P.box(), b)) P.tryHit(h.hurtDmg, h.x, h);
      }
      if (c.hurt && G.circleRect(c.x, c.y, c.r * 0.88, P.box())) P.tryHit(c.hurtDmg || 2, c.x, c);
      if (B.haloHurt && B.hasShards) {
        for (let i = 0; i < 6; i++) {
          const a = B.shardA + i * G.TAU / 6;
          const sx = c.x + Math.cos(a) * B.shardR, sy = c.y + Math.sin(a) * B.shardR;
          if (sy < FLOOR + 10 && G.circleRect(sx, sy, 17, P.box())) P.tryHit(1, sx, B.halo);
        }
      }
    }
  };

  // ------------------------------------------------------------------ drawing
  function star4(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.28, y - s * 0.28); ctx.lineTo(x + s, y);
    ctx.lineTo(x + s * 0.28, y + s * 0.28); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.28, y + s * 0.28);
    ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.28, y - s * 0.28); ctx.closePath(); ctx.fill();
  }

  // Jagged cracks that spread over the disc through phase 3.
  const CRACKS = [];
  (function () {
    let s = 4242;
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 9; i++) {
      const pts = [];
      let a = r() * G.TAU, rad = 0.12 + r() * 0.2;
      for (let k = 0; k < 5; k++) {
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
        a += (r() - 0.5) * 0.9; rad += 0.14 + r() * 0.12;
      }
      CRACKS.push(pts);
    }
  })();

  function drawSun(ctx, c) {
    const P = G.PAL[4], r = c.r, k = c.sun;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = k;
    ctx.drawImage(G.fx.glow(P.boss), -r * 6, -r * 6, r * 12, r * 12);
    ctx.fillStyle = G.rgba(P.hot, 0.16);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * G.TAU + B.t * 0.08, w = 0.05 + 0.03 * Math.sin(B.t * 1.3 + i);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - w) * 900, Math.sin(a - w) * 900);
      ctx.lineTo(Math.cos(a + w) * 900, Math.sin(a + w) * 900);
      ctx.closePath(); ctx.fill();
    }
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, G.rgba(P.hot, 1)); g.addColorStop(0.7, G.rgba(P.hot, 0.95)); g.addColorStop(1, G.rgba(P.boss, 0.9));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * G.lerp(0.5, 1, k), 0, G.TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawCore(ctx) {
    const P = G.pal(), c = B.core, r = c.r, t = B.t;
    ctx.save();
    // its tremble (c.jit, and any a script asks of the pose) is smooth, not a new random place each frame
    const pp = c.pp || NOPOSE, jt = (c.jit || 0) + (c.shk || 0);
    ctx.translate(c.x + pp.x + (jt ? quiver(t, 0.3) * jt : 0), c.y + pp.y + (jt ? quiver(t * 1.17, 2.9) * jt : 0));
    if (B.dead) { drawSun(ctx, c); ctx.restore(); return; }
    if (c.kick > 0.01) { const ks = 1 - 0.045 * c.kick; ctx.scale(ks, ks); }
    // drawn out along its path when it is thrown; then the pose's squash and swell
    if ((c.st || 0) > 0.003) { ctx.rotate(c.va); ctx.scale(1 + c.st, 1 - 0.5 * c.st); ctx.rotate(-c.va); }
    if (Math.abs(pp.s) > 0.002 || Math.abs(pp.g) > 0.002) ctx.scale((1 + pp.g) * (1 - 0.5 * pp.s), (1 + pp.g) * (1 + pp.s));
    if (c.swell) ctx.scale(1 + c.swell, 1 + c.swell);
    const dim = B.staggered ? 0.4 : 1 - 0.5 * (c.daze || 0);
    const ch = c.charge;
    // its parts, each lagging the disc on its own spring (see coreRig; none without a rig)
    const cr = c.rg, gv = (o) => (cr ? o.x : 0);
    const hx = gv(cr && cr.hx), hy = gv(cr && cr.hy), kx = gv(cr && cr.kx), ky = gv(cr && cr.ky);
    const fdx = gv(cr && cr.dx), fdy = gv(cr && cr.dy), tw = gv(cr && cr.tw);

    // halo and corona
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.5 + 0.25 * ch) * dim;
    ctx.drawImage(G.fx.glow(P.boss), hx - r * 3.6, hy - r * 3.6, r * 7.2, r * 7.2);
    ctx.globalAlpha = 1;
    const N = 46;
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? G.rgba(P.boss, 0.5 * dim) : G.rgba(P.hot, 0.75 * dim);
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const a = i / N * G.TAU + t * 0.06 + tw;
        const n = (Math.sin(t * 1.9 + i * 2.4) * 0.5 + 0.5) * (0.55 + 0.45 * Math.sin(t * 3.1 + i * 1.7));
        let L = r * (0.14 + 0.44 * Math.max(0, n)) * (1 + ch * 0.5) * (pass === 0 ? 1 : 0.5) * (0.4 + 0.6 * dim);
        // the Flare's tell: the corona bulges out on one side
        if (c.flK > 0.01) { const d = G.angDiff(a, c.flA); L *= 1 + 2.6 * c.flK * Math.exp(-d * d / 0.16); }
        // the Corona's tell: light gathering on its crown, leaning the way a phase II fan will sweep
        if (c.crK > 0.01) { const d = G.angDiff(a, c.crA); L *= 1 + 1.9 * c.crK * Math.exp(-d * d / 0.45); }
        const da = G.TAU / N * (pass === 0 ? 0.48 : 0.26), lean = L / (r * 0.6); // (the longer a flame, the further it leans back)
        ctx.moveTo(kx * 0.4 + Math.cos(a - da) * r * 0.97, ky * 0.4 + Math.sin(a - da) * r * 0.97);
        ctx.lineTo(kx + fdx * lean + Math.cos(a) * (r + L), ky + fdy * lean + Math.sin(a) * (r + L));
        ctx.lineTo(kx * 0.4 + Math.cos(a + da) * r * 0.97, ky * 0.4 + Math.sin(a + da) * r * 0.97);
        ctx.closePath();
      }
      ctx.fill();
    }
    // the rim: lagging a little and wobbling out of round after a hard start, stop or blow
    const rmx = gv(cr && cr.rx), rmy = gv(cr && cr.ry), wx = 1 + gv(cr && cr.ex), wy = 1 + gv(cr && cr.ey);
    ctx.strokeStyle = G.rgba(P.boss, 0.5 * dim); ctx.lineWidth = 13;
    ctx.beginPath(); ctx.ellipse(rmx, rmy, (r + 3) * wx, (r + 3) * wy, 0, 0, G.TAU); ctx.stroke();
    ctx.strokeStyle = G.rgba(P.hot, 0.95 * dim); ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.ellipse(rmx, rmy, (r + 1) * wx, (r + 1) * wy, 0, 0, G.TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    // the dark disc
    const g = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#12101c'); g.addColorStop(1, '#020204');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, G.TAU); ctx.fill();

    // the Flare's tell, past the bulge: loops of fire standing up off the rim on that side
    if (c.flK > 0.05) {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 0.3, a = c.flA + off, hgt = r * (0.5 + 0.55 * c.flK) * (1 - Math.abs(off) * 0.9) * (1 + 0.12 * Math.sin(t * 9 + i * 2));
        const a0 = a - 0.16, a1 = a + 0.16;
        ctx.strokeStyle = G.rgba(i === 1 ? P.hot : P.boss, (0.35 + 0.4 * c.flK) * dim); ctx.lineWidth = 5 + 4 * c.flK;
        ctx.beginPath(); ctx.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
        ctx.quadraticCurveTo(Math.cos(a) * (r + hgt * 2), Math.sin(a) * (r + hgt * 2), Math.cos(a1) * r, Math.sin(a1) * r); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // the Sunspot's tell: dark spots eating into the burning rim, the corona dimmed round each
    if (B.spots && B.spots.length) {
      for (const s of B.spots) {
        const k = s.s * (s.fade == null ? 1 : s.fade);
        if (k <= 0.01) continue;
        const sr = r * 0.17 * s.size * k * (1 + 0.08 * Math.sin(t * 6 + s.a0 * 3)), px = Math.cos(s.a) * r, py = Math.sin(s.a) * r;
        const g2 = ctx.createRadialGradient(px, py, 0, px, py, sr * 2.7);
        g2.addColorStop(0, 'rgba(3,2,6,0.92)'); g2.addColorStop(0.45, 'rgba(3,2,6,0.55)'); g2.addColorStop(1, 'rgba(3,2,6,0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(px, py, sr * 2.7, 0, G.TAU); ctx.fill();
        ctx.fillStyle = '#040207'; ctx.beginPath(); ctx.arc(px, py, sr, 0, G.TAU); ctx.fill();
        // (a hot thread of penumbra round it, so the spots still read on a corrupted, pitch-black core)
        ctx.strokeStyle = G.rgba(P.hot, 0.7 * k); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(px, py, sr * 1.35, 0, G.TAU); ctx.stroke();
      }
    }
    // cracks in phase 3, more as it weakens
    if (B.phase === 3) {
      const frac = 1 - B.hp / (B.maxHp / 3);
      const count = Math.round(G.clamp(frac, 0, 1) * CRACKS.length);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(P.hot, 0.85); ctx.lineWidth = 2; ctx.lineJoin = 'round';
      for (let i = 0; i < count; i++) {
        const pts = CRACKS[i];
        ctx.beginPath();
        for (let k = 0; k < pts.length; k++) {
          const px = pts[k][0] * r, py = pts[k][1] * r;
          if (Math.hypot(px, py) > r * 0.96) break;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // the eye
    const lid = c.blink > 0 ? Math.max(0.06, Math.abs(c.blink / 0.17 * 2 - 1)) : 1;
    // (on its rig the lid swings wider than told as it opens, never more shut; the eye rides in its socket)
    const lidK = cr ? Math.max(lid * c.open, cr.lid.x) : lid * c.open;
    const ew = r * 0.62, eh = r * 0.36 * lidK;
    ctx.save();
    ctx.translate(gv(cr && cr.sx), gv(cr && cr.sy));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-ew, 0); ctx.quadraticCurveTo(0, -eh * 2, ew, 0); ctx.quadraticCurveTo(0, eh * 2, -ew, 0);
    ctx.closePath();
    ctx.fillStyle = G.rgba(P.boss, 0.14 + 0.2 * ch);
    ctx.fill();
    ctx.clip();
    const ir = r * 0.2 * (1 + 0.15 * ch);
    const ix = (cr ? cr.ix.x : c.lx) * ew * 0.42, iy = (cr ? cr.iy.x : c.ly) * r * 0.08;
    ctx.globalCompositeOperation = 'lighter';
    const gs = ir * (2.6 + 2 * ch);
    ctx.drawImage(G.fx.glow(P.boss), ix - gs, iy - gs, gs * 2, gs * 2);
    ctx.fillStyle = G.rgba(P.hot, 0.95);
    ctx.beginPath(); ctx.arc(ix, iy, ir, 0, G.TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050308';
    ctx.beginPath(); ctx.ellipse(ix, iy, ir * 0.26, ir * 0.86, 0, 0, G.TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = G.rgba(P.boss, 0.9 * (0.5 + 0.5 * dim)); ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-ew, 0); ctx.quadraticCurveTo(0, -eh * 2, ew, 0); ctx.quadraticCurveTo(0, eh * 2, -ew, 0);
    ctx.stroke();
    ctx.restore();

    // rays of light breaking out while it dies
    if (B.rays.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const ray of B.rays) {
        const a = Math.min(1, ray.t * 5), w = ray.w * a;
        ctx.fillStyle = G.rgba(G.PAL[4].hot, 0.5 * a);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ray.a - w) * 1100, Math.sin(ray.a - w) * 1100);
        ctx.lineTo(Math.cos(ray.a + w) * 1100, Math.sin(ray.a + w) * 1100);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    if (c.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,' + (c.flash * 0.34) + ')';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, G.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // ring-pulse warning closing in on the core
    if (c.pulse > 0) {
      ctx.strokeStyle = G.rgba(DANGER, 0.3 + 0.6 * c.pulse); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, G.lerp(290, r + 8, E.inQuad(c.pulse)), 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = G.rgba(DANGER, 0.2 + 0.3 * c.pulse); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, G.lerp(400, r + 8, E.inQuad(c.pulse)), 0, G.TAU); ctx.stroke();
    }
    // which way the wheel will turn
    if (c.spinHint) {
      ctx.strokeStyle = G.rgba(DANGER, 0.9); ctx.fillStyle = G.rgba(DANGER, 0.9); ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const base = i * Math.PI + t * 2.2 * c.spinHint;
        const a0 = base, a1 = base + 1.1 * c.spinHint, rr = r + 46;
        ctx.beginPath(); ctx.arc(0, 0, rr, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
        const hx = Math.cos(a1) * rr, hy = Math.sin(a1) * rr, ta = a1 + Math.PI / 2 * c.spinHint;
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(ta) * 16, hy + Math.sin(ta) * 16);
        ctx.lineTo(hx + Math.cos(a1) * 10, hy + Math.sin(a1) * 10);
        ctx.lineTo(hx - Math.cos(a1) * 10, hy - Math.sin(a1) * 10);
        ctx.closePath(); ctx.fill();
      }
    }
    // the Orbit's embers circling it (in a whirl they streak)
    if (B.orbit && B.orbit.length) {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const o of B.orbit) {
        const s = G.clamp(o.s, 0, 1);
        if (s <= 0.01) continue;
        const R = G.lerp(r * 0.9, o.R, E.outBack(s)), ex = Math.cos(o.a) * R, ey = Math.sin(o.a) * R;
        const tail = G.clamp(Math.abs(o.spin) * 0.11, 0.08, 0.6) * Math.sign(o.spin);
        ctx.strokeStyle = G.rgba(P.boss, 0.45 * s); ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(0, 0, R, o.a - (tail > 0 ? tail : 0), o.a - (tail < 0 ? tail : 0)); ctx.stroke();
        ctx.fillStyle = G.rgba(DANGER, 0.85 * s);
        ctx.beginPath(); ctx.arc(ex, ey, 10 * s, 0, G.TAU); ctx.fill();
        ctx.fillStyle = G.rgba(P.hot, 0.9 * s);
        ctx.beginPath(); ctx.arc(ex, ey, 5 * s, 0, G.TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // dazed stars while staggered (and while the Charge has left it dazed)
    if (B.staggered || c.daze > 0.05) {
      ctx.fillStyle = G.rgba(G.COL.starHot, 0.95 * (B.staggered ? 1 : c.daze));
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + i * 2.094;
        star4(ctx, hx * 0.6 + Math.cos(a) * 56, hy * 0.6 - r - 26 + Math.sin(a) * 9, 9);
      }
    }
    ctx.restore();
  }

  // The Pendulum's chain of void, from the dark above down to the core, and the smear the core leaves
  // as it swings. Once it snaps (or is let go) its links fly apart, fall and fade.
  function drawChain(ctx) {
    const ch = B.chain;
    if (!ch || B.dead) return;
    const c = B.core, VC = VCOL(), sn = ch.snap || 0, fade = sn ? Math.max(0, 1 - sn / 0.6) : 1;
    // the smear: void, edged in blood, gone in a fifth of a second
    for (const q of ch.trail) {
      const k = 1 - (B.t - q.t) / 0.22;
      if (k <= 0) continue;
      ctx.fillStyle = 'rgba(6,0,4,' + (0.2 * k * fade) + ')';
      ctx.beginPath(); ctx.arc(q.x, q.y, c.r * (0.55 + 0.4 * k), 0, G.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(VC.blood, 0.07 * k * fade); ctx.lineWidth = 2; ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    const dx = PIV_X - c.x, dy = PIV_Y - c.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const ax = c.x + ux * c.r * 0.92, ay = c.y + uy * c.r * 0.92, lean = Math.atan2(uy, ux) + Math.PI / 2;
    const sTop = uy < -0.05 ? Math.min(L, (-60 - ay) / uy) : L; // where it leaves the top of the picture
    const s0 = sTop * (1 - ch.k), strain = ch.strain || 0;      // while it comes down, its end is up the line
    const b1 = c.rg ? c.rg.b1.x : 0, b2 = c.rg ? c.rg.b2.x : 0;   // (its bow and whip: pinned at the core and the pivot)
    ctx.save();
    ctx.globalAlpha = fade;
    for (let s = s0, j = 0; s < sTop + 40; s += 19, j++) {
      let x = ax + ux * s, y = ay + uy * s, rot = lean;
      if (b1 || b2) {
        const q = Math.PI * G.clamp(s / L, 0, 1), o = b1 * Math.sin(q) + b2 * Math.sin(2 * q), dq = (b1 * Math.cos(q) + 2 * b2 * Math.cos(2 * q)) * Math.PI / L;
        x -= uy * o; y += ux * o; rot += Math.atan(dq);
      }
      if (sn) {
        // snapped: each link flies off its own way and falls
        const r = Math.abs(Math.sin(j * 12.9898) * 43758.5453) % 1;
        x += (r - 0.5) * 220 * sn; y += (0.4 + r) * 1100 * sn * sn - 60 * sn * r; rot += (r - 0.5) * 14 * sn;
      } else if (strain > 0.6) x += G.rand(-1, 1) * (strain - 0.6) * 5;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot);
      if (j % 2 === 0) {
        // a link seen face on ...
        ctx.beginPath(); ctx.ellipse(0, 0, 7, 13, 0, 0, G.TAU);
        ctx.strokeStyle = '#090206'; ctx.lineWidth = 5; ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = G.rgba(VC.blood, 0.3 + 0.5 * strain); ctx.lineWidth = 1.6; ctx.stroke();
      } else {
        // ... and the next, edge on
        G.roundRect(ctx, -2.5, -14, 5, 28, 2.5);
        ctx.fillStyle = '#090206'; ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = G.rgba(VC.blood, 0.22 + 0.4 * strain); ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawShards(ctx) {
    if (!B.hasShards) return;
    const P = G.pal(), c = B.core;
    const pk = B.shardPose ? B.shardPoseK : 0;
    for (let i = 0; i < 6; i++) {
      const a = B.shardA + i * G.TAU / 6;
      let x = c.x + Math.cos(a) * B.shardR, y = c.y + Math.sin(a) * B.shardR;
      let rot = a + Math.PI / 2 + (B.shardsOut ? Math.PI / 2 : 0) + (c.rg && c.rg.sh.a ? c.rg.sh.a[i] : 0); // (each rocking in turn: drawn only)
      if (pk > 0) {
        // held in a pose by a corrupted attack: sunk into the floor, or clamped on the chain
        const q = B.shardPose(i), k = E.inOutCubic(Math.min(1, pk));
        x = G.lerp(x, q.x, k); y = G.lerp(y, q.y, k); rot += G.angDiff(rot, q.a) * k;
      }
      if (x < -80 || x > G.W + 80 || y < -80 || y > G.H + 80) continue;
      if (B.haloR && y > FLOOR + 12) continue; // a blade passing under the floor
      ctx.save();
      if (pk > 0) { ctx.beginPath(); ctx.rect(-200, -2000, G.W + 400, FLOOR + 2002); ctx.clip(); }
      ctx.translate(x, y); ctx.rotate(rot);
      if (B.haloR) {
        // blades: larger, and lit in the warning colour
        ctx.scale(1.5, 1.5);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6;
        ctx.drawImage(G.fx.glow(DANGER), -26, -26, 52, 52);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = '#0b0910';
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(8, 0); ctx.lineTo(0, 26); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = G.rgba(P.hot, 0.9); ctx.lineWidth = 1.8; ctx.stroke();
      ctx.restore();
    }
  }

  const FINGERS = [
    { x: -39, len: 64, ang: -0.17 },
    { x: -13, len: 78, ang: -0.055 },
    { x: 13, len: 74, ang: 0.055 },
    { x: 39, len: 56, ang: 0.17 },
  ];

  // One finger (or the thumb) as a chain of bones, seen face on from (x, y) at angle base. Each joint
  // folds towards the viewer (fold, rad), so a bone shortens as it folds and one folded past square lies
  // back down behind the palm; each can also lean in the plane (lean). Drawn as tapered strokes, the lit
  // edge of them all first and then the fill, so the bones read as one finger, with a crease at each bend.
  function drawDigit(ctx, x, y, base, fold, lean, len, seg, wid, stroke, crease) {
    const n = fold.length, px = [0, 0], py = [14, 0];
    let phi = 0, psi = 0, cx = 0, cy = 0;
    for (let k = 0; k < n; k++) {
      phi += fold[k]; psi += lean ? lean[k] : 0;
      const l = len * seg[k] * Math.cos(phi);
      cx += Math.sin(psi) * l; cy -= Math.cos(psi) * l;
      px.push(cx); py.push(cy);
    }
    ctx.save();
    ctx.translate(x, y); ctx.rotate(base);
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? '#100d18' : stroke;
      for (let k = 0; k <= n; k++) {
        ctx.lineWidth = wid[Math.max(0, k - 1)] + (pass ? -2.5 : 2.5);
        ctx.beginPath(); ctx.moveTo(px[k], py[k]); ctx.lineTo(px[k + 1], py[k + 1]); ctx.stroke();
      }
    }
    // a crease across each joint that bends (towards the tip they are drawn only while the bone still points up)
    ctx.strokeStyle = crease; ctx.lineWidth = 2;
    phi = fold[0];
    for (let k = 1; k < n; k++) {
      phi += fold[k];
      const b = Math.abs(fold[k]);
      if (b < 0.12 || Math.cos(phi - fold[k]) < 0.2) continue;
      const dx = px[k + 1] - px[k], dy = py[k + 1] - py[k], d = Math.hypot(dx, dy) || 1, hw = wid[k] * 0.3;
      ctx.globalAlpha = Math.min(1, b * 1.6);
      ctx.beginPath(); ctx.moveTo(px[k + 1] - dy / d * hw, py[k + 1] + dx / d * hw); ctx.lineTo(px[k + 1] + dy / d * hw, py[k + 1] - dx / d * hw); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHand(ctx, h) {
    if (!h.alive) return;
    const P = G.pal(), pp = h.pp || NOPOSE, c = G.clamp(h.curl + pp.c, -0.3, 1);
    const danger = h.hurt || h.hot > 0;
    const edge = danger ? DANGER : P.boss;
    const dimK = h.broken > 0 ? 0.2 : h.stuck ? 0.4 : 1;
    // a hot hand trembles (and any tremble a script asks of it): smooth, not a new random place each frame
    const j = (h.hot > 0 && !h.hurt ? 1.6 : 0) + (h.shk || 0), t = B.t;
    ctx.save();
    // sunk into the floor (the Afterhands): only what is above the floor shows
    if (h.sunk) { ctx.beginPath(); ctx.rect(-200, -2000, G.W + 400, FLOOR + 2002); ctx.clip(); }
    const dx = h.x + (h.kx || 0) + pp.x + (j ? quiver(t, h.side * 1.7) * j : 0), dy = h.y + pp.y + (j ? quiver(t * 1.13, 4 + h.side) * j : 0);
    ctx.translate(dx, dy);
    // drawn out along its path when it moves fast; then the pose's own squash and swell (about the
    // heel of the hand when it is down on the floor, so it stays on it)
    if ((h.st || 0) > 0.003) { ctx.rotate(h.va); ctx.scale(1 + h.st, 1 - 0.5 * h.st); ctx.rotate(-h.va); }
    if (Math.abs(pp.s) > 0.002 || Math.abs(pp.g) > 0.002) {
      const ay = dy > FLOOR - 130 ? Math.max(0, FLOOR - dy) : 0;
      ctx.translate(0, ay); ctx.scale((1 + pp.g) * (1 - 0.55 * pp.s), (1 + pp.g) * (1 + pp.s)); ctx.translate(0, -ay);
    }
    ctx.rotate(h.rot + pp.r + (h.tilt || 0));
    ctx.scale(h.side, 1);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.3 + (danger ? 0.35 : 0)) * dimK;
    ctx.drawImage(G.fx.glow(edge), -150, -170, 300, 320);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.lineJoin = 'round';
    const stroke = G.rgba(edge, 0.9 * (0.45 + 0.55 * dimK));
    const g = h.rg;
    if (g) {
      // the wrist: a stub of void below the palm, bending on its own, two wisps trailing off its end
      ctx.save();
      ctx.translate(0, 58); ctx.rotate(g.wr.x);
      const cg = ctx.createLinearGradient(0, -10, 0, 46);
      cg.addColorStop(0, '#120e1b'); cg.addColorStop(0.5, 'rgba(14,11,21,0.85)'); cg.addColorStop(1, 'rgba(14,11,21,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.moveTo(-36, -10); ctx.lineTo(36, -10); ctx.lineTo(26, 46); ctx.lineTo(-26, 46); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(12,9,18,0.5)';
      for (let s = 0; s < 2; s++) {
        const a = g.wisp[s].a, pts = [{ x: s ? 13 : -13, y: 36 }];
        if (!a) continue;
        let x = pts[0].x, y = pts[0].y, ang = (s ? 0.1 : -0.1);
        for (let k = 0; k < a.length; k++) { ang += a[k]; x -= Math.sin(ang) * 11; y += Math.cos(ang) * 11; pts.push({ x, y }); }
        G.draw.ribbon(ctx, pts, 11, 1.5); ctx.fill();
      }
      // its lit edges: a cuff where it meets the palm, and sides that fade into the dark
      const eg = ctx.createLinearGradient(0, 4, 0, 42);
      eg.addColorStop(0, G.rgba(edge, 0.7 * (0.45 + 0.55 * dimK))); eg.addColorStop(1, G.rgba(edge, 0));
      ctx.strokeStyle = eg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-33, 6); ctx.lineTo(-27, 42); ctx.moveTo(33, 6); ctx.lineTo(27, 42); ctx.stroke();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-33, 9); ctx.quadraticCurveTo(0, 15, 33, 9); ctx.stroke();
      ctx.restore();
      // and the palm, flopping on the wrist
      if (g.fl.x) { ctx.translate(0, 58); ctx.rotate(g.fl.x); ctx.translate(0, -58); }
    }
    // fingers: each a beat behind the last, each joint behind the one before it; the first one
    // straightens to point (the Flick). Without a rig they are drawn from the curl alone.
    const sp = g ? g.spread.x * 0.22 : 0, crease = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 4; i++) {
      const f = FINGERS[i];
      let fc = h.fc ? G.clamp(h.fc[i], -0.3, 1) : c;
      if (i === 0 && h.fp > 0.01) fc = G.lerp(fc, -0.12, h.fp);
      const fold = g ? g.fin[i].c.a : null, lean = g ? g.fin[i].l.a : null;
      drawDigit(ctx, f.x, -40, f.ang * (1 - fc) + SPLAY[i] * sp, fold || FJ.map((k) => k * fc), lean, f.len - 9.75, FSEG, FW, stroke, crease);
    }
    // thumb
    const tc = h.fc ? G.clamp(h.tc, -0.3, 1) : c;
    drawDigit(ctx, -50, 14, -1.0 + 1.25 * tc - (g ? g.spread.x * 0.12 : 0), g && g.th.c.a ? g.th.c.a : TJ.map((k) => k * tc), g ? g.th.l.a : null, 41.5, TSEG, TW, stroke, crease);
    // palm
    G.roundRect(ctx, -57, -48, 114, 114, 28);
    const pg = ctx.createLinearGradient(0, -48, 0, 66);
    pg.addColorStop(0, '#1c1728'); pg.addColorStop(1, '#08060d');
    ctx.fillStyle = pg; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke();
    // knuckle ridge when clenched
    if (c > 0.5) {
      ctx.strokeStyle = G.rgba(edge, 0.35 * (c - 0.5) * 2); ctx.lineWidth = 2;
      for (const f of FINGERS) { ctx.beginPath(); ctx.arc(f.x, -38, 9, Math.PI, 0); ctx.stroke(); }
    }
    // sigil
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.6 + 0.4 * Math.sin(B.t * 3 + h.side);
    ctx.strokeStyle = G.rgba(edge, (0.5 + 0.4 * pulse) * dimK); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 12, 22, 0, G.TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, 12); ctx.quadraticCurveTo(0, 0, 14, 12); ctx.quadraticCurveTo(0, 24, -14, 12); ctx.stroke();
    ctx.fillStyle = G.rgba(danger ? DANGER : P.hot, 0.9 * dimK);
    ctx.beginPath(); ctx.arc(0, 12, 4.5, 0, G.TAU); ctx.fill();
    if (h.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (h.flash * 0.32) + ')';
      G.roundRect(ctx, -57, -48, 114, 114, 28); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // how much more the hand can take, as an arc round its sigil (and the time left once it is broken)
    if (h.broken > 0 || h.hp < h.maxHp) {
      const k = h.broken > 0 ? 1 - h.broken / 12 : h.hp / h.maxHp;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = h.broken > 0 ? G.rgba(G.COL.starHot, 0.5) : G.rgba(P.hot, 0.9); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 12, 29, -Math.PI / 2, -Math.PI / 2 + G.TAU * G.clamp(k, 0, 1)); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    // cracks while it is stuck or broken
    if (h.stuck || h.broken > 0) {
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-30, -40); ctx.lineTo(-18, -8); ctx.lineTo(-32, 20);
      ctx.moveTo(26, -30); ctx.lineTo(16, 6); ctx.lineTo(34, 40); ctx.stroke();
    }
    ctx.restore();
  }

  // Light the core throws on the floor, and shadows under the core and hands.
  B.drawGround = function (ctx) {
    if (B.dead) return;
    const P = G.pal(), c = B.core;
    const near = G.clamp(1 - (FLOOR - c.y) / 520, 0, 1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.22 + 0.5 * near) * (B.staggered ? 0.5 : 1);
    const w = 300 + 260 * (1 - near);
    ctx.drawImage(G.fx.glow(P.boss), c.x - w, FLOOR - 16, w * 2, 44);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const shadow = (x, y, rx) => {
      if (y < -60) return;
      const k = G.clamp(1 - (FLOOR - y) / 560, 0.15, 1);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.5 * k) + ')';
      ctx.beginPath(); ctx.ellipse(x, FLOOR + 4, rx * (0.55 + 0.45 * k), 6 * k + 1.5, 0, 0, G.TAU); ctx.fill();
    };
    shadow(c.x, c.y + c.r, c.r * 1.05);
    for (const h of B.hands) if (h.alive) shadow(h.x, h.y + 60, 70);
  };

  B.draw = function (ctx) {
    drawChain(ctx);
    drawCore(ctx);
    if (!B.dead) {
      drawShards(ctx);
      for (const h of B.hands) drawHand(ctx, h);
    }
  };

  // Outlines of every hitbox, for tuning (toggle with G.debug.boxes).
  B.drawDebug = function (ctx) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#3f6';
    for (const t of B.targets()) {
      ctx.beginPath();
      if (t.r) ctx.arc(t.cx, t.cy, t.r, 0, G.TAU);
      else ctx.rect(t.cx - t.hw, t.cy - t.hh, t.hw * 2, t.hh * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#f33';
    for (const h of B.hands) {
      if (!h.hurt || !h.alive) continue;
      const b = handBox(h);
      ctx.strokeRect(b.cx - b.hw * 0.8, b.cy - b.hh * 0.88, b.hw * 1.6, b.hh * 1.76);
    }
    const pb = G.player.box();
    ctx.strokeStyle = '#6cf';
    ctx.strokeRect(pb.cx - pb.hw, pb.cy - pb.hh, pb.hw * 2, pb.hh * 2);
    if (G.player.atk) {
      const a = G.player.atkBox(G.player.atk);
      ctx.strokeStyle = '#ff6';
      ctx.strokeRect(a.cx - a.hw, a.cy - a.hh, a.hw * 2, a.hh * 2);
    }
  };
})();
