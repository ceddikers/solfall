// Solfall - the hero: movement, dash, sword, Star Lance, mending, and how they are drawn.
'use strict';
(function () {
  const FLOOR = G.FLOOR;
  const C = G.PLAYER = {
    RUN: 335, ACC_G: 4400, ACC_A: 3000, GRAV: 2500, JUMP: 830, JUMP2: 740, MAXFALL: 1500,
    DASH_SPEED: 940, DASH_T: 0.16, DASH_CD: 0.34, IFRAME: 0.24,
    COYOTE: 0.09, BUFFER: 0.13, HURT_INV: 1.15, HEAL_T: 0.85,
    SEG: 100, SEGS: 3,
    GAIN_HIT: 9, GAIN_HEAVY: 14, GAIN_PERFECT: 34, GAIN_ORB: 6,
    LANCE_DMG: 42, LANCE_SPEED: 1700,
  };
  const STAR = G.COL.star, HOT = G.COL.starHot;

  const P = G.player = {};
  G.shots = [];
  G.wind = 0;

  const _box = { cx: 0, cy: 0, hw: 11, hh: 21 };
  P.box = function () { _box.cx = P.x; _box.cy = P.y - 22; return _box; };

  P.reset = function () {
    Object.assign(P, {
      x: 300, y: FLOOR, vx: 0, vy: 0, facing: 1,
      onGround: true, plat: null, coyote: 0, dropT: 0, jumpHeld: false, airJumps: 1,
      jumpBuf: 0, atkBuf: 0, dashBuf: 0, flareBuf: 0,
      dashT: 0, dashCd: 0, dashDir: 1, airDash: true, iframes: 0, pdDone: false, ghostT: 0,
      inv: 0, stun: 0, hp: G.diff().hp, maxHp: G.diff().hp,
      ember: 0, healT: 0, healLock: false,
      atk: null, atkCd: 0, combo: -1, comboT: 0,
      dead: false, deadT: 0, hidden: false,
      squash: 0, runT: 0, hurtFlash: 0, emberFlash: 0,
      scarf: [], ghosts: [], slashes: [],
      stats: { dmg: 0, hits: 0, perfect: 0, heals: 0, lances: 0 },
    });
    for (let i = 0; i < 10; i++) P.scarf.push({ x: P.x, y: P.y - 36 });
    G.shots.length = 0;
    G.wind = 0;
  };

  function ground() {
    P.vy = 0; P.onGround = true; P.airJumps = 1; P.airDash = true; P.coyote = C.COYOTE;
  }

  P.gain = function (n) {
    const before = Math.floor(P.ember / C.SEG);
    P.ember = Math.min(C.SEG * C.SEGS, P.ember + n);
    if (Math.floor(P.ember / C.SEG) > before) { G.audio.play('segment'); P.emberFlash = 1; }
  };

  // ---------------------------------------------------------------- update
  P.update = function (dt) {
    const I = G.input;
    P.hurtFlash = Math.max(0, P.hurtFlash - dt * 3);
    P.emberFlash = Math.max(0, P.emberFlash - dt * 2.5);
    P.squash *= Math.exp(-11 * dt);
    updateScarf(dt);
    for (let i = P.ghosts.length - 1; i >= 0; i--) { P.ghosts[i].life -= dt; if (P.ghosts[i].life <= 0) P.ghosts.splice(i, 1); }
    for (let i = P.slashes.length - 1; i >= 0; i--) { P.slashes[i].t += dt; if (P.slashes[i].t >= P.slashes[i].dur) P.slashes.splice(i, 1); }

    if (P.dead) { P.deadT += dt; return; }
    if (P.hidden) return;

    P.inv = Math.max(0, P.inv - dt);
    P.iframes = Math.max(0, P.iframes - dt);
    P.dashCd = Math.max(0, P.dashCd - dt);
    P.atkCd = Math.max(0, P.atkCd - dt);
    P.comboT = Math.max(0, P.comboT - dt);
    P.jumpBuf = Math.max(0, P.jumpBuf - dt);
    P.atkBuf = Math.max(0, P.atkBuf - dt);
    P.dashBuf = Math.max(0, P.dashBuf - dt);
    P.flareBuf = Math.max(0, P.flareBuf - dt);
    P.dropT = Math.max(0, P.dropT - dt);
    if (!P.onGround) P.coyote = Math.max(0, P.coyote - dt);

    const ctl = G.playerControl();
    let mx = ctl ? I.axisX() : 0;
    const up = ctl && I.down.up, down = ctl && I.down.down;
    if (ctl) {
      if (I.pressed.jump) P.jumpBuf = C.BUFFER;
      if (I.pressed.attack) P.atkBuf = C.BUFFER;
      if (I.pressed.dash) P.dashBuf = C.BUFFER;
      if (I.pressed.flare) P.flareBuf = C.BUFFER;
    }

    // --- mend: hold to spend one segment of Starlight for one health
    if (!I.down.heal) P.healLock = false;
    const wantHeal = ctl && I.down.heal && !P.healLock;
    if (wantHeal && P.onGround && P.dashT <= 0 && !P.atk && P.stun <= 0 && P.hp < P.maxHp && P.ember >= C.SEG) {
      if (P.healT === 0) G.audio.play('healStart');
      P.healT += dt;
      mx = 0;
      if (Math.random() < 0.6) {
        const a = G.rand(0, G.TAU), r = G.rand(40, 70);
        G.fx.spawn({ x: P.x + Math.cos(a) * r, y: P.y - 24 + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.4, vy: -Math.sin(a) * r * 2.4, life: 0.36, size: 3, color: STAR });
      }
      if (P.jumpBuf > 0 || P.dashBuf > 0) { P.healT = 0; P.healLock = true; }
      else if (P.healT >= C.HEAL_T) {
        P.hp++; P.ember -= C.SEG; P.healT = 0; P.healLock = true; P.stats.heals++;
        G.audio.play('heal');
        G.fx.ring(P.x, P.y - 24, { r0: 10, r1: 90, life: 0.45, color: STAR, width: 6 });
        G.fx.burst(P.x, P.y - 24, { n: 18, color: HOT, speed: [60, 240], life: [0.3, 0.7], size: [3, 6] });
        G.fx.text(P.x, P.y - 70, 'MENDED', { color: STAR, size: 16 });
      }
    } else {
      if (ctl && I.pressed.heal && P.hp < P.maxHp && P.ember < C.SEG) { G.audio.play('empty'); P.emberFlash = -1; }
      P.healT = 0;
    }

    // --- dash
    if (P.dashBuf > 0 && P.dashT <= 0 && P.dashCd <= 0 && P.stun <= 0 && (P.onGround || P.airDash)) {
      P.dashBuf = 0;
      P.dashT = C.DASH_T; P.dashDir = mx || P.facing; P.facing = P.dashDir;
      P.iframes = C.IFRAME; P.pdDone = false;
      if (!P.onGround) P.airDash = false;
      P.atk = null; P.healT = 0; P.ghostT = 0;
      G.audio.play('dash');
      G.fx.burst(P.x, P.y - 22, { n: 8, color: STAR, speed: [80, 300], angle: P.dashDir > 0 ? Math.PI : 0, spread: 0.9, life: [0.15, 0.4], kind: 'spark', size: [2, 3] });
    }

    // --- horizontal movement
    if (P.dashT > 0) {
      P.dashT -= dt;
      P.vx = P.dashDir * C.DASH_SPEED; P.vy = 0;
      P.ghostT -= dt;
      if (P.ghostT <= 0) { P.ghostT = 0.028; P.ghosts.push({ x: P.x, y: P.y, f: P.facing, life: 0.26 }); }
      if (P.dashT <= 0) { P.vx = P.dashDir * C.RUN * 0.85; P.dashCd = C.DASH_CD; }
    } else if (P.stun > 0) {
      P.stun -= dt;
      P.vx *= Math.exp(-2.5 * dt);
    } else {
      const target = mx * C.RUN;
      const acc = (P.onGround ? C.ACC_G : C.ACC_A) * dt;
      if (P.vx < target) P.vx = Math.min(target, P.vx + acc);
      else if (P.vx > target) P.vx = Math.max(target, P.vx - acc);
      if (mx && !P.atk) P.facing = mx;
    }

    // --- jump
    if (P.jumpBuf > 0 && P.dashT <= 0 && P.stun <= 0) {
      if (down && P.plat && P.onGround) {
        P.dropT = 0.24; P.onGround = false; P.plat = null; P.coyote = 0; P.jumpBuf = 0; P.y += 3;
      } else if (P.onGround || P.coyote > 0) {
        P.vy = -C.JUMP; P.onGround = false; P.plat = null; P.coyote = 0; P.jumpBuf = 0; P.jumpHeld = true;
        P.squash = 0.22; P.healT = 0;
        G.audio.play('jump');
        G.fx.burst(P.x, P.y, { n: 5, color: '190,190,210', speed: [30, 110], angle: -Math.PI / 2, spread: 2.6, life: [0.2, 0.4], size: [2, 4] });
      } else if (P.airJumps > 0) {
        P.airJumps--; P.vy = -C.JUMP2; P.jumpBuf = 0; P.jumpHeld = true; P.squash = 0.2;
        G.audio.play('jump2');
        G.fx.ring(P.x, P.y, { r0: 6, r1: 38, life: 0.25, color: STAR, width: 3 });
        G.fx.burst(P.x, P.y, { n: 6, color: STAR, speed: [40, 150], angle: Math.PI / 2, spread: 1.6, life: [0.2, 0.4], size: [2, 4] });
      }
    }
    if (P.jumpHeld && !I.down.jump) { P.jumpHeld = false; if (P.vy < 0) P.vy *= 0.45; }
    if (P.vy >= 0) P.jumpHeld = false;

    // --- gravity and collision
    if (P.dashT <= 0) P.vy = Math.min(C.MAXFALL, P.vy + C.GRAV * dt);
    const fallSpeed = P.vy;
    P.x += (P.vx + G.wind) * dt;
    if (P.x < G.WALL_L + 13) { P.x = G.WALL_L + 13; if (P.vx < 0) P.vx = 0; }
    if (P.x > G.WALL_R - 13) { P.x = G.WALL_R - 13; if (P.vx > 0) P.vx = 0; }
    const prevY = P.y;
    P.y += P.vy * dt;
    let landed = false;
    if (P.plat) {
      if (P.x < P.plat.x - 9 || P.x > P.plat.x + P.plat.w + 9 || P.plat.rise <= 0) {
        P.plat = null; P.onGround = false; P.coyote = C.COYOTE;
      } else { P.y = P.plat.y; P.vy = 0; }
    }
    if (!P.plat) {
      if (P.y >= FLOOR) {
        P.y = FLOOR;
        if (!P.onGround) landed = true;
        ground();
      } else {
        if (P.onGround) { P.onGround = false; }
        if (P.vy >= 0 && P.dropT <= 0) {
          for (const pl of G.arena.platforms) {
            if (pl.rise > 0.05 && P.x >= pl.x - 9 && P.x <= pl.x + pl.w + 9 && prevY <= pl.y + 4 && P.y >= pl.y) {
              P.y = pl.y; P.plat = pl; landed = true; ground(); break;
            }
          }
        }
      }
    }
    if (landed && fallSpeed > 260) {
      P.squash = -0.2;
      G.audio.play('land');
      G.fx.burst(P.x, P.y, { n: 6, color: '190,190,210', speed: [40, 150], angle: -Math.PI / 2, spread: 3, life: [0.2, 0.4], size: [2, 4] });
    }
    if (P.onGround && Math.abs(P.vx) > 40) P.runT += dt * Math.abs(P.vx) * 0.055;

    // --- sword
    if (P.atkBuf > 0 && P.atkCd <= 0 && P.dashT <= 0 && P.stun <= 0 && P.healT === 0) {
      P.atkBuf = 0;
      let kind = up ? 'up' : (down && !P.onGround ? 'down' : 'side');
      if (mx) P.facing = mx;
      if (I.aim.attack) {
        // a mouse click slashes towards the cursor
        const ax = I.mx - P.x, ay = I.my - (P.y - 24);
        const steep = Math.abs(ay) > Math.abs(ax) * 1.15;
        kind = steep && ay < 0 ? 'up' : (steep && ay > 0 && !P.onGround ? 'down' : 'side');
        if (Math.abs(ax) > 6) P.facing = ax > 0 ? 1 : -1;
      }
      let idx = 0;
      if (kind === 'side') { idx = (P.comboT > 0 && P.combo >= 0) ? (P.combo + 1) % 3 : 0; P.combo = idx; P.comboT = 0.6; }
      else { P.combo = -1; P.comboT = 0; }
      const heavy = kind === 'side' && idx === 2;
      P.atk = {
        kind, idx, heavy, t: 0, dur: heavy ? 0.3 : 0.22, a0: 0.02, a1: heavy ? 0.17 : 0.13,
        hit: new Set(), dmg: heavy ? 17 : (kind === 'side' ? 10 : 11), dir: P.facing,
      };
      P.atkCd = heavy ? 0.42 : 0.25;
      P.slashes.push({ kind, dir: P.facing, heavy, idx, t: 0, dur: heavy ? 0.26 : 0.19 });
      G.audio.play(heavy ? 'slash3' : 'slash');
      if (kind === 'side' && P.onGround && P.stun <= 0) P.vx += P.facing * (heavy ? 240 : 100);
    }
    if (P.atk) {
      const a = P.atk;
      a.t += dt;
      if (a.t >= a.a0 && a.t <= a.a1) checkHits(a);
      if (a.t >= a.dur) P.atk = null;
    }

    // --- Star Lance
    if (P.flareBuf > 0 && P.dashT <= 0 && P.stun <= 0 && P.healT === 0) {
      P.flareBuf = 0;
      if (P.ember >= C.SEG) {
        P.ember -= C.SEG; P.stats.lances++;
        let dx = mx, dy = up ? -1 : (down && !P.onGround ? 1 : 0);
        if (I.aim.flare) {
          // a mouse click fires straight at the cursor (never into the floor while standing)
          dx = I.mx - P.x; dy = I.my - (P.y - 24);
          if (P.onGround && dy > 0) dy = 0;
        }
        if (!dx && !dy) dx = P.facing;
        if (dx) P.facing = dx > 0 ? 1 : -1;
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;
        G.shots.push({ x: P.x + dx * 18, y: P.y - 24 + dy * 18, vx: dx * C.LANCE_SPEED, vy: dy * C.LANCE_SPEED, t: 0, hit: new Set(), dmg: C.LANCE_DMG });
        P.vx -= dx * 240;
        if (dy > 0) { P.vy = Math.min(P.vy, -420); }
        G.audio.play('flare');
        G.fx.shake(6);
        G.fx.flash(STAR, 0.12, 0.2);
        G.fx.ring(P.x + dx * 20, P.y - 24 + dy * 20, { r0: 6, r1: 60, life: 0.25, color: HOT, width: 5 });
        G.fx.burst(P.x + dx * 20, P.y - 24 + dy * 20, { n: 14, color: STAR, speed: [100, 500], angle: Math.atan2(dy, dx), spread: 1.1, life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
      } else {
        G.audio.play('empty'); P.emberFlash = -1;
      }
    }
  };

  function atkBox(a) {
    if (a.kind === 'up') return { cx: P.x + a.dir * 6, cy: P.y - 80, hw: 42, hh: 46 };
    if (a.kind === 'down') return { cx: P.x, cy: P.y + 14, hw: 36, hh: 42 };
    return a.heavy
      ? { cx: P.x + a.dir * 54, cy: P.y - 26, hw: 58, hh: 42 }
      : { cx: P.x + a.dir * 48, cy: P.y - 26, hw: 48, hh: 36 };
  }
  P.atkBox = atkBox;

  function touch(hb, t) {
    return t.r ? G.circleRect(t.cx, t.cy, t.r, hb) : G.rectsOverlap(hb, t);
  }
  // Where on the target the hit lands, for sparks.
  function contact(hb, t) {
    if (t.r) {
      const a = Math.atan2(hb.cy - t.cy, hb.cx - t.cx);
      return { x: t.cx + Math.cos(a) * t.r, y: t.cy + Math.sin(a) * t.r };
    }
    return { x: G.clamp(hb.cx, t.cx - t.hw, t.cx + t.hw), y: G.clamp(hb.cy, t.cy - t.hh, t.cy + t.hh) };
  }

  function checkHits(a) {
    const hb = atkBox(a);
    let bounced = false;
    for (const t of G.boss.targets()) {
      if (a.hit.has(t.id) || !touch(hb, t)) continue;
      a.hit.add(t.id);
      const c = contact(hb, t);
      const res = G.boss.damage(a.dmg, t, { x: c.x, y: c.y, heavy: a.heavy, dir: a.dir });
      if (res) {
        P.gain(a.heavy ? C.GAIN_HEAVY : C.GAIN_HIT);
        G.fx.stop(a.heavy ? 0.085 : 0.045);
        G.fx.shake(a.heavy ? 7 : 3);
        G.audio.play(a.heavy ? 'hitHeavy' : 'hit');
        G.fx.burst(c.x, c.y, { n: a.heavy ? 16 : 9, color: HOT, speed: [120, 520], life: [0.12, 0.35], kind: 'spark', size: [2, 4] });
        G.fx.burst(c.x, c.y, { n: 4, color: STAR, speed: [20, 120], life: [0.2, 0.4], size: [5, 10] });
      } else {
        G.audio.play('tink');
        G.fx.burst(c.x, c.y, { n: 4, color: '200,200,220', speed: [60, 200], life: [0.1, 0.25], kind: 'spark', size: [1.5, 2.5] });
      }
      bounced = true;
      if (a.kind === 'side' && !P.onGround) P.vx -= a.dir * 90;
    }
    for (const o of G.hazards.slashables()) {
      if (G.circleRect(o.x, o.y, o.r + 5, hb)) { o.slash(); P.gain(C.GAIN_ORB); bounced = true; }
    }
    if (bounced && a.kind === 'down' && !a.pogo) {
      a.pogo = true;
      P.vy = -680; P.airJumps = 1; P.airDash = true; P.onGround = false; P.plat = null; P.jumpHeld = false;
      P.squash = 0.2;
    }
  }

  // An attack connected while the player was dashing through it.
  function perfect() {
    P.stats.perfect++;
    P.gain(C.GAIN_PERFECT);
    P.dashCd = 0;
    G.audio.play('perfect');
    G.fx.slow(0.22, 0.45);
    G.fx.ring(P.x, P.y - 22, { r0: 12, r1: 110, life: 0.45, color: STAR, width: 5 });
    G.fx.flash(STAR, 0.1, 0.25);
    G.fx.text(P.x, P.y - 74, 'PERFECT', { color: HOT, size: 17, life: 0.9 });
  }

  P.tryHit = function (dmg, srcX, src) {
    if (P.dead || P.hidden || !G.canHurt()) return false;
    if (P.iframes > 0) {
      if (!P.pdDone) { P.pdDone = true; perfect(); }
      return false;
    }
    if (P.inv > 0 || G.debug.god) return false;
    P.hp -= dmg; P.stats.hits++;
    P.inv = C.HURT_INV; P.stun = 0.24; P.dashT = 0; P.atk = null; P.healT = 0; P.hurtFlash = 1;
    const dir = G.sign(P.x - srcX) || -P.facing;
    P.vx = dir * 430; P.vy = (src && src.pop) || -430; P.onGround = false; P.plat = null; P.jumpHeld = false;
    G.fx.stop(0.14); G.fx.shake(13); G.fx.flash('255,50,50', 0.26, 0.35);
    G.fx.burst(P.x, P.y - 22, { n: 16, color: '255,120,120', speed: [100, 420], life: [0.2, 0.55], kind: 'spark', size: [2, 4] });
    G.audio.play('hurt');
    if (P.hp <= 0) { P.hp = 0; die(); }
    return true;
  };

  function die() {
    P.dead = true; P.deadT = 0;
    G.audio.play('die');
    G.fx.slow(0.15, 1.2);
    G.fx.burst(P.x, P.y - 22, { n: 46, color: STAR, speed: [40, 520], life: [0.5, 1.5], size: [3, 8], drag: 2 });
    G.fx.burst(P.x, P.y - 22, { n: 24, color: HOT, speed: [100, 700], life: [0.3, 0.8], kind: 'spark', size: [2, 4] });
    G.fx.ring(P.x, P.y - 22, { r0: 10, r1: 220, life: 0.8, color: STAR, width: 8 });
    G.onPlayerDeath();
  }

  // ---------------------------------------------------------------- lances
  G.updateShots = function (dt) {
    for (let i = G.shots.length - 1; i >= 0; i--) {
      const s = G.shots[i];
      s.t += dt;
      // step in two halves so a fast lance cannot skip through a thin target
      for (let k = 0; k < 2 && !s.dead; k++) {
        s.x += s.vx * dt * 0.5; s.y += s.vy * dt * 0.5;
        for (const t of G.boss.targets()) {
          if (s.hit.has(t.id)) continue;
          const hb = { cx: s.x, cy: s.y, hw: 16, hh: 16 };
          if (!touch(hb, t)) continue;
          s.hit.add(t.id);
          const res = G.boss.damage(s.dmg, t, { x: s.x, y: s.y, heavy: true, lance: true });
          if (res) {
            G.fx.stop(0.09); G.fx.shake(10);
            G.audio.play('flareHit');
            G.fx.ring(s.x, s.y, { r0: 10, r1: 120, life: 0.35, color: HOT, width: 8 });
            G.fx.burst(s.x, s.y, { n: 26, color: STAR, speed: [150, 700], life: [0.2, 0.55], kind: 'spark', size: [2, 5] });
          } else G.audio.play('tink');
        }
        for (const o of G.hazards.slashables()) if (G.dist(o.x, o.y, s.x, s.y) < o.r + 18) o.slash();
      }
      G.fx.spawn({ x: s.x, y: s.y, vx: G.rand(-30, 30), vy: G.rand(-30, 30), life: 0.3, size: 6, color: STAR });
      if (s.y > FLOOR - 4 && s.vy > 0) {
        s.dead = true;
        G.fx.burst(s.x, FLOOR - 4, { n: 14, color: STAR, speed: [100, 460], angle: -Math.PI / 2, spread: 2.4, life: [0.2, 0.5], kind: 'spark', size: [2, 4] });
      }
      if (s.dead || s.x < -100 || s.x > G.W + 100 || s.y < -200 || s.t > 2) G.shots.splice(i, 1);
    }
  };

  G.drawShots = function (ctx) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const s of G.shots) {
      const tx = s.x - s.vx * 0.05, ty = s.y - s.vy * 0.05;
      ctx.strokeStyle = G.rgba(STAR, 0.35); ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.strokeStyle = G.rgba(HOT, 1); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.drawImage(G.fx.glow(STAR), s.x - 34, s.y - 34, 68, 68);
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  // ---------------------------------------------------------------- drawing
  function updateScarf(dt) {
    const s = P.scarf;
    if (!s.length) return;
    s[0].x = P.x - P.facing * 5; s[0].y = P.y - 37;
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i];
      b.y += (26 + i * 3) * dt;
      b.x -= P.facing * 34 * dt;
      b.y += Math.sin(G.t * 9 + i * 0.9) * 10 * dt;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d > 6.5) { b.x = a.x + dx / d * 6.5; b.y = a.y + dy / d * 6.5; }
    }
  }

  // Tapered crescent between two angles.
  function crescent(ctx, cx, cy, R, a0, a1, maxW) {
    const N = 16;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const k = i / N, a = G.lerp(a0, a1, k), w = maxW * Math.pow(Math.sin(Math.PI * k), 0.7) * (0.35 + 0.65 * k);
      const x = cx + Math.cos(a) * (R + w * 0.5), y = cy + Math.sin(a) * (R + w * 0.5);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let i = N; i >= 0; i--) {
      const k = i / N, a = G.lerp(a0, a1, k), w = maxW * Math.pow(Math.sin(Math.PI * k), 0.7) * (0.35 + 0.65 * k);
      ctx.lineTo(cx + Math.cos(a) * (R - w * 0.5), cy + Math.sin(a) * (R - w * 0.5));
    }
    ctx.closePath();
  }

  function drawSlashes(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    for (const s of P.slashes) {
      const k = s.t / s.dur;
      const head = G.ease.outCubic(Math.min(1, k * 2.4));
      const alpha = Math.pow(1 - k, 1.3);
      let cx, cy, R, a0, a1;
      ctx.save();
      ctx.translate(P.x, P.y);
      if (s.kind === 'up') { cx = 0; cy = -50; R = 62; a0 = -Math.PI + 0.3; a1 = -0.3; if (s.dir < 0) ctx.scale(-1, 1); }
      else if (s.kind === 'down') { cx = 0; cy = -14; R = 58; a0 = 0.3; a1 = Math.PI - 0.3; if (s.dir < 0) ctx.scale(-1, 1); }
      else {
        ctx.scale(s.dir, 1);
        cx = 6; cy = -26; R = s.heavy ? 86 : 70;
        a0 = -1.25; a1 = 1.15;
        if (s.idx === 1) { a0 = 1.2; a1 = -1.2; }
        if (s.heavy) { a0 = -1.7; a1 = 1.35; }
      }
      const end = G.lerp(a0, a1, head);
      const start = G.lerp(a0, a1, Math.max(0, head - 0.8 + k * 0.5));
      crescent(ctx, cx, cy, R, start, end, s.heavy ? 36 : 26);
      ctx.fillStyle = G.rgba(STAR, 0.75 * alpha); ctx.fill();
      crescent(ctx, cx, cy, R + 2, start, end, s.heavy ? 15 : 10);
      ctx.fillStyle = G.rgba(HOT, alpha); ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function silhouette(ctx) {
    ctx.beginPath();
    ctx.moveTo(-9, -37); ctx.quadraticCurveTo(0, -42, 9, -37);
    ctx.lineTo(12, -12); ctx.lineTo(-13, -12); ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(1, -45, 9, 0, G.TAU); ctx.fill();
  }

  function drawBody(ctx) {
    const sp = Math.abs(P.vx);
    const air = !P.onGround;
    // a slow breath while standing still
    const sq = P.squash + (!air && sp < 20 ? Math.sin(G.t * 3.2) * 0.018 : 0);
    ctx.save();
    ctx.translate(P.x, P.y);
    ctx.scale(P.facing, 1);
    ctx.rotate(G.clamp(P.vx * P.facing / C.RUN, -1.6, 1.6) * 0.1);
    ctx.scale(1 - sq * 0.55, 1 + sq);

    // legs
    ctx.strokeStyle = '#080c16'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const run = P.onGround && sp > 40;
    for (let i = 0; i < 2; i++) {
      const ph = P.runT + i * Math.PI;
      let fx = (i ? 4 : -4), fy = 0;
      if (run) { fx += Math.sin(ph) * 9; fy = -Math.max(0, Math.cos(ph)) * 6; }
      else if (air) { fx += (i ? 5 : -7); fy = -5 - (P.vy < 0 ? 4 : 0); }
      ctx.beginPath(); ctx.moveTo(i ? 3 : -3, -15); ctx.lineTo(fx, fy - 1); ctx.stroke();
    }

    // blade: sheathed on the back, or following the swing
    if (!P.atk) {
      ctx.strokeStyle = G.rgba(STAR, 0.9); ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-5, -32); ctx.lineTo(-17, -7); ctx.stroke();
    } else {
      const a = P.atk, k = G.ease.outCubic(Math.min(1, a.t / (a.dur * 0.55)));
      let a0 = -1.9, a1 = 1.3;
      if (a.kind === 'up') { a0 = -2.9; a1 = -0.5; }
      else if (a.kind === 'down') { a0 = 0.2; a1 = 2.7; }
      else if (a.idx === 1) { a0 = 1.5; a1 = -1.6; }
      const ang = G.lerp(a0, a1, k);
      const sx = 3, sy = -31, len = a.heavy ? 44 : 38;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(STAR, 0.5); ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(sx + Math.cos(ang) * 8, sy + Math.sin(ang) * 8); ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len); ctx.stroke();
      ctx.strokeStyle = G.rgba(HOT, 1); ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(sx + Math.cos(ang) * 6, sy + Math.sin(ang) * 6); ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    // cloak
    const sway = G.clamp(P.vx * P.facing * 0.022, -9, 9);
    const g = ctx.createLinearGradient(0, -40, 0, -10);
    g.addColorStop(0, '#22365e'); g.addColorStop(1, '#0a1020');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-9, -37); ctx.quadraticCurveTo(0, -42, 9, -37);
    ctx.lineTo(12, -13);
    ctx.quadraticCurveTo(2, -9, -13 - sway, -11 + (air ? -3 : 0));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(STAR, 0.55); ctx.lineWidth = 1.4; ctx.stroke();

    // hood and visor
    ctx.fillStyle = '#101a30';
    ctx.beginPath(); ctx.arc(1, -45, 9.5, 0, G.TAU); ctx.fill();
    ctx.strokeStyle = G.rgba(STAR, 0.6); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#060a14';
    ctx.beginPath(); ctx.ellipse(4, -44, 5.5, 4.5, 0, 0, G.TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(G.fx.glow(STAR), -6, -55, 22, 22);
    ctx.fillStyle = G.rgba(HOT, 1);
    ctx.beginPath(); ctx.ellipse(5.5, -44.5, 3.2, 1.5, 0, 0, G.TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    if (P.hurtFlash > 0) {
      ctx.globalAlpha = P.hurtFlash;
      ctx.fillStyle = '#ff8a8a';
      silhouette(ctx);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawScarf(ctx) {
    const s = P.scarf;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 1; i < s.length; i++) {
      const k = 1 - i / s.length;
      ctx.strokeStyle = G.rgba(STAR, 0.25 + 0.65 * k);
      ctx.lineWidth = 1.5 + 4.5 * k;
      ctx.beginPath(); ctx.moveTo(s[i - 1].x, s[i - 1].y); ctx.lineTo(s[i].x, s[i].y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // A soft shadow on whatever is below the hero; it shrinks with height, which helps judge landings.
  P.drawShadow = function (ctx) {
    if (P.hidden || P.dead) return;
    let gy = FLOOR;
    for (const pl of G.arena.platforms) {
      if (pl.rise > 0.05 && P.x >= pl.x - 9 && P.x <= pl.x + pl.w + 9 && P.y <= pl.y + 4) gy = Math.min(gy, pl.y);
    }
    const k = G.clamp(1 - (gy - P.y) / 280, 0.25, 1);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.42 * k) + ')';
    ctx.beginPath(); ctx.ellipse(P.x, gy + 3, 17 * k, 4.5 * k, 0, 0, G.TAU); ctx.fill();
  };

  P.draw = function (ctx) {
    if (P.hidden) return;
    // dash afterimages
    ctx.globalCompositeOperation = 'lighter';
    for (const gh of P.ghosts) {
      ctx.save();
      ctx.translate(gh.x, gh.y); ctx.scale(gh.f, 1);
      ctx.fillStyle = G.rgba(STAR, 0.45 * (gh.life / 0.26));
      silhouette(ctx);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (P.dead) return;

    // soft light the hero carries
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.28;
    ctx.drawImage(G.fx.glow(STAR), P.x - 70, P.y - 92, 140, 140);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const blink = P.inv > 0 && P.iframes <= 0 && Math.floor(G.t * 28) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    drawScarf(ctx);
    drawBody(ctx);
    ctx.globalAlpha = 1;
    drawSlashes(ctx);

    // mend channel
    if (P.healT > 0) {
      const k = P.healT / C.HEAL_T;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(STAR, 0.3); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(P.x, P.y - 24, 40, 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = G.rgba(HOT, 0.95); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(P.x, P.y - 24, 40, -Math.PI / 2, -Math.PI / 2 + G.TAU * k); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  };
})();
