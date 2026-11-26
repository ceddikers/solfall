// Solfall - the Guide (v2.9n): a book you leaf through, a page spread at a time. Each spread has a
// screenshot of the game (img/guide/, taken from the game itself) with numbered arrows on it, and short
// notes that match the numbers. It opens by itself the first time you reach the camp after this patch
// (G.store 'guide' < GUIDE_V), and lives in the pause menu after that.
//
// Marks: x, y is the point the arrow touches and lx, ly where its numbered circle sits, both in the
// screenshot's own 1280x720 pixels. A note with no x is a plain line, without a number.
(function () {
  'use strict';
  const GUIDE_V = 1;
  const k = (a) => G.input.keys(a).slice(0, 2).map((s) => '<kbd>' + s + '</kbd>').join(' ');

  const PAGES = [
    {
      title: 'Solfall', img: 'welcome', lead: 'You fight bosses one after another. Each portal leads to a different boss.',
      notes: [
        { name: 'A run', text: 'Beat a boss, pick a boon (a power-up), then pick the next boss. Beat 7 bosses to win. Each one is tougher than the last.' },
        { name: 'If you die', text: 'The run is over and you start again. You keep the Sunshards you earned.' },
        { name: 'This book', text: 'Use ← → or click a page to turn it. You can open it again from the pause menu (Esc).' },
      ],
    },
    {
      title: 'The camp', img: 'vigil-west', lead: 'This is where you start. Walk up to things and press E to use them.',
      notes: [
        { name: 'Journal', text: 'Shows every boss attack you’ve seen so far.', x: 155, y: 548, lx: 120, ly: 300 },
        { name: 'Tally', text: 'A list of challenges. Each one pays Sunshards the first time you do it.', x: 300, y: 520, lx: 330, ly: 300 },
        { name: 'Sparring post', text: 'A practice dummy. Hit it to test your moves.', x: 800, y: 556, lx: 690, ly: 380 },
        { name: 'Brazier', text: 'Changes the difficulty. Merciless gives bosses extra attacks.', x: 1170, y: 520, lx: 1060, ly: 300 },
      ],
    },
    {
      title: 'The camp', img: 'vigil-shrine', lead: 'Keep walking right.',
      notes: [
        { name: 'Shrine', text: 'Spend Sunshards on permanent upgrades, like more health or damage.', x: 178, y: 455, lx: 300, ly: 250 },
        { name: 'Practice', text: 'Fight any boss, starting at any phase. Nothing is lost if you die.', x: 520, y: 560, lx: 520, ly: 360 },
        { name: 'Hall of Echoes', text: 'Walk into an alcove to switch to that hero.', x: 930, y: 520, lx: 860, ly: 250 },
        { name: 'Wardrobe', text: 'Change your hero’s outfit. Playing a hero unlocks more.', x: 1182, y: 530, lx: 1170, ly: 250 },
      ],
    },
    {
      title: 'Starting a run', img: 'vigil-gate', lead: 'At the far right of the camp.',
      notes: [
        { name: 'Relics', text: 'Pick one relic. It gives you a bonus for the whole run. Walk up to one to read what it does.', x: 510, y: 520, lx: 380, ly: 300 },
        { name: 'Gate', text: 'Walk in to start the run.', x: 960, y: 420, lx: 700, ly: 200 },
      ],
    },
    { title: 'Controls', controls: true },
    {
      title: 'In a fight', img: 'fight', crop: [0, 0, 640, 360], lead: 'The top left of the screen is about you.',
      notes: [
        { name: 'Health', text: 'Lose it all and you die. It refills before every fight.', x: 194, y: 56, lx: 330, ly: 50 },
        { name: 'Starlight', text: 'Fills when you hit the boss. Use it for your special attack or to heal.', x: 226, y: 89, lx: 400, ly: 84 },
        { name: 'Dawnbreak', text: 'Fills as you fight. When it’s full, use it for a huge attack.', x: 226, y: 113, lx: 440, ly: 126 },
        { name: 'Items and Motes', text: 'Items you’ve bought. Press 1 or 2 to use them. The number is your Motes.', x: 306, y: 170, lx: 460, ly: 196 },
        { name: 'Boons', text: 'The power-ups you’ve picked this run.', x: 230, y: 210, lx: 320, ly: 280 },
        { name: 'Omen', text: 'Some fights have an extra rule. It’s shown at the top right.' },
      ],
    },
    {
      title: 'In a fight', img: 'fight', crop: [320, 360, 640, 360], lead: 'Anything red-orange is about to hurt you.',
      notes: [
        { name: 'The boss', text: 'It moves a certain way before each attack. Learn the moves and you’ll know what’s coming.', x: 560, y: 480, lx: 420, ly: 440 },
        { name: 'Boss health', text: 'The lines split it into 3 phases. The boss gets new attacks each phase.', x: 820, y: 677, lx: 880, ly: 590 },
        { name: 'Stagger bar', text: 'Fills when you hit the boss. See the next page.', x: 690, y: 692, lx: 640, ly: 610 },
      ],
    },
    {
      title: 'Staggering', img: 'stagger', crop: [200, 180, 960, 540], lead: 'Keep hitting the boss to fill its stagger bar.',
      notes: [
        { name: 'Full bar', text: 'The boss is stunned for a few seconds and takes more damage.', x: 700, y: 692, lx: 960, ly: 600 },
        { name: 'Stunned boss', text: 'It can’t attack, so hit it as much as you can. The bar is longer next time.', x: 560, y: 560, lx: 380, ly: 380 },
        { name: 'Dodging', text: 'You can’t be hurt while dashing. Dash right before a hit lands for a perfect dodge: you get Starlight and can dash again at once.' },
      ],
    },
    {
      title: 'Between fights', img: 'road', lead: 'After each win you walk here. Nothing can hurt you here.',
      notes: [
        { name: 'Fire', text: 'Shows your relic. It gets stronger as the run goes on.', x: 35, y: 580, lx: 90, ly: 360 },
        { name: 'Merchant', text: 'Spend Motes on more health, boons or items.', x: 290, y: 545, lx: 220, ly: 300 },
        { name: 'Boons', text: 'Pick one. Get 3 from the same set (the card tells you) to unlock a Crown, a strong extra move.', x: 530, y: 525, lx: 470, ly: 400 },
        { name: 'Second Thoughts', text: 'Don’t like the boons? Swap them for new ones.', x: 840, y: 520, lx: 900, ly: 340 },
        { name: 'Other stops', text: 'A fountain, a smith, a fortune teller or a duel. They change each time.', x: 1055, y: 500, lx: 1160, ly: 300 },
      ],
    },
    {
      title: 'Picking the next boss', img: 'portals', lead: 'Walk into a portal to fight that boss.',
      notes: [
        { name: 'Portal', text: 'The next boss. You have to pick a boon before you can go in.', x: 298, y: 470, lx: 300, ly: 200 },
        { name: 'Corrupted', text: 'A boss you already beat, but much harder. Optional. Beat it to get a second relic.', x: 686, y: 470, lx: 686, ly: 200 },
        { name: 'Closed', text: 'You’ve already beaten this one.', x: 880, y: 470, lx: 880, ly: 200 },
      ],
    },
    {
      title: 'Sunshards and Motes', img: 'shrine', crop: [190, 50, 900, 506], lead: 'There are two kinds of money.',
      notes: [
        { name: 'Sunshards', text: 'You get some after every fight, even if you lose. You keep them forever.', x: 455, y: 172, lx: 300, ly: 120 },
        { name: 'Shrine upgrades', text: 'Buy these with Sunshards. They stay for every run after.', x: 300, y: 262, lx: 250, ly: 420 },
        { name: 'Motes', text: 'Only for this run. Spend them at the merchant. Any left over turn into Sunshards when the run ends.' },
      ],
    },
  ];

  function controls() {
    const rows = [
      ['Move', k('left') + ' ' + k('right'), 'Stick'],
      ['Jump', k('jump'), 'A'],
      ['Attack', '<kbd>Left click</kbd> ' + k('attack'), 'X'],
      ['Dash', k('dash'), 'B'],
      ['Special', '<kbd>Right click</kbd> ' + k('flare'), 'Y'],
      ['Mend (hold)', k('heal'), 'LB'],
      ['Dawnbreak', k('ult'), 'RT'],
      ['Crown', k('crown'), 'LT'],
      ['Items', k('item1') + ' ' + k('item2'), 'L3 R3'],
      ['Use, in camp', k('heal'), 'LB'],
      ['Your moves', 'hold <kbd>Tab</kbd>', ''],
      ['Pause', '<kbd>Esc</kbd>', 'Start'],
    ];
    const L = '<h2>Controls</h2><table class="gkeys"><tr><th></th><th>Keyboard</th><th>Pad</th></tr>'
      + rows.map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + (r[2] ? '<kbd>' + r[2] + '</kbd>' : '') + '</td></tr>').join('') + '</table>';
    const R = notes([
      { name: 'Dash', text: 'You can’t be hurt while dashing. Use it to go through attacks.' },
      { name: 'Special and Mend', text: 'Each uses one bar of Starlight. Hold Mend while standing still to heal 1 health.' },
      { name: 'Dawnbreak', text: 'Your huge attack. Only works when its bar is full.' },
      { name: 'Crown', text: 'Unlocked by getting 3 boons from the same set.' },
      { name: 'Hero moves', text: 'Hold Tab in a fight to see everything your hero can do.' },
      { name: 'Change keys', text: 'Settings, then Controls.' },
    ]);
    return { L, R };
  }

  function notes(list) {
    let n = 0;
    return '<ol class="gnotes">' + list.map((m) => {
      const badge = m.x != null ? '<i>' + (++n) + '</i>' : '<i class="dot"></i>';
      return '<li>' + badge + '<b>' + m.name + '</b><span>' + m.text + '</span></li>';
    }).join('') + '</ol>';
  }

  // the screenshot and its arrows: an svg over it in the picture's own pixels. p.crop ([x, y, w, h], 16:9)
  // shows part of the shot larger; the marks keep the full shot's pixels and shrink with the crop.
  function figure(p) {
    const [cx, cy, cw, ch] = p.crop || [0, 0, 1280, 720], z = cw / 1280, f = (v) => Math.round(v * 10) / 10;
    let n = 0, svg = '';
    for (const m of p.notes) {
      if (m.x == null) continue;
      n++;
      const dx = m.x - m.lx, dy = m.y - m.ly, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, R = 27 * z;
      const sx = m.lx + ux * (R + 3 * z), sy = m.ly + uy * (R + 3 * z), ex = m.x - ux * 12 * z, ey = m.y - uy * 12 * z;
      const hx = ex - ux * 22 * z, hy = ey - uy * 22 * z, px = -uy * 12 * z, py = ux * 12 * z;
      const ln = ' x1="' + f(sx) + '" y1="' + f(sy) + '" x2="' + f(ex) + '" y2="' + f(ey) + '"';
      svg += '<g>'
        + '<line class="sh"' + ln + ' stroke-width="' + f(10 * z) + '"/>'
        + '<line' + ln + ' stroke-width="' + f(4 * z) + '"/>'
        + '<polygon points="' + f(ex) + ',' + f(ey) + ' ' + f(hx + px) + ',' + f(hy + py) + ' ' + f(hx - px) + ',' + f(hy - py) + '" stroke-width="' + f(3 * z) + '"/>'
        + '<circle class="ring" cx="' + m.x + '" cy="' + m.y + '" r="' + f(8 * z) + '" stroke-width="' + f(4 * z) + '"/>'
        + '<circle class="num" cx="' + m.lx + '" cy="' + m.ly + '" r="' + f(R) + '" stroke-width="' + f(5 * z) + '"/>'
        + '<text x="' + m.lx + '" y="' + f(m.ly + 11 * z) + '" font-size="' + f(30 * z) + '">' + n + '</text></g>';
    }
    const at = 'width:' + f(128000 / cw) + '%;height:' + f(72000 / ch) + '%;left:' + f(-cx / cw * 100) + '%;top:' + f(-cy / ch * 100) + '%';
    return '<figure class="gfig"><img src="img/guide/' + p.img + '.jpg" alt="" draggable="false" style="' + at + '">'
      + '<svg viewBox="' + cx + ' ' + cy + ' ' + cw + ' ' + ch + '" preserveAspectRatio="none">' + svg + '</svg></figure>';
  }

  function spread(i) {
    const p = PAGES[i];
    if (p.controls) return controls();
    return {
      L: '<h2>' + p.title + '</h2>' + figure(p) + '<p class="glead">' + p.lead + '</p>',
      R: notes(p.notes),
    };
  }

  const GD = G.guide = { page: 0, first: false, busy: false, PAGES };
  let elL, elR, book, elNum;

  function folio(i) { return '<div class="gfolio l">' + (i * 2 + 1) + '</div>'; }
  function folioR(i) { return '<div class="gfolio r">' + (i * 2 + 2) + '</div>'; }
  function fill(i) {
    const s = spread(i);
    elL.innerHTML = s.L + folio(i);
    elR.innerHTML = s.R + folioR(i);
    status();
  }
  function status() {
    elNum.textContent = (GD.page + 1) + ' / ' + PAGES.length;
    const next = document.querySelector('#s-guide [data-act="gnext"]');
    if (next) next.textContent = GD.page === PAGES.length - 1 ? 'Done' : 'Next';
    const prev = document.querySelector('#s-guide [data-act="gprev"]');
    if (prev) prev.classList.toggle('off', GD.page === 0);
  }

  // Turning a page: a leaf lifts from the right (or the left, going back) and swings over the spine.
  // Its front is the page you were reading and its back the page you're turning to.
  GD.turn = function (d) {
    const to = GD.page + d;
    if (to < 0) return;
    if (to >= PAGES.length) { GD.close(); return; }
    if (GD.busy) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const oldL = elL.innerHTML, oldR = elR.innerHTML, s = spread(to);
    GD.page = to;
    G.audio.play('uiMove');
    if (reduce) { fill(to); return; }
    GD.busy = true;
    const leaf = document.createElement('div');
    leaf.className = 'gleaf ' + (d > 0 ? 'fwd' : 'back');
    leaf.innerHTML = '<div class="gface a"><div class="gpg">' + (d > 0 ? oldR : oldL) + '</div></div>'
      + '<div class="gface b"><div class="gpg">' + (d > 0 ? s.L + folio(to) : s.R + folioR(to)) + '</div></div>';
    if (d > 0) elR.innerHTML = s.R + folioR(to); else elL.innerHTML = s.L + folio(to);
    book.appendChild(leaf);
    status();
    void leaf.offsetWidth;
    leaf.classList.add('go');
    setTimeout(() => {
      if (d > 0) elL.innerHTML = s.L + folio(to); else elR.innerHTML = s.R + folioR(to);
      leaf.remove();
      GD.busy = false;
    }, 620);
  };

  GD.open = function (first) {
    elL = elL || document.getElementById('guideL');
    elR = elR || document.getElementById('guideR');
    book = book || document.querySelector('#s-guide .book');
    elNum = elNum || document.getElementById('guideNum');
    GD.first = !!first;
    GD.page = 0;
    fill(0);
    G.ui.show('guide', !first);
    G.ui.setFocus(1); // Next
  };
  GD.close = function () {
    G.store.save('guide', GUIDE_V);
    const first = GD.first;
    GD.first = false;
    G.audio.play('uiBack');
    if (G.ui.stack.length) G.ui.back();
    else { G.ui.close(); G.input.endStep(); }
    if (first) G.ui.campHint();
  };
  GD.go = function (i) { GD.page = G.clamp(i, 0, PAGES.length - 1); fill(GD.page); }; // (for the console and tests)
  // the first time at the camp since the guide came in
  GD.due = () => (G.store.load('guide', 0) || 0) < GUIDE_V;

  // a click on a page turns it: the right page forward, the left back
  document.addEventListener('click', (e) => {
    if (G.ui.current !== 'guide' || GD.busy) return;
    if (e.target.closest('.item')) return;
    const pg = e.target.closest('#guideL, #guideR');
    if (pg) GD.turn(pg.id === 'guideR' ? 1 : -1);
  });
})();
