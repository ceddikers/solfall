// Solfall - the Champion Who Came Before (v2.5a): Aurel, the First Light. Built from the Claude Doc
// "Solfall boss brief: The Champion Who Came Before" (drafted by Claude, approved by the user).
// He is not a trial. From trial III on, now and then, a doorway of light opens in the cliff past the
// seventh portal and he sits inside it (rest.js). Step through to fight him; lose and nothing is lost.
//   I   The Duel. A mirror match: he moves like a hero and fights with one of four weapons at a time,
//       twins of the heroes' own. Whichever weapon glows on the rack on his back is what comes next.
//   II  The Trophies. A standing stone for every boss: those beaten this run light one by one, each in
//       its own way, and he fights with one move borrowed from each. His weapons switch mid-combo and
//       he feints with two glows (the brighter is the real one).
//   III The Other Side. He lets the seventh door's darkness in: pitch black and lightning, the arena
//       dark but for the hero's own light and his rack's glows. The Four-Fold string, faster switches,
//       and below 12% the Black Dawn: a beam clash won on the beat, three flashes, two to win.
// He does not die. At nothing he kneels, the dark runs off him, and he offers you his hilt.
'use strict';
(function () {
  const { wait, tween } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards, K = G.kit, D = G.draw, DANGER = G.COL.danger;
  const WL = G.WALL_L, WR = G.WALL_R;
  const GOLD = '214,186,128';                          // his own faded gold
  const VOID = { boss: '235,30,80', hot: '255,214,226' }; // what the seventh door keeps
  const DAWN_GOLD = '255,190,40';                       // the Black Dawn's press window
  const RING_IN = 34;                                   // the meeting ring the closing ring lands on
  const WPN = ['sword', 'maul', 'bow', 'blade'];
  const WHERO = { sword: 'vesper', maul: 'aster', bow: 'lune', blade: 'eos' };
  const heroOf = (w) => G.HEROES.find((h) => h.id === WHERO[w]) || G.HEROES[0];
  const tintOf = (w) => { const h = heroOf(w); return { boss: h.col, hot: h.hot }; };
  const bossTint = (id) => { const t = G.THEMES[id] && G.THEMES[id][1]; return t ? { boss: t.boss, hot: t.hot } : { boss: GOLD, hot: '255,250,235' }; };
  const ownW = () => ({ vesper: 'sword', aster: 'maul', lune: 'bow', eos: 'blade' }[G.run.hero] || 'sword');

  // ------------------------------------------------------------------ sounds
  const AU = G.audio, S = AU.synth;
  // a weapon on his back lighting: a struck chime, each weapon its own note (o.n: 0 sword .. 3 blade)
  AU.define('chGlow', (o) => {
    const f = [880, 587, 1175, 740][(o && o.n) || 0], v = (o && o.vol) || 1;
    S.tone({ type: 'sine', f0: f, dur: 0.45, vol: 0.07 * v });
    S.tone({ type: 'triangle', f0: f * 2, dur: 0.2, vol: 0.025 * v });
  });
  // a standing stone waking: a deep bell (o.k: higher for each one)
  AU.define('chStone', (o) => {
    const k = (o && o.k) || 0, f = 98 * Math.pow(2, k * 2 / 12);
    S.tone({ type: 'sine', f0: f, dur: 2.2, vol: 0.2 });
    S.tone({ type: 'sine', f0: f * 2.76, dur: 1.4, vol: 0.05 });
    S.tone({ type: 'triangle', f0: f * 5.4, dur: 0.6, vol: 0.02 });
    S.noise({ dur: 0.08, vol: 0.12, type: 'lowpass', f0: 900 });
  });
  // a thread of light running from a stone into his rack
  AU.define('chThread', () => { S.tone({ type: 'sine', f0: 400, f1: 1600, dur: 0.5, vol: 0.06, attack: 0.3 }); S.noise({ dur: 0.4, vol: 0.05, type: 'bandpass', f0: 1200, f1: 4000, q: 3, attack: 0.3 }); });
  // the sky cracking open
  AU.define('chCrack', () => {
    S.noise({ dur: 0.08, vol: 0.4, type: 'highpass', f0: 2600 });
    S.noise({ dur: 1.4, vol: 0.22, type: 'lowpass', f0: 1400, f1: 120, delay: 0.05 });
    S.tone({ type: 'sawtooth', f0: 55, f1: 30, dur: 1.6, vol: 0.12 });
  });
  // the dark pouring in: a long falling roar
  AU.define('chPour', (o) => { const d = (o && o.dur) || 2; S.noise({ dur: d, vol: 0.2, type: 'lowpass', f0: 2400, f1: 200, attack: 0.3 }); S.tone({ type: 'sine', f0: 70, f1: 35, dur: d, vol: 0.2, attack: 0.4 }); });
  // a heartbeat in the dark
  AU.define('chHeart', (o) => { const v = (o && o.vol) || 1; S.tone({ type: 'sine', f0: 62, f1: 40, dur: 0.16, vol: 0.4 * v }); S.tone({ type: 'sine', f0: 58, f1: 38, dur: 0.14, vol: 0.28 * v, delay: 0.17 }); });
  // the parry: steel turned on steel
  AU.define('chParry', () => { S.noise({ dur: 0.04, vol: 0.32, type: 'highpass', f0: 3800 }); S.tone({ type: 'square', f0: 1760, f1: 1700, dur: 0.18, vol: 0.05 }); S.tone({ type: 'sine', f0: 2640, dur: 0.5, vol: 0.04 }); });
  // the beat of the clash: a flash running along the beam (o.k: 0 coming, 1 the peak, 2 missed)
  AU.define('chBeat', (o) => {
    const k = (o && o.k) || 0;
    if (k === 0) S.tone({ type: 'sine', f0: 300, f1: 900, dur: 0.6, vol: 0.06, attack: 0.5 });
    else if (k === 1) { S.tone({ type: 'sine', f0: 1320, dur: 0.35, vol: 0.12 }); S.noise({ dur: 0.06, vol: 0.3, type: 'highpass', f0: 3000 }); S.tone({ type: 'sine', f0: 80, f1: 40, dur: 0.3, vol: 0.4 }); }
    else { S.tone({ type: 'sawtooth', f0: 140, f1: 70, dur: 0.4, vol: 0.12 }); S.noise({ dur: 0.3, vol: 0.18, type: 'lowpass', f0: 800, f1: 200 }); }
  });
  // the Black Dawn gathering
  AU.define('chGather', (o) => {
    const d = (o && o.dur) || 1.6;
    S.tone({ type: 'sawtooth', f0: 45, f1: 110, dur: d, vol: 0.12, attack: d * 0.8 });
    S.tone({ type: 'sine', f0: 90, f1: 220, dur: d, vol: 0.2, attack: d * 0.8 });
    S.noise({ dur: d, vol: 0.14, type: 'bandpass', f0: 300, f1: 2600, q: 1.5, attack: d * 0.8 });
  });
  AU.vary.chParry = 1;

  // ------------------------------------------------------------------ the arena: a still place at frozen dawn
  G.THEMES.champion = [null,
    {
      name: 'THE DUEL', scene: 'stilldawn',
      sky: ['#11131f', '#2c2c42', '#7a6a76', '#e6c39a'],
      far: '#2b2733', near: '#1c1922', pillar: '#120f16', rim: '255,226,186',
      floorTop: '#5a524c', floor: '#1a1618',
      boss: GOLD, hot: '255,248,230', ember: '255,232,196', stars: 0.15,
    },
    {
      name: 'THE TROPHIES', scene: 'stilldawn',
      sky: ['#0e0a16', '#2e2034', '#8a5a52', '#ffc98a'],
      far: '#2a1e26', near: '#1a1218', pillar: '#0e0a0e', rim: '255,210,150',
      floorTop: '#5e4c3e', floor: '#181210',
      boss: '255,214,140', hot: '255,250,232', ember: '255,214,150', stars: 0.05,
    },
    {
      name: 'THE OTHER SIDE', scene: 'stilldawn',
      sky: ['#010103', '#050207', '#12040a', '#2c0712'],
      far: '#0a0508', near: '#060305', pillar: '#030103', rim: '150,20,44',
      floorTop: '#1c1216', floor: '#060405',
      boss: VOID.boss, hot: VOID.hot, ember: '235,60,90', stars: 0,
    }, G.THEMES.warden[4]];
  G.arena.WEATHER.champion = { kind: 'snow', n: 36 }; // the dawn has frozen: a slow, thin snow
  G.arena.BIRDS.champion = null;
  G.arena.LAYOUTS.champion = {
    1: [[196, 132, 488], [952, 132, 488]],   // a low ledge each side
    2: [[574, 132, 470]],                     // one in the middle, under the lit stones
    3: [],                                    // nothing to stand on in the dark
  };
  // The stopped sun on the horizon, a broken arch where a portal stood, low ruined walls, distant hills.
  // (In the dark of phase III its colours turn the sun into a black disc with a red rim: it has gone out.)
  G.SCENES.stilldawn = function (x, P, F, lcg) {
    const L = -60, R = G.W + 60;
    // the sun, stopped half under the horizon
    const sx = 640, sy = F - 120;
    const g = x.createRadialGradient(sx, sy, 10, sx, sy, 520);
    g.addColorStop(0, G.rgba(P.rim, 0.55)); g.addColorStop(0.25, G.rgba(P.rim, 0.18)); g.addColorStop(1, G.rgba(P.rim, 0));
    x.fillStyle = g; x.fillRect(L, 0, R - L, F);
    x.fillStyle = G.rgba(P.hot, P.stars > 0.1 || P.rim === '150,20,44' ? 0.08 : 0.85);
    x.beginPath(); x.arc(sx, sy, 92, Math.PI, 0); x.fill();
    x.strokeStyle = G.rgba(P.rim, 0.7); x.lineWidth = 3; x.beginPath(); x.arc(sx, sy, 92, Math.PI, 0); x.stroke();
    // long thin clouds lit from below, standing still
    let r = lcg(11);
    for (let i = 0; i < 7; i++) {
      const cy = 90 + r() * 200, cx = L + r() * (R - L), w = 260 + r() * 360;
      x.fillStyle = G.rgba(P.rim, 0.05 + 0.05 * r());
      x.beginPath(); x.ellipse(cx, cy, w / 2, 5 + r() * 6, 0, 0, G.TAU); x.fill();
    }
    // distant hills
    x.fillStyle = P.far;
    x.beginPath(); x.moveTo(L, F + 10);
    r = lcg(3);
    for (let px = L; px <= R; px += 40) x.lineTo(px, F - 70 - 40 * Math.sin(px * 0.004 + 1) - 20 * r());
    x.lineTo(R, F + 10); x.closePath(); x.fill();
    // the broken arch where a portal stood: two pillars, the span snapped in the middle
    x.fillStyle = P.pillar;
    x.fillRect(520, F - 300, 34, 310); x.fillRect(726, F - 300, 34, 310);
    x.beginPath(); x.moveTo(520, F - 300); x.quadraticCurveTo(560, F - 380, 622, F - 392); x.lineTo(630, F - 376); x.lineTo(612, F - 368); x.quadraticCurveTo(566, F - 352, 554, F - 296); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(760, F - 300); x.quadraticCurveTo(724, F - 370, 668, F - 386); x.lineTo(660, F - 372); x.lineTo(674, F - 362); x.quadraticCurveTo(716, F - 350, 726, F - 296); x.closePath(); x.fill();
    x.strokeStyle = G.rgba(P.rim, 0.25); x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(520, F - 300); x.quadraticCurveTo(560, F - 380, 622, F - 392); x.stroke();
    x.beginPath(); x.moveTo(760, F - 300); x.quadraticCurveTo(724, F - 370, 668, F - 386); x.stroke();
    // low ruined walls nearer
    x.fillStyle = P.near;
    r = lcg(17);
    for (let i = 0; i < 6; i++) {
      const wx = 40 + i * 220 + r() * 60, ww = 70 + r() * 90, wh = 30 + r() * 50;
      x.beginPath(); x.moveTo(wx, F + 10); x.lineTo(wx, F - wh); x.lineTo(wx + ww * 0.4, F - wh - 8 * r()); x.lineTo(wx + ww * 0.7, F - wh * 0.6); x.lineTo(wx + ww, F - wh * 0.7); x.lineTo(wx + ww, F + 10); x.closePath(); x.fill();
    }
  };

  // ------------------------------------------------------------------ the boss
  const B = {
    id: 'champion', name: 'AUREL, THE FIRST LIGHT', short: 'Aurel', theme: 'champion', event: true,
    snapTurn: true, // (v2.5e) flips at once when it turns: see K.turn
    sub: 'He waited on the other side', taunt: 'he waited on the other side',
    blurb: 'The hero who ran the trials before you',
    tips: [
      'Watch the rack on his back: the weapon that glows is the one that comes next.',
      'Two glows at once: the brighter one is real.',
      'When all four weapons go dark and he stands still, he is waiting to turn your blow.',
      'Count the marks on his sheath. Three means the long draw.',
      'Each stone that flares behind him is a move he took from a boss you beat.',
      'In the dark, read the rack. It is the only light on him.',
      'The Black Dawn is won on the beat: press as each flash meets the light.',
    ],
    hudCols: [null, ['#d6ba80', '#fff0d0'], ['#ffd68c', '#fffae8'], ['#eb1e50', '#ffd6e2']],
    BASE_HP: 3800, poise0: 380, w: 34, h: 86,
    answer: 'lunge', antiAir: 'rise', finale: 'blackdawn',
    gaps: [0, 0.95, 0.75, 0.58],
    bags: { 1: [], 2: [], 3: [] }, // (filled in setup: phase II and III carry a move for each boss beaten this run)
    cards: { 2: ['THE TROPHIES', 'Then you have earned them'], 3: ['THE OTHER SIDE', 'What the last door keeps'] },
    first: { 1: 'string', 2: '', 3: 'fourfold' },
    bpm: [72, 96, 112, 132],
    staggerWord: 'OPEN', staggerMult: 1.5,
  };
  // the stagger is longest in the duel and shortest in the dark (2.5, 2 and 1.6 s on Standard)
  Object.defineProperty(B, 'staggerDur', { get: () => [0, 0.62, 0.5, 0.4][B.phase] || 0.5 });
  // how long his swings take to come (slowest in the duel), and how long his punish windows last
  const SP = () => [0, 1.12, 1.0, 0.86][B.phase];
  const PW = () => [0, 1, 0.78, 0.56][B.phase];

  // ------------------------------------------------------------------ poses
  // lean, hip, front foot (x, y), back foot (x, y), lead hand (x, y), rear hand (x, y), look, weapon angle.
  // Facing right, from the point between his feet; the weapon angle is the lead hand's weapon, in the
  // same frame (0 points forward, negative up).
  const NP = 12;
  const POSES = {
    idle: [0.08, -41, 13, 0, -14, 0, 19, -56, 6, -55, 0, 0.45],
    guard: [0.0, -42, 10, 0, -13, 0, 9, -50, -3, -48, 0.05, 1.25],          // all four dark: waiting to turn a blow
    breath: [0.14, -39, 13, 0, -14, 0, 18, -50, 6, -50, 0.12, 0.6],        // shoulders drop: the finisher comes
    // the sword
    upC: [-0.1, -41, 14, 0, -16, 0, 4, -84, -2, -72, -0.12, -2.25],          // raised high: a falling cut
    cutDown: [0.32, -36, 22, 0, -19, 0, 34, -46, 18, -50, 0.05, 0.65],
    lowC: [0.18, -37, 19, 0, -18, 0, 16, -30, 6, -40, 0.05, 2.5],            // low behind: a rising cut
    cutUp: [-0.12, -42, 17, 0, -16, 0, 28, -86, 12, -62, -0.25, -1.15],
    thrustC: [0.06, -36, 18, 0, -24, 0, -8, -52, 4, -54, 0, 0],
    thrust: [0.48, -33, 34, 0, -32, -4, 48, -54, 18, -50, 0, 0],
    riseC: [0.3, -30, 20, 0, -20, 0, 18, -26, 8, -30, 0.2, 2.9],
    rise: [-0.28, -46, 12, 0, -14, -6, 12, -100, 6, -80, -0.6, -1.6],
    // the maul
    sweepC: [-0.04, -38, 19, 0, -19, 0, -22, -52, -14, -54, 0, 3.05],
    sweep: [0.28, -36, 23, 0, -21, 0, 38, -52, 26, -54, 0.05, 0.05],
    maulUp: [-0.16, -42, 16, 0, -17, 0, 0, -90, -6, -86, -0.25, -1.9],
    smash: [0.52, -31, 27, 0, -23, 0, 32, -20, 22, -24, 0.25, 0.3],
    // the bow
    bow: [-0.06, -42, 14, 0, -14, 0, 30, -62, 4, -62, 0, 0],
    bowUp: [0.0, -42, 12, 0, -12, 0, 12, -94, 6, -74, -0.45, -1.57],
    // the sheathed blade
    crouch: [0.36, -27, 25, 0, -22, 0, 2, -38, -8, -34, 0.12, 2.9],
    drawn: [0.52, -28, 31, 0, -30, 0, 44, -44, -8, -36, 0.05, 0.05],
    noto: [0.12, -34, 20, 0, -22, 0, 6, -44, -10, -40, 0.1, 2.9],            // the blade going home, his back to you
    // the borrowed
    hands: [-0.06, -43, 14, 0, -14, 0, 30, -84, -26, -84, -0.25, -1.3],
    castUp: [0.0, -42, 12, 0, -12, 0, 12, -94, 6, -74, -0.45, -1.57],
    throwC: [-0.18, -41, 16, 0, -18, 0, -18, -68, 8, -58, -0.1, -2.6],
    throwP: [0.34, -38, 24, 0, -20, 0, 44, -60, 10, -54, 0, 0],
    cup: [-0.16, -40, 21, 0, -23, 0, -18, -52, -21, -48, 0, 2.6],
    push: [0.3, -39, 25, 0, -24, 0, 44, -62, 42, -56, 0, 0],
    crouchM: [0.42, -25, 26, 0, -24, 0, -10, -40, -16, -36, 0.15, 3.0],
    // moving and scenes
    dashLow: [0.5, -34, 20, 0, -28, -5, 30, -50, 0, -50, 0, 0.2],
    leap: [0.3, -50, 16, -20, -18, -12, 30, -70, 10, -70, 0, -0.9],
    tuck: [0.5, -50, 14, -30, -8, -26, 20, -56, 8, -54, 0.2, 0.6],          // (v2.5b) knees in, through a flip
    land: [0.22, -33, 21, 0, -21, 0, 24, -46, 4, -44, 0.05, 0.6],
    kneel: [0.44, -22, 20, 0, -18, -1, 24, -8, 6, -40, 0.3, 1.45],
    sit: [0.06, -24, 22, -2, 15, 0, 15, -36, 8, -34, 0.28, 1.3],
    shoulder: [0.04, -41, 12, 0, -14, 0, 14, -60, 2, -70, -0.05, 0.5],       // rolling one shoulder
    salute: [0.0, -42, 11, 0, -13, 0, 16, -60, 6, -76, -0.05, 0.6],          // two fingers to his brow
    plant: [0.2, -38, 18, 0, -18, 0, 24, -40, 12, -44, 0.1, 1.57],            // the sword planted point down
    reach: [-0.08, -42, 12, 0, -14, 0, 24, -92, 4, -56, -0.4, 0.8],           // a hand held out to the stones
    reel: [-0.34, -40, 10, 0, -22, 0, 0, -52, -14, -48, -0.3, 0.5],
    guardU: [0.12, -40, 14, 0, -14, 0, 16, -68, 10, -62, 0.12, 0.6],          // unarmed, forearms up
    roar: [-0.24, -44, 17, 0, -17, 0, 32, -94, -28, -92, -0.55, -1.3],
    beamC: [-0.1, -36, 26, 0, -26, 0, -16, -50, -20, -46, 0, 2.6],
    beam: [0.26, -36, 28, 0, -26, 0, 46, -58, 44, -52, 0, 0],
    offer: [0.12, -24, 21, 0, -17, -1, 38, -50, 6, -40, 0.12, -0.15],         // a hilt held out, hilt first
    mend: [0.4, -22, 20, 0, -18, -1, 14, -48, 6, -46, 0.4, 1.45],
  };
  // (v2.5c) the second stage of a wind-up: from halfway through it he coils further, to a peak (see cut())
  Object.assign(POSES, {
    upP: [-0.18, -44, 13, 0, -17, -3, 0, -90, -6, -76, -0.18, -2.6],     // up on his toes, the blade further back
    lowP: [0.26, -34, 21, 0, -19, 0, 8, -26, 0, -34, 0.1, 2.75],         // lower, the point near the floor behind
    thrustP: [0.0, -34, 16, 0, -26, 0, -16, -54, 2, -56, 0, 0],          // the point drawn right back
    sweepP: [-0.12, -37, 20, 0, -21, 0, -30, -50, -20, -52, 0, 3.3],    // the head swung out behind
    maulP: [-0.22, -44, 15, 0, -18, -3, -4, -96, -10, -92, -0.3, -2.2], // up on his toes, the head over his back
    riseP: [0.36, -28, 21, 0, -21, 0, 14, -22, 4, -26, 0.25, 3.0],      // down on one knee nearly, ready to spring
  });
  const PEAK = { upC: 'upP', lowC: 'lowP', thrustC: 'thrustP', sweepC: 'sweepP', maulUp: 'maulP', riseC: 'riseP' };
  // wind-ups are reached quicker than a relaxed pose, so each stage shows before the blow comes
  const WIND = { upC: 1, lowC: 1, thrustC: 1, sweepC: 1, maulUp: 1, riseC: 1, upP: 1, lowP: 1, thrustP: 1, sweepP: 1, maulP: 1, riseP: 1, breath: 1, throwC: 1, beamC: 1 };
  const SNAP = { cutDown: 1, cutUp: 1, thrust: 1, rise: 1, sweep: 1, smash: 1, drawn: 1, throwP: 1, push: 1, beam: 1, dashLow: 1 };
  function walkPose(t) {
    const s = Math.sin(t), c = Math.cos(t), w = B.body.wpn;
    // (the hips ride highest as the legs pass, lowest as they reach: v2.5b, it was the other way round)
    return [0.12, -40.5 - Math.abs(c) * 1.8, 13 + s * 14, -Math.max(0, c) * 6, -13 - s * 15, -Math.max(0, -c) * 6, 19 + c * 3, -56, 6 - c * 3, -55, 0, w === 'maul' ? -1.2 : 0.5];
  }

  // ------------------------------------------------------------------ the standing stones
  // A stone for every boss, in a half ring behind him. Those beaten this run light in phase II.
  const STONE_X = [150, 320, 476, 640, 804, 960, 1130];
  const STONE_H = [76, 86, 94, 100, 94, 86, 76]; // (low enough that the ledges stand clear over them)
  const runBeaten = () => (G.run.beaten || []).filter((id) => id !== 'champion' && G.bosses[id]);

  // ------------------------------------------------------------------ helpers
  const clampX = (x) => G.clamp(x, WL + 40, WR - 40);
  const facePlayer = () => { const b = B.body; if (Math.abs(G.player.x - b.x) > 8) b.face = G.player.x > b.x ? 1 : -1; };
  const faceNow = () => { const b = B.body; b.tqf = b.face; b.tqP = 1; };
  const towards = () => G.sign(G.player.x - B.body.x) || B.body.face;

  // The rack: whichever weapon glows is the tell. take(w) lights it, he reaches back and draws it.
  // From phase II now and then a second, dimmer glow comes with it: a feint. The brighter is real.
  function light(w, k) { B.rackT[w] = k; if (k >= 0.9) AU.play('chGlow', { n: WPN.indexOf(w) }); }
  function dark() { for (const w of WPN) B.rackT[w] = 0; }
  function* take(w, o) {
    o = o || {};
    const b = B.body, T = K.T();
    const tell = (o.quick ? 0.2 : [0, 0.42, 0.34, 0.28][B.phase]) * T;
    // a feint: a second weapon lights dimmer with it
    let feint = null;
    if (!o.noFeint && B.phase >= 2 && K.chance(B.phase === 3 ? 0.4 : 0.28, 'feint')) {
      feint = G.pick(WPN.filter((x) => x !== w));
      B.feinted = true; B.feintT = 1.6; B.hits0 = G.player.stats.hits;
    }
    dark();
    light(w, 1);
    if (feint) { B.rackT[feint] = 0.42; AU.play('chGlow', { n: WPN.indexOf(feint), vol: 0.5 }); }
    // the body reaches back for it (unless it is in hand already)
    if (b.wpn !== w) {
      yield* wait(tell * 0.55);
      if (feint) B.rackT[feint] = 0;
      b.pose = 'shoulder';
      yield* wait(tell * 0.45);
      b.wpn = w; b.marks = 0; b.pull = 0;
      G.audio.play('whoosh');
      const rp = rackPoint(w);
      if (rp) G.fx.burst(rp.x, rp.y, { n: 6, color: heroOf(w).col, speed: [40, 160], life: [0.2, 0.4], kind: 'spark', size: [1.5, 2.5] });
    } else {
      yield* wait(tell);
      if (feint) B.rackT[feint] = 0;
    }
    B.rackT[w] = 0;
  }
  // where a weapon on his rack is, in the world (for its glow and for the dark)
  function rackPoint(w) { const q = B.body.rack && B.body.rack[w]; return q || null; }

  // One swing of whatever is in his hand. It is read from his body and the rack, never from a mark.
  function cut(o) {
    const b = B.body, f = b.face, m = (a) => (f > 0 ? a : Math.PI - a);
    const ay = o.y || -50;
    return H.arc({
      x: b.x + f * 6, y: b.y + ay, r: o.r || 112, a0: m(o.a0), a1: m(o.a1),
      tele: o.tele, active: o.active || 0.1, fade: 0.14, owner: b, dmg: o.dmg || 1, heavy: !!o.heavy,
      tint: o.tint || (b.wpn ? tintOf(b.wpn) : { boss: GOLD, hot: '255,248,230' }),
      follow(h) {
        if (h.fired) return;
        h.x = b.x + b.face * 6; h.y = b.y + ay;
        // (v2.5c) halfway through the wind-up he coils on to its peak
        if (h.t >= h.tele * 0.5 && PEAK[b.pose]) b.pose = PEAK[b.pose];
        // (v2.5b: the blade starts down a few frames early, so it sweeps with the drawn cut, not after it)
        if (h.t >= h.tele - 0.05 && o.pose) { b.fast = true; b.pose = o.pose; }
      },
      onFire() {
        b.fast = true; b.pose = o.pose;
        G.audio.play(o.heavy || b.wpn === 'maul' ? 'slash3' : 'slash');
        G.fx.kick(f * (o.heavy ? 2.6 : 1.4), o.heavy ? 1.2 : 0);
        if (o.onFire) o.onFire();
      },
    });
  }
  function* stepIn(dur, dist) {
    const b = B.body, x0 = b.x, x1 = clampX(b.x + b.face * dist);
    let e = 0;
    while (e < dur) { const dt = yield; e += dt; b.x = G.lerp(x0, x1, E.outQuad(Math.min(1, e / dur))); }
  }
  // a hero's dash: low, fast, a streak of afterimages
  function* dashTo(x, speed) {
    const b = B.body;
    x = clampX(x);
    const dir = G.sign(x - b.x) || b.face;
    b.face = dir; b.pose = 'dashLow'; b.fast = true;
    G.audio.play('dash');
    G.fx.dust(b.x - dir * 8, FLOOR, 4, { dir: -dir, speed: [60, 260], size: [5, 10], up: 30 });
    const x0 = b.x, dur = Math.max(0.08, Math.abs(x - x0) / speed);
    let e = 0, gt = 0;
    while (e < dur) {
      const dt = yield; e += dt; gt -= dt;
      b.x = G.lerp(x0, x, E.outQuad(Math.min(1, e / dur)));
      if (gt <= 0) { gt = 0.04; afterimage(0.22); }
    }
    b.fast = false;
  }
  function* hopBack(dist, hgt) {
    const b = B.body, x0 = b.x, x1 = clampX(b.x - b.face * dist), dur = 0.3 + dist / 1400;
    // (v2.5b) a dip before he goes, and a long leap back is a back flip
    b.pose = 'land';
    yield* wait(0.06);
    const flip = Math.abs(x1 - x0) >= 140 && (hgt || 46) >= 60;
    b.pose = 'leap'; b.air = true; G.audio.play('jump');
    G.fx.dust(b.x, FLOOR, 2, { dir: b.face, speed: [40, 140], size: [4, 8], up: 18 });
    let e = 0;
    while (e < dur) {
      const dt = yield; e += dt; const k = Math.min(1, e / dur);
      b.x = G.lerp(x0, x1, E.outQuad(k)); b.y = FLOOR - (hgt || 46) * Math.sin(Math.PI * k);
      if (flip) { b.rot = -G.TAU * E.inOutQuad(Math.min(1, k * 1.15)); b.pose = k > 0.12 && k < 0.8 ? 'tuck' : 'leap'; if (Math.random() < dt * 30) afterimage(0.16); }
    }
    b.rot = 0;
    b.y = FLOOR; b.air = false; b.pose = 'land';
    G.fx.dust(b.x, FLOOR, 3, { speed: [30, 130], size: [5, 9], up: 24 });
    G.audio.play('land');
  }
  function afterimage(life, shade) {
    const b = B.body;
    B.ghosts.push({ x: b.x, y: b.y, face: b.face, p: b.p.slice(), wpn: b.wpn, t: 0, life: life || 0.3, marks: b.marks, pull: b.pull, shade: !!shade, corruptK: b.corruptK, rot: b.rot || 0, rigQ: snapQ(b.rigQ) });
  }
  // the hero went through to his back
  const behindNow = () => (G.player.x - B.body.x) * B.body.face < -10;
  // a quick glow at a stone: it is that boss's move coming
  function flareStone(id) {
    const s = B.stones.find((q) => q.id === id);
    if (!s) return;
    s.flare = 1;
    AU.play('chStone', { k: B.stones.indexOf(s) });
  }

  // ------------------------------------------------------------------ state
  B.silWide = true; // (v2.9j, corrupt.js: if ever corrupted, his weapons and echoes reach far)
  B.setup = function () {
    const b = B.body;
    Object.assign(b, {
      x: 880, y: FLOOR, face: 1, pose: 'sit', p: POSES.sit.slice(), pv: new Array(NP).fill(0), walkT: 0, stepN: 0,
      fast: false, air: false, hurt: false, wpn: null, marks: 0, pull: 0, corruptK: 0, fade: 1, hood: 1, smile: 0,
      offerW: null, charge: 0, rack: {}, hand: { x: 0, y: 0 }, eye: { x: 0, y: 0 }, unwrapped: false, sitting: 1,
      rig: D.rig(), rigQ: null, rigL: null, // (v2.5c: the drawn springs, see living)
    });
    B.cloak = [0, 1, 2].map(() => D.chain(7, b.x, b.y - 70));
    B.rackK = { sword: 0, maul: 0, bow: 0, blade: 0 }; B.rackT = { sword: 0, maul: 0, bow: 0, blade: 0 };
    B.ghosts = []; B.bolts = []; B.boltT = 0; B.shades = [];
    B.darkK = 0; B.voidK = 0; B.crackK = 0; B.reveal = 0; B.loose = null; B.guardOn = false; B.guardHit = false;
    B.mending = false; B.mended = {}; B.strings = 0; B.feinted = false; B.feintT = 0; B.hits0 = 0; B.feintHit = false; B.cutLine = null; B.flashIn = null; b.dual = false; b.orb = 0; b.twang = 0; b.aim = 0; B.bd = null; B.vig = null; B.threads = []; B.trail = []; b.rot = 0;
    B.beaten = runBeaten();
    B.stones = G.BOSS_IDS.map((id, i) => ({ id, x: STONE_X[i % STONE_X.length], h: STONE_H[i % STONE_H.length], lit: 0, flare: 0, on: false }));
    // the bags: the duel, then the duel and a move for each boss beaten this run
    const tro = B.beaten.filter((id) => TROPHY[id]).map((id) => 't_' + id);
    B.bags = {
      1: ['string', 'string', 'string', 'maul', 'maul', 'bow', 'draw', 'guard'],
      2: ['string', 'chain', 'chain', 'maul', 'bow', 'draw', 'guard'].concat(tro),
      3: ['fourfold', 'chain', 'chain', 'string', 'maul', 'draw', 'bow', 'guard'].concat(tro),
    };
    // phase II opens with the move of the boss beaten last
    B.first[2] = tro.length ? tro[tro.length - 1] : 'chain';
  };
  B.onRelease = function () {
    const b = B.body;
    b.hurt = false; b.fast = false; b.air = false; b.hidden = false; b.charge = 0; b.set = 0;
    B.guardOn = false; B.guardHit = false; B.mending = false;
    if (b.wpn === 'bow') b.pull = 0;
    if (b.wpn === 'blade') b.marks = 0;
    G.fx.cine.to = 0;
  };
  B.onInterrupt = function () {
    const P = G.player;
    if (P.grabbed) { P.grabbed = null; P.vy = -200; }
    B.bd = null; B.guardOn = false; B.mending = false; B.body.rot = 0; B.body.kx = 0;
    for (const s of B.shades) s.dead = true;
    dark();
    G.fx.cine.to = 0;
  };
  // the stagger: the weapon in his hand is knocked away and sticks in the floor; he goes after it
  B.onStagger = function () {
    const b = B.body, P = G.player;
    b.air = false; b.hurt = false; b.charge = 0; b.marks = 0; b.pull = 0; b.y = FLOOR;
    B.guardOn = false; B.mending = false; dark();
    if (B.dying) return;
    const w = b.wpn || 'sword', d = -(G.sign(P.x - b.x) || b.face);
    const tx = clampX(b.x + d * G.rand(200, 300));
    B.loose = { w, x: b.x, y: b.y - 60, tx, vy: -520, t: 0, stuck: false, spin: 0 };
    b.wpn = null; b.pose = 'reel';
  };
  B.staggerIn = function* () {
    const b = B.body;
    if (B.dying) {
      // at nothing: down on one knee, and he stays there
      b.wpn = b.wpn || 'sword';
      b.pose = 'kneel'; b.fast = true;
      G.audio.play('boom'); G.fx.shake(10);
      G.fx.dust(b.x, FLOOR, 6, { speed: [30, 160], size: [6, 12], up: 40 });
      yield* wait(0.3);
      b.fast = false;
      return;
    }
    b.pose = 'reel'; b.fast = true;
    G.fx.dust(b.x, FLOOR, 4, { speed: [30, 140], size: [5, 10], up: 30 });
    yield* wait(0.3);
    b.fast = false; b.pose = 'guardU';
  };
  B.staggerOut = function* () {
    const b = B.body, L = B.loose;
    if (L) {
      if (Math.abs(L.x - b.x) < 40 && L.stuck) {
        b.pose = 'kneel'; yield* wait(0.18);
      } else {
        // not reached: he calls it back to his hand, a moment late
        yield* wait(0.3);
        const x0 = L.x, y0 = L.y;
        let e = 0;
        while (e < 0.22) { const dt = yield; e += dt; const k = Math.min(1, e / 0.22); L.x = G.lerp(x0, b.x, k); L.y = G.lerp(y0, b.y - 50, k); L.spin += dt * 30; }
      }
      b.wpn = L.w; B.loose = null;
      G.audio.play('whoosh');
    }
    b.pose = 'idle';
  };
  B.onRecover = function () { B.body.pose = 'land'; };
  // a clash (player.js) fills a fifth of his bar
  B.onClash = function () { if (!B.staggered) B.poise = Math.min(B.poiseMax - 1, B.poise + B.poiseMax * 0.2); };
  B.onHit = function (dmg) {
    const P = G.player;
    // a blow while he mends breaks it, and him
    if (B.mending) { B.mending = false; B.poise = B.poiseMax; G.ui.callout('BROKEN'); }
    // blows from behind count more towards opening him
    else if (!B.staggered && behindNow()) B.poise += dmg * 0.6;
    if (P) { /* (nothing else) */ }
  };
  // the guard: all four dark, he waits; a blow that lands on his front is turned
  B.blocked = function (t, info) {
    const P = G.player, b = B.body;
    if (!B.guardOn || P.ulting || t.kind !== 'body' || B.staggered || B.dying) return false;
    if ((P.x - b.x) * b.face < -6) return false; // from behind, it lands
    B.guardOn = false; B.guardHit = true;
    const cx = (P.x + b.x) / 2, cy = b.y - 52;
    AU.play('chParry'); G.fx.stop(0.1); G.fx.shake(7);
    G.fx.glint(cx, cy, 60, '255,240,210', 0.3);
    G.fx.ring(cx, cy, { r0: 8, r1: 110, life: 0.25, color: GOLD, width: 5 });
    G.fx.burst(cx, cy, { n: 14, color: '255,236,200', speed: [200, 700], life: [0.12, 0.35], kind: 'spark', size: [1.5, 3], grav: 400 });
    P.vx = (G.sign(P.x - b.x) || 1) * 260; P.atk = null;
    return true;
  };
  B.vuln = () => (B.loose ? 1.15 : 1); // disarmed, he takes a little more
  B.dying0 = function () {
    const b = B.body;
    b.hurt = false; b.charge = 0; b.marks = 0; b.pull = 0; b.rot = 0; b.kx = 0; B.guardOn = false; B.mending = false; B.bd = null; dark();
    for (const s of B.shades) s.dead = true;
  };
  B.choose = function () {
    // he mends, once in each of the first two phases, below half of that phase's health
    const ph = B.phase;
    if (ph <= 2 && !B.mended[ph]) {
      const top = ph === 1 ? B.maxHp : B.maxHp * 2 / 3, floor = ph === 1 ? B.maxHp * 2 / 3 : B.maxHp / 3;
      if (B.hp < (top + floor) / 2 && Math.abs(G.player.x - B.body.x) > 220) { B.mended[ph] = true; return 'mend'; }
    }
    // below a quarter in the dark he stops guarding
    if (ph === 3 && B.lastAtk !== 'guard' && B.bag.length && B.bag[B.bag.length - 1] === 'guard' && B.hp < B.maxHp * 0.25) B.bag.pop();
    return '';
  };
  B.kiting = (P, b) => Math.abs(P.x - b.x) > 360 || (!P.onGround && P.y < FLOOR - 140 && Math.abs(P.x - b.x) > 160);

  // ------------------------------------------------------------------ phase I: the duel
  // The Starblade string: a falling cut, a rising cut on its weight, then the finisher (his shoulders
  // drop with a breath out first) or, if you backed off, a dash and a long thrust. From his third string
  // on the finisher comes a beat late, so a dash thrown on the old rhythm goes early. o.then: what ends
  // the string instead (phase II's switches).
  function* atkString(o) {
    o = o || {};
    const b = B.body, P = G.player, T = K.T() * SP();
    yield* take('sword', { quick: o.quick });
    B.strings++;
    facePlayer();
    if (Math.abs(P.x - b.x) > 130) yield* dashTo(P.x - towards() * 92, B.phase === 1 ? 1050 : 1250);
    facePlayer();
    b.pose = 'upC';
    cut({ a0: -1.3, a1: 0.8, r: 116, tele: 0.3 * T, pose: 'cutDown' });
    yield* stepIn(0.3 * T, 14);
    yield* wait(0.08);
    if (P.dead) return;
    facePlayer();
    b.pose = 'lowC';
    cut({ a0: 0.75, a1: -1.35, r: 112, tele: 0.22 * T, pose: 'cutUp' });
    yield* stepIn(0.22 * T, 10);
    yield* wait(0.06);
    if (P.dead) return;
    if (o.then) { yield* o.then(); return; }
    if (Math.abs(P.x - b.x) > 160 && K.chance(0.85, 'thrust')) { yield* thrust(false); return; }
    facePlayer();
    b.pose = 'breath'; G.audio.play('kBreath');
    yield* wait((B.strings >= 3 ? 0.28 : 0.12) * T);
    b.pose = 'upC';
    cut({ a0: -1.6, a1: 0.95, r: 138, tele: 0.36 * T, pose: 'cutDown', onFire() { G.fx.dust(b.x + b.face * 60, FLOOR, 3, { speed: [40, 180], size: [5, 10], up: 20 }); G.fx.shake(4); } });
    yield* stepIn(0.36 * T, 22);
    yield* wait(0.12);
    yield* hopBack(90, 30);
  }
  // the thrust out of a dash: a glint at the point, then straight through (far: across the arena)
  function* thrust(far) {
    const b = B.body, P = G.player, T = K.T() * SP();
    facePlayer();
    b.pose = 'thrustC'; b.set = 1;
    yield* wait(0.12 * T);
    G.fx.glint(b.x + b.face * 30, b.y - 54, 30, heroOf('sword').hot, 0.25); G.audio.play('glint');
    b.pose = 'thrustP'; // (v2.5c) with the glint the point goes right back: the coil before the spring
    { // (v2.6f, Gentle only) where the thrust will carry him, as it stands at the glint
      const gp = Math.abs(P.x - b.x), lx = clampX(b.x + b.face * (far ? Math.min(900, gp + 140) : Math.min(B.phase === 1 ? 380 : 430, gp + (B.phase === 1 ? 70 : 110))));
      K.gentleLane(b.x, lx, (far ? 0.4 : 0.36) * T + 0.1, { h: 90, tint: heroOf('sword') });
    }
    yield* wait((far ? 0.4 : 0.36) * T);
    b.set = 0;
    const dir = b.face, gap = Math.abs(P.x - b.x);
    const x1 = clampX(b.x + dir * (far ? Math.min(900, gap + 140) : Math.min(B.phase === 1 ? 380 : 430, gap + (B.phase === 1 ? 70 : 110))));
    b.pose = 'thrust'; b.fast = true; b.hurt = true;
    G.audio.play('dash'); G.audio.play('slash');
    const x0 = b.x, dur = Math.max(0.05, Math.abs(x1 - x0) / 1700);
    let e = 0, gt = 0;
    while (e < dur) { const dt = yield; e += dt; gt -= dt; b.x = G.lerp(x0, x1, Math.min(1, e / dur)); if (gt <= 0) { gt = 0.03; afterimage(0.25); } }
    b.hurt = false; b.fast = false;
    G.fx.dust(b.x, FLOOR, 4, { dir: -dir, speed: [60, 240], size: [5, 10], up: 20 });
    b.pose = 'land'; b.exposed = true;
    yield* wait(0.38 * PW());
    b.exposed = false;
  }

  // The Starmaul: a wide sweep, then the smash, which cracks the floor. Held overhead longer, light
  // gathering in its head, the smash also throws a wave along the floor. Open for a second after.
  function* atkMaul(o) {
    o = o || {};
    const b = B.body, P = G.player, T = K.T() * SP();
    if (!o.noTake) yield* take('maul', { quick: o.quick });
    facePlayer();
    if (!o.smashOnly) {
      if (Math.abs(P.x - b.x) > 150) yield* dashTo(P.x - towards() * 120, 900);
      facePlayer();
      b.pose = 'sweepC'; G.audio.play('heave');
      cut({ a0: -0.55, a1: 1.0, r: 152, y: -44, tele: 0.4 * T, pose: 'sweep' });
      yield* stepIn(0.4 * T, 16);
      yield* wait(0.12);
      if (P.dead) return;
    }
    facePlayer();
    const charged = o.charged != null ? o.charged : K.chance(B.phase === 1 ? 0.3 : 0.5, 'charged');
    b.pose = 'maulUp';
    const tele = (0.48 + (charged ? 0.5 : 0)) * T;
    if (charged) G.audio.play('charge', { dur: tele });
    cut({ a0: -2.0, a1: 0.45, r: 158, y: -46, tele, heavy: true, pose: 'smash', onFire() {
      const x = b.x + b.face * 96;
      K.impact(x, charged, heroOf('maul').col);
      if (charged) H.shockwave(x, b.face, 760, 54, tintOf('maul'));
    } });
    let e = 0;
    while (e < tele) {
      const dt = yield; e += dt;
      if (charged) {
        b.charge = Math.min(1, e / tele);
        // (v2.5c) the weight of it held up there: he trembles under it, more as it fills
        b.kx = Math.sin(G.t * 70) * 1.4 * b.charge;
      }
    }
    b.charge = 0; b.kx = 0;
    yield* wait(0.1);
    b.exposed = true;
    yield* wait(1.0 * PW());
    b.exposed = false;
  }

  // The Moonbow: he leaps back and lands heavily, then a fan of arrows, or one that pierces, aimed down
  // a line that follows you and then holds.
  function* atkBow(o) {
    o = o || {};
    const b = B.body, P = G.player, T = K.T() * SP();
    if (!o.noTake) yield* take('bow', { quick: o.quick });
    facePlayer();
    if (!o.noLeap && Math.abs(P.x - b.x) < 420) {
      const room = b.face > 0 ? b.x - WL : WR - b.x;
      yield* hopBack(G.clamp(room - 90, 40, 240), 70);
      b.exposed = true; yield* wait(0.32 * PW()); b.exposed = false;
    }
    facePlayer();
    b.pose = 'bow';
    const fan = o.fan != null ? o.fan : K.chance(0.55, 'fan');
    const hx = () => b.x + b.face * 34, hy = () => b.y - 62;
    if (fan) {
      const tele = 0.5 * T;
      let e = 0;
      while (e < tele) { const dt = yield; e += dt; b.pull = Math.min(1, e / tele); facePlayer(); b.aim = Math.atan2(P.y - 30 - hy(), Math.abs(P.x - hx())); }
      const a0 = Math.atan2(P.y - 30 - hy(), P.x - hx()), n = B.phase === 3 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * 0.17;
        H.orb(hx(), hy(), Math.cos(a) * 760, Math.sin(a) * 760, { r: 9, blade: true, tint: tintOf('bow'), life: 2.4 });
      }
      G.audio.play('arrow');
    } else {
      const tele = 0.8 * T, aim = K.aim(hx(), hy(), tele, 0.2);
      let e = 0;
      while (e < tele) { const dt = yield; e += dt; b.pull = Math.min(1, e / tele); aim.ox = hx(); aim.oy = hy(); facePlayer(); b.aim = Math.atan2(Math.sin(aim.ang), Math.abs(Math.cos(aim.ang))); }
      H.orb(hx(), hy(), Math.cos(aim.ang) * 1350, Math.sin(aim.ang) * 1350, { r: 13, blade: true, tint: tintOf('bow'), life: 2, slashable: false });
      G.audio.play('arrowHeavy'); G.fx.shake(4);
    }
    b.pull = 0; b.twang = 1;
    yield* wait(0.3);
    b.aim = 0;
  }

  // The sheathed blade: he crouches and the sheath lights one, two or three marks, then he draws through
  // to the far side of you. One mark is short and quick; three crosses half the arena, and he ends with
  // his back to you while the blade goes home.
  function* atkDraw(o) {
    o = o || {};
    const b = B.body, P = G.player, T = K.T() * SP();
    if (!o.noTake) yield* take('blade', { quick: o.quick });
    facePlayer();
    if (Math.abs(P.x - b.x) > 520) yield* dashTo(P.x - towards() * 380, 1000);
    facePlayer();
    b.pose = 'crouch'; b.marks = 0;
    const n = o.marks || (B.phase === 1 ? 1 + ((G.rng() * 3) | 0) : B.phase === 2 ? 2 + (G.rng() < 0.5 ? 1 : 0) : (K.hard() ? 3 : 2 + (G.rng() < 0.6 ? 1 : 0)));
    for (let i = 0; i < n; i++) {
      yield* wait(0.3 * T);
      b.marks = i + 1;
      AU.play('chGlow', { n: 3, vol: 0.6 + 0.2 * i });
      G.audio.play('focus');
      G.fx.glint(b.x - b.face * 6, b.y - 30, 16 + 8 * i, i === 2 ? '255,214,140' : heroOf('blade').hot, 0.22);
      if (i === 2) G.fx.shake(2);
      facePlayer();
    }
    // the hand closes on the hilt: a glint at the sheath's mouth, and then it comes
    b.set = n; G.audio.play('glint');
    G.fx.glint(b.x + b.face * 4, b.y - 36, 26, '255,248,230', 0.2);
    K.gentleLane(b.x, clampX(b.x + b.face * ([0, 210, 330, 500][n] || 210)), (B.phase === 1 ? 0.36 : 0.3) * T + 0.1, { h: 90, tint: heroOf('blade') }); // (v2.6f, Gentle only)
    yield* wait((B.phase === 1 ? 0.36 : 0.3) * T);
    b.set = 0;
    yield* drawThrough(n);
  }
  function* drawThrough(n) {
    const b = B.body;
    const dir = b.face, dist = [0, 210, 330, 500][n] || 210;
    const x0 = b.x, x1 = clampX(b.x + dir * dist);
    b.wpn = 'blade'; b.pose = 'drawn'; b.fast = true; b.hurt = true; b.marks = 0; b.set = 0;
    G.audio.play('iai'); G.audio.play('dash');
    G.fx.lines(b.x, b.y - 40, 8, heroOf('blade').hot, { r0: 20, speed: [500, 900] });
    const dur = Math.max(0.06, Math.abs(x1 - x0) / 2600);
    let e = 0, gt = 0;
    while (e < dur) { const dt = yield; e += dt; gt -= dt; b.x = G.lerp(x0, x1, Math.min(1, e / dur)); if (gt <= 0) { gt = 0.02; afterimage(0.3); } }
    b.hurt = false;
    B.cutLine = { x0, x1, y: b.y - 40, t: 0, n };
    G.fx.shake(3 + 2 * n);
    if (n >= 3) {
      b.pose = 'noto'; b.exposed = true;
      yield* wait(0.8 * PW());
      b.exposed = false;
    } else { b.pose = 'land'; yield* wait(0.25); }
    G.audio.play('sheath');
    b.fast = false;
  }

  // The guard: all four weapons dark, standing, waiting. Strike his front and it is turned into a
  // counter-cut (in the dark, a draw). Wait it out, or bait it with a jump.
  function* atkGuard() {
    const b = B.body;
    dark();
    facePlayer();
    b.pose = 'guard';
    B.guardOn = true; B.guardHit = false;
    const hold = B.phase === 3 ? 0.8 : 1.0;
    let e = 0;
    while (e < hold && !B.guardHit) { const dt = yield; e += dt; facePlayer(); }
    B.guardOn = false;
    if (!B.guardHit) { b.pose = 'idle'; yield* wait(0.15); return; }
    facePlayer();
    if (B.phase === 3) { b.pose = 'crouch'; b.marks = 1; yield* wait(0.12); yield* drawThrough(1); return; }
    if (b.wpn !== 'maul') b.wpn = 'sword';
    b.pose = 'lowC';
    cut({ a0: 0.6, a1: -1.2, r: 124, tele: 0.15, pose: 'cutUp' });
    yield* stepIn(0.15, 18);
    yield* wait(0.22);
  }

  // He mends, once in each of the first two phases, kneeling while light gathers. Hit him and it is
  // lost, and he is thrown open (B.onHit).
  function* atkMend() {
    const b = B.body;
    dark();
    b.pose = 'mend'; B.mending = true;
    G.audio.play('healStart');
    let e = 0;
    while (e < 1.5 && B.mending) {
      const dt = yield; e += dt;
      if (Math.random() < dt * 30) {
        const a = G.rand(0, G.TAU), r = G.rand(40, 80);
        G.fx.spawn({ x: b.x + Math.cos(a) * r, y: b.y - 40 + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.4, vy: -Math.sin(a) * r * 2.4, life: 0.36, size: 3, color: GOLD });
      }
    }
    if (!B.mending) return;
    B.mending = false;
    const ceil = B.phase === 1 ? B.maxHp : Math.floor(B.maxHp * 2 / 3);
    B.hp = Math.min(ceil, B.hp + Math.round(B.maxHp * 0.06));
    G.audio.play('heal');
    G.fx.ring(b.x, b.y - 40, { r0: 10, r1: 100, life: 0.45, color: GOLD, width: 6 });
    b.pose = 'idle';
    yield* wait(0.2);
  }

  // The answers. You on him or over him: a rising cut up through where you are. You keeping away:
  // the dash-thrust from across the arena, or the bow if you are up high.
  function* atkRise() {
    const b = B.body, P = G.player, T = K.T();
    if (b.wpn !== 'sword') yield* take('sword', { quick: true, noFeint: true });
    const tx = clampX(P.x);
    if (Math.abs(tx - b.x) > 30) { b.pose = 'dashLow'; yield* tween(b, { x: tx }, 0.14, E.outQuad); }
    facePlayer();
    b.pose = 'riseC';
    cut({ a0: 0.4, a1: -2.3, r: 190, y: -40, tele: 0.3 * T, pose: 'rise', onFire() { G.fx.lines(b.x, b.y - 120, 8, heroOf('sword').hot, { r0: 20, speed: [500, 900] }); } });
    yield* wait(0.3 * T);
    // (v2.5b) the cut carries him up off the floor with it, and he drops back down
    b.air = true;
    G.fx.dust(b.x, FLOOR, 3, { speed: [60, 200], size: [5, 9], up: 30 });
    let e = 0;
    while (e < 0.4) { const dt = yield; e += dt; const k = Math.min(1, e / 0.4); b.y = FLOOR - 74 * Math.sin(Math.PI * Math.pow(k, 0.8)); }
    b.y = FLOOR; b.air = false; b.pose = 'land';
    G.fx.dust(b.x, FLOOR, 3, { speed: [30, 130], size: [5, 9], up: 20 }); G.audio.play('land');
  }
  function* atkLunge() {
    const P = G.player;
    if (!P.onGround && P.y < FLOOR - 140) { yield* atkBow({ noLeap: true, fan: false, quick: true }); return; }
    yield* take('sword', { quick: true, noFeint: true });
    yield* thrust(true);
  }

  // ------------------------------------------------------------------ phase II on: switches
  // The glow jumps mid-combo: two cuts of the sword, then the rack lights again and the string ends in
  // another weapon, the maul's smash or a quick one-mark draw.
  function* atkChain() {
    const end = K.chance(0.5, 'chainmaul') ? 'maul' : 'blade';
    yield* atkString({ then: function* () {
      const b = B.body, T = K.T() * SP();
      dark(); light(end, 1);
      yield* wait(0.24 * T);
      B.rackT[end] = 0;
      b.wpn = end; G.audio.play('whoosh');
      if (end === 'maul') yield* atkMaul({ noTake: true, smashOnly: true, charged: false });
      else { facePlayer(); b.pose = 'crouch'; b.marks = 1; AU.play('chGlow', { n: 3 }); yield* wait(0.22 * T); yield* drawThrough(1); }
    } });
  }
  // Phase III: the Four-Fold string, every weapon in one combo, the glow stepping along the rack a
  // beat before each: a sword cut, a maul smash, a point-blank arrow, a one-mark draw.
  function* atkFourfold() {
    const b = B.body, P = G.player, T = K.T() * SP();
    yield* take('sword', { quick: true, noFeint: true });
    facePlayer();
    if (Math.abs(P.x - b.x) > 130) yield* dashTo(P.x - towards() * 92, 1300);
    const step = function* (w) { dark(); light(w, 1); yield* wait(0.18 * T); B.rackT[w] = 0; b.wpn = w; G.audio.play('whoosh'); facePlayer(); };
    facePlayer();
    b.pose = 'upC';
    cut({ a0: -1.3, a1: 0.8, r: 116, tele: 0.26 * T, pose: 'cutDown' });
    yield* stepIn(0.26 * T, 14);
    yield* wait(0.05);
    if (P.dead) return;
    yield* step('maul');
    b.pose = 'maulUp';
    cut({ a0: -2.0, a1: 0.45, r: 150, y: -46, tele: 0.34 * T, heavy: true, pose: 'smash', onFire() { K.impact(b.x + b.face * 90, false, heroOf('maul').col); } });
    yield* wait(0.34 * T + 0.08);
    if (P.dead) return;
    yield* step('bow');
    b.pose = 'bow'; b.pull = 1;
    yield* wait(0.2 * T);
    {
      const hx = b.x + b.face * 34, hy = b.y - 62, a = Math.atan2(P.y - 30 - hy, P.x - hx);
      H.orb(hx, hy, Math.cos(a) * 1100, Math.sin(a) * 1100, { r: 11, blade: true, tint: tintOf('bow'), life: 1.5 });
      b.pull = 0; b.twang = 1; G.audio.play('arrow');
    }
    yield* hopBack(70, 30);
    if (P.dead) return;
    yield* step('blade');
    b.pose = 'crouch'; b.marks = 1; AU.play('chGlow', { n: 3 });
    yield* wait(0.2 * T);
    facePlayer();
    yield* drawThrough(Math.abs(P.x - b.x) > 260 ? 2 : 1);
    b.exposed = true; yield* wait(0.45 * PW()); b.exposed = false;
  }

  // ------------------------------------------------------------------ the trophies (phase II on)
  // One move borrowed from each boss beaten this run, cast in that boss's own colours. Its stone flares
  // behind him first, with that boss's bell, then his body shows which.
  const TT = () => K.T() * SP() * (B.phase === 3 ? 0.88 : 1);
  const TL = () => (B.phase === 3 ? 'over' : 'under'); // in the dark, warnings stay above the black
  const TROPHY = {
    // the Warden: two great hands of light close on you. Over them, or out from between them in time
    *warden() {
      const b = B.body, P = G.player, T = TT(), tint = bossTint('warden');
      flareStone('warden');
      b.pose = 'hands'; facePlayer();
      G.audio.play('charge', { dur: 0.9 * T });
      const n = B.phase === 3 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const c = clap(tint, 0.6 * T, 0.3 * T);
        while (!c.dead && !P.dead) yield;
        if (i < n - 1) yield* wait(0.15);
      }
      b.pose = 'push';
      yield* wait(0.35);
    },
    // the Magus: an arrow loosed straight up, and the sky answers it where you stand, three times
    *mage() {
      const b = B.body, P = G.player, T = TT(), tint = bossTint('mage');
      flareStone('mage');
      if (b.wpn !== 'bow') { b.wpn = 'bow'; G.audio.play('whoosh'); }
      b.pose = 'bowUp'; b.pull = 0;
      let e = 0;
      while (e < 0.4 * T) { const dt = yield; e += dt; b.pull = Math.min(1, e / (0.4 * T)); }
      b.pull = 0; b.twang = 1; G.audio.play('arrow');
      G.fx.spawn({ kind: 'spark', x: b.x + b.face * 8, y: b.y - 96, vx: 0, vy: -1800, life: 0.4, size: 3, color: tint.hot, len: 0.1 });
      const n = B.phase === 3 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const z = H.zone({ x: P.x - 45, y: -60, w: 90, h: FLOOR + 60, tele: (i ? 0.7 : 1.0) * T, active: 0.3, tint, layer: TL(), onFire() { G.audio.play('frost'); G.fx.shake(6); } });
        let f = 0;
        while (f < 0.5 * z.tele && !P.dead) { const dt = yield; f += dt; z.x = G.lerp(z.x, P.x - 45, Math.min(1, dt * 7)); }
        b.pose = i % 2 ? 'bowUp' : 'bow';
        yield* wait(0.3 * T);
      }
      yield* wait(0.5 * T);
    },
    // the Veil: shades of him step out of the air around you and cut through, one after another
    *assassin() {
      const b = B.body, P = G.player, T = TT();
      flareStone('assassin');
      b.pose = 'crouch'; b.wpn = 'blade'; G.audio.play('blink');
      afterimage(0.5, true);
      const n = B.phase === 3 ? 4 : 3, list = [];
      for (let i = 0; i < n; i++) {
        const side = (i % 2 ? 1 : -1) * (G.sign(P.x - b.x) || 1);
        list.push(shadeAt(clampX(P.x + side * 320), -side, (0.55 + 0.32 * i) * T));
        yield* wait(0.12);
      }
      while (list.some((s) => !s.dead) && !P.dead) yield;
      b.pose = 'noto';
      yield* wait(0.3);
    },
    // the Knight: his sword hurled spinning along the floor into the wall, then called home
    *knight() {
      const b = B.body, P = G.player, T = TT(), tint = bossTint('knight');
      flareStone('knight');
      if (b.wpn !== 'sword') { b.wpn = 'sword'; G.audio.play('whoosh'); }
      facePlayer();
      b.pose = 'throwC';
      const dir = b.face, wall = dir > 0 ? WR - 30 : WL + 30;
      const l0 = Math.min(b.x, wall), w0 = Math.abs(wall - b.x);
      H.lane({ x: l0, y: FLOOR - 74, w: w0, h: 60, dur: 0.55 * T, dir });
      yield* wait(0.55 * T);
      b.pose = 'throwP'; b.wpn = null; G.audio.play('heave');
      const blade = hurled(dir, wall, tint);
      while (blade.state === 'out' && !P.dead) yield;
      yield* wait(0.5 * T);
      b.pose = 'reach';
      H.lane({ x: l0, y: FLOOR - 74, w: w0, h: 60, dur: 0.45 * T, dir: -dir });
      yield* wait(0.45 * T);
      blade.state = 'back'; G.audio.play('streak');
      while (!blade.dead && !P.dead) yield;
      blade.dead = true;
      b.wpn = 'sword'; b.pose = 'land'; G.audio.play('whoosh');
      yield* wait(0.25);
    },
    // the Wolf: low on all fours, then the pounce, and the ground burns where he lands
    *wolf() {
      const b = B.body, P = G.player, T = TT(), tint = bossTint('wolf');
      flareStone('wolf');
      G.audio.play('howl');
      facePlayer();
      b.pose = 'crouchM';
      yield* wait(0.5 * T);
      const tx = clampX(P.x), x0 = b.x, dur = 0.5;
      b.pose = 'leap'; b.air = true; b.hurt = true; b.fast = true; G.audio.play('jump');
      let e = 0;
      while (e < dur) { const dt = yield; e += dt; const k = Math.min(1, e / dur); b.x = G.lerp(x0, tx, k); b.y = FLOOR - 180 * Math.sin(Math.PI * k); if (Math.random() < dt * 40) afterimage(0.2); }
      b.x = tx; b.y = FLOOR; b.air = false; b.hurt = false; b.fast = false; b.pose = 'smash';
      K.impact(tx, true, tint.boss);
      K.crush(tx, FLOOR - 40, 115, 42);
      for (const d of [-1, 1]) H.pool({ x: clampX(tx + d * 150), w: 130, tele: 0.45, active: 2.4, tint, layer: TL() });
      b.exposed = true; yield* wait(0.6 * PW()); b.exposed = false;
    },
    // the Leviathan: the maul driven into the floor, and the deep answers in spouts where you run
    *leviathan() {
      const b = B.body, P = G.player, T = TT(), tint = bossTint('leviathan');
      flareStone('leviathan');
      if (b.wpn !== 'maul') { b.wpn = 'maul'; G.audio.play('whoosh'); }
      facePlayer();
      b.pose = 'maulUp';
      yield* wait(0.4 * T);
      b.pose = 'smash'; b.fast = true;
      K.impact(b.x + b.face * 60, false, tint.boss); G.audio.play('splash');
      const n = B.phase === 3 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        H.zone({ x: clampX(P.x) - 44, y: FLOOR - 380, w: 88, h: 380, tele: 0.62 * T, active: 0.35, tint, layer: TL(), onFire() { G.audio.play('spout'); } });
        yield* wait(0.32 * T);
      }
      b.fast = false;
      yield* wait(0.5 * T);
    },
    // Kairo: light cupped at the hip, then pushed out in a beam that tracks you and then holds
    *kairo() {
      const b = B.body, P = G.player, T = TT(), tint = bossTint('kairo');
      flareStone('kairo');
      facePlayer();
      b.pose = 'cup'; b.orb = 0;
      G.audio.play('charge', { dur: 0.9 * T });
      const hx = () => b.x + b.face * 30, hy = () => b.y - 50;
      const beam = H.beam({ ox: hx(), oy: hy(), ang: Math.atan2(P.y - 24 - hy(), P.x - hx()), width: 46, tele: 0.9 * T, lock: 0.35, active: 0.7, tint, layer: TL(),
        follow(h) { h.ox = hx(); h.oy = hy(); if (!h.locked) { facePlayer(); h.ang = Math.atan2(P.y - 24 - h.oy, P.x - h.ox); } } });
      while (!beam.fired && !beam.dead) { yield; b.orb = Math.min(1, beam.t / beam.tele); }
      b.orb = 0; b.pose = 'push'; b.fast = true;
      while (!beam.dead) yield;
      b.fast = false;
      yield* wait(0.2);
    },
  };

  // the Warden's hands: they hang either side of you and follow, hold still, then clap shut
  function clap(tint, follow, hold) {
    const P = G.player;
    return H.add({
      kind: 'clap', cx: P.x, gap: 240, follow, hold, layer: 'over', tint,
      update(dt) {
        if (this.t < follow) this.cx = G.lerp(this.cx, clampX(P.x), Math.min(1, dt * 8));
        const c = this.t - follow - hold;
        if (c >= 0) {
          if (!this.shut) { this.shut = true; }
          this.gap = G.lerp(240, 16, E.inQuad(Math.min(1, c / 0.16)));
          if (c >= 0.16 && !this.boomed) {
            this.boomed = true;
            G.audio.play('slam'); G.fx.shake(14); G.fx.stop(0.05);
            G.fx.ring(this.cx, FLOOR - 64, { r0: 20, r1: 220, life: 0.35, color: tint.hot, width: 8 });
            G.fx.burst(this.cx, FLOOR - 64, { n: 18, color: tint.boss, speed: [200, 700], life: [0.2, 0.5], kind: 'spark', size: [2, 4] });
          }
        }
        if (c > 0.45) this.dead = true;
        this.srcX = this.cx;
      },
      hits(Pl) {
        const c = this.t - this.follow - this.hold;
        if (c < 0 || c > 0.24 || Pl.y < FLOOR - 128) return false;
        const dx = Math.abs(Pl.x - this.cx);
        return dx < this.gap + 14;
      },
      danger() { const c = this.t - this.follow - this.hold; return c < 0.2 ? [this.cx, this.gap + 30, -c] : null; },
      draw(ctx) {
        const a = Math.min(1, this.t / 0.2), c = this.t - this.follow - this.hold, late = c > -0.2 && c < 0 ? 0.5 + 0.5 * Math.sin(this.t * 55) : 0;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const d of [-1, 1]) {
          const x = this.cx + d * this.gap, y = FLOOR - 64;
          D.glow(ctx, tint.boss, x, y, 80, 0.35 * a);
          ctx.fillStyle = G.rgba(tint.boss, 0.55 * a);
          ctx.beginPath(); ctx.ellipse(x, y, 22, 60, 0, 0, G.TAU); ctx.fill();
          ctx.fillStyle = G.rgba(tint.hot, (0.5 + 0.4 * late) * a);
          for (let f = 0; f < 4; f++) { ctx.beginPath(); ctx.ellipse(x - d * 14, y - 40 + f * 22, 12, 7, 0, 0, G.TAU); ctx.fill(); }
          ctx.strokeStyle = G.rgba(DANGER, (0.3 + 0.5 * late) * a); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x, y, 24, 62, 0, 0, G.TAU); ctx.stroke();
        }
        ctx.restore();
      },
    });
  }
  // one of the Veil's shades: it fades in beside you, locks, and cuts straight through along the floor
  function shadeAt(x, dir, delay) {
    const P = G.player;
    const s = H.add({
      kind: 'blade', state: 'wait', x, y: FLOOR - 40, dir, delay, a: 0, go: 0, layer: 'over',
      update(dt) {
        this.a = Math.min(1, this.t / 0.3);
        if (this.state === 'wait' && !this.warned && this.t >= this.delay - 0.3) { this.warned = true; G.audio.play('glint'); }
        if (this.state === 'wait' && this.t >= this.delay) {
          this.state = 'out'; G.audio.play('dash'); G.audio.play('slash');
          this.x1 = clampX(this.x + this.dir * 640);
        }
        if (this.state === 'out') {
          this.x += this.dir * 1500 * dt;
          if (Math.random() < dt * 60) B.ghosts.push({ x: this.x, y: FLOOR, face: this.dir, p: POSES.drawn.slice(), wpn: 'blade', t: 0, life: 0.2, shade: true, marks: 0, pull: 0 });
          if ((this.x - this.x1) * this.dir >= 0 || this.x < WL || this.x > WR) this.dead = true;
        }
        this.srcX = this.x - this.dir * 20;
      },
      hits(Pl) { return this.state === 'out' && G.rectsOverlap(Pl.box(), { cx: this.x, cy: FLOOR - 40, hw: 22, hh: 36 }); },
      draw(ctx) {
        const left = this.delay - this.t, late = left < 0.3 && left > 0 ? 0.5 + 0.5 * Math.sin(this.t * 55) : 0;
        drawFig(ctx, { x: this.x, y: FLOOR, face: this.dir, p: (this.state === 'out' ? POSES.drawn : POSES.crouch), wpn: 'blade', marks: 0, pull: 0 }, 0.75 * this.a, { shade: true });
        if (this.state === 'wait') {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          D.glow(ctx, VOID.boss, this.x + this.dir * 10, FLOOR - 70, 26 + 20 * late, 0.3 + 0.6 * late);
          ctx.restore();
        }
      },
    });
    return s;
  }
  // the Knight's sword in his hands: thrown, it sticks in the wall, then flies home (kind 'blade', as the Knight's)
  function hurled(dir, wall, tint) {
    const b = B.body;
    return H.add({
      kind: 'blade', x: b.x + dir * 50, y: FLOOR - 44, dir, speed: 1150, state: 'out', spin: 0, quiver: 0, layer: 'over',
      update(dt) {
        if (this.state === 'out') {
          this.x += this.dir * this.speed * dt; this.spin += this.dir * 26 * dt;
          if ((this.x - wall) * this.dir >= 0) {
            this.x = wall; this.state = 'stuck'; this.quiver = 1;
            G.audio.play('tink'); G.audio.play('boom'); G.fx.shake(9);
            G.fx.burst(this.x, this.y, { n: 14, color: tint.hot, speed: [120, 520], angle: this.dir > 0 ? Math.PI : 0, spread: 2.2, life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
          }
        } else if (this.state === 'stuck') this.quiver = Math.max(0, this.quiver - dt * 2);
        else {
          this.x -= this.dir * this.speed * 1.12 * dt; this.spin -= this.dir * 30 * dt;
          if ((this.x - b.x) * this.dir <= 30) this.dead = true;
        }
        this.srcX = this.x - (this.state === 'back' ? -this.dir : this.dir) * 30;
      },
      hits(Pl) { return this.state !== 'stuck' && G.rectsOverlap(Pl.box(), { cx: this.x, cy: this.y, hw: 34, hh: 22 }); },
      draw(ctx) {
        const ang = this.state === 'stuck' ? (this.dir > 0 ? 0 : Math.PI) + Math.sin(this.t * 60) * 0.06 * this.quiver : this.spin;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        if (this.state !== 'stuck') D.glow(ctx, tint.boss, this.x, this.y, 70, 0.5);
        ctx.restore();
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(ang);
        drawWeapon(ctx, 'sword', -34, 0, 0, 1.6, {});
        ctx.restore();
      },
    });
  }

  // ------------------------------------------------------------------ the Black Dawn (phase III, below 12%)
  // He leaps to the far side, every weapon on his back alight, and lets the seventh door's black go in
  // one beam. It reaches you and your light holds it. Three flashes run down it: press attack as each
  // meets the light. Two of three and his beam breaks and so does he; fewer and it goes through you.
  function* atkBlackDawn() {
    const b = B.body, P = G.player;
    B.guardOn = false;
    const far = P.x < 640 ? WR - 120 : WL + 120;
    if (Math.abs(far - b.x) > 40) {
      const x0 = b.x, dur = 0.5;
      b.pose = 'leap'; b.air = true; G.audio.play('jump');
      let e = 0;
      while (e < dur) { const dt = yield; e += dt; const k = Math.min(1, e / dur); b.x = G.lerp(x0, far, E.inOutQuad(k)); b.y = FLOOR - 160 * Math.sin(Math.PI * k); }
      b.x = far; b.y = FLOOR; b.air = false; b.pose = 'land'; G.audio.play('land'); G.fx.shake(8);
    }
    facePlayer(); faceNow();
    for (const w of WPN) B.rackT[w] = 1;
    AU.play('chGlow', { n: 0 }); AU.play('chGlow', { n: 2 });
    b.pose = 'beamC';
    G.fx.cine.x = b.x; G.fx.cine.y = b.y - 120; G.fx.cine.to = 1;
    AU.play('chGather', { dur: 1.5 });
    G.audio.duck(0.4);
    let e = 0;
    while (e < 1.5) {
      const dt = yield; e += dt;
      facePlayer();
      if (Math.random() < dt * 50) {
        const a = G.rand(0, G.TAU), r = G.rand(60, 160);
        G.fx.spawn({ kind: 'spark', x: b.x + Math.cos(a) * r, y: b.y - 50 + Math.sin(a) * r, vx: -Math.cos(a) * r * 3, vy: -Math.sin(a) * r * 3, life: 0.3, size: 2.5, color: VOID.boss, len: 0.05 });
      }
      G.fx.shake(1 + 3 * e / 1.5);
    }
    G.fx.cine.to = 0;
    dark();
    // the beam goes, and rolls across the floor to you
    b.pose = 'beam'; b.fast = true;
    G.audio.play('beam'); G.audio.play('boom'); G.fx.shake(16); G.fx.flash(VOID.boss, 0.4, 0.3);
    const dir = b.face, from = b.x + dir * 40;
    const bd = B.bd = { from, front: from, dir, state: 'roll', hx: null, flash: null, wins: 0, n: 0, t: 0, results: [] };
    while (!P.dead) {
      const dt = yield;
      bd.front += dir * 1600 * dt;
      if ((bd.front - (P.x - dir * 26)) * dir >= 0 || bd.front < WL || bd.front > WR) break;
    }
    if (P.dead) { B.bd = null; G.audio.duck(1); return; }
    // it reaches you: your light holds it
    bd.front = P.x - dir * 26; bd.hx = P.x; bd.state = 'hold';
    P.grabbed = { mash: true, presses: 0, x: P.x, y: Math.min(P.y, FLOOR), face: -dir };
    G.flow.cutin = { t0: performance.now(), hero: { col: VOID.boss, hot: VOID.hot }, name: 'BLACK DAWN' };
    G.fx.stop(0.12); G.fx.shake(18); G.audio.play('clash');
    yield* wait(0.7);
    // the three flashes
    const win = K.hard() ? 0.1 : K.gentle() ? 0.18 : 0.14;
    for (let i = 0; i < 3 && !P.dead; i++) {
      const run = 0.8 - 0.1 * i, len = Math.abs(bd.front - bd.from);
      bd.flash = { t: 0, run, win, done: false, won: false };
      bd.n = i + 1;
      AU.play('chBeat', { k: 0 });
      // a full Dawnbreak meter takes the first flash by itself
      if (i === 0 && P.ult >= 100) {
        P.ult = 0;
        G.flow.cutin = { t0: performance.now(), hero: G.hero(), name: 'DAWNBREAK' };
        yield* wait(run);
        bd.flash.done = true; bd.flash.won = true;
      } else {
        let pressed = P.grabbed.presses, ft = 0;
        while (!bd.flash.done) {
          const dt = yield; ft += dt; bd.flash.t = ft;
          if (P.grabbed.presses > pressed) {
            // the first press decides it
            bd.flash.done = true; bd.flash.won = Math.abs(ft - run) <= win;
          } else if (ft > run + win) { bd.flash.done = true; bd.flash.won = false; }
          pressed = P.grabbed.presses;
        }
        // let the flash finish its run, so the next one is not crowded in
        while (bd.flash.t < run) { const dt = yield; bd.flash.t += dt; }
      }
      const fl = bd.flash;
      bd.results.push(fl.won);
      if (fl.won) {
        bd.wins++;
        AU.play('chBeat', { k: 1 });
        G.fx.stop(0.06); G.fx.shake(10);
        G.fx.burst(bd.front, FLOOR - 60, { n: 24, color: G.hero().col, speed: [200, 800], life: [0.2, 0.5], kind: 'spark', size: [2, 4] });
        G.fx.ring(bd.front, FLOOR - 60, { r0: 20, r1: 160, life: 0.3, color: G.hero().hot, width: 6 });
        bd.push = len * 0.22;
      } else {
        AU.play('chBeat', { k: 2 });
        G.fx.shake(8);
        bd.push = -40;
      }
      // the light (or the dark) gains ground
      const f0 = bd.front, f1 = f0 - dir * bd.push;
      let q = 0;
      while (q < 0.25) { const dt = yield; q += dt; bd.front = G.lerp(f0, f1, E.outQuad(Math.min(1, q / 0.25))); }
      bd.flash = null;
      if (bd.wins >= 2 || bd.wins + (2 - i) < 2) break; // decided
      yield* wait(0.25);
    }
    // the end of it
    const won = bd.wins >= 2;
    P.grabbed = null;
    G.audio.duck(1);
    if (won) {
      bd.state = 'break';
      G.fx.flash(G.hero().hot, 0.7, 0.5); G.fx.shake(24); G.fx.stop(0.15);
      G.audio.play('stagger');
      G.fx.lines(b.x, b.y - 50, 20, G.hero().hot, { r0: 40, speed: [800, 1500] });
      G.feats.bump('blackDawn');
      yield* wait(0.25);
      B.bd = null;
      b.fast = false;
      B.forceStagger();
      return;
    }
    bd.state = 'through';
    bd.front = P.x + dir * 120;
    G.fx.flash(VOID.boss, 0.6, 0.5); G.fx.shake(22);
    P.iframes = 0; P.inv = 0;
    P.tryHit(K.hard() ? 3 : 2, b.x, { kind: 'blackdawn' });
    yield* wait(0.45);
    B.bd = null; b.fast = false;
    b.pose = 'land';
    yield* wait(0.4);
  }

  B.ATTACKS = {
    string: atkString, chain: atkChain, fourfold: atkFourfold, maul: atkMaul, bow: atkBow, draw: atkDraw,
    guard: atkGuard, mend: atkMend, rise: atkRise, lunge: atkLunge, blackdawn: atkBlackDawn,
  };
  for (const id in TROPHY) B.ATTACKS['t_' + id] = TROPHY[id];
  // every move ends back at rest: the weapon lowered, a breath
  B.recover = function* () {
    const b = B.body;
    b.fast = false; b.hurt = false; b.air = false; b.y = FLOOR; b.charge = 0; b.orb = 0;
    b.pose = 'idle';
    yield* wait(0.12);
  };

  // ------------------------------------------------------------------ scenes
  // He sits on a rock with his back to you. He stands, rolls a shoulder, turns, two fingers to his
  // brow, and the sword on his back lights.
  B.enter = function* () {
    const b = B.body;
    b.x = 880; b.y = FLOOR; b.face = 1; faceNow(); b.pose = 'sit'; b.sitting = 1; b.wpn = null;
    yield* wait(0.9);
    b.pose = 'idle'; b.sitting = 0; G.audio.play('step');
    G.fx.dust(b.x, FLOOR, 2, { speed: [10, 50], size: [4, 8], up: 20 });
    yield* wait(0.45);
    b.pose = 'shoulder';
    yield* wait(0.55);
    b.pose = 'idle';
    yield* wait(0.25);
    facePlayer();
    yield* wait(0.45);
    b.pose = 'salute';
    yield* wait(0.75);
    b.pose = 'idle';
    light('sword', 1);
    yield* wait(0.4);
    B.rackT.sword = 0;
  };

  // what each boss's stone does as it wakes: its sound, its colour thrown up, its little picture
  function vigFx(id, s) {
    const t = bossTint(id), x = s.x, y = FLOOR - s.h - 30;
    G.fx.burst(x, y, { n: 18, color: t.boss, speed: [60, 260], life: [0.4, 0.9], kind: 'spark', size: [1.5, 3] });
    G.fx.light(x, y, 220, t.hot, 0.25, 0.7);
    const snd = { warden: 'ring', mage: 'frost', assassin: 'blink', knight: 'tink', wolf: 'howl', leviathan: 'splash', kairo: 'kBolt' }[id];
    if (snd) G.audio.play(snd);
  }

  B.phaseIn = function* (n) {
    if (n === 2) yield* trophiesScene();
    else yield* otherSideScene();
  };
  // Phase II: he plants his sword and holds a hand out to the stones. One by one, those of the bosses
  // you have beaten this run wake, each in its own way, and send a thread of light into his rack. Then
  // the cloth on his twin of your own weapon burns away.
  function* trophiesScene() {
    const b = B.body;
    dark(); b.marks = 0; b.pull = 0; b.hurt = false; b.air = false; b.y = FLOOR;
    if (!b.wpn) b.wpn = 'sword';
    facePlayer();
    b.pose = 'plant'; b.fast = true;
    G.audio.play('boom'); G.fx.shake(8);
    G.fx.dust(b.x + b.face * 24, FLOOR, 4, { speed: [30, 150], size: [5, 10], up: 30 });
    yield* wait(0.5);
    b.fast = false; b.pose = 'reach';
    yield* wait(0.35);
    const list = B.beaten.map((id) => B.stones.find((q) => q.id === id)).filter(Boolean);
    const per = list.length ? G.clamp(3.6 / list.length, 0.7, 1.1) : 0;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      G.fx.cine.x = s.x; G.fx.cine.y = FLOOR - s.h - 40; G.fx.cine.to = 0.55;
      AU.play('chStone', { k: B.stones.indexOf(s) });
      B.vig = { id: s.id, x: s.x, y: FLOOR - s.h - 34, t: 0 };
      vigFx(s.id, s);
      s.on = true;
      let e = 0;
      while (e < per * 0.6) { const dt = yield; e += dt; s.lit = Math.min(1, e / 0.3); }
      s.lit = 1;
      B.threads.push({ x: s.x, y: FLOOR - s.h, t: 0, col: bossTint(s.id).boss });
      AU.play('chThread');
      yield* wait(per * 0.4);
    }
    if (!list.length) { b.pose = 'shoulder'; yield* wait(0.6); }
    // the cloth on his twin of your weapon burns away
    G.fx.cine.x = b.x; G.fx.cine.y = b.y - 70; G.fx.cine.to = 0.7;
    yield* wait(0.3);
    const w = ownW(), rp = rackPoint(w) || { x: b.x, y: b.y - 60 }, hc = heroOf(w);
    b.unwrapped = true;
    light(w, 1);
    G.audio.play('charge', { dur: 0.6 });
    G.fx.burst(rp.x, rp.y, { n: 26, color: hc.col, speed: [60, 300], life: [0.4, 0.9], kind: 'spark', size: [1.5, 3], grav: -120 });
    G.fx.burst(rp.x, rp.y, { n: 10, color: '40,30,30', speed: [20, 90], life: [0.8, 1.4], size: [3, 6], grav: -60, wob: 60 });
    yield* wait(0.6);
    B.rackT[w] = 0;
    // and he pulls the sword from the floor
    b.pose = 'land'; G.audio.play('whoosh'); G.fx.shake(5);
    G.fx.dust(b.x + b.face * 24, FLOOR, 3, { speed: [30, 120], size: [4, 8], up: 30 });
    G.fx.cine.to = 0;
    yield* wait(0.3);
  }
  // Phase III: on one knee. The sky over the broken arch cracks; the black behind it pours down into
  // him; a heartbeat; then (phaseOut) the dark takes the arena and he roars, a blade in each hand.
  function* otherSideScene() {
    const b = B.body;
    dark(); b.marks = 0; b.pull = 0; b.hurt = false; b.air = false; b.y = FLOOR;
    b.pose = 'kneel';
    G.audio.setIntensity(0);
    yield* wait(0.7);
    AU.play('chCrack'); G.fx.shake(14); G.fx.flash(VOID.boss, 0.25, 0.3);
    let e = 0;
    while (e < 0.5) { const dt = yield; e += dt; B.crackK = Math.min(1, e / 0.5); }
    yield* wait(0.3);
    AU.play('chPour', { dur: 2.2 });
    e = 0;
    let beat = 0;
    while (e < 2.2) {
      const dt = yield; e += dt;
      const k = Math.min(1, e / 2.2);
      B.voidK = k; b.corruptK = E.inQuad(k);
      if (e > [0.4, 1.1, 1.7][beat] && beat < 3) { AU.play('chHeart', { vol: 0.6 + 0.2 * beat }); G.fx.shake(4 + 2 * beat); beat++; }
      if (Math.random() < dt * 60) G.fx.spawn({ x: b.x + G.rand(-30, 30), y: b.y - G.rand(0, 90), vx: G.rand(-20, 20), vy: -G.rand(40, 160), life: G.rand(0.3, 0.7), size: G.rand(2, 4), color: VOID.boss });
    }
    b.corruptK = 1;
  }
  B.phaseOut = function* (n) {
    const b = B.body;
    if (n === 2) { G.fx.cine.to = 0; b.pose = 'idle'; yield* wait(0.3); return; }
    b.pose = 'roar'; b.fast = true; b.dual = true;
    G.audio.play('roar'); G.audio.play('boom'); AU.play('chHeart', { vol: 1.2 });
    G.fx.flash(VOID.boss, 0.5, 0.4); G.fx.shake(20); G.fx.stop(0.08);
    G.fx.ripple(b.x, b.y - 50, 560, 0.6, 1.4);
    G.fx.lines(b.x, b.y - 50, 22, VOID.hot, { r0: 50, speed: [900, 1600] });
    let e = 0;
    while (e < 0.9) { const dt = yield; e += dt; B.darkK = E.inOutQuad(Math.min(1, e / 0.9)); if (e > 0.3) b.fast = false; }
    B.darkK = 1;
    b.pose = 'idle';
    yield* wait(0.3);
  };
  // At nothing he goes down on one knee. The black runs off him and out of the sky; the dawn comes
  // back. He puts his hood down, smiles, and holds his weapon out to you hilt first, then is gone.
  B.deathScene = function* () {
    const b = B.body;
    G.fx.slow(0.3, 0.8);
    G.audio.setIntensity(0);
    b.pose = 'kneel'; b.hurt = false; b.air = false; b.y = FLOOR;
    for (const s of B.shades) s.dead = true;
    yield* wait(0.5);
    if (B.phase === 3 || b.corruptK > 0) {
      AU.play('chPour', { dur: 1.6 });
      G.arena.setPhase(1, 2.0);
      const c0 = b.corruptK, d0 = B.darkK, v0 = B.voidK, k0 = B.crackK;
      let e = 0;
      while (e < 1.6) {
        const dt = yield; e += dt; const k = Math.min(1, e / 1.6);
        b.corruptK = c0 * (1 - k); B.darkK = d0 * (1 - k); B.voidK = v0 * (1 - k); B.crackK = k0 * (1 - k);
        if (Math.random() < dt * 50) G.fx.spawn({ x: b.x + G.rand(-26, 26), y: b.y - G.rand(10, 90), vx: G.rand(-30, 30), vy: G.rand(40, 160), life: G.rand(0.4, 0.8), size: G.rand(2, 4), color: VOID.boss });
      }
      b.corruptK = 0; B.darkK = 0; B.voidK = 0; B.crackK = 0; b.dual = false;
    } else G.arena.setPhase(1, 1.6);
    yield* wait(0.5);
    // hood down
    let e = 0;
    while (e < 0.6) { const dt = yield; e += dt; b.hood = 1 - E.inOutQuad(Math.min(1, e / 0.6)); }
    b.hood = 0;
    yield* wait(0.35);
    b.smile = 1;
    yield* wait(0.4);
    b.offerW = ownW(); b.wpn = null; b.pose = 'offer';
    G.audio.play('whoosh');
    yield* wait(1.6);
    // gone, in gold motes
    G.audio.play('ring');
    e = 0;
    while (e < 1.4) {
      const dt = yield; e += dt;
      b.fade = 1 - Math.min(1, e / 1.4);
      if (Math.random() < dt * 70) G.fx.spawn({ x: b.x + G.rand(-24, 24), y: b.y - G.rand(0, 86), vx: G.rand(-20, 20), vy: -G.rand(30, 110), life: G.rand(0.8, 1.6), size: G.rand(1.5, 3), color: GOLD, grav: -20 });
    }
    b.fade = 0;
  };

  // ------------------------------------------------------------------ between attacks
  // He keeps a hero's distance: close with a blade, further off with the bow, and never quite still.
  B.idle = function (dt) {
    const b = B.body, P = G.player;
    facePlayer();
    const d = Math.abs(P.x - b.x), want = b.wpn === 'bow' ? 300 : 150;
    if (d > want + 90) { b.x = clampX(b.x + b.face * 150 * dt); b.pose = 'walk'; }
    else if (d < want - 70) { b.x = clampX(b.x - b.face * 90 * dt); b.pose = 'walk'; }
    else b.pose = 'idle';
    b.air = false; b.y = FLOOR;
  };

  // ------------------------------------------------------------------ (v2.5c) a bone for every part
  // Drawing only, on top of the pose (b.p, which nothing here changes): each part of him on its own
  // spring, pushed by his body's acceleration and by impacts, so he never moves as one rigid piece.
  // Everything lands in b.rigQ, a set of drawn offsets that drawFig reads; a figure without one (an
  // afterimage made before it, a Veil shade, him seated on the road) draws from RZ, the plain pose.
  const HOOD_N = 3, HOOD_SEG = 4.6;
  const hoodWant = (out) => { for (let i = 0; i < HOOD_N; i++) out[i] = Math.PI - 0.55 - 0.32 * i; return out; };
  const RZ = Object.freeze({ bow: 0, sq: 0, sh: 0, hx: 0, hdx: 0, hdy: 0, nod: 0, lhx: 0, lhy: 0, rhx: 0, rhy: 0, wa: null, fr: [0, 0], rk: { sword: [0, 0, 0], maul: [0, 0, 0], bow: [0, 0, 0], blade: [0, 0, 0] }, hood: hoodWant([]) });
  // each racked weapon's own spring: stiffness, damping, how far its weight carries it
  const RKS = { sword: [21, 0.28, 0.8], maul: [13, 0.3, 1.4], bow: [17, 0.32, 1], blade: [19, 0.28, 0.9] };
  // the weapon in hand: stiffness, damping, how far it may trail the hand's angle, how heavy it is
  const WSP = { sword: [30, 0.6, 0.3, 0.7], maul: [15, 0.42, 0.6, 1.6], bow: [26, 0.6, 0.25, 0.8], blade: [34, 0.6, 0.28, 0.6] };
  function snapQ(Q) {
    if (!Q) return null;
    return Object.assign({}, Q, { fr: Q.fr.slice(), hood: Q.hood.slice(), rk: { sword: Q.rk.sword.slice(), maul: Q.rk.maul.slice(), bow: Q.rk.bow.slice(), blade: Q.rk.blade.slice() } });
  }
  // him seated on the road: no rig, just his breath (from the clock alone)
  function seatedQ() {
    const Q = snapQ(RZ), br = Math.sin(G.t * 1.7);
    Q.sh = -br * 0.9; Q.hdy = -br * 0.5; Q.nod = 0.03 * Math.sin(G.t * 0.6); Q.hood = hoodWant([]);
    return Q;
  }
  function living(b, dt) {
    const R = b.rig || (b.rig = D.rig());
    const Q = b.rigQ || (b.rigQ = Object.assign(snapQ(RZ), { fax: 0, fay: 0, wax: 0, way: 0, ex: 0, bph: 0, sq2: 0, hood: hoodWant([]), hst: {} }));
    const L = b.rigL || (b.rigL = { air: false, y: b.y, fast: false, stepN: b.stepN, wpn: b.wpn, flash: 0, lit: { sword: 0, maul: 0, bow: 0, blade: 0 } });
    if (dt <= 0) return;
    // his acceleration, smoothed (a frame's jump in speed is a push, not a spike), in his own frame too
    const A = b.hidden ? { ax: 0, ay: 0 } : R.accel(b.x + (b.kx || 0), b.y, dt);
    const sm = Math.min(1, dt * 28);
    Q.wax += (A.ax - Q.wax) * sm; Q.way += (A.ay - Q.way) * sm;
    const ax = Q.wax * b.face, ay = Q.way;
    Q.fax = ax; Q.fay = ay;
    // what just happened to him: a landing, a blow thrown, a foot down, a blow taken, a weapon drawn
    const landed = (L.air && !b.air) || (L.y < FLOOR - 6 && b.y >= FLOOR - 0.5);
    const blow = b.fast && !L.fast;
    const step = b.pose === 'walk' && b.stepN !== L.stepN;
    const struck = (b.flash || 0) > L.flash + 0.3;
    if (b.wpn !== L.wpn && b.wpn) R.set('wa', b.pose === 'bow' ? (b.aim || 0) : b.p[11]);
    L.air = b.air; L.y = b.y; L.fast = b.fast; L.stepN = b.stepN; L.wpn = b.wpn; L.flash = b.flash || 0;
    const heavy = b.wpn === 'maul' ? 1.6 : 1;
    if (landed) {
      R.kick('sq', 70); R.kick('hdy', 50); R.kick('nod', 2.2); R.kick('bow', 1.4);
      R.kick('lhy', 60 * heavy); R.kick('rhy', 50);
      for (const w of WPN) { R.kick('rk' + w + 'y', 60 * RKS[w][2]); R.kick('rk' + w + 'a', (w === 'sword' || w === 'bow' ? 4 : -4) * RKS[w][2]); }
      R.kick('fr0', -5); R.kick('fr1', -5);
    }
    if (blow) {
      Q.ex = Math.min(1, Q.ex + 0.3);
      R.kick('bow', 1.6); R.kick('nod', 1.2); R.kick('hdx', 30);
      for (const w of WPN) R.kick('rk' + w + 'a', (w === 'maul' ? -1.6 : 1.6) * RKS[w][2]);
    }
    if (step) { R.kick('sq', 14); R.kick('hdy', 10); for (const w of WPN) { R.kick('rk' + w + 'y', 14 * RKS[w][2]); R.kick('rk' + w + 'a', (b.stepN & 1 ? 0.7 : -0.7) * RKS[w][2]); } }
    if (struck) { R.kick('bow', -2.2); R.kick('nod', -2.6); R.kick('hdx', -60); R.kick('lhx', -50); for (const w of WPN) R.kick('rk' + w + 'a', 2 * RKS[w][2]); }
    // a weapon lighting on his rack gives a little start, so the tell shows in its motion as well
    for (const w of WPN) {
      const t = B.rackT ? B.rackT[w] : 0;
      if (t > 0.3 && L.lit[w] <= 0.3) R.kick('rk' + w + 'a', (w === 'maul' ? -3 : 3) * (0.5 + 0.5 * t));
      L.lit[w] = t;
    }
    // breath: quicker and deeper after he has been swinging, shallow in the middle of a blow
    Q.ex = Math.max(0, Q.ex - dt * 0.22);
    const still = !b.fast && !b.air && b.pose !== 'walk';
    Q.bph += dt * (2.1 + 1.8 * Q.ex);
    const br = Math.sin(Q.bph) * (0.55 + 0.9 * Q.ex) * (still ? 1 : 0.4);
    // the spine: the chest lags his starts and stops (back as he drives, over as he stops), bows on landing
    Q.bow = R.spring('bow', G.clamp(-ax * 0.000035, -0.13, 0.15), dt, 13, 0.5);
    // the hips: down with a landing and back up; the weight moves from foot to foot while he waits
    Q.sq = G.clamp(R.spring('sq', G.clamp(-ay * 0.0007, -3, 6), dt, 17, 0.45), -4, 9);
    Q.hx = R.spring('hx', still && b.pose !== 'guard' ? Math.sin(G.t * 0.8) * 1.3 : 0, dt, 6, 0.8);
    // the shoulders ride down after the hips, later and further, and rise with each breath
    Q.sq2 = R.spring('sq2', Q.sq, dt, 11, 0.36);
    Q.sh = G.clamp(Q.sq2 - Q.sq, -5, 5) - br;
    // the head on its neck: thrown back as he drives off, on as he stops, down as he lands, nodding
    Q.hdx = G.clamp(R.spring('hdx', G.clamp(-ax * 0.0009, -4, 4), dt, 15, 0.45), -5, 5);
    Q.hdy = G.clamp(R.spring('hdy', G.clamp(-ay * 0.0006, -3, 4) - br * 0.4, dt, 15, 0.45), -5, 6);
    Q.nod = G.clamp(R.spring('nod', G.clamp(-ax * 0.00005, -0.25, 0.25), dt, 12, 0.42), -0.4, 0.4);
    // the hands trail his motion, the weapon hand by the weight of what it holds
    const hw = b.wpn ? WSP[b.wpn][3] : 1;
    Q.lhx = G.clamp(R.spring('lhx', G.clamp(-ax * 0.0008 * hw, -5, 5), dt, 17 / Math.sqrt(hw), 0.45), -6, 6);
    Q.lhy = G.clamp(R.spring('lhy', G.clamp(-ay * 0.0007 * hw, -4, 5) - br * 0.5, dt, 17 / Math.sqrt(hw), 0.45), -6, 7);
    Q.rhx = G.clamp(R.spring('rhx', G.clamp(-ax * 0.001, -5, 5), dt, 14, 0.4), -6, 6);
    Q.rhy = G.clamp(R.spring('rhy', G.clamp(-ay * 0.0008, -4, 5) - br * 0.5, dt, 14, 0.4), -6, 7);
    // the weapon in hand: its own angle on its own spring, the maul heavy and late, the sword light
    if (b.wpn) {
      const s = WSP[b.wpn], tgt = b.pose === 'bow' ? (b.aim || 0) : b.p[11];
      if (landed) R.kick('wa', 3 * s[3] * Math.cos(tgt));
      if (struck) R.kick('wa', -3);
      const a = R.spring('wa', tgt, dt, s[0], s[1]);
      Q.wa = tgt + s[2] * Math.tanh((a - tgt) / s[2]); // (a soft limit: it trails, it never hangs off a blow)
    } else Q.wa = null;
    // each weapon on his back on its own small spring: they jostle with his motion and rattle on landings
    for (const w of WPN) {
      const s = RKS[w], k = s[2], r = Q.rk[w];
      r[0] = G.clamp(R.spring('rk' + w + 'x', G.clamp(-ax * 0.0005 * k, -2.5, 2.5), dt, s[0], s[1]), -3.5, 3.5);
      r[1] = G.clamp(R.spring('rk' + w + 'y', G.clamp(-ay * 0.0004 * k, -2, 3), dt, s[0], s[1]), -3.5, 4);
      r[2] = G.clamp(R.spring('rk' + w + 'a', G.clamp(-ax * 0.00003 * k, -0.1, 0.1), dt, s[0] * 0.9, s[1]), -0.22, 0.22);
    }
    // the boots: a lifted foot points its toe, a foot behind him in the stride rolls off its toe, and
    // a landing slaps them flat
    for (let i = 0; i < 2; i++) {
      const fx = b.p[i ? 4 : 2], lift = Math.max(0, -b.p[i ? 5 : 3]);
      const push = b.pose === 'walk' && fx < -4 && lift < 2.5 ? 0.32 : 0;
      Q.fr[i] = G.clamp(R.spring('fr' + i, G.clamp(lift * 0.07, 0, 0.8) + push, dt, 20, 0.55), -0.2, 0.95);
    }
    // the hood's point: a short chain off the crown, stiff at the root, loose at the tip
    const want = hoodWant(HOOD_WANT);
    const tilt = Q.bow * 0.5 + Q.nod;
    for (let i = 0; i < HOOD_N; i++) want[i] += tilt * (1 - i / HOOD_N) * 0.6;
    const ha = D.angleChain(Q.hst, want, dt, { w0: 22, w1: 10, z0: 0.45, z1: 0.3, follow: 0.55, push: G.clamp(ax * 0.006 + ay * 0.004, -60, 60) });
    for (let i = 0; i < HOOD_N; i++) Q.hood[i] = G.clamp(ha[i], 1.4, 3.6);
  }
  const HOOD_WANT = new Array(HOOD_N);

  B.tick = function (dt) {
    const b = B.body, P = G.player;
    // thrown open, he goes after his weapon, but not past you
    const L = B.loose;
    if (L && !L.stuck) {
      L.t += dt; L.vy += 1700 * dt; L.y += L.vy * dt; L.x += (L.tx - L.x) * Math.min(1, dt * 3); L.spin += dt * 22;
      if (L.y >= FLOOR - 26 && L.vy > 0) {
        L.y = FLOOR - 26; L.stuck = true; L.spin = 0;
        G.audio.play('tink'); G.fx.shake(4);
        G.fx.dust(L.x, FLOOR, 3, { speed: [20, 100], size: [4, 8], up: 20 });
      }
    }
    if (B.staggered && L && L.stuck && !B.dying && b.pose !== 'reel') {
      const d = L.x - b.x, between = (P.x - b.x) * d > 0 && Math.abs(P.x - b.x) < Math.abs(d);
      if (Math.abs(d) > 30 && !between) { b.face = G.sign(d); b.x += b.face * 120 * dt; b.pose = 'walk'; }
      else if (b.pose === 'walk') b.pose = 'guardU';
    }
    if (b.pose === 'walk') {
      b.walkT += dt * 9;
      const sn = Math.floor(b.walkT / Math.PI + 0.5);
      if (sn !== b.stepN) { b.stepN = sn; G.fx.step(b.x - b.face * 4, FLOOR, -b.face); G.audio.play('step'); }
    }
    // the pose: each part on a spring, snappier for blows
    const target = b.pose === 'walk' ? walkPose(b.walkT) : (POSES[b.pose] || POSES.idle);
    const w0 = b.fast || SNAP[b.pose] ? 46 : WIND[b.pose] ? 32 : 18, z = b.fast ? 0.8 : 0.9; // (v2.5b: firmer, so a blow lands and holds instead of wobbling past)
    for (let i = 0; i < NP; i++) {
      b.pv[i] += ((target[i] - b.p[i]) * w0 * w0 - 2 * z * w0 * b.pv[i]) * dt;
      b.p[i] += b.pv[i] * dt;
    }
    b.bob = (b.pose === 'idle' && !b.air) ? Math.sin(G.t * 3.2) * 1.2 : 0;
    // (v2.5c) every part of him on its own spring (drawing only: see living)
    living(b, dt);
    // the rack's glows: quick to light, slower to fade
    for (const w of WPN) { const t = B.rackT[w], k = B.rackK[w]; B.rackK[w] = k + (t - k) * Math.min(1, dt * (t > k ? 30 : 7)); }
    // the cloak, in three tails from his shoulders; (v2.5c) thrown about by his starts, stops and
    // landings as well as its drift, the outer tail the loosest
    const sh = shoulderOf(b), RQ = b.rigQ;
    for (let i = 0; i < 3; i++) {
      const tail = B.cloak[i];
      D.chainStep(tail, sh.x - b.face * (6 + i * 4), sh.y + 2 + i * 2, dt, { seg: 9 - i, grav: b.air ? 30 : 120, drift: 24 + (b.fast ? 60 : 0), face: b.face, wave: 3, rate: 4 + i, floor: FLOOR - 2 });
      if (RQ && !b.hidden) {
        const kx = -RQ.wax * dt * (0.011 + 0.003 * i), ky = -RQ.way * dt * (0.008 + 0.002 * i);
        for (let j = 1; j < tail.length; j++) {
          const q = j / (tail.length - 1);
          tail[j].x += G.clamp(kx * q, -4, 4); tail[j].y = Math.min(FLOOR - 2, tail[j].y + G.clamp(ky * q, -4, 4));
        }
      }
    }
    b.twang = Math.max(0, (b.twang || 0) - dt * 3);
    // (v2.5b) the weapon's trail: a ribbon from the last few frames of a fast blow
    for (let i = B.trail.length - 1; i >= 0; i--) { B.trail[i].t += dt; if (B.trail[i].t > 0.14) B.trail.splice(i, 1); }
    if (b.fast && b.tip && b.hilt && !b.hidden && !b.rot) B.trail.push({ tx: b.tip.x, ty: b.tip.y, hx: b.hilt.x, hy: b.hilt.y, t: 0, col: tintOf(b.wpn) });
    for (let i = B.ghosts.length - 1; i >= 0; i--) { const g = B.ghosts[i]; g.t += dt; if (g.t >= g.life) B.ghosts.splice(i, 1); }
    for (const s of B.stones) {
      s.flare = Math.max(0, s.flare - dt * 1.4);
      // a lit stone breathes out its boss's colour
      if (s.lit > 0.5 && B.phase >= 2 && Math.random() < dt * 3) {
        const t = bossTint(s.id);
        G.fx.spawn({ x: s.x + G.rand(-12, 12), y: FLOOR - s.h - G.rand(0, 20), vx: G.rand(-10, 10), vy: -G.rand(20, 60), life: G.rand(1, 2), size: G.rand(1.4, 2.6), color: t.boss, grav: -10 });
      }
    }
    for (let i = B.threads.length - 1; i >= 0; i--) { B.threads[i].t += dt; if (B.threads[i].t > 0.7) B.threads.splice(i, 1); }
    if (B.cutLine) { B.cutLine.t += dt; if (B.cutLine.t > 0.45) B.cutLine = null; }
    if (B.vig) { B.vig.t += dt; if (B.vig.t > 1.4) B.vig = null; }
    for (let i = B.shades.length - 1; i >= 0; i--) if (B.shades[i].dead) B.shades.splice(i, 1);
    // the dark: crimson lightning about him, and now and then the sky flashes and shows him plainly
    B.boltT -= dt;
    if (B.boltT <= 0) {
      B.boltT = 0.08;
      B.bolts = [];
      if (b.corruptK > 0.4 && !B.dead) for (let i = 0; i < 3; i++) if (Math.random() < 0.55) B.bolts.push(jag(b.x + G.rand(-20, 20), b.y - G.rand(10, 86), G.rand(14, 30)));
    }
    if (B.darkK > 0.5 && B.active && !B.dying) {
      B.flashIn = (B.flashIn == null ? 3 : B.flashIn) - dt;
      if (B.flashIn <= 0) { B.flashIn = G.rand(2.5, 4.5); B.reveal = 1; G.audio.play('thunder'); }
    }
    B.reveal = Math.max(0, B.reveal - dt * 2.2);
    // his body hurts when he means it to (the thrust, the draw, the pounce)
    if (b.hurt && G.canHurt() && G.rectsOverlap(P.box(), { cx: b.x, cy: b.y - 42, hw: 22, hh: 40 })) P.tryHit(1, b.x, b);
    // a feint that got through
    if (B.feintT > 0) {
      B.feintT -= dt;
      if (P.stats.hits > B.hits0) { B.feintHit = true; B.feintT = 0; G.feats.bump('feintHit'); }
    }
  };
  function jag(x, y, len) {
    const a = G.rand(0, G.TAU), pts = [[x, y]];
    let px = x, py = y;
    for (let i = 0; i < 4; i++) { px += Math.cos(a + G.rand(-0.9, 0.9)) * len / 4; py += Math.sin(a + G.rand(-0.9, 0.9)) * len / 4; pts.push([px, py]); }
    return pts;
  }
  function shoulderOf(f) {
    const Q = f.rigQ || RZ, lean = f.p[0] + Q.bow;
    let lx = Q.hx + Math.sin(lean) * 30, ly = (f.bob || 0) + f.p[1] - STAND + Q.sq + Q.sh - Math.cos(lean) * 30;
    // (through a flip the shoulder turns about his middle, as drawFig turns him)
    if (f.rot) { const c = Math.cos(f.rot), s = Math.sin(f.rot), x0 = lx, y0 = ly + 44; lx = c * x0 - s * y0; ly = s * x0 + c * y0 - 44; }
    return { x: f.x + f.face * lx, y: f.y + ly };
  }
  // (v2.5b) he is drawn standing a little taller than his poses say: less of a crouch, a cleaner line
  const STAND = 3;

  // ------------------------------------------------------------------ drawing
  // A worn traveller's kit: a hooded cloak gone grey-violet with road dust, a dark tunic, a leather
  // cuirass with a line of faded gold, bracers and boots, and the harness across his back that holds
  // four weapons. Under the hood only the line of his eyes shows, until the end.
  const CL = { skin: '#b08468', skinD: '#87624c', cloak: '#3a2f3d', cloakD: '#272029', tunic: '#433b4b', tunicD: '#2e2834', leather: '#5b4535', leatherD: '#3d2f25', boot: '#241c20', hood: '#352b38', hoodD: '#211a24', hair: '#d9ccb4', trim: GOLD };
  // the dark in him: the same shape, gone black
  const CB = { skin: '#160910', skinD: '#0e060a', cloak: '#0d060a', cloakD: '#070306', tunic: '#0d060a', tunicD: '#080406', leather: '#14080c', leatherD: '#0c0508', boot: '#060304', hood: '#0b0508', hoodD: '#060304', hair: '#1a0a10', trim: VOID.boss };
  // the Veil's shades of him
  const CSH = { skin: '#06030a', skinD: '#040207', cloak: '#06030a', cloakD: '#040207', tunic: '#06030a', tunicD: '#040207', leather: '#08040c', leatherD: '#050208', boot: '#030104', hood: '#06030a', hoodD: '#040207', hair: '#06030a', trim: '120,60,160' };

  // One of his four, with its grip at (x, y), pointing along ang, at scale s. o: col/hot (its light,
  // the twin hero's unless given), glow (0-1), marks (the sheath's bands), pull and twang (the bow),
  // charge (the maul's head), drawn (the katana bare; otherwise only its sheath).
  function drawWeapon(ctx, w, x, y, ang, s, o) {
    o = o || {};
    const h = heroOf(w === 'sheath' ? 'blade' : w), col = o.col || h.col, hot = o.hot || h.hot;
    // dim (0-1): on his back an unlit weapon is a dark shape, and comes up into its colours as it lights
    const Lt = o.dim != null ? 0.16 + 0.84 * Math.min(1, o.dim) : 1;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (w === 'sword') {
      if (o.glow > 0.02) D.glow(ctx, col, 22, 0, 34, 0.8 * o.glow);
      ctx.fillStyle = '#16121a'; ctx.fillRect(-9, -1.6, 9, 3.2);
      ctx.fillStyle = G.rgba(col, Lt * 1); D.poly(ctx, [-12, 0, -9.5, -2.2, -7.5, 0, -9.5, 2.2]); ctx.fill();
      ctx.fillStyle = G.rgba(hot, Lt * 1); D.poly(ctx, [2, -2.6, 34, -1.8, 44, 0, 34, 1.8, 2, 2.6]); ctx.fill();
      ctx.strokeStyle = G.rgba(col, Lt * 0.9); ctx.lineWidth = 0.9; D.line(ctx, 4, 0, 34, 0);
      ctx.fillStyle = G.rgba(col, Lt * 1); D.poly(ctx, [0, -1.6, 2.8, -1.6, 5, -7, 2.4, -6]); ctx.fill(); D.poly(ctx, [0, 1.6, 2.8, 1.6, 5, 7, 2.4, 6]); ctx.fill();
    } else if (w === 'maul') {
      const L = 38, g = Math.max(o.glow || 0, o.charge || 0);
      ctx.strokeStyle = '#120e10'; ctx.lineWidth = 5; D.line(ctx, -16, 0, L - 6, 0);
      ctx.strokeStyle = '#4a3c30'; ctx.lineWidth = 2.8; D.line(ctx, -16, 0, L - 6, 0);
      ctx.strokeStyle = G.rgba(col, Lt * 0.8); ctx.lineWidth = 1; for (const bx of [-9, 3, 15]) D.line(ctx, bx, -2.2, bx, 2.2);
      if (g > 0.02) D.glow(ctx, col, L + 2, 0, 30 + 26 * (o.charge || 0), 0.9 * g);
      ctx.fillStyle = '#24222a';
      D.poly(ctx, [L - 8, -13, L + 9, -13, L + 11, -9, L + 11, 9, L + 9, 13, L - 8, 13, L - 10, 9, L - 10, -9]); ctx.fill();
      if (g > 0.02) { ctx.strokeStyle = G.rgba(col, Lt * g); ctx.lineWidth = 1.2; ctx.stroke(); }
      // (its striking face catches the light)
      ctx.strokeStyle = G.rgba(hot, Lt * 0.55); ctx.lineWidth = 1.6; D.line(ctx, L + 11, -8, L + 11, 8);
      ctx.fillStyle = G.rgba(hot, Lt * 0.6 + 0.4 * g); D.poly(ctx, [L + 0.5, -8, L + 4.5, 0, L + 0.5, 8, L - 3.5, 0]); ctx.fill();
    } else if (w === 'bow') {
      if (o.glow > 0.02) D.glow(ctx, col, 0, 0, 30, 0.8 * o.glow);
      for (const sg of [-1, 1]) {
        ctx.strokeStyle = '#1a1226'; ctx.lineWidth = 3.8;
        ctx.beginPath(); ctx.moveTo(1.6, 0); ctx.quadraticCurveTo(4, sg * 10, -1, sg * 18); ctx.quadraticCurveTo(-4, sg * 22, -8, sg * 21); ctx.stroke();
        ctx.strokeStyle = G.rgba(col, Lt * 1); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(2.6, sg); ctx.quadraticCurveTo(5, sg * 10, 0, sg * 17.6); ctx.quadraticCurveTo(-3.6, sg * 22.6, -8.2, sg * 21.4); ctx.stroke();
      }
      const nx = -6 - 10 * (o.pull || 0) + (o.twang ? Math.sin(G.t * 90) * 2.4 * o.twang : 0);
      ctx.strokeStyle = G.rgba(hot, Lt * 0.85); ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-8, -21); ctx.lineTo(nx, 0); ctx.lineTo(-8, 21); ctx.stroke();
      if (o.pull > 0.05) {
        ctx.strokeStyle = G.rgba(hot, Lt * 1); ctx.lineWidth = 1.8; D.line(ctx, nx, 0, nx + 30, 0);
        ctx.fillStyle = G.rgba(hot, Lt * 1); D.poly(ctx, [nx + 29, -2.8, nx + 37, 0, nx + 29, 2.8]); ctx.fill();
        D.glow(ctx, col, nx + 34, 0, 14, 0.6 * o.pull);
      }
    } else if (w === 'blade') {
      // the katana, bare
      if (o.glow > 0.02) D.glow(ctx, col, 20, 0, 30, 0.8 * o.glow);
      ctx.fillStyle = '#12070b'; ctx.fillRect(-11, -1.4, 11, 2.8);
      ctx.fillStyle = G.rgba(hot, Lt * 1);
      ctx.beginPath(); ctx.moveTo(2, -1.7); ctx.quadraticCurveTo(24, -2.4, 42, -4); ctx.lineTo(38, 0.6); ctx.quadraticCurveTo(22, 1.6, 2, 1.7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = G.rgba(col, Lt * 0.9); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(3.5, -0.3); ctx.quadraticCurveTo(24, -0.9, 37, -2.4); ctx.stroke();
      ctx.fillStyle = G.rgba(col, Lt * 1); ctx.fillRect(0.2, -3.6, 1.8, 7.2);
    } else if (w === 'sheath') {
      // the lacquered sheath, its hilt out, three bands that light one at a time
      const m = o.marks || 0, lit = m >= 3 ? '255,214,140' : hot;
      if (o.glow > 0.02) D.glow(ctx, col, 18, 0, 28, 0.8 * o.glow);
      ctx.fillStyle = '#1a080f';
      ctx.beginPath(); ctx.moveTo(-0.6, -2.3); ctx.quadraticCurveTo(24, -2.6, 40, -3.6); ctx.lineTo(41, -1.2); ctx.quadraticCurveTo(24, 1.9, -0.6, 2.3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = G.rgba(col, Lt * 0.6); ctx.lineWidth = 0.8; ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const bx = 10 + i * 8, on = m > i;
        ctx.fillStyle = on ? G.rgba(lit, Lt * 1) : G.rgba(col, Lt * 0.18); ctx.fillRect(bx, -2.6, 2, 4.6);
        if (on) D.glow(ctx, m >= 3 ? '255,214,140' : col, bx + 1, 0, 10, 0.95);
      }
      if (!o.empty) {
        ctx.fillStyle = G.rgba(col, Lt * 1); ctx.fillRect(-2.2, -3.6, 1.8, 7.2);
        ctx.fillStyle = '#12070b'; ctx.fillRect(-13, -1.4, 11, 2.8);
      }
    }
    ctx.restore();
  }
  // where each weapon rides on his back, in his own frame (facing right): grip, angle, glow point
  const RACK = {
    sword: (shx, shy, hip) => [shx - 7, shy - 3, 2.0, 0.5],
    maul: (shx, shy, hip) => [-12, hip + 2, -1.72, 0.7],
    bow: (shx, shy, hip) => [shx - 12, shy + 16, -0.55, 0],
    blade: (shx, shy, hip) => [-5, hip - 3, 2.75, 0.5],
  };

  function drawFig(ctx, f, alpha, o) {
    o = o || {};
    if (alpha <= 0.01) return;
    const ck = f.corruptK || 0;
    const c = o.shade ? CSH : ck > 0.55 ? CB : CL, pal = G.pal(), rim = o.shade ? '120,60,160' : ck > 0.55 ? VOID.boss : pal.rim;
    // (v2.5c) the drawn springs on top of the pose (RZ, none, for a figure without them)
    const Q = f.rigQ || RZ, hx0 = Q.hx;
    const p = f.p, lean = p[0] + Q.bow, hip = p[1] - STAND + (f.bob || 0) + Q.sq;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.translate(f.x + (f.kx || 0) + (f.jit ? G.rand(-f.jit, f.jit) : 0), f.y);
    if (o.real) K.recoil(ctx, f);
    const sx = o.real ? K.faceX(f, 0.25) : f.face;
    ctx.scale(sx, 1);
    if (f.rot) { ctx.translate(0, -44); ctx.rotate(f.rot); ctx.translate(0, 44); } // (a flip, about his middle)
    if (o.real && f.flash > 0) D.glow(ctx, '255,255,255', 0, -48, 66, f.flash * 0.3);
    if (ck > 0.05 && !o.shade) D.glow(ctx, VOID.boss, 0, -46, 70, 0.22 * ck);

    const shx = hx0 + Math.sin(lean) * 30, shy = hip + Q.sh - Math.cos(lean) * 30;
    const hx = shx + Math.sin(lean) * 12 + 1.5 + Q.hdx, hy = shy - Math.cos(lean) * 12 - 1 + Q.hdy;
    const rimS = (w) => { ctx.strokeStyle = G.rgba(rim, 0.22); ctx.lineWidth = w || 0.9; ctx.stroke(); };
    const toWorld = (lx, ly) => ({ x: f.x + sx * lx, y: f.y + ly });
    const rk = o.real ? B.rackK : null;
    if (o.real) f.rack = f.rack || {};
    // the rack: whatever is not in his hand rides on his back
    for (const w of WPN) {
      if (f.wpn === w || f.offerW === w) continue;
      if (o.real && B.loose && B.loose.w === w) continue;
      // (each rides on its own small spring: Q.rk, an offset and a tilt about its grip)
      const r0 = RACK[w](shx, shy, hip), j = Q.rk[w], low = w === 'maul' || w === 'blade';
      const r = [r0[0] + j[0] + (low ? hx0 : 0), r0[1] + j[1], r0[2] + j[2]], g = rk ? rk[w] : 0;
      const kind = w === 'blade' ? 'sheath' : w;
      drawWeapon(ctx, kind, r[0], r[1], r[2], 0.86, o.shade ? { col: '90,50,130', hot: '140,100,190', dim: 0.3 } : { glow: g, marks: 0, dim: g });
      // his twin of your weapon is wrapped in cloth until the trophies
      if (o.real && !f.unwrapped && ownW() === w) {
        ctx.save(); ctx.translate(r[0], r[1]); ctx.rotate(r[2]);
        ctx.fillStyle = '#6a6058';
        for (let i = 0; i < 4; i++) { ctx.fillRect(4 + i * 8, -4, 6, 8); }
        ctx.strokeStyle = '#3e3832'; ctx.lineWidth = 0.8; for (let i = 0; i < 4; i++) D.line(ctx, 4 + i * 8, -4, 10 + i * 8, 4);
        ctx.restore();
      }
      if (o.real) {
        const along = w === 'bow' ? 0 : w === 'sword' ? -6 : 20, gx = r[0] + Math.cos(r[2]) * along, gy = r[1] + Math.sin(r[2]) * along;
        f.rack[w] = toWorld(gx, gy);
      }
    }
    const leg = (front) => {
      const lx = hx0 + (front ? 4 : -4), fx = p[front ? 2 : 4], fy = p[front ? 3 : 5];
      // (v2.5c) the boot rolls: a lifted foot points its toe; one still on the floor lifts its heel and
      // pivots on the toe, so the ankle rises with it
      const roll = Q.fr[front ? 0 : 1], ground = G.clamp(1 - Math.max(0, -fy) / 4, 0, 1);
      const heel = Math.max(0, Math.sin(roll)) * 9 * ground;
      const k = D.ik(lx, hip, fx, fy - 2 - heel, 24, 23, -1);
      ctx.fillStyle = front ? c.tunic : c.tunicD;
      D.limb(ctx, lx, hip, k.jx, k.jy, 11.5, 9); ctx.fill(); if (front) rimS();
      ctx.fillStyle = c.boot;
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey - 3, 9, 7.5); ctx.fill(); if (front) rimS();
      if (roll) { ctx.save(); ctx.translate(k.ex, k.ey); ctx.rotate(roll); D.poly(ctx, [-4, -6, 3, -5, 10, -1, 9, 1, -5, 1]); ctx.fill(); ctx.restore(); }
      else { D.poly(ctx, [k.ex - 4, k.ey - 6, k.ex + 3, k.ey - 5, k.ex + 10, k.ey - 1, k.ex + 9, k.ey + 1, k.ex - 5, k.ey + 1]); ctx.fill(); }
    };
    const arm = (front) => {
      // (v2.5c) the shoulder rides the chest; the hand rides the body's drop and trails its motion on its own spring
      const ax = shx + (front ? 5 : -6), ay = shy + 3;
      const tx = p[front ? 6 : 8] + hx0 * 0.5 + (front ? Q.lhx : Q.rhx), ty = p[front ? 7 : 9] + Q.sq * 0.8 + (front ? Q.lhy : Q.rhy);
      const k = D.ik(ax, ay, tx, ty, 17, 17, 1);
      ctx.fillStyle = front ? c.tunic : c.tunicD;
      D.limb(ctx, ax, ay, k.jx, k.jy, 8.5, 7); ctx.fill(); if (front) rimS();
      ctx.fillStyle = front ? c.leather : c.leatherD;
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 7.5, 6.5); ctx.fill();
      ctx.beginPath(); ctx.arc(k.ex, k.ey, 4, 0, G.TAU); ctx.fill(); if (front) rimS(1);
      return k;
    };

    leg(false);
    const rear = arm(false);
    // the tunic, the cuirass and its line of gold, the harness strap
    ctx.fillStyle = c.tunic;
    // ((v2.5c) the hips shift under him by hx0; the chest heaves with Q.sh)
    const h0 = hx0;
    D.poly(ctx, [h0 - 10, hip + 8, h0 + 10, hip + 8, shx + 12, shy + 7, shx + 9, shy - 2, shx - 6, shy - 3, shx - 12, shy + 6]); ctx.fill(); rimS();
    ctx.fillStyle = c.leather;
    D.poly(ctx, [h0 - 9, hip - 2, h0 + 9, hip - 2, shx + 10, shy + 8, shx - 10, shy + 7]); ctx.fill();
    ctx.strokeStyle = G.rgba(c.trim, o.shade ? 0.2 : 0.55); ctx.lineWidth = 1.2; D.line(ctx, h0 - 8, hip - 2, h0 + 8, hip - 2);
    ctx.strokeStyle = c.leatherD; ctx.lineWidth = 2.6; D.line(ctx, shx + 8, shy + 1, h0 - 8, hip - 3);
    ctx.fillStyle = c.leatherD; ctx.fillRect(h0 - 10, hip - 5, 20, 5);
    leg(true);
    // the head, under its hood (or the hood down, at the end); (v2.5c) it lags on its neck and nods
    const hood = f.hood == null ? 1 : f.hood, hrot = lean * 0.35 + (p[10] || 0) * 0.6 + Q.nod;
    // (v2.5c) the hood's point, a short chain off the crown, behind the hood
    if (hood > 0.01) {
      const hc = Math.cos(hrot), hs = Math.sin(hrot);
      let px = hx + hc * -8 - hs * -11, py = hy + hs * -8 + hc * -11;
      const up = [], dn = [];
      for (let i = 0; i <= HOOD_N; i++) {
        const a = Q.hood[Math.min(i, HOOD_N - 1)], wd = 3.4 * (1 - i / HOOD_N) + 0.3;
        up.push(px - Math.sin(a) * wd, py + Math.cos(a) * wd); dn.unshift(px + Math.sin(a) * wd, py - Math.cos(a) * wd);
        if (i < HOOD_N) { px += Math.cos(a) * HOOD_SEG; py += Math.sin(a) * HOOD_SEG; }
      }
      ctx.save(); ctx.globalAlpha *= hood;
      ctx.fillStyle = c.hoodD; D.poly(ctx, up.concat(dn)); ctx.fill(); rimS(0.8);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(hrot);
    if (hood < 1) {
      // the face: pale cropped hair, a short beard's shadow, a scar through one brow
      ctx.fillStyle = c.skin;
      D.poly(ctx, [-6, -7, 5, -9, 9, -4, 9.5, 1, 8, 5, 3, 8, -3, 7, -6, 3]); ctx.fill(); rimS(1);
      ctx.fillStyle = c.hair;
      D.poly(ctx, [-8, 1, -8.5, -7, -3, -11.5, 5, -11, 9.5, -6, 6, -7, 1, -6, -4, -4]); ctx.fill();
      ctx.strokeStyle = 'rgba(40,24,18,0.5)'; ctx.lineWidth = 0.9; D.line(ctx, 5.5, -6, 7.5, -1.5);
      ctx.strokeStyle = '#2a1812'; ctx.lineWidth = 1.3; D.line(ctx, 4.4, -2, 8, -1.6);
      if (f.smile) { ctx.beginPath(); ctx.moveTo(3.5, 3.6); ctx.quadraticCurveTo(6, 5.6, 8.4, 3.4); ctx.stroke(); }
    }
    if (hood > 0.01) {
      ctx.globalAlpha *= hood;
      ctx.fillStyle = c.hood;
      D.poly(ctx, [-11, 6, -12, -6, -6, -14, 3, -15, 9, -10, 12, -3, 11, 4, 6, 8, -4, 9]); ctx.fill(); rimS(1);
      ctx.fillStyle = '#0a070c';
      D.poly(ctx, [1, -9, 8, -7, 10.5, -2, 9.5, 4, 5, 6, 1.5, 3]); ctx.fill();
      // the line of his eyes
      const ec = ck > 0.4 ? VOID.boss : o.shade ? '160,110,220' : '255,226,170';
      if (o.real || o.shade) D.glow(ctx, ec, 7, -2.5, 6, 0.6);
      ctx.strokeStyle = G.rgba(ec, 0.95); ctx.lineWidth = 1.4; D.line(ctx, 4.6, -2.8, 9, -2.4);
      if (o.real) f.eye = toWorld(hx + 7, hy - 2.5);
    }
    ctx.restore();
    // what is in his hands
    const lead = arm(true);
    const pose = f.pose;
    if (o.real) f.hand = toWorld(lead.ex, lead.ey);
    // (v2.5c) the weapon's angle on its own spring (Q.wa: the maul trails heavily, the sword lightly)
    const wa = Q.wa != null ? Q.wa : pose === 'bow' && f.wpn === 'bow' ? (f.aim || 0) : p[11];
    if (f.wpn === 'blade') {
      const sheathed = (f.marks > 0) || pose === 'crouch' || pose === 'noto' || pose === 'guard';
      drawWeapon(ctx, 'sheath', h0 - 5, hip - 3, sheathed ? 2.95 : 2.75, 0.95, { marks: f.marks, empty: !sheathed });
      if (!sheathed) drawWeapon(ctx, 'blade', lead.ex, lead.ey, wa, 1.05, {});
    } else if (f.wpn === 'bow') {
      drawWeapon(ctx, 'bow', lead.ex, lead.ey, wa, 1.05, { pull: f.pull, twang: f.twang });
    } else if (f.wpn) {
      drawWeapon(ctx, f.wpn, lead.ex, lead.ey, wa, f.wpn === 'maul' ? 1.25 : 1.05, { charge: f.charge });
    }
    // (where the weapon's end is, for its trail: see B.tick)
    if (o.real) {
      const drawn = f.wpn === 'sword' || f.wpn === 'maul' || (f.wpn === 'blade' && !((f.marks > 0) || pose === 'crouch' || pose === 'noto' || pose === 'guard'));
      const len = f.wpn === 'maul' ? 58 : 46;
      f.tip = drawn ? toWorld(lead.ex + Math.cos(wa) * len, lead.ey + Math.sin(wa) * len) : null;
      f.hilt = drawn ? toWorld(lead.ex + Math.cos(wa) * len * 0.35, lead.ey + Math.sin(wa) * len * 0.35) : null;
    }
    if (f.offerW) drawWeapon(ctx, f.offerW === 'blade' ? 'blade' : f.offerW, lead.ex, lead.ey, p[11] + Math.PI, 1.05, { glow: 0.5 });
    if (f.dual && f.wpn !== 'bow') drawWeapon(ctx, 'blade', rear.ex, rear.ey, wa + 0.5, 1, { col: VOID.boss, hot: VOID.hot });
    ctx.restore();
  }
  function drawTrail(ctx) {
    const tr = B.trail;
    if (tr.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < tr.length; i++) {
      const a = tr[i - 1], c = tr[i];
      // (a blade standing still leaves nothing: only what moves is drawn)
      if (Math.hypot(c.tx - a.tx, c.ty - a.ty) < 3) continue;
      const k = 1 - c.t / 0.14;
      ctx.fillStyle = G.rgba(c.col.hot, 0.5 * k * k);
      D.poly(ctx, [a.hx, a.hy, a.tx, a.ty, c.tx, c.ty, c.hx, c.hy]); ctx.fill();
    }
    ctx.restore();
  }
  function drawGhost(ctx, g) {
    const a = (g.shade ? 0.55 : 0.4) * (1 - g.t / g.life);
    if (a <= 0.01) return;
    drawFig(ctx, g, a, { shade: g.shade });
    D.glow(ctx, g.shade ? VOID.boss : heroOf(g.wpn || 'sword').col, g.x, g.y - 44, 56, a * 0.4);
  }

  // the stones, the sky's crack, the rock he sat on, what he dropped, his afterimages
  function drawCrack(ctx) {
    const k = B.crackK, v = B.voidK, cx = 640, y0 = 24, y1 = FLOOR - 410;
    if (v > 0.01) {
      const g = ctx.createRadialGradient(cx, y1 - 60, 10, cx, y1 - 60, 200 + 600 * v);
      g.addColorStop(0, G.rgba('60,0,14', 0.6 * v)); g.addColorStop(1, 'rgba(10,0,4,0)');
      ctx.fillStyle = g; ctx.fillRect(-80, -80, G.W + 160, FLOOR + 80);
    }
    if (k < 0.01) return;
    const pts = [], r = mulberry(77);
    for (let i = 0; i <= 10; i++) pts.push([cx + (r() - 0.5) * 34 * (i % 2 ? 1 : -1), G.lerp(y0, y1, i / 10)]);
    const n = Math.max(1, Math.round(10 * k));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, col, a] of [[14, VOID.boss, 0.25], [5, VOID.boss, 0.7], [1.6, VOID.hot, 0.95]]) {
      ctx.strokeStyle = G.rgba(col, a); ctx.lineWidth = w;
      ctx.beginPath(); for (let i = 0; i <= n; i++) (i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1])); ctx.stroke();
    }
    ctx.restore();
    // the black pouring from it into him
    const b = B.body;
    if (v > 0.01 && v < 0.999 && b) {
      ctx.save();
      ctx.globalAlpha = Math.sin(Math.PI * v);
      ctx.strokeStyle = 'rgba(8,0,4,0.85)'; ctx.lineWidth = 26 + 10 * Math.sin(G.t * 9);
      ctx.beginPath(); ctx.moveTo(cx, y1); ctx.quadraticCurveTo((cx + b.x) / 2, y1 + 40, b.x, b.y - 60); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(VOID.boss, 0.5); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, y1); ctx.quadraticCurveTo((cx + b.x) / 2, y1 + 40, b.x, b.y - 60); ctx.stroke();
      ctx.restore();
    }
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function drawStones(ctx, glowOnly) {
    const pal = G.pal();
    for (const s of B.stones) {
      const top = FLOOR - s.h, sy = top + 20, t = bossTint(s.id), lit = s.lit;
      if (!glowOnly) {
        ctx.fillStyle = pal.pillar;
        D.poly(ctx, [s.x - 22, FLOOR + 4, s.x - 18, top + 10, s.x - 10, top, s.x + 12, top + 2, s.x + 19, top + 12, s.x + 22, FLOOR + 4]); ctx.fill();
        ctx.strokeStyle = G.rgba(pal.rim, 0.2); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(s.x, sy, 8, 0, G.TAU); ctx.fill();
        ctx.strokeStyle = G.rgba(lit > 0.05 ? t.boss : pal.rim, lit > 0.05 ? 0.8 : 0.18); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(s.x, sy, 9, 0, G.TAU); ctx.stroke();
      }
      const g = lit * (0.75 + 0.25 * Math.sin(G.t * 2 + s.x)) + s.flare;
      if (g > 0.02) {
        D.glow(ctx, t.boss, s.x, sy, 34 + 50 * s.flare, Math.min(1, g) * 0.8);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = G.rgba(t.hot, Math.min(1, g)); ctx.beginPath(); ctx.arc(s.x, sy, 5.5, 0, G.TAU); ctx.fill();
        ctx.restore();
      }
    }
  }
  // the picture each stone throws up as it wakes
  function drawVig(ctx, v) {
    const k = v.t / 1.4, a = Math.sin(Math.PI * Math.min(1, k)), t = bossTint(v.id), x = v.x, y = v.y - 24 * k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    D.glow(ctx, t.boss, x, y, 50, 0.5 * a);
    ctx.strokeStyle = G.rgba(t.hot, 0.9 * a); ctx.fillStyle = G.rgba(t.hot, 0.85 * a); ctx.lineWidth = 2;
    if (v.id === 'warden') {
      ctx.beginPath(); ctx.arc(x, y, 12, 0, G.TAU); ctx.stroke();
      for (let i = 0; i < 12; i++) { const q = i / 12 * G.TAU + G.t; D.line(ctx, x + Math.cos(q) * 16, y + Math.sin(q) * 16, x + Math.cos(q) * 24, y + Math.sin(q) * 24); }
    } else if (v.id === 'mage') {
      for (let i = 0; i < 3; i++) { const q = i / 3 * G.TAU + G.t * 2, px = x + Math.cos(q) * 16, py = y + Math.sin(q) * 10; D.poly(ctx, [px, py - 8, px + 3, py, px, py + 8, px - 3, py]); ctx.fill(); }
    } else if (v.id === 'assassin') {
      ctx.beginPath(); ctx.arc(x, y, 14, -1.2, 1.9); ctx.arc(x + 6, y - 2, 11, 1.7, -1.0, true); ctx.closePath(); ctx.fill();
    } else if (v.id === 'knight') {
      ctx.save(); ctx.translate(x, y - 22); ctx.rotate(Math.PI / 2); drawWeapon(ctx, 'sword', 0, 0, 0, 1, { col: t.boss, hot: t.hot }); ctx.restore();
    } else if (v.id === 'wolf') {
      ctx.beginPath(); ctx.arc(x, y, 15, 0, G.TAU); ctx.fill();
    } else if (v.id === 'leviathan') {
      ctx.beginPath(); ctx.moveTo(x - 22, y + 8); ctx.quadraticCurveTo(x - 6, y - 22, x + 10, y - 6); ctx.quadraticCurveTo(x + 2, y - 4, x + 4, y + 8); ctx.stroke();
    } else if (v.id === 'kairo') {
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 9 - 5, y + 10); ctx.quadraticCurveTo(x + i * 9, y - 18 - 6 * Math.sin(G.t * 9 + i), x + i * 9 + 5, y + 10); ctx.closePath(); ctx.fill(); }
    } else { ctx.beginPath(); ctx.arc(x, y, 10, 0, G.TAU); ctx.stroke(); }
    ctx.restore();
  }

  B.drawGround = function (ctx) {
    drawCrack(ctx);
    drawStones(ctx, false);
    if (B.vig) drawVig(ctx, B.vig);
    // the rock he sat on
    const pal = G.pal();
    ctx.fillStyle = pal.pillar;
    D.poly(ctx, [846, FLOOR + 4, 850, FLOOR - 16, 864, FLOOR - 24, 892, FLOOR - 26, 910, FLOOR - 18, 916, FLOOR + 4]); ctx.fill();
    ctx.strokeStyle = G.rgba(pal.rim, 0.25); ctx.lineWidth = 1.2; ctx.stroke();
    if (B.dead) return;
    const b = B.body, L = B.loose;
    if (L) {
      const ang = L.stuck ? Math.PI / 2 : L.spin;
      drawWeapon(ctx, L.w === 'blade' ? 'blade' : L.w, L.x - (L.stuck ? 0 : 0), L.y - (L.stuck ? 22 : 0), ang, 1.05, { glow: 0.4 });
    }
    if (!b.hidden && b.fade > 0.01) {
      const k = G.clamp(1 - (FLOOR - b.y) / 400, 0.2, 1);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.42 * k * b.fade) + ')';
      ctx.beginPath(); ctx.ellipse(b.x, FLOOR + 3, 30 * k, 6 * k, 0, 0, G.TAU); ctx.fill();
    }
    for (const g of B.ghosts) drawGhost(ctx, g);
    if (B.cutLine) {
      const c = B.cutLine, a = 1 - c.t / 0.45, col = heroOf('blade');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(col.col, 0.5 * a); ctx.lineWidth = 8 * a + 2; D.line(ctx, c.x0, c.y, c.x1, c.y);
      ctx.strokeStyle = G.rgba(col.hot, 0.95 * a); ctx.lineWidth = 2; D.line(ctx, c.x0, c.y, c.x1, c.y);
      ctx.restore();
    }
    for (const th of B.threads) {
      const rp = rackPoint(ownW()) || { x: b.x, y: b.y - 60 }, q = Math.min(1, th.t / 0.4), a = 1 - Math.max(0, (th.t - 0.4) / 0.3);
      const ex = G.lerp(th.x, rp.x, q), ey = G.lerp(th.y, rp.y, q);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(th.col, 0.7 * a); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(th.x, th.y); ctx.quadraticCurveTo((th.x + ex) / 2, Math.min(th.y, ey) - 60, ex, ey); ctx.stroke();
      D.glow(ctx, th.col, ex, ey, 20, a);
      ctx.restore();
    }
  };
  B.draw = function (ctx) {
    if (B.dead) return;
    const b = B.body;
    if (b.hidden || b.fade <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = b.fade;
    const c = b.corruptK > 0.55 ? CB : CL;
    for (let i = 2; i >= 0; i--) {
      ctx.fillStyle = i ? c.cloakD : c.cloak;
      D.ribbon(ctx, B.cloak[i], 12 - i * 2, 7 - i, 3); ctx.fill();
      ctx.strokeStyle = G.rgba(b.corruptK > 0.55 ? VOID.boss : G.pal().rim, 0.18); ctx.lineWidth = 1; ctx.stroke();
    }
    drawTrail(ctx);
    drawFig(ctx, b, 1, { real: true });
    if (b.orb > 0) {
      const t = bossTint('kairo');
      D.glow(ctx, t.boss, b.x + b.face * 22, b.y - 48, 20 + 30 * b.orb, 0.9);
      ctx.fillStyle = G.rgba(t.hot, 0.9); ctx.beginPath(); ctx.arc(b.x + b.face * 22, b.y - 48, 4 + 7 * b.orb, 0, G.TAU); ctx.fill();
    }
    drawBolts(ctx);
    ctx.restore();
  };
  function drawBolts(ctx) {
    if (!B.bolts.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
    for (const [w, col, a] of [[3, VOID.boss, 0.35], [1.2, VOID.hot, 0.9]]) {
      ctx.strokeStyle = G.rgba(col, a); ctx.lineWidth = w;
      ctx.beginPath();
      for (const pts of B.bolts) pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.stroke();
    }
    ctx.restore();
  }
  // over the arena and him, under the hero: the dark of phase III, with only the hero's own light and
  // his rack's glows left in it; then the Black Dawn
  B.drawOver = function (ctx) {
    const b = B.body, P = G.player;
    if (!b) return;
    if (B.darkK > 0.01) {
      const segs = Math.floor((P.ember || 0) / G.PLAYER.SEG), r = 130 + 45 * segs;
      const a = 0.94 * B.darkK * (1 - 0.75 * B.reveal);
      const g = ctx.createRadialGradient(P.x, P.y - 30, r * 0.3, P.x, P.y - 30, r);
      g.addColorStop(0, 'rgba(2,0,3,0)'); g.addColorStop(1, 'rgba(2,0,3,' + a + ')');
      ctx.fillStyle = g; ctx.fillRect(-80, -80, G.W + 160, G.H + 160);
      if (B.reveal > 0.02) { ctx.fillStyle = G.rgba(VOID.hot, 0.06 * B.reveal); ctx.fillRect(-80, -80, G.W + 160, G.H + 160); }
      // what still shows in it
      drawStones(ctx, true);
      if (!B.dead && b.fade > 0.01) {
        drawFig(ctx, b, (0.14 + 0.7 * B.reveal) * B.darkK * b.fade, { real: true });
        for (const w of WPN) {
          const q = b.rack && b.rack[w], k = B.rackK[w];
          if (q && k > 0.02) { D.glow(ctx, heroOf(w).col, q.x, q.y, 34, k); D.glow(ctx, heroOf(w).hot, q.x, q.y, 10, k); }
        }
        if (b.marks > 0) D.glow(ctx, b.marks >= 3 ? '255,214,140' : heroOf('blade').col, b.x - b.face * 4, b.y - 36, 10 + 7 * b.marks, 0.95);
        if (b.eye && b.hood > 0.5) D.glow(ctx, VOID.boss, b.eye.x, b.eye.y, 9, 0.9);
        if (b.wpn === 'maul' && b.charge > 0 && b.hand) D.glow(ctx, heroOf('maul').col, b.hand.x, b.hand.y - 30, 30 + 30 * b.charge, b.charge);
        if (b.wpn === 'bow' && b.pull > 0 && b.hand) D.glow(ctx, heroOf('bow').col, b.hand.x, b.hand.y, 18, b.pull);
        drawBolts(ctx);
      }
      for (const gh of B.ghosts) D.glow(ctx, gh.shade ? VOID.boss : heroOf(gh.wpn || 'sword').col, gh.x, gh.y - 44, 40, 0.5 * (1 - gh.t / gh.life));
    }
    const bd = B.bd;
    if (bd) drawDawn(ctx, bd, b, P);
  };
  function drawDawn(ctx, bd, b, P) {
    const y = b.y - 58, l = Math.min(bd.from, bd.front), r = Math.max(bd.from, bd.front);
    const hgt = bd.state === 'break' ? 20 : 46;
    ctx.save();
    // the black of it, with its burning edges
    ctx.fillStyle = 'rgba(6,0,4,0.94)';
    ctx.beginPath(); ctx.moveTo(l, y - hgt * 0.6);
    for (let x = l; x <= r; x += 16) ctx.lineTo(x, y - hgt - 6 * Math.sin(x * 0.05 + G.t * 20));
    ctx.lineTo(r, y + hgt * 0.6);
    for (let x = r; x >= l; x -= 16) ctx.lineTo(x, y + hgt + 6 * Math.sin(x * 0.06 - G.t * 18));
    ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(VOID.boss, 0.8); ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = G.rgba(VOID.boss, 0.35); ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const yy = y - hgt * 0.8 + i * hgt * 0.23, off = (G.t * 1400 + i * 97) % Math.max(1, r - l);
      const x = bd.dir > 0 ? l + off : r - off;
      D.line(ctx, x, yy, x + bd.dir * 70, yy);
    }
    D.glow(ctx, VOID.boss, bd.from, y, 70, 0.7);
    // your light holding it
    if (bd.hx != null && bd.state === 'hold') {
      const hc = G.hero();
      const hg = ctx.createLinearGradient(bd.hx, 0, bd.front, 0);
      hg.addColorStop(0, G.rgba(hc.col, 0.55)); hg.addColorStop(1, G.rgba(hc.col, 0.2));
      ctx.fillStyle = hg;
      D.poly(ctx, [bd.hx, y - 6, bd.front, y - hgt - 10, bd.front, y + hgt + 10, bd.hx, y + 6]); ctx.fill();
      D.glow(ctx, hc.hot, bd.front, y, 70 + 10 * Math.sin(G.t * 30), 0.7);
      // a flash running down the black to meet it, and the ring that closes as it comes
      const fl = bd.flash;
      if (fl) {
        const q = Math.min(1, fl.t / fl.run), fx = G.lerp(bd.from, bd.front, q);
        D.glow(ctx, VOID.hot, fx, y, 46, 0.95);
        ctx.strokeStyle = G.rgba(VOID.hot, 0.9); ctx.lineWidth = 3; D.line(ctx, fx, y - hgt - 8, fx, y + hgt + 8);
        const rr = RING_IN + 80 * (1 - q);
        // The closing ring turns gold for exactly the press window (and holds on the meeting ring until
        // it shuts), on every difficulty: the window itself is what narrows on Merciless.
        const open = !fl.done && fl.t >= fl.run - fl.win;
        if (!fl.done && !open) {
          ctx.strokeStyle = G.rgba(hc.hot, 0.35 + 0.6 * q); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(bd.front, y, rr, 0, G.TAU); ctx.stroke();
        }
        ctx.strokeStyle = G.rgba(fl.done ? (fl.won ? hc.hot : VOID.boss) : '255,255,255', 0.9); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(bd.front, y, RING_IN, 0, G.TAU); ctx.stroke();
        if (open) {
          // drawn plainly over the glow of the meeting, with a dark edge, so it reads as gold, not white
          ctx.globalCompositeOperation = 'source-over';
          ctx.beginPath(); ctx.arc(bd.front, y, rr, 0, G.TAU);
          ctx.strokeStyle = 'rgba(40,16,0,0.7)'; ctx.lineWidth = 10; ctx.stroke();
          ctx.strokeStyle = G.rgba(DAWN_GOLD, 1); ctx.lineWidth = 6; ctx.stroke();
          ctx.globalCompositeOperation = 'lighter';
          D.glow(ctx, DAWN_GOLD, bd.front, y, rr + 30, 0.5);
        }
      }
      // the key to press, over where they meet
      ctx.globalCompositeOperation = 'source-over';
      const label = G.input.device === 'gamepad' ? 'X' : G.input.label('attack');
      const kx = bd.front, ky = y - hgt - 52 - 4 * Math.sin(G.t * 4), w = Math.max(40, 18 + 13 * label.length), h = 40;
      G.roundRect(ctx, kx - w / 2, ky - h / 2, w, h, 8);
      ctx.fillStyle = 'rgba(8,6,16,0.88)'; ctx.fill();
      ctx.strokeStyle = G.rgba(fl && !fl.done ? hc.hot : hc.col, 0.95); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = G.rgba(hc.hot, 1);
      ctx.font = '700 21px Bahnschrift, "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, kx, ky + 1);
      // the three flashes: won, lost, still to come
      for (let i = 0; i < 3; i++) {
        const px = kx + (i - 1) * 16, py = ky + h / 2 + 12, res = bd.results[i];
        ctx.fillStyle = res === true ? G.rgba(hc.hot, 1) : res === false ? G.rgba(VOID.boss, 1) : 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.arc(px, py, 4, 0, G.TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ music (audio.js plays B.music)
  // The camp's own progression (Dm Bb F C), slow, on bells: phase I is the bells and a held pad over
  // a soft drum, like a memory of the road. Phase II brings drums and a horn. In the dark the chords
  // turn (Dm Bb Gm A) and a snare drives it.
  const CB1 = [{ root: 38, pad: [50, 53, 57] }, { root: 34, pad: [46, 50, 53] }, { root: 41, pad: [53, 57, 60] }, { root: 36, pad: [48, 52, 55] }];
  const CB3 = [{ root: 38, pad: [50, 53, 57] }, { root: 34, pad: [46, 50, 53] }, { root: 43, pad: [55, 58, 62] }, { root: 33, pad: [45, 49, 52] }];
  const BELL = [
    [74, -1, -1, -1, 77, -1, 76, -1, 74, -1, -1, -1, 69, -1, -1, -1],
    [70, -1, -1, -1, 74, -1, 72, -1, 70, -1, 69, -1, 65, -1, -1, -1],
    [72, -1, -1, -1, 77, -1, -1, 76, 72, -1, -1, -1, 69, -1, 72, -1],
    [72, -1, -1, -1, 76, -1, 74, -1, 72, -1, -1, -1, 67, -1, -1, -1],
  ];
  const BELL3 = [
    [74, -1, 77, -1, 81, -1, 77, -1, 74, -1, 77, -1, 81, -1, 82, -1],
    [82, -1, 77, -1, 74, -1, 77, -1, 82, -1, 81, -1, 77, -1, 74, -1],
    [79, -1, 82, -1, 86, -1, 82, -1, 79, -1, 82, -1, 86, -1, 84, -1],
    [81, -1, 76, -1, 73, -1, 76, -1, 81, -1, 79, -1, 76, -1, 73, -1],
  ];
  B.music = function (step, t, sd, I, M) {
    const n = (step >> 4) & 3, s = step & 15, dest = M.dest, dk = I >= 3;
    const bar = (dk ? CB3 : CB1)[n];
    // the clash: only a drone and a heartbeat
    if (B.bd && B.bd.state === 'hold') {
      if (s === 0) M.tone({ at: t, type: 'sawtooth', f0: M.mtof(bar.root - 12), dur: sd * 16, vol: 0.05, dest });
      if (s === 0 || s === 3 || s === 8 || s === 11) M.tone({ at: t, f0: 70, f1: 40, dur: 0.2, vol: s % 8 ? 0.25 : 0.4, dest });
      return;
    }
    if (s === 0) M.pad(bar, t, sd * 16, I);
    const bl = (dk ? BELL3 : BELL)[n][s];
    if (bl > 0) {
      M.tone({ at: t, type: 'sine', f0: M.mtof(bl), dur: sd * (dk ? 3 : 6), vol: dk ? 0.05 : 0.07, dest });
      M.tone({ at: t, type: 'sine', f0: M.mtof(bl) * 2.76, dur: sd * 2, vol: 0.014, dest });
    }
    if (s === 0 || (s === 8 && I >= 1)) M.tone({ at: t, type: 'sine', f0: 120, f1: 55, dur: 0.3, vol: 0.32, dest });
    if (s % 4 === 0) M.bass(bar.root, t, sd * (I >= 2 ? 1.6 : 3));
    if (I >= 2) {
      if (s === 6 || s === 10 || s === 14) { M.tone({ at: t, type: 'sine', f0: 90, f1: 42, dur: 0.4, vol: 0.42, dest }); M.noise({ at: t, dur: 0.08, vol: 0.1, type: 'lowpass', f0: 900, dest }); }
      if (s % 2 === 1) M.hat(t, 0.02 + 0.01 * I);
      if (s === 4 || s === 12) for (const m of bar.pad) M.tone({ at: t, type: 'sawtooth', f0: M.mtof(m), dur: sd * 2.4, vol: 0.022, attack: 0.04, dest });
    }
    if (dk) {
      if (s === 4 || s === 12) M.snare(t, 1);
      if (s % 2 === 0) M.tone({ at: t, type: 'triangle', f0: M.mtof(bar.pad[(s >> 1) % 3] + 12), dur: sd, vol: 0.026, dest });
      if (s === 0) M.tone({ at: t, type: 'sawtooth', f0: M.mtof(bar.root - 12), dur: sd * 16, vol: 0.035, dest });
    }
  };

  G.makeBoss(B);
  // (not in G.BOSS_IDS: he is never a trial; rest.js opens his doorway and game.js brings you back)
  G.champ = {
    ownW, beaten: runBeaten,
    // him sitting in his doorway on the road (rest.js), hood up, all four on his back
    drawSeated(ctx, x, y, face, alpha) {
      drawFig(ctx, { x, y, face, p: POSES.sit, wpn: null, marks: 0, pull: 0, hood: 1, corruptK: 0, pose: 'sit', rigQ: seatedQ() }, alpha, {});
    },
  };
})();
