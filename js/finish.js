// Solfall - the finishing blow.
// The last hit of a fight belongs to the hero. The arena goes dark, the boss hangs where it was
// struck, and the hero ends it in their own way; the boss's own death (shaking apart, the burst)
// waits until they are done. A Dawnbreak that kills is its own ending, so it gets none.
//   Vesper - three passes through it too fast to see, three lines left hanging, then a star.
//   Aster  - up off the top of the screen, and down through it into the floor.
//   Lune   - back to the far wall, one long draw, one arrow, and it comes apart around the arrow.
//   Eos    - he does not seem to move. He is simply on the other side, and then the blade is home.
'use strict';
(function () {
  const FLOOR = G.FLOOR, P = G.player, F = G.fx, rnd = G.rand;
  const { wait, tween } = G.seq;
  const GOLD = '255,214,140';

  const FN = G.finish = { script: null, busy: false, played: false };
  const left = () => (G.bounds ? G.bounds.l : G.WALL_L + 13) + 18;
  const right = () => (G.bounds ? G.bounds.r : G.WALL_R - 13) - 18;

  FN.reset = function () { FN.script = null; FN.busy = false; FN.played = false; FN.pk = 0; FN.inK = 0; P.finishing = false; };

  // A toppled boss waits. Press the heal button (E) within reach of it and the hero finishes it;
  // a key cap over it shows the button, bright when you are close enough.
  FN.REACH = 300;
  FN.near = function () {
    const c = G.boss.core;
    return !!c && Math.abs(P.x - c.x) < FN.REACH && Math.abs(P.y - 30 - c.y) < 340;
  };
  FN.update = function (dt) {
    const B = G.boss, open = G.state === 'fight' && B.toppled && B.down && !P.dead && !P.ulting && !P.finishing;
    const near = open && FN.near();
    if (near && G.input.pressed.heal) { B.finishOff(true); return; }
    FN.pk = G.damp(FN.pk || 0, open ? 1 : 0, open ? 6 : 14, dt);
    FN.inK = G.damp(FN.inK || 0, near ? 1 : 0, 10, dt);
  };
  FN.drawPrompt = function (ctx) {
    const B = G.boss;
    if (!(FN.pk > 0.01) || !B.core) return;
    const H = P.hero, c = B.core;
    const top = B.kit && B.body ? B.body.y - B.h - 30 : c.y - (c.r || 40) - 40;
    const x = c.x, y = top - 26 - 6 * Math.sin(G.t * 3), k = FN.inK, a = FN.pk * (0.35 + 0.65 * k);
    const label = G.input.device === 'gamepad' ? 'LB' : G.input.label('heal');
    const s = 1 + 0.06 * k * Math.sin(G.t * 7), w = Math.max(40, 18 + 13 * label.length) * s, h = 40 * s;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(F.glow(H.col), x - 60, y - 60, 120, 120);
    ctx.globalCompositeOperation = 'source-over';
    G.roundRect(ctx, x - w / 2, y - h / 2, w, h, 8);
    ctx.fillStyle = 'rgba(8,6,16,0.88)'; ctx.fill();
    ctx.strokeStyle = G.rgba(k > 0.5 ? H.hot : H.col, 0.95); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = G.rgba(H.hot, 1);
    ctx.font = '700 ' + Math.round(21 * s) + 'px Bahnschrift, "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
    // a small point under the key, down at the boss
    ctx.beginPath(); ctx.moveTo(x - 7, y + h / 2 + 5); ctx.lineTo(x + 7, y + h / 2 + 5); ctx.lineTo(x, y + h / 2 + 13); ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Called as the boss's health reaches nothing. True when a finishing blow has begun.
  FN.start = function () {
    FN.played = false;
    const B = G.boss;
    if (G.state !== 'fight' || P.ulting || P.dead || P.hidden || !B.core) return false;
    P.finishing = true; FN.busy = true; FN.played = true;
    P.atk = null; P.cast = null; P.recov = null; P.dashT = 0; P.plunge = false; P.healT = 0; P.flT = 0;
    P.vx = 0; P.vy = 0; P.stun = 0; P.hold = null; P.focus = 0; P.drawT = 0; P.edge = 0; P.hush = 0;
    P.iframes = 9; P.plat = null;
    const H = P.hero, c = { x: B.core.x, y: B.core.y, r: B.core.r || 40 };
    P.facing = G.sign(c.x - P.x) || P.facing;
    F.stop(0.2); F.punch(0.035);
    G.ui.letterbox(true);
    FN.script = ({ aster: anvil, lune: lastArrow, eos: stillWater }[H.id] || lastStar)(H, c);
    return true;
  };

  // Called in place of the hero's own update while it plays.
  FN.step = function (dt) {
    if (FN.script && !FN.script.next(dt).done) return;
    FN.script = null; FN.busy = false; P.finishing = false;
    P.atk = null; P.cast = null; P.recov = null; P.vanish = false; P.hold = null; P.focus = 0;
    P.vx = 0; P.vy = 0; P.y = Math.min(P.y, FLOOR); P.onGround = P.y >= FLOOR - 0.5;
    G.ui.letterbox(false);
  };

  // the arena's warnings and anything still in flight are cut down with the last blow
  function clearAir() { for (const h of G.hazards.slashables()) h.slash(); }

  function* toFloor(t) {
    if (P.y < FLOOR - 1) { yield* tween(P, { y: FLOOR }, t || 0.14, G.ease.inQuad); F.land(P.x, FLOOR, 0.6); G.audio.play('land'); }
    P.y = FLOOR; P.onGround = true;
  }

  // ------------------------------------------------------------------ Vesper: Last Star
  function* lastStar(H, c) {
    const dir = P.facing, R = Math.max(170, c.r + 130);
    const swing = (f) => ({ kind: 'side', idx: 2, heavy: true, t: 0.12, a0: 0.05, a1: 0.12, dur: 0.3, dir: f, hit: new Set(), swung: true });
    // a breath: the light runs down the blade
    P.atk = Object.assign(swing(dir), { t: 0.02 });
    F.glint(P.x + dir * 38, P.y - 34, 26, H.hot, 0.26); G.audio.play('glint');
    yield* wait(0.28);
    // three passes, each from wherever the last one left her
    const angs = [dir > 0 ? -0.55 : Math.PI + 0.55, dir > 0 ? Math.PI + 0.55 : -0.55, dir > 0 ? 0 : Math.PI];
    for (let i = 0; i < 3; i++) {
      const a = angs[i], cs = Math.cos(a), sn = Math.sin(a), f = cs >= 0 ? 1 : -1;
      const x0 = G.clamp(c.x - cs * R, left(), right()), y0 = G.clamp(c.y - sn * R + 30, 70, FLOOR);
      const x1 = G.clamp(c.x + cs * R, left(), right()), y1 = G.clamp(c.y + sn * R + 30, 70, FLOOR);
      P.vanish = false; P.facing = f; P.atk = swing(f); P.onGround = false;
      let e = 0;
      while (e < 0.05) {
        e += yield;
        const k = Math.min(1, e / 0.05);
        P.x = G.lerp(x0, x1, k); P.y = G.lerp(y0, y1, k);
        P.ghosts.push({ x: P.x, y: P.y, f, life: 0.3, atk: swing(f) });
      }
      F.cut(c.x, c.y, a, 2 * R + 120, 2.2, GOLD, H.hot, 1.25 - i * 0.12); // the line that hangs
      F.hit(c.x, c.y, a, { col: H.col, hot: H.hot });
      F.shake(4); F.stop(0.03); G.audio.play('slash', { pitch: 1 + i * 0.08 });
      if (i < 2) { P.vanish = true; yield* wait(0.06); }
    }
    // down on the far side, her back to it, the follow-through held
    P.vanish = false; P.facing = dir > 0 ? 1 : -1;
    yield* toFloor(0.12);
    yield* wait(0.36);
    // the flick, and the lines answer one after another
    P.atk = null;
    const r = P.recov = { kind: 'fin', t: 0, dur: 0.4, at: 0.2 };
    G.audio.play('glint');
    F.glint(P.x + P.facing * 50, P.y - 22, 22, H.hot, 0.2);
    for (let i = 0; i < 3; i++) {
      const a = angs[i];
      F.cut(c.x, c.y, a, 2 * R + 320, 22, H.col, H.hot, 0.38);
      F.cut(c.x, c.y, a, 2 * R + 320, 7, GOLD, H.hot, 0.46);
      F.shake(6); G.audio.play('hit', { pitch: 0.9 + i * 0.1 });
      let e = 0;
      while (e < 0.06) { const dt = yield; e += dt; r.t = Math.min(r.dur, r.t + dt); }
    }
    clearAir();
    F.hit(c.x, c.y, 0, { heavy: true, power: 1.1, col: GOLD, hot: H.hot });
    F.shatter(c.x, c.y, H.col, 26, { hot: H.hot, r: 480, r0: 50 });
    F.lines(c.x, c.y, 26, H.hot, { r0: 60, speed: [900, 1600] });
    F.ring(c.x, c.y, { r0: 30, r1: 420, life: 0.5, color: GOLD, width: 9 });
    F.light(c.x, c.y, 360, H.col, 0.26, 0.6);
    F.ripple(c.x, c.y, 320, 0.42, 1.3);
    F.impact(c.x, c.y, 0.09); F.shake(22); F.stop(0.14); F.punch(0.05);
    G.audio.play('finish'); G.audio.play('shatter');
    while (r.t < r.dur) r.t += yield;
    yield* wait(0.2);
  }

  // ------------------------------------------------------------------ Aster: the Anvil
  function* anvil(H, c) {
    const dir = P.facing;
    const smash = (t) => ({ kind: 'side', idx: 2, heavy: true, t, a0: 0.2, a1: 0.3, dur: 0.6, dir, hit: new Set(), swung: true, charge: 1, hold: 0 });
    // down into the legs
    yield* toFloor(0.12);
    P.squash = -0.34;
    F.dust(P.x, FLOOR, 5, { speed: [40, 160], size: [6, 11], up: 40 });
    G.audio.play('charge', { dur: 0.3 });
    yield* wait(0.2);
    // up, off the top of the screen, drifting over it
    P.squash = 0.35; P.onGround = false; P.atk = smash(0.05);
    G.audio.play('jump2');
    F.dust(P.x, FLOOR, 8, { speed: [80, 300], size: [7, 13], up: 60 });
    F.ring(P.x, FLOOR - 4, { r0: 10, r1: 160, life: 0.3, color: H.col, width: 5 });
    const x0 = P.x, y0 = P.y;
    let e = 0;
    while (e < 0.3) {
      e += yield;
      const k = G.ease.outCubic(Math.min(1, e / 0.3));
      P.x = G.lerp(x0, c.x, k); P.y = G.lerp(y0, -150, k);
      if (Math.random() < 0.6) P.ghosts.push({ x: P.x, y: P.y, f: dir, life: 0.2 });
    }
    // nothing: just a star over it, growing
    P.vanish = true; P.x = c.x;
    e = 0;
    while (e < 0.34) {
      e += yield;
      F.light(c.x, 30, 40 + 200 * e, H.hot, 0.05, 0.4);
      if (Math.random() < 0.4) F.spawn({ x: c.x + rnd(-30, 30), y: rnd(0, 60), vx: 0, vy: rnd(200, 500), life: 0.3, size: rnd(1.6, 3), color: H.hot });
    }
    F.glint(c.x, 40, 40, H.hot, 0.2); G.audio.play('glint');
    // and down, through it, into the floor
    P.vanish = false; P.atk = smash(0.22); P.squash = 0.45;
    F.cut(c.x, (c.y - 40) / 2, Math.PI / 2, c.y + 160, 18, H.col, H.hot, 0.3);
    yield* tween(P, { y: FLOOR }, 0.11, G.ease.inQuad);
    P.atk = smash(0.3); P.squash = -0.45; P.onGround = true;
    clearAir();
    F.hit(c.x, c.y, Math.PI / 2, { heavy: true, power: 1.1, col: GOLD, hot: H.hot });
    F.shatter(c.x, c.y, H.col, 22, { hot: H.hot, r: 440, r0: 50 });
    F.cut(c.x, c.y, Math.PI / 2, 900, 38, H.col, H.hot, 0.4);
    F.thud(c.x, FLOOR, 2.4, { col: H.col });
    F.ring(c.x, FLOOR - 4, { r0: 30, r1: 640, life: 0.7, color: H.col, width: 12 });
    F.ring(c.x, FLOOR - 4, { r0: 20, r1: 360, life: 0.5, color: GOLD, width: 8 });
    F.ripple(c.x, FLOOR - 40, 380, 0.45, 1.4);
    F.impact(c.x, FLOOR - 40, 0.1); F.shake(30); F.stop(0.18); F.punch(0.06);
    G.audio.play('slam'); G.audio.play('boom'); G.audio.play('finish');
    // the floor splits from wall to wall
    P.atk = null;
    const r = P.recov = { kind: 'smash', t: 0, dur: 0.5, at: 0.3 };
    for (let d = 1; d <= 9; d++) {
      e = 0;
      while (e < 0.045) { const dt = yield; e += dt; r.t = Math.min(r.dur * 0.6, r.t + dt * 0.5); }
      for (const side of [-1, 1]) {
        const px = c.x + side * d * 118;
        if (px < left() || px > right()) continue;
        F.crack(px, 1.2, H.col);
        F.cut(px, FLOOR - 120 + d * 6, -Math.PI / 2, 300 - d * 18, 16 - d, H.col, H.hot, 0.32);
        F.burst(px, FLOOR - 6, { n: 6, color: '22,18,32', speed: [160, 520], angle: -Math.PI / 2, spread: 0.8, life: [0.5, 0.9], size: [3, 7], kind: 'chunk', grav: 1400 });
        F.dust(px, FLOOR, 3, { speed: [30, 140], size: [7, 12], up: 70 });
      }
      F.shake(7);
    }
    yield* wait(0.2);
    // the maul is wrenched out of the ground
    while (r.t < r.dur) r.t += yield;
    yield* wait(0.15);
  }

  // ------------------------------------------------------------------ Lune: the Last Arrow
  function* lastArrow(H, c) {
    const dir = P.facing;
    // back to the far side, landing low
    const tx = G.clamp(c.x - dir * 600, left() + 20, right() - 20);
    P.onGround = false; P.squash = 0.2;
    G.audio.play('jump2');
    const x0 = P.x, y0 = P.y, peak = Math.min(y0, FLOOR) - 90;
    let e = 0;
    while (e < 0.26) {
      e += yield;
      const k = Math.min(1, e / 0.26), q = G.ease.outCubic(k);
      P.x = G.lerp(x0, tx, q); P.y = G.lerp(y0, FLOOR, k * k) + Math.sin(k * Math.PI) * (peak - FLOOR) * 0.6;
      if (Math.random() < 0.5) P.ghosts.push({ x: P.x, y: P.y, f: dir, life: 0.2 });
    }
    P.x = tx; P.y = FLOOR; P.onGround = true; P.facing = dir; P.squash = -0.26;
    F.land(P.x, FLOOR, 0.8); G.audio.play('land');
    // one long draw: the light of the whole arena runs into the arrow
    const aimAt = () => { const dx = c.x - P.x, dy = c.y - (P.y - 36), d = Math.hypot(dx, dy) || 1; return { dx: dx / d, dy: dy / d, d }; };
    const d = aimAt();
    P.cast = { kind: 'draw', t: 0, wind: 0, dur: 9, thrown: true, dx: d.dx, dy: d.dy, pull: 0 };
    G.audio.play('charge', { dur: 0.6 });
    const tip = () => ({ x: P.x + d.dx * 26, y: P.y - 36 + d.dy * 26 });
    e = 0;
    while (e < 0.6) {
      e += yield;
      const k = Math.min(1, e / 0.6), h = tip();
      P.cast.pull = G.ease.outCubic(k);
      for (let i = 0; i < 2; i++) {
        const sx = rnd(G.cam.x, G.cam.x + G.W), sy = rnd(60, FLOOR);
        F.spawn({ x: sx, y: sy, vx: (h.x - sx) / 0.24, vy: (h.y - sy) / 0.24, life: 0.24, size: rnd(1.6, 3), color: i ? H.hot : H.col });
      }
      F.light(h.x, h.y, 40 + 150 * k, H.col, 0.06, 0.5);
    }
    const h = tip();
    F.glint(h.x, h.y, 50, H.hot, 0.3); G.audio.play('segment');
    yield* wait(0.18);
    // loose: one point of light, and the line it leaves
    G.audio.play('arrowHeavy');
    P.cast.pull = 0; P.cast.twang = 1;
    F.kick(-d.dx * 8, -d.dy * 8);
    const ang = Math.atan2(d.dy, d.dx), fly = 0.14;
    e = 0;
    let px = h.x, py = h.y;
    while (e < fly) {
      e += yield;
      const k = Math.min(1, e / fly), nx = G.lerp(h.x, c.x, k), ny = G.lerp(h.y, c.y, k);
      F.cut((px + nx) / 2, (py + ny) / 2, ang, Math.hypot(nx - px, ny - py) + 30, 3, GOLD, H.hot, 0.9);
      F.light(nx, ny, 90, H.hot, 0.1, 0.3);
      px = nx; py = ny;
      P.cast.twang = Math.max(0, P.cast.twang - 0.08);
    }
    F.cut(c.x + d.dx * 700, c.y + d.dy * 700, ang, 1400, 2.4, GOLD, H.hot, 0.9);
    F.hit(c.x, c.y, ang, { heavy: true, col: H.col, hot: H.hot });
    F.stop(0.1); F.shake(10); G.audio.play('hitHeavy');
    // pinned: the point holds, and then everything around it gives way
    e = 0;
    while (e < 0.38) {
      e += yield;
      F.light(c.x, c.y, 60 + 120 * e, H.hot, 0.05, 0.4);
      if (P.cast) P.cast.twang = Math.max(0, P.cast.twang - 0.05);
    }
    P.cast = null;
    const r = P.recov = { kind: 'spin', t: 0, dur: 0.4, at: 0.05, dx: d.dx, dy: d.dy };
    G.audio.play('whoosh');
    clearAir();
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * G.TAU + rnd(-0.08, 0.08);
      F.cut(c.x + Math.cos(a) * 300, c.y + Math.sin(a) * 300, a, 600, i % 2 ? 5 : 9, i % 3 ? H.col : GOLD, H.hot, 0.42);
    }
    F.hit(c.x, c.y, ang, { heavy: true, power: 1.1, col: GOLD, hot: H.hot });
    F.shatter(c.x, c.y, H.col, 24, { hot: H.hot, r: 460, r0: 50 });
    F.ring(c.x, c.y, { r0: 20, r1: 460, life: 0.55, color: H.hot, width: 10 });
    F.light(c.x, c.y, 420, H.col, 0.26, 0.7);
    F.ripple(c.x, c.y, 340, 0.45, 1.3);
    F.impact(c.x, c.y, 0.09); F.shake(22); F.stop(0.15); F.punch(0.05);
    G.audio.play('finish'); G.audio.play('shatter');
    while (r.t < r.dur) r.t += yield;
    yield* wait(0.25);
  }

  // ------------------------------------------------------------------ Eos: Still Water
  function* stillWater(H, c) {
    const C = G.PLAYER, dir = P.facing;
    const mouth = () => ({ x: P.x + P.facing * 9, y: P.y - 31 });
    yield* toFloor(0.12);
    // his stance; the marks come up one by one in the dark
    P.hold = { t: 0 }; P.focus = 0;
    let e = 0, mark = 0;
    while (e < 0.42) {
      e += yield;
      P.focus = Math.min(1, e / 0.38) * C.FOCUS[2];
      const now = P.focusMark();
      if (now > mark) {
        mark = now;
        G.audio.play('focus', { n: now });
        const m = mouth();
        F.glint(m.x, m.y, 16 + 8 * now, now >= 3 ? GOLD : H.hot, 0.2);
      }
    }
    yield* wait(0.16);
    // and he is on the other side. Nothing is seen to move: there is only the line.
    const x1 = G.clamp(c.x + dir * (c.r + 120), left(), right());
    const y = G.clamp(c.y, 120, FLOOR - 30), ang = dir > 0 ? 0 : Math.PI;
    P.hold = null; P.focus = 0;
    P.x = x1; P.y = FLOOR; P.facing = dir;
    G.audio.play('draw', { pitch: 0.8 });
    F.cut(c.x, y, ang, 2800, 1.8, GOLD, H.hot, 1.4);
    F.stop(0.06);
    // the blade goes home, slowly, in silence
    const r = P.recov = { kind: 'noto', t: 0, dur: 1.0, at: 0.86, ang: 0, lvl: 3 };
    while (r.t < r.dur * r.at) r.t += yield;
    G.audio.play('sheath');
    const m = mouth();
    F.glint(m.x, m.y, 30, H.hot, 0.24);
    yield* wait(0.08);
    // then the picture comes apart along the line
    clearAir();
    G.flow.split = { t0: performance.now(), x: c.x - G.cam.x, y: y - G.cam.y, ang, dur: 0.8, amp: 2.2 };
    F.cut(c.x, y, ang, 2800, 30, H.col, H.hot, 0.5);
    F.cut(c.x, y, ang, 2800, 10, GOLD, H.hot, 0.7);
    F.hit(c.x, c.y, ang, { heavy: true, power: 1.1, col: GOLD, hot: H.hot });
    F.shatter(c.x, c.y, H.col, 26, { hot: H.hot, r: 500, r0: 50 });
    F.impact(c.x, c.y, 0.1); F.shake(24); F.stop(0.18); F.punch(0.06);
    G.audio.play('finish'); G.audio.play('slam'); G.audio.play('shatter');
    for (let i = 0; i < 13; i++) {
      const q = (i + 0.5) / 13 - 0.5, px = c.x + q * 1600;
      if (px < G.cam.x - 40 || px > G.cam.x + G.W + 40) continue;
      F.light(px, y, 200, H.col, 0.45, 0.5);
      F.burst(px, y, { n: 5, color: i % 2 ? H.col : H.hot, speed: [30, 220], angle: -Math.PI / 2, spread: 1.4, life: [0.7, 1.5], size: [1.6, 3.4], grav: -60, wob: 110, drag: 1.3, jitter: 40 });
    }
    while (r.t < r.dur) r.t += yield;
    yield* wait(0.3);
  }
})();
