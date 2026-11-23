// Solfall - The Cinder Wolf: a huge burning wolf on all fours. Pounces, bites, a sweeping tail and a
// run up the walls, every one of them read from its body. In its second phase whatever it lands on
// catches fire; in its third the floor burns down to embers that flare, and only scorched stone is safe.
// A pure read-and-dodge fight: the opposite of the Magus.
'use strict';
(function () {
  const { wait, tween } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards, K = G.kit, D = G.draw, DANGER = G.COL.danger;
  const WL = G.WALL_L, WR = G.WALL_R;
  const EMBER = '255,112,48';   // the ember floor keeps its own colour whatever the wolf burns as
  const HOTEMBER = '255,214,150';
  const KNOLL = 42; // how high the rock at the back of its forest stands (see G.SCENES.pyre)

  const B = {
    id: 'wolf', name: 'THE CINDER WOLF', short: 'The Wolf', theme: 'wolf',
    sub: 'The forest remembers what burned it', taunt: 'it has your scent',
    blurb: 'A burning wolf that reads like a book, if you watch its body',
    tips: [
      'Watch its haunches. A shallow crouch is a short pounce; when they drop low and the tail lifts, it is coming a long way.',
      'Head low: it lunges along the floor, so jump or back off. Head high: it snaps at the air, so stay on the ground.',
      'If its ears stay flat after a bite, a second bite is coming.',
      'The tail sweep reaches both sides of it. Jump it. A tail that curls before the sweep means two.',
      'A wolf high on the wall dives on you; a wolf low on the wall flies flat across the arena. Stay on the ground for that one.',
      'Its breath rakes the floor away from it. The safe place is close to it, or behind it.',
      'In its last phase the embers flare every few seconds. Stand on scorched stone or a ledge when they brighten.',
      'Paws spread wide when it rears: the slam throws fire along the floor both ways.',
    ],
    hudCols: [null, ['#ffaa46', '#ffe4b4'], ['#ff6e2e', '#ffd8b0'], ['#8cc8ff', '#ecf6ff']],
    BASE_HP: 3500, poise0: 420, w: 160, h: 112,
    answer: 'breath',
    finale: 'emberfall',
    gaps: [0, 0.95, 0.78, 0.62],
    bags: {
      1: ['pounce', 'bite', 'sweep', 'howl', 'rake', 'breath'],
      2: ['pounce', 'bite', 'sweep', 'howl', 'rake', 'wallrun', 'breath'],
      3: ['frenzy', 'pounce', 'bite', 'sweep', 'howl', 'rake', 'wallrun', 'breath'],
    },
    cards: { 2: ['WILDFIRE', 'The forest takes the flame'], 3: ['EMBERBED', 'Nothing left to burn but you'] },
    first: { 1: 'pounce', 2: 'wallrun', 3: 'frenzy' },
    // its corrupted self only (corrupt.js): the void pack in every phase, the void comet from phase II
    corruptBags: { 1: ['pack'], 2: ['pack', 'ricochet'], 3: ['pack', 'ricochet'] },
  };
  // the void's colours (as G.corrupt.COL, which loads after this file)
  const VOID = '16,3,10', BLOOD = '235,30,80', VHOT = '255,206,220';
  const mixRgb = (a, c, k) => { const x = a.split(',').map(Number), y = c.split(',').map(Number); return x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(','); };

  // ------------------------------------------------------------------ the arena
  G.THEMES.wolf = [null,
    {
      name: 'CINDER', scene: 'pyre', burn: 0,
      sky: ['#050302', '#170905', '#3d1608', '#b4521c'],
      far: '#1c0d07', near: '#100704', pillar: '#080403', rim: '255,150,80',
      floorTop: '#3a2216', floor: '#120a06',
      boss: '255,168,70', hot: '255,232,190', ember: '255,160,80', stars: 0.15,
    },
    {
      name: 'WILDFIRE', scene: 'pyre', burn: 1,
      sky: ['#060101', '#200503', '#5a1206', '#e0601e'],
      far: '#2a0c05', near: '#160603', pillar: '#0a0302', rim: '255,112,52',
      floorTop: '#4a1e10', floor: '#150704',
      boss: '255,112,46', hot: '255,224,176', ember: '255,124,60', stars: 0,
    },
    {
      name: 'EMBERBED', scene: 'pyre', burn: 2,
      sky: ['#010101', '#07050a', '#16121c', '#5a4a58'],
      far: '#120e14', near: '#0a080c', pillar: '#050406', rim: '170,200,255',
      floorTop: '#2a1a16', floor: '#0c0706',
      boss: '140,200,255', hot: '236,246,255', ember: '255,140,80', stars: 0.05,
    }, G.THEMES.warden[4]];

  // a burnt forest: standing pines at first, then the pines alight under columns of smoke, and at the
  // last only black snags against an ash sky
  G.SCENES.pyre = function (x, P, F, lcg) {
    const r = lcg(73), burn = P.burn || 0;
    if (burn === 1) {
      // smoke towers leaning away on the wind
      for (const [sx, lean] of [[220, -0.25], [700, -0.18], [1080, -0.3]]) {
        for (let k = 0; k < 7; k++) {
          const cx = sx + lean * k * 70, cy = F - 120 - k * 70, rr = 70 + k * 26;
          const g = x.createRadialGradient(cx, cy, rr * 0.2, cx, cy, rr);
          g.addColorStop(0, 'rgba(14,5,3,0.42)'); g.addColorStop(1, 'rgba(14,5,3,0)');
          x.fillStyle = g; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
        }
      }
    }
    if (burn >= 1) {
      // the far ridge is burning: a line of fire along the horizon
      const g = x.createLinearGradient(0, F - 170, 0, F - 20);
      g.addColorStop(0, G.rgba(P.rim, 0)); g.addColorStop(1, G.rgba(P.rim, burn === 1 ? 0.3 : 0.12));
      x.fillStyle = g; x.fillRect(-60, F - 170, G.W + 120, 150);
    }
    const pine = (cx, base, h, col, alight) => {
      x.fillStyle = col;
      x.fillRect(cx - h * 0.025, base - h * 0.32, h * 0.05, h * 0.32);
      for (let k = 0; k < 5; k++) {
        const ty = base - h * 0.22 - k * h * 0.16, w = h * 0.3 * (1 - k * 0.16);
        x.beginPath();
        x.moveTo(cx - w, ty); x.lineTo(cx - w * 0.55, ty - h * 0.08); x.lineTo(cx - w * 0.7, ty - h * 0.09);
        x.lineTo(cx, ty - h * 0.3); x.lineTo(cx + w * 0.7, ty - h * 0.09); x.lineTo(cx + w * 0.55, ty - h * 0.08); x.lineTo(cx + w, ty);
        x.closePath(); x.fill();
        if (alight) {
          x.fillStyle = G.rgba(P.rim, 0.5 + r() * 0.3);
          for (let f = 0; f < 3; f++) {
            const fx = cx + (r() - 0.5) * w * 1.6, fy = ty - r() * h * 0.12, fs = 4 + r() * 7;
            x.beginPath(); x.moveTo(fx - fs * 0.5, fy); x.quadraticCurveTo(fx, fy - fs * 0.4, fx + (r() - 0.5) * 3, fy - fs * 1.8); x.quadraticCurveTo(fx + fs * 0.2, fy - fs * 0.5, fx + fs * 0.5, fy); x.fill();
          }
          x.fillStyle = col;
        }
      }
    };
    const snag = (cx, base, h) => {
      x.fillStyle = P.pillar;
      x.beginPath(); x.moveTo(cx - 9, base); x.lineTo(cx - 4, base - h); x.lineTo(cx + 1, base - h - 14); x.lineTo(cx + 4, base - h + 6); x.lineTo(cx + 9, base); x.closePath(); x.fill();
      x.strokeStyle = P.pillar; x.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const by = base - h * (0.4 + k * 0.18), s = r() < 0.5 ? -1 : 1, len = 18 + r() * 30;
        x.lineWidth = 5 - k; x.beginPath(); x.moveTo(cx, by); x.lineTo(cx + s * len, by - len * (0.4 + r() * 0.5)); x.stroke();
      }
      x.strokeStyle = G.rgba(P.rim, 0.28); x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(cx - 2, base - 6); x.lineTo(cx + 1, base - h * 0.4); x.lineTo(cx - 1, base - h * 0.7); x.stroke();
      x.lineCap = 'butt';
    };
    // a far tree line on the ridge
    for (let i = 0; i < 36; i++) {
      const tx = -40 + i * 38 + r() * 18, h = 54 + r() * 60, by = F - 46 - r() * 22;
      if (burn === 2) { if (r() < 0.5) snag(tx, by + 8, h * 0.4); }
      else pine(tx, by, h, P.far, false);
    }
    // the near trees, in from the walls
    for (const tx of [64, 176, 302, 424, 862, 988, 1108, 1226]) {
      const h = 230 + r() * 190;
      if (burn === 2) { snag(tx + (r() - 0.5) * 20, F + 4, h * 0.55); if (r() < 0.6) snag(tx + 40, F + 4, 30 + r() * 30); }
      else pine(tx + (r() - 0.5) * 20, F + 4, h, P.pillar, burn === 1);
      if (burn === 0) {
        // a rim of firelight down the side that faces the middle
        const side = tx < 640 ? 1 : -1;
        x.fillStyle = G.rgba(P.rim, 0.12);
        x.fillRect(tx + side * h * 0.02, F - h * 0.3, 2, h * 0.3);
      }
    }
  };
  G.arena.WEATHER.wolf = { kind: 'ember', n: 64 };
  // phase I is bare ground; burnt trees in phase II; two basalt ledges over the ember bed in phase III
  G.arena.LAYOUTS.wolf = {
    2: [[140, 120, 494], [580, 120, 420], [1020, 120, 494]],
    3: [[330, 110, 474], [840, 110, 474]],
  };
  // scorched stone in the ember bed: [left, right] (phase III)
  const ISLES = [[80, 220], [570, 710], [1060, 1200]];
  const STRETCHES = [[WL, 80], [220, 570], [710, 1060], [1200, WR]];

  // ------------------------------------------------------------------ sounds
  const AU = G.audio, S = () => AU.synth;
  AU.define('snarl', () => {
    S().noise({ dur: 0.55, vol: 0.32, type: 'lowpass', f0: 520, f1: 180, q: 1.2, attack: 0.06 });
    S().tone({ type: 'sawtooth', f0: 92, f1: 70, dur: 0.55, vol: 0.13, attack: 0.05, detune: -10 });
    S().tone({ type: 'sawtooth', f0: 96, f1: 72, dur: 0.5, vol: 0.09, attack: 0.08, detune: 12 });
  });
  AU.define('howl', () => {
    S().tone({ type: 'sine', f0: 260, f1: 520, dur: 0.45, vol: 0.16, attack: 0.2 });
    S().tone({ type: 'sine', f0: 520, f1: 410, dur: 1.5, vol: 0.18, delay: 0.42, attack: 0.05 });
    S().tone({ type: 'triangle', f0: 780, f1: 620, dur: 1.3, vol: 0.05, delay: 0.45 });
    S().tone({ type: 'sawtooth', f0: 130, f1: 100, dur: 1.8, vol: 0.08, attack: 0.3 });
    S().noise({ dur: 1.8, vol: 0.18, f0: 900, f1: 600, q: 2, attack: 0.3 });
  });
  AU.define('chomp', () => {
    S().noise({ dur: 0.06, vol: 0.4, type: 'highpass', f0: 2200 });
    S().tone({ type: 'triangle', f0: 320, f1: 110, dur: 0.12, vol: 0.3 });
    S().tone({ type: 'sine', f0: 120, f1: 50, dur: 0.14, vol: 0.3 });
  });
  AU.define('inhale', (o) => {
    const d = o.dur || 0.9;
    S().noise({ dur: d, vol: 0.26, f0: 380, f1: 1700, q: 1.4, attack: d * 0.7 });
    S().tone({ type: 'sawtooth', f0: 60, f1: 110, dur: d, vol: 0.06, attack: d * 0.6 });
  });
  AU.define('flame', (o) => {
    const d = o.dur || 1.8;
    S().noise({ dur: d, vol: 0.36, type: 'lowpass', f0: 900, f1: 500, q: 0.7, attack: 0.05 });
    S().noise({ dur: d, vol: 0.14, f0: 2400, f1: 1600, q: 0.9, attack: 0.05 });
    S().tone({ type: 'sawtooth', f0: 70, f1: 54, dur: d, vol: 0.1 });
  });
  AU.define('yelp', () => {
    S().tone({ type: 'triangle', f0: 640, f1: 1300, dur: 0.1, vol: 0.18 });
    S().tone({ type: 'triangle', f0: 1200, f1: 420, dur: 0.3, vol: 0.16, delay: 0.09 });
    S().noise({ dur: 0.2, vol: 0.15, f0: 1600, f1: 700, q: 2 });
  });
  AU.define('flareUp', () => {
    S().noise({ dur: 1.3, vol: 0.3, type: 'lowpass', f0: 160, f1: 1500, q: 0.8, attack: 1.0 });
    S().tone({ type: 'sine', f0: 50, f1: 90, dur: 1.3, vol: 0.18, attack: 1.0 });
  });
  AU.define('ignite', () => {
    S().noise({ dur: 0.45, vol: 0.34, f0: 300, f1: 2800, q: 0.8, attack: 0.03 });
    S().tone({ type: 'sine', f0: 90, f1: 40, dur: 0.35, vol: 0.3 });
  });
  AU.define('paw', () => {
    S().noise({ dur: 0.09, vol: 0.13, type: 'lowpass', f0: 320, f1: 90 });
    S().tone({ type: 'sine', f0: 74, f1: 40, dur: 0.12, vol: 0.14 });
  });
  AU.define('heart', () => {
    S().tone({ type: 'sine', f0: 62, f1: 34, dur: 0.32, vol: 0.6 });
    S().tone({ type: 'sine', f0: 58, f1: 32, dur: 0.3, vol: 0.45, delay: 0.2 });
  });
  // (corrupted) its fire going black: a swell drawn in, and a low note falling under it
  AU.define('wolfVoid', () => {
    S().noise({ dur: 0.8, vol: 0.28, type: 'lowpass', f0: 120, f1: 700, q: 2, attack: 0.6 });
    S().tone({ type: 'sawtooth', f0: 55, f1: 41, dur: 0.9, vol: 0.12, attack: 0.3, detune: -20 });
    S().tone({ type: 'sine', f0: 880, f1: 220, dur: 0.6, vol: 0.04, attack: 0.4 });
  });
  // eyes opening in the dark: a wet click and a growl under it
  AU.define('wolfEyes', () => {
    S().tone({ type: 'sine', f0: 1400, f1: 700, dur: 0.08, vol: 0.06 });
    S().noise({ dur: 0.4, vol: 0.18, type: 'lowpass', f0: 260, f1: 140, q: 3, attack: 0.08 });
    S().tone({ type: 'sawtooth', f0: 70, f1: 60, dur: 0.4, vol: 0.07, attack: 0.1 });
  });
  // the void comet striking floor, wall or the lid of the sky
  AU.define('wolfBounce', () => {
    S().noise({ dur: 0.16, vol: 0.34, type: 'lowpass', f0: 900, f1: 120 });
    S().tone({ type: 'sine', f0: 110, f1: 38, dur: 0.22, vol: 0.32 });
    S().tone({ type: 'triangle', f0: 520, f1: 260, dur: 0.18, vol: 0.06 });
  });

  // ------------------------------------------------------------------ poses
  // (all in the wolf's own frame, facing right, feet on y = 0)
  // shoulder x y, hip x y, front-near paw, front-far paw, hind-near paw, hind-far paw,
  // neck angle (0 is straight ahead, below 0 lifts the head), neck length, jaw (0 shut, 1 wide),
  // tail (0 straight back, above 0 lifted), ears (0 pricked, 1 pinned flat)
  const POSES = {
    idle: [48, -94, -52, -90, 62, 0, 40, 0, -38, 0, -62, 0, -0.3, 44, 0.06, -0.5, 0.2],
    crouch: [46, -82, -50, -74, 70, 0, 50, 0, -36, 0, -58, 0, -0.04, 42, 0.18, -0.1, 0.7],
    crouchDeep: [44, -78, -36, -52, 80, 0, 62, 0, -24, 0, -44, 0, 0.06, 40, 0.25, 0.55, 1],
    leap: [58, -94, -58, -92, 112, -36, 96, -22, -118, -46, -104, -30, -0.06, 48, 0.55, 0.15, 1],
    dive: [56, -92, -56, -96, 104, -6, 90, 4, -100, -62, -90, -50, 0.25, 48, 0.85, 0.4, 1],
    land: [50, -70, -48, -78, 74, 0, 56, 0, -28, 0, -52, 0, 0.26, 42, 0.25, -0.1, 0.6],
    biteLowUp: [40, -74, -54, -96, 74, 0, 54, 0, -40, 0, -64, 0, 0.6, 40, 0.35, 0.35, 1],
    biteLow: [66, -66, -48, -88, 110, 0, 90, 0, -20, 0, -46, 0, 0.42, 60, 0.0, 0.2, 1],
    biteHighUp: [38, -106, -44, -74, 56, 0, 40, 0, -30, 0, -50, 0, -1.05, 44, 0.45, -0.2, 1],
    biteHigh: [60, -118, -46, -80, 92, -34, 76, -20, -26, 0, -50, 0, -0.55, 60, 0.0, 0.0, 1],
    sweepUp: [54, -86, -48, -102, 66, 0, 46, 0, -58, 0, -84, 0, 0.15, 42, 0.3, 0.95, 0.6],
    sweep: [50, -84, -54, -86, 66, 0, 44, 0, -70, 0, -96, 0, 0.1, 42, 0.4, 0.0, 0.6],
    sit: [40, -108, -40, -48, 46, 0, 30, 0, -14, 0, -2, 0, -1.4, 46, 0.85, -0.95, 0],
    sitMarch: [44, -106, -40, -48, 50, 0, 34, 0, -14, 0, -2, 0, -0.8, 48, 0.85, -0.95, 1],
    inhale: [42, -102, -50, -86, 58, 0, 40, 0, -38, 0, -60, 0, -0.78, 42, 0.12, -0.1, 0.6],
    breath: [56, -84, -52, -88, 80, 0, 60, 0, -42, 0, -66, 0, 0.3, 52, 1, 0.2, 1],
    rear: [8, -166, -38, -90, 52, -186, 28, -174, -30, 0, -56, 0, -0.55, 44, 0.5, -0.6, 0.5],
    rearHigh: [0, -182, -36, -92, 58, -214, -14, -206, -28, 0, -54, 0, -1.2, 44, 0.75, -0.7, 0.3],
    slam: [68, -70, -46, -88, 118, 0, 102, 0, -24, 0, -50, 0, 0.35, 48, 0.7, 0.4, 1],
    skid: [56, -78, -50, -84, 100, 0, 84, 0, -22, 0, -44, 0, -0.15, 44, 0.2, 0.3, 0.8],
    wall: [44, -74, -46, -70, 70, 0, 52, 0, -32, 0, -54, 0, 0.1, 42, 0.3, 0.3, 1],
    lie: [44, -58, -50, -54, 96, 0, 80, 0, -10, 0, -30, 0, 0.75, 40, 0.05, -1.0, 0.9],
    // (drawn upside down: feet below its own floor are paws in the air)
    belly: [48, -88, -52, -88, 70, 6, 48, 14, -30, 10, -58, 2, -0.25, 42, 0.6, 0.1, 1],
    shake: [48, -96, -52, -92, 60, 0, 40, 0, -38, 0, -62, 0, -0.1, 44, 0.1, -0.3, 0.4],
    toss: [48, -98, -52, -90, 62, 0, 40, 0, -38, 0, -62, 0, -0.85, 46, 0.0, -0.3, 0.1],
    push: [50, -82, -52, -90, 80, 0, 64, 0, -38, 0, -62, 0, 0.2, 44, 0.2, 0.1, 0.5],
    snarl: [46, -86, -50, -90, 66, 0, 44, 0, -36, 0, -60, 0, 0.2, 46, 0.6, 0.25, 1],
    // (corrupted) the pack: its muzzle down to the floor, haunches up, ears flat
    lowHead: [50, -78, -50, -98, 74, 0, 54, 0, -38, 0, -62, 0, 1.0, 46, 0.35, -0.3, 1],
    // the comet: a crouch with the legs gathered under it (the spine arches through b.arch), tail curled over
    arch: [34, -70, -34, -68, 62, 0, 46, 0, -24, 0, -46, 0, 0.75, 40, 0.1, 0.95, 1],
    // curled into a ball: legs tucked, head down under the chest, tail wrapped over
    // (centred on its middle, b.y - 56 * size, which is what it turns about)
    curl: [22, -64, -26, -60, 34, -26, 24, -22, -4, -24, -18, -28, 1.45, 30, 0.0, 1.5, 1],
  };
  const NP = 17;
  function walkPose(t) {
    const s = Math.sin(t), c = Math.cos(t), p = POSES.idle.slice();
    p[4] = 62 + s * 22; p[5] = -Math.max(0, c) * 12;
    p[10] = -62 + s * 22; p[11] = -Math.max(0, c) * 12;
    p[6] = 40 - s * 22; p[7] = -Math.max(0, -c) * 12;
    p[8] = -38 - s * 22; p[9] = -Math.max(0, -c) * 12;
    p[1] = -92 - Math.abs(c) * 3; p[3] = -88 - Math.abs(s) * 3;
    p[12] = -0.18 + s * 0.04; p[15] = -0.45 + s * 0.06; p[16] = 0.35;
    return p;
  }
  // a gallop: the front pair and the hind pair land close together, and the spine gathers and stretches
  function runPose(t) {
    const p = POSES.idle.slice(), sn = Math.sin, cs = Math.cos;
    p[0] = 54 + sn(t) * 9; p[2] = -54 - sn(t) * 9;
    p[1] = -88 + cs(t) * 5; p[3] = -86 - cs(t) * 5;
    p[4] = 70 + sn(t) * 46; p[5] = -Math.max(0, cs(t)) * 26;
    p[6] = 56 + sn(t - 0.5) * 46; p[7] = -Math.max(0, cs(t - 0.5)) * 26;
    p[8] = -40 + sn(t + Math.PI) * 48; p[9] = -Math.max(0, cs(t + Math.PI)) * 30;
    p[10] = -58 + sn(t + Math.PI - 0.5) * 48; p[11] = -Math.max(0, cs(t + Math.PI - 0.5)) * 30;
    p[12] = 0.04 + sn(t) * 0.07; p[13] = 46; p[14] = 0.3; p[15] = 0.15 + sn(t) * 0.1; p[16] = 1;
    return p;
  }

  // ------------------------------------------------------------------ state
  B.setup = function () {
    const b = B.body;
    b.x = 900; b.y = FLOOR; b.face = -1; b.lf = -1; b.tf = 1; b.tfRate = 9;
    b.pose = 'idle'; b.p = POSES.idle.slice(); b.pv = new Array(NP).fill(0); b.walkT = 0; b.stepN = 0;
    b.air = false; b.fast = false; b.rot = 0; b.roll = 0; b.wall = 0; b.trail = false;
    b.fire = 1; b.fireTo = 1; b.throat = 0; b.flick = 0; b.shakeT = 0; b.lx = b.x; b.ly = b.y; b.vx = 0; b.vy = 0;
    // (it starts unseen in the dark: see B.enter)
    b.hidden = true; b.fire = 0; b.fireTo = 0;
    B.mane = 1; B.size = 1.12; B.gloom = 0; B.gloomTo = 0; B.flat = 1; B.flatTo = 1;
    B.embers = 0; B.embersOn = false; B.ft = 0; B.flaring = false; B.warnK = 0; B.flareVis = 0;
    B.ghosts = []; B.ghostT = 0; B.treeFire = 0; B.eyes = null;
    // (corrupted) how far back into the dark it stands, its spin as a comet, its arched spine, its fire gone black
    b.back = 0; b.spin = 0; b.arch = 0; b.archTo = 0; b.comet = null;
    B.voidK = 0; B.voidKTo = 0; B.scars = [];
    if (!B.specks) {
      B.specks = [];
      for (let i = 0; i < 260; i++) { const q = Math.random(); B.specks.push({ x: WL + Math.random() * (WR - WL), y: FLOOR - 1 + q * q * 26, ph: Math.random() * 6.28, s: 1 + Math.random() * 2.2 }); }
    }
  };
  B.onRelease = function () {
    const b = B.body;
    b.air = false; b.pose = 'idle'; b.fast = false; b.rot = 0; b.wall = 0; b.trail = false; b.tfRate = 9; b.throat = 0; b.roll = 0;
    b.fireTo = 1; B.gloomTo = 0; B.flatTo = 0;
    voidOff();
  };
  B.onInterrupt = function () {
    const b = B.body;
    b.air = false; b.trail = false; b.wall = 0; b.rot = 0; b.throat = 0; B.gloomTo = 0; B.flatTo = 0; b.hidden = false;
    voidOff();
  };
  B.onStagger = function () {
    const b = B.body;
    b.pose = 'belly'; b.air = false; b.wall = 0; b.rot = 0; b.trail = false; b.hidden = false; b.throat = 0;
    voidOff();
  };
  // (corrupted) out of the dark and out of the comet, whatever cut it short; its fire comes back
  // (how far back it stood and how far it had turned settle back over a few frames: see B.tick)
  function voidOff() {
    const b = B.body;
    b.archTo = 0; b.comet = null; B.voidKTo = 0;
  }
  // nothing reaches it while it stands far back in the dark (the pack)
  B.blocked = () => B.body.back > 0.4;
  B.staggerWord = 'FLOORED'; B.staggerMult = 1.6; B.staggerDur = 0.9;
  // It is thrown onto its back: the flames gutter to smoke and the burning heart in its chest shows.
  B.staggerIn = function* () {
    const b = B.body;
    b.fireTo = 0.22;
    if (b.y < FLOOR - 1) {
      b.pose = 'dive';
      yield* tween(b, { y: FLOOR }, Math.min(0.4, 0.12 + (FLOOR - b.y) / 1800), E.inQuad);
    }
    b.y = FLOOR;
    G.audio.play('yelp');
    b.pose = 'belly'; b.fast = true;
    // over it goes, past its back, and rocks back
    yield* tween(b, { roll: Math.PI + 0.32 }, 0.3, E.outCubic);
    G.audio.play('boom'); G.fx.shake(10); G.fx.kick(0, 5);
    G.fx.thud(b.x, FLOOR, 1.6, { col: G.pal().boss });
    G.fx.ripple(b.x, FLOOR - 40, 300, 0.4, 1);
    for (const d of [-1, 1]) G.fx.dust(b.x + d * 70, FLOOR, 6, { dir: d, speed: [80, 360], size: [10, 18], life: [0.6, 1.2], up: 60, a: 0.45 });
    // the fire goes out of it in a rush of smoke and sparks
    G.fx.dust(b.x, FLOOR - 60, 8, { speed: [20, 120], size: [14, 24], life: [0.9, 1.6], up: 140, a: 0.5, color: '30,22,20', jitter: 50 });
    G.fx.burst(b.x, FLOOR - 70, { n: 24, color: G.pal().boss, speed: [60, 300], life: [0.6, 1.4], size: [1.5, 3.2], grav: -60, wob: 100, jitter: 60 });
    yield* tween(b, { roll: Math.PI }, 0.22, E.inOutQuad);
    b.fast = false;
  };
  B.staggerOut = function* () {
    const b = B.body;
    // it rolls back over and springs up shaking, and the fire comes roaring back
    b.pose = 'crouch'; b.fast = true;
    G.audio.play('snarl');
    yield* tween(b, { roll: 0 }, 0.3, E.inOutCubic);
    b.roll = 0;
    b.pose = 'shake'; b.shakeT = 0.45; b.fireTo = 1;
    G.audio.play('ignite');
    G.fx.burst(b.x, b.y - 70, { n: 26, color: G.pal().boss, speed: [140, 520], life: [0.3, 0.8], size: [2, 4], kind: 'spark', grav: 400 });
    K.aura(b.x, b.y - 30, G.pal().boss, 80, 120, 8);
    yield* wait(0.3);
    b.fast = false;
  };
  B.onRecover = function () { B.body.fireTo = 1; };
  B.dying0 = function () { const b = B.body; b.pose = 'belly'; b.fireTo = 0.12; B.gloomTo = 0.45; B.flaring = false; };
  B.kiting = (P, b) => Math.abs(P.x - b.x) > 430 || (P.y < FLOOR - 120 && Math.abs(P.x - b.x) > 200);

  const facePlayer = () => { const b = B.body; if (Math.abs(G.player.x - b.x) > 14) b.face = G.player.x > b.x ? 1 : -1; };
  const clampX = (x, m) => G.clamp(x, WL + (m || 90), WR - (m || 90));
  const mir = (a) => (B.body.face > 0 ? a : Math.PI - a);
  // the middle of its body in the world (it can be on a wall, or pitched in the air)
  function centre(b) {
    const s = B.size * 56;
    return { x: b.x + s * Math.sin(b.rot), y: b.y - s * Math.cos(b.rot) };
  }
  // where its jaws are, in the world (near enough: it ignores pitch)
  function mouthAt(b) {
    const p = b.p, S = B.size, a = p[12], len = p[13];
    const hx = p[0] + 18 + Math.cos(a) * len, hy = p[1] - 8 + Math.sin(a) * len, hr = a * 0.75;
    const mx = hx + Math.cos(hr) * 54 - Math.sin(hr) * 4, my = hy + Math.sin(hr) * 54 + Math.cos(hr) * 4;
    return { x: b.x + b.face * mx * S, y: b.y + my * S };
  }

  // ------------------------------------------------------------------ building blocks
  // Moving in on the hero: a trot, or a run when it is far off.
  function* approach(dist, speed, maxT) {
    const b = B.body, P = G.player;
    let e = 0;
    while (e < maxT && Math.abs(P.x - b.x) > dist) {
      const dt = yield;
      e += dt; facePlayer();
      b.pose = speed > 420 ? 'run' : 'walk';
      b.x = clampX(b.x + b.face * speed * dt, 80);
    }
    facePlayer();
  }

  // A leap along a parabola. It pitches nose-up as it rises and nose-down as it falls.
  function* arc(x1, y1, dur, apex, onAir) {
    const b = B.body, x0 = b.x, y0 = b.y;
    if (Math.abs(x1 - x0) > 10) b.face = x1 > x0 ? 1 : -1;
    let e = 0, py = y0;
    while (e < dur) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / dur);
      b.x = G.lerp(x0, x1, k);
      const y = G.lerp(y0, y1, k) - 4 * apex * k * (1 - k), vy = (y - py) / Math.max(dt, 1e-4);
      py = y; b.y = y;
      b.rot = b.face * G.clamp(vy / 1900, -0.42, 0.5);
      if (vy > 0 && b.pose === 'leap') b.pose = 'dive';
      if (onAir) onAir(k, dt);
    }
    b.x = x1; b.y = y1; b.rot = 0;
  }

  // Where it comes down hard: a crush, the floor thrown up, and from the second phase, fire.
  function landing(x, big, burn) {
    K.crush(x, FLOOR - 40, big ? 100 : 86, 44, 1);
    K.impact(x, big);
    G.fx.ripple(x, FLOOR - 30, big ? 380 : 240, 0.36, big ? 1.1 : 0.7);
    G.fx.burst(x, FLOOR - 10, { n: big ? 22 : 12, color: G.pal().boss, speed: [100, 420], angle: -Math.PI / 2, spread: 2.6, life: [0.4, 0.9], size: [1.6, 3.4], grav: 300, wob: 60 });
    if (burn !== false) blaze(x, big ? 230 : 170);
  }

  // From the second phase, where it lands the floor catches and keeps burning. The fire spreads from
  // where its paws struck and stays for a few seconds. Never more than three at once.
  function blaze(x, w) {
    if (B.phase < 2) return null;
    x = G.clamp(x, WL + w * 0.3, WR - w * 0.3);
    const live = H.list.filter((h) => h.kind === 'blaze' && !h.ending);
    if (live.length >= 3) live[0].end();
    const life = K.gentle() ? 3.4 : 4.4;
    return H.add({
      kind: 'blaze', layer: 'under', x, w, cw: w * 0.25, ign: 0.42, life, popVy: -600, ending: false, endT: 0, lit: false, sc: 0,
      end() { if (!this.ending) { this.ending = true; this.endT = this.t; } },
      update(dt) {
        this.srcX = this.x;
        this.cw = this.w * Math.min(1, 0.25 + 0.75 * Math.min(1, this.t / (this.ign + 0.3)));
        if (!this.lit && this.t >= this.ign) { this.lit = true; G.audio.play('ignite'); G.fx.scorch(this.x, this.w * 0.5, G.pal().boss); }
        if (this.t >= this.ign + this.life) this.end();
        if (this.ending && this.t > this.endT + 0.45) this.dead = true;
        if (Math.random() < dt * 22) G.fx.spawn({ x: this.x + G.rand(-this.cw / 2, this.cw / 2), y: FLOOR - G.rand(4, 30), vx: G.rand(-20, 20), vy: -G.rand(60, 170), life: G.rand(0.4, 1), size: G.rand(1.4, 3), color: G.pal().boss, wob: 70 });
        if (this.lit && Math.random() < dt * 3) G.fx.dust(this.x + G.rand(-this.cw / 2, this.cw / 2), FLOOR - 20, 1, { speed: [5, 30], size: [10, 16], life: [0.9, 1.5], up: 90, a: 0.3, color: '30,16,12' });
      },
      hits(P) { return this.lit && !this.ending && P.y > FLOOR - 36 && Math.abs(P.x - this.x) < this.cw / 2 - 8; },
      danger(P) { if (this.ending || P.y < FLOOR - 60) return null; return [this.x, this.w / 2 + 16, this.ign - this.t]; },
      draw(ctx) {
        const k = this.ending ? Math.max(0, 1 - (this.t - this.endT) / 0.45) : this.lit ? 1 : 0.35 * (this.t / this.ign);
        flames(ctx, this.x - this.cw / 2, this.x + this.cw / 2, this.lit ? 40 : 12, k, this.x * 0.01, G.pal());
      },
    });
  }

  // A row of flame tongues standing on the floor from x0 to x1, up to h tall.
  function flames(ctx, x0, x1, h, k, seed, pal, col) {
    if (k <= 0.01 || x1 - x0 < 4) return;
    const c1 = col || pal.boss, c2 = pal.hot;
    ctx.globalCompositeOperation = 'lighter';
    // the bed of it
    const g = ctx.createLinearGradient(0, FLOOR - h * 0.7, 0, FLOOR + 2);
    g.addColorStop(0, G.rgba(c1, 0)); g.addColorStop(1, G.rgba(c1, 0.32 * k));
    ctx.fillStyle = g; ctx.fillRect(x0, FLOOR - h * 0.7, x1 - x0, h * 0.7 + 2);
    for (const [col2, sc, al] of [[c1, 1, 0.34], [c1, 0.62, 0.5], [c2, 0.32, 0.45]]) {
      ctx.fillStyle = G.rgba(col2, al * k);
      ctx.beginPath();
      for (let px = x0 + 6; px < x1 - 2; px += 12) {
        const n = 0.5 + 0.25 * Math.sin(px * 0.071 + G.t * 9 + seed) + 0.25 * Math.sin(px * 0.19 - G.t * 13.5 + seed * 2);
        const edge = Math.min(1, (px - x0) / 30, (x1 - px) / 30);
        const hh = h * sc * (0.45 + 0.75 * n) * Math.max(0.25, edge), sw = Math.sin(G.t * 7 + px * 0.05) * 4;
        ctx.moveTo(px - 8 * sc, FLOOR + 1);
        ctx.quadraticCurveTo(px - 3 * sc, FLOOR - hh * 0.5, px + sw, FLOOR - hh);
        ctx.quadraticCurveTo(px + 4 * sc, FLOOR - hh * 0.45, px + 8 * sc, FLOOR + 1);
      }
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // A line of fire racing along the floor (for show: the phase change and its entrance).
  function fireRun(x0, dir, speed) {
    return H.add({
      kind: 'firerun', layer: 'under', x0, dir, speed, far: dir > 0 ? WR - x0 : x0 - WL,
      update(dt) {
        const d = Math.min(this.far, this.t * this.speed), x = this.x0 + this.dir * d;
        if (Math.random() < dt * 40) G.fx.spawn({ kind: 'spark', x, y: FLOOR - 4, vx: this.dir * G.rand(100, 300), vy: -G.rand(80, 300), life: G.rand(0.2, 0.5), size: G.rand(1.5, 3), color: G.pal().hot, grav: 700 });
        if (this.t > this.far / this.speed + 1.1) this.dead = true;
      },
      draw(ctx) {
        const d = Math.min(this.far, this.t * this.speed), pal = G.pal();
        // older stretches have already burnt low
        const seg = 70;
        for (let s = 0; s < d; s += seg) {
          const age = this.t - s / this.speed, k = Math.max(0, 1 - age / 1.1);
          const a = this.x0 + this.dir * s, c = this.x0 + this.dir * Math.min(d, s + seg);
          flames(ctx, Math.min(a, c), Math.max(a, c), 46 * k + 6, k, s * 0.02, pal);
        }
      },
    });
  }

  // ------------------------------------------------------------------ attacks
  // Pounce. Its haunches say how far: a shallow crouch is a short spring at you; when they drop low
  // and the tail goes up, it is coming the length of the arena, high, and lands like a falling tree.
  function* pounce(long, chain) {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    b.fast = false; b.pose = long ? 'crouchDeep' : 'crouch';
    const tele = (long ? 0.72 : 0.46) * T * (chain ? 0.78 : 1);
    G.audio.play('snarl');
    let e = 0, glinted = false;
    while (e < tele) {
      const dt = yield;
      e += dt;
      if (e < tele - 0.18) facePlayer();
      if (Math.random() < dt * (long ? 26 : 12)) G.fx.dust(b.x - b.face * 46, FLOOR, 1, { dir: -b.face, speed: [40, 200], size: [5, 10], life: [0.3, 0.6], up: 30, a: 0.36 });
      if (!glinted && e >= tele - 0.2) { glinted = true; G.fx.glint(b.x + b.face * 78, FLOOR - 10, long ? 30 : 22, G.pal().hot); G.audio.play('glint'); }
    }
    const dir = b.face;
    let tx;
    if (long) tx = clampX(P.x + P.vx * 0.16);
    else tx = clampX(b.x + dir * G.clamp(Math.abs(P.x - b.x) + 10, 110, 330));
    const mark = K.columnMark(tx, 240, true); // (not drawn: watch the body)
    b.fast = true; b.pose = 'leap'; b.air = true; b.trail = long;
    G.audio.play('whoosh');
    G.fx.thud(b.x - dir * 40, FLOOR, long ? 0.9 : 0.6, { noCrack: true });
    let slowed = false;
    yield* arc(tx, FLOOR, long ? 0.74 : 0.42, long ? 230 : 80, (k) => {
      // the long one hangs at the top of its arc for a breath before it comes down
      if (long && !slowed && k > 0.46) { slowed = true; G.fx.slow(0.4, 0.14); G.audio.play('streak'); }
    });
    mark.dead = true; b.air = false; b.trail = false;
    if (long) G.fx.impact(tx, FLOOR - 60, 0.06);
    landing(tx, long);
    b.pose = 'land'; b.fast = false;
    if (long) b.exposed = true;
    yield* wait(long ? 0.55 : chain ? 0.16 : 0.3);
    b.exposed = false;
  }
  function* atkPounce() {
    yield* pounce(K.chance(B.phase === 1 ? 0.45 : 0.5, 'long'), false);
  }
  // Frenzy (phase III): three springs one after another. Before the third, the haunches say again.
  function* atkFrenzy() {
    for (let i = 0; i < 3; i++) {
      const last = i === 2;
      yield* pounce(last && K.chance(0.55, 'long'), !last);
      if (!last) yield* wait(0.1);
    }
  }

  // Bite. Head low: it lunges along the floor and the jaws close at the end of it (jump, or back off).
  // Head high: it rears and snaps at the air in front of it (stay on the ground). From the second phase,
  // ears still flat after the first bite mean a second one.
  function* atkBite() {
    const b = B.body, T = K.T();
    yield* approach(250, 330, 0.9);
    const high = K.chance(0.45, 'high');
    const twice = !high && B.phase >= 2 && K.chance(0.4, 'twice');
    yield* bite(high, T, twice);
    if (twice) {
      yield* wait(0.08);
      yield* bite(false, T * 0.75, false);
    }
  }
  function* bite(high, T, more) {
    const b = B.body;
    facePlayer();
    b.fast = false; b.pose = high ? 'biteHighUp' : 'biteLowUp';
    const f = b.face;
    G.audio.play('snarl');
    if (!high) {
      const tele = 0.56 * T, x1 = clampX(b.x + f * 150, 100);
      H.arc({
        x: x1 + f * 92, y: FLOOR - 36, r: 112, a0: mir(-0.75), a1: mir(0.95), tele, active: 0.12, owner: b,
        onFire() { b.pose = 'biteLow'; G.audio.play('chomp'); G.fx.shake(6); },
      });
      yield* wait(tele - 0.16);
      b.fast = true; b.pose = 'biteLow';
      yield* tween(b, { x: x1 }, 0.16, E.outCubic);
      G.fx.dust(b.x + f * 40, FLOOR, 3, { dir: f, speed: [60, 240], size: [6, 11], up: 30 });
      yield* wait(0.2);
      // a second is coming: it stays coiled, head low and ears flat. Otherwise the head comes up.
      if (more) { b.fast = false; b.pose = 'biteLowUp'; yield* wait(0.1); }
      else b.pose = 'toss';
    } else {
      const tele = 0.62 * T, x1 = clampX(b.x + f * 60, 100);
      H.arc({
        x: x1 + f * 70, y: FLOOR - 118, r: 150, a0: mir(-2.1), a1: mir(0.55), tele, active: 0.13, owner: b,
        onFire() { b.pose = 'biteHigh'; G.audio.play('chomp'); G.fx.shake(6); },
      });
      yield* wait(tele - 0.14);
      b.fast = true; b.pose = 'biteHigh';
      yield* tween(b, { x: x1 }, 0.14, E.outCubic);
      yield* wait(0.3);
    }
  }

  // Sweep: it throws its weight onto its forelegs and swings its hindquarters round; the burning tail
  // scythes along the floor on both sides of it. Jump. A tail that curls first means it sweeps twice.
  function* atkSweep() {
    const b = B.body, T = K.T();
    yield* approach(190, 300, 0.7);
    const twice = K.chance(B.phase >= 2 ? 0.45 : 0.3, 'twice');
    const n = twice ? 2 : 1;
    for (let i = 0; i < n; i++) {
      b.fast = false; b.pose = 'sweepUp'; b.flick = twice && !i ? 1 : 0;
      const tele = (i ? 0.44 : 0.62) * T;
      tailRing(tele);
      G.audio.play(i ? 'snarl' : 'charge', { dur: tele });
      yield* wait(tele);
      // round it goes
      b.fast = true; b.pose = 'sweep'; b.tfRate = 26; b.face = -b.face; b.flick = 0;
      G.audio.play('sweep'); G.audio.play('whoosh');
      G.fx.kick(b.face * 4, 0); G.fx.shake(6);
      for (const d of [-1, 1]) for (let k = 0; k < 3; k++) G.fx.dust(b.x + d * (60 + k * 60), FLOOR, 1, { dir: d, speed: [80, 260], size: [6, 11], up: 24, a: 0.4 });
      yield* wait(0.3);
    }
    b.tfRate = 9;
    yield* wait(0.25);
  }
  function tailRing(tele) {
    const b = B.body, R = 232;
    return H.add({
      kind: 'tail', layer: 'under', tele, active: 0.16, glinted: false, from: -b.face, // the side the tail starts on
      update() {
        this.srcX = b.x;
        if (!this.glinted && this.t >= this.tele - 0.2) {
          this.glinted = true;
          G.fx.glint(b.x - b.face * 150, FLOOR - 70, 26, G.pal().hot); G.audio.play('glint');
        }
        if (!this.fired && this.t >= this.tele) {
          this.fired = true;
          // fire thrown off the tail all the way round
          for (let i = 0; i < 26; i++) {
            const a = G.rand(0, G.TAU), x = b.x + Math.cos(a) * (R - 10), y = FLOOR - 22 + Math.sin(a) * 24;
            G.fx.spawn({ kind: 'spark', x, y, vx: -Math.sin(a) * this.from * 380 + Math.cos(a) * 60, vy: -G.rand(80, 260), life: G.rand(0.2, 0.45), size: G.rand(1.6, 3), color: G.pal().hot, grav: 700 });
          }
          G.fx.ripple(b.x, FLOOR - 30, 300, 0.3, 0.6);
        }
        if (this.t > this.tele + this.active + 0.3) this.dead = true;
      },
      hits(P) { return this.t >= this.tele && this.t < this.tele + this.active && Math.abs(P.x - b.x) < R && P.y > FLOOR - 54; },
      danger(P) { if (this.t >= this.tele + this.active || P.y < FLOOR - 100) return null; return [b.x, R + 22, this.tele - this.t]; },
      draw(ctx) {
        if (this.t < this.tele) return; // (no warning: the tail lifting is the warning)
        const e = this.t - this.tele, k = Math.min(1, e / this.active), f = e < this.active ? 1 : Math.max(0, 1 - (e - this.active) / 0.3);
        // it swings from behind, round through the near side, to the front and on round
        const pal = G.pal(), a0 = this.from > 0 ? 0 : Math.PI, span = Math.max(0.01, Math.PI * 2 * E.outCubic(k));
        const a1 = this.from > 0 ? a0 + span : a0 - span, tail = Math.max(0, span - 2.4);
        const as = this.from > 0 ? a0 + tail : a0 - tail;
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (const [col, w, al, dy] of [[pal.boss, 34, 0.22, 0], [pal.boss, 18, 0.45, 0], [pal.hot, 6, 0.65, 0], [pal.boss, 10, 0.3, -14]]) {
          ctx.strokeStyle = G.rgba(col, al * f); ctx.lineWidth = w;
          ctx.beginPath(); ctx.ellipse(b.x, FLOOR - 22 + dy, R - 10, 24 + dy * 0.6, 0, as, a1, this.from < 0); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  }

  // Howl: it sits back and howls, and embers come down out of the sky. Muzzle straight up: they fall
  // around you. Muzzle tilted forward, ears flat: they fall in a line marching away from it.
  function* atkHowl() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    const march = K.chance(0.4, 'march');
    b.fast = false; b.pose = march ? 'sitMarch' : 'sit';
    yield* wait(0.42 * T);
    G.audio.play('howl');
    b.exposed = true;
    const m = mouthAt(b);
    G.fx.ripple(m.x, m.y, 320, 0.55, 0.9);
    G.fx.shake(5);
    let e = 0;
    if (march) {
      const f = b.face;
      for (let i = 0; i < 9; i++) {
        const x = b.x + f * (150 + i * 116);
        if (x < WL + 30 || x > WR - 30) break;
        H.meteor({ x, tele: 0.72 * T, blastR: 58 });
        yield* wait(0.15);
        e += 0.15;
      }
    } else {
      const n = 3 + B.phase + (K.hard() ? 1 : 0);
      for (let i = 0; i < n; i++) {
        H.meteor({ x: clampX(P.x + P.vx * 0.25 + G.rrand(-30, 30), 50), tele: 0.8 * T, blastR: 56 });
        if (i % 2 === 0) { const mm = mouthAt(b); G.fx.ripple(mm.x, mm.y, 200, 0.4, 0.5); }
        yield* wait(0.34);
        e += 0.34;
      }
    }
    yield* wait(0.75 * T);
    b.exposed = false;
  }

  // Rake: it rears up on its hind legs, twice its height, and brings both forepaws down in front of it.
  // Paws spread wide and the head thrown back: the slam throws fire along the floor both ways.
  function* atkRake() {
    const b = B.body, T = K.T();
    yield* approach(210, 300, 0.8);
    facePlayer();
    const wave = K.chance(B.phase >= 2 ? 0.5 : 0.35, 'wave');
    b.fast = false; b.pose = wave ? 'rearHigh' : 'rear';
    const tele = (wave ? 0.86 : 0.68) * T;
    G.audio.play('snarl'); G.audio.play('charge', { dur: tele });
    H.arc({
      x: b.x + b.face * 24, y: FLOOR - 150, r: 205, a0: mir(-1.95), a1: mir(0.95), tele, active: 0.13, heavy: wave, owner: b,
      follow(h) { if (!h.fired) h.x = b.x + b.face * 24; },
      onFire() { b.fast = true; b.pose = 'slam'; G.audio.play('cleave'); },
    });
    yield* wait(tele + 0.06);
    const px = b.x + b.face * 112;
    K.crush(px, FLOOR - 34, 70, 34, 1);
    K.impact(px, wave);
    if (wave) {
      const tint = { boss: G.pal().boss, hot: G.pal().hot };
      H.shockwave(px - 40, -1, 520, 50, tint); H.shockwave(px + 40, 1, 520, 50, tint);
      G.fx.impact(px, FLOOR - 50, 0.05);
    }
    blaze(px, 180);
    b.exposed = true;
    yield* wait(0.75);
    b.exposed = false;
  }

  // Wall-run (from phase II): it sprints to a wall and runs up it. High on the wall it dives on you;
  // low on the wall it launches flat across the arena over your head and into the far wall.
  function* atkWallrun() {
    const b = B.body, P = G.player, T = K.T();
    const dir = G.sign(b.x - P.x) || 1, wallX = dir > 0 ? WR : WL;
    b.face = dir; b.pose = 'run'; b.trail = true;
    G.audio.play('snarl');
    while (Math.abs(wallX - b.x) > 80) {
      const dt = yield;
      b.x += dir * 860 * dt;
      if (Math.random() < dt * 30) G.fx.dust(b.x - dir * 50, FLOOR, 1, { dir: -dir, speed: [60, 240], size: [6, 11], life: [0.3, 0.6], up: 30, a: 0.4 });
    }
    const high = K.chance(0.5, 'high');
    // onto the wall: the world turns a quarter under it
    G.audio.play('paw'); G.fx.shake(4);
    b.x = wallX; b.wall = dir; b.y = FLOOR - 70;
    yield* tween(b, { rot: -dir * Math.PI / 2 }, 0.1, E.outQuad);
    const top = high ? 150 : FLOOR - 196;
    while (b.y > top) {
      const dt = yield;
      b.y = Math.max(top, b.y - 960 * dt);
      if (Math.random() < dt * 30) G.fx.burst(wallX - dir * 4, b.y + 30, { n: 1, color: '24,16,12', speed: [60, 200], angle: dir > 0 ? Math.PI : 0, spread: 1.2, life: [0.4, 0.8], size: [2, 4], kind: 'chunk', grav: 1400 });
    }
    b.pose = 'wall'; b.trail = false;
    // it hangs there and looks down
    if (high) B.gloomTo = 0.55;
    const hold = (high ? 0.46 : 0.34) * T;
    G.fx.glint(wallX - dir * 30, b.y - 10, 30, G.pal().hot); G.audio.play('glint');
    yield* wait(hold);
    if (high) {
      // a dive at the hero, from near the top of the screen
      const tx = clampX(P.x + P.vx * 0.15, 100);
      const mark = K.columnMark(tx, 240, true);
      b.wall = 0; b.pose = 'dive'; b.air = true; b.trail = true; b.face = -dir;
      b.x = wallX - dir * 70;
      G.audio.play('streak'); G.audio.play('whoosh');
      yield* arc(tx, FLOOR, 0.5, 30, () => { b.pose = 'dive'; });
      mark.dead = true; b.air = false; b.trail = false; B.gloomTo = 0;
      G.fx.impact(tx, FLOOR - 60, 0.07);
      landing(tx, true, false);
      if (B.phase >= 2) { blaze(tx - 110, 160); blaze(tx + 110, 160); }
      b.pose = 'land'; b.exposed = true;
      yield* wait(0.6);
      b.exposed = false;
    } else {
      // flat across, at a height that passes over anyone standing
      const far = dir > 0 ? WL + 90 : WR - 90, fy = FLOOR - 92;
      b.wall = 0; b.rot = 0; b.face = -dir; b.pose = 'leap'; b.air = true; b.trail = true;
      b.x = wallX - dir * 80; b.y = fy;
      G.audio.play('streak'); G.audio.play('whoosh');
      while ((far - b.x) * -dir > 0) {
        const dt = yield;
        b.x -= dir * 1500 * dt;
        G.fx.shake(2);
      }
      b.x = far; b.air = false; b.trail = false;
      // into the far wall, and down
      G.audio.play('slam'); G.fx.shake(10);
      G.fx.burst(far - dir * 40, fy - 50, { n: 14, color: '24,18,14', speed: [150, 500], angle: dir > 0 ? 0 : Math.PI, spread: 2, life: [0.5, 1], size: [4, 9], kind: 'chunk', grav: 1400 });
      G.fx.dust(far - dir * 60, fy - 50, 5, { dir, speed: [40, 200], size: [8, 14], up: 30 });
      b.pose = 'dive';
      yield* tween(b, { y: FLOOR }, 0.24, E.inQuad);
      G.fx.thud(b.x, FLOOR, 1.1);
      G.audio.play('boom');
      blaze(b.x, 160);
      b.pose = 'land'; b.exposed = true;
      yield* wait(0.55);
      b.exposed = false;
    }
  }

  // Breath (its answer to a hero who keeps away): it draws a long breath, its throat lights through
  // the seams, and it rakes the floor with fire from its feet out to the wall. Close to it, or behind
  // it, the fire passes overhead. It is planted while it breathes, and open to anyone who comes in.
  function* atkBreath() {
    const b = B.body, T = K.T();
    facePlayer();
    b.fast = false; b.pose = 'inhale';
    const tele = 0.9 * T;
    G.audio.play('inhale', { dur: tele });
    let e = 0;
    while (e < tele) {
      const dt = yield;
      e += dt; b.throat = Math.min(1, e / tele);
      const m = mouthAt(b);
      if (Math.random() < dt * 20) G.fx.spawn({ x: m.x, y: m.y, vx: b.face * G.rand(10, 50), vy: -G.rand(30, 90), life: G.rand(0.3, 0.6), size: G.rand(1.5, 3), color: G.pal().hot, wob: 40 });
    }
    b.fast = true; b.pose = 'breath'; b.exposed = true;
    const f = b.face, speed = (K.gentle() ? 470 : 560) + (K.hard() ? 60 : 0), end = f > 0 ? WR - 10 : WL + 10;
    G.audio.play('flame', { dur: Math.abs(end - b.x) / speed + 0.3 });
    G.fx.kick(-f * 4, 0);
    const st = H.add({
      kind: 'breath', layer: 'over', ix: b.x + f * 150, f, speed, end, hold: 0, mx: 0, my: 0, sc: 0,
      update(dt) {
        const m = mouthAt(b);
        this.mx = m.x; this.my = m.y; this.srcX = m.x;
        if ((this.end - this.ix) * this.f > 0) this.ix += this.f * this.speed * Math.min(1, 0.4 + this.t * 2) * dt;
        else { this.ix = this.end; this.hold += dt; if (this.hold > 0.18) this.dead = true; }
        const pal = G.pal();
        for (let i = 0; i < 3; i++) {
          const q = Math.random();
          G.fx.spawn({ x: G.lerp(this.mx, this.ix, q) + G.rand(-8, 8), y: G.lerp(this.my, FLOOR - 8, q) + G.rand(-8, 8), vx: this.f * G.rand(60, 200), vy: -G.rand(20, 120), life: G.rand(0.2, 0.45), size: G.rand(2, 5), color: q > 0.5 ? pal.boss : pal.hot });
        }
        G.fx.spawn({ kind: 'spark', x: this.ix, y: FLOOR - 6, vx: this.f * G.rand(60, 300), vy: -G.rand(150, 420), life: G.rand(0.2, 0.45), size: G.rand(1.5, 3), color: pal.hot, grav: 800 });
        if (Math.abs(this.ix - this.sc) > 46) { this.sc = this.ix; G.fx.scorch(this.ix, 34, pal.boss); }
        if (Math.random() < dt * 8) G.fx.dust(this.ix, FLOOR - 10, 1, { speed: [10, 40], size: [10, 16], life: [0.6, 1.1], up: 90, a: 0.3, color: '30,16,12' });
        G.fx.shake(1.6);
      },
      hits(P) {
        return G.distPointSeg(P.x, P.y - 22, this.mx, this.my, this.ix, FLOOR - 6) < 22 || (Math.abs(P.x - this.ix) < 36 && P.y > FLOOR - 52);
      },
      danger(P) {
        const near = this.mx + (this.ix - this.mx) * 0.45;
        const lo = Math.min(near, this.end), hi = Math.max(near, this.end);
        const ahead = (P.x - this.ix) * this.f;
        return [(lo + hi) / 2, (hi - lo) / 2 + 14, ahead > 0 ? ahead / this.speed : 0];
      },
      draw(ctx) {
        const pal = G.pal(), fl = 1 + 0.12 * Math.sin(this.t * 60), fade = this.hold > 0 ? Math.max(0, 1 - this.hold / 0.18) : Math.min(1, this.t / 0.06);
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        const ex = this.ix, ey = FLOOR - 6;
        for (const [col, w, al] of [[pal.boss, 40, 0.26], [pal.boss, 22, 0.5], [pal.hot, 8, 0.55]]) {
          ctx.strokeStyle = G.rgba(col, al * fade);
          const g = ctx.createLinearGradient(this.mx, this.my, ex, ey);
          g.addColorStop(0, G.rgba(col, al * fade * 0.6)); g.addColorStop(1, G.rgba(col, al * fade));
          ctx.strokeStyle = g; ctx.lineWidth = w * fl;
          ctx.beginPath(); ctx.moveTo(this.mx, this.my);
          ctx.quadraticCurveTo(G.lerp(this.mx, ex, 0.5), G.lerp(this.my, ey, 0.5) - 14, ex, ey); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        flames(ctx, ex - 46, ex + 46, 56, fade, this.t, pal);
      },
    });
    while (!st.dead) yield;
    b.exposed = false;
    blaze(st.end - f * 80, 160);
    yield* wait(0.3);
  }

  // Emberfall (phase III, once, when it is nearly spent): it springs out of sight, the arena goes dark,
  // and it comes down on you like a falling star. The blast of its landing runs out in a ring of fire
  // that only a dash will pass.
  function* atkEmberfall() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    b.fast = false; b.pose = 'crouchDeep';
    G.audio.play('roar'); G.audio.play('charge', { dur: 0.6 });
    let e = 0;
    while (e < 0.6) { const dt = yield; e += dt; K.aura(b.x, b.y - 30, G.pal().boss, 70, 100, 2); G.fx.shake(3); }
    b.fast = true; b.pose = 'leap'; b.trail = true;
    G.fx.thud(b.x, FLOOR, 1.4); G.audio.play('whoosh');
    yield* tween(b, { y: -320 }, 0.34, E.outQuad);
    b.hidden = true; b.trail = false;
    B.flatTo = 0.6;
    const tele = 1.25 * T, lockT = 0.36 * T;
    const bl = H.blast({
      x: P.x, y: FLOOR - 8, r: 140, tele, dmg: 2,
      follow(h) { if (h.t < tele - lockT) h.x = G.damp(h.x, clampX(P.x, 80), 0.16, 1); },
    });
    yield* wait(tele - 0.14);
    b.hidden = false; b.x = bl.x; b.y = -260; b.face = P.x >= b.x ? 1 : -1; b.pose = 'dive'; b.trail = true; b.rot = b.face * 0.5;
    G.audio.play('streak');
    yield* tween(b, { y: FLOOR }, 0.14, E.inQuad);
    b.rot = 0; b.trail = false;
    G.fx.impact(b.x, FLOOR - 60, 0.1); G.fx.stop(0.08);
    K.impact(b.x, true);
    G.fx.ripple(b.x, FLOOR - 40, 520, 0.6, 1.4);
    H.ring({ x: b.x, y: FLOOR - 30, r: 60, speed: 520, thick: 22, maxR: 1100 });
    B.flatTo = 0;
    b.pose = 'land'; b.exposed = true;
    yield* wait(1.4);
    b.exposed = false;
  }

  // ------------------------------------------------------------------ corrupted: the void pack and the void comet
  // (only its corrupted self uses these two: see B.corruptBags)

  // black embers coming off something that burns void
  function blackFlakes(x, y, n, spread) {
    for (let i = 0; i < n; i++) {
      G.fx.spawn({ kind: 'chunk', x: x + G.rand(-spread, spread), y: y + G.rand(-spread, spread) * 0.5, vx: G.rand(-40, 40), vy: -G.rand(50, 160), life: G.rand(0.5, 1.1), size: G.rand(2, 4.5), color: VOID, grav: -60, drag: 1.2, rot: G.rand(0, 6), vr: G.rand(-6, 6) });
    }
  }
  // a spring off the floor that carries it between the front of the arena and the dark at the back
  // (back 0 is here, 1 is far off on the rock at the back of the forest: smaller, darker, out of reach)
  const BACKY = KNOLL;
  function* hopBack(x1, back1, dur, apex) {
    const b = B.body, x0 = b.x, back0 = b.back;
    if (Math.abs(x1 - x0) > 10) b.face = x1 > x0 ? 1 : -1;
    b.pose = 'leap'; b.fast = true;
    let e = 0;
    while (e < dur) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / dur);
      b.x = G.lerp(x0, x1, E.inOutQuad(k));
      b.back = G.lerp(back0, back1, E.inOutQuad(k));
      b.y = FLOOR - BACKY * b.back - apex * 4 * k * (1 - k);
      // nose up as it rises, down as it falls, level at both ends
      b.rot = b.face * 0.42 * (2 * k - 1) * Math.sin(Math.PI * k);
      if (k > 0.55) b.pose = 'dive';
    }
    b.x = x1; b.back = back1; b.y = FLOOR - BACKY * back1; b.rot = 0;
  }

  // Pack (every phase): its muzzle goes down to the floor and its fire turns black from the mane
  // back; it springs away into the dark at the back of the arena and howls, and the dark answers.
  // Wolves of shadow, copies of it half its size, come out of the arena's edges one after another,
  // from alternate sides, and a pair of crimson eyes opens in the dark a beat before each one.
  // Eyes low, at the floor: a runner, flat out along the ground (jump it, or dash through it).
  // Eyes high: a leaper, coming in long bounds (keep to the ground under its arc, away from where its
  // paws come down, or dash through it; a hero up in the air meets it).
  function* atkPack() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    b.fast = false; b.pose = 'lowHead'; B.voidKTo = 1;
    G.audio.play('snarl'); G.audio.play('wolfVoid');
    const tele = 0.62 * T;
    let e = 0;
    while (e < tele) {
      const dt = yield;
      e += dt;
      if (Math.random() < dt * 26) { const m = mouthAt(b); blackFlakes(m.x, m.y, 1, 12); }
      if (Math.random() < dt * 8) G.fx.dust(b.x + G.rand(-60, 60), FLOOR, 1, { speed: [10, 50], size: [8, 14], up: 30, a: 0.4, color: VOID });
    }
    // gathers, and springs away into the dark
    b.pose = 'crouch';
    yield* wait(0.1);
    G.audio.play('whoosh'); G.fx.thud(b.x, FLOOR, 0.8, { noCrack: true });
    // (to the middle of the rock; in the second phase, beside the burnt tree that stands in front of it)
    const bx = B.phase === 2 ? (P.x < 640 ? 760 : 520) : 640;
    yield* hopBack(bx, 1, 0.46, 130);
    b.pose = 'land'; b.fast = false;
    G.fx.dust(b.x, b.y, 3, { speed: [20, 80], size: [6, 10], up: 20, a: 0.3, color: VOID });
    yield* wait(0.14);
    facePlayer();
    b.pose = 'sit';
    yield* wait(0.22);
    G.audio.play('howl');
    G.fx.ripple(b.x + b.face * 30, b.y - 100, 380, 0.6, 0.9);
    // the pack: the first from the side the hero is further from; each after the last is past the hero
    const n = B.phase === 1 ? 3 : 4;
    const leapAt = 1 + Math.floor(G.rng() * (n - 1));
    let side = P.x < 640 ? 1 : -1, prev = null;
    for (let i = 0; i < n; i++) {
      if (prev) while (!prev.dead && !passed(prev)) yield;
      prev = voidWolf(side, i === leapAt, T);
      side = -side;
      facePlayer();
      if (i) G.fx.ripple(b.x + b.face * 30, b.y - 100, 220, 0.4, 0.5);
    }
    while (!prev.dead && !passed(prev)) yield;
    // out of the dark again, well clear of the hero, and its own fire comes back
    b.pose = 'crouch';
    yield* wait(0.16);
    const x2 = clampX(P.x + (P.x < 640 ? 1 : -1) * 380, 120);
    G.audio.play('whoosh');
    yield* hopBack(x2, 0, 0.5, 150);
    B.voidKTo = 0;
    G.audio.play('ignite'); G.audio.play('paw');
    G.fx.thud(b.x, FLOOR, 1.0, { col: BLOOD });
    G.fx.burst(b.x, b.y - 70, { n: 16, color: G.pal().boss, speed: [100, 340], life: [0.3, 0.7], size: [1.5, 3], kind: 'spark', grav: 300, jitter: 50 });
    b.pose = 'land'; b.fast = false; B.kite = 0;
    yield* wait(0.3);
  }
  const passed = (r) => r.out && (G.player.x - r.x) * r.dir < -150;

  // One wolf of the pack. side: the wall it comes out of (1 the right, -1 the left).
  const PACK_SC = 0.6, LEAP_A = 120;
  function voidWolf(side, leap, T) {
    const dir = -side, x0 = side > 0 ? WR - 6 : WL + 6, far = side > 0 ? WL : WR;
    const v = leap ? 700 : 880, eyeT = 0.6 * T, eyeY = leap ? FLOOR - LEAP_A - 44 : FLOOR - 40;
    // a leaper's paws come down every 600 px, starting 300 in from the edge; it comes out at the top of an arc
    const touches = leap ? [x0 + dir * 300, x0 + dir * 900] : [];
    G.audio.play('wolfEyes');
    return H.add({
      kind: 'voidwolf', layer: 'under', dir, leap, x: x0, h: leap ? LEAP_A : 0, out: false, landed: 0, walkT: G.rand(0, 6), stepN: 0,
      fig: { x: x0, y: FLOOR, face: dir, tf: 1, rot: 0, p: (leap ? POSES.dive : runPose(0)).slice(), fire: 1, vk: 1, sc: PACK_SC, roll: 0 },
      trail: [], trailT: 0,
      update(dt) {
        this.srcX = this.x;
        if (this.t < eyeT) return;
        const s = v * (this.t - eyeT);
        if (!this.out) {
          // out of the dark
          this.out = true;
          G.audio.play(leap ? 'whoosh' : 'snarl');
          blackFlakes(x0, eyeY + 10, 8, 22);
          G.fx.burst(x0, eyeY + 10, { n: 10, color: BLOOD, speed: [120, 380], angle: dir > 0 ? 0 : Math.PI, spread: 1.4, life: [0.15, 0.4], size: [1.4, 2.6], kind: 'spark', len: 0.05 });
        }
        this.x = x0 + dir * s;
        const f = this.fig;
        if (leap) {
          const q = (((s + 300) % 600) + 600) % 600 / 600;
          this.h = LEAP_A * 4 * q * (1 - q);
          const slope = LEAP_A * 4 * (1 - 2 * q) / 600; // rise per pixel
          // the pose follows the arc: reaching up off the paws, then stretched out coming down
          const tp = slope > 0.15 ? POSES.leap : slope < -0.15 ? POSES.dive : null;
          for (let i = 0; i < NP; i++) f.p[i] = G.damp(f.p[i], (tp || (q < 0.5 ? POSES.leap : POSES.dive))[i], 14, dt);
          // (its body swings through level as it bounds off its paws, rather than flipping)
          f.rot = G.damp(f.rot, dir * G.clamp(-slope * 0.55, -0.4, 0.45), 11, dt);
          while (this.landed < touches.length && (this.x - touches[this.landed]) * dir >= 0) {
            const tx = touches[this.landed++];
            G.audio.play('paw'); G.fx.shake(2.5);
            G.fx.thud(tx, FLOOR, 0.6, { noCrack: true });
            blackFlakes(tx, FLOOR - 8, 5, 18);
          }
        } else {
          this.walkT += dt * 17;
          f.p = runPose(this.walkT);
          const sn = Math.floor(this.walkT / Math.PI);
          if (sn !== this.stepN) { this.stepN = sn; G.fx.dust(this.x - dir * 20, FLOOR, 1, { dir: -dir, speed: [40, 160], size: [5, 9], up: 20, a: 0.32, color: VOID }); }
        }
        f.x = this.x; f.y = FLOOR - this.h;
        if (Math.random() < dt * 24) blackFlakes(this.x - dir * 20, f.y - 50, 1, 20);
        // a smear of itself left behind as it runs
        this.trailT -= dt;
        if (this.trailT <= 0) { this.trailT = 0.04; this.trail.push({ x: f.x, y: f.y, face: dir, tf: 1, rot: f.rot, p: f.p.slice(), sc: PACK_SC, a: 1 }); if (this.trail.length > 4) this.trail.shift(); }
        for (const g of this.trail) g.a -= dt * 5;
        // into the far edge, and gone back into the dark
        if ((this.x - far) * dir > -10) {
          this.dead = true;
          blackFlakes(far - dir * 20, f.y - 30, 8, 24);
          G.fx.dust(far - dir * 30, f.y - 20, 3, { dir: -dir, speed: [20, 90], size: [10, 16], up: 40, a: 0.4, color: VOID });
        }
      },
      box() { return { cx: this.x + dir * 12, cy: FLOOR - this.h - (leap ? 34 : 28), hw: 46, hh: leap ? 22 : 20 }; },
      hits(P) { return this.out && G.rectsOverlap(P.box(), this.box()); },
      // (for the scripted player in tools/boss-tests.js) where it is unsafe to stand
      danger(P) {
        const lead = this.out ? 0 : eyeT - this.t, x = this.out ? this.x : x0;
        if ((P.x - x) * dir < -70) return null; // gone past
        if (!leap) {
          if (P.y < FLOOR - 80 || (P.x - x) * dir > 200) return null;
          // close now: from just behind it to a good way ahead, so the way out is over it or through it
          // (a dash through it from here is over well inside the dash's moment of grace)
          const lo = x - dir * 56, hi = x + dir * v * 0.6;
          return [(lo + hi) / 2, Math.abs(hi - lo) / 2, lead + Math.max(0, (P.x - x) * dir - 60) / v];
        }
        // a leaper: where its paws come down next, nearest the hero
        let best = null;
        for (let i = this.landed; i < touches.length; i++) {
          const tx = touches[i], d = [tx, 118, lead + Math.max(0, (tx - x) * dir - 50) / v];
          if (!best || Math.abs(P.x - tx) < Math.abs(P.x - best[0])) best = d;
        }
        return best;
      },
      // the eyes in the dark at the edge, opening, then closing as it comes out of them (B.drawOver)
      paintEyes(ctx) {
        const eo = this.t < eyeT ? E.outCubic(Math.min(1, this.t / 0.16)) : Math.max(0, 1 - (this.t - eyeT) / 0.22);
        if (eo > 0.01) drawRift(ctx, x0, eyeY, side, eo, Math.min(1, this.t / 0.14));
      },
      // the wolf itself, drawn with its maker (B.draw) so the corruption takes it the same way
      paint(ctx) {
        if (!this.out) return;
        // it comes out of the dark and goes back into it
        const a = Math.min(1, (this.t - eyeT) / 0.1) * G.clamp((far - this.x) * dir / 70, 0, 1);
        for (const g of this.trail) if (g.a > 0.35) drawWolf(ctx, g, 0.12 * g.a * a, true);
        drawWolf(ctx, this.fig, a, false);
      },
    });
  }
  // A pair of eyes in the dark at the edge of the arena. k: how much of the dark there is, open: the lids.
  function drawRift(ctx, x, y, side, k, open) {
    const g = ctx.createRadialGradient(x, y, 4, x, y, 130);
    g.addColorStop(0, 'rgba(4,0,2,' + 0.85 * k + ')'); g.addColorStop(0.5, 'rgba(4,0,2,' + 0.42 * k + ')'); g.addColorStop(1, 'rgba(4,0,2,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 130, y - 130, 260, 260);
    const ex = x - side * 30, lid = E.outBack(Math.min(1, open)) * k;
    ctx.globalCompositeOperation = 'lighter';
    for (const dx of [-10, 10]) {
      const cx = ex + dx;
      D.glow(ctx, BLOOD, cx, y, 22, 0.75 * k);
      ctx.fillStyle = G.rgba(VHOT, 0.95 * k);
      D.poly(ctx, [cx - 7, y - 2 * lid, cx + 6, y - 3 * lid, cx + (dx < 0 ? 4 : -4), y + 2 * lid]); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // Ricochet (from phase II): it drops into a crouch with its spine arched high and its tail curled
  // over, then turns once where it stands, curling up as its fire goes black, and goes off as a comet
  // of void fire: in straight lines, off the floor, the walls and the lid of the sky, four or five
  // times, each line drawn faintly before it travels it, aimed at where the hero is when it is drawn.
  // Then it comes down with all its weight. Read the next line and be off it; a hero up in the air is
  // aimed at as much as one on the ground.
  const CEIL = 34, CR = 46, HR = 38, MINA = 0.56, MAXA = 1.19; // (lines only between 32 and 68 degrees off the flat)
  function plan(qx, qy, surf, final, drop) {
    const P = G.player;
    let dx = P.x - qx, dy = (final ? FLOOR - CR : P.y - 22) - qy;
    if (drop) { dx = 0; dy = 1; }
    else {
      // away from what it is leaving
      if (surf === 'floor') dy = Math.min(dy, -1);
      if (surf === 'ceil') dy = Math.max(dy, 1);
      if (surf === 'left') dx = Math.max(dx, 1);
      if (surf === 'right') dx = Math.min(dx, -1);
      if (Math.abs(dx) < 1) dx = qx < 640 ? 1 : -1;
      const a = G.clamp(Math.atan2(Math.abs(dy), Math.abs(dx)), MINA, MAXA);
      dx = Math.sign(dx) * Math.cos(a); dy = Math.sign(dy) * Math.sin(a);
    }
    // on to the first thing in its way
    const l = WL + CR, r = WR - CR, t = CEIL + CR, bt = FLOOR - CR;
    let len = 1e9, hit = '';
    if (dx > 0.001 && (r - qx) / dx < len) { len = (r - qx) / dx; hit = 'right'; }
    if (dx < -0.001 && (l - qx) / dx < len) { len = (l - qx) / dx; hit = 'left'; }
    if (dy > 0.001 && (bt - qy) / dy < len) { len = (bt - qy) / dy; hit = 'floor'; }
    if (dy < -0.001 && (t - qy) / dy < len) { len = (t - qy) / dy; hit = 'ceil'; }
    len = Math.max(0, len);
    return { ax: qx, ay: qy, bx: qx + dx * len, by: qy + dy * len, ux: dx, uy: dy, len, surf: hit, final: !!final && hit === 'floor' };
  }
  // The line it will travel next, drawn faint: a dark band through the air with a crimson thread down it.
  function voidLine(seg, startIn, v) {
    return H.add({
      kind: 'voidline', layer: 'under', seg, startIn, v, x: (seg.ax + seg.bx) / 2,
      update() { if (this.t > this.startIn + this.seg.len / this.v + 0.25) this.dead = true; },
      // (for the scripted player) where the line crosses the hero's height, and how soon the comet is there
      danger(P) {
        const s = this.seg, py = P.y - 22, m = 62;
        // where it sets off from (until it has left)
        if (this.t < this.startIn + 0.1 && Math.abs(P.x - s.ax) < m + 30 && Math.abs(py - s.ay) < m + 10) return [s.ax, m + 30, Math.max(0, this.startIn - this.t)];
        if (Math.abs(s.uy) < 0.05) return null;
        const xc = s.ax + (py - s.ay) * s.ux / s.uy, along = (xc - s.ax) * s.ux + (py - s.ay) * s.uy;
        if (along < -m || along > s.len + m) return null;
        const when = this.startIn + Math.max(0, along - m) / this.v - this.t;
        if (this.t > this.startIn + (along + m) / this.v) return null; // (it has gone by)
        let hw = m / Math.abs(s.uy) + 6;
        if (s.final && along > s.len - 140) hw = Math.max(hw, 100); // the weight of its landing
        return [xc, hw, Math.max(0, when)];
      },
      draw(ctx) {
        const s = this.seg, gone = Math.max(0, (this.t - this.startIn) * this.v); // what the comet has already travelled
        if (gone >= s.len) return;
        const fade = E.inOutQuad(Math.min(1, this.t / 0.22)), near = this.t < this.startIn ? 0.45 + 0.55 * this.t / this.startIn : 1;
        const x0 = s.ax + s.ux * gone, y0 = s.ay + s.uy * gone;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = G.rgba(VOID, 0.36 * fade); ctx.lineWidth = 18;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(s.bx, s.by); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = G.rgba(BLOOD, 0.42 * fade * near); ctx.lineWidth = 1.8;
        ctx.setLineDash([18, 12]); ctx.lineDashOffset = -this.t * 160;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(s.bx, s.by); ctx.stroke();
        ctx.setLineDash([]);
        // where it will strike: a thin mark flat on the floor, wall or sky
        const cx = s.surf === 'left' ? WL : s.surf === 'right' ? WR : s.bx, cy = s.surf === 'floor' ? FLOOR : s.surf === 'ceil' ? CEIL : s.by;
        const wall = s.surf === 'left' || s.surf === 'right', r = s.final ? 34 : 24;
        ctx.strokeStyle = G.rgba(BLOOD, 0.45 * fade * near); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, wall ? 5 : r, wall ? r : 5, 0, 0, G.TAU); ctx.stroke();
        ctx.restore();
      },
    });
  }
  // Where the comet strikes: the floor cracks, the wall spits stone, the sky splits for a moment.
  function bounceFx(x, y, surf) {
    G.audio.play('wolfBounce'); G.fx.shake(7);
    G.fx.ripple(x, y, 220, 0.32, 0.8);
    blackFlakes(x, y, 8, 26);
    if (surf === 'floor') {
      G.fx.thud(x, FLOOR, 1.1, { col: BLOOD });
      G.fx.burst(x, FLOOR - 6, { n: 12, color: BLOOD, speed: [140, 420], angle: -Math.PI / 2, spread: 2.2, life: [0.2, 0.5], size: [1.5, 3], kind: 'spark', grav: 700 });
      G.fx.kick(0, 3);
      return;
    }
    const wall = surf === 'left' || surf === 'right', sx = surf === 'left' ? WL : surf === 'right' ? WR : x, sy = wall ? y : CEIL;
    const away = surf === 'left' ? 0 : surf === 'right' ? Math.PI : Math.PI / 2;
    if (wall) {
      G.fx.burst(sx, sy, { n: 12, color: '24,16,12', speed: [150, 460], angle: away, spread: 1.8, life: [0.5, 1], size: [3, 7], kind: 'chunk', grav: 1400 });
      G.fx.kick(surf === 'left' ? -3 : 3, 0);
    } else G.fx.kick(0, -3);
    G.fx.burst(sx, sy, { n: 14, color: BLOOD, speed: [140, 420], angle: away, spread: 2.2, life: [0.2, 0.5], size: [1.5, 3], kind: 'spark', grav: wall ? 500 : 900 });
    // the cracks it leaves in the dark, fading
    const lines = [];
    for (let i = 0; i < 6; i++) {
      const pts = [0, 0];
      let a = (wall ? Math.PI / 2 : 0) + (i % 2 ? Math.PI : 0) + G.rand(-0.5, 0.5), px = 0, py = 0;
      for (let k = 0; k < 4; k++) { const L = G.rand(10, 26); a += G.rand(-0.5, 0.5); px += Math.cos(a) * L; py += Math.sin(a) * L; pts.push(px, py); }
      lines.push(pts);
    }
    B.scars.push({ x: sx, y: sy, wall, lines, t: 0 });
    if (B.scars.length > 6) B.scars.shift();
  }

  function* atkRicochet() {
    const b = B.body, T = K.T();
    facePlayer();
    const v = B.phase >= 3 ? 1220 : 1120, N = 4, minPrev = 0.6 * T;
    const tArch = 0.4 * T, tSpin = 0.44 * T, off = () => B.size * 56; // (its middle, above its feet)
    // the tell: a crouch with its spine arched high
    b.fast = false; b.pose = 'arch'; b.archTo = 1;
    G.audio.play('snarl'); G.audio.play('charge', { dur: tArch + tSpin });
    // its first line is chosen now and drawn while it gathers
    let seg = plan(b.x, FLOOR - off(), 'floor', false);
    voidLine(seg, tArch + tSpin + 0.08, v);
    const turn = seg.ux >= 0 ? 1 : -1;
    let e = 0;
    while (e < tArch) {
      const dt = yield;
      e += dt;
      B.voidKTo = 0.35 * (e / tArch);
      if (Math.random() < dt * 20) G.fx.dust(b.x + G.rand(-60, 60), FLOOR, 1, { speed: [20, 80], size: [6, 10], up: 20, a: 0.35 });
    }
    // one turn where it stands, curling into a ball as its fire goes black
    B.voidKTo = 1; G.audio.play('wolfVoid');
    b.pose = 'curl'; b.archTo = 0; b.fast = true;
    e = 0;
    while (e < tSpin) {
      const dt = yield;
      e += dt;
      b.spin = turn * G.TAU * E.inOutQuad(Math.min(1, e / tSpin));
      if (Math.random() < dt * 24) K.aura(b.x, FLOOR - off(), BLOOD, 50, 60, 1);
      if (Math.random() < dt * 30) blackFlakes(b.x, FLOOR - off(), 1, 40);
    }
    b.spin = turn * G.TAU;
    yield* wait(0.08);
    // away
    const com = H.add({
      kind: 'ricochet', layer: 'under', x: seg.ax, y: seg.ay, ux: seg.ux, uy: seg.uy, pts: [], ptT: 0, tight: 1, k: 0,
      update(dt) {
        this.srcX = this.x;
        // the ball forms round it as it goes: it draws in tight, and the fire takes it
        this.k = Math.min(1, this.k + dt / 0.12);
        this.tight = G.lerp(1, 0.7, E.outCubic(this.k));
        this.ptT -= dt;
        if (this.ptT <= 0) { this.ptT = 1 / 60; this.pts.push({ x: this.x, y: this.y }); if (this.pts.length > 18) this.pts.shift(); }
        if (Math.random() < dt * 40) blackFlakes(this.x, this.y, 1, CR * 0.6);
        if (Math.random() < dt * 30) G.fx.spawn({ kind: 'spark', x: this.x + G.rand(-CR, CR) * 0.7, y: this.y + G.rand(-CR, CR) * 0.7, vx: -this.ux * G.rand(100, 300), vy: -this.uy * G.rand(100, 300), life: G.rand(0.12, 0.25), size: G.rand(1.4, 2.4), color: BLOOD, len: 0.05 });
      },
      hits(P) { return G.circleRect(this.x, this.y, HR, P.box()); },
    });
    b.comet = com;
    const place = () => { b.x = com.x; b.y = com.y + off(); b.rot = 0; };
    G.audio.play('streak');
    G.fx.thud(b.x, FLOOR, 1.0, { noCrack: true, col: BLOOD });
    let k = 0;
    for (;;) {
      const d = seg.len / v;
      let next = null, pause = 0;
      if (!seg.final) {
        // the next line is chosen as this one starts, so it is drawn for as long as this one takes (and never less than minPrev)
        k++;
        next = plan(seg.bx, seg.by, seg.surf, k >= N && seg.surf !== 'floor', k >= N + 3 && seg.surf !== 'floor');
        if (next.len < 1) next.final = true;
        pause = Math.max(0.08, minPrev - d);
        voidLine(next, d + pause, v);
      }
      G.audio.play('whoosh');
      com.ux = seg.ux; com.uy = seg.uy;
      b.face = seg.ux >= 0 ? 1 : -1;
      e = 0;
      while (e < d) {
        const dt = yield;
        e += dt;
        const s = Math.min(seg.len, e * v);
        com.x = seg.ax + seg.ux * s; com.y = seg.ay + seg.uy * s;
        b.spin += dt * 17 * b.face;
        place();
      }
      com.x = seg.bx; com.y = seg.by; place();
      if (seg.final || !next) break;
      bounceFx(seg.bx, seg.by, seg.surf);
      b.sq = 0.22;
      // it bites into what it struck for a moment, still turning, then leaves along the next line
      e = 0;
      while (e < pause) { const dt = yield; e += dt; b.spin += dt * 8 * b.face; }
      seg = next;
    }
    // it comes down with all its weight and the black fire bursts off it
    // (the ball stays drawn while it uncurls, burning off: see below)
    com.dead = true;
    b.x = clampX(com.x, 80);
    G.fx.impact(b.x, FLOOR - 60, 0.07); G.fx.stop(0.06);
    // (a tighter blow than its pounce landing: the ball it came down as, not a body sprawled out)
    K.crush(com.x, FLOOR - 40, 78, 44, 1);
    K.impact(com.x, true);
    G.fx.ripple(com.x, FLOOR - 30, 380, 0.36, 1.1);
    // (and no burning floor after it: the void fire bursts and is gone, so a hero it chased into a
    // corner is not penned there)
    G.fx.scorch(com.x, 120, BLOOD);
    G.audio.play('wolfBounce');
    blackFlakes(b.x, FLOOR - 30, 18, 60);
    G.fx.dust(b.x, FLOOR - 10, 5, { speed: [40, 160], size: [12, 18], up: 60, a: 0.45, color: VOID, jitter: 40 });
    G.fx.burst(b.x, FLOOR - 20, { n: 20, color: BLOOD, speed: [160, 520], angle: -Math.PI / 2, spread: 2.6, life: [0.2, 0.6], size: [1.5, 3.2], kind: 'spark', grav: 800 });
    b.pose = 'land'; b.fast = true; b.exposed = true;
    // it uncurls out of the last turn onto its feet: the spin runs on to the next whole turn and settles
    const s0 = b.spin, s1 = (b.face > 0 ? Math.ceil(s0 / G.TAU) : Math.floor(s0 / G.TAU)) * G.TAU;
    const y0 = b.y, ud = 0.14 + Math.abs(s1 - s0) / 22;
    e = 0;
    while (e < ud) {
      const dt = yield;
      e += dt;
      const q = E.outCubic(Math.min(1, e / ud));
      b.spin = G.lerp(s0, s1, q); b.y = G.lerp(y0, FLOOR, q);
      com.k = 1 - q; com.tight = G.lerp(0.7, 1, q);
      if (com.pts.length) com.pts.shift();
    }
    b.spin = 0; b.y = FLOOR; b.comet = null;
    B.voidKTo = 0; b.fast = false;
    yield* wait(0.42);
    b.exposed = false;
  }

  // Back to rest: each move ends its own way. Out of a landing it pushes itself up and shakes the ash
  // out of its coat; from sitting it drops back onto its forepaws with a thump; after a bite it tosses
  // its head and the jaws click shut; after breathing fire it shakes the smoke out of its muzzle.
  B.recover = function* (name) {
    const b = B.body;
    if (b.y < FLOOR - 1 || b.wall || b.hidden) return;
    b.air = false; b.fast = false;
    const at = b.pose;
    if (at === 'land' || at === 'slam' || at === 'skid') {
      b.pose = 'push';
      yield* wait(0.18);
      b.pose = 'shake'; b.shakeT = 0.4;
      G.fx.burst(b.x, b.y - 70, { n: 10, color: G.pal().boss, speed: [80, 260], life: [0.3, 0.7], size: [1.5, 3], kind: 'spark', grav: 300, jitter: 50 });
      G.fx.dust(b.x, b.y - 50, 3, { speed: [30, 120], size: [8, 14], up: 50, a: 0.3, color: '40,30,26', jitter: 40 });
      yield* wait(0.34);
    } else if (at === 'sit' || at === 'sitMarch') {
      b.pose = 'idle';
      yield* wait(0.26);
      b.pv[1] += 70; b.pv[3] += 40;
      G.audio.play('paw'); G.fx.kick(0, 1.4);
      G.fx.dust(b.x + b.face * 55, FLOOR, 2, { speed: [20, 90], size: [6, 10], up: 20 });
      yield* wait(0.12);
    } else if (at === 'biteLow' || at === 'biteHigh' || at === 'biteLowUp' || at === 'toss') {
      b.pose = 'toss';
      yield* wait(0.12);
      G.audio.play('chomp');
      yield* wait(0.16);
    } else if (at === 'breath') {
      b.pose = 'shake'; b.shakeT = 0.35;
      for (let i = 0; i < 3; i++) {
        const m = mouthAt(b);
        G.fx.dust(m.x, m.y, 2, { speed: [10, 50], size: [6, 11], life: [0.6, 1], up: 70, a: 0.4, color: '36,26,22' });
        yield* wait(0.12);
      }
    } else if (at === 'sweep') {
      b.pose = 'crouch';
      yield* wait(0.16);
    } else {
      b.pose = 'idle';
      yield* wait(0.16);
    }
    b.pose = 'idle';
    yield* wait(0.08);
  };

  B.ATTACKS = {
    breath: atkBreath,
    pounce: atkPounce, frenzy: atkFrenzy, bite: atkBite, sweep: atkSweep, howl: atkHowl, rake: atkRake,
    wallrun: atkWallrun, emberfall: atkEmberfall,
    pack: atkPack, ricochet: atkRicochet, // (corrupted only)
  };

  // ------------------------------------------------------------------ scenes
  // Its entrance: the arena is dark, and two eyes open in it. Then it drops out of the dark onto the
  // floor, fire runs out from its paws to both walls, and its mane catches.
  B.enter = function* () {
    const b = B.body;
    b.x = 900; b.y = FLOOR; b.face = -1; b.lf = -1; b.tf = 1; b.pose = 'idle'; b.p = POSES.idle.slice();
    b.hidden = true; b.fire = 0; b.fireTo = 0;
    B.flat = 1; B.flatTo = 1;
    B.eyes = { x: 1080, y: FLOOR - 120, a: 0 };
    yield* tween(B.eyes, { a: 1 }, 0.35, E.outQuad);
    G.audio.play('snarl');
    yield* wait(0.55);
    yield* tween(B.eyes, { a: 0 }, 0.12);
    B.eyes = null;
    // out of the dark
    b.hidden = false; b.pose = 'dive'; b.y = -200; b.x = 900; b.trail = true; b.rot = -0.5;
    G.audio.play('whoosh');
    yield* tween(b, { y: FLOOR }, 0.22, E.inQuad);
    b.rot = 0; b.trail = false;
    G.fx.impact(b.x, FLOOR - 60, 0.08);
    K.impact(b.x, true);
    G.fx.ripple(b.x, FLOOR - 40, 460, 0.5, 1.2);
    G.audio.play('ignite');
    fireRun(b.x - 60, -1, 1500); fireRun(b.x + 60, 1, 1500);
    b.pose = 'land'; b.fireTo = 1; b.fire = 0.6; B.flatTo = 0;
    G.fx.burst(b.x, b.y - 80, { n: 30, color: G.pal().boss, speed: [100, 460], life: [0.3, 0.9], size: [2, 4], kind: 'spark', grav: 300 });
    yield* wait(0.5);
    b.pose = 'snarl';
    yield* wait(0.3);
  };

  // Phase II, Wildfire: driven back, its fire gutters to smoke; then it sits up and howls, the howl
  // sets the floor alight from wall to wall, and it bursts into a bigger blaze. The trees come up
  // burning, and from here whatever it lands on catches.
  // Phase III, Emberbed: it goes down and its fire goes out altogether. Dark. Its heart beats twice,
  // the floor cracks open into embers under the whole arena, and it gets up burning white.
  B.phaseIn = function* (n) {
    const b = B.body;
    b.rot = 0; b.wall = 0; b.roll = 0; b.air = false; b.trail = false;
    if (b.y < FLOOR) { b.pose = 'dive'; yield* tween(b, { y: FLOOR }, 0.25, E.inQuad); G.fx.thud(b.x, FLOOR, 1.2); }
    b.y = FLOOR;
    if (n === 2) {
      b.pose = 'skid'; b.fast = true;
      const away = -(G.sign(G.player.x - b.x) || b.face);
      yield* tween(b, { x: clampX(b.x + away * 90, 150) }, 0.3, E.outCubic);
      b.fast = false; b.pose = 'shake'; b.shakeT = 0.5; b.fireTo = 0.15;
      G.audio.setIntensity(0);
      G.fx.dust(b.x, b.y - 70, 6, { speed: [10, 60], size: [12, 20], life: [1, 1.6], up: 120, a: 0.4, color: '30,22,20', jitter: 50 });
      yield* wait(0.9);
      b.pose = 'sit';
      yield* wait(0.4);
      G.audio.play('howl');
      const m = mouthAt(b);
      G.fx.ripple(m.x, m.y, 420, 0.7, 1.2);
      yield* wait(0.45);
      // the floor takes the howl
      G.audio.play('ignite'); G.fx.shake(14);
      fireRun(b.x - 50, -1, 1300); fireRun(b.x + 50, 1, 1300);
      b.fireTo = 1; b.fire = 1;
      yield* tween(B, { mane: 1.55 }, 0.35, E.outBack);
      G.fx.burst(b.x, b.y - 90, { n: 40, color: G.PAL[2].boss, speed: [120, 600], life: [0.3, 0.9], size: [2, 4.5], kind: 'spark', grav: 200 });
      let e = 0;
      while (e < 0.5) { const dt = yield; e += dt; K.aura(b.x, b.y - 20, G.PAL[2].boss, 90, 140, 3); }
    } else {
      b.pose = 'land'; b.fireTo = 0.0;
      G.audio.setIntensity(0);
      B.flatTo = 0.72;
      yield* wait(0.5);
      b.pose = 'lie';
      yield* wait(0.6);
      for (let i = 0; i < 2; i++) {
        G.audio.play('heart'); G.fx.ripple(b.x, b.y - 60, 260 + i * 140, 0.5, 0.9 + i * 0.4); G.fx.kick(0, 2 + i * 2);
        yield* wait(0.55);
      }
      // the floor burns down to embers, cracking out from under it
      G.audio.play('flareUp');
      B.embersOn = true;
      let e = 0, ck = 0;
      while (e < 1.2) {
        const dt = yield;
        e += dt; ck -= dt;
        B.embers = Math.min(1, e / 1.2);
        if (ck <= 0) {
          ck = 0.07;
          const d = (e / 1.2) * 640;
          for (const s of [-1, 1]) { const x = b.x + s * d; if (x > WL && x < WR) G.fx.crack(x, 1.2, EMBER); }
          G.fx.shake(4);
        }
      }
      B.embers = 1;
    }
  };
  B.phaseOut = function* (n) {
    const b = B.body;
    if (n === 2) {
      // the trees catch
      b.pose = 'snarl';
      G.audio.play('ignite');
      yield* tween(B, { treeFire: 1 }, 0.6, E.outQuad);
      yield* wait(0.5);
    } else {
      // up, burning white, and bigger for it
      b.roll = 0; b.pose = 'rearHigh'; b.fast = false;
      yield* wait(0.3);
      G.audio.play('roar'); G.audio.play('ignite');
      b.fireTo = 1; b.fire = 1; B.gloomTo = 0; B.flatTo = 0; B.flat = 0.3;
      G.fx.impact(b.x, b.y - 90, 0.08);
      G.fx.burst(b.x, b.y - 100, { n: 50, color: G.PAL[3].boss, speed: [150, 700], life: [0.3, 1], size: [2, 4.5], kind: 'spark', grav: 200 });
      yield* tween(B, { mane: 1.9, size: 1.2 }, 0.4, E.outBack);
      b.pose = 'slam'; b.fast = true;
      yield* wait(0.12);
      K.impact(b.x + b.face * 110, true);
      // the embers flare once, to show what they do
      B.flareVis = 1;
      G.audio.play('flareUp');
      yield* wait(0.9);
      b.fast = false;
      B.ft = 0;
    }
    b.pose = 'idle';
  };

  // It prowls at a distance, closing in when the hero is far.
  B.idle = function (dt) {
    const b = B.body, P = G.player;
    if (b.y < FLOOR) b.y = Math.min(FLOOR, b.y + 900 * dt);
    facePlayer();
    const d = Math.abs(P.x - b.x);
    if (d > 300) { b.x = clampX(b.x + b.face * [0, 150, 175, 200][B.phase] * dt, 80); b.pose = 'walk'; }
    else b.pose = d < 170 ? 'snarl' : 'idle';
  };

  B.tick = function (dt) {
    const b = B.body, P = G.player;
    // turning round: the body narrows to nothing and opens out the other way
    if (b.face !== b.lf) { b.tf = -b.tf; b.lf = b.face; }
    b.tf = G.damp(b.tf, 1, b.tfRate || 9, dt);
    b.vx = (b.x - b.lx) / Math.max(dt, 1e-4); b.vy = (b.y - b.ly) / Math.max(dt, 1e-4); b.lx = b.x; b.ly = b.y;
    // pose
    if (b.pose === 'walk') b.walkT += dt * 7;
    else if (b.pose === 'run') b.walkT += dt * 15;
    if ((b.pose === 'walk' || b.pose === 'run') && !b.wall) {
      const sn = Math.floor(b.walkT / Math.PI);
      if (sn !== b.stepN) {
        b.stepN = sn;
        if (b.y >= FLOOR - 1 && !b.hidden) {
          G.audio.play('paw');
          G.fx.dust(b.x + b.face * 50, FLOOR, 2, { speed: [20, 90], size: [5, 9], up: 20, a: 0.32 });
          if (b.pose === 'run') G.fx.shake(1.4);
        }
      }
    }
    let target = b.pose === 'walk' ? walkPose(b.walkT) : b.pose === 'run' ? runPose(b.walkT) : (POSES[b.pose] || POSES.idle);
    if (b.shakeT > 0 || b.flick || b.roll > 2) {
      target = target.slice();
      if (b.shakeT > 0) { b.shakeT -= dt; target[12] += Math.sin(B.t * 42) * 0.28 * Math.min(1, b.shakeT * 4); target[16] = 0.6 + 0.4 * Math.sin(B.t * 42); }
      if (b.flick) target[15] += Math.sin(B.t * 16) * 0.35; // the tail curls and flicks: two sweeps coming
      if (b.roll > 2) {
        // on its back, its legs paddle at the air
        const k = Math.sin(B.t * 13);
        target[5] += k * 8; target[7] -= k * 8; target[9] -= k * 8; target[11] += k * 8;
        target[4] += k * 6; target[8] -= k * 6;
      }
    }
    const loco = b.pose === 'walk' || b.pose === 'run';
    const w0 = loco ? 40 : b.fast ? 40 : 13, z = b.fast ? 0.62 : 0.82;
    for (let i = 0; i < NP; i++) {
      let w = w0;
      if (i === 1 || i === 3) w *= target[i] > b.p[i] + 0.5 ? 1.3 : 0.86; // what drops, drops faster
      b.pv[i] += ((target[i] - b.p[i]) * w * w - 2 * z * w * b.pv[i]) * dt;
      b.p[i] += b.pv[i] * dt;
    }
    b.fire = G.damp(b.fire, b.fireTo, b.fireTo > b.fire ? 3 : 5, dt);
    if (b.pose !== 'inhale') b.throat = Math.max(0, b.throat - dt * 3);
    B.gloom = G.damp(B.gloom, B.gloomTo, 3.5, dt);
    B.flat = G.damp(B.flat, B.flatTo, 2.5, dt);
    B.flareVis = Math.max(0, B.flareVis - dt * 1.2);
    // (corrupted) its fire going black and coming back, its spine arching, the cracks it leaves fading
    B.voidK = G.damp(B.voidK, B.voidKTo, B.voidKTo > B.voidK ? 4 : 3, dt);
    b.arch = G.damp(b.arch, b.archTo, 9, dt);
    // cut short out of the dark or out of a turn (a stagger), it comes forward and rights itself, quickly
    if (b.back > 0 && B.attackName !== 'pack') { b.back = G.damp(b.back, 0, 9, dt); if (b.back < 0.01) b.back = 0; }
    if (b.spin && !b.comet && B.attackName !== 'ricochet') {
      const to = Math.round(b.spin / G.TAU) * G.TAU;
      b.spin = G.damp(b.spin, to, 12, dt);
      if (Math.abs(b.spin - to) < 0.01) b.spin = 0;
    }
    for (const s of B.scars) s.t += dt;
    B.scars = B.scars.filter((s) => s.t < 1.4);
    if (!B.dead && !b.hidden && B.voidK > 0.05 && Math.random() < dt * 24 * B.voidK) {
      const c = centre(b), sc = 1 - 0.42 * b.back;
      blackFlakes(c.x, c.y - 30 * sc, 1, 60 * sc);
      if (Math.random() < 0.25) G.fx.spawn({ kind: 'spark', x: c.x + G.rand(-60, 60) * sc, y: c.y - G.rand(0, 50) * sc, vx: G.rand(-40, 40), vy: -G.rand(60, 180), life: G.rand(0.2, 0.4), size: G.rand(1.2, 2.2), color: BLOOD, len: 0.05 });
    }
    // afterimages and streaks when it moves fast
    for (const g of B.ghosts) g.a -= dt * 3.5;
    B.ghosts = B.ghosts.filter((g) => g.a > 0);
    if (b.trail && !b.hidden && !B.dead) {
      B.ghostT -= dt;
      if (B.ghostT <= 0) { B.ghostT = 0.035; B.ghosts.push({ x: b.x, y: b.y, face: b.face, tf: b.tf, rot: b.rot, roll: 0, p: b.p.slice(), a: 1, fire: 0 }); }
      const c = centre(b), sp = Math.hypot(b.vx, b.vy);
      if (sp > 300) {
        for (let i = 0; i < 3; i++) G.fx.spawn({ kind: 'spark', x: c.x + G.rand(-60, 60), y: c.y + G.rand(-40, 40), vx: -b.vx * 0.35, vy: -b.vy * 0.35, life: G.rand(0.12, 0.22), size: G.rand(1.4, 2.4), color: G.pal().boss, len: 0.06, drag: 2 });
      }
    }
    // embers off its coat
    if (!B.dead && !b.hidden && Math.random() < 0.7 * b.fire * (1 - B.voidK)) {
      const c = centre(b);
      G.fx.spawn({ x: c.x + G.rand(-70, 70), y: c.y - G.rand(0, 60), vx: G.rand(-20, 20) - b.face * 20, vy: -G.rand(40, 130), life: G.rand(0.4, 1.0), size: G.rand(1.2, 3), color: G.pal().boss, kind: 'glow', wob: 50 });
    }
    if (!B.dead && !b.hidden && b.fire < 0.4 && Math.random() < dt * 6) {
      const c = centre(b);
      G.fx.dust(c.x + G.rand(-50, 50), c.y - 20, 1, { speed: [5, 30], size: [10, 18], life: [0.9, 1.5], up: 100, a: 0.32, color: '34,26,24' });
    }
    tickEmbers(dt);
    // its body in flight hurts (b.air: a leap, a dive, the flat run across; never on the ground)
    if (b.air && !b.hidden && G.canHurt()) {
      const c = centre(b);
      if (G.rectsOverlap(P.box(), { cx: c.x + b.face * 14, cy: c.y, hw: 68 * B.size, hh: 32 * B.size })) P.tryHit(1, b.x, b);
    }
  };

  // ------------------------------------------------------------------ the ember bed (phase III)
  // Every few seconds the embers flare from wall to wall. They brighten and roar first. Scorched stone,
  // the ledges and the air above are safe; the floor is not. A stagger smothers them for its length.
  const FL_PERIOD = () => (K.gentle() ? 7.2 : 6.0), FL_BURN = 1.0, FL_WARN = 1.4;
  function tickEmbers(dt) {
    if (!B.embersOn) { B.flaring = false; B.warnK = 0; return; }
    // (they hold their breath for its Emberfall, and for its corrupted pack and comet: one set piece at a time)
    const held = B.attackName === 'emberfall' || B.attackName === 'pack' || B.attackName === 'ricochet';
    const live = B.phase === 3 && B.active && !B.invuln && !B.dying && !B.dead && !B.staggered && !held && G.state === 'fight';
    const per = FL_PERIOD(), on = per - FL_BURN;
    const was = B.flaring, wasWarn = B.ft >= on - FL_WARN;
    if (live) {
      B.ft += dt;
      if (B.ft >= per) B.ft -= per;
    }
    B.flaring = live && B.ft >= on;
    const warn = live && B.ft >= on - FL_WARN && B.ft < on;
    B.warnK = G.damp(B.warnK, warn ? (B.ft - (on - FL_WARN)) / FL_WARN : 0, 10, dt);
    if (live && warn && !wasWarn) G.audio.play('flareUp');
    if (B.flaring && !was) { G.audio.play('ignite'); G.fx.shake(6); G.fx.kick(0, 2); if (G.arena.gust) G.arena.gust(640, FLOOR, 1.2); }
    if (B.flaring) {
      for (const [l, r] of STRETCHES) if (Math.random() < dt * 30 * (r - l) / 300) G.fx.spawn({ kind: 'spark', x: G.rand(l, r), y: FLOOR - 4, vx: G.rand(-60, 60), vy: -G.rand(200, 460), life: G.rand(0.3, 0.6), size: G.rand(1.5, 3), color: HOTEMBER, grav: 500 });
    }
    // the floor's own hazards, put back whenever something cleared them
    if (live && !H.list.some((h) => h.kind === 'embers')) {
      for (const [l, r] of STRETCHES) {
        H.add({
          kind: 'embers', layer: 'under', l, r, x: (l + r) / 2, popVy: -680,
          update() { this.srcX = G.clamp(G.player.x, this.l, this.r); },
          hits(P) { return B.flaring && P.y > FLOOR - 44 && P.x > this.l - 6 && P.x < this.r + 6; },
          danger(P) {
            if (P.y < FLOOR - 60) return null;
            const per2 = FL_PERIOD(), on2 = per2 - FL_BURN, until = B.ft >= on2 ? 0 : on2 - B.ft;
            if (until > 1.6) return null;
            return [this.x, (this.r - this.l) / 2 + 16, until];
          },
        });
      }
    }
  }

  // ------------------------------------------------------------------ drawing
  B.drawGround = function (ctx) {
    const b = B.body, pal = G.pal();
    if (B.dead) { drawEmberBed(ctx, pal); return; }
    drawKnoll(ctx, pal);
    // the burnt trees of the second phase stand under their platforms
    drawTrees(ctx, pal);
    drawEmberBed(ctx, pal);
    if (!b.hidden && b.back > 0.02) {
      // far back in the dark: a small shadow under its own feet
      const s = 1 - 0.42 * b.back, fy = FLOOR - BACKY * b.back;
      ctx.fillStyle = 'rgba(0,0,0,' + (0.45 * s) + ')';
      ctx.beginPath(); ctx.ellipse(b.x, Math.max(b.y, fy) + 3 * s, 110 * s * B.size * G.clamp(1 - (fy - b.y) / 300, 0.3, 1), 9 * s, 0, 0, G.TAU); ctx.fill();
    } else if (!b.hidden) {
      const c = centre(b), k = G.clamp(1 - (FLOOR - c.y - 56) / 420, 0.2, 1);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.5 * k) + ')';
      ctx.beginPath(); ctx.ellipse(c.x, FLOOR + 3, 110 * k * B.size, 10 * k, 0, 0, G.TAU); ctx.fill();
      // its own fire lights the floor under it
      if (b.fire > 0.05) { ctx.globalCompositeOperation = 'lighter'; D.glow(ctx, pal.boss, c.x, FLOOR, 150 * k, 0.16 * b.fire); ctx.globalCompositeOperation = 'source-over'; }
    }
  };
  // A low crag of rock at the back of the forest, in the gap between the trees: where its corrupted
  // self stands to howl up the pack. It stands in the same haze as the rest of the far ground.
  function drawKnoll(ctx, pal) {
    const F = FLOOR, K2 = KNOLL;
    ctx.fillStyle = '#0b0706';
    ctx.beginPath(); ctx.moveTo(436, F + 2);
    ctx.bezierCurveTo(466, F - 16, 478, F - K2 + 6, 512, F - K2 + 1);
    ctx.lineTo(560, F - K2 - 2); ctx.lineTo(604, F - K2 - 4); ctx.lineTo(652, F - K2 - 2); ctx.lineTo(706, F - K2 - 3); ctx.lineTo(770, F - K2 + 1);
    ctx.bezierCurveTo(806, F - K2 + 6, 818, F - 16, 846, F + 2); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(0, F - K2 - 4, 0, F + 2);
    g.addColorStop(0, G.rgba(pal.rim, 0.02)); g.addColorStop(1, G.rgba(pal.rim, 0.2));
    ctx.fillStyle = g; ctx.fill();
    // its lit top, and a few dark seams down its face
    ctx.strokeStyle = G.rgba(pal.rim, 0.4); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(478, F - K2 + 8); ctx.quadraticCurveTo(490, F - K2 + 2, 512, F - K2 + 1);
    ctx.lineTo(560, F - K2 - 2); ctx.lineTo(604, F - K2 - 4); ctx.lineTo(652, F - K2 - 2); ctx.lineTo(706, F - K2 - 3); ctx.lineTo(770, F - K2 + 1); ctx.quadraticCurveTo(792, F - K2 + 2, 806, F - K2 + 9); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.2;
    for (const [sx, l] of [[540, 26], [618, 18], [700, 30], [752, 16]]) D.line(ctx, sx, F - K2 + 2, sx + 6, F - K2 + l);
  }
  const TREE_X = new Set(G.arena.LAYOUTS.wolf[2].map((q) => q[0])); // the platforms that are trees
  function drawTrees(ctx, pal) {
    for (const p of G.arena.platforms) {
      if (p.rise <= 0 || !TREE_X.has(p.x)) continue;
      const cx = p.x + p.w / 2, top = p.y + 18;
      // a charred trunk, split and still glowing in its cracks
      ctx.fillStyle = '#0a0605';
      ctx.beginPath();
      ctx.moveTo(cx - 46, FLOOR + 4); ctx.quadraticCurveTo(cx - 22, FLOOR - 8, cx - 18, FLOOR - 40);
      ctx.quadraticCurveTo(cx - 13, (FLOOR + top) / 2, cx - 16, top);
      ctx.lineTo(cx + 14, top); ctx.quadraticCurveTo(cx + 15, (FLOOR + top) / 2, cx + 20, FLOOR - 40);
      ctx.quadraticCurveTo(cx + 24, FLOOR - 6, cx + 48, FLOOR + 4);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0a0605'; ctx.lineCap = 'round';
      ctx.lineWidth = 12; D.line(ctx, cx - 4, top + 8, p.x - 10, p.y + 2);
      ctx.lineWidth = 11; D.line(ctx, cx + 4, top + 6, p.x + p.w + 12, p.y + 4);
      ctx.lineWidth = 7; D.line(ctx, cx - 8, (FLOOR + top) / 2, cx - 46, (FLOOR + top) / 2 - 34);
      ctx.lineWidth = 5; D.line(ctx, cx + 8, (FLOOR + top) / 2 + 30, cx + 38, (FLOOR + top) / 2 + 6);
      ctx.lineCap = 'butt';
      const f = B.treeFire;
      ctx.strokeStyle = G.rgba(pal.boss, 0.25 + 0.4 * f); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(cx - 3, FLOOR - 4); ctx.lineTo(cx + 2, (FLOOR + top) * 0.5 + 20); ctx.lineTo(cx - 2, (FLOOR + top) * 0.5 - 10); ctx.lineTo(cx + 3, top + 10); ctx.stroke();
      if (f > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        D.glow(ctx, pal.boss, cx, top, 60, 0.25 * f);
        ctx.globalCompositeOperation = 'source-over';
        if (Math.random() < 0.3 * f) G.fx.spawn({ x: p.x + G.rand(0, p.w), y: p.y - 2, vx: G.rand(-15, 15), vy: -G.rand(40, 120), life: G.rand(0.4, 0.9), size: G.rand(1.2, 2.6), color: pal.boss, wob: 50 });
      }
    }
  }
  function drawEmberBed(ctx, pal) {
    const k = B.embers;
    if (k <= 0.01) return;
    const t = G.t, warn = B.warnK, vis = Math.max(B.flaring ? 1 : 0, B.flareVis);
    // the floor itself has burnt through: the slab glows from inside, and the heat stands over it
    ctx.globalCompositeOperation = 'lighter';
    const breathe = 0.85 + 0.15 * Math.sin(t * 1.7);
    for (const [l, r] of STRETCHES) {
      let g = ctx.createLinearGradient(0, FLOOR - 40, 0, FLOOR);
      g.addColorStop(0, G.rgba(EMBER, 0)); g.addColorStop(1, G.rgba(EMBER, (0.14 + 0.24 * warn + 0.2 * vis) * k));
      ctx.fillStyle = g; ctx.fillRect(l, FLOOR - 40, r - l, 40);
      g = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 46);
      g.addColorStop(0, G.rgba(HOTEMBER, (0.42 + 0.3 * warn) * k * breathe)); g.addColorStop(0.15, G.rgba(EMBER, (0.42 + 0.3 * warn) * k * breathe)); g.addColorStop(1, G.rgba(EMBER, 0));
      ctx.fillStyle = g; ctx.fillRect(l, FLOOR, r - l, 46);
    }
    // embers breathing in the floor
    for (const s of B.specks) {
      if (ISLES.some(([l, r]) => s.x > l - 4 && s.x < r + 4)) continue;
      const a = (0.4 + 0.4 * Math.sin(t * 2.4 + s.ph) + 0.6 * warn) * k;
      ctx.fillStyle = G.rgba(a > 0.85 ? HOTEMBER : EMBER, Math.min(1, a));
      ctx.fillRect(s.x, s.y, s.s * 1.6, s.s * 0.7);
    }
    ctx.globalCompositeOperation = 'source-over';
    // licks of flame as it gathers, and the flare itself
    const fh = 8 * warn + 50 * vis;
    if (fh > 1) for (const [l, r] of STRETCHES) flames(ctx, l, r, fh, Math.min(1, 0.35 + warn * 0.5 + vis) * k, l * 0.03, pal, EMBER);
    // the scorched stones: dark, cooled, with a cold rim
    for (const [l, r] of ISLES) {
      ctx.fillStyle = '#0b0807';
      ctx.beginPath(); ctx.moveTo(l - 2, FLOOR + 40); ctx.lineTo(l - 6, FLOOR + 6); ctx.lineTo(l + 8, FLOOR - 5); ctx.lineTo(l + 40, FLOOR - 7); ctx.lineTo(r - 30, FLOOR - 6); ctx.lineTo(r - 6, FLOOR - 4); ctx.lineTo(r + 6, FLOOR + 6); ctx.lineTo(r + 2, FLOOR + 40); ctx.closePath();
      ctx.globalAlpha = k; ctx.fill();
      ctx.strokeStyle = G.rgba(pal.rim, 0.4); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(l + 8, FLOOR - 5); ctx.lineTo(l + 40, FLOOR - 7); ctx.lineTo(r - 30, FLOOR - 6); ctx.lineTo(r - 6, FLOOR - 4); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
      D.line(ctx, l + 30, FLOOR - 6, l + 36, FLOOR + 2); D.line(ctx, r - 44, FLOOR - 6, r - 52, FLOOR + 2);
      ctx.globalAlpha = 1;
    }
  }

  B.draw = function (ctx) {
    if (B.dead) return;
    const b = B.body;
    for (const g of B.ghosts) drawWolf(ctx, g, 0.3 * g.a, true);
    if (b.comet) drawCometTrail(ctx, b.comet);
    if (b.hidden) return;
    if (b.back > 0.01 || b.spin) {
      ctx.save();
      if (b.back > 0.01) {
        // far back in the dark: smaller, and the dark takes the colour out of it
        const s = 1 - 0.42 * b.back, f = ctx.filter && ctx.filter !== 'none' ? ctx.filter + ' ' : '';
        ctx.translate(b.x, b.y); ctx.scale(s, s); ctx.translate(-b.x, -b.y);
        ctx.filter = f + 'brightness(' + (1 - 0.5 * b.back).toFixed(3) + ')';
      }
      if (b.spin) {
        // turning about its middle; as a comet, drawn in tight inside its ball of black fire
        const c = centre(b), s = b.comet ? b.comet.tight : 1;
        if (b.comet) drawCometCore(ctx, b.comet);
        ctx.translate(c.x, c.y); ctx.rotate(b.spin); ctx.scale(s, s); ctx.translate(-c.x, -c.y);
      }
      drawWolf(ctx, b, 1, false);
      ctx.restore();
    } else drawWolf(ctx, b, 1, false);
    if (b.comet) drawCometFire(ctx, b.comet);
    // (corrupted) its pack, in front of it where it stands at the back of the arena
    for (const h of H.list) if (h.kind === 'voidwolf' && !h.dead) h.paint(ctx);
  };
  // (corrupted) the comet's tail: a ribbon of black fire back along the way it came, thinning to nothing
  function drawCometTrail(ctx, com) {
    const pts = com.pts, n = pts.length;
    if (n < 2) return;
    const up = [], dn = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)];
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 1, q = (i + 1) / n;
      const r = CR * 0.85 * Math.pow(q, 0.8) * (1 + 0.12 * Math.sin(G.t * 40 + i * 1.7));
      up.push([p.x - dy / d * r, p.y + dx / d * r]); dn.push([p.x + dy / d * r, p.y - dx / d * r]);
    }
    ctx.fillStyle = G.rgba(VOID, 0.92);
    ctx.beginPath(); ctx.moveTo(up[0][0], up[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(up[i][0], up[i][1]);
    ctx.lineTo(com.x, com.y);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(dn[i][0], dn[i][1]);
    ctx.closePath(); ctx.fill();
  }
  // its core: a ball of solid black for the body to turn in
  function drawCometCore(ctx, com) {
    ctx.fillStyle = G.rgba(VOID, com.k);
    ctx.beginPath(); ctx.arc(com.x, com.y, CR * (0.6 + 0.32 * com.k), 0, G.TAU); ctx.fill();
  }
  // the black flame round it, the tongues longest streaming back off its line
  function drawCometFire(ctx, com) {
    const back = Math.atan2(-com.uy, -com.ux);
    VOIDK = 1;
    for (let i = 0; i < 16; i++) {
      const u = i / 16, a = back + (u - 0.5) * G.TAU + Math.sin(G.t * 9 + i) * 0.12;
      const tail = Math.pow(Math.max(0, Math.cos(a - back)), 2);
      tongue(ctx, com.x + Math.cos(a) * CR * 0.6, com.y + Math.sin(a) * CR * 0.6, a + (back - a) * 0.25 * (1 - tail), (18 + 46 * tail) * com.k, 22, BLOOD, VHOT, com.k, i);
    }
    VOIDK = 0;
    ctx.globalCompositeOperation = 'lighter';
    D.glow(ctx, BLOOD, com.x, com.y, CR * 1.5, 0.22 * com.k);
    ctx.strokeStyle = G.rgba(BLOOD, 0.38 * com.k); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(com.x, com.y, CR * (0.95 + 0.04 * Math.sin(G.t * 30)), 0, G.TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  // Over the arena (under the hero): the burnt branches over the second phase's platforms, the
  // basalt of the third's, and the dark that falls when it hangs on the wall or leaps out of sight.
  B.drawOver = function (ctx) {
    const b = B.body, pal = G.pal();
    if (!B.dead) {
      for (const p of G.arena.platforms) {
        if (p.rise <= 0.05) continue;
        if (TREE_X.has(p.x)) {
          // a burnt bough along the platform
          // (over the slab: the crown of a broken tree, thick at the trunk, thin at the ends)
          ctx.fillStyle = '#0c0706';
          ctx.beginPath();
          ctx.moveTo(p.x - 8, p.y + 1); ctx.quadraticCurveTo(p.x + p.w * 0.5, p.y - 5, p.x + p.w + 10, p.y + 2);
          ctx.quadraticCurveTo(p.x + p.w - 6, p.y + 14, p.x + p.w / 2 + 16, p.y + 34);
          ctx.lineTo(p.x + p.w / 2 - 16, p.y + 34);
          ctx.quadraticCurveTo(p.x + 6, p.y + 14, p.x - 8, p.y + 1); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = G.rgba(pal.boss, 0.45 + 0.3 * B.treeFire); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(p.x - 4, p.y + 1); ctx.quadraticCurveTo(p.x + p.w * 0.5, p.y - 5, p.x + p.w + 6, p.y + 2); ctx.stroke();
          // dead branches standing up off the bough, and a stub snapped short
          ctx.strokeStyle = '#0c0706'; ctx.lineCap = 'round';
          for (const [bx, len, lean, wd] of [[0.08, 46, -0.5, 6], [0.3, 30, 0.2, 4], [0.86, 54, 0.45, 6], [0.62, 22, -0.1, 4]]) {
            const x0 = p.x + p.w * bx, y0 = p.y - 1, x1 = x0 + Math.sin(lean) * len, y1 = y0 - Math.cos(lean) * len;
            ctx.lineWidth = wd; D.line(ctx, x0, y0, x1, y1);
            ctx.lineWidth = wd * 0.5; D.line(ctx, G.lerp(x0, x1, 0.6), G.lerp(y0, y1, 0.6), G.lerp(x0, x1, 0.6) + len * 0.3 * (lean > 0 ? 1 : -1), G.lerp(y0, y1, 0.6) - len * 0.25);
          }
          ctx.lineCap = 'butt';
          if (B.treeFire > 0.02) {
            for (const ex of [p.x + 4, p.x + p.w - 4]) {
              ctx.save(); ctx.beginPath(); ctx.rect(ex - 20, p.y - 60, 40, 62); ctx.clip();
              ctx.translate(0, p.y - FLOOR);
              flames(ctx, ex - 14, ex + 14, 26, B.treeFire * 0.8, ex, pal);
              ctx.restore();
            }
          }
        } else {
          ctx.fillStyle = '#0d0a0a';
          ctx.beginPath(); ctx.moveTo(p.x - 2, p.y); ctx.lineTo(p.x + p.w + 2, p.y); ctx.lineTo(p.x + p.w - 8, p.y + 14); ctx.lineTo(p.x + 8, p.y + 16); ctx.closePath(); ctx.fill();
          ctx.fillStyle = G.rgba(pal.rim, 0.5); ctx.fillRect(p.x, p.y, p.w, 1.5);
        }
      }
    }
    // a dark that closes in on everything but the wolf's own fire
    if (B.gloom > 0.01 || B.flat > 0.01) {
      const c = b.hidden ? { x: 640, y: FLOOR - 200 } : centre(b);
      const L = G.cam.x - 80, T = G.cam.y - 80;
      if (B.flat > 0.01) { ctx.fillStyle = 'rgba(2,1,1,' + 0.86 * B.flat + ')'; ctx.fillRect(L, T, 1440, 880); }
      if (B.gloom > 0.01) {
        const g = ctx.createRadialGradient(c.x, c.y, 90, c.x, c.y, 820);
        g.addColorStop(0, 'rgba(2,1,1,0)'); g.addColorStop(0.45, 'rgba(2,1,1,' + 0.45 * B.gloom + ')'); g.addColorStop(1, 'rgba(2,1,1,' + 0.82 * B.gloom + ')');
        ctx.fillStyle = g; ctx.fillRect(L, T, 1440, 880);
      }
      // the embers burn through the dark
      if (B.embers > 0.01 && B.flat > 0.05) {
        ctx.globalCompositeOperation = 'lighter';
        for (const [l, r] of STRETCHES) {
          const g = ctx.createLinearGradient(0, FLOOR - 16, 0, FLOOR + 30);
          g.addColorStop(0, G.rgba(EMBER, 0)); g.addColorStop(0.35, G.rgba(HOTEMBER, 0.4 * B.embers * B.flat)); g.addColorStop(1, G.rgba(EMBER, 0));
          ctx.fillStyle = g; ctx.fillRect(l, FLOOR - 16, r - l, 46);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // two eyes in the dark (its entrance)
    if (B.eyes && B.eyes.a > 0.01) {
      const e = B.eyes;
      ctx.globalCompositeOperation = 'lighter';
      for (const dx of [-11, 11]) {
        D.glow(ctx, pal.boss, e.x + dx, e.y, 22, 0.8 * e.a);
        ctx.fillStyle = G.rgba(pal.hot, e.a);
        D.poly(ctx, [e.x + dx - 7, e.y - 2, e.x + dx + 6, e.y - 3, e.x + dx + (dx < 0 ? 4 : -4), e.y + 2]); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // (corrupted) cracks in the dark where the comet struck a wall or the sky
    for (const s of B.scars) {
      const k = 1 - s.t / 1.4, a = Math.min(1, s.t * 12) * k * k;
      ctx.save(); ctx.translate(s.x, s.y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = G.rgba(VOID, 0.7 * a); ctx.lineWidth = 5;
      for (const L of s.lines) { ctx.beginPath(); ctx.moveTo(L[0], L[1]); for (let i = 2; i < L.length; i += 2) ctx.lineTo(L[i], L[i + 1]); ctx.stroke(); }
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(BLOOD, 0.7 * a); ctx.lineWidth = 1.4;
      for (const L of s.lines) { ctx.beginPath(); ctx.moveTo(L[0], L[1]); for (let i = 2; i < L.length; i += 2) ctx.lineTo(L[i], L[i + 1]); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
    // (corrupted) eyes opening in the dark at the edges, where the pack comes from
    for (const h of H.list) if (h.kind === 'voidwolf' && !h.dead) h.paintEyes(ctx);
  };

  // The wolf (or, ghost, one of the afterimages it leaves when it moves fast).
  function drawWolf(ctx, w, alpha, ghost) {
    if (alpha <= 0.01) return;
    const p = w.p, pal = G.pal(), S = B.size * (w.sc || 1);
    const real = w === B.body, fire = ghost ? 0 : w.fire * Math.min(1, B.mane);
    // (corrupted) fire gone black: crimson where it was lit, and black flames (see tongue)
    const vk = ghost ? 0 : w.vk != null ? w.vk : real ? B.voidK : 0;
    const col = vk > 0.01 ? mixRgb(pal.boss, BLOOD, vk) : pal.boss, hot = vk > 0.01 ? mixRgb(pal.hot, VHOT, vk) : pal.hot;
    const arch = w.arch || 0; // its spine bowed up (the comet's tell)
    VOIDK = vk;
    const dark = ghost ? '#120806' : '#0a0605', mid = ghost ? '#160a07' : '#150d09', plate = ghost ? '#1a0c08' : '#22150f';
    const jx = w.jit ? G.rand(-w.jit, w.jit) : 0;
    const tfv = w.tf == null ? 1 : w.tf, sx = Math.abs(tfv) < 0.15 ? 0.15 * (tfv < 0 ? -1 : 1) : tfv;
    const [shX, shY, hpX, hpY] = p;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.translate(w.x + (w.kx || 0) + jx, w.y);
    if (w.rot) ctx.rotate(w.rot);
    if (real) K.recoil(ctx, w);
    ctx.scale(w.face * sx * S, S);
    FLIP = !!w.roll && Math.cos(w.roll) < 0;
    if (w.roll) { ctx.translate(0, -54); ctx.scale(1, Math.cos(w.roll)); ctx.translate(0, 54); }
    if (!ghost) D.glow(ctx, col, 0, -70, 170, 0.14 * fire * (1 - vk));

    const mx = (shX + hpX) / 2, my = (shY + hpY) / 2;
    const frontLeg = (fx, fy, near) => {
      const rx = shX - 2, ry = shY + 6, wx = fx + 2, wy = fy - 16;
      const k = D.ik(rx, ry, wx, wy, 44, 42, 1);
      ctx.fillStyle = near ? mid : dark;
      D.limb(ctx, rx, ry, k.jx, k.jy, 34, 19); ctx.fill();
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 19, 12); ctx.fill();
      D.limb(ctx, k.ex, k.ey, fx + 4, fy - 4, 12, 10); ctx.fill();
      // a spur of fur off the back of the elbow
      D.poly(ctx, [k.jx - 4, k.jy - 6, k.jx - 15, k.jy + 6, k.jx + 2, k.jy + 8]); ctx.fill();
      paw(fx, fy, near);
      if (near && !ghost) { ctx.strokeStyle = G.rgba(col, 0.45 * fire + 0.1); ctx.lineWidth = 1.3; D.line(ctx, k.jx + 5, k.jy + 2, k.ex + 3, k.ey); }
    };
    const hindLeg = (fx, fy, near) => {
      const rx = hpX + 2, ry = hpY + 6, hx = fx - 14, hy = fy - 34;
      const k = D.ik(rx, ry, hx, hy, 42, 40, -1);
      ctx.fillStyle = near ? mid : dark;
      D.limb(ctx, rx, ry, k.jx, k.jy, 44, 21); ctx.fill();
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 18, 11); ctx.fill();
      D.limb(ctx, k.ex, k.ey, fx + 2, fy - 4, 11, 9); ctx.fill();
      D.poly(ctx, [k.ex - 2, k.ey - 8, k.ex - 12, k.ey + 2, k.ex + 3, k.ey + 6]); ctx.fill();
      paw(fx, fy, near);
      if (near && !ghost) { ctx.strokeStyle = G.rgba(col, 0.45 * fire + 0.1); ctx.lineWidth = 1.3; D.line(ctx, k.jx - 4, k.jy - 6, k.jx + 6, k.jy + 8); }
    };
    const paw = (fx, fy, near) => {
      ctx.fillStyle = near ? plate : dark;
      D.poly(ctx, [fx - 9, fy, fx - 7, fy - 9, fx + 6, fy - 10, fx + 14, fy - 4, fx + 18, fy]); ctx.fill();
      ctx.fillStyle = near && !ghost ? G.rgba(hot, 0.5 + 0.3 * fire) : '#2a1d18';
      for (const cx2 of [12, 16, 19]) { D.poly(ctx, [fx + cx2 - 3, fy - 2, fx + cx2 + 3, fy - 1, fx + cx2 - 1, fy + 1]); ctx.fill(); }
    };

    // the tail: a heavy brush, burning at the tip
    const tl = p[15], tpts = [], tx0 = hpX - 20, ty0 = hpY - 2;
    let ta = Math.PI + tl, ttx = tx0, tty = ty0;
    tpts.push({ x: ttx, y: tty });
    // (a hanging brush droops towards its tip; a lifted one curls over)
    const droop = tl > 0.3 ? 0.07 : -0.07;
    for (let i = 1; i <= 8; i++) {
      ta += droop + Math.sin(G.t * 2.6 - i * 0.6 + (w.x || 0) * 0.01) * 0.06 * (i / 8);
      ttx += Math.cos(ta) * 12; tty += Math.sin(ta) * 12;
      tpts.push({ x: ttx, y: tty });
    }
    frontLeg(p[6], p[7], false);
    hindLeg(p[10], p[11], false);
    // the brush: thick in the middle, ragged at the end
    {
      const n = tpts.length, up = [], dn = [];
      for (let i = 0; i < n; i++) {
        const a = tpts[Math.max(0, i - 1)], c = tpts[Math.min(n - 1, i + 1)], q = i / (n - 1);
        const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 1;
        // fur: thickest two thirds of the way down, in tufts
        const wd = (7 + 17 * Math.sin(Math.PI * Math.min(1, q * 1.25))) * (i % 2 ? 1.12 : 0.92) * (i === n - 1 ? 0.2 : 1);
        up.push([tpts[i].x - dy / d * wd, tpts[i].y + dx / d * wd]); dn.push([tpts[i].x + dy / d * wd, tpts[i].y - dx / d * wd]);
      }
      ctx.beginPath(); ctx.moveTo(up[0][0], up[0][1]);
      for (let i = 1; i < n; i++) ctx.quadraticCurveTo(up[i - 1][0], up[i - 1][1], (up[i - 1][0] + up[i][0]) / 2, (up[i - 1][1] + up[i][1]) / 2);
      ctx.lineTo(up[n - 1][0], up[n - 1][1]);
      for (let i = n - 1; i >= 0; i--) ctx.lineTo(dn[i][0], dn[i][1]);
      ctx.closePath(); ctx.fillStyle = dark; ctx.fill();
    }
    if (!ghost) { ctx.strokeStyle = G.rgba(col, 0.35 * fire + 0.08); ctx.lineWidth = 1.2; ctx.stroke(); }
    if (fire > 0.03) {
      // the tip burns: flame streaming off the end of the brush, and lifting off it
      const tip = tpts[8], tdir = Math.atan2(tip.y - tpts[6].y, tip.x - tpts[6].x);
      tongue(ctx, tpts[7].x, tpts[7].y, tdir + Math.sin(G.t * 7) * 0.15, 26 * fire, 16, col, hot, fire, 3);
      tongue(ctx, tip.x, tip.y, -Math.PI / 2 - 0.6 + Math.sin(G.t * 6) * 0.25, 22 * fire, 10, col, hot, fire, 5);
    }

    // the body: deep chest, tucked waist, heavy haunch
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.moveTo(hpX - 22, hpY + 2);
    ctx.quadraticCurveTo(hpX - 14, hpY - 18, hpX + 10, hpY - 16);
    ctx.quadraticCurveTo(mx, my - 8 - arch * 40, shX - 16, shY - 18);
    ctx.quadraticCurveTo(shX + 2, shY - 27, shX + 20, shY - 12);
    ctx.quadraticCurveTo(shX + 38, shY + 4, shX + 30, shY + 24);
    ctx.quadraticCurveTo(shX + 22, shY + 42, shX + 4, shY + 41);
    ctx.quadraticCurveTo(mx + 6, my + 30, hpX + 18, hpY + 24);
    ctx.quadraticCurveTo(hpX + 6, hpY + 40, hpX - 14, hpY + 30);
    ctx.quadraticCurveTo(hpX - 26, hpY + 16, hpX - 22, hpY + 2);
    ctx.closePath(); ctx.fill();
    // the lit edge along its back
    if (!ghost) {
      ctx.strokeStyle = G.rgba(col, 0.3 + 0.3 * fire); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(hpX - 14, hpY - 12); ctx.quadraticCurveTo(hpX - 6, hpY - 18, hpX + 10, hpY - 16); ctx.quadraticCurveTo(mx, my - 8 - arch * 40, shX - 16, shY - 18); ctx.quadraticCurveTo(shX + 2, shY - 27, shX + 20, shY - 12); ctx.stroke();
    }
    // shoulder and haunch, darker muscle over the body
    ctx.fillStyle = plate;
    ctx.beginPath(); ctx.ellipse(hpX + 2, hpY + 8, 26, 22, -0.3, 0, G.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(shX + 2, shY + 12, 20, 24, 0.25, 0, G.TAU); ctx.fill();
    // seams of fire in its hide
    if (!ghost) {
      const sa = (0.35 + 0.45 * fire) * (0.85 + 0.15 * Math.sin(G.t * 5));
      ctx.strokeStyle = G.rgba(col, sa); ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(shX - 6, shY - 6); ctx.lineTo(shX + 4, shY + 8); ctx.lineTo(shX - 2, shY + 22);
      for (let i = 0; i < 3; i++) { const rx = G.lerp(shX - 20, hpX + 22, i / 2.5); ctx.moveTo(rx, G.lerp(shY, hpY, i / 3) - 6); ctx.lineTo(rx + 6, G.lerp(shY, hpY, i / 3) + 12); }
      ctx.moveTo(hpX - 8, hpY - 4); ctx.quadraticCurveTo(hpX + 12, hpY + 2, hpX + 10, hpY + 22);
      ctx.stroke();
    }
    frontLeg(p[4], p[5], true);
    hindLeg(p[8], p[9], true);
    // the heart, burning through its chest when it is down: the place to strike
    if (real && (B.staggered || B.toppled || w.roll > 1)) {
      const hk = 0.6 + 0.4 * Math.sin(G.t * 9), hx0 = mx + 14, hy0 = my + 16;
      D.glow(ctx, col, hx0, hy0, 54, 0.75 * hk);
      ctx.strokeStyle = G.rgba(hot, 0.7 * hk); ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (const [dx, dy] of [[-30, -6], [26, -10], [-18, 14], [22, 12]]) { ctx.moveTo(hx0, hy0); ctx.lineTo(hx0 + dx, hy0 + dy); }
      ctx.stroke();
      ctx.fillStyle = G.rgba(hot, 0.9 * hk);
      D.poly(ctx, [hx0, hy0 - 11, hx0 + 7, hy0, hx0, hy0 + 11, hx0 - 7, hy0]); ctx.fill();
    }

    // neck and head
    const na = p[12], nl = p[13];
    const nrx = shX + 18, nry = shY - 8, hx = nrx + Math.cos(na) * nl, hy = nry + Math.sin(na) * nl, hr = na * 0.75;
    ctx.fillStyle = mid;
    D.limb(ctx, nrx - 8, nry + 6, hx, hy, 50, 30); ctx.fill();
    if (real && w.throat > 0.02) D.glow(ctx, col, G.lerp(nrx, hx, 0.5), G.lerp(nry, hy, 0.5) + 8, 40, 0.8 * w.throat);
    // the mane: living fire from the crown along the neck to the middle of the back
    const mane = [];
    const crown = { x: hx + Math.cos(hr) * -6 - Math.sin(hr) * -14, y: hy + Math.sin(hr) * -6 + Math.cos(hr) * -14 };
    const withers = { x: shX - 12, y: shY - 22 }, back = { x: mx, y: my - 10 - arch * 21 };
    for (let i = 0; i <= 16; i++) {
      const q = i / 16;
      const pt = q < 0.45 ? { x: G.lerp(crown.x, withers.x, q / 0.45), y: G.lerp(crown.y, withers.y, q / 0.45) } : { x: G.lerp(withers.x, back.x, (q - 0.45) / 0.55), y: G.lerp(withers.y, back.y, (q - 0.45) / 0.55) };
      mane.push(pt);
    }
    // dark ruff under the flames
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(mane[0].x, mane[0].y + 6);
    for (let i = 0; i < mane.length; i++) { const m = mane[i]; ctx.lineTo(m.x - 6, m.y - 7 - (i % 2) * 5); ctx.lineTo(m.x + 2, m.y + 3); }
    ctx.lineTo(back.x, back.y + 12); ctx.lineTo(shX + 10, shY + 6); ctx.closePath(); ctx.fill();
    if (fire > 0.03) {
      // a soft heat along the ridge, then the tongues: tall over the shoulders, licking backwards
      // (and further back when it runs)
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(col, 0.16 * fire); ctx.lineWidth = 26; ctx.beginPath();
      mane.forEach((m, i) => (i ? ctx.lineTo(m.x, m.y - 8) : ctx.moveTo(m.x, m.y - 8))); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      const run = G.clamp(-(w.vx || 0) * w.face * 0.0005, -0.6, 0.2);
      for (let i = 0; i < mane.length; i++) {
        const m = mane[i], q = i / 16, big = Math.sin(Math.PI * Math.min(1, q * 1.35)) * 0.8 + 0.3, alt = i % 2 ? 0.62 : 1;
        const h = (16 + 30 * big) * alt * fire * (0.72 + 0.28 * Math.sin(G.t * 9 + i * 1.7)) * Math.max(1, B.mane * 0.85);
        const ang = -Math.PI / 2 - 0.75 + Math.sin(G.t * 5 + i) * 0.16 + run;
        tongue(ctx, m.x, m.y, ang, h, 10 + 6 * big, col, hot, fire, i);
      }
    }
    // the head
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(hr); ctx.scale(1.18, 1.18);
    const ears = p[16], jaw = Math.max(0, p[14]);
    // far ear, then the near one, swept back as they pin
    for (const [ox, cc] of [[-8, dark], [0, plate]]) {
      ctx.save(); ctx.translate(ox - 4, -14); ctx.rotate(-ears * 0.65);
      ctx.fillStyle = cc; D.poly(ctx, [-2, 0, -12, -26, 8, -3]); ctx.fill();
      if (!ox && !ghost) { ctx.strokeStyle = G.rgba(col, 0.5); ctx.lineWidth = 1; ctx.stroke(); }
      ctx.restore();
    }
    // lower jaw, open as far as the pose says
    ctx.save(); ctx.translate(-2, 6); ctx.rotate(jaw * 0.6);
    ctx.fillStyle = dark; D.poly(ctx, [0, -1, 44, -1, 40, 5, 18, 8, -2, 6]); ctx.fill();
    ctx.fillStyle = ghost ? '#2a1d18' : G.rgba(hot, 0.9);
    D.poly(ctx, [34, -1, 35.5, -7, 37, -1]); ctx.fill(); D.poly(ctx, [24, -1, 25, -5, 26.5, -1]); ctx.fill();
    ctx.restore();
    if (!ghost && jaw > 0.1) D.glow(ctx, col, 26, 9, 22, 0.55 * jaw * Math.max(0.3, fire));
    // the skull: long and narrow, with a heavy brow
    ctx.fillStyle = mid;
    D.poly(ctx, [-14, -6, -8, -15, 6, -17, 20, -13, 34, -8, 48, -3, 52, 1, 48, 5, 30, 7, 8, 9, -10, 9]); ctx.fill();
    if (!ghost) { ctx.strokeStyle = G.rgba(col, 0.35 + 0.25 * fire); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, -15); ctx.lineTo(6, -17); ctx.lineTo(20, -13); ctx.lineTo(34, -8); ctx.lineTo(48, -3); ctx.stroke(); }
    ctx.fillStyle = ghost ? '#2a1d18' : G.rgba(hot, 0.92);
    D.poly(ctx, [38, 5, 40, 12, 42, 5]); ctx.fill(); D.poly(ctx, [27, 6, 28.5, 11, 30, 6]); ctx.fill();
    // cheek ruff
    ctx.fillStyle = dark;
    D.poly(ctx, [-12, 2, -24, 8, -12, 10, -20, 18, -4, 13, 4, 9]); ctx.fill();
    // a seam along the jaw, the brow and the eye
    if (!ghost) {
      ctx.strokeStyle = G.rgba(col, 0.4 + 0.3 * fire); ctx.lineWidth = 1.2; D.line(ctx, 2, 8, 44, 5);
    }
    ctx.fillStyle = '#050302';
    D.poly(ctx, [6, -15, 26, -11, 24, -7, 9, -9]); ctx.fill();
    D.glow(ctx, col, 18, -7, 16, ghost ? 0.4 : 0.95);
    ctx.fillStyle = G.rgba(hot, ghost ? 0.5 : 1);
    D.poly(ctx, [12, -9, 25, -8.5, 14, -5]); ctx.fill();
    ctx.fillStyle = '#050302'; ctx.beginPath(); ctx.arc(51, 0, 2.6, 0, G.TAU); ctx.fill();
    ctx.restore();

    if (w.flash > 0) D.glow(ctx, '255,255,255', 0, -60, 120, w.flash * 0.28);
    ctx.restore();
    VOIDK = 0;
  }
  // One tongue of flame from (x, y) pointing along ang, h long and wide at the root.
  let FLIP = false; // drawing it on its back: flames still burn upwards
  let VOIDK = 0;    // (corrupted) how far its fire has gone black: the light dies out of it and it burns void, edged in crimson
  function tongue(ctx, x, y, ang, h, wd, col, hot, k, i) {
    if (h < 1) return;
    if (FLIP) ang = -ang;
    const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
    const sway = Math.sin(G.t * 11 + i * 2.3) * h * 0.18;
    const shape = (sc) => {
      const hh = h * sc, ww = wd * sc;
      ctx.beginPath();
      ctx.moveTo(x + nx * ww * 0.5, y + ny * ww * 0.5);
      ctx.quadraticCurveTo(x + c * hh * 0.5 + nx * ww * 0.4, y + s * hh * 0.5 + ny * ww * 0.4, x + c * hh + nx * sway, y + s * hh + ny * sway);
      ctx.quadraticCurveTo(x + c * hh * 0.45 - nx * ww * 0.35, y + s * hh * 0.45 - ny * ww * 0.35, x - nx * ww * 0.5, y - ny * ww * 0.5);
      ctx.closePath();
    };
    const lit = 1 - 0.8 * VOIDK;
    ctx.globalCompositeOperation = 'lighter';
    for (const [cc, sc, al] of [[col, 1, 0.42], [col, 0.62, 0.55], [hot, 0.32, 0.55]]) {
      ctx.fillStyle = G.rgba(cc, al * k * lit);
      shape(sc); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (VOIDK > 0.02) {
      ctx.fillStyle = G.rgba(VOID, 0.9 * VOIDK * k);
      shape(0.88); ctx.fill();
      ctx.strokeStyle = G.rgba(BLOOD, 0.55 * VOIDK * k); ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  G.makeBoss(B);
  // Its body is long and can stand on a wall: the target is wherever the body actually is.
  B.bodyBox = function () {
    const b = B.body, c = centre(b), vert = Math.abs(Math.sin(b.rot)) > 0.7;
    return { cx: c.x, cy: c.y, hw: (vert ? 52 : B.w / 2) * B.size, hh: (vert ? 86 : B.h / 2) * B.size };
  };
  G.BOSS_IDS.push('wolf');
})();
