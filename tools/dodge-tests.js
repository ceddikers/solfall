// Solfall - scripted dodge tests. Each test runs one boss attack against a simple scripted player
// and reports the health lost, so a change to an attack can be checked for fairness without playing.
//
// Run from the browser console while the game is open through tools/serve.js:
//   fetch('/tools/dodge-tests.js').then(r => r.text()).then(t => console.log((0, eval)(t)))
// A test that loses 0 health means the simple answer to that attack still works.
(() => {
  const I = G.input, P = G.player, B = G.boss, D = 1 / 120;
  G.debug.freeze = true;
  if (!P._orig) {
    P._orig = P.tryHit;
    P.tryHit = function (dmg, sx, src) {
      const r = P._orig(dmg, sx, src);
      if (r) window.hitLog.push((src && (src.kind || src.id)) || 'core');
      return r;
    };
  }
  window.hitLog = [];

  function stage(phase, atk, px) {
    // set window.TEST_HERO to 'vesper', 'aster' or 'lune' before running to test that hero
    G.run.reset(); if (window.TEST_HERO) G.run.hero = window.TEST_HERO;
    G.startFight(); G.debug.god = true; G.debug.sim(4.5);
    for (let p = 1; p < phase; p++) {
      G.debug.nextPhase();
      let n = 0;
      while (B.invuln && n < 100) { G.debug.sim(0.1); n++; }
    }
    if (px) P.x = px;
    B.forceNext = ''; G.debug.forceAttack = atk;
    let n = 0;
    while (B.attackName !== atk && n < 200) { G.debug.sim(0.05); n++; }
    G.debug.god = false;
  }

  function run(label, phase, atk, px, policy) {
    stage(phase, atk, px);
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

  G.debug.forceAttack = '';
  G.debug.freeze = false;
  for (const a in I.down) I.down[a] = false;
  G.toTitle();
  return out.join('\n');
})();
