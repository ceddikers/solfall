// Solfall - feats: things worth doing once. Four for each boss and two in the camp; each pays
// Sunshards the first time and is kept on the Tally stone in the Vigil.
'use strict';
(function () {
  const M = G.meta;
  // what every boss asks, then what only that boss asks. ok(c): c is this fight's counters (see FE.bump).
  const EVERY = [
    { k: 'clean', name: 'Untouched', desc: 'Win without losing any health', pay: 30, ok: (c) => !c.hurt },
    { k: 'swift', name: 'Swift', desc: 'Win in under 2:30', pay: 20, ok: () => G.time < 150 },
    { k: 'brazen', name: 'Brazen', desc: 'Win after three brazen flourishes', pay: 20, ok: (c) => (c.brazen || 0) >= 3 },
  ];
  const OWN = {
    warden: { k: 'own', name: 'An eye for an eye', desc: 'Land three Ripostes', pay: 20, ok: (c) => (c.riposte || 0) >= 3 },
    mage: { k: 'own', name: 'Return to sender', desc: 'Send two Comets back into it', pay: 20, ok: (c) => (c.comet || 0) >= 2 },
    assassin: { k: 'own', name: 'Faster than silence', desc: 'Reach Flow rank S', pay: 20, ok: () => G.flow.peak >= 4 },
    knight: { k: 'own', name: 'Disarmed', desc: 'Strike it eight times while its sword is away', pay: 20, ok: (c) => (c.unarmed || 0) >= 8 },
    wolf: { k: 'own', name: 'Floored', desc: 'Throw it onto its back three times in one fight', pay: 20, ok: (c) => (c.stagger || 0) >= 3 },
    leviathan: { k: 'own', name: 'Hold fast', desc: 'Win without using Dawnbreak', pay: 20, ok: (c) => !c.ult },
  };
  const CAMP = [
    { id: 'camp.bell', name: 'Bellringer', desc: 'Ring the old bell five times without letting it fall quiet', pay: 10 },
    { id: 'camp.keep', name: 'Lamplighter', desc: 'Keep the lantern off the ground for ten blows', pay: 10 },
  ];
  const BOSSES = ['warden', 'mage', 'assassin', 'knight', 'wolf', 'leviathan'];

  const FE = G.feats = { c: {} };
  FE.BOSSES = BOSSES; FE.CAMP = CAMP;
  FE.of = (boss) => EVERY.concat(OWN[boss]).map((f) => Object.assign({ id: boss + '.' + f.k }, f));
  FE.done = (id) => !!M.feats[id];
  FE.count = () => Object.keys(M.feats).filter((k) => M.feats[k]).length;
  FE.total = BOSSES.length * (EVERY.length + 1) + CAMP.length;
  // counters for the fight in hand: hurt, brazen, riposte, comet, unarmed, stagger, ult
  FE.reset = function () { FE.c = {}; };
  FE.bump = function (k) { FE.c[k] = (FE.c[k] || 0) + 1; };

  // A boss fell: mark and return the feats that were done for the first time. The caller pays.
  FE.win = function (boss) {
    if (!OWN[boss]) return [];
    const got = FE.of(boss).filter((f) => !M.feats[f.id] && f.ok(FE.c));
    for (const f of got) M.feats[f.id] = 1;
    return got;
  };
  // A camp feat, done on the spot. Returns the feat if this was the first time.
  FE.camp = function (id) {
    const f = CAMP.find((x) => x.id === id);
    if (!f || M.feats[id] || !M.earning()) return null;
    M.feats[id] = 1; M.shards += f.pay; M.earned += f.pay; M.save();
    return f;
  };
})();
