// Solfall - the arena: painted backdrops per phase, floating platforms, and what makes the place
// feel alive: weather for each boss, birds, grass, twinkling stars, and the way all of it flinches
// when something heavy lands.
'use strict';
(function () {
  // One palette per phase: 1 Dusk, 2 Totality, 3 Black Sun, 4 Dawn (after the win).
  G.PAL = [
    null,
    {
      name: 'DUSK',
      sky: ['#090b22', '#241a48', '#6e3440', '#e0935a'],
      far: '#231a3e', near: '#150f2a', pillar: '#0f0b20', rim: '255,170,110',
      floorTop: '#352c4c', floor: '#141024',
      boss: '255,186,92', hot: '255,240,205', ember: '255,170,90', stars: 0.3,
    },
    {
      name: 'TOTALITY',
      sky: ['#04030c', '#150a2a', '#3d0f2e', '#a02a48'],
      far: '#1a0c26', near: '#0e0718', pillar: '#090512', rim: '255,90,110',
      floorTop: '#2c1c38', floor: '#0e0916',
      boss: '255,78,96', hot: '255,222,214', ember: '255,90,120', stars: 0.95,
    },
    {
      name: 'BLACK SUN',
      sky: ['#010102', '#08060b', '#1c0a10', '#b8a8b4'],
      far: '#0d0a10', near: '#070508', pillar: '#040305', rim: '236,228,255',
      floorTop: '#26222c', floor: '#09080b',
      boss: '226,216,255', hot: '255,255,255', ember: '214,204,255', stars: 0.15,
    },
    {
      name: 'DAWN',
      sky: ['#243f7a', '#7a6aa0', '#f09a78', '#ffe2a6'],
      far: '#4a4470', near: '#2c2848', pillar: '#1c1a32', rim: '255,226,170',
      floorTop: '#5a4f6a', floor: '#221d30',
      boss: '255,232,160', hot: '255,252,235', ember: '255,232,170', stars: 0,
    },
  ];

  // Each boss has its own set of four palettes (three phases and the dawn after a win) and its own
  // skyline. G.PAL always holds the set for the boss being fought.
  const DAWN = G.PAL[4];
  G.THEMES = {
    warden: G.PAL.slice(),
    // the Magus: an observatory under a cold aurora
    mage: [null,
      {
        name: 'FIRST VERSE', scene: 'spires',
        sky: ['#040816', '#0e1c44', '#1f4a78', '#7ec8d8'],
        far: '#142848', near: '#0c1830', pillar: '#081022', rim: '150,215,255',
        floorTop: '#28406a', floor: '#0c1428',
        boss: '150,170,255', hot: '238,240,255', ember: '160,210,255', stars: 0.8,
      },
      {
        name: 'CONFLUENCE', scene: 'spires',
        sky: ['#0a0414', '#2a0c3c', '#6a1c50', '#f08a70'],
        far: '#2a1238', near: '#180a24', pillar: '#0e0618', rim: '255,150,170',
        floorTop: '#44284e', floor: '#150a1c',
        boss: '255,130,170', hot: '255,232,225', ember: '255,150,160', stars: 0.6,
      },
      {
        name: 'TRINITY', scene: 'spires',
        sky: ['#020204', '#0c0a14', '#2a2238', '#e8dcb0'],
        far: '#14121c', near: '#0b0a10', pillar: '#060508', rim: '255,240,190',
        floorTop: '#34303c', floor: '#0c0b10',
        boss: '255,232,160', hot: '255,255,245', ember: '255,236,180', stars: 0.25,
      }, DAWN],
    // the Veil: rooftops under a great moon
    assassin: [null,
      {
        name: 'MOONRISE', scene: 'city', moon: { x: 930, y: 190, r: 120, col: '214,214,255' },
        sky: ['#03040c', '#0b1030', '#1c2456', '#5a5a98'],
        far: '#10143a', near: '#090c22', pillar: '#05060f', rim: '170,160,255',
        floorTop: '#262a52', floor: '#0a0b1c',
        boss: '190,135,255', hot: '242,230,255', ember: '180,160,255', stars: 0.7,
      },
      {
        name: 'SHADOWS', scene: 'city', moon: { x: 930, y: 190, r: 120, col: '150,235,205' },
        sky: ['#010504', '#06180f', '#0e3428', '#3c8a72'],
        far: '#0a2018', near: '#06120e', pillar: '#030806', rim: '120,255,200',
        floorTop: '#1c3a30', floor: '#07120e',
        boss: '110,255,195', hot: '228,255,244', ember: '120,240,190', stars: 0.3,
      },
      {
        name: 'EXECUTION', scene: 'city', moon: { x: 780, y: 230, r: 210, col: '255,255,255' },
        sky: ['#000000', '#040406', '#101016', '#8c8c9c'],
        far: '#0a0a0e', near: '#050507', pillar: '#020203', rim: '240,240,255',
        floorTop: '#26262e', floor: '#070709',
        boss: '236,236,255', hot: '255,255,255', ember: '220,220,255', stars: 0.1,
      }, DAWN],
    // the Knight: a drowned graveyard
    knight: [null,
      {
        name: 'THE OATH', scene: 'graves',
        sky: ['#04070c', '#0c1a2a', '#1e3a4e', '#86a8b4'],
        far: '#122230', near: '#0a141e', pillar: '#060c12', rim: '150,205,255',
        floorTop: '#2a3c4c', floor: '#0a1118',
        boss: '130,195,255', hot: '232,246,255', ember: '150,200,240', stars: 0.25,
      },
      {
        name: 'THE HOST', scene: 'graves',
        sky: ['#020503', '#0a1a0c', '#1e3c18', '#8cae5a'],
        far: '#12240f', near: '#0a1408', pillar: '#050a04', rim: '170,255,120',
        floorTop: '#2a3c22', floor: '#0a1108',
        boss: '160,255,110', hot: '238,255,224', ember: '160,240,120', stars: 0.1,
      },
      {
        name: 'BLOOD OATH', scene: 'graves',
        sky: ['#020000', '#140406', '#40080c', '#c0483c'],
        far: '#1c0608', near: '#100405', pillar: '#080203', rim: '255,90,80',
        floorTop: '#3a1c1e', floor: '#100607',
        boss: '255,76,70', hot: '255,226,214', ember: '255,100,90', stars: 0.05,
      }, DAWN],
  };

  // the Vigil: the camp between runs, in the last hour before dawn. One palette for every "phase".
  const VIGIL = {
    name: 'VIGIL', scene: 'camp',
    sky: ['#0a1030', '#2a2858', '#7c4c68', '#f2b684'],
    far: '#2c2850', near: '#1c1a38', pillar: '#121026', rim: '255,206,150',
    floorTop: '#40385a', floor: '#181428',
    boss: '255,214,140', hot: '255,246,225', ember: '255,200,130', stars: 0.55,
  };
  G.THEMES.hub = [null, VIGIL, VIGIL, VIGIL, VIGIL];

  const PAD = 48; // backdrop bleed so screen shake never shows an edge
  const A = G.arena = {
    WEATHER: null, BIRDS: null, // (set below)
    phase: 1, prevPhase: 1, fade: 1, fadeDur: 1,
    platforms: [ // (filled in by A.layout, per boss and phase)
    ],
    bgs: [], theme: 'warden', cache: {},
    moteT: 0,
    flakes: [], birds: [], blades: [], twinkles: [], birdT: 6, startleCd: 0,
  };
  const FLOOR = G.FLOOR, rnd = G.rand;

  // ------------------------------------------------------------------ weather
  // Each boss's arena has its own: embers rising for the Warden, snow for the Magus, rain for the
  // Veil, ash for the Knight. Flakes have a depth z; the nearer ones are drawn in front of the fight.
  const WEATHER = {
    warden: { kind: 'ember', n: 34 },
    mage: { kind: 'snow', n: 110 },
    assassin: { kind: 'rain', n: 190 },
    knight: { kind: 'ash', n: 80 },
  };
  const DENSITY = [0, 0.55, 0.8, 1, 0.3]; // by phase: the weather closes in as the fight goes on, and clears at dawn
  const BIRDS = { assassin: 'bat', knight: 'crow' };
  // a boss file adds its own: G.SCENES[name] = function (x, P, F, lcg) paints the skyline on the
  // backdrop canvas x (P is the phase's palette, F the floor's y); G.arena.WEATHER[id] = { kind, n }
  // with kind one of ember, snow, rain, ash; G.arena.BIRDS[id] = 'bat' or 'crow'.
  G.SCENES = G.SCENES || {};

  A.WEATHER = WEATHER; A.BIRDS = BIRDS;

  function seedFlake(f, kind, anywhere) {
    f.z = Math.random(); f.ph = rnd(0, 6.28); f.ix = 0; f.iy = 0;
    f.x = rnd(-60, G.W + 60);
    f.y = anywhere ? rnd(-40, FLOOR) : -rnd(10, 70);
    const near = 0.6 + 0.7 * f.z;
    if (kind === 'snow') { f.vx = rnd(-20, 6); f.vy = rnd(30, 70) * near; f.s = rnd(1, 2.2) * near; }
    else if (kind === 'rain') { f.vy = rnd(900, 1250) * (0.75 + 0.4 * f.z); f.vx = -f.vy * 0.17; f.s = rnd(13, 22) * near; if (!anywhere) f.x = rnd(-20, G.W + 240); }
    else if (kind === 'ash') { f.vx = rnd(-38, -8); f.vy = rnd(14, 44) * near; f.s = rnd(1.3, 2.6) * near; f.hot = Math.random() < 0.16; }
    else { f.x = rnd(G.WALL_L, G.WALL_R); f.y = anywhere ? rnd(FLOOR - 330, FLOOR) : FLOOR + rnd(0, 8); f.vx = rnd(-16, 16); f.vy = -rnd(34, 96); f.s = rnd(1.1, 2.3); f.life = rnd(2, 4.6); }
  }

  function buildLife() {
    const w = WEATHER[A.theme] || WEATHER.warden;
    A.weather = w.kind;
    A.flakes.length = 0; A.splashes = [];
    for (let i = 0; i < w.n; i++) { const f = {}; seedFlake(f, w.kind, true); A.flakes.push(f); }
    A.birds.length = 0; A.birdT = rnd(3, 8); A.startleCd = 0;
    // grass along the foot of the Knight's graveyard
    A.blades.length = 0;
    if (A.theme === 'knight') {
      const r = lcg(57);
      for (let i = 0; i < 96; i++) A.blades.push({ x: G.WALL_L + 6 + r() * (G.WALL_R - G.WALL_L - 12), h: 6 + r() * 11, lean: (r() - 0.5) * 3, ph: r() * 6.28, v: 0, b: 0 });
    }
    A.twinkles.length = 0;
    const r = lcg(203);
    for (let i = 0; i < 16; i++) A.twinkles.push({ x: 60 + r() * 1160, y: 20 + r() * 300, sp: 0.5 + r() * 1.2, ph: r() * 6.28 });
  }

  function flock(startled) {
    const kind = BIRDS[A.theme];
    if (!kind || A.phase === 4 && !startled) return;
    const dir = Math.random() < 0.5 ? -1 : 1, n = 3 + Math.floor(rnd(0, startled ? 5 : 4));
    // startled birds leave their roosts; the others just cross the sky
    const roosts = A.theme === 'knight' ? [[150, FLOOR - 230], [1130, FLOOR - 260], [640, FLOOR - 400]] : [[rnd(120, 460), FLOOR - rnd(210, 330)], [rnd(820, 1160), FLOOR - rnd(210, 330)]];
    const roost = G.pick(roosts);
    const by = rnd(70, 250);
    for (let i = 0; i < n; i++) {
      if (startled) {
        A.birds.push({ kind, x: roost[0] + rnd(-30, 30), y: roost[1] + rnd(-20, 20), vx: dir * rnd(90, 190) * (Math.random() < 0.3 ? -1 : 1), vy: -rnd(70, 150), ph: rnd(0, 6.28), s: rnd(5, 8), fast: 1 });
      } else {
        A.birds.push({ kind, x: (dir > 0 ? -40 : G.W + 40) - dir * i * rnd(20, 38), y: by + rnd(-24, 24), vx: dir * rnd(72, 104), vy: rnd(-5, 5), ph: rnd(0, 6.28), s: rnd(5, 8), fast: 0 });
      }
    }
  }

  // Something blew up or landed at (x, y): the weather and the grass are pushed away from it.
  A.gust = function (x, y, power) {
    const R = 170 + 130 * power, heavy = A.weather === 'rain' ? 0.35 : 1;
    for (const f of A.flakes) {
      const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy) || 1;
      if (d > R) continue;
      const k = (1 - d / R) * power * 300 * heavy;
      f.ix += dx / d * k; f.iy += dy / d * k * 0.6;
    }
    for (const b of A.blades) {
      const dx = b.x - x;
      if (Math.abs(dx) < R) b.v += G.sign(dx) * (1 - Math.abs(dx) / R) * power * 70;
    }
  };

  // The whole arena was shaken: platforms dip and shed grit, birds take off.
  A.bump = function (power) {
    for (const p of A.platforms) {
      if (p.rise < 0.95) continue;
      p.bv += 34 * power;
      for (let i = 0; i < 4; i++) {
        G.fx.spawn({ kind: 'chunk', color: '26,22,36', x: p.x + rnd(10, p.w - 10), y: p.y + 20, vx: rnd(-20, 20), vy: rnd(0, 60), life: rnd(0.5, 0.9), size: rnd(1.8, 3.4), grav: 1400, rot: 0, vr: rnd(-8, 8) });
      }
      G.fx.dust(p.x + p.w / 2, p.y + 24, 2, { speed: [10, 60], size: [5, 9], up: 4, a: 0.26, jitter: p.w * 0.4 });
    }
    for (const b of A.birds) { b.fast = 1; b.vx *= 1.7; b.vy -= rnd(40, 90); }
    if (BIRDS[A.theme] && A.startleCd <= 0 && power > 0.9) { A.startleCd = 7; flock(true); }
    A.gust(G.W / 2, FLOOR, power * 0.6);
  };

  // A platform gives a little under a weight (v: how hard, in pixels a second).
  A.bob = function (p, v) { p.bv = Math.min(90, p.bv + v); };

  G.pal = () => G.PAL[A.phase];

  // Small deterministic generator so every backdrop shares the same skyline.
  function lcg(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // ruined colonnade (the Warden)
  function colonnade(x, P, F) {
    const r = lcg(5);
    const cols = [86, 188, 300, 432, 560, 720, 850, 978, 1092, 1196];
    for (let i = 0; i < cols.length; i++) {
      const cx = cols[i] + (r() - 0.5) * 26;
      const w = 34 + r() * 24, h = 130 + r() * 250;
      const top = F - h;
      x.fillStyle = P.pillar;
      x.beginPath();
      x.moveTo(cx - w / 2, F + 4);
      x.lineTo(cx - w / 2, top + r() * 26);
      x.lineTo(cx - w / 6, top - r() * 12);
      x.lineTo(cx + w / 8, top + r() * 30);
      x.lineTo(cx + w / 2, top + r() * 16);
      x.lineTo(cx + w / 2, F + 4);
      x.closePath(); x.fill();
      // plinth
      x.fillRect(cx - w / 2 - 7, F - 16, w + 14, 20);
      // rim light on the side facing the centre
      const side = cx < 640 ? 1 : -1;
      const lg = x.createLinearGradient(cx + side * w / 2, 0, cx + side * (w / 2 - 12), 0);
      lg.addColorStop(0, G.rgba(P.rim, 0.26)); lg.addColorStop(1, G.rgba(P.rim, 0));
      x.fillStyle = lg;
      x.fillRect(Math.min(cx + side * w / 2, cx + side * (w / 2 - 12)), top + 30, 12, h - 44);
      // fluting
      x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2;
      for (let k = -1; k <= 1; k++) {
        x.beginPath(); x.moveTo(cx + k * w * 0.22, top + 44); x.lineTo(cx + k * w * 0.22, F - 18); x.stroke();
      }
    }
  }

  // a few standing columns, two tents and a watchtower (the Vigil)
  function camp(x, P, F) {
    colonnade(x, P, F);
    x.fillStyle = P.near;
    // watchtower on the far left, with a lit window
    x.fillRect(52, F - 330, 44, 334);
    x.beginPath(); x.moveTo(40, F - 330); x.lineTo(74, F - 384); x.lineTo(108, F - 330); x.closePath(); x.fill();
    x.fillStyle = G.rgba(P.rim, 0.7); x.fillRect(68, F - 296, 10, 16);
    // tents
    for (const [tx, tw, th] of [[560, 150, 96], [770, 120, 78]]) {
      x.fillStyle = P.near;
      x.beginPath(); x.moveTo(tx - tw / 2, F + 4); x.lineTo(tx, F - th); x.lineTo(tx + tw / 2, F + 4); x.closePath(); x.fill();
      x.fillStyle = P.pillar;
      x.beginPath(); x.moveTo(tx - tw * 0.13, F + 4); x.lineTo(tx, F - th * 0.62); x.lineTo(tx + tw * 0.13, F + 4); x.closePath(); x.fill();
      x.strokeStyle = G.rgba(P.rim, 0.35); x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(tx - tw / 2, F + 4); x.lineTo(tx, F - th); x.lineTo(tx + tw / 2, F + 4); x.stroke();
      x.fillStyle = G.rgba(P.rim, 0.55); x.fillRect(tx - 1, F - th - 16, 2, 16);
    }
  }

  // thin towers, an orrery ring and hanging crystals (the Magus)
  function spires(x, P, F) {
    const r = lcg(17);
    x.strokeStyle = G.rgba(P.rim, 0.2); x.lineWidth = 3;
    x.beginPath(); x.ellipse(640, 250, 330, 92, -0.18, 0, G.TAU); x.stroke();
    x.strokeStyle = G.rgba(P.rim, 0.12); x.lineWidth = 2;
    x.beginPath(); x.ellipse(640, 250, 250, 210, 0.5, 0, G.TAU); x.stroke();
    for (const cx of [70, 170, 292, 410, 868, 990, 1108, 1210]) {
      const w = 26 + r() * 22, h = 190 + r() * 300, top = F - h, px = cx + (r() - 0.5) * 30;
      x.fillStyle = P.pillar;
      x.beginPath();
      x.moveTo(px - w / 2, F + 4); x.lineTo(px - w / 2, top + 40); x.lineTo(px - w * 0.72, top + 30); x.lineTo(px - w * 0.72, top + 18);
      x.lineTo(px - w * 0.3, top + 18); x.lineTo(px, top - 46 - r() * 30); x.lineTo(px + w * 0.3, top + 18);
      x.lineTo(px + w * 0.72, top + 18); x.lineTo(px + w * 0.72, top + 30); x.lineTo(px + w / 2, top + 40); x.lineTo(px + w / 2, F + 4);
      x.closePath(); x.fill();
      x.fillStyle = G.rgba(P.rim, 0.5);
      for (let wy = top + 62; wy < F - 40; wy += 46 + r() * 30) x.fillRect(px - 2, wy, 4, 11);
      const side = px < 640 ? 1 : -1;
      const lg = x.createLinearGradient(px + side * w / 2, 0, px + side * (w / 2 - 10), 0);
      lg.addColorStop(0, G.rgba(P.rim, 0.26)); lg.addColorStop(1, G.rgba(P.rim, 0));
      x.fillStyle = lg;
      x.fillRect(Math.min(px + side * w / 2, px + side * (w / 2 - 10)), top + 40, 10, h - 44);
    }
    for (let i = 0; i < 9; i++) {
      const cx = 110 + r() * 1060, cy = 90 + r() * 250, s = 9 + r() * 15;
      x.fillStyle = P.pillar;
      x.beginPath(); x.moveTo(cx, cy - s * 1.7); x.lineTo(cx + s * 0.6, cy); x.lineTo(cx, cy + s * 1.7); x.lineTo(cx - s * 0.6, cy); x.closePath(); x.fill();
      x.strokeStyle = G.rgba(P.rim, 0.45); x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(cx, cy - s * 1.7); x.lineTo(cx + s * 0.6, cy); x.lineTo(cx, cy + s * 1.7); x.stroke();
    }
  }

  // tiered roofs and towers (the Veil)
  function city(x, P, F) {
    const r = lcg(23);
    for (let layer = 0; layer < 2; layer++) {
      x.fillStyle = layer ? P.pillar : P.near;
      let px = -60;
      while (px < G.W + 60) {
        const w = 70 + r() * 90, h = (layer ? 90 : 170) + r() * (layer ? 150 : 200), top = F - h;
        x.fillRect(px, top, w, h + 4);
        const tiers = r() < 0.45 ? 2 : 1;
        for (let t = 0; t < tiers; t++) {
          const ty = top - t * 30, ov = 16 - t * 5;
          x.beginPath();
          x.moveTo(px - ov, ty + 4); x.quadraticCurveTo(px + w * 0.25, ty - 4, px + w / 2, ty - 26);
          x.quadraticCurveTo(px + w * 0.75, ty - 4, px + w + ov, ty + 4);
          x.lineTo(px + w + ov - 4, ty + 9); x.lineTo(px - ov + 4, ty + 9);
          x.closePath(); x.fill();
          if (t) x.fillRect(px + w * 0.2, ty, w * 0.6, 32);
        }
        if (layer) {
          x.fillStyle = G.rgba(P.rim, 0.42);
          for (let k = 0; k < 4; k++) if (r() < 0.5) x.fillRect(px + 10 + r() * (w - 24), top + 22 + r() * (h - 50), 5, 8);
          x.fillStyle = G.rgba(P.rim, 0.3); x.fillRect(px - 14, top + 3, w + 28, 1.5);
          x.fillStyle = P.pillar;
        }
        px += w + 14 + r() * 50;
      }
    }
  }

  // headstones, dead trees and a broken chapel (the Knight)
  function graves(x, P, F) {
    const r = lcg(31);
    x.fillStyle = P.near;
    x.beginPath();
    x.moveTo(380, F + 4); x.lineTo(380, F - 250); x.lineTo(430, F - 300); x.lineTo(470, F - 262); x.lineTo(560, F - 330);
    x.lineTo(640, F - 420); x.lineTo(720, F - 330); x.lineTo(800, F - 280); x.lineTo(846, F - 316); x.lineTo(900, F - 236); x.lineTo(900, F + 4);
    x.closePath(); x.fill();
    x.fillStyle = P.sky[2];
    for (const [ax, aw, ah] of [[470, 46, 150], [640, 76, 250], [810, 46, 150]]) {
      x.beginPath(); x.moveTo(ax - aw / 2, F - 30); x.lineTo(ax - aw / 2, F - ah + aw * 0.7);
      x.quadraticCurveTo(ax - aw / 2, F - ah, ax, F - ah - aw * 0.5); x.quadraticCurveTo(ax + aw / 2, F - ah, ax + aw / 2, F - ah + aw * 0.7);
      x.lineTo(ax + aw / 2, F - 30); x.closePath(); x.fill();
    }
    x.strokeStyle = P.pillar; x.lineCap = 'round';
    function branch(bx, by, a, len, w, depth) {
      const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
      x.lineWidth = w; x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke();
      if (depth <= 0) return;
      branch(ex, ey, a - 0.3 - r() * 0.5, len * 0.68, w * 0.62, depth - 1);
      branch(ex, ey, a + 0.25 + r() * 0.5, len * 0.62, w * 0.62, depth - 1);
    }
    branch(150, F, -Math.PI / 2 + 0.1, 120, 15, 4);
    branch(1130, F, -Math.PI / 2 - 0.12, 140, 17, 4);
    for (const cx of [70, 236, 312, 966, 1036, 1204, 1250]) {
      const w = 26 + r() * 16, h = 40 + r() * 46, tilt = (r() - 0.5) * 0.24;
      x.save(); x.translate(cx, F + 3); x.rotate(tilt);
      x.fillStyle = P.pillar;
      if (r() < 0.45) {
        x.fillRect(-4, -h - 26, 8, h + 26); x.fillRect(-w / 2, -h - 6, w, 8);
      } else {
        x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(-w / 2, -h + w / 2); x.arc(0, -h + w / 2, w / 2, Math.PI, 0); x.lineTo(w / 2, 0); x.closePath(); x.fill();
      }
      x.fillStyle = G.rgba(P.rim, 0.22); x.fillRect(cx < 640 ? w / 2 - 3 : -w / 2, -h + 6, 3, h - 10);
      x.restore();
    }
    x.lineCap = 'butt';
  }

  function buildBg(pi) {
    const P = G.PAL[pi];
    const c = document.createElement('canvas'), q = G.bgK;
    c.width = Math.round((G.W + PAD * 2) * q); c.height = Math.round((G.H + PAD * 2) * q);
    const x = c.getContext('2d');
    x.scale(q, q); x.translate(PAD, PAD);
    const L = -PAD, R = G.W + PAD, T = -PAD, B = G.H + PAD, F = G.FLOOR;

    // sky
    let g = x.createLinearGradient(0, T, 0, F + 10);
    g.addColorStop(0, P.sky[0]); g.addColorStop(0.45, P.sky[1]);
    g.addColorStop(0.82, P.sky[2]); g.addColorStop(1, P.sky[3]);
    x.fillStyle = g; x.fillRect(L, T, R - L, F - T + 10);

    // stars
    let r = lcg(77);
    for (let i = 0; i < 190; i++) {
      const sx = L + r() * (R - L), sy = T + r() * (F - 160 - T), a = r(), s = r();
      x.fillStyle = 'rgba(255,255,255,' + (P.stars * (0.25 + 0.75 * a) * (1 - (sy - T) / (F - T))).toFixed(3) + ')';
      const sz = s > 0.93 ? 2.2 : s > 0.6 ? 1.4 : 1;
      x.fillRect(sx, sy, sz, sz);
    }

    if (P.moon) {
      const m = P.moon;
      g = x.createRadialGradient(m.x, m.y, m.r * 0.6, m.x, m.y, m.r * 2.4);
      g.addColorStop(0, G.rgba(m.col, 0.3)); g.addColorStop(1, G.rgba(m.col, 0));
      x.fillStyle = g; x.fillRect(L, T, R - L, F - T);
      x.fillStyle = G.rgba(m.col, 0.92);
      x.beginPath(); x.arc(m.x, m.y, m.r, 0, G.TAU); x.fill();
      r = lcg(41);
      for (let i = 0; i < 9; i++) {
        const a = r() * G.TAU, d = r() * m.r * 0.7, cr = m.r * (0.06 + r() * 0.13);
        x.fillStyle = 'rgba(0,0,0,0.07)';
        x.beginPath(); x.arc(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, cr, 0, G.TAU); x.fill();
      }
    }

    // horizon glow
    g = x.createRadialGradient(640, F + 30, 20, 640, F + 30, 760);
    g.addColorStop(0, G.rgba(P.rim, 0.34)); g.addColorStop(0.5, G.rgba(P.rim, 0.1)); g.addColorStop(1, G.rgba(P.rim, 0));
    x.fillStyle = g; x.fillRect(L, T, R - L, F - T + 10);

    // two mountain ridges
    function ridge(seed, base, amp, col) {
      const q = lcg(seed);
      const ph = [q() * 6, q() * 6, q() * 6];
      x.fillStyle = col;
      x.beginPath(); x.moveTo(L, F + 10);
      for (let px = L; px <= R; px += 8) {
        const n = Math.sin(px * 0.006 + ph[0]) * 0.5 + Math.sin(px * 0.017 + ph[1]) * 0.3 + Math.sin(px * 0.045 + ph[2]) * 0.12;
        x.lineTo(px, base - (n * 0.5 + 0.5) * amp);
      }
      x.lineTo(R, F + 10); x.closePath(); x.fill();
    }
    ridge(11, F - 60, 200, P.far);
    ridge(29, F - 14, 120, P.near);

    if (P.scene === 'spires') spires(x, P, F);
    else if (P.scene === 'city') city(x, P, F);
    else if (P.scene === 'graves') graves(x, P, F);
    else if (P.scene === 'camp') camp(x, P, F);
    else if (G.SCENES[P.scene]) G.SCENES[P.scene](x, P, F, lcg); // painted by the boss's own file
    else colonnade(x, P, F);

    // air between here and there: everything far away stands in haze up to its knees, so the
    // skyline sits behind the fight instead of on top of it
    g = x.createLinearGradient(0, F - 230, 0, F + 4);
    g.addColorStop(0, G.rgba(P.rim, 0)); g.addColorStop(0.7, G.rgba(P.rim, 0.1)); g.addColorStop(1, G.rgba(P.rim, 0.24));
    x.fillStyle = g; x.fillRect(L, F - 230, R - L, 234);

    // floor slab: dressed stone with a worn, lit lip, a course of blocks under it, and a grain to the face
    g = x.createLinearGradient(0, F, 0, B);
    g.addColorStop(0, P.floorTop); g.addColorStop(0.1, P.floor); g.addColorStop(0.5, '#05040a'); g.addColorStop(1, '#000');
    x.fillStyle = g; x.fillRect(L, F, R - L, B - F);
    r = lcg(203);
    for (let i = 0; i < 520; i++) {
      const sx = L + r() * (R - L), sy = F + 4 + r() * r() * 70, sw = 1 + r() * 5;
      x.fillStyle = r() < 0.5 ? G.rgba(P.rim, 0.035) : 'rgba(0,0,0,0.12)';
      x.fillRect(sx, sy, sw, 1);
    }
    // the lip: a bright line where the top meets the face, light spilling a little way down it
    g = x.createLinearGradient(0, F, 0, F + 14);
    g.addColorStop(0, G.rgba(P.rim, 0.26)); g.addColorStop(1, G.rgba(P.rim, 0));
    x.fillStyle = g; x.fillRect(L, F, R - L, 14);
    x.fillStyle = G.rgba(P.rim, 0.7); x.fillRect(L, F, R - L, 1.5);
    x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(L, F, R - L, 0.75);
    // a course of blocks: seams that are not all the same width apart, each with a lit edge
    r = lcg(57);
    for (let px = 40; px < G.W; px += 70 + r() * 70) {
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(px, F + 2, 1.5, 22);
      x.fillStyle = G.rgba(P.rim, 0.1); x.fillRect(px + 1.5, F + 2, 1, 22);
    }
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(L, F + 24, R - L, 1.5);
    x.fillStyle = G.rgba(P.rim, 0.08); x.fillRect(L, F + 25.5, R - L, 1);
    // phase 3: glowing cracks across the floor
    if (pi === 3) {
      r = lcg(91);
      x.strokeStyle = G.rgba(P.rim, 0.55); x.lineWidth = 1.5;
      for (let i = 0; i < 16; i++) {
        let px = 60 + r() * 1160, py = F + 3;
        x.beginPath(); x.moveTo(px, py);
        for (let k = 0; k < 3; k++) { px += (r() - 0.5) * 30; py += 3 + r() * 5; x.lineTo(px, py); }
        x.stroke();
      }
    }

    // arena walls
    for (const side of [-1, 1]) {
      const inner = side < 0 ? G.WALL_L : G.WALL_R;
      const outer = side < 0 ? L : R;
      x.fillStyle = '#06050c';
      x.fillRect(Math.min(inner, outer), T, Math.abs(outer - inner), B - T);
      const wg = x.createLinearGradient(inner, 0, inner + side * 16, 0);
      wg.addColorStop(0, G.rgba(P.rim, 0.34)); wg.addColorStop(1, G.rgba(P.rim, 0));
      x.fillStyle = wg;
      x.fillRect(Math.min(inner, inner + side * 16), T, 16, F - T);
      x.fillStyle = '#06050c';
      for (let py = 60; py < F; py += 150) x.fillRect(side < 0 ? inner : inner - 9, py, 9, 26);
    }
    return c;
  }

  let vignette = null;
  function buildVignette() {
    const c = document.createElement('canvas');
    c.width = G.W / 4; c.height = G.H / 4;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(c.width / 2, c.height * 0.46, c.height * 0.36, c.width / 2, c.height / 2, c.width * 0.66);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.62)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  A.init = function () {
    for (let i = 1; i <= 4; i++) A.bgs[i] = buildBg(i);
    A.cache.warden = A.bgs;
    vignette = buildVignette();
    buildLife();
    A.reset();
  };

  // Switch to another boss's palettes and skyline. Backdrops are painted once and kept for two themes.
  A.setTheme = function (id) {
    if (!G.THEMES[id]) id = 'warden';
    if (A.theme === id) return;
    A.theme = id;
    for (let i = 1; i <= 4; i++) G.PAL[i] = G.THEMES[id][i];
    if (!A.cache[id]) {
      // the Warden's and the camp's backdrops are kept; one other boss's at a time
      for (const k of Object.keys(A.cache)) if (k !== 'warden' && k !== 'hub') delete A.cache[k];
      const set = [];
      for (let i = 1; i <= 4; i++) set[i] = i > 1 && G.PAL[i] === G.PAL[1] ? set[1] : buildBg(i);
      A.cache[id] = set;
    }
    A.bgs = A.cache[id];
    buildLife();
  };

  // Every boss's arena is laid out anew for each phase (v1.7c): it is never just the same two
  // platforms. Each entry is [left edge, width, height of the standing surface]. The floor is at 612;
  // one jump reaches about 474, two about 360.
  A.LAYOUTS = {
    warden: {
      2: [[214, 196, 490], [870, 196, 490]],                                    // two wide wings, torn up by its hands
      3: [[130, 150, 505], [565, 150, 410], [1000, 150, 505]],                  // three steps up to the black sun
    },
    mage: {
      1: [[490, 300, 490]],                                                     // one dais in the middle of the hall
      2: [[110, 120, 510], [400, 120, 455], [760, 120, 455], [1050, 120, 510]], // four floes on the frozen floor
      3: [[300, 104, 530], [876, 104, 530]],                                    // two low stones under the storm
    },
    assassin: {
      2: [[230, 84, 500], [598, 84, 436], [966, 84, 500]],                      // three narrow perches in the dark
      3: [[44, 120, 508], [1116, 120, 508]],                                    // a ledge at each wall, under the wires
    },
    knight: {
      2: [[110, 130, 512], [286, 130, 446]],                                    // what is left of a stair by the west wall
      3: [[585, 110, 486]],                                                     // one stone inside the ring of blades
    },
  };
  // Lay the arena out for a boss's phase: what stands now sinks back into the floor, and the new
  // platforms come up out of it. o.hold leaves them in the floor until A.raisePlatforms is called
  // (the Warden hauls its own up); o.instant puts them up at once.
  A.layout = function (boss, phase, o) {
    o = o || {};
    const spec = (A.LAYOUTS[boss] || {})[phase] || [];
    for (const p of A.platforms) { p.gone = true; p.target = 0; p.downT = 0; }
    for (const [x, w, top] of spec) {
      A.platforms.push({ x, w, y: o.instant ? top : G.FLOOR + 40, top, rise: o.instant ? 1 : 0, target: o.hold ? 0 : 1, bob: 0, bv: 0, downT: 0 });
    }
  };

  A.reset = function () {
    A.phase = 1; A.prevPhase = 1; A.fade = 1;
    A.platforms.length = 0;
    A.birds.length = 0; A.birdT = rnd(3, 8); A.startleCd = 0;
  };

  A.setPhase = function (p, dur) {
    if (p === A.phase) return;
    A.prevPhase = A.phase; A.phase = p;
    A.fade = 0; A.fadeDur = dur || 1.5;
  };

  A.raisePlatforms = function (instant) {
    for (const p of A.platforms) { if (p.gone) continue; p.target = 1; if (instant) p.rise = 1; }
  };

  A.dropPlatform = function (p, secs) { p.target = 0; p.downT = secs; };

  A.update = function (dt) {
    if (A.fade < 1) A.fade = Math.min(1, A.fade + dt / A.fadeDur);
    // a platform that belongs to a phase that is over goes once it has sunk
    for (let i = A.platforms.length - 1; i >= 0; i--) if (A.platforms[i].gone && A.platforms[i].rise <= 0) A.platforms.splice(i, 1);
    for (const p of A.platforms) {
      // a platform knocked down by the swat attack sinks, waits, then rises again (one that is going for good sinks slowly)
      if (p.rise > p.target) p.rise = Math.max(p.target, p.rise - dt / (p.gone ? 0.9 : 0.35));
      if (p.downT > 0) { p.downT -= dt; if (p.downT <= 0) p.target = 1; }
      if (p.rise < p.target) {
        p.rise = Math.min(p.target, p.rise + dt / 1.6);
        if (Math.random() < 0.5) {
          G.fx.burst(p.x + G.rand(0, p.w), p.y + 14, { n: 1, color: G.pal().ember, speed: [20, 80], angle: Math.PI / 2, spread: 1, life: [0.4, 0.8], size: [2, 4] });
        }
      }
      // a sprung dip when something lands on it or the arena shakes
      p.bv += (-p.bob * 190 - p.bv * 13) * dt; p.bob += p.bv * dt;
      p.y = G.lerp(G.FLOOR + 40, p.top, G.ease.outCubic(p.rise)) + (p.rise >= 1 ? p.bob : 0);
    }
    updateLife(dt);
    // drifting motes
    A.moteT -= dt;
    if (A.moteT <= 0) {
      A.moteT = 0.07;
      G.fx.spawn({
        x: G.rand(40, G.W - 40), y: G.rand(G.FLOOR - 420, G.FLOOR + 10),
        vx: G.rand(-14, 14), vy: G.rand(-46, -14),
        life: G.rand(2.5, 5), size: G.rand(1.2, 2.6), color: G.pal().ember, kind: 'glow',
      });
    }
  };

  function ground(x, y0) {
    for (const p of A.platforms) if (p.rise > 0.9 && x >= p.x && x <= p.x + p.w && y0 <= p.y) return p.y;
    return FLOOR;
  }

  function updateLife(dt) {
    const kind = A.weather, n = Math.round(A.flakes.length * DENSITY[A.phase]);
    const blow = G.wind * 1.6, calm = Math.exp(-2.4 * dt);
    for (let i = 0; i < A.flakes.length; i++) {
      const f = A.flakes[i];
      if (i >= n && (f.y < -5 || kind === 'ember' && f.life <= 0)) continue; // thinned out: let it leave, do not bring it back
      f.ix *= calm; f.iy *= calm;
      const y0 = f.y;
      let vx = f.vx + f.ix + blow;
      if (kind === 'snow') vx += Math.sin(G.t * 1.3 + f.ph) * 16;
      else if (kind === 'ash') vx += Math.sin(G.t * 0.9 + f.ph) * 10;
      else if (kind === 'ember') { vx += Math.sin(G.t * 2.2 + f.ph) * 12; f.life -= dt; }
      f.x += vx * dt; f.y += (f.vy + f.iy) * dt;
      if (kind === 'rain') {
        const gy = f.z > 0.55 ? ground(f.x, y0) : FLOOR;
        if (f.y >= gy) {
          if (f.x > G.WALL_L && f.x < G.WALL_R && A.splashes.length < 40) A.splashes.push({ x: f.x, y: gy, t: 0, near: f.z > 0.55 });
          seedFlake(f, kind, false);
        }
      } else if (kind === 'ember') {
        if (f.life <= 0 || f.y < -20) { if (i < n) seedFlake(f, kind, false); }
      } else if (f.y > FLOOR + 3 || f.x < -70 || f.x > G.W + 70) {
        seedFlake(f, kind, false);
        if (f.x < -60 || f.x > G.W + 60) f.x = rnd(0, G.W);
      }
    }
    for (let i = A.splashes.length - 1; i >= 0; i--) { A.splashes[i].t += dt; if (A.splashes[i].t > 0.16) A.splashes.splice(i, 1); }

    // birds
    A.startleCd -= dt; A.birdT -= dt;
    if (A.birdT <= 0) { A.birdT = rnd(11, 22); if (G.state !== 'title') flock(false); }
    for (let i = A.birds.length - 1; i >= 0; i--) {
      const b = A.birds[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.vy += (-18 - b.vy) * (b.fast ? 0.6 : 2) * dt * (b.fast ? 1 : 0.2);
      if (b.x < -90 || b.x > G.W + 90 || b.y < -70) A.birds.splice(i, 1);
    }

    // grass: it sways, springs back from gusts, and bends away from whoever walks through it
    if (A.blades.length) {
      const P = G.player, B = G.boss, bx = B && B.kit && B.body && !B.body.hidden && B.body.y > FLOOR - 4 ? B.body.x : -999;
      const px = !P.hidden && !P.dead && P.y > FLOOR - 6 ? P.x : -999;
      for (const b of A.blades) {
        let push = 0;
        const d1 = b.x - px, d2 = b.x - bx;
        if (Math.abs(d1) < 30) push += G.sign(d1 || 1) * (1 - Math.abs(d1) / 30) * 9;
        if (Math.abs(d2) < 48) push += G.sign(d2 || 1) * (1 - Math.abs(d2) / 48) * 10;
        b.v += ((push - b.b) * 160 - b.v * 9) * dt;
        b.b += b.v * dt;
      }
    }
  }

  // Weather behind (near = false) or in front of (near = true) the fight.
  function drawWeather(ctx, near) {
    const kind = A.weather, P = G.pal();
    const n = A.flakes.length;
    if (kind === 'rain') {
      ctx.strokeStyle = G.rgba(P.rim, near ? 0.3 : 0.17); ctx.lineWidth = near ? 1.4 : 1; ctx.lineCap = 'butt';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const f = A.flakes[i];
        if ((f.z > 0.55) !== near || f.y < -4) continue;
        const k = f.s / f.vy;
        ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - (f.vx + f.ix) * k, f.y - f.s);
      }
      ctx.stroke();
      ctx.strokeStyle = G.rgba(P.rim, near ? 0.5 : 0.28); ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const sp of A.splashes) {
        if (sp.near !== near) continue;
        const r = 1.5 + sp.t / 0.16 * 5;
        ctx.moveTo(sp.x - r, sp.y - 0.5); ctx.quadraticCurveTo(sp.x, sp.y - r * 1.3, sp.x + r, sp.y - 0.5);
      }
      ctx.stroke();
      return;
    }
    if (kind === 'ember') {
      if (near) return;
      ctx.globalCompositeOperation = 'lighter';
      const img = G.fx.glow(P.ember);
      for (let i = 0; i < n; i++) {
        const f = A.flakes[i];
        if (f.life <= 0) continue;
        const s = f.s * 3.2;
        ctx.globalAlpha = Math.min(1, f.life) * (0.55 + 0.45 * Math.sin(G.t * 13 + f.ph * 7));
        ctx.drawImage(img, f.x - s, f.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      return;
    }
    // snow and ash: soft specks
    ctx.fillStyle = kind === 'snow' ? 'rgba(228,240,255,' + (near ? 0.78 : 0.42) + ')' : 'rgba(176,186,180,' + (near ? 0.5 : 0.3) + ')';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const f = A.flakes[i];
      if ((f.z > 0.55) !== near || f.y < -4 || f.hot) continue;
      ctx.moveTo(f.x + f.s, f.y); ctx.arc(f.x, f.y, f.s, 0, G.TAU);
    }
    ctx.fill();
    if (kind === 'ash') {
      // a few of the specks are still alight
      ctx.globalCompositeOperation = 'lighter';
      const img = G.fx.glow(P.ember);
      for (let i = 0; i < n; i++) {
        const f = A.flakes[i];
        if (!f.hot || (f.z > 0.55) !== near || f.y < -4) continue;
        const s = f.s * 2.6;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(G.t * 9 + f.ph * 5);
        ctx.drawImage(img, f.x - s, f.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawSky(ctx) {
    const P = G.pal();
    // a handful of stars that twinkle
    if (P.stars > 0.12) {
      ctx.globalCompositeOperation = 'lighter';
      const img = G.fx.glow('255,255,255');
      for (const tw of A.twinkles) {
        const k = Math.sin(G.t * tw.sp + tw.ph);
        if (k <= 0) continue;
        const s = 3 + 5 * k * k;
        ctx.globalAlpha = Math.min(1, P.stars * 1.4) * k * k * k;
        ctx.drawImage(img, tw.x - s, tw.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // birds: two curved strokes that beat
    if (A.birds.length) {
      ctx.strokeStyle = G.rgba(P.rim, 0.62); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const b of A.birds) {
        const fl = Math.sin(G.t * (b.kind === 'bat' ? 17 : 10) * (b.fast ? 1.4 : 1) + b.ph), s = b.s, lift = fl * s * 0.75;
        ctx.moveTo(b.x - s, b.y - lift); ctx.quadraticCurveTo(b.x - s * 0.45, b.y - s * 0.35 - lift * 0.3, b.x, b.y);
        ctx.quadraticCurveTo(b.x + s * 0.45, b.y - s * 0.35 - lift * 0.3, b.x + s, b.y - lift);
      }
      ctx.stroke();
    }
  }

  function drawGrass(ctx) {
    if (!A.blades.length) return;
    const P = G.pal();
    ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? G.rgba(P.rim, 0.34) : P.pillar;
      ctx.beginPath();
      for (let i = pass; i < A.blades.length; i += 2) {
        const b = A.blades[i];
        const bend = b.lean + b.b + Math.sin(G.t * 1.5 + b.ph) * 1.8;
        ctx.moveTo(b.x, FLOOR + 1); ctx.quadraticCurveTo(b.x + bend * 0.3, FLOOR - b.h * 0.6, b.x + bend, FLOOR - b.h + Math.abs(bend) * 0.25);
      }
      ctx.stroke();
    }
  }

  // The window changed size: paint the current backdrops again at the new resolution.
  A.rescale = function () {
    if (!vignette) return; // not started yet; A.init paints them
    const set = [];
    for (let i = 1; i <= 4; i++) set[i] = i > 1 && G.PAL[i] === G.PAL[1] ? set[1] : buildBg(i);
    A.cache = {}; A.cache[A.theme] = set; A.bgs = set;
  };

  const BW = G.W + PAD * 2, BH = G.H + PAD * 2;
  A.drawBack = function (ctx) {
    if (A.fade < 1) {
      ctx.drawImage(A.bgs[A.prevPhase], -PAD, -PAD, BW, BH);
      ctx.globalAlpha = G.ease.inOutQuad(A.fade);
      ctx.drawImage(A.bgs[A.phase], -PAD, -PAD, BW, BH);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(A.bgs[A.phase], -PAD, -PAD, BW, BH);
    }
    // shafts of the arena's light, slanting down behind the fight
    if (G.post.on()) {
      const sh = shaft(G.pal().rim);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const sx = 120 + i * 262 + Math.sin(G.t * 0.11 + i * 1.7) * 40, wd = 90 + (i * 53) % 80;
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.t * 0.23 + i * 2.3);
        ctx.save();
        ctx.transform(1, 0, -0.42, 1, sx, -60); // a column, leaned over
        ctx.drawImage(sh, -wd / 2, 0, wd, G.FLOOR + 40);
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // low mist drifting across the floor
    const mist = G.fx.glow(G.pal().rim);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const span = G.W + 900;
      const x = ((i * 470 + G.t * (9 + i * 4)) % span) - 450;
      ctx.globalAlpha = 0.07 + 0.03 * Math.sin(G.t * 0.4 + i * 2);
      ctx.drawImage(mist, x, G.FLOOR - 120 + i * 9, 760, 170);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    drawSky(ctx);
    drawWeather(ctx, false);
    drawGrass(ctx);
  };

  A.drawPlatforms = function (ctx) {
    const P = G.pal();
    for (const p of A.platforms) {
      if (p.rise <= 0) continue;
      const y = p.y, x = p.x, w = p.w;
      // glow underneath
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * p.rise;
      ctx.drawImage(G.fx.glow(P.boss), x - 20, y - 6, w + 40, 60);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // slab
      ctx.fillStyle = '#0d0a16';
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 14, y + 18);
      ctx.lineTo(x + w / 2 + 20, y + 22); ctx.lineTo(x + w / 2, y + 30); ctx.lineTo(x + w / 2 - 20, y + 22);
      ctx.lineTo(x + 14, y + 18);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = G.rgba(P.rim, 0.85); ctx.fillRect(x, y, w, 2.5);
      ctx.fillStyle = G.rgba(P.rim, 0.18); ctx.fillRect(x, y + 2.5, w, 4);
      // rune ticks
      ctx.fillStyle = G.rgba(P.boss, 0.55 + 0.25 * Math.sin(G.t * 3 + x));
      for (let i = 0; i < 5; i++) ctx.fillRect(x + w / 2 - 34 + i * 16, y + 11, 6, 2);
    }
  };

  // A soft column of light, brightest at the top and gone by the floor. One per colour, kept.
  const shafts = new Map();
  function shaft(color) {
    let c = shafts.get(color);
    if (!c) {
      if (shafts.size > 10) shafts.clear();
      c = document.createElement('canvas'); c.width = 64; c.height = 256;
      const x = c.getContext('2d');
      let g = x.createLinearGradient(0, 0, 64, 0);
      g.addColorStop(0, G.rgba(color, 0)); g.addColorStop(0.5, G.rgba(color, 0.13)); g.addColorStop(1, G.rgba(color, 0));
      x.fillStyle = g; x.fillRect(0, 0, 64, 256);
      x.globalCompositeOperation = 'destination-in';
      g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 256);
      shafts.set(color, c);
    }
    return c;
  }

  A.drawFront = function (ctx) {
    // a little fog in front of the fight as well as behind it, so feet stand in the place
    if (G.post.on()) {
      const fog = G.fx.glow(G.pal().rim);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const span = G.W + 1100, fx = span - ((i * 610 + G.t * (14 + i * 5)) % span) - 550;
        ctx.globalAlpha = 0.045 + 0.02 * Math.sin(G.t * 0.5 + i * 2.1);
        ctx.drawImage(fog, fx, G.FLOOR - 46 + i * 7, 900, 120);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    drawWeather(ctx, true);
    ctx.drawImage(vignette, -PAD, -PAD, G.W + PAD * 2, G.H + PAD * 2);
  };
})();
