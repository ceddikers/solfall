// Solfall - all sound is synthesised with WebAudio: effects and a layered music loop.
'use strict';
(function () {
  const A = G.audio = { ctx: null, ready: false };
  let noiseBuf = null;
  let duck = 1;
  const last = {};
  // Sounds that repeat a lot are played a little sharp or flat each time (the range, in semitones),
  // so a string of hits or footsteps does not sound like one sample on a loop.
  let vary = 1;
  const VARY = {
    hit: 1.3, hitHeavy: 1, slash: 1.6, slash3: 1.2, arrow: 1.2, arrowHeavy: 0.8, tink: 1.5, orbPop: 2,
    step: 3, stepHeavy: 2.5, stomp: 2, land: 2, landHard: 1.5, jump: 0.7, dash: 1, boom: 1.2, slam: 0.8, blade: 1.2, zap: 1.2,
  };

  // Browsers only allow audio after a user gesture, so this is called from the first key or click.
  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = A.ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 6;
    comp.attack.value = 0.003; comp.release.value = 0.22;
    A.master = ctx.createGain();
    A.master.gain.value = 0.85;
    A.master.connect(comp); comp.connect(ctx.destination);
    A.sfxGain = ctx.createGain(); A.sfxGain.connect(A.master);
    A.musGain = ctx.createGain(); A.musGain.connect(A.master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    A.ready = true;
    A.applyVolume();
  };

  A.applyVolume = function () {
    if (!A.ready) return;
    const t = A.ctx.currentTime;
    A.sfxGain.gain.setTargetAtTime(G.settings.sfx, t, 0.03);
    A.musGain.gain.setTargetAtTime(G.settings.music * 0.6 * duck, t, 0.15);
  };
  A.duck = function (v) { duck = v; A.applyVolume(); };

  function tone(o) {
    const ctx = A.ctx;
    const t = o.at != null ? o.at : ctx.currentTime + (o.delay || 0);
    const dur = o.dur;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0 * vary, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1 * vary), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    const a = Math.min(o.attack || 0.004, dur * 0.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.dest || A.sfxGain);
    osc.start(t); osc.stop(t + dur + 0.03);
  }

  function noise(o) {
    const ctx = A.ctx;
    const t = o.at != null ? o.at : ctx.currentTime + (o.delay || 0);
    const dur = o.dur;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f0 * vary, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1 * vary), t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    const a = Math.min(o.attack || 0.003, dur * 0.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || A.sfxGain);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.03);
  }

  const S = {
    // ---- hero
    slash() { noise({ dur: 0.11, vol: 0.26, f0: 900, f1: 4200, q: 0.9 }); },
    slash3() {
      noise({ dur: 0.17, vol: 0.34, f0: 600, f1: 5200, q: 0.8 });
      tone({ type: 'triangle', f0: 520, f1: 250, dur: 0.12, vol: 0.08 });
    },
    arrow() {
      tone({ type: 'triangle', f0: 980, f1: 520, dur: 0.07, vol: 0.12 });
      noise({ dur: 0.06, vol: 0.12, type: 'highpass', f0: 3200 });
    },
    arrowHeavy() {
      tone({ type: 'triangle', f0: 760, f1: 300, dur: 0.14, vol: 0.18 });
      noise({ dur: 0.14, vol: 0.24, f0: 1400, f1: 5200, q: 0.8 });
    },
    hit() {
      noise({ dur: 0.07, vol: 0.38, type: 'highpass', f0: 1800, q: 0.5 });
      tone({ type: 'triangle', f0: 210, f1: 90, dur: 0.1, vol: 0.34 });
      tone({ type: 'square', f0: 1400, f1: 700, dur: 0.04, vol: 0.06 });
      tone({ type: 'sine', f0: 125, f1: 52, dur: 0.1, vol: 0.24 });
    },
    hitHeavy() {
      noise({ dur: 0.15, vol: 0.5, type: 'lowpass', f0: 3200, f1: 400, q: 0.7 });
      tone({ type: 'sine', f0: 160, f1: 48, dur: 0.24, vol: 0.55 });
      tone({ type: 'square', f0: 900, f1: 300, dur: 0.08, vol: 0.09 });
      tone({ type: 'sine', f0: 84, f1: 32, dur: 0.36, vol: 0.42 });
      noise({ dur: 0.05, vol: 0.24, type: 'highpass', f0: 2600 });
    },
    tink() { tone({ type: 'triangle', f0: 1900, f1: 1500, dur: 0.07, vol: 0.12 }); },
    // the ring of a blade catching the light, just before it swings
    glint() { tone({ type: 'sine', f0: 2600, f1: 3400, dur: 0.11, vol: 0.07 }); tone({ type: 'triangle', f0: 5200, f1: 4800, dur: 0.06, vol: 0.03 }); },
    // two blades meeting
    clash() {
      tone({ type: 'square', f0: 1500, f1: 700, dur: 0.09, vol: 0.14 });
      tone({ type: 'triangle', f0: 2900, f1: 2100, dur: 0.3, vol: 0.12 });
      noise({ dur: 0.16, vol: 0.4, f0: 5000, f1: 1800, q: 0.9 });
    },
    // Eos: steel leaving the sheath, the click of it going home, and the three marks of her Focus
    draw() {
      noise({ dur: 0.15, vol: 0.3, f0: 2600, f1: 8000, q: 1.3 });
      tone({ type: 'triangle', f0: 2300, f1: 3500, dur: 0.24, vol: 0.06 });
    },
    sheath(o) {
      const v = o && o.soft ? 0.45 : 1;
      noise({ dur: 0.035, vol: 0.3 * v, type: 'highpass', f0: 3000 });
      tone({ type: 'square', f0: 1700, f1: 900, dur: 0.035, vol: 0.07 * v });
      tone({ type: 'triangle', f0: 640, f1: 610, dur: 0.14, vol: 0.07 * v });
    },
    focus(o) {
      const n = (o && o.n) || 1, f = 880 * Math.pow(2, (n - 1) * 4 / 12);
      tone({ f0: f, f1: f * 1.01, dur: 0.16, vol: 0.085 });
      if (n >= 3) { tone({ f0: f * 1.5, dur: 0.5, vol: 0.06, delay: 0.05 }); tone({ type: 'triangle', f0: f * 2, dur: 0.6, vol: 0.035, delay: 0.1 }); }
    },
    jump() { tone({ type: 'sine', f0: 320, f1: 560, dur: 0.09, vol: 0.12 }); },
    jump2() {
      tone({ type: 'sine', f0: 480, f1: 880, dur: 0.1, vol: 0.12 });
      noise({ dur: 0.08, vol: 0.07, f0: 2500, f1: 5000 });
    },
    land() { noise({ dur: 0.08, vol: 0.13, type: 'lowpass', f0: 500, f1: 120 }); },
    landHard() {
      noise({ dur: 0.14, vol: 0.26, type: 'lowpass', f0: 700, f1: 100 });
      tone({ type: 'sine', f0: 96, f1: 40, dur: 0.17, vol: 0.32 });
    },
    step() { noise({ dur: 0.05, vol: 0.05, type: 'lowpass', f0: 420, f1: 140 }); },
    stepHeavy() {
      noise({ dur: 0.07, vol: 0.09, type: 'lowpass', f0: 300, f1: 90 });
      tone({ type: 'sine', f0: 70, f1: 38, dur: 0.1, vol: 0.12 });
    },
    // a heavy boss's footfall
    stomp() {
      tone({ type: 'sine', f0: 72, f1: 30, dur: 0.22, vol: 0.34 });
      noise({ dur: 0.14, vol: 0.2, type: 'lowpass', f0: 380, f1: 90 });
    },
    dash() {
      noise({ dur: 0.18, vol: 0.3, f0: 500, f1: 3400, q: 1.4 });
      tone({ type: 'sine', f0: 700, f1: 240, dur: 0.14, vol: 0.06 });
    },
    hurt() {
      tone({ type: 'sawtooth', f0: 420, f1: 90, dur: 0.3, vol: 0.28 });
      noise({ dur: 0.22, vol: 0.4, type: 'lowpass', f0: 2400, f1: 300 });
    },
    perfect() {
      tone({ f0: 1320, dur: 0.5, vol: 0.14 });
      tone({ f0: 1980, dur: 0.45, vol: 0.1, delay: 0.05 });
      tone({ f0: 2640, dur: 0.4, vol: 0.07, delay: 0.1 });
    },
    flare() {
      tone({ type: 'sawtooth', f0: 220, f1: 1500, dur: 0.22, vol: 0.2 });
      noise({ dur: 0.3, vol: 0.34, f0: 1200, f1: 6000, q: 0.7 });
      tone({ type: 'sine', f0: 110, f1: 55, dur: 0.25, vol: 0.4 });
    },
    flareHit() {
      tone({ type: 'sine', f0: 200, f1: 40, dur: 0.35, vol: 0.6 });
      noise({ dur: 0.3, vol: 0.5, type: 'lowpass', f0: 5000, f1: 300 });
      tone({ type: 'triangle', f0: 1760, f1: 880, dur: 0.2, vol: 0.1 });
    },
    healStart() { tone({ type: 'sine', f0: 300, f1: 720, dur: 0.8, vol: 0.07, attack: 0.5 }); },
    heal() {
      [660, 880, 1100, 1320].forEach((f, i) => tone({ f0: f, dur: 0.3, vol: 0.13, delay: i * 0.06 }));
    },
    empty() { tone({ type: 'square', f0: 170, f1: 140, dur: 0.09, vol: 0.07 }); },
    segment() { tone({ f0: 990, f1: 1480, dur: 0.14, vol: 0.09 }); },
    orbPop() { tone({ type: 'triangle', f0: 900, f1: 300, dur: 0.08, vol: 0.14 }); },
    die() {
      tone({ type: 'sawtooth', f0: 300, f1: 38, dur: 1.2, vol: 0.32 });
      noise({ dur: 1.0, vol: 0.4, type: 'lowpass', f0: 2000, f1: 100 });
    },
    // ---- boss
    charge(o) {
      const dur = o.dur || 0.8;
      tone({ type: 'sine', f0: 140, f1: 520, dur, vol: 0.11, attack: dur * 0.6 });
      tone({ type: 'sawtooth', f0: 70, f1: 260, dur, vol: 0.04, attack: dur * 0.6 });
    },
    slam() {
      tone({ type: 'sine', f0: 110, f1: 28, dur: 0.6, vol: 0.9 });
      noise({ dur: 0.5, vol: 0.6, type: 'lowpass', f0: 1200, f1: 80 });
      noise({ dur: 0.12, vol: 0.28, type: 'highpass', f0: 3000 });
    },
    sweep() { noise({ dur: 0.7, vol: 0.4, f0: 200, f1: 1800, q: 0.8, attack: 0.2 }); },
    clap() {
      tone({ type: 'sine', f0: 180, f1: 40, dur: 0.4, vol: 0.8 });
      noise({ dur: 0.3, vol: 0.7, f0: 2200, f1: 300, q: 0.5 });
    },
    beam() {
      tone({ type: 'sawtooth', f0: 180, f1: 150, dur: 0.5, vol: 0.14, detune: -8 });
      tone({ type: 'sawtooth', f0: 181, f1: 151, dur: 0.5, vol: 0.14, detune: 9 });
      tone({ type: 'square', f0: 90, f1: 75, dur: 0.5, vol: 0.1 });
      noise({ dur: 0.5, vol: 0.28, f0: 3200, f1: 1500, q: 2 });
    },
    streak() {
      noise({ dur: 0.2, vol: 0.34, f0: 5000, f1: 900, q: 1.2 });
      tone({ type: 'sawtooth', f0: 900, f1: 200, dur: 0.16, vol: 0.1 });
    },
    orb() { tone({ type: 'sine', f0: 700, f1: 380, dur: 0.12, vol: 0.1 }); },
    // ---- the Magus, the Veil and the Knight
    zap() {
      noise({ dur: 0.16, vol: 0.5, type: 'highpass', f0: 2600 });
      tone({ type: 'square', f0: 1500, f1: 120, dur: 0.14, vol: 0.16 });
      tone({ type: 'sine', f0: 100, f1: 36, dur: 0.3, vol: 0.5 });
    },
    shard() {
      tone({ type: 'triangle', f0: 2400, f1: 900, dur: 0.12, vol: 0.14 });
      noise({ dur: 0.1, vol: 0.2, type: 'highpass', f0: 5200 });
    },
    frost() {
      for (let i = 0; i < 4; i++) tone({ type: 'triangle', f0: 1700 + i * 320, f1: 1200 + i * 200, dur: 0.16, vol: 0.07, delay: i * 0.05 });
      noise({ dur: 0.5, vol: 0.16, type: 'highpass', f0: 4200, attack: 0.1 });
    },
    whoosh() {
      noise({ dur: 0.5, vol: 0.4, type: 'lowpass', f0: 300, f1: 2200, attack: 0.12 });
      tone({ type: 'sawtooth', f0: 120, f1: 60, dur: 0.4, vol: 0.12 });
    },
    blink() {
      tone({ type: 'sine', f0: 1300, f1: 300, dur: 0.16, vol: 0.12 });
      noise({ dur: 0.18, vol: 0.14, f0: 3000, f1: 600, q: 1.5 });
    },
    blade() {
      noise({ dur: 0.14, vol: 0.4, f0: 1500, f1: 6500, q: 0.8 });
      tone({ type: 'triangle', f0: 1900, f1: 2600, dur: 0.1, vol: 0.06 });
    },
    cleave() {
      noise({ dur: 0.3, vol: 0.5, f0: 300, f1: 2600, q: 0.7, attack: 0.04 });
      tone({ type: 'sawtooth', f0: 160, f1: 60, dur: 0.3, vol: 0.2 });
    },
    bell() {
      tone({ type: 'sine', f0: 196, f1: 194, dur: 1.6, vol: 0.3 });
      tone({ type: 'sine', f0: 392.5, f1: 390, dur: 1.2, vol: 0.14 });
      tone({ type: 'sine', f0: 587, f1: 585, dur: 0.8, vol: 0.07 });
    },
    boom() {
      tone({ type: 'sine', f0: 90, f1: 30, dur: 0.35, vol: 0.55 });
      noise({ dur: 0.35, vol: 0.42, type: 'lowpass', f0: 1800, f1: 150 });
    },
    ring() {
      tone({ type: 'sine', f0: 60, f1: 240, dur: 0.5, vol: 0.5 });
      noise({ dur: 0.6, vol: 0.3, f0: 300, f1: 2400, q: 1.5, attack: 0.05 });
    },
    roar() {
      tone({ type: 'sawtooth', f0: 72, f1: 44, dur: 1.9, vol: 0.34, attack: 0.2 });
      tone({ type: 'sawtooth', f0: 108, f1: 64, dur: 1.9, vol: 0.22, attack: 0.25, detune: 14 });
      noise({ dur: 1.9, vol: 0.5, type: 'lowpass', f0: 500, f1: 1400, attack: 0.35 });
    },
    stagger() {
      noise({ dur: 0.25, vol: 0.5, type: 'highpass', f0: 4000 });
      tone({ type: 'triangle', f0: 1200, f1: 300, dur: 0.4, vol: 0.24 });
      tone({ type: 'triangle', f0: 800, f1: 200, dur: 0.4, vol: 0.2, delay: 0.08 });
      tone({ type: 'sine', f0: 120, f1: 40, dur: 0.5, vol: 0.5 });
    },
    shatter() {
      for (let i = 0; i < 6; i++) noise({ dur: 0.18, vol: 0.34, type: 'highpass', f0: 2500 + i * 500, delay: i * 0.05 });
      tone({ type: 'sine', f0: 140, f1: 30, dur: 0.8, vol: 0.7 });
    },
    tide() { noise({ dur: 2.6, vol: 0.3, type: 'lowpass', f0: 300, f1: 1000, attack: 0.5 }); },
    pull() {
      noise({ dur: 1.6, vol: 0.3, f0: 2400, f1: 200, q: 1.2, attack: 0.3 });
      tone({ type: 'sine', f0: 320, f1: 50, dur: 1.6, vol: 0.2, attack: 0.3 });
    },
    bossDie() {
      for (let i = 0; i < 5; i++) {
        tone({ type: 'sine', f0: 120 - i * 10, f1: 30, dur: 0.5, vol: 0.5, delay: i * 0.32 });
        noise({ dur: 0.4, vol: 0.4, type: 'lowpass', f0: 2600, f1: 200, delay: i * 0.32 });
      }
      tone({ type: 'sine', f0: 220, f1: 30, dur: 2.6, vol: 0.5, delay: 1.6 });
      noise({ dur: 2.4, vol: 0.5, type: 'lowpass', f0: 6000, f1: 200, delay: 1.6, attack: 0.05 });
    },
    victory() {
      [62, 66, 69, 74, 78, 81].forEach((m, i) =>
        tone({ type: 'triangle', f0: mtof(m), dur: 1.6, vol: 0.14, delay: 0.1 + i * 0.13 }));
      tone({ type: 'sine', f0: mtof(38), dur: 2.6, vol: 0.3, delay: 0.1 });
    },
    // ---- Flow, Dawnbreak and the finishing blow
    rank(o) {
      const f = 660 * Math.pow(2, ((o.n || 1) - 1) * 2 / 12);
      tone({ type: 'triangle', f0: f, dur: 0.12, vol: 0.1 });
      tone({ type: 'triangle', f0: f * 1.5, dur: 0.18, vol: 0.09, delay: 0.07 });
    },
    // the flourish: a bright rising figure; brazen adds a fifth on top
    flourish(o) {
      [784, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.16, vol: 0.09, delay: i * 0.05 }));
      if (o && o.brazen) tone({ type: 'triangle', f0: 2349, dur: 0.4, vol: 0.1, delay: 0.16 });
    },
    // the camp's bell: n semitones up from its ground note, louder for a harder blow
    chime(o) {
      const f = 330 * Math.pow(2, ((o && o.n) || 0) / 12), v = (o && o.vol) || 1;
      tone({ type: 'sine', f0: f, f1: f * 0.995, dur: 1.5, vol: 0.2 * v });
      tone({ type: 'sine', f0: f * 2.01, f1: f * 2, dur: 1.0, vol: 0.09 * v });
      tone({ type: 'sine', f0: f * 2.76, dur: 0.5, vol: 0.05 * v });
      noise({ dur: 0.04, vol: 0.1 * v, f0: 3000, f1: 1500, q: 1 });
    },
    // the lantern: a soft paper thump with a little ring in it
    paper(o) {
      const f = 520 * Math.pow(2, Math.min(12, (o && o.n) || 0) / 12);
      noise({ dur: 0.07, vol: 0.14, type: 'lowpass', f0: 900, f1: 300 });
      tone({ type: 'sine', f0: f, f1: f * 1.02, dur: 0.22, vol: 0.08 });
    },
    ultReady() { [880, 1320, 1760].forEach((f, i) => tone({ f0: f, dur: 0.4, vol: 0.11, delay: i * 0.07 })); },
    ult() {
      tone({ type: 'sawtooth', f0: 110, f1: 880, dur: 0.35, vol: 0.2 });
      noise({ dur: 0.5, vol: 0.4, f0: 600, f1: 7000, q: 0.7 });
      tone({ type: 'sine', f0: 80, f1: 40, dur: 0.6, vol: 0.5 });
      [523, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.7, vol: 0.1, delay: 0.05 + i * 0.04 }));
    },
    finish() {
      noise({ dur: 0.35, vol: 0.5, f0: 900, f1: 8000, q: 0.6 });
      tone({ type: 'triangle', f0: 1760, f1: 440, dur: 0.5, vol: 0.14 });
      tone({ type: 'sine', f0: 70, f1: 30, dur: 0.7, vol: 0.6 });
    },
    // ---- moments
    pulse(o) {
      const k = o.k || 0;
      tone({ type: 'sine', f0: 62 + 30 * k, f1: 34, dur: 0.22, vol: 0.34 + 0.2 * k });
      tone({ type: 'sine', f0: 62 + 30 * k, f1: 34, dur: 0.18, vol: 0.22 + 0.16 * k, delay: 0.16 });
    },
    riposte() {
      noise({ dur: 0.16, vol: 0.4, f0: 1800, f1: 7000, q: 0.8 });
      tone({ type: 'triangle', f0: 1320, f1: 1980, dur: 0.22, vol: 0.14 });
      tone({ type: 'sine', f0: 130, f1: 46, dur: 0.26, vol: 0.5 });
    },
    clash() {
      noise({ dur: 0.1, vol: 0.55, type: 'highpass', f0: 3200 });
      tone({ type: 'triangle', f0: 2300, f1: 2180, dur: 0.6, vol: 0.14 });
      tone({ type: 'triangle', f0: 3120, f1: 2990, dur: 0.45, vol: 0.09 });
      tone({ type: 'sine', f0: 150, f1: 40, dur: 0.3, vol: 0.5 });
    },
    lastLight() {
      tone({ type: 'sine', f0: 55, dur: 1.2, vol: 0.5, attack: 0.03 });
      [440, 660, 880].forEach((f, i) => tone({ f0: f, dur: 0.9, vol: 0.1, delay: 0.1 + i * 0.12 }));
    },
    // ---- interface
    uiMove() { tone({ f0: 520, dur: 0.05, vol: 0.07 }); },
    uiSelect() { tone({ f0: 660, f1: 990, dur: 0.1, vol: 0.11 }); },
    uiBack() { tone({ f0: 520, f1: 330, dur: 0.1, vol: 0.09 }); },
    card() {
      tone({ type: 'sine', f0: 55, dur: 1.5, vol: 0.6, attack: 0.04 });
      tone({ type: 'triangle', f0: 440, f1: 220, dur: 0.9, vol: 0.08 });
    },
  };

  A.play = function (name, opts) {
    if (!A.ready || A.ctx.state !== 'running') return;
    const now = A.ctx.currentTime;
    if (last[name] != null && now - last[name] < 0.035) return;
    last[name] = now;
    const f = S[name];
    if (!f) return;
    vary = VARY[name] ? Math.pow(2, (Math.random() * 2 - 1) * VARY[name] / 12) : 1;
    f(opts || {});
    vary = 1;
  };

  // ------------------------------------------------------------------ music
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Four bars in D minor: Dm, Bb, F, C.
  const BARS = [
    { root: 38, pad: [50, 53, 57] },
    { root: 34, pad: [46, 50, 53] },
    { root: 41, pad: [48, 53, 57] },
    { root: 36, pad: [48, 52, 55] },
  ];
  const ARP = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0, 2];
  const BASS1 = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];
  const BPM = [84, 120, 132, 146];

  const M = A.music = { on: false, intensity: 0, step: 0, next: 0, timer: null };

  function pad(bar, t, dur, I) {
    const ctx = A.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 520 + I * 260; f.Q.value = 0.6;
    const g = ctx.createGain();
    const vol = I === 0 ? 0.075 : 0.05;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.setValueAtTime(vol, t + dur * 0.75);
    g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.08);
    f.connect(g); g.connect(A.musGain);
    for (const m of bar.pad) {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + dur * 1.1);
      }
    }
  }
  function kick(t) { tone({ at: t, f0: 150, f1: 40, dur: 0.17, vol: 0.62, dest: A.musGain }); }
  function snare(t, v) {
    noise({ at: t, dur: 0.14, vol: 0.26 * v, type: 'bandpass', f0: 1900, q: 0.6, dest: A.musGain });
    tone({ at: t, type: 'triangle', f0: 220, f1: 140, dur: 0.08, vol: 0.14 * v, dest: A.musGain });
  }
  function hat(t, v) { noise({ at: t, dur: 0.035, vol: v, type: 'highpass', f0: 7000, dest: A.musGain }); }
  function bass(m, t, dur) {
    const ctx = A.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = mtof(m);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(220, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(A.musGain);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function playStep(step, t, sd) {
    const I = M.intensity;
    const bar = BARS[(step >> 4) & 3];
    const s = step & 15;
    if (s === 0) pad(bar, t, sd * 16, I);
    if (I === 0) {
      if (s === 6 || s === 14) {
        tone({ at: t, f0: mtof(bar.pad[(step >> 3) % 3] + 24), dur: 1.4, vol: 0.035, dest: A.musGain });
      }
      return;
    }
    // drums
    if (s % 4 === 0) kick(t);
    if (I >= 2 && (s === 4 || s === 12)) snare(t, 1);
    if (I >= 3 && (s === 7 || s === 15)) snare(t, 0.45);
    if (I === 1 && s % 4 === 2) hat(t, 0.05);
    if (I === 2 && s % 2 === 1) hat(t, 0.055);
    if (I >= 3) hat(t, s % 4 === 2 ? 0.09 : 0.045);
    // bass
    if (I === 1) { if (BASS1[s]) bass(bar.root, t, sd * 1.6); }
    else if (I === 2) { if (s % 2 === 0) bass(bar.root + (s === 14 ? 12 : 0), t, sd * 1.5); }
    else bass(bar.root + (s % 4 === 3 ? 12 : 0), t, sd * 0.9);
    // arpeggio
    if (I >= 2 && (I >= 3 || s % 2 === 0)) {
      const m = bar.pad[ARP[s]] + 12 + (I >= 3 && s % 8 >= 4 ? 12 : 0);
      tone({ at: t, type: 'triangle', f0: mtof(m), dur: sd * 1.7, vol: 0.06, dest: A.musGain });
    }
  }

  function schedule() {
    if (!M.on || !A.ready || A.ctx.state !== 'running') return;
    const now = A.ctx.currentTime;
    if (M.next < now - 0.05) M.next = now + 0.06; // tab was asleep: skip ahead rather than burst
    while (M.next < now + 0.14) {
      const sd = 60 / BPM[M.intensity] / 4;
      playStep(M.step, M.next, sd);
      M.next += sd;
      M.step = (M.step + 1) % 64;
    }
  }

  A.startMusic = function () {
    if (!A.ready) return;
    if (!M.on) {
      M.on = true;
      M.next = A.ctx.currentTime + 0.08;
      if (!M.timer) M.timer = setInterval(schedule, 35);
    }
  };
  // 0 menu, 1-3 fight phases. The change lands on the next bar line so it stays musical.
  A.setIntensity = function (n, restart) {
    M.intensity = G.clamp(n, 0, 3);
    if (restart) M.step = 0;
    else M.step = (M.step + 15) & ~15 & 63;
  };
})();
