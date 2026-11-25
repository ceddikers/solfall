// Solfall - what lasts between runs: Sunshards, the Shrine's permanent upgrades, and the trophy
// relics that the first victory over each boss adds to the relic pool. Kept in the browser's storage.
'use strict';
(function () {
  const M = G.meta = Object.assign({ shards: 0, earned: 0, up: {}, kills: {}, runs: 0, best: {}, feats: {}, toys: {} }, G.store.load('meta', {}));
  const save = () => G.store.save('meta', { shards: M.shards, earned: M.earned, up: M.up, kills: M.kills, runs: M.runs, best: M.best, feats: M.feats, toys: M.toys });
  // Erase everything that lasts between runs (Settings, Reset progress).
  M.reset = function () {
    M.shards = 0; M.earned = 0; M.up = {}; M.kills = {}; M.runs = 0; M.best = {}; M.feats = {}; M.toys = {};
    save(); G.store.save('best', {}); G.store.save('depth', {});
  };
  // Fastest first-trial win against a boss on the current difficulty, in seconds (or undefined).
  M.bestTime = (bossId) => (M.best[bossId] || {})[G.settings.difficulty];
  M.save = save;

  // ------------------------------------------------------------------ the Shrine
  // costs: one entry per rank. text(rank) describes what that many ranks give.
  G.SHRINE = [
    { id: 'vigor', name: 'Vigor', costs: [60, 160], text: (n) => '+' + n + ' health' },
    { id: 'edge', name: 'Whetstone', costs: [20, 35, 55, 80, 110], text: (n) => '+' + n * 4 + '% damage' },
    { id: 'spark', name: 'Kindling', costs: [25, 60], text: (n) => 'Each trial starts with ' + n * 40 + '% of a Starlight segment' },
    { id: 'tempo', name: 'Momentum', costs: [30, 55, 90], text: (n) => 'Dawnbreak charges ' + n * 12 + '% faster' },
    { id: 'relics', name: 'Fourth Relic', costs: [90], text: () => 'Choose from four relics, not three' },
    { id: 'choice', name: 'Fourth Boon', costs: [120], text: () => 'Choose from four boons, not three' },
    { id: 'reroll', name: 'Second Thoughts', costs: [50, 110], text: (n) => 'Redraw the boons on offer ' + (n > 1 ? 'twice' : 'once') + ' per run' },
    { id: 'fortune', name: 'Prospector', costs: [30, 60, 100], text: (n) => '+' + n * 10 + '% Sunshards' },
  ];
  const upById = {};
  for (const u of G.SHRINE) upById[u.id] = u;
  G.up = (id) => Math.min(M.up[id] || 0, upById[id] ? upById[id].costs.length : 0);
  M.cost = (u) => u.costs[G.up(u.id)]; // undefined once every rank is bought
  M.buy = function (i) {
    const u = G.SHRINE[i], c = u && M.cost(u);
    if (c == null || M.shards < c) return false;
    M.shards -= c; M.up[u.id] = G.up(u.id) + 1;
    save();
    return true;
  };

  // ------------------------------------------------------------------ trophies
  // The first victory over a boss puts its relic into the pool for every later run.
  const TROPHIES = [
    { id: 'eye', boss: 'warden', name: 'Eclipse Eye', desc: 'Hits on a staggered boss deal 30% more.' },
    { id: 'prism', boss: 'mage', name: 'Magus’s Prism', desc: 'Your special deals 40% more damage.' },
    { id: 'shroud', boss: 'assassin', name: 'Silent Shroud', desc: 'After a perfect dodge, everything you do deals 50% more for 3 seconds.' },
    { id: 'oath', boss: 'knight', name: 'Unburied Oath', desc: 'On your last point of health, everything you do deals 50% more.' },
    { id: 'pelt', boss: 'wolf', name: 'Cinder Pelt', desc: 'A dash fills Starlight as a hit does, and dashes recover 20% faster.' },
    { id: 'pearl', boss: 'leviathan', name: 'Drowned Pearl', desc: 'One more health, and Starlight fills 25% faster.' },
    { id: 'wraps', boss: 'kairo', name: 'Sparring Wraps', desc: 'After a perfect dodge, your next attack blinks you behind the foe and deals 50% more.' },
    { id: 'hilt', boss: 'champion', name: 'The Offered Hilt', desc: 'Once a fight, when you break the boss’s stagger, for 6 seconds every attack also throws an echo of another hero’s weapon.' },
  ];
  for (const t of TROPHIES) { G.RELICS.push(t); }
  G.TROPHIES = TROPHIES;
  M.unlocked = (r) => !r.boss || !!M.kills[r.boss];
  M.trophies = () => TROPHIES.filter((t) => M.kills[t.boss]).length;

  // ------------------------------------------------------------------ Sunshards
  // Tests and god mode earn nothing (G.debug.meta = true forces it, for checking this file).
  const earning = () => !G.practice && (G.debug.meta || !(G.debug.freeze || G.debug.god));
  M.earning = earning;
  const GRADE = { S: 1.5, A: 1.25, B: 1.1, C: 1 }, DIFF = [0.75, 1, 1.4];
  const base = () => 12 + 5 * (G.run.trial - 1);
  const scale = () => (DIFF[G.settings.difficulty] || 1) * (1 + 0.1 * G.up('fortune')) * (1 + 0.25 * G.run.omens.length)
    * (G.run.corrupt ? 3 : 1); // a corrupted boss pays three times over

  // A boss fell. Returns what was earned, for the victory screen.
  M.onVictory = function (grade, bossId) {
    const out = { shards: 0, first: false, relic: null, lines: [], record: 0 };
    if (!earning()) return out;
    // the fastest first-trial win against each boss is kept, per difficulty
    if (G.run.trial === 1) {
      const d = G.settings.difficulty, t = Math.round(G.time * 10) / 10, b = M.best[bossId] = M.best[bossId] || {};
      if (!b[d] || t < b[d]) { b[d] = t; out.record = t; }
    }
    let n = base() * (GRADE[grade] || 1);
    const rank = G.flow.peak;
    if (rank > 0) { n += 2 * rank; out.lines.push('Flow ' + G.flow.RANKS[rank].name + ' +' + 2 * rank); }
    if (G.moments.broke) { n += 6 * G.moments.broke; out.lines.push('Wards broken +' + 6 * G.moments.broke); }
    n *= scale();
    if (!M.kills[bossId]) {
      out.first = true; n += 25;
      out.relic = TROPHIES.find((t) => t.boss === bossId) || null;
      out.lines.push('First victory over ' + G.bosses[bossId].short + ' +25');
    }
    // the Champion's own gift, on top (not scaled): more the first time
    if (bossId === 'champion') { const g = out.first ? 60 : 30; n += g; out.lines.push('His gift +' + g); }
    if (G.run.omens.length) out.lines.push('Omen +' + 25 * G.run.omens.length + '%');
    if (G.run.corrupt) out.lines.push('Corrupted \u00d73');
    // feats done for the first time in this fight (see feats.js); their pay is not scaled
    for (const f of G.feats.win(bossId)) { n += f.pay; out.lines.push('Feat: ' + f.name + ' +' + f.pay); }
    M.kills[bossId] = (M.kills[bossId] || 0) + 1;
    out.shards = Math.round(n);
    M.shards += out.shards; M.earned += out.shards;
    save();
    return out;
  };
  // The hero fell: a share for the health taken off the boss.
  M.onDefeat = function () {
    if (!earning()) return 0;
    const B = G.boss, took = 1 - B.hp / B.maxHp;
    const n = Math.round(base() * 0.4 * took * scale());
    M.shards += n; M.earned += n; M.runs++;
    save();
    return n;
  };
})();
