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
    ARROW_SPEED: 1350, ARROW_LIFE: 0.4, VOLLEY_DMG: 11,
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
    for (let i = 0; i < H.scarf; i++) P.scarf.push({ x: P.x, y: P.y - 36 });
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
      if (P.ghostT <= 0) { P.ghostT = 0.028; P.ghosts.push({ x: P.x, y: P.y, f: P.facing, life: 0.26 }); }
      if (G.boon('comet')) cometStep();
      if (P.dashT <= 0) { P.vx = P.dashDir * P.run * (mx === P.dashDir ? 1 : 0.6); P.dashCd = P.dashCdMax; P.sinceDash = 0; }
    } else if (P.stun > 0) {
      P.stun -= dt;
      P.vx *= Math.exp(-2.5 * dt);
    } else {
      const target = mx * P.run;
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
      dx = I.mx + G.cam.x - P.x; dy = I.my + G.cam.y - (P.y - 24);
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
      const ax = I.mx + G.cam.x - P.x, ay = I.my + G.cam.y - (P.y - 24);
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
      arrow: true, heavy, x: P.x + dx * 20, y: P.y - 26 + dy * 20, ox: P.x, oy: P.y - 26,
      vx: dx * C.ARROW_SPEED, vy: dy * C.ARROW_SPEED, t: 0, hit: new Set(), dmg,
      life: (life || C.ARROW_LIFE) * (1 + 0.3 * G.boon('reach')),
    });
  }

  function loose(a) {
    arrow(a.dx, a.dy, a.dmg, a.heavy);
    G.audio.play(a.heavy ? 'arrowHeavy' : 'arrow');
    // firing downward in the air lifts her
    if (a.dy > 0.5 && !P.onGround) { P.vy = Math.min(P.vy, -430); P.squash = 0.15; }
    if (a.heavy) {
      P.vx -= a.dx * 120;
      G.fx.ring(P.x + a.dx * 22, P.y - 26 + a.dy * 22, { r0: 4, r1: 34, life: 0.2, color: GOLD, width: 4 });
      if (G.boon('crescent')) wave(P.x + a.dx * 30, P.y - 26 + a.dy * 30, a.dx, a.dy);
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
      G.shots.push({ x: P.x + vx * 18, y: P.y - 24 + vy * 18, vx: vx * C.LANCE_SPEED, vy: vy * C.LANCE_SPEED, t: 0, hit: new Set(), dmg });
    }
  }

  function muzzle(dx, dy) {
    G.fx.shake(6);
    G.fx.flash(STAR, 0.12, 0.2);
    G.fx.ring(P.x + dx * 20, P.y - 24 + dy * 20, { r0: 6, r1: 60, life: 0.25, color: HOT, width: 5 });
    G.fx.burst(P.x + dx * 20, P.y - 24 + dy * 20, { n: 14, color: STAR, speed: [100, 500], angle: Math.atan2(dy, dx), spread: 1.1, life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
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
      const dx = B.core.x - P.x, dy = B.core.y - (P.y - 24), d = Math.hypot(dx, dy) || 1;
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
    P.vx = dir * 430; P.vy = (src && src.pop) || -430; P.onGround = false; P.plat = null; P.jumpHeld = false;
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
            // arrows hit harder the less distance they have flown: +60% within 120px, nothing extra past 300px
            const close = 1 + 0.6 * G.clamp((300 - G.dist(s.x, s.y, s.ox, s.oy)) / 180, 0, 1);
            const res = G.boss.damage(Math.round(s.dmg * close), t, { x: s.x, y: s.y, heavy: s.heavy, finisher: s.heavy, dir: G.sign(s.vx), poise: H.poise });
            if (res) {
              P.gain(s.heavy ? C.GAIN_HEAVY : C.GAIN_HIT);
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
  function updateScarf(dt) {
    const s = P.scarf;
    if (!s.length) return;
    const seg = 6.5 * (H.scarfW > 1 ? 1.2 : 1);
    s[0].x = P.x - P.facing * 5; s[0].y = P.y - 37;
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i];
      b.y += (26 + i * 3) * dt;
      b.x -= P.facing * 34 * dt;
      b.y += Math.sin(G.t * 9 + i * 0.9) * 10 * dt;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d > seg) { b.x = a.x + dx / d * seg; b.y = a.y + dy / d * seg; }
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
        ctx.beginPath(); ctx.moveTo(2, -26 - h); ctx.lineTo(2 + len, -26); ctx.lineTo(2, -26 + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = G.rgba(HOT, alpha);
        ctx.beginPath(); ctx.moveTo(2, -26 - h * 0.4); ctx.lineTo(2 + len * 0.94, -26); ctx.lineTo(2, -26 + h * 0.4); ctx.closePath(); ctx.fill();
        ctx.restore();
        continue;
      }
      if (s.kind === 'up') {
        cx = 0; cy = -50; R = s.heavy ? 82 : 62;
        a0 = -Math.PI + (s.heavy ? 0.05 : 0.3); a1 = -(s.heavy ? 0.05 : 0.3);
        if (s.idx === 1) { const t0 = a0; a0 = a1; a1 = t0; }
        if (s.dir < 0) ctx.scale(-1, 1);
      }
      else if (s.kind === 'down') { cx = 0; cy = -14; R = 58; a0 = 0.3; a1 = Math.PI - 0.3; if (s.dir < 0) ctx.scale(-1, 1); }
      else {
        ctx.scale(s.dir, 1);
        cx = 6; cy = -26; R = s.heavy ? 102 : 70;
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

  function silhouette(ctx, h) {
    ctx.save();
    ctx.scale(h.build, 1);
    ctx.beginPath();
    ctx.moveTo(-9, -37); ctx.quadraticCurveTo(0, -42, 9, -37);
    ctx.lineTo(12, -12); ctx.lineTo(-13, -12); ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(1, -45, 9, 0, G.TAU); ctx.fill();
    ctx.restore();
  }

  // Angle of a melee weapon through its swing, in the hero's own (facing-right) frame.
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

  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  // The weapon, drawn in the hero's own frame: at rest, or following the attack. `primed` turns it
  // gold when the next attack is the finisher.
  function drawWeapon(ctx, h, s) {
    const a = s.atk, col = h.col, hot = h.hot;
    const gold = s.primed || (a && a.heavy);
    ctx.lineCap = 'round';
    if (h.weapon === 'sword') {
      if (!a) {
        if (s.primed) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(G.fx.glow(GOLD), -29, -38, 36, 36); ctx.globalCompositeOperation = 'source-over'; }
        ctx.strokeStyle = G.rgba(s.primed ? GOLD : col, s.primed ? 1 : 0.9); ctx.lineWidth = s.primed ? 3.2 : 2.2;
        line(ctx, -5, -32, -17, -7);
        return;
      }
      const ang = swingAngle(a), sx = 3, sy = -31, len = a.thrust ? 50 : a.heavy ? 48 : 38;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(gold ? GOLD : col, gold ? 0.7 : 0.5); ctx.lineWidth = gold ? 9 : 7;
      line(ctx, sx + Math.cos(ang) * 8, sy + Math.sin(ang) * 8, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      ctx.strokeStyle = G.rgba(hot, 1); ctx.lineWidth = 2.6;
      line(ctx, sx + Math.cos(ang) * 6, sy + Math.sin(ang) * 6, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      ctx.globalCompositeOperation = 'source-over';
    } else if (h.weapon === 'maul') {
      // a long haft with a heavy glowing head
      const ang = a ? swingAngle(a) : 2.0, sx = a ? 3 : -6, sy = a ? -31 : -34, len = a ? 50 : 36;
      const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
      ctx.strokeStyle = '#0a1410'; ctx.lineWidth = 5;
      line(ctx, sx, sy, ex, ey);
      ctx.strokeStyle = G.rgba(col, 0.55); ctx.lineWidth = 1.6;
      line(ctx, sx, sy, ex, ey);
      ctx.save();
      ctx.translate(ex, ey); ctx.rotate(ang);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(G.fx.glow(gold ? GOLD : col), -24, -24, 48, 48);
      ctx.globalCompositeOperation = 'source-over';
      G.roundRect(ctx, -9, -13, 18, 26, 4);
      ctx.fillStyle = '#0d1f18'; ctx.fill();
      ctx.strokeStyle = G.rgba(gold ? GOLD : col, 1); ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillStyle = G.rgba(gold ? GOLD : hot, 0.95);
      ctx.fillRect(-2.5, -8, 5, 16);
      ctx.restore();
    } else {
      // a bow held towards the aim; the string draws back during the wind-up
      const ang = a ? Math.atan2(a.dy, Math.abs(a.dx) < 0.001 ? 0.001 : Math.abs(a.dx)) : 0.25;
      const pull = a ? G.clamp(a.t / Math.max(0.03, a.a0), 0, 1) * (a.swung ? 0 : 1) : 0;
      ctx.save();
      ctx.translate(6, -28); ctx.rotate(ang);
      if (gold) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(G.fx.glow(GOLD), -8, -24, 48, 48); ctx.globalCompositeOperation = 'source-over'; }
      ctx.strokeStyle = G.rgba(gold ? GOLD : col, 1); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(-6, 0, 20, -1.05, 1.05); ctx.stroke();
      const tx = -6 + Math.cos(1.05) * 20, ty = Math.sin(1.05) * 20;
      ctx.strokeStyle = G.rgba(hot, 0.9); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(tx, -ty); ctx.lineTo(tx - 9 * pull, 0); ctx.lineTo(tx, ty); ctx.stroke();
      if (a && !a.swung) {
        ctx.strokeStyle = G.rgba(a.heavy ? GOLD : hot, 1); ctx.lineWidth = a.heavy ? 3 : 2;
        line(ctx, tx - 9 * pull, 0, tx - 9 * pull + 26, 0);
      }
      ctx.restore();
    }
  }

  // One hero, drawn from a state: { x, y, facing, vx, vy, onGround, squash, runT, atk, primed, hurtFlash }.
  // Used for the live hero and for the portraits on the hero-select screen.
  function drawBody(ctx, h, s) {
    const col = h.col, hot = h.hot;
    const sp = Math.abs(s.vx);
    const air = !s.onGround;
    // a slow breath while standing still
    const sq = s.squash + (!air && sp < 20 ? Math.sin(G.t * 3.2) * 0.018 : 0);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.facing, 1);
    ctx.rotate(G.clamp(s.vx * s.facing / h.run, -1.6, 1.6) * 0.1);
    ctx.scale(1 - sq * 0.55, 1 + sq);

    // legs
    ctx.strokeStyle = '#080c16'; ctx.lineWidth = 5 * (h.build > 1.1 ? 1.2 : 1); ctx.lineCap = 'round';
    const run = s.onGround && sp > 40, stance = h.build > 1.1 ? 1.5 : 1;
    for (let i = 0; i < 2; i++) {
      const ph = s.runT + i * Math.PI;
      let fx = (i ? 4 : -4) * stance, fy = 0;
      if (run) { fx += Math.sin(ph) * 9; fy = -Math.max(0, Math.cos(ph)) * 6; }
      else if (air) { fx += (i ? 5 : -7); fy = -5 - (s.vy < 0 ? 4 : 0); }
      line(ctx, (i ? 3 : -3) * stance, -15, fx, fy - 1);
    }

    // melee weapons sit behind the body; the bow is held in front
    if (h.weapon !== 'bow') drawWeapon(ctx, h, s);

    ctx.save();
    ctx.scale(h.build, 1);
    // cloak
    const sway = G.clamp(s.vx * s.facing * 0.022, -9, 9);
    const g = ctx.createLinearGradient(0, -40, 0, -10);
    g.addColorStop(0, h.cloak[0]); g.addColorStop(1, h.cloak[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-9, -37); ctx.quadraticCurveTo(0, -42, 9, -37);
    ctx.lineTo(12, -13);
    ctx.quadraticCurveTo(2, -9, -13 - sway, -11 + (air ? -3 : 0));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.55); ctx.lineWidth = 1.4; ctx.stroke();
    if (h.id === 'aster') {
      // pauldrons
      ctx.fillStyle = '#12251c'; ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 1.4;
      for (const px of [-9, 9]) { ctx.beginPath(); ctx.arc(px, -35, 5.5, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    // hood and visor
    ctx.fillStyle = h.cloak[1];
    ctx.beginPath(); ctx.arc(1, -45, 9.5, 0, G.TAU); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.6); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#060a14';
    ctx.beginPath(); ctx.ellipse(4, -44, 5.5, 4.5, 0, 0, G.TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(G.fx.glow(col), -6, -55, 22, 22);
    ctx.fillStyle = G.rgba(hot, 1);
    ctx.beginPath(); ctx.ellipse(5.5, -44.5, 3.2, 1.5, 0, 0, G.TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    if (h.id === 'aster') {
      // a crest along the top of the helm
      ctx.fillStyle = G.rgba(col, 0.9);
      ctx.beginPath(); ctx.moveTo(-6, -53); ctx.lineTo(2, -62); ctx.lineTo(7, -53); ctx.closePath(); ctx.fill();
    } else if (h.id === 'lune') {
      // a crescent floating over the hood
      ctx.strokeStyle = G.rgba(hot, 0.95); ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, -62, 6.5, 0.5, Math.PI * 1.55); ctx.stroke();
    }
    ctx.restore();

    if (h.weapon === 'bow') drawWeapon(ctx, h, s);

    if (s.hurtFlash > 0) {
      ctx.globalAlpha = s.hurtFlash;
      ctx.fillStyle = '#ff8a8a';
      silhouette(ctx, h);
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
      ctx.lineWidth = (1.5 + 4.5 * k) * H.scarfW;
      line(ctx, s[i - 1].x, s[i - 1].y, s[i].x, s[i].y);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // A still portrait of a hero for the select screen, drawn into its own small canvas.
  G.drawHeroPortrait = function (canvas, h) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, hgt = canvas.height;
    ctx.clearRect(0, 0, w, hgt);
    ctx.save();
    ctx.translate(w / 2, hgt * 0.86);
    ctx.scale(w / 62, w / 62);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(G.fx.glow(h.col), -40, -72, 80, 80);
    ctx.globalAlpha = 1;
    // a still scarf trailing behind
    ctx.lineCap = 'round';
    let px = -5, py = -37;
    for (let i = 1; i < h.scarf; i++) {
      const k = 1 - i / h.scarf, nx = px - 4.6, ny = py + 1.2 + i * 0.5 + Math.sin(i * 0.9) * 1.2;
      ctx.strokeStyle = G.rgba(h.col, 0.25 + 0.65 * k); ctx.lineWidth = (1.5 + 4.5 * k) * h.scarfW;
      line(ctx, px, py, nx, ny);
      px = nx; py = ny;
    }
    ctx.globalCompositeOperation = 'source-over';
    drawBody(ctx, h, { x: 0, y: 0, facing: 1, vx: 0, vy: 0, onGround: true, squash: 0, runT: 0, atk: null, primed: false, hurtFlash: 0 });
    ctx.restore();
  };

  // A soft shadow on whatever is below the hero; it shrinks with height, which helps judge landings.
  P.drawShadow = function (ctx) {
    if (P.hidden || P.dead) return;
    let gy = FLOOR;
    for (const pl of G.arena.platforms) {
      if (pl.rise > 0.05 && P.x >= pl.x - 9 && P.x <= pl.x + pl.w + 9 && P.y <= pl.y + 4) gy = Math.min(gy, pl.y);
    }
    const k = G.clamp(1 - (gy - P.y) / 280, 0.25, 1);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.42 * k) + ')';
    ctx.beginPath(); ctx.ellipse(P.x, gy + 3, 17 * k * H.build, 4.5 * k, 0, 0, G.TAU); ctx.fill();
  };

  P.draw = function (ctx) {
    if (P.hidden) return;
    // dash afterimages
    ctx.globalCompositeOperation = 'lighter';
    for (const gh of P.ghosts) {
      ctx.save();
      ctx.translate(gh.x, gh.y); ctx.scale(gh.f, 1);
      ctx.fillStyle = G.rgba(STAR, 0.45 * (gh.life / 0.26));
      silhouette(ctx, H);
      ctx.restore();
    }
    // Stormcaller's lightning
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
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.28;
    ctx.drawImage(G.fx.glow(STAR), P.x - 70, P.y - 92, 140, 140);
    ctx.globalAlpha = 1;
    // the Wardstone's shield while it is charged
    if (P.ward) {
      ctx.strokeStyle = G.rgba(HOT, 0.45 + 0.2 * Math.sin(G.t * 4)); ctx.lineWidth = 2;
      ctx.setLineDash([10, 7]); ctx.lineDashOffset = -G.t * 30;
      ctx.beginPath(); ctx.ellipse(P.x, P.y - 24, 26, 36, 0, 0, G.TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalCompositeOperation = 'source-over';

    const blink = P.inv > 0 && P.iframes <= 0 && Math.floor(G.t * 28) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    drawScarf(ctx);
    P.primed = P.combo === 1 && P.comboT > 0 && !P.atk;
    drawBody(ctx, H, P);
    ctx.globalAlpha = 1;
    drawSlashes(ctx);

    // mend channel
    if (P.healT > 0) {
      const k = P.healT / P.healTime;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(STAR, 0.3); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(P.x, P.y - 24, 40, 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = G.rgba(HOT, 0.95); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(P.x, P.y - 24, 40, -Math.PI / 2, -Math.PI / 2 + G.TAU * k); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  };
})();
