// Solfall - The Eclipsed Warden: a core, two hands, three phases.
// Attacks are generator scripts; each yield hands control back for one simulation step.
'use strict';
(function () {
  const { wait, tween, par } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards, DANGER = G.COL.danger;
  const WL = G.WALL_L, WR = G.WALL_R;

  const B = G.boss = { BASE_HP: 5400 };
  const HOME_Y = [0, 214, 214, 250];

  function mkHand(side) {
    return {
      id: 'hand' + side, side, x: 640 + side * 320, y: -120, rot: 0, curl: 0.12,
      ctrl: true, hurt: false, hurtDmg: 1, alive: true, flash: 0, stuck: false, hot: 0,
    };
  }

  B.reset = function () {
    B.maxHp = Math.round(B.BASE_HP * G.diff().bossHp);
    B.hp = B.maxHp;
    B.phase = 1; B.poise = 0; B.poiseMax = 440; B.staggered = false;
    B.invuln = true; B.active = false; B.dead = false; B.dying = false;
    B.script = null; B.attackName = ''; B.bag = []; B.lastAtk = ''; B.forceNext = 'slam';
    B.t = 0; B.spread = 318; B.rays = []; B.shardR = 900; B.shardsOut = false; B.hasShards = false;
    B.core = {
      x: 640, y: -200, r: 84, ctrl: true, open: 1, charge: 0, flash: 0,
      lx: 0, ly: 0, pulse: 0, spinHint: 0, hurt: false, jit: 0, sun: 0, embedded: false,
      blink: 0, blinkT: 3,
    };
    B.hands = [mkHand(-1), mkHand(1)];
  };

  // Idle pose for the title screen backdrop.
  B.attract = function () {
    B.reset();
    B.core.y = HOME_Y[1]; B.core.ctrl = false;
    B.spread = 430;
    for (const h of B.hands) { h.ctrl = false; h.x = 640 + h.side * B.spread; h.y = HOME_Y[1] + 128; }
  };

  // ------------------------------------------------------------------ targets and damage
  function handBox(h) {
    const oy = G.lerp(-18, 6, h.curl), hw = 62, hh = G.lerp(92, 62, h.curl);
    const s = Math.sin(h.rot), c = Math.cos(h.rot);
    return {
      cx: h.x - oy * s, cy: h.y + oy * c,
      hw: Math.abs(c) * hw + Math.abs(s) * hh, hh: Math.abs(s) * hw + Math.abs(c) * hh,
    };
  }

  B.targets = function () {
    const out = [];
    if (!B.active || B.dead || B.dying) return out;
    const c = B.core;
    out.push({ id: 'core', kind: 'core', cx: c.x, cy: c.y, r: c.r * 0.96 });
    for (const h of B.hands) {
      if (!h.alive) continue;
      const b = handBox(h);
      out.push({ id: h.id, kind: 'hand', ref: h, cx: b.cx, cy: b.cy, hw: b.hw, hh: b.hh });
    }
    return out;
  };

  B.damage = function (amount, t, info) {
    if (!B.active || B.dead || B.dying || B.invuln) return false;
    let mult = t.kind === 'core' ? 1.5 : 1;
    if (B.staggered) mult *= 1.4;
    const dmg = Math.round(amount * mult);
    const floorHp = B.phase === 1 ? Math.floor(B.maxHp * 2 / 3) : B.phase === 2 ? Math.floor(B.maxHp / 3) : 0;
    B.hp = Math.max(floorHp, B.hp - dmg);
    G.player.stats.dmg += dmg;
    if (t.kind === 'core') B.core.flash = 1; else t.ref.flash = 1;
    // struck parts recoil away from the blow
    const push = (info.dir || G.sign(t.cx - G.player.x) || 1) * (info.lance ? 16 : info.heavy ? 12 : 7);
    if (t.kind === 'core') B.core.kick = Math.min(1, (B.core.kick || 0) + (info.heavy ? 0.9 : 0.5));
    else if (t.ref) t.ref.kx = G.clamp((t.ref.kx || 0) + push, -22, 22);
    if (G.settings.numbers) {
      G.fx.text(info.x + G.rand(-12, 12), info.y - 16, String(dmg), {
        color: (t.kind === 'core' || B.staggered || info.finisher) ? '255,226,140' : '255,255,255',
        size: info.finisher ? 28 : info.heavy ? 23 : 17, life: info.finisher ? 0.8 : 0.65,
      });
    }
    if (!B.staggered) {
      B.poise += amount * (t.kind === 'hand' ? 1.5 : (B.phase === 3 ? 1.35 : 0.9)) + (info.lance ? 60 : 0);
    }
    if (B.hp <= 0) die();
    else if (B.phase < 3 && B.hp <= floorHp) beginPhase(B.phase + 1);
    else if (!B.staggered && B.poise >= B.poiseMax) stagger();
    return true;
  };

  // ------------------------------------------------------------------ script control
  function release() {
    const c = B.core;
    c.ctrl = false; c.charge = 0; c.pulse = 0; c.spinHint = 0; c.hurt = false; c.embedded = false; c.jit = 0;
    for (const h of B.hands) { h.ctrl = false; h.hurt = false; h.stuck = false; h.hot = 0; }
    B.shardsOut = false;
    G.wind = 0;
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
    G.fx.stop(0.12); G.fx.shake(14); G.fx.flash(G.COL.starHot, 0.3, 0.3);
    G.fx.ring(B.core.x, B.core.y, { r0: 60, r1: 320, life: 0.6, color: G.COL.starHot, width: 10 });
    G.fx.burst(B.core.x, B.core.y, { n: 30, color: G.pal().hot, speed: [200, 700], life: [0.3, 0.8], kind: 'spark', size: [2, 5] });
    G.ui.callout('STAGGERED', 'Strike the core');
    B.script = staggerScript();
  }

  function* staggerScript() {
    const c = B.core, dur = G.diff().stagger;
    c.ctrl = true;
    const drops = [tween(c, { y: FLOOR - 112, open: 0.06 }, 0.42, E.inCubic)];
    for (const h of B.hands) {
      if (!h.alive) continue;
      h.ctrl = true;
      drops.push(tween(h, { x: G.clamp(c.x + h.side * 310, 110, 1170), y: FLOOR - 56, rot: h.side * 0.55, curl: 0.35 }, 0.48, E.inCubic));
    }
    yield* par(...drops);
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
    B.phase = n; B.bag = [];
    B.script = n === 2 ? toPhase2() : toPhase3();
  }

  function* toPhase2() {
    const c = B.core, [L, R] = B.hands;
    c.ctrl = L.ctrl = R.ctrl = true;
    B.forceNext = 'tide';
    G.ui.letterbox(true);
    G.fx.flash(G.COL.white, 0.5, 0.5); G.fx.shake(16); G.fx.slow(0.25, 0.7);
    G.audio.play('stagger');
    yield* par(
      tween(c, { x: 640, y: 262, open: 0.1 }, 0.8),
      tween(L, { x: 640 - 150, y: 300, curl: 1, rot: 0.3 }, 0.8),
      tween(R, { x: 640 + 150, y: 300, curl: 1, rot: -0.3 }, 0.8)
    );
    yield* wait(0.45);
    G.arena.setPhase(2, 1.8);
    G.arena.raisePlatforms();
    G.audio.setIntensity(2);
    G.audio.play('roar'); G.audio.play('card');
    G.ui.card('II', 'TOTALITY', 'The light is swallowed whole');
    G.fx.flash(G.PAL[2].boss, 0.45, 0.8); G.fx.shake(20);
    pushPlayer();
    c.open = 1;
    const fling = par(
      tween(c, { y: 196 }, 1.1, E.outCubic),
      tween(L, { x: 640 - 400, y: 250, curl: 0, rot: -0.35 }, 0.5, E.outBack),
      tween(R, { x: 640 + 400, y: 250, curl: 0, rot: 0.35 }, 0.5, E.outBack)
    );
    let e = 0, ringT = 0;
    while (e < 2.0) {
      const dt = yield;
      e += dt; ringT -= dt;
      fling.next(dt);
      G.fx.shake(5 * (1 - e / 2));
      if (ringT <= 0 && e < 1.2) {
        ringT = 0.28;
        G.fx.ring(c.x, c.y, { r0: c.r, r1: 760, life: 0.9, color: G.PAL[2].boss, width: 12, alpha: 0.7 });
      }
    }
    G.ui.letterbox(false);
    B.poiseMax = 500; B.invuln = false;
    release();
  }

  function* toPhase3() {
    const c = B.core, [L, R] = B.hands;
    c.ctrl = L.ctrl = R.ctrl = true;
    B.forceNext = 'dive';
    G.ui.letterbox(true);
    G.fx.flash(G.COL.white, 0.5, 0.5); G.fx.shake(16); G.fx.slow(0.25, 0.7);
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
    G.audio.setIntensity(3);
    G.audio.play('roar'); G.audio.play('card');
    G.ui.card('III', 'BLACK SUN', 'Nothing left to hold back');
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

  function die() {
    interrupt();
    B.dying = true; B.invuln = true; B.hp = 0; B.staggered = false; B.poise = 0;
    G.onBossDying();
    B.script = deathScript();
  }

  function* deathScript() {
    const c = B.core;
    c.ctrl = true; c.open = 0.1;
    B.shardsOut = true;
    G.fx.slow(0.12, 1.3); G.fx.flash(G.COL.white, 0.8, 0.7); G.fx.shake(22); G.fx.stop(0.2);
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
        G.fx.shake(7 + e * 4);
      }
    }
    // the eclipse breaks
    G.fx.flash(G.PAL[4].hot, 1, 2.2); G.fx.shake(30);
    G.fx.burst(c.x, c.y, { n: 90, color: G.PAL[4].boss, speed: [200, 1100], life: [0.6, 1.8], size: [4, 12], drag: 1.2 });
    G.fx.burst(c.x, c.y, { n: 40, color: '18,14,24', speed: [200, 900], life: [1, 2], size: [8, 16], kind: 'chunk', grav: 1300 });
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
    1: ['slam', 'sweep', 'clap', 'lance', 'rain', 'slam'],
    2: ['slam2', 'sweep2', 'clap', 'lance3', 'rain', 'pulse', 'comb', 'rocket', 'tide'],
    3: ['dive', 'storm', 'wheel', 'singularity', 'rain', 'pulse', 'dive', 'storm'],
  };
  function nextAttack() {
    if (B.forceNext) { const f = B.forceNext; B.forceNext = ''; B.lastAtk = f; return f; }
    if (!B.bag.length) {
      const src = BAGS[B.phase];
      for (let tries = 0; tries < 8; tries++) {
        B.bag = G.shuffle(src.slice());
        let ok = B.bag[B.bag.length - 1] !== B.lastAtk;
        for (let i = 1; i < B.bag.length && ok; i++) if (B.bag[i] === B.bag[i - 1]) ok = false;
        if (ok) break;
      }
    }
    B.lastAtk = B.bag.pop();
    return B.lastAtk;
  }

  function* think() {
    const low = B.phase === 3 && B.hp < B.maxHp * 0.12;
    const gap = [0, 0.95, 0.75, 0.6][B.phase] * G.diff().pace * (low ? 0.55 : 1);
    yield* wait(gap);
    const name = G.debug.forceAttack || nextAttack();
    B.attackName = name;
    yield* ATTACKS[name]();
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

  function impactFx(x, big) {
    const P = G.pal();
    G.fx.shake(big ? 22 : 15); G.fx.punch(big ? 0.035 : 0.02);
    G.audio.play('slam');
    G.fx.ring(x, FLOOR - 4, { r0: 20, r1: big ? 260 : 170, life: 0.4, color: P.hot, width: 8 });
    G.fx.burst(x, FLOOR - 6, { n: big ? 30 : 18, color: '190,190,210', speed: [80, 420], angle: -Math.PI / 2, spread: 3, life: [0.3, 0.8], size: [4, 9] });
    G.fx.burst(x, FLOOR - 6, { n: big ? 14 : 8, color: '22,18,32', speed: [150, 560], angle: -Math.PI / 2, spread: 2.2, life: [0.6, 1.2], size: [5, 11], kind: 'chunk', grav: 1500 });
    G.fx.burst(x, FLOOR - 6, { n: big ? 24 : 12, color: P.boss, speed: [150, 600], angle: -Math.PI / 2, spread: 2.6, life: [0.2, 0.6], kind: 'spark', size: [2, 4], grav: 900 });
  }

  function nearHand() {
    const alive = B.hands.filter((h) => h.alive);
    const P = G.player;
    return alive.sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x))[0];
  }
  const other = (h) => B.hands.find((o) => o !== h);

  // ------------------------------------------------------------------ phase 1 attacks
  function* slam(h, o) {
    const T = G.diff().tele, P = G.player;
    h.ctrl = true; h.stuck = false;
    G.audio.play('charge', { dur: 0.95 * T });
    const m = columnMark(h.x, 156);
    let e = 0;
    const trackT = o.track * T;
    while (e < trackT) {
      const dt = yield;
      e += dt;
      const tx = G.clamp(P.x + P.vx * 0.14, WL + 80, WR - 80);
      h.x = G.damp(h.x, tx, 7.5, dt); h.y = G.damp(h.y, 226, 7, dt);
      h.curl = G.damp(h.curl, 1, 12, dt); h.rot = G.damp(h.rot, 0, 12, dt);
      m.x = h.x; m.k = e / trackT * 0.7;
    }
    m.locked = true; h.hot = 1;
    const y0 = h.y, lockT = 0.27 * T;
    e = 0;
    while (e < lockT) {
      e += yield;
      const k = Math.min(1, e / lockT);
      h.y = y0 - 36 * E.outCubic(k);
      m.k = 0.7 + 0.3 * k;
    }
    h.hurt = true; h.hurtDmg = 1;
    yield* tween(h, { y: FLOOR - 64 }, 0.085, E.inQuad);
    m.dead = true;
    impactFx(h.x, false);
    H.shockwave(h.x - 56, -1, o.wave, 46);
    H.shockwave(h.x + 56, 1, o.wave, 46);
    yield* wait(0.07);
    h.hurt = false; h.hot = 0; h.stuck = true;
    yield* wait(o.stuck);
    h.stuck = false;
  }

  function* atkSlam() {
    yield* slam(nearHand(), { track: 0.72, stuck: 1.2, wave: 470 });
  }

  function* sweepOnce(h, fromX, toX, tele) {
    const dir = G.sign(toX - fromX);
    H.lane({ x: WL, y: FLOOR - 116, w: WR - WL, h: 116, dir, dur: tele });
    G.audio.play('charge', { dur: tele });
    h.hot = 1;
    yield* tween(h, { x: fromX - dir * 26 }, tele, E.outCubic);
    h.hurtDmg = 1;
    G.audio.play('sweep');
    const dur = 0.66, x0 = h.x;
    let e = 0;
    while (e < dur) {
      e += yield;
      // a beat of grace as it starts, so a jump on the flash clears it even right beside the hand
      h.hurt = e > 0.09;
      h.x = G.lerp(x0, toX, E.inOutQuad(Math.min(1, e / dur)));
      G.fx.shake(2.5);
      G.fx.burst(h.x - dir * 50, FLOOR - 4, { n: 1, color: '190,190,210', speed: [40, 200], angle: -Math.PI / 2, spread: 2, life: [0.3, 0.6], size: [4, 8] });
      G.fx.burst(h.x - dir * 40, FLOOR - G.rand(10, 100), { n: 1, color: G.pal().boss, speed: [40, 200], angle: dir > 0 ? Math.PI : 0, spread: 0.8, life: [0.2, 0.4], size: [3, 6] });
    }
    h.hurt = false; h.hot = 0;
  }

  function* sweep(h, back) {
    const T = G.diff().tele;
    h.ctrl = true;
    const fromX = h.side > 0 ? WR - 70 : WL + 70, toX = h.side > 0 ? WL + 70 : WR - 70;
    // the hand lies on its side, low enough that one jump clears it
    yield* tween(h, { x: fromX, y: FLOOR - 58, curl: 0.3, rot: -h.side * Math.PI / 2 }, 0.5);
    yield* sweepOnce(h, fromX, toX, 0.8 * T);
    if (back) {
      yield* wait(0.2);
      yield* sweepOnce(h, toX, fromX, 0.55 * T);
    }
    yield* wait(0.35);
  }
  function* atkSweep() { yield* sweep(G.rpick(B.hands.filter((h) => h.alive)), false); }
  function* atkSweep2() { yield* sweep(G.rpick(B.hands.filter((h) => h.alive)), true); }

  function* atkClap() {
    const [L, R] = B.hands, T = G.diff().tele, P = G.player;
    L.ctrl = R.ctrl = true;
    let cx = G.clamp(P.x, 240, 1040);
    yield* par(
      tween(L, { x: cx - 340, y: FLOOR - 125, curl: 0, rot: 0.3 }, 0.5),
      tween(R, { x: cx + 340, y: FLOOR - 125, curl: 0, rot: -0.3 }, 0.5)
    );
    const m = columnMark(cx, 236);
    G.audio.play('charge', { dur: 0.95 * T });
    let e = 0;
    const tt = 0.65 * T;
    while (e < tt) {
      const dt = yield;
      e += dt;
      cx = G.damp(cx, G.clamp(P.x, 200, 1080), 5.5, dt);
      L.x = cx - 340; R.x = cx + 340; m.x = cx; m.k = e / tt * 0.7;
    }
    m.locked = true; L.hot = R.hot = 1;
    const lockT = 0.3 * T;
    e = 0;
    while (e < lockT) {
      e += yield;
      const k = Math.min(1, e / lockT);
      L.x = cx - 340 - 44 * E.outCubic(k); R.x = cx + 340 + 44 * E.outCubic(k);
      m.k = 0.7 + 0.3 * k;
    }
    yield* par(tween(L, { x: cx - 60, rot: 0 }, 0.1, E.inQuad), tween(R, { x: cx + 60, rot: 0 }, 0.1, E.inQuad));
    m.dead = true;
    crush(cx, FLOOR - 125, 112, 128, 2);
    const pal = G.pal();
    G.audio.play('clap');
    G.fx.shake(18); G.fx.punch(0.025); G.fx.flash(pal.hot, 0.2, 0.2);
    G.fx.ring(cx, FLOOR - 125, { r0: 30, r1: 300, life: 0.45, color: pal.hot, width: 10 });
    G.fx.burst(cx, FLOOR - 125, { n: 34, color: pal.boss, speed: [200, 800], life: [0.2, 0.7], kind: 'spark', size: [2, 5] });
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

  function* lances(n) {
    const c = B.core, T = G.diff().tele, P = G.player;
    for (let i = 0; i < n; i++) {
      const tele = (i === 0 ? 0.85 : 0.55) * T;
      c.charge = 1;
      G.audio.play('charge', { dur: tele });
      H.beam({
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
      yield* wait(tele + 0.34 + (i < n - 1 ? 0.1 : 0.3));
    }
    c.charge = 0;
  }
  function* atkLance() { yield* lances(1); }
  function* atkLance3() { yield* lances(3); }

  function* atkRain() {
    const c = B.core, T = G.diff().tele, P = G.player;
    const n = [0, 8, 11, 14][B.phase] + (hard() ? 2 : 0);
    const gap = [0, 0.27, 0.23, 0.19][B.phase];
    c.charge = 1;
    G.audio.play('charge', { dur: 0.5 * T });
    yield* wait(0.5 * T);
    for (let i = 0; i < n; i++) {
      G.audio.play('orb');
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
    const a = nearHand(), b = other(a);
    const n = hard() ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const h = i % 2 === 0 ? a : b, last = i === n - 1;
      yield* slam(h, { track: i === 0 ? 0.62 : 0.5, stuck: last ? 1.0 : 0.12, wave: 540 });
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
      while (e < tt) { e += yield; c.pulse = Math.min(1, e / tt); }
      c.pulse = 0;
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
      yield* wait(0.85 * T + 0.1);
      parity = 1 - parity;
    }
    yield* wait(0.55);
    L.hot = R.hot = 0;
  }

  function* atkRocket() {
    const P = G.player, T = G.diff().tele;
    const h = G.rpick(B.hands.filter((x) => x.alive));
    h.ctrl = true;
    const sx = h.side > 0 ? WR - 78 : WL + 78, dir = -h.side;
    const aimY = () => G.clamp(P.y - 36, 150, FLOOR - 66);
    yield* tween(h, { x: sx, y: aimY(), curl: 1, rot: -h.side * Math.PI / 2 }, 0.5);
    const total = 0.9 * T;
    const m = H.lane({ x: WL, y: h.y - 64, w: WR - WL, h: 128, dir, dur: total });
    G.audio.play('charge', { dur: total });
    let e = 0;
    while (e < 0.62 * T) {
      const dt = yield;
      e += dt;
      h.y = G.damp(h.y, aimY(), 6, dt);
      m.y = h.y - 64;
    }
    h.hot = 1;
    yield* tween(h, { x: sx + h.side * 34 }, 0.28 * T, E.outCubic);
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
    G.fx.shake(16); G.fx.punch(0.02); G.audio.play('slam');
    G.fx.burst(h.x + dir * 50, h.y, { n: 20, color: '190,190,210', speed: [80, 480], angle: dir > 0 ? Math.PI : 0, spread: 2.4, life: [0.3, 0.8], size: [4, 9] });
    for (let i = 0; i < 4; i++) {
      H.orb(h.x + dir * 30, h.y - 20, -dir * G.rrand(140, 460), -G.rrand(280, 640), { grav: 1100, r: 11 });
    }
    yield* wait(1.15);
    h.stuck = false;
  }

  function* atkTide() {
    const c = B.core, T = G.diff().tele;
    G.ui.hint('tide', 'The floor will burn. Get onto a platform');
    c.charge = 1;
    G.audio.play('charge', { dur: 1.45 * T });
    H.zone({
      x: WL, y: FLOOR - 34, w: WR - WL, h: 34, tele: 1.45 * T, active: 2.7, style: 'tide', pop: -780,
      onFire() { G.audio.play('tide'); G.fx.shake(7); },
    });
    yield* wait(1.45 * T + 0.3);
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
    yield* tween(c, { y: FLOOR - c.r + 16 }, 0.16, E.inQuad);
    m.dead = true;
    impactFx(c.x, true);
    crush(c.x, FLOOR - 70, 128, 80, 2);
    H.shockwave(c.x - 90, -1, 600, 54);
    H.shockwave(c.x + 90, 1, 600, 54);
    // debris always lands in the same two rings, so staying close to the core is the safe choice
    for (const [ang, speed] of [[-0.8, 680], [-0.4, 520], [0.4, 520], [0.8, 680]]) {
      const a = -Math.PI / 2 + ang;
      H.orb(c.x, FLOOR - 120, Math.cos(a) * speed, Math.sin(a) * speed, { grav: 1000, r: 12 });
    }
    yield* wait(0.08);
    c.hurt = false; c.embedded = true; c.open = 0.25;
    yield* wait(hard() ? 1.2 : 1.6);
    c.embedded = false; c.open = 1;
    yield* tween(c, { y: HOME_Y[3] }, 0.7, E.outCubic);
  }

  function* atkStorm() {
    const T = G.diff().tele, P = G.player;
    const n = hard() ? 9 : 7;
    B.shardsOut = true;
    G.audio.play('charge', { dur: 0.4 });
    yield* wait(0.4);
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
      yield* wait(hard() ? 0.32 : 0.4);
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
    yield* wait(T);
    c.spinHint = 0;
    let e = 0, next = 1.0, hum = 0.5;
    while (e < total) {
      const dt = yield;
      e += dt; next -= dt; hum -= dt;
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
      for (let i = 0; i < 2; i++) {
        const a = G.rand(0, G.TAU), r = G.rand(R * 0.7, R + 160);
        G.fx.spawn({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 1.6, life: 0.5, size: 4, color: G.pal().boss, kind: 'spark' });
      }
    }
    G.wind = 0; c.charge = 0; c.jit = 0;
    G.fx.flash(G.pal().hot, 0.35, 0.4); G.fx.punch(0.04);
    c.open = 0.12;
    yield* wait(hard() ? 1.0 : 1.4);
    c.open = 1;
  }

  const ATTACKS = B.ATTACKS = {
    slam: atkSlam, sweep: atkSweep, clap: atkClap, lance: atkLance, rain: atkRain,
    slam2: atkSlam2, sweep2: atkSweep2, lance3: atkLance3, pulse: atkPulse, comb: atkComb,
    rocket: atkRocket, tide: atkTide,
    dive: atkDive, storm: atkStorm, wheel: atkWheel, singularity: atkSingularity,
  };

  // ------------------------------------------------------------------ update
  B.update = function (dt) {
    B.t += dt;
    const c = B.core, P = G.player;
    c.flash = Math.max(0, c.flash - dt * 6);
    for (const h of B.hands) { h.flash = Math.max(0, h.flash - dt * 6); h.kx = (h.kx || 0) * Math.exp(-13 * dt); }
    c.kick = (c.kick || 0) * Math.exp(-11 * dt);
    for (const r of B.rays) r.t += dt;

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
      if (h.ctrl || !h.alive) continue;
      const tx = G.clamp(c.x + h.side * (B.spread + Math.sin(B.t * 0.8 + h.side) * 16), 90, 1190);
      const ty = c.y + 128 + Math.cos(B.t * 1.1 + h.side * 2) * 18;
      h.x = G.damp(h.x, tx, 4.5, dt); h.y = G.damp(h.y, ty, 4.5, dt);
      h.rot = G.damp(h.rot, h.side * 0.1, 7, dt);
      h.curl = G.damp(h.curl, 0.13 + 0.07 * Math.sin(B.t * 1.3 + h.side * 1.7), 7, dt);
    }

    // an occasional blink while it is not busy
    c.blink = Math.max(0, c.blink - dt);
    if (!B.staggered && !B.dying && c.charge <= 0 && c.open > 0.9) {
      c.blinkT -= dt;
      if (c.blinkT <= 0) { c.blink = 0.17; c.blinkT = G.rand(2.4, 6); }
    }

    // the eye follows the player
    const dx = P.x - c.x, dy = P.y - 22 - c.y, d = Math.hypot(dx, dy) || 1;
    c.lx = G.damp(c.lx, dx / d, 8, dt); c.ly = G.damp(c.ly, dy / d, 8, dt);

    // shards circle the core in phase 3
    if (B.hasShards) B.shardR = G.damp(B.shardR, B.shardsOut ? 1100 : c.r + 74, B.shardsOut ? 3 : 5, dt);

    // contact damage while a part is mid-attack
    if (G.canHurt()) {
      for (const h of B.hands) {
        if (!h.hurt || !h.alive) continue;
        const b = handBox(h);
        b.hw *= 0.8; b.hh *= 0.88;
        if (G.rectsOverlap(P.box(), b)) P.tryHit(h.hurtDmg, h.x, h);
      }
      if (c.hurt && G.circleRect(c.x, c.y, c.r * 0.88, P.box())) P.tryHit(2, c.x, c);
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
    ctx.translate(c.x + (c.jit ? G.rand(-c.jit, c.jit) : 0), c.y + (c.jit ? G.rand(-c.jit, c.jit) : 0));
    if (B.dead) { drawSun(ctx, c); ctx.restore(); return; }
    if (c.kick > 0.01) { const ks = 1 - 0.045 * c.kick; ctx.scale(ks, ks); }
    const dim = B.staggered ? 0.4 : 1;
    const ch = c.charge;

    // halo and corona
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.5 + 0.25 * ch) * dim;
    ctx.drawImage(G.fx.glow(P.boss), -r * 3.6, -r * 3.6, r * 7.2, r * 7.2);
    ctx.globalAlpha = 1;
    const N = 46;
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? G.rgba(P.boss, 0.5 * dim) : G.rgba(P.hot, 0.75 * dim);
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const a = i / N * G.TAU + t * 0.06;
        const n = (Math.sin(t * 1.9 + i * 2.4) * 0.5 + 0.5) * (0.55 + 0.45 * Math.sin(t * 3.1 + i * 1.7));
        const L = r * (0.14 + 0.44 * Math.max(0, n)) * (1 + ch * 0.5) * (pass === 0 ? 1 : 0.5) * (0.4 + 0.6 * dim);
        const da = G.TAU / N * (pass === 0 ? 0.48 : 0.26);
        ctx.moveTo(Math.cos(a - da) * r * 0.97, Math.sin(a - da) * r * 0.97);
        ctx.lineTo(Math.cos(a) * (r + L), Math.sin(a) * (r + L));
        ctx.lineTo(Math.cos(a + da) * r * 0.97, Math.sin(a + da) * r * 0.97);
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.strokeStyle = G.rgba(P.boss, 0.5 * dim); ctx.lineWidth = 13;
    ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, G.TAU); ctx.stroke();
    ctx.strokeStyle = G.rgba(P.hot, 0.95 * dim); ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(0, 0, r + 1, 0, G.TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    // the dark disc
    const g = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#12101c'); g.addColorStop(1, '#020204');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, G.TAU); ctx.fill();

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
    const ew = r * 0.62, eh = r * 0.36 * c.open * lid;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-ew, 0); ctx.quadraticCurveTo(0, -eh * 2, ew, 0); ctx.quadraticCurveTo(0, eh * 2, -ew, 0);
    ctx.closePath();
    ctx.fillStyle = G.rgba(P.boss, 0.14 + 0.2 * ch);
    ctx.fill();
    ctx.clip();
    const ir = r * 0.2 * (1 + 0.15 * ch);
    const ix = c.lx * ew * 0.42, iy = c.ly * r * 0.08;
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
      ctx.fillStyle = 'rgba(255,255,255,' + (c.flash * 0.55) + ')';
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
    // dazed stars while staggered
    if (B.staggered) {
      ctx.fillStyle = G.rgba(G.COL.starHot, 0.95);
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + i * 2.094;
        star4(ctx, Math.cos(a) * 56, -r - 26 + Math.sin(a) * 9, 9);
      }
    }
    ctx.restore();
  }

  function drawShards(ctx) {
    if (!B.hasShards) return;
    const P = G.pal(), c = B.core;
    for (let i = 0; i < 6; i++) {
      const a = B.t * 0.9 + i * G.TAU / 6;
      const x = c.x + Math.cos(a) * B.shardR, y = c.y + Math.sin(a) * B.shardR;
      if (x < -80 || x > G.W + 80 || y < -80 || y > G.H + 80) continue;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(a + Math.PI / 2 + (B.shardsOut ? Math.PI / 2 : 0));
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

  function drawHand(ctx, h) {
    if (!h.alive) return;
    const P = G.pal(), c = h.curl;
    const danger = h.hurt || h.hot > 0;
    const edge = danger ? DANGER : P.boss;
    const dimK = h.stuck ? 0.4 : 1;
    const j = h.hot > 0 && !h.hurt ? 1.6 : 0;
    ctx.save();
    ctx.translate(h.x + (h.kx || 0) + (j ? G.rand(-j, j) : 0), h.y + (j ? G.rand(-j, j) : 0));
    ctx.rotate(h.rot);
    ctx.scale(h.side, 1);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.3 + (danger ? 0.35 : 0)) * dimK;
    ctx.drawImage(G.fx.glow(edge), -150, -170, 300, 320);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.lineJoin = 'round';
    const stroke = G.rgba(edge, 0.9 * (0.45 + 0.55 * dimK));
    // fingers
    for (const f of FINGERS) {
      const len = f.len * (1 - 0.74 * c);
      ctx.save();
      ctx.translate(f.x, -40); ctx.rotate(f.ang * (1 - c));
      G.roundRect(ctx, -11.5, -len, 23, len + 14, 10);
      ctx.fillStyle = '#100d18'; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke();
      if (len > 30) {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-7, -len * 0.5); ctx.lineTo(7, -len * 0.5); ctx.stroke();
      }
      ctx.restore();
    }
    // thumb
    ctx.save();
    ctx.translate(-50, 14); ctx.rotate(-1.0 + 1.25 * c);
    const tl = 52 * (1 - 0.3 * c);
    G.roundRect(ctx, -11.5, -tl, 23, tl + 12, 10);
    ctx.fillStyle = '#100d18'; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
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
      ctx.fillStyle = 'rgba(255,255,255,' + (h.flash * 0.5) + ')';
      G.roundRect(ctx, -57, -48, 114, 114, 28); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // cracks while it is stuck and safe to hit
    if (h.stuck) {
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
