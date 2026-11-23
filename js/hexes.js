// Solfall - the banes of the corrupted boons (run.js, G.CURSED), the parts that live in a fight:
// Void Step's scars, Whispering Dark's marks, Starving Star's drain, Borrowed Time's clock and
// Ravenous Light's hunger (its boon and its bane). The plain number changes are in player.js.
// Both kinds of hazard here are the void's, not the boss's: a crimson tear in the floor that opens
// and then bursts upward in black thorns. A dash passes through, like anything else.
'use strict';
(function () {
  const F = G.fx, rnd = G.rand, FLOOR = G.FLOOR, SEG = G.PLAYER.SEG;
  const BLOOD = '235,30,80', HOT = '255,206,220';
  const X = G.hexes = {};
  let lastHp = 0, since = 0, whisperT = 0, borrowT = 0, landed = 0, boss = null;

  X.reset = function () {
    lastHp = 0; since = 0; landed = 0; boss = null;
    whisperT = rnd(9, 14); // the first mark comes sooner than the rest, so the bane is learned early
    borrowT = 8;
  };

  // A tear in the floor: a hairline at first, opening over `tele` seconds, then a burst of thorns.
  function tear(x, w, tele) {
    G.audio.play('charge', { dur: tele * 0.9, k: 0.35 });
    return G.hazards.add({
      kind: 'hextear', layer: 'under', x, y: FLOOR, w, tele, active: 0.2, dmg: 1, srcX: x,
      update() {
        if (this.t >= this.tele && !this.burst) {
          this.burst = true;
          G.audio.play('whoosh', { k: 0.6 });
          F.shake(4);
          F.burst(this.x, FLOOR - 4, { n: 14, color: BLOOD, speed: [140, 460], angle: -Math.PI / 2, spread: 0.7, life: [0.18, 0.4], kind: 'spark', size: [1.6, 3] });
          F.burst(this.x, FLOOR - 6, { n: 10, color: '16,3,10', speed: [40, 200], angle: -Math.PI / 2, spread: 1.1, life: [0.5, 1], size: [4, 8], grav: -60, wob: 30 });
        }
        if (this.t > this.tele + this.active + 0.5) this.dead = true;
      },
      hits(P) { return this.t >= this.tele && this.t < this.tele + this.active && Math.abs(P.x - this.x) < this.w / 2 + 11 && P.y > FLOOR - 70; },
      danger() { return this.t < this.tele + this.active ? [this.x, this.w / 2 + 14, this.tele - this.t] : null; },
      draw(ctx) {
        const k = Math.min(1, this.t / this.tele), x = this.x, hw = this.w / 2;
        ctx.save();
        if (this.t < this.tele) {
          // the tear opening: a dark slit with a crimson lip that widens and flickers as it nears
          const open = 2 + 7 * k * k, flick = 0.7 + 0.3 * Math.sin(this.t * 40);
          ctx.fillStyle = 'rgba(5,0,3,' + (0.5 + 0.4 * k) + ')';
          ctx.beginPath(); ctx.ellipse(x, FLOOR + 1, hw * (0.4 + 0.6 * k), open, 0, 0, G.TAU); ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = G.rgba(BLOOD, (0.35 + 0.5 * k) * flick); ctx.lineWidth = 1.5 + k;
          ctx.beginPath(); ctx.ellipse(x, FLOOR + 1, hw * (0.4 + 0.6 * k), open, 0, 0, G.TAU); ctx.stroke();
          // hairline cracks running out from it
          ctx.strokeStyle = G.rgba(BLOOD, 0.4 * k); ctx.lineWidth = 1;
          ctx.beginPath();
          for (const d of [-1, 1]) { ctx.moveTo(x + d * hw * 0.5, FLOOR + 1); ctx.lineTo(x + d * hw * (0.75 + 0.3 * k), FLOOR - 3); ctx.lineTo(x + d * hw * (0.95 + 0.4 * k), FLOOR + 2); }
          ctx.stroke();
        } else {
          // the burst: black thorns up out of it, edged in crimson, sinking back as it fades
          const a = this.t - this.tele, up = a < 0.08 ? a / 0.08 : Math.max(0, 1 - (a - 0.08) / 0.55);
          const thorns = [[-0.7, 0.55], [-0.35, 0.85], [0, 1], [0.35, 0.8], [0.68, 0.5]];
          for (const [ox, h] of thorns) {
            const tx = x + ox * hw, th = 70 * h * up;
            ctx.fillStyle = '#050003';
            ctx.beginPath(); ctx.moveTo(tx - 7, FLOOR); ctx.lineTo(tx + ox * 6, FLOOR - th); ctx.lineTo(tx + 7, FLOOR); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = G.rgba(BLOOD, 0.8 * up); ctx.lineWidth = 1.5; ctx.stroke();
          }
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = G.rgba(HOT, 0.5 * up);
          ctx.beginPath(); ctx.ellipse(x, FLOOR, hw, 3, 0, 0, G.TAU); ctx.fill();
        }
        ctx.restore();
      },
    });
  }

  // Void Step: where a dash began, the floor scars and bursts a moment later.
  X.scar = (x) => tear(x, 58, 0.85);

  // Ravenous Light's bane: a blow taken feeds the boss 4% of its health (no more than the top of the
  // phase it is in, so a phase once broken stays broken).
  X.feed = function () {
    const B = G.boss;
    if (!B || !B.maxHp || B.dead || B.dying) return;
    const top = B.maxHp * (1 - (B.phase - 1) / 3);
    B.hp = Math.min(top, B.hp + B.maxHp * 0.04);
    lastHp = B.hp;
    const c = B.core || { x: B.body.x, y: B.body.y - 60 };
    F.burst(c.x, c.y, { n: 14, color: BLOOD, speed: [20, 120], life: [0.4, 0.9], size: [2, 4], grav: -120, jitter: 30 });
  };

  X.update = function (dt) {
    const P = G.player, B = G.boss;
    if (G.state !== 'fight' || G.practice || !B || P.dead || !B.active || B.dead || B.dying) { if (B) lastHp = B.hp; return; }
    if (B !== boss) { boss = B; lastHp = B.hp; }
    // a blow landed: the boss has less health than a frame ago
    if (B.hp < lastHp - 0.01) {
      since = 0;
      if (G.boon('ravenous') && ++landed >= 12) {
        landed = 0;
        if (P.hp < P.maxHp) {
          P.hp++;
          G.audio.play('heal');
          F.ring(P.x, P.y - 24, { r0: 10, r1: 70, life: 0.4, color: BLOOD, width: 4 });
          F.burst(P.x, P.y - 24, { n: 10, color: HOT, speed: [40, 160], life: [0.3, 0.6], size: [2, 4] });
        }
      }
    } else since += dt;
    lastHp = B.hp;

    // Starving Star: three seconds without landing a blow, and the Starlight bleeds away
    if (G.bane('starving') && since > 3 && P.ember > 0) {
      P.ember = Math.max(0, P.ember - SEG * 0.25 * dt);
      if (Math.random() < dt * 8) F.spawn({ x: P.x + rnd(-14, 14), y: P.y - rnd(10, 40), vx: rnd(-20, 20), vy: -rnd(20, 60), life: 0.6, size: rnd(2, 3.5), color: '16,3,10', wob: 30 });
    }
    // Whispering Dark: now and then, a mark where the hero stands
    if (G.bane('whisper')) {
      whisperT -= dt;
      if (whisperT <= 0) { whisperT = rnd(16, 26); tear(P.x, 76, 1.1 * Math.max(0.8, G.diff().tele)); }
    }
    // Borrowed Time: after two minutes, the void takes a health every eight seconds, never the last
    if (G.bane('borrowed') && G.time > 120) {
      borrowT -= dt;
      if (borrowT <= 0) {
        borrowT = 8;
        if (P.hp > 1) {
          P.hp--; P.hurtFlash = 1;
          G.audio.play('hurt', { k: 0.5 });
          F.ring(P.x, P.y - 24, { r0: 60, r1: 8, life: 0.5, color: BLOOD, width: 3 });
          F.burst(P.x, P.y - 24, { n: 12, color: '16,3,10', speed: [20, 90], life: [0.6, 1.1], size: [3, 6], grav: -80, wob: 40 });
        }
      }
    }
  };
})();
