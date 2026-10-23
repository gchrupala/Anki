/*
 * JęzykiMax, answering by voice: which of the answers on offer was said,
 * from what the browser's speech recognition heard. The page does the
 * listening; this only reads the text heard, so it can be tested in Node.
 *
 *   pick(heard, options, context): the index of the answer said, or -1 if
 *     none is clearly closer than the others. heard is the list of texts
 *     the recognizer offers for one utterance, the likeliest first;
 *     options the text of each answer. context, for a sentence with a
 *     gap, is the text before and after the gap: the child may say the
 *     whole sentence, and only the words in the gap count.
 *
 * Works in the browser (window.VOICE) and in Node (require('./voice.js')).
 */
(function (root) {
  'use strict';

  // An answer is picked when it scores at least MIN_SCORE (1 is the same
  // text) and MARGIN more than any other.
  const MIN_SCORE = 0.6;
  const MARGIN = 0.2;

  // Lower case, without accents, apostrophes or punctuation.
  function normalize(text) {
    return String(text)
      .toLowerCase()
      .normalize('NFKD').replace(/\p{M}/gu, '')
      .replace(/ł/g, 'l').replace(/œ/g, 'oe')
      .replace(/['’`´]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }
  const words = (text) => (text ? text.split(' ') : []);

  function distance(a, b) {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      for (let j = 1; j <= b.length; j++) {
        row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = row;
    }
    return prev[b.length];
  }
  // 1 for the same text, 0 for nothing in common.
  const likeness = (a, b) => (a || b ? 1 - distance(a, b) / Math.max(a.length, b.length) : 1);

  // How well what was said matches an answer: the whole of it, or the part
  // of it most like the answer ("c'est la pomme" for "la pomme"). Saying
  // only part of an answer ("pomme" for "la pomme") counts nearly as much.
  function score(said, answer) {
    if (!said || !answer) return 0;
    if ((' ' + said + ' ').includes(' ' + answer + ' ')) return 1;
    if (said.length >= 4 && (' ' + answer + ' ').includes(' ' + said + ' ')) return 0.9;
    const s = words(said);
    const n = words(answer).length;
    let best = likeness(said, answer);
    for (let k = Math.max(1, n - 1); k <= n + 1; k++) {
      for (let i = 0; i + k <= s.length; i++) best = Math.max(best, likeness(s.slice(i, i + k).join(' '), answer));
    }
    return best;
  }

  // What was said of a sentence with a gap, without the words around the
  // gap: the start of what was said that ends the text before the gap, and
  // the end that begins the text after it, word for word or nearly so.
  function inGap(said, [before, after]) {
    const s = words(said);
    const b = words(normalize(before));
    const a = words(normalize(after));
    const same = (x, y) => likeness(x, y) >= 0.7;
    let from = 0;
    for (let k = Math.min(b.length, s.length); k > 0; k--) {
      if (s.slice(0, k).every((w, i) => same(w, b[b.length - k + i]))) {
        from = k;
        break;
      }
    }
    let to = s.length;
    for (let k = Math.min(a.length, s.length - from); k > 0; k--) {
      if (s.slice(s.length - k).every((w, i) => same(w, a[i]))) {
        to = s.length - k;
        break;
      }
    }
    return to > from ? s.slice(from, to).join(' ') : said;
  }

  function pick(heard, options, context) {
    const said = [];
    for (const text of heard) {
      const t = normalize(text);
      const s = t && context ? inGap(t, context) : t;
      if (s && !said.includes(s)) said.push(s);
    }
    const scores = options.map((answer) => Math.max(0, ...said.map((s) => score(s, normalize(answer)))));
    const order = scores.map((s, i) => i).sort((i, j) => scores[j] - scores[i]);
    const [best, second] = order;
    if (best === undefined || scores[best] < MIN_SCORE) return -1;
    if (second !== undefined && scores[best] - scores[second] < MARGIN) return -1;
    return best;
  }

  const api = { normalize, pick, MIN_SCORE, MARGIN };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VOICE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
