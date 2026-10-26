/*
 * JęzykiMax, answering by voice: which of the answers on offer was said,
 * from what the browser's speech recognition heard. The page does the
 * listening; this only reads the text heard, so it can be tested in Node.
 *
 *   pick(heard, options, context, { lang, right }): the index of the
 *     answer said, or -1 if none can be told. heard is the list of texts
 *     the recognizer offers for one utterance, the likeliest first; options
 *     the text of each answer. context, for a sentence with a gap, is the
 *     text before and after the gap: the child may say the whole sentence,
 *     and only the words in the gap count. lang is the language spoken:
 *     texts are then compared by how they sound (sound). right is the
 *     index of the right answer, which gets the benefit of the doubt.
 *   sound(text, lang): the text as it sounds, roughly: lower case, without
 *     accents or punctuation, with spellings that sound alike written
 *     alike (Dutch ij and ei, the n of -en that is often not said; Spanish
 *     ll and y, b and v; French endings that are not heard; Polish ó and u).
 *
 * The answers are often forms of one word (tennis, tennist, tennissen), so
 * an answer heard word for word is picked however close the others are.
 * Otherwise the closest answer is picked if it is close enough and clearly
 * closer than the others. The likeliest text that gives an answer counts.
 *
 * The recognizer often writes a word as another that sounds the same or
 * nearly so ("danste" for "dansten", "a María" for "amarilla"), so the
 * right answer gets the benefit of the doubt. It is picked when any text
 * heard gives it, when it sounds the same as the answer heard word for
 * word, or when it is about as close as the closest answer. A wrong answer
 * is picked only when it is heard word for word, or clearly closer.
 *
 * Works in the browser (window.VOICE) and in Node (require('./voice.js')).
 */
(function (root) {
  'use strict';

  // An answer not heard word for word is picked when it scores at least
  // MIN_SCORE (1 is the same text) and MARGIN more than any other.
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

  // Spellings that sound alike, made alike, in each word (lower case, with
  // its accents). Upper-case letters stand for a sound (French E for é and
  // è) and keep it apart from the letters around it.
  const SOUNDS = {
    fr: [
      [/^(.{2,})(ées|ée|és|ez)$/, '$1E'], [/^(.{3,})er$/, '$1E'], [/é/g, 'E'], [/(aient|ais|ait|ai|ei|è|ê)/g, 'E'],
      // Endings not heard: -ent of verbs, a last s, x, t, d, z or p, a last e.
      [/^(.{3,})ent$/, '$1'], [/^(.{3,}?)[sxtdzp]+$/, '$1'], [/^(.{3,})e$/, '$1'],
      [/eau/g, 'o'], [/au/g, 'o'], [/qu/g, 'k'], [/ph/g, 'f'], [/ch/g, 'S'], [/h/g, ''], [/ç/g, 's'], [/c(?=[eiyE])/g, 's'], [/c/g, 'k'],
      [/([bdfgklmnprstvz])\1/g, '$1'],
    ],
    es: [
      [/ch/g, 'C'], [/ll/g, 'y'], [/y$/, 'i'], [/h/g, ''], [/v/g, 'b'], [/qu/g, 'k'],
      [/gu(?=[eiéí])/g, 'G'], [/g(?=[eiéí])/g, 'x'], [/j/g, 'x'], [/G/g, 'g'],
      [/c(?=[eiéí])/g, 's'], [/z/g, 's'], [/c/g, 'k'], [/C/g, 'ch'],
    ],
    nl: [
      [/ij/g, 'ei'], [/y/g, 'ei'], [/au/g, 'ou'], [/ch/g, 'g'], [/ph/g, 'f'], [/th/g, 't'], [/c(?=[eiy])/g, 's'], [/c/g, 'k'],
      // A last d sounds as t; the n of -en is often not said (dansten, danste).
      [/dt$/, 't'], [/d$/, 't'], [/^(.{2,}[^aeiou])en$/, '$1e'],
      [/([bdfgklmnprstvz])\1/g, '$1'],
    ],
    it: [
      [/([bcdfglmnprstvz])\1/g, '$1'], [/ch/g, 'k'], [/gh/g, 'g'], [/h/g, ''], [/qu/g, 'ku'], [/c(?![eiéèì])/g, 'k'], [/j/g, 'i'],
    ],
    pl: [
      [/ó/g, 'u'], [/rz/g, 'ż'], [/ch/g, 'h'], [/ę$/, 'e'], [/ą/g, 'on'], [/ę/g, 'en'],
    ],
  };
  function sound(text, lang) {
    const rules = SOUNDS[lang];
    if (!rules) return normalize(text);
    return String(text).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
      .map((w) => rules.reduce((x, [from, to]) => x.replace(from, to), w)
        .normalize('NFKD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').replace(/œ/g, 'oe'))
      .join(' ');
  }

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
    const flat = answer.replace(/ /g, '');
    let best = likeness(said, answer);
    for (let k = Math.max(1, n - 1); k <= n + 1; k++) {
      for (let i = 0; i + k <= s.length; i++) {
        // A word may be heard as two ("a maría" for "amarilla").
        const part = s.slice(i, i + k);
        if (part.join('') === flat) return 1;
        best = Math.max(best, likeness(part.join(' '), answer), likeness(part.join(''), flat));
      }
    }
    return best;
  }

  // What was said of a sentence with a gap, without the words around the
  // gap: the start of what was said that ends the text before the gap, and
  // the end that begins the text after it, word for word or nearly so.
  // All three as they sound.
  function inGap(said, [before, after]) {
    const s = words(said);
    const b = words(before);
    const a = words(after);
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

  // The answer that one text heard gives, or -1. right: the index of the
  // right answer, or -1.
  function pickFrom(said, answers, right) {
    const scores = answers.map((answer) => score(said, answer));
    // Heard word for word: one answer, or the longest one when it holds the
    // others ("de la" holds "la"). The right answer when it sounds the same
    // as that one ("dansten" and "danste").
    const exact = answers.map((a, i) => i).filter((i) => scores[i] === 1).sort((i, j) => answers[j].length - answers[i].length);
    if (exact.length) {
      const [longest, ...others] = exact;
      if (right >= 0 && scores[right] === 1 && answers[right] === answers[longest]) return right;
      return others.every((i) => (' ' + answers[longest] + ' ').includes(' ' + answers[i] + ' ')) ? longest : -1;
    }
    const [best, second] = scores.map((s, i) => i).sort((i, j) => scores[j] - scores[i]);
    if (best === undefined || scores[best] < MIN_SCORE) return -1;
    // The right answer about as close as the closest one.
    if (right >= 0 && scores[right] >= MIN_SCORE && scores[best] - scores[right] < MARGIN) return right;
    if (second !== undefined && scores[best] - scores[second] < MARGIN) return -1;
    return best;
  }

  function pick(heard, options, context, { lang, right = -1 } = {}) {
    const key = (text) => sound(text, lang);
    const answers = options.map(key);
    const gap = context && context.map(key);
    const said = heard.map(key).filter(Boolean).map((t) => (gap ? inGap(t, gap) : t));
    // Any text heard that gives the right answer: the recognizer thought it
    // could be what was said.
    if (right >= 0 && said.some((t) => pickFrom(t, answers, right) === right)) return right;
    for (const t of said) {
      const i = pickFrom(t, answers, right);
      if (i >= 0) return i;
    }
    return -1;
  }

  const api = { normalize, sound, distance, likeness, pick, MIN_SCORE, MARGIN };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VOICE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
