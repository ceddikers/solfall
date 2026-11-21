// Solfall - the Vigil: the camp between runs. The hero walks about freely here, and everything
// that used to be a menu is a place: echoes of the other heroes to swap with, the Shrine's altar,
// a brazier that sets the difficulty, a banner that names the first foe, a sparring post to try
// moves on, and the gate that starts a run.
'use strict';
(function () {
  const FLOOR = G.FLOOR, F = G.fx, rnd = G.rand;
  const GOLD = '255,214,140';
  const FOES = ['random', 'warden', 'mage', 'assassin', 'knight'];
  const NOTES = ['7 health. Warnings last longer, attacks come slower', '5 health. The fight as intended', '4 health. Shorter warnings, less rest, extra attacks'];
  const FLAME = ['150,215,255', '255,170,90', '255,70,60'];
  const POST_X = 706;

  const HUB = G.hub = { near: null, t: 0, lastX: 600, msg: '', msgT: 0 };

  // ------------------------------------------------------------------ the sparring post
  // It stands in for a boss while the hero is in the camp, so every attack, special and Dawnbreak
  // can be tried on it. It cannot be hurt for good, and it charges Dawnbreak three times as fast.
  const D = G.bosses.dummy = {
    id: 'dummy', kit: true, name: 'SPARRING POST', short: 'The post', theme: 'hub', tips: [],
    hudCols: [null, ['#ffba5c', '#ffe08a'], ['#ffba5c', '#ffe08a'], ['#ffba5c', '#ffe08a']],
    w: 44, h: 96, ATTACKS: {},
    reset() {
      D.maxHp = 1e6; D.hp = D.maxHp; D.phase = 1; D.poise = 0; D.poiseMax = 400;
      D.staggered = false; D.invuln = false; D.active = true; D.dead = false; D.dying = false;
      D.ward = null; D.attackName = ''; D.sum = 0; D.sumT = 0; D.t = 0;
      D.body = { x: POST_X, y: FLOOR, flash: 0, kx: 0, kv: 0, hidden: false };
      D.core = { x: POST_X, y: FLOOR - 52, r: 22 };
      G.bounds = null; G.wind = 0;
    },
    attract() { D.reset(); },
    intro() { },
    release() { }, interrupt() { }, pushPlayer() { },
    targets() { return [{ id: 'body', kind: 'body', ref: D.body, cx: POST_X, cy: FLOOR - 48, hw: 22, hh: 48 }]; },
    damage(amount, t, info) {
      const b = D.body, dmg = Math.round(amount);
      b.flash = 1;
      b.kv += (info.dir || G.sign(POST_X - G.player.x) || 1) * (info.lance ? 9 : info.heavy ? 6 : 3);
      D.sum += dmg; D.sumT = 2.2;
      G.flow.dealt(dmg * 3);
      if (G.settings.numbers) {
        F.text(info.x + rnd(-12, 12), info.y - 16, String(dmg), { color: info.finisher ? GOLD : '255,255,255', size: info.finisher ? 28 : info.heavy ? 23 : 17, life: 0.7, pop: true });
      }
      return true;
    },
    update(dt) {
      const b = D.body;
      D.t += dt;
      b.flash = Math.max(0, b.flash - dt * 6);
      // it rocks on its foot and settles
      b.kv += (-b.kx * 120 - b.kv * 7) * dt; b.kx += b.kv * dt;
      if (D.sumT > 0) { D.sumT -= dt; if (D.sumT <= 0) D.sum = 0; }
    },
    drawGround() { },
    draw(ctx) {
      const b = D.body, P = G.pal();
      ctx.save();
      ctx.translate(POST_X, FLOOR);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(0, 3, 34, 5, 0, 0, G.TAU); ctx.fill();
      ctx.rotate(G.clamp(b.kx, -14, 14) * 0.02);
      ctx.lineJoin = 'round';
      // foot, post, crossbar and a round helm
      ctx.fillStyle = P.pillar; ctx.strokeStyle = G.rgba(P.rim, 0.55); ctx.lineWidth = 1.5;
      for (const pts of [[-26, 0, 26, 0, 14, -10, -14, -10], [-7, -10, 7, -10, 6, -84, -6, -84], [-30, -66, 30, -66, 30, -56, -30, -56]]) {
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, -96, 15, 0, G.TAU); ctx.fill(); ctx.stroke();
      // a battered breastplate hung on it
      ctx.fillStyle = P.near;
      ctx.beginPath(); ctx.moveTo(-17, -70); ctx.lineTo(17, -70); ctx.lineTo(13, -30); ctx.lineTo(0, -22); ctx.lineTo(-13, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = G.rgba(P.rim, 0.3);
      ctx.beginPath(); ctx.moveTo(-9, -60); ctx.lineTo(6, -40); ctx.moveTo(8, -62); ctx.lineTo(-4, -46); ctx.stroke();
      if (b.flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = b.flash * 0.8;
        ctx.drawImage(F.glow('255,255,255'), -60, -120, 120, 130);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    },
    drawDebug(ctx) {
      ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1;
      for (const t of D.targets()) ctx.strokeRect(t.cx - t.hw, t.cy - t.hh, t.hw * 2, t.hh * 2);
    },
  };

  // ------------------------------------------------------------------ the places
  // x: where it stands. reach: how close the hero must be. label(): [name, detail, what E does].
  const others = () => G.HEROES.filter((h) => h.id !== G.run.hero);
  const STATIONS = [
    { id: 'echo0', x: 128, reach: 46 },
    { id: 'echo1', x: 236, reach: 46 },
    { id: 'shrine', x: 420, reach: 60 },
    { id: 'post', x: POST_X, reach: 0 },
    { id: 'brazier', x: 880, reach: 54 },
    { id: 'banner', x: 996, reach: 50 },
    { id: 'gate', x: 1150, reach: 74 },
  ];
  const foeName = (v) => (G.bosses[v] ? G.bosses[v].short : 'Whoever comes');

  function label(s) {
    if (s.id === 'echo0' || s.id === 'echo1') {
      const h = others()[s.id === 'echo0' ? 0 : 1];
      return [h.name + ', ' + h.title, h.blurb, 'take up ' + h.name + '’s ' + (h.weapon === 'bow' ? 'bow' : h.weapon)];
    }
    if (s.id === 'shrine') return ['The Shrine', '◆ ' + G.meta.shards + ' Sunshards', 'spend them'];
    if (s.id === 'brazier') return ['The Brazier: ' + G.diff().name, NOTES[G.settings.difficulty], 'change the difficulty'];
    if (s.id === 'banner') return ['First foe: ' + foeName(G.settings.firstFoe), 'Who waits behind the gate', 'choose another'];
    if (s.id === 'gate') return ['The Gate', 'Trials beyond: ' + (G.store.load('depth', {})[G.settings.difficulty] ? 'deepest ' + G.roman(G.store.load('depth', {})[G.settings.difficulty]) + ' on ' + G.diff().name : 'none won yet on ' + G.diff().name), 'begin a run'];
    return ['', '', ''];
  }

  function say(text) { HUB.msg = text; HUB.msgT = 2.2; }

  function use(s) {
    const P = G.player;
    if (s.id === 'echo0' || s.id === 'echo1') {
      // trade places with the echo: the hero you were is left standing on the plinth
      const h = others()[s.id === 'echo0' ? 0 : 1], x = P.x, f = P.facing;
      G.settings.hero = h.id; G.saveSettings();
      G.run.reset();
      P.reset(); G.flow.reset(); G.moments.reset();
      P.x = x; P.facing = f;
      G.ui.buildRun();
      G.audio.play('heal'); G.audio.play('blink');
      F.flash(h.hot, 0.3, 0.35); F.shake(5);
      F.shatter(s.x, FLOOR - 60, h.col, 16, { hot: h.hot, r: 260, r0: 30 });
      F.ring(P.x, P.y - 24, { r0: 10, r1: 150, life: 0.45, color: h.hot, width: 6 });
      F.burst(P.x, P.y - 10, { n: 18, color: h.col, speed: [20, 130], life: [0.6, 1.3], size: [2, 4], grav: -220, wob: 130, jitter: 22 });
      say(h.name + ' takes up the vigil');
    } else if (s.id === 'shrine') {
      G.audio.play('uiSelect'); G.ui.showShrine();
    } else if (s.id === 'brazier') {
      G.settings.difficulty = (G.settings.difficulty + 1) % 3; G.saveSettings();
      const c = FLAME[G.settings.difficulty];
      G.audio.play('whoosh'); F.shake(3);
      F.burst(s.x, FLOOR - 64, { n: 22, color: c, speed: [60, 320], angle: -Math.PI / 2, spread: 1.6, life: [0.3, 0.8], size: [2, 5], grav: -200 });
      F.light(s.x, FLOOR - 70, 260, c, 0.4, 0.7);
      say(G.diff().name);
    } else if (s.id === 'banner') {
      G.settings.firstFoe = FOES[(FOES.indexOf(G.settings.firstFoe) + 1) % FOES.length]; G.saveSettings();
      G.audio.play('uiSelect');
      F.burst(s.x, FLOOR - 110, { n: 10, color: bannerCol(), speed: [40, 200], life: [0.3, 0.7], size: [2, 4] });
      say(foeName(G.settings.firstFoe));
    } else if (s.id === 'gate') {
      G.audio.play('uiSelect'); G.openGate();
    }
  }

  const bannerCol = () => (G.THEMES[G.settings.firstFoe] ? G.THEMES[G.settings.firstFoe][1].boss : '200,200,215');

  // ------------------------------------------------------------------ update
  HUB.update = function (dt) {
    const P = G.player, I = G.input;
    HUB.t += dt;
    if (HUB.msgT > 0) HUB.msgT -= dt;
    HUB.lastX = P.x;
    let best = null, bd = 1e9;
    for (const s of STATIONS) {
      const d = Math.abs(P.x - s.x);
      if (s.reach && d < s.reach && d < bd && P.y > FLOOR - 140) { best = s; bd = d; }
    }
    HUB.near = best;
    if (best && G.playerControl() && !P.ulting && (I.pressed.heal || I.pressed.confirm)) use(best);
    // the gate breathes light, the altar sheds a little
    if (Math.random() < dt * 10) {
      const a = rnd(0, G.TAU), r = rnd(60, 130);
      F.spawn({ x: 1150 + Math.cos(a) * r, y: FLOOR - 96 + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.4, vy: -Math.sin(a) * r * 1.4, life: 0.6, size: rnd(1.5, 3), color: GOLD });
    }
    if (Math.random() < dt * 3) F.spawn({ x: 420 + rnd(-14, 14), y: FLOOR - 78, vx: rnd(-8, 8), vy: -rnd(20, 60), life: rnd(0.8, 1.5), size: rnd(1.4, 2.6), color: GOLD, wob: 50, rot: rnd(0, 6) });
    if (Math.random() < dt * 14) {
      const c = FLAME[G.settings.difficulty];
      F.spawn({ x: 880 + rnd(-9, 9), y: FLOOR - 62, vx: rnd(-14, 14), vy: -rnd(50, 130) * (1 + 0.4 * G.settings.difficulty), life: rnd(0.4, 0.9), size: rnd(1.6, 3.2), color: c, wob: 70, rot: rnd(0, 6) });
    }
  };

  // ------------------------------------------------------------------ drawing
  const still = { x: 0, y: 0, facing: 1, vx: 0, vy: 0, onGround: true, squash: 0, runT: 0, atk: null, primed: false, hurtFlash: 0, dash: false };

  function plinth(ctx, x, w, h, P) {
    ctx.fillStyle = P.pillar; ctx.strokeStyle = G.rgba(P.rim, 0.5); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 6, FLOOR); ctx.lineTo(x - w / 2, FLOOR - h); ctx.lineTo(x + w / 2, FLOOR - h); ctx.lineTo(x + w / 2 + 6, FLOOR); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = G.rgba(P.rim, 0.5); ctx.fillRect(x - w / 2, FLOOR - h, w, 2);
  }
  function glow(ctx, col, x, y, r, a) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    ctx.drawImage(F.glow(col), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // Everything that stands in the camp, behind the hero.
  HUB.draw = function (ctx) {
    const P = G.pal(), t = HUB.t, near = HUB.near ? HUB.near.id : '';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // echoes of the two heroes not in use: still figures of light on their plinths
    others().forEach((h, i) => {
      const x = STATIONS[i].x, on = near === 'echo' + i;
      plinth(ctx, x, 58, 16, P);
      glow(ctx, h.col, x, FLOOR - 56, on ? 86 : 62, on ? 0.5 : 0.28 + 0.06 * Math.sin(t * 2 + i));
      ctx.globalAlpha = on ? 0.95 : 0.6;
      still.x = x; still.y = FLOOR - 16; still.facing = 1;
      G.drawHero(ctx, h, still);
      ctx.globalAlpha = 1;
    });

    // the Shrine: steps, and a shard turning above them
    {
      const x = 420, on = near === 'shrine', bob = Math.sin(t * 1.8) * 4;
      plinth(ctx, x, 96, 12, P); plinth(ctx, x, 62, 30, P);
      glow(ctx, GOLD, x, FLOOR - 84 + bob, on ? 78 : 56, on ? 0.75 : 0.5);
      const w = 13 * Math.abs(Math.cos(t * 1.3)) + 3;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = G.rgba(GOLD, 0.95);
      ctx.beginPath(); ctx.moveTo(x, FLOOR - 108 + bob); ctx.lineTo(x + w, FLOOR - 84 + bob); ctx.lineTo(x, FLOOR - 60 + bob); ctx.lineTo(x - w, FLOOR - 84 + bob); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.moveTo(x, FLOOR - 100 + bob); ctx.lineTo(x + w * 0.4, FLOOR - 84 + bob); ctx.lineTo(x, FLOOR - 68 + bob); ctx.lineTo(x - w * 0.4, FLOOR - 84 + bob); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // the brazier: its flame shows the difficulty
    {
      const x = 880, d = G.settings.difficulty, c = FLAME[d], hgt = 30 + 22 * d;
      ctx.strokeStyle = P.pillar; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x - 18, FLOOR); ctx.lineTo(x - 6, FLOOR - 44); ctx.moveTo(x + 18, FLOOR); ctx.lineTo(x + 6, FLOOR - 44); ctx.moveTo(x, FLOOR); ctx.lineTo(x, FLOOR - 44); ctx.stroke();
      ctx.fillStyle = P.pillar; ctx.strokeStyle = G.rgba(P.rim, 0.55); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 24, FLOOR - 58); ctx.lineTo(x + 24, FLOOR - 58); ctx.lineTo(x + 14, FLOOR - 42); ctx.lineTo(x - 14, FLOOR - 42); ctx.closePath(); ctx.fill(); ctx.stroke();
      glow(ctx, c, x, FLOOR - 70, 90 + 26 * d, 0.5);
      ctx.globalCompositeOperation = 'lighter';
      for (const [k, al, col] of [[1, 0.75, c], [0.55, 0.95, '255,255,255']]) {
        ctx.fillStyle = G.rgba(col, al);
        ctx.beginPath(); ctx.moveTo(x - 15 * k, FLOOR - 58);
        for (let i = 0; i <= 8; i++) {
          const q = i / 8, e = Math.sin(Math.PI * q);
          ctx.lineTo(x - 15 * k + 30 * k * q + Math.sin(t * 9 + i * 1.7) * 3 * e, FLOOR - 58 - hgt * k * e * (0.75 + 0.25 * Math.sin(t * 13 + i * 2.3)));
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // the banner: it takes the colour of the foe that will come first
    {
      const x = 996, c = bannerCol(), on = near === 'banner';
      ctx.strokeStyle = P.pillar; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x - 20, FLOOR); ctx.lineTo(x - 20, FLOOR - 150); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 24, FLOOR - 144); ctx.lineTo(x + 22, FLOOR - 144); ctx.stroke();
      const sway = Math.sin(t * 1.6) * 4;
      ctx.fillStyle = P.near; ctx.strokeStyle = G.rgba(c, on ? 1 : 0.75); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - 16, FLOOR - 142); ctx.lineTo(x + 20, FLOOR - 142); ctx.lineTo(x + 20 + sway, FLOOR - 70); ctx.lineTo(x + 2 + sway, FLOOR - 84); ctx.lineTo(x - 16 + sway, FLOOR - 70); ctx.closePath(); ctx.fill(); ctx.stroke();
      glow(ctx, c, x + 2 + sway * 0.5, FLOOR - 112, 30, on ? 0.9 : 0.6);
      ctx.fillStyle = G.rgba(c, 0.95);
      ctx.beginPath(); ctx.moveTo(x + 2 + sway * 0.5, FLOOR - 124); ctx.lineTo(x + 11 + sway * 0.5, FLOOR - 112); ctx.lineTo(x + 2 + sway * 0.5, FLOOR - 100); ctx.lineTo(x - 7 + sway * 0.5, FLOOR - 112); ctx.closePath(); ctx.fill();
    }

    // the gate: two pillars, a lintel, and the light of the trials turning between them
    {
      const x = 1150, on = near === 'gate';
      glow(ctx, GOLD, x, FLOOR - 96, on ? 190 : 150, on ? 0.6 : 0.42);
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 46, FLOOR - 190, 92, 190); ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const k = ((t * 0.35 + i / 5) % 1), r = 16 + 86 * k;
        ctx.strokeStyle = G.rgba(i % 2 ? GOLD : P.hot, 0.6 * (1 - k)); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(x, FLOOR - 96, r * 0.55, r, 0, t * 0.6 + i, t * 0.6 + i + 4.4); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.2 * Math.sin(t * 3)) + ')';
      ctx.beginPath(); ctx.ellipse(x, FLOOR - 96, 7, 26, 0, 0, G.TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = P.pillar; ctx.strokeStyle = G.rgba(P.rim, 0.6); ctx.lineWidth = 1.5;
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + side * 46, FLOOR); ctx.lineTo(x + side * 46, FLOOR - 196); ctx.lineTo(x + side * 70, FLOOR - 196); ctx.lineTo(x + side * 74, FLOOR); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(x - 84, FLOOR - 196); ctx.lineTo(x + 84, FLOOR - 196); ctx.lineTo(x + 70, FLOOR - 222); ctx.lineTo(x, FLOOR - 240); ctx.lineTo(x - 70, FLOOR - 222); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = G.rgba(GOLD, 0.9);
      ctx.beginPath(); ctx.moveTo(x, FLOOR - 226); ctx.lineTo(x + 8, FLOOR - 214); ctx.lineTo(x, FLOOR - 202); ctx.lineTo(x - 8, FLOOR - 214); ctx.closePath(); ctx.fill();
    }
  };

  function text(ctx, str, x, y, size, color, alpha, weight) {
    ctx.font = (weight || '600') + ' ' + size + 'px Bahnschrift, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,' + 0.7 * alpha + ')'; ctx.fillText(str, x + 1, y + 2);
    ctx.fillStyle = G.rgba(color, alpha); ctx.fillText(str, x, y);
  }

  // Names over each place, what the nearest one does, and a line on how to move. In front of the hero.
  HUB.drawOver = function (ctx) {
    const P = G.player, near = HUB.near, pad = G.input.device === 'gamepad';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const TOP = { echo0: 118, echo1: 118, shrine: 134, post: 132, brazier: 132, banner: 170, gate: 262 };
    for (const s of STATIONS) {
      if (s === near) continue;
      // short names from a distance; the full line appears when the hero walks up
      const name = s.id === 'post' ? 'Sparring post' : s.id === 'echo0' ? others()[0].name : s.id === 'echo1' ? others()[1].name
        : s.id === 'brazier' ? G.diff().name : s.id === 'banner' ? 'First foe' : label(s)[0];
      text(ctx, name.toUpperCase(), s.x, FLOOR - TOP[s.id], 11, '236,233,244', 0.5);
    }
    // the post reports what the last flurry came to, and how Dawnbreak stands
    if (D.sum > 0) text(ctx, D.sum + ' damage', POST_X, FLOOR - 152, 15, GOLD, Math.min(1, D.sumT * 2));
    if (P.ult > 0 && Math.abs(P.x - POST_X) < 200) {
      const full = P.ult >= 100;
      text(ctx, full ? 'Dawnbreak ready: press ' + (pad ? 'RT' : 'Q') : 'Dawnbreak ' + Math.round(P.ult) + '%', POST_X, FLOOR - 172, 12, GOLD, full ? 0.7 + 0.3 * Math.sin(HUB.t * 8) : 0.7);
    }
    if (near && !G.ui.current) {
      const L = label(near), x = G.clamp(near.x, 190, G.W - 190), y = FLOOR - TOP[near.id] - 34;
      text(ctx, L[0].toUpperCase(), x, y, 17, '255,255,255', 1);
      text(ctx, L[1], x, y + 21, 13, '236,233,244', 0.8, '500');
      text(ctx, (pad ? 'LB' : 'E') + '  ' + L[2], x, y + 42, 13, GOLD, 0.85 + 0.15 * Math.sin(HUB.t * 6));
    }
    if (HUB.msgT > 0) text(ctx, HUB.msg.toUpperCase(), P.x, P.y - 104, 15, GOLD, Math.min(1, HUB.msgT * 2));
    if (!G.ui.current) {
      text(ctx, 'THE VIGIL', G.W / 2, 44, 20, '236,233,244', 0.75, '400');
      text(ctx, pad ? 'Stick move  ·  A jump  ·  X attack  ·  B dash  ·  LB use  ·  Start menu'
        : 'A / D move  ·  Space jump  ·  J or click attack  ·  K dash  ·  L special  ·  E use  ·  Esc menu',
        G.W / 2, 70, 12, '236,233,244', 0.45, '500');
      text(ctx, G.hero().name.toUpperCase() + '   ◆ ' + G.meta.shards, 110, 44, 13, GOLD, 0.8);
    }
  };
})();
