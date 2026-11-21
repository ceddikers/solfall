// Solfall - everything the boss throws at you: telegraphs, beams, waves, orbs, zones.
// Every hazard draws its warning in the same red-orange so danger always reads the same way.
'use strict';
(function () {
  const H = G.hazards = { list: [] };
  const DANGER = G.COL.danger;
  // A hazard may carry its own colours (tint: { boss, hot }), e.g. the Magus's ice, fire and lightning.
  // Warnings stay in the one danger colour whatever the tint.
  const pal = (h) => h.tint || G.pal();

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
          G.fx.burst(h.x, h.y, { n: 6, color: pal(h).boss, speed: [40, 160], life: [0.2, 0.5] });
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
        const hurt = P.tryHit(h.dmg, h.srcX != null ? h.srcX : (h.x != null ? h.x : P.x), h);
        if (hurt && h.once && h.pop) h.pop();
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
  H.shockwave = function (x, dir, speed, hgt, tint) {
    return H.add({
      kind: 'wave', x, y: G.FLOOR, dir, speed, hgt: hgt || 46, srcX: x - dir * 30, tint,
      update(dt) {
        // waves start slow and build speed, so there is time to jump one that starts beside you
        this.x += this.dir * this.speed * G.lerp(0.35, 1, Math.min(1, this.t / 0.4)) * dt;
        this.srcX = this.x - this.dir * 30;
        if (Math.random() < 0.6) {
          G.fx.spawn({ x: this.x - this.dir * 10, y: G.FLOOR - G.rand(2, this.hgt * 0.7), vx: -this.dir * G.rand(20, 90), vy: G.rand(-60, -10), life: G.rand(0.15, 0.4), size: G.rand(2, 5), color: pal(this).boss });
        }
        if (Math.random() < dt * 20) G.fx.dust(this.x - this.dir * 16, G.FLOOR, 1, { dir: -this.dir, speed: [20, 90], size: [4, 8], up: 30, a: 0.3 });
        if (this.x < G.WALL_L + 8 || this.x > G.WALL_R - 8) {
          this.dead = true;
          G.fx.burst(this.x, G.FLOOR - 20, { n: 10, color: pal(this).boss, speed: [60, 260], angle: -Math.PI / 2, spread: 2.4, life: [0.2, 0.5] });
          G.fx.dust(this.x, G.FLOOR, 4, { dir: -this.dir, speed: [40, 200], size: [6, 11], up: 70 });
          G.fx.shards(this.x, G.FLOOR - this.hgt * 0.5, 4, pal(this).boss, { angle: this.dir > 0 ? Math.PI : 0, spread: 2, speed: [100, 360], size: [2, 4.5] });
        }
      },
      hits(P) {
        if (this.t < 0.05) return false;
        return G.rectsOverlap(P.box(), { cx: this.x, cy: G.FLOOR - this.hgt / 2, hw: 14, hh: this.hgt / 2 - 3 });
      },
      draw(ctx) {
        const P = pal(this);
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
      slashable: o.slashable !== false, dmg: o.dmg || 1, srcX: x, tint: o.tint, steer: o.steer, onPop: o.onPop, once: o.once,
      update(dt) {
        if (this.steer) this.steer(this, dt);
        this.vy += this.grav * dt;
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.srcX = this.x - this.vx * 0.05;
        this.life -= dt;
        if (Math.random() < 0.5) G.fx.spawn({ x: this.x, y: this.y, vx: G.rand(-20, 20), vy: G.rand(-20, 20), life: 0.3, size: this.r * 0.5, color: pal(this).boss });
        if (this.y + this.r > G.FLOOR && this.vy > 0) { this.pop(); return; }
        if (this.life <= 0 || this.x < -80 || this.x > G.W + 80 || this.y < -700 || this.y > G.H + 80) this.dead = true;
      },
      pop() {
        this.dead = true;
        if (this.onPop) this.onPop(this);
        G.fx.burst(this.x, this.y, { n: 8, color: pal(this).boss, speed: [60, 220], life: [0.2, 0.45], kind: 'spark', size: [2, 3] });
        G.fx.ring(this.x, this.y, { r0: 4, r1: this.r * 2.6, life: 0.2, color: pal(this).boss, width: 3 });
        G.fx.pop(this.x, this.y, pal(this).boss, this.r);
        if (this.y + this.r > G.FLOOR - 6) G.fx.dust(this.x, G.FLOOR, 2, { speed: [20, 80], size: [3, 6], a: 0.3 });
      },
      slash() { this.pop(); G.audio.play('orbPop'); },
      hits(P) { return G.circleRect(this.x, this.y, this.r * 0.75, P.box()); },
      draw(ctx) {
        const P = pal(this), r = this.r * (1 + 0.1 * Math.sin(this.t * 30));
        ctx.globalCompositeOperation = 'lighter';
        if (o.blade) {
          // a thrown knife: a sliver along its flight
          const a = Math.atan2(this.vy, this.vx), c = Math.cos(a), s = Math.sin(a), L = this.r * 2.6, w = this.r * 0.55;
          ctx.drawImage(G.fx.glow(P.boss), this.x - r * 2.4, this.y - r * 2.4, r * 4.8, r * 4.8);
          ctx.strokeStyle = G.rgba(P.boss, 0.5); ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(this.x - c * L * 2.2, this.y - s * L * 2.2); ctx.lineTo(this.x, this.y); ctx.stroke();
          ctx.fillStyle = G.rgba(DANGER, 0.95);
          ctx.beginPath(); ctx.moveTo(this.x + c * L, this.y + s * L); ctx.lineTo(this.x - s * w, this.y + c * w);
          ctx.lineTo(this.x - c * L, this.y - s * L); ctx.lineTo(this.x + s * w, this.y - c * w); ctx.closePath(); ctx.fill();
          ctx.fillStyle = G.rgba(P.hot, 1);
          ctx.beginPath(); ctx.moveTo(this.x + c * L, this.y + s * L); ctx.lineTo(this.x - s * w * 0.4, this.y + c * w * 0.4);
          ctx.lineTo(this.x - c * L * 0.4, this.y - s * L * 0.4); ctx.lineTo(this.x + s * w * 0.4, this.y - c * w * 0.4); ctx.closePath(); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          return;
        }
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
          if (this.width > 26) G.fx.kick(-Math.cos(this.ang) * 3, -Math.sin(this.ang) * 3);
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
          G.fx.burst(this.ex, this.ey, { n: 2, color: pal(this).hot, speed: [120, 420], angle: -Math.PI / 2, spread: 2.6, life: [0.15, 0.4], kind: 'spark', size: [2, 3.5], grav: 900 });
          if (this.sx == null || Math.abs(this.ex - this.sx) > 38) {
            this.sx = this.ex;
            G.fx.scorch(this.ex, 12 + this.width * 0.4, pal(this).boss);
            G.fx.dust(this.ex, G.FLOOR, 1, { speed: [10, 50], size: [6, 11], life: [0.5, 0.9], up: 90, a: 0.34, color: '84,78,100' });
          }
        }
        if (this.t >= this.tele + this.active + this.fade) this.dead = true;
      },
      hits(P) {
        if (!this.firing) return false;
        return G.distPointSeg(P.x, P.y - 22, this.ox, this.oy, this.ex, this.ey) < this.width / 2 + 9;
      },
      draw(ctx) {
        const P = pal(this);
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
    // popVy: how hard a hit from this zone throws the hero upward (the burning floor uses it to give a chance to reach a platform)
    return H.add(Object.assign({
      kind: 'zone', tele: 0.9, active: 0.5, fade: 0.2, style: 'column', layer: 'under', fired: false,
      get firing() { return this.t >= this.tele && this.t < this.tele + this.active; },
      update() {
        if (this.t >= this.tele && !this.fired) {
          this.fired = true;
          if (this.onFire) this.onFire(this);
          if (this.style === 'column' && this.y + this.h >= G.FLOOR - 4) {
            const cx = this.x + this.w / 2, P = pal(this);
            G.fx.light(cx, G.FLOOR - 50, this.w * 2.6, P.hot, 0.2, 0.55);
            G.fx.scorch(cx, this.w * 0.55, P.boss);
            for (const d of [-1, 1]) G.fx.dust(cx + d * this.w * 0.4, G.FLOOR, 2, { dir: d, speed: [40, 170], size: [5, 10], up: 40 });
            G.fx.burst(cx, G.FLOOR - 6, { n: 5, color: P.boss, speed: [10, 70], life: [0.7, 1.4], size: [1.4, 2.6], grav: -50, wob: 80, jitter: this.w * 0.4 });
            G.fx.kick(0, 2.2);
            if (G.arena.gust) G.arena.gust(cx, G.FLOOR - 40, 0.7);
          }
        }
        if (this.firing && this.style === 'tide' && Math.random() < 0.8) {
          G.fx.spawn({ x: this.x + G.rand(0, this.w), y: G.FLOOR - G.rand(0, 20), vx: G.rand(-20, 20), vy: G.rand(-220, -80), life: G.rand(0.3, 0.7), size: G.rand(3, 7), color: pal(this).boss });
        }
        if (this.firing && this.style === 'column' && Math.random() < 0.5) {
          G.fx.spawn({ x: this.x + G.rand(0, this.w), y: G.FLOOR - 4, vx: G.rand(-120, 120), vy: G.rand(-320, -80), life: G.rand(0.2, 0.5), size: G.rand(2, 3), color: pal(this).hot, kind: 'spark', grav: 800 });
        }
        if (this.t >= this.tele + this.active + this.fade) this.dead = true;
        this.srcX = this.x + this.w / 2;
      },
      hits(P) {
        if (!this.firing) return false;
        return G.rectsOverlap(P.box(), { cx: this.x + this.w / 2, cy: this.y + this.h / 2, hw: this.w / 2 - 5, hh: this.h / 2 - 2 });
      },
      draw(ctx) {
        const P = pal(this);
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
          const P = pal(this);
          G.fx.ring(this.x, this.y, { r0: this.r * 0.3, r1: this.r * 1.25, life: 0.4, color: P.hot, width: 10 });
          G.fx.burst(this.x, this.y, { n: Math.min(60, 14 + this.r * 0.2), color: P.boss, speed: [this.r * 0.6, this.r * 2.4], life: [0.3, 0.8], size: [4, 10], jitter: this.r * 0.3 });
          G.fx.shake(Math.min(22, 6 + this.r * 0.04));
          G.fx.boom(this.x, this.y, this.r, { col: P.boss, hot: P.hot });
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
          ctx.fillStyle = G.rgba(pal(this).hot, 0.75);
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
        const P = pal(this);
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
          G.fx.spawn({ x: this.x + G.rand(-5, 5), y: this.oy, vx: G.rand(-20, 20), vy: -80, life: 0.25, size: 7, color: pal(this).boss });
          if (this.oy >= G.FLOOR - 12) {
            this.oy = G.FLOOR - 12;
            this.boomT = 0.08;
            const P = pal(this);
            G.fx.ring(this.x, G.FLOOR - 6, { r0: 10, r1: this.blastR * 1.3, life: 0.3, color: P.hot, width: 6 });
            G.fx.burst(this.x, G.FLOOR - 8, { n: 14, color: P.boss, speed: [80, 380], angle: -Math.PI / 2, spread: 2.8, life: [0.25, 0.6], size: [3, 8] });
            G.fx.burst(this.x, G.FLOOR - 4, { n: 5, color: '20,16,30', speed: [100, 380], angle: -Math.PI / 2, spread: 2, life: [0.5, 1], size: [4, 8], kind: 'chunk', grav: 1500 });
            G.fx.shake(5);
            G.fx.boom(this.x, G.FLOOR - 8, this.blastR * 0.9, { col: P.boss, hot: P.hot });
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
        const P = pal(this);
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

  // ------------------------------------------------------------ melee swing (a slice of a circle)
  // o: x, y, r, r0 (inner radius), a0 -> a1 (the sweep, canvas angles), tele, active, follow(h, dt), onFire(h)
  H.arc = function (o) {
    return H.add(Object.assign({
      kind: 'arc', r: 150, r0: 0, a0: -1, a1: 1, tele: 0.5, active: 0.12, fade: 0.2, fired: false,
      get firing() { return this.t >= this.tele && this.t < this.tele + this.active; },
      update(dt) {
        if (this.follow) this.follow(this, dt);
        if (this.t >= this.tele && !this.fired) {
          this.fired = true;
          if (this.onFire) this.onFire(this);
          const P = pal(this), sg = this.a1 > this.a0 ? 1 : -1, big = this.r / 150;
          for (let i = 0; i < Math.round(6 + 6 * big); i++) {
            const a = G.lerp(this.a0, this.a1, Math.random()), r = this.r * G.rand(0.7, 1.02), v = G.rand(220, 640) * sg;
            G.fx.spawn({ kind: 'spark', x: this.x + Math.cos(a) * r, y: this.y + Math.sin(a) * r, vx: -Math.sin(a) * v, vy: Math.cos(a) * v, life: G.rand(0.14, 0.32), size: G.rand(1.6, 3), color: P.hot, drag: 2, grav: 400 });
          }
          const mid = (this.a0 + this.a1) / 2;
          G.fx.kick(-Math.sin(mid) * sg * 3.2 * big, Math.cos(mid) * sg * 3.2 * big);
          // where the end of the sweep meets the floor
          const tx = this.x + Math.cos(this.a1) * this.r, ty = this.y + Math.sin(this.a1) * this.r;
          if (ty >= G.FLOOR - 14 && this.r > 110) G.fx.thud(G.clamp(tx, G.WALL_L + 10, G.WALL_R - 10), G.FLOOR, 0.5 * big, { noCrack: true });
        }
        if (this.t >= this.tele + this.active + this.fade) this.dead = true;
        this.srcX = this.x;
      },
      hits(P) {
        if (!this.firing) return false;
        const lo = Math.min(this.a0, this.a1), span = Math.abs(this.a1 - this.a0);
        for (const py of [P.y - 21, P.y - 39, P.y - 3]) {
          const dx = P.x - this.x, dy = py - this.y, d = Math.hypot(dx, dy);
          if (d > this.r + 6 || d < this.r0 - 6) continue;
          const a = ((Math.atan2(dy, dx) - lo) % G.TAU + G.TAU) % G.TAU;
          if (a <= span) return true;
        }
        return false;
      },
      path(ctx, r) {
        const lo = Math.min(this.a0, this.a1), hi = Math.max(this.a0, this.a1);
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, lo, hi);
        if (this.r0 > 0) ctx.arc(this.x, this.y, Math.min(this.r0, r), hi, lo, true);
        else ctx.lineTo(this.x, this.y);
        ctx.closePath();
      },
      draw(ctx) {
        const P = pal(this);
        ctx.save();
        ctx.beginPath(); ctx.rect(-80, -400, G.W + 160, G.FLOOR + 400); ctx.clip();
        if (this.t < this.tele) {
          const k = this.t / this.tele;
          const late = k > 0.75 ? 0.5 + 0.5 * Math.sin(this.t * 55) : 0;
          ctx.fillStyle = G.rgba(DANGER, 0.07 + 0.07 * k + 0.1 * late);
          this.path(ctx, this.r); ctx.fill();
          ctx.fillStyle = G.rgba(DANGER, 0.2);
          this.path(ctx, Math.max(this.r0, this.r * k)); ctx.fill();
          ctx.strokeStyle = G.rgba(DANGER, 0.5 + 0.4 * k); ctx.lineWidth = 2;
          this.path(ctx, this.r); ctx.stroke();
        } else {
          // the cut itself: a bright crescent that sweeps from a0 to a1 and fades
          const e = this.t - this.tele;
          const k = Math.min(1, e / Math.max(0.01, this.active));
          const f = e < this.active ? 1 : Math.max(0, 1 - (e - this.active) / this.fade);
          const N = 18, a0 = this.a0, a1 = G.lerp(this.a0, this.a1, G.ease.outCubic(k));
          const rm = (this.r + Math.max(this.r0, this.r * 0.45)) / 2, w = this.r - Math.max(this.r0, this.r * 0.45);
          ctx.globalCompositeOperation = 'lighter';
          for (const [col, ws, al] of [[P.boss, 1, 0.55], [P.hot, 0.5, 0.95]]) {
            ctx.fillStyle = G.rgba(col, al * f);
            ctx.beginPath();
            for (let i = 0; i <= N; i++) {
              const q = i / N, a = G.lerp(a0, a1, q), hw = w * ws * 0.5 * Math.pow(Math.sin(Math.PI * q), 0.6) * (0.3 + 0.7 * q);
              const x = this.x + Math.cos(a) * (rm + w * 0.25 + hw), y = this.y + Math.sin(a) * (rm + w * 0.25 + hw);
              if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
            for (let i = N; i >= 0; i--) {
              const q = i / N, a = G.lerp(a0, a1, q), hw = w * ws * 0.5 * Math.pow(Math.sin(Math.PI * q), 0.6) * (0.3 + 0.7 * q);
              ctx.lineTo(this.x + Math.cos(a) * (rm + w * 0.25 - hw), this.y + Math.sin(a) * (rm + w * 0.25 - hw));
            }
            ctx.closePath(); ctx.fill();
          }
        }
        ctx.restore();
      },
    }, o));
  };

  // ------------------------------------------------------------ lingering pool on the floor
  // o: x (centre), w, tele (it forms), active (it lasts). Hurts anyone standing in it; jump over or stay off.
  H.pool = function (o) {
    return H.add(Object.assign({
      kind: 'pool', w: 150, hgt: 26, tele: 0.8, active: 5, fade: 0.4, layer: 'under',
      get firing() { return this.t >= this.tele && this.t < this.tele + this.active; },
      update() {
        this.srcX = this.x;
        if (this.firing && Math.random() < 0.35) {
          G.fx.spawn({ x: this.x + G.rand(-this.w / 2, this.w / 2), y: G.FLOOR - 2, vx: G.rand(-10, 10), vy: G.rand(-90, -30), life: G.rand(0.3, 0.8), size: G.rand(2, 5), color: pal(this).boss });
        }
        if (this.firing && Math.random() < 0.02) {
          G.fx.dust(this.x + G.rand(-this.w / 2, this.w / 2), G.FLOOR - 4, 1, { speed: [4, 20], size: [6, 10], life: [0.7, 1.2], up: 80, a: 0.24, color: '84,78,100' });
        }
        if (this.t >= this.tele + this.active + this.fade) this.dead = true;
      },
      hits(P) {
        if (!this.firing) return false;
        return P.y > G.FLOOR - this.hgt && Math.abs(P.x - this.x) < this.w / 2 - 6;
      },
      draw(ctx) {
        const P = pal(this), x = this.x, w = this.w, F = G.FLOOR;
        if (this.t < this.tele) {
          const k = this.t / this.tele;
          ctx.fillStyle = G.rgba(DANGER, 0.12 + 0.12 * k);
          ctx.beginPath(); ctx.ellipse(x, F - 1, w / 2, 9, 0, 0, G.TAU); ctx.fill();
          ctx.fillStyle = G.rgba(DANGER, 0.3);
          ctx.beginPath(); ctx.ellipse(x, F - 1, w / 2 * k, 9 * k, 0, 0, G.TAU); ctx.fill();
          ctx.strokeStyle = G.rgba(DANGER, 0.55 + 0.4 * k); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x, F - 1, w / 2, 9, 0, 0, G.TAU); ctx.stroke();
          return;
        }
        const left = this.tele + this.active - this.t;
        const f = left > 0 ? Math.min(1, (this.t - this.tele) / 0.15) : Math.max(0, 1 + left / this.fade);
        const warn = left > 0 && left < 0.8 ? 0.6 + 0.4 * Math.sin(this.t * 30) : 1; // flickers before it goes out
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = G.rgba(DANGER, 0.5 * f * warn);
        ctx.beginPath(); ctx.moveTo(x - w / 2, F);
        for (let px = -w / 2; px <= w / 2; px += 10) {
          const edge = Math.sin(Math.PI * (px + w / 2) / w);
          const n = 0.6 + 0.4 * Math.sin(px * 0.21 + this.t * 8) * Math.sin(px * 0.07 - this.t * 5);
          ctx.lineTo(x + px, F - this.hgt * f * edge * n);
        }
        ctx.lineTo(x + w / 2, F); ctx.closePath(); ctx.fill();
        ctx.fillStyle = G.rgba(P.boss, 0.55 * f * warn);
        ctx.beginPath(); ctx.ellipse(x, F - 1, w / 2, 7, 0, 0, G.TAU); ctx.fill();
        ctx.fillStyle = G.rgba(P.hot, 0.5 * f * warn);
        ctx.beginPath(); ctx.ellipse(x, F - 1, w / 2 * 0.7, 3.5, 0, 0, G.TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      },
    }, o));
  };
})();
