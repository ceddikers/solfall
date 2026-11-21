// Solfall - Flow and Dawnbreak.
// Flow is a rank (C, B, A, S, SS) that climbs while the hero keeps landing hits and dodging, and
// drops when they are hit or stand off. Each rank adds a little damage and a few Sunshards.
// Dawnbreak is each hero's ultimate: a meter filled by damage dealt, spent on one great blow
// during which the boss and its attacks all but stand still.
'use strict';
(function () {
  const FLOOR = G.FLOOR, P = G.player, F = G.fx, rnd = G.rand;
  const { wait, tween } = G.seq;
  const GOLD = '255,214,140';
  const CAP = 175;

  const FL = G.flow = { v: 0, rank: 0, peak: 0, idle: 0, pop: 0, dark: 0, script: null, ready: false };
  FL.RANKS = [{ at: 0, name: '' }, { at: 18, name: 'C' }, { at: 42, name: 'B' }, { at: 72, name: 'A' }, { at: 108, name: 'S' }, { at: 150, name: 'SS' }];
  FL.NAMES = { vesper: 'THOUSAND STARS', aster: 'WORLDBREAKER', lune: 'MOONFALL' };
  FL.SLOW = 0.05; // how fast the boss and its attacks run while a Dawnbreak plays

  function rankOf(v) { let r = 0; for (let i = 1; i < FL.RANKS.length; i++) if (v >= FL.RANKS[i].at) r = i; return r; }
  // How far through the current rank the meter is, 0 to 1 (for the display).
  FL.frac = function () {
    const lo = FL.RANKS[FL.rank].at, hi = FL.rank + 1 < FL.RANKS.length ? FL.RANKS[FL.rank + 1].at : CAP;
    return G.clamp((FL.v - lo) / (hi - lo), 0, 1);
  };

  FL.reset = function () {
    FL.v = 0; FL.rank = 0; FL.peak = 0; FL.idle = 0; FL.pop = 0; FL.dark = 0; FL.script = null;
    P.ult = G.run.ult || 0; P.ulting = false; P.vanish = false; P.shroudT = 0;
    FL.ready = P.ult >= 100;
  };

  FL.add = function (n) {
    if (G.state !== 'fight' || P.dead) return;
    FL.v = Math.min(CAP, FL.v + n); FL.idle = 0;
    const r = rankOf(FL.v);
    if (r > FL.rank) {
      FL.rank = r; FL.peak = Math.max(FL.peak, r); FL.pop = 1;
      const H = P.hero, top = r >= 4;
      G.audio.play('rank', { n: r });
      F.text(P.x, P.y - 94, 'FLOW ' + FL.RANKS[r].name, { color: top ? GOLD : H.hot, size: 13 + r * 2, life: 0.9 });
      F.ring(P.x, P.y - 24, { r0: 14, r1: 60 + r * 16, life: 0.35, color: top ? GOLD : H.col, width: 3 + r });
      if (top) F.lines(P.x, P.y - 24, 10, GOLD, { r0: 24, speed: [400, 800] });
    }
  };
  FL.hurt = function () { FL.v *= 0.35; FL.rank = rankOf(FL.v); FL.idle = 0; };
  // Damage dealt charges Dawnbreak.
  FL.dealt = function (dmg) {
    if (P.ulting || P.dead) return;
    P.ult = Math.min(100, P.ult + dmg * 0.075 * (1 + 0.12 * G.up('tempo')) * (1 + 0.04 * FL.rank));
  };
  FL.perfect = function () {
    if (!P.ulting) P.ult = Math.min(100, P.ult + 6);
    if (G.relic('shroud')) P.shroudT = 3;
  };

  FL.update = function (dt) {
    const B = G.boss;
    if (P.shroudT > 0) P.shroudT -= dt;
    FL.pop = Math.max(0, FL.pop - dt * 2.5);
    FL.dark = G.damp(FL.dark, P.ulting ? 1 : 0, P.ulting ? 14 : 5, dt);
    // Flow only runs down while there is a boss to hit
    if (G.state === 'fight' && B.active && !B.invuln && !B.dying && !P.ulting) {
      FL.idle += dt;
      if (FL.idle > 2.2 && FL.v > 0) { FL.v = Math.max(0, FL.v - (5 + FL.rank * 2.5) * dt); FL.rank = rankOf(FL.v); }
    }
    if (!FL.ready && P.ult >= 100 && !P.dead) {
      FL.ready = true;
      G.audio.play('ultReady');
      F.ring(P.x, P.y - 24, { r0: 80, r1: 16, life: 0.4, color: GOLD, width: 4 });
      F.text(P.x, P.y - 110, 'DAWNBREAK READY', { color: GOLD, size: 15, life: 1.2 });
    }
    if (P.ult < 100) FL.ready = false;
    // from rank A up, light lifts off the hero
    if (FL.rank >= 3 && !P.dead && !P.hidden && !P.vanish && Math.random() < dt * (FL.rank - 2) * 10) {
      F.spawn({ x: P.x + rnd(-13, 13), y: P.y - rnd(4, 44), vx: rnd(-12, 12), vy: -rnd(40, 110), life: rnd(0.35, 0.7), size: rnd(1.6, 3), color: FL.rank >= 4 ? GOLD : P.hero.col, wob: 60, rot: rnd(0, 6) });
    }
  };

  // The darkness a Dawnbreak throws over the arena. Drawn behind the bosses and every warning.
  FL.drawVeil = function (ctx) {
    if (FL.dark < 0.01) return;
    ctx.fillStyle = 'rgba(3,2,10,' + 0.64 * FL.dark + ')';
    ctx.fillRect(G.cam.x - 80, -80, G.W + 160, G.H + 160);
  };

  // ------------------------------------------------------------------ Dawnbreak
  let aim = { x: 640, y: 300 }; // where the last strike landed, for when the boss can no longer be hit
  function main() {
    const B = G.boss;
    if (!B.active || B.dead || B.dying || B.invuln) return null;
    return B.targets().find((t) => t.kind === 'core' || t.kind === 'body') || null;
  }
  function strike(dmg, o) {
    const t = main();
    if (!t) return aim;
    aim = { x: t.cx, y: t.cy };
    G.boss.damage(Math.round(dmg * G.dmgMult()), t, Object.assign({ x: t.cx, y: t.cy, heavy: true }, o));
    return aim;
  }

  FL.tryUlt = function () {
    if (P.ulting || P.dead || (G.state !== 'fight' && G.state !== 'hub')) return false;
    const t = main();
    if (P.ult < 100 || !t) { G.audio.play('empty'); return false; }
    const H = P.hero;
    aim = { x: t.cx, y: t.cy };
    P.ult = 0; FL.ready = false;
    P.ulting = true; P.atk = null; P.dashT = 0; P.plunge = false; P.healT = 0; P.vx = 0; P.vy = 0; P.stun = 0;
    P.facing = G.sign(t.cx - P.x) || P.facing;
    G.audio.play('ult');
    G.ui.callout(FL.NAMES[H.id], 'Dawnbreak');
    F.stop(0.22); F.flash(H.hot, 0.32, 0.3); F.punch(0.045); F.shake(8);
    F.ring(P.x, P.y - 24, { r0: 20, r1: 320, life: 0.5, color: H.hot, width: 10 });
    F.lines(P.x, P.y - 24, 18, H.hot, { r0: 30 });
    F.light(P.x, P.y - 24, 360, H.col, 0.4, 0.8);
    FL.script = (H.id === 'aster' ? worldbreaker : H.id === 'lune' ? moonfall : thousandStars)(H);
    return true;
  };

  // Called in place of the hero's own update while a Dawnbreak plays.
  FL.ultStep = function (dt) {
    if (FL.script && !FL.script.next(dt).done) return;
    FL.script = null;
    P.ulting = false; P.vanish = false;
    P.vx = 0; P.vy = 0; P.plat = null; P.onGround = P.y >= FLOOR - 0.5;
    P.iframes = Math.max(P.iframes, 0.5); P.pdDone = true; // a moment to read the fight again
    FL.add(18);
  };

  // Vesper: she is gone, and the boss is cut from every side at once.
  function* thousandStars(H) {
    const x0 = P.x, y0 = P.y;
    yield* wait(0.2);
    P.vanish = true;
    F.burst(P.x, P.y - 24, { n: 14, color: H.col, speed: [120, 520], life: [0.15, 0.4], kind: 'spark', size: [2, 3.5] });
    for (let i = 0; i < 8; i++) {
      const c = strike(20, { dir: i % 2 ? -1 : 1 });
      const ang = -0.7 + i * 0.83 + rnd(-0.12, 0.12), cs = Math.cos(ang), sn = Math.sin(ang);
      const cx = c.x + rnd(-16, 16), cy = c.y + rnd(-16, 16);
      F.cut(cx, cy, ang, 600, 10, H.col, H.hot, 0.28);
      F.hit(cx, cy, ang, { thrust: true, col: H.col, hot: H.hot });
      P.ghosts.push({ x: cx - cs * 150, y: Math.min(FLOOR, cy - sn * 150 + 24), f: cs >= 0 ? 1 : -1, life: 0.26 });
      F.shake(3.5); G.audio.play('slash');
      yield* wait(0.085);
    }
    yield* wait(0.2);
    const c = strike(80, { finisher: true, lance: true, poise: H.poise });
    for (const a of [-0.62, Math.PI + 0.62]) F.cut(c.x, c.y, a, 960, 26, GOLD, H.hot, 0.42);
    F.hit(c.x, c.y, 0, { heavy: true, power: 1.3, col: GOLD, hot: H.hot });
    F.shatter(c.x, c.y, H.col, 18, { hot: H.hot, r: 420, r0: 50 });
    F.flash(H.hot, 0.45, 0.35); F.shake(17); F.stop(0.14); F.punch(0.05);
    G.audio.play('hitHeavy'); G.audio.play('slam');
    P.vanish = false; P.x = x0; P.y = y0;
    yield* wait(0.34);
  }

  // Aster: up, then down hard enough that the whole floor answers.
  function* worldbreaker(H) {
    P.squash = 0.3;
    for (let i = 0; i < 16; i++) {
      const a = rnd(0, G.TAU), r = rnd(70, 150);
      F.spawn({ x: P.x + Math.cos(a) * r, y: P.y - 100 + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.6, vy: -Math.sin(a) * r * 2.6 - 300, life: 0.36, size: 4, color: H.col });
    }
    yield* tween(P, { y: P.y - 180 }, 0.34, G.ease.outCubic);
    yield* wait(0.1);
    P.squash = 0.4;
    yield* tween(P, { y: FLOOR }, 0.09, G.ease.inQuad);
    P.squash = -0.42;
    const t = main();
    for (const o of G.boss.targets()) {
      if (o === t || (t && o.id === t.id)) continue;
      G.boss.damage(Math.round(110 * G.dmgMult()), o, { x: o.cx, y: o.cy, heavy: true, dir: G.sign(o.cx - P.x) });
    }
    const c = strike(250, { finisher: true, lance: true, poise: H.poise, dir: G.sign(aim.x - P.x) });
    for (const h of G.hazards.slashables()) h.slash();
    G.audio.play('slam'); G.audio.play('boom'); G.audio.play('hitHeavy');
    F.stop(0.16); F.shake(27); F.punch(0.06); F.flash(H.hot, 0.5, 0.4);
    F.thud(P.x, FLOOR, 2, { col: H.col });
    F.ring(P.x, FLOOR - 4, { r0: 30, r1: 520, life: 0.6, color: H.hot, width: 14 });
    F.ring(P.x, FLOOR - 4, { r0: 20, r1: 300, life: 0.45, color: GOLD, width: 8 });
    F.hit(c.x, c.y, -Math.PI / 2, { heavy: true, power: 1.4, col: GOLD, hot: H.hot });
    F.shatter(c.x, c.y, H.col, 18, { hot: H.hot, r: 420, r0: 50 });
    // the floor splits outward in pillars of light
    for (let d = 1; d <= 6; d++) {
      yield* wait(0.05);
      for (const side of [-1, 1]) {
        const px = P.x + side * d * 104;
        if (px < (G.bounds ? G.bounds.l : G.WALL_L) + 20 || px > (G.bounds ? G.bounds.r : G.WALL_R) - 20) continue;
        F.cut(px, FLOOR - 150 + d * 8, -Math.PI / 2, 340 - d * 22, 20 - d * 1.5, H.col, H.hot, 0.34);
        F.light(px, FLOOR - 90, 190, H.col, 0.3, 0.6);
        F.burst(px, FLOOR - 6, { n: 7, color: H.hot, speed: [240, 760], angle: -Math.PI / 2, spread: 0.7, life: [0.2, 0.5], kind: 'spark', size: [2, 4], grav: 900 });
        F.dust(px, FLOOR, 3, { speed: [30, 140], size: [7, 12], up: 70 });
        if (d % 2) F.crack(px, 1, H.col);
      }
      F.shake(7);
    }
    yield* wait(0.32);
  }

  // Lune: one arrow into the sky, and the sky sends back a dozen.
  function* moonfall(H) {
    P.squash = 0.2;
    yield* tween(P, { y: P.y - 64 }, 0.2, G.ease.outCubic);
    F.cut(P.x, P.y - 330, -Math.PI / 2, 620, 9, H.col, H.hot, 0.3);
    F.burst(P.x, P.y - 44, { n: 10, color: H.hot, speed: [200, 700], angle: -Math.PI / 2, spread: 0.6, life: [0.15, 0.4], kind: 'spark', size: [2, 3] });
    G.audio.play('arrowHeavy'); F.shake(5);
    yield* wait(0.2);
    for (let i = 0; i < 12; i++) {
      const c = strike(15, { dir: i % 2 ? -1 : 1 });
      const ang = Math.PI / 2 + rnd(-0.24, 0.24), hx = c.x + rnd(-30, 30), hy = c.y + rnd(-24, 24);
      F.cut(hx - Math.cos(ang) * 270, hy - Math.sin(ang) * 270, ang, 560, 6, H.col, H.hot, 0.22);
      F.hit(hx, hy, ang, { power: 0.9, col: H.col, hot: H.hot });
      F.shake(2.6); G.audio.play('arrow');
      yield* wait(0.07);
    }
    yield* wait(0.16);
    const c = strike(70, { finisher: true, lance: true, poise: H.poise });
    F.cut(c.x, c.y - 320, Math.PI / 2, 1000, 64, H.col, H.hot, 0.45);
    F.cut(c.x, c.y - 320, Math.PI / 2, 1000, 24, GOLD, H.hot, 0.5);
    F.hit(c.x, c.y, Math.PI / 2, { heavy: true, power: 1.4, col: GOLD, hot: H.hot });
    F.shatter(c.x, c.y, H.col, 18, { hot: H.hot, r: 440, r0: 50 });
    F.light(c.x, c.y, 420, H.hot, 0.4, 0.8);
    if (c.y > FLOOR - 160) F.thud(c.x, FLOOR, 1.4, { col: H.col });
    F.flash(H.hot, 0.45, 0.35); F.shake(17); F.stop(0.14); F.punch(0.05);
    G.audio.play('hitHeavy'); G.audio.play('slam');
    yield* wait(0.3);
  }
})();
