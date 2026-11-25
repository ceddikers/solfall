// Solfall - the Vigil: the camp between runs. It is nearly three screens wide and the view follows
// the hero across it. Everything that used to be a menu is a place: the Hall of Echoes to change
// hero, the Shrine, a training yard with a sparring post, the brazier that sets the difficulty,
// a ring to practise in (its menu chooses the foe), the reliquary where the run's relic
// is chosen, and the gate that starts a run.
// The backdrop is painted once into four layers that slide at different speeds (sky, far hills,
// a ruined aqueduct, near columns and tents); the places themselves are drawn every frame.
'use strict';
(function () {
  const FLOOR = G.FLOOR, F = G.fx, rnd = G.rand, W = G.W, TAU = G.TAU;
  const GOLD = '255,214,140', RIM = '255,206,150', WARM = '255,170,90';
  const STONE = '#120f26', STONE2 = '#1c1736', DARK = '#0b0919';
  const HW = 3820, WALL_L = 150, WALL_R = HW - 110, PAD = 48;
  const NOTES = ['7 health. Warnings last longer, attacks come slower', '5 health. The fight as intended', '4 health. Shorter warnings, less rest, extra attacks'];
  const FLAME = ['150,215,255', '255,170,90', '255,70,60'];
  // where things stand
  // The Hall of Echoes has one bay for each hero, between piers that stand BAY apart
  const NH = G.HEROES.length, BAY = 510 / NH, ARCH = BAY / 2 - 23;
  // (v2.5c: the hall stands by the reliquary and the gate, where a run ends and the next begins; it was at the
  // far left, three screens from the gate. It is drawn in its own frame, 300-880, moved over by HALL_DX.)
  const HALL_L = 2200, HALL_DX = HALL_L - 300;
  const ECHO_X = G.HEROES.map((h, i) => Math.round(HALL_DX + 335 + BAY * (i + 0.5)));
  const SHRINE_X = 1680, FIRE_X = 640, POST_X = 960, BRAZIER_X = 1330, RELIQ_X = 3050, GATE_X = 3500;
  const RING_X = 2020; // (the banners that stood before it went in v1.8c: the ring's own menu chooses the foe)

  const HUB = G.hub = { near: null, t: 0, lastX: FIRE_X - 70, msg: '', msgT: 0, W: HW, layers: null, flies: [], blades: [] };
  HUB.maxCam = HW - W;
  // Where the view wants to be: on the hero, a little ahead of the way they face.
  HUB.camTarget = () => G.clamp(G.player.x - W / 2 + G.player.facing * 70, 0, HUB.maxCam);
  HUB.spawn = (where) => (where === 'gate' ? GATE_X - 150 : where === 'ring' ? RING_X - 40 : FIRE_X - 70);

  function lcg(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ------------------------------------------------------------------ the sparring post
  // It stands in for a boss while the hero is in the camp, so every attack, special and Dawnbreak
  // can be tried on it. It cannot be hurt for good, and it charges Dawnbreak three times as fast.
  const D = G.bosses.dummy = {
    id: 'dummy', kit: true, name: 'SPARRING POST', short: 'The post', theme: 'hub', tips: [],
    hudCols: [null, ['#ffba5c', '#ffe08a'], ['#ffba5c', '#ffe08a'], ['#ffba5c', '#ffe08a']],
    w: 44, h: 96, ATTACKS: {},
    reset() {
      D.maxHp = 1e6; D.hp = D.maxHp; D.phase = 1; D.poise = 0; D.poiseMax = 400;
      D.staggered = false; D.invuln = false; D.active = true; D.dead = false; D.dying = false;
      D.ward = null; D.attackName = ''; D.sum = 0; D.sumT = 0; D.t = 0;
      D.body = { x: POST_X, y: FLOOR, flash: 0, kx: 0, kv: 0, hidden: false };
      D.core = { x: POST_X, y: FLOOR - 52, r: 22 };
      G.bounds = { l: WALL_L, r: WALL_R }; G.wind = 0; // the camp is wider than an arena
      toysReset();
    },
    attract() { D.reset(); },
    intro() { },
    release() { }, interrupt() { }, pushPlayer() { },
    targets() {
      const at = bellAt();
      return [{ id: 'body', kind: 'body', ref: D.body, cx: POST_X, cy: FLOOR - 48, hw: 22, hh: 48 },
        { id: 'bell', kind: 'toy', cx: at.x, cy: at.y, hw: 30, hh: 42 },
        { id: 'lamp', kind: 'toy', cx: lamp.x, cy: lamp.y, hw: LAMP_R + 5, hh: LAMP_R + 5 }];
    },
    damage(amount, t, info) {
      if (t && t.id === 'bell') return ringBell(info);
      if (t && t.id === 'lamp') return knockLamp(info);
      const b = D.body, dmg = Math.round(amount);
      b.flash = 1;
      b.kv += (info.dir || G.sign(POST_X - G.player.x) || 1) * (info.lance ? 9 : info.heavy ? 6 : 3);
      D.sum += dmg; D.sumT = 2.2;
      G.flow.dealt(dmg * 3);
      if (G.settings.numbers) {
        F.text(info.x + rnd(-12, 12), info.y - 16, String(dmg), { color: info.finisher ? GOLD : '255,255,255', size: info.finisher ? 28 : info.heavy ? 23 : 17, life: 0.7, pop: true });
      }
      F.burst(POST_X, FLOOR - 50, { n: info.heavy ? 5 : 2, color: '214,190,130', speed: [60, 260], angle: -Math.PI / 2, spread: 2.4, life: [0.3, 0.7], size: [1.5, 3], kind: 'chunk', grav: 1200 });
      return true;
    },
    update(dt) {
      const b = D.body;
      D.t += dt;
      b.flash = Math.max(0, b.flash - dt * 6);
      b.kv += (-b.kx * 120 - b.kv * 7) * dt; b.kx += b.kv * dt; // it rocks on its foot and settles
      if (D.sumT > 0) { D.sumT -= dt; if (D.sumT <= 0) D.sum = 0; }
    },
    drawGround() { },
    draw(ctx) {
      const b = D.body;
      ctx.save();
      ctx.translate(POST_X, FLOOR);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(0, 3, 34, 5, 0, 0, TAU); ctx.fill();
      ctx.rotate(G.clamp(b.kx, -14, 14) * 0.02);
      ctx.lineJoin = 'round';
      ctx.fillStyle = STONE2; ctx.strokeStyle = G.rgba(RIM, 0.6); ctx.lineWidth = 1.5;
      for (const pts of [[-26, 0, 26, 0, 14, -10, -14, -10], [-7, -10, 7, -10, 6, -84, -6, -84], [-32, -68, 32, -68, 32, -58, -32, -58]]) {
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // a dented helm and a battered breastplate hung on it
      ctx.beginPath(); ctx.arc(0, -97, 15, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = DARK; ctx.fillRect(-10, -100, 20, 4);
      ctx.fillStyle = '#241d44';
      ctx.beginPath(); ctx.moveTo(-18, -72); ctx.lineTo(18, -72); ctx.lineTo(14, -32); ctx.lineTo(0, -22); ctx.lineTo(-14, -32); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = G.rgba(RIM, 0.32);
      ctx.beginPath(); ctx.moveTo(-9, -62); ctx.lineTo(6, -42); ctx.moveTo(8, -64); ctx.lineTo(-4, -48); ctx.moveTo(-2, -36); ctx.lineTo(9, -52); ctx.stroke();
      if (b.flash > 0) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = b.flash * 0.8;
        ctx.drawImage(F.glow('255,255,255'), -60, -124, 120, 134);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    },
    drawDebug(ctx) {
      ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1;
      for (const t of D.targets()) ctx.strokeRect(t.cx - t.hw, t.cy - t.hh, t.hw * 2, t.hh * 2);
    },
  };


  // ------------------------------------------------------------------ toys
  // Two things in the camp that are only there to be hit: an old bell at the far end, which climbs
  // a scale while you keep it ringing, and a paper lantern in the yard, which counts the blows you
  // land before it touches the ground. Both are targets of the sparring post's "boss".
  const BELL_X = 224, TALLY_X = 420, LAMP_X = 1150, LAMP_R = 20;
  const JOURNAL_X = 318; // (v2.8a) the Boss Journal's lectern, by the Tally
  const PENT = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const bell = { a: 0, av: 0, n: 0, quiet: 9, flash: 0 };
  const lamp = { x: LAMP_X, y: FLOOR - LAMP_R, vx: 0, vy: 0, n: 0, rot: 0, idle: 0, flash: 0 };
  HUB.bell = bell; HUB.lamp = lamp;
  function toysReset() {
    Object.assign(bell, { a: 0, av: 0, n: 0, quiet: 9, flash: 0 });
    Object.assign(lamp, { x: LAMP_X, y: FLOOR - LAMP_R, vx: 0, vy: 0, n: 0, rot: 0, idle: 0, flash: 0 });
  }
  const bellAt = () => ({ x: BELL_X + Math.sin(bell.a) * 62, y: FLOOR - 150 + Math.cos(bell.a) * 62 });
  function featSay(f) {
    HUB.msg = 'Feat: ' + f.name + '  ◆ +' + f.pay; HUB.msgT = 4;
    G.audio.play('segment'); G.audio.play('heal');
    F.flash(GOLD, 0.16, 0.3);
  }
  function ringBell(info) {
    const P = G.player, at = bellAt();
    if (Math.abs(P.x - BELL_X) > 700) return false;
    const dir = info.dir || G.sign(BELL_X - P.x) || 1, hard = !!info.heavy;
    bell.av += dir * (hard ? 5.5 : 3.2);
    bell.n = bell.quiet < 1.6 ? bell.n + 1 : 1; bell.quiet = 0; bell.flash = 1;
    G.audio.play('chime', { n: PENT[Math.min(bell.n - 1, PENT.length - 1)], vol: hard ? 1.25 : 1 });
    F.ring(at.x, at.y, { r0: 20, r1: 110 + 12 * Math.min(bell.n, 10), life: 0.5, color: GOLD, width: 3 });
    F.burst(info.x, info.y, { n: hard ? 10 : 5, color: GOLD, speed: [60, 300], life: [0.3, 0.8], size: [1.5, 3.2], kind: 'spark' });
    F.light(at.x, at.y, 220, GOLD, 0.3, 0.6);
    if (bell.n >= 2) F.text(BELL_X, FLOOR - 236, String(bell.n), { color: GOLD, size: 16 + Math.min(10, bell.n), life: 0.7, pop: true });
    if (bell.n === 5) {
      // a full peal: light pours out of it
      F.burst(at.x, at.y, { n: 40, color: '214,255,170', speed: [60, 420], life: [0.8, 1.8], size: [2, 4], grav: -120, wob: 120 });
      F.shake(4);
      const f = G.feats.camp('camp.bell');
      if (f) featSay(f); else say('A full peal');
    }
    return true;
  }
  function knockLamp(info) {
    const P = G.player;
    if (Math.abs(P.x - lamp.x) > 700) return false;
    const air = lamp.y < FLOOR - LAMP_R - 6, hard = !!info.heavy;
    const above = !P.onGround && P.y - 22 < lamp.y - 34; // struck from above, it is driven down
    lamp.vx = G.clamp((lamp.x - P.x) * 2 + (info.dir || 0) * 80, -420, 420);
    lamp.vy = above ? 520 : -(600 + (hard ? 140 : 0));
    lamp.n = air ? lamp.n + 1 : 1; lamp.idle = 0; lamp.flash = 1;
    G.audio.play('paper', { n: lamp.n - 1 });
    F.burst(lamp.x, lamp.y, { n: hard ? 9 : 5, color: WARM, speed: [60, 280], life: [0.3, 0.7], size: [1.5, 3], kind: 'spark' });
    F.ring(lamp.x, lamp.y, { r0: 10, r1: 60, life: 0.25, color: WARM, width: 3 });
    if (lamp.n >= 2) F.text(lamp.x, lamp.y - 44, String(lamp.n), { color: lamp.n >= 10 ? GOLD : '255,236,200', size: 15 + Math.min(12, lamp.n), life: 0.6, pop: true });
    if (lamp.n === 10) { const f = G.feats.camp('camp.keep'); if (f) featSay(f); }
    return true;
  }
  // The lantern came down: say what the rally came to, and keep the best.
  function lampLanded() {
    const n = lamp.n; lamp.n = 0;
    if (n < 2) return;
    if (n > (G.meta.toys.keep || 0)) {
      G.meta.toys.keep = n; if (G.meta.earning()) G.meta.save();
      say('Lantern: ' + n + ' blows, your best'); G.audio.play('segment');
    } else say('Lantern: ' + n + ' blows');
  }
  function toysUpdate(dt) {
    bell.quiet += dt; bell.flash = Math.max(0, bell.flash - dt * 3);
    bell.av += (-bell.a * 30 - bell.av * 1.2) * dt; bell.a = G.clamp(bell.a + bell.av * dt, -1.3, 1.3);
    const L = lamp;
    L.flash = Math.max(0, L.flash - dt * 4);
    if (L.y < FLOOR - LAMP_R || L.vy < 0) {
      // in the air it is light: it falls slowly and the air takes its sideways speed
      L.vy += 900 * dt; L.vx *= Math.exp(-0.5 * dt);
      L.x += L.vx * dt; L.y += L.vy * dt; L.rot += L.vx * 0.012 * dt;
      if (L.x < WALL_L + LAMP_R) { L.x = WALL_L + LAMP_R; L.vx = Math.abs(L.vx) * 0.7; }
      if (L.x > WALL_R - LAMP_R) { L.x = WALL_R - LAMP_R; L.vx = -Math.abs(L.vx) * 0.7; }
      if (L.y >= FLOOR - LAMP_R) {
        L.y = FLOOR - LAMP_R;
        if (L.n > 0) lampLanded();
        if (L.vy > 170) { L.vy = -L.vy * 0.38; F.dust(L.x, FLOOR, 2); } else L.vy = 0;
        L.vx *= 0.6;
      }
    } else {
      L.x = G.clamp(L.x + L.vx * dt, WALL_L + LAMP_R, WALL_R - LAMP_R); L.rot += L.vx * 0.012 * dt; L.vx *= Math.exp(-3 * dt);
      L.idle += dt;
      // left lying far from its place, it finds its own way back
      if (L.idle > 6 && Math.abs(L.x - LAMP_X) > 80 && Math.abs(G.player.x - L.x) > 160) {
        F.burst(L.x, L.y, { n: 12, color: WARM, speed: [30, 160], life: [0.3, 0.8], size: [2, 4], grav: -160 });
        L.x = LAMP_X; L.vx = 0; L.idle = 0; L.rot = 0;
        F.burst(L.x, L.y, { n: 12, color: WARM, speed: [30, 160], life: [0.3, 0.8], size: [2, 4], grav: -160 });
      }
    }
  }
  function drawBell(ctx, t) {
    if (!seen(BELL_X, 300)) return;
    const x = BELL_X, k = bell.flash;
    glow(ctx, GOLD, x, FLOOR - 100, 120, 0.16 + 0.3 * k);
    for (const side of [-1, 1]) poly(ctx, [x + side * 52 - 7, FLOOR, x + side * 50 - 5, FLOOR - 156, x + side * 50 + 5, FLOOR - 156, x + side * 52 + 7, FLOOR], STONE);
    poly(ctx, [x - 66, FLOOR - 150, x + 66, FLOOR - 150, x + 58, FLOOR - 164, x - 58, FLOOR - 164], STONE2);
    poly(ctx, [x - 74, FLOOR - 164, x, FLOOR - 188, x + 74, FLOOR - 164], STONE);
    ctx.save();
    ctx.translate(x, FLOOR - 150); ctx.rotate(-bell.a);
    ctx.strokeStyle = 'rgba(160,150,190,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.stroke();
    poly(ctx, [-8, 22, 8, 22, 15, 38, 20, 64, 30, 80, -30, 80, -20, 64, -15, 38], '#4a3a22', G.rgba(GOLD, 0.6 + 0.4 * k));
    ctx.fillStyle = G.rgba(GOLD, 0.5 + 0.5 * k); ctx.fillRect(-29, 76, 58, 3);
    ctx.strokeStyle = G.rgba(GOLD, 0.35); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-17, 48); ctx.lineTo(17, 48); ctx.moveTo(-21, 62); ctx.lineTo(21, 62); ctx.stroke();
    // the clapper and its cord lag a little behind the bell
    const lag = G.clamp(bell.av * 0.05, -0.4, 0.4);
    ctx.rotate(lag);
    ctx.strokeStyle = 'rgba(160,150,190,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(0, 100); ctx.stroke();
    ctx.fillStyle = '#8a7a52'; ctx.beginPath(); ctx.arc(0, 86, 5, 0, TAU); ctx.fill();
    poly(ctx, [-4, 98, 4, 98, 0, 112], G.rgba(RIM, 0.9), false);
    ctx.restore();
    pool(ctx, GOLD, x, 110, 0.18 + 0.4 * k);
  }
  function drawTally(ctx, t) {
    if (!seen(TALLY_X, 300)) return;
    const x = TALLY_X, on = HUB.near && HUB.near.id === 'tally', FE = G.feats;
    glow(ctx, GOLD, x, FLOOR - 96, 110, on ? 0.34 : 0.2);
    block(ctx, x, 96, 10, 0, STONE2);
    poly(ctx, [x - 36, FLOOR - 10, x - 32, FLOOR - 150, x - 12, FLOOR - 170, x + 24, FLOOR - 160, x + 36, FLOOR - 10], STONE);
    // one mark for each feat, cut in rows: lit when it is done
    const ids = [];
    for (const b of FE.BOSSES) for (const f of FE.of(b)) ids.push(f.id);
    for (const f of FE.CAMP) ids.push(f.id);
    ctx.globalCompositeOperation = 'lighter';
    ids.forEach((id, i) => {
      const gap = Math.min(24, 126 / Math.ceil(ids.length / 4)); // the rows close up as bosses are added
      const cx = x - 18 + (i % 4) * 12, cy = FLOOR - 138 + Math.floor(i / 4) * gap, done = FE.done(id);
      if (done) diamond(ctx, cx, cy, 4, 7, G.rgba(GOLD, 0.8 + 0.2 * Math.sin(t * 2 + i)));
      else { ctx.strokeStyle = G.rgba(RIM, 0.28); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6); ctx.stroke(); }
    });
    ctx.globalCompositeOperation = 'source-over';
    pool(ctx, GOLD, x, 100, on ? 0.34 : 0.2);
  }
  // (v2.8a) the Boss Journal: a lectern with a book lying open on it, a page lifting now and then
  function drawJournal(ctx, t) {
    if (!seen(JOURNAL_X, 200)) return;
    const x = JOURNAL_X, on = HUB.near && HUB.near.id === 'journal';
    glow(ctx, GOLD, x, FLOOR - 70, 80, on ? 0.34 : 0.18);
    poly(ctx, [x - 4, FLOOR, x - 3, FLOOR - 56, x + 3, FLOOR - 56, x + 4, FLOOR], STONE);
    poly(ctx, [x - 16, FLOOR, x - 12, FLOOR - 6, x + 12, FLOOR - 6, x + 16, FLOOR], STONE2);
    poly(ctx, [x - 22, FLOOR - 58, x + 22, FLOOR - 66, x + 24, FLOOR - 60, x - 20, FLOOR - 52], STONE2);
    // the open book: two pages, and a third turning
    poly(ctx, [x - 20, FLOOR - 60, x - 1, FLOOR - 64, x - 1, FLOOR - 70, x - 19, FLOOR - 66], '#d8ccb0');
    poly(ctx, [x + 1, FLOOR - 64, x + 21, FLOOR - 68, x + 20, FLOOR - 74, x + 1, FLOOR - 70], '#e6dcc2');
    const turn = Math.max(0, Math.sin(t * 0.6)) ** 6;
    if (turn > 0.02) poly(ctx, [x, FLOOR - 69, x + 18 - 30 * turn, FLOOR - 73 - 10 * Math.sin(turn * Math.PI), x + 17 - 30 * turn, FLOOR - 79 - 10 * Math.sin(turn * Math.PI), x, FLOOR - 75], '#f0e8d4');
    ctx.strokeStyle = 'rgba(60,40,30,0.55)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 16, FLOOR - 63 - i * 1.6); ctx.lineTo(x - 4, FLOOR - 66 - i * 1.6); ctx.moveTo(x + 4, FLOOR - 67 - i * 1.6); ctx.lineTo(x + 17, FLOOR - 70 - i * 1.6); ctx.stroke(); }
    pool(ctx, GOLD, x, 60, on ? 0.3 : 0.16);
  }
  function drawLamp(ctx, t) {
    // where it lives: a ring painted on the paving
    if (seen(LAMP_X, 200)) { ctx.strokeStyle = G.rgba(WARM, 0.3); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(LAMP_X, FLOOR + 4, 30, 4, 0, 0, TAU); ctx.stroke(); }
    const L = lamp;
    if (!seen(L.x, 200)) return;
    const k = L.flash;
    glow(ctx, WARM, L.x, L.y, 70 + 30 * k, 0.5 + 0.3 * k);
    if (L.y > FLOOR - 260) pool(ctx, WARM, L.x, 90, 0.4 * (1 - (FLOOR - LAMP_R - L.y) / 260));
    ctx.save();
    ctx.translate(L.x, L.y); ctx.rotate(L.rot);
    const g = ctx.createRadialGradient(0, 2, 2, 0, 0, 22);
    g.addColorStop(0, '#fff4d6'); g.addColorStop(0.55, '#ffb060'); g.addColorStop(1, '#b0502a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 17, 20, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(90,30,10,0.55)'; ctx.lineWidth = 1;
    for (const rx of [6, 12]) { ctx.beginPath(); ctx.ellipse(0, 0, rx, 20, 0, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 20); ctx.stroke();
    ctx.fillStyle = '#241408'; ctx.fillRect(-8, -23, 16, 4); ctx.fillRect(-7, 19, 14, 4);
    poly(ctx, [-2, 23, 2, 23, 0, 33], G.rgba(GOLD, 0.9), false);
    ctx.restore();
  }

  // ------------------------------------------------------------------ the places
  // x: where it stands. reach: how close the hero must be. top: how high its name floats.
  const STATIONS = [
    ...G.HEROES.map((h, i) => ({ id: 'echo', hero: i, x: ECHO_X[i], reach: Math.min(56, BAY / 2 - 8), top: 262 })),
    { id: 'shrine', x: SHRINE_X, reach: 78, top: 300 },
    { id: 'tally', x: TALLY_X, reach: 62, top: 204 },
    { id: 'journal', x: JOURNAL_X, reach: 40, top: 176 },
    { id: 'post', x: POST_X, reach: 0, top: 140 },
    { id: 'brazier', x: BRAZIER_X, reach: 70, top: 222 },
    { id: 'ring', x: RING_X, reach: 44, top: 150 },
    { id: 'gate', x: GATE_X, reach: 160, top: 474 },
  ];
  const foeName = (v) => (G.bosses[v] ? G.bosses[v].short : 'Whoever comes');
  // (v2.8a: your own empty bay in the Hall is the Wardrobe, where costumes are put on)
  const usable = (s) => s.reach > 0;
  const ownBay = (s) => s.id === 'echo' && G.HEROES[s.hero].id === G.run.hero;

  // The reliquary: one plinth for each relic on offer this visit (three, or four with the Shrine's
  // Fourth Relic). The plinths are places too, rebuilt only when the offer changes.
  const relicCol = (r) => G.relics.col(r.id); // (each relic's light: relics.js)
  let relicKey = '', relicSt = [];
  function relicStations() {
    const offer = G.run.relicOffer || [], key = offer.map((r) => r.id).join(',');
    if (key !== relicKey) {
      relicKey = key;
      relicSt = offer.map((r, i) => ({ id: 'relic', i, x: RELIQ_X + (i - (offer.length - 1) / 2) * 112, reach: 50, top: i % 2 ? 154 : 132 }));
    }
    return relicSt;
  }
  const places = () => STATIONS.concat(relicStations());
  // Roll the relics on offer (on arriving, and when the hero or the difficulty changes, since both decide what may be offered).
  HUB.offer = function () { G.run.relic = null; G.run.rollRelics(); };
  const foeCol = (v) => (G.THEMES[v] ? G.THEMES[v][1].boss : '200,200,215');

  function label(s) {
    if (ownBay(s)) {
      // the Wardrobe: mastery, and the costume worn
      const h = G.HEROES[s.hero], MA = G.mastery, lv = MA.level(h.id), nx = MA.next(h.id), c = MA.worn(h.id), n = MA.unlocked(h.id).length;
      const mast = 'Mastery ' + (lv ? G.roman(lv) : '0') + (nx ? ' (' + MA.xp(h.id) + ' of ' + nx + ' toward the next costume: a trial won is 1, a run won 4)' : ' (every costume unlocked)');
      return ['The Wardrobe: ' + (c ? c.name : h.name + '’s own colours'), (c ? c.note + ' ' : '') + mast, n ? 'change costume (' + (n + 1) + ' to choose from)' : ''];
    }
    if (s.id === 'echo') {
      const h = G.HEROES[s.hero];
      return [h.name + ', ' + h.title, h.blurb, 'take up ' + h.name + '’s ' + h.weapon];
    }
    if (s.id === 'journal') {
      const J = G.JOURNAL || {}, rec = G.meta.journal || {};
      let all = 0, seen = 0;
      for (const b in J) for (const a in J[b]) { all++; if (((rec[b] || {})[a] || {}).seen) seen++; }
      return ['The Journal', seen + ' of ' + all + ' attacks written down: each boss move, once you have met it', 'read it'];
    }
    if (s.id === 'tally') return ['The Tally', G.feats.count() + ' of ' + G.feats.total + ' feats done', 'read it'];
    if (s.id === 'shrine') return ['The Shrine', '◆ ' + G.meta.shards + ' Sunshards', 'spend them'];
    if (s.id === 'brazier') return ['The Brazier: ' + G.diff().name, NOTES[G.settings.difficulty], 'change the difficulty'];
    if (s.id === 'ring') {
      // the foe last practised, and what you have done against it: how often it fell, your fastest win
      const f = G.settings.firstFoe, kills = G.meta.kills[f] || 0, best = G.meta.bestTime(f);
      const rec = !G.bosses[f] ? 'Any boss, from any phase' : foeName(f) + ': ' + (!kills ? 'not yet beaten'
        : 'beaten ' + kills + (kills > 1 ? ' times' : ' time') + (best ? ' \u00b7 fastest ' + G.ui.fmtTime(best) + ' on ' + G.diff().name : ''));
      return ['The Proving Ring', rec, 'step in'];
    }
    if (s.id === 'relic') {
      const r = G.run.relicOffer[s.i];
      return [r.name, r.desc + ' It awakens three times in a run.', G.run.relic === r.id ? 'this is your relic for the run' : 'take it for the run'];
    }
    if (s.id === 'gate') {
      const deep = G.store.load('depth', {})[G.settings.difficulty], r = G.relicDef(G.run.relic);
      const won = G.store.load('wins', {})[G.settings.difficulty];
      return ['The Gate', (r ? 'Relic: ' + r.name : 'No relic chosen: the reliquary is just behind you')
        + (won ? ' \u00b7 runs won ' + won : deep ? ' \u00b7 deepest trial ' + G.roman(deep) + ' of ' + G.roman(G.RUN_FIGHTS) : ''), r ? 'begin the run' : 'choose a relic and begin'];
    }
    return ['', '', ''];
  }
  function shortName(s) {
    if (s.id === 'echo') return G.HEROES[s.hero].id === G.run.hero ? 'Wardrobe' : G.HEROES[s.hero].name;
    if (s.id === 'journal') return 'Journal';
    if (s.id === 'relic') return G.run.relicOffer[s.i].name;
    return { shrine: 'The Shrine', tally: 'The Tally', post: 'Sparring post', brazier: G.diff().name, ring: 'Practice', gate: 'The Gate' }[s.id];
  }

  function say(text) { HUB.msg = text; HUB.msgT = 3; }
  HUB.say = say;

  function use(s) {
    const P = G.player;
    if (ownBay(s)) {
      // the Wardrobe: the next costume unlocked, or back to the hero's own colours
      const h = G.HEROES[s.hero], MA = G.mastery;
      if (!MA.unlocked(h.id).length) { G.audio.play('uiMove'); say('Win trials as ' + h.name + ' to unlock a costume (' + MA.xp(h.id) + ' of ' + MA.next(h.id) + ')'); return; }
      const c = MA.cycle(h.id), x = P.x, f = P.facing;
      G.run.reset(); HUB.offer();
      P.reset(); G.flow.reset(); G.moments.reset(); G.sets.reset();
      P.x = x; P.facing = f; P.ember = G.PLAYER.SEG * P.segs;
      G.ui.buildRun();
      const hh = G.hero();
      G.audio.play('heal'); G.audio.play('whoosh');
      F.ring(P.x, P.y - 30, { r0: 10, r1: 150, life: 0.45, color: hh.hot, width: 6 });
      F.burst(P.x, P.y - 30, { n: 22, color: hh.col, speed: [30, 200], life: [0.5, 1.1], size: [2, 4], grav: -160, wob: 120, jitter: 18 });
      G.costumeFx('special', P.x, P.y - 34);
      say(c ? c.name : h.name + '’s own colours');
      return;
    }
    if (s.id === 'journal') { G.audio.play('uiSelect'); G.ui.showJournal(); return; }
    if (s.id === 'echo') {
      // trade places with the echo: the hero you were goes back to their own alcove
      const h = G.HEROES[s.hero], x = P.x, f = P.facing;
      G.settings.hero = h.id; G.saveSettings();
      G.run.reset(); HUB.offer();
      P.reset(); G.flow.reset(); G.moments.reset(); G.sets.reset();
      P.x = x; P.facing = f; P.ember = G.PLAYER.SEG * P.segs;
      G.ui.buildRun();
      G.audio.play('heal'); G.audio.play('blink');
      F.flash(h.hot, 0.3, 0.35); F.shake(5);
      F.shatter(s.x, FLOOR - 70, h.col, 18, { hot: h.hot, r: 280, r0: 30 });
      F.ring(P.x, P.y - 24, { r0: 10, r1: 170, life: 0.45, color: h.hot, width: 6 });
      F.burst(P.x, P.y - 10, { n: 20, color: h.col, speed: [20, 130], life: [0.6, 1.3], size: [2, 4], grav: -220, wob: 130, jitter: 22 });
      say(h.name + ' takes up the vigil');
    } else if (s.id === 'shrine') {
      G.audio.play('uiSelect'); G.ui.showShrine();
    } else if (s.id === 'tally') {
      G.audio.play('uiSelect'); G.ui.showFeats();
    } else if (s.id === 'brazier') {
      G.settings.difficulty = (G.settings.difficulty + 1) % 3; G.saveSettings();
      const c = FLAME[G.settings.difficulty];
      G.audio.play('whoosh'); F.shake(4);
      F.burst(s.x, FLOOR - 120, { n: 30, color: c, speed: [80, 420], angle: -Math.PI / 2, spread: 1.6, life: [0.3, 0.9], size: [2, 5], grav: -200 });
      F.light(s.x, FLOOR - 120, 340, c, 0.45, 0.8);
      say(G.diff().name);
      HUB.offer(); retake(); // health changes with the difficulty, and with it which relics may be offered
    } else if (s.id === 'ring') {
      G.audio.play('uiSelect'); G.ui.showPractice();
    } else if (s.id === 'relic') {
      // take the relic from its plinth: it is yours for the run, and it works at once so it can be tried on the post
      const r = G.run.relicOffer[s.i], c = relicCol(r);
      if (G.run.relic === r.id) { G.audio.play('uiMove'); return; }
      G.run.relic = r.id; retake();
      G.audio.play('segment'); G.audio.play('heal');
      F.flash(c, 0.18, 0.3); F.shake(4);
      F.shatter(s.x, FLOOR - 96, c, 14, { r: 240, r0: 24 });
      F.ring(s.x, FLOOR - 96, { r0: 10, r1: 150, life: 0.45, color: c, width: 6 });
      F.burst(P.x, P.y - 10, { n: 16, color: c, speed: [20, 130], life: [0.6, 1.2], size: [2, 4], grav: -220, wob: 130, jitter: 22 });
      say(r.name);
    } else if (s.id === 'gate') {
      // with a relic in hand the gate opens at once; without one it asks which
      G.audio.play('uiSelect');
      if (G.run.relic) G.startFight(); else G.openGate();
    }
  }

  // Make the hero over again where they stand, so a relic (or a change of difficulty) takes effect in the camp.
  function retake() {
    const P = G.player, x = P.x, y = P.y, f = P.facing, vy = P.vy, ground = P.onGround, ult = P.ult;
    P.reset(); G.flow.reset();
    P.x = x; P.y = y; P.facing = f; P.vy = vy; P.onGround = ground; P.ult = ult; P.ember = G.PLAYER.SEG * P.segs;
    G.ui.buildHp(P.maxHp); G.ui.buildRun();
  }

  // ------------------------------------------------------------------ update
  HUB.update = function (dt) {
    const P = G.player, I = G.input;
    HUB.t += dt;
    if (HUB.msgT > 0) HUB.msgT -= dt;
    HUB.lastX = P.x;
    let best = null, bd = 1e9;
    for (const s of places()) {
      const d = Math.abs(P.x - s.x);
      if (usable(s) && d < s.reach && d < bd && P.y > FLOOR - 150) { best = s; bd = d; }
    }
    HUB.near = best;
    if (best && G.playerControl() && !P.ulting && (I.pressed.heal || I.pressed.confirm)) use(best);

    toysUpdate(dt);

    // fires throw sparks, the gate drinks light, the shard sheds it
    const d = G.settings.difficulty, c = FLAME[d];
    if (Math.random() < dt * 22) F.spawn({ x: BRAZIER_X + rnd(-16, 16), y: FLOOR - 112, vx: rnd(-18, 18), vy: -rnd(60, 170) * (1 + 0.4 * d), life: rnd(0.5, 1.1), size: rnd(1.6, 3.4), color: c, wob: 80, rot: rnd(0, 6) });
    if (Math.random() < dt * 14) F.spawn({ x: FIRE_X + rnd(-10, 10), y: FLOOR - 22, vx: rnd(-16, 16), vy: -rnd(50, 150), life: rnd(0.5, 1.2), size: rnd(1.4, 2.8), color: WARM, wob: 70, rot: rnd(0, 6) });
    for (const side of [-1, 1]) if (Math.random() < dt * 8) F.spawn({ x: GATE_X + side * 196 + rnd(-8, 8), y: FLOOR - 196, vx: rnd(-12, 12), vy: -rnd(40, 120), life: rnd(0.5, 1), size: rnd(1.4, 2.6), color: GOLD, wob: 60, rot: rnd(0, 6) });
    if (Math.random() < dt * 16) {
      const a = rnd(0, TAU), r = rnd(90, 210);
      F.spawn({ x: GATE_X + Math.cos(a) * r, y: FLOOR - 170 + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.5, vy: -Math.sin(a) * r * 1.5, life: 0.62, size: rnd(1.6, 3.2), color: GOLD });
    }
    if (Math.random() < dt * 5) F.spawn({ x: SHRINE_X + rnd(-22, 22), y: FLOOR - 120, vx: rnd(-8, 8), vy: -rnd(20, 70), life: rnd(0.9, 1.7), size: rnd(1.4, 2.6), color: GOLD, wob: 50, rot: rnd(0, 6) });

    // fireflies drift and blink; the grass leans away from the hero
    for (const f of HUB.flies) {
      f.x += (Math.sin(HUB.t * f.s + f.ph) * 16 + f.dx) * dt; f.y += Math.cos(HUB.t * f.s * 1.3 + f.ph) * 9 * dt;
      if (f.x < WALL_L) f.dx = Math.abs(f.dx); if (f.x > WALL_R) f.dx = -Math.abs(f.dx);
    }
    const px = P.y > FLOOR - 6 ? P.x : -9999;
    for (const b of HUB.blades) {
      const dd = b.x - px;
      if (Math.abs(dd) > 400) { b.b *= 0.9; continue; }
      const push = Math.abs(dd) < 32 ? G.sign(dd || 1) * (1 - Math.abs(dd) / 32) * 9 : 0;
      b.v += ((push - b.b) * 160 - b.v * 9) * dt; b.b += b.v * dt;
    }
  };

  // ------------------------------------------------------------------ painted layers
  function canvas(w) {
    const c = document.createElement('canvas'), q = G.bgK;
    c.width = Math.ceil(w * q); c.height = Math.ceil((G.H + PAD * 2) * q);
    const x = c.getContext('2d');
    x.scale(q, q); x.translate(0, PAD);
    return [c, x];
  }
  function ridge(x, seed, base, amp, col, w) {
    const q = lcg(seed), ph = [q() * 6, q() * 6, q() * 6];
    x.fillStyle = col;
    x.beginPath(); x.moveTo(0, FLOOR + 10);
    for (let px = 0; px <= w; px += 8) {
      const n = Math.sin(px * 0.0052 + ph[0]) * 0.5 + Math.sin(px * 0.0151 + ph[1]) * 0.3 + Math.sin(px * 0.041 + ph[2]) * 0.13;
      x.lineTo(px, base - (n * 0.5 + 0.5) * amp);
    }
    x.lineTo(w, FLOOR + 10); x.closePath(); x.fill();
  }

  function buildSky() {
    const w = W + PAD * 2, [c, x] = canvas(w), T = -PAD;
    let g = x.createLinearGradient(0, T, 0, FLOOR + 20);
    g.addColorStop(0, '#05071c'); g.addColorStop(0.28, '#12143c'); g.addColorStop(0.52, '#35285c');
    g.addColorStop(0.72, '#84476a'); g.addColorStop(0.87, '#dc8660'); g.addColorStop(1, '#ffd098');
    x.fillStyle = g; x.fillRect(0, T, w, FLOOR + 20 - T);
    const r = lcg(77);
    for (let i = 0; i < 340; i++) {
      const sx = r() * w, sy = T + r() * (FLOOR - 190 - T), a = r(), s = r();
      const fade = Math.pow(1 - (sy - T) / (FLOOR - 150 - T), 1.4);
      x.fillStyle = 'rgba(255,255,255,' + ((0.25 + 0.75 * a) * fade).toFixed(3) + ')';
      const sz = s > 0.94 ? 2.3 : s > 0.6 ? 1.4 : 1;
      x.fillRect(sx, sy, sz, sz);
    }
    // a thin moon, high on the left
    const mx = 250 + PAD, my = 116;
    g = x.createRadialGradient(mx, my, 10, mx, my, 150);
    g.addColorStop(0, 'rgba(206,212,255,0.28)'); g.addColorStop(1, 'rgba(206,212,255,0)');
    x.fillStyle = g; x.fillRect(mx - 150, my - 150, 300, 300);
    x.fillStyle = '#ecebff';
    x.beginPath(); x.arc(mx, my, 30, 0.686, 4.733); x.arc(mx + 13, my - 6, 27, 4.236, 1.183, true); x.closePath(); x.fill();
    // dawn gathering on the horizon to the right, where the gate is
    g = x.createRadialGradient(980 + PAD, FLOOR + 50, 30, 980 + PAD, FLOOR + 50, 760);
    g.addColorStop(0, 'rgba(255,196,128,0.6)'); g.addColorStop(0.45, 'rgba(255,150,110,0.2)'); g.addColorStop(1, 'rgba(255,150,110,0)');
    x.fillStyle = g; x.fillRect(0, T, w, FLOOR + 20 - T);
    // the dimmed sun itself: a black disc with a thin crown
    const ex = 1000 + PAD, ey = 356;
    g = x.createRadialGradient(ex, ey, 40, ex, ey, 190);
    g.addColorStop(0, 'rgba(255,220,170,0.55)'); g.addColorStop(1, 'rgba(255,220,170,0)');
    x.fillStyle = g; x.fillRect(ex - 190, ey - 190, 380, 380);
    x.fillStyle = 'rgba(255,230,190,0.55)';
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * TAU + r() * 0.1, len = 20 + r() * 58, wd = 0.045 + r() * 0.03;
      x.beginPath(); x.moveTo(ex + Math.cos(a - wd) * 44, ey + Math.sin(a - wd) * 44); x.lineTo(ex + Math.cos(a) * (46 + len), ey + Math.sin(a) * (46 + len)); x.lineTo(ex + Math.cos(a + wd) * 44, ey + Math.sin(a + wd) * 44); x.closePath(); x.fill();
    }
    x.fillStyle = '#0a0716'; x.beginPath(); x.arc(ex, ey, 46, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(255,238,206,0.95)'; x.lineWidth = 2.5; x.beginPath(); x.arc(ex, ey, 46, 0, TAU); x.stroke();
    // long thin clouds catching the first light
    for (let i = 0; i < 12; i++) {
      const cx = r() * w, cy = FLOOR - 330 + r() * 250, rw = 110 + r() * 260, rh = 4 + r() * 9, warm = (cy - (FLOOR - 330)) / 250;
      g = x.createLinearGradient(cx - rw, 0, cx + rw, 0);
      const col = warm > 0.5 ? '255,176,140' : '190,150,210';
      g.addColorStop(0, G.rgba(col, 0)); g.addColorStop(0.5, G.rgba(col, 0.2 + 0.14 * warm)); g.addColorStop(1, G.rgba(col, 0));
      x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rw, rh, 0, 0, TAU); x.fill();
    }
    return c;
  }

  function buildFar(f) {
    const w = W + PAD * 2 + HUB.maxCam * f, [c, x] = canvas(w);
    ridge(x, 11, FLOOR - 70, 230, '#51406f', w);
    ridge(x, 29, FLOOR - 24, 160, '#3d3160', w);
    // a few towers too far off to matter
    const r = lcg(5);
    x.fillStyle = '#3d3160';
    for (let i = 0; i < 9; i++) { const tx = r() * w, th = 60 + r() * 110; x.fillRect(tx, FLOOR - 60 - th, 9 + r() * 8, th + 70); }
    const g = x.createLinearGradient(0, FLOOR - 200, 0, FLOOR + 10);
    g.addColorStop(0, 'rgba(255,170,130,0)'); g.addColorStop(1, 'rgba(255,170,130,0.32)');
    x.fillStyle = g; x.fillRect(0, FLOOR - 200, w, 210);
    return c;
  }

  function buildMid(f) {
    const w = W + PAD * 2 + HUB.maxCam * f, [c, x] = canvas(w), r = lcg(41);
    const col = '#2b2249', deck = FLOOR - 300, span = 176;
    // a ruined aqueduct marching across the valley; some spans have fallen
    x.fillStyle = col;
    let whole = true;
    for (let px = -40; px < w + span; px += span) {
      const gone = r() < 0.24, ph = 300 - (gone ? 40 + r() * 120 : 0);
      x.fillRect(px - 17, FLOOR + 6 - ph - 30, 34, ph + 30);
      x.fillRect(px - 24, FLOOR - 14, 48, 20);
      if (!gone && whole) {
        // deck and the arch under it, back to the previous pillar
        x.fillRect(px - span, deck - 30, span, 30);
        x.beginPath(); x.moveTo(px - span + 17, deck); x.lineTo(px - 17, deck); x.lineTo(px - 17, deck + 70);
        x.arc(px - span / 2, deck + 70, span / 2 - 17, 0, Math.PI, true); x.closePath(); x.fill();
        x.fillStyle = G.rgba(RIM, 0.2); x.fillRect(px - span, deck - 30, span, 2); x.fillStyle = col;
      } else if (!gone) {
        x.beginPath(); x.moveTo(px - 17, deck - 30); x.lineTo(px - 60 - r() * 30, deck - 30); x.lineTo(px - 40, deck - 4); x.lineTo(px - 17, deck + 30); x.closePath(); x.fill();
      }
      whole = !gone;
    }
    // a great broken tower
    const tx = w * 0.58;
    x.beginPath(); x.moveTo(tx - 52, FLOOR + 6); x.lineTo(tx - 46, FLOOR - 430); x.lineTo(tx - 20, FLOOR - 470); x.lineTo(tx + 4, FLOOR - 440); x.lineTo(tx + 30, FLOOR - 500); x.lineTo(tx + 48, FLOOR - 420); x.lineTo(tx + 54, FLOOR + 6); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,196,130,0.75)';
    for (const [wx, wy] of [[-8, 380], [14, 300], [-16, 220]]) x.fillRect(tx + wx, FLOOR - wy, 7, 13);
    // mist lying in the valley
    const g = x.createLinearGradient(0, FLOOR - 150, 0, FLOOR + 10);
    g.addColorStop(0, 'rgba(150,110,160,0)'); g.addColorStop(1, 'rgba(190,130,150,0.42)');
    x.fillStyle = g; x.fillRect(0, FLOOR - 150, w, 160);
    return c;
  }

  function buildNear(f) {
    const w = W + PAD * 2 + HUB.maxCam * f, [c, x] = canvas(w), r = lcg(97);
    const col = '#17122e';
    function rim(px, top, h, wd) {
      const lg = x.createLinearGradient(px + wd / 2, 0, px + wd / 2 - 11, 0);
      lg.addColorStop(0, G.rgba(RIM, 0.3)); lg.addColorStop(1, G.rgba(RIM, 0));
      x.fillStyle = lg; x.fillRect(px + wd / 2 - 11, top, 11, h);
    }
    let px = 40;
    while (px < w) {
      const kind = r();
      if (kind < 0.5) {
        // a broken column
        const wd = 34 + r() * 26, h = 150 + r() * 260, top = FLOOR - h;
        x.fillStyle = col;
        x.beginPath(); x.moveTo(px - wd / 2, FLOOR + 4); x.lineTo(px - wd / 2, top + r() * 26); x.lineTo(px - wd / 6, top - r() * 12); x.lineTo(px + wd / 8, top + r() * 30); x.lineTo(px + wd / 2, top + r() * 16); x.lineTo(px + wd / 2, FLOOR + 4); x.closePath(); x.fill();
        x.fillRect(px - wd / 2 - 7, FLOOR - 16, wd + 14, 20);
        rim(px, top + 30, h - 44, wd);
        x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2;
        for (let k = -1; k <= 1; k++) { x.beginPath(); x.moveTo(px + k * wd * 0.22, top + 44); x.lineTo(px + k * wd * 0.22, FLOOR - 18); x.stroke(); }
        px += 150 + r() * 190;
      } else if (kind < 0.72) {
        // a tent with a lamp lit inside
        const tw = 150 + r() * 70, th = 96 + r() * 44;
        x.fillStyle = col;
        x.beginPath(); x.moveTo(px - tw / 2, FLOOR + 4); x.lineTo(px, FLOOR - th); x.lineTo(px + tw / 2, FLOOR + 4); x.closePath(); x.fill();
        const lg = x.createLinearGradient(0, FLOOR - th * 0.6, 0, FLOOR);
        lg.addColorStop(0, 'rgba(255,150,70,0.15)'); lg.addColorStop(1, 'rgba(255,190,110,0.8)');
        x.fillStyle = lg;
        x.beginPath(); x.moveTo(px - tw * 0.12, FLOOR + 4); x.lineTo(px, FLOOR - th * 0.6); x.lineTo(px + tw * 0.12, FLOOR + 4); x.closePath(); x.fill();
        x.strokeStyle = G.rgba(RIM, 0.4); x.lineWidth = 1.5;
        x.beginPath(); x.moveTo(px, FLOOR - th); x.lineTo(px + tw / 2, FLOOR + 4); x.stroke();
        x.fillStyle = col; x.fillRect(px - 1.5, FLOOR - th - 22, 3, 22);
        x.fillStyle = G.rgba(RIM, 0.7); x.beginPath(); x.moveTo(px + 1, FLOOR - th - 22); x.lineTo(px + 18, FLOOR - th - 16); x.lineTo(px + 1, FLOOR - th - 10); x.closePath(); x.fill();
        px += tw + 120 + r() * 120;
      } else if (kind < 0.88) {
        // a bare tree
        x.strokeStyle = col; x.lineCap = 'round';
        (function branch(bx, by, a, len, wd, depth) {
          const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
          x.lineWidth = wd; x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke();
          if (depth <= 0) return;
          branch(ex, ey, a - 0.3 - r() * 0.5, len * 0.68, wd * 0.62, depth - 1);
          branch(ex, ey, a + 0.25 + r() * 0.5, len * 0.62, wd * 0.62, depth - 1);
        })(px, FLOOR + 2, -Math.PI / 2 + (r() - 0.5) * 0.3, 110 + r() * 50, 15, 4);
        x.lineCap = 'butt';
        px += 200 + r() * 160;
      } else {
        // a lamp on a pole
        x.fillStyle = col; x.fillRect(px - 3, FLOOR - 170, 6, 174); x.fillRect(px - 3, FLOOR - 170, 26, 4);
        const lg = x.createRadialGradient(px + 22, FLOOR - 152, 2, px + 22, FLOOR - 152, 70);
        lg.addColorStop(0, 'rgba(255,200,120,0.85)'); lg.addColorStop(0.3, 'rgba(255,170,90,0.3)'); lg.addColorStop(1, 'rgba(255,170,90,0)');
        x.fillStyle = lg; x.fillRect(px - 50, FLOOR - 224, 144, 144);
        x.fillStyle = '#ffe9c0'; x.fillRect(px + 18, FLOOR - 160, 8, 13);
        px += 170 + r() * 150;
      }
    }
    return c;
  }

  function build() {
    HUB.layers = [
      { c: buildSky(), f: 0 }, { c: buildFar(0.1), f: 0.1 }, { c: buildMid(0.34), f: 0.34 }, { c: buildNear(0.68), f: 0.68 },
    ];
    const r = lcg(203);
    HUB.twinkles = [];
    for (let i = 0; i < 18; i++) HUB.twinkles.push({ x: 40 + r() * 1200, y: 16 + r() * 300, sp: 0.5 + r() * 1.2, ph: r() * 6.28 });
    HUB.flies = [];
    for (let i = 0; i < 54; i++) HUB.flies.push({ x: WALL_L + r() * (WALL_R - WALL_L), y: FLOOR - 16 - r() * 170, s: 0.5 + r() * 0.9, ph: r() * 6.28, dx: (r() - 0.5) * 14 });
    HUB.blades = [];
    for (let i = 0; i < 430; i++) HUB.blades.push({ x: 60 + r() * (HW - 120), h: 5 + r() * 12, lean: (r() - 0.5) * 3, ph: r() * 6.28, v: 0, b: 0 });
    // what passes in front of the view: low rocks along the bottom edge, in their own faster-moving space
    HUB.fore = [];
    for (let fx = 120; fx < HUB.maxCam * 1.3 + W; fx += 150 + r() * 260) HUB.fore.push({ x: fx, kind: 'rock', w: 50 + r() * 90, h: 16 + r() * 30 });
  }

  // ------------------------------------------------------------------ drawing helpers
  function glow(ctx, col, x, y, r, a) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    ctx.drawImage(F.glow(col), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  // light lying on the floor under something bright
  function pool(ctx, col, x, r, a) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    ctx.drawImage(F.glow(col), x - r, FLOOR - 9, r * 2, 30);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function poly(ctx, pts, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke !== false) { ctx.strokeStyle = stroke || G.rgba(RIM, 0.5); ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  // a block of stone with a lit top edge, standing on the floor
  function block(ctx, x, w, h, y0, fill) {
    const b = FLOOR - (y0 || 0);
    poly(ctx, [x - w / 2 - 5, b, x - w / 2, b - h, x + w / 2, b - h, x + w / 2 + 5, b], fill || STONE);
    ctx.fillStyle = G.rgba(RIM, 0.55); ctx.fillRect(x - w / 2, b - h, w, 2);
  }
  function flame(ctx, x, y, w, h, col, t, seed) {
    ctx.globalCompositeOperation = 'lighter';
    for (const [k, al, c] of [[1, 0.72, col], [0.62, 0.5, col], [0.34, 0.85, '255,244,214']]) {
      ctx.fillStyle = G.rgba(c, al);
      ctx.beginPath(); ctx.moveTo(x - w * k / 2, y);
      for (let i = 0; i <= 8; i++) {
        const q = i / 8, e = Math.sin(Math.PI * q);
        ctx.lineTo(x - w * k / 2 + w * k * q + Math.sin(t * 9 + i * 1.7 + seed) * w * 0.1 * e, y - h * k * e * (0.72 + 0.28 * Math.sin(t * 13 + i * 2.3 + seed)));
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function diamond(ctx, x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y); ctx.lineTo(x, y + h); ctx.lineTo(x - w, y); ctx.closePath(); ctx.fill();
  }
  const seen = (x, m) => Math.abs(x - (G.cam.x + W / 2)) < W / 2 + (m || 300);

  // ------------------------------------------------------------------ the backdrop and the ground
  // The sky and the far hills, shared with the rest area between trials (rest.js), which also
  // borrows the drawing helpers. n: how many of the painted layers (the nearest has the camp's lamps).
  HUB.drawSky = function (ctx, n, t) {
    if (!HUB.layers) build();
    const cam = G.cam.x;
    for (const L of HUB.layers.slice(0, n || HUB.layers.length)) ctx.drawImage(L.c, cam * (1 - L.f) - PAD, -PAD, L.c.width / G.bgK, L.c.height / G.bgK);
    ctx.globalCompositeOperation = 'lighter';
    const img = F.glow('255,255,255');
    for (const tw of HUB.twinkles) {
      const k = Math.sin(t * tw.sp + tw.ph);
      if (k <= 0) continue;
      const s = 3 + 5 * k * k;
      ctx.globalAlpha = k * k * k * 0.9;
      ctx.drawImage(img, cam + tw.x - s, tw.y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  HUB.paint = { glow, pool, poly, block, flame, diamond, STONE, STONE2, DARK, RIM, GOLD, WARM };

  HUB.drawBack = function (ctx) {
    if (!HUB.layers) build();
    const cam = G.cam.x, t = HUB.t;
    for (const L of HUB.layers) ctx.drawImage(L.c, cam * (1 - L.f) - PAD, -PAD, L.c.width / G.bgK, L.c.height / G.bgK);
    // stars that twinkle (fixed to the view, like the sky they sit in)
    ctx.globalCompositeOperation = 'lighter';
    const img = F.glow('255,255,255');
    for (const tw of HUB.twinkles) {
      const k = Math.sin(t * tw.sp + tw.ph);
      if (k <= 0) continue;
      const s = 3 + 5 * k * k;
      ctx.globalAlpha = k * k * k * 0.9;
      ctx.drawImage(img, cam + tw.x - s, tw.y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    // the ground: paved stone, darker with depth
    const x0 = cam - PAD - 20, x1 = cam + W + PAD + 20;
    const g = ctx.createLinearGradient(0, FLOOR, 0, G.H + PAD);
    g.addColorStop(0, '#483c64'); g.addColorStop(0.15, '#1d1832'); g.addColorStop(1, '#040309');
    ctx.fillStyle = g; ctx.fillRect(x0, FLOOR, x1 - x0, G.H + PAD - FLOOR);
    ctx.fillStyle = G.rgba(RIM, 0.55); ctx.fillRect(x0, FLOOR, x1 - x0, 2);
    ctx.fillStyle = G.rgba(RIM, 0.1); ctx.fillRect(x0, FLOOR + 2, x1 - x0, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = Math.floor(x0 / 96) * 96; px < x1; px += 96) { ctx.moveTo(px + ((px / 96) % 2 ? 0 : 20), FLOOR + 3); ctx.lineTo(px + ((px / 96) % 2 ? 0 : 20), FLOOR + 22); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0, FLOOR + 22, x1 - x0, 2);
    // the camp's two ends: a fallen wall behind you, the cliff past the gate
    if (seen(0, 500)) {
      poly(ctx, [-300, FLOOR, -300, FLOOR - 520, 30, FLOOR - 470, 70, FLOOR - 380, 104, FLOOR - 396, 126, FLOOR - 250, 150, FLOOR - 120, 132, FLOOR], STONE);
      poly(ctx, [120, FLOOR, 150, FLOOR - 40, 200, FLOOR - 26, 232, FLOOR - 58, 268, FLOOR], STONE2);
    }
    if (seen(HW, 500)) poly(ctx, [HW - 96, FLOOR, HW - 112, FLOOR - 300, HW - 60, FLOOR - 430, HW + 300, FLOOR - 520, HW + 300, FLOOR], STONE);

    drawBell(ctx, t);
    drawHall(ctx, t);
    drawShrine(ctx, t);
    drawTally(ctx, t);
    drawJournal(ctx, t);
    drawFire(ctx, t);
    drawYard(ctx, t);
    drawLamp(ctx, t);
    drawBrazier(ctx, t);
    drawRing(ctx, t);
    drawReliquary(ctx, t);
    drawGate(ctx, t);
  };

  const still = { x: 0, y: 0, facing: 1, vx: 0, vy: 0, onGround: true, squash: 0, runT: 0, atk: null, primed: false, hurtFlash: 0, dash: false };

  // The Hall of Echoes: an alcove for each hero. Yours stands empty while you are out of it.
  function drawHall(ctx, t) {
    if (!seen(HALL_DX + 590, 520)) return;
    const near = HUB.near && HUB.near.id === 'echo' ? HUB.near.hero : -1;
    ctx.save(); ctx.translate(HALL_DX, 0);
    // back wall, and a step up to the hall
    ctx.fillStyle = DARK; ctx.fillRect(322, FLOOR - 226, 536, 226);
    block(ctx, 590, 600, 9, 0, STONE2);
    for (let i = 0; i < NH; i++) {
      const cx = ECHO_X[i] - HALL_DX, h = G.costumed(G.HEROES[i]), mine = h.id === G.run.hero, on = near === i;
      // light in the alcove, in that hero's colour
      glow(ctx, h.col, cx, FLOOR - 92, on ? 128 : 100, mine ? 0.22 : on ? 0.62 : 0.36 + 0.06 * Math.sin(t * 1.7 + i * 2));
      block(ctx, cx, Math.min(64, ARCH * 2 - 14), 12, 9, STONE);
      if (mine) {
        // your own place: only your sigil, waiting
        const bob = Math.sin(t * 2) * 3;
        glow(ctx, h.col, cx, FLOOR - 84 + bob, 34, 0.6);
        ctx.globalCompositeOperation = 'lighter';
        diamond(ctx, cx, FLOOR - 84 + bob, 8, 14, G.rgba(h.col, 0.9)); diamond(ctx, cx, FLOOR - 84 + bob, 3.5, 7, 'rgba(255,255,255,0.9)');
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.globalAlpha = on ? 0.97 : 0.66;
        still.x = cx; still.y = FLOOR - 21; still.facing = 1;
        G.drawHero(ctx, G.costumed(h), still); // (v2.8a: in the costume they wear)
        ctx.globalAlpha = 1;
      }
    }
    // the arcade in front of them: piers, an arch over each bay, a beam, and what is left of the roof
    for (let i = 0; i < NH; i++) {
      const cx = ECHO_X[i] - HALL_DX, ay = FLOOR - 212 + ARCH; // every arch reaches the same height, however wide the bays
      ctx.fillStyle = STONE;
      ctx.beginPath(); ctx.moveTo(cx - ARCH, FLOOR - 226); ctx.lineTo(cx + ARCH, FLOOR - 226); ctx.lineTo(cx + ARCH, ay); ctx.arc(cx, ay, ARCH, 0, Math.PI, true); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = G.rgba(RIM, 0.5); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, ay, ARCH, Math.PI, 0); ctx.stroke();
      // a pennant in the hero's colour over each arch
      const h = G.HEROES[i], sw = Math.sin(t * 1.5 + i) * 3;
      poly(ctx, [cx - 11, FLOOR - 252, cx + 11, FLOOR - 252, cx + 11 + sw, FLOOR - 214, cx + sw, FLOOR - 224, cx - 11 + sw, FLOOR - 214], STONE2, G.rgba(h.col, 0.9));
      ctx.globalCompositeOperation = 'lighter'; diamond(ctx, cx + sw * 0.5, FLOOR - 236, 4, 7, G.rgba(h.col, 0.95)); ctx.globalCompositeOperation = 'source-over';
    }
    for (let i = 0; i <= NH; i++) {
      const px = 335 + i * BAY;
      poly(ctx, [px - 23, FLOOR - 9, px - 23, FLOOR - 226, px + 23, FLOOR - 226, px + 23, FLOOR - 9], STONE);
      poly(ctx, [px - 30, FLOOR - 9, px - 30, FLOOR - 24, px + 30, FLOOR - 24, px + 30, FLOOR - 9], STONE2);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px - 8, FLOOR - 210); ctx.lineTo(px - 8, FLOOR - 28); ctx.moveTo(px + 8, FLOOR - 210); ctx.lineTo(px + 8, FLOOR - 28); ctx.stroke();
      const lg = ctx.createLinearGradient(px + 23, 0, px + 12, 0);
      lg.addColorStop(0, G.rgba(RIM, 0.3)); lg.addColorStop(1, G.rgba(RIM, 0));
      ctx.fillStyle = lg; ctx.fillRect(px + 12, FLOOR - 226, 11, 202);
    }
    poly(ctx, [300, FLOOR - 226, 300, FLOOR - 254, 880, FLOOR - 254, 880, FLOOR - 226], STONE2);
    poly(ctx, [312, FLOOR - 254, 420, FLOOR - 318, 560, FLOOR - 300, 600, FLOOR - 334, 668, FLOOR - 286, 720, FLOOR - 296, 742, FLOOR - 254], STONE);
    ctx.fillStyle = G.rgba(RIM, 0.55); ctx.fillRect(300, FLOOR - 254, 580, 2);
    ctx.restore();
  }

  // The Shrine: a stepped dais under the ribs of a fallen dome, and the shard that turns above it.
  function drawShrine(ctx, t) {
    if (!seen(SHRINE_X, 420)) return;
    const x = SHRINE_X, on = HUB.near && HUB.near.id === 'shrine', bob = Math.sin(t * 1.6) * 6, cy = FLOOR - 150 + bob;
    // ribs of the dome, behind
    ctx.lineCap = 'round';
    for (const [a0, a1] of [[Math.PI, Math.PI * 1.44], [-0.02, -Math.PI * 0.3]]) {
      ctx.strokeStyle = STONE; ctx.lineWidth = 17;
      ctx.beginPath(); ctx.arc(x, FLOOR - 30, 196, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
      ctx.strokeStyle = G.rgba(RIM, 0.4); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, FLOOR - 30, 204, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // a shaft of light, and the shard's glow
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createLinearGradient(0, FLOOR - 420, 0, FLOOR - 30);
    lg.addColorStop(0, G.rgba(GOLD, 0)); lg.addColorStop(1, G.rgba(GOLD, on ? 0.26 : 0.16));
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(x - 26, FLOOR - 30); ctx.lineTo(x - 70, FLOOR - 420); ctx.lineTo(x + 70, FLOOR - 420); ctx.lineTo(x + 26, FLOOR - 30); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    glow(ctx, GOLD, x, cy, on ? 150 : 116, on ? 0.8 : 0.55);
    // small shards circle the great one: one, and one more for each trophy won. Those behind are drawn first.
    const n = 1 + G.meta.trophies();
    const orbit = (front) => {
      for (let i = 0; i < n + 2; i++) {
        const a = t * 0.9 + i * TAU / (n + 2), s = Math.sin(a);
        if ((s > 0) !== front) continue;
        const ox = x + Math.cos(a) * 82, oy = cy + s * 20 + 10, k = 0.75 + 0.25 * s;
        ctx.globalCompositeOperation = 'lighter';
        diamond(ctx, ox, oy, 5 * k, 11 * k, G.rgba(GOLD, i < n ? 0.95 : 0.3));
        ctx.globalCompositeOperation = 'source-over';
      }
    };
    orbit(false);
    const w = 20 * Math.abs(Math.cos(t * 1.1)) + 5;
    ctx.globalCompositeOperation = 'lighter';
    diamond(ctx, x, cy, w, 46, G.rgba(GOLD, 0.95)); diamond(ctx, x, cy, w * 0.42, 30, 'rgba(255,255,255,0.92)');
    ctx.globalCompositeOperation = 'source-over';
    orbit(true);
    // the dais, with a ring of runes turning on it
    block(ctx, x, 300, 10, 0, STONE2); block(ctx, x, 236, 10, 10, STONE); block(ctx, x, 172, 10, 20, STONE2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(GOLD, on ? 0.9 : 0.55); ctx.lineWidth = 2; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -t * 18;
    ctx.beginPath(); ctx.ellipse(x, FLOOR - 31, 70, 6, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.globalCompositeOperation = 'source-over';
    pool(ctx, GOLD, x, 190, 0.45);
  }

  // The fire you come back to: a tent, a bedroll, a blade left in the ground.
  function drawFire(ctx, t) {
    if (!seen(FIRE_X, 460)) return;
    const x = FIRE_X;
    glow(ctx, WARM, x, FLOOR - 40, 250, 0.42 + 0.05 * Math.sin(t * 11));
    // tent, open to the fire
    poly(ctx, [x - 300, FLOOR, x - 178, FLOOR - 172, x - 56, FLOOR], STONE);
    const lg = ctx.createLinearGradient(0, FLOOR - 110, 0, FLOOR);
    lg.addColorStop(0, 'rgba(255,150,70,0.12)'); lg.addColorStop(1, 'rgba(255,190,110,0.75)');
    poly(ctx, [x - 206, FLOOR, x - 178, FLOOR - 112, x - 150, FLOOR], lg, false);
    ctx.strokeStyle = STONE; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x - 178, FLOOR - 172); ctx.lineTo(x - 178, FLOOR - 206); ctx.stroke();
    const sw = Math.sin(t * 1.9) * 4;
    poly(ctx, [x - 176, FLOOR - 206, x - 140 + sw, FLOOR - 198, x - 176, FLOOR - 186], '#3a2a52', G.rgba(RIM, 0.7));
    // bedroll and a pack
    poly(ctx, [x + 70, FLOOR, x + 74, FLOOR - 12, x + 170, FLOOR - 12, x + 176, FLOOR], '#2a2048');
    ctx.fillStyle = '#3a2a52'; ctx.beginPath(); ctx.arc(x + 80, FLOOR - 10, 10, 0, TAU); ctx.fill(); ctx.strokeStyle = G.rgba(RIM, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
    poly(ctx, [x + 196, FLOOR, x + 200, FLOOR - 30, x + 228, FLOOR - 34, x + 236, FLOOR], STONE2);
    // a sword left standing in the ground, a helm hung on it
    ctx.strokeStyle = '#8a86a8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 92, FLOOR); ctx.lineTo(x - 86, FLOOR - 64); ctx.stroke();
    ctx.strokeStyle = STONE2; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 97, FLOOR - 58); ctx.lineTo(x - 76, FLOOR - 56); ctx.stroke();
    ctx.fillStyle = STONE2; ctx.beginPath(); ctx.arc(x - 85, FLOOR - 72, 9, Math.PI, 0); ctx.fill(); ctx.strokeStyle = G.rgba(RIM, 0.6); ctx.lineWidth = 1.5; ctx.stroke();
    // stones, logs and the fire
    ctx.fillStyle = STONE2;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(x + i * 12, FLOOR - 3, 8, 5, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#1a1024'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 24, FLOOR - 4); ctx.lineTo(x + 20, FLOOR - 16); ctx.moveTo(x + 24, FLOOR - 4); ctx.lineTo(x - 20, FLOOR - 16); ctx.stroke(); ctx.lineCap = 'butt';
    flame(ctx, x, FLOOR - 10, 34, 54, WARM, t, 0);
    pool(ctx, WARM, x, 260, 0.6);
  }

  // The yard: a fence, a rack of spare weapons, the post (drawn as the camp's "boss"), a butt for arrows.
  function drawYard(ctx, t) {
    if (!seen(POST_X, 420)) return;
    const x = POST_X;
    ctx.strokeStyle = STONE; ctx.lineWidth = 6;
    ctx.beginPath();
    for (let px = x - 190; px <= x + 190; px += 76) { ctx.moveTo(px, FLOOR); ctx.lineTo(px, FLOOR - 62); }
    ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 196, FLOOR - 50); ctx.lineTo(x + 196, FLOOR - 46); ctx.moveTo(x - 196, FLOOR - 26); ctx.lineTo(x + 196, FLOOR - 24); ctx.stroke();
    // weapon rack
    const rx = x - 150;
    ctx.strokeStyle = STONE2; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(rx - 34, FLOOR); ctx.lineTo(rx - 26, FLOOR - 96); ctx.moveTo(rx + 34, FLOOR); ctx.lineTo(rx + 26, FLOOR - 96); ctx.moveTo(rx - 32, FLOOR - 80); ctx.lineTo(rx + 32, FLOOR - 80); ctx.stroke();
    ctx.strokeStyle = '#8a86a8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(rx - 14, FLOOR - 6); ctx.lineTo(rx - 10, FLOOR - 128); ctx.moveTo(rx + 2, FLOOR - 6); ctx.lineTo(rx + 4, FLOOR - 112); ctx.moveTo(rx + 16, FLOOR - 6); ctx.lineTo(rx + 20, FLOOR - 140); ctx.stroke();
    poly(ctx, [rx + 14, FLOOR - 140, rx + 20, FLOOR - 160, rx + 26, FLOOR - 140], '#8a86a8', false);
    ctx.strokeStyle = STONE2; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(rx - 17, FLOOR - 104); ctx.lineTo(rx - 3, FLOOR - 104); ctx.stroke();
    // archery butt
    const bx = x + 150;
    ctx.strokeStyle = STONE2; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(bx - 22, FLOOR); ctx.lineTo(bx, FLOOR - 60); ctx.lineTo(bx + 22, FLOOR); ctx.stroke();
    ctx.fillStyle = '#2a2048'; ctx.beginPath(); ctx.ellipse(bx, FLOOR - 72, 30, 34, 0, 0, TAU); ctx.fill();
    for (const [r, a] of [[30, 0.5], [20, 0.4], [9, 0.9]]) { ctx.strokeStyle = G.rgba(RIM, a); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(bx, FLOOR - 72, r, r * 1.13, 0, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = '#d6aaff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 4, FLOOR - 78); ctx.lineTo(bx + 30, FLOOR - 92); ctx.stroke();
    // straw trodden flat round the post
    ctx.fillStyle = 'rgba(214,190,130,0.16)'; ctx.beginPath(); ctx.ellipse(x, FLOOR + 3, 92, 5, 0, 0, TAU); ctx.fill();
  }

  // The brazier: a great bowl on a stepped plinth. Its flame is the difficulty.
  function drawBrazier(ctx, t) {
    if (!seen(BRAZIER_X, 420)) return;
    const x = BRAZIER_X, d = G.settings.difficulty, c = FLAME[d], on = HUB.near && HUB.near.id === 'brazier';
    glow(ctx, c, x, FLOOR - 130, 210 + 50 * d, (on ? 0.62 : 0.5) + 0.05 * Math.sin(t * 10));
    // chains out to two posts, each with a pennant
    for (const side of [-1, 1]) {
      const px = x + side * 150;
      poly(ctx, [px - 9, FLOOR, px - 7, FLOOR - 150, px + 7, FLOOR - 150, px + 9, FLOOR], STONE);
      ctx.strokeStyle = 'rgba(160,150,190,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(px, FLOOR - 146); ctx.quadraticCurveTo(x + side * 80, FLOOR - 70, x + side * 44, FLOOR - 104); ctx.stroke(); ctx.setLineDash([]);
      const sw = Math.sin(t * 1.7 + side) * 3;
      poly(ctx, [px, FLOOR - 150, px + side * 26 + sw, FLOOR - 142, px, FLOOR - 128], STONE2, G.rgba(c, 0.85));
    }
    block(ctx, x, 190, 12, 0, STONE2); block(ctx, x, 136, 14, 12, STONE); block(ctx, x, 60, 40, 26, STONE2);
    poly(ctx, [x - 56, FLOOR - 106, x + 56, FLOOR - 106, x + 36, FLOOR - 66, x - 36, FLOOR - 66], STONE);
    ctx.fillStyle = G.rgba(c, 0.8); ctx.fillRect(x - 54, FLOOR - 106, 108, 2.5);
    flame(ctx, x, FLOOR - 104, 76, 70 + 44 * d, c, t, 3);
    pool(ctx, c, x, 240 + 40 * d, 0.55);
  }

  // The proving ring: two marker stones and a circle cut in the floor, where a single foe can be practised.
  function drawRing(ctx, t) {
    if (!seen(RING_X, 300)) return;
    const x = RING_X, on = HUB.near && HUB.near.id === 'ring', c = foeCol(G.settings.firstFoe);
    for (const side of [-1, 1]) {
      poly(ctx, [x + side * 46 - 9, FLOOR, x + side * 46 - 6, FLOOR - 58, x + side * 46 + 2, FLOOR - 70, x + side * 46 + 8, FLOOR - 54, x + side * 46 + 10, FLOOR], STONE);
      ctx.globalCompositeOperation = 'lighter'; diamond(ctx, x + side * 46 + 1, FLOOR - 40, 3.5, 7, G.rgba(c, on ? 1 : 0.7)); ctx.globalCompositeOperation = 'source-over';
    }
    glow(ctx, c, x, FLOOR - 30, on ? 90 : 64, on ? 0.5 : 0.3);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(c, on ? 0.95 : 0.6); ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = t * 16;
    ctx.beginPath(); ctx.ellipse(x, FLOOR + 1, 40, 5, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.globalCompositeOperation = 'source-over';
    pool(ctx, c, x, 90, on ? 0.5 : 0.3);
  }

  // The reliquary: a low wall of niches behind a row of plinths, a relic turning over each. The one
  // you have taken burns brightly; the rest dim once a choice is made.
  function drawReliquary(ctx, t) {
    const st = relicStations();
    if (!st.length || !seen(RELIQ_X, 460)) return;
    const x0 = st[0].x - 56, x1 = st[st.length - 1].x + 56, taken = G.run.relic;
    // the wall, broken at one end, with a lit niche behind each plinth
    poly(ctx, [x0, FLOOR, x0, FLOOR - 150, x0 + 40, FLOOR - 176, x1 - 60, FLOOR - 176, x1 - 30, FLOOR - 150, x1 - 14, FLOOR - 118, x1, FLOOR - 124, x1, FLOOR], STONE);
    ctx.fillStyle = G.rgba(RIM, 0.5); ctx.fillRect(x0 + 40, FLOOR - 176, x1 - x0 - 100, 2);
    block(ctx, (x0 + x1) / 2, x1 - x0 + 40, 8, 0, STONE2);
    for (const s of st) {
      const r = G.run.relicOffer[s.i], c = relicCol(r), mine = taken === r.id, on = HUB.near === s;
      const lit = mine ? 1 : taken ? 0.34 : 0.75, bob = Math.sin(t * 1.8 + s.i * 1.7) * 4, cy = FLOOR - 98 + bob;
      // niche
      ctx.fillStyle = DARK;
      ctx.beginPath(); ctx.moveTo(s.x - 30, FLOOR - 8); ctx.lineTo(s.x - 30, FLOOR - 120); ctx.arc(s.x, FLOOR - 120, 30, Math.PI, 0); ctx.lineTo(s.x + 30, FLOOR - 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = G.rgba(c, 0.35 + 0.4 * lit); ctx.lineWidth = 1.5; ctx.stroke();
      glow(ctx, c, s.x, cy, (mine ? 92 : 62) + (on ? 16 : 0), (0.2 + 0.5 * lit) + (on ? 0.12 : 0));
      // plinth
      block(ctx, s.x, 44, 44, 8, STONE2);
      ctx.fillStyle = G.rgba(c, 0.5 * lit + 0.2); ctx.fillRect(s.x - 22, FLOOR - 52, 44, 2);
      // the relic: a cut stone turning in its own light
      const w = (mine ? 13 : 10) * (0.35 + 0.65 * Math.abs(Math.cos(t * 1.2 + s.i))), h = mine ? 22 : 17;
      ctx.globalCompositeOperation = 'lighter';
      diamond(ctx, s.x, cy, w + 2, h, G.rgba(c, 0.95 * lit));
      diamond(ctx, s.x, cy, w * 0.45 + 1, h * 0.6, 'rgba(255,255,255,' + 0.9 * lit + ')');
      if (mine) {
        ctx.strokeStyle = G.rgba(c, 0.8); ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 14;
        ctx.beginPath(); ctx.ellipse(s.x, cy, 30, 34, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.globalCompositeOperation = 'source-over';
      pool(ctx, c, s.x, 70, 0.3 * lit);
    }
  }

  // The gate: steps, two fire-bowls on tall plinths, and the light of the trials turning in the arch.
  function drawGate(ctx, t) {
    if (!seen(GATE_X, 560)) return;
    const x = GATE_X, on = HUB.near && HUB.near.id === 'gate', cy = FLOOR - 190;
    glow(ctx, GOLD, x, cy, on ? 330 : 280, on ? 0.6 : 0.46);
    // rays leaning out of the arch
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.34 + Math.sin(t * 0.5 + i) * 0.06, len = 520 + 60 * Math.sin(t * 0.8 + i * 2);
      const lg = ctx.createLinearGradient(x, cy, x + Math.cos(a) * len, cy + Math.sin(a) * len);
      lg.addColorStop(0, G.rgba(GOLD, 0.1 + 0.03 * Math.sin(t * 1.2 + i))); lg.addColorStop(1, G.rgba(GOLD, 0));
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + Math.cos(a - 0.022) * len, cy + Math.sin(a - 0.022) * len); ctx.lineTo(x + Math.cos(a + 0.022) * len, cy + Math.sin(a + 0.022) * len); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // the portal
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 84, FLOOR - 372, 168, 348); ctx.clip();
    ctx.fillStyle = '#06040e'; ctx.fillRect(x - 84, FLOOR - 372, 168, 348);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const k = ((t * 0.3 + i / 7) % 1), r = 14 + 190 * k;
      ctx.strokeStyle = G.rgba(i % 2 ? GOLD : '255,246,225', 0.7 * (1 - k)); ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.ellipse(x, cy, r * 0.5, r, 0, t * 0.5 + i * 1.1, t * 0.5 + i * 1.1 + 4.5); ctx.stroke();
    }
    ctx.drawImage(F.glow(GOLD), x - 120, cy - 220, 240, 440);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.2 * Math.sin(t * 3)) + ')';
    ctx.beginPath(); ctx.ellipse(x, cy, 9, 52, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // steps
    block(ctx, x, 470, 8, 0, STONE2); block(ctx, x, 390, 8, 8, STONE); block(ctx, x, 310, 8, 16, STONE2);
    // the arch
    for (const side of [-1, 1]) {
      poly(ctx, [x + side * 84, FLOOR - 24, x + side * 84, FLOOR - 372, x + side * 134, FLOOR - 372, x + side * 140, FLOOR - 24], STONE);
      poly(ctx, [x + side * 78, FLOOR - 24, x + side * 78, FLOOR - 46, x + side * 146, FLOOR - 46, x + side * 146, FLOOR - 24], STONE2);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + side * 100, FLOOR - 356); ctx.lineTo(x + side * 100, FLOOR - 50); ctx.moveTo(x + side * 118, FLOOR - 356); ctx.lineTo(x + side * 118, FLOOR - 50); ctx.stroke();
      ctx.fillStyle = G.rgba(GOLD, 0.22); ctx.fillRect(side > 0 ? x + 84 : x - 92, FLOOR - 372, 8, 348);
    }
    poly(ctx, [x - 156, FLOOR - 372, x + 156, FLOOR - 372, x + 156, FLOOR - 398, x - 156, FLOOR - 398], STONE2);
    poly(ctx, [x - 148, FLOOR - 398, x + 148, FLOOR - 398, x + 120, FLOOR - 436, x, FLOOR - 470, x - 120, FLOOR - 436], STONE);
    ctx.globalCompositeOperation = 'lighter';
    diamond(ctx, x, FLOOR - 426, 11, 18, G.rgba(GOLD, 0.95)); diamond(ctx, x, FLOOR - 426, 5, 9, 'rgba(255,255,255,0.9)');
    ctx.globalCompositeOperation = 'source-over';
    // fire-bowls either side
    for (const side of [-1, 1]) {
      const px = x + side * 196;
      block(ctx, px, 46, 150, 8, STONE);
      poly(ctx, [px - 30, FLOOR - 184, px + 30, FLOOR - 184, px + 18, FLOOR - 158, px - 18, FLOOR - 158], STONE2);
      glow(ctx, GOLD, px, FLOOR - 200, 100, 0.5);
      flame(ctx, px, FLOOR - 182, 40, 50, '255,176,84', t, side * 5);
    }
    pool(ctx, GOLD, x, 330, 0.6);
  }

  // Grass and fireflies: in front of the buildings, behind the hero.
  HUB.draw = function (ctx) {
    const t = HUB.t, cam = G.cam.x;
    ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? G.rgba(RIM, 0.32) : STONE;
      ctx.beginPath();
      for (let i = pass; i < HUB.blades.length; i += 2) {
        const b = HUB.blades[i];
        if (b.x < cam - 60 || b.x > cam + W + 60) continue;
        const bend = b.lean + b.b + Math.sin(t * 1.5 + b.ph) * 1.8;
        ctx.moveTo(b.x, FLOOR + 1); ctx.quadraticCurveTo(b.x + bend * 0.3, FLOOR - b.h * 0.6, b.x + bend, FLOOR - b.h + Math.abs(bend) * 0.25);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    const img = F.glow('214,255,170');
    for (const f of HUB.flies) {
      if (f.x < cam - 40 || f.x > cam + W + 40) continue;
      const k = Math.sin(t * f.s * 2.4 + f.ph * 3);
      if (k <= 0) continue;
      ctx.globalAlpha = k * 0.9;
      ctx.drawImage(img, f.x - 7, f.y - 7, 14, 14);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };

  // What passes between the view and the hero: it moves faster than the ground, which gives depth.
  HUB.drawFore = function (ctx) {
    const cam = G.cam.x;
    for (const o of HUB.fore) {
      const x = o.x - cam * 0.3; // its place in the world's frame this instant
      if (x < cam - 200 || x > cam + W + 200) continue;
      ctx.fillStyle = '#04030a';
      ctx.beginPath(); ctx.moveTo(x - o.w / 2, G.H + PAD); ctx.lineTo(x - o.w * 0.3, G.H - o.h); ctx.lineTo(x + o.w * 0.1, G.H - o.h * 1.25); ctx.lineTo(x + o.w / 2, G.H - o.h * 0.4); ctx.lineTo(x + o.w * 0.6, G.H + PAD); ctx.closePath(); ctx.fill();
    }
  };

  function text(ctx, str, x, y, size, color, alpha, weight) {
    ctx.font = (weight || '600') + ' ' + size + 'px Bahnschrift, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,' + 0.7 * alpha + ')'; ctx.fillText(str, x + 1, y + 2);
    ctx.fillStyle = G.rgba(color, alpha); ctx.fillText(str, x, y);
  }
  HUB.paint.text = text;

  // Names over each place, what the nearest one does, and a line on how to move. In front of everything.
  HUB.drawOver = function (ctx) {
    const P = G.player, near = HUB.near, pad = G.input.device === 'gamepad', cam = G.cam.x;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of places()) {
      if (s === near || !seen(s.x, 200)) continue;
      const name = shortName(s);
      if (!name) continue;
      // the relic you have taken is named in gold; the others fade once you have chosen
      const mine = s.id === 'relic' && G.run.relic === G.run.relicOffer[s.i].id, dim = s.id === 'relic' && G.run.relic && !mine;
      text(ctx, name.toUpperCase(), s.x, FLOOR - s.top, s.id === 'relic' ? 11 : 12, mine ? GOLD : '236,233,244', mine ? 0.95 : dim ? 0.3 : 0.55);
    }
    if (seen(RELIQ_X, 200) && relicStations().length && !(near && near.id === 'relic')) text(ctx, G.run.relic ? 'THE RELIQUARY' : 'THE RELIQUARY  \u00b7  CHOOSE ONE', RELIQ_X, FLOOR - 204, 12, G.run.relic ? '236,233,244' : GOLD, G.run.relic ? 0.55 : 0.6 + 0.25 * Math.sin(HUB.t * 3));
    if (seen(BELL_X, 200)) text(ctx, 'THE OLD BELL', BELL_X, FLOOR - 212, 12, '236,233,244', 0.55);
    if (seen(lamp.x, 200) && lamp.n < 2) text(ctx, 'LANTERN' + (G.meta.toys.keep ? '  \u00b7  BEST ' + G.meta.toys.keep : ''), lamp.x, lamp.y - 46, 12, '236,233,244', 0.55);
    // the post reports what the last flurry came to, and how Dawnbreak stands
    if (D.sum > 0) text(ctx, D.sum + ' damage', POST_X, FLOOR - 164, 16, GOLD, Math.min(1, D.sumT * 2));
    if (P.ult > 0 && Math.abs(P.x - POST_X) < 240) {
      const full = P.ult >= 100;
      text(ctx, full ? 'Dawnbreak ready: press ' + (pad ? 'RT' : G.input.label('ult')) : 'Dawnbreak ' + Math.round(P.ult) + '%', POST_X, FLOOR - 186, 13, GOLD, full ? 0.7 + 0.3 * Math.sin(HUB.t * 8) : 0.7);
    }
    if (near && !G.ui.current) {
      // a relic's lines sit above the reliquary wall, clear of its neighbours' names
      const Lb = label(near), x = G.clamp(near.x, cam + 200, cam + W - 200), y = FLOOR - (near.id === 'relic' ? 226 : near.top) - 40;
      text(ctx, Lb[0].toUpperCase(), x, y, 18, '255,255,255', 1);
      text(ctx, Lb[1], x, y + 22, 13, '236,233,244', 0.85, '500');
      text(ctx, (pad ? 'LB' : G.input.label('heal')) + '  ' + Lb[2], x, y + 44, 14, GOLD, 0.85 + 0.15 * Math.sin(HUB.t * 6));
    }
    if (HUB.msgT > 0) text(ctx, HUB.msg.toUpperCase(), P.x, P.y - 104, 15, GOLD, Math.min(1, HUB.msgT * 2));
    if (!G.ui.current) {
      text(ctx, 'THE VIGIL', cam + W / 2, 40, 20, '236,233,244', 0.75, '400');
      text(ctx, pad ? 'Stick move  ·  A jump  ·  X attack  ·  B dash  ·  LB use  ·  Back flourish  ·  Start menu'
        : [G.input.label('left') + ' / ' + G.input.label('right') + ' move', G.input.label('jump') + ' jump', G.input.label('attack') + (G.input.mouse ? ' attack' : ' or click attack'), G.input.label('dash') + ' dash',
          G.input.label('flare') + (G.input.mouse ? ' special' : ' or right click special'), G.input.label('heal') + ' use', 'hold Tab moves'].join('  \u00b7  '),
        cam + W / 2, 66, 12, '236,233,244', 0.45, '500');
      text(ctx, '\u25c6 ' + G.meta.shards + ' Sunshards', cam + W - 112, 66, 12, GOLD, 0.8);
      // which way the gate lies, until it is in view
      if (GATE_X > cam + W + 40) text(ctx, 'THE GATE  ›', cam + W - 96, 40, 12, GOLD, 0.5 + 0.2 * Math.sin(HUB.t * 3));
    }
  };
})();
