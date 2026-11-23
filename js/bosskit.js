// Solfall - the frame shared by the duelling bosses (the Magus, the Veil, the Knight): health,
// three phases, stagger, attack selection and the script runner. Each boss file supplies its
// attacks, movement and drawing, and calls G.makeBoss with them. The Warden keeps its own file.
'use strict';
(function () {
  const { wait, tween } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards;
  const KITE_T = 2.6; // seconds of keeping away before a boss answers at range

  // the bosses a run is drawn from. A boss file loaded later adds itself (G.BOSS_IDS.push), so a
  // missing or broken file simply leaves it out.
  G.BOSS_IDS = ['warden', 'mage', 'assassin', 'knight'];
  G.setBoss = function (id) {
    G.boss = G.bosses[id] || G.bosses.warden;
    G.arena.setTheme(G.boss.theme || 'warden');
    return G.boss;
  };

  // ------------------------------------------------------------------ helpers the boss files share
  const K = G.kit = {};
  K.hard = () => G.fierce();
  K.gentle = () => G.settings.difficulty === 0;
  // Tells: many attacks have two ways of going, and a small thing the boss does beforehand says which.
  // This decides the way: by chance p, or as forced for a test. G.debug.variant = 'plain' turns every
  // variant off; any other value turns on the variants it names ('fast', 'follow,blaze', ...).
  K.chance = function (p, tag) {
    const v = G.debug.variant;
    if (v) return v !== 'plain' && String(v).split(',').includes(tag);
    return G.rng() < p;
  };
  K.T = () => G.diff().tele;

  // One-step damage check for an impact.
  K.crush = function (x, cy, hw, hh, dmg) {
    H.add({
      kind: 'crush', x, dmg: dmg || 1,
      update() { if (this.t > 0.07) this.dead = true; },
      hits(P) { return G.rectsOverlap(P.box(), { cx: x, cy, hw, hh }); },
    });
  };

  K.impact = function (x, big, col) {
    const P = G.pal();
    G.fx.shake(big ? 20 : 12); G.fx.punch(big ? 0.03 : 0.015);
    G.audio.play('slam');
    G.fx.ring(x, FLOOR - 4, { r0: 20, r1: big ? 240 : 150, life: 0.4, color: col || P.hot, width: 8 });
    G.fx.thud(x, FLOOR, big ? 1.9 : 1.15, { col: col || P.boss });
    G.fx.light(x, FLOOR - 30, big ? 300 : 200, col || P.hot, 0.2, 0.5);
    G.fx.burst(x, FLOOR - 6, { n: big ? 12 : 6, color: '22,18,32', speed: [150, 560], angle: -Math.PI / 2, spread: 2.2, life: [0.6, 1.2], size: [5, 11], kind: 'chunk', grav: 1500 });
    G.fx.burst(x, FLOOR - 6, { n: big ? 20 : 10, color: col || P.boss, speed: [150, 600], angle: -Math.PI / 2, spread: 2.6, life: [0.2, 0.6], kind: 'spark', size: [2, 4], grav: 900 });
  };

  // A warning column that a script moves and fills by hand (k from 0 to 1), then removes.
  K.columnMark = function (x, w, quiet) {
    const DANGER = G.COL.danger;
    return H.add({
      kind: 'mark', layer: 'under', x, w, k: 0, locked: false,
      update() { },
      draw(ctx) {
        if (quiet) return; // a blow whose warning is the body that deals it
        const l = this.x - this.w / 2, top = FLOOR - 330;
        const late = this.locked ? 0.5 + 0.5 * Math.sin(this.t * 55) : 0;
        const g = ctx.createLinearGradient(0, top, 0, FLOOR);
        g.addColorStop(0, G.rgba(DANGER, 0));
        g.addColorStop(1, G.rgba(DANGER, 0.12 + 0.1 * this.k + 0.12 * late));
        ctx.fillStyle = g; ctx.fillRect(l, top, this.w, FLOOR - top);
        ctx.fillStyle = G.rgba(DANGER, 0.14 + 0.1 * late);
        ctx.beginPath(); ctx.ellipse(this.x, FLOOR - 1, this.w / 2, 10, 0, 0, G.TAU); ctx.fill();
        ctx.fillStyle = G.rgba(DANGER, 0.36);
        ctx.beginPath(); ctx.ellipse(this.x, FLOOR - 1, this.w / 2 * this.k, 10 * this.k, 0, 0, G.TAU); ctx.fill();
        ctx.strokeStyle = G.rgba(DANGER, 0.55 + 0.4 * this.k); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(this.x, FLOOR - 1, this.w / 2, 10, 0, 0, G.TAU); ctx.stroke();
      },
    });
  };

  // A thin dashed line from (ox, oy) that follows the hero and then holds still: where something
  // thrown is about to fly. Read its .ang when it has run out (tele); lock is how long it holds.
  K.aim = function (ox, oy, tele, lock) {
    const P = G.player, DANGER = G.COL.danger;
    return H.add({
      kind: 'aim', ox, oy, ang: Math.atan2(P.y - 24 - oy, P.x - ox),
      update() {
        if (this.t < tele - (lock || 0.16)) this.ang = Math.atan2(P.y - 24 - this.oy, P.x - this.ox);
        if (this.t >= tele) this.dead = true;
      },
      draw(ctx) {
        const k = Math.min(1, this.t / tele), held = this.t >= tele - (lock || 0.16);
        ctx.strokeStyle = G.rgba(DANGER, 0.25 + 0.5 * k); ctx.lineWidth = held ? 3 : 1.5 + k;
        ctx.setLineDash([10, 8]); ctx.lineDashOffset = -this.t * 90;
        ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ox + Math.cos(this.ang) * 1500, this.oy + Math.sin(this.ang) * 1500); ctx.stroke();
        ctx.setLineDash([]);
      },
    });
  };

  // An aura: streaks of the boss's light torn upward around it, for the moment it changes.
  // A boss that is struck rocks back from the blow about its feet and is pressed down for an
  // instant, then springs upright. Called by each boss's draw, right after it moves to its feet.
  // (The squash is set the moment the blow lands, so it is held for the whole of the hit-freeze.)
  K.recoil = function (ctx, b) {
    if (b.rec) ctx.rotate(b.rec);
    if (b.sq) ctx.scale(1 + b.sq * 0.7, 1 - b.sq);
  };

  K.aura = function (x, y, col, w, h, n) {
    for (let i = 0; i < (n || 3); i++) {
      G.fx.spawn({ kind: 'spark', x: x + G.rand(-w, w), y: y - G.rand(0, h * 0.5), vx: G.rand(-30, 30), vy: -G.rand(500, 1100), life: G.rand(0.18, 0.4), size: G.rand(1.6, 3.4), color: col, len: 0.07 });
    }
  };

  // ------------------------------------------------------------------ the frame
  // B supplies: id, name, short, sub, taunt, theme, hudCols, BASE_HP, poise0, w, h (body size),
  // gaps, bags, cards, first, ATTACKS, and the hooks setup, enter, idle, tick, draw, drawGround.
  // Optional hooks: phaseIn, phaseOut, dying, onStagger, onRecover, onRelease, onInterrupt,
  // extraTargets, vuln, blocked, finale (name of a once-only attack below 12% health),
  // answer (the attack it uses on a hero who keeps away from it; kiting(P, b) overrides the test),
  // bounds() (walls of its own, kept up between attacks), drawOver (drawn above the arena and the boss).
  //
  // A change of phase is the boss's own scene. The frame stops the fight, runs phaseIn(n) (how it
  // falls), turns the arena's colours and shows the phase's name, runs phaseOut(n) (what it becomes),
  // then lets the fight go on. Nothing else is shared: no rings, no platforms, no second line of text.
  G.makeBoss = function (B) {
    G.bosses[B.id] = B;
    B.kit = true;

    B.reset = function () {
      B.maxHp = Math.round(B.BASE_HP * G.diff().bossHp);
      B.hp = B.maxHp;
      B.phase = 1; B.poise = 0; B.poiseMax = B.poise0; B.staggered = false;
      B.invuln = true; B.active = false; B.dead = false; B.dying = false; B.toppled = false; B.down = false;
      B.script = null; B.attackName = ''; B.bag = []; B.lastAtk = ''; B.forceNext = G.corrupt.opener(B, 1) || (B.first && B.first[1]) || '';
      B.t = 0; B.lastStand = false; B.kite = 0;
      B.body = { x: 900, y: FLOOR, face: -1, flash: 0, kick: 0, kx: 0, ctrl: true, hidden: false, exposed: false, jit: 0 };
      B.core = { x: 900, y: FLOOR - B.h * 0.55, r: B.w * 0.5 };
      G.bounds = null; G.wind = 0;
      G.arena.layout(B.id, 1); // (most have nothing in phase I)
      B.setup();
    };
    B.attract = function () { B.reset(); };

    // ---------------------------------------------------------------- targets and damage
    B.bodyBox = function () {
      const b = B.body;
      return { cx: b.x, cy: b.y - B.h / 2, hw: B.w / 2, hh: B.h / 2 };
    };
    B.targets = function () {
      const out = [];
      if (!B.active || B.dead || (B.dying && !B.toppled)) return out;
      if (!B.body.hidden) {
        const bb = B.bodyBox();
        out.push({ id: 'body', kind: 'body', ref: B.body, cx: bb.cx, cy: bb.cy, hw: bb.hw, hh: bb.hh });
      }
      if (B.extraTargets) B.extraTargets(out);
      return out;
    };

    B.damage = function (amount, t, info) {
      // toppled at nothing: any blow ends it, plainly (E is the finishing blow, see finish.js)
      // (blows still in the air as it goes down pass through: the choice comes once it is down)
      if (B.toppled) { if (!B.down) return false; B.body.flash = 1; B.finishOff(false); return true; }
      if (!B.active || B.dead || B.dying || B.invuln) return false;
      // crystals, clones and the like take the blow themselves
      if (t.kind === 'extra') return t.ref.onHit(amount, info, t);
      if (B.blocked && B.blocked(t, info)) return false;
      const b = B.body;
      // a Reckoning's ward takes the blow; the one that breaks it throws the boss down
      if (B.ward) {
        b.flash = 1;
        if (G.moments.wardHit(B, amount, info)) { if (B.onReckon) B.onReckon(false); stagger(); }
        return true;
      }
      let mult = B.staggered ? (B.staggerMult || 1.4) * (G.relic('eye') ? 1.3 : 1) : 1;
      if (b.exposed) mult *= 1.3;
      if (B.vuln) mult *= B.vuln(t, info);
      const dmg = Math.round(amount * mult);
      const floorHp = B.phase === 1 ? Math.floor(B.maxHp * 2 / 3) : B.phase === 2 ? Math.floor(B.maxHp / 3) : 0;
      B.hp = Math.max(floorHp, B.hp - dmg);
      G.player.stats.dmg += dmg; G.flow.dealt(dmg);
      b.flash = 1;
      b.kx = G.clamp(b.kx + (info.dir || G.sign(b.x - G.player.x) || 1) * (info.lance ? 14 : info.heavy ? 10 : 5), -18, 18);
      // it rocks away from the blow and is pressed down by it (see K.recoil)
      const big = info.finisher ? 1.5 : info.lance ? 1.25 : info.heavy ? 1 : 0.45;
      b.recV = G.clamp((b.recV || 0) + (info.dir || G.sign(b.x - G.player.x) || 1) * 2.4 * big, -5, 5);
      b.sq = Math.max(b.sq || 0, 0.045 + 0.05 * big);
      if (G.settings.numbers) {
        G.fx.text(info.x + G.rand(-12, 12), info.y - 16, String(dmg), {
          color: (B.staggered || b.exposed || info.finisher) ? '255,226,140' : '255,255,255',
          size: info.finisher ? 28 : info.heavy ? 23 : 17, life: info.finisher ? 0.8 : 0.65, pop: true,
        });
      }
      if (!B.staggered) {
        B.poise += (amount * (B.poiseK || 1.15) * (info.poise || 1) + (info.lance ? 60 : 0)) * (G.relic('sunstone') ? 1.4 : 1);
      }
      if (B.onHit) B.onHit(dmg, info);
      if (B.hp <= 0) die();
      else if (B.phase < 3 && B.hp <= floorHp) beginPhase(B.phase + 1);
      else if (!B.staggered && B.poise >= B.poiseMax) stagger();
      return true;
    };

    // ---------------------------------------------------------------- script control
    function release() {
      const b = B.body;
      b.ctrl = false; b.exposed = false; b.jit = 0;
      G.wind = 0; G.bounds = B.bounds ? B.bounds() : null;
      if (B.onRelease) B.onRelease();
    }
    function interrupt() {
      B.script = null; B.attackName = '';
      release();
      H.clear(true);
      if (B.onInterrupt) B.onInterrupt();
    }
    B.release = release; B.interrupt = interrupt;

    B.pushPlayer = function (force, range) {
      const P = G.player, b = B.body;
      if (P.dead) return;
      if (Math.abs(P.x - b.x) < (range || 420)) {
        P.vx = (G.sign(P.x - b.x) || 1) * (force || 560); P.vy = -380; P.stun = 0.3;
        P.onGround = false; P.plat = null; P.dashT = 0; P.atk = null;
      }
    };

    function stagger() {
      interrupt();
      B.staggered = true; B.poise = B.poiseMax;
      const b = B.body, cy = b.y - B.h / 2;
      G.audio.play('stagger');
      G.fx.stop(0.12); G.fx.shake(14); G.fx.flash(G.COL.starHot, 0.3, 0.3); G.fx.impact(b.x, cy, 0.07);
      G.fx.ring(b.x, cy, { r0: 40, r1: 280, life: 0.6, color: G.COL.starHot, width: 10 });
      G.fx.burst(b.x, cy, { n: 26, color: G.pal().hot, speed: [200, 700], life: [0.3, 0.8], kind: 'spark', size: [2, 5] });
      G.fx.shatter(b.x, cy, G.pal().boss, 18, { hot: G.pal().hot, r: 300, jitter: B.w * 0.4 });
      G.fx.punch(0.022);
      G.ui.callout(B.staggerWord || 'STAGGERED');
      G.feats.bump('stagger');
      B.script = staggerScript();
    }
    // thrown down from outside the fight (the Dying Light pair)
    B.forceStagger = function () {
      if (B.active && !B.dead && !B.dying && !B.invuln && !B.staggered && !B.ward) stagger();
    };
    // What a full stagger bar does is each boss's own: staggerIn (how it goes down), staggerOut (how
    // it gets up), staggerMult (damage taken while down, 1.4 unless given) and staggerDur (a scale on
    // how long it lasts). The Knight is disarmed, the Veil is thrown into a wall, the Magus is grounded.
    function* staggerScript() {
      const b = B.body, dur = G.diff().stagger * (B.staggerDur || 1) + (G.relic('sunstone') ? 1.5 : 0);
      b.ctrl = true; b.hidden = false;
      if (B.onStagger) B.onStagger();
      b.x = G.clamp(b.x, G.WALL_L + 90, G.WALL_R - 90);
      if (B.staggerIn) yield* B.staggerIn();
      else if (b.y < FLOOR - 1) {
        yield* tween(b, { y: FLOOR }, 0.3, E.inCubic);
        G.fx.shake(8); G.audio.play('boom');
        G.fx.thud(b.x, FLOOR, 1.2);
      }
      let e = 0;
      while (e < dur) {
        e += yield;
        B.poise = B.poiseMax * (1 - e / dur);
      }
      B.staggered = false; B.poise = 0;
      B.poiseMax = Math.min(900, B.poiseMax * 1.25);
      G.fx.ring(b.x, b.y - B.h / 2, { r0: 40, r1: 280, life: 0.45, color: G.pal().boss, width: 8 });
      G.audio.play('ring'); G.fx.shake(8);
      for (const d of [-1, 1]) G.fx.dust(b.x + d * 30, FLOOR, 5, { dir: d, speed: [120, 420], size: [7, 13], up: 40 });
      if (G.arena.gust) G.arena.gust(b.x, b.y - B.h / 2, 1.4);
      B.pushPlayer(480, 260);
      if (B.onRecover) B.onRecover();
      if (B.staggerOut) yield* B.staggerOut();
      yield* wait(0.45);
      release();
    }

    function beginPhase(n) {
      interrupt();
      B.invuln = true; B.staggered = false; B.poise = 0;
      B.phase = n; B.bag = [];
      G.player.onPhase(); // the Wardstone relic recharges each phase
      B.script = phaseScript(n);
    }
    function* phaseScript(n) {
      const b = B.body;
      b.ctrl = true; b.hidden = false;
      B.forceNext = G.corrupt.opener(B, n) || (B.first && B.first[n]) || '';
      G.ui.letterbox(true);
      G.fx.impact(b.x, b.y - B.h / 2, 0.09); G.fx.shake(16); G.fx.slow(0.25, 0.7);
      G.audio.play('stagger');
      B.pushPlayer();
      if (B.phaseIn) yield* B.phaseIn(n);
      G.arena.setPhase(n, 1.8);
      G.arena.layout(B.id, n); // the arena is laid out anew for each phase
      G.audio.setIntensity(n);
      G.audio.play('roar'); G.audio.play('card');
      G.ui.card('', B.cards[n][0], '');
      if (B.phaseOut) yield* B.phaseOut(n);
      G.ui.letterbox(false);
      B.poiseMax = B.poise0 + 60 * (n - 1); B.invuln = false; B.kite = 0;
      release();
    }

    // At nothing it does not die yet: it goes down in its own way and stays down (see finish.js).
    function die() {
      interrupt();
      B.dying = true; B.invuln = true; B.hp = 0; B.staggered = false; B.poise = 0;
      // a Dawnbreak that empties the bar is the ending itself: no topple, it dies when the Dawnbreak is done
      if (G.state !== 'fight' || G.player.ulting) { G.onBossDying(false); B.script = deathScript(); return; }
      B.toppled = true; B.down = false;
      G.onBossToppled();
      B.script = toppleScript();
    }
    // fin: the hero's finishing blow (E); otherwise a plain blow ended it
    B.finishOff = function (fin) {
      if (!B.toppled) return false;
      B.toppled = false; B.down = false;
      G.onBossDying(fin);
      B.script = deathScript();
      return true;
    };
    function* toppleScript() {
      const b = B.body;
      b.ctrl = true; b.hidden = false;
      G.audio.play('stagger'); G.fx.stop(0.14); G.fx.shake(16); G.fx.punch(0.03);
      G.fx.impact(b.x, b.y - B.h / 2, 0.08);
      G.fx.shatter(b.x, b.y - B.h / 2, G.pal().boss, 18, { hot: G.pal().hot, r: 300, jitter: B.w * 0.4 });
      if (B.onStagger) B.onStagger();
      if (B.dying0) B.dying0();
      b.x = G.clamp(b.x, G.WALL_L + 90, G.WALL_R - 90);
      if (B.staggerIn) yield* B.staggerIn();
      else if (b.y < FLOOR - 1) {
        yield* tween(b, { y: FLOOR }, 0.3, E.inCubic);
        G.fx.shake(8); G.audio.play('boom');
        G.fx.thud(b.x, FLOOR, 1.2);
      }
      yield* wait(0.15);
      // down, breathing hard, until it is finished
      B.down = true;
      while (B.toppled) { yield; b.jit = 0.4; }
    }
    function* deathScript() {
      const b = B.body;
      b.ctrl = true; b.hidden = false;
      while (G.finish.busy || G.player.ulting) yield; // the hero's finishing blow (or Dawnbreak) first
      G.fx.slow(0.12, 1.3); G.fx.shake(22);
      if (!G.finish.played) { G.fx.flash(G.COL.white, 0.8, 0.7); G.fx.stop(0.2); G.fx.impact(b.x, b.y - B.h / 2, 0.1); }
      G.audio.play('bossDie');
      if (B.dying0) B.dying0();
      if (b.y < FLOOR - 1) yield* tween(b, { y: FLOOR }, 0.5, E.inCubic);
      let e = 0, next = 0;
      while (e < 2.3) {
        const dt = yield;
        e += dt; next -= dt;
        b.jit = 1.5 + e * 2.5;
        if (next <= 0) {
          next = Math.max(0.07, 0.24 - e * 0.07);
          const bx = b.x + G.rand(-B.w / 2, B.w / 2), by = b.y - G.rand(0, B.h);
          G.fx.burst(bx, by, { n: 10, color: G.pal().hot, speed: [100, 600], life: [0.3, 0.8], size: [4, 10] });
          G.fx.shards(bx, by, 5, G.pal().boss, { speed: [140, 520] });
          G.fx.light(bx, by, 180, G.pal().hot, 0.18, 0.5);
          G.fx.dust(bx, by, 2, { speed: [20, 90], size: [8, 14], life: [0.6, 1.1], up: 70, a: 0.36, color: '84,78,100' });
          G.fx.shake(6 + e * 4);
        }
      }
      const cy = b.y - B.h / 2;
      G.fx.flash(G.PAL[4].hot, 1, 2.2); G.fx.shake(30);
      G.fx.burst(b.x, cy, { n: 80, color: G.PAL[4].boss, speed: [200, 1100], life: [0.6, 1.8], size: [4, 12], drag: 1.2 });
      G.fx.burst(b.x, cy, { n: 34, color: '18,14,24', speed: [200, 900], life: [1, 2], size: [6, 14], kind: 'chunk', grav: 1300 });
      G.fx.ring(b.x, cy, { r0: 30, r1: 900, life: 1.1, color: G.PAL[4].hot, width: 14 });
      G.fx.shatter(b.x, cy, G.PAL[4].boss, 40, { hot: G.PAL[4].hot, r: 520, speed: [200, 900], size: [4, 10], jitter: B.w * 0.5, r0: 60 });
      G.fx.boom(b.x, cy, 150, { col: G.PAL[4].boss, hot: G.PAL[4].hot });
      G.fx.thud(b.x, FLOOR, 2, { col: G.PAL[4].boss });
      G.fx.burst(b.x, cy, { n: 40, color: G.PAL[4].boss, speed: [30, 260], life: [1.4, 3], size: [1.6, 3.4], grav: -36, wob: 110, drag: 1.2, jitter: 60 });
      G.arena.setPhase(4, 2.6);
      B.dead = true; b.jit = 0;
      G.audio.play('victory');
      yield* wait(3.0);
      G.onBossDead();
    }

    // Reckoning: it goes to the middle of the arena, wards itself and gathers a blast (moments.js).
    // (v1.7b: not every boss needs it. It is the Warden's own moment now; a duelling boss only does
    // it if it sets B.reckons, and none of the three does.)
    B.ATTACKS.reckoning = function* () {
      const b = B.body, P = G.player;
      b.hidden = false; b.exposed = false;
      if (B.onReckon) B.onReckon(true);
      yield* tween(b, { x: 640, y: B.reckonY == null ? FLOOR : B.reckonY }, 0.7, E.inOutCubic);
      b.face = G.sign(P.x - b.x) || b.face;
      yield* G.moments.gather(B, () => ({ x: b.x, y: b.y - B.h / 2, r: Math.max(B.w, B.h) * 0.6 + 18 }));
      // only reached when the ward held
      if (B.onReckon) B.onReckon(false);
      if (b.y < FLOOR) yield* tween(b, { y: FLOOR }, 0.3, E.inCubic);
      yield* wait(0.5);
    };

    B.intro = function () { B.script = introScript(); };
    function* introScript() {
      const b = B.body;
      yield* wait(0.5);
      G.audio.play('charge', { dur: 1.4 });
      yield* B.enter();
      G.audio.play('roar'); G.audio.play('card');
      G.ui.card('', B.name, G.run.trial > 1 ? 'Trial ' + G.roman(G.run.trial) + ' · ' + B.taunt : B.sub);
      G.fx.shake(12);
      G.fx.ring(b.x, b.y - B.h / 2, { r0: 40, r1: 700, life: 0.9, color: G.pal().boss, width: 12, alpha: 0.7 });
      for (const d of [-1, 1]) G.fx.dust(b.x + d * 30, FLOOR, 6, { dir: d, speed: [140, 520], size: [7, 14], life: [0.6, 1.1], up: 44 });
      if (G.arena.gust) G.arena.gust(b.x, b.y - B.h / 2, 1.8);
      G.fx.jolt(1);
      yield* wait(1.0);
      B.active = true; B.invuln = false;
      release();
    }

    // ---------------------------------------------------------------- attack selection
    function refillBag() {
      const src = B.bags[B.phase].concat(G.corrupt.extra(B, B.phase)); // (a corrupted boss's own two, corrupt.js)
      for (let tries = 0; tries < 8; tries++) {
        B.bag = G.shuffle(src.slice());
        let ok = B.bag[B.bag.length - 1] !== B.lastAtk;
        for (let i = 1; i < B.bag.length && ok; i++) if (B.bag[i] === B.bag[i - 1]) ok = false;
        if (ok) break;
      }
    }
    function nextAttack() {
      if (B.forceNext) { const f = B.forceNext; B.forceNext = ''; B.lastAtk = f; return f; }
      if (B.choose) { const c = B.choose(); if (c) { B.lastAtk = c; return c; } }
      if (!B.bag.length) refillBag();
      B.lastAtk = B.bag.pop();
      return B.lastAtk;
    }
    function* think() {
      const low = B.phase === 3 && B.hp < B.maxHp * 0.12;
      // (the time its last attack took to come back to rest is taken out of the wait, so the pace is as it was)
      yield* wait(Math.max(0.12, B.gaps[B.phase] * G.diff().pace * (low ? 0.6 : 1) - (B.recT || 0)));
      B.recT = 0;
      let name = G.debug.forceAttack || '';
      if (name === 'none') return; // tests: stand idle
      if (!name && low && B.finale && !B.lastStand) { B.lastStand = true; name = B.finale; }
      if (!name && B.reckons && G.moments.due(B)) name = 'reckoning';
      // a hero who keeps away for too long is answered at range
      if (!name && !B.forceNext && B.answer && B.kite >= KITE_T && B.lastAtk !== B.answer) { name = B.answer; B.lastAtk = name; B.kite = 0; }
      if (!name) name = nextAttack();
      if (!B.ATTACKS[name]) name = B.bags[B.phase][0];
      B.attackName = name;
      B.body.ctrl = true;
      yield* B.ATTACKS[name]();
      // every attack ends in its own way back to rest (B.recover): the Knight shoulders its sword, the
      // Veil flicks its blades clean, the Magus lets the spell gutter out of its staff
      if (B.recover) {
        const t0 = B.t;
        B.body.exposed = false;
        yield* B.recover(name);
        B.recT = B.t - t0;
      }
      B.attackName = '';
      release();
    }

    B.update = function (dt) {
      B.t += dt;
      const b = B.body, P = G.player;
      b.flash = Math.max(0, b.flash - dt * 6);
      b.kx *= Math.exp(-13 * dt);
      // the rock is a spring, a little under-damped, so it comes back past upright once and settles
      b.recV = (b.recV || 0) + (-(b.rec || 0) * 300 - (b.recV || 0) * 17) * dt;
      b.rec = (b.rec || 0) + b.recV * dt;
      b.sq = (b.sq || 0) * Math.exp(-15 * dt);
      if (Math.abs(b.rec) < 0.0005 && Math.abs(b.recV) < 0.01) { b.rec = 0; b.recV = 0; }
      if (b.sq < 0.002) b.sq = 0;
      if (B.script) {
        if (B.script.next(dt).done) B.script = null;
      }
      if (!B.script && B.active && !B.dead && !B.dying && G.state === 'fight' && !P.dead) B.script = think();
      if (!b.ctrl && !B.dead && !B.dying && !B.staggered) B.idle(dt);
      // keeping away: far off along the floor, or up in the air and out of reach, for a few seconds on end
      if (B.active && !B.invuln && !B.staggered && !P.dead && G.state === 'fight') {
        const away = B.kiting ? B.kiting(P, b) : (Math.abs(P.x - b.x) > 330 || (!P.onGround && P.y < FLOOR - 120 && Math.abs(P.x - b.x) > 140));
        B.kite = G.clamp(B.kite + (away ? dt : -dt * 0.7), 0, KITE_T + 1.5);
      }
      B.tick(dt);
      B.core.x = b.x; B.core.y = b.y - B.h * 0.55;
    };

    B.drawDebug = function (ctx) {
      ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1;
      for (const t of B.targets()) ctx.strokeRect(t.cx - t.hw, t.cy - t.hh, t.hw * 2, t.hh * 2);
      const pb = G.player.box();
      ctx.strokeStyle = '#0ff';
      ctx.strokeRect(pb.cx - pb.hw, pb.cy - pb.hh, pb.hw * 2, pb.hh * 2);
    };

    return B;
  };
})();
