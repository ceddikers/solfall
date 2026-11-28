// Solfall - menus, the in-fight display, and result screens (all plain DOM over the canvas).
'use strict';
(function () {
  const U = G.ui = { current: null, stack: [], focus: 0, seen: {}, lockUntil: 0 };
  const $ = (id) => document.getElementById(id);
  const el = {};

  const OPTS = {
    difficulty: { get values() { return G.diffChoices(); }, label: (v) => G.DIFFS[v].name }, // (v3.0c: and the hero's Ascension steps)
    shake: { values: [0, 0.5, 1], label: (v) => (v === 0 ? G.T('Off') : v === 0.5 ? G.T('Half') : G.T('Full')) },
    flash: { values: [0, 0.4, 1], label: (v) => (v === 0 ? G.T('Off') : v === 0.4 ? G.T('Reduced') : G.T('Full')) },
    numbers: { values: [false, true], label: (v) => (v ? G.T('On') : G.T('Off')) },
    polish: { values: [false, true], label: (v) => (v ? G.T('On') : G.T('Off')) },
    hints: { values: [false, true], label: (v) => (v ? G.T('On') : G.T('Off')) },
    firstFoe: { values: ['random'].concat(G.BOSS_IDS), label: (v) => (G.bosses[v] ? G.bosses[v].short : G.T('Random')) },
    music: { slider: true },
    sfx: { slider: true },
  };
  const NOTES = [
    G.T('7 health. Warnings last longer and attacks come slower.'),
    G.T('5 health. The fight as intended.'),
    G.T('4 health. Shorter warnings, less rest, extra attacks.'),
  ];
  // Shown after a defeat: these hold for every boss; each boss adds its own (B.tips).
  const TIPS = [
    G.T('A dash passes straight through any attack. Use it late, not early.'),
    G.T('Keep one segment of Starlight in reserve for mending.'),
    G.T('Orbs, knives, skulls and spheres can be cut out of the air, and each one gives a little Starlight.'),
    G.T('Filling the stagger bar drops a boss to its knees, where every hit counts for more.'),
    G.T('Red-orange always means danger: a marked patch of ground, a line, a lane. Read it before you move.'),
  ];
  const ROMAN = ['', 'I', 'II', 'III'];
  // (v3.1a) page text with tags inside it (the How to play table and tips, the practice note): in Japanese the
  // whole element is replaced, keyed by its English html, so the word order can change. It runs as this file
  // loads, before the pass over the page's plain text (js/lang/apply.js).
  if (G.ja) document.querySelectorAll('#s-how td, #s-how .tips li, #s-practice .lead').forEach((n) => {
    const k = n.innerHTML.trim();
    if (G.i18n.has(k)) n.innerHTML = G.T(k);
  });
  // a feat line from meta.js ('Feat: name +pay', kept in English there because it is picked out by its start)
  const featLine = (l) => { const m = /^Feat: ([\s\S]*) \+(\d+)$/.exec(l); return m ? G.T('Feat: {0} +{1}', m[1], m[2]) : l; };
  const LIST = G.ja ? '、' : ', '; // a list's separator

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
      'practiceOver', 'keyList', 'resetItem', 'movesOver', 'movesTitle', 'movesBody', 'movesFoot', 'ult', 'ultFill', 'ultKey', 'crown', 'crownFill', 'crownName', 'crownKey', 'flow', 'flowRank', 'flowFill', 'omen', 'shardCount', 'shrineLead', 'shrineList', 'shrineTrophies', 'rerollItem', 'featsLead', 'featsBody', 'featsTabs', 'helpBody', 'helpTabs', 'fountainLead', 'fountainList', 'smithLead', 'smithList', 'merchLead', 'merchList', 'items', 'item0', 'item1', 'item2', 'motes', 'moteCount', 'continueItem', 'quickItem', 'deadRecap', 'winRecap', 'dailyItem', 'journalTabs', 'journalBody']) el[id] = $(id);
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
        if (i >= 0 && i !== U.focus) { U.setFocus(i, true); G.audio.play('uiMove'); }
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
  // (v2.7a) Menus you come back to open where you left the cursor (the result and choice screens always
  // open on their first item)
  const REMEMBER = ['title', 'pause', 'settings', 'help', 'keys', 'practice', 'shrine', 'how', 'feats', 'moves', 'journal'];
  U.mem = {};
  // (v3.1c) hover moves the highlight only; a tab's page (Help, Journal, Tally) changes on a click, or as keys or
  // a pad move the focus
  U.setFocus = function (i, hover) {
    document.body.classList.toggle('pad', G.input.device === 'gamepad');
    const items = U.items();
    U.focus = G.clamp(i, 0, items.length - 1);
    if (REMEMBER.includes(U.current)) U.mem[U.current] = U.focus;
    items.forEach((it, k) => it.classList.toggle('focus', k === U.focus));
    if (hover) return;
    const act = U.current === 'help' && items[U.focus] ? items[U.focus].dataset.act || '' : '';
    if (/^help\d$/.test(act)) U.fillHelp(Number(act.slice(4)));
    const ta = U.current === 'feats' && items[U.focus] ? items[U.focus].dataset.act || '' : '';
    if (/^tal\d$/.test(ta)) U.fillFeats(Number(ta.slice(3)));
    const ja = U.current === 'journal' && items[U.focus] ? items[U.focus].dataset.act || '' : '';
    if (/^jour\d$/.test(ja)) U.fillJournal(Number(ja.slice(4)));
  };
  U.show = function (name, push) {
    if (push && U.current) U.stack.push(U.current);
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('on', 'out'));
    $('s-' + name).classList.add('on');
    U.current = name;
    U.refresh();
    U.setFocus(REMEMBER.includes(name) && U.mem[name] != null ? U.mem[name] : 0);
  };
  U.close = function () {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('on', 'out'));
    U.current = null; U.stack.length = 0;
  };
  // (v2.9b) Play: the title fades off the camp instead of going at once (the camp is already behind it)
  U.leaveTitle = function () {
    const s = $('s-title');
    U.current = null; U.stack.length = 0;
    s.classList.add('out');
    const tok = U.titleTok = (U.titleTok || 0) + 1;
    setTimeout(() => { if (U.titleTok === tok && s.classList.contains('out')) s.classList.remove('on', 'out'); }, 900);
  };
  U.back = function () {
    const prev = U.stack.pop();
    if (prev) { U.show(prev, false); G.audio.play('uiBack'); }
    // a screen opened from the camp closes back onto it
    else if ((G.state === 'hub' || G.state === 'rest') && U.current) { U.close(); G.audio.play('uiBack'); G.input.endStep(); }
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
    if (name === 'begin') G.enterVigil();
    else if (name === 'continue') { if (!G.continueRun()) { G.audio.play('empty'); U.refresh(); } }
    else if (name === 'quick') G.quickStart();
    else if (name === 'daily') G.startDaily();
    else if (name === 'journal') U.showJournal();
    else if (/^jour\d$/.test(name)) U.fillJournal(Number(name.slice(4)));
    else if (/^tal\d$/.test(name)) U.fillFeats(Number(name.slice(3)));
    else if (name === 'retry' || name === 'restart') G.newRun();
    else if (name === 'heroes' || name === 'camp') G.toHub('gate');
    else if (/^hero\d$/.test(name)) G.pickHero(Number(name.slice(4)));
    else if (/^relic\d$/.test(name)) G.pickRelic(Number(name.slice(5)));
    else if (/^boon\d$/.test(name)) G.takeBoon(Number(name.slice(4)));
    else if (name === 'endrun') G.toHub('gate');
    else if (name === 'endcamp') G.epilogue.finish();
    else if (name === 'rest') G.toRest();
    else if (name === 'reroll') G.rerollBoons();
    else if (name === 'shrine') U.showShrine();
    else if (/^shrine\d$/.test(name)) buy(Number(name.slice(6)));
    else if (/^cleanse\d$/.test(name)) cleanse(Number(name.slice(7)));
    else if (/^temper\d$/.test(name)) temper(Number(name.slice(6)));
    else if (/^merch\d$/.test(name)) merchBuy(Number(name.slice(5)));
    else if (name === 'how') U.show('how', true);
    else if (name === 'guide') G.guide.open(false);
    else if (name === 'gprev') G.guide.turn(-1);
    else if (name === 'gnext') G.guide.turn(1);
    else if (name === 'gclose') G.guide.close();
    else if (name === 'help') U.showHelp();
    else if (/^help\d$/.test(name)) U.fillHelp(Number(name.slice(4)));
    else if (name === 'settings') U.show('settings', true);
    else if (name === 'lang') G.i18n.setLang(G.ja ? 'en' : 'ja'); // (v3.1a: English / 日本語, on the title screen)
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
    // (v2.9n) the Guide: left and right turn its pages, Esc closes it
    if (U.current === 'guide') {
      if (a === 'left' || a === 'right') { G.guide.turn(a === 'right' ? 1 : -1); return; }
      if (a === 'pause') { G.guide.close(); return; }
    }
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
      else if (G.state === 'hub' || G.state === 'rest') U.back();
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
      c.querySelector('.ctag').textContent = G.heroTitle(h);
      c.querySelector('.cdesc').textContent = h.blurb;
      c.querySelector('.hhp').textContent = G.T('Health {0} \u00b7 {1}', (G.DIFFS[G.settings.difficulty] || G.DIFFS[1]).hp + h.hp, h.specialName);
      c.querySelector('.hlines').innerHTML = h.lines.map((l) => '<li>' + l + '</li>').join('');
      G.drawHeroPortrait(c.querySelector('canvas'), h);
    });
    U.show('hero', true);
    U.setFocus(Math.max(0, G.HEROES.findIndex((h) => h.id === G.settings.hero)));
  };
  U.showRelics = function (offer) {
    const h = G.hero();
    el.relicOver.textContent = h.name + ' \u00b7 ' + G.heroTitle(h);
    el.relicOver.style.color = h.css;
    Array.from(el.relicCards.children).forEach((c, i) => {
      const r = offer[i];
      c.style.display = r ? '' : 'none';
      if (!r) return;
      c.querySelector('.cname').textContent = r.name;
      c.querySelector('.cdesc').textContent = G.T('{0} It awakens three times in a run.', r.desc);
    });
    U.show('relic', true);
  };

  // ---- the Shrine: permanent upgrades bought with Sunshards
  U.fillShrine = function () {
    const M = G.meta;
    el.shrineLead.innerHTML = G.T('You hold <b style="color:var(--gold)">{0}</b> Sunshards. Every fight earns some, win or lose; what you buy here lasts.', M.shards);
    Array.from(el.shrineList.children).forEach((row, i) => {
      const u = G.SHRINE[i], n = G.up(u.id), max = u.costs.length, cost = M.cost(u);
      row.querySelector('.uname').textContent = u.name;
      row.querySelector('.upips').innerHTML = u.costs.map((c, k) => '<i' + (k < n ? ' class="on"' : '') + '></i>').join('');
      row.querySelector('.udesc').textContent = n >= max ? u.text(n) : (n ? u.text(n) + '  \u2192  ' : '') + u.text(n + 1);
      row.querySelector('.ucost').textContent = cost == null ? G.T('Complete') : cost + ' \u25c6';
      row.classList.toggle('max', cost == null);
      row.classList.toggle('poor', cost != null && M.shards < cost);
    });
    const got = G.TROPHIES.filter((t) => M.trophy[t.boss]);
    el.shrineTrophies.textContent = got.length ? G.T('Trophy relics {0} of {1}: {2}.', got.length, G.TROPHIES.length, got.map((t) => t.name).join(LIST))
      : G.T('Trophy relics {0} of {1}. Beat a boss in your last trial, at its strongest, and its relic joins those you can be offered.', got.length, G.TROPHIES.length);
  };
  U.showShrine = function () { U.fillShrine(); U.show('shrine', true); };
  // ---- the Cleansing Fountain (rest.js): one row for each corrupted boon whose bane you still carry
  U.fillFountain = function () {
    const R = G.run, banes = R.banes(), cost = R.cleanseCost();
    el.fountainLead.innerHTML = G.T('You hold <b style="color:var(--mote)">{0}</b> Motes. Each cleansing this run costs twice the last.', G.motes.held());
    Array.from(el.fountainList.children).forEach((row, i) => {
      const id = banes[i], b = id && G.boonDef(id);
      row.style.display = b ? '' : 'none';
      if (!b) return;
      row.querySelector('.uname').textContent = b.name;
      row.querySelector('.udesc').textContent = G.T('Purge: {0}', b.bane);
      row.querySelector('.ucost').textContent = cost + ' \u25c7';
      row.classList.toggle('poor', G.motes.held() < cost);
    });
  };
  U.showFountain = function () { U.fillFountain(); U.show('fountain', true); };
  function cleanse(i) {
    const id = G.run.banes()[i];
    if (!id || !G.run.cleanse(id)) { G.audio.play('empty'); return; }
    G.audio.play('heal'); G.audio.play('segment');
    G.rest.retake(); // the hero, remade without the bane
    const P = G.player;
    G.fx.ring(P.x, P.y - 24, { r0: 10, r1: 120, life: 0.5, color: '170,220,255', width: 5 });
    G.fx.burst(P.x, P.y - 20, { n: 22, color: '170,220,255', speed: [20, 140], life: [0.6, 1.2], size: [2, 4], grav: -200, wob: 100, jitter: 20 });
    G.fx.burst(P.x, P.y - 20, { n: 12, color: '235,30,80', speed: [60, 220], life: [0.3, 0.7], size: [2, 3], kind: 'spark' });
    if (!G.run.banes().length) { U.close(); G.input.endStep(); } else { U.fillFountain(); U.refresh(); U.setFocus(0); }
  }
  // ---- the Wandering Smith (rest.js): one row for each boon that can be tempered
  U.fillSmith = function () {
    const R = G.run, list = R.temperable(), cost = R.temperCost();
    el.smithLead.innerHTML = G.T('You hold <b style="color:var(--mote)">{0}</b> Motes. One more of a boon you hold, even past its limit. Each tempering this run costs twice the last.', G.motes.held());
    Array.from(el.smithList.children).forEach((row, i) => {
      const b = list[i];
      row.style.display = b ? '' : 'none';
      if (!b) return;
      const n = G.boon(b.id);
      row.querySelector('.uname').textContent = b.name + ' \u00d7' + n + ' \u2192 ' + (n + 1);
      row.querySelector('.udesc').textContent = b.desc;
      row.querySelector('.ucost').textContent = cost + ' \u25c7';
      row.classList.toggle('poor', G.motes.held() < cost);
    });
  };
  U.showSmith = function () { U.fillSmith(); U.show('smith', true); };
  function temper(i) {
    const b = G.run.temperable()[i];
    if (!b || !G.run.temper(b.id)) { G.audio.play('empty'); return; }
    G.rest.tempered();
    if (!G.run.temperable().length) { U.close(); G.input.endStep(); } else { U.fillSmith(); U.refresh(); U.setFocus(0); }
  }
  // ---- (v2.9k) the road merchant (rest.js, motes.js): mending, two boons, two consumables
  U.fillMerchant = function () {
    const rows = G.motes.rows(), held = G.motes.held(), it = G.motes.items();
    const hands = it.map((id) => (id ? G.motes.item(id).name : G.T('empty'))).join(LIST);
    el.merchLead.innerHTML = G.T('You hold <b style="color:var(--mote)">{0}</b> Motes. In your hands: {1}.', held, U.esc(hands));
    Array.from(el.merchList.children).forEach((row, i) => {
      const r = rows[i];
      row.style.display = r ? '' : 'none';
      if (!r) return;
      row.querySelector('.uname').textContent = r.name + (r.kind === 'item' ? G.T(' \u00b7 item') : r.kind === 'boon' ? G.T(' \u00b7 boon') : '');
      row.querySelector('.udesc').textContent = r.why && !r.sold ? G.T('{0}. {1}', G.T(r.why), r.desc) : r.desc;
      row.querySelector('.ucost').textContent = r.sold ? G.T('Sold') : r.price + ' \u25c7';
      row.classList.toggle('poor', !r.sold && !r.why && held < r.price);
      row.classList.toggle('max', !!(r.sold || r.why));
    });
  };
  U.showMerchant = function () { U.fillMerchant(); U.show('merchant', true); };
  function merchBuy(i) {
    const R = G.run, crownWas = R.crownSet(), duoWas = R.duo();
    const row = G.motes.buy(i);
    if (!row) { G.audio.play('empty'); return; }
    G.rest.bought(row, crownWas, duoWas);
    U.fillMerchant(); U.refresh();
  }
  // ---- Help: how a fight goes, and every word the game uses, by subject
  // steps: a numbered account. words: [the word, what it means].
  const HELP = [
    { name: G.T('How a fight works'), lead: G.T('One hero, one boss, one arena. A run is seven of them, one for each boss: the first at random, then each one you choose at its portal, until you win or fall.'), steps: [
      G.T('<b>The boss has three phases.</b> Its health bar is cut in three. Each time a third is gone it changes: new attacks, less rest.'),
      G.T('<b>Red-orange is a warning.</b> It marks where an attack will land. When it fills and flashes, the attack fires.'),
      G.T('<b>Leave the marked place, or dash through the attack.</b> A dash passes straight through anything.'),
      G.T('<b>Strike between its attacks.</b> Every hit fills your Starlight, your Flow, your Dawnbreak and the boss’s stagger bar.'),
      G.T('<b>Fill the stagger bar</b> and the boss is thrown down, open, for a few seconds. Save your biggest blows for then.'),
      G.T('<b>The Warden wards itself twice</b> and gathers a blast: its Eclipse. Break the ward before the ring closes on it, while its hands come down on you in turn.'),
      G.T('<b>When its health is gone it goes down and stays down.</b> Press {0} close to it for your hero’s finishing blow, or just hit it to end the fight plainly. Then you are graded, paid in Sunshards and offered a boon. Then the next trial: another boss, harder.', '<kbd>' + G.input.label('heal') + '</kbd>'),
      G.T('<b>When your health is gone the run ends</b> and you wake in the Vigil. What you bought at the Shrine is still yours.'),
    ] },
    { name: G.T('Attacking'), lead: G.T('What your weapon does, and the blows that are worth more.'), words: [
      [G.T('Chain'), G.T('Your attacks in a row. Hold the button to keep it going; a dash does not break it.')],
      [G.T('Finisher'), G.T('The last blow of a chain, drawn in gold. It hits hardest and fills the most Starlight and stagger.')],
      [G.T('Aim'), G.T('Hold up or down to strike that way. With the sword or the maul, striking down in the air bounces you off what you hit.')],
      [G.T('Thrust'), G.T('Sword or maul: a blow thrown straight out of a dash deals 40% more.')],
      [G.T('Special'), G.T('Your hero’s second attack. It costs one segment of Starlight.')],
      [G.T('Stagger'), G.T('The thin bar under the boss’s health. Fill it with hits and the boss is thrown down and cannot act.')],
      [G.T('Sunder'), G.T('The first finisher on a staggered boss: 2.2 times the damage. One for each stagger.')],
      [G.T('Riposte'), G.T('The first weapon hit within 1.5 seconds of a perfect dodge: double damage.')],
      [G.T('Clash'), G.T('A finisher, thrust or heavy arrow that lands just as the Veil’s or the Knight’s swing is about to: the swing is stopped dead and you are pushed back unharmed.')],
    ] },
    { name: G.T('Your meters'), lead: G.T('The bars at the top left, and what fills them.'), words: [
      [G.T('Health'), G.T('The diamonds. Most attacks cost one; a few, marked by a tell, cost two.')],
      [G.T('Starlight'), G.T('Three segments, filled by landing hits and by perfect dodges. Spend one on your special or on mending.')],
      [G.T('Mend'), G.T('Stand still and hold the button: one segment of Starlight becomes one health. Jumping or dashing cancels it.')],
      [G.T('Flow'), G.T('A rank from C to SS that climbs as you hit and dodge without being hit. Each rank adds 3% damage. It drains when you stop, and a blow taken costs most of it.')],
      [G.T('Dawnbreak'), G.T('Your greatest attack. Its bar fills as you deal damage; press once when it is full. Nothing can touch you while it plays, and it breaks a ward outright.')],
      [G.T('Flourish'), G.T('A salute that leaves you open for most of a second. Finishing one raises Flow and Dawnbreak.')],
      [G.Tx('help', 'Brazen'), G.T('A flourish finished while the boss is in the middle of an attack. Worth three times as much.')],
    ] },
    { name: G.T('Staying alive'), lead: G.T('Everything that keeps you standing.'), words: [
      [G.T('Warning'), G.T('Red-orange on the ground or in the air: where an attack will land. It fills, flashes, then fires.')],
      [G.T('Dash'), G.T('A burst of speed that nothing can hit. It has a short rest before it can be used again.')],
      [G.T('Perfect dodge'), G.T('A dash through an attack at the last moment. Time slows, Starlight fills by a third of a segment and your next hit is a Riposte.')],
      [G.T('Tell'), G.T('A small thing a boss does before an attack that says which form is coming: how fast the Veil cuts, how the Magus holds its staff. Learn them and you know sooner than the warning shows.')],
      [G.T('Last Light'), G.T('The first time in a fight that a blow leaves you on one health: time slows, nothing can hurt you for 2.4 seconds, and Dawnbreak and Starlight both rise.')],
      [G.T('Wardstone, Second Dawn'), G.T('Some relics and boons turn a blow aside or save you once. The pause menu lists what you carry.')],
    ] },
    { name: G.T('Bosses'), lead: G.T('Words for what a boss does.'), words: [
      [G.T('Phase'), G.T('A third of a boss’s health, marked I, II, III beside its name. Each one brings new attacks.')],
      [G.T('Reckoning'), G.T('The Warden only (it calls it Eclipse). Once in phase I and once in phase II it goes to the middle, wards itself and gathers a blast while a red ring closes on it for 6.5 seconds. Its hands guard it: they come down on you in turn, and each sends a wave along the floor.')],
      [G.T('Ward'), G.T('The shell round the Warden during its Reckoning. Your hits go to it, shown as a gold arc. Break it and the Warden is staggered and Dawnbreak gains a quarter of its bar.')],
      [G.T('Tell'), G.T('See Staying alive. Each boss tells in its own way: the Veil by tempo, the Knight by its foot and blade, the Magus by its staff, the Warden by its eye and fist.')],
      [G.T('One last push'), G.T('Called out when a boss is under a tenth of its health.')],
      [G.T('Omen'), G.T('From the second trial a fight carries an omen that changes it (a storm, falling embers, a faster or tougher boss); from the sixth, two. Each adds 25% Sunshards.')],
    ] },
    { name: G.T('A run'), lead: G.T('From the gate to the fall.'), words: [
      [G.T('Trial'), G.T('One fight of a run. Each trial is against another boss and is harder than the last.')],
      [G.T('Portal'), G.T('After each trial, at the crossroads, walk into a boss\u2019s portal to fight it next. A beaten boss\u2019s portal is sealed.')],
      [G.T('Corrupted'), G.T('Now and then a beaten boss\u2019s portal turns corrupted: an optional, far harder fight that is not a trial. Win it for a second relic and three times the Sunshards; fall in it and the run ends.')],
      [G.T('Relic'), G.T('One power chosen at the reliquary before the gate. It lasts the whole run, and stays with you if you fall and go again; it is given up only by going back to the camp.')],
      [G.T('Boon'), G.T('A smaller power chosen after each victory. They add up through the run.')],
      [G.T('Grade'), G.T('S, A, B or C for a victory. Every blow you take lowers it, and so does a fight that runs past two and a half minutes; perfect dodges raise it. A better grade pays more.')],
      [G.T('Sunshards'), G.T('What every fight pays, win or lose. They are kept between runs and spent at the Shrine.')],
      [G.T('Trophy'), G.T('The boss you beat in your last trial, at its strongest, adds its relic to those the reliquary can offer. One a run.')],
      [G.T('Feat'), G.T('One of eighteen things worth doing once, each paying Sunshards. The Tally stone in the Vigil lists them.')],
    ] },
    { name: G.T('Boons'), lead: G.T('Everything that grows your hero during a run.'), words: [
      [G.T('Pair'), G.T('A gold boon offered only once you hold both of the two boons it joins. A card that would open one says so.')],
      [G.T('Redraw, banish'), G.T('Each run has one redraw of the offering, at the standing stone (the Shrine sells more), and, once the Shrine sells you Banishment, a banish: at a plinth, the flourish key strikes that boon from the run and draws another in its place.')],
      [G.T('Sets and duos'), G.T('Ember, Storm, Tide and Gloam boons each fill a slot: Strike, Special, Dash, Mend or Jump. Three of one set open its crown; two each of two sets wake their duo, which works for as long as both sets stay slotted.')],
      [G.T('Corrupted boon'), G.T('A crimson boon, far stronger than the rest, with a drawback written under it. Once a boss has fallen, one sometimes takes a card\u2019s place.')],
      [G.T('Cleansing Fountain'), G.T('At the crossroads. Spend Motes to purge a corrupted boon\u2019s drawback and keep the rest of it. Each use in a run costs twice the last.')],
    ] },
    { name: G.T('The Vigil'), lead: G.T('Your camp, from left to right.'), words: [
      [G.T('The old bell, the lantern'), G.T('Toys. Keep the bell ringing; keep the lantern off the ground.')],
      [G.T('Hall of Echoes'), G.T('An alcove for each hero. Use one to play as that hero.')],
      [G.T('The Tally'), G.T('A standing stone with a mark for every feat.')],
      [G.T('The Shrine'), G.T('Spend Sunshards on things that last: health, damage, a fourth relic or boon to choose from.')],
      [G.T('Sparring post'), G.T('It cannot be hurt for good. Try every attack on it; Dawnbreak charges three times as fast here.')],
      [G.T('The Brazier'), G.T('Its flame is the difficulty: more health and longer warnings, or fewer and shorter.')],
      [G.T('The Proving Ring'), G.T('Practise against any boss you choose, from any phase, with nothing at stake. A real run never tells you who comes next.')],
      [G.T('The Reliquary, the Gate'), G.T('Take a relic from a plinth, then step through the gate to begin the run.')],
    ] },
  ];
  U.fillHelp = function (i) {
    const h = HELP[i];
    if (!h || U.helpPage === i) return;
    U.helpPage = i;
    el.helpBody.innerHTML = '<h3>' + h.name + '</h3><p class="lead">' + h.lead + '</p>'
      + (h.steps ? '<ol class="helpsteps">' + h.steps.map((s) => '<li>' + s + '</li>').join('') + '</ol>'
        : '<dl class="helpwords">' + h.words.map((w) => '<dt>' + w[0] + '</dt><dd>' + w[1] + '</dd>').join('') + '</dl>');
    Array.from(el.helpTabs.children).forEach((it) => it.classList.toggle('open', it.dataset.act === 'help' + i));
  };
  U.showHelp = function () { U.helpPage = -1; U.fillHelp(0); U.show('help', true); };
  // ---- (v2.8a) The Boss Journal: a page for each boss, an entry for each of its moves. A move you have not
  // met is only a blank line; once met, its name, the phases it comes in, what it does and how to read it
  // (js/journal-data.js, made from the bosses' own notes), and how often it has hit you and felled you.
  const J_ORDER = ['warden', 'mage', 'assassin', 'knight', 'wolf', 'leviathan', 'kairo', 'champion', 'sol'];
  const jRec = (b) => (G.meta.journal || {})[b] || {};
  U.showJournal = function () {
    Array.from(el.journalTabs.children).forEach((it, i) => {
      const b = J_ORDER[i];
      if (!b) return;
      const B = G.bosses[b], all = Object.keys((G.JOURNAL || {})[b] || {}), seen = all.filter((a) => (jRec(b)[a] || {}).seen).length;
      it.textContent = G.meta.hidden(b) ? '???' : (B ? B.short : b) + '  ' + seen + '/' + all.length; // (v2.9p: a surprise until met)
    });
    U.jPage = -1;
    U.show('journal', true);
    const f = el.journalTabs.children[U.focus];
    U.fillJournal(f && /^jour\d$/.test(f.dataset.act) ? Number(f.dataset.act.slice(4)) : 0);
  };
  U.fillJournal = function (i) {
    const b = J_ORDER[i], B = G.bosses[b], J = (G.JOURNAL || {})[b];
    if (!B || !J || U.jPage === i) return;
    U.jPage = i;
    if (G.meta.hidden(b)) {
      el.journalBody.innerHTML = '<h3>???</h3><p class="lead">' + G.T('You haven’t met this one yet.') + '</p>';
      Array.from(el.journalTabs.children).forEach((it) => it.classList.toggle('open', it.dataset.act === 'jour' + i));
      return;
    }
    const rec = jRec(b), bags = B.bags || {}, cor = B.corruptBags || {};
    const phasesOf = (a) => [1, 2, 3].filter((p) => (bags[p] || []).includes(a));
    const corrupt = (a) => [1, 2, 3].some((p) => (cor[p] || []).includes(a));
    // in the order they are met: phase I's first, then II's, then III's, then the rest
    const ids = Object.keys(J).sort((x, y) => ((phasesOf(x)[0] || 4) - (phasesOf(y)[0] || 4)));
    let seen = 0, hits = 0, falls = 0;
    const rows = ids.map((a) => {
      const r = rec[a] || {}, e = J[a], ph = phasesOf(a);
      hits += r.hit || 0; falls += r.fell || 0;
      const when = (ph.length ? G.T('Phase {0}', ph.map((p) => ROMAN[p]).join(G.ja ? '・' : ', ')) : corrupt(a) ? G.T('Corrupted only') : G.T('Its own moment'))
        + (ph.length && corrupt(a) ? G.T(' · also corrupted') : '');
      if (!r.seen) return '<div class="jent unseen"><b>? ? ?</b><i>' + when + '</i><p>' + G.T('Not met yet.') + '</p></div>';
      seen++;
      return '<div class="jent"><b>' + esc(e.name) + '</b><i>' + when + '</i><p>' + esc(e.text) + '</p>'
        + '<span class="jst">' + G.T('met {0}', r.seen) + (r.hit ? G.T(' · <em>hit you {0}</em>', r.hit) : G.T(' · never hit you')) + (r.fell ? G.T(' · <em class="fell">felled you {0}</em>', r.fell) : '') + '</span></div>';
    });
    const kills = (G.meta.kills || {})[b] || 0;
    el.journalBody.innerHTML = '<h3>' + esc(B.name) + '</h3><p class="lead">' + G.T('{0} of {1} moves written down', seen, ids.length) + ' · ' + (kills === 1 ? G.T('beaten {0} time', kills) : G.T('beaten {0} times', kills))
      + ' · ' + (hits === 1 ? G.T('its moves have hit you {0} time', hits) : G.T('its moves have hit you {0} times', hits)) + (falls ? G.T(', felled you {0}', falls) : '') + '</p><div class="jlist">' + rows.join('') + '</div>';
    Array.from(el.journalTabs.children).forEach((it) => it.classList.toggle('open', it.dataset.act === 'jour' + i));
  };
  // ---- the Tally: a list of the bosses (and the camp) on the left, with how many of each one's feats are
  // done; the one in focus shows its feats on the right, done or not, and what each pays. (v2.9o: was every
  // feat at once, which made the screen too big)
  const talList = () => G.feats.BOSSES.filter((b) => G.bosses[b]).concat(['camp']);
  const talFeats = (b) => (b === 'camp' ? G.feats.CAMP : G.feats.of(b));
  U.showFeats = function () {
    const FE = G.feats, list = talList();
    el.featsLead.innerHTML = G.T('{0} of {1} done. Each one pays Sunshards the first time you do it.', '<b style="color:var(--gold)">' + FE.count() + '</b>', FE.total);
    Array.from(el.featsTabs.children).forEach((it, i) => {
      if (!/^tal\d$/.test(it.dataset.act)) return;
      const b = list[i];
      it.style.display = b ? '' : 'none';
      if (!b) return;
      const fs = talFeats(b), n = fs.filter((f) => FE.done(f.id)).length;
      it.innerHTML = (G.meta.hidden(b) ? '???' : esc(b === 'camp' ? G.T('The camp') : G.bosses[b].short)) + '<span class="tcount' + (n === fs.length ? ' all' : '') + '">' + n + '/' + fs.length + '</span>';
    });
    U.talPage = -1;
    U.show('feats', true);
    const f = el.featsTabs.children[U.focus];
    U.fillFeats(f && /^tal\d$/.test(f.dataset.act) ? Number(f.dataset.act.slice(3)) : 0);
  };
  U.fillFeats = function (i) {
    const FE = G.feats, b = talList()[i];
    if (!b || U.talPage === i) return;
    U.talPage = i;
    const fs = talFeats(b), n = fs.filter((f) => FE.done(f.id)).length;
    const row = (f) => '<div class="feat' + (FE.done(f.id) ? ' done' : '') + '"><b>' + f.name + '</b><span>' + f.desc + '</span><i>' + (FE.done(f.id) ? G.T('done') : '◆ ' + f.pay) + '</i></div>';
    if (G.meta.hidden(b)) { // (v2.9p: Aurel is a surprise until met)
      el.featsBody.innerHTML = '<h3>???</h3><p class="lead">' + G.T('You haven’t met this one yet.') + '</p>';
      Array.from(el.featsTabs.children).forEach((it) => it.classList.toggle('open', it.dataset.act === 'tal' + i));
      return;
    }
    el.featsBody.innerHTML = '<h3>' + esc(b === 'camp' ? G.T('The camp') : G.bosses[b].name) + '</h3><p class="lead">' + G.T('{0} of {1} done', n, fs.length) + '</p>' + fs.map(row).join('');
    Array.from(el.featsTabs.children).forEach((it) => it.classList.toggle('open', it.dataset.act === 'tal' + i));
  };
  // ---- the Moves page: every button, and what it does for the hero in play
  U.showMoves = function (fromMenu) {
    const h = G.hero(), I = G.input, k = (a) => I.keys(a).map((n) => '<kbd>' + n + '</kbd>').join(' ');
    const jumps = 1 + h.air + G.boon('wind') + (G.relic('cloak') ? 1 : 0);
    const rows = [
      [G.T('Move'), k('left') + ' ' + k('right'), G.T('Run.') + (h.heavy ? G.T(' Heavy: slow to start and stop.') : h.id === 'lune' ? G.T(' The fastest of them.') : '')],
      [G.T('Jump'), k('jump'), G.T('{0} jumps. Hold for height. Down and jump drops through a platform.', jumps)],
      [G.T('Attack'), G.T('{0} or {1}', '<kbd>' + G.T('Left click') + '</kbd>', k('attack')), h.how.attack],
      [G.T('Aim'), k('up') + ' ' + k('down'), h.how.aim],
      [G.T('Dash'), k('dash'), G.T('Passes through attacks. Through one at the last moment is a perfect dodge: time slows, and your next hit deals double. ') + h.how.dash],
      [G.T('Special'), G.T('{0} or {1}', '<kbd>' + G.T('Right click') + '</kbd>', k('flare')), h.how.special + G.T(' Costs one Starlight.')],
      [G.T('Mend'), G.T('hold {0}', k('heal')), G.T('Stand still and hold: one Starlight becomes one health.')],
      [G.T('Dawnbreak'), G.T('{0} or middle click', k('ult')), h.how.ult + G.T(' Fills as you deal damage. Nothing can hurt you while it plays.')],
      ...(G.run.crownSet() ? [[G.T('Crown'), k('crown'), G.T('{0}: {1}', G.SETS[G.run.crownSet()].crown, G.SETS[G.run.crownSet()].crownDesc)]] : []),
      [G.T('Flourish'), k('taunt'), G.T('A short salute that raises Flow and Dawnbreak, three times as much during a boss attack. Getting hit ends it.')],
      [G.T('Items'), k('item1') + ' ' + k('item2'), G.T('Use what you hold. Bought from the road merchant with Motes.')],
    ];
    el.movesOver.textContent = G.heroTitle(h); el.movesOver.style.color = h.css;
    el.movesTitle.textContent = G.T('{0}’s moves', h.name);
    el.movesBody.innerHTML = rows.map((r) => '<tr><td class="mname">' + r[0] + '</td><td class="mkeys">' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('');
    el.movesFoot.textContent = fromMenu ? '' : G.T('Let go of Tab to carry on');
    U.show('moves', !!fromMenu);
  };

  // ---- the proving ring: practise against one boss, from any phase
  U.showPractice = function () {
    el.practiceOver.textContent = G.T('The Proving Ring');
    U.show('practice', true);
  };
  // ---- Settings, Controls: choose a row, then press the key it should use
  const ACTIONS = { left: G.T('Move left'), right: G.T('Move right'), up: G.T('Aim up'), down: G.T('Aim down, drop'), jump: G.T('Jump'), attack: G.T('Attack'), dash: G.T('Dash'), flare: G.T('Special'), heal: G.T('Mend, use'), ult: G.T('Dawnbreak'), crown: G.T('Crown'), taunt: G.T('Flourish'), item1: G.T('Item 1'), item2: G.T('Item 2'), item3: G.T('Item 3') };
  U.fillKeys = function () {
    Array.from(el.keyList.children).forEach((row) => {
      const a = (row.dataset.act || '').slice(4);
      if (!ACTIONS[a]) return;
      row.querySelector('.k').textContent = ACTIONS[a];
      const v = row.querySelector('.v');
      if (U.capturing === a) v.textContent = G.T('press a key…');
      else v.innerHTML = G.input.keys(a).map((k) => '<kbd>' + esc(k) + '</kbd>').join(''); // (v3.1b: each key its own chip)
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
      el.resetItem.textContent = G.T('Progress erased');
    } else { armed = performance.now(); el.resetItem.textContent = G.T('Choose again to erase everything'); G.audio.play('empty'); }
  }
  // Key names shown in prompts follow the bindings.
  U.buildPrompts = function () {
    H.mend = null;
    const pad = G.input.device === 'gamepad';
    if (el.ultKey) el.ultKey.innerHTML = pad ? '<kbd>RT</kbd>' : '<kbd>' + G.input.label('ult') + '</kbd>';
    if (el.crownKey) el.crownKey.innerHTML = pad ? '<kbd>LT</kbd>' : '<kbd>' + G.input.label('crown') + '</kbd>';
    if (el.item0) { el.item0.querySelector('kbd').textContent = pad ? 'L3' : G.input.label('item1'); el.item1.querySelector('kbd').textContent = pad ? 'R3' : G.input.label('item2'); el.item2.querySelector('kbd').textContent = pad ? 'Back' : G.input.label('item3'); } // (v2.9k; v3.0d: a third)
  };
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
    // (v2.7a) Continue a saved run, or (with none) Quick start with the last hero and relic
    const sv = G.savedRun(), last = G.relicDef(G.settings.lastRelic), lastHero = G.HEROES.find((h) => h.id === G.settings.hero);
    el.continueItem.style.display = sv ? '' : 'none';
    if (sv) {
      const h = G.HEROES.find((x) => x.id === sv.hero) || G.HEROES[0], tr = sv.run.trial || 1;
      el.continueItem.textContent = sv.at === 'fight' ? G.T('Continue · {0}, trial {1} (it starts again)', h.name, G.roman(tr)) : (sv.run.beaten || []).length >= G.RUN_FIGHTS ? G.T('Continue · {0}, the run won', h.name) : G.T('Continue · {0}, after trial {1}', h.name, G.roman(Math.max(1, (sv.run.beaten || []).length)));
    }
    el.quickItem.style.display = !sv && last && lastHero && G.meta.unlocked(last) ? '' : 'none';
    // (v2.8a) the daily trial: the day's hero and relic, and your best of the day
    const dp = G.dailyPlan(), dr = G.store.load('daily', {})[dp.key];
    el.dailyItem.textContent = G.T('Daily trial · {0} with {1}', dp.hero.name, dp.relic.name)
      + (dr ? G.T(' · best today: {0}', dr.won ? G.T('the run won') : dr.trials === 1 ? G.T('{0} trial', dr.trials) : G.T('{0} trials', dr.trials)) : '') + (sv ? G.T(' (ends the saved run)') : '');
    if (last && lastHero) el.quickItem.textContent = G.T('Quick start · {0}, {1}', lastHero.name, last.name);
    const best = G.store.load('best', {})[G.settings.difficulty];
    const depth = G.store.load('depth', {})[G.settings.difficulty];
    el.bestLine.textContent = depth
      ? G.T('{0}: deepest trial {1}', G.diff().name, G.roman(depth)) + (best ? G.T(' · fastest first trial {0} ({1})', U.fmtTime(best.time), best.grade) : '')
      : G.T('No victory on {0} yet', G.diff().name);
    const held = G.run.held(), relic = G.relicDef(G.run.relic);
    el.resetItem.textContent = G.T('Reset progress');
    const omens = G.run.omens.map((id) => '<p><b>' + G.T('Omen: {0}', G.omenDef(id).name) + '</b> ' + G.omenDef(id).desc + '</p>').join('')
      + (G.twist() && G.state === 'fight' && TWIST[G.boss.id] ? '<p><b>' + G.T('Ascension: its own way') + '</b> ' + TWIST[G.boss.id] + '</p>' : ''); // (v3.0c)
    el.pauseBoons.innerHTML = (held.length || relic || omens)
      ? '<h3>' + G.T('{0}’s run · {1}', G.hero().name, G.diff().name) + '</h3>' + omens
        + (relic ? '<p><b>' + esc(G.relics.title(relic.id)) + '</b> ' + G.relics.html(relic.id, { next: true }) + '</p>' : '')
        + (G.run.extraRelics || []).map((id) => G.relicDef(id)).filter(Boolean).map((r) => '<p><b>' + esc(G.relics.title(r.id)) + '</b> ' + G.relics.html(r.id) + ' <i>' + (r.id === 'hilt' ? G.T('(his gift, for this run)') : G.T('(from a corrupted portal)')) + '</i></p>').join('')
        + (G.run.crownSet() ? '<p class="crownline" style="--tagc:' + G.SETS[G.run.crownSet()].css + '"><b>' + G.T('Crown · {0}', G.SETS[G.run.crownSet()].crown) + '</b> ' + esc(G.SETS[G.run.crownSet()].crownDesc) + '</p>' : '')
        + (G.run.duo() ? '<p class="crownline" style="--tagc:#ffaadc"><b>' + G.T('Duo · {0}', esc(G.run.duo().name)) + '</b> <i>' + G.run.duo().of.map((s) => G.SETS[s].name).join(' + ') + G.T('.') + '</i> ' + esc(G.run.duo().desc) + '</p>' : '')
        + held.map((h) => '<p' + (h.def.cursed ? ' class="cursed"' : '') + '><b>' + h.def.name + (h.n > 1 ? ' ×' + h.n : '') + '</b> ' + (h.def.set ? '<i>' + G.SETS[h.def.set].name + ' · ' + G.SLOT_NAMES[h.def.slot] + G.T('.') + '</i> ' : '') + esc(h.def.desc) + U.pairNote(h.def)
          + (h.def.cursed ? (G.bane(h.def.id) ? '<span class="bane">' + esc(h.def.bane) + '</span>' : ' <i>' + G.T('(cleansed)') + '</i>') : '') + '</p>').join('')
      : '';
  };

  // ------------------------------------------------------------------ in-fight display
  const H = { hp: -1, max: -1, ember: -1, full: -1, fill: -1, chip: 1, chipShown: -1, poise: -1, timer: '', phase: 0, low: null, mend: null, broken: null, introK: 1, introDelay: 0, hintT: 0, hitT: 0, lastHp: 0 };

  // camp: only the hero's name, Starlight and Dawnbreak, with no boss, timer or Flow.
  U.hud = function (on, camp, rest) { el.hud.classList.toggle('off', !on); el.hud.classList.toggle('camp', !!camp); el.hud.classList.toggle('rest', !!rest); };

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
    // (v2.9m) the difficulty is always shown beside the boss's name
    el.trial.textContent = [G.practice ? G.T('Practice') : R.corrupt || R.champFight ? '' : R.trial > 1 ? G.T('Trial {0}', G.roman(R.trial)) : '', G.state === 'hub' ? '' : G.diff().name].filter(Boolean).join(' \u00b7 ');
    el.omen.innerHTML = R.omens.map((id) => '<b>' + G.T('Omen · {0}', G.omenDef(id).name) + '</b>' + G.omenDef(id).desc).join('');
    U.buildPrompts();
    H.ult = -1; H.ready = null; H.frank = -1; H.ffill = -1; H.cset = undefined;
    const hero = G.hero(), relic = G.relicDef(R.relic);
    el.heroName.textContent = hero.name.toUpperCase();
    // the health pips and Starlight take the hero's own colour
    el.stage.style.setProperty('--star', hero.css);
    // (v2.7a) each chip says what it does when the pointer rests on it
    const tip = (s) => ' data-tip="' + esc(plain(s)) + '"';
    const relicTip = (r) => tip(G.T('{0}: {1}', G.relics.title(r.id), G.relics.html(r.id, { next: true })));
    el.boons.innerHTML = (relic ? '<span class="t-relic"' + relicTip(relic) + '>' + esc(G.relics.title(relic.id)) + '</span>' : '')
      + (R.extraRelics || []).map((id) => G.relicDef(id)).filter(Boolean).map((r) => '<span class="t-relic"' + relicTip(r) + '>' + esc(G.relics.title(r.id)) + '</span>').join('')
      + (R.duo() ? '<span class="t-duo"' + tip(G.T('Duo: {0} ({1}). {2}', R.duo().name, R.duo().of.map((s) => G.SETS[s].name).join(' + '), R.duo().desc)) + '>' + G.T('Duo · {0}', esc(R.duo().name)) + '</span>' : '')
      + (R.crownSet() ? '<span class="t-crown" style="--tagc:' + G.SETS[R.crownSet()].css + '"' + tip(G.T('Crown: {0}. {1}', G.SETS[R.crownSet()].crown, G.SETS[R.crownSet()].crownDesc)) + '>' + G.T('Crown · {0}', esc(G.SETS[R.crownSet()].crown)) + '</span>' : '')
      + R.held().map((h) => '<span class="t-' + h.def.tag.toLowerCase() + (h.def.cursed && !G.bane(h.def.id) ? ' clean' : '') + '"'
        + tip(G.T('{0}: {1}', h.def.name + (h.n > 1 ? ' ×' + h.n : '') + (h.def.set ? G.T(' ({0} · {1})', G.SETS[h.def.set].name, G.SLOT_NAMES[h.def.slot]) : ''), h.def.desc) + (h.def.cursed ? (G.bane(h.def.id) ? G.T(' Bane: {0}', h.def.bane) : G.T(' (cleansed)')) : ''))
        + '>' + h.def.name + (h.n > 1 ? ' \u00d7' + h.n : '') + '</span>').join('');
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
    const cor = G.corrupt.on();
    el.bname.textContent = (cor ? G.T('{0} · CORRUPTED', G.boss.name) : G.boss.name) + ' ';
    el.hud.classList.toggle('corrupt', !!cor);
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
    el.callout.querySelector('.small').textContent = ''; // one word, no instructions: the fight explains itself
    retrigger(el.callout, 'show');
  };
  // Mechanics are no longer explained in words during a fight (v1.4a): a boss's body says what is coming.
  U.hint = function () { };
  // A welcome over the camp, the first time you arrive in a session.
  U.campHint = function () {
    if (!G.settings.hints || U.campSeen) return;
    U.campSeen = true;
    el.hint.innerHTML = G.T('Welcome to the Vigil. Spend Sunshards at <b>the Shrine</b> to grow stronger, try your moves on the <b>sparring post</b>, then take a relic at <b>the reliquary</b> and step through <b>the gate</b>.');
    el.hint.classList.add('show', 'calm');
    H.hintT = 10;
  };
  // (v2.9m) back from a run with Sunshards and nothing ever bought: point at the Shrine
  U.shrineHint = function () {
    if (!G.settings.hints || G.practice || !G.meta.newcomer()) return;
    el.hint.innerHTML = G.T('You have <b>{0} Sunshards</b>. Walk back left to <b>the Shrine</b> to spend them.', G.meta.shards);
    el.hint.classList.add('show', 'calm');
    H.hintT = 8;
  };
  // (v1.6b: not shown any more. The camp lists the controls and Tab opens the Moves page; a fight has no help text.)
  U.keysHint = function () {
    U.fights = (U.fights || 0) + 1;
    if (U.fights > 0) return;
    el.hint.innerHTML = G.input.device === 'gamepad'
      ? 'Stick move &middot; <b>A</b> jump &middot; <b>X</b> attack &middot; <b>B</b> dash &middot; <b>Y</b> special &middot; hold <b>LB</b> mend &middot; <b>RT</b> Dawnbreak'
      : (() => { const k = (a) => '<kbd>' + G.input.label(a) + '</kbd>'; return k('left') + k('right') + ' move &middot; ' + k('jump') + ' jump &middot; ' + k('attack') + (G.input.mouse ? '' : ' or click') + ' attack &middot; ' + k('dash') + ' dash &middot; ' + k('flare') + (G.input.mouse ? '' : ' or right click') + ' special &middot; hold ' + k('heal') + ' mend &middot; ' + k('ult') + ' Dawnbreak'; })();
    el.hint.classList.add('show', 'calm');
    H.hintT = 7;
  };
  // (v2.7a) As the hero falls: R starts again at once, without waiting for the defeat screen
  U.againHint = function () {
    const keep = !G.practice && G.relicDef(G.run.relic);
    el.hint.innerHTML = '<kbd>' + G.input.label('retry') + '</kbd> ' + (G.practice ? G.T('try again') : keep ? G.T('again, with {0}', esc(keep.name)) : G.T('new run'));
    el.hint.classList.add('show', 'calm');
    H.hintT = 2;
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

    // (v2.9k) Motes and the two items
    const mo = G.motes.held();
    if (mo !== H.motes) { H.motes = mo; el.moteCount.textContent = mo; }
    const its = G.motes.items(), ik = its.join(',') + (P.charm ? '+c' : '');
    if (ik !== H.items) {
      H.items = ik;
      el.item2.style.display = its.length > 2 ? '' : 'none'; // (v3.0d)
      its.forEach((id, i) => {
        const slot = el['item' + i], def = id && G.motes.item(id);
        slot.classList.toggle('empty', !def);
        slot.classList.toggle('passive', !!(def && def.passive));
        slot.querySelector('b').textContent = def ? def.name : '';
        slot.style.setProperty('--icol', def ? 'rgb(' + def.col + ')' : '');
      });
    }
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
    const mend = !ready ? '' : (P.hp < P.maxHp ? 'both' : 'lance') + G.input.device + G.input.mouse;
    if (mend !== H.mend) {
      H.mend = mend;
      el.mend.classList.toggle('on', ready);
      if (ready) {
        const pad = G.input.device === 'gamepad';
        el.mend.innerHTML = (pad ? '<kbd>Y</kbd>' : '<kbd>' + G.input.label('flare') + '</kbd>' + (G.input.mouse ? '' : G.T(' or right click'))) + ' ' + (G.ja ? G.hero().specialName : G.hero().verb)
          + (P.hp < P.maxHp ? G.T(' &middot; hold {0} to mend', pad ? '<kbd>LB</kbd>' : '<kbd>E</kbd>') : '');
      }
    }

    // Dawnbreak and Flow
    const ult = Math.round(P.ult || 0);
    if (ult !== H.ult) { H.ult = ult; el.ultFill.style.width = ult + '%'; }
    const rdy = ult >= 100 && !P.dead;
    if (rdy !== H.ready) { H.ready = rdy; el.ult.classList.toggle('ready', rdy); }
    // the crown, once a set has opened one
    const crn = G.state === 'hub' ? null : G.run.crownSet();
    if (crn !== H.cset) {
      H.cset = crn; H.cfill = -1;
      el.crown.classList.toggle('off', !crn);
      if (crn) { el.crownName.textContent = G.SETS[crn].crown.toUpperCase(); el.crown.style.setProperty('--ccol', G.SETS[crn].css); }
    }
    if (crn) {
      const cf = Math.round(G.run.crown * 100);
      if (cf !== H.cfill) { H.cfill = cf; el.crownFill.style.width = cf + '%'; el.crown.classList.toggle('ready', cf >= 100); }
    }
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
    // (a boss that has thrown off its phases: Kairo's third, kairo.js)
    if (!!B.unbound !== H.unbound) { H.unbound = !!B.unbound; document.getElementById('bhud').classList.toggle('unbound', H.unbound); }
    const po = Math.round(G.clamp(B.poise / B.poiseMax, 0, 1) * 100);
    if (po !== H.poise) { H.poise = po; el.pfill.style.width = po + '%'; }
    if (B.staggered !== H.broken) { H.broken = B.staggered; el.pbar.classList.toggle('broken', B.staggered); }
    // (v3.1i) dim while it takes nothing, the few seconds after a stagger
    const rest = !B.staggered && B.t < (B.graceAt || 0);
    if (rest !== H.rest) { H.rest = rest; el.pbar.classList.toggle('rest', rest); }

    const ts = U.fmtTime(G.time);
    if (ts !== H.timer) { H.timer = ts; el.timer.textContent = ts; }
  };

  // ------------------------------------------------------------------ results
  function statsHtml(rows) {
    return rows.map((r) => '<div><span class="n">' + r[0] + '</span><span class="l">' + r[1] + '</span></div>').join('');
  }

  // (v2.7a) The recap under a result: where this fight's damage came from, what hurt most, and (at the
  // end of a run) the build it was won or lost with and the run's own count.
  const attackWords = (a) => (a || '').replace(/\d+$/, '').replace(/([A-Z])/g, ' $1').toLowerCase();
  // (v3.1a/b) an attack is named as the Journal names it, when it has an entry there
  const atkName = (bid, a) => {
    const e = a && ((G.JOURNAL || {})[bid] || {})[a.replace(/\d+$/, '')];
    return e && e.name ? e.name : attackWords(a);
  };
  const topOf = (taken) => Object.entries(taken).sort((x, y) => y[1] - x[1])[0];
  function hurtMost(taken, run) {
    const top = topOf(taken);
    if (!top) return '';
    const [bid, atk] = top[0].split(':'), B = G.bosses[bid];
    const what = esc(atkName(bid, atk) || G.T('body'));
    const by = B ? G.T('{0}’s {1}', esc(B.short.replace(/^The /, 'the ')), what) : G.T('its {0}', what);
    return '<p class="rline">' + (run ? G.T('This run, hurt most by {0} <b>({1})</b>', by, top[1]) : G.T('Hurt most by {0} <b>({1})</b>', by, top[1])) + '</p>';
  }
  function recapHtml(full) {
    const R = G.run, f = R.fight || { dealt: {}, taken: {} };
    const total = Object.values(f.dealt).reduce((a, b) => a + b, 0);
    let html = '';
    if (total > 0) {
      html += '<div class="rbars">' + Object.entries(f.dealt).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => {
        const pc = Math.round(100 * v / total);
        return '<div class="rb"><span class="rk">' + esc(G.T(k)) + '</span><span class="rt"><i style="width:' + pc + '%"></i></span><span class="rv">' + pc + '%</span></div>';
      }).join('') + '</div>';
    }
    html += hurtMost(f.taken, false);
    if (full && !G.practice) {
      const relic = G.relicDef(R.relic), held = R.held();
      const all = Object.values(R.stats.dealt).reduce((a, b) => a + b, 0);
      const won = R.beaten.length, ft = topOf(f.taken), rt = topOf(R.stats.taken);
      html += '<p class="rline">' + G.T('{0} · {1} damage this run', won ? (won === 1 ? G.T('{0} trial won', won) : G.T('{0} trials won', won)) : G.T('No trial won'), all) + '</p>';
      if (rt && (!ft || ft[0] !== rt[0])) html += hurtMost(R.stats.taken, true); // (only when it is not this fight's)
      html += '<p class="rbuild">' + (relic ? '<span class="t-relic">' + esc(G.relics.title(relic.id)) + '</span>' : '')
        + (R.crownSet() ? '<span style="--tagc:' + G.SETS[R.crownSet()].css + '">' + G.T('Crown · {0}', esc(G.SETS[R.crownSet()].crown)) + '</span>' : '')
        + (R.duo() ? '<span class="t-duo">' + G.T('Duo · {0}', esc(R.duo().name)) + '</span>' : '')
        + held.map((h) => '<span class="t-' + h.def.tag.toLowerCase() + '">' + esc(h.def.name) + (h.n > 1 ? ' ×' + h.n : '') + '</span>').join('') + '</p>';
    }
    return html;
  }

  // What landed the last blow, in words: the boss's attack by name, or the omen that did it.
  function felledBy(P, B) {
    const h = P.lastHit || {}, omen = { zone: 'storm', meteor: 'embers', orb: 'hunted' }[h.kind];
    if (h.attack) {
      const name = h.attack === 'reckoning' ? (B.reckonName || G.T('Reckoning')).toLowerCase() : atkName(B.id, h.attack);
      return G.T('The last blow was its {0}.', name);
    }
    if (omen && G.omen(omen)) return G.T('The last blow came from the omen, {0}.', G.omenDef(omen).name);
    return '';
  }

  U.showDead = function () {
    const P = G.player, B = G.boss;
    const pct = Math.max(1, Math.ceil(B.hp / B.maxHp * 100));
    const lm = G.lastMotes;
    el.deadLead.textContent = [G.practice ? G.T('Practice.') : G.T('You fell in trial {0}.', G.roman(G.run.trial)), felledBy(P, B),
      G.T('{0} endured with {1}% of its strength, in phase {2}.', B.short, pct, ROMAN[B.phase]),
      lm && lm.motes ? G.T('Your {0} Motes became {1} Sunshards.', lm.motes, lm.shards) : '',
      !G.practice && G.meta.newcomer() ? G.T('Spend Sunshards at the Shrine in camp to grow stronger.') : ''].filter(Boolean).join(G.ja ? '' : ' ');
    el.deadFill.style.transition = 'none';
    el.deadFill.style.width = '100%';
    void el.deadFill.offsetWidth;
    el.deadFill.style.transition = '';
    el.deadFill.style.width = pct + '%';
    el.deadStats.innerHTML = statsHtml([
      [U.fmtTime(G.time), G.T('Time')],
      [P.stats.dmg, G.T('Damage dealt')],
      [P.stats.perfect, G.T('Perfect dodges')],
      ['+' + (G.lastShards || 0), G.T('Sunshards')],
    ]);
    el.deadStats.lastElementChild.firstElementChild.classList.add('gold');
    el.deadRecap.innerHTML = G.practice ? '' : recapHtml(true);
    el.deadTip.textContent = G.pick(TIPS.concat(B.tips || [], B.tips || []));
    const keep = !G.practice && G.relicDef(G.run.relic);
    document.querySelector('#s-dead [data-act=retry]').innerHTML = (G.practice ? G.T('Try again') : keep ? G.T('Again, with {0}', keep.name) : G.T('New run')) + ' <kbd>R</kbd>';
    document.querySelector('#s-dead [data-act=camp]').textContent = keep ? G.T('Back to camp, new relic') : G.T('Back to camp');
    U.hud(false);
    U.lockUntil = performance.now() + 500;
    U.show('dead');
  };

  // ---- pairs: a boon's card names the pairs it belongs to, underlined, and the pair's effect shows
  // as a tooltip over the name (on the focused card too, when playing with a gamepad)
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  U.esc = esc;
  // (v2.7a) html to plain text, for a tooltip
  function plain(s) { const d = document.createElement('div'); d.innerHTML = String(s); return d.textContent.replace(/\s+/g, ' ').trim(); }
  U.pairTip = function (p) {
    return '<u class="pairtip" data-tip="' + esc(G.T('{0} ({1}): {2}', p.name, p.of.map((id) => G.boonDef(id).name).join(' + '), p.desc)) + '">' + esc(p.name) + '</u>';
  };
  // A set boon's card: its set and slot on the tag line; under the text, the set's rule, what it
  // would push out of its slot, and how near it brings the crown.
  U.boonTag = (b) => (b.set ? (G.ja ? G.SETS[b.set].name : b.tag) + ' · ' + G.SLOT_NAMES[b.slot] : b.duo ? G.T('Duo · {0}', b.of.map((s) => G.SETS[s].name).join(' + ')) : G.T(b.tag)); // (the tag itself stays English: it is a class name)
  U.setNote = function (b) {
    if (!b.set || G.boon(b.id)) return '';
    const R = G.run, S = G.SETS[b.set], old = R.slots()[b.slot];
    const n = R.setCount(b.set) + (old && G.boonDef(old).set === b.set ? 0 : 1);
    return '<span class="setrule">' + esc(S.rule) + '</span>'
      + (old ? '<span class="setswap">' + G.T('Replaces {0}.', esc(G.boonDef(old).name)) + '</span>' : '')
      + (old && R.crownSet() && R.crownSet() !== b.set && G.boonDef(old).set === R.crownSet() ? '<span class="setswap">' + G.T('Your crown {0} goes dark.', esc(G.SETS[R.crownSet()].crown)) + '</span>' : '')
      + '<span class="setcrown">' + (n >= 3 ? (R.crownSet() === b.set ? G.T('Keeps the crown {0}.', esc(S.crown)) : G.T('Opens the crown {0}.', esc(S.crown)))
        : G.T('{0} of 3 toward the crown {1}.', n, esc(S.crown))) + '</span>'
      + U.duoNote(b);
  };
  // (v2.6c) what a set boon does to the duo: wakes one, or puts the one you have to sleep
  U.duoNote = function (b) {
    const R = G.run, old = R.slots()[b.slot], now = R.duo();
    const after = R.duoOf((s) => R.setCount(s) + (s === b.set ? 1 : 0) - (old && G.boonDef(old).set === s ? 1 : 0));
    if (after && after !== now) return '<span class="setcrown duonote">' + G.T('Wakes the duo {0}: {1}', esc(after.name), esc(after.desc)) + '</span>';
    if (now && after !== now) return '<span class="setswap">' + G.T('Your duo {0} goes quiet.', esc(now.name)) + '</span>';
    // (v2.7a) no duo yet: how near this brings the nearest one that has this set in it
    if (!now && !(old && G.boonDef(old).set === b.set)) {
      const cnt = (s) => R.setCount(s) + (s === b.set ? 1 : 0) - (old && G.boonDef(old).set === s ? 1 : 0);
      const near = G.DUOS.filter((d) => d.of.includes(b.set) && cnt(b.set) <= 2)
        .map((d) => ({ d, other: d.of.find((s) => s !== b.set) })).sort((x, y) => cnt(y.other) - cnt(x.other))[0];
      if (near && cnt(near.other) > 0) return '<span class="setcrown duonote">' + G.T('Toward the duo {0}: {1}.', esc(near.d.name), near.d.of.map((s) => G.T('{0} of 2 {1}', Math.min(2, cnt(s)), G.SETS[s].name)).join(LIST)) + '</span>';
    }
    return '';
  };
  U.pairNote = function (b) {
    if (b.pair) return '';
    const notes = [];
    for (const p of G.pairsOf(b.id)) {
      if (G.boon(p.id)) continue;
      const other = G.boonDef(p.of.find((id) => id !== b.id));
      if (other.heroes && !other.heroes.includes(G.run.hero)) continue;
      notes.push(G.boon(other.id) && !G.boon(b.id) ? G.T(' With your {0}, it opens the pair {1}.', esc(other.name), U.pairTip(p))
        : G.T(' Pairs with {0}: {1}.', esc(other.name), U.pairTip(p)));
    }
    return notes.join('');
  };

  // (v2.8a) a costume this win unlocked (costumes.js) is named first
  function costumeNote(res) {
    if (!res.costume) return;
    el.winBest.textContent = G.T('Mastery: the {0} costume is yours (the Wardrobe, in the Hall of Echoes). ', res.costume.name) + el.winBest.textContent;
  }
  U.showWin = function (res) {
    const P = G.player;
    el.gradeLetter.textContent = res.grade;
    el.gradeTitle.textContent = res.title;
    el.gradeSub.textContent = G.T('{0} difficulty', G.diff().name);
    el.winStats.innerHTML = statsHtml([
      [U.fmtTime(G.time), G.T('Time')],
      [P.stats.hits, G.T('Hits taken')],
      [P.stats.perfect, G.T('Perfect dodges')],
      ['+' + res.meta.shards, G.T('Sunshards')],
      ...(res.motes ? [['+' + res.motes, G.T('Motes')]] : []),
    ]);
    Array.from(el.winStats.children).forEach((d) => { const l = d.lastElementChild.textContent; if (l === G.T('Sunshards')) d.firstElementChild.classList.add('gold'); if (l === G.T('Motes')) d.firstElementChild.classList.add('mote'); });
    el.winRecap.innerHTML = recapHtml(!!res.done && !res.champ && !res.corrupt);
    const R = G.run, waiting = R.corrupted.length;
    if (res.champ) {
      // the Champion's duel (champion.js): not a trial; back to the road it was found on
      const feats = res.meta.lines.filter((l) => l.indexOf('Feat: ') === 0).map(featLine).join(' · ');
      el.winOver.textContent = G.T('The First Light, answered');
      el.winBest.textContent = res.meta.relic ? G.T('Trophy won: {0} joins the relics you can be offered.', res.meta.relic.name) + (feats ? ' ' + feats : '')
        : res.meta.lines.map(featLine).join(' · ');
      el.winPick.textContent = G.T('{0} · trial {1} of {2} still lies ahead', res.hilt ? G.T('His hilt is yours for the rest of this run') : G.T('He nods'), G.roman(res.trial + 1), G.roman(G.RUN_FIGHTS));
      document.querySelector('#s-win [data-act=endrun]').textContent = G.T('End the run, return to camp');
      el.winCards.style.display = 'none';
      Array.from(el.winCards.children).forEach((c) => { c.style.display = 'none'; });
      el.rerollItem.style.display = 'none';
      const ri = document.getElementById('restItem');
      ri.style.display = ''; ri.textContent = G.T('Return to the road');
      costumeNote(res);
      U.hud(false);
      U.lockUntil = performance.now() + 700;
      U.show('win');
      return;
    }
    el.winOver.textContent = res.sol ? G.T('The sun is yours') : res.corrupt ? G.T('The corruption is cleansed') : G.T('{0} · trial {1} of {2}', res.wonNow ? G.T('The run is won') : G.T('Victory'), G.roman(res.trial), G.roman(G.RUN_FIGHTS));
    // feats done in this fight are always named, whatever else there is to say
    const feats = res.meta.lines.filter((l) => l.indexOf('Feat: ') === 0).map(featLine).join(' · ');
    el.winBest.textContent = res.meta.relic ? G.T('Trophy won: {0} joins the relics you can be offered.', res.meta.relic.name) + (feats ? ' ' + feats : '')
      : res.meta.record ? G.T('Your fastest win against {0} on {1}: {2}.', G.boss.short, G.diff().name, U.fmtTime(res.meta.record)) + (feats ? ' ' + feats : '')
      : res.meta.lines.length ? res.meta.lines.map(featLine).join(' · ')
      : res.newBest ? G.T('New fastest first trial on {0}.', G.diff().name)
      : res.newDepth ? G.T('Your deepest trial yet on {0}.', G.diff().name) : '';
    // The boon (or a corrupted portal's relic) is taken, and the next boss chosen, on the road between
    // trials (rest.js), not here. A portal that has just turned corrupted is named.
    const turned = res.newCorrupt && G.bosses[res.newCorrupt] ? G.T('A portal has turned corrupted: {0}', G.bosses[res.newCorrupt].short) : '';
    el.winPick.textContent = [
      res.corrupt ? G.T('A second relic waits on the road') : res.sol ? G.T('The run is won') : res.trial === G.TRIALS ? G.T('Six trials won: the last portal is open') : res.done ? G.T('All {0} trials won', G.roman(G.RUN_FIGHTS)) : G.T('Trial {0} of {1} lies ahead', G.roman(res.trial + 1), G.roman(G.RUN_FIGHTS)),
      turned || (res.done && waiting ? (waiting > 1 ? G.T('Corrupted portals still wait') : G.T('A corrupted portal still waits')) : ''),
    ].filter(Boolean).join(' \u00b7 ');
    const goOn = !res.done || waiting > 0;
    document.querySelector('#s-win [data-act=endrun]').textContent = !goOn ? G.T('Return to camp') : res.done ? G.T('Leave the run won, return to camp') : G.T('End the run, return to camp');
    el.winCards.style.display = 'none';
    Array.from(el.winCards.children).forEach((c) => { c.style.display = 'none'; });
    el.rerollItem.style.display = 'none';
    const restItem = document.getElementById('restItem');
    restItem.style.display = goOn ? '' : 'none';
    restItem.textContent = res.corrupt ? G.T('Rest, and take a relic') : res.done ? G.T('Rest at the crossroads') : G.T('Rest, and choose a boon');
    costumeNote(res);
    U.hud(false);
    U.lockUntil = performance.now() + 700;
    U.show('win');
  };
  // (v3.0a) The end of a run won, after the dawn (epilogue.js): what the run came to, the bosses in the
  // order they fell (a corrupted one cleansed is marked), the build, and what the win unlocked.
  // (v3.0c) what each boss does harder from Ascension +3 (G.twist(): the boss files)
  const TWIST = {
    warden: G.T('Its broken hands come back twice as fast.'), wolf: G.T('Its fire burns half again as long.'),
    knight: G.T('His thrown sword comes back to him sooner.'), kairo: G.T('His Gathered Sun bar is a quarter longer.'),
    champion: G.T('He feints from the start, and more often.'), sol: G.T('The cold of the eclipse sets in faster.'),
    mage: G.T('It fires one more ice shard.'), assassin: G.T('Its mirror attack sends one more image.'),
    leviathan: G.T('It bites once more before it sticks fast.'),
  };
  U.TWIST = TWIST;
  U.showEnd = function (res) {
    const R = G.run, s = R.sum || { t: G.time, hits: 0, perfect: 0, shards: 0 }, H = G.hero();
    const fromMotes = Math.floor((R.motes || 0) / (G.motes.PER_SHARD || 10));
    $('endOver').textContent = H.name + ' \u00b7 ' + G.diff().name;
    $('endStats').innerHTML = statsHtml([
      [U.fmtTime(s.t), G.T('Fight time')],
      [s.hits, G.T('Hits taken')],
      [s.perfect, G.T('Perfect dodges')],
      ['+' + (s.shards + fromMotes), G.T('Sunshards')],
    ]);
    $('endStats').lastElementChild.firstElementChild.classList.add('gold');
    const road = R.beaten.filter((id) => id !== 'sol').map((id, i) => {
      const b = G.bosses[id], cor = R.cleansed.includes(id);
      return '<span' + (cor ? ' class="cor"' : '') + '><i>' + G.roman(i + 1) + '</i>' + esc(b ? b.short.replace(/^The /, '') : id) + (cor ? '<b>' + G.T('CORRUPTED') + '</b>' : '') + '</span>';
    });
    if (R.champWon && G.bosses.champion) road.push('<span><i>\u2726</i>' + esc(G.bosses.champion.short) + '</span>');
    road.push('<span class="sol"><i>☀</i>' + G.T('Sol') + '</span>');
    $('endRoad').innerHTML = road.join('');
    const relic = G.relicDef(R.relic), held = R.held();
    $('endBuild').innerHTML = (relic ? '<span class="t-relic">' + esc(G.relics.title(relic.id)) + '</span>' : '')
      + (R.crownSet() ? '<span style="--tagc:' + G.SETS[R.crownSet()].css + '">' + G.T('Crown · {0}', esc(G.SETS[R.crownSet()].crown)) + '</span>' : '')
      + (R.duo() ? '<span class="t-duo">' + G.T('Duo · {0}', esc(R.duo().name)) + '</span>' : '')
      + held.map((h) => '<span class="t-' + h.def.tag.toLowerCase() + '">' + esc(h.def.name) + (h.n > 1 ? ' ×' + h.n : '') + '</span>').join('');
    const un = [];
    if (res.solFirst) un.push(G.T('Dawn at the Vigil: the camp wakes up to morning.'));
    if (res.solHeroFirst) un.push(G.T('A sun crown over {0} in the Hall of Echoes.', H.name));
    if (res.solHeroFirst && G.FORMS[H.id]) un.push(G.T('A second weapon for {0}, the {1}: take it from the weapon rack in the yard.', H.name, G.FORMS[H.id].formName)); // (v3.0e)
    if (res.ascBeat) {
      un.push(G.T('Ascension +{0} beaten with {1}.', res.ascBeat, H.name));
      // (v3.0d) what that step gives the hero
      const rel = G.HERO_RELICS.find((r) => r.hero === H.id), bn = G.BOONS.find((b) => b.asc && b.heroes && b.heroes[0] === H.id);
      un.push(['', G.T('The Ascendant costume for {0} (the Wardrobe, in the Hall of Echoes).', H.name),
        G.T('{0}’s own relic, {1}, can be offered at the reliquary.', H.name, rel ? rel.name : ''),
        G.T('A third item slot for {0} (key {1}).', H.name, G.input.label('item3')),
        G.T('{0}’s own boon, {1}, can be offered.', H.name, bn ? bn.name : ''),
        G.T('{0} is The Unfallen: a golden aura, and a star over their alcove in the Hall.', H.name)][res.ascBeat]);
    }
    if (res.ascOpened) un.push(G.T('Ascension +{0} for {1}: choose it at the Brazier.', res.ascOpened, H.name));
    if (res.costume) un.push(G.T('The {0} costume (the Wardrobe, in the Hall of Echoes).', res.costume.name));
    if (res.meta.relic) un.push(G.T('Trophy: {0} joins the relics you can be offered.', res.meta.relic.name));
    for (const l of res.meta.lines) if (l.indexOf('Feat: ') === 0) { const fm = /^Feat: ([\s\S]*?)\s*\+\d+$/.exec(l); un.push(fm ? G.T('Feat: {0}', fm[1]) : l); }
    $('endUnlocks').innerHTML = un.length ? un.map((u) => '<li>' + esc(u) + '</li>').join('') : '<li class="none">' + G.T('Nothing new this time.') + '</li>';
    U.hud(false);
    U.lockUntil = performance.now() + 900;
    U.show('end');
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
      c.querySelector('.ctag').textContent = b.pair ? G.T('Pair · {0}', b.of.map((id) => G.boonDef(id).name).join(' + ')) : U.boonTag(b);
      c.querySelector('.cname').textContent = b.name;
      c.querySelector('.cdesc').innerHTML = esc(b.desc) + (own ? G.T(' You hold {0}.', own) : '') + U.pairNote(b) + U.setNote(b);
    });
    el.rerollItem.style.display = G.run.rerolls > 0 && offer.length ? '' : 'none';
    el.rerollItem.textContent = G.T('Redraw boons ({0} left)', G.run.rerolls);
    if (U.current === 'win') U.setFocus(0);
  };
})();
