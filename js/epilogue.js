// (v3.0a) After Sol: the ridge at dawn, then the end of the run.
// When her death scene is over the picture fades to the hero standing alone on a ridge above the clouds.
// The view starts close on them and draws back and up as a new sun comes up out of the cloud, and a few
// short lines come in. Then the end screen (ui.js, U.showEnd): what the run came to, what it unlocked,
// and the way back to camp. Any button skips ahead to the end screen.
// It is drawn on its own (game.js hands it the whole picture while it is on); nothing else runs.
(function () {
  'use strict';
  const EP = G.epilogue = { on: false, t: 0, res: null };
  const W = G.W, H = G.H;
  const RIDGE_Y = 566, HERO_X = 452, SUN_X = 980, CLOUD_Y = 520;
  const LINES = [G.T('The sun fell.'), G.T('You carried its light home.'), G.T('Morning comes to the Vigil.')];
  const LINE_T = [3.0, 4.8, 6.6], END_T = 9.4;
  const sm = (a, b, x) => { const k = G.clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const lerp = G.lerp;
  function lcg(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  let hero = null, still = null, motes = [], stars = [], chord = false, shown = false;

  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, k) { const A = hexRgb(a), B = hexRgb(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')'; }
  const SKY0 = ['#06081c', '#1e1c46', '#57345e', '#b0605a'];
  const SKY1 = ['#2c4a8c', '#7a86bc', '#f0a884', '#ffe0a8'];

  EP.start = function (res) {
    EP.on = true; EP.t = 0; EP.res = res; chord = false; shown = false;
    hero = G.costumed(G.hero());
    still = { x: HERO_X, y: RIDGE_Y, facing: 1, vx: 0, vy: 0, onGround: true, squash: 0, runT: 0, atk: null, primed: false, hurtFlash: 0, dash: false, rig: {} };
    const r = lcg(31);
    stars = []; for (let i = 0; i < 90; i++) stars.push({ x: r() * W * 1.4 - W * 0.2, y: r() * 380 - 120, a: r() });
    motes = []; for (let i = 0; i < 40; i++) motes.push({ x: r() * W, y: r() * H, s: 0.4 + r() * 0.9, ph: r() * 6.28 });
    G.ui.close(); G.ui.hud(false); G.ui.letterbox(false); G.ui.fade();
    G.audio.setIntensity(0); G.audio.duck(1);
  };
  EP.skip = function () { if (EP.t > 1 && EP.t < END_T) EP.t = END_T; };
  EP.finish = function () {
    const first = EP.res && EP.res.solFirst;
    EP.on = false; EP.res = null;
    G.toHub('gate');
    if (first) G.hub.morning();
  };

  EP.update = function (dt) {
    EP.t += dt;
    const t = EP.t;
    if (!chord && t > 3.4) { chord = true; G.audio.play('solDawn'); }
    for (const m of motes) { m.y -= m.s * 14 * dt; m.x += Math.sin(t * 0.6 + m.ph) * 6 * dt; if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; } }
    if (!shown && t >= END_T) { shown = true; G.ui.showEnd(EP.res); }
  };

  // ------------------------------------------------------------------ the picture
  function glow(ctx, col, x, y, r, a) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    ctx.drawImage(G.fx.glow(col), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  EP.draw = function (ctx) {
    const t = EP.t, k = sm(0.4, 8, t), rise = sm(0.8, 7.5, t);
    // the view: close on the hero, drawing back and rising to take in the sky
    const z = lerp(2.2, 1, sm(0.3, 7, t)), cx = lerp(HERO_X + 30, W / 2, sm(0.3, 7, t)), cy = lerp(RIDGE_Y - 60, H / 2 - 20, sm(0.3, 7, t));
    ctx.save();
    // sky (fixed to the screen, so it fills however close the view is)
    const g = ctx.createLinearGradient(0, 0, 0, H);
    SKY0.forEach((c, i) => g.addColorStop([0, 0.4, 0.72, 1][i], mix(c, SKY1[i], k)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy);
    // stars going out
    const sa = 1 - sm(1, 6, t);
    if (sa > 0.01) {
      ctx.fillStyle = '#fff';
      for (const s of stars) { ctx.globalAlpha = sa * (0.3 + 0.7 * s.a) * (0.7 + 0.3 * Math.sin(t * 2 + s.x)); ctx.fillRect(s.x, s.y, 1.6, 1.6); }
      ctx.globalAlpha = 1;
    }
    // the new sun, coming up out of the cloud
    const sy = lerp(CLOUD_Y + 70, 340, rise), sr = 46;
    glow(ctx, '255,190,120', SUN_X, sy, 600, 0.3 + 0.3 * k);
    glow(ctx, '255,226,170', SUN_X, sy, 200, 0.35 * sm(0.5, 3, t));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * G.TAU + t * 0.05, len = (180 + 90 * Math.sin(i * 2.3 + t * 0.7)) * sm(2, 6, t), w = 0.035;
      const lg = ctx.createLinearGradient(SUN_X, sy, SUN_X + Math.cos(a) * (sr + len), sy + Math.sin(a) * (sr + len));
      lg.addColorStop(0, 'rgba(255,236,190,0.32)'); lg.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(SUN_X + Math.cos(a - w) * sr, sy + Math.sin(a - w) * sr); ctx.lineTo(SUN_X + Math.cos(a) * (sr + len), sy + Math.sin(a) * (sr + len)); ctx.lineTo(SUN_X + Math.cos(a + w) * sr, sy + Math.sin(a + w) * sr); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#fff4dc'; ctx.beginPath(); ctx.arc(SUN_X, sy, sr, 0, G.TAU); ctx.fill();
    glow(ctx, '255,250,236', SUN_X, sy, 74, 0.45);
    // the sea of cloud, in long rolls, catching the light from the sun's side
    const r = lcg(7);
    for (let row = 0; row < 5; row++) {
      const y = CLOUD_Y - 20 + row * 30, L = -400, R = W + 400;
      ctx.fillStyle = mix(['#2a2240', '#3a2c4c', '#2a2240', '#3a2c4c', '#241c36'][row], ['#c48a8a', '#e0a08c', '#b07c84', '#d49488', '#9a6c7c'][row], k);
      ctx.beginPath(); ctx.moveTo(L, H + 200);
      for (let px = L; px <= R; px += 30) ctx.lineTo(px, y - 12 * Math.sin(px * 0.009 + row * 1.7 + t * 0.05) - 8 * r());
      ctx.lineTo(R, H + 200); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,226,180,' + (0.1 + 0.4 * k) * (1 - row * 0.15) + ')'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = L; px <= R; px += 30) { const yy = y - 12 * Math.sin(px * 0.009 + row * 1.7 + t * 0.05); if (px === L) ctx.moveTo(px, yy); else ctx.lineTo(px, yy); }
      ctx.stroke();
    }
    // light lying across the cloud under the sun
    glow(ctx, '255,214,150', SUN_X, CLOUD_Y + 10, 380, 0.25 * k);
    // the ridge the hero stands on, dark against the light, with a warm edge on the sun's side
    ctx.fillStyle = mix('#0c0a18', '#2a1e2e', k * 0.6);
    ctx.beginPath(); ctx.moveTo(-400, H + 200); ctx.lineTo(-400, RIDGE_Y - 40); ctx.lineTo(160, RIDGE_Y - 26); ctx.lineTo(300, RIDGE_Y - 8); ctx.lineTo(400, RIDGE_Y + 2);
    ctx.lineTo(520, RIDGE_Y + 2); ctx.lineTo(580, RIDGE_Y + 30); ctx.lineTo(640, RIDGE_Y + 60); ctx.lineTo(720, RIDGE_Y + 140); ctx.lineTo(760, H + 200); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,160,' + (0.2 + 0.6 * k) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(300, RIDGE_Y - 8); ctx.lineTo(400, RIDGE_Y + 2); ctx.lineTo(520, RIDGE_Y + 2); ctx.lineTo(580, RIDGE_Y + 30); ctx.lineTo(640, RIDGE_Y + 60); ctx.lineTo(720, RIDGE_Y + 140); ctx.stroke();
    // a blade of the broken dial left in the rock, and the hero
    glow(ctx, '255,220,160', HERO_X, RIDGE_Y - 40, 120, 0.25 + 0.3 * k);
    if (hero) G.drawHero(ctx, hero, still);
    // the light reaching them: a soft wash and dust drifting up through it
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const img = G.fx.glow('255,230,180');
    for (const m of motes) { const a = (0.5 + 0.5 * Math.sin(t * 1.5 + m.ph)) * 0.5 * k * G.clamp((m.y - 260) / 260, 0, 1); if (a < 0.02) continue; ctx.globalAlpha = a; ctx.drawImage(img, m.x - 4, m.y - 4, 8, 8); }
    ctx.restore();
    // the lines
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '400 26px Bahnschrift, "Segoe UI", sans-serif';
    const out = shown ? Math.max(0, 1 - (t - END_T) * 2) : 1;
    LINES.forEach((s, i) => {
      const a = sm(LINE_T[i], LINE_T[i] + 0.9, t) * out;
      if (a <= 0) return;
      const y = 130 + i * 44 + (1 - a) * 8;
      ctx.fillStyle = 'rgba(0,0,0,' + 0.45 * a + ')'; ctx.fillText(s, W / 2 + 1, y + 2);
      ctx.fillStyle = 'rgba(255,244,222,' + a + ')'; ctx.fillText(s, W / 2, y);
    });
    // fading in from black at the start
    const blk = 1 - sm(0, 1.2, t);
    if (blk > 0) { ctx.fillStyle = 'rgba(0,0,0,' + blk + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  };
})();
