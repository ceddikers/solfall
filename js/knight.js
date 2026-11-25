// Solfall - The Unburied Knight: a death knight with a greatsword. Slow, heavy and wide.
// Its swings cover everything in front of it, so the place to be is behind it; its back is unguarded.
'use strict';
(function () {
  const { wait, tween } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards, K = G.kit, D = G.draw, DANGER = G.COL.danger;
  // The walls the Knight fights between. In its third phase a ring of fallen blades stands in for them.
  let WL = G.WALL_L, WR = G.WALL_R;
  const RING_L = 290, RING_R = 990;

  const B = {
    id: 'knight', name: 'THE UNBURIED KNIGHT', short: 'The Knight', theme: 'knight',
    sub: 'An oath that outlived its keeper', taunt: 'it rises again',
    blurb: 'A death knight whose back is its weakness',
    tips: [
      'The Knight cannot cut behind itself. Dash through it as it swings and strike its back for extra damage.',
      'After an overhead blow, a charge into the wall or a whirl it is helpless for a moment. A finisher timed into one of its cuts turns the cut aside.',
      'Jump the low wave; stay on the ground for the high one.',
      'Its charge is too tall for one jump. Dash through it, or jump twice.',
      'Rotting ground fades after a few seconds. Fight on what is left.',
      'Watch its feet. If the Knight stamps after a cut, another cut is coming; if the blade just drags, it is open.',
      'A blade that burns red as it rises takes two health and throws a wave along the floor. Get behind it, or get out and jump.',
    ],
    hudCols: [null, ['#6ab4ff', '#d4ecff'], ['#8ce04a', '#e0ffc8'], ['#ff4c46', '#ffd0c8']],
    BASE_HP: 4300, poise0: 460, w: 62, h: 122,
    answer: 'sever',
    gaps: [0, 1.0, 0.8, 0.6],
    bags: {
      1: ['cleave', 'overhead', 'charge', 'grip', 'graves', 'hurl', 'sever', 'heel', 'thrust', 'march', 'souls', 'tolling'],
      2: ['cleave2', 'overhead', 'charge', 'grip', 'graves', 'wraiths', 'desecrate', 'whirl', 'rend', 'hurl', 'sever', 'heel', 'thrust', 'march', 'souls', 'tolling'],
      3: ['reap', 'overhead', 'charge', 'grip', 'wraiths', 'desecrate', 'whirl', 'rend', 'leap', 'hurl', 'sever', 'heel', 'thrust', 'march', 'souls', 'tolling'],
    },
    cards: { 2: ['THE HOST', 'The dead answer the call'], 3: ['BLOOD OATH', 'It will not fall alone'] },
    first: { 1: 'cleave', 2: 'wraiths', 3: 'leap' },
    // its corrupted self's own two (corrupt.js): the Requiem in every phase, the Colossus from the second
    corruptBags: { 1: ['requiem'], 2: ['requiem', 'colossus'], 3: ['requiem', 'colossus'] },
  };

  // ------------------------------------------------------------------ poses
  // lean, hip height, two feet (x, y), sword hand (x, y), blade angle, off hand (x, y; 999 = on the hilt)
  // It carries the greatsword on its shoulder, one-handed, and walks with it there. So a cut starts
  // high and falls with the sword's own weight (raise -> cleave); the cut after it is the blade
  // coming back up off the ground (low -> rise). It never has to lift the sword to begin.
  const POSES = {
    idle: [0.04, -58, 17, 0, -17, 0, 22, -84, -2.24, -15, -54],
    raise: [-0.12, -58, 20, 0, -18, 0, -8, -108, -2.45, 999, 0],
    cleave: [0.32, -52, 26, 0, -20, 0, 38, -58, 0.42, 999, 0],
    low: [0.3, -52, 24, 0, -20, 0, 34, -44, 0.32, 999, 0],
    rise: [-0.1, -58, 20, 0, -18, 0, 2, -112, -2.2, 999, 0],
    overRaise: [-0.08, -60, 16, 0, -18, 0, 6, -118, -1.72, 999, 0],
    slam: [0.5, -46, 28, 0, -22, 0, 36, -78, 1.3, 999, 0],
    chargeUp: [0.42, -44, 22, 0, -26, 0, -16, -52, 2.85, 6, -78],
    charge: [0.62, -48, 26, -4, -30, -2, -22, -58, 2.95, 26, -82],
    crash: [-0.25, -40, 24, 0, -18, 0, 22, -8, 0.04, -22, -30],
    grip: [0.1, -58, 18, 0, -18, 0, -6, -50, 2.8, 48, -86],
    plant: [0.14, -56, 16, 0, -18, 0, 24, -104, 1.5708, 999, 0],
    whirl: [0.1, -54, 20, 0, -20, 0, 30, -70, 0.02, 999, 0],
    air: [0.0, -58, 12, -16, -14, -8, 4, -120, -1.75, 999, 0],
    kneel: [0.5, -34, 24, 0, -30, 0, 26, -98, 1.5708, -6, -30],
    // on the way back to rest: the blade stood up in front of it, leaning back against a sword that
    // is stuck, and pushing itself up off one knee
    heft: [-0.04, -60, 18, 0, -18, 0, 18, -98, -1.25, 999, 0],
    wrench: [-0.22, -52, 22, 0, -22, 0, 30, -86, 1.42, 999, 0],
    push: [0.34, -38, 24, 0, -28, 0, 26, -88, 1.5708, -8, -30],
    // corrupted: down on one knee with the sword held up in both hands, point to the sky (the Colossus)
    vigil: [0.06, -36, 24, 0, -30, 0, 8, -126, -1.5708, 999, 0],
    // the Heel (it looks back over its shoulder in both): the blade let down to rest its point on the
    // floor in front, or hoisted level over the shoulder, pointing straight back at whoever is there.
    // Then it pivots, and the cut ends in front of it, on the side that was its back.
    heelLow: [0.24, -52, 24, 0, -22, 0, 30, -44, 0.28, 999, 0],
    heelHigh: [0.1, -56, 18, 0, -22, 0, 2, -104, -2.95, 999, 0],
    heelLowCut: [0.3, -48, 30, 0, -22, 0, 44, -40, 0.24, -24, -66],
    heelHighCut: [0.16, -56, 26, 0, -20, 0, 46, -86, 0.06, -26, -80],
    // the Thrust: drawn back level with the point forward, weight on the back foot and the off hand
    // laid along the flat; at the hip (low) or at the shoulder (high). Then the lunge, point first.
    drawLow: [-0.2, -54, 30, 0, -26, 0, -22, -50, 0.02, 30, -54],
    drawHigh: [-0.16, -56, 28, 0, -26, 0, -18, -94, 0.03, 30, -98],
    thrustLow: [0.44, -42, 52, 0, -42, 0, 56, -40, 0.03, -30, -72],
    thrustHigh: [0.32, -48, 50, 0, -40, 0, 60, -88, -0.01, -30, -80],
    // where each tell has got to by its end: sunk lower, wound further, the blade drawn further back
    heelLowDeep: [0.36, -46, 26, 0, -24, 0, 22, -38, 0.239, 999, 0],
    heelHighDeep: [0.22, -52, 20, 0, -24, 0, -8, -100, -3.02, 999, 0],
    drawLowDeep: [-0.3, -48, 32, 0, -32, 0, -36, -48, 0.02, 20, -52],
    drawHighDeep: [-0.26, -50, 30, 0, -32, 0, -32, -92, 0.03, 20, -96],
    // (v2.1a) Skyward: hunched, the sword let down low in front with its point on the floor, then the
    // rising cut that ends with the blade straight up over the helm
    skyLow: [0.3, -46, 26, 0, -24, 0, 30, -54, 0.34, 999, 0],
    skyLowDeep: [0.4, -40, 28, 0, -27, 0, 24, -50, 0.3, 999, 0],
    skyCut: [-0.16, -62, 18, 0, -16, 0, 10, -140, -1.62, 999, 0],
    // the overhead held back too long: higher, further behind the helm, leaning back on its heels
    overHold: [-0.2, -62, 14, 0, -20, 0, -4, -126, -2.05, 999, 0],
    overHoldDeep: [-0.26, -63, 13, 0, -21, 0, -10, -128, -2.2, 999, 0],
    // the March's finisher: feet set wide, the sword hoisted over the helm in both hands, then buried
    hoist: [-0.1, -52, 30, 0, -30, 0, 4, -124, -1.85, 999, 0],
    hoistDeep: [-0.18, -48, 32, 0, -32, 0, -4, -128, -2.05, 999, 0],
    bury: [0.6, -40, 30, 0, -28, 0, 36, -66, 1.36, 999, 0],
    // the Souls: the sword stays on its shoulder; the off hand cupped low (one great soul) or raised
    // with the fingers spread (many small), then thrust out to let them go
    cupLow: [0.1, -56, 18, 0, -18, 0, 22, -84, -2.24, 42, -70],
    cupLowDeep: [0.14, -54, 19, 0, -19, 0, 22, -83, -2.22, 46, -64],
    spread: [-0.06, -58, 18, 0, -18, 0, 22, -84, -2.24, 30, -126],
    spreadDeep: [-0.1, -59, 17, 0, -18, 0, 21, -85, -2.26, 28, -134],
    release: [0.18, -56, 24, 0, -18, 0, 22, -84, -2.24, 62, -98],
    // the Tolling: lifted in both hands point down, and driven into the floor
    tollRaise: [-0.08, -61, 16, 0, -18, 0, 16, -172, 1.5708, 999, 0],
    tollRaiseDeep: [-0.12, -63, 15, 0, -18, 0, 16, -180, 1.5708, 999, 0],
  };
  // A tell is not a pose held still: it keeps building (POSES.dyn, written by the attack each frame,
  // from where it starts towards how deep it goes)
  POSES.dyn = POSES.idle.slice();
  function building(from, to, k) {
    const A = POSES[from], Z = POSES[to], d = POSES.dyn, q = E.inOutQuad(G.clamp(k, 0, 1));
    for (let i = 0; i < NP; i++) d[i] = A[i] === 999 ? 999 : A[i] + (Z[i] - A[i]) * q;
    return 'dyn';
  }
  const NP = 11;
  function walkPose(t) {
    const s = Math.sin(t), c = Math.cos(t), p = POSES.idle.slice();
    p[2] = 17 + s * 15; p[3] = -Math.max(0, c) * 7; p[4] = -17 - s * 15; p[5] = -Math.max(0, -c) * 7; p[1] = -58 + Math.abs(s) * 2;
    p[7] = -84 + Math.abs(s) * 2.5; p[8] = -2.24 + Math.abs(s) * 0.05; p[9] = -15 - s * 9; p[10] = -54 + Math.abs(s) * 2;
    return p;
  }

  // ------------------------------------------------------------------ state
  B.setup = function () {
    const b = B.body;
    b.x = 900; b.y = FLOOR + 150; b.pose = 'kneel'; b.p = POSES.kneel.slice(); b.walkT = 0; b.hurt = false; b.spin = 0; b.spinning = false; b.fast = false;
    b.bare = false; b.still = false; b.voidK = 0; b.voidOn = false; b.hush = false; b.smooth = 0; b.fd = -1;
    b.look = 0; b.lookV = 0; b.lookT = 0; b.behindT = 0; B.sinceHeel = 0;
    B.cape = D.chain(9, b.x, b.y - 100);
    WL = G.WALL_L; WR = G.WALL_R; B.ring = false; B.swords = []; B.lost = null;
  };
  B.bounds = () => (B.ring ? { l: WL + 13, r: WR - 13 } : null);
  B.onHit = function () { if (B.body.unarmed) G.feats.bump('unarmed'); }; // for the feat
  // the Requiem's silence ends however the attack does (finished, staggered, or cut short by a phase)
  function unhush() {
    const b = B.body;
    if (b.hush && G.state === 'fight' && !G.player.dead && !G.paused) G.audio.duck(1);
    b.hush = false;
  }
  B.onRelease = function () { const b = B.body; b.hurt = false; b.pose = 'idle'; b.spinning = false; b.fast = false; b.unarmed = false; b.blaze = 0; b.voidOn = false; b.lookT = 0; b.gazeT = 0; b.burn = 0; b.jit = 0; unhush(); };
  B.onStagger = function () { B.body.pose = 'kneel'; };
  B.onInterrupt = function () { B.lost = null; unhush(); };
  B.staggerWord = 'DISARMED';
  B.staggerIn = function* () {
    const b = B.body;
    b.y = FLOOR; b.unarmed = true;
    const away = -(G.sign(G.player.x - b.x) || b.face);
    const lost = B.lost = { x0: b.x, x1: G.clamp(b.x + away * 210, WL + 40, WR - 40), k: 0 };
    G.audio.play('clash');
    yield* tween(lost, { k: 1 }, 0.5, E.linear || ((t) => t));
    G.audio.play('tink'); G.audio.play('boom'); G.fx.shake(7);
    G.fx.thud(lost.x1, FLOOR, 0.9, { col: G.pal().boss });
    G.fx.burst(lost.x1, FLOOR - 6, { n: 10, color: G.pal().hot, speed: [120, 480], angle: -Math.PI / 2, spread: 1.8, life: [0.15, 0.4], kind: 'spark', size: [2, 4], grav: 900 });
  };
  B.staggerOut = function* () {
    const b = B.body, lost = B.lost;
    if (!lost) return;
    b.unarmed = true; b.pose = 'grip'; b.face = lost.x1 > b.x ? 1 : -1;
    G.fx.glint(lost.x1, FLOOR - 120, 34, DANGER, 0.3); G.audio.play('glint'); G.audio.play('pull');
    yield* wait(0.38 * K.T());
    // the sword tears free and flies home
    B.lost = null;
    const tint = tintNow(), dir = G.sign(b.x - lost.x1) || 1;
    const blade = H.add({
      kind: 'blade', x: lost.x1, y: FLOOR - 50, spin: 0, tint,
      update(dt) {
        this.x += dir * 1150 * dt; this.spin += dir * 30 * dt; this.srcX = this.x - dir * 30;
        if (Math.random() < dt * 50) G.fx.spawn({ x: this.x + G.rand(-20, 20), y: this.y + G.rand(-16, 16), vx: G.rand(-30, 30), vy: G.rand(-30, 30), life: G.rand(0.15, 0.35), size: G.rand(2, 5), color: tint.boss });
        if ((b.x - this.x) * dir <= 44) this.dead = true;
      },
      hits(Pl) { return G.rectsOverlap(Pl.box(), { cx: this.x, cy: this.y, hw: 36, hh: 24 }); },
      draw(ctx) {
        ctx.globalCompositeOperation = 'lighter'; D.glow(ctx, DANGER, this.x, this.y, 70, 0.5); ctx.globalCompositeOperation = 'source-over';
        sword(ctx, this.x - Math.cos(this.spin) * 60, this.y - Math.sin(this.spin) * 60, this.spin, tint.boss, tint.hot);
      },
    });
    G.audio.play('streak');
    while (!blade.dead) yield;
    b.unarmed = false; b.fast = true; b.pose = 'raise';
    G.audio.play('blade'); G.fx.shake(5);
    G.fx.ring(b.x, b.y - 80, { r0: 60, r1: 12, life: 0.25, color: tint.hot, width: 4 });
  };
  B.reckonName = 'DIRGE';
  B.onReckon = function (on) { B.body.pose = on ? 'overRaise' : 'idle'; };
  B.onRecover = function () { B.body.pose = 'idle'; };
  B.dying0 = function () { B.body.pose = 'kneel'; };
  // Blows that land on its back count for more.
  B.vuln = function () { const b = B.body; return (G.player.x - b.x) * b.face < -6 ? 1.3 : 1; };

  const facePlayer = () => { const b = B.body; if (Math.abs(G.player.x - b.x) > 10) b.face = G.player.x > b.x ? 1 : -1; };
  const tintNow = () => ({ boss: G.pal().boss, hot: G.pal().hot });

  // ------------------------------------------------------------------ building blocks
  // A greatsword swing: everything in front of and above the Knight, nothing behind it.
  function swing(o) {
    const b = B.body, f = b.face;
    const m = (ang) => (f > 0 ? ang : Math.PI - ang);
    return H.arc({
      x: b.x + f * 10, y: b.y - 86, r: o.r || 195, a0: m(o.a0), a1: m(o.a1), tele: o.tele, active: 0.13, dmg: o.dmg || 1, heavy: (o.dmg || 1) > 1, owner: b,
      follow(h) { if (!h.fired) { h.x = b.x + b.face * 10; h.y = b.y - 86; } },
      onFire() { G.audio.play('cleave'); b.fast = true; b.pose = o.pose; G.fx.shake(7); if (o.wind) echo(b.x, b.face, o, o.wind); },
    });
  }
  // The Host (from the second phase): the ghost of the Knight is left standing where it cut, and
  // half a second later it makes the same cut again. Behind the Knight is still behind the ghost.
  function echo(x, face, o, wind, harmless) {
    const T = K.T(), tele = 0.5 * T, tint = tintNow();
    const g = { x, y: FLOOR, face, p: POSES[wind].slice(), kx: 0, a: 0, fired: false };
    const m = (ang) => (face > 0 ? ang : Math.PI - ang);
    const ao = {
      x: x + face * 10, y: FLOOR - (o.cy || 86), r: (o.r || 195) * 0.95, a0: m(o.a0), a1: m(o.a1), tele, active: 0.12, owner: g, tint,
      onFire() { g.fired = true; g.to = POSES[o.pose]; G.audio.play('blade'); G.fx.shake(4); },
    };
    if (harmless) { ao.hits = () => false; ao.heavy = true; } // for show, in the scene where the Host first rises
    const arc = H.arc(ao);
    return H.add({
      kind: 'ghost', layer: 'under', g,
      update(dt) {
        if (arc.dead && !g.fired) { this.dead = true; G.fx.burst(g.x, FLOOR - 70, { n: 14, color: tint.boss, speed: [60, 320], life: [0.25, 0.6], size: [3, 7] }); return; } // met and turned aside
        g.a = this.t < tele ? Math.min(1, this.t / 0.18) : Math.max(0, 1 - (this.t - tele - 0.12) / 0.3);
        if (g.to) { const q = 1 - Math.exp(-46 * dt); for (let i = 0; i < NP; i++) if (g.to[i] !== 999 && g.p[i] !== 999) g.p[i] += (g.to[i] - g.p[i]) * q; }
        if (Math.random() < dt * 30) G.fx.spawn({ x: g.x + G.rand(-24, 24), y: FLOOR - G.rand(10, 130), vx: G.rand(-14, 14), vy: -G.rand(30, 90), life: G.rand(0.3, 0.6), size: G.rand(2, 4), color: tint.boss });
        if (this.t > tele + 0.45) this.dead = true;
      },
      draw(ctx) { drawKnight(ctx, g, 0.62 * g.a); },
    });
  }

  // blaze: the blade burns red through the wind-up. That swing takes two health and throws a wave along the floor.
  function* cut(down, tele, r, blaze) {
    const b = B.body;
    b.fast = false; b.pose = down ? 'raise' : 'low'; b.blaze = blaze ? 1 : 0;
    if (blaze) { G.audio.play('charge', { dur: tele }); G.audio.play('whoosh'); }
    const o = down ? { a0: -2.5, a1: 0.78, tele, pose: 'cleave', r } : { a0: 0.78, a1: -2.5, tele, pose: 'rise', r };
    if (blaze) o.dmg = 2;
    if (B.phase >= 2) o.wind = down ? 'raise' : 'low';
    swing(o);
    yield* wait(tele);
    if (blaze) { H.shockwave(b.x + b.face * 84, b.face, 560, 46, { boss: DANGER, hot: '255,236,220' }); G.fx.shake(11); G.audio.play('boom'); }
    b.blaze = 0;
    yield* tween(b, { x: G.clamp(b.x + b.face * 34, WL + 50, WR - 50) }, 0.14, E.outCubic);
    yield* wait(0.12);
  }

  // The flying crescent of the rend: at head height, so it passes over anyone standing.
  function crescent(x, dir, speed) {
    const tint = tintNow();
    return H.add({
      kind: 'crescent', x, y: FLOOR - 100, dir, speed, tint,
      update(dt) {
        this.x += this.dir * this.speed * dt; this.srcX = this.x - this.dir * 30;
        if (Math.random() < 0.6) G.fx.spawn({ x: this.x - this.dir * 10, y: this.y + G.rand(-20, 20), vx: -this.dir * G.rand(20, 90), vy: G.rand(-20, 20), life: G.rand(0.15, 0.4), size: G.rand(2, 5), color: tint.boss });
        if (this.x < WL - 40 || this.x > WR + 40) this.dead = true;
      },
      hits(P) { return G.rectsOverlap(P.box(), { cx: this.x, cy: this.y, hw: 16, hh: 19 }); },
      draw(ctx) {
        const d = this.dir, x = this.x, y = this.y;
        ctx.globalCompositeOperation = 'lighter';
        D.glow(ctx, tint.boss, x, y, 60, 0.6);
        for (const [col, s, a] of [[DANGER, 1, 0.85], [tint.hot, 0.55, 1]]) {
          ctx.fillStyle = G.rgba(col, a);
          ctx.beginPath();
          ctx.moveTo(x - d * 14, y - 30 * s); ctx.quadraticCurveTo(x + d * 30 * s, y, x - d * 14, y + 30 * s);
          ctx.quadraticCurveTo(x + d * 6 * s, y, x - d * 14, y - 30 * s);
          ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  }

  // ------------------------------------------------------------------ attacks
  function* approach(dist, speed, maxT) {
    const b = B.body, P = G.player;
    let e = 0;
    b.pose = 'walk';
    while (e < maxT && Math.abs(P.x - b.x) > dist) {
      const dt = yield;
      e += dt; facePlayer();
      b.x = G.clamp(b.x + b.face * speed * dt, WL + 50, WR - 50);
    }
    facePlayer();
  }

  // The Knight's tells are in its body, not its tempo.
  //   It stamps its back foot after a cut: another cut is coming. No stamp: the blade drags, and it is open.
  //   Its blade burns red while it winds up: that swing takes two health and throws a wave. Do not trade with it.
  const BLAZE = [0, 0.25, 0.35, 0.45];
  function* stamp() {
    const b = B.body;
    G.audio.play('stomp'); G.fx.shake(5); G.fx.kick(0, 3);
    G.fx.thud(b.x - b.face * 20, FLOOR, 0.7, { noCrack: true });
    G.fx.ring(b.x - b.face * 20, FLOOR - 4, { r0: 10, r1: 96, life: 0.3, color: G.pal().hot, width: 4 });
    b.stamp = 1;
    yield* wait(0.34);
    facePlayer();
  }
  function* drag() {
    const b = B.body;
    b.fast = false; b.pose = 'low';
    // (v2.1a) the point drags on the floor and it is open the whole time: a window worth taking
    b.exposed = true;
    let e = 0;
    while (e < 0.8) {
      const dt = yield;
      e += dt;
      if (e < 0.5 && Math.random() < dt * 14) {
        const L = bladeLine(b);
        if (L.py > FLOOR - 24) G.fx.spawn({ kind: 'spark', x: L.px, y: FLOOR - 2, vx: b.face * G.rand(30, 160), vy: -G.rand(40, 160), life: G.rand(0.1, 0.25), size: G.rand(1.2, 2.2), color: G.pal().hot, drag: 2, grav: 900 });
      }
    }
    b.exposed = false;
  }
  function* atkCleave() {
    const T = K.T();
    G.ui.hint('knightback', 'Its swings do not reach behind it. Dash through and strike its back');
    yield* approach(150, 300, 0.7);
    const blaze = K.chance(BLAZE[1], 'blaze');
    yield* cut(true, (blaze ? 0.92 : 0.78) * T, null, blaze);
    if (yield* turned(0.6)) return;
    if (K.hard() || K.chance(0.35, 'follow')) { yield* stamp(); yield* cut(false, 0.5 * T); }
    yield* drag();
  }
  // (v2.1a) The branch: a hero who went through it to its back as the cleave fell is answered. The
  // helm snaps round first (the same tell as the Heel), the blade stays low, and it pivots and sweeps
  // round along the floor behind it (jump). Then it drags, open.
  function* turned(p) {
    const b = B.body, P = G.player;
    if (!((P.x - b.x) * b.face < -14 && Math.abs(P.x - b.x) < 250 && P.y > FLOOR - 170)) return false;
    if (!K.chance(p, 'turn')) return false;
    yield* turnCut(0.46 * K.T());
    yield* drag();
    return true;
  }
  function* atkCleave2() {
    const T = K.T();
    yield* approach(150, 320, 0.7);
    const blaze = K.chance(BLAZE[2], 'blaze');
    yield* cut(true, (blaze ? 0.86 : 0.72) * T, null, blaze);
    if (yield* turned(0.75)) return;
    if (K.chance(0.7, 'follow')) {
      yield* stamp(); yield* cut(false, 0.48 * T);
      if (K.hard() || K.chance(0.4, 'follow')) { yield* stamp(); yield* cut(true, 0.46 * T); }
    }
    yield* drag();
  }

  // The sword comes down on a marked spot and sticks there.
  // (v2.1a) delay: it holds the blade at the top a breath too long. The tell is in the body: it lifts
  // the sword higher and further back, leans back on its heels, and the slit of its visor burns.
  function* overhead(track, lock, stuck, delay) {
    const b = B.body, P = G.player;
    facePlayer();
    b.fast = false; b.pose = delay ? 'overHold' : 'overRaise';
    if (delay) b.burn = 1;
    const reach = 138;
    const m = K.columnMark(b.x + b.face * reach, 132, true); // where the blade will land (not drawn: watch the sword)
    G.audio.play('charge', { dur: track + lock });
    let e = 0;
    while (e < track) {
      const dt = yield;
      e += dt;
      // it strides after the hero while the blade is up
      const want = P.x - b.face * reach;
      if ((want - b.x) * b.face > 4) b.x = G.clamp(b.x + b.face * Math.min(230, Math.abs(want - b.x) * 6) * dt, WL + 50, WR - 50);
      m.x = b.x + b.face * reach; m.k = e / track * 0.7;
    }
    // the blade stops following and catches the light: it is coming down
    G.fx.glint(b.x - b.face * 8, b.y - 212, 34, DANGER, 0.3); G.audio.play('glint');
    e = 0;
    while (e < lock) { e += yield; m.k = 0.7 + 0.3 * Math.min(1, e / lock); }
    if (delay) {
      // ...and it does not come. The weight creeps further back and the arms tremble with holding it.
      e = 0;
      while (e < delay) {
        const dt = yield;
        e += dt;
        b.pose = building('overHold', 'overHoldDeep', e / delay);
        b.jit = 0.5 + 0.7 * (e / delay);
      }
      b.jit = 0;
    }
    b.fast = true; b.pose = 'slam'; b.burn = 0;
    yield* wait(0.07);
    m.dead = true;
    K.crush(m.x, FLOOR - 24, 54, 28, 2); // (the burst on the floor, where it is drawn; v2.1b, from 160 px tall)
    K.impact(m.x, true);
    H.shockwave(m.x - 50, -1, 450, 46);
    H.shockwave(m.x + 50, 1, 450, 46);
    yield* stuckFast(stuck + (delay ? 0.25 : 0), m.x);
  }
  // Stuck: the blade is in the floor and it is open; towards the end it strains to pull it free (the
  // body shakes, grit spits from round the blade, the steel creaks), so the end of the window shows.
  function* stuckFast(dur, x) {
    const b = B.body;
    b.exposed = true;
    let e = 0, creaked = false;
    while (e < dur) {
      const dt = yield;
      e += dt;
      const k = e / dur;
      b.jit = k > 0.55 ? (k - 0.55) * 2.4 : 0;
      if (k > 0.55 && Math.random() < dt * 16) G.fx.burst(x + G.rand(-10, 10), FLOOR - 3, { n: 1, color: '22,18,32', speed: [60, 220], angle: -Math.PI / 2, spread: 1.2, life: [0.3, 0.6], size: [2, 4], kind: 'chunk', grav: 1400 });
      if (!creaked && k > 0.6) { creaked = true; G.audio.play('knightCreak'); }
    }
    b.jit = 0;
    b.exposed = false;
  }
  function* atkOverhead() {
    const T = K.T();
    yield* approach(260, 300, 0.6);
    const delay = K.chance([0, 0.3, 0.4, 0.45][B.phase], 'delay') ? (B.phase === 3 ? 0.32 : 0.38) : 0;
    yield* overhead(0.62 * T, 0.3 * T, B.phase === 3 ? 1.2 : 1.45, delay);
  }

  // A charge from wall to wall. It cannot stop, and the wall stuns it.
  function* atkCharge() {
    const b = B.body, T = K.T();
    facePlayer();
    const dir = b.face, tele = 0.85 * T;
    b.pose = 'chargeUp';
    H.lane({ x: WL, y: FLOOR - 108, w: WR - WL, h: 108, dir, dur: tele, quiet: true });
    G.audio.play('charge', { dur: tele });
    // it lowers its shoulder and its back foot tears at the ground
    let ce = 0, glinted = false;
    while (ce < tele) {
      const dt = yield;
      ce += dt;
      if (Math.random() < dt * 30) G.fx.dust(b.x - dir * 26, FLOOR, 1, { dir: -dir, speed: [60, 260], size: [6, 11], life: [0.3, 0.6], up: 40, a: 0.4 });
      if (!glinted && ce >= tele - 0.22) { glinted = true; G.fx.glint(b.x + dir * 22, b.y - 84, 30, G.pal().hot); G.audio.play('glint'); }
    }
    b.pose = 'charge'; b.hurt = true;
    G.audio.play('sweep');
    const tx = dir > 0 ? WR - 56 : WL + 56, speed = K.gentle() ? 880 : 1020;
    while ((tx - b.x) * dir > 0) {
      const dt = yield;
      b.x += dir * speed * dt;
      G.fx.shake(3);
      if (Math.random() < dt * 60) G.fx.dust(b.x - dir * 34, FLOOR, 1, { dir: -dir, speed: [40, 240], size: [7, 13], life: [0.4, 0.8], up: 60, a: 0.42 });
      if (Math.random() < dt * 24) G.fx.burst(b.x - dir * 30, FLOOR - 4, { n: 1, color: '24,22,30', speed: [120, 380], angle: -Math.PI / 2 - dir * 0.5, spread: 1.4, life: [0.4, 0.8], size: [2.5, 5], kind: 'chunk', grav: 1500 });
    }
    b.x = tx; b.hurt = false;
    K.impact(tx + dir * 30, true);
    if (B.phase >= 2) {
      // rubble shaken loose from the wall
      for (let i = 0; i < 4; i++) H.orb(tx + dir * 20, FLOOR - 300 - i * 40, -dir * G.rrand(120, 520), -G.rrand(60, 320), { grav: 1000, r: 11 });
    }
    b.pose = 'crash'; b.exposed = true;
    yield* wait(B.phase === 3 ? 1.1 : 1.4);
    b.exposed = false;
  }

  // It drags the hero in, with a cleave already on its way.
  function* atkGrip() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('grip', 'It pulls you in. Dash past it before the blade lands');
    facePlayer();
    b.pose = 'grip';
    const tele = 0.5 * T;
    const tether = H.add({
      kind: 'tether', t: 0,
      update() { },
      draw(ctx) {
        const k = Math.min(1, this.t / tele), hx = b.x + b.face * 48, hy = b.y - 86;
        ctx.strokeStyle = G.rgba(this.t < tele ? DANGER : G.pal().boss, 0.4 + 0.5 * k); ctx.lineWidth = 2 + 2 * k;
        ctx.setLineDash([12, 9]); ctx.lineDashOffset = this.t * 160;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + P.x) / 2, Math.min(hy, P.y - 30) - 40, P.x, P.y - 26); ctx.stroke();
        ctx.setLineDash([]);
        D.glow(ctx, G.pal().boss, hx, hy, 20 + 14 * k, 0.9);
      },
    });
    G.audio.play('charge', { dur: tele });
    yield* wait(tele);
    G.audio.play('pull');
    const pullT = 0.8;
    b.fast = false; b.pose = 'raise';
    swing({ a0: -2.5, a1: 0.78, tele: pullT + 0.15 * T, pose: 'cleave' });
    let e = 0;
    while (e < pullT) {
      const dt = yield;
      e += dt;
      const dx = b.x - P.x;
      G.wind = Math.abs(dx) > 70 ? G.sign(dx) * (K.gentle() ? 380 : 450) : 0;
    }
    G.wind = 0; tether.dead = true;
    yield* wait(0.15 * T + 0.2);
    if (B.phase >= 2) { facePlayer(); yield* cut(false, 0.5 * T); }
    yield* wait(0.75);
  }

  // Columns come down where the hero stands, one after another. They reach from the top of the
  // screen to the floor (v1.7c; they used to stop 200 pixels up, so a jump cleared them): the only
  // way out of one is sideways.
  function* atkGraves() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    b.pose = 'plant';
    G.audio.play('charge', { dur: 0.5 * T });
    yield* wait(0.5 * T);
    G.audio.play('bell'); G.fx.shake(6);
    const n = 4 + (B.phase - 1) + (K.hard() ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const x = G.clamp(P.x + P.vx * 0.22 + G.rrand(-12, 12), WL + 50, WR - 50);
      H.zone({ x: x - 46, y: -80, w: 92, h: FLOOR + 80, tele: 0.66 * T, active: 0.3, style: 'column', onFire() { G.audio.play('boom'); G.fx.shake(5); } });
      yield* wait(0.4);
    }
    yield* wait(0.66 * T + 0.35);
  }

  // Skulls that drift after the hero. They can be cut down.
  function* atkWraiths() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('wraiths', 'The skulls follow you. Cut them down');
    facePlayer();
    b.pose = 'plant';
    G.audio.play('charge', { dur: 0.7 * T });
    yield* wait(0.7 * T);
    G.audio.play('bell');
    const n = 3 + (B.phase === 3 ? 1 : 0) + (K.hard() ? 1 : 0), speed = K.gentle() ? 185 : 225;
    for (let i = 0; i < n; i++) {
      G.audio.play('orb');
      H.orb(b.x + b.face * 24, b.y - 150, G.rrand(-200, 200), -G.rrand(260, 420), {
        r: 14, life: 6, skull: true,
        steer(ob, dt) {
          if (ob.t < 0.45) { ob.vy += 500 * dt; return; }
          const dx = P.x - ob.x, dy = P.y - 26 - ob.y, d = Math.hypot(dx, dy) || 1;
          ob.vx = G.damp(ob.vx, dx / d * speed, 2.4, dt); ob.vy = G.damp(ob.vy, dy / d * speed, 2.4, dt);
          if (ob.life < 0.05) ob.pop();
        },
      });
      yield* wait(0.25);
    }
    yield* wait(0.8);
  }

  // The ground rots where it is marked, and stays that way for a while.
  function* atkDesecrate() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('rot', 'Keep off the rotting ground');
    facePlayer();
    b.fast = false; b.pose = 'overRaise';
    G.audio.play('charge', { dur: 0.6 * T });
    yield* wait(0.6 * T);
    b.fast = true; b.pose = 'slam';
    yield* wait(0.07);
    K.impact(b.x + b.face * 60, false);
    K.crush(b.x + b.face * 60, FLOOR - 24, 48, 28, 1);
    const have = H.list.filter((h) => h.kind === 'pool').length;
    const n = Math.max(0, Math.min((B.phase === 3 ? 4 : 3) + (K.hard() ? 1 : 0), 5 - have));
    const xs = [G.clamp(P.x, WL + 100, WR - 100)];
    for (let tries = 0; tries < 30 && xs.length < n; tries++) {
      const x = G.rrand(WL + 110, WR - 110);
      if (xs.every((o) => Math.abs(o - x) > 210) && Math.abs(x - b.x) > 120) xs.push(x);
    }
    for (const x of xs) H.pool({ x, w: 170, tele: 0.9 * T, active: K.gentle() ? 4.5 : 5.5 });
    yield* wait(1.1);
  }

  // It spins towards the hero with the blade out, then staggers to a stop.
  function* atkWhirl() {
    const b = B.body, P = G.player, T = K.T();
    G.ui.hint('whirl', 'Keep away from the spinning blade: run, dash through it, or take a platform');
    facePlayer();
    b.pose = 'whirl';
    const tele = 0.85 * T, dur = B.ring ? 1.7 : 2.4, R = 80, TOP = 108;
    G.audio.play('charge', { dur: tele });
    H.add({
      kind: 'whirl', layer: 'under', t: 0, r: R,
      update() { this.srcX = b.x; if (this.t > tele + dur) this.dead = true; },
      // (the rings it draws reach 88 px up: a hero whose feet are over them is clear; v2.1b, from TOP - 6)
      hits(Pl) { return this.t >= tele && this.t < tele + dur && Math.abs(Pl.x - b.x) < R + 4 && Pl.y > FLOOR - 88; },
      draw(ctx) {
        // no box and no red: the wind gathering round the blade, then the blade itself
        const x = b.x, pal = G.pal();
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        if (this.t < tele) {
          const k = this.t / tele;
          for (let i = 0; i < 2; i++) {
            const a = this.t * (5 + 9 * k) + i * Math.PI;
            ctx.strokeStyle = G.rgba(pal.boss, 0.12 + 0.3 * k); ctx.lineWidth = 2 + 4 * k;
            ctx.beginPath(); ctx.ellipse(x, FLOOR - 58, (R - 8) * (0.5 + 0.5 * k), (R - 8) * 0.28 * (0.5 + 0.5 * k), 0, a, a + 0.5 + 0.9 * k); ctx.stroke();
          }
        } else {
          const f = Math.min(1, (tele + dur - this.t) / 0.25);
          for (let i = 0; i < 3; i++) {
            const a = this.t * 15 + i * G.TAU / 3;
            ctx.strokeStyle = G.rgba(i ? pal.boss : pal.hot, (i ? 0.5 : 0.9) * f); ctx.lineWidth = i ? 15 : 7;
            ctx.beginPath(); ctx.ellipse(x, FLOOR - 62 + i * 8, R - 8, (R - 8) * 0.3, 0, a, a + 1.5); ctx.stroke();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    });
    // leaves and dust are drawn in to it while it winds up
    let we = 0, wg = false;
    while (we < tele) {
      const dt = yield;
      we += dt;
      if (Math.random() < dt * 26) { const s = Math.random() < 0.5 ? -1 : 1; G.fx.dust(b.x + s * G.rand(70, 130), FLOOR, 1, { dir: -s, speed: [80, 240], size: [5, 9], life: [0.3, 0.6], up: 30, a: 0.34 }); }
      if (!wg && we >= tele - 0.22) { wg = true; G.fx.glint(b.x + b.face * 74, b.y - 70, 32, G.pal().hot); G.audio.play('glint'); }
    }
    b.spinning = true;
    let e = 0, sfx = 0;
    const speed = ((K.gentle() ? 205 : 240) + (K.hard() ? 35 : 0)) * (B.ring ? 0.8 : 1);
    while (e < dur) {
      const dt = yield;
      e += dt; sfx -= dt;
      b.spin += dt * 15;
      if (Math.abs(P.x - b.x) > 8) b.x = G.clamp(b.x + G.sign(P.x - b.x) * speed * dt, WL + 60, WR - 60);
      if (sfx <= 0) { sfx = 0.28; G.audio.play('blade'); G.fx.shake(2.5); }
    }
    b.spinning = false; facePlayer();
    b.pose = 'crash'; b.exposed = true;
    yield* wait(1.15);
    b.exposed = false;
  }

  // Waves thrown from the blade: low ones to jump, high ones to stay under.
  function* atkRend() {
    const b = B.body, T = K.T();
    G.ui.hint('rend', 'Jump the low wave. Stay on the ground for the high one');
    facePlayer();
    const n = 3 + (B.phase === 3 ? 1 : 0) + (K.hard() ? 1 : 0);
    let low = false; // off the shoulder the blade can only come down first; the low wave is the cut back up
    for (let i = 0; i < n; i++) {
      const tele = (i ? 0.6 : 0.7) * T, dir = b.face;
      b.fast = false; b.pose = low ? 'low' : 'raise';
      H.lane({ x: WL, y: low ? FLOOR - 58 : FLOOR - 124, w: WR - WL, h: low ? 58 : 48, dir, dur: tele });
      yield* wait(tele);
      b.fast = true; b.pose = low ? 'rise' : 'cleave';
      G.audio.play('cleave'); G.fx.shake(5);
      if (low) H.shockwave(b.x + dir * 50, dir, 560, 56);
      else crescent(b.x + dir * 50, dir, 560);
      yield* wait(Math.max(0.2, 0.92 - tele));
      low = !low;
    }
    yield* wait(0.85);
  }

  // It leaps and comes down on the hero.
  function* atkLeap() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    b.pose = 'chargeUp';
    yield* wait(0.3);
    b.fast = true; b.pose = 'air';
    G.audio.play('whoosh');
    K.impact(b.x, false);
    yield* tween(b, { y: -260 }, 0.32, E.outQuad);
    const tele = 0.95 * T, lockT = 0.32 * T;
    const bl = H.blast({
      x: P.x, y: FLOOR - 8, r: 150, tele, dmg: 2,
      follow(h) { if (h.t < tele - lockT) h.x = G.damp(h.x, G.clamp(P.x, WL + 80, WR - 80), 0.2, 1); },
    });
    yield* wait(tele - 0.11);
    b.x = bl.x; b.face = P.x >= b.x ? 1 : -1;
    b.pose = 'slam';
    yield* tween(b, { y: FLOOR }, 0.11, E.inQuad);
    H.shockwave(b.x - 60, -1, 470, 46);
    H.shockwave(b.x + 60, 1, 470, 46);
    if (K.hard()) for (const s of [-1, 1]) H.pool({ x: G.clamp(b.x + s * 230, WL + 100, WR - 100), w: 150, tele: 0.8 * T, active: 4 });
    b.exposed = true;
    yield* wait(1.2);
    b.exposed = false;
  }

  // The third phase's chain: down, up, and the overhead to finish.
  function* atkReap() {
    const T = K.T();
    yield* approach(150, 340, 0.7);
    const blaze = K.chance(BLAZE[3], 'blaze');
    yield* cut(true, (blaze ? 0.8 : 0.66) * T, null, blaze);
    yield* stamp();
    yield* cut(false, 0.44 * T);
    // a second stamp, and the overhead follows; without it the Knight is spent
    if (K.chance(0.6, 'follow')) { yield* stamp(); yield* overhead(0.42 * T, 0.28 * T, 1.05); }
    else yield* drag();
  }

  // Hurl: the Knight throws its sword the length of the arena. It sticks in the far wall, and until
  // the Knight calls it back it has no weapon and stands open. The sword then tears free and flies
  // home: if the hero is between the wall and the Knight, it comes at their back.
  function* atkHurl() {
    const b = B.body, T = K.T(), P = G.player;
    facePlayer();
    const dir = b.face, tele = 0.8 * T, speed = K.gentle() ? 860 : 980;
    b.fast = false; b.pose = 'raise';
    // (v2.5b: the lane runs only where the sword will fly, from its edge as it leaves the Knight's hand
    // to the wall it sticks in; it used to cover the whole floor, behind the Knight too)
    const span = (a, c) => ({ x: Math.min(a, c), w: Math.abs(c - a) });
    const wallAt = dir > 0 ? WR : WL;
    const out = span(b.x + dir * (60 - 36), wallAt);
    H.lane({ x: out.x, y: FLOOR - 66, w: out.w, h: 66, dir, dur: tele });
    G.audio.play('charge', { dur: tele });
    yield* wait(tele);
    b.fast = true; b.pose = 'cleave'; b.unarmed = true;
    G.audio.play('cleave'); G.audio.play('streak'); G.fx.shake(6);
    const tint = tintNow(), wall = dir > 0 ? WR - 34 : WL + 34;
    const blade = H.add({
      kind: 'blade', x: b.x + dir * 60, y: FLOOR - 40, dir, speed, state: 'out', spin: 0, tint, quiver: 0,
      update(dt) {
        if (this.state === 'out') {
          this.x += this.dir * this.speed * dt; this.spin += this.dir * 26 * dt;
          if ((this.x - wall) * this.dir >= 0) {
            this.x = wall; this.state = 'stuck'; this.quiver = 1;
            G.audio.play('tink'); G.audio.play('boom'); G.fx.shake(9);
            G.fx.burst(this.x, this.y, { n: 14, color: tint.hot, speed: [120, 520], angle: this.dir > 0 ? Math.PI : 0, spread: 2.2, life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
            G.fx.dust(this.x, this.y, 5, { dir: -this.dir, speed: [40, 220], size: [7, 12], up: 60 });
          }
        } else if (this.state === 'stuck') {
          this.quiver = Math.max(0, this.quiver - dt * 2);
        } else {
          // called home: it comes back faster than it left
          this.x -= this.dir * this.speed * 1.12 * dt; this.spin -= this.dir * 30 * dt;
          if ((this.x - b.x) * this.dir <= 44) this.dead = true;
        }
        this.srcX = this.x - (this.state === 'back' ? -this.dir : this.dir) * 30;
        if (this.state !== 'stuck' && Math.random() < dt * 50) G.fx.spawn({ x: this.x + G.rand(-20, 20), y: this.y + G.rand(-16, 16), vx: G.rand(-30, 30), vy: G.rand(-30, 30), life: G.rand(0.15, 0.35), size: G.rand(2, 5), color: tint.boss });
      },
      hits(Pl) { return this.state !== 'stuck' && G.rectsOverlap(Pl.box(), { cx: this.x, cy: this.y, hw: 36, hh: 24 }); },
      draw(ctx) {
        // stuck in the wall it points along its flight and shivers; in flight it spins
        const ang = this.state === 'stuck' ? (this.dir > 0 ? 0 : Math.PI) + Math.sin(this.t * 60) * 0.06 * this.quiver : this.spin;
        ctx.globalCompositeOperation = 'lighter';
        if (this.state !== 'stuck') D.glow(ctx, DANGER, this.x, this.y, 70, 0.5);
        ctx.globalCompositeOperation = 'source-over';
        sword(ctx, this.x - Math.cos(ang) * (this.state === 'stuck' ? SWORD - 30 : 60), this.y - Math.sin(ang) * 60, ang, tint.boss, tint.hot);
      },
    });
    // unarmed: nothing to swing, and every blow counts for more
    while (blade.state === 'out') yield;
    b.pose = 'idle'; b.exposed = true;
    yield* wait(B.phase === 3 ? 1.0 : 1.4);
    // the call: a lane the other way, then the sword tears free
    b.pose = 'grip'; facePlayer();
    const home = span(wallAt, b.x + dir * (44 - 36));
    H.lane({ x: home.x, y: FLOOR - 66, w: home.w, h: 66, dir: -dir, dur: 0.6 * T });
    G.audio.play('pull');
    yield* wait(0.6 * T);
    blade.state = 'back';
    G.audio.play('streak');
    while (!blade.dead) yield;
    b.unarmed = false; b.exposed = false; b.fast = true; b.pose = 'raise';
    G.audio.play('blade'); G.fx.shake(5);
    G.fx.ring(b.x, b.y - 80, { r0: 60, r1: 12, life: 0.25, color: tint.hot, width: 4 });
    yield* wait(0.35);
    // from the second phase it does not waste the catch
    if (B.phase >= 2) { facePlayer(); yield* cut(true, 0.5 * T); }
  }

  // A cut thrown off the blade along a line, at whatever height the hero is.
  function flyingCut(x, y, ang, speed) {
    const tint = tintNow(), c = Math.cos(ang), s = Math.sin(ang);
    return H.add({
      kind: 'flycut', x, y, tint, vx: c * speed, vy: s * speed,
      update(dt) {
        this.x += c * speed * dt; this.y += s * speed * dt; this.srcX = this.x - c * 30;
        if (Math.random() < 0.7) G.fx.spawn({ x: this.x - c * 10 + G.rand(-12, 12), y: this.y - s * 10 + G.rand(-12, 12), vx: -c * G.rand(20, 90), vy: -s * G.rand(20, 90), life: G.rand(0.15, 0.4), size: G.rand(2, 5), color: tint.boss });
        if (this.y > FLOOR - 8) { this.dead = true; G.fx.thud(this.x, FLOOR, 0.6, { col: tint.boss }); G.fx.shake(4); }
        else if (this.x < G.WALL_L - 40 || this.x > G.WALL_R + 40 || this.y < -80) this.dead = true;
      },
      hits(P) { return G.rectsOverlap(P.box(), { cx: this.x, cy: this.y, hw: 17, hh: 17 }); },
      draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(ang);
        ctx.globalCompositeOperation = 'lighter';
        D.glow(ctx, tint.boss, 0, 0, 60, 0.6);
        for (const [col, q, a] of [[DANGER, 1, 0.85], [tint.hot, 0.55, 1]]) {
          ctx.fillStyle = G.rgba(col, a);
          ctx.beginPath();
          ctx.moveTo(-14, -30 * q); ctx.quadraticCurveTo(30 * q, 0, -14, 30 * q);
          ctx.quadraticCurveTo(6 * q, 0, -14, -30 * q);
          ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      },
    });
  }

  // Sever: its answer to a hero who will not come near. It throws cuts off the blade straight at
  // them, wherever they are, in the air included, and then it comes for them at a run.
  function* atkSever() {
    const b = B.body, T = K.T();
    const n = (B.phase === 3 ? 3 : 2) + (K.hard() ? 1 : 0);
    for (let i = 0; i < n; i++) {
      facePlayer();
      b.fast = false; b.pose = i % 2 ? 'low' : 'raise';
      const tele = (i ? 0.44 : 0.62) * T, ox = b.x + b.face * 44, oy = b.y - 92;
      const aim = K.aim(ox, oy, tele, 0.17);
      if (!i) G.audio.play('charge', { dur: tele });
      yield* wait(tele);
      b.fast = true; b.pose = i % 2 ? 'rise' : 'cleave';
      G.audio.play('cleave'); G.audio.play('streak'); G.fx.shake(5);
      flyingCut(ox, oy, aim.ang, K.gentle() ? 780 : 900);
      yield* wait(0.26);
    }
    yield* approach(165, 560, 0.9);
    yield* cut(true, 0.52 * T);
    yield* drag();
  }

  // ------------------------------------------------------------------ the heel and the thrust
  G.audio.define('bladeGrind', () => {
    // steel dragged over stone as its point comes to rest on the floor
    G.audio.synth.noise({ type: 'bandpass', f0: 2600, f1: 1500, q: 6, dur: 0.42, vol: 0.09, attack: 0.05 });
    G.audio.synth.tone({ type: 'sawtooth', f0: 190, f1: 150, dur: 0.36, vol: 0.025, attack: 0.04 });
  });
  G.audio.define('knightThrust', () => {
    // the point driven through the air: a narrow hiss that drops, and the weight of the lunge under it
    G.audio.synth.noise({ type: 'bandpass', f0: 5200, f1: 1300, q: 3.5, dur: 0.2, vol: 0.2 });
    G.audio.synth.tone({ type: 'triangle', f0: 120, f1: 52, dur: 0.24, vol: 0.32 });
  });

  // Where the sword is in the world, from the guard to the point (for the cuts that follow the blade).
  function bladeLine(b) {
    const f = b.face, ang = b.p[8], hx = b.x + f * b.p[6], hy = b.y + b.p[7];
    return { hx, hy, px: hx + f * Math.cos(ang) * SWORD, py: hy + Math.sin(ang) * SWORD };
  }

  // The Heel. Its back takes more and nothing covers it, so a hero who lives there is answered: it
  // looks back over its shoulder, and whips the greatsword round behind it.
  //   Its tell: the helm turns first, then the blade goes where the cut will come from. Let down with
  //   its point grinding on the floor: a low sweep round along the ground (jump). Hoisted level over
  //   the shoulder, pointing back: a high backhand at chest height (stay on the ground, or back off).
  //   The Host makes it twice (its ghost, a beat later); under the Blood Oath it turns straight into
  //   an overhead.
  // It comes on its own when the hero has spent long enough at its back (B.choose); drawn from the
  // bag with the hero in front, it turns its back on them first, and lets them come.
  // (Not every time: its back is still the place to be, so two other attacks come between.)
  B.choose = function () {
    const b = B.body;
    B.sinceHeel = (B.sinceHeel || 0) + 1;
    if ((b.behindT || 0) > 2.2 && B.sinceHeel >= 3 && B.bags[B.phase].includes('heel')) { b.behindT = 0; return 'heel'; }
    return '';
  };
  function* atkHeel() {
    const b = B.body, P = G.player, T = K.T();
    const tele = [0, 0.8, 0.72, 0.62][B.phase] * T, SPIN = 0.17;
    b.fast = false; b.spinning = false; B.sinceHeel = 0;
    if ((P.x - b.x) * b.face > -14) {
      // the hero is in front: it turns away from them with a heavy step, as if it had done with them
      b.face = P.x > b.x ? -1 : 1;
      b.pose = 'heft';
      yield* tween(b, { x: G.clamp(b.x + b.face * 28, WL + 50, WR - 50) }, 0.32, E.inOutQuad);
      G.audio.play('stepHeavy'); G.fx.kick(0, 1.2);
      G.fx.dust(b.x + b.face * 14, FLOOR, 2, { speed: [20, 100], size: [5, 9], up: 24, a: 0.32 });
      b.pose = 'idle';
      yield* wait(0.26);
    }
    const back = -b.face, low = K.chance(0.5, 'low');
    // the helm turns first
    b.lookT = 1;
    yield* wait(0.16);
    b.pose = low ? 'heelLow' : 'heelHigh';
    G.audio.play('charge', { dur: tele });
    if (low) G.audio.play('bladeGrind');
    // (the low sweep turns about the knee, not the shoulder: it stays under a jump even up close)
    const o = low ? { a0: 1.5, a1: 0.2, r: 192, cy: 50, pose: 'heelLowCut' } : { a0: -1.0, a1: 0.14, r: 200, cy: 86, pose: 'heelHighCut' };
    const m = (ang) => (back > 0 ? ang : Math.PI - ang);
    H.arc({
      // (it lands as the turn finishes, so the cut and the blade arrive together)
      x: b.x + back * 10, y: b.y - o.cy, r: o.r, a0: m(o.a0), a1: m(o.a1), tele: tele - 0.05, active: 0.15, owner: b,
      follow(h) { if (!h.fired) { h.x = b.x + back * 10; h.y = b.y - o.cy; } },
      onFire() {
        G.audio.play('cleave'); G.fx.shake(7);
        // the low sweep's path along the floor (its arc is mostly below the floor line)
        if (low) G.fx.cut(b.x + back * 105, FLOOR - 20, back > 0 ? 0 : Math.PI, 220, 7, G.pal().boss, G.pal().hot, 0.18);
        if (B.phase >= 2) echo(b.x, back, o, low ? 'heelLow' : 'heelHigh');
      },
    });
    let e = 0;
    while (e < tele - SPIN) {
      const dt = yield;
      e += dt;
      const k = e / (tele - SPIN);
      b.pose = building(low ? 'heelLow' : 'heelHigh', low ? 'heelLowDeep' : 'heelHighDeep', k);
      b.jit = k > 0.72 ? 0.9 : 0;
      // the point bites the floor as the weight comes onto it
      if (low && Math.random() < dt * 18) {
        const L = bladeLine(b);
        G.fx.spawn({ kind: 'spark', x: L.px, y: FLOOR - 2, vx: -b.face * G.rand(40, 200), vy: -G.rand(60, 220), life: G.rand(0.12, 0.3), size: G.rand(1.4, 2.6), color: G.pal().hot, drag: 2, grav: 900 });
      }
    }
    // the whip: it pivots on its front foot and the blade comes round with the whole body behind it
    b.pose = o.pose;
    const s = yield* pivot(back, SPIN, 12);
    if (low) G.fx.dust(b.x + back * 120, FLOOR, 4, { dir: back, speed: [80, 300], size: [6, 11], up: 30, a: 0.36 });
    while (e + s < tele + 0.02) { e += yield; }
    yield* wait(0.12);
    if (B.phase === 3) {
      // the Blood Oath: no pause between them, the cut carries straight up into the overhead
      yield* overhead(0.4 * T, 0.26 * T, 1.05);
    } else {
      // it stands into the follow-through, then lets the blade's weight settle
      yield* tween(b, { x: G.clamp(b.x + back * 10, WL + 50, WR - 50) }, 0.18, E.outCubic);
      yield* wait(B.phase === 2 ? 0.55 : 0.45);
    }
  }

  // A pivot on the front foot, the blade coming round with the whole body behind it (the Heel, and
  // the cleave's branch). Returns the time it took.
  function* pivot(back, SPIN, step) {
    const b = B.body;
    b.jit = 0;
    b.spinning = true; b.spin = 0; b.fast = true;
    G.audio.play('whoosh');
    const x0 = b.x, x1 = G.clamp(b.x + back * step, WL + 50, WR - 50); // (a pivot, not a step in)
    let s = 0;
    while (s < SPIN) {
      const dt = yield;
      s += dt;
      const k = Math.min(1, s / SPIN);
      // it gathers speed through the turn, and the weight of the blade carries it round and slows it
      b.spin = Math.PI * (k < 0.7 ? k * k / 0.7 : 1 - (1 - k) * (1 - k) / 0.3);
      b.x = G.lerp(x0, x1, E.outCubic(k));
    }
    b.spinning = false; b.spin = 0;
    b.face = back; b.tqf = back; b.tqP = 1; // (the turn is the spin itself: K.turn must not turn it again)
    b.lookT = 0; b.look = 0; b.lookV = 0;   // (the helm already faced this way)
    if (b.pv) b.pv[1] += 30;
    return s;
  }
  // The cleave's branch: a low sweep round behind it, told by the helm turning first.
  function* turnCut(tele) {
    const b = B.body, back = -b.face, SPIN = 0.16;
    b.lookT = 1;
    G.audio.play('bladeGrind');
    yield* wait(0.1);
    b.fast = false; b.pose = 'heelLow';
    const m = (ang) => (back > 0 ? ang : Math.PI - ang);
    H.arc({
      x: b.x + back * 10, y: b.y - 50, r: 192, a0: m(1.5), a1: m(0.2), tele: tele - 0.05, active: 0.15, owner: b,
      follow(h) { if (!h.fired) { h.x = b.x + back * 10; h.y = b.y - 50; } },
      onFire() {
        G.audio.play('cleave'); G.fx.shake(7);
        G.fx.cut(b.x + back * 105, FLOOR - 20, back > 0 ? 0 : Math.PI, 220, 7, G.pal().boss, G.pal().hot, 0.18);
        if (B.phase >= 2) echo(b.x, back, { a0: 1.5, a1: 0.2, r: 192, cy: 50, pose: 'heelLowCut' }, 'heelLow');
      },
    });
    let e = 0;
    while (e < tele - SPIN) {
      const dt = yield;
      e += dt;
      const k = e / (tele - SPIN);
      b.pose = building('heelLow', 'heelLowDeep', k);
      b.jit = k > 0.7 ? 0.8 : 0;
      if (Math.random() < dt * 18) {
        const L = bladeLine(b);
        G.fx.spawn({ kind: 'spark', x: L.px, y: FLOOR - 2, vx: -b.face * G.rand(40, 200), vy: -G.rand(60, 220), life: G.rand(0.12, 0.3), size: G.rand(1.4, 2.6), color: G.pal().hot, drag: 2, grav: 900 });
      }
    }
    b.pose = 'heelLowCut';
    const s = yield* pivot(back, SPIN, 12);
    G.fx.dust(b.x + back * 120, FLOOR, 4, { dir: back, speed: [80, 300], size: [6, 11], up: 30, a: 0.36 });
    while (e + s < tele + 0.02) { e += yield; }
    yield* wait(0.1);
  }

  // The thrust's spectral lance (from the second phase): the point's line goes on to the wall.
  // (Low, it is jumped like a cut thrown along the floor; high, it passes over a standing hero.)
  function lance(x, y, dir, low) {
    const tint = tintNow(), speed = K.gentle() ? 820 : 940;
    return H.add({
      kind: low ? 'flycut' : 'crescent', x, y, dir, vx: dir * speed, speed, tint,
      update(dt) {
        this.x += dir * speed * dt; this.srcX = this.x - dir * 40;
        if (Math.random() < 0.7) G.fx.spawn({ x: this.x - dir * G.rand(10, 120), y: this.y + G.rand(-6, 6), vx: -dir * G.rand(20, 90), vy: G.rand(-14, 14), life: G.rand(0.15, 0.4), size: G.rand(2, 4), color: tint.boss });
        if (this.x < WL - 30 || this.x > WR + 30) {
          this.dead = true;
          G.fx.burst(G.clamp(this.x, WL, WR), this.y, { n: 10, color: tint.hot, speed: [100, 380], angle: dir > 0 ? Math.PI : 0, spread: 1.8, life: [0.15, 0.35], kind: 'spark', size: [1.6, 3] });
          G.fx.shake(3);
        }
      },
      hits(Pl) { const pd = Pl.pad || 0; return G.rectsOverlap(Pl.box(), { cx: this.x - dir * 40, cy: this.y, hw: 46 + pd, hh: 9 + pd }); },
      draw(ctx) {
        // a ghost of the blade's point: long, thin and see-through, its core the only bright part
        const x = this.x, y = this.y, a = Math.min(1, this.t / 0.06);
        ctx.save();
        ctx.globalAlpha *= a;
        ctx.globalCompositeOperation = 'lighter';
        D.glow(ctx, tint.boss, x - dir * 40, y, 70, 0.4);
        for (const [col, w, al] of [[tint.boss, 9, 0.5], [DANGER, 5, 0.7], [tint.hot, 1.8, 0.95]]) {
          ctx.fillStyle = G.rgba(col, al);
          D.poly(ctx, [x, y, x - dir * 34, y - w, x - dir * 150, y - w * 0.35, x - dir * 150, y + w * 0.35, x - dir * 34, y + w]); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      },
    });
  }

  // One thrust: the draw (the tell), then the point goes and the body follows it.
  function* thrustOnce(low, tele, first) {
    const b = B.body, P = G.player;
    b.fast = false; b.pose = low ? 'drawLow' : 'drawHigh';
    if (first) G.audio.play('charge', { dur: tele });
    else G.audio.play('pull');
    let e = 0, hit = null, glinted = false;
    while (e < tele) {
      const dt = yield;
      e += dt;
      // it can still turn while it settles its weight back; after that the line is set
      if (e < tele * 0.5 && (P.x - b.x) * b.face < -20) facePlayer();
      const k = e / tele;
      b.pose = building(low ? 'drawLow' : 'drawHigh', low ? 'drawLowDeep' : 'drawHighDeep', k);
      b.jit = k > 0.75 ? 0.8 : 0;
      if (Math.random() < dt * 10) G.fx.dust(b.x - b.face * 26, FLOOR, 1, { dir: -b.face, speed: [20, 90], size: [5, 8], life: [0.3, 0.5], up: 16, a: 0.28 });
      if (!glinted && e >= tele - 0.2) {
        // the point catches the light: it is coming
        glinted = true;
        const L = bladeLine(b);
        G.fx.glint(L.px, L.py, 30, G.pal().hot); G.audio.play('glint');
      }
      if (!hit && e >= tele - 0.12) {
        const L = bladeLine(b);
        // What hurts is the blade itself, guard to point, wherever the lunge carries it. (Until it
        // goes it hurts nobody, and for the tests' scripted hero, who jumps cuts flying at it, it
        // stands just short of them if they are in the lunge's reach: so it jumps as the point
        // glints, as a player would, rather than when the point is already on it.)
        const d = b.face;
        hit = H.add({
          kind: low ? 'flycut' : 'crescent', x: L.px, y: L.py, dir: d, vx: d * 900, live: false, done: false, owner: b,
          update() { const Q = bladeLine(b); const ahead = (P.x - b.x) * d; this.x = this.live ? Q.px : ahead > -20 && ahead < 430 ? P.x - d * 100 : b.x - d * 900; this.y = Q.py; this.srcX = Q.hx; if (this.done) this.dead = true; },
          hits(Pl) {
        if (!this.live) return false;
        const L = bladeLine(b), r = 13 + (Pl.pad || 0);
        for (const dy of [6, 22, 38]) if (G.distPointSeg(Pl.x, Pl.y - dy, L.hx, L.hy, L.px, L.py) < r) return true;
        return false;
          },
        });
      }
    }
    const dir = b.face;
    b.jit = 0;
    b.fast = true; b.pose = low ? 'thrustLow' : 'thrustHigh';
    G.audio.play('knightThrust');
    hit.live = true;
    const x0 = b.x, x1 = G.clamp(b.x + dir * (low ? 190 : 200), WL + 50, WR - 50), LT = 0.26;
    let s = 0, streak = false;
    while (s < LT) {
      const dt = yield;
      s += dt;
      b.x = G.lerp(x0, x1, E.outCubic(Math.min(1, s / LT)));
      if (!streak && s > 0.05) {
        // the line of the point, drawn for a moment along the air it went through
        streak = true;
        const L = bladeLine(b);
        G.fx.cut(L.px - dir * 120, L.py, dir > 0 ? 0 : Math.PI, 260, 7, G.pal().boss, G.pal().hot, 0.16);
        G.fx.kick(dir * 3, 0); G.fx.shake(5);
      }
      if (Math.random() < dt * 50) G.fx.dust(b.x - dir * 34, FLOOR, 1, { dir: -dir, speed: [40, 220], size: [6, 11], life: [0.3, 0.6], up: 30, a: 0.36 });
    }
    // the front foot comes down and takes the whole weight of it
    G.audio.play('stomp'); G.fx.shake(4);
    G.fx.thud(b.x + dir * 50, FLOOR, 0.6, { noCrack: true });
    if (b.pv) b.pv[1] += 34;
    hit.done = true;
    if (B.phase >= 2) { const L = bladeLine(b); lance(L.px, L.py, dir, low); G.audio.play('streak'); }
  }

  // The Thrust: the one blow it makes point first, and the longest reach it has on foot.
  //   Its tell is the height of the draw: at the hip, a low thrust (jump it); at the shoulder, a high
  //   one (stay on the ground, or dash through). From the second phase the point's line flies on to
  //   the wall; under the Blood Oath it pulls the blade back and thrusts again, at a height the
  //   re-draw shows.
  function* atkThrust() {
    const b = B.body, P = G.player, T = K.T();
    if (Math.abs(P.x - b.x) > 430) yield* approach(400, 300, 0.8);
    facePlayer();
    yield* thrustOnce(K.chance(0.5, 'low'), [0, 0.82, 0.74, 0.64][B.phase] * T, true);
    if (B.phase === 3) {
      yield* wait(0.1);
      facePlayer();
      yield* thrustOnce(K.chance(0.5, 'low2'), 0.48 * T, false);
    }
    // stretched out at the end of it: a moment open before it can haul the blade back
    yield* wait(B.phase === 3 ? 0.42 : 0.55);
  }

  // ------------------------------------------------------------------ from the study (v2.1a)
  // docs/boss-study.md: an answer to a hero who rides over its head (Skyward, B.antiAir), a string that
  // carries on while the hero stays in reach and ends with the blade buried (the March), something
  // thrown that hunts and splits (the Souls), and a set-piece that asks one thing (the Tolling).
  B.antiAir = 'skyward';
  G.audio.define('knightToll', () => {
    // a great cracked bell under the floor: lower and longer than the Host's
    G.audio.synth.tone({ type: 'sine', f0: 82, f1: 80, dur: 2.4, vol: 0.34, attack: 0.01 });
    G.audio.synth.tone({ type: 'triangle', f0: 207, f1: 203, dur: 1.5, vol: 0.1, attack: 0.01 });
    G.audio.synth.tone({ type: 'sine', f0: 331, f1: 327, dur: 0.9, vol: 0.05, attack: 0.01 });
    G.audio.synth.noise({ type: 'lowpass', f0: 500, f1: 120, q: 1, dur: 0.5, vol: 0.12 });
  });
  G.audio.define('graveRise', () => {
    // blades grinding up out of the stone
    G.audio.synth.noise({ type: 'bandpass', f0: 900, f1: 2600, q: 2.5, dur: 0.32, vol: 0.16, attack: 0.02 });
    G.audio.synth.tone({ type: 'sawtooth', f0: 70, f1: 140, dur: 0.26, vol: 0.06, attack: 0.02 });
  });
  G.audio.define('soulWail', () => {
    // a soul let go: a breath that falls away
    G.audio.synth.noise({ type: 'bandpass', f0: 1400, f1: 500, q: 5, dur: 0.6, vol: 0.07, attack: 0.08 });
    G.audio.synth.tone({ type: 'sine', f0: 620, f1: 410, dur: 0.55, vol: 0.05, attack: 0.1 });
  });
  G.audio.define('soulSplit', () => {
    G.audio.synth.noise({ type: 'highpass', f0: 3000, f1: 1800, q: 1, dur: 0.14, vol: 0.12 });
    G.audio.synth.tone({ type: 'triangle', f0: 900, f1: 300, dur: 0.16, vol: 0.08 });
  });
  G.audio.define('knightCreak', () => {
    // steel bound in stone, straining
    G.audio.synth.tone({ type: 'sawtooth', f0: 150, f1: 118, dur: 0.32, vol: 0.035, attack: 0.05 });
    G.audio.synth.noise({ type: 'bandpass', f0: 1800, f1: 1350, q: 9, dur: 0.3, vol: 0.05, attack: 0.05 });
  });

  // One ghostly greatsword standing point up, its hand at (x, y): the grave-blades of Skyward and the
  // Tolling. Dark steel, a lit edge, and only the edge bright.
  function graveBlade(ctx, x, y, len, w, tint, a) {
    if (a <= 0.01) return;
    // (a corrupted fight: black steel edged in blood, like the rest of it)
    const C = G.corrupt.on() ? G.corrupt.COL : null;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = C ? C.dark : '#131a22';
    D.poly(ctx, [x - w, y, x - w * 0.85, y - len * 0.82, x, y - len, x + w * 0.85, y - len * 0.82, x + w, y]); ctx.fill();
    ctx.fillStyle = C ? 'rgba(40,4,16,0.9)' : G.rgba(tint.boss, 0.55);
    D.poly(ctx, [x - w, y, x - w * 0.85, y - len * 0.82, x, y - len, x - w * 0.2, y - len * 0.8, x - w * 0.35, y]); ctx.fill();
    ctx.strokeStyle = C ? G.rgba(C.blood, 0.9) : G.rgba(tint.hot, 0.85); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w * 0.85, y - len * 0.82); ctx.lineTo(x, y - len); ctx.stroke();
    // the crossguard just out of the floor
    ctx.fillStyle = '#1c2630';
    D.poly(ctx, [x - w * 2.2, y + 4, x + w * 2.2, y + 4, x + w * 1.8, y + 10, x - w * 1.8, y + 10]); ctx.fill();
    ctx.restore();
  }

  // The rising cut's ghost: the line of the blade goes on up the column, to the top of the screen.
  function skyBlade(x) {
    const tint = tintNow(), speed = 1250;
    return H.add({
      kind: 'skycut', x, y: FLOOR - 236, tint,
      // (for the tests' scripted hero: the column over it is no place to be)
      danger() { return this.t < 0.35 ? [this.x, 60, 0] : null; },
      update(dt) {
        this.y -= speed * dt; this.srcX = this.x;
        if (Math.random() < 0.7) G.fx.spawn({ x: this.x + G.rand(-8, 8), y: this.y + G.rand(20, 160), vx: G.rand(-14, 14), vy: G.rand(20, 90), life: G.rand(0.15, 0.4), size: G.rand(2, 4), color: tint.boss });
        if (this.y < -320) this.dead = true;
      },
      hits(Pl) { const pd = Pl.pad || 0; return G.rectsOverlap(Pl.box(), { cx: this.x, cy: this.y + 80, hw: 30 + pd, hh: 80 + pd }); },
      draw(ctx) {
        const x = this.x, y = this.y, a = Math.min(1, this.t / 0.06);
        ctx.save();
        ctx.globalAlpha *= a;
        ctx.globalCompositeOperation = 'lighter';
        D.glow(ctx, tint.boss, x, y + 60, 70, 0.4);
        for (const [col, w, al] of [[tint.boss, 11, 0.5], [DANGER, 6, 0.7], [tint.hot, 2, 0.95]]) {
          ctx.fillStyle = G.rgba(col, al);
          D.poly(ctx, [x, y, x - w, y + 34, x - w * 0.35, y + 170, x + w * 0.35, y + 170, x + w, y + 34]); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      },
    });
  }

  // Grave-blades up out of the floor under the hero, to the top of the screen. A seam of ghost-light
  // opens under them and follows them (the hero cannot see what is under the floor, so it shows), then
  // holds still for lockT, then the blades come.
  function graveColumn(tele, lockT, hw) {
    const P = G.player, tint = tintNow(), lo = WL + 40, hi = WR - 40;
    const blades = [[-0.62, 0.82, 0.06], [0, 1, 0], [0.6, 0.88, 0.04]];
    return H.add({
      kind: 'gravecol', layer: 'under', x: G.clamp(P.x, lo, hi), hw, tele, active: 0.38, fired: false, tint,
      danger() { return this.t < this.tele + this.active ? [this.x, this.hw + 18, this.tele - this.t] : null; },
      update(dt) {
        if (this.t < this.tele - lockT) this.x = G.damp(this.x, G.clamp(P.x, lo, hi), 7, dt);
        this.srcX = this.x;
        if (this.t < this.tele && Math.random() < dt * 22) G.fx.spawn({ x: this.x + G.rand(-this.hw, this.hw), y: FLOOR - 2, vx: G.rand(-10, 10), vy: -G.rand(40, 120), life: G.rand(0.3, 0.6), size: G.rand(2, 4), color: tint.boss, wob: 20 });
        if (!this.fired && this.t >= this.tele) {
          this.fired = true;
          G.audio.play('graveRise'); G.audio.play('boom'); G.fx.shake(7); G.fx.kick(0, -3);
          G.fx.burst(this.x, FLOOR - 4, { n: 10, color: '22,18,32', speed: [160, 520], angle: -Math.PI / 2, spread: 1.0, life: [0.5, 1], size: [4, 9], kind: 'chunk', grav: 1400 });
          G.fx.burst(this.x, FLOOR - 40, { n: 16, color: tint.boss, speed: [200, 700], angle: -Math.PI / 2, spread: 0.5, life: [0.25, 0.6], kind: 'spark', size: [2, 4] });
          G.fx.dust(this.x, FLOOR, 4, { speed: [40, 200], size: [7, 12], up: 50, a: 0.4 });
        }
        if (this.t > this.tele + this.active + 0.4) this.dead = true;
      },
      hits(Pl) { return this.t >= this.tele && this.t < this.tele + this.active && G.rectsOverlap(Pl.box(), { cx: this.x, cy: FLOOR / 2 - 60, hw: this.hw, hh: FLOOR / 2 + 60 }); },
      draw(ctx) {
        const x = this.x;
        if (this.t < this.tele) {
          // the seam: dark first, then the ghost-light seeping up through it; it shivers once it holds
          const k = Math.min(1, this.t / (this.tele - lockT)), held = this.t >= this.tele - lockT;
          const j = held ? Math.sin(this.t * 60) * 1.5 : 0, w = this.hw * (0.4 + 0.6 * E.outCubic(k));
          ctx.fillStyle = 'rgba(4,3,8,0.55)';
          ctx.beginPath(); ctx.ellipse(x + j, FLOOR - 1, w, 6, 0, 0, G.TAU); ctx.fill();
          const g = ctx.createLinearGradient(0, FLOOR - 70, 0, FLOOR);
          g.addColorStop(0, G.rgba(DANGER, 0)); g.addColorStop(1, G.rgba(DANGER, 0.1 + 0.16 * k + (held ? 0.1 : 0)));
          ctx.fillStyle = g; ctx.fillRect(x - w, FLOOR - 70, w * 2, 70);
          ctx.strokeStyle = G.rgba(DANGER, 0.45 + 0.4 * k); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x - w + j, FLOOR - 1);
          for (let i = 1; i <= 6; i++) ctx.lineTo(x - w + (2 * w * i) / 6 + j, FLOOR - 1 - (i % 2 ? 2.5 : 0) * k);
          ctx.stroke();
          return;
        }
        // the blades: up out of the floor, point first, then a moment, then down again
        const e = this.t - this.tele, out = e < this.active ? E.outCubic(Math.min(1, e / 0.09)) : Math.max(0, 1 - (e - this.active) / 0.3);
        const col = Math.max(0, 1 - e / (this.active + 0.3));
        // a column of the dead's light, dim, to the top (where it reaches)
        const g = ctx.createLinearGradient(0, 0, 0, FLOOR);
        g.addColorStop(0, G.rgba(this.tint.boss, 0)); g.addColorStop(1, G.rgba(this.tint.boss, 0.22 * col));
        ctx.fillStyle = g; ctx.fillRect(x - this.hw * 0.8, 0, this.hw * 1.6, FLOOR);
        ctx.save();
        ctx.beginPath(); ctx.rect(x - 200, -400, 400, FLOOR + 400); ctx.clip();
        for (const [dx, s, lag] of blades) {
          const q = Math.max(0, Math.min(1, (e - lag) / 0.09));
          const up = (e < this.active ? E.outCubic(q) : out) * 330 * s;
          graveBlade(ctx, x + dx * this.hw, FLOOR + 40 - up + 40 * (1 - s), 300 * s, 9 * s, this.tint, Math.min(1, out * 1.4));
        }
        ctx.restore();
      },
    });
  }

  // Skyward: its answer to a hero who rides over its head (the kit casts B.antiAir once they have
  // stayed there long enough: on it, hopping on it, or on a ledge above).
  //   Its tell: the shoulders hunch and the visor tilts up to look at whoever is there.
  //   The sword let down low in front, its point on the floor: a rising cut up through all the air
  //   over it, and the blade's ghost flies on up the column to the top of the screen. Get off its
  //   head before it comes (out to the side, not up).
  //   The sword lifted and driven into the floor: grave-blades burst up under the hero, following
  //   them until a moment before. Keep moving; on a ledge, leave it.
  //   The Host's ghost makes the cut again; under the Blood Oath it cuts, then plants.
  function* atkSkyward() {
    const b = B.body, T = K.T();
    facePlayer();
    const plant = K.chance(0.5, 'plant');
    b.gazeT = 1;
    G.audio.play('stepHeavy'); G.fx.kick(0, 1);
    if (B.phase === 3 || !plant) yield* risingCut([0, 0.66, 0.6, 0.54][B.phase] * T);
    if (B.phase === 3 || plant) yield* gravesUnder(B.phase === 1 ? 1 : 2, B.phase === 3 ? 0.84 : 1);
    b.gazeT = 0;
  }
  function* risingCut(tele) {
    const b = B.body;
    b.fast = false; b.pose = 'skyLow';
    G.audio.play('charge', { dur: tele }); G.audio.play('bladeGrind');
    const m = (ang) => (b.face > 0 ? ang : Math.PI - ang);
    const o = { a0: -0.1, a1: -2.25, r: 236, cy: 70, pose: 'skyCut' };
    H.arc({
      x: b.x + b.face * 6, y: b.y - 70, r: o.r, a0: m(o.a0), a1: m(o.a1), tele, active: 0.14, owner: b,
      follow(h) { if (!h.fired) { h.x = b.x + b.face * 6; h.y = b.y - 70; h.a0 = m(o.a0); h.a1 = m(o.a1); } },
      onFire() {
        G.audio.play('cleave'); G.audio.play('streak'); G.fx.shake(8); G.fx.kick(0, -4);
        skyBlade(b.x + b.face * 14);
        if (B.phase >= 2) echo(b.x, b.face, o, 'skyLowDeep');
      },
    });
    let e = 0;
    while (e < tele) {
      const dt = yield;
      e += dt;
      const k = e / tele;
      b.pose = building('skyLow', 'skyLowDeep', k);
      b.jit = k > 0.75 ? 0.8 : 0;
      if (Math.random() < dt * 10) {
        const L = bladeLine(b);
        G.fx.spawn({ kind: 'spark', x: L.px, y: FLOOR - 2, vx: G.rand(-90, 90), vy: -G.rand(40, 160), life: G.rand(0.1, 0.25), size: G.rand(1.2, 2.2), color: G.pal().hot, drag: 2, grav: 900 });
      }
    }
    // up through everything over it, the whole body rising behind the blade
    b.jit = 0; b.fast = true; b.pose = 'skyCut';
    if (b.pv) b.pv[1] -= 60;
    G.fx.dust(b.x, FLOOR, 3, { speed: [40, 180], size: [6, 10], up: 30, a: 0.34 });
    yield* wait(0.3);
    // the blade's weight at the top: it lets it come back over onto the shoulder, open for a moment
    b.fast = false; b.pose = 'heft';
    b.exposed = true;
    yield* wait(0.45);
    b.exposed = false;
  }
  function* gravesUnder(n, pace) {
    const b = B.body, T = K.T();
    // it lifts the sword point down and drives it into the floor
    b.fast = false; b.pose = 'tollRaise';
    yield* wait(0.32 * T * pace);
    b.fast = true; b.pose = 'plant';
    yield* wait(0.07);
    G.audio.play('tink'); G.audio.play('stomp'); G.fx.shake(6);
    G.fx.thud(b.x + b.face * 24, FLOOR, 0.9, { col: G.pal().boss });
    b.exposed = true;
    const tele = 0.95 * T * pace, lockT = 0.3 * T;
    let last = null;
    for (let i = 0; i < n; i++) {
      last = graveColumn(tele, lockT, 50);
      yield* wait(0.62 * pace);
    }
    while (last && !last.fired) yield;
    yield* wait(0.5);
    b.exposed = false;
  }

  // ---- the March
  // A string of cuts that goes on while the hero stays in its reach, each a different swing out of
  // the last (down off the shoulder, up off the floor, across at chest height), and that ends with a
  // blow that buries the blade. Two at least; three, four or five by phase.
  //   The read is in the footwork. Another cut is coming when it drives off its back foot into a long
  //   stride. When it stops striding, sets its feet wide and hoists the sword in both hands, the
  //   finisher comes: two health, and a wave both ways under the Blood Oath.
  //   Then the blade is stuck in the floor and it strains to pull it free: the longest opening it gives.
  const MARCH = [
    { wind: 'raise', pose: 'cleave', a0: -2.5, a1: 0.78 },   // down off the shoulder
    { wind: 'low', pose: 'rise', a0: 0.78, a1: -2.5 },       // up off the floor
    { wind: 'heelHigh', pose: 'heelHighCut', a0: -0.95, a1: 0.38, r: 205 }, // across, at chest height
  ];
  function* atkMarch() {
    const b = B.body, P = G.player, T = K.T();
    yield* approach(170, 320, 0.7);
    facePlayer();
    const max = [0, 3, 4, 5][B.phase];
    let n = 0;
    for (;;) {
      const s = MARCH[n % 3], tele = (n ? [0, 0.46, 0.42, 0.38][B.phase] : [0, 0.66, 0.6, 0.56][B.phase]) * T;
      b.fast = false; b.pose = s.wind;
      const o = { a0: s.a0, a1: s.a1, r: s.r, tele, pose: s.pose };
      if (B.phase >= 2) o.wind = s.wind;
      swing(o);
      yield* wait(tele);
      yield* wait(0.1);
      n++;
      const near = Math.abs(P.x - b.x) < 340 && P.y > FLOOR - 260;
      if (!(n < 2 || (n < max && near && K.chance(0.85, 'on')))) break;
      yield* marchStep();
    }
    yield* marchFinish();
  }
  // Off the back foot into a long stride after the hero (turning with it if they went round it).
  function* marchStep() {
    const b = B.body, P = G.player;
    facePlayer();
    const d = POSES.dyn, from = b.pose === 'dyn' ? POSES.dyn.slice() : (POSES[b.pose] || POSES.idle).slice();
    for (let i = 0; i < NP; i++) d[i] = from[i];
    d[2] = 42; d[3] = -6; d[4] = -24; d[1] = from[1] + 4; d[0] = from[0] + 0.1; // (the front foot reaching out)
    b.fast = false; b.pose = 'dyn';
    const x0 = b.x, x1 = G.clamp(b.x + b.face * Math.min(90, Math.max(30, Math.abs(P.x - b.x) - 150)), WL + 50, WR - 50);
    G.fx.dust(b.x - b.face * 18, FLOOR, 2, { dir: -b.face, speed: [40, 160], size: [5, 9], up: 20, a: 0.32 });
    let e = 0;
    const D0 = 0.2;
    while (e < D0) {
      const dt = yield;
      e += dt;
      b.x = G.lerp(x0, x1, E.inOutQuad(Math.min(1, e / D0)));
    }
    G.audio.play('stepHeavy'); G.fx.kick(0, 1.4); G.fx.shake(2);
    G.fx.dust(b.x + b.face * 30, FLOOR, 2, { speed: [20, 110], size: [5, 9], up: 22, a: 0.34 });
    if (b.pv) b.pv[1] += 24;
  }
  function* marchFinish() {
    const b = B.body, T = K.T();
    facePlayer();
    // it stops: the feet go wide and set, and the sword comes up over the helm in both hands
    b.fast = false; b.pose = 'hoist';
    G.audio.play('stomp'); G.fx.shake(3);
    G.fx.dust(b.x, FLOOR, 3, { speed: [30, 140], size: [6, 10], up: 22, a: 0.34 });
    const tele = [0, 0.74, 0.68, 0.6][B.phase] * T, reach = 132;
    const m = K.columnMark(b.x + b.face * reach, 132, true); // (not drawn: watch the sword)
    G.audio.play('charge', { dur: tele });
    let e = 0, glinted = false;
    while (e < tele) {
      const dt = yield;
      e += dt;
      const k = e / tele;
      b.pose = building('hoist', 'hoistDeep', k);
      b.jit = k > 0.7 ? 0.7 : 0;
      m.x = b.x + b.face * reach; m.k = k;
      if (!glinted && e >= tele - 0.22) { glinted = true; G.fx.glint(b.x - b.face * 4, b.y - 270, 34, DANGER, 0.3); G.audio.play('glint'); }
    }
    b.jit = 0; b.fast = true; b.pose = 'bury';
    yield* wait(0.08);
    m.dead = true;
    const x = G.clamp(b.x + b.face * reach, WL + 30, WR - 30);
    K.crush(x, FLOOR - 24, 58, 28, 2);
    K.impact(x, true);
    G.fx.impact(x, FLOOR - 60, 0.06);
    if (b.pv) b.pv[1] += 40;
    if (B.phase === 3) { H.shockwave(x - 50, -1, 470, 46); H.shockwave(x + 50, 1, 470, 46); }
    // buried: open, and straining to get it back
    yield* stuckFast([0, 1.7, 1.5, 1.3][B.phase], x);
    b.pose = 'wrench';
  }

  // ---- the Souls
  // It lifts its off hand and the dead it keeps come out of it: pale souls that drift after the hero
  // and hang over their head. Cut one and it bursts away from the blade that cut it; leave it, and in
  // a few seconds it stops, draws in, and splits into shards thrown down at where the hero is. The
  // lines of the shards show for a moment before (they are things thrown).
  //   Its tell: the hand cupped low, something swelling in it: one great soul (three shards). The hand
  //   raised, fingers spread, motes spilling: many small ones (two shards each).
  //   The Host brings more; under the Blood Oath every shard that meets the floor splits again.
  G.audio.define('soulCut', () => {
    G.audio.synth.noise({ type: 'bandpass', f0: 2400, f1: 900, q: 3, dur: 0.18, vol: 0.12 });
  });
  function shard(x, y, ang, speed, tint) {
    const o = H.orb(x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, { r: 7, blade: true, life: 2.2, tint });
    // (its own kind, so the tests' scripted hero steps out of its line rather than jumping into it;
    // danger says where the line crosses the hero's height)
    o.kind = 'soulshard';
    o.danger = shardDanger;
    o.onPop = (ob) => {
      // (the Blood Oath) a shard that meets the floor splits again into two that leap and fall
      if (B.phase === 3 && !ob.fleck && ob.y + ob.r > FLOOR - 8) {
        for (const s of [-1, 1]) {
          const f = H.orb(ob.x, FLOOR - 12, s * G.rrand(170, 240), -G.rrand(380, 460), { r: 6, blade: true, grav: 1500, life: 1.4, tint });
          f.fleck = true; f.kind = 'soulshard'; f.danger = shardDanger;
        }
      }
    };
    return o;
  }
  function shardDanger(Pl) {
    const g = this.grav || 0, ty = Pl.y - 24, dy = ty - this.y;
    // when it reaches the hero's height (on its way down)
    let t;
    if (g) { const disc = this.vy * this.vy + 2 * g * dy; if (disc < 0) return null; t = (-this.vy + Math.sqrt(disc)) / g; }
    else { if (Math.abs(this.vy) < 1 || dy / this.vy < 0) return null; t = dy / this.vy; }
    if (t > 1.2) return null;
    return [this.x + this.vx * t, 30, t];
  }
  function soul(x, y, big, fuse, tint) {
    const P = G.player, b = B.body, R = big ? 19 : 10, n = big ? 3 : 2, spread = big ? 0.34 : 0.17;
    const speed = big ? 118 : 150, lead = 0.42;
    const s = H.add({
      kind: 'soul', x, y, vx: b.face * G.rrand(90, 200), vy: -G.rrand(120, 240), r: R, big, fuse, tint,
      slashable: true, aim: 0, aimed: false, cut: false, srcX: x, side: G.sign(x - P.x) || 1,
      danger(Pl) {
        // where the shards will come down, once it has drawn in
        if (this.t < this.fuse - lead) return null;
        const c = Math.cos(this.aim), sn = Math.sin(this.aim);
        if (sn <= 0.1) return null;
        const t = (Pl.y - 24 - this.y) / (sn * 540);
        return [this.x + c * 540 * t, 34 + (big ? 30 : 10), this.fuse - this.t + t];
      },
      update(dt) {
        const k = this.t;
        if (k < 0.55) { this.vx *= Math.exp(-3 * dt); this.vy *= Math.exp(-3 * dt); }
        else if (k < this.fuse - lead) {
          // it drifts after the hero and hangs a little over their head, bobbing
          const tx = P.x + this.side * 70, ty = P.y - 104 + Math.sin(this.t * 3 + R) * 8;
          const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1, v = Math.min(speed, d * 2.2);
          this.vx = G.damp(this.vx, dx / d * v, 1.8, dt); this.vy = G.damp(this.vy, dy / d * v, 1.8, dt);
        } else {
          // it stops and draws in; the aim follows the hero, then holds
          this.vx *= Math.exp(-9 * dt); this.vy *= Math.exp(-9 * dt);
          if (k < this.fuse - 0.28 || !this.aimed) { this.aim = Math.atan2(P.y - 24 - this.y, P.x - this.x); this.aimed = k >= this.fuse - 0.28; }
        }
        this.x += this.vx * dt; this.y += this.vy * dt; this.srcX = this.x;
        this.y = Math.min(this.y, FLOOR - R - 30);
        if (Math.random() < dt * 30) G.fx.spawn({ x: this.x + G.rand(-R, R) * 0.5, y: this.y + G.rand(-R, R) * 0.5, vx: -this.vx * 0.3 + G.rand(-10, 10), vy: -this.vy * 0.3 - G.rand(10, 40), life: G.rand(0.3, 0.6), size: G.rand(R * 0.25, R * 0.5), color: tint.boss, wob: 20 });
        if (k >= this.fuse) this.burst(this.aim);
      },
      burst(ang) {
        this.dead = true;
        G.audio.play('soulSplit'); G.fx.shake(big ? 4 : 2);
        G.fx.burst(this.x, this.y, { n: big ? 14 : 8, color: tint.boss, speed: [60, 260], life: [0.2, 0.5], size: [2, 4] });
        G.fx.ring(this.x, this.y, { r0: 4, r1: R * 3, life: 0.25, color: tint.boss, width: 3 });
        for (let i = 0; i < n; i++) shard(this.x, this.y, ang + (n === 1 ? 0 : G.lerp(-spread, spread, i / (n - 1))), 540, tint);
      },
      // cut: it bursts away from the blade, so the shards fly on, away from whoever cut it
      slash() { this.cut = true; G.audio.play('soulCut'); this.burst(Math.atan2(-0.25, G.sign(this.x - P.x) || 1)); },
      hits(Pl) { return G.circleRect(this.x, this.y, R * 0.7, Pl.box()); },
      draw(ctx) {
        const x = this.x, y = this.y, a = Math.min(1, this.t / 0.2);
        const lateK = Math.max(0, (this.t - (this.fuse - lead)) / lead);
        const j = lateK > 0 ? Math.sin(this.t * 70) * 1.2 * lateK : 0;
        const r = R * (1 - 0.22 * lateK) * (1 + 0.06 * Math.sin(this.t * 6));
        ctx.save();
        ctx.globalAlpha *= a;
        // the lines the shards will take (things thrown: they may be shown)
        if (lateK > 0) {
          const al = this.aimed ? 0.55 + 0.35 * Math.sin(this.t * 50) : 0.3 * lateK;
          ctx.strokeStyle = G.rgba(DANGER, al); ctx.lineWidth = 1.5; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -this.t * 120;
          for (let i = 0; i < n; i++) {
            const an = this.aim + (n === 1 ? 0 : G.lerp(-spread, spread, i / (n - 1)));
            ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r, y + Math.sin(an) * r); ctx.lineTo(x + Math.cos(an) * 380, y + Math.sin(an) * 380); ctx.stroke();
          }
          ctx.setLineDash([]);
        }
        // a pale wisp with its tail streaming behind it, and a face that is mostly holes
        const sp = Math.hypot(this.vx, this.vy), ta = sp > 5 ? Math.atan2(-this.vy, -this.vx) : Math.PI / 2;
        ctx.globalCompositeOperation = 'lighter';
        D.glow(ctx, tint.boss, x, y, r * 3, 0.45);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = G.rgba(tint.boss, 0.55);
        const tl = r * (1.6 + Math.min(1.4, sp / 90));
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ta + 1.4) * r * 0.8 + j, y + Math.sin(ta + 1.4) * r * 0.8);
        ctx.quadraticCurveTo(x + Math.cos(ta) * tl * 0.6 + Math.sin(this.t * 9) * 4, y + Math.sin(ta) * tl * 0.6 + Math.cos(this.t * 9) * 4, x + Math.cos(ta) * tl, y + Math.sin(ta) * tl);
        ctx.quadraticCurveTo(x + Math.cos(ta) * tl * 0.5, y + Math.sin(ta) * tl * 0.5, x + Math.cos(ta - 1.4) * r * 0.8 + j, y + Math.sin(ta - 1.4) * r * 0.8);
        ctx.closePath(); ctx.fill();
        // the head: a skull-shaped flame, narrow at the jaw, its crown guttering upward
        const cx = x + j, fl = Math.sin(this.t * 11 + R) * 0.12;
        ctx.fillStyle = G.rgba(tint.boss, 0.85);
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.95, y - r * 0.05);
        ctx.quadraticCurveTo(cx - r * 0.9, y - r * 0.95, cx - r * 0.3, y - r * (1.25 + fl));
        ctx.lineTo(cx - r * 0.05, y - r * 0.85);
        ctx.lineTo(cx + r * 0.25, y - r * (1.45 - fl));
        ctx.quadraticCurveTo(cx + r * 0.95, y - r * 0.85, cx + r * 0.95, y - r * 0.05);
        ctx.quadraticCurveTo(cx + r * 0.8, y + r * 0.7, cx, y + r * 0.95);
        ctx.quadraticCurveTo(cx - r * 0.8, y + r * 0.7, cx - r * 0.95, y - r * 0.05);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = G.rgba(tint.hot, 0.85);
        ctx.beginPath(); ctx.ellipse(cx, y - r * 0.1, r * 0.62, r * 0.55, 0, 0, G.TAU); ctx.fill();
        // hollow eyes slanting down to the brow, narrowing as it draws in; no mouth, only a split jaw
        ctx.fillStyle = '#05070a';
        const ew = 1 - 0.35 * lateK;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * r * 0.08, y - r * 0.02);
          ctx.lineTo(cx + s * r * 0.62, y - r * (0.38 * ew));
          ctx.lineTo(cx + s * r * 0.58, y + r * 0.08 * ew);
          ctx.lineTo(cx + s * r * 0.16, y + r * 0.16 * ew);
          ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = '#05070a'; ctx.lineWidth = Math.max(1, r * 0.09);
        ctx.beginPath(); ctx.moveTo(cx, y + r * 0.4); ctx.lineTo(cx - r * 0.06, y + r * (0.62 + 0.2 * lateK)); ctx.stroke();
        ctx.restore();
      },
    });
    return s;
  }
  function* atkSouls() {
    const b = B.body, P = G.player, T = K.T();
    facePlayer();
    const many = K.chance(0.5, 'many'), tint = tintNow();
    const tele = [0, 0.78, 0.7, 0.62][B.phase] * T;
    const from = many ? 'spread' : 'cupLow', to = many ? 'spreadDeep' : 'cupLowDeep';
    b.fast = false; b.pose = from;
    G.audio.play('charge', { dur: tele });
    // the hand: what gathers in it says how many
    const hand = () => ({ x: b.x + b.face * b.p[9], y: b.y + b.p[10] });
    let e = 0;
    while (e < tele) {
      const dt = yield;
      e += dt;
      const k = e / tele;
      b.pose = building(from, to, k);
      const h = hand();
      if (many) {
        if (Math.random() < dt * 26) G.fx.spawn({ x: h.x + G.rand(-12, 12), y: h.y + G.rand(-6, 6), vx: G.rand(-20, 20), vy: G.rand(10, 60), life: G.rand(0.3, 0.6), size: G.rand(2, 3.5), color: tint.boss, wob: 20 });
      } else if (Math.random() < dt * 30) {
        // drawn in to the cupped hand from round it
        const a = G.rand(0, G.TAU), d = G.rand(30, 60);
        G.fx.spawn({ x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d, vx: -Math.cos(a) * d * 2.4, vy: -Math.sin(a) * d * 2.4, life: 0.4, size: G.rand(2, 4) * (0.5 + k), color: tint.boss });
      }
    }
    // the hand thrust out, and they go
    b.fast = true; b.pose = 'release';
    G.audio.play('soulWail'); G.fx.kick(b.face * 2, 0);
    if (b.pv) b.pv[0] += 0.4;
    const h = hand(), out = [];
    const count = many ? [0, 3, 4, 5][B.phase] : [0, 1, 2, 2][B.phase];
    for (let i = 0; i < count; i++) {
      const fuse = many ? 2.3 + i * 0.42 : 3.0 + i * 0.9;
      out.push(soul(h.x + G.rrand(-8, 8), h.y + G.rrand(-6, 6), !many, fuse, tint));
      if (!many && i < count - 1) yield* wait(0.25);
    }
    yield* wait(0.3);
    // it watches them go, the hand still out, following them; then lets it fall
    b.fast = false;
    e = 0;
    const until = Math.max(...out.map((s) => s.fuse)) - 0.6;
    while (e < until && out.some((s) => !s.dead)) {
      const dt = yield;
      e += dt;
      facePlayer();
    }
    b.pose = 'idle';
    yield* wait(0.35);
  }

  // ---- the Tolling
  // It lifts the greatsword point down in both hands and drives it into the floor, and a bell tolls
  // under the ground. Grave-blades burst up across the arena in rows, rippling in from both walls,
  // with one gap in each row: the only place to stand. The next row's gap is somewhere else. The
  // seams in the floor show where each row will come, and where it will not.
  // Then it pulls the sword free, and for a moment it is open.
  function graveRow(x0, x1, fromL, tele, tint) {
    const xs = [], span = Math.max(1, x1 - x0), RIP = 0.16, active = 0.34;
    // (a short stretch, between a gap and a wall, still gets its blade: it used to cut with none drawn)
    for (let x = x0 + Math.min(14, span / 2); x < x1 - 6 || !xs.length; x += 30) xs.push({ x, len: G.rand(260, 320), w: G.rand(7, 10), lean: G.rand(-0.05, 0.05) });
    const off = (x) => (fromL ? (x - x0) / span : (x1 - x) / span) * RIP;
    return H.add({
      kind: 'graverow', layer: 'over', x: (x0 + x1) / 2, x0, x1, tele, active, tint, played: false,
      danger() { return this.t < this.tele + RIP + this.active ? [(x0 + x1) / 2, (x1 - x0) / 2 + 16, this.tele - this.t] : null; },
      update() {
        this.srcX = G.clamp(G.player.x, x0, x1);
        if (!this.played && this.t >= this.tele) { this.played = true; G.audio.play('graveRise'); G.fx.shake(5); }
        if (this.t >= this.tele && this.t < this.tele + RIP + 0.02 && Math.random() < 0.6) {
          const x = fromL ? x0 + span * (this.t - this.tele) / RIP : x1 - span * (this.t - this.tele) / RIP;
          G.fx.burst(G.clamp(x, x0, x1), FLOOR - 4, { n: 2, color: '22,18,32', speed: [120, 380], angle: -Math.PI / 2, spread: 1.0, life: [0.4, 0.8], size: [3, 7], kind: 'chunk', grav: 1400 });
        }
        if (this.t > this.tele + RIP + this.active + 0.35) this.dead = true;
      },
      // each blade cuts while it stands, as high as it has risen (v2.1b; the row used to cut on its
      // ripple, ahead of the blades on a short row, and 300 px high from the first frame)
      hits(Pl) {
        if (this.t < this.tele) return false;
        for (const bl of xs) {
          if (Math.abs(Pl.x - bl.x) > 17) continue;
          const e = this.t - this.tele - off(bl.x);
          if (e < 0 || e >= this.active) continue;
          const up = E.outCubic(Math.min(1, e / 0.08)), tip = (bl.len + 30) * up - 30; // (as graveBlade is drawn below)
          if (tip > 4 && Pl.y > FLOOR - tip) return true;
        }
        return false;
      },
      draw(ctx) {
        if (this.t < this.tele) {
          // the seam runs in from the wall, then pulses
          const k = Math.min(1, this.t / (this.tele * 0.55)), late = this.t > this.tele * 0.7 ? 0.5 + 0.5 * Math.sin(this.t * 50) : 0;
          const a = fromL ? x0 : x1, z = fromL ? x0 + span * E.outCubic(k) : x1 - span * E.outCubic(k);
          const l = Math.min(a, z), r = Math.max(a, z);
          const g = ctx.createLinearGradient(0, FLOOR - 46, 0, FLOOR);
          g.addColorStop(0, G.rgba(DANGER, 0)); g.addColorStop(1, G.rgba(DANGER, 0.1 + 0.1 * k + 0.1 * late));
          ctx.fillStyle = g; ctx.fillRect(l, FLOOR - 46, r - l, 46);
          ctx.strokeStyle = G.rgba(DANGER, 0.4 + 0.35 * k + 0.2 * late); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(l, FLOOR - 1);
          for (let x = l; x <= r; x += 15) ctx.lineTo(x, FLOOR - 1 - ((x / 15) % 2 < 1 ? 2 : 0));
          ctx.stroke();
          return;
        }
        ctx.save();
        ctx.beginPath(); ctx.rect(x0 - 30, -400, span + 60, FLOOR + 400); ctx.clip();
        for (const bl of xs) {
          const e = this.t - this.tele - off(bl.x);
          if (e < 0) continue;
          const up = e < this.active ? E.outCubic(Math.min(1, e / 0.08)) : Math.max(0, 1 - (e - this.active) / 0.3);
          if (up <= 0) continue;
          ctx.save(); ctx.translate(bl.x, FLOOR); ctx.rotate(bl.lean);
          graveBlade(ctx, 0, 30 - (bl.len + 30) * up + bl.len, bl.len, bl.w, tint, Math.min(1, up * 1.5));
          ctx.restore();
        }
        ctx.restore();
      },
    });
  }
  function* atkTolling() {
    const b = B.body, P = G.player, T = K.T(), tint = tintNow();
    facePlayer();
    b.fast = false; b.pose = 'tollRaise';
    G.audio.play('charge', { dur: 0.5 * T });
    let e = 0;
    while (e < 0.5 * T) {
      const dt = yield;
      e += dt;
      b.pose = building('tollRaise', 'tollRaiseDeep', e / (0.5 * T));
    }
    b.fast = true; b.pose = 'plant';
    yield* wait(0.08);
    G.audio.play('knightToll'); G.audio.play('tink');
    K.impact(b.x + b.face * 24, false);
    if (b.pv) b.pv[1] += 36;
    const lo = WL + 26, hi = WR - 26;
    const rows = [0, 3, 4, 5][B.phase], gapW = [0, 176, 160, 144][B.phase];
    // the next row's seams show while the last is still up; once it goes down there is a fixed moment
    // to cross to the new gap (not scaled by difficulty: it is the time it takes to get there)
    const win = [0, 0.78, 0.68, 0.6][B.phase], tele = [0, 0.95, 0.88, 0.8][B.phase] * T;
    const step = 0.16 + 0.34 + win, far = [0, 230, 240, 250][B.phase];
    // the first gap within reach; each after it a long step away from the last
    let gap = G.clamp(P.x + G.rrand(-200, 200), lo + gapW / 2, hi - gapW / 2), last = null;
    for (let i = 0; i < rows; i++) {
      if (i) {
        let g = gap, tries = 0;
        do {
          g = gap + (G.rng() < 0.5 ? -1 : 1) * G.rrand(160, far);
          tries++;
        } while ((g < lo + gapW / 2 || g > hi - gapW / 2) && tries < 20);
        gap = G.clamp(g, lo + gapW / 2, hi - gapW / 2);
      }
      const gl = gap - gapW / 2, gr = gap + gapW / 2;
      if (gl - lo > 20) last = graveRow(lo, gl, true, tele, tint);
      if (hi - gr > 20) last = graveRow(gr, hi, false, tele, tint);
      if (i) G.audio.play('bell');
      yield* wait(step);
    }
    while (last && !last.dead && last.t < last.tele + 0.6) yield;
    // it hauls the sword out of the floor: open while it does
    b.pose = 'wrench';
    yield* stuckFast(0.9, b.x + b.face * 30);
  }

  // ------------------------------------------------------------------ corrupted
  // Two attacks only its corrupted self uses (corrupt.js, B.corruptBags), in the void's own colours.

  // Requiem. The Knight swings in silence: four to six fast cuts through empty air, around the arena
  // and at different heights, and every one leaves a thin tear hanging where the blade went. Nothing
  // hurts yet. Then it ends the requiem and the tears open as real cuts. The answer is to remember
  // where they hang and be out of them when they open.
  //   Its tell: the music falls away and its blade goes black from the guard to the point.
  //   How it ends says how they open: the sword driven into the ground opens them all at once; the
  //   sword lifted back onto its shoulder opens them one by one, the last made first.
  // Where a tear hangs, by the cut that made it (from the Knight's side to the far end, x along its
  // facing, y up from the floor).
  const TEARS = {
    sweep: { seg: [-150, -60, 150, -14], at: 165, wind: 'raise', to: 'low' },   // low along the ground
    fall: { seg: [-140, -246, 140, -10], at: 150, wind: 'raise', to: 'cleave' }, // high behind to the floor in front
    rise: { seg: [-34, -4, 54, -272], at: 72, wind: 'low', to: 'rise' },         // up off the floor, nearly upright
    high: { seg: [-170, -164, 170, -138], at: 180, wind: 'raise', to: 'whirl', hop: 92 }, // level, at the height of a jump
  };
  const TEAR_W = 10; // half the width of a cut once it opens
  // how far along its facing a cut crosses the floor (0 for the ones that never reach it)
  const FLOOR_OFF = {};
  function floorOff(type) {
    if (type === 'air' || type === 'high') return 0;
    if (FLOOR_OFF[type] == null) { const s = tearSpan(tearSeg(type, 0, 1), FLOOR, 0); FLOOR_OFF[type] = s ? (s[0] + s[1]) / 2 : 0; }
    return FLOOR_OFF[type];
  }
  function tearSeg(type, cx, f, airY) {
    if (type === 'air') return [cx - f * 170, airY + 12, cx + f * 170, airY - 12]; // cut at the hero's height
    const s = TEARS[type].seg;
    return [cx + f * s[0], FLOOR + s[1], cx + f * s[2], FLOOR + s[3]];
  }
  // The stretch of x where a hero whose feet are at py would be inside a tear (pad widens it).
  function tearSpan(seg, py, pad) {
    const [ax, ay, bx, by] = seg, r = TEAR_W + pad;
    let lo = 1e9, hi = -1e9;
    for (let x = Math.min(ax, bx) - r; x <= Math.max(ax, bx) + r; x += 4) {
      for (const dy of [6, 22, 38]) if (G.distPointSeg(x, py - dy, ax, ay, bx, by) < r) { lo = Math.min(lo, x); hi = Math.max(hi, x); break; }
    }
    return lo <= hi ? [lo, hi] : null;
  }
  // Fairness: is there still floor that no tear crosses, wide enough to stand in and near enough to
  // reach before they open? (Never a layout that leaves only the sky.)
  function floorLeft(segs, from, reach) {
    const lo = WL + 22, hi = WR - 22, spans = segs.map((s) => tearSpan(s, FLOOR, 14)).filter(Boolean);
    let run = 0;
    for (let x = lo; x <= hi; x += 6) {
      if (spans.some((s) => x >= s[0] && x <= s[1])) { run = 0; continue; }
      run += 6;
      if (run >= 48 && Math.abs(x - 24 - from) <= reach) return true;
    }
    return false;
  }

  function tear(seg) {
    const C = G.corrupt.COL, [ax, ay, bx, by] = seg, len = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    // torn, not ruled: a ragged line that stays the same for as long as it hangs
    const rag = []; for (let i = 0; i <= 14; i++) rag.push(i && i < 14 ? G.rand(-3.5, 3.5) : 0);
    const OPEN = 0.13, FADE = 0.42, FLARE = 0.38;
    return H.add({
      kind: 'requiem', x: (ax + bx) / 2, y: (ay + by) / 2, seg, openAt: null, est: 2, opened: false, oT: 0,
      update(dt) {
        this.srcX = this.x;
        if (!this.opened && this.openAt != null && this.t >= this.openAt) {
          this.opened = true;
          G.fx.cut(this.x, this.y, ang, len, 15, C.blood, C.hot, 0.32);
          for (let i = 0; i < 12; i++) {
            const q = G.rand(0, 1), v = G.rand(160, 520) * (Math.random() < 0.5 ? 1 : -1);
            G.fx.spawn({ kind: 'spark', x: G.lerp(ax, bx, q), y: G.lerp(ay, by, q), vx: nx * v + Math.cos(ang) * G.rand(-80, 80), vy: ny * v, life: G.rand(0.14, 0.32), size: G.rand(1.5, 2.8), color: C.hot, drag: 2, grav: 500 });
          }
          G.fx.shards(this.x, this.y, 4, C.blood, { speed: [80, 300], size: [2, 4] });
          if (Math.max(ay, by) > FLOOR - 16) G.fx.dust(ay > by ? ax : bx, FLOOR, 3, { speed: [30, 160], size: [6, 10], up: 40, a: 0.34 });
        }
        if (this.opened) { this.oT += dt; if (this.oT > OPEN + FADE) this.dead = true; }
        else if (Math.random() < dt * 7) { const q = G.rand(0.1, 0.9); G.fx.spawn({ x: G.lerp(ax, bx, q), y: G.lerp(ay, by, q), vx: G.rand(-8, 8), vy: G.rand(10, 40), life: G.rand(0.4, 0.8), size: G.rand(1.5, 3), color: C.blood, kind: 'glow' }); }
        if (this.t > 16) this.dead = true;
      },
      hits(P) {
        if (!this.opened || this.oT > OPEN) return false;
        const r = TEAR_W + 5 + (P.pad || 0);
        for (const dy of [6, 22, 38]) if (G.distPointSeg(P.x, P.y - dy, ax, ay, bx, by) < r) return true;
        return false;
      },
      danger(P) {
        if (this.opened && this.oT > OPEN) return null;
        const s = tearSpan(seg, P.y, 12);
        if (!s) return null;
        return [(s[0] + s[1]) / 2, (s[1] - s[0]) / 2, this.openAt == null ? Math.max(0.4, this.est - this.t) : Math.max(0, this.openAt - this.t)];
      },
      draw(ctx) {
        const drawn = Math.min(1, this.t / 0.09); // it is torn along the blade's path, not all at once
        const pts = (w) => {
          // the lens of the tear: w wide in the middle, closed at both ends
          const up = [], dn = [];
          for (let i = 0; i <= 14; i++) {
            const q = i / 14 * drawn, hw = w * Math.pow(Math.sin(Math.PI * i / 14), 0.7);
            const x = G.lerp(ax, bx, q) + nx * rag[i], y = G.lerp(ay, by, q) + ny * rag[i];
            up.push([x + nx * hw, y + ny * hw]); dn.push([x - nx * hw, y - ny * hw]);
          }
          ctx.beginPath(); ctx.moveTo(up[0][0], up[0][1]);
          for (const p of up) ctx.lineTo(p[0], p[1]);
          for (let i = dn.length - 1; i >= 0; i--) ctx.lineTo(dn[i][0], dn[i][1]);
          ctx.closePath();
        };
        if (!this.opened) {
          // hanging: a thread of blood round a sliver of void, swelling as it is about to open
          const left = this.openAt == null ? 9 : this.openAt - this.t, k = G.clamp(1 - left / FLARE, 0, 1);
          const born = Math.min(1, this.t / 0.2), settle = 0.72 + 0.28 * Math.max(0, 1 - (this.t - 0.2) / 0.5);
          const a = born * Math.max(settle, k) * (0.9 + 0.1 * Math.sin(this.t * 13 + ax));
          ctx.save();
          ctx.globalAlpha *= a;
          // a shadow of void round it first, so it reads against a sky as red as itself
          ctx.fillStyle = 'rgba(5,0,3,0.5)';
          pts(8 + 4 * k); ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
          D.glow(ctx, C.blood, this.x, this.y, len * 0.32, 0.12 + 0.2 * k);
          ctx.fillStyle = G.rgba(C.blood, 0.75 + 0.25 * k);
          pts(3.2 + 4 * k); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = C.dark;
          pts(1.4 + 2.6 * k); ctx.fill();
          if (k > 0) { ctx.strokeStyle = G.rgba(C.hot, k * (0.5 + 0.5 * Math.sin(this.t * 60))); ctx.lineWidth = 1; pts(3.2 + 4 * k); ctx.stroke(); }
          ctx.restore();
        } else {
          // open: the cut itself, a band of blood round a black core that snaps wide and closes
          const e = this.oT, w = e < OPEN ? G.lerp(10, 15, e / OPEN) : 15 * Math.max(0, 1 - (e - OPEN) / FADE);
          const f = e < OPEN ? 1 : Math.max(0, 1 - (e - OPEN) / FADE);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = G.rgba(C.blood, 0.8 * f); pts(w + 4); ctx.fill();
          ctx.fillStyle = G.rgba(C.hot, 0.5 * f); pts(w * 0.25); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = G.rgba('5,0,3', 0.9 * f); pts(w * 0.55); ctx.fill();
          ctx.restore();
        }
      },
    });
  }

  // Between the silent cuts the Knight gets where it is going on its own two feet: a few long
  // strides if it is near, otherwise it springs there, low and heavy, and lands into the next wind-up.
  function* stride(x, face, wind) {
    const b = B.body, x0 = b.x, d = Math.abs(x - x0);
    b.smooth = 1;
    if (d < 12) { b.face = face; return; }
    if (d < 170) {
      b.fast = false; b.pose = 'walk';
      while (Math.abs(x - b.x) > 3) {
        const dt = yield, s = G.sign(x - b.x);
        b.face = s; b.walkT += dt * 12; // (its legs keep up with it)
        b.x += s * Math.min(Math.abs(x - b.x), 470 * dt);
      }
      b.face = face; b.pose = wind;
      return;
    }
    b.fast = false; b.pose = 'chargeUp'; // it sinks before it springs
    yield* wait(0.1);
    b.fast = true; b.pose = 'air';
    G.fx.dust(b.x, FLOOR, 4, { dir: -G.sign(x - x0), speed: [40, 200], size: [6, 11], up: 30, a: 0.36 });
    const dur = G.clamp(0.22 + d / 2600, 0.26, 0.5), h = 46 + d * 0.09;
    let e = 0;
    b.face = G.sign(x - x0);
    while (e < dur) {
      const dt = yield;
      e += dt;
      const q = Math.min(1, e / dur);
      b.x = G.lerp(x0, x, E.inOutQuad(q)); b.y = FLOOR - h * 4 * q * (1 - q);
      if (q > 0.55) { b.face = face; b.fast = false; b.pose = wind; } // it turns and winds up as it comes down
      if (Math.random() < dt * 40) G.fx.spawn({ x: b.x + G.rand(-20, 20), y: b.y - G.rand(20, 110), vx: G.rand(-20, 20), vy: G.rand(-30, 10), life: G.rand(0.3, 0.6), size: G.rand(4, 9), color: G.corrupt.COL.void, wob: 30 });
    }
    b.y = FLOOR;
    if (b.pv) b.pv[1] += 40; // the landing goes down through its knees
    G.fx.dust(b.x, FLOOR, 5, { speed: [30, 170], size: [6, 12], up: 34, a: 0.4 });
    G.fx.kick(0, 1.2);
  }

  function* atkRequiem() {
    const b = B.body, P = G.player, T = K.T();
    const n = 3 + B.phase, all = !K.chance(0.4, 'reverse'), openIn = 0.62 * T, per = 0.62;
    facePlayer(); b.smooth = 1;
    // the tell: the sound drains out of the fight, and the black creeps up the blade
    b.fast = false; b.pose = 'heft';
    b.hush = true; G.audio.duck(0.06);
    b.voidOn = true;
    yield* tween(b, { voidK: 1 }, 0.62 * T, E.inOutQuad);
    yield* wait(0.12); // held: it is ready
    const tears = [], segs = [], made = [];
    let lastX = -1e9;
    for (let i = 0; i < n; i++) {
      // every other cut, and the last, is made where the hero is now; the rest anywhere else
      const chase = i % 2 === 0 || i === n - 1;
      const left = (n - 1 - i) * per + openIn + 0.15; // about how long until this one opens
      let type = 'high', cx = P.x, f = b.face, seg = null, airY = 0;
      for (let tries = 0; tries < 16 && !seg; tries++) {
        if (chase) {
          const air = P.y < FLOOR - 60;
          type = air ? 'air' : ['sweep', 'fall', 'rise'][Math.floor(G.rng() * 3)];
          cx = P.x + P.vx * 0.12 + G.rrand(-18, 18); airY = P.y - 22;
        } else {
          type = ['high', 'fall', 'rise', 'sweep'][Math.floor(G.rng() * 4)];
          cx = G.rrand(WL + 110, WR - 110);
          if (Math.abs(cx - lastX) < 200 || Math.abs(cx - b.x) > 560) continue; // somewhere new, and not across the whole arena
        }
        // it takes the cut from the side it is on, unless that puts it in the wall; and the cut is
        // placed so that where it crosses the floor is where it was aimed (the hero, for a chasing one)
        const at = type === 'air' ? 180 : TEARS[type].at, aim = cx;
        if (made.some((m) => m.type === type && Math.abs(m.x - aim) < 90)) continue; // not the same cut twice in one place
        f = G.sign(aim - b.x) || b.face;
        cx = aim - f * floorOff(type);
        if (cx - f * at < WL + 50 || cx - f * at > WR - 50) { f = -f; cx = aim - f * floorOff(type); }
        const s = tearSeg(type, cx, f, airY);
        if (floorLeft(segs.concat([s]), P.x, 320 * left + 40)) seg = s;
      }
      if (!seg) { type = 'high'; f = G.sign(cx - b.x) || b.face; if (cx - f * 180 < WL + 50 || cx - f * 180 > WR - 50) f = -f; seg = tearSeg('high', cx, f); } // (no floor to cross, so always fair)
      const spec = type === 'air' ? { at: 180, wind: 'raise', to: 'whirl', hop: G.clamp(FLOOR - airY - 66, 40, 230) } : TEARS[type];
      yield* stride(G.clamp(cx - f * spec.at, WL + 50, WR - 50), f, spec.wind);
      // a short wind-up with the blade held at the top, then the cut: fast, and without a sound
      b.fast = false; b.pose = spec.wind;
      if (spec.hop) {
        // the level cuts are made in the air: it jumps, and cuts at the top of the jump
        yield* tween(b, { y: FLOOR - spec.hop }, 0.2, E.outQuad);
      } else yield* wait(0.15);
      b.fast = true; b.pose = spec.to;
      const t = tear(seg);
      t.est = left; tears.push(t); segs.push(seg); lastX = cx + f * floorOff(type); made.push({ type, x: lastX });
      G.fx.kick(f * 1.2, 0.6);
      yield* wait(0.1); // follow-through
      if (spec.hop) { b.fast = false; yield* tween(b, { y: FLOOR }, 0.18, E.inQuad); if (b.pv) b.pv[1] += 36; G.fx.dust(b.x, FLOOR, 3, { speed: [20, 120], size: [5, 10], up: 26, a: 0.34 }); }
      else yield* wait(0.06);
    }
    b.smooth = 1; facePlayer();
    if (all) {
      // the sword goes into the ground: everything opens at once
      b.fast = false; b.pose = 'raise';
      yield* wait(0.16);
      b.fast = true; b.pose = 'plant';
      yield* wait(0.08);
      G.fx.thud(b.x + b.face * 24, FLOOR, 0.6, { noCrack: true });
      for (const t of tears) t.openAt = t.t + openIn;
      yield* wait(openIn);
      unhush();
      G.audio.play('cleave'); G.audio.play('boom'); G.audio.play('slam');
      G.fx.shake(14); G.fx.impact(b.x, b.y - 70, 0.07); G.fx.ripple(b.x, b.y - 70, 520, 0.5, 1.2);
      b.voidOn = false;
      yield* wait(0.55);
    } else {
      // the sword goes back onto its shoulder: they open in the order they were not made
      b.fast = false; b.pose = 'heft';
      yield* wait(0.14);
      b.pose = 'idle';
      const gap = 0.2;
      tears.forEach((t, i) => { t.openAt = t.t + openIn + (tears.length - 1 - i) * gap; });
      yield* wait(openIn);
      unhush();
      for (let i = 0; i < tears.length; i++) {
        G.audio.play(i % 2 ? 'blade' : 'cleave'); G.fx.shake(6);
        if (i === tears.length - 1) { G.audio.play('boom'); G.fx.shake(10); b.voidOn = false; }
        yield* wait(gap);
      }
      yield* wait(0.35);
    }
    b.voidOn = false;
  }

  // Colossus. It kneels and raises its sword point to the sky, and a giant sword of the void gathers
  // above the arena, following the hero. It stops, it falls point first into the floor, and then it
  // leans and topples sideways like a felled tree, the way it leans. Dodge the plunge, then get to the
  // side it is not falling to (or dash through it as it lands).
  // (152 and 41: the Knight's own blade and grip, SWORD in the drawing below)
  const COL_S = 2.8, COL_L = 152 * COL_S, COL_GRIP = 41 * COL_S, COL_SINK = 34, COL_HW = 9.5 * COL_S;
  function* atkColossus() {
    const b = B.body, P = G.player, T = K.T(), C = G.corrupt.COL;
    const gather = 1.05 * T, lock = 0.5 * T;
    facePlayer(); b.smooth = 1;
    // the tell: down on one knee, the sword raised in both hands, point up
    b.fast = false; b.pose = 'vigil';
    G.audio.play('bell'); G.audio.play('charge', { dur: gather + lock });
    const lo = WL + 110, hi = WR - 110, reach = COL_L - COL_SINK + COL_GRIP;
    const cs = H.add({
      kind: 'colossus', layer: 'under', state: 'gather', x: G.clamp(P.x, lo, hi), tip: -120, k: 0, lean: 0, w: 0, dir: 1, a: 0, dropAt: 0, landT: 0,
      update(dt) {
        const st = this.state;
        this.srcX = this.x;
        if (st === 'gather' || st === 'lock') {
          this.a = Math.min(1, this.a + dt * 2.2);
          // the void is drawn up into it from the floor
          if (Math.random() < dt * 40) G.fx.spawn({ x: this.x + G.rand(-120, 120), y: FLOOR - G.rand(0, 60), vx: G.rand(-10, 10), vy: -G.rand(140, 320), life: G.rand(0.5, 1), size: G.rand(4, 9), color: C.void, wob: 40 });
        } else if (st === 'drop') {
          const q = Math.min(1, (this.t - this.dropAt) / 0.13);
          this.tip = G.lerp(this.tip0, FLOOR + COL_SINK, q * q);
          if (q >= 1) {
            this.state = 'stand';
            K.impact(this.x, true, C.blood);
            G.fx.ripple(this.x, FLOOR - 40, 380, 0.4, 1.1);
            G.fx.crack(this.x, 2, C.blood);
            G.fx.burst(this.x, FLOOR - 6, { n: 16, color: C.void, speed: [100, 420], angle: -Math.PI / 2, spread: 2.4, life: [0.5, 1], size: [5, 10], grav: 300 });
            G.audio.play('boom');
          }
        } else if (st === 'lean') {
          // the base tears up on the far side as it starts to go
          if (Math.random() < dt * 24) G.fx.burst(this.x - this.dir * 24, FLOOR - 4, { n: 1, color: '24,22,30', speed: [80, 260], angle: -Math.PI / 2 - this.dir * 0.4, spread: 1, life: [0.4, 0.8], size: [3, 7], kind: 'chunk', grav: 1400 });
        } else if (st === 'fall') {
          // a felled tree: slow at first, then all at once
          this.w += 21 * Math.sin(this.lean) * dt;
          this.lean += this.w * dt;
          const hx = this.x + this.dir * Math.sin(this.lean) * reach, hy = FLOOR - Math.cos(this.lean) * reach;
          if (Math.random() < dt * 50) G.fx.spawn({ x: G.lerp(this.x, hx, G.rand(0.3, 1)), y: G.lerp(FLOOR, hy, G.rand(0.3, 1)), vx: G.rand(-30, 30), vy: G.rand(-30, 30), life: G.rand(0.3, 0.7), size: G.rand(4, 10), color: C.void, wob: 40 });
          if (this.lean >= 1.5) {
            this.lean = 1.5; this.state = 'down'; this.landT = this.t;
            G.audio.play('slam'); G.audio.play('boom');
            G.fx.shake(18); G.fx.punch(0.025);
            G.fx.impact(this.x + this.dir * reach * 0.5, FLOOR - 30, 0.07);
            for (let d = 60; d < reach; d += 80) {
              const x = this.x + this.dir * d;
              if (x < G.WALL_L + 10 || x > G.WALL_R - 10) continue;
              G.fx.thud(x, FLOOR, 0.9, { col: C.blood, noCrack: d % 160 !== 140 });
              G.fx.burst(x, FLOOR - 10, { n: 4, color: C.blood, speed: [120, 420], angle: -Math.PI / 2, spread: 2, life: [0.2, 0.5], kind: 'spark', size: [1.6, 3], grav: 900 });
            }
          }
        } else if (st === 'down') {
          // it does not stay: the void it was made of comes apart
          const q = (this.t - this.landT) / 0.6;
          this.a = Math.max(0, 1 - Math.max(0, q - 0.15) / 0.85);
          if (Math.random() < dt * 60 * this.a) { const d = G.rand(0, reach); G.fx.spawn({ x: this.x + this.dir * d, y: FLOOR - G.rand(10, 50), vx: G.rand(-20, 20), vy: -G.rand(40, 140), life: G.rand(0.4, 0.9), size: G.rand(4, 10), color: C.void, wob: 40 }); }
          if (q >= 1) this.dead = true;
        }
        if (this.t > 12) this.dead = true;
      },
      seg() {
        // from the floor where it stands, along the blade to the end of the pommel
        if (this.state === 'drop' || this.state === 'gather' || this.state === 'lock') return [this.x, this.tip, this.x, this.tip - COL_L - COL_GRIP];
        return [this.x, FLOOR, this.x + this.dir * Math.sin(this.lean) * reach, FLOOR - Math.cos(this.lean) * reach];
      },
      hits(Pl) {
        const live = this.state === 'drop' || this.state === 'fall' || (this.state === 'down' && this.t - this.landT < 0.08);
        if (!live) return false;
        const [x1, y1, x2, y2] = this.seg(), r = COL_HW + 6 + (Pl.pad || 0);
        for (const dy of [6, 22, 38]) if (G.distPointSeg(Pl.x, Pl.y - dy, x1, y1, x2, y2) < r) return true;
        return false;
      },
      danger() {
        const st = this.state;
        if (st === 'gather') return null; // still following: it will be wherever the hero goes
        if (st === 'lock' || st === 'drop') return [this.x, COL_HW + 16, Math.max(0, this.dropAt - this.t) + 0.1];
        // the whole fall side, from just behind the base (the blade is broad there) out past the pommel
        const near = COL_HW + 26, far = reach + 24, mid = this.x + this.dir * (far - near) / 2;
        if (st === 'lean') return [mid, (far + near) / 2, Math.max(0, this.fallAt - this.t) + 0.5];
        if (st === 'fall') return [mid, (far + near) / 2, 0.2];
        return null;
      },
      draw(ctx) {
        const a = this.a;
        if (a <= 0.01) return;
        // its shadow on the floor, gathering as it comes down
        const sk = this.state === 'gather' || this.state === 'lock' ? G.clamp((this.tip + 120) / (FLOOR + 120), 0, 1) : 1;
        ctx.fillStyle = 'rgba(4,0,2,' + (0.5 * a * sk) + ')';
        if (this.state === 'down' || this.state === 'fall') {
          const L = Math.sin(this.lean) * reach;
          ctx.beginPath(); ctx.ellipse(this.x + this.dir * L / 2, FLOOR + 2, L / 2 + 20, 9, 0, 0, G.TAU); ctx.fill();
        } else { ctx.beginPath(); ctx.ellipse(this.x, FLOOR + 2, 20 + 50 * sk, 7 + 4 * sk, 0, 0, G.TAU); ctx.fill(); }
        ctx.save();
        ctx.beginPath(); ctx.rect(-80, -400, G.W + 160, FLOOR + 402); ctx.clip(); // the point is buried
        let gx, gy, ang;
        if (this.state === 'gather' || this.state === 'lock' || this.state === 'drop') {
          gx = this.x; gy = this.tip - COL_L; ang = Math.PI / 2;
          // (a lock that shivers, so the moment it stops following can be seen)
          if (this.state === 'lock') gx += Math.sin(this.t * 70) * 1.5;
        } else {
          const ux = this.dir * Math.sin(this.lean), uy = -Math.cos(this.lean), wob = this.state === 'lean' ? Math.sin(this.t * 40) * 0.004 : 0;
          gx = this.x + ux * (COL_L - COL_SINK); gy = FLOOR + uy * (COL_L - COL_SINK);
          ang = Math.atan2(-uy, -ux) + wob;
        }
        if (this.state === 'drop') {
          // the fall streaks: dark lines above it
          ctx.strokeStyle = G.rgba(C.blood, 0.25 * a); ctx.lineWidth = 2;
          for (const ox of [-30, 0, 30]) D.line(ctx, gx + ox, gy - 200, gx + ox * 0.6, gy - 40);
        }
        voidSword(ctx, gx, gy, ang, COL_S, a);
        ctx.restore();
      },
    });
    // it gathers above, and follows the hero
    let e = 0;
    while (e < gather) {
      const dt = yield;
      e += dt;
      cs.x = G.damp(cs.x, G.clamp(P.x, lo, hi), 3.4, dt);
      cs.tip = G.lerp(-120, FLOOR - 300, E.outCubic(Math.min(1, e / gather)));
      if (Math.random() < dt * 24) G.fx.spawn({ kind: 'spark', x: b.x + b.face * 8 + G.rand(-4, 4), y: b.y - 200, vx: G.rand(-20, 20), vy: -G.rand(400, 800), life: G.rand(0.2, 0.4), size: G.rand(1.4, 2.6), color: C.blood, len: 0.06 });
    }
    // it stops following: a glint at its point, and a breath of stillness
    cs.state = 'lock'; cs.dropAt = cs.t + lock;
    G.fx.glint(cs.x, cs.tip - 10, 44, C.hot, 0.3); G.audio.play('glint');
    G.fx.glint(b.x + b.face * 8, b.y - 210, 22, C.hot, 0.24);
    yield* wait(lock);
    // the Knight drives its own sword down, and the giant one comes down with it
    b.fast = true; b.pose = 'kneel';
    cs.state = 'drop'; cs.tip0 = cs.tip;
    G.audio.play('streak');
    while (cs.state === 'drop') yield;
    yield* wait(B.phase === 3 ? 0.22 : 0.34);
    // which way it will fall: on the hero (if they stand right under it, the longer side)
    const dir = Math.abs(P.x - cs.x) > 24 ? G.sign(P.x - cs.x) : (cs.x < (WL + WR) / 2 ? 1 : -1);
    const leanT = 0.75 * T;
    cs.dir = dir; cs.state = 'lean'; cs.fallAt = cs.t + leanT;
    // the Knight rises with its sword up; the giant blade creaks over the way it will go
    b.fast = false; b.pose = 'overRaise';
    G.audio.play('pull'); G.audio.play('charge', { dur: leanT });
    // first it gives with a crack, then it creaks on over, gathering speed, and does not stop
    G.audio.play('tink'); G.fx.shake(4);
    G.fx.dust(cs.x - dir * 30, FLOOR, 4, { dir: -dir, speed: [40, 180], size: [6, 11], up: 40, a: 0.4 });
    yield* tween(cs, { lean: 0.07 }, 0.22, E.outQuad);
    const creak = Math.max(0.2, leanT - 0.22);
    yield* tween(cs, { lean: 0.2 }, creak, E.inQuad);
    // and brings it down: the giant one follows it over
    b.fast = true; b.pose = 'slam';
    cs.state = 'fall'; cs.w = 2 * 0.13 / creak; // (at the speed the creak had reached)
    G.audio.play('whoosh'); G.fx.shake(6);
    while (cs.state === 'fall') yield;
    yield* wait(0.55);
  }

  // Back to rest. Whatever it has just done, the sword ends on its shoulder, and how it gets there
  // depends on where the sword was left: stuck in the ground it is wrenched free; dropped after a
  // crash it is pushed up off; low or out in front it is stood up and let fall back.
  B.recover = function* () {
    const b = B.body, at = b.pose;
    if (b.unarmed || b.y < FLOOR - 1) return;
    b.fast = false; b.spinning = false;
    if (at === 'slam' || at === 'plant' || at === 'kneel' || at === 'bury' || at === 'wrench') {
      b.pose = 'wrench';
      yield* wait(0.14);
      G.audio.play('tink'); G.fx.shake(3);
      G.fx.burst(b.x + b.face * 44, FLOOR - 4, { n: 6, color: '22,18,32', speed: [100, 360], angle: -Math.PI / 2, spread: 1.6, life: [0.4, 0.8], size: [4, 8], kind: 'chunk', grav: 1400 });
      G.fx.dust(b.x + b.face * 44, FLOOR, 3, { speed: [20, 110], size: [6, 10], up: 40 });
      b.fast = true; b.pose = 'heft';
      yield* wait(0.16);
      b.fast = false;
    } else if (at === 'crash') {
      b.pose = 'push';
      yield* wait(0.3);
      b.pose = 'heft';
      yield* wait(0.2);
    } else {
      b.pose = 'heft';
      yield* wait(0.22);
    }
    b.pose = 'idle';
    yield* wait(0.24);
    // it comes down on the shoulder and the whole frame takes the weight
    if (b.pv) b.pv[1] += 46;
    G.audio.play('stepHeavy'); G.fx.kick(0, 1.2);
    yield* wait(0.1);
  };

  B.ATTACKS = {
    sever: atkSever,
    hurl: atkHurl,
    cleave: atkCleave, cleave2: atkCleave2, overhead: atkOverhead, charge: atkCharge, grip: atkGrip, graves: atkGraves,
    wraiths: atkWraiths, desecrate: atkDesecrate, whirl: atkWhirl, rend: atkRend, leap: atkLeap, reap: atkReap,
    heel: atkHeel, thrust: atkThrust,
    march: atkMarch, souls: atkSouls, tolling: atkTolling, skyward: atkSkyward, // (v2.1a; skyward is B.antiAir)
    requiem: atkRequiem, colossus: atkColossus, // (corrupted only: B.corruptBags)
  };

  // ------------------------------------------------------------------ scenes
  B.enter = function* () {
    const b = B.body;
    b.x = 900; b.y = FLOOR + 150; b.pose = 'kneel'; b.p = POSES.kneel.slice(); b.face = -1;
    yield* wait(0.3);
    G.audio.play('bell');
    // it climbs out of the ground
    let e = 0;
    while (e < 1.3) {
      const dt = yield;
      e += dt;
      b.y = G.lerp(FLOOR + 150, FLOOR, E.outCubic(Math.min(1, e / 1.3)));
      G.fx.shake(3);
      if (Math.random() < 0.6) G.fx.burst(b.x + G.rand(-40, 40), FLOOR - 4, { n: 1, color: '24,22,30', speed: [100, 420], angle: -Math.PI / 2, spread: 1.6, life: [0.5, 1], size: [4, 9], kind: 'chunk', grav: 1400 });
      if (Math.random() < dt * 26) G.fx.dust(b.x + G.rand(-46, 46), FLOOR, 1, { speed: [10, 70], size: [8, 15], life: [0.6, 1.2], up: 80, a: 0.4 });
    }
    b.y = FLOOR;
    yield* wait(0.3);
    b.pose = 'idle';
    yield* wait(0.4);
  };
  // The second phase: it dies. The light goes out of it and for a breath the fight looks won. Then
  // the bell tolls, its cape burns away in ghostfire, and the Host steps out of it: from here every
  // cut it makes is made again by its own ghost.
  // The third phase: the Blood Oath. It raises the burning blade, and greatswords fall out of the sky
  // wall by wall until the ground left to fight on is a duelling ring. There is no keeping away now.
  B.phaseIn = function* (n) {
    const b = B.body;
    b.y = FLOOR; b.fast = false; b.pose = 'kneel';
    if (n === 2) {
      b.still = true; // no embers: it is dead
      G.audio.setIntensity(0);
      yield* wait(1.25);
      G.audio.play('bell'); G.fx.shake(7);
      // the cape catches
      let e = 0;
      while (e < 0.8) {
        const dt = yield;
        e += dt;
        for (const q of B.cape) if (Math.random() < dt * 22) G.fx.spawn({ x: q.x + G.rand(-10, 10), y: q.y + G.rand(-6, 6), vx: G.rand(-30, 30), vy: -G.rand(60, 220), life: G.rand(0.3, 0.7), size: G.rand(3, 7), color: G.PAL[2].boss });
      }
      b.bare = true; b.still = false;
      for (const q of B.cape) G.fx.burst(q.x, q.y, { n: 3, color: G.PAL[2].hot, speed: [40, 260], life: [0.3, 0.8], size: [2, 5], grav: -120 });
      G.audio.play('whoosh');
      b.pose = 'plant';
      yield* wait(0.35);
    } else {
      yield* wait(0.6);
      b.pose = 'walk';
      while (Math.abs(b.x - 640) > 6) { const dt = yield; b.face = b.x < 640 ? 1 : -1; b.x += b.face * Math.min(Math.abs(640 - b.x), 420 * dt); }
      facePlayer();
      b.pose = 'overRaise'; b.blaze = 1;
      G.audio.play('charge', { dur: 0.8 });
      let e = 0;
      while (e < 0.8) { const dt = yield; e += dt; K.aura(b.x, b.y, DANGER, 34, 120, 2); G.fx.shake(3); }
    }
  };
  B.phaseOut = function* (n) {
    const b = B.body;
    if (n === 2) {
      b.pose = 'overRaise';
      G.fx.shake(14);
      // the Host: three of it step out and cut the air
      const cuts = [[-170, -1, true], [170, 1, true], [0, b.face, false]];
      for (const [dx, f, down] of cuts) {
        const o = down ? { a0: -2.5, a1: 0.78, pose: 'cleave' } : { a0: 0.78, a1: -2.5, pose: 'rise' };
        echo(G.clamp(b.x + dx, WL + 60, WR - 60), f, o, down ? 'raise' : 'low', true);
        G.audio.play('orb');
        let e = 0;
        while (e < 0.3) { const dt = yield; e += dt; K.aura(b.x, b.y, G.PAL[2].boss, 30, 120, 2); }
      }
      yield* wait(0.9);
    } else {
      b.fast = true; b.pose = 'slam';
      yield* wait(0.07);
      K.impact(b.x + b.face * 40, true, DANGER);
      G.fx.impact(b.x, b.y - 60, 0.08);
      b.blaze = 0;
      // blades fall, wall by wall, and the ground closes to a ring
      const N = 5;
      for (let i = 0; i < N; i++) {
        const q = (i + 1) / N, l = G.lerp(G.WALL_L, RING_L, q), r = G.lerp(G.WALL_R, RING_R, q);
        for (const x of [l, r]) {
          B.swords.push({ x, t: 0, lean: G.rand(-0.12, 0.12), s: i === N - 1 ? 1.5 : G.rand(1.05, 1.35) });
          G.fx.thud(x, FLOOR, 1.1, { col: G.PAL[3].boss });
          G.fx.burst(x, FLOOR - 6, { n: 8, color: G.PAL[3].hot, speed: [150, 560], angle: -Math.PI / 2, spread: 1.6, life: [0.2, 0.5], kind: 'spark', size: [2, 4], grav: 900 });
        }
        G.audio.play('slam'); G.fx.shake(9);
        WL = l; WR = r;
        G.bounds = { l: WL + 13, r: WR - 13 };
        yield* wait(0.13);
      }
      B.ring = true;
      yield* wait(0.7);
    }
    b.pose = 'idle';
  };

  B.idle = function (dt) {
    const b = B.body, P = G.player;
    if (b.y < FLOOR) b.y = Math.min(FLOOR, b.y + 900 * dt);
    facePlayer();
    if (Math.abs(P.x - b.x) > 170) { b.x = G.clamp(b.x + b.face * (B.phase === 3 ? 150 : 110) * dt, WL + 50, WR - 50); b.pose = 'walk'; }
    else b.pose = 'idle';
  };

  B.tick = function (dt) {
    const b = B.body, P = G.player;
    if (b.pose === 'walk') {
      b.walkT += dt * 5.5;
      const sn = Math.floor(b.walkT / Math.PI + 0.5);
      if (sn !== b.stepN) {
        b.stepN = sn;
        if (b.y >= FLOOR - 1 && !b.hidden) {
          G.fx.dust(b.x + b.face * 14, FLOOR, 3, { speed: [20, 110], size: [5, 10], up: 26, a: 0.36 });
          G.fx.shake(1.6); G.fx.kick(0, 1.4);
          if (!b.hush) G.audio.play('stomp'); // (the Requiem is walked in silence)
        }
      }
    }
    if (b.smooth > 0) b.smooth -= dt; // (every turn is eased now, by K.turn: b.smooth is left for the attacks that set it)
    // the helm turns on its own spring, a little ahead of the body (the Heel's first tell)
    b.lookV = (b.lookV || 0) + (((b.lookT || 0) - (b.look || 0)) * 380 - (b.lookV || 0) * 30) * dt;
    b.look = (b.look || 0) + b.lookV * dt;
    // and tilts up to look at whoever is over it (Skyward's tell)
    b.gazeV = (b.gazeV || 0) + (((b.gazeT || 0) - (b.gaze || 0)) * 300 - (b.gazeV || 0) * 26) * dt;
    b.gaze = (b.gaze || 0) + b.gazeV * dt;
    // how long the hero has kept to its back, close in and on the ground (the Heel answers it)
    const behind = B.active && !b.spinning && (P.x - b.x) * b.face < -14 && Math.abs(P.x - b.x) < 300 && P.y > FLOOR - 170;
    b.behindT = G.clamp((b.behindT || 0) + (behind ? dt : -dt * 1.5), 0, 4);
    // the Requiem's black blade: it creeps up from the guard, and drains away when the attack ends
    if (!b.voidOn && b.voidK > 0) b.voidK = Math.max(0, b.voidK - dt * 2.5);
    if (b.voidK > 0.3 && !b.unarmed && Math.random() < dt * 30 * b.voidK) {
      const a = b.p[8] * (b.face > 0 ? 1 : -1) + (b.face > 0 ? 0 : Math.PI), q = G.rand(0.15, 1) * SWORD * b.voidK;
      const hx = b.x + b.face * b.p[6], hy = b.y + b.p[7];
      G.fx.spawn({ x: hx + Math.cos(a) * q, y: hy + Math.sin(a) * q, vx: G.rand(-16, 16), vy: -G.rand(20, 70), life: G.rand(0.4, 0.9), size: G.rand(3, 7), color: G.corrupt.COL.void, wob: 30, rot: G.rand(0, 6) });
    }
    for (const w of B.swords) w.t = Math.min(1, w.t + dt / 0.12);
    const target = b.pose === 'walk' ? walkPose(b.walkT) : (POSES[b.pose] || POSES.idle);
    // Every part of the pose is a weight on a spring: it starts slowly, gathers speed, runs a little
    // past where it is going and settles. And it has weight: whatever is on its way down (the hips,
    // the sword hand, the point of the blade) is hurried by it, whatever is on its way up is held back.
    // So a cut that falls lands hard and bites, and hauling the sword back up takes visible effort.
    if (!b.pv) b.pv = new Array(NP).fill(0);
    const w0 = b.fast ? 42 : 13, z = b.fast ? 0.6 : 0.82;
    for (let i = 0; i < NP; i++) {
      if (i === 9 && (target[9] === 999 || b.p[9] === 999)) { b.p[9] = target[9]; b.p[10] = target[10]; b.pv[9] = b.pv[10] = 0; continue; }
      if (i === 10 && target[9] === 999) continue;
      let w = w0;
      const falling = i === 8 ? Math.sin(target[8]) > Math.sin(b.p[8]) + 0.02 : (i === 1 || i === 7) ? target[i] > b.p[i] + 0.5 : null;
      if (falling !== null) w *= falling ? 1.3 : 0.86;
      b.pv[i] += ((target[i] - b.p[i]) * w * w - 2 * z * w * b.pv[i]) * dt;
      b.p[i] += b.pv[i] * dt;
    }
    D.chainStep(B.cape, b.x - b.face * 12, b.y + b.p[1] - 42, dt, { seg: 13, grav: 90, drift: 12, face: b.face, wave: 5, rate: 4, floor: FLOOR - 2 });
    if (b.blaze && Math.random() < dt * 70) {
      G.fx.spawn({ x: b.x + b.face * G.rand(-10, 70), y: b.y - G.rand(90, 200), vx: G.rand(-40, 40), vy: -G.rand(40, 160), life: G.rand(0.3, 0.7), size: G.rand(2, 4.5), color: DANGER, wob: 60, rot: G.rand(0, 6) });
    }
    // embers of whatever keeps it standing
    if (!B.dead && !b.still && Math.random() < 0.3) {
      G.fx.spawn({ x: b.x + G.rand(-26, 26), y: b.y - G.rand(10, 120), vx: G.rand(-14, 14), vy: G.rand(-70, -20), life: G.rand(0.4, 0.9), size: G.rand(1.5, 3.5), color: G.pal().boss, kind: 'glow' });
    }
    if (b.hurt && G.canHurt() && G.rectsOverlap(P.box(), { cx: b.x + b.face * 6, cy: b.y - 52, hw: 30, hh: 48 })) P.tryHit(1, b.x, b);
  };

  // ------------------------------------------------------------------ drawing
  // The greatsword: as long as the Knight is tall (SWORD from the guard to the point), with a grip
  // for two hands. Drawn from the sword hand along ang.
  const SWORD = 152;
  function sword(ctx, x, y, ang, col, hot) {
    const L = SWORD;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    D.glow(ctx, col, L / 2, 0, L * 0.56, 0.3);
    ctx.strokeStyle = '#06080c'; ctx.lineWidth = 6; D.line(ctx, -34, 0, 2, 0);
    ctx.strokeStyle = '#2a3440'; ctx.lineWidth = 2.5; D.line(ctx, -32, 0, 0, 0);
    ctx.fillStyle = G.rgba(col, 0.9); D.poly(ctx, [-41, 0, -35.5, -5, -30, 0, -35.5, 5]); ctx.fill();
    // crossguard with hooked ends
    ctx.fillStyle = '#1c2630';
    D.poly(ctx, [0, -15, 5, -19, 9, -15, 7, -4, 7, 4, 9, 15, 5, 19, 0, 15]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 1.2; ctx.stroke();
    // a broad blade, dark with a lit edge and runes down the fuller
    ctx.fillStyle = '#131a22';
    D.poly(ctx, [7, -9.5, L - 26, -8, L, 0, L - 26, 8, 7, 9.5]); ctx.fill();
    ctx.fillStyle = G.rgba(col, 0.55);
    D.poly(ctx, [7, -9.5, L - 26, -8, L, 0, L - 22, -3.4, 9, -4.8]); ctx.fill();
    ctx.strokeStyle = G.rgba(hot, 0.9); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(7, -9.5); ctx.lineTo(L - 26, -8); ctx.lineTo(L, 0); ctx.stroke();
    ctx.fillStyle = G.rgba(hot, 0.95);
    for (let rx = 22; rx < L - 44; rx += 17) { D.poly(ctx, [rx, 0, rx + 4, -2.6, rx + 8, 0, rx + 4, 2.6]); ctx.fill(); }
    ctx.restore();
  }
  // (corrupted) The Requiem's tell: the blade goes black from the guard to the point (k from 0 to 1),
  // the light of its runes put out, with only a thread of blood along the edge.
  function voidBlade(ctx, x, y, ang, k) {
    const L = SWORD, C = G.corrupt.COL, reach = 7 + (L - 7) * Math.min(1, k * 1.15);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.rect(0, -14, reach, 28); ctx.clip();
    ctx.globalAlpha *= Math.min(1, k * 1.6);
    ctx.fillStyle = C.dark;
    D.poly(ctx, [7, -10.5, L - 25, -9, L + 1.5, 0, L - 25, 9, 7, 10.5]); ctx.fill();
    ctx.strokeStyle = G.rgba(C.blood, 0.85); ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(7, -9.5); ctx.lineTo(L - 26, -8); ctx.lineTo(L, 0); ctx.lineTo(L - 26, 8); ctx.stroke();
    // the darkness smoulders where it has reached
    ctx.fillStyle = G.rgba(C.blood, 0.5 + 0.5 * Math.sin(G.t * 20));
    D.poly(ctx, [reach - 5, 0, reach - 1, -2.4, reach + 3, 0, reach - 1, 2.4]); ctx.fill();
    ctx.restore();
  }
  // (corrupted) The Colossus: the Knight's own greatsword made giant out of the void, s times its size.
  // Drawn like the real one from the guard along ang: black, edged in blood, runes like embers.
  function voidSword(ctx, x, y, ang, s, a) {
    const L = SWORD, C = G.corrupt.COL;
    if (a <= 0.01) return;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.globalAlpha *= a;
    // the dark it is made of, smoking off it (darkens what is behind it rather than lighting it)
    const g = ctx.createLinearGradient(0, -26, 0, 26);
    g.addColorStop(0, 'rgba(5,0,3,0)'); g.addColorStop(0.5, 'rgba(5,0,3,0.55)'); g.addColorStop(1, 'rgba(5,0,3,0)');
    ctx.fillStyle = g; ctx.fillRect(-44, -26, L + 54, 52);
    D.glow(ctx, C.blood, L * 0.5, 0, L * 0.62, 0.18);
    // grip, pommel and the hooked guard
    ctx.strokeStyle = C.dark; ctx.lineWidth = 6; D.line(ctx, -34, 0, 2, 0);
    ctx.strokeStyle = G.rgba(C.blood, 0.5); ctx.lineWidth = 1; D.line(ctx, -32, -2, 0, -2);
    ctx.fillStyle = G.rgba(C.blood, 0.9); D.poly(ctx, [-41, 0, -35.5, -5, -30, 0, -35.5, 5]); ctx.fill();
    ctx.fillStyle = C.dark;
    D.poly(ctx, [0, -15, 5, -19, 9, -15, 7, -4, 7, 4, 9, 15, 5, 19, 0, 15]); ctx.fill();
    ctx.strokeStyle = G.rgba(C.blood, 0.8); ctx.lineWidth = 0.8; ctx.stroke();
    // the blade
    ctx.fillStyle = C.dark;
    D.poly(ctx, [7, -9.5, L - 26, -8, L, 0, L - 26, 8, 7, 9.5]); ctx.fill();
    ctx.fillStyle = 'rgba(40,4,16,0.9)';
    D.poly(ctx, [7, -9.5, L - 26, -8, L, 0, L - 22, -3.4, 9, -4.8]); ctx.fill();
    ctx.strokeStyle = G.rgba(C.blood, 0.95); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(7, -9.5); ctx.lineTo(L - 26, -8); ctx.lineTo(L, 0); ctx.lineTo(L - 26, 8); ctx.lineTo(7, 9.5); ctx.stroke();
    ctx.fillStyle = G.rgba(C.hot, 0.55 + 0.25 * Math.sin(G.t * 9));
    for (let rx = 22; rx < L - 44; rx += 17) { D.poly(ctx, [rx, 0, rx + 4, -2.6, rx + 8, 0, rx + 4, 2.6]); ctx.fill(); }
    ctx.restore();
  }

  B.drawGround = function (ctx) {
    const b = B.body;
    if (B.dead) return;
    const k = G.clamp(1 - (FLOOR - b.y) / 420, 0.2, 1);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.48 * k) + ')';
    ctx.beginPath(); ctx.ellipse(b.x, FLOOR + 3, 52 * k, 8 * k, 0, 0, G.TAU); ctx.fill();
    const pal = G.pal();
    // struck from its hands: the sword turns over in the air and stands in the floor
    if (B.lost) {
      const q = B.lost, kk = q.k, x = G.lerp(q.x0, q.x1, kk), y = FLOOR - 96 - 4 * 190 * kk * (1 - kk) + 96 * 0;
      const ang = kk < 1 ? kk * 11 * (q.x1 > q.x0 ? 1 : -1) + 1.2 : Math.PI / 2;
      if (kk < 1) sword(ctx, x - Math.cos(ang) * 60, y - Math.sin(ang) * 60, ang, pal.boss, pal.hot);
      else sword(ctx, q.x1, FLOOR - SWORD + 36, Math.PI / 2 + Math.sin(G.t * 40) * 0.02, pal.boss, pal.hot);
    }
    // the Blood Oath's ring: greatswords driven into the ground, hilts up
    for (const w of B.swords) {
      const drop = (1 - G.ease.inQuad(w.t)) * 700;
      ctx.save();
      ctx.translate(w.x, FLOOR - (SWORD - 34) * w.s - drop); ctx.rotate(w.lean); ctx.scale(w.s, w.s);
      sword(ctx, 0, 0, Math.PI / 2, pal.boss, pal.hot);
      ctx.restore();
    }
    if (B.ring) {
      // nothing to fight on beyond them
      for (const [x0, x1] of [[G.WALL_L - 40, WL], [WR, G.WALL_R + 40]]) {
        const gr = ctx.createLinearGradient(x0, 0, x1, 0), out = x0 < WL ? 0 : 1;
        gr.addColorStop(out, 'rgba(4,2,6,0.62)'); gr.addColorStop(1 - out, 'rgba(4,2,6,0)');
        ctx.fillStyle = gr; ctx.fillRect(x0, FLOOR - 420, x1 - x0, 420);
      }
    }
  };

  B.draw = function (ctx) {
    if (B.dead) return;
    drawKnight(ctx, B.body, 1);
  };

  // The Knight, or (alpha below 1) one of the ghosts that cut beside it.
  function drawKnight(ctx, b, alpha) {
    if (alpha <= 0.01) return;
    const p = b.p, pal = G.pal(), col = pal.boss, hot = pal.hot, real = b === B.body;
    const lean = p[0], hip = p[1];
    const dark = '#090c11', mid = '#18212b', plate = '#2b3846', trim = '#40536a';
    const jx = b.jit ? G.rand(-b.jit, b.jit) : 0;
    // while it whirls the whole figure turns: squeeze it sideways and flip; any other turn narrows it
    // through the turn too (K.turn), rather than flipping it in one frame
    const turn = b.spinning ? Math.cos(b.spin) : 1;
    const sx = b.spinning ? b.face * (Math.abs(turn) < 0.25 ? 0.25 * (turn < 0 ? -1 : 1) : turn) : real ? K.faceX(b, 0.25) : b.face;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // the cape: heavy and torn, in world space (it burns away when the Host rises)
    if (real && !b.bare) {
      D.ribbon(ctx, B.cape.map((q) => ({ x: q.x + jx, y: q.y })), 38, 58, 12);
      ctx.fillStyle = '#07090d'; ctx.fill();
      ctx.strokeStyle = G.rgba(col, 0.3); ctx.lineWidth = 1.5; ctx.stroke();
    }

    // nothing shows below the floor while it climbs out of the ground
    if (b.y > FLOOR) { ctx.beginPath(); ctx.rect(-80, -400, G.W + 160, FLOOR + 400); ctx.clip(); }
    ctx.translate(b.x + b.kx + jx, b.y);
    if (real) K.recoil(ctx, b);
    ctx.scale(sx, 1);
    D.glow(ctx, col, 0, -70, 120, real ? 0.2 : 0.55);

    const shx = Math.sin(lean) * 46, shy = hip - Math.cos(lean) * 46; // shoulders
    const hx = p[6], hy = p[7], ang = p[8];
    const grip = p[9] === 999;
    const ox = grip ? hx - Math.cos(ang) * 14 : p[9], oy = grip ? hy - Math.sin(ang) * 14 : p[10];

    const leg = (i) => {
      const lx = i ? -6 : 6, k = D.ik(lx, hip, p[2 + i * 2], p[3 + i * 2], 30, 30, -1);
      ctx.fillStyle = i ? dark : mid;
      D.limb(ctx, lx, hip, k.jx, k.jy, 17, 12); ctx.fill();
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey - 4, 12, 9); ctx.fill();
      // greave, knee spike and a heavy sabaton
      ctx.fillStyle = i ? mid : plate;
      D.poly(ctx, [k.jx - 5, k.jy + 2, k.jx + 7, k.jy + 1, k.ex + 6, k.ey - 8, k.ex - 4, k.ey - 8]); ctx.fill();
      D.poly(ctx, [k.jx - 2, k.jy - 6, k.jx + 13, k.jy - 3, k.jx + 4, k.jy + 5]); ctx.fill();
      D.poly(ctx, [k.ex - 7, k.ey - 9, k.ex + 6, k.ey - 9, k.ex + 17, k.ey - 2, k.ex + 17, k.ey, k.ex - 7, k.ey]); ctx.fill();
      if (!i) { ctx.strokeStyle = G.rgba(col, 0.6); ctx.lineWidth = 1.2; D.line(ctx, k.jx + 7, k.jy + 1, k.ex + 6, k.ey - 8); }
    };
    const arm = (front) => {
      const ax = shx + (front ? 9 : -9), ay = shy + 4, tx = front ? hx : ox, ty = front ? hy : oy;
      const k = D.ik(ax, ay, tx, ty, 23, 23, 1);
      ctx.fillStyle = front ? mid : dark;
      D.limb(ctx, ax, ay, k.jx, k.jy, 13, 10); ctx.fill();
      D.limb(ctx, k.jx, k.jy, k.ex, k.ey, 10, 9); ctx.fill();
      // vambrace and gauntlet
      ctx.fillStyle = front ? plate : mid;
      D.limb(ctx, G.lerp(k.jx, k.ex, 0.3), G.lerp(k.jy, k.ey, 0.3), G.lerp(k.jx, k.ex, 0.9), G.lerp(k.jy, k.ey, 0.9), 13, 11); ctx.fill();
      ctx.beginPath(); ctx.arc(k.ex, k.ey, 6.5, 0, G.TAU); ctx.fill();
      if (front) { ctx.strokeStyle = G.rgba(col, 0.6); ctx.lineWidth = 1.2; ctx.stroke(); }
    };

    leg(1);
    arm(false);
    // faulds and a tattered tabard under the belt
    ctx.fillStyle = dark;
    D.poly(ctx, [-13, hip - 4, 14, hip - 4, 17, hip + 20, 9, hip + 14, 6, hip + 34, 0, hip + 24, -5, hip + 36, -9, hip + 16, -16, hip + 22]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.4); ctx.lineWidth = 1.2; ctx.stroke();
    // breastplate: broad at the shoulders, with a burning sigil
    ctx.fillStyle = mid;
    D.poly(ctx, [-13, hip + 2, 14, hip + 2, shx + 21, shy + 6, shx + 15, shy - 6, shx - 15, shy - 6, shx - 21, shy + 6]); ctx.fill();
    ctx.fillStyle = plate;
    D.poly(ctx, [shx + 21, shy + 6, shx + 15, shy - 6, shx + 2, shy - 6, G.lerp(4, shx + 4, 0.45), G.lerp(hip, shy, 0.45), 14, hip + 2]); ctx.fill();
    const cx = G.lerp(0, shx, 0.62) + 3, cy = G.lerp(hip, shy, 0.62);
    D.glow(ctx, col, cx, cy, 22, 0.9);
    ctx.fillStyle = G.rgba(hot, 1);
    D.poly(ctx, [cx, cy - 9, cx + 3, cy - 2, cx + 8, cy, cx + 3, cy + 2, cx, cy + 11, cx - 3, cy + 2, cx - 8, cy, cx - 3, cy - 2]); ctx.fill();
    // belt with a skull buckle
    ctx.fillStyle = '#05070a'; D.poly(ctx, [-14, hip - 5, 15, hip - 5, 15, hip + 3, -14, hip + 3]); ctx.fill();
    ctx.fillStyle = G.rgba(hot, 0.9); ctx.beginPath(); ctx.arc(2, hip - 1, 4.2, 0, G.TAU); ctx.fill();
    ctx.fillStyle = '#05070a'; ctx.fillRect(0, hip - 2.4, 1.6, 1.8); ctx.fillRect(2.8, hip - 2.4, 1.6, 1.8);
    leg(0);

    // back pauldron, then the helm, then the front pauldron over the arm
    const pauldron = (px, py, s, c1) => {
      ctx.fillStyle = c1;
      D.poly(ctx, [px - 15 * s, py + 9, px - 16 * s, py - 4, px - 6 * s, py - 13, px + 8 * s, py - 12, px + 17 * s, py - 2, px + 15 * s, py + 10, px, py + 5]); ctx.fill();
      ctx.strokeStyle = G.rgba(col, 0.75); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.fillStyle = trim;
      D.poly(ctx, [px - 6 * s, py - 12, px - 3 * s, py - 27, px + 3 * s, py - 12]); ctx.fill();
      D.poly(ctx, [px + 5 * s, py - 12, px + 12 * s, py - 23, px + 13 * s, py - 8]); ctx.fill();
    };
    pauldron(shx - 15, shy, 0.85, mid);

    // helm: a crowned great helm with a slit of light and horns swept back
    const ex = shx + Math.sin(lean) * 15 + 2, ey = shy - Math.cos(lean) * 15 - 3;
    ctx.save();
    ctx.translate(ex, ey); ctx.rotate(lean * 0.5);
    if (b.look) {
      // looking back over its shoulder: the helm turns (narrows, then faces the other way) and dips
      const c = Math.cos(G.clamp(b.look, -0.2, 1.2) * Math.PI);
      ctx.rotate(0.14 * Math.sin(G.clamp(b.look, 0, 1) * Math.PI));
      ctx.scale(c < 0 ? Math.min(-0.3, c) : Math.max(0.3, c), 1);
    }
    if (b.gaze) ctx.rotate(-0.42 * b.gaze);
    ctx.fillStyle = trim;
    D.poly(ctx, [-7, -9, -17, -17, -27, -34, -15, -25, -4, -14]); ctx.fill();
    D.poly(ctx, [3, -12, 6, -22, 17, -37, 13, -22, 9, -11]); ctx.fill();
    ctx.fillStyle = plate;
    D.poly(ctx, [-11, 11, -12, -4, -8, -13, 1, -16, 10, -12, 13, -2, 12, 8, 6, 14, -4, 14]); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.7); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = trim;
    D.poly(ctx, [-9, -12, -7, -21, -3, -14, 1, -24, 4, -15, 8, -21, 10, -12]); ctx.fill();
    ctx.fillStyle = '#020305';
    D.poly(ctx, [0, -6, 13, -5, 12.5, 1, 1, 0]); ctx.fill();
    // (the delayed overhead's tell: the slit burns, a little wider and flickering, not brighter)
    const burn = b.burn || 0, fl = burn ? 0.6 + 0.4 * Math.sin(G.t * 47) : 0;
    D.glow(ctx, burn ? DANGER : col, 8, -2.6, 15 + 4 * burn, 1);
    ctx.fillStyle = G.rgba(burn ? DANGER : hot, 1);
    D.poly(ctx, [2.5, -4.4 - 1.2 * burn * fl, 12, -4 - 1.6 * burn * fl, 11.6, -1 + 1.2 * burn * fl, 3, -1.6 + 1 * burn * fl]); ctx.fill();
    ctx.strokeStyle = '#020305'; ctx.lineWidth = 1.4;
    for (const vx of [3, 6.5, 10]) D.line(ctx, vx, 3, vx, 10);
    ctx.restore();

    if (!b.unarmed) {
      // a burning blade: the warning colour, and a glow that grows through the wind-up
      if (b.blaze) { ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); D.glow(ctx, DANGER, SWORD / 2, 0, SWORD * 0.76, 0.75); ctx.restore(); }
      sword(ctx, hx, hy, ang, b.blaze ? DANGER : col, b.blaze ? '255,236,220' : hot); // thrown: see atkHurl
      if (b.voidK > 0.01) voidBlade(ctx, hx, hy, ang, b.voidK);
    }
    arm(true);
    pauldron(shx + 14, shy, 1, plate);

    if (b.flash > 0) D.glow(ctx, '255,255,255', 0, -70, 84, b.flash * 0.3); // (v1.6d: a tint, not a white dome)
    ctx.restore();
  }

  G.makeBoss(B);
})();
