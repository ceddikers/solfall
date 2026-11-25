// Solfall - The Drowned Leviathan: a sea serpent as long as the coast it drowned. Its body lies out
// at sea, behind the arena, and only its head and neck come in over the shore; the head is the one
// thing that can be struck, and it lies open after its big moves. In the second phase the sea comes
// in and the floor is water that drags at the legs; in the third the flood drains into a maelstrom
// that pulls the hero towards its eye. Staggered or toppled, it lies beached on the shore.
'use strict';
(function () {
  const { wait, tween } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards, K = G.kit, D = G.draw, DANGER = G.COL.danger;
  const WL = G.WALL_L, WR = G.WALL_R;
  const HZ = FLOOR - 170;   // the horizon, where the sea ends
  const DEPTH = 2.2;        // how quickly things shrink as they go out to sea
  const ZS = 0.2;           // nearer than this is drawn among the platforms; further, behind them
  const HH = 40;            // half the head's height (B.h / 2)
  const SEA1 = FLOOR + 18, FLOOD = FLOOR - 24, SHALLOW = FLOOR - 9;
  const WATER = '170,222,232';
  const HS = 1.15;          // the head's drawing scale

  // where a point out at sea (depth z) lands on the screen
  const proj = (x, y, z) => { const s = 1 / (1 + DEPTH * Math.max(0, z)); return { x: 640 + (x - 640) * s, y: HZ + (y - HZ) * s, s }; };
  // the snout's direction for a facing and a tilt (tilt > 0: snout down)
  const aim = (face, tilt) => (face > 0 ? tilt : Math.PI - tilt);
  const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const memo = {};
  function mix(a, b, f) {
    f = Math.round(G.clamp(f, 0, 1) * 16) / 16;
    const k = a + b + f;
    let v = memo[k];
    if (!v) { const p = rgbOf(a), q = rgbOf(b); v = memo[k] = 'rgb(' + p.map((c, i) => Math.round(c + (q[i] - c) * f)).join(',') + ')'; }
    return v;
  }
  const rgbStr = (h) => rgbOf(h).join(',');
  // the void, for its two corrupted attacks (corrupt.js loads after this file, so its colours are copied here)
  const VOIDC = '16,3,10', BLOOD = '235,30,80', VHOT = '255,206,220', VDARK = '#050003';
  const VPAL = { boss: BLOOD, hot: VHOT, far: VDARK, rim: BLOOD };
  let VOIDED = false; // while set, a length of body or a head is drawn as void: black flesh, blood in the seams
  const palNow = () => (VOIDED ? VPAL : G.pal());
  const shade = (h, P, fog) => (VOIDED ? mix(h, VDARK, 0.68) : mix(h, P.far, fog));

  // ------------------------------------------------------------------ sounds
  const AU = G.audio, S = AU.synth;
  AU.define('splash', (o) => {
    const v = (o && o.vol) || 1;
    S.noise({ dur: 0.55, vol: 0.4 * v, type: 'lowpass', f0: 2600, f1: 260, q: 0.6 });
    S.noise({ dur: 0.25, vol: 0.16 * v, type: 'highpass', f0: 3200 });
    S.tone({ type: 'sine', f0: 92, f1: 38, dur: 0.32, vol: 0.32 * v });
  });
  AU.define('spout', () => {
    S.noise({ dur: 0.6, vol: 0.34, f0: 380, f1: 3400, q: 0.7, attack: 0.04 });
    S.tone({ type: 'sine', f0: 58, f1: 120, dur: 0.4, vol: 0.26 });
  });
  AU.define('bubble', () => { S.tone({ f0: 300, f1: 900, dur: 0.06, vol: 0.08 }); S.tone({ f0: 430, f1: 1150, dur: 0.05, vol: 0.06, delay: 0.05 }); });
  AU.define('hiss', () => { S.noise({ dur: 0.45, vol: 0.16, type: 'highpass', f0: 3800, attack: 0.08 }); });
  AU.define('seaRoar', () => {
    S.tone({ type: 'sawtooth', f0: 72, f1: 36, dur: 1.5, vol: 0.22, attack: 0.1 });
    S.tone({ type: 'triangle', f0: 146, f1: 66, dur: 1.3, vol: 0.13, attack: 0.08 });
    S.noise({ dur: 1.4, vol: 0.3, type: 'lowpass', f0: 1000, f1: 180, attack: 0.1 });
  });
  AU.define('bite', () => {
    S.noise({ dur: 0.05, vol: 0.42, type: 'highpass', f0: 2400 });
    S.tone({ type: 'square', f0: 230, f1: 80, dur: 0.09, vol: 0.13 });
    S.tone({ type: 'sine', f0: 112, f1: 44, dur: 0.18, vol: 0.42 });
  });
  AU.define('lunge', () => { S.noise({ dur: 0.6, vol: 0.42, f0: 280, f1: 2600, q: 0.8 }); S.tone({ type: 'sine', f0: 120, f1: 46, dur: 0.55, vol: 0.32 }); });
  AU.define('gulp', () => { S.tone({ type: 'sine', f0: 170, f1: 66, dur: 0.18, vol: 0.26 }); S.noise({ dur: 0.12, vol: 0.12, type: 'lowpass', f0: 620, f1: 200 }); });
  AU.define('thunder', () => { S.noise({ dur: 2.4, vol: 0.26, type: 'lowpass', f0: 520, f1: 55, attack: 0.05 }); S.tone({ type: 'sine', f0: 48, f1: 28, dur: 1.8, vol: 0.2 }); });
  AU.define('drain', () => { S.noise({ dur: 1.8, vol: 0.24, f0: 1300, f1: 180, q: 1.3, attack: 0.3 }); S.tone({ type: 'sine', f0: 44, f1: 30, dur: 1.8, vol: 0.18, attack: 0.3 }); });
  // the sea drawn back off the shore: a long hiss falling away, the deep under it
  AU.define('ebb', (o) => {
    const d = (o && o.dur) || 1;
    S.noise({ dur: d, vol: 0.2, f0: 2400, f1: 260, q: 0.9, attack: d * 0.3 });
    S.noise({ dur: d * 0.9, vol: 0.08, type: 'highpass', f0: 4600, attack: d * 0.4 });
    S.tone({ type: 'sine', f0: 66, f1: 38, dur: d, vol: 0.14, attack: d * 0.3 });
  });
  // a wave rolling in: a long roar that swells and breaks
  AU.define('surf', (o) => {
    const v = (o && o.vol) || 1;
    S.noise({ dur: 1.5, vol: 0.34 * v, type: 'lowpass', f0: 1500, f1: 200, attack: 0.18 });
    S.noise({ dur: 1.0, vol: 0.12 * v, type: 'highpass', f0: 2600, attack: 0.15 });
    S.tone({ type: 'sine', f0: 58, f1: 32, dur: 1.2, vol: 0.28 * v, attack: 0.1 });
  });
  // water forced up its throat under pressure: a gurgle that climbs and tightens
  AU.define('swell', (o) => {
    const d = (o && o.dur) || 0.8;
    S.tone({ type: 'sine', f0: 80, f1: 190, dur: d, vol: 0.2, attack: d * 0.5 });
    S.noise({ dur: d, vol: 0.14, type: 'lowpass', f0: 300, f1: 900, attack: d * 0.4 });
    for (let i = 0; i < 4; i++) S.tone({ f0: 260 + i * 70, f1: 520 + i * 90, dur: 0.05, vol: 0.05, delay: d * (0.2 + i * 0.18) });
  });
  // the jet itself: a hard, steady rush of water
  AU.define('jet', (o) => {
    const d = (o && o.dur) || 0.8;
    S.noise({ dur: d, vol: 0.32, f0: 700, f1: 1200, q: 0.6, attack: 0.03 });
    S.noise({ dur: d, vol: 0.12, type: 'highpass', f0: 3400, attack: 0.03 });
    S.tone({ type: 'sawtooth', f0: 52, f1: 44, dur: d, vol: 0.1, attack: 0.04 });
  });
  // a barnacle spat out: a wet pop, and the click of shell
  AU.define('levSpit', () => {
    S.noise({ dur: 0.09, vol: 0.2, type: 'lowpass', f0: 1400, f1: 400 });
    S.tone({ type: 'sine', f0: 260, f1: 120, dur: 0.07, vol: 0.18 });
    S.tone({ type: 'square', f0: 1800, f1: 1500, dur: 0.015, vol: 0.04, delay: 0.03 });
  });
  // a barnacle bursting into spines: a dry crack of shell and a hiss of brine
  AU.define('levShell', () => {
    S.noise({ dur: 0.05, vol: 0.34, type: 'highpass', f0: 2800 });
    S.tone({ type: 'square', f0: 640, f1: 210, dur: 0.06, vol: 0.08 });
    S.noise({ dur: 0.3, vol: 0.12, type: 'highpass', f0: 4200, attack: 0.02 });
  });
  // the gyre: the bay turning, a deep churn that builds and builds
  AU.define('levChurn', (o) => {
    const d = (o && o.dur) || 3;
    S.noise({ dur: d, vol: 0.2, type: 'lowpass', f0: 500, f1: 900, attack: d * 0.2 });
    S.tone({ type: 'sine', f0: 40, f1: 52, dur: d, vol: 0.18, attack: d * 0.2 });
    S.noise({ dur: d, vol: 0.06, f0: 1800, f1: 1200, q: 2, attack: d * 0.3 });
  });
  // something huge coming up under the floor: a rumble that climbs
  AU.define('levRumble', (o) => {
    const d = (o && o.dur) || 0.8;
    S.tone({ type: 'sine', f0: 34, f1: 62, dur: d, vol: 0.3, attack: d * 0.5 });
    S.noise({ dur: d, vol: 0.16, type: 'lowpass', f0: 160, f1: 420, attack: d * 0.4 });
  });
  AU.vary.splash = 2; AU.vary.bubble = 3; AU.vary.bite = 1.5; AU.vary.spout = 1.5; AU.vary.levSpit = 2; AU.vary.levShell = 2;

  // ------------------------------------------------------------------ the arena
  G.THEMES.leviathan = [null,
    {
      name: 'LOW TIDE', scene: 'drowned',
      sky: ['#02060c', '#08182a', '#123848', '#4e8c94'],
      far: '#0c2230', near: '#07141c', pillar: '#040b10', rim: '130,226,218',
      floorTop: '#24404a', floor: '#081216',
      boss: '90,228,205', hot: '226,255,248', ember: '120,220,210', stars: 0.35,
    },
    {
      name: 'HIGH WATER', scene: 'drowned',
      sky: ['#020403', '#0a1610', '#1c3426', '#6a7a4c'],
      far: '#0e1c14', near: '#08110c', pillar: '#040906', rim: '255,206,130',
      floorTop: '#2a3424', floor: '#0a0e08',
      boss: '255,188,96', hot: '255,242,214', ember: '255,200,120', stars: 0.05,
    },
    {
      name: 'MAELSTROM', scene: 'drowned',
      sky: ['#010103', '#06050e', '#141028', '#5c5488'],
      far: '#0c0a18', near: '#06050c', pillar: '#030207', rim: '200,190,255',
      floorTop: '#24203a', floor: '#08070e',
      boss: '196,180,255', hot: '246,242,255', ember: '190,180,255', stars: 0.2,
    }, G.THEMES.warden[4]];
  G.arena.WEATHER.leviathan = { kind: 'rain', n: 170 };
  G.arena.BIRDS.leviathan = 'crow';
  G.arena.LAYOUTS.leviathan = {
    2: [[150, 130, 515], [575, 130, 466], [1000, 130, 515]], // three pieces of wreckage afloat on the flood
    3: [[54, 112, 500], [1114, 112, 500]],                     // a rock by each wall, out of the current
  };

  // The coast it drowned: a sea to the horizon, sea stacks, a drowned lighthouse and a wreck.
  G.SCENES.drowned = function (x, P, F, lcg) {
    const L = -60, R = G.W + 60, sea = F + 18;
    // headlands on the horizon
    x.fillStyle = P.far;
    x.beginPath(); x.moveTo(L, HZ + 2);
    for (let px = L; px <= R; px += 10) {
      const n = Math.sin(px * 0.011 + 1.3) * 0.5 + Math.sin(px * 0.029) * 0.3 + Math.sin(px * 0.07 + 2) * 0.2;
      x.lineTo(px, HZ + 2 - Math.max(0, n) * 24 - (px < 240 || px > 1000 ? 16 : 0));
    }
    x.lineTo(R, HZ + 2); x.closePath(); x.fill();
    // the sea
    let g = x.createLinearGradient(0, HZ, 0, F + 4);
    g.addColorStop(0, P.sky[2]); g.addColorStop(0.07, P.far); g.addColorStop(0.55, P.near); g.addColorStop(1, '#020406');
    x.fillStyle = g; x.fillRect(L, HZ, R - L, F - HZ + 6);
    // the sky's light laid on the water
    x.save(); x.translate(640, HZ); x.scale(1, 0.2);
    g = x.createRadialGradient(0, 0, 10, 0, 0, 720);
    g.addColorStop(0, G.rgba(P.rim, 0.3)); g.addColorStop(1, G.rgba(P.rim, 0));
    x.fillStyle = g; x.fillRect(-720, 0, 1440, 720); x.restore();
    // sea stacks standing out of the water, nearer ones bigger
    function stack(wx, z, h, w, seed) {
      const q = lcg(seed), b = proj(wx, sea, z), s = b.s, hh = h * s, hw = w * s / 2, j = () => (q() - 0.5) * hw * 0.3;
      const pts = [b.x - hw * 1.3, b.y + 3, b.x - hw * 1.0 + j(), b.y - hh * 0.4, b.x - hw * 0.85 + j(), b.y - hh * 0.75, b.x - hw * 0.5 + j(), b.y - hh,
        b.x - hw * 0.05, b.y - hh * 0.92, b.x + hw * 0.4 + j(), b.y - hh * 0.98, b.x + hw * 0.72 + j(), b.y - hh * 0.68, b.x + hw * 0.95 + j(), b.y - hh * 0.32, b.x + hw * 1.3, b.y + 3];
      x.fillStyle = P.pillar;
      x.beginPath(); for (let i = 0; i < pts.length; i += 2) { if (i) x.lineTo(pts[i], pts[i + 1]); else x.moveTo(pts[i], pts[i + 1]); } x.closePath(); x.fill();
      x.strokeStyle = G.rgba(P.rim, 0.22); x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(pts[8], pts[9]); x.lineTo(pts[10], pts[11]); x.lineTo(pts[12], pts[13]); x.lineTo(pts[14], pts[15]); x.stroke();
      x.fillStyle = G.rgba(P.rim, 0.12);
      x.beginPath(); x.ellipse(b.x, b.y + 1, hw * 1.5, 3 + 4 * s, 0, 0, G.TAU); x.fill();
      return { x: b.x + hw * 0.1, y: b.y - hh * 0.95, s };
    }
    stack(520, 2.6, 120, 50, 3); stack(760, 1.9, 90, 44, 5); stack(60, 1.5, 160, 70, 7);
    // the wreck: a broken hull low in the water, two masts leaning
    const wk = proj(960, sea, 1.1), ws = wk.s;
    x.fillStyle = P.pillar;
    x.beginPath(); x.moveTo(wk.x - 150 * ws, wk.y + 2); x.quadraticCurveTo(wk.x - 120 * ws, wk.y - 60 * ws, wk.x - 20 * ws, wk.y - 70 * ws);
    x.lineTo(wk.x + 30 * ws, wk.y - 48 * ws); x.lineTo(wk.x + 70 * ws, wk.y - 66 * ws); x.quadraticCurveTo(wk.x + 140 * ws, wk.y - 40 * ws, wk.x + 160 * ws, wk.y + 2); x.closePath(); x.fill();
    x.strokeStyle = P.pillar; x.lineCap = 'round';
    for (const [mx, len, lean] of [[-60, 300, -0.32], [50, 240, 0.2]]) {
      const bx = wk.x + mx * ws, by = wk.y - 60 * ws, tx = bx + Math.sin(lean) * len * ws, ty = by - Math.cos(lean) * len * ws;
      x.lineWidth = 6 * ws; x.beginPath(); x.moveTo(bx, by); x.lineTo(tx, ty); x.stroke();
      for (const k of [0.45, 0.75]) {
        const yx = G.lerp(bx, tx, k), yy = G.lerp(by, ty, k), c = Math.cos(lean), sn = Math.sin(lean);
        x.lineWidth = 3.5 * ws; x.beginPath(); x.moveTo(yx - c * 70 * ws * (1.2 - k), yy - sn * 70 * ws * (1.2 - k)); x.lineTo(yx + c * 70 * ws * (1.2 - k), yy + sn * 70 * ws * (1.2 - k)); x.stroke();
      }
      // a rag of sail still on it
      x.fillStyle = G.rgba(P.rim, 0.1);
      x.beginPath(); x.moveTo(G.lerp(bx, tx, 0.75), G.lerp(by, ty, 0.75)); x.lineTo(G.lerp(bx, tx, 0.75) + 50 * ws, G.lerp(by, ty, 0.75) + 30 * ws);
      x.lineTo(G.lerp(bx, tx, 0.5) + 34 * ws, G.lerp(by, ty, 0.5) + 60 * ws); x.lineTo(G.lerp(bx, tx, 0.5), G.lerp(by, ty, 0.5)); x.closePath(); x.fill();
    }
    x.lineCap = 'butt';
    // the drowned lighthouse, leaning on its rock; one ember still in the lamp
    const top = stack(210, 0.72, 120, 150, 11), ls = top.s;
    x.save(); x.translate(top.x, top.y + 6); x.rotate(-0.07);
    x.fillStyle = P.pillar;
    x.beginPath(); x.moveTo(-24 * ls, 0); x.lineTo(-15 * ls, -230 * ls); x.lineTo(15 * ls, -230 * ls); x.lineTo(24 * ls, 0); x.closePath(); x.fill();
    x.fillRect(-21 * ls, -246 * ls, 42 * ls, 16 * ls);
    x.beginPath(); x.moveTo(-17 * ls, -246 * ls); x.lineTo(-14 * ls, -284 * ls); x.lineTo(2 * ls, -270 * ls); x.lineTo(10 * ls, -290 * ls); x.lineTo(17 * ls, -246 * ls); x.closePath(); x.fill();
    x.strokeStyle = G.rgba(P.rim, 0.2); x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(15 * ls, -230 * ls); x.lineTo(24 * ls, 0); x.stroke();
    for (let i = 1; i < 4; i++) { x.fillStyle = G.rgba(P.rim, 0.08); x.fillRect(-18 * ls, -i * 58 * ls, 36 * ls, 4 * ls); }
    g = x.createRadialGradient(0, -262 * ls, 0, 0, -262 * ls, 40 * ls);
    g.addColorStop(0, G.rgba(P.rim, 0.55)); g.addColorStop(1, G.rgba(P.rim, 0));
    x.fillStyle = g; x.fillRect(-40 * ls, -302 * ls, 80 * ls, 80 * ls);
    x.restore();
    stack(1180, 0.42, 240, 120, 13);
  };

  // ------------------------------------------------------------------ the boss
  const B = {
    id: 'leviathan', name: 'THE DROWNED LEVIATHAN', short: 'The Leviathan', theme: 'leviathan',
    sub: 'The sea remembers the coast it swallowed', taunt: 'the tide turns again',
    blurb: 'A sea serpent that strikes from the deep',
    tips: [
      'Watch how it rears. Head held low with its snout to the ground: it strikes low, so jump. Reared up tall with its snout to the sky: it strikes high, so stay on the ground.',
      'After a lunge, a snap or a dive its head lies on the shore. Strike it then.',
      'One slap of its tail on the water: one great blow from above. Three quick shakes: three lighter ones that follow you.',
      'If it rolls sideways as it dives, the spouts come up in rows: stand in a gap, then step into the row that has finished. If it sinks straight down, they come up under you.',
      'Its jaw chatters before a double snap.',
      'In high water the floor drags at your legs. A dash is still a dash, and the wreckage is dry.',
      'If the spines on its coil stand up and rattle, the coil comes back off the far wall.',
      'In the maelstrom the current drags you towards the eye. Count how often its fin circles: twice round, and it comes up twice.',
      'Watch how far the sea draws back before a wave. Far out, the bed laid bare: a breaker too tall to jump, so dash through it. Only a little: a low swell to jump.',
      'Jaws clamped and gills flared, it is about to spit a jet. Head up high: the jet comes down from the sky to the floor, so get in under its chin. Head down by the floor: a swell runs along the floor, then the jet follows over your head, so jump the first and stay down for the second.',
      'Ride on its head, or wait on the wreckage over it, and it goes down and comes up under you. The ground heaves where it will: step off the spot.',
      'Its gills pumping while it rears for a lunge: it is holding its breath, and goes late. Wait for it.',
      'Barnacles burst a moment after they land. Its head swinging wide as it fills: they land all over. A quick tight bob: a line of them laid towards you.',
      'When it bites its way after you, watch its snout each time it draws back: down at the sand, jump; cocked up, stay down. The last bite buries its jaws. Hit it then.',
      'When it coils round the bay, the spouts come up everywhere but in the gap in its coil. Keep with the gap.',
    ],
    hudCols: [null, ['#3ad6c0', '#cffff6'], ['#ffb44a', '#ffe8c4'], ['#a896ff', '#ece6ff']],
    BASE_HP: 2900, poise0: 400, w: 128, h: 80,
    teleK: 0.9, // its warnings, against the difficulty's (v2.4d: they were easy to read)
    answer: 'volley',
    antiAir: 'breach', // (the kit: a hero riding over its head is answered by this)
    gaps: [0, 0.84, 0.7, 0.57], // (v2.4d: 0.95, 0.8, 0.65)
    bags: {
      1: ['lunge', 'snap', 'slam', 'spouts', 'snap', 'volley', 'breaker', 'jet', 'barnacles', 'thrash', 'gyre'],
      2: ['lunge', 'snap', 'slam', 'spouts', 'sweep', 'volley', 'snap', 'breaker', 'jet', 'barnacles', 'thrash', 'gyre'],
      3: ['lunge', 'snap', 'slam', 'spouts', 'sweep', 'maw', 'volley', 'maw', 'breaker', 'jet', 'barnacles', 'thrash', 'gyre'],
    },
    cards: { 2: ['HIGH WATER', 'The sea comes in'], 3: ['MAELSTROM', 'All of it goes down'] },
    first: { 1: 'lunge', 2: 'sweep', 3: 'maw' },
  };

  // ------------------------------------------------------------------ state
  B.setup = function () {
    const b = B.body;
    Object.assign(b, {
      x: 860, y: SEA1 + 260, z: 0.6, ang: -Math.PI / 2, vx: 0, vy: 0, va: 0, px: 860, py: SEA1 + 260,
      tx: 860, ty: FLOOR - 16, tz: 0, ta: Math.PI, jaw: 0, jawT: 0, direct: true, fast: false,
      hurt: false, coil: 0, fin: 0, chatter: 0, gill: 0, throat: 0, throatT: 0, beached: false, face: -1, hidden: true,
    });
    B.sea = { y: SEA1, to: SEA1 };
    B.vortex = { x: 640, tx: 640, k: 0, to: 0, spin: 0 };
    B.em = { x: 820, z: 0.7 };
    B.humps = [{ x: 280, z: 1.15, ph: 0, sp: 0.5, R: 70, dir: 1 }, { x: 1020, z: 0.8, ph: 2.4, sp: 0.42, R: 82, dir: -1 }];
    B.tail = { on: false, pose: 'under', ex: 300, ez: 0.5, aimX: 640, tipX: 300, tipY: SEA1 + 160, tipZ: 0.5, c2x: 300, c2y: SEA1 + 120, c2z: 0.5, rate: 4, shake: 0 };
    B.spine = []; B.tailPts = []; B.humpPts = [[], []];
    B.wave = null; B.wash = 0; B.bolt = null; B.boltT = 5; B.calm = 0; B.shadow = null; B.wall = null; B.finCircle = null;
    B.lastPX = G.player.x; B.front = null; B.circling = 0; B.pullK = 1;
    B.vh = null; B.under = null; b.voidEye = 0; b.voidEyeT = 0; b.voidThroat = 0;
    B.ebb = { z: 0, to: 0, sea: SEA1, hold: false };
    B.gyre = null; B.gyrePts = [];
    b.pose = Object.assign({}, POSE0); b.poseV = Object.assign({}, POSE0); b.poseT = Object.assign({}, POSE0); b.poseRel = null; b.poseName = 'rest';
    B.nk = { init: false, hx: b.x, hy: b.y, p2x: 0, p2y: 0, p2vx: 0, p2vy: 0, p1x: 0, p1y: 0, p1vx: 0, p1vy: 0 };
    B.wph = 0;
    // (v2.5c) the drawn parts' springs: see living()
    B.rig = null; B.spineD = null; B.tailD = null; B.humpD = null; B.gyreD = null; b.jawD = null;
  };

  // ------------------------------------------------------------------ poses (v2.5c: the animation pass)
  // Two layers laid over the head's springs, for the eye only:
  //  - the head's pose: how far it is drawn back along the line of its skull (back), raised (up), its
  //    snout tipped down (tip, radians; less than 0 cocks it up) and rolled over on its side (twist, 0 to
  //    1). On springs of its own, a little under-damped, so each pose overshoots and settles. It moves
  //    what is drawn and where the head is struck (skullBox: what is struck is what is drawn), never where
  //    a bite, a spit or a jet comes from: those still come from b.x, b.y, b.ang. Each attack brings it
  //    home (releasePose) before it strikes or spits, and it is held at home while the head bites (b.hurt).
  //  - the neck and coils: curl (an S wound into the neck behind the head; less than 0, arched back like
  //    a drawn bow), reach (the neck drawn out longer or bunched short), lift (the body behind surging up
  //    out of the sea, or sinking), amp and rip (the wave that travels down the body: how big, how fast).
  //    Slower springs than the head's: the coils follow a beat late.
  const POSE0 = { back: 0, up: 0, tip: 0, twist: 0, curl: 0, reach: 0, lift: 0, amp: 0, rip: 0 };
  const HEADK = ['back', 'up', 'tip', 'twist'];
  const POSE_W = { back: 13, up: 13, tip: 13, twist: 9, curl: 7, reach: 6, lift: 4.2, amp: 5, rip: 4 };
  const POSE_Z = { back: 0.5, up: 0.5, tip: 0.5, twist: 0.8, curl: 0.7, reach: 0.75, lift: 0.7, amp: 0.9, rip: 0.9 };
  // The key poses, by move. Each attack steps through its own (see the attacks); a wind-up that no other
  // move shares is what tells a player who has learned it what comes next.
  const POSES = {
    rest: {},
    // lunge, low: it draws back into itself, snout to the sand, neck wound in a tight low S, coils sunk
    lungeLowGather: { back: 26, up: -10, tip: 0.14, curl: 0.5, reach: -50, lift: -24 },
    lungeLowWind: { back: 44, up: -16, tip: 0.26, curl: 0.95, reach: -90, lift: -40, amp: 6, rip: 3 },
    lungeLowBreak: { back: 22, up: -8, tip: 0.1, curl: 0.5, reach: -50, lift: -30 },
    // lunge, high: a dip first (against the rise), then up tall, arched back like a swan, snout to the sky
    lungeHighDip: { up: -34, tip: 0.28, reach: -40, lift: -14 },
    lungeHighRear: { back: 34, up: 26, tip: -0.24, curl: -0.65, reach: 40, lift: 50, amp: 4 },
    lungeHighBreak: { back: 14, up: 12, tip: -0.06, curl: -0.3, reach: 30, lift: 40 },
    lungeStrike: { reach: 80, lift: -10 },
    lungeLie: { up: -4, tip: 0.08, curl: 0.15, reach: -20, lift: -34 },
    lungeHaul: { back: 26, up: 22, tip: -0.2, curl: 0.3, reach: -30, lift: -10 },
    // snap: the head jerks up and back, jaws agape, then a raised cobra S, snout tipping down onto the hero
    snapRecoil: { back: 34, up: 26, tip: -0.34, curl: 0.7, reach: -50, lift: 10 },
    snapAim: { back: 40, up: 14, tip: 0.1, curl: 1.0, reach: -70, lift: 16 },
    snapCock: { back: 50, up: 8, tip: 0.18, curl: 1.15, reach: -84, lift: 16 },
    snapOver: { back: -22, up: -10, tip: 0.3, curl: -0.1, reach: 50, lift: 0 },
    snapSettle: { back: -6, tip: 0.05, reach: 10 },
    snapOpen: { up: -4, tip: 0.1, curl: 0.2, lift: -16 },
    // slam: the head braced low, chin down, jaws shut, while the coils lift out at sea; it looks up as the
    // tail goes up out of sight, and flinches as the tail comes down
    slamBrace: { back: 14, up: -8, tip: 0.12, curl: 0.3, lift: 30, amp: 4 },
    slamWatch: { back: 10, up: 14, tip: -0.34, curl: 0.2, lift: 60, amp: 6 },
    // spouts
    spoutRise: { back: -10, lift: 40, reach: 40, curl: -0.3 },
    spoutTop: { up: 22, tip: -0.18, lift: 60, reach: 50, curl: -0.45 },
    spoutSink: { up: -30, lift: -70, reach: -30, curl: 0.2 },
    spoutDip: { up: -22, tip: 0.18, lift: -10, curl: 0.3 },
    spoutRoll: { twist: 1, up: 10, lift: 30, curl: -0.4, rip: 3 },
    // the breach out of the sea onto the shore (spouts, the breaker)
    breachRise: { lift: 60, curl: -0.4, reach: 30 },
    breachOver: { back: -20, tip: 0.3, lift: 40, curl: 0.3 },
    beached: { tip: 0.06, lift: -30, curl: 0.15 },
    // volley: three tosses of the head, proud and arched; or a bow to gulp, then drawn back over its neck
    volleyFan: { reach: 20, curl: -0.3, lift: 24 },
    volleyGulp: { up: -20, tip: 0.2, curl: 0.2, lift: -10 },
    volleyDraw: { back: 40, up: 26, tip: -0.35, curl: -0.7, reach: 10, lift: 30 },
    volleyThrow: { back: -24, tip: 0.22, curl: 0.2, reach: 30 },
    // sweep: head bowed to the water and the loop gathered under it, then the coils heave up in an arch
    sweepDip: { up: -16, tip: 0.25, curl: 0.3, lift: -30, reach: -30 },
    sweepHeave: { back: 26, up: -6, tip: 0.18, curl: 0.5, reach: -60, lift: 120, amp: 10, rip: 4 },
    sweepThrow: { back: -10, up: 10, tip: -0.2, curl: -0.2, reach: 20, lift: 40 },
    sweepWatch: { tip: 0.05, curl: 0.2, lift: -30, reach: 30 },
    // maw and the anti-air breach: up out of the floor jaws first
    mawRise: { lift: 50, reach: 40 },
    mawOver: { back: -15, tip: 0.25, curl: 0.25 },
    breachRecoil: { back: 30, up: 20, tip: -0.3, curl: -0.6, reach: -20, lift: 20 },
    // the breaker: tall, a bow drawn all the way back; low, a short crouch with its snout to the water
    breakerTall: { back: 20, curl: -0.85, reach: 40, lift: 90, amp: 6 },
    breakerLow: { tip: 0.2, curl: -0.2, reach: -30, lift: 10 },
    breakerHeave: { back: -20, tip: 0.3, curl: 0.6, reach: 20, lift: -60 },
    // jet, high: a bow to drink, then the neck drawn up straight and rigid, a column (not the volley's
    // arched bow); low: shoulders hunched, the coils humped up behind a short braced neck (not the
    // lunge's flat low S with the coils sunk)
    jetDrink: { up: -24, tip: 0.25, curl: 0.2, lift: -20 },
    jetHighRise: { back: 10, up: 26, tip: -0.12, curl: 0.05, reach: 60, lift: 70 },
    jetHighHold: { curl: 0.05, reach: 70, lift: 80, amp: -6, rip: 5 },
    jetLowBrace: { back: 6, up: -14, tip: 0.22, curl: 0.5, reach: -60, lift: 50, amp: 2 },
    jetLowHold: { curl: 0.55, reach: -70, lift: 70, amp: 4, rip: 5 },
    jetSpent: { up: -6, tip: 0.1, curl: 0.1, lift: -40, reach: -10 },
    // barnacles: a line, pulled in short and low with the coils down, no S (the snap's is a raised S);
    // scattered, the neck stretched out tall
    barnGulp: { up: -14, tip: 0.2, curl: 0.2, lift: -10 },
    barnLine: { back: 12, up: -10, curl: 0.25, reach: -60, lift: -40 },
    barnWide: { reach: 50, lift: 50, curl: -0.3, amp: 6 },
    // thrash: each draw-back, low or cocked up; the last a deep coiled crouch
    thrashLow: { back: 34, up: -4, tip: 0.18, curl: 0.65, reach: -50, lift: -10 },
    thrashHigh: { back: 30, up: 24, tip: -0.28, curl: -0.4, reach: -20, lift: 20 },
    thrashLast: { back: 50, up: -12, tip: 0.3, curl: 1.0, reach: -90, lift: -36, amp: 6 },
    thrashOver: { back: -18, tip: 0.12, reach: 40 },
    thrashHaul: { up: 14, tip: -0.15, curl: 0.3, reach: -20 },
    thrashStuck: { back: 6, lift: -20, curl: 0.3, amp: 8, rip: 3 },
    // gyre: up in the ring, the neck swaying as it watches
    gyreRise: { lift: 80, curl: -0.5, reach: 30 },
    gyreWatch: { lift: 60, amp: 8, rip: 1 },
    // gliding in low and fast over the shore (snap, thrash): the neck stretched out, the coils rippling
    skim: { reach: 40, lift: -24, tip: 0.06, amp: 8, rip: 4 },
    // sinking away, and the breath it takes after
    sinkRise: { tip: -0.3, up: 10, lift: 20 },
    sinkDown: { tip: 0.2, lift: -60, reach: -20 },
  };
  function pose(name, extra) {
    const b = B.body, T = b.poseT, o = typeof name === 'string' ? POSES[name] : name;
    if (!T) return;
    for (const k in POSE0) T[k] = (o && o[k] != null ? o[k] : 0) + (extra && extra[k] != null ? extra[k] : 0);
    if (typeof name === 'string') b.poseName = name;
  }
  // a pose for the neck and coils only, the head held home (while it spits or jets)
  function poseNeck(name, extra) { pose(name, extra); const T = B.body.poseT; if (T) for (const k of HEADK) T[k] = 0; }
  // a shove to the pose's springs (a rebound, a toss of the head, a heave of the coils)
  function poseKick(o) { const V = B.body.poseV; if (!V) return; for (const k in o) V[k] += o[k]; }
  // the head brought home over dur seconds, whatever its pose (it is about to strike or spit)
  function releasePose(dur) {
    const b = B.body;
    if (!b.pose) return;
    const from = {};
    for (const k of HEADK) { from[k] = b.pose[k]; b.poseT[k] = 0; }
    b.poseRel = { t: 0, dur: dur || 0.08, from };
  }
  function poseReset() {
    const b = B.body;
    if (!b.pose) return;
    pose('rest'); b.poseRel = null;
    for (const k of HEADK) { b.pose[k] = 0; b.poseV[k] = 0; }
  }
  // where the head is drawn (its pose laid over where it is)
  function viewOf(b) {
    const p = b.pose;
    if (!p) return b;
    const c = Math.cos(b.ang), s = Math.sin(b.ang), sd = c >= 0 ? 1 : -1;
    return { x: b.x - c * p.back, y: b.y - s * p.back - p.up, ang: b.ang + sd * p.tip, z: b.z };
  }
  // the tip of the snout where it is drawn (for what is only seen: drips, the glint)
  const mouthV = (b) => mouth(viewOf(b));
  // a stretch of time that is a wait (the same length), with something done each frame
  function* hold(d, fn) {
    let e = 0;
    while (e < d) { const dt = yield; e += dt; if (fn) fn(e, Math.min(1, e / d), dt); }
  }

  B.kiting = (P, b) => !!P.plat || Math.abs(P.x - b.x) > 430 || (!P.onGround && P.y < FLOOR - 150 && Math.abs(P.x - b.x) > 160);
  // over its head (the kit's anti-air timer): its head is the body, a skull on a neck that moves; the
  // hero is over it when above the skull within a little of its length, on it, hopping on it, or up on
  // the wreckage or a rock just above it. Out at sea or under the water it has no head to ride.
  B.overhead = (P, b) => !b.hidden && !b.beached && b.z < 0.06 && Math.abs(P.x - b.x) < B.w / 2 + 70 && P.y < b.y - HH * 1.7 && P.y > b.y - HH * 2 - 330;
  B.onRelease = function () {
    const b = B.body;
    b.hurt = false; b.coil = 0; b.chatter = 0; b.fin = 0; b.throatT = 0; b.fast = false; b.direct = false;
    pose('rest');
    if (B.tail.on && B.tail.pose !== 'under') { B.tail.pose = 'under'; B.tail.rate = 3; }
    B.finCircle = null; B.pullK = 1; B.ebb.hold = false;
    if (B.gyre) B.gyre.to = 0;
    letGoVoid();
  };
  B.onInterrupt = function () {
    B.finCircle = null; B.tail.pose = 'under'; B.tail.rate = 3; B.ebb.hold = false;
    if (B.gyre) B.gyre.to = 0;
    poseReset();
    // (the hazards were just cleared: the hydra's crack is put back to seal itself, not cut off)
    if (B.vh) { const c = voidCrack(B.vh.root, 0.01); c.t = 0.01; c.closing = true; c.holds = B.vh; }
    letGoVoid();
  };
  // its corrupted attacks let go: the void head drops back down its crack, the black water drains
  function letGoVoid() {
    const b = B.body;
    b.voidEyeT = 0; b.voidThroat = 0;
    if (B.vh) B.vh.gone = true;
    if (B.under) { B.under.to = 0; }
  }
  B.onHit = function (dmg, info) {
    // water flies off the head where the blow lands
    G.fx.burst(info.x, info.y, { n: 5, color: WATER, kind: 'spark', speed: [120, 380], angle: -Math.PI / 2, spread: 2.4, life: [0.25, 0.5], size: [1.4, 2.6], grav: 1300, a: 0.6 });
    // (drawn only) the jaw knocked open, the chains on the head flung, the neck shoved after the blow
    rigKick(G.sign(B.body.x - info.x) || -B.body.face, 0, G.clamp(0.5 + dmg / 60, 0.5, 1.4));
  };

  const facePlayer = () => (G.player.x >= B.body.x ? 1 : -1);
  const level = (z) => (z > 0.04 ? B.sea.y : Math.min(B.sea.y, FLOOR));
  const flooded = () => B.sea.y < FLOOR - 12;
  function target(x, y, z, ang) {
    const b = B.body;
    b.direct = false; b.tx = x; b.ty = y; b.tz = z;
    if (ang != null) b.ta = ang;
  }
  function* glide(x, y, z, ang, maxT, fast) {
    const b = B.body;
    target(x, y, z, ang); b.fast = !!fast;
    let e = 0;
    while (e < maxT) {
      e += yield;
      if (e > 0.15 && Math.hypot(b.tx - b.x, b.ty - b.y) < 14 && Math.abs(b.z - b.tz) < 0.02) break;
    }
  }
  // the tip of the snout, in the arena
  function mouth(b) {
    const c = Math.cos(b.ang), s = Math.sin(b.ang);
    return { x: b.x + c * 96 * HS, y: b.y - HH + s * 96 * HS + (c >= 0 ? 4 : 4) };
  }

  // ------------------------------------------------------------------ effects
  function splash(x, y, power, dir) {
    const p = power || 1;
    G.fx.burst(x, y, { n: Math.round(16 * p), color: WATER, kind: 'spark', speed: [180, 300 + 300 * p], angle: -Math.PI / 2 + (dir || 0) * 0.5, spread: 1.6, life: [0.4, 0.9], size: [1.6, 3.2], grav: 1400, a: 0.6 });
    G.fx.burst(x, y, { n: Math.round(5 * p), color: WATER, speed: [60, 200 + 100 * p], angle: -Math.PI / 2, spread: 2.2, life: [0.4, 0.9], size: [3, 7], grav: 900, a: 0.4 });
    G.fx.dust(x, y, Math.round(2 + 2 * p), { speed: [30, 150], size: [8, 14], life: [0.5, 1], up: 70, a: 0.2, color: '150,190,200' });
  }
  function splashAt(x, z, power) { const q = proj(x, B.sea.y, z); splash(q.x, q.y, (power || 1) * Math.max(0.4, q.s)); }
  function crash(x, power) {
    const p = power || 1;
    G.fx.shake(8 + 6 * p); G.fx.kick(0, 3.5 * p);
    G.audio.play('slam'); G.audio.play('splash');
    G.fx.thud(x, FLOOR, 1.1 * p, { col: G.pal().boss });
    splash(x, FLOOR - 6, p);
    G.fx.ripple(x, FLOOR - 30, 200 * p, 0.4, 0.9);
    // (drawn only) the head come down hard: the jaw jolts open, the neck slumps after it
    if (Math.abs(x - B.body.x) < 240) rigKick(0, 1, p);
  }

  // ------------------------------------------------------------------ hazards of its own
  // A spout: the floor boils, then a column of water is torn up from it to the top of the sky.
  // The boiling and a rim are the warning (it comes from under the floor, where nothing shows).
  //   dim: (the gyre, a whole shore of them at once) drawn fainter and thrown up with less spray, so a
  //   curtain of them does not light the screen
  function spout(x, w, tele, dim) {
    const dk = dim || 1;
    return H.add({
      kind: 'spout', x, w, tele, active: 0.45, layer: 'under', fired: false, dim: dk,
      update(dt) {
        this.srcX = this.x;
        if (this.t < this.tele && Math.random() < dt * 22) G.fx.spawn({ x: this.x + G.rand(-this.w * 0.4, this.w * 0.4), y: level(0) - 2, vx: G.rand(-10, 10), vy: -G.rand(40, 120), life: G.rand(0.2, 0.45), size: G.rand(1.4, 2.6), color: WATER, a: 0.5 });
        if (this.t >= this.tele && !this.fired) {
          this.fired = true;
          G.audio.play('spout'); G.fx.shake(5 * dk); G.fx.kick(0, -2 * dk);
          splash(this.x, level(0) - 4, 1.1 * dk);
          G.fx.ripple(this.x, FLOOR - 140, 170, 0.3, 0.7);
        }
        if (this.fired && this.t < this.tele + this.active && Math.random() < dt * 40 * dk) {
          G.fx.spawn({ kind: 'spark', x: this.x + G.rand(-this.w / 2, this.w / 2), y: G.rand(40, FLOOR - 40), vx: G.rand(-160, 160), vy: G.rand(-200, 40), life: G.rand(0.3, 0.6), size: G.rand(1.4, 2.6), color: WATER, grav: 1200, a: 0.5 });
        }
        if (this.t > this.tele + this.active + 0.45) this.dead = true;
      },
      hits(P) { return this.t >= this.tele && this.t < this.tele + this.active && inColumn(P, this.x, this.w, this.t - this.tele); },
      danger() { return this.t < this.tele + this.active ? [this.x, this.w / 2 + 16, this.tele - this.t] : null; },
      draw(ctx) { drawColumn(ctx, this.x, this.w, this.t, this.tele, this.active, this.dim); },
    });
  }
  // Where a column (a spout, the maw) is water, for its hit: as high as it has been torn up so far
  // (it reaches the top of the sky in 0.08 s), and across the part of its width that is drawn as water
  // (its edges fade to nothing: about the middle seven tenths shows). It used to cut the whole width
  // to the top of the sky from its first frame (v2.1b).
  function inColumn(P, x, w, e) {
    const up = Math.min(1, e / 0.08), cw = w * (0.5 + 0.5 * up);
    const top = G.lerp(level(0) - 1, -60, E.outCubic(up)) - 14;
    return P.y - 2 > top && Math.abs(P.x - x) < cw * 0.36 + 4;
  }
  function drawColumn(ctx, x, w, t, tele, active, dim) {
    const P = G.pal(), F = level(0) - 1;
    if (t < tele) {
      const k = t / tele;
      ctx.fillStyle = G.rgba(WATER, 0.07 + 0.13 * k);
      ctx.beginPath(); ctx.ellipse(x, F, w / 2 * (0.4 + 0.6 * k), 8, 0, 0, G.TAU); ctx.fill();
      ctx.strokeStyle = G.rgba(DANGER, 0.22 + 0.5 * k); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, F, w / 2, 8, 0, 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = G.rgba(WATER, 0.45); ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const bx = x + Math.sin(i * 2.1 + t * 3) * w * 0.34, by = F - ((t * 80 + i * 13) % 34) * (0.4 + k);
        ctx.beginPath(); ctx.arc(bx, by, 1.6 + (i % 3), 0, G.TAU); ctx.stroke();
      }
      return;
    }
    const e = t - tele, up = Math.min(1, e / 0.08), f0 = e < active ? 1 : Math.max(0, 1 - (e - active) / 0.45), f = f0 * (dim || 1);
    const cw = w * (0.5 + 0.5 * up) * (0.85 + 0.15 * f0);
    // the top falls back once it is spent
    const topY = e < active ? G.lerp(F, -60, E.outCubic(up)) : G.lerp(-60, F, E.inQuad(Math.min(1, (e - active) / 0.45)));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
    g.addColorStop(0, G.rgba(WATER, 0)); g.addColorStop(0.25, G.rgba(WATER, 0.2 * f)); g.addColorStop(0.5, G.rgba(P.hot, 0.24 * f)); g.addColorStop(0.75, G.rgba(WATER, 0.2 * f)); g.addColorStop(1, G.rgba(WATER, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - cw / 2, F);
    for (let y = F; y > topY; y -= 24) ctx.lineTo(x - cw / 2 + Math.sin(y * 0.05 + t * 18) * 4, y);
    ctx.lineTo(x, topY - 14);
    for (let y = topY; y < F; y += 24) ctx.lineTo(x + cw / 2 + Math.sin(y * 0.05 - t * 16) * 4, y);
    ctx.lineTo(x + cw / 2, F); ctx.closePath(); ctx.fill();
    // water running up it
    ctx.strokeStyle = G.rgba(P.hot, 0.16 * f); ctx.lineWidth = 2;
    ctx.setLineDash([26, 40]); ctx.lineDashOffset = e * 1100;
    for (const o of [-0.28, -0.08, 0.14, 0.3]) { ctx.beginPath(); ctx.moveTo(x + o * cw, F); ctx.lineTo(x + o * cw, topY); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.fillStyle = G.rgba(WATER, 0.3 * f);
    ctx.beginPath(); ctx.ellipse(x, F, cw * 0.8, 11, 0, 0, G.TAU); ctx.fill();
    ctx.restore();
  }

  // The tail coming down from above the screen: its shadow grows on the floor and water rains from
  // it (it is out of sight until it lands, so it gets a drawn warning). The column reaches the top.
  function tailfall(x, w, tele, lock, dmg) {
    const P = G.player;
    return H.add({
      kind: 'tailfall', x, w, tele, lock, dmg, active: 0.14, layer: 'under',
      update(dt) {
        this.srcX = this.x;
        if (this.t < this.tele - this.lock) this.x = G.damp(this.x, G.clamp(P.x, WL + 70, WR - 70), 6, dt);
        B.tail.aimX = this.x;
        if (this.t < this.tele && Math.random() < dt * 30) G.fx.spawn({ kind: 'spark', x: this.x + G.rand(-this.w * 0.4, this.w * 0.4), y: -10, vx: 0, vy: G.rand(500, 800), life: 1.2, size: G.rand(1.2, 2.2), color: WATER, grav: 900, a: 0.5 });
        if (this.t > this.tele + this.active) this.dead = true;
      },
      // the fluke lies flat across the whole width on the floor; above it, only the tail itself cuts
      // (it used to cut a column the whole width up to the top of the sky, mostly empty air: v2.1b)
      hits(Pl) { return this.t >= this.tele && ((B.tail.tipY > FLOOR - 50 && Math.abs(Pl.x - this.x) < Math.min(this.w / 2 - 4, 70) && Pl.y > FLOOR - 43) || tailTouches(Pl)); },
      danger() { return [this.x, this.w / 2 + 18, this.tele - this.t]; },
      draw(ctx) {
        if (this.t >= this.tele) return;
        const k = Math.min(1, this.t / this.tele), F = level(0) - 1;
        ctx.fillStyle = 'rgba(0,0,0,' + (0.18 + 0.3 * k) + ')';
        ctx.beginPath(); ctx.ellipse(this.x, F, this.w / 2 * (0.5 + 0.5 * k), 10, 0, 0, G.TAU); ctx.fill();
        ctx.strokeStyle = G.rgba(DANGER, 0.2 + 0.55 * k); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(this.x, F, this.w / 2, 10, 0, 0, G.TAU); ctx.stroke();
        const g = ctx.createLinearGradient(0, 0, 0, F);
        g.addColorStop(0, 'rgba(0,0,0,' + 0.2 * k + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(this.x - this.w / 2, -60, this.w, F + 60);
      },
    });
  }

  // Whether the near part of the tail (what is drawn among the platforms) is on the hero.
  function tailTouches(Pl) {
    const pts = B.tailPts;
    if (!B.tail.on) return false;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], c = pts[i];
      if (a.z > ZS || c.z > ZS) continue;
      const pa = proj(a.x, a.y, a.z), pc = proj(c.x, c.y, c.z), r = (a.w * pa.s + c.w * pc.s) / 4;
      for (const py of [Pl.y - 21, Pl.y - 39, Pl.y - 3]) if (G.distPointSeg(Pl.x, py, pa.x, pa.y, pc.x, pc.y) < r + 9) return true;
    }
    return false;
  }

  // A loop of its body that breaks the surface and rolls along the floor (jump it). If its spines
  // stand up and rattle, it comes back off the far wall.
  function hump(x, dir, speed, back) {
    const pts = [];
    return H.add({
      kind: 'wave', x, y: FLOOR, dir, speed, hgt: 56, back, layer: 'under', srcX: x, rise: 0, sinking: 0,
      update(dt) {
        this.rise = Math.min(1, this.t / 0.3) * (1 - this.sinking);
        this.x += this.dir * this.speed * G.lerp(0.4, 1, Math.min(1, this.t / 0.3)) * dt;
        this.srcX = this.x - this.dir * 30;
        if (Math.random() < dt * 40) G.fx.spawn({ kind: 'spark', x: this.x + this.dir * 50, y: level(0) - 4, vx: this.dir * G.rand(100, 300), vy: -G.rand(150, 420), life: G.rand(0.3, 0.6), size: G.rand(1.4, 2.6), color: WATER, grav: 1300, a: 0.6 });
        if (this.sinking) { this.sinking = Math.min(1, this.sinking + dt * 3); if (this.sinking >= 1) this.dead = true; return; }
        if ((this.dir > 0 && this.x > WR - 70) || (this.dir < 0 && this.x < WL + 70)) {
          splash(this.x + this.dir * 40, level(0) - 4, 1.1, -this.dir); G.fx.shake(6); G.audio.play('splash');
          if (this.back) { this.back = false; this.dir = -this.dir; } else this.sinking = 0.01;
        }
      },
      hits(P) { return this.rise > 0.5 && G.rectsOverlap(P.box(), { cx: this.x, cy: FLOOR - 25, hw: 40, hh: 23 }); },
      draw(ctx) {
        const R = 76, top = 52 * this.rise, lv = level(0);
        for (let k = 0; k <= 12; k++) {
          const u = this.dir > 0 ? k / 12 : 1 - k / 12, s = Math.sin(Math.PI * u);
          const q = pts[k] || (pts[k] = {});
          q.x = this.x + (u - 0.5) * 2 * R + this.dir * 16 * s; q.y = FLOOR + 34 - s * (top + 34 + (lv < FLOOR ? 0 : 0)); q.z = 0; q.w = 46;
        }
        drawChain(ctx, pts, false, { fin: this.back ? 1 : 0 });
      },
    });
  }

  // The jaws come up out of the eye of the maelstrom (third phase).
  function maw(x, w, tele, track) {
    const P = G.player;
    return H.add({
      kind: 'maw', x, w, tele, track, active: 0.4, dmg: 2, layer: 'under',
      update(dt) {
        this.srcX = this.x;
        if (this.track && this.t < this.tele - 0.32) this.x = G.damp(this.x, G.clamp(P.x, WL + 100, WR - 100), 5, dt);
        if (this.t < this.tele && Math.random() < dt * 26) G.fx.spawn({ x: this.x + G.rand(-this.w, this.w), y: level(0) - 2, vx: G.rand(-20, 20), vy: -G.rand(40, 140), life: G.rand(0.2, 0.5), size: G.rand(1.6, 3), color: WATER, a: 0.5 });
        if (this.t > this.tele + this.active + 0.4) this.dead = true;
      },
      hits(Pl) { return this.t >= this.tele && this.t < this.tele + this.active && inColumn(Pl, this.x, this.w * 2, this.t - this.tele); },
      danger() { return this.t < this.tele + this.active ? [this.x, this.w + 18, this.tele - this.t] : null; },
      draw(ctx) {
        const F = level(0) - 1, Pp = G.pal();
        if (this.t < this.tele) {
          const k = this.t / this.tele;
          // the water turns round on itself, and two eyes show under it
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            const a = this.t * (5 + 6 * k) + i * 2.1;
            ctx.strokeStyle = G.rgba(WATER, 0.2 + 0.25 * k);
            ctx.beginPath(); ctx.ellipse(this.x, F, this.w * (0.4 + 0.2 * i) * (0.6 + 0.4 * k), 9, 0, a, a + 2.2); ctx.stroke();
          }
          ctx.strokeStyle = G.rgba(DANGER, 0.22 + 0.5 * k);
          ctx.beginPath(); ctx.ellipse(this.x, F, this.w, 11, 0, 0, G.TAU); ctx.stroke();
          for (const d of [-1, 1]) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.3 + 0.5 * k;
            ctx.drawImage(G.fx.glow(Pp.boss), this.x + d * 22 - 12, F - 7, 24, 14);
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          }
          return;
        }
        drawColumn(ctx, this.x, this.w * 2, this.t, this.tele, this.active);
      },
    });
  }

  // A wave rolling along the shore (dir +1: to the right). Tall, a breaker over the head of anyone on the
  // floor or the wreckage, to be dashed through; low, a swell to jump. It is drawn over the platforms
  // (B.drawOver), breaks on the far wall, and leaves foam behind it.
  function roller(x0, dir, tall, speed) {
    const hgt = tall ? 400 : 52, back = tall ? 96 : 66;
    return H.add({
      kind: tall ? 'breaker' : 'wave', roller: true, tall, x: x0, x0, dir, speed, hgt, layer: 'none', srcX: x0, rise: 0, crash: 0,
      update(dt) {
        this.rise = Math.min(1, this.t / (tall ? 0.45 : 0.3));
        if (!this.crash) {
          this.x += this.dir * this.speed * G.lerp(0.5, 1, this.rise) * dt;
          const lipY = FLOOR - this.hgt * this.rise * 0.88;
          if (Math.random() < dt * (tall ? 80 : 34)) G.fx.spawn({ kind: 'spark', x: this.x + this.dir * G.rand(0, tall ? 46 : 12), y: lipY + G.rand(-10, 10), vx: this.dir * G.rand(80, 320), vy: -G.rand(60, tall ? 380 : 200), life: G.rand(0.4, 0.8), size: G.rand(1.4, 2.8), color: WATER, grav: 1200, a: 0.55 });
          if (Math.random() < dt * 26) G.fx.spawn({ x: this.x - this.dir * G.rand(20, back + 160), y: FLOOR - G.rand(1, 6), vx: this.dir * G.rand(20, 90), vy: 0, life: G.rand(0.5, 1), size: G.rand(2, 4), color: WATER, a: 0.32 });
          if (tall && Math.random() < dt * 8) G.fx.shake(2);
          // it breaks on the far wall
          if ((this.dir > 0 && this.x > WR - 8) || (this.dir < 0 && this.x < WL + 8)) {
            this.crash = 0.001;
            G.audio.play('splash'); if (tall) G.audio.play('slam');
            G.fx.shake(tall ? 14 : 6); G.fx.kick(this.dir * (tall ? 5 : 2), 0);
            for (let i = 0; i < (tall ? 5 : 2); i++) splash(this.x - this.dir * 10, FLOOR - 10 - i * (tall ? 70 : 20), tall ? 1.3 : 0.7, -this.dir);
            if (tall) G.fx.ripple(this.x, FLOOR - 160, 260, 0.4, 1);
          }
        } else {
          this.crash += dt * (tall ? 1.6 : 2.6);
          if (this.crash >= 1) this.dead = true;
        }
        this.srcX = this.x - this.dir * 40;
      },
      hits(P) {
        if (this.crash || this.rise < 0.45) return false;
        const b = P.box(), a = this.x - this.dir * back, c = this.x + this.dir * 12;
        // (as high as its lip is drawn: the tall one's whole height was 40 px of air over its crest, v2.1b)
        return b.cx + b.hw > Math.min(a, c) && b.cx - b.hw < Math.max(a, c) && b.cy + b.hh > FLOOR - this.hgt * this.rise * (tall ? 0.9 : 0.85);
      },
      // (the breaker, for the scripted dodger: the ground just ahead of it is unsafe, so it gets behind it)
      danger(P) {
        if (!tall || this.crash) return null;
        const ahead = (P.x - this.x) * this.dir;
        if (ahead < -back - 10 || ahead > 640) return null;
        const a = this.x - this.dir * back, c = this.x + this.dir * 640;
        return [(a + c) / 2, (back + 640) / 2 + 6, Math.max(0, ahead) / this.speed];
      },
    });
  }

  // A jet of brine from its jaws. The attack sets where it comes from and where it points (ox, oy, ang)
  // every frame, from the head, so the jet goes where the head goes. front: how far the water has got.
  function jet() {
    return H.add({
      kind: 'jet', ox: 0, oy: 0, ang: 0, ex: 0, ey: 0, width: 30, front: 3000, on: false, k: 0, warn: 0, layer: 'under',
      srcX: 0, xc: null, vc: 0, done: false, len: 0,
      col() { return G.corrupt.active() ? BLOOD : WATER; },
      update(dt) {
        this.k = G.damp(this.k, this.on ? 1 : 0, this.on ? 24 : 10, dt);
        const c = Math.cos(this.ang), s = Math.sin(this.ang);
        let len = this.front;
        this.grounded = false;
        if (s > 0.02) { const Lf = (FLOOR - this.oy) / s; if (Lf < len) { len = Lf; this.grounded = true; } }
        this.walled = false;
        const Lw = c > 0.02 ? (WR - this.ox) / c : c < -0.02 ? (WL - this.ox) / c : 1e9;
        if (Lw < len) { len = Lw; this.walled = true; this.grounded = false; }
        len = Math.max(0, len);
        if (this.on) { this.lenOn = len; this.wasOn = true; } else if (this.wasOn) len = Math.min(len, this.lenOn);
        this.len = len;
        this.ex = this.ox + c * len; this.ey = this.oy + s * len; this.srcX = this.ox;
        // where it crosses a standing hero's middle, and how fast that point moves (for the dodger)
        const u = Math.abs(s) > 1e-3 ? (FLOOR - 22 - this.oy) / s : -1;
        const xc = u > 0 && u <= len ? this.ox + c * u : null;
        if (xc != null && this.xc != null && this.on) this.vc = G.damp(this.vc, (xc - this.xc) / Math.max(dt, 1e-4), 25, dt);
        else if (xc == null) this.vc = 0;
        this.xc = xc;
        if (this.on && this.k > 0.5) {
          const col = this.col();
          if ((this.grounded || this.walled) && Math.random() < dt * 60) G.fx.spawn({ kind: 'spark', x: this.ex, y: this.ey - 4, vx: (this.grounded ? c * G.rand(60, 300) : -c * G.rand(40, 200)) + G.rand(-120, 120), vy: -G.rand(160, 520), life: G.rand(0.35, 0.7), size: G.rand(1.6, 3), color: col, grav: 1300, a: 0.6 });
          if (this.grounded && (this.sx == null || Math.abs(this.ex - this.sx) > 46)) { this.sx = this.ex; G.fx.dust(this.ex, FLOOR, 1, { speed: [20, 90], size: [6, 12], life: [0.4, 0.8], up: 60, a: 0.22, color: '150,190,200' }); }
          if (Math.random() < dt * 30) { const q = Math.random(); G.fx.spawn({ kind: 'spark', x: G.lerp(this.ox, this.ex, q), y: G.lerp(this.oy, this.ey, q), vx: c * 200 + G.rand(-40, 40), vy: s * 200 + G.rand(-60, 30), life: G.rand(0.2, 0.4), size: G.rand(1.2, 2), color: col, grav: 900, a: 0.45 }); }
        }
        if (this.done && this.k < 0.02) this.dead = true;
      },
      hits(P) { return this.on && this.k > 0.6 && this.len > 4 && G.distPointSeg(P.x, P.y - 22, this.ox, this.oy, this.ex, this.ey) < this.width / 2 + 9; },
      danger(P) {
        if (!this.on || this.xc == null) return null;
        const hw = this.width / 2 + 22;
        // (the first moment it crosses, before its speed is known, the attack's word for which way it goes)
        let v = this.vc;
        if (this.sd && this.stop != null) {
          // all the ground between it and where the attack will stop it is still to be crossed
          const a = this.xc, c = this.stop;
          if ((c - a) * this.sd <= 0) return [a, hw, 0];
          return [(a + c) / 2, Math.abs(c - a) / 2 + hw, Math.max(0, (P.x - a) * this.sd) / Math.max(Math.abs(v), 600)];
        }
        if (Math.abs(v) < 60) return [this.xc, hw, 0];
        // sweeping: the ground it has yet to cross is what is unsafe
        const sd = Math.sign(v), reach = G.clamp(Math.abs(v) * 0.5, 80, 640);
        return [this.xc + sd * reach / 2, reach / 2 + hw, Math.max(0, (P.x - this.xc) * sd) / Math.abs(v)];
      },
      draw(ctx) { drawJet(ctx, this); },
    });
  }

  // The ground over it as it rises under the hero (the breach): it darkens and heaves, following the
  // hero, then holds still a moment before the jaws come up through it. A column from the floor to the
  // top of the sky: up on the wreckage or in the air is no safer than the floor. It comes from under
  // the ground, where nothing shows, so the heave is drawn, with a rim in the warning colour.
  function heave(x, w, tele, lock) {
    const P = G.player;
    return H.add({
      kind: 'heave', x, w, tele, lock, active: 0.34, layer: 'under',
      update(dt) {
        this.srcX = this.x;
        if (this.t < this.tele - this.lock) this.x = G.damp(this.x, G.clamp(P.x, WL + 80, WR - 80), 5.5, dt);
        // grit and water shaken up off it, more as it nears
        const k = Math.min(1, this.t / this.tele);
        if (this.t < this.tele && Math.random() < dt * (6 + 30 * k)) {
          G.fx.spawn({ kind: 'spark', x: this.x + G.rand(-this.w * 0.45, this.w * 0.45), y: level(0) - 2, vx: G.rand(-40, 40), vy: -G.rand(60, 200 + 260 * k), life: G.rand(0.25, 0.5), size: G.rand(1.2, 2.4), color: flooded() ? WATER : '150,150,140', grav: 1300, a: 0.5 });
        }
        if (this.t < this.tele && Math.random() < dt * 10 * k) G.fx.shake(1.5);
        if (this.t > this.tele + this.active + 0.3) this.dead = true;
      },
      hits(Pl) { return this.t >= this.tele && this.t < this.tele + this.active && Math.abs(Pl.x - this.x) < this.w / 2 - 6; },
      danger() { return this.t < this.tele + this.active ? [this.x, this.w / 2 + 18, this.tele - this.t] : null; },
      // (once the jaws are through, the torn ground settles back over a moment)
      draw(ctx) {
        if (this.t < this.tele) drawHeave(ctx, this);
        else if (this.t < this.tele + 0.22) { ctx.save(); ctx.globalAlpha = 1 - (this.t - this.tele) / 0.22; drawHeave(ctx, this); ctx.restore(); }
      },
    });
  }
  function drawHeave(ctx, h) {
    const P = G.pal(), F = level(0) - 1, k = Math.min(1, h.t / h.tele), wet = flooded();
    const held = h.t > h.tele - h.lock ? (h.t - (h.tele - h.lock)) / h.lock : 0;
    const x = h.x + (held ? Math.sin(h.t * 70) * 1.5 * held : 0);
    // the floor going dark over something huge
    ctx.save();
    ctx.translate(x, F); ctx.scale(1, 0.16);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, h.w * 0.9);
    g.addColorStop(0, 'rgba(0,0,0,' + (0.2 + 0.45 * k) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, h.w * 0.9, 0, G.TAU); ctx.fill();
    ctx.restore();
    // the heave: the ground (or the flood) bulging up over it, cracked across its top
    const hh = (3 + 13 * k * k) * (1 + 0.12 * Math.sin(h.t * 34));
    ctx.fillStyle = wet ? G.rgba(rgbStr(P.near), 0.75) : 'rgba(9,14,16,0.92)';
    ctx.beginPath(); ctx.moveTo(x - h.w * 0.62, F + 2); ctx.quadraticCurveTo(x, F - hh * 2, x + h.w * 0.62, F + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = wet ? G.rgba(WATER, 0.3 + 0.3 * k) : G.rgba(P.rim, 0.25 + 0.3 * k); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - h.w * 0.62, F + 2); ctx.quadraticCurveTo(x, F - hh * 2, x + h.w * 0.62, F + 2); ctx.stroke();
    if (!wet && k > 0.3) {
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const o of [-0.34, -0.1, 0.16, 0.38]) { const cx = x + o * h.w, cy = F - hh * (1 - o * o * 3.2); ctx.moveTo(cx, cy); ctx.lineTo(cx + o * 12, cy + 4 + 6 * k); }
      ctx.stroke();
    }
    // the rim in the warning colour, and late, two eyes in the dark under it
    ctx.strokeStyle = G.rgba(DANGER, 0.2 + 0.5 * k); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, F, h.w / 2, 9, 0, 0, G.TAU); ctx.stroke();
    if (k > 0.55) {
      const a = (k - 0.55) / 0.45 * G.clamp(1 - (h.t - h.tele) / 0.22, 0, 1), a0 = ctx.globalAlpha;
      ctx.globalCompositeOperation = 'lighter';
      for (const d of [-1, 1]) { ctx.globalAlpha = 0.45 * a * a0; ctx.drawImage(G.fx.glow(P.boss), x + d * 20 - 10, F - 6, 20, 12); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  // A barnacle (the barnacles): spat out, it sticks where it strikes (the floor, a wall, the wreckage)
  // and bursts into a crown of spines when its fuse runs out. It is a thing thrown, so its slit burns
  // in the warning colour, faster as it nears; once it has stuck, a blade cracks it open harmlessly.
  //   side: 0 on the floor or the wreckage (spines up), 1 on the west wall, -1 on the east (spines out)
  //   tx: where it was spat at; it is caught by the wreckage only if that is where it was aimed (one
  //   aimed past the wreckage flies by it)
  function barnacle(x, y, vx, vy, fuse, tx) {
    return H.add({
      kind: 'barnacle', x, y, vx, vy, fuse, tx, r: 10, state: 'fly', st: 0, bt: 0, side: 0, plat: null, slashable: false, srcX: x, spin: G.rand(0, 6),
      update(dt) {
        if (this.state === 'fly') {
          const py = this.y;
          this.vy += 1300 * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.spin += dt * 9;
          this.srcX = this.x;
          if (Math.random() < dt * 30) G.fx.spawn({ kind: 'spark', x: this.x, y: this.y, vx: -this.vx * 0.1, vy: -this.vy * 0.1, life: 0.3, size: 1.4, color: WATER, grav: 900, a: 0.5 });
          if (this.x < WL + 7 || this.x > WR - 7) { this.x = G.clamp(this.x, WL + 7, WR - 7); this.stick(this.x < 640 ? 1 : -1); }
          else if (this.vy > 0) {
            for (const p of G.arena.platforms) {
              if (p.gone || p.rise < 0.9 || this.tx < p.x || this.tx > p.x + p.w) continue;
              if (py <= p.y + 2 && this.y >= p.y && this.x > p.x + 4 && this.x < p.x + p.w - 4) { this.y = p.y - 6; this.plat = p; this.stick(0); break; }
            }
            if (this.state === 'fly' && this.y >= FLOOR) { this.y = FLOOR - 6; this.stick(0); }
          }
          // (one still in the air when its time comes goes off where it lands)
        } else if (this.state === 'stuck') {
          this.st += dt;
          if (this.plat) this.y = this.plat.y - 6;
          if (this.t >= this.fuse) {
            this.state = 'burst'; this.bt = 0; this.slashable = false;
            G.audio.play('levShell'); G.fx.shake(3);
            const a = this.area(), up = this.side ? 0 : -Math.PI / 2, ang = this.side > 0 ? 0 : this.side < 0 ? Math.PI : up;
            G.fx.burst(this.x, this.y - (this.side ? 0 : 2), { n: 10, color: G.corrupt.active() ? BLOOD : '214,220,207', kind: 'spark', speed: [180, 520], angle: ang, spread: 2.2, life: [0.2, 0.45], size: [1.6, 3], grav: 900, a: 0.8 });
            G.fx.burst(a.cx, a.cy, { n: 6, color: WATER, kind: 'spark', speed: [100, 300], angle: ang, spread: 2.6, life: [0.3, 0.6], size: [1.4, 2.6], grav: 1300, a: 0.55 });
            if (!this.side && this.y >= FLOOR - 10) G.fx.dust(this.x, FLOOR, 2, { speed: [30, 130], size: [5, 10], life: [0.4, 0.8], up: 50, a: 0.25 });
          }
        } else {
          this.bt += dt;
          if (this.state === 'burst' && this.bt > 0.16) this.state = 'spent';
          if (this.bt > 0.5) this.dead = true;
        }
      },
      stick(side) {
        this.state = 'stuck'; this.side = side; this.st = 0; this.vx = this.vy = 0; this.r = 13; this.slashable = true;
        // (its fuse is counted from the spit: one that lands late does not burst late)
        this.fuse = Math.max(this.fuse, this.t + 0.35);
        G.audio.play('tink', { vol: 0.5 });
        G.fx.burst(this.x, this.y, { n: 4, color: WATER, kind: 'spark', speed: [60, 200], angle: side > 0 ? 0 : side < 0 ? Math.PI : -Math.PI / 2, spread: 2, life: [0.2, 0.4], size: [1.2, 2], grav: 1200, a: 0.5 });
      },
      // where its spines reach: a crown up from the floor or the wreckage, or straight out from a wall
      area() {
        if (this.side) return { cx: this.x + this.side * 48, cy: this.y, hw: 52, hh: 46 };
        return { cx: this.x, cy: this.y + 6 - 48, hw: 50, hh: 56 };
      },
      // (only the spines hurt: a shell still in the air is no blow.) They reach as far as they are drawn,
      // a fan out from the shell that is grown in 0.06 s; a box round the fan cut the empty corners
      // past its tips, and the whole fan from the first frame (v2.1b)
      hits(P) {
        if (this.state !== 'burst') return false;
        const out = E.outCubic(Math.min(1, this.bt / 0.06)), b = P.box();
        const rot = this.side > 0 ? Math.PI / 2 : this.side < 0 ? -Math.PI / 2 : 0, cr = Math.cos(rot), sr = Math.sin(rot), oy = this.side ? 0 : 6;
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI / 2 + (i - 4) * 0.3, L = spineL(i) * out;
          for (let u = 5; u <= L; u += 6) {
            const lx = Math.cos(a) * u, ly = -6 + Math.sin(a) * u;
            const wx = this.x + lx * cr - ly * sr, wy = this.y + oy + lx * sr + ly * cr;
            if (Math.abs(wx - b.cx) < b.hw + 2 && Math.abs(wy - b.cy) < b.hh + 2) return true;
          }
        }
        return false;
      },
      danger() {
        if (this.state === 'fly') {
          // where it will come down on the floor (a little wider: it may stick to the wreckage instead)
          const g = 1300, dy = FLOOR - this.y, t = (this.vy + Math.sqrt(Math.max(0, this.vy * this.vy + 2 * g * dy))) / g;
          return [G.clamp(this.x + this.vx * t, WL + 10, WR - 10), 70, Math.max(0, this.fuse - this.t)];
        }
        if (this.state !== 'stuck' && this.state !== 'burst') return null;
        const a = this.area();
        if (a.cy + a.hh < FLOOR - 60) return null; // up on the wreckage or high on a wall: not the floor's danger
        return [a.cx, a.hw + 16, Math.max(0, this.fuse - this.t)];
      },
      slash() {
        if (this.state !== 'fly' && this.state !== 'stuck') return;
        this.state = 'spent'; this.bt = 0.2; this.slashable = false;
        G.audio.play('orbPop');
        G.fx.burst(this.x, this.y - 4, { n: 8, color: '214,220,207', kind: 'spark', speed: [80, 260], angle: -Math.PI / 2, spread: 2.8, life: [0.2, 0.45], size: [1.4, 2.6], grav: 1200, a: 0.7 });
      },
      draw(ctx) { drawBarnacle(ctx, this); },
    });
  }
  const spineL = (i) => 48 + (i % 3) * 18 - Math.abs(i - 4) * 4; // the length of each of a barnacle's nine spines
  function drawBarnacle(ctx, h) {
    const P = G.pal(), vo = G.corrupt.active(), warn = vo ? BLOOD : DANGER;
    const fade = h.state === 'spent' ? Math.max(0, 1 - (h.bt - 0.16) / 0.34) : 1;
    if (fade <= 0) return;
    ctx.save();
    ctx.translate(h.x, h.y + (h.state !== 'fly' && !h.side ? 6 : 0));
    ctx.rotate(h.state === 'fly' ? h.spin : h.side > 0 ? Math.PI / 2 : h.side < 0 ? -Math.PI / 2 : 0);
    ctx.globalAlpha = fade;
    const k = h.state === 'stuck' ? G.clamp(h.t / h.fuse, 0, 1) : h.state === 'fly' ? 0 : 1;
    // (stuck) the reach of its spines, faint, then firmer as it is about to go
    if (h.state === 'stuck' && k > 0.45) {
      ctx.strokeStyle = G.rgba(warn, 0.08 + 0.32 * (k - 0.45) / 0.55); ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 7]);
      ctx.beginPath(); ctx.ellipse(0, -30, 50, 60, 0, Math.PI, G.TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    // the spines, out in a crown, then drawn back in
    if (h.state === 'burst' || h.state === 'spent') {
      const out = h.state === 'burst' ? E.outCubic(Math.min(1, h.bt / 0.06)) : 1 - E.inQuad(Math.min(1, (h.bt - 0.16) / 0.3));
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.3, L = spineL(i) * out;
        ctx.strokeStyle = vo ? 'rgba(60,8,22,0.95)' : 'rgba(196,204,190,0.95)'; ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, -6 + Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * L, -6 + Math.sin(a) * L); ctx.stroke();
        ctx.strokeStyle = G.rgba(vo ? BLOOD : P.hot, 0.6); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * L * 0.7, -6 + Math.sin(a) * L * 0.7); ctx.lineTo(Math.cos(a) * L, -6 + Math.sin(a) * L); ctx.stroke();
      }
    }
    // the shell: a squat cone of plates, pale ridges, weed at its foot
    const shell = vo ? '#14040a' : '#1c2b2e', ridge = vo ? 'rgba(120,20,44,0.8)' : 'rgba(205,212,198,0.75)';
    ctx.fillStyle = shell;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-10, -7); ctx.lineTo(-5, -13); ctx.lineTo(5, -13); ctx.lineTo(10, -7); ctx.lineTo(12, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ridge; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-10, -1); ctx.lineTo(-5, -12); ctx.moveTo(-3, 0); ctx.lineTo(-1.5, -12.5); ctx.moveTo(4, 0); ctx.lineTo(2, -12.5); ctx.moveTo(10, -1); ctx.lineTo(5, -12); ctx.stroke();
    // the slit at its top: the warning colour, beating faster as the fuse runs down
    const beat = h.state === 'stuck' ? 0.5 + 0.5 * Math.sin(h.st * (8 + 34 * k)) : 0.6;
    ctx.fillStyle = G.rgba(warn, (0.45 + 0.5 * k) * (0.55 + 0.45 * beat));
    ctx.beginPath(); ctx.ellipse(0, -13, 4.5, 1.8 + 1.2 * k, 0, 0, G.TAU); ctx.fill();
    ctx.restore();
  }

  // a bubble: a projectile, so its rim is the warning colour
  function drawBubble(ctx) {
    const r = this.r * (1 + 0.08 * Math.sin(this.t * 14)), P = G.pal();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45; ctx.drawImage(G.fx.glow(P.boss), this.x - r * 2.2, this.y - r * 2.2, r * 4.4, r * 4.4); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = G.rgba(WATER, 0.14);
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, G.TAU); ctx.fill();
    ctx.strokeStyle = G.rgba(DANGER, 0.8); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(this.x - r * 0.3, this.y - r * 0.3, r * 0.45, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  }
  function drawBomb(ctx) {
    drawBubble.call(this, ctx);
    // where it will come down
    const g = this.grav, dy = (FLOOR - this.r) - this.y, t = (this.vy + Math.sqrt(Math.max(0, this.vy * this.vy + 2 * g * dy))) / g, lx = this.x + this.vx * t;
    ctx.strokeStyle = G.rgba(DANGER, 0.5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(lx, FLOOR - 1, 60, 8, 0, 0, G.TAU); ctx.stroke();
  }

  // ------------------------------------------------------------------ hazards of the void (corrupted only)
  AU.define('abyss', () => {
    S.tone({ type: 'sawtooth', f0: 46, f1: 29, dur: 1.3, vol: 0.18, attack: 0.3 });
    S.noise({ dur: 1.2, vol: 0.22, type: 'lowpass', f0: 460, f1: 80, attack: 0.35 });
  });
  AU.define('rend', () => {
    S.noise({ dur: 0.55, vol: 0.42, type: 'lowpass', f0: 1900, f1: 110 });
    S.noise({ dur: 0.14, vol: 0.2, type: 'highpass', f0: 2600 });
    S.tone({ type: 'square', f0: 74, f1: 28, dur: 0.45, vol: 0.16 });
  });
  AU.define('rush', () => {
    S.noise({ dur: 2.4, vol: 0.2, f0: 260, f1: 820, q: 0.9, attack: 0.6 });
    S.tone({ type: 'sine', f0: 38, f1: 50, dur: 2.2, vol: 0.14, attack: 0.6 });
  });
  AU.define('mine', () => { S.tone({ type: 'sine', f0: 160, f1: 60, dur: 0.22, vol: 0.2 }); S.noise({ dur: 0.18, vol: 0.18, type: 'lowpass', f0: 1400, f1: 200 }); });
  AU.vary.rend = 1.5; AU.vary.mine = 2;

  // the void torn out of something: black chunks and motes, a few sparks of blood
  function voidBurst(x, y, power, up) {
    const p = power || 1;
    G.fx.burst(x, y, { n: Math.round(10 * p), color: VOIDC, speed: [80, 260 + 240 * p], angle: up ? -Math.PI / 2 : 0, spread: up ? 1.8 : G.TAU, life: [0.5, 1.1], size: [4, 10], grav: 600, drag: 1.2, wob: 30 });
    G.fx.burst(x, y, { n: Math.round(7 * p), color: '14,4,8', speed: [150, 420 + 200 * p], angle: -Math.PI / 2, spread: 2.2, life: [0.5, 1], size: [3, 7], kind: 'chunk', grav: 1400 });
    G.fx.burst(x, y, { n: Math.round(8 * p), color: BLOOD, speed: [160, 520], angle: up ? -Math.PI / 2 : 0, spread: up ? 2 : G.TAU, life: [0.15, 0.4], kind: 'spark', size: [1.4, 2.6], len: 0.05, a: 0.8 });
  }

  // Hydra: the crack the void head comes up through. It opens and glows while the real head's throat
  // fills (the second head comes from under the floor, where nothing else would show it), the head
  // tears up out of it, and it stays open until the head has sunk back in, then seals.
  function voidCrack(x, tele) {
    const lines = [];
    for (let i = 0; i < 8; i++) {
      let px = x + G.rand(-56, 56), py = FLOOR + 2, a = Math.PI / 2 + G.rand(-1.1, 1.1);
      const pts = [px, py];
      for (let k = 0; k < 4; k++) { a += G.rand(-0.6, 0.6); const L = G.rand(8, 17); px += Math.cos(a) * L; py = Math.min(FLOOR + 70, py + Math.abs(Math.sin(a)) * L + 1); pts.push(px, py); }
      lines.push(pts);
    }
    const lip = [];
    for (let u = -1; u <= 1.001; u += 0.125) lip.push(u, G.rand(-1, 1));
    return H.add({
      kind: 'voidcrack', x, tele, lines, lip, layer: 'under', shut: 0, closing: false,
      update(dt) {
        this.srcX = this.x;
        const k = this.k();
        if (Math.random() < dt * (6 + 26 * k)) G.fx.spawn({ x: this.x + G.rand(-50, 50) * k, y: level(0) - 2, vx: G.rand(-12, 12), vy: -G.rand(30, 90), life: G.rand(0.6, 1.2), size: G.rand(4, 8), color: VOIDC, wob: 30 });
        if (Math.random() < dt * 10 * k) G.fx.spawn({ kind: 'spark', x: this.x + G.rand(-46, 46) * k, y: FLOOR - 1, vx: G.rand(-40, 40), vy: -G.rand(80, 260), life: G.rand(0.15, 0.35), size: G.rand(1.2, 2), color: BLOOD, len: 0.05 });
        // (it seals once the head it let out has gone back down through it)
        if (this.closing && !(this.holds && B.vh === this.holds)) { this.shut = Math.min(1, this.shut + dt * 2.2); if (this.shut >= 1) this.dead = true; }
      },
      // how far open: it eases open over the warning, and eases shut at the end
      k() { return E.outCubic(Math.min(1, this.t / this.tele)) * (1 - E.inOutQuad(this.shut)); },
      // the head tearing up through it
      // (only as high as the head has come up through it: it used to cut to 260 from the first frame, v2.1b)
      hits(P) {
        if (!(this.t >= this.tele && this.t < this.tele + 0.22 && B.vh)) return false;
        const V = B.vh; // (the skull, and the neck under it down into the crack)
        return headHits(V, P) || (Math.abs(P.x - V.x) < 36 && P.y > V.y - HH + 30);
      },
      danger() { return this.t < this.tele + 0.22 ? [this.x, 78, this.tele - this.t] : null; },
      draw(ctx) {
        const k = this.k();
        if (k < 0.01) return;
        // it beats faster as the head comes
        const beat = 0.8 + 0.2 * Math.sin(this.t * (8 + 22 * Math.min(1, this.t / this.tele)));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.3 * k * beat; ctx.drawImage(G.fx.glow(BLOOD), this.x - 100 * k, FLOOR - 26, 200 * k, 52);
        ctx.globalAlpha = 1;
        // the fissures run down the face of the floor, growing as it opens
        ctx.lineCap = 'round';
        for (const pts of this.lines) {
          const n = Math.max(2, Math.round(pts.length / 2 * k));
          ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
          for (let i = 1; i < n; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
          ctx.strokeStyle = G.rgba(BLOOD, 0.5 * k * beat); ctx.lineWidth = 2.6; ctx.stroke();
          ctx.strokeStyle = G.rgba(VHOT, 0.3 * k * beat); ctx.lineWidth = 0.9; ctx.stroke();
        }
        ctx.restore();
        // the split itself: a black lens on the floor with lips of blood
        const w = 66 * k, lv = Math.min(FLOOR, level(0));
        ctx.fillStyle = VDARK;
        ctx.beginPath();
        for (let i = 0; i < this.lip.length; i += 2) { const u = this.lip[i], yy = FLOOR - 1 - (1 - u * u) * 5 * k + this.lip[i + 1]; if (i) ctx.lineTo(this.x + u * w, yy); else ctx.moveTo(this.x + u * w, yy); }
        for (let i = this.lip.length - 2; i >= 0; i -= 2) { const u = this.lip[i]; ctx.lineTo(this.x + u * w, FLOOR + 1 + (1 - u * u) * 3 * k); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = G.rgba(BLOOD, 0.8 * k); ctx.lineWidth = 1.4; ctx.stroke();
        if (lv < FLOOR - 2) { ctx.strokeStyle = G.rgba(BLOOD, 0.3 * k * beat); ctx.beginPath(); ctx.ellipse(this.x, lv, w * 1.1, 4, 0, 0, G.TAU); ctx.stroke(); }
      },
    });
  }

  // A bite of one of the hydra's heads: the ground it sweeps, from behind its head to where its jaws
  // shut. The head itself is the warning; this only carries the reach, for the hit and for the
  // scripted player. The script sets l, r, top, bot, and live while the head goes through.
  function fang(src) {
    return H.add({
      kind: 'fang', x: src, srcX: src, l: src, r: src, top: FLOOR - 150, bot: FLOOR + 40, live: false, show: false, at: 1,
      update() { this.x = (this.l + this.r) / 2; },
      // only as far as the jaws have come (the head drawn through it); it used to take the whole sweep
      // from the first frame of the bite, ahead of the head (v2.1b)
      hits(P) {
        if (!this.live) return false;
        let l = this.l, r = this.r, top = this.top, bot = this.bot;
        if (this.head) return headHits(this.head, P); // (the head itself, where it has got to)
        return P.x + 11 > l && P.x - 11 < r && P.y > top && P.y - 43 < bot;
      },
      danger() { return this.show ? [this.x, (this.r - this.l) / 2 + 14, this.at - this.t] : null; },
    });
  }

  // Undertow: a mine of the void riding the current in from the far wall. It surfaces as it is
  // spawned, bobs, and goes off on whoever it meets; a cut bursts it. What reaches the jaws is swallowed.
  function voidMine(x, y0, dir, speed, mawX) {
    return H.add({
      kind: 'voidmine', x, y: y0 + 30, y0, dir, speed, mawX, r: 14, grow: 0, spin: G.rand(0, 6), slashable: true, once: true,
      update(dt) {
        this.grow = Math.min(1, this.t / 0.4);
        this.x += this.dir * this.speed * G.lerp(0.25, 1, this.grow) * dt;
        // up out of the water, then riding it
        this.y = G.lerp(this.y0 + 30, this.y0, E.outBack(this.grow)) + Math.sin(this.t * 5 + this.spin) * 4;
        this.srcX = this.x - this.dir * 10;
        this.spin += dt * 2.6 * this.dir;
        if (Math.random() < dt * 24) G.fx.spawn({ x: this.x - this.dir * 14, y: level(0) - 2, vx: -this.dir * G.rand(20, 60), vy: -G.rand(10, 50), life: G.rand(0.3, 0.6), size: G.rand(3, 6), color: VOIDC });
        if ((this.x - this.mawX) * this.dir > -60) {
          // into the jaws
          this.dead = true;
          G.fx.burst(this.x, this.y, { n: 6, color: VOIDC, speed: [40, 140], life: [0.3, 0.6], size: [3, 6] });
          G.audio.play('gulp', { vol: 0.5 }); B.body.gill = 1; // its gills flare as it swallows
        }
        if (this.x < WL - 40 || this.x > WR + 40) this.dead = true;
      },
      hits(P) { return this.grow > 0.6 && G.circleRect(this.x, this.y, this.r * 0.8, P.box()); },
      pop() {
        this.dead = true;
        voidBurst(this.x, this.y, 0.7);
        G.fx.ring(this.x, this.y, { r0: 6, r1: 46, life: 0.25, color: BLOOD, width: 3, alpha: 0.6 });
        G.fx.ripple(this.x, this.y, 70, 0.25, 0.6);
        G.audio.play('mine'); G.fx.shake(4);
      },
      slash() { this.pop(); },
      draw(ctx) {
        const r = this.r * Math.max(0.01, this.grow) * (1 + 0.05 * Math.sin(this.t * 11)), x = this.x, y = this.y;
        // it drinks the light around it
        let g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.6);
        g.addColorStop(0, 'rgba(6,0,4,0.55)'); g.addColorStop(1, 'rgba(6,0,4,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.3 + 0.15 * Math.sin(this.t * 7); ctx.drawImage(G.fx.glow(BLOOD), x - r * 1.9, y - r * 1.9, r * 3.8, r * 3.8);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        // spines, turning with it
        ctx.fillStyle = '#0a0206';
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const a = this.spin + i * G.TAU / 7, c = Math.cos(a), s = Math.sin(a);
          ctx.moveTo(x + Math.cos(a - 0.22) * r * 0.85, y + Math.sin(a - 0.22) * r * 0.85);
          ctx.lineTo(x + c * r * 1.55, y + s * r * 1.55);
          ctx.lineTo(x + Math.cos(a + 0.22) * r * 0.85, y + Math.sin(a + 0.22) * r * 0.85);
        }
        ctx.fill();
        ctx.fillStyle = '#070104'; ctx.beginPath(); ctx.arc(x, y, r, 0, G.TAU); ctx.fill();
        // veins of blood, and a heart that beats
        ctx.strokeStyle = G.rgba(BLOOD, 0.85); ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = -this.spin * 0.7 + i * 2.1;
          ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
          ctx.lineTo(x + Math.cos(a + 0.4) * r * 0.55, y + Math.sin(a + 0.4) * r * 0.55);
          ctx.lineTo(x + Math.cos(a + 0.1) * r * 0.95, y + Math.sin(a + 0.1) * r * 0.95);
        }
        ctx.stroke();
        g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.45);
        g.addColorStop(0, G.rgba(VHOT, 0.6 + 0.3 * Math.sin(this.t * 9))); g.addColorStop(1, G.rgba(BLOOD, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, G.TAU); ctx.fill();
        // a projectile: its rim is the warning colour
        ctx.strokeStyle = G.rgba(DANGER, 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, G.TAU); ctx.stroke();
      },
    });
  }

  // Undertow: the jaws shutting over the near side at the end. All the way to the top of the sky
  // (the upper jaw comes down from above). Its warning is the head rearing with its jaws wide; this
  // carries the reach, and tells the scripted player from the start which ground the jaws will take.
  function mawClose(l, r) {
    return H.add({
      kind: 'mawclose', x: (l + r) / 2, l, r, live: false, at: 9, srcX: (l + r) / 2,
      update() { },
      hits(P) { return this.live && P.x + 11 > this.l && P.x - 11 < this.r; },
      danger() { return this.at > this.t - 0.25 ? [this.x, (this.r - this.l) / 2 + 22, this.at - this.t] : null; },
    });
  }

  // The hydra's second head: the Leviathan's own head, done in the void, on a neck that runs down
  // into the crack. It moves like the real one: weights on springs, unless a script moves it by hand.
  function voidHead(x, face) {
    const y = FLOOR + 190;
    return {
      x, y, z: 0, tx: x, ty: y, px: x, py: y, vx: 0, vy: 0, ang: -Math.PI / 2, ta: aim(face, -0.6), va: 0,
      direct: true, jaw: 0, jawT: 0, face, throat: 0, gill: 0, fin: 0, root: x, spine: [], gone: false, sinkV: 0,
    };
  }
  function tickVoidHead(V, dt) {
    if (V.gone) {
      // let go of: it drops back down the crack
      V.direct = true; V.sinkV += 1500 * dt; V.y += V.sinkV * dt; V.ta = -Math.PI / 2;
      if (V.y > FLOOR + 200) { B.vh = null; return; }
    }
    if (V.direct) {
      const idt = 1 / Math.max(dt, 1e-4);
      V.vx = (V.x - V.px) * idt; V.vy = (V.y - V.py) * idt;
    } else {
      const w = 13, z = 0.62;
      V.vx += ((V.tx - V.x) * w * w - 2 * z * w * V.vx) * dt;
      V.vy += ((V.ty - V.y) * w * w - 2 * z * w * V.vy) * dt;
      V.x += V.vx * dt; V.y += V.vy * dt;
    }
    V.px = V.x; V.py = V.y;
    const wa = 13;
    V.va += (G.angDiff(V.ang, V.ta) * wa * wa - 2 * 0.6 * wa * V.va) * dt;
    V.ang = Math.atan2(Math.sin(V.ang + V.va * dt), Math.cos(V.ang + V.va * dt));
    const c = Math.cos(V.ang), s = Math.sin(V.ang);
    if (Math.abs(c) > 0.15) V.face = c > 0 ? 1 : -1;
    V.jaw = G.damp(V.jaw, V.jawT, 16, dt);
    V.gill = G.damp(V.gill, 0, 2, dt);
    // its neck: up out of the crack, arching, to the back of its skull
    const J = { x: V.x - c * 64, y: V.y - HH - s * 64, z: 0 }, L = 130;
    sample(V.spine, { x: V.root, y: FLOOR + 230, z: 0 }, { x: V.root + (J.x - V.root) * 0.1, y: Math.min(FLOOR + 40, J.y + 60), z: 0 },
      { x: J.x - c * L, y: J.y - s * L * 0.6, z: 0 }, J, 22, 96, 58, 7, 8);
  }
  function drawVoidHead(ctx) {
    const V = B.vh;
    if (!V || V.y > FLOOR + 185) return;
    // a darkness around it that eats the light
    const hx = V.x, hy = V.y - HH, g = ctx.createRadialGradient(hx, hy, 20, hx, hy, 190);
    g.addColorStop(0, 'rgba(6,0,4,0.5)'); g.addColorStop(1, 'rgba(6,0,4,0)');
    ctx.fillStyle = g; ctx.fillRect(hx - 190, hy - 190, 380, 380);
    VOIDED = true;
    drawChain(ctx, V.spine, false, { up: headUp(V) });
    drawHead(ctx, V);
    VOIDED = false;
  }

  // ------------------------------------------------------------------ moves that several attacks share
  // under the water behind the shore
  function* sinkAway(dur) {
    const b = B.body, x0 = b.x, y0 = b.y, z0 = b.z, d = dur || 0.45;
    b.direct = true; b.ta = aim(b.face, 1.2);
    // its snout lifts as it heaves up off the shore, then tips over and leads it down; the coils go after
    pose('sinkRise');
    let e = 0;
    while (e < d) {
      e += yield;
      const k = Math.min(1, e / d);
      if (k > 0.35 && b.poseName === 'sinkRise') pose('sinkDown');
      b.y = G.lerp(y0, B.sea.y + 160, E.inQuad(k)) - 60 * Math.sin(Math.PI * k);
      b.z = G.lerp(z0, 0.45, k); b.x = x0;
    }
    splashAt(b.x, 0.45, 1); G.audio.play('splash', { vol: 0.6 });
  }
  // up out of the sea and down on the shore beside the hero, facing them
  function* breach(x, face) {
    const b = B.body;
    b.direct = true; b.x = x - face * 60; b.y = B.sea.y + 150; b.z = 0.3; b.ang = b.ta = -Math.PI / 2;
    splashAt(b.x, 0.3, 1.6); G.audio.play('splash');
    // up, jaws parting, the coils surging up behind it; it slows at the top and curls over, snout leading
    // the fall; it lands chin first and bounces once, the coils slapping down a beat after
    pose('breachRise'); b.jawT = 0.5;
    yield* tween(b, { y: FLOOR - 250, z: 0.1 }, 0.34, E.outCubic);
    b.ta = aim(face, 0.7); pose('breachOver'); b.jawT = 0.15;
    yield* tween(b, { x, y: FLOOR, z: 0 }, 0.28, E.inQuad);
    b.ta = aim(face, 0.06);
    crash(x + face * 50, 1);
    pose('beached'); poseKick({ up: 320, tip: -1.4, lift: -260 }); b.jawT = 0.25;
  }

  // ------------------------------------------------------------------ attacks
  // Lunge: it comes up at a wall, rears, and strikes the length of the shore.
  //   The tell is the rear. Low, snout to the ground and neck wound tight: it strikes along the floor.
  //   Up tall, snout to the sky: it strikes at head height, over anyone who stays on the ground.
  //   Its gills pumping all through the rear: it holds its breath, coiled, and goes late (v2.1a).
  //   After the strike its chin lies on the sand a moment, winded: the opening.
  function* lunge(side, first, low, late) {
    const b = B.body, T = K.T(), dir = -side;
    const x0 = side > 0 ? WR - 120 : WL + 120, x1 = side > 0 ? WL + 130 : WR - 130;
    if (first) {
      yield* sinkAway(0.4);
      b.x = x0 + side * 40; b.y = B.sea.y + 140; b.z = 0.42; b.ang = b.ta = -Math.PI / 2;
      splashAt(b.x, 0.42, 1.4); G.audio.play('splash');
    }
    b.direct = false; b.fast = false;
    target(x0, low ? FLOOR - 30 : FLOOR - 275, 0, aim(dir, low ? 0.55 : -0.62));
    b.coil = low ? 1 : 0; b.jawT = low ? 0.15 : 0.3;
    G.audio.play('hiss');
    const rear = (first ? 0.9 : 0.62) * T, hold = late ? 0.52 * T : 0, all = rear + hold;
    let e = 0, glinted = false, hint = null;
    const live = { on: true };
    // (the key poses: low, it gathers, then winds down into a tight low S with its snout on the sand;
    // high, it dips first, then rears up arched like a swan; both ease off a touch just before the strike)
    const P_A = low ? 'lungeLowGather' : 'lungeHighDip', P_B = low ? 'lungeLowWind' : 'lungeHighRear', P_C = low ? 'lungeLowBreak' : 'lungeHighBreak';
    pose(P_A);
    while (e < all) {
      const dt = yield;
      e += dt;
      const nm = e >= all - 0.2 ? P_C : e < rear * (low ? 0.3 : 0.28) ? P_A : P_B;
      // (held breath) a tremor through the wound-up neck, a sine, never jitter
      if (late && e > rear && nm === P_B) pose(nm, { back: 3 * Math.sin(e * 47), tip: 0.03 * Math.sin(e * 31), amp: 4 });
      else if (b.poseName !== nm) pose(nm);
      b.tx = x0 + side * (34 * Math.min(1, e / rear) + (late ? 12 * G.clamp((e - rear) / hold, 0, 1) : 0)); // it draws back into itself
      if (late) {
        // (the held breath) gills pumping from the first moment, spurting at each beat, and once it has
        // drawn back, a tremor
        b.gill = Math.max(b.gill, 0.55 + 0.45 * Math.sin(e * 26));
        if (Math.floor(e * 26 / G.TAU) !== Math.floor((e - dt) * 26 / G.TAU)) {
          const c = Math.cos(b.ang), s = Math.sin(b.ang), gx = b.x - c * 52 * HS, gy = b.y - HH - s * 52 * HS;
          for (let i = 0; i < 4; i++) G.fx.spawn({ kind: 'spark', x: gx + G.rand(-6, 6), y: gy + G.rand(-8, 8), vx: -c * G.rand(40, 140) + G.rand(-40, 40), vy: -G.rand(60, 180), life: G.rand(0.3, 0.55), size: G.rand(1.3, 2.2), color: WATER, grav: 1200, a: 0.6 });
        }
        if (e > rear) { b.va += G.rand(-1, 1) * 34 * dt; b.vy += G.rand(-1, 1) * 500 * dt; }
      }
      if (Math.random() < dt * 14) { const m = mouthV(b); G.fx.spawn({ kind: 'spark', x: m.x, y: m.y, vx: G.rand(-20, 20), vy: 40, life: 0.6, size: 1.6, color: WATER, grav: 1300, a: 0.6 }); }
      if (!glinted && e >= all - 0.22) { glinted = true; const m = mouthV(b); G.fx.glint(m.x, m.y, 36, G.pal().hot, 0.3); G.audio.play('glint'); }
      if (!hint && e >= all - 0.2) hint = cue(low ? 'flycut' : 'crescent', () => live.on, 190);
    }
    // the strike: the head comes home in a blink and goes, the neck flung out long behind it
    pose('lungeStrike'); releasePose(0.06);
    b.coil = 0; b.direct = true; b.hurt = true; b.jawT = 0.95; b.ta = aim(dir, low ? 0.05 : 0.03);
    G.audio.play('lunge'); G.fx.shake(9); G.fx.kick(dir * 7, 0); G.fx.punch(0.012);
    G.fx.ripple(b.x, b.y - HH, 240, 0.32, 0.9);
    const ys = low ? FLOOR : FLOOR - 92, xs = b.x, ys0 = b.y, dur = K.gentle() ? 0.86 : 0.74;
    e = 0;
    while (e < dur) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / dur);
      b.x = G.lerp(xs, x1, (k - 0.25 * k * k) / 0.75);
      b.y = G.lerp(ys0, ys, E.outCubic(Math.min(1, e / 0.16)));
      b.z = 0;
      // the water it throws up, or the air it tears
      if (Math.random() < dt * 70) {
        if (low || flooded()) G.fx.spawn({ kind: 'spark', x: b.x - dir * G.rand(20, 80), y: level(0) - 3, vx: -dir * G.rand(60, 260), vy: -G.rand(200, 520), life: G.rand(0.4, 0.7), size: G.rand(1.6, 3), color: WATER, grav: 1400, a: 0.6 });
        G.fx.spawn({ kind: 'spark', x: b.x - dir * 60, y: b.y - HH + G.rand(-40, 40), vx: -dir * G.rand(500, 900), vy: G.rand(-30, 30), life: G.rand(0.1, 0.2), size: G.rand(1.4, 2.4), color: G.pal().hot, len: 0.06, drag: 3, a: 0.5 });
      }
    }
    b.hurt = false; b.jawT = 0; live.on = false;
    G.audio.play('bite');
    if (!low) { b.ta = aim(dir, 0.18); pose('mawOver'); yield* tween(b, { y: FLOOR }, 0.2, E.inQuad); }
    crash(b.x + dir * 50, 1.15);
    G.fx.impact(b.x + dir * 40, FLOOR - 40, 0.06); G.fx.lines(b.x + dir * 60, FLOOR - 40, 14, G.pal().hot);
    // its chin goes down on the sand, winded, jaws slack, gills heaving: it bounces once and settles, and
    // the coils come down after it
    b.ta = aim(dir, 0.2); b.jawT = 0.3; b.gill = 1;
    pose('lungeLie'); poseKick({ up: 300, tip: -1.2, lift: -220, reach: -200 });
    G.fx.dust(b.x + dir * 80, FLOOR, 3, { dir, speed: [30, 150], size: [6, 12], life: [0.5, 0.9], up: 40, a: 0.3 });
  }
  function* atkLunge() {
    const b = B.body, P = G.player;
    let side = P.x < 640 ? 1 : -1;
    const twice = B.phase === 3 ? K.chance(0.7, 'twice') : B.phase === 2 && K.chance(0.4, 'twice');
    const late = () => K.chance(B.phase === 1 ? 0.3 : 0.4, 'late');
    yield* lunge(side, true, !K.chance(0.5, 'high'), late());
    // (between the two it hauls its head up off the sand and swings round, the coils dragged after)
    if (twice) { pose('lungeHaul'); yield* hold(0.22); b.jawT = 0; side = -side; yield* lunge(side, false, !K.chance(0.5, 'high'), late()); }
    b.exposed = true;
    let e = 0;
    const lie = B.phase === 3 ? 1.05 : 1.3;
    while (e < lie) {
      const dt = yield; e += dt; b.gill = Math.max(b.gill, 0.4 + 0.4 * Math.sin(e * 7));
      pose('lungeLie', { lift: 12 * Math.sin(e * 7), up: 2 * Math.sin(e * 7 + 0.8) });
    }
    b.exposed = false; b.jawT = 0;
  }

  // Snap: it glides in low over the shore and bites. A jaw that chatters while it draws back means a
  // second bite follows. A hero who stays in front of its jaws after that is snapped at again, sooner
  // (v2.1a: once in I and II, up to twice in III): its head jerks back the moment it sees them there.
  function* atkSnap() {
    const b = B.body, P = G.player, T = K.T();
    const twice = K.chance(B.phase === 1 ? 0.3 : 0.45, 'twice');
    let f = facePlayer();
    pose('skim');
    yield* glide(G.clamp(P.x - f * 220, WL + 110, WR - 110), FLOOR - 16, 0, aim(f, 0.12), 0.8, true);
    for (let i = 0; i < (twice ? 2 : 1); i++) {
      f = facePlayer();
      yield* snapBite(f, (i ? 0.46 : 0.62) * T, twice && !i);
    }
    // still there in front of its jaws, on the ground or just off it: again
    for (let n = 0; n < (B.phase === 3 ? 2 : 1); n++) {
      const dx = P.x - b.x;
      if (!(dx * b.face > 0 && Math.abs(dx) < 290 && P.y > FLOOR - 150)) break;
      b.va -= b.face * 9; b.jawT = 0.5; G.audio.play('bite', { vol: 0.4 });
      yield* snapBite(b.face, 0.52 * T, false);
    }
    b.exposed = true;
    yield* hold(0.6, (e) => pose('snapOpen', { lift: 8 * Math.sin(e * 6), up: 2 * Math.sin(e * 6 + 1) }));
    b.exposed = false;
  }
  function* snapBite(f, tele, chatter) {
    const b = B.body, ff = f;
    {
      b.fast = false; b.chatter = chatter ? 1 : 0;
      target(G.clamp(b.x - f * 40, WL + 100, WR - 100), FLOOR - 72, 0, aim(f, 0.45));
      b.jawT = 0.75;
      G.audio.play('hiss');
      const m = (a) => (ff > 0 ? a : Math.PI - a);
      H.arc({
        x: b.x + f * 50, y: b.y - HH, r: 185, r0: 80, a0: m(-1.15), a1: m(1.05), tele, active: 0.12, owner: b, // (r0: where its crescent is drawn from)
        follow(h) { if (!h.fired) { h.x = b.x + ff * 50; h.y = Math.max(b.y - HH, FLOOR - 120); } },
        onFire() { b.chatter = 0; G.fx.shake(6); },
      });
      // (the key poses: its head jerks up and back, jaws agape; then a raised cobra S, the snout tipping
      // down onto the hero and swaying on it; last, a tighter draw-back, the S wound deeper. A chattering
      // jaw shivers the whole head.)
      pose('snapRecoil');
      yield* hold(tele, (e, k) => {
        const nm = k < 0.25 ? 'snapRecoil' : k < 0.78 ? 'snapAim' : 'snapCock';
        if (nm === 'snapAim') pose(nm, { up: 6 * Math.sin(e * 9), tip: (b.chatter ? 0.05 * Math.sin(e * 38) : 0) + 0.04 * Math.sin(e * 9 + 1) });
        else if (b.chatter) pose(nm, { tip: 0.05 * Math.sin(e * 38) });
        else if (b.poseName !== nm) pose(nm);
      });
      // the head shoots forward and the jaws shut
      b.direct = true;
      pose('snapOver'); releasePose(0.08);
      const x1 = G.clamp(b.x + f * 150, WL + 90, WR - 90);
      yield* tween(b, { x: x1, y: FLOOR - 8 }, 0.11, E.outQuad);
      b.jawT = 0; b.jaw = 0;
      G.audio.play('bite');
      const mo = mouth(b);
      G.fx.lines(mo.x, mo.y, 10, G.pal().hot, { r0: 18 });
      splash(mo.x, level(0) - 4, 0.5);
      // it carries on past where the jaws shut, snout driven down, and settles back
      pose('snapOver');
      yield* hold(0.2, (e) => { if (e > 0.07 && b.poseName === 'snapOver') pose('snapSettle'); });
      target(b.x, FLOOR - 12, 0, aim(f, 0.1));
    }
  }

  // Slam: the head waits on the shore while the tail comes down out of the sky.
  //   One slap of the tail on the water: one great blow (two health; from the second phase it throws
  //   a wave each way). Three quick shakes: three lighter blows, each one after the hero.
  function* atkSlam() {
    const b = B.body, P = G.player, T = K.T(), tl = B.tail;
    const triple = K.chance(B.phase === 1 ? 0.4 : 0.5, 'triple');
    const f = facePlayer();
    target(G.clamp(P.x - f * 330, WL + 110, WR - 110), FLOOR - 20, 0, aim(f, 0.1));
    tl.on = true; tl.ex = G.clamp(P.x + f * 220, 180, 1100); tl.ez = 0.5;
    tl.pose = 'under'; tl.tipX = tl.ex; tl.tipY = B.sea.y + 160; tl.tipZ = tl.ez; tl.c2x = tl.ex; tl.c2y = B.sea.y + 120; tl.c2z = tl.ez;
    // the tail breaks the surface curled over, then rises (slowing as it goes up); the head braces low,
    // chin down and jaws shut, and the coils between lift out of the sea
    tl.pose = 'breach'; tl.rate = 9;
    pose('slamBrace');
    splashAt(tl.ex, tl.ez, 1.2); G.audio.play('splash', { vol: 0.6 });
    yield* hold(0.5, (e) => { if (e > 0.14 && tl.pose === 'breach') { tl.pose = 'up'; tl.rate = 5; } });
    if (triple) {
      // three quick shakes: the head nods with each one
      tl.shake = 1;
      for (let i = 0; i < 3; i++) { yield* wait(0.16); splashAt(tl.ex + 40, tl.ez, 0.5); G.audio.play('splash', { vol: 0.35 }); poseKick({ tip: 1.6, up: -120, lift: 160 }); }
      tl.shake = 0;
    } else {
      // one slap: lifted high and back first, then whipped down onto the water
      tl.pose = 'cock'; tl.rate = 9;
      yield* hold(0.32, (e) => { if (e > 0.12 && tl.pose === 'cock') { tl.pose = 'slap'; tl.rate = 14; } });
      splashAt(tl.ex + 160, tl.ez, 2); G.audio.play('splash'); G.fx.shake(5);
      poseKick({ tip: 2.2, up: -200, lift: 260 });
      yield* wait(0.15);
    }
    // up, off the top of the sky; its head lifts to watch it go
    tl.aimX = P.x; tl.pose = 'raised'; tl.rate = 6;
    pose('slamWatch');
    G.audio.play('whoosh');
    yield* wait(0.4);
    const n = triple ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const tele = (triple ? (i ? 0.5 : 0.66) : 0.92) * T, w = triple ? 124 : 180;
      tl.pose = 'raised'; tl.rate = 7;
      const hz = tailfall(G.clamp(P.x + P.vx * 0.2, WL + 70, WR - 70), w, tele, triple ? 0.3 : 0.36, triple ? 1 : 2);
      yield* wait(tele - 0.12);
      // the fall: it gathers speed all the way down
      tl.pose = 'hold';
      const x = hz.x, y0 = Math.max(-460, tl.tipY);
      tl.tipX = x; tl.tipZ = 0; tl.c2x = x + (tl.ex > x ? 40 : -40); tl.c2z = 0;
      let e = 0;
      while (e < 0.12) { e += yield; const k = Math.min(1, e / 0.12); tl.tipY = G.lerp(y0, FLOOR - 16, k * k); tl.c2y = G.lerp(-500, -700, k); }
      // impact (the head flinches down with it, and the coils jolt)
      crash(x, triple ? 1.1 : 1.7);
      poseKick({ up: triple ? -260 : -420, tip: triple ? 1.2 : 2, lift: triple ? -200 : -360 });
      if (!triple) {
        G.fx.impact(x, FLOOR - 60, 0.07); G.fx.punch(0.025); G.fx.lines(x, FLOOR - 50, 18, G.pal().hot, { r0: 40 });
        if (B.phase >= 2) for (const d of [-1, 1]) H.shockwave(x + d * 60, d, 520, 46, { boss: '120,200,215', hot: '220,245,250' });
        // (the great blow) the fluke lies on the floor a moment, then lifts slowly off it (it is harmless
        // by then: its blow lasts 0.14 s)
        yield* hold(0.42, (e) => { if (e > 0.2 && tl.pose === 'hold') { tl.pose = 'rebound'; tl.rate = 5; } });
      } else yield* wait(0.16);
      tl.pose = 'raised'; tl.rate = 8;
      if (i < n - 1) yield* wait(0.12);
    }
    tl.pose = 'under'; tl.rate = 3;
    // it lets the tail sink, and the head comes down out of its watch
    pose('slamBrace', { up: 4, tip: -0.06 });
    yield* wait(0.5);
  }

  // Spouts: it dives, and the floor erupts.
  //   It rolls sideways as it dives: the spouts come up in two rows, the second in the gaps of the first.
  //   It rears straight up and sinks tail-first: the spouts come up under the hero, one after another.
  function* atkSpouts() {
    const b = B.body, P = G.player, T = K.T();
    const chase = K.chance(B.phase === 1 ? 0.4 : 0.5, 'chase');
    const dir = P.x < 640 ? 1 : -1; // the rows march away from the near wall
    B.pullK = 0.35; // with its head down under the floor the current slackens
    if (chase) {
      // straight up, the coils surging out of the sea under it; a breath at the top, arched back with
      // its jaws open; then it drops straight down tail-first, the coils sinking after it
      pose('spoutRise');
      yield* glide(b.x, FLOOR - 290, 0, -Math.PI / 2, 0.45);
      b.direct = true;
      const x0 = b.x, y0 = b.y;
      pose('spoutTop'); b.jawT = 0.55;
      let e = 0;
      while (e < 0.6) {
        e += yield; const k = Math.min(1, e / 0.6);
        if (k > 0.22 && b.poseName === 'spoutTop') { pose('spoutSink'); b.jawT = 0; }
        b.y = G.lerp(y0, B.sea.y + 200, E.inQuad(k)); b.z = G.lerp(0, 0.12, k); b.x = x0 + Math.sin(e * 30) * 4;
      }
      splashAt(x0, 0.12, 1.5); G.audio.play('splash');
      G.fx.ring(x0, FLOOR - 4, { r0: 20, r1: 130, life: 0.6, color: WATER, width: 4, alpha: 0.5 });
      b.z = 0.5;
    } else {
      b.direct = true;
      const x0 = b.x, y0 = b.y, xe = G.clamp(dir > 0 ? WL + 200 : WR - 200, WL, WR);
      b.ta = aim(-dir, 1.3);
      // a dip, then it arcs up and over like a porpoise and rolls onto its side as it goes over, belly
      // up, snout following its path down into the sea
      pose('spoutDip');
      const path = (k) => [G.lerp(x0, xe, k), G.lerp(y0, B.sea.y + 170, E.inQuad(k)) - 150 * Math.sin(Math.PI * k)];
      let e = 0;
      while (e < 0.75) {
        e += yield;
        const k = Math.min(1, e / 0.75);
        if (k > 0.16 && b.poseName === 'spoutDip') pose('spoutRoll');
        const p = path(k);
        b.x = p[0]; b.y = p[1]; b.z = G.lerp(0, 0.4, k);
        // (its snout along the way it goes, once it is under way)
        if (k > 0.12 && Math.abs(xe - x0) > 20) { const q = path(Math.min(1, k + 0.04)); b.ta = Math.atan2(q[1] - p[1], q[0] - p[0]); }
      }
      splashAt(xe, 0.4, 1.4); G.audio.play('splash');
    }
    yield* wait(0.2);
    // it comes up out of the sea and down on the shore by the hero while the last of them are still
    // coming up, and lies there open
    let left;
    if (chase) {
      const n = 3 + B.phase + (K.hard() ? 1 : 0);
      for (let i = 0; i < n; i++) {
        spout(G.clamp(P.x + P.vx * 0.25, WL + 60, WR - 60), 112, 0.72 * T);
        yield* wait(0.42);
      }
      left = 0.72 * T - 0.42 + 0.45;
    } else {
      const xs = [];
      for (let x = WL + 150; x < WR - 40; x += 200) xs.push(x);
      if (dir < 0) xs.reverse();
      xs.forEach((x, i) => spout(x, 100, 0.85 * T + i * 0.09));
      yield* wait(0.85 * T + (xs.length - 1) * 0.09);
      const second = xs.map((x) => x + 100).filter((x) => x < WR - 50), tB = (0.95 + (flooded() ? 0.15 : 0)) * T;
      second.forEach((x, i) => spout(x, 100, tB + i * 0.09));
      yield* wait(0.3);
      left = tB - 0.3 + second.length * 0.09 + 0.45;
    }
    const f = P.x < 640 ? -1 : 1;
    yield* breach(G.clamp(P.x + f * 210, WL + 120, WR - 120), -f);
    b.exposed = true;
    yield* wait(Math.max(0.95, left - 0.62));
    b.exposed = false;
  }

  // Volley: its answer to a hero who keeps away. It rears where it can see them and spits.
  //   Three quick gulps: a fan of bubbles that drift after the hero. One long swell of the throat: a
  //   brine bomb lobbed onto them, which bursts into droplets.
  function* atkVolley() {
    const b = B.body, P = G.player, T = K.T();
    const big = K.chance(0.35, 'big');
    const f = facePlayer();
    pose(big ? 'volleyGulp' : 'volleyFan');
    yield* glide(G.clamp(P.x - f * 400, WL + 120, WR - 120), FLOOR - 205, 0, aim(f, -0.25), 0.8);
    if (big) {
      // one long swell: it bows to gulp, then draws its head back up over its arched neck, slowly, to lob
      b.throatT = 1; G.audio.play('gulp');
      pose('volleyGulp');
      yield* hold(0.75 * T, (e, k) => {
        if (k > 0.3) pose('volleyDraw', { back: 6 * (k - 0.3), lift: 6 * Math.sin(e * 5) });
      });
    } else {
      // three quick gulps: a toss of the head with each, snout flicked up, the neck held proud
      pose('volleyFan');
      for (let i = 0; i < 3; i++) {
        b.throat = 0.8; G.audio.play('gulp'); b.vy -= 160;
        poseKick({ up: 170, tip: -2.2, lift: 120 });
        yield* wait(0.22 * T);
      }
    }
    const ff = facePlayer();
    b.ta = Math.atan2(P.y - 30 - (b.y - HH), P.x - b.x);
    if (Math.cos(b.ta) * ff < 0.3) b.ta = aim(ff, 0.2);
    // (home before it spits: the spit comes from where the jaws are drawn)
    releasePose(0.08);
    yield* wait(0.08);
    const mo = mouth(b);
    b.jawT = 0.9; b.throatT = 0; b.throat = 0;
    G.fx.kick(-ff * 4, 0); G.audio.play('bubble');
    // the follow-through: the head carries on after what it threw (forward and down, more for the bomb)
    pose('volleyThrow'); poseKick(big ? { back: -420, tip: 2.6, lift: -200 } : { back: -200, tip: 1.2 });
    if (big) {
      const tf = 0.95, g = 1100, dx = P.x - mo.x, dy = (FLOOR - 24) - mo.y;
      const ob = H.orb(mo.x, mo.y, dx / tf, (dy - 0.5 * g * tf * tf) / tf, {
        r: 24, grav: g, life: 5,
        onPop(o) {
          G.audio.play('splash'); splash(o.x, Math.min(o.y, FLOOR - 6), 1);
          for (const vx of [-380, -240, -110, 110, 240, 380]) {
            const d = H.orb(o.x, Math.min(o.y, FLOOR - 20), vx, -G.rrand(380, 520), { r: 9, grav: 1300, life: 3 });
            d.draw = drawBubble;
          }
        },
      });
      ob.draw = drawBomb;
    } else {
      const n = 2 + B.phase + (K.hard() ? 1 : 0), base = Math.atan2(P.y - 26 - mo.y, P.x - mo.x);
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.22, sp = 300;
        const ob = H.orb(mo.x, mo.y, Math.cos(a) * sp, Math.sin(a) * sp, {
          r: 15, life: 4.5,
          steer(o, dt) {
            if (o.t < 0.25 || o.t > 1.4) return;
            const want = Math.atan2(P.y - 24 - o.y, P.x - o.x), cur = Math.atan2(o.vy, o.vx), v = Math.hypot(o.vx, o.vy);
            const d = G.clamp(G.angDiff(cur, want), -1.3 * dt, 1.3 * dt);
            o.vx = Math.cos(cur + d) * v; o.vy = Math.sin(cur + d) * v;
          },
        });
        ob.draw = drawBubble;
        G.audio.play('bubble');
        yield* wait(0.1);
        if (i < n - 1) poseKick({ back: -90, tip: 0.6 }); // (each bubble a small jerk of the head after it)
      }
    }
    yield* wait(0.25);
    b.jawT = 0;
    pose('rest', { tip: 0.08, lift: -10 });
    yield* wait(0.55);
  }

  // Sweep (from the second phase): a loop of its body rolls the length of the floor while its head
  // waits at the wall it started from. Spines up and rattling: the coil comes back.
  function* atkSweep() {
    const b = B.body, P = G.player, T = K.T();
    const back = K.chance(B.phase === 3 ? 0.55 : 0.4, 'back');
    const s = P.x < 640 ? 1 : -1, hx = s > 0 ? WR - 140 : WL + 140;
    yield* glide(hx, FLOOR - 40, 0, aim(-s, 0.2), 0.9);
    b.fin = back ? 1 : 0;
    G.audio.play(back ? 'hiss' : 'gulp');
    target(hx + s * 20, FLOOR - 80, 0, aim(-s, 0.4));
    // (the key poses: it bows its head to the water and the coils go down, gathering the loop under it;
    // then the coils heave up behind it in an arch, a wave running down them, the head pulled in; last a
    // throw of the head. Spines up: the whole head rattles from side to side with them.)
    pose('sweepDip');
    yield* hold(0.75 * T, (e, k) => {
      const nm = k < 0.3 ? 'sweepDip' : k < 0.86 ? 'sweepHeave' : 'sweepThrow';
      if (back) pose(nm, { tip: 0.07 * Math.sin(e * 40), back: 3 * Math.sin(e * 40 + 1) });
      else if (b.poseName !== nm) pose(nm);
    });
    splash(hx - s * 130, level(0) - 4, 1.2); G.audio.play('splash');
    const hp = hump(hx - s * 130, -s, B.phase === 3 ? 440 : 420, back);
    target(hx, FLOOR - 30, 0, aim(-s, 0.15));
    // the loop leaves it: the head whips up, and the arch of the coils drops away
    pose('sweepWatch'); poseKick({ up: 260, tip: -2, lift: -300 });
    let e = 0;
    while (!hp.dead) { const dt = yield; e += dt; pose('sweepWatch', { lift: 10 * Math.sin(e * 3) }); }
    b.fin = 0;
    yield* wait(0.3);
  }

  // Maw (third phase): it goes down into the eye of the maelstrom and comes up out of it jaws first,
  // past the top of the sky. Its fin circles the eye before it does: once round, it comes up once;
  // twice round, it comes up a second time, under the hero.
  function* atkMaw() {
    const b = B.body, P = G.player, T = K.T(), V = B.vortex;
    const twice = K.chance(0.45, 'twice');
    // up and over into the eye
    b.direct = true;
    const x0 = b.x, y0 = b.y;
    b.ta = aim(V.x >= b.x ? 1 : -1, 1.3);
    // a dip, then up and over in an arc, snout along its path, down into the eye; the coils follow it in
    pose('spoutDip');
    const path = (k) => [G.lerp(x0, V.x, k), G.lerp(y0, FLOOR + 160, k * k) - 200 * Math.sin(Math.PI * k)];
    let e = 0;
    while (e < 0.55) {
      e += yield; const k = Math.min(1, e / 0.55), p = path(k);
      if (k > 0.18 && b.poseName === 'spoutDip') pose('sinkDown');
      b.x = p[0]; b.y = p[1];
      if (k > 0.12 && Math.abs(V.x - x0) > 20) { const q = path(Math.min(1, k + 0.04)); b.ta = Math.atan2(q[1] - p[1], q[0] - p[0]); }
    }
    splash(V.x, level(0) - 4, 1.3); G.audio.play('splash');
    b.z = 0.3;
    const laps = twice ? 2 : 1;
    B.finCircle = { a: Math.PI * 0.5, laps };
    e = 0;
    while (e < laps * 0.7) { const dt = yield; e += dt; B.finCircle.a += dt * G.TAU / 0.7; }
    B.finCircle = null;
    let x = V.x;
    for (let i = 0; i < laps; i++) {
      const tele = (i ? 0.72 : 0.86) * T;
      const m = maw(x, i ? 96 : 110, tele, i > 0);
      G.audio.play('charge', { dur: tele });
      yield* wait(tele);
      x = m.x;
      // jaws first, out of the eye and past the top of the sky
      b.direct = true; b.x = x; b.y = FLOOR + 170; b.z = 0; b.ang = b.ta = -Math.PI / 2; b.jawT = 1; b.jaw = 1;
      G.fx.impact(x, FLOOR - 220, 0.07); G.fx.punch(0.03); G.fx.shake(16);
      G.fx.lines(x, FLOOR - 140, 20, G.pal().hot, { r0: 60, speed: [900, 1600] });
      G.audio.play('seaRoar'); G.audio.play('lunge');
      splash(x, level(0) - 4, 2.2);
      poseReset(); pose('mawRise');
      yield* tween(b, { y: FLOOR - 470 }, 0.22, E.outQuad);
      // the jaws slam shut at the top and the head snaps over past upright with the bite, then hangs
      b.jawT = 0; G.audio.play('bite');
      poseKick({ tip: 4.5 * (P.x >= x ? 1 : -1) * (Math.cos(b.ang) >= 0 ? 1 : -1), up: 200 });
      yield* wait(0.24);
      if (i < laps - 1) {
        pose('sinkDown');
        yield* tween(b, { y: FLOOR + 170 }, 0.28, E.inQuad);
        splash(x, level(0) - 4, 1.2); G.audio.play('splash');
        x = G.clamp(P.x, WL + 100, WR - 100);
      }
    }
    // it falls across the shore beside the eye, curling over, and lies stunned: a bounce, the coils after
    const f = P.x >= x ? 1 : -1, lx = G.clamp(x + f * 150, WL + 120, WR - 120);
    b.ta = aim(f, 0.4); pose('mawOver');
    yield* tween(b, { x: lx, y: FLOOR }, 0.34, E.inQuad);
    b.ta = aim(f, 0.04);
    crash(lx, 1.4);
    pose('beached'); poseKick({ up: 340, tip: -1.5, lift: -300 });
    b.exposed = true;
    yield* hold(1.15, (e) => { if (e > 0.4) pose('beached', { lift: 10 * Math.sin(e * 6) }); });
    b.exposed = false;
    // the eye wanders, and the pull with it
    V.tx = G.rpick([430, 640, 850].filter((v) => Math.abs(v - V.x) > 60));
  }

  // Breaker: it goes out to sea and draws the water back off the shore, then sends it in again as a wave
  // from one wall to the other. The tell is how far the sea draws back. Far, the bed laid bare out to
  // where the water stands and a long hiss, while it rears tall and leans back with it: a breaker too
  // tall to jump, so dash through its face. Only a little, a short dip: a low swell to jump.
  //   II: a second wave from the other side, close behind the first. III: three, each told by its own draw.
  function* atkBreaker() {
    const b = B.body, P = G.player, T = K.T(), eb = B.ebb, n = B.phase;
    let from = P.x < 640 ? 1 : -1; // (the first comes in from the far side)
    yield* sinkAway(0.42);
    let w = null;
    for (let i = 0; i < n; i++) {
      const tall = K.chance(0.5, 'tall');
      const hx = 640 + from * 760, z = 0.5;
      if (i) yield* wait(0.25); // (under the water, round to the other side)
      // up out of the sea, far out on that side
      b.direct = true; b.x = hx; b.z = z; b.y = B.sea.y + 170; b.ang = b.ta = -Math.PI / 2 - from * 0.35;
      splashAt(hx, z, 1.4); G.audio.play('splash', { vol: 0.6 });
      const top = B.sea.y - (tall ? 330 : 170);
      poseReset(); pose(tall ? 'breachRise' : 'breakerLow');
      yield* tween(b, { y: top }, 0.32, E.outCubic);
      // (the key poses: tall, the neck bowed back like a drawn bow and the whole body surging up out of
      // the sea behind it; low, a short crouch with its snout to the water)
      pose(tall ? 'breakerTall' : 'breakerLow');
      // it draws the sea back after it, leaning back as it does
      const draw = (tall ? (i ? 0.85 : 1.0) : (i ? 0.55 : 0.62)) * T;
      eb.hold = true; eb.to = tall ? 0.62 : 0.13;
      eb.sea = (B.sea.to < FLOOR ? FLOOR : SEA1) + (tall ? 70 : 24);
      b.throatT = tall ? 1 : 0.45; b.jawT = tall ? 0.55 : 0.25;
      G.audio.play('ebb', { dur: draw }); if (tall) G.audio.play('hiss');
      const a0 = b.ang, a1 = -Math.PI / 2 + from * (tall ? 0.42 : 0.12);
      let e = 0;
      while (e < draw) {
        const dt = yield;
        e += dt;
        const k = Math.min(1, e / draw), q = E.inOutQuad(k);
        b.ang = G.lerp(a0, a1, q) + Math.sin(e * 9) * 0.025 * k;
        b.y = top - (tall ? 44 : 14) * q + Math.sin(e * 5) * 3;
        b.gill = Math.max(b.gill, 0.6 * k);
        // (drawn on, the bow tightening as the sea goes out)
        if (tall) pose('breakerTall', { up: 16 * q, tip: -0.14 * q, curl: -0.15 * q });
        else pose('breakerLow', { tip: 0.1 * q, up: -8 * q });
      }
      // (the wave before must be well on its way first: held there, straining)
      const frac = B.phase === 3 ? 0.68 : 0.8;
      while (w && !w.dead && Math.abs(w.x - w.x0) < frac * (WR - WL)) {
        const dt = yield;
        e += dt;
        b.ang = a1 + Math.sin(e * 23) * 0.02; b.y = top - (tall ? 44 : 14) + Math.sin(e * 31) * 2;
        pose(tall ? 'breakerTall' : 'breakerLow', { amp: 6, lift: 6 * Math.sin(e * 23) });
      }
      // and heaves forward and down into the water: the sea comes back in as a wave (the neck whips
      // forward over it, the body crashing down after)
      b.throatT = 0; b.jawT = 0;
      pose('breakerHeave');
      const a2 = -Math.PI / 2 - from * 1.15, y0 = b.y;
      G.audio.play('lunge');
      e = 0;
      while (e < 0.28) {
        e += yield;
        const k = Math.min(1, e / 0.28);
        b.ang = G.lerp(a1, a2, E.inQuad(k)); b.y = G.lerp(y0, B.sea.y + 150, E.inQuad(k)); b.x = hx - from * 70 * k;
      }
      eb.hold = false;
      poseKick({ lift: tall ? -500 : -250 });
      splashAt(b.x, z, 2.4); G.fx.shake(tall ? 12 : 7); G.audio.play('surf', { vol: tall ? 1 : 0.6 });
      if (tall) { const q = proj(b.x, B.sea.y, z); G.fx.ripple(q.x, q.y, 300, 0.4, 1); }
      w = roller(from > 0 ? WR + 40 : WL - 40, -from, tall, tall ? 540 : 500);
      w.from = from;
      from = -from;
    }
    // it comes in behind the last of them, onto the shore by the hero, and lies there
    let e = 0;
    while (!w.dead && e < 3.5 && (P.x - w.x) * w.dir > -70) e += yield;
    const f = w.from;
    yield* breach(G.clamp(P.x + f * 210, WL + 120, WR - 120), -f);
    b.exposed = true;
    yield* wait(B.phase === 3 ? 0.9 : 1.05);
    b.exposed = false;
  }

  // Jet: it clamps its jaws on a throat full of water, gills flared and spurting at the corners, and spits
  // it out as a jet that its head carries. The tell is where its head is while it swells.
  //   Reared up high, snout to the sky: the jet comes down out of the sky to the floor in front of it and
  //   ends short of its chin. Get in under its chin, or behind it, or dash through the jet as it comes.
  //   Head down by the floor: the jet is driven into the floor and a swell runs out along it (jump), then
  //   its head comes up level and the jet follows the swell out over a standing head (stay down).
  //   II: the high jet pans back up again; the low one sends a second swell after the level jet.
  //   III: the high one leaves a geyser where it struck the floor; under the level jet the floor boils
  //   up beneath the hero, so walk out of it.
  function aimJet(J, b, flat) {
    const m = mouth(b);
    J.ox = m.x; J.oy = m.y;
    let a = b.ang;
    if (flat) {
      // the level jet never dips into a standing hero
      const f = Math.cos(a) >= 0 ? 1 : -1;
      let tilt = f > 0 ? a : Math.PI - a;
      tilt = Math.atan2(Math.sin(tilt), Math.cos(tilt));
      a = aim(f, Math.min(tilt, -0.02));
    }
    J.ang = a;
  }
  function openJet(J, b, f, dur) {
    J.on = true; b.throatT = 0; b.throat = 0.7; b.jawT = 0.32; b.fast = true;
    G.audio.play('jet', { dur }); G.audio.play('splash', { vol: 0.5 });
    G.fx.kick(-f * 4, 0); G.fx.shake(7); G.fx.punch(0.01);
    const m = mouth(b); G.fx.ripple(m.x, m.y, 150, 0.25, 0.6);
    poseKick({ lift: -220, curl: -2, amp: 40 }); // (the coils jolt back with the force of it: neck only)
  }
  // pushed back on its neck by the force of it, and shuddering
  function bear(b, f, hx, dt, push) {
    b.tx = hx - f * push;
    b.va += G.rand(-1, 1) * 50 * dt; b.vy += G.rand(-1, 1) * 1400 * dt;
    if (Math.random() < dt * 8) G.fx.shake(2);
  }
  function* jetHigh(J, b, f, hx, T) {
    const END = 1.0, far = f > 0 ? WR - 6 : WL + 6, HY = FLOOR - 22;
    // the tilt that puts the jet through a standing hero's middle at x, from where its jaws are now
    const tiltTo = (x) => { const m = mouth(b); return Math.atan2(HY - m.y, Math.max(30, (x - m.x) * f)); };
    // where the jet will cross a standing hero when the head is bowed all the way (END), short of its chin
    const stopAt = () => { const oy = b.ty - HH + 4 + Math.sin(END) * 96 * HS, ox = b.tx + f * Math.cos(END) * 96 * HS; return ox + f * (HY - oy) / Math.tan(END); };
    let tt = 0; // (time since it opened, for the bob of its head)
    const step = (dt, tilt, push) => {
      tt += dt;
      b.ta = aim(f, tilt);
      b.ty = FLOOR - 280 + 24 * Math.sin(Math.min(1, tt / 1.1) * Math.PI);
      bear(b, f, hx, dt, push);
      aimJet(J, b);
    };
    openJet(J, b, f, B.phase >= 2 ? 2.4 : 1.4);
    // down out of the sky (over everyone's head) until it meets the far wall at a standing height...
    let e = 0;
    J.sd = -f; J.stop = stopAt();
    while (e < 0.32) {
      const dt = yield;
      e += dt;
      step(dt, G.lerp(-0.98, tiltTo(far), E.inQuad(Math.min(1, e / 0.32))), 26 + 30 * Math.min(1, e / 0.2));
      J.stop = stopAt();
    }
    // ...then it rakes in along the floor towards its chin at a steady pace, slowing at the end
    const s0 = stopAt(), rake = G.clamp(Math.abs(far - s0) / (K.gentle() ? 700 : 820), 0.4, 0.95);
    e = 0;
    while (e < rake) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / rake), x = G.lerp(far, s0, 0.75 * k + 0.25 * E.outQuad(k));
      step(dt, Math.min(END, tiltTo(x)), 56);
      J.stop = s0;
    }
    // (back up, from the second phase, it runs out to the wall)
    if (B.phase >= 2) { J.sd = f; J.stop = f > 0 ? WR : WL; } else { J.sd = 0; J.stop = null; }
    // (III) the floor where it struck boils up after it
    if (B.phase === 3) spout(G.clamp(J.ex, WL + 60, WR - 60), 130, 0.62 * T);
    e = 0;
    const hold = B.phase >= 2 ? 0.3 : 0.14;
    while (e < hold) { const dt = yield; e += dt; step(dt, END, 56); }
    if (B.phase < 2) return;
    // II: out along the floor again to the wall, and up off it
    const s1 = J.xc == null ? s0 : J.xc, back = G.clamp(Math.abs(far - s1) / 900, 0.35, 0.8);
    e = 0;
    while (e < back) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / back);
      step(dt, Math.min(END, tiltTo(G.lerp(s1, far, E.inQuad(k)))), 56);
    }
    const t1 = tiltTo(far);
    e = 0;
    while (e < 0.28) { const dt = yield; e += dt; step(dt, G.lerp(t1, -0.7, E.outQuad(Math.min(1, e / 0.28))), 50); }
  }
  function* jetLow(J, b, f, hx, T) {
    const P = G.player;
    const beats = B.phase >= 2 ? ['swell', 'level', 'swell'] : ['swell', 'level'];
    for (let i = 0; i < beats.length; i++) {
      let e = 0;
      if (beats[i] === 'swell') {
        if (i) {
          // down again by the floor, throat filling
          target(hx - f * 20, FLOOR - 26, 0, aim(f, 0.55)); b.fast = false; b.throatT = 0.8; G.audio.play('gulp');
          while (e < 0.5 * T) { const dt = yield; e += dt; b.gill = Math.max(b.gill, 0.5 + 0.5 * Math.sin(e * 24)); aimJet(J, b); }
          e = 0;
        }
        // into the floor under its chin: the water skids away along it
        openJet(J, b, f, 0.42);
        let sent = false;
        while (e < 0.4) {
          const dt = yield;
          e += dt;
          bear(b, f, hx, dt, 46); b.ty = FLOOR - 46; aimJet(J, b);
          if (!sent && J.grounded) {
            sent = true;
            roller(G.clamp(J.ex, WL + 30, WR - 30), f, false, 520);
            splash(J.ex, FLOOR - 6, 1.1); G.fx.thud(J.ex, FLOOR, 0.6, { noCrack: true });
          }
        }
        if (!sent) roller(G.clamp(J.ex, WL + 30, WR - 30), f, false, 520);
        J.on = false;
      } else {
        // its head jerks up level, a gulp, and the jet follows the swell out over a standing head
        target(hx - f * 30, FLOOR - 64, 0, aim(f, -0.03)); b.fast = true; b.throat = 0.9; G.audio.play('gulp');
        while (e < 0.38) { const dt = yield; e += dt; aimJet(J, b, true); }
        J.front = 0; openJet(J, b, f, 2.6);
        let boiled = B.phase < 3, past = 0;
        while (past < 0.32) {
          const dt = yield;
          J.front += 520 * dt;
          bear(b, f, hx, dt, 40); b.ty = FLOOR - 64; aimJet(J, b, true);
          if (J.walled) past += dt;
          if (!boiled && (P.x - J.ex) * f < 40) { boiled = true; spout(G.clamp(P.x + P.vx * 0.2, WL + 60, WR - 60), 110, 0.75 * T); }
        }
        J.on = false; J.front = 3000;
      }
    }
  }
  function* atkJet() {
    const b = B.body, P = G.player, T = K.T();
    const high = K.chance(0.5, 'high');
    const hx = G.clamp(P.x - facePlayer() * (high ? 380 : 430), WL + 110, WR - 110);
    const f = P.x >= hx ? 1 : -1;
    yield* glide(hx, high ? FLOOR - 230 : FLOOR - 50, 0, aim(f, high ? -0.6 : 0.3), 0.8);
    // the tell: the throat fills, the jaws clamp, the gills flare and water spurts at the corners
    const J = jet();
    const tele = (high ? 0.9 : 0.85) * T;
    target(hx - f * 26, high ? FLOOR - 280 : FLOOR - 26, 0, aim(f, high ? -0.98 : 0.55));
    // (its neck winds tighter as it fills: low, to brace against the floor)
    b.throatT = 1; b.jawT = 0;
    const coil0 = b.coil || 0, coil1 = high ? 0.2 : 0.7;
    G.audio.play('swell', { dur: tele });
    // (the key poses: it bows and drinks; then, high, its neck draws up straight and rigid as a column, or,
    // low, it hunches down on the floor, the coils humped up behind a short braced neck. The head is home
    // before its aim is marked (k 0.5), and
    // from then the neck holds the pose, water pulsing down it.)
    pose('jetDrink');
    let e = 0, homed = false;
    while (e < tele) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / tele);
      if (!homed && k >= 0.36) { homed = true; pose(high ? 'jetHighHold' : 'jetLowHold'); releasePose(0.1); }
      else if (homed) pose(high ? 'jetHighHold' : 'jetLowHold', { lift: 5 * Math.sin(e * 24), amp: 2 * k });
      else if (k >= (high ? 0.2 : 0.14) && b.poseName === 'jetDrink') pose(high ? 'jetHighRise' : 'jetLowBrace');
      b.coil = G.lerp(coil0, coil1, E.outQuad(Math.min(1, k * 1.6)));
      b.gill = Math.max(b.gill, 0.55 + 0.45 * Math.sin(e * 24));
      b.va += G.rand(-1, 1) * 40 * k * dt;
      if (Math.random() < dt * 18 * k) {
        const m = mouthV(b), va = viewOf(b).ang;
        G.fx.spawn({ kind: 'spark', x: m.x - Math.cos(va) * 40, y: m.y - Math.sin(va) * 40 + 6, vx: G.rand(-60, 60) - f * 40, vy: G.rand(-140, -20), life: 0.5, size: 1.6, color: WATER, grav: 1300, a: 0.6 });
      }
      aimJet(J, b); J.warn = G.clamp((k - 0.5) / 0.5, 0, 1);
    }
    J.warn = 0;
    if (high) yield* jetHigh(J, b, f, hx, T); else yield* jetLow(J, b, f, hx, T);
    J.on = false; J.done = true;
    b.fast = false; b.throatT = 0;
    // spent: its head comes down onto the shore, water running from its jaws, and its neck unwinds; the
    // coils slump down into the sea after it
    target(b.x, FLOOR - 12, 0, aim(f, 0.08)); b.jawT = 0.3;
    pose('jetSpent');
    const c0 = b.coil;
    e = 0;
    while (e < 0.3) { e += yield; b.coil = c0 * (1 - E.inOutQuad(Math.min(1, e / 0.3))); }
    b.coil = 0;
    b.exposed = true;
    yield* hold(B.phase === 3 ? 0.8 : 0.95, (t) => pose('jetSpent', { lift: 10 * Math.sin(t * 6), up: 2 * Math.sin(t * 6 + 1) }));
    b.exposed = false;
  }

  // ------------------------------------------------------------------ v2.1a: from the boss study
  // A cue for the scripted dodger in tools/boss-tests.js, which reads hazards by kind: it hurts nothing
  // and draws nothing. 'flycut' (jump it as it comes) for a bite along the floor, 'crescent' (stay
  // down) for a snap over a standing head; but a hero up on a rock is level with that snap, and jumps it.
  // It follows the head (lead pixels ahead of it) while live() says so.
  function cue(kind, live, lead) {
    const b = B.body, P = G.player;
    return H.add({
      kind, want: kind, layer: 'none', x: b.x, y: FLOOR - 22, vx: 0, dir: 0,
      update() {
        const up = P.y < FLOOR - 40;
        this.kind = this.want === 'crescent' && up ? 'flycut' : this.want;
        this.y = up ? P.y - 22 : FLOOR - 22;
        this.x = b.x + b.face * (lead || 80); this.vx = b.face * 600; this.dir = b.face;
        if (!live()) this.dead = true;
      },
    });
  }

  // Breach: its answer to a hero riding over its head (on it, hopping on it, or waiting on the wreckage
  // or a rock above it). It rears back off them with a hiss and goes down; the ground under the hero
  // darkens and heaves as it rises beneath them, following them, then holds still a moment, and it
  // comes up through that spot jaws first, past the top of the sky. Staying up there is no answer:
  // stepping off the spot is.
  //   II: it drops back and comes up a second time, under wherever the hero went.
  //   III: it comes down on the shore as a slam, and a wave runs out each way.
  function* atkBreach() {
    const b = B.body, P = G.player, T = K.T();
    const n = B.phase >= 2 ? 2 : 1;
    // it rears back off them, jaws parting, and goes down
    b.jawT = 0.55; G.audio.play('hiss');
    target(b.x - b.face * 40, b.y - 60, 0, aim(b.face, -0.55)); b.fast = true;
    // (it recoils from them, arched back and hissing, the coils bunching up behind)
    pose('breachRecoil');
    yield* wait(0.24);
    b.jawT = 0; b.fast = false;
    yield* sinkAway(0.36);
    let x = P.x;
    for (let i = 0; i < n; i++) {
      const tele = (i ? 0.66 : 0.84) * T, lock = i ? 0.26 : 0.3;
      const hz = heave(G.clamp(P.x, WL + 80, WR - 80), 136, tele, lock);
      G.audio.play('levRumble', { dur: tele });
      // down under the floor it follows the heave (its neck goes out to sea, out of sight)
      b.direct = true; b.z = 0.3; b.y = FLOOR + 220;
      let e = 0;
      while (e < tele) { e += yield; b.x = hz.x; }
      x = hz.x;
      // up through it, jaws wide, past the top of the sky
      // (canted a little towards the hero, so the jaws show in profile rather than edge-on)
      b.z = 0; b.x = x; b.y = FLOOR + 170; b.ang = b.ta = -Math.PI / 2 + 0.34 * (P.x >= x ? 1 : -1); b.jawT = 1; b.jaw = 1;
      G.fx.impact(x, FLOOR - 220, 0.06); G.fx.punch(0.025); G.fx.shake(14);
      G.fx.lines(x, FLOOR - 140, 18, G.pal().hot, { r0: 60, speed: [900, 1600] });
      G.audio.play('lunge'); G.audio.play('seaRoar');
      splash(x, level(0) - 4, 2);
      if (!flooded()) G.fx.dust(x, FLOOR, 6, { speed: [80, 320], size: [8, 16], life: [0.6, 1.1], up: 90, a: 0.3 });
      poseReset(); pose('mawRise');
      yield* tween(b, { y: FLOOR - 540 }, 0.24, E.outQuad);
      // the jaws shut at the top, and the head snaps on over with the bite
      b.jawT = 0; G.audio.play('bite');
      poseKick({ tip: 4 * (P.x >= x ? 1 : -1) * (Math.cos(b.ang) >= 0 ? 1 : -1), up: 180 });
      yield* wait(0.18);
      if (i < n - 1) {
        // it falls back down the way it came, under the floor
        b.ta = -Math.PI / 2 - 0.1; pose('sinkDown');
        yield* tween(b, { y: FLOOR + 200 }, 0.3, E.inQuad);
        splash(x, level(0) - 4, 1.2); G.audio.play('splash');
      }
    }
    // it comes down on the shore beside the spot, away from the hero, facing them (curling over, then a
    // bounce on landing, the coils after)
    const f = P.x >= x ? 1 : -1, lx = G.clamp(x - f * 150, WL + 120, WR - 120);
    b.ta = aim(f, 0.55); pose('mawOver');
    yield* tween(b, { x: lx, y: FLOOR }, 0.36, E.inQuad);
    b.ta = aim(f, 0.12);
    pose('beached'); poseKick({ up: 340, tip: -1.5, lift: -320 });
    if (B.phase === 3) {
      // (III) it comes down as a slam: the shore jumps, and a wave runs out each way
      crash(lx, 1.7);
      G.fx.impact(lx, FLOOR - 50, 0.07); G.fx.lines(lx, FLOOR - 40, 16, G.pal().hot, { r0: 40 });
      for (const d of [-1, 1]) H.shockwave(lx + d * 70, d, 500, 46, { boss: '120,200,215', hot: '220,245,250' });
    } else crash(lx, 1.3);
    b.exposed = true;
    let e = 0;
    const lie = B.phase === 3 ? 0.95 : 1.1;
    while (e < lie) { const dt = yield; e += dt; b.gill = Math.max(b.gill, 0.4 + 0.4 * Math.sin(e * 8)); }
    b.exposed = false;
  }

  // Barnacles: it rears and spits clusters of spiked barnacles that stick where they land (the floor, a
  // wall, the wreckage) and burst into spines a moment later. The tell is how it spits.
  //   Its head swings wide from side to side as its throat fills: they are flung all over the shore,
  //   with room between them.
  //   A tight, quick bob, snout down towards the hero: a line of them laid out towards the hero and past
  //   them, nearest first, close together. Get off the line: past its end, or back towards the head.
  //   II: more of them. III: they go off one after another, a chain running down the line.
  function* atkBarnacles() {
    const b = B.body, P = G.player, T = K.T();
    const line = K.chance(0.5, 'line');
    const f = facePlayer(), hx = G.clamp(P.x - f * 420, WL + 120, WR - 120);
    yield* glide(hx, line ? FLOOR - 150 : FLOOR - 215, 0, aim(f, line ? 0.2 : -0.35), 0.8);
    // the tell, as its throat fills
    const tele = 0.72 * T;
    b.throatT = 0.85; G.audio.play('gulp');
    // (the key poses: a bow as it gulps; then, for a line, pulled in compact and low, the neck wound
    // tight; scattered, the neck stretched out tall over the shore. The head is home before it spits.)
    pose('barnGulp');
    let e = 0, homed = false;
    const P_B = line ? 'barnLine' : 'barnWide';
    while (e < tele) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / tele);
      if (!homed && e >= tele - 0.12) { homed = true; poseNeck(P_B); releasePose(0.09); }
      else if (!homed && k > (line ? 0.3 : 0.2) && b.poseName === 'barnGulp') pose(P_B);
      if (line) {
        // quick, tight bobs, snout down at the hero
        if (Math.floor(e / 0.14) !== Math.floor((e - dt) / 0.14)) { b.vy += 240; b.va += f * 2.5; }
        b.ta = aim(f, 0.24); b.tx = hx; b.ty = FLOOR - 150;
      } else {
        // wide swings of its head from side to side, growing
        const sw = Math.sin(e * 6.2) * E.outQuad(k);
        b.ta = aim(f, -0.38 + 0.6 * sw); b.tx = hx - f * 50 * sw; b.ty = FLOOR - 215 + 20 * Math.abs(sw);
      }
      b.gill = Math.max(b.gill, 0.45 * k);
    }
    // where they go
    const n = (line ? 3 : 4) + B.phase + (K.hard() ? 1 : 0), xs = [];
    if (line) {
      // from a little in front of its jaws to just past the hero, close enough that there is no gap
      const x0 = hx + f * 175, x1 = P.x + f * 60, sp = G.clamp(((x1 - x0) * f) / Math.max(1, n - 1), 60, 125);
      for (let i = 0; i < n; i++) xs.push(G.clamp(x0 + f * i * sp, WL + 30, WR - 30));
    } else {
      // scattered: across the shore, never closer than 190 to each other, one near the hero
      xs.push(G.clamp(P.x + G.rrand(-60, 60), WL + 60, WR - 60));
      for (let tries = 0; tries < 200 && xs.length < n; tries++) {
        const x = G.rrand(WL + 60, WR - 60);
        if (xs.every((v) => Math.abs(v - x) >= 190)) xs.push(x);
      }
      xs.sort((a, c) => (a - c) * f);
    }
    const base = B.phase === 1 ? 1.45 : B.phase === 2 ? 1.3 : 1.15, gap = line ? 0.12 : 0.17;
    b.throatT = 0;
    for (let i = 0; i < xs.length; i++) {
      const m = mouth(b), tx = xs[i], tf = G.clamp(Math.abs(tx - m.x) / 760, 0.5, 0.95);
      const vx = (tx - m.x) / tf, vy = (FLOOR - m.y - 0.5 * 1300 * tf * tf) / tf;
      // its head flicks the way it spits, and the jaws snap open
      if (line) { b.vy += 300; b.va -= f * 4; } else { b.ta = Math.atan2(vy, vx); }
      b.jawT = 0.85; b.jaw = Math.max(b.jaw, 0.5);
      // (III) a chain: each goes off a beat after the one before, all down the line
      const fuse = tf + base + (B.phase === 3 ? i * 0.2 - i * gap : 0);
      barnacle(m.x, m.y, vx, vy, Math.max(tf + 0.4, fuse), tx);
      G.audio.play('levSpit'); G.fx.kick(-f * 1.5, 0);
      poseKick({ lift: line ? 140 : 200, curl: line ? -1.2 : 1.2 }); // (a heave of the coils behind each one: neck only)
      G.fx.burst(m.x, m.y, { n: 4, color: WATER, kind: 'spark', speed: [80, 220], angle: Math.atan2(vy, vx), spread: 0.8, life: [0.2, 0.4], size: [1.2, 2.2], grav: 1200, a: 0.6 });
      yield* wait(gap * 0.4);
      b.jawT = 0.15;
      yield* wait(gap * 0.6);
    }
    // spent: its head sags, water running from its jaws, and the neck lets go of its pose
    target(b.x, FLOOR - 40, 0, aim(f, 0.12)); b.jawT = 0.3;
    pose('jetSpent');
    b.exposed = true;
    yield* hold(0.75, (t) => pose('jetSpent', { lift: 8 * Math.sin(t * 6) }));
    b.exposed = false; b.jawT = 0;
  }

  // Thrash: it comes up onto the shore and bites its way after the hero, again and again, each bite a
  // short lunge from where the last ended. The last drives its jaws into the sand, and it lies there
  // stuck, gasping and tugging, for a long moment.
  //   The tell for each bite is its snout as it draws back: down at the sand, a low bite along the
  //   floor (jump it); cocked up at the air, a snap at head height over a standing hero (stay down).
  //   The last is always low. 3 bites in I, 4 in II, 5 in III, each read a little shorter.
  function* atkThrash() {
    const b = B.body, P = G.player, T = K.T();
    const n = 2 + B.phase;
    let f = facePlayer();
    pose('skim');
    yield* glide(G.clamp(P.x - f * 300, WL + 110, WR - 110), FLOOR - 40, 0, aim(f, 0.2), 0.7, true);
    G.audio.play('hiss');
    for (let i = 0; i < n; i++) {
      const last = i === n - 1, high = !last && K.chance(0.4, 'high');
      f = facePlayer();
      const read = (last ? 0.62 : G.lerp(0.5, 0.36, i / Math.max(1, n - 2))) * T * (B.phase === 3 ? 0.92 : 1);
      // it draws back, the neck winding, snout down at the sand or cocked up at the air, and follows
      b.direct = false; b.fast = true; b.jawT = high ? 0.6 : 0.35;
      const c0 = b.coil || 0, c1 = last ? 0.95 : 0.6;
      let e = 0, glinted = false, hint = null;
      const live = { on: true };
      // (the key poses: low, drawn back with its snout on the sand; high, cocked up and arched back; the
      // last, a deep coiled crouch, the body sinking under it. Each draws back further in its last beat.)
      const P_R = last ? 'thrashLast' : high ? 'thrashHigh' : 'thrashLow';
      while (e < read) {
        const dt = yield;
        e += dt;
        const k = Math.min(1, e / read);
        pose(P_R, { back: -16 * (1 - E.outQuad(Math.min(1, k * 1.6))), tip: (high ? -0.06 : 0.06) * k });
        b.coil = G.lerp(c0, c1, E.outQuad(k));
        b.tx = G.clamp(P.x - f * (240 + 30 * k), WL + 100, WR - 100);
        b.ty = high ? FLOOR - 150 - 24 * k : FLOOR - 10 + 6 * k;
        b.ta = aim(f, high ? -0.55 - 0.2 * k : 0.42 + 0.14 * k);
        if (!glinted && e >= read - 0.18) { glinted = true; const m = mouthV(b); G.fx.glint(m.x, m.y, 30, G.pal().hot, 0.24); G.audio.play('glint'); }
        if (!hint && e >= read - 0.2) hint = cue(high ? 'crescent' : 'flycut', () => live.on);
      }
      // the bite: head first, the neck snapping straight behind it
      pose('lungeStrike'); releasePose(0.05);
      b.coil = 0; b.direct = true; b.hurt = true; b.jawT = 1;
      const x0 = b.x, y0 = high ? b.y : FLOOR, reach = last ? 330 : 270;
      const x1 = G.clamp(x0 + f * Math.min(reach, Math.max(150, Math.abs(P.x - x0) + 50)), WL + 90, WR - 90);
      const y1 = high ? FLOOR - 100 : last ? (flooded() ? FLOOR - 2 : FLOOR + 12) : FLOOR;
      b.ta = aim(f, high ? -0.04 : last ? 0.42 : 0.06);
      G.audio.play('whoosh');
      e = 0;
      const d = last ? 0.17 : 0.13;
      while (e < d) {
        const dt = yield;
        e += dt;
        const k = E.outQuad(Math.min(1, e / d));
        b.x = G.lerp(x0, x1, k); b.y = G.lerp(y0, y1, k);
        if (!high && Math.random() < dt * 60) G.fx.spawn({ kind: 'spark', x: b.x - f * G.rand(20, 70), y: level(0) - 3, vx: -f * G.rand(60, 240), vy: -G.rand(150, 420), life: G.rand(0.3, 0.6), size: G.rand(1.4, 2.6), color: flooded() ? WATER : '150,150,140', grav: 1400, a: 0.55 });
      }
      b.jawT = 0; b.jaw = 0.2; G.audio.play('bite');
      const mo = mouth(b);
      G.fx.lines(mo.x, mo.y, 10, G.pal().hot, { r0: 18 });
      if (!high) splash(mo.x, level(0) - 4, 0.5);
      live.on = false;
      if (last) break;
      // a shake of the head on the bite, then it hauls its head back to come again
      yield* wait(0.07);
      b.hurt = false;
      b.va += (i % 2 ? 1 : -1) * 10;
      pose('thrashOver');
      yield* wait(0.08);
      b.direct = false; b.fast = false; b.jawT = 0.15;
      target(G.clamp(b.x - f * 110, WL + 100, WR - 100), FLOOR - 70, 0, aim(f, 0.05));
      pose('thrashHaul');
      yield* wait(0.24);
    }
    // jaws driven into the sand: stuck there, gasping, tugging at it
    b.hurt = false;
    crash(b.x + f * 70, 1.25);
    G.fx.lines(b.x + f * 70, FLOOR - 30, 12, G.pal().hot, { r0: 30 });
    if (!flooded()) for (const d of [-1, 1]) G.fx.dust(b.x + f * 80, FLOOR, 4, { dir: d, speed: [60, 260], size: [7, 14], life: [0.6, 1.1], up: 70, a: 0.32 });
    b.exposed = true;
    const stuck = B.phase === 3 ? 1.3 : 1.5;
    // stuck: each tug heaves the whole body behind it, the coils bunching and throwing back
    pose('thrashStuck'); poseKick({ lift: -300, reach: -300 });
    let e = 0;
    while (e < stuck) {
      const dt = yield;
      e += dt;
      b.gill = Math.max(b.gill, 0.55 + 0.45 * Math.sin(e * 9));
      b.jawT = 0.05;
      if (Math.floor(e / 0.42) !== Math.floor((e - dt) / 0.42)) {
        b.va -= f * 7; b.vy -= 200;
        poseKick({ back: 160, lift: 320, curl: 3, reach: -260 });
        G.fx.dust(b.x + f * 80, FLOOR, 2, { dir: -f, speed: [30, 140], size: [5, 10], life: [0.4, 0.8], up: 40, a: 0.28 });
        G.audio.play('stomp');
      }
    }
    b.exposed = false;
    // it tears its jaws free in a spray of sand
    b.ta = aim(f, -0.25);
    G.audio.play('splash', { vol: 0.5 });
    if (!flooded()) G.fx.dust(b.x + f * 80, FLOOR, 5, { dir: -f, speed: [60, 300], size: [6, 13], life: [0.5, 1], up: 80, a: 0.32 });
    // (torn free, the head flies up past where it stops, and the coils spring back)
    pose('thrashHaul'); poseKick({ up: 260, tip: -2.4, back: 200, lift: 260 });
    yield* tween(b, { y: FLOOR - 52 }, 0.22, E.outQuad);
  }

  // Gyre: it goes out to sea and coils itself into a ring round the bay, and the water inside it turns.
  // Its head rises in the middle of the ring to watch. Spouts tear up all along the shore except where
  // the coil has its gap, and the ring turns, and the gap with it: keep with the gap. Then the coil falls
  // in, and its head comes down on the shore, spent.
  //   II: it turns further (and the flood drags at the legs). III: faster and further, swinging back on
  //   itself, with the current pulling.
  const GYRE_A = 430, GYRE_HALF = 120;
  const gyreGap = (th) => 640 + GYRE_A * Math.cos(th);
  function* atkGyre() {
    const b = B.body, P = G.player, T = K.T();
    const steps = B.phase + 4, dth = [0, 0.38, 0.4, 0.46][B.phase];
    const th0 = [0, 0.8, 0.55, 0.42][B.phase], s = P.x >= 640 ? 1 : -1; // (the gap starts on the hero's side)
    const thAt = (u) => { const th = th0 + u * dth; return s > 0 ? th : Math.PI - th; };
    const tele = 0.56 * T, iv = Math.max(tele + 0.3, B.phase === 3 ? 0.78 : 0.86);
    yield* sinkAway(0.4);
    B.pullK = B.phase === 3 ? 0.35 : 1;
    const gy = B.gyre = { k: 0, to: 1, th: thAt(0), spin: 0, look: 0 };
    // up in the middle of the ring, watching
    b.direct = true; b.x = 640; b.z = 0.55; b.y = B.sea.y + 160; b.ang = b.ta = -Math.PI / 2;
    G.audio.play('levChurn', { dur: 0.55 + steps * iv + 0.6 });
    splashAt(640, 0.55, 1.8); G.audio.play('splash');
    const look = () => {
      const q = proj(b.x, b.y - HH, b.z), dx = P.x - q.x, f = dx >= 0 ? 1 : -1;
      b.ta = aim(f, G.clamp(Math.atan2(P.y - 30 - q.y, Math.abs(dx)), -0.3, 1.0));
    };
    // (up out of the middle of the ring, arched and roaring, the coils surging; then it watches, its
    // neck swaying slowly against the turn of the water)
    poseReset(); pose('gyreRise'); b.jawT = 0.7;
    yield* tween(b, { y: B.sea.y - 230 }, 0.5, E.outCubic);
    b.jawT = 0.1;
    const sway = (t) => pose('gyreWatch', { curl: 0.45 * Math.sin(t * 1.3), lift: 10 * Math.sin(t * 2.2), up: 6 * Math.sin(t * 1.3 + 0.5) });
    let e = 0;
    while (e < 0.55) { const dt = yield; e += dt; look(); b.y = B.sea.y - 230 + Math.sin(e * 3) * 6; sway(e); }
    // the spouts: a ring of them that turns, every one but those at the gap in its coil
    const pulse = (g) => {
      for (const sd of [-1, 1]) {
        for (let x = g + sd * (GYRE_HALF + 55); sd < 0 ? x > WL - 50 : x < WR + 50; x += sd * 100) {
          const cx = G.clamp(x, WL + 45, WR - 45);
          if (Math.abs(cx - g) - 55 < GYRE_HALF) continue; // (never into the gap)
          spout(cx, 110, tele, 0.55);
        }
      }
    };
    let t = 0, next = 0;
    const end = (steps - 1) * iv + tele + 0.45;
    while (t < end) {
      const dt = yield;
      t += dt;
      // the coil turns so that its gap is where the gap will be when the spouts now boiling come up
      gy.th = thAt(G.clamp((t - tele) / iv, 0, steps - 1));
      look(); b.y = B.sea.y - 230 + Math.sin(t * 3) * 6; sway(t + 0.55);
      if (next < steps && t >= next * iv) { pulse(gyreGap(thAt(next))); next++; poseKick({ up: 90, lift: 150 }); }
    }
    // the coil falls in, and its head comes down on the shore, spent: it curls over, lands chin first,
    // bounces once, and the coils come down after
    gy.to = 0;
    for (let i = 0; i < 6; i++) { const a = gy.th + 0.6 + i; splashAt(640 + GYRE_A * Math.cos(a) * 1.4, 0.62 - 0.36 * Math.sin(a), 1.6); }
    G.audio.play('surf'); G.fx.shake(8);
    const f = facePlayer(), lx = G.clamp(P.x - f * 210, WL + 120, WR - 120);
    b.ta = aim(f, 0.7); pose('breachOver');
    yield* tween(b, { x: lx, y: FLOOR, z: 0 }, 0.46, E.inQuad);
    b.ta = aim(f, 0.12);
    crash(lx, 1.4);
    pose('beached'); poseKick({ up: 340, tip: -1.5, lift: -300 });
    B.pullK = 1;
    b.exposed = true;
    e = 0;
    const lie = B.phase === 3 ? 1.0 : 1.2;
    while (e < lie) { const dt = yield; e += dt; b.gill = Math.max(b.gill, 0.4 + 0.4 * Math.sin(e * 8)); if (e > 0.4) pose('beached', { lift: 10 * Math.sin(e * 8) }); }
    b.exposed = false;
  }

  // ------------------------------------------------------------------ corrupted: its own two attacks
  // the ground a bite sweeps: from a little behind the head to where its jaws shut, at the height it strikes
  function aimFang(f, base, tip, dir, yb) {
    f.l = Math.min(base - dir * 40, tip); f.r = Math.max(base - dir * 40, tip);
    f.top = yb - 150; f.bot = yb + 40; f.srcX = base;
  }
  // A head bites: down and through, so that its jaws shut on the tip; it lies there a moment after.
  function* lungeBite(h, tip, yb, f, dir, d) {
    const hx = G.clamp(tip - dir * 100, WL + 60, WR - 60), x0 = h.x, y0 = h.y;
    h.direct = true; h.jawT = 1.1; h.ta = aim(dir, 0.12);
    f.live = true; f.head = h; f.dir = dir;
    G.audio.play('lunge');
    let e = 0;
    while (e < d) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / d);
      // (the same shot forward as its snap: all speed at once, slowing into the bite)
      h.x = G.lerp(x0, hx, E.outQuad(k)); h.y = G.lerp(y0, yb, E.outCubic(k));
      if (Math.random() < dt * 70) G.fx.spawn({ kind: 'spark', x: h.x - dir * 70, y: h.y - HH + G.rand(-34, 34), vx: -dir * G.rand(400, 800), vy: G.rand(-20, 20), life: G.rand(0.1, 0.2), size: G.rand(1.4, 2.4), color: BLOOD, len: 0.06, drag: 3, a: 0.5 });
    }
    h.jawT = 0;
    G.audio.play('bite'); G.fx.shake(6); G.fx.kick(dir * 4, 0);
    const m = mouth(h);
    G.fx.lines(m.x, m.y, 10, VHOT, { r0: 18 });
    if (yb > FLOOR - 30) voidBurst(m.x, level(0) - 4, 0.5, true);
    yield* wait(0.06);
    f.live = false; f.dead = true;
  }

  // Hydra (corrupted, every phase): a second head, of the void, tears up out of the floor on the far
  // side of the hero, and the two bite in turn from either side: the real head, then the void head
  // a beat behind it, its jaws always shutting a little short of where the real head's did. So each
  // bite sends the hero back the other way, into the ground the last bite has just left. Last, both
  // at once, closing on either side of the hero and stopping a stride apart: the gap between them is
  // the one safe place. Then the void head sinks back, and the real one lies open where it bit.
  //   The tell: it rears on the near side, its throat swells black and its eyes go dark, and the
  //   floor splits crimson where the second head will come up.
  function* atkHydra() {
    const b = B.body, P = G.player, T = K.T();
    const s = P.x < 640 ? 1 : -1; // the void head comes up on the roomier side
    const root = G.clamp(P.x + s * 330, WL + 120, WR - 120);
    const pairs = B.phase === 1 ? 2 : 3, beat = (B.phase === 3 ? 0.47 : 0.53) * T, REACH = 360;
    // the real head keeps to the hero's other side from the void head, wherever the hero goes
    // (and never so near the void head that its reach would run past it)
    const flank = () => {
      const sd = G.sign(P.x - root) || -s;
      return G.clamp(root + sd * Math.max(420, (P.x + sd * 290 - root) * sd), WL + 110, WR - 110);
    };
    const faceOf = (x) => G.sign(P.x - x) || s;
    B.pullK = 0; // (in the maelstrom: the void holds the floor still, so the gap at the end can be stood in)
    // round to the near side of the hero, and up
    yield* glide(flank(), FLOOR - 150, 0, aim(s, -0.35), 0.6, true);
    b.fast = false;
    b.voidEyeT = 1; b.voidThroat = 1; b.throatT = 1; b.gill = 1; b.jawT = 0.25;
    G.audio.play('gulp'); G.audio.play('abyss');
    const crack = voidCrack(root, 0.95 * T);
    target(b.x - s * 18, FLOOR - 172, 0, aim(s, -0.5)); // it draws itself up as its throat fills
    yield* wait(0.95 * T);
    // the second head tears up out of the floor
    const V = B.vh = voidHead(root, -s);
    b.throatT = 0; b.jawT = 0.7;
    G.audio.play('rend'); G.audio.play('seaRoar');
    G.fx.shake(14); G.fx.kick(0, -4); G.fx.punch(0.02);
    voidBurst(root, FLOOR - 4, 1.6, true);
    G.fx.ring(root, FLOOR - 4, { r0: 20, r1: 150, life: 0.5, color: BLOOD, width: 4, alpha: 0.5 });
    G.fx.ripple(root, FLOOR - 120, 220, 0.4, 0.9);
    V.jawT = 1;
    yield* tween(V, { y: FLOOR - 205 }, 0.32, E.outCubic);
    // it overshoots, and settles facing the hero
    V.direct = false; V.tx = root; V.ty = FLOOR - 150; V.ta = aim(-s, -0.3); V.jawT = 0.15;
    b.jawT = 0;
    yield* wait(0.32);

    let tipA = 0, tipB = 0, yb = FLOOR - 8;
    for (let i = 0; i < pairs; i++) {
      // the real head comes round again to flank the hero
      if (i) { target(flank(), FLOOR - 150, 0, aim(faceOf(flank()), -0.3)); b.fast = true; yield* wait(0.26); b.fast = false; }
      // drawn back and up, the jaws wide. Its reach is its own, not the hero's: from where it rears
      // it strikes a fixed length, a step past where the hero stood when it came round. Its height
      // follows the hero until the last moment (onto the wreckage too).
      const base = b.x, tele = (i ? 0.52 : 0.72) * T, fa = fang(base);
      let dirA = faceOf(base), lockY = P.y;
      b.jawT = 0.9; G.audio.play('hiss');
      let e = 0, glinted = false;
      while (e < tele) {
        const dt = yield;
        e += dt;
        if (e < tele - 0.24) { dirA = faceOf(base); lockY = P.y; }
        target(base - dirA * 30, FLOOR - 185, 0, aim(dirA, -0.55));
        tipA = base + dirA * REACH;
        if ((V.root - base) * dirA > 0) tipA = base + dirA * Math.min(REACH, Math.max(120, Math.abs(V.root - base) - 60));
        tipA = G.clamp(tipA, WL + 16, WR - 16);
        yb = G.clamp(lockY + 10, FLOOR - 220, FLOOR - 8);
        aimFang(fa, base, tipA, dirA, yb); fa.show = true; fa.at = fa.t + tele - e;
        if (!glinted && e >= tele - 0.2) { glinted = true; const m = mouth(b); G.fx.glint(m.x, m.y, 34, VHOT, 0.28); G.audio.play('glint'); }
        // the void head watches, swaying
        V.ta = aim(faceOf(V.root), -0.3 + 0.08 * Math.sin(B.t * 3));
      }
      yield* lungeBite(b, tipA, yb, fa, dirA, 0.14);
      // the echo: its jaws shut a little short of where the real head's did, from the other side
      let dirB = G.sign(tipA - dirA * 60 - V.root) || -dirA;
      tipB = tipA - dirA * 60;
      if (dirB === dirA) { dirB = faceOf(V.root); tipB = V.root + dirB * REACH; } // (the hero is behind it: it turns and bites its own length)
      tipB = G.clamp(V.root + dirB * Math.min(Math.abs(tipB - V.root), 620), WL + 16, WR - 16);
      yield* G.seq.par(settleBack(b, base, 0.12), echo(V, tipB, dirB, yb, beat));
    }

    // last: both together, closing on either side of the hero and stopping a stride apart
    target(flank(), FLOOR - 150, 0, aim(faceOf(flank()), -0.3)); b.fast = true; yield* wait(0.28); b.fast = false;
    const baseA = b.x, dA = G.sign(V.root - baseA) || s, tele = 0.8 * T, GAP = 56;
    const lo = Math.min(baseA, V.root) + 130, hi = Math.max(baseA, V.root) - 130;
    const fa = fang(baseA), fb = fang(V.root);
    // the gap: halfway between the two heads, the one place neither reaches
    const g = lo < hi ? G.clamp((baseA + V.root) / 2, lo, hi) : (baseA + V.root) / 2;
    let e = 0, glinted = false;
    b.jawT = 1; V.jawT = 1; G.audio.play('hiss'); G.audio.play('abyss');
    while (e < tele) {
      const dt = yield;
      e += dt;
      target(baseA - dA * 30, FLOOR - 195, 0, aim(dA, -0.6));
      V.direct = false; V.tx = V.root + dA * 30; V.ty = FLOOR - 195; V.ta = aim(-dA, -0.6);
      aimFang(fa, baseA, g - dA * GAP, dA, FLOOR - 8); aimFang(fb, V.root, g + dA * GAP, -dA, FLOOR - 8);
      fa.show = fb.show = true; fa.at = fa.t + tele - e; fb.at = fb.t + tele - e;
      if (!glinted && e >= tele - 0.2) {
        glinted = true; G.audio.play('glint');
        for (const h of [b, V]) { const m = mouth(h); G.fx.glint(m.x, m.y, 36, VHOT, 0.28); }
      }
    }
    yield* G.seq.par(lungeBite(b, g - dA * GAP, FLOOR - 8, fa, dA, 0.16), lungeBite(V, g + dA * GAP, FLOOR - 8, fb, -dA, 0.16));
    // the two pairs of jaws shut a stride apart, and the shock of it runs out between them
    G.fx.impact(g, FLOOR - 50, 0.07); G.fx.punch(0.025); G.fx.shake(16);
    G.fx.lines(g, FLOOR - 50, 16, VHOT, { r0: 44 });
    G.fx.ripple(g, FLOOR - 50, 260, 0.4, 1);
    voidBurst(g, FLOOR - 20, 1.1, true);
    G.audio.play('slam');
    yield* wait(0.3);
    // the real head slumps where it bit, open; the void head lets go and sinks back down the crack
    b.direct = false; b.voidEyeT = 0;
    target(b.x, FLOOR - 10, 0, aim(dA, 0.05));
    b.exposed = true;
    V.direct = false; V.tx = V.root; V.ty = FLOOR - 120; V.ta = -Math.PI / 2; V.jawT = 0.35;
    yield* wait(0.24);
    V.direct = true;
    yield* tween(V, { y: FLOOR + 200 }, 0.45, E.inQuad);
    voidBurst(V.root, FLOOR - 4, 0.8, true); G.audio.play('splash', { vol: 0.5 });
    B.vh = null; crack.closing = true;
    yield* wait(B.phase === 3 ? 0.2 : 0.35);
    b.exposed = false; b.voidThroat = 0;
  }
  // after a bite: it lies there a moment, then draws back on its neck to where it struck from
  function* settleBack(h, base, hold) {
    yield* wait(hold);
    h.direct = false;
    target(base, FLOOR - 150, 0, aim(G.sign(G.player.x - base) || h.face, -0.3));
    yield* wait(0.3);
  }
  // the void head answers the real head's bite: drawn back, a glint, and through
  function* echo(V, tip, dir, yb, beat) {
    const f = fang(V.root);
    aimFang(f, V.root, tip, dir, yb); f.show = true; f.at = f.t + beat;
    V.direct = false; V.tx = V.root - dir * 30; V.ty = FLOOR - 185; V.ta = aim(dir, -0.55); V.jawT = 0.9;
    G.audio.play('hiss');
    yield* wait(Math.max(0, beat - 0.2));
    const m = mouth(V);
    G.fx.glint(m.x, m.y, 34, VHOT, 0.28);
    yield* wait(Math.min(beat, 0.2));
    yield* lungeBite(V, tip, yb, f, dir, 0.14);
    yield* wait(0.12);
    V.direct = false; V.tx = V.root; V.ty = FLOOR - 150; V.ta = aim(G.sign(G.player.x - V.root) || -dir, -0.3); V.jawT = 0.15;
    yield* wait(0.3);
  }

  // Undertow (corrupted, from the second phase): it goes to the wall further from the hero, lays its
  // head flat to the water and unhinges its jaw, and drinks. The floor floods black and runs towards
  // it, dragging the hero in (in the air and on the wreckage too, only a little less), and void mines
  // ride the current in from the far wall. Whoever is dragged to its lip is bitten. Last, it rears out
  // of the water with its jaws wide to the sky and shuts them over the near side, top to bottom.
  //   The answer: walk against the current, cut or jump the mines, be well clear when the jaws close.
  //   The tell: the head down flat at the wall, the jaw hanging wide, the gills pumping.
  function* atkUndertow() {
    const b = B.body, P = G.player, T = K.T();
    const side = P.x < 640 ? 1 : -1;
    const wall = side > 0 ? WR : WL, mx = wall - side * 130, dir = -side;
    // (the pull is beaten by walking, even by Lune with her bow drawn, which slows her; high water's
    // drag on the legs takes a third off both the pull and the walk)
    const reach = 410, PULL = B.phase === 2 ? 170 : 160;
    // to the wall, then down flat to the water with the jaw unhinged
    yield* glide(mx, FLOOR - 110, 0, aim(dir, -0.2), 0.7);
    B.pullK = 0; // (the maelstrom's own current gives way to this one)
    target(mx + side * 16, FLOOR - 2, 0, aim(dir, 0.3)); b.jawT = 1.25; b.gill = 1;
    G.audio.play('drain'); G.audio.play('gulp');
    const U = B.under = { side, mx, k: 0, to: 1, pull: 0, flow: 0, PULL };
    const close = mawClose(side > 0 ? mx - reach : WL - 20, side > 0 ? WR + 20 : mx + reach);
    yield* wait(0.75 * T);
    G.audio.play('rush');
    const dur = B.phase === 3 ? 4.4 : 4.0, n = B.phase === 3 ? 7 : 5, tele = 0.7 * T;
    close.at = close.t + dur + tele + 0.17;
    const farX = side > 0 ? WL + 30 : WR - 30, lip = mx + dir * 70;
    let e = 0, next = 0.35, made = 0, gnash = 0;
    while (e < dur) {
      const dt = yield;
      e += dt;
      U.pull = PULL * E.inOutQuad(Math.min(1, e / 0.8));
      // the gills pump as it drinks, and the head throbs with it
      b.gill = Math.max(b.gill, 0.55 + 0.45 * Math.sin(e * 8));
      b.ty = FLOOR - 2 + Math.sin(e * 8) * 3;
      next -= dt;
      if (made < n && next <= 0) {
        made++; next = (dur - 1.6) / n;
        voidMine(farX, level(0) - (made % 3 === 0 ? 46 : 14), side, 240, mx); // every third rides a swell, at chest height
        G.audio.play('bubble');
      }
      // dragged to its lip: the jaws snap on them, and open again
      gnash -= dt;
      if (gnash <= 0 && Math.abs(P.x - lip) < 80 && P.y > FLOOR - 150) {
        gnash = 0.8; b.jawT = 0.05;
        K.crush(lip, FLOOR - 40, 70, 50, 1);
        G.audio.play('bite'); G.fx.shake(5);
      }
      if (gnash < 0.55) b.jawT = 1.25;
    }
    // it rears up out of the water, jaws wide to the sky (the current still running)
    b.jawT = 1.35; G.audio.play('seaRoar');
    target(mx + side * 30, FLOOR - 285, 0, aim(dir, -1.05));
    e = 0;
    let glinted = false;
    while (e < tele) {
      const dt = yield;
      e += dt;
      if (!glinted && e >= tele - 0.2) { glinted = true; const m = mouth(b); G.fx.glint(m.x, m.y, 40, VHOT, 0.3); G.audio.play('glint'); }
    }
    // and shuts them over the near side
    const hx = mx + dir * (reach - 105), x0 = b.x, y0 = b.y;
    b.direct = true; b.ta = aim(dir, 0.15); close.live = true;
    G.audio.play('lunge');
    e = 0;
    while (e < 0.17) { e += yield; const k = Math.min(1, e / 0.17); b.x = G.lerp(x0, hx, E.inQuad(k)); b.y = G.lerp(y0, FLOOR - 8, E.inQuad(k)); }
    b.jawT = 0;
    G.audio.play('bite');
    crash(hx + dir * 60, 1.5);
    voidBurst(hx + dir * 80, FLOOR - 10, 1.4, true);
    G.fx.impact(hx + dir * 70, FLOOR - 50, 0.07); G.fx.punch(0.03);
    G.fx.lines(hx + dir * 80, FLOOR - 50, 16, VHOT, { r0: 40 });
    for (const h of H.list) if (h.kind === 'voidmine' && !h.dead) h.pop(); // the crash bursts what is left on the water
    U.to = 0;
    yield* wait(0.06);
    close.live = false; close.dead = true;
    b.exposed = true;
    yield* wait(B.phase === 3 ? 0.9 : 1.05);
    b.exposed = false;
  }

  // Back to rest: each move ends its own way. Off the shore it lifts its head and shakes the water
  // from it; after the tail it lets it sink and settles; after spitting, water runs from its jaws.
  B.recover = function* (name) {
    const b = B.body;
    if (B.dying || b.beached) return;
    b.direct = false; b.hurt = false; b.fast = false;
    if (name === 'lunge' || name === 'spouts' || name === 'maw' || name === 'snap' || name === 'hydra' || name === 'undertow' || name === 'breaker' || name === 'breach' || name === 'thrash' || name === 'gyre') {
      b.ty = FLOOR - 64; b.tz = 0; b.tx = b.x;
      // (it lifts its head off the shore, the neck taking back its S, and shakes it one way, then the other)
      pose('rest', { up: 8, tip: -0.1, curl: 0.25, lift: 10 });
      yield* wait(0.12);
      b.va += b.face * 10; splash(b.x, level(0) - 6, 0.5); G.audio.play('splash', { vol: 0.4 });
      poseKick({ lift: 200, curl: 2 });
      yield* wait(0.16);
      b.va -= b.face * 13; poseKick({ curl: -2.5 });
      for (let i = 0; i < 8; i++) G.fx.spawn({ kind: 'spark', x: b.x + G.rand(-60, 60), y: b.y - HH + G.rand(-20, 20), vx: G.rand(-220, 220), vy: -G.rand(60, 260), life: G.rand(0.4, 0.7), size: G.rand(1.4, 2.4), color: WATER, grav: 1300, a: 0.6 });
      yield* wait(0.18);
    } else if (name === 'slam' || name === 'sweep') {
      B.tail.pose = 'under'; B.tail.rate = 3;
      b.ty = FLOOR - 26;
      pose('rest', { lift: -24, curl: 0.15, tip: 0.05 }); // (the coils settle back down into the sea)
      yield* wait(0.32);
    } else if (name === 'volley' || name === 'jet' || name === 'barnacles') {
      b.jawT = 0.35; b.ty = FLOOR - 60;
      pose('rest', { tip: 0.12, curl: 0.1, lift: -12 }); // (head hung, jaws dripping)
      for (let i = 0; i < 6; i++) { const m = mouth(b); G.fx.spawn({ kind: 'spark', x: m.x, y: m.y, vx: G.rand(-30, 30), vy: G.rand(20, 80), life: 0.7, size: 1.8, color: WATER, grav: 1200, a: 0.6 }); }
      yield* wait(0.3);
      b.jawT = 0;
    } else yield* wait(0.2);
    // a breath: the gills flare once, and the coils swell with it
    b.gill = 1; G.audio.play('hiss');
    poseKick({ lift: 160, up: 40 });
    yield* wait(0.12);
  };

  B.ATTACKS = {
    lunge: atkLunge, snap: atkSnap, slam: atkSlam, spouts: atkSpouts, volley: atkVolley, sweep: atkSweep, maw: atkMaw, breaker: atkBreaker, jet: atkJet,
    breach: atkBreach, barnacles: atkBarnacles, thrash: atkThrash, gyre: atkGyre,
    hydra: atkHydra, undertow: atkUndertow,
  };
  // its corrupted self's own two (corrupt.js): the hydra in every phase, the undertow from the second
  B.corruptBags = { 1: ['hydra'], 2: ['hydra', 'undertow'], 3: ['hydra', 'undertow'] };

  // ------------------------------------------------------------------ stagger and topple: beached
  B.staggerWord = 'BEACHED';
  B.staggerMult = 1.5;
  B.staggerDur = 1.0;
  B.onStagger = function () {
    const b = B.body;
    b.hurt = false; b.coil = 0; b.chatter = 0; b.fin = 0; b.throatT = 0; b.direct = true;
    poseReset();
    B.tail.pose = 'under'; B.tail.rate = 3; B.finCircle = null; B.ebb.hold = false; B.pullK = 1;
    if (B.gyre) B.gyre.to = 0;
  };
  B.dying0 = function () { B.body.beached = true; };
  // thrown up and down onto the shore, where it lies on its side, gasping
  B.staggerIn = function* () {
    const b = B.body, away = G.sign(b.x - G.player.x) || -b.face, f = -away;
    const x0 = b.x, y0 = Math.min(b.y, FLOOR), z0 = b.z, x1 = G.clamp(x0 + away * 70, WL + 130, WR - 130);
    b.direct = true; b.ta = aim(f, -1.0); b.jawT = 0.8;
    G.audio.play('seaRoar');
    let e = 0;
    const d = 0.5;
    while (e < d) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / d);
      b.x = G.lerp(x0, x1, k); b.y = G.lerp(y0, FLOOR, k * k) - 170 * Math.sin(Math.PI * k); b.z = G.lerp(z0, 0, Math.min(1, k * 2));
      if (k > 0.5) b.ta = aim(f, 0.04);
    }
    b.x = x1; b.y = FLOOR; b.z = 0; b.beached = true; b.ang = b.ta = aim(f, 0.04);
    crash(b.x, 1.7);
    poseKick({ lift: -320, curl: 2 }); // (the coils slap down a beat after the head)
    G.fx.impact(b.x, FLOOR - 40, 0.07); G.fx.punch(0.022);
    G.fx.lines(b.x, FLOOR - 40, 16, G.pal().hot, { r0: 50 });
    for (const dd of [-1, 1]) splash(b.x + dd * 120, level(0) - 4, 0.8, dd);
    // it bounces once, and lies still
    yield* tween(b, { y: FLOOR - 28 }, 0.13, E.outQuad);
    yield* tween(b, { y: FLOOR }, 0.15, E.inQuad);
    G.fx.thud(b.x, FLOOR, 0.6, { noCrack: true }); G.audio.play('stomp');
  };
  // it thrashes, and drags itself back into the water
  B.staggerOut = function* () {
    const b = B.body;
    for (let i = 0; i < 2; i++) {
      b.va += (i ? -1 : 1) * 16;
      splash(b.x + (i ? -1 : 1) * 60, level(0) - 4, 1);
      G.audio.play('splash'); G.fx.shake(7);
      yield* wait(0.22);
    }
    b.beached = false; b.jawT = 0;
    target(b.x, FLOOR - 50, 0, aim(b.face, 0.1));
    yield* wait(0.3);
  };
  B.onRecover = function () { B.body.beached = false; };

  // ------------------------------------------------------------------ scenes
  // The sea goes still, a shadow passes under it, and it breaches in a wall of water.
  B.enter = function* () {
    const b = B.body;
    b.direct = true; b.x = 760; b.y = B.sea.y + 300; b.z = 0.5; b.ang = b.ta = -Math.PI / 2 + 0.15;
    B.calm = 1;
    yield* wait(0.5);
    G.audio.play('drain');
    B.shadow = { x: -200, z: 0.5 };
    yield* tween(B.shadow, { x: 1500 }, 1.7, E.inOutQuad);
    B.shadow = null;
    yield* wait(0.25);
    // the breach
    b.x = 760; b.z = 0.42; b.y = B.sea.y + 150;
    B.wall = { x: 760, z: 0.42, t: 0 };
    G.audio.play('splash'); G.audio.play('lunge');
    G.fx.shake(16); G.fx.ripple(proj(760, B.sea.y, 0.42).x, proj(760, B.sea.y, 0.42).y, 420, 0.6, 1.3);
    for (let i = 0; i < 3; i++) splashAt(760 + (i - 1) * 90, 0.42, 2.2);
    yield* tween(b, { y: FLOOR - 400 }, 0.6, E.outCubic);
    yield* wait(0.35);
    // and it comes in over the shore
    b.ta = aim(-1, 0.25);
    yield* tween(b, { z: 0, x: 880, y: FLOOR - 190 }, 0.8, E.inOutCubic);
    b.jawT = 1;
    G.audio.play('seaRoar'); G.fx.shake(12); G.fx.ripple(b.x - 60, b.y - HH, 460, 0.6, 1.2);
    yield* wait(0.55);
    b.jawT = 0; B.calm = 0; B.wall = null;
    target(880, FLOOR - 16, 0, aim(-1, 0.12));
  };

  // II: it rears and roars, and goes down; the sea goes out after it, and a surge rises far out and
  //     breaks over the shore. From then on the floor is water that drags at the legs.
  // III: it swims a circle out at sea and the flood begins to turn; the maelstrom opens, the water
  //     drains into it, and it comes up out of the eye. From then on the current pulls to the eye.
  B.phaseIn = function* (n) {
    const b = B.body;
    b.direct = false; b.beached = false; b.hurt = false;
    if (n === 2) {
      yield* glide(640, FLOOR - 300, 0, -Math.PI / 2 + 0.25 * b.face, 0.5, true);
      b.jawT = 1; G.audio.play('seaRoar'); G.fx.shake(12); G.fx.ripple(b.x, b.y - HH, 420, 0.5, 1.1);
      yield* wait(0.5);
      b.jawT = 0;
      yield* sinkAway(0.45);
      B.sea.to = FLOOR + 90; G.audio.play('drain'); B.calm = 1;
      yield* wait(0.6);
      G.audio.play('thunder');
      B.wave = { z: 2.2, h: 0 };
      yield* tween(B.wave, { z: 0.22, h: 360 }, 1.25, E.inQuad);
    } else {
      yield* sinkAway(0.45);
      B.circling = 1;
      b.direct = true;
      let e = 0;
      while (e < 1.3) {
        const dt = yield;
        e += dt;
        const a = e * 3.2;
        b.x = 640 + Math.cos(a) * 420; b.z = 0.42 + 0.18 * Math.sin(a); b.y = B.sea.y - 30 + Math.sin(a * 2) * 10;
        // swimming round: the head points the way it swims and rears up as it rounds each end (the
        // angle spring in B.tick carries it there), rather than reversing in one frame
        const u = -Math.sin(a);
        b.ta = -Math.PI / 2 + Math.sign(u) * Math.pow(Math.abs(u), 0.4) * Math.PI / 2;
        B.vortex.to = 0.3 * (e / 1.3);
      }
      yield* sinkAway(0.3);
    }
  };
  B.phaseOut = function* (n) {
    const b = B.body;
    if (n === 2) {
      // it breaks
      yield* tween(B.wave, { z: -0.05, h: 420 }, 0.28, E.inQuad);
      B.wave = null; B.wash = 1;
      B.sea.y = B.sea.to = FLOOD; B.calm = 0;
      G.fx.impact(640, FLOOR - 200, 0.08); G.fx.shake(22); G.fx.punch(0.03);
      G.audio.play('splash'); G.audio.play('slam');
      for (let x = 90; x < 1200; x += 110) splash(x, FLOOR - 20, 1.4);
      yield* wait(0.4);
      // and it rides in on it
      yield* breach(640, facePlayer());
      b.jawT = 1; G.audio.play('seaRoar');
      yield* wait(0.35);
      b.jawT = 0;
    } else {
      // the maelstrom opens and the flood drains into it
      B.vortex.to = 1; B.sea.to = SHALLOW;
      G.audio.play('drain');
      let e = 0;
      while (e < 0.85) { e += yield; G.fx.shake(3); }
      b.direct = true; b.x = B.vortex.x; b.y = FLOOR + 170; b.z = 0; b.ang = b.ta = -Math.PI / 2; b.jawT = 1;
      G.fx.impact(b.x, FLOOR - 220, 0.08); G.fx.shake(18); G.fx.punch(0.03);
      G.fx.lines(b.x, FLOOR - 140, 22, G.pal().hot, { r0: 60, speed: [900, 1600] });
      splash(b.x, level(0) - 4, 2.4); G.audio.play('seaRoar');
      yield* tween(b, { y: FLOOR - 340 }, 0.3, E.outQuad);
      yield* wait(0.35);
      b.jawT = 0; B.circling = 0;
      yield* glide(G.clamp(b.x + 260 * facePlayer(), WL + 120, WR - 120), FLOOR - 20, 0, aim(facePlayer(), 0.12), 0.7);
    }
  };

  B.idle = function () {
    const b = B.body, P = G.player;
    b.direct = false; b.fast = false;
    const d = P.x - b.x, f = G.sign(d) || b.face;
    if (Math.abs(d) > 340 || b.z > 0.02 || Math.abs(b.tx - b.x) > 400) b.tx = G.clamp(P.x - f * 240, WL + 110, WR - 110);
    b.ty = FLOOR - 16 + Math.sin(B.t * 1.6) * 9; b.tz = 0;
    b.ta = aim(f, 0.12 + Math.sin(B.t * 1.1) * 0.06);
    b.jawT = 0.05;
    // at rest a slow breath runs through it: a loose S in the neck, the coils rising and settling
    pose('rest', { curl: 0.18 + 0.1 * Math.sin(B.t * 1.1 + 0.6), lift: 12 * Math.sin(B.t * 0.8), tip: 0.03 * Math.sin(B.t * 1.6 - 1.2) });
  };

  // ------------------------------------------------------------------ every frame
  const TAILP = {
    under: (t, s) => [t.ex, s + 170, t.ez, t.ex, s + 120, t.ez],
    up: (t, s) => [t.ex + 120, s - 330, t.ez, t.ex - 60, s - 330, t.ez],
    slap: (t, s) => [t.ex + 230, s + 10, t.ez, t.ex + 80, s - 360, t.ez],
    raised: (t) => [t.aimX, -520, 0.02, (t.aimX + t.ex) / 2, -380, t.ez * 0.35],
    // (v2.5c) its first breaking of the surface, low and curled over, before it rises
    breach: (t, s) => [t.ex + 70, s - 110, t.ez, t.ex - 30, s - 50, t.ez],
    // the single slap's cock: lifted higher and back before it whips down onto the water
    cock: (t, s) => [t.ex - 90, s - 420, t.ez, t.ex - 20, s - 300, t.ez],
    // off the floor after the blow, the fluke lifting slowly away before it goes up again
    rebound: (t) => [t.tipX, FLOOR - 190, 0.12, t.tipX + (t.ex > t.tipX ? 70 : -70), -260, t.ez * 0.3],
  };
  function sample(out, p0, p1, p2, p3, n, w0, w1, amp, k, ph, sA) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), u = 1 - t;
      const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
      let x = b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x, y = b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y;
      const z = b0 * p0.z + b1 * p1.z + b2 * p2.z + b3 * p3.z;
      const d0 = 3 * u * u, d1 = 6 * u * t, d2 = 3 * t * t;
      const dx = d0 * (p1.x - p0.x) + d1 * (p2.x - p1.x) + d2 * (p3.x - p2.x), dy = d0 * (p1.y - p0.y) + d1 * (p2.y - p1.y) + d2 * (p3.y - p2.y);
      const dl = Math.hypot(dx, dy) || 1;
      let off = Math.sin(t * k - (ph == null ? G.t * 2.6 : ph)) * amp * Math.sin(Math.PI * t);
      // (the curl) one S wound into the last half of the neck, gone again at the head
      if (sA && t > 0.5) { const u = (t - 0.5) / 0.5; off += sA * Math.sin(G.TAU * u) * (1 - 0.5 * u); }
      x += -dy / dl * off; y += dx / dl * off;
      const q = out[i] || (out[i] = {});
      q.x = x; q.y = y; q.z = z; q.w = G.lerp(w0, w1, Math.pow(t, 1.4)); q.foam = false;
    }
    out.length = n;
    return out;
  }

  // ------------------------------------------------------------------ v2.5c: a bone for every part
  // Drawing only: no hit area, hazard, wait or move reads anything here. The game still reads B.spine,
  // B.tailPts, b.jaw and the head's pose; what is drawn is laid over them, each part on its own spring:
  //  - the jaw on its own hinge (b.jawD): it carries on past where the bite puts it, open and shut, drops
  //    open as the head is yanked up, and is knocked open by a blow or a landing; a slow breath at rest;
  //  - on the head, the lure's filament, the three rays of the frill between the horns and two barbels at
  //    the lip are chains of joints (D.angleChain), stiff at the root and loose at the end, swung about by
  //    the head's turns, starts and stops, and hanging under their own weight;
  //  - every segment of the neck and the coils behind it is its own weight on a spring (B.spineD), stiff
  //    where it joins the skull and loose out in the sea, and each carries on what the one nearer the head
  //    does: whatever the head does runs down the body a beat late and swings past; the crest's spines
  //    stand and fall one after another down the neck, and lie back as it moves fast;
  //  - the humps at sea and the ring of the gyre the same, slower;
  //  - the tail (B.tailD) loose in the middle and pinned at the root and the fluke (where the fluke strikes
  //    is where it is drawn); the fluke turns on its own spring and twists through its swings;
  //  - weed snagged on the tail and the neck, and water pouring off the fluke: hanging chains.
  // Nothing here uses Math.random (the particles' randomness is shared with the game's).
  const LURE = { x: -18, y: -32, len: 13, rest: [-1.22, -0.89, -0.56, -0.23, 0.1, 0.42], w0: 26, w1: 9, z0: 0.45, z1: 0.3, fol: 0.55, k: 0.07, g: 260, sway: 0.07 };
  const FRILL = [
    { x: -46, y: -24, len: 26, rest: [-2.62, -2.66, -2.72], w0: 30, w1: 16, z0: 0.5, z1: 0.3, fol: 0.6, k: 0.05, g: 120, sway: 0.05 },
    { x: -52, y: -15, len: 22, rest: [-2.7, -2.75, -2.8], w0: 28, w1: 14, z0: 0.5, z1: 0.28, fol: 0.6, k: 0.06, g: 140, sway: 0.06 },
    { x: -58, y: -6, len: 23, rest: [-2.85, -2.9, -2.95], w0: 26, w1: 13, z0: 0.5, z1: 0.28, fol: 0.6, k: 0.06, g: 160, sway: 0.06 },
  ];
  const BARB = [
    { x: 30, y: 7, len: 9, rest: [1.75, 2.0, 2.25, 2.45, 2.6], w0: 20, w1: 7, z0: 0.45, z1: 0.28, fol: 0.6, k: 0.1, g: 700, sway: 0.1 },
    { x: 46, y: 6, len: 8, rest: [1.6, 1.85, 2.1, 2.35, 2.5], w0: 20, w1: 7.5, z0: 0.45, z1: 0.28, fol: 0.6, k: 0.1, g: 650, sway: 0.1 },
  ];
  const HP = [[], [], [], [], [], []]; // (their points as drawn, in the head's frame: frill, lure, barbels)
  // one value on a spring, in place in the arrays p and v at i (sub-stepped, so a stiff one stays steady)
  function spr(p, v, i, t, dt, w, z) {
    const n = Math.max(1, Math.ceil(w * dt / 0.3)), h = dt / n;
    let x = p[i], u = v[i];
    for (let k = 0; k < n; k++) { u += ((t - x) * w * w - 2 * z * w * u) * h; x += u * h; }
    p[i] = x; v[i] = u;
  }
  // A drawn copy of a chain of points (B.spine and the like), each point on its own spring. The springs
  // follow base (the chain's gross line: where the head and the coils have it) and how far each strays
  // is laid over full (base with its own wave and S, which its muscles drive, so they are not lagged).
  // o: w0, w1 and z0, z1 (stiffness and damping from the first point to the last); fol (how much of the
  // stray of the point before it, in the order walked, each carries on: a wave runs down it); back
  // (walked from the last point to the first: the head end leads); lock0, lock1 (pinned ends); dev(t)
  // (how far a point may stray, px); push(t) (how hard it is shoved against ax, ay); tan (how much of
  // a stray along the chain is kept: sliding along itself shows nothing); yOnly (it heaves, no more).
  function chainSpring(st, base, full, dt, o, ax, ay, snap) {
    const n = base.length, P = st.p, V = st.v, out = st.out || (st.out = []);
    if (n && st.n === n && !snap) {
      // (put somewhere new at once, under the water: start again from there)
      const m = n >> 1;
      if (Math.abs(P[2 * m] - base[m].x) + Math.abs(P[2 * m + 1] - base[m].y) > 400) snap = true;
    }
    if (st.n !== n || snap) {
      for (let i = 0; i < n; i++) { P[2 * i] = base[i].x; P[2 * i + 1] = base[i].y; V[2 * i] = 0; V[2 * i + 1] = 0; }
      P.length = V.length = 2 * n; st.n = n;
    } else if (dt > 0) {
      let pdx = 0, pdy = 0;
      for (let k = 0; k < n; k++) {
        const i = o.back ? n - 1 - k : k, s = base[i], t = n > 1 ? i / (n - 1) : 0, ix = 2 * i, iy = ix + 1;
        if ((i === 0 && o.lock0) || (i === n - 1 && o.lock1)) { P[ix] = s.x; P[iy] = s.y; V[ix] = V[iy] = 0; pdx = pdy = 0; continue; }
        const w = G.lerp(o.w0, o.w1, t), z = G.lerp(o.z0, o.z1, t);
        if (o.push) { const q = o.push(t) * dt; V[ix] -= ax * q; V[iy] -= ay * q; }
        if (o.yOnly) { P[ix] = s.x; V[ix] = 0; } else spr(P, V, ix, s.x + pdx * o.fol, dt, w, z);
        spr(P, V, iy, s.y + pdy * o.fol, dt, w, z);
        let dx = P[ix] - s.x, dy = P[iy] - s.y;
        const d = Math.hypot(dx, dy), m = o.dev(t);
        if (!isFinite(d)) { dx = dy = 0; V[ix] = V[iy] = 0; }
        else if (d > m) { const q = m / d; dx *= q; dy *= q; V[ix] *= 0.6; V[iy] *= 0.6; }
        P[ix] = s.x + dx; P[iy] = s.y + dy;
        pdx = dx; pdy = dy;
      }
    }
    const tan = o.tan == null ? 1 : o.tan;
    for (let i = 0; i < n; i++) {
      const s = full[i], q = out[i] || (out[i] = {});
      let dx = P[2 * i] - base[i].x, dy = P[2 * i + 1] - base[i].y;
      if (tan < 1) {
        const a = full[Math.max(0, i - 1)], c = full[Math.min(n - 1, i + 1)];
        let tx = c.x - a.x, ty = c.y - a.y;
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const along = (dx * tx + dy * ty) * (1 - tan);
        dx -= along * tx; dy -= along * ty;
      }
      q.x = s.x + dx; q.y = s.y + dy; q.z = s.z; q.w = s.w; q.foam = false;
    }
    out.length = n;
    return out;
  }
  // one of the head's chains: its joints' angles in the arena (hu is the drawn head's angle, unwrapped;
  // re which way over it lies), towards its rest shape in the head's frame, shoved by the head's
  // acceleration (ax, ay) and by its own weight
  function headChain(st, def, hu, re, dt, ax, ay) {
    const n = def.rest.length, want = st.want || (st.want = new Array(n));
    for (let i = 0; i < n; i++) want[i] = hu + re * (def.rest[i] + def.sway * Math.sin(G.t * 2.1 + def.x * 0.05 - i * 0.6) * (i + 1) / n);
    // (as the head rolls over, its rest shape is mirrored: each joint swings the short way round to it)
    if (st.a && st.a.length === n) for (let i = 0; i < n; i++) st.a[i] += G.TAU * Math.round((want[i] - st.a[i]) / G.TAU);
    const a0 = st.a || want;
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += Math.cos(a0[i]); my += Math.sin(a0[i]); }
    const ml = Math.hypot(mx, my) || 1, L = n * def.len * 0.6;
    mx /= ml; my /= ml;
    // (the turn the shove gives it: its mean direction crossed with the shove, over half its length)
    const push = ((mx * (-ay) - my * (-ax)) * def.k + mx * def.g) / L;
    D.angleChain(st, want, dt, { w0: def.w0, w1: def.w1, z0: def.z0, z1: def.z1, follow: def.fol, push });
    for (let i = 0; i < n; i++) {
      if (!isFinite(st.a[i]) || !isFinite(st.v[i])) { st.a = want.slice(); st.v = new Array(n).fill(0); break; }
      const d = st.a[i] - want[i];
      if (Math.abs(d) > 2.9) { st.a[i] = want[i] + Math.sign(d) * 2.9; st.v[i] *= 0.5; }
    }
  }
  // its points in the head's frame (rs: which way the head is drawn over), from the chain's angles or,
  // with no chain (the void head), from its rest shape
  function headPts(def, st, hu, rs, out) {
    let x = def.x, y = def.y;
    out.length = 0; out.push({ x, y });
    const n = def.rest.length, live = st && st.a && st.a.length === n && hu != null;
    for (let i = 0; i < n; i++) {
      const l = live ? rs * (st.a[i] - hu) : def.rest[i];
      x += Math.cos(l) * def.len; y += Math.sin(l) * def.len;
      out.push({ x, y });
    }
    return out;
  }
  // A hanging chain in screen space (weed, a rope of water): each link a weight that keeps its own
  // speed (verlet) under gravity, held to the one before it; under the water it floats and drags.
  function hangStep(W, ax, ay, dt, o) {
    const n = o.n, p = W.p || (W.p = []), q = W.q || (W.q = []);
    if (p.length !== 2 * n || Math.abs(p[0] - ax) + Math.abs(p[1] - ay) > 220 || !isFinite(p[2 * n - 1])) {
      for (let i = 0; i < n; i++) { p[2 * i] = q[2 * i] = ax; p[2 * i + 1] = q[2 * i + 1] = ay + i * o.seg; }
      W.dt = dt;
      return p;
    }
    p[0] = q[0] = ax; p[1] = q[1] = ay;
    if (!(dt > 0)) return p;
    const r = G.clamp(dt / (W.dt || dt), 0.5, 2);
    W.dt = dt;
    for (let i = 1; i < n; i++) {
      const ix = 2 * i, iy = ix + 1, wet = p[iy] > o.water;
      const damp = Math.pow(wet ? 0.86 : o.damp, dt * 120) * r;
      const vx = (p[ix] - q[ix]) * damp, vy = (p[iy] - q[iy]) * damp;
      q[ix] = p[ix]; q[iy] = p[iy];
      p[ix] += vx + (o.drift || 0) * dt * dt; p[iy] += vy + (wet ? -90 : o.grav) * dt * dt;
    }
    for (let it = 0; it < 2; it++) for (let i = 1; i < n; i++) {
      const ix = 2 * i, iy = ix + 1, dx = p[ix] - p[ix - 2], dy = p[iy] - p[iy - 2], d = Math.hypot(dx, dy) || 1;
      if (d > o.seg) { p[ix] = p[ix - 2] + dx / d * o.seg; p[iy] = p[iy - 2] + dy / d * o.seg; }
    }
    return p;
  }

  function living(dt, hv) {
    const b = B.body, rg = B.rig || (B.rig = {
      R: D.rig(), RT: D.rig(), hu: null, jo: 0, jv: 0, jp: null, jpv: 0, lure: {}, frill: [{}, {}, {}], barb: [{}, {}],
      neck: { p: [], v: [] }, fin: [], finV: [], tail: { p: [], v: [] }, humps: [{ p: [], v: [] }, { p: [], v: [] }], gyre: { p: [], v: [] },
      tailOn: false, gyreOn: false, fl: { a: null, v: 0, bend: 0, x: 0, y: 0, s: 1, z: 0 }, weed: [{}, {}, {}, {}], rope: [{}, {}], wet: 0, prevD: [],
    });
    if (!(dt > 0)) return;
    // ---- the head: how it turns and is shoved about (where it is drawn)
    const ac = rg.R.accel(hv.x, hv.y, dt), ax = ac.ax, ay = ac.ay;
    rg.hu = rg.hu == null ? hv.ang : rg.hu + G.angDiff(rg.hu, hv.ang);
    const re = Math.cos(hv.ang) < 0 ? -1 : 1, hu = rg.hu;
    // the jaw on its hinge: b.jaw, and a spring laid over it that carries on past each move of it
    const jb = b.jaw + (b.hurt || b.chatter || b.hidden ? 0 : 0.03 * (1 + Math.sin(B.t * 1.3)));
    if (rg.jp == null) { rg.jp = jb; rg.jpv = 0; }
    const jvel = (jb - rg.jp) / dt, jump = Math.abs(jb - rg.jp) > 0.25;
    const jacc = jump ? 0 : G.clamp((jvel - rg.jpv) / dt, -3000, 3000);
    rg.jp = jb; rg.jpv = jump ? 0 : jvel;
    // (yanked up, the jaw hangs back open; driven down, it shuts)
    const aDown = re * (-Math.sin(hv.ang) * ax + Math.cos(hv.ang) * ay);
    rg.jv += (-jacc * 0.7 - aDown * 0.008) * dt;
    const jw = 24, jz = 0.32;
    rg.jv += (-rg.jo * jw * jw - 2 * jz * jw * rg.jv) * dt; rg.jo += rg.jv * dt;
    rg.jo = G.clamp(rg.jo, -0.35, 0.45);
    let jd = jb + rg.jo;
    if (jd < -0.05) { jd = -0.05; rg.jo = jd - jb; if (rg.jv < 0) rg.jv *= -0.3; } // (it clacks shut and bounces)
    b.jawD = Math.min(1.3, jd);
    // breath: the gills open and close a little at rest
    rg.breath = b.hidden ? 0 : 0.12 + 0.1 * Math.sin(B.t * 1.3 - 0.8);
    // the lure, the frill and the barbels
    headChain(rg.lure, LURE, hu, re, dt, ax, ay);
    for (let i = 0; i < 3; i++) headChain(rg.frill[i], FRILL[i], hu, re, dt, ax, ay);
    for (let i = 0; i < 2; i++) headChain(rg.barb[i], BARB[i], hu, re, dt, ax, ay);
    // ---- the neck and the coils: the head end leads, the coils come a beat late and swing past
    const nk = B.nk, snapN = !!nk.snap;
    nk.snap = false;
    B.spineD = chainSpring(rg.neck, B.spineB, B.spine, dt, {
      back: true, lock0: true, lock1: true, w0: 10, w1: 26, z0: 0.34, z1: 0.55, fol: 0.8, tan: 0.3,
      dev: (t) => 6 + 80 * Math.pow(Math.sin(Math.PI * t), 0.7), push: (t) => 0.2 * Math.sin(Math.PI * t),
    }, ax, ay, snapN);
    // the crest's spines: each stands (b.fin) on its own spring, the ones by the head first, and lies
    // back as its length of body moves fast
    const sd = B.spineD, pd = rg.prevD, n = sd.length;
    for (let i = 0; i < n; i++) {
      const p = sd[i], sp = snapN || pd.length !== 2 * n ? 0 : Math.hypot(p.x - pd[2 * i], p.y - pd[2 * i + 1]) / dt;
      if (rg.fin[i] == null || snapN) { rg.fin[i] = b.fin; rg.finV[i] = 0; }
      const t = i / Math.max(1, n - 1);
      spr(rg.fin, rg.finV, i, b.fin - 0.4 * G.clamp(sp / 900, 0, 1), dt, G.lerp(6, 22, t), 0.4);
      rg.fin[i] = G.clamp(rg.fin[i], -0.6, 1.6);
      p.fin = rg.fin[i];
      pd[2 * i] = p.x; pd[2 * i + 1] = p.y;
    }
    pd.length = 2 * n;
    // ---- the humps out at sea, and the ring of the gyre: the same, slower
    B.humpD = B.humpD || [[], []];
    for (let i = 0; i < 2; i++) B.humpD[i] = chainSpring(rg.humps[i], B.humpPts[i], B.humpPts[i], dt, { lock0: true, lock1: true, w0: 7, w1: 7, z0: 0.4, z1: 0.4, fol: 0.55, yOnly: true, dev: () => 30 }, 0, 0);
    if (B.gyre && B.gyrePts.length) {
      B.gyreD = chainSpring(rg.gyre, B.gyrePts, B.gyrePts, dt, { w0: 10, w1: 10, z0: 0.4, z1: 0.4, fol: 0.5, yOnly: true, dev: () => 30 }, 0, 0, !rg.gyreOn);
      rg.gyreOn = true;
    } else rg.gyreOn = false;
    // ---- the tail: pinned at the root and the fluke, loose between, the whip running root to tip
    const tl = B.tail, fl = rg.fl;
    if (tl.on && B.tailPts.length > 3) {
      const tp = B.tailPts, tip = tp[tp.length - 1], ta = rg.RT.accel(tip.x, tip.y, dt);
      B.tailD = chainSpring(rg.tail, B.tailB, tp, dt, {
        lock0: true, lock1: true, w0: 26, w1: 12, z0: 0.45, z1: 0.3, fol: 0.7, tan: 0.3,
        dev: (t) => 36 * Math.pow(Math.sin(Math.PI * t), 0.7), push: (t) => 0.12 * Math.sin(Math.PI * t),
      }, ta.ax, ta.ay, !rg.tailOn);
      // the fluke turns on its own spring after the tail's end, and twists as it swings
      const td = B.tailD, e = td[td.length - 1], f = td[td.length - 3], pa = proj(e.x, e.y, e.z), pb = proj(f.x, f.y, f.z);
      const raw = Math.atan2(pa.y - pb.y, pa.x - pb.x);
      if (fl.a == null || !rg.tailOn || !isFinite(fl.a)) { fl.a = raw; fl.v = 0; }
      const fw = 13, fz = 0.32;
      fl.v += (G.angDiff(fl.a, raw) * fw * fw - 2 * fz * fw * fl.v) * dt; fl.a += fl.v * dt;
      if (Math.abs(G.angDiff(fl.a, raw)) > 1.2) fl.a = raw - Math.sign(G.angDiff(fl.a, raw)) * 1.2;
      fl.bend = G.clamp(fl.v * 0.05, -0.6, 0.6);
      fl.x = pa.x; fl.y = pa.y; fl.s = pa.s; fl.z = e.z;
      rg.tailOn = true;
      // weed caught on it, and water pouring off the fluke for a while after it leaves the sea
      const lv = proj(0, level(e.z), e.z).y;
      rg.wet = e.y > level(e.z) - 4 ? 1 : Math.max(0, rg.wet - dt * 0.4);
      const cx = Math.cos(fl.a), cy = Math.sin(fl.a), fpt = (u, v) => { u -= fl.bend * v * 0.3; return [pa.x + (cx * u - cy * v) * pa.s, pa.y + (cy * u + cx * v) * pa.s]; };
      const anchors = [[td[14]], [td[19]], [null, fpt(-6, 26)]];
      for (let k = 0; k < 3; k++) {
        const A = anchors[k];
        let wx, wy, wz;
        if (A[0]) { const q = proj(A[0].x, A[0].y, A[0].z); wx = q.x; wy = q.y; wz = A[0].z; }
        else { wx = A[1][0]; wy = A[1][1]; wz = e.z; }
        const W = rg.weed[k], s = proj(0, 0, wz).s;
        W.z = wz; W.s = s; W.water = proj(0, level(wz), wz).y;
        hangStep(W, wx, wy, dt, { n: 7, seg: 9 * s, grav: 900, damp: 0.985, water: W.water });
      }
      for (let k = 0; k < 2; k++) {
        const [rx, ry] = fpt(34, k ? -80 : 80), W = rg.rope[k];
        W.water = lv;
        hangStep(W, rx, ry, dt, { n: 8, seg: 7 * pa.s, grav: 1700, damp: 0.995, water: lv });
      }
    } else { rg.tailOn = false; B.tailD = null; }
    // weed caught on the neck, just behind the skull
    if (n > 6) {
      const p = sd[n - 5], q = proj(p.x, p.y, p.z), W = rg.weed[3];
      W.z = p.z; W.s = q.s; W.water = proj(0, level(p.z), p.z).y;
      hangStep(W, q.x, q.y - p.w * 0.35 * q.s, dt, { n: 6, seg: 8 * q.s, grav: 900, damp: 0.98, water: W.water });
    }
  }
  // a blow on the head, or the head coming down hard: the jaw knocked open, the chains on the head
  // flung, the neck behind it shoved (dir: which way, across)
  function rigKick(dir, down, p) {
    const rg = B.rig;
    if (!rg) return;
    rg.jv += 2.2 * p;
    const re = Math.cos(B.body.ang) < 0 ? -1 : 1;
    for (const st of [rg.lure, rg.frill[0], rg.frill[1], rg.frill[2], rg.barb[0], rg.barb[1]]) {
      if (!st.v) continue;
      for (let i = 0; i < st.v.length; i++) st.v[i] += (i + 1) / st.v.length * (3 + 3 * down) * p * re * (down ? -1 : dir);
    }
    const V = rg.neck.v, n = V.length >> 1;
    for (let i = Math.max(1, n - 12); i < n - 1; i++) {
      const q = Math.sin(Math.PI * (n - 1 - i) / 12);
      V[2 * i] += dir * 140 * p * q; V[2 * i + 1] += (down ? 260 : -40) * p * q;
    }
  }

  B.tick = function (dt) {
    const b = B.body, P = G.player, sea = B.sea, V = B.vortex, tl = B.tail;
    // ---- the head: weights on springs, a little under-damped, unless a script is moving it by hand
    if (b.direct) {
      const idt = 1 / Math.max(dt, 1e-4);
      b.vx = (b.x - b.px) * idt; b.vy = (b.y - b.py) * idt;
    } else {
      const w = b.fast ? 15 : 7.5, z = 0.62;
      b.vx += ((b.tx - b.x) * w * w - 2 * z * w * b.vx) * dt;
      b.vy += ((b.ty - b.y) * w * w - 2 * z * w * b.vy) * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.z = G.damp(b.z, b.tz, b.fast ? 9 : 4.5, dt);
    }
    b.px = b.x; b.py = b.y;
    const wa = b.fast || b.direct ? 14 : 8;
    b.va += (G.angDiff(b.ang, b.ta) * wa * wa - 2 * 0.6 * wa * b.va) * dt;
    b.ang += b.va * dt;
    b.ang = Math.atan2(Math.sin(b.ang), Math.cos(b.ang));
    const c = Math.cos(b.ang);
    if (Math.abs(c) > 0.15) b.face = c > 0 ? 1 : -1;
    if (b.beached) { b.jawT = 0.25 + 0.3 * Math.pow(Math.sin(B.t * 2.1), 2); b.gill = Math.max(b.gill, 0.5 + 0.5 * Math.sin(B.t * 4.2)); }
    b.jaw = G.damp(b.jaw, b.jawT + (b.chatter ? 0.2 * Math.abs(Math.sin(B.t * 38)) : 0), 16, dt);
    b.throat = G.damp(b.throat, b.throatT, 4, dt);
    b.gill = G.damp(b.gill, 0, 2, dt);
    b.voidEye = G.damp(b.voidEye || 0, b.voidEyeT || 0, 5, dt);
    if (B.vh) tickVoidHead(B.vh, dt);
    // ---- its pose (for the eye: see pose()): springs, the head's quicker than the coils'
    const pz = b.pose, pv = b.poseV, pt = b.poseT, rl = b.poseRel;
    for (const k in POSE0) {
      if (rl && (k === 'back' || k === 'up' || k === 'tip' || k === 'twist')) continue;
      const w = POSE_W[k], zz = POSE_Z[k];
      pv[k] += ((pt[k] - pz[k]) * w * w - 2 * zz * w * pv[k]) * dt;
      pz[k] += pv[k] * dt;
    }
    if (rl) {
      // brought home, quick at first and easing in (it ends where the strike begins)
      rl.t += dt;
      const q = 1 - E.outQuad(Math.min(1, rl.t / rl.dur));
      for (const k of HEADK) { pz[k] = rl.from[k] * q; pv[k] = 0; }
      if (rl.t >= rl.dur) b.poseRel = null;
    } else if (b.hurt) {
      // (while it bites, what is drawn is where the bite is)
      const q = Math.exp(-40 * dt);
      for (const k of HEADK) { pz[k] *= q; pv[k] *= q; pt[k] = 0; }
    }
    // out at sea or under the water it cannot be struck
    b.hidden = b.z > 0.08 || b.y - HH * 0.6 > level(b.z);

    // ---- the sea, the maelstrom, the body
    const eb = B.ebb;
    if (eb.hold) { sea.y = G.damp(sea.y, eb.sea, 3.2, dt); eb.z = G.damp(eb.z, eb.to, 3.6, dt); }
    else { sea.y = G.damp(sea.y, sea.to, eb.z > 0.01 ? 3 : 1.4, dt); eb.z = G.damp(eb.z, 0, 4, dt); if (eb.z < 0.002) eb.z = 0; }
    if (B.dying || B.dead) { sea.to = SEA1; V.to = 0; }
    V.k = G.damp(V.k, V.to, 1.2, dt); V.x = G.damp(V.x, V.tx, 0.8, dt); V.spin += dt * (1 + 2.4 * V.k);
    if (B.wash > 0) B.wash = Math.max(0, B.wash - dt * 1.1);
    if (B.wall) {
      B.wall.t += dt;
      // spray thrown off the breach
      if (B.wall.t < 0.9) for (let i = 0; i < 3; i++) {
        const p = proj(B.wall.x + G.rand(-140, 140), sea.y, B.wall.z);
        G.fx.spawn({ kind: 'spark', x: p.x, y: p.y, vx: G.rand(-160, 160), vy: -G.rand(250, 650), life: G.rand(0.6, 1.1), size: G.rand(1.4, 2.6), color: WATER, grav: 900, a: 0.5 });
      }
    }
    const em = B.em;
    const exT = b.beached ? b.x - b.face * 420 : b.x * 0.55 + 640 * 0.45 - b.face * 140;
    em.x = G.damp(em.x, G.clamp(exT, 60, 1220), b.direct ? 2.2 : 1.4, dt);
    em.z = G.damp(em.z, b.beached ? 0.38 : 0.42 + b.z * 0.8, 2, dt);
    // (the neck joins the head where the head is drawn)
    const hv = viewOf(b), hc = Math.cos(hv.ang), s = Math.sin(hv.ang), J = { x: hv.x - hc * 64, y: hv.y - HH - s * 64, z: b.z };
    let P0, P1, P2;
    if (b.beached) {
      P2 = { x: J.x - b.face * 240, y: FLOOR - 22, z: 0.03 };
      P1 = { x: em.x, y: FLOOR - 50 - Math.max(0, pz.lift) * 0.3, z: 0.28 };
      P0 = { x: em.x - b.face * 60, y: sea.y + 100, z: 0.42 };
    } else {
      const L = Math.max(70, 150 + 70 * b.coil + pz.reach);
      // the side under its jaw: a curl winds the neck in under the head, so it comes up off an S
      const sd = hc >= 0 ? 1 : -1, dnx = -s * sd, dny = hc * sd;
      P2 = { x: J.x - hc * L + dnx * pz.curl * 80, y: J.y - s * L - 40 + 90 * b.coil + dny * pz.curl * 80, z: b.z + 0.08 };
      P1 = { x: em.x, y: sea.y - 300 + 120 * b.coil - pz.lift, z: em.z };
      P0 = { x: em.x + (em.x < 640 ? -40 : 40), y: sea.y + 100, z: em.z + 0.06 };
    }
    // the neck and the coils behind it follow the head a beat late (weights on springs; snapped when the
    // head is put somewhere new, under the water)
    const nk = B.nk;
    if (!nk.init || Math.hypot(b.x - nk.hx, b.y - nk.hy) > 110) {
      nk.init = true; nk.snap = true; nk.p2x = P2.x; nk.p2y = P2.y; nk.p1x = P1.x; nk.p1y = P1.y; nk.p2vx = nk.p2vy = nk.p1vx = nk.p1vy = 0;
    } else {
      const w2 = 18, w1 = 5.5;
      nk.p2vx += ((P2.x - nk.p2x) * w2 * w2 - 2 * 0.8 * w2 * nk.p2vx) * dt; nk.p2vy += ((P2.y - nk.p2y) * w2 * w2 - 2 * 0.8 * w2 * nk.p2vy) * dt;
      nk.p1vx += ((P1.x - nk.p1x) * w1 * w1 - 2 * 0.75 * w1 * nk.p1vx) * dt; nk.p1vy += ((P1.y - nk.p1y) * w1 * w1 - 2 * 0.75 * w1 * nk.p1vy) * dt;
      nk.p2x += nk.p2vx * dt; nk.p2y += nk.p2vy * dt; nk.p1x += nk.p1vx * dt; nk.p1y += nk.p1vy * dt;
      P2.x = nk.p2x; P2.y = nk.p2y; P1.x = nk.p1x; P1.y = nk.p1y;
    }
    nk.hx = b.x; nk.hy = b.y;
    B.wph += dt * (2.6 + pz.rip);
    sample(B.spine, P0, P1, P2, J, 30, 104, 60, Math.max(0, 10 + 14 * b.coil + pz.amp), 9 + 8 * b.coil, B.wph, b.beached ? 0 : pz.curl * 34);
    // (for the eye only: the same line without its wave and S, which the drawn neck's springs follow)
    sample(B.spineB || (B.spineB = []), P0, P1, P2, J, 30, 104, 60, 0, 1, 0, 0);
    // the humps of its coils out at sea (in the maelstrom they circle the eye)
    B.humps.forEach((h, i) => {
      if (B.phase === 3 || B.circling) {
        const a = G.t * 0.55 + i * Math.PI;
        h.x = V.x + Math.cos(a) * 520; h.z = 0.5 + 0.3 * Math.sin(a); h.dir = -Math.sin(a) >= 0 ? 1 : -1;
      } else {
        h.x += h.dir * 16 * dt;
        if (h.x > 1500) h.x = -220; else if (h.x < -220) h.x = 1500;
      }
      // (they heave up with the body when it surges, and settle under when it sinks)
      const rise = B.calm ? 0 : G.clamp(0.5 + 0.5 * Math.sin(G.t * h.sp + h.ph) + pz.lift * 0.005, -0.15, 1.4), pts = B.humpPts[i];
      for (let k = 0; k <= 11; k++) {
        const u = h.dir > 0 ? k / 11 : 1 - k / 11, q = pts[k] || (pts[k] = {});
        q.x = h.x + (u - 0.5) * 2 * h.R * 1.3; q.y = sea.y + 40 - Math.sin(Math.PI * u) * (40 + h.R * (0.15 + 0.9 * rise)); q.z = h.z; q.w = 68; q.foam = false;
      }
    });
    // the tail
    if (tl.on) {
      if (tl.pose !== 'hold') {
        const g = TAILP[tl.pose](tl, sea.y), q = 1 - Math.exp(-tl.rate * dt);
        tl.tipX += (g[0] - tl.tipX) * q; tl.tipY += (g[1] - tl.tipY) * q; tl.tipZ += (g[2] - tl.tipZ) * q;
        tl.c2x += (g[3] - tl.c2x) * q; tl.c2y += (g[4] - tl.c2y) * q; tl.c2z += (g[5] - tl.c2z) * q;
        if (tl.pose === 'under' && tl.tipY > sea.y + 120) tl.on = false;
      }
      const sh = tl.shake ? Math.sin(G.t * 34) * 26 : 0;
      sample(B.tailPts, { x: tl.ex, y: sea.y + 90, z: tl.ez }, { x: tl.ex, y: sea.y - 150, z: tl.ez }, { x: tl.c2x, y: tl.c2y, z: tl.c2z }, { x: tl.tipX + sh, y: tl.tipY, z: tl.tipZ }, 24, 112, 40, 8, 7);
      sample(B.tailB || (B.tailB = []), { x: tl.ex, y: sea.y + 90, z: tl.ez }, { x: tl.ex, y: sea.y - 150, z: tl.ez }, { x: tl.c2x, y: tl.c2y, z: tl.c2z }, { x: tl.tipX + sh, y: tl.tipY, z: tl.tipZ }, 24, 112, 40, 0, 7, 0);
    }

    // ---- (the gyre) its coil in a ring round the bay, the gap in it facing the shore at gy.th; humps
    // of it roll round the ring as the water turns
    const gy = B.gyre;
    if (gy) {
      gy.k = G.damp(gy.k, gy.to, gy.to ? 2.4 : 4.5, dt);
      gy.spin += dt * (0.5 + 1.8 * gy.k);
      const pts = B.gyrePts, N = 46, gapA = 0.6;
      for (let i = 0; i < N; i++) {
        const a = gy.th + gapA / 2 + (G.TAU - gapA) * i / (N - 1);
        const z = 0.62 - 0.36 * Math.sin(a), sc = 1 / (1 + DEPTH * z);
        const hump = Math.max(0, Math.sin(a * 5 - gy.spin * 2.2));
        const q = pts[i] || (pts[i] = {});
        q.x = 640 + GYRE_A * Math.cos(a) / sc; q.z = z;
        q.y = sea.y + 46 - gy.k * (34 + 70 * hump * hump); q.w = 70; q.foam = false;
      }
      pts.length = N;
      if (gy.k > 0.3 && Math.random() < dt * 10) { const p = pts[(Math.random() * N) | 0]; splashAt(p.x, p.z, 0.5); }
      if (!gy.to && gy.k < 0.01) B.gyre = null;
    }
    // ---- (for the eye only) every part on its own spring: see living()
    living(dt, hv);

    // ---- rain sheeting off it, and water pouring off a head that rises fast
    if (!B.dead && Math.random() < dt * 30) {
      const p = B.spine[(Math.random() * 30) | 0];
      if (p && p.y < level(p.z)) {
        const q = proj(p.x, p.y, p.z);
        G.fx.spawn({ kind: 'spark', x: q.x + G.rand(-p.w, p.w) * 0.3 * q.s, y: q.y + p.w * 0.3 * q.s, vx: G.rand(-20, 20), vy: G.rand(60, 180), life: G.rand(0.3, 0.6), size: G.rand(1.1, 1.9) * Math.max(0.5, q.s), color: WATER, grav: 1300, len: 0.04, a: 0.5 });
      }
    }
    if (!B.dead && !b.hidden && b.vy < -300 && Math.random() < dt * 60) G.fx.spawn({ kind: 'spark', x: b.x + G.rand(-70, 70), y: b.y - G.rand(0, 80), vx: G.rand(-60, 60), vy: G.rand(0, 120), life: G.rand(0.4, 0.8), size: G.rand(1.4, 2.6), color: WATER, grav: 1300, a: 0.55 });
    // the maelstrom's foam drifting in
    if (V.k > 0.2 && Math.random() < dt * 14 * V.k) {
      const sd = Math.random() < 0.5 ? -1 : 1, d = G.rand(120, 420);
      G.fx.spawn({ x: V.x + sd * d, y: level(0) - G.rand(1, 6), vx: -sd * G.rand(60, 140), vy: 0, life: d / 120, size: G.rand(1.4, 2.6), color: WATER, a: 0.4 });
    }

    // ---- a storm out at sea (high water)
    B.boltT -= dt;
    if (B.phase === 2 && !B.dead && B.boltT <= 0) { B.boltT = G.rand(6, 11); B.bolt = { x: G.rand(120, 1160), t: 0, seed: Math.random() * 1000 }; G.audio.play('thunder'); }
    if (B.bolt) { B.bolt.t += dt; if (B.bolt.t > 0.35) B.bolt = null; }
    // wreckage afloat bobs on the flood
    if (flooded()) for (const p of G.arena.platforms) if (p.rise > 0.95 && Math.random() < dt * 0.7) G.arena.bob(p, 9);

    // ---- what the water does to the hero
    const fighting = G.state === 'fight' && !P.dead && !P.finishing && !P.ulting;
    const live = fighting && B.active && !B.dying && !B.dead && !B.staggered && !B.invuln;
    // high water drags at the legs (a dash is untouched): pull back part of what the hero moved this frame
    if (fighting && flooded() && !P.plat && P.y > sea.y - 6 && P.dashT <= 0) {
      const moved = P.x - B.lastPX;
      if (Math.abs(moved) < 40) P.x = G.clamp(P.x - moved * 0.36, WL + 13, WR - 13);
    }
    B.lastPX = P.x;
    // the maelstrom's current pulls towards the eye (not on the rocks)
    let wind = 0;
    if (live && V.k > 0.5 && !P.plat && P.y > FLOOR - 120) {
      const dx = V.x - P.x, pull = (82 + 26 * Math.sin(G.t * 0.9)) * (B.pullK == null ? 1 : B.pullK);
      wind = G.sign(dx) * pull * G.clamp(Math.abs(dx) / 140, 0, 1) * (P.onGround ? 1 : 0.15);
    }
    // the undertow (corrupted): the black water runs to its jaws and drags the hero with it. In the
    // air and on the wreckage it drags a little less, but it drags: there is no getting above it.
    const U = B.under;
    if (U) {
      U.k = G.damp(U.k, U.to, 2.2, dt);
      if (!U.to) U.pull = G.damp(U.pull, 0, 7, dt);
      U.flow += dt * (50 + U.pull);
      // black flecks and sparks of blood riding the current in
      if (U.pull > 20 && Math.random() < dt * 50) {
        const fx0 = U.side > 0 ? WL : WR, x = G.lerp(fx0, U.mx, Math.random()), y = Math.min(FLOOR - 12, level(0)) - G.rand(0, 22);
        if (Math.random() < 0.6) G.fx.spawn({ x, y, vx: U.side * (U.pull + G.rand(40, 140)), vy: G.rand(-10, 4), life: G.rand(0.5, 1.1), size: G.rand(3, 7), color: VOIDC });
        else G.fx.spawn({ kind: 'spark', x, y, vx: U.side * (U.pull + G.rand(120, 260)), vy: G.rand(-14, 6), life: G.rand(0.25, 0.5), size: G.rand(1.1, 1.9), color: BLOOD, len: 0.05, a: 0.7 });
      }
      if (live && U.pull > 1) wind += U.side * U.pull * (P.onGround && !P.plat ? 1 : 0.75);
      if (!U.to && U.k < 0.01) B.under = null;
    }
    G.wind = wind;
    // the water's near edge is drawn over the feet of whoever wades in it
    if (sea.y < FLOOR - 2 && G.state === 'fight' && (!B.front || !H.list.includes(B.front))) {
      B.front = H.add({ kind: 'floodfront', layer: 'over', update() { if (B.sea.y >= FLOOR - 2 || G.boss !== B) this.dead = true; }, draw: drawFloodFront });
    }
    // ---- its bite
    if (b.hurt && G.canHurt() && G.rectsOverlap(P.box(), { cx: b.x + b.face * 10, cy: b.y - 34, hw: 54, hh: 28 })) P.tryHit(b.dmg || 1, b.x, b);
  };

  // ------------------------------------------------------------------ drawing
  function crossPt(a, b) {
    const la = level(a.z), lb = level(b.z), den = (b.y - a.y) - (lb - la);
    const f = den ? G.clamp((la - a.y) / den, 0, 1) : 0;
    return { x: G.lerp(a.x, b.x, f), y: G.lerp(a.y, b.y, f), z: G.lerp(a.z, b.z, f), w: G.lerp(a.w, b.w, f), foam: true };
  }
  // the parts of a chain above the water
  function runs(pts) {
    const out = [];
    let cur = null;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], vis = p.y < level(p.z);
      if (vis) { if (!cur) { cur = []; if (i) cur.push(crossPt(pts[i - 1], p)); } cur.push(p); }
      else if (cur) { cur.push(crossPt(pts[i - 1], p)); out.push(cur); cur = null; }
    }
    if (cur) out.push(cur);
    return out;
  }
  // far: the parts out at sea, behind the platforms; near: the rest (with one point of overlap)
  function drawChain(ctx, pts, far, o) {
    // which side is its back: the side the head's crest is on, or else the side that faces up
    if (pts.length < 2) return;
    let sg;
    const a = proj(pts[pts.length - 2].x, pts[pts.length - 2].y, pts[pts.length - 2].z), c = proj(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[pts.length - 1].z);
    if (o.up) sg = ((c.y - a.y) * o.up[0] - (c.x - a.x) * o.up[1]) >= 0 ? 1 : -1;
    else {
      let sy = 0;
      for (let i = 1; i < pts.length; i++) sy -= pts[i].x - pts[i - 1].x;
      sg = sy > 0 ? -1 : 1;
    }
    o = Object.assign({ sg }, o);
    for (const run of runs(pts)) {
      const isL = (i) => i >= 0 && i < run.length && (far ? run[i].z > ZS : run[i].z <= ZS);
      let piece = [];
      for (let i = 0; i < run.length; i++) {
        if (isL(i) || isL(i - 1) || isL(i + 1)) piece.push(run[i]);
        else if (piece.length) { if (piece.length >= 2) ribbon(ctx, piece, o); piece = []; }
      }
      if (piece.length >= 2) ribbon(ctx, piece, o);
    }
  }
  // An armoured length of body: dark scutes with seams that glow, a pale belly, a crest of spines
  // and a row of lure-lights down the flank. Far parts are lost in the haze over the sea.
  function ribbon(ctx, pts, o) {
    const P = palNow(), n = pts.length, q = [];
    let zs = 0;
    for (let i = 0; i < n; i++) { const p = pts[i], pr = proj(p.x, p.y, p.z); pr.w = p.w * pr.s; pr.foam = p.foam; pr.fin = p.fin; q.push(pr); zs += p.z; }
    const fog = G.clamp((zs / n - 0.06) * 0.85, 0, 0.78), lit = 1 - fog;
    const nx = [], ny = [], tx = [], ty = [], sg = o.sg || 1;
    for (let i = 0; i < n; i++) {
      const a = q[Math.max(0, i - 1)], c = q[Math.min(n - 1, i + 1)];
      let dx = c.x - a.x, dy = c.y - a.y;
      const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      tx.push(dx); ty.push(dy); nx.push(dy * sg); ny.push(-dx * sg);
    }
    const at = (i, f) => [q[i].x + nx[i] * q[i].w * f, q[i].y + ny[i] * q[i].w * f];
    function band(f0, f1) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const p = at(i, f0); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
      for (let i = n - 1; i >= 0; i--) { const p = at(i, f1); ctx.lineTo(p[0], p[1]); }
      ctx.closePath();
    }
    ctx.lineJoin = 'round';
    // spines first, so the body covers their roots
    const fin = o.fin || 0;
    ctx.fillStyle = shade('#0a161c', P, fog);
    for (let i = 1; i < n - 1; i += 2) {
      if (q[i].foam) continue;
      // (each spine stands on its own spring when the chain carries one: see living())
      const w = q[i].w, pf = q[i].fin != null ? q[i].fin : fin, h = w * Math.max(0.22, 0.55 + 0.7 * pf) + (fin ? Math.sin(G.t * 40 + i) * 3 : 0);
      const b0 = at(i, 0.42), x1 = b0[0] + tx[i] * w * 0.22, y1 = b0[1] + ty[i] * w * 0.22, x2 = b0[0] - tx[i] * w * 0.45, y2 = b0[1] - ty[i] * w * 0.45;
      const tipx = b0[0] + nx[i] * h - tx[i] * h * 0.55, tipy = b0[1] + ny[i] * h - ty[i] * h * 0.55;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(tipx, tipy); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill();
      if (lit > 0.3) { ctx.strokeStyle = G.rgba(P.boss, (0.25 + 0.3 * fin) * lit); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(tipx, tipy); ctx.stroke(); }
    }
    // the body
    band(0.5, -0.5); ctx.fillStyle = shade('#08131a', P, fog); ctx.fill();
    // the belly: pale plates
    band(-0.12, -0.5); ctx.fillStyle = shade('#1a2d33', P, fog); ctx.fill();
    ctx.strokeStyle = shade('#08131a', P, fog); ctx.lineWidth = Math.max(0.8, q[0].s * 1.4);
    ctx.beginPath();
    for (let i = 1; i < n; i++) { const a = at(i, -0.12), b = at(i, -0.5); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
    // the scutes on its back, and the seams between them that glow
    band(0.5, 0.06); ctx.fillStyle = shade('#13262f', P, fog); ctx.fill();
    if (lit > 0.15) {
      ctx.strokeStyle = G.rgba(P.boss, 0.32 * lit); ctx.lineWidth = Math.max(0.8, 1.3 * q[n - 1].s);
      ctx.beginPath();
      for (let i = 1; i < n - 1; i++) { if (q[i].foam) continue; const a = at(i, 0.48), b = at(i + 1, 0.02); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke();
      // the lit edge of its back
      ctx.strokeStyle = G.rgba(P.boss, 0.5 * lit); ctx.lineWidth = Math.max(1, 1.8 * q[n - 1].s);
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const p = at(i, 0.5); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
      ctx.stroke();
      // lure-lights down the flank, each with its own slow pulse
      ctx.globalCompositeOperation = 'lighter';
      const img = G.fx.glow(P.boss);
      for (let i = 2; i < n - 1; i += 3) {
        if (q[i].foam) continue;
        const p = at(i, -0.05), r = Math.max(3, q[i].w * 0.22);
        ctx.globalAlpha = (0.35 + 0.25 * Math.sin(G.t * 2.2 + i * 1.7)) * lit;
        ctx.drawImage(img, p[0] - r, p[1] - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // white water where it goes into the sea
    for (let i = 0; i < n; i++) {
      if (!q[i].foam) continue;
      const r = q[i].w * 0.85 + Math.sin(G.t * 6 + i) * 2;
      ctx.fillStyle = VOIDED ? 'rgba(5,0,3,0.6)' : G.rgba(WATER, 0.2 * (1 - fog * 0.5));
      ctx.beginPath(); ctx.ellipse(q[i].x, q[i].y, r, r * 0.2, 0, 0, G.TAU); ctx.fill();
      ctx.strokeStyle = G.rgba(P.rim, 0.28 * (1 - fog * 0.5)); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(q[i].x, q[i].y, r * 1.3, r * 0.26, 0, 0, G.TAU); ctx.stroke();
    }
  }

  const headUp = (b) => { const fl = Math.cos(b.ang) < 0 ? -1 : 1; return [fl * Math.sin(b.ang), -fl * Math.cos(b.ang)]; };
  // what is drawn of a chain: its sprung copy (living()) when it has one, or else where the game has it
  const drawn = (d, src) => (d && d.length === src.length ? d : src);
  function drawFluke(ctx, far) {
    const tl = B.tail, pts = drawn(B.tailD, B.tailPts);
    if (!tl.on || pts.length < 3) return;
    const tip = pts[pts.length - 1], pre = pts[pts.length - 3];
    if ((tip.z > ZS) !== far || tip.y > level(tip.z) + 6) return;
    const a = proj(tip.x, tip.y, tip.z), b = proj(pre.x, pre.y, pre.z), P = G.pal();
    let tx = a.x - b.x, ty = a.y - b.y;
    const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
    // (v2.5c) the fluke on its own spring, turned a beat after the tail's end and twisting as it swings
    const fl = B.rig && B.rig.tailOn ? B.rig.fl : null, bend = fl ? fl.bend : 0;
    if (fl && fl.a != null) { tx = Math.cos(fl.a); ty = Math.sin(fl.a); }
    const nx = -ty, ny = tx, s = a.s, fog = G.clamp((tip.z - 0.06) * 0.85, 0, 0.78);
    const pt = (u, v) => { u -= bend * v * 0.3; return [a.x + (tx * u + nx * v) * s, a.y + (ty * u + ny * v) * s]; };
    const shape = [pt(-28, 0), pt(-8, 30), pt(14, 74), pt(36, 82), pt(20, 34), pt(26, 0), pt(20, -34), pt(36, -82), pt(14, -74), pt(-8, -30)];
    ctx.beginPath(); shape.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.fillStyle = mix('#0a171d', P.far, fog); ctx.fill();
    ctx.strokeStyle = G.rgba(P.boss, 0.45 * (1 - fog)); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = G.rgba(P.boss, 0.2 * (1 - fog)); ctx.lineWidth = 1;
    ctx.beginPath();
    for (const v of [-60, -30, 30, 60]) { const p0 = pt(-6, v * 0.3), p1 = pt(22, v); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); }
    ctx.stroke();
  }
  // (v2.5c) what trails off it: weed caught on the tail (0, 1), the fluke (2) and the neck (3), and two
  // ropes of water pouring off the fluke's tips while it is still wet; kept in screen space by living()
  function drawTrail(ctx, far, which) {
    const rg = B.rig;
    if (!rg) return;
    const P = palNow();
    for (const k of which) {
      const W = rg.weed[k];
      if (!W.p || W.p.length < 4 || (W.z > ZS) !== far || W.p[1] > W.water) continue;
      const fog = G.clamp((W.z - 0.06) * 0.85, 0, 0.78), pts = [];
      for (let i = 0; i < W.p.length; i += 2) pts.push({ x: W.p[i], y: Math.min(W.p[i + 1], W.water + 2) });
      ctx.save();
      ctx.beginPath(); ctx.rect(-200, -1200, G.W + 400, W.water + 1200); ctx.clip();
      D.ribbon(ctx, pts, 5 * W.s, 1.6 * W.s, 2.5 * W.s); ctx.fillStyle = shade(k === 3 ? '#0c1d18' : '#0e2219', P, fog); ctx.fill();
      if (fog < 0.5) { ctx.strokeStyle = G.rgba(P.boss, 0.12 * (1 - fog)); ctx.lineWidth = 0.8; ctx.stroke(); }
      ctx.restore();
    }
    if (!which.includes(2) || !B.tail.on || !rg.tailOn || rg.wet < 0.03 || (rg.fl.z > ZS) !== far || VOIDED) return;
    ctx.lineCap = 'round';
    for (const W of rg.rope) {
      if (!W.p || W.p.length < 4 || W.p[1] > W.water) continue;
      for (let i = 2; i < W.p.length; i += 2) {
        if (W.p[i + 1] > W.water) break;
        const q = i / W.p.length;
        ctx.strokeStyle = G.rgba(WATER, 0.42 * rg.wet * (1 - q * 0.8));
        ctx.lineWidth = Math.max(0.6, (3.2 - 2.6 * q) * rg.fl.s);
        ctx.beginPath(); ctx.moveTo(W.p[i - 2], W.p[i - 1]); ctx.lineTo(W.p[i], W.p[i + 1]); ctx.stroke();
      }
    }
  }

  // The head: a long armoured skull with swept horns, a slit eye under a heavy brow, a lure on a
  // filament over the snout, gill slits that flare, and a jaw full of needles.
  const ROLL_T = 0.18; // (seconds for the head to roll over: see drawHead)
  // (the body's head is drawn in its pose: see pose())
  function drawHead(ctx, b) {
    if (!b.pose) { drawHead0(ctx, b); return; }
    const x = b.x, y = b.y, a = b.ang, v = viewOf(b);
    b.x = v.x; b.y = v.y; b.ang = v.ang;
    try { drawHead0(ctx, b); } finally { b.x = x; b.y = y; b.ang = a; }
  }
  function drawHead0(ctx, b) {
    const P = palNow(), pr = proj(b.x, b.y - HH, b.z), fog = G.clamp((b.z - 0.06) * 0.85, 0, 0.78), lit = 1 - fog;
    const C = (h) => shade(h, P, fog);
    const bone = VOIDED ? 'rgb(96,34,48)' : mix('#d6dccf', P.far, fog * 0.7);
    const blind = VOIDED ? 0 : (b.voidEye || 0); // (hydra) its eyes going black
    const jx = b.jit ? G.rand(-b.jit, b.jit) : 0;
    ctx.save();
    // under the water nothing shows
    const lv = proj(0, level(b.z), b.z).y;
    ctx.beginPath(); ctx.rect(-200, -1200, G.W + 400, lv + 1200); ctx.clip();
    ctx.translate(pr.x + (b.kx || 0) * pr.s + jx, pr.y);
    K.recoil(ctx, b);
    ctx.scale(pr.s * HS, pr.s * HS);
    ctx.rotate(b.ang);
    // as the head passes upright it rolls over onto its other side: over a few frames, narrowing
    // through the roll, never in one frame (the lure swings round rather than jumping)
    const side = Math.cos(b.ang) < 0 ? -1 : 1;
    if (b.rollT == null || G.t < b.rollT) { b.rollT = G.t; b.roll = side; }
    const step = G.clamp(G.t - b.rollT, 0, 0.05) * 2 / ROLL_T;
    b.roll += G.clamp(side - b.roll, -step, step); b.rollT = G.t;
    const rs = (b.roll + 1) / 2, re0 = rs * rs * (3 - 2 * rs) * 2 - 1;
    // (its pose's twist rolls it over on its side, the belly coming up: the dive that lays spouts in rows)
    const re = re0 * (b.pose ? Math.cos(G.clamp(b.pose.twist, 0, 1) * Math.PI * 0.85) : 1);
    ctx.scale(1, Math.abs(re) < 0.2 ? 0.2 * (re < 0 ? -1 : 1) : re);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const poly = (a) => { ctx.beginPath(); for (let i = 0; i < a.length; i += 2) { if (i) ctx.lineTo(a[i], a[i + 1]); else ctx.moveTo(a[i], a[i + 1]); } ctx.closePath(); };
    // (v2.5c) its parts on their own springs (living()): only the body's head has them; the void head
    // is drawn in its rest shape
    const rg = b === B.body ? B.rig : null, hu = rg ? rg.hu : null, rsg = re < 0 ? -1 : 1;
    const ja = (b.jawD != null ? b.jawD : b.jaw) * 0.55, gill = rg ? Math.max(b.gill, rg.breath || 0) : b.gill;
    // the frill between the horns: a web on three rays, each a chain that trails and flutters
    const fr = [0, 1, 2].map((k) => headPts(FRILL[k], rg && rg.frill[k], hu, rsg, HP[k]));
    ctx.fillStyle = G.rgba(P.boss, (0.1 + 0.12 * b.fin) * lit);
    ctx.beginPath(); ctx.moveTo(fr[0][0].x, fr[0][0].y);
    for (let i = 1; i < fr[0].length; i++) ctx.lineTo(fr[0][i].x, fr[0][i].y);
    for (const k of [1, 2]) { const a = fr[k - 1][fr[k - 1].length - 1], c = fr[k][fr[k].length - 1], m = fr[k][1]; ctx.quadraticCurveTo((a.x + c.x) / 2 * 0.8 + m.x * 0.2, (a.y + c.y) / 2 * 0.8 + m.y * 0.2, c.x, c.y); }
    for (let i = fr[2].length - 2; i >= 0; i--) ctx.lineTo(fr[2][i].x, fr[2][i].y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(P.boss, (0.16 + 0.14 * b.fin) * lit); ctx.lineWidth = 1;
    ctx.beginPath();
    for (const r of fr) { ctx.moveTo(r[0].x, r[0].y); for (let i = 1; i < r.length; i++) ctx.lineTo(r[i].x, r[i].y); }
    ctx.stroke();
    ctx.fillStyle = C('#0b1a20');
    poly([-40, -26, -86, -48, -124, -60, -92, -38, -52, -16]); ctx.fill();
    poly([-54, -10, -96, -22, -130, -22, -98, -8, -60, 0]); ctx.fill();
    ctx.strokeStyle = G.rgba(P.boss, 0.45 * lit); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-40, -26); ctx.lineTo(-86, -48); ctx.lineTo(-124, -60); ctx.moveTo(-54, -10); ctx.lineTo(-96, -22); ctx.lineTo(-130, -22); ctx.stroke();
    // the throat, swelling as it gathers water to spit
    if (b.throat > 0.02) {
      ctx.fillStyle = C('#14262c');
      ctx.beginPath(); ctx.ellipse(-20, 14 + 8 * b.throat, 38, 10 + 16 * b.throat, 0, 0, G.TAU); ctx.fill();
      if (b.voidThroat) {
        // (hydra) it fills with the void instead: black, veined with blood
        ctx.fillStyle = 'rgba(5,0,3,' + 0.75 * b.throat + ')';
        ctx.beginPath(); ctx.ellipse(-20, 14 + 8 * b.throat, 36, 9 + 15 * b.throat, 0, 0, G.TAU); ctx.fill();
        ctx.strokeStyle = G.rgba(BLOOD, 0.6 * b.throat); ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) { const vx = -44 + k * 15; ctx.moveTo(vx, 8 + 4 * b.throat); ctx.lineTo(vx + 5, 14 + 10 * b.throat); ctx.lineTo(vx + 2, 20 + 18 * b.throat); }
        ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * b.throat * lit;
        ctx.drawImage(G.fx.glow(P.boss), -50, 0, 60, 30 + 30 * b.throat);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    // inside the mouth, and a glow far down the throat
    if (ja > 0.03) {
      const jtx = -40 + Math.cos(ja) * 126, jty = 6 + Math.sin(ja) * 126;
      poly([-40, 6, 90, 2, jtx, jty]); ctx.fillStyle = '#12060a'; ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 * lit * Math.min(1, ja * 3);
      ctx.drawImage(G.fx.glow(P.boss), -40, -4, 70, 40);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // the lower jaw, on its hinge
    ctx.save();
    ctx.translate(-40, 6); ctx.rotate(ja);
    ctx.fillStyle = bone;
    for (const t of [52, 68, 84, 100, 114]) { poly([t - 3, 1, t, -8 - (t === 100 ? 5 : 0), t + 3, 1]); ctx.fill(); }
    ctx.fillStyle = C('#0d1c22');
    poly([-6, -2, 40, 0, 100, 0, 128, 2, 122, 8, 92, 14, 40, 18, 0, 14]); ctx.fill();
    ctx.strokeStyle = G.rgba(P.boss, 0.35 * lit); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(40, 18); ctx.lineTo(92, 14); ctx.lineTo(122, 8); ctx.stroke();
    ctx.restore();
    // needles along the upper lip
    ctx.fillStyle = bone;
    for (const t of [20, 36, 50, 64, 76, 86]) { poly([t - 3, 4, t, 14 + (t === 64 ? 9 : 0), t + 3, 4]); ctx.fill(); }
    // (v2.5c) two barbels off the lip, chains that hang and trail (their roots under the skull)
    for (let k = 1; k >= 0; k--) {
      const bp = headPts(BARB[k], rg && rg.barb[k], hu, rsg, HP[4 + k]);
      D.ribbon(ctx, bp, 3.2 - k * 0.4, 0.5); ctx.fillStyle = C(k ? '#0a171c' : '#0d1c22'); ctx.fill();
      if (!k && lit > 0.3) {
        ctx.strokeStyle = G.rgba(P.boss, 0.22 * lit); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(bp[1].x, bp[1].y); for (let i = 2; i < bp.length; i++) ctx.lineTo(bp[i].x, bp[i].y); ctx.stroke();
      }
    }
    // the skull
    ctx.fillStyle = C('#0f2028');
    poly([-66, -14, -54, -30, -30, -34, 2, -31, 22, -27, 54, -17, 80, -9, 96, -2, 88, 5, 50, 7, 10, 8, -30, 10, -58, 8]); ctx.fill();
    // armour plates, and the seams between them glowing
    ctx.fillStyle = C('#183039');
    poly([-50, -28, -26, -33, 4, -30, 20, -24, 0, -20, -30, -22]); ctx.fill();
    poly([26, -24, 54, -16, 78, -9, 56, -10, 30, -17]); ctx.fill();
    poly([-60, -6, -36, -10, -14, -4, -36, 6, -58, 4]); ctx.fill();
    ctx.strokeStyle = G.rgba(P.boss, (0.42 + 0.3 * gill) * lit); ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-30, -22); ctx.lineTo(-27, -8); ctx.moveTo(0, -20); ctx.lineTo(5, -2); ctx.moveTo(30, -17); ctx.lineTo(34, 0); ctx.moveTo(56, -10); ctx.lineTo(58, 4);
    ctx.stroke();
    // the lit line along the top of the skull
    ctx.strokeStyle = G.rgba(P.boss, 0.7 * lit); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-54, -30); ctx.lineTo(-30, -34); ctx.lineTo(2, -31); ctx.lineTo(22, -27); ctx.lineTo(54, -17); ctx.lineTo(80, -9); ctx.lineTo(96, -2); ctx.stroke();
    // gill slits
    ctx.strokeStyle = G.rgba(P.boss, (0.15 + 0.6 * gill) * lit); ctx.lineWidth = 1.6;
    ctx.beginPath(); for (let k = 0; k < 3; k++) { const x = -44 - k * 7; ctx.moveTo(x, -6); ctx.quadraticCurveTo(x - 4, 2, x - 2, 10); } ctx.stroke();
    // lights along the jaw line
    ctx.globalCompositeOperation = 'lighter';
    const img = G.fx.glow(P.boss);
    for (let k = 0; k < 4; k++) { ctx.globalAlpha = (0.3 + 0.2 * Math.sin(G.t * 3 + k)) * lit; ctx.drawImage(img, -8 + k * 22 - 5, 3, 10, 10); }
    // the eye: a narrow slit, burning, under a heavy brow (dim while it lies beached)
    const eyeA = (b.beached ? 0.35 : 1) * lit;
    ctx.globalAlpha = 0.8 * eyeA * (1 - blind); ctx.drawImage(G.fx.glow(P.boss), 14 - 22, -17 - 22, 44, 44);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = G.rgba(P.hot, eyeA);
    poly([3, -17, 14, -21, 29, -17, 14, -14]); ctx.fill();
    if (blind > 0.02) {
      // the void floods the eye from the slit outwards, leaving a thin rim of blood
      ctx.fillStyle = 'rgba(2,0,1,' + blind + ')'; poly([3, -17, 14, -21, 29, -17, 14, -14]); ctx.fill();
      ctx.strokeStyle = G.rgba(BLOOD, 0.75 * blind); ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.strokeStyle = '#020405'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(15, -21); ctx.lineTo(16, -14); ctx.stroke();
    ctx.fillStyle = C('#0a161c');
    poly([-4, -24, 32, -23, 36, -19, 4, -19.5]); ctx.fill();
    // the lure: a filament off the brow with a light at its end, swinging as the head moves
    let lx, ly;
    ctx.strokeStyle = C('#1d343c'); ctx.lineWidth = 2;
    if (rg && rg.lure.a) {
      // (v2.5c) a chain of joints, stiff at the brow and loose at the light
      const lp = headPts(LURE, rg.lure, hu, rsg, HP[3]);
      ctx.beginPath(); ctx.moveTo(lp[0].x, lp[0].y);
      for (let i = 1; i < lp.length - 1; i++) ctx.quadraticCurveTo(lp[i].x, lp[i].y, (lp[i].x + lp[i + 1].x) / 2, (lp[i].y + lp[i + 1].y) / 2);
      lx = lp[lp.length - 1].x; ly = lp[lp.length - 1].y;
      ctx.lineTo(lx, ly); ctx.stroke();
    } else {
      const sw = G.clamp(-b.vx * 0.02, -16, 16) * (Math.cos(b.ang) < 0 ? -1 : 1), bob = Math.sin(G.t * 2.4) * 4 + G.clamp(b.vy * 0.015, -10, 10);
      lx = 44 + sw; ly = -60 + bob;
      ctx.beginPath(); ctx.moveTo(-18, -32); ctx.quadraticCurveTo(6, -82, lx, ly); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.55 + 0.2 * Math.sin(G.t * 3.3)) * lit * (1 - 0.75 * blind); ctx.drawImage(G.fx.glow(P.boss), lx - 20, ly - 20, 40, 40);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = G.rgba(P.hot, 0.9 * lit * (1 - 0.7 * blind)); ctx.beginPath(); ctx.arc(lx, ly, 3, 0, G.TAU); ctx.fill();
    if (b.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = b.flash * 0.3; ctx.drawImage(G.fx.glow('255,255,255'), -70, -60, 150, 110); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }

  // the sea behind the shore: the swell, waves on the causeway, and the storm far out
  function drawSea(ctx) {
    const P = G.pal(), sea = B.sea.y, calm = 1 - 0.75 * B.calm;
    ctx.save();
    ctx.beginPath(); ctx.rect(-80, HZ, G.W + 160, FLOOR - HZ + 1); ctx.clip();
    ctx.strokeStyle = G.rgba(P.rim, 1); ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const z = Math.pow((i * 0.618) % 1, 1.6) * 3 + 0.03;
      const wx = ((i * 233 + G.t * (8 + (i % 5) * 4) * calm) % 1800) - 260;
      const p = proj(wx, sea + Math.sin(G.t * 1.1 + i) * 3 * calm, z), len = 34 * p.s + 6;
      ctx.globalAlpha = (0.05 + 0.13 * p.s) * (0.6 + 0.4 * Math.sin(G.t * 1.3 + i)) * calm;
      ctx.lineWidth = 0.8 + p.s;
      ctx.beginPath(); ctx.moveTo(p.x - len, p.y); ctx.lineTo(p.x + len, p.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // a shadow under the water (its entrance)
    if (B.shadow) {
      const p = proj(B.shadow.x, sea + 10, B.shadow.z);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.12);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 340 * p.s);
      g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(0.6, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 340 * p.s, 0, G.TAU); ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(G.t * 3 + k); ctx.drawImage(G.fx.glow(P.boss), p.x - 200 * p.s + k * 90 * p.s - 4, p.y - 3, 8, 6); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    drawEbb(ctx);
    // waves breaking on the causeway, while the sea is below it
    if (sea > FLOOR - 2 && sea < FLOOR + 50) {
      for (let j = 0; j < 2; j++) {
        ctx.strokeStyle = G.rgba(WATER, (j ? 0.12 : 0.2) * calm); ctx.lineWidth = j ? 1.5 : 2.5;
        ctx.beginPath();
        for (let x = -60; x <= G.W + 60; x += 14) {
          const y = FLOOR - 3 - j * 7 - Math.max(0, Math.sin(x * 0.012 - G.t * (1.2 + j * 0.4) + j)) * 4 * calm;
          if (x === -60) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    // lightning far out
    if (B.bolt) {
      const bt = B.bolt, a = 0.5 * (1 - bt.t / 0.35);
      let x = bt.x, y = -20, sd = bt.seed;
      ctx.strokeStyle = G.rgba(P.hot, a); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, y);
      while (y < HZ) { sd = (sd * 9301 + 49297) % 233280; x += (sd / 233280 - 0.5) * 50; y += 26 + (sd % 20); ctx.lineTo(x, Math.min(y, HZ)); }
      ctx.stroke();
      ctx.fillStyle = G.rgba(P.rim, 0.05 * (1 - bt.t / 0.35)); ctx.fillRect(-80, -80, G.W + 160, HZ + 80);
    }
    // the wall of water it breaches through: two sheets thrown up either side of it, falling back
    if (B.wall) {
      const w = B.wall, p = proj(w.x, B.sea.y, w.z), k = Math.min(1, w.t / 0.45), fall = G.clamp((w.t - 0.6) / 0.9, 0, 1);
      const h = 480 * p.s * E.outCubic(k) * (1 - fall * fall), fade = 1 - fall;
      if (h > 2) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const d of [-1, 1]) {
          const x0 = p.x + d * 30 * p.s, x1 = p.x + d * (150 + 90 * k) * p.s;
          const g = ctx.createLinearGradient(0, p.y - h, 0, p.y);
          g.addColorStop(0, G.rgba(WATER, 0)); g.addColorStop(0.35, G.rgba(WATER, 0.16 * fade)); g.addColorStop(1, G.rgba(WATER, 0.05 * fade));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(x0, p.y);
          for (let i = 0; i <= 8; i++) {
            const u = i / 8, yy = p.y - h * Math.sin(Math.PI * (0.15 + 0.7 * u)) * (1 - 0.35 * u) + Math.sin(i * 7.3 + w.t * 9) * 10 * p.s;
            ctx.lineTo(G.lerp(x0, x1, u), yy);
          }
          ctx.lineTo(x1, p.y); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  function surfacePath(ctx, y0, x0, x1) {
    for (let x = x0; x <= x1; x += 16) {
      const y = y0 + Math.sin(x * 0.025 + G.t * 2.1) * 2 + Math.sin(x * 0.061 - G.t * 3.3) * 1.2;
      if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  // the flood over the floor, behind everything that stands in it
  function drawFloodBack(ctx) {
    const y0 = B.sea.y;
    if (y0 >= FLOOR - 1) return;
    const P = G.pal(), c = rgbStr(P.near);
    const g = ctx.createLinearGradient(0, y0, 0, FLOOR + 130);
    g.addColorStop(0, G.rgba(c, 0.55)); g.addColorStop(0.3, G.rgba(c, 0.7)); g.addColorStop(1, 'rgba(2,4,6,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath(); surfacePath(ctx, y0, WL - 80, WR + 80); ctx.lineTo(WR + 80, FLOOR + 140); ctx.lineTo(WL - 80, FLOOR + 140); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(P.rim, 0.3); ctx.lineWidth = 1.4;
    ctx.beginPath(); surfacePath(ctx, y0, WL - 80, WR + 80); ctx.stroke();
    // light moving on the surface
    ctx.strokeStyle = G.rgba(P.rim, 0.18); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const x = ((i * 157 + G.t * (20 + i % 4 * 9)) % 1400) - 60, y = y0 + 4 + (i % 4) * 6; ctx.moveTo(x, y); ctx.lineTo(x + 18 + (i % 3) * 10, y); }
    ctx.stroke();
  }
  function drawFloodFront(ctx) {
    const y0 = B.sea.y;
    if (y0 >= FLOOR - 1) return;
    const P = G.pal(), c = rgbStr(P.near), pl = G.player;
    ctx.fillStyle = G.rgba(c, 0.4);
    ctx.beginPath(); surfacePath(ctx, y0 + 2, WL - 80, WR + 80); ctx.lineTo(WR + 80, FLOOR + 8); ctx.lineTo(WL - 80, FLOOR + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(P.rim, 0.32); ctx.lineWidth = 1.4;
    ctx.beginPath(); surfacePath(ctx, y0 + 2, WL - 80, WR + 80); ctx.stroke();
    // rings round whoever wades in it
    if (!pl.plat && !pl.hidden && !pl.dead && pl.y > y0 - 4) {
      for (let j = 0; j < 2; j++) {
        const k = (G.t * 1.4 + j * 0.5) % 1;
        ctx.strokeStyle = G.rgba(P.rim, 0.4 * (1 - k)); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(pl.x, y0 + 2, 12 + 26 * k, 2.5 + 4 * k, 0, 0, G.TAU); ctx.stroke();
      }
    }
  }

  // the undertow: the floor flooded black, its current running in to the jaws, the air drawn after it
  function drawUndertow(ctx) {
    const U = B.under;
    if (!U || U.k < 0.01) return;
    const k = U.k, y0 = Math.min(FLOOR - 12, level(0)) - 8 * k, sd = U.side, run = U.pull / U.PULL;
    const g = ctx.createLinearGradient(0, y0 - 4, 0, FLOOR + 100);
    g.addColorStop(0, 'rgba(14,2,8,' + 0.6 * k + ')'); g.addColorStop(0.12, 'rgba(6,0,4,' + 0.82 * k + ')'); g.addColorStop(1, 'rgba(2,0,1,' + 0.9 * k + ')');
    ctx.fillStyle = g;
    ctx.beginPath(); surfacePath(ctx, y0, WL - 80, WR + 80); ctx.lineTo(WR + 80, FLOOR + 140); ctx.lineTo(WL - 80, FLOOR + 140); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(BLOOD, 0.4 * k); ctx.lineWidth = 1.4;
    ctx.beginPath(); surfacePath(ctx, y0, WL - 80, WR + 80); ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    // streaks on the water, quickening as they near the jaws
    const far = sd > 0 ? WL : WR;
    for (let i = 0; i < 48; i++) {
      const u = Math.pow((i * 0.137 + U.flow / 1000 * (0.75 + (i % 5) * 0.08)) % 1, 0.8), x = G.lerp(far, U.mx, u), y = y0 + 3 + (i % 5) * 6;
      const len = 18 + 60 * u * (0.4 + run);
      ctx.strokeStyle = G.rgba(i % 3 ? BLOOD : VHOT, (i % 3 ? 0.55 : 0.28) * k * Math.sin(Math.PI * u) * (0.35 + 0.65 * run));
      ctx.lineWidth = i % 3 ? 2 : 1.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sd * len, y); ctx.stroke();
    }
    // the air drawn in after it: faint threads at every height, bending down into the jaws
    if (run > 0.05) {
      for (let i = 0; i < 16; i++) {
        const u = (i * 0.211 + U.flow / 800 * (0.8 + (i % 3) * 0.15)) % 1, h = 40 + ((i * 67) % 300);
        const x = G.lerp(far, U.mx, u), y = FLOOR - h * (1 - u * u * 0.85), len = 30 + 60 * u;
        ctx.strokeStyle = G.rgba(BLOOD, 0.2 * run * k * Math.sin(Math.PI * u));
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sd * len, y - h * 0.08 * u); ctx.stroke();
      }
    }
    // where it pours into the jaws, the water turns over on itself
    for (let i = 0; i < 3; i++) {
      const a = U.flow * 0.02 * (1 + i * 0.3) + i * 2;
      ctx.strokeStyle = G.rgba(BLOOD, (0.22 + 0.1 * i) * k * (0.4 + 0.6 * run)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(U.mx - sd * 50, y0 + 3, 70 + 30 * i, 6 + 2 * i, 0, a, a + 2.4); ctx.stroke();
    }
    ctx.restore();
  }

  function drawVortex(ctx) {
    const V = B.vortex;
    if (V.k < 0.02) return;
    const P = G.pal(), x = V.x, y = level(0) + 2, k = V.k, rx = 320 * k, ry = 46 * k;
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(0,0,0,0.8)'); g.addColorStop(0.25, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, G.TAU); ctx.fill();
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const q = 0.18 + i / 10, a = V.spin * (1.7 - q) + i * 2.1;
      ctx.strokeStyle = G.rgba(i % 2 ? WATER : P.rim, 0.5 * (1.15 - q) * k);
      ctx.lineWidth = (2 + 5 * (1 - q)) * (rx / ry) * 0.25;
      ctx.beginPath(); ctx.arc(0, 0, rx * q, a, a + 1.5 + q); ctx.stroke();
    }
    ctx.strokeStyle = G.rgba(P.boss, 0.4 * k); ctx.lineWidth = 3 * (rx / ry) * 0.3;
    ctx.beginPath(); ctx.arc(0, 0, rx * 0.16, 0, G.TAU); ctx.stroke();
    ctx.restore();
    // the current running in along the floor
    ctx.strokeStyle = G.rgba(P.rim, 1); ctx.lineWidth = 1.2;
    for (let i = 0; i < 24; i++) {
      const sd = i % 2 ? 1 : -1, u = (G.t * (0.3 + (i % 4) * 0.07) + i * 0.137) % 1, d = (1 - u) * 600 + 40;
      const sx = x + sd * d, sy = y - 2 - (i % 3) * 4;
      if (sx < WL || sx > WR) continue;
      ctx.globalAlpha = 0.28 * Math.sin(Math.PI * u) * k;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - sd * (20 + 30 * u), sy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // its fin, circling the eye before it comes up out of it
  function drawFinCircle(ctx) {
    const fc = B.finCircle, V = B.vortex;
    if (!fc) return;
    const P = G.pal(), x = V.x + Math.cos(fc.a) * 250 * V.k, y = level(0) + Math.sin(fc.a) * 26 * V.k, d = -Math.sin(fc.a) >= 0 ? 1 : -1, s = 0.85 + 0.15 * Math.sin(fc.a);
    ctx.fillStyle = '#0a171d';
    ctx.beginPath(); ctx.moveTo(x - d * 34 * s, y); ctx.quadraticCurveTo(x - d * 10 * s, y - 40 * s, x - d * 26 * s, y - 86 * s); ctx.quadraticCurveTo(x + d * 18 * s, y - 40 * s, x + d * 30 * s, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(P.boss, 0.55); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = G.rgba(WATER, 0.35); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + d * 30, y); ctx.lineTo(x - d * 50, y - 4); ctx.moveTo(x + d * 30, y); ctx.lineTo(x - d * 50, y + 4); ctx.stroke();
  }
  // (the gyre) the water of the bay turning inside the coil: streaks of foam going round, darker in the middle
  function drawGyre(ctx) {
    const gy = B.gyre;
    if (!gy || gy.k < 0.02) return;
    const P = G.pal(), k = gy.k, sea = B.sea.y;
    const at = (q, a) => { const z = 0.62 - 0.36 * q * Math.sin(a), s = 1 / (1 + DEPTH * z); return proj(640 + GYRE_A * q * Math.cos(a) / s, sea, z); };
    const c = at(0, 0);
    ctx.save();
    ctx.translate(c.x, c.y); ctx.scale(1, 0.12);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, GYRE_A * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,' + 0.55 * k + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, GYRE_A * 0.8, 0, G.TAU); ctx.fill();
    ctx.restore();
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const q = 0.18 + i * 0.09, a0 = gy.spin * (1.9 - q) + i * 2.3;
      ctx.strokeStyle = G.rgba(i % 2 ? WATER : P.rim, 0.32 * k * (1.1 - q));
      ctx.lineWidth = 1.5 + 1.5 * (1 - q);
      ctx.beginPath();
      for (let j = 0; j <= 10; j++) { const p = at(q, a0 + j * 0.15); if (j) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    }
  }
  // the surge that brings the flood
  function drawWave(ctx) {
    const w = B.wave;
    if (!w) return;
    const P = G.pal(), c = rgbStr(P.near), z = Math.max(0, w.z);
    ctx.beginPath();
    const pts = [];
    const s0 = proj(0, 0, z).s;
    for (let sx = -120; sx <= G.W + 120; sx += 32) {
      const x = 640 + (sx - 640) / s0;
      const p = proj(x, B.sea.y - w.h * (0.85 + 0.15 * Math.sin(x * 0.004 + 1)) + Math.sin(x * 0.01 + G.t * 2) * 16, z);
      pts.push(p);
      if (sx === -120) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    const base = proj(0, B.sea.y + 40, z).y;
    ctx.lineTo(G.W + 120, base); ctx.lineTo(-120, base); ctx.closePath();
    const g = ctx.createLinearGradient(0, pts[0].y, 0, base);
    g.addColorStop(0, G.rgba(c, 0.9)); g.addColorStop(1, 'rgba(2,4,6,0.95)');
    ctx.fillStyle = g; ctx.fill();
    // white water along the crest, and streaks running down the face
    ctx.strokeStyle = G.rgba(WATER, 0.16); ctx.lineWidth = 26 * s0;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 10 * s0) : ctx.moveTo(p.x, p.y + 10 * s0))); ctx.stroke();
    ctx.strokeStyle = G.rgba(WATER, 0.5); ctx.lineWidth = 3;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.strokeStyle = G.rgba(P.rim, 0.1); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) { const p = pts[i], o = ((G.t * 160 + i * 37) % 120) * s0; ctx.moveTo(p.x + 6, p.y + 20 * s0 + o); ctx.lineTo(p.x + 2, p.y + 70 * s0 + o); }
    ctx.stroke();
    if (Math.random() < 0.8) { const p = pts[(Math.random() * pts.length) | 0]; G.fx.spawn({ kind: 'spark', x: p.x, y: p.y, vx: G.rand(-60, 60), vy: -G.rand(60, 200), life: 0.6, size: 2, color: WATER, grav: 600, a: 0.5 }); }
  }
  // the sea drawn back off the shore (the breaker's tell): the bed laid bare out to where the water stands
  function drawEbb(ctx) {
    const eb = B.ebb;
    if (!eb || eb.z < 0.004) return;
    const P = G.pal(), top = proj(640, FLOOR + 22, eb.z).y, bot = FLOOR + 1;
    if (bot - top < 1) return;
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(5,9,11,0.9)'); g.addColorStop(1, 'rgba(12,20,22,0.96)');
    ctx.fillStyle = g; ctx.fillRect(-80, top, G.W + 160, bot - top);
    // rocks, weed and pools on the bed, wet along their tops
    ctx.lineWidth = 1;
    for (let i = 0; i < 36; i++) {
      const z = 0.02 + ((i * 0.381) % 1) * 0.6;
      if (z > eb.z - 0.01) continue;
      const pool = i % 5 === 0, p = proj(((i * 277) % 1600) - 160, FLOOR + 22, z), r = (10 + (i % 4) * 7) * p.s;
      ctx.fillStyle = pool ? 'rgba(22,38,42,0.9)' : 'rgba(2,5,6,0.88)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r * (pool ? 2.3 : 1), r * 0.38, 0, 0, G.TAU); ctx.fill();
      ctx.strokeStyle = G.rgba(P.rim, pool ? 0.3 : 0.16);
      ctx.beginPath(); ctx.ellipse(p.x, p.y - r * 0.08, r * (pool ? 2.3 : 1), r * 0.38, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
    // water running off the bed after the sea
    ctx.strokeStyle = G.rgba(WATER, 0.14);
    for (let i = 0; i < 18; i++) {
      const u = (G.t * 0.9 + i * 0.173) % 1, x = ((i * 191) % 1400) - 60, y = G.lerp(bot - 2, top + 2, u);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 4 - 8 * (1 - u)); ctx.stroke();
    }
    // the water's edge far out, foaming as it runs away
    ctx.strokeStyle = G.rgba(WATER, 0.4); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -80; x <= G.W + 80; x += 16) {
      const y = top + Math.sin(x * 0.02 + G.t * 3) * 1.6 + Math.sin(x * 0.051 - G.t * 4.4);
      if (x === -80) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // a wave rolling along the shore: a body of dark water rising to a crest that runs ahead of its foot
  function drawRoller(ctx, h) {
    const vo = G.corrupt.active(), P = G.pal();
    const k = E.outCubic(h.rise) * (h.crash ? 1 - E.inQuad(Math.min(1, h.crash)) : 1), Hc = h.hgt * k;
    if (Hc < 2) return;
    const d = h.dir, x = h.x, F = FLOOR + 3, L = h.tall ? 330 : 170;
    // the lip leans out ahead of the foot, and folds back into the wall as it breaks
    const lean = (h.tall ? 48 : 10) * (h.crash ? 1 - h.crash : 1) * k;
    const c = rgbStr(P.near), foam = vo ? BLOOD : WATER;
    ctx.save();
    // foam left on the floor behind it
    const wg = ctx.createLinearGradient(x - d * (L + 300), 0, x - d * L * 0.5, 0);
    wg.addColorStop(0, G.rgba(foam, 0)); wg.addColorStop(1, G.rgba(foam, 0.16 * k));
    ctx.fillStyle = wg; ctx.fillRect(Math.min(x - d * (L + 300), x - d * L * 0.5), F - 6, L * 0.5 + 300, 6);
    ctx.beginPath();
    ctx.moveTo(x - d * L, F);
    ctx.bezierCurveTo(x - d * L * 0.55, F - Hc * 0.08, x - d * L * 0.4, F - Hc * 0.75, x - d * 40, F - Hc * 0.96);
    ctx.quadraticCurveTo(x - d * 6, F - Hc * 1.05, x + d * lean, F - Hc * 0.86);
    if (h.tall) ctx.quadraticCurveTo(x + d * (lean + 8), F - Hc * 0.66, x + d * lean * 0.4, F - Hc * 0.6);
    ctx.bezierCurveTo(x + d * 4, F - Hc * 0.5, x + d * 14, F - Hc * 0.2, x + d * 8, F);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, F - Hc, 0, F);
    g.addColorStop(0, vo ? 'rgba(10,1,5,0.95)' : G.rgba(c, 0.92)); g.addColorStop(1, vo ? 'rgba(3,0,2,0.97)' : 'rgba(3,6,8,0.95)');
    ctx.fillStyle = g; ctx.fill();
    ctx.clip();
    // sea-green through the thin water at the top, going dark and deep towards the foot
    const gl = ctx.createLinearGradient(0, F - Hc, 0, F);
    gl.addColorStop(0, G.rgba(foam, vo ? 0.07 : 0.3)); gl.addColorStop(0.45, G.rgba(foam, vo ? 0.02 : 0.1)); gl.addColorStop(1, G.rgba(foam, 0));
    ctx.fillStyle = gl; ctx.fillRect(Math.min(x - d * L, x + d * 60), F - Hc - 20, L + 60, Hc + 24);
    // the face catching what light there is, brightest where it stands steepest
    const fg = ctx.createLinearGradient(x - d * 90, 0, x + d * (lean + 10), 0);
    fg.addColorStop(0, G.rgba(foam, 0)); fg.addColorStop(1, G.rgba(foam, vo ? 0.06 : 0.2));
    ctx.fillStyle = fg; ctx.fillRect(Math.min(x - d * 90, x + d * (lean + 10)), F - Hc, 100 + lean, Hc);
    // (tall) the hollow under the lip
    if (h.tall) {
      const hg = ctx.createLinearGradient(x + d * lean, 0, x - d * 40, 0);
      hg.addColorStop(0, 'rgba(2,4,6,0.32)'); hg.addColorStop(1, 'rgba(2,4,6,0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.ellipse(x + d * lean * 0.2, F - Hc * 0.7, 30 + lean * 0.5, Hc * 0.06, d * 0.25, 0, G.TAU); ctx.fill();
    }
    // water streaming down its back and face
    ctx.strokeStyle = G.rgba(foam, vo ? 0.18 : 0.24); ctx.lineWidth = 1.4;
    for (let i = 0; i < (h.tall ? 12 : 5); i++) {
      const u = (h.t * 0.9 + i * 0.137) % 1, sx = x - d * (8 + i * (L / 14)), y0 = F - Hc * (1 - u * 0.9);
      ctx.beginPath(); ctx.moveTo(sx, y0); ctx.lineTo(sx - d * 6, y0 + 18 + 34 * u); ctx.stroke();
    }
    ctx.restore();
    // white water along the crest: a band, and clots of foam tumbling in it
    ctx.save(); ctx.lineCap = 'round';
    const cx0 = x - d * L * 0.36, cy0 = F - Hc * 0.86, qx = x - d * 6, qy = F - Hc * 1.05, cx1 = x + d * lean, cy1 = F - Hc * 0.86;
    ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.quadraticCurveTo(qx, qy, cx1, cy1);
    ctx.strokeStyle = G.rgba(foam, 0.26); ctx.lineWidth = (h.tall ? 16 : 6) * Math.max(0.3, k); ctx.stroke();
    ctx.strokeStyle = G.rgba(foam, 0.55); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = G.rgba(foam, 0.3);
    for (let i = 0; i < (h.tall ? 14 : 6); i++) {
      const u = ((i * 0.618) + h.t * 0.7) % 1, w0 = (1 - u) * (1 - u), w1 = 2 * (1 - u) * u, w2 = u * u;
      const px = w0 * cx0 + w1 * qx + w2 * cx1, py = w0 * cy0 + w1 * qy + w2 * cy1 + Math.sin(h.t * 9 + i) * 3;
      ctx.beginPath(); ctx.arc(px, py, (h.tall ? 4 : 2) + (i % 3) * (h.tall ? 2.5 : 1), 0, G.TAU); ctx.fill();
    }
    // (tall) a curtain of spray falling from the lip ahead of the face
    if (h.tall && !h.crash) {
      ctx.strokeStyle = G.rgba(foam, 0.16); ctx.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const u = (h.t * 2.2 + i * 0.29) % 1, sx = x + d * (lean * (0.4 + 0.5 * ((i * 0.37) % 1))), y0 = F - Hc * (0.84 - 0.5 * u);
        ctx.beginPath(); ctx.moveTo(sx, y0); ctx.lineTo(sx + d * 2, y0 + 26); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // the jet: a rope of dark water with a lighter core, tearing along its length, bursting where it strikes
  function drawJet(ctx, h) {
    const vo = G.corrupt.active(), P = G.pal();
    if (!h.on && h.k < 0.03) {
      if (h.warn > 0.01) {
        // where it will open up (it is a thing thrown, so it is marked): faint, along the head's aim
        ctx.save(); ctx.setLineDash([10, 12]); ctx.lineDashOffset = -h.t * 60;
        ctx.strokeStyle = G.rgba(DANGER, 0.1 + 0.35 * h.warn); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(h.ex, h.ey); ctx.stroke(); ctx.restore();
      }
      return;
    }
    if (h.len < 2) return;
    const w = h.width * h.k * (1 + 0.07 * Math.sin(h.t * 70)), c = rgbStr(P.near);
    const line = () => { ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(h.ex, h.ey); ctx.stroke(); };
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = vo ? 'rgba(6,0,3,0.82)' : G.rgba(c, 0.6); ctx.lineWidth = w * 1.5; line();
    ctx.strokeStyle = vo ? 'rgba(34,2,12,0.92)' : G.rgba(WATER, 0.4); ctx.lineWidth = w * 0.8; line();
    ctx.strokeStyle = vo ? G.rgba(BLOOD, 0.55) : G.rgba(P.hot, 0.22); ctx.lineWidth = Math.max(1, w * 0.2); line();
    // water tearing along it
    ctx.setLineDash([22, 30]); ctx.lineDashOffset = -h.t * 2400; ctx.lineCap = 'butt';
    const nx = -Math.sin(h.ang), ny = Math.cos(h.ang);
    ctx.strokeStyle = G.rgba(vo ? BLOOD : WATER, 0.5); ctx.lineWidth = 2;
    for (const o of [-0.3, 0.32]) { ctx.beginPath(); ctx.moveTo(h.ox + nx * o * w, h.oy + ny * o * w); ctx.lineTo(h.ex + nx * o * w, h.ey + ny * o * w); ctx.stroke(); }
    ctx.setLineDash([]);
    // spray where it strikes
    ctx.fillStyle = G.rgba(vo ? BLOOD : WATER, 0.26 * h.k);
    ctx.beginPath(); ctx.ellipse(h.ex, h.ey, w * 1.3, w * 0.8, 0, 0, G.TAU); ctx.fill();
    ctx.restore();
  }
  // wreckage on the floating platforms (high water) and weed on the rocks (the maelstrom)
  function drawFlotsam(ctx) {
    const P = G.pal();
    for (const p of G.arena.platforms) {
      if (p.rise < 0.3 || p.gone) continue;
      const y = p.y;
      if (B.phase === 2) {
        ctx.fillStyle = '#1a130d';
        ctx.beginPath(); ctx.moveTo(p.x - 8, y - 2); ctx.lineTo(p.x + p.w + 4, y - 3); ctx.lineTo(p.x + p.w + 12, y + 2); ctx.lineTo(p.x + p.w - 6, y + 9); ctx.lineTo(p.x + 4, y + 10); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); for (let x = p.x + 26; x < p.x + p.w; x += 30) { ctx.moveTo(x, y - 2); ctx.lineTo(x - 2, y + 9); } ctx.stroke();
        ctx.strokeStyle = G.rgba(P.rim, 0.45); ctx.beginPath(); ctx.moveTo(p.x - 8, y - 2); ctx.lineTo(p.x + p.w + 4, y - 3); ctx.stroke();
      } else if (B.phase === 3) {
        ctx.strokeStyle = G.rgba(P.rim, 0.25); ctx.lineWidth = 1.5;
        ctx.beginPath(); for (let x = p.x + 10; x < p.x + p.w; x += 14) { ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(x + 4, y + 20, x - 2, y + 30 + (x % 9)); } ctx.stroke();
      }
    }
  }

  B.drawGround = function (ctx) {
    const b = B.body;
    drawSea(ctx);
    drawGyre(ctx);
    if (!B.dead) {
      // its coils far out in the sea (behind the water line); corrupted, they are black like the rest of it
      const far = (c) => {
        if (B.gyre && B.gyrePts.length) drawChain(c, drawn(B.gyreD, B.gyrePts), true, {});
        B.humps.forEach((h, i) => drawChain(c, drawn(B.humpD && B.humpD[i], B.humpPts[i]), true, {}));
        if (B.tail.on) { drawChain(c, drawn(B.tailD, B.tailPts), true, {}); drawFluke(c, true); drawTrail(c, true, [0, 1, 2]); }
        if (B.spine.length) { drawChain(c, drawn(B.spineD, B.spine), true, { fin: b.fin, up: headUp(b) }); drawTrail(c, true, [3]); }
        if (b.z > ZS) drawHead(c, b);
      };
      if (G.corrupt.active()) G.corrupt.silhouette(ctx, far, false); else far(ctx);
    }
    drawFloodBack(ctx);
    drawUndertow(ctx);
    drawVortex(ctx);
    if (!B.dead && b.z < 0.05 && !b.hidden) {
      const k = G.clamp(1 - (FLOOR - b.y) / 380, 0.15, 1);
      ctx.fillStyle = 'rgba(0,0,0,' + 0.42 * k + ')';
      ctx.beginPath(); ctx.ellipse(b.x + b.face * 10, Math.min(FLOOR, B.sea.y) + 3, 80 * k, 9 * k, 0, 0, G.TAU); ctx.fill();
    }
  };
  // the hydra's void head is drawn on its own, over the boss: a corrupted boss is drawn as one black
  // shape (corrupt.js), and this head is to be seen as something else, black flesh with blood in it
  B.drawOver = function (ctx) {
    for (const h of H.list) if (h.roller && !h.dead) drawRoller(ctx, h);
    if (!B.dead) drawVoidHead(ctx);
  };
  // corrupted, only its body is drawn black (corrupt.js): the flotsam, its wave and the surge are not it
  B.corruptBehind = (ctx) => drawFlotsam(ctx);
  B.corruptFront = (ctx) => drawSurf(ctx);
  B.draw = function (ctx) {
    const b = B.body, plain = !G.corrupt.drawing;
    if (plain) drawFlotsam(ctx);
    if (!B.dead) {
      if (B.tail.on) { drawChain(ctx, drawn(B.tailD, B.tailPts), false, {}); drawFluke(ctx, false); drawTrail(ctx, false, [0, 1, 2]); }
      if (B.spine.length) { drawChain(ctx, drawn(B.spineD, B.spine), false, { fin: b.fin, up: headUp(b) }); drawTrail(ctx, false, [3]); }
      if (b.z <= ZS) drawHead(ctx, b);
      drawFinCircle(ctx);
    }
    if (plain) drawSurf(ctx);
  };
  function drawSurf(ctx) {
    drawWave(ctx);
    if (B.wash > 0) {
      // the surge breaking over everything, running down
      const c = rgbStr(G.pal().near), a = B.wash;
      ctx.fillStyle = G.rgba(c, 0.55 * a); ctx.fillRect(-80, -80, G.W + 160, G.H + 160);
      ctx.strokeStyle = G.rgba(WATER, 0.25 * a); ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 40; i++) { const x = (i * 97) % G.W, y = ((i * 211) % G.H) + (1 - a) * 400; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 60); }
      ctx.stroke();
    }
  };

  G.makeBoss(B);
  // What is struck is the head, where it is drawn and however it is turned: a box round the skull from
  // the back of the brow to the tip of the snout, turned and pitched with it and carried out to sea with
  // it. (v2.1b: the frame's box sat round the head's pivot, so the jaws and teeth, 40-odd px of the
  // snout, could be cut through for nothing, more so with the head pitched up or down.)
  B.bodyBox = () => skullBox(B.body);
  // Whether a head's bite is on the hero: the skull as drawn, in two parts (the cranium, and the
  // narrower snout), turned with the head (sampled over the hero's box)
  function headHits(h, P) {
    const pr = proj(h.x, h.y - HH, h.z || 0), s = pr.s, c = Math.cos(h.ang), sn = Math.sin(h.ang), re = c < 0 ? -1 : 1, b = P.box();
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 8; j++) {
      const wx = b.cx - b.hw + i * b.hw / 2 - pr.x, wy = b.cy - b.hh + j * b.hh / 4 - pr.y;
      const lx = (c * wx + sn * wy) / s, ly = (-sn * wx + c * wy) / s * re;
      if ((lx > -66 && lx < 40 && ly > -40 && ly < 28) || (lx >= 40 && lx < 108 && ly > -26 && ly < 20)) return true;
    }
    return false;
  }
  // (the same for any head: the void head's bites and its coming up out of the floor use it too)
  function skullBox(b0) {
    const b = viewOf(b0); // (where it is drawn, in its pose)
    const pr = proj(b.x, b.y - HH, b0.z || 0), s = pr.s;
    const c = Math.cos(b.ang), sn = Math.sin(b.ang), re = c < 0 ? -1 : 1;
    const x0 = -72, x1 = 106, y0 = -38, y1 = 32; // (the skull in its own frame, at its drawing scale)
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 * re, hx = (x1 - x0) / 2, hy = (y1 - y0) / 2;
    return {
      cx: pr.x + s * (c * mx - sn * my), cy: pr.y + s * (sn * mx + c * my),
      hw: s * (Math.abs(c) * hx + Math.abs(sn) * hy), hh: s * (Math.abs(sn) * hx + Math.abs(c) * hy),
    };
  }
  G.BOSS_IDS.push('leviathan');
})();
