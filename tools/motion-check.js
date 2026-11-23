// Solfall - motion check: finds animation that pops, flickers, or stops dead.
// Run in the page console:
//   fetch('/tools/motion-check.js').then(r => r.text()).then(t => (0, eval)(t)).then(console.log)
// Options, set before running: window.MOTION_BOSSES = ['knight'] (default all), window.MOTION_HEROES =
// ['eos'] (default all), window.MOTION_ONLY = ['requiem'] (only those attacks), window.MOTION_SKIP =
// { bosses: true } or { heroes: true }, window.MOTION_FIGHT = false (skip the whole fights).
//
// Every frame (1/60 s) the boss, the hero and each hazard are drawn alone into a small offscreen
// mask, and the number of pixels that changed since the last frame is kept. Motion that is smooth
// changes about as much from one frame to the next as the frames around it; what this flags is:
//   pop      one frame changes far more than the frames on either side (a part jumped)
//   flicker  two frames in a row do (something showed for one frame, or a pose blinked)
//   dead     a fast movement stops in one frame, with no settle
//   appear   a hazard is drawn at nearly its full size on its first frame
//   vanish   a hazard is still nearly full size on its last frame
// Each flag says the boss or hero, the attack (or what the hero was doing) and the time into it,
// so a still of that moment can be checked: not every flag is a fault (a strike can stop dead in
// the floor), but each one deserves a look. window.MOTION_RESULT keeps the raw list.
(function () {
  'use strict';
  const SC = 1 / 3, X0 = -260, Y0 = -160, WW = 1800, HH = 960;
  const cw = Math.round(WW * SC), ch = Math.round(HH * SC), N = cw * ch;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const I = G.input, P = G.player, D = 1 / 120;
  const flags = [], errors = [];

  function mask(draw) {
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    cx.clearRect(0, 0, cw, ch);
    cx.setTransform(SC, 0, 0, SC, -X0 * SC, -Y0 * SC);
    try { draw(cx); } catch (e) { errors.push('draw: ' + e.message); }
    const d = cx.getImageData(0, 0, cw, ch).data, m = new Uint8Array(N);
    for (let i = 0; i < N; i++) m[i] = d[i * 4 + 3] > 120 ? 1 : 0;
    return m;
  }
  // window.MOTION_SHOOT = { who: 'knight/sever', frames: [126, 127, 128] } keeps those frames, drawn in
  // colour round the figure, as one strip in window.MOTION_SHOT (a data URL)
  const SHOOT = window.MOTION_SHOOT, TILE = 300, TS = 0.62;
  let strip = null, tiles = 0;
  function shoot(key, n, draw, fx, fy) {
    if (!SHOOT || !SHOOT.frames.includes(n) || key.indexOf(SHOOT.who) !== 0) return;
    if (!strip) { strip = document.createElement('canvas'); strip.width = TILE * SHOOT.frames.length; strip.height = TILE; const g = strip.getContext('2d'); g.fillStyle = '#1b1d24'; g.fillRect(0, 0, strip.width, TILE); }
    const g = strip.getContext('2d'), i = SHOOT.frames.indexOf(n), sc = SHOOT.scale || TS;
    g.save(); g.beginPath(); g.rect(i * TILE, 0, TILE, TILE); g.clip();
    g.strokeStyle = '#555'; g.beginPath(); g.moveTo(i * TILE, TILE * 0.82); g.lineTo(i * TILE + TILE, TILE * 0.82); g.stroke();
    g.setTransform(sc, 0, 0, sc, i * TILE + TILE / 2 - fx * sc, TILE * 0.82 - fy * sc);
    try { draw(g); } catch (e) { errors.push('shoot: ' + e.message); }
    g.restore();
    g.fillStyle = '#ddd'; g.font = '13px monospace'; g.fillText(String(n), i * TILE + 6, 16);
    if (++tiles === SHOOT.frames.length) window.MOTION_SHOT = strip.toDataURL();
  }
  function diff(a, b) { let n = 0; for (let i = 0; i < N; i++) n += a[i] !== b[i]; return n; }
  function area(m) { let n = 0; for (let i = 0; i < N; i++) n += m[i]; return n; }

  // Scan one series of frames: f[i] = { d: pixels changed since the frame before, a: area, label, t }
  function scan(who, f) {
    const n0 = flags.length;
    scanAll(who, f);
    const hitAt = new Set(); f.forEach((x, i) => { if (/\[hit\]/.test(x.label)) for (let k = 0; k < 4; k++) hitAt.add(x.n + k); });
    for (let i = flags.length - 1; i >= n0; i--) if (hitAt.has(flags[i].frame)) flags.splice(i, 1);
  }
  function scanAll(who, f) {
    const big = (i) => Math.max(14, 0.05 * Math.max(f[i].a, f[i - 1] ? f[i - 1].a : 0));
    const at = (i) => (f[i] ? f[i].d : 0);
    for (let i = 3; i < f.length - 3; i++) {
      const d = at(i);
      if (d < big(i)) continue;
      const before = Math.max(at(i - 1), at(i - 2)), after = Math.max(at(i + 1), at(i + 2));
      if (d > 3.2 * before && d > 3.2 * after && d > before + big(i) * 0.8) flags.push({ who, kind: 'pop', label: f[i].label, t: f[i].t, d, a: f[i].a, frame: f[i].n });
      else if (at(i + 1) > big(i) && Math.min(d, at(i + 1)) > 3 * Math.max(at(i - 1), at(i + 2), 2) && f[i].label === f[i + 1].label) {
        flags.push({ who, kind: 'flicker', label: f[i].label, t: f[i].t, d, a: f[i].a, frame: f[i].n }); i++;
      }
    }
    // a fast movement that ends in one frame: three busy frames, then near stillness
    for (let i = 4; i < f.length - 3; i++) {
      const was = (at(i - 1) + at(i - 2) + at(i - 3)) / 3, now = (at(i + 1) + at(i + 2)) / 2;
      if (was > 2.2 * big(i) && at(i) < was * 0.35 && now < was * 0.12 && at(i - 1) > was * 0.7 && !flags.some((g) => g.who === who && g.kind === 'pop' && g.frame >= f[i].n - 3 && g.frame <= f[i].n)) {
        flags.push({ who, kind: 'dead', label: f[i].label, t: f[i].t, d: Math.round(was), a: f[i].a, frame: f[i].n });
        i += 6;
      }
    }
  }

  // hazards: drawn one by one, tracked from their first frame to their last
  const hz = new Map();
  function trackHazards(who, label, t, n) {
    const seen = new Set();
    for (const h of G.hazards.list) {
      if (!h.draw || h.dead) continue;
      seen.add(h);
      let r = hz.get(h);
      if (!r) { r = { kind: h.kind, label, t, n, areas: [], max: 0 }; hz.set(h, r); }
      const a = area(mask((c) => h.draw(c)));
      r.areas.push(a); if (a > r.max) r.max = a;
      r.lastLabel = label; r.lastT = t; r.lastN = n;
    }
    for (const [h, r] of hz) {
      if (seen.has(h)) continue;
      hz.delete(h);
      judgeHazard(who, r, true);
    }
  }
  function judgeHazard(who, r, ended) {
    const A = r.areas, big = 140; // about 1260 square px of the world
    if (A.length < 2 || r.max < big) return;
    const first = A.findIndex((a) => a > 0);
    if (first >= 0 && A[first] >= r.max * 0.6 && A[first] >= big) flags.push({ who, kind: 'appear', label: r.label + ' ' + r.kind, t: r.t, d: A[first], a: r.max, frame: r.n });
    if (ended) {
      let last = A.length - 1; while (last > 0 && A[last] === 0) last--;
      if (A[last] >= r.max * 0.6 && A[last] >= big) flags.push({ who, kind: 'vanish', label: r.lastLabel + ' ' + r.kind, t: r.lastT, d: A[last], a: r.max, frame: r.lastN });
    }
  }
  function flushHazards(who) { for (const [, r] of hz) judgeHazard(who, r, false); hz.clear(); }

  // the hero, driven by a seeded wander: run, turn, jump, dash, attack, flare, mend
  function wander(st, rnd) {
    for (const k of ['jump', 'dash', 'attack', 'flare', 'heal', 'ult', 'up', 'down']) { I.pressed[k] = false; }
    if (!st.until || G.time > st.until) {
      const r = rnd();
      st.until = G.time + 0.15 + rnd() * 0.9;
      st.dir = r < 0.35 ? -1 : r < 0.7 ? 1 : 0;
      st.act = ['jump', 'jump2', 'dash', 'attack', 'attack', 'attack', 'hold', 'flare', 'up', 'down', 'heal', 'none', 'none'][Math.floor(rnd() * 13)];
      st.fired = false;
    }
    if (P.x < G.WALL_L + 80) st.dir = 1; else if (P.x > G.WALL_R - 80) st.dir = -1;
    I.down.left = st.dir < 0; I.down.right = st.dir > 0;
    I.down.up = st.act === 'up'; I.down.down = st.act === 'down';
    const tap = (k) => { if (!I.down[k]) I.pressed[k] = true; I.down[k] = true; };
    I.down.jump = false; I.down.attack = st.act === 'hold'; I.down.heal = st.act === 'heal';
    if (!st.fired) {
      st.fired = true;
      if (st.act === 'jump' || st.act === 'jump2') tap('jump');
      else if (st.act === 'dash') tap('dash');
      else if (st.act === 'attack' || st.act === 'up' || st.act === 'down') { tap('attack'); I.down.attack = false; }
      else if (st.act === 'flare') tap('flare');
      else if (st.act === 'heal') tap('heal');
    }
    if (st.act === 'jump2' && !P.onGround && P.vy > -120 && !st.second) { st.second = true; I.pressed.jump = true; I.down.jump = true; }
    if (P.onGround) st.second = false;
    if (st.act === 'attack' && G.time + 0.1 < st.until && !P.atk && rnd() < 0.5) tap('attack'); // keep the combo going
  }
  function heroLabel() {
    const a = P.atk, c = P.cast;
    if (P.dead) return 'dead';
    if (a) return 'atk:' + (a.kind || 'swing') + (a.heavy ? '+' : '') + (a.t < a.a0 ? ' wind' : a.t < a.a1 ? ' strike' : ' recover');
    if (c) return 'cast:' + c.kind;
    if (P.recov) return 'recover:' + P.recov.kind;
    if (P.dashT > 0) return 'dash';
    if (P.stun > 0) return 'hurt';
    if (P.healT > 0) return 'mend';
    if (!P.onGround) return P.vy < 0 ? 'rise' : 'fall';
    return Math.abs(P.vx) > 40 ? 'run' : 'idle';
  }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function settle(B, limit) { let t = 0; while (t < limit && (!B.active || B.invuln || B.staggered)) { G.step(D); t += D; } }
  function start(boss, hero, phase) {
    G.debug.boss = boss; G.debug.forceAttack = ''; G.settings.hero = hero;
    for (const k in I.down) I.down[k] = false;
    G.startRun(); G.seed(window.MOTION_SEED || 3);
    const B = G.boss;
    settle(B, 12);
    for (let p = 2; p <= (phase || 1); p++) { G.debug.nextPhase(); G.step(D); settle(B, 14); }
    return B;
  }
  function frameOf(B) {
    G.step(D); G.step(D);
  }

  const keep = { freeze: G.debug.freeze, god: G.debug.god, boss: G.debug.boss, hero: G.settings.hero, corrupt: G.debug.corrupt };
  G.debug.freeze = true; G.debug.god = true;
  const onErr = (e) => errors.push(e.message);
  window.addEventListener('error', onErr);
  const skip = window.MOTION_SKIP || {};
  let frames = 0;

  // ---- 1. every boss attack, in each phase that uses it, against a wandering hero
  if (!skip.bosses) {
    const bosses = window.MOTION_BOSSES || G.BOSS_IDS;
    for (const id of bosses) {
      const def = G.bosses[id];
      for (const name of Object.keys(def.ATTACKS || {})) {
        if (window.MOTION_ONLY && !window.MOTION_ONLY.includes(name)) continue;
        let phase = 0, corrupt = false;
        for (let p = 1; p <= 3 && !phase; p++) {
          const own = !!(def.corruptBags && (def.corruptBags[p] || []).includes(name));
          if ((def.bags && def.bags[p] && def.bags[p].includes(name)) || (p === 3 && def.finale === name) || own) { phase = p; corrupt = own; }
        }
        if (!phase) continue;
        G.debug.corrupt = corrupt;
        try {
          const B = start(id, 'vesper', phase);
          B.forceNext = ''; G.debug.forceAttack = name;
          const rnd = rng(7), st = {}, fb = [];
          let prev = null, t0 = -1, done = -1, n = 0;
          while (n < 60 * 30) {
            wander(st, rnd); frameOf(B); n++; frames++;
            if (t0 < 0 && B.attackName === name) t0 = n;
            if (t0 >= 0 && done < 0 && B.attackName !== name) { done = n; G.debug.forceAttack = 'none'; }
            if (t0 < 0) { prev = null; continue; }
            const bb = B.body || {}, turned = bb.face !== st.face; st.face = bb.face;
            const hit = (bb.flash || 0) > (st.flash || 0) + 0.01; st.flash = bb.flash || 0;
            const label = id + '/' + (B.attackName || (done >= 0 ? 'after ' + name : 'idle')) + (turned && fb.length ? ' [turns]' : '') + (hit ? ' [hit]' : '');
            const m = mask((c) => B.draw(c));
            shoot(id + '/' + name, n - t0, (c) => { B.draw(c); for (const h of G.hazards.list) if (h.draw && SHOOT.hazards) h.draw(c); }, SHOOT && SHOOT.x != null ? SHOOT.x : (B.body ? B.body.x : 640), G.FLOOR);
            fb.push({ d: prev ? diff(m, prev) : 0, a: area(m), label, t: +((n - t0) / 60).toFixed(2), n: n - t0 });
            prev = m;
            trackHazards(id, label, +((n - t0) / 60).toFixed(2), n - t0);
            if (done >= 0 && n > done + 90 && !G.hazards.list.length) break;
            if (B.staggered || B.phase !== phase) break;
          }
          flushHazards(id);
          scan(id + (corrupt ? '*' : ''), fb);
        } catch (e) { errors.push(id + '/' + name + ': ' + e.message); }
        G.debug.forceAttack = ''; G.debug.corrupt = false;
      }
    }
  }

  // ---- 2. whole fights, so the intro, phase changes, staggers and the fall are seen too
  if (!skip.bosses && window.MOTION_FIGHT !== false) {
    const bosses = window.MOTION_BOSSES || G.BOSS_IDS;
    for (const id of bosses) {
      try {
        G.debug.boss = id; G.settings.hero = 'aster';
        for (const k in I.down) I.down[k] = false;
        G.startRun(); G.seed(5);
        const B = G.boss, rnd = rng(11), st = {}, fb = [];
        let prev = null, n = 0;
        while ((G.state === 'fight' || G.state === 'won') && n < 60 * 240) {
          // fight it: walk to the nearest target and keep swinging, now and then a jump or a dash
          const tg = B.targets ? B.targets()[0] : null;
          for (const k of ['jump', 'dash', 'attack', 'flare']) I.pressed[k] = false;
          I.down.left = I.down.right = false; I.down.attack = false;
          if (tg && B.active) {
            if (Math.abs(tg.cx - P.x) > 60) { I.down.left = tg.cx < P.x; I.down.right = tg.cx > P.x; }
            else { P.facing = tg.cx > P.x ? 1 : -1; if (!P.atk) { I.pressed.attack = true; I.down.attack = true; } }
            if (rnd() < 0.01) I.pressed.jump = true;
            if (rnd() < 0.006) I.pressed.dash = true;
            if (rnd() < 0.004) I.pressed.flare = true;
          }
          frameOf(B); n++; frames++;
          const bb = B.body || {}, turned = bb.face !== st.face; st.face = bb.face;
          const hit = (bb.flash || 0) > (st.flash || 0) + 0.01; st.flash = bb.flash || 0;
          const label = (hit ? '[hit] ' : '') + (turned && fb.length ? '[turns] ' : '') + id + '/fight:' + (B.dying ? 'falling' : B.staggered ? 'stagger' : B.invuln ? 'phase change' : !B.active ? 'intro' : (B.attackName || 'between')) + ' P' + B.phase;
          const m = mask((c) => B.draw(c));
          shoot(id + '/fight', n, (c) => B.draw(c), B.body ? B.body.x : 640, G.FLOOR);
          fb.push({ d: prev ? diff(m, prev) : 0, a: area(m), label, t: +(n / 60).toFixed(2), n });
          prev = m;
          if (G.state === 'won' && G.wonT > 1.3) break;
        }
        flushHazards(id);
        scan(id, fb);
      } catch (e) { errors.push(id + '/fight: ' + e.message); }
    }
  }

  // ---- 3. every hero, wandering through all its moves against the Warden (who is kept from attacking)
  if (!skip.heroes) {
    for (const hero of window.MOTION_HEROES || ['vesper', 'aster', 'lune', 'eos']) {
      try {
        const B = start('warden', hero, 1);
        G.debug.forceAttack = 'none';
        const rnd = rng(23), st = {}, fb = [];
        let prev = null, n = 0;
        while (n < 60 * 45) {
          wander(st, rnd);
          if (n % 600 === 300) P.tryHit(1, P.x + 40, { kind: 'test' }); // a blow now and then, to see the flinch
          P.hp = Math.max(P.hp, 2); P.ember = Math.max(P.ember || 0, 0);
          frameOf(B); n++; frames++;
          const label = hero + '/' + heroLabel();
          const m = mask((c) => G.drawHero(c, P.hero, P));
          shoot(hero, n, (c) => G.drawHero(c, P.hero, P), P.x, P.y);
          fb.push({ d: prev ? diff(m, prev) : 0, a: area(m), label, t: +(n / 60).toFixed(2), n });
          prev = m;
        }
        scan(hero, fb);
      } catch (e) { errors.push(hero + ': ' + e.message); }
    }
  }

  window.removeEventListener('error', onErr);
  for (const k in I.down) I.down[k] = false;
  G.debug.forceAttack = ''; G.debug.freeze = keep.freeze; G.debug.god = keep.god; G.debug.boss = keep.boss; G.settings.hero = keep.hero; G.debug.corrupt = keep.corrupt;
  try { localStorage.removeItem('solfall.best'); localStorage.removeItem('solfall.depth'); } catch (e) { /* private mode */ }
  G.toTitle();

  window.MOTION_RESULT = flags;
  const lines = flags.map((f) => (f.who + ' ' + f.kind).padEnd(18) + ' ' + f.label + ' @' + f.t + 's (frame ' + f.frame + ', ' + f.d + ' of ' + f.a + ')');
  lines.push(flags.length + ' flags over ' + frames + ' frames');
  if (errors.length) lines.push('ERRORS: ' + errors.slice(0, 12).join(' | '));
  return lines.join('\n');
})();
