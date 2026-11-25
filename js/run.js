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
        // (v2.4c: 20, 20, 40 before; she cleared the most fights and killed fastest of the four)
        { dmg: 18, cd: 0.44, dur: 0.36, wind: 0.08, act: 0.14 }, // the sweep
        { dmg: 18, cd: 0.44, dur: 0.36, wind: 0.08, act: 0.14 },
        { dmg: 36, cd: 0.66, dur: 0.5, wind: 0.16, act: 0.16 },  // the smash
      ],
      down: 15, special: 'starfall', specialName: 'Starfall', verb: 'starfall',
      blurb: 'Slow, heavy and hard to kill. Every swing counts.',
      lines: ['Maul: a wide sweep, then a smash you can hold to charge', 'Starfall: slam down for a blast around you, passing through attacks as you fall', 'One more health; she cannot be knocked back while charging'],
      how: {
        attack: 'Maul. A wide sweep in front of you (18), then a smash that shakes the ground (36). Keep the button held on the smash to charge it, up to 65; fully charged it also throws a wave along the floor (18). While you charge you move slowly, but a blow cannot knock you back or stop you.',
        aim: 'Hold up to heave the maul overhead. In the air, hold down to strike below and bounce off what you hit.',
        dash: 'She is slower to start and stop than the others. A sweep thrown straight out of a dash hits 40% harder.',
        special: 'Starfall: a blast of 42 around your feet. In the air you plunge first, passing through attacks until you land.',
        ult: 'Worldbreaker: you rise and come down for 250, and the whole floor splits.',
      },
    },
    {
      id: 'lune', name: 'Lune', title: 'The Moonbow', col: '214,170,255', hot: '246,236,255', css: '#d6aaff',
      cloak: ['#3c2a5e', '#120a20'], build: 0.88, scarf: 14, scarfW: 0.7,
      hp: -2, run: 352, air: 2, weapon: 'bow', // (v2.4c: two less health, for more damage: was -1 with arrows of 4, 5, 10)
      reach: 1, thick: 1, poise: 0.7,
      combo: [
        { dmg: 5, cd: 0.28, wind: 0.03 },
        { dmg: 6, cd: 0.28, wind: 0.03 },
        { dmg: 13, cd: 0.56, wind: 0.1 },
      ],
      down: 4, special: 'volley', specialName: 'Moon Volley', verb: 'volley',
      blurb: 'Fragile and nimble. Fights from range, hits hardest up close.',
      lines: ['Moonbow: arrows in any direction, strongest up close and weaker at long range; she slows while firing', 'Moon Volley: a fan of five arrows and a leap backwards', 'Triple jump; firing downward in the air lifts you; two less health'],
      how: {
        attack: 'Moonbow. Arrows wherever you aim (5, 6), then a heavy arrow that pierces (13). Up to 60% stronger within 120 pixels, up to 30% weaker past 240. You slow down while firing.',
        aim: 'Aim with the mouse, or hold a direction; with no direction held she fires the way she faces. Firing downward in the air lifts you.',
        dash: 'Three jumps instead of two. She has two less health than the others.',
        special: 'Moon Volley: a fan of five arrows, and a leap back from where you aimed. Like her other arrows they hit harder from close in, but they earn no Starlight back.',
        ult: 'Moonfall: a moon rises behind you. One great arrow for 26, fourteen moonbeams for 11 each, then the cut that ends it, for 70.',
      },
    },
    {
      id: 'eos', name: 'Eos', title: 'The Sheathed Dawn', col: '255,146,172', hot: '255,238,242', css: '#ff92ac',
      cloak: ['#5e2238', '#200a12'], build: 0.98, scarf: 10, scarfW: 0.8,
      hp: 0, run: 338, air: 1, weapon: 'blade', draw: true, reach: 1.12, thick: 1.1, poise: 1.1,
      // only the string of presses uses these; the draws are in G.PLAYER (FOCUS, DRAW_DMG and the rest)
      // (v2.1b: a string of three, from three flicks of 11 every 0.36 s)
      combo: [
        { dmg: 11, cd: 0.27, dur: 0.22, wind: 0.04, act: 0.1 },  // out of the sheath, rising
        { dmg: 13, cd: 0.29, dur: 0.24, wind: 0.05, act: 0.1 },  // back across, falling
        { dmg: 27, cd: 0.5, dur: 0.36, wind: 0.08, act: 0.14 },  // the finisher, wide, stepping in
      ],
      down: 11, special: 'guard', specialName: 'Still Point', verb: 'guard',
      blurb: 'Patient and exact. One cut, when it counts.',
      lines: ['Sheathed blade: a string of three cuts; land two whole strings and the sheath is open: hold the attack to gather Focus, let go to draw through the foe', 'The draw passes through attacks; its cut lands when the blade is home. Focus gathers in the air too', 'Still Point: turn a blow aside and the next press is a full draw'],
      how: {
        attack: 'His blade stays in its sheath. Press for a string: a rising cut out of the sheath (11), a falling cut back across (13), then a wide finisher that steps in (27). Land all three cuts of a string twice and the sheath is open: two lights at its mouth fill one string at a time, and it is traced in gold when it is open. Then keep the button held and he sets his feet: Focus gathers, one mark on the sheath at a time, up to three (0.3, 0.65 and 1.05 seconds). Before the sheath is open, holding does nothing. Let go to draw: he crosses the ground in a blink and cuts whatever he passes through, for 18, 46 or 100. The cut lands a moment later, when the blade clicks home. Any draw empties the sheath.',
        aim: 'The draw goes where you aim it: at the mouse, or the way you hold, straight up included. A press with down held in the air strikes below and bounces off what it hits.',
        dash: 'A dash or a jump keeps the Focus you have; being hit loses it, and he walks slowly while he holds it. In the air he can hold the stance too, for about a second a jump, drifting down while Focus gathers a little slower: draw up at what flies. The draw passes through attacks as a dash does, so a draw through a blow is a perfect dodge, and the cut that follows is its Riposte. It shares the dodge with the dash: it puts the dash on its cooldown.',
        special: 'Still Point: he sets the sheath across his body and waits, for about two thirds of a second. A blow that lands in that time is turned: it does no harm, the swing is stopped, and all three marks light at once, so your next press is a full draw (100). They stay lit for two and a half seconds without the button held. If nothing lands, half the Starlight comes back.',
        ult: 'Horizon: one cut from one side of the arena to the other, for 250. It lands when the blade is home.',
      },
    },
  ];
  const heroById = {};
  for (const h of G.HEROES) heroById[h.id] = h;
  G.hero = () => { const h = heroById[R.hero] || G.HEROES[0]; return G.costumed ? G.costumed(h) : h; }; // (v2.8a: as worn, costumes.js)

  // ------------------------------------------------------------------ relics (one, chosen before the first trial)
  // Each one awakens on the road after trials II, IV and VI (relics.js, which also holds what they do).
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
    // (v2.6a) relics that change how a fight is played rather than how hard you hit
    { id: 'hourglass', name: 'Still Hourglass', desc: 'A perfect dodge slows the foe, and all it has thrown, to half speed for 0.6 seconds.' },
    { id: 'anvil', name: 'Anvil Heart', desc: 'Blows no longer knock you back or break the attack you are making.' },
    { id: 'sun', name: 'Rising Sun', desc: 'Every blow you land adds 1% to everything you do, up to 30% a fight. Being struck loses it all.' },
    { id: 'quicksilver', name: 'Quicksilver', desc: 'Dashes recover twice as fast, each paid for with an eighth of a segment of Starlight (with none, as before).' },
    { id: 'lantern', name: 'Lantern of Hours', desc: 'In a fight, Starlight fills by itself: a segment every 10 seconds.' },
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
    // signature boons (v2.2a): two for each hero that change how they play (player.js, "signature boons")
    { id: 'pinlance', name: 'Pinning Lance', tag: 'Signature', max: 1, heroes: ['vesper'], desc: 'A Star Lance that strikes stays fixed in the foe. Your next finisher on it bursts the lance for 40.' },
    { id: 'stars', name: 'Constellation', tag: 'Signature', max: 1, heroes: ['vesper'], desc: 'Each finisher that lands sets a star on the foe. The third links them and bursts for 60.' },
    { id: 'fault', name: 'Fault Line', tag: 'Signature', max: 1, heroes: ['aster'], desc: 'A fully charged smash cracks the floor, and a second later the crack erupts for 45.' },
    { id: 'unbroken', name: 'Unbroken', tag: 'Signature', max: 1, heroes: ['aster'], desc: 'A blow taken while you charge the smash fills the charge at once, and the smash comes.' },
    { id: 'splitarrow', name: 'Splitting Arrow', tag: 'Signature', max: 1, heroes: ['lune'], desc: 'The heavy arrow splits into three where it first strikes.' },
    { id: 'glide', name: 'Moonglide', tag: 'Signature', max: 1, heroes: ['lune'], desc: 'Hold the attack in the air and you fall slowly while you fire.' },
    { id: 'hanging', name: 'Hanging Cut', tag: 'Signature', max: 1, heroes: ['eos'], desc: 'The cut of a full draw hangs in the air, and a second later cuts again for half.' },
    { id: 'secondsun', name: 'Second Sun', tag: 'Signature', max: 1, heroes: ['eos'], desc: 'After a full draw, hold again within 3 seconds and the sheath is open at once, at two marks.' },
  ];
  // Sets (v2.3a): four kinds of boon, each leaving its own mark on the foe. A set boon fits one of five
  // slots (Strike, Special, Dash, Mend, and since v2.6c Jump), one boon to a slot: a new one for a full slot replaces the
  // old. Three of one set opens its crown, a move of its own on the crown key, charged by the set's
  // mark doing its work (the mechanics are in sets.js).
  G.SETS = {
    ember: { name: 'Ember', col: '255,132,64', css: '#ff8440', crown: 'Pyre',
      rule: 'Embers burn the foe, five at most, and die down unless more are set.',
      crownDesc: 'Tear every ember off the foe at once, each bursting for 16. Then your weapon burns for six seconds, and every blow sets an ember.' },
    storm: { name: 'Storm', col: '255,236,140', css: '#ffec8c', crown: 'Thunderstep',
      rule: 'Static builds on the foe. At ten, a bolt strikes it for 24.',
      crownDesc: 'Streak through the foe as lightning for 24, untouchable as you pass. Press again to streak back, up to three times within two seconds.' },
    tide: { name: 'Tide', col: '80,214,204', css: '#50d6cc', crown: 'Undertow',
      rule: 'A soaked foe moves and strikes slower, 6% for each layer, three at most. Soaking lasts four seconds.',
      crownDesc: 'A wave knocks the foe off its feet: it is staggered at once, and everything it has thrown is washed away.' },
    gloam: { name: 'Gloam', col: '168,120,240', css: '#a878f0', crown: 'Nightfall',
      rule: 'A dark ring marks the foe. Your next finisher or special deals double and spends it; it returns four seconds later.',
      crownDesc: 'The arena goes dark for three seconds. Every blow you land in the dark lands again when the light returns.' },
  };
  G.SET_IDS = ['ember', 'storm', 'tide', 'gloam'];
  // (v2.6c) a fifth slot, Jump: three boons of one set and two of another make a crown and a duo
  G.SLOTS = ['strike', 'special', 'dash', 'mend', 'jump'];
  G.SLOT_NAMES = { strike: 'Strike', special: 'Special', dash: 'Dash', mend: 'Mend', jump: 'Jump' };
  for (const b of [
    { id: 'emstrike', set: 'ember', slot: 'strike', name: 'Searing Edge', desc: 'Finishers set two embers on the foe.' },
    { id: 'emspecial', set: 'ember', slot: 'special', name: 'Kindled Star', desc: 'Your special sets three embers on the foe.' },
    { id: 'emdash', set: 'ember', slot: 'dash', name: 'Ashen Trail', desc: 'A dash along the ground leaves fire on the floor. A foe that touches it catches an ember.' },
    { id: 'emmend', set: 'ember', slot: 'mend', name: 'Hearthwave', desc: 'Mending sends out a wave of heat: a foe close by catches three embers.' },
    { id: 'emjump', set: 'ember', slot: 'jump', name: 'Cinderfall', desc: 'Landing from a jump scatters cinders: a foe close by catches two embers.' },
    { id: 'ststrike', set: 'storm', slot: 'strike', name: 'Charged Edge', desc: 'Every blow of your weapon builds static on the foe, and a finisher builds two.' },
    { id: 'stspecial', set: 'storm', slot: 'special', name: 'Thunderhead', desc: 'Your special leaves a storm cloud over the foe. It strikes four times for 10, each building two static.' },
    { id: 'stdash', set: 'storm', slot: 'dash', name: 'Lightning Step', desc: 'A perfect dodge calls a bolt down on the foe for 24.' },
    { id: 'stmend', set: 'storm', slot: 'mend', name: 'Quickening', desc: 'Mending takes 30% less time, and when it ends a bolt strikes the foe for 24.' },
    { id: 'stjump', set: 'storm', slot: 'jump', name: 'Skybreak', desc: 'A jump in the air sends lightning straight down: a foe below you takes 24, and static builds by two.' },
    { id: 'tdstrike', set: 'tide', slot: 'strike', name: 'Undercurrent', desc: 'Finishers soak the foe.' },
    { id: 'tdspecial', set: 'tide', slot: 'special', name: 'Breaking Wave', desc: 'Your special soaks the foe twice, and washes away what it has thrown near you.' },
    { id: 'tddash', set: 'tide', slot: 'dash', name: 'Slack Water', desc: 'A perfect dodge soaks the foe, and the attack you slipped runs at half speed for a second.' },
    { id: 'tdmend', set: 'tide', slot: 'mend', name: 'Tidewall', desc: 'Mending raises a wall of water around you that turns the next blow aside.' },
    { id: 'tdjump', set: 'tide', slot: 'jump', name: 'Splashdown', desc: 'Landing from a jump throws up a splash: a foe close by is soaked.' },
    { id: 'glstrike', set: 'gloam', slot: 'strike', name: 'Nightblade', desc: 'A finisher that spends the mark gives back a third of a segment of Starlight.' },
    { id: 'glspecial', set: 'gloam', slot: 'special', name: 'Shadow Star', desc: 'Your special hits 30% harder and marks the foe at once.' },
    { id: 'gldash', set: 'gloam', slot: 'dash', name: 'Umbral Step', desc: 'A perfect dodge marks the foe at once, and its Riposte waits twice as long.' },
    { id: 'glmend', set: 'gloam', slot: 'mend', name: 'Fade', desc: 'When mending ends you fade for a second and a half, and blows pass through you.' },
    { id: 'gljump', set: 'gloam', slot: 'jump', name: 'Nightglide', desc: 'In the air, the dark mark is spent for triple, not double.' },
  ]) { b.tag = G.SETS[b.set].name; b.max = 1; G.BOONS.push(b); }
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
  // Duos (v2.6c): what two sets do together. Not taken from the road: a duo is simply on while two
  // boons of each of its sets sit in their slots (2 + 2, 3 + 2 or 2 + 2 + 1), and off again if a swap
  // breaks that. Five slots allow one crown (three of a set) and one duo at once, and never two duos.
  // The mechanics are in sets.js, which asks G.boon(id) like any boon.
  G.DUOS = [
    { id: 'heat', name: 'Heat Lightning', of: ['ember', 'storm'], desc: 'Every bolt sets two embers, and static builds twice as fast on a burning foe.' },
    { id: 'scald', name: 'Scald', of: ['ember', 'tide'], desc: 'On a soaked foe, embers burn as steam for double, and do not die down while it stays soaked.' },
    { id: 'blackflame', name: 'Black Flame', of: ['ember', 'gloam'], desc: 'Spending the dark mark makes every ember on the foe burst for 12, and they burn on.' },
    { id: 'conductor', name: 'Conductor', of: ['storm', 'tide'], desc: 'A bolt on a soaked foe strikes twice, and every blow on it builds one static for each layer of soak.' },
    { id: 'nightthunder', name: 'Night Thunder', of: ['storm', 'gloam'], desc: 'Bolts can spend the dark mark too, for double, and the mark comes back in 2 seconds, not 4.' },
    { id: 'abyss', name: 'Abyss', of: ['tide', 'gloam'], desc: 'Spending the dark mark on a foe soaked three deep fills a quarter of its stagger bar.' },
  ];
  for (const d of G.DUOS) { d.tag = 'Duo'; d.max = 1; d.duo = true; }
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
  for (const b of G.BOONS.concat(G.PAIRS, G.CURSED, G.DUOS)) boonById[b.id] = b;
  const duoById = {};
  for (const d of G.DUOS) duoById[d.id] = d;
  G.boonDef = (id) => boonById[id];
  // the pairs a boon can lead to, and the ones open to you now
  G.pairsOf = (id) => G.PAIRS.filter((p) => p.of.includes(id));
  const openPairs = () => G.PAIRS.filter((p) => !G.boon(p.id) && p.of.every((id) => G.boon(id)));

  // How many of a boon the hero holds, and the damage multiplier that applies to everything.
  G.boon = (id) => R.boons[id] || (duoById[id] && R.duo() === duoById[id] ? 1 : 0); // (a duo is on while its sets are slotted)
  // a corrupted boon's drawback, while it is held and has not been cleansed
  G.bane = (id) => !!R.boons[id] && !(R.purged || []).includes(id);
  // Boons and relics, the Shrine's Whetstone, the Flow rank, and the two trophies that depend on the moment.
  G.dmgMult = () => (1 + 0.35 * G.boon('glass')) * (G.boon('whisper') ? 1.3 : 1)
    * (1 + 0.04 * G.up('edge')) * (1 + 0.03 * G.flow.rank)
    * G.relics.dmgK(); // every relic's share (Thorn Crown, the Shroud, the Oath, the Wraps...): relics.js

  G.roman = function (n) {
    const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = '';
    for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
    return s;
  };

  R.reset = function () {
    R.trial = 1; R.boons = {}; R.order = []; R.offer = []; R.relic = null; R.relicOffer = []; R.phoenixUsed = false; R.phoenixN = 0;
    R.awake = 0; R.sun = 0; // the relics' awakening (0 to 3) and the Rising Sun's measure: relics.js
    R.omens = []; R.lastOmens = []; R.ult = 0;
    // (v2.6e) every run has one redraw of the offering (the standing stone; the Shrine's Second Thoughts
    // adds more); banishes (a boon struck from the run, its plinth drawn again) come only from the
    // Shrine's Banishment, which unlocks them
    R.rerolls = 1 + G.up('reroll'); R.banishes = G.up('banish'); R.banned = [];
    R.hero = heroById[G.settings.hero] ? G.settings.hero : 'vesper';
    R.foes = [];
    // the portals (rest.js): bosses beaten this run, the one being fought, whether it is corrupted,
    // the portals corrupted and waiting, those already cleansed, and the relics they paid
    R.beaten = []; R.current = null; R.corrupt = false; R.corrupted = []; R.cleansed = []; R.extraRelics = [];
    R.offerKind = 'boon';
    R.purged = []; R.cleanses = 0; // corrupted boons cleansed at the fountain, and how often it has been used
    // who was met on the road last (rest.js), boons tempered by the smith, and an omen pledged at the altar
    R.lastEvent = null; R.tempers = 0; R.pledge = false;
    R.champMet = false; R.champFight = false; R.champUlt = 0; // the Champion's doorway: met this run, being fought, the meter before (champion.js, rest.js)
    R.crown = 0; R.replaced = null; // the crown's charge, which carries over like Dawnbreak; the set boon a take just pushed out
    // (v2.7a) what the run has dealt and taken, by source, for the recap on the result screens: the whole run,
    // and the fight in hand (game.js starts it afresh)
    R.stats = { dealt: {}, taken: {} }; R.fight = { dealt: {}, taken: {} };
    R.daily = null; R.dn = {}; // (v2.8a) the day of a daily trial, and how often each of its picks has been drawn
    if (typeof document !== 'undefined') document.documentElement.style.setProperty('--herocol', G.hero().css); // (a hero's own boons wear the hero's colour)
  };

  // (v2.7a) A run is saved as it goes (game.js): this is what it holds, as plain data. The offering and
  // the relics on offer are kept by id and looked up again; everything else is plain already.
  R.snapshot = function () {
    const out = {};
    for (const k of Object.keys(R)) {
      const v = R[k];
      if (typeof v === 'function' || k === 'CORRUPT_CHANCE') continue;
      if (k === 'offer') out.offer = (v || []).map((b) => ({ id: b.id, relic: !!b.relicReward }));
      else if (k === 'relicOffer') out.relicOffer = (v || []).map((r) => r.id);
      else if (k === 'replaced') out.replaced = v ? v.id : null;
      else out[k] = v;
    }
    return JSON.parse(JSON.stringify(out));
  };
  R.restore = function (s) {
    for (const k of Object.keys(s || {})) {
      if (k === 'offer') R.offer = s.offer.map((o) => (o.relic ? (G.relicDef(o.id) ? Object.assign({ tag: 'Relic', relicReward: true }, G.relicDef(o.id)) : null) : G.boonDef(o.id))).filter(Boolean);
      else if (k === 'relicOffer') R.relicOffer = s.relicOffer.map((id) => G.relicDef(id)).filter(Boolean);
      else if (k === 'replaced') R.replaced = s.replaced ? G.boonDef(s.replaced) || null : null;
      else R[k] = s[k];
    }
    // (a boon that no longer exists, from an older build, is dropped)
    R.order = (R.order || []).filter((id) => G.boonDef(id));
    for (const id of Object.keys(R.boons || {})) if (!G.boonDef(id)) delete R.boons[id];
    if (!R.stats) R.stats = { dealt: {}, taken: {} };
    if (!R.fight) R.fight = { dealt: {}, taken: {} };
  };
  // (v2.8a) The daily trial. Every pick a run makes (the first boss, each offering and redraw, the omens,
  // a corrupted portal, a road's meeting, a banish's replacement, the relic) is drawn from the day itself and
  // how many times that kind of pick has been drawn this run, so the same day and the same choices give the
  // same run on anyone's screen. Outside a daily trial nothing changes. (The fights are seeded too: game.js.)
  R.dayKey = function () { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  R.hashSeed = function (s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  R.seeded = function (tag, fn) {
    if (!R.daily) return fn();
    R.dn = R.dn || {};
    const n = R.dn[tag] = (R.dn[tag] || 0) + 1;
    const rng0 = G.rng, pick0 = G.pick, rand0 = Math.random;
    G.seed(R.hashSeed(R.daily + '|' + tag + '|' + n));
    const rr = G.rng;
    Math.random = rr; G.pick = (arr) => arr[(rr() * arr.length) | 0];
    try { return fn(); } finally { G.rng = rng0; G.pick = pick0; Math.random = rand0; }
  };

  // (v2.7a) Damage dealt, by where it came from, and blows taken, by the boss's attack: for the recap.
  R.source = (info) => (G.player.ulting ? 'Dawnbreak' : info.crown ? 'Crown' : info.tick ? 'Embers' : info.set ? 'Set'
    : info.relic ? 'Relic' : info.flow ? 'Flow' : info.lance ? 'Special' : info.finisher ? 'Finishers' : 'Blows');
  R.tally = function (dmg, info) {
    if (G.practice || !(dmg > 0)) return;
    const k = R.source(info || {});
    for (const o of [R.stats.dealt, R.fight.dealt]) o[k] = (o[k] || 0) + dmg;
  };
  R.hurtBy = function (dmg) {
    if (G.practice || !(dmg > 0)) return;
    const B = G.boss, k = (B.id || '?') + ':' + (B.attackName || '');
    for (const o of [R.stats.taken, R.fight.taken]) o[k] = (o[k] || 0) + dmg;
  };

  // A run is seven fights (v2.6c: one for each boss; it was six), then (to come) an eighth that is
  // always the same final one. The first is
  // drawn at random; after each, on the road between (rest.js), you choose the next by walking into
  // its portal. Each boss is fought once. A beaten boss's portal may turn corrupted: an optional,
  // far harder fight for a second relic (see G.diff and rollCorruption).
  G.RUN_FIGHTS = 7;
  // (v2.9a) Six of the seven bosses, then the last portal opens on Sol (sol.js): she is the seventh fight,
  // and the run is won when she is beaten. One boss is left out of every run again.
  G.TRIALS = 6;
  R.trialsWon = () => R.beaten.filter((id) => id !== 'sol').length;
  R.solOpen = () => R.trialsWon() >= G.TRIALS && !R.beaten.includes('sol');
  R.left = () => (R.trialsWon() >= G.TRIALS ? [] : G.BOSS_IDS.filter((id) => !R.beaten.includes(id)));
  R.foe = function () {
    if (!R.current) { const left = R.left(); R.current = R.solOpen() ? 'sol' : G.pick(left.length ? left : G.BOSS_IDS); }
    return R.current;
  };
  R.runWon = () => R.beaten.includes('sol');
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
  const baseHp = () => (G.DIFFS[G.settings.difficulty] || G.DIFFS[1]).hp + G.hero().hp + G.boon('heart') + G.up('vigor') - G.relics.crownCost();

  // Three relics to choose from before the first trial.
  R.rollRelics = function () {
    const pool = G.RELICS.filter((r) => G.meta.unlocked(r) && (r.id !== 'crown' || baseHp() >= 4));
    R.relicOffer = G.shuffle(pool.slice()).slice(0, 3 + G.up('relics'));
    return R.relicOffer;
  };
  // Three boons to choose from after a victory.
  // what may be offered: not held to its limit, the hero's own, not banished this run
  const offerable = (b) => G.boon(b.id) < b.max && (!b.heroes || b.heroes.includes(R.hero))
    && (b.id !== 'glass' || baseHp() - G.boon('glass') >= 3) && !(R.banned || []).includes(b.id);
  R.rollOffer = function (avoid) {
    let pool = G.BOONS.filter((b) => offerable(b) && G.boon(b.id) < b.max
      && (!b.heroes || b.heroes.includes(R.hero))
      && (b.id !== 'glass' || baseHp() - G.boon('glass') >= 3));
    const n = 3 + G.up('choice');
    // a redraw shows different boons where there are enough left to do so
    const fresh = avoid ? pool.filter((b) => !avoid.includes(b)) : pool;
    if (fresh.length >= n) pool = fresh;
    R.offer = [];
    // set boons come from one set at a time (v2.3a): up to two of them, more often from a set you
    // already lean on, so a set can be gathered without being forced. (v2.6c) Within the set, a boon
    // for a slot still empty is four times as likely as one that would replace what a slot holds.
    const bySet = {};
    for (const b of pool) if (b.set) (bySet[b.set] = bySet[b.set] || []).push(b);
    const sets = Object.keys(bySet);
    if (sets.length) {
      const leaned = sets.filter((s) => R.setCount(s) > 0);
      const set = leaned.length && Math.random() < 0.6 ? G.pick(leaned) : G.pick(sets);
      const slots = R.slots(), w = (b) => (slots[b.slot] ? 1 : 4);
      const drawn = bySet[set].map((b) => ({ b, k: Math.pow(Math.random(), 1 / w(b)) })).sort((x, y) => y.k - x.k); // (a weighted draw)
      R.offer.push(...drawn.slice(0, Math.min(2, n - 1)).map((x) => x.b));
    }
    // the rest are ordinary boons, never more than one of the hero's own (v2.2a)
    let own = false;
    for (const b of G.shuffle(pool.filter((q) => !q.set))) {
      if (R.offer.length >= n) break;
      if (b.heroes) { if (own) continue; own = true; }
      R.offer.push(b);
    }
    R.offer = G.shuffle(R.offer);
    R.offerKind = 'boon';
    // a pair you have earned takes one card's place, on half the offers
    const open = openPairs().filter((p) => (!avoid || !avoid.includes(p)) && !(R.banned || []).includes(p.id));
    if (open.length && Math.random() < 0.5) R.offer[Math.min(R.offer.length, n - 1)] = G.pick(open);
    // and once a boss has fallen, a corrupted boon takes the first card's place on two offers in five
    const cursed = G.CURSED.filter((b) => !G.boon(b.id) && (!avoid || !avoid.includes(b)) && !(R.banned || []).includes(b.id));
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
  // The wandering smith (rest.js): one more of a boon you hold, even past its limit (one past at most),
  // for Sunshards. Only boons that grow with each one held can be tempered. The price doubles each time.
  R.temperCost = () => 50 * Math.pow(2, R.tempers || 0);
  R.temperable = () => R.held().filter((h) => h.def.max >= 2 && !h.def.cursed && !h.def.pair && h.n < h.def.max + 1).map((h) => h.def);
  R.temper = function (id) {
    const cost = R.temperCost(), b = boonById[id];
    if (!b || !R.temperable().includes(b) || G.meta.shards < cost) return false;
    G.meta.shards -= cost; G.meta.save();
    R.boons[id] = G.boon(id) + 1; R.order.push(id); R.tempers = (R.tempers || 0) + 1;
    return true;
  };
  // The fortune-teller's cards (rest.js): a boon not on the offering, or a corrupted one not held.
  R.freeBoon = function () {
    const ids = (R.offer || []).map((b) => b.id);
    const pool = G.BOONS.filter((b) => G.boon(b.id) < b.max && !ids.includes(b.id) && (!b.heroes || b.heroes.includes(R.hero)) && b.id !== 'glass' && !(R.banned || []).includes(b.id));
    if (!pool.length) return null;
    const b = G.pick(pool);
    R.grant(b);
    return b;
  };
  R.freeCurse = function () {
    const ids = (R.offer || []).map((b) => b.id);
    const pool = G.CURSED.filter((b) => !G.boon(b.id) && !ids.includes(b.id));
    if (!pool.length) return null;
    const b = G.pick(pool);
    R.boons[b.id] = 1; R.order.push(b.id);
    return b;
  };
  // Second Thoughts (the Shrine): draw the offer again.
  R.reroll = function () {
    if (R.rerolls <= 0) return false;
    R.rerolls--;
    R.rollOffer(R.offer);
    return true;
  };
  // (v2.6e) Banish the boon on plinth i: it is never offered again this run, and the plinth draws
  // another in its place (of the same kind where it can: a set boon for a set boon, else anything).
  // Returns the new boon, or null.
  R.banish = function (i) {
    const b = R.offer[i];
    if (!b || R.banishes <= 0 || R.offerKind !== 'boon') return null;
    R.banishes--; R.banned.push(b.id);
    const shown = R.offer.map((o) => o.id);
    const pool = G.BOONS.filter((o) => offerable(o) && !shown.includes(o.id));
    const like = pool.filter((o) => !!o.set === !!b.set);
    const nb = (like.length ? G.pick(like) : pool.length ? G.pick(pool) : null);
    if (nb) R.offer[i] = nb; else R.offer.splice(i, 1);
    return nb;
  };
  R.take = function (i) {
    const b = R.offer[i];
    if (!b) return;
    R.grant(b);
  };
  // Add a boon to the run. A set boon takes its slot, and whatever was in that slot is given up.
  R.grant = function (b) {
    R.replaced = null;
    if (b.slot) {
      const old = R.slots()[b.slot];
      if (old && old !== b.id) { delete R.boons[old]; R.order = R.order.filter((id) => id !== old); R.replaced = boonById[old]; }
    }
    R.boons[b.id] = G.boon(b.id) + 1;
    R.order.push(b.id);
  };
  // The set boon in each slot: { strike: id, ... }.
  R.slots = function () {
    const out = {};
    for (const id of R.order) { const b = boonById[id]; if (b && b.slot) out[b.slot] = id; }
    return out;
  };
  R.setCount = (set) => Object.values(R.slots()).filter((id) => boonById[id].set === set).length;
  // The set whose crown is open: three of its boons held. (With five slots only one can be.)
  R.crownSet = () => G.SET_IDS.find((s) => R.setCount(s) >= 3) || null;
  // The duo that is on: two boons of each of its sets in their slots (with five slots, one at most).
  // R.duoOf(count) asks it of other counts per set: what taking a card would leave you with.
  R.duoOf = (count) => G.DUOS.find((d) => d.of.every((s) => count(s) >= 2)) || null;
  R.duo = () => R.duoOf(R.setCount);
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
  // (v2.8a: in a daily trial these picks come from the day: R.seeded)
  for (const k of ['foe', 'rollCorruption', 'rollRelicReward', 'rollOffer', 'freeBoon', 'freeCurse', 'banish']) {
    const f = R[k];
    if (f) R[k] = function () { const a = arguments; return R.seeded(k, () => f.apply(R, a)); };
  }
  // From the fifth trial (of seven, the last three met) they also use their Merciless patterns.
  G.fierce = () => G.settings.difficulty === 2 || R.trial >= 5 || (G.corrupt && G.corrupt.on());
})();
