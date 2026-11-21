// Solfall - main loop, game states and rendering order.
'use strict';
(function () {
  const STEP = 1 / 120; // fixed simulation step
  const F = G.fx;
  let canvas, ctx, stage, k = 1, last = 0;

  G.state = 'title';   // title | fight | dead | won
  G.paused = false;
  G.t = 0;             // simulation clock
  G.time = 0;          // fight timer
  G.hitstop = 0; G.slowT = 0; G.slowScale = 1;
  G.deadT = 0; G.wonT = 0; G.endShown = false;
  G.debug = { god: false, boxes: false, forceAttack: '', freeze: false };
  G.cam = { x: 0, y: 0 }; // small view offset that follows the hero

  G.canHurt = () => G.state === 'fight' && !G.player.dead && !G.boss.dying && !G.boss.dead;
  G.playerControl = () => (G.state === 'fight' || G.state === 'won') && !G.paused && !G.ui.current;

  function resize() {
    const s = Math.min(window.innerWidth / G.W, window.innerHeight / G.H);
    stage.style.transform = 'translate(' + ((window.innerWidth - G.W * s) / 2) + 'px,' + ((window.innerHeight - G.H * s) / 2) + 'px) scale(' + s + ')';
    k = G.clamp(s * (window.devicePixelRatio || 1), 0.5, 2);
    canvas.width = Math.round(G.W * k);
    canvas.height = Math.round(G.H * k);
  }

  // ------------------------------------------------------------------ state changes
  // A run is a chain of trials. Each victory grants a boon and leads to a tougher trial;
  // falling ends the run.
  // Title -> choose a hero -> choose one of three relics -> first trial.
  G.chooseHero = function () { G.ui.showHeroes(); };
  G.pickHero = function (i) {
    const h = G.HEROES[i];
    if (!h) return;
    G.settings.hero = h.id; G.saveSettings();
    G.run.reset();
    G.ui.showRelics(G.run.rollRelics());
  };
  G.pickRelic = function (i) {
    const r = G.run.relicOffer[i];
    if (!r) return;
    G.run.relic = r.id;
    G.startFight();
  };
  // After a fall: same hero, a fresh choice of relics.
  G.newRun = function () {
    G.toTitle();
    G.ui.showHeroes();
    G.pickHero(Math.max(0, G.HEROES.findIndex((h) => h.id === G.settings.hero)));
  };
  // Straight into a fight with no relic (used by tests and the console).
  G.startRun = function () { G.run.reset(); G.startFight(); };
  G.nextTrial = function () { G.run.trial++; G.startFight(); };
  G.takeBoon = function (i) { G.run.take(i); G.nextTrial(); };

  G.startFight = function () {
    G.seed((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    G.arena.reset(); G.hazards.clear(); F.reset();
    G.player.reset(); G.boss.reset(); G.boss.intro();
    G.state = 'fight'; G.paused = false;
    G.time = 0; G.hitstop = 0; G.slowT = 0; G.deadT = 0; G.wonT = 0; G.endShown = false;
    G.ui.close(); G.ui.resetHud(); G.ui.buildHp(G.player.maxHp); G.ui.buildRun(); G.ui.bossIntro(); G.ui.hud(true); G.ui.keysHint();
    G.ui.fade(); G.ui.mood('fight');
    G.audio.init(); G.audio.startMusic(); G.audio.setIntensity(1, true); G.audio.duck(1);
    G.input.endStep();
  };

  G.toTitle = function () {
    G.run.reset();
    G.arena.reset(); G.hazards.clear(); F.reset();
    G.player.reset(); G.player.hidden = true;
    G.boss.attract();
    G.state = 'title'; G.paused = false; G.hitstop = 0; G.slowT = 0;
    G.ui.resetHud(); G.ui.hud(false); G.ui.close(); G.ui.show('title');
    G.ui.fade(); G.ui.mood('menu');
    G.audio.setIntensity(0); G.audio.duck(1);
    G.input.endStep();
  };

  G.pause = function () {
    if (G.state !== 'fight' || G.paused || G.player.dead || G.boss.dying) return;
    G.paused = true;
    G.ui.show('pause');
    G.audio.duck(0.3);
  };
  G.resume = function () {
    G.paused = false;
    G.ui.close();
    G.audio.duck(1);
    G.input.endStep();
  };

  G.onPlayerDeath = function () {
    G.state = 'dead'; G.deadT = 0;
    G.ui.letterbox(false); G.ui.mood('dead');
    G.audio.duck(0.35);
  };
  G.onBossDying = function () {
    G.ui.hud(false);
    G.audio.duck(0.2);
  };
  G.onBossDead = function () { G.state = 'won'; G.wonT = 0; };

  function result() {
    const P = G.player, t = G.time;
    const score = 100 - P.stats.hits * 9 - Math.max(0, t - 150) * 0.12 + Math.min(10, P.stats.perfect * 1.5);
    const grade = score >= 92 ? 'S' : score >= 76 ? 'A' : score >= 58 ? 'B' : 'C';
    const title = { S: 'Flawless light', A: 'Radiant', B: 'Steadfast', C: 'Survivor' }[grade];
    const d = G.settings.difficulty, trial = G.run.trial;
    // fastest time counts for the first trial only, where every run starts equal
    const best = G.store.load('best', {});
    const newBest = trial === 1 && (!best[d] || t < best[d].time);
    if (newBest) { best[d] = { time: Math.round(t * 10) / 10, grade }; G.store.save('best', best); }
    const depth = G.store.load('depth', {});
    const newDepth = !depth[d] || trial > depth[d];
    if (newDepth) { depth[d] = trial; G.store.save('depth', depth); }
    return { grade, title, newBest, best: best[d], trial, newDepth, offer: G.run.rollOffer() };
  }

  function onAction(a) {
    G.audio.init(); G.audio.startMusic();
    if (G.ui.current) { G.ui.onAction(a); return; }
    if (a === 'pause') G.pause();
    // no need to wait for the defeat screen: R restarts at once
    if (a === 'retry' && G.state === 'dead') G.newRun();
  }

  // ------------------------------------------------------------------ simulation
  function step(dt) {
    F.updateScreen(dt);
    if (G.hitstop > 0) { G.hitstop -= dt; return; }
    let ts = 1;
    if (G.slowT > 0) {
      G.slowT -= dt;
      ts = G.slowT < 0.15 ? G.lerp(1, G.slowScale, Math.max(0, G.slowT) / 0.15) : G.slowScale;
    }
    const sdt = dt * ts;
    G.t += sdt;
    G.arena.update(sdt);
    G.player.update(sdt);
    G.input.endStep();
    G.boss.update(sdt);
    G.hazards.update(sdt);
    G.updateShots(sdt);
    F.update(sdt);
    // the view leans a little towards the hero
    const P = G.player;
    const follow = G.state === 'title' || P.hidden ? 0 : 1;
    G.cam.x = G.damp(G.cam.x, follow * (P.x - G.W / 2) * 0.026, 3.5, dt);
    G.cam.y = G.damp(G.cam.y, follow * G.clamp((P.y - G.FLOOR) * 0.035, -10, 0), 3.5, dt);
    if (G.state === 'fight' && G.boss.active && !G.boss.dying && !G.boss.dead) G.time += sdt;
    if (G.state === 'dead') {
      G.deadT += dt;
      if (G.deadT > 1.7 && !G.endShown) { G.endShown = true; G.audio.setIntensity(0); G.ui.showDead(); }
    }
    if (G.state === 'won') {
      G.wonT += dt;
      if (G.wonT > 1.4 && !G.endShown) { G.endShown = true; G.audio.setIntensity(0); G.audio.duck(0.9); G.ui.showWin(result()); }
    }
  }
  G.step = step;
  G.render = () => render();

  // ------------------------------------------------------------------ render
  function render() {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, G.W, G.H);
    ctx.save();
    const z = 1 + F.zoom;
    ctx.translate(G.W / 2 + F.shakeX, G.H / 2 + F.shakeY);
    ctx.scale(z, z);
    ctx.translate(-G.W / 2 - G.cam.x, -G.H / 2 - G.cam.y);
    G.arena.drawBack(ctx);
    G.boss.drawGround(ctx);
    G.player.drawShadow(ctx);
    G.boss.draw(ctx);
    G.hazards.draw(ctx, 'under');
    G.arena.drawPlatforms(ctx);
    G.drawShots(ctx);
    G.player.draw(ctx);
    G.hazards.draw(ctx, 'over');
    F.draw(ctx);
    G.arena.drawFront(ctx);
    if (G.debug.boxes) G.boss.drawDebug(ctx);
    ctx.restore();
    F.drawFlash(ctx);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = G.clamp((now - last) / 1000, 0, 0.1);
    last = now;
    G.input.poll();
    if (!G.paused && !G.debug.freeze) {
      // Split the frame into equal sub-steps no longer than 1/120 s. The simulation then lands
      // exactly on each frame's time, so motion stays even on 60, 120 or 144 Hz screens
      // (a fixed step with leftover time shows as a faint judder).
      const n = Math.max(1, Math.ceil(dt / STEP - 1e-6));
      const h = dt / n;
      for (let i = 0; i < n; i++) step(h);
    }
    render();
    G.ui.update(dt);
  }

  // ------------------------------------------------------------------ tuning helpers (browser console)
  // G.debug.sim(10, { random: true }) runs ten simulated seconds with random inputs.
  G.debug.sim = function (sec, opts) {
    opts = opts || {};
    const I = G.input, acts = ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash', 'flare', 'heal'];
    const n = Math.round(sec / STEP);
    for (let i = 0; i < n; i++) {
      if (opts.random && i % 10 === 0) {
        for (const a of acts) {
          const d = Math.random() < 0.35;
          if (d && !I.down[a]) I.pressed[a] = true;
          I.down[a] = d;
        }
      }
      step(STEP);
    }
    if (opts.random) for (const a of acts) I.down[a] = false;
  };
  // Add a boon by id for testing, e.g. G.debug.give('keen'). It takes effect in the next fight.
  G.debug.give = function (id) {
    if (!G.boonDef(id)) return 'unknown boon; ids: ' + G.BOONS.map((b) => b.id).join(', ');
    G.run.boons[id] = G.boon(id) + 1; G.run.order.push(id);
    return id + ' x' + G.boon(id);
  };
  // Drop the boss to the edge of its next phase (call again to skip another).
  G.debug.nextPhase = function () {
    const B = G.boss;
    if (!B.active || B.invuln) return false;
    B.hp = B.phase === 1 ? Math.floor(B.maxHp * 2 / 3) + 1 : B.phase === 2 ? Math.floor(B.maxHp / 3) + 1 : 1;
    return B.damage(5, { kind: 'core' }, { x: B.core.x, y: B.core.y });
  };

  window.addEventListener('load', () => {
    canvas = document.getElementById('game');
    stage = document.getElementById('stage');
    ctx = canvas.getContext('2d');
    if (/[?&]boxes/.test(location.search)) G.debug.boxes = true;
    G.arena.init();
    G.ui.init();
    G.input.bindMouse(stage);
    G.input.mouseBlocked = () => !!G.ui.current || G.paused || (G.state !== 'fight' && G.state !== 'won');
    G.input.onAction = onAction;
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('pointerdown', () => { G.audio.init(); G.audio.startMusic(); });
    window.addEventListener('blur', () => G.pause());
    document.addEventListener('visibilitychange', () => { if (document.hidden) G.pause(); });
    G.toTitle();
    last = performance.now();
    requestAnimationFrame(frame);
  });
})();
