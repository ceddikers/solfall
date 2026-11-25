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
  FL.NAMES = { vesper: 'THOUSAND STARS', aster: 'WORLDBREAKER', lune: 'MOONFALL', eos: 'HORIZON' };
  FL.SLOW = 0.05; // how fast the boss and its attacks run while a Dawnbreak plays

  // Heroes land hits at different rates, so each hit is worth more for the slower ones: steady
  // attacking earns every hero about the same Flow per second.
  const HIT_K = { vesper: 1, aster: 1.4, lune: 1.25, eos: 1.15 };
  FL.hit = function (n) { FL.add(n * 0.3 * (HIT_K[P.hero.id] || 1)); };

  function rankOf(v) { let r = 0; for (let i = 1; i < FL.RANKS.length; i++) if (v >= FL.RANKS[i].at) r = i; return r; }
  // How far through the current rank the meter is, 0 to 1 (for the display).
  FL.frac = function () {
    const lo = FL.RANKS[FL.rank].at, hi = FL.rank + 1 < FL.RANKS.length ? FL.RANKS[FL.rank + 1].at : CAP;
    return G.clamp((FL.v - lo) / (hi - lo), 0, 1);
  };

  FL.reset = function () {
    FL.v = 0; FL.rank = 0; FL.peak = 0; FL.idle = 0; FL.pop = 0; FL.dark = 0; FL.script = null; FL.moon = null; FL.cutin = null; FL.split = null;
    P.ult = G.run.ult || 0; P.ulting = false; P.vanish = false; P.shroudT = 0;
    if (G.finish) G.finish.reset();
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
    FL.add(10); // on top of what the Starlight it earns already gives
    G.relics.shroud(); // (the Silent Shroud's surge: relics.js)
  };

  FL.update = function (dt) {
    const B = G.boss;
    if (P.shroudT > 0) P.shroudT -= dt;
    FL.pop = Math.max(0, FL.pop - dt * 2.5);
    // (Eos's counter dims the arena too, a little less, while its cut is on the way: see hush in player.js)
    const dk = P.ulting || P.finishing ? 1 : P.hush && !P.dead ? 0.66 : 0;
    FL.dark = G.damp(FL.dark, dk, dk ? 14 : 5, dt);
    // Flow only runs down while there is a boss to hit
    if (G.state === 'fight' && B.active && !B.invuln && !B.dying && !P.ulting) {
      // It always drains, faster the higher it stands and faster again when nothing has landed for a
      // while: steady attacking holds about rank B, and it takes perfect dodges to climb past A.
      FL.idle += dt;
      if (FL.v > 0) { FL.v = Math.max(0, FL.v - ((FL.idle > 2.2 ? 9 : 3) + FL.rank * 2.5) * dt); FL.rank = rankOf(FL.v); }
    }
    if (!FL.ready && P.ult >= 100 && !P.dead) {
      FL.ready = true;
      G.audio.play('ultReady');
      // (no words: the sound, the ring and the bar under Starlight say it)
      F.ring(P.x, P.y - 24, { r0: 80, r1: 16, life: 0.4, color: GOLD, width: 4 });
      F.lines(P.x, P.y - 24, 8, GOLD, { r0: 22, speed: [300, 600] });
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
    const m = FL.moon;
    if (!m || m.a <= 0.01) return;
    // Moonfall's moon: it rises full behind her, and wanes to a blade as its light goes into the bow
    const r = m.r, y = m.y + (1 - G.ease.outCubic(m.k)) * 150;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 * m.a;
    ctx.drawImage(F.glow(m.col), m.x - r * 2.3, y - r * 2.3, r * 4.6, r * 4.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = m.a;
    ctx.save();
    ctx.beginPath(); ctx.arc(m.x, y, r, 0, G.TAU); ctx.clip();
    ctx.fillStyle = 'rgb(246,238,255)'; ctx.fillRect(m.x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = G.rgba(m.col, 0.3);
    for (const [cx, cy, cr] of [[-0.35, -0.3, 0.2], [0.3, 0.1, 0.27], [-0.1, 0.45, 0.15], [0.5, -0.45, 0.11], [-0.6, 0.2, 0.1]]) {
      ctx.beginPath(); ctx.arc(m.x + cx * r, y + cy * r, cr * r, 0, G.TAU); ctx.fill();
    }
    if (m.wane > 0.001) {
      ctx.fillStyle = 'rgb(7,5,18)';
      ctx.beginPath(); ctx.arc(m.x + m.side * r * (2.05 - 1.72 * m.wane), y - r * 0.1 * m.wane, r * 1.02, 0, G.TAU); ctx.fill();
    }
    ctx.restore();
    if (m.crack > 0) {
      // the last cut goes through the moon as well
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(GOLD, m.crack); ctx.lineWidth = 3 + 5 * m.crack;
      ctx.beginPath(); ctx.moveTo(m.x - r * 1.3, y + r * 0.55); ctx.lineTo(m.x + r * 1.3, y - r * 0.55); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  };

  // The cut-in: for half a second a slanted band crosses the screen with the hero's eyes in it and
  // the name of what they are about to do. Drawn in screen space, over everything.
  FL.drawCutin = function (ctx) {
    const c = FL.cutin;
    if (!c) return;
    const now = performance.now(), t = (now - c.t0) / 1000, dur = 0.62;
    if (t >= dur) { FL.cutin = null; return; }
    const inK = G.ease.outCubic(Math.min(1, t / 0.12)), outK = Math.max(0, (t - (dur - 0.14)) / 0.14);
    const hgt = 150 * inK * (1 - outK), cy = 318, sl = 60, H = c.hero;
    if (hgt < 1) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-20, cy - hgt / 2 + sl * 0.5); ctx.lineTo(G.W + 20, cy - hgt / 2 - sl * 0.5);
    ctx.lineTo(G.W + 20, cy + hgt / 2 - sl * 0.5); ctx.lineTo(-20, cy + hgt / 2 + sl * 0.5); ctx.closePath();
    ctx.fillStyle = 'rgba(4,3,12,0.9)'; ctx.fill();
    ctx.strokeStyle = G.rgba(H.col, 0.9); ctx.lineWidth = 3; ctx.stroke();
    ctx.clip();
    // streaks rushing the other way
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const sy = cy - 90 + ((i * 53) % 180), sp = 1500 + ((i * 97) % 900), len = 120 + ((i * 41) % 260);
      const sx = G.W + 300 - ((t * sp + i * 173) % (G.W + 600));
      ctx.strokeStyle = G.rgba(i % 3 ? H.col : H.hot, 0.16 + 0.2 * ((i * 29) % 5) / 5); ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath(); ctx.moveTo(sx, sy - (sx - 640) * sl / G.W); ctx.lineTo(sx + len, sy - (sx + len - 640) * sl / G.W); ctx.stroke();
    }
    // the eyes: two narrowed slits of the hero's light, sliding a little as the band opens
    const ex = 330 + 40 * (1 - inK) + t * 30, ey = cy + 6;
    ctx.translate(ex, ey); ctx.rotate(-sl / G.W);
    for (const side of [-1, 1]) {
      const ox = side * 74;
      ctx.globalAlpha = 0.8; ctx.drawImage(F.glow(H.col), ox - 90, -70, 180, 140); ctx.globalAlpha = 1;
      ctx.fillStyle = G.rgba(H.hot, 1);
      ctx.beginPath();
      ctx.moveTo(ox - 46, 4 + side * 5); ctx.quadraticCurveTo(ox - 6, -22 - side * 3, ox + 46, -6 - side * 5);
      ctx.quadraticCurveTo(ox + 4, 12, ox - 46, 4 + side * 5); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(4,3,12,0.92)';
      ctx.beginPath(); ctx.ellipse(ox + 5, -5, 5, 12, 0.1, 0, G.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
    }
    ctx.setTransform(ctx.getTransform().a, 0, 0, ctx.getTransform().d, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    // the name, struck in from the right
    const tx = 800 + 500 * (1 - G.ease.outCubic(Math.min(1, t / 0.16)));
    ctx.translate(tx, cy - (tx - 640) * sl / G.W); ctx.rotate(-sl / G.W);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 700 58px Bahnschrift, "Segoe UI", sans-serif';
    ctx.fillStyle = G.rgba(H.col, 0.5); ctx.fillText(c.name, 5, 5);
    ctx.fillStyle = G.rgba(H.hot, 1); ctx.fillText(c.name, 0, 0);
    ctx.restore();
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
    // in the camp it needs the sparring post within reach
    if (P.ult < 100 || !t || (G.state === 'hub' && Math.abs(t.cx - P.x) > 420)) { G.audio.play('empty'); return false; }
    const H = P.hero;
    aim = { x: t.cx, y: t.cy };
    P.ult = 0; FL.ready = false;
    if (G.state === 'fight') G.feats.bump('ult');
    P.ulting = true; P.atk = null; P.cast = null; P.dashT = 0; P.plunge = false; P.healT = 0; P.flT = 0; P.vx = 0; P.vy = 0; P.stun = 0;
    P.hold = null; P.focus = 0; P.drawT = 0; P.recov = null; P.edge = 0;
    P.facing = G.sign(t.cx - P.x) || P.facing;
    G.audio.play('ult');
    FL.cutin = { t0: performance.now(), hero: H, name: FL.NAMES[H.id] };
    F.stop(0.3); F.flash(H.hot, 0.32, 0.3); F.punch(0.045); F.shake(8);
    F.ring(P.x, P.y - 24, { r0: 20, r1: 320, life: 0.5, color: H.hot, width: 10 });
    F.lines(P.x, P.y - 24, 18, H.hot, { r0: 30 });
    F.light(P.x, P.y - 24, 360, H.col, 0.4, 0.8);
    FL.script = (H.id === 'aster' ? worldbreaker : H.id === 'lune' ? moonfall : H.id === 'eos' ? horizon : thousandStars)(H);
    return true;
  };

  // Called in place of the hero's own update while a Dawnbreak plays.
  FL.ultStep = function (dt) {
    if (FL.script && !FL.script.next(dt).done) return;
    FL.script = null; FL.moon = null;
    P.ulting = false; P.vanish = false; P.cast = null; P.atk = null; P.recov = null;
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
    F.flash(H.hot, 0.45, 0.35); F.shake(17); F.stop(0.14); F.punch(0.05); F.impact(c.x, c.y, 0.08);
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
    F.stop(0.16); F.shake(27); F.punch(0.06); F.flash(H.hot, 0.5, 0.4); F.impact(P.x, FLOOR - 30, 0.09);
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


  // Eos: Horizon. She sets herself and every light in the arena runs to the mouth of her sheath.
  // Then she is on the far side of the boss with the blade out and a hair of light lying across
  // the whole arena behind her. Nothing happens until the blade is home. Then the picture itself
  // comes apart along the line, and first light comes up out of the cut.
  function* horizon(H) {
    const C = G.PLAYER, dir = G.sign(aim.x - P.x) || P.facing;
    const mouth = () => ({ x: P.x + P.facing * 9, y: P.y - 31 });
    P.facing = dir; P.hold = { t: 0 }; P.focus = 0;
    G.audio.play('charge', { dur: 0.55 });
    let e = 0, mark = 0;
    while (e < 0.6) {
      e += yield;
      const k = Math.min(1, e / 0.55), m = mouth();
      P.focus = k * C.FOCUS[2];
      const now = P.focusMark();
      if (now > mark) {
        mark = now;
        G.audio.play('focus', { n: now });
        F.glint(m.x, m.y, 20 + 10 * now, now >= 3 ? GOLD : H.hot, 0.26);
        F.ring(m.x, m.y, { r0: 40 + 30 * now, r1: 6, life: 0.24, color: now >= 3 ? GOLD : H.col, width: 2 + now });
      }
      for (let i = 0; i < 3; i++) {
        const a = rnd(0, G.TAU), r = rnd(120, 420);
        F.spawn({ x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r * 0.6, vx: -Math.cos(a) * r / 0.24, vy: -Math.sin(a) * r * 0.6 / 0.24, life: 0.24, size: rnd(2, 4), color: i ? H.col : H.hot });
      }
      F.light(m.x, m.y, 60 + 160 * k, H.col, 0.06, 0.5);
    }
    yield* wait(0.1);
    // the draw: along the line from her to it, and on past
    const x0 = P.x, y0 = P.y, sy = P.y - 30;
    let dx = aim.x - x0, dy = aim.y - sy;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    if (Math.abs(dy) < 0.2) { dx = dir; dy = 0; }
    const bl = (G.bounds ? G.bounds.l : G.WALL_L + 13) + 14, br = (G.bounds ? G.bounds.r : G.WALL_R - 13) - 14;
    let ex = x0 + dx * (d + 230), ey = sy + dy * (d + 230);
    if (ex < bl || ex > br) { const nx = G.clamp(ex, bl, br), q = (nx - x0) / ((ex - x0) || 1); ex = nx; ey = sy + (ey - sy) * q; }
    ey = G.clamp(ey, 90, FLOOR - 30);
    const ang = Math.atan2(dy, dx);
    P.hold = null; P.focus = 0;
    P.atk = { kind: 'draw', lvl: 3, heavy: true, t: 0, a0: 0, a1: 0.08, dur: 9, dx, dy, dir, hit: new Set(), swung: true, hold: 0 };
    P.onGround = false;
    G.audio.play('draw'); F.kick(dx * 12, dy * 12); F.flash(H.hot, 0.2, 0.18);
    F.dust(x0, y0, 7, { dir: -dir, speed: [80, 340], size: [6, 12], up: 30 });
    e = 0;
    while (e < 0.08) {
      e += yield;
      const k = Math.min(1, e / 0.08);
      P.x = G.lerp(x0, ex, k); P.y = G.lerp(y0, ey + 30, k); P.atk.t = Math.min(0.08, e);
      P.ghosts.push({ x: P.x, y: P.y, f: dir, life: 0.34, atk: { kind: 'draw', t: P.atk.t, a0: 0, a1: 0.08, dx, dy, lvl: 3, heavy: true } });
    }
    // the hair of light she leaves behind, right across the arena
    F.cut((x0 + ex) / 2, (sy + ey) / 2, ang, 2800, 2.2, GOLD, H.hot, 1.3);
    F.cut((x0 + ex) / 2, (sy + ey) / 2, ang, G.dist(x0, sy, ex, ey) + 160, 16, H.col, H.hot, 0.16);
    F.stop(0.07);
    // she holds where the cut left her, and the blade goes home, slowly
    P.atk = null; P.onGround = P.y >= FLOOR - 0.5;
    const r = P.recov = { kind: 'noto', t: 0, dur: 0.96, at: 0.85, ang: Math.atan2(dy, Math.abs(dx)), lvl: 3 };
    while (r.t < r.dur * r.at) r.t += yield;
    G.audio.play('sheath');
    const m = mouth();
    F.glint(m.x, m.y, 28, H.hot, 0.22);
    yield* wait(0.07);
    // and the cut arrives
    const t = main();
    for (const o of G.boss.targets()) {
      if (o === t || (t && o.id === t.id)) continue;
      G.boss.damage(Math.round(110 * G.dmgMult()), o, { x: o.cx, y: o.cy, heavy: true, dir });
    }
    const c = strike(250, { finisher: true, lance: true, poise: H.poise, dir });
    for (const h of G.hazards.slashables()) h.slash();
    FL.split = { t0: performance.now(), x: c.x - G.cam.x, y: c.y - G.cam.y, ang, dur: 0.62 };
    F.cut(c.x, c.y, ang, 2800, 34, H.col, H.hot, 0.5);
    F.cut(c.x, c.y, ang, 2800, 11, GOLD, H.hot, 0.7);
    F.hit(c.x, c.y, ang, { heavy: true, power: 1.2, col: GOLD, hot: H.hot });
    F.shatter(c.x, c.y, H.col, 24, { hot: H.hot, r: 480, r0: 50 });
    F.light(c.x, c.y, 300, H.hot, 0.35, 0.5);
    F.impact(c.x, c.y, 0.09); F.flash(H.hot, 0.3, 0.4); F.shake(24); F.stop(0.18); F.punch(0.06);
    G.audio.play('hitHeavy'); G.audio.play('slam'); G.audio.play('shatter');
    // first light: it comes up out of the cut, all along it
    for (let i = 0; i < 11; i++) {
      const q = (i + 0.5) / 11 - 0.5, px = c.x + Math.cos(ang) * q * 1500, py = c.y + Math.sin(ang) * q * 1500;
      if (px < G.cam.x - 40 || px > G.cam.x + G.W + 40 || py > FLOOR) continue;
      F.light(px, py, 230, H.col, 0.5, 0.5);
      F.burst(px, py, { n: 5, color: i % 2 ? H.col : H.hot, speed: [30, 220], angle: -Math.PI / 2, spread: 1.4, life: [0.7, 1.5], size: [1.6, 3.4], grav: -60, wob: 110, drag: 1.3, jitter: 40 });
    }
    while (r.t < r.dur) r.t += yield;
    yield* wait(0.3);
    P.recov = null;
  }

  // Horizon cuts the picture in two: for half a second the halves either side of the line slide
  // along it, and then settle back. Done to the finished frame, in the canvas's own pixels.
  let splitCv = null;
  FL.drawSplit = function (ctx, canvas, k) {
    const s = FL.split;
    if (!s) return;
    const t = (performance.now() - s.t0) / 1000;
    if (t >= s.dur) { FL.split = null; return; }
    const u = t / s.dur, W = canvas.width, Hh = canvas.height;
    // apart in an instant, held, then eased back together
    const off = 20 * (s.amp || 1) * k * (u < 0.07 ? u / 0.07 : u < 0.45 ? 1 : Math.pow(1 - (u - 0.45) / 0.55, 2));
    if (!splitCv || splitCv.width !== W || splitCv.height !== Hh) { splitCv = document.createElement('canvas'); splitCv.width = W; splitCv.height = Hh; }
    const sc = splitCv.getContext('2d');
    sc.globalCompositeOperation = 'copy'; sc.drawImage(canvas, 0, 0);
    const px = s.x * k, py = s.y * k, cs = Math.cos(s.ang), sn = Math.sin(s.ang), L = W + Hh;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(px - cs * L, py - sn * L); ctx.lineTo(px + cs * L, py + sn * L);
      ctx.lineTo(px + cs * L - sn * L * side, py + sn * L + cs * L * side); ctx.lineTo(px - cs * L - sn * L * side, py - sn * L + cs * L * side);
      ctx.closePath(); ctx.clip();
      ctx.drawImage(splitCv, cs * off * side, sn * off * side);
      ctx.restore();
    }
    // the seam
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,244,236,' + (0.9 * (1 - u)) + ')'; ctx.lineWidth = Math.max(1, 2.5 * k * (1 - u));
    ctx.beginPath(); ctx.moveTo(px - cs * L, py - sn * L); ctx.lineTo(px + cs * L, py + sn * L); ctx.stroke();
    ctx.restore();
  };

  // Lune: Moonfall. She springs up and a full moon rises behind her. She draws, and the moon's light
  // runs down into the arrow until only a blade of it is left; the arrow goes through the boss, the
  // moon answers with a rain of its own, and she lands with her back turned. Then the cut arrives.
  function* moonfall(H) {
    const x0 = P.x, dir = G.sign(aim.x - P.x) || P.facing;
    const m = FL.moon = { x: G.clamp(P.x - dir * 30, 230, 1050), y: 236, r: 172, k: 0, a: 0, wane: 0, crack: 0, side: dir, col: H.col };
    const topY = Math.min(P.y - 90, 318);
    const aimAt = () => { const dx = aim.x - P.x, dy = aim.y - (P.y - 36), d = Math.hypot(dx, dy) || 1; return { dx: dx / d, dy: dy / d, d }; };
    // up, turning over, with the moon coming up behind
    P.squash = 0.3; P.facing = dir;
    G.audio.play('jump2');
    F.dust(P.x, P.y, 6, { speed: [40, 200], size: [5, 10], up: 60 });
    const y0 = P.y;
    let e = 0;
    while (e < 0.34) {
      e += yield;
      const k = Math.min(1, e / 0.34);
      P.y = G.lerp(y0, topY, G.ease.outCubic(k)); m.k = k; m.a = Math.min(1, k * 1.6);
      if (Math.random() < 0.5) P.ghosts.push({ x: P.x, y: P.y, f: P.facing, life: 0.22 });
    }
    // the draw: light falls out of the moon into the bow
    let d = aimAt();
    P.cast = { kind: 'draw', t: 0, wind: 0, dur: 9, thrown: true, dx: d.dx, dy: d.dy, pull: 0 };
    G.audio.play('charge', { dur: 0.5 });
    e = 0;
    while (e < 0.5) {
      e += yield;
      const k = Math.min(1, e / 0.5);
      P.cast.pull = G.ease.outCubic(k); m.wane = G.ease.inOutCubic(k);
      const hx = P.x + d.dx * 20, hy = P.y - 36 + d.dy * 20;
      for (let i = 0; i < 2; i++) {
        const a = rnd(0, G.TAU), sx = m.x + Math.cos(a) * rnd(0, m.r), sy = m.y + Math.sin(a) * rnd(0, m.r);
        F.spawn({ x: sx, y: sy, vx: (hx - sx) / 0.2, vy: (hy - sy) / 0.2, life: 0.2, size: rnd(2, 4), color: i ? H.hot : H.col });
      }
      F.light(hx, hy, 60 + 140 * k, H.col, 0.06, 0.5);
    }
    F.glint(P.x + d.dx * 26, P.y - 36 + d.dy * 26, 64, H.hot, 0.3);
    G.audio.play('segment');
    yield* wait(0.1);
    // loose
    d = aimAt();
    let c = strike(26, { dir, heavy: true });
    const ang = Math.atan2(d.dy, d.dx), sx = P.x + d.dx * 24, sy = P.y - 36 + d.dy * 24;
    F.cut((sx + c.x) / 2 + d.dx * 200, (sy + c.y) / 2 + d.dy * 200, ang, d.d + 520, 30, H.col, H.hot, 0.34);
    F.cut((sx + c.x) / 2 + d.dx * 200, (sy + c.y) / 2 + d.dy * 200, ang, d.d + 520, 9, GOLD, H.hot, 0.44);
    F.hit(c.x, c.y, ang, { heavy: true, power: 1.2, col: H.col, hot: H.hot });
    F.lines(sx, sy, 14, H.hot, { r0: 16, speed: [600, 1200] });
    F.ring(sx, sy, { r0: 6, r1: 120, life: 0.3, color: H.hot, width: 7 });
    F.impact(c.x, c.y, 0.07); F.stop(0.1); F.shake(12); F.kick(-d.dx * 9, -d.dy * 9);
    G.audio.play('arrowHeavy'); G.audio.play('flare');
    P.cast.pull = 0; P.cast.twang = 1;
    yield* tween(P, { x: G.clamp(P.x - dir * 34, G.WALL_L + 20, G.WALL_R - 20), y: P.y - 16 }, 0.12, G.ease.outCubic);
    // the moon's answer: what is left of it comes down as beams
    for (let i = 0; i < 14; i++) {
      c = strike(11, { dir: i % 2 ? -1 : 1 });
      const a = rnd(0.5, 2.6) * (m.side > 0 ? 1 : -1) + Math.PI / 2 + (m.side > 0 ? 0.4 : -0.4);
      const bx = m.x - m.side * m.r * 0.72 + Math.cos(a) * m.r * 0.25, by = m.y + Math.sin(a) * m.r * 0.9;
      const hx = c.x + rnd(-26, 26), hy = c.y + rnd(-26, 26), ba = Math.atan2(hy - by, hx - bx), bl = Math.hypot(hx - bx, hy - by);
      F.cut((bx + hx) / 2, (by + hy) / 2, ba, bl + 60, 7, H.col, H.hot, 0.2);
      F.hit(hx, hy, ba, { power: 0.9, col: H.col, hot: H.hot });
      F.glint(bx, by, 22, H.hot, 0.16);
      if (hy > FLOOR - 120 && i % 3 === 0) F.dust(hx, FLOOR, 2, { speed: [30, 140], size: [5, 9], up: 50 });
      F.shake(3); G.audio.play('arrow');
      P.cast.twang = Math.max(0, P.cast.twang - 0.1);
      yield* wait(0.05);
    }
    // down, with her back to it
    P.cast = null; P.squash = 0.25;
    yield* tween(P, { y: FLOOR }, 0.12, G.ease.inQuad);
    P.squash = -0.3; P.facing = -dir;
    F.land(P.x, FLOOR, 1); G.audio.play('land');
    const cx = aim.x, cy = aim.y;
    F.cut(cx, cy, -0.42 * dir, 520, 2.5, GOLD, H.hot, 0.5); // the line of the cut, before the cut
    G.audio.play('glint');
    yield* wait(0.42);
    // the cut arrives
    c = strike(70, { finisher: true, lance: true, poise: H.poise, dir });
    m.crack = 1;
    F.cut(c.x, c.y, -0.42 * dir, 1300, 46, H.col, H.hot, 0.5);
    F.cut(c.x, c.y, -0.42 * dir, 1300, 16, GOLD, H.hot, 0.6);
    F.hit(c.x, c.y, -0.42 * dir, { heavy: true, power: 1.4, col: GOLD, hot: H.hot });
    F.shatter(c.x, c.y, H.col, 22, { hot: H.hot, r: 460, r0: 50 });
    F.shatter(m.x, m.y, '246,238,255', 26, { hot: H.hot, r: 420, r0: 80, jitter: m.r * 0.6 });
    F.light(c.x, c.y, 440, H.hot, 0.4, 0.8);
    F.impact(c.x, c.y, 0.09); F.flash(H.hot, 0.4, 0.35); F.shake(19); F.stop(0.16); F.punch(0.055);
    G.audio.play('hitHeavy'); G.audio.play('slam'); G.audio.play('shatter');
    e = 0;
    while (e < 0.36) { e += yield; m.a = Math.max(0, 1 - e / 0.3); m.crack = m.a; }
    P.x = G.clamp(P.x, G.WALL_L + 20, G.WALL_R - 20);
    void x0;
  }
})();
