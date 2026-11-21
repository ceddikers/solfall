// Solfall - menus, the in-fight display, and result screens (all plain DOM over the canvas).
'use strict';
(function () {
  const U = G.ui = { current: null, stack: [], focus: 0, seen: {} };
  const $ = (id) => document.getElementById(id);
  const el = {};

  const OPTS = {
    difficulty: { values: [0, 1, 2], label: (v) => G.DIFFS[v].name },
    shake: { values: [0, 0.5, 1], label: (v) => (v === 0 ? 'Off' : v === 0.5 ? 'Half' : 'Full') },
    numbers: { values: [false, true], label: (v) => (v ? 'On' : 'Off') },
    hints: { values: [false, true], label: (v) => (v ? 'On' : 'Off') },
    music: { slider: true },
    sfx: { slider: true },
  };
  const NOTES = [
    '7 health. Warnings last longer and attacks come slower.',
    '5 health. The fight as intended.',
    '4 health. Shorter warnings, less rest, extra attacks.',
  ];
  const TIPS = [
    'A dash passes straight through any attack. Use it late, not early.',
    'Slash downward in the air to bounce off a hand and stay above the shockwaves.',
    'Keep one segment of Starlight in reserve for mending.',
    'The hands are stuck after a slam, a clap or a rocket punch. Three slashes fit in that window.',
    'A Star Lance aimed upward reaches the core from the ground. Hold up and fire.',
    'When the floor burns, the platforms are safe.',
    'Filling the stagger bar drops the core to the floor, where every hit counts for more.',
    'Falling orbs can be cut out of the air, and each one gives a little Starlight.',
  ];
  const PHASE_COLS = [null, ['#ff8a3c', '#ffd07a'], ['#ff3c5a', '#ffa2ac'], ['#b6a6ff', '#ffffff']];
  const ROMAN = ['', 'I', 'II', 'III'];

  U.fmtTime = function (t) {
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  };

  // ------------------------------------------------------------------ setup
  U.init = function () {
    for (const id of ['hud', 'hp', 'ember', 'mend', 'timer', 'bfill', 'bchip', 'pfill', 'bphase', 'card', 'callout',
      'hint', 'lowhp', 'lbTop', 'lbBot', 'diffNote', 'bestLine', 'ver', 'deadLead', 'deadFill', 'deadStats',
      'deadTip', 'winStats', 'winBest', 'gradeLetter', 'gradeTitle', 'gradeSub', 'stage']) el[id] = $(id);
    el.segs = Array.from(document.querySelectorAll('#ember .seg'));
    el.bbar = document.querySelector('.bbar');
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
        if (i < 0) return;
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
    return Array.from(document.querySelectorAll('#s-' + U.current + ' .item'));
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
    if (name === 'begin' || name === 'retry' || name === 'restart') G.startFight();
    else if (name === 'how') U.show('how', true);
    else if (name === 'settings') U.show('settings', true);
    else if (name === 'back') U.back();
    else if (name === 'resume') G.resume();
    else if (name === 'quit') G.toTitle();
    else if (name === 'fullscreen') {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { });
    }
  }

  U.onAction = function (a) {
    const items = U.items();
    if (!items.length) return;
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
      else if (U.current === 'pause') { G.audio.play('uiBack'); G.resume(); }
    }
    else if (a === 'retry') {
      if (U.current === 'dead' || U.current === 'win') act('retry');
    }
  };

  U.refresh = function () {
    document.querySelectorAll('.item.opt').forEach((it) => {
      const opt = it.dataset.opt, def = OPTS[opt], v = G.settings[opt];
      if (def.slider) {
        it.querySelector('.track i').style.width = Math.round(v * 100) + '%';
        it.querySelector('.v').textContent = Math.round(v * 100) + '%';
      } else it.querySelector('.v').textContent = def.label(v);
    });
    el.diffNote.textContent = NOTES[G.settings.difficulty] || '';
    const best = G.store.load('best', {})[G.settings.difficulty];
    el.bestLine.textContent = best ? 'Best on ' + G.diff().name + ': ' + U.fmtTime(best.time) + ' (' + best.grade + ')' : 'No victory on ' + G.diff().name + ' yet';
  };

  // ------------------------------------------------------------------ in-fight display
  const H = { hp: -1, max: -1, ember: -1, full: -1, fill: -1, chip: 1, chipShown: -1, poise: -1, timer: '', phase: 0, low: null, mend: null, broken: null, introK: 1, introDelay: 0, hintT: 0, hitT: 0, lastHp: 0 };

  U.hud = function (on) { el.hud.classList.toggle('off', !on); };

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

  U.bossIntro = function () {
    H.introK = 0; H.introDelay = 1.3; H.chip = 0; H.fill = -1; H.phase = 0; H.lastHp = G.boss.maxHp;
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
  U.keysHint = function () {
    U.fights = (U.fights || 0) + 1;
    if (!G.settings.hints || U.fights > 2) return;
    el.hint.innerHTML = G.input.device === 'gamepad'
      ? 'Stick move &middot; <b>A</b> jump &middot; <b>X</b> slash &middot; <b>B</b> dash &middot; <b>Y</b> lance &middot; hold <b>LB</b> mend'
      : '<kbd>A</kbd><kbd>D</kbd> move &middot; <kbd>Space</kbd> jump &middot; <kbd>J</kbd> slash &middot; <kbd>K</kbd> dash &middot; <kbd>L</kbd> lance &middot; hold <kbd>E</kbd> mend';
    el.hint.classList.add('show', 'calm');
    H.hintT = 7;
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
    const mend = !P.dead && P.hp < P.maxHp && P.ember >= G.PLAYER.SEG;
    if (mend !== H.mend) { H.mend = mend; el.mend.classList.toggle('on', mend); }

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
      const cols = PHASE_COLS[B.phase];
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

  U.showDead = function () {
    const P = G.player, B = G.boss;
    const pct = Math.max(1, Math.ceil(B.hp / B.maxHp * 100));
    el.deadLead.textContent = 'The Warden endures with ' + pct + '% of its strength, in phase ' + ROMAN[B.phase] + '.';
    el.deadFill.style.transition = 'none';
    el.deadFill.style.width = '100%';
    void el.deadFill.offsetWidth;
    el.deadFill.style.transition = '';
    el.deadFill.style.width = pct + '%';
    el.deadStats.innerHTML = statsHtml([
      [U.fmtTime(G.time), 'Time'],
      [P.stats.dmg, 'Damage dealt'],
      [P.stats.perfect, 'Perfect dodges'],
      [P.stats.heals, 'Mends'],
    ]);
    el.deadTip.textContent = G.pick(TIPS);
    U.hud(false);
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
      [P.stats.lances, 'Star Lances'],
    ]);
    el.winBest.textContent = res.newBest
      ? 'New best time on ' + G.diff().name + '.'
      : 'Best on ' + G.diff().name + ': ' + U.fmtTime(res.best.time) + ' (' + res.best.grade + ')';
    U.hud(false);
    U.show('win');
  };
})();
