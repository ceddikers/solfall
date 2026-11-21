// Solfall - small drawing helpers shared by the heroes and the duelling bosses: tapered limbs,
// two-bone joints, cloth ribbons and soft glows.
'use strict';
(function () {
  const D = G.draw = {};

  D.poly = function (ctx, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) { if (i) ctx.lineTo(pts[i], pts[i + 1]); else ctx.moveTo(pts[i], pts[i + 1]); }
    ctx.closePath();
  };
  D.line = function (ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };

  D.glow = function (ctx, color, x, y, r, alpha) {
    const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = ga * (alpha == null ? 1 : alpha);
    ctx.drawImage(G.fx.glow(color), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = ga;
    ctx.globalCompositeOperation = op;
  };

  // Two-bone limb from (x0, y0) towards (x1, y1). bend picks which way the joint folds.
  D.ik = function (x0, y0, x1, y1, l1, l2, bend) {
    const dx = x1 - x0, dy = y1 - y0;
    const d = Math.min(Math.hypot(dx, dy) || 0.001, l1 + l2 - 0.01);
    const a = Math.atan2(dy, dx);
    const th = Math.acos(G.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * bend;
    return { jx: x0 + Math.cos(a + th) * l1, jy: y0 + Math.sin(a + th) * l1, ex: x0 + Math.cos(a) * d, ey: y0 + Math.sin(a) * d };
  };

  // Path of a tapered limb segment: w0 wide at (x0, y0), w1 wide at (x1, y1), rounded at both ends.
  D.limb = function (ctx, x0, y0, x1, y1, w0, w1) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath();
    ctx.arc(x0, y0, w0 / 2, a + Math.PI / 2, a - Math.PI / 2);
    ctx.arc(x1, y1, w1 / 2, a - Math.PI / 2, a + Math.PI / 2);
    ctx.closePath();
  };

  // Path of a ribbon of cloth along a chain of points, w0 wide at the root and w1 at the tip.
  // ragged > 0 cuts teeth into the far end.
  D.ribbon = function (ctx, pts, w0, w1, ragged) {
    const n = pts.length, up = [], dn = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const w = G.lerp(w0, w1, i / (n - 1)) / 2;
      up.push([pts[i].x - dy / d * w, pts[i].y + dx / d * w]);
      dn.push([pts[i].x + dy / d * w, pts[i].y - dx / d * w]);
    }
    ctx.beginPath();
    ctx.moveTo(up[0][0], up[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(up[i][0], up[i][1]);
    if (ragged) {
      const e = pts[n - 1], p = pts[n - 2], dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d, a = up[n - 1], b = dn[n - 1];
      for (let k = 1; k < 6; k++) {
        const q = k / 6, out = k % 2 ? ragged : -ragged * 0.4;
        ctx.lineTo(G.lerp(a[0], b[0], q) + ux * out, G.lerp(a[1], b[1], q) + uy * out);
      }
    }
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(dn[i][0], dn[i][1]);
    ctx.closePath();
  };

  // A chain of points that trails from an anchor: capes, scarves, hair. Kept in world space.
  D.chain = function (n, x, y) {
    const pts = [];
    for (let i = 0; i < n; i++) pts.push({ x, y: y + i * 2 });
    return pts;
  };
  // o: seg (link length), grav, drift (x speed away from the facing), face, wave, heavy
  D.chainStep = function (pts, ax, ay, dt, o) {
    pts[0].x = ax; pts[0].y = ay;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      b.y += (o.grav || 40) * dt;
      b.x -= (o.face || 1) * (o.drift || 30) * dt;
      b.y += Math.sin(G.t * (o.rate || 8) + i * 0.9) * (o.wave || 8) * dt;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d > o.seg) { b.x = a.x + dx / d * o.seg; b.y = a.y + dy / d * o.seg; }
      if (o.floor != null && b.y > o.floor) b.y = o.floor;
    }
  };
})();
