// Solfall - hero mastery and costumes (v2.8a).
// Each hero earns mastery by winning with them: a trial, a corrupted portal or Aurel's duel is 1, a whole
// run won is 3 more. Mastery I (3) and II (10) each unlock one costume for that hero. A costume is worn
// from the hero's own empty bay in the Hall of Echoes (the Wardrobe). It changes how the hero looks (their
// colours, one piece worn on the head) and how their skills look: the light of every cut, shot, special and
// dash, and a burst of its own on each, each costume its own (petals, embers, hex sparks, spirit fire ...).
// Costumes are cosmetic: nothing they do changes damage, reach or timing.
// They are original takes on anime archetypes (the wandering ronin, the oni, the mecha pilot, the shrine
// archer, the idol, the thunder swordsman), not any one show's characters.
'use strict';
(function () {
  const M = G.meta;
  M.mastery = M.mastery || {};
  const LEVELS = [3, 10];

  // style: the body's four tones (as player.js STYLE has them). col/hot/css: the hero's light, used by every
  // effect of theirs. fx: the burst their skills throw (fxCol its colour). acc: what is worn on the head.
  G.COSTUMES = {
    vesper: [
      { id: 'ronin', name: 'Crimson Ronin', note: 'A wanderer’s red coat and a white headband; her cuts scatter blossom.',
        col: '255,96,112', hot: '255,222,226', css: '#ff6070', style: { dark: '#14070b', mid: '#3a101c', plate: '#6e1a2a', hi: '#c23a4e' },
        fx: 'petals', fxCol: '255,182,204', acc: 'band', accCol: '246,240,236' },
      { id: 'paladin', name: 'Starlit Paladin', note: 'White and gold plate under a halo; feathers of light fall from every blow.',
        col: '255,214,120', hot: '255,250,226', css: '#ffd678', style: { dark: '#1a1826', mid: '#4a4462', plate: '#cfc6e2', hi: '#fff2c8' },
        fx: 'feathers', fxCol: '255,246,220', acc: 'halo', accCol: '255,226,150' },
    ],
    aster: [
      { id: 'oni', name: 'Oni Breaker', note: 'Lacquered red armour and a crown of flame; her maul throws embers.',
        col: '255,112,60', hot: '255,224,186', css: '#ff703c', style: { dark: '#140705', mid: '#3a110b', plate: '#7a1d10', hi: '#d2442a' },
        fx: 'embers', fxCol: '255,150,70', acc: 'flame', accCol: '255,150,60' },
      { id: 'frame', name: 'Steel Frame', note: 'A pilot’s gunmetal suit with a lit visor; impacts break into hex light.',
        col: '96,222,255', hot: '226,250,255', css: '#60deff', style: { dark: '#0a0e15', mid: '#1c2838', plate: '#3a516e', hi: '#80aad0' },
        fx: 'hex', fxCol: '120,232,255', acc: 'visor', accCol: '120,240,255' },
    ],
    lune: [
      { id: 'shrine', name: 'Shrine Archer', note: 'Red and white shrine robes and a fox mask; her arrows leave fox-fire.',
        col: '255,110,130', hot: '255,232,236', css: '#ff6e82', style: { dark: '#160a0e', mid: '#d8d0dc', plate: '#a8202e', hi: '#ff5a6a' },
        fx: 'wisps', fxCol: '150,210,255', acc: 'mask', accCol: '250,246,240' },
      { id: 'idol', name: 'Starlight Idol', note: 'Pink and white stage dress with a great ribbon; every shot sparkles.',
        col: '255,150,220', hot: '255,238,250', css: '#ff96dc', style: { dark: '#1a0c1c', mid: '#5a2a5e', plate: '#e894d0', hi: '#fff0fa' },
        fx: 'stars', fxCol: '255,190,236', acc: 'bow', accCol: '255,130,200' },
    ],
    eos: [
      { id: 'thunder', name: 'Thunder Iaido', note: 'Indigo and gold, a bolt on the hat; every draw cracks with lightning.',
        col: '255,232,110', hot: '255,252,222', css: '#ffe86e', style: { dark: '#0b0a1c', mid: '#1c1a46', plate: '#38328a', hi: '#7c72e4' },
        fx: 'bolt', fxCol: '255,244,170', acc: 'crest', accCol: '255,232,110' },
      { id: 'ink', name: 'Ink Wanderer', note: 'Black and paper-white, like a brush painting; cuts spatter ink.',
        col: '236,236,246', hot: '255,255,255', css: '#ececf6', style: { dark: '#060608', mid: '#202026', plate: '#e8e6ee', hi: '#ffffff' },
        fx: 'ink', fxCol: '236,236,246', acc: 'tassel', accCol: '230,40,50' },
    ],
  };

  // ------------------------------------------------------------------ mastery
  const MA = G.mastery = {};
  MA.LEVELS = LEVELS;
  MA.xp = (hero) => M.mastery[hero] || 0;
  MA.level = (hero) => LEVELS.filter((x) => MA.xp(hero) >= x).length;
  MA.next = (hero) => LEVELS.find((x) => MA.xp(hero) < x) || null; // xp for the next level, or null at the top
  MA.unlocked = (hero) => (G.COSTUMES[hero] || []).slice(0, MA.level(hero));
  // win with a hero: returns the costume this unlocks, if any (earning() is the same rule as Sunshards)
  MA.gain = function (hero, n) {
    if (!M.earning() || !hero || !(n > 0)) return null;
    const before = MA.level(hero);
    M.mastery[hero] = MA.xp(hero) + n;
    M.save();
    const after = MA.level(hero);
    return after > before ? G.COSTUMES[hero][after - 1] : null;
  };
  // the costume a hero wears (null: their own colours)
  MA.worn = function (hero) {
    const id = (G.settings.costume || {})[hero];
    return MA.unlocked(hero).find((c) => c.id === id) || null;
  };
  // the Wardrobe: on to the next unlocked costume, or back to the hero's own
  MA.cycle = function (hero) {
    const list = [null].concat(MA.unlocked(hero)), now = MA.worn(hero);
    const next = list[(list.indexOf(now) + 1) % list.length];
    G.settings.costume = Object.assign({}, G.settings.costume || {}, { [hero]: next ? next.id : null });
    G.saveSettings();
    return next;
  };

  // A hero as worn: their own record with the costume's light on it (cached, one per costume)
  const cache = {};
  G.costumed = function (h) {
    const c = h && MA.worn(h.id);
    if (!c) return h;
    return cache[c.id] || (cache[c.id] = Object.assign({}, h, { col: c.col, hot: c.hot, css: c.css, costume: c }));
  };

  // ------------------------------------------------------------------ what a costume's skills throw
  // kind: 'hit' (a blow lands), 'swing' (a cut starts), 'shot' (an arrow or lance flies), 'trail' (one in
  // flight, now and then), 'special', 'dash'
  const COUNT = { hit: 7, swing: 3, shot: 3, trail: 1, special: 12, dash: 4 };
  G.costumeFx = function (kind, x, y, ang) {
    const h = G.hero(), c = h && h.costume;
    if (!c || !G.fx) return;
    const n = COUNT[kind] || 3, col = c.fxCol, F = G.fx, r = G.rand;
    const big = kind === 'special' ? 1.5 : kind === 'trail' ? 0.6 : 1;
    for (let i = 0; i < n; i++) {
      const a = ang != null && kind !== 'hit' ? ang + r(-0.7, 0.7) : r(0, G.TAU), sp = r(60, 260) * big;
      const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp, jx = x + r(-8, 8), jy = y + r(-8, 8);
      switch (c.fx) {
        case 'petals':
          F.spawn({ kind: 'petal', x: jx, y: jy, vx: vx * 0.6, vy: vy * 0.6 - 40, grav: 70, drag: 1.6, wob: 70, rot: r(0, 6), vr: r(-7, 7), size: r(2.6, 4.2) * big, life: r(0.7, 1.3), color: col });
          break;
        case 'feathers':
          F.spawn({ kind: 'petal', long: true, x: jx, y: jy, vx: vx * 0.5, vy: vy * 0.5 - 30, grav: 45, drag: 2, wob: 50, rot: r(0, 6), vr: r(-3, 3), size: r(3.5, 5.5) * big, life: r(0.9, 1.5), color: col });
          break;
        case 'embers':
          F.spawn({ kind: 'spark', x: jx, y: jy, vx, vy: vy - 80, grav: -160, drag: 1.4, size: r(1.4, 2.6), life: r(0.3, 0.7), color: col, len: 0.05 });
          F.spawn({ x: jx, y: jy, vx: vx * 0.3, vy: -r(30, 90), grav: -60, size: r(2, 4) * big, life: r(0.3, 0.6), color: '255,90,40' });
          break;
        case 'hex':
          F.spawn({ kind: 'hex', x: jx, y: jy, vx, vy, drag: 3, rot: r(0, 6), vr: r(-5, 5), size: r(3, 6) * big, life: r(0.3, 0.6), color: col });
          break;
        case 'wisps':
          F.spawn({ kind: 'wisp', x: jx, y: jy, vx: vx * 0.4, vy: vy * 0.3 - 60, grav: -90, drag: 1.8, wob: 90, size: r(3, 5) * big, life: r(0.5, 1), color: col });
          break;
        case 'stars':
          F.spawn({ kind: 'star4', x: jx, y: jy, vx: vx * 0.6, vy: vy * 0.6, drag: 2.4, rot: r(0, 1), vr: r(-4, 4), size: r(3, 6) * big, life: r(0.35, 0.8), color: i % 3 ? col : '255,255,255' });
          break;
        case 'bolt':
          if (i % 2) break;
          F.spawn({ kind: 'bolt', x: jx, y: jy, vx: 0, vy: 0, rot: a, size: r(16, 30) * big, life: r(0.1, 0.18), color: col, seed: Math.random() * 1000 });
          break;
        case 'ink':
          F.spawn({ kind: 'smoke', x: jx, y: jy, vx: vx * 0.4, vy: vy * 0.4, drag: 3, size: r(3, 6) * big, grow: 10, life: r(0.3, 0.6), color: '14,12,18', a: 0.55 });
          F.spawn({ kind: 'chunk', x: jx, y: jy, vx: vx * 0.8, vy: vy * 0.8 - 60, grav: 900, size: r(1.4, 2.6), life: r(0.3, 0.6), color: '10,10,14', rot: 0, vr: 0 });
          break;
      }
    }
  };

  // ------------------------------------------------------------------ what is worn on the head
  // Drawn in the head's own frame (player.js): its middle is (1, -46.6), about seven across.
  G.costumeHead = function (ctx, h) {
    const c = h.costume;
    if (!c) return;
    const col = c.accCol, t = G.t;
    ctx.save();
    ctx.translate(1, -46.6);
    const fill = (a) => { ctx.fillStyle = G.rgba(col, a == null ? 1 : a); };
    const poly = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); };
    switch (c.acc) {
      case 'band': {
        // a headband knotted at the back, its two tails streaming
        fill(); poly([-6.4, -4.6, 6.8, -5.4, 7, -3.4, -6.2, -2.6]); ctx.fill();
        const w1 = Math.sin(t * 7) * 1.6, w2 = Math.sin(t * 7 + 1.4) * 1.8;
        poly([-6, -4.2, -13, -6 + w1, -17, -4 + w1 * 1.4, -12, -3 + w1 * 0.6, -6, -2.8]); ctx.fill();
        poly([-6, -3.6, -12, -1 + w2, -15.5, 2.5 + w2 * 1.3, -11, 0.6 + w2 * 0.6, -6, -2.6]); ctx.fill();
        break;
      }
      case 'halo': {
        ctx.globalCompositeOperation = 'lighter';
        const y = -14 + Math.sin(t * 2) * 0.6;
        ctx.strokeStyle = G.rgba(col, 0.95); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, y, 7, 2.1, -0.12, 0, G.TAU); ctx.stroke();
        ctx.strokeStyle = G.rgba(col, 0.3); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, y, 7, 2.1, -0.12, 0, G.TAU); ctx.stroke();
        break;
      }
      case 'flame': {
        // a crown of flame on the helm, flickering
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const x = -3 + i * 3, hgt = 7 + Math.sin(t * 13 + i * 2) * 2.2 + (i === 1 ? 3 : 0);
          fill(0.75); poly([x - 2.2, -9, x, -9 - hgt, x + 2.2, -9]); ctx.fill();
          ctx.fillStyle = 'rgba(255,236,190,0.8)'; poly([x - 1, -9, x, -9 - hgt * 0.55, x + 1, -9]); ctx.fill();
        }
        break;
      }
      case 'visor': {
        ctx.globalCompositeOperation = 'lighter';
        fill(0.95); poly([0.5, -2.6, 8.4, -3.2, 8.2, -1.4, 0.6, -1]); ctx.fill();
        fill(0.35); poly([-1, -3.6, 9.6, -4.4, 9.4, -0.2, -0.8, 0.2]); ctx.fill();
        ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(-6, -15); ctx.stroke();
        ctx.beginPath(); ctx.arc(-6, -15, 1, 0, G.TAU); ctx.fill();
        break;
      }
      case 'mask': {
        // a fox mask pushed to the side of the head
        ctx.save(); ctx.translate(-4.6, -5.4); ctx.rotate(-0.5);
        fill(); poly([-3.2, 2.6, -4, -2.2, -2.8, -5.6, -1.6, -2.8, 1.6, -2.8, 2.8, -5.6, 4, -2.2, 3.2, 2.6, 0, 5]); ctx.fill();
        ctx.fillStyle = 'rgba(214,40,52,0.95)';
        poly([-2.6, -0.6, -0.8, -1.4, -1, -0.2]); ctx.fill(); poly([2.6, -0.6, 0.8, -1.4, 1, -0.2]); ctx.fill();
        poly([-0.6, 2.6, 0.6, 2.6, 0, 3.8]); ctx.fill();
        ctx.restore();
        break;
      }
      case 'bow': {
        // a great ribbon at the back of the head
        const s = 1 + Math.sin(t * 3) * 0.04;
        ctx.save(); ctx.translate(-6.4, -5); ctx.scale(s, s);
        fill(); poly([0, 0, -6.4, -5.4, -7.4, 0.6, 0, 0.8]); ctx.fill();
        poly([0, 0, 4.6, -6, 6.6, -0.6, 0.4, 0.8]); ctx.fill();
        const w = Math.sin(t * 5) * 1.2;
        poly([-0.6, 0.6, -3.6, 8 + w, -1.6, 8.4 + w, 0.4, 1]); ctx.fill();
        poly([0.2, 0.6, 2.6, 7.6 - w, 4.2, 7 - w, 1, 0.6]); ctx.fill();
        ctx.fillStyle = 'rgba(255,238,250,0.95)'; ctx.beginPath(); ctx.arc(0, 0.2, 1.5, 0, G.TAU); ctx.fill();
        ctx.restore();
        break;
      }
      case 'crest': {
        // a lightning bolt fixed to the crown of the hat
        ctx.globalCompositeOperation = 'lighter';
        fill(0.95); poly([1, -10.5, -2.2, -15.6, 0.4, -15.4, -1.6, -20.6, 3.6, -14.2, 1, -14.4, 3.6, -10.5]); ctx.fill();
        break;
      }
      case 'tassel': {
        // a long red cord from the back of the hat
        const w = Math.sin(t * 4) * 1.4;
        ctx.strokeStyle = G.rgba(col, 0.95); ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(-6, -4); ctx.quadraticCurveTo(-11, 2 + w, -9.5 + w, 12); ctx.stroke();
        fill(); ctx.beginPath(); ctx.ellipse(-9.5 + w, 13.4, 1.4, 2.4, 0, 0, G.TAU); ctx.fill();
        break;
      }
    }
    ctx.restore();
  };
})();
