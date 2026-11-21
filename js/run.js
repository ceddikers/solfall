// Solfall - the run: a chain of trials against the Warden. Each victory grants one boon,
// and each trial after the first makes the Warden tougher and quicker.
'use strict';
(function () {
  const R = G.run = { trial: 1, boons: {}, order: [], offer: [] };

  // max is how many times a boon can be taken in one run.
  G.BOONS = [
    { id: 'wind', name: 'Third Wind', tag: 'Movement', max: 2, desc: 'One more jump in the air.' },
    { id: 'twin', name: 'Twin Dash', tag: 'Movement', max: 1, desc: 'A second dash before landing, and dashes recover 30% faster.' },
    { id: 'comet', name: 'Comet Step', tag: 'Movement', max: 2, desc: 'Dashing through the Warden cuts it for 24 damage.' },
    { id: 'reach', name: 'Long Reach', tag: 'Sword', max: 2, desc: 'Sword reach +30%.' },
    { id: 'keen', name: 'Keen Edge', tag: 'Sword', max: 3, desc: 'Sword damage +25%.' },
    { id: 'quick', name: 'Quick Hands', tag: 'Sword', max: 2, desc: 'Swing 18% faster.' },
    { id: 'crescent', name: 'Crescent', tag: 'Sword', max: 1, desc: 'The third hit of a combo throws a wave of light.' },
    { id: 'vein', name: 'Bright Vein', tag: 'Starlight', max: 2, desc: 'Starlight fills 40% faster.' },
    { id: 'fourth', name: 'Fourth Star', tag: 'Starlight', max: 2, desc: 'One more Starlight segment.' },
    { id: 'split', name: 'Split Lance', tag: 'Starlight', max: 1, desc: 'The Star Lance fires three at once, each at 60% strength.' },
    { id: 'swift', name: 'Swift Mend', tag: 'Starlight', max: 1, desc: 'Mending takes half as long.' },
    { id: 'mirror', name: 'Mirror Step', tag: 'Starlight', max: 1, desc: 'A perfect dodge fires a free Star Lance at the core.' },
    { id: 'heart', name: 'Steady Heart', tag: 'Survival', max: 3, desc: 'One more health.' },
    { id: 'dawn', name: 'Second Dawn', tag: 'Survival', max: 1, desc: 'Once per trial, a killing blow leaves you on 1 health.' },
    { id: 'glass', name: 'Glass Star', tag: 'Risk', max: 1, desc: 'All damage +35%, but one less health.' },
  ];
  const byId = {};
  for (const b of G.BOONS) byId[b.id] = b;
  G.boonDef = (id) => byId[id];

  // How many of a boon the hero holds, and the damage multiplier that applies to everything.
  G.boon = (id) => R.boons[id] || 0;
  G.dmgMult = () => 1 + 0.35 * G.boon('glass');

  G.roman = function (n) {
    const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = '';
    for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
    return s;
  };

  R.reset = function () { R.trial = 1; R.boons = {}; R.order = []; R.offer = []; };

  // Three boons to choose from after a victory.
  R.rollOffer = function () {
    const baseHp = (G.DIFFS[G.settings.difficulty] || G.DIFFS[1]).hp + G.boon('heart');
    const pool = G.BOONS.filter((b) => G.boon(b.id) < b.max && (b.id !== 'glass' || baseHp >= 3));
    R.offer = G.shuffle(pool.slice()).slice(0, 3);
    return R.offer;
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
      if (e) e.n++; else out.push({ def: byId[id], n: 1 });
    }
    return out;
  };

  // Difficulty for the current trial: the chosen setting, stepped up once per trial cleared.
  const base = () => G.DIFFS[G.settings.difficulty] || G.DIFFS[1];
  G.diff = function () {
    const b = base(), n = R.trial - 1;
    if (n <= 0) return b;
    return Object.assign({}, b, {
      bossHp: b.bossHp * (1 + 0.15 * n),
      tele: Math.max(0.7, b.tele * (1 - 0.04 * n)),
      pace: Math.max(0.55, b.pace * (1 - 0.06 * n)),
    });
  };
  // From the fourth trial the Warden also uses its Merciless patterns (extra hits in several attacks).
  G.fierce = () => G.settings.difficulty === 2 || R.trial >= 4;

  // Console helper: G.debug.give('keen') adds a boon for testing (takes effect next fight).
})();
