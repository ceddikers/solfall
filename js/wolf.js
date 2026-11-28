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
    id: 'wolf', name: G.T('THE CINDER WOLF'), short: G.T('The Wolf'), theme: 'wolf',
    sub: G.T('The forest remembers what burned it'), taunt: G.T('it has your scent'),
    blurb: G.T('A burning wolf that reads like a book, if you watch its body'),
    tips: [
      G.T('Watch its haunches. A shallow crouch is a short pounce; when they drop low and the tail lifts, it is coming a long way.'),
      G.T('Head low: it lunges along the floor, so jump or back off. Head high: it snaps at the air, so stay on the ground.'),
      G.T('If its ears stay flat after a bite, a second bite is coming.'),
      G.T('The tail sweep reaches both sides of it. Jump it. A tail that curls before the sweep means two.'),
      G.T('A wolf high on the wall dives on you; a wolf low on the wall flies flat across the arena. Stay on the ground for that one.'),
      G.T('Its breath rakes the floor away from it. The safe place is close to it, or behind it.'),
      G.T('In its last phase the embers flare every few seconds. Stand on scorched stone or a ledge when they brighten.'),
      G.T('Paws spread wide when it rears: the slam throws fire along the floor both ways.'),
    ],
    hudCols: [null, ['#ffaa46', '#ffe4b4'], ['#ff6e2e', '#ffd8b0'], ['#8cc8ff', '#ecf6ff']],
    BASE_HP: 3500, poise0: 420, w: 160, h: 112,
    answer: 'breath',
    antiAir: 'skysnap', // (cast at a hero who rides over its head: see bosskit.js)
    finale: 'emberfall',
    gaps: [0, 1.0, 0.84, 0.7], // (v3.1f: 0.95, 0.78, 0.62; the bot won 15% on Merciless)
    bags: {
      1: ['pounce', 'bite', 'sweep', 'howl', 'rake', 'breath', 'prowl', 'shake', 'harry', 'cinders', 'blaze'],
      2: ['pounce', 'bite', 'sweep', 'howl', 'rake', 'wallrun', 'breath', 'prowl', 'shake', 'harry', 'cinders', 'blaze'],
      3: ['frenzy', 'pounce', 'bite', 'sweep', 'howl', 'rake', 'wallrun', 'breath', 'prowl', 'shake', 'harry', 'cinders', 'blaze'],
    },
    cards: { 2: [G.T('WILDFIRE'), G.T('The forest takes the flame')], 3: [G.T('EMBERBED'), G.T('Nothing left to burn but you')] },
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
      name: G.T('CINDER'), scene: 'pyre', burn: 0,
      sky: ['#050302', '#170905', '#3d1608', '#b4521c'],
      far: '#1c0d07', near: '#100704', pillar: '#080403', rim: '255,150,80',
      floorTop: '#3a2216', floor: '#120a06',
      boss: '255,168,70', hot: '255,232,190', ember: '255,160,80', stars: 0.15,
    },
    {
      name: G.T('WILDFIRE'), scene: 'pyre', burn: 1,
      sky: ['#060101', '#200503', '#5a1206', '#e0601e'],
      far: '#2a0c05', near: '#160603', pillar: '#0a0302', rim: '255,112,52',
      floorTop: '#4a1e10', floor: '#150704',
      boss: '255,112,46', hot: '255,224,176', ember: '255,124,60', stars: 0,
    },
    {
      name: G.T('EMBERBED'), scene: 'pyre', burn: 2,
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
  // a claw dragged back across stone: a rasp over a grind
  AU.define('scrape', () => {
    S().noise({ dur: 0.22, vol: 0.2, type: 'highpass', f0: 1800, f1: 3400, q: 0.8, attack: 0.03 });
    S().noise({ dur: 0.26, vol: 0.18, type: 'lowpass', f0: 380, f1: 160, q: 1.4, attack: 0.02 });
    S().tone({ type: 'sawtooth', f0: 70, f1: 52, dur: 0.22, vol: 0.05 });
  });
  // its burning coat shaken out: the flames beaten through the air in quick flaps
  AU.define('shakeoff', (o) => {
    const n = o.long ? 6 : 4, gap = (o.dur || 0.5) / n;
    for (let i = 0; i < n; i++) S().noise({ dur: gap * 1.3, vol: 0.2 + 0.06 * Math.sin(Math.PI * i / (n - 1)), type: 'lowpass', f0: 1100, f1: 420, q: 0.9, attack: 0.02, delay: i * gap });
    S().noise({ dur: o.dur || 0.5, vol: 0.1, f0: 2200, f1: 1500, q: 0.8, attack: 0.05 });
  });
  // a flung ember coming down: a spit and a hiss
  AU.define('cinder', () => {
    S().noise({ dur: 0.18, vol: 0.22, type: 'highpass', f0: 2600, f1: 1200, q: 0.7 });
    S().tone({ type: 'sine', f0: 140, f1: 60, dur: 0.12, vol: 0.14 });
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

  // a dry, tearing cough that brings up a coal
  AU.define('wolfHack', () => {
    S().noise({ dur: 0.16, vol: 0.34, type: 'lowpass', f0: 1400, f1: 300, q: 1.1, attack: 0.01 });
    S().tone({ type: 'sawtooth', f0: 150, f1: 82, dur: 0.14, vol: 0.12, detune: -12 });
    S().noise({ dur: 0.07, vol: 0.14, type: 'highpass', f0: 2600, delay: 0.02 });
  });
  // a snort through the nostrils: a short blast of breath with a rumble under it
  AU.define('wolfSnort', () => {
    S().noise({ dur: 0.12, vol: 0.26, f0: 900, f1: 420, q: 1.6, attack: 0.01 });
    S().tone({ type: 'sine', f0: 88, f1: 60, dur: 0.12, vol: 0.12 });
  });
  // spent: heavy breaths in and out
  AU.define('wolfPant', (o) => {
    const n = o.n || 3;
    for (let i = 0; i < n; i++) {
      S().noise({ dur: 0.18, vol: 0.16, f0: 700, f1: 1300, q: 1.2, attack: 0.08, delay: i * 0.36 });
      S().noise({ dur: 0.16, vol: 0.13, f0: 1100, f1: 500, q: 1.2, attack: 0.02, delay: i * 0.36 + 0.18 });
    }
  });
  // its jaws torn up out of the floor: stone ripping, and a grunt
  AU.define('wolfTear', () => {
    S().noise({ dur: 0.3, vol: 0.32, type: 'lowpass', f0: 600, f1: 160, q: 1.4, attack: 0.02 });
    S().noise({ dur: 0.14, vol: 0.2, type: 'highpass', f0: 1800, f1: 900 });
    S().tone({ type: 'sawtooth', f0: 110, f1: 70, dur: 0.24, vol: 0.1, detune: 8 });
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
    sitMarch: [48, -104, -40, -48, 50, 0, 34, 0, -14, 0, -2, 0, -0.62, 50, 0.85, -0.95, 1],
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
    // (the prowl) slung low and long, head level with its back, ears flat, tail straight out and low
    stalk: [52, -76, -50, -80, 68, 0, 46, 0, -36, 0, -60, 0, 0.3, 46, 0.12, -0.3, 0.9],
    // (the shake) its stance set wide, its head down
    brace: [48, -90, -54, -88, 72, 0, 50, 0, -44, 0, -68, 0, 0.18, 44, 0.08, -0.25, 0.4],
    // (corrupted) the pack: its muzzle down to the floor, haunches up, ears flat
    lowHead: [50, -78, -50, -98, 74, 0, 54, 0, -38, 0, -62, 0, 1.0, 46, 0.35, -0.3, 1],
    // the comet: a crouch with the legs gathered under it (the spine arches through b.arch), tail curled over
    arch: [34, -70, -34, -68, 62, 0, 46, 0, -24, 0, -46, 0, 0.75, 40, 0.1, 0.95, 1],
    // curled into a ball: legs tucked, head down under the chest, tail wrapped over
    // (centred on its middle, b.y - 56 * size, which is what it turns about)
    curl: [22, -64, -26, -60, 34, -26, 24, -22, -4, -24, -18, -28, 1.45, 30, 0.0, 1.5, 1],
    // (the harry's last bound) head driven down into the floor, haunches up behind it
    buried: [62, -64, -42, -100, 108, 0, 92, 0, -24, 0, -48, 0, 1.2, 50, 0.25, 0.55, 1],
    // spent: head low, jaws hanging open, flanks going
    pant: [46, -88, -52, -86, 66, 0, 46, 0, -38, 0, -62, 0, 0.36, 44, 0.6, -0.4, 0.35],

    // ---- the in-betweens (v2.5c animation pass): more stages inside the same timings
    // (a leap's poses share the spine of 'leap' and 'dive', so its body hurts where it always did: see
    // spineHits; only the legs, head and tail change between them)
    // the first beat of a spring: its weight rocks back off its forepaws and the head dips
    gather: [40, -86, -54, -84, 66, 0, 46, 0, -40, 0, -64, 0, 0.25, 42, 0.1, -0.2, 0.6],
    // (short pounce) weight forward over the forepaws, shoulders low, head low and level, tail out flat
    spring: [52, -76, -48, -80, 74, 0, 54, 0, -34, 0, -58, 0, 0.28, 46, 0.2, -0.05, 0.85],
    // (long pounce) the haunches down on the floor, the chest up, the head lifted to sight the arc, tail high
    haunch: [42, -84, -34, -50, 82, 0, 64, 0, -22, 0, -42, 0, -0.22, 40, 0.2, 0.8, 1],
    // off the floor: hind legs driven out straight behind, forepaws folded up under the chest
    launch: [58, -94, -58, -92, 96, -48, 82, -40, -132, -22, -120, -12, -0.12, 48, 0.4, 0.0, 1],
    // the top of a long arc: all four legs gathered under it, tail swinging up behind
    tuck: [57, -93, -57, -94, 84, -40, 70, -34, -82, -44, -70, -38, 0.05, 46, 0.5, 0.45, 1],
    // coming in to land: forelegs reaching down for the floor, hind legs trailing, head down to them
    reach: [56, -92, -56, -96, 100, 4, 84, 10, -108, -56, -96, -46, 0.32, 48, 0.6, 0.5, 1],
    // a long landing taken low: everything compressed, the head driven on past the chest
    landDeep: [52, -62, -46, -66, 78, 0, 60, 0, -26, 0, -50, 0, 0.42, 42, 0.2, -0.3, 0.8],
    // (the flat run across the arena) stretched out like a thrown spear
    streak: [58, -94, -58, -92, 124, -30, 110, -22, -128, -40, -116, -30, 0.0, 50, 0.3, 0.0, 1],
    // (bite, low) the sight: head thrust out low and level at you, ears pricked, jaws shut
    biteAim: [52, -84, -50, -86, 68, 0, 48, 0, -36, 0, -60, 0, 0.5, 46, 0.0, -0.2, 0.2],
    // (bite, high) down on all fours first, head dropped, before it rises
    biteSink: [44, -78, -50, -80, 66, 0, 46, 0, -38, 0, -62, 0, 0.3, 42, 0.1, -0.3, 0.8],
    // (bite, high) after the snap: the forepaws back on the floor, the head carried down after it
    biteDrop: [54, -92, -48, -82, 84, 0, 66, 0, -30, 0, -52, 0, 0.2, 50, 0.1, 0.0, 0.9],
    // (sweep) its weight thrown onto the forelegs, head low, the hind paws light under it
    sweepLoad: [60, -80, -44, -92, 72, 0, 52, 0, -50, -4, -76, 0, 0.3, 42, 0.15, 0.3, 0.5],
    // (howl) the hindquarters going down under it, the forelegs still straight
    sitDown: [46, -100, -44, -62, 52, 0, 36, 0, -18, 0, -8, 0, -0.4, 44, 0.1, -0.6, 0.3],
    // (rake) the dip before it rears: shoulders down, head down, hind legs set
    rakeDip: [52, -76, -44, -80, 72, 0, 52, 0, -30, 0, -54, 0, 0.35, 42, 0.2, -0.2, 0.7],
    // (rake) the instant the forepaws are driven in: lower than the slam, head bowed past it
    slamDeep: [74, -62, -44, -84, 124, 0, 108, 0, -22, 0, -48, 0, 0.5, 50, 0.5, 0.6, 1],
    // (breath) the breath begun standing tall: head coming up, ears up, chest swelling
    breathDraw: [46, -98, -52, -90, 62, 0, 42, 0, -38, 0, -62, 0, -0.45, 44, 0, -0.3, 0.2],
    // (cinders, tossed) head and shoulders as in 'inhale' (where the coals come from is unchanged), but
    // stiff-legged with the rump hitched high, the tail clamped between its legs and the ears flat
    hackUp: [42, -102, -46, -98, 62, 0, 44, 0, -30, 0, -52, 0, -0.78, 42, 0.12, -0.85, 1],
    // (harry) a bull's stance: shoulders up, head down low, ears pricked forward, tail up stiff
    lowerHead: [56, -94, -48, -86, 70, 0, 50, 0, -36, 0, -60, 0, 0.3, 44, 0.0, 0.4, 0.0],
    // (harry, the last bound) reared back to dive: chest high, forepaws light, head up, jaws gaping
    plungeUp: [40, -90, -36, -52, 78, -10, 60, -6, -22, 0, -42, 0, -0.55, 44, 0.7, 0.4, 1],
    // (harry, the last bound) falling head first: the spine of 'dive', the head driven down, jaws wide
    plungeDive: [56, -92, -56, -96, 104, -6, 90, 4, -100, -62, -90, -50, 0.9, 52, 0.9, 0.5, 1],
    // (blaze) sinking level onto all four legs, head up and ears pricked at the rock above it
    sink: [44, -80, -46, -72, 64, 0, 46, 0, -36, 0, -58, 0, -0.75, 44, 0.1, 0.2, 0.0],
  };
  // (A staged wind-up switches b.pose at fractions of its hold: the springs below do the easing between
  // them, so each stage is a key pose and the moves between are the in-betweens.)
  const NP = 17;
  // how quickly each part follows its pose (JW) and how much it swings past (JZ, below 1 swings more):
  // spine, legs, neck angle and length, jaw, tail, ears
  const JW = [1, 1, 1, 1, 1.12, 1.12, 1.12, 1.12, 1.12, 1.12, 1.12, 1.12, 0.74, 0.8, 1.3, 0.56, 0.6];
  const JZ = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.82, 0.9, 1, 0.68, 0.62];

  // Planted paws. On the ground, a paw stays where it was set down while the body moves over it
  // (the legs bend and stretch), and steps, with a little lift, when it is stretched too far or the
  // stance wants it somewhere new. A pair never steps both at once. When the body drives forward fast
  // (a lunge) the forepaws reach freely and the hind paws push off, then catch up; backwards, the
  // other way round. In the air, on a wall, on its back, or walking (the gait plants its own paws),
  // the pose is shown as it is. The result is b.pd, which is what is drawn.
  const STEP_T = 0.13, LIFT = 13;
  function plantFeet(b, dt) {
    const S = B.size, pd = b.pd || (b.pd = b.p.slice());
    // where each paw was last drawn, so a paw let go (into a walk, a leap, a turn) glides to where
    // the pose puts it instead of jumping there in one frame
    const last = b.pdLast || (b.pdLast = b.p.slice());
    const off = b.footOff || (b.footOff = [0, 0, 0, 0, 0, 0, 0, 0]);
    for (let i = 0; i < NP; i++) pd[i] = b.p[i];
    const decay = Math.exp(-22 * dt);
    const finish = () => {
      for (let k = 0; k < 8; k++) { off[k] *= decay; if (Math.abs(off[k]) < 0.05) off[k] = 0; pd[4 + k] += off[k]; last[4 + k] = pd[4 + k]; }
      // standing on the floor, no paw goes through it (a diving pose meeting the ground, for one)
      if (b.y >= FLOOR - 1 && !b.wall && b.roll < 0.3 && !b.hidden) for (let k = 5; k <= 11; k += 2) pd[k] = Math.min(pd[k], 0);
    };
    const release = (k) => { off[k * 2] = last[4 + k * 2] - b.p[4 + k * 2]; off[k * 2 + 1] = last[5 + k * 2] - b.p[5 + k * 2]; };
    const loco = b.pose === 'walk' || b.pose === 'run';
    const grounded = !loco && !b.air && !b.wall && !b.hidden && b.y >= FLOOR - 1 && Math.abs(b.rot) < 0.06 && b.roll < 0.3 && !b.comet && b.back < 0.05 && !(b.spin > 0.01);
    if (!b.feet || b.feetFace !== b.face || !grounded) {
      if (b.feet && b.feetFace === b.face && !b.hidden) for (let k = 0; k < 4; k++) if (b.feet[k]) release(k);
      b.feet = [null, null, null, null]; b.feetFace = b.face; b.feetPose = b.pose;
      finish(); return;
    }
    if (b.feetPose !== b.pose) { b.feetPose = b.pose; b.settle = 0.1; } // a new stance: shuffle into it
    if (b.settle > -1) b.settle -= dt;
    const fwd = b.vx * b.face;
    for (let k = 0; k < 4; k++) {
      const ix = 4 + k * 2, iy = ix + 1, front = k < 2, want = b.p[ix], wy = b.p[iy];
      const free = wy < -3 || (front && fwd > 380) || (!front && fwd < -380);
      if (free) { if (b.feet[k]) release(k); b.feet[k] = null; continue; }
      const f = b.feet[k];
      if (!f) {
        // set it down where it is drawn now, once it has glided home
        if (Math.abs(off[k * 2]) > 3 || Math.abs(off[k * 2 + 1]) > 2) continue;
        const at = want + off[k * 2];
        b.feet[k] = { x: b.x + b.face * at * S, step: 0, from: at };
        off[k * 2] = off[k * 2 + 1] = 0; pd[ix] = at; pd[iy] = Math.min(wy, 0);
        continue;
      }
      off[k * 2] = off[k * 2 + 1] = 0;
      const lx = (f.x - b.x) * b.face / S;
      if (f.step > 0) {
        f.step = Math.min(1, f.step + dt / STEP_T);
        const e = f.step * f.step * (3 - 2 * f.step);
        pd[ix] = G.lerp(f.from, want, e);
        pd[iy] = Math.min(wy, -Math.sin(Math.PI * f.step) * LIFT * Math.min(1, Math.abs(want - f.from) / 20));
        if (f.step >= 1) { f.step = 0; f.x = b.x + b.face * want * S; }
        continue;
      }
      const mate = b.feet[k ^ 1], mateBusy = mate && mate.step > 0;
      const reach = (front ? 30 : 26) * (k % 2 ? 0.8 : 1), gap = Math.abs(lx - want);
      // stretched too far, or settling into a new stance (the far paw a beat after the near one)
      const settling = b.settle != null && b.settle <= (k % 2 ? -0.09 : 0) && b.settle > -0.7 && gap > 5;
      if ((gap > reach || settling) && (!mateBusy || gap > reach * 2)) { f.step = 0.001; f.from = lx; }
      pd[ix] = lx; pd[iy] = 0;
    }
    finish();
  }
  // A trot: the diagonal pairs swing together, the hind paw of each pair a touch ahead of its forepaw
  // (so the feet land in a quick one-two, not as one). The withers dip as a forepaw takes the weight and the
  // hips as a hind paw does; the head nods down a beat after the withers, and the tail swings against
  // the stride, late.
  function walkPose(t) {
    const L = 0.28, p = POSES.idle.slice();
    const leg = (i, base, ph, lift) => { p[i] = base + Math.sin(t + ph) * 22; p[i + 1] = -Math.max(0, Math.cos(t + ph)) * lift; };
    leg(4, 62, 0, 13); leg(10, -62, L, 11);
    leg(6, 40, Math.PI, 13); leg(8, -38, Math.PI + L, 11);
    const fd = Math.abs(Math.sin(t)), hd = Math.abs(Math.sin(t + L));
    p[1] = -94 + fd * 4; p[3] = -90 + hd * 3.5; p[0] = 48 + Math.sin(2 * t) * 1.5;
    p[12] = -0.18 + Math.sin(2 * t - 0.9) * 0.05; p[13] = 44 + Math.sin(2 * t - 0.6) * 1.2;
    p[15] = -0.45 + Math.sin(t - 1.1) * 0.12; p[16] = 0.35;
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
    // (the head rides level against the spine's pitch: it dips as the back stretches, and the tail streams
    // out behind, a beat late)
    p[12] = 0.04 + sn(t - 0.7) * 0.09; p[13] = 46 + cs(t) * 2; p[14] = 0.3 + Math.max(0, sn(t)) * 0.12; p[15] = 0.15 + sn(t - 1.3) * 0.14; p[16] = 1;
    return p;
  }

  // ------------------------------------------------------------------ the living layer (v2.5c)
  // Drawn only: nothing here moves a hit area. Its head is carried on a springy neck (it lags when the body
  // starts, stops or lands, overshoots and settles, and nods against the stride); its tail is a chain of
  // springs that whips through every start, stop, turn and landing; its back flexes and its chest heaves
  // with its gait and its breath. (It used to be drawn as one rigid piece: the user found it robotic.)
  const TN = 8;
  function tailShape(w, out) {
    // the shape the pose asks of the tail: from the root, each joint's angle in its own frame
    const tl = (w.pd || w.p)[15], droop = G.clamp((tl - 0.3) / 0.22, -1, 1) * 0.07;
    let a = Math.PI + tl;
    for (let i = 0; i < TN; i++) {
      if (i) a += droop + Math.sin(G.t * 2.6 - i * 0.6 + (w.x || 0) * 0.01) * 0.06 * (i / TN);
      out[i] = a;
    }
    return out;
  }
  const TAIL_T = new Array(TN);
  function living(b, dt) {
    if (dt <= 0) return;
    const L = b.liv || (b.liv = { hx: 0, hy: 0, hvx: 0, hvy: 0, pvx: 0, pvy: 0, ta: null, tv: new Array(TN).fill(0), flex: 0, fv: 0, nod: 0 });
    // the body's acceleration, in its own frame (forward is the way it faces)
    let ax = (b.vx - L.pvx) / dt, ay = (b.vy - L.pvy) / dt;
    L.pvx = b.vx; L.pvy = b.vy;
    if (b.hidden || Math.abs(ax) > 60000 || Math.abs(ay) > 60000) { ax = 0; ay = 0; } // (a blink or a placement, not a push)
    ax = G.clamp(ax * b.face, -16000, 16000); ay = G.clamp(ay, -16000, 16000);
    const loco = b.pose === 'walk' || b.pose === 'run';
    // the head on its neck: thrown back as the body drives forward, on as it stops, down as it lands
    const gait = loco && !b.air ? Math.sin(2 * b.walkT - 1.1) * (b.pose === 'run' ? 3.5 : 2.2) : 0;
    const tx = G.clamp(-ax * 0.0011, -9, 9), ty = G.clamp(-ay * 0.0011, -8, 10) + gait;
    const hw = 15, hz = 0.42;
    L.hvx += ((tx - L.hx) * hw * hw - 2 * hz * hw * L.hvx) * dt; L.hx += L.hvx * dt;
    L.hvy += ((ty - L.hy) * hw * hw - 2 * hz * hw * L.hvy) * dt; L.hy += L.hvy * dt;
    // the back: it gathers (bows up) as the body slows or lands and stretches flat as it drives, and
    // rides the stride in a walk
    const ft = G.clamp(-ax * 0.00045 - ay * 0.0004, -0.5, 0.8) + (loco ? Math.sin(2 * b.walkT) * (b.pose === 'run' ? 0.35 : 0.12) : 0);
    L.fv += ((ft - L.flex) * 196 - 2 * 0.5 * 14 * L.fv) * dt; L.flex += L.fv * dt;
    // the tail: each joint on its own spring, stiff at the root and loose at the tip, pushed about by
    // the body's starts and stops (a stop throws it up over the back; a landing whips it down)
    const want = tailShape(b, TAIL_T);
    if (!L.ta || b.face !== L.face) { L.ta = want.slice(); L.tv.fill(0); L.face = b.face; }
    for (let i = 0; i < TN; i++) {
      const q = (i + 1) / TN, w = 26 - 15 * q, z = 0.5 - 0.2 * q;
      // (each joint follows the one before it as well as its own rest shape: a wave runs down it)
      const prev = i ? L.ta[i - 1] - want[i - 1] : 0;
      const goal = want[i] + prev * (0.55 + 0.3 * q);
      L.tv[i] += ((goal - L.ta[i]) * w * w - 2 * z * w * L.tv[i]) * dt + (-ax * 0.0025 + ay * 0.002) * q * dt;
      L.ta[i] += L.tv[i] * dt;
    }
  }

  // ------------------------------------------------------------------ state
  B.silWide = () => B.attackName === 'pack' || B.attackName === 'wallrun'; // (v2.9j, corrupt.js: the pack and the wall-run reach across)
  B.silTop = () => 120; // (its leaps)
  B.setup = function () {
    const b = B.body;
    b.x = 900; b.y = FLOOR; b.face = -1; b.lf = -1; b.tf = 1; b.tfRate = 9;
    b.pose = 'idle'; b.p = POSES.idle.slice(); b.pv = new Array(NP).fill(0); b.walkT = 0; b.stepN = 0; b.add = new Array(NP).fill(0);
    b.air = false; b.fast = false; b.rot = 0; b.roll = 0; b.wall = 0; b.trail = false; b.str = 0;
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
    b.strTo = 0;
    b.air = false; b.pose = 'idle'; b.fast = false; b.rot = 0; b.wall = 0; b.trail = false; b.tfRate = 9; b.throat = 0; b.roll = 0;
    b.fireTo = 1; B.gloomTo = 0; B.flatTo = 0;
    b.hurt = false; b.shk = null; b.hackle = 0;
    voidOff();
  };
  B.onInterrupt = function () {
    const b = B.body;
    b.strTo = 0;
    b.air = false; b.trail = false; b.wall = 0; b.rot = 0; b.throat = 0; B.gloomTo = 0; B.flatTo = 0; b.hidden = false;
    b.hurt = false; b.shk = null; b.hackle = 0;
    voidOff();
  };
  B.onStagger = function () {
    const b = B.body;
    b.strTo = 0;
    b.pose = 'belly'; b.air = false; b.wall = 0; b.rot = 0; b.trail = false; b.hidden = false; b.throat = 0;
    b.hurt = false; b.shk = null; b.hackle = 0;
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
  B.staggerWord = G.T('FLOORED'); B.staggerMult = 1.6; B.staggerDur = 0.9;
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
  // A held moment that is still alive: fn(k, dt, e) runs every frame for dur seconds (k from 0 to 1)
  // and adds to the pose through b.add, so a wind-up builds and trembles instead of standing still.
  function* hold(dur, fn) {
    let e = 0;
    while (e < dur) { const dt = yield; e += dt; fn(Math.min(1, e / dur), dt, e); }
  }
  const A = (i, v) => { B.body.add[i] += v; };
  const inQ = (k) => k * k, outQ = (k) => 1 - (1 - k) * (1 - k);
  // A coil gathering in the haunches: the shoulders draw back, the hindquarters sink, the head drops
  // and the ears go flat, deeper as k grows, and in the last part a tremble runs through it and the
  // tail lashes.
  function coil(k, e, deep, lash) {
    const c = inQ(k);
    A(0, -7 * c * deep); A(2, -5 * c * deep); A(1, 5 * c * deep); A(3, 11 * c * deep);
    A(12, 0.14 * c); A(16, 0.35 * c);
    if (k > 0.55) { const q = (k - 0.55) / 0.45; A(3, Math.sin(e * 58) * 1.6 * q); A(1, Math.sin(e * 47) * 1.1 * q); }
    if (lash) A(15, Math.sin(e * 13) * 0.3 * lash * (0.4 + 0.6 * k));
  }
  // Weight arriving: the body squashes and pitches nose-down, then springs back past level (K.recoil).
  function thump(b, sq, pitch) { b.sq = Math.max(b.sq || 0, sq); b.recV = (b.recV || 0) + b.face * pitch * 0.65; }

  // Moving in on the hero: a trot, or a run when it is far off.
  // (It builds up to its speed from whatever it was doing, rather than being at it in one frame;
  // past a fast walk it breaks into a gallop.)
  function* approach(dist, speed, maxT) {
    const b = B.body, P = G.player;
    let e = 0, v = Math.max(0, b.vx * b.face);
    while (e < maxT && Math.abs(P.x - b.x) > dist) {
      const dt = yield;
      e += dt; facePlayer();
      v = Math.min(speed, v + 4200 * dt);
      b.pose = v > 240 ? 'run' : 'walk';
      b.x = clampX(b.x + b.face * v * dt, 80);
      // it starts to pull up a stride early, so it skids to a stop about where it used to stop dead
      if (Math.abs(P.x - b.x) < dist + v * v / 5200) break;
    }
    // the skid: forepaws braced, weight thrown back, dust off the paws
    if (v > 120) {
      b.pose = 'skid';
      const f = b.face;
      G.fx.dust(b.x + f * 40, FLOOR, 3, { dir: f, speed: [60, 220], size: [6, 11], up: 24, a: 0.36 });
      while (v > 20) {
        const dt = yield;
        v = Math.max(0, v - 2600 * dt);
        b.x = clampX(b.x + f * v * dt, 80);
        A(0, -6); A(12, -0.08);
      }
    }
    facePlayer();
  }

  // A leap along a parabola. It pitches nose-up as it rises and nose-down as it falls.
  // st (a staged leap): off the floor with its hind legs driven out straight ('launch'), stretched out
  // as it rises ('leap'), gathered at the top of a long one ('tuck', st.tuck), falling ('dive', or
  // st.fall), and reaching for the floor at the last ('reach', or st.last). The path is the same.
  function* arc(x1, y1, dur, apex, onAir, st) {
    const b = B.body, x0 = b.x, y0 = b.y;
    if (Math.abs(x1 - x0) > 10) b.face = x1 > x0 ? 1 : -1;
    b.sq = Math.max(b.sq || 0, 0.1); // (thrown long off its hind legs)
    let e = 0, py = y0;
    if (st) b.pose = st.rise || 'launch';
    while (e < dur) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / dur);
      b.x = G.lerp(x0, x1, k);
      const y = G.lerp(y0, y1, k) - 4 * apex * k * (1 - k), vy = (y - py) / Math.max(dt, 1e-4);
      py = y; b.y = y;
      b.rot = b.face * G.clamp(vy / 1900, -0.42, 0.5);
      if (st) {
        b.pose = k < 0.16 ? (st.rise || 'launch') : (st.tuck && k > 0.36 && k < 0.6) ? 'tuck' : vy <= 0 ? 'leap' : k > 0.8 ? (st.last || 'reach') : (st.fall || 'dive');
        // the body drawn out long as it goes up, a little long as it comes down, bunched at the top
        b.strTo = b.pose === 'launch' || b.pose === 'leap' ? 0.07 : b.pose === 'tuck' ? -0.04 : 0.035;
        // the tail follows the arc a beat behind: trailing low as it rises, flung up as it drops
        A(15, G.clamp(-vy / 2600, -0.3, 0.4));
      } else if (vy > 0 && b.pose === 'leap') b.pose = 'dive';
      if (onAir) onAir(k, dt);
    }
    b.x = x1; b.y = y1; b.rot = 0; b.strTo = 0;
  }
  // The weight of a landing taken through the body after it, over e seconds: the forepaws take it first
  // and the hind paws come down a beat later, the head goes on down past the chest and comes back, and
  // the tail whips down and up. (big: a long fall)
  function landFollow(e, big) {
    const s = big ? 1.3 : 1;
    const hind = Math.max(0, 1 - e / (big ? 0.09 : 0.06));
    A(9, -16 * hind * s); A(11, -13 * hind * s);
    A(12, 0.22 * s * Math.sin(Math.PI * Math.min(1, e / 0.3)));
    A(15, 0.55 * s * Math.sin(e * 15) * Math.exp(-e * 6));
    A(16, 0.3 * Math.exp(-e * 5));
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
    const life = (K.gentle() ? 3.4 : 4.4) * (G.twist() ? 1.5 : 1); // (v3.0c: Ascension +3, its own way: G.twist()) its fire burns half again as long
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
      hits(P) {
        if (!this.lit || this.ending || this.t < this.ign + 0.05) return false;
        const up = Math.min(1, (this.t - this.ign) / 0.12); // (the flames stand up over a tenth of a second: v2.1b)
        return P.y > FLOOR - Math.max(10, 30 * up) && Math.abs(P.x - this.x) < this.cw / 2 - 8;
      },
      danger(P) { if (this.ending || P.y < FLOOR - 60) return null; return [this.x, this.w / 2 + 16, this.ign - this.t]; },
      draw(ctx) {
        // (catching, it flares up over a tenth of a second rather than standing up whole in one frame)
        const up = this.lit ? Math.min(1, (this.t - this.ign) / 0.12) : 0;
        const k = this.ending ? Math.max(0, 1 - (this.t - this.endT) / 0.45) : this.lit ? 0.35 + 0.65 * up : 0.35 * (this.t / this.ign);
        flames(ctx, this.x - this.cw / 2, this.x + this.cw / 2, 12 + 28 * (this.ending ? 1 : up), k, this.x * 0.01, G.pal());
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
  // The held pounce (not in a Frenzy): from the start of the crouch its tail is clamped down low and
  // still instead of lashing, and its fire sinks low; at the bottom of the crouch it holds, quite still, well past the
  // moment it would have gone, and only then does the glint come and the fire flare back. A dodge on
  // the usual beat lands in front of it.
  function* pounce(long, chain) {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    // Its stages: first its weight rocks back and the head dips ('gather': both pounces share only this
    // beat), then the load. Short: the weight forward over its forepaws, shoulders and head low, the tail
    // out flat ('spring'). Long: the haunches right down on the floor, the chest up, the head lifted to
    // sight the arc and the tail raised high and lashing ('haunch'). In a frenzy it skips the first beat.
    const peak = long ? 'haunch' : 'spring';
    b.fast = false; b.pose = chain ? peak : 'gather';
    const tele = (long ? 0.72 : 0.46) * T * (chain ? 0.78 : 1);
    const delay = !chain && K.chance(B.phase === 1 ? 0.25 : 0.35, 'delay'), deep = long ? 1.25 : 0.8;
    if (delay) b.fireTo = 0.45;
    G.audio.play('snarl');
    let glinted = false;
    const glint = () => { glinted = true; G.fx.glint(b.x + b.face * 78, FLOOR - 10, long ? 30 : 22, G.pal().hot); G.audio.play('glint'); };
    const g0 = chain ? 0 : long ? 0.26 : 0.3;
    // (the tail clamped down low and held there, not lashing: a raised tail is the long pounce's tell)
    const clamp = long ? -0.8 : -0.42;
    yield* hold(tele, (k, dt, e) => {
      if (e < tele - 0.18 || delay) facePlayer();
      b.pose = k < g0 ? 'gather' : peak;
      const q = g0 ? Math.max(0, (k - g0) / (1 - g0)) : k;
      // the dip of the first beat: a nod of the head down and back up
      if (k < g0) { const d = Math.sin(Math.PI * k / g0); A(12, 0.12 * d); A(1, 3 * d); }
      coil(q, e, deep, delay ? 0 : long ? 1 : 0.5);
      if (!delay) pushOff(e, tele, peak, long);
      // the long one: the head comes up to sight where it will land as the haunches settle
      if (long) A(12, -0.14 * outQ(q));
      if (delay) A(15, clamp * outQ(Math.min(1, k * 1.5)));
      if (Math.random() < dt * (long ? 26 : 12)) G.fx.dust(b.x - b.face * 46, FLOOR, 1, { dir: -b.face, speed: [40, 200], size: [5, 10], life: [0.3, 0.6], up: 30, a: 0.36 });
      if (!delay && !glinted && e >= tele - 0.2) glint();
    });
    if (delay) {
      // held: no tremble and no lash, only a slow breath let out through the teeth, then it goes
      const hang = (long ? 0.5 : 0.42) * T;
      yield* hold(hang, (k, dt, e) => {
        if (e < hang - 0.18) facePlayer();
        A(0, -7 * deep); A(2, -5 * deep); A(1, 5 * deep + Math.sin(e * 3.2) * 0.9); A(3, 11 * deep); A(12, 0.14 + (long ? -0.14 : 0)); A(16, 0.35); A(15, clamp);
        A(14, 0.06 * Math.sin(Math.PI * k));
        pushOff(e, hang, peak, long);
        if (!glinted && e >= hang - 0.2) { glint(); b.fireTo = 1; }
      });
    }
    const dir = b.face;
    let tx;
    if (long) tx = clampX(P.x + P.vx * 0.16);
    else tx = clampX(b.x + dir * G.clamp(Math.abs(P.x - b.x) + 10, 110, 330));
    const mark = K.columnMark(tx, 240, true); // (not drawn: watch the body)
    b.fast = true; b.pose = 'launch'; b.air = true; b.trail = long;
    G.audio.play('whoosh');
    G.fx.thud(b.x - dir * 40, FLOOR, long ? 0.9 : 0.6, { noCrack: true });
    let slowed = false;
    yield* arc(tx, FLOOR, long ? 0.74 : 0.42, long ? 230 : 80, (k) => {
      // the long one hangs at the top of its arc for a breath before it comes down
      if (long && !slowed && k > 0.46) { slowed = true; G.fx.slow(0.4, 0.14); G.audio.play('streak'); }
    }, { tuck: long });
    mark.dead = true; b.air = false; b.trail = false;
    if (long) G.fx.impact(tx, FLOOR - 60, 0.06);
    landing(tx, long);
    thump(b, long ? 0.24 : 0.15, long ? 3.4 : 2.2);
    // (the long one is taken low first, then it rises into the landing stance)
    b.pose = long && !chain ? 'landDeep' : 'land'; b.fast = false;
    if (long) b.exposed = true;
    // Overshot: the hero went under it or through it and is behind it. Its weight carries it on in a
    // skid, and it comes round slowly, head low: the time to hit it.
    if (!chain && (P.x - b.x) * dir < -40) {
      b.exposed = true; b.pose = 'skid';
      G.audio.play('scrape');
      G.fx.dust(b.x + dir * 40, FLOOR, 4, { dir, speed: [80, 280], size: [7, 13], up: 26, a: 0.42 });
      let v = long ? 520 : 360;
      let se = 0;
      while (v > 25) {
        const dt = yield;
        se += dt;
        v = Math.max(0, v - 1650 * dt);
        b.x = clampX(b.x + dir * v * dt, 90);
        // braced on its forelegs, the head swung down by the stop and the tail flung on over its back
        A(0, -7); A(12, 0.1 + 0.12 * Math.sin(Math.min(Math.PI, se * 9))); A(3, 5); A(15, 0.4 * Math.min(1, se * 5));
        if (Math.random() < dt * 26) G.fx.dust(b.x + dir * 50, FLOOR, 1, { dir, speed: [40, 180], size: [5, 10], up: 18, a: 0.36 });
      }
      thump(b, 0.06, 1.2);
      b.tfRate = 3.2; facePlayer(); b.pose = 'crouch';
      // it comes round slowly, head low, the tail swinging round after it
      yield* hold(0.46, (k, dt, e) => { A(12, 0.22 * (1 - k)); A(16, 0.45 * (1 - k)); A(1, 3 * (1 - k)); A(15, 0.3 * Math.sin(e * 8) * (1 - k)); });
      b.tfRate = 9; b.exposed = false;
      return;
    }
    // it takes its own weight: the forepaws first, then the hind; the haunches give and come back up, the
    // head goes on down past the chest and lifts last, and the tail whips after it
    const lt = long ? 0.55 : chain ? 0.16 : 0.3;
    yield* hold(lt, (k, dt, e) => {
      if (b.pose === 'landDeep' && e > 0.16) b.pose = 'land';
      A(3, 9 * (1 - outQ(k))); A(1, 4 * (1 - outQ(k))); A(12, 0.18 * (1 - k));
      landFollow(e, long);
    });
    b.pose = 'land';
    b.exposed = false;
  }
  // The last beat before it goes: its back settles to where its old crouch put it (it rocks onto its
  // haunches to push off), so its body in the leap hurts where it always did.
  function pushOff(e, end, from, long) {
    const fw = G.clamp((e - (end - 0.13)) / 0.04, 0, 1), to = long ? POSES.crouchDeep : POSES.crouch;
    for (let j = 0; j < 4; j++) A(j, (to[j] - POSES[from][j]) * fw);
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
  // After the second it reads where you are: still in front of it and in reach, it stays low with its
  // ears flat again and snaps a third time, quicker; out of reach or behind it, the head comes up.
  function* atkBite() {
    const b = B.body, P = G.player, T = K.T();
    yield* approach(250, 330, 0.9);
    const high = K.chance(0.45, 'high');
    const twice = !high && B.phase >= 2 && K.chance(0.4, 'twice');
    const inReach = () => (P.x - b.x) * b.face > 0 && Math.abs(P.x - b.x) < 300 && P.y > FLOOR - 110;
    yield* bite(high, T, twice);
    if (twice) {
      yield* wait(0.08);
      let third = false;
      yield* bite(false, T * 0.75, () => (third = inReach()));
      if (third) { yield* wait(0.06); yield* bite(false, T * 0.62, false); }
    }
  }
  function* bite(high, T, more) {
    const b = B.body;
    facePlayer();
    // (a quick bite straight after another keeps the stance it is already in: no sight, no sink)
    const quick = T < K.T() * 0.9;
    b.fast = false; b.pose = high ? (quick ? 'biteHighUp' : 'biteSink') : (quick ? 'biteLowUp' : 'biteAim');
    const f = b.face;
    G.audio.play('snarl');
    if (!high) {
      const tele = 0.56 * T, x1 = clampX(b.x + f * 150, 100);
      H.arc({
        x: x1 + f * 92, y: FLOOR - 36, r: 112, a0: mir(-0.75), a1: mir(0.95), tele, active: 0.12, owner: b,
        onFire() { b.pose = 'biteLow'; G.audio.play('chomp'); G.fx.shake(6); },
      });
      // Low: first the sight, the head thrust out low and level at you, ears pricked ('biteAim'); then it
      // draws back (away from where it will go) onto its haunches, head low and ears going flat, jaws
      // parting; and it holds there trembling, the lips working back off the teeth.
      const s0 = quick ? 0 : 0.3;
      yield* hold(tele - 0.16, (k, dt, e) => {
        b.pose = k < s0 ? 'biteAim' : 'biteLowUp';
        const q = s0 ? Math.max(0, (k - s0) / (1 - s0)) : k;
        if (k < s0) A(13, 3 * Math.sin(Math.PI * k / s0)); // (the neck reaching for the sight)
        coil(q, e, 0.9, 0.3); A(0, -6 * outQ(q)); A(14, 0.12 * q + Math.abs(Math.sin(e * 21)) * 0.05 * q);
        A(15, -0.15 * q); // (tail held low behind it)
      });
      b.fast = true; b.pose = 'biteLow';
      // the head goes first and the body follows it in; the tail streams out behind
      const xs = b.x;
      yield* hold(0.16, (k) => { b.x = G.lerp(xs, x1, E.outCubic(k)); A(13, 10 * Math.sin(Math.PI * Math.min(1, k * 1.4))); A(0, 6 * (1 - k)); A(15, 0.3 * Math.sin(Math.PI * k)); });
      b.x = x1;
      thump(b, 0.07, 1.4);
      G.fx.dust(b.x + f * 40, FLOOR, 3, { dir: f, speed: [60, 240], size: [6, 11], up: 30 });
      // jaws shut on it: a hard sideways shake of the head, tearing, the shoulders shaking with it and
      // the hind end braced back
      yield* hold(0.2, (k, dt, e) => { const s = Math.sin(e * 34) * (1 - k); A(12, s * 0.22); A(0, s * 2.5); A(3, 3 * (1 - k)); A(16, 0.3); A(15, -s * 0.2); });
      // a second is coming: it stays coiled, head low and ears flat. Otherwise the head comes up.
      if (typeof more === 'function' ? more() : more) { b.fast = false; b.pose = 'biteLowUp'; yield* hold(0.1, (k, dt, e) => coil(1, e, 0.7, 0)); }
      else b.pose = 'toss';
    } else {
      const tele = 0.62 * T, x1 = clampX(b.x + f * 60, 100);
      H.arc({
        x: x1 + f * 70, y: FLOOR - 118, r: 150, a0: mir(-2.1), a1: mir(0.55), tele, active: 0.13, owner: b,
        onFire() { b.pose = 'biteHigh'; G.audio.play('chomp'); G.fx.shake(6); },
      });
      // High: first down onto all fours, head dropped ('biteSink': the anticipation goes down before it
      // goes up); then up on its haunches, head cocked back and the forepaws lifting off the floor, rising
      // as the moment comes.
      const s0 = quick ? 0 : 0.24;
      yield* hold(tele - 0.14, (k, dt, e) => {
        b.pose = k < s0 ? 'biteSink' : 'biteHighUp';
        const q = s0 ? Math.max(0, (k - s0) / (1 - s0)) : k, c = inQ(q);
        A(1, -9 * c); A(12, -0.16 * c); A(3, 5 * c); if (q > 0.6) A(1, Math.sin(e * 50) * 1.2 * (q - 0.6) / 0.4); A(15, Math.sin(e * 9) * 0.15);
        // the forepaws come up off the floor and curl, the near one first
        const up = G.clamp((q - 0.35) / 0.5, 0, 1);
        A(5, -16 * outQ(up)); A(7, -10 * outQ(G.clamp(up * 1.3 - 0.3, 0, 1))); A(4, -6 * up);
      });
      b.fast = true; b.pose = 'biteHigh';
      yield* tween(b, { x: x1 }, 0.14, E.outCubic);
      // the snap jerks its head down, then the forepaws come back to earth, the head carried on down
      yield* hold(0.3, (k, dt, e) => {
        if (k > 0.42) b.pose = 'biteDrop';
        A(12, 0.25 * Math.sin(Math.PI * Math.min(1, k * 2.5)));
        if (k > 0.42) landFollow(e - 0.126, false);
      });
      thump(b, 0.08, 1.2);
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
      b.fast = false; b.pose = 'sweepLoad'; b.flick = twice && !i ? 1 : 0;
      const tele = (i ? 0.44 : 0.62) * T;
      tailRing(tele);
      G.audio.play(i ? 'snarl' : 'charge', { dur: tele });
      // its stages: the weight thrown forward onto the forelegs, head low and the hind paws gone light
      // ('sweepLoad'); then the hindquarters hitched up high and the tail cocked over them ('sweepUp'),
      // and a shiver through the haunches at the last
      const s0 = i ? 0.22 : 0.32;
      yield* hold(tele, (k, dt, e) => {
        b.pose = k < s0 ? 'sweepLoad' : 'sweepUp';
        const c = inQ(k);
        A(0, 7 * c); A(1, 7 * c); A(3, -6 * c); A(15, 0.25 * c + Math.sin(e * (twice && !i ? 0 : 11)) * 0.2 * k); A(16, 0.3 * c);
        // the hind paws barely touching as the weight leaves them, then set again to swing
        if (k < s0 + 0.15) { const l = Math.sin(Math.PI * Math.min(1, k / (s0 + 0.15))); A(9, -6 * l); A(11, -5 * l); }
        // the head drops and turns in under the shoulder to see behind it
        A(12, 0.18 * Math.sin(Math.PI * Math.min(1, k * 1.2)));
        if (k > 0.6) A(3, Math.sin(e * 52) * 1.5 * (k - 0.6) / 0.4);
      });
      // round it goes
      b.fast = true; b.pose = 'sweep'; b.tfRate = 26; b.face = -b.face; b.flick = 0;
      G.audio.play('sweep'); G.audio.play('whoosh');
      G.fx.kick(b.face * 4, 0); G.fx.shake(6);
      for (const d of [-1, 1]) for (let k = 0; k < 3; k++) G.fx.dust(b.x + d * (60 + k * 60), FLOOR, 1, { dir: d, speed: [80, 260], size: [6, 11], up: 24, a: 0.4 });
      b.recV = (b.recV || 0) + b.face * 1.6;
      // the hindquarters swing up and round on the forelegs, and land; the head swings against the turn
      // and the tail, which led the sweep, goes on past and comes back
      yield* hold(0.3, (k) => {
        A(3, -16 * Math.sin(Math.PI * Math.min(1, k * 1.5))); A(1, 5 * (1 - k));
        A(15, 0.4 * (1 - k) - 0.55 * Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - k));
        A(12, -0.16 * Math.sin(Math.PI * Math.min(1, k * 2)));
        if (k > 0.6) { const l = (k - 0.6) / 0.4; A(9, -10 * Math.sin(Math.PI * l)); }
      });
      thump(b, 0.08, -1.2);
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
      hits(P) {
        if (this.t < this.tele || this.t >= this.tele + this.active || P.y <= FLOOR - 54) return false;
        // only where the tail has come round to: it starts on its side (from) and sweeps across (v2.1b;
        // it used to strike the whole floor from its first frame)
        // and only where it is drawn now: the last 2.4 of its turn (it leaves the floor behind it clear)
        const span = Math.PI * 2 * E.outCubic(Math.min(1, (this.t - this.tele + 1 / 120) / this.active)), lo = Math.max(0, span - 2.4);
        if (Math.abs(P.x - b.x) >= R) return false;
        const q = (P.x - b.x) * this.from / (R - 10), m = 11 / (R - 10);
        const a0 = Math.acos(G.clamp(q + m, -1, 1)), a1 = Math.acos(G.clamp(q - m, -1, 1)); // near side; the far side is 2 pi less these
        // (the first half of its turn is the near side, drawn low along the floor; the second the far
        // side, drawn higher: a hero just over the near side is clear of it)
        return ((a0 <= span && a1 >= lo) && P.y > FLOOR - 28) || (G.TAU - a1 <= span && G.TAU - a0 >= lo);
      },
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
    b.fast = false; b.pose = 'sitDown';
    // its stages: the hindquarters go down under it while the forelegs stay straight ('sitDown'), then
    // it is sat and the breath before the cry comes: chest filling, head lifting. Straight up to the sky
    // ('sit'); or the muzzle laid forward along the line, ears flat, a forepaw set out ahead and the tail
    // out stiff behind it ('sitMarch').
    yield* hold(0.42 * T, (k) => {
      b.pose = k < 0.34 ? 'sitDown' : march ? 'sitMarch' : 'sit';
      const q = Math.max(0, (k - 0.34) / 0.66), c = E.inOutQuad(q);
      A(1, -5 * c); A(0, -2 * c); A(12, -0.22 * c); A(14, -0.3 * (1 - k));
      // (sitting: a little bounce of the chest as the rump arrives)
      if (k > 0.3 && k < 0.5) A(1, 3 * Math.sin(Math.PI * (k - 0.3) / 0.2));
      if (march) { A(4, 12 * c); A(15, 0.9 * c); }
    });
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
        // (marching: the muzzle follows the line out, a nod for each)
        yield* hold(0.15, (k, dt, t) => { howling(e + t); A(4, 12); A(15, 0.9); A(12, 0.05 * Math.sin(Math.PI * k) + 0.02 * i); });
        e += 0.15;
      }
    } else {
      const n = 3 + B.phase + (K.hard() ? 1 : 0);
      for (let i = 0; i < n; i++) {
        H.meteor({ x: clampX(P.x + P.vx * 0.25 + G.rrand(-30, 30), 50), tele: 0.8 * T, blastR: 56 });
        if (i % 2 === 0) { const mm = mouthAt(b); G.fx.ripple(mm.x, mm.y, 200, 0.4, 0.5); }
        yield* hold(0.34, (k, dt, t) => howling(e + t));
        e += 0.34;
      }
    }
    // the cry runs out: the head sinks and the chest heaves
    yield* hold(0.75 * T, (k, dt, t) => {
      const q = 1 - k; howling(e + t, q); A(12, 0.3 * outQ(k)); A(1, Math.sin(t * 7) * 2.2 * k);
      if (march) { A(4, 12 * q); A(15, 0.9 * q); }
      A(16, -0.3 * Math.sin(Math.PI * k)); // (the ears come up again as it listens to what it called down)
    });
    b.exposed = false;
  }
  // holding the howl: the head thrown up a little further and quivering, the jaw working, ears back
  function howling(t, k) {
    k = k == null ? 1 : k;
    A(12, (-0.24 + Math.sin(t * 31) * 0.035) * k); A(14, (0.08 + Math.sin(t * 4.3) * 0.08) * k); A(1, (-5 + Math.sin(t * 2.2)) * k); A(16, 0.2 * k);
  }

  // Rake: it rears up on its hind legs, twice its height, and brings both forepaws down in front of it.
  // Paws spread wide and the head thrown back: the slam throws fire along the floor both ways.
  function* atkRake() {
    const b = B.body, T = K.T();
    yield* approach(210, 300, 0.8);
    facePlayer();
    const wave = K.chance(B.phase >= 2 ? 0.5 : 0.35, 'wave');
    const top = wave ? 'rearHigh' : 'rear';
    b.fast = false; b.pose = 'rakeDip';
    const tele = (wave ? 0.86 : 0.68) * T;
    G.audio.play('snarl'); G.audio.play('charge', { dur: tele });
    // its stages: a dip, shoulders and head down and the hind legs set ('rakeDip'); up onto its hind legs;
    // and at the top, pawing the air. Plain: the forepaws kept close and boxing in front of its chest.
    // The wave: paws flung out wide and raking big, the head thrown right back.
    let slammed = false;
    const d0 = 0.17, amp = wave ? 13 : 6;
    const rearing = hold(tele + 0.06, (k, dt, e) => {
      if (slammed) return; // (the slam has begun)
      b.pose = k < d0 ? 'rakeDip' : top;
      if (k < d0) { const d = Math.sin(Math.PI * 0.5 * k / d0); A(1, 4 * d); A(3, 3 * d); return; }
      const q = (k - d0) / (1 - d0), up = Math.min(1, q * 2.2), c = inQ(q);
      A(5, Math.sin(e * 10.5) * amp * up); A(7, -Math.sin(e * 10.5 + 0.8) * amp * up); // the forepaws paw at the air
      A(4, Math.cos(e * 10.5) * amp * 0.55 * up); A(6, -Math.cos(e * 10.5 + 0.8) * amp * 0.55 * up);
      if (!wave) { A(4, -8 * up); A(6, 8 * up); } // (boxing: the paws drawn in together)
      A(0, -9 * c + Math.sin(e * 3.1) * 2.5); A(12, (wave ? -0.34 : -0.22) * c); A(15, Math.sin(e * 8) * 0.2 - 0.25 * up);
      if (q > 0.7) A(1, Math.sin(e * 55) * 2 * (q - 0.7) / 0.3);
    });
    H.arc({
      x: b.x + b.face * 24, y: FLOOR - 150, r: 205, a0: mir(-1.95), a1: mir(0.95), tele, active: 0.13, heavy: wave, owner: b,
      follow(h) { if (!h.fired) h.x = b.x + b.face * 24; },
      onFire() { slammed = true; b.fast = true; b.pose = 'slamDeep'; G.audio.play('cleave'); },
    });
    yield* rearing;
    const px = b.x + b.face * 112;
    thump(b, wave ? 0.2 : 0.14, wave ? 3 : 2.2);
    K.crush(px, FLOOR - 34, 70, 34, 1);
    K.impact(px, wave);
    if (wave) {
      const tint = { boss: G.pal().boss, hot: G.pal().hot };
      H.shockwave(px - 40, -1, 520, 50, tint); H.shockwave(px + 40, 1, 520, 50, tint);
      G.fx.impact(px, FLOOR - 50, 0.05);
    }
    blaze(px, 180);
    b.exposed = true;
    // driven in low, the head bowed on past the paws and the tail flung up; then it leans on the forepaws
    // it drove in, shoulders heaving, and draws itself back up
    yield* hold(0.75, (k, dt, e) => {
      if (e > 0.1 && b.pose === 'slamDeep') b.pose = 'slam';
      A(1, 8 * (1 - outQ(k))); A(12, 0.2 * (1 - k)); A(3, Math.sin(e * 6) * 1.5 * (1 - k));
      A(15, 0.5 * Math.sin(e * 12) * Math.exp(-e * 5));
      // the hind paws, lifted by the throw forward, come back down a beat after
      const hind = Math.max(0, 1 - e / 0.1); A(9, -12 * hind); A(11, -10 * hind);
    });
    b.pose = 'slam';
    b.exposed = false;
  }

  // Wall-run (from phase II): it sprints to a wall and runs up it. High on the wall it dives on you;
  // low on the wall it launches flat across the arena over your head and into the far wall.
  function* atkWallrun() {
    const b = B.body, P = G.player, T = K.T();
    const dir = G.sign(b.x - P.x) || 1, wallX = dir > 0 ? WR : WL;
    b.face = dir; b.pose = 'run'; b.trail = true;
    G.audio.play('snarl');
    let sv = Math.max(0, b.vx * dir), re = 0;
    while (Math.abs(wallX - b.x) > 80) {
      const dt = yield;
      re += dt;
      sv = Math.min(860, sv + 7000 * dt); // (it digs in and builds to a sprint)
      b.x += dir * sv * dt;
      // (digging in: head down and ears flat for the first strides, then it lifts its eyes to the wall)
      const dig = Math.max(0, 1 - re / 0.22); A(12, 0.25 * dig - 0.12 * (1 - dig)); A(1, 5 * dig);
      if (Math.random() < dt * 30) G.fx.dust(b.x - dir * 50, FLOOR, 1, { dir: -dir, speed: [60, 240], size: [6, 11], life: [0.3, 0.6], up: 30, a: 0.4 });
    }
    const high = K.chance(0.5, 'high');
    // onto the wall: the world turns a quarter under it
    G.audio.play('paw'); G.fx.shake(4);
    // it springs onto the wall (rather than appearing on it): up and across in the same moment it turns
    b.wall = dir;
    yield* tween(b, { x: wallX, y: FLOOR - 70, rot: -dir * Math.PI / 2 }, 0.1, E.outQuad);
    const top = high ? 150 : FLOOR - 196;
    while (b.y > top) {
      const dt = yield;
      b.y = Math.max(top, b.y - 960 * dt);
      if (Math.random() < dt * 30) G.fx.burst(wallX - dir * 4, b.y + 30, { n: 1, color: '24,16,12', speed: [60, 200], angle: dir > 0 ? Math.PI : 0, spread: 1.2, life: [0.4, 0.8], size: [2, 4], kind: 'chunk', grav: 1400 });
    }
    b.pose = 'wall'; b.trail = false;
    // it hangs there and looks down
    if (high) B.gloomTo = 0.55;
    const holdT = (high ? 0.46 : 0.34) * T;
    G.fx.glint(wallX - dir * 30, b.y - 10, 30, G.pal().hot); G.audio.play('glint');
    // clinging there, it gathers itself against the wall. Its head says which: high, it hangs head down
    // the wall looking down at you, tail hanging; low, it looks flat out across the arena, tail streaming
    // straight back along the wall
    yield* hold(holdT, (k, dt, e) => {
      coil(k, e, 0.9, 0.8);
      const c = outQ(Math.min(1, k * 2));
      // (on the wall its forward is up the wall: a neck turned back over the withers looks out into the
      // arena, flat at about -2.0 in all, and down at the floor at about -2.65)
      if (high) { A(12, -2.89 * c); A(13, 4 * c); A(15, -0.5 * c); }
      else { A(12, -2.24 * c); A(15, 0.5 * c); A(14, 0.15 * c); }
    });
    if (high) {
      // a dive at the hero, from near the top of the screen
      const tx = clampX(P.x + P.vx * 0.15, 100);
      const mark = K.columnMark(tx, 240, true);
      // it kicks off the wall, turning out of the climb as it leaves (not in one frame)
      b.pose = 'dive'; b.air = true; b.trail = true; b.face = -dir;
      G.audio.play('streak'); G.audio.play('whoosh');
      yield* tween(b, { x: wallX - dir * 70, rot: -dir * 0.35 }, 0.08, E.outQuad);
      b.wall = 0;
      // (falling on you head down; the forelegs reach for the floor at the last)
      yield* arc(tx, FLOOR, 0.5, 30, (k) => { b.pose = k > 0.78 ? 'reach' : 'dive'; b.strTo = 0.05; });
      mark.dead = true; b.air = false; b.trail = false; B.gloomTo = 0;
      G.fx.impact(tx, FLOOR - 60, 0.07);
      landing(tx, true, false);
      thump(b, 0.24, 3.2);
      if (B.phase >= 2) { blaze(tx - 110, 160); blaze(tx + 110, 160); }
      b.pose = 'landDeep'; b.exposed = true;
      // taken low, then up into its stance, the weight running on through it
      yield* hold(0.6, (k, dt, e) => { if (e > 0.18) b.pose = 'land'; landFollow(e, true); });
      b.pose = 'land';
      b.exposed = false;
    } else {
      // flat across, at a height that passes over anyone standing
      const far = dir > 0 ? WL + 90 : WR - 90, fy = FLOOR - 92;
      // it kicks off the wall and levels out as it goes, stretched out long like a thrown spear
      b.face = -dir; b.pose = 'launch'; b.air = true; b.trail = true; b.strTo = 0.08;
      G.audio.play('streak'); G.audio.play('whoosh');
      yield* tween(b, { x: wallX - dir * 80, y: fy, rot: 0 }, 0.08, E.outQuad);
      b.wall = 0; b.rot = 0; b.pose = 'streak';
      while ((far - b.x) * -dir > 0) {
        const dt = yield;
        b.x -= dir * 1500 * dt;
        G.fx.shake(2);
        A(15, Math.sin(B.t * 30) * 0.12); // (the tail ripples in the wind of it)
        // (it brings its forepaws up to meet the wall it is about to hit, and ducks its head)
        if (Math.abs(far - b.x) < 170) { A(5, -26); A(7, -20); A(12, 0.3); A(16, 0.2); }
      }
      b.strTo = 0;
      b.x = far; b.air = false; b.trail = false;
      // into the far wall, and down
      G.audio.play('slam'); G.fx.shake(10);
      G.fx.burst(far - dir * 40, fy - 50, { n: 14, color: '24,18,14', speed: [150, 500], angle: dir > 0 ? 0 : Math.PI, spread: 2, life: [0.5, 1], size: [4, 9], kind: 'chunk', grav: 1400 });
      G.fx.dust(far - dir * 60, fy - 50, 5, { dir, speed: [40, 200], size: [8, 14], up: 30 });
      // crumpled against it for an instant, then dropping, legs reaching for the floor
      b.pose = 'tuck'; b.sq = Math.max(b.sq || 0, 0.12);
      const yw = b.y;
      yield* hold(0.24, (k) => { b.y = G.lerp(yw, FLOOR, E.inQuad(k)); if (b.y > fy + 20) b.pose = 'reach'; });
      b.y = FLOOR;
      thump(b, 0.2, -2.4);
      G.fx.thud(b.x, FLOOR, 1.1);
      G.audio.play('boom');
      blaze(b.x, 160);
      b.pose = 'landDeep'; b.exposed = true;
      yield* hold(0.55, (k, dt, e) => { if (e > 0.16) b.pose = 'land'; landFollow(e, true); });
      b.pose = 'land';
      b.exposed = false;
    }
  }

  // Breath (its answer to a hero who keeps away): it draws a long breath, its throat lights through
  // the seams, and it rakes the floor with fire from its feet out to the wall. Close to it, or behind
  // it, the fire passes overhead. It is planted while it breathes, and open to anyone who comes in.
  function* atkBreath() {
    const b = B.body, T = K.T();
    facePlayer();
    b.fast = false; b.pose = 'breathDraw';
    const tele = 0.9 * T;
    G.audio.play('inhale', { dur: tele });
    // its stages: the breath begun standing tall, head coming up and ears up ('breathDraw'); then down
    // on its haunches with the forelegs braced out wide, chest swelling, the head drawn back to throw it
    // ('inhale'); and at the last a shudder, the tail lashing low. (No other move sets its forelegs wide.)
    yield* hold(tele, (k, dt, e) => {
      b.throat = k;
      b.pose = k < 0.3 ? 'breathDraw' : 'inhale';
      const c = E.inOutQuad(k), w = outQ(G.clamp((k - 0.25) / 0.4, 0, 1));
      A(1, -7 * c); A(0, -4 * c); A(3, 4 * c); A(12, -0.2 * c); A(16, 0.3 * c);
      A(3, 7 * w); A(4, 14 * w); A(6, -8 * w); A(8, 6 * w); A(10, -6 * w); A(15, -0.35 * w + Math.sin(e * 9) * 0.15 * w);
      if (k > 0.7) A(1, Math.sin(e * 40) * 1.3 * (k - 0.7) / 0.3);
      const m = mouthAt(b);
      if (Math.random() < dt * 20) G.fx.spawn({ x: m.x, y: m.y, vx: b.face * G.rand(10, 50), vy: -G.rand(30, 90), life: G.rand(0.3, 0.6), size: G.rand(1.5, 3), color: G.pal().hot, wob: 40 });
    });
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
        // (not before it has caught, nor once it is guttering out: v2.1b)
        if (this.t < 0.025 || this.hold > 0.08) return false;
        return G.distPointSeg(P.x, P.y - 22, this.mx, this.my, this.ix, FLOOR - 6) < 22 || (Math.abs(P.x - this.ix) < 36 && P.y > FLOOR - 40);
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
    // it pours it out: pushed back on its legs, shuddering, its head following the fire down the floor
    let be = 0;
    while (!st.dead) {
      const dt = yield;
      be += dt;
      const S = B.size, nx = b.x + f * (b.p[0] + 18) * S, ny = b.y + (b.p[1] - 8) * S;
      const want = Math.atan2(FLOOR - ny, Math.max(40, (st.ix - nx) * f)) * 0.9;
      A(12, G.clamp(want - POSES.breath[12], -0.5, 0.6));
      A(0, -5); A(3, 3); A(1, Math.sin(be * 37) * 1.2);
      // (braced against it: forelegs out wide, the hind end dug in, the tail streaming flat behind)
      A(4, 12); A(6, -6); A(3, 4); A(15, -0.25 + Math.sin(be * 23) * 0.08);
    }
    b.exposed = false;
    blaze(st.end - f * 80, 160);
    // spent: the head sags and the jaws work, smoke still curling out of them, the stance drawn back in
    yield* hold(0.3, (k, dt, e) => { const s = 1 - k; A(4, 12 * s); A(6, -6 * s); A(12, 0.18 * Math.sin(Math.PI * k)); A(14, -0.4 * k); A(15, -0.25 * s); });
  }

  // Prowl: it sinks low and steals in (or backs off, to give itself room) and scrapes the stone with a
  // forepaw. Once: it darts low along the floor straight through you, jaws open (jump it, or dash
  // through). Twice: it darts in and skids up short, springs over your head, lands behind you and
  // turns into a bite (be clear of where it lands, then jump the bite). From the second phase the
  // ground it darts from catches; in the third it stays low after and comes back across, faster.
  function* atkProwl() {
    const b = B.body, P = G.player, T = K.T();
    const feint = K.chance(0.45, 'feint');
    facePlayer();
    b.fast = false; b.pose = 'stalk';
    G.audio.play('snarl');
    yield* hold(0.42 * T, (k, dt, e) => {
      facePlayer();
      const d = Math.abs(P.x - b.x), dir = d > 400 ? 1 : d < (feint ? 300 : 220) ? -1 : 0;
      b.x = clampX(b.x + b.face * dir * 95 * Math.sin(Math.PI * k) * dt, 100);
      // shoulders rolling over its paws, the tail low and twitching at the tip, the head held dead level
      // while the body moves under it (it does not take its eyes off you)
      A(1, Math.sin(e * 8) * 1.6); A(3, -Math.sin(e * 8) * 1.2); A(0, Math.sin(e * 8) * 2);
      A(12, -Math.sin(e * 8) * 0.03);
      A(15, Math.sin(e * 6) * 0.07);
    });
    for (let i = 0; i < (feint ? 2 : 1); i++) yield* scrape();
    let glinted = false;
    // before the dart, the rump wiggles from side to side as the hind paws find their purchase (a cat's
    // tell, and only the prowl has it), and the tip of the tail flicks
    yield* hold(0.2 * T, (k, dt, e) => {
      coil(0.4 + 0.6 * k, e, 0.8, 0.5);
      const wg = Math.sin(Math.PI * Math.min(1, k * 1.15));
      A(3, Math.sin(e * 34) * 3 * wg); A(2, Math.sin(e * 34 + 1.2) * 4 * wg); A(15, Math.sin(e * 34 + 2) * 0.12 * wg);
      if (!glinted && k > 0.3) { glinted = true; const m = mouthAt(b); G.fx.glint(m.x, m.y, 22, G.pal().hot); G.audio.play('glint'); }
    });
    if (!feint) {
      yield* dart(P.x + b.face * (B.phase >= 3 ? 320 : 230), 1);
    } else {
      // in, and pulled up short: the feint
      const f = b.face;
      if (Math.abs(P.x - b.x) - 150 > 60) yield* dart(P.x - f * 150, 0.9, true);
      // a dip, and over
      b.pose = 'crouch'; b.fast = true;
      yield* hold(0.13, (k, dt, e) => coil(0.5 + 0.5 * k, e, 1, 0.4));
      const tx = clampX(P.x + f * 175, 90);
      const mark = K.columnMark(tx, 200, true); // (not drawn: watch the body)
      b.pose = 'launch'; b.air = true; b.trail = true;
      G.audio.play('whoosh');
      G.fx.thud(b.x - f * 40, FLOOR, 0.6, { noCrack: true });
      yield* arc(tx, FLOOR, 0.5, 175, null, { tuck: true });
      mark.dead = true; b.air = false; b.trail = false;
      landing(tx, false);
      thump(b, 0.16, 2.2);
      b.pose = 'land'; b.fast = false;
      yield* hold(0.14, (k, dt, e) => { A(3, 8 * (1 - outQ(k))); A(1, 4 * (1 - outQ(k))); landFollow(e, false); });
      // and round on you, into a bite
      yield* bite(false, T * 0.85, false);
    }
    if (B.phase >= 3) {
      // it does not get up: it stays down low, backs off a step if it is close, gathers itself and comes
      // back across, faster
      facePlayer();
      if (Math.abs(P.x - b.x) < 300) {
        // too close to come at you: a bound backwards, still facing you, to get its room
        const f = b.face, x0 = b.x, x1 = clampX(P.x - f * 330, 100);
        b.pose = 'crouch'; b.fast = true;
        yield* hold(0.1, (k, dt, e) => coil(k, e, 0.7, 0.3));
        b.pose = 'leap'; G.audio.play('paw');
        G.fx.dust(b.x + f * 40, FLOOR, 2, { dir: f, speed: [40, 180], size: [6, 10], up: 22, a: 0.36 });
        yield* hold(0.3, (k) => { b.x = G.lerp(x0, x1, outQ(k)); b.y = FLOOR - 4 * 42 * k * (1 - k); b.rot = -f * 0.12 * Math.sin(Math.PI * k); });
        b.y = FLOOR; b.rot = 0; b.x = x1;
        thump(b, 0.1, -1.2);
        G.audio.play('paw'); G.fx.dust(b.x, FLOOR, 3, { speed: [30, 140], size: [6, 11], up: 22, a: 0.38 });
      }
      b.fast = false; b.pose = 'stalk';
      let glint2 = false;
      yield* hold(0.36 * T, (k, dt, e) => {
        facePlayer();
        coil(k, e, 0.9, 0.7);
        if (!glint2 && k > 0.5) { glint2 = true; const m = mouthAt(b); G.fx.glint(m.x, m.y, 22, G.pal().hot); G.audio.play('glint'); }
      });
      yield* dart(P.x + b.face * 230, 1.15);
    }
  }
  // A forepaw lifted, reached forward and dragged back hard across the stone.
  function* scrape() {
    const b = B.body;
    b.fast = true;
    let raked = false;
    yield* hold(0.34, (k, dt, e) => {
      if (k < 0.35) {
        const q = k / 0.35;
        A(5, -24 * Math.sin(Math.PI * 0.5 * q)); A(4, 24 * outQ(q)); A(12, 0.1 * q); A(0, 3 * q);
      } else {
        const q = (k - 0.35) / 0.65, d = E.inOutQuad(Math.min(1, q * 1.5));
        A(5, G.lerp(-24, -3.6, Math.min(1, q * 4))); A(4, G.lerp(24, -30, d)); A(0, 3 - 6 * d);
        A(1, 4 * Math.sin(Math.PI * q)); A(12, 0.1 + 0.1 * Math.sin(Math.PI * q));
        if (!raked && q > 0.15) {
          raked = true;
          G.audio.play('scrape');
          const fx = b.x + b.face * 60 * B.size;
          G.fx.dust(fx, FLOOR, 3, { dir: -b.face, speed: [60, 220], size: [5, 10], life: [0.3, 0.6], up: 26, a: 0.4 });
          G.fx.burst(fx, FLOOR - 2, { n: 5, color: G.pal().hot, speed: [80, 240], angle: b.face > 0 ? Math.PI + 0.3 : -0.3, spread: 0.8, life: [0.15, 0.35], size: [1.2, 2.2], kind: 'spark', grav: 900 });
        }
      }
      A(16, 0.2); A(15, Math.sin(e * 10) * 0.08);
    });
    b.fast = false;
  }
  // A dart low along the floor to xEnd: it bursts off its hind legs, runs flat out, and skids out of
  // it on braced forepaws. Its body hurts while it is moving fast. short: the feint (no bite in it).
  function* dart(xEnd, mul, short) {
    const b = B.body, P = G.player, x0 = b.x;
    xEnd = clampX(xEnd, 110);
    const dir = G.sign(xEnd - x0) || b.face, total = Math.abs(xEnd - x0);
    if (total < 40) return;
    b.face = dir;
    const vmax = 1250 * mul, skid = Math.min(short ? 150 : 180, total * (short ? 0.5 : 0.32));
    const run = total - skid, dur = run / (0.9 * vmax), acc = vmax * vmax / (2 * skid), va = 1 / 0.9;
    b.pose = 'run'; b.fast = true; b.air = true; b.hurt = true; b.trail = true;
    b.sq = Math.max(b.sq || 0, 0.1);
    G.audio.play('whoosh');
    G.fx.thud(x0 - dir * 40, FLOOR, 0.6, { noCrack: true });
    G.fx.dust(x0 - dir * 50, FLOOR, 4, { dir: -dir, speed: [80, 300], size: [6, 12], life: [0.3, 0.6], up: 30, a: 0.4 });
    let snapped = !!short;
    yield* hold(dur, (k) => {
      // (up to speed in the first fifth, then flat out)
      const f = k < 0.2 ? (va / 0.4) * k * k : 0.1 * va + va * (k - 0.2);
      b.x = x0 + dir * run * f;
      if (!snapped && (P.x - b.x) * dir < 40) { snapped = true; G.audio.play('chomp'); }
      // slung low, head out in front, jaws open until they shut on the pass
      A(12, 0.36); A(14, snapped && !short ? 0.05 : 0.6); A(1, 10); A(3, 7); A(16, 0.7); A(15, -0.2);
    });
    b.x = x0 + dir * run; b.pose = 'skid';
    G.audio.play('scrape');
    G.fx.dust(b.x + dir * 40, FLOOR, 4, { dir, speed: [80, 280], size: [7, 13], up: 26, a: 0.42 });
    let v = vmax, se = 0;
    while (v > 25) {
      const dt = yield;
      se += dt;
      v = Math.max(0, v - acc * dt);
      b.x = clampX(b.x + dir * v * dt, 100);
      if (v < 520) { b.air = false; b.hurt = false; b.trail = false; }
      if (Math.random() < dt * 30) G.fx.dust(b.x + dir * 50, FLOOR, 1, { dir, speed: [40, 180], size: [5, 10], up: 18, a: 0.36 });
      A(0, -7); A(12, short ? 0.15 : -0.05); A(3, 4);
      // (the stop runs on through it: the head pitched down by it and back, the tail flung on forward)
      A(12, 0.16 * Math.sin(Math.min(Math.PI, se * 10))); A(15, 0.45 * Math.min(1, se * 6)); A(14, short ? 0 : -0.3 * Math.min(1, se * 8));
    }
    b.air = false; b.hurt = false; b.trail = false;
    thump(b, 0.06, short ? 1.6 : 1.1);
    if (!short && B.phase >= 2) blaze(x0 + dir * total * 0.2, Math.min(190, total * 0.4));
    b.fast = false;
  }

  // Shake: it plants its feet and shakes its burning coat out like a wet dog, flinging embers that come
  // down on the floor. The whole body, head to tail: they fly far and land wide on both sides, so close
  // to it is safe. Head and shoulders only: they fall in a cluster round it, so far off is safe. From
  // the second phase the floor burns for a moment where they land; in the third it shakes twice, the
  // second time the other way.
  function* atkShake() {
    const T = K.T(), n = B.phase >= 3 ? 2 : 1;
    let long = K.chance(0.5, 'long');
    for (let i = 0; i < n; i++) {
      if (i) long = !long;
      yield* shake(long, T, i > 0, B.phase >= 2 && i === n - 1);
    }
    yield* wait(0.2);
  }
  function* shake(long, T, again, burn) {
    const b = B.body;
    facePlayer();
    b.fast = false; b.pose = 'brace';
    if (!again) G.audio.play('snarl');
    // it sets its feet (the brace is wider than it stands, so the paws step out into it), drops its head,
    // and its hackles rise; then a stillness, and the first shiver starts where the shake will. Whole body:
    // the rump hitched up and the tail lifted stiff, the hackles up all down its back. Head and shoulders:
    // the tail tucked in and the hindquarters slack, the head low and the shoulders hunched up round it.
    yield* hold((again ? 0.34 : 0.44) * T, (k, dt, e) => {
      const c = E.inOutQuad(k);
      A(12, 0.16 * c); A(1, 4 * c); A(3, 3 * c); A(16, 0.45 * c); A(15, -0.1 * c);
      if (long) { A(3, -7 * c); A(15, 0.55 * c); A(12, -0.06 * c); }
      else { A(3, 4 * c); A(15, -0.5 * c); A(12, 0.16 * c); A(1, 4 * c); A(0, -3 * c); }
      if (k > 0.6) A(1, Math.sin(e * 50) * 1.2 * (k - 0.6) / 0.4);
      // the first shiver: in the coat over the haunches (whole body) or at the neck (head and shoulders)
      if (k > 0.78) { const q = (k - 0.78) / 0.22; if (long) { A(3, Math.sin(e * 46) * 1.8 * q); A(15, Math.sin(e * 46) * 0.1 * q); } else { A(12, Math.sin(e * 46) * 0.05 * q); A(16, 0.2 * q); } }
      b.hackle = c;
    });
    b.fast = true;
    const dur = long ? 0.7 : 0.46, W = 21;
    // which parts shake, and when: a wave from the head back to the tail, or the head and shoulders alone
    const on = long ? [0, 0.08, 0.16, 0.24] : [0, 0.04, 9, 9], amp = long ? [1, 1, 1, 1] : [1.3, 0.7, 0, 0];
    const env = (e, j) => { const s = e - on[j], L = dur - on[j]; return s <= 0 || L <= 0 ? 0 : Math.sin(Math.PI * Math.min(1, s / L)) * amp[j]; };
    G.audio.play('shakeoff', { dur, long });
    const throwAt = dur * 0.55;
    let thrown = false;
    yield* hold(dur, (k, dt, e) => {
      const h = env(e, 0), s = env(e, 1), q = env(e, 2), t = env(e, 3), ph = e * W;
      A(12, Math.sin(ph) * 0.55 * h); A(13, -6 * h + Math.cos(ph) * 4 * h); A(14, 0.2 * h + Math.abs(Math.sin(ph)) * 0.2 * h);
      A(16, 0.3 * h + Math.sin(ph + 0.6) * 0.6 * h);
      A(1, Math.sin(ph - 0.9) * 11 * s); A(0, Math.sin(ph - 0.9) * 7 * s);
      A(3, Math.sin(ph - 1.8) * 11 * q); A(2, Math.sin(ph - 1.8) * 7 * q);
      A(15, Math.sin(ph - 2.6) * 0.95 * t);
      b.shk = { ph, h, s, q };
      b.kx = Math.sin(ph - 0.9) * 6 * Math.max(s * 0.7, q, h * 0.35);
      b.hackle = Math.max(0, 1 - k * 1.5);
      // fire thrown off whatever is shaking
      if (Math.random() < dt * 60 * Math.max(h, s, q)) {
        const c = centre(b), off = long ? G.rand(-70, 70) : G.rand(20, 80) * b.face;
        G.fx.spawn({ kind: 'spark', x: c.x + off, y: c.y - G.rand(10, 50), vx: G.rand(-380, 380), vy: -G.rand(120, 420), life: G.rand(0.25, 0.55), size: G.rand(1.4, 2.8), color: G.pal().hot, grav: 800 });
      }
      if (!thrown && e >= throwAt) { thrown = true; fling(long, burn); }
    });
    b.shk = null; b.kx = 0; b.hackle = 0; b.fast = false;
    // the coat settles: one last shiver down the back, an ear flicked
    yield* hold(0.24, (k, dt, e) => { A(3, Math.sin(e * 30) * 1.5 * (1 - k)); A(16, 0.3 * Math.sin(Math.PI * k)); });
  }
  // The embers thrown off the shake: far and wide both ways (long), or a cluster round it (short).
  function fling(long, burn) {
    const b = B.body, T = K.T(), c = centre(b), out = [];
    if (long) {
      const per = B.phase >= 3 ? 6 : 5;
      for (const sd of [-1, 1]) for (let j = 0; j < per; j++) out.push([sd, 268 + j * 88 + G.rrand(-14, 14), j]);
    } else {
      for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) out.push([sd, 34 + j * 80 + G.rrand(-10, 10), j]);
    }
    for (const [sd, d, j] of out) {
      const tx = b.x + sd * d;
      if (tx < WL + 24 || tx > WR - 24) continue;
      const ft = ((long ? 0.74 : 0.7) + j * 0.06 + G.rrand(0, 0.05)) * T;
      // (in the ember bed, when the floor will be roaring as it lands, it spares the scorched stone:
      // the stones are where the floor sends you)
      if (B.embersOn && floorHotAt(ft) && ISLES.some(([l, r]) => tx > l - 30 && tx < r + 30)) continue;
      cinder(c.x + sd * G.rand(10, 40), c.y - 40, tx, ft, long ? 170 + j * 18 : 120 + j * 20, burn);
    }
    G.fx.ripple(c.x, c.y - 20, long ? 260 : 180, 0.3, 0.6);
  }
  // Will the ember floor be warning or flaring dt seconds from now (or about to)?
  function floorHotAt(dt) {
    const per = FL_PERIOD(), on = per - FL_BURN, f = (B.ft + dt) % per;
    return f >= on - FL_WARN - 0.6; // (and a little before, to get back onto the stone)
  }
  // One flung ember: it flies on a parabola (marked where it will come down), bursts on the floor, and
  // from the second phase leaves the floor burning for a moment.
  function cinder(x0, y0, tx, ft, apex, burn) {
    const r = 44, bw = 70, life = K.gentle() ? 1.1 : 1.5;
    return H.add({
      kind: 'cinder', layer: 'over', x: x0, y: y0, landT: -1,
      update(dt) {
        this.srcX = this.landT < 0 ? this.x : tx;
        if (this.landT < 0) {
          const k = Math.min(1, this.t / ft);
          this.x = G.lerp(x0, tx, k);
          this.y = G.lerp(y0, FLOOR - 8, k) - 4 * apex * k * (1 - k);
          if (Math.random() < dt * 45) G.fx.spawn({ x: this.x, y: this.y, vx: G.rand(-25, 25), vy: G.rand(-50, 10), life: G.rand(0.2, 0.45), size: G.rand(1.4, 2.8), color: G.pal().boss, wob: 40 });
          if (k >= 1) {
            this.landT = this.t;
            const pal = G.pal();
            G.audio.play('cinder');
            G.fx.boom(tx, FLOOR - 8, r * 0.8, { col: pal.boss, hot: pal.hot });
            G.fx.burst(tx, FLOOR - 6, { n: 10, color: pal.boss, speed: [80, 320], angle: -Math.PI / 2, spread: 2.6, life: [0.2, 0.5], size: [1.6, 3], kind: 'spark', grav: 700 });
            G.fx.dust(tx, FLOOR, 1, { speed: [10, 60], size: [8, 13], life: [0.6, 1], up: 50, a: 0.3, color: '34,24,20' });
            G.fx.shake(2.5);
            if (burn) G.fx.scorch(tx, bw * 0.5, pal.boss);
          }
        } else if (this.t > this.landT + (burn ? life + 0.35 : 0.1)) this.dead = true;
      },
      hits(P) {
        if (this.landT < 0) return G.circleRect(this.x, this.y, 11, P.box());
        const s = this.t - this.landT;
        if (s < 0.08) return G.circleRect(tx, FLOOR - 8, r - 8, P.box());
        return burn && s < life && P.y > FLOOR - 34 && Math.abs(P.x - tx) < bw / 2 - 8;
      },
      danger(P) {
        if (this.landT < 0) return [tx, r + 16, ft - this.t];
        if (burn && this.t - this.landT < life && P.y > FLOOR - 60) return [tx, bw / 2 + 12, 0];
        return null;
      },
      draw(ctx) {
        const pal = G.pal();
        if (this.landT < 0) {
          // where it will come down (a thing thrown through the air: it gets a mark, faded in)
          const k = Math.min(1, this.t / ft), a = Math.min(1, this.t / 0.12);
          ctx.fillStyle = G.rgba(DANGER, (0.08 + 0.1 * k) * a);
          ctx.beginPath(); ctx.ellipse(tx, FLOOR - 1, r, 8, 0, 0, G.TAU); ctx.fill();
          ctx.fillStyle = G.rgba(DANGER, 0.3 * a);
          ctx.beginPath(); ctx.ellipse(tx, FLOOR - 1, Math.max(0.1, r * k), Math.max(0.1, 8 * k), 0, 0, G.TAU); ctx.fill();
          ctx.strokeStyle = G.rgba(DANGER, (0.45 + 0.4 * k) * a); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(tx, FLOOR - 1, r, 8, 0, 0, G.TAU); ctx.stroke();
          // the ember: a burning coal
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(G.fx.glow(pal.boss), this.x - 24, this.y - 24, 48, 48);
          ctx.fillStyle = G.rgba(pal.hot, 0.95);
          ctx.beginPath(); ctx.arc(this.x, this.y, 5, 0, G.TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        } else if (burn) {
          const s = this.t - this.landT, k = Math.min(1, s / 0.12) * G.clamp((life + 0.35 - s) / 0.35, 0, 1);
          flames(ctx, tx - bw / 2, tx + bw / 2, 28, k, tx * 0.013, pal);
        }
      },
    });
  }

  // ------------------------------------------------------------------ skysnap: its answer to a hero over its head
  // (B.antiAir: cast when the hero has ridden over its head for a while, on a ledge or hopping on it.)
  // Its ears go up and it looks up, sinking onto its haunches, and shuffles under where you are. Then it
  // goes straight up after you, jaws first, and its mane leaves a column of embers hanging behind it: get
  // out from over it. A hero only just over its back (not up on a ledge) may instead see it drop a
  // shoulder and tip onto its side: it throws itself over onto its back and rakes the air above it with
  // all four legs, wider but not as high (drop down off it, or get clear). From the second phase the
  // column burns for a moment and the floor under the rake catches; in the third it twists at the top of
  // its leap and snaps again after you, and the rake goes over twice.
  function* atkSkysnap() {
    const b = B.body, P = G.player, T = K.T();
    const roll = P.y > FLOOR - 250 && K.chance(0.45, 'roll');
    const tele = (roll ? 0.5 : 0.56) * T * (B.phase >= 3 ? 0.88 : 1), lock = 0.2 * T;
    b.fast = false; b.pose = roll ? 'crouch' : 'crouchDeep';
    G.audio.play('snarl');
    let tx = clampX(P.x, 110), glinted = false;
    yield* hold(tele, (k, dt, e) => {
      if (e < tele - lock) tx = clampX(P.x, 110);
      // under where the hero is, in quick shuffling steps
      b.x = G.damp(b.x, tx, 7, dt);
      if (roll) {
        // a shoulder dropped, the body tipping onto its side, the legs drawn in under it
        const c = E.inOutQuad(k);
        b.roll = 0.6 * c;
        A(4, -16 * c); A(6, -12 * c); A(8, 12 * c); A(10, 14 * c); A(5, -8 * c); A(9, -8 * c);
        A(12, 0.3 * c); A(16, 0.6 * c); A(15, Math.sin(e * 12) * 0.15);
      } else {
        // the ears go straight up and the head turns up to the sky, the haunches sinking under it
        coil(k, e, 1.1, 0);
        // (the look up comes first and goes far: the head leads the whole move)
        A(16, -1.3 + Math.sin(e * 24) * 0.15 * (1 - k)); A(12, -1.5 * outQ(Math.min(1, k * 1.8))); A(13, 6 * k); A(14, 0.2 * k);
        if (!glinted && e >= tele - 0.2) { glinted = true; const m = mouthAt(b); G.fx.glint(m.x, m.y - 10, 22, G.pal().hot); G.audio.play('glint'); }
      }
    });
    if (roll) yield* skyRake();
    else yield* skyLeap(tx);
  }
  // Straight up, jaws first: the body goes up through the column (and its centre stays over tx all the
  // way: as it pitches nose-up it pivots about its middle), hangs, and comes down turning onto its feet.
  function* skyLeap(tx) {
    const b = B.body, P = G.player, S = B.size, tilt = 1.36;
    const apex = G.clamp(P.y + 150, FLOOR - 430, FLOOR - 170);
    const col = skyColumn(tx, B.phase >= 2 ? 0.9 : 0.3);
    b.pose = 'leap'; b.fast = true; b.trail = true;
    G.audio.play('whoosh');
    G.fx.thud(tx, FLOOR, 1.0, { noCrack: true });
    for (const d of [-1, 1]) G.fx.dust(tx + d * 30, FLOOR, 3, { dir: d, speed: [80, 300], size: [7, 12], up: 40, a: 0.4 });
    b.sq = Math.max(b.sq || 0, 0.14);
    const y0 = b.y, f = b.face, rise = 0.22 + (y0 - apex) / 3600;
    const place = () => { b.x = tx - 56 * S * Math.sin(b.rot); };
    col.body = true;
    yield* hold(rise, (k) => {
      b.rot = -f * tilt * E.outCubic(Math.min(1, k * 2.4));
      b.y = G.lerp(y0, apex, E.outQuad(k));
      place();
      A(14, 0.85); A(16, 0.15); A(15, -0.6 * k); A(12, -0.2);
    });
    G.audio.play('chomp'); G.fx.shake(5);
    if (B.phase >= 3) yield* skyTwist(tx, place);
    else {
      // the jaws shut on the air and it hangs there a breath, shaking its head
      yield* hold(0.13, (k, dt, e) => { place(); A(12, Math.sin(e * 32) * 0.14); A(15, -0.6); });
    }
    // down it comes, turning to land on its feet
    const ya = b.y, r0 = b.rot;
    b.pose = 'dive';
    yield* hold(0.3, (k) => { b.y = G.lerp(ya, FLOOR, E.inQuad(k)); b.rot = r0 * (1 - E.inOutQuad(k)); place(); A(15, -0.4 * (1 - k)); });
    b.y = FLOOR; b.rot = 0; b.x = tx; b.trail = false; col.body = false; col.live = false;
    landing(tx, false, false);
    thump(b, 0.18, 2.4);
    b.pose = 'land'; b.fast = false; b.exposed = true;
    yield* hold(0.5, (k, dt, e) => { A(3, 9 * (1 - outQ(k))); A(1, 4 * (1 - outQ(k))); A(12, 0.2 * (1 - k)); landFollow(e, false); });
    b.exposed = false;
  }
  // (phase III) at the top it twists round after wherever you went and snaps again
  function* skyTwist(tx, place) {
    const b = B.body, P = G.player, S = B.size;
    const side = G.sign(P.x - tx) || b.face;
    if (side !== b.face) { b.face = side; b.rot = -b.rot; place(); }
    const jy = b.y - 150 * S;
    const ang = (a) => (side > 0 ? a : Math.PI - a);
    H.arc({ x: tx, y: jy + 30, r: 175, a0: ang(-1.45), a1: ang(0.4), tele: 0.22, active: 0.1, owner: b, onFire() { G.audio.play('chomp'); G.fx.shake(5); } });
    yield* hold(0.34, (k, dt, e) => {
      // the head whips round and down after you, the body swinging on under it
      const s = Math.sin(Math.PI * Math.min(1, k * 1.6));
      b.rot = -b.face * (1.36 - 0.5 * s); place();
      A(12, 0.5 * s); A(14, k < 0.62 ? 0.85 : 0.1); A(15, -0.7 * s);
    });
  }
  // The column it goes up through: its body, upright, while it rises, hangs and comes down, and the
  // embers its mane leaves hanging behind it, which burn on for a moment (burn) after it has gone.
  function skyColumn(tx, burn) {
    const b = B.body, S = B.size;
    return H.add({
      kind: 'skycol', layer: 'under', x: tx, live: true, body: false, top: FLOOR, endT: -1,
      update(dt) {
        this.srcX = this.x;
        if (this.live) this.top = Math.min(this.top, b.y - 175 * S);
        if (!this.live && this.endT < 0) this.endT = this.t;
        if (this.endT >= 0 && this.t > this.endT + burn + 0.45) this.dead = true;
        const k = this.k();
        if (this.top < FLOOR - 10 && Math.random() < dt * 50 * k) {
          G.fx.spawn({ x: tx + G.rand(-24, 24), y: G.rand(this.top, FLOOR), vx: G.rand(-20, 20), vy: -G.rand(30, 120), life: G.rand(0.3, 0.7), size: G.rand(1.4, 3), color: G.pal().boss, wob: 50 });
        }
      },
      k() { return this.endT < 0 ? 1 : Math.max(0, 1 - (this.t - this.endT) / (burn + 0.45)); },
      hot() { return this.endT < 0 || this.t - this.endT < burn; },
      hits(P) {
        const box = P.box();
        if (this.body) {
          const c = centre(b);
          if (G.rectsOverlap(box, { cx: c.x, cy: b.y - 62 * S, hw: 40 * S, hh: 112 * S })) return true;
        }
        return this.hot() && this.top < FLOOR - 40 && G.rectsOverlap(box, { cx: tx, cy: (this.top + FLOOR) / 2, hw: 24, hh: (FLOOR - this.top) / 2 });
      },
      danger(P) { return this.hot() ? [tx, 74, 0] : null; },
      draw(ctx) {
        if (this.top > FLOOR - 20) return;
        const pal = G.pal(), k = this.k() * (this.hot() ? 1 : 0.6), top = this.top, h = FLOOR - top;
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(tx - 30, 0, tx + 30, 0);
        g.addColorStop(0, G.rgba(pal.boss, 0)); g.addColorStop(0.5, G.rgba(pal.boss, 0.22 * k)); g.addColorStop(1, G.rgba(pal.boss, 0));
        ctx.fillStyle = g; ctx.fillRect(tx - 30, top, 60, h);
        // tongues licking up the column
        ctx.fillStyle = G.rgba(pal.hot, 0.35 * k);
        ctx.beginPath();
        for (let y = FLOOR; y > top + 10; y -= 26) {
          const sw = Math.sin(G.t * 9 + y * 0.05) * 7, w = 9 * (0.6 + 0.4 * Math.sin(G.t * 13 + y * 0.11));
          ctx.moveTo(tx - w + sw * 0.3, y); ctx.quadraticCurveTo(tx + sw, y - 20, tx + w * 0.4 + sw, y - 30); ctx.quadraticCurveTo(tx + w, y - 10, tx + w + sw * 0.3, y);
        }
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  }
  // Over onto its back, raking the air above it with all four legs, and back onto its feet.
  function* skyRake() {
    const b = B.body, n = B.phase >= 3 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      // over it goes (its legs swap to the paws-up pose as it passes edge-on, where the change is unseen)
      b.fast = true;
      G.audio.play('whoosh');
      const ra = b.roll;
      yield* hold(i ? 0.16 : 0.13, (k) => { b.roll = G.lerp(ra, Math.PI, E.outCubic(k)); if (b.roll > Math.PI / 2) b.pose = 'belly'; });
      b.roll = Math.PI; b.pose = 'belly';
      G.fx.thud(b.x, FLOOR, 0.8, { noCrack: true });
      G.fx.dust(b.x, FLOOR, 4, { speed: [40, 200], size: [7, 12], up: 30, a: 0.4 });
      const zone = H.add({
        kind: 'skyrake', layer: 'under', x: b.x, dur: 0.34,
        update() { this.srcX = b.x; if (this.t > this.dur) this.dead = true; },
        hits(P) { return G.rectsOverlap(P.box(), { cx: b.x, cy: FLOOR - 168, hw: 125, hh: 86 }); },
        danger(P) { return P.y < FLOOR - 40 ? [b.x, 150, 0] : null; },
      });
      G.audio.play('sweep');
      yield* hold(zone.dur, (k, dt, e) => {
        // the legs thrash at the air (drawn upside down: down in its own frame is up)
        const s = Math.sin(e * 34), c = Math.cos(e * 34);
        A(5, 12 + s * 18); A(7, 12 - s * 18); A(9, 12 - c * 18); A(11, 12 + c * 18); A(4, s * 10); A(8, -c * 10);
        A(12, -0.3); A(14, 0.6); A(15, Math.sin(e * 20) * 0.4);
        if (Math.random() < dt * 40) G.fx.spawn({ kind: 'spark', x: b.x + G.rand(-110, 110), y: FLOOR - G.rand(90, 230), vx: G.rand(-200, 200), vy: -G.rand(60, 220), life: G.rand(0.15, 0.35), size: G.rand(1.4, 2.6), color: G.pal().hot, grav: 600 });
      });
      if (B.phase >= 2 && i === n - 1) blaze(b.x, 200);
      // half back over (and over again, in the third phase), or right back onto its feet
      const r0 = b.roll, r1 = i < n - 1 ? 0.5 : 0;
      yield* hold(0.2, (k) => { b.roll = G.lerp(r0, r1, E.inOutQuad(k)); if (b.roll < Math.PI / 2) b.pose = 'crouch'; });
      b.roll = r1;
    }
    b.roll = 0; b.pose = 'crouch'; b.fast = false; b.exposed = true;
    thump(b, 0.1, 1);
    G.audio.play('paw');
    yield* hold(0.45, (k, dt, e) => { A(3, Math.sin(e * 30) * 1.5 * (1 - k)); A(16, 0.5 * (1 - k)); });
    b.exposed = false;
  }

  // ------------------------------------------------------------------ harry
  // Harry (every phase): it lowers its head and snorts, and the snorts are the bounds to come: short
  // snapping hops after you, each one aimed again, three in the first phase, four in the second, five in
  // the third (and now and then one fewer: count them). Then it gathers and dives head first where you
  // are, drives its jaws into the floor, and is stuck there, tugging, for a long moment. Walking away
  // only works while its bounds are slow (not in the third phase); going through it while it is down
  // between bounds, over it, or a dash through, always does. (The ember bed holds its flare meanwhile.)
  function* atkHarry() {
    const b = B.body, T = K.T();
    const n = 2 + B.phase - (K.chance(0.3, 'short') ? 1 : 0);
    facePlayer();
    // a bull's stance, not the prowl's slink: shoulders up, head down low, ears pricked forward at you
    // and the tail up stiff (the prowl goes low and long with its ears flat and its tail down)
    b.fast = false; b.pose = 'lowerHead';
    G.audio.play('snarl');
    yield* hold(0.2 * T, (k) => { A(12, 0.22 * E.inOutQuad(k)); A(1, 3 * k); A(15, 0.15 * outQ(k)); });
    for (let i = 0; i < n; i++) yield* snort(i === n - 1);
    const hopT = [0, 0.32, 0.3, 0.27][B.phase];
    for (let i = 0; i < n; i++) yield* hop(hopT, i ? 0.08 : 0.14);
    yield* plunge(T);
  }
  // one snort: the head jerks up, and two jets of smoke and sparks out of the nostrils
  function* snort(last) {
    const b = B.body;
    let done = false;
    yield* hold(0.18, (k, dt, e) => {
      const s = Math.sin(Math.PI * Math.min(1, k * 1.7));
      // the head jerks up with the snort, the shoulders jolt and a forepaw stamps
      A(12, 0.22 - 0.2 * s); A(1, 3 - 3 * s); A(13, 3 * s); A(15, 0.15 + Math.sin(e * 9) * 0.08 + 0.1 * s);
      A(5, -8 * Math.sin(Math.PI * Math.min(1, k * 2.2)));
      if (!done && k > 0.3) {
        done = true;
        G.audio.play('wolfSnort');
        const m = mouthAt(b), f = b.face;
        for (const dy of [-4, 4]) G.fx.dust(m.x - f * 10, m.y + dy, 1, { dir: f, speed: [90, 180], size: [5, 9], life: [0.3, 0.55], up: 6, a: 0.5, color: '58,40,32' });
        G.fx.burst(m.x, m.y, { n: 4, color: G.pal().hot, speed: [80, 200], angle: f > 0 ? 0.2 : Math.PI - 0.2, spread: 0.5, life: [0.12, 0.3], size: [1.2, 2.2], kind: 'spark', grav: 300 });
      }
    });
    if (!last) yield* hold(0.08, () => { A(12, 0.22); A(15, 0.15); });
  }
  // one snapping bound after the hero, the jaws shutting as it lands
  function* hop(dur, gather) {
    const b = B.body, P = G.player;
    facePlayer();
    b.pose = 'crouch'; b.fast = true;
    yield* hold(gather, (k, dt, e) => coil(0.4 + 0.6 * k, e, 0.6, 0.3));
    const f = b.face, reach = G.clamp(Math.abs(P.x - b.x) - 60, 70, 220), tx = clampX(b.x + f * reach, 100);
    H.arc({ x: tx + f * 70, y: FLOOR - 36, r: 100, a0: mir(-0.75), a1: mir(0.95), tele: dur, active: 0.1, owner: b, onFire() { G.audio.play('chomp'); } });
    b.pose = 'launch'; b.air = true;
    G.fx.dust(b.x - f * 40, FLOOR, 2, { dir: -f, speed: [60, 220], size: [6, 10], life: [0.3, 0.5], up: 24, a: 0.38 });
    // (a snapping bound: jaws open from the top of it, shut as it lands)
    yield* arc(tx, FLOOR, dur, 46, (k) => { if (k > 0.45) A(14, 0.5); }, {});
    b.air = false; b.pose = 'biteLow';
    thump(b, 0.1, 1.5);
    G.audio.play('paw');
    G.fx.dust(b.x + f * 40, FLOOR, 2, { dir: f, speed: [60, 200], size: [6, 10], up: 22, a: 0.36 });
    yield* hold(0.1, (k, dt, e) => { A(12, Math.sin(e * 34) * 0.18 * (1 - k)); A(16, 0.4); landFollow(e, false); });
  }
  // the last bound: a dive, head first, that buries its jaws in the floor where you were
  function* plunge(T) {
    const b = B.body, P = G.player;
    facePlayer();
    // (not the pounce's crouch: it rears back, chest high and forepaws light, head up and jaws gaping)
    b.fast = false; b.pose = 'plungeUp';
    const tele = 0.36 * T, S = B.size;
    let glinted = false, f = b.face, tx = 0, hx = 0, mark = null;
    // (its aim is set as the glint comes: not drawn, watch the body. The mark covers where the body comes
    // down as well as the jaws)
    const aim = () => { f = b.face; tx = clampX(P.x + P.vx * 0.12 - f * 100 * S, 110); hx = tx + f * 100 * S; mark = K.columnMark((tx - f * 100 + hx + f * 80) / 2, 320, true); };
    yield* hold(tele, (k, dt, e) => {
      if (!mark) facePlayer();
      coil(k, e, 1.1, 0.8); A(12, -0.25 * inQ(k));
      A(14, 0.25 * k + Math.abs(Math.sin(e * 18)) * 0.08 * k); // (the jaws working wider)
      // and at the last it pitches forward off its haunches into the spring (its back where a crouch
      // would put it, so its body in the dive hurts where it always did)
      const fw = G.clamp((e - (tele - 0.13)) / 0.04, 0, 1);
      for (let j = 0; j < 4; j++) A(j, (POSES.crouchDeep[j] - POSES.plungeUp[j]) * fw);
      if (!glinted && e >= tele - 0.2) { glinted = true; aim(); const m = mouthAt(b); G.fx.glint(m.x, m.y, 26, G.pal().hot); G.audio.play('glint'); }
    });
    if (!mark) aim();
    b.pose = 'launch'; b.fast = true; b.air = true; b.trail = true;
    G.audio.play('whoosh');
    G.fx.thud(b.x - f * 40, FLOOR, 0.8, { noCrack: true });
    // up, and over into the dive: head first, jaws wide, all the way down
    yield* arc(tx, FLOOR, 0.5, 140, null, { fall: 'plungeDive', last: 'plungeDive' });
    mark.dead = true; b.air = false; b.trail = false;
    K.crush(hx, FLOOR - 36, 80, 40, 1);
    landing(tx, true);
    G.fx.impact(hx, FLOOR - 40, 0.05);
    thump(b, 0.24, 3.4);
    b.pose = 'buried'; b.fast = true; b.exposed = true;
    G.audio.play('chomp'); G.fx.shake(8);
    G.fx.burst(hx, FLOOR - 6, { n: 12, color: G.pal().boss, speed: [100, 360], angle: -Math.PI / 2, spread: 2.2, life: [0.3, 0.7], size: [1.6, 3.2], kind: 'spark', grav: 700 });
    G.fx.dust(hx, FLOOR, 4, { speed: [40, 200], size: [8, 14], up: 50, a: 0.45 });
    const stuck = [0, 1.25, 1.1, 0.95][B.phase];
    yield* hold(stuck, (k, dt, e) => {
      // it hauls back on its forelegs, its hind paws scrabbling, the tail thrashing
      const tug = Math.max(0, Math.sin(e * 7.5));
      A(0, -9 * tug); A(2, -6 * tug); A(1, -3 * tug); A(3, 2 * tug); A(15, Math.sin(e * 11) * 0.35); A(16, 0.2);
      // (the hind paws scrabbling at the floor in turn as it hauls)
      A(9, -9 * Math.max(0, Math.sin(e * 15)) * tug); A(11, -9 * Math.max(0, Math.sin(e * 15 + Math.PI)) * tug);
      A(8, -6 * Math.sin(e * 15) * tug);
      if (Math.random() < dt * 14) G.fx.dust(b.x - f * 50 * S, FLOOR, 1, { dir: -f, speed: [60, 200], size: [5, 9], up: 20, a: 0.38 });
      if (tug > 0.9 && Math.random() < dt * 30) G.fx.spawn({ kind: 'spark', x: hx + G.rand(-20, 20), y: FLOOR - 4, vx: G.rand(-120, 120), vy: -G.rand(80, 260), life: G.rand(0.15, 0.35), size: G.rand(1.4, 2.4), color: G.pal().hot, grav: 800 });
    });
    // and free: a toss of the head that throws the floor up with it
    G.audio.play('wolfTear');
    b.pose = 'toss';
    G.fx.shards(hx, FLOOR - 10, 6, '60,44,36', { angle: -Math.PI / 2 - f * 0.4, spread: 1.4, speed: [160, 420], size: [2.5, 5] });
    G.fx.dust(hx, FLOOR, 3, { speed: [40, 160], size: [8, 13], up: 60, a: 0.4 });
    thump(b, 0.08, -1.6);
    yield* hold(0.24, (k) => { A(12, -0.22 * Math.sin(Math.PI * k)); A(15, 0.3 * (1 - k)); });
    b.exposed = false;
  }

  // ------------------------------------------------------------------ cinders
  // Cinders (every phase): it hunches, its throat heaving, and coughs up burning coals. Head down by the
  // floor: they drop and roll at you fast along it, and come back once off the far wall (jump them, both
  // ways: they come up together in one gout, so one jump timed to the first clears them all). Head thrown up and
  // back: they are tossed high, one at a time, and come down in bounces that carry them on (read where
  // each bounce lands). From the second phase there are three and where each one bursts the floor burns
  // for a moment; in the third it coughs again, the other way.
  function* atkCinders() {
    const T = K.T(), n = B.phase >= 3 ? 2 : 1;
    let toss = K.chance(0.45, 'toss');
    for (let i = 0; i < n; i++) {
      if (i) toss = !toss;
      yield* cough(toss, T, i > 0);
    }
    yield* wait(0.15);
  }
  function* cough(toss, T, again) {
    const b = B.body, P = G.player;
    facePlayer();
    // too close to cough at you: a bound backwards first, still facing you, to get its room
    if (Math.abs(P.x - b.x) < 260 && P.y > FLOOR - 160) {
      // (and with its back to a wall, over the hero instead)
      const back = clampX(P.x - b.face * 330, 100), over = clampX(P.x + b.face * 330, 100);
      yield* boundBack(Math.abs(back - P.x) >= 280 ? back : over);
      facePlayer();
    }
    // Tossed: stiff-legged with its rump hitched high and its tail clamped between its legs, head up
    // ('hackUp'; not the breath's wide-braced sit). Rolled: muzzle down at the floor, forelegs splayed and
    // the rump up, the tail low. Either way the throat heaves and the belly pumps with it.
    b.fast = false; b.pose = toss ? 'hackUp' : 'lowHead';
    if (!again) G.audio.play('snarl');
    const tele = (again ? 0.42 : 0.54) * T;
    // the throat heaves: the head says where they will go
    yield* hold(tele, (k, dt, e) => {
      facePlayer();
      const heave = Math.max(0, Math.sin(e * 14));
      A(1, 5 * heave); A(3, 2 * heave); A(13, -3 * heave); A(14, 0.15 * heave);
      // (the belly pumps: the hindquarters rise a beat behind each heave of the throat)
      A(3, -2.5 * Math.max(0, Math.sin(e * 14 - 1.1)));
      if (toss) { A(12, -0.3 * inQ(k)); A(0, -3 * k); } else { A(12, 0.1 * inQ(k)); A(16, 0.25 * k); A(3, -6 * outQ(k)); A(4, 10 * outQ(k)); A(6, -6 * outQ(k)); A(15, -0.3 * k); }
      if (Math.random() < dt * 10) { const m = mouthAt(b); G.fx.spawn({ x: m.x, y: m.y, vx: G.rand(-20, 20), vy: -G.rand(20, 60), life: G.rand(0.2, 0.4), size: G.rand(1.2, 2.2), color: G.pal().hot, wob: 30 }); }
    });
    const count = B.phase >= 2 ? 3 : 2;
    if (!toss) { yield* gout(count); b.fast = false; b.pose = 'push'; yield* hold(0.2, (k, dt, e) => { A(12, Math.sin(e * 26) * 0.08 * (1 - k)); }); return; }
    // (tossed coals one at a time, a hack each)
    const hack = 0.11, rest = 0.13;
    for (let i = 0; i < count; i++) {
      b.fast = true;
      G.audio.play('wolfHack');
      let spat = false;
      yield* hold(hack, (k) => {
        const s = Math.sin(Math.PI * k);
        if (toss) { A(12, -0.45 * s); A(13, 5 * s); } else { A(12, 0.22 * s); A(13, 9 * s); }
        A(1, -4 * s); A(14, 0.7 * s); A(16, 0.3 * s);
        A(3, -4 * s); A(15, 0.25 * s); // (the whole body jerks with it: rump up, tail flicked)
        if (!spat && k > 0.45) { spat = true; spit(toss, i); }
      });
      yield* hold(rest, (k) => { A(14, 0.3 * (1 - k)); A(1, 2 * (1 - k)); });
    }
    b.fast = false; b.pose = toss ? 'toss' : 'push';
    yield* hold(0.2, (k, dt, e) => { A(12, Math.sin(e * 26) * 0.08 * (1 - k)); });
  }
  // the rollers: one heaving retch, and they come up all together in a gout, a clump along the floor
  // (one jump timed to the first clears them all, as does a dash through)
  function* gout(count) {
    const b = B.body;
    b.fast = true;
    G.audio.play('wolfHack');
    let n = 0, e0 = 0;
    yield* hold(0.26, (k, dt, e) => {
      const s = Math.sin(Math.PI * Math.min(1, k * 1.3));
      A(12, 0.26 * s); A(13, 10 * s); A(1, -5 * s); A(3, -3 * s); A(14, 0.8 * s); A(16, 0.3 * s);
      A(3, -5 * s); A(15, 0.3 * s); A(4, 6 * s); // (the retch runs back through it: rump up, tail jerked, forelegs braced)
      // (spat out one after another, 0.035 s apart, from the moment the jaws open)
      if (k > 0.3 && n < count && e - e0 >= 0.035) { e0 = e; spit(false, n++); }
    });
    while (n < count) spit(false, n++);
    yield* hold(0.12, (k) => { A(14, 0.4 * (1 - k)); A(1, 2 * (1 - k)); });
  }
  // a bound backwards to x1, still facing the hero (or, x1 being on the hero's far side, a high bound
  // over the hero's head, turning in the air)
  function* boundBack(x1) {
    const b = B.body, x0 = b.x, over = (x1 - x0) * b.face > 0, f = b.face;
    b.pose = 'crouch'; b.fast = true;
    yield* hold(0.1, (k, dt, e) => coil(k, e, over ? 1 : 0.7, 0.3));
    b.pose = 'leap'; G.audio.play('paw');
    G.fx.dust(b.x - f * 40, FLOOR, 2, { dir: over ? -f : f, speed: [40, 180], size: [6, 10], up: 22, a: 0.36 });
    const dur = over ? 0.46 : 0.3, ap = over ? 190 : 42;
    yield* hold(dur, (k) => {
      // (pushed off, gathered, and reaching for the floor)
      // (only the legs and tail change: its head and back are held as in 'leap', because the cough that
      // follows spits its coals from where its jaws are, and they must come from where they always did)
      b.pose = k < 0.2 ? 'launch' : over && k > 0.35 && k < 0.6 ? 'tuck' : k > 0.7 ? 'reach' : 'leap';
      if (k < 1) for (const j of [0, 1, 12, 13]) A(j, POSES.leap[j] - POSES[b.pose][j]);
      b.x = G.lerp(x0, x1, over ? k : outQ(k)); b.y = FLOOR - 4 * ap * k * (1 - k);
      b.rot = over ? f * 0.4 * (2 * k - 1) * Math.sin(Math.PI * k) : -f * 0.12 * Math.sin(Math.PI * k);
      if (over && k > 0.55 && b.face === f) b.face = -f; // (it turns in the air to land facing the hero)
    });
    b.y = FLOOR; b.rot = 0; b.x = x1;
    thump(b, 0.1, -1.2);
    G.audio.play('paw'); G.fx.dust(b.x, FLOOR, 3, { speed: [30, 140], size: [6, 11], up: 22, a: 0.38 });
    b.fast = false;
  }
  function spit(toss, i) {
    const b = B.body, m = mouthAt(b), f = b.face, burn = B.phase >= 2;
    G.fx.burst(m.x, m.y, { n: 5, color: G.pal().hot, speed: [80, 220], angle: toss ? -Math.PI / 2 + f * 0.6 : (f > 0 ? 0.4 : Math.PI - 0.4), spread: 0.6, life: [0.12, 0.3], size: [1.2, 2.4], kind: 'spark', grav: 500 });
    if (toss) coal(m.x, m.y, f * (210 + 105 * i + G.rrand(-15, 15)), -(650 + 30 * i), true, burn);
    else coal(m.x + f * 10, m.y, f * 500, 60, false, burn);
  }
  // One coughed-up coal, as an orb: a roller drops onto the floor and rolls,
  // comes back once off a wall and bursts on the next; a bouncer comes down in two bounces that carry
  // it on, and bursts on the second.
  function coal(x, y, vx, vy, bouncer, burn) {
    // (one cut down bursts clean: only a coal left to burst by itself sets the floor alight)
    // (a rolling coal is too heavy to cut: it is jumped. One tossed in the air can be cut down)
    const h = H.orb(x, y, vx, vy, { r: bouncer ? 14 : 13, grav: bouncer ? 1500 : 0, life: 6.5, slashable: bouncer, onPop: (o) => { if (burn && !o.cut) emberPatch(o.x); } });
    h.walls = 0; h.bounces = 0; h.spin = 0; h.roller = !bouncer;
    const pop0 = h.pop;
    h.pop = function () { if (this.dead) return; pop0.call(this); G.audio.play('cinder'); };
    h.slash = function () { this.cut = true; this.pop(); G.audio.play('orbPop'); };
    h.steer = function (o, dt) {
      if (bouncer) {
        const nvy = o.vy + o.grav * dt;
        if (o.y + o.r + nvy * dt >= FLOOR && nvy > 0) {
          o.bounces++;
          G.fx.burst(o.x, FLOOR - 4, { n: 6, color: G.pal().hot, speed: [60, 220], angle: -Math.PI / 2, spread: 2, life: [0.15, 0.35], size: [1.2, 2.4], kind: 'spark', grav: 700 });
          G.fx.dust(o.x, FLOOR, 1, { speed: [10, 60], size: [6, 10], up: 20, a: 0.3 });
          if (o.bounces >= 2) { o.y = FLOOR - o.r; o.vy = 0; o.pop(); return; }
          G.audio.play('paw');
          o.vy = -nvy * 0.64 - o.grav * dt;
        }
      } else if (o.y < FLOOR - o.r - 0.5) {
        // out of its mouth and down onto the floor
        o.vy += 2200 * dt;
        if (o.y + o.r + o.vy * dt >= FLOOR) { o.y = FLOOR - o.r - 0.5; o.vy = 0; G.fx.dust(o.x, FLOOR, 1, { speed: [20, 80], size: [5, 8], up: 14, a: 0.3 }); }
      } else { o.vy = 0; o.y = FLOOR - o.r - 0.5; } // (rolling on the floor, never in it)
      if ((o.x < WL + o.r && o.vx < 0) || (o.x > WR - o.r && o.vx > 0)) {
        o.walls++;
        if (o.walls > 1 || bouncer && o.walls > 0 && o.bounces >= 2) { o.pop(); return; }
        o.vx = -o.vx * 0.82;
        G.audio.play('paw');
        G.fx.burst(o.x, o.y, { n: 6, color: G.pal().hot, speed: [60, 200], angle: o.vx > 0 ? 0 : Math.PI, spread: 1.4, life: [0.15, 0.3], size: [1.2, 2.4], kind: 'spark', grav: 600 });
      }
      o.spin += o.vx * dt / o.r;
      if (Math.random() < dt * 30) G.fx.spawn({ kind: 'spark', x: o.x, y: o.y + (bouncer ? 0 : o.r * 0.6), vx: -o.vx * 0.2 + G.rand(-30, 30), vy: -G.rand(20, 120), life: G.rand(0.15, 0.3), size: G.rand(1, 2), color: G.pal().hot, grav: 500 });
    };
    // a coal: a lump of black rock, split with fire, turning as it goes
    h.draw = function (ctx) {
      const pal = G.pal(), r = this.r;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(G.fx.glow(pal.boss), -r * 2.3, -r * 2.3, r * 4.6, r * 4.6);
      ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(this.spin);
      ctx.fillStyle = '#1b0e09';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * G.TAU, rr = r * (0.84 + 0.16 * Math.sin(i * 2.7 + 1.3)); if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = G.rgba(DANGER, 0.75); ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = G.rgba(pal.hot, 0.9); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.2); ctx.lineTo(-r * 0.1, r * 0.1); ctx.lineTo(r * 0.5, -r * 0.35); ctx.moveTo(-r * 0.1, r * 0.1); ctx.lineTo(r * 0.05, r * 0.6); ctx.stroke();
      ctx.restore();
    };
    return h;
  }
  // where a coal bursts, from the second phase: the floor burns for a moment (a pool, to the tests)
  function emberPatch(x) {
    x = G.clamp(x, WL + 40, WR - 40);
    return H.add({
      kind: 'pool', layer: 'under', x, w: 76, tele: 0.42, active: 1.0, fade: 0.35,
      update() { this.srcX = this.x; if (this.t > this.tele + this.active + this.fade) this.dead = true; },
      hits(P) { return this.t >= this.tele && this.t < this.tele + this.active && P.y > FLOOR - 34 && Math.abs(P.x - this.x) < this.w / 2 - 8; },
      draw(ctx) {
        const e = this.t - this.tele, k = e < 0 ? 0.35 * this.t / this.tele : e < this.active ? 0.35 + 0.65 * Math.min(1, e / 0.12) : Math.max(0, 1 - (e - this.active) / this.fade);
        flames(ctx, this.x - this.w / 2, this.x + this.w / 2, 26, k, this.x * 0.02, G.pal());
      },
    });
  }

  // ------------------------------------------------------------------ blaze
  // Blaze (every phase): it springs up onto the rock at the back of the forest, out of reach, and sets
  // the floor alight. Sitting back and howling at the sky: fire runs in from both walls along the floor
  // and closes on the stretch in front of it, where it stands, and stops short: that is the gap. Rearing
  // and bringing its forepaws down on the rock: the fire bursts out from the floor in front of it and
  // runs out towards both walls, stopping short of each: the gaps are at the walls. The fire is too
  // tall to jump and the floor stays burning behind it; ledges are out of it. Then it comes down off the
  // rock, well clear of you, and stands panting, open. The gaps narrow and the fire runs faster in each
  // phase; in the third its landing throws fire along the floor both ways.
  function* atkBlaze() {
    const b = B.body, P = G.player, T = K.T();
    const burst = K.chance(0.4, 'burst');
    facePlayer();
    // (not a pounce: it sinks level on all four legs with its head up and its ears pricked at the rock
    // above and behind it, and the tail swings wide)
    b.fast = false; b.pose = 'sink';
    G.audio.play('snarl');
    yield* hold(0.3 * T, (k, dt, e) => {
      const c = inQ(k);
      A(1, 6 * c); A(3, 8 * c); A(12, -0.15 * outQ(k)); A(15, Math.sin(e * 7) * 0.35 * k);
      if (k > 0.6) A(3, Math.sin(e * 52) * 1.4 * (k - 0.6) / 0.4);
    });
    // where it stands on the rock is where the gap will be (or where the fire will start)
    const gx = burst ? G.clamp(P.x, 520, 760) : G.clamp(P.x + G.rrand(-240, 240), 500, 780);
    G.audio.play('whoosh'); G.fx.thud(b.x, FLOOR, 0.8, { noCrack: true });
    yield* hopBack(gx, 1, 0.5, 130);
    b.pose = 'land'; b.fast = false;
    thump(b, 0.1, 1.4);
    G.fx.dust(b.x, b.y, 3, { speed: [20, 80], size: [6, 10], up: 20, a: 0.3 });
    yield* hold(0.12, (k, dt, e) => landFollow(e, false));
    b.face = P.x >= b.x ? 1 : -1;
    const gap = [0, 170, 150, 130][B.phase], ft = [0, 1.3, 1.15, 1.0][B.phase] * T, burnT = 0.75;
    const fronts = [];
    if (!burst) {
      // it sits back and draws breath, and howls at the sky; the fire comes in from the walls
      // (the fire is known from the moment it sits: it starts at the walls the instant the howl comes)
      b.pose = 'sitDown';
      const breath = 0.32 * T;
      fronts.push(fireFront(WL + 4, gx - gap / 2, breath, ft, breath + ft + burnT));
      fronts.push(fireFront(WR - 4, gx + gap / 2, breath, ft, breath + ft + burnT));
      // (down onto its haunches first, then the chest fills and the head goes up)
      yield* hold(breath, (k) => { if (k > 0.3) b.pose = 'sit'; const c = E.inOutQuad(k); A(1, -5 * c); A(12, -0.25 * c); });
      b.pose = 'sit';
      G.audio.play('howl'); G.audio.play('ignite');
      G.fx.ripple(b.x + b.face * 30, b.y - 100, 360, 0.6, 0.9);
      G.audio.play('flame', { dur: ft + burnT });
      yield* hold(ft + burnT, (k, dt, e) => howling(e, Math.min(1, 1.6 - 1.6 * k)));
    } else {
      // up on its hind legs, pawing the air, and down on the rock; the fire starts in front of it
      b.pose = 'rakeDip';
      const tele = 0.55 * T, safe = [0, 170, 150, 130][B.phase];
      // (the fire is known from the moment it rears: it starts the instant the paws come down)
      fronts.push(fireFront(gx, WL + safe, tele, ft, tele + ft + burnT));
      fronts.push(fireFront(gx, WR - safe, tele, ft, tele + ft + burnT));
      G.audio.play('charge', { dur: tele });
      // (a dip, then up on its hind legs with its paws flung wide, as the rake's wave)
      yield* hold(tele, (k, dt, e) => {
        b.pose = k < 0.15 ? 'rakeDip' : 'rearHigh';
        if (k < 0.15) return;
        const q = (k - 0.15) / 0.85, up = Math.min(1, q * 2.2);
        A(5, Math.sin(e * 10.5) * 12 * up); A(7, -Math.sin(e * 10.5 + 0.8) * 12 * up);
        A(0, -9 * inQ(q)); A(12, -0.3 * inQ(q)); A(15, -0.25 * up);
        if (q > 0.7) A(1, Math.sin(e * 55) * 2 * (q - 0.7) / 0.3);
      });
      b.pose = 'slamDeep'; b.fast = true;
      G.audio.play('cleave'); G.audio.play('ignite');
      thump(b, 0.16, 2.4);
      G.fx.shake(8); G.fx.kick(0, 3);
      G.fx.ripple(gx, FLOOR - 20, 360, 0.4, 1);
      G.audio.play('flame', { dur: ft + burnT });
      yield* hold(ft + burnT, (k, dt, e) => { if (e > 0.1) b.pose = 'slam'; A(1, 6 * (1 - outQ(Math.min(1, k * 3)))); A(3, Math.sin(e * 6) * 1.5); A(15, 0.5 * Math.sin(e * 12) * Math.exp(-e * 5)); });
    }
    // the fire sinks; it turns to where it will go, gathers and comes down off the rock, well clear of
    // the hero
    const x2 = clampX(P.x + (P.x < 640 ? 1 : -1) * 360, 120);
    b.fast = false; b.pose = 'gather';
    if (Math.abs(x2 - b.x) > 10) b.face = x2 > b.x ? 1 : -1;
    // (it rocks back, then gathers down into a crouch)
    yield* hold(0.3, (k, dt, e) => { b.pose = k < 0.3 ? 'gather' : 'crouch'; coil(Math.max(0, (k - 0.3) / 0.7), e, 0.7, 0.4); });
    G.audio.play('whoosh');
    yield* hopBack(x2, 0, 0.5, 150);
    b.pose = 'landDeep'; b.fast = false;
    G.audio.play('paw'); G.fx.thud(b.x, FLOOR, 1.0);
    thump(b, 0.16, 2);
    if (B.phase >= 3) {
      const tint = { boss: G.pal().boss, hot: G.pal().hot };
      H.shockwave(b.x - 40, -1, 460, 46, tint); H.shockwave(b.x + 40, 1, 460, 46, tint);
      G.fx.ripple(b.x, FLOOR - 30, 300, 0.4, 0.8);
    }
    // spent: it stands panting, its fire low, open
    b.exposed = true; b.fireTo = 0.45;
    const pant = [0, 1.15, 1.0, 0.85][B.phase];
    G.audio.play('wolfPant', { n: Math.round(pant / 0.36) });
    yield* hold(pant, (k, dt, e) => {
      // (the landing taken low and run through it first, then it hangs its head and pants)
      b.pose = e < 0.2 ? 'landDeep' : 'pant';
      if (e < 0.4) landFollow(e, true);
      const br = Math.sin(e * 9);
      A(1, 3.5 * br); A(3, 2 * br); A(14, 0.15 * Math.abs(br)); A(12, 0.06 * br);
    });
    b.fireTo = 1; b.exposed = false;
  }
  // One run of fire along the floor, from x0 to x1: it starts at t0 and the front reaches x1 at t0 + dur
  // (the floor behind it burning), until endT; then it dies down. Too tall to jump; a ledge is out of it.
  function fireFront(x0, x1, t0, dur, endT) {
    const dir = G.sign(x1 - x0) || 1, H0 = 112;
    return H.add({
      kind: 'blazefront', layer: 'under', x: (x0 + x1) / 2, popVy: -620,
      front() { return x0 + (x1 - x0) * G.clamp((this.t - t0) / dur, 0, 1); },
      update(dt) {
        const f = this.front();
        this.srcX = f;
        if (this.t >= t0 && this.t < t0 + dur) {
          if (Math.random() < dt * 50) G.fx.spawn({ kind: 'spark', x: f, y: FLOOR - G.rand(4, 60), vx: dir * G.rand(100, 320), vy: -G.rand(100, 360), life: G.rand(0.2, 0.5), size: G.rand(1.5, 3), color: G.pal().hot, grav: 600 });
          if (Math.random() < dt * 8) G.fx.dust(f, FLOOR, 1, { dir, speed: [40, 160], size: [8, 13], up: 50, a: 0.32, color: '34,22,18' });
        }
        if (this.t > endT + 0.5) this.dead = true;
      },
      lit(x) { const f = this.front(); return this.t >= t0 + 0.08 && this.t < endT && (x - x0) * dir >= -6 && (f - x) * dir >= 0; },
      hits(P) {
        if (!this.lit(P.x)) return false;
        // as tall as it is drawn: the burning floor behind the front stands about 75 high, the front itself
        // about 140 (v2.1b; it used to burn 100 high all the way back, over the tips of its flames)
        // (and while the run is still short, its flames are short: they taper at its ends)
        const atFront = this.t < t0 + dur && (this.front() - P.x) * dir < 90, grow = G.clamp(Math.abs(this.front() - x0) / 80, 0.3, 1);
        return P.y > FLOOR - (atFront ? 110 : 70) * grow;
      },
      danger(P) {
        if (this.t >= endT || P.y < FLOOR - 120) return null;
        const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
        const reach = G.clamp((P.x - x0) * dir / Math.max(1, Math.abs(x1 - x0)), 0, 1);
        return [(lo + hi) / 2, (hi - lo) / 2 + 18, Math.max(0, t0 + dur * reach - this.t)];
      },
      draw(ctx) {
        if (this.t < t0) return;
        const f = this.front(), pal = G.pal();
        const die = this.t < endT ? 1 : Math.max(0, 1 - (this.t - endT) / 0.5);
        const up = Math.min(1, (this.t - t0) / 0.12);
        // the burnt floor behind the front, burning low; the front itself standing tall
        const lo = Math.min(x0, f), hi = Math.max(x0, f);
        flames(ctx, lo, hi, H0 * 0.85 * die, 0.8 * die * up, x0 * 0.01, pal);
        const fl = dir > 0 ? Math.max(lo, f - 90) : f, fh = dir > 0 ? f : Math.min(hi, f + 90);
        if (this.t < t0 + dur) flames(ctx, fl, fh + 6 * dir, H0 * 1.25, up, x0 * 0.02 + 3, pal);
      },
    });
  }

  // Emberfall (phase III, once, when it is nearly spent): it springs out of sight, the arena goes dark,
  // and it comes down on you like a falling star. The blast of its landing runs out in a ring of fire
  // that only a dash will pass.
  function* atkEmberfall() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    b.fast = false; b.pose = 'gather';
    G.audio.play('roar'); G.audio.play('charge', { dur: 0.6 });
    // (it rocks back, then sinks all the way down onto its haunches, its tail high and lashing)
    yield* hold(0.6, (k, dt, e) => { b.pose = k < 0.22 ? 'gather' : 'haunch'; coil(Math.max(0, (k - 0.22) / 0.78), e, 1.4, 1); K.aura(b.x, b.y - 30, G.pal().boss, 70, 100, 2); G.fx.shake(3); });
    b.fast = true; b.pose = 'launch'; b.trail = true;
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
    thump(b, 0.3, 3.6);
    G.fx.impact(b.x, FLOOR - 60, 0.1); G.fx.stop(0.08);
    K.impact(b.x, true);
    G.fx.ripple(b.x, FLOOR - 40, 520, 0.6, 1.4);
    H.ring({ x: b.x, y: FLOOR - 30, r: 60, speed: 520, thick: 22, maxR: 1100 });
    B.flatTo = 0;
    b.pose = 'landDeep'; b.exposed = true;
    yield* hold(1.4, (k, dt, e) => { if (e > 0.3) b.pose = 'land'; landFollow(e, true); });
    b.pose = 'land';
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
      // (pushed off, stretched out rising, falling, and reaching for where it lands)
      b.pose = k < 0.18 ? 'launch' : k < 0.55 ? 'leap' : k > 0.82 ? 'reach' : 'dive';
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
      // (a leaper's from its pose, v2.1b: the old box hung under its belly at the top of each bound)
      box() { return { cx: this.x + dir * 12, cy: FLOOR - this.h - 28, hw: 46, hh: 20 }; },
      // (only while it is drawn: not in the moment it comes out of the dark, nor as it fades into the far
      // edge; and a leaper by its body along its spine, as it is pitched through its bound; v2.1b)
      hits(P) {
        if (!this.out || this.t - eyeT < 0.055 || (far - this.x) * dir <= 40) return false;
        return leap ? spineHits(this.fig, P.box()) : G.rectsOverlap(P.box(), this.box());
      },
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
    if (at === 'land' || at === 'landDeep' || at === 'slam' || at === 'slamDeep' || at === 'skid') {
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
    } else if (at === 'biteLow' || at === 'biteHigh' || at === 'biteLowUp' || at === 'biteDrop' || at === 'toss') {
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
    wallrun: atkWallrun, emberfall: atkEmberfall, prowl: atkProwl, shake: atkShake,
    harry: atkHarry, cinders: atkCinders, blaze: atkBlaze,
    skysnap: atkSkysnap, // (only as its answer to a hero over its head: B.antiAir)
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
    // it stalks in when the hero is far off: easing into the walk and out of it, not starting and
    // stopping in one frame
    const d = Math.abs(P.x - b.x), want = d > 300 ? [0, 150, 175, 200][B.phase] : 0;
    if (want) b.ivDir = b.face;
    b.iv = G.damp(b.iv || 0, want, want ? 9 : 13, dt);
    if (b.iv > 12) { b.x = clampX(b.x + (b.ivDir || b.face) * b.iv * dt, 80); b.pose = 'walk'; }
    else { b.iv = want ? b.iv : 0; b.pose = d < 170 ? 'snarl' : 'idle'; }
  };

  B.tick = function (dt) {
    const b = B.body, P = G.player;
    // turning round: the body narrows to nothing and opens out the other way
    if (b.face !== b.lf) { b.tf = -b.tf; b.lf = b.face; }
    b.tf = G.damp(b.tf, 1, b.tfRate || 9, dt);
    b.vx = (b.x - b.lx) / Math.max(dt, 1e-4); b.vy = (b.y - b.ly) / Math.max(dt, 1e-4); b.lx = b.x; b.ly = b.y;
    // pose
    // the legs keep time with the ground: a stance sweeps a paw back 44 (walk) or 92 (gallop) units,
    // so the cycle runs at the speed the body actually covers and no paw skates
    const gsp = b.wall ? Math.abs(b.vy) : Math.abs(b.vx); // (on a wall it is climbing)
    if (b.pose === 'walk') b.walkT += Math.max(dt * 2, gsp * dt * Math.PI / (44 * B.size));
    else if (b.pose === 'run') b.walkT += Math.max(dt * 5, gsp * dt * Math.PI / (92 * B.size));
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
    // what the attack in hand adds this frame (a coil that deepens, a tremble, a lashing tail: see hold)
    if (b.add && b.add.some((v) => v)) { target = target.slice(); for (let i = 0; i < NP; i++) { target[i] += b.add[i]; b.add[i] = 0; } }
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
    if ((b.pose === 'idle' || b.pose === 'snarl') && !b.hidden && !B.dying && b.roll < 0.3) {
      // standing, it is alive: slow heavy breaths, its weight rocking a little between its legs (the
      // paws stay put: see plantFeet), its head following the hero, an ear now and then
      target = target.slice();
      const br = Math.sin(B.t * 2.3), sway = Math.sin(B.t * 0.75);
      target[1] += br * 2.4; target[3] += br * 1.2; target[0] += sway * 2.5; target[2] += sway * 2.5;
      const hy = b.y + target[1] * B.size - 30, dy = (P.y - 34) - hy, dx = Math.max(60, Math.abs(P.x - b.x));
      target[12] += G.clamp(Math.atan2(dy, dx) * 0.55, -0.4, 0.3) * (b.face * (P.x - b.x) > 0 ? 1 : 0.3);
      target[15] += Math.sin(B.t * 1.4) * 0.12;
      if (b.pose === 'snarl') target[14] += Math.abs(Math.sin(B.t * 19)) * 0.06;
      b.earT = (b.earT == null ? 2 : b.earT) - dt;
      if (b.earT < 0) { if (b.earT < -0.16) b.earT = G.rand(1.8, 4.5); else target[16] += 0.55; }
    }
    // Not every part arrives together: the legs lead, the head and neck follow a beat behind, and the
    // tail and ears trail and swing past (lower stiffness, less damping). Hit areas never read the pose.
    const loco = b.pose === 'walk' || b.pose === 'run';
    const w0 = loco ? 40 : b.fast ? 40 : 13, z = b.fast ? 0.62 : 0.82;
    for (let i = 0; i < NP; i++) {
      let w = w0 * JW[i];
      if (i === 1 || i === 3) w *= target[i] > b.p[i] + 0.5 ? 1.3 : 0.86; // what drops, drops faster
      const zi = z * JZ[i];
      b.pv[i] += ((target[i] - b.p[i]) * w * w - 2 * zi * w * b.pv[i]) * dt;
      b.p[i] += b.pv[i] * dt;
    }
    plantFeet(b, dt);
    living(b, dt);
    // (drawn only: the body drawn out along its length in a leap, bunched at the top of one; see drawWolf)
    b.str = G.damp(b.str || 0, b.air || b.trail ? (b.strTo || 0) : 0, 14, dt);
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
      if (B.ghostT <= 0) { B.ghostT = 0.035; B.ghosts.push({ x: b.x, y: b.y, face: b.face, tf: b.tf, rot: b.rot, roll: 0, p: (b.pd || b.p).slice(), a: 1, fire: 0 }); }
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
    if (b.air && !b.hidden && G.canHurt() && B.contactHits(P.box())) P.tryHit(1, b.x, b);
  };

  // ------------------------------------------------------------------ the ember bed (phase III)
  // Every few seconds the embers flare from wall to wall. They brighten and roar first. Scorched stone,
  // the ledges and the air above are safe; the floor is not. A stagger smothers them for its length.
  const FL_PERIOD = () => (K.gentle() ? 7.2 : 6.0), FL_BURN = 1.0, FL_WARN = 1.4;
  function tickEmbers(dt) {
    if (!B.embersOn) { B.flaring = false; B.warnK = 0; return; }
    // (they hold their breath for its Emberfall, and for its corrupted pack and comet: one set piece at a time)
    const held = B.attackName === 'emberfall' || B.attackName === 'pack' || B.attackName === 'ricochet' || B.attackName === 'blaze' || B.attackName === 'harry';
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
    const p = w.pd || w.p, pal = G.pal(), S = B.size * (w.sc || 1);
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
    if (real) {
      // its weight rocks over the paws that take it: nose-down over the forepaws, tail-down over the
      // hind paws (a rock about its middle would sink one end into the floor)
      const pv = (w.rec || 0) * w.face > 0 ? 62 : -54, px = w.face * pv * S * (w.rec ? 1 : 0);
      ctx.translate(px, 0); K.recoil(ctx, w); ctx.translate(-px, 0);
    }
    ctx.scale(w.face * sx * S, S);
    // drawn out long in a leap, bunched at the top of one (about its middle; drawing only)
    if (real && Math.abs(w.str || 0) > 0.002) { ctx.translate(0, -56); ctx.scale(1 + w.str, 1 - w.str * 0.6); ctx.translate(0, 56); }
    FLIP = !!w.roll && Math.cos(w.roll) < 0;
    if (w.roll) { ctx.translate(0, -54); ctx.scale(1, Math.cos(w.roll)); ctx.translate(0, 54); }
    if (!ghost) D.glow(ctx, col, 0, -70, 170, 0.14 * fire * (1 - vk));

    const liv = w.liv || null, flex = liv ? liv.flex : 0;
    const breathK = real && !w.air ? Math.sin(G.t * 2.3) : 0;
    const mx = (shX + hpX) / 2, my = (shY + hpY) / 2 - flex * 10;
    // (v2.5c) A foreleg: the shoulder's muscle slung from high on the withers down to the elbow, a lean
    // forearm, the knob of the wrist, and a pastern and paw that fold back under it as it lifts (it used
    // to be three straight pieces that never bent at the wrist). A hind leg: a heavy thigh, the gaskin
    // tapering to the point of the hock, a long cannon, and a hock that flexes as the paw comes up.
    // The paw stays where the pose puts it on the ground; only a lifted paw folds.
    const frontLeg = (fx, fy, near) => {
      const lift = G.clamp(-fy / 12, 0, 1);
      const rx = shX - 2, ry = shY + 6, wx = fx + 2 - lift * 6, wy = fy - 16 + lift * 4;
      const k = D.ik(rx, ry, wx, wy, 44, 42, 1);
      ctx.fillStyle = near ? mid : dark;
      // the shoulder: a long muscle from up on the withers to the elbow
      D.limb(ctx, shX - 4, shY - 3, k.jx, k.jy, 38, 22); ctx.fill();
      D.limb(ctx, rx, ry, k.jx, k.jy, 34, 21); ctx.fill();
      // the forearm, thick under the elbow and lean to the wrist
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 20, 11); ctx.fill();
      ctx.beginPath(); ctx.arc(k.ex, k.ey, 6.5, 0, G.TAU); ctx.fill();
      // the pastern: slanted a little forward when it stands, folded back under the wrist as it lifts
      const th = Math.PI / 2 - 0.28 + lift * 1.55, pl = 15;
      const px = k.ex + Math.cos(th) * pl, py = k.ey + Math.sin(th) * pl;
      D.limb(ctx, k.ex, k.ey, px, py, 11, 9); ctx.fill();
      // a spur of fur off the back of the elbow
      D.poly(ctx, [k.jx - 4, k.jy - 6, k.jx - 16, k.jy + 7, k.jx + 2, k.jy + 9]); ctx.fill();
      paw(lift > 0.02 ? px - 4 : fx, lift > 0.02 ? py + 4 : fy, near, lift * 1.2);
      if (near && !ghost) { ctx.strokeStyle = G.rgba(col, 0.45 * fire + 0.1); ctx.lineWidth = 1.3; D.line(ctx, k.jx + 5, k.jy + 2, k.ex + 3, k.ey); }
    };
    const hindLeg = (fx, fy, near) => {
      const lift = G.clamp(-fy / 12, 0, 1);
      // (the hock flexes up and back as the paw lifts: the cannon swings under it)
      const rx = hpX + 2, ry = hpY + 6, hx = fx - 14 - lift * 9, hy = fy - 34 + lift * 6;
      const k = D.ik(rx, ry, hx, hy, 42, 40, -1);
      ctx.fillStyle = near ? mid : dark;
      // the thigh: a heavy mass from the croup down to the stifle
      D.limb(ctx, hpX - 3, hpY + 5, k.jx, k.jy, 44, 24); ctx.fill();
      D.limb(ctx, rx, ry, k.jx, k.jy, 44, 22); ctx.fill();
      // the gaskin, tapering to the point of the hock
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 20, 10); ctx.fill();
      ctx.beginPath(); ctx.arc(k.ex, k.ey, 5.5, 0, G.TAU); ctx.fill();
      const ex = lift > 0.02 ? G.lerp(fx + 2, k.ex + 8, lift * 0.45) : fx + 2, ey = lift > 0.02 ? G.lerp(fy - 4, k.ey + 26, lift * 0.45) : fy - 4;
      D.limb(ctx, k.ex, k.ey, ex, ey, 11, 9); ctx.fill();
      D.poly(ctx, [k.ex - 2, k.ey - 8, k.ex - 13, k.ey + 2, k.ex + 3, k.ey + 6]); ctx.fill();
      paw(ex - 2, ey + 4, near, lift * 0.9);
      if (near && !ghost) { ctx.strokeStyle = G.rgba(col, 0.45 * fire + 0.1); ctx.lineWidth = 1.3; D.line(ctx, k.jx - 4, k.jy - 6, k.jx + 6, k.jy + 8); }
    };
    const paw = (fx, fy, near, curl) => {
      ctx.save(); ctx.translate(fx, fy); if (curl) ctx.rotate(curl);
      ctx.fillStyle = near ? plate : dark;
      D.poly(ctx, [-9, 0, -7, -9, 6, -10, 14, -4, 18, 0]); ctx.fill();
      ctx.fillStyle = near && !ghost ? G.rgba(hot, 0.5 + 0.3 * fire) : '#2a1d18';
      for (const cx2 of [12, 16, 19]) { D.poly(ctx, [cx2 - 3, -2, cx2 + 3, -1, cx2 - 1, 1]); ctx.fill(); }
      ctx.restore();
    };

    // the tail: a heavy brush, burning at the tip
    const tpts = [], tx0 = hpX - 20, ty0 = hpY - 2;
    let ttx = tx0, tty = ty0;
    tpts.push({ x: ttx, y: tty });
    // (v2.5c) the joints' angles from its springs (see living), or the pose's own shape for a ghost
    const tang = w.liv && w.liv.ta ? w.liv.ta : tailShape(w, new Array(TN));
    for (let i = 0; i < TN; i++) {
      ttx += Math.cos(tang[i]) * 12; tty += Math.sin(tang[i]) * 12;
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
    ctx.quadraticCurveTo(shX + 22, shY + 42 + breathK * 1.5, shX + 4, shY + 41 + breathK * 1.5);
    ctx.quadraticCurveTo(mx + 6, my + 30 + flex * 6 + breathK * 2, hpX + 18, hpY + 24);
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
    // (v2.5c) the head rides its neck on a spring (see living): where the pose puts it, plus that
    const lx = liv ? liv.hx : 0, ly = liv ? liv.hy : 0;
    const nrx = shX + 18, nry = shY - 8, hx = nrx + Math.cos(na) * nl + lx, hy = nry + Math.sin(na) * nl + ly, hr = na * 0.75 + ly * 0.012;
    // the neck: a crest that arches up from the withers to behind the ears, and a throat that falls
    // from under the jaw to the chest (it was one straight tapered bar)
    {
      const cs = Math.cos(hr), sn = Math.sin(hr), H = (x, y) => [hx + (x * cs - y * sn) * 1.18, hy + (x * sn + y * cs) * 1.18];
      const [ox, oy] = H(-8, -14), [tx2, ty2] = H(2, 10);
      const wx0 = shX - 14, wy0 = shY - 20, cx0 = shX + 26, cy0 = shY + 22;
      const dx = ox - wx0, dy = oy - wy0, dl = Math.hypot(dx, dy) || 1;
      const arc = 9 + 5 * Math.max(0, -Math.sin(na));
      ctx.fillStyle = mid;
      ctx.beginPath();
      ctx.moveTo(wx0, wy0);
      ctx.quadraticCurveTo((wx0 + ox) / 2 + dy / dl * arc, (wy0 + oy) / 2 - dx / dl * arc, ox, oy);
      ctx.lineTo(tx2, ty2);
      ctx.quadraticCurveTo((tx2 + cx0) / 2 - 4, (ty2 + cy0) / 2 + 6, cx0, cy0);
      ctx.lineTo(shX + 4, shY + 6);
      ctx.closePath(); ctx.fill();
    }
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
    const hk = real ? (w.hackle || 0) : 0; // (its hackles up: the ruff stands in spikes)
    for (let i = 0; i < mane.length; i++) { const m = mane[i]; ctx.lineTo(m.x - 6 - hk * 3, m.y - 7 - (i % 2) * 5 - hk * (i % 2 ? 9 : 5)); ctx.lineTo(m.x + 2, m.y + 3); }
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
        let ang = -Math.PI / 2 - 0.75 + Math.sin(G.t * 5 + i) * 0.16 + run;
        // shaken out, the flames thrash with whatever part is shaking
        if (real && w.shk) { const sk = w.shk, a = q < 0.35 ? sk.h : q < 0.65 ? sk.s : sk.q; ang += Math.sin(sk.ph - q * 3) * 1.0 * a; }
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
  // Where it is drawn, from its pose (v2.1b). A box round points of its own frame (x forward, y up
  // negative), taken through the same steps drawWolf takes: its facing, the turn, its pitch, its size,
  // and smaller about its feet far back in the dark. It used to be one fixed box about its middle,
  // which left its neck and head outside (a blow to the head did nothing) and hung under its belly in
  // a leap.
  function poseAt(b) {
    const tfv = b.tf == null ? 1 : b.tf, sx = Math.abs(tfv) < 0.15 ? 0.15 * (tfv < 0 ? -1 : 1) : tfv;
    const S = B.size * (b.sc || 1), fx = b.face * sx * S, c = Math.cos(b.rot || 0), s = Math.sin(b.rot || 0);
    const k = b.back > 0.01 ? 1 - 0.42 * b.back : 1;
    return (lx, ly) => { lx *= fx; ly *= S; return [b.x + (lx * c - ly * s) * k, b.y + (lx * s + ly * c) * k]; };
  }
  function poseBox(b, pts) {
    const at = poseAt(b);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < pts.length; i += 2) {
      const [x, y] = at(pts[i], pts[i + 1]);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: (x1 - x0) / 2, hh: (y1 - y0) / 2 };
  }
  const spun = (b) => !!(b.spin || b.comet); // (turning about its middle, or balled up in its comet)
  // its body and legs: hip to shoulder, the back to the belly, down to its lowest paw
  function bodyPts(p) {
    const [shX, shY, hpX, hpY] = p, top = Math.min(shY, hpY) - 22, low = Math.max(p[5], p[7], p[9], p[11], Math.max(shY, hpY) + 26);
    return [hpX - 26, top, shX + 24, top, hpX - 26, low, shX + 24, low];
  }
  B.bodyBox = function () {
    const b = B.body;
    if (spun(b)) { const c = centre(b); return { cx: c.x, cy: c.y, hw: 70 * B.size, hh: 70 * B.size }; }
    return poseBox(b, bodyPts(b.pd || b.p));
  };
  // its neck and head, out in front of the body: struck as the same target (one blow, one hit)
  function headBox(b) {
    const p = b.pd || b.p, a = p[12], len = p[13];
    const hx = p[0] + 18 + Math.cos(a) * len, hy = p[1] - 8 + Math.sin(a) * len, hr = a * 0.75;
    const mx = hx + Math.cos(hr) * 54 - Math.sin(hr) * 4, my = hy + Math.sin(hr) * 54 + Math.cos(hr) * 4;
    return poseBox(b, [p[0] + 18, Math.min(hy, p[1]) - 22, hx, hy - 24, hx, hy + 18, mx + 2, my - 14, mx + 2, my + 16]);
  }
  B.extraTargets = function (out) {
    const b = B.body;
    if (b.hidden || spun(b)) return;
    const h = headBox(b);
    out.push({ id: 'body', kind: 'body', ref: b, cx: h.cx, cy: h.cy, hw: h.hw, hh: h.hh });
  };
  // What hurts when it flies: its body, hip to shoulder, as a row of discs along its spine, so a body
  // pitched up or down hurts where it is drawn and not in the corners of a box round it (and not in the
  // air under its belly, as the old box did). box: the hero's box. (Read by tools/hitbox-check.js.)
  B.contactHits = function (box) {
    const b = B.body;
    if (spun(b)) { const c = centre(b); return G.rectsOverlap(box, { cx: c.x + b.face * 14, cy: c.y, hw: 68 * B.size, hh: 32 * B.size }); }
    return spineHits(b, box);
  };
  function spineHits(w, box) {
    const [shX, shY, hpX, hpY] = w.pd || w.p, at = poseAt(w);
    const [ax, ay] = at(hpX - 8, hpY + 3), [bx, by] = at(shX + 10, shY + 3);
    const r = 22 * B.size * (w.sc || 1) * (w.back > 0.01 ? 1 - 0.42 * w.back : 1);
    for (let i = 0; i <= 5; i++) if (G.circleRect(G.lerp(ax, bx, i / 5), G.lerp(ay, by, i / 5), r, box)) return true;
    return false;
  }
  G.BOSS_IDS.push('wolf');
})();
