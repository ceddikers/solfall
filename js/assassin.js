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
      'When it sinks into a crouch and its blade catches the light, it is about to cross the floor. Jump it, or dash through it for a perfect dodge.',
      'When it drops from above its blade sticks in the floor, and it takes extra damage until it pulls free.',
      'Its shadows vanish at a single hit and give Starlight.',
      'A line across the arena is a cut. Step off it, or jump it if it lies flat.',
      'Listen to the tempo of its flurry. Three measured cuts end in a fan of knives; five quick ones end in a single knife that bursts for two health.',
    ],
    hudCols: [null, ['#a070ff', '#e4d4ff'], ['#40e0a8', '#c8ffe8'], ['#d8d8f0', '#ffffff']],
    BASE_HP: 3000, poise0: 340, w: 36, h: 84,
    answer: 'hunt',
    gaps: [0, 0.8, 0.62, 0.5],
    bags: {
      1: ['lunge', 'flurry', 'knives', 'ambush', 'backstab', 'echo'],
      2: ['pincer', 'flurry', 'knives', 'ambush', 'backstab', 'mirror', 'rain', 'cross', 'echo'],
      3: ['pincer', 'flurry', 'ambush', 'backstab', 'mirror', 'rain', 'cross', 'cuts', 'mark', 'echo', 'hunt'],
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
    // on the way back to rest: a flick that throws the blades out to either side, and the hands
    // crossing at the waist as a spent throwing arm comes home
    flick: [0.05, -40, 0, 15, 0, -14, 0, 31, -42, 0.85, -27, -44, 2.3],
    sheathe: [0.28, -37, 0, 12, 0, -12, 0, 7, -43, 1.95, -3, -41, 1.15],
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
    B.lights = true; B.dark = 0; B.wires = []; B.wireHit = 0;
  };
  B.onRelease = function () { const b = B.body; b.hurt = false; b.pose = 'idle'; b.hidden = false; };
  B.onInterrupt = function () { for (const c of B.clones) smoke(c.x, c.y - 40); B.clones.length = 0; };
  B.onStagger = function () { B.body.pose = 'kneel'; };
  B.staggerWord = 'CAUGHT'; B.staggerMult = 1.9; B.staggerDur = 0.7;
  B.staggerIn = function* () {
    const b = B.body, dir = -(G.sign(G.player.x - b.x) || b.face);
    const x0 = b.x, y0 = Math.min(b.y, FLOOR), tx = dir > 0 ? WR - 26 : WL + 26;
    b.pose = 'air'; b.face = -dir;
    G.audio.play('whoosh');
    const dur = 0.2 + Math.abs(tx - x0) / 2600;
    let e = 0;
    while (e < dur) {
      e += yield;
      const k = Math.min(1, e / dur);
      b.x = G.lerp(x0, tx, k); b.y = G.lerp(y0, FLOOR - 110, k) - 4 * 70 * k * (1 - k);
      G.fx.spawn({ x: b.x - dir * 16, y: b.y - G.rand(10, 60), vx: -dir * G.rand(40, 200), vy: G.rand(-30, 30), life: 0.25, size: G.rand(4, 9), color: G.pal().boss });
    }
    // into the wall
    G.audio.play('slam'); G.fx.shake(15); G.fx.stop(0.08); G.fx.impact(tx, b.y - 40, 0.06);
    G.fx.burst(tx + dir * 10, b.y - 40, { n: 14, color: '24,20,34', speed: [150, 560], angle: dir > 0 ? Math.PI : 0, spread: 2.2, life: [0.5, 1.1], size: [5, 10], kind: 'chunk', grav: 1400 });
    G.fx.dust(tx, b.y - 40, 6, { dir: -dir, speed: [60, 260], size: [8, 15], life: [0.5, 1], up: 30 });
    G.fx.lines(tx, b.y - 40, 12, G.pal().hot, { r0: 20 });
    yield* wait(0.12);
    b.pose = 'kneel';
    yield* tween(b, { y: FLOOR }, 0.28, E.inQuad);
    G.fx.thud(b.x, FLOOR, 0.6, { noCrack: true });
  };
  B.reckonName = 'DEATH MARK';
  B.onReckon = function (on) { B.body.pose = on ? 'crouch' : 'idle'; };
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
      x: a.x + f * 8, y: a.y - 44, r: o.r, a0: m(o.a0), a1: m(o.a1), tele: o.tele, active: 0.1, owner: a,
      follow(h) { if (!h.fired) { h.x = a.x + a.face * 8; h.y = a.y - 44; } },
      onFire() { G.audio.play('blade'); a.pose = o.pose || 'slashA'; G.fx.shake(3); },
    });
  }

  // Crouch, then cross the floor in a blink. The lane shows the height: jump it or dash through.
  function* lunge(a, toX, tele) {
    const dir = G.sign(toX - a.x) || 1;
    a.face = dir; a.pose = 'crouch';
    H.lane({ x: WL, y: a.y - 66, w: WR - WL, h: 66, dir, dur: tele, quiet: true });
    // no lane on the floor: it sinks into its crouch, and the blade catches the light before it goes
    yield* wait(Math.max(0, tele - 0.2));
    if (a.gone) return;
    G.fx.glint(a.x + dir * 20, a.y - 44, 26, a.clone ? '170,160,210' : G.pal().hot); G.audio.play('glint');
    yield* wait(Math.min(tele, 0.2));
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

  // Flurry. The tell is tempo: how fast it cuts says how many cuts there are and how it ends.
  //   measured cuts: three, then it springs back and throws a fan of knives
  //   quick, small cuts: five, then it springs back and throws one knife that sticks and bursts for 2
  function* atkFlurry() {
    const b = B.body, P = G.player, T = K.T();
    const fast = K.chance(B.phase === 1 ? 0.4 : 0.5, 'fast');
    // close the distance
    b.pose = 'run';
    let e = 0;
    while (e < 0.9 && Math.abs(P.x - b.x) > 96) {
      const dt = yield;
      e += dt;
      b.face = P.x > b.x ? 1 : -1;
      b.x = G.clamp(b.x + b.face * 640 * dt, WL + 30, WR - 30);
    }
    const n = fast ? 5 : 3;
    for (let i = 0; i < n; i++) {
      // taking its time, it turns to follow the hero between cuts; in a hurry it commits to the way it faces,
      // so getting behind it (a dash straight through) is safe for the rest of the flurry
      if ((!fast || i === 0) && Math.abs(P.x - b.x) > 20) b.face = P.x > b.x ? 1 : -1;
      b.pose = 'crouch';
      const tele = (fast ? (i === 0 ? 0.4 : 0.19) : (i === 0 ? 0.5 : 0.4)) * T, r = fast ? 86 : 112;
      if (i % 2 === 0) swing(b, { r, a0: -2.1, a1: 0.95, tele, pose: 'slashA' });
      else swing(b, { r, a0: 1.0, a1: -2.0, tele, pose: 'slashB' });
      yield* wait(tele);
      // each cut carries it forward: a full step when it is taking its time, a shuffle when it is not
      const x1 = G.clamp(b.x + b.face * (fast ? 12 : 46), WL + 30, WR - 30);
      yield* tween(b, { x: x1 }, fast ? 0.06 : 0.1, E.outCubic);
      yield* wait(fast ? 0.02 : 0.1);
    }
    // the ender: spring away from the hero, then throw
    const away = b.x > P.x ? 1 : -1, tx = G.clamp(b.x + away * 200, WL + 50, WR - 50), x0 = b.x;
    b.face = -away; b.pose = 'air';
    e = 0;
    while (e < 0.3) { e += yield; const k = Math.min(1, e / 0.3); b.x = G.lerp(x0, tx, k); b.y = FLOOR - 4 * 90 * k * (1 - k); }
    b.y = FLOOR; b.face = P.x > b.x ? 1 : -1; b.pose = 'crouch';
    const ox = b.x + b.face * 22, oy = b.y - 60;
    if (!fast) {
      const base = Math.atan2(P.y - 24 - oy, P.x - ox), angs = [];
      for (let i = 0; i < 5; i++) angs.push(base + (i - 2) * 0.14);
      const tele = 0.42 * T;
      volley(ox, oy, angs, tele, 780);
      yield* wait(tele);
      b.pose = 'throw';
      yield* wait(0.3);
    } else {
      // one knife, lobbed to where the hero stands: it sticks, hisses, and takes two health from anyone still near
      yield* wait(0.26 * T);
      b.pose = 'throw';
      G.audio.play('arrowHeavy');
      const tf = 0.5, g = 1400, lx = G.clamp(P.x, WL + 60, WR - 60);
      H.orb(ox, oy, (lx - ox) / tf, (FLOOR - 14 - oy) / tf - 0.5 * g * tf, {
        r: 10, grav: g, blade: true, slashable: false, tint: { boss: DANGER, hot: '255,240,220' },
        onPop(ob) {
          G.audio.play('tink');
          H.blast({ x: G.clamp(ob.x, WL + 40, WR - 40), y: FLOOR - 12, r: 128, tele: 0.62 * T, dmg: 2 });
        },
      });
      yield* wait(tf + 0.62 * T + 0.2);
    }
    b.pose = 'skid';
    yield* wait(0.7);
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
      x: P.x, y: P.y - 22, r: 118, a0: -Math.PI * 0.999, a1: Math.PI * 0.999, tele, active: 0.11, mark: true, heavy: true,
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

  // Echo: the Veil kneels at the far side and sets the hero's own shadow on them. The shadow runs
  // the exact path the hero took, a second or so behind, and cuts what it touches. Standing still
  // lets it arrive; so does turning back into it, unless you jump it or dash through.
  function* atkEcho() {
    const b = B.body, P = G.player, T = K.T();
    yield* vanish();
    yield* wait(0.25);
    appear(P.x < 640 ? WR - 150 : WL + 150, FLOOR, 'crouch');
    G.ui.hint('echo', 'Your own shadow follows the path you took. Keep moving; jump it or dash through it when you turn back');
    G.audio.play('pull');
    const delay = Math.max(0.95, 1.2 * T), dur = B.phase === 1 ? 4 : B.phase === 2 ? 5 : 6;
    const shade = { x: P.x, y: P.y, face: P.facing, pose: 'dash', p: POSES.dash.slice(), clone: true, hurt: true };
    H.add({
      kind: 'echo', delay, dur, trail: [], live: false, x: P.x, y: P.y, shade,
      update(dt) {
        const tr = this.trail;
        tr.push({ x: P.x, y: P.y, t: this.t });
        while (tr.length > 1 && tr[1].t <= this.t - this.delay) tr.shift();
        if (this.t >= this.delay) {
          this.live = true;
          const s = tr[0];
          if (Math.abs(s.x - this.x) > 0.5) shade.face = s.x > this.x ? 1 : -1;
          this.x = s.x; this.y = s.y;
        }
        shade.x = this.x; shade.y = this.y; this.srcX = this.x - shade.face * 20;
        if (this.live && Math.random() < dt * 34) G.fx.spawn({ x: this.x + G.rand(-10, 10), y: this.y - G.rand(4, 60), vx: G.rand(-20, 20), vy: -G.rand(10, 60), life: G.rand(0.3, 0.6), size: G.rand(2, 5), color: G.pal().boss });
        if (this.t >= this.delay + this.dur) { this.dead = true; smoke(this.x, this.y - 40); G.audio.play('orbPop'); }
      },
      hits(Pl) { return this.live && this.t > this.delay + 0.3 && Math.abs(Pl.x - this.x) < 22 && Math.abs(Pl.y - this.y) < 44; },
      draw(ctx) {
        const tr = this.trail, k = Math.min(1, this.t / this.delay);
        // the path it is about to run, in the warning colour
        if (tr.length > 1) {
          ctx.strokeStyle = G.rgba(DANGER, 0.55); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.setLineDash([10, 8]); ctx.lineDashOffset = -this.t * 90;
          ctx.beginPath();
          for (let i = 0; i < tr.length; i += 3) { if (i) ctx.lineTo(tr[i].x, tr[i].y - 22); else ctx.moveTo(tr[i].x, tr[i].y - 22); }
          ctx.stroke(); ctx.setLineDash([]);
        }
        if (!this.live) {
          // it is still tearing loose from where the hero stood
          ctx.strokeStyle = G.rgba(DANGER, 0.5 + 0.4 * k); ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(this.x, this.y - 30, G.lerp(64, 18, k), 0, G.TAU); ctx.stroke();
          ctx.fillStyle = G.rgba(DANGER, 0.1 + 0.2 * k);
          ctx.beginPath(); ctx.arc(this.x, this.y - 30, 18, 0, G.TAU); ctx.fill();
        } else {
          D.glow(ctx, DANGER, this.x, this.y - 40, 46, 0.5);
          figure(ctx, shade, 0.9);
          ctx.fillStyle = G.rgba(DANGER, 0.95);
          ctx.beginPath(); ctx.arc(this.x + shade.face * 5, this.y - 67, 2.6, 0, G.TAU); ctx.fill();
        }
      },
    });
    b.pose = 'crouch';
    yield* wait(delay + dur + 0.2);
    // the working spent: the Veil is slow to rise
    b.pose = 'kneel'; b.exposed = true;
    yield* wait(1.0);
    b.exposed = false;
  }

  // Hunt: its answer to a hero who keeps away, or keeps to the air. It is gone, and then it is beside
  // them, at whatever height they are, already cutting. Three knives follow them down.
  function* atkHunt() {
    const b = B.body, P = G.player, T = K.T();
    yield* vanish();
    yield* wait(0.16);
    const air = !P.onGround && P.y < FLOOR - 60;
    const side = P.vx ? -G.sign(P.vx) : -(P.facing || 1); // behind the way they are moving
    const x = G.clamp(P.x + side * 62, WL + 40, WR - 40), y = air ? Math.min(FLOOR, P.y + 14) : FLOOR;
    appear(x, y, air ? 'air' : 'crouch');
    G.fx.ring(b.x, b.y - 46, { r0: 56, r1: 8, life: 0.22, color: G.pal().hot, width: 3 });
    const n = B.phase === 3 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      if (Math.abs(P.x - b.x) > 16) b.face = P.x > b.x ? 1 : -1;
      const tele = (i ? 0.26 : 0.36) * T;
      if (i % 2 === 0) swing(b, { r: 112, a0: -2.1, a1: 0.95, tele, pose: 'slashA' });
      else swing(b, { r: 112, a0: 1.0, a1: -2.0, tele, pose: 'slashB' });
      yield* wait(tele + 0.1);
    }
    if (b.y < FLOOR) { b.pose = 'air'; yield* tween(b, { y: FLOOR }, 0.2, E.inQuad); }
    b.face = P.x > b.x ? 1 : -1; b.pose = 'crouch';
    const ox = b.x + b.face * 22, oy = b.y - 60, base = Math.atan2(P.y - 24 - oy, P.x - ox), tele = 0.4 * T;
    volley(ox, oy, [base - 0.13, base, base + 0.13], tele, 820);
    yield* wait(tele);
    b.pose = 'throw';
    yield* wait(0.3);
    b.pose = 'skid';
    yield* wait(0.7);
  }

  // Back to rest. After a cut it flicks both blades clean; after a throw the arm comes home across
  // its waist; after an ambush it tears the blade out of the floor and springs back off it.
  const THROWS = { knives: 1, rain: 1, hunt: 1, flurry: 1 };
  B.recover = function* (name) {
    const b = B.body, P = G.player;
    if (b.hidden || b.y < FLOOR - 1) return;
    if (b.pose === 'stuck' || b.pose === 'kneel') {
      G.audio.play('tink');
      G.fx.dust(b.x, FLOOR, 4, { speed: [30, 150], size: [5, 9], up: 40 });
      G.fx.burst(b.x + b.face * 14, FLOOR - 6, { n: 6, color: G.pal().hot, speed: [100, 380], angle: -Math.PI / 2, spread: 1.6, life: [0.15, 0.35], kind: 'spark', size: [1.6, 3], grav: 800 });
      const x0 = b.x, x1 = G.clamp(b.x - b.face * 58, WL + 40, WR - 40);
      b.pose = 'air';
      let e = 0;
      while (e < 0.24) { e += yield; const k = Math.min(1, e / 0.24); b.x = G.lerp(x0, x1, k); b.y = FLOOR - 4 * 34 * k * (1 - k); }
      b.y = FLOOR; b.face = P.x > b.x ? 1 : -1; b.pose = 'crouch';
      yield* wait(0.1);
    } else if (THROWS[name]) {
      b.pose = 'sheathe';
      yield* wait(0.22);
    } else {
      b.face = P.x > b.x ? 1 : -1; b.pose = 'flick';
      G.audio.play('glint');
      yield* wait(0.06);
      for (const s of [1, -1]) G.fx.glint(b.x + b.face * s * 40, b.y - 34, 16, G.pal().hot, 0.18);
      G.fx.burst(b.x + b.face * 40, b.y - 34, { n: 4, color: G.pal().boss, kind: 'spark', angle: b.face > 0 ? 0.6 : Math.PI - 0.6, spread: 0.6, speed: [120, 340], life: [0.1, 0.25], size: [1.2, 2.2], grav: 500 });
      yield* wait(0.18);
    }
    b.pose = 'idle';
    yield* wait(0.1);
  };

  B.ATTACKS = {
    hunt: atkHunt,
    echo: atkEcho,
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
  // The second phase: it puts the lights out. From here the arena is dark but for the hero's own
  // light, and the Veil is a pair of eyes and whatever glints off its blades. A stagger brings the
  // light back for as long as it lasts.
  // The third phase: it tears the dark away and strings the air with wire, low over the middle of
  // the floor and higher towards the walls. The ground is still open; the sky above it is not.
  const WIRE_Y0 = 250, WIRE_Y1 = 398;
  B.phaseIn = function* (n) {
    const b = B.body;
    if (b.y < FLOOR) b.y = FLOOR;
    b.pose = 'kneel';
    yield* wait(0.8);
    yield* vanish();
    yield* wait(0.25);
    appear(640, FLOOR, 'crouch');
    if (n === 2) {
      // one hand comes up, and closes
      b.pose = 'throw';
      yield* wait(0.45);
      G.audio.play('pull'); G.audio.setIntensity(0);
      B.lights = false;
      G.fx.ring(b.x, b.y - 50, { r0: 900, r1: 10, life: 0.55, color: '10,8,20', width: 60, alpha: 0.9 });
      yield* wait(0.9);
    } else {
      B.lights = true; B.dark = 0;
      G.fx.flash(G.PAL[3].hot, 0.6, 0.5); G.fx.impact(b.x, b.y - 44, 0.08);
      G.fx.shatter(b.x, b.y - 44, '14,10,26', 26, { hot: G.PAL[3].hot, r: 520, r0: 40 });
      yield* wait(0.5);
    }
  };
  B.phaseOut = function* (n) {
    const b = B.body, P = G.player;
    if (n === 2) {
      // eyes open in the dark: it is not alone in here
      const a = clone(b.x - 260, FLOOR, 1, 'crouch'), c = clone(b.x + 260, FLOOR, -1, 'crouch');
      for (const sh of [a, c]) { sh.hurt = false; G.audio.play('tink'); yield* wait(0.3); }
      yield* wait(0.6);
      for (const sh of [a, c]) { sh.gone = true; smoke(sh.x, sh.y - 40); }
    } else {
      // up, and a knife to each wall with a wire behind it
      b.pose = 'air';
      yield* tween(b, { y: WIRE_Y1 + 40 }, 0.24, E.outCubic);
      for (const side of [-1, 1]) {
        b.face = side; b.pose = 'throw';
        const w = { x0: 640, y0: WIRE_Y1, x1: side < 0 ? WL : WR, y1: WIRE_Y0, k: 0, flash: 1 };
        B.wires.push(w);
        G.audio.play('arrowHeavy');
        yield* tween(w, { k: 1 }, 0.16, E.outQuad);
        G.audio.play('tink'); G.fx.shake(5);
        G.fx.burst(w.x1, w.y1, { n: 10, color: G.PAL[3].hot, speed: [100, 420], angle: side < 0 ? 0 : Math.PI, spread: 2, life: [0.15, 0.4], kind: 'spark', size: [2, 3.5] });
        G.fx.glint(w.x1 - side * 6, w.y1, 30, G.PAL[3].hot);
        yield* wait(0.12);
      }
      b.pose = 'dive';
      yield* tween(b, { y: FLOOR }, 0.16, E.inQuad);
      b.pose = 'skid'; b.face = P.x > b.x ? 1 : -1;
      G.fx.thud(b.x, FLOOR, 0.7, { noCrack: true }); G.audio.play('land');
      yield* wait(0.6);
    }
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
    // the dark: full while the lights are out, thinner while it is staggered, gone when it dies
    const darkTo = B.lights || B.dying || B.dead ? 0 : B.staggered ? 0.25 : 1;
    B.dark = G.damp(B.dark, darkTo, darkTo > B.dark ? 2.2 : 5, dt);
    B.wireHit = Math.max(0, B.wireHit - dt * 3);
    for (const w of B.wires) w.flash = Math.max(0, w.flash - dt * 2.5);
    if (!G.canHurt()) return;
    // the wires: live unless it is staggered, and a dash passes through them
    if (B.wires.length && !B.staggered && P.iframes <= 0 && P.inv <= 0 && !P.ulting) {
      for (const w of B.wires) {
        if (w.k < 1 || G.distPointSeg(P.x, P.y - 22, w.x0, w.y0, w.x1, w.y1) > 17) continue;
        if (P.tryHit(1, P.x + (P.vx >= 0 ? 30 : -30), { kind: 'wire', popVy: 260 })) {
          w.flash = 1; B.wireHit = 1;
          G.audio.play('blade');
          G.fx.cut(P.x, P.y - 22, Math.atan2(w.y1 - w.y0, w.x1 - w.x0), 260, 5, DANGER, '255,240,230', 0.25);
        }
        break;
      }
    }
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
    K.recoil(ctx, a);
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

    if (a.flash > 0) D.glow(ctx, '255,255,255', 0, -44, 54, a.flash * 0.3); // (v1.6d: a tint, not a white dome)
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

  // Where a figure's eyes are, near enough, for showing them through the dark.
  function eyeAt(a) {
    const lean = a.p[0], hip = a.p[1];
    return { x: a.x + a.face * (Math.sin(lean) * 34 + 7), y: a.y + hip - Math.cos(lean) * 34 - 13 };
  }
  let darkCv = null;
  B.drawOver = function (ctx) {
    if (B.dark < 0.01 || B.dead) return;
    const b = B.body, P = G.player, pal = G.pal();
    if (!darkCv) { darkCv = document.createElement('canvas'); darkCv.width = 720; darkCv.height = 440; }
    const d = darkCv.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, 720, 440);
    d.fillStyle = 'rgba(2,2,9,' + 0.94 * B.dark + ')';
    d.fillRect(0, 0, 720, 440);
    // the hero's own light, and a little round anything that is burning
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => {
      const hx = (x - G.cam.x + 80) / 2, hy = (y - G.cam.y + 80) / 2, g = d.createRadialGradient(hx, hy, r * 0.12, hx, hy, r / 2);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(0.6, 'rgba(0,0,0,' + a * 0.55 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.fillRect(hx - r / 2, hy - r / 2, r, r);
    };
    // (r is the radius of the light in the arena's own pixels)
    if (!P.dead) hole(P.x, P.y - 26, 230 + 26 * Math.min(4, G.flow.rank), 1);
    for (const s of G.shots) hole(s.x, s.y, 80, 0.7);
    if (B.staggered && !b.hidden) hole(b.x, b.y - 40, 170, 0.9);
    ctx.drawImage(darkCv, G.cam.x - 80, G.cam.y - 80, 1440, 880);
    // eyes in the dark
    ctx.globalCompositeOperation = 'lighter';
    const eye = (a, col, k) => {
      const e = eyeAt(a);
      D.glow(ctx, col, e.x, e.y, 20, 0.9 * k * B.dark);
      ctx.fillStyle = G.rgba(pal.hot, k * B.dark);
      ctx.beginPath(); ctx.ellipse(e.x, e.y, 4.2, 1.5, a.face * 0.25, 0, G.TAU); ctx.fill();
    };
    if (!b.hidden) eye(b, pal.boss, 1);
    for (const c of B.clones) eye(c, pal.boss, c.hurt ? 1 : 0.7);
    ctx.globalCompositeOperation = 'source-over';
  };

  B.draw = function (ctx) {
    if (B.dead) return;
    const b = B.body, col = G.pal().boss;
    // the wires of the third phase: a hair of the warning colour with light running along it
    for (const w of B.wires) {
      const x1 = G.lerp(w.x0, w.x1, w.k), y1 = G.lerp(w.y0, w.y1, w.k), slack = B.staggered || B.dying;
      ctx.lineCap = 'round';
      ctx.strokeStyle = slack ? 'rgba(150,150,170,0.28)' : G.rgba(DANGER, 0.5 + 0.5 * w.flash); ctx.lineWidth = 1.4 + 2.5 * w.flash;
      ctx.beginPath(); ctx.moveTo(w.x0, w.y0);
      if (slack) ctx.quadraticCurveTo((w.x0 + x1) / 2, (w.y0 + y1) / 2 + 46, x1, y1); else ctx.lineTo(x1, y1);
      ctx.stroke();
      if (!slack && w.k >= 1) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const q = (G.t * 0.35 + i / 3) % 1;
          D.glow(ctx, '255,240,230', G.lerp(w.x0, w.x1, q), G.lerp(w.y0, w.y1, q), 9, 0.9 * Math.sin(Math.PI * q));
        }
        ctx.globalCompositeOperation = 'source-over';
        dagger(ctx, w.x1, w.y1, w.x1 < 640 ? Math.PI : 0, col, G.pal().hot, false);
      }
    }
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
