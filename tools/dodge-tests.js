// Solfall - scripted dodge tests. Each test runs one boss attack against a simple scripted player
// and reports the health lost, so a change to an attack can be checked for fairness without playing.
//
// Run from the browser console while the game is open through tools/serve.js:
//   fetch('/tools/dodge-tests.js').then(r => r.text()).then(t => console.log((0, eval)(t)))
// A test that loses 0 health means the simple answer to that attack still works.
(() => {
  // these are the Warden's tests; the other bosses have tools/boss-tests.js
  const I = G.input, P = G.player, B = G.setBoss('warden'), D = 1 / 120;
  G.debug.freeze = true;
  G.debug.boss = 'warden';
  G.debug.variant = 'plain'; // the tests below were written for each attack's plain form; the tells are tested at the end
  if (!P._orig) {
    P._orig = P.tryHit;
    P.tryHit = function (dmg, sx, src) {
      const r = P._orig(dmg, sx, src);
      if (r) window.hitLog.push((src && (src.kind || src.id)) || 'core');
      return r;
    };
  }
  window.hitLog = [];

  function stage(phase, atk, px, prep) {
    // set window.TEST_HERO to 'vesper', 'aster' or 'lune' before running to test that hero
    G.run.reset(); if (window.TEST_HERO) G.run.hero = window.TEST_HERO;
    G.startFight(); G.debug.god = true; G.debug.sim(4.5);
    for (let p = 1; p < phase; p++) {
      G.debug.nextPhase();
      let n = 0;
      while (B.invuln && n < 100) { G.debug.sim(0.1); n++; }
    }
    if (px) P.x = px;
    if (prep) prep();
    // the same seed gives the same fight; set window.TEST_SEED to try another
    G.seed((window.TEST_SEED || 1) * 7919 + phase * 31 + atk.length);
    B.forceNext = ''; G.debug.forceAttack = atk;
    let n = 0;
    while (B.attackName !== atk && n < 200) { G.debug.sim(0.05); n++; }
    G.debug.god = false;
  }

  function run(label, phase, atk, px, policy, prep) {
    // window.TEST_ONLY = ['pendulum'] runs only the tests whose label holds one of those words
    if (window.TEST_ONLY && !window.TEST_ONLY.some((w) => label.includes(w))) return null;
    stage(phase, atk, px, prep);
    window.hitLog = [];
    for (const a in I.down) I.down[a] = false;
    const hp0 = P.hp, st = {};
    let t = 0;
    while (B.attackName === atk && t < 15 && !P.dead) { policy(t, st); G.debug.sim(D); t += D; }
    for (const a in I.down) I.down[a] = false;
    const lost = hp0 - P.hp;
    return (lost ? 'FAIL ' : 'ok   ') + label + ': lost ' + lost + (lost ? ' to ' + window.hitLog.join(', ') : '') + ', perfect dodges ' + P.stats.perfect;
  }

  // --- small building blocks for policies
  const hold = (l, r) => { I.down.left = !!l; I.down.right = !!r; };
  const jump = () => { I.pressed.jump = true; I.down.jump = true; };
  const mark = () => G.hazards.list.find((h) => h.kind === 'mark');
  const hurtHand = () => B.hands.find((h) => h.hurt);
  // Jump an approaching ground wave once it is close.
  function jumpWaves() {
    const w = G.hazards.list.find((h) => h.kind === 'wave' && Math.abs(h.x - P.x) < 80 && Math.sign(P.x - h.x) === h.dir);
    if (w && P.onGround) jump();
    if (P.onGround && !w) I.down.jump = false;
  }
  // Jump at the given moment, then jump again at the top.
  function doubleJump(st, go) {
    if (go && !st.j) { st.j = 1; jump(); }
    if (st.j === 1 && P.vy > -60 && !P.onGround) { st.j = 2; I.pressed.jump = true; }
  }
  // Step out from under any meteor marker.
  function avoidMeteors() {
    const me = G.hazards.list.find((h) => h.kind === 'meteor' && Math.abs(h.x - P.x) < 84);
    if (!me) { hold(0, 0); return; }
    const right = (P.x > me.x && P.x < 1170) || P.x < 110;
    hold(!right, right);
  }

  const out = [];
  out.push(run('slam: dash out on the flash, jump the wave', 1, 'slam', 640, (t, st) => {
    const m = mark();
    if (m && m.locked && !st.d) { st.d = 1; I.pressed.dash = true; hold(1, 0); }
    if (st.d && P.dashT <= 0) hold(0, 0);
    jumpWaves();
  }));
  out.push(run('slam: walk out on the flash, jump the wave', 1, 'slam', 640, (t, st) => {
    const m = mark();
    hold(m && m.locked, 0);
    jumpWaves();
  }));
  for (const px of [150, 640, 1130]) {
    out.push(run('sweep: double jump when the warning flashes, at x=' + px, 1, 'sweep', px, (t, st) => {
      const lane = G.hazards.list.find((h) => h.kind === 'lane');
      doubleJump(st, lane && lane.t / lane.dur > 0.8);
    }));
  }
  out.push(run('sweep: one jump as the hand starts, from the middle', 1, 'sweep', 640, (t, st) => {
    const lane = G.hazards.list.find((h) => h.kind === 'lane');
    if (lane && lane.t / lane.dur > 0.97 && !st.j) { st.j = 1; jump(); }
  }));
  out.push(run('sweep: dash through the hand', 1, 'sweep', 400, (t, st) => {
    const h = hurtHand();
    if (h && Math.abs(h.x - P.x) < 170 && !st.d) { st.d = 1; hold(h.x < P.x, h.x > P.x); I.pressed.dash = true; }
  }));
  out.push(run('clap: dash out on the flash', 1, 'clap', 640, (t, st) => {
    const m = mark();
    if (m && m.locked && !st.d) { st.d = 1; hold(0, 1); I.pressed.dash = true; }
  }));
  out.push(run('clap: walk out on the flash', 1, 'clap', 640, (t, st) => {
    const m = mark();
    hold(0, m && m.locked);
  }));
  out.push(run('lance: walk once the line locks', 1, 'lance', 400, (t, st) => {
    const b = G.hazards.list.find((h) => h.kind === 'beam');
    hold(0, b && b.locked);
  }));
  out.push(run('rain: step out from under each marker', 1, 'rain', 640, avoidMeteors));
  out.push(run('sweep there and back: double jump each pass', 2, 'sweep2', 640, (t, st) => {
    const lanes = G.hazards.list.filter((h) => h.kind === 'lane');
    const lane = lanes[lanes.length - 1];
    if (lane && lane !== st.lane) { st.lane = lane; st.j = 0; }
    doubleJump(st, lane && lane.t / lane.dur > 0.8);
  }));
  out.push(run('rings: dash through each', 2, 'pulse', 300, (t, st) => {
    const r = G.hazards.list.find((h) => h.kind === 'ring' && !h._used);
    if (!r) return;
    const d = G.dist(P.x, P.y - 22, r.x, r.y) - r.r;
    // dash towards the ring's centre, so the dash carries the hero through it
    if (d < 55 && d > 0) { r._used = 1; hold(P.x > r.x, P.x <= r.x); I.pressed.dash = true; st.t0 = t; }
    if (st.t0 != null && t - st.t0 > 0.2) hold(0, 0);
  }));
  out.push(run('comb: shift one lane each volley', 2, 'comb', 640, (t, st) => {
    const warn = G.hazards.list.filter((h) => h.kind === 'zone' && h.t < h.tele);
    const under = warn.find((z) => P.x > z.x - 14 && P.x < z.x + z.w + 14);
    const ahead = G.hazards.list.find((h) => h.kind === 'zone' && h.firing && P.x + 60 > h.x && P.x + 60 < h.x + h.w);
    hold(0, under && !ahead);
  }));
  out.push(run('rocket punch: double jump over it', 2, 'rocket', 640, (t, st) => {
    doubleJump(st, !!hurtHand());
  }));
  out.push(run('burning floor: jump to a platform, step away from the lance', 2, 'tide', 300, (t, st) => {
    if (!st.j && t > 0.6) { st.j = 1; jump(); }
    const b = G.hazards.list.find((h) => h.kind === 'beam');
    hold(0, b && b.locked && P.x < 390);
  }));
  out.push(run('dive: dash out on the flash, jump the wave', 3, 'dive', 640, (t, st) => {
    const m = mark();
    if (m && m.locked && !st.d) { st.d = 1; st.t0 = t; I.pressed.dash = true; hold(0, 1); }
    if (st.d && P.dashT <= 0) hold(0, 0);
    jumpWaves();
  }));
  out.push(run('wheel: dash through each beam, step off markers', 3, 'wheel', 900, (t, st) => {
    avoidMeteors();
    for (const b of G.hazards.list) {
      if (b.kind !== 'beam' || !b.firing) continue;
      const d = G.distPointSeg(P.x, P.y - 22, b.ox, b.oy, b.ex, b.ey);
      if (d < 62 && P.dashCd <= 0 && P.dashT <= 0) { hold(b.spin < 0, b.spin > 0); I.pressed.dash = true; }
    }
  }));
  out.push(run('collapse: run clear, one dash', 3, 'singularity', 640, (t, st) => {
    if (!G.hazards.list.find((h) => h.kind === 'blast')) return;
    hold(0, 1);
    if (!st.d && t > 0.9) { st.d = 1; I.pressed.dash = true; }
  }));
  out.push(run('shard storm: keep running, dash back off a wall, jump the flat line', 3, 'storm', 640, (t, st) => {
    if (!st.dir) st.dir = -1;
    if (P.x < 190 && st.dir < 0) { st.dir = 1; I.pressed.dash = true; }
    if (P.x > 1090 && st.dir > 0) { st.dir = -1; I.pressed.dash = true; }
    hold(st.dir < 0, st.dir > 0);
    const flat = G.hazards.list.find((b) => b.kind === 'beam' && b.t < b.tele + b.active && Math.abs(Math.sin(b.ang)) < 0.1 && b.t > b.tele - 0.2);
    if (flat && P.onGround) jump();
    if (!flat && P.onGround) I.down.jump = false;
  }));

  // ---- the attacks added in v0.4a
  // Walk to the safest nearby spot when a danger point is close, and commit to it until it is reached.
  function stepClear(st, xs, lo, hi, reach, mid, walls) {
    if (st.goal != null) {
      if (Math.abs(P.x - st.goal) < 8) st.goal = null;
      else { hold(P.x > st.goal, P.x < st.goal); return; }
    }
    hold(0, 0);
    if (!xs.some((dx) => Math.abs(P.x - dx) < reach)) return;
    let best = P.x, bestD = -1e9;
    for (let x = lo; x <= hi; x += 10) {
      // never plan a walk that crosses an ember already on its way down
      if (walls && walls.some((w) => Math.abs(P.x - w) > 30 && w > Math.min(P.x, x) - 30 && w < Math.max(P.x, x) + 30)) continue;
      let d = 1e9;
      for (const dx of xs) d = Math.min(d, Math.abs(x - dx));
      // a spot that is properly clear always beats one that is not; after that, prefer the shorter walk
      d = (d >= reach - 8 ? 1000 : 0) + Math.min(d, reach + 30) - Math.abs(x - P.x) * 0.25;
      if (mid != null) d -= Math.abs(x - mid) * 0.12;         // and do not back into a corner
      if (d > bestD) { bestD = d; best = x; }
    }
    st.goal = best;
    hold(P.x > best, P.x < best);
  }
  function emberXs() { return G.hazards.list.filter((h) => h.kind === 'meteor').map((m) => m.x); }
  function fallingXs() { return G.hazards.list.filter((h) => h.kind === 'meteor' && h.t >= h.tele).map((m) => m.x); }
  // Where orbs will be when they reach the hero's height, if that is soon.
  function incoming(window) {
    const xs = [];
    for (const o of G.hazards.list) {
      if (o.kind !== 'orb' || o.vy <= 20) continue;
      const ta = (P.y - 22 - o.y) / o.vy;
      if (ta > -0.05 && ta < window) xs.push(o.x + o.vx * ta);
    }
    return xs;
  }

  out.push(run('flick: jump each orb as it arrives', 1, 'flick', 640, (t, st) => {
    const o = G.hazards.list.find((h) => h.kind === 'orb' && G.dist(h.x, h.y, P.x, P.y - 22) < 190);
    if (o && P.onGround) jump();
    if (!o && P.onGround) I.down.jump = false;
  }));
  out.push(run('flick: keep walking', 1, 'flick', 400, (t, st) => {
    const r = Math.floor(t / 1.5) % 2 === 0;
    hold(!r, r);
  }));
  out.push(run('crossfire: jump the low beam, stay down for the high one', 1, 'crossfire', 640, (t, st) => {
    const low = G.hazards.list.find((b) => b.kind === 'beam' && b.oy > G.FLOOR - 60 && b.t < b.tele && b.t > b.tele - 0.13);
    if (low && P.onGround) jump();
    if (!low && P.onGround) I.down.jump = false;
  }));
  out.push(run('fan: step into the gaps', 2, 'fan', 640, (t, st) => {
    stepClear(st, incoming(0.75), 60, 1220, 52);
  }));
  out.push(run('fan: step into the gaps, starting off-centre', 2, 'fan', 380, (t, st) => {
    stepClear(st, incoming(0.75), 60, 1220, 52);
  }));
  out.push(run('cage: dodge the embers inside', 2, 'cage', 640, (t, st) => {
    const ms = G.hazards.list.filter((h) => h.kind === 'meteor').map((m) => m.x);
    const lo = G.bounds ? G.bounds.l : 60, hi = G.bounds ? G.bounds.r : 1220;
    stepClear(st, ms, lo, hi, 78, (lo + hi) / 2, fallingXs());
  }));
  out.push(run('swat: walk off the platform when it is marked', 2, 'swat', 300, (t, st) => {
    const z = G.hazards.list.find((h) => h.kind === 'zone');
    hold(0, !!z || P.x < 440 && st.go);
    if (z) st.go = 1;
  }, () => { const pl = G.arena.platforms[0]; P.x = 300; P.y = pl.y; P.plat = pl; P.onGround = true; P.vy = 0; B.campPlat = pl; }));
  out.push(run('duet (slam and lance): dash out, keep moving, jump the wave', 2, 'duetSlam', 640, (t, st) => {
    const m = mark();
    if (m && m.locked && !st.d) { st.d = 1; I.pressed.dash = true; hold(1, 0); }
    const b = G.hazards.list.find((h) => h.kind === 'beam');
    if (st.d && P.dashT <= 0) hold(b && b.t < b.tele + b.active && P.x > 120, 0);
    jumpWaves();
  }));
  out.push(run('duet (sweep and embers): double jump, drift off the markers', 2, 'duetSweep', 640, (t, st) => {
    const lane = G.hazards.list.find((h) => h.kind === 'lane');
    doubleJump(st, lane && lane.t / lane.dur > 0.8);
    stepClear(st, G.hazards.list.filter((h) => h.kind === 'meteor').map((m) => m.x), 60, 1220, 90);
  }));
  out.push(run('halo: get under the core and stay there', 3, 'halo', 300, (t, st) => {
    const c = B.core, dx = c.x - P.x;
    hold(dx < -24, dx > 24);
    // if the ring is live and the blades are between the hero and the core, dash through
    if (B.haloHurt && Math.abs(dx) > 105 && Math.abs(dx) < 185 && P.dashCd <= 0 && P.dashT <= 0) I.pressed.dash = true;
  }));
  out.push(run('halo: stay outside and back away', 3, 'halo', 1150, (t, st) => {
    const c = B.core, dx = P.x - c.x;
    hold(dx < 0 && Math.abs(dx) < 330, dx >= 0 && Math.abs(dx) < 330);
    if (B.haloHurt && Math.abs(dx) < 190 && P.dashCd <= 0 && P.dashT <= 0) { hold(dx >= 0, dx < 0); I.pressed.dash = true; }
  }));
  out.push(run('last stand: dash the rings and the beam, run from the collapse', 3, 'supernova', 420, (t, st) => {
    hold(0, 0);
    const c = B.core;
    const r = G.hazards.list.find((h) => h.kind === 'ring' && !h._used);
    if (r) {
      const d = G.dist(P.x, P.y - 22, r.x, r.y) - r.r;
      if (d < 55 && d > 0) { r._used = 1; hold(P.x > r.x, P.x <= r.x); I.pressed.dash = true; }
    }
    for (const b of G.hazards.list) {
      if (b.kind !== 'beam' || !b.firing) continue;
      const d = G.distPointSeg(P.x, P.y - 22, b.ox, b.oy, b.ex, b.ey);
      if (d < 62 && P.dashCd <= 0 && P.dashT <= 0) { hold(b.spin < 0, b.spin > 0); I.pressed.dash = true; }
    }
    if (G.hazards.list.find((h) => h.kind === 'blast')) {
      const away = P.x >= c.x;
      hold(!away, away);
      if (!st.d) { st.d = 1; I.pressed.dash = true; }
    }
  }));

  // --- the tells
  G.debug.variant = 'heavy';
  out.push(run('heavy slam (trembling fist): dash out on the flash, jump both waves', 1, 'slam', 640, (t, st) => {
    const m = mark();
    if (m && m.locked && !st.d) { st.d = 1; I.pressed.dash = true; hold(1, 0); }
    if (st.d && P.dashT <= 0) hold(0, 0);
    jumpWaves();
  }));
  G.debug.variant = 'n2';
  out.push(run('two blinks, two lances: dash across each as it locks', 1, 'lance', 400, (t, st) => {
    const b = G.hazards.list.find((h) => h.kind === 'beam');
    if (b && b.locked && !b.firing && b.tele - b.t < 0.16 && !b._d && P.dashCd <= 0 && P.dashT <= 0) { b._d = 1; st.dir = st.dir ? -st.dir : 1; hold(st.dir < 0, st.dir > 0); I.pressed.dash = true; }
    if (P.dashT <= 0 && !(b && b.locked)) hold(0, 0);
  }));
  G.debug.variant = 'plain';

  for (const px of [640, 200, 1100]) {
    out.push(run('sunburst: get into the nearest shadow, from x=' + px, 1, 'sunburst', px, () => {
      const s = G.hazards.list.find((h) => h.kind === 'sunburst');
      if (!s) { hold(0, 0); return; }
      let best = 0, bd = 1e9;
      for (const z of s.shades) { const c = (z.x0 + z.x1) / 2, d = Math.abs(c - P.x); if (d < bd) { bd = d; best = c; } }
      hold(P.x > best + 20, P.x < best - 20);
    }));
  }

  // ---- the core's own two (v2.0a): the Flare and the Sunspot, in every phase
  const flareOf = () => G.hazards.list.find((h) => h.kind === 'flare' && !h.dead);
  // Jump a lash's tip as it rakes the floor toward the hero (or slaps down right beside them), and any
  // ground wave; step out from under a lash that has locked overhead, toward the middle.
  function flarePolicy(t, st) {
    const f = flareOf(), m = mark();
    if (m && m.locked && f && f.high && st.from !== m) {
      st.from = m;
      const away = m.x < 640 ? 1 : -1;
      st.goal = G.clamp(m.x + away * 125, 80, 1200);
    }
    if (st.goal != null) {
      if (Math.abs(P.x - st.goal) < 8) { st.goal = null; hold(0, 0); } else hold(P.x > st.goal, P.x < st.goal);
    } else hold(0, 0);
    let go = false;
    if (f && !f.high) {
      const d = f.dir || f.side;
      if (f.crest) go = Math.abs(f.crestX - P.x) < 85 && Math.sign(P.x - f.crestX) === d;
      else go = Math.abs(P.x - (B.core.x + f.side * 52)) < 70;
    }
    if (G.hazards.list.find((h) => h.kind === 'wave' && Math.abs(h.x - P.x) < 80 && Math.sign(P.x - h.x) === h.dir)) go = true;
    if (go && P.onGround) jump();
    if (!go && P.onGround) I.down.jump = false;
  }
  const forms = [['plain', 'low'], ['high', 'high'], ['high2', 'low, then high'], ['high,high2', 'high, then high']];
  for (const [ph, px] of [[1, 900], [1, 360], [1, 700], [2, 900], [3, 900], [3, 300]]) {
    for (const [v, what] of (ph === 1 ? forms.slice(0, 2) : forms)) {
      G.debug.variant = v;
      out.push(run('flare (' + (ph === 1 ? what.split(',')[0] : what) + '): jump the raking tip, step out from under, phase ' + ph + ' from x=' + px, ph, 'flare', px, flarePolicy));
    }
  }
  // Where the sunspots will land: each marked spot, and the burst still going off.
  function spotXs() { return G.hazards.list.filter((h) => h.kind === 'spot' && !h.dead && h.mk > 0 && h.st !== 'drift').map((h) => h.st === 'boom' ? h.x : h.mx); }
  const heavySpot = () => G.hazards.list.find((h) => h.kind === 'spot' && !h.dead && h.heavy);
  for (const ph of [1, 2, 3]) {
    for (const px of [900, 300]) {
      G.debug.variant = 'plain';
      // (not in phase III: there the bounces crowd a hero who stops, and the answer is to keep going)
      if (ph < 3) out.push(run('sunspot (scattered): walk off each mark, phase ' + ph + ' from x=' + px, ph, 'sunspot', px, (t, st) => {
        // (out toward the middle rather than into a corner, and never across a mark that has locked)
        const locked = G.hazards.list.filter((h) => h.kind === 'spot' && !h.dead && (h.st === 'lock' || h.st === 'dive')).map((h) => h.mx);
        stepClear(st, spotXs(), 60, 1220, 82, 640, locked);
      }));
      // or never stop: each mark follows the hero but locks a moment before it falls, so a hero who keeps
      // walking is always past it (and past its bounce, which carries on the way it fell). At a wall, wait
      // for the marks already locked behind you to fall (or go at once if one is locked on you), then
      // dash back through
      out.push(run('sunspot (scattered): keep walking, at a wall let the marks behind fall, phase ' + ph + ' from x=' + px, ph, 'sunspot', px, (t, st) => {
        if (!st.dir) st.dir = P.x < 640 ? 1 : -1;
        if ((P.x < 150 && st.dir < 0) || (P.x > 1130 && st.dir > 0)) {
          const back = -st.dir, sp = G.hazards.list.filter((h) => h.kind === 'spot' && !h.dead);
          const blocked = sp.some((h) => ['lock', 'dive', 'boom', 'hop'].includes(h.st) && (h.mx - P.x) * back > -40 && Math.abs(h.mx - P.x) < 260);
          const onMe = sp.some((h) => (h.st === 'lock' || h.st === 'dive') && Math.abs(h.mx - P.x) < 90);
          if (blocked && !onMe) { hold(0, 0); return; }
          st.dir = back; I.pressed.dash = true;
        }
        hold(st.dir < 0, st.dir > 0);
      }));
      G.debug.variant = 'gathered';
      // once its mark locks, walk well clear of it, toward the middle; then clear of its bounce
      out.push(run('sunspot (gathered): walk well clear once the mark locks, phase ' + ph + ' from x=' + px, ph, 'sunspot', px, (t, st) => {
        const h = heavySpot();
        if (h && h.locked && h.st !== 'hop' && st.from !== h) { st.from = h; st.goal = G.clamp(h.mx + (h.mx < 640 ? 1 : -1) * 175, 70, 1210); }
        if (h && h.st === 'hop' && st.hop !== h) { st.hop = h; st.goal = Math.abs(P.x - h.mx) > 120 ? null : G.clamp(h.mx + (G.sign(P.x - h.mx) || 1) * 140, 70, 1210); }
        if (st.goal != null && Math.abs(P.x - st.goal) > 8) hold(P.x > st.goal, P.x < st.goal); else { st.goal = null; hold(0, 0); }
      }));
    }
    G.debug.variant = 'gathered';
    out.push(run('sunspot (gathered): dash through the burst as it lands, phase ' + ph, ph, 'sunspot', 640, (t, st) => {
      const h = heavySpot();
      if (h && h.st === 'dive' && h.e > h.diveT - 0.05 && P.dashCd <= 0 && P.dashT <= 0) { st.dir = h.mx < 640 ? 1 : -1; hold(st.dir < 0, st.dir > 0); I.pressed.dash = true; }
      else if (P.dashT <= 0) hold(0, 0);
      // (the bounce in phase III: then it is a mark to walk off)
      if (h && h.st === 'hop') stepClear(st, spotXs(), 60, 1220, 110);
    }));
  }
  G.debug.variant = 'plain';

  // ---- the corrupted Warden's own two (corrupt.js; forced on here)
  G.debug.corrupt = true;
  const prints = () => G.hazards.list.filter((h) => h.kind === 'afterhand');
  for (const [ph, px] of [[1, 640], [2, 640], [3, 640], [2, 200], [3, 1100]]) {
    out.push(run('afterhands: keep walking the roomier way, never turn back, phase ' + ph + ' from x=' + px, ph, 'afterhands', px, (t, st) => {
      if (!st.dir && prints().length) st.dir = P.x < 640 ? 1 : -1;
      hold(st.dir < 0, st.dir > 0);
    }));
  }
  for (const ph of [1, 3]) {
    out.push(run('afterhands: stand still, then step on ahead before the fists reach you, phase ' + ph, ph, 'afterhands', 500, (t, st) => {
      const under = prints().find((h) => Math.abs(h.x - P.x) < 70 && h.fireAt - h.t < 0.5);
      if (under && !st.dir) st.dir = P.x < 640 ? 1 : -1;
      hold(st.dir < 0, st.dir > 0);
    }));
  }
  // Where lobbed orbs (the Pendulum's embers) come down to the hero's height, if that is soon: seen
  // from the moment they are thrown, as a player sees them
  function lobbed(window) {
    const xs = [];
    for (const o of G.hazards.list) {
      if (o.kind !== 'orb') continue;
      const g = o.grav || 0, dy = P.y - 22 - o.y;
      const ta = g ? (-o.vy + Math.sqrt(Math.max(0, o.vy * o.vy + 2 * g * dy))) / g : (o.vy > 20 ? dy / o.vy : -1);
      if (ta > -0.05 && ta < window) xs.push(o.x + o.vx * ta);
    }
    return xs;
  }
  // where the clapper is and how fast it is coming
  function swingIn(st) {
    const c = B.core, vx = st.cx == null ? 0 : (c.x - st.cx) / D;
    st.cx = c.x;
    const pend = G.hazards.list.find((h) => h.kind === 'pendulum');
    const low = pend && c.y > G.FLOOR - 200, toward = Math.sign(P.x - c.x) === Math.sign(vx) && Math.abs(vx) > 60;
    return { c, vx, pend, low, toward, eta: (Math.abs(c.x - P.x) - 84) / Math.max(1, Math.abs(vx)) };
  }
  function leaveSlam(st) {
    const m = mark();
    // (out towards the middle: the last blow falls at an end)
    if (m && Math.abs(m.x - P.x) < 150) { hold(m.x > 640, m.x <= 640); return true; }
    return false;
  }
  for (const [ph, px] of [[2, 640], [3, 640], [2, 560]]) {
    out.push(run('pendulum: stay in the middle, dash through it at the bottom, phase ' + ph + ' from x=' + px, ph, 'pendulum', px, (t, st) => {
      const s = swingIn(st);
      if (leaveSlam(st)) return;
      stepClear(st, lobbed(0.9), 300, 980, 50);
      if (s.low && s.toward && s.eta < 0.05 && P.dashCd <= 0 && P.dashT <= 0) { st.goal = null; hold(s.c.x < P.x, s.c.x > P.x); I.pressed.dash = true; }
    }));
    out.push(run('pendulum: stay in the middle, double jump it at the bottom, phase ' + ph + ' from x=' + px, ph, 'pendulum', px, (t, st) => {
      const s = swingIn(st);
      if (leaveSlam(st)) return;
      stepClear(st, lobbed(0.9), 300, 980, 50);
      // jump as it comes down the near side (eta reads long: it is still gathering speed), and jump
      // again on the way up rather than at the top, so the hero is high as it goes through
      if (P.onGround && st.j === 2) st.j = 0;
      if (s.low && s.toward && s.eta < 0.5 && !st.j && P.onGround) { st.j = 1; jump(); }
      if (st.j === 1 && P.vy > -400 && !P.onGround) { st.j = 2; I.pressed.jump = true; }
    }));
  }
  for (const [ph, px] of [[2, 80], [3, 1200]]) {
    out.push(run('pendulum: hug the wall, dodge the embers, leave before the last blow, phase ' + ph + ' from x=' + px, ph, 'pendulum', px, (t, st) => {
      if (leaveSlam(st)) { st.goal = null; if (!st.d) { st.d = 1; I.pressed.dash = true; } return; }
      stepClear(st, lobbed(1.4), px < 640 ? 50 : 960, px < 640 ? 320 : 1230, 36);
    }));
  }
  G.debug.corrupt = false;

  G.debug.forceAttack = '';
  G.debug.variant = '';
  G.debug.boss = '';
  G.debug.freeze = false;
  for (const a in I.down) I.down[a] = false;
  G.toTitle();
  return out.filter((l) => l).join('\n');
})();
