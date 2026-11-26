// Solfall - the road between trials, and the crossroads at its end.
// After a victory the hero walks out onto a night road instead of being handed a menu. The fire is
// lit; the offering turns over its plinths (walk up to one to read it, E to take it); a standing stone
// redraws it if the Shrine's Second Thoughts allows; and past them stands a portal for every boss.
// The first trial of a run is drawn at random; every one after it is chosen here, by walking into
// its portal. A beaten boss's portal is sealed, unless it has turned corrupted: then it is an
// optional, far harder fight that pays a second relic (run.js, corrupt.js). The seventh portal, for
// the final trial, lies dormant. Nothing on the road can hurt you.
'use strict';
(function () {
  const FLOOR = G.FLOOR, F = G.fx, rnd = G.rand, W = G.W, TAU = G.TAU;
  const RW = 3820, WALL_L = 120, WALL_R = RW - 110, PAD = 48;
  const ARCH_X = 210, FIRE_X = 600, MERCH_X = 850, ALTAR_X = 1090, STONE_X = 1400, FOUNT_X = 1610, EVENT_X = 1900, PORTAL_X = 2160, PORTAL_GAP = 192, SEVENTH_X = 3560;
  const TAG_COL = { movement: '127,227,176', weapon: '255,186,92', starlight: '150,225,255', survival: '255,154,166', risk: '255,96,56', pair: '255,210,122', relic: '255,224,138', corrupted: '235,30,80', duo: '255,170,220' };
  // (a hero's own boons are in the hero's colour)
  const colOf = (b) => (b.tag === 'Signature' ? G.hero().col : b.set ? G.SETS[b.set].col : TAG_COL[b.tag.toLowerCase()] || '255,214,140');
  const BLOOD = '235,30,80';
  const bossCol = (id) => (G.THEMES[id] && G.THEMES[id][1] ? G.THEMES[id][1].boss : '236,233,244');

  const REST = G.rest = { near: null, t: 0, taken: -1, msg: '', msgT: 0, flies: [], blades: [], W: RW };
  REST.maxCam = RW - W;
  REST.camTarget = () => G.clamp(G.player.x - W / 2 + G.player.facing * 70, 0, REST.maxCam);
  const P = () => G.player;
  let paint = null; // the camp's drawing helpers (hub.js), fetched when first drawn

  // ------------------------------------------------------------------ a stand-in for the boss
  // Nothing to fight here: no targets, nothing drawn.
  const RB = G.bosses.rest = {
    id: 'rest', kit: true, name: '', short: '', theme: 'hub', tips: [],
    hudCols: [null, ['#ffba5c', '#ffe08a'], ['#ffba5c', '#ffe08a'], ['#ffba5c', '#ffe08a']],
    w: 40, h: 90, ATTACKS: {},
    reset() {
      RB.maxHp = 1; RB.hp = 1; RB.phase = 1; RB.poise = 0; RB.poiseMax = 1;
      RB.staggered = false; RB.invuln = true; RB.active = false; RB.dead = false; RB.dying = false; RB.toppled = false;
      RB.ward = null; RB.attackName = '';
      RB.body = { x: -999, y: FLOOR, flash: 0, kx: 0, kv: 0, hidden: true };
      RB.core = { x: -999, y: FLOOR - 50, r: 10 };
      G.bounds = { l: WALL_L, r: WALL_R }; G.wind = 0;
    },
    attract() { RB.reset(); }, intro() { }, release() { }, interrupt() { }, pushPlayer() { },
    // (the duelling shade, when there is one, can be struck: see "who you meet on the road")
    targets() { return shadeOpen() ? [{ id: 'shade', cx: REST.ev.sh.x, cy: REST.ev.sh.y - 40, hw: 16, hh: 38 }] : []; },
    damage(d, t, o) { if (!t || t.id !== 'shade' || !shadeOpen()) return false; shadeHit(o && o.x, o && o.y); return true; },
    update() { },
    drawGround() { }, draw() { }, drawDebug() { },
  };

  // ------------------------------------------------------------------ the places
  const R = () => G.run;
  const offerTaken = () => REST.taken >= 0 || !(G.run.offer || []).length;
  // a portal's state: open (not yet fought), sealed (beaten), corrupt (beaten, and turned)
  function portalState(id) {
    const run = R();
    if (run.corrupted.includes(id)) return 'corrupt';
    if (run.beaten.includes(id)) return 'sealed';
    return run.runWon() || run.trialsWon() >= G.TRIALS ? 'sealed' : 'open'; // (v2.9a: six trials, then only the last portal)
  }
  let portalSt = [], portalKey = '';
  function portals() {
    const key = G.BOSS_IDS.join(',');
    if (key !== portalKey) {
      portalKey = key;
      portalSt = G.BOSS_IDS.map((id, i) => ({ id: 'portal', boss: id, x: PORTAL_X + i * PORTAL_GAP, reach: 70, top: 292 }));
    }
    return portalSt;
  }
  function altars() {
    const offer = G.run.offer || [];
    return offer.map((b, i) => ({ id: 'boon', i, x: ALTAR_X + (i - (offer.length - 1) / 2) * 124, reach: 52, top: 168 }));
  }
  function places() {
    const out = [{ id: 'fire', x: FIRE_X, reach: 90, top: 150 }].concat(altars());
    if (!R().runWon()) out.push({ id: 'merchant', x: MERCH_X, reach: 60, top: 196 }); // (v2.9k: motes.js)
    if (G.run.rerolls > 0 && REST.taken < 0 && G.run.offerKind === 'boon' && G.run.offer.length) out.push({ id: 'stone', x: STONE_X, reach: 60, top: 190 });
    out.push({ id: 'fountain', x: FOUNT_X, reach: 70, top: 200 });
    out.push(...evPlaces());
    out.push(...portals());
    out.push({ id: 'seventh', x: SEVENTH_X, reach: 100, top: 418 });
    if (R().runWon()) out.push({ id: 'home', x: ARCH_X, reach: 90, top: 330 });
    return out;
  }

  function say(text) { REST.msg = text; REST.msgT = 2.6; }

  // ------------------------------------------------------------------ a boon turning
  // A corrupted boon is not shown for what it is at first. It stands on its plinth as the ordinary
  // boon it is a twisted form of (Keen Edge for Bloodied Edge, Steady Heart for Hollow Crown...), and
  // only when the hero comes near (or after a few seconds on the road) does the corruption take it:
  // its light stutters, crimson cracks run out from the stone and over the plinth, the stone shakes
  // and darkens, and then it breaks and re-forms black-hearted and crimson, with its true name.
  const TURN_SNAP = 1.35, TURN_END = 1.9;
  REST.turn = null;
  function initTurn() {
    const offer = G.run.offer || [], i = offer.findIndex((b) => b.cursed);
    if (i < 0) { REST.turn = null; return; }
    const ids = offer.map((b) => b.id), from = G.boonDef(offer[i].from);
    let mask = from && !ids.includes(from.id) ? from : null;
    if (!mask) mask = G.pick(G.BOONS.filter((b) => !b.heroes && !ids.includes(b.id)));
    REST.turn = { i, mask, t: -1, done: false, cracks: null };
  }
  function startTurn() {
    const tn = REST.turn;
    if (!tn || tn.t >= 0) return;
    tn.t = 0;
    G.audio.play('charge', { dur: TURN_SNAP, k: 0.5 });
  }
  // what a plinth shows, and how far the corruption has taken it (0 to 1; 1 from the snap on)
  const turning = (i) => REST.turn && REST.turn.i === i && !REST.turn.done;
  const shownDef = (i) => (REST.turn && REST.turn.i === i && REST.turn.t < TURN_SNAP ? REST.turn.mask : G.run.offer[i]);
  const turnK = (i) => (!REST.turn || REST.turn.i !== i ? 1 : REST.turn.t < 0 ? 0 : Math.min(1, REST.turn.t / TURN_SNAP));
  const mixRgb = (a, b, k) => { const x = a.split(',').map(Number), y = b.split(',').map(Number); return x.map((v, j) => Math.round(v + (y[j] - v) * k)).join(','); };
  function updateTurn(dt) {
    const tn = REST.turn;
    if (!tn || tn.done) return;
    const s = altars()[tn.i];
    if (!s) return;
    if (tn.t < 0) {
      if (Math.abs(P().x - s.x) < 330 || REST.t > 6) startTurn();
      return;
    }
    const before = tn.t;
    tn.t += dt;
    const k = Math.min(1, tn.t / TURN_SNAP), cy = FLOOR - 104;
    // the build: black motes drawn up out of the stone, crimson sparks, a growing tremor
    if (tn.t < TURN_SNAP) {
      if (Math.random() < dt * (6 + 30 * k)) F.spawn({ x: s.x + rnd(-26, 26), y: cy + rnd(-20, 40), vx: rnd(-14, 14), vy: -rnd(30, 90), life: rnd(0.5, 1), size: rnd(3, 7), color: '16,3,10', wob: 40, rot: rnd(0, 6) });
      if (Math.random() < dt * 14 * k) F.spawn({ kind: 'spark', x: s.x + rnd(-20, 20), y: cy + rnd(-20, 20), vx: rnd(-160, 160), vy: rnd(-160, 60), life: rnd(0.1, 0.25), size: rnd(1.2, 2), color: BLOOD, len: 0.05 });
      if (k > 0.5) F.shake(0.6 * k);
    }
    // the snap: it breaks, and what is left is the corrupted boon
    if (before < TURN_SNAP && tn.t >= TURN_SNAP) {
      G.audio.play('shatter'); G.audio.play('boom', { k: 0.5 });
      F.impact(s.x, cy, 0.06); F.shake(7);
      F.shatter(s.x, cy, BLOOD, 18, { r: 260, r0: 18 });
      F.ring(s.x, cy, { r0: 12, r1: 170, life: 0.5, color: BLOOD, width: 5 });
      F.burst(s.x, cy, { n: 20, color: '16,3,10', speed: [40, 220], life: [0.6, 1.2], size: [4, 8], grav: -80, wob: 50 });
      cardFor = null; // (the card, if it is up, is now the true one)
    }
    if (tn.t >= TURN_END) tn.done = true;
  }
  // crimson cracks across the plinth's face, from the stone outward, drawn as far as k has taken them
  function drawCracks(ctx, s, cy, k) {
    const tn = REST.turn;
    if (!tn.cracks) {
      tn.cracks = [];
      for (let j = 0; j < 7; j++) {
        const a = -Math.PI / 2 + (j / 6 - 0.5) * 3.6 + rnd(-0.2, 0.2), pts = [[0, 0]];
        let x = 0, y = 0, dir = a;
        for (let n = 0; n < 5; n++) { dir += rnd(-0.6, 0.6); const len = rnd(7, 13); x += Math.cos(dir) * len; y += Math.sin(dir) * len; pts.push([x, y]); }
        tn.cracks.push(pts);
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, a] of [[3.2, 0.25], [1.3, 0.85]]) {
      ctx.strokeStyle = G.rgba(BLOOD, a * Math.min(1, k * 1.6)); ctx.lineWidth = w;
      ctx.beginPath();
      for (const pts of tn.cracks) {
        const n = Math.max(1, Math.floor(k * (pts.length - 1) + 1e-6));
        ctx.moveTo(s.x + pts[0][0], cy + pts[0][1]);
        for (let j = 1; j <= n && j < pts.length; j++) ctx.lineTo(s.x + pts[j][0], cy + pts[j][1]);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  REST.enter = function () {
    REST.t = 0; REST.taken = -1; REST.near = null; REST.msgT = 0;
    REST.taken2 = -1; REST.extra = false; REST.awakeT = -1;
    REST.ev = G.run.seeded('event', rollEvent); // (v2.8a: from the day, in a daily trial)
    // (v2.9k) the merchant's stock, once for each road (a run continued keeps the road's own)
    const run = G.run;
    if (!run.runWon() && (!run.merch || run.merch.trial !== run.trial)) { run.seeded('merch', () => G.motes.rollStock()); run.merch.trial = run.trial; }
    initTurn();
    if (!REST.flies.length) {
      for (let i = 0; i < 40; i++) REST.flies.push({ x: WALL_L + Math.random() * (WALL_R - WALL_L), y: FLOOR - 16 - Math.random() * 160, s: 0.5 + Math.random() * 0.9, ph: Math.random() * 6.28, dx: (Math.random() - 0.5) * 14 });
      for (let i = 0; i < 360; i++) REST.blades.push({ x: 40 + Math.random() * (RW - 80), h: 5 + Math.random() * 12, lean: (Math.random() - 0.5) * 3, ph: Math.random() * 6.28, v: 0, b: 0 });
    }
  };
  REST.spawn = () => ARCH_X + 90;
  // (v2.7a) The road's own state, for a saved run (game.js): which plinths are taken, who was met and how
  // far that went, and where the hero stands. A duel with the shade not yet begun is set up again; one
  // under way is let go.
  REST.snap = function () {
    const ev = REST.ev;
    let e = null;
    if (ev) e = ev.kind === 'duel' ? (ev.state === 'wait' ? { kind: 'duel' } : null) : JSON.parse(JSON.stringify(ev));
    return { taken: REST.taken, taken2: REST.taken2, extra: REST.extra, ev: e, x: Math.round(G.player.x), f: G.player.facing };
  };
  REST.restore = function (s) {
    if (!s) return;
    REST.taken = s.taken; REST.taken2 = s.taken2; REST.extra = !!s.extra;
    REST.ev = !s.ev ? null : s.ev.kind === 'duel' ? makeEvent('duel') : s.ev;
    initTurn(); cardFor = null;
    G.player.x = G.clamp(s.x || REST.spawn(), WALL_L + 20, WALL_R - 20); G.player.facing = s.f || 1;
    G.cam.x = REST.camTarget();
  };

  // Make the hero over again where they stand, so a boon or relic just taken works at once.
  REST.retake = retake;
  function retake() {
    const p = P(), x = p.x, y = p.y, f = p.facing, vy = p.vy, ground = p.onGround, ult = p.ult;
    G.run.ult = ult;
    p.reset(); G.flow.reset();
    p.x = x; p.y = y; p.facing = f; p.vy = vy; p.onGround = ground; p.ult = ult; p.ember = G.PLAYER.SEG * p.segs;
    G.ui.buildHp(p.maxHp); G.ui.buildRun();
  }

  // A set's third boon opens its crown: the hero is lit with the set's colour, and the road says so.
  function crowned(was) {
    const cs = R().crownSet();
    if (!cs || cs === was) return;
    const p = P(), S = G.SETS[cs];
    G.sets.reset(); // (a new crown starts empty)
    G.audio.play('crownTaken');
    F.ring(p.x, p.y - 40, { r0: 10, r1: 190, life: 0.6, color: S.col, width: 6 });
    F.burst(p.x, p.y - 40, { n: 26, color: S.col, speed: [40, 260], life: [0.6, 1.3], size: [2, 4.5], grav: -160, wob: 120, jitter: 20 });
    say('The ' + S.name + ' crown: ' + S.crown);
  }
  REST.crowned = crowned;
  // (v2.6c) Two boons each of two sets wake their duo: the two sets' lights wind round the hero.
  // A swap that breaks it puts it to sleep, and the road says that too.
  function duoed(was) {
    const d = R().duo(), p = P();
    if (d === was) return;
    if (!d) { G.audio.play('uiMove'); say('Your duo ' + was.name + ' goes quiet'); return; }
    G.audio.play('crownTaken');
    for (const s of d.of) {
      const c = G.SETS[s].col;
      F.ring(p.x, p.y - 40, { r0: 10, r1: 170, life: 0.6, color: c, width: 5 });
      F.burst(p.x, p.y - 40, { n: 16, color: c, speed: [40, 240], life: [0.6, 1.2], size: [2, 4], grav: -160, wob: 120, jitter: 20 });
    }
    say('Duo: ' + d.name);
  }

  // ------------------------------------------------------------------ the relic awakens (v2.6a)
  // On the road after trials II, IV and VI the run's relic stirs in the fire: it turns in the flames,
  // and the portals wait until it is held to them. Then it rises out of the fire to the hero and
  // wakes a stage (Kindled, Awakened, Ascendant: relics.js). Every relic held wakes with it.
  const AWAKE_T = 1.7, RISE_T = 0.7;
  function awaken() {
    const p = P(), s = G.relics.awaken(), id = G.relics.held()[0], c = G.relics.col(id);
    REST.awakeT = 0; REST.awakeCol = c;
    retake();
    G.audio.play('crownTaken'); G.audio.play('segment');
    F.shake(5); F.stop(0.06);
    F.ring(FIRE_X, FLOOR - 80, { r0: 10, r1: 220, life: 0.6, color: c, width: 6 });
    F.burst(FIRE_X, FLOOR - 40, { n: 30, color: c, speed: [80, 320], angle: -Math.PI / 2, spread: 1.4, life: [0.5, 1.1], size: [2, 4], grav: -140 });
    say(G.relicDef(id).name + ': ' + G.relics.STAGES[s]);
    cardFor = null;
  }
  function updateAwake(dt) {
    if (REST.awakeT < 0) return;
    const before = REST.awakeT, p = P(), c = REST.awakeCol;
    REST.awakeT += dt;
    // it reaches the hero: a ring closes on them, and the stage is named over their head
    if (before < RISE_T && REST.awakeT >= RISE_T) {
      G.audio.play('heal');
      F.ring(p.x, p.y - 40, { r0: 150, r1: 16, life: 0.4, color: c, width: 5 });
      F.burst(p.x, p.y - 40, { n: 22, color: c, speed: [40, 240], life: [0.6, 1.3], size: [2, 4.5], grav: -160, wob: 120, jitter: 20 });
      F.text(p.x, p.y - 120, G.relics.STAGES[G.run.awake].toUpperCase(), { color: c, size: 22, life: 1.4 });
    }
    if (REST.awakeT >= AWAKE_T) REST.awakeT = -1;
  }
  // where the relic is drawn: turning in the flames while it waits, then rising to the hero
  function relicAt(t) {
    const bob = Math.sin(t * 2.2) * 5, fx = FIRE_X, fy = FLOOR - 92 + bob;
    if (REST.awakeT >= 0 && REST.awakeT < RISE_T) {
      const k = REST.awakeT / RISE_T, e = k * k * (3 - 2 * k), p = P();
      return { x: fx + (p.x - fx) * e, y: fy + (p.y - 60 - fy) * e - Math.sin(Math.PI * k) * 90, k };
    }
    return G.relics.pending() ? { x: fx, y: fy, k: 0 } : null;
  }

  function use(s) {
    const p = P(), run = R();
    if (s.id === 'boon') {
      if (turning(s.i)) { startTurn(); return; } // (nothing can be taken while it turns)
      if (mineI(s.i) || closed()) { G.audio.play('uiMove'); say(mineI(s.i) ? 'Yours for the run' : 'One each rest'); return; }
      const b = run.offer[s.i], c = colOf(b), crownWas = run.crownSet(), duoWas = run.duo();
      if (b.relicReward) run.extraRelics.push(b.id); else run.take(s.i);
      if (REST.taken < 0) REST.taken = s.i; else REST.taken2 = s.i;
      retake();
      G.audio.play('segment'); G.audio.play('heal');
      F.flash(c, 0.16, 0.3); F.shake(4);
      F.shatter(s.x, FLOOR - 104, c, 14, { r: 240, r0: 24 });
      F.ring(s.x, FLOOR - 104, { r0: 10, r1: 150, life: 0.45, color: c, width: 6 });
      F.burst(p.x, p.y - 10, { n: 16, color: c, speed: [20, 130], life: [0.6, 1.2], size: [2, 4], grav: -220, wob: 130, jitter: 22 });
      say(run.replaced ? b.name + ' (for ' + run.replaced.name + ')' : b.name);
      crowned(crownWas);
      duoed(duoWas);
    } else if (s.id === 'stone') {
      if (run.reroll()) {
        G.audio.play('uiSelect'); G.audio.play('whoosh'); F.shake(4);
        for (const a of altars()) F.shatter(a.x, FLOOR - 104, '236,233,244', 8, { r: 160, r0: 16 });
        initTurn();
        say('The offering is redrawn');
      } else G.audio.play('empty');
    } else if (s.id === 'portal') {
      const st = portalState(s.boss);
      if (st === 'sealed') { G.audio.play('uiMove'); say(run.beaten.includes(s.boss) ? 'Sealed: beaten this run' : 'Sealed'); return; }
      if (!offerTaken()) { G.audio.play('empty'); say('Take from the offering first'); return; }
      if (G.relics.pending()) { G.audio.play('empty'); say('Your relic stirs at the fire'); return; }
      G.audio.play('uiSelect');
      if (st === 'corrupt') { G.audio.play('roar'); F.shake(8); }
      G.enterPortal(s.boss, st === 'corrupt');
    } else if (s.id === 'seventh') {
      // (v2.9a) six trials won: it opens on Sol
      if (run.solOpen()) {
        if (!offerTaken()) { G.audio.play('empty'); say('Take from the offering first'); return; }
        if (G.relics.pending()) { G.audio.play('empty'); say('Your relic stirs at the fire'); return; }
        // (v3.0a) the run ends at Sol: corrupted portals left open close for good. Warn once first.
        if (run.corrupted.length && !run.lastWarned) { run.lastWarned = true; G.audio.play('uiMove'); say('Corrupted portals close once you go in. Touch again to go'); REST.msgT = 3.6; return; }
        G.audio.play('uiSelect'); G.audio.play('charge', { dur: 0.8 }); F.flash('255,250,236', 0.7, 0.8); F.shake(6);
        G.enterPortal('sol', false);
        return;
      }
      G.audio.play(run.runWon() ? 'pulse' : 'uiMove', { k: 0.4 });
      say(run.runWon() ? 'Its light is yours now' : 'Dormant');
    } else if (s.id === 'home') {
      G.audio.play('uiSelect');
      G.toHub('gate');
    } else if (s.id === 'fountain') {
      // the Cleansing Fountain: purge a corrupted boon's bane, for Motes (ui.js shows the choice)
      if (!run.banes().length) { G.audio.play('uiMove'); say(run.order.some((id) => G.boonDef(id).cursed) ? 'Nothing left to cleanse' : 'Nothing here needs cleansing'); return; }
      G.audio.play('uiSelect');
      G.ui.showFountain();
    } else if (s.id === 'merchant') { G.audio.play('uiSelect'); G.ui.showMerchant(); }
    else if (s.id === 'card') turnCard(s);
    else if (s.id === 'smith') smith();
    else if (s.id === 'pledge') pledge(s);
    else if (s.id === 'duel') startDuel();
    else if (s.id === 'door') {
      G.audio.play('uiSelect'); G.audio.play('charge', { dur: 0.5 });
      F.flash('255,226,186', 0.5, 0.5);
      G.enterChampion();
    }
    else if (s.id === 'fire' && G.relics.pending()) awaken();
    else if (s.id === 'fire') {
      G.audio.play('whoosh');
      F.burst(FIRE_X, FLOOR - 30, { n: 24, color: '255,170,90', speed: [60, 260], angle: -Math.PI / 2, spread: 1.2, life: [0.4, 1], size: [1.6, 3.4], grav: -120 });
      say('The fire is warm');
    }
  }

  // (v2.6e) Banish (once the Shrine's Banishment is bought): the flourish key at a plinth strikes its
  // boon from the run and draws another there.
  function banish(s) {
    const run = R();
    if (turning(s.i)) { startTurn(); return; }
    if (mineI(s.i) || closed()) { G.audio.play('uiMove'); return; }
    if (run.offerKind !== 'boon') { G.audio.play('empty'); say('Spoils cannot be banished'); return; }
    if (run.banishes <= 0) { G.audio.play('empty'); say('No banish left this run'); return; }
    const old = run.offer[s.i], cy = FLOOR - 104, wasCursed = !!old.cursed;
    const nb = run.banish(s.i);
    G.audio.play('shatter'); G.audio.play('whoosh'); F.shake(5);
    F.shatter(s.x, cy, '90,84,110', 14, { r: 220, r0: 20 });
    F.burst(s.x, cy, { n: 16, color: '20,16,30', speed: [60, 260], life: [0.5, 1], size: [4, 8], grav: -60 });
    if (wasCursed || (REST.turn && REST.turn.i === s.i)) initTurn();
    cardFor = null;
    say(old.name + ' banished' + (nb ? '' : ''));
  }

  // ------------------------------------------------------------------ who you meet on the road (v2.2a)
  // On a little over half the roads someone waits between the fountain and the portals: a
  // fortune-teller with three face-down cards, a wandering smith, an altar that takes a pledge, or a
  // shade that wants a duel. Never the same one two roads running.
  const EVENT_CHANCE = 0.55;
  const EV_COL = { fortune: '214,170,255', smith: '255,170,90', pledge: '235,30,80', duel: '170,160,210' };
  REST.ev = null; REST.taken2 = -1; REST.extra = false;
  // (with the altar's pledge made, a second boon may be taken from the offering)
  const mineI = (i) => REST.taken === i || REST.taken2 === i;
  const closed = () => REST.taken >= 0 && !(REST.extra && REST.taken2 < 0);
  {
    const S = G.audio.synth;
    // a card turned on cloth
    G.audio.define('cardflip', () => {
      S.noise({ dur: 0.07, vol: 0.18, type: 'bandpass', f0: 2600, q: 1.5 });
      S.tone({ type: 'sine', f0: 660, f1: 990, dur: 0.16, vol: 0.05, delay: 0.04 });
    });
    // the smith's hammer on the anvil
    G.audio.define('anvil', (o) => {
      const k = (o && o.k) || 1;
      S.noise({ dur: 0.03, vol: 0.2 * k, type: 'highpass', f0: 3000 });
      S.tone({ type: 'triangle', f0: 1870, f1: 1840, dur: 0.5, vol: 0.06 * k });
      S.tone({ type: 'sine', f0: 2810, f1: 2790, dur: 0.35, vol: 0.03 * k });
    });
    // a pledge taken: a low drone and a bell struck under it
    G.audio.define('pledge', () => {
      S.tone({ type: 'sawtooth', f0: 55, f1: 52, dur: 1.1, vol: 0.06, attack: 0.1 });
      S.tone({ type: 'sine', f0: 311, f1: 300, dur: 1.2, vol: 0.08 });
      S.tone({ type: 'sine', f0: 466, f1: 452, dur: 0.9, vol: 0.04 });
    });
    // the shade, drawing in the dark: a thin hiss, then a dry snap as it goes
    G.audio.define('duelprep', () => { S.noise({ dur: 0.3, vol: 0.08, type: 'highpass', f0: 5200, attack: 0.2 }); });
    G.audio.define('dueldash', () => {
      S.noise({ dur: 0.12, vol: 0.28, type: 'bandpass', f0: 2200, f1: 900, q: 1.2 });
      S.tone({ type: 'triangle', f0: 1500, f1: 600, dur: 0.1, vol: 0.05 });
    });
    G.audio.define('duelhit', () => {
      S.noise({ dur: 0.05, vol: 0.3, type: 'highpass', f0: 3400 });
      S.tone({ type: 'square', f0: 880, f1: 1320, dur: 0.09, vol: 0.05 });
      S.tone({ type: 'sine', f0: 1320, dur: 0.4, vol: 0.05, delay: 0.05 });
    });
  }
  // The Champion's doorway (v2.5a, champion.js): from the road before trial III to the one before
  // trial VI, now and then, once a run, a crack of dawn light opens in a rock where the road's meeting
  // would be, and he sits inside it. It takes the place of whoever else might have been met.
  const CHAMP_CHANCE = 0.2;
  const champDoor = () => { const run = R(); return !run.champMet && run.trial >= 2 && run.trial <= 5 && run.offerKind === 'boon' && !run.runWon() && !!G.bosses.champion && Math.random() < CHAMP_CHANCE; };
  REST.doorX = EVENT_X;
  // back on the road from his duel: the doorway has closed
  REST.back = function (lost) {
    REST.near = null;
    if (REST.ev && REST.ev.kind === 'champion') REST.ev.done = true;
    say(lost ? 'He helps you up. The doorway closes behind you.' : 'He nods, and the doorway closes');
    cardFor = null;
  };
  function rollEvent() {
    const run = R();
    if (G.debug.event) return makeEvent(G.debug.event);
    if (champDoor()) return makeEvent('champion');
    if (run.runWon() || run.offerKind !== 'boon' || Math.random() >= EVENT_CHANCE) return null;
    const kinds = ['fortune', 'smith', 'pledge', 'duel'].filter((k) => k !== run.lastEvent && (k !== 'smith' || run.temperable().length));
    return makeEvent(G.pick(kinds));
  }
  function makeEvent(kind) {
    R().lastEvent = kind;
    const ev = { kind, done: false, t: 0 };
    if (kind === 'fortune') ev.cards = G.shuffle(['boon', 'shards', 'curse']).map((what, i) => ({ what, i, flip: 0 }));
    if (kind === 'duel') { ev.state = 'wait'; ev.sh = shade(EVENT_X + 30, FLOOR, -1, 'kneel'); ev.hits = 0; ev.dashes = 0; }
    if (kind === 'smith') ev.beat = 0;
    if (kind === 'champion') R().champMet = true;
    return ev;
  }
  function evPlaces() {
    const ev = REST.ev;
    if (!ev) return [];
    if (ev.kind === 'fortune') return ev.cards.map((c) => ({ id: 'card', i: c.i, x: EVENT_X + (c.i - 1) * CARD_GAP, reach: 34, top: 150 }));
    if (ev.kind === 'smith') return [{ id: 'smith', x: EVENT_X, reach: 80, top: 190 }];
    if (ev.kind === 'pledge') return [{ id: 'pledge', x: EVENT_X, reach: 70, top: 220 }];
    if (ev.kind === 'duel' && ev.state === 'wait') return [{ id: 'duel', x: ev.sh.x, reach: 90, top: 150 }];
    if (ev.kind === 'champion' && !ev.done) return [{ id: 'door', x: EVENT_X, reach: 80, top: 262 }];
    return [];
  }

  // -- the fortune-teller: three cards face down; one is a boon, one Motes (v2.9k: was Sunshards), one a corrupted boon
  const CARD_GAP = 74;
  function turnCard(s) {
    const ev = REST.ev, run = R(), c = ev.cards[s.i];
    if (ev.done) { G.audio.play('uiMove'); say('The cards are spent'); return; }
    ev.done = true; ev.pick = c.i;
    for (const k of ev.cards) k.flip = k === c ? 0.001 : -0.25 - 0.15 * Math.abs(k.i - c.i); // (the others turn a moment later)
    let got = '', col = EV_COL.fortune;
    if (c.what === 'boon') { const was = run.crownSet(), dw = run.duo(), b = run.freeBoon(); if (b) { got = b.name; col = colOf(b); crowned(was); duoed(dw); } else c.what = 'shards'; }
    if (c.what === 'curse') { const b = run.freeCurse(); if (b) { got = b.name; col = BLOOD; } else c.what = 'shards'; }
    if (c.what === 'shards') { G.motes.add(30); got = '+30 Motes'; col = G.motes.COL; }
    retake();
    G.audio.play('cardflip'); G.audio.play(c.what === 'curse' ? 'shatter' : 'segment');
    F.shake(c.what === 'curse' ? 6 : 3);
    F.ring(s.x, FLOOR - 74, { r0: 8, r1: 120, life: 0.45, color: col, width: 5 });
    F.burst(s.x, FLOOR - 74, { n: 14, color: col, speed: [40, 200], life: [0.5, 1], size: [2, 4], grav: -160, wob: 90 });
    if (c.what === 'curse') F.shatter(s.x, FLOOR - 74, BLOOD, 10, { r: 200, r0: 14 });
    say(got);
  }

  // -- the wandering smith: Motes (v2.9k: was Sunshards) for one more of a boon you hold (ui.js shows the choice)
  function smith() {
    if (!R().temperable().length) { G.audio.play('uiMove'); say('Nothing you hold can be tempered'); return; }
    G.audio.play('uiSelect');
    G.ui.showSmith();
  }
  // (v2.9k) something bought from the merchant (ui.js): a boon is worked like one from the offering
  REST.bought = function (row, crownWas, duoWas) {
    const p = P(), c = row.kind === 'boon' ? colOf(G.boonDef(row.id)) : row.kind === 'item' ? G.motes.item(row.id).col : G.hero().col;
    retake();
    G.audio.play('segment');
    F.burst(p.x, p.y - 10, { n: 16, color: c, speed: [20, 130], life: [0.6, 1.2], size: [2, 4], grav: -220, wob: 130, jitter: 22 });
    F.burst(MERCH_X, FLOOR - 70, { n: 10, color: G.motes.COL, speed: [40, 160], life: [0.4, 0.9], size: [1.5, 3], grav: -120 });
    if (row.kind === 'boon') { crowned(crownWas); duoed(duoWas); }
    say(row.kind === 'mend' ? 'One more health, for the run' : row.name);
  };
  REST.tempered = function () {
    const x = EVENT_X;
    G.audio.play('anvil', { k: 1.4 }); G.audio.play('segment');
    F.shake(4);
    F.burst(x, FLOOR - 62, { n: 22, color: '255,186,92', speed: [120, 520], angle: -Math.PI / 2, spread: 1.6, life: [0.2, 0.6], kind: 'spark', size: [1.5, 3], grav: 900 });
    retake();
  };

  // -- the omen altar: an omen more in the next trial, for a second boon from this offering
  function pledge(s) {
    const ev = REST.ev, run = R();
    if (ev.done) { G.audio.play('uiMove'); say('Your pledge is made'); return; }
    ev.done = true; run.pledge = true; REST.extra = true; cardFor = null;
    G.audio.play('pledge'); F.shake(5);
    F.ring(s.x, FLOOR - 120, { r0: 10, r1: 170, life: 0.6, color: BLOOD, width: 5 });
    F.burst(s.x, FLOOR - 120, { n: 20, color: '16,3,10', speed: [40, 200], life: [0.6, 1.2], size: [4, 8], grav: -80, wob: 50 });
    F.burst(P().x, P().y - 30, { n: 12, color: BLOOD, speed: [60, 220], life: [0.3, 0.7], size: [2, 3], kind: 'spark' });
    say(REST.taken >= 0 ? 'Take a second boon' : 'Take two from the offering');
  }

  // -- the duelling shade: it dashes at you, six times at most. Strike it three times before its blade
  // touches you and it leaves a relic. Touched, the duel is lost (nothing on the road can hurt you).
  const SH_IN = 0.22, SH_PREP = 0.55, SH_LOCK = 0.15, SH_SPEED = 1300, SH_REST = 0.6, SH_DASHES = 6, SH_WIN = 3;
  function shade(x, y, face, pose) { return { x, y, face, pose, p: G.veilShade.pose(pose), to: null, clone: true, tilt: 0, vis: 0.85, flash: 0, vy: 0 }; }
  function setPose(sh, name) { sh.pose = name; sh.to = G.veilShade.pose(name); }
  function startDuel() {
    const ev = REST.ev;
    ev.state = 'fight'; ev.step = 'out'; ev.t = 0;
    setPose(ev.sh, 'idle');
    G.audio.play('uiSelect'); G.audio.play('duelprep');
  }
  const shadeOpen = () => { const ev = REST.ev; return ev && ev.kind === 'duel' && ev.state === 'fight' && ev.step !== 'out' && ev.sh.vis > 0.5; };
  function shadeHit(x, y) {
    const ev = REST.ev, sh = ev.sh;
    ev.hits++; sh.flash = 1;
    G.audio.play('duelhit'); F.stop(0.06); F.shake(4);
    F.ring(sh.x, sh.y - 40, { r0: 6, r1: 70, life: 0.25, color: EV_COL.duel, width: 4 });
    F.burst(sh.x, sh.y - 40, { n: 10, color: EV_COL.duel, speed: [80, 320], life: [0.2, 0.5], size: [2, 4], kind: 'spark' });
    if (ev.hits >= SH_WIN) { duelOver(true); return; }
    ev.step = 'out'; ev.t = 0; ev.locked = false; // (struck, it is gone, and comes again from somewhere else)
  }
  function duelOver(won) {
    const ev = REST.ev, sh = ev.sh, run = R();
    ev.state = won ? 'won' : 'lost'; ev.done = true; ev.t = 0; sh.tilt = 0;
    setPose(sh, won ? 'kneel' : 'sheathe');
    if (!won) { G.audio.play('uiBack'); say('Not this time'); return; }
    const pool = G.RELICS.filter((r) => G.meta.unlocked(r) && !G.relic(r.id) && r.id !== 'crown' && r.id !== 'phoenix');
    G.audio.play('pulse'); G.audio.play('heal');
    F.ring(sh.x, sh.y - 40, { r0: 10, r1: 160, life: 0.5, color: paint.GOLD, width: 6 });
    F.burst(P().x, P().y - 10, { n: 16, color: paint.GOLD, speed: [20, 130], life: [0.6, 1.2], size: [2, 4], grav: -220, wob: 130, jitter: 22 });
    if (pool.length) { const r = G.pick(pool); run.extraRelics.push(r.id); retake(); say(r.name); }
    else { G.motes.add(40); say('+40 Motes'); } // (v2.9k: was 60 Sunshards)
  }
  function shadeSpot() {
    const ev = REST.ev, p = P();
    const side = p.x < WALL_L + 420 ? 1 : p.x > WALL_R - 420 ? -1 : Math.random() < 0.5 ? -1 : 1;
    const air = ev.dashes >= 2 && Math.random() < 0.35;
    return { x: G.clamp(p.x + side * rnd(250, 340), WALL_L + 50, WALL_R - 50), y: air ? FLOOR - rnd(140, 180) : FLOOR, air };
  }
  function updateDuel(dt) {
    const ev = REST.ev, sh = ev.sh, p = P();
    if (sh.to) for (let i = 0; i < sh.p.length; i++) sh.p[i] += (sh.to[i] - sh.p[i]) * Math.min(1, dt * 18);
    sh.flash = Math.max(0, sh.flash - dt * 5);
    ev.t += dt;
    if (ev.state === 'wait') {
      sh.face = G.sign(p.x - sh.x) || -1;
      if (Math.random() < dt * 3) F.spawn({ x: sh.x + rnd(-20, 20), y: FLOOR - rnd(0, 50), vx: rnd(-10, 10), vy: -rnd(20, 50), life: rnd(0.6, 1.1), size: rnd(4, 8), color: '20,17,32', wob: 30, rot: rnd(0, 6) });
      return;
    }
    if (ev.state !== 'fight') {
      // the end: a bow (won) or the blades put away (lost), then it is gone
      if (sh.y < FLOOR) { sh.vy += 2400 * dt; sh.y = Math.min(FLOOR, sh.y + sh.vy * dt); }
      if (ev.t > 0.9) sh.vis = Math.max(0, sh.vis - dt / 0.4);
      return;
    }
    if (ev.step === 'out') {
      sh.vis = Math.max(0, sh.vis - dt / 0.16);
      if (sh.vis > 0) return;
      if (ev.dashes >= SH_DASHES) { duelOver(false); return; }
      const s = shadeSpot();
      sh.x = s.x; sh.y = s.y; sh.vy = 0; sh.tilt = 0; sh.face = G.sign(p.x - sh.x) || 1;
      sh.p = G.veilShade.pose(s.air ? 'air' : 'crouch'); setPose(sh, s.air ? 'air' : 'crouch');
      ev.step = 'in'; ev.t = 0; ev.locked = false;
      F.dust(sh.x, sh.y - 30, 6, { speed: [20, 120], size: [8, 16], life: [0.3, 0.7], up: 40, a: 0.45, color: '20,17,32', jitter: 12 });
    } else if (ev.step === 'in') {
      sh.vis = Math.min(1, ev.t / SH_IN);
      if (ev.t >= SH_IN) { ev.step = 'prep'; ev.t = 0; G.audio.play('duelprep'); }
    } else if (ev.step === 'prep') {
      if (!ev.locked) sh.face = G.sign(p.x - sh.x) || sh.face;
      if (!ev.locked && ev.t >= SH_PREP - SH_LOCK) {
        ev.locked = true; ev.tx = p.x; ev.ty = Math.min(FLOOR, p.y);
        F.glint(sh.x + sh.face * 18, sh.y - 40, 20, '236,233,244', 0.18);
      }
      if (ev.t >= SH_PREP) {
        ev.step = 'go'; ev.t = 0; ev.dashes++;
        const dx = ev.tx - sh.x, dy = ev.ty - sh.y;
        sh.face = G.sign(dx) || sh.face;
        sh.tilt = Math.atan2(dy, Math.abs(dx) || 1) * 0.8;
        setPose(sh, 'dash'); sh.p = sh.to.slice();
        G.audio.play('dueldash');
      }
    } else if (ev.step === 'go') {
      const dx = ev.tx - sh.x, dy = ev.ty - sh.y, d = Math.hypot(dx, dy), stepD = SH_SPEED * dt;
      const k = d <= stepD ? 1 : stepD / d;
      sh.x += dx * k; sh.y += dy * k;
      if (Math.random() < 0.9) F.spawn({ x: sh.x + rnd(-6, 6), y: sh.y - 40 + rnd(-14, 14), vx: -dx / (d || 1) * 60, vy: -dy / (d || 1) * 60, life: 0.25, size: rnd(5, 9), color: '20,17,32', wob: 10 });
      // its blade on the hero ends the duel; a dash through it is a dodge
      if (Math.abs(sh.x - p.x) < 26 && sh.y - 76 < p.y && sh.y > p.y - 76 && p.iframes <= 0) {
        const dir = G.sign(p.x - sh.x) || sh.face;
        p.vx = dir * 320; p.vy = -260; p.onGround = false; p.plat = null;
        F.shake(6); F.flash('170,160,210', 0.12, 0.25);
        F.burst(p.x, p.y - 30, { n: 10, color: EV_COL.duel, speed: [80, 300], life: [0.2, 0.5], size: [2, 3.5], kind: 'spark' });
        duelOver(false); return;
      }
      if (k >= 1) { ev.step = 'rest'; ev.t = 0; sh.tilt = 0; setPose(sh, 'skid'); F.dust(sh.x, sh.y, 4, { speed: [30, 120], size: [5, 9], up: 30 }); }
    } else if (ev.step === 'rest') {
      if (sh.y < FLOOR) { sh.vy += 2400 * dt; sh.y = Math.min(FLOOR, sh.y + sh.vy * dt); }
      if (ev.t >= SH_REST) { ev.step = 'out'; ev.t = 0; setPose(sh, 'idle'); }
    }
  }
  function updateEvent(dt) {
    const ev = REST.ev;
    if (!ev) return;
    if (ev.kind === 'duel') updateDuel(dt);
    if (ev.kind === 'fortune') for (const c of ev.cards) if (c.flip !== 0 && c.flip < 1) c.flip = Math.min(1, c.flip + dt / 0.35);
    if (ev.kind === 'smith') {
      // the smith's hammer comes down every so often, whether or not anyone is watching
      ev.beat += dt;
      if (ev.beat >= 1.5) {
        ev.beat = 0;
        if (seen(EVENT_X, 100)) G.audio.play('anvil', { k: 0.35 });
        F.burst(EVENT_X - 4, FLOOR - 62, { n: 7, color: '255,186,92', speed: [80, 300], angle: -Math.PI / 2, spread: 1.5, life: [0.15, 0.4], kind: 'spark', size: [1.2, 2.2], grav: 900 });
      }
    }
    if (ev.kind === 'champion' && !ev.done && Math.random() < dt * 9) F.spawn({ x: EVENT_X + rnd(-8, 8), y: FLOOR - rnd(20, 190), vx: rnd(-40, -5), vy: -rnd(5, 30), life: rnd(1, 2), size: rnd(1.2, 2.4), color: '255,226,186', grav: -8 });
    if (ev.kind === 'pledge' && !ev.done && Math.random() < dt * 10) F.spawn({ kind: 'spark', x: EVENT_X + rnd(-12, 12), y: FLOOR - 120 + rnd(-10, 10), vx: rnd(-20, 20), vy: -rnd(60, 160), life: rnd(0.2, 0.5), size: rnd(1.2, 2.2), color: BLOOD, len: 0.05 });
  }

  // -- drawing them
  function drawEvent(ctx, t) {
    const ev = REST.ev;
    if (!ev || !seen(EVENT_X, 500)) return;
    const { poly, glow, pool, block, diamond, STONE, STONE2, DARK, RIM } = paint, x = EVENT_X;
    if (ev.kind === 'fortune') {
      const c = EV_COL.fortune;
      glow(ctx, c, x, FLOOR - 110, 190, 0.16 + 0.03 * Math.sin(t * 2));
      // the teller: hooded, seated behind a cloth-covered table, a lantern hung beside
      poly(ctx, [x - 34, FLOOR - 50, x - 30, FLOOR - 150, x - 16, FLOOR - 178, x, FLOOR - 186, x + 16, FLOOR - 178, x + 30, FLOOR - 150, x + 34, FLOOR - 50], '#2a2048', G.rgba(c, 0.25));
      ctx.fillStyle = DARK; ctx.beginPath(); ctx.ellipse(x, FLOOR - 162, 10, 12, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      for (const e of [-1, 1]) { ctx.fillStyle = G.rgba(c, 0.6 + 0.3 * Math.sin(t * 1.3 + e)); ctx.fillRect(x + e * 4 - 1.5, FLOOR - 165, 3, 2); }
      ctx.globalCompositeOperation = 'source-over';
      const lx = x + 96, ly = FLOOR - 150 + Math.sin(t * 1.4) * 2;
      ctx.strokeStyle = G.rgba(RIM, 0.3); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 96, FLOOR - 200); ctx.lineTo(lx, ly - 10); ctx.stroke();
      poly(ctx, [x + 96, FLOOR - 200, x + 96, FLOOR, x + 100, FLOOR, x + 100, FLOOR - 200], STONE);
      glow(ctx, '255,214,160', lx, ly, 60, 0.3 + 0.05 * Math.sin(t * 9));
      poly(ctx, [lx - 7, ly - 10, lx + 7, ly - 10, lx + 5, ly + 8, lx - 5, ly + 8], '#2a2048');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,214,160,0.8)'; ctx.fillRect(lx - 2.5, ly - 6, 5, 10); ctx.globalCompositeOperation = 'source-over';
      // the table and its cloth
      poly(ctx, [x - 128, FLOOR - 52, x + 128, FLOOR - 52, x + 116, FLOOR, x - 116, FLOOR], '#1d1436');
      poly(ctx, [x - 128, FLOOR - 52, x + 128, FLOOR - 52, x + 122, FLOOR - 30, x + 70, FLOOR - 24, x, FLOOR - 32, x - 70, FLOOR - 24, x - 122, FLOOR - 30], '#2c1d4c');
      ctx.fillStyle = G.rgba(c, 0.35); ctx.fillRect(x - 128, FLOOR - 53, 256, 2);
      // the three cards, standing on the cloth
      for (const k of ev.cards) {
        const cx = x + (k.i - 1) * CARD_GAP, picked = ev.pick === k.i, on = REST.near && REST.near.id === 'card' && REST.near.i === k.i && !ev.done;
        const f = Math.max(0, k.flip), face = f >= 0.5, wk = Math.abs(Math.cos(f * Math.PI)), lift = (picked ? 14 * Math.min(1, f * 2) : 0) + (on ? 6 : 0) + Math.sin(t * 1.6 + k.i * 2) * 1.5;
        const cy = FLOOR - 82 - lift, hw = 17 * Math.max(0.06, wk), hh = 25;
        const col = !face ? c : k.what === 'curse' ? BLOOD : k.what === 'shards' ? paint.GOLD : G.hero().col;
        if (on || (face && picked)) glow(ctx, col, cx, cy, 60, on ? 0.3 : 0.4);
        poly(ctx, [cx - hw, cy - hh, cx + hw, cy - hh, cx + hw, cy + hh, cx - hw, cy + hh], face ? (k.what === 'curse' ? '#16040c' : '#191230') : '#231a40');
        ctx.strokeStyle = G.rgba(col, face && !picked ? 0.45 : 0.85); ctx.lineWidth = 1.5; ctx.strokeRect(cx - hw + 2, cy - hh + 2, hw * 2 - 4, hh * 2 - 4);
        if (wk < 0.15) continue;
        ctx.globalCompositeOperation = 'lighter';
        const a = face && !picked ? 0.5 : 0.95;
        if (!face) { diamond(ctx, cx, cy, 5 * wk, 9, G.rgba(c, 0.8)); ctx.fillStyle = G.rgba(c, 0.5); ctx.fillRect(cx - 1 * wk, cy - 18, 2 * wk, 4); ctx.fillRect(cx - 1 * wk, cy + 14, 2 * wk, 4); }
        else if (k.what === 'boon') { diamond(ctx, cx, cy, 7 * wk, 13, G.rgba(col, a)); diamond(ctx, cx, cy, 3 * wk, 7, 'rgba(255,255,255,' + a + ')'); }
        else if (k.what === 'shards') { for (const [ox, oy] of [[-5, 4], [5, 4], [0, -6]]) diamond(ctx, cx + ox * wk, cy + oy, 3.5 * wk, 6, G.rgba(col, a)); }
        else {
          ctx.globalCompositeOperation = 'source-over';
          diamond(ctx, cx, cy, 7 * wk, 13, G.rgba(BLOOD, a)); diamond(ctx, cx, cy, 3 * wk, 7, 'rgba(10,0,6,' + a + ')');
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      pool(ctx, c, x, 150, 0.2);
    } else if (ev.kind === 'smith') {
      const c = EV_COL.smith, k = ev.beat / 1.5, up = k < 0.75 ? Math.min(1, k / 0.6) : 1 - (k - 0.75) / 0.25; // the hammer: raised slowly, brought down fast
      // the forge: a low stone box with coals in its mouth
      glow(ctx, c, x + 82, FLOOR - 40, 150, 0.32 + 0.05 * Math.sin(t * 7));
      poly(ctx, [x + 46, FLOOR, x + 50, FLOOR - 70, x + 118, FLOOR - 70, x + 122, FLOOR], STONE);
      poly(ctx, [x + 66, FLOOR - 16, x + 66, FLOOR - 46, x + 102, FLOOR - 46, x + 102, FLOOR - 16], '#2a0e06');
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { ctx.fillStyle = G.rgba(c, 0.5 + 0.3 * Math.sin(t * 5 + i * 1.7)); ctx.fillRect(x + 70 + i * 6, FLOOR - 24 - (i % 2) * 4, 5, 4); }
      ctx.globalCompositeOperation = 'source-over';
      // the anvil
      poly(ctx, [x - 30, FLOOR - 50, x + 26, FLOOR - 50, x + 36, FLOOR - 58, x + 22, FLOOR - 64, x - 34, FLOOR - 64, x - 46, FLOOR - 58], '#2b2440');
      poly(ctx, [x - 14, FLOOR - 50, x + 10, FLOOR - 50, x + 16, FLOOR, x - 20, FLOOR], '#1f1a33');
      ctx.fillStyle = G.rgba(RIM, 0.45); ctx.fillRect(x - 34, FLOOR - 64, 56, 2);
      // a glowing blank on it, cooling between blows
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = G.rgba(c, 0.5 + 0.4 * (1 - k)); ctx.fillRect(x - 16, FLOOR - 68, 22, 4); ctx.globalCompositeOperation = 'source-over';
      // the smith: broad and hooded, one arm raising the hammer
      const sx = x - 62, sy = FLOOR;
      poly(ctx, [sx - 26, sy, sx - 30, sy - 70, sx - 22, sy - 112, sx - 6, sy - 132, sx + 12, sy - 128, sx + 24, sy - 104, sx + 26, sy - 70, sx + 22, sy], '#17122c');
      ctx.fillStyle = DARK; ctx.beginPath(); ctx.ellipse(sx + 6, sy - 116, 8, 10, 0, 0, TAU); ctx.fill();
      const sh = [sx + 18, sy - 100], ang = -0.4 - 1.6 * up, hx = sh[0] + Math.cos(ang) * 40, hy = sh[1] + Math.sin(ang) * 40;
      ctx.strokeStyle = '#17122c'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(ang) * 16, hy + Math.sin(ang) * 16); ctx.stroke(); ctx.lineCap = 'butt';
      const hd = [hx + Math.cos(ang) * 18, hy + Math.sin(ang) * 18];
      ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(ang + Math.PI / 2); ctx.fillStyle = '#3c3658'; ctx.fillRect(-9, -5, 18, 10); ctx.restore();
      pool(ctx, c, x + 20, 140, 0.24);
    } else if (ev.kind === 'pledge') {
      const c = ev.done ? paint.GOLD : BLOOD, cy = FLOOR - 120 + Math.sin(t * 1.5) * 3;
      if (!ev.done) {
        const g = ctx.createRadialGradient(x, cy, 10, x, cy, 180);
        g.addColorStop(0, 'rgba(6,0,4,0.5)'); g.addColorStop(1, 'rgba(6,0,4,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 180, cy - 180, 360, 360);
      }
      glow(ctx, c, x, cy, ev.done ? 90 : 140, ev.done ? 0.12 : 0.24 + 0.06 * Math.sin(t * 5));
      // the altar: a black block with horns of stone at its corners
      poly(ctx, [x - 50, FLOOR, x - 46, FLOOR - 74, x + 46, FLOOR - 74, x + 50, FLOOR], STONE);
      poly(ctx, [x - 52, FLOOR - 74, x - 60, FLOOR - 112, x - 40, FLOOR - 80], STONE2);
      poly(ctx, [x + 52, FLOOR - 74, x + 60, FLOOR - 112, x + 40, FLOOR - 80], STONE2);
      ctx.fillStyle = G.rgba(c, 0.4); ctx.fillRect(x - 46, FLOOR - 75, 92, 2);
      // its face: an eye cut in the stone, open until the pledge is made
      const open = ev.done ? 0.05 : 1 - Math.max(0, Math.sin(t * 0.9)) ** 8;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = G.rgba(c, 0.85); ctx.beginPath(); ctx.ellipse(x, FLOOR - 40, 16, 4 * open + 0.6, 0, 0, TAU); ctx.fill();
      // over it, the omen's flame (black at the heart), or once pledged a small gold ember
      if (!ev.done) {
        ctx.globalCompositeOperation = 'source-over';
        for (const [s, col] of [[1, G.rgba(BLOOD, 0.75)], [0.55, 'rgba(10,0,6,0.95)']]) {
          ctx.fillStyle = col; ctx.beginPath();
          ctx.moveTo(x - 14 * s, cy + 16 * s);
          ctx.quadraticCurveTo(x - 16 * s, cy - 6 * s, x + Math.sin(t * 7) * 4 * s, cy - 34 * s);
          ctx.quadraticCurveTo(x + 16 * s, cy - 6 * s, x + 14 * s, cy + 16 * s);
          ctx.closePath(); ctx.fill();
        }
      } else diamond(ctx, x, cy, 4, 7, G.rgba(c, 0.7));
      ctx.globalCompositeOperation = 'source-over';
      pool(ctx, c, x, 110, ev.done ? 0.1 : 0.3);
    } else if (ev.kind === 'champion') {
      // a rock standing in the road, split by a crack of dawn light; inside it, a man sitting, waiting
      const top = FLOOR - 236, open = ev.done ? 0 : 1, flick = 0.85 + 0.15 * Math.sin(t * 2.3);
      if (open) {
        glow(ctx, '255,214,160', x, FLOOR - 110, 260, 0.2 * flick);
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createLinearGradient(x, 0, x - 260, 0);
        g.addColorStop(0, 'rgba(255,214,160,0.22)'); g.addColorStop(1, 'rgba(255,214,160,0)');
        poly(ctx, [x - 14, FLOOR, x - 260, FLOOR + 22, x - 260, FLOOR + 2, x - 14, FLOOR - 2], null, false); ctx.fillStyle = g; ctx.fill();
      }
      poly(ctx, [x - 112, FLOOR + 2, x - 104, FLOOR - 120, x - 76, FLOOR - 196, x - 30, top, x + 10, top - 14, x + 58, FLOOR - 206, x + 96, FLOOR - 140, x + 116, FLOOR + 2], STONE);
      poly(ctx, [x - 112, FLOOR + 2, x - 104, FLOOR - 120, x - 76, FLOOR - 196, x - 50, FLOOR - 160, x - 70, FLOOR + 2], STONE2);
      // the crack: a tall sliver of the dawn on the other side
      const cw = 30 * open + 3;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x - cw * 0.4, FLOOR); ctx.lineTo(x - cw * 0.7, FLOOR - 120); ctx.lineTo(x - cw * 0.2, top + 26); ctx.lineTo(x + cw * 0.5, FLOOR - 140); ctx.lineTo(x + cw * 0.6, FLOOR); ctx.closePath();
      const sky = ctx.createLinearGradient(0, top, 0, FLOOR);
      sky.addColorStop(0, open ? '#2c2c42' : '#08060c'); sky.addColorStop(0.7, open ? '#c9a07c' : '#0a080e'); sky.addColorStop(1, open ? '#f2d2a6' : '#0c0a10');
      ctx.fillStyle = sky; ctx.fill();
      ctx.clip();
      if (open && G.champ) G.champ.drawSeated(ctx, x + 4, FLOOR, -1, 0.95);
      ctx.restore();
      if (open) glow(ctx, '255,236,200', x, FLOOR - 120, 70, 0.35 * flick);
      ctx.globalCompositeOperation = 'source-over';
    } else if (ev.kind === 'duel') {
      const sh = ev.sh;
      if (ev.state === 'wait') {
        // where it waits: a ring of blades driven into the road
        for (let i = 0; i < 5; i++) {
          const bx = sh.x + (i - 2) * 26, lean = (i - 2) * 0.12;
          ctx.strokeStyle = '#2b2440'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(bx, FLOOR); ctx.lineTo(bx + Math.sin(lean) * 34, FLOOR - 34); ctx.stroke();
          ctx.strokeStyle = G.rgba(EV_COL.duel, 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + 1, FLOOR - 4); ctx.lineTo(bx + 1 + Math.sin(lean) * 30, FLOOR - 32); ctx.stroke();
        }
      }
    }
  }
  // the shade itself, over the portals and the rest of the road (REST.draw)
  function drawShade(ctx) {
    const ev = REST.ev;
    if (!ev || ev.kind !== 'duel') return;
    const { glow, diamond, RIM } = paint, sh = ev.sh;
    {
      if (sh.vis > 0 && seen(sh.x, 200)) {
        if (ev.state === 'fight' && ev.step === 'prep') {
          // set to dash: a pale light gathers on it
          const k = Math.min(1, ev.t / SH_PREP);
          glow(ctx, EV_COL.duel, sh.x, sh.y - 40, 60 + 20 * k, 0.12 + 0.12 * k);
        }
        G.veilShade.draw(ctx, sh, sh.vis * (ev.state === 'wait' ? 0.8 : 0.9));
        if (sh.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(F.glow(EV_COL.duel), sh.x - 40, sh.y - 80, 80, 80); ctx.globalCompositeOperation = 'source-over'; }
        // the strikes landed so far, as marks over it
        if (ev.state === 'fight' && ev.hits) {
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < SH_WIN; i++) diamond(ctx, sh.x + (i - 1) * 12, sh.y - 98, 3, 5, G.rgba(i < ev.hits ? paint.GOLD : RIM, (i < ev.hits ? 0.95 : 0.25) * sh.vis));
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    }
  }

  // ------------------------------------------------------------------ update
  REST.update = function (dt) {
    const p = P(), I = G.input;
    REST.t += dt;
    if (REST.msgT > 0) REST.msgT -= dt;
    let best = null, bd = 1e9;
    for (const s of places()) {
      const d = Math.abs(p.x - s.x);
      if (d < s.reach && d < bd && p.y > FLOOR - 150) { best = s; bd = d; }
    }
    REST.near = best;
    updateTurn(dt);
    updateEvent(dt);
    if (best && G.playerControl() && !p.ulting && (I.pressed.heal || I.pressed.confirm)) use(best);
    else if (best && best.id === 'boon' && G.up('banish') > 0 && G.playerControl() && !p.ulting && I.pressed.taunt) { I.pressed.taunt = false; banish(best); } // (not a flourish: player.js reads it after)
    showCard(best && !G.ui.current && ((best.id === 'boon' && !(turning(best.i) && REST.turn.t < TURN_SNAP)) || (best.id === 'fire' && G.relics.held().length)) ? best : null);
    updateAwake(dt);

    if (Math.random() < dt * 16) F.spawn({ x: FIRE_X + rnd(-10, 10), y: FLOOR - 22, vx: rnd(-16, 16), vy: -rnd(50, 150), life: rnd(0.5, 1.2), size: rnd(1.4, 2.8), color: '255,170,90', wob: 70, rot: rnd(0, 6) });
    // open portals drink light in; corrupted ones bleed black and red
    for (const s of portals()) {
      const st = portalState(s.boss), cy = FLOOR - 140;
      if (st === 'open' && offerTaken() && Math.random() < dt * 5) {
        const a = rnd(0, TAU), r = rnd(60, 120);
        F.spawn({ x: s.x + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 1.6, life: 0.6, size: rnd(1.4, 2.6), color: bossCol(s.boss) });
      } else if (st === 'corrupt') {
        if (Math.random() < dt * 14) F.spawn({ x: s.x + rnd(-44, 44), y: cy + rnd(-90, 90), vx: rnd(-10, 10), vy: -rnd(30, 80), life: rnd(0.7, 1.4), size: rnd(4, 8), color: '16,3,10', wob: 40, rot: rnd(0, 6) });
        if (Math.random() < dt * 5) F.spawn({ kind: 'spark', x: s.x + rnd(-40, 40), y: cy + rnd(-80, 80), vx: rnd(-120, 120), vy: rnd(-120, 60), life: rnd(0.12, 0.3), size: rnd(1.2, 2.2), color: BLOOD, len: 0.06 });
      }
    }
    for (const f of REST.flies) {
      f.x += (Math.sin(REST.t * f.s + f.ph) * 16 + f.dx) * dt; f.y += Math.cos(REST.t * f.s * 1.3 + f.ph) * 9 * dt;
      if (f.x < WALL_L) f.dx = Math.abs(f.dx); if (f.x > WALL_R) f.dx = -Math.abs(f.dx);
    }
    const px = p.y > FLOOR - 6 ? p.x : -9999;
    for (const b of REST.blades) {
      const dd = b.x - px;
      if (Math.abs(dd) > 400) { b.b *= 0.9; continue; }
      const push = Math.abs(dd) < 32 ? G.sign(dd || 1) * (1 - Math.abs(dd) / 32) * 9 : 0;
      b.v += ((push - b.b) * 160 - b.v * 9) * dt; b.b += b.v * dt;
    }
  };

  // The offering you stand at, as a card at the top of the view: its pairs are underlined there, with
  // a tooltip (see ui.js), which canvas text could not do.
  let cardFor = null;
  function showCard(s) {
    const el = document.getElementById('restCard');
    if (!el) return;
    const key = !s ? null : s.id === 'fire' ? 'fire:' + G.run.awake + ':' + G.relics.pending() : s.i + ':' + G.run.offer[s.i].id + ':' + REST.taken + ':' + REST.taken2 + ':' + REST.extra + ':' + G.run.banishes;
    if (key === cardFor) return;
    cardFor = key;
    if (!s) { el.classList.remove('show'); return; }
    if (s.id === 'fire') { relicCard(el); return; }
    const b = G.run.offer[s.i], own = b.relicReward ? 0 : G.boon(b.id), mine = mineI(s.i);
    el.className = 'item card focus show t-' + b.tag.toLowerCase();
    document.body.classList.toggle('pad', G.input.device === 'gamepad');
    el.querySelector('.ctag').textContent = b.relicReward ? 'A second relic' : b.duo ? G.ui.boonTag(b) : b.pair ? 'Pair · ' + b.of.map((id) => G.boonDef(id).name).join(' + ') : G.ui.boonTag(b);
    el.querySelector('.cname').textContent = b.name;
    el.querySelector('.cdesc').innerHTML = G.ui.esc(b.desc) + (own && !mine ? ' You hold ' + own + '.' : '') + (mine || b.relicReward ? '' : G.ui.pairNote(b) + G.ui.setNote(b))
      + (b.cursed ? '<span class="bane">' + G.ui.esc(b.bane) + '</span>' : '');
    const pad = G.input.device === 'gamepad', canBan = !b.relicReward && G.run.banishes > 0;
    el.querySelector('.cuse').textContent = mine ? 'Yours for the run' : closed() ? 'You have taken one'
      : (pad ? 'LB' : G.input.label('heal')) + '  take it' + (canBan ? '   \u00b7   ' + (pad ? 'Back' : G.input.label('taunt')) + '  banish (' + G.run.banishes + ' left)' : '');
  }
  // the relic's card at the fire: what it does at each stage it has woken to, and the next one
  function relicCard(el) {
    const run = R(), ids = G.relics.held(), id = ids[0], s = run.awake || 0, due = G.relics.pending();
    el.className = 'item card focus show t-relic';
    el.querySelector('.ctag').textContent = 'Your relic' + (s ? ' \u00b7 ' + G.relics.STAGES[s] : '') + (ids.length > 1 ? ' \u00b7 and ' + (ids.length - 1) + ' more' : '');
    el.querySelector('.cname').textContent = G.relicDef(id).name;
    el.querySelector('.cdesc').innerHTML = G.relics.html(id, { next: true });
    el.querySelector('.cuse').textContent = due ? (G.input.device === 'gamepad' ? 'LB' : G.input.label('heal')) + '  awaken it: ' + G.relics.STAGES[G.relics.due()]
      : s >= 3 ? 'Ascendant' : 'It stirs again after trial ' + G.roman(G.relics.AT[s]);
  }
  REST.leave = function () { cardFor = null; const el = document.getElementById('restCard'); if (el) el.classList.remove('show'); };

  // ------------------------------------------------------------------ drawing
  const seen = (x, m) => Math.abs(x - (G.cam.x + W / 2)) < W / 2 + (m || 300);

  REST.drawBack = function (ctx) {
    paint = paint || G.hub.paint;
    const t = REST.t, cam = G.cam.x, { poly } = paint;
    G.hub.drawSky(ctx, 3, t);
    // a road of beaten earth, darker with depth
    const x0 = cam - PAD - 20, x1 = cam + W + PAD + 20;
    const g = ctx.createLinearGradient(0, FLOOR, 0, G.H + PAD);
    g.addColorStop(0, '#4a3c52'); g.addColorStop(0.14, '#211a2c'); g.addColorStop(1, '#050309');
    ctx.fillStyle = g; ctx.fillRect(x0, FLOOR, x1 - x0, G.H + PAD - FLOOR);
    ctx.fillStyle = G.rgba(paint.RIM, 0.45); ctx.fillRect(x0, FLOOR, x1 - x0, 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = Math.floor(x0 / 70) * 70; px < x1; px += 70) { const o = (px * 37) % 23; ctx.moveTo(px + o, FLOOR + 8 + (o % 7)); ctx.lineTo(px + o + 26, FLOOR + 8 + (o % 7)); }
    ctx.stroke();
    // the road's two ends: rocks behind you, a cliff past the last portal
    if (seen(0, 400)) poly(ctx, [-300, FLOOR, -300, FLOOR - 460, 40, FLOOR - 420, 80, FLOOR - 330, 112, FLOOR - 120, 96, FLOOR], paint.STONE);
    if (seen(RW, 400)) poly(ctx, [RW - 90, FLOOR, RW - 104, FLOOR - 280, RW - 50, FLOOR - 410, RW + 300, FLOOR - 500, RW + 300, FLOOR], paint.STONE);
    drawArch(ctx, t);
    drawFire(ctx, t);
    drawMerchant(ctx, t);
    drawAltars(ctx, t);
    drawStone(ctx, t);
    drawFountain(ctx, t);
    drawEvent(ctx, t);
    drawPortals(ctx, t);
    drawSeventh(ctx, t);
  };

  // where you came in: a broken arch with the last fight's light still in it. Once the run is won it
  // is the way home.
  function drawArch(ctx, t) {
    if (!seen(ARCH_X, 300)) return;
    const { poly, glow, STONE, STONE2 } = paint, x = ARCH_X, home = R().runWon(), c = home ? paint.GOLD : (G.pal().hot || '255,214,140');
    glow(ctx, c, x, FLOOR - 150, home ? 220 : 170, (home ? 0.4 : 0.18) + 0.04 * Math.sin(t * 2));
    poly(ctx, [x - 92, FLOOR, x - 92, FLOOR - 290, x - 58, FLOOR - 290, x - 54, FLOOR], STONE);
    poly(ctx, [x + 58, FLOOR, x + 58, FLOOR - 220, x + 76, FLOOR - 246, x + 92, FLOOR - 214, x + 92, FLOOR], STONE);
    poly(ctx, [x - 100, FLOOR - 290, x - 10, FLOOR - 316, x + 6, FLOOR - 300, x - 100, FLOOR - 276], STONE2);
    poly(ctx, [x + 110, FLOOR, x + 120, FLOOR - 24, x + 150, FLOOR - 18, x + 158, FLOOR], STONE2);
  }

  // the fire, with a bedroll beside it
  function drawFire(ctx, t) {
    if (!seen(FIRE_X, 400)) return;
    const { poly, glow, pool, flame, STONE, STONE2, RIM } = paint, x = FIRE_X, WARM = '255,170,90';
    glow(ctx, WARM, x, FLOOR - 40, 250, 0.42 + 0.05 * Math.sin(t * 11));
    poly(ctx, [x - 160, FLOOR, x - 150, FLOOR - 40, x - 104, FLOOR - 52, x - 96, FLOOR], STONE);
    poly(ctx, [x + 60, FLOOR, x + 64, FLOOR - 12, x + 160, FLOOR - 12, x + 166, FLOOR], '#2a2048');
    ctx.fillStyle = '#3a2a52'; ctx.beginPath(); ctx.arc(x + 70, FLOOR - 10, 10, 0, TAU); ctx.fill(); ctx.strokeStyle = G.rgba(RIM, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = STONE2;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(x + i * 12, FLOOR - 3, 8, 5, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#1a1024'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 24, FLOOR - 4); ctx.lineTo(x + 20, FLOOR - 16); ctx.moveTo(x + 24, FLOOR - 4); ctx.lineTo(x - 20, FLOOR - 16); ctx.stroke(); ctx.lineCap = 'butt';
    flame(ctx, x, FLOOR - 10, 34, 54, WARM, t, 0);
    pool(ctx, WARM, x, 260, 0.6);
    // (the relic, when it stirs: v2.6a)
    const at = relicAt(t), ids = G.relics.held();
    if (at && ids.length) {
      const c = G.relics.col(ids[0]), w = 11 * (0.35 + 0.65 * Math.abs(Math.cos(t * 1.6))), h = 19;
      glow(ctx, c, at.x, at.y, 70 + 30 * Math.sin(t * 3), 0.45);
      ctx.globalCompositeOperation = 'lighter';
      paint.diamond(ctx, at.x, at.y, w + 2, h, G.rgba(c, 0.95));
      paint.diamond(ctx, at.x, at.y, w * 0.45 + 1, h * 0.6, 'rgba(255,255,255,0.9)');
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // (v2.9k) the road merchant: hooded, sitting on a crate beside a tall pack hung with glass jars of
  // Motes, a lantern on a pole over him. He nods now and then; the jars glow and dim.
  function drawMerchant(ctx, t) {
    if (R().runWon() || !seen(MERCH_X, 200)) return;
    const { poly, glow, pool, STONE2, DARK, RIM } = paint, x = MERCH_X, C = G.motes.COL, on = REST.near && REST.near.id === 'merchant';
    const nod = Math.pow(Math.max(0, Math.sin(t * 0.7)), 12) * 4;
    // the lantern on its pole
    ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 44, FLOOR); ctx.lineTo(x + 44, FLOOR - 150); ctx.lineTo(x + 24, FLOOR - 158); ctx.stroke();
    glow(ctx, '255,200,130', x + 24, FLOOR - 142, 90, 0.3 + 0.04 * Math.sin(t * 9));
    poly(ctx, [x + 18, FLOOR - 152, x + 30, FLOOR - 152, x + 32, FLOOR - 134, x + 16, FLOOR - 134], '#2a2036');
    ctx.fillStyle = 'rgba(255,214,150,0.9)'; ctx.fillRect(x + 20, FLOOR - 149, 8, 12);
    // the pack: a tall frame of cloth, a bedroll tied across its top, a crossbar the jars hang from
    poly(ctx, [x - 56, FLOOR, x - 60, FLOOR - 104, x - 50, FLOOR - 114, x - 26, FLOOR - 118, x - 18, FLOOR - 108, x - 14, FLOOR], '#231b34');
    ctx.fillStyle = '#2c2240'; ctx.beginPath(); ctx.ellipse(x - 38, FLOOR - 122, 26, 9, -0.08, 0, TAU); ctx.fill();
    ctx.strokeStyle = G.rgba(RIM, 0.45); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x - 38, FLOOR - 122, 26, 9, -0.08, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.strokeStyle = '#120e1c'; ctx.lineWidth = 2;
    for (const yy of [FLOOR - 84, FLOOR - 46]) { ctx.beginPath(); ctx.moveTo(x - 59, yy); ctx.lineTo(x - 15, yy - 5); ctx.stroke(); }
    ctx.strokeStyle = '#3a2e4e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 72, FLOOR - 98); ctx.lineTo(x - 6, FLOOR - 104); ctx.stroke();
    // jars of Motes hung from the crossbar on cords, swaying a little, each glowing in its own time
    for (let i = 0; i < 5; i++) {
      const ax = x - 68 + i * 14, ay = FLOOR - 99 - i * 1.1, len = 14 + (i % 2) * 12, sw = Math.sin(t * 1.3 + i * 1.7) * 2;
      const jx = ax + sw, jy = ay + len, k = 0.55 + 0.45 * Math.sin(t * 1.7 + i * 1.9);
      ctx.strokeStyle = 'rgba(20,14,30,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(jx, jy - 5); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, C, jx, jy, 16, 0.35 * k);
      ctx.fillStyle = G.rgba(C, 0.4 + 0.5 * k); ctx.beginPath(); ctx.ellipse(jx, jy, 4, 5.5, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#2a2036'; ctx.fillRect(jx - 2.5, jy - 7, 5, 2);
    }
    // the crate he sits on
    poly(ctx, [x - 10, FLOOR, x - 10, FLOOR - 32, x + 32, FLOOR - 32, x + 32, FLOOR], STONE2);
    ctx.fillStyle = G.rgba(RIM, 0.4); ctx.fillRect(x - 10, FLOOR - 33, 42, 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 8, FLOOR - 16); ctx.lineTo(x + 30, FLOOR - 16); ctx.stroke();
    // the merchant: a long hooded cloak, hunched over his knees, its hood drawn to a point; one hand
    // held out with a small jar in it
    const sy = FLOOR - 32, hx = x + 12, hy = sy - 66 + nod;
    poly(ctx, [x - 4, sy + 2, x - 10, sy - 34, x - 4, sy - 56 + nod, hx - 12, hy - 4, hx - 6, hy - 16, hx + 10, hy - 6, hx + 16, hy + 8, x + 30, sy - 36, x + 38, sy - 4, x + 30, sy + 2], '#191327');
    ctx.strokeStyle = G.rgba(RIM, 0.4); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hx - 6, hy - 16); ctx.lineTo(hx + 10, hy - 6); ctx.lineTo(hx + 16, hy + 8); ctx.stroke();
    ctx.fillStyle = DARK; ctx.beginPath(); ctx.ellipse(hx + 6, hy + 4, 6.5, 8, 0.15, 0, TAU); ctx.fill();
    // the arm, out over his knee, and the jar in his hand
    poly(ctx, [x + 18, sy - 34, x + 46, sy - 26, x + 48, sy - 18, x + 16, sy - 22], '#191327');
    const jk = 0.6 + 0.4 * Math.sin(t * 2.1);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, C, x + 52, sy - 26, on ? 34 : 22, (on ? 0.55 : 0.35) * jk);
    ctx.fillStyle = G.rgba(C, 0.6 + 0.4 * jk); ctx.beginPath(); ctx.ellipse(x + 52, sy - 26, 4.5, 6, 0, 0, TAU); ctx.fill();
    // two small lights under the hood, brighter when you stand at his crate
    ctx.fillStyle = G.rgba(C, on ? 0.95 : 0.6);
    ctx.fillRect(hx + 5, hy + 2, 2, 2); ctx.fillRect(hx + 9, hy + 3, 2, 2);
    ctx.globalCompositeOperation = 'source-over';
    pool(ctx, C, x - 10, 130, on ? 0.3 : 0.18);
  }

  // the offering: a plinth for each boon (or, after a corrupted portal, each relic), turning in the
  // colour of its kind
  function drawAltars(ctx, t) {
    const st = altars();
    if (!st.length || !seen(ALTAR_X, 420)) return;
    const { poly, glow, pool, block, diamond, STONE, STONE2, DARK, RIM } = paint;
    const x0 = st[0].x - 58, x1 = st[st.length - 1].x + 58;
    poly(ctx, [x0, FLOOR, x0 + 8, FLOOR - 126, x0 + 50, FLOOR - 150, x1 - 50, FLOOR - 150, x1 - 8, FLOOR - 126, x1, FLOOR], STONE);
    ctx.fillStyle = G.rgba(RIM, 0.45); ctx.fillRect(x0 + 50, FLOOR - 150, x1 - x0 - 100, 2);
    for (const s of st) {
      const b = shownDef(s.i), tk = turnK(s.i), turn = turning(s.i) && REST.turn.t >= 0, mine = mineI(s.i), on = REST.near === s;
      const c = turn && REST.turn.t < TURN_SNAP ? mixRgb(colOf(REST.turn.mask), BLOOD, tk * tk) : colOf(b);
      // while it turns its light stutters, and the stone shakes harder and harder
      const stutter = turn && REST.turn.t < TURN_SNAP && Math.random() < 0.12 + 0.3 * tk ? 0.35 : 1;
      const lit = (mine ? 1 : closed() ? 0.3 : 0.78) * stutter, bob = Math.sin(t * 1.8 + s.i * 1.7) * 4;
      const jit = turn && REST.turn.t < TURN_SNAP ? tk * tk * 3 : 0, cy = FLOOR - 104 + bob + rnd(-jit, jit);
      ctx.fillStyle = DARK;
      ctx.beginPath(); ctx.moveTo(s.x - 30, FLOOR - 8); ctx.lineTo(s.x - 30, FLOOR - 110); ctx.arc(s.x, FLOOR - 110, 30, Math.PI, 0); ctx.lineTo(s.x + 30, FLOOR - 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = G.rgba(c, 0.35 + 0.4 * lit); ctx.lineWidth = 1.5; ctx.stroke();
      glow(ctx, c, s.x, cy, (mine ? 92 : 62) + (on ? 16 : 0), 0.2 + 0.5 * lit + (on ? 0.12 : 0));
      if (turn && REST.turn.t < TURN_SNAP) drawCracks(ctx, { x: s.x + rnd(-jit, jit) }, cy, tk);
      block(ctx, s.x, 44, 44, 8, STONE2);
      ctx.fillStyle = G.rgba(c, 0.5 * lit + 0.2); ctx.fillRect(s.x - 22, FLOOR - 52, 44, 2);
      // a pair burns as a double star, a relic as a larger stone; the others as a single cut stone
      ctx.globalCompositeOperation = 'lighter';
      const w = (mine || b.relicReward ? 13 : 10) * (0.35 + 0.65 * Math.abs(Math.cos(t * 1.2 + s.i))), h = mine || b.relicReward ? 22 : 17;
      if (b.pair) {
        for (const d of [-1, 1]) diamond(ctx, s.x + d * 8, cy, w * 0.8 + 1, h * 0.8, G.rgba(c, 0.9 * lit));
        diamond(ctx, s.x, cy, w * 0.45 + 1, h * 0.7, 'rgba(255,255,255,' + 0.9 * lit + ')');
      } else {
        const gx = s.x + rnd(-jit, jit);
        diamond(ctx, gx, cy, w + 2, h, G.rgba(c, 0.95 * lit));
        if (b.cursed) ctx.globalCompositeOperation = 'source-over'; // (a black heart has to be painted, not added)
        // (turning, its white heart goes dark from the middle out)
        const dark = b.cursed ? 1 : turn ? tk * tk : 0;
        diamond(ctx, gx, cy, w * 0.45 + 1, h * 0.6, 'rgba(' + mixRgb('255,255,255', '10,0,6', dark) + ',' + 0.9 * lit + ')');
        ctx.globalCompositeOperation = 'lighter';
      }
      // a corrupted boon: a black heart in its stone, and crimson lightning crackling round it
      if (b.cursed && Math.sin(t * 13 + s.i * 4) > 0.2) {
        ctx.strokeStyle = G.rgba(c, 0.7 * lit); ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let k = 0; k < 2; k++) {
          const a = Math.floor(t * 9) * 2.3 + k * 3.1 + s.i, r0 = 14, r1 = 30;
          let px = s.x + Math.cos(a) * r0, py = cy + Math.sin(a) * r0;
          ctx.moveTo(px, py);
          for (let j = 1; j <= 3; j++) { const rr = r0 + (r1 - r0) * j / 3, aa = a + Math.sin(a * 7 + j * 5) * 0.35; px = s.x + Math.cos(aa) * rr; py = cy + Math.sin(aa) * rr; ctx.lineTo(px, py); }
        }
        ctx.stroke();
      }
      if (mine) {
        ctx.strokeStyle = G.rgba(c, 0.8); ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 14;
        ctx.beginPath(); ctx.ellipse(s.x, cy, 30, 34, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.globalCompositeOperation = 'source-over';
      pool(ctx, c, s.x, 70, 0.3 * lit);
    }
  }

  // the standing stone that redraws the offering (the Shrine's Second Thoughts)
  function drawStone(ctx, t) {
    if (!seen(STONE_X, 300)) return;
    const { poly, glow, RIM, STONE } = paint, x = STONE_X, live = G.run.rerolls > 0 && REST.taken < 0 && G.run.offerKind === 'boon', on = REST.near && REST.near.id === 'stone';
    if (live) glow(ctx, '236,233,244', x, FLOOR - 90, on ? 110 : 80, on ? 0.35 : 0.2);
    poly(ctx, [x - 30, FLOOR, x - 34, FLOOR - 120, x - 10, FLOOR - 160, x + 22, FLOOR - 150, x + 32, FLOOR], STONE);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(live ? '236,233,244' : RIM, live ? 0.7 + 0.2 * Math.sin(t * 3) : 0.2); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, FLOOR - 92, 13, t * 0.8, t * 0.8 + 4.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, FLOOR - 92); ctx.lineTo(x + 6, FLOOR - 92); ctx.moveTo(x, FLOOR - 98); ctx.lineTo(x, FLOOR - 86); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  // The Cleansing Fountain: a stone basin of pale water under a weeping figure. While you carry a bane
  // the water stirs and crimson threads drift through it; spend Sunshards here to purge one.
  function drawFountain(ctx, t) {
    const x = FOUNT_X;
    if (!seen(x, 300)) return;
    const { poly, glow, pool, block, STONE, STONE2, DARK, RIM } = paint, banes = R().banes().length, on = REST.near && REST.near.id === 'fountain';
    const WATER = '170,220,255';
    glow(ctx, WATER, x, FLOOR - 110, on ? 170 : 130, 0.16 + (banes ? 0.08 : 0) + (on ? 0.08 : 0));
    // the figure: a hooded shape, hands cupped, water falling from them
    poly(ctx, [x - 18, FLOOR - 70, x - 22, FLOOR - 150, x - 12, FLOOR - 178, x, FLOOR - 186, x + 12, FLOOR - 178, x + 22, FLOOR - 150, x + 18, FLOOR - 70], STONE);
    ctx.fillStyle = DARK; ctx.beginPath(); ctx.ellipse(x, FLOOR - 168, 8, 10, 0, 0, TAU); ctx.fill();
    block(ctx, x, 40, 120, 8, STONE2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * 4, wob = Math.sin(t * 6 + i) * 1.5;
      ctx.strokeStyle = G.rgba(WATER, 0.35); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + ox, FLOOR - 124); ctx.quadraticCurveTo(x + ox + wob, FLOOR - 100, x + ox * 2, FLOOR - 60); ctx.stroke();
    }
    ctx.restore();
    // the basin
    poly(ctx, [x - 78, FLOOR - 60, x - 70, FLOOR - 30, x - 30, FLOOR - 18, x + 30, FLOOR - 18, x + 70, FLOOR - 30, x + 78, FLOOR - 60], STONE);
    poly(ctx, [x - 26, FLOOR - 18, x - 30, FLOOR, x + 30, FLOOR, x + 26, FLOOR - 18], STONE2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = G.rgba(WATER, 0.22 + 0.05 * Math.sin(t * 2));
    ctx.beginPath(); ctx.ellipse(x, FLOOR - 58, 72, 7, 0, 0, TAU); ctx.fill();
    // ripples where the water lands
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.6 + i / 3) % 1;
      ctx.strokeStyle = G.rgba(WATER, 0.5 * (1 - k)); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, FLOOR - 58, 6 + 60 * k, 1 + 5 * k, 0, 0, TAU); ctx.stroke();
    }
    // what you carry stains it: crimson threads curling in the water
    if (banes) {
      for (let i = 0; i < Math.min(4, banes * 2); i++) {
        const a = t * (0.7 + i * 0.2) + i * 2.1;
        ctx.strokeStyle = G.rgba(BLOOD, 0.45); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 50, FLOOR - 58 + Math.sin(a * 2) * 2); ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * 30, FLOOR - 57, x + Math.cos(a + 1.2) * 44, FLOOR - 58 + Math.sin(a) * 3); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.strokeStyle = G.rgba(RIM, 0.35); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 78, FLOOR - 60); ctx.lineTo(x + 78, FLOOR - 60); ctx.stroke();
    pool(ctx, WATER, x, 100, 0.16);
  }

  // The portals: an arch for each boss. Open ones turn in the boss's own colour (bright once you have
  // taken from the offering); a beaten one is stopped with a stone slab; a corrupted one is a hole of
  // void rimmed in blood that will not keep its shape.
  function drawPortals(ctx, t) {
    const { poly, glow, pool, block, diamond, STONE, STONE2, DARK } = paint;
    const ready = offerTaken();
    for (const s of portals()) {
      if (!seen(s.x, 200)) continue;
      const st = portalState(s.boss), x = s.x, c = st === 'corrupt' ? BLOOD : bossCol(s.boss), on = REST.near === s;
      const cy = FLOOR - 140, hw = 52, top = FLOOR - 250;
      if (st === 'open') glow(ctx, c, x, cy, on ? 190 : 150, (ready ? 0.34 : 0.16) + (on ? 0.12 : 0));
      if (st === 'corrupt') {
        // darkness spills out of it first
        const g = ctx.createRadialGradient(x, cy, 10, x, cy, 210);
        g.addColorStop(0, 'rgba(6,0,4,0.6)'); g.addColorStop(1, 'rgba(6,0,4,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 210, cy - 210, 420, 420);
        glow(ctx, BLOOD, x, cy, on ? 170 : 130, 0.22 + 0.08 * Math.sin(t * 9));
      }
      // the opening
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x - hw, FLOOR - 14); ctx.lineTo(x - hw, top + hw); ctx.arc(x, top + hw, hw, Math.PI, 0); ctx.lineTo(x + hw, FLOOR - 14); ctx.closePath(); ctx.clip();
      ctx.fillStyle = st === 'corrupt' ? '#050003' : '#06040e'; ctx.fillRect(x - hw, top, hw * 2, FLOOR - top);
      if (st === 'open') {
        ctx.globalCompositeOperation = 'lighter';
        const a = ready ? 0.75 : 0.3;
        for (let i = 0; i < 5; i++) {
          const k = ((t * 0.32 + i / 5 + s.x * 0.001) % 1), r = 10 + 120 * k;
          ctx.strokeStyle = G.rgba(i % 2 ? c : '255,246,235', a * (1 - k)); ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.ellipse(x, cy, r * 0.42, r, 0, t * 0.6 + i * 1.3, t * 0.6 + i * 1.3 + 4.4); ctx.stroke();
        }
        ctx.drawImage(F.glow(c), x - 70, cy - 120, 140, 240);
      } else if (st === 'corrupt') {
        // rings turning the wrong way, torn, and a red slit of an eye
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
          const k = 1 - ((t * 0.45 + i / 6) % 1), r = 12 + 130 * k, j = Math.sin(t * 23 + i * 5) * 4;
          ctx.strokeStyle = G.rgba(BLOOD, 0.7 * (1 - k * 0.6)); ctx.lineWidth = 2 + (i % 2);
          ctx.beginPath(); ctx.ellipse(x + j, cy, r * 0.45, r, 0, -t * 0.9 + i * 1.1, -t * 0.9 + i * 1.1 + 3.6); ctx.stroke();
        }
        const blink = Math.max(0, Math.sin(t * 1.7)) ** 6;
        ctx.fillStyle = G.rgba('255,90,120', 0.85 * (1 - blink));
        ctx.beginPath(); ctx.ellipse(x, cy - 10, 5 * (1 - blink) + 0.5, 26, 0, 0, TAU); ctx.fill();
      } else {
        // a slab across it, with the beaten boss's mark gone grey
        ctx.fillStyle = STONE2; ctx.fillRect(x - hw, top, hw * 2, FLOOR - top);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 20, top + 30); ctx.lineTo(x + 6, cy - 20); ctx.lineTo(x - 8, cy + 30); ctx.lineTo(x + 14, FLOOR - 30); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        diamond(ctx, x, cy - 40, 8, 14, G.rgba(c, 0.18));
      }
      ctx.restore();
      // the arch
      for (const side of [-1, 1]) {
        poly(ctx, [x + side * hw, FLOOR - 14, x + side * hw, top + hw, x + side * (hw + 18), top + hw - 6, x + side * (hw + 22), FLOOR - 14], STONE);
        if (st === 'corrupt') { ctx.fillStyle = G.rgba(BLOOD, 0.3 + 0.2 * Math.sin(t * 11 + side)); ctx.fillRect(x + side * (hw + 6) - 1, cy - 30 + side * 20, 2, 60); }
      }
      ctx.strokeStyle = st === 'corrupt' ? G.rgba(BLOOD, 0.7) : G.rgba(st === 'open' ? c : paint.RIM, st === 'open' ? 0.7 : 0.25); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, top + hw, hw + 2, Math.PI, 0); ctx.stroke();
      block(ctx, x, hw * 2 + 70, 8, 0, STONE2); block(ctx, x, hw * 2 + 40, 6, 8, STONE);
      // the keystone carries the boss's colour
      ctx.globalCompositeOperation = 'lighter';
      diamond(ctx, x, top - 6, 7, 12, G.rgba(c, st === 'sealed' ? 0.25 : 0.95));
      ctx.globalCompositeOperation = 'source-over';
      pool(ctx, c, x, 110, st === 'sealed' ? 0.06 : st === 'corrupt' ? 0.32 : ready ? 0.4 : 0.18);
    }
  }

  // The seventh portal, for the final trial: taller than the rest, dark and still. Once every trial is
  // beaten it stirs, a slow pulse of pale light behind the stone, but it does not open (not yet).
  function drawSeventh(ctx, t) {
    const x = SEVENTH_X;
    if (!seen(x, 300)) return;
    const { poly, glow, block, diamond, STONE, STONE2 } = paint, open = R().solOpen(), stir = open || R().runWon(), hw = 78, top = FLOOR - 360, cy = FLOOR - 190;
    const pulse = stir ? (open ? 0.75 + 0.25 * Math.sin(t * 3) : 0.5 + 0.5 * Math.sin(t * 1.6)) : 0;
    glow(ctx, '236,226,255', x, cy, 260, 0.06 + 0.22 * pulse);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - hw, FLOOR - 16); ctx.lineTo(x - hw, top + hw); ctx.arc(x, top + hw, hw, Math.PI, 0); ctx.lineTo(x + hw, FLOOR - 16); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#04030a'; ctx.fillRect(x - hw, top, hw * 2, FLOOR - top);
    // (v2.9a) open: white noon light pours out of it
    if (open) { const g = ctx.createRadialGradient(x, cy, 10, x, cy, 220); g.addColorStop(0, 'rgba(255,252,240,' + (0.85 + 0.15 * pulse) + ')'); g.addColorStop(0.5, 'rgba(255,226,160,0.5)'); g.addColorStop(1, 'rgba(255,200,120,0.1)'); ctx.fillStyle = g; ctx.fillRect(x - hw, top, hw * 2, FLOOR - top); }
    if (stir) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(F.glow('236,226,255'), x - 90, cy - 170, 180, 340);
      ctx.globalAlpha = 0.35 + 0.4 * pulse;
      ctx.strokeStyle = 'rgba(255,250,240,0.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, top + 30); ctx.lineTo(x - 10, cy - 40); ctx.lineTo(x + 8, cy + 20); ctx.lineTo(x - 4, FLOOR - 40); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    for (const side of [-1, 1]) poly(ctx, [x + side * hw, FLOOR - 16, x + side * hw, top + hw, x + side * (hw + 26), top + hw - 10, x + side * (hw + 32), FLOOR - 16], STONE);
    // a socket round the arch for each boss, lit when it is beaten this run
    const n = G.BOSS_IDS.length, beaten = R().beaten;
    ctx.globalCompositeOperation = 'lighter';
    G.BOSS_IDS.forEach((id, i) => {
      const a = Math.PI + (i + 0.5) / n * Math.PI, sx = x + Math.cos(a) * (hw + 14), sy = top + hw + Math.sin(a) * (hw + 14);
      diamond(ctx, sx, sy, 5, 8, beaten.includes(id) ? G.rgba(bossCol(id), 0.95) : 'rgba(80,72,100,0.5)');
    });
    ctx.globalCompositeOperation = 'source-over';
    block(ctx, x, hw * 2 + 110, 10, 0, STONE2); block(ctx, x, hw * 2 + 70, 8, 10, STONE);
  }

  // grass and fireflies, behind the hero
  REST.draw = function (ctx) {
    const t = REST.t, cam = G.cam.x;
    ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? G.rgba(paint.RIM, 0.3) : paint.STONE;
      ctx.beginPath();
      for (let i = pass; i < REST.blades.length; i += 2) {
        const b = REST.blades[i];
        if (b.x < cam - 60 || b.x > cam + W + 60) continue;
        const bend = b.lean + b.b + Math.sin(t * 1.5 + b.ph) * 1.8;
        ctx.moveTo(b.x, FLOOR + 1); ctx.quadraticCurveTo(b.x + bend * 0.3, FLOOR - b.h * 0.6, b.x + bend, FLOOR - b.h + Math.abs(bend) * 0.25);
      }
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'lighter';
    const img = F.glow('214,255,170');
    for (const f of REST.flies) {
      if (f.x < cam - 40 || f.x > cam + W + 40) continue;
      const k = Math.sin(t * f.s * 2.4 + f.ph * 3);
      if (k <= 0) continue;
      ctx.globalAlpha = k * 0.9;
      ctx.drawImage(img, f.x - 7, f.y - 7, 14, 14);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    drawShade(ctx);
  };
  REST.drawFore = function () { };

  function label(s) {
    const run = R(), next = G.roman(run.trial + 1), of = G.roman(G.RUN_FIGHTS);
    if (s.id === 'fire' && G.relics.pending()) return ['The Fire', 'Your relic stirs in the flames. Hold it to the fire.', 'awaken it'];
    if (s.id === 'fire') return ['The Fire', run.runWon() ? 'All ' + G.roman(G.RUN_FIGHTS) + ' trials won. Rest a while.' : 'Trial ' + G.roman(run.trial) + ' won. Rest a while; nothing here can hurt you.', 'warm your hands'];
    if (s.id === 'stone') return ['Second Thoughts', 'Redraw the whole offering (' + run.rerolls + ' left this run)', 'redraw'];
    if (s.id === 'home') return ['The Way Home', 'The run is won. Back to the camp.', 'go home'];
    if (s.id === 'fountain') {
      const n = run.banes().length, cost = run.cleanseCost();
      return ['The Cleansing Fountain', n ? 'Purge a corrupted boon\u2019s drawback: ' + cost + ' Motes (you hold ' + G.motes.held() + ')'
        : 'Its water purges the drawback of a corrupted boon. You carry none.', n ? 'cleanse' : ''];
    }
    if (s.id === 'card') {
      const done = REST.ev.done;
      return ['A Face-Down Card', done ? 'Turned. The fortune-teller has nothing more for you.' : 'Turn one of the three: a boon, Motes, or a corrupted boon. You will not know which.', done ? '' : 'turn it'];
    }
    if (s.id === 'smith') {
      const n = run.temperable().length, cost = run.temperCost();
      return ['The Wandering Smith', n ? 'Temper a boon you hold: one more of it, even past its limit. ' + cost + ' Motes (you hold ' + G.motes.held() + ')' : 'Nothing you hold can be tempered.', n ? 'temper' : ''];
    }
    if (s.id === 'merchant') {
      return ['The Road Merchant', 'Health for the run, boons, and things for the fight. You hold ' + G.motes.held() + ' Motes.', 'trade'];
    }
    if (s.id === 'pledge') {
      const done = REST.ev.done;
      return ['The Omen Altar', done ? 'Pledged. An omen more walks with you into the next trial.' : 'Pledge yourself: an omen more in the next trial, and a second boon from this offering.', done ? '' : 'pledge'];
    }
    if (s.id === 'door') return ['The Doorway', 'Someone sits in the light inside, waiting. A duel: lose it, and you lose nothing.', 'step through'];
    if (s.id === 'duel') return ['The Duelling Shade', 'It dashes at you, six times at most. Strike it three times before its blade touches you and it leaves a relic.', 'duel'];
    if (s.id === 'seventh') return ['The Last Portal', run.solOpen() ? (run.corrupted.length ? 'Open. The run ends here: corrupted portals left open will close.' : 'Open. Light pours out of it: she is waiting on the other side.') : run.runWon() ? 'Spent. Its light is yours.' : 'Dormant. It waits for ' + G.roman(G.TRIALS) + ' trials won (' + run.trialsWon() + ' of ' + G.TRIALS + ').', run.solOpen() ? 'step through' : run.runWon() ? 'touch it' : ''];
    if (s.id === 'portal') {
      const B = G.bosses[s.boss], st = portalState(s.boss), ready = offerTaken();
      if (st === 'corrupt') return ['Corrupted: ' + B.name, 'Optional. Far stronger, and it does not count as a trial. Win it for a second relic and triple Sunshards.', ready ? 'enter, if you dare' : 'take from the offering first'];
      if (st === 'sealed') return [B.name, run.beaten.includes(s.boss) ? (run.cleansed.includes(s.boss) ? 'Beaten, and its corruption cleansed' : 'Beaten this run') : 'Sealed', ''];
      return [B.name, 'Trial ' + next + ' of ' + of, !ready ? 'take from the offering first' : G.relics.pending() ? 'awaken your relic at the fire first' : 'enter'];
    }
    return ['', '', ''];
  }
  function shortName(s) {
    if (s.id === 'boon') return shownDef(s.i).name;
    if (s.id === 'card') return s.i === 1 ? 'The Fortune-Teller' : '';
    if (s.id === 'portal') { const B = G.bosses[s.boss]; return B ? (portalState(s.boss) === 'corrupt' ? 'Corrupted' : B.short) : ''; }
    return { fire: 'The Fire', merchant: 'The Merchant', stone: 'Second Thoughts', seventh: 'The Last Portal', home: 'The Way Home', fountain: 'The Fountain', smith: 'The Smith', pledge: 'The Omen Altar', duel: 'The Shade', door: 'The Doorway' }[s.id];
  }

  // names over each place, what the nearest one does; in front of everything
  REST.drawOver = function (ctx) {
    const p = P(), near = REST.near, pad = G.input.device === 'gamepad', cam = G.cam.x, text = paint.text, run = R();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of places()) {
      // (the offering's plinths carry no names: a boon is read by standing at it, on its card, so a
      // corrupted one gives nothing away until you are there)
      if ((near && s.id === near.id && s.x === near.x) || s.id === 'boon' || !seen(s.x, 200)) continue;
      const name = shortName(s);
      if (!name) continue;
      const mine = s.id === 'boon' && mineI(s.i), dim = (s.id === 'boon' && closed() && !mine) || (s.id === 'portal' && portalState(s.boss) === 'sealed') || (s.id === 'card' && REST.ev.done);
      const cursed = s.id === 'boon' && shownDef(s.i).cursed;
      const col = mine ? paint.GOLD : cursed || (s.id === 'portal' && portalState(s.boss) === 'corrupt') ? '255,90,120' : '236,233,244';
      text(ctx, name.toUpperCase(), s.x, FLOOR - s.top, s.id === 'boon' ? 11 : 12, col, mine ? 0.95 : dim ? 0.3 : 0.6);
    }
    if (seen(ALTAR_X, 200) && altars().length && !(near && near.id === 'boon')) {
      const what = run.offerKind === 'relic' ? 'THE SPOILS' : 'THE OFFERING';
      text(ctx, closed() ? what : what + (REST.taken >= 0 ? '  ·  CHOOSE ONE MORE' : REST.extra ? '  ·  CHOOSE TWO' : '  ·  CHOOSE ONE'), ALTAR_X, FLOOR - 200, 12, closed() ? '236,233,244' : paint.GOLD, closed() ? 0.55 : 0.6 + 0.25 * Math.sin(REST.t * 3));
    }
    if (near && near.id !== 'boon' && !G.ui.current) {
      const Lb = label(near), x = G.clamp(near.x, cam + 260, cam + W - 260), y = FLOOR - near.top - 40;
      const corrupt = near.id === 'portal' && portalState(near.boss) === 'corrupt';
      text(ctx, Lb[0].toUpperCase(), x, y, 18, corrupt ? '255,110,140' : '255,255,255', 1);
      text(ctx, Lb[1], x, y + 22, 13, '236,233,244', 0.85, '500');
      if (Lb[2]) text(ctx, (pad ? 'LB' : G.input.label('heal')) + '  ' + Lb[2], x, y + 44, 14, corrupt ? '255,110,140' : paint.GOLD, 0.85 + 0.15 * Math.sin(REST.t * 6));
    }
    if (REST.msgT > 0) text(ctx, REST.msg.toUpperCase(), p.x, p.y - 104, 15, paint.GOLD, Math.min(1, REST.msgT * 2));
    if (!G.ui.current) {
      text(ctx, 'THE CROSSROADS', cam + W / 2, 40, 20, '236,233,244', 0.75, '400');
      const sub = run.solOpen() && !G.relics.pending() ? 'Six trials won  \u00b7  ' + (offerTaken() ? 'the last portal is open' : 'take from the offering, then the last portal')
        : G.relics.pending() && run.runWon() ? 'All ' + G.roman(G.RUN_FIGHTS) + ' trials won  \u00b7  your relic stirs at the fire, one last time' : run.runWon()
        ? 'All ' + G.roman(G.RUN_FIGHTS) + ' trials won' + (run.corrupted.length ? '  ·  ' + (run.corrupted.length > 1 ? 'corrupted portals wait' : 'a corrupted portal waits') + ', if you dare  ·  or the way home, behind you' : '  ·  the way home is behind you')
        : G.relics.pending() ? 'Trial ' + G.roman(run.trial) + ' won  \u00b7  your relic stirs at the fire' : (run.offerKind === 'relic' ? 'The corruption is cleansed  ·  take a relic, then choose a portal' : 'Trial ' + G.roman(run.trial) + ' of ' + G.roman(G.RUN_FIGHTS) + ' won  ·  take from the offering, then choose a portal');
      text(ctx, sub, cam + W / 2, 66, 12, '236,233,244', 0.45, '500');
      if (PORTAL_X > cam + W + 40 && offerTaken()) text(ctx, 'THE PORTALS  ›', cam + W - 96, 40, 12, paint.GOLD, 0.5 + 0.2 * Math.sin(REST.t * 3));
    }
  };
})();
