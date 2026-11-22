// Solfall - the big moments inside a fight.
//   Reckoning   twice a fight the boss wards itself and gathers a blast; break the ward in time and
//               it is thrown down helpless, fail and the blast goes off.
//   Riposte     the first hit after a perfect dodge lands for double.
//   Sunder      the first finisher on a staggered boss lands for double and a bit.
//   Clash       a finisher or thrust that lands as the boss's own weapon is coming round stops the swing.
//   Last Light  the first time a fight leaves the hero on one health, time gives them a breath.
//   Last push   the boss's final tenth of health is called out, and it bleeds light until it falls.
'use strict';
(function () {
  const FLOOR = G.FLOOR, F = G.fx, H = G.hazards, rnd = G.rand;
  const { wait } = G.seq;
  const GOLD = '255,214,140', DANGER = G.COL.danger;
  // roughly what each hero deals in a second of steady attacking, to size the ward
  const DPS = { vesper: 48, aster: 50, lune: 26 };

  const M = G.moments = { sunder: false, wasStag: false, push: false, pushT: 0, gloom: 0, broke: 0, beat: 0 };

  M.reset = function () {
    const B = G.boss, P = G.player;
    B.ward = null; B.reckoned = {};
    M.sunder = false; M.wasStag = false; M.push = false; M.pushT = 0; M.gloom = 0; M.broke = 0; M.beat = 0;
    P.riposteT = 0; P.lastLight = false;
  };

  // ------------------------------------------------------------------ Reckoning
  // Once in the first phase and once in the second, when the boss is about half way through it.
  M.due = function (B) {
    if (B.phase > 2 || B.staggered || G.player.dead) return false;
    B.reckoned = B.reckoned || {};
    if (B.reckoned[B.phase]) return false;
    if (B.hp / B.maxHp > (B.phase === 1 ? 5 / 6 : 1 / 2)) return false;
    B.reckoned[B.phase] = true;
    return true;
  };

  // The gathering itself: the boss file moves the boss into place, then hands over to this.
  // pos() gives the ward's centre and radius each step. Breaking the ward interrupts the script
  // from outside (see M.wardHit), so whatever follows this in the caller is the "too late" branch.
  M.gather = function* (B, pos) {
    const P = G.player, pal = G.pal();
    const dur = 6.5 * Math.max(0.8, G.diff().tele);
    const hp = Math.round((DPS[P.hero.id] || 45) * 3.3 * Math.min(1.6, 1 + 0.08 * (G.run.trial - 1)) * [0.8, 1, 1.15][G.settings.difficulty]);
    const p0 = pos();
    B.ward = { hp, max: hp, t: 0, dur, x: p0.x, y: p0.y, r: p0.r, flash: 0 };
    G.ui.callout(B.reckonName || 'RECKONING', 'Break the ward before the ring closes');
    G.ui.hint('reckon', 'Strike the boss to break its ward. If the ring closes first, dash through the blast.');
    G.audio.play('charge', { dur: Math.min(dur, 6) }); G.audio.play('bell');
    F.shake(9); F.flash(pal.boss, 0.2, 0.4);
    F.ring(p0.x, p0.y, { r0: 420, r1: p0.r, life: 0.6, color: pal.hot, width: 6 });
    let e = 0, pull = 0, beat = 0;
    while (e < dur) {
      const dt = yield;
      const w = B.ward;
      if (!w) return;
      e += dt; w.t = e;
      const q = pos(), k = e / dur;
      w.x = q.x; w.y = q.y; w.r = q.r; w.flash = Math.max(0, w.flash - dt * 5);
      // light is dragged in from all over the arena, faster as the moment nears
      pull += dt * (10 + 46 * k);
      while (pull >= 1) {
        pull -= 1;
        const a = rnd(0, G.TAU), d = rnd(220, 460);
        F.spawn({ x: w.x + Math.cos(a) * d, y: w.y + Math.sin(a) * d * 0.7, vx: -Math.cos(a) * d * 2.1, vy: -Math.sin(a) * d * 0.7 * 2.1, life: 0.46, size: rnd(2.5, 5), color: Math.random() < 0.3 ? pal.hot : pal.boss });
      }
      // a heartbeat that quickens
      beat -= dt;
      if (beat <= 0) { beat = 0.95 - 0.62 * k; G.audio.play('pulse', { k }); F.shake(1.5 + 4 * k); w.flash = Math.max(w.flash, 0.5); }
    }
    // too late
    const w = B.ward;
    B.ward = null;
    G.ui.callout('TOO LATE', 'Dash through the blast');
    G.audio.play('roar'); F.flash(pal.hot, 0.5, 0.4); F.shake(18); F.punch(0.03);
    yield* wait(0.4);
    for (let i = 0; i < 2; i++) {
      H.ring({ x: w.x, y: w.y, speed: 520, thick: 26 });
      G.audio.play('boom'); F.shake(14);
      F.boom(w.x, w.y, 150, { col: pal.boss, hot: pal.hot });
      F.shatter(w.x, w.y, pal.boss, 14, { hot: pal.hot, r: 380, r0: 50 });
      yield* wait(0.6);
    }
  };

  // A blow lands on the ward. Returns true when that breaks it (the caller then staggers the boss).
  M.wardHit = function (B, amount, info) {
    const w = B.ward, pal = G.pal();
    w.hp -= amount; w.flash = 1;
    G.flow.dealt(amount * 0.5);
    if (G.settings.numbers) F.text(info.x + rnd(-12, 12), info.y - 16, String(Math.round(amount)), { color: GOLD, size: info.heavy ? 22 : 16, life: 0.6, pop: true });
    F.burst(info.x, info.y, { n: 6, color: pal.hot, speed: [120, 420], life: [0.15, 0.35], kind: 'spark', size: [2, 3.5] });
    if (w.hp > 0) return false;
    B.ward = null; M.broke++;
    const P = G.player;
    P.ult = Math.min(100, (P.ult || 0) + 25); G.flow.add(25);
    G.audio.play('shatter'); G.audio.play('finish');
    G.ui.callout('WARD BROKEN', 'It is helpless');
    F.stop(0.2); F.slow(0.3, 0.5); F.flash(pal.hot, 0.55, 0.45); F.shake(22); F.punch(0.055);
    F.shatter(w.x, w.y, pal.boss, 40, { hot: pal.hot, r: 520, speed: [220, 980], size: [4, 10], jitter: w.r * 0.6, r0: w.r });
    F.ring(w.x, w.y, { r0: w.r, r1: 620, life: 0.7, color: pal.hot, width: 14 });
    F.ring(w.x, w.y, { r0: w.r * 0.6, r1: 360, life: 0.5, color: GOLD, width: 8 });
    F.boom(w.x, w.y, 170, { col: pal.boss, hot: pal.hot });
    return true;
  };

  // ------------------------------------------------------------------ moments the hero makes
  // Before a weapon hit is applied: what it is worth. Nothing is used up until M.landed says it hit.
  M.strike = function (heavy) {
    const P = G.player, B = G.boss;
    if (heavy && M.sunder && B.staggered) return { mult: 2.2, kind: 'sunder' };
    if (P.riposteT > 0 && !B.ward) return { mult: 2, kind: 'riposte' };
    return { mult: 1, kind: '' };
  };

  // After the hit landed. heavy: a finisher, a thrust or a heavy arrow.
  M.landed = function (em, x, y, ang, heavy) {
    const P = G.player, H0 = P.hero, B = G.boss;
    if (em.kind === 'sunder') {
      M.sunder = false;
      G.audio.play('finish'); G.audio.play('slam');
      F.text(x, y - 58, 'SUNDER', { color: GOLD, size: 30, life: 1.1 });
      F.stop(0.2); F.slow(0.35, 0.4); F.flash(H0.hot, 0.4, 0.35); F.shake(20); F.punch(0.05);
      F.cut(x, y, ang + 0.5, 760, 22, GOLD, H0.hot, 0.4); F.cut(x, y, ang - 0.5, 760, 22, GOLD, H0.hot, 0.4);
      F.shatter(x, y, G.pal().boss, 26, { hot: G.pal().hot, r: 440, r0: 40 });
      F.thud(x, FLOOR, 1.5, { col: H0.col });
      F.ring(x, y, { r0: 20, r1: 380, life: 0.5, color: GOLD, width: 10 });
    } else if (em.kind === 'riposte') {
      P.riposteT = 0; G.feats.bump('riposte');
      G.audio.play('riposte');
      F.text(x, y - 52, 'RIPOSTE', { color: GOLD, size: 24, life: 0.9 });
      F.stop(0.11); F.slow(0.4, 0.22); F.shake(9); F.punch(0.03); F.flash(H0.hot, 0.16, 0.2);
      F.cut(x, y, ang, 560, 14, GOLD, H0.hot, 0.3);
      F.lines(x, y, 12, GOLD, { r0: 26 });
      F.ring(x, y, { r0: 10, r1: 150, life: 0.3, color: GOLD, width: 6 });
    }
    // Clash: the blow met the boss's own swing as it came round
    if (heavy) {
      for (const h of H.list) {
        if (h.kind !== 'arc' || h.dead || h.t < h.tele - 0.3 || h.t >= h.tele + h.active) continue;
        if (G.dist(P.x, P.y - 24, h.x, h.y) > h.r + 50) continue;
        h.dead = true;
        const mx = (P.x + x) / 2, my = (P.y - 30 + y) / 2, dir = G.sign(P.x - x) || -P.facing;
        G.audio.play('clash');
        F.text(mx, my - 60, 'CLASH', { color: '255,255,255', size: 30, life: 1 });
        F.stop(0.17); F.slow(0.35, 0.35); F.shake(15); F.punch(0.04); F.flash('255,255,255', 0.3, 0.25);
        F.cut(mx, my, 0.8, 520, 16, '255,255,255', GOLD, 0.34); F.cut(mx, my, -0.8, 520, 16, '255,255,255', GOLD, 0.34);
        F.burst(mx, my, { n: 34, color: GOLD, speed: [200, 900], life: [0.2, 0.6], kind: 'spark', size: [2, 4.5], grav: 600 });
        F.lines(mx, my, 16, '255,255,255', { r0: 20 });
        F.ring(mx, my, { r0: 10, r1: 240, life: 0.4, color: '255,255,255', width: 8 });
        F.light(mx, my, 320, '255,255,255', 0.3, 0.8);
        P.vx = dir * 300; P.gain(20); P.ult = Math.min(100, P.ult + 8);
        P.iframes = Math.max(P.iframes, 0.25); P.pdDone = true;
        if (!B.staggered && !B.ward) B.poise += 45;
        break;
      }
    }
  };

  // A perfect dodge arms the riposte.
  M.perfect = function () { G.player.riposteT = 1.5; };

  // The hero was hurt and is left on one health for the first time this fight.
  M.hurt = function () {
    const P = G.player, H0 = P.hero;
    if (P.hp !== 1 || P.lastLight || P.maxHp < 3) return;
    P.lastLight = true;
    P.inv = Math.max(P.inv, 2.4);
    P.ult = Math.min(100, (P.ult || 0) + 35);
    P.ember = Math.min(G.PLAYER.SEG * P.segs, P.ember + 50);
    G.audio.play('lastLight');
    G.ui.callout('LAST LIGHT', 'One more blow ends it. Make this count');
    F.slow(0.22, 0.9); F.flash(H0.hot, 0.35, 0.5); F.punch(0.035);
    F.ring(P.x, P.y - 24, { r0: 300, r1: 30, life: 0.6, color: H0.hot, width: 6 });
    F.lines(P.x, P.y - 24, 18, H0.hot, { r0: 34 });
    F.burst(P.x, P.y - 10, { n: 26, color: H0.col, speed: [20, 140], life: [0.8, 1.7], size: [2, 4], grav: -220, wob: 140, jitter: 26 });
  };

  // ------------------------------------------------------------------ every step
  M.update = function (dt) {
    const B = G.boss, P = G.player;
    if (P.riposteT > 0) P.riposteT -= dt;
    M.gloom = G.damp(M.gloom, B.ward ? 1 : 0, 4, dt);
    // a new stagger arms one Sunder
    if (B.staggered && !M.wasStag) M.sunder = true;
    if (!B.staggered) M.sunder = false;
    M.wasStag = !!B.staggered;
    if (G.state !== 'fight' || P.dead) return;
    // on the last point of health, the hero's light gutters
    if (P.hp === 1 && P.maxHp > 1 && !P.hidden && !P.vanish && Math.random() < dt * 14) {
      F.spawn({ x: P.x + rnd(-12, 12), y: P.y - rnd(2, 40), vx: rnd(-14, 14), vy: -rnd(50, 130), life: rnd(0.4, 0.8), size: rnd(1.6, 3), color: P.hero.hot, wob: 80, rot: rnd(0, 6) });
    }
    // armed riposte: gold sparks cling to the weapon hand
    if (P.riposteT > 0 && Math.random() < dt * 40) {
      F.spawn({ x: P.x + P.facing * rnd(4, 22), y: P.y - rnd(20, 44), vx: rnd(-30, 30), vy: -rnd(20, 90), life: rnd(0.2, 0.4), size: rnd(1.6, 2.8), color: GOLD });
    }
    // the last tenth of the boss's health
    if (B.active && !B.dying && !B.dead && B.phase === 3 && !B.invuln) {
      if (!M.push && B.hp < B.maxHp * 0.1) {
        M.push = true;
        G.ui.callout('ONE LAST PUSH', B.short + ' is almost spent');
        G.audio.play('bell'); F.flash(G.pal().hot, 0.25, 0.4); F.shake(10);
        F.ring(B.core.x, B.core.y, { r0: 30, r1: 520, life: 0.7, color: G.pal().hot, width: 8 });
      }
      if (M.push) {
        M.pushT -= dt;
        if (M.pushT <= 0) { M.pushT = 1.15; F.vig(P.hero.col, 0.2, 0.9); G.audio.play('pulse', { k: 0.6 }); }
        if (Math.random() < dt * 26) {
          F.spawn({ x: B.core.x + rnd(-30, 30), y: B.core.y + rnd(-40, 40), vx: rnd(-60, 60), vy: -rnd(60, 220), life: rnd(0.5, 1), size: rnd(2, 4.5), color: G.pal().hot, wob: 90, rot: rnd(0, 6) });
        }
        if (Math.random() < dt * 5) F.shards(B.core.x + rnd(-20, 20), B.core.y + rnd(-30, 30), 1, G.pal().boss, { speed: [80, 300], size: [2, 4.5] });
      }
    }
  };

  // ------------------------------------------------------------------ drawing
  // The arena dims while a ward is up, so the ring and the light being drawn in stand out.
  M.drawGloom = function (ctx) {
    if (M.gloom < 0.01) return;
    ctx.fillStyle = 'rgba(3,2,10,' + 0.5 * M.gloom + ')';
    ctx.fillRect(-80, -80, G.W + 160, G.H + 160);
  };

  // The ward: a shell round the boss, its strength as an arc, and the ring that closes on it.
  M.draw = function (ctx) {
    const w = G.boss.ward;
    if (!w) return;
    const pal = G.pal(), k = G.clamp(w.t / w.dur, 0, 1), left = w.dur - w.t;
    const late = left < 1.2 ? 0.5 + 0.5 * Math.sin(w.t * 40) : 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // shell
    ctx.fillStyle = G.rgba(pal.boss, 0.1 + 0.2 * w.flash);
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, G.TAU); ctx.fill();
    ctx.strokeStyle = G.rgba(pal.hot, 0.55 + 0.45 * w.flash); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, G.TAU); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = G.t * 0.9 + i * G.TAU / 6;
      ctx.strokeStyle = G.rgba(pal.boss, 0.4); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r, a, a + 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r - 7, -a, -a + 0.3); ctx.stroke();
    }
    // strength
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r + 13, 0, G.TAU); ctx.stroke();
    ctx.strokeStyle = G.rgba(GOLD, 0.95); ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r + 13, -Math.PI / 2, -Math.PI / 2 + G.TAU * Math.max(0.001, w.hp / w.max)); ctx.stroke();
    // the closing ring: when it reaches the ward, the blast goes off
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(-80, -400, G.W + 160, FLOOR + 400); ctx.clip();
    const R = G.lerp(w.r + 260, w.r + 22, k);
    ctx.strokeStyle = G.rgba(DANGER, 0.5 + 0.3 * k + 0.2 * late); ctx.lineWidth = 3 + 2 * k;
    ctx.setLineDash([16, 10]); ctx.lineDashOffset = -G.t * 70;
    ctx.beginPath(); ctx.arc(w.x, w.y, R, 0, G.TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = G.rgba(DANGER, 0.03 + 0.05 * k + 0.06 * late);
    ctx.beginPath(); ctx.arc(w.x, w.y, R, 0, G.TAU); ctx.fill();
    ctx.restore();
  };
})();
