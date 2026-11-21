// Solfall - the frame shared by the duelling bosses (the Magus, the Veil, the Knight): health,
// three phases, stagger, attack selection and the script runner. Each boss file supplies its
// attacks, movement and drawing, and calls G.makeBoss with them. The Warden keeps its own file.
'use strict';
(function () {
  const { wait, tween } = G.seq;
  const E = G.ease, FLOOR = G.FLOOR, H = G.hazards;
  const ROMAN = ['', 'I', 'II', 'III'];

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
    G.fx.burst(x, FLOOR - 6, { n: big ? 26 : 14, color: '190,190,210', speed: [80, 420], angle: -Math.PI / 2, spread: 3, life: [0.3, 0.8], size: [4, 9] });
    G.fx.burst(x, FLOOR - 6, { n: big ? 12 : 6, color: '22,18,32', speed: [150, 560], angle: -Math.PI / 2, spread: 2.2, life: [0.6, 1.2], size: [5, 11], kind: 'chunk', grav: 1500 });
    G.fx.burst(x, FLOOR - 6, { n: big ? 20 : 10, color: col || P.boss, speed: [150, 600], angle: -Math.PI / 2, spread: 2.6, life: [0.2, 0.6], kind: 'spark', size: [2, 4], grav: 900 });
  };

  // A warning column that a script moves and fills by hand (k from 0 to 1), then removes.
  K.columnMark = function (x, w) {
    const DANGER = G.COL.danger;
    return H.add({
      kind: 'mark', layer: 'under', x, w, k: 0, locked: false,
      update() { },
      draw(ctx) {
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

  // ------------------------------------------------------------------ the frame
  // B supplies: id, name, short, sub, taunt, theme, hudCols, BASE_HP, poise0, w, h (body size),
  // gaps, bags, cards, first, ATTACKS, and the hooks setup, enter, idle, tick, draw, drawGround.
  // Optional hooks: phaseIn, phaseOut, dying, onStagger, onRecover, onRelease, onInterrupt,
  // extraTargets, vuln, blocked, finale (name of a once-only attack below 12% health).
  G.makeBoss = function (B) {
    G.bosses[B.id] = B;
    B.kit = true;

    B.reset = function () {
      B.maxHp = Math.round(B.BASE_HP * G.diff().bossHp);
      B.hp = B.maxHp;
      B.phase = 1; B.poise = 0; B.poiseMax = B.poise0; B.staggered = false;
      B.invuln = true; B.active = false; B.dead = false; B.dying = false;
      B.script = null; B.attackName = ''; B.bag = []; B.lastAtk = ''; B.forceNext = (B.first && B.first[1]) || '';
      B.t = 0; B.lastStand = false;
      B.body = { x: 900, y: FLOOR, face: -1, flash: 0, kick: 0, kx: 0, ctrl: true, hidden: false, exposed: false, jit: 0 };
      B.core = { x: 900, y: FLOOR - B.h * 0.55, r: B.w * 0.5 };
      G.bounds = null; G.wind = 0;
      if (B.platformsFrom === 1) G.arena.raisePlatforms();
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
      if (!B.active || B.dead || B.dying) return out;
      if (!B.body.hidden) {
        const bb = B.bodyBox();
        out.push({ id: 'body', kind: 'body', ref: B.body, cx: bb.cx, cy: bb.cy, hw: bb.hw, hh: bb.hh });
      }
      if (B.extraTargets) B.extraTargets(out);
      return out;
    };

    B.damage = function (amount, t, info) {
      if (!B.active || B.dead || B.dying || B.invuln) return false;
      // crystals, clones and the like take the blow themselves
      if (t.kind === 'extra') return t.ref.onHit(amount, info, t);
      if (B.blocked && B.blocked(t, info)) return false;
      const b = B.body;
      let mult = B.staggered ? 1.4 : 1;
      if (b.exposed) mult *= 1.3;
      if (B.vuln) mult *= B.vuln(t, info);
      const dmg = Math.round(amount * mult);
      const floorHp = B.phase === 1 ? Math.floor(B.maxHp * 2 / 3) : B.phase === 2 ? Math.floor(B.maxHp / 3) : 0;
      B.hp = Math.max(floorHp, B.hp - dmg);
      G.player.stats.dmg += dmg;
      b.flash = 1;
      b.kx = G.clamp(b.kx + (info.dir || G.sign(b.x - G.player.x) || 1) * (info.lance ? 14 : info.heavy ? 10 : 5), -18, 18);
      if (G.settings.numbers) {
        G.fx.text(info.x + G.rand(-12, 12), info.y - 16, String(dmg), {
          color: (B.staggered || b.exposed || info.finisher) ? '255,226,140' : '255,255,255',
          size: info.finisher ? 28 : info.heavy ? 23 : 17, life: info.finisher ? 0.8 : 0.65,
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
      G.wind = 0; G.bounds = null;
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
      G.fx.stop(0.12); G.fx.shake(14); G.fx.flash(G.COL.starHot, 0.3, 0.3);
      G.fx.ring(b.x, cy, { r0: 40, r1: 280, life: 0.6, color: G.COL.starHot, width: 10 });
      G.fx.burst(b.x, cy, { n: 26, color: G.pal().hot, speed: [200, 700], life: [0.3, 0.8], kind: 'spark', size: [2, 5] });
      G.ui.callout('STAGGERED', 'Strike now');
      B.script = staggerScript();
    }
    function* staggerScript() {
      const b = B.body, dur = G.diff().stagger + (G.relic('sunstone') ? 1.5 : 0);
      b.ctrl = true; b.hidden = false;
      if (B.onStagger) B.onStagger();
      b.x = G.clamp(b.x, G.WALL_L + 90, G.WALL_R - 90);
      if (b.y < FLOOR - 1) {
        yield* tween(b, { y: FLOOR }, 0.3, E.inCubic);
        G.fx.shake(8); G.audio.play('boom');
        G.fx.burst(b.x, FLOOR - 6, { n: 12, color: '190,190,210', speed: [60, 300], angle: -Math.PI / 2, spread: 3, life: [0.3, 0.7], size: [3, 7] });
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
      B.pushPlayer(480, 260);
      if (B.onRecover) B.onRecover();
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
      B.forceNext = (B.first && B.first[n]) || '';
      G.ui.letterbox(true);
      G.fx.flash(G.COL.white, 0.5, 0.5); G.fx.shake(16); G.fx.slow(0.25, 0.7);
      G.audio.play('stagger');
      if (B.phaseIn) yield* B.phaseIn(n);
      G.arena.setPhase(n, 1.8);
      if (B.platformsFrom === n) G.arena.raisePlatforms();
      G.audio.setIntensity(n);
      G.audio.play('roar'); G.audio.play('card');
      G.ui.card(ROMAN[n], B.cards[n][0], B.cards[n][1]);
      G.fx.flash(G.PAL[n].boss, 0.45, 0.8); G.fx.shake(20);
      B.pushPlayer();
      const out = B.phaseOut ? B.phaseOut(n) : null;
      let e = 0, ringT = 0, outDone = !out;
      while (e < 1.9 || !outDone) {
        const dt = yield;
        e += dt; ringT -= dt;
        if (!outDone && out.next(dt).done) outDone = true;
        G.fx.shake(5 * Math.max(0, 1 - e / 2));
        if (ringT <= 0 && e < 1.2) {
          ringT = 0.28;
          G.fx.ring(b.x, b.y - B.h / 2, { r0: 40, r1: 760, life: 0.9, color: G.PAL[n].boss, width: 12, alpha: 0.7 });
        }
      }
      G.ui.letterbox(false);
      B.poiseMax = B.poise0 + 60 * (n - 1); B.invuln = false;
      release();
    }

    function die() {
      interrupt();
      B.dying = true; B.invuln = true; B.hp = 0; B.staggered = false; B.poise = 0;
      G.onBossDying();
      B.script = deathScript();
    }
    function* deathScript() {
      const b = B.body;
      b.ctrl = true; b.hidden = false;
      G.fx.slow(0.12, 1.3); G.fx.flash(G.COL.white, 0.8, 0.7); G.fx.shake(22); G.fx.stop(0.2);
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
          G.fx.burst(b.x + G.rand(-B.w / 2, B.w / 2), b.y - G.rand(0, B.h), { n: 10, color: G.pal().hot, speed: [100, 600], life: [0.3, 0.8], size: [4, 10] });
          G.fx.shake(6 + e * 4);
        }
      }
      const cy = b.y - B.h / 2;
      G.fx.flash(G.PAL[4].hot, 1, 2.2); G.fx.shake(30);
      G.fx.burst(b.x, cy, { n: 80, color: G.PAL[4].boss, speed: [200, 1100], life: [0.6, 1.8], size: [4, 12], drag: 1.2 });
      G.fx.burst(b.x, cy, { n: 34, color: '18,14,24', speed: [200, 900], life: [1, 2], size: [6, 14], kind: 'chunk', grav: 1300 });
      G.fx.ring(b.x, cy, { r0: 30, r1: 900, life: 1.1, color: G.PAL[4].hot, width: 14 });
      G.arena.setPhase(4, 2.6);
      B.dead = true; b.jit = 0;
      G.audio.play('victory');
      yield* wait(3.0);
      G.onBossDead();
    }

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
      yield* wait(1.0);
      B.active = true; B.invuln = false;
      release();
    }

    // ---------------------------------------------------------------- attack selection
    function refillBag() {
      const src = B.bags[B.phase];
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
      yield* wait(B.gaps[B.phase] * G.diff().pace * (low ? 0.6 : 1));
      let name = G.debug.forceAttack || '';
      if (name === 'none') return; // tests: stand idle
      if (!name && low && B.finale && !B.lastStand) { B.lastStand = true; name = B.finale; }
      if (!name) name = nextAttack();
      if (!B.ATTACKS[name]) name = B.bags[B.phase][0];
      B.attackName = name;
      B.body.ctrl = true;
      yield* B.ATTACKS[name]();
      B.attackName = '';
      release();
    }

    B.update = function (dt) {
      B.t += dt;
      const b = B.body, P = G.player;
      b.flash = Math.max(0, b.flash - dt * 6);
      b.kx *= Math.exp(-13 * dt);
      if (B.script) {
        if (B.script.next(dt).done) B.script = null;
      }
      if (!B.script && B.active && !B.dead && !B.dying && G.state === 'fight' && !P.dead) B.script = think();
      if (!b.ctrl && !B.dead && !B.dying && !B.staggered) B.idle(dt);
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
