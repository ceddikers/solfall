// Solfall - sets (v2.3a). Ember, Storm, Tide and Gloam: four kinds of boon (defined in run.js, G.SETS),
// each fitting one of four slots (Strike, Special, Dash, Mend) and each leaving its own mark on the foe:
//   Ember  embers that burn it (five at most, dying down unless more are set)
//   Storm  static that builds to a bolt
//   Tide   soaking, which slows it (the boss's clock runs slower: see G.step in game.js)
//   Gloam  a dark ring: the next finisher or special deals double and spends it
// Three boons of one set open its crown, a move of its own on the crown key, charged by the set's
// mark doing its work and carried between trials like Dawnbreak:
//   Pyre (Ember), Thunderstep (Storm), Undertow (Tide), Nightfall (Gloam).
// The hero's code calls in at the moments that matter (S.hit, S.perfect, S.mended, S.trail, S.tryCrown);
// the boss's damage calls S.amp and S.dealt (boss.js, bosskit.js).
'use strict';
(function () {
  const FLOOR = G.FLOOR;
  const S = G.sets = {};
  const K = S.K = {
    EMBER_MAX: 5, EMBER_TICK: 0.5, EMBER_DMG: 1, EMBER_FADE: 1.6,
    STATIC_MAX: 10, STATIC_HOLD: 2.5, STATIC_DRAIN: 0.5, BOLT_DMG: 24,
    SOAK_MAX: 3, SOAK_T: 4, SOAK_SLOW: 0.06, SLACK_T: 1, SLACK_K: 0.5,
    MARK_BACK: 4,
    CLOUD_N: 4, CLOUD_GAP: 0.45, CLOUD_DMG: 10,
    HEAT_R: 300, WASH_R: 340, TRAIL_T: 1.5,
    // what fills the crown (1 is ready): about sixteen seconds of a set doing its work
    CH_EMBER: 0.006, // each ember, each time it burns
    CH_STATIC: 0.01, CH_BOLT: 0.06,
    CH_SOAK: 0.02,   // each layer, each second
    CH_MARK: 0.25,   // each mark spent
    PYRE_DMG: 16, PYRE_T: 6,
    STEP_DMG: 24, STEP_N: 3, STEP_T: 2,
    UNDERTOW_DMG: 20, NIGHT_T: 3,
  };
  const has = (id) => G.boon(id) > 0;
  // where each ember sits on the foe, as a share of its half-size (one for each of the five)
  const COALS = [[-0.35, -0.25], [0.3, -0.5], [0.05, 0.15], [-0.3, 0.45], [0.4, 0.3]];
  const col = (set) => G.SETS[set].col;
  let st = null;

  S.reset = function () {
    st = {
      embers: 0, emberT: K.EMBER_TICK, emberFade: 0,
      stat: 0, statHold: 0,
      soak: 0, soakT: 0, slackT: 0,
      mark: G.run.setCount && G.run.setCount('gloam') > 0, markT: 0, markPop: 0,
      cloud: null, trail: [], trailCd: 0, lastToken: null,
      bolts: [], arcs: [], pyreT: 0, step: null, wave: null, night: null, nightK: 0,
    };
    // a crown that changed hands starts empty
    const R = G.run, cs = R.crownSet ? R.crownSet() : null;
    if (cs !== R.crownOf) { R.crownOf = cs; R.crown = 0; }
  };
  S.state = () => st;
  const fighting = () => G.state === 'fight';

  // the foe's main body (as Dawnbreak aims at), while it can be struck
  function main() {
    const B = G.boss;
    if (!B.active || B.dead || B.dying || B.invuln) return null;
    return B.targets().find((t) => t.kind === 'core' || t.kind === 'body') || null;
  }
  // where the marks are drawn: the same, even while it cannot be struck
  function anchor() {
    const B = G.boss;
    if (!B.active || B.dead || B.dying) return null;
    return B.targets().find((t) => t.kind === 'core' || t.kind === 'body') || null;
  }
  const half = (t) => (t.r ? { w: t.r, h: t.r } : { w: t.hw, h: t.hh });
  function gap(t, x, y) {
    if (t.r) return Math.max(0, Math.hypot(t.cx - x, t.cy - y) - t.r);
    return Math.hypot(Math.max(0, Math.abs(t.cx - x) - t.hw), Math.max(0, Math.abs(t.cy - y) - t.hh));
  }
  function hurt(dmg, info) {
    const t = main();
    if (!t) return false;
    return G.boss.damage(Math.round(dmg * G.dmgMult()), t, Object.assign({ x: t.cx, y: t.cy, dir: G.sign(t.cx - G.player.x) || 1 }, info));
  }
  function charge(set, amt) {
    const R = G.run;
    if (!fighting() || R.crownSet() !== set || R.crown >= 1) return;
    R.crown = Math.min(1, R.crown + amt);
    if (R.crown >= 1) { G.audio.play('crownReady', { set }); const P = G.player; G.fx.ring(P.x, P.y - 30, { r0: 50, r1: 16, life: 0.35, color: col(set), width: 3 }); }
  }

  // ------------------------------------------------------------------ the marks
  S.ember = function (n) {
    if (!fighting() || !main()) return;
    const was = st.embers;
    st.embers = Math.min(K.EMBER_MAX, st.embers + n); st.emberFade = K.EMBER_FADE;
    if (st.embers > was) G.audio.play('emberSet');
  };
  S.zap = function (n) {
    if (!fighting() || !main()) return;
    st.stat += n; st.statHold = K.STATIC_HOLD;
    charge('storm', K.CH_STATIC * n);
    if (st.stat >= K.STATIC_MAX) { st.stat = 0; bolt(K.BOLT_DMG); }
  };
  S.soak = function (n) {
    if (!fighting() || !main()) return;
    st.soak = Math.min(K.SOAK_MAX, st.soak + n); st.soakT = K.SOAK_T;
    G.audio.play('soak');
    const t = anchor(); if (t) { const h = half(t); G.fx.burst(t.cx, t.cy - h.h * 0.6, { n: 6 + 3 * n, color: col('tide'), speed: [60, 240], angle: -Math.PI / 2, spread: 2.4, life: [0.3, 0.6], size: [2, 3.5], grav: 900 }); }
  };
  S.markNow = function () {
    if (!fighting() || st.mark) return;
    st.mark = true; st.markT = 0; st.markPop = 1;
    G.audio.play('markBack');
  };
  // A bolt from above onto the foe.
  function bolt(dmg) {
    const t = main();
    if (!t) return;
    const h = half(t), x = t.cx + G.rand(-0.4, 0.4) * h.w, y = t.cy - h.h * 0.3;
    if (!hurt(dmg, { heavy: true, x, y })) return;
    st.bolts.push({ pts: jag(x + G.rand(-40, 40), -30, x, y, 9, 34), life: 0.24, max: 0.24 });
    charge('storm', K.CH_BOLT);
    G.audio.play('bolt'); G.fx.shake(5); G.fx.stop(0.03);
    G.fx.burst(x, y, { n: 12, color: col('storm'), speed: [120, 520], life: [0.12, 0.35], kind: 'spark', size: [1.6, 3.2] });
  }
  function jag(x0, y0, x1, y1, n, amp) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, off = i === 0 || i === n ? 0 : G.rand(-amp, amp);
      const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
      pts.push([x0 + (x1 - x0) * k + nx / L * off, y0 + (y1 - y0) * k + ny / L * off]);
    }
    return pts;
  }
  // Wash away what the foe has thrown within r of a point (everything, with no r).
  function wash(x, y, r) {
    for (const o of G.hazards.slashables()) if (r == null || G.dist(o.x, o.y, x, y) < r + o.r) o.slash();
  }

  // ------------------------------------------------------------------ the hero's moments
  // A blow landed. kind: 'light', 'finisher' (the big one of a string: a finisher, a full smash, a
  // heavy arrow, a gold draw) or 'special' (once per cast: token tells casts apart).
  S.hit = function (kind, t, x, y, token) {
    if (!fighting()) return;
    if (kind === 'special') {
      if (token == null || token === st.lastToken) return; // (once a cast; a free shot, with no cast, is not the special)
      st.lastToken = token;
      G.relics.hit('special', t, x, y); // (the Magus's Prism, awakened: relics.js)
      if (has('emspecial')) S.ember(3);
      if (has('stspecial')) st.cloud = { n: K.CLOUD_N, t: 0.3 };
      if (has('tdspecial')) { S.soak(2); wash(G.player.x, G.player.y - 30, K.WASH_R); G.fx.ring(G.player.x, G.player.y - 30, { r0: 30, r1: K.WASH_R, life: 0.4, color: col('tide'), width: 4 }); }
      if (has('glspecial')) S.markNow();
      return;
    }
    const fin = kind === 'finisher';
    G.relics.hit(kind, t, x, y); // (the Comet Shard, awakened: relics.js)
    if (st.pyreT > 0) S.ember(fin ? 2 : 1);
    if (fin && has('emstrike')) S.ember(2);
    if (has('ststrike')) S.zap(fin ? 2 : 1);
    if (fin && has('tdstrike')) S.soak(1);
  };
  S.perfect = function () {
    if (!fighting()) return;
    if (has('stdash')) bolt(K.BOLT_DMG);
    if (has('tddash')) { S.soak(1); st.slackT = K.SLACK_T; }
    if (has('gldash')) { S.markNow(); G.player.riposteT = Math.max(G.player.riposteT || 0, 3); }
  };
  S.mended = function () {
    if (!fighting()) return;
    const P = G.player, cx = P.x, cy = P.y - 30;
    if (has('emmend')) {
      G.fx.ring(cx, cy, { r0: 20, r1: K.HEAT_R, life: 0.45, color: col('ember'), width: 5 });
      G.fx.burst(cx, cy, { n: 16, color: col('ember'), speed: [200, 600], life: [0.2, 0.5], kind: 'spark', size: [2, 3.5] });
      const t = main();
      if (t && gap(t, cx, cy) < K.HEAT_R) S.ember(3);
    }
    if (has('stmend')) bolt(K.BOLT_DMG);
    if (has('tdmend')) {
      P.ward = true; P.wardT = 0;
      G.audio.play('soak');
      G.fx.ring(cx, cy, { r0: 70, r1: 34, life: 0.4, color: col('tide'), width: 4 });
    }
    if (has('glmend')) {
      P.fadeT = 1.5; P.inv = Math.max(P.inv, 1.5);
      G.audio.play('fade');
      G.fx.burst(cx, cy, { n: 14, color: '30,16,48', speed: [40, 180], life: [0.4, 0.8], size: [4, 8], grav: -60 });
    }
  };
  // a dash along the ground leaves fire where it passed (Ashen Trail)
  S.trail = function (x) {
    if (!fighting() || !has('emdash')) return;
    st.trail.push({ x, t: K.TRAIL_T, ph: Math.random() * 6 });
  };
  S.healTime = () => (has('stmend') ? 0.7 : 1);
  S.specMult = () => (has('glspecial') ? 1.3 : 1);
  // how fast the boss's clock runs: soaking and Slack Water slow it
  S.bossK = function () {
    if (!st || !fighting()) return 1;
    return (1 - K.SOAK_SLOW * st.soak) * (st.slackT > 0 ? K.SLACK_K : 1);
  };

  // ------------------------------------------------------------------ the boss's side of a blow
  // Before the blow lands: the Gloam mark doubles a finisher or a special, and is spent.
  S.amp = function (amount, info) {
    if (!st || !st.mark || !fighting() || info.crown || info.tick || !(info.finisher || info.lance)) return amount;
    st.mark = false; st.markT = K.MARK_BACK;
    charge('gloam', K.CH_MARK);
    const P = G.player;
    if (has('glstrike') && info.finisher) { P.ember = Math.min(G.PLAYER.SEG * P.segs, P.ember + G.PLAYER.SEG / 3); P.emberFlash = 1; }
    G.audio.play('markSpend');
    if (info.x != null) {
      G.fx.ring(info.x, info.y, { r0: 70, r1: 8, life: 0.25, color: col('gloam'), width: 5 });
      G.fx.burst(info.x, info.y, { n: 12, color: '24,10,40', speed: [80, 360], life: [0.3, 0.7], size: [4, 9] });
    }
    return amount * 2;
  };
  // After it lands: Nightfall counts it.
  S.dealt = function (amount, info) {
    if (st && st.night && !info.crown && !info.tick && !G.player.ulting) st.night.tally += amount;
  };

  // ------------------------------------------------------------------ crowns
  S.ready = () => !!(G.run.crownSet && G.run.crownSet()) && G.run.crown >= 1;
  S.tryCrown = function () {
    const R = G.run, set = R.crownSet();
    if (!set) return false;
    if (!fighting()) { G.audio.play('empty'); return false; }
    // Thunderstep already going: the press is its next streak
    if (st.step && st.step.n > 0) { streak(); return true; }
    if (R.crown < 1 || !main()) { G.audio.play('empty'); return false; }
    R.crown = 0;
    const P = G.player;
    P.healT = 0; P.flT = 0;
    if (set === 'ember') pyre();
    else if (set === 'storm') { st.step = { n: K.STEP_N, t: K.STEP_T }; streak(); }
    else if (set === 'tide') undertow();
    else nightfall();
    G.feats.bump && G.feats.bump('crown');
    return true;
  };

  // Pyre: every ember torn off at once, then a burning weapon.
  function pyre() {
    const t = main(), n = st.embers, P = G.player;
    G.audio.play('pyre');
    G.fx.shake(6 + 2 * n); G.fx.stop(0.05 + 0.02 * n);
    if (t && n > 0) {
      const h = half(t);
      hurt(K.PYRE_DMG * n, { heavy: true, crown: true, finisher: true });
      for (let i = 0; i < n; i++) {
        const x = t.cx + G.rand(-0.7, 0.7) * h.w, y = t.cy + G.rand(-0.7, 0.7) * h.h;
        G.fx.ring(x, y, { r0: 6, r1: 70, life: 0.35, color: col('ember'), width: 5 });
        G.fx.burst(x, y, { n: 10, color: col('ember'), speed: [120, 520], life: [0.25, 0.6], size: [2.5, 5], grav: -200 });
      }
    }
    st.embers = 0; st.pyreT = K.PYRE_T;
    G.fx.burst(P.x, P.y - 34, { n: 22, color: col('ember'), speed: [60, 320], life: [0.4, 0.9], size: [2.5, 5], grav: -260, wob: 80 });
  }

  // Thunderstep: through the foe as lightning, out the far side.
  function streak() {
    const P = G.player, t = main();
    st.step.n--;
    if (st.step.n <= 0) st.step = null;
    if (!t) return;
    const sx = P.x, sy = P.y - 24, dx = t.cx - sx, dy = t.cy - sy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const h = half(t), ext = Math.abs(ux) * h.w + Math.abs(uy) * h.h;
    const bl = G.bounds ? G.bounds.l : G.WALL_L + 13, br = G.bounds ? G.bounds.r : G.WALL_R - 13;
    const ex = G.clamp(t.cx + ux * (ext + 70), bl, br), ey = G.clamp(t.cy + uy * (ext + 70), 110, FLOOR - 24);
    P.x = ex; P.y = ey + 24; P.atk = null; P.cast = null; P.dashT = 0; P.drawT = 0; P.healT = 0; P.recov = null;
    if (P.y >= FLOOR - 1) { P.y = FLOOR; P.onGround = true; P.vy = 0; }
    else { P.onGround = false; P.plat = null; P.vy = -150; P.airJumps = P.maxAir; P.airDashes = P.maxDash; }
    P.vx = ux * 180; P.facing = -(G.sign(ux) || P.facing); // (the hero turns to face what they went through)
    P.iframes = Math.max(P.iframes, 0.32); P.pdDone = true;
    hurt(K.STEP_DMG, { heavy: true, crown: true, dir: G.sign(ux) || 1, x: t.cx, y: t.cy });
    st.bolts.push({ pts: jag(sx, sy, ex, ey, 12, 18), life: 0.3, max: 0.3, wide: true });
    G.audio.play('thunderstep');
    G.fx.stop(0.05); G.fx.shake(6);
    G.fx.burst(t.cx, t.cy, { n: 16, color: col('storm'), speed: [150, 700], life: [0.12, 0.35], kind: 'spark', size: [1.8, 3.4] });
    G.fx.ring(ex, ey, { r0: 8, r1: 60, life: 0.25, color: col('storm'), width: 3 });
  }

  // Undertow: a wave across the arena that knocks the foe off its feet.
  function undertow() {
    const B = G.boss, P = G.player, t = main(), dir = G.sign(t.cx - P.x) || P.facing;
    st.wave = { x: P.x - dir * 60, dir, t: 0 };
    G.audio.play('undertow');
    G.fx.shake(12); G.fx.stop(0.08);
    if (B.forceStagger && !B.staggered && !B.ward) B.forceStagger(); // (a stagger clears everything it had out)
    if (!B.staggered) { if (!B.ward) B.poise = Math.max(B.poise, B.poiseMax * 0.8); wash(); }
    hurt(K.UNDERTOW_DMG, { heavy: true, crown: true, dir });
    S.soak(K.SOAK_MAX);
  }

  // Nightfall: three seconds of dark, and every blow in it lands again.
  function nightfall() {
    st.night = { t: K.NIGHT_T, tally: 0 };
    G.audio.play('nightfall');
    const P = G.player;
    G.fx.burst(P.x, P.y - 34, { n: 24, color: '20,8,36', speed: [80, 360], life: [0.5, 1], size: [5, 11], grav: -40 });
  }
  function nightEnds() {
    const n = st.night.tally, t = main();
    st.night = null;
    G.audio.play('nightecho', { k: Math.min(1, n / 150) });
    if (!t || n <= 0) return;
    const h = half(t);
    G.boss.damage(Math.round(n), t, { x: t.cx, y: t.cy, heavy: true, finisher: true, crown: true, dir: G.sign(t.cx - G.player.x) || 1 });
    G.fx.stop(0.1); G.fx.shake(12); G.fx.impact(t.cx, t.cy, 0.06);
    for (let i = 0; i < 3; i++) G.fx.cut(t.cx, t.cy, G.rand(0, Math.PI), Math.max(h.w, h.h) * 3 + 200, 7, col('gloam'), '236,220,255', 0.4);
    G.fx.burst(t.cx, t.cy, { n: 20, color: col('gloam'), speed: [150, 700], life: [0.2, 0.6], kind: 'spark', size: [2, 4] });
  }

  // ------------------------------------------------------------------ time
  S.update = function (dt) {
    const P = G.player;
    if (P.fadeT > 0) P.fadeT = Math.max(0, P.fadeT - dt);
    for (let i = st.bolts.length - 1; i >= 0; i--) if ((st.bolts[i].life -= dt) <= 0) st.bolts.splice(i, 1);
    for (let i = st.arcs.length - 1; i >= 0; i--) if ((st.arcs[i].life -= dt) <= 0) st.arcs.splice(i, 1);
    st.markPop = Math.max(0, st.markPop - dt * 2.5);
    st.nightK = G.damp(st.nightK, st.night ? 1 : 0, st.night ? 9 : 5, dt);
    if (st.wave) { st.wave.t += dt; st.wave.x += st.wave.dir * 1700 * dt; if (st.wave.t > 1) st.wave = null; }
    if (!fighting() || P.dead) return;
    const t = main(), a = anchor();

    // Ember: they burn, and die down one at a time unless more are set
    if (st.embers > 0) {
      st.emberT -= dt;
      if (st.emberT <= 0) {
        st.emberT += K.EMBER_TICK;
        if (t) { hurt(Math.max(1, K.EMBER_DMG * st.embers), { tick: true }); charge('ember', K.CH_EMBER * st.embers); }
      }
      st.emberFade -= dt;
      if (st.emberFade <= 0) { st.embers--; st.emberFade = K.EMBER_FADE; }
    } else st.emberT = K.EMBER_TICK;
    if (st.pyreT > 0) {
      st.pyreT -= dt;
      if (Math.random() < dt * 40) G.fx.spawn({ x: P.x + P.facing * G.rand(4, 30), y: P.y - G.rand(24, 60), vx: G.rand(-20, 20), vy: -G.rand(60, 160), life: G.rand(0.25, 0.5), size: G.rand(2, 4), color: Math.random() < 0.5 ? col('ember') : '255,210,140', grav: -80 });
    }
    // Ashen Trail: fire on the floor
    st.trailCd = Math.max(0, st.trailCd - dt);
    for (let i = st.trail.length - 1; i >= 0; i--) {
      const f = st.trail[i];
      if ((f.t -= dt) <= 0) { st.trail.splice(i, 1); continue; }
      if (t && st.trailCd <= 0 && G.rectsOverlap({ cx: f.x, cy: FLOOR - 14, hw: 20, hh: 16 }, t.r ? { cx: t.cx, cy: t.cy, hw: t.r, hh: t.r } : t)) { st.trailCd = 0.4; S.ember(1); }
      if (Math.random() < dt * 9) G.fx.spawn({ x: f.x + G.rand(-12, 12), y: FLOOR - 4, vx: G.rand(-10, 10), vy: -G.rand(40, 110), life: G.rand(0.25, 0.5), size: G.rand(1.6, 3.2), color: Math.random() < 0.6 ? col('ember') : '255,200,120', grav: -40 });
    }
    // Storm: static holds, then drains; the cloud strikes
    if (st.stat > 0) {
      st.statHold -= dt;
      if (st.statHold <= 0) { st.stat--; st.statHold = K.STATIC_DRAIN; }
    }
    if (st.cloud) {
      st.cloud.t -= dt;
      if (st.cloud.t <= 0) {
        st.cloud.n--; st.cloud.t = K.CLOUD_GAP;
        bolt(K.CLOUD_DMG); S.zap(2);
        if (st.cloud.n <= 0) st.cloud = null;
      }
    }
    if (st.step && (st.step.t -= dt) <= 0) st.step = null;
    // Tide: soaking runs out all at once
    if (st.soak > 0) {
      if (t) charge('tide', K.CH_SOAK * st.soak * dt);
      if ((st.soakT -= dt) <= 0) st.soak = 0;
    }
    if (st.slackT > 0) st.slackT -= dt;
    // Gloam: the mark comes back
    if (!st.mark && G.run.setCount('gloam') > 0) { st.markT -= dt; if (st.markT <= 0) S.markNow(); }
    if (st.night && (st.night.t -= dt) <= 0) nightEnds();

    // what the marks look like on the foe
    if (!a) return;
    const h = half(a);
    if (st.embers > 0 && Math.random() < dt * 9 * st.embers) {
      const c = COALS[Math.floor(Math.random() * st.embers)];
      G.fx.spawn({ x: a.cx + c[0] * h.w + G.rand(-6, 6), y: a.cy + c[1] * h.h, vx: G.rand(-25, 25), vy: -G.rand(70, 170), life: G.rand(0.4, 0.9), size: G.rand(2.6, 5), color: Math.random() < 0.6 ? col('ember') : '255,206,130', grav: -90, wob: 50 });
    }
    if (st.stat > 0 && Math.random() < dt * 3 * st.stat) {
      const x = a.cx + G.rand(-0.8, 0.8) * h.w, y = a.cy + G.rand(-0.8, 0.8) * h.h, ang = G.rand(0, G.TAU), L = G.rand(14, 30) + 2 * st.stat;
      st.arcs.push({ pts: jag(x, y, x + Math.cos(ang) * L, y + Math.sin(ang) * L, 3, 6), life: 0.09 });
    }
    if (st.soak > 0 && Math.random() < dt * 12 * st.soak) {
      G.fx.spawn({ x: a.cx + G.rand(-0.8, 0.8) * h.w, y: a.cy + G.rand(-0.2, 0.9) * h.h, vx: G.rand(-10, 10), vy: G.rand(40, 120), life: G.rand(0.4, 0.7), size: G.rand(2.4, 3.8), color: Math.random() < 0.7 ? col('tide') : '200,250,250', grav: 900 });
    }
  };

  // ------------------------------------------------------------------ drawing
  // under everything the foe and the hero draw: Nightfall's dark
  S.drawBack = function (ctx) {
    if (!st || st.nightK < 0.01) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(6,2,14,' + (0.62 * st.nightK).toFixed(3) + ')';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  };
  // on the floor: Ashen Trail's fire
  S.drawGround = function (ctx) {
    if (!st || !st.trail.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of st.trail) {
      const k = Math.min(1, f.t / 0.4);
      for (let j = 0; j < 3; j++) {
        const fl = 0.7 + 0.3 * Math.sin(G.t * (17 + 5 * j) + f.ph + j * 2), x = f.x + (j - 1) * 9, hgt = (14 + 10 * ((j * 7 + Math.round(f.ph * 3)) % 3)) * k * fl;
        const sway = Math.sin(G.t * 9 + f.ph + j) * 4;
        ctx.fillStyle = G.rgba(j === 1 ? '255,196,120' : col('ember'), (j === 1 ? 0.3 : 0.24) * k);
        ctx.beginPath();
        ctx.moveTo(x - 8, FLOOR);
        ctx.quadraticCurveTo(x - 5, FLOOR - hgt * 0.5, x + sway, FLOOR - hgt);
        ctx.quadraticCurveTo(x + 5, FLOOR - hgt * 0.5, x + 8, FLOOR);
        ctx.fill();
      }
    }
    ctx.restore();
  };
  // over the foe: the mark, the static, the storm cloud, bolts, the Undertow's wave
  S.draw = function (ctx) {
    if (!st) return;
    const a = anchor();
    ctx.save();
    if (a && st.mark && fighting()) {
      const h = half(a), R = Math.min(170, Math.max(h.w, h.h) * 1.08 + 16) * (1 + 0.25 * st.markPop), rot = G.t * 0.7;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(14,6,26,0.55)';
      ctx.beginPath(); ctx.arc(a.cx, a.cy, R + 3, 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = G.rgba(col('gloam'), 0.5 + 0.3 * st.markPop);
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a0 = rot + i * G.TAU / 6;
        ctx.beginPath(); ctx.arc(a.cx, a.cy, R, a0, a0 + 0.62); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    if (a && st.embers > 0 && fighting()) {
      const h = half(a);
      for (let i = 0; i < st.embers; i++) {
        const c = COALS[i], x = a.cx + c[0] * h.w, y = a.cy + c[1] * h.h, fl = 0.75 + 0.25 * Math.sin(G.t * 13 + i * 2.1);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 13 * fl);
        g.addColorStop(0, 'rgba(255,226,170,' + (0.8 * fl).toFixed(2) + ')'); g.addColorStop(0.35, G.rgba(col('ember'), 0.55 * fl)); g.addColorStop(1, G.rgba(col('ember'), 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 13 * fl, 0, G.TAU); ctx.fill();
      }
    }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const lines = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); };
    for (const r of st.arcs) {
      ctx.strokeStyle = G.rgba(col('storm'), 0.8); ctx.lineWidth = 1.4;
      lines(r.pts);
    }
    for (const b of st.bolts) {
      const k = b.life / b.max;
      for (const [w, al] of [[b.wide ? 12 : 9, 0.3], [b.wide ? 4 : 3, 0.95]]) {
        ctx.strokeStyle = G.rgba(col('storm'), al * k); ctx.lineWidth = w;
        lines(b.pts);
      }
    }
    if (st.wave) {
      const w = st.wave, k = Math.max(0, 1 - w.t), x = w.x, d = w.dir;
      ctx.globalCompositeOperation = 'source-over';
      // a wall of water, deepest at its face, curling over at the top
      const g = ctx.createLinearGradient(x - d * 320, 0, x + d * 40, 0);
      g.addColorStop(0, G.rgba(col('tide'), 0)); g.addColorStop(0.75, G.rgba(col('tide'), 0.3 * k)); g.addColorStop(1, G.rgba('30,120,130', 0.55 * k));
      ctx.fillStyle = g;
      const crest = () => {
        ctx.moveTo(x - d * 320, FLOOR);
        ctx.quadraticCurveTo(x - d * 80, FLOOR - 30, x - d * 20, FLOOR - 200);
        ctx.quadraticCurveTo(x + d * 20, FLOOR - 250, x + d * 62, FLOOR - 200);
        ctx.quadraticCurveTo(x + d * 30, FLOOR - 196, x + d * 22, FLOOR - 150);
      };
      ctx.beginPath(); crest();
      ctx.quadraticCurveTo(x + d * 14, FLOOR - 70, x + d * 40, FLOOR);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(226,252,250,' + (0.7 * k).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); crest(); ctx.stroke();
      if (Math.random() < 0.8) G.fx.spawn({ x: x + d * G.rand(0, 40), y: FLOOR - G.rand(60, 210), vx: d * G.rand(200, 600), vy: -G.rand(0, 200), life: G.rand(0.3, 0.6), size: G.rand(2, 4), color: '220,250,250', grav: 900 });
    }
    ctx.restore();
    // the storm cloud over the foe
    if (st.cloud && a) {
      const h = half(a), cx = a.cx, cy = Math.max(80, a.cy - h.h - 120);
      ctx.save();
      // a knot of dark cloud, lit now and then from inside
      const lit = Math.random() < 0.12 ? 1 : 0;
      for (let i = 0; i < 9; i++) {
        const j = i % 5, row = i < 5 ? 0 : 1;
        const x = cx + (j - 2) * (row ? 22 : 20) + (row ? 10 : 0) + Math.sin(G.t * 1.7 + i) * 5, y = cy + row * 16 + Math.sin(G.t * 2.3 + i * 1.3) * 4;
        const r = (row ? 34 : 42) - Math.abs(j - 2) * 6;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, lit ? 'rgba(96,94,118,0.75)' : 'rgba(22,24,34,0.75)'); g.addColorStop(0.6, 'rgba(22,24,34,0.55)'); g.addColorStop(1, 'rgba(22,24,34,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, G.TAU); ctx.fill();
      }
      ctx.restore();
    }
  };

  // ------------------------------------------------------------------ sounds of their own
  {
    const A = G.audio.synth;
    G.audio.define('emberSet', () => { A.noise({ dur: 0.12, vol: 0.12, type: 'bandpass', f0: 2400, q: 1.5 }); A.tone({ type: 'triangle', f0: 520, f1: 760, dur: 0.1, vol: 0.04 }); });
    G.audio.define('bolt', () => { A.noise({ dur: 0.05, vol: 0.32, type: 'highpass', f0: 3000 }); A.noise({ dur: 0.35, vol: 0.18, type: 'lowpass', f0: 1400, f1: 200 }); A.tone({ type: 'square', f0: 1600, f1: 220, dur: 0.12, vol: 0.05 }); });
    G.audio.define('soak', () => { A.noise({ dur: 0.18, vol: 0.18, type: 'bandpass', f0: 900, f1: 400, q: 1.2 }); A.tone({ type: 'sine', f0: 600, f1: 260, dur: 0.14, vol: 0.06 }); });
    G.audio.define('markBack', () => { A.tone({ type: 'sine', f0: 330, f1: 440, dur: 0.22, vol: 0.06 }); A.tone({ type: 'triangle', f0: 990, f1: 1320, dur: 0.12, vol: 0.02 }); });
    G.audio.define('markSpend', () => { A.tone({ type: 'sine', f0: 140, f1: 55, dur: 0.35, vol: 0.24 }); A.noise({ dur: 0.2, vol: 0.14, type: 'lowpass', f0: 700, f1: 200 }); });
    G.audio.define('fade', () => { A.noise({ dur: 0.4, vol: 0.12, type: 'lowpass', f0: 1200, f1: 300 }); A.tone({ type: 'sine', f0: 660, f1: 330, dur: 0.4, vol: 0.04 }); });
    G.audio.define('crownReady', () => { A.tone({ type: 'sine', f0: 523, dur: 0.18, vol: 0.06 }); A.tone({ type: 'sine', f0: 784, dur: 0.22, vol: 0.05, delay: 0.08 }); A.tone({ type: 'sine', f0: 1046, dur: 0.3, vol: 0.04, delay: 0.16 }); });
    G.audio.define('crownTaken', () => { A.tone({ type: 'triangle', f0: 392, dur: 0.3, vol: 0.08 }); A.tone({ type: 'triangle', f0: 587, dur: 0.35, vol: 0.06, delay: 0.1 }); A.tone({ type: 'sine', f0: 784, dur: 0.5, vol: 0.05, delay: 0.2 }); });
    G.audio.define('pyre', () => { A.noise({ dur: 0.6, vol: 0.34, type: 'lowpass', f0: 2400, f1: 300 }); A.tone({ type: 'sine', f0: 120, f1: 40, dur: 0.5, vol: 0.3 }); A.noise({ dur: 0.08, vol: 0.2, type: 'highpass', f0: 2600 }); });
    G.audio.define('thunderstep', () => { A.noise({ dur: 0.06, vol: 0.34, type: 'highpass', f0: 3400 }); A.tone({ type: 'sawtooth', f0: 2200, f1: 300, dur: 0.16, vol: 0.05 }); A.noise({ dur: 0.3, vol: 0.16, type: 'lowpass', f0: 900, f1: 150 }); });
    G.audio.define('undertow', () => { A.noise({ dur: 0.9, vol: 0.32, type: 'lowpass', f0: 1800, f1: 220 }); A.tone({ type: 'sine', f0: 90, f1: 40, dur: 0.7, vol: 0.3 }); A.noise({ dur: 0.5, vol: 0.12, type: 'bandpass', f0: 3000, f1: 1200, q: 0.8, delay: 0.15 }); });
    G.audio.define('nightfall', () => { A.tone({ type: 'sine', f0: 220, f1: 70, dur: 0.8, vol: 0.18 }); A.noise({ dur: 0.7, vol: 0.12, type: 'lowpass', f0: 600, f1: 120 }); });
    G.audio.define('nightecho', (o) => { const k = (o && o.k) || 0.5; A.tone({ type: 'sine', f0: 110, f1: 36, dur: 0.6, vol: 0.2 + 0.15 * k }); A.noise({ dur: 0.1, vol: 0.28, type: 'highpass', f0: 2200 }); A.tone({ type: 'triangle', f0: 1320, f1: 880, dur: 0.4, vol: 0.05 }); });
  }
})();
