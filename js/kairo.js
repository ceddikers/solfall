// Solfall - Kairo, the Canyon Fist (v2.4a): a martial artist a head taller than the hero, built from
// the user's brief (the Claude Doc "Solfall boss brief"). He comes to spar and ends up fighting for
// his life: each phase he powers up and takes the hero more seriously.
//   I   The duel. Punch combos that all open the same way and show their ending on the third punch,
//       the Sunwell Wave, the Hailfire barrage, the spin throw. He blinks only to move about.
//   II  Risen: a gold aura with lightning in it, everything faster. The Wave can warp behind you,
//       combos can fire a one-hand beam, and Flare Up, Meteor Smash and Twin Comets join. His blows
//       crack the ridge (eight slabs of rock) and a slab cracked three times falls away.
//   III Still Sky: he falls as if beaten and rises with three quarters of his strength back and the
//       phase marks gone, in a thin white aura. The Gathered Sun first (break its bar and he throws it
//       early, smaller); standing still he slips blows aimed at his front; Empty Hand, the Sweeping
//       Wave, Meteor Heel; and at the end the Last Wave, a beam struggle.
'use strict';
(function () {
  const { wait, tween } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards, K = G.kit, D = G.draw, DANGER = G.COL.danger;
  const WL = G.WALL_L, WR = G.WALL_R;
  const WAVE = { boss: '120,190,255', hot: '232,246,255' }; // the Sunwell Wave's blue
  const SUN = { boss: '255,196,104', hot: '255,248,226' };  // the Gathered Sun
  const ROCK = { boss: '150,118,92', hot: '226,204,176' };  // rock torn up and thrown down
  const SUN_BAR = 200; // the Gathered Sun's own bar: steady hits from a bare hero break it in about four seconds

  // ------------------------------------------------------------------ sounds
  const AU = G.audio, S = AU.synth;
  // a punch: cloth snapping taut and a dull knock (o.vol: the phase III combos are quieter)
  AU.define('kSnap', (o) => { const v = (o && o.vol) || 1; S.noise({ dur: 0.05, vol: 0.3 * v, type: 'highpass', f0: 2600 }); S.tone({ type: 'sine', f0: 150, f1: 70, dur: 0.07, vol: 0.22 * v }); });
  // the kick ending's tell: a sharp breath in
  AU.define('kBreath', () => { S.noise({ dur: 0.2, vol: 0.22, type: 'bandpass', f0: 900, f1: 2400, q: 1.4, attack: 0.12 }); });
  // a hand gathering a wave: a hum that climbs (o.dur)
  AU.define('kHum', (o) => {
    const d = (o && o.dur) || 0.5, v = (o && o.vol) || 1;
    S.tone({ type: 'sine', f0: 260, f1: 780, dur: d, vol: 0.14 * v, attack: d * 0.6 });
    S.tone({ type: 'triangle', f0: 520, f1: 1560, dur: d, vol: 0.05 * v, attack: d * 0.6 });
  });
  // the Sunwell Wave gathering between both hands
  AU.define('kCharge', (o) => {
    const d = (o && o.dur) || 1.4;
    S.tone({ type: 'sine', f0: 110, f1: 440, dur: d, vol: 0.22, attack: d * 0.7 });
    S.tone({ type: 'triangle', f0: 220, f1: 880, dur: d, vol: 0.08, attack: d * 0.8 });
    S.noise({ dur: d, vol: 0.1, type: 'bandpass', f0: 400, f1: 2200, q: 2, attack: d * 0.7 });
  });
  // and let go
  AU.define('kWave', (o) => {
    const v = (o && o.vol) || 1, d = (o && o.dur) || 0.9;
    S.noise({ dur: d, vol: 0.42 * v, type: 'lowpass', f0: 3200, f1: 600, attack: 0.02 });
    S.tone({ type: 'sawtooth', f0: 90, f1: 60, dur: d, vol: 0.14 * v });
    S.tone({ type: 'sine', f0: 60, f1: 34, dur: d * 0.7, vol: 0.36 * v });
  });
  // a blink: the crack of a whip
  AU.define('kCrack', () => { S.noise({ dur: 0.035, vol: 0.42, type: 'highpass', f0: 4200 }); S.tone({ type: 'square', f0: 2400, f1: 900, dur: 0.03, vol: 0.06 }); });
  // the spin throw's grip
  AU.define('kGrab', () => { S.noise({ dur: 0.08, vol: 0.32, type: 'lowpass', f0: 1800, f1: 500 }); S.tone({ type: 'sine', f0: 120, f1: 80, dur: 0.12, vol: 0.3 }); });
  // the ground lifting round him: a rumble that climbs (o.dur)
  AU.define('kRumble', (o) => { const d = (o && o.dur) || 1; S.tone({ type: 'sine', f0: 36, f1: 70, dur: d, vol: 0.3, attack: d * 0.5 }); S.noise({ dur: d, vol: 0.18, type: 'lowpass', f0: 180, f1: 520, attack: d * 0.4 }); });
  // the aura roaring up
  AU.define('kRoar', (o) => {
    const d = (o && o.dur) || 1.2;
    S.noise({ dur: d, vol: 0.34, type: 'bandpass', f0: 300, f1: 1400, q: 0.7, attack: 0.08 });
    S.tone({ type: 'sawtooth', f0: 70, f1: 110, dur: d, vol: 0.1, attack: 0.1 });
    S.noise({ dur: d * 0.8, vol: 0.08, type: 'highpass', f0: 5000, attack: 0.1 });
  });
  // a crackle of his lightning
  AU.define('kBolt', () => { S.noise({ dur: 0.07, vol: 0.1, type: 'highpass', f0: 3600 }); S.tone({ type: 'square', f0: 1800, f1: 600, dur: 0.04, vol: 0.025 }); });
  // coming down from the sky: a whistle that rises (o.dur)
  AU.define('kWhistle', (o) => { const d = (o && o.dur) || 1; S.tone({ type: 'sine', f0: 500, f1: 1900, dur: d, vol: 0.12, attack: d * 0.8 }); S.noise({ dur: d, vol: 0.08, type: 'bandpass', f0: 800, f1: 3000, q: 3, attack: d * 0.8 }); });
  // the Gathered Sun drawing in: a deep drone that rises for as long as it takes (o.dur)
  AU.define('kDrone', (o) => {
    const d = (o && o.dur) || 7;
    S.tone({ type: 'sawtooth', f0: 40, f1: 80, dur: d, vol: 0.1, attack: d * 0.9 });
    S.tone({ type: 'sine', f0: 80, f1: 160, dur: d, vol: 0.16, attack: d * 0.9 });
    S.noise({ dur: d, vol: 0.1, type: 'lowpass', f0: 200, f1: 1200, attack: d * 0.9 });
  });
  // one breath of a laugh
  AU.define('kLaugh', () => { for (let i = 0; i < 3; i++) S.noise({ dur: 0.07, vol: 0.12 - i * 0.03, type: 'bandpass', f0: 700, q: 2, delay: i * 0.11 }); });
  // an energy ball loosed
  AU.define('kShot', () => { S.tone({ type: 'triangle', f0: 900, f1: 300, dur: 0.09, vol: 0.08 }); S.noise({ dur: 0.05, vol: 0.08, type: 'highpass', f0: 3000 }); });
  // rock giving way: a crack, then the fall (o.vol)
  AU.define('kRock', (o) => {
    const v = (o && o.vol) || 1;
    S.noise({ dur: 0.06, vol: 0.34 * v, type: 'highpass', f0: 1800 });
    S.tone({ type: 'square', f0: 220, f1: 70, dur: 0.09, vol: 0.07 * v });
    S.noise({ dur: 0.5, vol: 0.2 * v, type: 'lowpass', f0: 600, f1: 120, delay: 0.04 });
  });
  AU.vary.kSnap = 2; AU.vary.kShot = 3; AU.vary.kRock = 2; AU.vary.kBolt = 3; AU.vary.kCrack = 1;

  // ------------------------------------------------------------------ the arena: an old canyon
  G.THEMES.kairo = [null,
    {
      name: 'SPARRING', scene: 'canyon',
      sky: ['#0c0a1c', '#2c1c34', '#7a3c34', '#e2945c'],
      far: '#3a2230', near: '#24151e', pillar: '#170d14', rim: '255,176,120',
      floorTop: '#4a3226', floor: '#1a100c',
      boss: '255,170,96', hot: '255,238,210', ember: '255,190,130', stars: 0.25,
    },
    {
      name: 'RISEN', scene: 'canyon',
      sky: ['#06050a', '#1c1626', '#4a3424', '#c8a050'],
      far: '#251c1c', near: '#161012', pillar: '#0c0809', rim: '255,214,110',
      floorTop: '#43382a', floor: '#14100a',
      boss: '255,214,90', hot: '255,248,214', ember: '255,220,120', stars: 0.05,
    },
    {
      name: 'STILL SKY', scene: 'canyon',
      sky: ['#020308', '#0a0e1c', '#1c2438', '#a8b8d4'],
      far: '#121626', near: '#0a0d18', pillar: '#05060c', rim: '210,226,255',
      floorTop: '#2c3242', floor: '#0a0c14',
      boss: '226,236,255', hot: '255,255,255', ember: '200,220,255', stars: 0.7,
    }, G.THEMES.warden[4]];
  G.arena.WEATHER.kairo = { kind: 'ash', n: 46 }; // canyon dust
  G.arena.BIRDS.kairo = 'crow';
  G.arena.LAYOUTS.kairo = {
    2: [[214, 120, 474], [946, 120, 474]], // two shelves of rock torn up by his aura
    3: [[560, 160, 462]],                  // one, under the Still Sky
  };

  // The canyon: cloud banks lit from below, mesas with flat tops and banded cliffs, an arch, hoodoos.
  G.SCENES.canyon = function (x, P, F, lcg) {
    const L = -60, R = G.W + 60;
    let r = lcg(5);
    // cloud banks
    for (let i = 0; i < 8; i++) {
      const cx = L + r() * (R - L), cy = 70 + r() * 190, w = 200 + r() * 280, h = 22 + r() * 26;
      x.fillStyle = 'rgba(0,0,0,0.16)';
      for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(cx + (k - 2) * w * 0.18, cy - Math.sin(k * 1.3) * h * 0.4, w * 0.24, h * (0.7 + 0.3 * Math.sin(k * 2.1 + i)), 0, 0, G.TAU); x.fill(); }
      const g = x.createLinearGradient(0, cy - h, 0, cy + h);
      g.addColorStop(0, G.rgba(P.rim, 0)); g.addColorStop(1, G.rgba(P.rim, 0.1));
      x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy + h * 0.2, w * 0.5, h * 0.7, 0, 0, G.TAU); x.fill();
    }
    // a mesa: talus slopes, sheer banded cliffs, a flat notched top lit along its edge
    function mesa(x0, w, top, col, seed, bands) {
      const q = lcg(seed), base = F + 10, h = base - top;
      const pts = [x0, base, x0 + w * 0.1, top + h * 0.55, x0 + w * 0.16, top + h * 0.1, x0 + w * 0.17, top];
      for (let k = 1; k < 6; k++) pts.push(x0 + w * (0.17 + k * 0.13), top + (q() < 0.35 ? q() * 8 : 0));
      pts.push(x0 + w * 0.84, top, x0 + w * 0.85, top + h * 0.12, x0 + w * 0.9, top + h * 0.55, x0 + w, base);
      x.fillStyle = col;
      x.beginPath(); for (let i = 0; i < pts.length; i += 2) { if (i) x.lineTo(pts[i], pts[i + 1]); else x.moveTo(pts[i], pts[i + 1]); } x.closePath(); x.fill();
      x.strokeStyle = G.rgba(P.rim, 0.22); x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(x0 + w * 0.17, top); x.lineTo(x0 + w * 0.84, top); x.stroke();
      for (let k = 1; k <= bands; k++) {
        const y = top + k * (h * 0.42 / bands);
        x.strokeStyle = G.rgba(P.rim, 0.035 + 0.03 * (k % 2)); x.lineWidth = 2;
        x.beginPath(); x.moveTo(x0 + w * 0.165, y); x.lineTo(x0 + w * 0.845, y); x.stroke();
      }
    }
    mesa(-40, 360, F - 250, P.far, 3, 6);
    mesa(700, 420, F - 280, P.far, 7, 7);
    mesa(1030, 300, F - 210, P.far, 9, 5);
    // a natural arch between them
    x.fillStyle = P.far;
    x.beginPath(); x.moveTo(330, F + 10); x.lineTo(350, F - 170); x.quadraticCurveTo(470, F - 250, 600, F - 165); x.lineTo(620, F + 10);
    x.lineTo(575, F + 10); x.lineTo(565, F - 140); x.quadraticCurveTo(470, F - 200, 395, F - 140); x.lineTo(385, F + 10); x.closePath(); x.fill();
    x.strokeStyle = G.rgba(P.rim, 0.2); x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(350, F - 170); x.quadraticCurveTo(470, F - 250, 600, F - 165); x.stroke();
    // nearer buttes and hoodoos
    mesa(140, 230, F - 150, P.near, 13, 4);
    mesa(880, 260, F - 130, P.near, 17, 4);
    r = lcg(23);
    for (let i = 0; i < 7; i++) {
      const hx = 60 + r() * 1160, hh = 50 + r() * 80, hw = 7 + r() * 7;
      x.fillStyle = P.pillar;
      x.beginPath(); x.moveTo(hx - hw, F + 10); x.lineTo(hx - hw * 0.6, F - hh); x.lineTo(hx + hw * 0.6, F - hh); x.lineTo(hx + hw, F + 10); x.closePath(); x.fill();
      x.beginPath(); x.ellipse(hx, F - hh - 4, hw * 1.3, 7, 0, 0, G.TAU); x.fill();
      x.fillStyle = G.rgba(P.rim, 0.12); x.fillRect(hx - hw * 1.2, F - hh - 6, hw * 2.4, 1.5);
    }
  };

  // ------------------------------------------------------------------ the boss
  const B = {
    id: 'kairo', name: 'KAIRO, THE CANYON FIST', short: 'Kairo', theme: 'kairo',
    sub: 'He came to spar', taunt: 'he wants another round',
    blurb: 'A martial artist who powers up as the fight goes on',
    tips: [
      'Every punch combo starts the same way. Watch the third punch: hips turning with a sharp breath, kicks are coming; a hand dropped glowing to his hip with a hum, a short beam; nothing, and he is open.',
      'The kicks reach further than his fists and the last one rises over your head. Dash through to his back: he lands facing away.',
      'If he jumps at you with his hands open, it is a throw, not a dash. Dashing does not save you; jump over him or be out of reach.',
      'The Sunwell Wave follows you until it holds. Be in the air when it holds and it goes over you as you land, or get round behind him (it only aims in front) and strike while it plays out. If the orb pulses twice, he is holding it: wait.',
      'In his gold aura the Wave can warp. When the charge hum cuts off with a crack, he is about to appear behind you: turn and dash through him.',
      'His blows crack the ridge. A slab cracked three times falls away, and a fall costs you. Choose where you let him transform: the slab under him goes.',
      'Break the Gathered Sun\'s bar fast: the sooner he has to throw it, the smaller it is, the smaller the crater, and the longer he is spent after.',
      'In the Still Sky he slips blows to his front when he stands waiting. Strike from behind, or while he recovers.',
      'Eyes shut and nothing moving: do not touch him. Be ready to dash when they open.',
    ],
    hudCols: [null, ['#ff9a56', '#ffe0b8'], ['#ffd040', '#fff4c4'], ['#c8dcff', '#ffffff']],
    BASE_HP: 2700, poise0: 330, w: 40, h: 88,
    answer: 'knee', antiAir: 'palm', finale: 'lastwave',
    gaps: [0, 0.8, 0.62, 0.52],
    bags: {
      1: ['combo', 'combo', 'combo', 'combo', 'throw', 'throw', 'wave', 'wave', 'hailfire'],
      2: ['combo', 'combo', 'combo', 'combo', 'throw', 'throw', 'wave', 'wave', 'hailfire', 'flare', 'meteor', 'comets'],
      3: ['combo', 'combo', 'combo', 'combo', 'sweep', 'sweep', 'throw', 'empty', 'empty', 'heel', 'comets', 'hailfire'],
    },
    cards: { 2: ['RISEN', 'Now he means it'], 3: ['STILL SKY', 'Every movement has a meaning'] },
    first: { 1: 'combo', 2: 'risen', 3: 'sun' },
    // his corrupted self's own (corrupt.js): the Scorched Wave, the Black Sun (it opens phase II) and the Shadow Partner
    corruptBags: { 1: ['scorch'], 2: ['scorch', 'blacksun', 'partner'], 3: ['scorch', 'partner'] },
    bpm: [84, 108, 124, 138], // his own music's tempos (see B.music)
  };
  // how long each punish window lasts, by phase: about two thirds in II, half in III
  const PW = () => [0, 1, 0.67, 0.5][B.phase];

  // ------------------------------------------------------------------ poses
  // lean, hip height, front foot (x, y), back foot (x, y), lead fist (x, y), rear fist (x, y), look
  // (the head's tilt; below 0 looking up). Facing right, from the point between his feet.
  const NP = 11;
  const POSES = {
    idle: [0.1, -44, 14, 0, -15, 0, 22, -72, 9, -66, 0],
    dashLow: [0.55, -35, 20, 0, -27, -5, 24, -56, 12, -52, 0],
    tap: [0.18, -43, 15, 0, -15, 0, 36, -73, 9, -66, 0],
    jab: [0.26, -42, 20, 0, -18, 0, 42, -70, 7, -66, 0],
    cross: [0.36, -41, 22, 0, -16, -1, 14, -68, 44, -68, 0],
    jabL: [0.26, -42, 20, 0, -18, 0, 42, -70, -6, -50, 0],  // the lead jabs while the rear hand waits at the hip
    guardL: [0.12, -43, 15, 0, -15, 0, 22, -72, -6, -50, 0],
    hips: [-0.05, -44, 13, 0, -14, -7, 20, -74, -2, -66, 0], // the kick's tell: hips turned, back heel up
    spinKick: [-0.25, -41, -5, 0, 54, -26, -11, -70, 9, -63, 0],
    riseKick: [-0.55, -49, -2, 0, 20, -112, -12, -72, 11, -66, 0],
    palmShot: [0.3, -41, 22, 0, -20, 0, 16, -68, 48, -58, 0],
    cup: [-0.18, -41, 22, 0, -24, 0, -18, -54, -22, -50, 0],
    cupUp: [-0.18, -41, 22, 0, -24, 0, -20, -60, -20, -46, 0],  // (the sweep's tell: lead hand on top, it sweeps up)
    cupDown: [-0.18, -41, 22, 0, -24, 0, -20, -46, -20, -60, 0], // (rear hand on top: down)
    push: [0.3, -40, 25, 0, -24, 0, 42, -64, 40, -58, 0],
    hover: [0.08, -48, 9, -8, -11, -4, 22, -72, 9, -66, 0],
    gather: [-0.1, -48, 9, -8, -11, -4, -13, -63, -16, -59, 0],
    shootA: [0.15, -48, 9, -8, -11, -4, 44, -72, -9, -62, 0],
    shootB: [0.15, -48, 9, -8, -11, -4, -5, -64, 44, -70, 0],
    squat: [0.05, -29, 18, 0, -16, 0, 11, -50, -7, -43, -0.7],
    palmUp: [-0.08, -49, 9, 0, -11, 0, 7, -118, -7, -64, -0.5],
    leap: [0.45, -53, 20, -24, -20, -14, 42, -78, 40, -86, 0],
    hold: [0.0, -45, 13, 0, -13, 0, 36, -76, 32, -70, 0],
    throwP: [0.35, -42, 22, 0, -20, 0, 47, -80, 42, -70, 0],
    plant: [0.05, -40, 24, 0, -18, 0, -7, -72, -13, -66, 0],
    grabBack: [-0.2, -42, 18, 0, -20, 0, -42, -72, -36, -64, 0],
    kneel: [0.42, -24, 20, 0, -18, -1, 29, -5, 5, -41, 0.3],
    spent: [0.65, -40, 14, 0, -14, 0, 20, -27, 7, -25, 0.2],
    land: [0.3, -27, 20, 0, -18, 0, 23, -45, -4, -41, 0],
    knee: [0.25, -49, 27, -41, -13, 0, 16, -76, -9, -68, 0],
    fly: [0.75, -52, 11, -30, -27, -23, 20, -76, -13, -72, 0],
    roar: [-0.25, -40, 25, 0, -25, 0, 27, -52, -22, -52, -0.35],
    crossArms: [0.0, -43, 14, 0, -15, 0, -7, -77, 9, -79, 0],
    fling: [-0.05, -44, 14, 0, -15, 0, 45, -90, -38, -88, 0],
    hammer: [0.0, -50, 9, -9, -11, -5, 9, -118, 2, -115, 0],
    smash: [0.62, -31, 23, 0, -23, 0, 36, -4, 29, -7, 0],
    dive: [-0.5, -50, 36, 9, -13, -23, -13, -77, 7, -68, 0],
    sky: [-0.12, -45, 16, 0, -16, 0, 7, -131, -5, -65, -0.4],
    throwSun: [0.35, -42, 22, 0, -20, 0, 47, -99, 0, -65, 0],
    empty: [0.0, -45, 10, 0, -11, 0, 14, -43, -9, -43, 0],
    wipe: [0.1, -43, 14, 0, -15, 0, 16, -83, 7, -65, 0],
    laugh: [-0.3, -43, 14, 0, -15, 0, 18, -63, 5, -59, -0.4],
    lie: [0, -43, 12, 0, -12, 0, 27, -86, -27, -86, 0],
  };
  // poses snapped into rather than eased (the rest settle at the usual rate)
  const SNAP = { jab: 1, cross: 1, jabL: 1, tap: 1, spinKick: 1, riseKick: 1, palmShot: 1, push: 1, shootA: 1, shootB: 1, palmUp: 1, throwP: 1, smash: 1, fling: 1, grabBack: 1, throwSun: 1, dive: 1, fly: 1 };
  function walkPose(t) {
    const s = Math.sin(t), c = Math.cos(t), p = POSES.idle.slice();
    p[0] = 0.22; p[2] = 14 + s * 14; p[3] = -Math.max(0, c) * 8; p[4] = -15 - s * 14; p[5] = -Math.max(0, -c) * 8; p[1] = -44 + Math.abs(s) * 2;
    p[6] = 22 - s * 4; p[8] = 9 + s * 4;
    return p;
  }

  // ------------------------------------------------------------------ the ridge: eight slabs of rock
  // Each slab takes cracks from his heavier blows (a wave that grounds on it, a Meteor Smash, a Flare
  // Up, a throw into the wall). In phase I they only crack; from phase II a slab cracked three times
  // falls away and leaves a hole (arena.js keeps it as a pit). Never under the hero's feet, never two
  // side by side, never more than two at once, never the two at the walls. In phase III his blows
  // waste nothing: only the Gathered Sun leaves a crater.
  const NS = 8, SW = (WR - WL) / NS;
  function makeSlabs() {
    B.slabs = [];
    for (let i = 0; i < NS; i++) {
      const q = mulberry(1000 + i * 77), cracks = [];
      for (let k = 0; k < 4; k++) {
        let px = WL + i * SW + SW * (0.2 + 0.6 * q()), py = FLOOR;
        const pts = [[px, py]];
        for (let j = 0; j < 4; j++) { px += (q() - 0.5) * 34; py += 4 + q() * 7; pts.push([px, py]); }
        cracks.push(pts);
      }
      B.slabs.push({ i, l: WL + i * SW, r: WL + (i + 1) * SW, dmg: 0, crack: 0, open: false, drop: 0, quake: 0, due: false, cracks });
    }
  }
  function mulberry(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const slabAt = (x) => B.slabs[G.clamp(Math.floor((x - WL) / SW), 0, NS - 1)];
  const holes = () => B.slabs.filter((s) => s.open).length;
  const edgeSlab = (s) => s.i === 0 || s.i === NS - 1;
  const canOpen = (s) => !s.open && !edgeSlab(s) && holes() < 2 && !(B.slabs[s.i - 1] || {}).open && !(B.slabs[s.i + 1] || {}).open;
  function heroOn(s) {
    const P = G.player;
    return !P.dead && P.x > s.l - 16 && P.x < s.r + 16 && P.y > FLOOR - 170;
  }
  function crackSlab(x, amount) {
    if (!B.slabs || B.phase >= 3) return;
    const s = slabAt(x);
    if (s.open) return;
    const cap = B.phase === 1 || edgeSlab(s) ? 2.99 : 3;
    const before = s.crack;
    s.dmg = Math.min(cap, s.dmg + amount);
    s.crack = Math.floor(s.dmg);
    if (s.crack > before) {
      s.quake = 1;
      G.audio.play('kRock', { vol: 0.5 + 0.25 * s.crack });
      G.fx.burst((s.l + s.r) / 2 + G.rand(-40, 40), FLOOR - 4, { n: 4 + s.crack * 2, color: '30,22,18', speed: [100, 380], angle: -Math.PI / 2, spread: 1.6, life: [0.4, 0.9], size: [3, 7], kind: 'chunk', grav: 1400 });
    }
    if (s.crack >= 3) s.due = true;
  }
  function openSlab(s) {
    s.open = true; s.due = false; s.drop = 0; s.quake = 0;
    G.arena.pits.push({ l: s.l, r: s.r });
    G.audio.play('kRock', { vol: 1.3 }); G.audio.play('boom');
    G.fx.shake(14);
    const cx = (s.l + s.r) / 2;
    G.fx.burst(cx, FLOOR - 4, { n: 26, color: '30,22,18', speed: [120, 520], angle: -Math.PI / 2, spread: 2.2, life: [0.5, 1.2], size: [4, 11], kind: 'chunk', grav: 1500, jitter: SW * 0.4 });
    for (const d of [-1, 1]) G.fx.dust(cx + d * SW * 0.35, FLOOR, 7, { dir: d, speed: [60, 300], size: [8, 16], life: [0.6, 1.2], up: 60, a: 0.42 });
    if (G.arena.bump) G.arena.bump(1.2);
  }
  // the slab under a phase change goes whatever its cracks: the hero is moved off it first
  function breakUnder(x) {
    let s = slabAt(x);
    if (edgeSlab(s)) s = B.slabs[s.i === 0 ? 1 : NS - 2];
    if (s.open) return;
    const P = G.player;
    if (heroOn(s)) {
      const side = P.x < (s.l + s.r) / 2 ? -1 : 1;
      const tx = side < 0 ? s.l - 60 : s.r + 60;
      P.x = G.arena.inPit(tx) ? G.arena.solidNear(tx) : G.clamp(tx, WL + 20, WR - 20);
      P.vx = side * 200; P.vy = -300; P.onGround = false;
      G.fx.dust(P.x, FLOOR, 4, { speed: [40, 160], size: [6, 11], up: 40 });
    }
    s.dmg = 3; s.crack = 3;
    openSlab(s);
  }
  // the Gathered Sun's crater (phase III only)
  function craterAt(x) {
    const s = slabAt(x);
    if (canOpen(s) && !heroOn(s)) { s.dmg = 3; s.crack = 3; openSlab(s); }
    else if (!s.open) { s.dmg = Math.max(s.dmg, 2.99); s.crack = 2; s.quake = 1; }
  }
  function updateSlabs(dt) {
    if (!B.slabs) return;
    for (const s of B.slabs) {
      s.quake = Math.max(s.due ? 0.35 : 0, s.quake - dt * 2.5);
      if (s.open && s.drop < 1) s.drop = Math.min(1, s.drop + dt / 0.9);
      if (s.due && !s.open) {
        if (!canOpen(s)) { s.due = false; s.dmg = 2.99; s.crack = 2; }
        else if (!heroOn(s)) openSlab(s);
      }
    }
  }
  // where he stands: over a hole he hovers, his aura holding him up
  const gy = (x) => (G.arena.inPit(x) ? FLOOR - 28 : FLOOR);
  const clampX = (x) => G.clamp(x, WL + 40, WR - 40);
  const facePlayer = () => { const b = B.body; if (Math.abs(G.player.x - b.x) > 8) b.face = G.player.x > b.x ? 1 : -1; };
  const faceNow = () => { const b = B.body; b.tqf = b.face; b.tqP = 1; }; // (out of a blink he is already turned)

  // ------------------------------------------------------------------ state
  B.setup = function () {
    const b = B.body;
    Object.assign(b, {
      x: 900, y: -140, face: -1, pose: 'fly', p: POSES.fly.slice(), pv: new Array(NP).fill(0), walkT: 0, stepN: 0,
      fast: false, air: true, hurt: false, open: 0, handHip: 0, glow: 0, hips: 0, orb: 0, held: false, sweepUp: 0,
      spin: 0, eyesShut: 0, lie: 0, sway: 0, flick: 0, risen: 0, still: 0, flareK: 0, sputter: 0, sunK: 0, laughing: 0,
    });
    B.hair = D.chain(8, b.x, b.y - 80);
    B.sash = D.chain(5, b.x, b.y - 44);
    B.ghosts = []; B.bolts = []; B.boltT = 0; B.flare = 0; B.gaspDue = false; B.thrown = null; B.counter = null;
    B.slipCd = 0; B.palmT = 0; B.lw = null; B.sunWash = 0; B.sunOn = false; B.sunT = 0; B.unbound = false; B.musicMode = '';
    B.partnerOn = false; B.shade = null; B.drain = 0;
    makeSlabs();
  };
  B.onRelease = function () {
    const b = B.body;
    b.hurt = false; b.open = 0; b.handHip = 0; b.glow = 0; b.hips = 0; b.orb = 0; b.held = false; b.sweepUp = 0; b.spin = 0;
    b.eyesShut = 0; b.fast = false; b.air = false; b.flick = 0; b.hidden = false; b.flareK = 0;
    B.counter = null; B.partnerOn = false; B.shade = null; B.steadfast = false; B.sunOn = false; b.sunK = 0;
    G.fx.cine.to = 0;
    if (G.state === 'fight' && !G.player.dead && !G.paused) G.audio.duck(1);
  };
  B.onInterrupt = function () {
    const P = G.player;
    if (P.grabbed) { P.grabbed = null; P.vy = -200; }
    B.lw = null; B.thrown = null; B.counter = null; B.partnerOn = false; B.shade = null; B.steadfast = false; B.sunOn = false;
    if (B.sunBar) { B.poiseMax = B.sunBar.max; B.poise = 0; B.sunBar = null; }
    B.musicMode = B.phase === 3 ? 'full' : '';
    G.fx.cine.to = 0;
  };
  B.staggerWord = 'WINDED'; B.staggerMult = 1.6; B.staggerDur = 0.4; // short, but it bites
  B.onStagger = function () {
    const b = B.body;
    b.pose = 'kneel'; b.air = false; b.hidden = false; b.open = 0; b.handHip = 0; b.hips = 0; b.orb = 0; b.sunK = 0; b.spin = 0; b.hurt = false;
    b.sputter = 1;
  };
  B.staggerIn = function* () {
    const b = B.body;
    if (B.dying) { yield* fallDown(); return; }
    if (b.y < gy(b.x) - 1) { b.pose = 'hover'; yield* tween(b, { y: gy(b.x) }, 0.25, E.inQuad); }
    b.pose = 'kneel'; b.fast = true;
    G.audio.play('kBreath'); G.fx.shake(6);
    G.fx.dust(b.x, FLOOR, 5, { speed: [30, 150], size: [6, 12], up: 40 });
  };
  B.staggerOut = function* () {
    const b = B.body;
    b.fast = false; b.pose = 'land';
    yield* wait(0.2);
    b.pose = 'idle'; b.sputter = 0;
  };
  B.onRecover = function () { B.body.pose = 'land'; };
  // blows from behind, and blows while he is open, count double towards knocking him down
  B.onHit = function (dmg) {
    const b = B.body, P = G.player;
    if (!B.staggered && !B.steadfast && ((P.x - b.x) * b.face < -6 || b.exposed)) B.poise += dmg * 1.15;
  };
  B.vuln = () => (B.flare > 0 ? 1.25 : 1); // flaring, he hits harder and is hit harder
  B.dying0 = function () { const b = B.body; b.flareK = 0; b.orb = 0; b.sunK = 0; b.handHip = 0; b.open = 0; };
  B.choose = function () {
    if (B.gaspDue) { B.gaspDue = false; return 'gasp'; } // Flare Up burnt out
    return '';
  };

  // Still Sky (phase III; phase II too when corrupted): standing still between attacks he slips the
  // first blow of a string aimed at his front, and answers with one quick palm. Behind him, or while he
  // is recovering, every blow lands. Empty Hand meets every blow. Dawnbreak is never slipped.
  const stillSky = () => B.phase === 3 || (G.corrupt.on() && B.phase === 2);
  B.blocked = function (t, info) {
    const P = G.player, b = B.body;
    if (P.ulting || t.kind !== 'body' || B.staggered || B.dying) return false;
    if (B.counter && B.counter.on && !B.counter.hit) { B.counter.hit = true; slipFx(); return true; }
    if (stillSky() && !B.attackName && !b.ctrl && B.active && (P.x - b.x) * b.face > 0 && B.slipCd <= 0) {
      B.slipCd = 0.7;
      const p = K.hard() ? 1 : K.gentle() ? 0.35 : 0.5;
      if (G.rng() < p) {
        slipFx();
        b.x = clampX(b.x - b.face * 30);
        B.palmT = 0.16; // the answer: one quick palm (see tick)
        return true;
      }
    }
    return false;
  };
  function slipFx() {
    const b = B.body;
    afterimage(b, 0.35);
    G.audio.play('whoosh');
    G.fx.lines(b.x, b.y - 46, 6, G.pal().hot, { r0: 24, speed: [200, 500] });
  }

  // an afterimage of him where he stands now, fading over life seconds (lines: the warp's speed lines)
  function afterimage(b, life, lines) {
    B.ghosts.push({ x: b.x, y: b.y, face: b.face, p: b.p.slice(), handHip: b.handHip, open: b.open, orb: b.orb, t: 0, life: life || 0.4, lines: !!lines, sunK: 0, lie: 0, spin: 0 });
  }
  function trail(b, dt, col) {
    if (Math.random() < dt * 60) G.fx.spawn({ kind: 'spark', x: b.x + G.rand(-12, 12), y: b.y - G.rand(10, 80), vx: -b.face * G.rand(200, 500), vy: G.rand(-20, 20), life: G.rand(0.12, 0.26), size: G.rand(1.4, 2.6), color: col || G.pal().boss, len: 0.06 });
  }

  // ------------------------------------------------------------------ building blocks
  // One straight blow in front of him, angled down at the hero. It is read from his body (the step in,
  // the fist coming through), never from a mark, and a heavy blow of the hero's can meet it (a clash).
  function punch(o, who) {
    const b = who || B.body, f = b.face, m = (a) => (f > 0 ? a : Math.PI - a);
    const ay = o.y || -74;
    const arc = H.arc({
      x: b.x + f * 6, y: b.y + ay, r: o.r || 100, a0: m(o.a0 != null ? o.a0 : -0.25), a1: m(o.a1 != null ? o.a1 : 0.62),
      tele: o.tele, active: 0.08, fade: 0.12, owner: b, dmg: o.dmg || 1, tint: o.tint,
      follow(h) { if (!h.fired) { h.x = b.x + b.face * 6; h.y = b.y + ay; } },
      onFire() { b.fast = true; b.pose = o.pose; G.audio.play('kSnap', { vol: o.soft ? 0.45 : 1 }); if (!who) G.fx.kick(f * 1.6, 0); },
    });
    // (the Shadow Partner, corrupted: a dark copy of him makes the same blow half a second later from the hero's other side)
    if (B.partnerOn && !who) partnerEcho(o);
    return arc;
  }
  // A kick: a wider sweep from his hip
  function kick(o) {
    const b = B.body, f = b.face, m = (a) => (f > 0 ? a : Math.PI - a);
    const ay = o.y || -42;
    return H.arc({
      x: b.x, y: b.y + ay, r: o.r, a0: m(o.a0), a1: m(o.a1), tele: o.tele, active: 0.12, fade: 0.16, owner: b, dmg: o.dmg || 1,
      follow(h) { if (!h.fired) { h.x = b.x; h.y = b.y + ay; } },
      onFire() { b.fast = true; b.pose = o.pose; G.audio.play('whoosh'); G.audio.play('kSnap'); G.fx.shake(5); },
    });
  }
  function* stepIn(dur, dist) {
    const b = B.body, x0 = b.x, x1 = clampX(b.x + b.face * dist);
    let e = 0;
    while (e < dur) { const dt = yield; e += dt; b.x = G.lerp(x0, x1, Math.min(1, e / dur)); }
  }
  // low along the floor, fists up
  function* dashTo(x, speed) {
    const b = B.body;
    x = clampX(x);
    const dir = G.sign(x - b.x) || b.face;
    b.face = dir; b.pose = 'dashLow'; b.fast = true;
    G.audio.play('whoosh');
    G.fx.dust(b.x - dir * 8, FLOOR, 4, { dir: -dir, speed: [60, 260], size: [5, 10], up: 30 });
    const x0 = b.x, dur = Math.max(0.1, Math.abs(x - x0) / speed);
    let e = 0;
    while (e < dur) { const dt = yield; e += dt; b.x = G.lerp(x0, x, E.outQuad(Math.min(1, e / dur))); b.y = gy(b.x); trail(b, dt); }
    b.fast = false;
  }
  // a short blink: gone with the crack of a whip, there in the same breath, his afterimage left behind
  function* blinkTo(x, y) {
    const b = B.body;
    G.audio.play('kCrack');
    afterimage(b, 0.3, true);
    b.x = clampX(x); b.y = y != null ? y : gy(b.x);
    facePlayer(); faceNow();
    G.fx.lines(b.x, b.y - 46, 8, G.pal().hot, { r0: 26, speed: [300, 700] });
    yield* wait(0.05);
  }
  function* hopBack(dist) {
    const b = B.body, x0 = b.x, x1 = clampX(b.x - b.face * dist);
    b.pose = 'hover'; G.audio.play('whoosh');
    let e = 0;
    while (e < 0.28) { const dt = yield; e += dt; const k = Math.min(1, e / 0.28); b.x = G.lerp(x0, x1, E.outQuad(k)); b.y = gy(b.x) - 40 * Math.sin(Math.PI * k); }
    b.y = gy(b.x); b.pose = 'land';
    G.fx.dust(b.x, FLOOR, 3, { speed: [30, 120], size: [5, 9], up: 24 });
  }
  // the hero dashed through him to his back in the middle of a combo
  function wentThrough(side0) {
    const P = G.player, b = B.body;
    return (P.x - b.x) * side0 < -10 && Math.abs(P.x - b.x) < 150 && P.y > FLOOR - 150;
  }
  // a short beam from one hand, waist high, straight ahead
  function shortBeam(len, life, y) {
    const b = B.body, ox = b.x + b.face * 34, oy = b.y + (y || -40);
    G.audio.play('kWave', { vol: 0.5, dur: 0.4 });
    G.fx.shake(6);
    return H.beam({ ox, oy, ang: b.face > 0 ? 0 : Math.PI, width: 26, tele: 0.1, lock: 0.1, active: life, fade: 0.18, maxLen: len, clip: false, tint: WAVE, sfx: false, shake: 5 });
  }

  // ------------------------------------------------------------------ the punch combo
  // All its endings open the same way: a dash in, low with his fists up, a tap of the lead fist, then
  // straight punches. The ending shows on the third punch (the last one in phase III):
  //   hips turning and a sharp breath in: kicks (a wide spinning kick, then one that rises over his head)
  //   a hand dropped to his hip, glowing, with a hum (from the second punch): a short waist-high beam
  //   nothing: he hops back and is open.
  // In phase II one combo in three fires a one-hand beam part way through (the off hand glows from the
  // start and flares just before). Dash through him mid-combo and he may plant a foot, open his hands
  // and grab behind him.
  function* atkCombo() {
    const b = B.body, P = G.player, T = K.T(), ph = B.phase;
    const n = [0, 3, 4, 5][ph] + (K.hard() ? 1 : 0);
    const corrupt = G.corrupt.on();
    let end = K.chance(corrupt ? 0.5 : 0.3, 'beam') ? 'beam' : K.chance(0.45, 'kick') ? 'kick' : 'plain';
    if (ph === 3 && end === 'plain' && K.chance(0.35, 'warp')) end = 'warp';
    const oneHand = ph === 2 && end !== 'beam' && K.chance(0.35, 'onehand') ? 2 + ((G.rng() * (n - 2)) | 0) : -1;
    const kickAt = ph === 3 ? n : 3, beamAt = ph === 3 ? n : 2, speed = [0, 1, 0.82, 0.74][ph];
    facePlayer();
    // in: a dash, or now and then (and always while flaring) a short blink
    const d = Math.abs(P.x - b.x);
    if (d > 120) {
      const side = G.sign(P.x - b.x) || 1;
      if (B.flare > 0 || G.rng() < 0.3) yield* blinkTo(P.x - side * 105);
      else yield* dashTo(P.x - side * 80, 1100);
    }
    facePlayer();
    // the feeler: a tap of the lead fist with nothing behind it
    b.pose = 'tap'; b.fast = true; G.audio.play('kSnap', { vol: 0.3 });
    if (oneHand >= 0) { b.handHip = 1; b.glow = 0.35; G.audio.play('kHum', { dur: 0.3, vol: 0.5 }); }
    yield* wait(0.2 * T);
    b.fast = false;
    let side0 = b.face;
    for (let i = 1; i <= n; i++) {
      if (P.dead) return;
      facePlayer(); side0 = b.face;
      if (end === 'beam' && i === beamAt) { b.handHip = 1; b.glow = 0.5; G.audio.play('kHum', { dur: (n - i + 1) * 0.2 * T + 0.3, vol: ph === 3 ? 0.5 : 1 }); }
      if (end === 'kick' && i === kickAt) { b.hips = 1; G.audio.play('kBreath'); }
      const tele = (i === 1 ? 0.3 : 0.18) * T * speed;
      punch({ tele, pose: b.handHip ? 'jabL' : (i % 2 ? 'jab' : 'cross'), soft: ph === 3 });
      yield* stepIn(tele, 12);
      yield* wait(0.06);
      b.fast = false;
      // the turn grab: the hero went through to his back
      if (wentThrough(side0) && K.chance(0.35, 'turngrab')) { b.handHip = 0; b.hips = 0; yield* turnGrab(); return; }
      if (i === oneHand) yield* handBeam();
    }
    if (end === 'kick') yield* kicks();
    else if (end === 'beam') yield* quickBeam();
    else if (end === 'warp') { b.handHip = 0; yield* atkWave({ warp: true }); }
    else {
      b.pose = 'idle';
      yield* hopBack(34);
      b.exposed = true; yield* wait(0.6 * PW()); b.exposed = false;
    }
  }
  function* handBeam() {
    const b = B.body, T = K.T();
    b.glow = 1; G.audio.play('kHum', { dur: 0.22 * T });
    G.fx.glint(b.x - b.face * 6, b.y - 50, 20, WAVE.hot, 0.2);
    yield* wait(0.22 * T);
    b.pose = 'palmShot'; b.fast = true;
    shortBeam(360, 0.22, -44);
    yield* wait(0.3);
    b.handHip = 0; b.glow = 0; b.fast = false;
  }
  function* kicks() {
    const b = B.body, T = K.T();
    b.hips = 0;
    // a wide spinning kick, low and long, round in front of him
    kick({ r: 150, a0: -0.2, a1: 0.95, tele: 0.16 * T, pose: 'spinKick', y: -40 });
    yield* wait(0.16 * T + 0.16);
    // then one that rises from the floor in front of him to over his head (no jumping it)
    kick({ r: 165, a0: 0.75, a1: -2.0, tele: 0.2 * T, pose: 'riseKick', y: -44 });
    yield* wait(0.2 * T + 0.14);
    // he lands from it facing the way he kicked: a hero who went through is at his back
    b.fast = false; b.pose = 'land';
    b.exposed = true; yield* wait(0.8 * PW()); b.exposed = false;
  }
  function* quickBeam() {
    const b = B.body;
    b.glow = 1;
    yield* wait(0.08);
    b.pose = 'palmShot'; b.fast = true;
    shortBeam(420, 0.3, -40);
    yield* wait(0.36);
    b.handHip = 0; b.glow = 0;
    b.exposed = true; yield* wait(1.0 * PW()); b.exposed = false;
    b.fast = false;
  }
  // The turn grab: a foot planted, the hands open, and a grab at whoever is behind him.
  function* turnGrab() {
    const b = B.body, P = G.player, T = K.T();
    b.pose = 'plant'; b.open = 1;
    G.audio.play('stomp'); G.fx.dust(b.x + b.face * 18, FLOOR, 3, { speed: [30, 120], size: [5, 9], up: 20 });
    yield* wait(0.24 * T);
    b.pose = 'grabBack'; b.fast = true; G.audio.play('whoosh');
    const box = { cx: b.x - b.face * 34, cy: b.y - 44, hw: 34, hh: 38 };
    let e = 0, caught = false;
    while (e < 0.14) { const dt = yield; e += dt; if (grabs(box)) { caught = true; break; } }
    b.open = 0; b.fast = false;
    if (caught) { b.face = -b.face; faceNow(); yield* spinThrow(); return; }
    b.exposed = true; yield* wait(0.55 * PW()); b.exposed = false;
  }
  // A grab is not a blow: a dash does not pass through it. Only being clear of his hands does.
  function grabs(box) {
    const P = G.player;
    return !P.dead && !P.hidden && !P.ulting && P.inv <= 0 && G.canHurt() && !P.finishing && G.rectsOverlap(P.box(), box);
  }

  // ------------------------------------------------------------------ the spin throw
  // A command grab. The tell is the leap itself: a crouch, then he jumps at you low and long with his
  // hands open (the combo's dash stays low with the fists closed). Jump over him or be out of his
  // reach; dashing through him does not help. Caught, he spins round twice with you and throws you at
  // the farther wall (one health). Missed, he lands and stands a while; into a wall, he is knocked down.
  function* atkThrow() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    b.pose = 'land';
    yield* wait(0.34 * T);
    const dir = G.sign(P.x - b.x) || b.face, dist = Math.min(430, Math.abs(P.x - b.x) + 40);
    const x0 = b.x, x1 = clampX(x0 + dir * dist), wall = Math.abs(x1 - (x0 + dir * dist)) > 1;
    const dur = 0.2 + Math.abs(x1 - x0) / 1500;
    b.face = dir; b.pose = 'leap'; b.open = 1; b.air = true; b.fast = true;
    G.audio.play('whoosh');
    G.fx.dust(x0, FLOOR, 4, { dir: -dir, speed: [80, 260], size: [6, 11], up: 30 });
    let e = 0, caught = false;
    while (e < dur) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / dur);
      b.x = G.lerp(x0, x1, k); b.y = FLOOR - 30 * Math.sin(Math.PI * k);
      trail(b, dt);
      if (grabs({ cx: b.x + dir * 22, cy: b.y - 50, hw: 30, hh: 30 })) { caught = true; break; }
    }
    b.open = 0; b.fast = false;
    if (caught) { yield* spinThrow(); return; }
    b.air = false; b.y = gy(b.x);
    if (wall) {
      // into the wall: knocked down for a second
      G.audio.play('slam'); G.fx.shake(10);
      G.fx.burst(b.x + dir * 30, b.y - 40, { n: 10, color: '30,22,18', speed: [100, 380], angle: dir > 0 ? Math.PI : 0, spread: 1.8, life: [0.4, 0.9], size: [4, 8], kind: 'chunk', grav: 1400 });
      crackSlab(b.x, 0.5);
      b.pose = 'kneel'; b.exposed = true;
      yield* wait(1.0);
    }
    b.pose = 'land'; b.exposed = true;
    G.fx.dust(b.x, FLOOR, 4, { speed: [40, 160], size: [6, 11], up: 30 });
    yield* wait(1.6 * PW());
    b.exposed = false;
  }
  function* spinThrow() {
    const b = B.body, P = G.player;
    G.audio.play('kGrab'); G.fx.stop(0.08); G.fx.shake(8);
    b.air = false; b.y = gy(b.x); b.pose = 'hold'; b.held = true;
    const g = P.grabbed = { x: b.x + b.face * 34, y: b.y - 12, face: -b.face };
    let e = 0;
    const spinT = 0.7;
    G.audio.play('whoosh');
    while (e < spinT) {
      const dt = yield;
      e += dt;
      const a = (e / spinT) * Math.PI * 4;
      b.spin = a;
      g.x = b.x + Math.cos(a) * b.face * 40; g.y = b.y - 22 - Math.sin(a * 0.5) * 6;
      if (Math.random() < dt * 30) G.fx.dust(b.x + G.rand(-30, 30), FLOOR, 1, { speed: [40, 160], size: [5, 9], up: 20, a: 0.3 });
      if (Math.floor(e / (spinT / 4)) !== Math.floor((e - dt) / (spinT / 4))) G.audio.play('whoosh');
    }
    // thrown at the farther wall
    const dir = b.x - WL > WR - b.x ? -1 : 1;
    b.spin = 0; b.face = dir; faceNow(); b.pose = 'throwP'; b.held = false; b.fast = true;
    P.grabbed = null;
    P.x = clampX(b.x + dir * 40); P.y = Math.min(P.y, FLOOR - 50); P.vx = dir * 1300; P.vy = 0; P.stun = 0.2; P.onGround = false;
    B.thrown = { dir, t: 0, y: P.y };
    G.audio.play('whoosh'); G.fx.shake(10);
    yield* wait(0.5);
    b.fast = false; b.pose = 'idle';
    yield* wait(0.3);
  }

  // ------------------------------------------------------------------ the Sunwell Wave
  // Both hands drawn back to his hip and a blue orb growing between them; the line it will go along
  // shows (a beam's warning), follows the hero, holds, and then the wave goes along it and plays out
  // for most of a second. The lower his health the wider it is (to a cap). Bait it to one side, get
  // round him, strike him while it plays.
  //   held (one in four): the orb pulses twice and he keeps it 0.7 s longer, still following you.
  //   warp (phase II on, one in three; any phase when fierce): half way through the charge the hum cuts
  //     off with a crack and he is gone, the charge's outline left where he was; he appears behind the
  //     hero and 0.45 s later fires point-blank. Corrupted, he can warp twice.
  //   sweep (phase III, the Sweeping Wave): the wave sweeps up or down through an arc in front of him.
  //     Which hand is on top as he draws back says which: the lead hand, up; the rear hand, down.
  function* atkWave(o) {
    o = o || {};
    const b = B.body, P = G.player, T = K.T(), ph = B.phase;
    const warp = o.warp || (!o.sweep && (ph >= 2 || K.hard()) && K.chance(ph >= 2 ? 0.34 : 0.2, 'warp'));
    const held = !warp && !o.sweep && K.chance(0.25, 'held');
    const up = o.sweep ? K.chance(0.5, 'sweepup') : false;
    facePlayer();
    if (!warp && Math.abs(P.x - b.x) < 170) yield* hopBack(150);
    facePlayer();
    b.pose = o.sweep ? (up ? 'cupUp' : 'cupDown') : 'cup'; b.orb = 0.01; b.held = held;
    const charge = (ph === 1 ? 1.25 : 1.0) * T, extra = held ? 0.7 : 0;
    const width = 40 + 34 * G.clamp(1 - B.hp / B.maxHp, 0, 0.8) / 0.8;
    const hands = () => ({ x: b.x + b.face * 22, y: b.y - 52 });
    if (warp) {
      G.audio.play('kCharge', { dur: charge * 0.55 });
      let e = 0;
      while (e < charge * 0.55) { const dt = yield; e += dt; b.orb = e / charge; K.aura(b.x, b.y, WAVE.boss, 16, 60, 1); }
      let warps = G.corrupt.on() && ph >= 2 ? 2 : 1;
      while (warps-- > 0) {
        // gone: the hum cut off by a crack, the charge's outline left standing where he was
        G.audio.play('kCrack');
        afterimage(b, 0.9, true);
        const side = G.sign(P.x - b.x) || 1, x = clampX(P.x + side * 150);
        b.hidden = true;
        yield* wait(0.07);
        b.x = x; b.y = gy(x); b.face = -side; faceNow(); b.hidden = false;
        G.fx.lines(b.x, b.y - 46, 10, WAVE.hot, { r0: 30, speed: [400, 900] });
        if (warps > 0) yield* wait(0.25);
      }
      G.audio.play('kHum', { dur: 0.45 * T });
      yield* fireWave(hands, 0.45 * T, 0.2, width, 0.7, null);
    } else if (o.sweep) {
      G.audio.play('kCharge', { dur: charge });
      // aimed low in front (up) or high (down), and swept through to the other
      const lo = 0.55, hi = -1.25, a0 = up ? lo : hi, a1 = up ? hi : lo;
      yield* fireWave(hands, charge, 99, width * 0.85, 1.0, { a0, a1 });
    } else {
      G.audio.play('kCharge', { dur: charge + extra });
      yield* fireWave(hands, charge + extra, 0.35, width, 0.9, null, held ? charge : 0);
    }
    b.held = false;
    b.exposed = true; yield* wait(0.5 * PW()); b.exposed = false;
  }
  // the wave itself. sweep: { a0, a1 } (local angles, facing right) to sweep through instead of aiming.
  // pulseAt: the moment a held wave's orb pulses (once at the time it would have gone, then again).
  function* fireWave(hands, tele, lock, width, active, sweep, pulseAt) {
    const b = B.body, P = G.player;
    const m = (a) => (b.face > 0 ? a : Math.PI - a);
    // it follows the hero only in front of him: get round behind him and it goes out where you were
    const aim = (q) => {
      let a = Math.atan2(P.y - 30 - q.y, (P.x - q.x) * b.face);
      if (Math.abs(a) > Math.PI / 2) a = (a > 0 ? 1 : -1) * Math.PI - a; // behind him: mirrored to the front
      return m(G.clamp(a, -1.0, 0.9));
    };
    const h0 = hands();
    const beam = H.beam({
      ox: h0.x, oy: h0.y, ang: sweep ? m(sweep.a0) : aim(h0), width, tele, lock, active, fade: 0.25,
      tint: WAVE, sfx: false, shake: 9,
      follow(h) {
        const q = hands(); h.ox = q.x; h.oy = q.y;
        if (!sweep && !h.locked) h.ang = (P.x - h.ox) * b.face < 0 ? h.ang : aim(q);
        if (sweep && !h.fired) h.ang = m(sweep.a0);
      },
    });
    if (sweep) beam.spin = (m(sweep.a1) - m(sweep.a0)) / active;
    let e = 0, grounded = false;
    while (e < tele) {
      const dt = yield;
      e += dt;
      b.orb = Math.min(1, 0.2 + 0.8 * e / tele);
      if (pulseAt && !b.pulsed && e >= pulseAt) { b.pulsed = true; G.audio.play('kHum', { dur: 0.25, vol: 0.6 }); b.pulse = 1; }
      if (Math.random() < dt * 20) K.aura(b.x, b.y, WAVE.boss, 18, 70, 1);
    }
    b.pulsed = false;
    // let go
    b.orb = 0; b.pose = 'push'; b.fast = true;
    G.audio.play('kWave', { dur: active + 0.2 });
    const x0 = b.x;
    e = 0;
    while (e < active + 0.1) {
      const dt = yield;
      e += dt;
      b.x = clampX(G.lerp(x0, x0 - b.face * 26, Math.min(1, e / active)));
      if (!grounded && beam.grounded && beam.firing) { grounded = true; crackSlab(beam.ex, 1); }
    }
    b.fast = false;
  }

  // ------------------------------------------------------------------ Hailfire
  // A short charge and a jump; up in the air, arms back, he looses ten to fifteen energy balls at you,
  // scattered. Break them with a blow or dash through them. Then he powers down, drops, and is spent.
  // Risen (phase II's opener): more of them and bigger, and each takes three blows to break.
  function* atkHailfire(risen) {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    b.pose = 'land'; G.audio.play('charge', { dur: 0.35 * T });
    yield* wait(0.35 * T);
    b.pose = 'hover'; b.air = true; G.audio.play('whoosh');
    G.fx.dust(b.x, FLOOR, 5, { speed: [60, 220], size: [6, 12], up: 40 });
    yield* tween(b, { y: FLOOR - (risen ? 190 : 165) }, 0.3, E.outCubic);
    b.pose = 'gather';
    yield* wait(0.3 * T);
    const n = risen ? 18 + ((G.rng() * 5) | 0) : 10 + ((G.rng() * 6) | 0);
    for (let i = 0; i < n; i++) {
      if (P.dead) break;
      facePlayer();
      b.pose = i % 2 ? 'shootB' : 'shootA'; b.fast = true;
      const hx = b.x + b.face * 40, hy = b.y - 66;
      const ang = Math.atan2(P.y - 24 - hy, P.x - hx) + G.rrand(-0.3, 0.3);
      ball(hx, hy, ang, risen ? 450 : 520, risen);
      G.audio.play('kShot');
      yield* wait((risen ? 0.13 : 0.16) * Math.max(0.75, T));
    }
    b.fast = false; b.pose = 'hover';
    yield* tween(b, { y: gy(b.x) }, 0.35, E.inQuad);
    b.air = false;
    G.fx.dust(b.x, FLOOR, 5, { speed: [40, 180], size: [6, 12], up: 40 }); G.audio.play('land');
    b.pose = 'spent'; b.exposed = true;
    yield* wait(1.8 * PW());
    b.exposed = false;
  }
  function ball(x, y, ang, sp, big) {
    const o = H.orb(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, { r: big ? 15 : 10, life: 3, onPop: (h) => { if (h.y > FLOOR - 24) crackSlab(h.x, 0.2); } });
    if (big) {
      o.hp = 3;
      o.slash = function () {
        this.hp--;
        if (this.hp <= 0) { this.pop(); G.audio.play('orbPop'); return; }
        G.audio.play('tink');
        this.vx *= 0.55; this.vy *= 0.55; this.r *= 0.86;
        G.fx.burst(this.x, this.y, { n: 6, color: G.pal().hot, speed: [60, 220], life: [0.15, 0.3], kind: 'spark', size: [1.5, 2.5] });
      };
    }
    return o;
  }

  // ------------------------------------------------------------------ the answers
  // Rising Palm (a hero riding over his head): he looks up, sinks into a squat following the hero along
  // under them, then drives one palm straight up: a column of air. Get off him to either side.
  function* atkPalm() {
    const b = B.body, P = G.player, T = K.T();
    b.pose = 'squat';
    G.audio.play('kHum', { dur: 0.45 * T });
    let e = 0;
    while (e < 0.45 * T) { const dt = yield; e += dt; b.x = G.damp(b.x, clampX(P.x), 5, dt); b.y = gy(b.x); }
    b.pose = 'palmUp'; b.fast = true;
    G.audio.play('kWave', { vol: 0.6, dur: 0.45 }); G.fx.shake(8);
    const x = b.x, top = b.y - 70;
    H.add({
      kind: 'column', x, w: 76,
      update() { this.srcX = this.x; if (this.t > 0.4) this.dead = true; },
      hits(Pl) { return this.t < 0.24 && Math.abs(Pl.x - this.x) < this.w / 2 + 6 && Pl.y - 30 < top; },
      draw(ctx) {
        const f = Math.max(0, 1 - this.t / 0.4), pal = G.pal();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, top, 0, -40);
        g.addColorStop(0, G.rgba(pal.boss, 0.4 * f)); g.addColorStop(1, G.rgba(pal.boss, 0));
        ctx.fillStyle = g; ctx.fillRect(this.x - this.w / 2, -40, this.w, top + 40);
        ctx.strokeStyle = G.rgba(pal.hot, 0.6 * f); ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const lx = this.x + (i / 5 - 0.5) * this.w * 0.8, off = (this.t * 1800 + i * 90) % 300;
          ctx.beginPath(); ctx.moveTo(lx, top - off); ctx.lineTo(lx, top - off - 70); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    });
    G.fx.burst(x, top, { n: 12, color: G.pal().hot, speed: [300, 800], angle: -Math.PI / 2, spread: 0.4, life: [0.2, 0.4], kind: 'spark', size: [1.5, 3] });
    yield* wait(0.7 * PW());
    b.fast = false;
  }
  // Closing Knee (a hero keeping away): a crouch, the aura flicks up once with a whip-crack, and he flies
  // at where you were when it sounded, low, knee first. Dash through the streak or jump as he arrives.
  function* atkKnee() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer(); b.pose = 'land';
    yield* wait(0.32 * T);
    G.audio.play('kCrack'); b.flick = 1;
    K.aura(b.x, b.y, G.pal().boss, 20, 90, 6);
    const tx = clampX(P.x + (G.sign(P.x - b.x) || 1) * 60);
    yield* wait(0.14);
    yield* flyLow(tx);
    b.exposed = true; yield* wait(0.8 * PW()); b.exposed = false;
  }
  function* flyLow(tx) {
    const b = B.body;
    const dir = G.sign(tx - b.x) || b.face;
    b.face = dir; faceNow(); b.pose = 'fly'; b.air = true; b.hurt = true; b.fast = true;
    G.audio.play('streak');
    const x0 = b.x, dur = Math.max(0.15, Math.abs(tx - x0) / 1500);
    let e = 0;
    while (e < dur) {
      const dt = yield;
      e += dt;
      b.x = G.lerp(x0, tx, Math.min(1, e / dur)); b.y = gy(b.x) - 26;
      trail(b, dt);
      if (e > dur * 0.6) b.pose = 'knee';
    }
    b.hurt = false; b.air = false; b.fast = false; b.y = gy(b.x); b.pose = 'land'; b.flick = 0;
    G.fx.dust(b.x, FLOOR, 5, { dir: -dir, speed: [80, 300], size: [6, 11], up: 24 });
    G.audio.play('land');
  }

  // ------------------------------------------------------------------ phase II
  // Flare Up: he plants his feet and roars, rocks lifting round him, and the aura bursts up for six
  // seconds (blows on him deal a quarter more while it lasts; his dashes become blinks). It opens with
  // the Rush Chain: three blinks, each a crack then a blow, the first two from either side and the third
  // always from the side the hero faces. When the aura burns out he gasps, hands on his knees.
  function* atkFlare() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer(); b.pose = 'roar';
    G.audio.play('kRumble', { dur: 0.9 }); G.audio.play('kRoar', { dur: 1.1 });
    crackSlab(b.x, 1);
    let e = 0;
    while (e < 0.9) {
      const dt = yield;
      e += dt; b.flareK = e / 0.9; G.fx.shake(2);
      if (Math.random() < dt * 14) G.fx.spawn({ kind: 'chunk', x: b.x + G.rand(-80, 80), y: FLOOR - 4, vx: G.rand(-30, 30), vy: -G.rand(80, 200), life: G.rand(0.8, 1.4), size: G.rand(4, 8), color: '34,26,20', grav: 60 });
    }
    B.flare = 6; b.flareK = 1;
    G.fx.ring(b.x, b.y - 46, { r0: 30, r1: 240, life: 0.5, color: G.pal().boss, width: 8 });
    let side = G.rng() < 0.5 ? -1 : 1;
    for (let i = 0; i < 3; i++) {
      if (P.dead) return;
      if (i === 1) side = -side;
      if (i === 2) side = P.facing || side;
      G.audio.play('kCrack'); afterimage(b, 0.3, true); b.hidden = true;
      yield* wait(0.08);
      const x = clampX(P.x + side * 92);
      b.x = x; b.y = gy(x); b.face = -side; faceNow(); b.hidden = false;
      G.fx.lines(b.x, b.y - 46, 8, G.pal().hot, { r0: 26, speed: [300, 700] });
      punch({ tele: 0.3 * T, pose: 'cross', r: 104 });
      yield* wait(0.3 * T + 0.14);
      b.fast = false; b.pose = 'idle';
    }
  }
  function* atkGasp() {
    const b = B.body;
    b.pose = 'spent'; b.exposed = true;
    G.audio.play('kBreath');
    yield* wait(0.75);
    G.audio.play('kBreath');
    yield* wait(0.75);
    b.exposed = false;
  }
  // Meteor Smash: a crouch and a spike of aura, and he is gone up off the screen. A whistle rises; grit
  // falls and a shadow grows where he will land (he cannot be seen, so a mark is fair). It follows the
  // hero, then holds, and he comes down with both fists: the slab cracks twice. Stuck in the rock a while.
  function* atkMeteor() {
    const b = B.body, P = G.player, T = K.T();
    b.pose = 'land'; G.audio.play('charge', { dur: 0.4 });
    K.aura(b.x, b.y, G.pal().boss, 20, 90, 8);
    yield* wait(0.4 * T);
    b.pose = 'hammer'; b.air = true; G.audio.play('whoosh');
    yield* tween(b, { y: -170 }, 0.32, E.inQuad);
    b.hidden = true;
    const fall = 1.0 * T;
    const mark = H.add({
      kind: 'mark', layer: 'under', x: clampX(P.x), k: 0,
      update() { },
      draw(ctx) {
        const k = this.k, w = 30 + 60 * k;
        ctx.fillStyle = 'rgba(0,0,0,' + (0.2 + 0.35 * k) + ')';
        ctx.beginPath(); ctx.ellipse(this.x, FLOOR + 2, w, 7 + 3 * k, 0, 0, G.TAU); ctx.fill();
        ctx.strokeStyle = G.rgba(DANGER, 0.25 + 0.5 * k); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(this.x, FLOOR + 2, w, 7 + 3 * k, 0, 0, G.TAU); ctx.stroke();
      },
    });
    G.audio.play('kWhistle', { dur: fall });
    let e = 0;
    while (e < fall) {
      const dt = yield;
      e += dt; mark.k = e / fall;
      if (e < fall * 0.62) mark.x = G.damp(mark.x, clampX(P.x), 7, dt);
      if (Math.random() < dt * 30) G.fx.spawn({ kind: 'chunk', x: mark.x + G.rand(-30, 30), y: -10, vx: G.rand(-20, 20), vy: G.rand(300, 600), life: 1.4, size: G.rand(2, 4), color: '60,48,40', grav: 900 });
    }
    const tx = mark.x;
    b.x = tx; b.y = -120; b.hidden = false; b.pose = 'hammer'; b.fast = true;
    yield* tween(b, { y: gy(tx) }, 0.12, E.inQuad);
    mark.dead = true; b.pose = 'smash'; b.air = false;
    K.crush(tx, FLOOR - 40, 84, 52, 1);
    K.impact(tx, true, G.pal().boss);
    crackSlab(tx, 2);
    b.exposed = true; yield* wait(1.0 * PW()); b.exposed = false; b.fast = false;
  }
  // Twin Comets: arms crossed over his chest, then flung wide: two slow orbs that curve, one high and one
  // low, and meet where the hero stood. One blow breaks one. He stays on the ground a moment after.
  function* atkComets() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer(); b.pose = 'crossArms';
    G.audio.play('kHum', { dur: 0.45 * T });
    yield* wait(0.45 * T);
    b.pose = 'fling'; b.fast = true;
    G.audio.play('kShot'); G.audio.play('whoosh');
    const tx = P.x, ty = Math.min(P.y - 26, FLOOR - 24), boom = { done: false };
    for (const high of [true, false]) {
      const sx = b.x + b.face * 30, sy = b.y - 70, cx = (sx + tx) / 2, cy = high ? FLOOR - 380 : FLOOR - 70, dur = 1.15;
      const o = H.orb(sx, sy, 0, 0, { r: 13, life: 3 });
      o.k = 0;
      o.steer = (h, dt) => {
        h.k += dt / dur;
        const k = Math.min(1, h.k), q = 1 - k;
        const nx = q * q * sx + 2 * q * k * cx + k * k * tx, ny = q * q * sy + 2 * q * k * cy + k * k * ty;
        h.vx = dt > 0 ? (nx - h.x) / dt : 0; h.vy = dt > 0 ? (ny - h.y) / dt : 0;
        if (k >= 1) { h.pop(); if (!boom.done && (boom.done = true)) H.blast({ x: tx, y: ty, r: 46, tele: 0.001, boom: 0.14, sfx: 'boom' }); }
      };
    }
    yield* wait(0.3);
    b.fast = false;
    b.exposed = true; yield* wait(0.8 * PW()); b.exposed = false;
  }

  // ------------------------------------------------------------------ phase III
  // The Gathered Sun: one hand to the sky, the canyon's light drawn into his palm (the arena darkens
  // round him; nothing brightens) under a deep drone, and the Sun grows over him for up to seven
  // seconds. It has its own bar (the stagger bar while it lasts). Break the bar and he must throw it at
  // once, at the size it has reached: small, a dash clears its burst; big, only distance does. At seven
  // seconds it covers the whole arena, the one blow of his that kills outright. Chunks of the ridge lift
  // towards it and some drop back as falling rock. Broken early, he is left kneeling, spent.
  // (dark: his corrupted Black Sun, five seconds, smaller)
  function* atkSun(dark) {
    const b = B.body, P = G.player;
    const full = dark ? 5 : 7;
    facePlayer();
    b.pose = 'sky'; b.sunK = 0.001; b.air = false; b.y = gy(b.x);
    G.fx.cine.x = b.x; G.fx.cine.y = b.y - 150; G.fx.cine.to = 1; // the zoom in
    G.audio.play('kDrone', { dur: full });
    G.audio.play('kRumble', { dur: 1.2 });
    B.musicMode = 'build';
    B.sunBar = { max: B.poiseMax };
    B.steadfast = true; B.poise = 0;
    B.poiseMax = Math.round(SUN_BAR * (K.hard() ? 1.25 : 1) * (1 + 0.08 * (G.run.trial - 1)) * (dark ? 0.8 : 1));
    B.sunOn = true; B.sunDark = !!dark;
    let e = 0, rockT = 1.1, broke = false;
    while (e < full) {
      const dt = yield;
      e += dt; B.sunT = e; b.sunK = e / full;
      if (e > 1.1) G.fx.cine.to = 0; // and back out, so the fight can be read
      rockT -= dt;
      if (rockT <= 0) {
        rockT = G.rrand(0.6, 0.95);
        H.meteor({ x: clampX(P.x + G.rrand(-200, 200)), tele: 0.85, blastR: 34, tint: ROCK, fallSpeed: 1300 });
      }
      if (Math.random() < dt * 18) {
        const sx = b.x + G.rand(-300, 300);
        G.fx.spawn({ kind: 'chunk', x: sx, y: FLOOR - 4, vx: (b.x - sx) * 0.4, vy: -G.rand(160, 320), life: G.rand(0.8, 1.4), size: G.rand(3, 7), color: '40,32,26', grav: -40 });
      }
      if (B.poise >= B.poiseMax) { broke = true; break; }
    }
    B.steadfast = false; B.sunOn = false;
    B.poiseMax = B.sunBar.max; B.poise = 0; B.sunBar = null;
    G.fx.cine.to = 0;
    const k = Math.min(1, e / full);
    if (!broke) { yield* sunFull(dark); return; }
    if (e < 3) G.feats.bump('sunbreak');
    G.audio.play('stagger'); G.fx.shake(10);
    yield* sunThrow(k, dark);
  }
  function sunR(k) { return 24 + 150 * k; }
  function* sunThrow(k, dark) {
    const b = B.body, P = G.player;
    b.pose = 'throwSun'; b.fast = true;
    G.audio.play('whoosh'); G.audio.play('kWave', { vol: 0.8, dur: 0.7 });
    const r = sunR(k), R = 60 + 320 * k, tx = clampX(P.x), col = dark ? { boss: G.corrupt.COL.blood, hot: G.corrupt.COL.hot } : SUN;
    const sun = H.add({
      kind: 'sun', x: b.x, y: b.y - 150 - r, r, landed: false, layer: 'over',
      update(dt) {
        const ty = FLOOR - r * 0.4, dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy), sp = 650 + 450 * (1 - k);
        if (d <= sp * dt) { this.x = tx; this.y = ty; this.landed = true; this.dead = true; return; }
        this.x += dx / d * sp * dt; this.y += dy / d * sp * dt;
      },
      draw(ctx) { drawSunOrb(ctx, this.x, this.y, this.r, col, this.t); },
    });
    b.sunK = 0;
    while (!sun.landed) yield;
    // it bursts: a small one for an instant, a big one long enough that no dash outlasts it
    H.blast({ x: tx, y: FLOOR - 10, r: R, tele: 0.001, boom: 0.15 + 0.6 * k, tint: col, sfx: 'boom' });
    G.fx.shake(14 + 18 * k);
    if (B.phase >= 3) craterAt(tx);
    else crackSlab(tx, 2);
    B.musicMode = 'full'; // the full theme, once the Sun is thrown
    b.fast = false;
    if (k < 0.6) {
      // spent: kneeling, his hand still raised
      b.pose = 'kneel'; b.exposed = true;
      yield* wait(3);
      b.exposed = false;
    } else yield* wait(0.4);
  }
  function* sunFull(dark) {
    const b = B.body, P = G.player;
    b.pose = 'throwSun'; b.fast = true;
    G.audio.play('kWave', { dur: 1.6, vol: 1.2 }); G.audio.play('boom');
    G.fx.shake(30);
    B.sunDark = !!dark;
    yield* tween(B, { sunWash: 1 }, 0.45, E.inQuad);
    b.sunK = 0;
    if (G.canHurt()) { P.grabbed = null; P.iframes = 0; P.inv = 0; P.tryHit(99, b.x, { kind: 'sun' }); }
    B.musicMode = 'full';
    yield* wait(0.5);
    yield* tween(B, { sunWash: 0 }, 1.0, E.outQuad);
    b.fast = false;
  }
  // Empty Hand: eyes closed, hands hanging, the aura perfectly still, the music gone quiet. Strike him
  // and he is behind you with a kick. Leave him be and after a second and a half his eyes open and he
  // goes for you, low.
  function* atkEmpty() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer(); b.pose = 'empty'; b.eyesShut = 1;
    B.counter = { on: true, hit: false };
    G.audio.duck(0.2);
    let e = 0;
    while (e < 1.5 && !B.counter.hit) { const dt = yield; e += dt; }
    const hit = B.counter.hit;
    B.counter = null; b.eyesShut = 0;
    G.audio.duck(1);
    if (hit) {
      G.audio.play('kCrack');
      afterimage(b, 0.35, true);
      const side = -(P.facing || 1);
      b.x = clampX(P.x + side * 72); b.y = gy(b.x); b.face = -side; faceNow();
      kick({ r: 122, a0: -0.7, a1: 0.75, tele: 0.24 * T, pose: 'spinKick', y: -46 });
      yield* wait(0.24 * T + 0.3);
      b.fast = false; b.exposed = true; yield* wait(0.5); b.exposed = false;
      return;
    }
    G.fx.glint(b.x + b.face * 8, b.y - 80, 22, G.pal().hot, 0.25); G.audio.play('glint');
    yield* wait(0.14);
    yield* flyLow(clampX(P.x + (G.sign(P.x - b.x) || 1) * 70));
    b.exposed = true; yield* wait(0.8 * PW()); b.exposed = false;
  }
  // Meteor Heel: two diagonal dive kicks, one from each side. Up above to one side, a short whistle,
  // and down at where the hero stood. Dash under each. He lands in a crouch.
  function* atkHeel() {
    const b = B.body, P = G.player, T = K.T();
    let side = G.sign(b.x - P.x) || 1;
    for (let i = 0; i < 2; i++) {
      if (P.dead) return;
      if (i === 1) side = -side;
      G.audio.play('kCrack'); afterimage(b, 0.3, true);
      b.x = clampX(P.x + side * 300); b.y = FLOOR - 330; b.air = true; b.face = -side; faceNow(); b.pose = 'dive';
      G.audio.play('kWhistle', { dur: 0.45 * T });
      yield* wait(0.45 * T);
      const tx = clampX(P.x), ty = gy(tx), x0 = b.x, y0 = b.y, dur = 0.28;
      b.hurt = true; b.fast = true; G.audio.play('streak');
      let e = 0;
      while (e < dur) { const dt = yield; e += dt; const k = E.inQuad(Math.min(1, e / dur)); b.x = G.lerp(x0, tx, k); b.y = G.lerp(y0, ty, k); trail(b, dt); }
      b.hurt = false; b.air = false; b.fast = false;
      K.impact(tx, false, G.pal().boss);
      b.pose = 'land';
      if (i === 0) yield* wait(0.25);
    }
    b.exposed = true; yield* wait(0.8 * PW()); b.exposed = false;
  }
  // The Last Wave (below 12% health, once): he leaps to the far end of the ridge and fires his biggest
  // wave, the full height of the screen. It cannot be dodged: the hero meets it, weapon raised, and the
  // two push. Each press of attack pushes it back; Dawnbreak, if ready, wins at once. Lose, and it is two
  // health (three when fierce) and a combo after. Win, and his own wave throws him down.
  function* atkLastWave() {
    const b = B.body, P = G.player;
    const far = P.x < 640 ? WR - 70 : WL + 70;
    b.pose = 'leap'; b.air = true; G.audio.play('whoosh');
    const x0 = b.x;
    let e = 0;
    while (e < 0.5) { const dt = yield; e += dt; const k = Math.min(1, e / 0.5); b.x = G.lerp(x0, far, E.inOutQuad(k)); b.y = gy(b.x) - 120 * Math.sin(Math.PI * k); }
    b.x = far; b.y = gy(far); b.air = false; b.face = far > 640 ? -1 : 1; faceNow();
    b.pose = 'cup'; b.orb = 0.3;
    G.fx.cine.x = b.x; G.fx.cine.y = b.y - 60; G.fx.cine.to = 0.7;
    G.audio.play('kCharge', { dur: 1.3 }); G.audio.play('kRoar', { dur: 1.3 });
    e = 0;
    while (e < 1.3) { const dt = yield; e += dt; b.orb = 0.3 + 0.7 * e / 1.3; G.fx.shake(2); K.aura(b.x, b.y, WAVE.boss, 20, 90, 2); }
    G.fx.cine.to = 0;
    b.orb = 0; b.pose = 'push'; b.fast = true;
    G.audio.play('kWave', { dur: 1.6, vol: 1.2 }); G.fx.shake(16);
    const dir = b.face, W = B.lw = { from: b.x + dir * 36, front: b.x + dir * 36, dir, m: 0.12, state: 'roll', t: 0 };
    while (W.state === 'roll') {
      const dt = yield;
      W.front += dir * 1400 * dt; W.t += dt;
      if (P.dead) { B.lw = null; return; }
      if ((W.front - P.x) * dir >= -26) W.state = 'meet';
    }
    // the meeting: the hero is held where they stand, facing it
    const g = P.grabbed = { x: P.x, y: Math.min(P.y, FLOOR), face: -dir, mash: true, presses: 0 };
    W.hx = P.x;
    G.audio.play('clash'); G.fx.stop(0.12); G.fx.shake(14);
    const push = K.hard() ? 0.26 : K.gentle() ? 0.12 : 0.18;
    let seen = 0, sparkT = 0;
    while (true) {
      const dt = yield;
      W.t += dt;
      const pr = g.presses - seen; seen = g.presses;
      W.m = G.clamp(W.m - push * dt + pr * 0.08, 0, 1);
      if (pr) { G.audio.play('kSnap', { vol: 0.6 }); G.fx.shake(4); }
      if (g.ult) { P.ult = 0; W.m = 1; G.audio.play('clash'); }
      W.front = G.lerp(W.hx - dir * 18, b.x + dir * 40, W.m);
      sparkT -= dt;
      if (sparkT <= 0) {
        sparkT = 0.03;
        G.fx.spawn({ kind: 'spark', x: W.front, y: FLOOR - G.rand(10, 300), vx: G.rand(-300, 300), vy: G.rand(-300, 300), life: G.rand(0.12, 0.3), size: G.rand(1.5, 3), color: Math.random() < 0.5 ? WAVE.hot : G.hero().hot, len: 0.05 });
      }
      if (W.m >= 1 || W.m <= 0 || P.dead) break;
    }
    P.grabbed = null;
    if (W.m >= 1) {
      // his own wave turns and throws him down
      W.state = 'back';
      G.audio.play('kWave', { vol: 0.8 }); G.fx.shake(22); G.fx.stop(0.1);
      G.fx.burst(b.x, b.y - 44, { n: 30, color: WAVE.hot, speed: [200, 800], life: [0.3, 0.8], kind: 'spark', size: [2, 4] });
      b.fast = false;
      B.lw = null;
      B.forceStagger();
      yield; // (the stagger has taken over)
      return;
    }
    // it goes over the hero
    W.state = 'over';
    if (G.canHurt()) { P.iframes = 0; P.inv = 0; P.tryHit(K.hard() ? 3 : 2, b.x, { kind: 'wave' }); }
    yield* wait(0.35);
    B.lw = null; b.fast = false;
    if (!P.dead) yield* atkCombo();
  }

  // ------------------------------------------------------------------ corrupted
  // The Scorched Wave: a wave fired low along the floor from end to end (jump it), that leaves the
  // floor burning black behind it in lengths, with gaps to stand in, for two seconds.
  function* atkScorch() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    if (Math.abs(P.x - b.x) < 160) yield* hopBack(150);
    b.pose = 'cup'; b.orb = 0.01;
    const C = G.corrupt.COL, tint = { boss: C.blood, hot: C.hot };
    G.audio.play('kCharge', { dur: 0.9 * T });
    const ox = b.x + b.face * 30, oy = FLOOR - 22;
    H.beam({ ox, oy, ang: b.face > 0 ? 0 : Math.PI, width: 30, tele: 0.9 * T, lock: 99, active: 0.5, fade: 0.2, clip: false, tint, sfx: false, shake: 8 });
    let e = 0;
    while (e < 0.9 * T) { const dt = yield; e += dt; b.orb = 0.2 + 0.8 * e / (0.9 * T); }
    b.orb = 0; b.pose = 'push'; b.fast = true; G.audio.play('kWave', { dur: 0.6 });
    yield* wait(0.3);
    // the floor behind it burns, a length at a time with a gap between
    for (let x = ox + b.face * 80, i = 0; x > WL + 30 && x < WR - 30; x += b.face * 150, i++) {
      if (i % 2 === 0) H.pool({ x, w: 130, hgt: 24, tele: 0.15, active: 2, fade: 0.3, tint });
    }
    yield* wait(0.3);
    b.fast = false;
    b.exposed = true; yield* wait(0.5 * PW()); b.exposed = false;
  }
  // The Shadow Partner: a combo of his, and a dark copy of him makes every blow of it again half a
  // second later from the hero's other side. The tell is a second set of footsteps.
  function* atkPartner() {
    B.partnerOn = true;
    yield* atkCombo();
    yield* wait(0.55);
    B.partnerOn = false; B.shade = null;
  }
  function partnerEcho(o) {
    const P = G.player, b = B.body;
    const x = clampX(P.x + (P.x - b.x)), face = G.sign(P.x - x) || -b.face;
    if (!B.shade) { B.shade = { x, y: FLOOR, face, p: b.p.slice(), handHip: 0, open: 0, orb: 0, t: 0, life: 99, a: 0 }; G.audio.play('stomp'); }
    const sh = B.shade;
    sh.x = x; sh.face = face;
    const C = G.corrupt.COL;
    punch(Object.assign({}, o, { tele: o.tele + 0.5, tint: { boss: C.blood, hot: C.hot } }), sh);
    G.audio.play('stomp');
  }

  B.ATTACKS = {
    combo: atkCombo, throw: atkThrow, wave: () => atkWave({}), sweep: () => atkWave({ sweep: true }), hailfire: () => atkHailfire(false),
    risen: () => atkHailfire(true), flare: atkFlare, gasp: atkGasp, meteor: atkMeteor, comets: atkComets,
    palm: atkPalm, knee: atkKnee, // (the kit's answers: B.antiAir, B.answer)
    sun: () => atkSun(false), empty: atkEmpty, heel: atkHeel, lastwave: atkLastWave, // (lastwave is B.finale)
    scorch: atkScorch, blacksun: () => atkSun(true), partner: atkPartner, // (corrupted only: B.corruptBags)
  };

  // Back to his stance: a shake of the hands and a settle. Now and then none at all, and the next
  // attack comes straight on (sudden bursts); now and then a longer breath on his toes.
  B.recover = function* () {
    const b = B.body;
    if (b.air && b.y < gy(b.x) - 1) { b.pose = 'hover'; yield* tween(b, { y: gy(b.x) }, 0.25, E.inQuad); b.air = false; }
    if (B.dying) return;
    const r = G.rng();
    if (r < 0.3) { b.pose = 'idle'; return; }
    b.pose = 'idle';
    yield* wait(r < 0.8 ? 0.18 : 0.45);
  };

  // ------------------------------------------------------------------ scenes
  B.enter = function* () {
    const b = B.body;
    b.x = 900; b.y = -140; b.face = -1; b.pose = 'fly'; b.air = true; b.hidden = false; faceNow();
    yield* wait(0.2);
    G.audio.play('kWhistle', { dur: 0.5 });
    yield* tween(b, { y: FLOOR }, 0.5, E.inQuad);
    b.air = false; b.pose = 'land';
    K.impact(b.x, false, G.pal().boss);
    crackSlab(b.x, 1);
    yield* wait(0.55);
    b.pose = 'idle';
    G.audio.play('kLaugh');
    yield* wait(0.35);
  };
  // He falls as if beaten (phase III's opening and his real fall at the end): the aura going out.
  function* fallDown() {
    const b = B.body;
    b.air = false; b.y = gy(b.x);
    if (B.dying) {
      // the aura goes out in steps: white, then gold, then nothing
      b.still = 1; b.risen = 0; yield* wait(0.35);
      b.still = 0; b.risen = 1; G.audio.play('kBolt'); yield* wait(0.35);
      b.risen = 0; G.audio.play('kBreath');
    }
    b.pose = 'idle'; b.sway = 1;
    yield* wait(0.5);
    b.pose = 'lie';
    yield* tween(b, { lie: 1 }, 0.5, E.inQuad);
    b.sway = 0;
    G.fx.thud(b.x - b.face * 30, FLOOR, 1.1); G.audio.play('boom'); G.fx.shake(10);
    G.fx.dust(b.x - b.face * 30, FLOOR, 8, { speed: [40, 220], size: [8, 15], life: [0.6, 1.2], up: 40 });
    if (B.dying) b.laughing = 1;
  }
  B.phaseIn = function* (n) {
    const b = B.body;
    b.air = false; b.hidden = false; b.spin = 0; b.open = 0; b.orb = 0; b.handHip = 0; b.hips = 0; b.sunK = 0;
    if (b.y < gy(b.x) - 1) { b.pose = 'hover'; yield* tween(b, { y: gy(b.x) }, 0.3, E.inQuad); }
    if (n === 2) {
      // the fight stops. He wipes his mouth and laughs once, and the view eases in on him
      b.pose = 'idle';
      G.fx.cine.x = b.x; G.fx.cine.y = b.y - 70; G.fx.cine.to = 1;
      G.audio.duck(0.35);
      yield* wait(0.5);
      b.pose = 'wipe';
      yield* wait(0.55);
      b.pose = 'laugh'; G.audio.play('kLaugh');
      yield* wait(0.65);
      // rocks lift, his hair rises, the gold aura roars up crackling, and the slab under him goes
      b.pose = 'roar';
      G.audio.play('kRumble', { dur: 1.4 }); G.audio.play('kRoar', { dur: 1.6 });
      let e = 0;
      while (e < 1.3) {
        const dt = yield;
        e += dt; b.risen = Math.min(1, e / 1.0); G.fx.shake(2 + 4 * b.risen);
        if (Math.random() < dt * 24) G.fx.spawn({ kind: 'chunk', x: b.x + G.rand(-120, 120), y: FLOOR - 4, vx: G.rand(-30, 30), vy: -G.rand(60, 240), life: G.rand(0.9, 1.6), size: G.rand(4, 10), color: '34,26,20', grav: 40 });
        if (Math.random() < dt * 8) G.audio.play('kBolt');
      }
      breakUnder(b.x);
      b.y = gy(b.x);
      yield* wait(0.45);
      G.audio.duck(1);
    } else {
      // he falls as if beaten; the music stops
      G.audio.setIntensity(0);
      b.pose = 'kneel';
      yield* wait(0.5);
      yield* fallDown();
      yield* wait(1.3);
      // and rises, his strength coming back to three quarters, the phase marks gone
      b.pose = 'lie';
      G.audio.play('kRumble', { dur: 1.8 });
      const hp0 = B.hp;
      let e = 0;
      while (e < 1.6) {
        const dt = yield;
        e += dt;
        const k = Math.min(1, e / 1.6);
        b.lie = 1 - E.inOutQuad(k);
        B.hp = Math.round(G.lerp(hp0, B.maxHp * 0.75, E.outQuad(k)));
        if (k > 0.5) b.pose = 'kneel';
      }
      b.lie = 0; B.hp = Math.round(B.maxHp * 0.75); B.unbound = true;
      b.pose = 'idle';
      // the gold aura burns out to nothing; a beat of silence; then a thin white aura settles close
      e = 0;
      while (e < 0.6) { const dt = yield; e += dt; b.risen = Math.max(0, 1 - e / 0.6); if (Math.random() < dt * 30) K.aura(b.x, b.y, G.PAL[2].boss, 18, 80, 1); }
      b.risen = 0;
      yield* wait(0.7);
      G.audio.play('ring');
      yield* tween(b, { still: 1 }, 0.8, E.outQuad);
    }
  };
  B.phaseOut = function* (n) {
    const b = B.body;
    if (n === 2) { G.fx.cine.to = 0; b.pose = 'idle'; yield* wait(0.35); }
    else { b.pose = 'idle'; B.musicMode = 'full'; yield* wait(0.3); }
  };

  // ------------------------------------------------------------------ between attacks
  B.idle = function (dt) {
    const b = B.body, P = G.player;
    if (!b.noTurn) facePlayer();
    const d = Math.abs(P.x - b.x);
    if (b.held) return;
    if (d > 240) { b.x = clampX(b.x + b.face * 170 * dt); b.pose = 'walk'; }
    else if (d < 70) { b.x = clampX(b.x - b.face * 90 * dt); b.pose = 'idle'; }
    else b.pose = 'idle';
    b.air = false;
  };

  B.tick = function (dt) {
    const b = B.body, P = G.player;
    // feet: on the floor, or hovering over a hole
    if (!b.air && !b.hidden && b.ctrl === false) b.y = G.damp(b.y, gy(b.x), 12, dt);
    if (b.pose === 'walk') {
      b.walkT += dt * 9;
      const sn = Math.floor(b.walkT / Math.PI + 0.5);
      if (sn !== b.stepN) { b.stepN = sn; if (b.y >= FLOOR - 1) { G.fx.step(b.x - b.face * 4, FLOOR, -b.face); G.audio.play('step'); } }
    }
    // the pose: each part on a spring, snappier for blows
    const target = b.pose === 'walk' ? walkPose(b.walkT) : (POSES[b.pose] || POSES.idle);
    const w0 = b.fast || SNAP[b.pose] ? 46 : 18, z = b.fast ? 0.62 : 0.8;
    for (let i = 0; i < NP; i++) {
      b.pv[i] += ((target[i] - b.p[i]) * w0 * w0 - 2 * z * w0 * b.pv[i]) * dt;
      b.p[i] += b.pv[i] * dt;
    }
    // on his toes in his stance
    b.bob = (b.pose === 'idle' && !b.air) ? Math.sin(G.t * 7.5) * 1.6 : 0;
    // hair and sash: the aura lifts them
    const lift = Math.max(b.risen, b.flareK * (B.flare > 0 ? 1 : 0), b.still * 0.4);
    const sh = shoulderOf(b), hx = sh.x - b.face * 7, hy = sh.y - 14;
    D.chainStep(B.hair, hx, hy, dt, { seg: 6, grav: G.lerp(70, -35, lift), drift: 34 + 30 * lift, face: b.face, wave: 6 + 14 * lift, rate: 6 + 5 * lift });
    D.chainStep(B.sash, b.x - b.face * 9, b.y + b.p[1] + 2, dt, { seg: 6, grav: G.lerp(90, 10, lift), drift: 20, face: b.face, wave: 5, rate: 5, floor: FLOOR - 1 });
    // afterimages fade
    for (let i = B.ghosts.length - 1; i >= 0; i--) { const g = B.ghosts[i]; g.t += dt; if (g.t >= g.life) B.ghosts.splice(i, 1); }
    if (B.shade) B.shade.a = Math.min(1, B.shade.a + dt * 4);
    b.flick = Math.max(0, b.flick - dt * 3);
    b.pulse = Math.max(0, (b.pulse || 0) - dt * 3);
    b.sputter = Math.max(0, b.sputter - dt * 0.6);
    // the Risen aura's lightning
    B.boltT -= dt;
    if (B.boltT <= 0) {
      B.boltT = 0.07;
      B.bolts = [];
      const on = b.risen > 0.3 || (B.flare > 0 && B.phase >= 2);
      if (on && !b.hidden) for (let i = 0; i < 2; i++) if (Math.random() < 0.6) B.bolts.push(jag(b.x + G.rand(-22, 22), b.y - G.rand(10, 86), G.rand(14, 34)));
      if (on && !b.hidden && Math.random() < 0.06) G.audio.play('kBolt');
    }
    // Flare Up's six seconds
    if (B.flare > 0) {
      B.flare -= dt;
      if (Math.random() < dt * 30) K.aura(b.x, b.y, G.pal().boss, 18, 80, 1);
      if (B.flare <= 0) { B.flare = 0; b.flareK = 0; B.gaspDue = true; G.audio.play('kBreath'); }
    }
    // Still Sky's answer to a slipped blow: one quick palm
    B.slipCd = Math.max(0, B.slipCd - dt);
    if (B.palmT > 0) {
      B.palmT -= dt;
      b.pose = 'palmShot';
      if (B.palmT <= 0 && !B.attackName && !b.ctrl && G.canHurt()) { facePlayer(); punch({ tele: 0.12, pose: 'palmShot', r: 96 }); }
    }
    // the hero thrown at the wall: carried along, a little off the floor, until it is reached
    if (B.thrown) {
      const th = B.thrown;
      th.t += dt;
      if (P.dead || th.t > 1.4 || P.grabbed) B.thrown = null;
      else {
        P.vx = th.dir * 1300; P.vy = 0; P.y = th.y; P.stun = Math.max(P.stun, 0.06);
        if (Math.random() < dt * 40) G.fx.spawn({ kind: 'spark', x: P.x, y: P.y - G.rand(10, 40), vx: -th.dir * 300, vy: 0, life: 0.15, size: 2, color: G.COL.star, len: 0.05 });
        const wall = th.dir > 0 ? (G.bounds ? G.bounds.r : WR - 13) : (G.bounds ? G.bounds.l : WL + 13);
        if (Math.abs(P.x - wall) < 4) {
          B.thrown = null; P.vx = 0;
          G.audio.play('slam'); G.fx.shake(16);
          G.fx.burst(wall, P.y - 30, { n: 12, color: '30,22,18', speed: [100, 420], angle: th.dir > 0 ? Math.PI : 0, spread: 1.8, life: [0.4, 0.9], size: [4, 9], kind: 'chunk', grav: 1400 });
          G.fx.dust(wall, P.y - 30, 5, { dir: -th.dir, speed: [60, 260], size: [8, 14], up: 30 });
          crackSlab(P.x, 0.5);
          if (G.canHurt()) { P.iframes = 0; P.inv = 0; P.tryHit(1, wall + th.dir * 40, { kind: 'wall' }); }
        }
      }
    }
    // his body hurts when he means it to (flying in, diving)
    if (b.hurt && !b.hidden && G.canHurt() && G.rectsOverlap(P.box(), { cx: b.x, cy: b.y - 42, hw: 28, hh: 36 })) P.tryHit(1, b.x, b);
    // toppled, he lifts one tired fist at a hero who comes close
    b.laughing = B.toppled ? 1 : b.laughing * Math.exp(-dt);
    updateSlabs(dt);
  };
  // a jagged line round a point, for his lightning
  function jag(x, y, len) {
    const a = G.rand(0, G.TAU), pts = [[x, y]];
    let px = x, py = y;
    for (let i = 0; i < 4; i++) { px += Math.cos(a + G.rand(-0.9, 0.9)) * len / 4; py += Math.sin(a + G.rand(-0.9, 0.9)) * len / 4; pts.push([px, py]); }
    return pts;
  }
  function shoulderOf(f) {
    const lean = f.p[0];
    return { x: f.x + f.face * Math.sin(lean) * 30, y: f.y + (f.bob || 0) + f.p[1] - Math.cos(lean) * 30 };
  }

  // ------------------------------------------------------------------ drawing
  // Sun-bleached sand and rust: a sleeveless wrap top, wide trousers gathered into ankle wraps, a red
  // sash, taped forearms, bare feet, long dark hair tied back in a tail that his aura lifts.
  const CL = { skin: '#5e4032', skinD: '#46301f', top: '#5a2a1c', topD: '#3a1a10', pants: '#5c4f3e', pantsD: '#41372a', wrap: '#9a8c70', wrapD: '#6e644f', belt: '#8e241e', hair: '#0e0a0a' };
  // the Shadow Partner (corrupted): the same shape in black
  const CS = { skin: '#08040a', skinD: '#050206', top: '#08040a', topD: '#050206', pants: '#08040a', pantsD: '#050206', wrap: '#120610', wrapD: '#0a0308', belt: '#1a0410', hair: '#020003' };

  function drawFig(ctx, f, alpha, o) {
    o = o || {};
    if (alpha <= 0.01) return;
    const c = o.shade ? CS : CL, pal = G.pal(), rim = o.shade ? G.corrupt.COL.blood : pal.rim;
    const p = f.p, lean = p[0], hip = p[1] + (f.bob || 0);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.translate(f.x + (f.kx || 0) + (f.jit ? G.rand(-f.jit, f.jit) : 0), f.y);
    if (o.real) K.recoil(ctx, f);
    // lying on his back: turned about his feet, his length laid out behind them
    if (f.lie) { ctx.translate(f.face * 40 * f.lie, -12 * f.lie); ctx.rotate(-f.face * f.lie * Math.PI / 2); }
    if (f.sway) ctx.rotate(Math.sin(G.t * 5) * 0.07 * f.sway);
    let sx = o.real ? K.faceX(f, 0.25) : f.face;
    if (f.spin) { const cs = Math.cos(f.spin); sx = f.face * (Math.abs(cs) < 0.25 ? 0.25 * (cs < 0 ? -1 : 1) : cs); }
    ctx.scale(sx, 1);
    if (o.real && f.flash > 0) D.glow(ctx, '255,255,255', 0, -48, 66, f.flash * 0.3);

    const shx = Math.sin(lean) * 30, shy = hip - Math.cos(lean) * 30;
    const hx = shx + Math.sin(lean) * 12 + 1.5, hy = shy - Math.cos(lean) * 12 - 1;
    const rimS = (w) => { ctx.strokeStyle = G.rgba(rim, 0.2); ctx.lineWidth = w || 0.9; ctx.stroke(); };
    const leg = (front) => {
      const lx = front ? 4 : -4, fx = p[front ? 2 : 4], fy = p[front ? 3 : 5];
      const k = D.ik(lx, hip, fx, fy - 2, 24, 23, -1);
      ctx.fillStyle = front ? c.pants : c.pantsD;
      D.limb(ctx, lx, hip, k.jx, k.jy, 16, 13); ctx.fill(); if (front) rimS();
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey - 3, 13, 10); ctx.fill(); if (front) rimS();
      ctx.fillStyle = front ? c.wrap : c.wrapD;
      D.limb(ctx, G.lerp(k.jx, k.ex, 0.78), G.lerp(k.jy, k.ey, 0.78), k.ex, k.ey - 2, 8, 7.5); ctx.fill();
      ctx.fillStyle = front ? c.skin : c.skinD;
      D.poly(ctx, [k.ex - 4, k.ey - 4, k.ex + 4, k.ey - 3, k.ex + 10, k.ey - 0.5, k.ex + 9, k.ey + 1, k.ex - 5, k.ey + 1]); ctx.fill();
    };
    const arm = (front) => {
      const ax = shx + (front ? 5 : -6), ay = shy + 3, tx = p[front ? 6 : 8], ty = p[front ? 7 : 9];
      const k = D.ik(ax, ay, tx, ty, 17, 17, 1);
      ctx.fillStyle = front ? c.skin : c.skinD;
      D.limb(ctx, ax, ay, k.jx, k.jy, 10, 8); ctx.fill(); if (front) rimS();
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 8, 7); ctx.fill();
      ctx.fillStyle = front ? c.wrap : c.wrapD;
      D.limb(ctx, G.lerp(k.jx, k.ex, 0.45), G.lerp(k.jy, k.ey, 0.45), k.ex, k.ey, 8.5, 8); ctx.fill();
      if (f.open) {
        const a = Math.atan2(k.ey - k.jy, k.ex - k.jx);
        ctx.save(); ctx.translate(k.ex, k.ey); ctx.rotate(a);
        ctx.fillStyle = front ? c.skin : c.skinD;
        D.poly(ctx, [0, -4, 8, -5.5, 12, -2, 12, 2, 8, 5, 0, 4]); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8; D.line(ctx, 6, -1.5, 11, -1.5); D.line(ctx, 6, 1.5, 11, 1.5);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(k.ex, k.ey, 5, 0, G.TAU); ctx.fill(); if (front) rimS(1);
      }
    };

    leg(false);
    arm(false);
    // the top: a sleeveless wrap, crossed at the chest, with skin at the neck
    ctx.fillStyle = c.top;
    D.poly(ctx, [-9, hip + 2, 9, hip + 2, shx + 12, shy + 7, shx + 9, shy - 2, shx + 3, shy - 4, shx - 5, shy - 4, shx - 11, shy, shx - 12, shy + 8]); ctx.fill(); rimS();
    ctx.fillStyle = c.skin;
    const vx = G.lerp(0, shx, 0.62) + 3, vy = G.lerp(hip, shy, 0.62);
    D.poly(ctx, [shx - 1, shy - 3, shx + 7, shy - 2, vx, vy]); ctx.fill();
    ctx.strokeStyle = c.topD; ctx.lineWidth = 2; D.line(ctx, shx + 7, shy - 1, -4, hip + 1);
    // the sash
    ctx.fillStyle = c.belt; D.poly(ctx, [-10, hip - 5, 10, hip - 5, 10, hip + 3, -10, hip + 3]); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-10, hip + 1, 20, 2);
    leg(true);
    // the head: hair swept back to its tie, a lit slit of an eye
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(lean * 0.35 + (p[10] || 0) * 0.6);
    ctx.fillStyle = c.hair;
    D.poly(ctx, [-10, 2, -9, -7, -3, -11.5, 5, -11, 10, -6, 9, -3, 3, -6, -2, -4, -5, 3]); ctx.fill();
    ctx.fillStyle = c.skin;
    D.poly(ctx, [-6, -6, 5, -8, 9, -4, 9.5, 1, 8, 5, 3, 8, -3, 7, -6, 3]); ctx.fill(); rimS(1);
    ctx.fillStyle = c.hair;
    D.poly(ctx, [-7, -7, 6, -9.5, 9.5, -5, 4, -5.5, 1, -3, -3, -5]); ctx.fill();
    ctx.fillStyle = c.belt; ctx.fillRect(-11.5, -4.5, 3, 3);
    if (f.eyesShut) { ctx.strokeStyle = '#120a08'; ctx.lineWidth = 1.2; D.line(ctx, 4, -1.5, 8, -1.2); }
    else {
      const glow = o.real ? Math.max(f.risen || 0, f.still || 0) : 0, ec = (f.still || 0) > 0.3 ? '230,240,255' : (f.risen || 0) > 0.3 ? pal.boss : rim;
      if (glow > 0.1) D.glow(ctx, ec, 6.5, -1.5, 6, 0.6 * glow);
      ctx.strokeStyle = G.rgba(glow > 0.1 ? ec : '240,228,214', 0.95); ctx.lineWidth = 1.5; D.line(ctx, 4.2, -1.8, 8.2, -1.4);
    }
    if (f.laughing) { ctx.strokeStyle = '#140a08'; ctx.lineWidth = 1; D.line(ctx, 4, 4 + Math.sin(G.t * 18) * 0.6, 7.5, 3.4); }
    ctx.restore();
    arm(true);
    // a hand at his hip, glowing blue (a beam coming)
    if (f.handHip) {
      const g = 0.5 + 0.5 * (f.glow || 0);
      D.glow(ctx, WAVE.boss, p[8], p[9], 12 + 12 * g, 0.75);
      ctx.fillStyle = G.rgba(WAVE.hot, 0.6 + 0.4 * g); ctx.beginPath(); ctx.arc(p[8], p[9], 2.5 + 2 * g, 0, G.TAU); ctx.fill();
    }
    // the Sunwell Wave's orb between his hands
    if (f.orb > 0) {
      const mx = (p[6] + p[8]) / 2 + 4, my = (p[7] + p[9]) / 2, r = 3 + 13 * f.orb + 4 * (f.pulse || 0);
      D.glow(ctx, WAVE.boss, mx, my, r * 3.2, 0.8);
      ctx.fillStyle = G.rgba(WAVE.boss, 0.85); ctx.beginPath(); ctx.arc(mx, my, r, 0, G.TAU); ctx.fill();
      ctx.fillStyle = G.rgba(WAVE.hot, 1); ctx.beginPath(); ctx.arc(mx, my, r * 0.55, 0, G.TAU); ctx.fill();
    }
    ctx.restore();
  }

  // the aura: gold flames (Risen, Flare Up), a thin white light (Still Sky), lightning in the gold
  // tongues of flame licking up round his body, each its own height, lean and flicker, none sharing a
  // base line (so the whole never reads as a box of light)
  function flames(ctx, b, col, k, front) {
    const N = front ? 7 : 14, t = G.t, hot = '255,246,214';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (!front) D.glow(ctx, col, b.x, b.y - 50, 80, 0.16 * k);
    for (let i = 0; i < N; i++) {
      const seed = i * 2.399 + (front ? 0.7 : 0), u = Math.sin(seed * 3.1) * 0.5;
      const cyc = (t * (1.6 + (i % 3) * 0.35) + seed) % 1; // each tongue rises, thins and is replaced
      const x = b.x + u * (front ? 30 : 46) + Math.sin(t * 6 + seed) * 3;
      const base = b.y - 6 - (1 - Math.abs(u) * 2) * 26 - cyc * 18;
      const hgt = (front ? 54 : 96) * k * (0.55 + 0.45 * Math.sin(Math.PI * cyc)) * (1 - Math.abs(u) * 0.5);
      const w = (front ? 9 : 15) * (1 - cyc * 0.5), sway = Math.sin(t * 9 + seed * 2) * 7 - u * 10;
      const a = (front ? 0.3 : 0.5) * k * Math.sin(Math.PI * Math.min(1, cyc * 1.4));
      if (hgt < 4 || a < 0.01) continue;
      // the tongue, then its hotter core
      for (const [c, ww, aa, hh] of [[col, w, a, 1], [hot, w * 0.4, a * 0.8, 0.7]]) {
        const g = ctx.createLinearGradient(0, base + ww, 0, base - hgt * hh);
        g.addColorStop(0, G.rgba(c, 0)); g.addColorStop(0.25, G.rgba(c, aa)); g.addColorStop(1, G.rgba(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x, base + ww);
        ctx.quadraticCurveTo(x - ww * 1.4, base - hgt * hh * 0.3, x + sway * hh, base - hgt * hh);
        ctx.quadraticCurveTo(x + ww * 1.4, base - hgt * hh * 0.3, x, base + ww);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawAura(ctx, b, front) {
    const pal = G.pal();
    const gold = Math.max(b.risen, B.flare > 0 ? b.flareK : 0, b.flick);
    if (gold > 0.01) flames(ctx, b, B.phase >= 2 || b.risen > 0.01 ? G.PAL[2].boss : pal.boss, gold, front);
    if (!front && b.still > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      D.glow(ctx, '220,235,255', b.x, b.y - 44, 62, 0.16 * b.still);
      ctx.strokeStyle = G.rgba('235,244,255', 0.12 * b.still); ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const x = b.x + (i - 2.5) * 8;
        ctx.beginPath(); ctx.moveTo(x, b.y - 6);
        ctx.bezierCurveTo(x + Math.sin(G.t * 1.3 + i) * 6, b.y - 40, x - Math.sin(G.t * 1.1 + i * 2) * 6, b.y - 70, x + Math.sin(G.t * 0.9 + i) * 4, b.y - 100);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (front && B.bolts.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
      for (const [w, col, a] of [[3, G.PAL[2].boss, 0.3], [1.2, '255,250,230', 0.85]]) {
        ctx.strokeStyle = G.rgba(col, a); ctx.lineWidth = w;
        ctx.beginPath();
        for (const pts of B.bolts) pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawSunOrb(ctx, x, y, r, col, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    D.glow(ctx, col.boss, x, y, r * 2.3, 0.45);
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0, G.rgba(col.hot, 0.9)); g.addColorStop(0.6, G.rgba(col.boss, 0.7)); g.addColorStop(1, G.rgba(col.boss, 0.12));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, G.TAU); ctx.fill();
    // light drawn into it from all round
    ctx.strokeStyle = G.rgba(col.hot, 0.3); ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * G.TAU + t * 0.5, q = (t * 1.2 + i * 0.37) % 1, d0 = r * (2.2 - 1.1 * q), d1 = d0 - r * 0.35;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1); ctx.stroke();
    }
    ctx.restore();
  }
  function drawGhost(ctx, g) {
    const a = 0.45 * (1 - g.t / g.life);
    if (a <= 0.01) return;
    ctx.save();
    drawFig(ctx, g, a, {});
    ctx.globalCompositeOperation = 'lighter';
    D.glow(ctx, G.pal().boss, g.x, g.y - 44, 60, a * 0.5);
    if (g.lines) {
      ctx.strokeStyle = G.rgba(G.pal().hot, a * 0.6); ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) { const y = g.y - 8 - i * 14; ctx.beginPath(); ctx.moveTo(g.x - 34 - i * 3, y); ctx.lineTo(g.x + 34 + i * 3, y); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawSlabs(ctx) {
    if (!B.slabs) return;
    const pal = G.pal();
    for (const s of B.slabs) {
      if (s.open) {
        const l = s.l, r = s.r, q = mulberry(500 + s.i);
        const g = ctx.createLinearGradient(0, FLOOR - 2, 0, G.H + 60);
        g.addColorStop(0, '#08060b'); g.addColorStop(0.3, '#030205'); g.addColorStop(1, '#000');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(l - 4, FLOOR - 1);
        let y = FLOOR;
        for (let k = 0; k < 6; k++) { y += 14 + q() * 16; ctx.lineTo(l + q() * 12, y); }
        ctx.lineTo(l + 8, G.H + 60); ctx.lineTo(r - 8, G.H + 60);
        const ys = [];
        y = FLOOR; for (let k = 0; k < 6; k++) { y += 14 + q() * 16; ys.push(y); }
        for (let k = ys.length - 1; k >= 0; k--) ctx.lineTo(r - q() * 12, ys[k]);
        ctx.lineTo(r + 4, FLOOR - 1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = G.rgba(pal.rim, 0.5); ctx.lineWidth = 1.5;
        D.line(ctx, l - 8, FLOOR, l + 2, FLOOR + 6); D.line(ctx, r + 8, FLOOR, r - 2, FLOOR + 6);
        if (s.drop < 1) {
          ctx.save();
          ctx.translate((l + r) / 2, FLOOR + 360 * s.drop * s.drop);
          ctx.rotate((s.i % 2 ? 1 : -1) * 0.35 * s.drop);
          ctx.globalAlpha = 1 - s.drop;
          ctx.fillStyle = pal.floorTop; ctx.fillRect(-SW / 2, 0, SW, 6);
          ctx.fillStyle = pal.floor; ctx.fillRect(-SW / 2 + 4, 6, SW - 8, 22);
          ctx.restore();
        }
        continue;
      }
      if (s.crack <= 0) continue;
      ctx.save();
      if (s.quake) ctx.translate(G.rand(-1.5, 1.5) * s.quake, 0);
      const hot = s.crack >= 3;
      for (let k = 0; k < Math.min(4, s.crack + (s.crack >= 2 ? 1 : 0)); k++) {
        const pts = s.cracks[k];
        ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 2.4;
        ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
        ctx.strokeStyle = G.rgba(hot ? pal.boss : pal.rim, hot ? 0.45 + 0.3 * Math.sin(G.t * 12) : 0.18); ctx.lineWidth = 1;
        ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0] + 1, q[1]) : ctx.moveTo(q[0] + 1, q[1]))); ctx.stroke();
      }
      ctx.restore();
    }
  }

  B.drawGround = function (ctx) {
    drawSlabs(ctx);
    if (B.dead) return;
    const b = B.body;
    if (!b.hidden) {
      const k = G.clamp(1 - (gy(b.x) - b.y) / 400, 0.2, 1);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.42 * k) + ')';
      ctx.beginPath(); ctx.ellipse(b.x, FLOOR + 3, 34 * k, 6 * k, 0, 0, G.TAU); ctx.fill();
    }
    for (const g of B.ghosts) drawGhost(ctx, g);
    if (B.shade) drawFig(ctx, B.shade, 0.6 * B.shade.a, { shade: true });
  };
  B.draw = function (ctx) {
    if (B.dead) return;
    const b = B.body;
    if (b.hidden) return;
    drawAura(ctx, b, false);
    // his hair's tail and the sash's ends, behind him
    if (b.lie < 0.3) {
      ctx.fillStyle = CL.hair; D.ribbon(ctx, B.hair, 7, 2, 0); ctx.fill();
      ctx.strokeStyle = G.rgba(G.pal().rim, 0.25); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = CL.belt; D.ribbon(ctx, B.sash, 5, 3.5, 3); ctx.fill();
    }
    drawFig(ctx, b, 1, { real: true });
    drawAura(ctx, b, true);
    if (b.sunK > 0) { const r = sunR(b.sunK); drawSunOrb(ctx, b.x + b.face * 6, b.y - 150 - r, r, B.sunDark ? { boss: G.corrupt.COL.blood, hot: G.corrupt.COL.hot } : SUN, G.t); }
  };
  // over the arena and him, under the hero: the light drained towards the Sun, the full Sun's wash,
  // and the Last Wave
  B.drawOver = function (ctx) {
    const b = B.body;
    if (b && b.sunK > 0 && !b.hidden) {
      const k = b.sunK, r = sunR(k), sx = b.x + b.face * 6, sy = b.y - 150 - r;
      const g = ctx.createRadialGradient(sx, sy, r * 1.1, sx, sy, 1000);
      g.addColorStop(0, 'rgba(4,2,10,0)'); g.addColorStop(0.2, 'rgba(4,2,10,' + (0.3 * k) + ')'); g.addColorStop(1, 'rgba(4,2,10,' + (0.55 * k) + ')');
      ctx.fillStyle = g; ctx.fillRect(-80, -80, G.W + 160, G.H + 160);
    }
    if (B.sunWash > 0) {
      ctx.fillStyle = G.rgba(B.sunDark ? '60,4,16' : '255,170,80', 0.5 * B.sunWash);
      ctx.fillRect(-80, -80, G.W + 160, G.H + 160);
    }
    const W = B.lw;
    if (W) {
      const l = Math.min(W.from, W.front), r = Math.max(W.from, W.front), f = Math.min(1, W.t / 0.15);
      // the wave: deepest at its rippling front, thinning back towards him
      const edge = (y) => W.front + W.dir * (Math.sin(y * 0.021 + G.t * 11) * 12 + Math.sin(y * 0.053 - G.t * 17) * 6);
      const wg = ctx.createLinearGradient(W.from, 0, W.front, 0);
      wg.addColorStop(0, G.rgba(WAVE.boss, 0.08 * f)); wg.addColorStop(0.75, G.rgba(WAVE.boss, 0.26 * f)); wg.addColorStop(1, G.rgba(WAVE.boss, 0.5 * f));
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.moveTo(W.from, -80);
      for (let y = -80; y <= FLOOR; y += 12) ctx.lineTo(edge(y), y);
      ctx.lineTo(W.from, FLOOR); ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(WAVE.hot, 0.22 * f); ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const y = 20 + i * 42 + Math.sin(G.t * 3 + i) * 6, off = (G.t * 1500 * W.dir + i * 130) % (r - l + 1);
        const x = W.dir > 0 ? l + ((off + (r - l)) % (r - l + 1)) : r - ((-off + (r - l)) % (r - l + 1));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - W.dir * 90, y); ctx.stroke();
      }
      if (W.hx != null && W.state !== 'over') {
        // the hero's light meeting it
        // the hero's light: a cone from their weapon, widening to where it holds the wave
        const hc = G.hero().col, wy = FLOOR - 40;
        const hg = ctx.createLinearGradient(W.hx, 0, W.front, 0);
        hg.addColorStop(0, G.rgba(hc, 0.5)); hg.addColorStop(1, G.rgba(hc, 0.14));
        ctx.fillStyle = hg;
        D.poly(ctx, [W.hx, wy - 4, W.front, FLOOR - 230, W.front, FLOOR - 2, W.hx, wy + 4]); ctx.fill();
        D.glow(ctx, hc, W.front, FLOOR - 110, 120, 0.45);
      }
      // the bright, rippling front
      ctx.strokeStyle = G.rgba(WAVE.hot, 0.55 * f); ctx.lineWidth = 3;
      ctx.beginPath(); for (let y = -80; y <= FLOOR; y += 12) (y === -80 ? ctx.moveTo(edge(y), y) : ctx.lineTo(edge(y), y)); ctx.stroke();
      D.glow(ctx, WAVE.hot, W.front, FLOOR - 150, 150, 0.35 * f);
      ctx.restore();
    }
  };

  // ------------------------------------------------------------------ music (audio.js plays B.music)
  // A sparring loop in D dorian, Dm C Bb Am. Phase I: hand drums and a flute line over a plucked bass.
  // Phase II: taiko and brass stabs come in, faster. Phase III: everything, with a snare driving it;
  // except while the Gathered Sun gathers, when there is only a drone and a heartbeat.
  const KB = [{ root: 38, pad: [50, 53, 57] }, { root: 36, pad: [48, 52, 55] }, { root: 34, pad: [46, 50, 53] }, { root: 33, pad: [45, 48, 52] }];
  const FLUTE = [
    [74, -1, -1, 72, 69, -1, 67, -1, 69, -1, 72, -1, 74, -1, -1, -1],
    [72, -1, 69, -1, 67, -1, 64, -1, 67, -1, -1, 69, 72, -1, -1, -1],
    [70, -1, -1, 69, 67, -1, 65, -1, 62, -1, 65, -1, 67, -1, 69, -1],
    [69, -1, 67, -1, 64, -1, -1, 62, 64, -1, 67, -1, 69, -1, -1, -1],
  ];
  const DRUM = [1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 2, 0]; // 1 the low hand drum, 2 the high
  B.music = function (step, t, sd, I, M) {
    const n = (step >> 4) & 3, bar = KB[n], s = step & 15, dest = M.dest;
    if (B.musicMode === 'build') {
      if (s === 0) M.tone({ at: t, type: 'sawtooth', f0: M.mtof(bar.root - 12), dur: sd * 16, vol: 0.05, attack: sd * 8, dest });
      if (s === 0 || s === 3) M.tone({ at: t, f0: 90, f1: 40, dur: 0.22, vol: s ? 0.3 : 0.45, dest });
      return;
    }
    if (s === 0) M.pad(bar, t, sd * 16, I);
    if (DRUM[s] === 1) M.tone({ at: t, type: 'sine', f0: 150, f1: 70, dur: 0.16, vol: 0.32, dest });
    if (DRUM[s] === 2) M.tone({ at: t, type: 'sine', f0: 540, f1: 260, dur: 0.08, vol: 0.12, dest });
    if (s % 2 === 1 || I >= 3) M.hat(t, 0.025 + 0.012 * I);
    if (s % 4 === 0 || (I >= 2 && s % 4 === 3)) M.bass(bar.root + (s === 8 && I >= 2 ? 12 : 0), t, sd * 1.4);
    const fl = FLUTE[n][s];
    if (fl > 0) M.tone({ at: t, type: 'triangle', f0: M.mtof(fl), dur: sd * 2.4, vol: 0.055, attack: 0.03, dest });
    if (I >= 2) {
      if (s === 0 || s === 10) { M.tone({ at: t, type: 'sine', f0: 92, f1: 40, dur: 0.45, vol: 0.5, dest }); M.noise({ at: t, dur: 0.09, vol: 0.12, type: 'lowpass', f0: 900, dest }); }
      if (s === 6 || s === 14) for (const m of bar.pad) M.tone({ at: t, type: 'sawtooth', f0: M.mtof(m + 12), dur: sd * 1.6, vol: 0.028, dest });
    }
    if (I >= 3) {
      if (s === 4 || s === 12) M.snare(t, 1);
      if (s % 2 === 0) M.tone({ at: t, type: 'triangle', f0: M.mtof(bar.pad[(s >> 1) % 3] + 24), dur: sd, vol: 0.028, dest });
    }
  };

  G.makeBoss(B);
  G.BOSS_IDS.push('kairo');
})();
