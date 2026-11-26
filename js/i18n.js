// Solfall - languages (v3.1a). English is written in the code; Japanese comes from the files in js/lang/.
//
// G.T('Trial {0} of {1}', a, b): the phrase in the chosen language, with {0}, {1}... filled in. In English the
//   phrase is returned as written (with its blanks filled), so English never changes. A phrase with no
//   Japanese yet falls back to English.
// G.i18n.add({ 'English phrase': '日本語', ... }): Japanese phrases, keyed by the exact English (js/lang/ja-*.js).
// G.i18n.patch(fn): a function that rewrites game data (boons, relics, heroes...) into Japanese, by id. They run
//   once, in js/lang/apply.js (loaded last), and only in Japanese.
// The page's own text (index.html) is put into Japanese by one pass over it after the patches (any text node
//   whose whole text is a known phrase).
// The language is chosen on the title screen (G.i18n.setLang) and the page reloads in it. The first time,
// it follows the browser's language.
'use strict';
(function () {
  const I = G.i18n = { dict: {}, patches: [] };
  let lang = G.settings.lang;
  if (lang !== 'en' && lang !== 'ja') lang = /^ja\b/i.test((typeof navigator !== 'undefined' && navigator.language) || '') ? 'ja' : 'en';
  G.lang = lang;
  G.ja = lang === 'ja';
  if (typeof document !== 'undefined') document.documentElement.lang = lang;

  const has = Object.prototype.hasOwnProperty;
  I.add = function (d) { Object.assign(I.dict, d); };
  I.patch = function (fn) { I.patches.push(fn); };
  I.has = (s) => G.ja && has.call(I.dict, s);
  G.T = function (s) {
    let r = G.ja && has.call(I.dict, s) ? I.dict[s] : s;
    for (let i = 1; i < arguments.length; i++) r = r.split('{' + (i - 1) + '}').join(arguments[i]);
    return r;
  };
  // the same English with two meanings: G.Tx('relic', 'RISEN') looks up 'relic|RISEN' first
  G.Tx = function (ctx, s) {
    const k = ctx + '|' + s;
    return G.ja && has.call(I.dict, k) ? I.dict[k] : G.T(s);
  };
  I.setLang = function (l) {
    G.settings.lang = l; G.saveSettings();
    location.reload();
  };
  // the page's own text: a text node whose whole (trimmed) text is a known phrase becomes the Japanese
  function domPass(root) {
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    for (const n of nodes) {
      const v = n.nodeValue, t = v.trim();
      if (t && has.call(I.dict, t)) n.nodeValue = v.replace(t, I.dict[t]);
    }
  }
  I.domPass = domPass;
  I.apply = function () {
    if (!G.ja) return;
    for (const fn of I.patches) {
      try { fn(); } catch (e) { console.error('i18n patch', e); }
    }
    domPass(document.getElementById('stage'));
  };
})();
