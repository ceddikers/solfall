// Solfall - corruption. A portal of a boss already beaten can turn corrupted (run.js): an optional,
// far harder fight for a second relic and triple Sunshards. A corrupted boss is plainly not itself:
// its arena is drained to void and crimson, and the boss is a pitch-black shape of itself with a thin
// crimson edge, only its eyes and glows burning through, crimson lightning crackling off it, a dark
// aura bleeding black motes, two torn shadows drifting off it, and now and then the whole figure
// tearing sideways for a moment. Each boss also has two attacks only its corrupted self uses.
'use strict';
(function () {
  const F = G.fx, rnd = G.rand;
  const C = G.corrupt = { tear: 0, tearT: 1.2, t: 0 };
  const VOID = '16,3,10', BLOOD = '235,30,80';

  // colour helpers for the palettes: '#rrggbb' and 'r,g,b' strings
  const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (a) => '#' + a.map((v) => Math.round(G.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mixHex = (a, b, k) => { const x = hex2(a), y = hex2(b); return toHex(x.map((v, i) => v + (y[i] - v) * k)); };
  const mixRgb = (a, b, k) => { const x = a.split(',').map(Number), y = b.split(',').map(Number); return x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(','); };
  const SKY = ['#000000', '#100208', '#360614', '#9a1a3c'];

  // The palette set for a corrupted boss, made from its own and kept like any other theme.
  C.theme = function (id) {
    const key = 'corrupt_' + id;
    if (G.THEMES[key]) return key;
    const src = G.THEMES[id] || G.THEMES.warden, out = [null];
    for (let i = 1; i <= 3; i++) {
      const p = src[i], q = Object.assign({}, p);
      q.sky = p.sky.map((c, k) => mixHex(c, SKY[k], 0.7));
      q.far = mixHex(p.far, '#0c0208', 0.6); q.near = mixHex(p.near, '#070105', 0.6); q.pillar = mixHex(p.pillar, '#030002', 0.6);
      q.floorTop = mixHex(p.floorTop, '#3a0a1a', 0.6); q.floor = mixHex(p.floor, '#0a0206', 0.6);
      q.rim = mixRgb(p.rim, '255,60,95', 0.65);
      q.boss = mixRgb(p.boss, BLOOD, 0.55);
      q.hot = mixRgb(p.hot, '255,206,220', 0.5);
      q.ember = mixRgb(p.ember, '255,50,90', 0.7);
      q.stars = (p.stars || 0) * 0.3;
      if (p.moon) q.moon = Object.assign({}, p.moon, { col: mixRgb(p.moon.col, '255,70,100', 0.75) });
      out[i] = q;
    }
    out[4] = src[4];
    G.THEMES[key] = out;
    return key;
  };

  // Is this fight against a corrupted boss? (G.debug.corrupt forces it, for tests and practice.)
  C.on = () => (G.run.corrupt && !G.practice) || !!G.debug.corrupt;
  C.active = () => C.on() && (G.state === 'fight' || G.state === 'won' || G.state === 'dead') && G.boss && G.boss.core;
  // the colours a corrupted attack is drawn in: void, blood, and the hot pale pink at its heart
  C.COL = { void: VOID, blood: BLOOD, hot: '255,206,220', dark: '#050003' };

  // Each boss has two attacks only its corrupted self uses (B.corruptBags: { 1: [a], 2: [a, b], 3: [a, b] }),
  // added to its bag in each phase. A corrupted fight opens on the first, and phase II on the second,
  // so both are seen. Returns the extra names for this phase, or none.
  C.extra = (B, phase) => (C.on() && B.corruptBags && B.corruptBags[phase]) || [];
  C.opener = function (B, phase) {
    if (!C.on() || !B.corruptBags) return '';
    const now = B.corruptBags[phase] || [], before = B.corruptBags[phase - 1] || [];
    return now.find((n) => !before.includes(n)) || '';
  };

  // ------------------------------------------------------------------ the living part
  // Where lightning can leave the boss from: the boxes it can be hit in (its body, the Warden's core
  // and hands), or its core when it has none just now.
  function parts() {
    const B = G.boss, out = (B.targets ? B.targets() : []).filter((t) => t.hw > 0 && t.hh > 0);
    if (!out.length && B.core) { const r = B.core.r || 40; out.push({ cx: B.core.x, cy: B.core.y, hw: r, hh: r }); }
    return out;
  }
  // a jagged line from (x0, y0) to (x1, y1), with one fork now and then
  function jag(x0, y0, x1, y1, rough) {
    const n = 5 + ((Math.random() * 4) | 0), dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const k = i / n, o = rnd(-1, 1) * rough * Math.sin(k * Math.PI); pts.push([x0 + dx * k + nx * o, y0 + dy * k + ny * o]); }
    pts.push([x1, y1]);
    return pts;
  }
  // A bolt crackles for a tenth of a second or so, re-forming its path every few frames.
  function bolt(kind) {
    const ps = parts();
    if (!ps.length) return;
    const p = ps[(Math.random() * ps.length) | 0], a = rnd(0, G.TAU);
    const sx = p.cx + Math.cos(a) * p.hw * 0.8, sy = p.cy + Math.sin(a) * p.hh * 0.8;
    let ex, ey;
    if (kind === 'ground') { ex = sx + rnd(-90, 90); ey = G.FLOOR; }
    else if (kind === 'link' && ps.length > 1) { const q = ps.find((o) => o !== p); ex = q.cx + rnd(-q.hw, q.hw) * 0.5; ey = q.cy + rnd(-q.hh, q.hh) * 0.5; }
    else { const len = rnd(46, 130); ex = sx + Math.cos(a) * len; ey = Math.min(G.FLOOR, sy + Math.sin(a) * len); }
    const life = rnd(0.08, 0.2);
    C.bolts.push({ sx, sy, ex, ey, t: 0, life, re: 0, pts: null, fork: Math.random() < 0.45, w: kind === 'link' ? 2.6 : rnd(1.6, 2.4) });
  }

  C.bolts = [];
  C.update = function (dt) {
    if (!C.active()) { C.tear = 0; C.bolts.length = 0; return; }
    C.t += dt;
    const B = G.boss, c = B.core;
    // the tear: every second or two the figure jerks sideways for a twentieth of a second
    C.tearT -= dt;
    if (C.tearT <= 0) { C.tearT = rnd(0.7, 2.2); C.tear = rnd(8, 16) * (Math.random() < 0.5 ? -1 : 1); }
    else C.tear *= Math.exp(-dt * 30);
    // the lightning: short arcs crackling off it all the time, now and then one to the ground or (with
    // more than one part, the Warden) jumping between its parts; in bursts, a few at once
    for (const b of C.bolts) { b.t += dt; b.re -= dt; }
    C.bolts = C.bolts.filter((b) => b.t < b.life);
    if (!B.dead) {
      if (Math.random() < dt * 7) { const n = Math.random() < 0.25 ? 3 : 1; for (let i = 0; i < n; i++) bolt('arc'); }
      if (Math.random() < dt * 0.9) { bolt('ground'); G.fx.spawn({ kind: 'spark', x: B.body ? B.body.x + rnd(-60, 60) : c.x, y: G.FLOOR - 2, vx: rnd(-160, 160), vy: -rnd(80, 260), life: rnd(0.15, 0.3), size: 1.6, color: BLOOD, len: 0.05 }); }
      if (Math.random() < dt * 1.4) bolt('link');
    }
    if (B.dead) return;
    // black motes bleeding upwards off it, and now and then a crimson spark
    const r = (c.r || 40) + 30;
    if (Math.random() < dt * 26) F.spawn({ x: c.x + rnd(-r, r), y: c.y + rnd(-r, r * 0.8), vx: rnd(-14, 14), vy: -rnd(30, 90), life: rnd(0.6, 1.3), size: rnd(4, 9), color: VOID, wob: 40, rot: rnd(0, 6) });
    if (Math.random() < dt * 6) F.spawn({ kind: 'spark', x: c.x + rnd(-r, r), y: c.y + rnd(-r, r), vx: rnd(-160, 160), vy: rnd(-160, 60), life: rnd(0.12, 0.3), size: rnd(1.2, 2.2), color: BLOOD, len: 0.06 });
  };

  // ------------------------------------------------------------------ drawing
  // A corrupted boss is drawn as a pitch-black shape of itself. It is drawn once, as itself, to a
  // canvas of its own (A); from that come a black silhouette (S), the same shape in crimson for its
  // edge (R), and its brightest parts only (its eyes, its glows, a hit's flash) turned crimson (H).
  // On the screen: the dark aura, a soft crimson edge, two torn shadows, the black shape, then the
  // eyes burning through it, then the lightning. Nothing in it is bright except thin lines.
  const cv = {};
  function layer(name, w, h) {
    let c = cv[name];
    if (!c) { c = cv[name] = document.createElement('canvas'); c.x = c.getContext('2d'); }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    c.x.setTransform(1, 0, 0, 1, 0, 0); c.x.globalCompositeOperation = 'source-over'; c.x.globalAlpha = 1; c.x.filter = 'none';
    c.x.clearRect(0, 0, w, h);
    return c;
  }
  function tint(dst, src, col) {
    const x = dst.x;
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, dst.width, dst.height);
    x.globalCompositeOperation = 'source-over';
  }

  // Draw something of the boss's as a pitch-black shape of itself (see above). With `torn`, the two
  // torn shadows drift off it and it jerks sideways with the tear (the whole boss); without, it is just
  // the black shape, its edge and its eyes (parts of a boss drawn elsewhere, like the Leviathan's coils
  // far out in the sea, drawn by its drawGround).
  C.drawing = false;
  // (v2.9j) Where on the screen the work is done. Every layer used to be the whole screen, about
  // sixteen full-screen passes a frame, which is what made corrupted fights lag. A boss drawn round
  // its core (the duelling bosses) is now worked in a box round it: wide enough for its reach, from
  // the floor up past its head, plus B.silTop() for anything it raises higher (Kairo's Sun). A boss
  // that draws across the arena (the Assassin's clones and threads, the Mage's crystals, the Wolf's
  // pack: B.silWide) keeps the whole width but not the whole height. The Warden (v2.9m) gives its own
  // box, B.silBox, round its eye, hands and shards. The Leviathan's far coils and Sol (B.silFull) still
  // use it all. Checked by drawing every corrupted
  // duelling boss through whole bot fights and looking for any of it on the box's edge.
  const val = (v) => (typeof v === 'function' ? v() : v);
  function region(m, W, H, torn) {
    const B = G.boss, c = B && B.core;
    if (torn && B && B.silBox) {
      // (v2.9m) a boss that says where it is drawn (the Warden: its eye, hands and shards)
      const b = B.silBox();
      if (!b) return { x: 0, y: 0, w: W, h: H };
      const k = m.a || 1, edge = 14 * k + Math.abs(C.tear || 0) * k;
      const x0 = Math.max(0, Math.floor(m.a * b.l + m.e - edge)), x1 = Math.min(W, Math.ceil(m.a * b.r + m.e + edge));
      const y0 = Math.max(0, Math.floor(m.d * b.t + m.f - edge)), y1 = Math.min(H, Math.ceil(m.d * b.b + m.f + edge));
      if (x1 - x0 < 8 || y1 - y0 < 8) return { x: 0, y: 0, w: W, h: H };
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    if (!torn || !B || !B.kit || val(B.silFull) || !c) return { x: 0, y: 0, w: W, h: H };
    const padX = Math.max(330, (B.w || 80) * 1.6 + 220) + Math.abs(C.tear || 0);
    const top = c.y - (B.h || 100) - 330 - (B.silTop ? B.silTop() : 0), bot = G.FLOOR + 150;
    const k = m.a || 1, edge = 14 * k; // (room for the soft edge and the torn shadows)
    const wide = val(B.silWide);
    const x0 = wide ? 0 : Math.max(0, Math.floor(m.a * (c.x - padX) + m.e - edge)), x1 = wide ? W : Math.min(W, Math.ceil(m.a * (c.x + padX) + m.e + edge));
    const y0 = Math.max(0, Math.floor(m.d * top + m.f - edge)), y1 = Math.min(H, Math.ceil(m.d * bot + m.f + edge));
    if (x1 - x0 < 8 || y1 - y0 < 8) return { x: 0, y: 0, w: W, h: H };
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  C.region = region; // (for the console and tests)
  C.silhouette = function (ctx, draw, torn) {
    const t = C.t, W = ctx.canvas.width, H = ctx.canvas.height;
    // the boss as itself, off screen, in the same place it would be drawn (within its box)
    const m = ctx.getTransform(), bx = region(m, W, H, torn), w = bx.w, h = bx.h;
    const A = layer('a', w, h);
    A.x.setTransform(m.a, m.b, m.c, m.d, m.e - bx.x, m.f - bx.y); if (torn) A.x.translate(C.tear, 0);
    C.drawing = true;
    try { draw(A.x); } finally { C.drawing = false; }
    if (C.check) C.check(A, bx, W, H);
    const S = layer('s', w, h); tint(S, A, '#020003');
    const R = layer('r', w, h); tint(R, A, 'rgb(235,30,80)');
    // its brightest parts: grey, then pushed hard so only what was near white is left, then crimson.
    // (v2.9j: at half size, drawn back up; they are glows, and the filter was the dearest pass)
    const hw = Math.ceil(w / 2), hh = Math.ceil(h / 2), Hl = layer('h', hw, hh);
    Hl.x.filter = 'grayscale(1) brightness(0.85) contrast(7)'; Hl.x.drawImage(A, 0, 0, hw, hh); Hl.x.filter = 'none';
    Hl.x.globalCompositeOperation = 'multiply'; Hl.x.fillStyle = 'rgb(255,64,104)'; Hl.x.fillRect(0, 0, hw, hh);
    Hl.x.globalCompositeOperation = 'destination-in'; Hl.x.drawImage(A, 0, 0, hw, hh);
    // (v2.9j) the soft edge: the crimson shape at a quarter size, stretched back up, which blurs it
    // without a blur filter (the other dear pass)
    const qw = Math.ceil(w / 4), qh = Math.ceil(h / 4), Q = layer('q', qw, qh);
    Q.x.drawImage(R, 0, 0, qw, qh);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, bx.x, bx.y);
    ctx.imageSmoothingEnabled = true;
    const k = m.a || 1, flick = 0.75 + 0.25 * Math.sin(t * 31) * Math.sin(t * 17);
    // a soft crimson edge round the black, so the shape still reads against a dark arena
    ctx.globalAlpha = 0.32 * flick; ctx.drawImage(Q, 0, 0, w, h);
    ctx.globalAlpha = 0.7;
    for (const [dx, dy] of [[-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6]]) ctx.drawImage(R, dx * k, dy * k);
    if (torn) {
      // two torn shadows drifting off it
      const drift = (5 + 3 * Math.sin(t * 2.3) + Math.abs(C.tear) * 0.6) * k;
      ctx.globalAlpha = 0.3; ctx.drawImage(S, -drift, Math.sin(t * 9) * 2 * k);
      ctx.globalAlpha = 0.22; ctx.drawImage(S, drift, -Math.sin(t * 7) * 2 * k);
    }
    // the shape itself, pitch black, and what burns through it
    ctx.globalAlpha = 1; ctx.drawImage(S, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.95; ctx.drawImage(Hl, 0, 0, w, h);
    ctx.restore();
  };

  C.drawBoss = function (ctx, draw) {
    const B = G.boss, c = B.core, t = C.t, r = (c.r || 40) * 2.4 + 120;
    // the aura: a darkness that eats the light around it, with a crimson edge that will not settle
    ctx.save();
    const g = ctx.createRadialGradient(c.x, c.y, r * 0.15, c.x, c.y, r);
    g.addColorStop(0, 'rgba(6,0,4,0.55)'); g.addColorStop(0.6, 'rgba(6,0,4,0.3)'); g.addColorStop(1, 'rgba(6,0,4,0)');
    ctx.fillStyle = g; ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(BLOOD, 0.14 + 0.08 * Math.sin(t * 7)); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i / 40 * G.TAU, w = r * (0.62 + 0.05 * Math.sin(a * 5 + t * 3) + 0.04 * Math.sin(a * 11 - t * 5));
      if (i) ctx.lineTo(c.x + Math.cos(a) * w, c.y + Math.sin(a) * w * 0.8); else ctx.moveTo(c.x + Math.cos(a) * w, c.y + Math.sin(a) * w * 0.8);
    }
    ctx.stroke();
    ctx.restore();

    // anything the boss draws that is not its body (the Leviathan's flotsam, waves and surge) is drawn
    // as it is, behind and in front of the black shape: B.corruptBehind / B.corruptFront. While the
    // body is being drawn off screen, C.drawing is true so the boss can leave those out of it.
    if (B.corruptBehind) B.corruptBehind(ctx);
    C.silhouette(ctx, draw, true);
    if (B.corruptFront) B.corruptFront(ctx);

    // the lightning: a crimson line with a pale core, flickering, re-forming as it crackles
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const b of C.bolts) {
      if (!b.pts || b.re <= 0) {
        b.re = 0.035;
        const rough = Math.hypot(b.ex - b.sx, b.ey - b.sy) * 0.22;
        b.pts = jag(b.sx, b.sy, b.ex, b.ey, rough);
        if (b.fork) { const i = 2 + ((Math.random() * (b.pts.length - 3)) | 0), p = b.pts[i]; b.forkPts = jag(p[0], p[1], p[0] + rnd(-50, 50), p[1] + rnd(-40, 40), 10); }
      }
      const life = 1 - b.t / b.life, a = (Math.random() < 0.2 ? 0.35 : 1) * life;
      for (const [w, col, al] of [[b.w * 2.6, BLOOD, 0.22], [b.w, '255,70,110', 0.85], [b.w * 0.4, '255,226,236', 0.8]]) {
        ctx.strokeStyle = G.rgba(col, al * a); ctx.lineWidth = w;
        ctx.beginPath();
        for (const pts of [b.pts, b.forkPts && b.fork ? b.forkPts : null]) {
          if (!pts) continue;
          pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  };
})();
