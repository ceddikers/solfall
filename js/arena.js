// Solfall - the arena: painted backdrops per phase, floating platforms, ambient motes.
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

  const PAD = 48; // backdrop bleed so screen shake never shows an edge
  const A = G.arena = {
    phase: 1, prevPhase: 1, fade: 1, fadeDur: 1,
    platforms: [
      { x: 214, w: 196, y: 0, top: 490, rise: 0, target: 0 },
      { x: 870, w: 196, y: 0, top: 490, rise: 0, target: 0 },
    ],
    bgs: [],
    moteT: 0,
  };

  G.pal = () => G.PAL[A.phase];

  // Small deterministic generator so every backdrop shares the same skyline.
  function lcg(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function buildBg(pi) {
    const P = G.PAL[pi];
    const c = document.createElement('canvas');
    c.width = G.W + PAD * 2; c.height = G.H + PAD * 2;
    const x = c.getContext('2d');
    x.translate(PAD, PAD);
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

    // ruined colonnade
    r = lcg(5);
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

    // floor slab
    g = x.createLinearGradient(0, F, 0, B);
    g.addColorStop(0, P.floorTop); g.addColorStop(0.16, P.floor); g.addColorStop(1, '#000');
    x.fillStyle = g; x.fillRect(L, F, R - L, B - F);
    x.fillStyle = G.rgba(P.rim, 0.5); x.fillRect(L, F, R - L, 2);
    x.fillStyle = G.rgba(P.rim, 0.1); x.fillRect(L, F + 2, R - L, 5);
    x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 2;
    for (let px = 80; px < G.W; px += 96) {
      x.beginPath(); x.moveTo(px, F + 3); x.lineTo(px, F + 22); x.stroke();
    }
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(L, F + 22, R - L, 2);
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
    vignette = buildVignette();
    A.reset();
  };

  A.reset = function () {
    A.phase = 1; A.prevPhase = 1; A.fade = 1;
    for (const p of A.platforms) { p.rise = 0; p.target = 0; p.y = G.FLOOR + 40; }
  };

  A.setPhase = function (p, dur) {
    if (p === A.phase) return;
    A.prevPhase = A.phase; A.phase = p;
    A.fade = 0; A.fadeDur = dur || 1.5;
  };

  A.raisePlatforms = function (instant) {
    for (const p of A.platforms) { p.target = 1; if (instant) p.rise = 1; }
  };

  A.update = function (dt) {
    if (A.fade < 1) A.fade = Math.min(1, A.fade + dt / A.fadeDur);
    for (const p of A.platforms) {
      if (p.rise < p.target) {
        p.rise = Math.min(p.target, p.rise + dt / 1.6);
        if (Math.random() < 0.5) {
          G.fx.burst(p.x + G.rand(0, p.w), p.y + 14, { n: 1, color: G.pal().ember, speed: [20, 80], angle: Math.PI / 2, spread: 1, life: [0.4, 0.8], size: [2, 4] });
        }
      }
      p.y = G.lerp(G.FLOOR + 40, p.top, G.ease.outCubic(p.rise));
    }
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

  A.drawBack = function (ctx) {
    if (A.fade < 1) {
      ctx.drawImage(A.bgs[A.prevPhase], -PAD, -PAD);
      ctx.globalAlpha = G.ease.inOutQuad(A.fade);
      ctx.drawImage(A.bgs[A.phase], -PAD, -PAD);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(A.bgs[A.phase], -PAD, -PAD);
    }
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

  A.drawFront = function (ctx) {
    ctx.drawImage(vignette, -PAD, -PAD, G.W + PAD * 2, G.H + PAD * 2);
  };
})();
