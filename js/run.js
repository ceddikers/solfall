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
        // (v1.4b: a little slower, with a wind-up long enough to see the blade go up; a little more per cut to match)
        { dmg: 10, cd: 0.27, dur: 0.26, wind: 0.06, act: 0.11 },
        { dmg: 12, cd: 0.29, dur: 0.26, wind: 0.05, act: 0.11 },
        { dmg: 26, cd: 0.5, dur: 0.38, wind: 0.1, act: 0.15 },
      ],
      down: 11, special: 'lance', specialName: 'Star Lance', verb: 'lance',
      blurb: 'Balanced and quick. The one to learn the fight with.',
      lines: ['Sword: a fast three-hit combo', 'Star Lance: a piercing shot at any range', 'A slash out of a dash becomes a thrust'],
      how: {
        attack: 'Sword. A cut down (10), a cut back up (12), then a finisher (26). Hold the button to keep cutting.',
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
        attack: 'Maul. A wide sweep in front of you (20), then a smash that shakes the ground (40). Keep the button held on the smash to charge it, up to 72; fully charged it also throws a wave along the floor (20). While you charge you move slowly, but a blow cannot knock you back or stop you.',
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
        special: 'Moon Volley: a fan of five arrows, and a leap back from where you aimed. Like her other arrows they hit harder from close in, but they earn no Starlight back.',
        ult: 'Moonfall: a moon rises behind you. One great arrow for 26, fourteen moonbeams for 11 each, then the cut that ends it, for 70.',
      },
    },
    {
      id: 'eos', name: 'Eos', title: 'The Sheathed Dawn', col: '255,146,172', hot: '255,238,242', css: '#ff92ac',
      cloak: ['#5e2238', '#200a12'], build: 0.98, scarf: 10, scarfW: 0.8,
      hp: 0, run: 322, air: 1, weapon: 'blade', draw: true, reach: 1.08, thick: 1.1, poise: 1.1,
      // only the flick uses these; the draws are in G.PLAYER (FOCUS, DRAW_DMG and the rest)
      combo: [
        { dmg: 11, cd: 0.36, dur: 0.22, wind: 0.04, act: 0.1 },
        { dmg: 11, cd: 0.36, dur: 0.22, wind: 0.04, act: 0.1 },
        { dmg: 11, cd: 0.36, dur: 0.22, wind: 0.04, act: 0.1 },
      ],
      down: 11, special: 'guard', specialName: 'Still Point', verb: 'guard',
      blurb: 'Patient and exact. One cut, when it counts.',
      lines: ['Sheathed blade: hold the attack to gather Focus, let go to draw through the foe', 'The draw passes through attacks; its cut lands when the blade is home', 'Still Point: turn a blow aside and the next press is a full draw'],
      how: {
        attack: 'His blade stays in its sheath. A press is a flick: out, across and home (11). Keep the button held and he sets his feet: Focus gathers while he stands on the ground, one mark on the sheath at a time, up to three (0.45, 0.95 and 1.5 seconds). Let go to draw: he crosses the ground in a blink and cuts whatever he passes through, for 18, 46 or 100. The cut lands a moment later, when the blade clicks home.',
        aim: 'The draw goes where you aim it: at the mouse, or the way you hold, straight up included. A press with down held in the air strikes below and bounces off what it hits.',
        dash: 'A dash or a jump keeps the Focus you have; being hit loses it, and he walks slowly while he holds it. The draw passes through attacks as a dash does, so a draw through a blow is a perfect dodge, and the cut that follows is its Riposte.',
        special: 'Still Point: he sets the sheath across his body and waits, for under half a second. A blow that lands in that time is turned: it does no harm, the swing is stopped, and all three marks light at once, so your next press is a full draw (100). They stay lit for two and a half seconds without the button held. If nothing lands, the Starlight is gone.',
        ult: 'Horizon: one cut from one side of the arena to the other, for 250. It lands when the blade is home.',
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
  // the run's relic, and any won from a corrupted portal (see below)
  G.relic = (id) => R.relic === id || (R.extraRelics || []).includes(id);

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
    { id: 'second', name: 'Second Light', tag: 'Starlight', max: 1, heroes: ['eos'], desc: 'A blow turned by Still Point is answered with a crescent of light across the arena, for 40.' },
    { id: 'quiver', name: 'Full Quiver', tag: 'Starlight', max: 1, heroes: ['lune'], desc: 'Moon Volley fires eight arrows instead of five.' },
    { id: 'swift', name: 'Swift Mend', tag: 'Starlight', max: 1, desc: 'Mending takes half as long.' },
    { id: 'mirror', name: 'Mirror Step', tag: 'Starlight', max: 1, heroes: ['vesper', 'lune'], desc: 'A perfect dodge fires a free shot at the boss.' },
    { id: 'heart', name: 'Steady Heart', tag: 'Survival', max: 3, desc: 'One more health.' },
    { id: 'dawn', name: 'Second Dawn', tag: 'Survival', max: 1, desc: 'Once per trial, a killing blow leaves you on 1 health.' },
    { id: 'glass', name: 'Glass Star', tag: 'Risk', max: 1, desc: 'All damage +35%, but one less health.' },
  ];
  // Pairs: a boon only offered once you hold both of the boons it joins. When one is open to you it
  // takes the place of one of the cards on half the offers, and a card that would open one says so.
  G.PAIRS = [
    { id: 'shooting', name: 'Shooting Star', of: ['twin', 'comet'], desc: 'Comet Step cuts twice as hard, and every cut gives you your dashes back.' },
    { id: 'tidecut', name: 'Tidecutter', of: ['crescent', 'reach'], desc: 'Crescent waves fly twice as far and hit twice as hard.' },
    { id: 'well', name: 'Wellspring', of: ['vein', 'fourth'], desc: 'A perfect dodge fills a whole segment of Starlight.' },
    { id: 'emberward', name: 'Ember Ward', of: ['swift', 'heart'], desc: 'Mending also wards you: the next blow within 4 seconds is turned aside.' },
    { id: 'dying', name: 'Dying Light', of: ['dawn', 'glass'], desc: 'When Second Dawn saves you, the boss is thrown down at once.' },
    { id: 'dayedge', name: 'Edge of Day', of: ['keen', 'quick'], desc: 'Finishers deal 60% more.' },
  ];
  for (const p of G.PAIRS) { p.tag = 'Pair'; p.max = 1; p.pair = true; }
  // Corrupted boons: far stronger than the others, each with a drawback (its bane) that the Cleansing
  // Fountain can purge. Each is a twisted form of an ordinary boon (`from`), and on the road it first
  // stands on its plinth looking like that boon, then turns as you come near (rest.js). The
  // Fountain is at the crossroads; it costs Sunshards (rest.js, R.cleanse). From the second offer of
  // a run, now and then one takes a card's place. The banes are worked in player.js and hexes.js.
  G.CURSED = [
    { id: 'bloodedge', from: 'keen', name: 'Bloodied Edge', desc: 'Weapon damage +60%.', bane: 'Every blow you take costs one more health.' },
    { id: 'hollow', from: 'heart', name: 'Hollow Crown', desc: 'Three more health.', bane: 'You cannot mend.' },
    { id: 'voidstep', from: 'twin', name: 'Void Step', desc: 'Dashes recover twice as fast, and a dash through the boss cuts it for 40.', bane: 'Where a dash begins, the floor scars, and bursts a moment later.' },
    { id: 'starving', from: 'vein', name: 'Starving Star', desc: 'Starlight fills twice as fast.', bane: 'Land no blow for three seconds and your Starlight starts to drain.' },
    { id: 'whisper', from: 'reach', name: 'Whispering Dark', desc: 'Everything you do deals 30% more.', bane: 'Now and then the void marks the ground where you stand, and bursts.' },
    { id: 'borrowed', from: 'dawn', name: 'Borrowed Time', desc: 'Once per trial, a killing blow leaves you on 2 health and throws the boss down.', bane: 'After two minutes in a fight, the void takes a health every eight seconds (never the last).' },
    { id: 'feral', from: 'quick', name: 'Feral Rhythm', desc: 'Attack 35% faster.', bane: 'A blow you take empties your Starlight.' },
    { id: 'ravenous', from: 'swift', name: 'Ravenous Light', desc: 'Every twelfth blow you land mends one health.', bane: 'Each blow you take gives the boss back 4% of its health.' },
  ];
  for (const b of G.CURSED) { b.tag = 'Corrupted'; b.max = 1; b.cursed = true; }
  const boonById = {};
  for (const b of G.BOONS.concat(G.PAIRS, G.CURSED)) boonById[b.id] = b;
  G.boonDef = (id) => boonById[id];
  // the pairs a boon can lead to, and the ones open to you now
  G.pairsOf = (id) => G.PAIRS.filter((p) => p.of.includes(id));
  const openPairs = () => G.PAIRS.filter((p) => !G.boon(p.id) && p.of.every((id) => G.boon(id)));

  // How many of a boon the hero holds, and the damage multiplier that applies to everything.
  G.boon = (id) => R.boons[id] || 0;
  // a corrupted boon's drawback, while it is held and has not been cleansed
  G.bane = (id) => !!R.boons[id] && !(R.purged || []).includes(id);
  // Boons and relics, the Shrine's Whetstone, the Flow rank, and the two trophies that depend on the moment.
  G.dmgMult = () => (1 + 0.35 * G.boon('glass')) * (G.relic('crown') ? 1.4 : 1) * (G.boon('whisper') ? 1.3 : 1)
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
    // the portals (rest.js): bosses beaten this run, the one being fought, whether it is corrupted,
    // the portals corrupted and waiting, those already cleansed, and the relics they paid
    R.beaten = []; R.current = null; R.corrupt = false; R.corrupted = []; R.cleansed = []; R.extraRelics = [];
    R.offerKind = 'boon';
    R.purged = []; R.cleanses = 0; // corrupted boons cleansed at the fountain, and how often it has been used
  };

  // A run is six fights, then (to come) a seventh that is always the same final one. The first is
  // drawn at random; after each, on the road between (rest.js), you choose the next by walking into
  // its portal. Each boss is fought once. A beaten boss's portal may turn corrupted: an optional,
  // far harder fight for a second relic (see G.diff and rollCorruption).
  G.RUN_FIGHTS = 6;
  R.left = () => G.BOSS_IDS.filter((id) => !R.beaten.includes(id));
  R.foe = function () {
    if (!R.current) { const left = R.left(); R.current = G.pick(left.length ? left : G.BOSS_IDS); }
    return R.current;
  };
  R.runWon = () => R.beaten.length >= G.RUN_FIGHTS;
  // After a normal victory, now and then a portal already beaten turns corrupted (never the one just
  // beaten, at most two waiting at once, each boss once per run). Returns the boss id, or null.
  R.CORRUPT_CHANCE = 0.3;
  R.rollCorruption = function (just) {
    if (R.beaten.length < 2 || R.corrupted.length >= 2 || Math.random() >= R.CORRUPT_CHANCE) return null;
    const pool = R.beaten.filter((id) => id !== just && !R.corrupted.includes(id) && !R.cleansed.includes(id));
    if (!pool.length) return null;
    const id = G.pick(pool);
    R.corrupted.push(id);
    return id;
  };
  // A corrupted portal's reward: a second relic, chosen from three you do not hold.
  R.rollRelicReward = function () {
    const pool = G.RELICS.filter((r) => G.meta.unlocked(r) && !G.relic(r.id) && r.id !== 'crown' && r.id !== 'phoenix');
    R.offer = G.shuffle(pool.slice()).slice(0, 3).map((r) => Object.assign({ tag: 'Relic', relicReward: true }, r));
    R.offerKind = 'relic';
    return R.offer;
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
    R.offerKind = 'boon';
    // a pair you have earned takes one card's place, on half the offers
    const open = openPairs().filter((p) => !avoid || !avoid.includes(p));
    if (open.length && Math.random() < 0.5) R.offer[Math.min(R.offer.length, n - 1)] = G.pick(open);
    // and once a boss has fallen, a corrupted boon takes the first card's place on two offers in five
    const cursed = G.CURSED.filter((b) => !G.boon(b.id) && (!avoid || !avoid.includes(b)));
    if (R.beaten.length && cursed.length && Math.random() < R.CURSED_CHANCE) R.offer[0] = G.pick(cursed);
    return R.offer;
  };
  R.CURSED_CHANCE = 0.4;
  // The Cleansing Fountain (rest.js): purge a corrupted boon's bane for Sunshards. The price doubles
  // with each use in a run.
  R.cleanseCost = () => 40 * Math.pow(2, R.cleanses);
  R.banes = () => R.order.filter((id) => boonById[id] && boonById[id].cursed && G.bane(id));
  R.cleanse = function (id) {
    const cost = R.cleanseCost();
    if (!G.bane(id) || G.meta.shards < cost) return false;
    G.meta.shards -= cost; G.meta.save();
    R.purged.push(id); R.cleanses++;
    return true;
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
    const b = base(), n = R.trial - 1, cor = G.corrupt ? G.corrupt.on() : R.corrupt && !G.practice;
    if (n <= 0 && !R.omens.length && !cor) return b;
    const bulwark = R.omens.includes('bulwark'), frenzy = R.omens.includes('frenzy');
    // a corrupted boss: half again the health, shorter warnings, far less rest
    return Object.assign({}, b, {
      bossHp: b.bossHp * (1 + 0.15 * n) * (bulwark ? 1.2 : 1) * (cor ? 1.5 : 1),
      tele: Math.max(cor ? 0.62 : 0.7, b.tele * (1 - 0.04 * n) * (cor ? 0.85 : 1)),
      pace: Math.max(cor ? 0.42 : 0.5, Math.max(0.55, b.pace * (1 - 0.06 * n)) * (frenzy ? 0.75 : 1) * (cor ? 0.78 : 1)),
      stagger: b.stagger - (bulwark ? 0.8 : 0),
    });
  };
  // From the fifth trial (with six bosses, the last two met) they also use their Merciless patterns.
  G.fierce = () => G.settings.difficulty === 2 || R.trial >= 5 || (G.corrupt && G.corrupt.on());
})();
