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
    // its spells already reach anywhere; what it answers is a hero who will not come down out of the air
    answer: 'shards', kiting: (P) => !P.onGround && P.y < FLOOR - 150,
    gaps: [0, 0.95, 0.75, 0.6],
    bags: {
      1: ['shards', 'rime', 'fireball', 'bolts', 'spheres', 'comet', 'invoke'],
      2: ['shards', 'rime', 'fireball', 'bolts', 'spheres', 'firewall', 'crystals', 'storm', 'comet', 'invoke'],
      3: ['shards', 'fireball', 'bolts', 'firewall', 'crystals', 'storm', 'blizzard', 'rime', 'comet', 'invoke'],
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
    return g && k > 0.001 ? { hx: G.lerp(s.hx, g.hx, k), hy: G.lerp(s.hy, g.hy, k), tilt: G.lerp(s.tilt, g.tilt, k) } : s;
  };
  const tip = () => {
    const b = B.body, s = staff(b.cast);
    return { x: b.x + b.face * (s.hx + Math.sin(s.tilt) * 96), y: b.y + s.hy - Math.cos(s.tilt) * 96 };
  };

  B.onRelease = function () { const b = B.body; b.want = 0; b.spent = false; b.charge = 0; b.hidden = false; b.alpha = 1; B.blizz = 0; b.gest = null; b.merge = 0; b.dark = 0; b.track = 0; b.slit = 0; B.readAim = null; };
  B.onInterrupt = function () { B.shards.length = 0; };
  B.onStagger = function () { const b = B.body; b.alpha = 1; b.elem = null; };
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
  function strike(x, tele, w) {
    return H.add({
      kind: 'strike', x, w: w || 64, tele, active: 0.13, fade: 0.2, tint: BOLT, fired: false, pts: null,
      update() {
        if (this.t >= this.tele && !this.fired) { this.fired = true; this.pts = boltPath(this.x, -40, this.x, FLOOR); strikeFx(this.x); }
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
          if (this.t >= c.at && this.t < c.at + this.active && Math.abs(P.x - c.x) < cw / 2 + 5) { this.srcX = c.x; return true; }
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
        return this.started && G.rectsOverlap(P.box(), { cx: this.x, cy: FLOOR - this.hgt / 2, hw: this.hw - 4, hh: this.hgt / 2 - 4 });
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
      hits(Pl) { const m = this.mark; return !!m && m.fired && m.t < m.tele + 0.13 && Math.abs(Pl.x - m.x) < 34 + 7; },
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
    yield* wait((0.75 + (n - 1) * 0.21) * T + 0.55);
  }

  // Ice: the floor freezes outward from the Magus.
  function* atkRime() {
    yield* reposition();
    const b = B.body, T = K.T();
    G.ui.hint('rime', 'Jump as the ice reaches you');
    yield* cast(ICE, 0.35 * T);
    rime(b.x, [-1, 1], T);
    if (K.hard() || B.phase === 3) { yield* wait(1.05); rime(b.x, [-1, 1], T); }
    yield* wait(0.6 * T + 1.3);
  }

  // Fire: a slow ball of flame that leans after the hero and bursts where it lands.
  // great: all three motes went into it. It is slower and bigger, and its blast is wide and takes two health.
  function fireball(speed, great) {
    const P = G.player, o = tip();
    const a = Math.atan2(P.y - 30 - o.y, P.x - o.x);
    G.audio.play('whoosh'); if (great) G.audio.play('roar');
    H.orb(o.x, o.y, Math.cos(a) * speed, Math.sin(a) * speed, {
      r: great ? 34 : 21, slashable: false, tint: great ? { boss: '255,200,150', hot: '255,255,255' } : FIRE, life: great ? 3.2 : 2.6,
      steer(ob, dt) {
        if (ob.t < 1.3) {
          const cur = Math.atan2(ob.vy, ob.vx), want = Math.atan2(P.y - 24 - ob.y, P.x - ob.x);
          const na = cur + G.clamp(G.angDiff(cur, want), -1.5 * dt, 1.5 * dt);
          ob.vx = Math.cos(na) * speed; ob.vy = Math.sin(na) * speed;
        }
        if (ob.life < 0.05) ob.pop();
      },
      onPop(ob) {
        H.blast({ x: ob.x, y: Math.min(ob.y, FLOOR - 12), r: great ? 172 : 96, tele: great ? 0.55 : 0.4, tint: FIRE, dmg: great ? 2 : 1 });
        if ((B.phase >= 2 || great) && ob.y > FLOOR - 60) H.pool({ x: G.clamp(ob.x, WL + 80, WR - 80), w: 160, tele: 0.45, active: 3, tint: FIRE });
      },
    });
  }
  function* atkFireball() {
    yield* reposition();
    const T = K.T();
    // the tell: one mote burning in the staff is an ordinary fireball; all three flying into it is the great one
    if (K.chance([0, 0.25, 0.35, 0.45][B.phase], 'great')) {
      const b = B.body;
      face(); b.merge = 1;
      yield* cast(FIRE, 1.15 * T);
      fireball(K.gentle() ? 330 : 370, true);
      b.merge = 0;
      yield* wait(1.4);
      return;
    }
    const n = 1 + (B.phase >= 2 ? 1 : 0) + (K.hard() ? 1 : 0);
    for (let i = 0; i < n; i++) {
      face();
      yield* cast(FIRE, (i ? 0.5 : 0.8) * T);
      fireball(K.gentle() ? 400 : 470);
      yield* wait(0.45);
    }
    yield* wait(0.9);
  }

  // Lightning: strike after strike where the hero is heading; the last comes as three.
  function* atkBolts() {
    yield* reposition();
    const P = G.player, T = K.T();
    const n = 4 + (B.phase - 1) + (K.hard() ? 1 : 0);
    yield* cast(BOLT, 0.4 * T);
    for (let i = 0; i < n; i++) {
      const x = G.clamp(P.x + P.vx * 0.18 + G.rrand(-14, 14), WL + 40, WR - 40);
      strike(x, 0.5 * T);
      if (i === n - 1) { strike(G.clamp(x - 150, WL + 40, WR - 40), 0.5 * T); strike(G.clamp(x + 150, WL + 40, WR - 40), 0.5 * T); }
      yield* wait(0.3);
    }
    yield* wait(0.5 * T + 0.45);
  }

  // Lightning: bouncing spheres that stay a while. They can be cut down.
  function* atkSpheres() {
    yield* reposition();
    const b = B.body, T = K.T();
    const n = (B.phase === 1 ? 2 : 3) + (K.hard() ? 1 : 0);
    G.ui.hint('spheres', 'The spheres can be cut down');
    yield* cast(BOLT, 0.7 * T);
    for (let i = 0; i < n; i++) {
      const o = tip(), dir = i % 2 ? -b.face : b.face;
      G.audio.play('orb');
      H.orb(o.x, o.y, dir * (150 + i * 45), -260, {
        r: 15, grav: 1150, life: 6.5, tint: BOLT,
        steer(ob) {
          if (ob.y + ob.r >= FLOOR - 2 && ob.vy > 0) { ob.y = FLOOR - ob.r - 2; ob.vy = -(560 + i * 40); G.fx.burst(ob.x, FLOOR - 3, { n: 4, color: BOLT.hot, speed: [60, 220], angle: -Math.PI / 2, spread: 2.4, life: [0.15, 0.3], kind: 'spark', size: [2, 3] }); }
          if ((ob.x < WL + 22 && ob.vx < 0) || (ob.x > WR - 22 && ob.vx > 0)) ob.vx = -ob.vx;
          if (ob.life < 0.05) ob.pop();
        },
      });
      yield* wait(0.22);
    }
    yield* wait(0.8);
  }

  // Fire: a wall of flame crosses the floor.
  function* atkFirewall() {
    yield* reposition();
    const b = B.body, T = K.T();
    G.ui.hint('firewall', 'Stand on a platform, or dash through the flames');
    const dir = b.x < 640 ? 1 : -1;
    yield* cast(FIRE, 0.4 * T);
    firewall(dir, T);
    if (K.hard() || B.phase === 3) { yield* wait(1.1); firewall(-dir, T); }
    yield* wait(0.95 * T + 2.4);
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
    yield* cast(ICE, 0.7 * T);
    G.audio.play('frost');
    const n = (B.phase === 3 || K.hard()) ? 3 : 2;
    const xs = G.shuffle([230, 470, 810, 1050]).filter((x) => Math.abs(x - B.body.x) > 90).slice(0, n);
    const life = (K.gentle() ? 8 : 6.5) * (0.6 + 0.4 * T);
    // they burst one at a time, far enough apart that each ring can be dashed through
    xs.forEach((x, i) => crystal(x + G.rrand(-30, 30), life + i * 0.9));
    void P;
    yield* wait(0.9);
  }

  // Lightning: a cloud that follows the hero while the Magus goes on casting.
  function* atkStorm() {
    yield* reposition();
    const T = K.T();
    G.ui.hint('storm', 'The cloud strikes below itself. Keep out from under it');
    yield* cast(BOLT, 0.7 * T);
    if (!H.list.some((h) => h.kind === 'cloud')) cloud(B.phase === 3 || K.hard() ? 5 : 4, T);
    yield* wait(0.5);
  }

  // Ice: wind drives the hero back while icicles fall.
  function* atkBlizzard() {
    const P = G.player, T = K.T();
    const side = P.x < 640 ? 1 : -1; // the Magus takes the far side and blows the hero towards the near wall
    yield* blink(640 + side * 450, GY);
    const b = B.body;
    G.ui.hint('blizzard', 'The wind pushes you back. Icicles fall where the floor is marked');
    yield* cast(ICE, 0.8 * T);
    G.audio.play('tide'); G.audio.play('frost');
    B.blizz = -side;
    const dur = 4.2, n = K.hard() ? 11 : 9;
    let e = 0, next = 0.3, i = 0;
    while (e < dur) {
      const dt = yield;
      e += dt; next -= dt;
      G.wind = -side * 185 * Math.min(1, e / 0.4) * Math.min(1, (dur - e) / 0.4);
      if (next <= 0 && i < n) {
        next = dur / (n + 1); i++;
        H.meteor({ x: G.clamp(P.x + (P.vx + G.wind) * 0.3 + G.rrand(-34, 34), WL + 40, WR - 40), tele: 0.78 * T, blastR: 46, tint: ICE });
      }
    }
    G.wind = 0; B.blizz = 0; b.want = 0;
    yield* wait(0.8);
  }

  // The last verse, once: ice, then fire, then lightning, and the Magus is spent.
  function* atkCataclysm() {
    const b = B.body, T = K.T();
    G.ui.callout('CATACLYSM', 'Ice, then fire, then lightning');
    yield* blink(640, FLOOR - 170);
    b.want = 1; B.spin = 5;
    setElem(ICE);
    rime(640, [-1, 1], T, 0.085);
    yield* wait(0.6 * T + 0.75);
    setElem(FIRE);
    G.audio.play('charge', { dur: 1.25 * T });
    H.blast({ x: 640, y: FLOOR - 30, r: 330, tele: 1.25 * T, tint: FIRE, sfx: 'boom' });
    yield* wait(1.25 * T + 0.3);
    setElem(BOLT);
    const lanes = 9, lw = (WR - WL) / lanes;
    let parity = G.rng() < 0.5 ? 0 : 1;
    for (let v = 0; v < 3; v++) {
      for (let i = 0; i < lanes; i++) if (i % 2 === parity) strike(WL + (i + 0.5) * lw, 0.85 * T, lw - 16);
      yield* wait(0.85 * T + 0.15);
      parity = 1 - parity;
    }
    // spent: the Magus drops and lies open
    B.spin = 0.3; b.elem = null; b.want = 0; b.spent = true; b.exposed = true;
    yield* tween(b, { y: FLOOR }, 0.45, E.inCubic);
    G.fx.shake(8); G.audio.play('boom');
    G.fx.thud(b.x, FLOOR, 1.2);
    G.ui.callout('SPENT', 'Strike now');
    yield* wait(3.4);
    b.spent = false; b.exposed = false; b.homeY = GY; B.spin = 1;
  }

  const coda = (spell, el) => function* () {
    yield* spell();
    if (B.phase < 3) return;
    setElem(el === BOLT ? ICE : BOLT); B.body.want = 1;
    echo(el);
    yield* wait(0.85 * K.T() + 0.3);
  };
  // Comet: a slow star that follows the hero. It cannot be outrun for ever; the answer is to strike
  // it, which sends it back at the Magus. In the last phase (and on Merciless patterns) the Magus
  // bats it back again, faster, and it must be struck a second time.
  const STAR = { boss: '255,214,140', hot: '255,250,230' };
  function* atkComet() {
    yield* reposition(true);
    const T = K.T(), b = B.body, P = G.player;
    G.ui.hint('comet', 'Strike the star to send it back at the Magus');
    face();
    yield* cast(STAR, 0.9 * T);
    const o = tip(), sp = K.gentle() ? 210 : K.hard() ? 280 : 245;
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
    while (!ob.dead) { const dt = yield; b.charge = Math.max(0, b.charge - dt * 3); face(); }
    b.charge = 0; b.want = 0;
    if (ob.struck) {
      // its own star in its face: it reels, open
      b.exposed = true;
      yield* wait(1.7);
      b.exposed = false;
    } else yield* wait(0.5);
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
      yield* cast(BOLT, 0.72 * T);
      if (g === 'high') {
        strike(G.clamp(P.x + P.vx * 0.15, WL + 40, WR - 40), late, 88);
      } else if (g === 'level') {
        H.beam({ ox: b.x + b.face * 44, oy: FLOOR - 30, ang: b.face > 0 ? 0 : Math.PI, width: 30, tele: late, lock: late, active: 0.16, tint: BOLT, sfx: 'zap', clip: false, maxLen: 1500 });
      } else {
        // through the floor: a mark under the staff, then waves both ways
        const m = K.columnMark(b.x + b.face * 26, 70);
        let e = 0;
        while (e < late) { e += yield; m.k = e / late; m.locked = e > late * 0.6; }
        m.dead = true;
        G.audio.play('zap'); G.fx.shake(7);
        G.fx.thud(b.x + b.face * 26, FLOOR, 0.9, { col: BOLT.boss });
        H.shockwave(b.x + b.face * 40, b.face, 640, 46, BOLT);
        H.shockwave(b.x - b.face * 10, -b.face, 640, 46, BOLT);
      }
      if (g !== 'plant') yield* wait(late);
      yield* wait(0.3);
      b.gest = null;
      yield* wait(0.3);
    }
    yield* wait(0.5);
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
        return this.burst && this.t < fire + FLY + 0.1 && touches(Pl, this.ax, this.ay, BURST_R);
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

  // Back to rest. The staff comes down and what is left of the spell leaves it in its element's own
  // way: ice drops off the head of the staff in splinters, fire goes out in smoke, lightning crawls
  // down the wood and earths itself. Then the Magus sinks a little in the air and floats back up.
  const ELEM_OF = { shards: ICE, rime: ICE, crystals: ICE, blizzard: ICE, fireball: FIRE, firewall: FIRE, comet: FIRE, cataclysm: FIRE, bolts: BOLT, spheres: BOLT, storm: BOLT, invoke: BOLT, blacksun: VOID, foresight: VOID };
  B.recover = function* (name) {
    const b = B.body, el = ELEM_OF[name] || ICE;
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
    while (e < dur) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / dur);
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
    D.chainStep(B.cape, b.x - b.face * 12, b.y - 92, dt, { seg: 13, grav: 50, drift: 24, face: b.face, wave: 10, rate: 5 });
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
    else if (el === FIRE) { ctx.beginPath(); ctx.moveTo(x, y - 7 * s); ctx.quadraticCurveTo(x + 6 * s, y + 1 * s, x, y + 5 * s); ctx.quadraticCurveTo(x - 6 * s, y + 1 * s, x, y - 7 * s); ctx.closePath(); }
    else if (el.isVoid) { ctx.beginPath(); ctx.arc(x, y, 5 * s, 0, G.TAU); } // a black sun in little
    else D.poly(ctx, [x, y - 6.5 * s, x + 1.6 * s, y - 1.6 * s, x + 6.5 * s, y, x + 1.6 * s, y + 1.6 * s, x, y + 6.5 * s, x - 1.6 * s, y + 1.6 * s, x - 6.5 * s, y, x - 1.6 * s, y - 1.6 * s]);
  }
  // dk: how far this mote has gone out (corrupted, the Black Sun): a black cinder rimmed in blood
  function mote(ctx, el, x, y, s, a, dk) {
    const lit = a * (1 - (dk || 0)), out = a * (dk || 0), ga = ctx.globalAlpha;
    if (lit > 0.01) {
      D.glow(ctx, el.boss, x, y, 15 * s, (el.isVoid ? 0.55 : 0.9) * lit);
      ctx.globalAlpha = ga * lit;
      ctx.fillStyle = el.isVoid ? '#050003' : G.rgba(el.hot, 1);
      moteShape(ctx, el, x, y, s); ctx.fill();
      if (el.isVoid) { ctx.strokeStyle = G.rgba(VOID.hot, 0.8); ctx.lineWidth = 1.3; ctx.stroke(); }
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
    const k = G.clamp(1 - (FLOOR - b.y) / 300, 0.3, 1) * b.alpha;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.4 * k) + ')';
    ctx.beginPath(); ctx.ellipse(b.x, FLOOR + 3, 34 * k, 6 * k, 0, 0, G.TAU); ctx.fill();
  };

  // The frozen floor and the storm overhead: drawn over the arena, under the hero.
  B.drawOver = function (ctx) {
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
    if (b.hidden || b.alpha <= 0.01) return;

    const down = B.staggered || b.spent || B.dying;
    const el = b.elem, pal = G.pal();
    const col = el ? el.boss : pal.boss, hot = el ? el.hot : pal.hot;
    const bob = down ? 0 : Math.sin(B.t * 2.2) * 4;
    const c = b.cast, sw = Math.sin(B.t * 1.7) * 2.2;
    const jx = b.jit ? G.rand(-b.jit, b.jit) : 0;

    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // cape, in world space
    D.ribbon(ctx, B.cape.map((p) => ({ x: p.x + jx, y: p.y + bob })), 30, 60, 13);
    ctx.fillStyle = '#070919'; ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.4); ctx.lineWidth = 1.5; ctx.stroke();

    ctx.translate(b.x + b.kx + jx, b.y + bob);
    K.recoil(ctx, b);
    ctx.scale(K.faceX(b), 1); // (a turn narrows the figure through it: see K.turn)
    if (down) ctx.rotate(0.28);

    D.glow(ctx, col, 0, -70, 130, 0.2 + 0.2 * c);

    // the three motes circle the Magus; the one in use burns in the staff
    const motes = ELEMS.map((e, i) => {
      const a = B.t * 1.5 * B.spin + i * G.TAU / 3, mk = b.mk || 0, S0 = staff(c);
      const tx = S0.hx + Math.sin(S0.tilt) * 96, ty = S0.hy - Math.cos(S0.tilt) * 96; // the staff's head
      return { e, x: G.lerp(Math.cos(a) * 56, tx, mk), y: G.lerp(-62 + Math.sin(a) * 15, ty, mk), back: Math.sin(a) < 0 && mk < 0.5, dk: (b.dk && b.dk[i]) || 0 };
    });
    const dim = down ? 0.35 : 1;
    for (const m of motes) if (m.back && (m.e !== el || b.mk > 0.05)) mote(ctx, m.e, m.x, m.y, 0.8, 0.7 * dim, m.dk);

    // robe: narrow at the waist, wide at the hem and torn into wisps
    const g = ctx.createLinearGradient(0, -96, 0, 6);
    g.addColorStop(0, '#2c3690'); g.addColorStop(0.5, '#181d58'); g.addColorStop(1, '#070920');
    ctx.fillStyle = g;
    D.poly(ctx, [-15, -95, 15, -95, 11, -64, 15, -44, 22 + sw, -22, 29 + sw, -6, 21 + sw, 5, 15 + sw * 0.6, -7, 8, 7, 1, -6, -6 + sw * 0.5, 6, -12, -7, -19 + sw, 4, -28 + sw, -9, -21, -30, -14, -46, -10, -64]);
    ctx.fill();
    // light along the leading edge
    ctx.fillStyle = G.rgba(col, 0.28);
    D.poly(ctx, [15, -95, 11, -64, 15, -44, 22 + sw, -22, 29 + sw, -6, 25 + sw, -7, 18 + sw, -24, 11, -44, 7.5, -64, 11, -95]); ctx.fill();
    // hem trim
    ctx.strokeStyle = G.rgba(col, 0.75); ctx.lineWidth = 1.6;
    ctx.beginPath();
    [[29 + sw, -6], [21 + sw, 5], [15 + sw * 0.6, -7], [8, 7], [1, -6], [-6 + sw * 0.5, 6], [-12, -7], [-19 + sw, 4], [-28 + sw, -9]].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    // stole: two hanging bands marked with runes
    for (const sx of [-5.5, 3]) {
      ctx.fillStyle = '#0a0c26';
      D.poly(ctx, [sx - 2.6, -92, sx + 2.6, -92, sx + 3 + sw * 0.3, -30, sx + sw * 0.4, -23, sx - 3 + sw * 0.3, -30]); ctx.fill();
      ctx.fillStyle = G.rgba(col, 0.9);
      for (let i = 0; i < 4; i++) ctx.fillRect(sx - 1.4, -58 + i * 7, 2.8, 1.8);
      D.poly(ctx, [sx - 3 + sw * 0.3, -30, sx + 3 + sw * 0.3, -30, sx + sw * 0.4, -23]); ctx.fill();
    }
    // belt and its stone
    ctx.strokeStyle = '#05060f'; ctx.lineWidth = 5; D.line(ctx, -10, -64, 11, -64);
    ctx.strokeStyle = G.rgba(col, 0.9); ctx.lineWidth = 1.5; D.line(ctx, -10, -66, 11, -66);
    D.glow(ctx, col, 0, -64, 10, 0.9);
    ctx.fillStyle = G.rgba(hot, 1); D.poly(ctx, [0, -68.5, 3.4, -64, 0, -59.5, -3.4, -64]); ctx.fill();

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

    // (Foresight: the head turns on the neck to follow the hero)
    ctx.save();
    if (b.hd) { ctx.translate(2, -100); ctx.rotate(b.hd); ctx.translate(-2, 100); }
    // a face of nothing but two burning eyes; reading the hero, they narrow to one slit of light
    const sl = b.sl || 0;
    ctx.fillStyle = '#020308';
    ctx.beginPath(); ctx.ellipse(2, -108, 8.5, 9.5, 0, 0, G.TAU); ctx.fill();
    D.glow(ctx, col, 6.5, -108, 13 * (1 - 0.35 * sl), 1);
    ctx.save();
    ctx.translate(6.5, -108.8); ctx.scale(1 + 0.15 * sl, 1 - 0.75 * sl); ctx.translate(-6.5, 108.8);
    ctx.fillStyle = G.rgba(hot, 1);
    D.poly(ctx, [1.6, -110.4, 5.6, -108.6, 2.2, -107]); ctx.fill();
    D.poly(ctx, [7.6, -108.8, 11.4, -110.8, 10.6, -107.2]); ctx.fill();
    ctx.restore();
    if (sl > 0.02) {
      ctx.save(); ctx.translate(7, -109); ctx.scale(1.9, 0.38); D.glow(ctx, col, 0, 0, 16, 0.9 * sl); ctx.restore();
      ctx.strokeStyle = G.rgba(hot, sl); ctx.lineWidth = 1.6; D.line(ctx, 0, -108.7, 13, -109.3);
    }
    // hat: a tall crooked crown over a wide brim
    ctx.fillStyle = '#202a78';
    D.poly(ctx, [-14, -119, -12, -137, -17, -151, -28, -164, -38, -160, -24, -155, -11, -157, 2, -143, 13, -119]); ctx.fill();
    ctx.fillStyle = G.rgba(col, 0.22);
    D.poly(ctx, [13, -119, 2, -143, -11, -157, -7, -152, 4, -139, 9, -119]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.95); ctx.lineWidth = 3.4; D.line(ctx, -13, -123.5, 12, -123.5);
    ctx.fillStyle = '#141a52';
    ctx.beginPath(); ctx.ellipse(1, -118, 31, 6.5, -0.08, 0, G.TAU); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(1, -118, 31, 6.5, -0.08, 0.1, Math.PI - 0.1); ctx.stroke();
    // a charm hanging from the tip
    ctx.strokeStyle = G.rgba(col, 0.6); ctx.lineWidth = 1; D.line(ctx, -38, -160, -39 - sw, -148);
    D.glow(ctx, col, -39 - sw, -146, 9, 0.9);
    ctx.fillStyle = G.rgba(hot, 1); ctx.beginPath(); ctx.arc(-39 - sw, -146, 2.2, 0, G.TAU); ctx.fill();
    ctx.restore();

    // the staff, taller than its bearer, and the arm that holds it
    const S = staff(c);
    // raised flat overhead (the Black Sun) it is held in both hands, arms at full stretch
    const sunK = (b.gest || b.gestWas) === 'sun' ? (b.gk || 0) : 0, reach = 18 + 11 * sunK;
    if (sunK > 0.02) {
      const gx = S.hx - Math.sin(S.tilt) * 38, gy = S.hy + Math.cos(S.tilt) * 38;
      const k2 = D.ik(-11, -92, gx, gy, reach, reach, -1);
      ctx.globalAlpha = b.alpha * Math.min(1, sunK * 1.5);
      ctx.fillStyle = '#1a2160';
      D.limb(ctx, -11, -92, k2.jx, k2.jy, 9, 8); ctx.fill();
      D.limb(ctx, k2.jx, k2.jy, k2.ex, k2.ey, 8, 6); ctx.fill();
      ctx.fillStyle = '#03040a'; ctx.beginPath(); ctx.arc(k2.ex, k2.ey, 3.4, 0, G.TAU); ctx.fill();
      ctx.globalAlpha = b.alpha;
    }
    ctx.save();
    ctx.translate(S.hx, S.hy); ctx.rotate(S.tilt);
    ctx.strokeStyle = '#04050c'; ctx.lineWidth = 5.5; D.line(ctx, 0, 66, 0, -82);
    ctx.strokeStyle = '#39449c'; ctx.lineWidth = 2.8; D.line(ctx, 0, 66, 0, -82);
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
    const k = D.ik(13, -92, S.hx, S.hy, reach, reach, 1);
    ctx.fillStyle = '#28338c';
    D.limb(ctx, 13, -92, k.jx, k.jy, 10, 9); ctx.fill();
    D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 9, 7); ctx.fill();
    // a long sleeve hangs from the forearm
    ctx.fillStyle = '#1c2468';
    D.poly(ctx, [k.jx - 3, k.jy + 2, k.ex + 1, k.ey + 3, G.lerp(k.jx, k.ex, 0.45) - 2 - sw, Math.max(k.jy, k.ey) + 30]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.7); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(k.ex + 1, k.ey + 3); ctx.lineTo(G.lerp(k.jx, k.ex, 0.45) - 2 - sw, Math.max(k.jy, k.ey) + 30); ctx.lineTo(k.jx - 3, k.jy + 2); ctx.stroke();
    ctx.fillStyle = '#03040a'; ctx.beginPath(); ctx.arc(k.ex, k.ey, 3.6, 0, G.TAU); ctx.fill();
    if (c > 0.3) D.glow(ctx, col, k.ex, k.ey, 14 + 10 * b.charge, c * 0.8);

    for (const m of motes) if (!m.back && (m.e !== el || b.mk > 0.05)) mote(ctx, m.e, m.x, m.y, 1 + 0.5 * (b.mk || 0), dim, m.dk);
    if (b.mk > 0.3) { const S1 = staff(c); D.glow(ctx, '255,255,255', S1.hx + Math.sin(S1.tilt) * 96, S1.hy - Math.cos(S1.tilt) * 96, 70 * b.mk, 0.8 * b.mk); }

    if (b.flash > 0) D.glow(ctx, '255,255,255', 0, -70, 80, b.flash * 0.3); // (v1.6d: a tint, not a white dome)
    ctx.restore();
  };

  G.makeBoss(B);
})();
