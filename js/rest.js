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
  const RW = 3460, WALL_L = 120, WALL_R = RW - 110, PAD = 48;
  const ARCH_X = 210, FIRE_X = 600, ALTAR_X = 1090, STONE_X = 1400, FOUNT_X = 1610, PORTAL_X = 1820, PORTAL_GAP = 210, SEVENTH_X = 3180;
  const TAG_COL = { movement: '127,227,176', weapon: '255,186,92', starlight: '150,225,255', survival: '255,154,166', risk: '255,96,56', pair: '255,210,122', relic: '255,224,138', corrupted: '235,30,80' };
  const colOf = (b) => TAG_COL[b.tag.toLowerCase()] || '255,214,140';
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
    targets() { return []; }, damage() { return false; }, update() { },
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
    return run.runWon() ? 'sealed' : 'open';
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
    if (G.run.rerolls > 0 && REST.taken < 0 && G.run.offerKind === 'boon' && G.run.offer.length) out.push({ id: 'stone', x: STONE_X, reach: 60, top: 190 });
    out.push({ id: 'fountain', x: FOUNT_X, reach: 70, top: 200 });
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
    initTurn();
    if (!REST.flies.length) {
      for (let i = 0; i < 40; i++) REST.flies.push({ x: WALL_L + Math.random() * (WALL_R - WALL_L), y: FLOOR - 16 - Math.random() * 160, s: 0.5 + Math.random() * 0.9, ph: Math.random() * 6.28, dx: (Math.random() - 0.5) * 14 });
      for (let i = 0; i < 360; i++) REST.blades.push({ x: 40 + Math.random() * (RW - 80), h: 5 + Math.random() * 12, lean: (Math.random() - 0.5) * 3, ph: Math.random() * 6.28, v: 0, b: 0 });
    }
  };
  REST.spawn = () => ARCH_X + 90;

  // Make the hero over again where they stand, so a boon or relic just taken works at once.
  REST.retake = retake;
  function retake() {
    const p = P(), x = p.x, y = p.y, f = p.facing, vy = p.vy, ground = p.onGround, ult = p.ult;
    G.run.ult = ult;
    p.reset(); G.flow.reset();
    p.x = x; p.y = y; p.facing = f; p.vy = vy; p.onGround = ground; p.ult = ult; p.ember = G.PLAYER.SEG * p.segs;
    G.ui.buildHp(p.maxHp); G.ui.buildRun();
  }

  function use(s) {
    const p = P(), run = R();
    if (s.id === 'boon') {
      if (turning(s.i)) { startTurn(); return; } // (nothing can be taken while it turns)
      if (REST.taken >= 0) { G.audio.play('uiMove'); say(REST.taken === s.i ? 'Yours for the run' : 'One each rest'); return; }
      const b = run.offer[s.i], c = colOf(b);
      if (b.relicReward) run.extraRelics.push(b.id); else run.take(s.i);
      REST.taken = s.i; retake();
      G.audio.play('segment'); G.audio.play('heal');
      F.flash(c, 0.16, 0.3); F.shake(4);
      F.shatter(s.x, FLOOR - 104, c, 14, { r: 240, r0: 24 });
      F.ring(s.x, FLOOR - 104, { r0: 10, r1: 150, life: 0.45, color: c, width: 6 });
      F.burst(p.x, p.y - 10, { n: 16, color: c, speed: [20, 130], life: [0.6, 1.2], size: [2, 4], grav: -220, wob: 130, jitter: 22 });
      say(b.name);
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
      G.audio.play('uiSelect');
      if (st === 'corrupt') { G.audio.play('roar'); F.shake(8); }
      G.enterPortal(s.boss, st === 'corrupt');
    } else if (s.id === 'seventh') {
      G.audio.play(run.runWon() ? 'pulse' : 'uiMove', { k: 0.4 });
      say(run.runWon() ? 'It stirs, but does not open. Not yet.' : 'Dormant');
    } else if (s.id === 'home') {
      G.audio.play('uiSelect');
      G.toHub('gate');
    } else if (s.id === 'fountain') {
      // the Cleansing Fountain: purge a corrupted boon's bane, for Sunshards (ui.js shows the choice)
      if (!run.banes().length) { G.audio.play('uiMove'); say(run.order.some((id) => G.boonDef(id).cursed) ? 'Nothing left to cleanse' : 'Nothing here needs cleansing'); return; }
      G.audio.play('uiSelect');
      G.ui.showFountain();
    } else if (s.id === 'fire') {
      G.audio.play('whoosh');
      F.burst(FIRE_X, FLOOR - 30, { n: 24, color: '255,170,90', speed: [60, 260], angle: -Math.PI / 2, spread: 1.2, life: [0.4, 1], size: [1.6, 3.4], grav: -120 });
      say('The fire is warm');
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
    if (best && G.playerControl() && !p.ulting && (I.pressed.heal || I.pressed.confirm)) use(best);
    showCard(best && best.id === 'boon' && !G.ui.current && !(turning(best.i) && REST.turn.t < TURN_SNAP) ? best : null);

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
    const key = s ? s.i + ':' + G.run.offer[s.i].id + ':' + REST.taken : null;
    if (key === cardFor) return;
    cardFor = key;
    if (!s) { el.classList.remove('show'); return; }
    const b = G.run.offer[s.i], own = b.relicReward ? 0 : G.boon(b.id), mine = REST.taken === s.i;
    el.className = 'item card focus show t-' + b.tag.toLowerCase();
    document.body.classList.toggle('pad', G.input.device === 'gamepad');
    el.querySelector('.ctag').textContent = b.relicReward ? 'A second relic' : b.pair ? 'Pair · ' + b.of.map((id) => G.boonDef(id).name).join(' + ') : b.tag;
    el.querySelector('.cname').textContent = b.name;
    el.querySelector('.cdesc').innerHTML = G.ui.esc(b.desc) + (own && !mine ? ' You hold ' + own + '.' : '') + (mine || b.relicReward ? '' : G.ui.pairNote(b))
      + (b.cursed ? '<span class="bane">' + G.ui.esc(b.bane) + '</span>' : '');
    el.querySelector('.cuse').textContent = mine ? 'Yours for the run' : REST.taken >= 0 ? 'You have taken one'
      : (G.input.device === 'gamepad' ? 'LB' : G.input.label('heal')) + '  take it';
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
    // the road's two ends: rocks behind you, a cliff past the seventh portal
    if (seen(0, 400)) poly(ctx, [-300, FLOOR, -300, FLOOR - 460, 40, FLOOR - 420, 80, FLOOR - 330, 112, FLOOR - 120, 96, FLOOR], paint.STONE);
    if (seen(RW, 400)) poly(ctx, [RW - 90, FLOOR, RW - 104, FLOOR - 280, RW - 50, FLOOR - 410, RW + 300, FLOOR - 500, RW + 300, FLOOR], paint.STONE);
    drawArch(ctx, t);
    drawFire(ctx, t);
    drawAltars(ctx, t);
    drawStone(ctx, t);
    drawFountain(ctx, t);
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
      const b = shownDef(s.i), tk = turnK(s.i), turn = turning(s.i) && REST.turn.t >= 0, mine = REST.taken === s.i, on = REST.near === s;
      const c = turn && REST.turn.t < TURN_SNAP ? mixRgb(colOf(REST.turn.mask), BLOOD, tk * tk) : colOf(b);
      // while it turns its light stutters, and the stone shakes harder and harder
      const stutter = turn && REST.turn.t < TURN_SNAP && Math.random() < 0.12 + 0.3 * tk ? 0.35 : 1;
      const lit = (mine ? 1 : REST.taken >= 0 ? 0.3 : 0.78) * stutter, bob = Math.sin(t * 1.8 + s.i * 1.7) * 4;
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
    if (!seen(STONE_X, 300) || G.up('reroll') <= 0) return;
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

  // The seventh portal, for the final trial: taller than the rest, dark and still. Once all six are
  // beaten it stirs, a slow pulse of pale light behind the stone, but it does not open (not yet).
  function drawSeventh(ctx, t) {
    const x = SEVENTH_X;
    if (!seen(x, 300)) return;
    const { poly, glow, block, diamond, STONE, STONE2 } = paint, stir = R().runWon(), hw = 78, top = FLOOR - 360, cy = FLOOR - 190;
    const pulse = stir ? 0.5 + 0.5 * Math.sin(t * 1.6) : 0;
    glow(ctx, '236,226,255', x, cy, 260, 0.06 + 0.22 * pulse);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - hw, FLOOR - 16); ctx.lineTo(x - hw, top + hw); ctx.arc(x, top + hw, hw, Math.PI, 0); ctx.lineTo(x + hw, FLOOR - 16); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#04030a'; ctx.fillRect(x - hw, top, hw * 2, FLOOR - top);
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
    // six sockets round the arch, one lit for each boss beaten this run
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
  };
  REST.drawFore = function () { };

  function label(s) {
    const run = R(), next = G.roman(run.trial + 1), of = G.roman(G.RUN_FIGHTS);
    if (s.id === 'fire') return ['The Fire', run.runWon() ? 'All six trials won. Rest a while.' : 'Trial ' + G.roman(run.trial) + ' won. Rest a while; nothing here can hurt you.', 'warm your hands'];
    if (s.id === 'stone') return ['Second Thoughts', 'Redraw the offering (' + run.rerolls + ' left this run)', 'redraw'];
    if (s.id === 'home') return ['The Way Home', 'The run is won. Back to the camp.', 'go home'];
    if (s.id === 'fountain') {
      const n = run.banes().length, cost = run.cleanseCost();
      return ['The Cleansing Fountain', n ? 'Purge a corrupted boon\u2019s drawback: ' + cost + ' Sunshards (you hold ' + G.meta.shards + ')'
        : 'Its water purges the drawback of a corrupted boon. You carry none.', n ? 'cleanse' : ''];
    }
    if (s.id === 'seventh') return ['The Seventh Portal', run.runWon() ? 'It stirs, but does not open. Not yet.' : 'Dormant. It waits for the other six (' + run.beaten.length + ' of ' + G.BOSS_IDS.length + ').', run.runWon() ? 'touch it' : ''];
    if (s.id === 'portal') {
      const B = G.bosses[s.boss], st = portalState(s.boss), ready = offerTaken();
      if (st === 'corrupt') return ['Corrupted: ' + B.name, 'Optional. Far stronger, and it does not count as a trial. Win it for a second relic and triple Sunshards.', ready ? 'enter, if you dare' : 'take from the offering first'];
      if (st === 'sealed') return [B.name, run.beaten.includes(s.boss) ? (run.cleansed.includes(s.boss) ? 'Beaten, and its corruption cleansed' : 'Beaten this run') : 'Sealed', ''];
      return [B.name, 'Trial ' + next + ' of ' + of, ready ? 'enter' : 'take from the offering first'];
    }
    return ['', '', ''];
  }
  function shortName(s) {
    if (s.id === 'boon') return shownDef(s.i).name;
    if (s.id === 'portal') { const B = G.bosses[s.boss]; return B ? (portalState(s.boss) === 'corrupt' ? 'Corrupted' : B.short) : ''; }
    return { fire: 'The Fire', stone: 'Second Thoughts', seventh: 'The Seventh', home: 'The Way Home', fountain: 'The Fountain' }[s.id];
  }

  // names over each place, what the nearest one does; in front of everything
  REST.drawOver = function (ctx) {
    const p = P(), near = REST.near, pad = G.input.device === 'gamepad', cam = G.cam.x, text = paint.text, run = R();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of places()) {
      // (the offering's plinths carry no names: a boon is read by standing at it, on its card, so a
      // corrupted one gives nothing away until you are there)
      if (s === near || s.id === 'boon' || !seen(s.x, 200)) continue;
      const name = shortName(s);
      if (!name) continue;
      const mine = s.id === 'boon' && REST.taken === s.i, dim = (s.id === 'boon' && REST.taken >= 0 && !mine) || (s.id === 'portal' && portalState(s.boss) === 'sealed');
      const cursed = s.id === 'boon' && shownDef(s.i).cursed;
      const col = mine ? paint.GOLD : cursed || (s.id === 'portal' && portalState(s.boss) === 'corrupt') ? '255,90,120' : '236,233,244';
      text(ctx, name.toUpperCase(), s.x, FLOOR - s.top, s.id === 'boon' ? 11 : 12, col, mine ? 0.95 : dim ? 0.3 : 0.6);
    }
    if (seen(ALTAR_X, 200) && altars().length && !(near && near.id === 'boon')) {
      const what = run.offerKind === 'relic' ? 'THE SPOILS' : 'THE OFFERING';
      text(ctx, REST.taken >= 0 ? what : what + '  ·  CHOOSE ONE', ALTAR_X, FLOOR - 200, 12, REST.taken >= 0 ? '236,233,244' : paint.GOLD, REST.taken >= 0 ? 0.55 : 0.6 + 0.25 * Math.sin(REST.t * 3));
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
      const sub = run.runWon()
        ? 'All ' + G.roman(G.RUN_FIGHTS) + ' trials won' + (run.corrupted.length ? '  ·  ' + (run.corrupted.length > 1 ? 'corrupted portals wait' : 'a corrupted portal waits') + ', if you dare  ·  or the way home, behind you' : '  ·  the way home is behind you')
        : (run.offerKind === 'relic' ? 'The corruption is cleansed  ·  take a relic, then choose a portal' : 'Trial ' + G.roman(run.trial) + ' of ' + G.roman(G.RUN_FIGHTS) + ' won  ·  take from the offering, then choose a portal');
      text(ctx, sub, cam + W / 2, 66, 12, '236,233,244', 0.45, '500');
      if (PORTAL_X > cam + W + 40 && offerTaken()) text(ctx, 'THE PORTALS  ›', cam + W - 96, 40, 12, paint.GOLD, 0.5 + 0.2 * Math.sin(REST.t * 3));
    }
  };
})();
