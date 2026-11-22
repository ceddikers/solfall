// Solfall - The Unburied Knight: a death knight with a greatsword. Slow, heavy and wide.
// Its swings cover everything in front of it, so the place to be is behind it; its back is unguarded.
'use strict';
(function () {
  const { wait, tween } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards, K = G.kit, D = G.draw, DANGER = G.COL.danger;
  const WL = G.WALL_L, WR = G.WALL_R;

  const B = {
    id: 'knight', name: 'THE UNBURIED KNIGHT', short: 'The Knight', theme: 'knight',
    sub: 'An oath that outlived its keeper', taunt: 'it rises again',
    blurb: 'A death knight whose back is its weakness',
    tips: [
      'The Knight cannot cut behind itself. Dash through it as it swings and strike its back for extra damage.',
      'After an overhead blow, a charge into the wall or a whirl it is helpless for a moment.',
      'Jump the low wave; stay on the ground for the high one.',
      'Its charge is too tall for one jump. Dash through it, or jump twice.',
      'Rotting ground fades after a few seconds. Fight on what is left.',
      'Watch its feet. If the Knight stamps after a cut, another cut is coming; if the blade just drags, it is open.',
      'A blade that burns red as it rises takes two health and throws a wave along the floor. Get behind it, or get out and jump.',
    ],
    hudCols: [null, ['#6ab4ff', '#d4ecff'], ['#8ce04a', '#e0ffc8'], ['#ff4c46', '#ffd0c8']],
    BASE_HP: 4300, poise0: 460, w: 62, h: 122, platformsFrom: 2,
    gaps: [0, 1.0, 0.8, 0.6],
    bags: {
      1: ['cleave', 'overhead', 'charge', 'grip', 'graves', 'hurl'],
      2: ['cleave2', 'overhead', 'charge', 'grip', 'graves', 'wraiths', 'desecrate', 'whirl', 'rend', 'hurl'],
      3: ['reap', 'overhead', 'charge', 'grip', 'wraiths', 'desecrate', 'whirl', 'rend', 'leap', 'hurl'],
    },
    cards: { 2: ['THE HOST', 'The dead answer the call'], 3: ['BLOOD OATH', 'It will not fall alone'] },
    first: { 1: 'cleave', 2: 'wraiths', 3: 'leap' },
  };

  // ------------------------------------------------------------------ poses
  // lean, hip height, two feet (x, y), sword hand (x, y), blade angle, off hand (x, y; 999 = on the hilt)
  const POSES = {
    idle: [0.06, -58, 17, 0, -17, 0, 22, -54, 1.2, 999, 0],
    raise: [-0.12, -58, 20, 0, -18, 0, -8, -108, -2.45, 999, 0],
    cleave: [0.32, -52, 26, 0, -20, 0, 38, -58, 0.62, 999, 0],
    low: [0.3, -52, 24, 0, -20, 0, 34, -44, 0.95, 999, 0],
    rise: [-0.1, -58, 20, 0, -18, 0, 2, -112, -2.2, 999, 0],
    overRaise: [-0.08, -60, 16, 0, -18, 0, 6, -118, -1.72, 999, 0],
    slam: [0.5, -46, 28, 0, -22, 0, 34, -40, 1.32, 999, 0],
    chargeUp: [0.42, -44, 22, 0, -26, 0, -16, -52, 2.85, 6, -78],
    charge: [0.62, -48, 26, -4, -30, -2, -22, -58, 2.95, 26, -82],
    crash: [-0.25, -40, 24, 0, -18, 0, 22, -20, 1.45, -22, -30],
    grip: [0.1, -58, 18, 0, -18, 0, 10, -50, 1.3, 48, -86],
    plant: [0.14, -56, 16, 0, -18, 0, 24, -92, 1.5708, 999, 0],
    whirl: [0.1, -54, 20, 0, -20, 0, 30, -70, 0.02, 999, 0],
    air: [0.0, -58, 12, -16, -14, -8, 4, -120, -1.75, 999, 0],
    kneel: [0.5, -34, 24, 0, -30, 0, 26, -64, 1.5708, -6, -30],
  };
  const NP = 11;
  function walkPose(t) {
    const s = Math.sin(t), c = Math.cos(t), p = POSES.idle.slice();
    p[2] = 17 + s * 15; p[3] = -Math.max(0, c) * 7; p[4] = -17 - s * 15; p[5] = -Math.max(0, -c) * 7; p[1] = -58 + Math.abs(s) * 2;
    return p;
  }

  // ------------------------------------------------------------------ state
  B.setup = function () {
    const b = B.body;
    b.x = 900; b.y = FLOOR + 150; b.pose = 'kneel'; b.p = POSES.kneel.slice(); b.walkT = 0; b.hurt = false; b.spin = 0; b.spinning = false; b.fast = false;
    B.cape = D.chain(9, b.x, b.y - 100);
  };
  B.onHit = function () { if (B.body.unarmed) G.feats.bump('unarmed'); }; // for the feat
  B.onRelease = function () { const b = B.body; b.hurt = false; b.pose = 'idle'; b.spinning = false; b.fast = false; b.unarmed = false; b.blaze = 0; };
  B.onStagger = function () { B.body.pose = 'kneel'; };
  B.reckonName = 'DIRGE';
  B.onReckon = function (on) { B.body.pose = on ? 'overRaise' : 'idle'; };
  B.onRecover = function () { B.body.pose = 'idle'; };
  B.dying0 = function () { B.body.pose = 'kneel'; };
  // Blows that land on its back count for more.
  B.vuln = function () { const b = B.body; return (G.player.x - b.x) * b.face < -6 ? 1.3 : 1; };

  const facePlayer = () => { const b = B.body; if (Math.abs(G.player.x - b.x) > 10) b.face = G.player.x > b.x ? 1 : -1; };
  const tintNow = () => ({ boss: G.pal().boss, hot: G.pal().hot });

  // ------------------------------------------------------------------ building blocks
  // A greatsword swing: everything in front of and above the Knight, nothing behind it.
  function swing(o) {
    const b = B.body, f = b.face;
    const m = (ang) => (f > 0 ? ang : Math.PI - ang);
    return H.arc({
      x: b.x + f * 10, y: b.y - 86, r: o.r || 185, a0: m(o.a0), a1: m(o.a1), tele: o.tele, active: 0.13, dmg: o.dmg || 1, heavy: (o.dmg || 1) > 1, owner: b,
      follow(h) { if (!h.fired) { h.x = b.x + b.face * 10; h.y = b.y - 86; } },
      onFire() { G.audio.play('cleave'); b.fast = true; b.pose = o.pose; G.fx.shake(7); },
    });
  }
  // blaze: the blade burns red through the wind-up. That swing takes two health and throws a wave along the floor.
  function* cut(down, tele, r, blaze) {
    const b = B.body;
    b.fast = false; b.pose = down ? 'raise' : 'low'; b.blaze = blaze ? 1 : 0;
    if (blaze) { G.audio.play('charge', { dur: tele }); G.audio.play('whoosh'); }
    const o = down ? { a0: -2.5, a1: 0.78, tele, pose: 'cleave', r } : { a0: 0.78, a1: -2.5, tele, pose: 'rise', r };
    if (blaze) o.dmg = 2;
    swing(o);
    yield* wait(tele);
    if (blaze) { H.shockwave(b.x + b.face * 84, b.face, 560, 46, { boss: DANGER, hot: '255,236,220' }); G.fx.shake(11); G.audio.play('boom'); }
    b.blaze = 0;
    yield* tween(b, { x: G.clamp(b.x + b.face * 34, WL + 50, WR - 50) }, 0.14, E.outCubic);
    yield* wait(0.12);
  }

  // The flying crescent of the rend: at head height, so it passes over anyone standing.
  function crescent(x, dir, speed) {
    const tint = tintNow();
    return H.add({
      kind: 'crescent', x, y: FLOOR - 100, dir, speed, tint,
      update(dt) {
        this.x += this.dir * this.speed * dt; this.srcX = this.x - this.dir * 30;
        if (Math.random() < 0.6) G.fx.spawn({ x: this.x - this.dir * 10, y: this.y + G.rand(-20, 20), vx: -this.dir * G.rand(20, 90), vy: G.rand(-20, 20), life: G.rand(0.15, 0.4), size: G.rand(2, 5), color: tint.boss });
        if (this.x < WL - 40 || this.x > WR + 40) this.dead = true;
      },
      hits(P) { return G.rectsOverlap(P.box(), { cx: this.x, cy: this.y, hw: 16, hh: 19 }); },
      draw(ctx) {
        const d = this.dir, x = this.x, y = this.y;
        ctx.globalCompositeOperation = 'lighter';
        D.glow(ctx, tint.boss, x, y, 60, 0.6);
        for (const [col, s, a] of [[DANGER, 1, 0.85], [tint.hot, 0.55, 1]]) {
          ctx.fillStyle = G.rgba(col, a);
          ctx.beginPath();
          ctx.moveTo(x - d * 14, y - 30 * s); ctx.quadraticCurveTo(x + d * 30 * s, y, x - d * 14, y + 30 * s);
          ctx.quadraticCurveTo(x + d * 6 * s, y, x - d * 14, y - 30 * s);
          ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  }

  // ------------------------------------------------------------------ attacks
  function* approach(dist, speed, maxT) {
    const b = B.body, P = G.player;
    let e = 0;
    b.pose = 'walk';
    while (e < maxT && Math.abs(P.x - b.x) > dist) {
      const dt = yield;
      e += dt; facePlayer();
      b.x = G.clamp(b.x + b.face * speed * dt, WL + 50, WR - 50);
    }
    facePlayer();
  }

  // The Knight's tells are in its body, not its tempo.
  //   It stamps its back foot after a cut: another cut is coming. No stamp: the blade drags, and it is open.
  //   Its blade burns red while it winds up: that swing takes two health and throws a wave. Do not trade with it.
  const BLAZE = [0, 0.25, 0.35, 0.45];
  function* stamp() {
    const b = B.body;
    G.audio.play('stomp'); G.fx.shake(5); G.fx.kick(0, 3);
    G.fx.thud(b.x - b.face * 20, FLOOR, 0.7, { noCrack: true });
    G.fx.ring(b.x - b.face * 20, FLOOR - 4, { r0: 10, r1: 96, life: 0.3, color: G.pal().hot, width: 4 });
    b.stamp = 1;
    yield* wait(0.34);
    facePlayer();
  }
  function* drag() {
    const b = B.body;
    b.fast = false; b.pose = 'low';
    yield* wait(0.8);
  }
  function* atkCleave() {
    const T = K.T();
    G.ui.hint('knightback', 'Its swings do not reach behind it. Dash through and strike its back');
    yield* approach(150, 300, 0.7);
    const blaze = K.chance(BLAZE[1], 'blaze');
    yield* cut(true, (blaze ? 0.92 : 0.78) * T, null, blaze);
    if (K.hard() || K.chance(0.35, 'follow')) { yield* stamp(); yield* cut(false, 0.5 * T); }
    yield* drag();
  }
  function* atkCleave2() {
    const T = K.T();
    yield* approach(150, 320, 0.7);
    const blaze = K.chance(BLAZE[2], 'blaze');
    yield* cut(true, (blaze ? 0.86 : 0.72) * T, null, blaze);
    if (K.chance(0.7, 'follow')) {
      yield* stamp(); yield* cut(false, 0.48 * T);
      if (K.hard() || K.chance(0.4, 'follow')) { yield* stamp(); yield* cut(true, 0.46 * T); }
    }
    yield* drag();
  }

  // The sword comes down on a marked spot and sticks there.
  function* overhead(track, lock, stuck) {
    const b = B.body, P = G.player;
    facePlayer();
    b.fast = false; b.pose = 'overRaise';
    const reach = 138;
    const m = { x: b.x + b.face * reach, k: 0 }; // where the blade will land (no mark is drawn: watch the sword)
    G.audio.play('charge', { dur: track + lock });
    let e = 0;
    while (e < track) {
      const dt = yield;
      e += dt;
      // it strides after the hero while the blade is up
      const want = P.x - b.face * reach;
      if ((want - b.x) * b.face > 4) b.x = G.clamp(b.x + b.face * Math.min(230, Math.abs(want - b.x) * 6) * dt, WL + 50, WR - 50);
      m.x = b.x + b.face * reach; m.k = e / track * 0.7;
    }
    // the blade stops following and catches the light: it is coming down
    G.fx.glint(b.x - b.face * 8, b.y - 212, 34, DANGER, 0.3); G.audio.play('glint');
    e = 0;
    while (e < lock) { e += yield; m.k = 0.7 + 0.3 * Math.min(1, e / lock); }
    b.fast = true; b.pose = 'slam';
    yield* wait(0.07);
    K.crush(m.x, FLOOR - 70, 60, 80, 2);
    K.impact(m.x, true);
    H.shockwave(m.x - 50, -1, 450, 46);
    H.shockwave(m.x + 50, 1, 450, 46);
    b.exposed = true;
    yield* wait(stuck);
    b.exposed = false;
  }
  function* atkOverhead() {
    const T = K.T();
    yield* approach(260, 300, 0.6);
    yield* overhead(0.62 * T, 0.3 * T, B.phase === 3 ? 1.05 : 1.3);
  }

  // A charge from wall to wall. It cannot stop, and the wall stuns it.
  function* atkCharge() {
    const b = B.body, T = K.T();
    facePlayer();
    const dir = b.face, tele = 0.85 * T;
    b.pose = 'chargeUp';
    H.lane({ x: WL, y: FLOOR - 108, w: WR - WL, h: 108, dir, dur: tele, quiet: true });
    G.audio.play('charge', { dur: tele });
    // it lowers its shoulder and its back foot tears at the ground
    let ce = 0, glinted = false;
    while (ce < tele) {
      const dt = yield;
      ce += dt;
      if (Math.random() < dt * 30) G.fx.dust(b.x - dir * 26, FLOOR, 1, { dir: -dir, speed: [60, 260], size: [6, 11], life: [0.3, 0.6], up: 40, a: 0.4 });
      if (!glinted && ce >= tele - 0.22) { glinted = true; G.fx.glint(b.x + dir * 22, b.y - 84, 30, G.pal().hot); G.audio.play('glint'); }
    }
    b.pose = 'charge'; b.hurt = true;
    G.audio.play('sweep');
    const tx = dir > 0 ? WR - 56 : WL + 56, speed = K.gentle() ? 880 : 1020;
    while ((tx - b.x) * dir > 0) {
      const dt = yield;
      b.x += dir * speed * dt;
      G.fx.shake(3);
      if (Math.random() < dt * 60) G.fx.dust(b.x - dir * 34, FLOOR, 1, { dir: -dir, speed: [40, 240], size: [7, 13], life: [0.4, 0.8], up: 60, a: 0.42 });
      if (Math.random() < dt * 24) G.fx.burst(b.x - dir * 30, FLOOR - 4, { n: 1, color: '24,22,30', speed: [120, 380], angle: -Math.PI / 2 - dir * 0.5, spread: 1.4, life: [0.4, 0.8], size: [2.5, 5], kind: 'chunk', grav: 1500 });
    }
    b.x = tx; b.hurt = false;
    K.impact(tx + dir * 30, true);
    if (B.phase >= 2) {
      // rubble shaken loose from the wall
      for (let i = 0; i < 4; i++) H.orb(tx + dir * 20, FLOOR - 300 - i * 40, -dir * G.rrand(120, 520), -G.rrand(60, 320), { grav: 1000, r: 11 });
    }
    b.pose = 'crash'; b.exposed = true;
    yield* wait(B.phase === 3 ? 1.1 : 1.4);
    b.exposed = false;
  }

  // It drags the hero in, with a cleave already on its way.
  function* atkGrip() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('grip', 'It pulls you in. Dash past it before the blade lands');
    facePlayer();
    b.pose = 'grip';
    const tele = 0.5 * T;
    const tether = H.add({
      kind: 'tether', t: 0,
      update() { },
      draw(ctx) {
        const k = Math.min(1, this.t / tele), hx = b.x + b.face * 48, hy = b.y - 86;
        ctx.strokeStyle = G.rgba(this.t < tele ? DANGER : G.pal().boss, 0.4 + 0.5 * k); ctx.lineWidth = 2 + 2 * k;
        ctx.setLineDash([12, 9]); ctx.lineDashOffset = this.t * 160;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + P.x) / 2, Math.min(hy, P.y - 30) - 40, P.x, P.y - 26); ctx.stroke();
        ctx.setLineDash([]);
        D.glow(ctx, G.pal().boss, hx, hy, 20 + 14 * k, 0.9);
      },
    });
    G.audio.play('charge', { dur: tele });
    yield* wait(tele);
    G.audio.play('pull');
    const pullT = 0.8;
    b.fast = false; b.pose = 'raise';
    swing({ a0: -2.5, a1: 0.78, tele: pullT + 0.15 * T, pose: 'cleave' });
    let e = 0;
    while (e < pullT) {
      const dt = yield;
      e += dt;
      const dx = b.x - P.x;
      G.wind = Math.abs(dx) > 70 ? G.sign(dx) * (K.gentle() ? 380 : 450) : 0;
    }
    G.wind = 0; tether.dead = true;
    yield* wait(0.15 * T + 0.2);
    if (B.phase >= 2) { facePlayer(); yield* cut(false, 0.5 * T); }
    yield* wait(0.75);
  }

  // Spikes of bone erupt where the hero stands, one after another.
  function* atkGraves() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    b.pose = 'plant';
    G.audio.play('charge', { dur: 0.5 * T });
    yield* wait(0.5 * T);
    G.audio.play('bell'); G.fx.shake(6);
    const n = 4 + (B.phase - 1) + (K.hard() ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const x = G.clamp(P.x + P.vx * 0.22 + G.rrand(-12, 12), WL + 50, WR - 50);
      H.zone({ x: x - 46, y: FLOOR - 200, w: 92, h: 200, tele: 0.66 * T, active: 0.3, style: 'column', onFire() { G.audio.play('boom'); G.fx.shake(5); } });
      yield* wait(0.4);
    }
    yield* wait(0.66 * T + 0.35);
  }

  // Skulls that drift after the hero. They can be cut down.
  function* atkWraiths() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('wraiths', 'The skulls follow you. Cut them down');
    facePlayer();
    b.pose = 'plant';
    G.audio.play('charge', { dur: 0.7 * T });
    yield* wait(0.7 * T);
    G.audio.play('bell');
    const n = 3 + (B.phase === 3 ? 1 : 0) + (K.hard() ? 1 : 0), speed = K.gentle() ? 185 : 225;
    for (let i = 0; i < n; i++) {
      G.audio.play('orb');
      H.orb(b.x + b.face * 24, b.y - 150, G.rrand(-200, 200), -G.rrand(260, 420), {
        r: 14, life: 6, skull: true,
        steer(ob, dt) {
          if (ob.t < 0.45) { ob.vy += 500 * dt; return; }
          const dx = P.x - ob.x, dy = P.y - 26 - ob.y, d = Math.hypot(dx, dy) || 1;
          ob.vx = G.damp(ob.vx, dx / d * speed, 2.4, dt); ob.vy = G.damp(ob.vy, dy / d * speed, 2.4, dt);
          if (ob.life < 0.05) ob.pop();
        },
      });
      yield* wait(0.25);
    }
    yield* wait(0.8);
  }

  // The ground rots where it is marked, and stays that way for a while.
  function* atkDesecrate() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('rot', 'Keep off the rotting ground');
    facePlayer();
    b.fast = false; b.pose = 'overRaise';
    G.audio.play('charge', { dur: 0.6 * T });
    yield* wait(0.6 * T);
    b.fast = true; b.pose = 'slam';
    yield* wait(0.07);
    K.impact(b.x + b.face * 60, false);
    K.crush(b.x + b.face * 60, FLOOR - 50, 50, 56, 1);
    const have = H.list.filter((h) => h.kind === 'pool').length;
    const n = Math.max(0, Math.min((B.phase === 3 ? 4 : 3) + (K.hard() ? 1 : 0), 5 - have));
    const xs = [G.clamp(P.x, WL + 100, WR - 100)];
    for (let tries = 0; tries < 30 && xs.length < n; tries++) {
      const x = G.rrand(WL + 110, WR - 110);
      if (xs.every((o) => Math.abs(o - x) > 210) && Math.abs(x - b.x) > 120) xs.push(x);
    }
    for (const x of xs) H.pool({ x, w: 170, tele: 0.9 * T, active: K.gentle() ? 4.5 : 5.5 });
    yield* wait(1.1);
  }

  // It spins towards the hero with the blade out, then staggers to a stop.
  function* atkWhirl() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('whirl', 'Keep away from the spinning blade: run, dash through it, or take a platform');
    facePlayer();
    b.pose = 'whirl';
    const tele = 0.85 * T, dur = B.phase === 3 ? 2.7 : 2.4, R = 80, TOP = 108;
    G.audio.play('charge', { dur: tele });
    H.add({
      kind: 'whirl', layer: 'under', t: 0, r: R,
      update() { this.srcX = b.x; if (this.t > tele + dur) this.dead = true; },
      hits(Pl) { return this.t >= tele && this.t < tele + dur && Math.abs(Pl.x - b.x) < R + 4 && Pl.y > FLOOR - TOP + 6; },
      draw(ctx) {
        // no box and no red: the wind gathering round the blade, then the blade itself
        const x = b.x, pal = G.pal();
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        if (this.t < tele) {
          const k = this.t / tele;
          for (let i = 0; i < 2; i++) {
            const a = this.t * (5 + 9 * k) + i * Math.PI;
            ctx.strokeStyle = G.rgba(pal.boss, 0.12 + 0.3 * k); ctx.lineWidth = 2 + 4 * k;
            ctx.beginPath(); ctx.ellipse(x, FLOOR - 58, (R - 8) * (0.5 + 0.5 * k), (R - 8) * 0.28 * (0.5 + 0.5 * k), 0, a, a + 0.5 + 0.9 * k); ctx.stroke();
          }
        } else {
          const f = Math.min(1, (tele + dur - this.t) / 0.25);
          for (let i = 0; i < 3; i++) {
            const a = this.t * 15 + i * G.TAU / 3;
            ctx.strokeStyle = G.rgba(i ? pal.boss : pal.hot, (i ? 0.5 : 0.9) * f); ctx.lineWidth = i ? 15 : 7;
            ctx.beginPath(); ctx.ellipse(x, FLOOR - 62 + i * 8, R - 8, (R - 8) * 0.3, 0, a, a + 1.5); ctx.stroke();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    });
    // leaves and dust are drawn in to it while it winds up
    let we = 0, wg = false;
    while (we < tele) {
      const dt = yield;
      we += dt;
      if (Math.random() < dt * 26) { const s = Math.random() < 0.5 ? -1 : 1; G.fx.dust(b.x + s * G.rand(70, 130), FLOOR, 1, { dir: -s, speed: [80, 240], size: [5, 9], life: [0.3, 0.6], up: 30, a: 0.34 }); }
      if (!wg && we >= tele - 0.22) { wg = true; G.fx.glint(b.x + b.face * 74, b.y - 70, 32, G.pal().hot); G.audio.play('glint'); }
    }
    b.spinning = true;
    let e = 0, sfx = 0;
    const speed = (K.gentle() ? 205 : 240) + (K.hard() ? 35 : 0);
    while (e < dur) {
      const dt = yield;
      e += dt; sfx -= dt;
      b.spin += dt * 15;
      if (Math.abs(P.x - b.x) > 8) b.x = G.clamp(b.x + G.sign(P.x - b.x) * speed * dt, WL + 60, WR - 60);
      if (sfx <= 0) { sfx = 0.28; G.audio.play('blade'); G.fx.shake(2.5); }
    }
    b.spinning = false; facePlayer();
    b.pose = 'crash'; b.exposed = true;
    yield* wait(1.15);
    b.exposed = false;
  }

  // Waves thrown from the blade: low ones to jump, high ones to stay under.
  function* atkRend() {
    const b = B.body, T = K.T();
    G.ui.hint('rend', 'Jump the low wave. Stay on the ground for the high one');
    facePlayer();
    const n = 3 + (B.phase === 3 ? 1 : 0) + (K.hard() ? 1 : 0);
    let low = G.rng() < 0.5;
    for (let i = 0; i < n; i++) {
      const tele = (i ? 0.6 : 0.7) * T, dir = b.face;
      b.fast = false; b.pose = low ? 'low' : 'raise';
      H.lane({ x: WL, y: low ? FLOOR - 58 : FLOOR - 124, w: WR - WL, h: low ? 58 : 48, dir, dur: tele });
      yield* wait(tele);
      b.fast = true; b.pose = low ? 'rise' : 'cleave';
      G.audio.play('cleave'); G.fx.shake(5);
      if (low) H.shockwave(b.x + dir * 50, dir, 560, 56);
      else crescent(b.x + dir * 50, dir, 560);
      yield* wait(Math.max(0.2, 0.92 - tele));
      low = !low;
    }
    yield* wait(0.85);
  }

  // It leaps and comes down on the hero.
  function* atkLeap() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    b.pose = 'chargeUp';
    yield* wait(0.3);
    b.fast = true; b.pose = 'air';
    G.audio.play('whoosh');
    K.impact(b.x, false);
    yield* tween(b, { y: -260 }, 0.32, E.outQuad);
    const tele = 0.95 * T, lockT = 0.32 * T;
    const bl = H.blast({
      x: P.x, y: FLOOR - 8, r: 150, tele, dmg: 2,
      follow(h) { if (h.t < tele - lockT) h.x = G.damp(h.x, G.clamp(P.x, WL + 80, WR - 80), 0.2, 1); },
    });
    yield* wait(tele - 0.11);
    b.x = bl.x; b.face = P.x >= b.x ? 1 : -1;
    b.pose = 'slam';
    yield* tween(b, { y: FLOOR }, 0.11, E.inQuad);
    H.shockwave(b.x - 60, -1, 470, 46);
    H.shockwave(b.x + 60, 1, 470, 46);
    if (K.hard()) for (const s of [-1, 1]) H.pool({ x: G.clamp(b.x + s * 230, WL + 100, WR - 100), w: 150, tele: 0.8 * T, active: 4 });
    b.exposed = true;
    yield* wait(1.2);
    b.exposed = false;
  }

  // The third phase's chain: down, up, and the overhead to finish.
  function* atkReap() {
    const T = K.T();
    yield* approach(150, 340, 0.7);
    const blaze = K.chance(BLAZE[3], 'blaze');
    yield* cut(true, (blaze ? 0.8 : 0.66) * T, null, blaze);
    yield* stamp();
    yield* cut(false, 0.44 * T);
    // a second stamp, and the overhead follows; without it the Knight is spent
    if (K.chance(0.6, 'follow')) { yield* stamp(); yield* overhead(0.42 * T, 0.28 * T, 1.05); }
    else yield* drag();
  }

  // Hurl: the Knight throws its sword the length of the arena. It sticks in the far wall, and until
  // the Knight calls it back it has no weapon and stands open. The sword then tears free and flies
  // home: if the hero is between the wall and the Knight, it comes at their back.
  function* atkHurl() {
    const b = B.body, T = K.T(), P = G.player;
    facePlayer();
    const dir = b.face, tele = 0.8 * T, speed = K.gentle() ? 860 : 980;
    b.fast = false; b.pose = 'raise';
    H.lane({ x: WL, y: FLOOR - 66, w: WR - WL, h: 66, dir, dur: tele });
    G.audio.play('charge', { dur: tele });
    yield* wait(tele);
    b.fast = true; b.pose = 'cleave'; b.unarmed = true;
    G.audio.play('cleave'); G.audio.play('streak'); G.fx.shake(6);
    const tint = tintNow(), wall = dir > 0 ? WR - 34 : WL + 34;
    const blade = H.add({
      kind: 'blade', x: b.x + dir * 60, y: FLOOR - 40, dir, speed, state: 'out', spin: 0, tint, quiver: 0,
      update(dt) {
        if (this.state === 'out') {
          this.x += this.dir * this.speed * dt; this.spin += this.dir * 26 * dt;
          if ((this.x - wall) * this.dir >= 0) {
            this.x = wall; this.state = 'stuck'; this.quiver = 1;
            G.audio.play('tink'); G.audio.play('boom'); G.fx.shake(9);
            G.fx.burst(this.x, this.y, { n: 14, color: tint.hot, speed: [120, 520], angle: this.dir > 0 ? Math.PI : 0, spread: 2.2, life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
            G.fx.dust(this.x, this.y, 5, { dir: -this.dir, speed: [40, 220], size: [7, 12], up: 60 });
          }
        } else if (this.state === 'stuck') {
          this.quiver = Math.max(0, this.quiver - dt * 2);
        } else {
          // called home: it comes back faster than it left
          this.x -= this.dir * this.speed * 1.12 * dt; this.spin -= this.dir * 30 * dt;
          if ((this.x - b.x) * this.dir <= 44) this.dead = true;
        }
        this.srcX = this.x - (this.state === 'back' ? -this.dir : this.dir) * 30;
        if (this.state !== 'stuck' && Math.random() < dt * 50) G.fx.spawn({ x: this.x + G.rand(-20, 20), y: this.y + G.rand(-16, 16), vx: G.rand(-30, 30), vy: G.rand(-30, 30), life: G.rand(0.15, 0.35), size: G.rand(2, 5), color: tint.boss });
      },
      hits(Pl) { return this.state !== 'stuck' && G.rectsOverlap(Pl.box(), { cx: this.x, cy: this.y, hw: 36, hh: 24 }); },
      draw(ctx) {
        // stuck in the wall it points along its flight and shivers; in flight it spins
        const ang = this.state === 'stuck' ? (this.dir > 0 ? 0 : Math.PI) + Math.sin(this.t * 60) * 0.06 * this.quiver : this.spin;
        ctx.globalCompositeOperation = 'lighter';
        if (this.state !== 'stuck') D.glow(ctx, DANGER, this.x, this.y, 70, 0.5);
        ctx.globalCompositeOperation = 'source-over';
        sword(ctx, this.x - Math.cos(ang) * (this.state === 'stuck' ? 96 : 45), this.y - Math.sin(ang) * 45, ang, tint.boss, tint.hot);
      },
    });
    // unarmed: nothing to swing, and every blow counts for more
    while (blade.state === 'out') yield;
    b.pose = 'idle'; b.exposed = true;
    yield* wait(B.phase === 3 ? 1.0 : 1.4);
    // the call: a lane the other way, then the sword tears free
    b.pose = 'grip'; facePlayer();
    H.lane({ x: WL, y: FLOOR - 66, w: WR - WL, h: 66, dir: -dir, dur: 0.6 * T });
    G.audio.play('pull');
    yield* wait(0.6 * T);
    blade.state = 'back';
    G.audio.play('streak');
    while (!blade.dead) yield;
    b.unarmed = false; b.exposed = false; b.fast = true; b.pose = 'raise';
    G.audio.play('blade'); G.fx.shake(5);
    G.fx.ring(b.x, b.y - 80, { r0: 60, r1: 12, life: 0.25, color: tint.hot, width: 4 });
    yield* wait(0.35);
    // from the second phase it does not waste the catch
    if (B.phase >= 2) { facePlayer(); yield* cut(true, 0.5 * T); }
  }

  B.ATTACKS = {
    hurl: atkHurl,
    cleave: atkCleave, cleave2: atkCleave2, overhead: atkOverhead, charge: atkCharge, grip: atkGrip, graves: atkGraves,
    wraiths: atkWraiths, desecrate: atkDesecrate, whirl: atkWhirl, rend: atkRend, leap: atkLeap, reap: atkReap,
  };

  // ------------------------------------------------------------------ scenes
  B.enter = function* () {
    const b = B.body;
    b.x = 900; b.y = FLOOR + 150; b.pose = 'kneel'; b.p = POSES.kneel.slice(); b.face = -1;
    yield* wait(0.3);
    G.audio.play('bell');
    // it climbs out of the ground
    let e = 0;
    while (e < 1.3) {
      const dt = yield;
      e += dt;
      b.y = G.lerp(FLOOR + 150, FLOOR, E.outCubic(Math.min(1, e / 1.3)));
      G.fx.shake(3);
      if (Math.random() < 0.6) G.fx.burst(b.x + G.rand(-40, 40), FLOOR - 4, { n: 1, color: '24,22,30', speed: [100, 420], angle: -Math.PI / 2, spread: 1.6, life: [0.5, 1], size: [4, 9], kind: 'chunk', grav: 1400 });
      if (Math.random() < dt * 26) G.fx.dust(b.x + G.rand(-46, 46), FLOOR, 1, { speed: [10, 70], size: [8, 15], life: [0.6, 1.2], up: 80, a: 0.4 });
    }
    b.y = FLOOR;
    yield* wait(0.3);
    b.pose = 'idle';
    yield* wait(0.4);
  };
  B.phaseIn = function* () {
    const b = B.body;
    b.y = FLOOR; b.pose = 'kneel';
    yield* wait(0.9);
    b.pose = 'plant';
    G.audio.play('bell');
    yield* wait(0.5);
  };
  B.phaseOut = function* () {
    const b = B.body;
    b.pose = 'overRaise';
    yield* wait(1.3);
    b.pose = 'idle';
  };

  B.idle = function (dt) {
    const b = B.body, P = G.player;
    if (b.y < FLOOR) b.y = Math.min(FLOOR, b.y + 900 * dt);
    facePlayer();
    if (Math.abs(P.x - b.x) > 170) { b.x = G.clamp(b.x + b.face * (B.phase === 3 ? 150 : 110) * dt, WL + 50, WR - 50); b.pose = 'walk'; }
    else b.pose = 'idle';
  };

  B.tick = function (dt) {
    const b = B.body, P = G.player;
    if (b.pose === 'walk') {
      b.walkT += dt * 5.5;
      const sn = Math.floor(b.walkT / Math.PI + 0.5);
      if (sn !== b.stepN) {
        b.stepN = sn;
        if (b.y >= FLOOR - 1 && !b.hidden) {
          G.fx.dust(b.x + b.face * 14, FLOOR, 3, { speed: [20, 110], size: [5, 10], up: 26, a: 0.36 });
          G.fx.shake(1.6); G.fx.kick(0, 1.4);
          G.audio.play('stomp');
        }
      }
    }
    const target = b.pose === 'walk' ? walkPose(b.walkT) : (POSES[b.pose] || POSES.idle);
    const k = 1 - Math.exp(-(b.fast ? 46 : 11) * dt);
    for (let i = 0; i < NP; i++) {
      if (i === 9 && (target[9] === 999 || b.p[9] === 999)) { b.p[9] = target[9]; b.p[10] = target[10]; continue; }
      if (i === 10 && target[9] === 999) continue;
      b.p[i] += (target[i] - b.p[i]) * k;
    }
    D.chainStep(B.cape, b.x - b.face * 12, b.y + b.p[1] - 42, dt, { seg: 13, grav: 90, drift: 12, face: b.face, wave: 5, rate: 4, floor: FLOOR - 2 });
    if (b.blaze && Math.random() < dt * 70) {
      G.fx.spawn({ x: b.x + b.face * G.rand(-10, 70), y: b.y - G.rand(90, 200), vx: G.rand(-40, 40), vy: -G.rand(40, 160), life: G.rand(0.3, 0.7), size: G.rand(2, 4.5), color: DANGER, wob: 60, rot: G.rand(0, 6) });
    }
    // embers of whatever keeps it standing
    if (!B.dead && Math.random() < 0.3) {
      G.fx.spawn({ x: b.x + G.rand(-26, 26), y: b.y - G.rand(10, 120), vx: G.rand(-14, 14), vy: G.rand(-70, -20), life: G.rand(0.4, 0.9), size: G.rand(1.5, 3.5), color: G.pal().boss, kind: 'glow' });
    }
    if (b.hurt && G.canHurt() && G.rectsOverlap(P.box(), { cx: b.x + b.face * 6, cy: b.y - 52, hw: 30, hh: 48 })) P.tryHit(1, b.x, b);
  };

  // ------------------------------------------------------------------ drawing
  function sword(ctx, x, y, ang, col, hot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    D.glow(ctx, col, 62, 0, 70, 0.3);
    ctx.strokeStyle = '#06080c'; ctx.lineWidth = 6; D.line(ctx, -28, 0, 2, 0);
    ctx.strokeStyle = '#2a3440'; ctx.lineWidth = 2.5; D.line(ctx, -26, 0, 0, 0);
    ctx.fillStyle = G.rgba(col, 0.9); D.poly(ctx, [-34, 0, -29, -4.5, -24, 0, -29, 4.5]); ctx.fill();
    // crossguard with hooked ends
    ctx.fillStyle = '#1c2630';
    D.poly(ctx, [0, -15, 5, -19, 9, -15, 7, -4, 7, 4, 9, 15, 5, 19, 0, 15]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 1.2; ctx.stroke();
    // a broad blade, dark with a lit edge and runes down the fuller
    ctx.fillStyle = '#131a22';
    D.poly(ctx, [7, -9, 100, -8, 124, 0, 100, 8, 7, 9]); ctx.fill();
    ctx.fillStyle = G.rgba(col, 0.55);
    D.poly(ctx, [7, -9, 100, -8, 124, 0, 104, -3.4, 9, -4.6]); ctx.fill();
    ctx.strokeStyle = G.rgba(hot, 0.9); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(7, -9); ctx.lineTo(100, -8); ctx.lineTo(124, 0); ctx.stroke();
    ctx.fillStyle = G.rgba(hot, 0.95);
    for (let i = 0; i < 5; i++) { const rx = 22 + i * 17; D.poly(ctx, [rx, 0, rx + 4, -2.6, rx + 8, 0, rx + 4, 2.6]); ctx.fill(); }
    ctx.restore();
  }

  B.drawGround = function (ctx) {
    const b = B.body;
    if (B.dead) return;
    const k = G.clamp(1 - (FLOOR - b.y) / 420, 0.2, 1);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.48 * k) + ')';
    ctx.beginPath(); ctx.ellipse(b.x, FLOOR + 3, 52 * k, 8 * k, 0, 0, G.TAU); ctx.fill();
  };

  B.draw = function (ctx) {
    if (B.dead) return;
    const b = B.body, p = b.p, pal = G.pal(), col = pal.boss, hot = pal.hot;
    const lean = p[0], hip = p[1];
    const dark = '#090c11', mid = '#18212b', plate = '#2b3846', trim = '#40536a';
    const jx = b.jit ? G.rand(-b.jit, b.jit) : 0;
    // while it whirls the whole figure turns: squeeze it sideways and flip
    const turn = b.spinning ? Math.cos(b.spin) : 1;
    const sx = b.face * (Math.abs(turn) < 0.25 ? 0.25 * (turn < 0 ? -1 : 1) : turn);

    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // the cape: heavy and torn, in world space
    D.ribbon(ctx, B.cape.map((q) => ({ x: q.x + jx, y: q.y })), 38, 58, 12);
    ctx.fillStyle = '#07090d'; ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.3); ctx.lineWidth = 1.5; ctx.stroke();

    // nothing shows below the floor while it climbs out of the ground
    if (b.y > FLOOR) { ctx.beginPath(); ctx.rect(-80, -400, G.W + 160, FLOOR + 400); ctx.clip(); }
    ctx.translate(b.x + b.kx + jx, b.y);
    ctx.scale(sx, 1);
    D.glow(ctx, col, 0, -70, 120, 0.2);

    const shx = Math.sin(lean) * 46, shy = hip - Math.cos(lean) * 46; // shoulders
    const hx = p[6], hy = p[7], ang = p[8];
    const grip = p[9] === 999;
    const ox = grip ? hx - Math.cos(ang) * 14 : p[9], oy = grip ? hy - Math.sin(ang) * 14 : p[10];

    const leg = (i) => {
      const lx = i ? -6 : 6, k = D.ik(lx, hip, p[2 + i * 2], p[3 + i * 2], 30, 30, -1);
      ctx.fillStyle = i ? dark : mid;
      D.limb(ctx, lx, hip, k.jx, k.jy, 17, 12); ctx.fill();
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey - 4, 12, 9); ctx.fill();
      // greave, knee spike and a heavy sabaton
      ctx.fillStyle = i ? mid : plate;
      D.poly(ctx, [k.jx - 5, k.jy + 2, k.jx + 7, k.jy + 1, k.ex + 6, k.ey - 8, k.ex - 4, k.ey - 8]); ctx.fill();
      D.poly(ctx, [k.jx - 2, k.jy - 6, k.jx + 13, k.jy - 3, k.jx + 4, k.jy + 5]); ctx.fill();
      D.poly(ctx, [k.ex - 7, k.ey - 9, k.ex + 6, k.ey - 9, k.ex + 17, k.ey - 2, k.ex + 17, k.ey, k.ex - 7, k.ey]); ctx.fill();
      if (!i) { ctx.strokeStyle = G.rgba(col, 0.6); ctx.lineWidth = 1.2; D.line(ctx, k.jx + 7, k.jy + 1, k.ex + 6, k.ey - 8); }
    };
    const arm = (front) => {
      const ax = shx + (front ? 9 : -9), ay = shy + 4, tx = front ? hx : ox, ty = front ? hy : oy;
      const k = D.ik(ax, ay, tx, ty, 23, 23, 1);
      ctx.fillStyle = front ? mid : dark;
      D.limb(ctx, ax, ay, k.jx, k.jy, 13, 10); ctx.fill();
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 10, 9); ctx.fill();
      // vambrace and gauntlet
      ctx.fillStyle = front ? plate : mid;
      D.limb(ctx, G.lerp(k.jx, k.ex, 0.3), G.lerp(k.jy, k.ey, 0.3), G.lerp(k.jx, k.ex, 0.9), G.lerp(k.jy, k.ey, 0.9), 13, 11); ctx.fill();
      ctx.beginPath(); ctx.arc(k.ex, k.ey, 6.5, 0, G.TAU); ctx.fill();
      if (front) { ctx.strokeStyle = G.rgba(col, 0.6); ctx.lineWidth = 1.2; ctx.stroke(); }
    };

    leg(1);
    arm(false);
    // faulds and a tattered tabard under the belt
    ctx.fillStyle = dark;
    D.poly(ctx, [-13, hip - 4, 14, hip - 4, 17, hip + 20, 9, hip + 14, 6, hip + 34, 0, hip + 24, -5, hip + 36, -9, hip + 16, -16, hip + 22]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.4); ctx.lineWidth = 1.2; ctx.stroke();
    // breastplate: broad at the shoulders, with a burning sigil
    ctx.fillStyle = mid;
    D.poly(ctx, [-13, hip + 2, 14, hip + 2, shx + 21, shy + 6, shx + 15, shy - 6, shx - 15, shy - 6, shx - 21, shy + 6]); ctx.fill();
    ctx.fillStyle = plate;
    D.poly(ctx, [shx + 21, shy + 6, shx + 15, shy - 6, shx + 2, shy - 6, G.lerp(4, shx + 4, 0.45), G.lerp(hip, shy, 0.45), 14, hip + 2]); ctx.fill();
    const cx = G.lerp(0, shx, 0.62) + 3, cy = G.lerp(hip, shy, 0.62);
    D.glow(ctx, col, cx, cy, 22, 0.9);
    ctx.fillStyle = G.rgba(hot, 1);
    D.poly(ctx, [cx, cy - 9, cx + 3, cy - 2, cx + 8, cy, cx + 3, cy + 2, cx, cy + 11, cx - 3, cy + 2, cx - 8, cy, cx - 3, cy - 2]); ctx.fill();
    // belt with a skull buckle
    ctx.fillStyle = '#05070a'; D.poly(ctx, [-14, hip - 5, 15, hip - 5, 15, hip + 3, -14, hip + 3]); ctx.fill();
    ctx.fillStyle = G.rgba(hot, 0.9); ctx.beginPath(); ctx.arc(2, hip - 1, 4.2, 0, G.TAU); ctx.fill();
    ctx.fillStyle = '#05070a'; ctx.fillRect(0, hip - 2.4, 1.6, 1.8); ctx.fillRect(2.8, hip - 2.4, 1.6, 1.8);
    leg(0);

    // back pauldron, then the helm, then the front pauldron over the arm
    const pauldron = (px, py, s, c1) => {
      ctx.fillStyle = c1;
      D.poly(ctx, [px - 15 * s, py + 9, px - 16 * s, py - 4, px - 6 * s, py - 13, px + 8 * s, py - 12, px + 17 * s, py - 2, px + 15 * s, py + 10, px, py + 5]); ctx.fill();
      ctx.strokeStyle = G.rgba(col, 0.75); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.fillStyle = trim;
      D.poly(ctx, [px - 6 * s, py - 12, px - 3 * s, py - 27, px + 3 * s, py - 12]); ctx.fill();
      D.poly(ctx, [px + 5 * s, py - 12, px + 12 * s, py - 23, px + 13 * s, py - 8]); ctx.fill();
    };
    pauldron(shx - 15, shy, 0.85, mid);

    // helm: a crowned great helm with a slit of light and horns swept back
    const ex = shx + Math.sin(lean) * 15 + 2, ey = shy - Math.cos(lean) * 15 - 3;
    ctx.save();
    ctx.translate(ex, ey); ctx.rotate(lean * 0.5);
    ctx.fillStyle = trim;
    D.poly(ctx, [-7, -9, -17, -17, -27, -34, -15, -25, -4, -14]); ctx.fill();
    D.poly(ctx, [3, -12, 6, -22, 17, -37, 13, -22, 9, -11]); ctx.fill();
    ctx.fillStyle = plate;
    D.poly(ctx, [-11, 11, -12, -4, -8, -13, 1, -16, 10, -12, 13, -2, 12, 8, 6, 14, -4, 14]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.7); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = trim;
    D.poly(ctx, [-9, -12, -7, -21, -3, -14, 1, -24, 4, -15, 8, -21, 10, -12]); ctx.fill();
    ctx.fillStyle = '#020305';
    D.poly(ctx, [0, -6, 13, -5, 12.5, 1, 1, 0]); ctx.fill();
    D.glow(ctx, col, 8, -2.6, 15, 1);
    ctx.fillStyle = G.rgba(hot, 1);
    D.poly(ctx, [2.5, -4.4, 12, -4, 11.6, -1, 3, -1.6]); ctx.fill();
    ctx.strokeStyle = '#020305'; ctx.lineWidth = 1.4;
    for (const vx of [3, 6.5, 10]) D.line(ctx, vx, 3, vx, 10);
    ctx.restore();

    if (!b.unarmed) {
      // a burning blade: the warning colour, and a glow that grows through the wind-up
      if (b.blaze) { ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); D.glow(ctx, DANGER, 64, 0, 96, 0.75); ctx.restore(); }
      sword(ctx, hx, hy, ang, b.blaze ? DANGER : col, b.blaze ? '255,236,220' : hot); // thrown: see atkHurl
    }
    arm(true);
    pauldron(shx + 14, shy, 1, plate);

    if (b.flash > 0) D.glow(ctx, '255,255,255', 0, -70, 100, b.flash * 0.8);
    ctx.restore();
  };

  G.makeBoss(B);
})();
