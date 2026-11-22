// Solfall - the run: which hero and relic were chosen, the boons won so far, and how each
// trial scales the Warden. Heroes, relics and boons are all defined here as plain data.
'use strict';
(function () {
  const R = G.run = { trial: 1, hero: 'vesper', relic: null, boons: {}, order: [], offer: [], relicOffer: [], phoenixUsed: false, foes: [],
    omens: [], lastOmens: [], ult: 0, rerolls: 0 };

  // ------------------------------------------------------------------ heroes
  // combo: three steps of { dmg, cd (time to the next swing), dur, wind (wind-up), act (active time) }.
  // chain: how many swings make a chain (the last is the finisher, combo[2]); 3 unless given.
  // heavy: the maul's own rules (a wide sweep, a smash that can be charged, more weight in every step).
  // how: what each button does for this hero, for the Moves page.
  // hp is added to the difficulty's health; reach, thick and poise scale melee reach, arc width and stagger.
  G.HEROES = [
    {
      id: 'vesper', name: 'Vesper', title: 'The Starblade', col: '150,225,255', hot: '235,250,255', css: '#96e1ff',
      cloak: ['#22365e', '#0a1020'], build: 1, scarf: 10, scarfW: 1,
      hp: 0, run: 335, air: 1, weapon: 'sword', reach: 1, thick: 1, poise: 1,
      combo: [
        { dmg: 9, cd: 0.22, dur: 0.22, wind: 0.02, act: 0.11 },
        { dmg: 11, cd: 0.24, dur: 0.22, wind: 0.02, act: 0.11 },
        { dmg: 24, cd: 0.46, dur: 0.36, wind: 0.09, act: 0.15 },
      ],
      down: 11, special: 'lance', specialName: 'Star Lance', verb: 'lance',
      blurb: 'Balanced and quick. The one to learn the fight with.',
      lines: ['Sword: a fast three-hit combo', 'Star Lance: a piercing shot at any range', 'A slash out of a dash becomes a thrust'],
      how: {
        attack: 'Sword. Two quick cuts (9, 11), then a finisher (24). Hold the button to keep cutting.',
        aim: 'Hold up to cut overhead. In the air, hold down to strike below and bounce off what you hit, getting your jump and dash back.',
        dash: 'A cut thrown straight out of a dash becomes a thrust: 40% more damage and a longer reach.',
        special: 'Star Lance: she draws back and throws a piercing lance of 42 that crosses the arena. Aim with the mouse, or hold a direction. Dash during the throw and it flies at once; get hit first and the Starlight comes back.',
        ult: 'Thousand Stars: you vanish and cut from every side, eight times for 20 and once for 80.',
      },
    },
    {
      id: 'aster', name: 'Aster', title: 'The Starmaul', col: '140,245,185', hot: '232,255,240', css: '#8cf5b9',
      cloak: ['#1f4a3a', '#08160f'], build: 1.24, scarf: 6, scarfW: 1.7,
      hp: 1, run: 300, air: 1, weapon: 'maul', reach: 1.28, thick: 1.55, poise: 1.35, chain: 2, heavy: true, accel: 0.74,
      combo: [
        { dmg: 20, cd: 0.44, dur: 0.36, wind: 0.08, act: 0.14 }, // the sweep
        { dmg: 20, cd: 0.44, dur: 0.36, wind: 0.08, act: 0.14 },
        { dmg: 40, cd: 0.66, dur: 0.5, wind: 0.16, act: 0.16 },  // the smash
      ],
      down: 15, special: 'starfall', specialName: 'Starfall', verb: 'starfall',
      blurb: 'Slow, heavy and hard to kill. Every swing counts.',
      lines: ['Maul: a wide sweep, then a smash you can hold to charge', 'Starfall: slam down for a blast around you, passing through attacks as you fall', 'One more health; she cannot be knocked back while charging'],
      how: {
        attack: 'Maul. A wide sweep in front of you (20), then a smash that shakes the ground (40). Keep the button held on the smash to charge it, up to double; fully charged it also throws a wave along the floor. While you charge you move slowly, but a blow cannot knock you back or stop you.',
        aim: 'Hold up to heave the maul overhead. In the air, hold down to strike below and bounce off what you hit.',
        dash: 'She is slower to start and stop than the others. A sweep thrown straight out of a dash hits 40% harder.',
        special: 'Starfall: a blast of 46 around your feet. In the air you plunge first, passing through attacks until you land.',
        ult: 'Worldbreaker: you rise and come down for 250, and the whole floor splits.',
      },
    },
    {
      id: 'lune', name: 'Lune', title: 'The Moonbow', col: '214,170,255', hot: '246,236,255', css: '#d6aaff',
      cloak: ['#3c2a5e', '#120a20'], build: 0.88, scarf: 14, scarfW: 0.7,
      hp: -1, run: 352, air: 2, weapon: 'bow', reach: 1, thick: 1, poise: 0.7,
      combo: [
        { dmg: 4, cd: 0.28, wind: 0.03 },
        { dmg: 5, cd: 0.28, wind: 0.03 },
        { dmg: 10, cd: 0.56, wind: 0.1 },
      ],
      down: 4, special: 'volley', specialName: 'Moon Volley', verb: 'volley',
      blurb: 'Fragile and nimble. Fights from range, hits hardest up close.',
      lines: ['Moonbow: arrows in any direction, strongest up close and weaker at long range; she slows while firing', 'Moon Volley: a fan of five arrows and a leap backwards', 'Triple jump; firing downward in the air lifts you; one less health'],
      how: {
        attack: 'Moonbow. Arrows wherever you aim (4, 5), then a heavy arrow that pierces (10). Up to 60% stronger within 120 pixels, up to 30% weaker past 240. You slow down while firing.',
        aim: 'Aim with the mouse, or hold a direction; with no direction held she fires the way she faces. Firing downward in the air lifts you.',
        dash: 'Three jumps instead of two. She has one less health than the others.',
        special: 'Moon Volley: a fan of five arrows, and a leap back from where you aimed.',
        ult: 'Moonfall: one arrow into the sky; twelve fall on the boss for 15 each, then a beam of 70.',
      },
    },
  ];
  const heroById = {};
  for (const h of G.HEROES) heroById[h.id] = h;
  G.hero = () => heroById[R.hero] || G.HEROES[0];

  // ------------------------------------------------------------------ relics (one, chosen before the first trial)
  G.RELICS = [
    { id: 'chalice', name: 'Ember Chalice', desc: 'Mending restores 2 health instead of 1.' },
    { id: 'shard', name: 'Comet Shard', desc: 'Finishers deal 50% more damage.' },
    { id: 'moons', name: 'Twin Moons', desc: 'One more Starlight segment, and every trial starts with Starlight full.' },
    { id: 'crown', name: 'Thorn Crown', desc: 'All damage +40%, but 2 less health.' },
    { id: 'ward', name: 'Wardstone', desc: 'The first hit you take in each phase of a fight is blocked.' },
    { id: 'cloak', name: 'Feather Cloak', desc: 'One more jump in the air, and you move 12% faster.' },
    { id: 'storm', name: 'Stormcaller', desc: 'Every fifth hit calls lightning onto the target for 30 damage.' },
    { id: 'phoenix', name: 'Phoenix Feather', desc: 'Once per run, a killing blow leaves you on 3 health instead.' },
    { id: 'sunstone', name: 'Sunstone', desc: 'The stagger bar fills 40% faster, and each stagger lasts 1.5 seconds longer.' },
  ];
  const relicById = {};
  for (const r of G.RELICS) relicById[r.id] = r;
  G.relicDef = (id) => relicById[id] || G.RELICS.find((r) => r.id === id); // trophies are added later, in meta.js
  G.relic = (id) => R.relic === id;

  // ------------------------------------------------------------------ boons (one after each victory)
  // max is how many times a boon can be taken in one run; heroes limits a boon to some heroes.
  G.BOONS = [
    { id: 'wind', name: 'Third Wind', tag: 'Movement', max: 2, desc: 'One more jump in the air.' },
    { id: 'twin', name: 'Twin Dash', tag: 'Movement', max: 1, desc: 'A second dash before landing, and dashes recover 30% faster.' },
    { id: 'comet', name: 'Comet Step', tag: 'Movement', max: 2, desc: 'Dashing through a boss cuts it for 24 damage.' },
    { id: 'reach', name: 'Long Reach', tag: 'Weapon', max: 2, desc: 'Weapon reach +30%.' },
    { id: 'keen', name: 'Keen Edge', tag: 'Weapon', max: 3, desc: 'Weapon damage +25%.' },
    { id: 'quick', name: 'Quick Hands', tag: 'Weapon', max: 2, desc: 'Attack 18% faster.' },
    { id: 'crescent', name: 'Crescent', tag: 'Weapon', max: 1, desc: 'Each finisher also throws a wave of light.' },
    { id: 'vein', name: 'Bright Vein', tag: 'Starlight', max: 2, desc: 'Starlight fills 40% faster.' },
    { id: 'fourth', name: 'Fourth Star', tag: 'Starlight', max: 2, desc: 'One more Starlight segment.' },
    { id: 'split', name: 'Split Lance', tag: 'Starlight', max: 1, heroes: ['vesper'], desc: 'The Star Lance fires three at once, each at 60% strength.' },
    { id: 'aftershock', name: 'Aftershock', tag: 'Starlight', max: 1, heroes: ['aster'], desc: 'Starfall strikes a second time at half strength.' },
    { id: 'quiver', name: 'Full Quiver', tag: 'Starlight', max: 1, heroes: ['lune'], desc: 'Moon Volley fires eight arrows instead of five.' },
    { id: 'swift', name: 'Swift Mend', tag: 'Starlight', max: 1, desc: 'Mending takes half as long.' },
    { id: 'mirror', name: 'Mirror Step', tag: 'Starlight', max: 1, heroes: ['vesper', 'lune'], desc: 'A perfect dodge fires a free shot at the boss.' },
    { id: 'heart', name: 'Steady Heart', tag: 'Survival', max: 3, desc: 'One more health.' },
    { id: 'dawn', name: 'Second Dawn', tag: 'Survival', max: 1, desc: 'Once per trial, a killing blow leaves you on 1 health.' },
    { id: 'glass', name: 'Glass Star', tag: 'Risk', max: 1, desc: 'All damage +35%, but one less health.' },
  ];
  const boonById = {};
  for (const b of G.BOONS) boonById[b.id] = b;
  G.boonDef = (id) => boonById[id];

  // How many of a boon the hero holds, and the damage multiplier that applies to everything.
  G.boon = (id) => R.boons[id] || 0;
  // Boons and relics, the Shrine's Whetstone, the Flow rank, and the two trophies that depend on the moment.
  G.dmgMult = () => (1 + 0.35 * G.boon('glass')) * (G.relic('crown') ? 1.4 : 1)
    * (1 + 0.04 * G.up('edge')) * (1 + 0.03 * G.flow.rank)
    * (G.relic('shroud') && G.player.shroudT > 0 ? 1.5 : 1) * (G.relic('oath') && G.player.hp === 1 ? 1.5 : 1);

  G.roman = function (n) {
    const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = '';
    for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
    return s;
  };

  R.reset = function () {
    R.trial = 1; R.boons = {}; R.order = []; R.offer = []; R.relic = null; R.relicOffer = []; R.phoenixUsed = false;
    R.omens = []; R.lastOmens = []; R.ult = 0; R.rerolls = G.up('reroll');
    R.hero = heroById[G.settings.hero] ? G.settings.hero : 'vesper';
    R.foes = [];
  };

  // Which boss each trial holds. Every lap of the run meets all of them once, in a shuffled order;
  // the First foe setting fixes who comes first.
  R.foe = function (trial) {
    const ids = G.BOSS_IDS, n = trial || R.trial;
    while (R.foes.length < n) {
      let lap = ids.slice();
      for (let i = lap.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [lap[i], lap[j]] = [lap[j], lap[i]]; }
      const want = G.settings.firstFoe;
      if (!R.foes.length && ids.includes(want)) lap = [want].concat(lap.filter((x) => x !== want));
      else if (R.foes.length && lap[0] === R.foes[R.foes.length - 1]) lap.push(lap.shift());
      R.foes = R.foes.concat(lap);
    }
    return R.foes[n - 1];
  };

  // Health before boons, for deciding whether a health-costing pick may be offered.
  const baseHp = () => (G.DIFFS[G.settings.difficulty] || G.DIFFS[1]).hp + G.hero().hp + G.boon('heart') + G.up('vigor') - (G.relic('crown') ? 2 : 0);

  // Three relics to choose from before the first trial.
  R.rollRelics = function () {
    const pool = G.RELICS.filter((r) => G.meta.unlocked(r) && (r.id !== 'crown' || baseHp() >= 4));
    R.relicOffer = G.shuffle(pool.slice()).slice(0, 3 + G.up('relics'));
    return R.relicOffer;
  };
  // Three boons to choose from after a victory.
  R.rollOffer = function (avoid) {
    let pool = G.BOONS.filter((b) => G.boon(b.id) < b.max
      && (!b.heroes || b.heroes.includes(R.hero))
      && (b.id !== 'glass' || baseHp() - G.boon('glass') >= 3));
    const n = 3 + G.up('choice');
    // a redraw shows different boons where there are enough left to do so
    const fresh = avoid ? pool.filter((b) => !avoid.includes(b)) : pool;
    if (fresh.length >= n) pool = fresh;
    R.offer = G.shuffle(pool.slice()).slice(0, n);
    return R.offer;
  };
  // Second Thoughts (the Shrine): draw the offer again.
  R.reroll = function () {
    if (R.rerolls <= 0) return false;
    R.rerolls--;
    R.rollOffer(R.offer);
    return true;
  };
  R.take = function (i) {
    const b = R.offer[i];
    if (!b) return;
    R.boons[b.id] = G.boon(b.id) + 1;
    R.order.push(b.id);
  };
  // Boons held, in the order taken, with counts: [{ def, n }].
  R.held = function () {
    const out = [];
    for (const id of R.order) {
      const e = out.find((x) => x.def.id === id);
      if (e) e.n++; else out.push({ def: boonById[id], n: 1 });
    }
    return out;
  };

  // Difficulty for the current trial: the chosen setting, stepped up once per trial cleared.
  const base = () => G.DIFFS[G.settings.difficulty] || G.DIFFS[1];
  G.diff = function () {
    const b = base(), n = R.trial - 1;
    if (n <= 0 && !R.omens.length) return b;
    const bulwark = R.omens.includes('bulwark'), frenzy = R.omens.includes('frenzy');
    return Object.assign({}, b, {
      bossHp: b.bossHp * (1 + 0.15 * n) * (bulwark ? 1.2 : 1),
      tele: Math.max(0.7, b.tele * (1 - 0.04 * n)),
      pace: Math.max(0.5, Math.max(0.55, b.pace * (1 - 0.06 * n)) * (frenzy ? 0.75 : 1)),
      stagger: b.stagger - (bulwark ? 0.8 : 0),
    });
  };
  // From the fifth trial (the second lap of the bosses) they also use their Merciless patterns.
  G.fierce = () => G.settings.difficulty === 2 || R.trial >= 5;
})();
