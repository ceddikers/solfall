// Solfall - feel check: plays whole fights with a simple scripted hero and measures the things the
// playtest checklists ask about, so they can be tuned before a person plays.
//
//   fetch('/tools/feel-check.js').then(r => r.text()).then(t => console.log((0, eval)(t)))
//
// The hero cannot be hurt, walks to the nearest thing it can hit, aims at it, attacks without
// stopping and uses Dawnbreak the moment it is ready. It never dashes, so it never gets a perfect
// dodge, and it is never hit, so Flow here is an upper bound for steady play, not a prediction.
// window.FEEL_HEROES / FEEL_BOSSES narrow the run; window.FEEL_JSON = true returns the raw numbers.
(function () {
  'use strict';
  const HEROES = window.FEEL_HEROES || ['vesper', 'aster', 'lune', 'eos'];
  const BOSSES = window.FEEL_BOSSES || G.BOSS_IDS;
  const I = G.input, STEP = 1 / 120, SEG = G.PLAYER.SEG;
  const keep = { freeze: G.debug.freeze, god: G.debug.god, boss: G.debug.boss, force: G.debug.forceAttack, omen: G.debug.omen, hero: G.settings.hero };
  const rows = [];

  function nearest(P) {
    let best = null, bd = 1e9;
    for (const t of G.boss.targets()) {
      const d = Math.abs(t.cx - P.x) + Math.max(0, (P.y - 26) - t.cy - 150) * 3;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  for (const hero of HEROES) {
    for (const boss of BOSSES) {
      G.debug.freeze = true; G.debug.god = true; G.debug.boss = boss; G.debug.forceAttack = ''; G.debug.omen = '';
      G.settings.hero = hero;
      G.startRun();
      const P = G.player, B = G.boss, FL = G.flow, melee = hero !== 'lune';
      const reach = melee ? 58 * P.hero.reach : 230;
      const s = { hero, boss, ults: 0, firstUlt: 0, wards: [], peak: 0, atA: 0, active: 0, sunders: 0, staggers: 0 };
      let ward0 = -1, broke0 = 0, wasUlt = false, wasStag = false, n = 0;
      while (G.state === 'fight' && n < 120 * 420) {
        n++;
        const t = B.active && !B.invuln ? nearest(P) : null;
        I.down.left = I.down.right = I.down.jump = false;
        if (t) {
          const dx = t.cx - P.x, up = (P.y - 26) - t.cy;
          I.down.left = dx < -reach; I.down.right = dx > reach;
          I.mx = t.cx - G.cam.x; I.my = t.cy - G.cam.y; I.aim.attack = true; I.aim.flare = true;
          if (melee && !P.hero.draw && up > 80 && Math.abs(dx) < reach + 80) {
            // get up to it: jump, and jump again near the top
            if (P.onGround && n % 8 === 0) I.pressed.jump = true;
            else if (!P.onGround && P.vy > -120 && P.airJumps > 0 && up > 60) I.pressed.jump = true;
            I.down.jump = true;
          }
          if (P.hero.draw) {
            // Eos: hold the stance until all three marks are lit, then let go at whatever is nearest
            const near = Math.hypot(dx, up) < 270; // (she does not jump for it: her draw goes up to it)
            if (!I.down.attack && near && P.atkCd <= 0) { I.down.attack = true; I.pressed.attack = true; }
            else if (I.down.attack && (P.focus >= G.PLAYER.FOCUS[2] || !near)) I.down.attack = false;
          } else if (n % 10 === 0 && Math.abs(dx) < reach + 70) I.pressed.attack = true;
          if (P.ult >= 100) I.pressed.ult = true;
          else if (P.ember >= SEG * 2 && n % 90 === 0) I.pressed.flare = true;
        }
        G.step(STEP);
        if (B.active && !B.invuln && !B.dying) {
          s.active += STEP;
          if (FL.rank >= 3) s.atA += STEP;
        }
        s.peak = Math.max(s.peak, FL.peak);
        if (P.ulting && !wasUlt) { s.ults++; if (!s.firstUlt) s.firstUlt = G.time; }
        wasUlt = P.ulting;
        if (B.staggered && !wasStag) s.staggers++;
        wasStag = !!B.staggered;
        if (B.ward && ward0 < 0) { ward0 = G.time; broke0 = G.moments.broke; }
        if (!B.ward && ward0 >= 0) { s.wards.push({ broke: G.moments.broke > broke0, secs: +(G.time - ward0).toFixed(1) }); ward0 = -1; }
      }
      s.time = +G.time.toFixed(0); s.won = G.state === 'won' || B.dying || B.dead;
      rows.push(s);
    }
  }
  for (const a of ['left', 'right', 'jump', 'attack']) I.down[a] = false;
  I.aim.attack = I.aim.flare = false;
  Object.assign(G.debug, { freeze: keep.freeze, god: keep.god, boss: keep.boss, forceAttack: keep.force, omen: keep.omen });
  G.settings.hero = keep.hero;
  try { localStorage.removeItem('solfall.best'); localStorage.removeItem('solfall.depth'); } catch (e) { /* private mode */ }
  G.toTitle();
  if (window.FEEL_JSON) return rows;
  const rank = (r) => G.flow.RANKS[r].name || '-';
  const lines = rows.map((s) => (s.hero + ' v ' + s.boss).padEnd(20)
    + (s.won ? '' : 'NOT WON ') + (s.time + 's').padEnd(6)
    + ('Dawnbreak x' + s.ults + ' (first at ' + Math.round(s.firstUlt) + 's)').padEnd(30)
    + ('Flow peak ' + rank(s.peak) + ', A or better ' + Math.round(100 * s.atA / Math.max(1, s.active)) + '%').padEnd(34)
    + 'wards ' + (s.wards.map((w) => (w.broke ? 'broke ' : 'HELD ') + w.secs + 's').join(', ') || 'none')
    + ', staggers ' + s.staggers);
  return lines.join('\n');
})();
