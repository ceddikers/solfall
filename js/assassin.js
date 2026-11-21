// Solfall - The Silent Veil: a hooded assassin. It vanishes, strikes along marked lines, throws
// knives and, later, fights beside its own shadows. Every attack leaves it open for a moment.
'use strict';
(function () {
  const { wait, tween, par } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards, K = G.kit, D = G.draw, DANGER = G.COL.danger;
  const WL = G.WALL_L, WR = G.WALL_R;

  const B = {
    id: 'assassin', name: 'THE SILENT VEIL', short: 'The Veil', theme: 'assassin',
    sub: 'You will not hear it coming', taunt: 'it has studied you',
    blurb: 'A hooded killer that strikes from nowhere',
    tips: [
      'Every attack leaves the Veil open for a moment afterwards. Wait for it, then strike.',
      'A lane on the floor means a lunge. Jump it, or dash through it for a perfect dodge.',
      'When it drops from above its blade sticks in the floor, and it takes extra damage until it pulls free.',
      'Its shadows vanish at a single hit and give Starlight.',
      'A line across the arena is a cut. Step off it, or jump it if it lies flat.',
    ],
    hudCols: [null, ['#a070ff', '#e4d4ff'], ['#40e0a8', '#c8ffe8'], ['#d8d8f0', '#ffffff']],
    BASE_HP: 3000, poise0: 340, w: 36, h: 84, platformsFrom: 2,
    gaps: [0, 0.8, 0.62, 0.5],
    bags: {
      1: ['lunge', 'flurry', 'knives', 'ambush', 'backstab'],
      2: ['pincer', 'flurry', 'knives', 'ambush', 'backstab', 'mirror', 'rain', 'cross'],
      3: ['pincer', 'flurry', 'ambush', 'backstab', 'mirror', 'rain', 'cross', 'cuts', 'mark'],
    },
    cards: { 2: ['SHADOWS', 'It no longer hunts alone'], 3: ['EXECUTION', 'No more warnings than these'] },
    first: { 1: 'lunge', 2: 'mirror', 3: 'cuts' },
  };

  // ------------------------------------------------------------------ poses
  // lean (upper body), hip height, whole-body turn, two feet (x, y), two hands (x, y, blade angle)
  const POSES = {
    idle: [0.2, -38, 0, 13, 0, -13, 0, 21, -50, 2.3, -13, -47, 2.7],
    crouch: [0.5, -27, 0, 17, 0, -15, 0, 17, -45, -2.5, -15, -34, 2.9],
    dash: [1.2, -28, 0, -10, -6, -30, -12, 34, -30, 0.05, 24, -22, 0.2],
    skid: [0.55, -24, 0, 22, 0, -17, 0, 16, -7, 1.7, -19, -40, 2.8],
    slashA: [0.45, -34, 0, 19, 0, -15, 0, 36, -40, 0.5, -15, -44, 2.7],
    slashB: [0.3, -35, 0, 19, 0, -15, 0, 30, -72, -1.0, -12, -40, 2.6],
    air: [0.05, -40, 0, 8, -12, -11, -5, 15, -62, -1.2, -15, -58, -2.0],
    throw: [-0.05, -39, 0, 14, 0, -13, 0, 36, -66, -0.3, -13, -50, 2.7],
    dive: [0.15, -40, 2.75, 5, -8, -6, -2, 12, -74, -1.5, -8, -74, -1.65],
    stuck: [0.75, -22, 0, 19, 0, -19, 0, 21, -8, 1.57, -10, -30, 2.7],
    kneel: [0.8, -20, 0, 15, 0, -21, 0, 12, -6, 1.6, -8, -9, 1.75],
  };
  const NP = 13;
  function runPose(t) {
    const s = Math.sin(t), c = Math.cos(t);
    return [0.55, -36, 0, s * 20, -Math.max(0, c) * 12, -s * 20, -Math.max(0, -c) * 12, -18, -46, 2.95, -26, -50, 3.05];
  }

  // ------------------------------------------------------------------ state
  B.setup = function () {
    const b = B.body;
    b.x = 900; b.y = -120; b.pose = 'dive'; b.hurt = false; b.p = POSES.dive.slice(); b.runT = 0;
    B.clones = []; B.serial = 0;
    B.scarf = D.chain(11, b.x, b.y - 70);
  };
  B.onRelease = function () { const b = B.body; b.hurt = false; b.pose = 'idle'; b.hidden = false; };
  B.onInterrupt = function () { for (const c of B.clones) smoke(c.x, c.y - 40); B.clones.length = 0; };
  B.onStagger = function () { B.body.pose = 'kneel'; };
  B.onRecover = function () { B.body.pose = 'idle'; };
  B.dying0 = function () { B.body.pose = 'kneel'; B.clones.length = 0; };

  function smoke(x, y) {
    G.fx.dust(x, y, 9, { speed: [20, 170], size: [10, 20], life: [0.4, 0.9], up: 60, a: 0.5, color: '20,17,32', jitter: 16 });
    G.fx.shards(x, y, 3, G.pal().boss, { speed: [80, 300], size: [2, 4] });
    G.fx.burst(x, y, { n: 8, color: G.pal().boss, speed: [60, 260], life: [0.2, 0.5], size: [2, 5], kind: 'spark' });
  }
  function* vanish() {
    const b = B.body;
    b.hurt = false;
    G.audio.play('blink');
    smoke(b.x, b.y - 40);
    yield* wait(0.06);
    b.hidden = true;
  }
  function appear(x, y, pose) {
    const b = B.body;
    b.x = x; b.y = y; b.hidden = false; b.pose = pose || 'idle';
    if (POSES[b.pose]) b.p = POSES[b.pose].slice();
    b.face = G.player.x >= x ? 1 : -1;
    for (const p of B.scarf) { p.x = x; p.y = y - 70; }
    smoke(x, y - 40);
  }
  function clone(x, y, face, pose) {
    const c = {
      id: 'shade' + (B.serial++), x, y, face, pose: pose || 'crouch', hurt: false, clone: true, runT: 0, p: null,
      onHit() {
        this.gone = true;
        G.player.gain(10);
        smoke(this.x, this.y - 40);
        G.audio.play('orbPop');
        return true;
      },
    };
    c.p = (POSES[c.pose] || POSES.idle).slice();
    B.clones.push(c);
    smoke(x, y - 40);
    return c;
  }

  // ------------------------------------------------------------------ building blocks
  // A melee cut in front of whoever swings it.
  function swing(a, o) {
    const f = a.face;
    const m = (ang) => (f > 0 ? ang : Math.PI - ang);
    return H.arc({
      x: a.x + f * 8, y: a.y - 44, r: o.r, a0: m(o.a0), a1: m(o.a1), tele: o.tele, active: 0.1,
      follow(h) { if (!h.fired) { h.x = a.x + a.face * 8; h.y = a.y - 44; } },
      onFire() { G.audio.play('blade'); a.pose = o.pose || 'slashA'; G.fx.shake(3); },
    });
  }

  // Crouch, then cross the floor in a blink. The lane shows the height: jump it or dash through.
  function* lunge(a, toX, tele) {
    const dir = G.sign(toX - a.x) || 1;
    a.face = dir; a.pose = 'crouch';
    H.lane({ x: WL, y: a.y - 66, w: WR - WL, h: 66, dir, dur: tele });
    yield* wait(tele);
    if (a.gone) return;
    a.pose = 'dash'; a.hurt = true;
    G.audio.play('streak');
    const x0 = a.x, dur = Math.max(0.12, Math.abs(toX - x0) / 1750);
    let e = 0;
    while (e < dur && !a.gone) {
      e += yield;
      a.x = G.lerp(x0, toX, Math.min(1, e / dur));
      G.fx.spawn({ x: a.x - dir * 20, y: a.y - G.rand(10, 60), vx: -dir * G.rand(40, 200), vy: G.rand(-30, 30), life: 0.25, size: G.rand(4, 9), color: a.clone ? '20,16,34' : G.pal().boss });
    }
    a.hurt = false; a.pose = 'skid';
  }
  const farSide = (x) => (x < G.player.x ? Math.min(WR - 60, G.player.x + 300) : Math.max(WL + 60, G.player.x - 300));

  // Thin warning lines for thrown knives; when they fill, the knives fly.
  function volley(ox, oy, angs, tele, speed) {
    H.add({
      kind: 'aim', t: 0,
      update() {
        if (this.t >= tele) {
          this.dead = true;
          G.audio.play('arrow');
          for (const a of angs) H.orb(ox, oy, Math.cos(a) * speed, Math.sin(a) * speed, { r: 8, blade: true, life: 2.2 });
        }
      },
      draw(ctx) {
        const k = this.t / tele;
        ctx.strokeStyle = G.rgba(DANGER, 0.25 + 0.5 * k); ctx.lineWidth = 1.5 + k;
        ctx.setLineDash([10, 8]); ctx.lineDashOffset = -this.t * 90;
        for (const a of angs) { ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * 1500, oy + Math.sin(a) * 1500); ctx.stroke(); }
        ctx.setLineDash([]);
      },
    });
  }

  // A cut along a line: the warning shows exactly where, then the blade passes.
  function cutLine(ox, oy, ang, len, tele) {
    return H.beam({ ox, oy, ang, maxLen: len, clip: true, width: 18, tele, lock: 99, active: 0.1, fade: 0.22, sfx: 'blade', shake: 4 });
  }

  // ------------------------------------------------------------------ attacks
  function* atkLunge() {
    const b = B.body, T = K.T();
    yield* lunge(b, farSide(b.x), 0.62 * T);
    if (K.hard()) { yield* wait(0.25); yield* lunge(b, farSide(b.x), 0.45 * T); }
    yield* wait(0.85);
  }

  // The same lunge, with a shadow coming the other way a moment later.
  function* atkPincer() {
    const b = B.body, P = G.player, T = K.T();
    const sx = G.clamp(P.x + (b.x < P.x ? 1 : -1) * 380, WL + 60, WR - 60);
    const c = clone(sx, FLOOR, -G.sign(sx - P.x), 'crouch');
    yield* par(
      lunge(b, farSide(b.x), 0.62 * T),
      (function* () { yield* wait(0.4); yield* lunge(c, farSide(c.x), 0.55 * T); c.gone = true; smoke(c.x, c.y - 40); })()
    );
    yield* wait(0.8);
  }

  function* atkFlurry() {
    const b = B.body, P = G.player, T = K.T();
    // close the distance
    b.pose = 'run';
    let e = 0;
    while (e < 0.9 && Math.abs(P.x - b.x) > 96) {
      const dt = yield;
      e += dt;
      b.face = P.x > b.x ? 1 : -1;
      b.x = G.clamp(b.x + b.face * 640 * dt, WL + 30, WR - 30);
    }
    const n = 3 + (B.phase === 3 ? 1 : 0) + (K.hard() ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      if (Math.abs(P.x - b.x) > 20) b.face = P.x > b.x ? 1 : -1;
      b.pose = 'crouch';
      const tele = (i === 0 ? 0.46 : last ? 0.4 : 0.27) * T;
      if (i % 2 === 0) swing(b, { r: last ? 132 : 106, a0: -2.1, a1: 0.95, tele, pose: 'slashA' });
      else swing(b, { r: 106, a0: 1.0, a1: -2.0, tele, pose: 'slashB' });
      yield* wait(tele);
      // each cut carries it a step forward
      const x1 = G.clamp(b.x + b.face * (last ? 70 : 44), WL + 30, WR - 30);
      yield* tween(b, { x: x1 }, 0.1, E.outCubic);
      yield* wait(0.06);
    }
    b.pose = 'skid';
    yield* wait(0.85);
  }

  function* atkKnives() {
    const b = B.body, P = G.player, T = K.T();
    // spring away from the hero, then throw
    const away = b.x > P.x ? 1 : -1;
    const tx = G.clamp(b.x + away * 190, WL + 50, WR - 50), x0 = b.x;
    b.face = -away; b.pose = 'air';
    let e = 0;
    while (e < 0.34) { e += yield; const k = Math.min(1, e / 0.34); b.x = G.lerp(x0, tx, k); b.y = FLOOR - 4 * 96 * k * (1 - k); }
    b.y = FLOOR;
    const vol = (B.phase >= 2 ? 2 : 1) + (K.hard() ? 1 : 0);
    for (let v = 0; v < vol; v++) {
      b.face = P.x > b.x ? 1 : -1; b.pose = 'crouch';
      const ox = b.x + b.face * 22, oy = b.y - 60;
      const base = Math.atan2(P.y - 24 - oy, P.x - ox);
      const n = B.phase === 1 ? 3 : 5, spread = B.phase === 1 ? 0.12 : 0.15;
      const angs = [];
      for (let i = 0; i < n; i++) angs.push(base + (i - (n - 1) / 2) * spread + (v % 2 ? spread / 2 : 0));
      const tele = (v ? 0.4 : 0.55) * T;
      volley(ox, oy, angs, tele, 780);
      yield* wait(tele);
      b.pose = 'throw';
      yield* wait(0.3);
    }
    yield* wait(0.6);
  }

  // It drops on the marked spot and its blade sticks in the floor.
  function* atkAmbush() {
    const b = B.body, P = G.player, T = K.T();
    yield* vanish();
    yield* wait(0.35);
    const m = K.columnMark(P.x, 112);
    G.audio.play('charge', { dur: 0.8 * T });
    let e = 0;
    const tt = 0.52 * T;
    while (e < tt) {
      const dt = yield;
      e += dt;
      m.x = G.damp(m.x, G.clamp(P.x + P.vx * 0.12, WL + 60, WR - 60), 9, dt); m.k = e / tt * 0.7;
    }
    m.locked = true;
    appear(m.x, -90, 'dive');
    const lockT = 0.3 * T;
    e = 0;
    while (e < lockT) { e += yield; m.k = 0.7 + 0.3 * Math.min(1, e / lockT); }
    b.hurt = true;
    G.audio.play('streak');
    yield* tween(b, { y: FLOOR }, 0.13, E.inQuad);
    m.dead = true; b.hurt = false;
    K.crush(b.x, FLOOR - 40, 58, 44, 1);
    K.impact(b.x, false);
    if (K.hard()) { H.shockwave(b.x - 20, -1, 380, 36); H.shockwave(b.x + 20, 1, 380, 36); }
    b.pose = 'stuck'; b.exposed = true;
    yield* wait(B.phase === 3 ? 1.1 : 1.35);
    b.exposed = false;
  }

  // It appears behind the hero and cuts.
  function* atkBackstab() {
    const b = B.body, P = G.player, T = K.T();
    yield* vanish();
    yield* wait(0.3 + G.rrand(0, 0.25));
    const gy = P.plat && P.onGround ? P.plat.y : FLOOR;
    let lo = WL + 40, hi = WR - 40;
    if (gy < FLOOR && P.plat) { lo = P.plat.x + 14; hi = P.plat.x + P.plat.w - 14; }
    let x = P.x - (P.facing || 1) * 78;
    if (x < lo || x > hi) x = P.x + (P.facing || 1) * 78;
    appear(G.clamp(x, lo, hi), gy, 'crouch');
    G.fx.ring(b.x, b.y - 46, { r0: 60, r1: 8, life: 0.25, color: G.pal().hot, width: 3 });
    G.audio.play('tink');
    const n = 1 + (B.phase >= 2 ? 1 : 0) + (B.phase === 3 && K.hard() ? 1 : 0);
    for (let i = 0; i < n; i++) {
      if (Math.abs(P.x - b.x) > 16) b.face = P.x > b.x ? 1 : -1;
      b.pose = 'crouch';
      const tele = (i ? 0.3 : 0.44) * T;
      if (i % 2 === 0) swing(b, { r: 110, a0: -2.1, a1: 0.95, tele, pose: 'slashA' });
      else swing(b, { r: 110, a0: 1.0, a1: -2.0, tele, pose: 'slashB' });
      yield* wait(tele);
      yield* tween(b, { x: G.clamp(b.x + b.face * 50, lo, hi) }, 0.1, E.outCubic);
      yield* wait(0.08);
    }
    b.pose = 'skid';
    yield* wait(0.75);
    if (b.y < FLOOR) { b.pose = 'air'; yield* tween(b, { y: FLOOR }, 0.22, E.inQuad); }
  }

  // Three figures, three lanes, one after another. Only one of them is real.
  function* atkMirror() {
    const b = B.body, T = K.T();
    G.ui.hint('mirror', 'Each lane shows a lunge: jump the low ones, stay down for the high one');
    yield* vanish();
    yield* wait(0.3);
    const side = G.rng() < 0.5 ? -1 : 1;
    const L = WL + 60, R = WR - 60;
    const up = G.arena.platforms.every((p) => p.rise >= 1);
    const runs = [
      { x: side > 0 ? L : R, y: FLOOR, to: side > 0 ? R : L },
      { x: side > 0 ? R : L, y: FLOOR, to: side > 0 ? L : R },
      { x: side > 0 ? L : R, y: up ? 490 : FLOOR, to: side > 0 ? R : L },
    ];
    if (K.hard()) runs.push({ x: side > 0 ? R : L, y: FLOOR, to: side > 0 ? L : R });
    const real = Math.floor(G.rng() * runs.length);
    const gens = runs.map((r, i) => {
      const delay = i * 0.75;
      return (function* () {
        yield* wait(delay);
        let a;
        if (i === real) { appear(r.x, r.y, 'crouch'); a = b; } else a = clone(r.x, r.y, G.sign(r.to - r.x), 'crouch');
        yield* lunge(a, r.to, 0.62 * T);
        if (a !== b) { yield* wait(0.1); a.gone = true; smoke(a.x, a.y - 40); }
      })();
    });
    yield* par(...gens);
    if (b.y < FLOOR) { b.pose = 'air'; yield* tween(b, { y: FLOOR }, 0.2, E.inQuad); b.pose = 'skid'; }
    yield* wait(0.8);
  }

  // It hangs in the air and throws fans of knives downward.
  function* atkRain() {
    const b = B.body, P = G.player, T = K.T();
    yield* vanish();
    yield* wait(0.3);
    appear(G.clamp(P.x + G.rrand(-120, 120), 300, 980), 190, 'air');
    const vol = 2 + (K.hard() ? 1 : 0), n = K.gentle() ? 5 : 7;
    const lo = 0.42, hi = Math.PI - 0.42, stepA = (hi - lo) / (n - 1);
    for (let v = 0; v < vol; v++) {
      b.pose = 'air';
      const off = (v % 2 ? 0.5 : 0) * stepA + G.rrand(-0.06, 0.06);
      const angs = [];
      for (let i = 0; i < n - (v % 2); i++) angs.push(lo + i * stepA + off);
      const tele = (v ? 0.5 : 0.62) * T;
      volley(b.x, b.y - 50, angs, tele, 720);
      yield* wait(tele);
      b.pose = 'throw';
      yield* wait(0.32);
    }
    b.pose = 'dive';
    yield* tween(b, { y: FLOOR }, 0.2, E.inQuad);
    b.pose = 'skid';
    G.fx.shake(5); G.audio.play('land');
    G.fx.thud(b.x, FLOOR, 0.7, { noCrack: true });
    yield* wait(0.85);
  }

  // Two diagonal cuts that cross where the hero stands.
  function* atkCross() {
    const b = B.body, P = G.player, T = K.T();
    yield* vanish();
    yield* wait(0.25);
    const pairs = (B.phase === 3 ? 2 : 1) + (K.hard() ? 1 : 0);
    let ex = P.x;
    for (let i = 0; i < pairs; i++) {
      const px = P.x, py = (P.plat && P.onGround ? P.plat.y : FLOOR) - 24;
      const ang = G.rrand(0.72, 0.95), len = 620;
      for (const s of [1, -1]) {
        const a = s > 0 ? ang : Math.PI - ang;
        cutLine(px - Math.cos(a) * len * 0.72, py - Math.sin(a) * len * 0.72, a, len, (0.55 + (s < 0 ? 0.2 : 0)) * T);
      }
      ex = px;
      yield* wait(0.75 * T + 0.3);
    }
    appear(G.clamp(ex + (G.rng() < 0.5 ? -150 : 150), WL + 50, WR - 50), FLOOR, 'skid');
    yield* wait(0.8);
  }

  // A run of cuts, each through where the hero stands when it is drawn. Then it is spent.
  function* atkCuts() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('cuts', 'Step off each line. Jump the flat ones');
    yield* vanish();
    yield* wait(0.3);
    const n = K.hard() ? 9 : 7;
    let lastKind = '';
    for (let i = 0; i < n; i++) {
      const gy = P.plat && P.onGround ? P.plat.y : FLOOR;
      const px = P.x, py = gy - 24, tele = 0.55 * T;
      // every third cut is flat (jump it); the one after a flat cut is upright, which any step avoids even in the air
      let kind = i % 3 === 2 ? 'flat' : lastKind === 'flat' ? 'vert' : G.rpick(['diagL', 'diagR', 'vert']);
      if (kind === lastKind && kind !== 'flat') kind = kind === 'vert' ? 'diagL' : 'vert';
      lastKind = kind;
      if (kind === 'flat') cutLine(WL, py - 2, 0, WR - WL, tele);
      else if (kind === 'vert') cutLine(px, -40, Math.PI / 2, 900, tele);
      else {
        const a = kind === 'diagL' ? G.rrand(0.7, 1.0) : Math.PI - G.rrand(0.7, 1.0);
        cutLine(px - Math.cos(a) * 470, py - Math.sin(a) * 470, a, 700, tele);
      }
      yield* wait(0.42);
    }
    yield* wait(0.55 * T + 0.2);
    appear(640, FLOOR, 'kneel');
    b.exposed = true;
    G.ui.callout('SPENT', 'Strike now');
    yield* wait(2.5);
    b.exposed = false;
  }

  // A mark closes on the hero; when it shuts, the Veil cuts everything inside it.
  function* atkMark() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('mark', 'Dash as the mark closes');
    yield* vanish();
    const tele = 1.45 * T, lockT = 0.24 * T;
    G.audio.play('charge', { dur: tele });
    const h = H.arc({
      x: P.x, y: P.y - 22, r: 118, a0: -Math.PI * 0.999, a1: Math.PI * 0.999, tele, active: 0.11,
      follow(hz) { if (hz.t < tele - lockT) { hz.x = P.x; hz.y = P.y - 22; } },
      onFire(hz) {
        const gy = FLOOR;
        appear(G.clamp(hz.x, WL + 40, WR - 40), Math.min(gy, hz.y + 22 + 0), 'slashA');
        G.audio.play('blade'); G.audio.play('cleave'); G.fx.shake(10); G.fx.flash(G.pal().hot, 0.18, 0.2);
      },
    });
    yield* wait(tele + 0.2);
    void h;
    if (b.y < FLOOR) { b.pose = 'air'; yield* tween(b, { y: FLOOR }, 0.25, E.inQuad); }
    b.pose = 'skid';
    yield* wait(0.9);
  }

  B.ATTACKS = {
    lunge: atkLunge, pincer: atkPincer, flurry: atkFlurry, knives: atkKnives, ambush: atkAmbush, backstab: atkBackstab,
    mirror: atkMirror, rain: atkRain, cross: atkCross, cuts: atkCuts, mark: atkMark,
  };

  // ------------------------------------------------------------------ scenes
  B.enter = function* () {
    const b = B.body;
    b.x = 900; b.y = -120; b.pose = 'dive'; b.p = POSES.dive.slice(); b.face = -1;
    yield* wait(0.5);
    G.audio.play('streak');
    yield* tween(b, { y: FLOOR }, 0.22, E.inQuad);
    K.impact(b.x, false);
    b.pose = 'stuck';
    yield* wait(0.7);
    b.pose = 'idle';
    yield* wait(0.3);
  };
  B.phaseIn = function* () {
    const b = B.body;
    if (b.y < FLOOR) b.y = FLOOR;
    b.pose = 'kneel';
    yield* wait(0.8);
    yield* vanish();
    yield* wait(0.25);
    appear(640, FLOOR, 'crouch');
  };
  B.phaseOut = function* (n) {
    const b = B.body;
    if (n === 2) {
      // its shadows step out of it
      const a = clone(b.x - 10, FLOOR, -1, 'run'), c = clone(b.x + 10, FLOOR, 1, 'run');
      yield* par(tween(a, { x: b.x - 260 }, 0.7, E.outCubic), tween(c, { x: b.x + 260 }, 0.7, E.outCubic));
      a.pose = c.pose = 'crouch';
      yield* wait(0.7);
      for (const s of [a, c]) { s.gone = true; smoke(s.x, s.y - 40); }
    } else yield* wait(1.2);
    b.pose = 'idle';
  };

  B.idle = function (dt) {
    const b = B.body, P = G.player;
    if (b.y < FLOOR) b.y = Math.min(FLOOR, b.y + 900 * dt);
    const dx = P.x - b.x;
    if (Math.abs(dx) > 12) b.face = dx > 0 ? 1 : -1;
    // it keeps its distance, circling just out of reach
    const want = G.clamp(P.x - G.sign(dx || 1) * 250, WL + 50, WR - 50);
    if (Math.abs(want - b.x) > 26) { b.x += G.sign(want - b.x) * 240 * dt; b.pose = 'run'; b.moveDir = G.sign(want - b.x); }
    else b.pose = 'idle';
  };

  function stepPose(a, dt) {
    if (a.pose === 'run') a.runT += dt * 15;
    const target = a.pose === 'run' ? runPose(a.runT) : (POSES[a.pose] || POSES.idle);
    const k = 1 - Math.exp(-(a.pose === 'dash' || a.pose === 'dive' ? 60 : 24) * dt);
    for (let i = 0; i < NP; i++) a.p[i] += (target[i] - a.p[i]) * k;
  }

  B.tick = function (dt) {
    const b = B.body, P = G.player;
    stepPose(b, dt);
    D.chainStep(B.scarf, b.x - b.face * 4, b.y + b.p[1] - 36, dt, { seg: 8, grav: 30, drift: 46, face: b.face, wave: 14, rate: 9 });
    for (const c of B.clones) stepPose(c, dt);
    B.clones = B.clones.filter((c) => !c.gone);
    if (!G.canHurt()) return;
    const touch = (a) => {
      const low = a.pose === 'dash';
      return G.rectsOverlap(P.box(), { cx: a.x, cy: a.y - (low ? 28 : 40), hw: low ? 26 : 16, hh: low ? 26 : 38 });
    };
    if (b.hurt && !b.hidden && touch(b)) P.tryHit(1, b.x, b);
    for (const c of B.clones) if (c.hurt && touch(c)) P.tryHit(1, c.x, c);
  };

  B.extraTargets = function (out) {
    for (const c of B.clones) out.push({ id: c.id, kind: 'extra', ref: c, cx: c.x, cy: c.y - 40, hw: 18, hh: 40 });
  };

  // ------------------------------------------------------------------ drawing
  function dagger(ctx, x, y, ang, col, hot, dim) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    if (!dim) D.glow(ctx, col, 14, 0, 18, 0.55);
    ctx.fillStyle = '#05040a'; ctx.fillRect(-7, -1.6, 9, 3.2);
    ctx.fillStyle = dim ? G.rgba(col, 0.5) : G.rgba(hot, 1);
    ctx.beginPath(); ctx.moveTo(2, -2.6); ctx.quadraticCurveTo(16, -5.5, 28, 1.5); ctx.quadraticCurveTo(15, 1.4, 2, 2.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(col, dim ? 0.5 : 1); ctx.lineWidth = 1; ctx.stroke();
    ctx.lineWidth = 2.2; D.line(ctx, 1.6, -4.2, 1.6, 4.2);
    ctx.restore();
  }

  function figure(ctx, a, alpha) {
    const p = a.p, pal = G.pal(), col = pal.boss, hot = pal.hot, sh = !!a.clone;
    const lean = p[0], hip = p[1];
    const body = sh ? '#0a0814' : '#14112a', mid = sh ? '#0e0c1a' : '#262244', plate = sh ? '#131022' : '#3c3668';
    ctx.save();
    ctx.translate(a.x + (a.kx || 0) + (a.jit ? G.rand(-a.jit, a.jit) : 0), a.y);
    ctx.scale(a.face, 1);
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (p[2]) { ctx.translate(0, hip); ctx.rotate(p[2]); ctx.translate(0, -hip); }
    if (!sh) D.glow(ctx, col, 0, -44, 70, 0.22);

    const shx = Math.sin(lean) * 34, shy = hip - Math.cos(lean) * 34; // shoulders
    const leg = (i) => {
      const hx = i ? -3 : 3, k = D.ik(hx, hip, p[3 + i * 2], p[4 + i * 2], 20, 20, -1);
      ctx.fillStyle = i ? body : mid;
      D.limb(ctx, hx, hip, k.jx, k.jy, 9, 6.5); ctx.fill();
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey - 2, 6.5, 4.5); ctx.fill();
      // shin guard and a pointed boot
      ctx.fillStyle = i ? mid : plate;
      D.poly(ctx, [k.jx + 2, k.jy + 1, G.lerp(k.jx, k.ex, 0.85) + 3.4, G.lerp(k.jy, k.ey, 0.85), G.lerp(k.jx, k.ex, 0.85) - 0.5, G.lerp(k.jy, k.ey, 0.85) + 1]); ctx.fill();
      D.poly(ctx, [k.ex - 3.5, k.ey - 4, k.ex + 3, k.ey - 4.5, k.ex + 10, k.ey, k.ex - 3.5, k.ey]); ctx.fill();
    };
    const arm = (i) => {
      const sx = shx + (i ? -4 : 4), sy = shy + 2;
      const k = D.ik(sx, sy, p[7 + i * 3], p[8 + i * 3], 15, 15, 1);
      dagger(ctx, k.ex, k.ey, p[9 + i * 3], col, hot, sh);
      ctx.fillStyle = i ? body : mid;
      D.limb(ctx, sx, sy, k.jx, k.jy, 7, 5.5); ctx.fill();
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 5.5, 4.5); ctx.fill();
      // wrapped forearm
      ctx.strokeStyle = G.rgba(col, sh ? 0.25 : 0.6); ctx.lineWidth = 1.2;
      for (const q of [0.45, 0.7]) {
        const wx = G.lerp(k.jx, k.ex, q), wy = G.lerp(k.jy, k.ey, q), nx = -(k.ey - k.jy), ny = k.ex - k.jx, nl = Math.hypot(nx, ny) || 1;
        D.line(ctx, wx - nx / nl * 2.6, wy - ny / nl * 2.6, wx + nx / nl * 2.6, wy + ny / nl * 2.6);
      }
    };

    // cloak: a torn half-cape hanging from the shoulders
    const sway = Math.sin(G.t * 3 + a.x * 0.01) * 2 - lean * 10;
    ctx.fillStyle = sh ? '#07060e' : '#090812';
    D.poly(ctx, [shx - 7, shy - 2, shx + 5, shy - 1, 3, hip + 2, -4 + sway, hip + 20, -10 + sway, hip + 12, -16 + sway * 1.3, hip + 24, -20 + sway * 1.4, hip + 10, -17 + sway, hip - 6, shx - 12, shy + 8]);
    ctx.fill();
    ctx.strokeStyle = G.rgba(col, sh ? 0.3 : 0.45); ctx.lineWidth = 1.1; ctx.stroke();

    leg(1); arm(1);
    // torso: narrow waist, crossed straps
    ctx.fillStyle = mid;
    D.poly(ctx, [-5, hip + 3, 5.5, hip + 3, shx + 8, shy, shx + 3, shy - 5, shx - 6, shy - 3]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, sh ? 0.3 : 0.75); ctx.lineWidth = 1.5;
    D.line(ctx, -4.5, hip - 2, 5, hip - 3.5);
    D.line(ctx, G.lerp(-4, shx - 4, 0.25), G.lerp(hip, shy, 0.25), G.lerp(5, shx + 7, 0.8), G.lerp(hip, shy, 0.8));
    // sash ends
    ctx.fillStyle = G.rgba(col, sh ? 0.3 : 0.85);
    D.poly(ctx, [-4, hip - 2, -1, hip - 2, -5 + sway * 0.5, hip + 13, -8 + sway * 0.5, hip + 9]); ctx.fill();
    leg(0);

    // hood: a sharp cowl with the point swept back, over a mask with two eyes
    const hx = shx + Math.sin(lean) * 9 + 2, hy = shy - Math.cos(lean) * 9 - 2;
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(lean * 0.55);
    ctx.fillStyle = plate;
    D.poly(ctx, [-8, 7, -10.5, -1, -8, -9, -17, -15, -3, -13.5, 5, -11.5, 10.5, -4, 10, 4, 6, 9, 0, 6.5]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, sh ? 0.35 : 0.7); ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = '#020206';
    D.poly(ctx, [0, -8.5, 7.5, -6.5, 9.6, -1, 8.6, 4.5, 4.5, 6.5, 0.5, 2]); ctx.fill();
    // mask over the mouth
    ctx.fillStyle = sh ? '#0c0a16' : '#15122a';
    D.poly(ctx, [1.5, 1, 9.3, -0.2, 8.6, 4.5, 4.5, 6.5]); ctx.fill();
    if (!sh || a.hurt) {
      D.glow(ctx, col, 6, -3, 11, 1);
      ctx.fillStyle = G.rgba(hot, 1);
      D.poly(ctx, [2.2, -4.4, 6, -2.6, 2.6, -1.6]); ctx.fill();
      D.poly(ctx, [7.2, -2.8, 9.8, -4.6, 9.4, -1.8]); ctx.fill();
    } else {
      ctx.fillStyle = G.rgba(col, 0.6);
      D.poly(ctx, [2.2, -4.4, 6, -2.6, 2.6, -1.6]); ctx.fill();
    }
    ctx.restore();
    // a pauldron on the leading shoulder
    ctx.fillStyle = plate;
    D.poly(ctx, [shx + 1, shy - 5, shx + 10, shy - 4, shx + 12, shy + 4, shx + 4, shy + 3]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, sh ? 0.3 : 0.8); ctx.lineWidth = 1; ctx.stroke();
    arm(0);

    if (a.flash > 0) D.glow(ctx, '255,255,255', 0, -44, 62, a.flash * 0.8);
    ctx.restore();
  }

  B.drawGround = function (ctx) {
    const b = B.body;
    if (B.dead) return;
    const sh = (a, al) => {
      const k = G.clamp(1 - (FLOOR - a.y) / 300, 0.25, 1);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.42 * k * al) + ')';
      ctx.beginPath(); ctx.ellipse(a.x, FLOOR + 3, 26 * k, 5 * k, 0, 0, G.TAU); ctx.fill();
    };
    if (!b.hidden) sh(b, 1);
    for (const c of B.clones) sh(c, 0.5);
  };

  B.draw = function (ctx) {
    if (B.dead) return;
    const b = B.body, col = G.pal().boss;
    for (const c of B.clones) {
      D.glow(ctx, col, c.x, c.y - 44, 60, 0.25);
      figure(ctx, c, 0.78);
    }
    if (b.hidden) return;
    // the scarf: two glowing tails
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    const n = B.scarf.length;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < n - pass * 3; i++) {
        const k = 1 - i / n, o = pass * (2 + i * 1.3);
        ctx.strokeStyle = G.rgba(col, (0.2 + 0.6 * k) * (pass ? 0.6 : 1)); ctx.lineWidth = (1.5 + 5 * k) * (pass ? 0.7 : 1);
        D.line(ctx, B.scarf[i - 1].x, B.scarf[i - 1].y + o - (pass ? 1.3 : 0), B.scarf[i].x, B.scarf[i].y + o);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // afterimages while it dashes or dives
    if (b.pose === 'dash' || b.pose === 'dive') {
      for (let i = 1; i <= 3; i++) {
        const gx = b.pose === 'dash' ? b.x - b.face * i * 34 : b.x, gy = b.pose === 'dive' ? b.y - i * 40 : b.y;
        figure(ctx, Object.assign({}, b, { x: gx, y: gy, flash: 0, clone: true, hurt: false }), 0.3 - i * 0.07);
      }
    }
    figure(ctx, b, 1);
  };

  G.makeBoss(B);
})();
