// Solfall - particles, rings, floating text, screen shake, flashes, hit-freeze and slow motion.
'use strict';
(function () {
  const F = G.fx = {
    parts: [], rings: [], texts: [],
    shakeAmp: 0, shakeX: 0, shakeY: 0,
    flashA: 0, flashC: '255,255,255', flashDecay: 4,
    zoom: 0,
  };
  const MAX_PARTS = 1300;
  const sprites = new Map();

  // Soft round glow sprite, cached per colour.
  F.glow = function (color) {
    let c = sprites.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, G.rgba(color, 1));
    g.addColorStop(0.25, G.rgba(color, 0.55));
    g.addColorStop(0.6, G.rgba(color, 0.14));
    g.addColorStop(1, G.rgba(color, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    sprites.set(color, c);
    return c;
  };

  F.reset = function () {
    F.parts.length = 0; F.rings.length = 0; F.texts.length = 0;
    F.shakeAmp = 0; F.flashA = 0; F.zoom = 0;
  };

  F.spawn = function (p) {
    if (F.parts.length >= MAX_PARTS) return;
    p.max = p.life;
    if (p.grav == null) p.grav = 0;
    if (p.drag == null) p.drag = 0;
    if (!p.kind) p.kind = 'glow';
    F.parts.push(p);
  };

  // o: n, color, speed [a,b], life [a,b], size [a,b], angle, spread, grav, drag, kind
  F.burst = function (x, y, o) {
    const n = o.n || 8;
    const sp = o.speed || [60, 240];
    const lf = o.life || [0.25, 0.6];
    const sz = o.size || [3, 7];
    const spread = o.spread == null ? G.TAU : o.spread;
    const ang = o.angle || 0;
    for (let i = 0; i < n; i++) {
      const a = ang + G.rand(-spread / 2, spread / 2);
      const v = G.rand(sp[0], sp[1]);
      F.spawn({
        x: x + (o.jitter ? G.rand(-o.jitter, o.jitter) : 0),
        y: y + (o.jitter ? G.rand(-o.jitter, o.jitter) : 0),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: G.rand(lf[0], lf[1]), size: G.rand(sz[0], sz[1]),
        color: o.color || G.COL.white, grav: o.grav || 0, drag: o.drag || 0,
        kind: o.kind || 'glow', rot: G.rand(0, 6.28), vr: G.rand(-8, 8),
      });
    }
  };

  F.ring = function (x, y, o) {
    F.rings.push({
      x, y, r0: o.r0 || 0, r1: o.r1 || 120, life: o.life || 0.4, max: o.life || 0.4,
      width: o.width || 4, color: o.color || G.COL.white, alpha: o.alpha || 0.9,
    });
  };

  F.text = function (x, y, str, o) {
    o = o || {};
    F.texts.push({
      x, y, str, color: o.color || G.COL.white, size: o.size || 18,
      life: o.life || 0.8, max: o.life || 0.8, vy: o.vy == null ? -60 : o.vy, bold: o.bold !== false,
    });
  };

  F.shake = function (a) { F.shakeAmp = Math.max(F.shakeAmp, a); };
  F.flash = function (color, a, dur) {
    F.flashC = color; F.flashA = Math.max(F.flashA, a); F.flashDecay = a / (dur || 0.25);
  };
  F.stop = function (t) { G.hitstop = Math.max(G.hitstop || 0, t); };
  F.slow = function (scale, dur) { G.slowScale = scale; G.slowT = dur; };
  F.punch = function (z) { F.zoom = Math.max(F.zoom, z); };

  F.update = function (dt) {
    const parts = F.parts;
    let w = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'chunk') {
        p.rot += p.vr * dt;
        if (p.y > G.FLOOR - 2 && p.vy > 0) { p.y = G.FLOOR - 2; p.vy *= -0.35; p.vx *= 0.6; p.vr *= 0.5; }
      }
      parts[w++] = p;
    }
    parts.length = w;

    w = 0;
    for (let i = 0; i < F.rings.length; i++) {
      const r = F.rings[i];
      r.life -= dt;
      if (r.life > 0) F.rings[w++] = r;
    }
    F.rings.length = w;

    w = 0;
    for (let i = 0; i < F.texts.length; i++) {
      const t = F.texts[i];
      t.life -= dt; t.y += t.vy * dt; t.vy *= Math.exp(-3 * dt);
      if (t.life > 0) F.texts[w++] = t;
    }
    F.texts.length = w;
  };

  // Uses real time so shake and flashes keep moving through hit-freeze.
  F.updateScreen = function (dt) {
    F.shakeAmp *= Math.exp(-9 * dt);
    if (F.shakeAmp < 0.2) F.shakeAmp = 0;
    const s = F.shakeAmp * G.settings.shake;
    F.shakeX = G.rand(-s, s); F.shakeY = G.rand(-s, s);
    if (F.flashA > 0) F.flashA = Math.max(0, F.flashA - F.flashDecay * dt);
    F.zoom *= Math.exp(-7 * dt);
    if (F.zoom < 0.0005) F.zoom = 0;
  };

  F.draw = function (ctx) {
    const parts = F.parts;
    // solid debris first
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.kind !== 'chunk') continue;
      const k = p.life / p.max;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, k * 3);
      ctx.fillStyle = G.rgba(p.color, 1);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.kind === 'chunk') continue;
      const k = p.life / p.max;
      if (p.kind === 'spark') {
        ctx.strokeStyle = G.rgba(p.color, k);
        ctx.lineWidth = p.size * (0.4 + 0.6 * k);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
        ctx.stroke();
      } else {
        const s = p.size * (0.5 + 0.5 * k) * 2.2;
        ctx.globalAlpha = k;
        ctx.drawImage(F.glow(p.color), p.x - s, p.y - s, s * 2, s * 2);
        ctx.globalAlpha = 1;
      }
    }
    for (let i = 0; i < F.rings.length; i++) {
      const r = F.rings[i];
      const k = 1 - r.life / r.max;
      const rad = G.lerp(r.r0, r.r1, G.ease.outCubic(k));
      ctx.strokeStyle = G.rgba(r.color, r.alpha * (1 - k));
      ctx.lineWidth = r.width * (1 - k * 0.7);
      ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0.1, rad), 0, G.TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < F.texts.length; i++) {
      const t = F.texts[i];
      const k = t.life / t.max;
      const pop = 1 + 0.35 * Math.max(0, (k - 0.8) / 0.2);
      ctx.font = (t.bold ? '700 ' : '500 ') + Math.round(t.size * pop) + 'px Bahnschrift, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,' + 0.55 * Math.min(1, k * 2) + ')';
      ctx.fillText(t.str, t.x + 1.5, t.y + 2);
      ctx.fillStyle = G.rgba(t.color, Math.min(1, k * 2));
      ctx.fillText(t.str, t.x, t.y);
    }
  };

  F.drawFlash = function (ctx) {
    if (F.flashA <= 0) return;
    ctx.fillStyle = G.rgba(F.flashC, Math.min(1, F.flashA));
    ctx.fillRect(-60, -60, G.W + 120, G.H + 120);
  };
})();
