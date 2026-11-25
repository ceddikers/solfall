// Solfall - clear rates: a scripted player fights whole boss fights, for every boss, hero and trial,
// and reports how often it wins. Run in the page console (through tools/serve.js):
//   fetch('/tools/clear-rates.js').then(r => r.text()).then(t => (0, eval)(t))
// then CLEAR.start({ runs: 10 }) and read CLEAR.status() / CLEAR.table() as it goes.
// Options to start(): bosses, heroes, trials (1..G.RUN_FIGHTS), runs per cell, difficulty (0..2),
// maxT (seconds of fight before it counts as a stalemate), boons (true: trial n starts with n - 1
// random boons and a random relic, as a real run would have; false: bare hero), god (true: the hero
// cannot be hurt, so the time to win measures damage alone), draws (false: Eos only taps his string,
// never holds for a draw).
//
// The fights run in small slices on a message loop, so the page stays usable and a hidden pane keeps
// going. Everything the fights write to localStorage is put back when they finish (CLEAR.restore()).
//
// The scripted player is the one from tools/boss-tests.js (step off marked ground, jump low things,
// stay down for high things, dash when there is no time to walk) taught to fight: it closes on the
// nearest part of the boss that can be hit, attacks it aimed like a mouse click, mends when low and
// safe, spends spare Starlight on its special, and fires Dawnbreak and crowns when they are ready.
// It also knows three answers the plain rules miss: up onto a platform for the Warden's tide, a
// double jump on Kairo's crouch for his spin throw, and behind him for his sweeping wave. Eos plays his
// own way: a short string, then the stance and a draw at three marks (or sooner, as a way out).
// Held in a struggle (Kairo's Last Wave), it mashes the attack at about eight presses a second.
// It is a steady, mediocre player: read its clear rates as a comparison between bosses, heroes and
// trials, not as what a person will see.
(function () {
  'use strict';
  const I = G.input, P = G.player, D = 1 / 120, FLOOR = G.FLOOR, WL = G.WALL_L + 20, WR = G.WALL_R - 20;

  function hold(l, r) { I.down.left = !!l; I.down.right = !!r; }
  function press(a) { if (!I.down[a]) I.pressed[a] = true; I.down[a] = true; }
  function lift(a) { I.down[a] = false; }

  // ---------------------------------------------------------------- where it is unsafe (boss-tests.js)
  function dangers(B) {
    const out = [], py = P.y - 22;
    for (const p of G.arena.pits || []) out.push([(p.l + p.r) / 2, (p.r - p.l) / 2 + 16, 0.1]);
    for (const h of G.hazards.list) {
      if (h.dead) continue;
      switch (h.kind) {
        case 'strike': if (h.t < h.tele + h.active) out.push([h.x, h.w / 2 + 18, h.tele - h.t]); break;
        case 'zone': if (h.style !== 'tide' && h.t < h.tele + h.active) out.push([h.x + h.w / 2, h.w / 2 + 18, h.tele - h.t]); break;
        case 'meteor': out.push([h.x, h.blastR + 16, h.tele - h.t + 0.3]); break;
        case 'blast': if (h.y > FLOOR - 200) out.push([h.x, h.r + 18, h.tele - h.t]); break;
        case 'pool': if (h.t < h.tele + h.active && P.y > FLOOR - 60) out.push([h.x, h.w / 2 + 14, h.tele - h.t]); break;
        case 'mark': out.push([h.x, h.w / 2 + 20, 0.3]); break;
        case 'cloud': if (h.mark) out.push([h.mark.x, 34 + 18, h.mark.tele - h.mark.t]); else out.push([h.x, 20, 2]); break;
        case 'arc': if (h.t < h.tele + h.active && Math.abs(h.y - py) < h.r + 40) out.push([h.x, h.r + 30, h.tele - h.t]); break;
        case 'whirl': if (P.y > FLOOR - 110) out.push([B.body.x, h.r + 44, 0.2]); break;
        case 'beam': {
          if (h.t >= h.tele + h.active) break;
          // a beam that sweeps (Kairo's): every height in front of it is struck, so the whole front is unsafe
          if (h.spin) { const dir = Math.cos(h.ang) >= 0 ? 1 : -1, end = dir > 0 ? WR : WL, a = h.ox - dir * 10; out.push([(a + end) / 2, Math.abs(end - a) / 2 + 16, h.tele - h.t]); break; }
          if (h.follow && !h.locked) break;
          const s = Math.sin(h.ang), c = Math.cos(h.ang);
          if (Math.abs(s) > 0.3) {
            const t = (py - h.oy) / s;
            if (t > -30 && t < h.maxLen + 30) out.push([h.ox + c * t, (h.width / 2 + 16) / Math.abs(s) + 14, h.tele - h.t]);
          }
          break;
        }
        case 'aim': break;
        case 'orb': {
          if (h.roller) break;
          if (h.vy > 60 || h.grav) {
            const g = h.grav || 0, dy = (FLOOR - 20) - h.y;
            const t = g ? (-h.vy + Math.sqrt(Math.max(0, h.vy * h.vy + 2 * g * dy))) / g : dy / h.vy;
            if (t > 0 && t < 1.2) out.push([h.x + h.vx * t, h.r + (h.r > 28 ? 70 : 26), t]);
          }
          const dx = P.x - h.x;
          if (Math.abs(h.y - py) < 46 && Math.abs(dx) < 150 && dx * h.vx > 0 && Math.abs(h.vx) > 120) out.push([P.x, 24, 0]);
          break;
        }
        default: if (h.danger) { const d = h.danger(P); if (d) out.push(d); } break;
      }
    }
    return out;
  }
  const unsafe = (x, ds) => ds.some((d) => Math.abs(x - d[0]) < d[1]);
  function nearestSafe(ds, lo, hi) {
    let best = null, bestD = 1e9;
    for (let x = lo; x <= hi; x += 8) {
      if (unsafe(x, ds)) continue;
      const d = Math.abs(x - P.x);
      if (d < bestD) { bestD = d; best = x; }
    }
    return best;
  }
  const pathClear = (a, b, ds) => { for (let x = Math.min(a, b); x <= Math.max(a, b); x += 12) if (unsafe(x, ds)) return false; return true; };

  // the part of the boss to go for: the nearest one within a jump's height
  function pickTarget(B) {
    let best = null, bestD = 1e9;
    for (const t of B.targets()) {
      const half = t.hw != null ? t.hw : (t.r || 0);
      const vy = Math.max(0, (P.y - 24) - (t.cy + (t.hh != null ? t.hh : (t.r || 0))));
      if (vy > 230) continue; // out of reach overhead
      const d = Math.max(0, Math.abs(t.cx - P.x) - half) + vy * 0.6 + (t.kind === 'core' || t.kind === 'body' ? 0 : 20);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  // ---------------------------------------------------------------- one step of the scripted player
  function act(st, B) {
    const b = B.body || { x: B.core ? B.core.x : G.W / 2, y: 0, hidden: true }, list = G.hazards.list, H = G.hero(), C = G.PLAYER;
    const ds = dangers(B);
    let lo = WL, hi = WR;
    if (G.bounds) { lo = G.bounds.l + 8; hi = G.bounds.r - 8; }
    let jump = false, stayDown = false, high = false;

    for (const h of list) {
      if (h.dead) continue;
      if (h.kind === 'wave') {
        const dx = P.x - h.x;
        if (dx * h.dir > 0 && Math.abs(dx) < 105) jump = true;
      } else if (h.kind === 'rime') {
        for (const c of h.cells) if (Math.abs(c.x - P.x) < h.cw / 2 + 26 && c.at - h.t < 0.17 && c.at + h.active - h.t > 0) jump = true;
      } else if (h.kind === 'lane') {
        const low = h.y + h.h > FLOOR - 4;
        if (!low) continue;
        if (h.h > 80) high = true;
        if (h.dur - h.t < 0.1 && h.h <= 80 && B.id === 'assassin') jump = true;
      } else if (h.kind === 'firewall') {
        const dx = P.x - h.x;
        if (h.started && dx * h.dir > 0 && Math.abs(dx) < 120) { jump = true; high = true; }
      } else if (h.kind === 'flycut') {
        const dx = P.x - h.x;
        if (dx * h.vx > 0 && Math.abs(dx) < 210 && Math.abs(h.y - (P.y - 22)) < 90) jump = true;
      } else if (h.kind === 'crescent') {
        if ((P.x - h.x) * h.dir > -40 && Math.abs(P.x - h.x) < 230) stayDown = true;
      } else if (h.kind === 'beam') {
        const sn = Math.sin(h.ang), cs = Math.cos(h.ang);
        if (Math.abs(sn) <= 0.3 && Math.abs(cs) > 0.01 && h.t < h.tele + h.active && h.tele - h.t < 0.2) {
          const yAt = h.oy + (P.x - h.ox) / cs * sn;
          if ((P.x - h.ox) * cs > -20 && Math.abs(yAt - (FLOOR - 22)) < 70) jump = true;
        }
      } else if (h.kind === 'ring') {
        const d = Math.hypot(P.x - h.x, P.y - 22 - h.y) - h.r;
        if (d > 0 && d < 70) st.dashDir = G.sign(h.x - P.x) || 1;
      } else if (h.kind === 'blade') {
        if (h.state === 'wait') {
          // a shade about to cut through (the Champion's borrowed move)
          if (h.delay - h.t < 0.16 && (P.x - h.x) * h.dir > 0 && Math.abs(P.x - h.x) < 600) jump = true;
        } else if (h.state !== 'stuck') {
          const d = h.state === 'out' ? h.dir : -h.dir, dx = P.x - h.x;
          if (dx * d > 0 && Math.abs(dx) < 190) jump = true;
        } else {
          const ln = list.find((l) => l.kind === 'lane' && l.dur - l.t < 0.12);
          if (ln && Math.abs(P.x - h.x) < 300) jump = true;
        }
      } else if (h.kind === 'orb' && !h.grav) {
        const dx = P.x - h.x, big = Math.max(0, (h.r || 21) - 21);
        if (Math.abs(h.y - (P.y - 22)) < 44 + big * 2 && Math.abs(dx) < 170 + big * 4 && dx * h.vx > 0 && Math.abs(h.vx) > 300) { jump = true; if (big > 8) high = true; }
      }
    }
    const whirl = list.find((h) => h.kind === 'whirl');
    if (whirl) {
      const room = P.x < b.x ? P.x - lo : hi - P.x;
      if (!st.over && room < 150 && Math.abs(b.x - P.x) < 250) st.over = G.sign(b.x - P.x) || 1;
      if (st.over && (P.x - b.x) * st.over > 190) st.over = 0;
    } else st.over = 0;
    let charging = b.hurt && !b.hidden && Math.abs(b.x - P.x) < 330 && Math.abs(b.y - FLOOR) < 4;
    // the Champion's thrust and draw: the glint as he sets is the moment to jump (his body comes through)
    if (B.id === 'champion' && b.set && Math.abs(b.x - P.x) < (b.pose === 'thrustC' ? 470 : [0, 260, 380, 560][b.set] || 300) && (P.x - b.x) * b.face > -20) charging = true;
    // the Warden's hands, borrowed: over them as they close
    for (const h of list) if (h.kind === 'clap' && !h.dead) { const c = h.t - h.follow - h.hold; if (c > -0.2 && c < 0.1 && Math.abs(P.x - h.cx) < h.gap + 20) { jump = true; high = true; } }
    if (charging) { jump = true; if (B.h > 100) high = true; }
    for (const c of (B.clones || [])) if (c.hurt && !c.echo && Math.abs(c.x - P.x) < 330 && Math.abs(c.y - P.y) < 30) jump = true;
    // Kairo's spin throw: he leaps low with open hands; dashing does not save you, jumping over him does
    // (the crouch before it is the moment: a double jump started then clears him every time)
    if (B.id === 'kairo' && B.attackName === 'throw' && Math.abs(P.x - b.x) < 470) {
      if (!st.kThrow) { st.kThrow = true; jump = true; high = true; }
      else if (!P.onGround) high = true;
      st.noDash = true;
    } else { st.noDash = false; if (B.attackName !== 'throw') st.kThrow = false; }
    // the Warden's tide burns the whole floor: get up onto a platform
    const tide = list.find((h) => !h.dead && h.kind === 'zone' && h.style === 'tide' && h.t < h.tele + h.active);
    let perch = null;
    if (tide) {
      let bd = 1e9;
      for (const p of G.arena.platforms || []) {
        if (p.gone || p.rise < 0.95) continue;
        const d = Math.abs(p.x + p.w / 2 - P.x);
        if (d < bd) { bd = d; perch = p; }
      }
    }

    // ---- what to go for
    const tg = B.active && !B.invuln ? pickTarget(B) : (B.toppled ? pickTarget(B) : null);
    const bow = H.weapon === 'bow';
    const reach = bow ? 150 : H.heavy ? 92 : 74;
    let edge = 1e9, vgap = 1e9, half = 0;
    if (tg) {
      half = tg.hw != null ? tg.hw : (tg.r || 0);
      edge = Math.abs(tg.cx - P.x) - half;
      const tv = tg.hh != null ? tg.hh : (tg.r || 0);
      vgap = Math.max(0, Math.abs(tg.cy - (P.y - 30)) - tv);
    }
    const danger = unsafe(P.x, ds);
    const soonest = ds.reduce((m, d) => Math.min(m, Math.abs(P.x - d[0]) < d[1] + 120 ? d[2] : 9), 9);

    // ---- mend: low on health, Starlight to spare, nothing about to land, the boss not close
    const segs = Math.floor(P.ember / C.SEG);
    const low = P.hp <= Math.max(2, P.maxHp - 3) && P.hp < P.maxHp;
    const bossNear = tg ? edge < 170 && vgap < 120 : false;
    const healing = low && segs >= 1 && !danger && soonest > P.healTime + 0.25 && !bossNear && !charging && P.onGround && !G.bane('hollow');

    // ---- movement
    let goal = null;
    if (danger) goal = nearestSafe(ds, lo, hi);
    else if (healing) goal = null;
    else if (tg && !charging) {
      // stand at a little under reach from its edge, on the side we are on; switch sides if cornered
      let side = P.x >= tg.cx ? 1 : -1;
      const dist = half + reach * (bow ? 0.75 : 0.55);
      let want = tg.cx + side * dist;
      if (want < lo || want > hi) { side = -side; want = tg.cx + side * dist; }
      want = G.clamp(want, lo, hi);
      if (Math.abs(want - P.x) > 14 && !unsafe(want, ds) && pathClear(P.x, want, ds)) goal = want;
    } else if (charging) {
      // a body coming through: jumping it is handled above; drift away from it
      goal = null;
    }
    if (st.over) { goal = P.x + st.over * 200; jump = true; high = true; }
    if (perch) {
      const onIt = P.onGround && P.y < FLOOR - 10 && P.x > perch.x + 6 && P.x < perch.x + perch.w - 6;
      const mid = perch.x + perch.w / 2;
      if (onIt) { goal = Math.abs(P.x - mid) > perch.w / 4 ? mid : null; jump = false; high = false; }
      else {
        goal = mid;
        if (Math.abs(P.x - mid) < perch.w / 2 - 12 && P.y > perch.top) { jump = true; high = FLOOR - perch.top > 90; }
      }
    }
    if (goal != null && Math.abs(goal - P.x) > 5) hold(goal < P.x, goal > P.x); else hold(0, 0);


    if (goal != null && !st.over && danger) {
      const soon = ds.filter((d) => Math.abs(P.x - d[0]) < d[1]).reduce((m, d) => Math.min(m, d[2]), 9);
      const need = Math.abs(goal - P.x) / 300;
      if (soon < need + 0.06 && soon < 0.3) st.dashDir = G.sign(goal - P.x) || 1;
    }
    if (st.noDash) st.dashDir = 0;
    if (st.dashDir) { hold(st.dashDir < 0, st.dashDir > 0); press('dash'); st.dashDir = 0; } else lift('dash');

    // a target overhead and close: jump up to it
    if (tg && !danger && !healing && P.onGround && edge < reach && tg.cy < P.y - 120 && vgap > 30) jump = true;

    if (stayDown) jump = false;
    // (a fresh press every time: one held over from the last jump would not count)
    if (jump && P.onGround) { I.pressed.jump = true; I.down.jump = true; st.second = false; }
    else if (high && !P.onGround && P.vy > -260 && P.vy < 60 && P.airJumps > 0 && !st.second) { lift('jump'); st.second = true; }
    else if (st.second) { I.pressed.jump = true; I.down.jump = true; st.second = false; }
    else if (P.onGround) lift('jump');
    else I.down.jump = true;

    if (healing && !perch) { I.down.heal = true; lift('attack'); return; }
    I.down.heal = !!B.toppled && edge < 80; // E by a toppled boss: the finishing blow

    // ---- aim like a mouse click at whatever is being fought
    const aimAt = (x, y) => { I.mx = x - G.cam.x; I.my = y - G.cam.y; };

    // anything that can be cut down, is
    let cutting = null;
    for (const o of G.hazards.slashables()) if (Math.abs(o.x - P.x) < 74 + (bow ? 120 : 0) && Math.abs(o.y - (P.y - 24)) < 60 + (bow ? 80 : 0)) { cutting = o; break; }
    let inReach = tg && edge < reach && vgap < (bow ? 220 : 70);
    // the Champion's guard (all four dark, standing still): a blow on his front is turned, so wait it out
    if (B.guardOn && (P.x - b.x) * b.face > -6) inReach = false;
    if (H.draw && st.draws && !cutting && eosDraw(st, tg, edge, vgap, inReach, danger || charging, soonest, aimAt)) {
      // (Eos's string and draw: eosDraw below)
    } else if (cutting || inReach) {
      if (cutting) aimAt(cutting.x, cutting.y); else aimAt(tg.cx, G.clamp(P.y - 36, tg.cy - (tg.hh || tg.r || 0) * 0.7, tg.cy + (tg.hh || tg.r || 0) * 0.7));
      I.aim.attack = true;
      if (H.draw) { // Eos: a string of taps
        if (st.tap) lift('attack'); else press('attack');
        st.tap = !st.tap;
      } else press('attack');
    } else lift('attack');

    // ---- special, Dawnbreak, crown
    I.pressed.flare = false;
    if (tg && !danger && segs >= (P.hp < P.maxHp ? 2 : 1) && H.special !== 'guard') {
      const ok = H.special === 'lance' ? vgap < 200 : H.special === 'starfall' ? edge < 60 && vgap < 60 : edge < 140 && vgap < 120;
      if (ok && (st.flareCd || 0) <= 0) { aimAt(tg.cx, tg.cy); I.aim.flare = true; I.pressed.flare = true; st.flareCd = 0.8; }
    }
    st.flareCd = (st.flareCd || 0) - D;
    I.pressed.ult = !!(tg && P.ult >= 100 && !B.toppled);
    I.pressed.crown = !!(tg && edge < 300);
  }

  // Eos: a short string up close (each cut that lands banks a mark), then hold for the stance, aimed at
  // the boss, and let go at three marks once the boss is within the draw's carry. With something about to
  // land, any lit mark is let go at once: the draw passes through attacks. Returns false to leave the
  // attack button to the plain rules (out of reach, nothing to do).
  function eosDraw(st, tg, edge, vgap, inReach, threat, soonest, aimAt) {
    const C = G.PLAYER, mark = P.focusMark();
    if (!tg) { if (st.eosHold) { lift('attack'); st.eosHold = false; } return false; }
    aimAt(tg.cx, G.clamp(P.y - 36, tg.cy - (tg.hh || tg.r || 0) * 0.7, tg.cy + (tg.hh || tg.r || 0) * 0.7));
    I.aim.attack = true;
    const half = tg.hw != null ? tg.hw : (tg.r || 0);
    const dist = Math.abs(tg.cx - P.x), carry = (k) => C.DRAW_STEP[Math.max(0, k - 1)] * (P.onGround ? 1 : C.AIR_REACH) + half - 10;
    if (st.eosHold) {
      st.holdT += D;
      const ready = mark >= 3 && dist < carry(3) && vgap < 150;
      const escape = mark >= 1 && threat && soonest < 0.3;
      const late = st.holdT > 2.6 && mark >= 1;
      if (ready || escape || late || (!P.hold && st.holdT > 0.2)) {
        lift('attack'); st.eosHold = false; st.taps = 0;
        G.drawStats = G.drawStats || { n: 0, lv: [0, 0, 0, 0], escape: 0 };
        G.drawStats.n++; G.drawStats.lv[mark]++; if (escape && !ready) G.drawStats.escape++;
      } else I.down.attack = true;
      return true;
    }
    // the string: two cuts while in reach, then into the stance on the next press
    if (inReach && (st.taps || 0) < 2) {
      if (st.tap) lift('attack'); else { press('attack'); st.taps = (st.taps || 0) + 1; }
      st.tap = !st.tap;
      return true;
    }
    if (edge < 240 && !(threat && soonest < 0.35) && !P.atk && P.atkCd <= 0) {
      I.pressed.attack = true; I.down.attack = true; st.eosHold = true; st.holdT = 0;
      return true;
    }
    if (!inReach) st.taps = 0;
    return false;
  }

  // ---------------------------------------------------------------- one whole fight
  const tally = {};
  function fight(job) {
    const R = G.run;
    G.settings.hero = job.hero; G.settings.difficulty = job.diff;
    G.debug.boss = job.boss; G.debug.forceAttack = ''; G.debug.god = !!job.god;
    for (const k in I.down) I.down[k] = false;
    R.reset();
    if (job.boons) {
      const rel = R.rollRelics();
      R.relic = rel.length ? G.pick(rel).id : null;
      // the bosses met before this one, and a boon after each
      const others = G.shuffle(G.BOSS_IDS.filter((id) => id !== job.boss));
      // (the Champion is met on the road after a trial is won: one more boss beaten than his trial number's road)
      for (let t = 1; t < job.trial + (job.boss === 'champion' ? 1 : 0); t++) {
        R.beaten.push(others[(t - 1) % others.length]);
        const offer = R.rollOffer();
        if (offer && offer.length) R.take(Math.floor(Math.random() * offer.length));
        R.lastOmens = [];
      }
    }
    R.trial = job.trial; R.current = job.boss;
    G.startFight();
    const B = G.boss, st = { draws: job.draws };
    let t = 0, hits = 0, cause = {};
    P.tryHit = function (dmg, srcX, src) {
      const before = P.hp, r = realHit.call(P, dmg, srcX, src);
      if (P.hp < before) { hits++; const k = (B.attackName || '?') + ':' + ((src && (src.kind || src.pose)) || 'body'); cause[k] = (cause[k] || 0) + 1; }
      return r;
    };
    let won = false, lost = false, maxPhase = 1;
    try {
      while (t < job.maxT) {
        if (P.grabbed && P.grabbed.mash && B.bd) {
          // the Champion's Black Dawn: one press per flash, on the beat, as a person would (a little early or late)
          const fl = B.bd.flash;
          if (fl && !fl.done) {
            if (st.bdFl !== fl) { st.bdFl = fl; st.bdAt = fl.run + G.clamp((Math.random() + Math.random() + Math.random() - 1.5) * 0.17, -0.3, 0.3); }
            if (fl.t >= st.bdAt && !st.bdDone) { I.pressed.attack = true; st.bdDone = true; }
          } else st.bdDone = false;
        } else if (P.grabbed && P.grabbed.mash) {
          // a struggle (Kairo's Last Wave): mash the attack at a person's pace, about eight presses a second
          st.mashT = (st.mashT || 0) - D;
          if (st.mashT <= 0) { I.pressed.attack = true; I.down.attack = true; st.mashT = 0.125; } else I.down.attack = false;
          I.pressed.ult = P.ult >= 100;
        } else if (G.state === 'fight' && !P.dead) act(st, B);
        G.step(D); t += D;
        maxPhase = Math.max(maxPhase, B.phase || 1);
        if (G.state === 'won' || B.dead || B.dying) { won = true; break; }
        if (G.state === 'dead' || P.dead) { lost = true; break; }
      }
    } catch (e) { errors.push(job.boss + '/' + job.hero + '/T' + job.trial + ': ' + e.message); lost = true; }
    P.tryHit = realHit;
    const killer = lost ? Object.keys(cause).sort((a, b2) => cause[b2] - cause[a])[0] : '';
    return {
      boss: job.boss, hero: job.hero, trial: job.trial, won, timeout: !won && !lost,
      time: +G.time.toFixed(1), phase: maxPhase, bossLeft: B.maxHp ? +(B.hp / B.maxHp).toFixed(2) : 0,
      hpLeft: P.hp, maxHp: P.maxHp, hits, killer, cause, omens: (R.omens || []).slice(), boons: R.order.slice(), relic: R.relic,
    };
  }

  // ---------------------------------------------------------------- the queue, run in slices
  const realHit = P.tryHit;
  const errors = [];
  let saved = null, queue = [], results = [], running = false, started = 0;
  const ch = new MessageChannel();
  ch.port1.onmessage = slice;
  function slice() {
    if (!running) return;
    const until = performance.now() + 250;
    while (queue.length && performance.now() < until) results.push(fight(queue.shift()));
    if (queue.length) ch.port2.postMessage(0);
    else finish();
  }
  function finish() {
    running = false;
    CLEAR.restore();
    CLEAR.doneAt = performance.now();
  }

  const CLEAR = window.CLEAR = {
    results: () => results, errors, act, // (act: one step of the scripted player, for looking into one attack)
    start(o) {
      o = o || {};
      if (running) return 'already running';
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('solfall.'));
      saved = { ls: {}, freeze: G.debug.freeze, boss: G.debug.boss, hero: G.settings.hero, diff: G.settings.difficulty };
      for (const k of keys) saved.ls[k] = localStorage.getItem(k);
      G.debug.freeze = true;
      const bosses = o.bosses || G.BOSS_IDS.slice(), heroes = o.heroes || G.HEROES.map((h) => h.id);
      const trials = o.trials || Array.from({ length: G.RUN_FIGHTS }, (_, i) => i + 1);
      const runs = o.runs || 10;
      queue = []; results = []; errors.length = 0;
      // interleaved, so a partial run already covers every cell a little
      for (let r = 0; r < runs; r++) for (const boss of bosses) for (const hero of heroes) for (const trial of trials)
        queue.push({ boss, hero, trial, diff: o.difficulty == null ? 1 : o.difficulty, maxT: o.maxT || 420, boons: o.boons !== false, god: !!o.god, draws: o.draws !== false });
      CLEAR.total = queue.length;
      running = true; started = performance.now();
      ch.port2.postMessage(0);
      return 'queued ' + queue.length + ' fights';
    },
    stop() { queue = []; },
    status() {
      const el = ((CLEAR.doneAt || performance.now()) - started) / 1000;
      return (running ? 'running' : 'done') + ': ' + results.length + ' / ' + CLEAR.total + ' fights, ' + el.toFixed(0) + ' s' + (errors.length ? ', ' + errors.length + ' errors' : '');
    },
    restore() {
      if (!saved) return;
      for (const k of Object.keys(localStorage)) if (k.startsWith('solfall.') && !(k in saved.ls)) localStorage.removeItem(k);
      for (const k in saved.ls) localStorage.setItem(k, saved.ls[k]);
      G.debug.freeze = saved.freeze; G.debug.boss = saved.boss; G.debug.god = false; G.settings.hero = saved.hero; G.settings.difficulty = saved.diff;
      for (const k in I.down) I.down[k] = false;
      I.aim.attack = false; I.aim.flare = false;
      saved = null;
      G.toTitle();
    },
    // win rate per boss (rows) and trial (columns), for one hero or all
    table(hero) {
      const rs = results.filter((r) => !hero || r.hero === hero);
      const bosses = [...new Set(rs.map((r) => r.boss))], trials = [...new Set(rs.map((r) => r.trial))].sort((a, b) => a - b);
      const lines = ['boss'.padEnd(11) + trials.map((t) => ('T' + t).padStart(6)).join('') + '   all'];
      for (const bo of bosses) {
        const row = trials.map((t) => { const c = rs.filter((r) => r.boss === bo && r.trial === t); return c.length ? (Math.round(100 * c.filter((r) => r.won).length / c.length) + '%').padStart(6) : '     -'; });
        const all = rs.filter((r) => r.boss === bo);
        lines.push(bo.padEnd(11) + row.join('') + (Math.round(100 * all.filter((r) => r.won).length / all.length) + '%').padStart(6));
      }
      return lines.join('\n');
    },
  };
  return CLEAR;
})();
