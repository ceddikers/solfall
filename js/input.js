// Solfall - keyboard, mouse and gamepad input mapped to named actions.
'use strict';
(function () {
  const MAP = {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    jump: ['Space', 'KeyZ'],
    attack: ['KeyJ', 'KeyX'],
    dash: ['ShiftLeft', 'KeyK', 'KeyC', 'ShiftRight'],
    flare: ['KeyL', 'KeyV'],
    heal: ['KeyE', 'KeyF'],
    ult: ['KeyQ', 'KeyI'],
    crown: ['KeyU'], // a set's crown (v2.3a)
    item1: ['Digit1', 'Numpad1'], // (v2.9k) the two consumables (motes.js)
    item2: ['Digit2', 'Numpad2'],
    taunt: ['KeyT', 'KeyG'],
    pause: ['Escape', 'KeyP'],
    moves: ['Tab'],
    retry: ['KeyR'],
    confirm: ['Enter', 'NumpadEnter'],
  };
  const DEFAULTS = {};
  for (const a in MAP) DEFAULTS[a] = MAP[a].slice();
  let codeToAction = {};
  function rebuild() { codeToAction = {}; for (const a in MAP) for (const c of MAP[a]) codeToAction[c] = a; }
  // bindings saved from an earlier session
  if (G.settings.keys) for (const a in G.settings.keys) if (MAP[a] && Array.isArray(G.settings.keys[a]) && G.settings.keys[a].length) MAP[a] = G.settings.keys[a].slice();
  rebuild();

  const I = G.input = {
    down: {},       // action -> held now
    pressed: {},    // action -> went down since the last simulation step
    released: {},   // action -> went up since the last simulation step
    onAction: null, // callback(action) on every press edge (menus, pause)
    device: 'keyboard',
  };
  const sources = {}; // action -> Set of source ids holding it down
  for (const a in MAP) { sources[a] = new Set(); I.down[a] = false; }

  function press(action, src) {
    const set = sources[action];
    const was = set.size > 0;
    set.add(src);
    if (!was) {
      I.down[action] = true;
      I.pressed[action] = true;
      if (I.onAction) I.onAction(action);
    }
  }
  function release(action, src) {
    const set = sources[action];
    if (!set.delete(src)) return;
    if (set.size === 0) {
      I.down[action] = false;
      I.released[action] = true;
    }
  }
  function releaseAll() {
    for (const a in sources) {
      if (sources[a].size) { sources[a].clear(); I.down[a] = false; I.released[a] = true; }
    }
  }

  window.addEventListener('keydown', (e) => {
    // the Controls screen is waiting for a key: it takes this press, whatever it is
    if (I.grab) { const g = I.grab; I.grab = null; e.preventDefault(); if (!e.repeat) g(e.code); else I.grab = g; return; }
    const a = codeToAction[e.code];
    if (!a) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    if (e.repeat) return;
    I.device = 'keyboard';
    if (a === 'attack' || a === 'flare') I.aim[a] = false;
    press(a, e.code);
  });
  window.addEventListener('keyup', (e) => {
    const a = codeToAction[e.code];
    if (a) release(a, e.code);
  });
  window.addEventListener('blur', releaseAll);

  // ---- rebinding (Settings, Controls)
  I.REBIND = ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash', 'flare', 'heal', 'ult', 'crown', 'item1', 'item2'];
  const FIXED = ['Escape', 'Enter', 'NumpadEnter'];
  // Make `code` the first key for an action. A key does one thing, so it is taken from whatever had it.
  I.bind = function (action, code) {
    if (!I.REBIND.includes(action) || !code || FIXED.includes(code)) return false;
    for (const a in MAP) if (a !== action) MAP[a] = MAP[a].filter((c) => c !== code);
    MAP[action] = [code].concat(MAP[action].filter((c) => c !== code)).slice(0, 4);
    // nothing may be left without a key
    for (const a of I.REBIND) if (!MAP[a].length) MAP[a] = DEFAULTS[a].filter((c) => !codeToActionNow(c, a)).slice(0, 1);
    save(); rebuild(); releaseAll();
    return true;
  };
  function codeToActionNow(code, except) { for (const a in MAP) if (a !== except && MAP[a].includes(code)) return true; return false; }
  function save() { const k = {}; for (const a in MAP) k[a] = MAP[a].slice(); G.settings.keys = k; G.saveSettings(); }
  I.resetKeys = function () { for (const a in MAP) MAP[a] = DEFAULTS[a].slice(); G.settings.keys = null; G.saveSettings(); rebuild(); releaseAll(); };
  const NAMES = { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'R Shift', ControlLeft: 'Ctrl', ControlRight: 'R Ctrl', AltLeft: 'Alt', AltRight: 'R Alt',
    ArrowLeft: '\u2190', ArrowRight: '\u2192', ArrowUp: '\u2191', ArrowDown: '\u2193', Tab: 'Tab', Backspace: 'Bksp', CapsLock: 'Caps',
    Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: '\'', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`' };
  I.keyName = (code) => NAMES[code] || (code || '?').replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
  // The key to show for an action in prompts: its first binding. (v2.6a) The game is played with the
  // mouse, so attack and special are shown as the mouse buttons (their keys still work), and Shift
  // is dash's first key.
  I.label = function (action) {
    if (action === 'attack') return 'Left click';
    if (action === 'flare') return 'Right click';
    return MAP[action] && MAP[action].length ? I.keyName(MAP[action][0]) : '?';
  };
  I.mouse = true;
  I.keys = (action) => (MAP[action] || []).map(I.keyName);

  // Mouse: left click slashes, right click fires the lance, both aimed at the cursor.
  // Listens on the whole window so clicks land wherever the cursor is, and the browser's
  // right-click menu never opens over the game.
  I.mx = 640; I.my = 360;                  // cursor position in stage coordinates
  I.aim = { attack: false, flare: false }; // true when the last press of that action came from the mouse
  I.mouseBlocked = null;                   // set by the game: returns true while a menu is open
  I.bindMouse = function (stage) {
    const track = (e) => {
      const r = stage.getBoundingClientRect();
      if (!r.width) return;
      I.mx = (e.clientX - r.left) / r.width * G.W;
      I.my = (e.clientY - r.top) / r.height * G.H;
    };
    window.addEventListener('mousemove', track);
    window.addEventListener('mousedown', (e) => {
      track(e);
      if (I.mouseBlocked && I.mouseBlocked()) return;
      if (e.button === 0) { I.aim.attack = true; I.device = 'keyboard'; press('attack', 'Mouse0'); e.preventDefault(); }
      if (e.button === 2) { I.aim.flare = true; I.device = 'keyboard'; press('flare', 'Mouse2'); e.preventDefault(); }
      if (e.button === 1) { I.device = 'keyboard'; press('ult', 'Mouse1'); e.preventDefault(); } // middle click
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) release('attack', 'Mouse0');
      if (e.button === 2) release('flare', 'Mouse2');
      if (e.button === 1) release('ult', 'Mouse1');
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  // Gamepad (standard mapping). Polled once per rendered frame.
  const PAD = {
    left: (g) => g.axes[0] < -0.4 || btn(g, 14),
    right: (g) => g.axes[0] > 0.4 || btn(g, 15),
    up: (g) => g.axes[1] < -0.55 || btn(g, 12),
    down: (g) => g.axes[1] > 0.55 || btn(g, 13),
    jump: (g) => btn(g, 0),
    attack: (g) => btn(g, 2),
    dash: (g) => btn(g, 1) || btn(g, 5),
    ult: (g) => btn(g, 7),
    taunt: (g) => btn(g, 8),
    item1: (g) => btn(g, 10), // (v2.9k) the stick clicks: L3 and R3 (R3 was a second flourish)
    item2: (g) => btn(g, 11),
    flare: (g) => btn(g, 3),
    heal: (g) => btn(g, 4),
    crown: (g) => btn(g, 6), // LT (mend keeps LB)
    pause: (g) => btn(g, 9),
  };
  function btn(g, i) { return !!(g.buttons[i] && g.buttons[i].pressed); }

  I.poll = function () {
    if (!navigator.getGamepads) return;
    let pad = null;
    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { pad = pads[i]; break; }
    for (const a in PAD) {
      const held = pad ? PAD[a](pad) : false;
      if (held) {
        I.device = 'gamepad';
        if ((a === 'attack' || a === 'flare') && !sources[a].has('pad')) I.aim[a] = false;
        press(a, 'pad');
      } else release(a, 'pad');
    }
  };

  // Called after each simulation step that read the edges.
  I.endStep = function () {
    for (const a in I.pressed) I.pressed[a] = false;
    for (const a in I.released) I.released[a] = false;
  };

  I.axisX = () => (I.down.right ? 1 : 0) - (I.down.left ? 1 : 0);
  I.axisY = () => (I.down.down ? 1 : 0) - (I.down.up ? 1 : 0);
})();
