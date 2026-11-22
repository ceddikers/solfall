// Solfall - menus, the in-fight display, and result screens (all plain DOM over the canvas).
'use strict';
(function () {
  const U = G.ui = { current: null, stack: [], focus: 0, seen: {}, lockUntil: 0 };
  const $ = (id) => document.getElementById(id);
  const el = {};

  const OPTS = {
    difficulty: { values: [0, 1, 2], label: (v) => G.DIFFS[v].name },
    shake: { values: [0, 0.5, 1], label: (v) => (v === 0 ? 'Off' : v === 0.5 ? 'Half' : 'Full') },
    flash: { values: [0, 0.4, 1], label: (v) => (v === 0 ? 'Off' : v === 0.4 ? 'Reduced' : 'Full') },
    numbers: { values: [false, true], label: (v) => (v ? 'On' : 'Off') },
    hints: { values: [false, true], label: (v) => (v ? 'On' : 'Off') },
    firstFoe: { values: ['random', 'warden', 'mage', 'assassin', 'knight'], label: (v) => (G.bosses[v] ? G.bosses[v].short : 'Random') },
    music: { slider: true },
    sfx: { slider: true },
  };
  const NOTES = [
    '7 health. Warnings last longer and attacks come slower.',
    '5 health. The fight as intended.',
    '4 health. Shorter warnings, less rest, extra attacks.',
  ];
  // Shown after a defeat: these hold for every boss; each boss adds its own (B.tips).
  const TIPS = [
    'A dash passes straight through any attack. Use it late, not early.',
    'Keep one segment of Starlight in reserve for mending.',
    'Orbs, knives, skulls and spheres can be cut out of the air, and each one gives a little Starlight.',
    'Filling the stagger bar drops a boss to its knees, where every hit counts for more.',
    'Red-orange always means danger: a marked patch of ground, a line, a lane. Read it before you move.',
  ];
  const ROMAN = ['', 'I', 'II', 'III'];

  U.fmtTime = function (t) {
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  };

  // ------------------------------------------------------------------ setup
  U.init = function () {
    for (const id of ['hud', 'hp', 'ember', 'mend', 'timer', 'bfill', 'bchip', 'pfill', 'bphase', 'card', 'callout',
      'hint', 'lowhp', 'lbTop', 'lbBot', 'diffNote', 'bestLine', 'ver', 'deadLead', 'deadFill', 'deadStats',
      'pauseBoons', 'boons', 'trial', 'winOver', 'winPick', 'winCards', 'heroName', 'heroCards', 'relicCards', 'relicOver',
      'deadTip', 'winStats', 'winBest', 'gradeLetter', 'gradeTitle', 'gradeSub', 'stage',
      'practiceOver', 'keyList', 'resetItem', 'movesOver', 'movesTitle', 'movesBody', 'movesFoot', 'ult', 'ultFill', 'ultKey', 'flow', 'flowRank', 'flowFill', 'omen', 'shardCount', 'shrineLead', 'shrineList', 'shrineTrophies', 'rerollItem', 'featsLead', 'featsBody']) el[id] = $(id);
    el.segs = Array.from(document.querySelectorAll('#ember .seg'));
    el.bbar = document.querySelector('.bbar');
    el.bname = document.getElementById('bname');
    el.pbar = document.querySelector('.pbar');
    el.phases = Array.from(el.bphase.children);
    el.ver.textContent = 'v' + G.VERSION;

    document.querySelectorAll('.item').forEach((it) => {
      it.addEventListener('mouseenter', () => {
        const items = U.items();
        const i = items.indexOf(it);
        if (i >= 0 && i !== U.focus) { U.setFocus(i); G.audio.play('uiMove'); }
      });
      it.addEventListener('click', (e) => {
        const items = U.items();
        const i = items.indexOf(it);
        if (i < 0 || performance.now() < U.lockUntil) return;
        U.setFocus(i);
        if (it.dataset.opt) {
          const def = OPTS[it.dataset.opt];
          if (def.slider) {
            const r = it.querySelector('.track').getBoundingClientRect();
            const v = G.clamp((e.clientX - r.left) / r.width, 0, 1);
            setOpt(it.dataset.opt, Math.round(v * 10) / 10);
          } else change(it, 1, true);
        } else act(it.dataset.act);
      });
    });
    U.refresh();
  };

  // ------------------------------------------------------------------ menus
  U.items = function () {
    if (!U.current) return [];
    return Array.from(document.querySelectorAll('#s-' + U.current + ' .item')).filter((it) => it.style.display !== 'none');
  };
  U.setFocus = function (i) {
    const items = U.items();
    U.focus = G.clamp(i, 0, items.length - 1);
    items.forEach((it, k) => it.classList.toggle('focus', k === U.focus));
  };
  U.show = function (name, push) {
    if (push && U.current) U.stack.push(U.current);
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('on'));
    $('s-' + name).classList.add('on');
    U.current = name;
    U.refresh();
    U.setFocus(0);
  };
  U.close = function () {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('on'));
    U.current = null; U.stack.length = 0;
  };
  U.back = function () {
    const prev = U.stack.pop();
    if (prev) { U.show(prev, false); G.audio.play('uiBack'); }
    // a screen opened from the camp closes back onto it
    else if (G.state === 'hub' && U.current) { U.close(); G.audio.play('uiBack'); G.input.endStep(); }
  };

  function setOpt(opt, v) {
    G.settings[opt] = v;
    G.saveSettings();
    G.audio.applyVolume();
    U.refresh();
    G.audio.play('uiMove');
  }
  function change(it, dir, wrap) {
    const opt = it.dataset.opt, def = OPTS[opt];
    if (def.slider) {
      setOpt(opt, G.clamp(Math.round((G.settings[opt] + dir * 0.1) * 10) / 10, 0, 1));
      return;
    }
    const n = def.values.length;
    let i = def.values.indexOf(G.settings[opt]);
    if (i < 0) i = 0;
    i = wrap ? (i + 1) % n : G.clamp(i + dir, 0, n - 1);
    setOpt(opt, def.values[i]);
  }
  function act(name) {
    G.audio.play(name === 'back' ? 'uiBack' : 'uiSelect');
    if (name === 'begin') G.toHub('fire');
    else if (name === 'retry' || name === 'restart') G.newRun();
    else if (name === 'heroes' || name === 'camp') G.toHub('gate');
    else if (/^hero\d$/.test(name)) G.pickHero(Number(name.slice(4)));
    else if (/^relic\d$/.test(name)) G.pickRelic(Number(name.slice(5)));
    else if (/^boon\d$/.test(name)) G.takeBoon(Number(name.slice(4)));
    else if (name === 'endrun') G.toHub('gate');
    else if (name === 'reroll') G.rerollBoons();
    else if (name === 'shrine') U.showShrine();
    else if (/^shrine\d$/.test(name)) buy(Number(name.slice(6)));
    else if (name === 'how') U.show('how', true);
    else if (name === 'settings') U.show('settings', true);
    else if (name === 'back' && U.current === 'moves' && !U.stack.length) G.resume(); // opened with Tab: back to the fight
    else if (name === 'back') U.back();
    else if (name === 'resume') G.resume();
    else if (name === 'quit') G.toTitle();
    else if (/^practice\d$/.test(name)) G.startPractice(Number(name.slice(8)));
    else if (name === 'controls') U.showKeys();
    else if (name === 'moves') U.showMoves(true);
    else if (/^key-/.test(name)) capture(name.slice(4));
    else if (name === 'keyreset') { G.input.resetKeys(); U.fillKeys(); }
    else if (name === 'reset') resetProgress();
    else if (name === 'fullscreen') {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { });
    }
  }

  U.onAction = function (a) {
    const items = U.items();
    if (!items.length) return;
    if (performance.now() < U.lockUntil) return; // a result screen just opened: ignore mashed buttons
    const n = items.length, it = items[U.focus];
    if (a === 'up') { U.setFocus((U.focus - 1 + n) % n); G.audio.play('uiMove'); }
    else if (a === 'down') { U.setFocus((U.focus + 1) % n); G.audio.play('uiMove'); }
    else if (a === 'left' || a === 'right') {
      if (it.dataset.opt) change(it, a === 'right' ? 1 : -1, false);
      else if (it.parentElement.classList.contains('row')) {
        U.setFocus((U.focus + (a === 'right' ? 1 : -1) + n) % n); G.audio.play('uiMove');
      }
    }
    else if (a === 'confirm' || a === 'jump' || a === 'attack') {
      if (it.dataset.opt) change(it, 1, true); else act(it.dataset.act);
    }
    else if (a === 'pause') {
      if (U.stack.length) U.back();
      else if (U.current === 'pause' || U.current === 'moves') { G.audio.play('uiBack'); G.movesHeld = false; G.resume(); }
      else if (G.state === 'hub') U.back();
    }
    else if (a === 'retry') {
      if (U.current === 'dead') act('retry');
    }
  };

  // ---- before a run: choose a hero, then one of three relics
  U.showHeroes = function () {
    Array.from(el.heroCards.children).forEach((c, i) => {
      const h = G.HEROES[i];
      c.style.setProperty('--tagc', h.css);
      c.querySelector('.cname').textContent = h.name;
      c.querySelector('.ctag').textContent = h.title;
      c.querySelector('.cdesc').textContent = h.blurb;
      c.querySelector('.hhp').textContent = 'Health ' + ((G.DIFFS[G.settings.difficulty] || G.DIFFS[1]).hp + h.hp) + ' \u00b7 ' + h.specialName;
      c.querySelector('.hlines').innerHTML = h.lines.map((l) => '<li>' + l + '</li>').join('');
      G.drawHeroPortrait(c.querySelector('canvas'), h);
    });
    U.show('hero', true);
    U.setFocus(Math.max(0, G.HEROES.findIndex((h) => h.id === G.settings.hero)));
  };
  U.showRelics = function (offer) {
    const h = G.hero();
    el.relicOver.textContent = h.name + ' \u00b7 ' + h.title;
    el.relicOver.style.color = h.css;
    Array.from(el.relicCards.children).forEach((c, i) => {
      const r = offer[i];
      c.style.display = r ? '' : 'none';
      if (!r) return;
      c.querySelector('.cname').textContent = r.name;
      c.querySelector('.cdesc').textContent = r.desc;
    });
    U.show('relic', true);
  };

  // ---- the Shrine: permanent upgrades bought with Sunshards
  U.fillShrine = function () {
    const M = G.meta;
    el.shrineLead.innerHTML = 'You hold <b style="color:var(--gold)">' + M.shards + '</b> Sunshards. Every fight earns some, win or lose; what you buy here lasts.';
    Array.from(el.shrineList.children).forEach((row, i) => {
      const u = G.SHRINE[i], n = G.up(u.id), max = u.costs.length, cost = M.cost(u);
      row.querySelector('.uname').textContent = u.name;
      row.querySelector('.upips').innerHTML = u.costs.map((c, k) => '<i' + (k < n ? ' class="on"' : '') + '></i>').join('');
      row.querySelector('.udesc').textContent = n >= max ? u.text(n) : (n ? u.text(n) + '  \u2192  ' : '') + u.text(n + 1);
      row.querySelector('.ucost').textContent = cost == null ? 'Complete' : cost + ' \u25c6';
      row.classList.toggle('max', cost == null);
      row.classList.toggle('poor', cost != null && M.shards < cost);
    });
    const got = G.TROPHIES.filter((t) => M.kills[t.boss]);
    el.shrineTrophies.textContent = 'Trophy relics ' + got.length + ' of ' + G.TROPHIES.length
      + (got.length ? ': ' + got.map((t) => t.name).join(', ') + '.' : '. The first victory over each boss adds its relic to those you can be offered.');
  };
  U.showShrine = function () { U.fillShrine(); U.show('shrine', true); };
  // ---- the Tally: every feat, done or not, and what it pays
  U.showFeats = function () {
    const FE = G.feats;
    const row = (f) => '<div class="feat' + (FE.done(f.id) ? ' done' : '') + '"><b>' + f.name + '</b><span>' + f.desc + '</span><i>' + (FE.done(f.id) ? 'done' : '\u25c6 ' + f.pay) + '</i></div>';
    el.featsLead.innerHTML = '<b style="color:var(--gold)">' + FE.count() + '</b> of ' + FE.total + ' done. Each pays its Sunshards once, the first time you do it.';
    el.featsBody.innerHTML = FE.BOSSES.map((b) => '<div class="featcol"><h3>' + G.bosses[b].short + '</h3>' + FE.of(b).map(row).join('') + '</div>').join('')
      + '<div class="featcol wide"><h3>The Vigil</h3>' + FE.CAMP.map(row).join('') + '</div>';
    U.show('feats', true);
  };
  // ---- the Moves page: every button, and what it does for the hero in play
  U.showMoves = function (fromMenu) {
    const h = G.hero(), I = G.input, k = (a) => I.keys(a).map((n) => '<kbd>' + n + '</kbd>').join(' ');
    const jumps = 1 + h.air + G.boon('wind') + (G.relic('cloak') ? 1 : 0);
    const rows = [
      ['Move', k('left') + ' ' + k('right'), 'Run. ' + (h.heavy ? 'She is heavy: slower to start, slower to stop.' : h.id === 'lune' ? 'The fastest of the three.' : 'Quick on her feet.')],
      ['Jump', k('jump'), 'Jump; press again in the air (' + jumps + ' jumps in all). Hold for height. Down and jump drops through a platform.'],
      ['Attack', k('attack') + ' or left click', h.how.attack],
      ['Aim', k('up') + ' ' + k('down'), h.how.aim],
      ['Dash', k('dash'), 'A burst of speed that passes straight through any attack. Dash through one at the last moment for a perfect dodge: time slows, Starlight fills, and your next hit is a Riposte for double. ' + h.how.dash],
      ['Special', k('flare') + ' or right click', h.how.special + ' Costs one segment of Starlight.'],
      ['Mend', 'hold ' + k('heal'), 'Stand still and hold to turn one segment of Starlight into one health. Jumping or dashing cancels it.'],
      ['Dawnbreak', k('ult') + ' or middle click', h.how.ult + ' The bar fills as you deal damage; nothing can hurt you while it plays.'],
      ['Flourish', k('taunt'), 'A salute, for most of a second, in which you can do nothing else. Finish it and Flow and Dawnbreak rise a little; finish it while the boss is in the middle of an attack and it is BRAZEN, worth three times as much. Being struck ends it.'],
    ];
    el.movesOver.textContent = h.title; el.movesOver.style.color = h.css;
    el.movesTitle.textContent = h.name + '\u2019s moves';
    el.movesBody.innerHTML = rows.map((r) => '<tr><td class="mname">' + r[0] + '</td><td class="mkeys">' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('');
    el.movesFoot.textContent = fromMenu ? '' : 'Let go of Tab to carry on';
    U.show('moves', !!fromMenu);
  };

  // ---- the proving ring: practise against one boss, from any phase
  U.showPractice = function () {
    const f = G.settings.firstFoe;
    el.practiceOver.textContent = G.bosses[f] && f !== 'dummy' ? G.bosses[f].short : 'A foe at random';
    U.show('practice', true);
  };
  // ---- Settings, Controls: choose a row, then press the key it should use
  const ACTIONS = { left: 'Move left', right: 'Move right', up: 'Aim up', down: 'Aim down, drop', jump: 'Jump', attack: 'Attack', dash: 'Dash', flare: 'Special', heal: 'Mend, use', ult: 'Dawnbreak', taunt: 'Flourish' };
  U.fillKeys = function () {
    Array.from(el.keyList.children).forEach((row) => {
      const a = (row.dataset.act || '').slice(4);
      if (!ACTIONS[a]) return;
      row.querySelector('.k').textContent = ACTIONS[a];
      row.querySelector('.v').textContent = U.capturing === a ? 'press a key\u2026' : G.input.keys(a).join('  ');
      row.classList.toggle('wait', U.capturing === a);
    });
  };
  U.showKeys = function () { U.capturing = null; U.fillKeys(); U.show('keys', true); };
  function capture(action) {
    if (U.capturing) return;
    U.capturing = action; U.fillKeys();
    // the input layer hands the next key press here and does nothing else with it
    G.input.grab = (code) => {
      U.capturing = null;
      if (code !== 'Escape') G.audio.play(G.input.bind(action, code) ? 'uiSelect' : 'empty');
      U.fillKeys(); U.buildPrompts();
    };
  }
  // Erase Sunshards, upgrades, trophies and records. It has to be chosen twice.
  let armed = 0;
  function resetProgress() {
    if (performance.now() - armed < 4000) {
      armed = 0; G.meta.reset(); G.audio.play('shatter');
      U.refresh();
      el.resetItem.textContent = 'Progress erased';
    } else { armed = performance.now(); el.resetItem.textContent = 'Choose again to erase everything'; G.audio.play('empty'); }
  }
  // Key names shown in prompts follow the bindings.
  U.buildPrompts = function () { H.mend = null; if (el.ultKey) el.ultKey.innerHTML = G.input.device === 'gamepad' ? '<kbd>RT</kbd>' : '<kbd>' + G.input.label('ult') + '</kbd>'; };
  function buy(i) {
    if (G.meta.buy(i)) {
      G.audio.play('segment');
      U.fillShrine(); U.refresh();
      retrigger(el.shrineList.children[i], 'bought');
    } else G.audio.play('empty');
  }

  U.refresh = function () {
    el.shardCount.textContent = '\u25c6 ' + G.meta.shards;
    document.querySelectorAll('.item.opt').forEach((it) => {
      const opt = it.dataset.opt, def = OPTS[opt], v = G.settings[opt];
      if (def.slider) {
        it.querySelector('.track i').style.width = Math.round(v * 100) + '%';
        it.querySelector('.v').textContent = Math.round(v * 100) + '%';
      } else it.querySelector('.v').textContent = def.label(v);
    });
    el.diffNote.textContent = ''; // difficulty is now chosen at the brazier in the camp
    const best = G.store.load('best', {})[G.settings.difficulty];
    const depth = G.store.load('depth', {})[G.settings.difficulty];
    el.bestLine.textContent = depth
      ? G.diff().name + ': deepest trial ' + G.roman(depth) + (best ? ' \u00b7 fastest first trial ' + U.fmtTime(best.time) + ' (' + best.grade + ')' : '')
      : 'No victory on ' + G.diff().name + ' yet';
    const held = G.run.held(), relic = G.relicDef(G.run.relic);
    el.resetItem.textContent = 'Reset progress';
    const omens = G.run.omens.map((id) => '<p><b>Omen: ' + G.omenDef(id).name + '</b> ' + G.omenDef(id).desc + '</p>').join('');
    el.pauseBoons.innerHTML = (held.length || relic || omens)
      ? '<h3>' + G.hero().name + '\u2019s run</h3>' + omens
        + (relic ? '<p><b>' + relic.name + '</b> ' + relic.desc + '</p>' : '')
        + held.map((h) => '<p><b>' + h.def.name + (h.n > 1 ? ' \u00d7' + h.n : '') + '</b> ' + h.def.desc + '</p>').join('')
      : '';
  };

  // ------------------------------------------------------------------ in-fight display
  const H = { hp: -1, max: -1, ember: -1, full: -1, fill: -1, chip: 1, chipShown: -1, poise: -1, timer: '', phase: 0, low: null, mend: null, broken: null, introK: 1, introDelay: 0, hintT: 0, hitT: 0, lastHp: 0 };

  // camp: only the hero's name, Starlight and Dawnbreak, with no boss, timer or Flow.
  U.hud = function (on, camp) { el.hud.classList.toggle('off', !on); el.hud.classList.toggle('camp', !!camp); };

  function retrigger(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  U.buildHp = function (n) {
    el.hp.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'pip';
      el.hp.appendChild(d);
    }
    H.hp = n; H.max = n;
  };

  // Trial label, boon list and Starlight segments for the fight that is starting.
  U.buildRun = function () {
    const R = G.run;
    el.trial.textContent = G.practice ? 'Practice' : R.trial > 1 ? 'Trial ' + G.roman(R.trial) : '';
    el.omen.innerHTML = R.omens.map((id) => '<b>Omen \u00b7 ' + G.omenDef(id).name + '</b>' + G.omenDef(id).desc).join('');
    U.buildPrompts();
    H.ult = -1; H.ready = null; H.frank = -1; H.ffill = -1;
    const hero = G.hero(), relic = G.relicDef(R.relic);
    el.heroName.textContent = hero.name.toUpperCase();
    // the health pips and Starlight take the hero's own colour
    el.stage.style.setProperty('--star', hero.css);
    el.boons.innerHTML = (relic ? '<span class="t-relic">' + relic.name + '</span>' : '')
      + R.held().map((h) => '<span class="t-' + h.def.tag.toLowerCase() + '">' + h.def.name + (h.n > 1 ? ' \u00d7' + h.n : '') + '</span>').join('');
    const label = el.ember.querySelector('.elabel');
    el.ember.querySelectorAll('.seg').forEach((s) => s.remove());
    for (let i = 0; i < G.player.segs; i++) {
      const s = document.createElement('div');
      s.className = 'seg'; s.appendChild(document.createElement('i'));
      el.ember.insertBefore(s, label);
    }
    el.segs = Array.from(el.ember.querySelectorAll('.seg'));
    H.ember = -1; H.full = -1;
  };

  U.bossIntro = function () {
    H.introK = 0; H.introDelay = 1.3; H.chip = 0; H.fill = -1; H.phase = 0; H.lastHp = G.boss.maxHp;
    el.bname.textContent = G.boss.name + ' ';
    el.bfill.style.width = '0%'; el.bchip.style.width = '0%';
  };

  U.card = function (num, title, sub) {
    el.card.querySelector('.num').textContent = num;
    el.card.querySelector('.title').textContent = title;
    el.card.querySelector('.sub').textContent = sub;
    retrigger(el.card, 'show');
  };
  U.callout = function (big, small) {
    el.callout.querySelector('.big').textContent = big;
    el.callout.querySelector('.small').textContent = small || '';
    retrigger(el.callout, 'show');
  };
  // Each mechanic explains itself the first two times it appears.
  U.hint = function (key, text) {
    if (!G.settings.hints) return;
    U.seen[key] = (U.seen[key] || 0) + 1;
    if (U.seen[key] > 2) return;
    el.hint.textContent = text;
    el.hint.classList.remove('calm');
    el.hint.classList.add('show');
    H.hintT = 3.6;
  };
  // A controls reminder over the boss's entrance, for the first two fights of a session.
  // A welcome over the camp, the first time you arrive in a session.
  U.campHint = function () {
    if (!G.settings.hints || U.campSeen) return;
    U.campSeen = true;
    el.hint.innerHTML = 'Welcome to the Vigil. Try your moves on the <b>sparring post</b>, then walk right: take a relic at <b>the reliquary</b> and step through <b>the gate</b>.';
    el.hint.classList.add('show', 'calm');
    H.hintT = 9;
  };
  U.keysHint = function () {
    U.fights = (U.fights || 0) + 1;
    if (!G.settings.hints || U.fights > 2) return;
    el.hint.innerHTML = G.input.device === 'gamepad'
      ? 'Stick move &middot; <b>A</b> jump &middot; <b>X</b> attack &middot; <b>B</b> dash &middot; <b>Y</b> special &middot; hold <b>LB</b> mend &middot; <b>RT</b> Dawnbreak'
      : (() => { const k = (a) => '<kbd>' + G.input.label(a) + '</kbd>'; return k('left') + k('right') + ' move &middot; ' + k('jump') + ' jump &middot; ' + k('attack') + ' or click attack &middot; ' + k('dash') + ' dash &middot; ' + k('flare') + ' or right click special &middot; hold ' + k('heal') + ' mend &middot; ' + k('ult') + ' Dawnbreak'; })();
    el.hint.classList.add('show', 'calm');
    H.hintT = 7;
  };
  // Quick fade up from black whenever the scene changes.
  U.fade = function () { retrigger(document.getElementById('fade'), 'go'); };
  // 'menu' | 'fight' | 'dead': sets the cursor and drains the colour on defeat.
  U.mood = function (m) {
    el.stage.classList.toggle('fighting', m === 'fight');
    el.stage.classList.toggle('fallen', m === 'dead');
  };
  U.letterbox = function (on) {
    el.lbTop.classList.toggle('on', on); el.lbBot.classList.toggle('on', on);
  };

  U.resetHud = function () {
    el.card.classList.remove('show'); el.callout.classList.remove('show'); el.hint.classList.remove('show');
    U.letterbox(false);
    el.lowhp.classList.remove('on'); H.low = null;
    H.ember = -1; H.full = -1; H.poise = -1; H.timer = ''; H.mend = null; H.broken = null; H.hintT = 0;
  };

  U.update = function (dt) {
    const P = G.player, B = G.boss;
    // the portraits on the hero screen are alive
    if (U.current === 'hero') {
      Array.from(el.heroCards.children).forEach((c, i) => G.drawHeroPortrait(c.querySelector('canvas'), G.HEROES[i]));
    }
    if (H.hintT > 0) { H.hintT -= dt; if (H.hintT <= 0) el.hint.classList.remove('show'); }
    if (el.hud.classList.contains('off')) return;

    // health
    if (P.hp !== H.hp) {
      const pips = el.hp.children;
      for (let i = 0; i < pips.length; i++) {
        const on = i < P.hp, was = i < H.hp;
        pips[i].classList.toggle('off', !on);
        if (was && !on) retrigger(pips[i], 'break');
        if (!was && on) retrigger(pips[i], 'gain');
      }
      H.hp = P.hp;
    }
    const low = P.hp === 1 && !P.dead && G.state === 'fight';
    if (low !== H.low) { H.low = low; el.lowhp.classList.toggle('on', low); }

    // Starlight
    const em = Math.round(P.ember);
    if (em !== H.ember) {
      H.ember = em;
      const full = Math.floor(em / G.PLAYER.SEG);
      for (let i = 0; i < el.segs.length; i++) {
        const k = G.clamp((em - i * G.PLAYER.SEG) / G.PLAYER.SEG, 0, 1);
        el.segs[i].firstElementChild.style.width = (k * 100).toFixed(0) + '%';
        el.segs[i].classList.toggle('full', k >= 1);
        if (i < full && i >= H.full && H.full >= 0) retrigger(el.segs[i], 'pop');
      }
      H.full = full;
    }
    if (P.emberFlash < 0) { P.emberFlash = 0; retrigger(el.ember, 'deny'); }
    // prompt for what a full segment can buy
    const ready = !P.dead && P.ember >= G.PLAYER.SEG;
    const mend = !ready ? '' : (P.hp < P.maxHp ? 'both' : 'lance') + G.input.device;
    if (mend !== H.mend) {
      H.mend = mend;
      el.mend.classList.toggle('on', ready);
      if (ready) {
        const pad = G.input.device === 'gamepad';
        el.mend.innerHTML = (pad ? '<kbd>Y</kbd>' : '<kbd>' + G.input.label('flare') + '</kbd> or right click') + ' ' + G.hero().verb
          + (P.hp < P.maxHp ? ' &middot; hold ' + (pad ? '<kbd>LB</kbd>' : '<kbd>E</kbd>') + ' to mend' : '');
      }
    }

    // Dawnbreak and Flow
    const ult = Math.round(P.ult || 0);
    if (ult !== H.ult) { H.ult = ult; el.ultFill.style.width = ult + '%'; }
    const rdy = ult >= 100 && !P.dead;
    if (rdy !== H.ready) { H.ready = rdy; el.ult.classList.toggle('ready', rdy); }
    const FL = G.flow;
    if (FL.rank !== H.frank) {
      if (FL.rank > H.frank && H.frank >= 0) retrigger(el.flowRank, 'pop');
      H.frank = FL.rank;
      el.flowRank.textContent = FL.RANKS[FL.rank].name;
      el.flow.className = (FL.rank ? 'on ' : '') + 'r' + FL.rank;
    }
    const ff = Math.round(FL.frac() * 100);
    if (ff !== H.ffill) { H.ffill = ff; el.flowFill.style.width = ff + '%'; }

    // boss bar
    if (H.introDelay > 0) H.introDelay -= dt;
    else if (H.introK < 1) H.introK = Math.min(1, H.introK + dt / 1.3);
    const pct = B.hp / B.maxHp * G.ease.outCubic(H.introK);
    if (B.hp < H.lastHp) { H.hitT = 0.09; el.bbar.classList.add('hit'); }
    H.lastHp = B.hp;
    if (H.hitT > 0) { H.hitT -= dt; if (H.hitT <= 0) el.bbar.classList.remove('hit'); }
    const f = Math.round(pct * 1000) / 10;
    if (f !== H.fill) { H.fill = f; el.bfill.style.width = f + '%'; }
    H.chip = H.chip > pct ? Math.max(pct, H.chip - dt * (0.08 + (H.chip - pct) * 1.4)) : pct;
    const cs = Math.round(H.chip * 1000) / 10;
    if (cs !== H.chipShown) { H.chipShown = cs; el.bchip.style.width = cs + '%'; }
    if (B.phase !== H.phase) {
      H.phase = B.phase;
      const cols = B.hudCols[B.phase];
      el.stage.style.setProperty('--bcol1', cols[0]);
      el.stage.style.setProperty('--bcol2', cols[1]);
      el.phases.forEach((b, i) => {
        b.classList.toggle('on', i + 1 === B.phase);
        b.classList.toggle('done', i + 1 < B.phase);
      });
    }
    const po = Math.round(G.clamp(B.poise / B.poiseMax, 0, 1) * 100);
    if (po !== H.poise) { H.poise = po; el.pfill.style.width = po + '%'; }
    if (B.staggered !== H.broken) { H.broken = B.staggered; el.pbar.classList.toggle('broken', B.staggered); }

    const ts = U.fmtTime(G.time);
    if (ts !== H.timer) { H.timer = ts; el.timer.textContent = ts; }
  };

  // ------------------------------------------------------------------ results
  function statsHtml(rows) {
    return rows.map((r) => '<div><span class="n">' + r[0] + '</span><span class="l">' + r[1] + '</span></div>').join('');
  }

  // What landed the last blow, in words: the boss's attack by name, or the omen that did it.
  function felledBy(P, B) {
    const h = P.lastHit || {}, omen = { zone: 'storm', meteor: 'embers', orb: 'hunted' }[h.kind];
    if (h.attack) {
      const name = h.attack === 'reckoning' ? (B.reckonName || 'Reckoning').toLowerCase() : h.attack.replace(/\d+$/, '').replace(/([A-Z])/g, ' $1').toLowerCase();
      return 'The last blow was its ' + name + '.';
    }
    if (omen && G.omen(omen)) return 'The last blow came from the omen, ' + G.omenDef(omen).name + '.';
    return '';
  }

  U.showDead = function () {
    const P = G.player, B = G.boss;
    const pct = Math.max(1, Math.ceil(B.hp / B.maxHp * 100));
    el.deadLead.textContent = (G.practice ? 'Practice. ' : 'You fell in trial ' + G.roman(G.run.trial) + '. ') + felledBy(P, B) + ' ' + B.short + ' endured with ' + pct + '% of its strength, in phase ' + ROMAN[B.phase] + '.';
    el.deadFill.style.transition = 'none';
    el.deadFill.style.width = '100%';
    void el.deadFill.offsetWidth;
    el.deadFill.style.transition = '';
    el.deadFill.style.width = pct + '%';
    el.deadStats.innerHTML = statsHtml([
      [U.fmtTime(G.time), 'Time'],
      [P.stats.dmg, 'Damage dealt'],
      [P.stats.perfect, 'Perfect dodges'],
      ['+' + (G.lastShards || 0), 'Sunshards'],
    ]);
    el.deadStats.lastElementChild.firstElementChild.classList.add('gold');
    el.deadTip.textContent = G.pick(TIPS.concat(B.tips || [], B.tips || []));
    document.querySelector('#s-dead [data-act=retry]').innerHTML = (G.practice ? 'Try again' : 'New run') + ' <kbd>R</kbd>';
    U.hud(false);
    U.lockUntil = performance.now() + 500;
    U.show('dead');
  };

  U.showWin = function (res) {
    const P = G.player;
    el.gradeLetter.textContent = res.grade;
    el.gradeTitle.textContent = res.title;
    el.gradeSub.textContent = G.diff().name + ' difficulty';
    el.winStats.innerHTML = statsHtml([
      [U.fmtTime(G.time), 'Time'],
      [P.stats.hits, 'Hits taken'],
      [P.stats.perfect, 'Perfect dodges'],
      ['+' + res.meta.shards, 'Sunshards'],
    ]);
    el.winStats.lastElementChild.firstElementChild.classList.add('gold');
    el.winOver.textContent = 'Victory \u00b7 trial ' + G.roman(res.trial);
    // feats done in this fight are always named, whatever else there is to say
    const feats = res.meta.lines.filter((l) => l.indexOf('Feat: ') === 0).join(' · ');
    el.winBest.textContent = res.meta.relic ? 'Trophy won: ' + res.meta.relic.name + ' joins the relics you can be offered.' + (feats ? ' ' + feats : '')
      : res.meta.record ? 'Your fastest win against ' + G.boss.short + ' on ' + G.diff().name + ': ' + U.fmtTime(res.meta.record) + '.' + (feats ? ' ' + feats : '')
      : res.meta.lines.length ? res.meta.lines.join(' \u00b7 ')
      : res.newBest ? 'New fastest first trial on ' + G.diff().name + '.'
      : res.newDepth ? 'Your deepest trial yet on ' + G.diff().name + '.' : '';
    const next = G.bosses[G.run.foe(res.trial + 1)];
    el.winPick.textContent = 'Choose a boon to carry into trial ' + G.roman(res.trial + 1) + ', against ' + next.short;
    U.hud(false);
    U.lockUntil = performance.now() + 700;
    U.fillBoons();
    U.show('win');
  };
  // The boons on offer (three, or four with the Shrine's Fourth Boon), and the redraw button.
  U.fillBoons = function () {
    const offer = G.run.offer;
    Array.from(el.winCards.children).forEach((c, i) => {
      const b = offer[i];
      c.style.display = b ? '' : 'none';
      if (!b) return;
      const own = G.boon(b.id);
      c.className = 'item card t-' + b.tag.toLowerCase();
      c.querySelector('.ctag').textContent = b.tag;
      c.querySelector('.cname').textContent = b.name;
      c.querySelector('.cdesc').textContent = b.desc + (own ? ' You hold ' + own + '.' : '');
    });
    el.rerollItem.style.display = G.run.rerolls > 0 ? '' : 'none';
    el.rerollItem.textContent = 'Redraw boons (' + G.run.rerolls + ' left)';
    if (U.current === 'win') U.setFocus(0);
  };
})();
