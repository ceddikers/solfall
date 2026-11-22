// Solfall - omens: one change to the rules of a trial, drawn at random from the second trial on
// (two from the sixth). Each one also pays a quarter more Sunshards.
'use strict';
(function () {
  const FLOOR = G.FLOOR, H = G.hazards, R = G.run;
  const BOLT = { boss: '190,150,255', hot: '240,232,255' }, WISP = { boss: '120,255,200', hot: '230,255,245' };

  G.OMENS = [
    { id: 'storm', name: 'Stormfront', desc: 'Lightning strikes where you stand every few seconds' },
    { id: 'embers', name: 'Emberfall', desc: 'Burning stones fall across the arena' },
    { id: 'hunted', name: 'Hunted', desc: 'A wisp hunts you; cut it down and it comes back' },
    { id: 'frenzy', name: 'Frenzy', desc: 'The boss rests a quarter less between attacks' },
    { id: 'bulwark', name: 'Bulwark', desc: 'A fifth more boss health, and staggers end sooner' },
  ];
  const byId = {};
  for (const o of G.OMENS) byId[o.id] = o;
  G.omenDef = (id) => byId[id];
  G.omen = (id) => R.omens.includes(id);

  const O = G.omens = { stormT: 0, emberT: 0, wisp: null, wispT: 0 };

  // Called as each fight starts, before the boss works out its health.
  R.rollOmens = function () {
    const forced = G.debug.omen;
    if (forced) { R.omens = String(forced).split(',').filter((id) => byId[id]); }
    else if (G.practice) { R.omens = []; }
    else {
      const n = R.trial >= 6 ? 2 : R.trial >= 2 ? 1 : 0;
      // never the same omen two trials running
      const pool = G.shuffle(G.OMENS.map((o) => o.id).filter((id) => !(R.lastOmens || []).includes(id)));
      R.omens = pool.slice(0, n);
      R.lastOmens = R.omens.slice();
    }
    O.stormT = 4.5; O.emberT = 3; O.wisp = null; O.wispT = 3.5;
    // forced for a test: start at once, so the omen overlaps whatever attack is being tested
    if (forced && G.debug.freeze) { O.stormT = 0.7; O.emberT = 0.5; O.wispT = 0.3; }
    return R.omens;
  };

  O.update = function (dt) {
    if (!R.omens.length) return;
    const B = G.boss, P = G.player;
    // nothing new while the boss is helpless, changing phase or dying
    if (G.state !== 'fight' || !B.active || B.invuln || B.dying || B.dead || B.staggered || P.dead || P.ulting) return;
    const T = G.diff().tele;
    // Lightning and falling stones are only called down in the rests between the boss's attacks, so
    // they land as the next attack is still being shown, never in the middle of one.
    const rest = !B.attackName;
    if (G.omen('storm')) {
      O.stormT -= dt;
      if (O.stormT <= 0 && rest) {
        O.stormT = 5.6;
        const x = G.clamp(P.x, G.WALL_L + 44, G.WALL_R - 44);
        H.zone({
          x: x - 42, y: -60, w: 84, h: FLOOR + 60, tele: 1.15 * T, active: 0.2, style: 'column', tint: BOLT,
          onFire() { G.audio.play('zap'); G.fx.shake(6); G.fx.flash(BOLT.boss, 0.08, 0.14); G.fx.lines(x, FLOOR - 8, 8, BOLT.hot, { r0: 14, speed: [400, 800] }); },
        });
      }
    }
    if (G.omen('embers')) {
      O.emberT -= dt;
      if (O.emberT <= 0 && rest) {
        O.emberT = 3.4;
        // somewhere near the hero, but not on them: the point is to take ground away, not to snipe
        const side = Math.random() < 0.5 ? -1 : 1;
        let x = P.x + side * G.rand(70, 330);
        if (x < G.WALL_L + 60 || x > G.WALL_R - 60) x = P.x - side * G.rand(70, 330);
        H.meteor({ x: G.clamp(x, G.WALL_L + 60, G.WALL_R - 60), tele: 1.1 * T, blastR: 62 });
      }
    }
    if (G.omen('hunted')) {
      if (O.wisp && (O.wisp.dead || !H.list.includes(O.wisp))) { O.wisp = null; O.wispT = 7; }
      if (!O.wisp) {
        O.wispT -= dt;
        if (O.wispT <= 0) {
          // it rises out of the floor on the far side of the arena
          const x = P.x < G.W / 2 ? G.WALL_R - 90 : G.WALL_L + 90, speed = G.fierce() ? 150 : 118;
          G.fx.ring(x, FLOOR - 60, { r0: 60, r1: 10, life: 0.4, color: WISP.boss, width: 4 });
          O.wisp = H.orb(x, FLOOR - 60, 0, -40, {
            r: 12, life: 999, tint: WISP, once: true,
            steer(ob, sdt) {
              const dx = P.x - ob.x, dy = Math.min(FLOOR - 26, P.y - 24) - ob.y, d = Math.hypot(dx, dy) || 1;
              const k = 1 - Math.exp(-2.2 * sdt);
              ob.vx += (dx / d * speed - ob.vx) * k; ob.vy += (dy / d * speed - ob.vy) * k;
            },
          });
        }
      }
    }
  };
})();
