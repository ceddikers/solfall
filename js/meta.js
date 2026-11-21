// Solfall - what lasts between runs: Sunshards, the Shrine's permanent upgrades, and the trophy
// relics that the first victory over each boss adds to the relic pool. Kept in the browser's storage.
'use strict';
(function () {
  const M = G.meta = Object.assign({ shards: 0, earned: 0, up: {}, kills: {}, runs: 0 }, G.store.load('meta', {}));
  const save = () => G.store.save('meta', { shards: M.shards, earned: M.earned, up: M.up, kills: M.kills, runs: M.runs });
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
  ];
  for (const t of TROPHIES) { G.RELICS.push(t); }
  G.TROPHIES = TROPHIES;
  M.unlocked = (r) => !r.boss || !!M.kills[r.boss];
  M.trophies = () => TROPHIES.filter((t) => M.kills[t.boss]).length;

  // ------------------------------------------------------------------ Sunshards
  // Tests and god mode earn nothing (G.debug.meta = true forces it, for checking this file).
  const earning = () => G.debug.meta || !(G.debug.freeze || G.debug.god);
  const GRADE = { S: 1.5, A: 1.25, B: 1.1, C: 1 }, DIFF = [0.75, 1, 1.4];
  const base = () => 12 + 5 * (G.run.trial - 1);
  const scale = () => (DIFF[G.settings.difficulty] || 1) * (1 + 0.1 * G.up('fortune')) * (1 + 0.25 * G.run.omens.length);

  // A boss fell. Returns what was earned, for the victory screen.
  M.onVictory = function (grade, bossId) {
    const out = { shards: 0, first: false, relic: null, lines: [] };
    if (!earning()) return out;
    let n = base() * (GRADE[grade] || 1);
    const rank = G.flow.peak;
    if (rank > 0) { n += 2 * rank; out.lines.push('Flow ' + G.flow.RANKS[rank].name + ' +' + 2 * rank); }
    n *= scale();
    if (!M.kills[bossId]) {
      out.first = true; n += 25;
      out.relic = TROPHIES.find((t) => t.boss === bossId) || null;
      out.lines.push('First victory over ' + G.bosses[bossId].short + ' +25');
    }
    if (G.run.omens.length) out.lines.push('Omen +' + 25 * G.run.omens.length + '%');
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
