// Solfall - the hero. Movement, dash and mending are shared; the weapon and the special come from
// the chosen hero (see G.HEROES in run.js): Vesper's sword and lance, Aster's maul and Starfall,
// Lune's bow and volley.
'use strict';
(function () {
  const FLOOR = G.FLOOR;
  const C = G.PLAYER = {
    RUN: 335, ACC_G: 4400, ACC_A: 3000, GRAV: 2500, JUMP: 830, JUMP2: 740, MAXFALL: 1500,
    DASH_SPEED: 940, DASH_T: 0.16, DASH_CD: 0.34, IFRAME: 0.24,
    COYOTE: 0.09, BUFFER: 0.13, HURT_INV: 1.15, HEAL_T: 0.85,
    SEG: 100, SEGS: 3,
    GAIN_HIT: 8, GAIN_HEAVY: 16, GAIN_PERFECT: 34, GAIN_ORB: 6,
    LANCE_DMG: 42, LANCE_SPEED: 1700,
    ARROW_SPEED: 1350, ARROW_LIFE: 0.4, VOLLEY_DMG: 10,
    ARROW_GAIN: 6, ARROW_GAIN_HEAVY: 12, // Starlight per arrow hit: less than a melee hit
    BOW_SLOW: 0.6,                       // Lune's speed while she is drawing and loosing
    STARFALL_DMG: 46, STARFALL_R: 165,
  };
  const GOLD = '255,214,140'; // the finisher's colour
  // The active hero and its two light colours; set in P.reset.
  let H = G.HEROES[0], STAR = H.col, HOT = H.hot;

  const P = G.player = {};
  G.shots = [];
  G.wind = 0;

  const _box = { cx: 0, cy: 0, hw: 11, hh: 21 };
  P.box = function () { _box.cx = P.x; _box.cy = P.y - 22; return _box; };

  P.reset = function () {
    H = G.hero(); STAR = H.col; HOT = H.hot;
    // the hero, the relic and the boons taken this run set these
    const hp = Math.max(1, G.diff().hp + H.hp + G.boon('heart') - G.boon('glass') - (G.relic('crown') ? 2 : 0));
    const maxAir = H.air + G.boon('wind') + (G.relic('cloak') ? 1 : 0), maxDash = 1 + G.boon('twin');
    const segs = C.SEGS + G.boon('fourth') + (G.relic('moons') ? 1 : 0);
    Object.assign(P, {
      hero: H,
      x: 300, y: FLOOR, vx: 0, vy: 0, facing: 1,
      run: H.run * (G.relic('cloak') ? 1.12 : 1),
      onGround: true, plat: null, coyote: 0, dropT: 0, jumpHeld: false,
      maxAir, maxDash, airJumps: maxAir, airDashes: maxDash,
      segs,
      healTime: C.HEAL_T * (G.boon('swift') ? 0.5 : 1),
      dashCdMax: C.DASH_CD * (G.boon('twin') ? 0.7 : 1),
      dashHit: new Set(), dawnUsed: false,
      ward: G.relic('ward'), hitCount: 0, plunge: false, afterT: 0, afterScale: 1,
      jumpBuf: 0, atkBuf: 0, dashBuf: 0, flareBuf: 0,
      dashT: 0, dashCd: 0, dashDir: 1, iframes: 0, pdDone: false, ghostT: 0,
      inv: 0, stun: 0, hp, maxHp: hp,
      ember: G.relic('moons') ? C.SEG * segs : 0, healT: 0, healLock: false,
      atk: null, atkCd: 0, combo: -1, comboT: 0, sinceDash: 9,
      dead: false, deadT: 0, hidden: false,
      squash: 0, runT: 0, hurtFlash: 0, emberFlash: 0,
      scarf: [], ghosts: [], slashes: [], bolts: [],
      stats: { dmg: 0, hits: 0, perfect: 0, heals: 0, lances: 0 },
    });
    for (let i = 0; i < STYLE[H.id].tail.n; i++) P.scarf.push({ x: P.x, y: P.y - 40 });
    G.shots.length = 0;
    G.wind = 0;
  };

  function ground() {
    P.vy = 0; P.onGround = true; P.airJumps = P.maxAir; P.airDashes = P.maxDash; P.coyote = C.COYOTE;
  }

  P.gain = function (n) {
    const before = Math.floor(P.ember / C.SEG);
    P.ember = Math.min(C.SEG * P.segs, P.ember + n * (1 + 0.4 * G.boon('vein')));
    if (Math.floor(P.ember / C.SEG) > before) { G.audio.play('segment'); P.emberFlash = 1; }
  };

  // The Warden entered a new phase: the Wardstone recharges.
  P.onPhase = function () {
    if (!G.relic('ward') || P.dead || P.ward) return;
    P.ward = true;
    G.fx.ring(P.x, P.y - 22, { r0: 70, r1: 30, life: 0.4, color: HOT, width: 4 });
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
    for (let i = P.bolts.length - 1; i >= 0; i--) { P.bolts[i].life -= dt; if (P.bolts[i].life <= 0) P.bolts.splice(i, 1); }

    if (P.dead) { P.deadT += dt; return; }
    if (P.hidden) return;

    P.inv = Math.max(0, P.inv - dt);
    P.iframes = Math.max(0, P.iframes - dt);
    P.dashCd = Math.max(0, P.dashCd - dt);
    P.atkCd = Math.max(0, P.atkCd - dt);
    // a dash does not use up the combo window, so you can dodge and still land the finisher
    if (P.dashT <= 0) { P.comboT = Math.max(0, P.comboT - dt); P.sinceDash += dt; }
    // Buffered presses do not run down during a dash, so anything pressed mid-dash
    // comes out the moment the dash ends instead of being dropped.
    if (P.dashT <= 0) {
      P.jumpBuf = Math.max(0, P.jumpBuf - dt);
      P.atkBuf = Math.max(0, P.atkBuf - dt);
      P.flareBuf = Math.max(0, P.flareBuf - dt);
    }
    P.dashBuf = Math.max(0, P.dashBuf - dt);
    P.dropT = Math.max(0, P.dropT - dt);
    if (!P.onGround) P.coyote = Math.max(0, P.coyote - dt);
    // Aftershock: the second Starfall blast
    if (P.afterT > 0) { P.afterT -= dt; if (P.afterT <= 0) starfallBlast(P.afterScale, 0.5); }
    // Starfall's plunge passes through attacks until it lands
    if (P.plunge) P.iframes = Math.max(P.iframes, 0.1);

    const ctl = G.playerControl();
    const free = !P.plunge; // nothing else can be started mid-plunge
    let mx = ctl ? I.axisX() : 0;
    const up = ctl && I.down.up, down = ctl && I.down.down;
    if (ctl) {
      if (I.pressed.jump) P.jumpBuf = C.BUFFER;
      if (I.pressed.attack) P.atkBuf = C.BUFFER;
      if (I.pressed.dash) P.dashBuf = C.BUFFER;
      if (I.pressed.flare) P.flareBuf = C.BUFFER;
      // holding the button keeps the combo going
      if (I.down.attack && P.atkCd <= 0) P.atkBuf = Math.max(P.atkBuf, 0.03);
    }

    // --- mend: hold to spend one segment of Starlight for health
    if (!I.down.heal) P.healLock = false;
    const wantHeal = ctl && I.down.heal && !P.healLock;
    if (wantHeal && free && P.onGround && P.dashT <= 0 && !P.atk && P.stun <= 0 && P.hp < P.maxHp && P.ember >= C.SEG) {
      if (P.healT === 0) G.audio.play('healStart');
      P.healT += dt;
      mx = 0;
      if (Math.random() < 0.6) {
        const a = G.rand(0, G.TAU), r = G.rand(40, 70);
        G.fx.spawn({ x: P.x + Math.cos(a) * r, y: P.y - 24 + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.4, vy: -Math.sin(a) * r * 2.4, life: 0.36, size: 3, color: STAR });
      }
      if (P.jumpBuf > 0 || P.dashBuf > 0) { P.healT = 0; P.healLock = true; }
      else if (P.healT >= P.healTime) {
        P.hp = Math.min(P.maxHp, P.hp + (G.relic('chalice') ? 2 : 1));
        P.ember -= C.SEG; P.healT = 0; P.healLock = true; P.stats.heals++;
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
    if (P.dashBuf > 0 && free && P.dashT <= 0 && P.dashCd <= 0 && P.stun <= 0 && (P.onGround || P.airDashes > 0)) {
      P.dashBuf = 0;
      P.dashT = C.DASH_T; P.dashDir = mx || P.facing; P.facing = P.dashDir;
      P.iframes = C.IFRAME; P.pdDone = false;
      if (!P.onGround) P.airDashes--;
      P.atk = null; P.healT = 0; P.ghostT = 0; P.dashHit.clear();
      G.audio.play('dash');
      G.fx.burst(P.x, P.y - 22, { n: 8, color: STAR, speed: [80, 300], angle: P.dashDir > 0 ? Math.PI : 0, spread: 0.9, life: [0.15, 0.4], kind: 'spark', size: [2, 3] });
    }

    // --- horizontal movement
    if (P.plunge) {
      P.vx = 0;
    } else if (P.dashT > 0) {
      P.dashT -= dt;
      P.vx = P.dashDir * C.DASH_SPEED; P.vy = 0;
      P.ghostT -= dt;
      if (P.ghostT <= 0) { P.ghostT = 0.05; P.ghosts.push({ x: P.x, y: P.y, f: P.facing, life: 0.26 }); }
      if (G.boon('comet')) cometStep();
      if (P.dashT <= 0) { P.vx = P.dashDir * P.run * (mx === P.dashDir ? 1 : 0.6); P.dashCd = P.dashCdMax; P.sinceDash = 0; }
    } else if (P.stun > 0) {
      P.stun -= dt;
      P.vx *= Math.exp(-2.5 * dt);
    } else {
      // firing the bow slows her, so shooting and dodging cannot both be done at full speed
      const target = mx * P.run * (P.atk && P.atk.kind === 'shot' ? C.BOW_SLOW : 1);
      const acc = (P.onGround ? C.ACC_G : C.ACC_A) * dt;
      if (P.vx < target) P.vx = Math.min(target, P.vx + acc);
      else if (P.vx > target) P.vx = Math.max(target, P.vx - acc);
      if (mx && !P.atk) P.facing = mx;
    }

    // --- jump
    if (P.jumpBuf > 0 && free && P.dashT <= 0 && P.stun <= 0) {
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
    if (P.plunge) {
      P.vy = 1750;
      if (Math.random() < 0.8) G.fx.spawn({ x: P.x + G.rand(-8, 8), y: P.y - 30, vx: G.rand(-30, 30), vy: -200, life: 0.3, size: 7, color: STAR });
    } else if (P.dashT <= 0) {
      // a little hang at the top of a held jump, and a slightly quicker fall
      const hang = !P.onGround && Math.abs(P.vy) < 110 && ctl && I.down.jump ? 0.55 : 1;
      P.vy = Math.min(C.MAXFALL, P.vy + C.GRAV * hang * (P.vy > 0 ? 1.1 : 1) * dt);
    }
    const fallSpeed = P.vy;
    P.x += (P.vx + G.wind) * dt;
    // the arena walls, or the Warden's hands when it has the hero caged
    const bl = G.bounds ? G.bounds.l : G.WALL_L + 13, br = G.bounds ? G.bounds.r : G.WALL_R - 13;
    if (P.x < bl) { P.x = bl; if (P.vx < 0) P.vx = 0; }
    if (P.x > br) { P.x = br; if (P.vx > 0) P.vx = 0; }
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
    if (P.plunge && P.onGround) {
      // Starfall lands
      P.plunge = false; P.squash = -0.3; P.iframes = Math.max(P.iframes, 0.12);
      starfallBlast(1.2, 1);
    } else if (landed && fallSpeed > 260) {
      P.squash = -0.2;
      G.audio.play('land');
      G.fx.burst(P.x, P.y, { n: 6, color: '190,190,210', speed: [40, 150], angle: -Math.PI / 2, spread: 3, life: [0.2, 0.4], size: [2, 4] });
    }
    if (P.onGround && Math.abs(P.vx) > 40) P.runT += dt * Math.abs(P.vx) * 0.055;

    // --- weapon
    if (P.atkBuf > 0 && free && P.atkCd <= 0 && P.dashT <= 0 && P.stun <= 0 && P.healT === 0) {
      P.atkBuf = 0;
      if (H.weapon === 'bow') startShot(mx, up, down);
      else startSwing(mx, up, down);
    }
    if (P.atk) {
      const a = P.atk;
      a.t += dt;
      if (!a.swung && a.t >= a.a0) { a.swung = true; if (a.kind === 'shot') loose(a); else swing(a); }
      if (a.kind !== 'shot' && a.t >= a.a0 && a.t <= a.a1) checkHits(a);
      if (a.t >= a.dur) P.atk = null;
    }

    // --- special: costs one segment of Starlight
    if (P.flareBuf > 0 && free && P.dashT <= 0 && P.stun <= 0 && P.healT === 0) {
      P.flareBuf = 0;
      if (P.ember >= C.SEG) {
        P.ember -= C.SEG; P.stats.lances++;
        const d = aim(mx, up, down, I.aim.flare);
        if (H.special === 'lance') castLance(d.x, d.y);
        else if (H.special === 'starfall') castStarfall();
        else castVolley(d.x, d.y);
      } else {
        G.audio.play('empty'); P.emberFlash = -1;
      }
    }
  };

  // Unit direction for a shot: the cursor if the press came from the mouse, otherwise the held keys.
  function aim(mx, up, down, mouse) {
    const I = G.input;
    let dx = mx, dy = up ? -1 : (down && !P.onGround ? 1 : 0);
    if (mouse) {
      dx = I.mx + G.cam.x - P.x; dy = I.my + G.cam.y - (P.y - 36);
      if (P.onGround && dy > 0) dy = 0; // never into the floor while standing
    }
    if (!dx && !dy) dx = P.facing;
    if (dx) P.facing = dx > 0 ? 1 : -1;
    const len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len };
  }

  // Combo step for this attack: 0 and 1 are the quick hits, 2 is the finisher.
  function nextStep(counts) {
    if (!counts) { if (P.comboT > 0) P.comboT = 0.62; return -1; } // a bounce keeps the chain alive
    const idx = (P.comboT > 0 && P.combo >= 0) ? (P.combo + 1) % 3 : 0;
    P.combo = idx; P.comboT = idx === 2 ? 0 : 0.62;
    return idx;
  }
  const weaponMult = (heavy) => (1 + 0.25 * G.boon('keen')) * G.dmgMult() * (heavy && G.relic('shard') ? 1.5 : 1);
  const haste = () => 1 - 0.18 * G.boon('quick');

  // ---------------------------------------------------------------- melee (sword, maul)
  function startSwing(mx, up, down) {
    const I = G.input;
    let kind = up ? 'up' : (down && !P.onGround ? 'down' : 'side');
    if (mx) P.facing = mx;
    if (I.aim.attack) {
      // a mouse click slashes towards the cursor
      const ax = I.mx + G.cam.x - P.x, ay = I.my + G.cam.y - (P.y - 32);
      const steep = Math.abs(ay) > Math.abs(ax) * 1.15;
      kind = steep && ay < 0 ? 'up' : (steep && ay > 0 && !P.onGround ? 'down' : 'side');
      if (Math.abs(ax) > 6) P.facing = ax > 0 ? 1 : -1;
    }
    // The three-hit combo: two quick cuts, then a finisher worth more than both together.
    // Side and upward slashes share the count. The downward bounce sits outside it and
    // does not break the chain, and neither does a dash.
    const idx = nextStep(kind !== 'down');
    const heavy = idx === 2;
    const st = H.combo[heavy ? 2 : idx === 1 ? 1 : 0];
    // a slash thrown straight out of a dash becomes a thrust: more damage, more reach
    const thrust = kind === 'side' && P.sinceDash < 0.2;
    const base = kind === 'down' ? H.down : st.dmg;
    P.atk = {
      kind, idx, heavy, thrust, t: 0, dur: st.dur, a0: st.wind, a1: st.wind + st.act,
      hit: new Set(), dir: P.facing, swung: false, quake: false,
      dmg: Math.round(base * (thrust ? 1.4 : 1) * weaponMult(heavy)),
    };
    P.atkCd = st.cd * haste();
    P.slashes.push({
      kind, dir: P.facing, heavy, thrust, idx, t: -st.wind, dur: heavy ? 0.3 : 0.19,
      reach: (1 + 0.25 * G.boon('reach')) * H.reach, thick: H.thick,
    });
    if (heavy) G.fx.burst(P.x - P.facing * 8, P.y - 34, { n: 5, color: GOLD, speed: [30, 140], life: [0.15, 0.35], kind: 'spark', size: [2, 3] });
  }

  // The moment the swing comes out: its sound, a step into the blow, and what finishers add.
  function swing(a) {
    G.audio.play(a.heavy || H.weapon === 'maul' ? 'slash3' : 'slash');
    if (a.kind === 'side' && P.stun <= 0) {
      if (a.thrust) P.vx = a.dir * Math.max(Math.abs(P.vx), 560);
      else if (P.onGround) P.vx += a.dir * (a.heavy ? 330 : 100);
      else if (a.heavy) P.vx += a.dir * 150;
    }
    if (a.heavy && a.kind === 'up' && !P.onGround) P.vy = Math.min(P.vy, -240);
    if (a.heavy && H.weapon === 'maul' && P.onGround && a.kind === 'side') {
      // the maul's finisher shakes the ground in front of it
      a.quake = true;
      G.fx.shake(7); G.audio.play('boom');
      G.fx.ring(P.x + a.dir * 90, FLOOR - 4, { r0: 20, r1: 150, life: 0.35, color: STAR, width: 6 });
      G.fx.burst(P.x + a.dir * 90, FLOOR - 4, { n: 14, color: '190,190,210', speed: [80, 380], angle: -Math.PI / 2, spread: 2.6, life: [0.3, 0.7], size: [4, 8] });
      G.fx.burst(P.x + a.dir * 90, FLOOR - 4, { n: 6, color: '22,18,32', speed: [150, 460], angle: -Math.PI / 2, spread: 2, life: [0.5, 1], size: [5, 9], kind: 'chunk', grav: 1500 });
    }
    if (a.heavy && G.boon('crescent')) {
      const upw = a.kind === 'up';
      wave(P.x + (upw ? 0 : a.dir * 34), P.y - (upw ? 70 : 26), upw ? 0 : a.dir, upw ? -1 : 0);
    }
  }

  // Crescent boon: a wave of light along a direction.
  function wave(x, y, dx, dy) {
    G.shots.push({ wave: true, x, y, vx: dx * 980, vy: dy * 980, t: 0, life: 0.42, hit: new Set(), dmg: Math.round(16 * G.dmgMult()) });
  }

  function atkBox(a) {
    const r = (1 + 0.3 * G.boon('reach')) * H.reach; // reach stretches each box away from the hero
    if (a.kind === 'up') {
      const hh = (a.heavy ? 57 : 46) * r;
      return { cx: P.x + a.dir * 6, cy: P.y - 34 - hh, hw: (a.heavy ? 54 : 42) * (0.6 + 0.4 * H.reach), hh };
    }
    if (a.kind === 'down') return { cx: P.x, cy: P.y - 28 + 42 * r, hw: 36, hh: 42 * r };
    // side: the finisher is bigger, a thrust is longer and narrower
    const hw = ((a.heavy ? 66 : 48) + (a.thrust ? 22 : 0)) * r;
    return { cx: P.x + a.dir * (hw - (a.heavy ? 4 : 0)), cy: P.y - 26, hw, hh: a.thrust ? 32 : a.heavy ? 48 : 36 };
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

  // Stormcaller: every fifth weapon hit calls lightning onto what it struck.
  function struck(t, x, y) {
    P.hitCount++;
    if (!G.relic('storm') || P.hitCount % 5 !== 0) return;
    if (G.boss.damage(Math.round(30 * G.dmgMult()), t, { x, y, heavy: true })) {
      const pts = [];
      for (let i = 0; i <= 7; i++) pts.push([x + (i === 7 ? 0 : G.rand(-26, 26)), -20 + (y + 20) * i / 7]);
      P.bolts.push({ pts, life: 0.22 });
      G.audio.play('flareHit');
      G.fx.shake(6);
      G.fx.burst(x, y, { n: 14, color: '255,250,200', speed: [120, 560], life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
    }
  }

  function checkHits(a) {
    const boxes = [atkBox(a)];
    if (a.quake) boxes.push({ cx: P.x + a.dir * 100, cy: FLOOR - 26, hw: 130, hh: 30 });
    let bounced = false;
    for (const hb of boxes) {
      for (const t of G.boss.targets()) {
        if (a.hit.has(t.id) || !touch(hb, t)) continue;
        a.hit.add(t.id);
        const c = contact(hb, t);
        const res = G.boss.damage(a.dmg, t, { x: c.x, y: c.y, heavy: a.heavy || a.thrust, finisher: a.heavy, dir: a.dir, poise: H.poise });
        if (res) {
          P.gain(a.heavy ? C.GAIN_HEAVY : C.GAIN_HIT);
          G.fx.stop(a.heavy ? 0.095 : a.thrust ? 0.05 : 0.026 * H.thick);
          G.fx.shake(a.heavy ? 8.5 : a.thrust ? 4 : 1.6 * H.thick);
          if (a.heavy) {
            // the finisher lands with a gold burst so it reads as the big hit
            G.fx.punch(0.012);
            G.fx.ring(c.x, c.y, { r0: 8, r1: 92, life: 0.28, color: GOLD, width: 6 });
            G.fx.burst(c.x, c.y, { n: 12, color: GOLD, speed: [160, 620], life: [0.15, 0.45], kind: 'spark', size: [2.5, 4.5] });
          }
          G.audio.play(a.heavy ? 'hitHeavy' : 'hit');
          G.fx.burst(c.x, c.y, { n: a.heavy ? 16 : 9, color: HOT, speed: [120, 520], life: [0.12, 0.35], kind: 'spark', size: [2, 4] });
          G.fx.burst(c.x, c.y, { n: 4, color: STAR, speed: [20, 120], life: [0.2, 0.4], size: [5, 10] });
          struck(t, c.x, c.y);
        } else {
          G.audio.play('tink');
          G.fx.burst(c.x, c.y, { n: 4, color: '200,200,220', speed: [60, 200], life: [0.1, 0.25], kind: 'spark', size: [1.5, 2.5] });
        }
        bounced = true;
        // a hit landed in the air holds the hero up for a moment, so air combos stay on target
        if (a.kind !== 'down' && !P.onGround && !a.stall) { a.stall = true; P.vy = Math.min(P.vy, a.heavy ? -150 : -95); }
      }
      for (const o of G.hazards.slashables()) {
        if (G.circleRect(o.x, o.y, o.r + 5, hb)) { o.slash(); P.gain(C.GAIN_ORB); bounced = true; }
      }
    }
    if (bounced && a.kind === 'down' && !a.pogo) {
      a.pogo = true;
      P.vy = -680; P.airJumps = P.maxAir; P.airDashes = P.maxDash; P.onGround = false; P.plat = null; P.jumpHeld = false;
      P.squash = 0.2;
    }
  }

  // Comet Step: a dash cuts anything it passes through, once per dash.
  function cometStep() {
    for (const t of G.boss.targets()) {
      if (P.dashHit.has(t.id) || !touch(P.box(), t)) continue;
      P.dashHit.add(t.id);
      const dmg = Math.round(24 * G.boon('comet') * G.dmgMult());
      if (G.boss.damage(dmg, t, { x: P.x, y: P.y - 22, heavy: true, dir: P.dashDir })) {
        P.gain(C.GAIN_HIT);
        G.audio.play('hit');
        G.fx.burst(P.x, P.y - 22, { n: 12, color: HOT, speed: [120, 520], life: [0.12, 0.35], kind: 'spark', size: [2, 4] });
      }
    }
  }

  // ---------------------------------------------------------------- bow
  // Lune's attack is a shot in any direction; the third in a chain is a heavy arrow that pierces.
  function startShot(mx, up, down) {
    const d = aim(mx, up, down, G.input.aim.attack);
    const idx = nextStep(true);
    const heavy = idx === 2;
    const st = H.combo[idx];
    P.atk = {
      kind: 'shot', idx, heavy, t: 0, dur: st.wind + 0.16, a0: st.wind, a1: 0,
      dx: d.x, dy: d.y, dir: P.facing, swung: false,
      dmg: Math.round(st.dmg * weaponMult(heavy)),
    };
    P.atkCd = st.cd * haste();
    if (heavy) G.fx.burst(P.x + d.x * 14, P.y - 28 + d.y * 14, { n: 5, color: GOLD, speed: [30, 140], life: [0.15, 0.35], kind: 'spark', size: [2, 3] });
  }

  function arrow(dx, dy, dmg, heavy, life) {
    G.shots.push({
      arrow: true, heavy, x: P.x + dx * 20, y: P.y - 38 + dy * 20, ox: P.x, oy: P.y - 38,
      vx: dx * C.ARROW_SPEED, vy: dy * C.ARROW_SPEED, t: 0, hit: new Set(), dmg,
      life: (life || C.ARROW_LIFE) * (1 + 0.3 * G.boon('reach')),
    });
  }

  function loose(a) {
    arrow(a.dx, a.dy, a.dmg, a.heavy);
    G.audio.play(a.heavy ? 'arrowHeavy' : 'arrow');
    // firing downward in the air lifts her
    if (a.dy > 0.5 && !P.onGround) { P.vy = Math.min(P.vy, -370); P.squash = 0.15; }
    if (a.heavy) {
      P.vx -= a.dx * 120;
      G.fx.ring(P.x + a.dx * 22, P.y - 38 + a.dy * 22, { r0: 4, r1: 34, life: 0.2, color: GOLD, width: 4 });
      if (G.boon('crescent')) wave(P.x + a.dx * 30, P.y - 38 + a.dy * 30, a.dx, a.dy);
    }
  }

  // ---------------------------------------------------------------- specials
  // Fire one Star Lance (or three with Split Lance) along a unit direction.
  function fireLance(dx, dy) {
    const split = G.boon('split');
    const angles = split ? [-0.2, 0, 0.2] : [0];
    const dmg = Math.round(C.LANCE_DMG * (split ? 0.6 : 1) * G.dmgMult());
    for (const a of angles) {
      const c = Math.cos(a), s = Math.sin(a);
      const vx = dx * c - dy * s, vy = dx * s + dy * c;
      G.shots.push({ x: P.x + vx * 18, y: P.y - 36 + vy * 18, vx: vx * C.LANCE_SPEED, vy: vy * C.LANCE_SPEED, t: 0, hit: new Set(), dmg });
    }
  }

  function muzzle(dx, dy) {
    G.fx.shake(6);
    G.fx.flash(STAR, 0.12, 0.2);
    G.fx.ring(P.x + dx * 20, P.y - 36 + dy * 20, { r0: 6, r1: 60, life: 0.25, color: HOT, width: 5 });
    G.fx.burst(P.x + dx * 20, P.y - 36 + dy * 20, { n: 14, color: STAR, speed: [100, 500], angle: Math.atan2(dy, dx), spread: 1.1, life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
  }

  // Vesper: a piercing lance.
  function castLance(dx, dy) {
    fireLance(dx, dy);
    P.vx -= dx * 240;
    if (dy > 0) P.vy = Math.min(P.vy, -420);
    G.audio.play('flare');
    muzzle(dx, dy);
  }

  // Lune: a fan of arrows, and a leap away from where she aimed.
  function castVolley(dx, dy) {
    const n = G.boon('quiver') ? 8 : 5, spread = G.boon('quiver') ? 0.95 : 0.72;
    const dmg = Math.round(C.VOLLEY_DMG * G.dmgMult());
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - 0.5) * spread, c = Math.cos(a), s = Math.sin(a);
      arrow(dx * c - dy * s, dx * s + dy * c, dmg, false, 0.46);
    }
    P.vx = -dx * 420;
    if (dy > -0.5) { P.vy = Math.min(P.vy, -330); P.onGround = false; P.plat = null; }
    P.atk = null;
    G.audio.play('flare');
    muzzle(dx, dy);
  }

  // Aster: on the ground the blast is immediate; in the air she plunges first.
  function castStarfall() {
    P.atk = null;
    if (P.onGround) { starfallBlast(1, 1); return; }
    P.plunge = true; P.pdDone = false; P.dashT = 0;
    G.audio.play('dash');
    G.fx.ring(P.x, P.y - 22, { r0: 50, r1: 14, life: 0.2, color: HOT, width: 4 });
  }

  // The blast around Aster's feet. scale grows the radius and damage; k is the damage share (Aftershock uses 0.5).
  function starfallBlast(scale, k) {
    const R = C.STARFALL_R * scale, cx = P.x, cy = P.y - 20;
    const dmg = Math.round(C.STARFALL_DMG * scale * k * G.dmgMult());
    for (const t of G.boss.targets()) {
      const inside = t.r ? G.dist(cx, cy, t.cx, t.cy) < R + t.r : G.circleRect(cx, cy, R, t);
      if (!inside) continue;
      const hx = t.r ? t.cx : G.clamp(cx, t.cx - t.hw, t.cx + t.hw), hy = t.r ? t.cy + t.r * 0.6 : G.clamp(cy, t.cy - t.hh, t.cy + t.hh);
      G.boss.damage(dmg, t, { x: hx, y: hy, heavy: true, finisher: k >= 1, lance: k >= 1, poise: H.poise, dir: G.sign(t.cx - cx) });
    }
    for (const o of G.hazards.slashables()) if (G.dist(o.x, o.y, cx, cy) < R + o.r) o.slash();
    G.audio.play('slam');
    G.fx.stop(0.08 * k); G.fx.shake(15 * k); G.fx.punch(0.02 * k); G.fx.flash(STAR, 0.16 * k, 0.25);
    G.fx.ring(cx, FLOOR - 4 < P.y ? P.y - 4 : P.y - 4, { r0: 20, r1: R, life: 0.4, color: HOT, width: 10 });
    G.fx.ring(cx, P.y - 4, { r0: 10, r1: R * 0.7, life: 0.3, color: STAR, width: 6 });
    G.fx.burst(cx, P.y - 6, { n: 26, color: STAR, speed: [150, 640], angle: -Math.PI / 2, spread: 3, life: [0.25, 0.7], kind: 'spark', size: [2, 5], grav: 700 });
    G.fx.burst(cx, P.y - 6, { n: 16, color: '190,190,210', speed: [80, 420], angle: -Math.PI / 2, spread: 3, life: [0.3, 0.8], size: [4, 9] });
    G.fx.burst(cx, P.y - 6, { n: 8, color: '22,18,32', speed: [150, 520], angle: -Math.PI / 2, spread: 2.2, life: [0.6, 1.1], size: [5, 10], kind: 'chunk', grav: 1500 });
    if (k >= 1 && G.boon('aftershock')) { P.afterT = 0.3; P.afterScale = scale; }
  }

  // An attack connected while the player was dashing (or plunging) through it.
  function perfect() {
    P.stats.perfect++;
    P.gain(C.GAIN_PERFECT);
    P.dashCd = 0;
    G.audio.play('perfect');
    G.fx.slow(0.38, 0.3);
    G.fx.ring(P.x, P.y - 22, { r0: 12, r1: 110, life: 0.45, color: STAR, width: 5 });
    G.fx.flash(STAR, 0.1, 0.25);
    G.fx.text(P.x, P.y - 74, 'PERFECT', { color: HOT, size: 17, life: 0.9 });
    // Mirror Step answers a perfect dodge with a free shot at the core
    const B = G.boss;
    if (G.boon('mirror') && B.active && !B.dead && !B.dying) {
      const dx = B.core.x - P.x, dy = B.core.y - (P.y - 36), d = Math.hypot(dx, dy) || 1;
      if (H.weapon === 'bow') { arrow(dx / d, dy / d, Math.round(H.combo[2].dmg * 2 * weaponMult(true)), true, 0.7); G.audio.play('arrowHeavy'); }
      else { fireLance(dx / d, dy / d); G.audio.play('flare'); }
    }
  }

  P.tryHit = function (dmg, srcX, src) {
    if (P.dead || P.hidden || !G.canHurt()) return false;
    if (P.iframes > 0) {
      if (!P.pdDone) { P.pdDone = true; perfect(); }
      return false;
    }
    if (P.inv > 0 || G.debug.god) return false;
    if (P.ward) {
      // Wardstone: this phase's first hit is turned aside
      P.ward = false; P.inv = 0.9;
      G.audio.play('tink'); G.audio.play('perfect');
      G.fx.shake(6);
      G.fx.ring(P.x, P.y - 22, { r0: 26, r1: 130, life: 0.45, color: HOT, width: 8 });
      G.fx.text(P.x, P.y - 78, 'WARDED', { color: HOT, size: 18, life: 1 });
      return false;
    }
    P.hp -= dmg; P.stats.hits++;
    P.inv = C.HURT_INV; P.stun = 0.2; P.dashT = 0; P.atk = null; P.healT = 0; P.hurtFlash = 1; P.plunge = false;
    const dir = G.sign(P.x - srcX) || -P.facing;
    P.vx = dir * 430; P.vy = (src && typeof src.popVy === 'number') ? src.popVy : -430; P.onGround = false; P.plat = null; P.jumpHeld = false;
    G.fx.stop(0.14); G.fx.shake(13); G.fx.flash('255,50,50', 0.26, 0.35);
    G.fx.burst(P.x, P.y - 22, { n: 16, color: '255,120,120', speed: [100, 420], life: [0.2, 0.55], kind: 'spark', size: [2, 4] });
    G.audio.play('hurt');
    if (P.hp <= 0 && G.boon('dawn') && !P.dawnUsed) {
      // Second Dawn: survive the killing blow once per trial
      P.dawnUsed = true; P.hp = 1; P.inv = 2.6;
      revived('SECOND DAWN');
    }
    if (P.hp <= 0 && G.relic('phoenix') && !G.run.phoenixUsed) {
      // Phoenix Feather: once per run
      G.run.phoenixUsed = true; P.hp = Math.min(P.maxHp, 3); P.inv = 3;
      revived('REBORN');
    }
    if (P.hp <= 0) { P.hp = 0; die(); }
    return true;
  };

  function revived(word) {
    G.audio.play('heal');
    G.fx.flash(HOT, 0.5, 0.6); G.fx.slow(0.3, 0.6);
    G.fx.ring(P.x, P.y - 22, { r0: 20, r1: 260, life: 0.7, color: HOT, width: 10 });
    G.fx.text(P.x, P.y - 84, word, { color: HOT, size: 20, life: 1.4 });
  }

  function die() {
    P.dead = true; P.deadT = 0;
    G.audio.play('die');
    G.fx.slow(0.15, 1.2);
    G.fx.burst(P.x, P.y - 22, { n: 46, color: STAR, speed: [40, 520], life: [0.5, 1.5], size: [3, 8], drag: 2 });
    G.fx.burst(P.x, P.y - 22, { n: 24, color: HOT, speed: [100, 700], life: [0.3, 0.8], kind: 'spark', size: [2, 4] });
    G.fx.ring(P.x, P.y - 22, { r0: 10, r1: 220, life: 0.8, color: STAR, width: 8 });
    G.onPlayerDeath();
  }

  // ---------------------------------------------------------------- shots: lances, arrows, waves
  G.updateShots = function (dt) {
    for (let i = G.shots.length - 1; i >= 0; i--) {
      const s = G.shots[i];
      s.t += dt;
      // step in two halves so a fast shot cannot skip through a thin target
      for (let k = 0; k < 2 && !s.dead; k++) {
        s.x += s.vx * dt * 0.5; s.y += s.vy * dt * 0.5;
        const half = s.arrow ? 11 : 16;
        for (const t of G.boss.targets()) {
          if (s.dead || s.hit.has(t.id)) continue;
          if (!touch({ cx: s.x, cy: s.y, hw: half, hh: half }, t)) continue;
          s.hit.add(t.id);
          if (s.arrow) {
            // arrows hit harder the less distance they have flown: +60% within 120px, nothing extra past 300px...
            const flown = G.dist(s.x, s.y, s.ox, s.oy);
            const close = 1 + 0.6 * G.clamp((300 - flown) / 180, 0, 1);
            // ...and lose up to 30% of their force past 240px, so sniping from safety is slow
            const far = 1 - 0.3 * G.clamp((flown - 240) / 180, 0, 1);
            const res = G.boss.damage(Math.round(s.dmg * close * far), t, { x: s.x, y: s.y, heavy: s.heavy, finisher: s.heavy, dir: G.sign(s.vx), poise: H.poise });
            if (res) {
              P.gain(s.heavy ? C.ARROW_GAIN_HEAVY : C.ARROW_GAIN);
              G.fx.stop(s.heavy ? 0.06 : 0.016); G.fx.shake(s.heavy ? 6 : 1.2);
              G.audio.play(s.heavy ? 'hitHeavy' : 'hit');
              G.fx.burst(s.x, s.y, { n: s.heavy ? 14 : 6, color: s.heavy ? GOLD : HOT, speed: [100, 460], life: [0.12, 0.35], kind: 'spark', size: [2, 3.5] });
              if (s.heavy) G.fx.ring(s.x, s.y, { r0: 6, r1: 70, life: 0.25, color: GOLD, width: 5 });
              struck(t, s.x, s.y);
            } else G.audio.play('tink');
            if (!s.heavy) s.dead = true; // only the heavy arrow pierces
            continue;
          }
          const res = G.boss.damage(s.dmg, t, { x: s.x, y: s.y, heavy: true, lance: !s.wave, dir: G.sign(s.vx) });
          if (res && s.wave) {
            G.fx.stop(0.03); G.audio.play('hit');
            G.fx.burst(s.x, s.y, { n: 10, color: STAR, speed: [100, 420], life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
          } else if (res) {
            G.fx.stop(0.07); G.fx.shake(9);
            G.audio.play('flareHit');
            G.fx.ring(s.x, s.y, { r0: 10, r1: 120, life: 0.35, color: HOT, width: 8 });
            G.fx.burst(s.x, s.y, { n: 26, color: STAR, speed: [150, 700], life: [0.2, 0.55], kind: 'spark', size: [2, 5] });
          } else G.audio.play('tink');
        }
        for (const o of G.hazards.slashables()) {
          if (!s.dead && G.dist(o.x, o.y, s.x, s.y) < o.r + (s.arrow ? 12 : 18)) {
            o.slash();
            if (s.arrow) { P.gain(C.GAIN_ORB); if (!s.heavy) s.dead = true; }
          }
        }
      }
      if (!s.arrow || Math.random() < 0.5) G.fx.spawn({ x: s.x, y: s.y, vx: G.rand(-30, 30), vy: G.rand(-30, 30), life: s.arrow ? 0.2 : 0.3, size: s.arrow ? 3.5 : 6, color: STAR });
      if (s.y > FLOOR - 4 && s.vy > 0) {
        s.dead = true;
        G.fx.burst(s.x, FLOOR - 4, { n: s.arrow ? 5 : 14, color: STAR, speed: [100, 460], angle: -Math.PI / 2, spread: 2.4, life: [0.2, 0.5], kind: 'spark', size: [2, 4] });
      }
      if (s.dead || s.x < -100 || s.x > G.W + 100 || s.y < -200 || s.t > (s.life || 2)) G.shots.splice(i, 1);
    }
  };

  G.drawShots = function (ctx) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const s of G.shots) {
      if (s.wave) {
        // Crescent: an arc of light that fades as it travels
        const k = 1 - s.t / s.life;
        ctx.save();
        ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx));
        ctx.strokeStyle = G.rgba(STAR, 0.45 * k); ctx.lineWidth = 16;
        ctx.beginPath(); ctx.arc(-26, 0, 44, -0.85, 0.85); ctx.stroke();
        ctx.strokeStyle = G.rgba(HOT, 0.95 * k); ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(-26, 0, 44, -0.85, 0.85); ctx.stroke();
        ctx.restore();
        continue;
      }
      if (s.arrow) {
        // a slim arrow; it fades at the end of its range
        const k = Math.min(1, (s.life - s.t) / 0.08), len = s.heavy ? 0.034 : 0.024;
        const tx = s.x - s.vx * len, ty = s.y - s.vy * len;
        ctx.strokeStyle = G.rgba(s.heavy ? GOLD : STAR, 0.5 * k); ctx.lineWidth = s.heavy ? 10 : 6;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
        ctx.strokeStyle = G.rgba(HOT, k); ctx.lineWidth = s.heavy ? 3.4 : 2.2;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
        continue;
      }
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
  // Each hero is a small jointed figure: legs and arms are two-bone limbs solved towards foot and
  // hand targets, so the same code gives a run cycle, jump poses, a dash lean and weapon swings.
  // Everything below is drawn in the hero's own frame: feet at (0, 0), facing right, y up negative.
  const SC = 1.3; // heroes are drawn larger than their hitbox, so near misses favour the player
  const STYLE = {
    vesper: {
      dark: '#0a1120', mid: '#18294a', plate: '#2b4372', leg: 4, arm: 3.3, stance: 4.5,
      anchor: [-4, -37.5], tail: { n: 10, seg: 6.5, w0: 6, w1: 1.5, glow: true },
    },
    aster: {
      dark: '#07130d', mid: '#143325', plate: '#22563e', leg: 5.4, arm: 4.6, stance: 6.5,
      anchor: [-5, -36], tail: { n: 6, seg: 7.5, w0: 9, w1: 17, glow: false },
    },
    lune: {
      dark: '#120b20', mid: '#2a1d47', plate: '#4a3774', leg: 3.3, arm: 2.8, stance: 3.4,
      anchor: [-6.5, -48], tail: { n: 13, seg: 5.2, w0: 3.8, w1: 0.9, glow: true },
    },
  };
  G.heroStyle = (id) => STYLE[id];

  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function poly(ctx, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) { if (i) ctx.lineTo(pts[i], pts[i + 1]); else ctx.moveTo(pts[i], pts[i + 1]); }
    ctx.closePath();
  }
  function glowAt(ctx, color, x, y, r, alpha) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.drawImage(G.fx.glow(color), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // Two-bone limb from (x0, y0) towards (x1, y1). bend picks which way the joint folds.
  function ik(x0, y0, x1, y1, l1, l2, bend) {
    const dx = x1 - x0, dy = y1 - y0;
    const d = Math.min(Math.hypot(dx, dy) || 0.001, l1 + l2 - 0.01);
    const a = Math.atan2(dy, dx);
    const th = Math.acos(G.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * bend;
    return { jx: x0 + Math.cos(a + th) * l1, jy: y0 + Math.sin(a + th) * l1, ex: x0 + Math.cos(a) * d, ey: y0 + Math.sin(a) * d };
  }

  // The cloth that trails behind each hero: a scarf, a cape or a ponytail. A chain of points in world space.
  function updateScarf(dt) {
    const s = P.scarf;
    if (!s.length) return;
    const st = STYLE[H.id], seg = st.tail.seg, heavy = !st.tail.glow;
    s[0].x = P.x + P.facing * st.anchor[0] * SC; s[0].y = P.y + st.anchor[1] * SC;
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i];
      b.y += (heavy ? 70 : 26 + i * 3) * dt;
      b.x -= P.facing * (heavy ? 18 : 34) * dt;
      b.y += Math.sin(G.t * 9 + i * 0.9) * (heavy ? 4 : 10) * dt;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d > seg) { b.x = a.x + dx / d * seg; b.y = a.y + dy / d * seg; }
    }
  }

  function drawTail(ctx, h, pts) {
    const tl = STYLE[h.id].tail, n = pts.length;
    ctx.lineCap = 'round';
    if (tl.glow) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < n; i++) {
        const k = 1 - i / n;
        ctx.strokeStyle = G.rgba(h.col, 0.25 + 0.65 * k);
        ctx.lineWidth = G.lerp(tl.w1, tl.w0, k);
        line(ctx, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      }
      if (h.id === 'vesper') {
        // the scarf's second, shorter tail
        for (let i = 1; i < Math.min(n, 7); i++) {
          const k = 1 - i / 7, o0 = 2 + (i - 1) * 1.1, o1 = 2 + i * 1.1;
          ctx.strokeStyle = G.rgba(h.col, 0.2 + 0.4 * k); ctx.lineWidth = 1.2 + 3 * k;
          line(ctx, pts[i - 1].x, pts[i - 1].y + o0, pts[i].x, pts[i].y + o1);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // a heavy cape: dark cloth with a lit hem
      const st = STYLE[h.id];
      for (let i = 1; i < n; i++) {
        ctx.strokeStyle = i % 2 ? st.mid : st.dark;
        ctx.lineWidth = G.lerp(tl.w0, tl.w1, i / (n - 1));
        line(ctx, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(h.col, 0.5); ctx.lineWidth = 1.6;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y - G.lerp(tl.w0, tl.w1, i / (n - 1)) * 0.45) : ctx.moveTo(p.x, p.y - tl.w0 * 0.45)));
      ctx.stroke();
      const e = pts[n - 1];
      ctx.strokeStyle = G.rgba(h.col, 0.75); ctx.lineWidth = 2;
      line(ctx, e.x, e.y - tl.w1 * 0.5, e.x, e.y + tl.w1 * 0.5);
      ctx.globalCompositeOperation = 'source-over';
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
      if (s.t < 0) continue; // a finisher's arc appears when its wind-up ends
      const k = s.t / s.dur;
      const head = G.ease.outCubic(Math.min(1, k * 2.4));
      const alpha = Math.pow(1 - k, 1.3);
      let cx, cy, R, a0, a1;
      ctx.save();
      ctx.translate(P.x, P.y);
      const rs = s.reach || 1, th = s.thick || 1;
      if (s.thrust) {
        // a straight lance of light for the dash thrust
        ctx.scale(s.dir, 1);
        const len = (s.heavy ? 158 : 128) * rs * head, h = (s.heavy ? 17 : 11) * th * (1 - k * 0.7);
        ctx.fillStyle = G.rgba(s.heavy ? GOLD : STAR, 0.7 * alpha);
        ctx.beginPath(); ctx.moveTo(2, -35 - h); ctx.lineTo(2 + len, -35); ctx.lineTo(2, -35 + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = G.rgba(HOT, alpha);
        ctx.beginPath(); ctx.moveTo(2, -35 - h * 0.4); ctx.lineTo(2 + len * 0.94, -35); ctx.lineTo(2, -35 + h * 0.4); ctx.closePath(); ctx.fill();
        ctx.restore();
        continue;
      }
      if (s.kind === 'up') {
        cx = 0; cy = -60; R = s.heavy ? 82 : 62;
        a0 = -Math.PI + (s.heavy ? 0.05 : 0.3); a1 = -(s.heavy ? 0.05 : 0.3);
        if (s.idx === 1) { const t0 = a0; a0 = a1; a1 = t0; }
        if (s.dir < 0) ctx.scale(-1, 1);
      }
      else if (s.kind === 'down') { cx = 0; cy = -18; R = 58; a0 = 0.3; a1 = Math.PI - 0.3; if (s.dir < 0) ctx.scale(-1, 1); }
      else {
        ctx.scale(s.dir, 1);
        cx = 6; cy = -35; R = s.heavy ? 102 : 70;
        a0 = -1.25; a1 = 1.15;
        if (s.idx === 1) { a0 = 1.2; a1 = -1.2; }
        if (s.heavy) { a0 = -1.95; a1 = 1.5; }
      }
      R *= rs;
      const end = G.lerp(a0, a1, head);
      const start = G.lerp(a0, a1, Math.max(0, head - 0.8 + k * 0.5));
      crescent(ctx, cx, cy, R, start, end, (s.heavy ? 46 : 26) * th);
      ctx.fillStyle = G.rgba(STAR, 0.75 * alpha); ctx.fill();
      if (s.heavy) {
        // a gold inner arc marks the finisher
        crescent(ctx, cx, cy, R - 12 * th, start, end, 24 * th);
        ctx.fillStyle = G.rgba(GOLD, 0.85 * alpha); ctx.fill();
      }
      crescent(ctx, cx, cy, R + 2, start, end, (s.heavy ? 17 : 10) * th);
      ctx.fillStyle = G.rgba(HOT, alpha); ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // Angle of a melee weapon through its swing.
  function swingAngle(a) {
    const k = G.ease.outCubic(G.clamp((a.t - a.a0 + 0.02) / (a.dur * 0.5), 0, 1));
    let a0 = -1.9, a1 = 1.3;
    if (a.thrust) { a0 = -0.05; a1 = -0.05; }
    else if (a.kind === 'up') { a0 = a.heavy ? 0.5 : -2.9; a1 = a.heavy ? -2.9 : -0.5; }
    else if (a.kind === 'down') { a0 = 0.2; a1 = 2.7; }
    else if (a.heavy) { a0 = -2.7; a1 = 1.5; }
    else if (a.idx === 1) { a0 = 1.5; a1 = -1.6; }
    return G.lerp(a0, a1, k) + (a.heavy && a.t < a.a0 ? G.rand(-0.06, 0.06) : 0);
  }

  // Where the feet go: [front foot, back foot].
  function footTargets(s, st) {
    if (s.dash) return [[-12, -7], [-5, -2]];
    if (!s.onGround) return s.vy < 0 ? [[5.5, -9], [-7.5, -3]] : [[4.5, -3], [-6.5, -7]];
    if (Math.abs(s.vx) > 40) {
      const p = s.runT;
      return [[Math.sin(p) * 10.5, -Math.max(0, Math.cos(p)) * 7], [Math.sin(p + Math.PI) * 10.5, -Math.max(0, Math.cos(p + Math.PI)) * 7]];
    }
    return [[st.stance, 0], [-st.stance, 0]];
  }

  // Where the hands and weapon are: front hand (fx, fy), back hand (bx, by), weapon angle and length.
  function weaponPose(h, s, breath) {
    const a = s.atk, air = !s.onGround, run = !air && Math.abs(s.vx) > 40;
    const sw = Math.sin(s.runT + Math.PI);
    const SH = -35; // shoulder height
    if (h.weapon === 'sword') {
      if (a && a.kind !== 'shot') {
        const ang = swingAngle(a), c = Math.cos(ang), sn = Math.sin(ang), r = a.thrust ? 12.5 : 11;
        const fx = 1 + c * r, fy = SH + sn * r;
        return { fx, fy, bx: a.heavy ? fx - c * 3.2 : -4, by: a.heavy ? fy - sn * 3.2 : -27, ang, len: a.thrust ? 42 : a.heavy ? 40 : 36 };
      }
      if (s.dash) return { fx: -6, fy: -27, bx: -2, by: -29, ang: Math.PI - 0.12, len: 36 };
      if (air) return { fx: 7, fy: -28, bx: -5, by: -27, ang: s.vy < 0 ? -0.75 : 2.3, len: 36 };
      if (run) return { fx: -1 + sw * 3, fy: -24, bx: 2 - sw * 4, by: -25, ang: 2.85, len: 36 };
      return { fx: 6.5, fy: -22.5 + breath * 0.3, bx: -4, by: -25, ang: 2.55, len: 36 };
    }
    if (h.weapon === 'maul') {
      let ang = -2.05, fx = 5.5, fy = -27.5 + (run ? sw * 0.8 : breath * 0.3);
      if (a && a.kind !== 'shot') { ang = swingAngle(a); fx = 1 + Math.cos(ang) * 10.5; fy = SH + Math.sin(ang) * 10.5; }
      else if (s.dash) { ang = Math.PI - 0.35; fx = -2; fy = -29; }
      return { fx, fy, bx: fx - Math.cos(ang) * 7.5, by: fy - Math.sin(ang) * 7.5, ang, len: 34, behind: !a };
    }
    // bow
    if (a && a.kind === 'shot') {
      const ang = Math.atan2(a.dy, Math.max(0.001, Math.abs(a.dx))), c = Math.cos(ang), sn = Math.sin(ang);
      const pull = a.swung ? 0 : G.clamp(a.t / Math.max(0.03, a.a0), 0, 1);
      const fx = 0.5 + c * 12.5, fy = SH + sn * 12.5;
      return { fx, fy, bx: fx - c * (5 + 8 * pull), by: fy - sn * (5 + 8 * pull), ang, pull, len: 0 };
    }
    if (s.dash) return { fx: -2, fy: -28, bx: -6, by: -27, ang: 0.1, pull: 0, len: 0 };
    return { fx: 8.5 + (run ? sw * 2 : 0), fy: -27 + breath * 0.3, bx: -3.5 + (run ? -sw * 3 : 0), by: -25.5, ang: 0.2, pull: 0, len: 0 };
  }

  // ---- weapons, drawn at the front hand
  function drawSword(ctx, W, h, gold) {
    ctx.save();
    ctx.translate(W.fx, W.fy); ctx.rotate(W.ang);
    const len = W.len;
    glowAt(ctx, gold ? GOLD : h.col, len * 0.55, 0, len * 0.62, 0.5);
    ctx.strokeStyle = '#0a0f1c'; ctx.lineWidth = 2.4; line(ctx, -4.5, 0, 1, 0);
    ctx.fillStyle = G.rgba(gold ? GOLD : h.hot, 1);
    poly(ctx, [2, -2.2, len - 6, -1.5, len, 0, len - 6, 1.5, 2, 2.2]); ctx.fill();
    ctx.strokeStyle = G.rgba(gold ? GOLD : h.col, 0.95); ctx.lineWidth = 0.9;
    line(ctx, 3, 0, len - 7, 0);
    ctx.lineWidth = 2.2; line(ctx, 1.6, -4.6, 1.6, 4.6); // crossguard
    ctx.fillStyle = G.rgba(h.col, 1); ctx.beginPath(); ctx.arc(-5, 0, 1.5, 0, G.TAU); ctx.fill(); // pommel
    ctx.restore();
  }

  function drawMaul(ctx, W, h, st, gold) {
    ctx.save();
    ctx.translate(W.fx, W.fy); ctx.rotate(W.ang);
    const L = W.len, c = gold ? GOLD : h.col;
    ctx.strokeStyle = G.rgba(h.col, 0.4); ctx.lineWidth = 4.6; line(ctx, -15, 0, L - 6, 0);
    ctx.strokeStyle = '#1f4433'; ctx.lineWidth = 3.2; line(ctx, -15, 0, L - 6, 0);
    ctx.fillStyle = G.rgba(h.col, 0.9); ctx.beginPath(); ctx.arc(-15.5, 0, 1.8, 0, G.TAU); ctx.fill();
    glowAt(ctx, c, L + 2, 0, 22, 0.7);
    // the head: a banded block with a striking face on each side
    G.roundRect(ctx, L - 6, -10.5, 13, 21, 2.6);
    ctx.fillStyle = st.plate; ctx.fill();
    ctx.strokeStyle = G.rgba(c, 1); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = st.dark;
    ctx.fillRect(L - 6, -12, 13, 3); ctx.fillRect(L - 6, 9, 13, 3);
    ctx.fillStyle = G.rgba(gold ? GOLD : h.hot, 0.98);
    ctx.fillRect(L - 1.6, -6.5, 4, 13);
    ctx.fillStyle = G.rgba(c, 1);
    poly(ctx, [L + 7, -3.4, L + 11, 0, L + 7, 3.4]); ctx.fill();
    ctx.restore();
  }

  function drawBow(ctx, W, h, a, gold) {
    ctx.save();
    ctx.translate(W.fx, W.fy); ctx.rotate(W.ang);
    const c = gold ? GOLD : h.col;
    if (gold) glowAt(ctx, GOLD, 0, 0, 24, 0.7);
    // recurve limbs
    ctx.strokeStyle = G.rgba(c, 1); ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-4.6, -15.5); ctx.quadraticCurveTo(-0.8, -14, 1.3, -7.4); ctx.quadraticCurveTo(2.7, 0, 1.3, 7.4); ctx.quadraticCurveTo(-0.8, 14, -4.6, 15.5);
    ctx.stroke();
    ctx.strokeStyle = G.rgba(h.hot, 1); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-4.6, -15.5); ctx.lineTo(-6.4, -17.6); ctx.moveTo(-4.6, 15.5); ctx.lineTo(-6.4, 17.6); ctx.stroke();
    // string, pulled back to the other hand
    const nx = -4.4 - 8 * W.pull;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(h.hot, 0.75); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-4.6, -15.5); ctx.lineTo(nx, 0); ctx.lineTo(-4.6, 15.5); ctx.stroke();
    if (a && !a.swung) {
      // the arrow on the string
      ctx.strokeStyle = G.rgba(a.heavy ? GOLD : h.hot, 1); ctx.lineWidth = a.heavy ? 2.4 : 1.6;
      line(ctx, nx, 0, nx + 25, 0);
      ctx.fillStyle = ctx.strokeStyle; poly(ctx, [nx + 24, -2.4, nx + 30, 0, nx + 24, 2.4]); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ---- bodies. Each draws its torso and head; limbs are shared.
  function bodyVesper(ctx, h, st, sway) {
    const col = h.col;
    // tabard hanging from the belt
    ctx.fillStyle = st.dark;
    poly(ctx, [-4.2, -22, 4.2, -22, 3 - sway * 0.5, -12.5, 0 - sway * 0.6, -15, -3.4 - sway, -11.5]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.55); ctx.lineWidth = 0.9; ctx.stroke();
    // tunic
    ctx.fillStyle = st.mid;
    ctx.beginPath(); ctx.moveTo(-5.6, -36); ctx.quadraticCurveTo(0, -39.4, 5.6, -36); ctx.lineTo(4.3, -21); ctx.lineTo(-4.3, -21); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.5); ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = G.rgba(col, 0.9); ctx.lineWidth = 1.5; line(ctx, -4.3, -22.6, 4.3, -22.6); // belt
    // a small star on the chest
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = G.rgba(h.hot, 0.95);
    poly(ctx, [0.6, -33.8, 1.4, -31.2, 3.6, -30.4, 1.4, -29.6, 0.6, -27, -0.2, -29.6, -2.4, -30.4, -0.2, -31.2]); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // shoulder guard
    ctx.fillStyle = st.plate; ctx.beginPath(); ctx.arc(3.4, -36.2, 4.2, Math.PI, 0.25); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 1; ctx.stroke();
  }
  function headVesper(ctx, h, st) {
    const col = h.col;
    // a hood with a point trailing behind
    ctx.fillStyle = st.plate;
    poly(ctx, [-6.2, -40, -7.8, -45.5, -12.5, -50.5, -5, -52.8, 2, -53.4, 7, -49.6, 7.8, -44.4, 5.2, -39.6, 0, -38.4]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.75); ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = '#04070f';
    ctx.beginPath(); ctx.ellipse(3.2, -44.8, 4.7, 4.3, 0, 0, G.TAU); ctx.fill();
    glowAt(ctx, col, 4.6, -45.2, 8, 0.9);
    ctx.fillStyle = G.rgba(h.hot, 1);
    ctx.beginPath(); ctx.ellipse(4.8, -45.2, 2.9, 1.15, 0, 0, G.TAU); ctx.fill();
  }

  function bodyAster(ctx, h, st, sway) {
    const col = h.col;
    // tassets under the belt
    ctx.fillStyle = st.plate;
    for (const tx of [-6.4, 1.2]) { G.roundRect(ctx, tx - sway * 0.2, -21.5, 5.4, 7.4, 1.4); ctx.fill(); }
    // barrel chest
    ctx.fillStyle = st.mid;
    poly(ctx, [-9.2, -36.5, 9.2, -36.5, 6.8, -21, -6.8, -21]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.5); ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = G.rgba(col, 0.45); ctx.lineWidth = 1; line(ctx, 0, -35, 0, -24);
    ctx.fillStyle = st.dark; ctx.fillRect(-7, -24, 14, 3.4); // belt
    glowAt(ctx, col, 0, -22.3, 5, 0.9);
    ctx.fillStyle = G.rgba(h.hot, 1); ctx.fillRect(-1.6, -23.8, 3.2, 3);
    // collar
    ctx.strokeStyle = st.plate; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -37.5, 6, 0.25, Math.PI - 0.25); ctx.stroke();
  }
  function pauldrons(ctx, h, st) {
    for (const px of [-9.6, 9.6]) {
      ctx.fillStyle = st.plate; ctx.beginPath(); ctx.arc(px, -36.4, 5.1, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = G.rgba(h.col, 0.85); ctx.lineWidth = 1.1; ctx.stroke();
      ctx.fillStyle = G.rgba(h.col, 0.95); poly(ctx, [px - 1.6, -40.8, px, -44.6, px + 1.6, -40.8]); ctx.fill();
    }
  }
  function headAster(ctx, h, st) {
    const col = h.col;
    // horns sweeping back from a great helm
    ctx.lineCap = 'round';
    for (const [x0, cx, cy, x1, y1] of [[-6.5, -13, -53, -11.5, -60], [6, 11, -54.5, 8.5, -60.5]]) {
      ctx.strokeStyle = st.plate; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, -50.5); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
      ctx.fillStyle = G.rgba(h.hot, 1); ctx.beginPath(); ctx.arc(x1, y1, 1.2, 0, G.TAU); ctx.fill();
    }
    G.roundRect(ctx, -7.6, -53.6, 15.2, 15.4, 5);
    ctx.fillStyle = st.plate; ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = G.rgba(col, 0.95); poly(ctx, [-4.6, -53.2, 0.2, -59.8, 4, -53.2]); ctx.fill(); // crest
    // a T-shaped visor
    glowAt(ctx, col, 3.4, -45, 9, 0.9);
    ctx.fillStyle = G.rgba(h.hot, 1);
    ctx.fillRect(-0.8, -47.2, 7.6, 2); ctx.fillRect(2.6, -47.2, 2, 6.8);
  }

  function bodyLune(ctx, h, st, sway) {
    const col = h.col;
    // quiver across the back
    ctx.save();
    ctx.translate(-5.4, -31); ctx.rotate(-0.45);
    ctx.fillStyle = st.plate; G.roundRect(ctx, -2.1, -7.5, 4.2, 14, 1.4); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.7); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(col, 0.95); ctx.lineWidth = 1.2;
    for (const fx of [-1.2, 0, 1.2]) line(ctx, fx, -7.8, fx * 1.3, -10.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    // two long coat tails
    ctx.fillStyle = st.mid; ctx.strokeStyle = G.rgba(col, 0.6); ctx.lineWidth = 0.9;
    poly(ctx, [-3.4, -22.4, -0.6, -22.4, -8 - sway * 1.2, -6.5]); ctx.fill(); ctx.stroke();
    poly(ctx, [0.4, -22.4, 3.4, -22.4, 1.6 - sway * 0.8, -8]); ctx.fill(); ctx.stroke();
    // slim coat with a sash
    ctx.fillStyle = st.mid;
    ctx.beginPath(); ctx.moveTo(-4.7, -36); ctx.quadraticCurveTo(0, -38.8, 4.7, -36); ctx.lineTo(3.3, -22); ctx.lineTo(-3.3, -22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.5); ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = G.rgba(h.hot, 0.8); ctx.lineWidth = 1.1; line(ctx, -3.8, -35, 2.8, -24.5);
    ctx.strokeStyle = G.rgba(col, 0.9); ctx.lineWidth = 1.2; line(ctx, -3.3, -23, 3.3, -23);
  }
  function headLune(ctx, h, st) {
    const col = h.col;
    ctx.fillStyle = st.dark;
    ctx.beginPath(); ctx.arc(0.6, -45.4, 6.7, 0, G.TAU); ctx.fill();
    // hair swept back into the ponytail
    ctx.fillStyle = '#6f5c9c';
    poly(ctx, [-6.4, -43, -8.2, -48, -5.2, -52.6, 1, -53.6, 6, -51.2, 7.6, -46.8, 4, -49.4, -0.8, -49, -3.8, -45.2]); ctx.fill();
    ctx.strokeStyle = G.rgba(h.hot, 0.6); ctx.lineWidth = 0.9; ctx.stroke();
    glowAt(ctx, col, 4.4, -45.4, 7, 0.9);
    ctx.fillStyle = G.rgba(h.hot, 1);
    ctx.beginPath(); ctx.ellipse(4.5, -45.4, 2.3, 1.05, -0.15, 0, G.TAU); ctx.fill();
    // a crescent floating over her brow
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(h.hot, 0.95); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(1.2, -58 + Math.sin(G.t * 2.4) * 0.6, 3.4, 0.55, Math.PI * 1.5); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  // One hero, drawn from a state:
  // { x, y, facing, vx, vy, onGround, squash, runT, atk, primed, hurtFlash, dash }.
  // Used for the live hero, dash afterimages and the portraits on the hero-select screen.
  function drawBody(ctx, h, s) {
    const st = STYLE[h.id], col = h.col;
    const a = s.atk, air = !s.onGround, sp = Math.abs(s.vx);
    const run = !air && sp > 40, idle = !air && !run && !a;
    const breath = idle ? Math.sin(G.t * 3) : 0;
    const gold = s.primed || !!(a && a.heavy);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.facing * SC, SC);
    ctx.rotate(s.dash ? 0.42 : G.clamp(s.vx * s.facing / h.run, -1.6, 1.6) * 0.11);
    ctx.scale(1 - s.squash * 0.55, 1 + s.squash);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const bob = run ? Math.abs(Math.sin(s.runT)) * 1.3 : 0;
    const hipY = -20 + bob;
    const feet = footTargets(s, st);
    const leg = (i) => {
      const hx = i ? -1.2 : 1.2, k = ik(hx, hipY, feet[i][0], feet[i][1], 10.6, 10.6, -1);
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? (i ? st.mid : st.plate) : G.rgba(col, i ? 0.16 : 0.32);
        ctx.lineWidth = st.leg + (pass ? 0 : 1.5);
        ctx.beginPath(); ctx.moveTo(hx, hipY); ctx.lineTo(k.jx, k.jy); ctx.lineTo(k.ex, k.ey - 1); ctx.stroke();
      }
      // boot
      ctx.strokeStyle = i ? st.plate : G.rgba(col, 0.85); ctx.lineWidth = st.leg * 0.95;
      line(ctx, k.ex, k.ey - 1.4, k.ex + 3.2, k.ey - 1.2);
      if (h.id === 'aster') { ctx.fillStyle = i ? st.mid : st.plate; ctx.beginPath(); ctx.arc(k.jx, k.jy, 2.6, 0, G.TAU); ctx.fill(); }
    };
    leg(1);

    // everything above the hips rides the run bob and the idle breath
    ctx.translate(0, bob - breath * 0.5);
    const W = weaponPose(h, s, breath);
    const sway = G.clamp(s.vx * s.facing * 0.02, -6, 6) + (air ? G.clamp(s.vy * 0.004, -3, 4) : 0) + breath * 0.3;
    const arm = (front) => {
      const sx = front ? 2.6 : -2.2, tx = front ? W.fx : W.bx, ty = front ? W.fy : W.by;
      const k = ik(sx, -35, tx, ty, 8, 8.6, 1);
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? (front ? st.plate : st.mid) : G.rgba(col, front ? 0.34 : 0.16);
        ctx.lineWidth = st.arm + (pass ? 0 : 1.5);
        ctx.beginPath(); ctx.moveTo(sx, -35); ctx.lineTo(k.jx, k.jy); ctx.lineTo(k.ex, k.ey); ctx.stroke();
      }
      ctx.fillStyle = st.plate; ctx.beginPath(); ctx.arc(k.ex, k.ey, st.arm * 0.62, 0, G.TAU); ctx.fill();
      ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 0.8; ctx.stroke();
    };
    const weapon = () => {
      if (h.weapon === 'sword') drawSword(ctx, W, h, gold);
      else if (h.weapon === 'maul') drawMaul(ctx, W, h, st, gold);
      else drawBow(ctx, W, h, a, gold);
    };

    arm(false);
    if (W.behind) weapon(); // the shouldered maul sits behind the body
    if (h.id === 'vesper') bodyVesper(ctx, h, st, sway);
    else if (h.id === 'aster') bodyAster(ctx, h, st, sway);
    else bodyLune(ctx, h, st, sway);
    ctx.translate(0, breath * 0.5);
    leg(0);
    ctx.translate(0, -breath * 0.5);
    if (h.id === 'aster') pauldrons(ctx, h, st);
    ctx.save();
    ctx.translate(0, -breath * 0.35);
    if (h.id === 'vesper') headVesper(ctx, h, st);
    else if (h.id === 'aster') headAster(ctx, h, st);
    else headLune(ctx, h, st);
    ctx.restore();
    if (!W.behind) weapon();
    arm(true);

    if (s.hurtFlash > 0) glowAt(ctx, '255,90,90', 0, -28, 36, s.hurtFlash);
    ctx.restore();
  }

  // A portrait of a hero for the select screen, drawn into its own small canvas. It is redrawn
  // every frame while that screen is open, so the hero breathes and the cloth moves.
  const idlePose = { x: 0, y: 0, facing: 1, vx: 0, vy: 0, onGround: true, squash: 0, runT: 0, atk: null, primed: false, hurtFlash: 0, dash: false };
  G.drawHeroPortrait = function (canvas, h) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, hgt = canvas.height, st = STYLE[h.id], tl = st.tail;
    ctx.clearRect(0, 0, w, hgt);
    ctx.save();
    ctx.translate(w * 0.54, hgt * 0.9);
    ctx.scale(w / 100, w / 100);
    glowAt(ctx, h.col, 0, -34, 52, 0.45);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(0, 2, 20 * h.build, 4.5, 0, 0, G.TAU); ctx.fill();
    // a gently moving stand-in for the scarf, cape or ponytail
    const pts = [];
    for (let i = 0; i < tl.n; i++) {
      const k = i / tl.n;
      pts.push({
        x: st.anchor[0] * SC - i * tl.seg * (tl.glow ? 0.82 : 0.45),
        y: st.anchor[1] * SC + i * i * (tl.glow ? 0.22 : 0.9) + Math.sin(G.t * 2.2 + i * 0.7) * 2.2 * k,
      });
    }
    drawTail(ctx, h, pts);
    drawBody(ctx, h, idlePose);
    ctx.restore();
  };

  // Draw any hero in any pose (used by the character sheet in tools and handy for future screens).
  G.drawHero = drawBody;

  // A soft shadow on whatever is below the hero; it shrinks with height, which helps judge landings.
  P.drawShadow = function (ctx) {
    if (P.hidden || P.dead) return;
    let gy = FLOOR;
    for (const pl of G.arena.platforms) {
      if (pl.rise > 0.05 && P.x >= pl.x - 9 && P.x <= pl.x + pl.w + 9 && P.y <= pl.y + 4) gy = Math.min(gy, pl.y);
    }
    const k = G.clamp(1 - (gy - P.y) / 280, 0.25, 1);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.42 * k) + ')';
    ctx.beginPath(); ctx.ellipse(P.x, gy + 3, 19 * k * H.build, 4.8 * k, 0, 0, G.TAU); ctx.fill();
  };

  P.draw = function (ctx) {
    if (P.hidden) return;
    // dash afterimages: fading copies of the hero in the dash pose
    for (const gh of P.ghosts) {
      const k = gh.life / 0.26;
      glowAt(ctx, STAR, gh.x, gh.y - 34, 38, 0.3 * k);
      ctx.globalAlpha = 0.34 * k;
      drawBody(ctx, H, { x: gh.x, y: gh.y, facing: gh.f, vx: gh.f * C.DASH_SPEED, vy: 0, onGround: false, squash: 0, runT: 0, atk: null, primed: false, hurtFlash: 0, dash: true });
      ctx.globalAlpha = 1;
    }
    // Stormcaller's lightning
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    for (const b of P.bolts) {
      const k = b.life / 0.22;
      for (const [w, a] of [[9, 0.35], [3, 1]]) {
        ctx.strokeStyle = 'rgba(255,250,205,' + (a * k) + ')'; ctx.lineWidth = w;
        ctx.beginPath();
        b.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (P.dead) return;

    // soft light the hero carries
    glowAt(ctx, STAR, P.x, P.y - 32, 80, 0.28);
    // the Wardstone's shield while it is charged
    if (P.ward) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(HOT, 0.45 + 0.2 * Math.sin(G.t * 4)); ctx.lineWidth = 2;
      ctx.setLineDash([10, 7]); ctx.lineDashOffset = -G.t * 30;
      ctx.beginPath(); ctx.ellipse(P.x, P.y - 34, 33, 47, 0, 0, G.TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'source-over';
    }

    const blink = P.inv > 0 && P.iframes <= 0 && Math.floor(G.t * 28) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    drawTail(ctx, H, P.scarf);
    P.primed = P.combo === 1 && P.comboT > 0 && !P.atk;
    P.dash = P.dashT > 0;
    drawBody(ctx, H, P);
    ctx.globalAlpha = 1;
    drawSlashes(ctx);

    // mend channel
    if (P.healT > 0) {
      const k = P.healT / P.healTime;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(STAR, 0.3); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(P.x, P.y - 33, 48, 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = G.rgba(HOT, 0.95); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(P.x, P.y - 33, 48, -Math.PI / 2, -Math.PI / 2 + G.TAU * k); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  };
})();
