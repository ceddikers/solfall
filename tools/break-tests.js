// Solfall - checks for a boss's move being cut short (v3.1g: Eos's Still Point, a blow turned at the
// last instant, B.breakPattern in bosskit.js and boss.js).
//
// Run in the page console, one boss at a time (a full run of all nine takes a while):
//   fetch('/tools/break-tests.js').then(r => r.text()).then(t => (0, eval)(t)).then(() => console.log(breakTests('knight', [1, 2, 3])))
//
// Every attack of the boss, in every phase that uses it, is started and then cut short at a time that
// depends on the seed. A row in `bad` is an attack that left something wrong behind: an error, a boss
// that never attacked again, one left hanging in the air or under the floor, a hero still held.
window.breakTests = function (boss, seeds) {
  'use strict';
  const P = G.player, FLOOR = G.FLOOR;
  const bad = [], t0 = performance.now();
  let runs = 0, refused = 0;
  const keep = { freeze: G.debug.freeze, god: G.debug.god, boss: G.debug.boss, force: G.debug.forceAttack, hero: G.settings.hero };
  G.debug.freeze = true; G.settings.hero = 'eos'; G.debug.boss = boss;
  const B0 = G.bosses[boss];
  for (let phase = 1; phase <= 3; phase++) {
    const names = boss === 'warden' ? Object.keys(B0.ATTACKS || {})
      : B0.bags[phase].concat(B0.answer || [], B0.antiAir || [], B0.finale && phase === 3 ? B0.finale : []);
    for (const atk of [...new Set(names)]) for (const s of seeds || [1]) {
      let where = 'stage';
      try {
        G.run.reset(); G.run.hero = 'eos'; G.debug.forceAttack = ''; G.startFight(); G.debug.god = true; G.debug.sim(5);
        const B = G.boss;
        for (let p = 1; p < phase; p++) { G.debug.nextPhase(); let n = 0; while (B.invuln && n < 150) { G.debug.sim(0.1); n++; } }
        G.seed(s * 7919 + phase * 31 + atk.length);
        B.forceNext = ''; G.debug.forceAttack = atk;
        let n = 0;
        while (B.attackName !== atk && n < 200) { G.debug.sim(0.05); n++; }
        if (B.attackName !== atk) continue; // (not one this phase can start)
        where = 'before'; G.debug.sim(0.15 + ((s * 0.37) % 1) * 1.6);
        G.debug.forceAttack = '';
        where = 'break'; B.breakAt = 0;
        const ok = B.breakPattern(s % 2 ? 1 : -1);
        runs++;
        if (!ok) { refused++; continue; } // (a phase change, a stagger, a working nothing stops)
        where = 'reel'; G.debug.sim(0.7);
        const b = B.body || B.core, floats = typeof B.floats === 'function' ? B.floats() : B.floats;
        const hung = B.body && !floats && b.y < (B.groundY ? B.groundY(b.x) : FLOOR) - 4 ? Math.round(b.y) : 0;
        let resumed = false;
        where = 'after';
        for (let i = 0; i < 80; i++) { G.debug.sim(0.1); if (B.attackName) resumed = true; }
        const prob = [];
        if (!resumed) prob.push('never attacked again');
        if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(P.x) || !isFinite(P.y)) prob.push('not a number');
        if (B.body && !floats && b.y > FLOOR + 2) prob.push('under the floor: ' + Math.round(b.y));
        if (hung) prob.push('still in the air after it: y ' + hung);
        if (P.grabbed) prob.push('hero still held');
        if (prob.length) bad.push([phase, atk, s, prob.join('; ')]);
      } catch (e) { bad.push([phase, atk, s, where + ': ' + e.message]); }
    }
  }
  G.debug.freeze = keep.freeze; G.debug.god = keep.god; G.debug.boss = keep.boss; G.debug.forceAttack = keep.force; G.settings.hero = keep.hero;
  return { boss, runs, refused, ms: Math.round(performance.now() - t0), bad };
};
