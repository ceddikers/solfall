// Solfall - The Threefold Magus: a floating caster who blinks about the arena and speaks in
// three elements. Ice shapes the ground, fire explodes, lightning strikes where you stand.
'use strict';
(function () {
  const { wait, tween } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards, K = G.kit, D = G.draw, DANGER = G.COL.danger;
  const WL = G.WALL_L, WR = G.WALL_R;
  const ICE = { boss: '120,215,255', hot: '235,250,255' };
  const FIRE = { boss: '255,120,50', hot: '255,236,190' };
  const BOLT = { boss: '190,140,255', hot: '255,252,200' };
  const ELEMS = [ICE, FIRE, BOLT];
  // a smouldering fireball's core: dark and red where an ordinary one burns pale (v2.1a)
  const COAL = { boss: '170,42,22', hot: '255,104,44', coal: true };
  // the void: what answers the staff when the Magus is corrupted and its three elements go out
  // (the same colours as G.corrupt.COL; corrupt.js loads after this file)
  const VOID = { boss: '235,30,80', hot: '255,206,220', dark: '16,3,10', isVoid: true };
  const HOVER = 26, GY = FLOOR - HOVER;

  const B = {
    id: 'mage', name: 'THE THREEFOLD MAGUS', short: 'The Magus', theme: 'mage',
    sub: 'Three tongues, one voice', taunt: 'the verses quicken',
    blurb: 'A blinking caster of ice, fire and lightning',
    tips: [
      'The Magus stands still while it casts. That is the time to reach it.',
      'Jump as the ice reaches you; it only bites for a moment.',
      'A wall of flame is low: a platform clears it, and so does a dash straight through.',
      'Break the crystals before their rings empty and they never burst.',
      'Lightning marks a column before it strikes. One step to the side is enough.',
      'Watch the staff, not the spell. Held straight up, the lightning comes from the sky; levelled at you, along the ground; driven into the floor, through the floor.',
      'One mote burning in the staff is an ordinary fireball. All three flying into it is the great one: two health, and a wide blast.',
    ],
    hudCols: [null, ['#7ea0ff', '#d8e4ff'], ['#ff7ea8', '#ffd4dc'], ['#ffe08a', '#ffffff']],
    BASE_HP: 3900, poise0: 380, w: 52, h: 112, platformsFrom: 1,
    teleK: 0.9, // its warnings, against the difficulty's (v2.4d: they were easy to read)
    // its spells already reach anywhere; what it answers is a hero who will not come down out of the air
    answer: 'shards', kiting: (P) => !P.onGround && P.y < FLOOR - 150,
    gaps: [0, 0.84, 0.66, 0.53], // (v2.4d: 0.95, 0.75, 0.6)
    bags: {
      1: ['shards', 'rime', 'fireball', 'bolts', 'spheres', 'comet', 'invoke', 'nova', 'serpent', 'motes', 'blink', 'glacier'],
      2: ['shards', 'rime', 'fireball', 'bolts', 'spheres', 'firewall', 'crystals', 'storm', 'comet', 'invoke', 'nova', 'serpent', 'motes', 'blink', 'glacier'],
      3: ['shards', 'fireball', 'bolts', 'firewall', 'crystals', 'storm', 'blizzard', 'rime', 'comet', 'invoke', 'nova', 'serpent', 'motes', 'blink', 'glacier'],
    },
    cards: { 2: ['CONFLUENCE', 'The spells begin to overlap'], 3: ['TRINITY', 'Every element answers'] },
    first: { 1: 'shards', 2: 'crystals', 3: 'blizzard' },
    finale: 'cataclysm',
    // corrupted only (corrupt.js): the Black Sun from the start, Foresight from the second phase
    corruptBags: { 1: ['blacksun'], 2: ['blacksun', 'foresight'], 3: ['blacksun', 'foresight'] },
  };

  // ------------------------------------------------------------------ state
  B.setup = function () {
    const b = B.body;
    b.x = 900; b.y = GY; b.homeY = GY; b.alpha = 0; b.cast = 0; b.want = 0; b.elem = null; b.spent = false; b.charge = 0;
    B.crystals = []; B.shards = []; B.spin = 1; B.blizz = 0; B.serial = 0;
    B.iceK = 0; B.storm = 0; B.zap = 0; B.skyBolts = []; b.aflame = false;
    b.dark = 0; b.dk = [0, 0, 0]; b.track = 0; b.slit = 0; b.readTilt = 1.6; B.readAim = null;
    B.cape = D.chain(9, b.x, b.y - 92);
    b.spT = null; b.spK = 0; b.lean = 0; b.leanV = 0; b.leanT = 0; b.hl = 0; b.hv = 0; b.pvy = 0; b.py = b.y;
    B.novaArcs = []; B.glaze = null; B.picks = 0; B.novaPick = null;
    B.flick = null; B.dizzy = false; B.moteEl = ICE;
    b.oy = 0; b.oyV = 0; b.oyT = 0; b.two = 0; b.twoT = 0; b.orR = 1; b.orY = 0; b.orT = null; b.trem = 0; b.tremT = 0; b.pose = '';
    b.kq = { hx: 0, hy: 0, tilt: 0, vhx: 0, vhy: 0, vt: 0 };
    b.rig = D.rig(); b.bn = null; // (the bones: see bones)
  };
  const setElem = (el) => { B.body.elem = el; };
  const face = () => { const b = B.body; b.face = G.player.x >= b.x ? 1 : -1; };
  // the staff: where the front hand holds it, how far it tips forward, and where its head is in the world
  // The staff is also the Magus's tell. For an Invocation it is held one of three ways through the
  // cast, and each way says where the lightning will come from: straight up overhead (from the sky),
  // levelled at the hero (along the ground), or driven into the floor (through the floor).
  // Corrupted, two more: 'sun', the staff raised flat overhead in both hands (the Black Sun), and
  // 'read', the staff pointed a little ahead of the hero, following where they are going (Foresight).
  const GEST = { high: { hx: 12, hy: -112, tilt: -0.24 }, level: { hx: 34, hy: -56, tilt: 1.45 }, plant: { hx: 40, hy: -34, tilt: 0 }, sun: { hx: 6, hy: -150, tilt: 1.5 } };
  const staff = (c) => {
    const b = B.body, k = b.gk || 0, gn = b.gest || b.gestWas;
    const g = gn === 'read' ? { hx: 30, hy: -70, tilt: b.readTilt } : GEST[gn];
    const s = { hx: 23 + 9 * c, hy: -62 - 18 * c, tilt: 0.07 + 0.42 * c };
    const r = g && k > 0.001 ? { hx: G.lerp(s.hx, g.hx, k), hy: G.lerp(s.hy, g.hy, k), tilt: G.lerp(s.tilt, g.tilt, k) } : s;
    // held by hand (holdStaff): on springs (the tilt blended the short way round, so a staff let go
    // after a full swing never spins back through a turn)
    const q = b.spK || 0;
    const o = q > 0.001 && b.sp ? { hx: G.lerp(r.hx, b.sp.hx, q), hy: G.lerp(r.hy, b.sp.hy, q), tilt: r.tilt + G.angDiff(r.tilt, b.sp.tilt) * q } : r;
    // on top: the jolt of a release (kick) and the tremor of a held peak (v2.5c)
    const kq = b.kq, tr = b.trem || 0;
    if ((!kq || (!kq.hx && !kq.hy && !kq.tilt)) && tr < 0.001) return o;
    return { hx: o.hx + (kq ? kq.hx : 0), hy: o.hy + (kq ? kq.hy : 0) + Math.sin(B.t * 39) * tr * 55, tilt: o.tilt + (kq ? kq.tilt : 0) + Math.sin(B.t * 47) * tr };
  };
  const tip = () => {
    const b = B.body, s = staff(b.cast);
    return { x: b.x + b.face * (s.hx + Math.sin(s.tilt) * 96), y: b.y + s.hy - Math.cos(s.tilt) * 96 };
  };
  // Where cast() holds the staff, and the head of it then: thrown spells (fireballs, spheres, the
  // comet) leave from here, wherever the stance has carried the staff on its way (v2.5c: the stances
  // are drawn only, and every throw still leaves from where it always did; each throw's last stage
  // brings the staff back to this hold as it lets go).
  const CAST = { hx: 32, hy: -80, tilt: 0.49 };
  const tipCast = () => {
    const b = B.body, c = b.cast, hx = 23 + 9 * c, hy = -62 - 18 * c, tl = 0.07 + 0.42 * c;
    return { x: b.x + b.face * (hx + Math.sin(tl) * 96), y: b.y + hy - Math.cos(tl) * 96 };
  };

  // ---- the body language (v2.5c). Every spell has its own stance and runs through stages (gather,
  // peak, release, recoil, settle) inside the time it always took. A stance names where the staff is
  // held (on springs, see holdStaff), how the body leans, how far the figure lifts (-) or sinks (+) in
  // the air (b.oy: drawn only, so b.y and every hazard placed from it stay where they were), whether
  // the back hand takes the staff too (two), where the three motes circle (orb: [radius, height]),
  // and how much the held staff trembles (trem).
  function stance(name, st, o) {
    const b = B.body;
    o = o || {};
    b.pose = name;
    if (st) holdStaff(st, o.stiff || 1.4);
    if (o.lean != null) b.leanT = o.lean;
    b.oyT = o.oy || 0; b.twoT = o.two || 0; b.orT = o.orb || null; b.tremT = o.trem || 0;
  }
  // a jolt through the staff: it springs back, past, and settles (a release, an impact)
  function kick(hx, hy, tilt) {
    const b = B.body, k = b.kq || (b.kq = { hx: 0, hy: 0, tilt: 0, vhx: 0, vhy: 0, vt: 0 });
    k.vhx += hx * 18; k.vhy += hy * 18; k.vt += tilt * 18;
  }
  // exactly as long as wait(dur), calling fn(k, e, dt) every frame
  function* act(dur, fn) {
    let e = 0;
    while (e < dur) { const dt = yield; e += dt; fn(Math.min(1, e / dur), e, dt); }
  }
  // cast() with stages: the same time and charge, and fn(k, e, dt) sets the stance as it goes
  function* castT(el, dur, fn) {
    const b = B.body;
    setElem(el); b.want = 1;
    G.audio.play('charge', { dur });
    let e = 0;
    while (e < dur) { const dt = yield; e += dt; b.charge = Math.min(1, e / dur); fn(b.charge, e, dt); }
    b.charge = 0;
  }
  // the end of the stance (the kit's B.recover settles it; this lets it go)
  function unstance() { const b = B.body; b.spT = null; b.leanT = 0; b.oyT = 0; b.twoT = 0; b.orT = null; b.tremT = 0; b.pose = ''; }

  B.onRelease = function () { const b = B.body; b.want = 0; b.spent = false; b.charge = 0; b.hidden = false; b.alpha = 1; B.blizz = 0; b.gest = null; b.merge = 0; b.dark = 0; b.track = 0; b.slit = 0; B.readAim = null; b.spT = null; b.leanT = 0; B.flick = null; B.dizzy = false; B.spin = 1; b.oyT = 0; b.twoT = 0; b.orT = null; b.tremT = 0; b.pose = ''; };
  B.onInterrupt = function () { B.shards.length = 0; };
  B.onStagger = function () { const b = B.body; b.alpha = 1; b.elem = null; b.spT = null; b.leanT = 0; if (B.glaze) B.glaze.fade = true; B.flick = null; B.dizzy = false; b.track = 0; b.oyT = 0; b.twoT = 0; b.orT = null; b.tremT = 0; b.pose = ''; };
  // a hero who reaches it is met with a Nova (not twice running, and not too often)
  B.choose = function () {
    const b = B.body, P = G.player;
    B.picks = (B.picks || 0) + 1;
    if (B.picks - (B.novaPick == null ? -99 : B.novaPick) < 5 || b.hidden) return '';
    if (Math.abs(P.x - b.x) < 190 && Math.abs(P.y - b.y) < 140 && G.rng() < 0.5) {
      // (it takes the place of the one in the bag, so a hero who stays close still sees the rest of its spells)
      const i = B.bag ? B.bag.indexOf('nova') : -1;
      if (i >= 0) B.bag.splice(i, 1);
      return 'nova';
    }
    return '';
  };
  B.staggerWord = 'SILENCED'; B.staggerMult = 1.2; B.staggerDur = 1.15;
  B.onHit = function (dmg, info) {
    if (!B.staggered) return;
    G.player.gain(7);
    const el = ELEMS[(B.spill = (B.spill || 0) + 1) % 3];
    G.fx.burst(info.x, info.y, { n: 5, color: el.boss, speed: [120, 420], angle: -Math.PI / 2, spread: 2.4, life: [0.3, 0.7], size: [3, 6], grav: 600 });
    G.fx.glint(info.x + G.rand(-14, 14), info.y - G.rand(6, 30), 18, el.hot, 0.2);
  };
  B.reckonName = 'CONVERGENCE'; B.reckonY = GY;
  B.onReckon = function (on) { const b = B.body; b.want = on ? 1 : 0; B.spin = on ? 6 : 1; b.alpha = 1; };
  B.onRecover = function () { B.body.homeY = GY; };
  B.dying0 = function () { B.crystals.length = 0; B.body.elem = null; };

  function puff(x, y, col) {
    G.fx.burst(x, y, { n: 18, color: col, speed: [40, 260], life: [0.25, 0.6], size: [3, 8] });
    G.fx.ring(x, y, { r0: 70, r1: 10, life: 0.25, color: col, width: 4 });
  }

  // Step out of the world and back in somewhere else.
  function* blink(x, y) {
    const b = B.body, col = G.pal().boss;
    G.audio.play('blink');
    puff(b.x, b.y - 50, col);
    yield* tween(b, { alpha: 0 }, 0.14);
    b.hidden = true; b.x = x; b.y = y; b.homeY = y;
    yield* wait(0.14);
    b.hidden = false; face();
    puff(b.x, b.y - 50, col);
    yield* tween(b, { alpha: 1 }, 0.16);
  }
  function spot(minDist) {
    const P = G.player, b = B.body;
    const all = [[170, GY], [430, GY], [640, GY], [850, GY], [1110, GY]];
    // and above whatever platforms this phase has
    for (const p of G.arena.platforms) if (!p.gone && p.rise >= 1) all.push([p.x + p.w / 2, p.top - 18]);
    const ok = all.filter(([x]) => Math.abs(x - P.x) > (minDist || 270) && Math.abs(x - b.x) > 110);
    return ok.length ? G.rpick(ok) : [P.x < 640 ? 1110 : 170, GY];
  }
  // Before most spells the Magus moves away from the hero.
  function* reposition(always) {
    const b = B.body, P = G.player;
    if (always || Math.abs(P.x - b.x) < 230 || G.rng() < 0.4) { const s = spot(); yield* blink(s[0], s[1]); }
    face();
  }
  function* cast(el, dur) {
    const b = B.body;
    setElem(el); b.want = 1;
    G.audio.play('charge', { dur });
    let e = 0;
    while (e < dur) { e += yield; b.charge = Math.min(1, e / dur); }
    b.charge = 0;
  }

  // ------------------------------------------------------------------ the Magus's own hazards
  function boltPath(x0, y0, x1, y1) {
    const pts = [[x0, y0]], n = 9;
    for (let i = 1; i < n; i++) pts.push([G.lerp(x0, x1, i / n) + G.rand(-20, 20), G.lerp(y0, y1, i / n)]);
    pts.push([x1, y1]);
    return pts;
  }
  function drawBolt(ctx, pts, f) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const [w, col, a] of [[16, BOLT.boss, 0.4], [6, BOLT.hot, 1]]) {
      ctx.strokeStyle = G.rgba(col, a * f); ctx.lineWidth = w * (0.4 + 0.6 * f);
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    }
  }
  function strikeWarn(ctx, x, w, k, t) {
    const late = k > 0.75 ? 0.5 + 0.5 * Math.sin(t * 55) : 0;
    const g = ctx.createLinearGradient(0, -40, 0, FLOOR);
    g.addColorStop(0, G.rgba(DANGER, 0.02));
    g.addColorStop(1, G.rgba(DANGER, 0.1 + 0.1 * k + 0.12 * late));
    ctx.fillStyle = g; ctx.fillRect(x - w / 2, -40, w, FLOOR + 40);
    ctx.fillStyle = G.rgba(DANGER, 0.4);
    ctx.beginPath(); ctx.ellipse(x, FLOOR - 1, w / 2 * k, 8 * k, 0, 0, G.TAU); ctx.fill();
    ctx.strokeStyle = G.rgba(DANGER, 0.5 + 0.4 * k); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, FLOOR - 1, w / 2, 8, 0, 0, G.TAU); ctx.stroke();
    ctx.strokeStyle = G.rgba(DANGER, 0.25 + 0.3 * k); ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 9]);
    ctx.beginPath(); ctx.moveTo(x, -40); ctx.lineTo(x, FLOOR - 6); ctx.stroke();
    ctx.setLineDash([]);
  }
  function strikeFx(x) {
    G.audio.play('zap'); G.fx.shake(6);
    G.fx.burst(x, FLOOR - 4, { n: 10, color: BOLT.hot, speed: [120, 520], angle: -Math.PI / 2, spread: 2.6, life: [0.15, 0.4], kind: 'spark', size: [2, 3.5], grav: 900 });
    G.fx.lines(x, FLOOR - 8, 7, BOLT.hot, { r0: 14, speed: [400, 800] });
    G.fx.flash(BOLT.boss, 0.07, 0.12);
  }

  // A lightning strike from the sky: a marked column, then the bolt. Step out of the column.
  function strike(x, tele, w, fork) {
    return H.add({
      kind: 'strike', x, w: w || 64, tele, active: 0.13, fade: 0.2, tint: BOLT, fired: false, pts: null,
      update() {
        if (this.t >= this.tele && !this.fired) { this.fired = true; this.pts = fork ? boltPath(fork.x, fork.y, this.x, FLOOR) : boltPath(this.x, -40, this.x, FLOOR); strikeFx(this.x); }
        if (this.t >= this.tele + this.active + this.fade) this.dead = true;
        this.srcX = this.x;
      },
      hits(P) { return this.fired && this.t < this.tele + this.active && Math.abs(P.x - this.x) < this.w / 2 + 7; },
      draw(ctx) {
        if (!this.fired) { strikeWarn(ctx, this.x, this.w, this.t / this.tele, this.t); return; }
        const f = Math.max(0, 1 - (this.t - this.tele) / (this.active + this.fade));
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = G.rgba(BOLT.boss, 0.22 * f); ctx.fillRect(this.x - this.w / 2, -40, this.w, FLOOR + 40);
        drawBolt(ctx, this.pts, f);
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  }

  // Ice running along the floor: each cell is marked, then spikes up for a moment. Jump as it reaches you.
  function rime(x0, dirs, T, step) {
    const cw = 58, cells = [];
    for (const d of dirs) {
      for (let i = 0; i < 30; i++) {
        const cx = x0 + d * (46 + i * cw);
        if (cx < WL + 12 || cx > WR - 12) break;
        cells.push({ x: cx, at: 0.6 * T + i * (step || 0.075), seed: (i * 7 + (d > 0 ? 3 : 0)) % 5 });
      }
    }
    const last = cells.reduce((m, c) => Math.max(m, c.at), 0);
    return H.add({
      kind: 'rime', layer: 'under', tint: ICE, cells, cw, hgt: 60, warn: 0.5 * T, active: 0.25, started: false,
      update() {
        if (!this.started && this.t >= 0.6 * T) { this.started = true; G.audio.play('frost'); G.fx.shake(5); }
        if (this.t > last + this.active + 0.35) this.dead = true;
      },
      hits(P) {
        if (P.y < FLOOR - this.hgt + 8) return false;
        for (const c of this.cells) {
          const e = this.t - c.at;
          if (e < 0 || e >= this.active) continue;
          // as high as the spikes are drawn: the tall middle one, the shorter pair beside it, and only
          // as far up as they have come (v2.1b; it was the full height across the cell from the first frame)
          const dx = Math.abs(P.x - c.x), up = Math.min(1, e / 0.05), lift = FLOOR - P.y;
          if (dx >= cw / 2 + 5) continue;
          const tall = dx < 22 ? this.hgt : this.hgt * (0.62 + 0.07 * c.seed);
          if (lift < tall * up - 8) { this.srcX = c.x; return true; }
        }
        return false;
      },
      draw(ctx) {
        for (const c of this.cells) {
          const e = this.t - c.at;
          if (e < -this.warn || e > this.active + 0.3) continue;
          if (e < 0) {
            const k = 1 + e / this.warn;
            ctx.fillStyle = G.rgba(DANGER, 0.14 + 0.22 * k);
            ctx.beginPath(); ctx.ellipse(c.x, FLOOR - 1, cw / 2 * (0.4 + 0.6 * k), 7, 0, 0, G.TAU); ctx.fill();
            ctx.strokeStyle = G.rgba(DANGER, 0.5 + 0.4 * k); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(c.x - 9, FLOOR - 4); ctx.lineTo(c.x, FLOOR - 10 - 16 * k); ctx.lineTo(c.x + 9, FLOOR - 4); ctx.stroke();
            continue;
          }
          const up = Math.min(1, e / 0.05), f = e < this.active ? 1 : Math.max(0, 1 - (e - this.active) / 0.3);
          const h = this.hgt * up * (e < this.active ? 1 : 0.6 + 0.4 * f);
          ctx.globalCompositeOperation = 'lighter';
          for (let s = -1; s <= 1; s++) {
            const sx = c.x + s * 17 + (c.seed - 2) * 1.5, sh = h * (s === 0 ? 1 : 0.62 + 0.07 * c.seed), lean = s * 7;
            ctx.fillStyle = G.rgba(ICE.boss, 0.75 * f);
            ctx.beginPath(); ctx.moveTo(sx - 11, FLOOR); ctx.lineTo(sx + lean, FLOOR - sh); ctx.lineTo(sx + 11, FLOOR); ctx.closePath(); ctx.fill();
            ctx.fillStyle = G.rgba(ICE.hot, 0.9 * f);
            ctx.beginPath(); ctx.moveTo(sx - 3, FLOOR); ctx.lineTo(sx + lean, FLOOR - sh); ctx.lineTo(sx + 5, FLOOR); ctx.closePath(); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
      },
    });
  }

  // A wall of flame crossing the floor. Low enough to stand above on a platform, thin enough to dash through.
  function firewall(dir, T) {
    const x0 = dir > 0 ? WL - 30 : WR + 30, tele = 0.95 * T, hgt = 98;
    H.lane({ x: WL, y: FLOOR - hgt, w: WR - WL, h: hgt, dir, dur: tele });
    return H.add({
      kind: 'firewall', layer: 'over', tint: FIRE, x: x0, dir, speed: 430, hgt, hw: 26, started: false,
      update(dt) {
        if (this.t < tele) return;
        if (!this.started) { this.started = true; G.audio.play('whoosh'); }
        this.x += this.dir * this.speed * dt;
        this.srcX = this.x - this.dir * 40;
        for (let i = 0; i < 2; i++) {
          G.fx.spawn({ x: this.x + G.rand(-20, 20), y: FLOOR - G.rand(0, this.hgt), vx: -this.dir * G.rand(20, 120), vy: G.rand(-160, -40), life: G.rand(0.2, 0.5), size: G.rand(4, 9), color: FIRE.boss });
        }
        if (this.x < WL - 60 || this.x > WR + 60) this.dead = true;
      },
      hits(P) {
        if (!this.started) return false;
        // the flame is tall in the middle and low at its edges (v2.1b; it was one tall box)
        const q = P.box(), rise = 0.25 + 0.75 * (1 - Math.pow(1 - G.clamp((this.t - tele) / 0.12, 0, 1), 2));
        return G.rectsOverlap(q, { cx: this.x, cy: FLOOR - this.hgt * rise * 0.45, hw: 15, hh: this.hgt * rise * 0.45 - 2 })
          || G.rectsOverlap(q, { cx: this.x, cy: FLOOR - this.hgt * rise * 0.3, hw: this.hw - 4, hh: this.hgt * rise * 0.3 });
      },
      draw(ctx) {
        if (!this.started) return;
        // it surges up out of the wall over its first few frames rather than appearing whole
        const up = G.clamp((this.t - tele) / 0.12, 0, 1), rise = 1 - (1 - up) * (1 - up);
        ctx.globalCompositeOperation = 'lighter';
        for (const [col, ws, hs0, a] of [[FIRE.boss, 1.5, 1.12, 0.35], [DANGER, 1, 1, 0.8], [FIRE.hot, 0.45, 0.8, 0.95]]) {
          const hs = hs0 * (0.25 + 0.75 * rise);
          ctx.fillStyle = G.rgba(col, a);
          ctx.beginPath(); ctx.moveTo(this.x - this.hw * ws, FLOOR);
          for (let i = 0; i <= 8; i++) {
            const q = i / 8, px = this.x + (q * 2 - 1) * this.hw * ws;
            const n = 0.72 + 0.28 * Math.sin(this.t * 22 + i * 1.9) * Math.sin(this.t * 13 - i);
            ctx.lineTo(px, FLOOR - this.hgt * hs * Math.pow(Math.sin(Math.PI * (0.1 + 0.8 * q)), 0.6) * n);
          }
          ctx.lineTo(this.x + this.hw * ws, FLOOR); ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  }

  // A storm cloud that trails the hero and strikes below itself every so often.
  function cloud(strikes, T) {
    const P = G.player;
    return H.add({
      kind: 'cloud', layer: 'over', tint: BOLT, x: P.x, y: 118, left: strikes, next: 1.1, mark: null, out: 0,
      update(dt) {
        const m = this.mark;
        if (!m) {
          this.x = G.damp(this.x, G.clamp(P.x, WL + 60, WR - 60), 2.4, dt);
          if (this.left <= 0) { this.out += dt; if (this.out > 0.6) this.dead = true; return; }
          this.next -= dt;
          if (this.next <= 0) this.mark = { x: this.x, t: 0, tele: 0.62 * T, fired: false, pts: null };
          return;
        }
        m.t += dt;
        if (!m.fired && m.t >= m.tele) { m.fired = true; m.pts = boltPath(m.x, this.y + 20, m.x, FLOOR); strikeFx(m.x); }
        if (m.t >= m.tele + 0.33) { this.mark = null; this.next = 1.0; this.left--; }
        this.srcX = m.x;
      },
      // (the bolt runs from under the cloud to the floor: nothing above the cloud is struck)
      hits(Pl) { const m = this.mark; return !!m && m.fired && m.t < m.tele + 0.13 && Math.abs(Pl.x - m.x) < 34 + 7 && Pl.y > this.y + 20; },
      draw(ctx) {
        const m = this.mark, a = Math.min(1, this.t / 0.5) * (1 - this.out / 0.6);
        if (m && !m.fired) strikeWarn(ctx, m.x, 68, m.t / m.tele, m.t);
        // the cloud
        ctx.globalAlpha = a;
        D.glow(ctx, BOLT.boss, this.x, this.y, 120, m ? 0.75 : 0.4);
        ctx.fillStyle = '#141024';
        for (const [ox, oy, r] of [[-46, 6, 26], [-16, -8, 34], [22, -6, 32], [52, 8, 24], [4, 12, 30]]) {
          ctx.beginPath(); ctx.arc(this.x + ox + Math.sin(this.t * 1.3 + ox) * 3, this.y + oy, r, 0, G.TAU); ctx.fill();
        }
        ctx.strokeStyle = G.rgba(BOLT.boss, 0.6); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.x - 16, this.y - 8, 34, Math.PI * 1.1, Math.PI * 1.75); ctx.stroke();
        ctx.beginPath(); ctx.arc(this.x + 22, this.y - 6, 32, Math.PI * 1.3, Math.PI * 1.9); ctx.stroke();
        ctx.globalAlpha = 1;
        if (m && m.fired) {
          const f = Math.max(0, 1 - (m.t - m.tele) / 0.33);
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = G.rgba(BOLT.boss, 0.22 * f); ctx.fillRect(m.x - 34, this.y, 68, FLOOR - this.y);
          drawBolt(ctx, m.pts, f);
          ctx.globalCompositeOperation = 'source-over';
        }
      },
    });
  }

  // ------------------------------------------------------------------ spells
  // In the last phase every spell is answered, as it ends, by one more from another element.
  function echo(el) {
    const P = G.player, T = K.T(), b = B.body;
    if (el !== BOLT) strike(G.clamp(P.x + P.vx * 0.2, WL + 40, WR - 40), 0.85 * T);
    else {
      const ox = b.x, oy = b.y - B.h - 44;
      B.shards.push({ x: ox, y: oy, life: 0.85 * T });
      H.beam({
        ox, oy, ang: Math.atan2(P.y - 22 - oy, P.x - ox), tele: 0.85 * T, lock: 0.3 * T, active: 0.14, width: 22, tint: ICE, sfx: 'shard', shake: 3,
        follow(bm, dt) { if (!bm.locked) bm.ang += G.angDiff(bm.ang, Math.atan2(P.y - 22 - oy, P.x - ox)) * Math.min(1, dt * 10); },
      });
    }
  }

  // Ice: shards hang over the Magus, take aim one after another and fire.
  function* atkShards() {
    yield* reposition();
    const b = B.body, P = G.player, T = K.T();
    const n = (B.phase === 3 ? 5 : B.phase === 2 ? 4 : 3) + (K.hard() ? 1 : 0);
    setElem(ICE); b.want = 1;
    G.audio.play('charge', { dur: 0.75 * T });
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1) - 0.5;
      const ox = b.x + k * 44 * n, oy = b.y - B.h - 46 + Math.abs(k) * 56;
      const tele = (0.75 + i * 0.21) * T;
      B.shards.push({ x: ox, y: oy, life: tele });
      H.beam({
        ox, oy, ang: Math.atan2(P.y - 22 - oy, P.x - ox), tele, lock: 0.3 * T, active: 0.14, width: 22, tint: ICE, sfx: 'shard', shake: 3,
        follow(bm, dt) { if (!bm.locked) bm.ang += G.angDiff(bm.ang, Math.atan2(P.y - 22 - oy, P.x - ox)) * Math.min(1, dt * 10); },
      });
    }
    // the stance: a conductor's. The staff is drawn in, then swept up and back over the hat while the
    // motes rise to hang with the shards; each shard looses on a flick of it, each flick further on
    const t0 = 0.75 * T, gap = 0.21 * T, end = t0 + (n - 1) * gap;
    yield* act(end + 0.55, (k, e) => {
      const hi = [0.6, -80];
      if (e < 0.2 * T) stance('shards-gather', { hx: 18, hy: -74, tilt: 0.25 }, { stiff: 1.7, lean: 0.05, oy: 4, orb: [0.8, -24] });
      else if (e < t0 - 0.06) stance('shards-peak', { hx: 8, hy: -116, tilt: -0.55 }, { stiff: 1.5, lean: -0.08, oy: -6, orb: hi, trem: 0.012 + 0.02 * (e / t0) });
      else if (e < end + 0.06) {
        const i = Math.floor((e - t0 + 0.06) / gap), q = e - t0 + 0.06 - i * gap, f = Math.min(1, i / Math.max(1, n - 1));
        if (q < 0.09) stance('shards-flick', { hx: 14 + 6 * f, hy: -108, tilt: 0.35 + 0.35 * f }, { stiff: 4.2, lean: 0.04, oy: -4, orb: hi });
        else stance('shards-hold', { hx: 10 + 4 * f, hy: -114, tilt: -0.32 + 0.32 * f }, { stiff: 2.2, lean: -0.04, oy: -5, orb: hi });
      } else if (e < end + 0.3) stance('shards-follow', { hx: 34, hy: -86, tilt: 1.1 }, { stiff: 2.4, lean: 0.1, oy: 2 });
      else stance('shards-settle', { hx: 26, hy: -74, tilt: 0.6 }, { stiff: 1.1, lean: 0.02 });
    });
  }

  // Ice: the floor freezes outward from the Magus.
  function* atkRime() {
    yield* reposition();
    const b = B.body, T = K.T();
    G.ui.hint('rime', 'Jump as the ice reaches you');
    // the stance: it goes up before it comes down, then sweeps the head of the staff along the floor
    // in front of it, crouched low, and drags it on round behind; the motes sink to its feet
    const low = [1.25, 52];
    const F = { hx: 30, hy: -56, tilt: 2.25 }, M = { hx: 22, hy: -92, tilt: 3.1 }, Bk = { hx: 12, hy: -72, tilt: 3.95 };
    yield* castT(ICE, 0.35 * T, (k) => {
      if (k < 0.4) stance('rime-gather', { hx: 18, hy: -102, tilt: -0.45 }, { stiff: 2.2, lean: -0.07, oy: -6, orb: [1, -10] });
      else stance('rime-sweep', F, { stiff: 3.4, lean: 0.14, oy: 10, orb: low });
    });
    rime(b.x, [-1, 1], T);
    b.sq = Math.max(b.sq || 0, 0.07); kick(0, 4, 0.12);
    // the sweep on round behind it, held low while the ice runs
    const drag = (e) => {
      if (e < 0.16) stance('rime-drag', M, { stiff: 2.6, lean: 0.1, oy: 9, orb: low });
      else stance('rime-back', Bk, { stiff: 2.2, lean: 0.08, oy: 10, orb: low, trem: e > 0.42 ? 0.02 : 0 });
    };
    // then the ice comes up and the staff comes up with it, over and upright, and it straightens
    const after = (from, e, dur) => {
      if (e < 0.6 * T) { if (from) drag(e); else stance('rime-hold', F, { stiff: 2, lean: 0.12, oy: 10, orb: low, trem: 0.02 }); }
      else if (e < 0.6 * T + 0.25) stance('rime-rise', { hx: 16, hy: -100, tilt: -0.25 }, { stiff: 2.6, lean: -0.06, oy: -5, orb: [0.9, -6] });
      else if (e < dur - 0.45) stance('rime-watch', { hx: 24, hy: -84, tilt: 0.2 }, { stiff: 1.3, lean: -0.02 });
      else stance('rime-settle', { hx: 22, hy: -68, tilt: 0.15 }, { stiff: 1.1, lean: 0 });
    };
    if (K.hard() || B.phase === 3) {
      // a second, swept back the other way: it lifts the staff behind it a little, and brings it round
      // under and out in front again
      yield* act(1.05, (k, e) => {
        if (e < 0.72) drag(e);
        else if (e < 0.86) stance('rime-coil', { hx: 14, hy: -98, tilt: 3.7 }, { stiff: 2.4, lean: -0.02, oy: 2, orb: low });
        else if (e < 0.95) stance('rime-drag', M, { stiff: 3.8, lean: 0.1, oy: 8, orb: low });
        else stance('rime-sweep', F, { stiff: 4, lean: 0.14, oy: 10, orb: low });
      });
      rime(b.x, [-1, 1], T);
      b.sq = Math.max(b.sq || 0, 0.07); kick(0, 4, 0.12);
      yield* act(0.6 * T + 1.3, (k, e) => after(false, e, 0.6 * T + 1.3));
    } else yield* act(0.6 * T + 1.3, (k, e) => after(true, e, 0.6 * T + 1.3));
  }

  // Fire: a slow ball of flame that leans after the hero and bursts where it lands.
  // great: all three motes went into it. It is slower and bigger, and its blast is wide and takes two health.
  // smoulder (v2.1a): its core is dark red, not pale, as it leaves the staff. It does not burst where it
  // lands: it sinks in as a coal, smoulders, and bursts a moment later, wider.
  function fireball(speed, great, smoulder) {
    const P = G.player, o = tipCast();
    const a = Math.atan2(P.y - 30 - o.y, P.x - o.x);
    G.audio.play('whoosh'); if (great) G.audio.play('roar');
    const ob = H.orb(o.x, o.y, Math.cos(a) * speed, Math.sin(a) * speed, {
      r: great ? 34 : 21, slashable: false, tint: great ? { boss: '255,200,150', hot: '255,255,255' } : smoulder ? COAL : FIRE, life: great ? 3.2 : 2.6,
      steer(ob, dt) {
        if (ob.t < 1.3) {
          const cur = Math.atan2(ob.vy, ob.vx), want = Math.atan2(P.y - 24 - ob.y, P.x - ob.x);
          const na = cur + G.clamp(G.angDiff(cur, want), -1.5 * dt, 1.5 * dt);
          ob.vx = Math.cos(na) * speed; ob.vy = Math.sin(na) * speed;
        }
        if (smoulder && Math.random() < dt * 30) G.fx.dust(ob.x, ob.y, 1, { speed: [10, 40], size: [6, 11], life: [0.4, 0.8], up: 60, a: 0.4, color: '52,40,40' });
        if (ob.life < 0.05) ob.pop();
      },
      onPop(ob) {
        if (smoulder) { coal(ob.x); return; }
        H.blast({ x: ob.x, y: Math.min(ob.y, FLOOR - 12), r: great ? 172 : 96, tele: great ? 0.55 : 0.4, tint: FIRE, dmg: great ? 2 : 1 });
        if ((B.phase >= 2 || great) && ob.y > FLOOR - 60) H.pool({ x: G.clamp(ob.x, WL + 80, WR - 80), w: 160, tele: 0.45, active: 3, tint: FIRE });
      },
    });
    // in flight, a smouldering one is a black coal rimmed in danger, its cracks glowing, trailing smoke
    if (smoulder) ob.draw = function (ctx) {
      const r = this.r, x = this.x, y = this.y, sp = this.t * 5;
      ctx.globalCompositeOperation = 'lighter';
      D.glow(ctx, COAL.boss, x, y, r * 2.3, 0.5);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#1e0b07';
      ctx.beginPath(); ctx.arc(x, y, r * 0.92, 0, G.TAU); ctx.fill();
      ctx.strokeStyle = G.rgba(DANGER, 0.9); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, r * 0.92, 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = G.rgba(COAL.hot, 0.75 + 0.25 * Math.sin(this.t * 17)); ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { const q = sp + i * 2.1; ctx.moveTo(x + Math.cos(q) * r * 0.2, y + Math.sin(q) * r * 0.2); ctx.lineTo(x + Math.cos(q + 0.4) * r * 0.75, y + Math.sin(q + 0.4) * r * 0.75); }
      ctx.stroke();
    };
  }
  function* atkFireball() {
    yield* reposition();
    const T = K.T();
    // the tell: one mote burning in the staff is an ordinary fireball; all three flying into it is the great one
    // the body tells them apart too (v2.5c): the great one is a heave in both hands, from a crouch up
    // to the staff held high behind it, the figure rising and leaning back while the motes fly in; an
    // ordinary one is a one-handed overhand throw, the staff cocked back over the shoulder; a
    // smouldering one is bowled underhand, the staff kept low behind it, hunched over, and swung through
    if (K.chance([0, 0.25, 0.35, 0.45][B.phase], 'great')) {
      const b = B.body;
      face(); b.merge = 1;
      yield* castT(FIRE, 1.15 * T, (k) => {
        if (k < 0.2) stance('great-crouch', { hx: 20, hy: -64, tilt: 1.3 }, { stiff: 1.6, two: 1, oy: 8, lean: 0.06 });
        else if (k < 0.55) stance('great-rise', { hx: 6, hy: -122, tilt: -0.35 }, { stiff: 1.3, two: 1, oy: -10, lean: -0.1 });
        else if (k < 0.86) stance('great-peak', { hx: 4, hy: -124, tilt: -0.8 }, { stiff: 1.2, two: 1, oy: -12, lean: -0.16, trem: 0.015 + 0.04 * (k - 0.55) / 0.31 });
        else stance('great-heave', CAST, { stiff: 4.4, two: 0.7, oy: -2, lean: 0.02 });
      });
      fireball(K.gentle() ? 330 : 370, true);
      kick(5, 7, 0.3); b.recV = (b.recV || 0) + b.face * 0.8;
      b.merge = 0;
      yield* opening(0.8, { t: 0.22, name: 'great-follow', st: { hx: 38, hy: -62, tilt: 1.7 }, o: { stiff: 3, lean: 0.16, oy: 5, two: 0.6 } });
      yield* wait(0.5);
      return;
    }
    const n = 1 + (B.phase >= 2 ? 1 : 0) + (K.hard() ? 1 : 0);
    for (let i = 0; i < n; i++) {
      face();
      // each throw its own: a pale core bursts where it lands, a dark red one smoulders first
      const sm = K.chance([0, 0.3, 0.35, 0.4][B.phase], 'smoulder');
      // (the throw itself takes the same moment however long the wind-up: it is timed back from the
      // release, so the staff's head is where the fireball leaves from as it goes)
      const dur = (i ? 0.5 : 0.8) * T;
      yield* castT(sm ? COAL : FIRE, dur, (k, e) => {
        const left = dur - e;
        if (sm) {
          if (k < 0.3 && left > 0.26) stance('smoulder-bank', { hx: 16, hy: -80, tilt: -2.2 }, { stiff: 1.7, lean: 0.08, oy: 6 });
          else if (left > 0.26) stance('smoulder-hold', { hx: 14, hy: -82, tilt: -2.45 }, { stiff: 1.4, lean: 0.12, oy: 9, trem: 0.02 });
          // swung down through hanging and under, so the head comes up in front (never over the top)
          else if (left > 0.14) stance('smoulder-swing', { hx: 22, hy: -92, tilt: -Math.PI }, { stiff: 4.6, lean: 0.03, oy: 4 });
          else stance('smoulder-lob', { hx: CAST.hx, hy: CAST.hy, tilt: CAST.tilt - G.TAU }, { stiff: 5.5, lean: 0, oy: 0 });
        } else {
          if (k < 0.3 && left > 0.16) stance('fireball-cock', { hx: 14, hy: -82, tilt: -1.0 }, { stiff: 1.8, lean: -0.08, oy: 3 });
          else if (left > 0.16) stance('fireball-peak', { hx: 8, hy: -100, tilt: -1.45 }, { stiff: 1.5, lean: -0.13, oy: -2, trem: 0.022 });
          else stance('fireball-throw', CAST, { stiff: 5, lean: 0.02, oy: 0 });
        }
      });
      fireball(K.gentle() ? 400 : 470, false, sm);
      kick(5, sm ? -4 : 5, sm ? -0.15 : 0.24);
      yield* act(0.45, (k, e) => {
        if (e < 0.2) {
          if (sm) stance('smoulder-follow', { hx: 30, hy: -104, tilt: -0.15 - G.TAU }, { stiff: 2.6, lean: -0.08, oy: -6 });
          else stance('fireball-follow', { hx: 36, hy: -66, tilt: 1.55 }, { stiff: 2.6, lean: 0.14, oy: 3 });
        } else stance('fireball-recover', { hx: 28, hy: -76, tilt: 0.85 }, { stiff: 1.4, lean: 0.02 });
      });
    }
    // the throw spends it for a moment: an opening
    yield* opening([0, 0.6, 0.5, 0.45][B.phase]);
    yield* wait(0.35);
  }

  // Lightning: strike after strike where the hero is heading; the last comes as three.
  function* atkBolts() {
    yield* reposition();
    const P = G.player, T = K.T();
    const n = 4 + (B.phase - 1) + (K.hard() ? 1 : 0), b = B.body;
    // the stance (v2.5c): a dip, then the staff raised out in front, tipped forward over the hero's side;
    // it calls each strike down with a jab at the sky, like a drummer keeping time
    yield* castT(BOLT, 0.4 * T, (k) => {
      if (k < 0.45) stance('bolts-dip', { hx: 20, hy: -66, tilt: 0.2 }, { stiff: 2, lean: 0.04, oy: 5 });
      else stance('bolts-raise', { hx: 30, hy: -100, tilt: 0.32 }, { stiff: 2.4, lean: -0.05, oy: -4, orb: [0.85, -14] });
    });
    const beat = (e) => {
      // (the fork's tell, set below, holds through its beat: the staff levelled at the hero)
      if (b.track) stance('bolts-fork', { hx: 34, hy: -64, tilt: 1.5 }, { stiff: 3, lean: 0.08, oy: 3 });
      else if (e < 0.07) stance('bolts-jab', { hx: 32, hy: -118, tilt: 0.28 }, { stiff: 4.6, lean: -0.06, oy: -6, orb: [0.85, -14] });
      else stance('bolts-beat', { hx: 30, hy: -98, tilt: 0.36 }, { stiff: 1.8, lean: -0.03, oy: -2, orb: [0.85, -14] });
    };
    // (v2.1a) a hero who stands still is noticed: its head snaps round to them, the staff levels at them,
    // and the next bolt forks off the last one onto where they stand. The fork takes that bolt's place
    // (the volley is no denser), one a volley (two in the last phase).
    let lastX = P.x, still = 0, forks = 0, prev = null, fork = null;
    for (let i = 0; i < n; i++) {
      if (fork) {
        prev = strike(fork.x, 0.46 * T, 58, { x: fork.from.x, y: FLOOR - 300 });
        fork = null;
      } else {
        const x = G.clamp(P.x + P.vx * 0.18 + G.rrand(-14, 14), WL + 40, WR - 40);
        prev = strike(x, 0.5 * T);
        if (i === n - 1) { strike(G.clamp(x - 150, WL + 40, WR - 40), 0.5 * T); strike(G.clamp(x + 150, WL + 40, WR - 40), 0.5 * T); }
      }
      yield* act(0.3, (k, e) => beat(e));
      b.track = 0;
      still = Math.abs(P.x - lastX) < 34 && P.onGround ? still + 1 : 0; // (still for two beats running)
      if (i < n - 2 && forks < (B.phase === 3 ? 2 : 1) && still >= 2) {
        still = 0;
        forks++;
        b.track = 1; face();
        holdStaff({ hx: 34, hy: -64, tilt: 1.5 }, 3); b.leanT = 0.08;
        G.audio.play('crackle');
        fork = { x: G.clamp(P.x, WL + 40, WR - 40), from: prev };
      }
      lastX = P.x;
    }
    b.track = 0;
    // the last three called down together: a long reach up, and as they land the staff jolts and the
    // spell goes out of the arm
    let landed = false;
    yield* act(0.5 * T + 0.1, (k, e) => {
      if (!landed && e >= 0.5 * T - 0.3) { landed = true; kick(-3, 7, -0.14); }
      if (e < 0.5 * T - 0.3) stance('bolts-last', { hx: 30, hy: -124, tilt: 0.2 }, { stiff: 3, lean: -0.08, oy: -8, orb: [0.85, -14], trem: 0.025 });
      else stance('bolts-spent', { hx: 32, hy: -78, tilt: 0.9 }, { stiff: 1.3, lean: 0.06, oy: 3 });
    });
    yield* opening([0, 0.55, 0.45, 0.4][B.phase]);
  }

  // Lightning: bouncing spheres that stay a while. They can be cut down.
  function* atkSpheres() {
    yield* reposition();
    const b = B.body, T = K.T();
    const n = (B.phase === 1 ? 2 : 3) + (K.hard() ? 1 : 0);
    G.ui.hint('spheres', 'The spheres can be cut down');
    // the stance (v2.5c): the staff held low in front and its head bounced, as a ball is, the body
    // bobbing with it; then a crouch, and each sphere is pumped up off the head of the staff
    yield* castT(BOLT, 0.7 * T, (k, e) => {
      const bn = Math.sin(e * 14);
      if (k < 0.6) stance('spheres-dribble', { hx: 30, hy: -62 + bn * 5, tilt: 1.85 + bn * 0.18 }, { stiff: 2.6, lean: 0.06, oy: 3 + Math.abs(bn) * 3, orb: [1.1, 18] });
      else if (k < 0.82) stance('spheres-coil', { hx: 26, hy: -58, tilt: 2.15 }, { stiff: 2.2, lean: 0.1, oy: 8, orb: [1.1, 18] });
      else stance('spheres-pump', CAST, { stiff: 4.6, lean: -0.02, oy: -4 });
    });
    for (let i = 0; i < n; i++) {
      const o = tipCast(), dir = i % 2 ? -b.face : b.face;
      G.audio.play('orb');
      H.orb(o.x, o.y, dir * (150 + i * 45), -260, {
        r: 15, grav: 1150, life: 6.5, tint: BOLT,
        steer(ob) {
          if (ob.y + ob.r >= FLOOR - 2 && ob.vy > 0) { ob.y = FLOOR - ob.r - 2; ob.vy = -(560 + i * 40); G.fx.burst(ob.x, FLOOR - 3, { n: 4, color: BOLT.hot, speed: [60, 220], angle: -Math.PI / 2, spread: 2.4, life: [0.15, 0.3], kind: 'spark', size: [2, 3] }); }
          if ((ob.x < WL + 22 && ob.vx < 0) || (ob.x > WR - 22 && ob.vx > 0)) ob.vx = -ob.vx;
          if (ob.life < 0.05) ob.pop();
        },
      });
      // a jolt as each leaves; between them the head dips and pumps back up to let the next go
      kick(2, -4, i % 2 ? -0.2 : 0.2);
      if (i === n - 1) yield* act(0.22, () => stance('spheres-follow', { hx: 26, hy: -104, tilt: 0.05 }, { stiff: 2.6, lean: -0.07, oy: -6 }));
      else yield* act(0.22, (k, e) => (e < 0.1 ? stance('spheres-dip', { hx: 30, hy: -66, tilt: 1.2 }, { stiff: 3.2, lean: 0.05, oy: 3 }) : stance('spheres-pump', CAST, { stiff: 4.8, lean: -0.02, oy: -3 })));
    }
    yield* act(0.8, (k, e) => (e < 0.3 ? stance('spheres-follow', { hx: 26, hy: -104, tilt: 0.05 }, { stiff: 2.2, lean: -0.05, oy: -5 }) : stance('spheres-settle', { hx: 28, hy: -72, tilt: 0.55 }, { stiff: 1.2, lean: 0 })));
  }

  // Fire: a wall of flame crosses the floor.
  function* atkFirewall() {
    yield* reposition();
    const b = B.body, T = K.T();
    G.ui.hint('firewall', 'Stand on a platform, or dash through the flames');
    const dir = b.x < 640 ? 1 : -1;
    // the stance (v2.5c): both hands on the staff, leaning far in, its head scraping the floor in front
    // as if raking up the fire; held, gathering; then flung up as the wall surges
    yield* castT(FIRE, 0.4 * T, (k) => {
      if (k < 0.45) stance('firewall-reach', { hx: 32, hy: -64, tilt: 2.35 }, { stiff: 2.4, two: 1, oy: 6, lean: 0.14 });
      else stance('firewall-scrape', { hx: 40, hy: -60, tilt: 2.2 }, { stiff: 2, two: 1, oy: 8, lean: 0.16, trem: 0.025 });
    });
    firewall(dir, T);
    b.sq = Math.max(b.sq || 0, 0.06);
    // (the wall waits 0.95T before it moves; the fling comes as it goes)
    const fling = (e, tf, cue) => {
      if (e < tf) stance('firewall-heave', { hx: 22, hy: -70, tilt: 2.55 }, { stiff: 1.8, two: 1, oy: 9, lean: 0.06, trem: 0.02 + 0.03 * Math.min(1, e / Math.max(0.01, tf)) });
      else if (e < tf + 0.3) { if (!cue.done) { cue.done = true; kick(4, -6, -0.2); } stance('firewall-fling', { hx: 30, hy: -108, tilt: 0.4 }, { stiff: 4.6, two: 0.6, oy: -6, lean: -0.08 }); }
      else return false;
      return true;
    };
    if (K.hard() || B.phase === 3) {
      const tf = Math.min(0.95 * T, 1.1) - 0.12, cue = {};
      yield* act(1.1, (k, e) => {
        if (fling(e, tf, cue)) return;
        // the second comes from the other way: the staff swept back over its shoulder, beckoning it
        stance('firewall-beckon', { hx: 16, hy: -96, tilt: -0.9 }, { stiff: 2, lean: -0.1, oy: -2, trem: 0.02 });
      });
      firewall(-dir, T);
      const cue2 = {};
      yield* act(0.95 * T + 2.4, (k, e) => {
        if (e < 0.95 * T - 0.12) stance('firewall-beckon', { hx: 16, hy: -96, tilt: -0.9 }, { stiff: 1.6, lean: -0.1, oy: -2, trem: 0.03 });
        else if (e < 0.95 * T + 0.2) { if (!cue2.done) { cue2.done = true; kick(5, 4, 0.2); } stance('firewall-throw', { hx: 38, hy: -82, tilt: 1.3 }, { stiff: 4.4, lean: 0.12, oy: 2 }); }
        else if (e < 0.95 * T + 2.0) stance('firewall-watch', { hx: 26, hy: -78, tilt: 0.4 }, { stiff: 1.2, lean: 0 });
        else stance('firewall-settle', { hx: 22, hy: -68, tilt: 0.2 }, { stiff: 1, lean: 0 });
      });
    } else {
      const cue = {};
      yield* act(0.95 * T + 2.4, (k, e) => {
        if (fling(e, 0.95 * T - 0.12, cue)) return;
        if (e < 0.95 * T + 0.9) stance('firewall-hold', { hx: 26, hy: -96, tilt: 0.2 }, { stiff: 1.6, oy: -2, lean: -0.03 });
        else if (e < 0.95 * T + 2.0) stance('firewall-watch', { hx: 26, hy: -78, tilt: 0.4 }, { stiff: 1.2, lean: 0 });
        else stance('firewall-settle', { hx: 22, hy: -68, tilt: 0.2 }, { stiff: 1, lean: 0 });
      });
    }
  }

  // Ice: crystals that burst into rings unless they are broken first.
  function crystal(x, life) {
    const c = {
      id: 'crystal' + (B.serial++), x, hp: 58, t: 0, life, flash: 0, rise: 0,
      onHit(amount, info) {
        this.hp -= amount; this.flash = 1;
        if (G.settings.numbers) G.fx.text(info.x, info.y - 16, String(Math.round(amount)), { color: '200,240,255', size: 16, life: 0.5 });
        if (this.hp <= 0) {
          this.gone = true;
          G.player.gain(26);
          if (!B.staggered) B.poise = Math.min(B.poiseMax - 1, B.poise + B.poiseMax * 0.18);
          G.audio.play('shatter'); G.fx.shake(7);
          G.fx.burst(this.x, FLOOR - 46, { n: 22, color: ICE.hot, speed: [120, 620], life: [0.3, 0.8], kind: 'spark', size: [2, 5] });
          G.fx.burst(this.x, FLOOR - 46, { n: 10, color: ICE.boss, speed: [80, 400], life: [0.5, 1], size: [5, 10], kind: 'chunk', grav: 1300 });
          G.fx.shatter(this.x, FLOOR - 46, ICE.boss, 16, { hot: ICE.hot, r: 240, jitter: 16 });
          G.fx.stop(0.05);
          G.fx.text(this.x, FLOOR - 110, 'BROKEN', { color: ICE.hot, size: 15, life: 0.8 });
        }
        return true;
      },
    };
    B.crystals.push(c);
    G.fx.ring(x, FLOOR - 20, { r0: 80, r1: 14, life: 0.35, color: ICE.boss, width: 5 });
  }
  function* atkCrystals() {
    yield* reposition();
    const P = G.player, T = K.T();
    G.ui.hint('crystals', 'Break the crystals before they burst');
    // the stance (v2.5c): the staff kept upright the whole time, in both hands, and lifted as if out of
    // the floor: down into a crouch, a slow straining rise, then thrust up high as the crystals come
    yield* castT(ICE, 0.7 * T, (k) => {
      if (k < 0.3) stance('crystals-dip', { hx: 26, hy: -52, tilt: 0.02 }, { stiff: 1.9, two: 1, oy: 8, lean: 0.06 });
      else if (k < 0.86) { const q = E.inQuad((k - 0.3) / 0.56); stance('crystals-strain', { hx: 26, hy: -52 - 36 * q, tilt: 0.02 }, { stiff: 2, two: 1, oy: 8 - 8 * q, lean: 0.06 - 0.08 * q, trem: 0.015 + 0.02 * q }); }
      else stance('crystals-lift', { hx: 24, hy: -122, tilt: -0.05 }, { stiff: 4.4, two: 1, oy: -8, lean: -0.09, orb: [0.8, -30] });
    });
    kick(0, -6, 0);
    G.audio.play('frost');
    const n = (B.phase === 3 || K.hard()) ? 3 : 2;
    const xs = G.shuffle([230, 470, 810, 1050]).filter((x) => Math.abs(x - B.body.x) > 90).slice(0, n);
    const life = (K.gentle() ? 8 : 6.5) * (0.6 + 0.4 * T);
    // they burst one at a time, far enough apart that each ring can be dashed through
    xs.forEach((x, i) => crystal(x + G.rrand(-30, 30), life + i * 0.9));
    void P;
    yield* act(0.9, (k, e) => {
      if (e < 0.25) stance('crystals-lift', { hx: 24, hy: -122, tilt: -0.05 }, { stiff: 3, two: 1, oy: -8, lean: -0.09, orb: [0.8, -30] });
      else if (e < 0.6) stance('crystals-hold', { hx: 24, hy: -110, tilt: 0 }, { stiff: 1.6, two: 0.5, oy: -4, lean: -0.04 });
      else stance('crystals-settle', { hx: 24, hy: -76, tilt: 0.2 }, { stiff: 1.2, lean: 0 });
    });
  }

  // Lightning: a cloud that follows the hero while the Magus goes on casting.
  function* atkStorm() {
    yield* reposition();
    const T = K.T();
    G.ui.hint('storm', 'The cloud strikes below itself. Keep out from under it');
    // the stance (v2.5c): a dip, then the staff stirs the sky overhead, its head circling faster and
    // faster with the motes whirling up round the hat, and it is thrust up to let the cloud go
    let a = 0;
    yield* castT(BOLT, 0.7 * T, (k, e, dt) => {
      a += dt * (5 + 12 * k);
      if (k < 0.25) stance('storm-dip', { hx: 20, hy: -68, tilt: 0.1 }, { stiff: 2, lean: 0.04, oy: 5 });
      else if (k < 0.88) stance('storm-stir', { hx: 14 + Math.cos(a) * 9, hy: -116 + Math.sin(a) * 5, tilt: -0.12 + Math.sin(a) * 0.28 }, { stiff: 2.2, lean: -0.06, oy: -6, orb: [0.7, -64] });
      else stance('storm-thrust', { hx: 12, hy: -130, tilt: -0.05 }, { stiff: 4.6, lean: -0.1, oy: -10, orb: [0.7, -64] });
    });
    if (!H.list.some((h) => h.kind === 'cloud')) cloud(B.phase === 3 || K.hard() ? 5 : 4, T);
    kick(0, 6, 0.06);
    yield* act(0.5, (k, e) => (e < 0.22 ? stance('storm-thrust', { hx: 12, hy: -130, tilt: -0.05 }, { stiff: 3, lean: -0.08, oy: -8, orb: [0.7, -64] }) : stance('storm-lower', { hx: 22, hy: -90, tilt: 0.15 }, { stiff: 1.3, oy: -2, lean: -0.02 })));
  }

  // Ice: wind drives the hero back while icicles fall.
  function* atkBlizzard() {
    const P = G.player, T = K.T();
    const side = P.x < 640 ? 1 : -1; // the Magus takes the far side and blows the hero towards the near wall
    yield* blink(640 + side * 450, GY);
    const b = B.body;
    G.ui.hint('blizzard', 'The wind pushes you back. Icicles fall where the floor is marked');
    // the stance (v2.5c): drawn back and up, as a breath is taken; then braced, leaning far in, the
    // staff thrust out ahead in both hands, and held into the wind it makes, buffeted
    yield* castT(ICE, 0.8 * T, (k) => {
      if (k < 0.3) stance('blizzard-draw', { hx: 14, hy: -88, tilt: -0.25 }, { stiff: 1.8, two: 1, oy: -4, lean: -0.08, orb: [1.2, -6] });
      else stance('blizzard-brace', { hx: 40, hy: -92, tilt: 0.75 }, { stiff: 2.6, two: 1, oy: 4, lean: 0.14, trem: 0.02, orb: [1.3, -6] });
    });
    G.audio.play('tide'); G.audio.play('frost');
    B.blizz = -side;
    kick(-5, 0, -0.1);
    const dur = 4.2, n = K.hard() ? 11 : 9;
    let e = 0, next = 0.3, i = 0;
    while (e < dur) {
      const dt = yield;
      e += dt; next -= dt;
      stance('blizzard-channel', { hx: 40 + Math.sin(e * 3.1) * 2, hy: -92 + Math.sin(e * 4.3) * 2, tilt: 0.75 + Math.sin(e * 5.7) * 0.05 }, { stiff: 2, two: 1, oy: 4 + Math.sin(e * 1.9) * 1.5, lean: 0.15 + Math.sin(e * 2.3) * 0.02, orb: [1.3, -6] });
      G.wind = -side * 185 * Math.min(1, e / 0.4) * Math.min(1, (dur - e) / 0.4);
      if (next <= 0 && i < n) {
        next = dur / (n + 1); i++;
        H.meteor({ x: G.clamp(P.x + (P.vx + G.wind) * 0.3 + G.rrand(-34, 34), WL + 40, WR - 40), tele: 0.78 * T, blastR: 46, tint: ICE });
      }
    }
    G.wind = 0; B.blizz = 0; b.want = 0;
    // the wind drops out of it: it slumps forward a beat, then straightens
    yield* act(0.8, (k, e) => (e < 0.22 ? stance('blizzard-release', { hx: 30, hy: -76, tilt: 1.2 }, { stiff: 2, lean: 0.07, oy: 3 }) : stance('blizzard-settle', { hx: 24, hy: -70, tilt: 0.4 }, { stiff: 1.2, lean: -0.02 })));
  }

  // The last verse, once: ice, then fire, then lightning, and the Magus is spent.
  function* atkCataclysm() {
    const b = B.body, T = K.T();
    G.ui.callout('CATACLYSM', 'Ice, then fire, then lightning');
    yield* blink(640, FLOOR - 170);
    b.want = 1; B.spin = 5;
    setElem(ICE);
    rime(640, [-1, 1], T, 0.085);
    // each verse its own stance (v2.5c): ice, the staff swept down at the floor in both hands;
    // fire, heaved up overhead and held back, trembling, then hurled down as the blast comes;
    // lightning, held straight up and jabbed at the sky for each volley
    kick(0, 6, 0.15);
    yield* act(0.6 * T + 0.75, (k, e) => stance(e < 0.2 ? 'cata-ice' : 'cata-ice-hold', { hx: 30, hy: -60, tilt: 2.5 }, { stiff: e < 0.2 ? 3.6 : 1.6, two: 1, oy: 6, lean: 0.12, trem: e < 0.2 ? 0 : 0.02, orb: [1.3, 40] }));
    setElem(FIRE);
    G.audio.play('charge', { dur: 1.25 * T });
    H.blast({ x: 640, y: FLOOR - 30, r: 330, tele: 1.25 * T, tint: FIRE, sfx: 'boom' });
    let hurled = false;
    yield* act(1.25 * T + 0.3, (k, e) => {
      if (e < 0.3) stance('cata-fire-rise', { hx: 6, hy: -124, tilt: -0.4 }, { stiff: 1.6, two: 1, oy: -8, lean: -0.1 });
      else if (e < 1.25 * T - 0.12) stance('cata-fire-peak', { hx: 4, hy: -124, tilt: -0.8 }, { stiff: 1.2, two: 1, oy: -10, lean: -0.15, trem: 0.015 + 0.04 * Math.min(1, e / (1.25 * T)) });
      else { if (!hurled) { hurled = true; b.recV = (b.recV || 0) + b.face * 1.2; } stance('cata-fire-hurl', { hx: 38, hy: -66, tilt: 1.7 }, { stiff: 5, two: 0.6, oy: 4, lean: 0.16 }); }
    });
    setElem(BOLT);
    const lanes = 9, lw = (WR - WL) / lanes;
    let parity = G.rng() < 0.5 ? 0 : 1;
    for (let v = 0; v < 3; v++) {
      for (let i = 0; i < lanes; i++) if (i % 2 === parity) strike(WL + (i + 0.5) * lw, 0.85 * T, lw - 16);
      let hit = false;
      yield* act(0.85 * T + 0.15, (k, e) => {
        if (!hit && e >= 0.85 * T) { hit = true; kick(0, 7, 0.08); }
        if (e < 0.12) stance('cata-bolt-jab', { hx: 12, hy: -134, tilt: -0.04 }, { stiff: 4.4, oy: -9, lean: -0.1, orb: [0.7, -64] });
        else stance('cata-bolt-hold', { hx: 12, hy: -122, tilt: -0.1 }, { stiff: 1.8, oy: -6, lean: -0.07, trem: 0.02, orb: [0.7, -64] });
      });
      parity = 1 - parity;
    }
    // spent: the Magus drops and lies open
    B.spin = 0.3; b.elem = null; b.want = 0; b.spent = true; b.exposed = true;
    stance('cata-spent', { hx: 26, hy: -44, tilt: 1.1 }, { stiff: 1, lean: 0 });
    yield* tween(b, { y: FLOOR }, 0.45, E.inCubic);
    G.fx.shake(8); G.audio.play('boom');
    G.fx.thud(b.x, FLOOR, 1.2);
    G.ui.callout('SPENT', 'Strike now');
    kick(0, 8, 0.3); b.sq = Math.max(b.sq || 0, 0.12);
    yield* wait(3.4);
    b.spent = false; b.exposed = false; b.homeY = GY; B.spin = 1;
    unstance();
  }

  const coda = (spell, el) => function* () {
    yield* spell();
    if (B.phase < 3) return;
    setElem(el === BOLT ? ICE : BOLT); B.body.want = 1;
    echo(el);
    yield* echoStance(el);
  };
  // The echo's own stance (v2.5c), in the staff's language: a bolt from the sky is called with the
  // staff jabbed straight up; an ice shard is aimed with the staff levelled at the hero. A quick coil
  // first, the held point, and a jolt as it goes.
  function* echoStance(el) {
    const T = K.T(), sky = el !== BOLT;
    let fired = false;
    yield* act(0.85 * T + 0.3, (k, e) => {
      if (e < 0.1) stance('echo-coil', { hx: 20, hy: -70, tilt: sky ? 0.3 : 0.6 }, { stiff: 2.6, oy: 4, lean: sky ? 0.04 : -0.04 });
      else if (e < 0.85 * T) stance(sky ? 'echo-sky' : 'echo-aim', sky ? { hx: 14, hy: -118, tilt: -0.12 } : { hx: 34, hy: -84, tilt: 1.25 }, { stiff: 2.6, oy: sky ? -7 : 3, lean: sky ? -0.08 : 0.1, trem: 0.02 });
      else {
        if (!fired) { fired = true; if (sky) kick(0, 7, 0.08); else kick(-7, 0, -0.18); }
        stance('echo-release', { hx: 26, hy: -78, tilt: 0.5 }, { stiff: 1.4, lean: 0 });
      }
    });
  }
  // Comet: a slow star that follows the hero. It cannot be outrun for ever; the answer is to strike
  // it, which sends it back at the Magus. In the last phase (and on Merciless patterns) the Magus
  // bats it back again, faster, and it must be struck a second time.
  const STAR = { boss: '255,214,140', hot: '255,250,230' };
  function* atkComet() {
    yield* reposition(true);
    const T = K.T(), b = B.body, P = G.player;
    G.ui.hint('comet', 'Strike the star to send it back at the Magus');
    face();
    // the stance (v2.5c): the staff taken across the body in both hands, then raised and cradled at
    // the height of its face, the figure rising, while the star swells on its head; and pushed off
    yield* castT(STAR, 0.9 * T, (k, e) => {
      if (k < 0.25) stance('comet-gather', { hx: 22, hy: -70, tilt: 1.4 }, { stiff: 1.8, two: 1, oy: 4, lean: 0.04 });
      else if (k < 0.85) stance('comet-cradle', { hx: 20, hy: -98, tilt: 1.0 + Math.sin(e * 6) * 0.04 }, { stiff: 1.3, two: 1, oy: -10, lean: -0.08, orb: [1.2, -30] });
      else stance('comet-push', CAST, { stiff: 4.2, two: 0.7, oy: -4, lean: 0.04 });
    });
    kick(5, 0, 0.18);
    const o = tipCast(), sp = K.gentle() ? 210 : K.hard() ? 280 : 245;
    const a0 = Math.atan2(P.y - 30 - o.y, P.x - o.x);
    G.audio.play('whoosh');
    const ob = H.orb(o.x, o.y, Math.cos(a0) * sp, Math.sin(a0) * sp, {
      r: 24, life: 11, tint: STAR, once: true,
      steer(q, dt) {
        const tx = q.back ? b.x : P.x, ty = q.back ? b.y - B.h / 2 : Math.min(P.y - 30, FLOOR - 40);
        const cur = Math.atan2(q.vy, q.vx), want = Math.atan2(ty - q.y, tx - q.x), rate = q.back ? 9 : 2.3;
        const na = cur + G.clamp(G.angDiff(cur, want), -rate * dt, rate * dt);
        q.vx = Math.cos(na) * q.speed; q.vy = Math.sin(na) * q.speed;
        if (q.y > FLOOR - 30) { q.y = FLOOR - 30; q.vy = Math.min(q.vy, 0); }
        if (Math.random() < dt * 40) G.fx.spawn({ x: q.x, y: q.y, vx: G.rand(-40, 40), vy: G.rand(-40, 40), life: 0.4, size: G.rand(3, 7), color: (q.tint || STAR).boss });
        if (q.back && G.dist(q.x, q.y, tx, ty) < 50) {
          if (q.rallies > 0) {
            // the Magus knocks it back with the staff
            q.rallies--; q.back = false; q.speed *= 1.22; q.tint = STAR; q.life = Math.max(q.life, 7);
            const a = Math.atan2(P.y - 30 - q.y, P.x - q.x);
            q.vx = Math.cos(a) * q.speed; q.vy = Math.sin(a) * q.speed;
            b.charge = 1;
            G.audio.play('clash'); G.fx.shake(8); G.fx.stop(0.06);
            G.fx.lines(q.x, q.y, 12, STAR.hot, { r0: 20 }); G.fx.ring(q.x, q.y, { r0: 10, r1: 150, life: 0.3, color: STAR.hot, width: 6 });
          } else {
            q.dead = true; q.struck = true;
            const t = B.targets().find((z) => z.kind === 'body');
            G.audio.play('flareHit'); G.audio.play('shatter');
            G.fx.stop(0.14); G.fx.shake(16); G.fx.flash(STAR.hot, 0.3, 0.3); G.fx.punch(0.04);
            G.fx.shatter(q.x, q.y, STAR.boss, 26, { hot: STAR.hot, r: 420, r0: 40 });
            G.fx.boom(q.x, q.y, 130, { col: STAR.boss, hot: STAR.hot });
            if (t) G.feats.bump('comet');
            if (t) B.damage(Math.round(70 * G.dmgMult()), t, { x: q.x, y: q.y, heavy: true, finisher: true, lance: true, poise: 2.4, dir: G.sign(q.vx) || 1 });
          }
        }
      },
    });
    ob.speed = sp; ob.back = false; ob.struck = false;
    ob.rallies = (B.phase >= 3 ? 1 : 0) + (K.hard() ? 1 : 0);
    // struck by the hero: it turns round, faster, in the hero's own colour
    ob.slash = function () {
      if (ob.back) return;
      ob.back = true; ob.speed *= 1.4; ob.life = Math.max(ob.life, 5);
      ob.tint = { boss: P.hero.col, hot: P.hero.hot };
      const a = Math.atan2(b.y - B.h / 2 - ob.y, b.x - ob.x);
      ob.vx = Math.cos(a) * ob.speed; ob.vy = Math.sin(a) * ob.speed;
      G.audio.play('clash'); G.fx.stop(0.08); G.fx.shake(9); G.fx.punch(0.02);
      G.fx.lines(ob.x, ob.y, 14, P.hero.hot, { r0: 22 });
      G.fx.ring(ob.x, ob.y, { r0: 10, r1: 170, life: 0.3, color: P.hero.hot, width: 7 });
      G.fx.light(ob.x, ob.y, 260, P.hero.col, 0.25, 0.7);
    };
    const hits0 = ob.hits;
    ob.hits = (Pl) => !ob.back && hits0.call(ob, Pl);
    b.want = 0.5;
    // while it hunts: a guard, the staff held ready in both hands like a bat. Coming back at it with a
    // rally left, it cocks the staff back over its shoulder and swings through it; with none left it
    // can only brace
    let swing = 0, ralWas = ob.rallies;
    while (!ob.dead) {
      const dt = yield;
      b.charge = Math.max(0, b.charge - dt * 3); face();
      if (ob.rallies < ralWas) { ralWas = ob.rallies; swing = 0.22; kick(6, 2, 0.3); }
      const near = ob.back && G.dist(ob.x, ob.y, b.x, b.y - B.h / 2) < 260;
      if (swing > 0) { swing -= dt; stance('comet-bat', { hx: 40, hy: -76, tilt: 1.9 }, { stiff: 6, two: 1, lean: 0.12, oy: 2 }); }
      else if (near && ob.rallies > 0) stance('comet-windup', { hx: 12, hy: -92, tilt: -0.9 }, { stiff: 3, two: 1, lean: -0.08, oy: 2 });
      else if (near) stance('comet-brace', { hx: 18, hy: -104, tilt: 0.15 }, { stiff: 3, two: 1, lean: -0.1, oy: -4 });
      else stance('comet-guard', { hx: 24, hy: -84, tilt: 0.25 + Math.sin(B.t * 2.2) * 0.05 }, { stiff: 1.3, two: 1, lean: 0 });
    }
    b.charge = 0; b.want = 0;
    if (ob.struck) {
      // its own star in its face: it reels, open (thrown back, then dazed and swaying)
      b.exposed = true;
      kick(-6, -6, -0.4); b.sq = Math.max(b.sq || 0, 0.1);
      yield* act(1.7, (k, e) => {
        if (e < 0.28) stance('comet-reel', { hx: 10, hy: -96, tilt: -0.8 }, { stiff: 3, lean: -0.2, oy: -4 });
        else stance('comet-dazed', { hx: 24, hy: -48, tilt: 0.7 + Math.sin(e * 2.5) * 0.12 }, { stiff: 1, lean: -0.1 + Math.sin(e * 2.5) * 0.04, oy: 6 });
      });
      b.exposed = false;
    } else yield* act(0.5, () => stance('comet-settle', { hx: 24, hy: -76, tilt: 0.35 }, { stiff: 1.2, lean: 0 }));
  }

  // Invocation: lightning, two to four times, each from a different quarter. The red warning comes
  // late and short on purpose. What gives you time is the staff: how it is held through the cast
  // says where the bolt will come from (see GEST above).
  function* atkInvoke() {
    const b = B.body, P = G.player, T = K.T();
    // always from the ground, well away from the hero
    yield* blink(P.x < 640 ? 1010 : 270, GY);
    const n = 2 + (B.phase - 1) + (K.hard() ? 1 : 0), late = 0.44 * T;
    let last = '';
    for (let i = 0; i < n; i++) {
      face();
      const forced = ['high', 'level', 'plant'].find((g) => String(G.debug.variant || '').split(',').includes(g));
      const g = forced || G.rpick(['high', 'level', 'plant'].filter((q) => q !== last));
      last = g;
      b.gest = g;
      // the body says it too (v2.5c), after a quick coil the other way: from the sky, it rises and
      // leans back looking up, the motes lifting; along the ground, it drops into a crouch and leans in
      // behind the levelled staff like a lance; through the floor, it rises and comes down on the
      // driven staff, the motes sinking. The hold steadies, then trembles as the bolt comes.
      const BODY = { high: { lean: -0.12, oy: -11, orb: [0.7, -60] }, level: { lean: 0.13, oy: 8, orb: [1.25, 6] }, plant: { lean: 0.05, oy: 5, orb: [1.2, 48] } }[g];
      const COIL = { high: { lean: 0.06, oy: 5 }, level: { lean: -0.06, oy: -4 }, plant: { lean: -0.04, oy: -9 } }[g];
      let planted = false;
      yield* castT(BOLT, 0.72 * T, (k) => {
        if (k < 0.14) stance('invoke-coil-' + g, null, COIL);
        else {
          if (g === 'plant' && !planted) { planted = true; b.sq = Math.max(b.sq || 0, 0.09); kick(0, 5, 0); G.fx.dust(b.x + b.face * 40, FLOOR, 2, { speed: [20, 90], size: [5, 9], up: 30, a: 0.3 }); }
          stance('invoke-' + g, null, Object.assign({ trem: k > 0.6 ? 0.03 * (k - 0.6) / 0.4 : 0 }, BODY));
        }
      });
      if (g === 'high') {
        strike(G.clamp(P.x + P.vx * 0.15, WL + 40, WR - 40), late, 88);
      } else if (g === 'level') {
        H.beam({ ox: b.x + b.face * 44, oy: FLOOR - 30, ang: b.face > 0 ? 0 : Math.PI, width: 30, tele: late, lock: late, active: 0.16, tint: BOLT, sfx: 'zap', clip: false, maxLen: 1500 });
      } else {
        // through the floor: a mark under the staff, then waves both ways
        const m = K.columnMark(b.x + b.face * 26, 70);
        let e = 0;
        while (e < late) { e += yield; m.k = e / late; m.locked = e > late * 0.6; stance('invoke-plant-hold', null, Object.assign({}, BODY, { trem: 0.03 + 0.03 * e / late })); }
        m.dead = true;
        b.sq = Math.max(b.sq || 0, 0.08);
        G.audio.play('zap'); G.fx.shake(7);
        G.fx.thud(b.x + b.face * 26, FLOOR, 0.9, { col: BOLT.boss });
        H.shockwave(b.x + b.face * 40, b.face, 640, 46, BOLT);
        H.shockwave(b.x - b.face * 10, -b.face, 640, 46, BOLT);
      }
      if (g !== 'plant') yield* act(late, (k) => stance('invoke-' + g + '-hold', null, Object.assign({}, BODY, { trem: 0.03 + 0.03 * k })));
      // the bolt goes: from the sky the staff jolts down in the hand; along the ground it kicks back like
      // a fired lance; through the floor the Magus is thrown up off it
      if (g === 'high') kick(0, 9, 0.1); else if (g === 'level') kick(-9, 0, -0.2); else kick(0, -10, 0);
      yield* act(0.3, (k, e) => stance('invoke-recoil', null, e < 0.14 ? { high: { lean: -0.04, oy: -4 }, level: { lean: -0.05, oy: 2 }, plant: { lean: -0.02, oy: -8 } }[g] : { lean: 0, oy: 0 }));
      b.gest = null;
      yield* act(0.3, () => stance('invoke-settle', null, { lean: 0.02, oy: 2 }));
    }
    yield* act(0.5, () => stance('invoke-settle', null, { lean: 0, oy: 0 }));
  }

  // ------------------------------------------------------------------ corrupted: the void's own two
  // Only its corrupted self casts these (B.corruptBags). Its three lights go out and the void answers
  // the staff instead: black, with blood at the edges.

  // does a circle of radius r at (x, y) touch the hero's box?
  function touches(P, x, y, r) {
    const q = P.box(), dx = Math.max(0, Math.abs(x - q.cx) - q.hw), dy = Math.max(0, Math.abs(y - q.cy) - q.hh);
    return dx * dx + dy * dy < r * r;
  }

  // The Black Sun. A black sun rises behind the Magus and its shadow comes down on the arena as tall
  // columns of void, everywhere but one gap of light. The columns slide sideways together and the
  // gap goes with them: walk with the light. They turn heavily, slowing, stopping and coming back,
  // never snapping: at the walls, and later in the fight in the middle of the floor too, with the
  // sun's corona flaring as they do. Only the void hurts, and only once it has poured all the way down.
  const SUN_X = 640, SUN_Y = FLOOR - 440, SUN_R = 86, PW = 94, SEAM = 7, TURN = 2.6;
  function blacksun(rise, form, dur, o) {
    const P = G.player, gw = o.gw, on = rise + form, end = on + dur;
    return H.add({
      kind: 'blacksun', layer: 'under', tint: VOID, rise, form, dur, gw, fall: 0.6, swell: 0,
      g: G.clamp(P.x, WL + gw / 2 + 60, WR - gw / 2 - 60), v: 0, dir: P.x < 640 ? 1 : -1,
      speed: o.speed, turns: o.turns.slice(), lastTurn: -9, due: 0,
      update(dt) {
        const t = this.t;
        // the light moves: slowly while the void is pouring, at full pace once it is down; it has weight
        if (t >= rise) {
          const want = t > end ? 0 : this.dir * this.speed * (t < on ? 0.35 : 1);
          this.v = G.damp(this.v, want, TURN, dt);
          this.g += this.v * dt;
          const room = this.dir > 0 ? WR - (this.g + gw / 2) : (this.g - gw / 2) - WL;
          // it starts to turn early enough at a wall for its slowing to stop it there
          if (room < Math.abs(this.v) / TURN + 4 && t - this.lastTurn > 0.5) { this.turn(); this.due = 0; }
          // a turn in the open floor is foretold: the sun's corona swells for a moment before it comes
          else if (this.turns.length && t >= on + this.turns[0] - 0.45) { this.turns.shift(); if (t - this.lastTurn > 1.1 && room > 230) this.due = t + 0.45; }
          if (this.due && t >= this.due) { this.due = 0; this.turn(); }
          this.g = G.clamp(this.g, WL + gw / 2, WR - gw / 2);
        }
        this.swell = G.damp(this.swell, this.due || t - this.lastTurn < 0.25 ? 1 : 0, this.due ? 7 : 3, dt);
        this.srcX = P.x - (G.sign(this.g - P.x) || 1) * 40; // anyone caught in it is knocked towards the light
        // the void sheds black motes off its edges, and dust drifts in the light
        const k = this.k();
        if (k > 0.2 && t < end) {
          for (const s of [-1, 1]) {
            const ex = this.g + s * gw / 2;
            if (Math.random() < dt * 14 * k) G.fx.spawn({ kind: 'smoke', color: VOID.dark, a: 0.55, x: ex + s * G.rand(2, 16), y: G.rand(60, FLOOR), vx: s * G.rand(5, 30), vy: -G.rand(20, 70), life: G.rand(0.5, 1), size: G.rand(5, 10), grow: 8, drag: 1 });
            if (Math.random() < dt * 5 * k) G.fx.spawn({ kind: 'spark', x: ex, y: G.rand(40, FLOOR), vx: s * G.rand(20, 120), vy: -G.rand(60, 260), life: G.rand(0.12, 0.3), size: G.rand(1.2, 2), color: VOID.boss, len: 0.05 });
          }
          if (Math.random() < dt * 6) G.fx.spawn({ x: this.g + G.rand(-gw / 2.4, gw / 2.4), y: G.rand(120, FLOOR - 20), vx: G.rand(-8, 8) + this.v * 0.6, vy: G.rand(-14, 14), life: G.rand(1, 1.8), size: G.rand(1.2, 2.4), color: VOID.hot, a: 0.5 });
        }
        if (t > end + this.fall) this.dead = true;
      },
      turn() { this.dir = -this.dir; this.lastTurn = this.t; if (this.t > rise) G.audio.play('sweep'); },
      // how far the void has come down (0 to 1), then how much of it is left as it lifts away (1 to 0)
      k() { const t = this.t; if (t < rise) return 0; if (t < on) return (t - rise) / form; if (t < end) return 1; return Math.max(0, 1 - (t - end) / this.fall); },
      live() { return this.t >= on && this.t < end; },
      hits(Pl) { return this.live() && Math.abs(Pl.x - this.g) + Pl.box().hw - 6 > gw / 2; },
      danger(Pl) {
        if (this.t < rise || this.t >= end) return null;
        // the void on the side of the light nearest the hero, taken a little ahead of where the light is going
        // (and with a wider berth on the frozen floor, where a hero cannot stop short)
        const g = this.g + this.v * 0.2, side = Pl.x < g ? -1 : 1;
        const edge = g + side * gw / 2, far = side < 0 ? WL - 300 : WR + 300;
        // when it hurts: as it lands, or, for a hero still just inside the light, when its edge reaches them
        const inside = gw / 2 - 5 - Math.abs(Pl.x - this.g);
        const soon = Math.max(on - this.t, inside > 0 ? inside / Math.max(60, Math.abs(this.v)) : 0);
        return [(edge + far) / 2, Math.abs(far - edge) / 2 + 16 + 14 * G.slick, soon];
      },
      draw(ctx) { drawBlackSun(ctx, this); },
    });
  }

  function drawBlackSun(ctx, h) {
    const t = h.t, k = h.k(), gw = h.gw, g = h.g, end = h.rise + h.form + h.dur, ending = t >= end;
    // the sun: it rises slowing, as anything heavy does, and at the end sinks a little as it fades
    const up = E.outCubic(Math.min(1, t / h.rise)), sa = Math.min(1, t / 0.25) * (ending ? k : 1);
    if (sa > 0.01) {
      const x = SUN_X, y = G.lerp(FLOOR - 180, SUN_Y, up) + (ending ? (1 - k) * 40 : 0), R = SUN_R * (0.7 + 0.3 * up);
      ctx.save();
      ctx.globalAlpha = sa;
      // it eats the light around it
      let gr = ctx.createRadialGradient(x, y, R * 0.8, x, y, R * 3.4);
      gr.addColorStop(0, 'rgba(4,0,3,0.62)'); gr.addColorStop(1, 'rgba(4,0,3,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - R * 3.4, y - R * 3.4, R * 6.8, R * 6.8);
      // a corona of thin crimson rays, turning slowly; it flares when the columns turn
      ctx.globalCompositeOperation = 'lighter';
      const sw = 1 + 0.4 * E.outCubic(h.swell);
      ctx.fillStyle = G.rgba(VOID.boss, 0.15 + 0.1 * h.swell);
      ctx.beginPath();
      for (let i = 0; i < 22; i++) {
        const a = i / 22 * G.TAU + t * 0.16, L = R * (1.32 + 0.3 * Math.sin(i * 2.7 + t * 1.3)) * sw, w = 0.05;
        ctx.moveTo(x + Math.cos(a - w) * R, y + Math.sin(a - w) * R);
        ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
        ctx.lineTo(x + Math.cos(a + w) * R, y + Math.sin(a + w) * R);
      }
      ctx.fill();
      gr = ctx.createRadialGradient(x, y, R * 0.94, x, y, R * 1.32);
      gr.addColorStop(0, G.rgba(VOID.boss, 0.5)); gr.addColorStop(1, G.rgba(VOID.boss, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R * 1.32, 0, G.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#050003'; ctx.beginPath(); ctx.arc(x, y, R, 0, G.TAU); ctx.fill();
      ctx.strokeStyle = G.rgba(VOID.hot, 0.4); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    if (k < 0.002) return;
    const top = -70, bot = FLOOR + 6, a = ending ? k : 1;
    // the gap: a shaft of pale light, faint, from the sky to the floor
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let gr = ctx.createLinearGradient(0, top, 0, FLOOR);
    gr.addColorStop(0, G.rgba(VOID.hot, 0)); gr.addColorStop(1, G.rgba(VOID.hot, 0.075 * k));
    ctx.fillStyle = gr; ctx.fillRect(g - gw / 2, top, gw, FLOOR - top);
    ctx.fillStyle = G.rgba(VOID.hot, 0.1 * k);
    ctx.beginPath(); ctx.ellipse(g, FLOOR, gw / 2, 7, 0, 0, G.TAU); ctx.fill();
    ctx.restore();
    // the columns, on both sides of the light; the ones by the gap pour last
    for (const s of [-1, 1]) {
      for (let j = 0; j < 16; j++) {
        const p = g + s * (gw / 2 + j * PW), q = g + s * (gw / 2 + (j + 1) * PW - SEAM);
        const x0 = Math.min(p, q), x1 = Math.max(p, q);
        if (x1 < -80 || x0 > G.W + 80) break;
        const delay = 0.3 * Math.max(0, 1 - j * 0.3);
        const kj = ending ? 1 : G.clamp((k - delay) / (1 - delay), 0, 1);
        if (kj <= 0) continue;
        // pouring, it falls faster as it comes; leaving, it lifts back into the sky from the floor up
        const yt = top, yb = ending ? bot - (bot - top) * E.inCubic(1 - k) : top + (bot - top) * (0.4 * kj + 0.6 * kj * kj);
        gr = ctx.createLinearGradient(0, top, 0, bot);
        gr.addColorStop(0, 'rgba(5,0,3,' + 0.4 * a + ')'); gr.addColorStop(0.55, 'rgba(8,0,5,' + 0.8 * a + ')'); gr.addColorStop(1, 'rgba(12,0,6,' + 0.9 * a + ')');
        ctx.fillStyle = gr; ctx.fillRect(x0, yt, x1 - x0, yb - yt);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // threads of blood running up through it
        ctx.strokeStyle = G.rgba(VOID.boss, 0.13 * a); ctx.lineWidth = 1.5;
        ctx.setLineDash([16, 50]); ctx.lineDashOffset = t * 90 + j * 23;
        for (const f of [0.3, 0.72]) { const lx = G.lerp(x0, x1, f); D.line(ctx, lx, yt, lx, yb); }
        ctx.setLineDash([]);
        // its seams, faint
        ctx.strokeStyle = G.rgba(VOID.boss, 0.2 * a); ctx.lineWidth = 1;
        D.line(ctx, x0, yt, x0, yb); D.line(ctx, x1, yt, x1, yb);
        // the falling front, a ragged lip of crimson
        if (!ending && kj < 1) { ctx.strokeStyle = G.rgba(VOID.boss, 0.7); ctx.lineWidth = 2; D.line(ctx, x0, yb, x1, yb); }
        ctx.restore();
      }
      // the edge facing the light is drawn hard, so the gap reads at a glance; while the void is still
      // pouring, a thin line down to the floor already shows where the light will be
      const ex = g + s * gw / 2, kin = G.clamp((k - 0.3) / 0.7, 0, 1);
      const yb = ending ? bot - (bot - top) * E.inCubic(1 - k) : top + (bot - top) * (0.4 * kin + 0.6 * kin * kin);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (!ending && kin < 1) { ctx.strokeStyle = G.rgba(VOID.boss, 0.45 * Math.min(1, k * 4)); ctx.lineWidth = 1.2; D.line(ctx, ex, top, ex, FLOOR); }
      if (yb > top) {
        gr = ctx.createLinearGradient(ex, 0, ex + s * 22, 0);
        gr.addColorStop(0, G.rgba(VOID.boss, 0.4 * a)); gr.addColorStop(1, G.rgba(VOID.boss, 0));
        ctx.fillStyle = gr; ctx.fillRect(Math.min(ex, ex + s * 22), top, 22, yb - top);
        const fl = Math.min(1.25, (0.8 + 0.2 * Math.sin(t * 23 + s)) * (1 + 0.45 * h.swell)); // (the edges quicken too before a turn)
        ctx.strokeStyle = G.rgba(VOID.boss, 0.9 * a * fl); ctx.lineWidth = 2.4; D.line(ctx, ex, top, ex, yb);
        ctx.strokeStyle = G.rgba(VOID.hot, 0.4 * a * fl); ctx.lineWidth = 1; D.line(ctx, ex, top, ex, yb);
      }
      ctx.restore();
    }
  }

  function* atkBlacksun() {
    const b = B.body, T = K.T(), ph = B.phase;
    yield* blink(SUN_X, FLOOR - 200);
    const rise = 0.95 * T, form = 1.0 * T, dur = [0, 4.4, 5.0, 5.6][ph];
    const turns = ph === 1 ? [] : ph === 2 ? [G.rand(1.6, 2.6)] : [G.rand(1.2, 1.8), G.rand(3.2, 3.9)];
    // the tell: the staff goes up flat overhead in both hands, and the three lights go out one by one
    b.gest = 'sun'; b.want = 1; setElem(VOID);
    const h = blacksun(rise, form, dur, { gw: ph === 3 ? 206 : 214, speed: [0, 118, 136, 150][ph], turns });
    G.audio.play('charge', { dur: rise });
    for (let i = 0; i < 3; i++) {
      yield* wait(rise / 3);
      b.dark = i + 1;
      // where that mote is circling now (see the motes in B.draw)
      const a = B.t * 1.5 * B.spin + i * G.TAU / 3, mx = b.x + b.face * Math.cos(a) * 56, my = b.y - 62 + Math.sin(a) * 15;
      G.audio.play('orb');
      G.fx.dust(mx, my, 3, { speed: [10, 50], size: [5, 9], life: [0.5, 0.9], up: 60, a: 0.5, color: VOID.dark });
      G.fx.burst(mx, my, { n: 5, color: ELEMS[i].boss, speed: [30, 120], life: [0.2, 0.45], size: [1.5, 3], kind: 'spark' });
    }
    // the void pours down out of the sun
    G.audio.play('tide'); G.fx.shake(5);
    yield* wait(form);
    // and lands: everything but the light is void
    G.audio.play('clap'); G.fx.shake(12); G.fx.kick(0, 3);
    G.fx.ripple(b.x, b.y - 150, 520, 0.45, 1.1);
    for (const s of [-1, 1]) G.fx.dust(h.g + s * (h.gw / 2 + 30), FLOOR, 4, { dir: s, speed: [60, 260], size: [7, 13], up: 40, a: 0.5, color: VOID.dark });
    // held: the Magus bears the sun up for as long as it stands
    yield* wait(dur);
    // it lets go: the void lifts back into the sun, the sun goes down, and the Magus comes down with it
    G.audio.play('pull');
    b.gest = null; b.want = 0.4;
    yield* wait(h.fall * 0.5);
    yield* tween(b, { y: GY }, 0.8, E.inOutQuad);
    b.homeY = GY; b.want = 0;
  }

  // Foresight. The Magus reads where the hero is going. A crimson thread runs from its staff to the
  // place the hero will be a moment from now if they keep on as they are, and follows them while it
  // reads. Then the thread pulls taut and holds, and a bolt of void flies down it and bursts at its
  // end. Keep running and you meet it; stop, turn back or dash the other way and it bursts on empty
  // ground. Standing still is read too: then the end of the thread is on you, and any step will do.
  // They come in threes, each read afresh.
  const FLY = 0.26, BURST_R = 35;
  function foresee(read, lock) {
    const P = G.player, lead = lock + FLY, fire = read + lock;
    // where the hero will be after the lead: straight on along the ground, or along their arc in the air
    const where = () => {
      const fy = P.onGround ? P.y : Math.min(FLOOR, P.y + P.vy * lead + 0.5 * 2500 * lead * lead);
      return [G.clamp(P.x + P.vx * lead, WL + 20, WR - 20), fy - 22];
    };
    const w0 = where(), o0 = tip();
    return H.add({
      kind: 'foresight', layer: 'over', tint: VOID, ax: w0[0], ay: w0[1], ox: o0.x, oy: o0.y, hx: o0.x, hy: o0.y, fired: false, burst: false,
      update(dt) {
        const t = this.t;
        if (t < read) {
          const w = where();
          this.ax = G.damp(this.ax, w[0], 16, dt); this.ay = G.damp(this.ay, w[1], 16, dt);
          if (t + dt >= read) G.audio.play('tink'); // the thread pulls taut
        }
        if (t < fire) { const o = tip(); this.ox = o.x; this.oy = o.y; B.readAim = this; } else if (!this.fired) {
          this.fired = true;
          const b = B.body;
          G.audio.play('streak');
          b.kx -= b.face * 5; // the staff kicks back as it lets go
          G.fx.burst(this.ox, this.oy, { n: 7, color: VOID.boss, speed: [60, 240], life: [0.12, 0.3], kind: 'spark', size: [1.4, 2.4] });
          G.fx.dust(this.ox, this.oy, 2, { speed: [10, 40], size: [5, 8], life: [0.4, 0.7], up: 30, a: 0.45, color: VOID.dark });
        }
        if (this.fired && !this.burst) {
          const q = Math.min(1, (t - fire) / FLY);
          this.hx = G.lerp(this.ox, this.ax, q); this.hy = G.lerp(this.oy, this.ay, q);
          if (q >= 1) { this.burst = true; voidBurst(this.ax, this.ay); }
        }
        this.srcX = this.burst ? this.ax : this.hx;
        if (t > fire + FLY + 0.4) this.dead = true;
      },
      hits(Pl) {
        if (this.fired && !this.burst) return touches(Pl, this.hx, this.hy, 9);
        // (the sphere as big as it is drawn: it swells out over a few frames, v2.1b; it hit at full size at once)
        const e = this.t - fire - FLY, f = Math.max(0, 1 - e / 0.36);
        return this.burst && e < 0.1 && touches(Pl, this.ax, this.ay, BURST_R * (0.35 + 0.65 * E.outCubic(Math.min(1, Math.max(0, e) / 0.07))) * (0.55 + 0.45 * f));
      },
      danger(Pl) {
        const t = this.t;
        // while it is still reading it will follow wherever the hero goes; once taut, step off its end
        if (t < read || t > fire + FLY + 0.1 || Math.abs(this.ay - (Pl.y - 22)) > BURST_R + 50) return null;
        return [this.ax, BURST_R + 26, fire + FLY - t];
      },
      draw(ctx) {
        const t = this.t;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        if (!this.fired) {
          // the thread: slack and wavering while it reads, pulled straight and bright when it holds
          const taut = t < read ? 0 : E.outCubic(Math.min(1, (t - read) / (lock * 0.6))), fa = Math.min(1, t / 0.15);
          const mx = (this.ox + this.ax) / 2, my = (this.oy + this.ay) / 2 + (1 - taut) * (16 + 6 * Math.sin(t * 9));
          ctx.strokeStyle = G.rgba(VOID.boss, (0.28 + 0.55 * taut) * fa); ctx.lineWidth = 1.1 + 0.9 * taut;
          ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.quadraticCurveTo(mx, my, this.ax, this.ay); ctx.stroke();
          // its end: a small ring that closes on the point as the bolt comes
          const close = t < read ? 0 : Math.min(1, (t - read) / lock);
          ctx.strokeStyle = G.rgba(VOID.boss, (0.45 + 0.45 * taut) * fa); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(this.ax, this.ay, 18 - 11 * close, 0, G.TAU); ctx.stroke();
          ctx.fillStyle = G.rgba(VOID.hot, 0.6 * taut * fa);
          ctx.beginPath(); ctx.arc(this.ax, this.ay, 1.8, 0, G.TAU); ctx.fill();
        } else if (!this.burst) {
          // the bolt: a black spear edged in blood, the rest of the thread still ahead of it
          const dx = this.ax - this.ox, dy = this.ay - this.oy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, tl = 70;
          ctx.strokeStyle = G.rgba(VOID.boss, 0.6); ctx.lineWidth = 1.5; D.line(ctx, this.hx, this.hy, this.ax, this.ay);
          ctx.strokeStyle = G.rgba(VOID.boss, 0.6); ctx.lineWidth = 15; D.line(ctx, this.hx - ux * tl, this.hy - uy * tl, this.hx, this.hy);
          D.glow(ctx, VOID.boss, this.hx, this.hy, 26, 0.7);
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = '#050003'; ctx.lineWidth = 6; D.line(ctx, this.hx - ux * tl * 0.85, this.hy - uy * tl * 0.85, this.hx, this.hy);
        } else {
          // a sphere of black that swells out, holds, and closes
          const e = t - fire - FLY, f = Math.max(0, 1 - e / 0.36), r = BURST_R * (0.35 + 0.65 * E.outCubic(Math.min(1, e / 0.07))) * (0.55 + 0.45 * f);
          const x = this.ax, y = this.ay;
          ctx.globalCompositeOperation = 'source-over';
          const gr = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
          gr.addColorStop(0, 'rgba(4,0,2,' + 0.95 * f + ')'); gr.addColorStop(0.7, 'rgba(10,0,5,' + 0.9 * f + ')'); gr.addColorStop(1, G.rgba(VOID.boss, 0.55 * f));
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(x, y, r, 0, G.TAU); ctx.fill();
          // torn edges: thorns of black thrown out of it
          ctx.fillStyle = 'rgba(5,0,3,' + 0.9 * f + ')';
          ctx.beginPath();
          for (let i = 0; i < 7; i++) {
            const a = i / 7 * G.TAU + this.ox * 0.01, L = r * (1.25 + 0.3 * ((i * 5) % 3)) * (0.6 + 0.4 * f), w = 0.2;
            ctx.moveTo(x + Math.cos(a - w) * r * 0.9, y + Math.sin(a - w) * r * 0.9); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.lineTo(x + Math.cos(a + w) * r * 0.9, y + Math.sin(a + w) * r * 0.9);
          }
          ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = G.rgba(VOID.boss, 0.9 * f); ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(x, y, r, 0, G.TAU); ctx.stroke();
        }
        ctx.restore();
      },
    });
  }
  function voidBurst(x, y) {
    G.audio.play('clap'); G.fx.shake(5);
    G.fx.ripple(x, y, 170, 0.3, 0.8);
    G.fx.ring(x, y, { r0: 12, r1: BURST_R * 1.7, life: 0.3, color: VOID.boss, width: 4 });
    G.fx.burst(x, y, { n: 12, color: VOID.boss, speed: [120, 480], life: [0.15, 0.35], kind: 'spark', size: [1.5, 2.8], grav: 600 });
    G.fx.dust(x, y + 10, 5, { speed: [40, 160], size: [8, 14], life: [0.5, 0.9], up: 50, a: 0.55, color: VOID.dark });
    if (y > FLOOR - 60) {
      G.fx.scorch(x, 70, VOID.boss);
      G.fx.burst(x, FLOOR - 4, { n: 5, color: VOID.dark, speed: [120, 320], angle: -Math.PI / 2, spread: 2.2, life: [0.5, 1], size: [3, 6], kind: 'chunk', grav: 1500 });
    }
  }

  function* atkForesight() {
    const b = B.body, P = G.player, T = K.T();
    // (the hold is what a hero has to change course in; on the frozen floor of the later phases that
    // takes longer, so it is kept generous, and a dash always beats it)
    const bursts = B.phase >= 3 ? 2 : 1, read = 0.55 * T, lock = 0.27 * T, gap = 0.48 * T;
    for (let r = 0; r < bursts; r++) {
      // up and well away, where it can see the whole floor
      const side = P.x < 640 ? 1 : -1;
      yield* blink(G.clamp(P.x + side * G.rand(380, 460), 200, 1080), FLOOR - 250);
      // the tell: its head turns to the hero, the glow of its hood narrows to a slit, and the staff
      // comes round to point a little ahead of them
      b.track = 1; b.slit = 1; b.gest = 'read'; b.want = 0.6; setElem(VOID);
      G.audio.play('charge', { dur: 0.3 * T + read });
      yield* wait(0.3 * T); // the look, before the first thread
      for (let i = 0; i < 3; i++) { foresee(read, lock); if (i < 2) yield* wait(gap); }
      yield* wait(read + lock + FLY + 0.25); // a held beat after the last bolt
      b.track = 0; b.slit = 0; b.gest = null;
      if (r < bursts - 1) yield* wait(0.3);
    }
    b.want = 0;
    yield* tween(b, { y: GY }, 0.8, E.inOutQuad);
    b.homeY = GY;
  }

  // ------------------------------------------------------------------ v2.0a: the Nova and the Serpent
  // Two spells it casts in every phase. The Nova is what a hero who reaches it meets: it comes down out
  // of the air and plants its staff. The Serpent is fire that goes into the floor and comes up alive.
  const AS = G.audio.synth;
  G.audio.define('novaIce', () => {
    AS.tone({ type: 'sine', f0: 150, f1: 46, dur: 0.32, vol: 0.42 });
    AS.noise({ dur: 0.36, vol: 0.3, type: 'highpass', f0: 4200, f1: 1800, q: 0.7 });
    AS.tone({ type: 'triangle', f0: 2400, f1: 3100, dur: 0.45, vol: 0.05 });
    AS.tone({ type: 'triangle', f0: 3300, f1: 2700, dur: 0.38, vol: 0.04, delay: 0.04 });
  });
  G.audio.define('novaBolt', () => {
    AS.tone({ type: 'sine', f0: 110, f1: 38, dur: 0.46, vol: 0.5 });
    AS.noise({ dur: 0.42, vol: 0.4, f0: 3000, f1: 600, q: 0.6 });
    AS.tone({ type: 'sawtooth', f0: 900, f1: 140, dur: 0.22, vol: 0.06 });
  });
  G.audio.define('crackle', () => {
    AS.noise({ dur: 0.05, vol: 0.11, type: 'highpass', f0: 5200, q: 0.6 });
    AS.tone({ type: 'square', f0: 1800 + Math.random() * 1400, dur: 0.025, vol: 0.022 });
  });
  G.audio.define('serpent', () => {
    AS.noise({ dur: 0.6, vol: 0.3, f0: 600, f1: 2400, q: 0.6, attack: 0.07 });
    AS.tone({ type: 'sawtooth', f0: 70, f1: 125, dur: 0.55, vol: 0.11, attack: 0.06 });
  });
  G.audio.vary.crackle = 3; G.audio.vary.serpent = 2;

  // The staff, held by hand for these two: a target pose that the staff follows on springs, so it
  // lags, overshoots a little and settles, instead of being set (stiff: how hard it is driven).
  function holdStaff(t, stiff) {
    const b = B.body;
    if (!b.spT || (b.spK || 0) < 0.02) { const s = staff(b.cast); b.sp = { hx: s.hx, hy: s.hy, tilt: s.tilt, vhx: 0, vhy: 0, vt: 0 }; }
    b.spT = t; b.spS = stiff || 1;
  }

  // Ice: frost spikes erupt in a front running out both ways from the staff. The front starts slow and
  // builds to full speed over its first quarter second, so a hero beside it has time to jump.
  function frostNova(x0, v) {
    const cw = 40, cells = [], acc = 0.24;
    const tAt = (r) => (r < v * acc / 2 ? Math.sqrt(2 * r * acc / v) : acc + (r - v * acc / 2) / v);
    for (const d of [-1, 1]) {
      for (let i = 0; i < 40; i++) {
        const r = 24 + i * cw, cx = x0 + d * r;
        if (cx < WL + 10 || cx > WR - 10) break;
        cells.push({ x: cx, at: tAt(r), h: 56 - Math.min(12, i * 0.8), seed: (i * 5 + (d > 0 ? 2 : 0)) % 7, d, up: false });
      }
    }
    const last = cells.reduce((m, c) => Math.max(m, c.at), 0);
    return H.add({
      kind: 'rime', layer: 'under', tint: ICE, cells, cw, hgt: 56, active: 0.22, x: x0,
      update() {
        for (const c of this.cells) {
          if (!c.up && this.t >= c.at) {
            c.up = true;
            if (c.seed % 2 === 0) G.fx.burst(c.x, FLOOR - 6, { n: 3, color: ICE.hot, speed: [90, 330], angle: -Math.PI / 2 + c.d * 0.5, spread: 1.1, life: [0.2, 0.45], kind: 'shard', size: [2, 5], grav: 900 });
            if (c.seed === 3) G.fx.dust(c.x, FLOOR, 1, { dir: c.d, speed: [30, 120], size: [6, 10], up: 40, a: 0.3, color: '200,230,250' });
          }
        }
        if (this.t > last + this.active + 0.5) this.dead = true;
      },
      hits(P) {
        for (const c of this.cells) {
          const e = this.t - c.at;
          if (e < 0 || e >= this.active) continue;
          // as high as its spikes are drawn, and only as far up as they have come (v2.1b, as in rime)
          const dx = Math.abs(P.x - c.x), up = Math.min(1, e / 0.045);
          if (dx >= cw / 2 + 5) continue;
          const tall = dx < 17 ? c.h : c.h * (0.58 + 0.05 * c.seed);
          if (FLOOR - P.y < tall * up - 8) { this.srcX = c.x; return true; }
        }
        return false;
      },
      draw(ctx) {
        // the glaze the front leaves behind it on the floor
        ctx.globalCompositeOperation = 'lighter';
        for (const d of [-1, 1]) {
          let reach = 0;
          for (const c of this.cells) if (c.d === d && this.t >= c.at) reach = Math.max(reach, Math.abs(c.x - this.x));
          if (reach <= 0) continue;
          const f = Math.max(0, 1 - Math.max(0, this.t - last) / 0.5);
          ctx.fillStyle = G.rgba(ICE.boss, 0.22 * f);
          ctx.fillRect(Math.min(this.x, this.x + d * reach), FLOOR - 3, reach, 5);
        }
        for (const c of this.cells) {
          const e = this.t - c.at;
          if (e < 0 || e > this.active + 0.36) continue;
          // up in a flash, then cracking and sinking back in splinters
          const up = Math.min(1, e / 0.045), gone = e < this.active ? 0 : (e - this.active) / 0.36;
          const h = c.h * up * (1 - 0.55 * gone), a = 1 - gone * gone;
          for (let s = -1; s <= 1; s++) {
            const sx = c.x + s * 13 + (c.seed - 3) * 1.4, sh = h * (s === 0 ? 1 : 0.58 + 0.05 * c.seed), lean = s * 6 + c.d * 4;
            ctx.fillStyle = G.rgba(ICE.boss, 0.7 * a);
            ctx.beginPath(); ctx.moveTo(sx - 9, FLOOR); ctx.lineTo(sx + lean, FLOOR - sh); ctx.lineTo(sx + 9, FLOOR); ctx.closePath(); ctx.fill();
            ctx.fillStyle = G.rgba(ICE.hot, 0.85 * a);
            ctx.beginPath(); ctx.moveTo(sx - 2.5, FLOOR); ctx.lineTo(sx + lean, FLOOR - sh); ctx.lineTo(sx + 4, FLOOR); ctx.closePath(); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  }

  // Lightning: a dome of it, burst out of the planted staff. It is far taller than it is wide, so the
  // way out is sideways, not up.
  const DOME_H = 1.7;
  function dome(x, R, tele) {
    return H.add({
      kind: 'blast', layer: 'under', tint: BOLT, x, y: FLOOR, r: R, tele, boom: 0.2, fired: false, arcs: null,
      update() {
        if (!this.fired && this.t >= this.tele) {
          this.fired = true;
          this.arcs = [];
          for (let i = 0; i < 6; i++) {
            const a = Math.PI * (0.08 + 0.84 * i / 5);
            this.arcs.push(boltPath(this.x, FLOOR - 70, this.x - Math.cos(a) * this.r, FLOOR - Math.sin(a) * this.r * DOME_H));
          }
          G.fx.burst(this.x, FLOOR - 40, { n: 24, color: BOLT.hot, speed: [200, 700], angle: -Math.PI / 2, spread: 3, life: [0.15, 0.4], kind: 'spark', size: [2, 3.5], grav: 500 });
          G.fx.ripple(this.x, FLOOR - 60, this.r * 1.6);
        }
        if (this.fired && this.t < this.tele + this.boom && Math.random() < 0.6) {
          const a = G.rand(0.05, Math.PI - 0.05);
          G.fx.spawn({ kind: 'spark', x: this.x - Math.cos(a) * this.r, y: FLOOR - Math.sin(a) * this.r * DOME_H, vx: G.rand(-200, 200), vy: G.rand(-200, 100), life: G.rand(0.08, 0.18), size: G.rand(1.2, 2.4), color: BOLT.hot, len: 0.05 });
        }
        this.srcX = this.x;
        if (this.t >= this.tele + this.boom + 0.3) this.dead = true;
      },
      hits(P) {
        if (!this.fired || this.t > this.tele + this.boom) return false;
        const q = P.box(), dx = Math.max(0, Math.abs(this.x - q.cx) - q.hw), dy = Math.max(0, FLOOR - (q.cy + q.hh));
        return (dx * dx) / ((this.r - 6) * (this.r - 6)) + (dy * dy) / ((this.r * DOME_H) * (this.r * DOME_H)) < 1;
      },
      draw(ctx) {
        const R = this.r, Rv = R * DOME_H, x = this.x;
        if (!this.fired) {
          // a spell's reach, which the hero could not otherwise see: the danger colour, filling
          const k = this.t / this.tele, late = k > 0.8 ? 0.5 + 0.5 * Math.sin(this.t * 55) : 0;
          ctx.fillStyle = G.rgba(DANGER, 0.05 + 0.05 * k + 0.07 * late);
          ctx.beginPath(); ctx.ellipse(x, FLOOR, R, Rv, 0, Math.PI, G.TAU); ctx.fill();
          ctx.fillStyle = G.rgba(DANGER, 0.16);
          ctx.beginPath(); ctx.ellipse(x, FLOOR, R * k, Rv * k, 0, Math.PI, G.TAU); ctx.fill();
          ctx.strokeStyle = G.rgba(DANGER, 0.45 + 0.4 * k); ctx.lineWidth = 2.5;
          ctx.setLineDash([14, 9]); ctx.lineDashOffset = -this.t * 60;
          ctx.beginPath(); ctx.ellipse(x, FLOOR, R, Rv, 0, Math.PI, G.TAU); ctx.stroke();
          ctx.setLineDash([]);
          return;
        }
        const f = G.clamp((this.t - this.tele) / (this.boom + 0.3), 0, 1), fade = 1 - f * f;
        const grow = 0.86 + 0.14 * Math.sqrt(Math.min(1, (this.t - this.tele) / this.boom));
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = G.rgba(BOLT.boss, 0.2 * fade);
        ctx.beginPath(); ctx.ellipse(x, FLOOR, R * grow, Rv * grow, 0, Math.PI, G.TAU); ctx.fill();
        ctx.strokeStyle = G.rgba(BOLT.boss, 0.75 * fade); ctx.lineWidth = 3 * fade + 1;
        ctx.beginPath(); ctx.ellipse(x, FLOOR, R * grow, Rv * grow, 0, Math.PI, G.TAU); ctx.stroke();
        for (const pts of this.arcs) drawBolt(ctx, pts, fade * 0.42); // (lightning without a white-out: the Magus stays readable inside it)
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  }

  // One nova. ice: sinks to the floor with the staff low, its head circling, frost creeping from its
  // feet; then a breath up, and the staff driven down. bolt: rises with the staff overhead, spinning
  // faster and faster as lightning crawls down to the floor around it; then the staff driven down.
  function* novaOne(kind, windup) {
    const b = B.body;
    face();
    B.novaEl = kind === 'ice' ? ICE : BOLT; setElem(B.novaEl); b.want = 1;
    const y0 = b.y, R = [0, 165, 175, 190][B.phase] + (K.hard() ? 10 : 0);
    if (kind === 'ice') {
      G.audio.play('frost');
      B.glaze = { x: b.x, r: 0, a: 1 };
      let e = 0;
      while (e < windup) {
        const dt = yield;
        e += dt;
        const k = Math.min(1, e / windup), a = e * 9;
        b.y = G.lerp(y0, FLOOR - 10, E.outCubic(Math.min(1, k * 1.5)));
        // (v2.5c: the motes sink to circle its feet, wide, with the frost)
        stance('nova-ice-sink', { hx: 30 + Math.cos(a) * 6, hy: -48 + Math.sin(a) * 4, tilt: 1.78 + Math.sin(a) * 0.16 }, { lean: 0.08 * Math.min(1, k * 2), orb: [1.35, 56] });
        B.glaze.x = b.x; B.glaze.r = 130 * E.outQuad(k);
        if (Math.random() < dt * 30) G.fx.burst(b.x + G.rand(-1, 1) * B.glaze.r, FLOOR - 3, { n: 1, color: ICE.hot, speed: [20, 90], angle: -Math.PI / 2, spread: 1, life: [0.2, 0.5], kind: 'shard', size: [2, 4] });
      }
      // a breath up: it rises slowing into the top, and hangs there a moment with the staff taken up
      // high in both hands, drawn back to drive down (v2.5c: the same 0.2 s, in two stages)
      const y1 = b.y;
      yield* act(0.2, (k, e) => {
        b.y = G.lerp(y1, FLOOR - 32, E.outQuad(Math.min(1, e / 0.15)));
        if (e < 0.12) stance('nova-ice-breath', { hx: 22, hy: -108, tilt: -0.3 }, { stiff: 2.6, two: 1, lean: -0.09, orb: [1.1, 20] });
        else stance('nova-ice-peak', { hx: 18, hy: -116, tilt: -0.42 }, { stiff: 2, two: 1, lean: -0.11, trem: 0.03, orb: [1.1, 20] });
      });
      b.y = FLOOR - 32;
      // and down
      stance('nova-ice-drive', { hx: 38, hy: -58, tilt: 0.04 }, { stiff: 6, two: 1, lean: 0.12, orb: [1.35, 56] });
      yield* tween(b, { y: FLOOR - 6 }, 0.08, E.inCubic);
      const sx = b.x + b.face * 30;
      frostNova(sx, ([0, 760, 820, 900][B.phase]) * (K.gentle() ? 0.88 : 1));
      G.audio.play('novaIce'); G.fx.shake(10); G.fx.stop(0.05);
      G.fx.thud(sx, FLOOR, 1.0, { col: ICE.boss });
      G.fx.shards(sx, FLOOR - 10, 9, ICE.boss, { angle: -Math.PI / 2, spread: 2.4, speed: [120, 420], size: [2, 5] });
      b.sq = 0.14;
    } else {
      dome(b.x + b.face * 10, R, windup + 0.1);
      let e = 0, spin = 0, crk = 0;
      while (e < windup) {
        const dt = yield;
        e += dt; crk -= dt;
        const k = Math.min(1, e / windup);
        b.y = G.lerp(y0, GY - 28, E.outCubic(k));
        spin += dt * (4 + 22 * k * k);
        // (v2.5c: one hand, the motes whirled tight and high round the hat)
        stance('nova-bolt-spin', { hx: 8, hy: -126, tilt: -0.2 + spin }, { stiff: 1.5, lean: -0.09 * k, orb: [0.55, -82] });
        if (crk <= 0) { crk = 0.11 - 0.06 * k; G.audio.play('crackle'); }
        // lightning crawls down out of the staff and earths itself at the edge of the dome
        if (Math.random() < dt * (3 + 16 * k)) {
          const o = tip(), ex = b.x + b.face * 10 + (Math.random() < 0.5 ? -1 : 1) * R * G.rand(0.85, 1);
          B.novaArcs.push({ pts: boltPath(o.x, o.y, ex, FLOOR), life: 0.1 });
          G.fx.burst(ex, FLOOR - 2, { n: 2, color: BOLT.hot, speed: [60, 220], angle: -Math.PI / 2, spread: 2, life: [0.1, 0.25], kind: 'spark', size: [1.5, 2.5] });
        }
      }
      // and down: the spin brought round to the floor
      b.sp.tilt = Math.atan2(Math.sin(b.sp.tilt), Math.cos(b.sp.tilt));
      stance('nova-bolt-drive', { hx: 38, hy: -58, tilt: 0.04 }, { stiff: 6, two: 1, lean: 0.12, orb: [0.9, 30] });
      yield* tween(b, { y: FLOOR - 6 }, 0.1, E.inCubic);
      G.audio.play('novaBolt'); G.audio.play('zap'); G.fx.shake(12); G.fx.stop(0.06);
      G.fx.thud(b.x + b.face * 30, FLOOR, 1.1, { col: BOLT.boss });
      b.sq = 0.16;
    }
    B.glaze && (B.glaze.fade = true);
    // it rocks back off the planted staff, which rings in its hands
    b.recV = (b.recV || 0) - b.face * 1.4;
    kick(0, -5, 0.1);
    yield* act(0.12, () => stance('nova-recoil', { hx: 38, hy: -58, tilt: 0.04 }, { stiff: 4, two: 0.8, lean: -0.04 }));
  }

  function* atkNova() {
    const b = B.body, P = G.player, T = K.T();
    B.novaPick = B.picks || 0;
    if (Math.abs(P.x - b.x) > 230 || Math.abs(P.y - b.y) > 170 || b.y < GY - 40) {
      // the hero is not near: it steps out of the air beside them
      let side = P.x < 640 ? 1 : -1;
      if (Math.abs(P.x + side * 130 - 640) > 560) side = -side;
      yield* blink(G.clamp(P.x + side * 130, WL + 70, WR - 70), GY);
    }
    face();
    const first = K.chance(0.5, 'dome') ? 'bolt' : 'ice', second = first === 'ice' ? 'bolt' : 'ice';
    const W1 = { ice: 0.85, bolt: 0.95 };
    yield* novaOne(first, W1[first] * T);
    if (B.phase >= 2) {
      // a second, of the other kind, hard on the first (harder still in the last phase)
      const tight = B.phase === 3;
      yield* wait(tight ? 0.08 : 0.28);
      yield* novaOne(second, (second === 'ice' ? (tight ? 0.5 : 0.65) : (tight ? 0.62 : 0.75)) * T);
    }
    // it leans on the staff a beat, then levers it out of the floor and floats back up
    yield* act(0.25, () => stance('nova-lean', { hx: 34, hy: -58, tilt: 0.1 }, { stiff: 1.6, two: 0.5, lean: 0.06 }));
    stance('nova-lift', { hx: 22, hy: -96, tilt: -0.1 }, { stiff: 2.2, lean: -0.06 });
    yield* tween(b, { y: GY }, 0.4, E.outCubic);
    if (B.phase === 3) {
      const el = B.novaEl;
      setElem(el === BOLT ? ICE : BOLT); b.want = 1;
      echo(el);
      yield* echoStance(el);
    }
  }

  // Fire: a serpent. It slithers along the floor in surges, up onto the platform the hero stands on,
  // and turns after them, but it cannot turn on the spot: jumping over it is the way past. A blade
  // can cut it (the long one takes two). If it is not cut down it bursts where it is.
  function serpent(x, dir, o) {
    const P = G.player;
    return H.add({
      kind: 'serpent', layer: 'over', tint: FIRE, x, gy: FLOOR, y: FLOOR - 13, vx: dir * 80, vy: 0, dir,
      r: o.big ? 18 : 14, slashable: true, once: true, hp: o.hp, life: o.life, rise: 0, trail: [{ x, y: FLOOR }],
      len: o.len, ph: G.rand(0, 6), plat: null, lastPool: x, stall: 0, out: 0, dying: false, flick: 0,
      update(dt) {
        this.rise = Math.min(1, this.rise + dt / 0.3);
        this.flick = Math.max(0, this.flick - dt * 5);
        if (this.dying) { this.out += dt; if (this.out > 0.4) this.dead = true; return; }
        this.life -= dt;
        // the slither: it pushes in surges, fast then slow, like a snake drawing itself along
        this.ph += dt * (o.big ? 6.5 : 8.5);
        const surge = 0.42 + 0.58 * Math.pow(Math.max(0, Math.sin(this.ph)), 1.4);
        const want = Math.abs(P.x - this.x) > 6 ? G.sign(P.x - this.x) : G.sign(this.vx) || this.dir;
        const max = o.speed * surge * Math.min(1, 0.3 + this.rise);
        if (this.stall > 0) { this.stall -= dt; this.vx = G.damp(this.vx, 0, 7, dt); }
        else {
          this.vx += want * (o.big ? 560 : 720) * dt;
          if (Math.abs(this.vx) > max) this.vx = G.damp(this.vx, G.sign(this.vx) * max, 6, dt);
        }
        this.x += this.vx * dt;
        if (this.x < WL + 18) { this.x = WL + 18; this.vx = Math.abs(this.vx) * 0.3; }
        if (this.x > WR - 18) { this.x = WR - 18; this.vx = -Math.abs(this.vx) * 0.3; }
        // the floor, or the platform the hero stands on once the head is under it
        let target = FLOOR, plat = null;
        const pp = P.plat;
        if (pp && !pp.gone && P.onGround && this.x > pp.x - 4 && this.x < pp.x + pp.w + 4) { target = pp.top; plat = pp; }
        else if (this.plat && !this.plat.gone && this.x > this.plat.x && this.x < this.plat.x + this.plat.w) { target = this.plat.top; plat = this.plat; }
        if (target < this.gy - 1) {
          // it rears up the side
          this.gy = G.damp(this.gy, target, 7, dt); this.vy = 0;
          if (this.gy - target < 3) { this.gy = target; this.plat = plat; }
        } else if (target > this.gy + 1) {
          // off the edge: it drops
          this.vy += 1900 * dt; this.gy = Math.min(target, this.gy + this.vy * dt);
          if (this.gy >= target) { this.gy = target; this.vy = 0; this.plat = plat; G.fx.burst(this.x, target - 4, { n: 6, color: FIRE.boss, speed: [60, 240], angle: -Math.PI / 2, spread: 2.4, life: [0.2, 0.45], size: [2, 5] }); }
        } else { this.gy = target; this.plat = plat; }
        this.y = this.gy - 13 - (target < this.gy - 1 ? 6 : 0);
        // the path the body follows
        const lp = this.trail[0];
        if (Math.abs(lp.x - this.x) + Math.abs(lp.y - this.gy) > 3) this.trail.unshift({ x: this.x, y: this.gy });
        if (this.trail.length > this.len * 4 + 6) this.trail.length = this.len * 4 + 6;
        this.srcX = this.x - this.vx * 0.05;
        if (Math.random() < dt * 30) {
          const q = this.trail[Math.floor(Math.random() * this.trail.length)];
          G.fx.spawn({ x: q.x + G.rand(-4, 4), y: q.y - G.rand(4, 16), vx: G.rand(-20, 20), vy: -G.rand(40, 140), life: G.rand(0.2, 0.5), size: G.rand(2, 4.5), color: FIRE.boss });
        }
        // the second phase: the long one leaves the floor burning behind it
        // (never at the hero's feet, where jumping over it lands them, nor beside another burning patch)
        const px = G.clamp(this.x - G.sign(this.vx) * 40, WL + 60, WR - 60);
        if (o.pools && o.big && this.gy >= FLOOR - 1 && Math.abs(this.x - this.lastPool) > 200 && Math.abs(px - P.x) > 200 && !H.list.some((h) => h.kind === 'pool' && !h.dead && Math.abs(h.x - px) < 200)) {
          this.lastPool = this.x;
          H.pool({ x: px, w: 92, tele: 0.55, active: 1.5, tint: FIRE });
        }
        if (this.life <= 0) this.burst();
      },
      // for the scripted dodger: the ground its head is heading for
      danger(Pl) {
        if (this.dying || Math.abs(this.gy - Pl.y) > 70) return null;
        return [this.x + this.vx * 0.25, this.r + 44, Math.max(0, Math.abs(Pl.x - this.x) - 40) / Math.max(140, Math.abs(this.vx))];
      },
      hits(Pl) { return !this.dying && this.rise > 0.6 && G.circleRect(this.x, this.y, this.r * 0.85, Pl.box()); },
      // touched the hero, or cut down: it comes apart in embers
      pop() {
        if (this.dying) return;
        this.dying = true; this.slashable = false;
        for (let i = 0; i < this.trail.length; i += 4) {
          const q = this.trail[i];
          G.fx.burst(q.x, q.y - 10, { n: 2, color: FIRE.boss, speed: [30, 160], angle: -Math.PI / 2, spread: 2.6, life: [0.25, 0.6], size: [2, 5], grav: -60 });
        }
        G.fx.dust(this.x, this.gy - 6, 3, { speed: [10, 60], size: [8, 14], life: [0.6, 1], up: 90, a: 0.38, color: '70,62,66' });
        G.audio.play('orbPop');
      },
      slash() {
        if (this.dying) return;
        this.hp--;
        if (this.hp <= 0) { this.pop(); return; }
        // the long one takes a cut, recoils, and comes on again
        this.stall = 0.45; this.vx = -G.sign(P.x - this.x) * 170; this.flick = 1;
        G.audio.play('orbPop'); G.fx.stop(0.04);
        G.fx.burst(this.x, this.y, { n: 10, color: FIRE.hot, speed: [100, 380], life: [0.15, 0.4], kind: 'spark', size: [2, 3.5] });
      },
      // left alone, it bursts where it is (in the last phase the long one splits in two instead)
      burst() {
        if (this.dying) return;
        if (o.split) {
          for (const d of [-1, 1]) serpent(G.clamp(this.x + d * 20, WL + 30, WR - 30), d, { len: 10, speed: 420, life: 2.3, hp: 1, pools: o.pools });
          G.audio.play('serpent'); G.fx.shake(5);
        } else {
          H.blast({ x: this.x, y: this.gy - 10, r: o.big ? 108 : 80, tele: 0.38, tint: FIRE, boom: 0.12 });
          // (a short one, in the second phase on, leaves its patch of burning floor where it bursts, as a fireball does)
          if (o.pools && !o.big && this.gy >= FLOOR - 1) H.pool({ x: G.clamp(this.x, WL + 60, WR - 60), w: 120, tele: 0.45, active: 2.2, tint: FIRE });
        }
        this.pop();
      },
      draw(ctx) {
        const n = this.len, gap = 11, pts = [];
        // walk back along the path, a point every gap
        let need = 0, acc = 0;
        for (let i = 0; i < this.trail.length && pts.length < n; i++) {
          if (i === 0) { pts.push(this.trail[0]); need = gap; continue; }
          const a = this.trail[i - 1], c = this.trail[i], d = Math.hypot(c.x - a.x, c.y - a.y);
          acc += d;
          while (acc >= need && pts.length < n) { const k = 1 - (acc - need) / Math.max(0.001, d); pts.push({ x: G.lerp(a.x, c.x, k), y: G.lerp(a.y, c.y, k) }); need += gap; }
        }
        const fade = this.dying ? Math.max(0, 1 - this.out / 0.4) : 1;
        const em = this.life < 0.6 && !this.dying ? 0.5 + 0.5 * Math.sin(this.t * 40) : 0; // it swells before it bursts
        ctx.save();
        if (this.rise < 1) { ctx.beginPath(); ctx.rect(-80, -400, G.W + 160, this.gy + 400 + 2); ctx.clip(); }
        const sink = (1 - this.rise) * 34;
        // a body of living coal: dark, a low burning glow round it, and seams of fire that pulse down its length
        const seg = [];
        for (let i = pts.length - 1; i >= 0; i--) {
          const q = pts[i], k = i / Math.max(1, n - 1);
          const wv = Math.sin(this.ph * 1.3 - i * 0.75) * (2 + 5 * k); // the slither runs down its length
          seg.push({ x: q.x, y: q.y - 11 * (1 - 0.5 * k) + wv + sink, r: (this.r - 2) * (1 - 0.72 * k) * (1 + 0.15 * em), k, i });
        }
        ctx.globalCompositeOperation = 'lighter';
        for (const g of seg) { ctx.fillStyle = G.rgba(FIRE.boss, (0.2 - 0.1 * g.k) * fade); ctx.beginPath(); ctx.arc(g.x, g.y, g.r * 1.6, 0, G.TAU); ctx.fill(); }
        ctx.globalCompositeOperation = 'source-over';
        for (const g of seg) { ctx.fillStyle = 'rgba(30,9,5,' + (0.95 * fade) + ')'; ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, G.TAU); ctx.fill(); }
        ctx.globalCompositeOperation = 'lighter';
        for (const g of seg) {
          const pulse = 0.5 + 0.5 * Math.sin(this.ph * 2 - g.i * 0.9);
          ctx.fillStyle = G.rgba(FIRE.boss, (0.5 + 0.3 * em) * (1 - 0.5 * g.k) * fade);
          ctx.beginPath(); ctx.ellipse(g.x, g.y - g.r * 0.25, g.r * 0.7, g.r * 0.32, 0, 0, G.TAU); ctx.fill();
          ctx.fillStyle = G.rgba(FIRE.hot, 0.42 * pulse * (1 - 0.6 * g.k) * fade);
          ctx.beginPath(); ctx.arc(g.x, g.y - g.r * 0.3, g.r * 0.26, 0, G.TAU); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        // the head: a dark skull in its own flame, jaw open, two eyes
        const hd = G.sign(this.vx) || this.dir, hx = this.x, hy = this.y + sink + Math.sin(this.ph * 1.3) * 2;
        const gape = 0.3 + 0.25 * Math.max(0, Math.sin(this.ph)) + 0.3 * this.flick;
        ctx.save();
        ctx.translate(hx, hy); ctx.scale(hd, 1);
        ctx.globalAlpha = fade;
        ctx.fillStyle = this.flick > 0.5 ? G.rgba(FIRE.hot, 1) : '#2a0d06';
        const r = this.r;
        ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.55); ctx.quadraticCurveTo(r * 0.2, -r * 1.05, r * 1.25, -r * 0.2 - gape * 4); ctx.lineTo(r * 0.3, -r * 0.05); ctx.lineTo(-r * 0.9, r * 0.25); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.2); ctx.lineTo(r * 0.3, r * 0.1); ctx.lineTo(r * 1.05, r * 0.25 + gape * 6); ctx.quadraticCurveTo(0, r * 0.75, -r * 0.7, r * 0.5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = G.rgba(FIRE.boss, 0.9); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.55); ctx.quadraticCurveTo(r * 0.2, -r * 1.05, r * 1.25, -r * 0.2 - gape * 4); ctx.stroke();
        D.glow(ctx, FIRE.boss, r * 0.25, -r * 0.4, 10, 0.8);
        ctx.fillStyle = G.rgba(FIRE.hot, 1);
        D.poly(ctx, [r * 0.05, -r * 0.48, r * 0.55, -r * 0.42, r * 0.12, -r * 0.3]); ctx.fill();
        ctx.restore();
        ctx.restore();
      },
    });
  }

  function* atkSerpent() {
    yield* reposition();
    const b = B.body, T = K.T();
    // the tell, in how the staff is swirled low in front: one slow wide turn is the one long serpent;
    // quick tight circles are a brood of short ones
    const brood = K.chance(0.5, 'brood');
    face(); setElem(FIRE); b.want = 1;
    const windup = (brood ? 0.8 : 0.95) * T, y0 = b.y;
    G.audio.play('charge', { dur: windup });
    let e = 0, a = -Math.PI / 2;
    while (e < windup) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / windup);
      a += dt * (brood ? 16 : G.TAU * 0.95 / windup);
      const amp = brood ? 0.17 : 0.45;
      b.y = y0 + 8 * E.outQuad(k);
      // (v2.5c) the whole body goes with the swirl: one long slow turn rolls through it, rising and
      // dipping; the brood's quick circles are made hunched low and tight, the staff shivering. Before
      // the staff goes down it is lifted (the last moment of the swirl), to drive it the harder.
      if (k > 0.88) { stance('serpent-lift', { hx: 30, hy: -90, tilt: 1.0 }, { stiff: 3.2, oy: -6, lean: -0.04, orb: [1.15, 30] }); }
      else if (brood) stance('serpent-brood', { hx: 30 + Math.cos(a) * 4, hy: -56 + Math.sin(a) * 3, tilt: 1.6 + Math.sin(a) * amp }, { stiff: 1.4, oy: 10, lean: 0.1 + 0.03 * k + Math.sin(a) * 0.01, trem: 0.02, orb: [1.15, 40] });
      else stance('serpent-coil', { hx: 30 + Math.cos(a) * 12, hy: -56 + Math.sin(a) * 8, tilt: 1.5 + Math.sin(a) * amp }, { stiff: 1.4, oy: 3 + Math.sin(a) * 5, lean: 0.04 + 0.03 * k + Math.sin(a) * 0.05, orb: [1.15, 30] });
      if (Math.random() < 0.7) { const o = tip(); G.fx.spawn({ x: o.x + G.rand(-3, 3), y: o.y + G.rand(-3, 3), vx: G.rand(-30, 30), vy: -G.rand(20, 80), life: G.rand(0.25, 0.5), size: G.rand(3, 6), color: FIRE.boss }); }
    }
    // the staff drives down at the floor in front, and the fire goes into the ground
    stance('serpent-drive', { hx: 42, hy: -52, tilt: 1.95 }, { stiff: 4.4, two: 1, oy: 7, lean: 0.12, orb: [1.2, 46] });
    yield* wait(0.09);
    const sx = G.clamp(b.x + b.face * 84, WL + 40, WR - 40);
    G.audio.play('serpent'); G.audio.play('whoosh'); G.fx.shake(6);
    G.fx.thud(sx, FLOOR, 0.8, { col: FIRE.boss });
    G.fx.burst(sx, FLOOR - 4, { n: 14, color: FIRE.boss, speed: [80, 360], angle: -Math.PI / 2, spread: 1.6, life: [0.3, 0.7], size: [3, 7], grav: -100 });
    b.recV = (b.recV || 0) - b.face * 1.0;
    b.sq = Math.max(b.sq || 0, 0.08); kick(0, 5, 0.15);
    const ph = B.phase, pools = ph >= 2, mine = [];
    if (!brood) mine.push(serpent(sx, b.face, { big: true, len: 22, speed: 330, life: 4.2, hp: 2, pools, split: ph === 3 }));
    else mine.push(serpent(sx, b.face, { len: 11, speed: 410, life: 3.2, hp: 1, pools }));
    yield* wait(0.12);
    stance('serpent-recoil', { hx: 34, hy: -62, tilt: 1.2 }, { stiff: 1.2, lean: -0.03, oy: 2 });
    if (brood) {
      const n = ph === 3 ? 3 : 2;
      for (let i = 1; i < n; i++) {
        yield* wait(0.26);
        const x2 = G.clamp(b.x + b.face * (60 + i * 40), WL + 40, WR - 40);
        G.audio.play('serpent');
        G.fx.burst(x2, FLOOR - 4, { n: 8, color: FIRE.boss, speed: [80, 300], angle: -Math.PI / 2, spread: 1.6, life: [0.3, 0.6], size: [3, 6], grav: -100 });
        mine.push(serpent(x2, b.face, { len: 11, speed: 410, life: 3.2 - 0.15 * i, hp: 1, pools }));
      }
    }
    // it conducts them: the staff follows the lead serpent until they are spent
    let t = 0;
    while (t < 3.4 && mine.some((s) => !s.dead && !s.dying)) {
      const dt = yield;
      t += dt;
      const s = mine.find((q) => !q.dead && !q.dying);
      if (!s) break;
      if (Math.abs(s.x - b.x) > 20) b.face = s.x > b.x ? 1 : -1;
      const dx = (s.x - b.x) * b.face, dy = s.y - (b.y - 70);
      stance('serpent-conduct', { hx: 32, hy: -62, tilt: G.clamp(Math.atan2(Math.max(10, dx), -dy), 0.7, 2.3) }, { stiff: 0.8, lean: 0.06 });
    }
    stance('serpent-rise', { hx: 24, hy: -80, tilt: 0.4 }, { stiff: 1.2, lean: -0.02 });
    yield* tween(b, { y: y0 }, 0.3, E.outQuad);
    yield* wait(0.3);
  }

  // ------------------------------------------------------------------ v2.1a: from the boss study
  // Built on what the study of Hollow Knight, the Souls games and Dead Cells found (docs/boss-study.md),
  // every one the Magus's own: the Spire (its answer to a hero who rides over its head, cast at where
  // the hero is), Motes (spells that hunt), the Blinkfall (pressure: it drops out of the air onto the
  // hero again and again, and ends dizzy and open) and the Glacier (a set-piece with one clear ask: a
  // wall of ice spears with a gap to find). Older spells gained a second form and a clear opening.
  G.audio.define('mgRune', () => {
    AS.tone({ type: 'sine', f0: 420, f1: 1240, dur: 0.5, vol: 0.07, attack: 0.2 });
    AS.tone({ type: 'triangle', f0: 630, f1: 1860, dur: 0.5, vol: 0.035, attack: 0.25 });
    AS.noise({ dur: 0.45, vol: 0.07, type: 'highpass', f0: 3000, f1: 6000, q: 0.5, attack: 0.2 });
  });
  G.audio.define('mgSpire', () => {
    AS.tone({ type: 'sine', f0: 92, f1: 34, dur: 0.5, vol: 0.48 });
    AS.noise({ dur: 0.5, vol: 0.36, f0: 2600, f1: 500, q: 0.6 });
    AS.tone({ type: 'triangle', f0: 1900, f1: 3600, dur: 0.3, vol: 0.045 });
  });
  G.audio.define('mgMote', () => {
    AS.tone({ type: 'sine', f0: 700, f1: 1020, dur: 0.18, vol: 0.05, attack: 0.03 });
    AS.noise({ dur: 0.12, vol: 0.04, type: 'highpass', f0: 4000, q: 0.6 });
  });
  G.audio.define('mgDrop', () => {
    AS.noise({ dur: 0.24, vol: 0.22, f0: 500, f1: 2400, q: 0.8, attack: 0.1 });
    AS.tone({ type: 'sine', f0: 240, f1: 120, dur: 0.24, vol: 0.06, attack: 0.08 });
  });
  G.audio.define('mgGlacier', () => {
    AS.noise({ dur: 0.9, vol: 0.22, type: 'lowpass', f0: 900, f1: 300, q: 0.8, attack: 0.1 });
    AS.tone({ type: 'sawtooth', f0: 55, f1: 48, dur: 0.9, vol: 0.05, attack: 0.15 });
    AS.tone({ type: 'triangle', f0: 2600, f1: 3100, dur: 0.6, vol: 0.03, delay: 0.1 });
  });
  G.audio.define('mgCoal', () => {
    AS.noise({ dur: 0.7, vol: 0.14, type: 'highpass', f0: 1600, f1: 3400, q: 0.5, attack: 0.25 });
    AS.tone({ type: 'sine', f0: 60, f1: 90, dur: 0.7, vol: 0.12, attack: 0.3 });
  });
  G.audio.vary.mgMote = 3;

  // A clear opening after a cast: the spell takes something out of it. The staff dips, it sags in the
  // air, and for a moment it is open (more damage) before it gathers itself.
  // ft (v2.5c): the throw's own follow-through, held for its first moments before the sag
  function* opening(dur, ft) {
    const b = B.body;
    if (b.hidden || !dur) return;
    b.exposed = true; b.want = 0;
    const y0 = b.y;
    let e = 0;
    while (e < dur) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / dur);
      if (ft && e < ft.t) stance(ft.name, ft.st, ft.o);
      // the sag: the staff droops first and the body follows it down a beat later, the hem last
      else stance('opening', { hx: 24, hy: -40, tilt: 0.85 + 0.1 * Math.sin(e * 3) }, { stiff: 0.8, lean: -0.06, oy: 2 + 2 * Math.sin(e * 2.4) });
      b.y = y0 + 12 * Math.sin(Math.min(1, k * 1.8) * Math.PI / 2); // sags, and hangs there
      if (Math.random() < dt * 10) { const o = tip(); G.fx.dust(o.x, o.y, 1, { speed: [10, 40], size: [5, 9], life: [0.4, 0.7], up: 50, a: 0.28, color: '70,64,84' }); }
    }
    b.exposed = false; unstance();
  }

  // A smouldering fireball, sunk into the floor where it came down: it smokes, glows faster and faster,
  // and bursts, wider than an ordinary one. What it will reach is marked (it is a thing thrown).
  function coal(x) {
    const T = K.T(), dur = 0.95 * T, R = 124, cx = G.clamp(x, WL + 40, WR - 40);
    G.audio.play('mgCoal');
    G.fx.thud(cx, FLOOR, 0.5, { col: COAL.boss });
    return H.add({
      kind: 'coal', layer: 'under', tint: COAL, x: cx, y: FLOOR - 10, dur, R,
      update(dt) {
        const k = this.t / this.dur;
        if (Math.random() < dt * 14) G.fx.dust(this.x + G.rand(-12, 12), FLOOR - 6, 1, { speed: [10, 40], size: [6, 12], life: [0.5, 1], up: 70, a: 0.35, color: '48,36,36' });
        if (Math.random() < dt * (6 + 30 * k)) G.fx.burst(this.x + G.rand(-10, 10), FLOOR - 6, { n: 1, color: COAL.hot, speed: [40, 160], angle: -Math.PI / 2, spread: 1, life: [0.2, 0.5], size: [1.5, 3], grav: -60 });
        if (this.t >= this.dur) {
          this.dead = true;
          H.blast({ x: this.x, y: this.y, r: this.R, tele: 0.1, tint: FIRE, dmg: 1 });
          if (B.phase >= 2) H.pool({ x: G.clamp(this.x, WL + 80, WR - 80), w: 160, tele: 0.45, active: 3, tint: FIRE });
        }
      },
      danger() { return [this.x, this.R + 18, this.dur - this.t + 0.1]; },
      draw(ctx) {
        const k = Math.min(1, this.t / this.dur), beat = 0.5 + 0.5 * Math.sin(this.t * (7 + 30 * k)), x = this.x, y = this.y, R = this.R;
        // its reach, above the floor
        ctx.save();
        ctx.beginPath(); ctx.rect(x - R - 10, y - R - 10, 2 * R + 20, FLOOR - (y - R - 10)); ctx.clip();
        ctx.fillStyle = G.rgba(DANGER, 0.04 + 0.08 * k + 0.06 * beat * k);
        ctx.beginPath(); ctx.arc(x, y, R, 0, G.TAU); ctx.fill();
        ctx.strokeStyle = G.rgba(DANGER, 0.35 + 0.45 * k); ctx.lineWidth = 2.5;
        ctx.setLineDash([14, 9]); ctx.lineDashOffset = -this.t * 60;
        ctx.beginPath(); ctx.arc(x, y, R, 0, G.TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        // the coal, half sunk: a crust with its cracks glowing, faster and faster
        ctx.fillStyle = '#1a0d0b';
        ctx.beginPath(); ctx.ellipse(x, FLOOR - 4, 20, 9, 0, Math.PI, G.TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        D.glow(ctx, COAL.boss, x, FLOOR - 6, 30 + 14 * k, (0.35 + 0.4 * beat) * (0.5 + 0.5 * k));
        ctx.strokeStyle = G.rgba(COAL.hot, 0.5 + 0.45 * beat); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x - 13, FLOOR - 5); ctx.lineTo(x - 4, FLOOR - 10); ctx.lineTo(x + 3, FLOOR - 6); ctx.lineTo(x + 12, FLOOR - 11); ctx.moveTo(x - 4, FLOOR - 10); ctx.lineTo(x - 2, FLOOR - 4); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  }

  // ---- the Spire: the answer to a hero who rides over its head (B.antiAir; the kit's B.above timer).
  // It looks up at them and lifts its staff straight up (held straight up, the staff always means: from
  // the sky). A rune opens in the air over the hero and follows them for a moment, then holds; a bolt
  // drives down the whole column while a spire of frost shoots up under it to meet it. Staying up there
  // is no answer: only leaving the column is. P2: a second rune opens as the first holds; P3: three.
  B.antiAir = 'spire';
  // over its head: above its hat, within about a body either side (on a ledge over it, or hopping on it)
  B.overhead = (P, b) => !b.hidden && b.alpha > 0.5 && Math.abs(P.x - b.x) < 95 && P.y < b.y - 125 && P.y > b.y - 520;
  const SPIRE_W = 96, RUNE_Y = 70;
  function spire(x0, tele, lockAt) {
    const P = G.player;
    return H.add({
      kind: 'spire', layer: 'over', tint: BOLT, x: x0, w: SPIRE_W, tele, lockAt, ry: RUNE_Y, fired: false, cracked: false, locked: false, pts: null,
      update(dt) {
        if (this.t < this.lockAt) this.x = G.damp(this.x, G.clamp(P.x, WL + 50, WR - 50), 7, dt);
        this.locked = this.t >= this.lockAt;
        if (!this.fired && this.t < this.tele && Math.random() < dt * (6 + 30 * this.t / this.tele)) {
          G.fx.burst(this.x + G.rand(-1, 1) * this.w * 0.35, FLOOR - 3, { n: 1, color: ICE.hot, speed: [20, 90], angle: -Math.PI / 2, spread: 0.8, life: [0.2, 0.45], kind: 'shard', size: [1.5, 3.5] });
        }
        if (!this.fired && this.t >= this.tele) {
          this.fired = true;
          this.pts = boltPath(this.x, this.ry, this.x, FLOOR);
          G.audio.play('mgSpire'); G.audio.play('zap');
          G.fx.shake(9); G.fx.stop(0.04);
          G.fx.thud(this.x, FLOOR, 0.9, { col: ICE.boss });
          G.fx.shards(this.x, FLOOR - 20, 10, ICE.boss, { angle: -Math.PI / 2, spread: 1.2, speed: [200, 600], size: [2, 5] });
          G.fx.lines(this.x, FLOOR - 8, 6, BOLT.hot, { r0: 14, speed: [300, 700] });
        }
        if (this.fired && !this.cracked && this.t >= this.tele + 0.22) {
          // the spire cracks and comes down in splinters
          this.cracked = true;
          G.audio.play('shard');
          for (let i = 0; i < 4; i++) G.fx.shards(this.x, FLOOR - 40 - i * 90, 3, ICE.boss, { speed: [40, 220], size: [2, 5], life: [0.4, 0.8] });
        }
        if (this.t >= this.tele + 0.62) this.dead = true;
        this.srcX = this.x;
      },
      // for the scripted dodger: once it holds, the column is unsafe
      danger() { return this.locked && this.t < this.tele + 0.2 ? [this.x, this.w / 2 + 18, this.tele - this.t] : null; },
      hits(Pl) { return this.fired && this.t < this.tele + 0.2 && Math.abs(Pl.x - this.x) < this.w / 2 + 7; },
      draw(ctx) {
        const x = this.x, w = this.w, ry = this.ry;
        if (!this.fired) {
          // the column, filling: a blow from above the hero, which they could not otherwise see coming
          strikeWarn(ctx, x, w, this.t / this.tele, this.t);
          const k = this.t / this.tele;
          ctx.fillStyle = G.rgba(ICE.boss, 0.22 * k);
          ctx.beginPath(); ctx.ellipse(x, FLOOR - 1, w * 0.4 * k, 4, 0, 0, G.TAU); ctx.fill();
        }
        // the rune in the air: it opens, turns, and once it holds it turns faster and tightens
        const op = this.fired ? Math.max(0, 1 - (this.t - this.tele) / 0.35) : E.outCubic(Math.min(1, this.t / 0.3));
        if (op > 0.01) {
          const R = 30 * op * (this.locked && !this.fired ? 0.86 + 0.06 * Math.sin(this.t * 30) : 1), sp = this.t * (this.locked ? 6 : 2);
          ctx.save(); ctx.translate(x, ry);
          ctx.globalCompositeOperation = 'lighter';
          D.glow(ctx, BOLT.boss, 0, 0, R * 1.5, 0.3 * op);
          ctx.strokeStyle = G.rgba(BOLT.boss, 0.75 * op); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.32, 0, 0, G.TAU); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(0, 0, R * 0.62, R * 0.2, 0, 0, G.TAU); ctx.stroke();
          ctx.strokeStyle = G.rgba(BOLT.hot, 0.6 * op); ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) { const a = sp + i * G.TAU / 6, c = Math.cos(a), s = Math.sin(a); ctx.moveTo(c * R * 0.62, s * R * 0.2); ctx.lineTo(c * R * 1.18, s * R * 0.38); }
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
          ctx.restore();
        }
        if (!this.fired) return;
        const e = this.t - this.tele, f = Math.max(0, 1 - e / 0.3);
        if (f > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = G.rgba(BOLT.boss, 0.14 * f); ctx.fillRect(x - w / 2, ry, w, FLOOR - ry);
          drawBolt(ctx, this.pts, f);
          ctx.globalCompositeOperation = 'source-over';
        }
        // the spire of frost: shoots up in a few frames, cracks, and sinks back in pieces
        const up = E.outCubic(Math.min(1, e / 0.09)), gone = Math.max(0, (e - 0.22) / 0.4), a = 1 - gone;
        if (a <= 0) return;
        const top = FLOOR - (FLOOR - ry - 40) * up * (1 - 0.45 * gone * gone);
        const segs = 5, H0 = FLOOR - top;
        for (let i = 0; i < segs; i++) {
          // once cracked, the pieces part and fall a little behind one another
          const y1 = FLOOR - H0 * i / segs, y2 = FLOOR - H0 * (i + 1) / segs, drop = gone * gone * 60 * (i + 1) * 0.5, jx = gone * ((i % 2) * 2 - 1) * 5 * i;
          const w1 = 25 * (1 - i / segs) + 4, w2 = 25 * (1 - (i + 1) / segs) + (i === segs - 1 ? 0 : 4);
          ctx.fillStyle = G.rgba(ICE.boss, 0.62 * a);
          D.poly(ctx, [x + jx - w1, y1 + drop, x + jx - w2, y2 + drop + (gone ? 3 : 0), x + jx + w2, y2 + drop + (gone ? 3 : 0), x + jx + w1, y1 + drop]); ctx.fill();
          ctx.fillStyle = G.rgba(ICE.hot, 0.7 * a);
          D.poly(ctx, [x + jx - w1 * 0.25, y1 + drop, x + jx - w2 * 0.2, y2 + drop, x + jx + w2 * 0.3, y2 + drop, x + jx + w1 * 0.35, y1 + drop]); ctx.fill();
        }
        // splinters standing out of its sides
        ctx.fillStyle = G.rgba(ICE.boss, 0.5 * a);
        for (const [q, d, l] of [[0.18, -1, 26], [0.34, 1, 20], [0.52, -1, 16], [0.7, 1, 12]]) {
          const y = FLOOR - H0 * q + gone * gone * 40, ww = 25 * (1 - q) + 4;
          D.poly(ctx, [x + d * ww * 0.8, y + 7, x + d * (ww + l * up), y - 10 - l * 0.4, x + d * ww * 0.8, y - 5]); ctx.fill();
        }
      },
    });
  }
  function* atkSpire() {
    const b = B.body, P = G.player, T = K.T();
    const n = B.phase === 3 ? 3 : B.phase === 2 ? 2 : 1;
    face(); setElem(BOLT); b.want = 1;
    b.track = 1; // it looks up at the hero
    G.audio.play('mgRune');
    // it sinks a touch, and the staff goes straight up
    const gather = 0.34 * T, y0 = b.y;
    let e = 0;
    while (e < gather) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / gather);
      b.y = y0 + 7 * E.outQuad(k);
      stance('spire-gather', { hx: 10, hy: -116 - 8 * k, tilt: -0.1 }, { stiff: 1.6, lean: -0.1 * k, oy: 4 * k, orb: [0.7, -70] });
    }
    const runes = [];
    for (let i = 0; i < n; i++) {
      const tele = (i ? 0.62 : 0.8) * T, lockAt = tele * 0.55;
      runes.push(spire(P.x, tele, lockAt));
      // a jab at the sky for each
      b.recV = (b.recV || 0) + b.face * 0.4;
      kick(0, -6, -0.05);
      e = 0;
      while (e < (i < n - 1 ? lockAt + 0.04 : tele + 0.1)) {
        const dt = yield;
        e += dt;
        if (e < 0.09) stance('spire-jab', { hx: 8, hy: -138, tilt: -0.04 }, { stiff: 3.2, lean: -0.15, oy: -6, orb: [0.7, -70] });
        else stance('spire-hold', { hx: 10, hy: -126, tilt: -0.08 + Math.sin(e * 30) * 0.03 }, { stiff: 1.4, lean: -0.1, oy: -3, orb: [0.7, -70] });
      }
    }
    while (runes.some((r) => !r.fired && !r.dead)) yield;
    kick(0, 8, 0.08);
    b.track = 0;
    yield* opening([0, 0.5, 0.42, 0.36][B.phase]);
  }

  // ---- Motes: spells that hunt. Motes gather and circle it, then leave one by one and hunt the hero.
  // Which kind is told by the staff before they leave. Held level and turning slowly, the motes circling
  // wide and slow: ice, slow hunters that splinter when cut (the splinters fly on away from the blade),
  // and go out after a few seconds. Held upright and rattling, the motes whirling tight and fast:
  // lightning, which darts in over the hero's head, stops, and strikes the floor below itself.
  // P2: more. P3: five, ice and lightning in turn, the staff slanted between the two holds.
  function moteHunt(el, o) {
    const P = G.player, bolt = el === BOLT;
    return H.add({
      kind: 'mote', layer: 'over', tint: el, el, x: B.body.x, y: B.body.y - 70, vx: 0, vy: 0, r: bolt ? 9 : 12,
      slashable: false, once: true, a0: o.a0, rel: o.rel, life: bolt ? 2.4 : o.life, state: 'orbit', out: 0, ht: 0, ct: 0,
      struck: false, tele: o.tele, speed: o.speed, R: o.R, spin: o.spin, trail: [], pts: null, rise: 0,
      update(dt) {
        if (this.state === 'gone') { this.out += dt; if (this.out > 0.3) this.dead = true; return; }
        const bb = B.body;
        if (this.state === 'orbit') {
          this.rise = Math.min(1, this.rise + dt / 0.35);
          const a = this.a0 + this.t * this.spin, R = this.R * (0.4 + 0.6 * this.rise);
          this.x = bb.x + Math.cos(a) * R; this.y = bb.y - 70 + Math.sin(a) * R * 0.42;
          if (bb.hidden || B.staggered) { this.fade(); return; }
          if (this.t >= this.rel) {
            // it leaves along its orbit, then turns after the hero
            this.state = 'hunt'; this.slashable = true;
            this.vx = -Math.sin(a) * R * this.spin; this.vy = Math.cos(a) * R * 0.42 * this.spin;
            G.audio.play('mgMote');
            G.fx.burst(this.x, this.y, { n: 5, color: el.boss, speed: [40, 160], life: [0.15, 0.35], kind: 'spark', size: [1.5, 3] });
          }
          return;
        }
        this.ht += dt;
        if (this.state === 'hunt') {
          if (!bolt) {
            const want = Math.atan2(P.y - 26 - this.y, P.x - this.x), cur = Math.atan2(this.vy, this.vx);
            const na = cur + G.clamp(G.angDiff(cur, want), -2.3 * dt, 2.3 * dt);
            const s = G.damp(Math.hypot(this.vx, this.vy), this.speed, 3, dt);
            this.vx = Math.cos(na) * s; this.vy = Math.sin(na) * s;
          } else {
            // it darts for a point over the hero's head, in surges: up to that height first, then across
            // (so it never cuts through at the hero's own height)
            const tx = G.clamp(P.x, WL + 30, WR - 30), ty = Math.max(70, P.y - 165);
            const dx = tx - this.x, dy = ty - this.y;
            const surge = 0.55 + 0.45 * Math.max(0, Math.sin(this.ht * 13)), climb = dy < -40 ? 0.35 : 1;
            const wx = G.sign(dx) * Math.min(Math.abs(dx) * 5, this.speed) * surge * climb, wy = G.clamp(dy * 6, -this.speed * 0.8, this.speed * 0.8);
            this.vx = G.damp(this.vx, wx, 9, dt); this.vy = G.damp(this.vy, wy, 9, dt);
            if ((Math.abs(dx) < 30 && Math.abs(dy) < 34) || this.ht > 1.5) { this.state = 'hold'; G.audio.play('crackle'); }
          }
          this.x += this.vx * dt; this.y += this.vy * dt;
          if (this.y > FLOOR - this.r - 4) { this.y = FLOOR - this.r - 4; this.vy = Math.min(0, this.vy); }
          this.x = G.clamp(this.x, WL + 10, WR - 10);
          this.life -= dt;
          if (this.life <= 0) this.fade();
        } else if (this.state === 'hold') {
          // it stops, crackles, and strikes the floor below itself
          this.ct += dt;
          this.vx = G.damp(this.vx, 0, 22, dt); this.vy = G.damp(this.vy, 0, 22, dt);
          this.x += this.vx * dt; this.y += this.vy * dt;
          if (!this.struck && Math.random() < dt * 30) G.fx.spawn({ kind: 'spark', x: this.x + G.rand(-12, 12), y: this.y + G.rand(-12, 12), vx: G.rand(-160, 160), vy: G.rand(-160, 160), life: G.rand(0.05, 0.12), size: G.rand(1.2, 2), color: BOLT.hot, len: 0.04 });
          if (!this.struck && this.ct >= this.tele) {
            this.struck = true; this.slashable = false;
            this.pts = boltPath(this.x, this.y, this.x, FLOOR);
            strikeFx(this.x);
          }
          if (this.ct >= this.tele + 0.24) this.fade();
        }
        this.srcX = this.x - this.vx * 0.05;
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > 7) this.trail.length = 7;
      },
      fade() { if (this.state !== 'gone') { this.state = 'gone'; this.slashable = false; this.out = 0; } },
      pop() {
        if (this.state === 'gone') return;
        G.fx.burst(this.x, this.y, { n: 8, color: el.boss, speed: [60, 220], life: [0.2, 0.45], kind: 'spark', size: [2, 3] });
        this.fade();
      },
      slash() {
        if (this.state === 'gone' || this.state === 'orbit') return;
        G.audio.play('orbPop'); G.fx.stop(0.03);
        if (!bolt) {
          // it splinters, and the splinters fly on away from the blade
          G.audio.play('shard');
          const a = Math.atan2(this.y - (P.y - 26), this.x - P.x);
          for (const k of [-0.45, 0, 0.45]) H.orb(this.x, this.y, Math.cos(a + k) * 430, Math.sin(a + k) * 430, { r: 5, tint: ICE, life: 0.8, slashable: false });
          G.fx.shards(this.x, this.y, 8, ICE.boss, { speed: [80, 300], size: [2, 4] });
        }
        this.pop();
      },
      danger() {
        if (bolt && this.state === 'hold' && this.ct < this.tele + 0.13) return [this.x, 26 + 18, Math.max(0, this.tele - this.ct)];
        return null;
      },
      hits(Pl) {
        if (this.state === 'gone' || this.state === 'orbit') return false;
        if (bolt && this.struck) return this.ct < this.tele + 0.13 && Math.abs(Pl.x - this.x) < 26 + 7 && Pl.y > this.y;
        return G.circleRect(this.x, this.y, this.r * 0.75, Pl.box());
      },
      draw(ctx) {
        const a = this.state === 'gone' ? Math.max(0, 1 - this.out / 0.3) : this.state === 'orbit' ? this.rise : 1;
        if (a <= 0.01) return;
        if (this.state === 'hold' && !this.struck) {
          // where it will strike: a narrow column under it, filling
          const k = Math.min(1, this.ct / this.tele), late = k > 0.75 ? 0.5 + 0.5 * Math.sin(this.ct * 55) : 0;
          const g = ctx.createLinearGradient(0, this.y, 0, FLOOR);
          g.addColorStop(0, G.rgba(DANGER, 0.02)); g.addColorStop(1, G.rgba(DANGER, 0.1 + 0.12 * k + 0.12 * late));
          ctx.fillStyle = g; ctx.fillRect(this.x - 26, this.y, 52, FLOOR - this.y);
          ctx.strokeStyle = G.rgba(DANGER, 0.5 + 0.4 * k); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(this.x, FLOOR - 1, 26, 7, 0, 0, G.TAU); ctx.stroke();
          ctx.fillStyle = G.rgba(DANGER, 0.35);
          ctx.beginPath(); ctx.ellipse(this.x, FLOOR - 1, 26 * k, 7 * k, 0, 0, G.TAU); ctx.fill();
        }
        if (this.struck && this.pts) {
          const f = Math.max(0, 1 - (this.ct - this.tele) / 0.24);
          ctx.globalCompositeOperation = 'lighter'; drawBolt(ctx, this.pts, f); ctx.globalCompositeOperation = 'source-over';
        }
        // a short tail of light behind a hunting mote
        if (this.state !== 'orbit' && this.trail.length > 2) {
          ctx.strokeStyle = G.rgba(el.boss, 0.35 * a); ctx.lineWidth = this.r * 0.9; ctx.lineCap = 'round';
          ctx.beginPath(); this.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
        }
        const s = (bolt ? 1.25 : 1.6) * (this.state === 'hold' ? 1 + 0.15 * Math.sin(this.ct * 50) : 1);
        mote(ctx, el, this.x, this.y, s, a);
        // the danger colour at its heart: it is a thing to avoid
        ctx.fillStyle = G.rgba(DANGER, 0.55 * a);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.32, 0, G.TAU); ctx.fill();
      },
    });
  }
  function* atkMotes() {
    yield* reposition();
    const b = B.body, T = K.T(), ph = B.phase;
    const mixed = ph === 3, bolt = !mixed && K.chance(0.5, 'bolt');
    const n = (ph === 1 ? 3 : ph === 2 ? 4 : 5) + (K.hard() ? 1 : 0);
    const els = [];
    for (let i = 0; i < n; i++) els.push(mixed ? (i % 2 ? BOLT : ICE) : bolt ? BOLT : ICE);
    face(); setElem(bolt ? BOLT : ICE); b.want = 1;
    B.moteEl = bolt ? BOLT : ICE;
    const windup = 0.85 * T, gapT = bolt ? [0, 0.46, 0.36, 0.3][ph] : mixed ? 0.38 : 0.42, slow = K.gentle() ? 0.88 : 1;
    const mine = els.map((el, i) => moteHunt(el, {
      a0: i * G.TAU / n, rel: windup + i * gapT,
      R: el === BOLT ? 44 : 82, spin: (el === BOLT ? 8.5 : 1.9) * (mixed ? 0.7 : 1),
      speed: (el === BOLT ? 540 : ph === 3 ? 162 : 150) * slow, life: 4.2, tele: [0, 0.52, 0.46, 0.42][ph] * T,
    }));
    G.audio.play('charge', { dur: windup });
    let e = 0;
    const send = windup + (n - 1) * gapT + 0.15;
    while (e < send) {
      const dt = yield;
      e += dt;
      if (e < windup) {
        // the tell: level and turning slowly (ice), upright and rattling (lightning), slanted between (both)
        // (v2.5c) and the body with it: for ice it sways slow and low with the turning staff; for
        // lightning it draws itself up tall and the staff rattles (a steady rattle now, not a random one);
        // for both, a half crouch that rocks between the two
        const gk = Math.min(1, e / 0.18); // (a quick gather into the hold)
        if (bolt) stance('motes-bolt', { hx: 12 + Math.sin(e * 53) * 1.5, hy: -112 + Math.sin(e * 61) * 2, tilt: -0.08 + Math.sin(e * 40) * 0.06 }, { stiff: 2.4, lean: -0.08 * gk, oy: -10 * gk, trem: 0.01 });
        else if (mixed) stance('motes-mixed', { hx: 22, hy: -84, tilt: 0.72 + Math.sin(e * 3) * 0.18 }, { stiff: 1.2, lean: -0.02 + Math.sin(e * 3) * 0.04, oy: 4 * gk });
        else stance('motes-ice', { hx: 32, hy: -66, tilt: 1.45 + Math.sin(e * 2.2) * 0.35 }, { stiff: 1.0, lean: -0.03 + Math.sin(e * 2.2) * 0.04, oy: 3 * gk + Math.sin(e * 2.2) * 2 });
      } else {
        // then it sends them, a flick of the staff after each as it leaves
        const q = (e - windup) / gapT, f = q - Math.floor(q);
        if (f < 0.3) stance('motes-send', { hx: 38, hy: -76, tilt: 1.65 }, { stiff: 4, lean: 0.08, oy: 1 });
        else stance('motes-return', { hx: 30, hy: -78, tilt: 1.05 }, { stiff: 1.6, lean: 0.03 });
      }
    }
    // it watches them hunt
    let t = 0;
    while (t < 4.4 && mine.some((m) => !m.dead && m.state !== 'gone')) {
      const dt = yield;
      t += dt;
      face();
      stance('motes-watch', { hx: 30, hy: -70, tilt: 1.2 }, { stiff: 0.9, lean: 0.03 });
    }
    unstance();
    yield* opening([0, 0.6, 0.5, 0.45][ph]);
  }

  // ---- the Blinkfall: pressure that comes to the hero. It steps out of the air and drops on them, staff
  // first, again and again (two, three, four times by phase). Before each, its robe flickers where it
  // will come out: right over the hero, it drops straight down; off to one side, it comes down at a
  // slant onto them. After the last it is left dizzy, leaning on its staff driven into the floor: a long
  // time to punish, unusual for it.
  function surfaceAt(x) {
    const P = G.player, pp = P.plat;
    if (pp && !pp.gone && P.onGround && x > pp.x - 10 && x < pp.x + pp.w + 10 && pp.top < FLOOR - 8) return pp.top;
    return FLOOR;
  }
  function drawFlicker(ctx, g) {
    // the cloth tears into being in bands that do not yet line up
    const a = g.a * (0.72 + 0.28 * Math.sin(g.t * 47) * Math.sin(g.t * 23));
    if (a <= 0.02) return;
    const col = G.pal().boss;
    // a cold seam of light where it will step through, and its two eyes, first of all
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    D.glow(ctx, BOLT.boss, g.x, g.y - 70, 70, 0.22 * a);
    ctx.strokeStyle = G.rgba(BOLT.hot, 0.5 * a); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(g.x, g.y - 175); ctx.lineTo(g.x + Math.sin(g.t * 37) * 3, g.y - 80); ctx.lineTo(g.x, g.y + 8); ctx.stroke();
    D.glow(ctx, BOLT.boss, g.x + g.face * 6.5, g.y - 108, 12, 0.9 * a);
    ctx.restore();
    for (let i = 0; i < 4; i++) {
      const y0 = -170 + i * 46, jx = Math.sin(g.t * 31 + i * 2.3) * 7 * (1 - g.a);
      ctx.save();
      ctx.translate(g.x + jx, g.y);
      ctx.beginPath(); ctx.rect(-60, y0, 120, 44); ctx.clip();
      ctx.scale(g.face, 1);
      ctx.globalAlpha = Math.min(1, Math.max(0, a) * (0.75 + 0.25 * Math.sin(g.t * 19 + i)));
      ctx.fillStyle = '#0d1030';
      D.poly(ctx, [-15, -95, 15, -95, 11, -64, 15, -44, 22, -22, 29, -6, 21, 5, 15, -7, 8, 7, 1, -6, -6, 6, -12, -7, -19, 4, -28, -9, -21, -30, -14, -46, -10, -64]);
      ctx.fill();
      ctx.strokeStyle = G.rgba(col, 0.95); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#141a52';
      ctx.beginPath(); ctx.ellipse(1, -118, 31, 6.5, -0.08, 0, G.TAU); ctx.fill(); ctx.stroke();
      D.poly(ctx, [-14, -119, -12, -137, -17, -151, -28, -164, -38, -160, -24, -155, -11, -157, 2, -143, 13, -119]); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  function* atkBlink() {
    const b = B.body, P = G.player, T = K.T(), ph = B.phase;
    const n = ph + 1;
    setElem(BOLT); b.want = 1;
    // it sinks a touch, then draws itself up tall, staff upright, and is gone
    yield* act(0.24 * T, (k) => (k < 0.35 ? stance('blink-dip', { hx: 18, hy: -80, tilt: 0.1 }, { stiff: 2, lean: 0.04, oy: 5 }) : stance('blink-tall', { hx: 10, hy: -122, tilt: 0 }, { stiff: 1.8, lean: -0.06, oy: -9, orb: [0.6, -40] })));
    let surf = FLOOR;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      G.audio.play('blink'); puff(b.x, b.y - 50, BOLT.boss);
      yield* tween(b, { alpha: 0 }, 0.09);
      b.hidden = true;
      // where it will come out: over the hero, or off to the open side
      const slant = K.chance(ph === 1 ? 0.35 : 0.5, 'slant');
      let side = (P.x < 640 ? 1 : -1) * (G.rng() < 0.75 ? 1 : -1);
      const tele = (i === 0 ? 0.62 : ph === 3 ? 0.44 : 0.5) * T, lockAt = tele * 0.62;
      const g = { x: P.x, y: FLOOR - 230, face: 1, a: 0, t: 0 };
      B.flick = g;
      // (for the scripted dodger: where it will land, once that is settled)
      const mark = H.add({ kind: 'dropmark', layer: 'under', x: P.x, lockd: false, left: 1, update() { }, danger() { return this.lockd ? [this.x, 76, this.left] : null; } });
      let e = 0, lx = G.clamp(P.x, WL + 50, WR - 50);
      while (e < tele) {
        const dt = yield;
        e += dt; g.t += dt;
        if (e < lockAt) { lx = G.damp(lx, G.clamp(P.x, WL + 50, WR - 50), 10, dt); surf = surfaceAt(lx); }
        if (lx + side * 150 < WL + 60 || lx + side * 150 > WR - 60) side = -side; // (never out into a wall)
        g.x = slant ? lx + side * 150 : lx; g.y = surf - (slant ? 190 : 230);
        g.face = slant ? -side : (P.x >= g.x ? 1 : -1);
        g.a = 0.3 + 0.65 * Math.min(1, e / tele);
        if (Math.random() < dt * 22) G.fx.spawn({ kind: 'spark', x: g.x + G.rand(-24, 24), y: g.y - G.rand(10, 160), vx: G.rand(-90, 90), vy: G.rand(-90, 90), life: G.rand(0.06, 0.14), size: G.rand(1.2, 2), color: BOLT.hot, len: 0.04 });
        mark.x = lx; mark.lockd = e >= lockAt; mark.left = tele - e + 0.45;
      }
      B.flick = null;
      // out of the flicker, the staff already raised to drive down
      b.x = g.x; b.y = g.y; b.face = g.face; b.homeY = b.y; b.hidden = false;
      b.tqf = b.face; b.tqP = 1; // (it arrives facing its way: no turn)
      puff(b.x, b.y - 50, BOLT.boss);
      // (v2.5c) both hands on it: straight up overhead to drive straight down, or slanted like a lance
      // for the dive in at an angle
      if (slant) stance('blink-lance', { hx: 22, hy: -122, tilt: 0.55 }, { stiff: 2.6, two: 1, lean: 0.12, oy: -4 });
      else stance('blink-raise', { hx: 12, hy: -134, tilt: 0 }, { stiff: 2.6, two: 1, lean: -0.04, oy: -4 });
      yield* tween(b, { alpha: 1 }, 0.07);
      // a breath at the top: it draws up, and drops
      const hang = 0.13, y0 = b.y;
      e = 0;
      while (e < hang) { const dt = yield; e += dt; b.y = y0 - 12 * E.outQuad(Math.min(1, e / hang)); }
      G.audio.play('mgDrop');
      stance(slant ? 'blink-dive' : 'blink-drop', { hx: 22, hy: -66, tilt: slant ? 0.4 : 0.05 }, { stiff: 4, two: 1, lean: slant ? 0.32 : 0.06 });
      const fall = H.add({ kind: 'fall', x: b.x, update() { this.x = b.x; this.srcX = b.x - b.face * 20; }, hits(Pl) { return G.rectsOverlap(Pl.box(), { cx: b.x, cy: b.y - 54, hw: 24, hh: 56 }); } });
      const sx = b.x, sy = b.y, ty = surf - 6;
      let vy = 260;
      while (b.y < ty) {
        const dt = yield;
        vy += 5400 * dt; b.y = Math.min(ty, b.y + vy * dt);
        const k = G.clamp((b.y - sy) / Math.max(1, ty - sy), 0, 1);
        b.x = G.lerp(sx, lx, k);
        if (Math.random() < 0.6) G.fx.spawn({ kind: 'spark', x: b.x + G.rand(-14, 14), y: b.y - G.rand(20, 110), vx: G.rand(-40, 40), vy: -G.rand(80, 240), life: G.rand(0.08, 0.18), size: G.rand(1.2, 2.2), color: BOLT.hot, len: 0.05 });
      }
      fall.dead = true; mark.dead = true;
      // the staff meets the floor
      K.crush(b.x, ty - 30, 46, 34, 1);
      G.audio.play('slam'); G.audio.play('zap');
      G.fx.shake(last ? 13 : 9); G.fx.stop(last ? 0.07 : 0.045);
      G.fx.thud(b.x + b.face * 10, ty + 6, last ? 1.3 : 0.9, { col: BOLT.boss });
      G.fx.lines(b.x, ty - 6, 6, BOLT.hot, { r0: 12, speed: [300, 650] });
      b.sq = 0.22;
      b.recV = (b.recV || 0) - b.face * (slant ? 1.6 : 0.8);
      kick(0, -6, slant ? -0.2 : 0.06);
      if (last && ty >= FLOOR - 7) for (const d of [-1, 1]) H.shockwave(b.x + d * 26, d, 560, 38, BOLT);
      if (!last) {
        // it pulls the staff free, hard, and is gone again (a beat bowed over it first)
        yield* act(ph === 3 ? 0.12 : 0.2, (k, e) => (e < 0.05 ? stance('blink-impact', { hx: 22, hy: -60, tilt: 0.1 }, { stiff: 3, two: 1, lean: 0.1, oy: 4 }) : stance('blink-pull', { hx: 14, hy: -104, tilt: -0.06 }, { stiff: 3, lean: -0.08, oy: -5 })));
      }
    }
    // dizzy, leaning on the staff driven into the floor
    B.dizzy = true; B.spin = 0.35; b.want = 0;
    b.exposed = true;
    stance('blink-dizzy', { hx: 30, hy: -40, tilt: 0.28 }, { stiff: 1.1, oy: 3, orb: [0.8, -66] });
    const dz = [0, 1.7, 1.5, 1.3][ph] * (K.gentle() ? 1.15 : 1);
    let e = 0;
    while (e < dz) {
      const dt = yield;
      e += dt;
      b.leanT = 0.22 + Math.sin(e * 4.6) * 0.07; // it sways on the staff
      b.y = surf - 6 + Math.sin(e * 2.3) * 2;
      if (Math.random() < dt * 9) {
        const a = e * 6 + G.rand(0, 6);
        G.fx.spawn({ kind: 'spark', x: b.x + Math.cos(a) * 24, y: b.y - 132 + Math.sin(a) * 6, vx: -Math.sin(a) * 60, vy: Math.cos(a) * 20, life: G.rand(0.2, 0.4), size: G.rand(1.2, 2), color: BOLT.hot, len: 0.03 });
      }
    }
    b.exposed = false; B.dizzy = false;
    // it wrenches the staff out of the floor and rises
    G.audio.play('whoosh');
    stance('blink-wrench', { hx: 14, hy: -106, tilt: -0.1 }, { stiff: 3, lean: -0.1, oy: -3 });
    kick(0, -5, -0.1);
    const hy = surf - HOVER;
    yield* tween(b, { y: hy }, 0.36, E.outCubic);
    b.homeY = hy; unstance(); B.spin = 1;
  }

  // ---- the Glacier: a set-piece with one ask. A wall of ice spears grows out of one wall of the arena
  // and sweeps across it from the top of the screen to the floor, with one gap in it. The staff points
  // at where the gap is while the wall grows: held low, the gap is at the floor (stay down: a platform is
  // no help); held up and level, it is at the height of a jump, or a platform. A dash goes through too.
  // P2: a second wall comes from the other side. P3: the first wall's gap moves as it comes, from where
  // the staff first pointed to where it ended.
  const GAP = { low: [FLOOR - 100, FLOOR + 20], high: [FLOOR - 285, FLOOR - 78] };
  function glacier(dir, gA, gB, tele, speed) {
    const P = G.player, x0 = dir > 0 ? WL + 4 : WR - 4, span = WR - WL;
    const spears = [];
    for (let y = -80; y < FLOOR + 6; y += 22) spears.push({ y, len: 44 + (Math.abs(y * 13) % 29), tilt: ((Math.abs(y * 7) % 11) - 5) * 0.035, w: 7 + (Math.abs(y * 5) % 4) });
    return H.add({
      kind: 'crescent', layer: 'over', tint: ICE, wx: x0, x: x0, dir, vx: 0, y: FLOOR - 40, tele, speed, started: false, broke: false, spears,
      gap(wx) {
        if (gA === gB) return gA;
        // drifting, it opens wider on the way, so between the two either answer has room
        const p = G.clamp((Math.abs(wx - x0) / span - 0.12) / 0.7, 0, 1), k = p * p * (3 - 2 * p), wide = Math.sin(Math.PI * k);
        return [G.lerp(gA[0], gB[0], k) - 40 * wide, G.lerp(gA[1], gB[1], k) + 22 * wide];
      },
      update(dt) {
        if (!this.started) {
          if (Math.random() < dt * 40) G.fx.burst(x0 + this.dir * 8, G.rand(0, FLOOR), { n: 1, color: ICE.hot, speed: [30, 140], angle: this.dir > 0 ? 0 : Math.PI, spread: 1.2, life: [0.2, 0.4], kind: 'shard', size: [2, 4] });
          if (this.t >= this.tele) { this.started = true; G.audio.play('mgGlacier'); G.fx.shake(7); }
        } else {
          this.wx += this.dir * this.speed * Math.min(1, 0.35 + (this.t - this.tele) / 0.3) * dt;
          if (Math.random() < dt * 50) G.fx.dust(this.wx - this.dir * 20, G.rand(40, FLOOR), 1, { dir: -this.dir, speed: [20, 90], size: [8, 14], life: [0.4, 0.8], up: 10, a: 0.2, color: '200,228,248' });
          if (Math.random() < dt * 14) G.fx.dust(this.wx - this.dir * 10, FLOOR, 1, { dir: -this.dir, speed: [40, 140], size: [6, 11], up: 30, a: 0.3, color: '210,235,250' });
          // it shatters against the far wall
          if (!this.broke && (this.dir > 0 ? this.wx > WR - 30 : this.wx < WL + 30)) {
            this.broke = true;
            G.audio.play('shatter'); G.fx.shake(8);
            for (let y = 40; y < FLOOR; y += 90) G.fx.shards(this.wx, y, 3, ICE.boss, { angle: this.dir > 0 ? Math.PI : 0, spread: 1.6, speed: [120, 420], size: [2, 5] });
          }
          if (this.wx < WL - 70 || this.wx > WR + 70) this.dead = true;
        }
        // for the scripted dodger: a gap low at the hero reads as a cut to stay down for ('crescent'),
        // one high as a cut to jump as it comes ('flycut', reported a little behind where it is)
        const g = this.gap(P.x);
        if (g[1] + 3 >= FLOOR - 1 && g[0] - 3 <= FLOOR - 44) { this.kind = 'crescent'; this.x = this.wx; }
        else { this.kind = 'flycut'; this.x = this.wx - this.dir * 60; }
        this.vx = this.started ? this.dir * this.speed : 0;
        this.srcX = this.wx - this.dir * 20;
      },
      hits(Pl) {
        if (!this.started || this.broke) return false;
        const q = Pl.box();
        if (Math.abs(q.cx - this.wx) > q.hw + 15) return false;
        const g = this.gap(this.wx);
        return q.cy - q.hh < g[0] - 3 || q.cy + q.hh > g[1] + 3;
      },
      draw(ctx) {
        const d = this.dir, x = this.wx, g = this.gap(x);
        const grow = this.started ? 1 : E.outCubic(Math.min(1, this.t / this.tele));
        const shat = this.broke ? Math.min(1, (this.dir > 0 ? this.wx - (WR - 30) : (WL + 30) - this.wx) / 50) : 0, a = 1 - shat;
        if (a <= 0) return;
        // the slab: ice packed into a wall
        const back = x - d * 20 * grow, front = x + d * 4;
        ctx.fillStyle = G.rgba('150,205,240', 0.32 * a);
        const l = Math.min(back, front), wdt = Math.abs(front - back);
        if (g[0] > -80) ctx.fillRect(l, -80, wdt, g[0] + 80);
        if (g[1] < FLOOR) ctx.fillRect(l, g[1], wdt, FLOOR - g[1]);
        ctx.strokeStyle = G.rgba(ICE.hot, 0.5 * a); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(front, -80); ctx.lineTo(front, g[0]); if (g[1] < FLOOR) { ctx.moveTo(front, g[1]); ctx.lineTo(front, FLOOR); } ctx.stroke();
        // spears driven forward out of it
        for (const s of this.spears) {
          if (s.y > g[0] - 4 && s.y < g[1] + 4) continue;
          const L = s.len * grow, tipx = x + d * L, ty = s.y + s.tilt * L;
          ctx.fillStyle = G.rgba(ICE.boss, 0.62 * a);
          D.poly(ctx, [x - d * 8, s.y - s.w, tipx, ty, x - d * 8, s.y + s.w]); ctx.fill();
          ctx.strokeStyle = G.rgba(ICE.hot, 0.65 * a); ctx.lineWidth = 1.2;
          D.line(ctx, x - d * 6, s.y - s.w * 0.6, tipx, ty);
        }
        // the gap's two edges bristle with longer spears into it
        ctx.fillStyle = G.rgba(ICE.boss, 0.6 * a);
        for (const [yy, sg] of [[g[0], 1], [g[1], -1]]) {
          if (yy < -60 || yy > FLOOR - 2) continue;
          for (const o of [-6, 8]) { D.poly(ctx, [x + o - 7, yy - sg * 2, x + o + d * 6, yy + sg * 18 * grow, x + o + 7, yy - sg * 2]); ctx.fill(); }
        }
      },
    });
  }
  function* atkGlacier() {
    const P = G.player, T = K.T(), ph = B.phase;
    // it takes the wall the hero is far from, and sends the ice towards them
    const side = P.x < 640 ? 1 : -1;
    yield* blink(640 + side * 470, GY);
    const b = B.body;
    face(); setElem(ICE); b.want = 1;
    const pose = (gp) => (gp === GAP.high ? { hx: 16, hy: -104, tilt: 1.15 } : { hx: 36, hy: -36, tilt: 2.05 });
    const speed = (ph === 3 ? 400 : 360) * (K.gentle() ? 0.88 : 1);
    const one = function* (dir, high, drift, tele) {
      const gA = high ? GAP.high : GAP.low, gB = drift ? (high ? GAP.low : GAP.high) : gA;
      const w = glacier(dir, gA, gB, tele, speed);
      G.audio.play('frost'); G.audio.play('charge', { dur: tele });
      let e = 0;
      while (e < tele) {
        const dt = yield;
        e += dt;
        const k = e / tele, q = drift ? E.inOutQuad(G.clamp((k - 0.3) / 0.55, 0, 1)) : 0, pa = pose(gA), pb = pose(gB);
        // the staff points at the gap while the wall grows (and, drifting, follows where it will go)
        // (v2.5c) and the body bows down with a low gap, crouched and leaning in, or rises and leans
        // back with a high one, after a quick coil the other way
        const ba = body(gA), bb = body(gB), lo = G.lerp(ba.lean, bb.lean, q), oy = G.lerp(ba.oy, bb.oy, q);
        const st = { hx: G.lerp(pa.hx, pb.hx, q), hy: G.lerp(pa.hy, pb.hy, q), tilt: G.lerp(pa.tilt, pb.tilt, q) + Math.sin(e * 5) * 0.03 };
        if (k < 0.14) stance('glacier-coil', st, { stiff: 1.3, lean: -lo * 0.4, oy: -oy * 0.5 });
        else stance(gA === gB ? (high ? 'glacier-high' : 'glacier-low') : 'glacier-drift', st, { stiff: 1.3, lean: lo + 0.03 * k, oy, trem: k > 0.7 ? 0.02 : 0, orb: [1.2, oy > 0 ? 40 : -40] });
      }
      // and drives it on, a push in both hands
      b.recV = (b.recV || 0) - b.face * 0.6;
      const pe = pose(gB);
      stance('glacier-drive', { hx: pe.hx + 6, hy: pe.hy, tilt: pe.tilt }, { stiff: 4, two: 1, lean: 0.14, oy: body(gB).oy * 0.5 });
      kick(7, 0, 0.12);
      return w;
    };
    const body = (gp) => (gp === GAP.high ? { lean: -0.06, oy: -8 } : { lean: 0.12, oy: 10 });
    const walls = [];
    walls.push(yield* one(-side, K.chance(0.5, 'high'), ph === 3, 0.95 * T));
    if (ph >= 2) {
      // a second from the far wall: it turns to point at it
      yield* act(0.55, (k, e) => (e < 0.25 ? stance('glacier-drive', null, { two: 1, lean: 0.14 }) : stance('glacier-turn', { hx: 24, hy: -86, tilt: 0.4 }, { stiff: 1.8, lean: -0.02 })));
      b.face = -side;
      walls.push(yield* one(side, K.chance(0.5, 'high2'), false, 0.85 * T));
    }
    let t = 0;
    while (t < 5 && walls.some((w) => !w.dead)) { const dt = yield; t += dt; stance(t < 0.25 ? 'glacier-drive' : 'glacier-watch', t < 0.25 ? null : { hx: 30, hy: -66, tilt: 1.3 }, { stiff: 0.8, lean: t < 0.25 ? 0.14 : 0.04, two: t < 0.25 ? 1 : 0 }); }
    unstance();
    yield* opening([0, 0.5, 0.45, 0.4][ph]);
  }

  // Back to rest. The staff comes down and what is left of the spell leaves it in its element's own
  // way: ice drops off the head of the staff in splinters, fire goes out in smoke, lightning crawls
  // down the wood and earths itself. Then the Magus sinks a little in the air and floats back up.
  const ELEM_OF = { spire: BOLT, blink: BOLT, glacier: ICE, serpent: FIRE, shards: ICE, rime: ICE, crystals: ICE, blizzard: ICE, fireball: FIRE, firewall: FIRE, comet: FIRE, cataclysm: FIRE, bolts: BOLT, spheres: BOLT, storm: BOLT, invoke: BOLT, blacksun: VOID, foresight: VOID };
  B.recover = function* (name) {
    const b = B.body, el = name === 'nova' ? (B.novaEl || ICE) : name === 'motes' ? (B.moteEl || ICE) : (ELEM_OF[name] || ICE);
    if (b.hidden || b.spent) return;
    const o = tip();
    b.want = 0; b.charge = 0; setElem(el);
    if (el === ICE) {
      G.audio.play('shard');
      G.fx.shards(o.x, o.y, 7, ICE.boss, { speed: [20, 160], size: [2, 5], life: [0.5, 0.9], spread: 2.4 });
      G.fx.dust(o.x, o.y, 2, { speed: [10, 40], size: [7, 12], life: [0.5, 0.9], up: -20, a: 0.3, color: '200,230,250' });
    } else if (el === FIRE) {
      G.fx.dust(o.x, o.y, 5, { speed: [10, 60], size: [8, 15], life: [0.6, 1.1], up: 110, a: 0.42, color: '70,62,66' });
      G.fx.burst(o.x, o.y, { n: 6, color: FIRE.boss, speed: [20, 110], life: [0.4, 0.9], size: [1.6, 3], grav: -120, wob: 80 });
    } else if (el === VOID) {
      // the void drips off the head of the staff, and its three lights come back on one by one
      G.fx.dust(o.x, o.y, 3, { speed: [10, 40], size: [6, 11], life: [0.5, 0.9], up: 40, a: 0.5, color: VOID.dark });
      G.fx.burst(o.x, o.y, { n: 5, color: VOID.dark, speed: [10, 60], angle: Math.PI / 2, spread: 1, life: [0.4, 0.8], size: [2, 3.5], kind: 'chunk', grav: 700 });
    } else G.audio.play('zap');
    const y0 = b.y, dur = el === VOID ? 0.55 : 0.34;
    let e = 0;
    // (v2.5c) whatever stance the spell left it in, the staff comes down to the hip and the body
    // straightens, a little behind it; then it is let go to rest
    stance('settle', { hx: 20, hy: -56, tilt: 0.22 }, { stiff: 1.2, lean: -0.03, oy: 2 });
    while (e < dur) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / dur);
      if (k > 0.6 && b.pose === 'settle') unstance();
      b.y = y0 + Math.sin(k * Math.PI) * 9; // sinks, and floats back
      if (el === VOID && b.dark > 0 && k > 0.25 + (3 - b.dark) * 0.22) {
        const i = b.dark - 1, a = B.t * 1.5 * B.spin + i * G.TAU / 3;
        b.dark--;
        G.audio.play('orb');
        G.fx.burst(b.x + b.face * Math.cos(a) * 56, b.y - 62 + Math.sin(a) * 15, { n: 5, color: ELEMS[i].boss, speed: [30, 120], life: [0.2, 0.45], size: [1.5, 3], kind: 'spark' });
      }
      if (el === BOLT && Math.random() < dt * 60) {
        // it runs down the staff to the hand
        const q = Math.random(), hx = b.x + b.face * 26, hy = b.y - 62;
        G.fx.spawn({ kind: 'spark', x: G.lerp(o.x, hx, q) + G.rand(-4, 4), y: G.lerp(o.y, hy, q), vx: G.rand(-140, 140), vy: G.rand(60, 260), life: G.rand(0.06, 0.14), size: G.rand(1.2, 2.2), color: BOLT.hot, len: 0.05 });
      }
    }
    b.y = y0; b.elem = null;
  };

  B.ATTACKS = {
    invoke: atkInvoke,
    comet: atkComet,
    shards: coda(atkShards, ICE), rime: coda(atkRime, ICE), fireball: coda(atkFireball, FIRE), bolts: coda(atkBolts, BOLT),
    spheres: coda(atkSpheres, BOLT), firewall: coda(atkFirewall, FIRE), crystals: coda(atkCrystals, ICE), storm: coda(atkStorm, BOLT),
    blizzard: atkBlizzard, cataclysm: atkCataclysm,
    nova: atkNova, serpent: coda(atkSerpent, FIRE),
    spire: atkSpire, motes: coda(atkMotes, ICE), blink: atkBlink, glacier: coda(atkGlacier, ICE), // v2.1a
    blacksun: atkBlacksun, foresight: atkForesight, // corrupted only
  };

  // ------------------------------------------------------------------ scenes
  B.enter = function* () {
    const b = B.body;
    b.x = 900; b.y = GY; b.homeY = GY; b.alpha = 0; b.face = -1; B.spin = 5;
    G.fx.ring(b.x, b.y - 50, { r0: 220, r1: 20, life: 0.8, color: G.pal().boss, width: 6 });
    yield* wait(0.6);
    puff(b.x, b.y - 50, G.pal().boss);
    G.audio.play('blink');
    yield* tween(b, { alpha: 1 }, 0.6);
    b.want = 1;
    for (const el of ELEMS) { setElem(el); G.audio.play('orb'); yield* wait(0.3); }
    b.want = 0; b.elem = null; B.spin = 1;
  };
  // The second phase: winter. The staff comes down and the whole floor freezes outward from under
  // the Magus, and stays frozen: there is little grip to start, stop or turn with. The platforms are dry.
  // The third phase: the storm. Thunderheads close over the arena and stay. Anyone who lingers up
  // in them is struck. The floor is still ice, and the Magus itself now burns: all three at once.
  const STORM_Y = FLOOR - 240; // above this height the storm takes notice
  B.phaseIn = function* (n) {
    const b = B.body;
    B.crystals.length = 0;
    yield* blink(640, FLOOR - 150);
    b.want = 1; B.spin = 6; setElem(n === 2 ? ICE : BOLT);
    yield* wait(0.5);
    if (n === 2) {
      b.gest = 'plant';
      yield* tween(b, { y: GY }, 0.22, E.inCubic);
      b.homeY = GY;
      G.audio.play('frost'); G.audio.play('shatter'); G.fx.shake(14); G.fx.impact(b.x, FLOOR - 20, 0.08);
      G.fx.ring(b.x, FLOOR - 4, { r0: 20, r1: 420, life: 0.6, color: ICE.hot, width: 12 });
      // the frost runs out along the floor both ways
      let e = 0;
      while (e < 0.9) {
        const dt = yield;
        e += dt;
        B.iceK = Math.min(1, e / 0.9); G.slick = B.iceK;
        for (const d of [-1, 1]) {
          const fx = G.clamp(b.x + d * B.iceK * 640, WL, WR);
          G.fx.burst(fx, FLOOR - 4, { n: 2, color: ICE.hot, speed: [80, 420], angle: -Math.PI / 2, spread: 1.4, life: [0.2, 0.5], kind: 'shard', size: [3, 7] });
          if (Math.random() < 0.5) G.fx.dust(fx, FLOOR, 1, { dir: d, speed: [40, 160], size: [6, 11], up: 50, a: 0.34, color: '200,230,250' });
        }
      }
      b.gest = null;
    } else {
      b.gest = 'high';
      G.audio.play('charge', { dur: 1.0 });
      let e = 0, next = 0.25;
      while (e < 1.1) {
        const dt = yield;
        e += dt; next -= dt;
        B.storm = Math.min(1, e / 1.0);
        if (next <= 0) {
          next = 0.26;
          const x = G.rand(WL + 60, WR - 60);
          B.skyBolts.push({ pts: boltPath(x, -40, x + G.rand(-120, 120), G.rand(120, 300)), life: 0.22 });
          G.audio.play('zap'); G.fx.shake(6); G.fx.flash(BOLT.boss, 0.1, 0.12);
        }
      }
      G.fx.impact(b.x, b.y - 60, 0.08);
      b.gest = null;
    }
  };
  B.phaseOut = function* (n) {
    const b = B.body;
    if (n === 3) {
      // and fire: it sets itself alight
      setElem(FIRE); b.aflame = true;
      G.audio.play('boom');
      G.fx.ring(b.x, b.y - 56, { r0: 20, r1: 200, life: 0.4, color: FIRE.boss, width: 9 });
      G.fx.burst(b.x, b.y - 56, { n: 30, color: FIRE.boss, speed: [80, 420], life: [0.3, 0.8], size: [3, 8], grav: -200 });
    }
    yield* wait(0.9);
    b.want = 0; b.elem = null; B.spin = 1; b.homeY = GY;
  };

  // ---- the bones (v2.5c): every piece of the figure on its own spring, drawing only. Nothing here is
  // read by a hit area, a hazard or a spell's origin (tip(), staff() and the body box stay as they
  // were): each part keeps a drawn offset from where the pose puts it, and B.draw adds it. The core
  // goes first and the loose parts after: the torso lags the hips a little, the head rides the torso
  // and tips with it, the hat's crown and the charm on its tip hang on their own chains, the staff's
  // head lags its hand and the shaft flexes, the robe's hem, the sleeves and the cape are chains pushed
  // by the body's motion, and the motes trail their orbits. A blow landing or a release's jolt kicks
  // them all. (Stepped from B.tick; B.draw reads it and draws a plain pose without it.)
  const CAPE_N = 9, CAPE_SEG = 13;
  // a world-frame vector in the figure's drawn frame (mirrored to its facing, then turned by its lean)
  const toLocal = (x, y, face, rot) => { const lx = x * face, c = Math.cos(rot), s = Math.sin(rot); return [lx * c + y * s, -lx * s + y * c]; };
  // the push on a hanging joint at angle a (0 straight down, + forward) from an acceleration of its root
  const hangPush = (ax, ay, a, k) => G.clamp(-(ax * Math.cos(a) - ay * Math.sin(a)) * k, -500, 500);
  function bones(b, dt) {
    if (!(dt > 0)) return;
    const R = b.rig || (b.rig = D.rig());
    const N = b.bn || (b.bn = { cape: {}, hat: {}, charm: {}, slv: {}, slvB: {}, armB: {}, robe: {}, rot0: null, rv0: 0, fl0: 0, kv0: 0, hp: null, hv: null });
    const down = B.staggered || b.spent || B.dying;
    // how the drawn frame is turned (lean, a fall, a recoil), and how fast that turn is changing
    const rot = (b.lean ? G.clamp(b.lean, -0.35, 0.4) : 0) + (down ? 0.28 : 0) + b.face * (b.rec || 0);
    const rv = N.rot0 == null ? 0 : (rot - N.rot0) / dt, al = G.clamp((rv - N.rv0) / dt, -60, 60);
    N.rot0 = rot; N.rv0 = rv;
    // the body's acceleration (a blink is not a push: R.accel gives 0 across one), in the drawn frame
    const A = R.accel(b.x + (b.kx || 0), b.y + (b.oy || 0), dt), L = toLocal(A.ax, A.ay, b.face, rot), ax = L[0], ay = L[1];
    const wvx = A.vx || 0, wvy = A.vy || 0;
    // the hand on the staff: its own acceleration (the stances swing it about) on top of the body's
    const S = staff(b.cast);
    let hax = 0, hay = 0;
    if (N.hp) {
      const vx = (S.hx - N.hp[0]) / dt, vy = (S.hy - N.hp[1]) / dt;
      if (N.hv) { hax = G.clamp((vx - N.hv[0]) / dt, -14000, 14000); hay = G.clamp((vy - N.hv[1]) / dt, -14000, 14000); }
      N.hv = [vx, vy];
    }
    N.hp = [S.hx, S.hy];
    if (b.hidden) { hax = 0; hay = 0; }
    const Hx = ax + hax, Hy = ay + hay;
    // impacts: a blow landing (its flash) knocks everything away from the hero; a release's jolt
    // through the staff (kick) jerks the shoulders and head after it
    const hit = (b.flash || 0) > N.fl0 + 0.4, away = (b.x >= G.player.x ? 1 : -1) * b.face;
    N.fl0 = b.flash || 0;
    const kq = b.kq, kv = kq ? Math.abs(kq.vhx) + Math.abs(kq.vhy) : 0, jolt = kq && kv > N.kv0 + 40;
    N.kv0 = kv;
    // the torso (shoulders and chest) lags the hips: back as the body drives, down as it rises
    R.spring('tx', 0, 0); R.spring('ty', 0, 0);
    // (and the shoulder goes with the arm: a swing of the staff pulls it after the hand)
    R.kick('tx', (-ax * 0.15 + hax * 0.06) * dt); R.kick('ty', (-ay * 0.12 + hay * 0.04) * dt);
    if (hit) { R.kick('tx', away * 70); R.kick('ty', 30); }
    if (jolt) { R.kick('tx', G.clamp(kq.vhx * 0.35, -60, 60)); R.kick('ty', G.clamp(kq.vhy * 0.25, -40, 40)); }
    // (its breath: the chest and shoulders rise and fall, heavier when it is down; the head, the hat
    // and the charm come after it on their own springs)
    const breath = -Math.sin(B.t * 1.25) * 0.9 * (down ? 1.7 : 1);
    const tx = R.spring('tx', 0, dt, 13, 0.45), ty = R.spring('ty', breath, dt, 15, 0.5);
    // the head rides the torso a beat late, and tips back as the body drives off (forward as it stops)
    R.spring('hx', 0, 0); R.spring('hy', 0, 0); R.spring('ht', 0, 0);
    R.kick('hx', -ax * 0.1 * dt); R.kick('hy', -ay * 0.08 * dt);
    R.kick('ht', (-ax * 0.003 + hax * 0.0006 - al * 0.9) * dt);
    if (hit) { R.kick('hx', away * 100); R.kick('ht', away * 2.4); }
    if (jolt) R.kick('ht', G.clamp(-kq.vhx * 0.012, -1.6, 1.6));
    R.spring('hx', tx, dt, 11, 0.4); R.spring('hy', ty, dt, 12, 0.42);
    const ht = R.spring('ht', 0, dt, 12, 0.4), htv = R.s.ht.v;
    // (the head's own sway, as an acceleration, for the hat and charm on it)
    const hxv = R.s.hx.v, hyv = R.s.hy.v, hha = N.hxv == null ? 0 : G.clamp((hxv - N.hxv) / dt, -6000, 6000), hhy = N.hyv == null ? 0 : G.clamp((hyv - N.hyv) / dt, -6000, 6000);
    N.hxv = hxv; N.hyv = hyv;
    // the hat's crown: two joints, stiff at the brim and loose at the tip (the tip flops back as the
    // body drives, droops as it rises, flicks up as it stops)
    if (hit && N.hat.v) { N.hat.v[0] += away * 2.5; N.hat.v[1] += away * 3.5; }
    const hat = D.angleChain(N.hat, [0, 0], dt, { w0: 16, w1: 10, z0: 0.35, z1: 0.25, follow: 0.5, push: G.clamp(-(ax + hha) * 0.012 + (ay + hhy) * 0.009 - al * 1.6 - htv * 8 + Math.sin(B.t * 1.3 + 2) * 1.2, -320, 320) });
    // the charm on the hat's tip hangs plumb whatever the head and hat are doing, and swings after them
    // (its angles are in the head's frame: see B.draw)
    const pl = rot + ht + (b.hd || 0);
    if (hit && N.charm.v) N.charm.v[1] += away * 6;
    D.angleChain(N.charm, [pl, pl], dt, { w0: 10, w1: 8, z0: 0.22, z1: 0.18, follow: 0.4, push: hangPush(ax + hha, ay + hhy, pl, 0.012) + Math.sin(B.t * 1.6 + 0.7) * 1.5 - (al + htv * 4) * 0.8 - (N.hat.v ? N.hat.v[1] : 0) * 2 });
    void hat;
    // the staff's head lags its hand (a heavy staff pivoting in the grip), swings past and settles
    R.spring('sl', 0, 0);
    R.kick('sl', G.clamp(-(Hx * Math.cos(S.tilt) + Hy * Math.sin(S.tilt)) / 60 * 0.36, -200, 200) * dt);
    if (hit) R.kick('sl', away * 1.2);
    R.spring('sl', 0, dt, 12, 0.3);
    // the robe hangs half plumb from the waist: two joints (waist to knee, knee to hem), pushed by the
    // body's motion and stirred by the air it floats on
    const draft = Math.sin(B.t * 0.9) * 7 + Math.sin(B.t * 2.3 + 1) * 4;
    if (hit && N.robe.v) N.robe.v[1] += away * 1.5;
    D.angleChain(N.robe, [rot * 0.35, rot * 0.5], dt, { w0: 11, w1: 8, z0: 0.4, z1: 0.28, follow: 0.6, push: hangPush(ax, ay, rot * 0.4, 0.006) + draft });
    // the long front sleeve: three links hanging from the wrist, flung about by the hand
    if (hit && N.slv.v) N.slv.v[2] += away * 4;
    D.angleChain(N.slv, [rot - 0.15, rot - 0.35, rot - 0.5], dt, { w0: 14, w1: 8, z0: 0.38, z1: 0.22, follow: 0.55, push: hangPush(Hx, Hy, rot, 0.009) + draft * 0.5 });
    // the back arm hangs at rest (upper arm and forearm on their own springs) until it takes the
    // staff, and its shorter sleeve
    D.angleChain(N.armB, [rot * 0.7 - 0.06, rot * 0.7 + 0.62], dt, { w0: 12, w1: 10, z0: 0.45, z1: 0.35, follow: 0.5, push: hangPush(ax, ay, rot, 0.006) });
    D.angleChain(N.slvB, [rot - 0.2, rot - 0.4], dt, { w0: 13, w1: 9, z0: 0.38, z1: 0.24, follow: 0.55, push: hangPush(ax, ay, rot, 0.009) + draft * 0.4 });
    // the motes trail their orbits, each on its own spring (so they never move as one)
    for (let i = 0; i < 3; i++) {
      const w = 7.5 + 1.6 * i, kx = 'm' + i + 'x', ky = 'm' + i + 'y';
      R.spring(kx, 0, 0); R.spring(ky, 0, 0);
      R.kick(kx, -A.ax * 0.22 * dt); R.kick(ky, -A.ay * 0.22 * dt);
      R.spring(kx, 0, dt, w, 0.35); R.spring(ky, 0, dt, w, 0.35);
    }
    // the cape, in the world: a chain from the shoulders, trailing behind, streaming back as the body
    // moves, lifting as it falls, swinging past as it stops and stirring in the air
    const tr = -b.face, lift = G.clamp(wvy * 0.001, 0, 0.45), drag = G.clamp(-wvx * 0.001, -0.55, 0.55), want = [];
    for (let i = 0; i < CAPE_N - 1; i++) want.push(G.clamp(tr * (0.16 + 0.045 * i + lift) + drag, -1.3, 1.3));
    if (hit && N.cape.v) for (let i = 0; i < N.cape.v.length; i++) N.cape.v[i] -= away * b.face * 0.6;
    const ca = D.angleChain(N.cape, want, dt, { w0: 9, w1: 5, z0: 0.5, z1: 0.3, follow: 0.6, push: G.clamp(-A.ax * 0.005, -300, 300) + Math.sin(B.t * 1.1) * 1.6 + Math.sin(B.t * 2.7 + 2) * 1 });
    let px = b.x + (b.kx || 0) - b.face * 12 + b.face * G.clamp(tx, -6, 6), py = b.y + (b.oy || 0) - 92 + G.clamp(ty, -5, 6);
    if (!B.cape || B.cape.length !== CAPE_N) B.cape = D.chain(CAPE_N, px, py);
    B.cape[0].x = px; B.cape[0].y = py;
    for (let i = 1; i < CAPE_N; i++) {
      const a = ca[i - 1];
      px += Math.sin(a) * CAPE_SEG; py = Math.min(FLOOR - 2, py + Math.cos(a) * CAPE_SEG);
      B.cape[i].x = px; B.cape[i].y = py;
    }
  }

  B.idle = function (dt) {
    const b = B.body, P = G.player;
    if (Math.abs(P.x - b.x) > 14) b.face = P.x > b.x ? 1 : -1;
    b.y = G.damp(b.y, b.homeY, 6, dt);
  };

  B.tick = function (dt) {
    const b = B.body, P = G.player;
    b.cast = G.damp(b.cast, b.want, 12, dt);
    if (b.gest) b.gestWas = b.gest;
    b.gk = G.damp(b.gk || 0, b.gest ? 1 : 0, b.gest ? 14 : 9, dt);
    b.mk = G.damp(b.mk || 0, b.merge ? 1 : 0, 6, dt);
    // the corrupted tells, eased in and out: its lights going out (the Black Sun); its head following
    // the hero, the glow of its hood narrowing and the staff leading the hero (Foresight)
    if (b.dk) for (let i = 0; i < 3; i++) b.dk[i] = G.damp(b.dk[i], i < b.dark ? 1 : 0, 9, dt);
    b.sl = G.damp(b.sl || 0, b.slit ? 1 : 0, 9, dt);
    const lx = (P.x - b.x) * b.face, ly = (P.y - 30) - (b.y - 108);
    b.hd = G.damp(b.hd || 0, b.track ? G.clamp(Math.atan2(ly, Math.max(40, lx)), -0.4, 0.55) * 0.75 : 0, 7, dt);
    if (B.readAim && b.gest === 'read') {
      // it turns to keep the place it reads in front of it, as it turns to face the hero anywhere else
      if ((B.readAim.ax - b.x) * b.face < -40) { b.face = -b.face; b.readTilt = -b.readTilt; } // (the staff stays where it was in the world, then swings round)
      const dx = (B.readAim.ax - (b.x + b.face * 30)) * b.face, dy = B.readAim.ay - (b.y - 70);
      b.readTilt = G.damp(b.readTilt, G.clamp(Math.atan2(dx, -dy), 0.4, 2.9), 10, dt);
    }
    // the staff held by hand follows its pose on springs (a little under-damped: it overshoots and settles)
    if (b.spT && b.sp) {
      const kS = 230 * (b.spS || 1), cS = 2 * Math.sqrt(kS) * 0.72, s = b.sp, t = b.spT;
      if (Math.abs(t.tilt - s.tilt) > Math.PI) s.tilt += G.TAU * Math.round((t.tilt - s.tilt) / G.TAU);
      s.vhx += (kS * (t.hx - s.hx) - cS * s.vhx) * dt; s.hx += s.vhx * dt;
      s.vhy += (kS * (t.hy - s.hy) - cS * s.vhy) * dt; s.hy += s.vhy * dt;
      s.vt += (kS * (t.tilt - s.tilt) - cS * s.vt) * dt; s.tilt += s.vt * dt;
    }
    b.spK = G.damp(b.spK || 0, b.spT ? 1 : 0, b.spT ? 16 : 7, dt);
    // the body leans on a spring too
    b.leanV = (b.leanV || 0) + (140 * ((b.leanT || 0) - (b.lean || 0)) - 15 * (b.leanV || 0)) * dt;
    b.lean = (b.lean || 0) + b.leanV * dt;
    // (v2.5c) the figure's lift or sink in the air (drawn only), on a spring that overshoots a little;
    // the back hand on the staff; where the motes circle; the tremor of a held staff; the kick's spring
    b.oyV = (b.oyV || 0) + (170 * ((b.oyT || 0) - (b.oy || 0)) - 17 * (b.oyV || 0)) * dt;
    b.oy = (b.oy || 0) + b.oyV * dt;
    b.two = G.damp(b.two || 0, b.twoT || 0, 12, dt);
    b.orR = G.damp(b.orR == null ? 1 : b.orR, b.orT ? b.orT[0] : 1, 5, dt);
    b.orY = G.damp(b.orY || 0, b.orT ? b.orT[1] : 0, 5, dt);
    b.trem = G.damp(b.trem || 0, b.tremT || 0, 10, dt);
    const kq = b.kq;
    if (kq) {
      kq.vhx += (-320 * kq.hx - 14 * kq.vhx) * dt; kq.hx += kq.vhx * dt;
      kq.vhy += (-320 * kq.hy - 14 * kq.vhy) * dt; kq.hy += kq.vhy * dt;
      kq.vt += (-320 * kq.tilt - 14 * kq.vt) * dt; kq.tilt += kq.vt * dt;
      if (Math.abs(kq.hx) + Math.abs(kq.hy) + Math.abs(kq.tilt) * 30 < 0.02 && Math.abs(kq.vhx) + Math.abs(kq.vhy) + Math.abs(kq.vt) * 30 < 0.2) { kq.hx = kq.hy = kq.tilt = kq.vhx = kq.vhy = kq.vt = 0; }
    }
    // the hem lags the body: when it drops the robe floats up, and when it stops the robe swings on down
    if (dt > 0) {
      const yy = b.y + (b.oy || 0);
      const vy = (yy - (b.py == null ? yy : b.py)) / dt, ay = G.clamp((vy - (b.pvy || 0)) / dt, -9000, 9000);
      b.hv = (b.hv || 0) + (-190 * (b.hl || 0) - 13 * (b.hv || 0) - ay * 0.6) * dt;
      b.hl = G.clamp((b.hl || 0) + b.hv * dt, -12, 12);
      b.py = yy; b.pvy = vy;
    }
    bones(b, dt);
    for (const s of B.novaArcs) s.life -= dt;
    B.novaArcs = B.novaArcs.filter((s) => s.life > 0);
    if (B.glaze && B.glaze.fade) { B.glaze.a -= dt * 1.6; if (B.glaze.a <= 0) B.glaze = null; }
    for (const s of B.shards) s.life -= dt;
    B.shards = B.shards.filter((s) => s.life > 0);
    for (const s of B.skyBolts) s.life -= dt;
    B.skyBolts = B.skyBolts.filter((s) => s.life > 0);
    if (B.dying || B.dead) { B.iceK = Math.max(0, B.iceK - dt * 0.6); B.storm = Math.max(0, B.storm - dt * 0.6); b.aflame = false; }
    G.slick = B.iceK;
    // frost glitters on the frozen floor
    if (B.iceK > 0 && Math.random() < dt * 9 * B.iceK) G.fx.glint(G.rand(640 - 610 * B.iceK, 640 + 610 * B.iceK), FLOOR + G.rand(0, 6), G.rand(5, 10), ICE.boss, 0.35);
    if (b.aflame && !b.hidden && Math.random() < dt * 40) {
      G.fx.spawn({ x: b.x + G.rand(-22, 22), y: b.y - G.rand(6, 110), vx: G.rand(-20, 20), vy: -G.rand(60, 190), life: G.rand(0.25, 0.6), size: G.rand(3, 7), color: FIRE.boss });
    }
    // the storm: it takes notice of anyone up in it, and after half a second it strikes them
    if (B.storm >= 1 && G.canHurt() && !B.staggered) {
      const up = P.y < STORM_Y && !P.ulting;
      B.zap = up ? Math.min(0.5, B.zap + dt) : Math.max(0, B.zap - dt * 2);
      if (up && Math.random() < dt * (20 + 90 * B.zap)) {
        G.fx.spawn({ kind: 'spark', x: P.x + G.rand(-20, 20), y: P.y - G.rand(0, 50), vx: G.rand(-260, 260), vy: G.rand(-260, 260), life: G.rand(0.06, 0.14), size: G.rand(1.2, 2.2), color: BOLT.hot, len: 0.05 });
      }
      if (B.zap >= 0.5 && P.iframes <= 0 && P.inv <= 0) {
        B.zap = 0;
        B.skyBolts.push({ pts: boltPath(P.x + G.rand(-40, 40), -40, P.x, P.y - 22), life: 0.24 });
        G.audio.play('zap'); G.fx.flash(BOLT.boss, 0.1, 0.12);
        G.fx.lines(P.x, P.y - 22, 8, BOLT.hot, { r0: 14, speed: [400, 800] });
        P.tryHit(1, P.x - P.facing * 10, { kind: 'storm', popVy: 320 });
      }
    } else B.zap = 0;
    // crystals count down and burst
    for (const c of B.crystals) {
      c.t += dt; c.flash = Math.max(0, c.flash - dt * 6); c.rise = Math.min(1, c.rise + dt / 0.3);
      if (!c.gone && c.t >= c.life && G.canHurt()) {
        c.gone = true;
        H.ring({ x: c.x, y: FLOOR - 40, r: 24, speed: K.gentle() ? 380 : 450, thick: 22, maxR: 560, tint: ICE });
        G.audio.play('ring'); G.fx.shake(8);
        G.fx.burst(c.x, FLOOR - 46, { n: 18, color: ICE.boss, speed: [150, 600], life: [0.3, 0.7], kind: 'spark', size: [2, 4] });
      }
    }
    B.crystals = B.crystals.filter((c) => !c.gone);
    // snow on the wind
    if (B.blizz) {
      for (let i = 0; i < 3; i++) {
        G.fx.spawn({ x: B.blizz > 0 ? G.rand(-20, 200) : G.rand(G.W - 200, G.W + 20), y: G.rand(40, FLOOR), vx: B.blizz * G.rand(700, 1100), vy: G.rand(40, 160), life: G.rand(0.6, 1.2), size: G.rand(1.5, 3.5), color: ICE.hot });
      }
    }
    // a wisp of the current element at the staff
    if (b.elem && !b.hidden && Math.random() < 0.5) {
      const o = tip();
      G.fx.spawn({ x: o.x + G.rand(-6, 6), y: o.y + G.rand(-6, 6), vx: G.rand(-30, 30), vy: G.rand(-90, -20), life: G.rand(0.2, 0.5), size: G.rand(2, 5) * (1 + b.charge), color: b.elem.boss });
    }
    void P;
  };

  B.extraTargets = function (out) {
    for (const c of B.crystals) out.push({ id: c.id, kind: 'extra', ref: c, cx: c.x, cy: FLOOR - 44 * c.rise, hw: 24, hh: 44 * c.rise });
  };

  // ------------------------------------------------------------------ drawing
  function moteShape(ctx, el, x, y, s) {
    if (el === ICE) D.poly(ctx, [x, y - 6 * s, x + 3.6 * s, y, x, y + 6 * s, x - 3.6 * s, y]);
    else if (el === FIRE || el.coal) { ctx.beginPath(); ctx.moveTo(x, y - 7 * s); ctx.quadraticCurveTo(x + 6 * s, y + 1 * s, x, y + 5 * s); ctx.quadraticCurveTo(x - 6 * s, y + 1 * s, x, y - 7 * s); ctx.closePath(); }
    else if (el.isVoid) { ctx.beginPath(); ctx.arc(x, y, 5 * s, 0, G.TAU); } // a black sun in little
    else D.poly(ctx, [x, y - 6.5 * s, x + 1.6 * s, y - 1.6 * s, x + 6.5 * s, y, x + 1.6 * s, y + 1.6 * s, x, y + 6.5 * s, x - 1.6 * s, y + 1.6 * s, x - 6.5 * s, y, x - 1.6 * s, y - 1.6 * s]);
  }
  // a hand closed round the staff, turned with it (in the staff's frame: knuckles forward, lit along them)
  function fist(ctx, x, y, tilt, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    ctx.fillStyle = '#03040a';
    D.poly(ctx, [-3.8, -3.3, 1.2, -4.2, 4.3, -2.4, 4.7, 1.8, 2.2, 3.9, -3.2, 3.4, -4.5, 0]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(1.2, -4.2); ctx.lineTo(4.3, -2.4); ctx.lineTo(4.7, 1.8); ctx.stroke();
    ctx.restore();
  }
  // dk: how far this mote has gone out (corrupted, the Black Sun): a black cinder rimmed in blood
  function mote(ctx, el, x, y, s, a, dk) {
    const lit = a * (1 - (dk || 0)), out = a * (dk || 0), ga = ctx.globalAlpha;
    if (lit > 0.01) {
      D.glow(ctx, el.boss, x, y, 15 * s, (el.isVoid ? 0.55 : el.coal ? 0.7 : 0.9) * lit);
      ctx.globalAlpha = ga * lit;
      ctx.fillStyle = el.isVoid ? '#050003' : el.coal ? '#240c07' : G.rgba(el.hot, 1);
      moteShape(ctx, el, x, y, s); ctx.fill();
      if (el.isVoid) { ctx.strokeStyle = G.rgba(VOID.hot, 0.8); ctx.lineWidth = 1.3; ctx.stroke(); }
      if (el.coal) { ctx.strokeStyle = G.rgba(el.hot, 0.95); ctx.lineWidth = 1.4; ctx.stroke(); }
    }
    if (out > 0.01) {
      ctx.globalAlpha = ga * out;
      ctx.fillStyle = '#060104'; moteShape(ctx, el, x, y, s); ctx.fill();
      ctx.strokeStyle = G.rgba(VOID.boss, 0.75); ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.globalAlpha = ga;
  }

  function drawCrystals(ctx) {
    for (const c of B.crystals) {
      const h = 88 * G.ease.outBack(c.rise), x = c.x, left = c.life - c.t;
      const warn = left < 1.5 ? 0.5 + 0.5 * Math.sin(c.t * 26) : 0;
      D.glow(ctx, warn > 0.5 ? DANGER : ICE.boss, x, FLOOR - h * 0.5, 70, 0.5 + 0.3 * warn);
      for (const [ox, w, hh, lean] of [[-15, 12, 0.55, -8], [14, 11, 0.62, 7], [0, 19, 1, 1]]) {
        ctx.fillStyle = c.flash > 0.3 ? '#ffffff' : ox ? '#28507c' : '#3a72a8';
        D.poly(ctx, [x + ox - w, FLOOR, x + ox - w * 0.7 + lean * 0.5, FLOOR - h * hh * 0.7, x + ox + lean, FLOOR - h * hh, x + ox + w * 0.8 + lean * 0.5, FLOOR - h * hh * 0.62, x + ox + w, FLOOR]);
        ctx.fill();
        ctx.strokeStyle = G.rgba(ICE.hot, 0.8); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = G.rgba(ICE.hot, 0.35); ctx.lineWidth = 1;
        D.line(ctx, x + ox + lean, FLOOR - h * hh, x + ox + 1, FLOOR - 4);
      }
      // the time it has left, as a ring that empties
      const k = G.clamp(left / c.life, 0, 1);
      ctx.strokeStyle = G.rgba(left < 1.5 ? DANGER : ICE.hot, 0.9); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, FLOOR - h - 18, 9, -Math.PI / 2, -Math.PI / 2 + G.TAU * k); ctx.stroke();
    }
  }

  B.drawGround = function (ctx) {
    const b = B.body;
    if (B.dead || b.hidden) return;
    const k = G.clamp(1 - (FLOOR - b.y - (b.oy || 0)) / 300, 0.3, 1) * b.alpha;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.4 * k) + ')';
    ctx.beginPath(); ctx.ellipse(b.x, FLOOR + 3, 34 * k, 6 * k, 0, 0, G.TAU); ctx.fill();
  };

  // The frozen floor and the storm overhead: drawn over the arena, under the hero.
  B.drawOver = function (ctx) {
    if (B.glaze && B.glaze.r > 2) {
      // frost creeping out from under it, before an ice Nova
      const gz = B.glaze, a = Math.max(0, gz.a);
      const g = ctx.createRadialGradient(gz.x, FLOOR, 4, gz.x, FLOOR, gz.r);
      g.addColorStop(0, G.rgba(ICE.hot, 0.5 * a)); g.addColorStop(0.7, G.rgba(ICE.boss, 0.28 * a)); g.addColorStop(1, G.rgba(ICE.boss, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(gz.x, FLOOR + 2, gz.r, 9, 0, 0, G.TAU); ctx.fill();
      ctx.strokeStyle = G.rgba(ICE.hot, 0.45 * a); ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 9; i++) { const s = (i * 0.37) % 1, x1 = gz.x + (s * 2 - 1) * gz.r * 0.9; ctx.moveTo(gz.x + (x1 - gz.x) * 0.3, FLOOR - 1); ctx.lineTo(x1, FLOOR + 1 + (i % 3)); }
      ctx.stroke();
    }
    if (B.iceK > 0.001) {
      const l = Math.max(WL, 640 - 640 * B.iceK), r = Math.min(WR, 640 + 640 * B.iceK), w = r - l;
      const g = ctx.createLinearGradient(0, FLOOR - 5, 0, FLOOR + 26);
      g.addColorStop(0, G.rgba(ICE.hot, 0.75)); g.addColorStop(0.2, G.rgba(ICE.boss, 0.4)); g.addColorStop(1, G.rgba(ICE.boss, 0.04));
      ctx.fillStyle = g; ctx.fillRect(l, FLOOR - 5, w, 31);
      // icicle teeth along the lip of the slab, and long streaks of reflected light
      ctx.fillStyle = G.rgba(ICE.hot, 0.5);
      ctx.beginPath();
      for (let x = Math.ceil(l / 46) * 46; x < r; x += 46) { const h = 8 + ((x * 7) % 13); ctx.moveTo(x - 7, FLOOR + 2); ctx.lineTo(x, FLOOR + 2 + h); ctx.lineTo(x + 7, FLOOR + 2); }
      ctx.fill();
      ctx.strokeStyle = G.rgba('255,255,255', 0.5); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = Math.ceil(l / 170) * 170; x < r - 60; x += 170) { ctx.moveTo(x + 10, FLOOR - 2); ctx.lineTo(x + 70, FLOOR - 2); }
      ctx.stroke();
    }
    if (B.storm > 0.001) {
      const a = B.storm, bot = STORM_Y + 30;
      const g = ctx.createLinearGradient(0, -60, 0, bot);
      g.addColorStop(0, 'rgba(10,6,24,' + 0.92 * a + ')'); g.addColorStop(0.6, 'rgba(26,16,54,' + 0.6 * a + ')'); g.addColorStop(1, 'rgba(26,16,54,0)');
      ctx.fillStyle = g; ctx.fillRect(G.cam.x - 80, -80, G.W + 160, bot + 80);
      // the underside of the cloud rolls
      ctx.fillStyle = 'rgba(16,10,36,' + 0.55 * a + ')';
      ctx.beginPath(); ctx.moveTo(-80, -80);
      for (let x = -80; x <= G.W + 80; x += 40) ctx.lineTo(x, STORM_Y - 70 + Math.sin(x * 0.013 + G.t * 0.7) * 16 + Math.sin(x * 0.031 - G.t * 1.1) * 9);
      ctx.lineTo(G.W + 80, -80); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      // its underside is lit from within, so where the storm begins can be read at a glance
      ctx.strokeStyle = G.rgba(BOLT.boss, 0.34 * a); ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = -80; x <= G.W + 80; x += 40) { const y = STORM_Y - 70 + Math.sin(x * 0.013 + G.t * 0.7) * 16 + Math.sin(x * 0.031 - G.t * 1.1) * 9; if (x === -80) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.fillStyle = G.rgba(BOLT.boss, 0.07 * a); ctx.fillRect(G.cam.x - 80, -80, G.W + 160, STORM_Y - 60);
      // it flickers inside, and brighter while it has someone in mind
      const fl = Math.max(0, Math.sin(G.t * 7.3) * Math.sin(G.t * 3.1) - 0.72) * 3 + B.zap * 1.2;
      if (fl > 0) { ctx.fillStyle = G.rgba(BOLT.boss, 0.16 * fl * a); ctx.fillRect(G.cam.x - 80, -80, G.W + 160, STORM_Y); }
      for (const s of B.skyBolts) drawBolt(ctx, s.pts, Math.min(1, s.life / 0.12));
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  B.draw = function (ctx) {
    if (B.dead) return;
    const b = B.body;
    drawCrystals(ctx);
    for (const s of B.shards) {
      const a = Math.min(1, s.life * 6);
      D.glow(ctx, ICE.boss, s.x, s.y, 22, 0.8 * a);
      ctx.fillStyle = G.rgba(ICE.hot, a);
      D.poly(ctx, [s.x, s.y - 12, s.x + 5, s.y, s.x, s.y + 12, s.x - 5, s.y]); ctx.fill();
    }
    if (B.novaArcs.length) { ctx.globalCompositeOperation = 'lighter'; for (const s of B.novaArcs) drawBolt(ctx, s.pts, Math.min(1, s.life / 0.06) * 0.7); ctx.globalCompositeOperation = 'source-over'; }
    if (B.flick) drawFlicker(ctx, B.flick);
    if (b.hidden || b.alpha <= 0.01) return;

    const down = B.staggered || b.spent || B.dying;
    const el = b.elem, pal = G.pal();
    const col = el ? el.boss : pal.boss, hot = el ? el.hot : pal.hot;
    const bob = down ? 0 : Math.sin(B.t * 2.2) * 4;
    const c = b.cast;
    const jx = b.jit ? G.rand(-b.jit, b.jit) : 0;
    // the bones (see bones): each part's drawn offset, or none (the plain pose) before the first step
    const R = b.rig, N = b.bn || {};
    // (eased into their limits, never stopped dead at them)
    const rs = (k, lo, hi) => { const v = R && R.s[k] ? R.s[k].x : 0; if (!isFinite(v)) return 0; const m = v < 0 ? -lo : hi; return m * Math.tanh(v / m); };
    const ang = (st, i, lo, hi, d) => (st && st.a && isFinite(st.a[i]) ? G.clamp(st.a[i], lo, hi) : d);
    const rot = (b.lean ? G.clamp(b.lean, -0.35, 0.4) : 0) + (down ? 0.28 : 0) + b.face * (b.rec || 0);
    // the torso (shoulders, chest, collar, the upper robe) lags the hips and rises with each breath;
    // the head rides the torso
    const tx = rs('tx', -6, 6), ty = rs('ty', -5, 6);
    const hdx = rs('hx', -8, 8), hdy = rs('hy', -7, 8), htl = rs('ht', -0.3, 0.3);

    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // cape, in world space (a chain of springs: see bones)
    D.ribbon(ctx, B.cape.map((p) => ({ x: p.x + jx, y: p.y + bob })), 30, 60, 13);
    ctx.fillStyle = '#070919'; ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.4); ctx.lineWidth = 1.5; ctx.stroke();

    ctx.translate(b.x + b.kx + jx, b.y + bob + (b.oy || 0));
    K.recoil(ctx, b);
    ctx.scale(K.faceX(b), 1); // (a turn narrows the figure through it: see K.turn)
    if (b.lean) ctx.rotate(G.clamp(b.lean, -0.35, 0.4)); // (leaning into a cast, about its feet)
    if (down) ctx.rotate(0.28);

    D.glow(ctx, col, 0, -70, 130, 0.2 + 0.2 * c);

    // the staff as drawn: where the game holds it (staff(): spells leave from there), with its head
    // lagging the hand on its own spring (sl) and the shaft flexing with it
    const S0 = staff(c), sl = rs('sl', -0.16, 0.16), S = { hx: S0.hx, hy: S0.hy, tilt: S0.tilt + sl };
    const headX = S.hx + Math.sin(S.tilt) * 96, headY = S.hy - Math.cos(S.tilt) * 96;

    // the three motes circle the Magus; the one in use burns in the staff
    // (v2.5c: each stance says where they circle: rising round the hat, or sunk to the feet, wide or tight;
    // and each trails its orbit on its own spring as the body moves)
    const orR = b.orR == null ? 1 : b.orR, orY = b.orY || 0;
    const motes = ELEMS.map((e, i) => {
      const a = B.t * 1.5 * B.spin + i * G.TAU / 3, mk = b.mk || 0;
      const o = R ? toLocal(rs('m' + i + 'x', -24, 24), rs('m' + i + 'y', -24, 24), b.face, rot) : [0, 0];
      return { e, x: G.lerp(Math.cos(a) * 56 * orR + o[0], headX, mk), y: G.lerp(-62 + orY + Math.sin(a) * 15 * orR + o[1], headY, mk), back: Math.sin(a) < 0 && mk < 0.5, dk: (b.dk && b.dk[i]) || 0 };
    });
    const dim = down ? 0.35 : 1;
    for (const m of motes) if (m.back && (m.e !== el || b.mk > 0.05)) mote(ctx, m.e, m.x, m.y, 0.8, 0.7 * dim, m.dk);

    // robe: narrow at the waist, wide at the hem and torn into wisps
    const g = ctx.createLinearGradient(0, -96, 0, 6);
    g.addColorStop(0, '#2c3690'); g.addColorStop(0.5, '#181d58'); g.addColorStop(1, '#070920');
    ctx.fillStyle = g;
    // the robe below the belt hangs on two joints (waist to knee, knee to hem: N.robe) and lifts and
    // flares as the hem lags (b.hl); above the belt it goes with the torso; the torn wisps flick as the
    // hem swings (rbv)
    const hl = b.hl || 0, rb0 = ang(N.robe, 0, -0.5, 0.5, 0), rb1 = ang(N.robe, 1, -0.6, 0.6, 0);
    const rbv = N.robe && N.robe.v && isFinite(N.robe.v[1]) ? G.clamp(N.robe.v[1] * 2.5, -4, 4) : 0;
    const m1x = 34 * Math.sin(rb0), m1y = 34 * (1 - Math.cos(rb0)), m2x = 30 * Math.sin(rb1), m2y = 30 * (1 - Math.cos(rb1));
    const hem = (a) => {
      const o = a.slice();
      for (let i = 0; i < o.length; i += 2) {
        const y = o[i + 1], q = G.clamp((y + 50) / 56, 0, 1), qa = G.clamp((y + 64) / 34, 0, 1), qb = G.clamp((y + 30) / 30, 0, 1), qt = G.clamp((-60 - y) / 35, 0, 1);
        o[i] = o[i] * (1 + Math.abs(hl) * 0.018 * q) + qa * m1x + qb * m2x + qt * tx;
        o[i + 1] = y - hl * q - qa * m1y - qb * m2y + qt * ty;
      }
      return o;
    };
    const w = rbv;
    D.poly(ctx, hem([-15, -95, 15, -95, 11, -64, 15, -44, 22 + w * 0.5, -22, 29 + w, -6, 21 + w, 5, 15 + w * 0.6, -7, 8, 7, 1, -6, -6 + w * 0.5, 6, -12, -7, -19 + w, 4, -28 + w, -9, -21 + w * 0.4, -30, -14, -46, -10, -64]));
    ctx.fill();
    // light along the leading edge
    ctx.fillStyle = G.rgba(col, 0.28);
    D.poly(ctx, hem([15, -95, 11, -64, 15, -44, 22 + w * 0.5, -22, 29 + w, -6, 25 + w, -7, 18 + w * 0.5, -24, 11, -44, 7.5, -64, 11, -95])); ctx.fill();
    // hem trim
    ctx.strokeStyle = G.rgba(col, 0.75); ctx.lineWidth = 1.6;
    ctx.beginPath();
    [[29 + w, -6], [21 + w, 5], [15 + w * 0.6, -7], [8, 7], [1, -6], [-6 + w * 0.5, 6], [-12, -7], [-19 + w, 4], [-28 + w, -9]].map((p) => hem(p)).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    // stole: two hanging bands marked with runes (hung from the neck, swinging with the robe)
    for (const sx of [-5.5, 3]) {
      ctx.fillStyle = '#0a0c26';
      D.poly(ctx, hem([sx - 2.6, -92, sx + 2.6, -92, sx + 3 + w * 0.3, -30, sx + w * 0.4, -23, sx - 3 + w * 0.3, -30])); ctx.fill();
      ctx.fillStyle = G.rgba(col, 0.9);
      for (let i = 0; i < 4; i++) { const r = hem([sx, -58 + i * 7]); ctx.fillRect(r[0] - 1.4, r[1], 2.8, 1.8); }
      D.poly(ctx, hem([sx - 3 + w * 0.3, -30, sx + 3 + w * 0.3, -30, sx + w * 0.4, -23])); ctx.fill();
    }
    // belt and its stone
    const bo = hem([0, -64]);
    ctx.save(); ctx.translate(bo[0], bo[1] + 64);
    ctx.strokeStyle = '#05060f'; ctx.lineWidth = 5; D.line(ctx, -10, -64, 11, -64);
    ctx.strokeStyle = G.rgba(col, 0.9); ctx.lineWidth = 1.5; D.line(ctx, -10, -66, 11, -66);
    D.glow(ctx, col, 0, -64, 10, 0.9);
    ctx.fillStyle = G.rgba(hot, 1); D.poly(ctx, [0, -68.5, 3.4, -64, 0, -59.5, -3.4, -64]); ctx.fill();
    ctx.restore();

    // the shoulders: collar and mantle ride the torso (lagging the hips, rising with each breath)
    ctx.save(); ctx.translate(tx, ty);
    // high collar behind the head
    ctx.fillStyle = '#12164a';
    D.poly(ctx, [-13, -98, -19, -121, -5, -105]); ctx.fill();
    D.poly(ctx, [13, -98, 20, -120, 6, -105]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.6); ctx.lineWidth = 1.1;
    D.line(ctx, -13, -98, -19, -121); D.line(ctx, 13, -98, 20, -120);
    // mantle with pointed shoulders
    ctx.fillStyle = '#343fa2';
    D.poly(ctx, [-25, -93, -10, -102, 10, -102, 25, -93, 33, -78, 19, -83, 12, -76, 0, -85, -12, -76, -19, -83, -33, -78]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.85); ctx.lineWidth = 1.4;
    ctx.beginPath();
    [[33, -78], [19, -83], [12, -76], [0, -85], [-12, -76], [-19, -83], [-33, -78]].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.restore();

    // the head rides the torso on its own spring and tips on the neck (and, for Foresight, turns on
    // the neck to follow the hero)
    ctx.save();
    ctx.translate(hdx, hdy);
    const hr = (b.hd || 0) + htl;
    if (hr) { ctx.translate(2, -100); ctx.rotate(hr); ctx.translate(-2, 100); }
    // a face of nothing but two burning eyes; reading the hero, they narrow to one slit of light
    const sl2 = b.sl || 0;
    ctx.fillStyle = '#020308';
    ctx.beginPath(); ctx.ellipse(2, -108, 8.5, 9.5, 0, 0, G.TAU); ctx.fill();
    D.glow(ctx, col, 6.5, -108, 13 * (1 - 0.35 * sl2), 1);
    ctx.save();
    ctx.translate(6.5, -108.8); ctx.scale(1 + 0.15 * sl2, 1 - 0.75 * sl2); ctx.translate(-6.5, 108.8);
    ctx.fillStyle = G.rgba(hot, 1);
    D.poly(ctx, [1.6, -110.4, 5.6, -108.6, 2.2, -107]); ctx.fill();
    D.poly(ctx, [7.6, -108.8, 11.4, -110.8, 10.6, -107.2]); ctx.fill();
    ctx.restore();
    if (sl2 > 0.02) {
      ctx.save(); ctx.translate(7, -109); ctx.scale(1.9, 0.38); D.glow(ctx, col, 0, 0, 16, 0.9 * sl2); ctx.restore();
      ctx.strokeStyle = G.rgba(hot, sl2); ctx.lineWidth = 1.6; D.line(ctx, 0, -108.7, 13, -109.3);
    }
    // hat: a tall crooked crown over a wide brim; the crown bends on two joints of its own (N.hat),
    // at the brim and halfway up, and its tip flops after the head
    const hat0 = ang(N.hat, 0, -0.45, 0.45, 0), hat1 = ang(N.hat, 1, -0.6, 0.6, 0);
    const c0 = Math.cos(hat0), s0 = Math.sin(hat0), P1x = (-13) * c0 - (-22) * s0, P1y = -128 + (-13) * s0 + (-22) * c0;
    const bendHat = (a) => {
      const o = a.slice();
      for (let i = 0; i < o.length; i += 2) {
        let x = o[i], y = o[i + 1];
        const w0 = G.clamp((-126 - y) / 14, 0, 1), w1 = G.clamp((-148 - y) / 8, 0, 1);
        if (w0) { const t = hat0 * w0, cc = Math.cos(t), ss = Math.sin(t), dx = x, dy = y + 128; x = dx * cc - dy * ss; y = -128 + dx * ss + dy * cc; }
        if (w1) { const t = hat1 * w1, cc = Math.cos(t), ss = Math.sin(t), dx = x - P1x, dy = y - P1y; x = P1x + dx * cc - dy * ss; y = P1y + dx * ss + dy * cc; }
        o[i] = x; o[i + 1] = y;
      }
      return o;
    };
    ctx.fillStyle = '#202a78';
    D.poly(ctx, bendHat([-14, -119, -12, -137, -17, -151, -28, -164, -38, -160, -24, -155, -11, -157, 2, -143, 13, -119])); ctx.fill();
    ctx.fillStyle = G.rgba(col, 0.22);
    D.poly(ctx, bendHat([13, -119, 2, -143, -11, -157, -7, -152, 4, -139, 9, -119])); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.95); ctx.lineWidth = 3.4; D.line(ctx, -13, -123.5, 12, -123.5);
    ctx.fillStyle = '#141a52';
    ctx.beginPath(); ctx.ellipse(1, -118, 31, 6.5, -0.08, 0, G.TAU); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(1, -118, 31, 6.5, -0.08, 0.1, Math.PI - 0.1); ctx.stroke();
    // a charm hanging from the tip on a cord of two links (N.charm), plumb whatever the hat is doing
    const plH = rot + htl + (b.hd || 0), T0 = bendHat([-38, -160]);
    const ch0 = ang(N.charm, 0, plH - 1.5, plH + 1.5, plH), ch1 = ang(N.charm, 1, plH - 1.8, plH + 1.8, plH);
    const cjx = T0[0] + Math.sin(ch0) * 6, cjy = T0[1] + Math.cos(ch0) * 6, cex = cjx + Math.sin(ch1) * 6, cey = cjy + Math.cos(ch1) * 6;
    const chx = cex + Math.sin(ch1) * 2, chy = cey + Math.cos(ch1) * 2;
    ctx.strokeStyle = G.rgba(col, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(T0[0], T0[1]); ctx.lineTo(cjx, cjy); ctx.lineTo(cex, cey); ctx.stroke();
    D.glow(ctx, col, chx, chy, 9, 0.9);
    ctx.fillStyle = G.rgba(hot, 1); ctx.beginPath(); ctx.arc(chx, chy, 2.2, 0, G.TAU); ctx.fill();
    ctx.restore();

    // the staff, taller than its bearer, and the arms that hold it (from shoulders that ride the torso)
    const F0x = 13 + tx, F0y = -92 + ty, B0x = -11 + tx, B0y = -92 + ty;
    // raised flat overhead (the Black Sun) it is held in both hands, arms at full stretch
    const sunK = (b.gest || b.gestWas) === 'sun' ? (b.gk || 0) : 0, twoK = b.two || 0, reach = 18 + 11 * sunK + 3 * twoK;
    // (v2.5c) a hand that cannot reach where the staff is held slides along the staff to the nearest
    // point of it that it can, so it never floats free of the wood
    const ax = Math.sin(S.tilt), ay = -Math.cos(S.tilt);
    const along = (u) => ({ x: S.hx + ax * u, y: S.hy + ay * u, u });
    const grip = (sx, sy, u0) => {
      const p = along(u0);
      return Math.hypot(p.x - sx, p.y - sy) <= reach * 2 - 1 ? p : along(G.clamp((sx - S.hx) * ax + (sy - S.hy) * ay, -60, 70));
    };
    const fg = grip(F0x, F0y, 0);
    // the back arm: hanging at rest on its own springs (N.armB), it reaches from there to take the
    // staff in both hands (b.two), or to raise it flat overhead (the Black Sun)
    let bk = null;
    const holdK = Math.max(sunK, twoK);
    if (holdK > 0.02) {
      const u0 = ang(N.armB, 0, -1.2, 1.2, rot * 0.7 - 0.06), u1 = ang(N.armB, 1, -1.2, 2.2, rot * 0.7 + 0.62);
      const rex = B0x + Math.sin(u0) * 17, rey = B0y + Math.cos(u0) * 17, rhx = rex + Math.sin(u1) * 16, rhy = rey + Math.cos(u1) * 16;
      const g2 = sunK >= twoK ? along(-38) : grip(B0x, B0y, fg.u - 30);
      const q = Math.min(1, holdK * 1.6), e = q * q * (3 - 2 * q);
      bk = D.ik(B0x, B0y, G.lerp(rhx, g2.x, e), G.lerp(rhy, g2.y, e), reach, reach, -1);
      bk.a = Math.min(1, holdK * 3);
      ctx.globalAlpha = b.alpha * bk.a;
      ctx.fillStyle = '#1a2160';
      D.limb(ctx, B0x, B0y, bk.jx, bk.jy, 9, 8); ctx.fill();
      D.limb(ctx, bk.jx, bk.jy, bk.ex, bk.ey, 8, 6); ctx.fill();
      // its shorter sleeve, two links from the wrist
      const v0 = ang(N.slvB, 0, rot - 2, rot + 2, rot - 0.2), v1 = ang(N.slvB, 1, rot - 2.2, rot + 2.2, rot - 0.4);
      const wx = bk.ex + 1, wy = bk.ey + 2.5, d1x = wx + Math.sin(v0) * 9, d1y = wy + Math.cos(v0) * 9, d2x = d1x + Math.sin(v1) * 9, d2y = d1y + Math.cos(v1) * 9;
      ctx.fillStyle = '#141a50';
      D.poly(ctx, [bk.jx - 2.5, bk.jy + 2, wx, wy, d1x, d1y, d2x, d2y]); ctx.fill();
      ctx.globalAlpha = b.alpha;
    }
    ctx.save();
    ctx.translate(S.hx, S.hy); ctx.rotate(S.tilt);
    // the shaft flexes as its head lags (bowed towards where the hand is taking it)
    const flex = G.clamp(-sl * 24, -4, 4);
    ctx.beginPath(); ctx.moveTo(0, 66); ctx.quadraticCurveTo(flex, -8, 0, -82);
    ctx.strokeStyle = '#04050c'; ctx.lineWidth = 5.5; ctx.stroke();
    ctx.strokeStyle = '#39449c'; ctx.lineWidth = 2.8; ctx.stroke();
    ctx.fillStyle = G.rgba(col, 0.9); D.poly(ctx, [-2.6, 62, 2.6, 62, 0, 74]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.95); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -96, 13, Math.PI * 0.62, Math.PI * 2.38); ctx.stroke();
    ctx.fillStyle = G.rgba(col, 0.95);
    D.poly(ctx, [-10.5, -106, -15, -117, -5.5, -109]); ctx.fill();
    D.poly(ctx, [10.5, -106, 15, -117, 5.5, -109]); ctx.fill();
    ctx.lineWidth = 2; D.line(ctx, -4, -80, 4, -80); D.line(ctx, -3, -75, 3, -75);
    if (el) mote(ctx, el, 0, -96, 1.3 + 0.8 * b.charge, 1);
    else { D.glow(ctx, col, 0, -96, 18, 0.8); ctx.fillStyle = G.rgba(hot, 1); D.poly(ctx, [0, -103, 4.2, -96, 0, -89, -4.2, -96]); ctx.fill(); }
    // the gesture's accent: a thread of light going up from a raised staff, a ring where a planted one meets the floor
    const gk = b.gk || 0, gs = b.gest || b.gestWas;
    if (gk > 0.05 && gs === 'high') {
      const lg = ctx.createLinearGradient(0, -112, 0, -272);
      lg.addColorStop(0, G.rgba(hot, 0.9 * gk)); lg.addColorStop(1, G.rgba(hot, 0));
      ctx.strokeStyle = lg; ctx.lineWidth = 3; D.line(ctx, 0, -112, 0, -112 - 160 * gk);
    }
    if (gk > 0.05 && gs === 'plant') {
      D.glow(ctx, col, 0, 72, 34 * gk, 0.9 * gk);
      ctx.strokeStyle = G.rgba(hot, 0.85 * gk); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 74, 38 * gk, 7 * gk, 0, 0, G.TAU); ctx.stroke();
    }
    ctx.restore();
    // the back hand closes over the staff
    if (bk) { ctx.globalAlpha = b.alpha * bk.a; fist(ctx, bk.ex, bk.ey, S.tilt, col); ctx.globalAlpha = b.alpha; }
    const k = D.ik(F0x, F0y, fg.x, fg.y, reach, reach, 1);
    ctx.fillStyle = '#28338c';
    D.limb(ctx, F0x, F0y, k.jx, k.jy, 10, 9); ctx.fill();
    D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 9, 7); ctx.fill();
    // a long sleeve hangs from the wrist on three links (N.slv), flung about by the hand
    const v0 = ang(N.slv, 0, rot - 2, rot + 2, rot - 0.15), v1 = ang(N.slv, 1, rot - 2.2, rot + 2.2, rot - 0.35), v2 = ang(N.slv, 2, rot - 2.4, rot + 2.4, rot - 0.5);
    const wx = k.ex + 1, wy = k.ey + 3, s1x = wx + Math.sin(v0) * 11, s1y = wy + Math.cos(v0) * 11, s2x = s1x + Math.sin(v1) * 11, s2y = s1y + Math.cos(v1) * 11, s3x = s2x + Math.sin(v2) * 10, s3y = s2y + Math.cos(v2) * 10;
    ctx.fillStyle = '#1c2468';
    D.poly(ctx, [k.jx - 3, k.jy + 2, wx, wy, s1x, s1y, s2x, s2y, s3x, s3y]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.7); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(s1x, s1y); ctx.lineTo(s2x, s2y); ctx.lineTo(s3x, s3y); ctx.lineTo(k.jx - 3, k.jy + 2); ctx.stroke();
    // the hand: a fist closed round the wood, turned with the staff (the wrist bends to it)
    fist(ctx, k.ex, k.ey, S.tilt, col);
    if (c > 0.3) D.glow(ctx, col, k.ex, k.ey, 14 + 10 * b.charge, c * 0.8);

    for (const m of motes) if (!m.back && (m.e !== el || b.mk > 0.05)) mote(ctx, m.e, m.x, m.y, 1 + 0.5 * (b.mk || 0), dim, m.dk);
    if (b.mk > 0.3) D.glow(ctx, '255,255,255', headX, headY, 70 * b.mk, 0.8 * b.mk);

    if (b.flash > 0) D.glow(ctx, '255,255,255', 0, -70, 80, b.flash * 0.3); // (v1.6d: a tint, not a white dome)
    ctx.restore();
  };

  G.makeBoss(B);
  // Where blows land on it: the figure as it is drawn (see B.draw), from the hem to the brim of the hat,
  // carried with its recoil and tilted with its lean (v2.1b; the kit's box stood still and upright while
  // the figure leaned out of it). The cape that trails behind it is not part of it.
  B.bodyBox = function () {
    const b = B.body, down = B.staggered || b.spent || B.dying;
    const th = (b.lean ? G.clamp(b.lean, -0.35, 0.4) : 0) + (down ? 0.28 : 0), fx = K.faceX(b);
    const top = 126, s = Math.sin(th), c = Math.cos(th);
    return { cx: b.x + (b.kx || 0) + fx * s * top / 2, cy: b.y + (b.oy || 0) - c * top / 2, hw: B.w / 2 + Math.abs(s) * 18, hh: top / 2 };
  };
})();
