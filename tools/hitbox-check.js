// Solfall - hitbox check: compares every hitbox with what is drawn, for the bosses and the heroes.
//
//   fetch('/tools/hitbox-check.js').then(r => r.text()).then(t => console.log((0, eval)(t)))
//
// What it measures (all in pixels of the 1280x720 arena):
//   Boss attacks. Every hazard (and every blow a boss deals with its own body) is played out with the
//   attack forced, and at each sampled moment the hero is put at every spot in the arena to see where
//   it would be hit. Then:
//     over   how far from anything drawn a hero can stand and still be hit (0 is right: a hit should
//            never come from empty air; the worst spot is reported);
//     under  how deep into what the hazard draws a hero can stand and NOT be hit (some is fair, since
//            glow and trails are drawn; past ~20 px a hero touching it bright and solid walks through).
//   Boss bodies. The boxes a hero's blows can strike (B.targets) against the drawn body:
//     fill   how much of each box has the body in it (low: blows land on air);
//     miss   how far the body is drawn outside every box (high: a blow through it does nothing).
//   Heroes. The hero's own box against its figure, each cut's box against the cut it draws, and each
//   shot's box against the shot.
// Options: window.HB_PART = 'bosses' | 'heroes'; window.HB_BOSSES = ['knight']; window.HB_ONLY = ['cleave'];
// window.HB_HEROES = ['eos']; window.HB_SHOTS = 8399 posts a picture of each worst case to a local
// receiver (grey: drawn; orange: drawn by that hazard; red: where it hits; magenta: hit from empty air).
// window.HB_JSON = true returns the raw rows.
(function () {
  'use strict';
  const I = G.input, D = 1 / 120, FLOOR = G.FLOOR, P = G.player;
  const SC = 0.5, OX = 240, OY = 820;                       // one cell is 2 px; the mask spans x -240..1520, y -820..780
  const CW = Math.ceil((G.W + 2 * OX) * SC), CH = Math.ceil((OY + 780) * SC), N = CW * CH;
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const errors = [], rows = [], pics = [];
  const ci = (x) => Math.floor((x + OX) * SC), cj = (y) => Math.floor((y + OY) * SC);
  const clampI = (i) => Math.max(0, Math.min(CW - 1, i)), clampJ = (j) => Math.max(0, Math.min(CH - 1, j));

  // ------------------------------------------------------------------ masks
  // what is drawn solidly (alpha over 0.55), and with faint: true also what is drawn at all (over 0.2),
  // which is what counts as "something there" when a hit is judged (a translucent pool is still seen)
  function mask(draw, faint) {
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    cx.clearRect(0, 0, CW, CH);
    cx.save();
    cx.setTransform(SC, 0, 0, SC, OX * SC, OY * SC);
    try { draw(cx); } catch (e) { errors.push('draw: ' + e.message); }
    cx.restore();
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    const d = cx.getImageData(0, 0, CW, CH).data, m = new Uint8Array(N);
    let n = 0;
    for (let i = 0; i < N; i++) if (d[i * 4 + 3] > 140) { m[i] = 1; n++; }
    m.count = n;
    if (faint) {
      const f = new Uint8Array(N); let nf = 0;
      for (let i = 0; i < N; i++) if (d[i * 4 + 3] > 50) { f[i] = 1; nf++; }
      f.count = nf; m.faint = f;
    }
    return m;
  }
  function or(a, b) { const m = new Uint8Array(N); let n = 0; for (let i = 0; i < N; i++) if (a[i] || b[i]) { m[i] = 1; n++; } m.count = n; return m; }
  function minus(a, b) { const m = new Uint8Array(N); let n = 0; for (let i = 0; i < N; i++) if (a[i] && !b[i]) { m[i] = 1; n++; } m.count = n; return m; }
  function prefix(m) {
    const W = CW + 1, p = new Int32Array(W * (CH + 1));
    for (let j = 0; j < CH; j++) { let row = 0; for (let i = 0; i < CW; i++) { row += m[j * CW + i]; p[(j + 1) * W + i + 1] = p[j * W + i + 1] + row; } }
    return p;
  }
  function rectSum(p, i0, j0, i1, j1) {
    i0 = clampI(i0); j0 = clampJ(j0); i1 = clampI(i1); j1 = clampJ(j1);
    if (i1 < i0 || j1 < j0) return 0;
    const W = CW + 1;
    return p[(j1 + 1) * W + i1 + 1] - p[j0 * W + i1 + 1] - p[(j1 + 1) * W + i0] + p[j0 * W + i0];
  }
  // distance (in px) from each cell to the nearest set cell of m
  function dist(m) {
    const d = new Float32Array(N), INF = 1e9, R = 1.4142;
    for (let k = 0; k < N; k++) d[k] = m[k] ? 0 : INF;
    for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
      const k = j * CW + i; let v = d[k];
      if (i > 0 && d[k - 1] + 1 < v) v = d[k - 1] + 1;
      if (j > 0) {
        if (d[k - CW] + 1 < v) v = d[k - CW] + 1;
        if (i > 0 && d[k - CW - 1] + R < v) v = d[k - CW - 1] + R;
        if (i < CW - 1 && d[k - CW + 1] + R < v) v = d[k - CW + 1] + R;
      }
      d[k] = v;
    }
    for (let j = CH - 1; j >= 0; j--) for (let i = CW - 1; i >= 0; i--) {
      const k = j * CW + i; let v = d[k];
      if (i < CW - 1 && d[k + 1] + 1 < v) v = d[k + 1] + 1;
      if (j < CH - 1) {
        if (d[k + CW] + 1 < v) v = d[k + CW] + 1;
        if (i < CW - 1 && d[k + CW + 1] + R < v) v = d[k + CW + 1] + R;
        if (i > 0 && d[k + CW - 1] + R < v) v = d[k + CW - 1] + R;
      }
      d[k] = v;
    }
    for (let k = 0; k < N; k++) d[k] /= SC;
    return d;
  }
  // a mask of shapes: rects {cx, cy, hw, hh} and circles {x|cx, y|cy, r}
  function shapes(list) {
    const m = new Uint8Array(N); let n = 0;
    for (const s of list) {
      const x = s.cx != null ? s.cx : s.x, y = s.cy != null ? s.cy : s.y;
      if (s.r) {
        for (let j = clampJ(cj(y - s.r)); j <= clampJ(cj(y + s.r)); j++) for (let i = clampI(ci(x - s.r)); i <= clampI(ci(x + s.r)); i++) {
          const wx = i / SC - OX + 1, wy = j / SC - OY + 1;
          if ((wx - x) ** 2 + (wy - y) ** 2 <= s.r * s.r && !m[j * CW + i]) { m[j * CW + i] = 1; n++; }
        }
      } else {
        for (let j = clampJ(cj(y - s.hh)); j <= clampJ(cj(y + s.hh) - 1); j++) for (let i = clampI(ci(x - s.hw)); i <= clampI(ci(x + s.hw) - 1); i++) if (!m[j * CW + i]) { m[j * CW + i] = 1; n++; }
      }
    }
    m.count = n;
    return m;
  }
  function p95(arr) { if (!arr.length) return 0; arr.sort((a, b) => a - b); return arr[Math.floor(arr.length * 0.95)]; }

  // ------------------------------------------------------------------ where a hazard hits
  // The hero is put at every spot (feet at x, y) and asked; P.box() follows P.x and P.y.
  function probe(pred) {
    const sx = P.x, sy = P.y, pad = P.pad, out = [];
    P.pad = 0;
    try {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      // (feet no higher than 40 px from the top of the view: no hero gets above that)
      for (let y = FLOOR; y >= 40; y -= 12) for (let x = G.WALL_L + 11; x <= G.WALL_R - 11; x += 12) {
        P.x = x; P.y = y;
        if (pred(P)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      }
      if (x0 > x1) return out;
      x0 = Math.max(G.WALL_L + 11, x0 - 14); x1 = Math.min(G.WALL_R - 11, x1 + 14); y0 = Math.max(40, y0 - 14); y1 = Math.min(FLOOR, y1 + 14);
      for (let y = y0; y <= y1; y += 4) for (let x = x0; x <= x1; x += 4) { P.x = x; P.y = y; if (pred(P)) out.push(x, y); }
    } catch (e) { errors.push('hits: ' + e.message); }
    P.x = sx; P.y = sy; P.pad = pad;
    return out;
  }
  // hits: probe output; fair: what may hit (its own drawing, and the boss's body); own: what it draws
  function judge(hits, fair, own) {
    const pf = prefix(fair), df = dist(fair), U = new Int32Array((CW + 1) * (CH + 1)), W = CW + 1;
    let over = 0, unfair = 0;
    const bad = [];
    for (let k = 0; k < hits.length; k += 2) {
      const x = hits[k], y = hits[k + 1];
      const i0 = ci(x - 11), i1 = ci(x + 11) - 1, j0 = cj(y - 43), j1 = cj(y - 1) - 1;
      if (!rectSum(pf, i0 - 1, j0 - 1, i1 + 1, j1 + 1)) {
        unfair++;
        let best = 1e9;
        for (let j = clampJ(j0); j <= clampJ(j1); j++) for (let i = clampI(i0); i <= clampI(i1); i++) if (df[j * CW + i] < best) best = df[j * CW + i];
        if (best > over) over = best;
        bad.push(x, y);
      }
      const a0 = clampI(i0), a1 = clampI(i1) + 1, b0 = clampJ(j0), b1 = clampJ(j1) + 1;
      U[b0 * W + a0]++; U[b0 * W + a1]--; U[b1 * W + a0]--; U[b1 * W + a1]++;
    }
    const um = new Uint8Array(N);
    for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
      const k = j * W + i;
      if (i > 0) U[k] += U[k - 1];
      if (j > 0) U[k] += U[k - W];
      if (i > 0 && j > 0) U[k] -= U[k - W - 1];
      if (U[k] > 0) um[j * CW + i] = 1;
    }
    let under = 0, cover = 1;
    const deep = [];
    if (own && own.count) {
      const du = dist(um);
      let miss = 0;
      const below = cj(FLOOR + 2) * CW; // (what is drawn under the floor cannot be touched)
      let cnt = 0;
      for (let k = 0; k < below; k++) if (own[k]) { cnt++; if (!um[k]) { miss++; deep.push(du[k]); } }
      cover = 1 - miss / Math.max(1, cnt);
      under = p95(deep);
    }
    return { n: hits.length / 2, over: Math.round(over), unfair, under: Math.round(under), cover, um, bad };
  }

  // a picture of one case: grey what is drawn, orange its own drawing, red where it hits, magenta empty-air hits
  function picture(fair, own, um, bad, extra) {
    const img = cx.createImageData(CW, CH), d = img.data;
    for (let k = 0; k < N; k++) {
      let r = 0, g = 0, b = 0, a = 255;
      if (fair[k]) { r = g = b = 110; }
      if (own && own[k]) { r = 240; g = 150; b = 40; }
      if (um && um[k]) { r = Math.min(255, r * 0.5 + 150); g *= 0.4; b *= 0.4; }
      if (extra && extra[k]) { r = 60; g = 220; b = 255; }
      d[k * 4] = r; d[k * 4 + 1] = g; d[k * 4 + 2] = b; d[k * 4 + 3] = a;
    }
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.putImageData(img, 0, 0);
    cx.strokeStyle = '#444'; cx.beginPath(); cx.moveTo(0, cj(FLOOR)); cx.lineTo(CW, cj(FLOOR)); cx.stroke();
    cx.fillStyle = '#f0f';
    for (let k = 0; k < (bad || []).length; k += 2) cx.fillRect(ci(bad[k]) - 1, cj(bad[k + 1] - 22) - 1, 3, 3);
    // cropped to what is in it, at four times the size of a cell (2 px a world px)
    let i0 = CW, i1 = 0, j0 = CH, j1 = 0;
    for (let k = 0; k < N; k++) {
      if (!(fair[k] || (own && own[k]) || (um && um[k]) || (extra && extra[k]))) continue;
      const i = k % CW, j = (k / CW) | 0;
      if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j;
    }
    if (i1 < i0) return cv.toDataURL('image/png');
    i0 = clampI(i0 - 24); i1 = clampI(i1 + 24); j0 = clampJ(j0 - 24); j1 = clampJ(j1 + 24);
    const w = i1 - i0 + 1, h = j1 - j0 + 1, z = Math.max(1, Math.min(4, Math.floor(900 / Math.max(w, h))));
    const out = document.createElement('canvas'); out.width = w * z; out.height = h * z;
    const o = out.getContext('2d'); o.imageSmoothingEnabled = false;
    o.drawImage(cv, i0, j0, w, h, 0, 0, w * z, h * z);
    return out.toDataURL('image/png');
  }

  // ------------------------------------------------------------------ blows a boss deals with its own body
  // (these are checked in each boss's update, not as hazards; kept in step with those lines by hand)
  const rect = (r) => (Q) => G.rectsOverlap(Q.box(), r);
  function bodyBlows(id, B) {
    const b = B.body, out = [];
    if (!b && id !== 'warden') return out; // (the Warden has no body: its hands, core and halo are below)
    if (id === 'knight' && b.hurt) out.push({ kind: 'body', pred: rect({ cx: b.x + b.face * 6, cy: b.y - 52, hw: 30, hh: 48 }) });
    if (id === 'leviathan' && b.hurt) out.push({ kind: 'bite', pred: rect({ cx: b.x + b.face * 10, cy: b.y - 34, hw: 54, hh: 28 }) });
    if (id === 'wolf' && b.air && !b.hidden) out.push({ kind: 'body', pred: (Q) => B.contactHits(Q.box()) });
    if (id === 'assassin') {
      const box = (a) => {
        if (a.pose === 'drawHi') return { cx: a.x + (a.face || 1) * 6, cy: a.y - 40, hw: 14, hh: 26 };
        const low = a.pose === 'dash'; return { cx: a.x, cy: a.y - (low ? 28 : 40), hw: low ? 26 : 16, hh: low ? 26 : 38 };
      };
      if (b.hurt && !b.hidden) out.push({ kind: 'body', pred: rect(box(b)) });
      for (const c of B.clones || []) if (c.hurt) out.push({ kind: 'clone', pred: rect(box(c)) });
      if ((B.wires || []).length && !B.staggered) {
        const ws = B.wires.filter((w) => w.k >= 1);
        if (ws.length) out.push({ kind: 'wire', pred: (Q) => ws.some((w) => G.distPointSeg(Q.x, Q.y - 22, w.x0, w.y0, w.x1, w.y1) <= 17) });
      }
    }
    if (id === 'warden' && B.handBox) {
      for (const h of B.hands) {
        if (!h.hurt || !(h.alive && h.broken <= 0)) continue;
        const r = B.handBox(h); r.hw *= 0.8; r.hh *= 0.88;
        out.push({ kind: 'hand', pred: rect(r) });
      }
      const c = B.core;
      if (c.hurt) out.push({ kind: 'core', pred: (Q) => G.circleRect(c.x, c.y, c.r * 0.88, Q.box()) });
      if (B.haloHurt && B.hasShards) {
        const pts = [];
        for (let i = 0; i < 6; i++) { const a = B.shardA + i * G.TAU / 6; pts.push([c.x + Math.cos(a) * B.shardR, c.y + Math.sin(a) * B.shardR]); }
        out.push({ kind: 'halo', pred: (Q) => pts.some(([sx, sy]) => sy < FLOOR + 10 && G.circleRect(sx, sy, 17, Q.box())) });
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ the bosses
  // what a boss draws over the arena counts too (the Leviathan's rollers and breakers), except the Veil's darkness
  const drawBoss = (B) => (c) => { B.draw(c); if (B.drawOver && B !== G.bosses.assassin) B.drawOver(c); };
  function settle(B, limit) { let t = 0; while (t < limit && (!B.active || B.invuln || B.staggered)) { G.step(D); t += D; } }
  function stage(id, phase, corrupt) {
    G.debug.boss = id; G.debug.forceAttack = ''; G.debug.god = true; G.debug.corrupt = corrupt;
    for (const k in I.down) I.down[k] = false;
    G.startRun(); G.seed(1);
    const B = G.boss;
    settle(B, 12);
    for (let p = 2; p <= phase; p++) { G.debug.nextPhase(); G.step(D); settle(B, 14); }
    P.x = 360; P.y = FLOOR; P.vx = P.vy = 0;
    return B;
  }

  function bosses() {
    const ids = window.HB_BOSSES || G.BOSS_IDS;
    for (const id of ids) {
      const def = G.bosses[id];
      if (!def || !def.ATTACKS) continue;
      const body = { id, fill: 1, fillAt: '', miss: 0, missAt: '', n: 0, pic: null };
      const jobs = [];
      for (const name of Object.keys(def.ATTACKS)) {
        if (window.HB_ONLY && !window.HB_ONLY.includes(name)) continue;
        // each attack once, in the last phase it is used in (its biggest form); a corrupted one in a corrupted fight
        let ph = 0, corrupt = false;
        for (let p = 3; p >= 1 && !ph; p--) {
          if ((def.bags[p] || []).includes(name) || (p === 3 && def.finale === name)) ph = p;
        }
        if (!ph && def.corruptBags) for (let p = 3; p >= 1 && !ph; p--) if ((def.corruptBags[p] || []).includes(name)) { ph = p; corrupt = true; }
        if (ph) jobs.push({ name, ph, corrupt });
      }
      for (const job of jobs) {
        const res = {};
        try {
          const B = stage(id, job.ph, job.corrupt);
          B.forceNext = ''; G.debug.forceAttack = job.name;
          let t = 0, started = -1, end = 1e9, step = 0, samples = 0;
          while (t < 25 && t < end) {
            G.step(D); t += D; step++;
            if (P.hp < P.maxHp) P.hp = P.maxHp;
            if (started < 0 && B.attackName === job.name) started = t;
            if (started >= 0 && B.attackName !== job.name && end > 1e8) { end = t + 2.5; G.debug.forceAttack = 'none'; }
            if (B.phase !== job.ph) break;
            if (started < 0 || step % 6 || samples > 70) continue; // every 0.05 s
            const blows = [];
            for (const h of G.hazards.list) if (!h.dead && h.hits) blows.push({ kind: h.kind || '?', pred: (Q) => h.hits(Q), h });
            blows.push(...bodyBlows(id, B));
            let bossArt = null;
            for (const bl of blows) {
              const hits = probe(bl.pred);
              if (!hits.length) continue;
              samples++;
              // (the body, faint parts too, such as clones and wires, and the flashes, rings and dust of the moment)
              bossArt = bossArt || or(or(mask(drawBoss(B), true).faint, mask((c) => G.fx.draw(c))), B.drawGround ? mask((c) => B.drawGround(c), true).faint : new Uint8Array(N)); // (and the floor it marks: the Wolf's ember bed)
              const own = bl.h && bl.h.draw ? mask((c) => bl.h.draw(c), true) : null;
              const fair = own ? or(own.faint, bossArt) : bossArt;
              const j = judge(hits, fair, own);
              const key = bl.kind;
              const r = res[key] || (res[key] = { kind: key, samples: 0, over: 0, unfair: 0, n: 0, under: 0, cover: 1, picO: null, picU: null, at: '' });
              r.samples++; r.n += j.n; r.unfair += j.unfair;
              if (j.over > r.over) { r.over = j.over; r.at = t.toFixed(2); if (window.HB_SHOTS) r.picO = picture(fair, own, j.um, j.bad); }
              if (own && j.under > r.under) { r.under = j.under; r.cover = j.cover; if (window.HB_SHOTS) r.picU = picture(fair, own, j.um, j.bad); }
            }
            // the body against the boxes it can be struck in (every 0.1 s)
            if (step % 12 === 0 && B.active && !B.invuln) {
              const tg = B.targets();
              if (tg.length) {
                const art = mask(drawBoss(B)), T = shapes(tg);
                if (art.count > 40) {
                  const dT = dist(T), pa = prefix(art), out = [];
                  for (let k = 0; k < N; k++) if (art[k] && !T[k]) out.push(dT[k]);
                  const miss = p95(out);
                  let fill = 1;
                  for (const s of tg) {
                    const one = shapes([s]);
                    let inside = 0;
                    for (let k = 0; k < N; k++) if (one[k] && art[k]) inside++;
                    fill = Math.min(fill, inside / Math.max(1, one.count));
                  }
                  body.n++;
                  const at = job.name + ' ' + t.toFixed(1) + 's';
                  if (fill < body.fill) { body.fill = fill; body.fillAt = at; if (window.HB_SHOTS) body.picF = picture(art, null, null, null, edge(T)); }
                  if (miss > body.miss) { body.miss = miss; body.missAt = at; if (window.HB_SHOTS) body.picM = picture(art, null, null, null, edge(T)); }
                }
              }
            }
          }
        } catch (e) { errors.push(id + '/' + job.name + ': ' + e.message); }
        G.debug.forceAttack = ''; G.debug.corrupt = false;
        for (const r of Object.values(res)) rows.push({ part: 'boss', boss: id, attack: job.name + (job.corrupt ? '*' : ''), phase: job.ph, ...r });
      }
      rows.push({ part: 'body', boss: id, fill: body.fill, fillAt: body.fillAt, miss: Math.round(body.miss), missAt: body.missAt, n: body.n, picF: body.picF, picM: body.picM });
    }
  }
  function edge(m) {
    const e = new Uint8Array(N);
    for (let j = 1; j < CH - 1; j++) for (let i = 1; i < CW - 1; i++) { const k = j * CW + i; if (m[k] && (!m[k - 1] || !m[k + 1] || !m[k - CW] || !m[k + CW])) e[k] = 1; }
    return e;
  }

  // ------------------------------------------------------------------ the heroes
  function heroes() {
    const list = window.HB_HEROES || ['vesper', 'aster', 'lune', 'eos'];
    for (const hero of list) {
      G.settings.hero = hero; G.debug.boss = 'knight'; G.debug.god = true; G.debug.forceAttack = 'none';
      for (const k in I.down) I.down[k] = false;
      G.startRun();
      const B = G.boss;
      settle(B, 12);
      // the boss stands well away, so nothing it does is drawn near the hero
      const park = () => { if (B.body) { B.body.x = G.WALL_R - 60; } P.inv = 1; };
      const fig = { hero, fill: 1, outside: 0 };
      const keep = () => { P.x = 420; P.y = FLOOR; P.vx = 0; P.vy = 0; P.onGround = true; P.facing = 1; };
      // 1. the hero's own box against its figure, standing, running, in the air and dashing
      const poses = [
        ['stand', () => { }],
        ['run', () => { I.down.right = true; }],
        ['jump', () => { I.pressed.jump = true; I.down.jump = true; }],
        ['dash', () => { I.pressed.dash = true; }],
      ];
      for (const [pose, go] of poses) {
        keep(); park();
        for (let i = 0; i < 40; i++) G.step(D);
        for (const k in I.down) I.down[k] = false;
        go();
        for (let i = 0; i < 18; i++) { G.step(D); if (i === 0) { I.pressed.jump = false; I.pressed.dash = false; } }
        P.slashes.length = 0;
        const art = mask((c) => P.draw(c)), box = shapes([P.box()]), dA = dist(art);
        let inside = 0, far = 0; for (let k = 0; k < N; k++) if (box[k]) { if (art[k]) inside++; far = Math.max(far, dA[k]); }
        const pf = inside / box.count;
        if (pf < fig.fill) { fig.fill = pf; fig.fillAt = pose; }
        if (far > (fig.far || 0)) { fig.far = Math.round(far); fig.farAt = pose; }
        for (const k in I.down) I.down[k] = false;
      }
      rows.push({ part: 'hero', hero, what: 'body', fill: fig.fill, fillAt: fig.fillAt, far: fig.far || 0, farAt: fig.farAt || '' });
      if (hero === 'lune') { rows.push({ part: 'hero', hero, what: 'cuts', note: 'none: her blows are shots (below)' }); continue; }
      // 2. each cut: its box against what the cut draws while it can hit
      const cuts = [
        ['side 1', [false], 0], ['side 2', [false, false], 1], ['side 3', [false, false, false], 2],
        ['up', [true], 0], ['down', ['down'], 0],
      ];
      for (const [label, seq, want] of cuts) {
        keep(); park(); P.atkCd = 0; P.combo = -1; P.comboT = 0;
        for (let i = 0; i < 60; i++) G.step(D);
        if (seq[0] === 'down') { I.pressed.jump = true; I.down.jump = true; for (let i = 0; i < 14; i++) { G.step(D); I.pressed.jump = false; } }
        let boxes = [], art = null, artCount = 0, A = null, idxSeen = -1;
        for (let s = 0; s < seq.length; s++) {
          const up = seq[s] === true, dn = seq[s] === 'down';
          I.down.up = up; I.down.down = dn;
          let n = 0;
          while (P.atkCd > 0 && n++ < 120) G.step(D);
          I.pressed.attack = true; I.down.attack = true;
          G.step(D); I.pressed.attack = false; I.down.attack = false;
          const a = P.atk;
          if (!a) continue;
          if (s < seq.length - 1) continue; // only the last cut of the sequence is measured
          idxSeen = a.idx;
          let guard = 0;
          while (P.atk === a && guard++ < 120) {
            if (a.t >= a.a0 && a.t <= a.a1) {
              for (const b of (P.atkBoxes ? P.atkBoxes(a) : [P.atkBox(a)])) boxes.push(Object.assign({}, b));
              const full = mask((c) => P.draw(c));
              const sl = P.slashes.slice(); P.slashes.length = 0;
              const plain = mask((c) => P.draw(c));
              P.slashes.push(...sl);
              const cut = minus(full, plain);
              A = A ? or(A, cut) : cut;
            }
            G.step(D);
          }
        }
        I.down.up = I.down.down = false;
        if (!boxes.length || !A) { rows.push({ part: 'hero', hero, what: label, note: 'no active frames' + (idxSeen !== want ? ' (step ' + idxSeen + ')' : '') }); continue; }
        const BX = shapes(boxes), dB = dist(BX), dA = dist(A);
        const out = []; for (let k = 0; k < N; k++) if (A[k] && !BX[k]) out.push(dB[k]);
        const empty = []; for (let k = 0; k < N; k++) if (BX[k] && !A[k]) empty.push(dA[k]);
        rows.push({ part: 'hero', hero, what: label + (idxSeen !== want ? ' (step ' + idxSeen + ')' : ''), drawnOutside: Math.round(p95(out)), drawnOutsideMax: Math.round(out.length ? Math.max(...out.slice(-50)) : 0), boxEmpty: Math.round(p95(empty)),
          box: boxes.map((b) => Math.round(b.hw * 2) + 'x' + Math.round(b.hh * 2)).filter((v, i, a) => a.indexOf(v) === i).join(' '),
          pic: window.HB_SHOTS ? picture(A, null, null, null, edge(BX)) : null });
      }
      for (const k in I.down) I.down[k] = false;
    }
    // 3. shots: each kind's box against its drawing, wherever it flies
    const kinds = [
      ['arrow', { arrow: true, dmg: 1 }], ['heavy arrow', { arrow: true, heavy: true, dmg: 1 }],
      ['lance', { dmg: 1 }], ['crescent wave', { wave: true, life: 0.42, dmg: 1 }], ['big lance', { big: 1.6, dmg: 1 }],
    ];
    for (const [label, o] of kinds) {
      const s = Object.assign({ x: 640, y: 300, vx: 900, vy: 0, t: 0.05, life: 2, hit: new Set(), ox: 640, oy: 300 }, o);
      const keepShots = G.shots.slice(); G.shots.length = 0; G.shots.push(s);
      const art = mask((c) => G.drawShots(c));
      G.shots.length = 0; G.shots.push(...keepShots);
      const half = (s.arrow ? 11 : 16) * (s.big || 1), sb = P.shotBox ? P.shotBox(s, half) : { cx: s.x, cy: s.y, hw: half, hh: half }, BX = shapes([sb]);
      const dB = dist(BX), dA = dist(art), out = [], empty = [];
      for (let k = 0; k < N; k++) { if (art[k] && !BX[k]) out.push(dB[k]); if (BX[k] && !art[k]) empty.push(dA[k]); }
      let ax0 = 1e9, ax1 = -1e9, ay0 = 1e9, ay1 = -1e9;
      for (let k = 0; k < N; k++) if (art[k]) { const i = k % CW, j = (k / CW) | 0; ax0 = Math.min(ax0, i); ax1 = Math.max(ax1, i); ay0 = Math.min(ay0, j); ay1 = Math.max(ay1, j); }
      rows.push({ part: 'shot', what: label, box: Math.round(sb.hw * 2) + 'x' + Math.round(sb.hh * 2), drawn: art.count ? Math.round((ax1 - ax0 + 1) / SC) + 'x' + Math.round((ay1 - ay0 + 1) / SC) : 'nothing', drawnOutside: Math.round(p95(out)), boxEmpty: Math.round(p95(empty)), pic: window.HB_SHOTS ? picture(art, null, null, null, edge(BX)) : null });
    }
  }

  // ------------------------------------------------------------------ run
  const was = { freeze: G.debug.freeze, boss: G.debug.boss, hero: G.settings.hero, god: G.debug.god };
  const onErr = (e) => errors.push(e.message);
  window.addEventListener('error', onErr);
  G.debug.freeze = true;
  const part = window.HB_PART || 'all';
  try {
    if (part !== 'heroes') bosses();
    if (part !== 'bosses') heroes();
  } catch (e) { errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]); }
  window.removeEventListener('error', onErr);
  for (const k in I.down) I.down[k] = false;
  G.debug.forceAttack = ''; G.debug.corrupt = false; G.debug.boss = was.boss; G.debug.freeze = was.freeze; G.debug.god = was.god; G.settings.hero = was.hero;
  try { localStorage.removeItem('solfall.best'); localStorage.removeItem('solfall.depth'); } catch (e) { /* private mode */ }
  G.toTitle();

  // pictures go to a local receiver, if one was named
  if (window.HB_SHOTS) {
    const port = window.HB_SHOTS, send = (name, url) => { if (url) fetch('http://127.0.0.1:' + port + '/' + name + '.txt', { method: 'POST', body: url }).catch(() => { }); };
    for (const r of rows) {
      const base = ('hb-' + (r.boss || r.hero || 'shot') + '-' + (r.attack || r.what || r.part) + '-' + (r.kind || '')).replace(/[^a-z0-9-]+/gi, '_');
      send(base + '-over', r.picO); send(base + '-under', r.picU); send(base + '-fill', r.picF); send(base + '-miss', r.picM); send(base, r.pic);
    }
  }
  for (const r of rows) { delete r.picO; delete r.picU; delete r.picF; delete r.picM; delete r.pic; delete r.um; }
  window.HB_RESULT = rows;
  if (window.HB_JSON) return rows;
  const pct = (v) => Math.round(v * 100) + '%';
  const lines = rows.map((r) => {
    if (r.part === 'boss') return (r.boss + ' ' + r.attack + ' P' + r.phase + ' ' + r.kind).padEnd(40) + ' over ' + String(r.over).padStart(3) + (r.unfair ? ' (' + r.unfair + ' spots, at ' + r.at + 's)' : '') + '   under ' + r.under + ' (covers ' + pct(r.cover) + ')';
    if (r.part === 'body') return (r.boss + ' BODY').padEnd(40) + ' fill ' + pct(r.fill) + ' (' + r.fillAt + ')   miss ' + r.miss + ' (' + r.missAt + ')';
    if (r.part === 'hero') return (r.hero + ' ' + r.what).padEnd(40) + (r.note ? ' ' + r.note : r.what === 'body' ? ' box filled by figure ' + pct(r.fill) + ' (worst ' + r.fillAt + '), box reaches ' + r.far + ' px past the figure (' + r.farAt + ')' : ' box ' + r.box + '   drawn outside it ' + r.drawnOutside + '   box past drawing ' + r.boxEmpty);
    return ('shot ' + r.what).padEnd(40) + ' box ' + r.box + ', drawn ' + r.drawn + '   drawn outside it ' + r.drawnOutside + '   box past drawing ' + r.boxEmpty;
  });
  if (errors.length) lines.push('ERRORS: ' + errors.slice(0, 12).join(' | '));
  return lines.join('\n');
})();
