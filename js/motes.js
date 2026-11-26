// Solfall - Motes, the run's own currency, and what it buys (v2.9k).
// Motes are earned in a run and spent in it: a victory pays some, each break of a boss's stagger
// shakes a few loose, and the road's fortune card and duel pay them. They buy from the road's
// merchant (mending: a health more for the run; a boon; a consumable), the Cleansing Fountain and the Wandering Smith (rest.js,
// ui.js). Whatever is left when the run ends becomes Sunshards, one for every five.
// Consumables: two held at most, used with keys 1 and 2 (player.js). Phoenix Ash works by itself.
'use strict';
(function () {
  const F = G.fx;
  const MO = G.motes = { slowT: 0, bombs: [], flying: [] };
  const R = () => G.run;
  MO.COL = '160,226,255';  // a mote's pale starlight
  MO.HOT = '236,250,255';
  MO.PER_SHARD = 5;        // Motes for one Sunshard at the run's end
  MO.STAGGER = 10;         // shaken loose by each break of the stagger (v2.9l: 5; the bar is twice as long)
  const fighting = () => G.state === 'fight' && !G.practice && !G.run.champFight;

  // ------------------------------------------------------------------ the purse
  MO.held = () => R().motes || 0;
  MO.add = function (n) {
    n = Math.round(n * (G.diff().motes || 1)); // (v3.0c: Ascension +4, a quarter fewer)
    if (!(n > 0)) return 0;
    const r = R();
    r.motes = (r.motes || 0) + n; r.motesEarned = (r.motesEarned || 0) + n;
    return n;
  };
  MO.spend = function (n) {
    const r = R();
    if ((r.motes || 0) < n) return false;
    r.motes -= n;
    return true;
  };
  // a boss beaten: by trial and grade (S 1.5, A 1.25, B 1.1); a corrupted boss pays double
  MO.onVictory = function (grade, id) {
    if (G.practice || id === 'sol') return 0;
    const K = { S: 1.5, A: 1.25, B: 1.1, C: 1 };
    let n = (20 + 4 * (R().trial - 1)) * (K[grade] || 1);
    if (R().corrupt) n *= 2;
    if (id === 'champion') n += 25;
    return MO.add(Math.round(n));
  };
  // each break of the stagger shakes a few loose: they fly to the hero
  MO.onStagger = function () {
    if (!fighting()) return;
    MO.add(MO.STAGGER);
    const c = G.boss.core;
    if (!c) return;
    for (let i = 0; i < MO.STAGGER; i++) {
      MO.flying.push({ x: c.x + G.rand(-30, 30), y: c.y + G.rand(-30, 30), vx: G.rand(-260, 260), vy: -G.rand(120, 360), t: -i * 0.05 });
    }
  };
  // the run is over (fallen, or back at camp): what is left becomes Sunshards
  MO.convert = function () {
    const r = R(), n = r.motes || 0, s = Math.floor(n / MO.PER_SHARD);
    r.motes = 0;
    if (s > 0 && G.meta.earning()) { G.meta.shards += s; G.meta.earned += s; G.meta.save(); }
    return { motes: n, shards: G.meta.earning() ? s : 0 };
  };

  // ------------------------------------------------------------------ consumables
  G.ITEMS = [
    { id: 'flask', name: 'Sun Flask', price: 45, col: '255,196,104', desc: 'Mends 2 health at once.' },
    { id: 'bomb', name: 'Star Bomb', price: 40, col: '255,236,170', desc: 'A falling star strikes the foe for 80.' },
    { id: 'sand', name: 'Slowsand', price: 35, col: '214,190,140', desc: 'The foe and all it throws move at half speed for 3 seconds.' },
    { id: 'charm', name: 'Ward Charm', price: 40, col: '170,220,255', desc: 'The next blow that would strike you is turned aside.' },
    { id: 'ash', name: 'Phoenix Ash', price: 70, col: '255,140,90', passive: true, desc: 'Not used, just held: a killing blow leaves you on 2 health instead.' },
  ];
  const itemById = {};
  for (const it of G.ITEMS) itemById[it.id] = it;
  MO.item = (id) => itemById[id] || null;
  MO.items = () => { const r = R(); if (!Array.isArray(r.items)) r.items = [null, null]; return r.items; };
  MO.free = () => MO.items().indexOf(null);
  MO.give = function (id) {
    const it = MO.items(), i = it.indexOf(null);
    if (i < 0 || !itemById[id]) return false;
    it[i] = id;
    return true;
  };

  // the foe's main body, while it can be struck
  function main() {
    const B = G.boss;
    if (!B || !B.active || B.dead || B.dying || B.invuln || !B.targets) return null;
    return B.targets().find((t) => t.kind === 'core' || t.kind === 'body') || null;
  }
  function nope(text) {
    const P = G.player;
    G.audio.play('empty');
    F.text(P.x, P.y - 84, text, { color: '200,196,214', size: 14, life: 0.8 });
  }

  // Press 1 or 2 in a fight. An item that cannot do anything now is kept.
  MO.use = function (slot) {
    const it = MO.items(), id = it[slot], P = G.player;
    if (!id) { G.audio.play('empty'); return; }
    if (!G.canHurt() || P.dead) return;
    const def = itemById[id];
    if (def.passive) { nope('It works by itself'); return; }
    let ok = false;
    if (id === 'flask') {
      if (P.hp >= P.maxHp) { nope('Already whole'); return; }
      P.hp = Math.min(P.maxHp, P.hp + 2);
      G.audio.play('heal'); G.audio.play('segment');
      F.ring(P.x, P.y - 24, { r0: 10, r1: 130, life: 0.5, color: def.col, width: 6 });
      F.burst(P.x, P.y - 20, { n: 22, color: def.col, speed: [20, 160], life: [0.6, 1.2], size: [2, 4], grav: -220, wob: 110, jitter: 20 });
      ok = true;
    } else if (id === 'bomb') {
      const t = main();
      if (!t) { nope('Nothing to strike'); return; }
      MO.bombs.push({ x: t.cx + G.rand(-20, 20), y: -160, ty: t.cy, t: 0 });
      G.audio.play('whoosh'); G.audio.play('charge', { dur: 0.4 });
      ok = true;
    } else if (id === 'sand') {
      MO.slowT = 3;
      G.audio.play('pulse', { k: 0.6 }); G.audio.play('whoosh');
      F.ring(P.x, P.y - 30, { r0: 20, r1: 700, life: 0.8, color: def.col, width: 4, alpha: 0.5 });
      ok = true;
    } else if (id === 'charm') {
      if (P.charm) { nope('Already warded'); return; }
      P.charm = true;
      G.audio.play('tink'); G.audio.play('segment');
      F.ring(P.x, P.y - 24, { r0: 60, r1: 24, life: 0.4, color: def.col, width: 5 });
      ok = true;
    }
    if (ok) {
      it[slot] = null;
      F.text(P.x, P.y - 96, def.name.toUpperCase(), { color: def.col, size: 15, life: 0.9 });
    }
  };
  // (player.js) the Ward Charm, when a blow lands; Phoenix Ash, when it would kill
  MO.ward = function () { const P = G.player; if (!P.charm) return false; P.charm = false; return true; };
  MO.ash = function () {
    const it = MO.items(), i = it.indexOf('ash');
    if (i < 0) return false;
    it[i] = null;
    return true;
  };
  MO.bossK = () => (MO.slowT > 0 ? 0.5 : 1);

  MO.reset = function () { MO.slowT = 0; MO.bombs.length = 0; MO.flying.length = 0; };
  MO.update = function (dt) {
    if (MO.slowT > 0) MO.slowT = Math.max(0, MO.slowT - dt);
    for (let i = MO.bombs.length - 1; i >= 0; i--) {
      const b = MO.bombs[i];
      b.t += dt;
      const k = Math.min(1, b.t / 0.4);
      b.y = G.lerp(-160, b.ty, k * k);
      if (Math.random() < dt * 60) F.spawn({ kind: 'spark', x: b.x + G.rand(-6, 6), y: b.y - 10, vx: G.rand(-40, 40), vy: -G.rand(60, 200), life: G.rand(0.2, 0.4), size: G.rand(1.5, 3), color: itemById.bomb.col, len: 0.05 });
      if (k >= 1) {
        MO.bombs.splice(i, 1);
        const t = main(), col = itemById.bomb.col;
        F.stop(0.06); F.shake(12); F.punch(0.03);
        F.ring(b.x, b.ty, { r0: 16, r1: 200, life: 0.45, color: col, width: 7 });
        F.lines(b.x, b.ty, 16, col, { r0: 30, speed: [700, 1300] });
        F.burst(b.x, b.ty, { n: 26, color: col, speed: [200, 700], life: [0.3, 0.7], kind: 'spark', size: [2, 4] });
        G.audio.play('boom');
        if (t) G.boss.damage(Math.round(80 * G.dmgMult()), t, { x: t.cx, y: t.cy, dir: G.sign(t.cx - G.player.x) || 1, heavy: true, item: true });
      }
    }
    // Motes flying to the hero: thrown out, then drawn in
    const P = G.player;
    for (let i = MO.flying.length - 1; i >= 0; i--) {
      const m = MO.flying[i];
      m.t += dt;
      if (m.t < 0) continue;
      if (m.t < 0.35) { m.vy += 900 * dt; m.vx *= Math.exp(-3 * dt); }
      else {
        const dx = P.x - m.x, dy = P.y - 40 - m.y, d = Math.hypot(dx, dy) || 1, sp = 500 + 1600 * Math.min(1, (m.t - 0.35) * 2);
        m.vx = G.lerp(m.vx, dx / d * sp, Math.min(1, dt * 8)); m.vy = G.lerp(m.vy, dy / d * sp, Math.min(1, dt * 8));
        if (d < 26) { MO.flying.splice(i, 1); G.audio.play('tink', { k: 0.4 }); continue; }
      }
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.t > 3) MO.flying.splice(i, 1);
    }
  };
  MO.draw = function (ctx) {
    const P = G.player;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of MO.flying) {
      if (m.t < 0) continue;
      G.draw.glow(ctx, MO.COL, m.x, m.y, 14, 0.5);
      ctx.fillStyle = G.rgba(MO.HOT, 0.95); ctx.beginPath(); ctx.arc(m.x, m.y, 2.6, 0, G.TAU); ctx.fill();
    }
    for (const b of MO.bombs) {
      G.draw.glow(ctx, itemById.bomb.col, b.x, b.y, 60, 0.6);
      ctx.fillStyle = 'rgba(255,252,236,1)'; ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, G.TAU); ctx.fill();
    }
    // the Ward Charm, up: a thin ring that turns about the hero
    if (P && P.charm && !P.dead) {
      const a = G.t * 2.4;
      ctx.strokeStyle = G.rgba(itemById.charm.col, 0.45); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(P.x, P.y - 30, 34, a, a + 4.6); ctx.stroke();
    }
    // Slowsand: grains drifting across the whole arena
    if (MO.slowT > 0) {
      ctx.fillStyle = G.rgba(itemById.sand.col, 0.35 * Math.min(1, MO.slowT));
      for (let i = 0; i < 40; i++) { const x = (i * 97 + G.t * 30) % G.W, y = (i * 53 + Math.sin(G.t + i) * 10) % (G.FLOOR - 20); ctx.fillRect(x, y, 2, 2); }
    }
    ctx.restore();
  };

  // ------------------------------------------------------------------ the merchant (rest.js, ui.js)
  // Each road: mending, two boons and two consumables. Health is whole at the start of every fight, so
  // mending here is one more health for the rest of the run (player.js reads R.bonusHp): 60, then 90,
  // twice a run at most.
  MO.BOON_PRICE = 75;
  MO.MENDS = 2;
  MO.mendCost = () => 60 + 30 * (R().mendsBought || 0);
  MO.rollStock = function () {
    const r = R(), ids = (r.offer || []).map((b) => b.id);
    const pool = G.BOONS.filter((b) => G.boon(b.id) < b.max && !ids.includes(b.id) && (!b.heroes || b.heroes.includes(r.hero))
      && b.id !== 'glass' && !b.cursed && !b.pair && !(r.banned || []).includes(b.id));
    const boons = G.shuffle(pool.slice()).slice(0, 2).map((b) => b.id);
    const items = G.shuffle(G.ITEMS.map((i) => i.id)).slice(0, 2);
    r.merch = { boons, items, sold: [] };
    return r.merch;
  };
  // the rows the merchant shows: { kind, id, name, desc, price, sold, why }
  MO.rows = function () {
    const r = R(), m = r.merch || MO.rollStock(), out = [];
    const mends = r.mendsBought || 0;
    out.push({ kind: 'mend', name: 'Mending', desc: 'One more health for the rest of the run.', price: MO.mendCost(), why: mends >= MO.MENDS ? 'Twice a run' : '' });
    m.boons.forEach((id, i) => {
      const b = G.boonDef(id), sold = m.sold.includes('b' + i);
      out.push({ kind: 'boon', i, id, name: b.name, desc: b.desc, price: MO.BOON_PRICE, sold, why: sold ? 'Sold' : G.boon(id) >= b.max ? 'You hold all of it' : '' });
    });
    m.items.forEach((id, i) => {
      const it = itemById[id], sold = m.sold.includes('i' + i);
      out.push({ kind: 'item', i, id, name: it.name, desc: it.desc, price: it.price, sold, why: sold ? 'Sold' : MO.free() < 0 ? 'Your hands are full' : '' });
    });
    const k = G.diff().shop || 1; // (v3.0c: Ascension +4, a quarter dearer)
    if (k !== 1) for (const o of out) o.price = Math.round(o.price * k / 5) * 5;
    return out;
  };
  // buy row n: returns what was bought (for the road to show), or null
  MO.buy = function (n) {
    const row = MO.rows()[n], r = R();
    if (!row || row.why || row.sold) return null;
    if (!MO.spend(row.price)) return null;
    if (row.kind === 'mend') { r.mendsBought = (r.mendsBought || 0) + 1; r.bonusHp = (r.bonusHp || 0) + 1; }
    else if (row.kind === 'boon') { r.grant(G.boonDef(row.id)); r.merch.sold.push('b' + row.i); }
    else if (row.kind === 'item') { MO.give(row.id); r.merch.sold.push('i' + row.i); }
    return row;
  };
})();
