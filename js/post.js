// Solfall - the finishing pass. Nothing here changes what is drawn; it is what is done to the
// picture afterwards, the way a film is graded: light is let spill a little past its edges (bloom),
// the frame is toned (warm where the arena's light is, cool in the shadow below), a fine grain is
// laid over it so flat fills stop looking flat, and the floor picks up a faint reflection of
// whatever is bright just above it. All of it goes with the "Glow, grain and reflections" setting.
'use strict';
(function () {
  const PO = G.post = {};
  let b1 = null, b2 = null, b3 = null, strip = null, grain = null, grainPat = null, grades = new Map();
  let gx = 0, gy = 0, gt = 0;

  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  PO.on = () => G.settings.polish !== false;

  // A tile of grey noise. Laid over the frame with 'overlay', mid grey leaves a pixel alone and the
  // noise either side of it lifts or lowers it slightly.
  function buildGrain() {
    grain = cv(192, 192);
    const x = grain.getContext('2d'), img = x.createImageData(192, 192), d = img.data;
    let s = 1234567;
    for (let i = 0; i < d.length; i += 4) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const a = (s >>> 8) / 16777216;
      s = (s * 1664525 + 1013904223) >>> 0;
      const b = (s >>> 8) / 16777216;
      const v = 128 + (a + b - 1) * 110; // two rolls: most of it near the middle
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }

  // The floor is polished stone: whatever is bright just above it shows in it, faintly, and fades
  // within a hand's breadth. Called while the scene is on the canvas but before the weather and
  // vignette in front of it. floorY is the floor line in the canvas's own pixels.
  PO.reflect = function (ctx, canvas, floorY, k) {
    if (!PO.on()) return;
    const w = canvas.width, h = Math.round(54 * k), sy = Math.round(floorY);
    if (sy - h < 0 || sy + h > canvas.height) return;
    if (!strip || strip.width !== w || strip.height !== h) strip = cv(w, h);
    const s = strip.getContext('2d');
    s.setTransform(1, 0, 0, -1, 0, h);
    s.globalCompositeOperation = 'copy';
    s.drawImage(canvas, 0, sy - h, w, h, 0, 0, w, h);
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = 'destination-in';
    const g = s.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0.42)'); g.addColorStop(0.35, 'rgba(0,0,0,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    s.fillStyle = g; s.fillRect(0, 0, w, h);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(strip, 0, sy + Math.round(2 * k));
    ctx.restore();
  };

  function grade(rim, w, h) {
    const key = rim + '|' + h;
    let g = grades.get(key);
    if (!g) {
      if (grades.size > 12) grades.clear();
      g = cv(4, h);
      const x = g.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, G.rgba(rim, 0.2)); gr.addColorStop(0.5, G.rgba(rim, 0.05));
      gr.addColorStop(0.78, 'rgba(18,26,70,0.12)'); gr.addColorStop(1, 'rgba(8,12,44,0.42)');
      x.fillStyle = gr; x.fillRect(0, 0, 4, h);
      grades.set(key, g);
    }
    return g;
  }

  // The last thing done to the frame, in the canvas's own pixels.
  PO.finish = function (ctx, canvas, dt) {
    if (!PO.on()) return;
    const W = canvas.width, H = canvas.height;
    if (!b1) { b1 = cv(320, 180); b2 = cv(160, 90); b3 = cv(80, 45); buildGrain(); }
    // bloom: a small copy of the frame, multiplied by itself so that only what is bright survives,
    // made smaller twice more, and all three laid back over the frame as light
    const c1 = b1.getContext('2d'), c2 = b2.getContext('2d'), c3 = b3.getContext('2d');
    c1.globalCompositeOperation = 'copy'; c1.drawImage(canvas, 0, 0, 320, 180);
    c1.globalCompositeOperation = 'multiply'; c1.drawImage(b1, 0, 0);
    c2.globalCompositeOperation = 'copy'; c2.drawImage(b1, 0, 0, 160, 90);
    c3.globalCompositeOperation = 'copy'; c3.drawImage(b2, 0, 0, 80, 45);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.2; ctx.drawImage(b1, 0, 0, W, H);
    ctx.globalAlpha = 0.24; ctx.drawImage(b2, 0, 0, W, H);
    ctx.globalAlpha = 0.28; ctx.drawImage(b3, 0, 0, W, H);
    // tone: the arena's own light from above, a cool dusk below
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'soft-light';
    ctx.drawImage(grade(G.pal().rim, W, H), 0, 0, W, H);
    // grain: it moves 24 times a second, like film, however fast the game is drawn
    gt -= dt || 0.016;
    if (gt <= 0) { gt = 1 / 24; gx = Math.floor(Math.random() * 192); gy = Math.floor(Math.random() * 192); }
    if (!grainPat) grainPat = ctx.createPattern(grain, 'repeat');
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.085;
    ctx.translate(-gx, -gy);
    ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W + 192, H + 192);
    ctx.restore();
  };
})();
