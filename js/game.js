// Solfall - main loop, game states and rendering order.
'use strict';
(function () {
  const STEP = 1 / 120; // fixed simulation step
  const F = G.fx;
  let canvas, ctx, stage, k = 1, last = 0;

  G.state = 'title';   // title | hub | fight | dead | won
  G.paused = false;
  G.t = 0;             // simulation clock
  G.time = 0;          // fight timer
  G.hitstop = 0; G.slowT = 0; G.slowScale = 1;
  G.deadT = 0; G.wonT = 0; G.endShown = false;
  // boss: fight this one whatever the run says. omen: force these omens ('storm', 'storm,hunted'). meta: earn Sunshards even in tests.
  G.debug = { god: false, boxes: false, forceAttack: '', freeze: false, boss: '', omen: '', meta: false, variant: '', event: '' }; // variant: see K.chance in bosskit.js
  G.cam = { x: 0, y: 0 }; // small view offset that follows the hero

  G.canHurt = () => G.state === 'fight' && !G.player.dead && !G.boss.dying && !G.boss.dead;
  // (v2.9b) the title is set in the camp: the hero by the fire, the menu over the left of it
  G.inCamp = () => G.state === 'hub' || G.state === 'title';
  G.playerControl = () => (G.state === 'fight' || G.state === 'won' || G.state === 'hub' || G.state === 'rest') && !G.paused && !G.ui.current;

  function resize() {
    const s = Math.min(window.innerWidth / G.W, window.innerHeight / G.H);
    stage.style.transform = 'translate(' + ((window.innerWidth - G.W * s) / 2) + 'px,' + ((window.innerHeight - G.H * s) / 2) + 'px) scale(' + s + ')';
    k = G.clamp(s * (window.devicePixelRatio || 1), 0.5, 2);
    canvas.width = Math.round(G.W * k);
    canvas.height = Math.round(G.H * k);
    // Backdrops are painted once and kept. Paint them at the size they will be shown (up to 1.5
    // times, in quarter steps, to keep memory in hand) so they are not stretched and soft.
    const q = G.clamp(Math.ceil(k * 4 - 0.01) / 4, 1, 1.5);
    if (q !== G.bgK) { G.bgK = q; if (G.arena.rescale) G.arena.rescale(); if (G.hub) G.hub.layers = null; }
  }

  // ------------------------------------------------------------------ state changes
  // A run is a chain of trials. Each victory grants a boon and leads to a tougher trial;
  // falling ends the run.
  // Title -> choose a hero -> choose one of three relics -> first trial.
  G.chooseHero = function () { G.ui.showHeroes(); };
  G.pickHero = function (i) {
    const h = G.HEROES[i];
    if (!h) return;
    G.settings.hero = h.id; G.saveSettings(); G.fitDiff();
    G.run.reset();
    G.ui.showRelics(G.run.rollRelics());
  };
  G.pickRelic = function (i) {
    const r = G.run.relicOffer[i];
    if (!r) return;
    G.run.relic = r.id;
    G.settings.lastRelic = r.id; G.saveSettings(); // (v2.7a: for Quick start on the title)
    G.startFight();
  };
  // After a fall (or Restart run): same hero and the same relic, straight into a new first trial.
  // The relic is only given up by going back to the camp, where the reliquary offers new ones.
  G.newRun = function () {
    if (G.practice) { G.startPractice(G.practice.phase, G.practice.boss); return; } // R in a practice fight tries it again
    const relic = G.run.relic;
    if (!relic || !G.relicDef(relic)) { G.toHub('gate'); G.openGate(); return; }
    G.run.reset(); G.run.relic = relic;
    G.startFight();
  };
  // (v2.7a) A run is saved as it goes, so closing the page does not lose it: on the road (every half
  // second, with the road's own state), at the start of each fight, and once a fight is won. Continue on
  // the title picks it up: back on the road where you stood, or the fight you were in, from its start.
  // A fall, or walking home from the road, ends the run and its save. Practice, tests and the Champion's
  // duel (the road saved before it stands) are never saved.
  const SAVE_V = 1;
  G.saveRun = function (at) {
    const R = G.run;
    if (G.practice || G.debug.freeze || G.debug.boss || !R.relic || R.champFight) return;
    if (at === 'rest') R.ult = G.player.ult || 0; // (the Dawnbreak meter, as it stands on the road)
    G.store.save('run', { v: SAVE_V, at, hero: R.hero, diff: G.settings.difficulty, ver: G.VERSION, when: Date.now(),
      run: R.snapshot(), rest: at === 'rest' ? G.rest.snap() : null });
  };
  G.clearRun = function () { try { localStorage.removeItem('solfall.run'); } catch (e) { /* private mode */ } };
  G.savedRun = function () { const s = G.store.load('run', null); return s && s.v === SAVE_V && s.run && G.relicDef(s.run.relic) ? s : null; };
  G.continueRun = function () {
    const s = G.savedRun();
    if (!s) return false;
    G.settings.hero = s.hero; G.settings.difficulty = s.diff; G.saveSettings();
    G.practice = null;
    G.run.reset(); G.run.restore(s.run);
    if (s.at === 'fight') { G.startFight(); return true; }
    // ('won': the fight was won and the result screen was up: onto a fresh road. 'rest': back on the road
    // as it was; toRest rolls a new meeting and takes the meter from the hero, so the run is put back)
    G.toRest();
    if (s.at === 'rest') { G.run.restore(s.run); G.rest.restore(s.rest); }
    G.run.ult = s.run.ult || 0; G.player.ult = G.run.ult;
    G.ui.buildHp(G.player.maxHp); G.ui.buildRun();
    return true;
  };
  // (v2.8a) The daily trial: one run a day, the same for everyone on the same day (run.js R.seeded): the
  // day's hero and relic (from the relics every save starts with), and every pick of the run drawn from the day.
  // Your difficulty is your own. The best of the day is kept: trials won, and whether the run was won.
  G.dailyPlan = function () {
    const R = G.run, key = R.dayKey(), hero = G.HEROES[R.hashSeed(key + '|hero') % G.HEROES.length];
    const pool = G.RELICS.filter((r) => !r.boss && !r.hero && r.id !== 'crown').sort((a, b) => (a.id < b.id ? -1 : 1));
    return { key, hero, relic: pool[R.hashSeed(key + '|relic') % pool.length] };
  };
  G.startDaily = function () {
    const plan = G.dailyPlan();
    G.settings.hero = plan.hero.id; G.saveSettings();
    G.practice = null;
    G.run.reset(); G.run.daily = plan.key; G.run.relic = plan.relic.id;
    G.startFight();
  };
  G.dailyRecord = function () {
    const R = G.run, all = G.store.load('daily', {}), was = all[R.daily] || { trials: 0, won: false };
    const now = { trials: Math.max(was.trials, R.beaten.length), won: was.won || R.runWon(), hero: R.hero, diff: G.settings.difficulty };
    all[R.daily] = now;
    G.store.save('daily', all);
  };

  // (v2.7a) Quick start on the title: the last hero and relic, straight into a first trial.
  G.quickStart = function () {
    const r = G.relicDef(G.settings.lastRelic);
    if (!r || !G.meta.unlocked(r)) { G.toHub('fire'); return; }
    G.practice = null;
    G.run.reset(); G.run.relic = r.id;
    G.startFight();
  };

  // Practice: one boss, from the phase you choose. No relic, no omens, no rewards, nothing lost.
  G.practice = null;
  G.startPractice = function (phase, boss) {
    const pick = boss || (G.BOSS_IDS.includes(G.settings.firstFoe) ? G.settings.firstFoe : G.pick(G.BOSS_IDS));
    G.practice = { boss: pick, phase, left: phase - 1 };
    G.run.reset();
    G.startFight();
  };
  // The gate in the camp: choose a relic, then the first trial.
  // The relics on offer are the ones standing on the reliquary's plinths; this is the same choice as a menu,
  // for the quick retry after a fall and for anyone who walks up to the gate without one.
  G.openGate = function () {
    G.practice = null;
    if (!G.run.relicOffer.length) G.run.rollRelics();
    G.ui.showRelics(G.run.relicOffer);
  };

  // The Vigil: the camp between runs, where the hero walks about (see hub.js).
  // where: 'fire' (coming from the title) or 'gate' (coming back from a run).
  G.toHub = function (where) {
    if (where === 'gate') { G.clearRun(); if (!G.practice && G.run.motes) G.motes.convert(); } // (back from a run: it is over, and its Motes are Sunshards now)
    G.rest.leave();
    G.practice = null;
    G.run.reset();
    G.setBoss('dummy');
    G.arena.reset(); G.hazards.clear(); F.reset();
    G.hub.checkDawn(); // (v3.0a: morning, once Sol has fallen)
    G.hub.offer(); // the relics on the reliquary's plinths for this visit
    G.player.reset(); G.flow.reset(); G.boss.reset(); G.moments.reset(); G.sets.reset();
    G.player.x = G.hub.spawn(where); G.player.facing = where === 'gate' ? -1 : 1;
    G.cam.x = G.hub.camTarget(); G.cam.y = 0; // the view starts on the hero, it does not slide there
    G.player.ember = G.PLAYER.SEG * G.player.segs; // the special can be tried freely here
    G.state = 'hub'; G.paused = false; G.hitstop = 0; G.slowT = 0;
    G.ui.resetHud(); G.ui.close(); G.ui.buildHp(G.player.maxHp); G.ui.buildRun(); G.ui.hud(true, true);
    if (where === 'fire') { if (G.guide.due()) G.guide.open(true); else G.ui.campHint(); } else if (where === 'gate') G.ui.shrineHint(); // (v2.9n: the Guide, the first time)
    G.ui.fade(); G.ui.mood('fight');
    G.audio.init(); G.audio.startMusic(); G.audio.setIntensity(0); G.audio.duck(1);
    G.input.endStep();
  };
  // Straight into a fight with no relic (used by tests and the console).
  G.startRun = function () { G.run.reset(); G.startFight(); };
  // After a victory: out onto the road between trials, where the boon is chosen (rest.js).
  // (back from the Champion's doorway, champion.js: the road is as it was left, and a lost duel costs
  // nothing, not even the Dawnbreak meter spent in it)
  G.toRest = function () {
    G.practice = null;
    const back = G.run.champFight, lost = G.champLost;
    G.run.champFight = false; G.champLost = false;
    if (back && lost) G.player.ult = G.run.champUlt;
    G.run.ult = G.player.ult || 0; // the Dawnbreak meter carries over
    G.setBoss('rest');
    G.arena.reset(); G.hazards.clear(); F.reset();
    G.player.reset(); G.flow.reset(); G.boss.reset(); G.moments.reset(); G.sets.reset();
    if (back) G.rest.back(lost); else G.rest.enter();
    G.player.x = back ? G.rest.doorX : G.rest.spawn(); G.player.facing = back ? -1 : 1;
    G.cam.x = G.rest.camTarget(); G.cam.y = 0;
    G.state = 'rest'; G.paused = false; G.hitstop = 0; G.slowT = 0;
    G.ui.resetHud(); G.ui.close(); G.ui.buildHp(G.player.maxHp); G.ui.buildRun(); G.ui.hud(true, true, true);
    G.ui.fade(); G.ui.mood('fight');
    G.audio.init(); G.audio.startMusic(); G.audio.setIntensity(0); G.audio.duck(1);
    G.input.endStep();
  };
  // Through a portal on the road between (rest.js): the next trial against the boss chosen, or a
  // corrupted portal's optional fight, which does not count as a trial. The Dawnbreak meter carries over.
  G.enterPortal = function (id, corrupt) {
    const R = G.run;
    R.ult = G.player.ult || 0;
    R.current = id; R.corrupt = !!corrupt;
    if (!corrupt) R.trial++;
    G.startFight();
  };
  // Through the Champion's doorway (rest.js): his duel. Not a trial; win or lose, back to this road.
  G.enterChampion = function () {
    const R = G.run;
    R.ult = G.player.ult || 0; R.champUlt = R.ult;
    R.champFight = true; R.champMet = true;
    G.startFight();
  };
  // (v2.9a) once a run, felled by Sol: up again, with all you carry, at the start of the form she felled you in
  G.riseAgain = function () {
    G.solFrom = G.solRise; G.solRise = null;
    G.startFight();
    G.solFrom = null;
    G.ui.callout(G.T('RISE AGAIN'));
  };
  G.nextTrial = function () { if (G.run.solOpen()) { G.enterPortal('sol', false); return; } const left = G.run.left(); G.enterPortal(G.pick(left.length ? left : G.BOSS_IDS), false); };
  G.rerollBoons = function () { if (G.run.reroll()) { G.audio.play('uiSelect'); G.ui.fillBoons(); } else G.audio.play('empty'); };
  G.takeBoon = function (i) { G.run.take(i); G.nextTrial(); };

  G.startFight = function () {
    G.rest.leave();
    // (v2.8a) a daily trial's fights are seeded by the day, the trial and the boss
    G.seed(G.run.daily && !G.practice ? G.run.hashSeed(G.run.daily + '|fight|' + G.run.trial + '|' + (G.run.current || '') + '|' + (G.run.corrupt ? 'c' : '')) : (Date.now() ^ (Math.random() * 1e9)) >>> 0);
    G.setBoss(G.debug.boss || (G.practice ? G.practice.boss : G.run.champFight ? 'champion' : G.run.foe()));
    if (G.corrupt.on()) G.arena.setTheme(G.corrupt.theme(G.boss.theme || G.boss.id)); // corrupt.js
    G.cam.x = 0; G.cam.y = 0; // the camp scrolls; an arena does not
    G.run.seeded('omens', () => G.run.rollOmens()); // before the boss works out its health (from the day, in a daily trial)
    G.arena.reset(); G.hazards.clear(); F.reset();
    G.player.reset(); G.flow.reset(); G.boss.reset(); G.moments.reset(); G.sets.reset(); G.relics.reset(); G.feats.reset(); G.hexes.reset(); G.motes.reset(); G.boss.intro();
    G.state = 'fight'; G.paused = false;
    G.time = 0; G.hitstop = 0; G.slowT = 0; G.deadT = 0; G.wonT = 0; G.endShown = false;
    G.ui.close(); G.ui.resetHud(); G.ui.buildHp(G.player.maxHp); G.ui.buildRun(); G.ui.bossIntro(); G.ui.hud(true); G.ui.keysHint();
    G.ui.fade(); G.ui.mood('fight');
    G.audio.init(); G.audio.startMusic(); G.audio.setIntensity(1, true); G.audio.duck(1);
    G.input.endStep();
    G.run.fight = { dealt: {}, taken: {} }; // (the recap's count for this fight)
    G.saveRun('fight');
  };

  // (v2.9b) The title is the camp at rest: the hero by the fire, the menu over the left. Play does not cut
  // to black: the menu fades, the view eases onto the hero and the camp is yours (G.enterVigil).
  G.toTitle = function () {
    G.rest.leave();
    G.practice = null;
    G.run.reset();
    G.setBoss('dummy');
    G.arena.reset(); G.hazards.clear(); F.reset();
    G.hub.offer();
    G.player.reset(); G.flow.reset(); G.boss.reset(); G.moments.reset(); G.sets.reset();
    G.player.x = G.hub.spawn('title'); G.player.facing = -1; // (the hero warms at the fire)
    G.cam.x = G.hub.titleCam(); G.cam.y = 0;
    G.player.ember = G.PLAYER.SEG * G.player.segs;
    G.state = 'title'; G.paused = false; G.hitstop = 0; G.slowT = 0;
    G.ui.resetHud(); G.ui.hud(false); G.ui.close(); G.ui.show('title');
    G.ui.fade(); G.ui.mood('menu');
    G.audio.setIntensity(0); G.audio.duck(1);
    G.input.endStep();
  };
  G.enterVigil = function () {
    if (G.state !== 'title') { G.toHub('fire'); return; }
    G.state = 'hub';
    G.ui.leaveTitle();
    G.ui.resetHud(); G.ui.buildHp(G.player.maxHp); G.ui.buildRun(); G.ui.hud(true, true);
    if (G.guide.due()) setTimeout(() => { if (G.state === 'hub' && !G.ui.current) G.guide.open(true); }, 900); // (v2.9n: once the title has faded)
    else G.ui.campHint();
    G.ui.mood('fight');
    G.audio.init(); G.audio.startMusic(); G.audio.setIntensity(0); G.audio.duck(1);
    G.input.endStep();
  };


  G.pause = function () {
    if ((G.state !== 'fight' && G.state !== 'hub' && G.state !== 'rest') || G.paused || G.ui.current || G.player.dead || (G.boss.dying && !G.boss.toppled) || G.debug.freeze) return;
    G.paused = true;
    G.rest.leave(); // the road's boon card would sit over the menu (it comes back on resume)
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
    if (G.player.lastHit && G.player.lastHit.attack) G.meta.jot(G.boss.id, G.player.lastHit.attack, 'fell'); // (v2.8a: the Boss Journal)
    // (v2.9a) felled by Sol: once a run, you rise again, at the start of the form she felled you in
    if (!G.practice && G.boss.id === 'sol' && !G.run.solRetried && !G.debug.boss) { G.run.solRetried = true; G.solRise = G.boss.phase; G.ui.letterbox(false); G.ui.mood('dead'); G.audio.duck(0.35); return; }
    // beaten by the Champion: nothing lost but pride (the road waits, see step)
    if (G.run.champFight && !G.practice) { G.champLost = true; G.lastShards = 0; G.ui.letterbox(false); G.ui.mood('dead'); G.audio.duck(0.35); return; }
    G.lastShards = G.meta.onDefeat();
    // (v2.9k) the run is over: its Motes become Sunshards, one for every five
    G.lastMotes = G.practice ? null : G.motes.convert();
    if (G.lastMotes) G.lastShards += G.lastMotes.shards;
    if (!G.practice) { if (G.run.daily) G.dailyRecord(); G.clearRun(); } // (the run is over)
    G.ui.againHint(); // (R starts again at once: v2.7a says so)
    G.ui.letterbox(false); G.ui.mood('dead');
    G.audio.duck(0.35);
  };
  // At nothing the boss goes down and stays down: E near it is the hero's finishing blow, any other
  // blow ends it plainly (finish.js).
  G.onBossToppled = function () { G.audio.duck(0.5); };
  G.onBossDying = function (fin) {
    G.ui.hud(false);
    G.audio.duck(0.2);
    // the hero's own finishing blow (finish.js); the boss's death waits for it
    if (fin && G.finish.start()) return;
    // a Dawnbreak that kills is its own finishing blow: its last strike is the ending
    if (G.player.ulting) { G.finish.played = true; return; }
    // after a Dawnbreak (or with no hero to do it): the finishing blow: one long cut through the boss, in the hero's light
    const c = G.boss.core, H = G.hero(), a = G.rand(-0.5, 0.5) + (G.player.x > c.x ? Math.PI : 0);
    F.cut(c.x, c.y, a, 1500, 11, '255,214,140', H.hot, 0.6);
    F.cut(c.x, c.y, a, 1500, 30, H.col, H.hot, 0.32);
    F.lines(c.x, c.y, 22, H.hot, { r0: 50, speed: [800, 1500] });
    F.punch(0.07); F.kick(Math.cos(a) * 14, Math.sin(a) * 14);
    G.audio.play('finish');
  };
  G.onBossDead = function () { G.state = 'won'; G.wonT = 0; };

  function result() {
    const P = G.player, t = G.time;
    const score = 100 - P.stats.hits * 9 - Math.max(0, t - 150) * 0.12 + Math.min(10, P.stats.perfect * 1.5);
    const grade = score >= 92 ? 'S' : score >= 76 ? 'A' : score >= 58 ? 'B' : 'C';
    const title = { S: G.T('Flawless light'), A: G.T('Radiant'), B: G.T('Steadfast'), C: G.T('Survivor') }[grade];
    const d = G.settings.difficulty, trial = G.run.trial;
    // fastest time counts for the first trial only, where every run starts equal
    const best = G.store.load('best', {});
    const newBest = trial === 1 && (!best[d] || t < best[d].time);
    if (newBest) { best[d] = { time: Math.round(t * 10) / 10, grade }; G.store.save('best', best); }
    const depth = G.store.load('depth', {});
    const newDepth = !depth[d] || trial > depth[d];
    if (newDepth) { depth[d] = trial; G.store.save('depth', depth); }
    // the boss is beaten (or a corrupted one cleansed); the last trial wins the run (the final
    // fight is still to come); now and then a portal already beaten turns corrupted
    const R = G.run, corrupt = R.corrupt, wasWon = R.runWon(), id = G.boss.id;
    if (!G.practice) {
      if (corrupt) { R.corrupted = R.corrupted.filter((x) => x !== id); if (!R.cleansed.includes(id)) R.cleansed.push(id); }
      else if (!R.beaten.includes(id)) R.beaten.push(id);
    }
    const done = !G.practice && R.runWon(), wonNow = done && !wasWon;
    if (!G.practice) { const s = R.sum || (R.sum = { t: 0, hits: 0, perfect: 0, shards: 0 }); s.t += t; s.hits += P.stats.hits; s.perfect += P.stats.perfect; } // (v3.0a: for the end screen)
    if (wonNow) { const wins = G.store.load('wins', {}); wins[d] = (wins[d] || 0) + 1; G.store.save('wins', wins); }
    const newCorrupt = !G.practice && !corrupt ? R.rollCorruption(id) : null;
    const meta = G.meta.onVictory(grade, id);
    const motes = G.motes.onVictory(grade, id); // (v2.9k)
    if (!G.practice && R.sum) R.sum.shards += meta.shards;
    const costume = G.practice ? null : G.mastery.gain(R.hero, 1 + (wonNow ? 3 : 0) + (id === 'sol' ? 2 : 0)); // (v2.8a: mastery, costumes.js; v2.9a: Sol gives 2 more)
    let solFirst = false, solHeroFirst = false, ascOpened = 0, ascBeat = 0;
    if (id === 'sol' && !G.practice) {
      const sw = G.store.load('sol', {}); // (v2.9a: who has beaten her: the sun crown in the Hall)
      solFirst = !Object.keys(sw).length; solHeroFirst = !sw[R.hero]; // (v3.0a: the first win brings dawn to the camp)
      sw[R.hero] = (sw[R.hero] || 0) + 1; G.store.save('sol', sw);
      // (v3.0c) Ascension: Sol beaten on Merciless opens the hero's first step; beaten on a step, the next
      if (d >= 2) {
        const A = G.store.load('asc', {}), a = A[R.hero] || { open: 0, best: 0 }, lv = G.ascLevel(d), was = a.open, wasBest = a.best;
        a.best = Math.max(a.best, lv); a.open = Math.max(a.open, Math.min(5, lv + 1));
        A[R.hero] = a; G.store.save('asc', A);
        ascOpened = a.open > was ? a.open : 0; ascBeat = lv > wasBest ? lv : 0;
      }
    }
    if (R.daily && !G.practice) G.dailyRecord(); // (v2.8a)
    const offer = corrupt ? R.rollRelicReward() : id === 'sol' ? (R.offer = []) : R.rollOffer();
    R.current = null;
    return { grade, title, newBest, best: best[d], trial, newDepth, done, wonNow, corrupt, newCorrupt, offer, meta, costume, motes, sol: id === 'sol', solFirst, solHeroFirst, ascOpened, ascBeat };
  }

  // The Champion beaten (champion.js): his trophy and gift (meta.js), and his hilt for the rest of the run.
  // Nothing about the run's trials changes.
  function champResult() {
    const P = G.player, t = G.time, R = G.run;
    const score = 100 - P.stats.hits * 9 - Math.max(0, t - 150) * 0.12 + Math.min(10, P.stats.perfect * 1.5);
    const grade = score >= 92 ? 'S' : score >= 76 ? 'A' : score >= 58 ? 'B' : 'C';
    const title = { S: G.T('Flawless light'), A: G.T('Radiant'), B: G.T('Steadfast'), C: G.T('Survivor') }[grade];
    const meta = G.meta.onVictory(grade, 'champion');
    const s = R.sum || (R.sum = { t: 0, hits: 0, perfect: 0, shards: 0 }); s.t += t; s.hits += P.stats.hits; s.perfect += P.stats.perfect; s.shards += meta.shards; R.champWon = true;
    const costume = G.mastery.gain(R.hero, 1); // (v2.8a)
    const hilt = !R.extraRelics.includes('hilt');
    if (hilt) R.extraRelics.push('hilt');
    return { grade, title, trial: R.trial, champ: true, hilt, meta, done: false, corrupt: false, costume };
  }

  // The Moves page: what each button does for the hero in play. Held open with Tab (the fight
  // waits while it is up), or opened from the pause menu.
  G.showMoves = function () {
    if ((G.state !== 'fight' && G.state !== 'hub' && G.state !== 'rest') || G.paused || G.ui.current || G.player.dead || G.debug.freeze) return;
    G.paused = true; G.movesHeld = true;
    G.ui.showMoves(false);
    G.audio.duck(0.5);
  };

  function onAction(a) {
    G.audio.init(); G.audio.startMusic();
    if (G.ui.current) { G.ui.onAction(a); return; }
    if (G.epilogue.on) { G.epilogue.skip(); return; } // (v3.0a: any button goes on to the end screen)
    if (a === 'pause') G.pause();
    if (a === 'moves') G.showMoves();
    // no need to wait for the defeat screen: R restarts at once
    if (a === 'retry' && G.state === 'dead' && !G.champLost && !G.solRise) G.newRun();
  }

  // ------------------------------------------------------------------ simulation
  function step(dt) {
    // (v3.0a) the dawn after Sol is a picture of its own: nothing else runs under it
    if (G.epilogue.on) { G.t += dt; G.epilogue.update(dt); G.input.endStep(); return; }
    F.updateScreen(dt);
    G.rdt = dt; // (the clock on the wall, for what must not slow with the fight: Eos's Still Moment)
    if (G.hitstop > 0) { G.hitstop -= dt; return; }
    let ts = 1;
    if (G.slowT > 0) {
      G.slowT -= dt;
      ts = G.slowT < 0.15 ? G.lerp(1, G.slowScale, Math.max(0, G.slowT) / 0.15) : G.slowScale;
    }
    const sdt = dt * ts;
    G.t += sdt;
    G.arena.update(sdt);
    if (G.inCamp()) G.hub.update(sdt);
    if (G.state === 'rest') { G.rest.update(sdt); if ((G.saveT = (G.saveT || 0) - dt) <= 0) { G.saveT = 0.5; G.saveRun('rest'); } }
    G.finish.update(sdt);
    G.player.update(sdt);
    G.input.endStep();
    // while a Dawnbreak plays, the boss and everything it has thrown all but stand still
    // (and a soaked boss runs slower: sets.js)
    const bdt = (G.player.ulting ? sdt * G.flow.SLOW : sdt) * G.sets.bossK() * G.relics.bossK() * G.motes.bossK(); // (the Still Hourglass: relics.js; Slowsand: motes.js)
    G.boss.update(bdt);
    G.hazards.update(bdt);
    G.corrupt.update(bdt);
    G.hexes.update(bdt); // the banes of corrupted boons
    G.omens.update(sdt);
    G.flow.update(sdt);
    // a practice fight that starts in a later phase: push the boss there as soon as it can be hit
    if (G.practice && G.practice.left > 0 && G.state === 'fight') {
      const B = G.boss;
      if (B.active && !B.invuln && !B.dying && B.phase === G.practice.phase - G.practice.left) { G.practice.left--; G.debug.nextPhase(); }
    }
    G.moments.update(sdt);
    G.sets.update(sdt);
    G.relics.update(sdt);
    G.motes.update(sdt);
    G.updateShots(sdt);
    F.update(sdt);
    // the view leans a little towards the hero
    const P = G.player;
    const follow = G.state === 'title' || P.hidden ? 0 : 1;
    if (G.state === 'hub') G.cam.x = G.damp(G.cam.x, G.hub.camTarget(), 5, dt); // the camp is wide: the view follows the hero across it
    else if (G.state === 'title') G.cam.x = G.damp(G.cam.x, G.hub.titleCam(), 3, dt);
    else if (G.state === 'rest') G.cam.x = G.damp(G.cam.x, G.rest.camTarget(), 5, dt);
    else G.cam.x = G.damp(G.cam.x, follow * (P.x - G.W / 2) * 0.026, 3.5, dt);
    G.cam.y = G.damp(G.cam.y, follow * G.clamp((P.y - G.FLOOR) * 0.035, -10, 0), 3.5, dt);
    // at close quarters the view leans in a little (2.5% at most), and a little more while the boss is down
    let lean = 0;
    if (G.state === 'fight' && G.boss.active && !G.boss.dying && !G.boss.dead && !P.dead && !P.hidden) {
      let d = 1e9;
      for (const t of G.boss.targets()) d = Math.min(d, Math.hypot(t.cx - P.x, (t.cy - (P.y - 24)) * 0.7) - (t.r || t.hw || 0));
      lean = 0.025 * G.clamp(1 - (d - 70) / 260, 0, 1) + (G.boss.staggered ? 0.012 : 0);
    }
    if (G.state === 'title') lean = 0.06; // (v2.9b) the title sits a little closer in on the fire; Play eases it back out
    F.zoomBase = G.damp(F.zoomBase, lean, lean > F.zoomBase ? 2.4 : 1.4, dt);
    if (G.state === 'fight' && G.boss.active && !G.boss.dying && !G.boss.dead) G.time += sdt;
    if (G.state === 'dead') {
      G.deadT += dt;
      if (G.champLost) { if (G.deadT > 2.4 && !G.endShown) { G.endShown = true; G.audio.setIntensity(0); G.toRest(); } }
      else if (G.solRise) { if (G.deadT > 2.6 && !G.endShown) { G.endShown = true; G.riseAgain(); } }
      else if (G.deadT > 1.7 && !G.endShown) { G.endShown = true; G.audio.setIntensity(0); G.ui.showDead(); }
    }
    if (G.state === 'won') {
      G.wonT += dt;
      if (G.wonT > 1.4 && !G.endShown) {
        G.endShown = true; G.audio.setIntensity(0); G.audio.duck(0.9);
        if (G.practice) {
          // a practice win goes straight back to the ring it started from
          const t = G.time, name = G.boss.short;
          G.toHub('ring'); G.hub.say(G.T('{0} beaten in {1}', name, G.ui.fmtTime(t)));
        } else if (G.run.champFight) G.ui.showWin(champResult());
        else if (G.boss.id === 'sol') { const res = result(); G.saveRun('won'); G.epilogue.start(res); } // (v3.0a: the dawn, then the end screen: epilogue.js)
        else { G.ui.showWin(result()); G.saveRun('won'); } // (a page closed now continues on the road)
      }
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
    if (G.epilogue.on) { G.epilogue.draw(ctx); return; }
    ctx.save();
    const v = F.view(), z = v.z; // (v.fx, v.fy: the middle of the view, moved by a cinematic push in: fx.js)
    ctx.translate(G.W / 2 + F.shakeX, G.H / 2 + F.shakeY);
    ctx.scale(z, z);
    ctx.translate(-v.fx - G.cam.x, -v.fy - G.cam.y);
    if (G.inCamp()) G.hub.drawBack(ctx); else if (G.state === 'rest') G.rest.drawBack(ctx); else G.arena.drawBack(ctx);
    G.flow.drawVeil(ctx);
    G.moments.drawGloom(ctx);
    G.sets.drawBack(ctx); // Nightfall's dark
    F.drawDecals(ctx);
    G.boss.drawGround(ctx);
    G.sets.drawGround(ctx);
    G.player.drawShadow(ctx);
    // the Warden looms behind the platforms; the duelling bosses stand among them.
    // A boss that has just been struck shivers for the length of the hit-freeze.
    if (!G.boss.kit) drawBoss();
    F.drawSmoke(ctx);
    G.hazards.draw(ctx, 'under');
    G.arena.drawPlatforms(ctx);
    if (G.inCamp()) G.hub.draw(ctx);
    if (G.state === 'rest') G.rest.draw(ctx);
    if (G.boss.kit) drawBoss();
    G.moments.draw(ctx);
    G.sets.draw(ctx);
    G.relics.draw(ctx);
    G.motes.draw(ctx);
    if (G.boss.drawOver) G.boss.drawOver(ctx); // e.g. the Veil's darkness: over the arena and the boss, under the hero
    G.drawShots(ctx);
    G.player.draw(ctx);
    G.hazards.draw(ctx, 'over');
    F.draw(ctx);
    G.finish.drawPrompt(ctx);
    if (G.inCamp()) {
      G.hub.drawFore(ctx); G.hub.drawOver(ctx);
      ctx.translate(G.cam.x, 0); // the vignette stays on the view, not on the ground
    } else if (G.state === 'rest') {
      G.rest.drawOver(ctx);
      ctx.translate(G.cam.x, 0);
    } else {
      // the floor takes a faint reflection of whatever is bright above it (see post.js)
      G.post.reflect(ctx, canvas, ((G.FLOOR - G.cam.y - v.fy) * z + G.H / 2 + F.shakeY) * k, k);
    }
    G.arena.drawFront(ctx);
    if (G.debug.boxes) G.boss.drawDebug(ctx);
    ctx.restore();
    G.post.finish(ctx, canvas, 1 / 60);
    F.drawRipples(ctx, canvas, k);    // ripples in the air bend the finished picture
    G.flow.drawSplit(ctx, canvas, k); // Horizon cuts the finished picture in two
    ctx.setTransform(k, 0, 0, k, 0, 0);
    G.flow.drawCutin(ctx);
    F.drawFlash(ctx);
  }

  function drawBoss() {
    const draw = G.corrupt.active() ? () => G.corrupt.drawBoss(ctx, (c) => G.boss.draw(c)) : () => G.boss.draw(ctx);
    if (!F.rattleA) { draw(); return; }
    ctx.save();
    ctx.translate(F.rattleX, F.rattleY);
    draw();
    ctx.restore();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = G.clamp((now - last) / 1000, 0, 0.1);
    last = now;
    G.input.poll();
    // Tab let go: the Moves page closes and the fight goes on
    if (G.movesHeld && !G.input.down.moves) { G.movesHeld = false; if (G.ui.current === 'moves') G.resume(); }
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
    const I = G.input, acts = ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash', 'flare', 'heal', 'ult'];
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
    G.input.mouseBlocked = () => !!G.ui.current || G.paused || (G.state !== 'fight' && G.state !== 'won' && G.state !== 'hub' && G.state !== 'rest');
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
