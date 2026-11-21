// Solfall - fairness and stability checks for the duelling bosses (the Magus, the Veil, the Knight).
// Run in the page console:
//   fetch('/tools/boss-tests.js').then(r => r.text()).then(t => (0, eval)(t)).then(console.log)
// Options, set before running: window.TEST_BOSSES = ['mage'], window.TEST_HERO = 'aster',
// window.TEST_SEED = 2, window.TEST_ATTACK = true (the scripted player also fights back).
//
// Every attack of every boss is run in each phase that uses it, against one scripted player that
// follows a few plain rules: step off marked ground, jump low things, stay down for high things,
// leave a swing's reach, dash when there is no time to walk. Health lost is reported per attack.
// The scripted player is far from perfect, so a small loss is not proof an attack is unfair, but
// an attack it can never survive deserves a look.
(function () {
  'use strict';
  const I = G.input, P = G.player, D = 1 / 120, FLOOR = G.FLOOR, WL = G.WALL_L + 20, WR = G.WALL_R - 20;
  const bosses = window.TEST_BOSSES || ['mage', 'assassin', 'knight'];
  const fight = !!window.TEST_ATTACK;

  function hold(l, r) { I.down.left = !!l; I.down.right = !!r; }
  function press(a) { if (!I.down[a]) I.pressed[a] = true; I.down[a] = true; }
  function lift(a) { I.down[a] = false; }

  // Where is it unsafe to stand? Each entry: [centre x, half width, seconds until it hurts].
  function dangers(B) {
    const out = [], py = P.y - 22;
    for (const h of G.hazards.list) {
      if (h.dead) continue;
      switch (h.kind) {
        case 'strike': if (h.t < h.tele + h.active) out.push([h.x, h.w / 2 + 18, h.tele - h.t]); break;
        case 'zone': if (h.style !== 'tide' && h.t < h.tele + h.active) out.push([h.x + h.w / 2, h.w / 2 + 18, h.tele - h.t]); break;
        case 'meteor': out.push([h.x, h.blastR + 16, h.tele - h.t + 0.3]); break;
        case 'blast': if (h.y > FLOOR - 200) out.push([h.x, h.r + 18, h.tele - h.t]); break;
        case 'pool': if (h.t < h.tele + h.active && P.y > FLOOR - 60) out.push([h.x, h.w / 2 + 14, h.tele - h.t]); break;
        case 'mark': out.push([h.x, h.w / 2 + 20, 0.3]); break;
        case 'cloud': if (h.mark) out.push([h.mark.x, 34 + 18, h.mark.tele - h.mark.t]); else out.push([h.x, 20, 2]); break;
        case 'arc': if (h.t < h.tele + h.active && Math.abs(h.y - py) < h.r + 40) out.push([h.x, h.r + 30, h.tele - h.t]); break;
        case 'whirl': if (P.y > FLOOR - 110) out.push([B.body.x, h.r + 44, 0.2]); break;
        case 'beam': {
          if (h.t >= h.tele + h.active) break;
          if (h.follow && !h.locked) break; // still taking aim: it will follow wherever the hero goes
          const s = Math.sin(h.ang), c = Math.cos(h.ang);
          if (Math.abs(s) > 0.3) {
            const t = (py - h.oy) / s;
            if (t > -30 && t < h.maxLen + 30) out.push([h.ox + c * t, (h.width / 2 + 16) / Math.abs(s) + 14, h.tele - h.t]);
          }
          break;
        }
        case 'aim': break;
        case 'orb': {
          // where a falling orb will land, or where a flying one crosses the hero's height
          if (h.vy > 60 || h.grav) {
            const g = h.grav || 0, dy = (FLOOR - 20) - h.y;
            let t = g ? (-h.vy + Math.sqrt(Math.max(0, h.vy * h.vy + 2 * g * dy))) / g : dy / h.vy;
            if (t > 0 && t < 1.2) out.push([h.x + h.vx * t, h.r + 26, t]);
          }
          const dx = P.x - h.x;
          if (Math.abs(h.y - py) < 46 && Math.abs(dx) < 150 && dx * h.vx > 0 && Math.abs(h.vx) > 120) out.push([P.x, 24, 0]);
          break;
        }
        default: break;
      }
    }
    return out;
  }

  const unsafe = (x, ds) => ds.some((d) => Math.abs(x - d[0]) < d[1]);
  function nearestSafe(ds, lo, hi) {
    let best = null, bestD = 1e9;
    for (let x = lo; x <= hi; x += 8) {
      if (unsafe(x, ds)) continue;
      const d = Math.abs(x - P.x);
      if (d < bestD) { bestD = d; best = x; }
    }
    return best;
  }

  // One step of the scripted player.
  function act(st, B) {
    const b = B.body, list = G.hazards.list;
    const ds = dangers(B);
    let lo = WL, hi = WR;
    if (G.bounds) { lo = G.bounds.l + 8; hi = G.bounds.r - 8; }
    let jump = false, stayDown = false, high = false;

    for (const h of list) {
      if (h.dead) continue;
      if (h.kind === 'wave') {
        const dx = P.x - h.x;
        if (dx * h.dir > 0 && Math.abs(dx) < 105) jump = true;
      } else if (h.kind === 'rime') {
        for (const c of h.cells) if (Math.abs(c.x - P.x) < h.cw / 2 + 26 && c.at - h.t < 0.17 && c.at + h.active - h.t > 0) jump = true;
      } else if (h.kind === 'lane') {
        const low = h.y + h.h > FLOOR - 4;
        if (!low) continue;
        if (h.h > 80) high = true;
        if (h.dur - h.t < 0.1 && h.h <= 80 && B.id === 'assassin') jump = true;
      } else if (h.kind === 'firewall') {
        const dx = P.x - h.x;
        if (h.started && dx * h.dir > 0 && Math.abs(dx) < 120) { jump = true; high = true; }
      } else if (h.kind === 'crescent') {
        if ((P.x - h.x) * h.dir > -40 && Math.abs(P.x - h.x) < 230) stayDown = true;
      } else if (h.kind === 'beam') {
        // a flat or shallow line through the hero: jump it
        const sn = Math.sin(h.ang), cs = Math.cos(h.ang);
        if (Math.abs(sn) <= 0.3 && Math.abs(cs) > 0.01 && h.t < h.tele + h.active && h.tele - h.t < 0.2) {
          const yAt = h.oy + (P.x - h.ox) / cs * sn;
          if ((P.x - h.ox) * cs > -20 && Math.abs(yAt - (FLOOR - 22)) < 70) jump = true;
        }
      } else if (h.kind === 'ring') {
        const d = Math.hypot(P.x - h.x, P.y - 22 - h.y) - h.r;
        if (d > 0 && d < 70) st.dashDir = G.sign(h.x - P.x) || 1;
      } else if (h.kind === 'orb' && !h.grav) {
        const dx = P.x - h.x;
        if (Math.abs(h.y - (P.y - 22)) < 44 && Math.abs(dx) < 170 && dx * h.vx > 0 && Math.abs(h.vx) > 300) jump = true;
      }
    }
    // cornered by the Knight's whirl: go over it with a double jump
    const whirl = list.find((h) => h.kind === 'whirl');
    if (whirl) {
      const room = P.x < b.x ? P.x - lo : hi - P.x;
      if (!st.over && room < 150 && Math.abs(b.x - P.x) < 250) st.over = G.sign(b.x - P.x) || 1;
      if (st.over && (P.x - b.x) * st.over > 190) st.over = 0;
    } else st.over = 0;
    // a charging or lunging body: jump it (twice if it is tall)
    if (b.hurt && !b.hidden && Math.abs(b.x - P.x) < 330 && Math.abs(b.y - FLOOR) < 4) { jump = true; if (B.h > 100) high = true; }
    for (const c of (B.clones || [])) if (c.hurt && Math.abs(c.x - P.x) < 330 && Math.abs(c.y - P.y) < 30) jump = true;

    // movement: leave unsafe ground by the shortest way, otherwise keep a little distance from the boss
    let goal = null;
    if (unsafe(P.x, ds)) goal = nearestSafe(ds, lo, hi);
    else if (!b.hidden && !fight) {
      const want = G.clamp(b.x + (P.x >= b.x ? 1 : -1) * 300, lo, hi);
      if (Math.abs(want - P.x) > 30 && !unsafe(want, ds)) {
        // do not walk through danger to get there
        let clear = true;
        for (let x = Math.min(P.x, want); x <= Math.max(P.x, want); x += 12) if (unsafe(x, ds)) { clear = false; break; }
        if (clear) goal = want;
      }
    } else if (fight && !b.hidden) {
      const want = b.x - b.face * 40; // behind it where possible
      if (!unsafe(want, ds) && Math.abs(want - P.x) > 26) goal = want;
    }
    if (st.over) { goal = P.x + st.over * 200; jump = true; high = true; }
    if (goal != null && Math.abs(goal - P.x) > 5) hold(goal < P.x, goal > P.x); else hold(0, 0);

    // no time to walk out: dash towards safety
    if (goal != null && !st.over && unsafe(P.x, ds)) {
      const soon = ds.filter((d) => Math.abs(P.x - d[0]) < d[1]).reduce((m, d) => Math.min(m, d[2]), 9);
      const need = Math.abs(goal - P.x) / 300;
      if (soon < need + 0.06 && soon < 0.3) st.dashDir = G.sign(goal - P.x) || 1;
    }
    if (st.dashDir) {
      hold(st.dashDir < 0, st.dashDir > 0);
      press('dash');
      st.dashDir = 0;
    } else lift('dash');

    if (stayDown) jump = false;
    if (jump && P.onGround) { press('jump'); st.jumpT = 0; }
    else if (high && !P.onGround && P.vy > -260 && P.vy < 60 && P.airJumps > 0 && !st.second) { lift('jump'); st.second = true; }
    else if (st.second) { press('jump'); st.second = false; }
    else if (P.onGround) lift('jump');
    else I.down.jump = true; // hold for full height

    // anything that can be cut down, is
    let cutting = false;
    for (const o of G.hazards.slashables()) {
      if (Math.abs(o.x - P.x) < 74 && Math.abs(o.y - (P.y - 24)) < 60 && !P.atk) {
        if (Math.abs(o.x - P.x) > 6) { P.facing = o.x > P.x ? 1 : -1; hold(o.x < P.x && Math.abs(o.x - P.x) > 30, o.x > P.x && Math.abs(o.x - P.x) > 30); }
        cutting = true;
      }
    }
    if (cutting) { lift('attack'); press('attack'); } else if (!fight) lift('attack');
    if (fight && !cutting) {
      const near = !b.hidden && Math.abs(b.x - P.x) < 90 && Math.abs(b.y - P.y) < 70;
      if (near) { if (Math.abs(b.x - P.x) > 8) P.facing = b.x > P.x ? 1 : -1; press('attack'); lift('attack'); } else lift('attack');
    }
  }

  function settle(B, limit) {
    let t = 0;
    while (t < limit && (!B.active || B.invuln || B.staggered)) { G.step(D); t += D; }
  }
  function stage(id, phase, px) {
    G.debug.boss = id; G.debug.forceAttack = ''; G.debug.god = false;
    for (const k in I.down) I.down[k] = false;
    G.startRun();
    G.seed(window.TEST_SEED || 1);
    const B = G.boss;
    P.hp = P.maxHp = 60;
    settle(B, 12);
    for (let p = 2; p <= phase; p++) { G.debug.nextPhase(); G.step(D); settle(B, 14); }
    P.x = px; P.y = FLOOR; P.vx = P.vy = 0; P.hp = 60;
    return B;
  }

  const out = [], errors = [], causes = {};
  // note what dealt each hit, to make failures easy to read
  const realHit = P.tryHit;
  P.tryHit = function (dmg, srcX, src) {
    const before = P.hp, r = realHit.call(P, dmg, srcX, src);
    if (P.hp < before) { const k = (src && (src.kind || src.pose)) || 'body'; causes.cur = (causes.cur || '') + ' ' + k; }
    if (P.hp < before && window.TEST_TRACE) window.TEST_TRACE.push({ atk: G.boss.attackName, x: Math.round(P.x), y: Math.round(P.y), vy: Math.round(P.vy), ground: P.onGround, dash: P.dashT > 0, bx: Math.round(G.boss.body.x), face: P.facing, src: src && src.kind, sx: Math.round(srcX), haz: G.hazards.list.map((h) => h.kind + '@' + Math.round(h.x == null ? -1 : h.x) + (h.dir ? (h.dir > 0 ? '>' : '<') : '')).join(',') });
    return r;
  };
  const onErr = (e) => errors.push(e.message);
  window.addEventListener('error', onErr);
  const was = { freeze: G.debug.freeze, boss: G.debug.boss, hero: G.settings.hero };
  G.debug.freeze = true;
  if (window.TEST_HERO) G.settings.hero = window.TEST_HERO;

  for (const id of bosses) {
    const def = G.bosses[id];
    const names = Object.keys(def.ATTACKS);
    for (const name of names) {
      for (let phase = 1; phase <= 3; phase++) {
        const inBag = def.bags[phase].includes(name) || (phase === 3 && def.finale === name);
        if (!inBag) continue;
        let lost = 0, runs = 0, len = 0, stuck = false;
        causes.cur = '';
        for (const px of [330, 950]) {
          const B = stage(id, phase, px);
          B.forceNext = ''; G.debug.forceAttack = name;
          const st = {};
          let t = 0, started = -1, done = false;
          const hp0 = P.hp;
          try {
            while (t < 30) {
              act(st, B);
              G.step(D); t += D;
              if (started < 0 && B.attackName === name) started = t;
              // one full attack, then a second of aftermath
              if (started >= 0 && B.attackName !== name && !done) { done = true; len = t - started; G.debug.forceAttack = 'none'; st.end = t + 1.0; }
              // then wait for whatever the attack left behind (clouds, spheres, crystals) to run its course
              if (done && t > st.end && (t > st.end + 9 || (!G.hazards.list.length && !(B.crystals || []).length))) break;
              if (B.staggered || B.phase !== phase) break;
            }
          } catch (e) { errors.push(id + '/' + name + ': ' + e.message); }
          if (!done) stuck = true;
          lost += hp0 - P.hp; runs++;
          G.debug.forceAttack = '';
        }
        out.push({ boss: id, attack: name, phase, lost, runs, len: len.toFixed(1), stuck, by: causes.cur });
      }
    }
  }

  // tidy up so the page is left as it was found
  window.removeEventListener('error', onErr);
  P.tryHit = realHit;
  for (const k in I.down) I.down[k] = false;
  G.debug.forceAttack = ''; G.debug.boss = was.boss; G.debug.freeze = was.freeze; G.settings.hero = was.hero;
  try { localStorage.removeItem('solfall.best'); localStorage.removeItem('solfall.depth'); } catch (e) { /* private mode */ }
  G.toTitle();

  const lines = out.map((r) => (r.boss + ' ' + r.attack + ' P' + r.phase).padEnd(28) + ' lost ' + r.lost + ' in ' + r.runs + ' runs, ' + r.len + 's' + (r.stuck ? '  NEVER FINISHED' : '') + (r.by ? '  (' + r.by.trim() + ')' : ''));
  const total = out.reduce((s, r) => s + r.lost, 0);
  lines.push('total health lost: ' + total + ' over ' + out.reduce((s, r) => s + r.runs, 0) + ' runs');
  if (errors.length) lines.push('ERRORS: ' + errors.join(' | '));
  window.BOSS_TEST_RESULT = out;
  return lines.join('\n');
})();
