// Solfall - relics that awaken (v2.6a).
// The run's relic grows with the run. On the road after trial II, after trial IV and after trial VII
// (the last before the final door) it stirs in the fire, and held to the flames it awakens a stage:
//   I Kindled    (after II)   mostly a stronger form of what it already does
//   II Awakened  (after IV)   a twist: something it did not do before
//   III Ascendant (after VII) its full form
// Stages build on each other, and every relic held (a second one from a corrupted portal, the
// Offered Hilt) wakes with the run: G.run.awake is the run's stage, 0 to 3.
// Everything a relic does is asked of this file (player.js, run.js, bosskit.js, boss.js, flow.js,
// sets.js and game.js call in), so a relic's whole story, base and awakenings, is told here and in
// G.RELICS (run.js) / the trophies (meta.js).
'use strict';
(function () {
  const RL = G.relics = {};
  const F = G.fx;
  RL.STAGES = ['', 'Kindled', 'Awakened', 'Ascendant'];
  RL.AT = [2, 4, 7]; // trials won (bosses beaten) for each stage (the last: the trial before the final door)

  // What each stage adds, as the cards say it. Stages build on each other.
  RL.AWAKE = {
    chalice: ['Mending takes a quarter less time.', 'Mending takes half the time, and a mend bursts into light around you: 40 to a foe caught in it.', 'The burst reaches further and hits for 60.'],
    shard: ['Finishers deal 75% more.', 'A finisher that lands calls a comet onto the foe a moment later, for 20.', 'Finishers deal double, and the comet strikes for 45.'],
    moons: ['Starlight fills 20% faster.', 'A second extra segment of Starlight.', 'While your Starlight is full, everything you do deals 25% more.'],
    crown: ['All damage +25%.', 'All damage +30%.', 'All damage +40%, and every 25th blow you land without being struck mends one health.'], // (v2.9f: from 40/50/50/65, and the cost stays at two)
    ward: ['A broken ward grows back after 20 seconds.', 'A ward that breaks strikes the foe for 40.', 'It grows back after 10 seconds.'],
    cloak: ['You move 18% faster.', 'Dashes recover a quarter faster.', 'One more dash in the air.'],
    storm: ['The lightning comes every fourth hit.', 'It strikes for 45 and staggers twice as hard.', 'Every third hit, and a perfect dodge calls it too.'],
    phoenix: ['When it saves you, the boss is thrown down.', 'It can save you twice a run.', 'It brings you back on full health, burning: everything you do deals 50% more for 8 seconds.'],
    sunstone: ['The stagger bar fills 55% faster.', 'Each stagger lasts 2.5 seconds longer.', 'Breaking the foe fills a segment of Starlight and a fifth of Dawnbreak.'],
    eye: ['Hits on a staggered boss deal 45% more.', '60% more, and each stagger lasts a second longer.', '80% more, and hitting a staggered boss fills Starlight twice as fast.'],
    prism: ['Your special deals 55% more.', 'A special that lands gives back a quarter of a segment of Starlight.', 'Your special deals 75% more, and strikes again a moment later for 30.'],
    shroud: ['The surge lasts 4 seconds.', 'It is 70% more.', 'While it lasts, the first blow that would strike you is turned aside.'],
    oath: ['On your last health, 70% more.', 'It holds on your last two health.', 'Double damage.'],
    pelt: ['Dashes recover 30% faster.', 'Dashing through the foe scorches it for 18.', 'A dash fills twice the Starlight, and the scorch is 36.'],
    pearl: ['Starlight fills 40% faster.', 'One more health.', 'Once a fight, a blow that leaves you on your last health is answered: the pearl mends two.'],
    wraps: ['The blink’s blow deals 75% more.', 'The window lasts 3 seconds, and the blow staggers twice as hard.', 'Double damage, and the blink gives back half a segment of Starlight.'],
    hilt: ['The echoes last 8 seconds.', 'Three times a fight.', 'Every time you break the boss.'], // (v2.9g: twice a fight from the start)
    hourglass: ['The slow lasts 0.9 seconds.', 'Blows landed in the slow deal 40% more.', 'It lasts 1.2 seconds, and gives back your dashes and jumps in the air.'],
    anvil: ['A blow you take fills a quarter of a segment of Starlight.', 'For 3 seconds after a blow, everything you do deals 40% more.', 'A blow that would take two health takes one.'],
    sun: ['It builds to 45%.', 'Being struck costs only half of it.', 'It builds to 60%, and carries from one fight into the next.'],
    quicksilver: ['A perfect dodge gives back a quarter of a segment of Starlight.', 'One more dash in the air.', 'Dashing through the foe cuts it for 30.'],
    lantern: ['A segment every 7 seconds.', 'A segment every 5 seconds.', 'When your Starlight is full, it overflows into Dawnbreak.'],
  };

  // (v3.0d) Each hero's own relic, from Ascension +2 beaten with them; offered only to that hero.
  G.HERO_RELICS = [
    { id: 'northstar', hero: 'vesper', name: 'North Star', desc: 'Every third finisher that lands throws a free Star Lance at the foe.' },
    { id: 'meteor', hero: 'aster', name: 'Meteor Heart', desc: 'Every second finisher that lands lets out a Starfall around you, at half strength.' },
    { id: 'moonquiver', hero: 'lune', name: 'Moonlit Quiver', desc: 'A perfect dodge looses three arrows at the foe.' },
    { id: 'scabbard', hero: 'eos', name: 'Dawn Scabbard', desc: 'A full draw also throws a crescent of light at the foe.' },
  ];
  for (const r of G.HERO_RELICS) G.RELICS.push(r);
  Object.assign(RL.AWAKE, {
    northstar: ['Every second finisher.', 'A perfect dodge throws one too.', 'The free lances deal double.'],
    meteor: ['The Starfall is 40% wider.', 'Each one fills a quarter of a segment of Starlight.', 'Every finisher.'],
    moonquiver: ['Five arrows.', 'A perfect dodge also fills half a segment of Starlight.', 'The arrows deal double.'],
    scabbard: ['The crescent is as strong as Second Light\u2019s.', 'A full draw fills a quarter of a segment of Starlight.', 'A second crescent follows the first.'],
  });

  // Each relic's light (the reliquary, the fire, the cards and what it strikes with).
  const COL = {
    chalice: '255,150,120', shard: '150,225,255', moons: '214,170,255', crown: '255,96,56', ward: '255,226,170', cloak: '140,245,185',
    storm: '255,250,160', phoenix: '255,170,90', sunstone: '255,214,140', eye: '255,186,92', prism: '150,170,255', shroud: '190,135,255', oath: '130,195,255',
    pelt: '255,130,60', pearl: '120,230,220', wraps: '255,200,150', hilt: '255,226,186',
    hourglass: '170,210,255', anvil: '200,190,180', sun: '255,200,90', quicksilver: '210,230,240', lantern: '255,214,120',
    northstar: '160,225,255', meteor: '150,250,190', moonquiver: '220,180,255', scabbard: '255,170,190', // (v3.0d)
  };
  RL.col = (id) => COL[id] || '255,214,140';

  // ------------------------------------------------------------------ the run's stage
  const R = () => G.run;
  const C = () => G.PLAYER;
  const held = () => { const r = R(); return (r.relic ? [r.relic] : []).concat(r.extraRelics || []); };
  RL.held = held;
  RL.stage = () => R().awake || 0;
  // the stage a relic is at: -1 if it is not held
  const lv = (id) => (G.relic(id) ? (R().awake || 0) : -1);
  RL.lv = lv;
  const by = (id, arr) => arr[Math.max(0, Math.min(3, lv(id)))];
  // the stage the run has earned, and whether one waits at the fire
  RL.due = function () {
    const r = R();
    if (G.practice || !held().length) return r.awake || 0;
    let n = 0;
    for (const at of RL.AT) if (r.beaten.length >= at) n++;
    return Math.max(n, r.awake || 0);
  };
  RL.pending = () => !G.practice && held().length > 0 && RL.due() > (R().awake || 0);
  RL.awaken = function () { const r = R(); r.awake = RL.due(); return r.awake; };
  // the name with its stage, and what it does now (for the cards, the pause menu and the run panel)
  RL.title = function (id) {
    const r = G.relicDef(id), s = R().awake || 0;
    return r ? r.name + (s ? ' · ' + RL.STAGES[s] : '') : '';
  };
  RL.html = function (id, o) {
    const r = G.relicDef(id), s = (o && o.stage != null) ? o.stage : (R().awake || 0), a = RL.AWAKE[id];
    if (!r) return '';
    let h = G.ui.esc(r.desc);
    if (!a) return h;
    for (let i = 0; i < 3; i++) {
      if (i < s) h += '<span class="awake"><b>' + RL.STAGES[i + 1] + '</b> ' + G.ui.esc(a[i]) + '</span>';
      else if (o && o.next && i === s) h += '<span class="awake next"><b>' + RL.STAGES[i + 1] + '</b>, after trial ' + G.roman(RL.AT[i]) + ': ' + G.ui.esc(a[i]) + '</span>';
    }
    return h;
  };

  // ------------------------------------------------------------------ what lasts a fight
  let st = null;
  RL.reset = function () {
    st = { slowT: 0, blazeT: 0, anvilT: 0, wardRe: 0, pearlUsed: false, hiltUses: 0, crownN: 0, qs: false, pend: [], risen: false, finN: 0, arcT: 0, scabN: 0 };
    if (lv('sun') < 3) R().sun = 0; // (Ascendant, it carries over)
  };
  RL.reset();
  RL.state = () => st; // (for the console and tests)
  const fighting = () => G.state === 'fight' && !G.player.dead;
  // the foe's main body, while it can be struck
  function main() {
    const B = G.boss;
    if (!B || !B.active || B.dead || B.dying || B.invuln || B.toppled) return null;
    const ts = B.targets();
    return ts.find((t) => t.kind === 'core' || t.kind === 'body') || ts[0] || null;
  }
  // a relic striking the foe itself (dmg before the damage multipliers)
  function strike(dmg, col, o) {
    const t = main();
    if (!t) return false;
    const x = t.cx, y = t.cy;
    const ok = G.boss.damage(Math.round(dmg * G.dmgMult()), t, { x, y, heavy: true, relic: true, poise: o && o.poise, dir: G.sign(x - G.player.x) || 1 });
    if (!ok) return false;
    G.audio.play((o && o.sound) || 'flareHit');
    F.shake(5);
    F.ring(x, y, { r0: 10, r1: 110, life: 0.35, color: col, width: 5 });
    F.burst(x, y, { n: 14, color: col, speed: [120, 520], life: [0.15, 0.4], kind: 'spark', size: [2, 4] });
    return true;
  }
  function seg(k) {
    const P = G.player, c = C(), full = c.SEG * P.segs, before = Math.floor(P.ember / c.SEG);
    P.ember = Math.min(full, P.ember + c.SEG * k);
    if (Math.floor(P.ember / c.SEG) > before) { G.audio.play('segment'); P.emberFlash = 1; }
  }
  // a strike that arrives a moment later, falling from above (the shard's comet, the prism's echo)
  function later(delay, dmg, col, kind) {
    const t = main();
    if (!t) return;
    st.pend.push({ t: delay, d: delay, dmg, col, kind, x: t.cx, y: t.cy });
  }

  // ------------------------------------------------------------------ asked of by the hero (player.js)
  RL.crownCost = () => (G.relic('crown') ? 2 : 0); // (v2.9f: it no longer drops to one when Awakened)
  RL.pearlHp = () => (G.relic('pearl') ? (lv('pearl') >= 2 ? 2 : 1) : 0);
  RL.moonSegs = () => (G.relic('moons') ? (lv('moons') >= 2 ? 2 : 1) : 0);
  RL.airDashes = () => (lv('cloak') >= 3 ? 1 : 0) + (lv('quicksilver') >= 2 ? 1 : 0);
  RL.runK = () => (G.relic('cloak') ? by('cloak', [1.12, 1.18, 1.18, 1.18]) : 1);
  RL.mendTimeK = () => (lv('chalice') >= 2 ? 0.5 : lv('chalice') >= 1 ? 0.75 : 1);
  RL.mendHp = () => (G.relic('chalice') ? 2 : 1);
  RL.dashCdK = () => (G.relic('pelt') ? by('pelt', [0.8, 0.7, 0.7, 0.7]) : 1) * (lv('cloak') >= 2 ? 0.75 : 1);
  RL.gainK = () => (G.relic('pearl') ? by('pearl', [1.25, 1.4, 1.4, 1.4]) : 1) * (lv('moons') >= 1 ? 1.2 : 1)
    * (lv('eye') >= 3 && G.boss && G.boss.staggered ? 2 : 1);
  RL.finisherK = () => (G.relic('shard') ? by('shard', [1.5, 1.75, 1.75, 2]) : 1);
  RL.specK = () => (G.relic('prism') ? by('prism', [1.4, 1.55, 1.55, 1.75]) : 1);
  RL.stormEvery = () => by('storm', [5, 4, 4, 3]);
  RL.stormDmg = () => (lv('storm') >= 2 ? 45 : 30);
  RL.stormPoise = () => (lv('storm') >= 2 ? 2 : 1);
  RL.wrapsWin = () => (lv('wraps') >= 2 ? 3 : 2);
  RL.anvil = () => G.relic('anvil');
  RL.blowDmg = (dmg) => (lv('anvil') >= 3 && dmg >= 2 ? dmg - 1 : dmg);
  // what a dash through the foe cuts for (on top of Comet Step and Void Step)
  RL.dashCut = () => (G.relic('pelt') ? by('pelt', [0, 0, 18, 36]) : 0) + (lv('quicksilver') >= 3 ? 30 : 0);

  // every damage multiplier a relic gives (G.dmgMult, run.js)
  RL.dmgK = function () {
    const P = G.player;
    if (!P) return 1;
    let k = 1;
    if (G.relic('crown')) k *= by('crown', [1.15, 1.25, 1.3, 1.4]);
    if (G.relic('shroud') && P.shroudT > 0) k *= lv('shroud') >= 2 ? 1.7 : 1.5;
    if (G.relic('oath') && P.hp > 0 && (P.hp === 1 || (lv('oath') >= 2 && P.hp === 2))) k *= by('oath', [1.5, 1.7, 1.7, 2]);
    if (G.relic('wraps') && P.wrapsHit > 0) k *= by('wraps', [1.5, 1.75, 1.75, 2]);
    if (lv('moons') >= 3 && P.segs && P.ember >= C().SEG * P.segs - 0.01) k *= 1.25;
    if (st.blazeT > 0) k *= 1.5;
    if (lv('hourglass') >= 2 && st.slowT > 0) k *= 1.4;
    if (lv('anvil') >= 2 && st.anvilT > 0) k *= 1.4;
    if (G.relic('sun')) k *= 1 + (R().sun || 0) / 100;
    return k;
  };

  // the moments
  RL.mended = function () {
    if (!fighting() || lv('chalice') < 2) return;
    // (v2.6b) the mend bursts out around the hero: a medium blast, Awakened; wider and harder, Ascendant
    const P = G.player, t = main(), big = lv('chalice') >= 3, c = RL.col('chalice');
    const rad = big ? CHALICE_R[1] : CHALICE_R[0], x = P.x, y = P.y - 30;
    F.ring(x, y, { r0: 20, r1: rad, life: 0.4, color: c, width: big ? 8 : 6 });
    F.ring(x, y, { r0: 10, r1: rad * 0.6, life: 0.3, color: '255,236,220', width: 3 });
    F.burst(x, y, { n: big ? 30 : 20, color: c, speed: [rad * 1.2, rad * 2.6], life: [0.2, 0.45], kind: 'spark', size: [2, 4] });
    F.shake(big ? 6 : 4);
    G.audio.play('flare');
    if (!t) return;
    // how far the foe's body is from the middle of the blast (its edge, not its centre)
    const gap = t.r != null ? Math.hypot(t.cx - x, t.cy - y) - t.r
      : Math.hypot(Math.max(0, Math.abs(t.cx - x) - (t.hw || 0)), Math.max(0, Math.abs(t.cy - y) - (t.hh || 0)));
    if (gap <= rad) strike(big ? 60 : 40, c, { sound: 'boom' });
  };
  const CHALICE_R = [220, 300]; // the blast's reach, Awakened and Ascendant
  // a blow landed (sets.js S.hit: 'light', 'finisher', or 'special' once a cast)
  RL.hit = function (kind) {
    if (!fighting()) return;
    if (kind === 'finisher' && G.relic('scabbard') && !G.hero().draw && ++st.scabN % 2 === 0) RL.drew(); // (v3.0e: with the naginata, every second finisher)
    // (v3.0d) the heroes' own relics: a free lance (North Star), a Starfall (Meteor Heart)
    if (kind === 'finisher' && (G.relic('northstar') || G.relic('meteor'))) {
      st.finN++;
      const P = G.player;
      if (G.relic('northstar') && st.finN >= (lv('northstar') >= 1 ? 2 : 3)) { st.finN = 0; if (P.relicLance) P.relicLance(lv('northstar') >= 3 ? 2 : 1); }
      if (G.relic('meteor') && st.finN >= (lv('meteor') >= 3 ? 1 : 2)) {
        st.finN = 0;
        const w = lv('meteor') >= 1 ? 1.4 : 1;
        if (P.relicStarfall) P.relicStarfall(w, 0.5 / w);
        if (lv('meteor') >= 2) seg(0.25);
      }
    }
    if (kind === 'finisher' && lv('shard') >= 2) later(0.32, lv('shard') >= 3 ? 45 : 20, RL.col('shard'), 'comet');
    if (kind === 'special' && lv('prism') >= 2) {
      seg(0.25);
      if (lv('prism') >= 3) later(0.25, 30, RL.col('prism'), 'echo');
    }
  };
  // damage the foe took from anything of the hero's (bosskit.js, boss.js)
  RL.dealt = function (amount, info) {
    if (!fighting() || (info && info.tick)) return;
    const P = G.player;
    if (lv('crown') >= 3) {
      st.crownN++;
      if (st.crownN % 25 === 0 && P.hp < P.maxHp) {
        P.hp++; G.audio.play('heal');
        F.text(P.x, P.y - 84, 'THORNS MEND', { color: RL.col('crown'), size: 15, life: 0.9 });
        F.ring(P.x, P.y - 24, { r0: 10, r1: 70, life: 0.4, color: RL.col('crown'), width: 4 });
      }
    }
    if (G.relic('sun')) {
      const cap = by('sun', [30, 45, 45, 60]), r = R();
      r.sun = Math.min(cap, (r.sun || 0) + 1);
      if (r.sun >= cap && !st.risen) {
        st.risen = true; G.audio.play('segment');
        F.text(P.x, P.y - 96, 'RISEN', { color: RL.col('sun'), size: 17, life: 1 });
        F.ring(P.x, P.y - 30, { r0: 12, r1: 120, life: 0.5, color: RL.col('sun'), width: 5 });
      }
    }
  };
  // a blow taken (after the health is gone; P.hp may be 0)
  RL.hurt = function () {
    const P = G.player;
    st.crownN = 0;
    if (G.relic('sun')) { R().sun = lv('sun') >= 2 ? Math.floor((R().sun || 0) / 2) : 0; st.risen = false; }
    if (P.hp <= 0) return;
    if (lv('anvil') >= 1) seg(0.25);
    if (lv('anvil') >= 2) st.anvilT = 3;
    if (lv('pearl') >= 3 && P.hp === 1 && !st.pearlUsed && fighting()) {
      st.pearlUsed = true; P.hp = Math.min(P.maxHp, 3);
      G.audio.play('heal');
      F.text(P.x, P.y - 96, 'THE PEARL', { color: RL.col('pearl'), size: 17, life: 1.1 });
      F.ring(P.x, P.y - 24, { r0: 80, r1: 20, life: 0.5, color: RL.col('pearl'), width: 6 });
    }
  };
  // a perfect dodge (player.js perfect)
  RL.perfect = function () {
    if (!fighting()) return;
    const P = G.player;
    if (lv('northstar') >= 2 && P.relicLance) P.relicLance(lv('northstar') >= 3 ? 2 : 1); // (v3.0d)
    if (G.relic('moonquiver') && P.relicArrows) { P.relicArrows(lv('moonquiver') >= 1 ? 5 : 3, lv('moonquiver') >= 3 ? 2 : 1); if (lv('moonquiver') >= 2) seg(0.5); }
    if (lv('storm') >= 3) bolt();
    if (lv('quicksilver') >= 1) seg(0.25);
    if (G.relic('hourglass')) {
      st.slowT = by('hourglass', [0.6, 0.9, 0.9, 1.2]);
      F.vig(RL.col('hourglass'), 0.22, st.slowT + 0.2);
      F.ring(P.x, P.y - 30, { r0: 140, r1: 30, life: 0.35, color: RL.col('hourglass'), width: 3 });
      G.audio.play('pulse', { k: 0.4 });
      if (lv('hourglass') >= 3) { P.airDashes = P.maxDash; P.airJumps = P.maxAir; P.dashCd = 0; }
    }
  };
  // the Silent Shroud's surge (flow.js, on a perfect dodge)
  RL.shroud = function () {
    if (!G.relic('shroud')) return;
    const P = G.player;
    P.shroudT = lv('shroud') >= 1 ? 4 : 3;
    if (lv('shroud') >= 3 && !P.ward) { P.ward = true; P.wardT = P.shroudT; }
  };
  // a ward turned a blow aside (player.js tryHit)
  RL.warded = function () {
    if (!G.relic('ward')) return;
    if (lv('ward') >= 2) strike(40, RL.col('ward'), { sound: 'flare' });
    if (lv('ward') >= 1) st.wardRe = lv('ward') >= 3 ? 10 : 20;
  };
  // a dash begins (in a fight)
  RL.dashed = function () {
    if (G.state !== 'fight') return;
    const P = G.player, c = C();
    if (G.relic('pelt')) P.gain(c.GAIN_HIT * (lv('pelt') >= 3 ? 2 : 1)); // Cinder Pelt (the wolf's trophy)
    st.qs = false;
    if (G.relic('quicksilver') && P.ember >= c.SEG / 8) { P.ember -= c.SEG / 8; st.qs = true; }
  };
  // (v3.0d) a full draw (player.js drawCut): the Dawn Scabbard's crescent
  RL.drew = function () {
    if (!fighting() || !G.relic('scabbard')) return;
    const P = G.player;
    if (P.relicArc) P.relicArc(lv('scabbard') >= 1 ? 1 : 0.6);
    if (lv('scabbard') >= 2) seg(0.25);
    if (lv('scabbard') >= 3) st.arcT = 0.18;
  };
  // the wait after a dash (Quicksilver halves it when the dash was paid for)
  RL.dashEndK = function () { const k = st.qs ? 0.5 : 1; st.qs = false; return k; };
  // Sparring Wraps' blink (player.js wrapsBlink)
  RL.blinked = function () { if (lv('wraps') >= 3) seg(0.5); };
  // the Phoenix Feather
  RL.phoenixReady = () => G.relic('phoenix') && (R().phoenixN || 0) < (lv('phoenix') >= 2 ? 2 : 1);
  RL.phoenix = function () {
    const P = G.player, r = R(), s = lv('phoenix');
    r.phoenixN = (r.phoenixN || 0) + 1; r.phoenixUsed = !RL.phoenixReady();
    P.hp = s >= 3 ? P.maxHp : Math.min(P.maxHp, 3); P.inv = 3;
    if (s >= 3) st.blazeT = 8;
    if (s >= 1 && G.boss.forceStagger) G.boss.forceStagger();
  };

  // ------------------------------------------------------------------ asked of by the boss (bosskit.js, boss.js)
  RL.staggerK = () => (G.relic('eye') ? by('eye', [1.3, 1.45, 1.6, 1.8]) : 1);
  RL.poiseK = () => (G.relic('sunstone') ? by('sunstone', [1.4, 1.55, 1.55, 1.55]) : 1)
    * (lv('wraps') >= 2 && G.player.wrapsHit > 0 ? 2 : 1);
  RL.staggerAdd = () => (G.relic('sunstone') ? by('sunstone', [1.5, 1.5, 2.5, 2.5]) : 0) + (lv('eye') >= 2 ? 1 : 0);
  // the boss is broken (its stagger begins)
  RL.onStagger = function () {
    const P = G.player;
    if (G.relic('hilt')) {
      const s = lv('hilt'), uses = s >= 3 ? Infinity : s >= 2 ? 3 : 2; // (v2.9g: 1 and 2)
      if (st.hiltUses < uses) { st.hiltUses++; P.hiltT = s >= 1 ? 8 : 6; G.audio.play('segment'); } // (the Offered Hilt's echoes: player.js)
    }
    if (lv('sunstone') >= 3 && fighting()) {
      seg(1); P.ult = Math.min(100, P.ult + 20);
      F.text(P.x, P.y - 96, 'SUNSTONE', { color: RL.col('sunstone'), size: 15, life: 0.9 });
    }
  };
  // the boss's clock (game.js): the Still Hourglass slows it after a perfect dodge
  RL.bossK = () => (st.slowT > 0 ? 0.5 : 1);

  // ------------------------------------------------------------------ each frame
  function bolt() {
    const t = main();
    if (!t) return;
    st.pend.push({ t: 0.08, d: 0.08, dmg: RL.stormDmg(), col: '255,250,200', kind: 'bolt', x: t.cx, y: t.cy, poise: RL.stormPoise() });
  }
  RL.update = function (dt) {
    const P = G.player;
    if (st.slowT > 0) st.slowT -= dt;
    if (st.blazeT > 0) {
      st.blazeT -= dt;
      if (Math.random() < dt * 30) F.spawn({ kind: 'spark', x: P.x + G.rand(-14, 14), y: P.y - G.rand(0, 50), vx: G.rand(-30, 30), vy: -G.rand(120, 300), life: G.rand(0.2, 0.4), size: G.rand(1.4, 2.4), color: RL.col('phoenix'), len: 0.05 });
    }
    if (st.anvilT > 0) st.anvilT -= dt;
    if (!fighting()) { st.pend.length = 0; st.arcT = 0; return; }
    if (st.arcT > 0) { st.arcT -= dt; if (st.arcT <= 0 && P.relicArc) P.relicArc(1); } // (the Dawn Scabbard's second crescent)
    // the ward grows back
    if (st.wardRe > 0) {
      st.wardRe -= dt;
      if (st.wardRe <= 0 && !P.ward) {
        P.ward = true; P.wardT = 0;
        G.audio.play('tink');
        F.ring(P.x, P.y - 22, { r0: 70, r1: 30, life: 0.4, color: RL.col('ward'), width: 4 });
      }
    }
    // the Lantern of Hours fills Starlight by itself
    const B = G.boss;
    if (G.relic('lantern') && B.active && !B.dead && !B.dying && !P.ulting) {
      const c = C(), full = c.SEG * P.segs;
      if (P.ember < full) seg(dt / by('lantern', [10, 7, 5, 5]));
      else if (lv('lantern') >= 3) P.ult = Math.min(100, P.ult + dt * 100 / 30);
    }
    // strikes on their way
    for (let i = st.pend.length - 1; i >= 0; i--) {
      const q = st.pend[i];
      q.t -= dt;
      const t = main();
      if (t) { q.x = t.cx; q.y = t.cy; }
      if (q.t > 0) continue;
      st.pend.splice(i, 1);
      if (q.kind === 'bolt') {
        if (strike(q.dmg, q.col, { poise: q.poise })) {
          const pts = [];
          for (let k = 0; k <= 7; k++) pts.push([q.x + (k === 7 ? 0 : G.rand(-26, 26)), -20 + (q.y + 20) * k / 7]);
          P.bolts.push({ pts, life: 0.22 });
        }
      } else strike(q.dmg, q.col, { sound: q.kind === 'comet' ? 'boom' : 'flare' });
    }
  };
  // the comets and echoes on their way, over the foe (game.js, with the sets)
  RL.draw = function (ctx) {
    // the Rising Sun's measure: an arc at the hero's feet, filling towards its cap
    const P = G.player, sun = R().sun || 0;
    if (G.relic('sun') && sun > 0 && G.state === 'fight' && !P.dead && !P.hidden) {
      const cap = by('sun', [30, 45, 45, 60]), k = sun / cap, c = RL.col('sun');
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = G.rgba(c, 0.18); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(P.x, P.y + 1, 30, 7, 0, 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = G.rgba(c, k >= 1 ? 0.85 : 0.6); ctx.lineWidth = k >= 1 ? 3.5 : 3;
      ctx.beginPath(); ctx.ellipse(P.x, P.y + 1, 30, 7, 0, Math.PI / 2, Math.PI / 2 + G.TAU * k); ctx.stroke();
      ctx.restore();
    }
    if (!st.pend.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const q of st.pend) {
      const k = 1 - Math.max(0, q.t) / q.d;
      if (q.kind === 'comet') {
        const sx = q.x - 260, sy = q.y - 520, x = sx + (q.x - sx) * k * k, y = sy + (q.y - sy) * k * k;
        const tx = x - (q.x - sx) * 0.18, ty = y - (q.y - sy) * 0.18;
        const g = ctx.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, G.rgba(q.col, 0)); g.addColorStop(1, G.rgba(q.col, 0.85));
        ctx.strokeStyle = g; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
        G.draw.glow(ctx, q.col, x, y, 26, 0.6);
      } else if (q.kind === 'echo') {
        ctx.strokeStyle = G.rgba(q.col, 0.7 * k); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(q.x, q.y, 70 * (1 - k) + 12, 0, G.TAU); ctx.stroke();
      }
    }
    ctx.restore();
  };
})();
