// Solfall - The Silent Veil: a hooded assassin. It vanishes, strikes along marked lines, throws
// knives and, later, fights beside its own shadows. Every attack leaves it open for a moment.
'use strict';
(function () {
  const { wait, tween, par } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards, K = G.kit, D = G.draw, DANGER = G.COL.danger;
  const WL = G.WALL_L, WR = G.WALL_R;

  const B = {
    id: 'assassin', name: 'THE SILENT VEIL', short: 'The Veil', theme: 'assassin',
    snapTurn: true, // (v2.5e) flips at once when it turns: see K.turn
    sub: 'You will not hear it coming', taunt: 'it has studied you',
    blurb: 'A hooded killer that strikes from nowhere',
    tips: [
      'Every attack leaves the Veil open for a moment afterwards. Wait for it, then strike.',
      'When it sinks into a crouch and its blade catches the light, it is about to cross the floor. Jump it, or dash through it for a perfect dodge.',
      'When it drops from above its blade sticks in the floor, and it takes extra damage until it pulls free.',
      'Its shadows vanish at a single hit and give Starlight.',
      'A line across the arena is a cut. Step off it, or jump it if it lies flat.',
      'Listen to the tempo of its flurry. Three measured cuts end in a fan of knives; five quick ones end in a single knife that bursts for two health.',
    ],
    hudCols: [null, ['#a070ff', '#e4d4ff'], ['#40e0a8', '#c8ffe8'], ['#d8d8f0', '#ffffff']],
    BASE_HP: 3000, poise0: 340, w: 36, h: 84,
    teleK: 0.9, // its warnings, against the difficulty's (v2.4d: they were easy to read)
    answer: 'hunt',
    antiAir: 'skyhook', // (bosskit: a hero who keeps riding over its head)
    gaps: [0, 0.7, 0.55, 0.44], // (v2.4d: 0.8, 0.62, 0.5)
    bags: {
      1: ['lunge', 'flurry', 'knives', 'ambush', 'backstab', 'echo', 'stance', 'crescent', 'snare', 'dance', 'moonfall'],
      2: ['pincer', 'flurry', 'knives', 'ambush', 'backstab', 'mirror', 'rain', 'cross', 'echo', 'stance', 'crescent', 'snare', 'dance', 'moonfall'],
      3: ['pincer', 'flurry', 'ambush', 'backstab', 'mirror', 'rain', 'cross', 'cuts', 'mark', 'echo', 'hunt', 'stance', 'crescent', 'snare', 'dance', 'moonfall'],
    },
    cards: { 2: ['SHADOWS', 'It no longer hunts alone'], 3: ['EXECUTION', 'No more warnings than these'] },
    first: { 1: 'lunge', 2: 'mirror', 3: 'cuts' },
  };

  // its own sounds (never a hero's: Eos's draw, sheath and iai stay hers)
  {
    const S = G.audio.synth;
    // a blow caught on a hand's width of drawn steel: a dry scrape and a thin, sour ring
    G.audio.define('veilparry', () => {
      S.noise({ dur: 0.04, vol: 0.32, type: 'highpass', f0: 4200 });
      S.tone({ type: 'square', f0: 2400, f1: 1300, dur: 0.06, vol: 0.09 });
      S.tone({ type: 'triangle', f0: 1240, f1: 1170, dur: 0.38, vol: 0.06 });
      S.noise({ dur: 0.09, vol: 0.18, type: 'lowpass', f0: 700, f1: 200 });
    });
    // its blades seated in their sheaths: a low, dry tick and nothing after it
    G.audio.define('veilclick', () => {
      S.noise({ dur: 0.025, vol: 0.26, f0: 1500, q: 5 });
      S.tone({ type: 'triangle', f0: 380, f1: 300, dur: 0.06, vol: 0.12 });
    });
    // the crescent in flight: air cut over and over, loudest as it turns
    // blade laid on blade, once for each cut to come: a small, bright tick
    G.audio.define('veiltap', () => {
      S.noise({ dur: 0.018, vol: 0.2, type: 'highpass', f0: 5200 });
      S.tone({ type: 'triangle', f0: 2650, f1: 2500, dur: 0.07, vol: 0.06 });
    });
    // its threads drawn tight: a thin whine climbing as they take the strain
    G.audio.define('veilstrain', (o) => {
      const dur = o.dur || 0.8;
      S.tone({ type: 'sine', f0: 520, f1: 1500, dur, vol: 0.035 });
      S.tone({ type: 'triangle', f0: 1046, f1: 2980, dur, vol: 0.018 });
      S.noise({ dur, vol: 0.03, f0: 2600, f1: 4200, q: 8 });
    });
    // and let go: a whip-crack and the thread singing for a moment
    G.audio.define('veilsnap', () => {
      S.noise({ dur: 0.05, vol: 0.34, type: 'highpass', f0: 2400 });
      S.tone({ type: 'square', f0: 1900, f1: 520, dur: 0.09, vol: 0.08 });
      S.tone({ type: 'sine', f0: 1480, f1: 1420, dur: 0.32, vol: 0.05 });
    });
    // moonfall: a deep breath of cold air, and the hum of many blades turning in it
    G.audio.define('veilmoon', (o) => {
      const dur = o.dur || 1.6;
      S.tone({ type: 'sine', f0: 92, f1: 70, dur, vol: 0.11 });
      S.tone({ type: 'triangle', f0: 184, f1: 176, dur: dur * 0.8, vol: 0.04 });
      S.noise({ dur, vol: 0.05, type: 'lowpass', f0: 600, f1: 240 });
    });
    // the echo's working: a low held note under a breath of dark air, the shadows being drawn out
    G.audio.define('veilchannel', (o) => {
      const dur = o.dur || 3;
      S.tone({ type: 'sine', f0: 110, f1: 103, dur, vol: 0.07 });
      S.tone({ type: 'triangle', f0: 331, f1: 309, dur: dur * 0.9, vol: 0.022 });
      S.noise({ dur, vol: 0.035, f0: 900, f1: 480, q: 4 });
    });
    G.audio.define('veilwhirr', (o) => {
      const dur = o.dur || 1.4, n = Math.round(dur / 0.075);
      for (let i = 0; i < n; i++) S.noise({ dur: 0.055, vol: 0.03 + 0.07 * Math.sin(Math.PI * (i + 0.5) / n), f0: 1500 + 600 * Math.sin(Math.PI * i / n), q: 3, delay: i * 0.075 });
    });
  }

  // ------------------------------------------------------------------ poses
  // lean (upper body), hip height, whole-body turn, two feet (x, y), two hands (x, y, blade angle)
  const POSES = {
    idle: [0.2, -38, 0, 13, 0, -13, 0, 21, -50, 2.3, -13, -47, 2.7],
    crouch: [0.5, -27, 0, 17, 0, -15, 0, 17, -45, -2.5, -15, -34, 2.9],
    dash: [1.2, -28, 0, -10, -6, -30, -12, 34, -30, 0.05, 24, -22, 0.2],
    skid: [0.55, -24, 0, 22, 0, -17, 0, 16, -7, 1.7, -19, -40, 2.8],
    slashA: [0.45, -34, 0, 19, 0, -15, 0, 36, -40, 0.5, -15, -44, 2.7],
    slashB: [0.3, -35, 0, 19, 0, -15, 0, 30, -72, -1.0, -12, -40, 2.6],
    air: [0.05, -40, 0, 8, -12, -11, -5, 15, -62, -1.2, -15, -58, -2.0],
    throw: [-0.05, -39, 0, 14, 0, -13, 0, 36, -66, -0.3, -13, -50, 2.7],
    dive: [0.15, -40, 2.75, 5, -8, -6, -2, 12, -74, -1.5, -8, -74, -1.65],
    stuck: [0.75, -22, 0, 19, 0, -19, 0, 21, -8, 1.57, -10, -30, 2.7],
    kneel: [0.8, -20, 0, 15, 0, -21, 0, 12, -6, 1.6, -8, -9, 1.75],
    // on the way back to rest: a flick that throws the blades out to either side, and the hands
    // crossing at the waist as a spent throwing arm comes home
    flick: [0.05, -40, 0, 15, 0, -14, 0, 31, -42, 0.85, -27, -44, 2.3],
    sheathe: [0.28, -37, 0, 12, 0, -12, 0, 7, -43, 1.95, -3, -41, 1.15],
    // corrupted: the blade raised high over the hero's shadow, then driven down into it from one knee
    pinUp: [0.3, -31, 0, 18, 0, -17, 0, 17, -76, -1.45, -12, -42, 2.7],
    pin: [0.88, -19, 0, 19, 0, -22, 0, 31, -7, 1.5, -12, -28, 2.8],
    // corrupted: both hands drawn back with the fingers spread, then flung forward to let the thread go
    strings: [-0.14, -38, 0, 16, 0, -14, 0, -8, -80, -2.0, -22, -44, 2.4],
    cast: [0.35, -36, 0, 21, 0, -16, 0, 37, -55, -0.15, 30, -45, 0.1],
    streak: null, // (corrupted) the dash, laid along the line of a cut (set for each cut)
    // the stance: bowed, both blades home along the forearms, the lead hand on the hilt either low at
    // the hip (the cut will come low) or high at the shoulder (it will come at a leaping height)
    // (v2.5c: told further apart: low is wide and sunk with the hand at the hip; high stands taller on
    // a lifted back heel, the hand up by the cheek)
    stanceLo: [0.7, -27, 0, 24, 0, -22, 0, 6, -31, 2.85, -6, -34, 2.95],
    stanceHi: [0.35, -33, 0, 17, 0, -17, -5, 14, -74, -2.75, 2, -62, -2.85],
    // a blow caught on a hand's width of drawn steel
    parry: [0.25, -34, 0, 21, 0, -16, 0, 24, -52, -1.25, -4, -42, 2.8],
    // the draw at a leaping height: laid out flat in the air, the blade out ahead
    drawHi: [1.3, -34, 0, -14, -12, -30, -4, 56, -44, -0.12, 2, -38, 3.0],
    // the crescent: wound back over the head, or swept back low by the hip; let go; watched; caught
    windOver: [-0.32, -38, 0, 18, 0, -17, 0, -18, -92, -2.3, 12, -58, 0.35],
    throwOver: [0.72, -31, 0, 23, 0, -14, -2, 36, -34, 0.6, -2, -42, 2.8],
    windSide: [0.15, -27, 0, 21, 0, -19, 0, -15, -44, 3.05, 21, -46, 0.25],
    throwSide: [0.55, -30, 0, 27, 0, -12, 0, 40, -38, 0.0, -10, -44, 2.8],
    watch: [0.12, -37, 0, 15, 0, -14, 0, 26, -50, 2.4, -12, -46, 2.7],
    catch: [-0.05, -38, 0, 12, 0, -16, 0, 30, -60, -0.6, -13, -47, 2.7],
    // the skyhook: head back, looking up the column at the hero; or sunk deep with both blades turned
    // up along the forearms, about to go straight up; and the heel coming down out of the air
    lookUp: [-0.62, -38, 0, 10, 0, -16, 0, 10, -57, -1.3, -12, -42, 2.6],
    coilUp: [0.34, -21, 0, 19, 0, -17, 0, 9, -24, -1.57, -15, -28, -1.4],
    heel: [0.08, -46, 0, 5, 0, -9, -28, 16, -62, -1.25, -15, -58, -2.0],
    // a lunge with its weight on the back foot and the blades held back: it will stop short
    // (v2.5c: sat right back on its heels, the front foot light on its toe, both blades behind the hip)
    feint: [-0.1, -27, 0, 26, -2, -20, 0, -14, -40, 2.9, -20, -46, 2.7],
    // the flurry's last cut, held: the blade high behind the head
    slashHold: [-0.2, -37, 0, 19, 0, -15, 0, -8, -88, -2.25, -14, -46, 2.7],
    // the snare: an underhand flick (the arm back low, then through and up) and the yank
    windUnder: [0.25, -29, 0, 19, 0, -17, 0, -24, -22, 2.7, -12, -44, 2.7],
    flickUnder: [0.32, -32, 0, 21, 0, -15, 0, 34, -30, -0.35, -13, -44, 2.7],
    pull: [-0.18, -37, 0, 15, 0, -16, 0, -18, -56, 2.5, 9, -46, 0.4],
    // the dance: blade laid against blade at the chest, once for each cut to come
    tapUp: [0.16, -36, 0, 15, 0, -14, 0, 17, -80, -1.25, 7, -52, -0.15],
    tapDown: [0.24, -35, 0, 15, 0, -14, 0, 9, -54, 0.55, 7, -52, -0.15],
    // the echo's working: down on one knee, both blades crossed upright before its face
    channel: [0.32, -22, 0, 15, 0, -20, 0, 9, -60, -2.05, 5, -58, -1.05],

    // ---- v2.5c: the in-between poses (key poses inside the same timings; see keys() below)
    // the lunge: a settle back onto the heels, then down into a sprinter's set, the lead blade low and
    // pointing at the hero, the other laid back along the forearm; and the skid it overshoots into
    lungeDip: [0.25, -29, 0, 18, 0, -17, 0, 14, -44, 2.6, -14, -40, 2.9],
    lungeSet: [0.95, -22, 0, 24, 0, -26, 0, 52, -30, 0.15, 2, -36, 3.0],
    skidOver: [0.85, -21, 0, 26, 0, -20, 0, 44, -22, 0.3, -14, -38, 2.9],
    // measured cuts: a dip with the blade drawn low, then tall with the blade raised high behind the
    // head and the other hand aimed (a cut down), or sunk with the blade by the knee (a cut back up);
    // and where each blow carries the blade on past
    cutDip: [0.65, -27, 0, 21, 0, -17, 0, 10, -30, 2.4, 8, -44, 2.9],
    cutHighA: [0.0, -37, 0, 20, 0, -16, 0, -6, -92, -2.4, 20, -52, 0.3],
    cutLowB: [0.6, -29, 0, 24, 0, -18, 0, 30, -27, 1.2, -12, -52, 3.7],
    slashAFol: [0.7, -31, 0, 22, 0, -16, 0, 30, -26, 1.5, -14, -46, 2.7],
    slashBFol: [0.05, -37, 0, 19, 0, -15, 0, 14, -86, -1.9, -12, -42, 2.6],
    // quick cuts: hunched, both fists up by the face with the blades hanging point down, bouncing on
    // the balls of its feet; small cocks and small chops
    quickSet: [0.55, -30, 0, 17, 0, -17, 0, 18, -64, 1.9, 9, -59, 1.6],
    quickA: [0.55, -31, 0, 18, 0, -16, 0, 12, -66, -1.9, 16, -46, 2.8],
    quickB: [0.6, -30, 0, 18, 0, -16, 0, 28, -40, 0.9, 6, -50, 2.6],
    chopA: [0.6, -32, 0, 19, 0, -15, 0, 30, -38, 0.7, 10, -50, 2.6],
    chopB: [0.5, -33, 0, 19, 0, -15, 0, 26, -66, -0.9, 8, -48, 2.6],
    // out of the smoke behind the hero: low, the blade raised point-down over the shoulder, the other
    // hand reaching to grab; and the hunt's cross of both blades overhead (on the floor or in the air)
    stabSet: [0.45, -26, 0, 22, 0, -20, 0, 6, -76, 1.75, 34, -46, 0.2],
    huntSet: [0.3, -30, 0, 21, 0, -18, 0, 12, -82, -2.1, 2, -80, -0.9],
    airCock: [0.1, -42, 0, 10, -14, -10, -8, 10, -84, -2.0, 2, -80, -1.0],
    // knives: tucked in the spring back, drawing them; a fan cocked behind the head (either hand) and
    // the arm come through; the flurry's fan backhanded from across the body; the bursting knife
    // lobbed from straight back over the head
    springTuck: [0.3, -40, 0, 10, -18, -8, -14, 14, -52, 2.6, 8, -50, 2.4],
    fanHigh: [-0.2, -37, 0, 22, 0, -17, 0, -22, -78, -2.6, 18, -60, 0.0],
    fanHighB: [-0.2, -37, 0, 22, 0, -17, 0, 24, -54, 0.1, -20, -80, -2.6],
    throwB: [0.35, -37, 0, 21, 0, -15, 0, -4, -46, 2.7, 34, -60, -0.2],
    throwFol: [0.45, -35, 0, 21, 0, -15, 0, 30, -34, 0.6, -14, -46, 2.7],
    throwFolB: [0.45, -35, 0, 21, 0, -15, 0, -2, -44, 2.7, 22, -40, 0.6],
    fanLow: [0.5, -31, 0, 24, 0, -18, 0, -4, -44, 2.9, -16, -50, 2.6],
    fanSweep: [0.2, -36, 0, 22, 0, -16, 0, 38, -55, -0.1, -14, -44, 2.7],
    lobWind: [-0.35, -36, 0, 24, 0, -14, 0, -30, -84, -2.2, 12, -74, -0.6],
    lobThrow: [0.35, -37, 0, 22, 0, -15, 0, 34, -78, -0.7, -12, -46, 2.7],
    // landing on the blade from a height: the weight goes on down through the knee before it holds
    stuckDeep: [0.9, -18, 0, 20, 0, -20, 0, 22, -4, 1.57, -12, -26, 2.8],
    // an echo's shadow standing up out of the floor, head down, blades trailing on the boards; set in
    // the air, tucked with the blade out at the hero
    shadeRise: [0.9, -20, 0, 15, 0, -20, 0, 14, -10, 1.6, -6, -16, 1.8],
    airSet: [0.7, -40, 0, 8, -16, -14, -10, 40, -46, 0.1, 2, -52, 3.0],
    // after a draw, held a breath with the blade out flat before it goes home
    drawFol: [0.75, -24, 0, 26, 0, -22, 0, 46, -40, -0.05, -10, -40, 2.9],
    // the crescent: a reach over the shoulder for it (overhand), or a dip with the arm already low
    // (sidearm); and where the arm ends up once the weight has gone with it
    reachBack: [0.1, -37, 0, 16, 0, -14, 0, -10, -80, -2.6, -12, -46, 2.7],
    sideDip: [0.45, -26, 0, 20, 0, -18, 0, 0, -36, 2.9, 14, -48, 0.4],
    throwOverFol: [0.85, -28, 0, 24, 0, -14, -2, 34, -20, 1.0, -2, -40, 2.8],
    throwSideFol: [0.45, -32, 0, 27, 0, -12, 0, 28, -50, -0.6, -10, -44, 2.8],
    catchJolt: [-0.15, -38, 0, 12, 0, -16, 0, 6, -62, -1.2, -13, -47, 2.7],
    // the snare is two-handed (a knife in each, the thread between): both low and spread by the knees,
    // or both stretched wide over the head; flung out; then fists at the chest drawing it tight
    snareUnder: [0.8, -25, 0, 24, 0, -20, 0, 30, -18, 1.4, 4, -24, 1.9],
    snareFlick: [0.3, -34, 0, 22, 0, -15, 0, 38, -50, -0.5, 26, -42, 0.2],
    snareOver: [-0.25, -37, 0, 20, 0, -16, 0, 10, -94, -1.3, -26, -92, -2.0],
    snareCast: [0.6, -32, 0, 23, 0, -14, -2, 40, -48, 0.3, 26, -66, -0.3],
    snareHold: [-0.05, -36, 0, 18, 0, -16, 0, 22, -58, -0.3, 4, -54, 2.8],
    // the dance: the blades crossed in an X before the chest, low (or tucked in the air)
    danceCoil: [0.75, -25, 0, 22, 0, -20, 0, 26, -52, -0.9, 22, -48, -2.2],
    airCoil: [0.4, -42, 0, 10, -16, -10, -12, 22, -66, -0.9, 18, -62, -2.2],
    // moonfall: arms opened wide with the head up as the light goes, then sunk with both arms swept
    // back behind it to leap
    moonSpread: [-0.2, -34, 0, 22, 0, -20, 0, 26, -66, -0.4, -30, -64, -2.7],
    moonSink: [0.55, -20, 0, 22, 0, -20, 0, -6, -46, -2.4, -14, -40, -2.6],
    // rain: hanging with the arms crossed over the chest, then flung wide and down
    rainWind: [0.0, -42, 0, 8, -16, -10, -10, -6, -66, -2.6, 14, -66, -0.5],
    rainThrow: [0.1, -40, 0, 10, -8, -12, -4, 28, -50, 0.9, -20, -50, 2.2],
  };
  // poses it snaps into rather than eases (the rest follow at the usual rate)
  const SNAP = {
    dash: 60, dive: 60, streak: 60, drawHi: 60, throwOver: 44, throwSide: 44, parry: 50, heel: 60, flickUnder: 46, pull: 46,
    // (v2.5c) blows snap; where the blade is carried on past them settles slower, with the weight
    slashA: 50, slashB: 50, chopA: 62, chopB: 62, throw: 44, throwB: 44, fanSweep: 46, lobThrow: 46, snareFlick: 46, snareCast: 46,
    rainThrow: 46, skidOver: 40, stuckDeep: 40, catchJolt: 40,
    slashAFol: 18, slashBFol: 18, throwOverFol: 18, throwSideFol: 18,
  };
  // poses that carry on into another by themselves after a moment: a blow's follow-through, a skid's
  // overshoot, a landing's give. (Never stuck or kneel: B.recover reads those.)
  const NEXT = {
    slashA: ['slashAFol', 0.07], slashB: ['slashBFol', 0.07], skidOver: ['skid', 0.12], stuckDeep: ['stuck', 0.14],
    throwOver: ['throwOverFol', 0.09], throwSide: ['throwSideFol', 0.09], catchJolt: ['watch', 0.1],
  };
  // poses it breathes in, [depth, rate]: easy at rest, heaving when spent
  const BREATH = { idle: [0.7, 3.1], skid: [1.0, 7], kneel: [1.6, 8.5], stuck: [1.3, 8], watch: [0.5, 3.4], sheathe: [0.5, 3] };
  // a pose between two others, written into a figure's own scratch pose (a.live)
  function mixPose(a, P0, P1, k) {
    const p = a.live || (a.live = P0.slice());
    for (let i = 0; i < NP; i++) p[i] = P0[i] + (P1[i] - P0[i]) * k;
    a.pose = 'live';
    return p;
  }
  const NP = 13;
  // (v2.5c) Key poses inside a timing. ks: [[at (0..1), pose (a name, an array, or null for wherever
  // the figure was when this began), ease into it], ...]; the pose at k is eased from one key to the
  // next and written into a.live, which the figure then follows quickly (a.liveRate).
  const poseOf = (x, from) => (x == null ? from : typeof x === 'string' ? (POSES[x] || POSES.idle) : x);
  function poseAt(a, ks, k, from) {
    const p = a.live || (a.live = a.p.slice());
    let i = 0;
    while (i < ks.length - 1 && k >= ks[i + 1][0]) i++;
    const k0 = ks[i], k1 = ks[i + 1], P0 = poseOf(k0[1], from);
    if (!k1) for (let j = 0; j < NP; j++) p[j] = P0[j];
    else {
      const P1 = poseOf(k1[1], from), u = G.clamp((k - k0[0]) / Math.max(1e-6, k1[0] - k0[0]), 0, 1), q = (k1[2] || E.inOutQuad)(u);
      for (let j = 0; j < NP; j++) p[j] = P0[j] + (P1[j] - P0[j]) * q;
    }
    a.pose = 'live';
    return p;
  }
  // The same, as a wait: it takes exactly the frames wait(dur) would. If something else sets the
  // figure's pose meanwhile (a blow landing sets its own), it lets go of it, unless o.force.
  // o.fx(p, k, e) may add to the pose (a tremor, a breath); o.box is the shape a shadow is struck in.
  function* keys(a, dur, ks, o) {
    o = o || {};
    let e = 0, mine = false, from = null;
    while (e < dur) {
      e += yield;
      if (a.gone || (mine && a.pose !== 'live' && !o.force)) continue;
      if (!from) from = a.p.slice();
      const k = Math.min(1, e / dur), p = poseAt(a, ks, k, from);
      if (o.fx) o.fx(p, k, e);
      a.liveRate = o.rate || 30; a.liveBox = o.box || null;
      mine = true;
    }
  }
  // Several at once, started together (unlike seq.par, no first frame is lost).
  function* together(...gens) {
    let alive = gens.filter((g) => !g.next().done);
    while (alive.length) { const dt = yield; alive = alive.filter((g) => !g.next(dt).done); }
  }
  // a fine, even tremble (never random: a held breath, not jitter)
  const tremble = (p, amt, t) => { p[1] += Math.sin(t * 70) * 0.8 * amt; p[0] += Math.sin(t * 53) * 0.012 * amt; p[8] += Math.sin(t * 81) * 1.1 * amt; };
  // a spring back off the hero: knees tucked up as it rises, legs let down to land
  const SPRING = [[0, null], [0.4, 'springTuck', E.outQuad], [1, 'air', E.inQuad]];
  function runPose(t) {
    const s = Math.sin(t), c = Math.cos(t);
    return [0.55, -36, 0, s * 20, -Math.max(0, c) * 12, -s * 20, -Math.max(0, -c) * 12, -18, -46, 2.95, -26, -50, 3.05];
  }

  // ------------------------------------------------------------------ state
  B.setup = function () {
    const b = B.body;
    b.x = 900; b.y = -120; b.pose = 'dive'; b.hurt = false; b.p = POSES.dive.slice(); b.runT = 0;
    B.clones = []; B.serial = 0;
    B.scarf = D.chain(11, b.x, b.y - 70); B.scarfV = null; b.liv = null;
    B.lights = true; B.dark = 0; B.wires = []; B.wireHit = 0;
    B.pinned = null; B.strings = 0;
  };
  B.onRelease = function () { B.steadfast = false; const b = B.body; b.fading = false; b.hurt = false; b.pose = 'idle'; b.hidden = false; B.pinned = null; B.strings = 0; b.still = false; b.held = false; B.guard = null; B.moon = false; };
  B.onInterrupt = function () { B.steadfast = false; const b = B.body; b.fading = false; for (const c of B.clones) smoke(c.x, c.y - 40); B.clones.length = 0; B.pinned = null; B.strings = 0; b.still = false; b.held = false; B.guard = null; B.moon = false; };
  // In its stance a blow is caught, not taken (see atkStance). Dawnbreak is not caught.
  B.blocked = function (t, info) {
    const g = B.guard;
    if (!g || !g.on || t.kind !== 'body' || G.player.ulting) return false;
    if (!g.hit) g.hit = { x: info.x, y: info.y };
    return true;
  };
  B.onStagger = function () { B.body.pose = 'kneel'; };
  B.staggerWord = 'CAUGHT'; B.staggerMult = 1.9; B.staggerDur = 0.7;
  B.staggerIn = function* () {
    const b = B.body, dir = -(G.sign(G.player.x - b.x) || b.face);
    const x0 = b.x, y0 = Math.min(b.y, FLOOR), tx = dir > 0 ? WR - 26 : WL + 26;
    b.pose = 'air'; b.face = -dir;
    G.audio.play('whoosh');
    const dur = 0.2 + Math.abs(tx - x0) / 2600;
    let e = 0;
    while (e < dur) {
      e += yield;
      const k = Math.min(1, e / dur);
      b.x = G.lerp(x0, tx, k); b.y = G.lerp(y0, FLOOR - 110, k) - 4 * 70 * k * (1 - k);
      G.fx.spawn({ x: b.x - dir * 16, y: b.y - G.rand(10, 60), vx: -dir * G.rand(40, 200), vy: G.rand(-30, 30), life: 0.25, size: G.rand(4, 9), color: G.pal().boss });
    }
    // into the wall
    G.audio.play('slam'); G.fx.shake(15); G.fx.stop(0.08); G.fx.impact(tx, b.y - 40, 0.06);
    G.fx.burst(tx + dir * 10, b.y - 40, { n: 14, color: '24,20,34', speed: [150, 560], angle: dir > 0 ? Math.PI : 0, spread: 2.2, life: [0.5, 1.1], size: [5, 10], kind: 'chunk', grav: 1400 });
    G.fx.dust(tx, b.y - 40, 6, { dir: -dir, speed: [60, 260], size: [8, 15], life: [0.5, 1], up: 30 });
    G.fx.lines(tx, b.y - 40, 12, G.pal().hot, { r0: 20 });
    yield* wait(0.12);
    b.pose = 'kneel';
    yield* tween(b, { y: FLOOR }, 0.28, E.inQuad);
    G.fx.thud(b.x, FLOOR, 0.6, { noCrack: true });
  };
  B.reckonName = 'DEATH MARK';
  B.onReckon = function (on) { B.body.pose = on ? 'crouch' : 'idle'; };
  B.onRecover = function () { B.body.pose = 'idle'; };
  B.dying0 = function () { B.body.pose = 'kneel'; B.clones.length = 0; };

  function smoke(x, y) {
    G.fx.dust(x, y, 9, { speed: [20, 170], size: [10, 20], life: [0.4, 0.9], up: 60, a: 0.5, color: '20,17,32', jitter: 16 });
    G.fx.shards(x, y, 3, G.pal().boss, { speed: [80, 300], size: [2, 4] });
    G.fx.burst(x, y, { n: 8, color: G.pal().boss, speed: [60, 260], life: [0.2, 0.5], size: [2, 5], kind: 'spark' });
  }
  function* vanish() {
    const b = B.body;
    b.hurt = false;
    G.audio.play('blink');
    smoke(b.x, b.y - 40);
    // she thins into the smoke rather than going out like a light
    b.fading = true;
    for (let t = 0; t < 0.06;) { t += yield; b.vis = Math.max(0, 1 - t / 0.06); } // (exactly the old wait(0.06))
    b.hidden = true; b.fading = false;
  }
  function appear(x, y, pose) {
    const b = B.body;
    b.x = x; b.y = y; b.hidden = false; b.pose = pose || 'idle';
    if (POSES[b.pose]) b.p = POSES[b.pose].slice();
    b.face = G.player.x >= x ? 1 : -1; b.tqf = b.face; b.tqP = 1; // she comes out of the smoke already facing the hero
    b.vis = 0; // and gathers out of it, quickly (B.tick)
    for (const p of B.scarf) { p.x = x; p.y = y - 70; }
    if (B.scarfV) for (const v of B.scarfV) { v.x = 0; v.y = 0; }
    smoke(x, y - 40);
  }
  // quiet: it fades in (c.vis, from 0) instead of bursting out of smoke
  // (the duelling shade on the road between trials is drawn as one of these: rest.js)
  G.veilShade = { pose: (name) => (POSES[name] || POSES.idle).slice(), draw: (ctx, a, alpha) => {
    // (it has no tick of ours: its springs step on the clock as it is drawn)
    const dt = a.livT == null ? 0 : G.clamp(G.t - a.livT, 0, 0.05);
    a.livT = G.t; living(a, dt); figure(ctx, a, alpha);
  } };
  function clone(x, y, face, pose, quiet) {
    const c = {
      id: 'shade' + (B.serial++), x, y, face, pose: pose || 'crouch', hurt: false, clone: true, runT: 0, p: null,
      onHit() {
        this.gone = true;
        G.player.gain(10);
        smoke(this.x, this.y - 40);
        G.audio.play('orbPop');
        return true;
      },
    };
    c.p = (POSES[c.pose] || POSES.idle).slice();
    B.clones.push(c);
    if (!quiet) smoke(x, y - 40);
    return c;
  }

  // ------------------------------------------------------------------ building blocks
  // A melee cut in front of whoever swings it.
  function swing(a, o) {
    const f = a.face;
    const m = (ang) => (f > 0 ? ang : Math.PI - ang);
    return H.arc({
      x: a.x + f * 8, y: a.y - 44, r: o.r, a0: m(o.a0), a1: m(o.a1), tele: o.tele, active: 0.1, owner: a,
      follow(h) { if (!h.fired) { h.x = a.x + a.face * 8; h.y = a.y - 44; } },
      onFire() { G.audio.play('blade'); a.pose = o.pose || 'slashA'; G.fx.shake(3); },
    });
  }

  // Crouch, then cross the floor in a blink. The lane shows the height: jump it or dash through.
  function* lunge(a, toX, tele) {
    const dir = G.sign(toX - a.x) || 1;
    a.face = dir; a.pose = 'crouch';
    H.lane({ x: WL, y: a.y - 66, w: WR - WL, h: 66, dir, dur: tele, quiet: true });
    // no lane on the floor: it sinks into its crouch, and the blade catches the light before it goes
    // (v2.5c: a settle back onto its heels, then down and forward into a sprinter's set with the lead
    // blade low and pointed at the hero; held there, trembling, through the glint)
    yield* keys(a, Math.max(0, tele - 0.2), [[0, null], [0.22, 'lungeDip', E.outQuad], [0.72, 'lungeSet', E.inOutQuad], [1, 'lungeSet']],
      { fx: (p, k) => { p[1] += 2 * Math.max(0, k - 0.72) / 0.28; } });
    if (a.gone) return;
    G.fx.glint(a.x + dir * 20, a.y - 44, 26, a.clone ? '170,160,210' : G.pal().hot); G.audio.play('glint');
    yield* keys(a, Math.min(tele, 0.2), [[0, null], [1, 'lungeSet']], { rate: 40, fx: (p, k, e) => { p[1] += 2; p[0] += 0.04 * k; tremble(p, k, e); } });
    if (a.gone) return;
    a.pose = 'dash'; a.hurt = true;
    G.audio.play('streak');
    const x0 = a.x, dur = Math.max(0.12, Math.abs(toX - x0) / 1750);
    let e = 0;
    while (e < dur && !a.gone) {
      e += yield;
      a.x = G.lerp(x0, toX, Math.min(1, e / dur));
      G.fx.spawn({ x: a.x - dir * 20, y: a.y - G.rand(10, 60), vx: -dir * G.rand(40, 200), vy: G.rand(-30, 30), life: 0.25, size: G.rand(4, 9), color: a.clone ? '20,16,34' : G.pal().boss });
    }
    // it overshoots into the skid, blade still out, then rises into it (NEXT)
    a.hurt = false; a.pose = 'skidOver';
    if (!a.clone) a.recV = (a.recV || 0) + dir * 1.2;
  }
  const farSide = (x) => (x < G.player.x ? Math.min(WR - 60, G.player.x + 300) : Math.max(WL + 60, G.player.x - 300));

  // Thin warning lines for thrown knives; when they fill, the knives fly.
  function volley(ox, oy, angs, tele, speed) {
    H.add({
      kind: 'aim', t: 0,
      update() {
        if (this.t >= tele) {
          this.dead = true;
          G.audio.play('arrow');
          for (const a of angs) H.orb(ox, oy, Math.cos(a) * speed, Math.sin(a) * speed, { r: 8, blade: true, life: 2.2 });
        }
      },
      draw(ctx) {
        const k = this.t / tele;
        ctx.strokeStyle = G.rgba(DANGER, 0.25 + 0.5 * k); ctx.lineWidth = 1.5 + k;
        ctx.setLineDash([10, 8]); ctx.lineDashOffset = -this.t * 90;
        for (const a of angs) { ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * 1500, oy + Math.sin(a) * 1500); ctx.stroke(); }
        ctx.setLineDash([]);
      },
    });
  }

  // A cut along a line: the warning shows exactly where, then the blade passes.
  function cutLine(ox, oy, ang, len, tele) {
    return H.beam({ ox, oy, ang, maxLen: len, clip: true, width: 18, tele, lock: 99, active: 0.1, fade: 0.22, sfx: 'blade', shake: 4 });
  }

  // ------------------------------------------------------------------ attacks
  // Lunge. Its crouch says which:
  //   blade forward, weight on the front foot: it crosses the floor (jump it, or dash through)
  //   weight on the back foot, both blades held back: it goes, stops short with a skid, springs back
  //   and throws a fan of knives at wherever the hero is (most likely in the air, over a lunge that
  //   never came). It throws from its heels, and is open after.
  function* atkLunge() {
    const b = B.body, T = K.T();
    if (K.chance(B.phase === 1 ? 0.3 : 0.4, 'feint')) { yield* feintLunge(b, 0.62 * T); return; }
    yield* lunge(b, farSide(b.x), 0.62 * T);
    if (K.hard()) { yield* wait(0.25); yield* lunge(b, farSide(b.x), 0.45 * T); }
    // it slides out of it and is slow to turn round: open for a moment
    b.exposed = true;
    yield* wait(0.55);
    b.exposed = false;
    yield* wait(0.3);
  }
  function* feintLunge(a, tele) {
    const P = G.player, T = K.T(), dir = G.sign(P.x - a.x) || a.face;
    a.face = dir;
    // (the same quiet lane as a real lunge: the crouch is the only difference)
    H.lane({ x: WL, y: a.y - 66, w: WR - WL, h: 66, dir, dur: tele, quiet: true });
    // (v2.5c: a dip as for the real one, then it rocks back onto its heels, the blades going back
    // behind the hip and the front foot coming up onto its toe: the set of a lunge is never reached)
    const FK = [[0, null], [0.2, 'lungeDip', E.outQuad], [0.6, 'feint', E.inOutQuad], [1, 'feint']];
    let e = 0, from = null;
    while (e < tele) {
      e += yield;
      const k = Math.min(1, e / tele);
      if (!from) from = a.p.slice();
      const p = poseAt(a, FK, k, from);
      a.liveRate = 30; a.liveBox = null;
      p[1] += 2.5 * k;
      if (k > 0.6) { p[0] -= 0.05 * (k - 0.6) / 0.4; tremble(p, 0.6 * (k - 0.6) / 0.4, e); }
      if (!a.glinted && tele - e < 0.2) { a.glinted = true; G.fx.glint(a.x - dir * 18, a.y - 38, 22, G.pal().hot, 0.18); G.audio.play('glint'); }
    }
    a.glinted = false;
    // it goes, and stops short
    const stop = G.clamp(P.x - dir * 160, WL + 40, WR - 40);
    if ((stop - a.x) * dir > 30) {
      a.pose = 'dash'; G.audio.play('streak');
      const x0 = a.x, dur = Math.max(0.1, Math.abs(stop - x0) / 1900);
      e = 0;
      while (e < dur) {
        e += yield;
        a.x = G.lerp(x0, stop, E.outQuad(Math.min(1, e / dur)));
        G.fx.spawn({ x: a.x - dir * 20, y: a.y - G.rand(10, 60), vx: -dir * G.rand(40, 200), vy: G.rand(-30, 30), life: 0.25, size: G.rand(4, 9), color: G.pal().boss });
      }
    }
    a.pose = 'skidOver';
    G.fx.dust(a.x, FLOOR, 5, { dir, speed: [60, 260], size: [6, 12], up: 24 });
    yield* wait(0.07);
    yield* hopBack(a, 130, 0.26, 58);
    // the fan, at where the hero is now
    a.face = P.x > a.x ? 1 : -1;
    const ox = a.x + a.face * 22, oy = a.y - 60, base = Math.atan2(P.y - 24 - oy, P.x - ox);
    const n = B.phase === 1 ? 3 : 5, angs = [];
    for (let i = 0; i < n; i++) angs.push(base + (i - (n - 1) / 2) * 0.13);
    const tt = 0.36 * T;
    volley(ox, oy, angs, tt, 760);
    // (backhanded from across the body, off its heels)
    yield* keys(a, tt, [[0, null], [0.45, 'fanLow', E.outQuad], [1, 'fanLow']], { fx: (p, k) => { p[0] -= 0.08 * k; } });
    a.pose = 'fanSweep';
    yield* wait(0.22);
    a.pose = 'skid'; a.exposed = true;
    yield* wait(0.7);
    a.exposed = false;
  }

  // The same lunge, with a shadow coming the other way a moment later.
  function* atkPincer() {
    const b = B.body, P = G.player, T = K.T();
    const sx = G.clamp(P.x + (b.x < P.x ? 1 : -1) * 380, WL + 60, WR - 60);
    const c = clone(sx, FLOOR, -G.sign(sx - P.x), 'crouch');
    yield* par(
      lunge(b, farSide(b.x), 0.62 * T),
      (function* () { yield* wait(0.4); yield* lunge(c, farSide(c.x), 0.55 * T); c.gone = true; smoke(c.x, c.y - 40); })()
    );
    yield* wait(0.8);
  }

  // Flurry. The tell is tempo: how fast it cuts says how many cuts there are and how it ends.
  //   measured cuts: three, then it springs back and throws a fan of knives
  //   quick, small cuts: five, then it springs back and throws one knife that sticks and bursts for 2
  function* atkFlurry() {
    const b = B.body, P = G.player, T = K.T();
    const fast = K.chance(B.phase === 1 ? 0.4 : 0.5, 'fast');
    // measured, its last cut may be held: the blade goes up high behind its head and stays there,
    // trembling, past where the cut should have come; then it falls with everything behind it, and
    // the Veil is carried past and left open (no knives after)
    const held = !fast && K.chance(B.phase === 1 ? 0.35 : 0.45, 'held');
    // close the distance
    b.pose = 'run';
    let e = 0;
    while (e < 0.9 && Math.abs(P.x - b.x) > 96) {
      const dt = yield;
      e += dt;
      b.face = P.x > b.x ? 1 : -1;
      b.x = G.clamp(b.x + b.face * 640 * dt, WL + 30, WR - 30);
    }
    const n = fast ? 5 : 3;
    for (let i = 0; i < n; i++) {
      // taking its time, it turns to follow the hero between cuts; in a hurry it commits to the way it faces,
      // so getting behind it (a dash straight through) is safe for the rest of the flurry
      if ((!fast || i === 0) && Math.abs(P.x - b.x) > 20) b.face = P.x > b.x ? 1 : -1;
      if (held && i === n - 1) { yield* heldCut(); return; }
      const tele = (fast ? (i === 0 ? 0.4 : 0.19) : (i === 0 ? 0.5 : 0.4)) * T, r = fast ? 86 : 112;
      // (v2.5c) the body says the tempo before the first cut lands. Measured: a dip with the blade
      // drawn low, then up tall with it raised high behind the head and the free hand aimed; each cut
      // after rides the last one's weight (down from high, back up from by the knee). Quick: hunched,
      // fists up by the face with the blades hanging, bouncing in time with the cuts to come; small
      // cocks and small chops.
      const A = i % 2 === 0, hit = fast ? (A ? 'chopA' : 'chopB') : (A ? 'slashA' : 'slashB');
      if (A) swing(b, { r, a0: -2.1, a1: 0.95, tele, pose: hit });
      else swing(b, { r, a0: 1.0, a1: -2.0, tele, pose: hit });
      if (fast && i === 0) {
        yield* keys(b, tele, [[0, null], [0.35, 'quickSet', E.outQuad], [0.78, 'quickSet'], [1, 'quickA', E.outQuad]],
          { rate: 36, fx: (p, k, e) => { if (k < 0.78) p[1] += 1.8 * Math.abs(Math.sin(e * Math.PI / 0.19)); } });
      } else if (fast) {
        yield* keys(b, tele, [[0, null], [0.55, A ? 'quickA' : 'quickB', E.outQuad], [1, A ? 'quickA' : 'quickB']], { rate: 44 });
      } else if (i === 0) {
        yield* keys(b, tele, [[0, null], [0.28, 'cutDip', E.outQuad], [0.7, 'cutHighA', E.inOutQuad], [1, 'cutHighA']],
          { fx: (p, k) => { const u = Math.max(0, k - 0.7) / 0.3; p[1] -= 1.5 * u; p[0] -= 0.05 * u; } });
      } else {
        yield* keys(b, tele, [[0, null], [A ? 0.45 : 0.4, A ? 'cutHighA' : 'cutLowB', A ? E.inOutQuad : E.outQuad], [1, A ? 'cutHighA' : 'cutLowB']],
          { fx: (p, k) => { p[1] += (A ? -1.5 : 1.5) * Math.max(0, k - 0.5) / 0.5; } });
      }
      // (the blow sets its own pose as it lands; if this frame beat it there, the same pose)
      if (b.pose === 'live') b.pose = hit;
      // each cut carries it forward: a full step when it is taking its time, a shuffle when it is not
      const x1 = G.clamp(b.x + b.face * (fast ? 12 : 46), WL + 30, WR - 30);
      yield* tween(b, { x: x1 }, fast ? 0.06 : 0.1, E.outCubic);
      yield* wait(fast ? 0.02 : 0.1);
    }
    // the ender: spring away from the hero, then throw
    const away = b.x > P.x ? 1 : -1, tx = G.clamp(b.x + away * 200, WL + 50, WR - 50), x0 = b.x;
    b.face = -away; b.pose = 'air';
    e = 0;
    let from = null;
    while (e < 0.3) {
      e += yield; const k = Math.min(1, e / 0.3); b.x = G.lerp(x0, tx, k); b.y = FLOOR - 4 * 90 * k * (1 - k);
      if (!from) from = b.p.slice();
      poseAt(b, SPRING, k, from); b.liveRate = 30;
    }
    b.y = FLOOR; b.face = P.x > b.x ? 1 : -1; b.pose = 'crouch'; b.sq = 0.1;
    const ox = b.x + b.face * 22, oy = b.y - 60;
    if (!fast) {
      const base = Math.atan2(P.y - 24 - oy, P.x - ox), angs = [];
      for (let i = 0; i < 5; i++) angs.push(base + (i - 2) * 0.14);
      const tele = 0.42 * T;
      volley(ox, oy, angs, tele, 780);
      // the fan: the arm drawn across the body to the far hip, and backhanded out flat
      yield* keys(b, tele, [[0, null], [0.3, 'crouch', E.outQuad], [0.72, 'fanLow', E.inOutQuad], [1, 'fanLow']], { fx: (p, k, e2) => { if (k > 0.72) tremble(p, 0.5, e2); } });
      b.pose = 'fanSweep';
      yield* wait(0.3);
    } else {
      // one knife, lobbed to where the hero stands: it sticks, hisses, and takes two health from anyone still near
      // (the bursting knife: the arm goes straight back and up over the head, the body leaning away)
      yield* keys(b, 0.26 * T, [[0, null], [0.3, 'crouch', E.outQuad], [0.78, 'lobWind', E.inOutQuad], [1, 'lobWind']], { fx: (p, k, e2) => { if (k > 0.78) tremble(p, 0.6, e2); } });
      b.pose = 'lobThrow';
      G.audio.play('arrowHeavy');
      const tf = 0.5, g = 1400, lx = G.clamp(P.x, WL + 60, WR - 60);
      H.orb(ox, oy, (lx - ox) / tf, (FLOOR - 14 - oy) / tf - 0.5 * g * tf, {
        r: 10, grav: g, blade: true, slashable: false, tint: { boss: DANGER, hot: '255,240,220' },
        onPop(ob) {
          G.audio.play('tink');
          H.blast({ x: G.clamp(ob.x, WL + 40, WR - 40), y: FLOOR - 12, r: 128, tele: 0.62 * T, dmg: 2 });
        },
      });
      yield* wait(tf + 0.62 * T + 0.2);
    }
    b.pose = 'skid';
    yield* wait(0.7);
  }
  function* heldCut() {
    const b = B.body, P = G.player, T = K.T();
    if (Math.abs(P.x - b.x) > 20) b.face = P.x > b.x ? 1 : -1;
    const hold = 0.95 * T;
    swing(b, { r: 134, a0: -2.35, a1: 1.05, tele: hold, pose: 'slashA' });
    // (v2.5c: a dip with the blade drawn low, then up onto its toes with it high behind the head; held
    // there trembling, the body leaning further back the longer it waits)
    const HK = [[0, null], [0.12, 'cutDip', E.outQuad], [0.42, 'slashHold', E.inOutQuad], [1, 'slashHold']];
    let e = 0, from = null;
    while (e < hold) {
      e += yield;
      const k = Math.min(1, e / hold);
      if (!from) from = b.p.slice();
      const p = poseAt(b, HK, k, from);
      b.liveRate = 30;
      if (k > 0.42) { const u = (k - 0.42) / 0.58; p[1] -= 2 * u; p[0] -= 0.08 * u; p[1] += Math.sin(B.t * 70) * 0.8; p[0] += Math.sin(B.t * 53) * 0.015; p[8] += Math.sin(B.t * 81) * 1.1; }
    }
    if (b.pose === 'live') b.pose = 'slashA';
    G.audio.play('cleave'); G.fx.shake(6);
    b.recV = (b.recV || 0) + b.face * 2.2;
    yield* tween(b, { x: G.clamp(b.x + b.face * 70, WL + 30, WR - 30) }, 0.16, E.outCubic);
    b.pose = 'stuckDeep'; b.exposed = true; b.sq = 0.1;
    G.fx.dust(b.x, FLOOR, 4, { dir: b.face, speed: [60, 240], size: [6, 11], up: 24 });
    yield* wait(1.0);
    b.exposed = false;
  }
  function* atkKnives() {
    const b = B.body, P = G.player, T = K.T();
    // spring away from the hero, then throw
    const away = b.x > P.x ? 1 : -1;
    const tx = G.clamp(b.x + away * 190, WL + 50, WR - 50), x0 = b.x;
    b.face = -away; b.pose = 'air';
    let e = 0, from = null;
    while (e < 0.34) {
      e += yield; const k = Math.min(1, e / 0.34); b.x = G.lerp(x0, tx, k); b.y = FLOOR - 4 * 96 * k * (1 - k);
      if (!from) from = b.p.slice();
      poseAt(b, SPRING, k, from); b.liveRate = 30;
    }
    b.y = FLOOR; b.pose = 'crouch'; b.sq = 0.1;
    const vol = (B.phase >= 2 ? 2 : 1) + (K.hard() ? 1 : 0);
    for (let v = 0; v < vol; v++) {
      b.face = P.x > b.x ? 1 : -1;
      const ox = b.x + b.face * 22, oy = b.y - 60;
      const base = Math.atan2(P.y - 24 - oy, P.x - ox);
      const n = B.phase === 1 ? 3 : 5, spread = B.phase === 1 ? 0.12 : 0.15;
      const angs = [];
      for (let i = 0; i < n; i++) angs.push(base + (i - (n - 1) / 2) * spread + (v % 2 ? spread / 2 : 0));
      const tele = (v ? 0.4 : 0.55) * T;
      volley(ox, oy, angs, tele, 780);
      // (v2.5c: side-on, the fan cocked behind its head, the free hand pointing it at the hero; the
      // next volley from the other hand)
      const L = v % 2 ? 'fanHighB' : 'fanHigh';
      yield* keys(b, tele, [[0, null], [0.3, 'crouch', E.outQuad], [0.68, L, E.inOutQuad], [1, L]], { fx: (p, k, e2) => { if (k > 0.68) { p[0] -= 0.06 * (k - 0.68) / 0.32; tremble(p, 0.5, e2); } } });
      b.pose = v % 2 ? 'throwB' : 'throw';
      yield* keys(b, 0.3, [[0, b.pose], [0.25, b.pose], [1, v % 2 ? 'throwFolB' : 'throwFol', E.outQuad]], { rate: 24 });
    }
    yield* wait(0.6);
  }

  // It drops on the marked spot and its blade sticks in the floor.
  function* atkAmbush() {
    const b = B.body, P = G.player, T = K.T();
    yield* vanish();
    yield* wait(0.35);
    const m = K.columnMark(P.x, 112);
    G.audio.play('charge', { dur: 0.8 * T });
    let e = 0;
    const tt = 0.52 * T;
    while (e < tt) {
      const dt = yield;
      e += dt;
      m.x = G.damp(m.x, G.clamp(P.x + P.vx * 0.12, WL + 60, WR - 60), 9, dt); m.k = e / tt * 0.7;
    }
    m.locked = true;
    appear(m.x, -90, 'dive');
    const lockT = 0.3 * T;
    e = 0;
    while (e < lockT) { e += yield; m.k = 0.7 + 0.3 * Math.min(1, e / lockT); }
    b.hurt = true;
    G.audio.play('streak');
    yield* tween(b, { y: FLOOR }, 0.13, E.inQuad);
    m.dead = true; b.hurt = false;
    K.crush(b.x, FLOOR - 24, 42, 24, 1); // (v2.1b: from 58 by 44 at FLOOR - 40: it lands laid out low, and that blow reached well over it)
    K.impact(b.x, false);
    if (K.hard()) { H.shockwave(b.x - 20, -1, 380, 36); H.shockwave(b.x + 20, 1, 380, 36); }
    // (v2.5c: the weight goes on down through the knee, squashed, before it holds)
    b.pose = 'stuckDeep'; b.exposed = true; b.sq = 0.2;
    yield* wait(B.phase === 3 ? 1.1 : 1.35);
    b.exposed = false;
  }

  // It appears behind the hero and cuts.
  function* atkBackstab() {
    const b = B.body, P = G.player, T = K.T();
    yield* vanish();
    yield* wait(0.3 + G.rrand(0, 0.25));
    const gy = P.plat && P.onGround ? P.plat.y : FLOOR;
    let lo = WL + 40, hi = WR - 40;
    if (gy < FLOOR && P.plat) { lo = P.plat.x + 14; hi = P.plat.x + P.plat.w - 14; }
    let x = P.x - (P.facing || 1) * 78;
    if (x < lo || x > hi) x = P.x + (P.facing || 1) * 78;
    appear(G.clamp(x, lo, hi), gy, 'crouch');
    G.fx.ring(b.x, b.y - 46, { r0: 60, r1: 8, life: 0.25, color: G.pal().hot, width: 3 });
    G.audio.play('tink');
    const n = 1 + (B.phase >= 2 ? 1 : 0) + (B.phase === 3 && K.hard() ? 1 : 0);
    for (let i = 0; i < n; i++) {
      if (Math.abs(P.x - b.x) > 16) b.face = P.x > b.x ? 1 : -1;
      const tele = (i ? 0.3 : 0.44) * T;
      if (i % 2 === 0) swing(b, { r: 110, a0: -2.1, a1: 0.95, tele, pose: 'slashA' });
      else swing(b, { r: 110, a0: 1.0, a1: -2.0, tele, pose: 'slashB' });
      // (v2.5c: out of the smoke low, the blade raised point-down over its shoulder and the free hand
      // reaching for the hero; a second cut back up from by the knee, a third down from high)
      const W = i === 0 ? 'stabSet' : i % 2 ? 'cutLowB' : 'cutHighA';
      yield* keys(b, tele, [[0, null], [i ? 0.45 : 0.32, W, E.outQuad], [1, W]], { fx: (p, k, e2) => { if (k > 0.75) tremble(p, 0.5, e2); } });
      if (b.pose === 'live') b.pose = i % 2 ? 'slashB' : 'slashA';
      yield* tween(b, { x: G.clamp(b.x + b.face * 50, lo, hi) }, 0.1, E.outCubic);
      yield* wait(0.08);
    }
    b.pose = 'skid';
    yield* wait(0.75);
    if (b.y < FLOOR) { b.pose = 'air'; yield* tween(b, { y: FLOOR }, 0.22, E.inQuad); }
  }

  // Three figures, three lanes, one after another. Only one of them is real.
  function* atkMirror() {
    const b = B.body, T = K.T();
    G.ui.hint('mirror', 'Each lane shows a lunge: jump the low ones, stay down for the high one');
    yield* vanish();
    yield* wait(0.3);
    const side = G.rng() < 0.5 ? -1 : 1;
    const L = WL + 60, R = WR - 60;
    // the high lane runs at the height of the platform the hero is on, or of one that is up
    const perch = G.arena.platforms.find((p) => !p.gone && p.rise >= 1);
    const hiY = G.player.plat ? G.player.plat.top : perch ? perch.top : FLOOR;
    const runs = [
      { x: side > 0 ? L : R, y: FLOOR, to: side > 0 ? R : L },
      { x: side > 0 ? R : L, y: FLOOR, to: side > 0 ? L : R },
      { x: side > 0 ? L : R, y: hiY, to: side > 0 ? R : L },
    ];
    if (K.hard()) runs.push({ x: side > 0 ? R : L, y: FLOOR, to: side > 0 ? L : R });
    const real = Math.floor(G.rng() * runs.length);
    const gens = runs.map((r, i) => {
      const delay = i * 0.75;
      return (function* () {
        yield* wait(delay);
        let a;
        if (i === real) { appear(r.x, r.y, 'crouch'); a = b; } else a = clone(r.x, r.y, G.sign(r.to - r.x), 'crouch');
        yield* lunge(a, r.to, 0.62 * T);
        if (a !== b) { yield* wait(0.1); a.gone = true; smoke(a.x, a.y - 40); }
      })();
    });
    yield* par(...gens);
    if (b.y < FLOOR) { b.pose = 'air'; yield* tween(b, { y: FLOOR }, 0.2, E.inQuad); b.pose = 'skid'; }
    yield* wait(0.8);
  }

  // It hangs in the air and throws fans of knives downward.
  function* atkRain() {
    const b = B.body, P = G.player, T = K.T();
    yield* vanish();
    yield* wait(0.3);
    appear(G.clamp(P.x + G.rrand(-120, 120), 300, 980), 190, 'air');
    const vol = 2 + (K.hard() ? 1 : 0), n = K.gentle() ? 5 : 7;
    const lo = 0.42, hi = Math.PI - 0.42, stepA = (hi - lo) / (n - 1);
    for (let v = 0; v < vol; v++) {
      const off = (v % 2 ? 0.5 : 0) * stepA + G.rrand(-0.06, 0.06);
      const angs = [];
      for (let i = 0; i < n - (v % 2); i++) angs.push(lo + i * stepA + off);
      const tele = (v ? 0.5 : 0.62) * T;
      volley(b.x, b.y - 50, angs, tele, 720);
      // (v2.5c: hanging, the arms cross over its chest with the knives in them, and fling out wide)
      yield* keys(b, tele, [[0, null], [0.25, 'air', E.outQuad], [0.7, 'rainWind', E.inOutQuad], [1, 'rainWind']], { fx: (p, k, e2) => { if (k > 0.7) tremble(p, 0.5, e2); } });
      b.pose = 'rainThrow';
      yield* keys(b, 0.32, [[0, 'rainThrow'], [0.3, 'rainThrow'], [1, 'air', E.inOutQuad]], { rate: 24 });
    }
    b.pose = 'dive';
    yield* tween(b, { y: FLOOR }, 0.2, E.inQuad);
    b.pose = 'skidOver'; b.sq = 0.14;
    G.fx.shake(5); G.audio.play('land');
    G.fx.thud(b.x, FLOOR, 0.7, { noCrack: true });
    yield* wait(0.85);
  }

  // Two diagonal cuts that cross where the hero stands.
  function* atkCross() {
    const b = B.body, P = G.player, T = K.T();
    yield* vanish();
    yield* wait(0.25);
    const pairs = (B.phase === 3 ? 2 : 1) + (K.hard() ? 1 : 0);
    let ex = P.x;
    for (let i = 0; i < pairs; i++) {
      const px = P.x, py = (P.plat && P.onGround ? P.plat.y : FLOOR) - 24;
      const ang = G.rrand(0.72, 0.95), len = 620;
      for (const s of [1, -1]) {
        const a = s > 0 ? ang : Math.PI - ang;
        cutLine(px - Math.cos(a) * len * 0.72, py - Math.sin(a) * len * 0.72, a, len, (0.55 + (s < 0 ? 0.2 : 0)) * T);
      }
      ex = px;
      yield* wait(0.75 * T + 0.3);
    }
    // (v2.5c: out of the dark laid low with the blade still out, as if it had just come through)
    appear(G.clamp(ex + (G.rng() < 0.5 ? -150 : 150), WL + 50, WR - 50), FLOOR, 'skidOver');
    yield* wait(0.8);
  }

  // A run of cuts, each through where the hero stands when it is drawn. Then it is spent.
  function* atkCuts() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('cuts', 'Step off each line. Jump the flat ones');
    yield* vanish();
    yield* wait(0.3);
    const n = K.hard() ? 9 : 7;
    let lastKind = '';
    for (let i = 0; i < n; i++) {
      const gy = P.plat && P.onGround ? P.plat.y : FLOOR;
      const px = P.x, py = gy - 24, tele = 0.55 * T;
      // every third cut is flat (jump it); the one after a flat cut is upright, which any step avoids even in the air
      let kind = i % 3 === 2 ? 'flat' : lastKind === 'flat' ? 'vert' : G.rpick(['diagL', 'diagR', 'vert']);
      if (kind === lastKind && kind !== 'flat') kind = kind === 'vert' ? 'diagL' : 'vert';
      lastKind = kind;
      if (kind === 'flat') cutLine(WL, py - 2, 0, WR - WL, tele);
      else if (kind === 'vert') cutLine(px, -40, Math.PI / 2, 900, tele);
      else {
        const a = kind === 'diagL' ? G.rrand(0.7, 1.0) : Math.PI - G.rrand(0.7, 1.0);
        cutLine(px - Math.cos(a) * 470, py - Math.sin(a) * 470, a, 700, tele);
      }
      yield* wait(0.42);
    }
    yield* wait(0.55 * T + 0.2);
    appear(640, FLOOR, 'kneel');
    b.exposed = true;
    G.ui.callout('SPENT', 'Strike now');
    yield* wait(2.5);
    b.exposed = false;
  }

  // A mark closes on the hero; when it shuts, the Veil cuts everything inside it.
  function* atkMark() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('mark', 'Dash as the mark closes');
    yield* vanish();
    const tele = 1.45 * T, lockT = 0.24 * T;
    G.audio.play('charge', { dur: tele });
    const h = H.arc({
      x: P.x, y: P.y - 22, r: 118, a0: -Math.PI * 0.999, a1: Math.PI * 0.999, tele, active: 0.11, mark: true, heavy: true,
      follow(hz) { if (hz.t < tele - lockT) { hz.x = P.x; hz.y = P.y - 22; } },
      onFire(hz) {
        const gy = FLOOR;
        appear(G.clamp(hz.x, WL + 40, WR - 40), Math.min(gy, hz.y + 22 + 0), 'slashA');
        G.audio.play('blade'); G.audio.play('cleave'); G.fx.shake(10); G.fx.flash(G.pal().hot, 0.18, 0.2);
      },
    });
    yield* wait(tele + 0.2);
    void h;
    if (b.y < FLOOR) { b.pose = 'air'; yield* tween(b, { y: FLOOR }, 0.25, E.inQuad); }
    b.pose = 'skid';
    yield* wait(0.9);
  }

  // Echo (v2.1c; it used to set the hero's own shadow running the path they took). The Veil kneels at
  // the far wall with its blades crossed before its face and lets its shadows out. One after another
  // they fade in around the hero, on the floor or hanging in the air, and set themselves to dash, low,
  // blade forward, the eye on the hero. A breath before each goes its aim sets on the spot the hero is
  // in (on the floor or in the air), and it dashes straight to that spot and stops there, then fades.
  // Keep moving: a hero still on that spot is cut; one who has moved on is not.
  // The channel cannot be broken: it can be struck all the while, but no blow stops it, and a stagger
  // waits until it is done (B.steadfast). Then it is spent, and slow to rise.
  //   I: five, each on the heels of the last
  //   II: seven, two of them out of the air
  //   III: eight: twice two at once from either side, twice out of the air, and the last is the Veil itself: the
  //        kneeling figure goes to smoke, and it is the one that comes, and stays, open
  const ECHO_LOCK = 0.15, ECHO_FADE = 0.16, ECHO_SPEED = 1550;
  function shadeSpot(P, side, used) {
    for (let i = 0; i < 10; i++) {
      const x = G.clamp(P.x + side * G.rrand(230, 380), WL + 50, WR - 50);
      if (Math.abs(x - P.x) > 170 && used.every((u) => Math.abs(u - x) > 90)) return x;
      side = -side;
    }
    return G.clamp(P.x + side * 260, WL + 50, WR - 50);
  }
  // One shadow: it fades in at (sx, sy), sets itself with its eye on the hero, takes aim on the spot they
  // are in, and dashes there. real: it is the Veil itself (out of the channel, hidden), and it stays.
  function* shadeCut(sx, sy, prep, real) {
    const P = G.player, b = B.body, air = sy < FLOOR - 4;
    let c;
    if (real) { appear(sx, sy, air ? 'air' : 'crouch'); c = b; } else { c = clone(sx, sy, G.sign(P.x - sx) || 1, air ? 'air' : 'crouch', true); c.vis = 0; c.echo = true; }
    c.face = G.sign(P.x - sx) || 1;
    const aim = { x: P.x, y: P.y, set: false, left: prep };
    // (nothing drawn: the shadow set to go is the warning; the tests read danger())
    H.add({
      kind: 'shadeaim',
      update(dt) { aim.left -= dt; if (c.gone || aim.left < -0.5) this.dead = true; },
      danger() { return aim.set && aim.left > -0.3 ? [aim.x, 46, Math.max(0, aim.left)] : null; },
    });
    // (v2.5c) it stands up out of the floor head down, into a sprinter's set with the blade out at the
    // hero (in the air: tucked, blade out), breathing; as its aim sets it sinks and trembles
    const SK = air ? [[0, 'air'], [0.45, 'airSet', E.outQuad], [1, 'airSet']] : [[0, 'shadeRise'], [0.5, 'lungeSet', E.outQuad], [1, 'lungeSet']];
    let e = 0;
    while (e < prep && !c.gone) {
      const dt = yield;
      e += dt;
      if (!real) c.vis = Math.min(1, e / ECHO_FADE);
      if (air) c.y = sy - 5 * Math.sin(e * 8); // hanging in the air
      const p = poseAt(c, SK, Math.min(1, e / prep), null);
      c.liveRate = 26; c.liveBox = air ? 'air' : null;
      p[1] += Math.sin(e * 9) * 0.8;
      if (aim.set) { const u = Math.min(1, (e - (prep - ECHO_LOCK)) / ECHO_LOCK); p[1] += 2 * u; p[0] += 0.05 * u; tremble(p, u, e); }
      if (!aim.set) { aim.x = P.x; aim.y = P.y; if (Math.abs(P.x - c.x) > 10) c.face = P.x > c.x ? 1 : -1; }
      if (!aim.set && prep - e <= ECHO_LOCK) {
        // the eye settles and the blade catches the light: from here it goes where the hero is now
        aim.set = true;
        const hx = c.x + c.face * c.p[7], hy = c.y + c.p[8];
        G.fx.glint(hx, hy, real ? 24 : 18, real ? G.pal().hot : '170,160,210', 0.2); G.audio.play('glint');
      }
    }
    if (c.gone) return;
    // straight to the spot, laid along the line, and it stops on it
    const x0 = c.x, y0 = c.y, dx = aim.x - x0, dy = aim.y - y0, dist = Math.hypot(dx, dy);
    if (Math.abs(dx) > 4) c.face = dx > 0 ? 1 : -1;
    c.pose = 'dash'; c.p = POSES.dash.slice(); c.tilt = G.clamp(Math.atan2(dy, Math.abs(dx) + 1), -1.25, 1.25); c.hurt = true;
    G.audio.play('streak');
    const dur = Math.max(0.14, dist / ECHO_SPEED), tint = real ? G.pal().boss : '20,16,34';
    let f = 0;
    while (f < dur && !c.gone) {
      f += yield;
      const k = E.outQuad(Math.min(1, f / dur));
      c.x = x0 + dx * k; c.y = y0 + dy * k;
      if (k > 0.92) c.hurt = false;
      G.fx.spawn({ x: c.x - c.face * 18, y: c.y - G.rand(10, 56), vx: -c.face * G.rand(40, 180), vy: G.rand(-30, 30), life: 0.25, size: G.rand(4, 9), color: tint });
    }
    c.hurt = false; c.tilt = 0;
    if (c.gone) return;
    c.pose = c.y < FLOOR - 4 ? 'air' : 'skidOver';
    if (c.y >= FLOOR - 4) G.fx.dust(c.x, FLOOR, 4, { dir: c.face, speed: [60, 220], size: [6, 11], up: 26 });
    if (real) {
      // out of the working, down onto its heels: open
      if (c.y < FLOOR - 4) { yield* tween(c, { y: FLOOR }, 0.2, E.inQuad); G.fx.thud(c.x, FLOOR, 0.45, { noCrack: true }); b.sq = 0.14; }
      if (c.pose !== 'skidOver') c.pose = 'skid';
      b.exposed = true;
      yield* wait(0.85);
      b.exposed = false;
      return;
    }
    yield* wait(0.08);
    for (let g = 0; g < ECHO_FADE && !c.gone;) { g += yield; c.vis = Math.max(0, 1 - g / ECHO_FADE); }
    c.gone = true;
  }
  function* atkEcho() {
    const b = B.body, P = G.player, T = K.T(), ph = B.phase;
    yield* vanish();
    yield* wait(0.25);
    appear(P.x < 640 ? WR - 110 : WL + 110, FLOOR, 'kneel');
    b.face = P.x > b.x ? 1 : -1;
    B.steadfast = true;
    // (v2.5b: more of them and quicker, one on the heels of the last: I five, II seven, III eight)
    const prep = 0.44 * T, gap = [0, 0.5, 0.4, 0.36][ph] * T;
    // what comes, and when (from the start of the channel)
    const plan = [];
    if (ph === 1) for (let i = 0; i < 5; i++) plan.push({ at: 0.3 + i * gap, kind: 'cut' });
    else if (ph === 2) for (let i = 0; i < 7; i++) plan.push({ at: 0.3 + i * gap, kind: i === 2 || i === 5 ? 'air' : 'cut' });
    else {
      const seq = ['cut', 'cut', 'pair', 'air', 'cut', 'pair', 'air'];
      let at = 0.3;
      for (const kind of seq) { plan.push({ at, kind }); at += gap * (kind === 'pair' ? 1.5 : 1); }
      plan.push({ at: at + gap * 0.6, kind: 'real' });
    }
    const end = plan[plan.length - 1].at + prep + 0.6;
    G.audio.play('veilchannel', { dur: end });
    const running = [], used = [];
    let e = 0, side = G.rng() < 0.5 ? -1 : 1, next = 0, real = false, pulse = 0;
    while ((next < plan.length || running.length) && e < end + 3) {
      const dt = yield;
      e += dt;
      if (!real) {
        // the working: kneeling, blades crossed before the face, the dark drawn up out of the floor into it
        // (v2.5c: a slow breath under it, and each time a shadow is let out the head lifts and the blades
        // part a little, then close again)
        pulse = Math.max(0, pulse - dt * 4);
        const p = poseAt(b, [[0, 'channel']], 0, null), q = pulse > 0 ? Math.sin(Math.PI * (1 - pulse)) : 0;
        b.liveRate = 30;
        p[1] += Math.sin(e * 2.6) * 1.1 - 2 * q; p[0] -= 0.12 * q;
        p[9] -= 0.35 * q; p[12] += 0.35 * q; p[7] += 4 * q; p[10] -= 3 * q;
        if (Math.random() < dt * 20) {
          const x = b.x + G.rand(-70, 70);
          G.fx.spawn({ x, y: FLOOR - G.rand(0, 8), vx: (b.x - x) * 1.2, vy: -G.rand(60, 150), life: G.rand(0.4, 0.8), size: G.rand(3, 7), color: '24,18,40', drag: 1.5 });
        }
      }
      while (next < plan.length && e >= plan[next].at) {
        const s = plan[next++], live = used.slice(-4);
        pulse = 1;
        if (s.kind === 'cut' || s.kind === 'air') {
          const x = shadeSpot(P, side, live), y = s.kind === 'air' ? FLOOR - G.rrand(150, 210) : FLOOR;
          used.push(x); side = -side;
          running.push(shadeCut(x, y, prep));
        } else if (s.kind === 'pair') {
          // from either side at once
          for (const d of [-1, 1]) { const x = G.clamp(P.x + d * G.rrand(260, 340), WL + 50, WR - 50); used.push(x); running.push(shadeCut(x, FLOOR, prep)); }
        } else {
          // the last is the Veil itself: the kneeling figure goes to smoke
          real = true;
          const x = shadeSpot(P, side, live);
          running.push((function* () { yield* vanish(); B.steadfast = false; yield* shadeCut(x, FLOOR, prep - 0.06, true); })());
        }
      }
      for (let i = running.length - 1; i >= 0; i--) if (running[i].next(dt).done) running.splice(i, 1);
    }
    B.steadfast = false;
    if (real) return;
    // the working spent: it is slow to rise
    b.pose = 'kneel'; b.exposed = true;
    yield* wait(0.9);
    b.exposed = false;
  }

  // Hunt: its answer to a hero who keeps away, or keeps to the air. It is gone, and then it is beside
  // them, at whatever height they are, already cutting. Three knives follow them down.
  function* atkHunt() {
    const b = B.body, P = G.player, T = K.T();
    yield* vanish();
    yield* wait(0.16);
    const air = !P.onGround && P.y < FLOOR - 60;
    const side = P.vx ? -G.sign(P.vx) : -(P.facing || 1); // behind the way they are moving
    const x = G.clamp(P.x + side * 62, WL + 40, WR - 40), y = air ? Math.min(FLOOR, P.y + 14) : FLOOR;
    appear(x, y, air ? 'air' : 'crouch');
    G.fx.ring(b.x, b.y - 46, { r0: 56, r1: 8, life: 0.22, color: G.pal().hot, width: 3 });
    const n = B.phase === 3 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      if (Math.abs(P.x - b.x) > 16) b.face = P.x > b.x ? 1 : -1;
      const tele = (i ? 0.26 : 0.36) * T;
      if (i % 2 === 0) swing(b, { r: 112, a0: -2.1, a1: 0.95, tele, pose: 'slashA' });
      else swing(b, { r: 112, a0: 1.0, a1: -2.0, tele, pose: 'slashB' });
      // (v2.5c: it comes out with both blades crossed high over its head, on the floor or tucked in the
      // air; the second cut comes back up from by the knee. The blow sets its own pose as it lands,
      // and these keys let go of it then.)
      const W = i ? 'cutLowB' : air ? 'airCock' : 'huntSet', at = tele / (tele + 0.1);
      yield* keys(b, tele + 0.1, [[0, null], [at * 0.4, W, E.outQuad], [at, W]], { box: air ? 'air' : null, fx: (p, k, e2) => { if (k > at * 0.7 && k < at) tremble(p, 0.5, e2); } });
    }
    if (b.y < FLOOR) { b.pose = 'air'; yield* tween(b, { y: FLOOR }, 0.2, E.inQuad); b.sq = 0.1; }
    b.face = P.x > b.x ? 1 : -1;
    const ox = b.x + b.face * 22, oy = b.y - 60, base = Math.atan2(P.y - 24 - oy, P.x - ox), tele = 0.4 * T;
    volley(ox, oy, [base - 0.13, base, base + 0.13], tele, 820);
    yield* keys(b, tele, [[0, null], [0.3, 'crouch', E.outQuad], [0.68, 'fanHigh', E.inOutQuad], [1, 'fanHigh']]);
    b.pose = 'throw';
    yield* keys(b, 0.3, [[0, 'throw'], [0.25, 'throw'], [1, 'throwFol', E.outQuad]], { rate: 24 });
    b.pose = 'skid';
    yield* wait(0.7);
  }

  // ------------------------------------------------------------------ the stance
  // Stance. It sheathes both blades and goes still, head bowed, its scarf settling. Strike it and it
  // catches the blow on a hand's width of steel, is gone, and cuts back through where you stand (step
  // or dash off the line). Wait, and it draws: through you, along the floor, to the far side.
  //   the lead hand low on the hilt, by the hip: the cut comes low along the floor (jump it)
  //   the lead hand high, at the shoulder: it springs and cuts at a leaping height (stay down)
  // In the second phase a shadow takes the stance on your other side and draws a beat after it; in
  // the third it draws, takes a new grip where it lands, and draws back the other way.

  // The stance as it deepens (k from 0 to 1): lower, more bowed, the breath held by the end.
  function stanceTo(a, high, k) {
    const p = mixPose(a, POSES[high ? 'stanceHi' : 'stanceLo'], POSES[high ? 'stanceHi' : 'stanceLo'], 0);
    p[0] += 0.09 * k; p[1] += 3.5 * k;
    p[1] += Math.sin(B.t * 2.2 + (a.clone ? 1.3 : 0)) * 0.6 * (1 - k);
    a.still = true;
  }
  // Hold the stance for `dur`, deepening; the blade catches the light just before it draws. Stops at
  // once if a blow is caught (B.guard.hit). `lane`: a quiet lane for a low draw (tests read it).
  function* holdStance(a, high, dur, from) {
    if (!high) H.lane({ x: WL, y: FLOOR - 66, w: WR - WL, h: 66, dir: a.face, dur, quiet: true });
    let e = 0, glinted = false;
    while (e < dur && !a.gone) {
      const dt = yield;
      e += dt;
      stanceTo(a, high, (from || 0) + (1 - (from || 0)) * E.inQuad(Math.min(1, e / dur)));
      // (v2.5c) in its last breath the weight tips onto the front foot and the hand at the hilt trembles
      if (dur - e < 0.22) { const u = G.clamp(1 - (dur - e) / 0.22, 0, 1), p = a.live; p[0] += 0.07 * u; p[1] += 1.5 * u; p[7] += Math.sin(e * 77) * 0.9 * u; p[8] += Math.sin(e * 91) * 0.9 * u; }
      if (!glinted && dur - e < 0.2) {
        glinted = true;
        const hx = a.x + a.face * a.p[7], hy = a.y + a.p[8];
        G.fx.glint(hx, hy, a.clone ? 18 : 24, a.clone ? '170,160,210' : G.pal().hot, 0.2); G.audio.play('glint');
      }
      if (a === B.body && B.guard && B.guard.hit) return false;
    }
    return true;
  }
  // The draw: across the floor through the hero to `toX`. Low, it goes as a lunge goes; high, it
  // springs first and then crosses laid out flat at a leaping height. Returns its line, for the
  // trail it leaves when the blade goes home.
  function* iaiDraw(a, high, toX, speed) {
    const dir = G.sign(toX - a.x) || a.face, sh = !!a.clone;
    a.face = dir; a.still = false;
    const trailCol = sh ? '60,50,96' : G.pal().boss;
    if (high) {
      // the spring: up off the back foot, before anything can cut
      a.pose = 'drawHi';
      G.fx.dust(a.x, FLOOR, 4, { dir: -dir, speed: [40, 200], size: [5, 10], up: 24 });
      const y0 = a.y, x0 = a.x;
      let e = 0;
      while (e < 0.09 && !a.gone) { e += yield; const k = Math.min(1, e / 0.09); a.y = y0 - 54 * E.outQuad(k); a.x = x0 + dir * 8 * k; }
    }
    if (a.gone) return null;
    a.hurt = true;
    G.audio.play('streak'); G.audio.play('blade');
    a.pose = high ? 'drawHi' : 'dash';
    const x0 = a.x, y0 = a.y, dist = Math.abs(toX - x0), dur = Math.max(0.15, dist / (speed || 1500));
    let e = 0;
    while (e < dur && !a.gone) {
      e += yield;
      const k = Math.min(1, e / dur);
      // out of the sheath at once, and slowing all the way to the far side
      a.x = G.lerp(x0, toX, E.outQuad(k));
      if (high) a.y = y0 + 8 * k * k;
      if (k > 0.8) a.hurt = false;
      G.fx.spawn({ x: a.x - dir * 20, y: a.y - G.rand(10, 60), vx: -dir * G.rand(40, 200), vy: G.rand(-30, 30), life: 0.25, size: G.rand(4, 9), color: sh ? '20,16,34' : G.pal().boss });
    }
    a.hurt = false;
    if (a.gone) return null;
    if (high) {
      // down out of the air, onto the forward foot
      a.pose = 'air';
      const y1 = a.y;
      let f = 0;
      while (f < 0.14 && !a.gone) { const dt = yield; f += dt; const k = Math.min(1, f / 0.14); a.y = G.lerp(y1, FLOOR, k * k); a.x = G.clamp(a.x + dir * 140 * (1 - k) * dt, WL + 30, WR - 30); }
      a.y = FLOOR;
      if (!sh) { G.fx.thud(a.x, FLOOR, 0.45, { noCrack: true }); G.audio.play('land'); }
    }
    a.pose = 'skid';
    G.fx.dust(a.x, FLOOR, 5, { dir, speed: [60, 260], size: [6, 12], up: 30 });
    return high ? { x0, x1: a.x, y0: FLOOR - 86, y1: FLOOR - 62, col: trailCol } : { x0, x1: a.x, y0: FLOOR - 20, y1: FLOOR - 42, col: trailCol };
  }
  // The blade home, with a dry click, and the line of each cut it made shows for a moment.
  function* sheatheHome(a, trails) {
    // (v2.5c: held a breath low with the blade out flat, then home)
    yield* keys(a, 0.16, [[0, 'drawFol'], [0.4, 'drawFol'], [1, 'sheathe', E.inOutQuad]], { rate: 34 });
    if (!a.gone) a.pose = 'sheathe';
    if (a.gone) return;
    G.audio.play('veilclick');
    for (const tr of trails) {
      if (!tr) continue;
      const mx = (tr.x0 + tr.x1) / 2, my = (tr.y0 + tr.y1) / 2, ang = Math.atan2(tr.y1 - tr.y0, tr.x1 - tr.x0);
      G.fx.cut(mx, my, ang, Math.hypot(tr.x1 - tr.x0, tr.y1 - tr.y0), 3, tr.col, a.clone ? '170,160,210' : G.pal().hot, 0.4);
    }
  }

  function* atkStance() {
    const b = B.body, P = G.player, T = K.T(), ph = B.phase;
    if (b.y < FLOOR - 1) { b.pose = 'air'; yield* tween(b, { y: FLOOR }, 0.2, E.inQuad); G.fx.thud(b.x, FLOOR, 0.5, { noCrack: true }); }
    const high = K.chance(0.5, 'high');
    b.face = P.x > b.x ? 1 : -1;
    // the blades go home, a turn of each wrist, and it settles its weight
    // (v2.5c: up through the sheathing, both blades turned along the forearms, then down into the grip)
    stanceTo(b, high, 0);
    yield* keys(b, 0.16, [[0, null], [0.45, 'sheathe', E.outQuad], [1, high ? 'stanceHi' : 'stanceLo', E.inOutQuad]], { rate: 36 });
    G.audio.play('veilclick');
    G.fx.dust(b.x, FLOOR, 2, { speed: [10, 60], size: [4, 7], up: 10 });
    // its shadow, on the hero's other side (a fierce third phase too)
    let c = null, cHigh = false;
    if (ph === 2 || (ph === 3 && K.hard())) {
      const sx = G.clamp(P.x + (P.x - b.x), WL + 60, WR - 60);
      if (Math.abs(sx - P.x) > 120) {
        c = clone(sx, FLOOR, G.sign(P.x - sx) || 1, 'crouch');
        cHigh = K.chance(0.5, 'shadeHigh');
        stanceTo(c, cHigh, 0);
      }
    }
    const hold = (ph === 1 ? 1.05 : ph === 2 ? 1.0 : 0.88) * T;
    B.guard = { on: true, hit: null };
    // (the shadow keeps its stance alongside: it holds on a beat after the Veil draws)
    const shadeGap = Math.max(0.8, 0.85 * T);
    const shade = c ? (function* () {
      yield* holdStance(c, cHigh, hold + shadeGap);
      if (c.gone || !B.clones.includes(c)) return;
      const tr = yield* iaiDraw(c, cHigh, farSide(c.x));
      if (!c.gone) { yield* sheatheHome(c, [tr]); yield* wait(0.1); c.gone = true; smoke(c.x, c.y - 40); }
    })() : null;
    let waited;
    if (shade) {
      // the two run side by side until the Veil draws; the shadow's part goes on after
      let done = false;
      const veil = (function* () { waited = yield* holdStance(b, high, hold); done = true; })();
      while (!done) { const dt = yield; veil.next(dt); shade.next(dt); }
      B.shade = shade;
    } else waited = yield* holdStance(b, high, hold);

    if (!waited) {
      // caught: the blow rings off a hand's width of steel, and it is gone
      b.still = false; b.pose = 'parry';
      const hx = b.x + b.face * 24, hy = b.y - 52;
      G.audio.play('veilparry'); G.fx.stop(0.07); G.fx.shake(5);
      G.fx.glint(hx, hy, 28, G.pal().hot, 0.22);
      G.fx.burst(hx, hy, { n: 10, color: G.pal().hot, speed: [140, 480], angle: b.face > 0 ? Math.PI : 0, spread: 1.6, life: [0.1, 0.3], kind: 'spark', size: [1.4, 2.6], grav: 600 });
      b.recV = (b.recV || 0) - b.face * 1.6; b.kx = -b.face * 5;
      if (c && !c.gone) { c.gone = true; smoke(c.x, c.y - 40); }
      B.shade = null;
      yield* wait(0.14);
      B.guard.on = false;
      yield* vanish();
      yield* wait(0.1);
      // back through where the hero stands, from out of the dark
      const gy = P.plat && P.onGround ? P.plat.y : FLOOR, px = P.x, py = gy - 24;
      const ang = G.rng() < 0.5 ? G.rrand(0.5, 0.75) : Math.PI - G.rrand(0.5, 0.75), len = 560;
      const tele = (ph === 3 ? 0.3 : 0.36) * T;
      cutLine(px - Math.cos(ang) * len * 0.6, py - Math.sin(ang) * len * 0.6, ang, len, tele);
      yield* wait(tele + 0.04);
      appear(G.clamp(px + Math.cos(ang) * len * 0.4, WL + 50, WR - 50), FLOOR, 'skid');
      B.guard = null;
      yield* wait(0.75);
      return;
    }
    B.guard = null;
    b.face = P.x > b.x ? 1 : -1;
    const trails = [];
    const veilPart = (function* () {
      trails.push(yield* iaiDraw(b, high, farSide(b.x)));
      if (ph === 3) {
        // a new grip where it lands, and back the other way
        const high2 = K.chance(0.5, 'high2');
        yield* wait(0.08);
        b.face = P.x > b.x ? 1 : -1;
        stanceTo(b, high2, 0.3);
        yield* holdStance(b, high2, 0.42 * T, 0.3);
        b.face = P.x > b.x ? 1 : -1;
        trails.push(yield* iaiDraw(b, high2, farSide(b.x)));
      }
      yield* sheatheHome(b, trails);
      b.exposed = true;
      yield* wait(0.55);
      b.exposed = false;
    })();
    if (B.shade) { const sg = B.shade; B.shade = null; yield* par(veilPart, sg); } else yield* veilPart;
  }

  // ------------------------------------------------------------------ the crescent
  // Crescent. A great curved blade from its back, thrown, that flies out past the hero and comes
  // home to its hand. The throw tells the flight:
  //   overhand, the arm wound high behind the head: up and over you, then back low along the floor
  //   (stay down while it goes over, jump it as it comes home)
  //   sidearm, swept back low by the hip: out low along the floor, then back at a leaping height
  //   (jump it going out, stay down as it comes home)
  // In the second phase a shadow on your other side throws one with it, the same way; in the third it
  // catches the blade and throws again at once, and that throw says how the second one flies.
  const LOWY = FLOOR - 24, HIGHY = FLOOR - 90, TOPY = FLOOR - 250;

  // The blade's shape: a thick crescent, the edge round its outside.
  function crescentShape(ctx, x, y, rot, R, col, hot, al, edge) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = al;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0.947, G.TAU - 0.947, false);
    ctx.arc(R * 0.3, 0, R * 0.86, -1.234, 1.234, true);
    ctx.closePath();
    ctx.fillStyle = '#1b1730'; ctx.fill();
    if (edge) { ctx.strokeStyle = G.rgba(DANGER, 0.8); ctx.lineWidth = 2; ctx.stroke(); }
    ctx.strokeStyle = G.rgba(hot, 0.9); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, R - 1.5, 1.05, G.TAU - 1.05, false); ctx.stroke();
    // the grip, wrapped, at the back of the curve
    ctx.fillStyle = G.rgba(col, 0.9); ctx.fillRect(-R * 0.86, -4, 4, 8);
    ctx.restore();
  }
  // Held in the lead hand, its points forward along the hand, before it is thrown (or after a catch).
  function heldCrescent(ctx, a, al, gleamOnly) {
    const f = a.face, hd = handAt(a, 0), hx = hd.x, hy = hd.y; // (the hand as drawn: see living)
    const an = f > 0 ? hd.an : Math.PI - hd.an;
    const cx = hx + Math.cos(an) * 12, cy = hy + Math.sin(an) * 12, pal = G.pal();
    const col = a.clone ? '120,110,160' : pal.boss, hot = a.clone ? '200,195,230' : pal.hot;
    if (gleamOnly) {
      D.glow(ctx, col, cx, cy, 24, 0.6 * al);
      ctx.strokeStyle = G.rgba(hot, 0.8 * al); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, 19, an + Math.PI + 1.05, an + Math.PI + G.TAU - 1.05, false); ctx.stroke();
      return;
    }
    crescentShape(ctx, cx, cy, an + Math.PI, 20, col, hot, al, false);
  }

  // The thrown blade. Out past the hero with the speed going out of it; it turns over in the air
  // (overhand: down out of its climb to the floor; sidearm: up off the floor to a leaping height);
  // then home, gathering speed and easing into the hand. Short of room, it bites into the wall and
  // hangs there: the hero always has time to land between the way out and the way back.
  const smoothInv = (y) => { let lo = 0, hi = 1; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (m * m * (3 - 2 * m) < y) lo = m; else hi = m; } return (lo + hi) / 2; };
  function crescentBlade(a, over, x0, y0, dir, speed) {
    const P = G.player, sh = !!a.clone;
    const xf = G.clamp(x0 + dir * Math.max(560, Math.abs(P.x - x0) + 280), WL + 46, WR - 46);
    const lodge = Math.abs(xf - (WL + 46)) < 2 || Math.abs(xf - (WR - 46)) < 2;
    const tOut = Math.max(0.38, Math.abs(xf - x0) / speed), turnT = over ? 0.3 : 0.22;
    // the time from passing the hero on the way out to passing them on the way back
    const span = Math.abs(xf - x0) || 1, f = G.clamp(Math.abs(P.x - x0) / span, 0, 1);
    const tAt = tOut * (1 - Math.sqrt(1 - f)), tRetEst = Math.max(0.38, span / (speed * 1.1));
    const gap = (tOut - tAt) + turnT + tRetEst * smoothInv(Math.min(0.999, (1 - f) * span / Math.max(1, span - 30)));
    const tHang = turnT + Math.max(0, 0.85 - gap);
    const y1 = over ? LOWY : HIGHY;
    return H.add({
      kind: 'veilblade', x: x0, y: y0, dir, vx: dir * speed, vy: 0, spin: 0, trail: [], owner: a, over, tRet: 0, xc: x0, yc: y0, caught: false, ret: false, lodged: false,
      update(dt) {
        const px = this.x, py = this.y, t = this.t;
        if (t < tOut) {
          const k = t / tOut;
          this.x = G.lerp(x0, xf, E.outQuad(k));
          if (over) this.y = G.lerp(y0, TOPY, Math.sin(k * Math.PI / 2));
          else this.y = k < 0.14 ? G.lerp(y0, LOWY, E.outQuad(k / 0.14)) : LOWY;
        } else if (t < tOut + tHang) {
          const e = t - tOut, k = Math.min(1, e / turnT);
          if (lodge && !this.lodged) {
            this.lodged = true;
            G.audio.play('tink'); G.fx.shake(3);
            G.fx.burst(xf + dir * 14, this.y, { n: 10, color: sh ? '150,140,190' : G.pal().hot, speed: [100, 380], angle: dir > 0 ? Math.PI : 0, spread: 1.8, life: [0.12, 0.35], kind: 'spark', size: [1.4, 2.6], grav: 800 });
          }
          // over: it turns over at the top of its climb and comes down; sidearm: it lifts off the floor
          this.x = xf + (lodge ? 0 : dir * 10 * Math.sin(k * Math.PI / 2));
          this.y = over ? G.lerp(TOPY, LOWY, E.inQuad(k)) : G.lerp(LOWY, HIGHY, E.inOutQuad(k));
          if (lodge && over && k < 1 && Math.random() < dt * 30) G.fx.burst(this.x + dir * 12, this.y, { n: 1, color: sh ? '150,140,190' : G.pal().hot, speed: [40, 160], angle: -Math.PI / 2, spread: 1, life: [0.1, 0.2], kind: 'spark', size: [1, 2], grav: 600 });
        } else {
          if (!this.ret) {
            this.ret = true;
            const o = this.owner;
            this.xc = o.x + (G.sign(xf - o.x) || 1) * 30; this.yc = o.y - 60;
            this.tRet = Math.max(0.38, Math.abs(this.xc - xf) / (speed * 1.1));
            if (this.lodged) { G.audio.play('tink'); G.fx.dust(xf, this.y, 2, { speed: [20, 90], size: [4, 7], up: 10 }); }
          }
          const k = Math.min(1, (t - tOut - tHang) / this.tRet), q = k * k * (3 - 2 * k);
          this.x = G.lerp(xf, this.xc, q);
          this.y = k > 0.86 ? G.lerp(y1, this.yc, E.outQuad((k - 0.86) / 0.14)) : y1;
          if (k >= 1) this.home();
        }
        if (dt > 0) { this.vx = (this.x - px) / dt; this.vy = (this.y - py) / dt; }
        if (Math.abs(this.vx) > 1) this.dir = Math.sign(this.vx);
        this.srcX = this.x - this.dir * 20;
        // (tests: low and coming on, it is jumped; at a leaping height, it is let pass)
        this.kind = this.y > FLOOR - 60 ? 'flycut' : this.y > FLOOR - 130 ? 'crescent' : 'veilblade';
        const stuck = this.lodged && !this.ret;
        if (!stuck) this.spin += dt * 24 * (this.dir || 1);
        this.trail.push({ x: this.x, y: this.y, r: this.spin });
        if (this.trail.length > 5) this.trail.shift();
        // skimming the floor, it throws sparks and grit
        if (this.y > FLOOR - 34 && Math.random() < dt * 40) {
          G.fx.burst(this.x, FLOOR - 2, { n: 1, color: sh ? '150,140,190' : G.pal().hot, speed: [80, 260], angle: this.dir > 0 ? Math.PI + 0.5 : -0.5, spread: 0.6, life: [0.1, 0.25], kind: 'spark', size: [1.2, 2.2], grav: 700 });
          if (Math.random() < 0.3) G.fx.dust(this.x, FLOOR, 1, { speed: [20, 80], size: [4, 7], up: 12 });
        }
      },
      // home: into the hand that threw it, or, if that hand is gone, it falls and clatters
      home() {
        this.dead = true;
        const o = this.owner, b = B.body;
        const lost = o.gone || (o === b && (b.hidden || B.staggered || B.dying || B.dead));
        if (lost) {
          G.audio.play('tink');
          G.fx.burst(this.x, this.y, { n: 8, color: sh ? '150,140,190' : G.pal().hot, speed: [80, 300], life: [0.15, 0.4], kind: 'spark', size: [1.4, 2.6], grav: 700 });
          smoke(this.x, this.y);
        } else this.caught = true;
      },
      hits(Pl) { return G.rectsOverlap(Pl.box(), { cx: this.x, cy: this.y, hw: 17, hh: 15 }); },
      draw(ctx) {
        const pal = G.pal(), col = sh ? '120,110,160' : pal.boss, hot = sh ? '200,195,230' : pal.hot;
        ctx.globalCompositeOperation = 'lighter';
        D.glow(ctx, col, this.x, this.y, 40, sh ? 0.25 : 0.4);
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < this.trail.length - 1; i++) {
          const q = this.trail[i];
          crescentShape(ctx, q.x, q.y, q.r, 22, col, hot, 0.08 + 0.05 * i, false);
        }
        crescentShape(ctx, this.x, this.y, this.spin, 22, col, hot, sh ? 0.8 : 1, true);
      },
    });
  }

  // The wind-up and the throw. The arm goes back the whole time, the weight with it; a glint on the
  // blade at the top, then the body follows the arm through. Returns the blade (none if it died).
  function* throwFrom(a, over, wind, speed) {
    const P = G.player;
    a.face = P.x > a.x ? 1 : -1;
    a.held = true;
    const W = POSES[over ? 'windOver' : 'windSide'];
    // (as with a lunge, the low throw has a lane that is never drawn: the wind-up is the warning)
    if (!over) H.lane({ x: WL, y: FLOOR - 66, w: WR - WL, h: 66, dir: a.face, dur: wind, quiet: true });
    // (v2.5c) overhand: a reach over the shoulder for the blade, then wound up high behind the head;
    // sidearm: down into a dip with the arm already going back low, then swept back by the hip
    const CK = over ? [[0, null], [0.25, 'reachBack', E.outQuad], [0.8, W, E.inOutQuad], [1, W]] : [[0, null], [0.25, 'sideDip', E.outQuad], [0.8, W, E.inOutQuad], [1, W]];
    let e = 0, glinted = false, from = null;
    while (e < wind && !a.gone) {
      const dt = yield;
      e += dt;
      const k = Math.min(1, e / wind);
      if (k < 0.6 && Math.abs(P.x - a.x) > 20) a.face = P.x > a.x ? 1 : -1;
      if (!from) from = a.p.slice();
      const p = poseAt(a, CK, k, from);
      a.liveRate = 30; a.liveBox = null;
      if (k > 0.8) tremble(p, 0.4, e);
      // a last settle onto the back foot before it lets go
      if (k > 0.8) { p[1] += 2.5 * (k - 0.8) / 0.2; p[0] -= (over ? 0.08 : 0.05) * (k - 0.8) / 0.2; }
      if (!glinted && wind - e < 0.15) {
        glinted = true;
        const hx = a.x + a.face * a.p[7], hy = a.y + a.p[8];
        G.fx.glint(hx, hy, a.clone ? 18 : 24, a.clone ? '170,160,210' : G.pal().hot, 0.18); G.audio.play('glint');
      }
    }
    if (a.gone) { a.held = false; return null; }
    if (Math.abs(P.x - a.x) < 110) {
      // crowded at the last moment: a hop back with the arm still cocked, and it throws as it lands
      const away = a.x > P.x ? 1 : -1, x0 = a.x, tx = G.clamp(a.x + away * 130, WL + 40, WR - 40);
      let f = 0;
      while (f < 0.22 && !a.gone) { f += yield; const k = Math.min(1, f / 0.22); a.x = G.lerp(x0, tx, E.outQuad(k)); a.y = FLOOR - 4 * 46 * k * (1 - k); }
      a.y = FLOOR; a.face = P.x > a.x ? 1 : -1;
      G.fx.dust(a.x, FLOOR, 3, { dir: away, speed: [30, 140], size: [5, 9], up: 20 });
      if (a.gone) { a.held = false; return null; }
    }
    const dir = a.face;
    a.pose = over ? 'throwOver' : 'throwSide'; a.held = false;
    G.audio.play('arrowHeavy');
    const blade = crescentBlade(a, over, a.x + dir * 30, a.y + (over ? -84 : -50), dir, speed);
    if (!a.clone) G.audio.play('veilwhirr', { dur: 1.7 });
    if (!a.clone) b0Recoil(dir * 1.4);
    yield* tween(a, { x: G.clamp(a.x + dir * 16, WL + 30, WR - 30) }, 0.12, E.outCubic);
    return blade;
  }
  const b0Recoil = (v) => { const b = B.body; b.recV = (b.recV || 0) + v; };
  // It watches the blade out and back and reaches for it; the catch turns it a little with the weight.
  function* catchBlade(a, blade) {
    a.pose = 'watch';
    while (!blade.dead && !a.gone) {
      yield;
      if (blade.ret && Math.abs(blade.x - a.x) < 170) a.pose = 'catch';
    }
    if (a.gone || !blade.caught) return false;
    a.held = true;
    G.audio.play('tink');
    const hx = a.x + a.face * 30, hy = a.y - 60;
    G.fx.burst(hx, hy, { n: 6, color: a.clone ? '150,140,190' : G.pal().hot, speed: [80, 260], angle: blade.dir > 0 ? 0 : Math.PI, spread: 1.2, life: [0.1, 0.25], kind: 'spark', size: [1.2, 2.2], grav: 500 });
    if (!a.clone) b0Recoil(blade.dir * 1.8);
    // (v2.5c: the arm is carried back by the blade's weight, then comes in)
    a.pose = 'catchJolt';
    yield* tween(a, { x: G.clamp(a.x + blade.dir * 10, WL + 30, WR - 30) }, 0.12, E.outQuad);
    return true;
  }

  // Room to throw: a spring back off a hero who is too close (the held blade goes with it).
  function* makeRoom() {
    const b = B.body, P = G.player;
    if (Math.abs(P.x - b.x) >= 160) return;
    const away = b.x > P.x ? 1 : -1, tx = G.clamp(b.x + away * 170, WL + 50, WR - 50), x0 = b.x;
    b.face = -away; b.pose = 'air';
    let e = 0, from = null;
    while (e < 0.3) {
      e += yield; const k = Math.min(1, e / 0.3); b.x = G.lerp(x0, tx, k); b.y = FLOOR - 4 * 80 * k * (1 - k);
      if (!from) from = b.p.slice();
      poseAt(b, SPRING, k, from); b.liveRate = 30;
    }
    b.y = FLOOR; b.pose = 'crouch'; b.sq = 0.08;
    G.fx.dust(b.x, FLOOR, 3, { speed: [30, 140], size: [5, 9], up: 24 });
    yield* wait(0.06);
  }
  function* atkCrescent() {
    const b = B.body, P = G.player, T = K.T(), ph = B.phase;
    if (b.y < FLOOR - 1) { b.pose = 'air'; yield* tween(b, { y: FLOOR }, 0.2, E.inQuad); G.fx.thud(b.x, FLOOR, 0.5, { noCrack: true }); }
    yield* makeRoom();
    const over = K.chance(0.5, 'over');
    let c = null;
    if (ph === 2 || (ph === 3 && K.hard())) {
      const sx = G.clamp(P.x + (P.x - b.x), WL + 60, WR - 60);
      if (Math.abs(sx - P.x) > 140) c = clone(sx, FLOOR, G.sign(P.x - sx) || 1, 'crouch');
    }
    const wind = (ph === 3 ? 0.5 : 0.58) * T, speed = ph === 3 ? 900 : 820;
    const run = function* (a) {
      const bl = yield* throwFrom(a, over, wind, speed);
      if (bl) yield* catchBlade(a, bl);
      if (a.clone && !a.gone) { yield* wait(0.1); a.gone = true; a.held = false; smoke(a.x, a.y - 40); }
    };
    if (c) yield* par(run(b), run(c));
    else yield* run(b);
    if (ph === 3 && b.held) {
      // caught, and thrown again at once: this throw says how the second one flies
      const over2 = K.chance(0.5, 'over2');
      yield* wait(0.06);
      yield* makeRoom();
      const bl = yield* throwFrom(b, over2, 0.4 * T, 940);
      if (bl) yield* catchBlade(b, bl);
    }
    // the blade goes back over its shoulder
    b.pose = 'sheathe';
    yield* wait(0.1);
    b.heldA = 1;
    yield* tween(b, { heldA: 0 }, 0.12, E.inQuad);
    b.held = false; b.heldA = 1;
    G.audio.play('veilclick');
    yield* wait(0.08);
  }


  // ------------------------------------------------------------------ v2.1a: from the boss study
  // (docs/boss-study.md) An answer to a hero who rides over its head, a trap of threads, a chase of
  // cuts, and a sky full of moonlit blades.

  // A spring back off the hero (`h`: how high the arc goes).
  function* hopBack(a, dist, dur, h) {
    const P = G.player, away = a.x > P.x ? 1 : -1, x0 = a.x, tx = G.clamp(a.x + away * dist, WL + 50, WR - 50);
    a.face = -away; a.pose = 'air';
    G.fx.dust(a.x, FLOOR, 3, { dir: away, speed: [30, 140], size: [5, 9], up: 20 });
    let e = 0, from = null;
    while (e < dur && !a.gone) {
      e += yield; const k = Math.min(1, e / dur); a.x = G.lerp(x0, tx, E.outQuad(k)); a.y = FLOOR - 4 * h * k * (1 - k);
      if (!from) from = a.p.slice();
      poseAt(a, SPRING, k, from); a.liveRate = 30; a.liveBox = 'air';
    }
    a.y = FLOOR; a.pose = 'crouch';
    if (!a.clone) a.sq = 0.08;
    G.fx.dust(a.x, FLOOR, 3, { speed: [30, 140], size: [5, 9], up: 20 });
  }
  // Down out of the air onto the floor, if it is up there.
  function* comeDown(a, dur) {
    if (a.y >= FLOOR - 1) { a.y = FLOOR; return; }
    a.pose = 'air';
    const y0 = a.y;
    let e = 0;
    while (e < dur && !a.gone) { e += yield; const k = Math.min(1, e / dur); a.y = G.lerp(y0, FLOOR, k * k); }
    a.y = FLOOR;
    G.fx.thud(a.x, FLOOR, 0.5, { noCrack: true }); G.audio.play('land');
  }

  // ---- Skyhook (B.antiAir). It looks up first, and a glint runs up its gaze to where the hero is.
  //   gone in smoke that rises: it comes down out of the air onto that spot, heel first, and the
  //   landing sends a ripple both ways along the floor (move off the spot, then jump the ripple)
  //   sunk deep, both blades turned up: it goes straight up through that spot, cutting, and floats
  //   down beside it (move off the spot; nothing follows along the floor)
  // Phase II: its shadow does the same where the hero has gone. Phase III: it does it twice itself.
  function* skyTell(a, rise, dur) {
    const P = G.player;
    if (Math.abs(P.x - a.x) > 6) a.face = P.x > a.x ? 1 : -1;
    let e = 0, traced = false;
    while (e < dur && !a.gone) {
      e += yield;
      const k = Math.min(1, e / dur);
      // the head goes back first, whichever way it means to go
      const look = E.outQuad(Math.min(1, k * 2.2));
      if (!rise) {
        const p = mixPose(a, POSES.idle, POSES.lookUp, look);
        p[1] += 5 * E.inQuad(k); // it settles to spring
      } else {
        const p = mixPose(a, look < 1 ? POSES.idle : POSES.lookUp, POSES.coilUp, E.inOutQuad(G.clamp((k - 0.2) / 0.8, 0, 1)));
        p[1] += 2 * k + Math.sin(B.t * 64) * 0.9 * Math.max(0, k - 0.7) / 0.3; // and trembles at the bottom of it
      }
      if (!traced && k > 0.4) {
        traced = true;
        const hx = a.x + a.face * 7, hy = a.y - 76, len = Math.max(40, G.dist(hx, hy, P.x, P.y - 26));
        G.fx.cut((hx + P.x) / 2, (hy + P.y - 26) / 2, Math.atan2(P.y - 26 - hy, P.x - hx), len, 1.2, a.clone ? '120,110,160' : G.pal().boss, a.clone ? '200,195,230' : G.pal().hot, 0.32);
        G.audio.play('glint');
      }
    }
  }
  // The column it means: drawn as a mark is (it comes from out of sight), fading in and out.
  function skyMark(x, w) {
    return H.add({
      kind: 'mark', layer: 'under', x, w, k: 1, out: -1,
      update() { if (this.out >= 0 && this.t - this.out > 0.16) this.dead = true; },
      end() { if (this.out < 0) { this.out = this.t; this.kind = 'markfade'; } },
      draw(ctx) {
        const a = Math.min(1, this.t / 0.1) * (this.out >= 0 ? Math.max(0, 1 - (this.t - this.out) / 0.16) : 1);
        if (a <= 0) return;
        const l = this.x - this.w / 2, top = FLOOR - 330, late = this.out < 0 ? 0.5 + 0.5 * Math.sin(this.t * 55) : 0;
        const g = ctx.createLinearGradient(0, top, 0, FLOOR);
        g.addColorStop(0, G.rgba(DANGER, 0)); g.addColorStop(1, G.rgba(DANGER, (0.22 + 0.12 * late) * a));
        ctx.fillStyle = g; ctx.fillRect(l, top, this.w, FLOOR - top);
        ctx.fillStyle = G.rgba(DANGER, 0.36 * a);
        ctx.beginPath(); ctx.ellipse(this.x, FLOOR - 1, this.w / 2 * Math.min(1, this.t / 0.2), 10 * Math.min(1, this.t / 0.2), 0, 0, G.TAU); ctx.fill();
        ctx.strokeStyle = G.rgba(DANGER, 0.9 * a); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(this.x, FLOOR - 1, this.w / 2, 10, 0, 0, G.TAU); ctx.stroke();
      },
    });
  }
  // Where the strike goes: the spot the hero is over, a hair ahead of the way they are moving.
  const skySpot = () => { const P = G.player; return G.clamp(P.x + P.vx * 0.06, WL + 40, WR - 40); };
  // Heel first out of the air onto x. `a` is put in the air over it first (the Veil out of smoke, a
  // shadow made there).
  function* skyDrop(a, tele) {
    const P = G.player, sh = !!a.clone, x = a.x;
    const gy = groundAt(x, Math.min(P.y, FLOOR) - 2);
    const m = skyMark(x, 96);
    // it hangs a moment, turning over once, and the heel comes round to point down
    const y0 = a.y;
    let e = 0;
    while (e < tele && !a.gone) {
      e += yield;
      const k = Math.min(1, e / tele);
      const p = mixPose(a, POSES.air, POSES.heel, E.inQuad(G.clamp((k - 0.55) / 0.45, 0, 1)));
      p[2] = -a.face * G.TAU * E.inOutQuad(Math.min(1, k / 0.75)); // (a full turn, eased in and out)
      a.y = y0 - 14 * Math.sin(Math.PI * Math.min(1, k / 0.8)); // and rises a little with the turn
      if (k > 0.8 && !a.glinted) { a.glinted = true; G.fx.glint(a.x, a.y - 8, sh ? 18 : 24, sh ? '170,160,210' : G.pal().hot, 0.18); }
    }
    a.glinted = false;
    if (a.gone) { m.end(); return; }
    a.p[2] = Math.atan2(Math.sin(a.p[2]), Math.cos(a.p[2])); // (the turn is done: no unwinding it)
    a.pose = 'heel'; a.hurt = true;
    G.audio.play('streak');
    const y1 = a.y, dur = Math.max(0.1, (gy - y1) / 2600);
    e = 0;
    while (e < dur && !a.gone) {
      e += yield;
      const k = Math.min(1, e / dur);
      a.y = G.lerp(y1, gy, k * k);
      G.fx.spawn({ x: a.x + G.rand(-8, 8), y: a.y - G.rand(20, 70), vx: G.rand(-30, 30), vy: -G.rand(60, 200), life: 0.22, size: G.rand(4, 8), color: sh ? '20,16,34' : G.pal().boss });
    }
    a.y = gy; a.hurt = false; m.end();
    if (a.gone) return;
    K.crush(x, gy - 40, 44, 44, 1);
    if (gy >= FLOOR - 1) {
      if (sh) { G.fx.shake(6); G.audio.play('land'); G.fx.thud(x, FLOOR, 0.8, { noCrack: true }); } else K.impact(x, false);
      // the ripple: low, so it is jumped
      H.shockwave(x - 22, -1, 380, 30); H.shockwave(x + 22, 1, 380, 30);
    } else {
      G.fx.shake(5); G.audio.play('land');
      G.fx.burst(x, gy - 4, { n: 8, color: sh ? '150,140,190' : G.pal().hot, speed: [100, 340], angle: -Math.PI / 2, spread: 2.4, life: [0.15, 0.35], kind: 'spark', size: [1.4, 2.6], grav: 900 });
    }
    // it lands crouched over the heel, the weight carried down into one knee
    a.sq = 0.16; a.pose = 'stuckDeep';
  }
  // Straight up through x from the floor: a deep crouch, then the cut, then a float down beside it.
  function* skyRise(a, tele) {
    const P = G.player, sh = !!a.clone, x = a.x;
    const top = Math.max(70, Math.min(P.y - 170, FLOOR - 300));
    const beam = cutLine(x, FLOOR - 6, -Math.PI / 2, FLOOR - 6 - top + 30, tele);
    beam.layer = 'under';
    let e = 0;
    while (e < tele && !a.gone) {
      e += yield;
      const k = Math.min(1, e / tele);
      const p = mixPose(a, POSES.coilUp, POSES.coilUp, 0);
      p[1] += 2 + 2 * k + Math.sin(B.t * 70) * 0.8 * k;
      if (!a.glinted && tele - e < 0.18) { a.glinted = true; G.fx.glint(a.x + a.face * 9, a.y - 40, sh ? 18 : 24, sh ? '170,160,210' : G.pal().hot, 0.18); G.audio.play('glint'); }
    }
    a.glinted = false;
    if (a.gone) return;
    // up the line, laid along it
    POSES.streak = POSES.dash.slice(); POSES.streak[2] = -Math.PI / 2; // (the dash, turned to point up)
    a.pose = 'streak';
    G.audio.play('streak');
    G.fx.dust(x, FLOOR, 5, { speed: [60, 260], size: [6, 12], up: 20 });
    const y0 = a.y, ty = top + 60;
    e = 0;
    while (e < 0.12 && !a.gone) {
      e += yield;
      const k = Math.min(1, e / 0.12);
      a.y = G.lerp(y0, ty, E.outQuad(k));
      G.fx.spawn({ x: a.x + G.rand(-6, 6), y: a.y - G.rand(0, 40), vx: G.rand(-30, 30), vy: G.rand(80, 260), life: 0.22, size: G.rand(4, 8), color: sh ? '20,16,34' : G.pal().boss });
    }
    if (a.gone) return;
    // over the top, a turn in the air, and down beside the line, light, away from the hero
    a.pose = 'air';
    const side = (G.sign(a.x - P.x) || a.face) * 1, x0 = a.x, x1 = G.clamp(a.x + side * 46, WL + 40, WR - 40), y1 = a.y;
    e = 0;
    const fall = 0.42;
    while (e < fall && !a.gone) {
      e += yield;
      const k = Math.min(1, e / fall);
      a.x = G.lerp(x0, x1, E.outQuad(k));
      a.y = y1 - 26 * Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - k) + (FLOOR - y1) * k * k;
    }
    a.y = FLOOR;
    if (!sh) { G.fx.thud(a.x, FLOOR, 0.45, { noCrack: true }); G.audio.play('land'); }
    a.pose = 'crouch';
  }
  // One skyhook by the Veil or a shadow, on where the hero is now.
  function* skyStrike(a, rise, tele) {
    const P = G.player, x = skySpot();
    if (a === B.body) {
      yield* vanish();
      yield* wait(0.06);
      if (rise) appear(x, FLOOR, 'coilUp');
      else appear(x, G.clamp(Math.min(P.y, FLOOR) - 210, 60, FLOOR - 200), 'air');
    } else {
      a.x = x;
      if (!rise) a.y = G.clamp(Math.min(P.y, FLOOR) - 210, 60, FLOOR - 200);
      smoke(a.x, a.y - 40);
    }
    if (rise) yield* skyRise(a, tele); else yield* skyDrop(a, tele);
  }
  function* atkSkyhook() {
    const b = B.body, P = G.player, T = K.T(), ph = B.phase;
    yield* comeDown(b, 0.2);
    const rise = K.chance(0.5, 'rise');
    yield* skyTell(b, rise, (ph === 3 ? 0.42 : 0.5) * T);
    yield* skyStrike(b, rise, (rise ? 0.4 : 0.46) * T);
    if (ph === 2 || (ph === 3 && K.hard())) {
      // its shadow, where the hero went (once the ripple has run on past)
      yield* wait(0.3);
      const r2 = K.chance(0.5, 'shadeRise');
      const c = clone(skySpot(), r2 ? FLOOR : FLOOR - 220, b.face, r2 ? 'coilUp' : 'air');
      c.hurt = false;
      yield* skyStrike(c, r2, (r2 ? 0.44 : 0.5) * T);
      yield* wait(0.1);
      c.gone = true; smoke(c.x, c.y - 40);
    }
    if (ph === 3) {
      // and again itself, where the hero went; it looks up for a moment first
      const r3 = K.chance(0.5, 'rise2');
      yield* wait(0.08);
      yield* skyTell(b, r3, 0.3 * T);
      yield* skyStrike(b, r3, (r3 ? 0.36 : 0.4) * T);
    }
    b.exposed = true;
    if (b.pose !== 'stuck' && b.pose !== 'stuckDeep') b.pose = 'kneel';
    yield* wait(ph === 1 ? 0.9 : ph === 2 ? 0.8 : 0.7);
    b.exposed = false;
  }

  // ---- Snare. It flicks knives with a thread between them, and they pin where they land; the
  // threads hang slack, then draw tight, and when it yanks its hand back they snap straight and cut.
  //   underhand (the arm swung back low, then up through): the knives pin into the floor either side
  //   of the hero and the thread lies across the floor at the ankles (jump as it snaps, or be off it)
  //   overhand (the arm over the head): two threads from high on the walls, crossing over the hero
  //   and pinned into the floor beyond them (stay down under where they cross, or get clear)
  // Phase II: a second thread joins each (a high one over the low one, ankle threads outside the
  // cross). Phase III: the threads snap one after another, then it throws again the other way.
  const THREAD_LOW = FLOOR - 16;
  function snareThread(ox, oy, ax, ay, bx, by, flyT, hold, sh) {
    const P = G.player;
    return H.add({
      kind: 'snare', layer: 'over', ox, oy, ax, ay, bx, by, flyT, hold, sh, snapped: false, slashable: false,
      x: (ax + bx) / 2, y: (ay + by) / 2,
      get firing() { return this.snapped && this.t < this.flyT + this.hold + 0.1; },
      update() {
        if (this.t >= this.flyT && !this.pinned) {
          this.pinned = true;
          G.audio.play('tink');
          for (const [x, y] of [[this.ax, this.ay], [this.bx, this.by]]) {
            G.fx.burst(x, y, { n: 5, color: this.sh ? '150,140,190' : G.pal().hot, speed: [80, 300], angle: -Math.PI / 2, spread: 2.2, life: [0.1, 0.28], kind: 'spark', size: [1.2, 2.4], grav: 800 });
            if (y > FLOOR - 4) G.fx.dust(x, FLOOR, 1, { speed: [10, 60], size: [4, 7], up: 14 });
          }
        }
        if (this.t >= this.flyT + this.hold && !this.snapped) {
          this.snapped = true;
          G.audio.play('veilsnap'); G.fx.shake(4);
          const mx = (this.ax + this.bx) / 2, my = (this.ay + this.by) / 2, ang = Math.atan2(this.by - this.ay, this.bx - this.ax);
          G.fx.cut(mx, my, ang, G.dist(this.ax, this.ay, this.bx, this.by), 4, this.sh ? '60,50,96' : G.pal().boss, this.sh ? '200,195,230' : G.pal().hot, 0.3);
        }
        if (this.t >= this.flyT + this.hold + 0.45) this.dead = true;
        this.srcX = P.x < this.x ? Math.max(this.ax, this.bx) : Math.min(this.ax, this.bx);
        // (tests: a thread across the floor is jumped as it snaps, as a thrown cut along the floor is)
        const left = this.flyT + this.hold - this.t, low = this.ay > FLOOR - 40 && this.by > FLOOR - 40;
        const over = P.x > Math.min(this.ax, this.bx) - 30 && P.x < Math.max(this.ax, this.bx) + 30;
        if (low && over && left < 0.14 && left > -0.05) { this.kind = 'flycut'; this.x = P.x - 10; this.vx = 1; this.y = FLOOR - 22; }
        else { this.kind = 'snare'; this.x = (this.ax + this.bx) / 2; this.y = (this.ay + this.by) / 2; }
      },
      // (the thread between the knives cuts; the knives' own ends do not reach past them)
      hits(Pl) {
        if (!this.firing) return false;
        const L = G.dist(this.ax, this.ay, this.bx, this.by) || 1, ux = (this.bx - this.ax) / L, uy = (this.by - this.ay) / L, m = Math.min(12, L / 4);
        return G.distPointSeg(Pl.x, Pl.y - 22, this.ax + ux * m, this.ay + uy * m, this.bx - ux * m, this.by - uy * m) < 19;
      },
      // (tests) where the thread runs through the hero's height when it snaps
      danger(Pl) {
        if (this.snapped) return null;
        const y0 = Pl.y - 44 - 18, y1 = Pl.y + 18, x0 = Math.min(this.ax, this.bx), x1 = Math.max(this.ax, this.bx);
        let lo = 1e9, hi = -1e9;
        for (let i = 0; i <= 24; i++) {
          const q = i / 24, x = G.lerp(this.ax, this.bx, q), y = G.lerp(this.ay, this.by, q);
          if (y >= y0 && y <= y1) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
        }
        if (hi < lo) return null;
        lo = Math.max(lo, x0); hi = Math.min(hi, x1);
        return [(lo + hi) / 2, (hi - lo) / 2 + 30, this.flyT + this.hold - this.t];
      },
      draw(ctx) {
        const pal = G.pal(), col = this.sh ? '120,110,160' : pal.boss, hot = this.sh ? '200,195,230' : pal.hot, t = this.t;
        let ax = this.ax, ay = this.ay, bx = this.bx, by = this.by, sag = 0, al = 1;
        if (t < this.flyT) {
          // the two knives in flight from its hand, the thread paying out between them
          const k = E.outQuad(t / this.flyT);
          ax = G.lerp(this.ox, this.ax, k); ay = G.lerp(this.oy, this.ay, k);
          bx = G.lerp(this.ox, this.bx, k); by = G.lerp(this.oy, this.by, k);
          sag = 30 * k;
        } else if (!this.snapped) {
          // hanging slack, drawing tighter, and shivering at the end
          const k = (t - this.flyT) / this.hold;
          sag = 34 * (1 - E.inQuad(k)) + 2;
          if (k > 0.7) sag += Math.sin(t * 95) * 1.6 * (k - 0.7) / 0.3;
        } else al = Math.max(0, 1 - (t - this.flyT - this.hold) / 0.45);
        const mx = (ax + bx) / 2, my = Math.min((ay + by) / 2 + sag, FLOOR - 2); // (slack lies on the floor, not through it)
        ctx.save();
        ctx.lineCap = 'round';
        // its line, in the warning colour, stronger as it tightens (a thrown thing is marked)
        if (t >= this.flyT && !this.snapped) {
          const k = (t - this.flyT) / this.hold;
          ctx.strokeStyle = G.rgba(DANGER, 0.12 + 0.3 * k); ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'lighter';
        if (this.snapped) {
          ctx.strokeStyle = G.rgba(col, 0.5 * al); ctx.lineWidth = 5 * al;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
        ctx.strokeStyle = G.rgba(hot, (this.snapped ? 0.9 : 0.75) * al); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
        // light running along it while it holds
        if (t >= this.flyT && !this.snapped) {
          const q = (t * 1.3) % 1;
          D.glow(ctx, hot, G.lerp(ax, bx, q), G.lerp(ay, by, q) + 4 * q * (1 - q) * sag, 5, 0.6 * Math.sin(Math.PI * q));
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = al;
        // the knives: flying point first, then standing where they pinned
        const angA = t < this.flyT ? Math.atan2(this.ay - this.oy, this.ax - this.ox) : (this.ay > FLOOR - 30 ? Math.PI / 2 - 0.35 * Math.sign(this.ax - this.ox || 1) : Math.atan2(this.ay - this.oy, this.ax - this.ox));
        const angB = t < this.flyT ? Math.atan2(this.by - this.oy, this.bx - this.ox) : (this.by > FLOOR - 30 ? Math.PI / 2 - 0.35 * Math.sign(this.bx - this.ox || 1) : Math.atan2(this.by - this.oy, this.bx - this.ox));
        dagger(ctx, ax - Math.cos(angA) * 22, ay - Math.sin(angA) * 22, angA, col, hot, false);
        dagger(ctx, bx - Math.cos(angB) * 22, by - Math.sin(angB) * 22, angB, col, hot, false);
        ctx.restore();
      },
    });
  }
  // One set: its wind-up, the flick, the knives in the air; then the threads hold, tighten and snap
  // when it yanks. Returns when they have snapped.
  function* snareSet(under, wind, hold, stagger) {
    const b = B.body, P = G.player, ph = B.phase;
    b.face = P.x > b.x ? 1 : -1;
    // (v2.5c: two-handed, a knife in each with the thread between, so never the crescent's one-armed
    // throw: under, both hands sink low and spread by the knees; over, both stretch wide over its head)
    const W = under ? 'snareUnder' : 'snareOver';
    const SK = [[0, null], [0.3, under ? 'crouch' : 'snareHold', E.outQuad], [0.78, W, E.inOutQuad], [1, W]];
    let e = 0, from = null;
    while (e < wind) {
      e += yield;
      const k = Math.min(1, e / wind);
      if (k < 0.7 && Math.abs(P.x - b.x) > 20) b.face = P.x > b.x ? 1 : -1;
      if (!from) from = b.p.slice();
      const p = poseAt(b, SK, k, from);
      b.liveRate = 30;
      if (k > 0.75) { p[1] += 2.5 * (k - 0.75) / 0.25; p[0] -= 0.06 * (k - 0.75) / 0.25; tremble(p, 0.5, e); }
      if (!b.glinted && wind - e < 0.15) { b.glinted = true; G.fx.glint(b.x + b.face * b.p[7], b.y + b.p[8], 22, G.pal().hot, 0.18); G.audio.play('glint'); }
    }
    b.glinted = false;
    // the threads, laid out from where the hero stands now
    const px = G.clamp(P.x, WL + 120, WR - 120), set = [];
    if (under) {
      const half = 185, l = Math.max(WL + 10, px - half), r = Math.min(WR - 10, px + half);
      set.push([l, THREAD_LOW, r, THREAD_LOW]);
      if (ph >= 2) set.push([px - half + 20, FLOOR - 112, px + half - 20, FLOOR - 112]); // and one over it, at a leaping height, a beat later
    } else {
      // two lines that cross high over the hero: each from a knife in a wall, down through the
      // crossing, to a knife in the floor beyond the hero (the further the wall, the shallower the line)
      const ay = FLOOR - 152, feet = [];
      for (const s of [-1, 1]) {
        const wx = s > 0 ? WL + 4 : WR - 4, dist = Math.abs(px - wx);
        const wy = G.clamp(ay - 152 * dist / 250, 70, ay - 40);
        const fx = G.clamp(px + s * dist * 152 / (ay - wy), WL + 8, WR - 8); // where it pins in the floor
        feet.push(fx);
        set.push([wx, wy, fx, FLOOR - 4]);
      }
      if (ph >= 2) for (let i = 0; i < 2; i++) {
        const s = i ? 1 : -1, fx = feet[i], ox = G.clamp(fx + s * 210, WL + 8, WR - 8);
        if (Math.abs(ox - fx) > 60) set.push([fx, THREAD_LOW, ox, THREAD_LOW]); // ankle threads outside the cross
      }
    }
    b.pose = under ? 'snareFlick' : 'snareCast';
    G.audio.play('arrowHeavy');
    b.recV = (b.recV || 0) + b.face * 1.2;
    const ox = b.x + b.face * 30, oy = b.y + (under ? -40 : -80), flyT = 0.2;
    // (the high thread over a low one waits until a hero who jumped the low one is down again)
    const gap = under ? 0.62 : stagger;
    const threads = set.map((s, i) => snareThread(ox, oy, s[0], s[1], s[2], s[3], flyT + i * 0.03, hold + i * gap - i * 0.03, false));
    yield* wait(flyT + 0.08);
    // it holds the slack in its fingers, and draws it tighter
    G.audio.play('veilstrain', { dur: hold - 0.1 });
    const first = Math.min(...threads.map((h) => h.flyT + h.hold)), last = Math.max(...threads.map((h) => h.flyT + h.hold));
    e = flyT + 0.08;
    // (v2.5c: the fists come in to its chest and draw apart, leaning back into the strain; it shakes
    // harder as the thread tightens)
    const e0 = e, span = Math.max(0.01, first - 0.12 - e0);
    while (e < first - 0.12) {
      e += yield;
      const k = G.clamp((e - e0) / span, 0, 1), p = poseAt(b, [[0, 'snareHold']], 0, null);
      b.liveRate = k < 0.25 ? 18 : 30;
      p[0] -= 0.1 * E.inQuad(k); p[1] += 1.5 * k; p[7] += 3 * k; p[10] -= 3 * k;
      tremble(p, 0.2 + 0.8 * k * k, e);
    }
    // the yank: its hand comes back hard as the threads go
    b.pose = 'pull'; b.recV = (b.recV || 0) - b.face * 1.4;
    while (e < last + 0.02) e += yield;
    return threads;
  }
  function* atkSnare() {
    const b = B.body, P = G.player, T = K.T(), ph = B.phase;
    yield* comeDown(b, 0.2);
    if (Math.abs(P.x - b.x) < 200) yield* hopBack(b, 190, 0.32, 80);
    const under = K.chance(0.5, 'under');
    const hold = (ph === 1 ? 0.95 : ph === 2 ? 0.9 : 0.82) * T;
    yield* snareSet(under, (ph === 3 ? 0.42 : 0.5) * T, hold, ph === 3 ? 0.2 : 0);
    if (ph === 3) {
      // and again at once, the other way: the throw says which
      yield* wait(0.12);
      if (Math.abs(P.x - b.x) < 150) yield* hopBack(b, 150, 0.26, 60);
      yield* snareSet(!under, 0.36 * T, 0.78 * T, 0.18);
    }
    // its hand still out where it yanked: open for a moment
    b.exposed = true;
    yield* wait(0.55);
    b.exposed = false;
  }

  // ---- Dance. It lays one blade against the other at its chest, once for every cut to come; then it
  // goes through the hero along a line, again and again, each cut from where the last one ended:
  // along the floor if they keep to it, up after them if they jumped, down on them from the air.
  // The lines show where (a cut). Then it drops to one knee, spent, and is open for a long moment.
  // Phase I: two or three cuts; II: three or four; III: four or five, and quicker.
  function* atkDance() {
    const b = B.body, P = G.player, T = K.T(), ph = B.phase;
    yield* comeDown(b, 0.2);
    const n = (ph === 1 ? 2 : ph === 2 ? 3 : 4) + (K.chance(0.5, 'long') ? 1 : 0);
    b.face = P.x > b.x ? 1 : -1;
    // the taps: blade on blade, once per cut (a short breath between)
    for (let i = 0; i < n; i++) {
      let e = 0;
      const dur = 0.24;
      while (e < dur) {
        e += yield;
        const k = Math.min(1, e / dur);
        // up, a hair of a pause, then down onto the other blade
        mixPose(b, POSES.tapUp, POSES.tapDown, k < 0.5 ? 0 : E.inQuad((k - 0.5) / 0.5));
        if (k >= 0.92 && !b.tapped) {
          b.tapped = true;
          G.audio.play('veiltap');
          G.fx.burst(b.x + b.face * 8, b.y - 48, { n: 3, color: G.pal().hot, speed: [60, 200], life: [0.08, 0.2], kind: 'spark', size: [1, 2], grav: 400 });
        }
      }
      b.tapped = false;
    }
    // (v2.5c: from the last tap straight down into its coil, the blades still crossed)
    yield* keys(b, 0.1, [[0, null], [1, 'danceCoil', E.outQuad]], { rate: 36 });
    for (let i = 0; i < n; i++) {
      const tele = (i === 0 ? 0.46 : ph === 3 ? 0.28 : 0.32) * T;
      yield* danceCut(tele, i === n - 1);
    }
    yield* comeDown(b, 0.22);
    // spent
    b.pose = 'kneel'; b.exposed = true;
    G.fx.dust(b.x, FLOOR, 3, { speed: [20, 90], size: [5, 9], up: 16 });
    yield* wait(ph === 1 ? 1.4 : ph === 2 ? 1.3 : 1.2);
    b.exposed = false;
  }
  // One cut of the dance: aimed through where the hero is, from wherever it is; it ends past them.
  // The last always comes down to the floor.
  function* danceCut(tele, last) {
    const b = B.body, P = G.player;
    const tx = G.clamp(P.x + P.vx * 0.05, WL + 40, WR - 40), ty = Math.min(P.y, FLOOR) - 24;
    const ox = b.x, oy = b.y - 40;
    let ang = Math.atan2(ty - oy, tx - ox);
    // never straight up or down: it crosses
    const minFlat = 0.35;
    if (Math.abs(Math.cos(ang)) < minFlat) {
      const sx = Math.sign(Math.cos(ang)) || (tx >= ox ? 1 : -1), sy = Math.sign(Math.sin(ang)) || 1;
      ang = Math.atan2(sy * Math.sqrt(1 - minFlat * minFlat), sx * minFlat);
    }
    const c = Math.cos(ang), s = Math.sin(ang);
    // as far as 230 past the hero, a wall, the floor, or (for the last) on down to the floor
    let len = G.dist(ox, oy, tx, ty) + 230;
    if (c > 0.01) len = Math.min(len, (WR - 40 - ox) / c); else if (c < -0.01) len = Math.min(len, (WL + 40 - ox) / c);
    if (s > 0.02) len = Math.min(len, (FLOOR - 2 - oy) / s);
    if (s < -0.02) len = Math.min(len, (oy - 110) / -s);
    len = Math.max(len, Math.min(G.dist(ox, oy, tx, ty) + 40, 900));
    b.face = c >= 0 ? 1 : -1;
    cutLine(ox, oy, ang, len, tele);
    // (v2.5c: coiled with the blades crossed, the body turning to lie along the line it will cut; at
    // the glint the cross opens and it sinks to go)
    const tilt = b.face > 0 ? ang : Math.PI - ang, lean = Math.atan2(Math.sin(tilt), Math.cos(tilt)) * 0.3;
    const W = b.y < FLOOR - 1 ? 'airCoil' : 'danceCoil';
    yield* keys(b, Math.max(0, tele - 0.16), [[0, null], [0.4, W, E.outQuad], [1, W]], { fx: (p, k) => { p[2] += lean * E.inOutQuad(k); } });
    G.fx.glint(b.x + b.face * 18, b.y - 44, 22, G.pal().hot, 0.16); G.audio.play('glint');
    yield* keys(b, Math.min(tele, 0.16), [[0, W], [1, W]], { rate: 40, fx: (p, k, e2) => { p[2] += lean; p[9] += 0.5 * k; p[12] -= 0.5 * k; p[1] += 2 * k; tremble(p, k, e2); } });
    POSES.streak = POSES.dash.slice(); POSES.streak[2] = Math.atan2(Math.sin(tilt), Math.cos(tilt));
    b.pose = 'streak'; G.audio.play('streak');
    const x0 = b.x, y0 = b.y;
    let x1 = ox + c * len, y1 = Math.min(FLOOR, oy + s * len + 40);
    const dur = Math.max(0.08, len / 2500);
    let e = 0;
    while (e < dur) {
      e += yield;
      const k = Math.min(1, e / dur), q = E.outQuad(k);
      b.x = G.lerp(x0, x1, q); b.y = G.lerp(y0, y1, q);
      G.fx.spawn({ x: b.x - c * 20, y: b.y - G.rand(10, 60), vx: -c * G.rand(40, 200), vy: -s * G.rand(40, 200), life: 0.25, size: G.rand(4, 9), color: G.pal().boss });
    }
    G.fx.cut((x0 + x1) / 2, (y0 + y1) / 2 - 40, ang, len, 4, G.pal().boss, G.pal().hot, 0.3);
    if (b.y >= FLOOR - 1) {
      b.y = FLOOR; b.pose = 'skidOver';
      G.fx.dust(b.x, FLOOR, 4, { dir: b.face, speed: [60, 240], size: [6, 11], up: 30 });
    } else {
      // it hangs where the cut ended, turning back towards the hero
      b.pose = 'air';
      if (last) yield* comeDown(b, 0.2);
    }
    yield* wait(0.06);
  }

  // ---- Moonfall. The light goes out of the arena, and it leaps up out of sight. Over a wall a pale
  // crescent of blades gathers, falling into place one after another; then the whole crescent sweeps
  // across the arena to the other wall. Its hollow is the one way through:
  //   the hollow low, at the floor: keep to the ground as it passes (get down off a ledge)
  //   the hollow high: be in the air or on a ledge as it passes
  // Phase II: a second crescent from the other wall. Phase III: three, and the hollow of each drifts
  // as it comes (watch where it is when it reaches you). It comes down where the last one ended and
  // kneels in the dark, open.
  const MOON_TOP = 40, MOON_BOW = 46;
  const GAP_LO = [FLOOR - 74, FLOOR + 10], GAP_HI = [FLOOR - 196, FLOOR - 70];
  function moonWall(dir, gap0, gap1, form, speed) {
    const P = G.player, x0 = dir > 0 ? WL + 14 : WR - 14, x1 = dir > 0 ? WR - 14 : WL + 14;
    const N = 17;
    return H.add({
      kind: 'moonwall', layer: 'over', dir, x: x0, fx: x0, end: -1, y: FLOOR - 40, vx: 0, form, speed, gap0, gap1, launched: false, blades: [],
      gapAt(t) {
        // the hollow: where it is, drifting from gap0 to gap1 as the crescent crosses (phase III)
        const k = this.launched ? G.clamp((this.fx - x0) / (x1 - x0), 0, 1) : 0;
        const kk = t == null ? k : G.clamp(k + (t * this.speed) / Math.abs(x1 - x0), 0, 1);
        // (it drifts over the middle of the crossing, so most of the floor meets it one way or the other)
        const q = E.inOutQuad(G.clamp((kk - 0.36) / 0.28, 0, 1));
        return [G.lerp(this.gap0[0], this.gap1[0], q), G.lerp(this.gap0[1], this.gap1[1], q)];
      },
      xAt(y) { return this.fx + this.dir * MOON_BOW * Math.sin(Math.PI * G.clamp((y - MOON_TOP) / (FLOOR - MOON_TOP), 0, 1)); },
      launch() {
        this.launched = true; this.t0 = this.t;
        G.audio.play('whoosh'); G.audio.play('veilwhirr', { dur: Math.abs(x1 - x0) / this.speed });
        G.fx.shake(5);
      },
      update(dt) {
        if (this.launched) {
          const e = this.t - this.t0;
          this.vx = this.dir * this.speed * G.lerp(0.4, 1, Math.min(1, e / 0.35));
          if (this.end >= 0) { this.vx = 0; if (this.t - this.end > 0.24) this.dead = true; }
          else this.fx += this.vx * dt;
          if (this.end < 0 && (this.fx - x1) * this.dir >= 0) {
            this.fx = x1; this.end = this.t;
            G.audio.play('tink'); G.fx.shake(4);
            for (let i = 0; i < 6; i++) {
              const y = G.lerp(MOON_TOP + 30, FLOOR - 10, i / 5);
              G.fx.burst(x1, y, { n: 3, color: G.pal().hot, speed: [80, 300], angle: this.dir > 0 ? Math.PI : 0, spread: 1.6, life: [0.12, 0.35], kind: 'spark', size: [1.2, 2.4], grav: 700 });
            }
          }
          if (Math.random() < dt * 30) G.fx.dust(this.xAt(FLOOR) - this.dir * 10, FLOOR, 1, { dir: this.dir, speed: [40, 160], size: [5, 9], up: 16, a: 0.3 });
        }
        // (tests) the hollow low as it reaches the hero: stay down; high: jump it
        // (the scripted dodger in tests: stays down for a low hollow; jumps a high one, as it is near)
        const dx = P.x - this.fx, arrive = this.launched && dx * this.dir > 0 ? Math.abs(dx) / this.speed : null;
        const g = this.gapAt(arrive || 0), lowGap = g[1] > FLOOR - 4;
        this.kind = !this.launched || this.end >= 0 || dx * this.dir <= -30 ? 'moonwall' : lowGap ? 'crescent' : 'flycut';
        this.x = this.kind === 'flycut' ? this.fx - this.dir * 80 : this.fx;
        this.y = FLOOR - 40;
        this.srcX = this.fx - this.dir * 30;
      },
      hits(Pl) {
        if (!this.launched || this.end >= 0) return false;
        const bx = Pl.box(), cy = bx.cy;
        if (cy + bx.hh < MOON_TOP) return false; // (v2.1b: above the top of the crescent there is no blade)
        if (Math.abs(Pl.x - this.xAt(cy)) > 16 + bx.hw) return false;
        const g = this.gapAt();
        return !(cy - bx.hh >= g[0] && cy + bx.hh <= g[1]);
      },
      draw(ctx) {
        const pal = G.pal(), col = pal.boss, hot = pal.hot, t = this.t;
        const g = this.gapAt(), fade = this.end >= 0 ? Math.max(0, 1 - (t - this.end) / 0.24) : 1;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.lineCap = 'round';
        // a faint arc of moonlight along the whole crescent
        ctx.globalCompositeOperation = 'lighter';
        const form = this.launched ? 1 : Math.min(1, t / this.form);
        ctx.strokeStyle = G.rgba(col, 0.16 * form); ctx.lineWidth = 16;
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) { const y = G.lerp(MOON_TOP, FLOOR, i / 24), x = this.xAt(y); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke();
        // the trail it leaves
        if (this.launched) {
          for (let j = 1; j <= 3; j++) {
            ctx.strokeStyle = G.rgba(col, 0.07 / j); ctx.lineWidth = 10;
            ctx.beginPath();
            for (let i = 0; i <= 16; i++) { const y = G.lerp(MOON_TOP, FLOOR, i / 16), x = this.xAt(y) - this.dir * j * 26; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
            ctx.stroke();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
        // the blades: each falls into its place, top first, while it gathers
        for (let i = 0; i < N; i++) {
          const y = G.lerp(MOON_TOP + 14, FLOOR - 10, i / (N - 1));
          if (y + 8 > g[0] && y - 8 < g[1]) continue; // (the hollow)
          const at = (i / N) * this.form * 0.8;
          const k = this.launched ? 1 : G.clamp((t - at) / (this.form * 0.25), 0, 1);
          if (k <= 0) continue;
          const yy = y - (1 - E.outQuad(k)) * 220, x = this.xAt(y);
          const ang = this.dir > 0 ? 0 : Math.PI;
          // (against the far wall they break loose and drop away)
          const br = this.end >= 0 ? t - this.end : 0;
          ctx.globalAlpha = k * fade;
          const bx2 = x - Math.cos(ang) * 20 - this.dir * br * 120, by2 = yy + br * br * 900 * (0.6 + 0.4 * ((i * 7) % 5) / 5);
          ctx.save(); ctx.translate(bx2, by2); ctx.scale(1.5, 1.5);
          dagger(ctx, 0, 0, ang + Math.sin(t * 9 + i) * 0.05 + br * 6 * ((i % 2) - 0.5), col, hot, false);
          ctx.restore();
        }
        ctx.globalAlpha = fade;
        // the lips of the hollow catch the light, in the warning colour (it is a thrown thing)
        ctx.strokeStyle = G.rgba(DANGER, (0.6 + 0.3 * Math.sin(t * 8)) * fade); ctx.lineWidth = 3;
        for (const [y, sgn] of [[g[0], 1], [g[1], -1]]) {
          if (y > FLOOR) continue;
          const x = this.xAt(y);
          // a bracket at each lip, opening into the hollow
          ctx.beginPath(); ctx.moveTo(x - this.dir * 14, y + sgn * 9); ctx.lineTo(x - this.dir * 14, y); ctx.lineTo(x + this.dir * 26, y); ctx.lineTo(x + this.dir * 26, y + sgn * 9); ctx.stroke();
        }
        ctx.restore();
      },
    });
  }
  function* atkMoonfall() {
    const b = B.body, P = G.player, T = K.T(), ph = B.phase;
    yield* comeDown(b, 0.2);
    B.moon = true;
    b.face = P.x > b.x ? 1 : -1;
    // it sinks, and the dark comes in around it
    G.audio.play('veilmoon', { dur: 1.8 });
    // (v2.5c: as the light goes its arms open wide and its head comes up; then it sinks with both
    // arms swept back behind it, and goes)
    const MK = [[0, null], [0.4, 'moonSpread', E.outQuad], [1, 'moonSink', E.inQuad]];
    let e = 0, from = null;
    while (e < 0.42) {
      e += yield;
      const k = Math.min(1, e / 0.42);
      B.dim = Math.max(B.dim || 0, E.inOutQuad(k));
      if (!from) from = b.p.slice();
      const p = poseAt(b, MK, k, from);
      b.liveRate = 30;
      p[1] += 3 * k;
    }
    // and up out of sight
    G.fx.dust(b.x, FLOOR, 6, { speed: [60, 260], size: [7, 13], up: 30 });
    G.audio.play('whoosh');
    b.pose = 'air';
    const y0 = b.y;
    e = 0;
    while (e < 0.26) { e += yield; const k = Math.min(1, e / 0.26); b.y = G.lerp(y0, -160, E.outQuad(k)); }
    b.hidden = true;
    // the crescents: the first over the wall it is furthest from the hero on
    const n = ph === 1 ? 1 : ph === 2 ? 2 : 3;
    const speed = ph === 3 ? 470 : 430;
    let dir = P.x < 640 ? -1 : 1, lastHigh = null, lastWall = null;
    const walls = [];
    for (let i = 0; i < n; i++) {
      const high = i === 0 ? K.chance(0.5, 'high') : (ph === 3 ? K.chance(0.5, 'high' + i) : !lastHigh);
      let g0 = high ? GAP_HI : GAP_LO, g1 = g0;
      if (ph === 3 && i > 0) g1 = high ? GAP_LO : GAP_HI; // in the last phase the hollow drifts as it comes
      const form = (i === 0 ? 0.95 : 0.75) * T;
      const w = moonWall(dir, g0, g1, form, speed);
      walls.push(w);
      lastHigh = high; lastWall = w;
      yield* wait(form);
      w.launch();
      if (i < n - 1) {
        // the next gathers over the other wall once this one is well across
        dir = -dir;
        while (!w.dead && Math.abs(w.fx - (w.dir > 0 ? WL : WR)) < (WR - WL) * 0.5) yield;
      }
    }
    while (!lastWall.dead && lastWall.end < 0) yield;
    yield* wait(0.08);
    // it comes down where the last one ended, and kneels in the dark
    const lx = lastWall.dir > 0 ? WR - 90 : WL + 90;
    appear(lx, -80, 'dive');
    b.face = P.x > b.x ? 1 : -1;
    G.audio.play('streak');
    yield* tween(b, { y: FLOOR }, 0.2, E.inQuad);
    G.fx.thud(b.x, FLOOR, 0.9, { noCrack: true }); G.audio.play('land'); G.fx.shake(6);
    b.pose = 'kneel'; b.exposed = true; b.sq = 0.18;
    B.moon = false;
    yield* wait(ph === 1 ? 1.6 : ph === 2 ? 1.45 : 1.3);
    b.exposed = false;
  }

  // ------------------------------------------------------------------ corrupted (corrupt.js)
  // Two attacks only the corrupted Veil uses, in the void's black and crimson.

  // The ground under a point: the floor, or the top of a platform below it.
  function groundAt(x, y) {
    let gy = FLOOR;
    for (const pl of G.arena.platforms) {
      if (!pl.gone && pl.rise > 0.05 && x >= pl.x - 9 && x <= pl.x + pl.w + 9 && y <= pl.y + 4) gy = Math.min(gy, pl.y);
    }
    return gy;
  }

  // Where the hero's own blade reached in a swing (measured as player.js measures it).
  function swingBox(s) {
    const a = s.atk, r = G.hero().reach || 1, dir = a.dir || s.f;
    if (a.kind === 'up') { const hh = (a.heavy ? 57 : 46) * r; return { cx: s.x + dir * 6, cy: s.y - 34 - hh, hw: 42 * (0.6 + 0.4 * r), hh }; }
    if (a.kind === 'down') return { cx: s.x, cy: s.y - 28 + 42 * r, hw: 36, hh: 42 * r };
    const hw = ((a.heavy ? 66 : 48) + (a.thrust ? 22 : 0)) * r;
    return { cx: s.x + dir * hw, cy: s.y - 26, hw, hh: a.thrust ? 32 : a.heavy ? 48 : 36 };
  }
  // a melee swing in the part of it that cuts (a bow's shot and Eos's draw are carried by the body)
  const meleeLive = (a) => !!a && a.kind !== 'shot' && a.kind !== 'draw' && a.t >= a.a0 && a.t <= a.a1;
  // one recorded moment of the hero, as G.drawHero wants it
  const heroState = (q, y) => ({ x: q.x, y: y == null ? q.y : y, facing: q.f, vx: q.vx, vy: q.vy, onGround: q.g, squash: q.sq || 0, runT: q.rt || 0, atk: q.atk, primed: false, hurtFlash: 0, dash: q.d });

  // A past self: the hero, torn out of their own shadow. It records everything the hero does and does
  // it again `delay` seconds later, in the same place: each step, each jump, each dash, and each swing
  // of their own weapon, which cuts as theirs would. Where the hero steps the floor is stained with
  // void, and where they leap motes hang in the air; both last exactly until the past self gets there.
  function pastSelf(delay, dur, gy) {
    const P = G.player;
    return H.add({
      kind: 'pastself', delay, dur, gy, rec: [], i: 0, s: null, x: P.x, y: P.y, live: false, fade: 1,
      prints: [], lastPx: null, moteT: 0,
      update(dt) {
        const rec = this.rec, a = P.atk, C = G.corrupt.COL;
        rec.push({ t: this.t, x: P.x, y: P.y, f: P.facing || 1, vx: P.vx, vy: P.vy, g: P.onGround, d: P.dashT > 0, rt: P.runT, sq: P.squash, atk: a ? Object.assign({}, a, { hit: null }) : null });
        if (this.t <= this.dur) {
          if (P.onGround) {
            if (this.lastPx == null || Math.abs(P.x - this.lastPx) > 30) { this.lastPx = P.x; this.prints.push({ x: P.x, y: P.y, t: this.t, end: -1 }); }
          } else {
            this.lastPx = null;
            this.moteT -= dt;
            if (this.moteT <= 0) {
              this.moteT = 0.045;
              G.fx.spawn({ x: P.x + G.rand(-6, 6), y: P.y - G.rand(10, 40), vx: G.rand(-8, 8), vy: G.rand(-8, 8), life: this.delay * 0.95, size: G.rand(2.5, 4.5), color: C.blood });
            }
          }
        }
        // where the hero was, `delay` ago
        const r = this.t - this.delay;
        while (this.i < rec.length - 1 && rec[this.i + 1].t <= r) this.i++;
        const s = this.s = rec[this.i];
        this.live = r >= 0;
        this.x = s.x; this.y = s.y; this.srcX = s.x;
        if (this.i > 240) { rec.splice(0, this.i); this.i = 0; }
        for (const p of this.prints) if (p.end < 0 && r >= p.t) p.end = this.t;
        this.prints = this.prints.filter((p) => p.end < 0 || this.t - p.end < 0.25);
        const left = this.delay + this.dur - this.t;
        this.fade = G.clamp(left / 0.35, 0, 1);
        if (this.live && Math.random() < dt * 30 * this.fade) G.fx.spawn({ x: s.x + G.rand(-9, 9), y: s.y - G.rand(6, 54), vx: G.rand(-20, 20), vy: -G.rand(20, 70), life: G.rand(0.3, 0.6), size: G.rand(2, 4), color: C.blood });
        if (left <= 0) {
          // spent: it comes apart and runs home into the hero's feet
          this.dead = true;
          G.audio.play('pull');
          for (let k = 0; k < 16; k++) {
            const tt = G.rand(0.22, 0.4), sx = s.x + G.rand(-10, 10), sy = s.y - G.rand(6, 54);
            G.fx.spawn({ x: sx, y: sy, vx: (P.x - sx) / tt, vy: (P.y - 6 - sy) / tt, life: tt, size: G.rand(2, 4), color: C.blood });
          }
        }
      },
      hits(Pl) {
        if (!this.live || this.t < this.delay + 0.2 || this.fade < 0.75) return false;
        const s = this.s;
        if (G.rectsOverlap(Pl.box(), { cx: s.x, cy: s.y - 22, hw: 12, hh: 22 })) return true;
        return meleeLive(s.atk) && G.rectsOverlap(Pl.box(), swingBox(s));
      },
      // (tests) the stretch of floor it will cover in the next moment, at the hero's height
      danger(Pl) {
        const r = this.t - this.delay, rec = this.rec, W = 0.45;
        if (r < -W || this.fade < 0.75) return null;
        let lo = 1e9, hi = -1e9, tHit = 9;
        for (let j = this.i; j < rec.length && rec[j].t <= r + W; j++) {
          const q = rec[j];
          if (Math.abs(q.y - Pl.y) > 64) continue;
          let a = q.x, z = q.x;
          if (meleeLive(q.atk)) { const sb = swingBox(q); a = Math.min(a, sb.cx - sb.hw); z = Math.max(z, sb.cx + sb.hw); }
          lo = Math.min(lo, a); hi = Math.max(hi, z);
          if (tHit === 9 && Pl.x > a - 30 && Pl.x < z + 30) tHit = Math.max(0, q.t - r, this.delay + 0.2 - this.t);
        }
        if (lo > hi) return null;
        return [(lo + hi) / 2, (hi - lo) / 2 + 30, tHit === 9 ? 0.5 : tHit];
      },
      draw(ctx) {
        const s = this.s, C = G.corrupt.COL;
        if (!s) return;
        // the stains it has still to walk over
        for (const p of this.prints) {
          const k = Math.min(1, (this.t - p.t) / 0.15) * (p.end >= 0 ? Math.max(0, 1 - (this.t - p.end) / 0.25) : 1);
          ctx.fillStyle = G.rgba(C.void, 0.85 * k);
          ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 10, 2.6, 0, 0, G.TAU); ctx.fill();
          ctx.strokeStyle = G.rgba(C.blood, 0.6 * k); ctx.lineWidth = 1; ctx.stroke();
        }
        if (!this.live) {
          // tearing loose: it climbs out of a pool of void where the hero stood (an older self waits
          // in the pool until the first is out)
          const q = this.rec[0], climb = Math.min(1.2, this.delay), k = G.clamp((this.t - (this.delay - climb)) / climb, 0, 1);
          const e = E.outCubic(k), pr = 30 * Math.min(1, this.t * 4);
          ctx.fillStyle = G.rgba(C.void, 0.92);
          ctx.beginPath(); ctx.ellipse(q.x, this.gy + 1, pr, pr * 0.2, 0, 0, G.TAU); ctx.fill();
          ctx.strokeStyle = G.rgba(C.blood, 0.75); ctx.lineWidth = 1.5; ctx.stroke();
          voidHero(ctx, heroState(q, G.lerp(this.gy + 84, q.y, e)), 0.35 + 0.65 * k, this.gy + 1);
          return;
        }
        D.glow(ctx, C.blood, s.x, s.y - 34, 46, 0.32 * this.fade);
        voidHero(ctx, heroState(s), this.fade);
        if (meleeLive(s.atk)) {
          // its swing: the hero's own, in blood
          const a = s.atk, dir = a.dir || s.f, rr = 50 * (G.hero().reach || 1) * (a.heavy ? 1.2 : 1);
          const k = (a.t - a.a0) / Math.max(0.01, a.a1 - a.a0);
          let a0 = -1.3, a1 = 0.9;
          if (a.kind === 'up') { a0 = -2.7; a1 = -0.4; } else if (a.kind === 'down') { a0 = 0.4; a1 = 2.7; }
          if (dir < 0) { const m = Math.PI - a1; a1 = Math.PI - a0; a0 = m; }
          const head = dir > 0 ? G.lerp(a0, a1, Math.min(1, k * 1.4)) : G.lerp(a1, a0, Math.min(1, k * 1.4));
          ctx.lineCap = 'round';
          ctx.strokeStyle = G.rgba(C.blood, 0.75 * this.fade); ctx.lineWidth = 8;
          ctx.beginPath(); ctx.arc(s.x, s.y - 30, rr, dir > 0 ? a0 : head, dir > 0 ? head : a1); ctx.stroke();
          ctx.strokeStyle = G.rgba(C.hot, 0.85 * this.fade); ctx.lineWidth = 2;
          ctx.stroke();
        }
      },
    });
  }

  // Past self. She comes down beside the hero, raises her blade and drives it from one knee into the
  // hero's shadow on the floor, which is drawn out to the point. When she pulls it free the shadow
  // tears loose and climbs up as the hero, black and rimmed in blood, and does everything the hero
  // does about a second behind. She leaves it to them, and from far off throws a single knife now and
  // then at where the hero stands, so standing still is no answer either. In the last phase a second,
  // older self climbs out after the first.
  // (Unlike the echo, it is the hero's own body and blade, she keeps up the pressure while it runs,
  // and it leaves no line to read: the hero has to remember where they have been.)
  function* atkPastself() {
    const b = B.body, P = G.player, T = K.T(), C = G.corrupt.COL;
    yield* vanish();
    yield* wait(0.22);
    // down beside the hero, on whatever they stand on
    const gy = groundAt(P.x, P.y);
    let lo = WL + 40, hi = WR - 40;
    if (gy < FLOOR && P.plat) { lo = P.plat.x + 14; hi = P.plat.x + P.plat.w - 14; }
    let x = P.x - (P.facing || 1) * 88;
    if (x < lo || x > hi) x = P.x + (P.facing || 1) * 88;
    appear(G.clamp(x, lo, hi), gy, 'crouch');
    b.face = P.x >= b.x ? 1 : -1;
    // the blade goes up and is held there...
    yield* wait(0.1);
    b.pose = 'pinUp';
    G.audio.play('charge', { dur: 0.4 * T });
    yield* wait(0.12);
    G.fx.glint(b.x + b.face * 17, b.y - 80, 22, C.hot, 0.22); G.audio.play('glint');
    yield* wait(0.26 * T);
    // ...and comes down, from one knee, into the hero's shadow
    b.pose = 'pin';
    yield* wait(0.06);
    const tipX = b.x + b.face * 34;
    G.audio.play('tink'); G.audio.play('slam');
    G.fx.shake(6); G.fx.stop(0.05);
    G.fx.burst(tipX, gy - 2, { n: 12, color: C.blood, speed: [120, 420], angle: -Math.PI / 2, spread: 1.7, life: [0.15, 0.4], kind: 'spark', size: [1.6, 3], grav: 900 });
    G.fx.dust(tipX, gy, 4, { speed: [30, 160], size: [6, 11], up: 30 });
    G.fx.ripple(tipX, gy - 12, 80, 0.3, 0.5);
    B.pinned = { gy, tipX, k: 0 };
    yield* tween(B.pinned, { k: 1 }, 0.12, E.outCubic);
    yield* wait(0.42 * T);
    // she pulls the blade free and the shadow tears loose
    const sx = P.x, sgy = groundAt(P.x, P.y);
    G.audio.play('pull'); G.audio.play('whoosh');
    G.fx.shake(7);
    for (let i = 0; i <= 6; i++) G.fx.burst(G.lerp(sx, tipX, i / 6), gy - 2, { n: 2, color: C.blood, speed: [60, 220], angle: -Math.PI / 2, spread: 1.2, life: [0.2, 0.45], kind: 'spark', size: [1.4, 2.6], grav: 500 });
    B.pinned = null;
    const dur = B.phase === 1 ? 4.2 : B.phase === 2 ? 4.8 : 5.2, t0 = B.t;
    pastSelf(1.2, dur, sgy);
    if (B.phase === 3) pastSelf(2.4, dur - 1.2, sgy);
    // a spring back off the blade, and she is gone to the far side
    const x0 = b.x, x1 = G.clamp(b.x - b.face * 64, WL + 40, WR - 40), y0 = b.y;
    b.pose = 'air';
    let e = 0;
    while (e < 0.26) { e += yield; const k = Math.min(1, e / 0.26); b.x = G.lerp(x0, x1, k); b.y = y0 - 4 * 40 * k * (1 - k); }
    b.y = y0; b.pose = 'crouch';
    yield* wait(0.08);
    yield* vanish();
    yield* wait(0.3);
    appear(P.x < 640 ? WR - 110 : WL + 110, FLOOR, 'crouch');
    // now and then a single knife lobbed high onto where the hero stands: light, but it says do not
    // stand still
    const end = 1.2 + dur, gap = B.phase === 1 ? 1.3 : B.phase === 2 ? 1.15 : 1.0, tint = { boss: C.blood, hot: C.hot };
    while (B.t - t0 < end - 0.9) {
      b.face = P.x > b.x ? 1 : -1; b.pose = 'crouch';
      const wind = 0.34 * T;
      yield* wait(wind - 0.12);
      G.fx.glint(b.x + b.face * 18, b.y - 58, 16, C.hot, 0.16);
      yield* wait(0.12);
      b.face = P.x > b.x ? 1 : -1; b.pose = 'throw';
      G.audio.play('arrow');
      const ox = b.x + b.face * 22, oy = b.y - 64, tf = 0.72, g = 1500, lx = G.clamp(P.x, WL + 30, WR - 30);
      H.orb(ox, oy, (lx - ox) / tf, (FLOOR - 14 - oy) / tf - 0.5 * g * tf, { r: 8, grav: g, blade: true, life: 2, tint });
      yield* wait(Math.max(0.3, gap - wind));
    }
    b.pose = 'sheathe';
    while (B.t - t0 < end + 0.1) yield;
  }

  // The thread and its pin: a black kunai driven into the floor beside the hero, and a thread from
  // it that lashes round their waist. While it holds they can go no further from the pin than its
  // length; at the end of it the thread pulls taut, and in the air it swings them round the pin.
  // A dash through the instant it lashes slips it. Striking the pin cuts it.
  function threadPin(fromX, fromY, px, flyT) {
    const P = G.player;
    return H.add({
      kind: 'veilpin', x: px, y: FLOOR - 16, r: 15, fx0: fromX, fy0: fromY, flyT,
      state: 'fly', slashable: false, len: 0, tieK: 0, missed: false, taut: 0, twangT: 0, endT: 0, fadeK: 1, ringK: 0,
      update(dt) {
        const C = G.corrupt.COL;
        if (this.state === 'fly') {
          if (this.t >= this.flyT) {
            this.state = 'whip'; this.t0 = this.t;
            G.audio.play('tink'); G.fx.shake(4);
            G.fx.burst(this.x, FLOOR - 2, { n: 10, color: C.blood, speed: [100, 380], angle: -Math.PI / 2, spread: 1.6, life: [0.15, 0.35], kind: 'spark', size: [1.6, 3], grav: 900 });
            G.fx.dust(this.x, FLOOR, 3, { speed: [20, 120], size: [5, 9], up: 30 });
          }
        } else if (this.state === 'whip') {
          this.tieK = Math.min(1, (this.t - this.t0) / 0.1);
          if (P.iframes > 0) this.missed = true;
          if (this.tieK >= 1) {
            if (this.missed) { this.state = 'loose'; this.endT = this.t; this.mx = P.x; G.audio.play('whoosh'); }
            else {
              this.state = 'tied'; this.slashable = true;
              this.len = Math.max(250, G.dist(this.x, this.y, P.x, P.y - 24) + 70);
              G.audio.play('pull'); G.fx.shake(5);
              G.fx.ring(P.x, P.y - 24, { r0: 34, r1: 12, life: 0.25, color: C.blood, width: 3 });
            }
          }
        } else if (this.state === 'tied') {
          this.ringK = Math.min(1, this.ringK + dt / 0.3);
          this.leash();
        } else {
          // slipped, cut or let go: it goes slack and burns away
          this.fadeK = Math.max(0, 1 - (this.t - this.endT) / 0.45);
          this.ringK = Math.max(0, this.ringK - dt / 0.25);
          if (this.fadeK <= 0) this.dead = true;
        }
        this.twangT = Math.max(0, this.twangT - dt);
        this.taut = Math.max(0, this.taut - dt * 4);
      },
      leash() {
        const C = G.corrupt.COL, L = this.len, dx = P.x - this.x, dy = (P.y - 24) - this.y, d = Math.hypot(dx, dy);
        if (d <= L) return;
        if (P.onGround) {
          // standing: it holds them where they are along the ground
          const room = Math.sqrt(Math.max(0, L * L - dy * dy));
          if (room < 2) { P.onGround = false; P.plat = null; return; }
          P.x = this.x + Math.sign(dx) * room;
          if (P.vx * dx > 0) P.vx = 0;
        } else {
          // in the air: back onto the circle; what carried them outward is lost, so they swing
          const nx = dx / d, ny = dy / d;
          P.x = this.x + nx * L; P.y = this.y + ny * L + 24;
          const vn = P.vx * nx + P.vy * ny;
          if (vn > 0) { P.vx -= vn * nx; P.vy -= vn * ny; }
        }
        this.taut = 1;
        if (this.twangT <= 0) {
          this.twangT = 0.4;
          G.audio.play('tink');
          G.fx.burst(P.x, P.y - 24, { n: 4, color: C.blood, speed: [60, 200], life: [0.1, 0.25], kind: 'spark', size: [1.2, 2.2] });
        }
      },
      release() { if (this.state === 'tied') { this.state = 'done'; this.endT = this.t; this.slashable = false; this.lx = P.x; this.ly = P.y - 24; } },
      slash() {
        if (this.state !== 'tied') return;
        const C = G.corrupt.COL;
        this.state = 'cut'; this.slashable = false; this.endT = this.t; this.lx = P.x; this.ly = P.y - 24;
        G.audio.play('blade'); G.audio.play('tink');
        G.fx.stop(0.04); G.fx.shake(6);
        G.fx.glint(this.x, this.y - 6, 30, C.hot, 0.22);
        G.fx.burst(this.x, this.y, { n: 16, color: C.blood, speed: [140, 520], life: [0.15, 0.4], kind: 'spark', size: [1.6, 3.2], grav: 700 });
        G.fx.shards(this.x, this.y, 4, C.blood, { speed: [100, 320], size: [2, 4] });
      },
      // (tests) the ground beyond the thread's reach on the hero's side of the pin cannot be reached
      danger(Pl) {
        if (this.state !== 'tied') return null;
        const sd = Math.sign(Pl.x - this.x) || 1, dy = (Pl.y - 24) - this.y;
        const room = Math.sqrt(Math.max(0, this.len * this.len - dy * dy));
        const edge = this.x + sd * (room - 6), far = sd > 0 ? G.W + 400 : -400;
        return [(edge + far) / 2, Math.abs(far - edge) / 2, 9];
      },
      draw(ctx) {
        const C = G.corrupt.COL, a = this.fadeK, hx = this.x, hy = FLOOR - 20;
        ctx.save();
        ctx.lineCap = 'round';
        if (this.state === 'fly') {
          const k = Math.min(1, this.t / this.flyT), x = G.lerp(this.fx0, hx, k), y = G.lerp(this.fy0, hy, k);
          // the thread paid out behind it from her hands
          ctx.strokeStyle = G.rgba(C.blood, 0.55); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(this.fx0, this.fy0); ctx.lineTo(x, y); ctx.stroke();
          dagger(ctx, x, y, Math.atan2(hy - this.fy0, hx - this.fx0), C.blood, C.hot, false);
          ctx.restore();
          return;
        }
        ctx.globalAlpha = a;
        // the reach of the thread: a faint arc over the floor
        if (this.ringK > 0.01) {
          ctx.strokeStyle = G.rgba(C.blood, (0.24 + 0.36 * this.taut) * this.ringK); ctx.lineWidth = 2;
          ctx.setLineDash([6, 9]); ctx.lineDashOffset = this.t * 20;
          ctx.beginPath(); ctx.arc(hx, this.y, this.len * (0.92 + 0.08 * this.ringK), Math.PI, G.TAU); ctx.stroke();
          ctx.setLineDash([]);
        }
        // the thread
        ctx.globalCompositeOperation = 'lighter';
        const line = (x0, y0, x1, y1, sag, w) => {
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
          for (const [lw, col, al] of [[w * 3, C.blood, 0.35], [w, C.blood, 0.9], [w * 0.45, C.hot, 0.8]]) {
            ctx.strokeStyle = G.rgba(col, al); ctx.lineWidth = lw;
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
          }
        };
        if (this.state === 'whip') {
          const tx = P.x, ty = P.y - 24, k = this.tieK;
          line(hx, hy, G.lerp(hx, tx, k), G.lerp(hy, ty, k), 0, 1.6);
        } else if (this.state === 'tied') {
          const tx = P.x, ty = P.y - 24, d = G.dist(hx, hy, tx, ty), slack = Math.max(0, this.len - d);
          const jit = this.taut * Math.sin(this.t * 90) * 1.6;
          line(hx, hy, tx, ty, Math.min(70, slack * 0.45) + jit, 1.4 + 0.8 * this.taut);
          // the loop round the hero's waist
          ctx.strokeStyle = G.rgba(C.blood, 0.8); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(tx, ty, 13, 4.5, 0, 0, G.TAU); ctx.stroke();
        } else if (this.state === 'loose') {
          // slipped: it lashes on past and falls along the floor
          const k = Math.min(1, (this.t - this.endT) / 0.2);
          line(hx, hy, G.lerp(this.mx, hx + (this.mx - hx) * 1.3, k), G.lerp(FLOOR - 40, FLOOR - 2, k), 10 * (1 - k), 1.2);
        } else {
          // cut or let go: the thread drops slack from where it held the hero
          const k = Math.min(1, (this.t - this.endT) / 0.3);
          line(hx, hy, this.lx, G.lerp(this.ly, FLOOR - 2, k * k), 40 * k, 1.2);
        }
        ctx.globalCompositeOperation = 'source-over';
        // the pin, standing in the floor
        dagger(ctx, hx, hy, Math.PI / 2, C.blood, C.hot, false);
        ctx.restore();
      },
    });
  }

  // Threads. She draws both hands back with the fingers spread, and strings glint between them.
  // Then a pin goes into the floor beside the hero and its thread lashes round them, and she cuts
  // across the circle it allows: from wherever she is, through the hero, to the far side of it,
  // over and over, each cut ending where the next begins. Cut the pin and the thread whips back and
  // throws her down; or stay inside and step off each line (jump the flat ones). A dash as the thread
  // lashes slips it altogether.
  function* atkThreads() {
    // (its cuts burn crimson rather than white: a band of blood with a pale heart, not a flash)
    const b = B.body, P = G.player, T = K.T(), C = G.corrupt.COL, tint = { boss: C.blood, hot: '255,140,170' };
    yield* vanish();
    yield* wait(0.22);
    appear(P.x < 640 ? Math.min(WR - 110, P.x + 430) : Math.max(WL + 110, P.x - 430), FLOOR, 'crouch');
    yield* wait(0.14);
    // the tell
    b.face = P.x > b.x ? 1 : -1;
    b.pose = 'strings';
    G.audio.play('pull');
    const tele = 0.66 * T;
    yield* par(tween(B, { strings: 1 }, 0.3, E.outCubic), wait(tele * 0.6));
    G.audio.play('glint');
    for (const i of [7, 10]) G.fx.glint(b.x + b.face * b.p[i], b.y + b.p[i + 1], 16, C.hot, 0.2);
    yield* wait(tele * 0.4);
    // let go: a pin into the floor beside the hero, towards the middle of the arena
    b.face = P.x > b.x ? 1 : -1;
    b.pose = 'cast';
    G.audio.play('arrowHeavy'); G.fx.shake(3);
    const px = G.clamp(P.x + (P.x < 640 ? 1 : -1) * 110, WL + 70, WR - 70);
    const pin = threadPin(b.x + b.face * 34, b.y - 56, px, 0.16);
    yield* par(tween(B, { strings: 0 }, 0.22, E.inQuad), wait(0.2));
    while (pin.state === 'fly' || pin.state === 'whip') yield;
    if (pin.state !== 'tied') {
      // slipped: she is caught with her hands out
      yield* wait(0.25);
      b.pose = 'skid'; b.exposed = true;
      yield* wait(0.9);
      b.exposed = false;
      return;
    }
    yield* wait(0.18);
    // the cuts: the first from where she stands, then each from a spring to the edge of the circle;
    // the higher up the edge, the steeper the cut. From the floor it runs flat.
    const rise = B.phase === 3 ? [null, 1.25, 0, 0.9] : [null, 1.05, 1.3];
    const n = B.phase === 3 ? 3 : 2; // (kept short: the thread is the pressure, not the number of cuts)
    for (let i = 0; i < n && pin.state === 'tied'; i++) yield* threadCut(pin, i ? (rise[i] == null ? 0.6 : rise[i]) : null, (i ? 0.46 : 0.6) * T, tint);
    if (pin.state === 'tied') pin.release();
    if (b.y < FLOOR - 1) {
      b.pose = 'air';
      yield* tween(b, { y: FLOOR }, 0.24, E.inQuad);
      G.fx.thud(b.x, FLOOR, 0.6, { noCrack: true }); G.audio.play('land');
    }
    if (pin.state === 'cut') {
      // the thread whips back and takes her off her feet
      G.audio.play('whoosh'); G.audio.play('hit');
      G.fx.cut((pin.x + b.x) / 2, (pin.y + b.y - 40) / 2, Math.atan2(b.y - 40 - pin.y, b.x - pin.x), Math.max(40, G.dist(pin.x, pin.y, b.x, b.y - 40)), 4, C.blood, C.hot, 0.3);
      b.kx = G.sign(b.x - pin.x) * 14; b.recV = G.sign(b.x - pin.x) * 4;
      b.pose = 'kneel'; b.exposed = true;
      G.fx.dust(b.x, FLOOR, 5, { speed: [40, 200], size: [6, 12], up: 40 });
      yield* wait(1.2);
      b.exposed = false;
    } else {
      b.pose = 'skid';
      yield* wait(0.6);
    }
  }

  // One cut of the threads. If asked to, she first springs up the edge of the circle; then she
  // hangs a moment, her blade glints, and she goes through the hero to the far edge of the circle.
  function* threadCut(pin, rise, tele, tint) {
    const b = B.body, P = G.player, C = G.corrupt.COL, R = pin.len + 34;
    if (rise != null) {
      // to the edge of the circle on the far side of the pin from the hero, as high as asked
      const sd = -(G.sign(P.x - pin.x) || 1);
      const tx = G.clamp(pin.x + sd * R * Math.cos(rise), WL + 40, WR - 40), ty = Math.min(FLOOR, pin.y - R * Math.sin(rise) + 40);
      const x0 = b.x, y0 = b.y, dur = 0.2 + Math.hypot(tx - x0, ty - y0) / 3000, arc = ty >= FLOOR - 1 ? 60 : 30;
      if (b.y >= FLOOR - 1) { b.pose = 'crouch'; yield* wait(0.06); G.fx.dust(b.x, FLOOR, 3, { speed: [30, 140], size: [5, 9], up: 30 }); }
      b.pose = 'air'; b.face = G.sign(tx - x0) || b.face; G.audio.play('whoosh');
      let e = 0;
      while (e < dur) {
        e += yield;
        const k = Math.min(1, e / dur), q = E.outQuad(k);
        b.x = G.lerp(x0, tx, q); b.y = G.lerp(y0, ty, q) - 4 * arc * k * (1 - k);
      }
      b.x = tx; b.y = ty;
      if (ty >= FLOOR - 1) { b.pose = 'crouch'; G.fx.dust(b.x, FLOOR, 3, { speed: [30, 140], size: [5, 9], up: 30 }); }
    }
    // aim through where the hero stands
    const gy = groundAt(P.x, P.y), tx = P.x, ty = (P.onGround ? P.y : gy) - 24;
    const ox = b.x, oy = b.y - 40, ang = Math.atan2(ty - oy, tx - ox), c = Math.cos(ang), s = Math.sin(ang);
    // as far as the far edge of the circle, a wall or the floor
    const fx = ox - pin.x, fy = oy - pin.y, bq = fx * c + fy * s, cq = fx * fx + fy * fy - R * R;
    let len = -bq + Math.sqrt(Math.max(0, bq * bq - cq));
    if (c > 0.01) len = Math.min(len, (WR - 30 - ox) / c); else if (c < -0.01) len = Math.min(len, (WL + 30 - ox) / c);
    if (s > 0.02) len = Math.min(len, (FLOOR - 2 - oy) / s);
    len = Math.max(len, G.dist(ox, oy, tx, ty) + 40);
    b.face = c >= 0 ? 1 : -1; b.pose = b.y < FLOOR - 1 ? 'air' : 'crouch';
    H.beam({ ox, oy, ang, maxLen: len, clip: true, width: 18, tele, lock: 99, active: 0.1, fade: 0.25, sfx: 'blade', shake: 4, tint });
    yield* wait(Math.max(0, tele - 0.18));
    G.fx.glint(b.x + b.face * 20, b.y - 44, 24, C.hot); G.audio.play('glint');
    yield* wait(Math.min(tele, 0.18));
    // the cut: she is the blade, all along the line, her body laid along it
    const tilt = b.face > 0 ? ang : Math.PI - ang;
    POSES.streak = POSES.dash.slice(); POSES.streak[2] = Math.atan2(Math.sin(tilt), Math.cos(tilt));
    b.pose = 'streak'; G.audio.play('streak');
    const x0 = b.x, y0 = b.y, x1 = ox + c * len, y1 = Math.min(FLOOR, oy + s * len + 40), dur = Math.max(0.08, len / 2600);
    let e = 0;
    while (e < dur) {
      e += yield;
      const k = Math.min(1, e / dur);
      b.x = G.lerp(x0, x1, k); b.y = G.lerp(y0, y1, k);
      G.fx.spawn({ x: b.x - c * 20, y: b.y - G.rand(10, 60), vx: -c * G.rand(40, 200), vy: -s * G.rand(40, 200), life: 0.25, size: G.rand(4, 9), color: G.pal().boss });
    }
    G.fx.cut((x0 + x1) / 2, (y0 + y1) / 2 - 40, ang, len, 5, C.blood, C.hot, 0.35);
    if (b.y >= FLOOR - 1) {
      b.y = FLOOR; b.pose = 'skid';
      G.fx.dust(b.x, FLOOR, 4, { dir: b.face, speed: [60, 240], size: [6, 11], up: 30 });
    } else b.pose = 'air';
    yield* wait(0.14);
  }

  // Back to rest. After a cut it flicks both blades clean; after a throw the arm comes home across
  // its waist; after an ambush it tears the blade out of the floor and springs back off it.
  const THROWS = { knives: 1, rain: 1, hunt: 1, flurry: 1, pastself: 1, crescent: 1, snare: 1 };
  B.recover = function* (name) {
    const b = B.body, P = G.player;
    if (b.hidden || b.y < FLOOR - 1) return;
    if (b.pose === 'stuck' || b.pose === 'stuckDeep' || b.pose === 'kneel') {
      G.audio.play('tink');
      G.fx.dust(b.x, FLOOR, 4, { speed: [30, 150], size: [5, 9], up: 40 });
      G.fx.burst(b.x + b.face * 14, FLOOR - 6, { n: 6, color: G.pal().hot, speed: [100, 380], angle: -Math.PI / 2, spread: 1.6, life: [0.15, 0.35], kind: 'spark', size: [1.6, 3], grav: 800 });
      const x0 = b.x, x1 = G.clamp(b.x - b.face * 58, WL + 40, WR - 40);
      b.pose = 'air';
      let e = 0;
      while (e < 0.24) { e += yield; const k = Math.min(1, e / 0.24); b.x = G.lerp(x0, x1, k); b.y = FLOOR - 4 * 34 * k * (1 - k); }
      b.y = FLOOR; b.face = P.x > b.x ? 1 : -1; b.pose = 'crouch';
      yield* wait(0.1);
    } else if (THROWS[name]) {
      b.pose = 'sheathe';
      yield* wait(0.22);
    } else if (name === 'stance') {
      // already sheathed: it straightens out of the crouch and lets the breath go
      b.face = P.x > b.x ? 1 : -1; b.pose = 'idle';
      yield* wait(0.16);
    } else {
      b.face = P.x > b.x ? 1 : -1; b.pose = 'flick';
      G.audio.play('glint');
      yield* wait(0.06);
      for (const s of [1, -1]) G.fx.glint(b.x + b.face * s * 40, b.y - 34, 16, G.pal().hot, 0.18);
      G.fx.burst(b.x + b.face * 40, b.y - 34, { n: 4, color: G.pal().boss, kind: 'spark', angle: b.face > 0 ? 0.6 : Math.PI - 0.6, spread: 0.6, speed: [120, 340], life: [0.1, 0.25], size: [1.2, 2.2], grav: 500 });
      yield* wait(0.18);
    }
    b.pose = 'idle';
    yield* wait(0.1);
  };

  B.ATTACKS = {
    hunt: atkHunt,
    echo: atkEcho,
    stance: atkStance, crescent: atkCrescent,
    skyhook: atkSkyhook, snare: atkSnare, dance: atkDance, moonfall: atkMoonfall,
    lunge: atkLunge, pincer: atkPincer, flurry: atkFlurry, knives: atkKnives, ambush: atkAmbush, backstab: atkBackstab,
    mirror: atkMirror, rain: atkRain, cross: atkCross, cuts: atkCuts, mark: atkMark,
    // corrupted only (corrupt.js)
    pastself: atkPastself, threads: atkThreads,
  };
  B.corruptBags = { 1: ['pastself'], 2: ['pastself', 'threads'], 3: ['pastself', 'threads'] };

  // ------------------------------------------------------------------ scenes
  B.enter = function* () {
    const b = B.body;
    b.x = 900; b.y = -120; b.pose = 'dive'; b.p = POSES.dive.slice(); b.face = -1;
    yield* wait(0.5);
    G.audio.play('streak');
    yield* tween(b, { y: FLOOR }, 0.22, E.inQuad);
    K.impact(b.x, false);
    b.pose = 'stuck';
    yield* wait(0.7);
    b.pose = 'idle';
    yield* wait(0.3);
  };
  // The second phase: it puts the lights out. From here the arena is dark but for the hero's own
  // light, and the Veil is a pair of eyes and whatever glints off its blades. A stagger brings the
  // light back for as long as it lasts.
  // The third phase: it tears the dark away and strings the air with wire, low over the middle of
  // the floor and higher towards the walls. The ground is still open; the sky above it is not.
  const WIRE_Y0 = 250, WIRE_Y1 = 398;
  B.phaseIn = function* (n) {
    const b = B.body;
    if (b.y < FLOOR) b.y = FLOOR;
    b.pose = 'kneel';
    yield* wait(0.8);
    yield* vanish();
    yield* wait(0.25);
    appear(640, FLOOR, 'crouch');
    if (n === 2) {
      // one hand comes up, and closes
      b.pose = 'throw';
      yield* wait(0.45);
      G.audio.play('pull'); G.audio.setIntensity(0);
      B.lights = false;
      G.fx.ring(b.x, b.y - 50, { r0: 900, r1: 10, life: 0.55, color: '10,8,20', width: 60, alpha: 0.9 });
      yield* wait(0.9);
    } else {
      B.lights = true; B.dark = 0;
      G.fx.flash(G.PAL[3].hot, 0.6, 0.5); G.fx.impact(b.x, b.y - 44, 0.08);
      G.fx.shatter(b.x, b.y - 44, '14,10,26', 26, { hot: G.PAL[3].hot, r: 520, r0: 40 });
      yield* wait(0.5);
    }
  };
  B.phaseOut = function* (n) {
    const b = B.body, P = G.player;
    if (n === 2) {
      // eyes open in the dark: it is not alone in here
      const a = clone(b.x - 260, FLOOR, 1, 'crouch'), c = clone(b.x + 260, FLOOR, -1, 'crouch');
      for (const sh of [a, c]) { sh.hurt = false; G.audio.play('tink'); yield* wait(0.3); }
      yield* wait(0.6);
      for (const sh of [a, c]) { sh.gone = true; smoke(sh.x, sh.y - 40); }
    } else {
      // up, and a knife to each wall with a wire behind it
      b.pose = 'air';
      yield* tween(b, { y: WIRE_Y1 + 40 }, 0.24, E.outCubic);
      for (const side of [-1, 1]) {
        b.face = side; b.pose = 'throw';
        const w = { x0: 640, y0: WIRE_Y1, x1: side < 0 ? WL : WR, y1: WIRE_Y0, k: 0, flash: 1 };
        B.wires.push(w);
        G.audio.play('arrowHeavy');
        yield* tween(w, { k: 1 }, 0.16, E.outQuad);
        G.audio.play('tink'); G.fx.shake(5);
        G.fx.burst(w.x1, w.y1, { n: 10, color: G.PAL[3].hot, speed: [100, 420], angle: side < 0 ? 0 : Math.PI, spread: 2, life: [0.15, 0.4], kind: 'spark', size: [2, 3.5] });
        G.fx.glint(w.x1 - side * 6, w.y1, 30, G.PAL[3].hot);
        yield* wait(0.12);
      }
      b.pose = 'dive';
      yield* tween(b, { y: FLOOR }, 0.16, E.inQuad);
      b.pose = 'skid'; b.face = P.x > b.x ? 1 : -1;
      G.fx.thud(b.x, FLOOR, 0.7, { noCrack: true }); G.audio.play('land');
      yield* wait(0.6);
    }
    b.pose = 'idle';
  };

  B.idle = function (dt) {
    const b = B.body, P = G.player;
    if (b.y < FLOOR) b.y = Math.min(FLOOR, b.y + 900 * dt);
    const dx = P.x - b.x;
    if (Math.abs(dx) > 12) b.face = dx > 0 ? 1 : -1;
    // it keeps its distance, circling just out of reach
    const want = G.clamp(P.x - G.sign(dx || 1) * 250, WL + 50, WR - 50);
    if (Math.abs(want - b.x) > 26) { b.x += G.sign(want - b.x) * 240 * dt; b.pose = 'run'; b.moveDir = G.sign(want - b.x); }
    else b.pose = 'idle';
  };

  const TGT = new Array(NP);
  function stepPose(a, dt) {
    // (v2.5c) a pose that carries on into the next by itself (NEXT)
    if (a.pose !== a.poseWas) { a.poseWas = a.pose; a.poseT = 0; } else a.poseT = (a.poseT || 0) + dt;
    const nx = NEXT[a.pose];
    if (nx && a.poseT >= nx[1]) { a.pose = a.poseWas = nx[0]; a.poseT = 0; }
    if (a.pose === 'run') a.runT += dt * 15;
    let target = a.pose === 'run' ? runPose(a.runT) : a.pose === 'live' && a.live ? a.live : (POSES[a.pose] || POSES.idle);
    const br = !a.clone && BREATH[a.pose];
    if (br) {
      // the chest rises and falls; the hands ride it a little
      const s = Math.sin(G.t * br[1]) * br[0];
      for (let i = 0; i < NP; i++) TGT[i] = target[i];
      TGT[1] += s; TGT[0] -= s * 0.012; TGT[8] += s * 0.6; TGT[11] += s * 0.6;
      target = TGT;
    }
    const rate = a.pose === 'live' ? (a.liveRate || 24) : (SNAP[a.pose] || 24);
    const k = 1 - Math.exp(-rate * dt);
    for (let i = 0; i < NP; i++) a.p[i] += (target[i] - a.p[i]) * k;
  }

  B.tick = function (dt) {
    const b = B.body, P = G.player;
    stepPose(b, dt);
    living(b, dt);
    if (b.vis == null) b.vis = 1;
    else if (b.vis < 1 && !b.fading && !b.hidden) b.vis = Math.min(1, b.vis + dt / 0.09);
    // (in its stance the scarf stops lifting and hangs)
    b.calm = G.damp(b.calm || 0, b.still ? 1 : 0, b.still ? 2.5 : 6, dt);
    // the scarf: tied at the back of the neck where the drawing has it, and (v2.5c) carried on by its
    // own weight through the body's starts, stops and landings, so it whips past and falls back
    {
      const o = liveOf(b), T = trunk(b, o), r = b.p[2] + (b.tilt || 0), fxw = K.faceX(b);
      let lx = T.shx - 9 + o.hdx, ly = T.shy - 3 + o.hdy - b.p[1];
      if (r) { const c = Math.cos(r), s = Math.sin(r), x2 = lx * c - ly * s; ly = lx * s + ly * c; lx = x2; }
      const sv = B.scarfV || (B.scarfV = B.scarf.map(() => ({ x: 0, y: 0 }))), L = b.liv, ix = L ? L.ix : 0, iy = L ? L.iy : 0, n = B.scarf.length, keep = Math.exp(-5 * dt);
      for (let i = 1; i < n; i++) {
        const q = i / (n - 1), v = sv[i], pt = B.scarf[i];
        v.x = v.x * keep - ix * 0.35 * q; v.y = v.y * keep - iy * 0.3 * q;
        pt.x += v.x * dt; pt.y += v.y * dt;
      }
      const sg = 30 + 40 * b.calm, sd = 46 * (1 - 0.75 * b.calm);
      D.chainStep(B.scarf, b.x + fxw * lx, b.y + b.p[1] + ly, dt, { seg: 8, grav: sg, drift: sd, face: b.face, wave: 14 * (1 - 0.85 * b.calm), rate: 9 });
      D.hang(B.scarf, Math.atan2(sg, -b.face * sd), { root: 1.1, bend: 0.55, max: 2.1 }); // (v2.9d: no loops)
    }
    for (const a of [b].concat(B.clones)) a.gleam = G.damp(a.gleam || 0, a.still || a.held ? 1 : 0, 6, dt);
    for (const c of B.clones) { stepPose(c, dt); living(c, dt); }
    B.clones = B.clones.filter((c) => !c.gone);
    // the dark: full while the lights are out, thinner while it is staggered, gone when it dies
    if (!B.moon) B.dim = G.damp(B.dim || 0, 0, 2.2, dt);
    const darkTo = B.lights || B.dying || B.dead ? 0 : B.staggered ? 0.25 : 1;
    B.dark = G.damp(B.dark, darkTo, darkTo > B.dark ? 2.2 : 5, dt);
    B.wireHit = Math.max(0, B.wireHit - dt * 3);
    for (const w of B.wires) w.flash = Math.max(0, w.flash - dt * 2.5);
    if (!G.canHurt()) return;
    // the wires: live unless it is staggered, and a dash passes through them
    if (B.wires.length && !B.staggered && P.iframes <= 0 && P.inv <= 0 && !P.ulting) {
      for (const w of B.wires) {
        if (w.k < 1 || G.distPointSeg(P.x, P.y - 22, w.x0, w.y0, w.x1, w.y1) > 17) continue;
        if (P.tryHit(1, P.x + (P.vx >= 0 ? 30 : -30), { kind: 'wire', popVy: 260 })) {
          w.flash = 1; B.wireHit = 1;
          G.audio.play('blade');
          G.fx.cut(P.x, P.y - 22, Math.atan2(w.y1 - w.y0, w.x1 - w.x0), 260, 5, DANGER, '255,240,230', 0.25);
        }
        break;
      }
    }
    const touch = (a) => {
      const f = a.face || 1;
      // (v2.1b) the high draw is laid out on a slant, so only the middle of it is a box it fills
      if (a.pose === 'drawHi') return G.rectsOverlap(P.box(), { cx: a.x + f * 6, cy: a.y - 40, hw: 14, hh: 26 });
      if (a.pose === 'dash') return G.rectsOverlap(P.box(), { cx: a.x, cy: a.y - 28, hw: 26, hh: 26 });
      return G.rectsOverlap(P.box(), { cx: a.x, cy: a.y - 40, hw: 16, hh: 38 });
    };
    if (b.hurt && !b.hidden && touch(b)) P.tryHit(1, b.x, b);
    for (const c of B.clones) if (c.hurt && touch(c)) P.tryHit(1, c.x, c);
  };

  // Where a blow can strike it, or one of its shadows (v2.1b). The box follows the pose as it is drawn:
  // standing, its hood rises over a plain 84-high box; low and lunging (dash, skid, kneel, streak) its
  // head leads well ahead of its feet and its cape trails behind; laid out on the floor after the
  // Ambush it is long and low; diving, it is upside down and its head is below its feet. A fixed box
  // let blows pass through its head in all of those. Each: [forward, behind, top, bottom] from its feet.
  const BODY = {
    stand: [22, 18, 96, 0], low: [48, 32, 80, 0], drawHi: [56, 36, 78, 0], stuck: [60, 32, 56, 0],
    dive: [20, 20, 84, -20], air: [34, 18, 88, 0],
  };
  const BODY_OF = { dash: 'low', skid: 'low', skidOver: 'low', kneel: 'low', streak: 'low', drawHi: 'drawHi', stuck: 'stuck', stuckDeep: 'stuck', dive: 'dive', air: 'air' };
  function bodyAt(a) {
    // (a keyed pose keeps the shape of the pose it stands in for: keys(o.box))
    const [fw, bk, top, bot] = BODY[a.pose === 'live' ? (a.liveBox || 'stand') : (BODY_OF[a.pose] || 'stand')], f = a.face || 1;
    const l = f > 0 ? a.x - bk : a.x - fw, r = f > 0 ? a.x + fw : a.x + bk;
    return { cx: (l + r) / 2, cy: a.y - (top + bot) / 2, hw: (r - l) / 2, hh: (top - bot) / 2 };
  }
  B.extraTargets = function (out) {
    for (const c of B.clones) out.push(Object.assign({ id: c.id, kind: 'extra', ref: c }, bodyAt(c)));
  };

  // ------------------------------------------------------------------ the living figure (v2.5c)
  // Drawing only. Every part on its own spring over where the pose (a.p) puts it: the hips first, then
  // the chest, the head on its neck and the loose point of the hood; each hand, each upper arm and each
  // blade (a blade lags the hand through a fast cut and swings past before it settles); each thigh and
  // ankle (a foot that lifts points its toe, a leg stretched behind rolls up onto the toe, a footfall
  // sinks the hips); the half-cape and the sash as chains of joints, stiff at the shoulder and loose at
  // the hem, thrown about by the body's starts, stops, landings and the blows it takes. a.p is never
  // written: knives, cuts, boxes and the crescent read it. Each figure (the Veil, each shadow, the road's
  // shade) keeps its own springs in a.liv; one with none (an afterimage copy) draws the bare pose.
  const LN_UP = 15, LN_FORE = 15;
  const CAPE_N = 4, CAPE_SEG = [14, 14, 9, 8], CAPE_REST = [2.05, 1.95, 1.75, 1.6];
  const SASH_N = 3, SASH_SEG = [5, 5, 4.5], SASH_REST = [1.75, 1.85, 1.95];
  const CAPE_W = new Array(CAPE_N), SASH_W = new Array(SASH_N);
  const MOVING = { run: 1, dash: 1, streak: 1, drawHi: 1, dive: 1, air: 1, heel: 1 };
  const NO_LIVE = { lean: 0, hip: 0, hipX: 0, br: 0, head: 0, hdx: 0, hdy: 0, tip: 0, tipY: 0, h0x: 0, h0y: 0, h1x: 0, h1y: 0, bl0: 0, bl1: 0, ua0: 0, ua1: 0, th0: 0, th1: 0, an0: 0, an1: 0, cape: null, sash: null };
  const liveOf = (a) => (a.liv && a.liv.o) || NO_LIVE;
  const angNear = (cur, t) => t + Math.round((cur - t) / G.TAU) * G.TAU; // t, unwrapped next to cur
  // the shape a hanging cloth takes with nothing moving it (a cape follows the chest's lean a little)
  function clothRest(out, rest, lean, k) { for (let i = 0; i < out.length; i++) out[i] = rest[i] + lean * k; return out; }
  // where the pose and the springs put the hips and shoulders (the springs and the drawing share these)
  function trunk(a, o) {
    const p = a.p, lean = p[0] + o.lean, hip = p[1] + o.hip;
    return { lean, hip, hipX: o.hipX, shx: o.hipX * 0.5 + Math.sin(lean) * 34, shy: hip - Math.cos(lean) * 34 + o.br, on: Math.abs(p[2]) < 0.3 };
  }
  function armRaw(a, o, T, i) {
    const p = a.p, sx = T.shx + (i ? -4 : 4), sy = T.shy + 2;
    const k = D.ik(sx, sy, p[7 + i * 3] + (i ? o.h1x : o.h0x), p[8 + i * 3] + (i ? o.h1y : o.h0y), LN_UP, LN_FORE, 1);
    return { sx, sy, k, ang: Math.atan2(k.jy - sy, k.jx - sx) };
  }
  function legRaw(a, o, T, i) {
    const p = a.p, rx = (i ? -3 : 3) + T.hipX, ry = T.hip, fx = p[3 + i * 2];
    let fy = p[4 + i * 2], heel = 0;
    // a planted foot the leg cannot reach (stretched out behind) comes up onto its toe
    if (T.on && fy > -1.5) { heel = G.clamp(Math.hypot(fx - rx, fy - ry) - 37.5, 0, 6); fy -= heel; }
    const k = D.ik(rx, ry, fx, fy, 20, 20, -1);
    return { rx, ry, k, heel, lift: Math.max(0, -p[4 + i * 2]), ang: Math.atan2(k.jy - ry, k.jx - rx) };
  }
  // a hand as it is drawn, in the arena (for what the drawing lays in it: the crescent, the gleam, strings)
  function handAt(a, i) {
    const p = a.p, o = liveOf(a), j = i * 3;
    return { x: a.x + a.face * (p[7 + j] + (i ? o.h1x : o.h0x)), y: a.y + p[8 + j] + (i ? o.h1y : o.h0y), an: p[9 + j] + (i ? o.bl1 : o.bl0) };
  }
  let livN = 0;
  function living(a, dt) {
    if (!a.p || dt <= 0) return;
    let L = a.liv;
    if (!L) L = a.liv = { R: D.rig(), cape: {}, sash: {}, vx: 0, vy: 0, skip: true, flash: 0, pose: a.pose, up: [false, false], ix: 0, iy: 0, ph: (livN++) * 2.399, o: Object.assign({}, NO_LIVE) };
    const R = L.R, o = L.o, p = a.p, f = a.face || 1;
    L.ix = 0; L.iy = 0;
    // (out of sight, or just put somewhere: it starts again from the pose, unpushed)
    if (a.hidden || a.gone || a.vis === 0) { L.fresh = true; return; }
    if (L.fresh) { L.fresh = false; R.reset(); L.cape.a = null; L.sash.a = null; L.skip = true; for (const k in NO_LIVE) if (typeof NO_LIVE[k] === 'number') o[k] = 0; }
    // the body's change of speed this frame (a push to every loose part), in its own frame
    const ac = R.accel(a.x, a.y, dt);
    let iF = 0, iY = 0, land = 0;
    if (ac.vx == null) L.skip = true;
    else {
      if (!L.skip) {
        const ix = G.clamp(ac.vx - L.vx, -2400, 2400), iy = G.clamp(ac.vy - L.vy, -2400, 2400);
        iF = ix * f; iY = iy; L.ix = ix; L.iy = iy;
        if (L.vy > 120 && iy < 0) land = Math.min(-iy, L.vy); // (a fall stopped short)
      }
      L.skip = false; L.vx = ac.vx; L.vy = ac.vy;
    }
    const vF = G.clamp(L.vx * f, -1800, 1800), vY = G.clamp(L.vy, -1800, 1800);
    // a blow taken (it rocks away from it), a blow thrown (a pose it snaps into), a foot coming down
    const fl = a.flash || 0, hit = fl > L.flash + 0.4 ? (G.sign(a.kx || 0) * f || -1) : 0;
    L.flash = fl;
    let blow = 0, strike = 0;
    if (a.pose !== L.pose) { L.pose = a.pose; if ((SNAP[a.pose] || 0) >= 44) blow = 1; }
    for (let i = 0; i < 2; i++) {
      const fy = p[4 + i * 2];
      if (L.up[i] && fy > -1.5) { strike++; R.kick('an' + i, -5); }
      if (fy < -3) L.up[i] = true; else if (fy > -1.5) L.up[i] = false;
    }
    const sp = (k, t, w, z) => R.spring(k, t, dt, w, z);
    // the hips: sunk by a landing, a footfall or the weight of its own blow, and back up
    R.kick('hip', land * 0.09 + strike * 22 + blow * 16);
    o.hip = G.clamp(sp('hip', p[1], 26, 0.42) - p[1], -5, 8);
    // standing, the weight goes from foot to foot; the shoulders rise and fall with its breath
    const rest = !MOVING[a.pose] && Math.abs(L.vy) < 30;
    o.hipX = sp('hipX', rest ? Math.sin(G.t * 1.3 + L.ph) * (a.still ? 0.6 : 1.6) : 0, 9, 0.85);
    o.br = -(0.5 + 0.5 * Math.sin(G.t * (a.clone ? 2.4 : 2.8) + L.ph)) * (rest ? 0.9 : 0.4);
    // the chest: thrown back as the body drives off, pitched on as it stops, bowed by a landing
    R.kick('lean', -iF * 0.0045 + land * 0.0012 + hit * 3.5 + blow * 1.2);
    o.lean = G.clamp(sp('lean', p[0], 17, 0.5) - p[0], -0.5, 0.5);
    const lw = p[0] + o.lean;
    // the head rides its neck behind the chest, and nods against a running stride
    R.kick('head', -iF * 0.007 + land * 0.002 + hit * 5);
    const nod = a.pose === 'run' ? Math.sin((a.runT || 0) * 2) * 0.06 : 0;
    o.head = G.clamp(sp('head', lw * 0.55 + nod, 12, 0.4) - lw * 0.55, -0.6, 0.6);
    R.kick('hdx', -iF * 0.012 + hit * 30); R.kick('hdy', land * 0.02 + strike * 10);
    o.hdx = G.clamp(sp('hdx', 0, 16, 0.45), -3.5, 3.5);
    o.hdy = G.clamp(sp('hdy', 0, 18, 0.45), -3, 3);
    // the hood's point, the loosest part of it: streams back at speed, flicks on as it stops
    R.kick('tip', -iF * 0.05 + hit * 40); R.kick('tipY', land * 0.03 - iY * 0.01);
    o.tip = G.clamp(sp('tip', -G.clamp(vF * 0.003, -2, 4), 11, 0.3), -6, 6);
    o.tipY = G.clamp(sp('tipY', -G.clamp(vY * 0.003, -2, 4), 11, 0.3), -5, 5);
    const T = trunk(a, o);
    for (let i = 0; i < 2; i++) {
      const j = i * 3, X = 'h' + i + 'x', Y = 'h' + i + 'y', BL = 'bl' + i, UA = 'ua' + i, TH = 'th' + i, AN = 'an' + i;
      // the hand trails the pose a touch; the blade in it trails the hand and swings past
      R.kick(X, -iF * 0.08 + hit * 40); R.kick(Y, land * 0.05 + strike * 6);
      o[X] = G.clamp(sp(X, p[7 + j], 40, 0.55) - p[7 + j], -7, 7);
      o[Y] = G.clamp(sp(Y, p[8 + j], 40, 0.55) - p[8 + j], -7, 7);
      R.kick(BL, hit * 8 * (i ? -1 : 1));
      o[BL] = G.clamp(sp(BL, p[9 + j], 32, 0.36) - p[9 + j], -0.75, 0.75);
      // the upper arm on its own spring about the shoulder (the forearm takes up the difference)
      const ar = armRaw(a, o, T, i), ua = R.s[UA] ? angNear(R.s[UA].x, ar.ang) : ar.ang;
      o[UA] = G.clamp(sp(UA, ua, 36, 0.5) - ua, -0.28, 0.28);
      // the thigh about the hip (a landing drives the knees forward); the ankle: toe down as the
      // foot lifts, slapped flat as it lands
      R.kick(TH, -land * 0.003 - strike * 0.6);
      const lr = legRaw(a, o, T, i), th = R.s[TH] ? angNear(R.s[TH].x, lr.ang) : lr.ang;
      o[TH] = G.clamp(sp(TH, th, 34, 0.5) - th, -0.35, 0.35);
      o[AN] = G.clamp(sp(AN, lr.lift > 0.5 ? Math.min(0.85, 0.12 + lr.lift * 0.05) : 0, 24, 0.45), -0.5, 1.1);
    }
    // the cape and the sash: streamed back by speed, lifted by a fall, flung by every start and stop
    const str = G.clamp(vF * 0.0009, -0.5, 1.15), fall = G.clamp(vY * 0.0007, -0.25, 0.9), calm = a.still ? 0.3 : 1;
    const push = (iF * 0.004 - land * 0.001 + hit * 4) / dt;
    clothRest(CAPE_W, CAPE_REST, lw, 0.55);
    for (let i = 0; i < CAPE_N; i++) CAPE_W[i] += (str + fall) * (0.5 + 0.5 * i / (CAPE_N - 1)) + Math.sin(G.t * 3.1 + i * 0.9 + L.ph) * 0.05 * calm * (1 + i);
    o.cape = D.angleChain(L.cape, CAPE_W, dt, { w0: 20, w1: 9, z0: 0.5, z1: 0.3, follow: 0.6, push, lo: 0.95, hi: Math.PI + 0.55 }); // (v2.9d: limits)
    clothRest(SASH_W, SASH_REST, lw, 0.3);
    for (let i = 0; i < SASH_N; i++) SASH_W[i] += (str + fall) * 0.6 + Math.sin(G.t * 3.7 + i * 1.1 + L.ph) * 0.07 * calm * (1 + i);
    o.sash = D.angleChain(L.sash, SASH_W, dt, { w0: 16, w1: 8, z0: 0.45, z1: 0.28, follow: 0.65, push: push * 1.2, lo: 0.95, hi: Math.PI + 0.55 });
  }

  // ------------------------------------------------------------------ drawing
  function dagger(ctx, x, y, ang, col, hot, dim) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    if (!dim) D.glow(ctx, col, 14, 0, 18, 0.55);
    ctx.fillStyle = '#05040a'; ctx.fillRect(-7, -1.6, 9, 3.2);
    ctx.fillStyle = dim ? G.rgba(col, 0.5) : G.rgba(hot, 1);
    ctx.beginPath(); ctx.moveTo(2, -2.6); ctx.quadraticCurveTo(16, -5.5, 28, 1.5); ctx.quadraticCurveTo(15, 1.4, 2, 2.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G.rgba(col, dim ? 0.5 : 1); ctx.lineWidth = 1; ctx.stroke();
    ctx.lineWidth = 2.2; D.line(ctx, 1.6, -4.2, 1.6, 4.2);
    ctx.restore();
  }

  function figure(ctx, a, alpha) {
    const p = a.p, pal = G.pal(), col = pal.boss, hot = pal.hot, sh = !!a.clone;
    const o = liveOf(a), T = trunk(a, o), lean = T.lean, hip = T.hip, hipX = T.hipX;
    const body = sh ? '#0a0814' : '#14112a', mid = sh ? '#0e0c1a' : '#262244', plate = sh ? '#131022' : '#3c3668';
    ctx.save();
    ctx.translate(a.x + (a.kx || 0) + (a.jit ? G.rand(-a.jit, a.jit) : 0), a.y);
    K.recoil(ctx, a);
    ctx.scale(K.faceX(a), 1); // (a turn narrows the figure through it: see K.turn; a shade just faces)
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (p[2]) { ctx.translate(0, p[1]); ctx.rotate(p[2]); ctx.translate(0, -p[1]); }
    if (a.tilt) { ctx.translate(0, p[1]); ctx.rotate(a.tilt); ctx.translate(0, -p[1]); } // laid along a line it dashes down (the echo's shadows)
    if (!sh) D.glow(ctx, col, 0, -44, 70, 0.22);

    const shx = T.shx, shy = T.shy; // shoulders
    const leg = (i) => {
      const lr = legRaw(a, o, T, i), k = lr.k, th = lr.ang + (i ? o.th1 : o.th0);
      const jx = lr.rx + Math.cos(th) * 20, jy = lr.ry + Math.sin(th) * 20; // (the knee, where its thigh's spring has it)
      ctx.fillStyle = i ? body : mid;
      D.limb(ctx, lr.rx, lr.ry, jx, jy, 9, 6.5); ctx.fill();
      D.limb(ctx, jx, jy, k.ex, k.ey - 2, 6.5, 4.5); ctx.fill();
      // shin guard and a pointed boot: rolled up onto its toe by a stretched leg, toe pointed as it lifts
      ctx.fillStyle = i ? mid : plate;
      D.poly(ctx, [jx + 2, jy + 1, G.lerp(jx, k.ex, 0.85) + 3.4, G.lerp(jy, k.ey, 0.85), G.lerp(jx, k.ex, 0.85) - 0.5, G.lerp(jy, k.ey, 0.85) + 1]); ctx.fill();
      const fold = Math.min(1, lr.lift / 10);
      ctx.save();
      ctx.translate(k.ex, k.ey); ctx.rotate(Math.asin(Math.min(1, lr.heel / 10.5)) + (i ? o.an1 : o.an0));
      D.poly(ctx, [-3.5, -4, 3, -4.5, 10 - 1.5 * fold, 0.6 * fold, -3.5, 0]); ctx.fill();
      ctx.restore();
    };
    const arm = (i) => {
      const ar = armRaw(a, o, T, i), k = ar.k, ua = ar.ang + (i ? o.ua1 : o.ua0);
      const sx = ar.sx, sy = ar.sy, jx = sx + Math.cos(ua) * LN_UP, jy = sy + Math.sin(ua) * LN_UP; // (the elbow, on its own spring)
      dagger(ctx, k.ex, k.ey, p[9 + i * 3] + (i ? o.bl1 : o.bl0), col, hot, sh);
      ctx.fillStyle = i ? body : mid;
      D.limb(ctx, sx, sy, jx, jy, 7, 5.5); ctx.fill();
      D.limb(ctx, jx, jy, k.ex, k.ey, 5.5, 4.5); ctx.fill();
      // wrapped forearm
      ctx.strokeStyle = G.rgba(col, sh ? 0.25 : 0.6); ctx.lineWidth = 1.2;
      for (const q of [0.45, 0.7]) {
        const wx = G.lerp(jx, k.ex, q), wy = G.lerp(jy, k.ey, q), nx = -(k.ey - jy), ny = k.ex - jx, nl = Math.hypot(nx, ny) || 1;
        D.line(ctx, wx - nx / nl * 2.6, wy - ny / nl * 2.6, wx + nx / nl * 2.6, wy + ny / nl * 2.6);
      }
    };
    // a chain of cloth from (x, y), joint angles in the arena turned into the figure's own frame
    const rot = p[2] + (a.tilt || 0);
    const cloth = (x, y, ang, seg) => {
      const pts = [{ x, y }];
      for (let i = 0; i < ang.length; i++) { const an = ang[i] - rot; x += Math.cos(an) * seg[i]; y += Math.sin(an) * seg[i]; pts.push({ x, y }); }
      return pts;
    };

    // cloak: a torn half-cape hanging from the shoulders, its back edge a chain of springs and its hem
    // hung from the waist after it
    const capeA = o.cape || clothRest(CAPE_W, CAPE_REST, lean, 0.55);
    const cp = cloth(shx - 9, shy + 2, capeA, CAPE_SEG), tip = cp[CAPE_N];
    const wx = 3 + hipX, wy = hip + 2, ha = capeA[2] + 0.08 - rot, fx = wx + Math.cos(ha) * 19, fy = wy + Math.sin(ha) * 19;
    const dx = tip.x - fx, dy = tip.y - fy, dl = Math.hypot(dx, dy) || 1, nx = dy / dl, ny = -dx / dl;
    const cpts = [shx + 5, shy - 1, wx, wy, fx, fy, G.lerp(fx, tip.x, 0.33) - nx * 5, G.lerp(fy, tip.y, 0.33) - ny * 5, G.lerp(fx, tip.x, 0.66) + nx * 10, G.lerp(fy, tip.y, 0.66) + ny * 10];
    for (let i = CAPE_N; i >= 0; i--) cpts.push(cp[i].x, cp[i].y);
    cpts.push(shx - 7, shy - 2);
    ctx.fillStyle = sh ? '#07060e' : '#090812';
    D.poly(ctx, cpts);
    ctx.fill();
    ctx.strokeStyle = G.rgba(col, sh ? 0.3 : 0.45); ctx.lineWidth = 1.1; ctx.stroke();

    leg(1); arm(1);
    // torso: narrow waist, crossed straps; the spine bows as the chest lags (rounded as it pitches on,
    // arched as it is thrown back) and the chest swells with each breath
    const bow = G.clamp(o.lean * 7, -3, 3), chest = -o.br * 0.8;
    const efx = shx + 8 - 5.5 - hipX, efy = shy - hip - 3, efl = Math.hypot(efx, efy) || 1;
    const ebx = -5 + hipX - (shx - 6), eby = hip + 3 - (shy - 3), ebl = Math.hypot(ebx, eby) || 1;
    const fo = 1 - bow * 0.5 + chest, bo = 0.4 + bow;
    ctx.fillStyle = mid;
    D.poly(ctx, [-5 + hipX, hip + 3, 5.5 + hipX, hip + 3,
      (5.5 + hipX + shx + 8) / 2 - efy / efl * fo, (hip + 3 + shy) / 2 + efx / efl * fo,
      shx + 8, shy, shx + 3, shy - 5, shx - 6, shy - 3,
      (shx - 6 - 5 + hipX) / 2 - eby / ebl * bo, (shy - 3 + hip + 3) / 2 + ebx / ebl * bo]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, sh ? 0.3 : 0.75); ctx.lineWidth = 1.5;
    D.line(ctx, -4.5 + hipX, hip - 2, 5 + hipX, hip - 3.5);
    D.line(ctx, G.lerp(-4 + hipX, shx - 4, 0.25), G.lerp(hip, shy, 0.25), G.lerp(5 + hipX, shx + 7, 0.8), G.lerp(hip, shy, 0.8));
    // sash ends, on their own chain
    ctx.fillStyle = G.rgba(col, sh ? 0.3 : 0.85);
    D.ribbon(ctx, cloth(-2.5 + hipX, hip - 2, o.sash || clothRest(SASH_W, SASH_REST, lean, 0.3), SASH_SEG), 3.2, 1.6, 0); ctx.fill();
    leg(0);

    // hood: a sharp cowl with the point swept back, over a mask with two eyes; the head rides its neck
    // on its own spring, and the point of the cowl on another, looser
    const hx = shx + Math.sin(lean) * 9 + 2 + o.hdx, hy = shy - Math.cos(lean) * 9 - 2 + o.hdy;
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(lean * 0.55 + o.head);
    ctx.fillStyle = plate;
    D.poly(ctx, [-8, 7, -10.5, -1, -8, -9, -17 + o.tip, -15 + o.tipY, -3, -13.5, 5, -11.5, 10.5, -4, 10, 4, 6, 9, 0, 6.5]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, sh ? 0.35 : 0.7); ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = '#020206';
    D.poly(ctx, [0, -8.5, 7.5, -6.5, 9.6, -1, 8.6, 4.5, 4.5, 6.5, 0.5, 2]); ctx.fill();
    // mask over the mouth
    ctx.fillStyle = sh ? '#0c0a16' : '#15122a';
    D.poly(ctx, [1.5, 1, 9.3, -0.2, 8.6, 4.5, 4.5, 6.5]); ctx.fill();
    if (!sh || a.hurt) {
      D.glow(ctx, col, 6, -3, 11, 1);
      ctx.fillStyle = G.rgba(hot, 1);
      D.poly(ctx, [2.2, -4.4, 6, -2.6, 2.6, -1.6]); ctx.fill();
      D.poly(ctx, [7.2, -2.8, 9.8, -4.6, 9.4, -1.8]); ctx.fill();
    } else {
      ctx.fillStyle = G.rgba(col, 0.6);
      D.poly(ctx, [2.2, -4.4, 6, -2.6, 2.6, -1.6]); ctx.fill();
    }
    ctx.restore();
    // a pauldron on the leading shoulder
    ctx.fillStyle = plate;
    D.poly(ctx, [shx + 1, shy - 5, shx + 10, shy - 4, shx + 12, shy + 4, shx + 4, shy + 3]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, sh ? 0.3 : 0.8); ctx.lineWidth = 1; ctx.stroke();
    arm(0);

    if (a.flash > 0) D.glow(ctx, '255,255,255', 0, -44, 54, a.flash * 0.3); // (v1.6d: a tint, not a white dome)
    ctx.restore();
  }

  // The hero as the void draws them (a past self): their own silhouette in black, rimmed in blood,
  // with a slit of crimson for eyes. Drawn into a small canvas, then laid down twice.
  let voidCv = null, voidOut = null;
  const VW = 180, VH = 180, VX = 90, VY = 140, VS = 2;
  function voidHero(ctx, s, alpha, clipY) {
    const C = G.corrupt.COL, W = VW * VS, Hh = VH * VS;
    if (!voidCv) {
      voidCv = document.createElement('canvas'); voidCv.width = W; voidCv.height = Hh;
      voidOut = document.createElement('canvas'); voidOut.width = W; voidOut.height = Hh;
    }
    const d = voidCv.getContext('2d'), o = voidOut.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-over'; d.globalAlpha = 1;
    d.clearRect(0, 0, W, Hh);
    d.setTransform(VS, 0, 0, VS, VX * VS, VY * VS);
    G.drawHero(d, G.hero(), Object.assign({}, s, { x: 0, y: 0 }));
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-in';
    d.fillStyle = G.rgba(C.blood, 1); d.fillRect(0, 0, W, Hh);
    // the rim: the silhouette in blood, a hair larger on every side; then the body over it in black
    o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1;
    o.clearRect(0, 0, W, Hh);
    o.globalAlpha = 0.85;
    for (const q of [[-3.4, 0], [3.4, 0], [0, -3.4], [0, 2.8]]) o.drawImage(voidCv, q[0], q[1]);
    d.fillStyle = C.dark; d.fillRect(0, 0, W, Hh);
    o.globalAlpha = 1;
    o.drawImage(voidCv, 0, 0);
    const x = s.x - VX, y = s.y - VY;
    ctx.save();
    if (clipY != null) { ctx.beginPath(); ctx.rect(x - 4, y - 4, VW + 8, clipY - y + 4); ctx.clip(); }
    ctx.globalAlpha = alpha;
    ctx.drawImage(voidOut, x, y, VW, VH);
    // eyes
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = G.rgba(C.hot, 0.9 * alpha);
    ctx.beginPath(); ctx.ellipse(s.x + s.facing * 5, s.y - 58, 3.2, 1.1, s.facing * 0.2, 0, G.TAU); ctx.fill();
    ctx.restore();
  }

  B.drawGround = function (ctx) {
    const b = B.body;
    if (B.dead) return;
    const sh = (a, al) => {
      const k = G.clamp(1 - (FLOOR - a.y) / 300, 0.25, 1);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.42 * k * al) + ')';
      ctx.beginPath(); ctx.ellipse(a.x, FLOOR + 3, 26 * k, 5 * k, 0, 0, G.TAU); ctx.fill();
    };
    if (!b.hidden) sh(b, 1);
    for (const c of B.clones) sh(c, 0.5);
  };

  // Where a figure's eyes are, near enough, for showing them through the dark.
  function eyeAt(a) {
    const o = liveOf(a), T = trunk(a, o);
    return { x: a.x + a.face * (T.shx + 7 + o.hdx), y: a.y + T.shy - 13 + o.hdy };
  }
  let darkCv = null;
  B.drawOver = function (ctx) {
    // (the moonfall's dark is the same dark, a little thinner)
    const dk = Math.max(B.dark, (B.dim || 0) * 0.85);
    if (dk < 0.01 || B.dead) return;
    const b = B.body, P = G.player, pal = G.pal();
    if (!darkCv) { darkCv = document.createElement('canvas'); darkCv.width = 720; darkCv.height = 440; }
    const d = darkCv.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, 720, 440);
    d.fillStyle = 'rgba(2,2,9,' + 0.94 * dk + ')';
    d.fillRect(0, 0, 720, 440);
    // the hero's own light, and a little round anything that is burning
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => {
      const hx = (x - G.cam.x + 80) / 2, hy = (y - G.cam.y + 80) / 2, g = d.createRadialGradient(hx, hy, r * 0.12, hx, hy, r / 2);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(0.6, 'rgba(0,0,0,' + a * 0.55 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.fillRect(hx - r / 2, hy - r / 2, r, r);
    };
    // (r is the radius of the light in the arena's own pixels)
    if (!P.dead) hole(P.x, P.y - 26, 230 + 26 * Math.min(4, G.flow.rank), 1);
    for (const s of G.shots) hole(s.x, s.y, 80, 0.7);
    if (B.staggered && !b.hidden) hole(b.x, b.y - 40, 170, 0.9);
    ctx.drawImage(darkCv, G.cam.x - 80, G.cam.y - 80, 1440, 880);
    // eyes in the dark
    ctx.globalCompositeOperation = 'lighter';
    const eye = (a, col, k) => {
      const e = eyeAt(a);
      D.glow(ctx, col, e.x, e.y, 20, 0.9 * k * B.dark);
      ctx.fillStyle = G.rgba(pal.hot, k * B.dark);
      ctx.beginPath(); ctx.ellipse(e.x, e.y, 4.2, 1.5, a.face * 0.25, 0, G.TAU); ctx.fill();
    };
    if (!b.hidden) eye(b, pal.boss, 1);
    for (const c of B.clones) eye(c, pal.boss, c.hurt ? 1 : 0.7);
    // and whatever its blades catch: the hand on the hilt in its stance, the crescent held back to
    // throw, show through the dark as its eyes do (they are the tell)
    for (const a of b.hidden ? B.clones : [b].concat(B.clones)) {
      if ((a.gleam || 0) < 0.02) continue;
      const k = a.gleam * B.dark * (a.clone ? 0.75 : 1);
      if (a.held) { heldCrescent(ctx, a, k, true); continue; }
      const hd = handAt(a, 0), hx = hd.x, hy = hd.y, an = a.face > 0 ? hd.an : Math.PI - hd.an;
      D.glow(ctx, pal.boss, hx, hy, 18, 0.7 * k);
      ctx.strokeStyle = G.rgba(pal.hot, 0.85 * k); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      D.line(ctx, hx + Math.cos(an) * 3, hy + Math.sin(an) * 3, hx + Math.cos(an) * 26, hy + Math.sin(an) * 26);
    }
    ctx.globalCompositeOperation = 'source-over';
    drawStrings(ctx, B.dark);
  };

  B.draw = function (ctx) {
    if (B.dead) return;
    const b = B.body, col = G.pal().boss;
    // the wires of the third phase: a hair of the warning colour with light running along it
    for (const w of B.wires) {
      const x1 = G.lerp(w.x0, w.x1, w.k), y1 = G.lerp(w.y0, w.y1, w.k), slack = B.staggered || B.dying;
      ctx.lineCap = 'round';
      ctx.strokeStyle = slack ? 'rgba(150,150,170,0.28)' : G.rgba(DANGER, 0.5 + 0.5 * w.flash); ctx.lineWidth = 1.4 + 2.5 * w.flash;
      ctx.beginPath(); ctx.moveTo(w.x0, w.y0);
      if (slack) ctx.quadraticCurveTo((w.x0 + x1) / 2, (w.y0 + y1) / 2 + 46, x1, y1); else ctx.lineTo(x1, y1);
      ctx.stroke();
      if (!slack && w.k >= 1) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const q = (G.t * 0.35 + i / 3) % 1;
          D.glow(ctx, '255,240,230', G.lerp(w.x0, w.x1, q), G.lerp(w.y0, w.y1, q), 9, 0.9 * Math.sin(Math.PI * q));
        }
        ctx.globalCompositeOperation = 'source-over';
        dagger(ctx, w.x1, w.y1, w.x1 < 640 ? Math.PI : 0, col, G.pal().hot, false);
      }
    }
    for (const c of B.clones) {
      const v = c.vis == null ? 1 : c.vis;
      if (v <= 0) continue;
      D.glow(ctx, col, c.x, c.y - 44, 60, 0.25 * v);
      figure(ctx, c, 0.78 * v);
      if (c.held) heldCrescent(ctx, c, 0.8);
    }
    if (b.hidden) return;
    if (B.pinned) {
      // (corrupted) the hero's shadow, drawn out along the floor to her blade and held there
      const C = G.corrupt.COL, pn = B.pinned, k = pn.k, P = G.player, gy = pn.gy;
      const fx = G.lerp(pn.tipX, P.x, k), dir = Math.sign(pn.tipX - fx) || 1, mx = (fx + pn.tipX) / 2, wob = Math.sin(G.t * 40) * 0.8;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const [w, al] of [[12, 0.16], [5, 0.4]]) {
        ctx.strokeStyle = G.rgba(C.blood, al * k); ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(fx - dir * 14, gy + 1); ctx.quadraticCurveTo(mx, gy - 2 + wob, pn.tipX, gy); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = G.rgba(C.void, 0.95);
      ctx.beginPath(); ctx.moveTo(fx - dir * 18, gy - 3);
      ctx.quadraticCurveTo(mx, gy - 5 + wob, pn.tipX, gy - 0.5); ctx.quadraticCurveTo(mx, gy + 6, fx - dir * 18, gy + 5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = G.rgba(C.blood, 0.9); ctx.lineWidth = 1.4; ctx.stroke();
    }
    // the scarf: two glowing tails
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    const n = B.scarf.length;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < n - pass * 3; i++) {
        const k = 1 - i / n, o = pass * (2 + i * 1.3);
        ctx.strokeStyle = G.rgba(col, (0.2 + 0.6 * k) * (pass ? 0.6 : 1) * (b.vis == null ? 1 : b.vis)); ctx.lineWidth = (1.5 + 5 * k) * (pass ? 0.7 : 1);
        D.line(ctx, B.scarf[i - 1].x, B.scarf[i - 1].y + o - (pass ? 1.3 : 0), B.scarf[i].x, B.scarf[i].y + o);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // afterimages while it dashes or dives
    if (b.pose === 'dash' || b.pose === 'dive' || b.pose === 'drawHi') {
      for (let i = 1; i <= 3; i++) {
        const gx = b.pose !== 'dive' ? b.x - b.face * i * 34 : b.x, gy = b.pose === 'dive' ? b.y - i * 40 : b.y;
        figure(ctx, Object.assign({}, b, { x: gx, y: gy, flash: 0, clone: true, hurt: false }), 0.3 - i * 0.07);
      }
    }
    // thinning into smoke or gathering out of it: narrow and tall, and see-through
    const v = b.vis == null ? 1 : b.vis;
    if (v < 1) {
      const e = v * v * (3 - 2 * v), cy = b.y - 40;
      ctx.save(); ctx.translate(b.x, cy); ctx.scale(0.3 + 0.7 * e, 1 + 0.22 * (1 - e)); ctx.translate(-b.x, -cy);
      figure(ctx, b, Math.max(0, e));
      ctx.restore();
    } else figure(ctx, b, 1);
    if (b.held) heldCrescent(ctx, b, v * (b.heldA == null ? 1 : b.heldA));
    drawStrings(ctx, 1);
  };
  // (corrupted) strings between her spread fingers, catching the light; in the dark they show
  // through it, as her eyes do
  function drawStrings(ctx, al) {
    const b = B.body;
    if (B.strings > 0.01 && !b.hidden && al > 0.01) {
      const C = G.corrupt.COL, k = B.strings * al, q0 = handAt(b, 0), q1 = handAt(b, 1);
      const h1x = q0.x, h1y = q0.y, h2x = q1.x, h2y = q1.y;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.2;
      for (let j = 0; j < 4; j++) {
        const o = (j - 1.5) * 4.5;
        ctx.strokeStyle = G.rgba(C.blood, (0.45 + 0.2 * Math.sin(G.t * 9 + j)) * k);
        ctx.beginPath(); ctx.moveTo(h1x, h1y + o); ctx.quadraticCurveTo((h1x + h2x) / 2, (h1y + h2y) / 2 + o * 1.4 + 3, h2x, h2y - o * 0.6); ctx.stroke();
        const q = (G.t * 1.6 + j * 0.29) % 1;
        D.glow(ctx, C.hot, G.lerp(h1x, h2x, q), G.lerp(h1y + o, h2y - o * 0.6, q) + Math.sin(Math.PI * q) * (o * 0.7 + 1.5), 5, 0.8 * k * Math.sin(Math.PI * q));
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  G.makeBoss(B);
  B.bodyBox = function () { return bodyAt(B.body); };
})();
