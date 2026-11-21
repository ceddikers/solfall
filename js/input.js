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
    dash: ['KeyK', 'KeyC', 'ShiftLeft', 'ShiftRight'],
    flare: ['KeyL', 'KeyV'],
    heal: ['KeyE', 'KeyF'],
    pause: ['Escape', 'KeyP'],
    retry: ['KeyR'],
    confirm: ['Enter', 'NumpadEnter'],
  };
  const codeToAction = {};
  for (const a in MAP) for (const c of MAP[a]) codeToAction[c] = a;

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
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) release('attack', 'Mouse0');
      if (e.button === 2) release('flare', 'Mouse2');
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
    dash: (g) => btn(g, 1) || btn(g, 5) || btn(g, 7),
    flare: (g) => btn(g, 3),
    heal: (g) => btn(g, 4) || btn(g, 6),
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
