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
    polish: { values: [false, true], label: (v) => (v ? 'On' : 'Off') },
    hints: { values: [false, true], label: (v) => (v ? 'On' : 'Off') },
    firstFoe: { values: ['random'].concat(G.BOSS_IDS), label: (v) => (G.bosses[v] ? G.bosses[v].short : 'Random') },
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
      'practiceOver', 'keyList', 'resetItem', 'movesOver', 'movesTitle', 'movesBody', 'movesFoot', 'ult', 'ultFill', 'ultKey', 'crown', 'crownFill', 'crownName', 'crownKey', 'flow', 'flowRank', 'flowFill', 'omen', 'shardCount', 'shrineLead', 'shrineList', 'shrineTrophies', 'rerollItem', 'featsLead', 'featsBody', 'featsTabs', 'helpBody', 'helpTabs', 'fountainLead', 'fountainList', 'smithLead', 'smithList', 'merchLead', 'merchList', 'items', 'item0', 'item1', 'motes', 'moteCount', 'continueItem', 'quickItem', 'deadRecap', 'winRecap', 'dailyItem', 'journalTabs', 'journalBody']) el[id] = $(id);
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
  // (v2.7a) Menus you come back to open where you left the cursor (the result and choice screens always
  // open on their first item)
  const REMEMBER = ['title', 'pause', 'settings', 'help', 'keys', 'practice', 'shrine', 'how', 'feats', 'moves', 'journal'];
  U.mem = {};
  U.setFocus = function (i) {
    document.body.classList.toggle('pad', G.input.device === 'gamepad');
    const items = U.items();
    U.focus = G.clamp(i, 0, items.length - 1);
    if (REMEMBER.includes(U.current)) U.mem[U.current] = U.focus;
    items.forEach((it, k) => it.classList.toggle('focus', k === U.focus));
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
      c.querySelector('.cdesc').textContent = r.desc + ' It awakens three times in a run.';
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
    const got = G.TROPHIES.filter((t) => M.trophy[t.boss]);
    el.shrineTrophies.textContent = 'Trophy relics ' + got.length + ' of ' + G.TROPHIES.length
      + (got.length ? ': ' + got.map((t) => t.name).join(', ') + '.' : '. Beat a boss in your last trial, at its strongest, and its relic joins those you can be offered.');
  };
  U.showShrine = function () { U.fillShrine(); U.show('shrine', true); };
  // ---- the Cleansing Fountain (rest.js): one row for each corrupted boon whose bane you still carry
  U.fillFountain = function () {
    const R = G.run, banes = R.banes(), cost = R.cleanseCost();
    el.fountainLead.innerHTML = 'You hold <b style="color:var(--mote)">' + G.motes.held() + '</b> Motes. Each cleansing this run costs twice the last.';
    Array.from(el.fountainList.children).forEach((row, i) => {
      const id = banes[i], b = id && G.boonDef(id);
      row.style.display = b ? '' : 'none';
      if (!b) return;
      row.querySelector('.uname').textContent = b.name;
      row.querySelector('.udesc').textContent = 'Purge: ' + b.bane;
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
    el.smithLead.innerHTML = 'You hold <b style="color:var(--mote)">' + G.motes.held() + '</b> Motes. One more of a boon you hold, even past its limit. Each tempering this run costs twice the last.';
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
    const hands = it.map((id) => (id ? G.motes.item(id).name : 'empty')).join(', ');
    el.merchLead.innerHTML = 'You hold <b style="color:var(--mote)">' + held + '</b> Motes. In your hands: ' + U.esc(hands) + '.';
    Array.from(el.merchList.children).forEach((row, i) => {
      const r = rows[i];
      row.style.display = r ? '' : 'none';
      if (!r) return;
      row.querySelector('.uname').textContent = r.name + (r.kind === 'item' ? ' \u00b7 item' : r.kind === 'boon' ? ' \u00b7 boon' : '');
      row.querySelector('.udesc').textContent = r.why && !r.sold ? r.why + '. ' + r.desc : r.desc;
      row.querySelector('.ucost').textContent = r.sold ? 'Sold' : r.price + ' \u25c7';
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
    { name: 'How a fight works', lead: 'One hero, one boss, one arena. A run is seven of them, one for each boss: the first at random, then each one you choose at its portal, until you win or fall.', steps: [
      '<b>The boss has three phases.</b> Its health bar is cut in three. Each time a third is gone it changes: new attacks, less rest.',
      '<b>Red-orange is a warning.</b> It marks where an attack will land. When it fills and flashes, the attack fires.',
      '<b>Leave the marked place, or dash through the attack.</b> A dash passes straight through anything.',
      '<b>Strike between its attacks.</b> Every hit fills your Starlight, your Flow, your Dawnbreak and the boss’s stagger bar.',
      '<b>Fill the stagger bar</b> and the boss is thrown down, open, for a few seconds. Save your biggest blows for then.',
      '<b>The Warden wards itself twice</b> and gathers a blast: its Eclipse. Break the ward before the ring closes on it, while its hands come down on you in turn.',
      '<b>When its health is gone it goes down and stays down.</b> Press <kbd>' + G.input.label('heal') + '</kbd> close to it for your hero’s finishing blow, or just hit it to end the fight plainly. Then you are graded, paid in Sunshards and offered a boon. Then the next trial: another boss, harder.',
      '<b>When your health is gone the run ends</b> and you wake in the Vigil. What you bought at the Shrine is still yours.',
    ] },
    { name: 'Attacking', lead: 'What your weapon does, and the blows that are worth more.', words: [
      ['Chain', 'Your attacks in a row. Hold the button to keep it going; a dash does not break it.'],
      ['Finisher', 'The last blow of a chain, drawn in gold. It hits hardest and fills the most Starlight and stagger.'],
      ['Aim', 'Hold up or down to strike that way. With the sword or the maul, striking down in the air bounces you off what you hit.'],
      ['Thrust', 'Sword or maul: a blow thrown straight out of a dash deals 40% more.'],
      ['Special', 'Your hero’s second attack. It costs one segment of Starlight.'],
      ['Stagger', 'The thin bar under the boss’s health. Fill it with hits and the boss is thrown down and cannot act.'],
      ['Sunder', 'The first finisher on a staggered boss: 2.2 times the damage. One for each stagger.'],
      ['Riposte', 'The first weapon hit within 1.5 seconds of a perfect dodge: double damage.'],
      ['Clash', 'A finisher, thrust or heavy arrow that lands just as the Veil’s or the Knight’s swing is about to: the swing is stopped dead and you are pushed back unharmed.'],
    ] },
    { name: 'Your meters', lead: 'The bars at the top left, and what fills them.', words: [
      ['Health', 'The diamonds. Most attacks cost one; a few, marked by a tell, cost two.'],
      ['Starlight', 'Three segments, filled by landing hits and by perfect dodges. Spend one on your special or on mending.'],
      ['Mend', 'Stand still and hold the button: one segment of Starlight becomes one health. Jumping or dashing cancels it.'],
      ['Flow', 'A rank from C to SS that climbs as you hit and dodge without being hit. Each rank adds 3% damage. It drains when you stop, and a blow taken costs most of it.'],
      ['Dawnbreak', 'Your greatest attack. Its bar fills as you deal damage; press once when it is full. Nothing can touch you while it plays, and it breaks a ward outright.'],
      ['Flourish', 'A salute that leaves you open for most of a second. Finishing one raises Flow and Dawnbreak.'],
      ['Brazen', 'A flourish finished while the boss is in the middle of an attack. Worth three times as much.'],
    ] },
    { name: 'Staying alive', lead: 'Everything that keeps you standing.', words: [
      ['Warning', 'Red-orange on the ground or in the air: where an attack will land. It fills, flashes, then fires.'],
      ['Dash', 'A burst of speed that nothing can hit. It has a short rest before it can be used again.'],
      ['Perfect dodge', 'A dash through an attack at the last moment. Time slows, Starlight fills by a third of a segment and your next hit is a Riposte.'],
      ['Tell', 'A small thing a boss does before an attack that says which form is coming: how fast the Veil cuts, how the Magus holds its staff. Learn them and you know sooner than the warning shows.'],
      ['Last Light', 'The first time in a fight that a blow leaves you on one health: time slows, nothing can hurt you for 2.4 seconds, and Dawnbreak and Starlight both rise.'],
      ['Wardstone, Second Dawn', 'Some relics and boons turn a blow aside or save you once. The pause menu lists what you carry.'],
    ] },
    { name: 'Bosses', lead: 'Words for what a boss does.', words: [
      ['Phase', 'A third of a boss’s health, marked I, II, III beside its name. Each one brings new attacks.'],
      ['Reckoning', 'The Warden only (it calls it Eclipse). Once in phase I and once in phase II it goes to the middle, wards itself and gathers a blast while a red ring closes on it for 6.5 seconds. Its hands guard it: they come down on you in turn, and each sends a wave along the floor.'],
      ['Ward', 'The shell round the Warden during its Reckoning. Your hits go to it, shown as a gold arc. Break it and the Warden is staggered and Dawnbreak gains a quarter of its bar.'],
      ['Tell', 'See Staying alive. Each boss tells in its own way: the Veil by tempo, the Knight by its foot and blade, the Magus by its staff, the Warden by its eye and fist.'],
      ['One last push', 'Called out when a boss is under a tenth of its health.'],
      ['Omen', 'From the second trial a fight carries an omen that changes it (a storm, falling embers, a faster or tougher boss); from the sixth, two. Each adds 25% Sunshards.'],
    ] },
    { name: 'A run', lead: 'From the gate to the fall.', words: [
      ['Trial', 'One fight of a run. Each trial is against another boss and is harder than the last.'],
      ['Portal', 'After each trial, at the crossroads, walk into a boss\u2019s portal to fight it next. A beaten boss\u2019s portal is sealed.'],
      ['Corrupted', 'Now and then a beaten boss\u2019s portal turns corrupted: an optional, far harder fight that is not a trial. Win it for a second relic and three times the Sunshards; fall in it and the run ends.'],
      ['Relic', 'One power chosen at the reliquary before the gate. It lasts the whole run, and stays with you if you fall and go again; it is given up only by going back to the camp.'],
      ['Boon', 'A smaller power chosen after each victory. They add up through the run.'],
      ['Pair', 'A gold boon offered only once you hold both of the two boons it joins. A card that would open one says so.'],
      ['Redraw, banish', 'Each run has one redraw of the offering, at the standing stone (the Shrine sells more), and, once the Shrine sells you Banishment, a banish: at a plinth, the flourish key strikes that boon from the run and draws another in its place.'],
      ['Sets and duos', 'Ember, Storm, Tide and Gloam boons each fill a slot: Strike, Special, Dash, Mend or Jump. Three of one set open its crown; two each of two sets wake their duo, which works for as long as both sets stay slotted.'],
      ['Corrupted boon', 'A crimson boon, far stronger than the rest, with a drawback written under it. Once a boss has fallen, one sometimes takes a card\u2019s place.'],
      ['Cleansing Fountain', 'At the crossroads. Spend Sunshards to purge a corrupted boon\u2019s drawback and keep the rest of it. Each use in a run costs twice the last.'],
      ['Grade', 'S, A, B or C for a victory. Every blow you take lowers it, and so does a fight that runs past two and a half minutes; perfect dodges raise it. A better grade pays more.'],
      ['Sunshards', 'What every fight pays, win or lose. They are kept between runs and spent at the Shrine.'],
      ['Trophy', 'The boss you beat in your last trial, at its strongest, adds its relic to those the reliquary can offer. One a run.'],
      ['Feat', 'One of eighteen things worth doing once, each paying Sunshards. The Tally stone in the Vigil lists them.'],
    ] },
    { name: 'The Vigil', lead: 'Your camp, from left to right.', words: [
      ['The old bell, the lantern', 'Toys. Keep the bell ringing; keep the lantern off the ground.'],
      ['Hall of Echoes', 'An alcove for each hero. Use one to play as that hero.'],
      ['The Tally', 'A standing stone with a mark for every feat.'],
      ['The Shrine', 'Spend Sunshards on things that last: health, damage, a fourth relic or boon to choose from.'],
      ['Sparring post', 'It cannot be hurt for good. Try every attack on it; Dawnbreak charges three times as fast here.'],
      ['The Brazier', 'Its flame is the difficulty: more health and longer warnings, or fewer and shorter.'],
      ['The Proving Ring', 'Practise against any boss you choose, from any phase, with nothing at stake. A real run never tells you who comes next.'],
      ['The Reliquary, the Gate', 'Take a relic from a plinth, then step through the gate to begin the run.'],
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
      el.journalBody.innerHTML = '<h3>???</h3><p class="lead">You haven\u2019t met this one yet.</p>';
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
      const when = (ph.length ? 'Phase ' + ph.map((p) => ROMAN[p]).join(', ') : corrupt(a) ? 'Corrupted only' : 'Its own moment')
        + (ph.length && corrupt(a) ? ' \u00b7 also corrupted' : '');
      if (!r.seen) return '<div class="jent unseen"><b>? ? ?</b><i>' + when + '</i><p>Not met yet.</p></div>';
      seen++;
      return '<div class="jent"><b>' + esc(e.name) + '</b><i>' + when + '</i><p>' + esc(e.text) + '</p>'
        + '<span class="jst">met ' + r.seen + (r.hit ? ' \u00b7 <em>hit you ' + r.hit + '</em>' : ' \u00b7 never hit you') + (r.fell ? ' \u00b7 <em class="fell">felled you ' + r.fell + '</em>' : '') + '</span></div>';
    });
    const kills = (G.meta.kills || {})[b] || 0;
    el.journalBody.innerHTML = '<h3>' + esc(B.name) + '</h3><p class="lead">' + seen + ' of ' + ids.length + ' moves written down \u00b7 beaten ' + kills + (kills === 1 ? ' time' : ' times')
      + ' \u00b7 its moves have hit you ' + hits + (hits === 1 ? ' time' : ' times') + (falls ? ', felled you ' + falls : '') + '</p><div class="jlist">' + rows.join('') + '</div>';
    Array.from(el.journalTabs.children).forEach((it) => it.classList.toggle('open', it.dataset.act === 'jour' + i));
  };
  // ---- the Tally: a list of the bosses (and the camp) on the left, with how many of each one's feats are
  // done; the one in focus shows its feats on the right, done or not, and what each pays. (v2.9o: was every
  // feat at once, which made the screen too big)
  const talList = () => G.feats.BOSSES.filter((b) => G.bosses[b]).concat(['camp']);
  const talFeats = (b) => (b === 'camp' ? G.feats.CAMP : G.feats.of(b));
  U.showFeats = function () {
    const FE = G.feats, list = talList();
    el.featsLead.innerHTML = '<b style="color:var(--gold)">' + FE.count() + '</b> of ' + FE.total + ' done. Each one pays Sunshards the first time you do it.';
    Array.from(el.featsTabs.children).forEach((it, i) => {
      if (!/^tal\d$/.test(it.dataset.act)) return;
      const b = list[i];
      it.style.display = b ? '' : 'none';
      if (!b) return;
      const fs = talFeats(b), n = fs.filter((f) => FE.done(f.id)).length;
      it.innerHTML = (G.meta.hidden(b) ? '???' : esc(b === 'camp' ? 'The camp' : G.bosses[b].short)) + '<span class="tcount' + (n === fs.length ? ' all' : '') + '">' + n + '/' + fs.length + '</span>';
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
    const row = (f) => '<div class="feat' + (FE.done(f.id) ? ' done' : '') + '"><b>' + f.name + '</b><span>' + f.desc + '</span><i>' + (FE.done(f.id) ? 'done' : '\u25c6 ' + f.pay) + '</i></div>';
    if (G.meta.hidden(b)) { // (v2.9p: Aurel is a surprise until met)
      el.featsBody.innerHTML = '<h3>???</h3><p class="lead">You haven\u2019t met this one yet.</p>';
      Array.from(el.featsTabs.children).forEach((it) => it.classList.toggle('open', it.dataset.act === 'tal' + i));
      return;
    }
    el.featsBody.innerHTML = '<h3>' + esc(b === 'camp' ? 'The camp' : G.bosses[b].name) + '</h3><p class="lead">' + n + ' of ' + fs.length + ' done</p>' + fs.map(row).join('');
    Array.from(el.featsTabs.children).forEach((it) => it.classList.toggle('open', it.dataset.act === 'tal' + i));
  };
  // ---- the Moves page: every button, and what it does for the hero in play
  U.showMoves = function (fromMenu) {
    const h = G.hero(), I = G.input, k = (a) => I.keys(a).map((n) => '<kbd>' + n + '</kbd>').join(' ');
    const jumps = 1 + h.air + G.boon('wind') + (G.relic('cloak') ? 1 : 0);
    const rows = [
      ['Move', k('left') + ' ' + k('right'), 'Run.' + (h.heavy ? ' Heavy: slow to start and stop.' : h.id === 'lune' ? ' The fastest of them.' : '')],
      ['Jump', k('jump'), jumps + ' jumps. Hold for height. Down and jump drops through a platform.'],
      ['Attack', '<kbd>Left click</kbd> or ' + k('attack'), h.how.attack],
      ['Aim', k('up') + ' ' + k('down'), h.how.aim],
      ['Dash', k('dash'), 'Passes through attacks. Through one at the last moment is a perfect dodge: time slows, and your next hit deals double. ' + h.how.dash],
      ['Special', '<kbd>Right click</kbd> or ' + k('flare'), h.how.special + ' Costs one Starlight.'],
      ['Mend', 'hold ' + k('heal'), 'Stand still and hold: one Starlight becomes one health.'],
      ['Dawnbreak', k('ult') + ' or middle click', h.how.ult + ' Fills as you deal damage. Nothing can hurt you while it plays.'],
      ...(G.run.crownSet() ? [['Crown', k('crown'), G.SETS[G.run.crownSet()].crown + ': ' + G.SETS[G.run.crownSet()].crownDesc + '']] : []),
      ['Flourish', k('taunt'), 'A short salute that raises Flow and Dawnbreak, three times as much during a boss attack. Getting hit ends it.'],
      ['Items', k('item1') + ' ' + k('item2'), 'Use what you hold. Bought from the road merchant with Motes.'],
    ];
    el.movesOver.textContent = h.title; el.movesOver.style.color = h.css;
    el.movesTitle.textContent = h.name + '\u2019s moves';
    el.movesBody.innerHTML = rows.map((r) => '<tr><td class="mname">' + r[0] + '</td><td class="mkeys">' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('');
    el.movesFoot.textContent = fromMenu ? '' : 'Let go of Tab to carry on';
    U.show('moves', !!fromMenu);
  };

  // ---- the proving ring: practise against one boss, from any phase
  U.showPractice = function () {
    el.practiceOver.textContent = 'The Proving Ring';
    U.show('practice', true);
  };
  // ---- Settings, Controls: choose a row, then press the key it should use
  const ACTIONS = { left: 'Move left', right: 'Move right', up: 'Aim up', down: 'Aim down, drop', jump: 'Jump', attack: 'Attack', dash: 'Dash', flare: 'Special', heal: 'Mend, use', ult: 'Dawnbreak', crown: 'Crown', taunt: 'Flourish', item1: 'Item 1', item2: 'Item 2' };
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
  U.buildPrompts = function () {
    H.mend = null;
    const pad = G.input.device === 'gamepad';
    if (el.ultKey) el.ultKey.innerHTML = pad ? '<kbd>RT</kbd>' : '<kbd>' + G.input.label('ult') + '</kbd>';
    if (el.crownKey) el.crownKey.innerHTML = pad ? '<kbd>LT</kbd>' : '<kbd>' + G.input.label('crown') + '</kbd>';
    if (el.item0) { el.item0.querySelector('kbd').textContent = pad ? 'L3' : G.input.label('item1'); el.item1.querySelector('kbd').textContent = pad ? 'R3' : G.input.label('item2'); } // (v2.9k)
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
      el.continueItem.textContent = 'Continue \u00b7 ' + h.name + ', ' + (sv.at === 'fight' ? 'trial ' + G.roman(tr) + ' (it starts again)' : (sv.run.beaten || []).length >= G.RUN_FIGHTS ? 'the run won' : 'after trial ' + G.roman(Math.max(1, (sv.run.beaten || []).length)));
    }
    el.quickItem.style.display = !sv && last && lastHero && G.meta.unlocked(last) ? '' : 'none';
    // (v2.8a) the daily trial: the day's hero and relic, and your best of the day
    const dp = G.dailyPlan(), dr = G.store.load('daily', {})[dp.key];
    el.dailyItem.textContent = 'Daily trial \u00b7 ' + dp.hero.name + ' with ' + dp.relic.name
      + (dr ? ' \u00b7 best today: ' + (dr.won ? 'the run won' : dr.trials + (dr.trials === 1 ? ' trial' : ' trials')) : '') + (sv ? ' (ends the saved run)' : '');
    if (last && lastHero) el.quickItem.textContent = 'Quick start \u00b7 ' + lastHero.name + ', ' + last.name;
    const best = G.store.load('best', {})[G.settings.difficulty];
    const depth = G.store.load('depth', {})[G.settings.difficulty];
    el.bestLine.textContent = depth
      ? G.diff().name + ': deepest trial ' + G.roman(depth) + (best ? ' \u00b7 fastest first trial ' + U.fmtTime(best.time) + ' (' + best.grade + ')' : '')
      : 'No victory on ' + G.diff().name + ' yet';
    const held = G.run.held(), relic = G.relicDef(G.run.relic);
    el.resetItem.textContent = 'Reset progress';
    const omens = G.run.omens.map((id) => '<p><b>Omen: ' + G.omenDef(id).name + '</b> ' + G.omenDef(id).desc + '</p>').join('');
    el.pauseBoons.innerHTML = (held.length || relic || omens)
      ? '<h3>' + G.hero().name + '\u2019s run \u00b7 ' + G.diff().name + '</h3>' + omens
        + (relic ? '<p><b>' + esc(G.relics.title(relic.id)) + '</b> ' + G.relics.html(relic.id, { next: true }) + '</p>' : '')
        + (G.run.extraRelics || []).map((id) => G.relicDef(id)).filter(Boolean).map((r) => '<p><b>' + esc(G.relics.title(r.id)) + '</b> ' + G.relics.html(r.id) + ' <i>(' + (r.id === 'hilt' ? 'his gift, for this run' : 'from a corrupted portal') + ')</i></p>').join('')
        + (G.run.crownSet() ? '<p class="crownline" style="--tagc:' + G.SETS[G.run.crownSet()].css + '"><b>Crown · ' + G.SETS[G.run.crownSet()].crown + '</b> ' + esc(G.SETS[G.run.crownSet()].crownDesc) + '</p>' : '')
        + (G.run.duo() ? '<p class="crownline" style="--tagc:#ffaadc"><b>Duo · ' + esc(G.run.duo().name) + '</b> <i>' + G.run.duo().of.map((s) => G.SETS[s].name).join(' + ') + '.</i> ' + esc(G.run.duo().desc) + '</p>' : '')
        + held.map((h) => '<p' + (h.def.cursed ? ' class="cursed"' : '') + '><b>' + h.def.name + (h.n > 1 ? ' \u00d7' + h.n : '') + '</b> ' + (h.def.set ? '<i>' + G.SETS[h.def.set].name + ' · ' + G.SLOT_NAMES[h.def.slot] + '.</i> ' : '') + esc(h.def.desc) + U.pairNote(h.def)
          + (h.def.cursed ? (G.bane(h.def.id) ? '<span class="bane">' + esc(h.def.bane) + '</span>' : ' <i>(cleansed)</i>') : '') + '</p>').join('')
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
    el.trial.textContent = [G.practice ? 'Practice' : R.corrupt || R.champFight ? '' : R.trial > 1 ? 'Trial ' + G.roman(R.trial) : '', G.state === 'hub' ? '' : G.diff().name].filter(Boolean).join(' \u00b7 ');
    el.omen.innerHTML = R.omens.map((id) => '<b>Omen \u00b7 ' + G.omenDef(id).name + '</b>' + G.omenDef(id).desc).join('');
    U.buildPrompts();
    H.ult = -1; H.ready = null; H.frank = -1; H.ffill = -1; H.cset = undefined;
    const hero = G.hero(), relic = G.relicDef(R.relic);
    el.heroName.textContent = hero.name.toUpperCase();
    // the health pips and Starlight take the hero's own colour
    el.stage.style.setProperty('--star', hero.css);
    // (v2.7a) each chip says what it does when the pointer rests on it
    const tip = (s) => ' data-tip="' + esc(plain(s)) + '"';
    const relicTip = (r) => tip(G.relics.title(r.id) + ': ' + G.relics.html(r.id, { next: true }));
    el.boons.innerHTML = (relic ? '<span class="t-relic"' + relicTip(relic) + '>' + esc(G.relics.title(relic.id)) + '</span>' : '')
      + (R.extraRelics || []).map((id) => G.relicDef(id)).filter(Boolean).map((r) => '<span class="t-relic"' + relicTip(r) + '>' + esc(G.relics.title(r.id)) + '</span>').join('')
      + (R.duo() ? '<span class="t-duo"' + tip('Duo: ' + R.duo().name + ' (' + R.duo().of.map((s) => G.SETS[s].name).join(' + ') + '). ' + R.duo().desc) + '>Duo · ' + esc(R.duo().name) + '</span>' : '')
      + (R.crownSet() ? '<span class="t-crown" style="--tagc:' + G.SETS[R.crownSet()].css + '"' + tip('Crown: ' + G.SETS[R.crownSet()].crown + '. ' + G.SETS[R.crownSet()].crownDesc) + '>Crown · ' + esc(G.SETS[R.crownSet()].crown) + '</span>' : '')
      + R.held().map((h) => '<span class="t-' + h.def.tag.toLowerCase() + (h.def.cursed && !G.bane(h.def.id) ? ' clean' : '') + '"'
        + tip(h.def.name + (h.n > 1 ? ' \u00d7' + h.n : '') + (h.def.set ? ' (' + G.SETS[h.def.set].name + ' \u00b7 ' + G.SLOT_NAMES[h.def.slot] + ')' : '') + ': ' + h.def.desc + (h.def.cursed ? (G.bane(h.def.id) ? ' Bane: ' + h.def.bane : ' (cleansed)') : ''))
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
    el.bname.textContent = G.boss.name + (cor ? ' \u00b7 CORRUPTED' : '') + ' ';
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
    el.hint.innerHTML = 'Welcome to the Vigil. Spend Sunshards at <b>the Shrine</b> to grow stronger, try your moves on the <b>sparring post</b>, then take a relic at <b>the reliquary</b> and step through <b>the gate</b>.';
    el.hint.classList.add('show', 'calm');
    H.hintT = 10;
  };
  // (v2.9m) back from a run with Sunshards and nothing ever bought: point at the Shrine
  U.shrineHint = function () {
    if (!G.settings.hints || G.practice || !G.meta.newcomer()) return;
    el.hint.innerHTML = 'You have <b>' + G.meta.shards + ' Sunshards</b>. Walk back left to <b>the Shrine</b> to spend them.';
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
    el.hint.innerHTML = '<kbd>' + G.input.label('retry') + '</kbd> ' + (G.practice ? 'try again' : keep ? 'again, with ' + esc(keep.name) : 'new run');
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
        el.mend.innerHTML = (pad ? '<kbd>Y</kbd>' : '<kbd>' + G.input.label('flare') + '</kbd>' + (G.input.mouse ? '' : ' or right click')) + ' ' + G.hero().verb
          + (P.hp < P.maxHp ? ' &middot; hold ' + (pad ? '<kbd>LB</kbd>' : '<kbd>E</kbd>') + ' to mend' : '');
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
  const topOf = (taken) => Object.entries(taken).sort((x, y) => y[1] - x[1])[0];
  function hurtMost(taken, run) {
    const top = topOf(taken);
    if (!top) return '';
    const [bid, atk] = top[0].split(':'), B = G.bosses[bid];
    return '<p class="rline">' + (run ? 'This run, hurt most by ' : 'Hurt most by ') + (B ? esc(B.short.replace(/^The /, 'the ')) + '\u2019s ' : 'its ') + esc(attackWords(atk) || 'body') + ' <b>(' + top[1] + ')</b></p>';
  }
  function recapHtml(full) {
    const R = G.run, f = R.fight || { dealt: {}, taken: {} };
    const total = Object.values(f.dealt).reduce((a, b) => a + b, 0);
    let html = '';
    if (total > 0) {
      html += '<div class="rbars">' + Object.entries(f.dealt).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => {
        const pc = Math.round(100 * v / total);
        return '<div class="rb"><span class="rk">' + esc(k) + '</span><span class="rt"><i style="width:' + pc + '%"></i></span><span class="rv">' + pc + '%</span></div>';
      }).join('') + '</div>';
    }
    html += hurtMost(f.taken, false);
    if (full && !G.practice) {
      const relic = G.relicDef(R.relic), held = R.held();
      const all = Object.values(R.stats.dealt).reduce((a, b) => a + b, 0);
      const won = R.beaten.length, ft = topOf(f.taken), rt = topOf(R.stats.taken);
      html += '<p class="rline">' + (won ? won + (won === 1 ? ' trial' : ' trials') + ' won' : 'No trial won') + ' \u00b7 ' + all + ' damage this run</p>';
      if (rt && (!ft || ft[0] !== rt[0])) html += hurtMost(R.stats.taken, true); // (only when it is not this fight's)
      html += '<p class="rbuild">' + (relic ? '<span class="t-relic">' + esc(G.relics.title(relic.id)) + '</span>' : '')
        + (R.crownSet() ? '<span style="--tagc:' + G.SETS[R.crownSet()].css + '">Crown \u00b7 ' + esc(G.SETS[R.crownSet()].crown) + '</span>' : '')
        + (R.duo() ? '<span class="t-duo">Duo \u00b7 ' + esc(R.duo().name) + '</span>' : '')
        + held.map((h) => '<span class="t-' + h.def.tag.toLowerCase() + '">' + esc(h.def.name) + (h.n > 1 ? ' \u00d7' + h.n : '') + '</span>').join('') + '</p>';
    }
    return html;
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
    const lm = G.lastMotes;
    el.deadLead.textContent = [G.practice ? 'Practice.' : 'You fell in trial ' + G.roman(G.run.trial) + '.', felledBy(P, B),
      B.short + ' endured with ' + pct + '% of its strength, in phase ' + ROMAN[B.phase] + '.',
      lm && lm.motes ? 'Your ' + lm.motes + ' Motes became ' + lm.shards + ' Sunshards.' : '',
      !G.practice && G.meta.newcomer() ? 'Spend Sunshards at the Shrine in camp to grow stronger.' : ''].filter(Boolean).join(' ');
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
    el.deadRecap.innerHTML = G.practice ? '' : recapHtml(true);
    el.deadTip.textContent = G.pick(TIPS.concat(B.tips || [], B.tips || []));
    const keep = !G.practice && G.relicDef(G.run.relic);
    document.querySelector('#s-dead [data-act=retry]').innerHTML = (G.practice ? 'Try again' : keep ? 'Again, with ' + keep.name : 'New run') + ' <kbd>R</kbd>';
    document.querySelector('#s-dead [data-act=camp]').textContent = keep ? 'Back to camp, new relic' : 'Back to camp';
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
    return '<u class="pairtip" data-tip="' + esc(p.name + ' (' + p.of.map((id) => G.boonDef(id).name).join(' + ') + '): ' + p.desc) + '">' + esc(p.name) + '</u>';
  };
  // A set boon's card: its set and slot on the tag line; under the text, the set's rule, what it
  // would push out of its slot, and how near it brings the crown.
  U.boonTag = (b) => (b.set ? b.tag + ' · ' + G.SLOT_NAMES[b.slot] : b.duo ? 'Duo · ' + b.of.map((s) => G.SETS[s].name).join(' + ') : b.tag);
  U.setNote = function (b) {
    if (!b.set || G.boon(b.id)) return '';
    const R = G.run, S = G.SETS[b.set], old = R.slots()[b.slot];
    const n = R.setCount(b.set) + (old && G.boonDef(old).set === b.set ? 0 : 1);
    return '<span class="setrule">' + esc(S.rule) + '</span>'
      + (old ? '<span class="setswap">Replaces ' + esc(G.boonDef(old).name) + '.</span>' : '')
      + (old && R.crownSet() && R.crownSet() !== b.set && G.boonDef(old).set === R.crownSet() ? '<span class="setswap">Your crown ' + esc(G.SETS[R.crownSet()].crown) + ' goes dark.</span>' : '')
      + '<span class="setcrown">' + (n >= 3 ? (R.crownSet() === b.set ? 'Keeps the crown ' : 'Opens the crown ') + esc(S.crown) + '.'
        : n + ' of 3 toward the crown ' + esc(S.crown) + '.') + '</span>'
      + U.duoNote(b);
  };
  // (v2.6c) what a set boon does to the duo: wakes one, or puts the one you have to sleep
  U.duoNote = function (b) {
    const R = G.run, old = R.slots()[b.slot], now = R.duo();
    const after = R.duoOf((s) => R.setCount(s) + (s === b.set ? 1 : 0) - (old && G.boonDef(old).set === s ? 1 : 0));
    if (after && after !== now) return '<span class="setcrown duonote">Wakes the duo ' + esc(after.name) + ': ' + esc(after.desc) + '</span>';
    if (now && after !== now) return '<span class="setswap">Your duo ' + esc(now.name) + ' goes quiet.</span>';
    // (v2.7a) no duo yet: how near this brings the nearest one that has this set in it
    if (!now && !(old && G.boonDef(old).set === b.set)) {
      const cnt = (s) => R.setCount(s) + (s === b.set ? 1 : 0) - (old && G.boonDef(old).set === s ? 1 : 0);
      const near = G.DUOS.filter((d) => d.of.includes(b.set) && cnt(b.set) <= 2)
        .map((d) => ({ d, other: d.of.find((s) => s !== b.set) })).sort((x, y) => cnt(y.other) - cnt(x.other))[0];
      if (near && cnt(near.other) > 0) return '<span class="setcrown duonote">Toward the duo ' + esc(near.d.name) + ': ' + near.d.of.map((s) => Math.min(2, cnt(s)) + ' of 2 ' + G.SETS[s].name).join(', ') + '.</span>';
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
      notes.push(G.boon(other.id) && !G.boon(b.id) ? ' With your ' + esc(other.name) + ', it opens the pair ' + U.pairTip(p) + '.'
        : ' Pairs with ' + esc(other.name) + ': ' + U.pairTip(p) + '.');
    }
    return notes.join('');
  };

  // (v2.8a) a costume this win unlocked (costumes.js) is named first
  function costumeNote(res) {
    if (!res.costume) return;
    el.winBest.textContent = 'Mastery: the ' + res.costume.name + ' costume is yours (the Wardrobe, in the Hall of Echoes). ' + el.winBest.textContent;
  }
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
      ...(res.motes ? [['+' + res.motes, 'Motes']] : []),
    ]);
    Array.from(el.winStats.children).forEach((d) => { const l = d.lastElementChild.textContent; if (l === 'Sunshards') d.firstElementChild.classList.add('gold'); if (l === 'Motes') d.firstElementChild.classList.add('mote'); });
    el.winRecap.innerHTML = recapHtml(!!res.done && !res.champ && !res.corrupt);
    const R = G.run, waiting = R.corrupted.length;
    if (res.champ) {
      // the Champion's duel (champion.js): not a trial; back to the road it was found on
      const feats = res.meta.lines.filter((l) => l.indexOf('Feat: ') === 0).join(' · ');
      el.winOver.textContent = 'The First Light, answered';
      el.winBest.textContent = res.meta.relic ? 'Trophy won: ' + res.meta.relic.name + ' joins the relics you can be offered.' + (feats ? ' ' + feats : '')
        : res.meta.lines.join(' · ');
      el.winPick.textContent = (res.hilt ? 'His hilt is yours for the rest of this run' : 'He nods') + ' · trial ' + G.roman(res.trial + 1) + ' of ' + G.roman(G.RUN_FIGHTS) + ' still lies ahead';
      document.querySelector('#s-win [data-act=endrun]').textContent = 'End the run, return to camp';
      el.winCards.style.display = 'none';
      Array.from(el.winCards.children).forEach((c) => { c.style.display = 'none'; });
      el.rerollItem.style.display = 'none';
      const ri = document.getElementById('restItem');
      ri.style.display = ''; ri.textContent = 'Return to the road';
      costumeNote(res);
      U.hud(false);
      U.lockUntil = performance.now() + 700;
      U.show('win');
      return;
    }
    el.winOver.textContent = res.sol ? 'The sun is yours' : res.corrupt ? 'The corruption is cleansed' : (res.wonNow ? 'The run is won' : 'Victory') + ' \u00b7 trial ' + G.roman(res.trial) + ' of ' + G.roman(G.RUN_FIGHTS);
    // feats done in this fight are always named, whatever else there is to say
    const feats = res.meta.lines.filter((l) => l.indexOf('Feat: ') === 0).join(' · ');
    el.winBest.textContent = res.meta.relic ? 'Trophy won: ' + res.meta.relic.name + ' joins the relics you can be offered.' + (feats ? ' ' + feats : '')
      : res.meta.record ? 'Your fastest win against ' + G.boss.short + ' on ' + G.diff().name + ': ' + U.fmtTime(res.meta.record) + '.' + (feats ? ' ' + feats : '')
      : res.meta.lines.length ? res.meta.lines.join(' \u00b7 ')
      : res.newBest ? 'New fastest first trial on ' + G.diff().name + '.'
      : res.newDepth ? 'Your deepest trial yet on ' + G.diff().name + '.' : '';
    // The boon (or a corrupted portal's relic) is taken, and the next boss chosen, on the road between
    // trials (rest.js), not here. A portal that has just turned corrupted is named.
    const turned = res.newCorrupt && G.bosses[res.newCorrupt] ? 'A portal has turned corrupted: ' + G.bosses[res.newCorrupt].short : '';
    el.winPick.textContent = [
      res.corrupt ? 'A second relic waits on the road' : res.sol ? 'The run is won' : res.trial === G.TRIALS ? 'Six trials won: the last portal is open' : res.done ? 'All ' + G.roman(G.RUN_FIGHTS) + ' trials won' : 'Trial ' + G.roman(res.trial + 1) + ' of ' + G.roman(G.RUN_FIGHTS) + ' lies ahead',
      turned || (res.done && waiting ? (waiting > 1 ? 'Corrupted portals still wait' : 'A corrupted portal still waits') : ''),
    ].filter(Boolean).join(' \u00b7 ');
    const goOn = !res.done || waiting > 0;
    document.querySelector('#s-win [data-act=endrun]').textContent = !goOn ? 'Return to camp' : res.done ? 'Leave the run won, return to camp' : 'End the run, return to camp';
    el.winCards.style.display = 'none';
    Array.from(el.winCards.children).forEach((c) => { c.style.display = 'none'; });
    el.rerollItem.style.display = 'none';
    const restItem = document.getElementById('restItem');
    restItem.style.display = goOn ? '' : 'none';
    restItem.textContent = res.corrupt ? 'Rest, and take a relic' : res.done ? 'Rest at the crossroads' : 'Rest, and choose a boon';
    costumeNote(res);
    U.hud(false);
    U.lockUntil = performance.now() + 700;
    U.show('win');
  };
  // (v3.0a) The end of a run won, after the dawn (epilogue.js): what the run came to, the bosses in the
  // order they fell (a corrupted one cleansed is marked), the build, and what the win unlocked.
  U.showEnd = function (res) {
    const R = G.run, s = R.sum || { t: G.time, hits: 0, perfect: 0, shards: 0 }, H = G.hero();
    const fromMotes = Math.floor((R.motes || 0) / (G.motes.PER_SHARD || 10));
    $('endOver').textContent = H.name + ' \u00b7 ' + G.diff().name;
    $('endStats').innerHTML = statsHtml([
      [U.fmtTime(s.t), 'Fight time'],
      [s.hits, 'Hits taken'],
      [s.perfect, 'Perfect dodges'],
      ['+' + (s.shards + fromMotes), 'Sunshards'],
    ]);
    $('endStats').lastElementChild.firstElementChild.classList.add('gold');
    const road = R.beaten.filter((id) => id !== 'sol').map((id, i) => {
      const b = G.bosses[id], cor = R.cleansed.includes(id);
      return '<span' + (cor ? ' class="cor"' : '') + '><i>' + G.roman(i + 1) + '</i>' + esc(b ? b.short : id) + (cor ? '<b>CORRUPTED</b>' : '') + '</span>';
    });
    if (R.champWon && G.bosses.champion) road.push('<span><i>\u2726</i>' + esc(G.bosses.champion.short) + '</span>');
    road.push('<span class="sol"><i>\u2600</i>Sol</span>');
    $('endRoad').innerHTML = road.join('');
    const relic = G.relicDef(R.relic), held = R.held();
    $('endBuild').innerHTML = (relic ? '<span class="t-relic">' + esc(G.relics.title(relic.id)) + '</span>' : '')
      + (R.crownSet() ? '<span style="--tagc:' + G.SETS[R.crownSet()].css + '">Crown \u00b7 ' + esc(G.SETS[R.crownSet()].crown) + '</span>' : '')
      + (R.duo() ? '<span class="t-duo">Duo \u00b7 ' + esc(R.duo().name) + '</span>' : '')
      + held.map((h) => '<span class="t-' + h.def.tag.toLowerCase() + '">' + esc(h.def.name) + (h.n > 1 ? ' \u00d7' + h.n : '') + '</span>').join('');
    const un = [];
    if (res.solFirst) un.push('Dawn at the Vigil: the camp wakes up to morning.');
    if (res.solHeroFirst) un.push('A sun crown over ' + H.name + ' in the Hall of Echoes.');
    if (res.costume) un.push('The ' + res.costume.name + ' costume (the Wardrobe, in the Hall of Echoes).');
    if (res.meta.relic) un.push('Trophy: ' + res.meta.relic.name + ' joins the relics you can be offered.');
    for (const l of res.meta.lines) if (l.indexOf('Feat: ') === 0) un.push(l.replace(/\s*\+\d+$/, ''));
    $('endUnlocks').innerHTML = un.length ? un.map((u) => '<li>' + esc(u) + '</li>').join('') : '<li class="none">Nothing new this time.</li>';
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
      c.querySelector('.ctag').textContent = b.pair ? 'Pair \u00b7 ' + b.of.map((id) => G.boonDef(id).name).join(' + ') : U.boonTag(b);
      c.querySelector('.cname').textContent = b.name;
      c.querySelector('.cdesc').innerHTML = esc(b.desc) + (own ? ' You hold ' + own + '.' : '') + U.pairNote(b) + U.setNote(b);
    });
    el.rerollItem.style.display = G.run.rerolls > 0 && offer.length ? '' : 'none';
    el.rerollItem.textContent = 'Redraw boons (' + G.run.rerolls + ' left)';
    if (U.current === 'win') U.setFocus(0);
  };
})();
