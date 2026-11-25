// Solfall - Sol, the Falling Sun (v2.9a): the last fight of a run, behind the seventh portal once six
// trials are won. Built from the Claude Doc "Solfall boss brief: Sol, the Falling Sun" (drafted by Claude,
// approved by the user: "make sure she has a LOT of unique moves (do research) and the fight and
// transitions feel epic especially when she comes to fight head on in phase 2").
//   I   NOON. Too big to fit: the sun itself in the sky, her hands on long arms of light. Light burns and the
//       gnomon's shadow is safe; it swings as she drifts across the sky. Strike her hands; break both
//       and the sun comes down to the ridge. Twelve moves.
//   II  THE FALL. The sun cracks, she falls out of the sky as a comet, and stands up out of the crater
//       your size. She pulls the gnomon (the shade that kept you safe) out of the ridge and it burns into
//       a blade of noon. A duel: sixteen moves, read from how she holds the blade. Now a shadow on the
//       ridge means something is about to land there.
//   III ECLIPSE. She pulls the sun down into herself and the light goes out. The dark burns: stay in her
//       light (near her) or in the pools her flares leave. Ten moves of her own, six carried from the
//       Fall, and below 12% the last light: climb the steps of light while the dark rains, and at the top
//       the Dawnbreak is yours.
// Each form has its own stagger: broken hands, a knee, blinded by her own flare.
'use strict';
(function () {
  const { wait, tween } = G.seq;
  const E = Object.assign({ inSine: (t) => 1 - Math.cos(t * Math.PI / 2), outSine: (t) => Math.sin(t * Math.PI / 2), inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2 }, G.ease), FLOOR = G.FLOOR, H = G.hazards, K = G.kit, D = G.draw, DANGER = G.COL.danger;
  const WL = G.WALL_L, WR = G.WALL_R, MID = 640;
  const SUN = '255,224,150';        // her light at noon
  const SUNHOT = '255,252,238';
  const FALL = '255,176,84';        // the light of her fallen form
  const RIM = '255,124,52';         // the burning rim of the eclipse
  const RIMHOT = '255,226,196';
  const INK = '10,6,10';            // what is left when the light is gone
  const BURN = '255,96,40';         // the colour of light that burns
  const GNOMON_H = 180, GNOMON_W = 18;
  const SKY_Y = 168;                // where the sun hangs at noon
  const HAND_S = 1;                 // the hands' drawing scale (they are drawn about 210 px across)

  // ------------------------------------------------------------------ sounds
  const AU = G.audio, S = AU.synth;
  // a low gong: Noonray begins
  AU.define('solGong', (o) => {
    const v = (o && o.vol) || 1;
    S.tone({ type: 'sine', f0: 73, dur: 3.2, vol: 0.3 * v });
    S.tone({ type: 'sine', f0: 73 * 2.4, dur: 2.2, vol: 0.08 * v });
    S.tone({ type: 'sine', f0: 73 * 4.1, dur: 1.2, vol: 0.04 * v });
    S.noise({ dur: 0.12, vol: 0.14 * v, type: 'lowpass', f0: 700 });
  });
  // glass cracking: the sky splits
  AU.define('solCrack', (o) => {
    const v = (o && o.vol) || 1;
    for (let i = 0; i < 5; i++) S.noise({ dur: 0.05, vol: 0.3 * v, type: 'highpass', f0: 3000 + i * 600, delay: i * 0.05 + Math.random() * 0.03 });
    S.tone({ type: 'sine', f0: 2400, f1: 1800, dur: 0.6, vol: 0.05 * v, delay: 0.05 });
    S.noise({ dur: 1.2, vol: 0.18 * v, type: 'lowpass', f0: 1600, f1: 140, delay: 0.1 });
  });
  // one held note as the light drains out of the world
  AU.define('solDrain', (o) => {
    const d = (o && o.dur) || 2.5;
    S.tone({ type: 'sine', f0: 880, f1: 440, dur: d, vol: 0.09, attack: 0.2 });
    S.tone({ type: 'triangle', f0: 1320, f1: 660, dur: d, vol: 0.03, attack: 0.3 });
    S.tone({ type: 'sine', f0: 55, f1: 41, dur: d, vol: 0.2, attack: d * 0.6 });
  });
  // a colossal hand moving: air pushed aside
  AU.define('solHand', (o) => {
    const v = (o && o.vol) || 1;
    S.noise({ dur: 0.7, vol: 0.2 * v, type: 'bandpass', f0: 240, f1: 900, q: 1.2, attack: 0.3 });
    S.tone({ type: 'sine', f0: 50, f1: 70, dur: 0.7, vol: 0.12 * v, attack: 0.4 });
  });
  // her blade: a bright ringing edge (o.k: higher for later cuts)
  AU.define('solBlade', (o) => {
    const k = (o && o.k) || 0, f = 1320 * Math.pow(2, k * 3 / 12);
    S.noise({ dur: 0.16, vol: 0.2, type: 'bandpass', f0: 1800, f1: 5200, q: 2 });
    S.tone({ type: 'sine', f0: f, dur: 0.55, vol: 0.05 });
    S.tone({ type: 'sine', f0: f * 1.5, dur: 0.3, vol: 0.02 });
  });
  // a flare: light bursting off her rim
  AU.define('solFlare', (o) => {
    const v = (o && o.vol) || 1;
    S.noise({ dur: 0.5, vol: 0.22 * v, type: 'highpass', f0: 1200, f1: 6000 });
    S.tone({ type: 'sine', f0: 220, f1: 880, dur: 0.35, vol: 0.1 * v });
    S.tone({ type: 'sine', f0: 60, f1: 30, dur: 0.5, vol: 0.3 * v });
  });
  // the burn: light on skin
  AU.define('solSear', () => { S.noise({ dur: 0.35, vol: 0.18, type: 'bandpass', f0: 3200, f1: 1200, q: 3 }); S.tone({ type: 'sawtooth', f0: 180, f1: 90, dur: 0.25, vol: 0.06 }); });
  // a heartbeat in the dark
  AU.define('solHeart', (o) => { const v = (o && o.vol) || 1; S.tone({ type: 'sine', f0: 58, f1: 38, dur: 0.18, vol: 0.42 * v }); S.tone({ type: 'sine', f0: 54, f1: 36, dur: 0.15, vol: 0.3 * v, delay: 0.19 }); });
  // a falling star of the sky: a rising whistle, then the strike
  AU.define('solFall', (o) => { const d = (o && o.dur) || 0.8; S.tone({ type: 'sine', f0: 2200, f1: 500, dur: d, vol: 0.05, attack: d * 0.7 }); S.noise({ dur: d, vol: 0.06, type: 'bandpass', f0: 3000, f1: 600, q: 4, attack: d * 0.7 }); });
  // the corona ring turning in the air
  AU.define('solRing', () => { S.tone({ type: 'triangle', f0: 330, f1: 360, dur: 0.6, vol: 0.05 }); S.noise({ dur: 0.6, vol: 0.05, type: 'bandpass', f0: 1400, q: 6 }); });
  // a footstep of light in the dark
  AU.define('solStep', (o) => { const k = (o && o.k) || 0; S.tone({ type: 'sine', f0: 660 + 110 * k, dur: 0.25, vol: 0.05 }); S.noise({ dur: 0.04, vol: 0.06, type: 'highpass', f0: 4000 }); });
  // the comet of her fall, all the way down
  AU.define('solComet', (o) => {
    const d = (o && o.dur) || 1.4;
    S.noise({ dur: d, vol: 0.28, type: 'bandpass', f0: 300, f1: 3000, q: 1, attack: d * 0.9 });
    S.tone({ type: 'sawtooth', f0: 40, f1: 160, dur: d, vol: 0.14, attack: d * 0.9 });
    S.tone({ type: 'sine', f0: 1800, f1: 3600, dur: d, vol: 0.04, attack: d * 0.9 });
  });
  // a held breath before the blade: the blade of noon drawn from her crown
  AU.define('solDraw', () => {
    S.tone({ type: 'sine', f0: 440, f1: 1760, dur: 0.9, vol: 0.08, attack: 0.7 });
    S.noise({ dur: 0.9, vol: 0.12, type: 'bandpass', f0: 800, f1: 7000, q: 2, attack: 0.8 });
    S.tone({ type: 'sine', f0: 1760, dur: 1.6, vol: 0.06, delay: 0.9 });
    S.tone({ type: 'sine', f0: 2640, dur: 1.2, vol: 0.03, delay: 0.9 });
  });
  // a warm chord: the dawn at the end
  AU.define('solDawn', () => {
    for (const [m, v] of [[48, 0.16], [55, 0.12], [60, 0.1], [64, 0.09], [67, 0.08], [72, 0.06]]) S.tone({ type: 'sine', f0: 440 * Math.pow(2, (m - 69) / 12), dur: 5, vol: v, attack: 0.8 });
  });
  AU.vary.solBlade = 1; AU.vary.solStep = 1;

  // ------------------------------------------------------------------ the arena: a ridge above the clouds
  G.THEMES.sol = [null,
    {
      name: 'NOON', scene: 'sunridge',
      sky: ['#2c2438', '#6c4c5c', '#c48a68', '#f0c890'],
      far: '#6a5058', near: '#46323c', pillar: '#2a1e2a', rim: '255,220,170',
      floorTop: '#6e5448', floor: '#1c1418',
      boss: SUN, hot: SUNHOT, ember: '255,230,170', stars: 0,
    },
    {
      name: 'THE FALL', scene: 'sunridge',
      sky: ['#1a0c16', '#43182a', '#86342e', '#d8784c'],
      far: '#4e2226', near: '#30161c', pillar: '#1c0c12', rim: '255,170,110',
      floorTop: '#5e3a34', floor: '#180e10',
      boss: FALL, hot: '255,244,214', ember: '255,170,90', stars: 0,
    },
    {
      name: 'ECLIPSE', scene: 'sunridge',
      sky: ['#010102', '#040206', '#0a0408', '#14080a'],
      far: '#0c0608', near: '#080406', pillar: '#040203', rim: RIM,
      floorTop: '#241812', floor: '#060404',
      boss: RIM, hot: RIMHOT, ember: '255,140,70', stars: 0.25,
    }, G.THEMES.warden[4]];
  G.arena.WEATHER.sol = { kind: 'ember', n: 26 };
  G.arena.BIRDS.sol = null;
  G.arena.LAYOUTS.sol = {
    1: [],                                    // the dial, bare; the gnomon is the one thing to stand on
    2: [[150, 170, 500], [960, 170, 500]],    // two broken slabs of the dial, tilted up at either end
    3: [],                                    // nothing in the dark
  };
  // A sea of cloud below the ridge, the tops of far peaks through it, long bright haze.
  G.SCENES.sunridge = function (x, P, F, lcg) {
    const L = -60, R = G.W + 60;
    const dark = P.stars > 0.1;
    // the sea of cloud, in long rolls, lit from above
    let r = lcg(7);
    for (let row = 0; row < 4; row++) {
      const y = F - 150 + row * 34;
      x.fillStyle = row % 2 ? P.far : P.near;
      x.globalAlpha = dark ? 0.6 : 0.55 + row * 0.1;
      x.beginPath(); x.moveTo(L, F + 20);
      for (let px = L; px <= R; px += 30) x.lineTo(px, y - 14 * Math.sin(px * 0.011 + row * 1.7) - 10 * r());
      x.lineTo(R, F + 20); x.closePath(); x.fill();
      x.globalAlpha = 1;
      x.strokeStyle = G.rgba(P.rim, dark ? 0.08 : 0.35 - row * 0.06); x.lineWidth = 2;
      x.beginPath();
      for (let px = L; px <= R; px += 30) { const yy = y - 14 * Math.sin(px * 0.011 + row * 1.7); if (px === L) x.moveTo(px, yy); else x.lineTo(px, yy); }
      x.stroke();
    }
    // far peaks breaking through the cloud
    r = lcg(19);
    x.fillStyle = P.pillar;
    for (let i = 0; i < 5; i++) {
      const cx = L + 100 + i * 300 + r() * 120, h = 90 + r() * 120, w = 70 + r() * 80;
      x.beginPath(); x.moveTo(cx - w, F - 110); x.lineTo(cx - w * 0.2, F - 110 - h); x.lineTo(cx + w * 0.15, F - 110 - h * 0.86); x.lineTo(cx + w, F - 110); x.closePath(); x.fill();
      x.strokeStyle = G.rgba(P.rim, dark ? 0.1 : 0.4); x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(cx - w * 0.2, F - 110 - h); x.lineTo(cx + w * 0.15, F - 110 - h * 0.86); x.stroke();
    }
    // long thin bands of haze, high up
    r = lcg(5);
    for (let i = 0; i < 6; i++) {
      x.fillStyle = G.rgba(P.rim, dark ? 0.03 : 0.12 + 0.08 * r());
      x.beginPath(); x.ellipse(L + r() * (R - L), 70 + r() * 220, 200 + r() * 300, 4 + r() * 5, 0, 0, G.TAU); x.fill();
    }
  };

  // ------------------------------------------------------------------ the boss
  const B = {
    id: 'sol', name: 'SOL, THE FALLING SUN', short: 'Sol', theme: 'sol', event: true,
    snapTurn: true,
    sub: '“So. You are the one who made it.”', taunt: 'the last portal', blurb: 'The dying sun, in a body',
    tips: [
      'At noon her light burns. The gnomon’s shadow is safe, and it moves as she drifts across the sky.',
      'Break both of her hands and the sun itself comes down to the ridge. Strike it.',
      'A hand that slams open stays down a moment. A fist sends a ripple both ways.',
      'Under the Kind Hand: when the burning stops, watch its fingers. Curling, it closes.',
      'After the Fall, a shadow on the ridge means something is about to land there.',
      'How high she lifts the blade says how many cuts: at her crown two, straight up three.',
      'When she stands utterly still with her eyes shut, do not strike her blade. Your special breaks it.',
      'In the eclipse the dark burns. Stay in her light, or in the pools her flares leave.',
      'When her rim goes out, follow the embers: she steps out of the dark where the last one glows.',
      'At the very end, climb the steps of light. At the top the Dawnbreak is yours.',
    ],
    hudCols: [null, ['#ffe0a0', '#fffcee'], ['#ffb054', '#fff4d6'], ['#ff7c34', '#ffe2c4']],
    BASE_HP: 3900, poise0: 400, w: 40, h: 104,
    answer: 'answer', antiAir: 'antiair', finale: 'lastlight',
    gaps: [0, 1.0, 0.78, 0.66],
    bags: { 1: [], 2: [], 3: [] },
    cards: { 2: ['THE FALL', 'She comes down to fight you'], 3: ['ECLIPSE', 'The light goes out'] },
    first: { 1: 'noonray', 2: 'meridian', 3: 'umbra' },
    bpm: [70, 76, 128, 96],
  };

  // ------------------------------------------------------------------ her fallen form: poses
  // A pose, facing right, feet at (0, 0): [lean, hip height, front foot x, back foot x, blade hand x, y,
  // off hand x, y, blade angle]. The blade angle is where the point goes (0 ahead, -PI/2 up, PI/2 down).
  // Every value is on its own spring (living), so she swings through a pose, not to it.
  const POSES = {
    idle:    [0.06, 58, 16, -18, 24, -58, -14, -62, 1.0],
    walk:    [0.12, 56, 16, -18, 26, -60, -16, -62, 0.9],
    ready:   [0.14, 52, 22, -24, 30, -62, -18, -64, 0.25],          // the point up a little at you
    crownC:  [-0.06, 60, 14, -18, 6, -120, -8, -98, -2.4],          // Meridian: the blade at her crown (two cuts)
    upC:     [-0.12, 62, 12, -16, 10, -136, 2, -122, -1.57],        // straight up (three cuts)
    cutDown: [0.38, 46, 32, -26, 48, -46, -22, -58, 0.75],
    cutUp:   [-0.16, 58, 22, -20, 38, -112, -18, -62, -1.25],
    leapCut: [0.2, 70, 10, -10, 40, -96, -20, -80, -0.6],
    lowC:    [0.22, 38, 32, -30, -42, -22, 22, -52, 2.8],           // Horizon: the back knee down, the blade behind at the floor
    sweep:   [0.26, 40, 36, -30, 56, -28, -16, -54, 0.12],
    lungeC:  [0.34, 36, 26, -38, -22, -48, 30, -54, 0.04],          // sunk low, the crown flaring
    lunge:   [0.58, 46, 48, -42, 64, -56, -32, -50, 0.0],
    pointUp: [-0.08, 60, 12, -16, 10, -150, -12, -82, -1.57],       // Falling Sky
    glare:   [0.0, 60, 12, -14, 32, -66, -30, -66, 0.0],            // the blade held flat, eyes shut, utterly still
    crouch:  [0.42, 34, 22, -22, 18, -42, -14, -42, -1.57],         // Zenith Fall: looking straight up
    dive:    [0.1, 64, 6, -6, 6, -44, -8, -64, 1.57],
    stuck:   [0.58, 34, 28, -28, 36, -14, -10, -40, 1.42],          // the blade in the ridge to the hilt
    kneel:   [0.52, 26, 26, -10, 18, -18, -14, -30, 1.3],
    drawCrown: [-0.06, 60, 12, -14, 4, -128, -8, -112, -1.57],      // the blade pulled from her own crown
    point:   [0.0, 60, 18, -16, 62, -78, -20, -66, -0.08],          // the blade levelled at you
    reel:    [-0.32, 56, 10, -26, 6, -70, -12, -104, 0.7],          // blinded by her own flare, a hand to her eyes
    spread:  [-0.18, 64, 14, -14, 52, -104, -52, -104, -0.9],       // arms out: gathering
    thrustC: [0.1, 54, 18, -26, -8, -62, 26, -66, 0.0],
    thrust:  [0.5, 48, 44, -36, 70, -62, -28, -56, 0.0],
    spinC:   [0.18, 46, 20, -24, -36, -64, 30, -60, 3.0],
    spin:    [0.1, 50, 26, -26, 60, -60, -30, -60, 0.2],
    risingC: [0.4, 36, 18, -22, 30, -16, -12, -40, 1.3],
    rising:  [-0.3, 66, 8, -12, 24, -130, -16, -70, -1.4],
    float:   [0.0, 72, 6, -8, 34, -70, -30, -70, 0.6],
    pull:    [-0.22, 48, 24, -28, 26, -22, 8, -34, 1.42],          // Gnomons: pulling back on the pommel
  };
  const NP = 9;
  const IDLE_P = POSES.idle;

  // ------------------------------------------------------------------ the light and the shade (Noon)
  // The sun is her. A point is in shade when the line from her to it passes through the gnomon (or
  // under one of her hands held low), so the shade is a real shadow: it swings as she drifts across the
  // sky and gets longer as she sinks towards one side, and jumping high out of it is jumping into light.
  const gnomonUp = () => B.gnomon > 0.5;
  // does the line from the sun (sx, sy) to (px, py) pass through the box [l, r] x [top, bot]? (Liang-Barsky)
  function shadedBy(px, py, sx, sy, l, r, top, bot) {
    const dx = px - sx, dy = py - sy, P = [-dx, dx, -dy, dy], Q = [sx - l, r - sx, sy - top, bot - sy];
    let u0 = 0, u1 = 1;
    for (let i = 0; i < 4; i++) {
      if (P[i] === 0) { if (Q[i] < 0) return false; continue; }
      const u = Q[i] / P[i];
      if (P[i] < 0) { if (u > u1) return false; if (u > u0) u0 = u; } else { if (u < u0) return false; if (u < u1) u1 = u; }
    }
    return u0 < 0.995; // (the point itself standing in the box is not shaded by it)
  }
  function inShade(px, py) {
    const s = B.sun;
    if (gnomonUp() && shadedBy(px, py, s.x, s.y, MID - GNOMON_W / 2, MID + GNOMON_W / 2, FLOOR - GNOMON_H * B.gnomon, FLOOR)) return true;
    for (const h of B.hands) {
      if (!h.shade || h.gone) continue;
      if (shadedBy(px, py, s.x, s.y, h.x - 88, h.x + 88, h.y - 40, h.y + 30)) return true;
    }
    for (const sh of B.shades) if (px > sh.l && px < sh.r && py > FLOOR - 220) return true;
    return false;
  }
  // the hero is in shade when the middle of the hero is
  const heroShaded = () => inShade(G.player.x, G.player.y - 30);
  // where the gnomon's shadow lies along the floor: [from, to]
  function shadowSpan() {
    const s = B.sun, dir = G.sign(MID - s.x) || 1;
    const top = FLOOR - GNOMON_H * B.gnomon, dx = MID - s.x, dy = top - s.y;
    const len = dy > 1 ? Math.min(900, (FLOOR - top) * Math.abs(dx) / dy) : 900;
    return [MID + dir * GNOMON_W / 2, MID + dir * (GNOMON_W / 2 + len), dir];
  }

  // A hazard that burns everything in her light for dur seconds. o.safe(px, py): where it does not.
  function burn(dur, o) {
    o = o || {};
    return H.add({
      kind: 'burn', layer: 'under', dmg: o.dmg || 1, dur, tele: o.tele || 0, k: 0, once: true, done: false, pop() { this.done = true; }, // (one burn takes one health, not one each time the hurt wears off)
      update(dt) {
        this.k = this.t < this.tele ? this.t / Math.max(0.01, this.tele) : 1;
        if (this.t > this.tele + dur) this.dead = true;
        this.srcX = B.sun.x;
        if (this.t >= this.tele && Math.random() < dt * 12) {
          const x = G.rand(WL, WR);
          if (!(o.safe || inShade)(x, FLOOR - 4)) G.fx.spawn({ kind: 'spark', x, y: FLOOR - 2, vx: G.rand(-20, 20), vy: -G.rand(80, 260), life: G.rand(0.3, 0.6), size: G.rand(1.5, 3), color: BURN, len: 0.04 });
        }
      },
      hits(P) {
        if (this.t < this.tele || this.done) return false;
        return !(o.safe || inShade)(P.x, P.y - 30);
      },
      draw() { }, // (drawn with the shade, in drawGround: the glare of noon over all that is lit)
    });
  }

  // ------------------------------------------------------------------ helpers
  const facePlayer = () => { const b = B.body; b.face = G.sign(G.player.x - b.x) || b.face; };
  const clampX = (x) => G.clamp(x, WL + 50, WR - 50);
  function setPose(name, fast) { const b = B.body; b.pose = name; b.fast = !!fast; }
  // a blade swing of her fallen form: drawn by her, its hits a slice of a circle (hazards.js H.arc),
  // which a heavy blow of the hero's can clash with. o: a0, a1 (in her facing), r, tele, active, dmg, trail
  function swing(o) {
    const b = B.body, f = b.face;
    const conv = (a) => (f > 0 ? a : Math.PI - a);
    const h = H.arc({
      x: b.x + f * (o.dx || 10), y: b.y - (o.dy == null ? 58 : o.dy), r: o.r || 150, r0: o.r0 || 0,
      a0: conv(o.a0), a1: conv(o.a1), tele: o.tele, active: o.active || 0.12, dmg: o.dmg || 1, owner: b, heavy: !!o.heavy,
      tint: B.phase === 3 ? { boss: RIM, hot: RIMHOT } : { boss: FALL, hot: '255,244,214' },
      follow: o.follow || ((hh) => { hh.x = b.x + b.face * (o.dx || 10); hh.y = b.y - (o.dy == null ? 58 : o.dy); }),
      onFire(hh) {
        AU.play('solBlade', { k: o.k || 0 });
        if (o.trail) trailOf(hh, o.trailLife); // (only the last cut of a string leaves one hanging)
        if (o.onFire) o.onFire(hh);
      },
    });
    return h;
  }
  // (v-new) What her blade leaves in the air: a crescent of light that hangs and burns for a moment.
  function trailOf(hh, life) {
    life = life || (K.hard() ? 0.8 : K.gentle() ? 0.2 : 0.35);
    const arc = { x: hh.x, y: hh.y, r: hh.r, a0: hh.a0, a1: hh.a1 };
    H.add({
      kind: 'trail', layer: 'over', srcX: arc.x, tint: hh.tint, dmg: 1, arc, life, delay: hh.active + 0.04,
      update() { if (this.t > this.delay + this.life) this.dead = true; },
      hits(P) {
        if (this.t < this.delay) return false;
        const sg = arc.a1 >= arc.a0 ? 1 : -1, span = Math.abs(arc.a1 - arc.a0);
        for (const py of [P.y - 21, P.y - 39]) {
          const dx = P.x - arc.x, dy = py - arc.y, d = Math.hypot(dx, dy);
          if (Math.abs(d - arc.r * 0.86) > 10) continue;
          const a = (((Math.atan2(dy, dx) - arc.a0) * sg) % G.TAU + G.TAU) % G.TAU;
          if (a <= span) return true;
        }
        return false;
      },
      draw(ctx) {
        if (this.t < this.delay) return;
        const k = 1 - (this.t - this.delay) / this.life, c = this.tint || { boss: FALL, hot: SUNHOT };
        const ccw = arc.a1 < arc.a0;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.strokeStyle = G.rgba(c.boss, 0.35 * k); ctx.lineWidth = 16;
        ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.r * 0.86, arc.a0, arc.a1, ccw); ctx.stroke();
        ctx.strokeStyle = G.rgba(c.hot, 0.85 * k); ctx.lineWidth = 3 + 3 * k;
        ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.r * 0.86, arc.a0, arc.a1, ccw); ctx.stroke();
        ctx.restore();
        if (Math.random() < 0.3) { const a = G.lerp(arc.a0, arc.a1, Math.random()); G.fx.spawn({ kind: 'spark', x: arc.x + Math.cos(a) * arc.r * 0.86, y: arc.y + Math.sin(a) * arc.r * 0.86, vx: G.rand(-30, 30), vy: G.rand(-60, 20), life: 0.3, size: 2, color: c.hot }); }
      },
    });
  }
  function* stepTo(x, dur, ease) {
    const b = B.body, x0 = b.x;
    x = clampX(x);
    let e = 0;
    while (e < dur) { const dt = yield; e += dt; b.x = G.lerp(x0, x, (ease || E.outCubic)(Math.min(1, e / dur))); }
    b.x = x;
  }
  function* stepIn(dist, dur) { const b = B.body; yield* stepTo(b.x + b.face * dist, dur || 0.18); }
  // a leap in an arc, landing at x
  function* leapTo(x, hgt, dur, pose) {
    const b = B.body, x0 = b.x, y0 = b.y;
    x = clampX(x);
    if (pose) setPose(pose);
    b.air = true; AU.play('jump');
    let e = 0;
    while (e < dur) { const dt = yield; e += dt; const k = Math.min(1, e / dur); b.x = G.lerp(x0, x, E.inOutQuad(k)); b.y = G.lerp(y0, FLOOR, k) - hgt * Math.sin(Math.PI * k); }
    b.x = x; b.y = FLOOR; b.air = false;
    AU.play('land'); G.fx.dust(b.x, FLOOR, 3, { speed: [40, 160], size: [5, 10], up: 30 });
  }
  // an afterimage of her fallen form, left as she moves fast
  function ghost(life) { const b = B.body; B.ghosts.push({ x: b.x, y: b.y, face: b.face, p: b.p.slice(), t: 0, life: life || 0.3, blade: b.bladeA }); }

  // ------------------------------------------------------------------ her fallen form: living and drawing
  // Each pose value on its own spring: a little under-damped, so a cut overshoots and settles; b.fast
  // stiffens them for the strike itself. A swing reads its blade angle from here too.
  function living(b, dt) {
    const want = POSES[b.pose] || IDLE_P, w = b.fast ? 46 : 17, z = b.fast ? 0.72 : 0.62;
    for (let i = 0; i < NP; i++) {
      let tgt = want[i];
      if (b.pose === 'walk' && (i === 2 || i === 3)) tgt += Math.sin(b.walkT * 9) * 12 * (i === 2 ? 1 : -1);
      if (i === 8) { // (the blade's angle takes the short way round)
        let d = tgt - b.p[8];
        while (d > Math.PI) d -= G.TAU; while (d < -Math.PI) d += G.TAU;
        tgt = b.p[8] + d;
      }
      const a = -w * w * (b.p[i] - tgt) - 2 * z * w * b.pv[i];
      b.pv[i] += a * dt; b.p[i] += b.pv[i] * dt;
    }
    // breath, and the light running in the cracks of her plate
    b.breath = Math.sin(B.t * 2.2);
    b.bladeA = b.p[8];
  }
  // her joints in the world, from the pose (b.p): what draws her and where her blade's point is
  function jointsOf(b, p) {
    const f = b.face, x = b.x, y = b.y, br = b.breath || 0;
    const hipX = x - f * 2, hipY = y - p[1] + br * 0.6;
    const L = p[0];
    const shX = hipX + f * Math.sin(L) * 40, shY = hipY - Math.cos(L) * 40 + br * 0.8;
    const head = { x: shX + f * Math.sin(L) * 16, y: shY - Math.cos(L) * 16 - 4 };
    const fF = { x: x + f * p[2], y: Math.min(y, FLOOR) }, fB = { x: x + f * p[3], y: Math.min(y, FLOOR) };
    if (b.air) { fF.y = y - 6; fB.y = y - 14; }
    const hand = { x: x + f * p[4], y: y + p[5] + br }, off = { x: x + f * p[6], y: y + p[7] + br };
    const ba = f > 0 ? p[8] : Math.PI - p[8];
    const tip = { x: hand.x + Math.cos(ba) * 112, y: hand.y + Math.sin(ba) * 112 };
    return { hipX, hipY, shX, shY, head, fF, fB, hand, off, ba, tip };
  }
  // Her fallen form: a sleek dark figure with a thin rim of light, drawn as the heroes and the Champion are
  // (flat fills, light only at the edges and at the points that matter). Fitted armour marked by a few
  // lines; very long hair streaming behind her; eyes that glow; and behind her head a great halo of thin
  // rings and rays, turning, her signature. In the eclipse the fills go black and the rim burns.
  const PL = { body: '#d8cab6', bodyD: '#2e2232', hair: '#221624', trim: '255,190,110', skin: '#ecd8c8', crack: FALL };
  const PL3 = { body: '#0c0608', bodyD: '#060304', hair: '#080405', trim: RIM, skin: '#140a0a', crack: RIM };
  // Her halo: a small copy of the noon sun's wheel behind her head (an hour ring, a crown of short blades
  // turning, four points of light); in the eclipse a black sun fills it, with an ember rim.
  function drawHalo(ctx, cx, cy, k, ecl, t) {
    const c = ecl ? RIM : SUNHOT, c2 = ecl ? RIMHOT : SUN, R = 34 + 6 * k;
    ctx.save(); ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    D.glow(ctx, ecl ? RIM : SUN, cx, cy, 60 + 34 * k, 0.2 + 0.3 * k);
    // the crown: twelve short blades, and twelve hair-thin ones between, turning
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * G.TAU + t * 0.25;
      sunBlade(ctx, cx, cy, a, R + 2, R + (i % 3 === 0 ? 13 : 8) + 8 * k, 3, ecl ? RIM : FALL, 0.7 + 0.3 * k);
      const a2 = a + G.TAU / 24;
      ctx.strokeStyle = G.rgba(c, 0.5); ctx.lineWidth = 1;
      D.line(ctx, cx + Math.cos(a2) * (R + 3), cy + Math.sin(a2) * (R + 3), cx + Math.cos(a2) * (R + 8 + 6 * k), cy + Math.sin(a2) * (R + 8 + 6 * k));
    }
    ctx.restore();
    ctx.save(); ctx.lineCap = 'round';
    if (ecl) {
      // the black sun behind her head
      ctx.fillStyle = 'rgba(2,0,1,0.92)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.94, 0, G.TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(c, 0.95); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, G.TAU); ctx.stroke();
    // the hours, marked on an inner ring, turning the other way
    const r2 = R * 0.74;
    ctx.strokeStyle = G.rgba(c, 0.45); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r2, 0, G.TAU); ctx.stroke();
    ctx.strokeStyle = G.rgba(c, 0.8);
    for (let i = 0; i < 12; i++) { const a = i / 12 * G.TAU - t * 0.18, l = i % 3 === 0 ? 5 : 2.5; D.line(ctx, cx + Math.cos(a) * (r2 - l), cy + Math.sin(a) * (r2 - l), cx + Math.cos(a) * (r2 + l), cy + Math.sin(a) * (r2 + l)); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * G.TAU - t * 0.35; D.glow(ctx, c2, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 8, 0.95); }
    ctx.restore();
  }
  // Her wings: two fans of blades of light off her back, the sun's crown made hers. Folded down behind her
  // at rest; they open (b.wingK) when she gathers light (her crown moves) and in the air. Drawn in her own
  // space (facing right, so her back is -x). In the eclipse they are black with an ember edge.
  function drawWings(ctx, b, shx, shy, ecl, ghost) {
    const wk = b.wingK != null ? b.wingK : (b.crownK || 0) * 0.8 + 0.15, t = B.t;
    const wing = (ox, oy, sc, a0) => {
      // feather 0 is the leading edge (long, up and back when open), 6 the trailing (short, back and down);
      // folded, all of them lie down along her back. (They turn the long way round, through "back".)
      for (let i = 6; i >= 0; i--) {
        const q = i / 6;
        const fold = G.lerp(1.72, 2.3, q), spread = G.lerp(4.25, 2.8, q) + 0.06 * Math.sin(t * 2 + i);
        const a = G.lerp(fold, spread, wk) + 0.03 * Math.sin(t * 2.4 + i * 0.7);
        const len = G.lerp(112, 46, q) * (0.55 + 0.5 * wk) * sc, w = G.lerp(7.5, 5, q) * sc;
        const rx = shx + ox - 6, ry = shy + oy + 12;
        const x0 = rx + Math.cos(a) * 3, y0 = ry + Math.sin(a) * 3;
        if (ecl) {
          ctx.fillStyle = 'rgba(4,1,2,' + (0.95 * a0) + ')';
          sunBladePath(ctx, x0, y0, a, 0, len, w); ctx.fill();
          ctx.strokeStyle = G.rgba(RIM, 0.85 * a0); ctx.lineWidth = 1.1; ctx.stroke();
        } else {
          // (a flat fill, so where they overlap at the root it does not burn white; light only on the spine)
          ctx.fillStyle = i % 2 ? 'rgba(246,206,140,' + (0.8 * a0) + ')' : 'rgba(236,176,104,' + (0.8 * a0) + ')';
          sunBladePath(ctx, x0, y0, a, 0, len, w); ctx.fill();
          ctx.strokeStyle = G.rgba('255,190,110', 0.9 * a0); ctx.lineWidth = 1; ctx.stroke();
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = G.rgba(SUNHOT, (0.35 + 0.45 * wk) * a0); ctx.lineWidth = 1.2;
          D.line(ctx, x0, y0, x0 + Math.cos(a) * (len - 4), y0 + Math.sin(a) * (len - 4));
          ctx.restore();
        }
      }
    };
    wing(5, -3, 0.85, ghost ? 0.5 : 0.6); // the far wing
    wing(0, 0, 1, 1);
    if (!ecl && !ghost) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; D.glow(ctx, SUN, shx - 6, shy + 12, 22 + 22 * wk, 0.3 + 0.3 * wk); ctx.restore(); }
  }
  function drawFig(ctx, b, alpha, o) {
    o = o || {};
    if (alpha <= 0.01) return jointsOf(b, o.p || b.p);
    const p = o.p || b.p, J = jointsOf(b, p), f = b.face, ecl = (b.eclipse || 0) > 0.5, C = ecl ? PL3 : PL;
    const rimC = ecl ? RIM : C.trim, rimA = ecl ? 0.9 : 0.95;
    const L = p[0], hip = -p[1] + (b.breath || 0) * 0.6;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const real = !o.ghost && b === B.body;
    // the halo, behind everything of her (in the world, so it can be big and steady)
    if (!o.ghost) drawHalo(ctx, J.head.x - f * 6, J.head.y - 4, b.crownK || 0, ecl, B.t);
    // her hair: a long dark ribbon streaming behind her with light along its edge (kept in the world)
    if (real && B.hairPts) {
      const strand = (pts, w0, a) => {
        ctx.fillStyle = C.hair; D.ribbon(ctx, pts, w0, 1.5, 0); ctx.fill();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = G.rgba(rimC, a); ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      };
      if (B.hairPts3) strand(B.hairPts3, 10, ecl ? 0.5 : 0.3);
      if (B.hairPts2) strand(B.hairPts2, 12, ecl ? 0.6 : 0.35);
      strand(B.hairPts, 17, ecl ? 0.85 : 0.55);
    }
    ctx.translate(b.x, b.y);
    if (!o.ghost) K.recoil(ctx, b);
    ctx.scale(o.ghost ? f : K.faceX(b, 0.25), 1);
    // her wings, over the hair and behind the rest of her
    drawWings(ctx, b, Math.sin(L) * 40 - 2, hip - Math.cos(L) * 40 + (b.breath || 0) * 0.8, ecl, !!o.ghost);
    if (!o.ghost && b.flash > 0) D.glow(ctx, '255,255,255', 0, -56, 70, b.flash * 0.3);
    const rimS = (w, a) => { ctx.strokeStyle = G.rgba(rimC, a == null ? rimA : a); ctx.lineWidth = w || 1; ctx.stroke(); };
    const shx = Math.sin(L) * 40 - 2, shy = hip - Math.cos(L) * 40 + (b.breath || 0) * 0.8;
    const hx = shx + Math.sin(L) * 15, hy = shy - Math.cos(L) * 15 - 3;
    const air = b.air;
    const leg = (front) => {
      const lx = front ? 4 : -5, fx = p[front ? 2 : 3], fy = air ? (front ? -6 : -14) : 0;
      const k = D.ik(lx, hip, fx, fy - 3, 31, 30, -1);
      ctx.fillStyle = C.bodyD;
      D.limb(ctx, lx, hip, k.jx, k.jy, 11, 7.5); ctx.fill(); if (front) rimS(1, rimA * 0.6);
      ctx.fillStyle = front ? C.body : C.bodyD;
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 8, 5); ctx.fill(); if (front) rimS(1);
      // a long pointed greave to the toe
      D.poly(ctx, [k.ex - 4, k.ey - 4, k.ex + 3, k.ey - 5, k.ex + 13, k.ey + 2, k.ex - 4, k.ey + 3]); ctx.fill(); if (front) rimS(1);
      if (front) { ctx.strokeStyle = G.rgba(rimC, rimA * 0.8); ctx.lineWidth = 1; D.line(ctx, k.jx - 2, k.jy + 4, k.ex - 1, k.ey - 6); }
    };
    const arm = (front) => {
      const ax = shx + (front ? 5 : -6), ay = shy + 4;
      const tx = p[front ? 4 : 6], ty = p[front ? 5 : 7] + (b.breath || 0);
      const k = D.ik(ax, ay, tx, ty, 21, 21, 1);
      ctx.fillStyle = C.bodyD;
      D.limb(ctx, ax, ay, k.jx, k.jy, 7.5, 6); ctx.fill(); if (front) rimS(1, rimA * 0.6);
      ctx.fillStyle = front ? C.body : C.bodyD;
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 7, 5.5); ctx.fill(); if (front) rimS(1);
      ctx.fillStyle = C.bodyD; ctx.beginPath(); ctx.arc(k.ex, k.ey, 3.6, 0, G.TAU); ctx.fill();
      ctx.fillStyle = front ? C.body : C.bodyD;
      // a small swept plate at the shoulder
      D.poly(ctx, [ax - 6, ay - 1, ax - 1, ay - 7, ax + 8, ay - 5, ax + 7, ay + 3]); ctx.fill(); if (front) rimS(1);
      return k;
    };
    leg(false);
    const rear = arm(false);
    // a long armoured skirt split at the front: two tails off the back of her waist, swept by her motion,
    // and the plates over her hips
    const sk = b.skirt || 0;
    ctx.fillStyle = C.bodyD;
    D.poly(ctx, [-9, hip - 6, -1, hip - 4, -8 - sk * 8, hip + 52, -20 - sk * 12, hip + 58, -32 - sk * 14, hip + 46]); ctx.fill(); rimS(1, rimA * 0.75);
    D.poly(ctx, [-5, hip - 4, 4, hip - 3, 2 - sk * 5, hip + 38, -8 - sk * 7, hip + 44]); ctx.fill(); rimS(1, rimA * 0.7);
    // the body: fitted, narrow at the waist, the line of the armour drawn on it
    ctx.fillStyle = C.body;
    const wx0 = (shx - 2) * 0.45, wy0 = (shy + hip) * 0.5 + 4;
    ctx.fillStyle = C.bodyD;
    D.poly(ctx, [-8, hip + 2, 8, hip + 2, wx0 + 6, wy0, shx + 10, shy + 7, shx + 8, shy - 2, shx, shy - 5, shx - 8, shy - 3, shx - 10, shy + 6, wx0 - 6, wy0]); ctx.fill(); rimS(1.2, rimA * 0.7);
    // the breastplate, down to a point at the waist
    ctx.fillStyle = C.body;
    D.poly(ctx, [shx + 10, shy + 7, shx + 8, shy - 2, shx, shy - 5, shx - 8, shy - 3, shx - 10, shy + 6, wx0 - 4, wy0 - 2, wx0 + 2, wy0 + 5, wx0 + 6, wy0 - 3]); ctx.fill(); rimS(1.2);
    ctx.strokeStyle = G.rgba(rimC, rimA * 0.9); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(shx - 6, shy + 2); ctx.quadraticCurveTo(wx0 + 2, wy0 - 6, wx0 - 2, wy0 + 6); ctx.moveTo(-7, hip - 2); ctx.lineTo(7, hip - 2); ctx.stroke();
    // the light in her: a point at the breast, and the cracks of the fall
    if (!o.ghost) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      D.glow(ctx, C.crack, shx + 2, shy + 9, 12, 0.8);
      ctx.fillStyle = G.rgba(ecl ? RIMHOT : SUNHOT, 1); ctx.beginPath(); ctx.arc(shx + 2, shy + 9, 1.8, 0, G.TAU); ctx.fill();
      ctx.restore();
    }
    leg(true);
    // the front plate of the skirt, over the thigh, a line of light down its edge
    ctx.fillStyle = C.body;
    D.poly(ctx, [-7, hip - 4, 10, hip - 3, 14 - sk * 3, hip + 22, 6 - sk * 4, hip + 30, -3, hip + 18]); ctx.fill(); rimS(1.1);
    ctx.strokeStyle = G.rgba(rimC, rimA * 0.8); ctx.lineWidth = 1; D.line(ctx, 2, hip, 5 - sk * 3, hip + 24);
    // a sash of light at the waist
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(ecl ? RIM : SUN, 0.75); ctx.lineWidth = 1.6; D.line(ctx, -8, hip - 4, 9, hip - 3);
    ctx.restore();
    // the head: a small face in shadow, two eyes of light, the hair falling over the brow
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(L * 0.35);
    ctx.fillStyle = C.skin;
    D.poly(ctx, [-6, -6, 4, -8, 8, -3, 8.5, 2, 6, 6, 1, 8, -4, 6, -7, 1]); ctx.fill();
    ctx.fillStyle = C.hair;
    D.poly(ctx, [-6, 16, -12, 8, -12, -5, -6, -12, 3, -13, 10, -8, 11, -1, 9, 6, 7, -3, 3, -4, 1, 2, -2, -3, -5, 4, -3, 12]); ctx.fill(); rimS(1);
    const eyesOpen = b.eyes != null ? b.eyes : 1, ec = ecl ? RIMHOT : SUNHOT;
    if (eyesOpen > 0.5) { if (!o.ghost) D.glow(ctx, ec, 6, 0.5, 5, 0.55); ctx.fillStyle = G.rgba(ec, 1); D.poly(ctx, [3.5, -0.5, 8, -1, 7.5, 1.4, 4, 1.2]); ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(40,24,30,0.9)'; ctx.lineWidth = 1.1; D.line(ctx, 3.5, 0.5, 8, 0.6); }
    ctx.restore();
    // the blade arm, and the blade of noon (the brightest thing on her)
    const lead = arm(true);
    if (b.palm > 0 && !o.ghost) D.glow(ctx, BURN, rear.ex, rear.ey, 30, b.palm);
    if (b.blade !== false && !o.noBlade) drawBlade(ctx, lead.ex, lead.ey, p[8], 1, b.bladeK == null ? 1 : b.bladeK, ecl ? 1 : 0);
    ctx.restore();
    return J;
  }
  function drawBlade(ctx, x, y, a, f, k, ecl) {
    if (k <= 0.01) return;
    const len = 104 * k, cv = 10 * k * f; // (it curves away from the cutting edge)
    const tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len;
    const nx = -Math.sin(a), ny = Math.cos(a);
    const mx = (x + tx) / 2 - nx * cv, my = (y + ty) / 2 - ny * cv;
    const col = ecl > 0.5 ? RIM : FALL, hot = ecl > 0.5 ? RIMHOT : SUNHOT;
    // the back of the blade, dark; the edge, light
    ctx.fillStyle = ecl > 0.5 ? '#0a0404' : '#2a1c20';
    ctx.beginPath(); ctx.moveTo(x - nx * 2, y - ny * 2); ctx.quadraticCurveTo(mx - nx * 4, my - ny * 4, tx, ty); ctx.quadraticCurveTo(mx + nx * 1, my + ny * 1, x + nx * 2, y + ny * 2); ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = G.rgba(col, 0.35); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
    ctx.strokeStyle = G.rgba(hot, 1); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x + nx * 1.5, y + ny * 1.5); ctx.quadraticCurveTo(mx + nx * 1.5, my + ny * 1.5, tx, ty); ctx.stroke();
    ctx.restore();
    // the guard
    ctx.fillStyle = G.rgba(ecl > 0.5 ? RIM : '255,214,150', 0.9);
    ctx.beginPath(); ctx.ellipse(x, y, 2.5, 6, a + Math.PI / 2, 0, G.TAU); ctx.fill();
  }

  // ------------------------------------------------------------------ her noon form: the sun and the hands
  // The sun hangs in the sky (B.sun), the hands come down out of it on long arms of light. The hands
  // are drawn among the fight (B.draw); the sun and its corona behind everything (drawGround).
  // a blade of light: a long thin point out from the disc, flat, with a hot line down its middle
  function sunBlade(ctx, x, y, a, r0, r1, w, col, a1) {
    ctx.fillStyle = G.rgba(col, a1);
    sunBladePath(ctx, x, y, a, r0, r1, w); ctx.fill();
  }
  function sunBladePath(ctx, x, y, a, r0, r1, w) {
    const c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
    ctx.beginPath();
    ctx.moveTo(x + c * r0 + nx * w, y + s * r0 + ny * w);
    ctx.lineTo(x + c * r1, y + s * r1);
    ctx.lineTo(x + c * r0 - nx * w, y + s * r0 - ny * w);
    ctx.closePath();
  }
  function drawCorona(ctx, x, y, r, k, t) {
    // a wide haze, and slow shafts of light falling from her across the sky
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    D.glow(ctx, SUN, x, y, r * (3.4 + 1.2 * k), 0.10 + 0.22 * k);
    D.glow(ctx, FALL, x, y, r * 1.9, 0.35 + 0.3 * k);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * 0.5 + (i - 2) * 0.34 + Math.sin(t * 0.15 + i * 1.7) * 0.06, len = r * (7 + i % 2 * 2), w = r * (0.35 + 0.12 * (i % 3));
      const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.addColorStop(0, G.rgba(SUN, 0.07 + 0.08 * k)); g.addColorStop(1, G.rgba(SUN, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - Math.sin(a) * r * 0.3, y + Math.cos(a) * r * 0.3);
      ctx.lineTo(x + Math.cos(a) * len - Math.sin(a) * w, y + Math.sin(a) * len + Math.cos(a) * w);
      ctx.lineTo(x + Math.cos(a) * len + Math.sin(a) * w, y + Math.sin(a) * len - Math.cos(a) * w);
      ctx.lineTo(x + Math.sin(a) * r * 0.3, y - Math.cos(a) * r * 0.3); ctx.closePath(); ctx.fill();
    }
    // the back crown: twelve long blades, turning one way; they reach out as she gathers light (k)
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * G.TAU + t * 0.05, wav = Math.sin(t * 1.3 + i * 1.9) * 0.05;
      const r1 = r * (1.95 + (i % 3 === 0 ? 0.35 : 0) + 0.7 * k + wav);
      sunBlade(ctx, x, y, a, r * 1.02, r1, r * 0.11, FALL, 0.55 + 0.3 * k);
      ctx.strokeStyle = G.rgba(SUNHOT, 0.6 + 0.4 * k); ctx.lineWidth = 1.2;
      D.line(ctx, x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1, x + Math.cos(a) * (r1 - 4), y + Math.sin(a) * (r1 - 4));
    }
    // the front crown: twelve short blades between them, turning the other way
    for (let i = 0; i < 12; i++) {
      const a = (i + 0.5) / 12 * G.TAU - t * 0.08;
      sunBlade(ctx, x, y, a, r * 1.0, r * (1.42 + 0.25 * k), r * 0.075, SUN, 0.7 + 0.3 * k);
    }
    ctx.restore();
    // the hour ring: a thin ring with the marks of a sundial on it, and four points, turning slowly
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const R = r * 1.2;
    ctx.strokeStyle = G.rgba(SUNHOT, 0.55 + 0.3 * k); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, R, 0, G.TAU); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * G.TAU - t * 0.03, big = i % 6 === 0, l = big ? 9 : 4;
      D.line(ctx, x + Math.cos(a) * (R - l), y + Math.sin(a) * (R - l), x + Math.cos(a) * (R + (big ? 3 : 0)), y + Math.sin(a) * (R + (big ? 3 : 0)));
      if (big) D.glow(ctx, SUNHOT, x + Math.cos(a) * R, y + Math.sin(a) * R, 9, 0.9);
    }
    ctx.restore();
  }
  // The sun at noon: no face. A wheel of flat light: bands from a deep gold edge to a white heart, her glyph
  // in it, an hour ring round it, and a double crown of blades of light. F.eyes is how hard it blazes (her
  // tell for a burn); F.mouth draws the crown in (a breath before a blow); F.crack splits the disc (the
  // Fall); F.sink brings it down to the ridge.
  function drawFace(ctx) {
    const s = B.sun, F = B.faceS, t = B.t;
    if (F.alpha <= 0.01) return;
    const x = s.x, y = s.y + F.sink, r = 72 * F.scale * (1 - 0.1 * F.mouth);
    ctx.save();
    ctx.globalAlpha = F.alpha;
    drawCorona(ctx, x, y, r, Math.max(B.flare, F.eyes * 0.8) * (1 - F.mouth), t);
    // the disc: flat bands of light, deep gold at the edge to white at the heart
    const bands = [[1, '#e0874a'], [0.9, '#f0a85e'], [0.76, '#f8c880'], [0.6, '#fcd28c'], [0.42, '#fde0a4']];
    for (const [k, c] of bands) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r * k, 0, G.TAU); ctx.fill(); }
    // a thin dark ring inside the rim: the eclipse to come
    ctx.strokeStyle = 'rgba(110,44,28,0.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, G.TAU); ctx.stroke();
    // her glyph: a thin ring, the twelve hours as points on it, and a four-pointed star at the heart, turning
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(SUNHOT, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y, r * 0.68, 0, G.TAU); ctx.stroke();
    ctx.fillStyle = G.rgba(SUNHOT, 0.95);
    for (let i = 0; i < 12; i++) { const a = i / 12 * G.TAU + t * 0.06; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.68, y + Math.sin(a) * r * 0.68, i % 3 === 0 ? 2.6 : 1.4, 0, G.TAU); ctx.fill(); }
    D.glow(ctx, SUNHOT, x, y, r * 0.42, 0.08 + 0.6 * F.eyes);
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(-t * 0.1);
    ctx.fillStyle = '#fffdf6';
    const q = r * 0.3, w = r * 0.07;
    ctx.beginPath(); ctx.moveTo(0, -q); ctx.lineTo(w, -w); ctx.lineTo(q, 0); ctx.lineTo(w, w); ctx.lineTo(0, q); ctx.lineTo(-w, w); ctx.lineTo(-q, 0); ctx.lineTo(-w, -w); ctx.closePath(); ctx.fill();
    ctx.restore();
    // the rim
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(SUNHOT, 1); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r, 0, G.TAU); ctx.stroke();
    ctx.restore();
    // blazing: the disc burns white from the heart out
    if (F.eyes > 0.02) {
      ctx.fillStyle = G.rgba('255,255,248', 0.9 * F.eyes); ctx.beginPath(); ctx.arc(x, y, r * (0.5 + 0.5 * F.eyes), 0, G.TAU); ctx.fill();
      D.glow(ctx, SUNHOT, x, y, r * 2.4, 0.5 * F.eyes);
    }
    // cracks: dark lines across the disc, opening as she breaks (the Fall)
    if (F.crack > 0.01) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, G.TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(60,24,20,' + (0.6 + 0.4 * F.crack) + ')'; ctx.lineWidth = 1.5 + 4 * F.crack;
      ctx.beginPath();
      const cr = [[-0.1, -1, 0.05, -0.4, -0.08, 0.15, 0.06, 1], [0.05, -0.4, 0.5, -0.2, 0.9, -0.45], [-0.08, 0.15, -0.55, 0.3, -0.95, 0.2], [0.06, 0.6, 0.45, 0.75]];
      for (const c of cr) { ctx.moveTo(x + c[0] * r, y + c[1] * r); for (let i = 2; i < c.length; i += 2) ctx.lineTo(x + c[i] * r * Math.min(1, F.crack * 1.4), y + c[i + 1] * r * Math.min(1, F.crack * 1.4)); }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  // A hand: h.x, h.y the middle of the palm; h.side which side of her it is (-1 left, 1 right); the
  // fingers reach towards the middle. h.open 0 (a fist) .. 1 (spread); h.curl how far the fingers bend
  // down; h.rot the tilt of the palm; h.knuck: knuckles leading (the low rake).
  function drawHand(ctx, h) {
    if (h.gone >= 1) return;
    const f = -h.side; // the fingers point inward
    const a = h.alpha == null ? 1 : h.alpha;
    ctx.save();
    ctx.globalAlpha = a * (1 - (h.gone || 0));
    // the arm of light: a thin line out of the sun, bowing outward, to the wrist
    const wx = h.x - f * 78 * Math.cos(h.rot), wy = h.y - f * 78 * Math.sin(h.rot);
    const S = B.sun, ax = S.x + h.side * 74 * B.faceS.scale, ay = S.y + B.faceS.sink + 20;
    const ex = (ax + wx) / 2 + h.side * 110, ey = Math.min(ay, wy) + 10;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const arc = () => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ex, ey, wx, wy); };
    ctx.strokeStyle = G.rgba(SUN, 0.22); ctx.lineWidth = 10; arc(); ctx.stroke();
    ctx.strokeStyle = G.rgba(SUNHOT, 0.85); ctx.lineWidth = 2; arc(); ctx.stroke();
    ctx.restore();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rot);
    ctx.scale(f * HAND_S, HAND_S);
    const cr = h.broken ? 1 : h.crack, hurt = cr > 0.98;
    const fill = hurt ? '#3a1a14' : '#1c1218', rimC = hurt ? BURN : SUN;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // one silhouette: the palm and four long fingers ending in points, and the thumb
    const spread = 0.2 * h.open, curl = G.clamp(h.curl + (1 - h.open) * 1.2, 0, 2.2);
    const shape = new Path2D();
    shape.moveTo(-78, -30); shape.lineTo(18, -38); shape.lineTo(30, 30); shape.lineTo(-72, 34); shape.closePath();
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const by = -28 + i * 19, ang0 = (i - 1.5) * spread;
      const L = [[40, 34, 26], [46, 38, 30], [44, 36, 28], [34, 28, 22]][i];
      let x0 = 20, y0 = by, ang = ang0;
      const pts = [[x0, y0]];
      for (let j = 0; j < 3; j++) { ang += curl * (j === 0 ? 0.35 : 0.45); x0 += Math.cos(ang) * L[j]; y0 += Math.sin(ang) * L[j]; pts.push([x0, y0]); }
      fingers.push(pts);
    }
    const tc = 0.8 + curl * 0.5;
    const thumb = [[-30, 26], [-26 + Math.cos(tc) * 34, 30 + Math.sin(tc) * 34], [-26 + Math.cos(tc) * 34 + Math.cos(tc + 0.5) * 22, 30 + Math.sin(tc) * 34 + Math.sin(tc + 0.5) * 22]];
    const digit = (pts, w0) => {
      for (let j = 0; j < pts.length - 1; j++) {
        const [x0, y0] = pts[j], [x1, y1] = pts[j + 1], last = j === pts.length - 2;
        const w = w0 - j * 3, an = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(an), ny = Math.cos(an);
        if (last) { shape.moveTo(x0 + nx * w / 2, y0 + ny * w / 2); shape.lineTo(x1, y1); shape.lineTo(x0 - nx * w / 2, y0 - ny * w / 2); shape.closePath(); }
        else { shape.moveTo(x0 + nx * w / 2, y0 + ny * w / 2); shape.lineTo(x1 + nx * (w - 2) / 2, y1 + ny * (w - 2) / 2); shape.lineTo(x1 - nx * (w - 2) / 2, y1 - ny * (w - 2) / 2); shape.lineTo(x0 - nx * w / 2, y0 - ny * w / 2); shape.closePath(); }
      }
    };
    for (const fp of fingers) digit(fp, 15);
    digit(thumb, 17);
    // the cuff, short, open at the wrist
    shape.moveTo(-104, -24); shape.lineTo(-74, -32); shape.lineTo(-70, 36); shape.lineTo(-100, 28); shape.closePath();
    ctx.fillStyle = fill; ctx.fill(shape, 'nonzero');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(rimC, 0.85); ctx.lineWidth = 2; ctx.stroke(shape);
    // her glyph on the back of the hand: a ring and a point; it brightens as the hand is hurt
    ctx.strokeStyle = G.rgba(SUNHOT, 0.7 + 0.3 * cr); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(-28, -2, 15, 0, G.TAU); ctx.stroke();
    D.glow(ctx, hurt ? BURN : SUNHOT, -28, -2, 22 + 26 * cr, 0.5 + 0.4 * cr);
    ctx.fillStyle = G.rgba(SUNHOT, 1); ctx.beginPath(); ctx.arc(-28, -2, 3.5, 0, G.TAU); ctx.fill();
    // hurt: lines of light breaking across it
    if (cr > 0.3) {
      ctx.strokeStyle = G.rgba(hurt ? BURN : SUNHOT, 0.5 + 0.5 * cr); ctx.lineWidth = 1.2 + 2 * cr;
      ctx.beginPath(); ctx.moveTo(-70, -6); ctx.lineTo(-44, 0); ctx.moveTo(-12, -6); ctx.lineTo(16, -16);
      if (cr > 0.7) { ctx.moveTo(-50, 28); ctx.lineTo(-36, 12); ctx.moveTo(-20, 12); ctx.lineTo(-4, 28); }
      ctx.stroke();
    }
    if (h.glow > 0.01) D.glow(ctx, SUNHOT, 0, 0, 140, h.glow);
    if (h.flash > 0) { ctx.globalAlpha = h.flash * 0.5; ctx.fillStyle = '#ffffff'; ctx.fill(shape); }
    ctx.restore();
    ctx.restore();
  }
  // the shadow a hand throws on the ridge as it comes down: its own warning (darker and smaller as it
  // nears the floor), and the shade it gives when it hovers low
  function drawHandShadow(ctx, h) {
    if (h.gone >= 1) return;
    const hgt = G.clamp((FLOOR - h.y) / 420, 0, 1);
    const w = 110 + 120 * hgt, a = (0.5 - 0.35 * hgt) * (h.shadowK == null ? 1 : h.shadowK);
    ctx.fillStyle = 'rgba(30,18,10,' + a + ')';
    ctx.beginPath(); ctx.ellipse(h.x, FLOOR + 2, w, 14 - 6 * hgt, 0, 0, G.TAU); ctx.fill();
  }

  // ------------------------------------------------------------------ state
  const HAND_REST = [{ x: MID - 400, y: FLOOR - 270 }, { x: MID + 400, y: FLOOR - 270 }];
  function newHand(i) {
    const side = i ? 1 : -1, r = HAND_REST[i];
    return { i, side, x: r.x, y: r.y, tx: r.x, ty: r.y, vx: 0, vy: 0, rot: 0.15 * side, trot: 0.15 * side, open: 0.7, curl: 0.3, tcurl: 0.3, topen: 0.7,
      crack: 0, dmg: 0, broken: false, glow: 0, flash: 0, shade: false, gone: 0, alpha: 1, busy: false, low: false, stuck: 0, shadowK: 1 };
  }
  B.silFull = true; // (v2.9j, corrupt.js: her forms fill the sky)
  B.setup = function () {
    const b = B.body;
    Object.assign(b, {
      x: MID, y: FLOOR, face: -1, pose: 'idle', p: IDLE_P.slice(), pv: new Array(NP).fill(0), walkT: 0,
      fast: false, air: false, eyes: 1, crownK: 0, bladeK: 1, blade: true, eclipse: 0, hidden: true, breath: 0, skirt: 0, hair: 0, alpha: 1,
    });
    B.cape = D.chain(8, b.x, b.y - 90);
    B.sun = { x: MID, y: SKY_Y };
    B.faceS = { alpha: 1, scale: 1, eyes: 0, mouth: 0, crack: 0, sink: 0 };
    B.hands = [newHand(0), newHand(1)];
    B.flare = 0; B.gnomon = 1; B.shades = []; B.ghosts = []; B.pools = [];
    B.darkK = 0; B.reveal = 0; B.cold = 0; B.lightR = 300; B.lightK = 1;
    B.skyCrack = 0; B.dialBroken = 0; B.whiteK = 0; B.form = 'noon';
    B.breakNow = false; B.dawn = null; B.last = null; B.dusk = 0; B.endK = 0;
    B.fragments = [];
  };
  // her fight speeds up as she fights: the gaps between moves
  B.onRelease = function () {
    const b = B.body;
    b.fast = false;
    if (B.form !== 'noon') { b.air = false; b.y = FLOOR; }
    for (const h of B.hands) { h.busy = false; }
  };
  B.onInterrupt = function () {
    // (a move cut short by a stagger, a new form or her end leaves nothing of itself behind: she must not
    // stay in her Glare, unstoppable, hidden, unarmed or dimmed)
    const b = B.body;
    B.glaring = false; B.glareHit = false; B.armor = false; B.stuck = false;
    B.decoys = null; B.echo = null; B.ringOut = null; B.lash = null; B.steps = null; B.lensSpot = null; B.diveShadow = null;
    if (B.flyBlade) { B.flyBlade = null; b.blade = true; }
    B.total = 0; B.lightK = 1;
    if (B.form !== 'noon') { b.hidden = false; b.alpha = 1; }
    b.palm = 0; b.crownK = 0;
    B.shades.length = 0;
    for (const h of B.hands) { h.busy = false; h.shade = false; h.glow = 0; h.stuck = 0; }
    B.flare = 0; B.faceS.eyes = Math.min(B.faceS.eyes, 0.3);
  };

  // ---------------------------------------------------------------- what can be struck
  const HAND_HP = () => B.maxHp * (K.hard() ? 0.075 : 0.065);
  B.vuln = function (t) {
    if (t.id === 'face') return 2;
    if (t.id === 'handL' || t.id === 'handR') return 1;
    return B.form === 'eclipse' ? (B.reveal > 0.5 ? 1.4 : 1.2) : 1; // (burning out in the dark, she breaks faster; struck in her own flare, faster still)
  };
  B.onHit = function (dmg, info) {
    const t = B.lastTarget;
    if (B.form === 'noon' && t && t.hand) {
      const h = t.hand;
      h.flash = 1; h.dmg += dmg;
      h.crack = Math.min(1, h.dmg / HAND_HP());
      if (h.crack >= 1 && !h.broken) {
        h.broken = true; h.busy = false;
        AU.play('solCrack', { vol: 0.7 }); G.fx.shake(10); G.fx.stop(0.08);
        G.fx.shatter(h.x, h.y, SUN, 16, { hot: SUNHOT, r: 220 });
        G.fx.burst(h.x, h.y, { n: 30, color: BURN, speed: [120, 520], life: [0.3, 0.8], kind: 'spark', size: [2, 4] });
        if (B.hands.every((q) => q.broken)) B.breakNow = true;
      }
    }
    // (in the eclipse, a blow while she flares turns the flare back on her: the Eclipse's stagger)
    if (B.form === 'eclipse' && B.flaring > 0 && !B.staggered && info && !info.tick) { B.flaring = 0; B.blindNow = true; }
  };
  B.extraTargets = null;
  // which target a blow landed on (B.damage gives only the amount): the kit asks targets(), then damage();
  // the hero's hit code passes the target to damage, which passes it to vuln: keep it from there
  const vuln0 = B.vuln;
  B.vuln = function (t, info) { B.lastTarget = t; return vuln0(t, info); };
  B.kiting = (P, b) => (B.form === 'noon' ? false : Math.abs(P.x - b.x) > 360 || (!P.onGround && P.y < FLOOR - 140 && Math.abs(P.x - b.x) > 160));
  B.overhead = (P, b) => B.form !== 'noon' && Math.abs(P.x - b.x) < 60 && P.y < b.y - 100 && P.y > b.y - 420;

  // ------------------------------------------------------------------ between moves
  B.idle = function (dt) {
    const b = B.body, P = G.player;
    if (B.form === 'noon') {
      // the hands drift back to their rest, and the sun follows the hero a little across the sky
      for (const h of B.hands) if (!h.busy && !h.broken) { const r = HAND_REST[h.i]; h.tx = r.x + Math.sin(B.t * 0.7 + h.i * 2) * 20; h.ty = r.y + Math.sin(B.t * 1.1 + h.i) * 14; h.trot = 0.15 * h.side; h.topen = 0.7; h.tcurl = 0.3; }
      B.sun.x += (G.clamp(MID + (P.x - MID) * 0.15, MID - 120, MID + 120) - B.sun.x) * (1 - Math.exp(-0.8 * dt));
      B.sun.y += (SKY_Y - B.sun.y) * (1 - Math.exp(-2 * dt)); // (back to its height after a move that lifted it)
      return;
    }
    // her fallen form keeps a duellist's distance, and is never quite still
    facePlayer();
    const d = Math.abs(P.x - b.x), want = 170;
    if (d > want + 80) { b.x = clampX(b.x + b.face * 170 * dt); b.pose = 'walk'; b.walkT += dt; }
    else if (d < want - 70) { b.x = clampX(b.x - b.face * 100 * dt); b.pose = 'walk'; b.walkT -= dt; }
    else b.pose = B.form === 'eclipse' ? 'ready' : 'idle';
    b.air = false; b.y = FLOOR;
  };

  // ------------------------------------------------------------------ every frame
  B.tick = function (dt) {
    const b = B.body, P = G.player;
    // the hands: each on a spring to where it is sent
    for (const h of B.hands) {
      const w = h.snap ? 30 : 9, z = 0.8;
      h.vx += (-w * w * (h.x - h.tx) - 2 * z * w * h.vx) * dt; h.vy += (-w * w * (h.y - h.ty) - 2 * z * w * h.vy) * dt;
      if (!h.pin) { h.x += h.vx * dt; h.y += h.vy * dt; }
      h.rot += (h.trot - h.rot) * (1 - Math.exp(-8 * dt));
      h.open += (h.topen - h.open) * (1 - Math.exp(-7 * dt));
      h.curl += (h.tcurl - h.curl) * (1 - Math.exp(-7 * dt));
      h.flash = Math.max(0, h.flash - dt * 5);
      if (h.broken && !B.staggered && B.form === 'noon') { h.ty = FLOOR - 50; h.tx = h.x; h.trot = 0.5 * h.side; h.topen = 0.2; h.tcurl = 1.2; }
    }
    if (B.breakNow && B.active && !B.staggered && !B.dying && !B.invuln) { B.breakNow = false; B.forceStagger(); }
    if (B.blindNow && B.active && !B.staggered && !B.dying && !B.invuln) { B.blindNow = false; B.forceStagger(); }
    if (B.flaring > 0) B.flaring -= dt;
    // her fallen form
    if (B.form !== 'noon') {
      living(b, dt);
      b.skirt += (G.clamp(-(b.vxLast || 0) * 0.01, -1, 1) - b.skirt) * (1 - Math.exp(-6 * dt));
      const J = jointsOf(b, b.p);
      D.chainStep(B.cape, J.shX - b.face * 6, J.shY + 2, dt, { seg: 12, grav: 160, drift: 90, face: b.face, wave: 30, rate: 5 });
      if (!B.hairPts) { B.hairPts = D.chain(13, J.head.x, J.head.y); B.hairPts2 = D.chain(10, J.head.x, J.head.y); B.hairPts3 = D.chain(8, J.head.x, J.head.y); }
      D.chainStep(B.hairPts, J.head.x - b.face * 6, J.head.y - 4, dt, { seg: 9, grav: 140, drift: 120, face: b.face, wave: 60, rate: 4 });
      D.chainStep(B.hairPts2, J.head.x - b.face * 4, J.head.y + 1, dt, { seg: 8.5, grav: 170, drift: 95, face: b.face, wave: 70, rate: 5.3 });
      D.chainStep(B.hairPts3, J.head.x - b.face * 7, J.head.y - 8, dt, { seg: 8, grav: 90, drift: 140, face: b.face, wave: 80, rate: 6.1 });
      b.hair = Math.sin(B.t * 6) * 3;
      const wt = b.crownK > 0 ? 0.6 + 0.4 * b.crownK : b.air ? 0.75 : b.fast ? 0.45 : 0.12;
      b.wingK = (b.wingK || 0) + (wt - (b.wingK || 0)) * (1 - Math.exp(-(wt > (b.wingK || 0) ? 9 : 3) * dt));
      // the light she gives off as she moves
      if (b.eclipse < 0.5 && Math.random() < dt * 10) G.fx.spawn({ kind: 'spark', x: b.x + G.rand(-16, 16), y: b.y - G.rand(10, 100), vx: G.rand(-20, 20), vy: -G.rand(30, 90), life: G.rand(0.4, 0.8), size: G.rand(1.2, 2.4), color: FALL });
      if (b.eclipse >= 0.5 && Math.random() < dt * 14) G.fx.spawn({ kind: 'spark', x: b.x + G.rand(-18, 18), y: b.y - G.rand(10, 100), vx: G.rand(-30, 30), vy: -G.rand(40, 120), life: G.rand(0.2, 0.5), size: G.rand(1, 2), color: RIM });
      b.vxLast = b.x - (b.xLast == null ? b.x : b.xLast); b.xLast = b.x;
    }
    for (const g of B.ghosts) g.t += dt;
    B.ghosts = B.ghosts.filter((g) => g.t < g.life);
    for (const p of B.pools) p.t += dt;
    B.pools = B.pools.filter((p) => p.t < p.life);
    for (const fr of B.fragments) fr.t += dt;
    B.fragments = B.fragments.filter((fr) => fr.t < fr.life);
    // the eclipse: the dark itself burns. Out of her light (and out of the pools a flare leaves) the
    // cold builds; held too long, it takes a health. Her light is where she is: the fight is close.
    if (B.form === 'eclipse' && !B.lastLightOn && B.darkK > 0.9 && B.active && !B.dying && G.state === 'fight' && !P.dead) {
      const lit = litAt(P.x, P.y - 30);
      B.cold = lit ? Math.max(0, B.cold - dt * 1.5) : B.cold + dt;
      const limit = K.gentle() ? 2.6 : K.hard() ? 1.4 : 1.9;
      if (B.cold > limit) {
        B.cold = 0.4;
        if (P.tryHit(1, b.x, { kind: 'dark' })) AU.play('solSear');
      }
      if (!lit && Math.random() < dt * 20) G.fx.spawn({ x: P.x + G.rand(-14, 14), y: P.y - G.rand(0, 50), vx: G.rand(-10, 10), vy: -G.rand(10, 40), life: 0.5, size: G.rand(2, 4), color: '30,10,20' });
    } else B.cold = Math.max(0, B.cold - dt);
    B.reveal = Math.max(0, B.reveal - dt * 1.6);
  };
  // in the eclipse: what is lit (and so safe): near her, or in a pool her flare left
  function litAt(x, y) {
    const b = B.body, r = B.lightR * B.lightK;
    if (B.reveal > 0.6) return true;
    if (Math.hypot(x - b.x, y - (b.y - 56)) < r) return true;
    for (const p of B.pools) if (Math.abs(x - p.x) < p.w / 2 && y > FLOOR - 200) return true;
    return false;
  }

  // ------------------------------------------------------------------ drawing
  // Behind everything: the cracks in the sky, the sun at noon, the dial on the ridge and the gnomon,
  // the shade it throws, and the glare of her light over all that is not in shade.
  B.drawGround = function (ctx) {
    const s = B.sun, t = B.t;
    // the sky cracking (from the end of noon on)
    if (B.skyCrack > 0.01) drawSkyCrack(ctx, B.skyCrack);
    if (B.form === 'noon' || B.faceS.alpha > 0.01) drawFace(ctx);
    // the dial: hour marks cut in the ridge, round the gnomon
    if (B.dialBroken < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - B.dialBroken;
      ctx.strokeStyle = B.form === 'eclipse' ? 'rgba(255,120,60,0.12)' : 'rgba(60,40,24,0.55)'; ctx.lineWidth = 2;
      for (let i = -6; i <= 6; i++) {
        const x = MID + i * 92, long = i % 3 === 0;
        ctx.beginPath(); ctx.moveTo(x, FLOOR + 3); ctx.lineTo(x + i * 2, FLOOR + (long ? 22 : 12)); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(MID, FLOOR + 10, 560, 9, 0, 0, Math.PI); ctx.stroke();
      ctx.restore();
    }
    // the shade and the glare (noon): the glare is the light that burns, drawn on all that is lit
    if (B.form === 'noon' && B.faceS.alpha > 0.3) drawLight(ctx, t);
    // the gnomon: a tall needle of dark stone, gold at its edge
    if (B.gnomon > 0.01) {
      const top = FLOOR - GNOMON_H * B.gnomon, l = MID - GNOMON_W / 2;
      ctx.fillStyle = '#3c2e22';
      ctx.beginPath(); ctx.moveTo(l - 6, FLOOR); ctx.lineTo(l, top + 10); ctx.lineTo(MID, top); ctx.lineTo(l + GNOMON_W, top + 10); ctx.lineTo(l + GNOMON_W + 6, FLOOR); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = G.rgba(SUNHOT, 0.5); ctx.lineWidth = 1.5;
      const lit = s.x < MID ? l : l + GNOMON_W;
      ctx.beginPath(); ctx.moveTo(MID, top); ctx.lineTo(lit, top + 10); ctx.lineTo(lit + (s.x < MID ? -6 : 6), FLOOR); ctx.stroke();
    }
    // the broken dial: slabs and rubble (the Fall)
    for (const fr of B.fragments) drawFragment(ctx, fr);
    // the light pools a flare leaves (the eclipse)
    for (const p of B.pools) {
      const k = Math.min(1, p.t / 0.2) * Math.min(1, (p.life - p.t) / 0.5);
      const g = ctx.createRadialGradient(p.x, FLOOR, 4, p.x, FLOOR, p.w * 0.6);
      g.addColorStop(0, G.rgba(RIMHOT, 0.5 * k)); g.addColorStop(1, G.rgba(RIM, 0));
      ctx.fillStyle = g; ctx.fillRect(p.x - p.w, FLOOR - 120, p.w * 2, 130);
    }
    // the shadows her hands throw: the warning of where they will land
    if (B.form === 'noon') for (const h of B.hands) drawHandShadow(ctx, h);
  };
  // the light that burns: a glare over every lit part of the ridge, with the gnomon's shade (and a
  // hand's) cut out of it. At rest it is faint; while a burn is on, white-hot and shimmering.
  function drawLight(ctx, t) {
    const burning = H.list.some((h) => h.kind === 'burn' && h.t >= h.tele);
    const warming = H.list.find((h) => h.kind === 'burn' && h.t < h.tele);
    const k = burning ? 1 : warming ? warming.k * 0.6 : 0;
    const s = B.sun;
    // the shade: a dark wedge on the floor behind the gnomon (and under a hand held low)
    const shade = [];
    if (gnomonUp()) {
      const [a, z, dir] = shadowSpan(), top = FLOOR - GNOMON_H * B.gnomon;
      // the shadow volume: from the gnomon's lit edge, away from the sun, to the floor
      const ex = MID + dir * GNOMON_W / 2;
      const far = z;
      shade.push([ex, top, ex, FLOOR, far, FLOOR, ex + (far - ex) * 0.02, top + (FLOOR - top) * 0.02]);
    }
    for (const h of B.hands) if (h.shade && h.gone < 1) {
      const kx = (FLOOR - s.y) / Math.max(40, h.y + 30 - s.y);
      const l = s.x + (h.x - 88 - s.x) * kx, r = s.x + (h.x + 88 - s.x) * kx;
      shade.push([h.x - 88, h.y + 30, h.x + 88, h.y + 30, r, FLOOR, l, FLOOR]);
    }
    for (const sh of B.shades) shade.push([sh.l, FLOOR - 220, sh.r, FLOOR - 220, sh.r, FLOOR, sh.l, FLOOR]);
    ctx.save();
    // the shade itself, cool and dark
    ctx.fillStyle = 'rgba(40,30,60,' + (0.28 + 0.22 * k) + ')';
    for (const q of shade) { ctx.beginPath(); ctx.moveTo(q[0], q[1]); for (let i = 2; i < q.length; i += 2) ctx.lineTo(q[i], q[i + 1]); ctx.closePath(); ctx.fill(); }
    if (k > 0.01) {
      // the glare: everything but the shade
      ctx.beginPath();
      ctx.rect(WL - 40, -40, WR - WL + 80, FLOOR + 40);
      for (const q of shade) { ctx.moveTo(q[0], q[1]); for (let i = q.length - 2; i >= 2; i -= 2) ctx.lineTo(q[i], q[i + 1]); ctx.closePath(); }
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, s.y, 0, FLOOR);
      g.addColorStop(0, G.rgba(SUN, 0.0)); g.addColorStop(0.6, G.rgba(SUN, 0.12 * k)); g.addColorStop(1, G.rgba(BURN, (0.3 + 0.06 * Math.sin(t * 30)) * k));
      ctx.fillStyle = g; ctx.fill();
      // a line of fire along the lit floor
      ctx.fillStyle = G.rgba(BURN, 0.5 * k);
      ctx.fillRect(WL, FLOOR - 4, WR - WL, 6);
    }
    ctx.restore();
  }
  function drawSkyCrack(ctx, k) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    const lines = B.crackLines || (B.crackLines = mkCracks());
    for (const [w, col, a] of [[7, BURN, 0.3], [2.5, SUNHOT, 0.9]]) {
      ctx.strokeStyle = G.rgba(col, a * Math.min(1, k)); ctx.lineWidth = w;
      ctx.beginPath();
      for (const ln of lines) {
        const n = Math.max(1, Math.floor(ln.length * Math.min(1, k)));
        for (let i = 0; i < n; i++) { if (i) ctx.lineTo(ln[i][0], ln[i][1]); else ctx.moveTo(ln[i][0], ln[i][1]); }
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  function mkCracks() {
    const out = [], r = mulberry(91);
    for (let j = 0; j < 7; j++) {
      let x = MID + (r() - 0.5) * 200, y = SKY_Y + (r() - 0.5) * 60;
      const ang = -Math.PI / 2 + (j - 3) * 0.45 + (r() - 0.5) * 0.3, ln = [[x, y]];
      for (let i = 0; i < 9; i++) { x += Math.cos(ang + (r() - 0.5) * 0.9) * 70; y += Math.sin(ang + (r() - 0.5) * 0.9) * 50 + 22; ln.push([x, y]); }
      out.push(ln);
    }
    return out;
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function drawFragment(ctx, fr) {
    // a piece of the broken sky lying on the ridge, still glowing, cooling as it goes
    const k = 1 - Math.min(1, fr.t / fr.life), x = fr.x;
    ctx.fillStyle = '#2a1a12';
    ctx.beginPath(); ctx.moveTo(x - fr.w / 2, FLOOR); ctx.lineTo(x - fr.w * 0.3, FLOOR - fr.h); ctx.lineTo(x + fr.w * 0.2, FLOOR - fr.h * 0.8); ctx.lineTo(x + fr.w / 2, FLOOR); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(BURN, 0.7 * k); ctx.lineWidth = 2; ctx.stroke();
  }

  // Among the fight: her hands at noon; her fallen form after
  B.draw = function (ctx) {
    if (B.dead && !B.endK) return;
    const b = B.body;
    if (B.form === 'noon' || B.hands.some((h) => h.gone < 1 && h.alpha > 0.01)) for (const h of B.hands) drawHand(ctx, h);
    if (b.hidden || b.alpha <= 0.01 || B.form === 'noon') return;
    // her afterimages
    for (const g of B.ghosts) {
      const k = 1 - g.t / g.life;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      drawFig(ctx, { x: g.x, y: g.y, face: g.face, eclipse: b.eclipse, eyes: 1, crownK: 0, breath: 0, blade: true }, 0.3 * k, { p: g.p, ghost: true });
      ctx.restore();
    }
    const J = drawFig(ctx, b, b.alpha);
    B.tipNow = J.tip;
  };

  // Over the arena and her, under the hero: the dark of the eclipse. Only her light (her corona, round
  // her), the pools her flares leave, a faint light round the hero, and what burns on her shows in it.
  B.drawOver = function (ctx) {
    const b = B.body, P = G.player;
    if (B.whiteK > 0.01) { ctx.fillStyle = G.rgba('255,252,240', B.whiteK); ctx.fillRect(-80, -80, G.W + 160, G.H + 160); }
    if (B.darkK <= 0.01) { if (B.dawn) drawDawn(ctx); return; }
    const a = 0.95 * B.darkK * (1 - 0.8 * B.reveal);
    ctx.save();
    // the dark, with holes for each light
    const lights = [];
    if (!b.hidden && b.alpha > 0.1) lights.push([b.x, b.y - 56, B.lightR * B.lightK]);
    for (const p of B.pools) { const k = Math.min(1, p.t / 0.2) * Math.min(1, (p.life - p.t) / 0.5); lights.push([p.x, FLOOR - 30, p.w * 0.7 * k]); }
    lights.push([P.x, P.y - 30, 70]);
    const cv = B.darkCv || (B.darkCv = document.createElement('canvas'));
    if (cv.width !== G.W + 160) { cv.width = G.W + 160; cv.height = G.H + 160; }
    const x2 = cv.getContext('2d');
    x2.setTransform(1, 0, 0, 1, 80, 80);
    x2.globalCompositeOperation = 'source-over';
    x2.clearRect(-80, -80, cv.width, cv.height);
    x2.fillStyle = 'rgba(2,1,3,' + a + ')'; x2.fillRect(-80, -80, cv.width, cv.height);
    x2.globalCompositeOperation = 'destination-out';
    for (const [x, y, r] of lights) {
      if (r < 2) continue;
      const g = x2.createRadialGradient(x, y, r * 0.35, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x2.fillStyle = g; x2.beginPath(); x2.arc(x, y, r, 0, G.TAU); x2.fill();
    }
    ctx.drawImage(cv, -80, -80);
    // her rim, her eyes and the edge of her blade show in any dark
    if (!b.hidden && b.alpha > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      drawFig(ctx, b, 0.22 * B.darkK * b.alpha, {});
      ctx.restore();
    }
    // the cold closing on the hero: the dark creeping in round them
    if (B.cold > 0.2) {
      const k = G.clamp(B.cold / 1.9, 0, 1);
      ctx.strokeStyle = 'rgba(20,6,14,' + (0.5 * k) + ')'; ctx.lineWidth = 10 * k;
      ctx.beginPath(); ctx.arc(P.x, P.y - 30, 70 - 30 * k, 0, G.TAU); ctx.stroke();
    }
    ctx.restore();
    if (B.dawn) drawDawn(ctx);
  };

  // ------------------------------------------------------------------ hazards of her own
  // a box that hurts while get() returns one (her hands, her body in a rush)
  function boxHaz(get, life, dmg) {
    return H.add({
      kind: 'box', dmg: dmg || 1, life, q: null,
      update() { if (this.t > this.life) this.dead = true; this.q = get(this); if (this.q) this.srcX = this.q.cx; },
      hits(P) { return !!this.q && G.rectsOverlap(P.box(), this.q); },
    });
  }
  const handBox = (h, pad) => ({ cx: h.x - 10 * h.side, cy: h.y, hw: 92 + (pad || 0), hh: 44 + (pad || 0) });
  // a drop of burning light: falls from (x, y) to the floor, then rolls along it towards dir
  function tear(x, y, dir, speed, delay) {
    return H.add({
      kind: 'tear', x, y, vy: 0, dir, rolling: false, delay: delay || 0, r: 13, tint: { boss: BURN, hot: SUNHOT },
      update(dt) {
        if (this.t < this.delay) return;
        if (!this.rolling) {
          this.vy += 1500 * dt; this.y += this.vy * dt;
          if (this.y >= FLOOR - this.r) { this.y = FLOOR - this.r; this.rolling = true; AU.play('land'); G.fx.burst(this.x, FLOOR - 4, { n: 8, color: BURN, speed: [60, 220], angle: -Math.PI / 2, spread: 1.6, life: [0.2, 0.4], kind: 'spark' }); }
        } else this.x += this.dir * speed * dt;
        if (this.x < WL - 20 || this.x > WR + 20) this.dead = true;
        this.srcX = this.x;
        if (Math.random() < 0.5) G.fx.spawn({ x: this.x, y: this.y, vx: -this.dir * 30, vy: -G.rand(20, 80), life: 0.3, size: G.rand(2, 4), color: BURN });
      },
      hits(P) { return this.t >= this.delay && G.circleRect(this.x, this.y, this.r - 2, P.box()); },
      draw(ctx) {
        if (this.t < this.delay) return;
        D.glow(ctx, BURN, this.x, this.y, 40, 0.8);
        ctx.fillStyle = G.rgba(SUNHOT, 1); ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.7, 0, G.TAU); ctx.fill();
      },
    });
  }
  // a ray of her light straight down, its warning a thin line on the floor that brightens (a projectile)
  function ray(x, tele, w, dmg) {
    return H.add({
      kind: 'ray', x, w: w || 44, tele, dmg: dmg || 1, srcX: x,
      update() { if (this.t > this.tele + 0.3) this.dead = true; if (this.t >= this.tele && !this.boomed) { this.boomed = true; AU.play('solFlare', { vol: 0.5 }); G.fx.shake(5); G.fx.burst(this.x, FLOOR - 6, { n: 12, color: SUN, speed: [80, 360], angle: -Math.PI / 2, spread: 1.4, life: [0.2, 0.5], kind: 'spark' }); G.fx.scorch(this.x, this.w, BURN); } },
      hits(P) { return this.t >= this.tele && this.t < this.tele + 0.18 && Math.abs(P.x - this.x) < this.w / 2 + 8; },
      draw(ctx) {
        const k = Math.min(1, this.t / this.tele);
        if (this.t < this.tele) {
          ctx.strokeStyle = G.rgba(DANGER, 0.25 + 0.55 * k); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(this.x - this.w / 2 * k, FLOOR - 1); ctx.lineTo(this.x + this.w / 2 * k, FLOOR - 1); ctx.stroke();
          return;
        }
        const f = 1 - (this.t - this.tele) / 0.3;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(this.x - this.w / 2, 0, this.x + this.w / 2, 0);
        g.addColorStop(0, G.rgba(SUN, 0)); g.addColorStop(0.5, G.rgba(SUNHOT, 0.95 * f)); g.addColorStop(1, G.rgba(SUN, 0));
        ctx.fillStyle = g; ctx.fillRect(this.x - this.w / 2, -40, this.w, FLOOR + 40);
        ctx.restore();
      },
    });
  }
  // the quake of a blow on the ridge: hurts whoever is standing on the floor for a moment
  function quake(dur, dmg) {
    return H.add({ kind: 'quake', dmg: dmg || 1, dur, update() { if (this.t > this.dur) this.dead = true; this.srcX = MID; }, hits(P) { return P.onGround && !P.plat && P.y >= FLOOR - 2; } });
  }
  function slamFx(x, y, big) {
    G.fx.shake(big ? 22 : 14); G.fx.punch(big ? 0.035 : 0.02); AU.play('slam'); AU.play('boom');
    G.fx.ring(x, FLOOR - 4, { r0: 30, r1: big ? 380 : 230, life: 0.45, color: SUNHOT, width: 10 });
    G.fx.thud(x, FLOOR, big ? 2.2 : 1.4, { col: SUN });
    G.fx.light(x, FLOOR - 40, big ? 380 : 260, SUN, 0.25, 0.6);
    G.fx.burst(x, FLOOR - 6, { n: big ? 16 : 9, color: '50,36,24', speed: [150, 600], angle: -Math.PI / 2, spread: 2.2, life: [0.6, 1.2], size: [5, 12], kind: 'chunk', grav: 1500 });
    G.fx.burst(x, FLOOR - 6, { n: big ? 30 : 16, color: SUN, speed: [150, 700], angle: -Math.PI / 2, spread: 2.6, life: [0.2, 0.6], kind: 'spark', size: [2, 4], grav: 900 });
    G.fx.dust(x, FLOOR, big ? 10 : 6, { speed: [80, 400], size: [8, 16], up: 50 });
  }
  // move a hand by hand (pinned off its spring) over dur, eased
  function* handMove(h, x, y, dur, ease) {
    h.pin = true; h.vx = 0; h.vy = 0;
    const x0 = h.x, y0 = h.y;
    let e = 0;
    while (e < dur) { const dt = yield; e += dt; const k = (ease || E.inOutQuad)(Math.min(1, e / dur)); h.x = G.lerp(x0, x, k); h.y = G.lerp(y0, y, k); }
    h.x = x; h.y = y; h.tx = x; h.ty = y; h.pin = false;
  }
  const T = () => K.T();
  // (end a quiet mark after secs)
  function setTimeout0(h, secs) { const u = h.update; h.update = function (dt) { if (u) u.call(this, dt); if (this.t > secs) this.dead = true; }; }
  const nearHand = () => { const P = G.player; return B.hands.filter((h) => !h.broken).sort((a, c) => Math.abs(a.x - P.x) - Math.abs(c.x - P.x))[0] || B.hands[0]; };
  const freeHands = () => B.hands.filter((h) => !h.broken);

  // ------------------------------------------------------------------ Noon: her moves
  // Noonray: the sun drifts to one side of the sky, its crown flares, a gong, and it blazes white:
  // the ridge burns but for the gnomon's shade. The long form (her crown flaring twice): she keeps
  // drifting while she burns, so the shade swings across the ridge and you walk with it.
  function* atkNoonray() {
    const s = B.sun, P = G.player, sweep = K.chance(K.hard() ? 0.6 : 0.45, 'sweep');
    const side = P.x < MID ? 1 : -1; // (she drifts so the shade falls on the hero's side: it can be reached)
    const x0 = s.x, y0 = s.y, to = MID + side * (sweep ? 400 : 320);
    AU.play('solHand', { vol: 0.5 });
    let e = 0;
    const tele = 1.5 * T();
    const b = burn(sweep ? 3.4 : 1.8, { tele });
    while (e < tele) {
      const dt = yield; e += dt; const k = Math.min(1, e / tele);
      s.x = G.lerp(x0, to, E.inOutQuad(Math.min(1, k * 1.4))); s.y = G.lerp(y0, SKY_Y + 50, E.inOutQuad(Math.min(1, k * 1.4)));
      B.flare = sweep ? 0.5 + 0.5 * Math.abs(Math.sin(k * Math.PI * 2)) : k;
      B.faceS.eyes = Math.max(0, (k - 0.75) * 4);
    }
    AU.play('solGong'); G.fx.flash(SUNHOT, 0.25, 0.4); G.fx.shake(6);
    B.faceS.eyes = 1; B.flare = 1;
    if (sweep) {
      const d = 3.4; e = 0;
      // (it swings in towards the gnomon and out again: the shade shortens to your feet and lengthens, and you walk with it)
      while (e < d) { const dt = yield; e += dt; s.x = G.lerp(to, MID + side * 130, Math.sin(Math.PI * Math.min(1, e / d) * 0.5)); }
    } else yield* wait(1.8);
    b.dead = true;
    e = 0;
    while (e < 0.6) { const dt = yield; e += dt; B.flare = 1 - e / 0.6; B.faceS.eyes = 1 - e / 0.6; }
    B.flare = 0; B.faceS.eyes = 0;
    const s0x = s.x, s0y = s.y;
    e = 0;
    while (e < 0.5) { const dt = yield; e += dt; const k = E.inOutQuad(Math.min(1, e / 0.5)); s.x = G.lerp(s0x, MID, k * 0.6); s.y = G.lerp(s0y, SKY_Y, k); }
  }

  // Palm Press: a hand rises high over you and its shadow gathers under it; it slams flat. An open hand
  // rests where it fell (strike it); a fist sends a ripple out along the ridge both ways (jump it).
  function* atkPalm() {
    const h = nearHand(), P = G.player, fist = K.chance(0.4, 'fist');
    h.busy = true; h.topen = fist ? 0 : 1; h.tcurl = fist ? 1.6 : 0.1; h.trot = 0.05 * h.side;
    AU.play('solHand');
    yield* handMove(h, G.clamp(P.x, WL + 100, WR - 100), FLOOR - 440, 0.5);
    let e = 0;
    const tele = 0.85 * T();
    const mk = K.columnMark(h.x, 220, true); // (quiet: nothing drawn; the shadow is the warning)
    while (e < tele) {
      const dt = yield; e += dt;
      if (e < tele - 0.3) h.x += (G.clamp(P.x, WL + 100, WR - 100) - h.x) * (1 - Math.exp(-5 * dt));
      mk.x = h.x;
      h.y = FLOOR - 440 - 30 * Math.sin(Math.min(1, e / tele) * Math.PI / 2);
      h.shadowK = 1 + e / tele;
    }
    yield* handMove(h, h.x, FLOOR - 46, 0.16, E.inCubic);
    mk.dead = true;
    K.crush(h.x, FLOOR - 40, 100, 50, 1);
    slamFx(h.x, FLOOR, false);
    h.shadowK = 1;
    if (fist) { H.shockwave(h.x - 80, -1, 620, 46, { boss: SUN, hot: SUNHOT }); H.shockwave(h.x + 80, 1, 620, 46, { boss: SUN, hot: SUNHOT }); }
    h.low = true;
    yield* wait(fist ? 0.7 : 1.3);
    h.low = false;
    AU.play('solHand', { vol: 0.6 });
    yield* handMove(h, HAND_REST[h.i].x, HAND_REST[h.i].y, 0.55);
    h.busy = false;
  }

  // The Meeting: her arms spread to the edges of the ridge and the sun draws its corona in; both hands come
  // in along the floor and meet in the middle. Jump a hand or dash through it; then they are stuck together.
  function* atkClap() {
    const [l, r] = B.hands;
    if (l.broken || r.broken) { yield* atkPalm(); return; }
    l.busy = r.busy = true;
    for (const h of [l, r]) { h.topen = 1; h.tcurl = 0; h.trot = 1.45 * h.side; }
    AU.play('solHand');
    yield* both(handMove(l, WL + 70, FLOOR - 58, 0.6), handMove(r, WR - 70, FLOOR - 58, 0.6));
    B.faceS.mouth = 0.6; AU.play('charge', { dur: 0.8 });
    yield* wait(0.75 * T());
    B.faceS.mouth = 0;
    AU.play('solHand', { vol: 1.2 }); AU.play('whoosh');
    const hz = [boxHaz(() => handBox(l), 0.5), boxHaz(() => handBox(r), 0.5)];
    hz[0].dir = 1; hz[1].dir = -1; hz[0].low = hz[1].low = true; // (for the scripted player)
    yield* both(handMove(l, MID - 100, FLOOR - 58, 0.42, E.inQuad), handMove(r, MID + 100, FLOOR - 58, 0.42, E.inQuad));
    for (const z of hz) z.dead = true;
    slamFx(MID, FLOOR, true);
    G.fx.flash(SUNHOT, 0.3, 0.3);
    l.low = r.low = true;
    yield* wait(1.3);
    l.low = r.low = false;
    yield* both(handMove(l, HAND_REST[0].x, HAND_REST[0].y, 0.6), handMove(r, HAND_REST[1].x, HAND_REST[1].y, 0.6));
    l.busy = r.busy = false;
  }
  // run two scripts side by side until both are done
  function* both(a, c) {
    let da = false, dc = false;
    while (!da || !dc) { const dt = yield; if (!da) da = a.next(dt).done; if (!dc) dc = c.next(dt).done; }
  }

  // Finger Rake: a hand comes down to one end of the ridge. Knuckles first, it rakes along the floor
  // (jump); palm first, held upright, it sweeps at head height (stay down, or dash under it).
  function* atkRake() {
    const P = G.player, h = P.x > MID ? B.hands[0] : B.hands[1];
    const hand = h.broken ? nearHand() : h, low = K.chance(0.5, 'low');
    const from = hand.side < 0 ? WL + 40 : WR - 40, to = hand.side < 0 ? WR + 60 : WL - 60, y = low ? FLOOR - 44 : FLOOR - 168;
    hand.busy = true;
    hand.topen = low ? 0 : 1; hand.tcurl = low ? 1.7 : 0; hand.trot = low ? 0.4 * hand.side : 1.5 * hand.side;
    AU.play('solHand');
    yield* handMove(hand, from, y, 0.55);
    yield* wait(0.7 * T());
    AU.play('whoosh'); AU.play('solHand', { vol: 1.1 });
    const hz = boxHaz(() => ({ cx: hand.x, cy: hand.y, hw: 70, hh: low ? 36 : 40 }), 0.8);
    hz.dir = G.sign(to - from); hz.low = low;
    let e = 0;
    while (e < 0.75) {
      const dt = yield; e += dt;
      hand.x = G.lerp(from, to, E.inOutSine(Math.min(1, e / 0.75)));
      if (low && Math.random() < dt * 40) G.fx.dust(hand.x, FLOOR, 1, { speed: [40, 160], size: [6, 12], up: 30 });
    }
    hz.dead = true;
    hand.tx = hand.x; hand.ty = hand.y;
    yield* handMove(hand, HAND_REST[hand.i].x, HAND_REST[hand.i].y, 0.6);
    hand.busy = false;
  }

  // Crown Volley: the points of her crown light one by one; as many rays come down as points lit,
  // the first where you stand. Count them; stand between.
  function* atkVolley() {
    const P = G.player, n = K.chance(0.5, 'five') ? 5 : 3;
    const xs = [G.clamp(P.x, WL + 30, WR - 30)];
    const gap = 150;
    for (let i = 1; i < n; i++) xs.push(G.clamp(xs[0] + (i % 2 ? 1 : -1) * gap * Math.ceil(i / 2), WL + 30, WR - 30));
    for (let i = 0; i < n; i++) {
      B.flare = (i + 1) / n * 0.7;
      AU.play('chGlow', { n: i % 4 });
      yield* wait(0.22);
    }
    for (let i = 0; i < n; i++) ray(xs[i], 0.6 * T() + i * 0.12, 46);
    yield* wait(0.6 * T() + n * 0.12 + 0.3);
    B.flare = 0;
  }

  // Sun-Tears: the sun swells at its lower edge; burning drops fall from it and roll along the ridge.
  function* atkTears() {
    const s = B.sun, P = G.player;
    B.faceS.eyes = 0.4; AU.play('charge', { dur: 0.5 });
    yield* wait(0.6 * T());
    B.faceS.eyes = 0;
    const n = K.hard() ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const sd = i % 2 ? 1 : -1, x = s.x + sd * 30;
      tear(x, s.y + 10, G.sign(P.x - x) || sd, 300 + 40 * i, i * 0.45);
    }
    yield* wait(n * 0.45 + 0.8);
  }

  // The Kind Hand: she rises to the top of the sky; the gnomon's shade shrinks to nothing. One hand
  // comes low over you, open, and gives you shade while the ridge burns. When the burning stops, watch
  // its fingers: still open, it lifts away; curling slowly, it is about to close on what is under it.
  function* atkKindHand() {
    const s = B.sun, P = G.player, h = nearHand(), grab = K.chance(K.hard() ? 0.5 : 0.35, 'grab');
    h.busy = true; h.topen = 1; h.tcurl = 0; h.trot = 0;
    const y0 = s.y;
    AU.play('solHand');
    const hx = G.clamp(P.x, WL + 120, WR - 120);
    yield* both(handMove(h, hx, FLOOR - 200, 0.7), (function* () { let e = 0; while (e < 0.7) { const dt = yield; e += dt; s.y = G.lerp(y0, SKY_Y - 70, E.inOutQuad(Math.min(1, e / 0.7))); s.x += (MID - s.x) * (1 - Math.exp(-5 * dt)); } })());
    h.shade = true;
    const tele = 1.0 * T();
    const b = burn(1.7, { tele });
    let e = 0;
    while (e < tele) { const dt = yield; e += dt; B.flare = e / tele; B.faceS.eyes = Math.max(0, e / tele - 0.6) * 2.5; }
    AU.play('solGong'); B.faceS.eyes = 1; B.flare = 1;
    yield* wait(1.7);
    b.dead = true; B.flare = 0; B.faceS.eyes = 0;
    if (grab) {
      // the fingers curl, slowly: get out from under
      h.tcurl = 1.0; h.topen = 0.6;
      AU.play('solHand', { vol: 0.5 });
      const mk = K.columnMark(h.x, 220, true);
      yield* wait(0.75 * T());
      mk.dead = true;
      h.shade = false;
      h.topen = 0; h.tcurl = 1.8;
      yield* handMove(h, h.x, FLOOR - 50, 0.14, E.inCubic);
      K.crush(h.x, FLOOR - 50, 96, 60, 2);
      slamFx(h.x, FLOOR, false);
      yield* wait(0.9);
    } else {
      h.shade = false;
      yield* wait(0.25);
    }
    const y1 = s.y;
    yield* both(handMove(h, HAND_REST[h.i].x, HAND_REST[h.i].y, 0.6), (function* () { let q = 0; while (q < 0.6) { const dt = yield; q += dt; s.y = G.lerp(y1, SKY_Y, E.inOutQuad(Math.min(1, q / 0.6))); } })());
    h.busy = false;
  }

  // Pinch: two fingers of a hand follow you along the ridge from above your head; they stop, and flash;
  // then they pluck. Caught, you are lifted into her light, burned, and thrown. Dash as they flash.
  function* atkPinch() {
    const P = G.player, h = nearHand();
    h.busy = true; h.topen = 0.25; h.tcurl = 0.5; h.trot = 1.2 * h.side;
    AU.play('solHand');
    yield* handMove(h, G.clamp(P.x, WL + 60, WR - 60), FLOOR - 250, 0.5);
    let e = 0;
    while (e < 1.1) { const dt = yield; e += dt; h.x += (G.clamp(P.x + h.side * 40, WL + 60, WR - 60) - h.x) * (1 - Math.exp(-4 * dt)); }
    // the lock
    h.flash = 1; G.fx.glint(h.x - h.side * 60, h.y + 40, 44, SUNHOT, 0.3); AU.play('glint');
    const mk = K.columnMark(h.x - h.side * 50, 110, true);
    setTimeout0(mk, 0.5);
    yield* wait(0.32 * T());
    const lx = h.x - h.side * 50;
    yield* handMove(h, h.x, FLOOR - 70, 0.12, E.inCubic);
    const box = { cx: lx, cy: FLOOR - 50, hw: 46, hh: 50 };
    G.fx.shake(6); AU.play('slam');
    if (!P.dead && G.canHurt() && P.iframes <= 0 && P.inv <= 0 && !G.debug.god && G.rectsOverlap(P.box(), box)) {
      // caught: up into the light
      P.grabbed = { x: P.x, y: P.y, face: P.facing };
      h.topen = 0.1; h.tcurl = 1.4;
      let q = 0;
      while (q < 0.6) { const dt = yield; q += dt; h.y = G.lerp(FLOOR - 70, FLOOR - 320, E.outQuad(Math.min(1, q / 0.6))); P.grabbed.x = h.x - h.side * 50; P.grabbed.y = h.y + 40; }
      AU.play('solSear'); G.fx.flash(BURN, 0.3, 0.3);
      P.grabbed = null; P.inv = 0;
      P.tryHit(1, h.x, { kind: 'pinch' });
      P.vx = -h.side * 500; P.vy = -200;
    } else {
      yield* wait(0.6);
    }
    yield* handMove(h, HAND_REST[h.i].x, HAND_REST[h.i].y, 0.5);
    h.busy = false;
  }

  // Finger Drum: a hand hangs low over one end of the ridge, fingers rippling in a rhythm you can hear;
  // then the fingertips come down one after another all the way along the ridge. Go behind the wave,
  // or jump each beat as it reaches you.
  function* atkDrum() {
    const P = G.player, h = nearHand();
    h.busy = true; h.topen = 1; h.tcurl = 0.9; h.trot = 0.3 * h.side;
    const from = h.side < 0 ? WL + 80 : WR - 80, dir = -h.side;
    AU.play('solHand');
    yield* handMove(h, from, FLOOR - 160, 0.5);
    for (let i = 0; i < 4; i++) { AU.play('tink'); h.tcurl = i % 2 ? 0.6 : 1.1; yield* wait(0.16 * T()); }
    const n = 8, step = (WR - WL - 120) / (n - 1), beat = K.hard() ? 0.15 : 0.19;
    for (let i = 0; i < n; i++) {
      const x = from + dir * step * i;
      h.tx = x; h.ty = FLOOR - 140; h.tcurl = 1.4;
      yield* wait(beat * 0.4);
      K.crush(x, FLOOR - 24, 46, 26, 1);
      AU.play('slam'); G.fx.shake(5); G.fx.dust(x, FLOOR, 3, { speed: [40, 200], size: [5, 10], up: 40 });
      G.fx.burst(x, FLOOR - 4, { n: 6, color: SUN, speed: [100, 300], angle: -Math.PI / 2, spread: 1.4, life: [0.2, 0.4], kind: 'spark' });
      h.tcurl = 0.7;
      yield* wait(beat * 0.6);
    }
    yield* wait(0.3);
    yield* handMove(h, HAND_REST[h.i].x, HAND_REST[h.i].y, 0.6);
    h.busy = false;
  }

  // Burning Lens: a hand cups near the sun and gathers her light into a point on the ridge, which hunts
  // you, slowly, and burns where it stops. It prefers the shade: no shade is safe from it. The cupping
  // hand hangs low and still while it works (strike it from the gnomon).
  function* atkLens() {
    const P = G.player, h = nearHand();
    h.busy = true; h.topen = 0.3; h.tcurl = 0.9; h.trot = 0.9 * h.side;
    const hx = G.clamp(MID + h.side * 160, WL + 120, WR - 120);
    AU.play('solHand');
    yield* handMove(h, hx, FLOOR - 250, 0.5);
    h.glow = 0.4; h.low = true;
    const spot = { x: P.x, r: 30 };
    B.lensSpot = spot;
    let e = 0;
    const dur = 1.6 * T();
    AU.play('charge', { dur });
    while (e < dur) {
      const dt = yield; e += dt;
      spot.x += (P.x - spot.x) * (1 - Math.exp(-(e < dur - 0.4 ? 2.2 : 0) * dt));
      spot.r = 30 + 50 * e / dur;
      h.glow = 0.4 + 0.6 * e / dur;
    }
    ray(spot.x, 0.05, spot.r * 2, 1);
    yield* wait(0.35);
    B.lensSpot = null; h.glow = 0; h.low = false;
    yield* handMove(h, HAND_REST[h.i].x, HAND_REST[h.i].y, 0.5);
    h.busy = false;
  }

  // Swat: a hero who stays high over the ridge: a hand draws back to her shoulder, palm sideways, and
  // swats across at that height. Come down.
  function* atkSwat() {
    const P = G.player, h = P.x > MID ? B.hands[0] : B.hands[1];
    const hand = h.broken ? nearHand() : h, y = G.clamp(P.y - 30, FLOOR - 420, FLOOR - 130);
    hand.busy = true; hand.topen = 1; hand.tcurl = 0; hand.trot = 1.5 * hand.side;
    const from = hand.side < 0 ? WL - 40 : WR + 40, to = hand.side < 0 ? WR + 80 : WL - 80;
    AU.play('solHand');
    yield* handMove(hand, from, y, 0.45);
    yield* wait(0.45 * T());
    AU.play('whoosh');
    const hz = boxHaz(() => ({ cx: hand.x, cy: hand.y, hw: 60, hh: 70 }), 0.5);
    yield* handMove(hand, to, y, 0.45, E.inOutSine);
    hz.dead = true;
    yield* handMove(hand, HAND_REST[hand.i].x, HAND_REST[hand.i].y, 0.5);
    hand.busy = false;
  }

  // Hammer of Noon: both hands rise over the middle of the ridge, fingers lacing together; they come down
  // as one. The blow shakes the whole ridge: be in the air when it lands. Then they lie there a while.
  function* atkHammer() {
    const [l, r] = B.hands;
    if (l.broken || r.broken) { yield* atkPalm(); return; }
    l.busy = r.busy = true;
    for (const h of [l, r]) { h.topen = 0.2; h.tcurl = 1.4; h.trot = 1.4 * h.side; }
    AU.play('solHand', { vol: 1.2 });
    yield* both(handMove(l, MID - 60, FLOOR - 470, 0.7), handMove(r, MID + 60, FLOOR - 470, 0.7));
    B.faceS.mouth = 0.4;
    AU.play('charge', { dur: 1.1 * T() });
    const mk = K.columnMark(MID, 320, true);
    let e = 0;
    while (e < 1.1 * T()) { const dt = yield; e += dt; l.y = r.y = FLOOR - 470 - 30 * Math.min(1, e); }
    B.faceS.mouth = 0;
    yield* both(handMove(l, MID - 60, FLOOR - 50, 0.2, E.inCubic), handMove(r, MID + 60, FLOOR - 50, 0.2, E.inCubic));
    mk.dead = true;
    K.crush(MID, FLOOR - 50, 150, 60, 2);
    quake(0.22, 1);
    slamFx(MID, FLOOR, true);
    G.fx.flash(SUNHOT, 0.35, 0.3);
    for (const d of [-1, 1]) G.fx.dust(MID + d * 200, FLOOR, 8, { dir: d, speed: [100, 500], size: [8, 16], up: 40 });
    l.low = r.low = true;
    yield* wait(1.6);
    l.low = r.low = false;
    yield* both(handMove(l, HAND_REST[0].x, HAND_REST[0].y, 0.6), handMove(r, HAND_REST[1].x, HAND_REST[1].y, 0.6));
    l.busy = r.busy = false;
  }

  // ------------------------------------------------------------------ the Fall (and the Eclipse): her blade
  // One cut: the wind-up pose (held for tele), then the strike pose as the blade comes through.
  // o: the swing (a0, a1 in her facing, r, dy, dmg...), step (how far she steps into it)
  function* cut(wind, strike, o) {
    const b = B.body;
    facePlayer();
    setPose(wind);
    swing(o);
    yield* wait(Math.max(0.05, o.tele - 0.06));
    setPose(strike, true);
    if (o.step) yield* stepIn(o.step, 0.12); else yield* wait(0.06);
    yield* wait((o.active || 0.12) + (o.after || 0.05));
    b.fast = false;
  }
  const OVER = { a0: -2.1, a1: 1.0, r: 150 };   // high behind to low in front: the falling cut
  const RISE = { a0: 1.0, a1: -1.7, r: 150 };   // and the weight of it carried back up
  // a stripe of fire left along the floor where her blade passed (Horizon, the Crossing): it burns a
  // moment, then goes out
  function floorFire(l, r, dur) {
    return H.add({
      kind: 'floorfire', layer: 'under', l, r, dur, dmg: 1, srcX: (l + r) / 2,
      update() { if (this.t > this.dur) this.dead = true; if (Math.random() < 0.5) G.fx.spawn({ kind: 'spark', x: G.rand(this.l, this.r), y: FLOOR - 2, vx: 0, vy: -G.rand(60, 200), life: 0.4, size: G.rand(1.5, 3), color: B.phase === 3 ? RIM : BURN }); },
      hits(P) { return this.t > 0.05 && P.onGround && P.x > this.l && P.x < this.r && P.y >= FLOOR - 4; },
      draw(ctx) {
        const k = Math.min(1, this.t / 0.1) * Math.min(1, (this.dur - this.t) / 0.3);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const c = B.phase === 3 ? RIM : BURN;
        ctx.fillStyle = G.rgba(c, 0.5 * k); ctx.fillRect(this.l, FLOOR - 7, this.r - this.l, 9);
        ctx.fillStyle = G.rgba(SUNHOT, 0.8 * k); ctx.fillRect(this.l, FLOOR - 3, this.r - this.l, 3);
        ctx.restore();
      },
    });
  }

  // Meridian: how high she lifts the blade says how many cuts: level with her crown, two (a falling cut
  // and its rise); straight up, three, the third a leaping cut that comes down on you.
  function* atkMeridian() {
    const three = K.chance(B.phase === 3 ? 0.6 : 0.45, 'three'), t0 = (three ? 0.62 : 0.52) * T();
    yield* cut(three ? 'upC' : 'crownC', 'cutDown', Object.assign({ tele: t0, step: 34, k: 0 }, OVER));
    yield* cut('cutDown', 'cutUp', Object.assign({ tele: 0.3 * T(), step: 24, k: 2, trail: !three }, RISE));
    if (three) {
      const P = G.player, b = B.body;
      setPose('leapCut');
      yield* wait(0.18 * T());
      const x = clampX(G.lerp(b.x, P.x, 0.85));
      const sw = swing(Object.assign({ tele: 0.42, k: 4, dy: 50, trail: true }, OVER));
      yield* leapTo(x, 120, 0.4, 'leapCut');
      setPose('cutDown', true);
      sw.x = b.x + b.face * 10; sw.y = b.y - 50;
      yield* wait(0.2);
      G.fx.shake(8); G.fx.dust(b.x + b.face * 60, FLOOR, 4, { speed: [60, 220], size: [6, 12], up: 40 });
    }
    B.breathe = true;
  }

  // The Verdict: two cuts that are always the same; the third is read from her body on the second:
  // the blade over her shoulder, an overhead (dash through); low behind her, a sweep (jump); her weight
  // on her back foot, a thrust (dodge it, perfectly if you can).
  function* atkVerdict() {
    const r = G.rng(), end = G.debug.variant ? (K.chance(0, 'low') ? 'low' : K.chance(0, 'thrust') ? 'thrust' : 'over') : (r < 0.36 ? 'over' : r < 0.7 ? 'low' : 'thrust');
    yield* cut('crownC', 'cutDown', Object.assign({ tele: 0.5 * T(), step: 30 }, OVER));
    const hold = end === 'over' ? 'upC' : end === 'low' ? 'lowC' : 'thrustC';
    yield* cut('cutDown', hold === 'upC' ? 'cutUp' : hold, Object.assign({ tele: 0.28 * T(), step: 20, k: 2 }, RISE));
    setPose(hold);
    yield* wait(0.34 * T());
    if (end === 'over') yield* cut('upC', 'cutDown', Object.assign({ tele: 0.12, step: 40, k: 4, dmg: 1, trail: true }, OVER, { r: 170 }));
    else if (end === 'low') yield* horizonCut(0.1);
    else yield* thrust(0.12, 220);
    B.breathe = true;
  }
  // a low sweep along the floor in front of her (Horizon, and the Verdict's low ending)
  function* horizonCut(tele) {
    const b = B.body;
    facePlayer(); setPose('lowC');
    yield* wait(tele);
    setPose('sweep', true); AU.play('solBlade', { k: 1 }); AU.play('whoosh');
    const f = b.face;
    yield* stepIn(40, 0.1);
    K.crush(b.x + f * 100, FLOOR - 20, 110, 22, 1);
    G.fx.cut(b.x + f * 100, FLOOR - 24, f > 0 ? 0 : Math.PI, 220, 14, B.phase === 3 ? RIM : FALL, SUNHOT, 0.25);
    floorFire(Math.min(b.x, b.x + f * 220), Math.max(b.x, b.x + f * 220), K.hard() ? 1.6 : 1.1);
    yield* wait(0.25);
  }
  // a thrust across the ground in front of her: far is how far it carries her
  function* thrust(tele, far) {
    const b = B.body;
    facePlayer(); setPose('thrustC');
    yield* wait(tele);
    setPose('thrust', true); AU.play('solBlade', { k: 3 }); AU.play('dash');
    const f = b.face, x0 = b.x, x1 = clampX(b.x + f * far);
    const hz = boxHaz(() => ({ cx: b.x + f * 70, cy: b.y - 58, hw: 70, hh: 16 }), 0.24);
    let e = 0;
    while (e < 0.2) { const dt = yield; e += dt; b.x = G.lerp(x0, x1, E.outCubic(Math.min(1, e / 0.2))); if (Math.random() < 0.5) ghost(0.2); }
    hz.dead = true;
    yield* wait(0.2);
  }

  // Horizon: she drops her back knee and lays the blade behind her, near the floor: a wide low sweep
  // that leaves a line of fire on the ridge. Jump it, and do not land in the fire.
  function* atkHorizon() { yield* horizonCut(0.55 * T()); }

  // The Crossing: from one knee, her crown flaring, she crosses the whole ridge in one cut and leaves it
  // burning behind her. At the far side: if her head turns back, she comes back the same way.
  function* atkCrossing() {
    const b = B.body, P = G.player, back = K.chance(B.phase === 3 ? 0.55 : 0.4, 'back');
    facePlayer(); setPose('lungeC'); b.crownK = 1; AU.play('charge', { dur: 0.6 });
    K.gentleLane(b.x, b.face > 0 ? WR : WL, 0.6 * T());
    yield* wait(0.6 * T());
    b.crownK = 0;
    for (let pass = 0; pass < (back ? 2 : 1); pass++) {
      const f = b.face, x0 = b.x, x1 = f > 0 ? WR - 70 : WL + 70;
      setPose('lunge', true); AU.play('solBlade', { k: 4 }); AU.play('dash'); G.fx.shake(6);
      const hz = boxHaz(() => ({ cx: b.x, cy: b.y - 50, hw: 40, hh: 46 }), 0.34);
      let e = 0;
      while (e < 0.3) { const dt = yield; e += dt; b.x = G.lerp(x0, x1, E.inOutQuad(Math.min(1, e / 0.3))); if (Math.random() < 0.7) ghost(0.25); }
      hz.dead = true;
      floorFire(Math.min(x0, x1), Math.max(x0, x1), K.hard() ? 1.8 : 1.3);
      G.fx.cut((x0 + x1) / 2, FLOOR - 56, 0, Math.abs(x1 - x0), 10, B.phase === 3 ? RIM : FALL, SUNHOT, 0.3);
      setPose('ready');
      if (pass === 0 && back) {
        // her head turns back: the tell for the return
        b.face = -f; yield* wait(0.5 * T()); setPose('lungeC'); yield* wait(0.25);
      } else yield* wait(0.55);
    }
  }

  // Falling Sky: she lifts her blade to the broken sky and pieces of it fall, each one's shadow growing
  // where it will land. How she holds the blade says how they fall: straight up, scattered over the
  // ridge; pointed at you, a line that walks to you; circled over her head, a ring round you, then one
  // on you.
  function* atkFallingSky() {
    const b = B.body, P = G.player, r = G.rng();
    const kind = G.debug.variant ? (K.chance(0, 'line') ? 'line' : K.chance(0, 'ring') ? 'ring' : 'scatter') : (r < 0.34 ? 'scatter' : r < 0.67 ? 'line' : 'ring');
    facePlayer();
    setPose(kind === 'line' ? 'point' : 'pointUp');
    AU.play('solCrack', { vol: 0.5 });
    B.skyCrack = Math.max(B.skyCrack, 1);
    let e = 0;
    while (e < 0.55 * T()) { const dt = yield; e += dt; if (kind === 'ring') b.p[8] = -1.57 + Math.sin(e * 14) * 0.6; }
    const at = [];
    const lead = 1.0 * T();
    if (kind === 'scatter') for (let i = 0; i < 5; i++) at.push([G.rand(WL + 60, WR - 60), lead + i * 0.12]);
    else if (kind === 'line') { const d = G.sign(P.x - b.x) || 1; for (let i = 0; i < 6; i++) at.push([clampX(b.x + d * (90 + i * 110)), lead + i * 0.16]); }
    else { for (const dx of [-200, -100, 100, 200]) at.push([clampX(P.x + dx), lead]); at.push([clampX(P.x), lead + 0.55]); }
    for (const [x, d] of at) fragment(x, d);
    yield* wait(0.5);
  }
  // a piece of the broken sky: its shadow grows on the floor for delay seconds, then it lands
  function fragment(x, delay, big) {
    const w = big ? 160 : 70;
    AU.play('solFall', { dur: Math.min(1, delay) });
    return H.add({
      kind: 'fragment', layer: 'under', x, delay, w, srcX: x, dmg: big ? 2 : 1, landed: false,
      update() {
        if (this.t >= this.delay && !this.landed) {
          this.landed = true;
          K.crush(this.x, FLOOR - 40, this.w / 2, 46, this.dmg);
          slamFx(this.x, FLOOR, !!big);
          B.fragments.push({ x: this.x, w: this.w * 0.6, h: big ? 70 : 26, t: 0, life: big ? 999 : 3 });
        }
        if (this.t > this.delay + 0.1) this.dead = true;
      },
      draw(ctx) {
        // the shadow, growing and darkening; the stone itself in the last moment, falling
        const k = Math.min(1, this.t / this.delay);
        ctx.fillStyle = 'rgba(20,8,6,' + (0.2 + 0.6 * k) + ')';
        ctx.beginPath(); ctx.ellipse(this.x, FLOOR + 1, this.w / 2 * (0.4 + 0.6 * k), 6 + 6 * k, 0, 0, G.TAU); ctx.fill();
        if (k > 0.6) {
          const q = (k - 0.6) / 0.4, y = G.lerp(-60, FLOOR - 30, q * q);
          ctx.fillStyle = '#2a1610'; ctx.strokeStyle = G.rgba(BURN, 0.9); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(this.x - this.w * 0.35, y); ctx.lineTo(this.x, y - this.w * 0.4); ctx.lineTo(this.x + this.w * 0.3, y + 4); ctx.lineTo(this.x + 4, y + this.w * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
          D.glow(ctx, BURN, this.x, y, this.w, 0.6);
        }
      },
    });
  }

  // Glare: she stands utterly still, her blade held flat, her eyes shut: she is never still otherwise.
  // A blade struck against her is answered at once. Her own light turned on her (a special) breaks it.
  function* atkGlare() {
    const b = B.body;
    facePlayer(); setPose('glare'); b.eyes = 0;
    B.glaring = true; B.glareHit = false;
    let e = 0;
    const dur = 1.7;
    while (e < dur && !B.glareHit) { const dt = yield; e += dt; }
    B.glaring = false;
    if (B.glareHit === 'broken') { b.eyes = 1; return; } // (the stance broken: the stagger has the rest)
    b.eyes = 1;
    if (B.glareHit) {
      // the answer: at once, a flash and a cut through where you stand
      G.fx.flash(SUNHOT, 0.3, 0.2); AU.play('solFlare', { vol: 0.6 });
      yield* cut('glare', 'cutDown', Object.assign({ tele: 0.14, step: 60, k: 5 }, OVER, { r: 175 }));
      yield* cut('cutDown', 'cutUp', Object.assign({ tele: 0.2, step: 30, k: 6, trail: true }, RISE));
    }
  }
  B.blocked = function (t, info) {
    if (!B.glaring || !info) return false;
    if (info.lance || info.special || info.shot) { B.glareHit = 'broken'; B.glaring = false; B.blindNow = true; return false; }
    if (G.sign(G.player.x - B.body.x) !== B.body.face) return false; // (from behind it lands)
    B.glareHit = true;
    G.fx.tink(t.cx, t.cy, 0); AU.play('tink');
    return true;
  };

  // Zenith Fall: she crouches and looks straight up, then leaps out of sight; her shadow grows on the
  // ridge where you stand (it follows you, then stops). She comes down blade first, and it sticks.
  function* atkZenith() {
    const b = B.body, P = G.player;
    facePlayer(); setPose('crouch'); b.eyes = 1;
    yield* wait(0.55 * T());
    AU.play('jump'); AU.play('whoosh');
    setPose('dive');
    const x0 = b.x;
    let e = 0;
    while (e < 0.3) { const dt = yield; e += dt; b.y = G.lerp(FLOOR, -160, E.inQuad(Math.min(1, e / 0.3))); }
    b.hidden = true;
    const sh = { x: P.x, k: 0 };
    B.diveShadow = sh;
    e = 0;
    const tr = 0.8 * T();
    const mk = K.columnMark(sh.x, 160, true);
    while (e < tr) { const dt = yield; e += dt; sh.k = e / tr; if (e < tr - 0.3) sh.x += (clampX(P.x) - sh.x) * (1 - Math.exp(-6 * dt)); mk.x = sh.x; }
    mk.dead = true;
    b.x = sh.x; b.hidden = false; b.y = -120;
    AU.play('solComet', { dur: 0.2 });
    e = 0;
    while (e < 0.14) { const dt = yield; e += dt; b.y = G.lerp(-120, FLOOR, Math.min(1, e / 0.14)); }
    b.y = FLOOR; B.diveShadow = null;
    K.crush(b.x, FLOOR - 50, 70, 60, 2);
    slamFx(b.x, FLOOR, true);
    setPose('stuck', true);
    // stuck: the punish
    B.stuck = true;
    yield* wait(K.hard() ? 1.1 : 1.5);
    B.stuck = false;
    setPose('risingC'); AU.play('whoosh'); G.fx.dust(b.x, FLOOR, 4, { speed: [40, 160], size: [5, 10], up: 30 });
    yield* wait(0.25);
  }

  // Dayrise: a deep crouch, the blade pointing down by her heel: a rising cut that throws you up.
  // Step back from it; she lands open.
  function* atkDayrise() {
    const b = B.body, P = G.player;
    yield* stepTo(G.lerp(b.x, P.x, 0.5), 0.2);
    facePlayer();
    yield* cut('risingC', 'rising', { a0: 1.3, a1: -1.6, r: 140, dy: 40, tele: 0.5 * T(), step: 20, k: 3, onFire() { B.pushPlayer(200, 160); } });
    b.y = FLOOR; b.air = true;
    let e = 0;
    while (e < 0.5) { const dt = yield; e += dt; b.y = FLOOR - 100 * Math.sin(Math.PI * Math.min(1, e / 0.5)); }
    b.y = FLOOR; b.air = false; AU.play('land');
    setPose('kneel'); yield* wait(0.5);
  }

  // Sunhold: she reaches out with her free hand, palm glowing, leaning in: a grab. Caught, you burn in
  // her hand and she throws you. Dash through her as she comes; a perfect dodge leaves her wide open.
  function* atkSunhold() {
    const b = B.body, P = G.player;
    facePlayer(); setPose('thrustC'); b.palm = 1; AU.play('charge', { dur: 0.6 });
    yield* wait(0.6 * T());
    setPose('lunge', true); AU.play('dash');
    const f = b.face, x0 = b.x, x1 = clampX(b.x + f * 260);
    let caught = false, e = 0;
    while (e < 0.28 && !caught) {
      const dt = yield; e += dt;
      b.x = G.lerp(x0, x1, E.outQuad(Math.min(1, e / 0.28)));
      const box = { cx: b.x + f * 40, cy: b.y - 60, hw: 30, hh: 36 };
      if (!P.dead && G.canHurt() && P.iframes <= 0 && P.inv <= 0 && !G.debug.god && !P.ulting && G.rectsOverlap(P.box(), box)) caught = true;
    }
    b.palm = 0;
    if (caught) {
      P.grabbed = { x: b.x + f * 40, y: b.y - 20, face: -f };
      AU.play('solSear'); G.fx.shake(8);
      let q = 0;
      while (q < 0.7) { const dt = yield; q += dt; if (Math.random() < 0.6) G.fx.spawn({ kind: 'spark', x: P.x + G.rand(-10, 10), y: P.y - G.rand(0, 50), vx: G.rand(-40, 40), vy: -G.rand(60, 200), life: 0.4, size: 2.5, color: BURN }); }
      setPose('cutUp', true);
      P.grabbed = null; P.inv = 0;
      P.tryHit(1, b.x, { kind: 'sunhold' });
      P.vx = f * 600; P.vy = -300;
      yield* wait(0.4);
    } else {
      setPose('kneel');
      yield* wait(0.7);
    }
  }

  // Solstice: the blade tucked behind her back, her hips wound round: she comes forward spinning, the
  // blade all the way round her, three times. Back away, or go over her.
  function* atkSolstice() {
    const b = B.body, P = G.player;
    facePlayer(); setPose('spinC'); AU.play('charge', { dur: 0.5 });
    yield* wait(0.55 * T());
    const f = b.face, x0 = b.x, x1 = clampX(b.x + f * 330);
    const hz = boxHaz(() => ({ cx: b.x, cy: b.y - 56, hw: 96, hh: 40 }), 1.0);
    let e = 0, n = 0;
    while (e < 0.95) {
      const dt = yield; e += dt;
      b.x = G.lerp(x0, x1, Math.min(1, e / 0.95));
      b.p[8] = (b.p[8] + dt * 22) % G.TAU; b.pose = 'spin'; b.fast = true;
      if (e > n * 0.32) { n++; AU.play('solBlade', { k: n }); AU.play('whoosh'); G.fx.ring(b.x, b.y - 56, { r0: 40, r1: 110, life: 0.2, color: B.phase === 3 ? RIM : FALL, width: 6 }); }
    }
    hz.dead = true;
    setPose('ready');
    yield* wait(0.5);
  }

  // Afterglow: she dashes through you; the shape she leaves at the start of it brightens, and a beat
  // later it cuts along the whole of her path. Two dodges: one for her, one for her echo.
  function* atkAfterglow() {
    const b = B.body, P = G.player;
    facePlayer(); setPose('lungeC');
    yield* wait(0.45 * T());
    const f = b.face, x0 = b.x, x1 = clampX(P.x + f * 180);
    B.echo = { x0, x1, y: b.y, p: b.p.slice(), face: f, t: 0, k: 0 };
    setPose('lunge', true); AU.play('dash'); AU.play('solBlade', { k: 2 });
    const hz = boxHaz(() => ({ cx: b.x, cy: b.y - 50, hw: 36, hh: 44 }), 0.24);
    let e = 0;
    while (e < 0.22) { const dt = yield; e += dt; b.x = G.lerp(x0, x1, E.outQuad(Math.min(1, e / 0.22))); }
    hz.dead = true;
    b.face = -f; setPose('ready');
    // the echo brightens
    e = 0;
    const beat = 0.5 * T();
    while (e < beat) { const dt = yield; e += dt; B.echo.k = e / beat; }
    AU.play('solBlade', { k: 5 }); G.fx.flash(SUNHOT, 0.15, 0.15);
    const l = Math.min(x0, x1), r = Math.max(x0, x1);
    const hz2 = boxHaz(() => ({ cx: (l + r) / 2, cy: FLOOR - 52, hw: (r - l) / 2, hh: 40 }), 0.14);
    G.fx.cut((l + r) / 2, FLOOR - 56, 0, r - l, 12, B.phase === 3 ? RIM : FALL, SUNHOT, 0.3);
    yield* wait(0.16);
    hz2.dead = true; B.echo = null;
    yield* wait(0.3);
  }

  // The Returning Noon: a backhand grip, the arm drawn back: she throws the blade. It flies out low
  // along the ridge (jump it) to the wall and comes back high (stay down). While it is gone, she is open.
  function* atkReturning() {
    const b = B.body, P = G.player;
    facePlayer(); setPose('spinC');
    yield* wait(0.5 * T());
    setPose('spin', true); AU.play('whoosh');
    b.blade = false;
    const f = b.face, wall = f > 0 ? WR - 30 : WL + 30, sx = b.x + f * 30;
    const bl = { x: sx, y: FLOOR - 26, a: 0 };
    B.flyBlade = bl;
    const hz = H.add({ kind: 'blade', dmg: 1, update(dt) { bl.a += dt * 26; this.srcX = bl.x; }, hits(P2) { return G.circleRect(bl.x, bl.y, 26, P2.box()); } });
    let e = 0;
    const out = Math.abs(wall - sx) / 900;
    while (e < out) { const dt = yield; e += dt; bl.x = G.lerp(sx, wall, Math.min(1, e / out)); if (Math.random() < 0.4) AU.play('solRing'); }
    // up the wall, and back high
    e = 0;
    while (e < 0.25) { const dt = yield; e += dt; bl.y = G.lerp(FLOOR - 26, FLOOR - 118, E.inOutQuad(Math.min(1, e / 0.25))); }
    setPose('ready');
    e = 0;
    while (e < out) { const dt = yield; e += dt; bl.x = G.lerp(wall, b.x + f * 20, Math.min(1, e / out)); }
    hz.dead = true; B.flyBlade = null; b.blade = true;
    AU.play('tink'); setPose('idle');
    yield* wait(0.3);
  }

  // The Hours: her blade slung on her back, a deep coil: she leaps to a wall and crosses the ridge from
  // wall to wall, three times. Where she clings to the wall says how high she will cross: high, stay
  // down; low, jump. Stay in the middle and count.
  function* atkHours() {
    const b = B.body, P = G.player;
    facePlayer(); setPose('crouch');
    yield* wait(0.5 * T());
    let side = P.x < MID ? 1 : -1;
    yield* leapTo(side > 0 ? WR - 30 : WL + 30, 160, 0.4, 'leapCut');
    for (let i = 0; i < 3; i++) {
      const high = K.chance(0.5, 'high' + i) || (i === 1 && G.debug.variant === 'alt');
      const y = high ? FLOOR - 150 : FLOOR - 40;
      // clinging to the wall at that height
      b.air = true; b.y = y + 40; b.face = -side; setPose('crouch');
      G.fx.dust(b.x, y, 3, { speed: [20, 90], size: [4, 8], up: 10 });
      yield* wait(0.45 * T());
      setPose('lunge', true); AU.play('dash'); AU.play('solBlade', { k: i + 2 });
      const x0 = b.x, x1 = side > 0 ? WL + 30 : WR - 30;
      const hz = boxHaz(() => ({ cx: b.x, cy: y, hw: 44, hh: 24 }), 0.42);
      let e = 0;
      while (e < 0.38) { const dt = yield; e += dt; b.x = G.lerp(x0, x1, Math.min(1, e / 0.38)); if (Math.random() < 0.6) ghost(0.2); }
      hz.dead = true;
      side = -side;
    }
    b.air = false;
    yield* leapTo(MID + side * 200, 80, 0.35, 'leapCut');
    setPose('kneel'); yield* wait(0.6);
  }

  // Gnomons: she drives her blade into the ridge and pillars of light burst up out of it in a row. Her
  // hand pushing down on the pommel, they march outward from her; pulling it back, they march in from
  // the walls towards her.
  function* atkGnomons() {
    const b = B.body, out = K.chance(0.5, 'out');
    facePlayer(); setPose('risingC');
    yield* wait(0.35);
    setPose(out ? 'stuck' : 'pull', true); slamFx(b.x + b.face * 30, FLOOR, false);
    yield* wait(0.4 * T());
    const n = 6, gap = 100;
    for (let i = 0; i < n; i++) {
      const xs = out ? [b.x - (i + 1) * gap, b.x + (i + 1) * gap] : [WL + 40 + i * gap, WR - 40 - i * gap];
      for (const x of xs) if (x > WL + 10 && x < WR - 10 && Math.abs(x - b.x) > 50) pillar(x, 0.28);
      yield* wait(0.16);
    }
    yield* wait(0.4);
    setPose('idle');
  }
  function pillar(x, tele) {
    return H.add({
      kind: 'pillar', x, tele, srcX: x, dmg: 1,
      update() { if (this.t > this.tele + 0.3) this.dead = true; if (this.t >= this.tele && !this.boomed) { this.boomed = true; AU.play('solFlare', { vol: 0.3 }); G.fx.burst(this.x, FLOOR - 4, { n: 8, color: B.phase === 3 ? RIM : FALL, speed: [100, 400], angle: -Math.PI / 2, spread: 0.6, life: [0.2, 0.4], kind: 'spark' }); } },
      hits(P) { return this.t >= this.tele && this.t < this.tele + 0.2 && Math.abs(P.x - this.x) < 26 && P.y > FLOOR - 170; },
      draw(ctx) {
        const c = B.phase === 3 ? RIM : FALL;
        if (this.t < this.tele) { const k = this.t / this.tele; D.glow(ctx, c, this.x, FLOOR - 4, 30 * k, 0.8); return; }
        const f = 1 - (this.t - this.tele) / 0.3, h = 170 * Math.min(1, (this.t - this.tele) / 0.06);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = G.rgba(c, 0.5 * f); ctx.fillRect(this.x - 18, FLOOR - h, 36, h);
        ctx.fillStyle = G.rgba(SUNHOT, 0.9 * f); ctx.fillRect(this.x - 6, FLOOR - h, 12, h);
        ctx.restore();
      },
    });
  }

  // Pursuit (a hero who stays over her head): she leaps up after you and cuts you down out of the air.
  function* atkPursuit() {
    const b = B.body, P = G.player;
    facePlayer(); setPose('crouch');
    yield* wait(0.32 * T());
    const x = clampX(P.x - b.face * 40), hgt = G.clamp(FLOOR - P.y + 30, 80, 300);
    const sw = swing(Object.assign({ tele: 0.3, k: 4, dy: 80 }, OVER));
    yield* leapTo(x, hgt, 0.42, 'upC');
    setPose('cutDown', true);
    sw.dead = true;
    yield* wait(0.3);
  }

  // Flashover (once, late in the Fall): her hair and crown flare white and she will not be stopped:
  // five cuts coming forward, faster each time; then she falls to one knee, spent. Live through it.
  function* atkFlashover() {
    const b = B.body;
    b.crownK = 1; B.armor = true;
    AU.play('roar'); G.fx.flash(SUNHOT, 0.3, 0.3); G.fx.shake(10);
    G.fx.ring(b.x, b.y - 60, { r0: 30, r1: 260, life: 0.5, color: SUNHOT, width: 10 });
    yield* wait(0.6 * T());
    for (let i = 0; i < 5; i++) {
      const o = i % 2 ? RISE : OVER;
      yield* cut(i % 2 ? 'cutDown' : 'crownC', i % 2 ? 'cutUp' : 'cutDown', Object.assign({ tele: Math.max(0.24, 0.42 - i * 0.04) * T(), step: 46, k: i, trail: i === 4 }, o));
    }
    B.armor = false; b.crownK = 0;
    setPose('kneel'); AU.play('whoosh');
    yield* wait(K.hard() ? 1.4 : 1.9); // spent: the punish
  }

  // ------------------------------------------------------------------ the Eclipse: her moves
  // A flare off her rim: the whole ridge lit for a heartbeat (and, with pools, light left on the floor)
  function flare(pools) {
    const b = B.body;
    B.reveal = 1; B.flaring = 0.35;
    AU.play('solFlare'); G.fx.flash(RIMHOT, 0.2, 0.25); G.fx.shake(5);
    G.fx.ring(b.x, b.y - 56, { r0: 30, r1: 600, life: 0.5, color: RIM, width: 8 });
    for (const x of pools || []) B.pools.push({ x, w: 150, t: 0, life: K.hard() ? 3.2 : 4.2 });
  }

  // Umbra Step: her rim goes out entirely; then embers glow on the ridge, one after another, walking
  // to you. Where the last one glows she steps out of the dark, cutting. Dodge into the last ember.
  function* atkUmbra() {
    const b = B.body, P = G.player;
    setPose('ready');
    AU.play('chHeart', { vol: 0.6 });
    let e = 0;
    while (e < 0.35) { const dt = yield; e += dt; b.alpha = 1 - e / 0.35; B.lightK = 1 - 0.7 * e / 0.35; }
    b.hidden = true; b.alpha = 0;
    const n = 4, x0 = b.x, xe = clampX(P.x + (G.sign(P.x - b.x) || 1) * 30);
    B.steps = [];
    for (let i = 0; i < n; i++) {
      const x = G.lerp(x0, xe, (i + 1) / n);
      B.steps.push({ x, t: 0 }); AU.play('solStep', { k: i });
      yield* wait(0.26 * T());
    }
    b.x = xe; b.face = G.sign(P.x - xe) || -b.face;
    b.hidden = false; b.alpha = 1; B.lightK = 1;
    yield* cut('crownC', 'cutDown', Object.assign({ tele: 0.22, step: 20, k: 3 }, OVER));
    B.steps = null;
    yield* wait(0.2);
  }

  // Corona Ring: her crown spins faster and brightens; she throws it. It flies out across the ridge and
  // comes back to her: jump it going and jump it coming.
  function* atkCorona() {
    const b = B.body;
    facePlayer(); b.crownK = 1; setPose('spinC');
    AU.play('solRing');
    yield* wait(0.55 * T());
    setPose('spin', true); AU.play('whoosh');
    const f = b.face, x0 = b.x + f * 30, wall = f > 0 ? WR - 40 : WL + 40;
    const ring = { x: x0, y: FLOOR - 34, a: 0 };
    B.ringOut = ring;
    const hz = H.add({ kind: 'corona', dmg: 1, update(dt) { ring.a += dt * 14; this.srcX = ring.x; if (Math.random() < 0.6) G.fx.spawn({ kind: 'spark', x: ring.x + G.rand(-20, 20), y: ring.y + G.rand(-20, 20), vx: -f * 60, vy: -G.rand(20, 90), life: 0.3, size: 2, color: RIM }); }, hits(P) { return G.circleRect(ring.x, ring.y, 24, P.box()); } });
    const d = Math.abs(wall - x0) / 800;
    let e = 0;
    while (e < d) { const dt = yield; e += dt; ring.x = G.lerp(x0, wall, E.outSine(Math.min(1, e / d))); }
    setPose('ready');
    e = 0;
    while (e < d) { const dt = yield; e += dt; ring.x = G.lerp(wall, b.x, E.inSine(Math.min(1, e / d))); }
    hz.dead = true; B.ringOut = null; b.crownK = 0;
    AU.play('tink');
    yield* wait(0.25);
  }

  // Black Noon: she flares, and the light she throws off lies in pools on the ridge; then the dark burns
  // in earnest, everywhere but in the pools and close to her. Get into the light.
  function* atkBlackNoon() {
    const b = B.body, P = G.player;
    setPose('spread'); b.crownK = 1;
    AU.play('charge', { dur: 0.6 });
    yield* wait(0.5 * T());
    const xs = [clampX(P.x + G.rand(-260, 260)), clampX(b.x + (P.x < b.x ? 320 : -320)), clampX(MID + G.rand(-400, 400))];
    flare(xs);
    yield* wait(0.5 * T());
    // the burn: the dark itself, for a while
    const bn = burn(1.6, { safe: (x, y) => litAt(x, y) });
    B.lightK = 0.55;
    yield* wait(1.7);
    bn.dead = true; B.lightK = 1; b.crownK = 0;
    setPose('ready');
  }

  // Snapshot: a flare lights the ridge for an instant and shows you how she stands; then the dark, and
  // she does what you saw: crouched low, she sweeps the floor (jump); blade high, she falls on you from
  // above (move).
  function* atkSnapshot() {
    const b = B.body, P = G.player, low = K.chance(0.5, 'low');
    facePlayer();
    setPose(low ? 'lowC' : 'crouch');
    yield* wait(0.25);
    flare();
    yield* wait(0.55 * T());
    if (low) yield* horizonCut(0.05);
    else {
      AU.play('jump');
      const x = clampX(P.x);
      yield* leapTo(x, 200, 0.5, 'leapCut');
      K.crush(b.x, FLOOR - 50, 64, 60, 1);
      slamFx(b.x, FLOOR, false);
      setPose('stuck', true);
      yield* wait(0.8);
    }
  }

  // False Suns: she splits into three in the dark. The real one's rim flickers like a flame breathing;
  // the false ones burn steady. Strike a false one and it bursts into light (and Starlight for you);
  // then all three cut at once. (The false ones' cuts are only light: they do not hurt.)
  function* atkFalseSuns() {
    const b = B.body, P = G.player;
    setPose('ready');
    flare();
    const xs = [clampX(P.x - 260), clampX(P.x + 260), clampX(P.x + (G.rng() < 0.5 ? -130 : 130))];
    const real = (G.rng() * 3) | 0;
    B.decoys = xs.map((x, i) => ({ x, real: i === real, hp: 1, burst: 0, face: G.sign(P.x - x) || 1 }));
    b.x = xs[real]; facePlayer();
    yield* wait(1.4 * T());
    // they cut
    for (const d of B.decoys) if (!d.real && d.burst <= 0) G.fx.cut(d.x + d.face * 60, FLOOR - 60, d.face > 0 ? -0.6 : Math.PI + 0.6, 160, 8, RIM, RIMHOT, 0.25);
    B.decoys = B.decoys.filter((d) => d.real);
    yield* cut('crownC', 'cutDown', Object.assign({ tele: 0.2, step: 30, k: 4 }, OVER));
    B.decoys = null;
  }

  // Corona Whip: the rim peels off her as a lash of fire, the only lit thing on the ridge: lashed low
  // along the floor (jump), or high across (stay down).
  function* atkWhip() {
    const b = B.body, low = K.chance(0.5, 'low');
    facePlayer(); setPose(low ? 'lowC' : 'crownC'); b.crownK = 0.6;
    AU.play('solRing');
    yield* wait(0.5 * T());
    setPose(low ? 'sweep' : 'cutDown', true); AU.play('whoosh'); AU.play('solFlare', { vol: 0.4 });
    const f = b.face, y = low ? FLOOR - 18 : FLOOR - 120;
    B.lash = { x0: b.x, x1: clampX(b.x + f * 520), y, t: 0 };
    const hz = boxHaz(() => ({ cx: (B.lash.x0 + B.lash.x1) / 2, cy: y, hw: Math.abs(B.lash.x1 - B.lash.x0) / 2, hh: 16 }), 0.2);
    yield* wait(0.3);
    hz.dead = true; B.lash = null; b.crownK = 0;
    yield* wait(0.3);
  }

  // Drain: she breathes in and her light draws in with it: the lit ground round her shrinks, and the
  // Starlight runs out of you towards her. She cannot move while she drinks it: strike her.
  function* atkDrain() {
    const b = B.body, P = G.player;
    setPose('spread'); AU.play('chGather', { dur: 1.8 });
    let e = 0;
    while (e < 1.8) {
      const dt = yield; e += dt;
      B.lightK = 1 - 0.55 * Math.min(1, e / 0.8);
      if (P.ember > 0) P.ember = Math.max(0, P.ember - 40 * dt);
      if (Math.random() < dt * 30) { const a = G.rand(0, G.TAU), r = G.rand(100, 260); G.fx.spawn({ kind: 'spark', x: b.x + Math.cos(a) * r, y: b.y - 56 + Math.sin(a) * r, vx: -Math.cos(a) * r * 2, vy: -Math.sin(a) * r * 2, life: 0.4, size: 2, color: RIM, len: 0.05 }); }
    }
    // what she drank, let go in a ring
    AU.play('solFlare');
    H.ring({ x: b.x, y: b.y - 40, r: 40, speed: 520, thick: 22, maxR: 700, tint: { boss: RIM, hot: RIMHOT } });
    B.lightK = 1;
    yield* wait(0.5);
  }

  // Total Eclipse: even your own light goes out. For two heartbeats there is only her rim, drawing in
  // to a closed ring of fire round her; when it closes it bursts. Dash as it closes.
  function* atkTotal() {
    const b = B.body;
    setPose('float');
    B.total = 0;
    AU.play('solDrain', { dur: 1.6 });
    let e = 0;
    while (e < 1.6 * T()) { const dt = yield; e += dt; B.total = Math.min(1, e / 0.4); B.totalR = 420 - 360 * Math.min(1, e / (1.6 * T())); if (e > 0.6 && Math.floor(e / 0.5) !== Math.floor((e - dt) / 0.5)) AU.play('chHeart', { vol: 0.8 }); }
    // it closes: the burst
    AU.play('solFlare', { vol: 1.2 }); G.fx.shake(14); G.fx.flash(RIMHOT, 0.5, 0.3);
    H.ring({ x: b.x, y: b.y - 50, r: 60, speed: 900, thick: 30, maxR: 1200, tint: { boss: RIM, hot: RIMHOT } });
    B.total = 0;
    B.reveal = 1;
    yield* wait(0.5);
    setPose('ready');
  }

  // Sunspots: dark motes hang in the air round the ridge; they show only in light (near her, or near
  // you). After a moment they fall.
  function* atkSunspots() {
    const b = B.body, P = G.player;
    setPose('spread'); AU.play('chGather', { dur: 0.6 });
    yield* wait(0.4);
    for (let i = 0; i < 6; i++) {
      const x = clampX(P.x + G.rand(-360, 360)), y = FLOOR - G.rand(60, 200);
      H.add({
        kind: 'spot', x, y, dmg: 1, srcX: x, fall: 1.4 * T() + i * 0.08, vy: 0,
        update(dt) { if (this.t > this.fall) { this.vy += 1400 * dt; this.y += this.vy * dt; } if (this.y > FLOOR) { this.dead = true; G.fx.burst(this.x, FLOOR - 4, { n: 6, color: RIM, speed: [40, 160], life: [0.2, 0.4] }); } },
        hits(P2) { return G.circleRect(this.x, this.y, 12, P2.box()); },
        draw(ctx) {
          const vis = litAt(this.x, this.y) || Math.hypot(this.x - P.x, this.y - P.y + 30) < 90 ? 1 : 0.06;
          ctx.fillStyle = 'rgba(4,2,2,' + vis + ')'; ctx.beginPath(); ctx.arc(this.x, this.y, 11, 0, G.TAU); ctx.fill();
          ctx.strokeStyle = G.rgba(RIM, 0.9 * vis); ctx.lineWidth = 1.5; ctx.stroke();
        },
      });
    }
    yield* wait(1.0);
    setPose('ready');
  }

  // ---------------------------------------------------------------- the last light (below 8%)
  // The Last Light (below 12%): she rises into the sky as a black sun and draws in every light left. What is left of her own light
  // falls out of her as steps of light, one above another. Climb them while the dark rains; at the top
  // your Dawnbreak is full: strike the black sun. Take too long and she lets the Duskbreak go, and the
  // steps fall and rise again.
  function* atkLastLight() {
    const b = B.body, P = G.player;
    B.invuln = true; B.lastLightOn = true;
    setPose('float');
    AU.play('roar'); G.audio.setIntensity(0);
    // up into the sky
    const x0 = b.x;
    let e = 0;
    while (e < 1.2) { const dt = yield; e += dt; const k = E.inOutQuad(Math.min(1, e / 1.2)); b.x = G.lerp(x0, MID, k); b.y = G.lerp(FLOOR, FLOOR - 430, k); b.air = true; B.lightK = 1 - 0.6 * k; }
    B.blackSun = 0;
    e = 0;
    AU.play('solDrain', { dur: 1.2 });
    while (e < 1.0) { const dt = yield; e += dt; B.blackSun = Math.min(1, e); }
    for (let tries = 0; tries < 3 && !P.dead; tries++) {
      // the steps of light
      const side = P.x < MID ? -1 : 1;
      G.arena.layout('sol', 'last');
      yield* wait(0.6);
      // the dark rains while you climb; the Dawnbreak is yours at the top
      B.rainT = 0; B.duskT = 0;
      const limit = K.gentle() ? 14 : K.hard() ? 9 : 11;
      let top = false;
      while (!P.dead && B.duskT < limit) {
        const dt = yield; B.duskT += dt; B.rainT -= dt;
        if (B.rainT <= 0) {
          B.rainT = K.hard() ? 0.45 : 0.6;
          const x = clampX(P.x + G.rand(-200, 200));
          H.add({ kind: 'rain', x, y: -20, dmg: 1, srcX: x, update(q) { this.y += 520 * q; if (this.y > FLOOR) this.dead = true; }, hits(P2) { return G.circleRect(this.x, this.y, 9, P2.box()); }, draw(ctx) { ctx.fillStyle = 'rgba(6,2,4,0.95)'; ctx.beginPath(); ctx.arc(this.x, this.y, 9, 0, G.TAU); ctx.fill(); ctx.strokeStyle = G.rgba(RIM, 0.9); ctx.lineWidth = 1.5; ctx.stroke(); D.glow(ctx, RIM, this.x, this.y - 10, 18, 0.5); } });
        }
        // at the top step: the light is yours
        if (P.onGround && P.plat && P.y < FLOOR - 240) {
          if (!top) {
            top = true;
            P.ult = 100;
            AU.play('solDawn'); G.fx.flash(SUNHOT, 0.4, 0.4);
            G.fx.ring(P.x, P.y - 30, { r0: 20, r1: 260, life: 0.6, color: G.hero().hot, width: 10 });
            B.invuln = false; B.hp = Math.min(B.hp, 1); // (any blow now ends it; a Dawnbreak ends it as she should be ended)
          }
        }
        if (B.dying || B.toppled || P.ulting) break;
      }
      if (B.dying || B.toppled || P.ulting) break;
      if (P.dead) return;
      // the Duskbreak: too slow. The steps fall, and it goes through you.
      B.invuln = true;
      AU.play('solFlare', { vol: 1.3 }); G.fx.flash(INK, 0.6, 0.6); G.fx.shake(24);
      G.arena.layout('sol', 3);
      P.iframes = 0; P.inv = 0;
      P.tryHit(K.hard() ? 2 : 1, b.x, { kind: 'duskbreak' });
      yield* wait(1.4);
    }
    while (P.ulting) yield;
    B.lastLightOn = false;
  }

  // ------------------------------------------------------------------ the boss
  B.ATTACKS = {
    // Noon
    noonray: atkNoonray, palm: atkPalm, clap: atkClap, rake: atkRake, volley: atkVolley, tears: atkTears,
    kindhand: atkKindHand, pinch: atkPinch, drum: atkDrum, lens: atkLens, swat: atkSwat, hammer: atkHammer,
    // the Fall (and carried into the Eclipse)
    meridian: atkMeridian, verdict: atkVerdict, horizon: atkHorizon, crossing: atkCrossing, fallingsky: atkFallingSky,
    glare: atkGlare, zenith: atkZenith, dayrise: atkDayrise, sunhold: atkSunhold, solstice: atkSolstice,
    afterglow: atkAfterglow, returning: atkReturning, hours: atkHours, gnomons: atkGnomons, pursuit: atkPursuit, flashover: atkFlashover,
    // the Eclipse
    umbra: atkUmbra, corona: atkCorona, blacknoon: atkBlackNoon, snapshot: atkSnapshot, falsesuns: atkFalseSuns,
    whip: atkWhip, drain: atkDrain, total: atkTotal, sunspots: atkSunspots, lastlight: atkLastLight,
    // the answers to a hero who keeps away or rides overhead, by form
    answer: function* () { if (B.form === 'noon') yield* atkVolley(); else if (B.form === 'fall') yield* atkCrossing(); else yield* atkUmbra(); },
    antiair: function* () { if (B.form === 'noon') yield* atkSwat(); else yield* atkPursuit(); },
  };
  B.bags = {
    1: ['noonray', 'noonray', 'palm', 'palm', 'clap', 'rake', 'volley', 'tears', 'kindhand', 'pinch', 'drum', 'lens', 'hammer'],
    2: ['meridian', 'meridian', 'verdict', 'verdict', 'horizon', 'crossing', 'fallingsky', 'fallingsky', 'glare', 'zenith', 'dayrise', 'sunhold', 'solstice', 'afterglow', 'returning', 'hours', 'gnomons'],
    3: ['meridian', 'verdict', 'umbra', 'umbra', 'corona', 'blacknoon', 'snapshot', 'falsesuns', 'whip', 'drain', 'total', 'sunspots', 'crossing', 'horizon', 'glare', 'zenith'],
  };
  // Flashover comes once in the Fall, past its middle
  B.choose = function () {
    if (B.form === 'fall' && !B.flashed && B.hp < B.maxHp * 0.48) { B.flashed = true; return 'flashover'; }
    return '';
  };
  // every move ends back at rest; after a string of cuts she lowers the blade and breathes (a pause to punish)
  B.recover = function* () {
    const b = B.body;
    b.fast = false; b.palm = 0; b.crownK = 0;
    if (B.form === 'noon') { yield* wait(0.1); return; }
    if (b.y < FLOOR - 1 && !B.lastLightOn) { b.air = false; b.y = FLOOR; }
    setPose(B.breathe ? 'kneel' : 'idle');
    if (B.breathe) { B.breathe = false; yield* wait(0.45); setPose('idle'); }
    yield* wait(0.12);
  };

  // ---------------------------------------------------------------- staggers: each form its own
  // Noon: both hands broken, they fall on the ridge and the sun sinks down to it, dimmed (strike it).
  // The Fall: she drops to one knee, the blade's point on the ridge. The Eclipse: blinded by her own
  // flare, a hand to her eyes.
  B.staggerIn = function* () {
    const b = B.body;
    if (B.form === 'noon') {
      AU.play('solCrack'); G.fx.shake(16);
      for (const h of B.hands) { h.busy = true; h.tx = h.x; h.ty = FLOOR - 50; h.trot = 0.5 * h.side; }
      const s0 = B.faceS.sink;
      let e = 0;
      while (e < 0.8) { const dt = yield; e += dt; B.faceS.sink = G.lerp(s0, FLOOR - 140 - SKY_Y, E.inCubic(Math.min(1, e / 0.8))); B.faceS.scale = 1 - 0.2 * Math.min(1, e / 0.8); B.faceS.eyes = 0; B.sun.x += (MID - B.sun.x) * 0.1; }
      slamFx(B.sun.x, FLOOR, true);
      B.faceS.mouth = 0.3;
      return;
    }
    if (B.form === 'eclipse' && b.y < FLOOR - 1) {
      // struck down out of the sky (the last light): she falls to the ridge
      B.lastLightOn = false; B.blackSun = 0; G.arena.layout('sol', 3);
      const y0 = b.y;
      let e = 0;
      while (e < 0.6) { const dt = yield; e += dt; b.y = G.lerp(y0, FLOOR, E.inQuad(Math.min(1, e / 0.6))); }
      b.y = FLOOR; b.air = false; slamFx(b.x, FLOOR, true);
    }
    if (B.form === 'eclipse') { setPose('reel', true); AU.play('solFlare'); G.fx.flash(RIMHOT, 0.4, 0.3); B.lightK = 1.3; return; }
    setPose('kneel', true); AU.play('boom'); G.fx.shake(10);
  };
  B.staggerOut = function* () {
    const b = B.body;
    if (B.form === 'noon') {
      // her jaw sets, her crown dims: she rises with a push of light (dash away, or through it)
      B.faceS.mouth = 0; B.flare = 0;
      AU.play('charge', { dur: 0.6 });
      yield* wait(0.5);
      H.ring({ x: B.sun.x, y: FLOOR - 120, r: 60, speed: 620, thick: 24, maxR: 900, tint: { boss: SUN, hot: SUNHOT } });
      AU.play('solFlare');
      const s0 = B.faceS.sink;
      let e = 0;
      while (e < 0.9) { const dt = yield; e += dt; const k = E.inOutQuad(Math.min(1, e / 0.9)); B.faceS.sink = G.lerp(s0, 0, k); B.faceS.scale = G.lerp(0.8, 1, k); }
      B.faceS.sink = 0; B.faceS.scale = 1;
      for (const h of B.hands) { h.broken = false; h.dmg = 0; h.crack = 0.15; h.busy = false; }
      return;
    }
    setPose('idle'); B.lightK = 1;
  };
  B.staggerMult = 1.4;
  Object.defineProperty(B, 'staggerDur', { get() { return B.form === 'noon' ? 0.85 : B.form === 'fall' ? 0.7 : 0.5; } });
  Object.defineProperty(B, 'staggerWord', { get() { return B.form === 'noon' ? 'BROKEN' : B.form === 'fall' ? 'OPEN' : 'BLINDED'; } });

  // ---------------------------------------------------------------- scenes
  // The light grows until the ridge is nearly white; the sun comes down into the sky out of it; her
  // hands rise out of the clouds either side of the ridge on arms of light. It blazes.
  B.enter = function* () {
    // (risen again) she is already there, blade levelled; a breath, and it goes on
    if (B.risen) { const b = B.body; G.audio.setIntensity(B.risen); setPose('point'); yield* wait(1.0); setPose('ready'); return; }
    const s = B.sun, F = B.faceS;
    s.y = -260; F.eyes = 0; B.whiteK = 0;
    for (const h of B.hands) { h.y = FLOOR + 260; h.ty = FLOOR + 260; h.pin = true; }
    let e = 0;
    AU.play('solDrain', { dur: 1.4 });
    while (e < 1.2) { const dt = yield; e += dt; B.whiteK = 0.85 * Math.min(1, e / 1.2); }
    G.fx.cine.x = MID; G.fx.cine.y = SKY_Y + 40; G.fx.cine.to = 0.5;
    e = 0;
    while (e < 1.6) { const dt = yield; e += dt; const k = E.outCubic(Math.min(1, e / 1.6)); s.y = G.lerp(-260, SKY_Y, k); B.whiteK = 0.85 * (1 - k); }
    s.y = SKY_Y; B.whiteK = 0;
    AU.play('solHand', { vol: 1.4 });
    for (const h of B.hands) h.pin = false;
    for (const h of B.hands) { h.tx = HAND_REST[h.i].x; h.ty = HAND_REST[h.i].y; }
    yield* wait(1.0);
    AU.play('solGong', { vol: 0.7 });
    e = 0;
    while (e < 0.6) { const dt = yield; e += dt; F.eyes = Math.min(1, e / 0.6); }
    G.fx.flash(SUNHOT, 0.3, 0.4); G.fx.shake(10);
    yield* wait(0.5);
    G.fx.cine.to = 0;
    e = 0;
    while (e < 0.5) { const dt = yield; e += dt; F.eyes = 1 - e / 0.5; }
    F.eyes = 0;
  };

  B.phaseIn = function* (n) { if (n === 2) yield* fallScene(); else yield* eclipseScene(); };
  // THE FALL. The sun cracks open; her hands break into light; the sky splits behind her.
  // She falls out of the sky, a comet, onto the ridge beside the gnomon: white, then
  // silence. In the crater, kneeling, someone your size. A long breath. She stands, looks at you, takes
  // the gnomon (the shade that kept you safe) in her hand, pulls it out of the ridge, and it burns into a
  // blade of noon. She levels it at you.
  function* fallScene() {
    const s = B.sun, F = B.faceS, b = B.body, P = G.player;
    H.clear(true);
    B.form = 'falling';
    for (const h of B.hands) { h.busy = true; h.broken = false; h.shade = false; }
    // the sun cracks; the hands go
    G.fx.cine.x = s.x; G.fx.cine.y = s.y + 60; G.fx.cine.to = 0.6;
    AU.play('solCrack', { vol: 1.2 }); G.fx.shake(12);
    let e = 0;
    while (e < 1.0) {
      const dt = yield; e += dt; const k = Math.min(1, e / 1.0);
      F.crack = k; F.mouth = 0.6 * k; F.eyes = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
      B.skyCrack = k;
      for (const h of B.hands) { h.gone = k; h.ty = h.y - 40; if (Math.random() < dt * 30) G.fx.spawn({ kind: 'spark', x: h.x + G.rand(-80, 80), y: h.y + G.rand(-40, 40), vx: G.rand(-40, 40), vy: -G.rand(100, 300), life: 0.6, size: 2.5, color: SUN }); }
    }
    for (const h of B.hands) h.gone = 1;
    AU.play('solCrack', { vol: 1.4 }); G.fx.flash(SUNHOT, 0.35, 0.3); G.fx.shake(18);
    yield* wait(0.45);
    // she falls: a comet out of the cracked sky, slowing as it nears the ridge
    const land = MID + (P.x < MID ? 110 : -110);
    AU.play('solComet', { dur: 1.3 });
    G.fx.cine.to = 0.35;
    e = 0;
    const sx = s.x, sy = s.y;
    while (e < 1.3) {
      const dt = yield; e += dt; const k = E.inQuad(Math.min(1, e / 1.3));
      s.x = G.lerp(sx, land, k); s.y = G.lerp(sy, FLOOR - 60, k);
      F.scale = 1 - 0.75 * k; F.alpha = 1;
      G.fx.cine.x = s.x; G.fx.cine.y = s.y;
      if (e > 1.0 && !B.slowed) { B.slowed = true; G.fx.slow(0.25, 0.35); }
      for (let i = 0; i < 3; i++) G.fx.spawn({ kind: 'spark', x: s.x + G.rand(-30, 30), y: s.y + G.rand(-30, 30), vx: (sx - land) * 0.4 + G.rand(-60, 60), vy: -G.rand(200, 500), life: G.rand(0.3, 0.7), size: G.rand(2, 4), color: i ? SUN : BURN, len: 0.06 });
    }
    B.slowed = false;
    // the impact: white, the dial broken, then quiet
    F.alpha = 0; B.form = 'fall';
    b.x = land; b.y = FLOOR; b.face = G.sign(P.x - land) || 1; b.hidden = false; b.alpha = 1; b.blade = false; b.bladeK = 0; b.eyes = 0;
    b.p = POSES.kneel.slice(); b.pv.fill(0); setPose('kneel');
    B.whiteK = 1;
    G.fx.impact(land, FLOOR - 40, 0.12); G.fx.shake(34); G.fx.punch(0.05); G.fx.stop(0.15);
    AU.play('boom'); AU.play('slam'); AU.play('stagger');
    G.fx.ring(land, FLOOR - 20, { r0: 40, r1: 1200, life: 1.0, color: SUNHOT, width: 18 });
    G.fx.thud(land, FLOOR, 2.6, { col: FALL });
    for (const d of [-1, 1]) G.fx.dust(land + d * 60, FLOOR, 16, { dir: d, speed: [200, 900], size: [12, 26], life: [0.8, 1.8], up: 80 });
    G.fx.burst(land, FLOOR - 10, { n: 40, color: '40,26,18', speed: [200, 900], angle: -Math.PI / 2, spread: 2.4, life: [0.8, 1.6], size: [6, 14], kind: 'chunk', grav: 1500 });
    B.dialBroken = 1;
    B.pushPlayer(700, 900);
    G.arena.setPhase(2, 0.4);
    G.audio.setIntensity(0);
    e = 0;
    while (e < 1.1) { const dt = yield; e += dt; B.whiteK = 1 - E.outQuad(Math.min(1, e / 1.1)); }
    B.whiteK = 0;
    G.fx.cine.x = land; G.fx.cine.y = FLOOR - 70; G.fx.cine.to = 0.8;
    // the standoff: embers drifting, nothing moving, a long breath
    yield* wait(1.2);
    AU.play('step');
    setPose('idle'); b.eyes = 0;
    yield* wait(0.6);
    b.face = G.sign(P.x - b.x) || b.face;
    b.eyes = 1; G.fx.glint(jointsOf(b, b.p).head.x + b.face * 5, jointsOf(b, b.p).head.y, 30, SUNHOT, 0.3); AU.play('glint');
    yield* wait(0.7);
    // she takes the gnomon and pulls it from the ridge: it burns into her blade
    const gx = MID;
    yield* stepTo(gx - b.face * 46, 0.4);
    b.face = G.sign(gx - b.x) || 1;
    setPose('drawCrown');
    AU.play('solDraw');
    e = 0;
    while (e < 1.0) {
      const dt = yield; e += dt; const k = Math.min(1, e / 1.0);
      B.gnomon = 1 - k; b.blade = true; b.bladeK = k;
      G.fx.shake(2 + 4 * k);
      if (Math.random() < dt * 60) G.fx.spawn({ kind: 'spark', x: gx + G.rand(-10, 10), y: FLOOR - G.rand(0, 150 * (1 - k)), vx: G.rand(-80, 80), vy: -G.rand(100, 400), life: 0.5, size: 2.5, color: k > 0.5 ? SUNHOT : FALL, len: 0.04 });
    }
    B.gnomon = 0; b.bladeK = 1;
    G.fx.flash(SUNHOT, 0.4, 0.3); G.fx.shake(14); AU.play('solBlade', { k: 6 });
    G.fx.lines(b.x, b.y - 100, 20, SUNHOT, { r0: 40, speed: [900, 1500] });
    b.face = G.sign(P.x - b.x) || b.face;
    setPose('point', true);
    G.fx.cine.to = 0.5;
    yield* wait(0.7);
  }
  // THE ECLIPSE. She drives her blade up into her own crown and pulls the sun down into herself. The light
  // drains out of the sky, the clouds, the ridge and her; a held note; a heartbeat; black.
  function* eclipseScene() {
    const b = B.body, P = G.player;
    H.clear(true);
    B.form = 'eclipsing';
    b.y = FLOOR; b.air = false; facePlayer();
    setPose('drawCrown'); b.eyes = 0;
    G.fx.cine.x = b.x; G.fx.cine.y = b.y - 90; G.fx.cine.to = 0.7;
    yield* wait(0.5);
    AU.play('solBlade', { k: 7 }); G.fx.flash(SUNHOT, 0.5, 0.3); G.fx.shake(14);
    b.crownK = 1;
    yield* wait(0.3);
    AU.play('solDrain', { dur: 2.6 });
    G.arena.setPhase(3, 2.6);
    G.audio.setIntensity(0);
    let e = 0, beat = 0;
    while (e < 2.6) {
      const dt = yield; e += dt; const k = Math.min(1, e / 2.6);
      B.darkK = E.inQuad(k); b.eclipse = k; B.lightR = 300 * (1 - k);
      if (e > [0.9, 1.6, 2.2][beat] && beat < 3) { AU.play('solHeart', { vol: 0.5 + 0.25 * beat }); beat++; }
      if (Math.random() < dt * 50) { const a = G.rand(0, G.TAU), r = G.rand(200, 600); G.fx.spawn({ kind: 'spark', x: b.x + Math.cos(a) * r, y: b.y - 90 + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.5, vy: -Math.sin(a) * r * 1.5, life: 0.5, size: 2, color: SUN, len: 0.05 }); }
    }
    B.darkK = 1; b.eclipse = 1; b.crownK = 0;
    B.form = 'eclipse';
  }
  B.phaseOut = function* (n) {
    const b = B.body;
    G.fx.cine.to = 0;
    if (n === 2) { setPose('ready'); AU.play('roar'); yield* wait(0.3); B.skyCrack = 1; return; }
    // her rim catches fire
    AU.play('solFlare', { vol: 1.2 }); G.fx.shake(16); G.fx.stop(0.08);
    b.eyes = 1; setPose('point', true);
    let e = 0;
    while (e < 0.6) { const dt = yield; e += dt; B.lightR = 300 * E.outQuad(Math.min(1, e / 0.6)); }
    B.lightR = 300;
    setPose('ready');
    yield* wait(0.3);
  };

  // The end. She comes down to her knees on the ridge; her blade breaks; light shows through the cracks
  // in her black. "Then carry it." She breaks into light, and it does not scatter: it pours into you.
  // Dawn comes up over the ridge for the first time.
  B.deathScene = function* () {
    const b = B.body, P = G.player;
    B.lastLightOn = false;
    G.fx.slow(0.3, 0.8);
    G.audio.setIntensity(0);
    H.clear(true);
    G.arena.layout('sol', 3);
    if (b.y < FLOOR - 1) {
      const y0 = b.y;
      let e = 0;
      while (e < 0.8) { const dt = yield; e += dt; b.y = G.lerp(y0, FLOOR, E.inQuad(Math.min(1, e / 0.8))); }
      b.y = FLOOR; slamFx(b.x, FLOOR, true);
    }
    b.air = false; setPose('kneel', true); B.blackSun = 0;
    yield* wait(0.5);
    b.blade = false; AU.play('tink'); G.fx.shatter(b.x + b.face * 40, FLOOR - 40, RIM, 14, { hot: RIMHOT, r: 200 });
    // the light coming back through her
    G.arena.setPhase(4, 3.0);
    let e = 0;
    const d0 = B.darkK;
    while (e < 1.4) { const dt = yield; e += dt; const k = Math.min(1, e / 1.4); B.darkK = d0 * (1 - k); b.eclipse = 1 - k; }
    B.darkK = 0; b.eclipse = 0;
    G.ui.card('', 'THEN CARRY IT', '');
    yield* wait(1.6);
    // she breaks into light, and it pours into the hero
    B.dawn = { t: 0 };
    AU.play('solDawn');
    e = 0;
    while (e < 2.0) {
      const dt = yield; e += dt; B.dawn.t = e;
      b.alpha = 1 - Math.min(1, e / 1.2);
      for (let i = 0; i < 4; i++) {
        const sx = b.x + G.rand(-20, 20), sy = b.y - G.rand(0, 100), dx = P.x - sx, dy = P.y - 30 - sy;
        G.fx.spawn({ kind: 'spark', x: sx, y: sy, vx: dx * 1.4 + G.rand(-60, 60), vy: dy * 1.4 - G.rand(60, 200), life: 0.7, size: G.rand(2, 3.5), color: i % 2 ? SUN : SUNHOT, len: 0.05 });
      }
    }
    b.hidden = true;
    G.fx.flash(SUNHOT, 0.6, 1.2); G.fx.shake(10);
    G.feats.bump('sol');
    yield* wait(1.4);
  };
  function drawDawn(ctx) {
    const P = G.player, k = Math.min(1, B.dawn.t / 2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    D.glow(ctx, SUN, P.x, P.y - 30, 80 + 220 * k, 0.6 * k);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * G.TAU + B.t * 0.4, len = 60 + 140 * k;
      ctx.strokeStyle = G.rgba(SUNHOT, 0.3 * k); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(P.x + Math.cos(a) * 30, P.y - 30 + Math.sin(a) * 30); ctx.lineTo(P.x + Math.cos(a) * len, P.y - 30 + Math.sin(a) * len); ctx.stroke();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ the rest of what she draws
  const drawGround0 = B.drawGround;
  B.drawGround = function (ctx) {
    drawGround0(ctx);
    // the burning lens's point on the ridge
    if (B.lensSpot) {
      const s = B.lensSpot;
      D.glow(ctx, BURN, s.x, FLOOR - 4, s.r * 1.6, 0.8);
      ctx.strokeStyle = G.rgba(DANGER, 0.7); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(s.x, FLOOR, s.r, 8, 0, 0, G.TAU); ctx.stroke();
    }
    // her own shadow, growing where she will come down (Zenith Fall)
    if (B.diveShadow) {
      const s = B.diveShadow;
      ctx.fillStyle = 'rgba(16,6,4,' + (0.25 + 0.6 * s.k) + ')';
      ctx.beginPath(); ctx.ellipse(s.x, FLOOR + 1, 30 + 40 * s.k, 5 + 6 * s.k, 0, 0, G.TAU); ctx.fill();
    }
  };
  const draw0 = B.draw;
  B.draw = function (ctx) {
    if (B.form === 'noon' || B.form === 'falling') {
      if (!B.dead) for (const h of B.hands) drawHand(ctx, h);
      return;
    }
    draw0(ctx);
    const b = B.body;
    // the echo she leaves (Afterglow), brightening
    if (B.echo) {
      const g = B.echo;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      drawFig(ctx, { x: g.x0, y: g.y, face: g.face, eclipse: b.eclipse, eyes: 1, crownK: g.k, breath: 0, blade: true }, 0.25 + 0.6 * g.k, { p: g.p, ghost: true });
      ctx.restore();
    }
    // her blade in flight (the Returning Noon)
    if (B.flyBlade) { const q = B.flyBlade; drawBlade(ctx, q.x - Math.cos(q.a) * 56, q.y - Math.sin(q.a) * 56, q.a, 1, 1, b.eclipse); }
    // the false suns
    if (B.decoys) for (const d of B.decoys) if (!d.real && d.burst <= 0) {
      drawFig(ctx, { x: d.x, y: FLOOR, face: d.face, eclipse: 1, eyes: 1, crownK: 0.3, breath: 0, blade: true }, 0.9, { p: POSES.ready });
    }
  };
  const drawOver0 = B.drawOver;
  B.drawOver = function (ctx) {
    const b = B.body, P = G.player;
    drawOver0(ctx);
    // what shows in any dark: embers walking to where she will step out, the corona ring, the whip, the
    // false suns' steady rims (the real one breathes), the black sun, and the closing ring of the total eclipse
    if (B.steps) for (const s of B.steps) { s.t += 1 / 60; D.glow(ctx, RIM, s.x, FLOOR - 6, 26, Math.max(0.2, 1 - s.t * 0.6)); }
    if (B.ringOut) {
      const q = B.ringOut;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      D.glow(ctx, RIM, q.x, q.y, 60, 0.9);
      ctx.strokeStyle = G.rgba(RIMHOT, 0.95); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(q.x, q.y, 22, 22 * Math.abs(Math.cos(q.a * 0.5)) + 4, 0, 0, G.TAU); ctx.stroke();
      ctx.restore();
    }
    if (B.lash) {
      const q = B.lash;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(RIM, 0.6); ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(q.x0, q.y); ctx.quadraticCurveTo((q.x0 + q.x1) / 2, q.y + 18 * Math.sin(B.t * 40), q.x1, q.y); ctx.stroke();
      ctx.strokeStyle = G.rgba(RIMHOT, 1); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    if (B.decoys && B.darkK > 0.5) for (const d of B.decoys) {
      if (d.burst > 0) continue;
      const fl = d.real ? 0.5 + 0.5 * Math.sin(B.t * 9) * Math.sin(B.t * 5.3) : 0.75;
      D.glow(ctx, RIM, d.x, FLOOR - 56, 70, 0.25 + 0.5 * fl);
    }
    if (B.blackSun > 0.01 && !b.hidden) {
      const k = B.blackSun, x = b.x, y = b.y - 56;
      // the noon sun's dark twin: an ember haze, a crown of black blades edged in ember, a black disc with
      // the hours and her star on it in ember
      const r = 70 * k, tt = B.t;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      D.glow(ctx, RIM, x, y, 260 * k, 0.8);
      for (let i = 0; i < 12; i++) sunBlade(ctx, x, y, (i + 0.5) / 12 * G.TAU + tt * 0.1, r * 0.98, r * (1.5 + 0.1 * Math.sin(tt * 3 + i)), r * 0.08, RIMHOT, 0.75);
      ctx.restore();
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * G.TAU - tt * 0.06, r1 = r * (2.1 + (i % 3 === 0 ? 0.45 : 0) + 0.08 * Math.sin(tt * 2 + i * 1.7));
        ctx.fillStyle = '#030001'; sunBladePath(ctx, x, y, a, r * 0.95, r1, r * 0.12); ctx.fill();
        ctx.strokeStyle = G.rgba(RIM, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.fillStyle = '#010001'; ctx.beginPath(); ctx.arc(x, y, r, 0, G.TAU); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(RIM, 0.95); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = G.rgba(RIMHOT, 0.8); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = G.rgba(RIM, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r * 0.68, 0, G.TAU); ctx.stroke();
      ctx.fillStyle = G.rgba(RIMHOT, 0.9);
      for (let i = 0; i < 12; i++) { const a = i / 12 * G.TAU - tt * 0.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.68, y + Math.sin(a) * r * 0.68, i % 3 === 0 ? 2.4 : 1.2, 0, G.TAU); ctx.fill(); }
      ctx.translate(x, y); ctx.rotate(tt * 0.15);
      const q = r * 0.32, w = r * 0.07;
      ctx.strokeStyle = G.rgba(RIMHOT, 0.95); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, -q); ctx.lineTo(w, -w); ctx.lineTo(q, 0); ctx.lineTo(w, w); ctx.lineTo(0, q); ctx.lineTo(-w, w); ctx.lineTo(-q, 0); ctx.lineTo(-w, -w); ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
    if (B.total > 0.01) {
      ctx.fillStyle = 'rgba(0,0,0,' + (0.85 * B.total) + ')'; ctx.fillRect(-80, -80, G.W + 160, G.H + 160);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(RIM, 0.9 * B.total); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(b.x, b.y - 56, B.totalR || 400, 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = G.rgba(RIMHOT, B.total); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  };

  // ------------------------------------------------------------------ music (audio.js plays B.music)
  // One theme in three movements. Noon: long bright chords and a slow bell line, almost no drums. The Fall:
  // the same line, fast, over drums. The Eclipse: nearly silent, a drone and a heartbeat and her hum; the
  // theme comes back at its loudest for the last light.
  const CH = [{ root: 41, pad: [53, 57, 60] }, { root: 36, pad: [48, 52, 55] }, { root: 43, pad: [50, 55, 59] }, { root: 45, pad: [52, 57, 60] }];
  const MEL = [
    [72, -1, -1, -1, 74, -1, 76, -1, 79, -1, -1, -1, 77, -1, 76, -1],
    [76, -1, -1, -1, 74, -1, 72, -1, 74, -1, -1, -1, 67, -1, -1, -1],
    [74, -1, -1, -1, 76, -1, 79, -1, 83, -1, -1, -1, 81, -1, 79, -1],
    [81, -1, -1, -1, 79, -1, 76, -1, 72, -1, -1, -1, 76, -1, -1, -1],
  ];
  B.music = function (step, t, sd, I, M) {
    const n = (step >> 4) & 3, s = step & 15, dest = M.dest, bar = CH[n];
    const last = B.lastLightOn;
    if (B.form === 'eclipse' && !last) {
      // the dark: a drone, a heartbeat, now and then a note of her hum
      if (s === 0) M.tone({ at: t, type: 'sawtooth', f0: M.mtof(bar.root - 24), dur: sd * 16, vol: 0.05, dest });
      if (s === 0 || s === 3) M.tone({ at: t, f0: 60, f1: 38, dur: 0.2, vol: s ? 0.25 : 0.38, dest });
      if (s === 8 && n % 2 === 0) M.tone({ at: t, type: 'sine', f0: M.mtof(MEL[n][0] - 12), dur: sd * 10, vol: 0.03, attack: 0.3, dest });
      if (s === 12 && n === 3) M.tone({ at: t, type: 'triangle', f0: M.mtof(MEL[3][8]), dur: sd * 6, vol: 0.02, attack: 0.2, dest });
      return;
    }
    if (s === 0) M.pad(bar, t, sd * 16, Math.max(1, I));
    const m = MEL[n][s], fast = B.form === 'fall' || last;
    if (m > 0) {
      M.tone({ at: t, type: 'sine', f0: M.mtof(m), dur: sd * (fast ? 3 : 7), vol: fast ? 0.06 : 0.07, dest });
      M.tone({ at: t, type: 'triangle', f0: M.mtof(m) * 2, dur: sd * 2, vol: 0.012, dest });
      if (fast) M.tone({ at: t, type: 'sawtooth', f0: M.mtof(m - 12), dur: sd * 2, vol: 0.02, attack: 0.02, dest });
    }
    if (!fast) {
      if (s === 0) M.tone({ at: t, type: 'sine', f0: 90, f1: 45, dur: 0.6, vol: 0.3, dest });
      if (s === 0 || s === 8) M.bass(bar.root, t, sd * 6);
      return;
    }
    if (s % 4 === 0) M.kick(t);
    if (s === 4 || s === 12) M.snare(t, 1);
    if (s % 2 === 1) M.hat(t, 0.035);
    if (s % 2 === 0) M.bass(bar.root, t, sd * 1.6);
    if (last && (s === 2 || s === 6 || s === 10 || s === 14)) for (const q of bar.pad) M.tone({ at: t, type: 'sawtooth', f0: M.mtof(q + 12), dur: sd * 1.5, vol: 0.016, dest });
  };

  // ------------------------------------------------------------------ the frame
  const setup0 = B.setup;
  B.silFull = true; // (v2.9j, corrupt.js: her forms fill the sky)
  B.setup = function () {
    setup0();
    B.form = 'noon'; B.flashed = false; B.lastLightOn = false; B.glaring = false; B.glareHit = false; B.armor = false;
    B.decoys = null; B.echo = null; B.flyBlade = null; B.ringOut = null; B.lash = null; B.steps = null; B.total = 0; B.totalR = 400;
    B.blackSun = 0; B.lensSpot = null; B.diveShadow = null; B.stuck = false; B.breathe = false; B.flaring = 0; B.blindNow = false;
    B.crackLines = null; B.slowed = false; B.hairPts = null; B.hairPts2 = null; B.hairPts3 = null;

    // (v2.9a) risen again after she felled you (game.js G.riseAgain): straight into the form you fell in
    const n = G.solFrom || 1;
    if (n >= 2) {
      const b = B.body;
      B.phase = n; B.hp = Math.floor(B.maxHp * (n === 2 ? 2 / 3 : 1 / 3));
      B.form = n === 2 ? 'fall' : 'eclipse'; B.forceNext = B.first[n];
      for (const h of B.hands) h.gone = 1;
      B.faceS.alpha = 0; B.gnomon = 0; B.dialBroken = 1; B.skyCrack = 1;
      Object.assign(b, { hidden: false, x: MID + 160, face: -1, blade: true, bladeK: 1, eyes: 1, eclipse: n === 3 ? 1 : 0 });
      if (n === 3) { B.darkK = 1; B.lightR = 300; }
      G.arena.setPhase(n, 0.01); G.arena.layout('sol', n, { instant: true });
      B.risen = n;
    } else B.risen = 0;
  };
  G.makeBoss(B);
  // what can be struck: at noon her hands (and her face when it is down); after, her body; the false
  // suns take a blow themselves and burst into light
  const targets0 = B.targets;
  B.targets = function () {
    if (B.form !== 'noon' && B.form !== 'falling') {
      const out = targets0();
      if (B.decoys) for (const d of B.decoys) if (!d.real && d.burst <= 0 && B.active && !B.dying) {
        out.push({ id: 'decoy', kind: 'extra', cx: d.x, cy: FLOOR - 56, hw: 20, hh: 50, ref: { onHit() {
          d.burst = 1; AU.play('solFlare', { vol: 0.5 }); G.fx.burst(d.x, FLOOR - 56, { n: 24, color: RIMHOT, speed: [100, 500], life: [0.3, 0.7], kind: 'spark' });
          B.pools.push({ x: d.x, w: 140, t: 0, life: 3 });
          G.player.ember = Math.min(G.PLAYER.SEG * G.player.segs, G.player.ember + G.PLAYER.SEG * 0.5);
          return true;
        } } });
      }
      return out;
    }
    const out = [];
    if (!B.active || B.dead || B.dying) return out;
    for (const h of B.hands) if (h.gone < 1) out.push({ id: h.i ? 'handR' : 'handL', kind: 'body', ref: B.body, hand: h, cx: h.x - 10 * h.side, cy: h.y, hw: 84, hh: 44 });
    if (B.faceS.sink > 120) { const r = 96 * B.faceS.scale; out.push({ id: 'face', kind: 'body', ref: B.body, cx: B.sun.x, cy: B.sun.y + B.faceS.sink, hw: r * 0.8, hh: r }); }
    return out;
  };
  // (B.steadfast is Noon's, and while she will not be stopped: Flashover, the Glare)
  Object.defineProperty(B, 'steadfast', { get() { return B.form === 'noon' || B.armor; } });
  G.arena.LAYOUTS.sol.last = [[150, 130, 516], [344, 130, 430], [568, 144, 346], [806, 130, 430], [1000, 130, 516]];
  // (not in G.BOSS_IDS: she is never drawn as a trial; the seventh portal opens on her: rest.js)
  G.sol = {
    MID,
    // (for the scripted player, tools/clear-rates.js) where to stand while something of hers burns: the
    // gnomon's shade (or under the Kind Hand) at noon; in the eclipse, the nearest pool, or her
    safeX() {
      const burnOn = H.list.some((h) => h.kind === 'burn' && !h.dead);
      if (!burnOn) return null;
      if (B.form === 'noon') {
        const h = B.hands.find((q) => q.shade);
        if (h) return h.x;
        const [a, z] = shadowSpan();
        return G.clamp(a + (z - a) * 0.4, WL + 30, WR - 30);
      }
      const P = G.player;
      let best = B.body.x, bd = Math.abs(B.body.x - P.x);
      for (const q of B.pools) if (Math.abs(q.x - P.x) < bd) { bd = Math.abs(q.x - P.x); best = q.x; }
      return best;
    },
  };
})();
