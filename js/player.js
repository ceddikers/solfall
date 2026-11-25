// Solfall - the hero. Movement, dash and mending are shared; the weapon and the special come from
// the chosen hero (see G.HEROES in run.js): Vesper's sword and lance, Aster's maul and Starfall,
// Lune's bow and volley, Eos's sheathed blade and Dawn Arc.
'use strict';
(function () {
  const FLOOR = G.FLOOR;
  const C = G.PLAYER = {
    RUN: 335, ACC_G: 4400, ACC_A: 3000, GRAV: 2500, JUMP: 830, JUMP2: 740, MAXFALL: 1500,
    DASH_SPEED: 940, DASH_T: 0.16, DASH_CD: 0.34, IFRAME: 0.24,
    COYOTE: 0.09, BUFFER: 0.13, HURT_INV: 1.15, HEAL_T: 0.85,
    FLOURISH_T: 0.7, FLOURISH_CD: 5,
    SEG: 100, SEGS: 3,
    GAIN_HIT: 8, GAIN_HEAVY: 16, GAIN_PERFECT: 34, GAIN_ORB: 6,
    LANCE_DMG: 42, LANCE_SPEED: 1700,
    LANCE_WIND: 0.09, // Vesper draws her arm back with the lance before it flies
    ARROW_SPEED: 1350, ARROW_LIFE: 0.4, VOLLEY_DMG: 10,
    ARROW_GAIN: 6, ARROW_GAIN_HEAVY: 12, // Starlight per arrow hit: less than a melee hit
    BOW_SLOW: 0.6,                       // Lune's speed while she is drawing and loosing
    STARFALL_DMG: 42, STARFALL_R: 165, // (v2.4c: 46)
    // (v1.7b: 0.9 s for +80% and a wave of 20. At 1.05 s for +50% and a wave of 14, holding the smash
    // dealt less in a second than not holding it; before v1.4a, at 0.9 s for double and 24, it was too much.)
    CHARGE_T: 0.9,   // how long Aster's smash takes to charge fully
    CHARGE_DMG: 0.8, // how much a full charge adds to the smash (0.8 = 36 becomes 65; v2.4c trimmed the smash, not the charge)
    // Eos keeps her blade in its sheath. Holding the attack gathers Focus; letting go is the draw.
    FOCUS: [0.3, 0.65, 1.05],     // seconds of stance for the first, second and third mark (v2.1b: from 0.45, 0.95, 1.5)
    DRAW_DMG: [18, 46, 100],      // what the draw is worth at one, two and three marks: patience is paid for, the third mark most of all
    DRAW_STEP: [170, 230, 300],   // how far it carries her
    DRAW_T: 0.1,                  // how long that takes
    DRAW_WAIT: [0.2, 0.32, 0.46], // how long after it the cut lands: the blade going home
    DRAW_GAIN: [12, 24, 44],      // Starlight for each thing a draw cut
    STANCE_SLOW: 0.62,            // her speed while she holds the stance (v2.1b: from 0.45)
    AIR_STANCE: 0.95,             // seconds she can hold the stance in the air in one jump, drifting down as she gathers
    AIR_FALL: 85,                 // how fast she drifts down while she does
    AIR_GATHER: 0.9,              // Focus gathers this much slower in the air
    AIR_REACH: 1.25,              // a draw from the air carries this much further (what flies is further away)
    ARC_DMG: 40, ARC_SPEED: 1500, // the crescent of light (Second Light throws one when a blow is turned)
    BANK_HOLD: 0.17,              // how long the button must stay down after a press before the cuts that landed light marks (a tap is a cut, not a stance)
    GUARD_T: 0.65,                // how long Still Point waits for a blow (v2.1b: from 0.45; half its Starlight back if none comes)
    EDGE_T: 2.5,                  // how long a turned blow keeps all three marks lit without the button held
  };
  const GOLD = '255,214,140'; // the finisher's colour
  // The active hero and its two light colours; set in P.reset.
  let H = G.HEROES[0], STAR = H.col, HOT = H.hot;

  const P = G.player = {};
  G.shots = [];
  G.wind = 0;
  G.slick = 0; // how frozen the floor is (the Magus's second phase)

  const _box = { cx: 0, cy: 0, hw: 11, hh: 21 };
  // (P.pad swells the box for an instant when a hazard asks whether it only just missed: see H.update and P.graze)
  P.box = function () { _box.cx = P.x; _box.cy = P.y - 22; _box.hw = 11 + (P.pad || 0); _box.hh = 21 + (P.pad || 0); return _box; };

  P.reset = function () {
    H = G.hero(); STAR = H.col; HOT = H.hot;
    // the hero, the relic and the boons taken this run set these
    const hp = Math.max(1, G.diff().hp + H.hp + G.boon('heart') + G.up('vigor') - G.boon('glass') - G.relics.crownCost() + G.relics.pearlHp() + (G.boon('hollow') ? 3 : 0));
    const maxAir = H.air + G.boon('wind') + (G.relic('cloak') ? 1 : 0), maxDash = 1 + G.boon('twin') + G.relics.airDashes();
    const segs = C.SEGS + G.boon('fourth') + G.relics.moonSegs();
    Object.assign(P, {
      hero: H,
      x: 300, y: FLOOR, vx: 0, vy: 0, facing: 1,
      run: H.run * G.relics.runK(),
      onGround: true, plat: null, coyote: 0, dropT: 0, jumpHeld: false,
      maxAir, maxDash, airJumps: maxAir, airDashes: maxDash,
      segs,
      healTime: C.HEAL_T * (G.boon('swift') ? 0.5 : 1) * G.sets.healTime() * G.relics.mendTimeK(),
      dashCdMax: C.DASH_CD * (G.boon('twin') ? 0.7 : 1) * G.relics.dashCdK() * (G.boon('voidstep') ? 0.5 : 1),
      dashHit: new Set(), dawnUsed: false, borrowUsed: false,
      ward: G.relic('ward'), hitCount: 0, plunge: false, afterT: 0, afterScale: 1,
      jumpBuf: 0, atkBuf: 0, dashBuf: 0, flareBuf: 0, wardT: 0,
      dashT: 0, dashCd: 0, dashDir: 1, iframes: 0, pdDone: false, ghostT: 0,
      inv: 0, stun: 0, hp, maxHp: hp,
      ember: G.relic('moons') ? C.SEG * segs : 40 * G.up('spark'), healT: 0, healLock: false,
      atk: null, atkCd: 0, combo: -1, comboT: 0, sinceDash: 9,
      dead: false, deadT: 0, hidden: false,
      squash: 0, runT: 0, stepN: 0, skidT: 0, hurtFlash: 0, emberFlash: 0,
      ult: 0, ulting: false, vanish: false, shroudT: 0,
      flT: 0, flCd: 0, flBrazen: false, lifts: 0,
      cast: null, // a special's body motion: Vesper's throw, Lune's release, Aster's slam (see castPose)
      recov: null, // how the weapon comes back to rest after the last attack (see recoverPose)
      // Eos: the stance she is holding, the Focus gathered in it, the draw carrying her, and the cuts made but not yet landed
      hold: null, focus: 0, strung: 0, sun: 0, hangs: [], pin: null, stars: null, faults: [], drawT: 0, drawV: null, owed: [], arc2: null, hush: null,
      pad: 0, grazeCd: 0, streakN: 0, streakT: 0, fallT: 0, edge: 0, fadeT: 0, castN: 0,
      grabbed: null, wraps: 0, wrapsHit: 0, // (held by Kairo; Sparring Wraps' blink and its blow)
      hiltT: 0, hiltUsed: false, hiltN: 0, // (the Offered Hilt's six seconds of echoes, once a fight: champion.js)
      rig: {}, // pose memory for drawing (see drawBody)
      scarf: [], ghosts: [], slashes: [], bolts: [],
      stats: { dmg: 0, hits: 0, perfect: 0, heals: 0, lances: 0 },
    });
    for (let i = 0; i < STYLE[H.id].tail.n; i++) P.scarf.push({ x: P.x, y: P.y - 40 });
    G.shots.length = 0;
    G.wind = 0; G.slick = 0;
  };

  function ground() {
    P.vy = 0; P.onGround = true; P.airJumps = P.maxAir; P.airDashes = P.maxDash; P.coyote = C.COYOTE; P.lifts = 0;
  }

  P.gain = function (n) {
    const before = Math.floor(P.ember / C.SEG);
    P.ember = Math.min(C.SEG * P.segs, P.ember + n * (1 + 0.4 * G.boon('vein')) * G.relics.gainK() * (G.boon('starving') ? 2 : 1));
    if (Math.floor(P.ember / C.SEG) > before) { G.audio.play('segment'); P.emberFlash = 1; }
    G.flow.hit(n); // whatever earns Starlight also builds Flow
  };

  // A flourish held to its end without being struck.
  function flourished() {
    const brazen = P.flBrazen;
    P.flT = 0; P.flCd = C.FLOURISH_CD; P.flBrazen = false;
    G.audio.play('flourish', { brazen });
    const y = P.y - 96;
    G.fx.ring(P.x, y, { r0: 8, r1: brazen ? 150 : 90, life: 0.4, color: brazen ? GOLD : STAR, width: brazen ? 6 : 4 });
    G.fx.burst(P.x, y, { n: brazen ? 26 : 12, color: brazen ? GOLD : HOT, speed: [80, 380], life: [0.3, 0.8], size: [2, 4.5], kind: 'spark' });
    G.fx.light(P.x, y, brazen ? 260 : 150, brazen ? GOLD : STAR, 0.4, 0.5);
    if (G.state !== 'fight') return; // in the camp it is only for show
    G.fx.text(P.x, P.y - 118, brazen ? 'BRAZEN' : 'FLOURISH', { color: brazen ? GOLD : HOT, size: brazen ? 24 : 16, life: 0.9 });
    G.flow.add(brazen ? 30 : 10);
    P.ult = Math.min(100, P.ult + (brazen ? 10 : 3));
    if (brazen) { G.feats.bump('brazen'); G.fx.shake(5); }
  }

  // The Warden entered a new phase: the Wardstone recharges.
  P.onPhase = function () {
    if (!G.relic('ward') || P.dead || P.ward) return;
    P.ward = true; P.wardT = 0;
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
    // Eos: a cut that has been made lands when its blade is home, whatever she is doing by then
    for (let i = P.owed.length - 1; i >= 0; i--) {
      const o = P.owed[i];
      o.t -= dt;
      if (o.t <= 0) { P.owed.splice(i, 1); landCut(o); }
    }
    sigStep(dt); // (the signature boons that keep time: see below)
    // a Dawnbreak takes the hero over until it is done
    if (P.ulting) { G.flow.ultStep(dt); return; }
    // and so does the finishing blow at the end of a fight (finish.js)
    if (P.finishing) { G.finish.step(dt); return; }
    // held (v2.4a, kairo.js: the spin throw's grip, the Last Wave's struggle): carried where the hold
    // is, and nothing the hero does counts but what the hold listens for
    if (P.grabbed) {
      const g = P.grabbed;
      if (g.mash) { if (I.pressed.attack) g.presses = (g.presses || 0) + 1; if (I.pressed.ult && P.ult >= 100) g.ult = true; }
      P.x = g.x; P.y = g.y; P.vx = 0; P.vy = 0; P.onGround = g.y >= FLOOR - 1; P.plat = null;
      P.atk = null; P.cast = null; P.dashT = 0; P.healT = 0; P.drawT = 0; P.plunge = false; P.hold = null; P.flT = 0; P.recov = null;
      if (g.face) P.facing = g.face;
      P.inv = Math.max(P.inv, 0.05);
      return;
    }

    P.inv = Math.max(0, P.inv - dt);
    if (P.hiltT > 0) P.hiltT -= dt;
    P.iframes = Math.max(0, P.iframes - dt);
    // Ember Ward (a pair): the ward a mend gives lasts 4 seconds
    if (P.wardT > 0) { P.wardT -= dt; if (P.wardT <= 0) { P.wardT = 0; P.ward = false; } }
    P.grazeCd = Math.max(0, P.grazeCd - dt);
    if (P.wraps > 0) P.wraps -= dt;
    if (P.wrapsHit > 0) P.wrapsHit -= dt;
    P.streakT = Math.max(0, P.streakT - dt);
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
    // Second Light: the Dawn Arc's second crescent
    if (P.arc2) { P.arc2.t -= dt; if (P.arc2.t <= 0) { const q = P.arc2; P.arc2 = null; arcShot(q.dx, q.dy, 0.6); G.audio.play('draw'); } }
    // a special in motion: the lance leaves the hand when the arm comes through
    if (P.cast) {
      const c = P.cast;
      c.t += dt;
      if (!c.thrown && c.t >= c.wind) { c.thrown = true; if (c.kind === 'lance') throwLance(c); else if (c.kind === 'arc') throwArc(c); }
      if (c.t >= c.dur) {
        P.cast = null;
        if (c.kind === 'arc') G.audio.play('sheath', { soft: true });
        if (c.kind === 'guard' && !c.hit) P.ember = Math.min(C.SEG * P.segs, P.ember + C.SEG * 0.5); // nothing came: half of it back
      }
    }
    // Starfall's plunge passes through attacks until it lands
    if (P.plunge) P.iframes = Math.max(P.iframes, 0.1);

    const ctl = G.playerControl();
    const free = !P.plunge && !(P.cast && !P.cast.thrown) && P.drawT <= 0; // nothing else can be started mid-plunge, mid-throw or mid-draw
    let mx = ctl ? I.axisX() : 0;
    if (P.cast && P.cast.kind === 'guard' && !P.cast.thrown) mx = 0; // Still Point: he stands his ground
    const up = ctl && I.down.up, down = ctl && I.down.down;
    if (ctl) {
      if (I.pressed.jump) P.jumpBuf = C.BUFFER;
      if (I.pressed.attack) P.atkBuf = C.BUFFER;
      if (I.pressed.dash) P.dashBuf = C.BUFFER;
      if (I.pressed.flare) P.flareBuf = C.BUFFER;
      // holding the button keeps the combo going
      // (not for Eos: for her a held button is the stance)
      if (I.down.attack && P.atkCd <= 0 && !H.draw) P.atkBuf = Math.max(P.atkBuf, 0.03);
    }

    // --- flourish: a salute that leaves you open for its whole length. Finish one and Flow and
    // Dawnbreak rise; finish one while the boss is in the middle of an attack and they rise far more.
    P.flCd = Math.max(0, P.flCd - dt);
    if (P.flT > 0) {
      P.flT += dt; mx = 0;
      P.jumpBuf = P.atkBuf = P.dashBuf = P.flareBuf = 0;
      if (G.state === 'fight' && G.boss.attackName && !G.boss.staggered) P.flBrazen = true;
      if (Math.random() < dt * 50) {
        G.fx.spawn({ x: P.x + P.facing * 8 + G.rand(-10, 10), y: P.y - 96 + G.rand(-10, 10), vx: G.rand(-40, 40), vy: -G.rand(20, 120), life: G.rand(0.3, 0.7), size: G.rand(1.6, 3.2), color: Math.random() < 0.5 ? HOT : STAR, wob: 60, rot: G.rand(0, 6) });
      }
      if (!P.onGround || P.stun > 0) P.flT = 0;
      else if (P.flT >= C.FLOURISH_T) flourished();
    } else if (ctl && I.pressed.taunt && free && P.onGround && P.dashT <= 0 && !P.atk && !P.hold && P.stun <= 0 && P.healT === 0) {
      if (P.flCd > 0) { G.audio.play('empty'); }
      else {
        P.flT = 0.0001; P.flBrazen = false; mx = 0;
        G.audio.play('whoosh');
        G.fx.ring(P.x, P.y - 30, { r0: 60, r1: 14, life: 0.3, color: STAR, width: 3 });
      }
    }

    // --- mend: hold to spend one segment of Starlight for health
    if (!I.down.heal) P.healLock = false;
    const wantHeal = ctl && I.down.heal && !P.healLock && P.flT === 0 && !P.hold && !G.bane('hollow'); // (Hollow Crown: no mending)
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
        P.hp = Math.min(P.maxHp, P.hp + G.relics.mendHp());
        P.ember -= C.SEG; P.healT = 0; P.healLock = true; P.stats.heals++;
        G.audio.play('heal');
        G.fx.ring(P.x, P.y - 24, { r0: 10, r1: 90, life: 0.45, color: STAR, width: 6 });
        G.fx.burst(P.x, P.y - 24, { n: 18, color: HOT, speed: [60, 240], life: [0.3, 0.7], size: [3, 6] });
        G.fx.burst(P.x, P.y - 8, { n: 12, color: STAR, speed: [10, 60], life: [0.6, 1.2], size: [2, 3.5], grav: -260, wob: 120, jitter: 16 });
        G.fx.light(P.x, P.y - 24, 170, STAR, 0.35, 0.5);
        G.fx.text(P.x, P.y - 70, 'MENDED', { color: STAR, size: 16 });
        if (G.boon('emberward') && !P.ward) {
          P.ward = true; P.wardT = 4;
          G.fx.ring(P.x, P.y - 22, { r0: 70, r1: 30, life: 0.4, color: HOT, width: 4 });
        }
        G.sets.mended(); // (the Mend slot's set boon: sets.js)
        G.relics.mended(); // (the Ember Chalice, awakened: relics.js)
      }
    } else {
      if (ctl && I.pressed.heal && P.hp < P.maxHp && (P.ember < C.SEG || G.bane('hollow'))) { G.audio.play('empty'); P.emberFlash = -1; }
      P.healT = 0;
    }

    // --- dash
    if (P.dashBuf > 0 && !P.plunge && P.drawT <= 0 && P.dashT <= 0 && P.dashCd <= 0 && P.stun <= 0 && (P.onGround || P.airDashes > 0)) {
      P.dashBuf = 0;
      P.dashT = C.DASH_T; P.dashDir = mx || P.facing; P.facing = P.dashDir;
      P.iframes = C.IFRAME; P.pdDone = false;
      if (!P.onGround) P.airDashes--;
      G.relics.dashed(); // (Cinder Pelt, Quicksilver: relics.js)
      if (G.bane('voidstep') && G.state === 'fight') G.hexes.scar(P.x); // Void Step's bane (hexes.js)
      if (P.cast && !P.cast.thrown && P.cast.kind === 'lance') throwLance(P.cast);
      if (P.cast && !P.cast.thrown && P.cast.kind === 'arc') throwArc(P.cast);
      P.cast = null;
      P.atk = null; P.healT = 0; P.ghostT = 0; P.dashHit.clear();
      G.audio.play('dash');
      G.fx.burst(P.x, P.y - 22, { n: 8, color: STAR, speed: [80, 300], angle: P.dashDir > 0 ? Math.PI : 0, spread: 0.9, life: [0.15, 0.4], kind: 'spark', size: [2, 3] });
      // the push-off: dust thrown back along the ground, or a ring of air
      G.fx.kick(P.dashDir * 3.5, 0);
      if (P.onGround) G.fx.dust(P.x - P.dashDir * 6, P.y, 5, { dir: -P.dashDir, speed: [60, 280], size: [6, 12], up: 40 });
      else G.fx.ring(P.x - P.dashDir * 8, P.y - 22, { r0: 8, r1: 44, life: 0.22, color: STAR, width: 3 });
    }

    // --- horizontal movement
    if (P.plunge) {
      P.vx = 0;
    } else if (P.drawT > 0) {
      // Eos's draw: she is carried along the line she aimed down, through whatever stands on it
      P.drawT -= dt;
      P.vx = P.drawV.x; P.vy = P.drawV.y;
      P.ghostT -= dt;
      if (P.ghostT <= 0) {
        const a = P.atk;
        P.ghostT = 0.02;
        P.ghosts.push({ x: P.x, y: P.y, f: P.facing, life: 0.24, atk: a && a.kind === 'draw' ? { kind: 'draw', t: a.t, a0: 0, a1: a.a1, dx: a.dx, dy: a.dy, lvl: a.lvl, heavy: a.heavy } : null });
        for (let i = 0; i < 3; i++) {
          G.fx.spawn({ kind: 'spark', x: P.x + G.rand(-8, 8), y: P.y - G.rand(8, 46), vx: -P.drawV.x * G.rand(0.1, 0.24), vy: -P.drawV.y * G.rand(0.1, 0.24), life: G.rand(0.12, 0.26), size: G.rand(1.2, 2.2), color: a && a.heavy ? GOLD : STAR, len: 0.075 });
        }
      }
      if (P.drawT <= 0) {
        // she stops as fast as she started; in the air she hangs for a moment
        const dir = G.sign(P.drawV.x);
        P.vx = P.drawV.x * 0.05; P.vy = P.onGround ? 0 : Math.min(-90, P.drawV.y * 0.05);
        if (P.onGround && dir) G.fx.dust(P.x + dir * 12, P.y, 4, { dir, speed: [60, 260], size: [5, 10], up: 30 });
      }
    } else if (P.dashT > 0) {
      P.dashT -= dt;
      P.vx = P.dashDir * C.DASH_SPEED; P.vy = 0;
      P.ghostT -= dt;
      if (P.ghostT <= 0) {
        P.ghostT = 0.05; P.ghosts.push({ x: P.x, y: P.y, f: P.facing, life: 0.26 });
        if (P.onGround) G.sets.trail(P.x); // Ashen Trail
        for (let i = 0; i < 3; i++) {
          G.fx.spawn({ kind: 'spark', x: P.x - P.dashDir * G.rand(0, 26), y: P.y - G.rand(4, 46), vx: -P.dashDir * G.rand(260, 620), vy: 0, life: G.rand(0.12, 0.24), size: G.rand(1.2, 2), color: STAR, len: 0.075 });
        }
        if (P.onGround) G.fx.dust(P.x - P.dashDir * 10, P.y, 1, { dir: -P.dashDir, speed: [30, 110], size: [4, 8], a: 0.3 });
      }
      if (G.boon('comet') || G.boon('voidstep') || G.relics.dashCut()) cometStep();
      if (P.dashT <= 0) {
        P.vx = P.dashDir * P.run * (mx === P.dashDir ? 1 : 0.6); P.dashCd = P.dashFree ? 0 : P.dashCdMax * G.relics.dashEndK(); P.dashFree = false; P.sinceDash = 0;
        if (P.onGround) G.fx.dust(P.x + P.dashDir * 10, P.y, 3, { dir: P.dashDir, speed: [50, 190], size: [5, 9], up: 26 });
      }
    } else if (P.stun > 0) {
      P.stun -= dt;
      P.vx *= Math.exp(-2.5 * dt);
    } else {
      // firing the bow slows her, so shooting and dodging cannot both be done at full speed
      // (and holding the stance slows Eos to a walk)
      const target = mx * P.run * (P.atk && P.atk.kind === 'shot' ? C.BOW_SLOW : P.atk && P.atk.hold > 0 && !P.atk.swung ? 0.3 : P.hold && P.focus > 0.12 ? C.STANCE_SLOW : 1);
      // (on a frozen floor, G.slick, everyone does: far less grip to start, stop or turn with; platforms stay dry)
      const grip = P.onGround && !P.plat ? 1 - 0.8 * G.slick : 1;
      const acc = (P.onGround ? C.ACC_G : C.ACC_A) * (H.accel || 1) * grip * dt; // the heavy hero takes longer to start and stop
      if (grip < 1 && Math.abs(P.vx) > 150 && Math.random() < dt * 26) G.fx.spawn({ kind: 'spark', x: P.x - G.sign(P.vx) * 8, y: P.y - 2, vx: -P.vx * 0.3 + G.rand(-30, 30), vy: -G.rand(20, 110), life: G.rand(0.15, 0.3), size: G.rand(1.2, 2.2), color: '225,245,255' });
      if (P.onGround && mx && P.vx * mx < -140) {
        P.skidT -= dt;
        if (P.skidT <= 0) { P.skidT = 0.045; G.fx.dust(P.x + G.sign(P.vx) * 9, P.y, 1, { dir: G.sign(P.vx), speed: [40, 130], size: [4, 8], up: 20, a: 0.34 }); }
      }
      if (P.vx < target) P.vx = Math.min(target, P.vx + acc);
      else if (P.vx > target) P.vx = Math.max(target, P.vx - acc);
      if (mx && !P.atk) P.facing = mx;
    }

    // --- jump
    if (P.jumpBuf > 0 && free && P.dashT <= 0 && P.stun <= 0) {
      if (down && P.plat && P.onGround) {
        P.dropT = 0.24; P.onGround = false; P.plat = null; P.coyote = 0; P.jumpBuf = 0; P.y += 3;
      } else if (P.onGround || P.coyote > 0) {
        if (P.plat) G.arena.bob(P.plat, 26);
        P.vy = -C.JUMP; P.onGround = false; P.plat = null; P.coyote = 0; P.jumpBuf = 0; P.jumpHeld = true;
        P.squash = 0.22; P.healT = 0;
        G.audio.play('jump');
        G.fx.dust(P.x, P.y, 5, { speed: [20, 100], size: [4, 8], up: 60 });
      } else if (P.airJumps > 0) {
        P.airJumps--; P.vy = -C.JUMP2; P.jumpBuf = 0; P.jumpHeld = true; P.squash = 0.2;
        G.sets.airJump(); // (Skybreak, the Jump slot: sets.js)
        G.audio.play('jump2');
        G.fx.ring(P.x, P.y, { r0: 6, r1: 38, life: 0.25, color: STAR, width: 3 });
        G.fx.burst(P.x, P.y, { n: 6, color: STAR, speed: [40, 150], angle: Math.PI / 2, spread: 1.6, life: [0.2, 0.4], size: [2, 4] });
        G.fx.burst(P.x, P.y, { n: 5, color: STAR, speed: [120, 300], angle: Math.PI / 2, spread: 1.2, life: [0.12, 0.25], kind: 'spark', size: [1.5, 2.5] });
      }
    }
    if (P.jumpHeld && !I.down.jump) { P.jumpHeld = false; if (P.vy < 0) P.vy *= 0.45; }
    if (P.vy >= 0) P.jumpHeld = false;

    // --- gravity and collision
    if (P.plunge) {
      P.vy = 1750;
      if (Math.random() < 0.8) G.fx.spawn({ x: P.x + G.rand(-8, 8), y: P.y - 30, vx: G.rand(-30, 30), vy: -200, life: 0.3, size: 7, color: STAR });
    } else if (P.dashT <= 0 && P.drawT <= 0) {
      // a little hang at the top of a held jump, and a slightly quicker fall
      const hang = !P.onGround && Math.abs(P.vy) < 110 && ctl && I.down.jump ? 0.55 : 1;
      P.vy = Math.min(C.MAXFALL, P.vy + C.GRAV * hang * (P.vy > 0 ? 1.1 : 1) * dt);
      if (G.boon('glide') && !P.onGround && ctl && I.down.attack && P.vy > 130) P.vy = 130; // Moonglide: firing, she falls slowly
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
      // (an open hole in the floor has no floor: arena.js)
      const pit = G.arena.pits.length ? G.arena.inPit(P.x) : null;
      if (P.y >= FLOOR && !pit) {
        P.y = FLOOR;
        if (!P.onGround) landed = true;
        ground();
      } else {
        if (P.onGround) { P.onGround = false; }
        if (pit && P.y > FLOOR + 6) { P.x = G.clamp(P.x, pit.l + 7, pit.r - 7); if (P.y > FLOOR + 190) G.arena.fell(); }
        if (P.vy >= 0 && P.dropT <= 0) {
          for (const pl of G.arena.platforms) {
            if (pl.rise > 0.05 && P.x >= pl.x - 9 && P.x <= pl.x + pl.w + 9 && prevY <= pl.y + 4 && P.y >= pl.y) {
              P.y = pl.y; P.plat = pl; landed = true; ground(); break;
            }
          }
        }
      }
    }
    if (landed) G.sets.landed(fallSpeed); // (Cinderfall, Splashdown: the Jump slot, sets.js)
    if (P.plunge && P.onGround) {
      // Starfall lands
      P.plunge = false; P.squash = -0.3; P.iframes = Math.max(P.iframes, 0.12);
      P.cast = { kind: 'slam', t: 0.05, wind: 0, dur: 0.4, thrown: true };
      starfallBlast(1.2, 1);
    } else if (landed && fallSpeed > 260) {
      // the longer the fall, the deeper the crouch, the more dust, and past a point the ground answers
      const k = G.clamp((fallSpeed - 260) / 1000 + (H.heavy ? 0.4 : 0), 0, 1); // the heavy hero always lands hard
      P.squash = -0.2 - 0.14 * k;
      G.audio.play(k > 0.55 ? 'landHard' : 'land');
      G.fx.land(P.x, P.y, k);
      if (P.plat) G.arena.bob(P.plat, 30 + 50 * k);
    }
    if (P.onGround && Math.abs(P.vx) > 40) P.runT += dt * Math.abs(P.vx) * 0.055;
    // setting off from a standstill, the back foot throws dust
    if (ctl && P.onGround && P.dashT <= 0 && P.stun <= 0 && Math.abs(P.vx) < 70 && ((I.pressed.left && mx < 0) || (I.pressed.right && mx > 0))) {
      G.fx.dust(P.x - mx * 6, P.y, 3, { dir: -mx, speed: [50, 200], size: [4, 9], up: 30, a: 0.34 });
      G.fx.kick(mx * 1.2, 0);
    }
    // a long fall leaves the air it came through: thin streaks above the hero
    if (!P.onGround && P.vy > 780 && !P.plunge && P.dashT <= 0) {
      P.fallT -= dt;
      if (P.fallT <= 0) {
        P.fallT = 0.028;
        G.fx.spawn({ kind: 'spark', x: P.x + G.rand(-12, 12), y: P.y - G.rand(30, 64), vx: 0, vy: -P.vy * 0.45, life: G.rand(0.1, 0.2), size: G.rand(1, 1.8), color: STAR, len: 0.06 });
      }
    }
    // footfalls: a puff and a soft step each time a foot comes down
    const stepN = Math.floor(P.runT / Math.PI);
    if (stepN !== P.stepN) {
      P.stepN = stepN;
      if (P.onGround && P.dashT <= 0 && Math.abs(P.vx) > 150) {
        G.fx.step(P.x - P.facing * 5, P.y, -G.sign(P.vx));
        if (H.heavy) { G.fx.dust(P.x, P.y, 2, { speed: [20, 70], size: [5, 9], up: 20, a: 0.34 }); G.fx.kick(0, 0.7); G.audio.play('stepHeavy'); }
        else G.audio.play('step');
      }
    }

    // --- weapon
    const charging = P.atk && P.atk.canCharge && !P.atk.swung;
    if (H.draw) stance(dt, ctl, mx, up, down, free);
    else if (P.atkBuf > 0 && free && P.atkCd <= 0 && P.dashT <= 0 && P.stun <= 0 && P.healT === 0 && !charging) {
      P.atkBuf = 0; P.cast = null;
      if (P.wraps > 0 && G.state === 'fight') wrapsBlink(); // Sparring Wraps (Kairo's trophy)
      if (H.weapon === 'bow') startShot(mx, up, down);
      else startSwing(mx, up, down);
    }
    if (P.atk) {
      const a = P.atk;
      // Aster's smash: with the button still down when the wind-up ends, the blow is held back and charges
      if (a.canCharge && !a.swung && a.t + dt >= a.a0 && ctl && I.down.attack && a.hold < C.CHARGE_T) {
        a.t = a.a0 - 0.0001;
        // (v2.6a) while she holds it she turns to where it is aimed, so it never comes out behind her:
        // the cursor if the smash was clicked, or the way she walks
        const ax = I.mx + G.cam.x - P.x, want = I.aim.attack ? (Math.abs(ax) > 12 ? G.sign(ax) : 0) : mx;
        if (want && want !== a.dir) { a.dir = want; P.facing = want; }
        charge(a, dt);
      } else a.t += dt;
      if (!a.swung && a.t >= a.a0) { a.swung = true; if (a.kind === 'shot') loose(a); else swing(a); }
      if (a.kind === 'draw') sweepCut(a);
      else if (a.kind !== 'shot' && a.t >= a.a0 && a.t <= a.a1) checkHits(a);
      if (a.t >= a.dur) { P.atk = null; P.recov = recoverOf(a); if (a.kind === 'draw') drawn(a); }
    }
    // the way back to rest: only ever a picture, it never holds a button back
    if (P.recov) {
      const r = P.recov;
      r.t += dt;
      if (P.atk || P.dashT > 0 || P.stun > 0 || P.cast || P.healT > 0 || P.flT > 0) P.recov = null;
      else {
        if (!r.fx && r.t >= r.dur * r.at) { r.fx = true; recoverFx(r); }
        if (r.t >= r.dur) P.recov = null;
      }
    }

    // --- Dawnbreak: the ultimate, when its meter is full
    if (ctl && I.pressed.ult && free && P.stun <= 0 && G.flow.tryUlt()) return;
    // --- the crown: a set's own move, once three of its boons are held (sets.js)
    if (ctl && I.pressed.crown && free && P.stun <= 0 && P.dashT <= 0) G.sets.tryCrown();

    // --- special: costs one segment of Starlight
    if (P.flareBuf > 0 && free && P.dashT <= 0 && P.stun <= 0 && P.healT === 0) {
      P.flareBuf = 0;
      if (P.ember >= C.SEG) {
        P.ember -= C.SEG; P.stats.lances++; P.castN++; // (castN tells one special from the next: sets.js)
        const d = aim(mx, up, down, I.aim.flare);
        if (H.special === 'lance') castLance(d.x, d.y);
        else if (H.special === 'starfall') castStarfall();
        else if (H.special === 'arc') castArc(d.x, d.y);
        else if (H.special === 'guard') castGuard();
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
    const n = H.chain || 3;
    const idx = (P.comboT > 0 && P.combo >= 0) ? (P.combo + 1) % n : 0;
    P.combo = idx; P.comboT = idx === n - 1 ? 0 : 0.62 + (H.heavy ? 0.3 : 0);
    return idx;
  }
  const weaponMult = (heavy) => (1 + 0.25 * G.boon('keen')) * G.dmgMult() * (heavy ? G.relics.finisherK() : 1)
    * (heavy && G.boon('dayedge') ? 1.6 : 1) // Edge of Day (a pair)
    * (G.boon('bloodedge') ? 1.6 : 1); // Bloodied Edge (corrupted)
  const haste = () => (1 - 0.18 * G.boon('quick')) * (G.boon('feral') ? 0.74 : 1);
  const spec = () => G.relics.specK() * G.sets.specMult(); // the Magus's Prism strengthens every special (and Shadow Star)

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
    const heavy = idx === (H.chain || 3) - 1;
    const st = H.combo[heavy ? 2 : idx === 1 ? 1 : 0];
    // the maul: its first swing is a wide sweep in front of her; its smash can be held and charged
    const sweep = !!H.heavy && !heavy && kind === 'side', canCharge = !!H.heavy && heavy && kind !== 'down';
    // a slash thrown straight out of a dash becomes a thrust: more damage, more reach
    const thrust = kind === 'side' && P.sinceDash < 0.2;
    const base = kind === 'down' ? H.down : st.dmg;
    P.atk = {
      kind, idx, heavy, thrust, t: 0, dur: st.dur, a0: st.wind, a1: st.wind + st.act,
      hit: new Set(), dir: P.facing, swung: false, quake: false, sweep, canCharge, hold: 0, charge: 0,
      dmg: Math.round(base * (thrust ? 1.4 : 1) * weaponMult(heavy)),
    };
    P.atkCd = st.cd * haste();
    // the arc of light for the swing; a smash that may be held shows its arc when it is let go (see swing)
    if (!canCharge) slashArc(P.atk, -st.wind);
    if (heavy) G.fx.burst(P.x - P.facing * 8, P.y - 34, { n: 5, color: GOLD, speed: [30, 140], life: [0.15, 0.35], kind: 'spark', size: [2, 3] });
  }

  function slashArc(a, t0) {
    P.slashes.push({
      kind: a.kind, dir: a.dir, heavy: a.heavy, thrust: a.thrust, idx: a.idx, t: t0, dur: a.heavy ? 0.3 + 0.1 * a.charge : 0.19,
      reach: (1 + 0.25 * G.boon('reach')) * H.reach * (1 + 0.25 * a.charge), thick: H.thick * (1 + 0.5 * a.charge),
    });
  }

  // Aster holds her smash back: light gathers on the maul, she sinks into her stance, and at full it rings.
  function charge(a, dt) {
    const was = a.charge;
    a.hold += dt;
    a.charge = G.clamp((a.hold - 0.08) / (C.CHARGE_T - 0.08), 0, 1);
    if (a.hold - dt <= 0) G.audio.play('heave', { dur: C.CHARGE_T }); // (not the bosses' 'charge' tell)
    P.squash = Math.min(P.squash, -0.08 - 0.12 * a.charge);
    P.atkCd = Math.max(P.atkCd, 0.4);
    const hx = P.x - a.dir * 14, hy = P.y - 78;
    if (Math.random() < dt * (18 + 40 * a.charge)) {
      const ang = G.rand(0, G.TAU), r = G.rand(46, 90);
      G.fx.spawn({ x: hx + Math.cos(ang) * r, y: hy + Math.sin(ang) * r, vx: -Math.cos(ang) * r * 3, vy: -Math.sin(ang) * r * 3, life: 0.3, size: G.rand(2, 4), color: a.charge >= 1 ? GOLD : STAR });
    }
    if (P.onGround && Math.random() < dt * 10 * a.charge) G.fx.dust(P.x + G.rand(-20, 20), P.y, 1, { speed: [10, 50], size: [4, 8], up: 40, a: 0.3 });
    if (a.charge >= 1 && was < 1) {
      G.audio.play('segment'); G.fx.shake(3);
      G.fx.ring(hx, hy, { r0: 70, r1: 12, life: 0.25, color: GOLD, width: 5 });
      G.fx.light(hx, hy, 200, GOLD, 0.25, 0.7);
    }
  }

  // The moment the swing comes out: its sound, a step into the blow, and what finishers add.
  // Which way a swing is travelling when it lands (for sparks and the camera).
  const swingAng = (a) => (a.kind === 'up' ? -Math.PI / 2 : a.kind === 'down' ? Math.PI / 2 : a.dir > 0 ? 0 : Math.PI);

  // The Offered Hilt (the Champion's trophy): for six seconds after a stagger, every blow also throws
  // an echo of another hero's weapon, in that hero's light, each in turn (the maul's runs along the floor)
  function hiltEcho(dir, dmg) {
    if (!(P.hiltT > 0)) return;
    const others = G.HEROES.filter((h) => h.id !== H.id);
    P.hiltN = (P.hiltN || 0) + 1;
    const o = others[P.hiltN % others.length], low = o.weapon === 'maul';
    G.shots.push({ wave: true, echo: true, col: o.col, hot: o.hot, x: P.x + dir * 50, y: low ? FLOOR - 30 : P.y - 34, vx: dir * 860, vy: 0, t: 0, life: 0.45, hit: new Set(), dmg: Math.max(6, Math.round(dmg * 0.45)) });
  }

  function swing(a) {
    hiltEcho(a.dir, a.dmg);
    if (a.canCharge) {
      // a charged smash hits up to half again as hard and reaches further
      if (a.charge > 0) a.dmg = Math.round(a.dmg * (1 + C.CHARGE_DMG * a.charge));
      slashArc(a, 0);
      P.atkCd = Math.max(P.atkCd, (H.combo[2].cd - H.combo[2].wind) * haste());
    }
    G.audio.play(a.heavy || H.weapon === 'maul' ? 'slash3' : 'slash');
    // flecks of light thrown off the blade, and a lean into the blow
    const ang = swingAng(a), reach = H.reach * (a.heavy ? 1.2 : 1);
    G.fx.burst(P.x + Math.cos(ang) * 44 * reach, P.y - 30 + Math.sin(ang) * 44 * reach, {
      n: a.heavy ? 8 : 3, color: a.heavy ? GOLD : STAR, kind: 'spark', angle: ang, spread: 1.4,
      speed: [180, a.heavy ? 620 : 420], life: [0.1, 0.24], size: [1.4, a.heavy ? 2.8 : 2], jitter: 22 * reach,
    });
    G.fx.kick(Math.cos(ang) * (a.heavy ? 2.6 : 0.8) * H.thick, Math.sin(ang) * (a.heavy ? 2.6 : 0.8) * H.thick);
    if (P.onGround && a.kind === 'side' && (a.heavy || a.thrust)) G.fx.dust(P.x - a.dir * 8, P.y, 3, { dir: -a.dir, speed: [40, 160], size: [5, 9] });
    if (a.kind === 'side' && P.stun <= 0) {
      if (a.thrust) P.vx = a.dir * Math.max(Math.abs(P.vx), 560);
      else if (P.onGround && (!a.flick || a.heavy)) P.vx += a.dir * (a.heavy ? (a.flick ? 260 : 330) : 100);
      else if (a.heavy) P.vx += a.dir * 150;
    }
    if (a.heavy && a.kind === 'up' && !P.onGround) P.vy = Math.min(P.vy, -240);
    if (a.heavy && H.weapon === 'maul' && P.onGround && a.kind === 'side') {
      // the maul's finisher shakes the ground in front of it
      a.quake = true;
      const ck = a.charge || 0;
      G.fx.shake(7 + 9 * ck); G.audio.play('boom'); if (ck > 0.5) { G.audio.play('slam'); G.fx.punch(0.02 * ck); }
      G.fx.ring(P.x + a.dir * 90, FLOOR - 4, { r0: 20, r1: 150 + 110 * ck, life: 0.35, color: ck >= 1 ? GOLD : STAR, width: 6 + 4 * ck });
      G.fx.thud(P.x + a.dir * 90, FLOOR, 1.15 + 0.8 * ck, { col: STAR });
      // fully charged: the blow runs on along the floor as a wave of light
      if (ck >= 1) {
        G.shots.push({ wave: true, x: P.x + a.dir * 120, y: FLOOR - 30, vx: a.dir * 980, vy: 0, t: 0, life: 0.5, hit: new Set(), dmg: Math.round(18 * G.dmgMult()) }); // (v2.4c: 20)
        G.fx.thud(P.x + a.dir * 200, FLOOR, 1.2, { col: GOLD });
        if (G.boon('fault')) fault(P.x + a.dir * 110, a.dir);
      }
      G.fx.burst(P.x + a.dir * 90, FLOOR - 4, { n: 8, color: STAR, speed: [150, 520], angle: -Math.PI / 2, spread: 2.2, life: [0.2, 0.5], kind: 'spark', size: [2, 3.5], grav: 900 });
      G.fx.burst(P.x + a.dir * 90, FLOOR - 4, { n: 6, color: '22,18,32', speed: [150, 460], angle: -Math.PI / 2, spread: 2, life: [0.5, 1], size: [5, 9], kind: 'chunk', grav: 1500 });
    }
    if (a.heavy && G.boon('crescent')) {
      const upw = a.kind === 'up';
      wave(P.x + (upw ? 0 : a.dir * 34), P.y - (upw ? 70 : 26), upw ? 0 : a.dir, upw ? -1 : 0);
    }
  }

  // Crescent boon: a wave of light along a direction.
  function wave(x, y, dx, dy) {
    const k = G.boon('tidecut') ? 2 : 1; // Tidecutter (a pair)
    G.shots.push({ wave: true, x, y, vx: dx * 980, vy: dy * 980, t: 0, life: 0.42 * k, hit: new Set(), dmg: Math.round(16 * k * G.dmgMult()) });
  }

  function atkBox(a) {
    const r = (1 + 0.3 * G.boon('reach')) * H.reach; // reach stretches each box away from the hero
    // (v2.1b: as wide as the crescents drawn for them, from 42/54 and 36)
    const rs = (1 + 0.25 * G.boon('reach')) * H.reach * (1 + 0.25 * (a.charge || 0)); // the drawn crescent's scale
    if (a.kind === 'up') {
      const hh = (a.heavy ? 57 : 46) * r;
      return { cx: P.x + a.dir * 6, cy: P.y - 34 - hh, hw: (a.heavy ? 82 : 62) * rs * 0.82, hh };
    }
    if (a.kind === 'down') return { cx: P.x, cy: P.y - 28 + 42 * r, hw: 58 * rs * 0.8, hh: 42 * r };
    // the maul's sweep: wide and tall, but only on the side the maul is swung to
    if (a.sweep) { const hw = (a.thrust ? 64 : 54) * r; return { cx: P.x + a.dir * (hw - 6), cy: P.y - 30, hw, hh: 42 }; }
    // side: the finisher is bigger, a thrust is longer and narrower
    const hw = ((a.heavy ? 66 : 48) + (a.thrust ? 22 : 0)) * r;
    return { cx: P.x + a.dir * (hw - (a.heavy ? 4 : 0)), cy: P.y - 26, hw, hh: a.thrust ? 32 : a.heavy ? 48 : 36 };
  }
  P.atkBox = atkBox;
  // A cut along the side is drawn as a crescent that rises well over the box in front of the hero and
  // falls well under it (see drawSlashes): what the blade is drawn passing through there is struck too.
  // (v2.1b: the box alone left a foe overhead untouched by a blade drawn right through it.)
  function atkBoxes(a) {
    const main = atkBox(a);
    if (a.kind !== 'side' || a.thrust) return [main];
    const R = (a.heavy ? 102 : 70) * (1 + 0.25 * G.boon('reach')) * H.reach * (1 + 0.25 * (a.charge || 0));
    const x0 = 6 + R * (a.heavy ? -0.2 : 0.25), x1 = 6 + R * 0.95, ext = R * (a.heavy ? 0.95 : 0.9);
    const hw = (x1 - x0) / 2, cx = P.x + a.dir * (x0 + hw);
    const top = P.y - 35 - ext, bot = P.y - 35 + ext, mTop = main.cy - main.hh, mBot = main.cy + main.hh;
    const out = [main];
    if (top < mTop) out.push({ cx, cy: (top + mTop) / 2, hw, hh: (mTop - top) / 2 });
    if (bot > mBot) out.push({ cx, cy: (bot + mBot) / 2, hw, hh: (bot - mBot) / 2 });
    return out;
  }
  P.atkBoxes = atkBoxes;

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
    if (!G.relic('storm') || P.hitCount % G.relics.stormEvery() !== 0) return;
    if (G.boss.damage(Math.round(G.relics.stormDmg() * G.dmgMult()), t, { x, y, heavy: true, poise: G.relics.stormPoise() })) {
      const pts = [];
      for (let i = 0; i <= 7; i++) pts.push([x + (i === 7 ? 0 : G.rand(-26, 26)), -20 + (y + 20) * i / 7]);
      P.bolts.push({ pts, life: 0.22 });
      G.audio.play('flareHit');
      G.fx.shake(6);
      G.fx.burst(x, y, { n: 14, color: '255,250,200', speed: [120, 560], life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
    }
  }

  // A clash: a heavy blow of the hero's (a finisher, a thrust, anything from the maul) meets a boss's
  // swing as it comes out. The swing is turned aside, both are thrown back a step and the boss's
  // stagger bar fills a little. Blows that burn red (two health) cannot be met this way.
  function clash(a) {
    if (a.clashed || !(a.heavy || a.thrust || H.heavy) || a.kind === 'down') return;
    const hb = atkBox(a);
    for (const h of G.hazards.list) {
      if (h.kind !== 'arc' || h.dead || !h.owner || h.heavy || h.mark) continue;
      if (h.t < h.tele - 0.1 || h.t > h.tele + h.active) continue;
      if (!G.circleRect(h.x, h.y, h.r * 0.8, hb)) continue;
      a.clashed = true; h.dead = true;
      const o = h.owner, B = G.boss, dir = G.sign(P.x - o.x) || -a.dir;
      const cx = (P.x + o.x) / 2, cy = Math.min(P.y, o.y) - 44;
      if (o.kx != null) o.kx = G.clamp(o.kx - dir * 16, -18, 18);
      if (B.kit && !B.staggered && o === B.body) B.poise = Math.min(B.poiseMax - 1, B.poise + 46 * H.poise);
      if (B.kit && B.onClash && o === B.body) B.onClash(); // (the Champion feels a clash more: champion.js)
      P.vx = dir * 330; P.iframes = Math.max(P.iframes, 0.16); P.pdDone = true;
      P.gain(C.GAIN_HIT); G.flow.add(8);
      G.audio.play('clash');
      G.fx.stop(0.13); G.fx.shake(11); G.fx.punch(0.03); G.fx.impact(cx, cy, 0.06);
      G.fx.glint(cx, cy, 70, GOLD, 0.3);
      G.fx.ring(cx, cy, { r0: 10, r1: 150, life: 0.3, color: HOT, width: 6 });
      G.fx.lines(cx, cy, 16, HOT, { r0: 20, speed: [600, 1300] });
      G.fx.burst(cx, cy, { n: 22, color: GOLD, speed: [200, 900], life: [0.15, 0.5], kind: 'spark', size: [2, 4.5], grav: 500 });
      G.fx.light(cx, cy, 240, HOT, 0.2, 0.7);
      if (P.onGround) G.fx.dust(P.x, P.y, 4, { dir, speed: [80, 260], size: [5, 10] });
      G.feats.bump('clash');
      return;
    }
  }

  function checkHits(a) {
    clash(a);
    const boxes = atkBoxes(a);
    if (a.quake) boxes.push({ cx: P.x + a.dir * (100 + 20 * (a.charge || 0)), cy: FLOOR - 26, hw: 130 + 55 * (a.charge || 0), hh: 30 });
    let bounced = false;
    for (const hb of boxes) {
      for (const t of G.boss.targets()) {
        if (a.hit.has(t.id) || !touch(hb, t)) continue;
        a.hit.add(t.id);
        const c = contact(hb, t);
        // a riposte or a sunder makes this blow worth more (see moments.js)
        const em = G.moments.strike(a.heavy);
        const res = G.boss.damage(Math.round(a.dmg * em.mult), t, { x: c.x, y: c.y, heavy: a.heavy || a.thrust, finisher: a.heavy || em.mult > 1, dir: a.dir, poise: H.poise });
        if (res) {
          P.gain(a.heavy ? C.GAIN_HEAVY : C.GAIN_HIT);
          G.sets.hit(a.heavy ? 'finisher' : 'light', t, c.x, c.y);
          if (a.flick && !a.banked) { a.banked = true; P.strung = Math.min(3, (P.strung || 0) + 1); } // Eos: a cut that lands is a mark on the sheath
          if (a.heavy && !a.thrust && (G.boon('pinlance') || G.boon('stars'))) finisherLanded(t, c);
          // the freeze, the shake and the kick all scale with the blow; the maul's are heavier
          G.fx.stop((a.heavy ? 0.11 : a.thrust ? 0.06 : 0.032 * H.thick) + 0.07 * (a.charge || 0) + (a.sweep ? 0.02 : 0));
          G.fx.shake((a.heavy ? 9 : a.thrust ? 4.5 : 1.8 * H.thick) + 7 * (a.charge || 0) + (a.sweep ? 2 : 0));
          G.fx.hit(c.x, c.y, swingAng(a), { heavy: a.heavy, thrust: a.thrust, power: 0.8 + 0.2 * H.thick, col: a.heavy ? GOLD : STAR, hot: HOT });
          if (a.heavy) {
            // the finisher lands with a gold burst so it reads as the big hit
            G.fx.punch(0.016);
            if ((a.charge || 0) >= 1 || em.mult > 1) G.fx.impact(c.x, c.y, 0.06);
            G.fx.ring(c.x, c.y, { r0: 8, r1: 92, life: 0.28, color: GOLD, width: 6 });
            G.fx.burst(c.x, c.y, { n: 8, color: GOLD, speed: [160, 620], life: [0.15, 0.45], kind: 'spark', size: [2.5, 4.5] });
          }
          G.audio.play(a.heavy ? 'hitHeavy' : 'hit', { pitch: hitPitch() });
          P.squash = Math.min(P.squash, a.heavy ? -0.1 : -0.05); // pressed into the blow for the length of the freeze
          struck(t, c.x, c.y);
          G.moments.landed(em, c.x, c.y, swingAng(a), a.heavy || a.thrust);
        } else {
          G.audio.play('tink');
          G.fx.tink(c.x, c.y, swingAng(a));
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
      const dmg = Math.round((24 * G.boon('comet') * (G.boon('shooting') ? 2 : 1) + 40 * G.boon('voidstep') + G.relics.dashCut()) * G.dmgMult());
      if (G.boss.damage(dmg, t, { x: P.x, y: P.y - 22, heavy: true, dir: P.dashDir })) {
        P.gain(C.GAIN_HIT);
        if (G.boon('shooting')) { P.dashFree = true; P.airDashes = P.maxDash; } // Shooting Star (a pair): no wait after this dash
        G.audio.play('hit');
        G.fx.stop(0.04);
        G.fx.hit(P.x, P.y - 22, P.dashDir > 0 ? 0 : Math.PI, { thrust: true, col: STAR, hot: HOT });
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

  // spent: an arrow of the Moon Volley. It was paid for with Starlight, so it earns none back (v1.7b:
  // with Bright Vein and Full Quiver a point-blank volley used to return 86 of the 100 it cost).
  function arrow(dx, dy, dmg, heavy, life, spent) {
    G.shots.push({
      arrow: true, heavy, spent: !!spent, x: P.x + dx * 20, y: P.y - 38 + dy * 20, ox: P.x, oy: P.y - 38,
      vx: dx * C.ARROW_SPEED, vy: dy * C.ARROW_SPEED, t: 0, hit: new Set(), dmg,
      life: (life || C.ARROW_LIFE) * (1 + 0.3 * G.boon('reach')),
    });
  }

  function loose(a) {
    arrow(a.dx, a.dy, a.dmg, a.heavy);
    hiltEcho(G.sign(a.dx) || P.facing, a.dmg);
    G.audio.play(a.heavy ? 'arrowHeavy' : 'arrow');
    // firing downward in the air lifts her
    // (each shot before she next lands lifts less than the last, so she cannot hang in the sky)
    if (a.dy > 0.5 && !P.onGround) {
      const f = Math.max(0, 1 - 0.3 * P.lifts);
      P.vy = Math.min(P.vy, G.lerp(P.vy, -370, f)); P.squash = 0.15 * f; P.lifts++;
    }
    G.fx.burst(P.x + a.dx * 24, P.y - 38 + a.dy * 24, { n: a.heavy ? 6 : 3, color: a.heavy ? GOLD : STAR, kind: 'spark', angle: Math.atan2(a.dy, a.dx), spread: 0.9, speed: [140, 460], life: [0.08, 0.2], size: [1.3, 2.2] });
    if (a.heavy) {
      P.vx -= a.dx * 120;
      G.fx.kick(-a.dx * 3, -a.dy * 3);
      G.fx.ring(P.x + a.dx * 22, P.y - 38 + a.dy * 22, { r0: 4, r1: 34, life: 0.2, color: GOLD, width: 4 });
      if (G.boon('crescent')) wave(P.x + a.dx * 30, P.y - 38 + a.dy * 30, a.dx, a.dy);
    }
  }

  // ---------------------------------------------------------------- specials
  // Fire one Star Lance (or three with Split Lance) along a unit direction.
  function fireLance(dx, dy) {
    const split = G.boon('split');
    const angles = split ? [-0.2, 0, 0.2] : [0];
    const dmg = Math.round(C.LANCE_DMG * (split ? 0.6 : 1) * G.dmgMult() * spec());
    for (const a of angles) {
      const c = Math.cos(a), s = Math.sin(a);
      const vx = dx * c - dy * s, vy = dx * s + dy * c;
      G.shots.push({ lance: true, x: P.x + vx * 18, y: P.y - 36 + vy * 18, vx: vx * C.LANCE_SPEED, vy: vy * C.LANCE_SPEED, t: 0, hit: new Set(), dmg });
    }
  }

  function muzzle(dx, dy) {
    G.fx.shake(6);
    G.fx.kick(-dx * 7, -dy * 7);
    G.fx.light(P.x + dx * 20, P.y - 36 + dy * 20, 190, STAR, 0.2, 0.6);
    G.fx.lines(P.x + dx * 20, P.y - 36 + dy * 20, 8, HOT, { r0: 16, speed: [500, 900] });
    if (P.onGround) G.fx.dust(P.x - dx * 8, P.y, 4, { dir: -G.sign(dx) || -P.facing, speed: [50, 200], size: [5, 10] });
    G.fx.flash(STAR, 0.12, 0.2);
    G.fx.ring(P.x + dx * 20, P.y - 36 + dy * 20, { r0: 6, r1: 60, life: 0.25, color: HOT, width: 5 });
    G.fx.burst(P.x + dx * 20, P.y - 36 + dy * 20, { n: 14, color: STAR, speed: [100, 500], angle: Math.atan2(dy, dx), spread: 1.1, life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
  }

  // Vesper: a piercing lance. She draws her free arm back with it, then hurls it (throwLance).
  function castLance(dx, dy) {
    P.cast = { kind: 'lance', t: 0, wind: C.LANCE_WIND, dur: C.LANCE_WIND + 0.32, dx, dy, thrown: false };
    G.audio.play('whoosh');
    const hx = P.x - P.facing * 14, hy = P.y - 60;
    G.fx.light(hx, hy, 90, STAR, 0.12, 0.45);
    for (let i = 0; i < 7; i++) {
      const a = G.rand(0, G.TAU), r = G.rand(22, 40);
      G.fx.spawn({ x: hx + Math.cos(a) * r, y: hy + Math.sin(a) * r, vx: -Math.cos(a) * r * 9, vy: -Math.sin(a) * r * 9, life: 0.1, size: 2.5, color: HOT });
    }
  }
  function throwLance(c) {
    const { dx, dy } = c, n = G.shots.length;
    fireLance(dx, dy);
    // the lance is drawn leaving her hand and settles onto its true line within a tenth of a second
    const hx = P.x + P.facing * 1.3 * (1 + Math.abs(dx) * 15), hy = P.y - 1.3 * (39 - dy * 15);
    for (let i = n; i < G.shots.length; i++) { const s = G.shots[i]; s.vox = hx - s.x; s.voy = hy - s.y; s.cast = P.castN; }
    P.vx -= dx * 240;
    if (dy > 0) P.vy = Math.min(P.vy, -420);
    G.audio.play('flare');
    muzzle(dx, dy);
  }

  // Lune: a fan of arrows, and a leap away from where she aimed.
  function castVolley(dx, dy) {
    const n = G.boon('quiver') ? 8 : 5, spread = G.boon('quiver') ? 0.95 : 0.72;
    const dmg = Math.round(C.VOLLEY_DMG * G.dmgMult() * spec());
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - 0.5) * spread, c = Math.cos(a), s = Math.sin(a);
      arrow(dx * c - dy * s, dx * s + dy * c, dmg, false, 0.46, true);
      G.shots[G.shots.length - 1].cast = P.castN;
    }
    P.vx = -dx * 420;
    if (dy > -0.5) { P.vy = Math.min(P.vy, -330); P.onGround = false; P.plat = null; }
    P.atk = null;
    P.cast = { kind: 'volley', t: 0, wind: 0, dur: 0.34, dx, dy, thrown: true };
    G.audio.play('flare');
    muzzle(dx, dy);
  }

  // Aster: on the ground the blast is immediate; in the air she plunges first.
  function castStarfall() {
    P.atk = null;
    if (P.onGround) { P.cast = { kind: 'slam', t: 0, wind: 0, dur: 0.36, thrown: true }; starfallBlast(1, 1); return; }
    P.plunge = true; P.pdDone = false; P.dashT = 0;
    G.audio.play('dash');
    G.fx.ring(P.x, P.y - 22, { r0: 50, r1: 14, life: 0.2, color: HOT, width: 4 });
  }

  // The blast around Aster's feet. scale grows the radius and damage; k is the damage share (Aftershock uses 0.5).
  function starfallBlast(scale, k) {
    const R = C.STARFALL_R * scale, cx = P.x, cy = P.y - 20;
    const dmg = Math.round(C.STARFALL_DMG * scale * k * G.dmgMult() * spec());
    for (const t of G.boss.targets()) {
      const inside = t.r ? G.dist(cx, cy, t.cx, t.cy) < R + t.r : G.circleRect(cx, cy, R, t);
      if (!inside) continue;
      const hx = t.r ? t.cx : G.clamp(cx, t.cx - t.hw, t.cx + t.hw), hy = t.r ? t.cy + t.r * 0.6 : G.clamp(cy, t.cy - t.hh, t.cy + t.hh);
      if (G.boss.damage(dmg, t, { x: hx, y: hy, heavy: true, finisher: k >= 1, lance: k >= 1, poise: H.poise, dir: G.sign(t.cx - cx) }) && k >= 1) G.sets.hit('special', t, hx, hy, P.castN);
    }
    for (const o of G.hazards.slashables()) if (G.dist(o.x, o.y, cx, cy) < R + o.r) o.slash();
    G.audio.play('slam');
    G.fx.stop(0.08 * k); G.fx.shake(15 * k); G.fx.punch(0.02 * k); G.fx.flash(STAR, 0.16 * k, 0.25);
    G.fx.ring(cx, FLOOR - 4 < P.y ? P.y - 4 : P.y - 4, { r0: 20, r1: R, life: 0.4, color: HOT, width: 10 });
    G.fx.ring(cx, P.y - 4, { r0: 10, r1: R * 0.7, life: 0.3, color: STAR, width: 6 });
    G.fx.burst(cx, P.y - 6, { n: 26, color: STAR, speed: [150, 640], angle: -Math.PI / 2, spread: 3, life: [0.25, 0.7], kind: 'spark', size: [2, 5], grav: 700 });
    G.fx.thud(cx, P.y, 1.7 * k * Math.min(1.3, scale), { col: STAR });
    G.fx.light(cx, P.y - 20, R * 2, STAR, 0.3, 0.7 * k);
    G.fx.lines(cx, P.y - 20, 14, HOT, { r0: 40 });
    G.fx.burst(cx, P.y - 6, { n: 12, color: STAR, speed: [20, 140], life: [0.8, 1.6], size: [1.5, 3], grav: -50, wob: 90, drag: 1.5, jitter: R * 0.4 });
    G.fx.burst(cx, P.y - 6, { n: 8, color: '22,18,32', speed: [150, 520], angle: -Math.PI / 2, spread: 2.2, life: [0.6, 1.1], size: [5, 10], kind: 'chunk', grav: 1500 });
    if (k >= 1 && G.boon('aftershock')) { P.afterT = 0.3; P.afterScale = scale; }
  }


  // ---------------------------------------------------------------- the sheathed blade (Eos)
  // Her blade lives in its sheath. A press is a flick: out, across and home. Keep the button down
  // and she sets her feet behind it: Focus gathers while she is on the ground (a dash or a jump
  // keeps what she has, a hit loses it), one mark on the sheath at a time, up to three. Letting go
  // is the draw: she is carried along the line she aimed down, through whatever stands on it and
  // through anything coming at her, and the cut itself lands a moment later, when the blade is home.
  function focusMark(f) { f = f == null ? P.focus : f; return f >= C.FOCUS[2] ? 3 : f >= C.FOCUS[1] ? 2 : f >= C.FOCUS[0] ? 1 : 0; }
  P.focusMark = focusMark;
  const mouthX = () => P.x + P.facing * 9, mouthY = () => P.y - 31; // where the mouth of the sheath is, for light

  function stance(dt, ctl, mx, up, down, free) {
    const I = G.input;
    if (P.onGround || P.airStance == null) P.airStance = C.AIR_STANCE; // (each jump gets its own time in the air stance)
    if (!ctl || P.stun > 0) { P.hold = null; P.focus = 0; P.edge = 0; return; }
    const can = free && P.healT === 0 && P.flT === 0;
    // a turned blow keeps all three marks lit for a while, button or no button
    if (P.edge > 0) { P.edge -= dt; if (P.edge > 0) P.focus = C.FOCUS[2]; else if (!P.hold) P.focus = 0; }
    if (!P.hold) {
      if (P.edge > 0 && P.atkBuf > 0 && can && P.dashT <= 0) {
        // ...and the next press is the full draw, at once
        P.atkBuf = 0; P.cast = null; P.focus = 0;
        drawCut(3, mx, up, down);
        return;
      }
      if (P.atkBuf > 0 && can && P.atkCd <= 0 && P.dashT <= 0) {
        // a press: the flick comes out at once, and the stance begins behind it
        P.atkBuf = 0; P.cast = null;
        flick(mx, up, down);
        P.hold = { t: 0 }; P.focus = 0;
      } else if (I.down.attack && can && P.atkCd <= 0 && P.atkBuf <= 0 && !P.atk) {
        P.hold = { t: 0 }; P.focus = 0; // still held from before (through a hit, say): straight back into the stance
      }
      if (!P.hold) return;
    }
    const h = P.hold;
    h.t += dt;
    if (I.down.attack && !h.go) {
      if (P.dashT <= 0 && can) {
        const bank = Math.max(P.strung || 0, P.sun > 0 ? 2 : 0);
        if (bank > 0 && h.t >= C.BANK_HOLD && P.focus < C.FOCUS[bank - 1]) {
          // every cut of the string that landed is a mark already: hit, hit and hold starts at two
          const was = focusMark();
          P.focus = C.FOCUS[bank - 1];
          markUp(was);
          P.sun = 0; // (a Second Sun is spent on the hold it lights)
        }
        if (P.onGround) gather(dt);
        else if (P.airStance > 0) {
          // in the air she sets herself all the same, and drifts down while the light gathers, so a
          // foe up high can be drawn on from under it
          P.airStance -= dt;
          gather(dt * C.AIR_GATHER);
          if (P.vy > C.AIR_FALL) P.vy = Math.max(C.AIR_FALL, P.vy - 2600 * dt * 2); // (caught quickly, not in one frame)
        }
      }
      return;
    }
    // let go (mid-throw it waits for the throw)
    h.go = true;
    if (!can) return;
    const lvl = focusMark();
    P.hold = null; P.focus = 0;
    if (lvl > 0) drawCut(lvl, mx, up, down);
  }

  function gather(dt) {
    const was = focusMark();
    P.focus = Math.min(C.FOCUS[2], P.focus + dt / haste());
    if (P.focus < 0.12) return; // a tap is not a stance
    const m = focusMark(), hx = mouthX(), hy = mouthY();
    // light runs to the mouth of the sheath
    if (Math.random() < dt * (14 + 16 * m)) {
      const ang = G.rand(0, G.TAU), r = G.rand(40, 84);
      G.fx.spawn({ x: hx + Math.cos(ang) * r, y: hy + Math.sin(ang) * r, vx: -Math.cos(ang) * r * 3.2, vy: -Math.sin(ang) * r * 3.2, life: 0.3, size: G.rand(1.6, 3.2), color: m >= 3 ? GOLD : m ? HOT : STAR });
    }
    if (m >= 3 && Math.random() < dt * 12) G.fx.dust(P.x + G.rand(-26, 26), P.y, 1, { speed: [10, 40], size: [3, 7], up: 50, a: 0.26 });
    markUp(was);
  }

  // a new mark lit on the sheath: its sound, and light at the mouth (the third in gold, and the ground shakes)
  function markUp(was) {
    const m = focusMark(), hx = mouthX(), hy = mouthY();
    if (m > was) {
      G.audio.play('focus', { n: m });
      G.fx.glint(hx, hy, 18 + 9 * m, m >= 3 ? GOLD : HOT, 0.26);
      G.fx.ring(hx, hy, { r0: 30 + 16 * m, r1: 6, life: 0.22, color: m >= 3 ? GOLD : STAR, width: 2 + m });
      if (m >= 3) {
        G.fx.shake(2.5); G.fx.light(hx, hy, 190, GOLD, 0.3, 0.6); G.fx.vig(STAR, 0.16, 0.6);
        G.fx.dust(P.x, P.y, 6, { speed: [60, 200], size: [5, 9], up: 24 });
      }
    }
  }

  // The string (v2.1b): a press is a cut from the sheath, rising; the next, if it comes in time, falls
  // back across along the weight of the first; the third is a wide cut that steps in with it, the
  // finisher. The blade goes home after each, so holding the button after any of them is the stance.
  function flick(mx, up, down) {
    const I = G.input;
    let kind = up ? 'up' : (down && !P.onGround ? 'down' : 'side');
    if (mx) P.facing = mx;
    if (I.aim.attack) {
      const ax = I.mx + G.cam.x - P.x, ay = I.my + G.cam.y - (P.y - 32);
      const steep = Math.abs(ay) > Math.abs(ax) * 1.15;
      kind = steep && ay < 0 ? 'up' : (steep && ay > 0 && !P.onGround ? 'down' : 'side');
      if (Math.abs(ax) > 6) P.facing = ax > 0 ? 1 : -1;
    }
    const idx = nextStep(kind !== 'down'), heavy = idx === 2;
    if (idx === 0) P.strung = 0; // a new string: nothing landed yet
    const st = H.combo[Math.max(0, idx)];
    P.atk = {
      kind, idx, heavy, thrust: false, flick: true, t: 0, dur: st.dur, a0: st.wind, a1: st.wind + st.act,
      hit: new Set(), dir: P.facing, swung: false, quake: false, sweep: false, canCharge: false, hold: 0, charge: 0,
      dmg: Math.round((kind === 'down' ? H.down : st.dmg) * weaponMult(heavy)),
    };
    if (heavy) G.fx.burst(P.x - P.facing * 8, P.y - 34, { n: 5, color: GOLD, speed: [30, 140], life: [0.15, 0.35], kind: 'spark', size: [2, 3] });
    P.atkCd = st.cd * haste();
    slashArc(P.atk, -st.wind);
  }

  // The draw.
  function drawCut(lvl, mx, up, down) {
    const d = aim(mx, up, down, G.input.aim.attack), k = lvl - 1, heavy = lvl >= 3;
    // from the ground, a line that is nearly level is level
    if (P.onGround && Math.abs(d.y) < 0.26) { d.x = G.sign(d.x) || P.facing; d.y = 0; }
    const dist = C.DRAW_STEP[k] * (1 + 0.3 * G.boon('reach')) * (P.onGround ? 1 : C.AIR_REACH), spd = dist / C.DRAW_T;
    if (P.dashT > 0) { P.dashT = 0; P.dashCd = P.dashCdMax; P.sinceDash = 0; } // straight out of a dash
    const owe = {
      t: C.DRAW_T + C.DRAW_WAIT[k], lvl, heavy, cuts: [], dir: G.sign(d.x) || P.facing, ang: Math.atan2(d.y, d.x),
      dmg: Math.round(C.DRAW_DMG[k] * weaponMult(heavy)),
    };
    P.owed.push(owe);
    P.atk = {
      kind: 'draw', lvl, heavy, thrust: false, t: 0, dur: C.DRAW_T, a0: 0, a1: C.DRAW_T, hit: new Set(),
      dir: P.facing, dx: d.x, dy: d.y, swung: true, hold: 0, charge: 0, x0: P.x, y0: P.y, owe,
    };
    P.drawT = C.DRAW_T; P.drawV = { x: d.x * spd, y: d.y * spd }; P.ghostT = 0;
    if (d.y < -0.05) { P.plat = null; P.onGround = false; P.coyote = 0; }
    // it passes through attacks, as a dash does: drawn through one, it is a perfect dodge
    P.iframes = Math.max(P.iframes, C.DRAW_T + 0.06 + 0.02 * lvl); P.pdDone = false;
    P.atkCd = C.DRAW_T + C.DRAW_WAIT[k] + 0.03;
    P.cast = null; P.recov = null; P.healT = 0; P.squash = -0.07; P.dashHit.clear(); P.edge = 0; P.strung = 0;
    P.sun = heavy && G.boon('secondsun') ? 3 : 0; // (Second Sun: the next hold starts at two marks)
    G.audio.play('draw');
    G.fx.kick(d.x * (3 + 2 * lvl), d.y * (3 + 2 * lvl));
    const hx = mouthX(), hy = mouthY();
    G.fx.glint(hx, hy, 22 + 12 * lvl, heavy ? GOLD : HOT, 0.2);
    G.fx.lines(hx, hy, 4 + 3 * lvl, HOT, { r0: 14, speed: [500, 1000] });
    if (P.onGround) G.fx.dust(P.x - d.x * 8, P.y, 3 + lvl, { dir: -G.sign(d.x) || -P.facing, speed: [80, 320], size: [5, 11], up: 30 });
    else G.fx.ring(P.x, P.y - 24, { r0: 8, r1: 40 + 10 * lvl, life: 0.22, color: STAR, width: 3 });
    if (heavy) { G.fx.light(hx, hy, 240, GOLD, 0.2, 0.6); G.fx.flash(HOT, 0.07, 0.14); }
  }

  // Everything her blade crosses while the draw carries her. Nothing is hurt yet: each is owed a cut.
  function sweepCut(a) {
    const r = (1 + 0.3 * G.boon('reach')) * H.reach;
    const hb = { cx: P.x + a.dx * 24 * r, cy: P.y - 28 + a.dy * 24 * r, hw: 40 * r, hh: 38 };
    for (const t of G.boss.targets()) {
      if (a.hit.has(t.id) || !touch(hb, t)) continue;
      a.hit.add(t.id);
      const c = contact(hb, t);
      a.owe.cuts.push({ id: t.id, ox: c.x - t.cx, oy: c.y - t.cy });
      // steel passing: a ring of it and a star of light, and the world catches for an instant
      G.audio.play('glint');
      G.fx.stop(0.02 + 0.012 * a.lvl);
      G.fx.glint(c.x, c.y, 26 + 10 * a.lvl, HOT, 0.24);
    }
    for (const o of G.hazards.slashables()) {
      if (G.circleRect(o.x, o.y, o.r + 5, hb)) { o.slash(); P.gain(C.GAIN_ORB); }
    }
  }

  // The draw is over: the line of the cut hangs in the air until the blade is home.
  function drawn(a) {
    const o = a.owe, len = G.dist(a.x0, a.y0, P.x, P.y), cx = (a.x0 + P.x) / 2, cy = (a.y0 + P.y) / 2 - 30;
    o.line = { cx, cy, ang: o.ang, len: len + 170 }; // (for a Hanging Cut)
    G.fx.cut(cx, cy, o.ang, len + 110, 6 + 3 * a.lvl, STAR, HOT, 0.13);
    G.fx.cut(cx, cy, o.ang, len + 170, 1.4 + 0.5 * a.lvl + (o.counter ? 1.6 : 0), a.heavy || o.counter ? GOLD : HOT, HOT, o.t + 0.1);
    if (o.counter && !o.cuts.length) { P.hush = null; G.slowT = Math.min(G.slowT || 0, 0.12); } // it cut nothing: no counter to wait for
    if (a.heavy && G.boon('crescent')) wave(P.x + a.dx * 20, P.y - 30 + a.dy * 20, a.dx, a.dy);
  }

  // The blade is home, and what it cut finds out.
  function landCut(o) {
    G.audio.play('sheath');
    if (o.heavy && !o.echo && G.boon('hanging') && o.cuts.length) hang(o);
    if (P.hush === o) P.hush = null;
    for (const c of o.cuts) {
      const t = G.boss.targets().find((q) => q.id === c.id);
      if (!t) continue;
      const x = t.cx + c.ox, y = t.cy + c.oy, lvl = o.lvl;
      const em = G.moments.strike(o.heavy);
      const res = G.boss.damage(Math.round(o.dmg * em.mult), t, { x, y, heavy: true, finisher: o.heavy || em.mult > 1, dir: o.dir, poise: H.poise });
      if (!res) { G.audio.play('tink'); G.fx.tink(x, y, o.ang); continue; }
      P.gain(C.DRAW_GAIN[lvl - 1]);
      G.sets.hit(o.heavy ? 'finisher' : 'light', t, x, y);
      G.fx.stop([0.05, 0.08, 0.14][lvl - 1]); G.fx.shake([4, 8, 16][lvl - 1]);
      G.fx.cut(x, y, o.ang, [240, 440, 900][lvl - 1], [9, 15, 20][lvl - 1], STAR, HOT, [0.22, 0.3, 0.42][lvl - 1]);
      G.fx.hit(x, y, o.ang, { heavy: lvl >= 2, thrust: lvl < 2, power: 0.8 + 0.2 * lvl, col: o.heavy ? GOLD : STAR, hot: HOT });
      // light that drifts down from the cut like petals
      G.fx.burst(x, y, { n: 4 + 5 * lvl, color: STAR, speed: [30, 210], life: [0.7, 1.5], size: [1.6, 3.2], grav: 90, wob: 110, drag: 1.4, jitter: 18 });
      if (lvl >= 2) G.fx.ring(x, y, { r0: 8, r1: 60 + 30 * lvl, life: 0.3, color: o.heavy ? GOLD : STAR, width: 3 + 2 * lvl });
      const counter = o.heavy && em.kind === 'riposte';
      if (o.heavy) {
        G.fx.cut(x, y, o.ang, 900, 7, GOLD, HOT, 0.52);
        G.fx.punch(0.04); G.fx.flash(HOT, 0.1, 0.25); G.fx.impact(x, y, counter ? 0.11 : 0.07);
        G.fx.lines(x, y, 14, HOT, { r0: 24 });
        G.fx.light(x, y, 220, HOT, 0.25, 0.45);
        G.fx.burst(x, y, { n: 12, color: GOLD, speed: [200, 760], life: [0.15, 0.5], kind: 'spark', size: [2.5, 4.5] });
        G.audio.play('iai'); // (her own, not the bosses' slam)
      }
      G.audio.play(lvl >= 2 ? 'hitHeavy' : 'hit', { pitch: hitPitch() });
      if (counter) counterLand(x, y, o);
      struck(t, x, y);
      G.moments.landed(em, x, y, o.ang, o.heavy);
    }
  }

  // ---------------------------------------------------------------- signature boons (v2.2a)
  // their own sounds
  {
    const S = G.audio.synth;
    // a star set on the foe: a small high chime
    G.audio.define('sigstar', () => {
      S.tone({ type: 'sine', f0: 1760, f1: 1800, dur: 0.18, vol: 0.06 });
      S.tone({ type: 'triangle', f0: 2640, f1: 2600, dur: 0.12, vol: 0.03 });
    });
    // the third star: the chord rings out and breaks
    G.audio.define('sigburst', () => {
      S.tone({ type: 'sine', f0: 880, f1: 860, dur: 0.5, vol: 0.07 });
      S.tone({ type: 'sine', f0: 1320, f1: 1300, dur: 0.45, vol: 0.05 });
      S.tone({ type: 'sine', f0: 1760, f1: 1720, dur: 0.4, vol: 0.04 });
      S.noise({ dur: 0.14, vol: 0.22, type: 'highpass', f0: 2400 });
      S.tone({ type: 'triangle', f0: 220, f1: 80, dur: 0.25, vol: 0.14 });
    });
    // a pinned lance bursting: a hard crack and a falling whine
    G.audio.define('sigpin', () => {
      S.noise({ dur: 0.08, vol: 0.32, type: 'bandpass', f0: 1800, q: 2 });
      S.tone({ type: 'square', f0: 1400, f1: 300, dur: 0.22, vol: 0.06 });
      S.tone({ type: 'sine', f0: 160, f1: 60, dur: 0.3, vol: 0.2 });
    });
    // the floor cracking under a full smash: a dry grind
    G.audio.define('sigcrack', () => {
      S.noise({ dur: 0.35, vol: 0.2, type: 'lowpass', f0: 900, f1: 260 });
      S.tone({ type: 'triangle', f0: 90, f1: 70, dur: 0.4, vol: 0.12 });
    });
    // the crack erupting: rock thrown up
    G.audio.define('sigerupt', () => {
      S.tone({ type: 'sine', f0: 110, f1: 38, dur: 0.5, vol: 0.32 });
      S.noise({ dur: 0.4, vol: 0.32, type: 'lowpass', f0: 1600, f1: 300 });
      S.noise({ dur: 0.06, vol: 0.2, type: 'highpass', f0: 3000 });
    });
    // a blow taken while braced filling the charge: a deep swell
    G.audio.define('sigbrace', () => {
      S.tone({ type: 'triangle', f0: 180, f1: 360, dur: 0.22, vol: 0.14 });
      S.tone({ type: 'sine', f0: 720, f1: 1080, dur: 0.2, vol: 0.05 });
    });
    // the heavy arrow breaking into three: a split crack
    G.audio.define('sigsplit', () => {
      S.noise({ dur: 0.05, vol: 0.24, type: 'highpass', f0: 3600 });
      S.tone({ type: 'triangle', f0: 1900, f1: 1300, dur: 0.09, vol: 0.05 });
      S.tone({ type: 'triangle', f0: 2300, f1: 1600, dur: 0.09, vol: 0.04, delay: 0.02 });
    });
    // a hanging cut cutting again: steel hissing out of the air
    G.audio.define('sighang', () => {
      S.noise({ dur: 0.16, vol: 0.24, type: 'highpass', f0: 2800, f1: 6000 });
      S.tone({ type: 'sine', f0: 2100, f1: 1500, dur: 0.18, vol: 0.05 });
    });
  }
  // Two for each hero, offered only to that hero and never two in one offering (run.js). They change
  // how the hero plays rather than adding to a number.
  function sigStep(dt) {
    if (P.sun > 0) P.sun = Math.max(0, P.sun - dt);
    if (P.pin && (P.pin.t -= dt) <= 0) P.pin = null;
    if (P.stars && (P.stars.t -= dt) <= 0) P.stars = null;
    // Eos's Hanging Cut: the line of a full draw stays in the air, shedding gold, and cuts again
    for (let i = P.hangs.length - 1; i >= 0; i--) {
      const h = P.hangs[i], L = h.line;
      h.t -= dt;
      if (Math.random() < dt * 30) {
        const q = G.rand(-0.5, 0.5);
        G.fx.spawn({ x: L.cx + Math.cos(L.ang) * L.len * q, y: L.cy + Math.sin(L.ang) * L.len * q, vx: G.rand(-10, 10), vy: G.rand(10, 40), life: G.rand(0.3, 0.6), size: G.rand(1.2, 2.4), color: GOLD });
      }
      if (h.t > 0) continue;
      P.hangs.splice(i, 1);
      G.fx.cut(L.cx, L.cy, L.ang, L.len, 8, GOLD, HOT, 0.3);
      G.audio.play('sighang');
      landCut({ cuts: h.cuts, lvl: 2, heavy: false, echo: true, dmg: h.dmg, dir: h.dir, ang: L.ang });
    }
    // Aster's Fault Line: the crack a full smash leaves glows, then erupts
    for (let i = P.faults.length - 1; i >= 0; i--) {
      const f = P.faults[i];
      f.t -= dt;
      if (Math.random() < dt * 40) G.fx.spawn({ kind: 'spark', x: f.x + G.rand(-90, 90), y: FLOOR - 2, vx: G.rand(-30, 30), vy: -G.rand(60, 200), life: G.rand(0.15, 0.35), size: G.rand(1.4, 2.4), color: GOLD, grav: 600 });
      if (f.t > 0) continue;
      P.faults.splice(i, 1);
      const hb = { cx: f.x, cy: FLOOR - 60, hw: 110, hh: 60 };
      for (const t of G.boss.targets()) {
        if (!touch(hb, t)) continue;
        const c = contact(hb, t);
        if (G.boss.damage(f.dmg, t, { x: c.x, y: c.y, heavy: true, dir: f.dir, poise: H.poise })) { P.gain(C.GAIN_HEAVY); struck(t, c.x, c.y); }
      }
      G.audio.play('sigerupt'); G.fx.shake(8); G.fx.thud(f.x, FLOOR, 1.3, { col: GOLD });
      G.fx.burst(f.x, FLOOR - 6, { n: 18, color: GOLD, speed: [200, 620], angle: -Math.PI / 2, spread: 0.9, life: [0.2, 0.5], kind: 'spark', size: [2, 4], grav: 900 });
      G.fx.burst(f.x, FLOOR - 4, { n: 8, color: '22,18,32', speed: [150, 460], angle: -Math.PI / 2, spread: 1.4, life: [0.5, 1], size: [5, 9], kind: 'chunk', grav: 1500 });
    }
  }
  // Vesper's Pinning Lance: the lance that strikes stays fixed where it went in
  function pinLance(s, t) {
    P.pin = { id: t.id, ox: s.x - t.cx, oy: s.y - t.cy, ang: Math.atan2(s.vy, s.vx), t: 8 };
  }
  // A finisher of Vesper's that lands: a lance pinned in that foe bursts (Pinning Lance), and a star
  // is set on it; the third links them and bursts (Constellation)
  function finisherLanded(t, c) {
    if (P.pin && P.pin.id === t.id && G.boon('pinlance')) {
      const x = t.cx + P.pin.ox, y = t.cy + P.pin.oy;
      P.pin = null;
      G.boss.damage(Math.round(40 * G.dmgMult()), t, { x, y, heavy: true, lance: true, poise: H.poise });
      G.audio.play('sigpin'); G.fx.shake(7);
      G.fx.ring(x, y, { r0: 8, r1: 110, life: 0.3, color: HOT, width: 6 });
      G.fx.lines(x, y, 10, HOT, { r0: 14 });
      G.fx.burst(x, y, { n: 12, color: STAR, speed: [150, 600], life: [0.15, 0.45], kind: 'spark', size: [2, 4] });
    }
    if (G.boon('stars')) {
      const st = P.stars && P.stars.id === t.id ? P.stars : (P.stars = { id: t.id, pts: [], t: 0 });
      const n = st.pts.length, rr = t.r ? t.r * 0.6 : Math.min(t.hw, t.hh) * 0.75, a = -Math.PI / 2 + n * G.TAU / 3;
      st.t = 8; st.pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      G.fx.glint(t.cx + Math.cos(a) * rr, t.cy + Math.sin(a) * rr, 22, STAR, 0.3); G.audio.play('sigstar');
      if (st.pts.length >= 3) {
        P.stars = null;
        const pts = st.pts.map(([ox, oy]) => [t.cx + ox, t.cy + oy]);
        for (let i = 0; i < 3; i++) {
          const p = pts[i], q = pts[(i + 1) % 3];
          G.fx.cut((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, Math.atan2(q[1] - p[1], q[0] - p[0]), Math.hypot(q[0] - p[0], q[1] - p[1]) + 24, 5, STAR, HOT, 0.4);
        }
        const mx = t.cx, my = t.cy;
        G.boss.damage(Math.round(60 * G.dmgMult()), t, { x: mx, y: my, heavy: true, finisher: true, poise: H.poise });
        G.audio.play('sigburst'); G.fx.shake(9);
        G.fx.ring(mx, my, { r0: 10, r1: 140, life: 0.35, color: STAR, width: 7 });
        G.fx.burst(mx, my, { n: 16, color: STAR, speed: [150, 640], life: [0.15, 0.5], kind: 'spark', size: [2, 4.5] });
      }
    }
  }
  // Aster's Fault Line: where a full smash meets the floor it cracks, and a second later the crack erupts
  function fault(x, dir) {
    x = G.clamp(x, G.WALL_L + 40, G.WALL_R - 40);
    P.faults.push({ x, dir, t: 1, dmg: Math.round(45 * G.dmgMult()) });
    G.fx.crack(x, 1.4, GOLD); G.audio.play('sigcrack');
  }
  // Aster's Unbroken: a blow taken while she charges fills the charge, and the smash comes at once
  function unbroken(a) {
    if (!a.canCharge || a.swung) return;
    a.hold = C.CHARGE_T; a.charge = 1;
    G.audio.play('sigbrace'); G.fx.shake(4);
    G.fx.ring(P.x - a.dir * 14, P.y - 78, { r0: 70, r1: 12, life: 0.25, color: GOLD, width: 5 });
  }
  // Lune's Splitting Arrow: the heavy arrow breaks into three where it first strikes
  function splitArrow(s) {
    s.split = true;
    const base = Math.atan2(s.vy, s.vx);
    for (const da of [-0.34, 0, 0.34]) {
      const a = base + da;
      G.shots.push({ arrow: true, heavy: false, spent: true, split: true, x: s.x + Math.cos(a) * 14, y: s.y + Math.sin(a) * 14, ox: s.x, oy: s.y,
        vx: Math.cos(a) * C.ARROW_SPEED, vy: Math.sin(a) * C.ARROW_SPEED, t: 0, hit: new Set(), dmg: Math.round(s.dmg * 0.2), life: 0.45 });
    }
    G.audio.play('sigsplit');
    G.fx.burst(s.x, s.y, { n: 8, color: GOLD, speed: [120, 420], life: [0.1, 0.3], kind: 'spark', size: [1.5, 2.5] });
  }
  // Eos's Hanging Cut: the line of a full draw hangs where it was cut
  function hang(o) {
    const L = o.line || { cx: P.x, cy: P.y - 30, ang: o.ang, len: 300 };
    P.hangs.push({ t: 1, cuts: o.cuts.slice(), dmg: Math.round(o.dmg * 0.5), dir: o.dir, line: L });
    G.fx.cut(L.cx, L.cy, L.ang, L.len, 2.4, STAR, GOLD, 1.05);
  }
  // what the signature boons leave on a foe: a pinned lance, the stars set so far
  function drawSigs(ctx) {
    if (!P.pin && !P.stars) return;
    const ts = G.boss.targets();
    if (P.pin) {
      const t = ts.find((q) => q.id === P.pin.id);
      if (t) {
        const x = t.cx + P.pin.ox, y = t.cy + P.pin.oy, k = Math.min(1, P.pin.t / 1.5);
        ctx.save(); ctx.translate(x, y); ctx.rotate(P.pin.ang);
        ctx.strokeStyle = G.rgba(HOT, 0.9 * k); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-6, 0); ctx.stroke();
        ctx.fillStyle = G.rgba(HOT, k); poly(ctx, [-6, -5, 8, 0, -6, 5]); ctx.fill();
        ctx.restore();
        ctx.drawImage(G.fx.glow(STAR), x - 22, y - 22, 44, 44);
      }
    }
    if (P.stars) {
      const t = ts.find((q) => q.id === P.stars.id);
      if (t) for (const [ox, oy] of P.stars.pts) {
        const x = t.cx + ox, y = t.cy + oy, s = 7 + 2 * Math.sin(G.t * 9);
        ctx.fillStyle = G.rgba(HOT, 0.95);
        poly(ctx, [x, y - s, x + s * 0.3, y, x, y + s, x - s * 0.3, y]); ctx.fill();
        poly(ctx, [x - s, y, x, y - s * 0.3, x + s, y, x, y + s * 0.3]); ctx.fill();
        ctx.drawImage(G.fx.glow(STAR), x - 16, y - 16, 32, 32);
      }
    }
  }

  // The full draw, landed as a counter: the biggest thing she does outside her Dawnbreak. The cut
  // crosses the whole arena, the picture slips along it, the ground under the boss gives, and the
  // light that comes off it falls like petals the length of the line.
  function counterLand(x, y, o) {
    const cs = Math.cos(o.ang), sn = Math.sin(o.ang);
    G.fx.stop(0.2); G.fx.shake(24); G.fx.punch(0.065); G.fx.kick(cs * 14, sn * 14);
    G.fx.flash(GOLD, 0.2, 0.3);
    G.fx.cut(x, y, o.ang, 2800, 16, STAR, HOT, 0.26);
    G.fx.cut(x, y, o.ang, 2800, 6, GOLD, HOT, 0.7);
    // what the blow does to the place, rather than how bright it is: the air bends twice, the floor
    // under the boss cracks and throws up stone, and dust runs out along the ground both ways
    G.fx.ripple(x, y, 620, 0.55, 1.6);
    G.fx.crack(x, 1.6, STAR);
    G.fx.burst(x, FLOOR - 4, { n: 14, color: '22,18,32', speed: [220, 760], angle: -Math.PI / 2, spread: 2.2, life: [0.6, 1.2], size: [5, 11], kind: 'chunk', grav: 1500 });
    for (const d of [-1, 1]) G.fx.dust(x + d * 30, FLOOR, 7, { dir: d, speed: [160, 620], size: [8, 15], life: [0.5, 1.1], up: 30, a: 0.4 });
    G.flow.split = { t0: performance.now(), x: x - G.cam.x, y: y - G.cam.y, ang: o.ang, dur: 0.42, amp: 0.55 };
    G.fx.shatter(x, y, STAR, 22, { hot: HOT, r: 440, r0: 40 });
    G.fx.ring(x, y, { r0: 20, r1: 340, life: 0.5, color: GOLD, width: 10 });
    G.fx.ring(x, y, { r0: 10, r1: 200, life: 0.36, color: HOT, width: 6 });
    G.fx.lines(x, y, 22, GOLD, { r0: 30, speed: [700, 1400] });
    G.fx.light(x, y, 240, GOLD, 0.4, 0.5);
    G.fx.thud(x, FLOOR, 1.6, { col: STAR });
    for (let i = -3; i <= 3; i++) {
      G.fx.burst(x + cs * i * 90, y + sn * i * 90, { n: 7, color: i % 2 ? HOT : STAR, speed: [30, 260], life: [0.9, 1.9], size: [1.8, 3.6], grav: 80, wob: 120, drag: 1.3, jitter: 40 });
    }
    G.fx.burst(x, y, { n: 26, color: GOLD, speed: [260, 1000], life: [0.2, 0.6], kind: 'spark', size: [2.5, 5], grav: 500 });
    G.audio.play('finish'); G.audio.play('bell'); G.audio.play('shatter');
  }

  // Eos's special: Still Point. He sets the sheath across his body and waits for the blow. One that
  // lands in that time is turned: no damage, the swing that made it is stopped, and all three marks
  // light at once, so his next press is a full draw (and for a while he does not have to hold
  // anything to keep it). Nothing lands, and the Starlight is spent for nothing. It is the other way
  // to play him: do not wait for an opening, ask for the blow.
  function castGuard() {
    P.atk = null; P.recov = null;
    P.cast = { kind: 'guard', t: 0, wind: C.GUARD_T, dur: C.GUARD_T + 0.2, thrown: false };
    P.vx *= 0.3;
    G.audio.play('glint');
    G.fx.ring(P.x + P.facing * 12, P.y - 34, { r0: 46, r1: 12, life: C.GUARD_T, color: STAR, width: 2, alpha: 0.7 });
    G.fx.glint(P.x + P.facing * 12, P.y - 44, 20, HOT, 0.2);
  }
  function turned(srcX, src) {
    const c = P.cast, dir = G.sign(srcX - P.x) || P.facing, gx = P.x + dir * 16, gy = P.y - 34;
    c.thrown = true; c.hit = true; c.t = c.wind; c.dur = c.wind + 0.34;
    P.facing = dir;
    P.iframes = Math.max(P.iframes, 0.5); P.pdDone = true;
    P.focus = C.FOCUS[2]; P.edge = C.EDGE_T;
    P.vx = -dir * 150;
    // the swing that was turned is stopped, and whoever swung it is rocked
    if (src && src.kind === 'arc' && src.owner) {
      const o = src.owner, B = G.boss;
      src.dead = true;
      if (o.kx != null) o.kx = G.clamp(o.kx + dir * 16, -18, 18);
      if (B.kit && !B.staggered && o === B.body) { B.poise = Math.min(B.poiseMax - 1, B.poise + 46 * H.poise); o.recV = (o.recV || 0) + dir * 3; }
    }
    G.flow.add(12); P.ult = Math.min(100, P.ult + 5);
    G.sets.hit('special', null, gx, gy, P.castN); // (a turned blow is Still Point landing)
    G.audio.play('clash'); G.audio.play('focus', { n: 3 });
    G.fx.stop(0.14); G.fx.shake(10); G.fx.punch(0.03); G.fx.kick(-dir * 6, 0);
    G.fx.ripple(gx, gy, 260, 0.36, 1.1);
    G.fx.glint(gx, gy, 56, GOLD, 0.3);
    G.fx.ring(gx, gy, { r0: 10, r1: 130, life: 0.3, color: GOLD, width: 5 });
    G.fx.lines(gx, gy, 14, HOT, { r0: 18, speed: [600, 1200] });
    G.fx.burst(gx, gy, { n: 18, color: GOLD, speed: [200, 800], life: [0.15, 0.45], kind: 'spark', size: [2, 4], grav: 500, angle: dir > 0 ? Math.PI : 0, spread: 2.4 });
    if (P.onGround) G.fx.dust(P.x, P.y, 5, { dir: -dir, speed: [80, 280], size: [5, 10] });
    // Second Light: the turned blow is answered with a crescent of light
    if (G.boon('second')) {
      const B = G.boss;
      let dx = dir, dy = 0;
      if (B.active && B.core) { const ax = B.core.x - P.x, ay = B.core.y - (P.y - 34), d = Math.hypot(ax, ay) || 1; dx = ax / d; dy = P.onGround && ay > 0 ? 0 : ay / d; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n; }
      arcShot(dx, dy, 1); G.audio.play('draw');
    }
    G.feats.bump('turned');
  }

  // A cut thrown across the arena as a crescent of light. (It was Eos's special until v1.7c; now
  // Second Light throws one when a blow is turned.)
  function castArc(dx, dy) {
    P.atk = null; P.recov = null;
    P.cast = { kind: 'arc', t: 0, wind: 0.07, dur: 0.46, dx, dy, thrown: false };
    G.fx.glint(mouthX(), mouthY(), 30, HOT, 0.18);
  }
  function arcShot(dx, dy, k) {
    G.shots.push({
      wave: true, arc: true, big: 1.5, x: P.x + dx * 30, y: P.y - 34 + dy * 30, vx: dx * C.ARC_SPEED, vy: dy * C.ARC_SPEED,
      t: 0, life: 0.9, hit: new Set(), dmg: Math.round(C.ARC_DMG * k * G.dmgMult() * spec()),
    });
  }
  function throwArc(c) {
    arcShot(c.dx, c.dy, 1);
    if (G.boon('second')) P.arc2 = { t: 0.16, dx: c.dx, dy: c.dy };
    P.vx -= c.dx * 160;
    G.audio.play('draw'); G.audio.play('flare');
    muzzle(c.dx, c.dy);
  }

  // A near miss. Something went by close enough to feel and did not touch: a streak of the hero's
  // light off the side it passed, a thin sound, and a little Flow. No word for it.
  P.canGraze = () => !P.dead && !P.hidden && !P.ulting && P.iframes <= 0 && P.inv <= 0 && P.stun <= 0 && P.grazeCd <= 0;
  P.graze = function (h) {
    P.grazeCd = 0.3;
    const hx = h.srcX != null ? h.srcX : h.x != null ? h.x : P.x + P.facing * 40, hy = h.y != null ? h.y : P.y - 22;
    const ang = Math.atan2(hy - (P.y - 22), hx - P.x), cx = P.x + Math.cos(ang) * 16, cy = P.y - 22 + Math.sin(ang) * 20;
    G.audio.play('graze');
    G.flow.add(2); P.ult = Math.min(100, P.ult + 0.6);
    G.fx.glint(cx, cy, 15, HOT, 0.16);
    G.fx.burst(cx, cy, { n: 6, color: STAR, kind: 'spark', angle: ang + Math.PI / 2, spread: 0.5, speed: [260, 620], life: [0.1, 0.22], size: [1.3, 2.2] });
    G.fx.burst(cx, cy, { n: 6, color: HOT, kind: 'spark', angle: ang - Math.PI / 2, spread: 0.5, speed: [260, 620], life: [0.1, 0.22], size: [1.3, 2.2] });
    G.fx.ring(P.x, P.y - 22, { r0: 26, r1: 40, life: 0.18, color: STAR, width: 1.5, alpha: 0.5 });
    G.feats.bump && G.feats.bump('graze');
  };

  // Hits that keep coming climb in pitch: three quarters of a tone a hit, up to six tones, and
  // back to the bottom after a second and a bit without one or when the hero is struck.
  function hitPitch() {
    P.streakN = P.streakT > 0 ? Math.min(8, P.streakN + 1) : 0;
    P.streakT = 1.25;
    return Math.pow(2, P.streakN * 0.75 / 12);
  }

  // An attack connected while the player was dashing (or plunging) through it.
  function perfect() {
    P.stats.perfect++;
    P.gain(C.GAIN_PERFECT);
    G.flow.perfect();
    G.moments.perfect();
    P.dashCd = 0;
    G.audio.play('perfect');
    G.fx.slow(0.38, 0.3);
    G.fx.ring(P.x, P.y - 22, { r0: 12, r1: 110, life: 0.45, color: STAR, width: 5 });
    G.fx.flash(STAR, 0.1, 0.25);
    G.fx.lines(P.x, P.y - 22, 14, HOT, { r0: 30, speed: [500, 1000] });
    G.fx.light(P.x, P.y - 22, 220, STAR, 0.3, 0.55);
    G.fx.punch(0.012);
    G.fx.text(P.x, P.y - 74, 'PERFECT', { color: HOT, size: 17, life: 0.9 });
    // Wellspring (a pair): a whole segment of Starlight
    if (G.boon('well')) { P.ember = Math.min(C.SEG * P.segs, P.ember + C.SEG); P.emberFlash = 1; }
    // Mirror Step answers a perfect dodge with a free shot at the core
    const B = G.boss;
    if (G.boon('mirror') && B.active && !B.dead && !B.dying) {
      const dx = B.core.x - P.x, dy = B.core.y - (P.y - 36), d = Math.hypot(dx, dy) || 1;
      if (H.weapon === 'bow') { arrow(dx / d, dy / d, Math.round(H.combo[2].dmg * 2 * weaponMult(true)), true, 0.7); G.audio.play('arrowHeavy'); }
      else { fireLance(dx / d, dy / d); G.audio.play('flare'); }
    }
    if (H.draw) hush();
    G.sets.perfect(); // (the Dash slot's set boon: sets.js)
    G.relics.perfect(); // (Stormcaller, the Still Hourglass, Quicksilver, awakened: relics.js)
    if (G.relic('wraps')) P.wraps = G.relics.wrapsWin(); // Sparring Wraps: the next attack within two seconds blinks
  }

  // Sparring Wraps (Kairo's trophy): after a perfect dodge, the next attack starts with a blink to the
  // foe's back (the side it is not facing), and that blow deals half again (see G.dmgMult).
  function wrapsBlink() {
    const B = G.boss;
    P.wraps = 0;
    if (!B.active || B.dead || B.dying || !B.core) return;
    const body = B.kit && B.body && !B.body.hidden ? B.body : null, bx = body ? body.x : B.core.x;
    const side = body && body.face ? -body.face : (G.sign(bx - P.x) || 1);
    let x = G.clamp(bx + side * 58, G.WALL_L + 24, G.WALL_R - 24);
    if (G.arena.inPit(x)) x = G.arena.solidNear(x);
    G.fx.burst(P.x, P.y - 22, { n: 10, color: STAR, speed: [60, 240], life: [0.15, 0.35], kind: 'spark', size: [1.5, 3] });
    P.ghosts.push({ x: P.x, y: P.y, f: P.facing, life: 0.3 });
    P.x = x; P.vx = 0; P.facing = G.sign(bx - x) || P.facing;
    P.wrapsHit = 0.45;
    G.relics.blinked();
    G.audio.play('blink');
    G.fx.ring(P.x, P.y - 22, { r0: 44, r1: 8, life: 0.2, color: HOT, width: 3 });
  }

  // Eos drew through a blow (or slipped one while a cut of hers was still on its way): that cut is
  // now a counter. The arena goes dark and slow around her and holds its breath until the blade is
  // home (see landCut for what happens then).
  function hush() {
    const o = P.owed.find((q) => !q.counter && (q.cuts.length || (P.atk && P.atk.owe === q)));
    if (!o) return;
    o.counter = true; P.hush = o;
    G.fx.slow(0.6, o.t / 0.6 + 0.06);
    G.fx.stop(0.09);
    G.fx.vig(GOLD, 0.34, o.t / 0.6 + 0.3);
    G.fx.glint(mouthX(), mouthY(), 54, GOLD, 0.3);
    G.audio.play('pulse', { k: 0.6 });
  }

  P.tryHit = function (dmg, srcX, src) {
    if (P.dead || P.hidden || P.ulting || !G.canHurt()) return false;
    if (P.cast && P.cast.kind === 'guard' && !P.cast.thrown) { turned(srcX, src); return false; } // Eos was waiting for it
    if (P.iframes > 0) {
      if (!P.pdDone) { P.pdDone = true; perfect(); }
      return false;
    }
    if (P.inv > 0 || G.debug.god) return false;
    if (P.ward) {
      // Wardstone: this phase's first hit is turned aside
      P.ward = false; P.wardT = 0; P.inv = 0.9;
      G.audio.play('tink'); G.audio.play('perfect');
      G.fx.shake(6);
      G.fx.ring(P.x, P.y - 22, { r0: 26, r1: 130, life: 0.45, color: HOT, width: 8 });
      G.fx.shatter(P.x, P.y - 22, HOT, 10, { r: 180 });
      G.fx.text(P.x, P.y - 78, 'WARDED', { color: HOT, size: 18, life: 1 });
      G.relics.warded(); // (the Wardstone, awakened: relics.js)
      return false;
    }
    dmg = G.relics.blowDmg(dmg); // (Anvil Heart, Ascendant)
    if (G.bane('bloodedge')) dmg += 1; // Bloodied Edge's bane
    P.hp -= dmg; P.stats.hits++;
    G.relics.hurt(); // (relics.js: Thorn Crown, Rising Sun, Anvil Heart, the Pearl)
    if (G.bane('feral')) P.ember = 0; // Feral Rhythm's bane
    if (G.bane('ravenous')) G.hexes.feed(); // Ravenous Light's bane
    if (P.cast && !P.cast.thrown) P.ember += C.SEG; // caught mid wind-up: the lance never left, the Starlight comes back
    P.cast = null;
    P.lastHit = { kind: src && src.kind, attack: G.boss.attackName || '' }; // for the defeat screen
    const braced = (!!(P.atk && P.atk.canCharge && !P.atk.swung && P.atk.hold > 0.12) || G.relics.anvil()) && P.hp > 0; // (Anvil Heart: never moved)
    const dir = G.sign(P.x - srcX) || -P.facing;
    P.inv = C.HURT_INV; P.dashT = 0; P.healT = 0; P.hurtFlash = 1; P.plunge = false;
    P.drawT = 0; if (!braced) { P.hold = null; P.focus = 0; P.edge = 0; P.strung = 0; P.sun = 0; } // and whatever Focus Eos had gathered is gone
    if (braced && G.boon('unbroken') && P.atk) unbroken(P.atk);
    P.streakT = 0;
    if (P.flT > 0) { P.flT = 0; P.flCd = 2; } // caught showing off
    G.feats.bump('hurt');
    if (braced) {
      // Aster, mid-charge: it hurts, but she is not moved and the blow she is holding is not lost
      G.fx.text(P.x, P.y - 84, 'UNMOVED', { color: HOT, size: 15, life: 0.8 });
    } else {
      P.stun = 0.2; P.atk = null;
      P.vx = dir * 430; P.vy = (src && typeof src.popVy === 'number') ? src.popVy : -430; P.onGround = false; P.plat = null; P.jumpHeld = false;
    }
    G.fx.stop(0.14); G.fx.shake(13); G.fx.flash('255,50,50', 0.26, 0.35);
    if (dmg >= 2) G.fx.impact(P.x, P.y - 22, 0.07); // the blows that take two health land like it
    G.fx.burst(P.x, P.y - 22, { n: 16, color: '255,120,120', speed: [100, 420], life: [0.2, 0.55], kind: 'spark', size: [2, 4] });
    G.fx.hurt(P.x, P.y - 22, dir, STAR);
    G.flow.hurt();
    G.audio.play('hurt');
    if (P.hp <= 0 && G.boon('dawn') && !P.dawnUsed) {
      // Second Dawn: survive the killing blow once per trial
      P.dawnUsed = true; P.hp = 1; P.inv = 2.6;
      revived('SECOND DAWN');
      if (G.boon('dying') && G.boss.forceStagger) G.boss.forceStagger(); // Dying Light (a pair)
    }
    if (P.hp <= 0 && G.boon('borrowed') && !P.borrowUsed) {
      // Borrowed Time (corrupted): once per trial
      P.borrowUsed = true; P.hp = 2; P.inv = 2.6;
      revived('BORROWED TIME');
      if (G.boss.forceStagger) G.boss.forceStagger();
    }
    if (P.hp <= 0 && G.relics.phoenixReady()) {
      // Phoenix Feather: once per run (twice, Awakened)
      G.relics.phoenix();
      revived('REBORN');
    }
    if (P.hp <= 0) { P.hp = 0; die(); } else G.moments.hurt();
    return true;
  };

  function revived(word) {
    G.audio.play('heal');
    G.fx.flash(HOT, 0.5, 0.6); G.fx.slow(0.3, 0.6);
    G.fx.ring(P.x, P.y - 22, { r0: 20, r1: 260, life: 0.7, color: HOT, width: 10 });
    G.fx.lines(P.x, P.y - 22, 16, HOT, { r0: 36 });
    G.fx.burst(P.x, P.y - 10, { n: 22, color: STAR, speed: [20, 120], life: [0.8, 1.6], size: [2, 4], grav: -240, wob: 140, jitter: 24 });
    G.fx.text(P.x, P.y - 84, word, { color: HOT, size: 20, life: 1.4 });
  }

  function die() {
    P.dead = true; P.deadT = 0;
    G.audio.play('die');
    G.fx.slow(0.15, 1.2);
    G.fx.burst(P.x, P.y - 22, { n: 46, color: STAR, speed: [40, 520], life: [0.5, 1.5], size: [3, 8], drag: 2 });
    G.fx.burst(P.x, P.y - 22, { n: 24, color: HOT, speed: [100, 700], life: [0.3, 0.8], kind: 'spark', size: [2, 4] });
    G.fx.ring(P.x, P.y - 22, { r0: 10, r1: 220, life: 0.8, color: STAR, width: 8 });
    G.fx.shatter(P.x, P.y - 22, STAR, 22, { hot: HOT, r: 320 });
    G.fx.vig('255,40,40', 0.8, 1.6);
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
        const half = (s.arrow ? 11 : 16) * (s.big || 1), hb = shotBox(s, half);
        for (const t of G.boss.targets()) {
          if (s.dead || s.hit.has(t.id)) continue;
          if (!touch(hb, t)) continue;
          s.hit.add(t.id);
          if (s.arrow) {
            // arrows hit harder the less distance they have flown: +60% within 120px, nothing extra past 300px...
            const flown = G.dist(s.x, s.y, s.ox, s.oy);
            const close = 1 + 0.6 * G.clamp((300 - flown) / 180, 0, 1);
            // ...and lose up to 30% of their force past 240px, so sniping from safety is slow
            const far = 1 - 0.3 * G.clamp((flown - 240) / 180, 0, 1);
            const em = G.moments.strike(s.heavy);
            const res = G.boss.damage(Math.round(s.dmg * close * far * em.mult), t, { x: s.x, y: s.y, heavy: s.heavy, finisher: s.heavy || em.mult > 1, dir: G.sign(s.vx), poise: H.poise });
            if (res) {
              if (s.spent) G.flow.hit(C.ARROW_GAIN); else P.gain(s.heavy ? C.ARROW_GAIN_HEAVY : C.ARROW_GAIN);
              G.sets.hit(s.cast != null ? 'special' : s.heavy ? 'finisher' : 'light', t, s.x, s.y, s.cast);
              G.fx.stop(s.heavy ? 0.06 : 0.016); G.fx.shake(s.heavy ? 6 : 1.2);
              G.audio.play(s.heavy ? 'hitHeavy' : 'hit', { pitch: hitPitch() });
              G.fx.hit(s.x, s.y, Math.atan2(s.vy, s.vx), { heavy: s.heavy, power: s.heavy ? 0.8 : 0.75, col: s.heavy ? GOLD : STAR, hot: HOT });
              if (s.heavy) G.fx.ring(s.x, s.y, { r0: 6, r1: 70, life: 0.25, color: GOLD, width: 5 });
              struck(t, s.x, s.y);
              G.moments.landed(em, s.x, s.y, Math.atan2(s.vy, s.vx), s.heavy);
              if (s.heavy && !s.split && G.boon('splitarrow')) splitArrow(s);
            } else G.audio.play('tink');
            if (!s.heavy) s.dead = true; // only the heavy arrow pierces
            continue;
          }
          const res = G.boss.damage(s.dmg, t, { x: s.x, y: s.y, heavy: true, lance: !s.wave || !!s.arc, dir: G.sign(s.vx) || P.facing });
          if (res && s.wave && !s.arc) {
            G.fx.stop(0.03); G.audio.play('hit');
            G.fx.hit(s.x, s.y, Math.atan2(s.vy, s.vx), { thrust: true, col: STAR, hot: HOT });
          } else if (res) {
            if (s.lance && G.boon('pinlance')) pinLance(s, t);
            if (s.lance) G.sets.hit('special', t, s.x, s.y, s.cast);
            G.fx.stop(0.07); G.fx.shake(9);
            G.audio.play('flareHit');
            G.fx.ring(s.x, s.y, { r0: 10, r1: 120, life: 0.35, color: HOT, width: 8 });
            G.fx.hit(s.x, s.y, Math.atan2(s.vy, s.vx), { heavy: true, power: 1.25, col: STAR, hot: HOT });
            G.fx.burst(s.x, s.y, { n: 12, color: STAR, speed: [150, 700], life: [0.2, 0.55], kind: 'spark', size: [2, 5] });
          } else G.audio.play('tink');
        }
        for (const o of G.hazards.slashables()) {
          if (!s.dead && G.dist(o.x, o.y, s.x, s.y) < o.r + (s.arrow ? 12 : 18) * (s.big || 1)) {
            o.slash();
            if (s.arrow) { if (!s.spent) P.gain(C.GAIN_ORB); if (!s.heavy) s.dead = true; }
          }
        }
      }
      if (!s.arrow || Math.random() < 0.5) G.fx.spawn({ x: s.x, y: s.y, vx: G.rand(-30, 30), vy: G.rand(-30, 30), life: s.arrow ? 0.2 : 0.3, size: s.arrow ? 3.5 : 6, color: STAR });
      if (s.y > FLOOR - 4 && s.vy > 0) {
        s.dead = true;
        G.fx.burst(s.x, FLOOR - 4, { n: s.arrow ? 5 : 14, color: STAR, speed: [100, 460], angle: -Math.PI / 2, spread: 2.4, life: [0.2, 0.5], kind: 'spark', size: [2, 4] });
        if (s.arrow) G.fx.dust(s.x, FLOOR, 2, { speed: [20, 80], size: [3, 6], a: 0.3 });
        else if (!s.wave) { G.fx.thud(s.x, FLOOR, 0.8, { noCrack: true }); G.fx.scorch(s.x, 34, STAR); G.fx.shake(4); }
      }
      // gone once it leaves the view (the view moves in the camp)
      if (s.dead || s.x < G.cam.x - 100 || s.x > G.cam.x + G.W + 100 || s.y < -200 || s.t > (s.life || 2)) G.shots.splice(i, 1);
    }
  };

  // what a shot strikes with. A crescent wave is drawn as an arc standing across its flight, ahead of
  // its centre and as tall as a hero and a half: it strikes with all of that (v2.1b; it used to strike
  // with a small square behind the arc). Anything else: a square on its head.
  function shotBox(s, half) {
    if (!s.wave) return { cx: s.x, cy: s.y, hw: half, hh: half };
    const L = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / L, uy = s.vy / L, b = s.big || 1;
    const along = 14 * b, across = 36 * b;
    return { cx: s.x + ux * 10 * b, cy: s.y + uy * 10 * b, hw: Math.abs(ux) * along + Math.abs(uy) * across, hh: Math.abs(uy) * along + Math.abs(ux) * across };
  }
  P.shotBox = shotBox;

  G.drawShots = function (ctx) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const s of G.shots) {
      if (s.wave) {
        // Crescent: an arc of light that fades as it travels
        const k = s.arc ? Math.min(1, (s.life - s.t) / 0.12) : 1 - s.t / s.life;
        ctx.save();
        ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx));
        if (s.big) ctx.scale(s.big, s.big);
        ctx.strokeStyle = G.rgba(s.col || STAR, 0.45 * k); ctx.lineWidth = 16;
        ctx.beginPath(); ctx.arc(-26, 0, 44, -0.85, 0.85); ctx.stroke();
        ctx.strokeStyle = G.rgba(s.hot || HOT, 0.95 * k); ctx.lineWidth = 5;
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
      // the Star Lance: a streak with a spearhead; just thrown, it is still drawn coming off the hand
      const off = s.vox ? Math.max(0, 1 - s.t / 0.1) : 0, x = s.x + (s.vox || 0) * off, y = s.y + (s.voy || 0) * off;
      const tail = Math.min(0.05, s.t + 0.012), tx = x - s.vx * tail, ty = y - s.vy * tail;
      ctx.strokeStyle = G.rgba(STAR, 0.35); ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = G.rgba(HOT, 1); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(s.vy, s.vx));
      ctx.fillStyle = G.rgba(HOT, 1); poly(ctx, [-4, -5.5, 14, 0, -4, 5.5, 0, 0]); ctx.fill();
      ctx.restore();
      ctx.drawImage(G.fx.glow(STAR), x - 34, y - 34, 68, 68);
    }
    drawSigs(ctx);
    ctx.globalCompositeOperation = 'source-over';
  };

  // ---------------------------------------------------------------- drawing
  // Each hero is a small jointed figure: legs and arms are two-bone limbs solved towards foot and
  // hand targets, so the same code gives a run cycle, jump poses, a dash lean and weapon swings.
  // Everything below is drawn in the hero's own frame: feet at (0, 0), facing right, y up negative.
  const SC = 1.3; // heroes are drawn larger than their hitbox, so near misses favour the player
  const DR = G.draw;
  const LIFT = 4; // the figures stand taller than the pose tables assume: shoulders and hands sit this much higher
  // leg and arm: widths at the root, the joint and the end. anchor: where the scarf, cape or hair is tied.
  const STYLE = {
    vesper: {
      dark: '#0a0f1e', mid: '#18274a', plate: '#2c4478', hi: '#4a6cae', leg: [5.2, 4, 2.9], arm: [4.1, 3.4, 2.8], stance: 5,
      anchor: [-3, -43.5], tail: { n: 11, seg: 6.5, w0: 5.6, w1: 1, glow: true },
    },
    aster: {
      dark: '#07130d', mid: '#133222', plate: '#21573c', hi: '#35805a', leg: [7.6, 6, 4.8], arm: [6.2, 5.2, 4.4], stance: 7,
      anchor: [-6.5, -41], tail: { n: 7, seg: 7.5, w0: 13, w1: 23, glow: false },
    },
    lune: {
      dark: '#110a1f', mid: '#281b46', plate: '#483474', hi: '#7256aa', leg: [4.5, 3.4, 2.5], arm: [3.4, 2.9, 2.4], stance: 4,
      anchor: [-4.2, -50], tail: { n: 13, seg: 5.2, w0: 4.8, w1: 0.8, glow: true },
    },
    eos: {
      dark: '#1c0811', mid: '#3e1526', plate: '#6c2a44', hi: '#a8496c', leg: [6.4, 5.6, 3.2], arm: [4, 3.4, 2.7], stance: 5.5, lunge: true,
      anchor: [-6, -49.5], tail: { n: 10, seg: 6, w0: 3.2, w1: 0.8, glow: true },
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
  // (v2.5c) Each point now carries its own speed (it is a verlet chain), so the cloth swings on past
  // the body when it stops, whips through a turn and settles, instead of only being dragged along; the
  // first links keep to the line they leave the body on (stiff at the root, loose at the end), and the
  // root is tied to where the neck, shoulders or head were last drawn (drawBody leaves it in P.rig.anc).
  const TAIL_DIR = { vesper: [0.85, 0.5], aster: [0.35, 0.94], lune: [0.7, 0.7], eos: [0.6, 0.8] };
  const ROOT_K = [0, 30, 14, 5]; // how hard the first links keep to their line (per second)
  function updateScarf(dt) {
    const s = P.scarf;
    if (!s.length || !(dt > 0)) return;
    const st = STYLE[H.id], seg = st.tail.seg, heavy = !st.tail.glow, f = P.facing || 1;
    const an = P.rig && P.rig.anc && Math.abs(G.t - P.rig.anc.t) < 0.1 ? P.rig.anc : null;
    const ax = P.x + (an ? an.dx : f * st.anchor[0] * SC), ay = P.y + (an ? an.dy : st.anchor[1] * SC);
    // a jump of the root (a placement, a blink) carries the whole chain with it rather than whipping it
    // (and a new chain is laid out hanging the way it rests, rather than dropped in a heap)
    const fresh = s[s.length - 1].px == null || !isFinite(s[s.length - 1].x) || !isFinite(s[s.length - 1].y);
    if (fresh || Math.abs(ax - s[0].x) > 120 || Math.abs(ay - s[0].y) > 120) {
      const dx = ax - s[0].x, dy = ay - s[0].y, r0 = TAIL_DIR[H.id] || [0.7, 0.7];
      for (let i = 0; i < s.length; i++) {
        const q = s[i];
        if (fresh) { q.x = ax - f * i * seg * r0[0]; q.y = ay + i * seg * r0[1]; } else { q.x += dx; q.y += dy; }
        q.px = q.x; q.py = q.y;
      }
    }
    s[0].x = ax; s[0].y = ay;
    const drag = Math.exp(-(heavy ? 9 : 14) * dt), dt2 = dt * dt; // (the air, still: what holds the cloth back as the body moves through it)
    const gx = -f * (heavy ? 260 : 900), speed = Math.min(1.5, Math.abs(P.vx) / 335);
    // the line the root leaves the body on: the way it rests, swept by the air going past (running, a
    // dash, a fall), so the first links do not fight the rest of the chain into a kink
    const d0 = TAIL_DIR[H.id] || [0.7, 0.7], F0 = heavy ? 1520 : 1100, dr = heavy ? 9 : 14;
    let wx = -f * d0[0] * F0 - G.clamp(P.vx, -1200, 1200) * dr * 0.8, wy = d0[1] * F0 - G.clamp(P.vy, -1500, 1500) * dr * 0.8;
    const wl = Math.hypot(wx, wy) || 1; wx /= wl; wy /= wl;
    const n = s.length;
    for (let i = 1; i < n; i++) {
      const a = s[i - 1], b = s[i], q = i / (n - 1);
      if (b.px == null) { b.px = b.x; b.py = b.y; }
      const vx = (b.x - b.px) * drag, vy = (b.y - b.py) * drag;
      b.px = b.x; b.py = b.y;
      // a ribbon of light always stirs a little; cloth flaps as the air goes past it
      const fl = Math.sin(G.t * 9 + i * 0.9) * (heavy ? 50 + 110 * speed : 170 + 60 * speed) * q;
      b.x += vx + gx * dt2;
      b.y += vy + ((heavy ? 1500 : 620 + 60 * i) + fl) * dt2;
      if (i < ROOT_K.length) {
        // (moved without adding speed, so it steadies the root rather than setting it ringing)
        const k = 1 - Math.exp(-ROOT_K[i] * dt), mx = (a.x + wx * seg - b.x) * k, my = (a.y + wy * seg - b.y) * k;
        b.x += mx; b.y += my; b.px += mx; b.py += my;
      } else {
        // further out, a little stiffness against bending, so a ribbon swings in curves, not in kinks
        const z = s[i - 2], ex = a.x - z.x, ey = a.y - z.y, el = Math.hypot(ex, ey) || 1, k = 1 - Math.exp(-(heavy ? 8 : 10) * dt);
        const mx = (a.x + ex / el * seg - b.x) * k, my = (a.y + ey / el * seg - b.y) * k;
        b.x += mx; b.y += my; b.px += mx; b.py += my;
      }
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d > seg) { b.x = a.x + dx / d * seg; b.y = a.y + dy / d * seg; }
    }
  }

  function drawTail(ctx, h, pts) {
    if (pts.length < 2) return;
    const st = STYLE[h.id], tl = st.tail;
    if (tl.glow) {
      // a ribbon of light: Vesper's scarf, Lune's hair
      ctx.globalCompositeOperation = 'lighter';
      DR.ribbon(ctx, pts, tl.w0 * 2.1, tl.w1 * 2.4); ctx.fillStyle = G.rgba(h.col, 0.2); ctx.fill();
      DR.ribbon(ctx, pts, tl.w0, tl.w1); ctx.fillStyle = G.rgba(h.col, 0.85); ctx.fill();
      DR.ribbon(ctx, pts, tl.w0 * 0.38, tl.w1 * 0.4); ctx.fillStyle = G.rgba(h.hot, 0.9); ctx.fill();
      if (h.id === 'vesper' || h.id === 'eos') {
        // the scarf's second, shorter tail (and the second of Eos's hat ribbons)
        DR.ribbon(ctx, pts.slice(0, 7).map((q, k) => ({ x: q.x, y: q.y + 2 + k * 1.4 })), tl.w0 * 0.7, 0.8);
        ctx.fillStyle = G.rgba(h.col, 0.5); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // a heavy cape: dark cloth, torn at the hem, with a lit edge
      DR.ribbon(ctx, pts, tl.w0, tl.w1, 4);
      ctx.fillStyle = st.dark; ctx.fill();
      ctx.strokeStyle = G.rgba(h.col, 0.5); ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; ctx.stroke();
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

  // ---- the way back to rest. Every attack ends in its own: Vesper lets a first cut swing back to
  // her side, brings a rising cut down behind her, and flicks the light off the blade after a
  // finisher; Aster heaves the maul over the top onto her shoulder (after a smash she has to wrench
  // it out of the ground first); Lune lets the bow drop after a shot and spins it once after the
  // heavy arrow. It is drawing only: any button cuts it short.
  function recoverOf(a) {
    if (H.draw) {
      // Eos: every cut ends with the blade going home. After a draw it is slow, and the click is when the cut lands.
      if (a.kind === 'draw') { const w = C.DRAW_WAIT[a.lvl - 1]; return { kind: 'noto', t: 0, dur: w + 0.14, at: w / (w + 0.14), ang: Math.atan2(a.dy, Math.abs(a.dx)), lvl: a.lvl }; }
      return { kind: 'home', t: 0, dur: 0.2, at: 0.92, from: swingAngle(Object.assign({}, a, { t: a.a1 })), up: a.kind === 'up' };
    }
    if (a.kind === 'shot') return { kind: a.heavy ? 'spin' : 'drop', t: 0, dur: a.heavy ? 0.4 : 0.22, at: 0.05, dx: a.dx, dy: a.dy };
    if (a.thrust) return { kind: 'thrust', t: 0, dur: 0.24, at: 2 };
    if (a.kind !== 'side') return null;
    if (H.weapon === 'maul') return a.heavy ? { kind: 'smash', t: 0, dur: 0.5, at: 0.3 } : { kind: 'sweep', t: 0, dur: 0.34, at: 0.8 };
    if (a.heavy) return { kind: 'fin', t: 0, dur: 0.4, at: 0.2 };
    return a.idx === 1 ? { kind: 'cut2', t: 0, dur: 0.28, at: 2 } : { kind: 'cut1', t: 0, dur: 0.24, at: 2 };
  }
  function recoverFx(r) {
    const f = P.facing;
    if (r.kind === 'fin') {
      // the flick: light thrown off the blade
      const x = P.x + f * 50, y = P.y - 22;
      G.audio.play('glint');
      G.fx.glint(x, y, 22, HOT, 0.2);
      G.fx.burst(x, y, { n: 7, color: STAR, kind: 'spark', angle: f > 0 ? 0.5 : Math.PI - 0.5, spread: 0.7, speed: [160, 460], life: [0.12, 0.3], size: [1.4, 2.4], grav: 600 });
    } else if (r.kind === 'smash') {
      // wrenched out of the ground
      G.audio.play('tink');
      G.fx.burst(P.x + f * 52, P.y - 4, { n: 5, color: '22,18,32', speed: [80, 300], angle: -Math.PI / 2, spread: 1.6, life: [0.4, 0.8], size: [3, 7], kind: 'chunk', grav: 1400 });
      if (P.onGround) G.fx.dust(P.x + f * 50, P.y, 3, { speed: [20, 110], size: [5, 9], up: 40 });
    } else if (r.kind === 'sweep') {
      // it lands on her shoulder
      if (P.onGround) { P.squash = Math.min(P.squash, -0.07); G.audio.play('stepHeavy'); }
    } else if (r.kind === 'spin') G.audio.play('whoosh');
    else if (r.kind === 'home') G.audio.play('sheath', { soft: true });
    else if (r.kind === 'noto') G.fx.glint(mouthX(), mouthY(), 14, HOT, 0.16);
  }
  // rest: where the weapon would be held if nothing had just happened
  function recoverPose(h, r, SH, rest) {
    const u = G.clamp(r.t / r.dur, 0, 1), sm = (x) => { x = G.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
    const home = sm((u - 0.45) / 0.55); // how far the hands have gone back to where they rest
    const toRest = (from, k) => from + G.angDiff(from, rest.ang) * k;
    if (h.weapon === 'sword') {
      let ang, len = 36;
      if (r.kind === 'cut1') ang = u < 0.25 ? G.lerp(1.3, 0.95, sm(u / 0.25)) : toRest(0.95, sm((u - 0.25) / 0.75));
      else if (r.kind === 'cut2') ang = u < 0.22 ? G.lerp(-1.6, -1.95, sm(u / 0.22)) : toRest(-1.95, sm((u - 0.22) / 0.78));
      else if (r.kind === 'fin') { ang = u < 0.2 ? G.lerp(1.5, 0.62, sm(u / 0.2)) : u < 0.5 ? 0.62 : toRest(0.62, sm((u - 0.5) / 0.5)); len = G.lerp(40, 36, u); }
      else ang = u < 0.3 ? -0.05 : toRest(-0.05, sm((u - 0.3) / 0.7));
      const fx = G.lerp(1 + Math.cos(ang) * 11, rest.fx, home), fy = G.lerp(SH + Math.sin(ang) * 11, rest.fy, home);
      return { fx, fy, bx: G.lerp(-4, rest.bx, home), by: G.lerp(-27, rest.by, home), ang, len };
    }
    if (h.weapon === 'maul') {
      // over the top: down in front, up, and back onto the shoulder, running a little past it and settling
      const start = r.kind === 'smash' ? 1.5 : 1.3, hold = r.kind === 'smash' ? 0.3 : 0.08;
      let ang = start;
      if (u > hold) {
        const q = (u - hold) / (1 - hold);
        ang = q < 0.75 ? G.lerp(start, -2.66, sm(q / 0.75)) : G.lerp(-2.66, -2.42, sm((q - 0.75) / 0.25));
      }
      const fx = G.lerp(1 + Math.cos(ang) * 10.5, rest.fx, home), fy = G.lerp(SH + Math.sin(ang) * 10.5, rest.fy, home);
      return { fx, fy, bx: fx - Math.cos(ang) * 7.5, by: fy - Math.sin(ang) * 7.5, ang, len: 34, behind: ang < -1.7 };
    }
    // bow
    const aimA = Math.atan2(r.dy, Math.max(0.001, Math.abs(r.dx)));
    let ang;
    if (r.kind === 'spin') ang = G.lerp(aimA, rest.ang + G.TAU, sm(u));           // once round on its way down
    else ang = u < 0.4 ? G.lerp(aimA, aimA + 0.5, sm(u / 0.4)) : toRest(aimA + 0.5, sm((u - 0.4) / 0.6));
    const c = Math.cos(aimA), sn = Math.sin(aimA);
    const fx = G.lerp(0.5 + c * 12.5, rest.fx, home), fy = G.lerp(SH + sn * 12.5, rest.fy, home);
    return { fx, fy, bx: G.lerp(fx - c * 5, rest.bx, home), by: G.lerp(fy - sn * 5, rest.by, home), ang, pull: 0, len: 0, twang: r.kind === 'drop' ? 1 - u : 0 };
  }

  // Angle of a melee weapon through its swing: w0 (where the wind-up starts) to a0 (where the cut
  // starts) to a1 (where it ends). A chain goes down, then up, then down: the first cut is lifted
  // overhead and falls; the second rides that weight back up from where the first ended; the
  // finisher is drawn further back from the top of the second and comes down hardest.
  // The wind-up is there to be seen: the blade is carried to the top before anything falls.
  function swingAngle(a) {
    let w0 = -3.4, a0 = -1.9, a1 = 1.3;
    if (a.thrust) { w0 = a0 = a1 = -0.05; }
    else if (a.kind === 'up') { if (a.heavy) { w0 = 0.9; a0 = 0.5; a1 = -2.9; } else { w0 = -3.5; a0 = -2.9; a1 = -0.5; } }
    else if (a.kind === 'down') { w0 = -0.4; a0 = 0.2; a1 = 2.7; }
    else if (a.heavy) { w0 = -1.7; a0 = -2.7; a1 = 1.5; }
    else if (a.idx === 1) { w0 = 1.95; a0 = 1.5; a1 = -1.6; }
    // Eos's string: the first cut starts in the sheath behind her and rises; the second falls back
    // across from where that one ended; the finisher is drawn low behind her and sweeps up and over
    if (a.flick && a.kind === 'side') {
      if (a.heavy) { w0 = 2.9; a0 = 2.3; a1 = -2.1; }
      else if (a.idx === 1) { w0 = -1.5; a0 = -1.25; a1 = 1.15; }
      else { w0 = 2.6; a0 = 1.6; a1 = -1.0; }
    } else if (a.flick && a.kind === 'up') {
      if (a.heavy) { w0 = 2.8; a0 = 1.3; a1 = -3.1; }
      else if (a.idx === 1) { w0 = -2.5; a0 = -2.3; a1 = 0.2; }
      else { w0 = 2.6; a0 = 0.8; a1 = -2.2; }
    }
    if (a.t < a.a0) return G.lerp(w0, a0, G.ease.outCubic(G.clamp(a.t / a.a0, 0, 1))) + (a.heavy ? G.rand(-0.06, 0.06) : 0);
    // the cut itself, inside the active window. A blade that is falling gathers speed and then is
    // caught; one that is rising leaves fast and slows as it climbs. Gravity decides which.
    const u = G.clamp((a.t - a.a0) / Math.max(0.01, a.a1 - a.a0), 0, 1);
    const falling = Math.sin(a1) > Math.sin(a0);
    return G.lerp(a0, a1, falling ? u * u * (3 - 2 * u) : 1 - (1 - u) * (1 - u));
  }

  // Where the feet go: [front foot, back foot].
  function footTargets(s, st) {
    if (s.dash) return [[-12, -7], [-5, -2]];
    // Eos thrown along her cut, or holding where it left her: a long, low lunge
    if (st.lunge && s.onGround && ((s.atk && s.atk.kind === 'draw') || (s.recov && s.recov.kind === 'noto' && s.recov.t < s.recov.dur * s.recov.at && Math.abs(s.vx) <= 40))) return [[11.5, 0], [-11, 0]];
    if (!s.onGround) return s.vy < 0 ? [[5.5, -9], [-7.5, -3]] : [[4.5, -3], [-6.5, -7]];
    if (Math.abs(s.vx) > 40) {
      const p = s.runT;
      return [[Math.sin(p) * 10.5, -Math.max(0, Math.cos(p)) * 7], [Math.sin(p + Math.PI) * 10.5, -Math.max(0, Math.cos(p + Math.PI)) * 7]];
    }
    if (st.lunge && s.hold && s.focus > 0.12) return [[9.5, 0], [-8.5, 0]]; // set in her stance
    // a swing on the ground: the front foot steps in under it as it comes down
    if (s.atk && s.atk.kind !== 'shot' && s.atk.t >= s.atk.a0 * 0.6) { const w = s.atk.heavy ? 5.5 : 3.5; return [[st.stance + w, 0], [-st.stance - 1, 0]]; }
    return [[st.stance, 0], [-st.stance, 0]];
  }

  // Where the hands and weapon are: front hand (fx, fy), back hand (bx, by), weapon angle and length.
  function weaponPose(h, s, breath) {
    const a = s.atk, air = !s.onGround, run = !air && Math.abs(s.vx) > 40;
    const sw = Math.sin(s.runT + Math.PI);
    const SH = -35; // shoulder height
    if (h.weapon === 'blade') return bladePose(h, s, breath);
    if (s.flT > 0) {
      // flourish: the weapon goes round once and is held high
      const k = G.clamp(s.flT / 0.3, 0, 1), spin = (1 - k) * (1 - k) * G.TAU, ang = -1.42 - spin;
      const fx = 3 + Math.cos(ang) * 6, fy = SH - 6 + Math.sin(ang) * 6;
      if (h.weapon === 'sword') return { fx, fy, bx: -5, by: -24, ang, len: 38 };
      if (h.weapon === 'maul') return { fx, fy, bx: fx - Math.cos(ang) * 7.5, by: fy - Math.sin(ang) * 7.5, ang, len: 34 };
      return { fx: 5, fy: SH - 14 * k, bx: -5, by: -22, ang: -1.25 * k, pull: 0, len: 0 };
    }
    if (s.cast && !a) { const p = castPose(h, s.cast, SH); if (p) return p; }
    if (s.stun > 0 && !a) {
      // knocked back: arms flung out, the weapon thrown wide
      if (h.weapon === 'sword') return { fx: 9, fy: SH - 6, bx: -10, by: SH + 1, ang: -2.3, len: 36 };
      if (h.weapon === 'maul') return { fx: 3, fy: SH - 4, bx: -3, by: SH - 1, ang: -2.75, len: 34, behind: true };
      return { fx: 10, fy: SH - 7, bx: -9, by: SH + 1, ang: -0.9, pull: 0, len: 0 };
    }
    if (s.healT > 0 && !a) {
      // mending: the hands come together at the chest and the weapon is lowered
      const k = G.clamp(s.healT / 0.12, 0, 1), q = Math.sin(G.t * 9) * 0.4;
      if (h.weapon === 'sword') return { fx: 5, fy: -27 + q, bx: 2.5, by: -28.5 + q, ang: G.lerp(2.55, 1.62, k), len: 36 };
      if (h.weapon === 'maul') return { fx: 6, fy: -26 + q, bx: 3, by: -29 + q, ang: G.lerp(-2.42, 1.42, k), len: 34 };
      return { fx: 6.5, fy: -26 + q, bx: 3, by: -28.5 + q, ang: G.lerp(0.16, 1.25, k), pull: 0, len: 0 };
    }
    if (s.recov && !a && !s.dash && !s.plunge) {
      const rest = weaponPose(h, Object.assign({}, s, { recov: null }), breath);
      return recoverPose(h, s.recov, SH, rest);
    }
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
      let ang = -2.42, fx = 5.5, fy = -27.5 + (run ? sw * 0.8 : breath * 0.3);
      if (a && a.kind !== 'shot') { ang = swingAngle(a); fx = 1 + Math.cos(ang) * 10.5; fy = SH + Math.sin(ang) * 10.5; }
      else if (s.dash) { ang = Math.PI - 0.35; fx = -2; fy = -29; }
      else if (s.plunge) { ang = -1.75; fx = 2 + Math.cos(ang) * 10.5; fy = SH - 4 + Math.sin(ang) * 10.5; return { fx, fy, bx: fx - Math.cos(ang) * 7.5, by: fy - Math.sin(ang) * 7.5, ang, len: 34 }; }
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
    return { fx: 12.5 + (run ? sw * 2 : 0), fy: -27.5 + breath * 0.3, bx: -3.5 + (run ? -sw * 3 : 0), by: -25.5, ang: 0.16, pull: 0, len: 0 };
  }


  // ---- Eos: the sheath at her hip and the blade in it. Her pose carries more than the others':
  // the sheath (its mouth sx, sy and the way it points, sang), the sword's own place (hx, hy: where
  // grip meets guard), its angle, and how much blade shows (vis). Her hand sits on the grip, a
  // little behind the guard.
  const KAT = 36;                        // blade length
  const MOUTH = [4, -21], SANG = 2.72;   // the sheath at rest: its mouth at her belt, pointing back and a little down
  const smooth = (x) => { x = G.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  // the sword home in its sheath (o.out: how far the guard has been thumbed clear of the mouth)
  function sheathed(sx, sy, sang, o) {
    const c = -Math.cos(sang), s = -Math.sin(sang), out = (o && o.out) || 0;
    const hx = sx + c * (1.6 + out), hy = sy + s * (1.6 + out);
    return Object.assign({ sx, sy, sang, hx, hy, ang: sang, vis: out, len: KAT, tip: false, fx: hx + c * 4, fy: hy + s * 4, bx: sx - c * 2.5 - 1.5, by: sy - s * 2.5 + 0.5 }, o);
  }
  // the blade in her hand; sc is the sheath to go with it: [sx, sy, sang]
  function freeBlade(fx, fy, ang, sc, o) {
    return Object.assign({
      fx, fy, hx: fx + Math.cos(ang) * 4, hy: fy + Math.sin(ang) * 4, ang, vis: KAT, len: KAT, tip: true, free: true,
      sx: sc[0], sy: sc[1], sang: sc[2], bx: sc[0] + Math.cos(sc[2]) * 2.5 - 1.5, by: sc[1] + Math.sin(sc[2]) * 2.5 + 0.5,
    }, o);
  }
  // The blade on its way into the sheath, q from 0 to 1. First it swings round (sense +1: it falls
  // forward and under; -1: back over the top) until it points down the sheath, which is drawn back
  // and tipped up to meet it; then it slides home. Blade that is already inside is not drawn.
  function homing(q, from, sense, sc, SH, rad) {
    const sx = sc[0], sy = sc[1], sang = sc[2];
    const mx = sx - 6, my = sy + 1.5, tilt = 2.5;         // the sheath, drawn back to meet the point
    const c = -Math.cos(tilt), sn = -Math.sin(tilt);
    const s1x = mx + c * 26, s1y = my + sn * 26;          // where her hand is when the point finds the mouth
    if (q < 0.55) {
      const k = smooth(q / 0.55);
      let d = (tilt - from) % G.TAU;
      if (sense > 0 && d < 0) d += G.TAU;
      if (sense < 0 && d > 0) d -= G.TAU;
      const ang = from + d * (sense > 0 ? k * k * (1.6 - 0.6 * k) : k); // falling, it gathers speed and is caught
      const fx = G.lerp(2 + Math.cos(from) * rad, s1x, k), fy = G.lerp(SH + 2 + Math.sin(from) * rad, s1y, k) + Math.sin(k * Math.PI) * 2.5 * sense;
      return freeBlade(fx, fy, ang, [G.lerp(sx - 5, mx, k), G.lerp(sy + 1, my, k), G.lerp(3.05, tilt, k)], { vis: G.lerp(KAT, 20.2, k * k * k) });
    }
    const k = smooth((q - 0.55) / 0.45), R = sheathed(sx, sy, sang, {});
    const m2x = G.lerp(mx, sx, k), m2y = G.lerp(my, sy, k), fx = G.lerp(s1x, R.fx, k), fy = G.lerp(s1y, R.fy, k);
    const ang = Math.atan2(m2y - fy, m2x - fx);
    return freeBlade(fx, fy, ang, [m2x, m2y, G.lerp(tilt, sang, k)], { vis: Math.max(0, Math.hypot(m2x - fx, m2y - fy) - 5.8), tip: false });
  }
  // Her ways back to rest: a flick's blade falls back the way it came and finds the mouth; after a
  // draw she holds the line of the cut, lets the blade fall, and feeds it home. The click is at r.at.
  function bladeRecover(r, sc, SH) {
    const u = G.clamp(r.t / r.dur, 0, 1);
    if (r.kind === 'home') return homing(u, r.from, r.up ? -1 : 1, sc, SH, 11.5);
    const hold = r.at * 0.42, th = r.ang;
    if (u < hold) {
      const k = smooth(u / hold), ang = th - 0.3 + 0.12 * k;
      return freeBlade(2 + Math.cos(ang) * 13, SH + 2 + Math.sin(ang) * 13, ang, [sc[0] - 5, sc[1] + 1, 3.05], { vis: KAT + 4 * (1 - k) });
    }
    if (u < r.at) return homing((u - hold) / (r.at - hold), th - 0.18, 1, sc, SH, 13);
    // home: her hand leaves the grip and comes to rest on the pommel
    const k = smooth((u - r.at) / (1 - r.at)), W = sheathed(sc[0], sc[1], sc[2], {}), c = -Math.cos(sc[2]), sn = -Math.sin(sc[2]);
    W.fx = G.lerp(W.fx, W.hx + c * 8.7, k); W.fy = G.lerp(W.fy, W.hy + sn * 8.7 - 1, k);
    return W;
  }
  // The Dawn Arc: a hand to the grip, the blade out and across in one motion, and home again.
  function arcPose(c, sc, SH) {
    const th = Math.atan2(c.dy, Math.abs(c.dx));
    if (!c.thrown) return sheathed(sc[0] + 2, sc[1] + 0.5, 3.04, { out: 2 });
    const t = c.t - c.wind;
    if (t < 0.16) {
      const u = G.ease.outCubic(G.clamp(t / 0.07, 0, 1)), ang = G.lerp(th + 2.2, th - 0.75, u);
      return freeBlade(2 + Math.cos(ang) * 13, SH + 2 + Math.sin(ang) * 13, ang, [sc[0] - 5, sc[1] + 1, 3.05], { vis: KAT + 4 * (1 - u) });
    }
    return homing(G.clamp((t - 0.16) / Math.max(0.01, c.dur - c.wind - 0.16), 0, 1), th - 0.75, 1, sc, SH, 13);
  }
  function bladePose(h, s, breath) {
    const a = s.atk, air = !s.onGround, run = !air && Math.abs(s.vx) > 40, sw = Math.sin(s.runT + Math.PI), SH = -35;
    // the sheath hangs at her hip: it swings as she runs, tips as she rises and falls, streams back in a dash
    const sx = MOUTH[0], sy = MOUTH[1] + (run ? Math.abs(sw) * 0.5 : breath * 0.25);
    const sang = s.dash ? 3.02 : air ? (s.vy < 0 ? 2.6 : 2.95) : run ? SANG + sw * 0.07 : SANG;
    const sc = [sx, sy, sang];
    if (s.flT > 0) {
      // flourish: the blade is drawn, goes round once and is held up
      const k = G.clamp(s.flT / 0.3, 0, 1), spin = (1 - k) * (1 - k) * G.TAU, ang = -1.42 - spin;
      return freeBlade(3 + Math.cos(ang) * 6, SH - 6 + Math.sin(ang) * 6, ang, sc);
    }
    if (s.cast && !a && s.cast.kind === 'arc') return arcPose(s.cast, sc, SH);
    if (s.cast && !a && s.cast.kind === 'guard') {
      // Still Point: the sheath brought up across his body, nearly upright, the guard thumbed clear.
      // A blow that lands knocks it back a hand's breadth; with none, it is lowered again.
      const c = s.cast, up = [sx + 4, sy - 10, 1.95];
      if (!c.thrown) { const k = smooth(c.t / 0.07); return sheathed(G.lerp(sx, up[0], k), G.lerp(sy, up[1], k), G.lerp(sang, up[2], k), { out: 3 * k }); }
      const k = smooth((c.t - c.wind) / Math.max(0.01, c.dur - c.wind));
      if (c.hit) return sheathed(up[0] - 5 * (1 - k), up[1] + 2 * (1 - k) + 6 * k, G.lerp(1.95 + 0.45 * (1 - k), sang, k * k), { out: 3 + 6 * (1 - k) });
      return sheathed(G.lerp(up[0], sx, k), G.lerp(up[1], sy, k), G.lerp(up[2], sang, k), { out: 3 * (1 - k) });
    }
    if (s.stun > 0 && !a) return sheathed(sx - 1, sy, 2.35, { fx: 9, fy: SH - 6, bx: -10, by: SH + 1 });
    if (s.healT > 0 && !a) { const q = Math.sin(G.t * 9) * 0.4; return sheathed(sx, sy, sang, { fx: 5, fy: -27 + q, bx: 2.5, by: -28.5 + q }); }
    if (s.recov && !a && !s.dash) return bladeRecover(s.recov, sc, SH);
    if (a && a.kind === 'draw') {
      // the draw itself: the blade leaves the sheath behind her and is carried round to lie along the cut
      const th = Math.atan2(a.dy, Math.abs(a.dx)), u = G.ease.outCubic(G.clamp(a.t / Math.max(0.01, a.a1), 0, 1));
      const ang = G.lerp(th + 2.3, th - 0.3, u);
      return freeBlade(2 + Math.cos(ang) * 13, SH + 2 + Math.sin(ang) * 13, ang, [sx - 5, sy + 1, 3.05], { vis: G.lerp(KAT * 0.4, KAT + 4, u) });
    }
    if (a) {
      const ang = swingAngle(a), k = G.clamp(a.t / Math.max(0.01, a.a0), 0, 1);
      return freeBlade(1.5 + Math.cos(ang) * 11.5, SH + 1 + Math.sin(ang) * 11.5, ang, [sx - 3, sy + 0.5, 2.95], { vis: a.idx > 0 ? KAT : KAT * (0.45 + 0.55 * k) });
    }
    if (s.hold && s.focus > 0.12) {
      // the stance: sheath drawn forward and levelled, hand closed on the grip, the guard thumbed clear
      // of the mouth so a sliver of the blade shows. With all three marks lit it trembles.
      const m = focusMark(s.focus), q = m >= 3 ? Math.sin(G.t * 34) * 0.22 : 0;
      return sheathed(sx + 2.5, sy + 0.5 + q, 3.04, { out: m ? 1.2 + 0.7 * m : 0 });
    }
    const W = sheathed(sx, sy, sang, {});
    if (s.dash) return W;
    if (air) { W.fx = W.hx + 3; W.fy = W.hy - 3.5; }          // a hand on the grip in the air
    else if (run) { W.fx = 2 + sw * 4; W.fy = -22.5; }        // her sword arm swings free as she runs; the other steadies the sheath
    else { const c = -Math.cos(sang), sn = -Math.sin(sang); W.fx = W.hx + c * 8.7; W.fy = W.hy + sn * 8.7 - 1 + breath * 0.3; } // at rest, a wrist laid on the pommel
    return W;
  }

  // The body motion of a special (P.cast). Vesper: the free arm cocks back behind the head with the
  // lance, then whips through along the aim and follows through. Lune: the bow pushed out along the
  // aim, the string hand snapped back past the ear. Aster: the maul brought down from overhead into
  // the floor (the overhead hold itself is the plunge, see the maul pose).
  function castPose(h, c, SH) {
    if (c.kind === 'lance') {
      const ang = Math.atan2(c.dy, Math.abs(c.dx)), co = Math.cos(ang), sn = Math.sin(ang);
      const cockX = -10 - co * 2, cockY = SH - 7 - sn * 2; // behind and above the head
      const outX = 1 + co * 15, outY = SH + sn * 15;       // thrown through, along the aim
      let bx, by;
      if (!c.thrown) {
        const k = G.ease.outCubic(G.clamp(c.t / c.wind, 0, 1));
        bx = G.lerp(6, cockX, k); by = G.lerp(-24, cockY, k);
      } else {
        const u = G.ease.outCubic(G.clamp((c.t - c.wind) / 0.06, 0, 1));
        // the hand travels a slight arc over the shoulder on its way through
        bx = G.lerp(cockX, outX, u); by = G.lerp(cockY, outY, u) - Math.sin(u * Math.PI) * 4;
      }
      // the near arm throws, so the sword passes to the far hand for a moment and trails behind
      return { fx: -6, fy: -25, ang: 2.5, len: 36, bx, by, swap: true, behind: true, javelin: !c.thrown, jang: ang };
    }
    if (c.kind === 'draw') {
      // Moonfall: the bow held out along the aim and drawn as far as c.pull says
      const ang = Math.atan2(c.dy, Math.abs(c.dx)), co = Math.cos(ang), sn = Math.sin(ang);
      const fx = 0.5 + co * 13.5, fy = SH + sn * 13.5, pull = c.pull || 0;
      return { fx, fy, bx: fx - co * (5 + 9 * pull), by: fy - sn * (5 + 9 * pull), ang, pull, len: 0, twang: c.twang || 0 };
    }
    if (c.kind === 'volley') {
      const ang = Math.atan2(c.dy, Math.abs(c.dx)), co = Math.cos(ang), sn = Math.sin(ang);
      const k = G.clamp(c.t / 0.08, 0, 1), fx = 0.5 + co * 13.5, fy = SH + sn * 13.5;
      return { fx, fy, bx: G.lerp(fx - co * 13, -7, k), by: G.lerp(fy - sn * 13, SH - 4, k), ang, pull: 0, len: 0, twang: 1 - G.clamp(c.t / 0.25, 0, 1) };
    }
    if (c.kind === 'slam' && h.weapon === 'maul') {
      const k = G.ease.outCubic(G.clamp(c.t / 0.07, 0, 1)), ang = G.lerp(-1.75, 1.2, k);
      const fx = 2 + Math.cos(ang) * 10.5, fy = SH + 3 + Math.sin(ang) * 10.5;
      return { fx, fy, bx: fx - Math.cos(ang) * 7.5, by: fy - Math.sin(ang) * 7.5, ang, len: 34 };
    }
    return null;
  }

  // A lance of light held in Vesper's free hand while she winds up the throw.
  function drawJavelin(ctx, W, h, t) {
    const k = G.clamp(t / 0.09, 0, 1), len = 16 + 22 * k;
    ctx.save();
    ctx.translate(W.bx, W.by); ctx.rotate(W.jang);
    ctx.globalCompositeOperation = 'lighter';
    glowAt(ctx, STAR, 4, 0, 26, 0.5 + 0.4 * k);
    ctx.lineCap = 'round';
    ctx.strokeStyle = G.rgba(STAR, 0.45); ctx.lineWidth = 6; line(ctx, -len * 0.45, 0, len * 0.55, 0);
    ctx.strokeStyle = G.rgba(h.hot, 1); ctx.lineWidth = 2; line(ctx, -len * 0.45, 0, len * 0.55, 0);
    ctx.fillStyle = G.rgba(h.hot, 1); poly(ctx, [len * 0.55 - 2, -3, len * 0.55 + 7, 0, len * 0.55 - 2, 3]); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ---- weapons, drawn at the front hand
  function drawSword(ctx, W, h, gold) {
    ctx.save();
    ctx.translate(W.fx, W.fy); ctx.rotate(W.ang);
    const len = W.len + 3, c = gold ? GOLD : h.col;
    glowAt(ctx, c, len * 0.55, 0, len * 0.66, 0.55);
    ctx.fillStyle = '#060a14'; ctx.fillRect(-6.5, -1.2, 8, 2.4); // grip
    ctx.fillStyle = G.rgba(c, 1); poly(ctx, [-9.4, 0, -7.4, -1.8, -5.6, 0, -7.4, 1.8]); ctx.fill(); // pommel
    // a long, narrow blade
    ctx.fillStyle = G.rgba(gold ? GOLD : h.hot, 1);
    poly(ctx, [2, -2.3, len - 10, -1.6, len, 0, len - 10, 1.6, 2, 2.3]); ctx.fill();
    ctx.strokeStyle = G.rgba(c, 0.95); ctx.lineWidth = 0.8; line(ctx, 3.5, 0, len - 9, 0);
    // swept crossguard
    ctx.fillStyle = G.rgba(c, 1);
    poly(ctx, [0.4, -1.4, 2.6, -1.4, 4.4, -6.4, 2.2, -5.2]); ctx.fill();
    poly(ctx, [0.4, 1.4, 2.6, 1.4, 4.4, 6.4, 2.2, 5.2]); ctx.fill();
    ctx.restore();
  }

  function drawMaul(ctx, W, h, st, gold) {
    ctx.save();
    ctx.translate(W.fx, W.fy); ctx.rotate(W.ang);
    const L = W.len, c = gold ? GOLD : h.col;
    // banded haft
    ctx.strokeStyle = '#050c08'; ctx.lineWidth = 4.4; line(ctx, -16, 0, L - 6, 0);
    ctx.strokeStyle = st.plate; ctx.lineWidth = 2.4; line(ctx, -16, 0, L - 6, 0);
    ctx.strokeStyle = G.rgba(h.col, 0.8); ctx.lineWidth = 1;
    for (const bx of [-9, 2, 13]) line(ctx, bx, -2, bx, 2);
    ctx.fillStyle = G.rgba(h.col, 0.95); poly(ctx, [-19.5, 0, -17, -2.4, -14.5, 0, -17, 2.4]); ctx.fill();
    glowAt(ctx, c, L + 2, 0, 24, 0.5);
    // the head: a great block, spiked on both faces, with a burning core
    ctx.fillStyle = st.mid;
    poly(ctx, [L - 7, -12.5, L + 8, -12.5, L + 10, -9, L + 10, 9, L + 8, 12.5, L - 7, 12.5, L - 9, 9, L - 9, -9]); ctx.fill();
    ctx.strokeStyle = G.rgba(c, 1); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = st.dark;
    ctx.fillRect(L - 9, -14.4, 19, 3.2); ctx.fillRect(L - 9, 11.2, 19, 3.2);
    ctx.fillStyle = st.plate;
    poly(ctx, [L - 3, -14.4, L + 0.5, -19.5, L + 4, -14.4]); ctx.fill();
    poly(ctx, [L - 3, 14.4, L + 0.5, 19.5, L + 4, 14.4]); ctx.fill();
    ctx.fillStyle = G.rgba(gold ? GOLD : h.hot, 0.98);
    poly(ctx, [L + 0.5, -8, L + 4.4, 0, L + 0.5, 8, L - 3.4, 0]); ctx.fill();
    ctx.fillStyle = G.rgba(c, 1);
    poly(ctx, [L + 10, -4, L + 15.5, 0, L + 10, 4]); ctx.fill();
    ctx.restore();
  }

  function drawBow(ctx, W, h, a, gold) {
    ctx.save();
    ctx.translate(W.fx, W.fy); ctx.rotate(W.ang);
    const c = gold ? GOLD : h.col;
    glowAt(ctx, c, 0, 0, gold ? 28 : 20, gold ? 0.7 : 0.35);
    // a tall recurve: dark limbs with a lit edge, hooked at the tips
    for (const sgn of [-1, 1]) {
      ctx.strokeStyle = '#150d26'; ctx.lineWidth = 3.6;
      ctx.beginPath(); ctx.moveTo(1.6, 0); ctx.quadraticCurveTo(3.4, sgn * 9, -1.2, sgn * 15.5); ctx.quadraticCurveTo(-4, sgn * 18.5, -7.4, sgn * 18); ctx.stroke();
      ctx.strokeStyle = G.rgba(c, 1); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(2.6, sgn * 1); ctx.quadraticCurveTo(4.4, sgn * 9, -0.4, sgn * 15.2); ctx.quadraticCurveTo(-3.6, sgn * 19.6, -7.6, sgn * 18.4); ctx.stroke();
    }
    ctx.fillStyle = G.rgba(h.hot, 1); poly(ctx, [0, -2.8, 3.6, 0, 0, 2.8, -1.4, 0]); ctx.fill(); // grip
    // string, pulled back to the other hand
    const nx = -5.2 - 8 * W.pull + (W.twang ? Math.sin(G.t * 90) * 2.2 * W.twang : 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(h.hot, 0.8); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-7.4, -18); ctx.lineTo(nx, 0); ctx.lineTo(-7.4, 18); ctx.stroke();
    if (a && !a.swung) {
      // the arrow on the string
      ctx.strokeStyle = G.rgba(a.heavy ? GOLD : h.hot, 1); ctx.lineWidth = a.heavy ? 2.4 : 1.6;
      line(ctx, nx, 0, nx + 26, 0);
      ctx.fillStyle = ctx.strokeStyle; poly(ctx, [nx + 25, -2.6, nx + 32, 0, nx + 25, 2.6]); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }


  // Eos's sheath: lacquer with the blade's own slight curve, and three bands that Focus lights one at a time.
  function drawScabbard(ctx, W, h, st, marks) {
    ctx.save();
    ctx.translate(W.sx, W.sy); ctx.rotate(W.sang);
    const L = KAT + 3, lit = marks >= 3 ? GOLD : h.hot;
    ctx.fillStyle = '#16070d';
    ctx.beginPath();
    ctx.moveTo(-0.6, -2.1); ctx.quadraticCurveTo(L * 0.6, -2.3, L, -3.1);
    ctx.lineTo(L + 1.2, -1.2); ctx.quadraticCurveTo(L * 0.6, 1.7, -0.6, 2.1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(h.col, 0.55); ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = st.hi; ctx.fillRect(-0.8, -2.5, 2.6, 5);                                   // the collar at its mouth
    ctx.fillStyle = G.rgba(h.col, 0.95); poly(ctx, [L - 2.4, -3.3, L + 1.7, -2.4, L + 0.3, -0.7, L - 2.8, -0.5]); ctx.fill(); // end cap
    for (let i = 0; i < 3; i++) {
      const bx = 9.5 + i * 7.5, by = -2.3 - 0.2 * i, on = marks > i;
      ctx.fillStyle = on ? G.rgba(lit, 1) : G.rgba(h.col, 0.16);
      ctx.fillRect(bx, by, 1.8, 4.2);
      if (on) glowAt(ctx, marks >= 3 ? GOLD : h.col, bx + 0.9, 0, 8, 0.95);
    }
    ctx.restore();
  }

  // Her sword: a wrapped grip, a small round guard seen edge on, and a long single edge with a little
  // curve to it. Only as much blade as W.vis says is drawn (the rest is in the sheath).
  function drawKatana(ctx, W, h, gold) {
    ctx.save();
    ctx.translate(W.hx, W.hy); ctx.rotate(W.ang);
    const c = gold ? GOLD : h.col, len = W.vis;
    ctx.fillStyle = '#0d0508'; ctx.fillRect(-9.6, -1.3, 9.8, 2.6);
    ctx.strokeStyle = G.rgba(h.col, 0.75); ctx.lineWidth = 0.6;
    for (const gx of [-8, -5.8, -3.6, -1.4]) line(ctx, gx, -1.3, gx + 1.3, 1.3);
    ctx.fillStyle = G.rgba(c, 1); ctx.fillRect(-10.8, -1.6, 1.5, 3.2);
    if (len > 0.4) {
      const e = 1.8 + len, b = len * 0.045;
      glowAt(ctx, c, 2 + len * 0.55, 0, Math.max(5, len * 0.66), 0.55);
      ctx.fillStyle = G.rgba(gold ? GOLD : h.hot, 1);
      ctx.beginPath();
      ctx.moveTo(1.8, -1.5);
      if (W.tip && len > 8) {
        ctx.quadraticCurveTo(1.8 + len * 0.6, -1.5 - b * 0.2, e, -1.2 - b);   // the back, lifting towards the point
        ctx.lineTo(e - 3, 1.2 - b * 0.8);                                      // the slanted point
        ctx.quadraticCurveTo(1.8 + len * 0.55, 1.5 - b * 0.1, 1.8, 1.5);       // the edge
      } else { ctx.lineTo(e, -1.5); ctx.lineTo(e, 1.5); ctx.lineTo(1.8, 1.5); }
      ctx.closePath(); ctx.fill();
      if (len > 8) { ctx.strokeStyle = G.rgba(c, 0.9); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(3.2, -0.3); ctx.quadraticCurveTo(1.8 + len * 0.6, -0.4 - b * 0.15, e - 4, -0.3 - b * 0.7); ctx.stroke(); }
    }
    ctx.fillStyle = G.rgba(c, 1); ctx.fillRect(0.2, -3.4, 1.6, 6.8); // guard
    ctx.restore();
  }

  // ---- bodies. Each draws what hangs behind, its torso and its head; limbs are shared.
  const SHY = -39; // shoulder height
  function eyes(ctx, h, x, y, s) {
    glowAt(ctx, h.col, x + 2.6 * s, y, 8 * s, 1);
    ctx.fillStyle = G.rgba(h.hot, 1);
    poly(ctx, [x, y - 1.3 * s, x + 2.9 * s, y, x + 0.3 * s, y + 0.9 * s]); ctx.fill();
    poly(ctx, [x + 3.9 * s, y - 0.2 * s, x + 6 * s, y - 1.5 * s, x + 5.7 * s, y + 0.7 * s]); ctx.fill();
  }

  // (v2.5c) sw: the cloth's sway at three depths, each on its own spring and each following the one
  // above it (a: at the waist, b: lower, c: at the hem), so a hem swings later and further than a waist
  function backVesper(ctx, h, st, sw, hip) {
    // a short cloak, torn at the hem
    ctx.fillStyle = st.dark;
    poly(ctx, [-5, SHY - 1, 3.4, SHY, 2.4, hip + 1, -2.4 - sw.c, hip + 13, -6.2 - sw.b, hip + 8, -9.6 - sw.c * 1.3, hip + 15.5, -12 - sw.b * 1.4, hip + 6.5, -10 - sw.a, hip - 4, -7.4, SHY + 5]); ctx.fill();
    ctx.strokeStyle = G.rgba(h.col, 0.42); ctx.lineWidth = 0.8; ctx.stroke();
  }
  function bodyVesper(ctx, h, st, sw, hip) {
    const col = h.col;
    // tunic, narrow at the waist, with a plate across the chest
    ctx.fillStyle = st.mid;
    poly(ctx, [-3.3, hip + 2, 3.7, hip + 2, 5.9, SHY + 1, 3.4, SHY - 2.6, -4.4, SHY - 2, -5.4, SHY + 2]); ctx.fill();
    ctx.fillStyle = st.plate;
    poly(ctx, [5.9, SHY + 1, 3.4, SHY - 2.6, -0.6, SHY - 2.3, 0.4, SHY + 8.6, 4.7, SHY + 7]); ctx.fill();
    // belt, and a tabard split in two tails
    ctx.fillStyle = st.dark;
    poly(ctx, [-3.4, hip - 1.5, 3.8, hip - 1.5, 3.2 - sw.c * 0.5, hip + 9.5, 0.8 - sw.b * 0.6, hip + 5.8, -2.6 - sw.c, hip + 11]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.55); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = G.rgba(col, 0.95); ctx.lineWidth = 1.4; line(ctx, -3.4, hip - 1, 3.8, hip - 1.6);
    // a star on the chest
    glowAt(ctx, col, 2.4, SHY + 3.6, 6, 0.8);
    ctx.fillStyle = G.rgba(h.hot, 1);
    poly(ctx, [2.4, SHY + 0.6, 3.1, SHY + 2.9, 5.2, SHY + 3.6, 3.1, SHY + 4.3, 2.4, SHY + 6.8, 1.7, SHY + 4.3, -0.4, SHY + 3.6, 1.7, SHY + 2.9]); ctx.fill();
  }
  function headVesper(ctx, h, st, hp) {
    ctx.save();
    ctx.translate(1.2, -46.6);
    // a deep hood with its point swept back (hp: the point on its own spring, streaming back as she runs)
    ctx.fillStyle = st.plate;
    poly(ctx, [-5.6, 5.4, -7.4, -0.6, -5.8 + hp[0] * 0.3, -6.2 + hp[1] * 0.3, -13.4 + hp[0], -11.4 + hp[1], -2.2, -9.8, 3.6, -8.4, 7.4, -3, 7.1, 2.8, 4.4, 6.6, 0, 4.8]); ctx.fill();
    ctx.strokeStyle = G.rgba(h.col, 0.75); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = '#02040a';
    poly(ctx, [0, -6.2, 5.3, -4.8, 6.8, -0.8, 6.2, 3.2, 3.4, 4.8, 0.4, 1.6]); ctx.fill();
    ctx.fillStyle = st.mid; poly(ctx, [1.2, 0.8, 6.7, -0.2, 6.2, 3.2, 3.4, 4.8]); ctx.fill(); // scarf drawn up over the mouth
    eyes(ctx, h, 1.2, -2.3, 1);
    ctx.restore();
  }
  function plateVesper(ctx, h, st) {
    // a plate on the sword shoulder
    ctx.fillStyle = st.hi;
    poly(ctx, [0.8, SHY - 3.6, 7.6, SHY - 2.8, 9.4, SHY + 3, 3.4, SHY + 2.4]); ctx.fill();
    ctx.strokeStyle = G.rgba(h.col, 0.85); ctx.lineWidth = 0.8; ctx.stroke();
  }

  function bodyAster(ctx, h, st, sw, hip) {
    const col = h.col;
    // tassets under the belt
    ctx.fillStyle = st.plate;
    poly(ctx, [-6.4, hip - 1, -0.6, hip - 1, -1.4 - sw.b * 0.2, hip + 8.6, -6.8 - sw.b * 0.2, hip + 7]); ctx.fill();
    poly(ctx, [0.6, hip - 1, 6.6, hip - 1, 7 - sw.a * 0.2, hip + 7, 1.6 - sw.a * 0.2, hip + 8.6]); ctx.fill();
    // a breastplate as wide as two of anyone else
    ctx.fillStyle = st.mid;
    poly(ctx, [-6, hip + 1, 6.2, hip + 1, 10.8, SHY + 1, 7.4, SHY - 3, -7.4, SHY - 3, -10.8, SHY + 1]); ctx.fill();
    ctx.fillStyle = st.plate;
    poly(ctx, [10.8, SHY + 1, 7.4, SHY - 3, 0.6, SHY - 3, 1.4, hip + 1, 6.2, hip + 1]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.5); ctx.lineWidth = 0.9; line(ctx, 0.9, SHY - 2, 1.4, hip);
    // sigil
    glowAt(ctx, col, 3.2, SHY + 5, 8, 0.9);
    ctx.fillStyle = G.rgba(h.hot, 1);
    poly(ctx, [3.2, SHY + 1.4, 5.6, SHY + 5, 3.2, SHY + 8.6, 0.8, SHY + 5]); ctx.fill();
    // belt
    ctx.fillStyle = '#040a07'; poly(ctx, [-6.4, hip - 2.6, 6.6, hip - 2.6, 6.6, hip + 1.6, -6.4, hip + 1.6]); ctx.fill();
    ctx.fillStyle = G.rgba(col, 0.95); ctx.fillRect(-0.4, hip - 2, 3.4, 3);
  }
  function pauldron(ctx, h, st, px, py, s, fill) {
    ctx.fillStyle = fill;
    poly(ctx, [px - 6.6 * s, py + 4.6, px - 7.2 * s, py - 2, px - 2.6 * s, py - 6.4, px + 4 * s, py - 5.8, px + 7.6 * s, py - 1, px + 6.8 * s, py + 5.2, px, py + 2.6]); ctx.fill();
    ctx.strokeStyle = G.rgba(h.col, 0.8); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = st.hi;
    poly(ctx, [px - 1.8 * s, py - 6, px + 0.6 * s, py - 12.4, px + 2.6 * s, py - 5.8]); ctx.fill();
  }
  function headAster(ctx, h, st) {
    ctx.save();
    ctx.translate(1, -47.4);
    // horns swept up and back
    ctx.fillStyle = st.hi;
    poly(ctx, [-3.4, -5, -8.8, -8.6, -13.2, -17, -6.8, -11.6, -1.4, -7]); ctx.fill();
    poly(ctx, [2.2, -7, 4.2, -11.6, 10, -18, 7.2, -10.6, 5.2, -6.2]); ctx.fill();
    // a great helm with one slit of light
    ctx.fillStyle = st.plate;
    poly(ctx, [-5.2, 6.4, -5.8, -2, -3.8, -6.6, 1, -7.8, 5.2, -6.2, 6.6, -1, 6.2, 4.4, 3.2, 7.4, -2, 7.4]); ctx.fill();
    ctx.strokeStyle = G.rgba(h.col, 0.75); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = st.hi; poly(ctx, [-3.8, -6.6, 1, -7.8, 1.4, -5.6, -3, -4.6]); ctx.fill();
    ctx.fillStyle = '#020503'; poly(ctx, [0.2, -3.6, 6.9, -3, 6.6, 0, 0.8, -0.8]); ctx.fill();
    glowAt(ctx, h.col, 4, -2, 9, 1);
    ctx.fillStyle = G.rgba(h.hot, 1); poly(ctx, [1.4, -2.9, 6.6, -2.4, 6.4, -0.8, 1.8, -1.5]); ctx.fill();
    ctx.strokeStyle = '#020503'; ctx.lineWidth = 0.8;
    for (const vx of [2, 3.8, 5.6]) line(ctx, vx, 1.6, vx, 5);
    ctx.restore();
  }

  function backLune(ctx, h, st, sw, hip, qa) {
    const col = h.col;
    // quiver across the back (qa: it swings on its strap)
    ctx.save();
    ctx.translate(-4.6, SHY + 6); ctx.rotate(-0.5 + qa);
    ctx.fillStyle = st.plate; poly(ctx, [-2, -8, 2, -8, 1.6, 7, -1.6, 7]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.7); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(col, 0.95); ctx.lineWidth = 1.1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    // two long coat tails
    ctx.fillStyle = st.dark; ctx.strokeStyle = G.rgba(col, 0.55); ctx.lineWidth = 0.8;
    poly(ctx, [-3, hip - 1, 0, hip - 1, -3.4 - sw.b * 1.1, hip + 10, -8.6 - sw.c * 1.3, hip + 19]); ctx.fill(); ctx.stroke();
    poly(ctx, [0.4, hip - 1, 3.2, hip - 1, 1.4 - (sw.b + sw.c) * 0.4, hip + 15]); ctx.fill(); ctx.stroke();
  }
  function bodyLune(ctx, h, st) {
    const col = h.col, hip = -24;
    // a fitted coat with a sash across it
    ctx.fillStyle = st.mid;
    poly(ctx, [-2.7, hip + 2, 3, hip + 2, 5, SHY + 1, 3, SHY - 2.4, -3.6, SHY - 2, -4.4, SHY + 2]); ctx.fill();
    ctx.fillStyle = st.plate;
    poly(ctx, [5, SHY + 1, 3, SHY - 2.4, -0.2, SHY - 2.2, 0.6, hip + 2, 3, hip + 2]); ctx.fill();
    ctx.strokeStyle = G.rgba(h.hot, 0.9); ctx.lineWidth = 1.1; line(ctx, -3.8, SHY + 1, 2.9, hip - 1.4);
    ctx.strokeStyle = G.rgba(col, 0.95); ctx.lineWidth = 1.3; line(ctx, -2.8, hip - 0.6, 3.1, hip - 1);
    // a short mantle on the bow shoulder
    ctx.fillStyle = st.hi;
    poly(ctx, [0.2, SHY - 3, 5.8, SHY - 2.4, 8.4, SHY + 3.2, 5.4, SHY + 2, 3.2, SHY + 4.6]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 0.8; ctx.stroke();
  }
  function headLune(ctx, h, st, mo) {
    ctx.save();
    ctx.translate(0.8, -46.6);
    // the moon she wears: a thin crescent tilted behind her head (mo: it trails the head on a soft spring)
    const bob = Math.sin(G.t * 2.4) * 0.5, mx = -3.2 + mo[0], my = -6.2 + bob + mo[1];
    ctx.globalCompositeOperation = 'lighter';
    glowAt(ctx, h.col, mx, my, 12, 0.35);
    ctx.fillStyle = G.rgba(h.hot, 0.95);
    ctx.beginPath();
    ctx.arc(mx, my, 8.2, Math.PI * 0.62, Math.PI * 1.98);
    ctx.arc(mx + 2.6, my + 2.4, 7.4, Math.PI * 1.83, Math.PI * 0.76, true);
    ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // hair swept back to where it is tied
    ctx.fillStyle = st.hi;
    poly(ctx, [-5.8, 3.4, -7.4, -1.4, -5.4, -6, -0.6, -7.8, 4.4, -6.4, 6.4, -2.4, 3.8, -4.2, -0.4, -3.6, -3.2, 0.6]); ctx.fill();
    ctx.strokeStyle = G.rgba(h.hot, 0.6); ctx.lineWidth = 0.8; ctx.stroke();
    // a face in shadow, masked below the eyes
    ctx.fillStyle = '#04020a';
    poly(ctx, [-0.6, -3.8, 3.8, -4.4, 6.2, -1.6, 5.8, 3, 3.2, 5.2, -0.2, 3.4, -3, 0.4]); ctx.fill();
    ctx.fillStyle = st.plate; poly(ctx, [0.6, 0.6, 6.1, -0.2, 5.8, 3, 3.2, 5.2, 0.2, 3.2]); ctx.fill();
    eyes(ctx, h, 0.9, -2, 0.9);
    ctx.restore();
  }


  function backEos(ctx, h, st, sw, hip) {
    // a long coat, split up the back
    ctx.fillStyle = st.dark; ctx.strokeStyle = G.rgba(h.col, 0.45); ctx.lineWidth = 0.8;
    poly(ctx, [-4.6, SHY + 2, 2.6, SHY + 1, 2, hip + 2, -1.6 - sw.c, hip + 15, -5 - sw.b * 1.1, hip + 10.5, -8.4 - sw.c * 1.3, hip + 17, -9.8 - sw.a, hip + 4, -7.4, SHY + 8]);
    ctx.fill(); ctx.stroke();
  }
  function bodyEos(ctx, h, st, sw, hip) {
    const col = h.col, sway = sw.a;
    // wide trousers gathered at the waist: a pleated panel over each thigh
    ctx.fillStyle = st.mid;
    poly(ctx, [-4.6, hip - 1, 4.8, hip - 1, 6 - sway * 0.3, hip + 9.5, 1.4 - sway * 0.3, hip + 8.2, -1.4 - sway * 0.5, hip + 10.2, -6 - sway * 0.6, hip + 8.6]); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.7;
    line(ctx, 1.2, hip + 1, 1.4 - sway * 0.3, hip + 8.2); line(ctx, -1.8, hip + 1, -1.4 - sway * 0.5, hip + 10.2);
    // a wrapped coat, crossed left over right
    ctx.fillStyle = st.mid;
    poly(ctx, [-3.6, hip + 1, 4, hip + 1, 6, SHY + 1, 3.6, SHY - 2.6, -4.4, SHY - 2, -5.2, SHY + 2]); ctx.fill();
    ctx.fillStyle = st.plate;
    poly(ctx, [6, SHY + 1, 3.6, SHY - 2.6, 0.4, SHY - 2.4, -2.4, hip - 1.5, 4, hip - 1.5]); ctx.fill();
    ctx.strokeStyle = G.rgba(h.hot, 0.9); ctx.lineWidth = 1; line(ctx, 0.6, SHY - 2.2, -2.2, hip - 2);   // the collar's bright edge
    ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 0.8; line(ctx, 3.4, SHY - 2.4, -0.2, SHY + 6.5);
    // a broad sash, knotted, one end hanging
    ctx.fillStyle = st.hi; poly(ctx, [-4, hip - 2.8, 4.6, hip - 3, 4.6, hip + 1, -4, hip + 1.2]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.7); ctx.lineWidth = 0.7; line(ctx, -4, hip - 0.9, 4.6, hip - 1.1);
    ctx.fillStyle = G.rgba(col, 0.95); poly(ctx, [-1.6, hip - 2.2, 0.6, hip - 1.4, -0.4 - sw.c * 0.6, hip + 7, -2 - sw.c * 0.6, hip + 6]); ctx.fill();
    // a small sun on the breast
    glowAt(ctx, col, 3.3, SHY + 3.4, 5.5, 0.8);
    ctx.fillStyle = G.rgba(h.hot, 1); ctx.beginPath(); ctx.arc(3.3, SHY + 3.4, 1.35, 0, G.TAU); ctx.fill();
  }
  function headEos(ctx, h, st, hat) {
    ctx.save();
    ctx.translate(1, -46.6);
    // hair, tied back under the hat
    ctx.fillStyle = st.dark;
    poly(ctx, [-5.6, 3.8, -7, -1, -4.8, -4.8, 3.6, -5, 5.6, -1.8, 2.4, -3.2, -1.6, -2.6, -3.4, 1.2]); ctx.fill();
    // a face in shadow, wrapped to the eyes
    ctx.fillStyle = '#060208';
    poly(ctx, [-0.8, -3.6, 4, -4, 6.2, -1.2, 5.8, 3.2, 3.2, 5.4, -0.2, 3.6, -3, 0.6]); ctx.fill();
    ctx.fillStyle = st.plate; poly(ctx, [0.4, 1, 6.1, 0.2, 5.8, 3.2, 3.2, 5.4, 0, 3.4]); ctx.fill();
    eyes(ctx, h, 1.1, -1.3, 0.9);
    // a wide travelling hat, tipped forward so its brim shades her eyes
    ctx.translate(0, -3.2); ctx.rotate(0.07 + hat); // (hat: its own spring; it tips back as she sets off, forward as she stops)
    ctx.fillStyle = st.plate;
    poly(ctx, [-13.5, -1.4, -1.6, -9.6, 1.4, -9.8, 15, -1.9, 14.2, -0.4, -12.6, 0.2]); ctx.fill();
    ctx.strokeStyle = G.rgba(h.col, 0.8); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = st.hi; poly(ctx, [1.4, -9.8, 15, -1.9, 14.2, -0.4, 4.4, -4.6]); ctx.fill();     // the lit side
    ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 0.6;
    line(ctx, -0.8, -9.2, -7.6, -0.4); line(ctx, 0, -9.4, 0.6, -0.2); line(ctx, 0.9, -9.3, 8.4, -0.5);
    ctx.fillStyle = '#060208'; poly(ctx, [-12.6, 0.2, 14.2, -0.4, 12.4, 0.9, -11, 1.3]); ctx.fill();  // the underside of the brim
    ctx.fillStyle = G.rgba(h.hot, 1); poly(ctx, [-1.6, -9.6, -0.1, -11.8, 1.4, -9.8]); ctx.fill();    // the knot at its crown
    ctx.restore();
  }

  // ---- the living layer (v2.5c). Drawing only: no hit box, timing or physics reads any of it.
  // Every part of a hero is its own piece on its own spring, on top of where the pose puts it: the
  // hips sink through the knees on a landing and come back up past where they rest; the chest lags the
  // hips; the spine bows and stretches about the hips as the body sets off, stops and lands; the head
  // rides the neck (thrown back as the body drives off, carrying on as it stops, nodding against the
  // stride); the weapon carried at rest swings on the hand; a free hand trails; hoods, hats, pauldrons,
  // a quiver, a sheath, sleeves and coat tails each swing with their own weight, a hem later and
  // further than a waist; feet roll up onto the toe and fold as they lift. At rest the chest breathes and
  // the weight shifts from foot to foot. Only the live hero carries springs (s.rig.sp); a figure drawn
  // with no state (an echo in the Hall, a portrait, an afterimage) still breathes and shifts its weight.
  const PHASE = { vesper: 0, aster: 1.9, lune: 3.7, eos: 5.1 }; // (so the heroes in the Hall do not breathe as one)
  // How far a running foot has rolled (+: heel up and toe down) at its point of the stride (p, as footTargets has it).
  function runRoll(p) {
    const PI = Math.PI, u = ((p % G.TAU) + G.TAU) % G.TAU;
    if (u >= 0.5 * PI && u < 1.5 * PI) {
      // planted, the body passing over it: the heel strikes with the toe still up, then rolls onto the toe
      if (u < 0.7 * PI) return -0.22 * (1 - smooth((u - 0.5 * PI) / (0.2 * PI)));
      return 0.75 * smooth((u - 1.1 * PI) / (0.4 * PI));
    }
    // lifted and carried through: it folds under, then opens out to reach for the next strike
    const v = (u >= 1.5 * PI ? u - 1.5 * PI : u + 0.5 * PI) / PI;
    return v < 0.25 ? G.lerp(0.75, 0.95, smooth(v / 0.25)) : G.lerp(0.95, -0.22, smooth((v - 0.25) / 0.75));
  }

  // One hero, drawn from a state:
  // { x, y, facing, vx, vy, onGround, squash, runT, atk, primed, hurtFlash, dash }.
  // Used for the live hero, dash afterimages and the portraits on the hero-select screen.
  function drawBody(ctx, h, s) {
    const st = STYLE[h.id], col = h.col, id = h.id;
    const a = s.atk, air = !s.onGround, sp = Math.abs(s.vx);
    const run = !air && sp > 40, idle = !air && !run && !a;
    const ph = PHASE[id] || 0;
    const breath = idle ? Math.sin(G.t * 3 + ph) : 0;
    const gold = s.primed || !!(a && a.heavy) || !!(s.recov && s.recov.lvl >= 3);
    // Pose memory. Only the live hero has one (afterimages, echoes and portraits are drawn exactly as
    // posed). With it the limbs, the lean and the weapon at rest ease from one pose to the next over
    // a few frames, so nothing snaps; a swing, a shot and the flourish are always shown exactly.
    const R = s.rig || null;
    let rdt = 0;
    if (R) { rdt = R.t == null ? 0 : G.clamp(G.t - R.t, 0, 0.05); R.t = G.t; }
    const ease = (key, v, rate) => { if (!R) return v; R[key] = R[key] == null ? v : G.damp(R[key], v, rate, rdt); return R[key]; };
    // the springs of the living layer, and what pushes them this frame: the change in the body's speed
    // (in its own frame, forward the way it faces), a landing, a blow (the squash dropping at once) and a footfall
    const K = R ? (R.sp || (R.sp = DR.rig())) : null;
    const spr = (k, t, w, z) => (K ? K.spring(k, t, rdt, w, z) : t);
    const kick = (k, v) => { if (K && rdt > 0 && v && isFinite(v)) K.kick(k, v); };
    let dvx = 0, dvy = 0, land = 0, hit = 0, foot = false;
    if (R && rdt > 0) {
      if (R.pvx != null) {
        dvx = (s.vx - R.pvx) * s.facing; dvy = s.vy - R.pvy;
        if (!isFinite(dvx) || Math.abs(dvx) > 2600) dvx = 0; // (a placement, not a push)
        if (!isFinite(dvy) || Math.abs(dvy) > 2600) dvy = 0;
        dvx = G.clamp(dvx, -1500, 1500); dvy = G.clamp(dvy, -1600, 1600);
        if (R.pAir && !air) land = G.clamp(R.pvy || 0, 0, 1600);
        const dq = (R.psq || 0) - (s.squash || 0);
        if (!land && dq > 0.025 && (s.squash || 0) < -0.02) hit = Math.min(0.4, dq);
        foot = run && Math.floor(s.runT / Math.PI) !== R.pstep;
      }
      R.pvx = s.vx; R.pvy = s.vy; R.pAir = air; R.psq = s.squash || 0; R.pstep = Math.floor(s.runT / Math.PI);
    }
    let turnW = 1;
    if (R) {
      // turning round: the figure narrows through the turn and opens out the other way, over about
      // five frames (from -1, still showing the old way, to 1), so the weapon swings round rather
      // than jumping across. Turning back mid-turn carries on from where it is. A swing or a dash
      // is shown at once, the right way round.
      if (R.face !== s.facing) { R.tq0 = R.face == null ? 1 : -(R.tk == null ? 1 : R.tk); R.tp = R.face == null ? 1 : 0; R.face = s.facing; }
      if (a || s.dash) R.tp = 1;
      R.tp = Math.min(1, (R.tp == null ? 1 : R.tp) + rdt / 0.085);
      const e = R.tp * R.tp * (3 - 2 * R.tp);
      R.tk = R.tp >= 1 ? 1 : R.tq0 + (1 - R.tq0) * e;
      turnW = Math.abs(R.tk) < 0.28 ? 0.28 * (R.tk < 0 ? -1 : 1) : R.tk;
    }
    // (where the cloth that trails behind is tied, measured as drawn, for updateScarf)
    const M0 = R && s.scarf && ctx.getTransform ? ctx.getTransform() : null;
    const anchorHere = () => {
      if (!M0) return;
      const m = M0.inverse().multiply(ctx.getTransform()), p = m.transformPoint(new DOMPoint(st.anchor[0], st.anchor[1]));
      if (isFinite(p.x) && isFinite(p.y)) R.anc = { dx: p.x - s.x, dy: p.y - s.y, t: G.t };
    };
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.facing * SC * turnW, SC);
    const c = s.cast, lean0 = s.dash ? 0.42 : G.clamp(s.vx * s.facing / h.run, -1.6, 1.6) * 0.13;
    let leanT = lean0;
    if (c && !a) leanT = c.kind === 'lance' ? (c.thrown ? 0.3 : -0.16) : c.kind === 'slam' ? 0.34 : c.kind === 'arc' ? 0.24 : -0.12; // rock back to wind up, fall into the throw
    else if (s.stun > 0) leanT = -0.32;
    else if (s.healT > 0) leanT = 0.1;
    else if (h.draw && a && a.kind === 'draw') leanT = 0.5; // thrown forward along the cut
    else if (a && a.kind === 'shot') leanT = a.swung ? lean0 - 0.11 * Math.max(0, 1 - (a.t - a.a0) / 0.1) : lean0 + 0.04; // the bow kicks her back as it looses
    else if (a) {
      // the body goes with the swing: it rocks back as the weapon is carried up, and drives in behind the cut
      const w = h.heavy ? 1.5 : a.heavy ? 1.3 : 1, wind = a.t < a.a0, dir = a.kind === 'up' ? -0.5 : 1;
      leanT = lean0 + (wind ? -0.1 * w : (a.thrust ? 0.3 : 0.17 * w) * dir * Math.max(0.35, 1 - Math.max(0, a.t - a.a1) / 0.16));
    }
    else if (h.draw && s.recov && s.recov.kind === 'noto' && !s.dash) leanT = s.recov.t < s.recov.dur * s.recov.at ? 0.32 : 0.08;
    else if (h.draw && s.hold && s.focus > 0.12 && s.onGround && !s.dash) leanT = 0.2;
    const drawing = !!(a && a.kind === 'draw');
    const leanNow = ease('lean', leanT, c || drawing ? 45 : a ? 38 : 30);
    ctx.rotate(leanNow);
    // Eos sinks into her stance, lower with each mark, and lowest of all in the lunge after a draw
    let crouchT = 0;
    if (h.draw && !air) {
      if (drawing) crouchT = 6;
      else if (s.recov && s.recov.kind === 'noto' && !s.dash) crouchT = s.recov.t < s.recov.dur * s.recov.at ? 5 : 1;
      else if (c && (c.kind === 'arc' || c.kind === 'guard')) crouchT = 3;
      else if (s.hold && s.focus > 0.12 && !s.dash) crouchT = 3 + 0.8 * focusMark(s.focus);
    }
    const crouch = h.draw ? ease('crouch', crouchT, drawing ? 60 : 22) : 0;
    // (v2.5c) a squash that presses the hero down is taken mostly in the knees (see sink), not by
    // squeezing the whole figure; a stretch (a jump) still stretches it
    // (v2.5d) the drawn squash eases into a landing over a few frames, as knees bend, instead of the
    // whole figure dropping in one frame; it still lets go as fast as the game's squash does
    const rawSq = s.squash || 0, squash = K && rawSq < 0 ? spr('sq', rawSq, 46, 0.8) : (K ? (K.set('sq', rawSq), rawSq) : rawSq);
    const sq = squash < 0 ? squash * 0.4 : squash;
    ctx.scale(1 - sq * 0.55, 1 + sq);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // -- the hips: they sink through the knees on a landing or a blow and come back up past rest; at
    // rest the weight drifts from one foot to the other
    const restK = R ? ease('restK', idle && !s.hold ? 1 : 0, 5) : (idle && !s.hold ? 1 : 0);
    const ws = Math.sin(G.t * 0.75 + ph) * restK, hipX = ws * 1.1;
    // (soft limits, so a hard landing rounds off at the bottom rather than hitting a wall and holding)
    const soft = (v, lo, hi) => (v > 0 ? hi * Math.tanh(v / hi) : lo * Math.tanh(v / lo));
    const sink = soft(spr('sink', Math.max(0, -squash) * 20, 20, 0.42), -2.5, 9);
    kick('sink', land * 0.03 + hit * 60);
    const bob = run ? Math.abs(Math.sin(s.runT)) * 1.3 : 0;
    const hip = Math.min(-13, -24 + bob + crouch + sink + ws * ws * 0.35);
    // -- the chest rides the hips a beat late; the spine bows and stretches about the hips
    const chest = soft(spr('ch', 0, 16, 0.36), -2.5, 4);
    kick('ch', land * 0.022 + hit * 45 - dvy * 0.01 + (foot ? (h.heavy ? 9 : 4) : 0));
    const spine = G.clamp(spr('sp', run ? 0.03 : 0, 10, 0.45), -0.16, 0.16) - ws * 0.02 + breath * 0.008;
    kick('sp', -dvx * 0.0013 + land * 0.0005 + hit * 0.6);
    const upY = hip + 24 - breath * 0.5 + chest;
    const upper = () => { ctx.translate(hipX, upY - 24); ctx.rotate(spine); ctx.translate(0, 24); };
    // -- the head on its neck
    const nod = run ? Math.sin(2 * s.runT - 1.1) * 0.7 : 0;
    const hx = G.clamp(spr('hx', 0, 15, 0.42), -3.5, 3.5), hy = G.clamp(spr('hy', nod, 15, 0.42), -3, 4);
    kick('hx', -dvx * 0.08); kick('hy', -dvy * 0.035 + hit * 40 + (foot ? 6 : 0));
    const ht = G.clamp(spr('ht', -leanNow * 0.3 + Math.sin(G.t * 0.7 + ph) * 0.03 * restK, 12, 0.4), -0.3, 0.3);
    kick('ht', -dvx * 0.0011 - dvy * 0.0004);
    // -- cloth at three depths, each following the one above it
    const swayT = G.clamp(s.vx * s.facing * 0.02, -6, 6) + (air ? G.clamp(s.vy * 0.004, -3, 4) : 0) + breath * 0.3 + Math.sin(G.t * 1.3 + ph) * 0.4 * restK;
    const c1 = G.clamp(spr('c1', swayT, 12, 0.42), -9, 9);
    const c2 = G.clamp(spr('c2', c1, 9.5, 0.34), -9, 9);
    const c3 = G.clamp(spr('c3', c2, 7.5, 0.28), -10, 10);
    kick('c1', dvx * 0.008); kick('c2', dvx * 0.012); kick('c3', dvx * 0.018);
    const sw = { a: c1, b: c2, c: c3 };
    // -- each hero's own hanging and riding pieces
    let hood = null, moon = null, hat = 0, qa = 0, pa0 = 0, pa1 = 0;
    if (id === 'vesper') {
      const hpx = G.clamp(spr('hpx', -G.clamp(s.vx * s.facing / 335, 0, 1.5) * 1.5, 11, 0.3), -3, 3);
      const hpy = G.clamp(spr('hpy', air ? G.clamp(s.vy * 0.002, -1.5, 1.5) : 0, 11, 0.3), -3, 3);
      kick('hpx', -dvx * 0.04); kick('hpy', -dvy * 0.02);
      hood = [hpx, hpy];
    } else if (id === 'lune') {
      const mx = spr('mnx', hx, 7, 0.5), my = spr('mny', hy, 7, 0.5);
      moon = [G.clamp(mx - hx, -4, 4), G.clamp(my - hy, -4, 4)];
      qa = G.clamp(spr('qa', 0, 10, 0.3), -0.45, 0.45);
      kick('qa', (Math.sin(1.07) * dvx - Math.cos(1.07) * dvy) * 0.0016 + (foot ? 0.25 : 0));
    } else if (id === 'eos') {
      hat = G.clamp(spr('hat', 0, 13, 0.32), -0.25, 0.25);
      kick('hat', -dvx * 0.0012 - dvy * 0.0005 + hit * 0.8);
    } else if (id === 'aster') {
      // the pauldrons are separate plates: they jolt on every step and landing, each on its own spring
      pa0 = G.clamp(spr('pa0', 0, 21, 0.28), -3, 3); pa1 = G.clamp(spr('pa1', 0, 18, 0.3), -3, 3);
      const pk = -dvy * 0.02 + hit * 50 + (foot ? 10 : 0);
      kick('pa0', pk); kick('pa1', pk * 1.2);
    }

    // -- legs: two bones each, solved to the foot; the foot rolls up onto its toe as the heel lifts
    // and folds as it leaves the ground, and a planted foot lies flat however the body leans
    const ft = footTargets(s, st), L = st.leg, A = st.arm, fr = run ? 44 : 26;
    if (st.lunge && !air && !s.dash && (drawing || !run)) {
      // her wide stances are planted: the lean must not lift one foot and bury the other
      const cl = Math.cos(leanNow), sl = Math.sin(leanNow);
      for (const f of ft) { const X = f[0], Y = f[1]; f[0] = X * cl + Y * sl; f[1] = -X * sl + Y * cl; }
    }
    const feet = R ? [[ease('f0x', ft[0][0], fr), ease('f0y', ft[0][1], fr)], [ease('f1x', ft[1][0], fr), ease('f1y', ft[1][1], fr)]] : ft;
    const rollT = (i) => {
      if (s.dash) return i ? 0.5 : 0.95;
      if (air) return s.vy < 0 ? (i ? 0.8 : 0.5) : (i ? 0.7 : 0.25);
      if (run) return runRoll(s.runT + (i ? Math.PI : 0));
      return G.clamp(-ft[i][1] / 7, 0, 1) * 0.6;
    };
    const rolls = [G.clamp(spr('fr0', rollT(0), 40, 0.6), -0.4, 1.1), G.clamp(spr('fr1', rollT(1), 40, 0.6), -0.4, 1.1)];
    const leg = (i) => {
      const hx0 = (i ? -1.6 : 1.6) + hipX, f = feet[i], L2 = L[2];
      // a planted foot turns about its toe (heel up) or its heel (toe up); a lifted one about its ankle
      const th = rolls[i], g = air ? 0 : 1 - G.clamp(-f[1] / 2.5, 0, 1), pd = th > 0 ? L2 * 0.55 + 4.4 : -L2 * 0.9;
      const ax = f[0] + g * pd * (1 - Math.cos(th)), ay = f[1] - g * pd * Math.sin(th);
      const k = ik(hx0, hip, ax, ay, 12.7, 12.7, -1);
      ctx.fillStyle = i ? st.dark : st.mid;
      DR.limb(ctx, hx0, hip, k.jx, k.jy, L[0], L[1]); ctx.fill();
      DR.limb(ctx, k.jx, k.jy, k.ex, k.ey - 1.6, L[1], L[2]); ctx.fill();
      // greave, knee and a pointed boot
      const gx = G.lerp(k.jx, k.ex, 0.82), gy = G.lerp(k.jy, k.ey, 0.82);
      ctx.fillStyle = i ? st.mid : st.plate;
      poly(ctx, [k.jx - L[1] * 0.25, k.jy + 0.5, k.jx + L[1] * 0.72, k.jy - 0.4, gx + L2 * 0.85, gy, gx - L2 * 0.2, gy + 0.6]); ctx.fill();
      if (id !== 'lune' && id !== 'eos') { poly(ctx, [k.jx - 0.6, k.jy - L[1] * 0.6, k.jx + L[1] * 0.95, k.jy - 0.6, k.jx + 0.6, k.jy + L[1] * 0.5]); ctx.fill(); }
      const ba = th - g * leanNow, cb = Math.cos(ba), sb = Math.sin(ba);
      const bx = (dx, dy) => k.ex + dx * cb - dy * sb, by = (dx, dy) => k.ey + dx * sb + dy * cb;
      const hl = -L2 * 0.9, tp = L2 * 0.55;
      poly(ctx, [bx(hl, -3.2), by(hl, -3.2), bx(tp, -3.4), by(tp, -3.4), bx(tp + 4.4, 0), by(tp + 4.4, 0), bx(hl, 0), by(hl, 0)]); ctx.fill();
      if (!i) { ctx.strokeStyle = G.rgba(col, 0.55); ctx.lineWidth = 0.8; line(ctx, k.jx + L[1] * 0.72, k.jy - 0.4, gx + L2 * 0.85, gy); }
    };

    // what hangs behind the legs
    ctx.save();
    upper();
    if (id === 'vesper') backVesper(ctx, h, st, sw, -24);
    else if (id === 'lune') backLune(ctx, h, st, sw, -24, qa);
    else if (id === 'eos') backEos(ctx, h, st, sw, -24);
    ctx.restore();
    leg(1);

    // everything above the hips rides the hips, the chest, the spine and the idle breath
    ctx.save();
    upper();
    let W = weaponPose(h, s, breath);
    if (R) {
      if (a || s.flT > 0 || s.cast || s.recov || R.wang == null) {
        R.wfx = W.fx; R.wfy = W.fy; R.wbx = W.bx; R.wby = W.by; R.wang = W.ang;
        if (W.sx != null) { R.wsx = W.sx; R.wsy = W.sy; R.wsa = W.sang; }
      } else {
        // back to rest after a swing, or from one carry to another: quick, but not in one frame
        const kk = 1 - Math.exp(-22 * rdt);
        R.wfx += (W.fx - R.wfx) * kk; R.wfy += (W.fy - R.wfy) * kk; R.wbx += (W.bx - R.wbx) * kk; R.wby += (W.by - R.wby) * kk;
        R.wang += G.angDiff(R.wang, W.ang) * kk;
        W = Object.assign({}, W, { fx: R.wfx, fy: R.wfy, bx: R.wbx, by: R.wby, ang: R.wang });
        if (W.sx != null) {
          // Eos: the sheath eases too, and the sword in it goes where the sheath goes
          if (R.wsx == null) { R.wsx = W.sx; R.wsy = W.sy; R.wsa = W.sang; }
          R.wsx += (W.sx - R.wsx) * kk; R.wsy += (W.sy - R.wsy) * kk; R.wsa += G.angDiff(R.wsa, W.sang) * kk;
          W.sx = R.wsx; W.sy = R.wsy; W.sang = W.ang = R.wsa;
          W.hx = W.sx - Math.cos(R.wsa) * (1.6 + W.vis); W.hy = W.sy - Math.sin(R.wsa) * (1.6 + W.vis);
        }
      }
    }
    W.fy -= LIFT; W.by -= LIFT;
    if (W.sy != null) { W.sy -= LIFT; W.hy -= LIFT; }
    // -- (v2.5c) what is carried at rest swings on its own: the weapon on the hand like a pendulum
    // (pushed the way the body's change of speed throws its far end), the hands bounce, a free hand
    // trails, and Eos's sheath swings from her belt. Never in a swing, a shot, a cast or on the way
    // back from one: those are shown exactly, to match the cuts they draw.
    const wfree = !a && !(s.flT > 0) && !s.cast && !s.recov && !(s.stun > 0) && !(s.healT > 0) && !s.plunge && !(s.hold && s.focus > 0.12);
    if (h.weapon === 'blade') {
      let sh = 0;
      if (K) {
        if (wfree && !W.free) {
          sh = G.clamp(spr('sh', 0, 8, 0.3), -0.5, 0.5);
          kick('sh', (Math.sin(W.sang) * dvx - Math.cos(W.sang) * dvy) * 0.0028 + (foot ? -0.2 : 0));
        } else K.set('sh', 0);
      }
      if (sh) {
        const ox = W.hx, oy = W.hy;
        W.sang += sh; W.ang = W.sang;
        W.hx = W.sx - Math.cos(W.sang) * (1.6 + W.vis); W.hy = W.sy - Math.sin(W.sang) * (1.6 + W.vis);
        if (Math.hypot(W.fx - ox, W.fy - oy) < 13) { W.fx += W.hx - ox; W.fy += W.hy - oy; } // a hand on the grip goes with it
      }
    } else {
      let wa = 0, wy = 0, bhx = 0, bhy = 0;
      if (K) {
        if (wfree) {
          const maul = h.weapon === 'maul';
          wa = G.clamp(spr('wa', 0, maul ? 7 : 9, 0.32), -0.35, 0.35);
          kick('wa', (Math.sin(W.ang) * dvx - Math.cos(W.ang) * dvy) * (maul ? 0.0015 : 0.002) + hit * (maul ? -1.2 : 0.8));
          wy = G.clamp(spr('wy', 0, 14, 0.35), -3, 3);
          kick('wy', -dvy * 0.012 + hit * 30 + (foot ? (maul ? 6 : 3) : 0));
          bhx = G.clamp(spr('bhx', 0, 12, 0.35), -3.5, 3.5); bhy = G.clamp(spr('bhy', 0, 12, 0.35), -3.5, 3.5);
          kick('bhx', -dvx * 0.05); kick('bhy', -dvy * 0.03 + (foot ? 4 : 0));
        } else for (const k of ['wa', 'wy', 'bhx', 'bhy']) K.set(k, 0);
      }
      if (wa || wy || bhx || bhy) {
        W.ang += h.weapon === 'bow' ? wa * 0.5 : wa;
        W.fy += wy;
        if (h.weapon === 'maul') { W.bx = W.fx - Math.cos(W.ang) * 7.5; W.by = W.fy - Math.sin(W.ang) * 7.5; } // both hands on the haft
        else { W.bx += bhx; W.by += bhy + wy * 0.6; }
      }
    }
    const shY = SHY - breath * 0.25; // the shoulders rise a little more than the chest as she breathes in
    const arm = (front) => {
      const sx = front ? (id === 'aster' ? 6.4 : 3) : (id === 'aster' ? -6 : -2.6), held = front !== !!W.swap, tx = held ? W.fx : W.bx, ty = held ? W.fy : W.by;
      const k = ik(sx, shY, tx, ty, 8.4, 8.8, 1);
      ctx.fillStyle = front ? st.mid : st.dark;
      DR.limb(ctx, sx, shY, k.jx, k.jy, A[0], A[1]); ctx.fill();
      DR.limb(ctx, k.jx, k.jy, k.ex, k.ey, A[1], A[2]); ctx.fill();
      // bracer and glove
      ctx.fillStyle = front ? st.plate : st.mid;
      DR.limb(ctx, G.lerp(k.jx, k.ex, 0.3), G.lerp(k.jy, k.ey, 0.3), G.lerp(k.jx, k.ex, 0.88), G.lerp(k.jy, k.ey, 0.88), A[1] + 1, A[2] + 0.8); ctx.fill();
      if (front) { ctx.strokeStyle = G.rgba(col, 0.6); ctx.lineWidth = 0.7; ctx.stroke(); }
      if (id === 'eos') {
        // a wide sleeve hangs from her forearm; its hem trails the arm on its own spring, so it
        // billows behind a cut and swings on past when the arm stops
        const mx2 = G.lerp(k.jx, k.ex, 0.5), my2 = G.lerp(k.jy, k.ey, 0.5), key = front ? 'slf' : 'slb';
        const ox = G.clamp(spr(key + 'x', mx2, 13, 0.35) - mx2, -5, 5), oy = G.clamp(spr(key + 'y', my2, 13, 0.35) - my2, -4, 4);
        ctx.fillStyle = front ? st.mid : st.dark;
        poly(ctx, [sx - 1.6, shY + 0.6, k.jx + 0.6, k.jy - A[1] * 0.7, G.lerp(k.jx, k.ex, 0.78), G.lerp(k.jy, k.ey, 0.78) - 1.2, mx2 - 1 - sw.b * 0.3 + ox, my2 + 6.8 + oy * 0.6, k.jx - 2.4 - sw.b * 0.2 + ox * 0.5, k.jy + 3.6 + oy * 0.3]); ctx.fill();
        if (front) { ctx.strokeStyle = G.rgba(col, 0.5); ctx.lineWidth = 0.7; ctx.stroke(); }
      }
      ctx.fillStyle = front ? st.hi : st.plate;
      ctx.beginPath(); ctx.arc(k.ex, k.ey, A[2] * 0.62, 0, G.TAU); ctx.fill();
    };
    const weapon = () => {
      if (h.weapon === 'sword') drawSword(ctx, W, h, gold);
      else if (h.weapon === 'maul') drawMaul(ctx, W, h, st, gold);
      else if (h.weapon === 'blade') { drawScabbard(ctx, W, h, st, s.hold || s.edge > 0 ? focusMark(s.focus || 0) : 0); drawKatana(ctx, W, h, gold); }
      else drawBow(ctx, W, h, a, gold);
    };

    arm(false);
    if (W.behind) weapon(); // the shouldered maul sits behind the body
    if (id === 'aster') pauldron(ctx, h, st, -9.4, SHY - 1 + pa1, 0.9, st.mid);
    if (id === 'vesper') bodyVesper(ctx, h, st, sw, -24);
    else if (id === 'aster') bodyAster(ctx, h, st, sw, -24);
    else if (id === 'eos') bodyEos(ctx, h, st, sw, -24);
    else bodyLune(ctx, h, st);
    if (id === 'aster' || id === 'vesper') anchorHere(); // the cape at his shoulders, the scarf at her neck
    ctx.restore();
    leg(0);
    ctx.save();
    upper();
    // the head: on its neck, tipping about it
    ctx.save();
    ctx.translate(hx, hy - breath * 0.35);
    ctx.translate(1, -41); ctx.rotate(ht); ctx.translate(-1, 41);
    if (id === 'vesper') headVesper(ctx, h, st, hood);
    else if (id === 'aster') headAster(ctx, h, st);
    else if (id === 'eos') headEos(ctx, h, st, hat);
    else headLune(ctx, h, st, moon);
    if (id === 'lune' || id === 'eos') anchorHere(); // her hair, their hat ribbons: tied at the head
    ctx.restore();
    if (id === 'vesper') plateVesper(ctx, h, st);
    if (!W.behind) weapon();
    arm(true);
    if (id === 'aster') pauldron(ctx, h, st, 9.2, SHY - 1 + pa0, 1, st.plate);
    if (W.javelin) drawJavelin(ctx, W, h, s.cast.t);
    ctx.restore();

    if (s.hurtFlash > 0) glowAt(ctx, '255,90,90', 0, -30, 38, s.hurtFlash);
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
    if (P.hidden || P.dead || P.vanish) return;
    let gy = FLOOR;
    for (const pl of G.arena.platforms) {
      if (pl.rise > 0.05 && P.x >= pl.x - 9 && P.x <= pl.x + pl.w + 9 && P.y <= pl.y + 4) gy = Math.min(gy, pl.y);
    }
    const k = G.clamp(1 - (gy - P.y) / 280, 0.25, 1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3 * k;
    ctx.drawImage(G.fx.glow(STAR), P.x - 78 * k, gy - 5, 156 * k, 15);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
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
      drawBody(ctx, H, { x: gh.x, y: gh.y, facing: gh.f, vx: gh.f * C.DASH_SPEED, vy: 0, onGround: false, squash: 0, runT: 0, atk: gh.atk || null, primed: false, hurtFlash: 0, dash: !gh.atk });
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

    const blink = P.inv > 0 && P.iframes <= 0 && !(P.fadeT > 0) && Math.floor(G.t * 28) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    if (P.fadeT > 0) ctx.globalAlpha = 0.28 + 0.1 * Math.sin(G.t * 9); // Fade: half there
    P.primed = H.draw ? (!!P.hold || P.edge > 0) && focusMark() >= 3 : P.combo === (H.chain || 3) - 2 && P.comboT > 0 && !P.atk;
    P.dash = P.dashT > 0;
    if (!P.vanish) { drawTail(ctx, H, P.scarf); drawBody(ctx, H, P); }
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
