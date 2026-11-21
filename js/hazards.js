// Solfall - everything the boss throws at you: telegraphs, beams, waves, orbs, zones.
// Every hazard draws its warning in the same red-orange so danger always reads the same way.
'use strict';
(function () {
  const H = G.hazards = { list: [] };
  const DANGER = G.COL.danger;

  H.add = function (h) {
    h.t = 0; h.dead = false;
    if (!h.layer) h.layer = 'over';
    if (h.dmg == null) h.dmg = 1;
    H.list.push(h);
    return h;
  };

  H.clear = function (pop) {
    if (pop) {
      for (const h of H.list) {
        if (h.x != null && h.y != null && h.kind === 'orb') {
          G.fx.burst(h.x, h.y, { n: 6, color: G.pal().boss, speed: [40, 160], life: [0.2, 0.5] });
        }
      }
    }
    H.list.length = 0;
  };

  H.update = function (dt) {
    const P = G.player;
    const list = H.list;
    const canHurt = G.canHurt();
    for (let i = 0; i < list.length; i++) {
      const h = list[i];
      h.t += dt;
      h.update(dt);
      if (!h.dead && canHurt && h.hits && h.hits(P)) {
        P.tryHit(h.dmg, h.srcX != null ? h.srcX : (h.x != null ? h.x : P.x), h);
      }
    }
    let w = 0;
    for (let i = 0; i < list.length; i++) if (!list[i].dead) list[w++] = list[i];
    list.length = w;
  };

  H.draw = function (ctx, layer) {
    for (let i = 0; i < H.list.length; i++) {
      const h = H.list[i];
      if (h.layer === layer && h.draw) h.draw(ctx);
    }
  };

  // ------------------------------------------------------------ ground shockwave
  H.shockwave = function (x, dir, speed, hgt) {
    return H.add({
      kind: 'wave', x, y: G.FLOOR, dir, speed, hgt: hgt || 46, srcX: x - dir * 30,
      update(dt) {
        // waves start slow and build speed, so there is time to jump one that starts beside you
        this.x += this.dir * this.speed * G.lerp(0.35, 1, Math.min(1, this.t / 0.4)) * dt;
        this.srcX = this.x - this.dir * 30;
        if (Math.random() < 0.6) {
          G.fx.spawn({ x: this.x - this.dir * 10, y: G.FLOOR - G.rand(2, this.hgt * 0.7), vx: -this.dir * G.rand(20, 90), vy: G.rand(-60, -10), life: G.rand(0.15, 0.4), size: G.rand(2, 5), color: G.pal().boss });
        }
        if (this.x < G.WALL_L + 8 || this.x > G.WALL_R - 8) {
          this.dead = true;
          G.fx.burst(this.x, G.FLOOR - 20, { n: 10, color: G.pal().boss, speed: [60, 260], angle: -Math.PI / 2, spread: 2.4, life: [0.2, 0.5] });
        }
      },
      hits(P) {
        if (this.t < 0.05) return false;
        return G.rectsOverlap(P.box(), { cx: this.x, cy: G.FLOOR - this.hgt / 2, hw: 14, hh: this.hgt / 2 - 3 });
      },
      draw(ctx) {
        const P = G.pal();
        const s = Math.min(1, this.t / 0.1), h = this.hgt * s * (1 + 0.08 * Math.sin(this.t * 40)), d = this.dir, x = this.x, F = G.FLOOR;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = G.rgba(P.boss, 0.3);
        ctx.beginPath(); ctx.moveTo(x - d * 78, F); ctx.quadraticCurveTo(x - d * 10, F - h * 0.5, x + d * 8, F - h * 1.15); ctx.quadraticCurveTo(x + d * 20, F - h * 0.4, x + d * 22, F); ctx.closePath(); ctx.fill();
        ctx.fillStyle = G.rgba(P.boss, 0.85);
        ctx.beginPath(); ctx.moveTo(x - d * 52, F); ctx.quadraticCurveTo(x - d * 6, F - h * 0.45, x + d * 6, F - h); ctx.quadraticCurveTo(x + d * 15, F - h * 0.4, x + d * 16, F); ctx.closePath(); ctx.fill();
        ctx.fillStyle = G.rgba(P.hot, 0.95);
        ctx.beginPath(); ctx.moveTo(x - d * 22, F); ctx.quadraticCurveTo(x, F - h * 0.4, x + d * 5, F - h * 0.8); ctx.quadraticCurveTo(x + d * 10, F - h * 0.3, x + d * 10, F); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  };

  // ------------------------------------------------------------ orb projectile
  H.orb = function (x, y, vx, vy, o) {
    o = o || {};
    return H.add({
      kind: 'orb', x, y, vx, vy, r: o.r || 13, grav: o.grav || 0, life: o.life || 7,
      slashable: o.slashable !== false, dmg: o.dmg || 1, srcX: x,
      update(dt) {
        this.vy += this.grav * dt;
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.srcX = this.x - this.vx * 0.05;
        this.life -= dt;
        if (Math.random() < 0.5) G.fx.spawn({ x: this.x, y: this.y, vx: G.rand(-20, 20), vy: G.rand(-20, 20), life: 0.3, size: this.r * 0.5, color: G.pal().boss });
        if (this.y + this.r > G.FLOOR && this.vy > 0) { this.pop(); return; }
        if (this.life <= 0 || this.x < -80 || this.x > G.W + 80 || this.y < -700 || this.y > G.H + 80) this.dead = true;
      },
      pop() {
        this.dead = true;
        G.fx.burst(this.x, this.y, { n: 8, color: G.pal().boss, speed: [60, 220], life: [0.2, 0.45], kind: 'spark', size: [2, 3] });
        G.fx.ring(this.x, this.y, { r0: 4, r1: this.r * 2.6, life: 0.2, color: G.pal().boss, width: 3 });
      },
      slash() { this.pop(); G.audio.play('orbPop'); },
      hits(P) { return G.circleRect(this.x, this.y, this.r * 0.75, P.box()); },
      draw(ctx) {
        const P = G.pal(), r = this.r * (1 + 0.1 * Math.sin(this.t * 30));
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(G.fx.glow(P.boss), this.x - r * 2.6, this.y - r * 2.6, r * 5.2, r * 5.2);
        ctx.fillStyle = G.rgba(DANGER, 0.9);
        ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, G.TAU); ctx.fill();
        ctx.fillStyle = G.rgba(P.hot, 1);
        ctx.beginPath(); ctx.arc(this.x, this.y, r * 0.55, 0, G.TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      },
    });
  };
  H.slashables = () => H.list.filter((h) => h.slashable && !h.dead);

  // ------------------------------------------------------------ beam
  // o: ox, oy, ang, width, tele, lock, active, fade, spin, clip, follow(b, dt), sfx
  H.beam = function (o) {
    return H.add(Object.assign({
      kind: 'beam', width: 44, tele: 0.8, lock: 0.25, active: 0.35, fade: 0.16, spin: 0, clip: true,
      maxLen: 2400, fired: false, ex: 0, ey: 0,
      get firing() { return this.t >= this.tele && this.t < this.tele + this.active; },
      get locked() { return this.t >= this.tele - this.lock; },
      update(dt) {
        if (this.follow) this.follow(this, dt);
        if (this.t >= this.tele && !this.fired) {
          this.fired = true;
          if (this.sfx !== false) G.audio.play(this.sfx || 'beam');
          G.fx.shake(this.shake == null ? 7 : this.shake);
        }
        if (this.firing) this.ang += this.spin * dt;
        const c = Math.cos(this.ang), s = Math.sin(this.ang);
        let len = this.maxLen;
        this.grounded = false;
        if (this.clip && s > 0.02) {
          const L = (G.FLOOR - this.oy) / s;
          if (L < len) { len = L; this.grounded = true; }
        }
        this.ex = this.ox + c * len; this.ey = this.oy + s * len;
        this.srcX = this.ox;
        if (this.firing && this.grounded && this.ex > 0 && this.ex < G.W) {
          G.fx.burst(this.ex, this.ey, { n: 2, color: G.pal().hot, speed: [120, 420], angle: -Math.PI / 2, spread: 2.6, life: [0.15, 0.4], kind: 'spark', size: [2, 3.5], grav: 900 });
        }
        if (this.t >= this.tele + this.active + this.fade) this.dead = true;
      },
      hits(P) {
        if (!this.firing) return false;
        return G.distPointSeg(P.x, P.y - 22, this.ox, this.oy, this.ex, this.ey) < this.width / 2 + 9;
      },
      draw(ctx) {
        const P = G.pal();
        ctx.lineCap = 'butt';
        ctx.globalCompositeOperation = 'lighter';
        if (this.t < this.tele) {
          const k = this.t / this.tele;
          const pulse = this.locked ? 0.75 + 0.25 * Math.sin(this.t * 50) : 0.35 + 0.3 * k;
          ctx.strokeStyle = G.rgba(DANGER, 0.07 + 0.1 * k);
          ctx.lineWidth = this.width * (0.3 + 0.7 * k);
          ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ex, this.ey); ctx.stroke();
          ctx.strokeStyle = G.rgba(DANGER, pulse);
          ctx.lineWidth = this.locked ? 3.5 : 2;
          ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ex, this.ey); ctx.stroke();
        } else {
          const f = this.firing ? 1 : Math.max(0, 1 - (this.t - this.tele - this.active) / this.fade);
          const w = this.width * f * (1 + 0.1 * Math.sin(this.t * 90));
          ctx.strokeStyle = G.rgba(P.boss, 0.2 * f);
          ctx.lineWidth = w * 2.4;
          ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ex, this.ey); ctx.stroke();
          ctx.strokeStyle = G.rgba(DANGER, 0.75 * f);
          ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ex, this.ey); ctx.stroke();
          ctx.strokeStyle = G.rgba(P.hot, 0.95 * f);
          ctx.lineWidth = w * 0.45;
          ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ex, this.ey); ctx.stroke();
          if (this.grounded) {
            const gs = w * 2.2;
            ctx.drawImage(G.fx.glow(P.hot), this.ex - gs, this.ey - gs, gs * 2, gs * 2);
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    }, o));
  };

  // ------------------------------------------------------------ rectangular zone
  // o: x, y, w, h (top-left), tele, active, style 'column' | 'tide' | 'crush', pop
  H.zone = function (o) {
    return H.add(Object.assign({
      kind: 'zone', tele: 0.9, active: 0.5, fade: 0.2, style: 'column', layer: 'under', fired: false,
      get firing() { return this.t >= this.tele && this.t < this.tele + this.active; },
      update() {
        if (this.t >= this.tele && !this.fired) {
          this.fired = true;
          if (this.onFire) this.onFire(this);
        }
        if (this.firing && this.style === 'tide' && Math.random() < 0.8) {
          G.fx.spawn({ x: this.x + G.rand(0, this.w), y: G.FLOOR - G.rand(0, 20), vx: G.rand(-20, 20), vy: G.rand(-220, -80), life: G.rand(0.3, 0.7), size: G.rand(3, 7), color: G.pal().boss });
        }
        if (this.firing && this.style === 'column' && Math.random() < 0.5) {
          G.fx.spawn({ x: this.x + G.rand(0, this.w), y: G.FLOOR - 4, vx: G.rand(-120, 120), vy: G.rand(-320, -80), life: G.rand(0.2, 0.5), size: G.rand(2, 3), color: G.pal().hot, kind: 'spark', grav: 800 });
        }
        if (this.t >= this.tele + this.active + this.fade) this.dead = true;
        this.srcX = this.x + this.w / 2;
      },
      hits(P) {
        if (!this.firing) return false;
        return G.rectsOverlap(P.box(), { cx: this.x + this.w / 2, cy: this.y + this.h / 2, hw: this.w / 2 - 5, hh: this.h / 2 - 2 });
      },
      draw(ctx) {
        const P = G.pal();
        const x = this.x, y = this.y, w = this.w, h = this.h;
        if (this.t < this.tele) {
          const k = this.t / this.tele;
          const late = k > 0.8 ? 0.5 + 0.5 * Math.sin(this.t * 55) : 0;
          ctx.fillStyle = G.rgba(DANGER, 0.07 + 0.08 * k + 0.1 * late);
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = G.rgba(DANGER, 0.2);
          if (this.style === 'tide') ctx.fillRect(x, y + h * (1 - k), w, h * k);
          else ctx.fillRect(x + w / 2 * (1 - k), y, w * k, h);
          ctx.strokeStyle = G.rgba(DANGER, 0.45 + 0.4 * k);
          ctx.lineWidth = 2;
          if (this.style === 'tide') { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
          else { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.stroke(); }
          return;
        }
        const f = this.firing ? Math.min(1, (this.t - this.tele) / 0.05) : Math.max(0, 1 - (this.t - this.tele - this.active) / this.fade);
        ctx.globalCompositeOperation = 'lighter';
        if (this.style === 'tide') {
          for (let layer = 0; layer < 2; layer++) {
            ctx.fillStyle = layer === 0 ? G.rgba(DANGER, 0.6 * f) : G.rgba(P.hot, 0.75 * f);
            const amp = layer === 0 ? 1 : 0.5;
            ctx.beginPath(); ctx.moveTo(x, G.FLOOR);
            for (let px = x; px <= x + w; px += 14) {
              const n = Math.sin(px * 0.05 + this.t * 9) * 0.5 + Math.sin(px * 0.13 - this.t * 13) * 0.5;
              ctx.lineTo(px, G.FLOOR - h * amp * f * (0.8 + 0.45 * n));
            }
            ctx.lineTo(x + w, G.FLOOR); ctx.closePath(); ctx.fill();
          }
        } else {
          const j = 1 + 0.06 * Math.sin(this.t * 80);
          ctx.fillStyle = G.rgba(P.boss, 0.22 * f); ctx.fillRect(x - w * 0.06, y, w * 1.12, h);
          ctx.fillStyle = G.rgba(DANGER, 0.7 * f); ctx.fillRect(x + w / 2 - w / 2 * f * j, y, w * f * j, h);
          ctx.fillStyle = G.rgba(P.hot, 0.9 * f); ctx.fillRect(x + w / 2 - w * 0.24 * f, y, w * 0.48 * f, h);
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    }, o));
  };

  // ------------------------------------------------------------ circular blast (telegraph, then one burst)
  H.blast = function (o) {
    return H.add(Object.assign({
      kind: 'blast', r: 120, tele: 1, boom: 0.1, layer: 'under', fired: false,
      update() {
        if (this.follow) this.follow(this);
        if (this.t >= this.tele && !this.fired) {
          this.fired = true;
          const P = G.pal();
          G.fx.ring(this.x, this.y, { r0: this.r * 0.3, r1: this.r * 1.25, life: 0.4, color: P.hot, width: 10 });
          G.fx.burst(this.x, this.y, { n: Math.min(60, 14 + this.r * 0.2), color: P.boss, speed: [this.r * 0.6, this.r * 2.4], life: [0.3, 0.8], size: [4, 10], jitter: this.r * 0.3 });
          G.fx.shake(Math.min(22, 6 + this.r * 0.04));
          G.audio.play(this.sfx || 'boom');
          if (this.onBoom) this.onBoom(this);
        }
        if (this.t >= this.tele + this.boom) this.dead = true;
      },
      hits(P) {
        return this.fired && G.circleRect(this.x, this.y, this.r - 6, P.box());
      },
      draw(ctx) {
        if (this.fired) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = G.rgba(G.pal().hot, 0.75);
          ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, G.TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          return;
        }
        const k = this.t / this.tele;
        const late = k > 0.8 ? 0.5 + 0.5 * Math.sin(this.t * 55) : 0;
        ctx.save();
        ctx.beginPath(); ctx.rect(-80, -400, G.W + 160, G.FLOOR + 400); ctx.clip();
        ctx.fillStyle = G.rgba(DANGER, 0.06 + 0.06 * k + 0.08 * late);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, G.TAU); ctx.fill();
        ctx.fillStyle = G.rgba(DANGER, 0.2);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * k, 0, G.TAU); ctx.fill();
        ctx.strokeStyle = G.rgba(DANGER, 0.5 + 0.4 * k);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([14, 9]); ctx.lineDashOffset = -this.t * 60;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, G.TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      },
    }, o));
  };

  // ------------------------------------------------------------ expanding ring (dash through it)
  H.ring = function (o) {
    return H.add(Object.assign({
      kind: 'ring', r: 30, speed: 540, thick: 26, maxR: 1000,
      update(dt) {
        this.r += this.speed * dt;
        this.srcX = this.x;
        if (this.r > this.maxR) this.dead = true;
      },
      hits(P) {
        const d = G.dist(P.x, P.y - 22, this.x, this.y);
        return Math.abs(d - this.r) < this.thick / 2 + 8;
      },
      draw(ctx) {
        const P = G.pal();
        const a = Math.min(1, (this.maxR - this.r) / 200);
        ctx.save();
        ctx.beginPath(); ctx.rect(-80, -400, G.W + 160, G.FLOOR + 400); ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = G.rgba(P.boss, 0.22 * a); ctx.lineWidth = this.thick * 2.4;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, G.TAU); ctx.stroke();
        ctx.strokeStyle = G.rgba(DANGER, 0.8 * a); ctx.lineWidth = this.thick;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, G.TAU); ctx.stroke();
        ctx.strokeStyle = G.rgba(P.hot, 0.95 * a); ctx.lineWidth = this.thick * 0.35;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, G.TAU); ctx.stroke();
        ctx.restore();
      },
    }, o));
  };

  // ------------------------------------------------------------ meteor (floor marker, then a falling orb)
  H.meteor = function (o) {
    return H.add(Object.assign({
      kind: 'meteor', tele: 0.9, fallSpeed: 1500, oy: -40, blastR: 60, boomT: 0, layer: 'over',
      update(dt) {
        if (this.boomT > 0) {
          this.boomT -= dt;
          if (this.boomT <= 0) this.dead = true;
          return;
        }
        if (this.t >= this.tele) {
          this.oy += this.fallSpeed * dt;
          G.fx.spawn({ x: this.x + G.rand(-5, 5), y: this.oy, vx: G.rand(-20, 20), vy: -80, life: 0.25, size: 7, color: G.pal().boss });
          if (this.oy >= G.FLOOR - 12) {
            this.oy = G.FLOOR - 12;
            this.boomT = 0.08;
            const P = G.pal();
            G.fx.ring(this.x, G.FLOOR - 6, { r0: 10, r1: this.blastR * 1.3, life: 0.3, color: P.hot, width: 6 });
            G.fx.burst(this.x, G.FLOOR - 8, { n: 14, color: P.boss, speed: [80, 380], angle: -Math.PI / 2, spread: 2.8, life: [0.25, 0.6], size: [3, 8] });
            G.fx.burst(this.x, G.FLOOR - 4, { n: 5, color: '20,16,30', speed: [100, 380], angle: -Math.PI / 2, spread: 2, life: [0.5, 1], size: [4, 8], kind: 'chunk', grav: 1500 });
            G.fx.shake(5);
            G.audio.play('boom');
          }
        }
        this.srcX = this.x;
      },
      hits(P) {
        if (this.boomT > 0) return G.circleRect(this.x, G.FLOOR - 8, this.blastR - 8, P.box());
        if (this.t >= this.tele) return G.circleRect(this.x, this.oy, 16, P.box());
        return false;
      },
      draw(ctx) {
        const P = G.pal();
        const total = this.tele + (G.FLOOR + 28) / this.fallSpeed;
        const k = Math.min(1, this.t / total);
        if (this.boomT <= 0) {
          ctx.fillStyle = G.rgba(DANGER, 0.1 + 0.12 * k);
          ctx.beginPath(); ctx.ellipse(this.x, G.FLOOR - 1, this.blastR, 9, 0, 0, G.TAU); ctx.fill();
          ctx.fillStyle = G.rgba(DANGER, 0.34);
          ctx.beginPath(); ctx.ellipse(this.x, G.FLOOR - 1, this.blastR * k, 9 * k, 0, 0, G.TAU); ctx.fill();
          ctx.strokeStyle = G.rgba(DANGER, 0.55 + 0.4 * k); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(this.x, G.FLOOR - 1, this.blastR, 9, 0, 0, G.TAU); ctx.stroke();
          ctx.strokeStyle = G.rgba(DANGER, 0.12 + 0.1 * k); ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 10]);
          ctx.beginPath(); ctx.moveTo(this.x, -20); ctx.lineTo(this.x, G.FLOOR - 4); ctx.stroke();
          ctx.setLineDash([]);
        }
        if (this.t >= this.tele && this.boomT <= 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(G.fx.glow(P.boss), this.x - 44, this.oy - 44, 88, 88);
          ctx.fillStyle = G.rgba(DANGER, 0.9);
          ctx.beginPath(); ctx.ellipse(this.x, this.oy - 10, 11, 26, 0, 0, G.TAU); ctx.fill();
          ctx.fillStyle = G.rgba(P.hot, 1);
          ctx.beginPath(); ctx.arc(this.x, this.oy, 10, 0, G.TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
      },
    }, o));
  };

  // ------------------------------------------------------------ lane warning with moving chevrons
  // o: x, y, w, h (top-left), dir (-1 | 1), dur
  H.lane = function (o) {
    return H.add(Object.assign({
      kind: 'lane', dur: 0.8, layer: 'under',
      update() { if (this.t >= this.dur) this.dead = true; },
      draw(ctx) {
        const k = Math.min(1, this.t / this.dur);
        const late = k > 0.8 ? 0.5 + 0.5 * Math.sin(this.t * 55) : 0;
        ctx.fillStyle = G.rgba(DANGER, 0.06 + 0.07 * k + 0.08 * late);
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = G.rgba(DANGER, 0.4 + 0.4 * k); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + this.w, this.y);
        ctx.moveTo(this.x, this.y + this.h); ctx.lineTo(this.x + this.w, this.y + this.h); ctx.stroke();
        ctx.save();
        ctx.beginPath(); ctx.rect(this.x, this.y, this.w, this.h); ctx.clip();
        ctx.strokeStyle = G.rgba(DANGER, 0.3 + 0.35 * k); ctx.lineWidth = 5; ctx.lineJoin = 'miter';
        const gap = 110, off = (this.t * 520) % gap, cy = this.y + this.h / 2, s = Math.min(26, this.h * 0.3);
        for (let px = -gap; px < this.w + gap; px += gap) {
          const cx = this.dir > 0 ? this.x + px + off : this.x + this.w - px - off;
          ctx.beginPath();
          ctx.moveTo(cx - this.dir * s * 0.6, cy - s); ctx.lineTo(cx + this.dir * s * 0.4, cy); ctx.lineTo(cx - this.dir * s * 0.6, cy + s);
          ctx.stroke();
        }
        ctx.restore();
      },
    }, o));
  };
})();
