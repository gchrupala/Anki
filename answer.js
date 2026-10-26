/*
 * JęzykiMax, answers in the child's own words: whether what was written or
 * said is the answer of a card. The page asks for the answer; this only
 * compares texts, so it can be tested in Node.
 *
 *   written(text, accept, rules): 'right', 'close' or 'wrong'. accept lists
 *     the answers that count. Case, the spaces around the text and a full
 *     stop at its end do not count. close: the same letters but for
 *     accents, apostrophes, hyphens or spaces ('een' for 'één', 'tshirts'
 *     for 'T-shirts'), or, with rules.typo, one letter wrong, missing or
 *     extra in a word of five letters or more. With rules.articles, an
 *     article of rules.lang before the answer does not count either way:
 *     'hond', 'de hond' and 'het hond' are all 'de hond'.
 *   said(heard, accept, rules): whether one of the texts the recognizer
 *     offers for what was said holds an answer that counts. Texts are
 *     compared as they sound in rules.lang (VOICE.sound), so case, accents,
 *     punctuation and spellings that sound alike do not count, nor the
 *     article of the answer; a word may be heard as two ('politie agent',
 *     'a María' for 'amarilla'), and one not heard word for word counts if
 *     it is close enough (MIN_SAID; 1 is the same text). Digits count as
 *     the number ('4' for 'vier') where accept lists them.
 *
 * Works in the browser (window.ANSWER, after voice.js) and in Node
 * (require('./answer.js')).
 */
(function (root) {
  'use strict';

  const VOICE = typeof module === 'object' && module.exports ? require('./voice.js') : root.VOICE;

  // A word heard that is not word for word an answer counts when it scores
  // this much: one letter off in a word of seven letters, not in one of five.
  const MIN_SAID = 0.85;

  // The articles that may come before an answer.
  const ARTICLES = {
    nl: ['de', 'het', 'een', "'t", "'n"],
    fr: ['le', 'la', 'les', "l'", 'un', 'une', 'des'],
    es: ['el', 'la', 'los', 'las', 'un', 'una'],
    it: ['il', 'lo', 'la', 'i', 'gli', 'le', "l'", 'un', 'uno', 'una', "un'"],
    pl: [],
  };

  // Lower case, single spaces, one kind of apostrophe, œ as oe (a keyboard
  // may lack it), no full stop at the end.
  const tidy = (text) => String(text).toLowerCase().replace(/[’`´]/g, "'").replace(/œ/g, 'oe').replace(/\s+/g, ' ').trim()
    .replace(/[.!?]+$/, '').trim();
  // The text without an article before it ("l'" joins the next word).
  function bare(text, articles) {
    for (const a of articles) {
      if (a.endsWith("'") ? text.startsWith(a) && text.length > a.length : text.startsWith(a + ' ')) return text.slice(a.length).trim();
    }
    return text;
  }
  // Only the letters and digits, without accents.
  const plain = (text) => VOICE.normalize(text).replace(/ /g, '');

  function written(text, accept, rules = {}) {
    const articles = rules.articles ? ARTICLES[rules.lang] || [] : [];
    const t = bare(tidy(text), articles);
    if (!t) return 'wrong';
    const answers = accept.map((a) => bare(tidy(a), articles));
    if (answers.includes(t)) return 'right';
    const p = plain(t);
    if (answers.some((a) => plain(a) === p)) return 'close';
    if (rules.typo && answers.some((a) => plain(a).length >= 5 && VOICE.distance(plain(a), p) <= 1)) return 'close';
    return 'wrong';
  }

  // Whether the words heard hold the answer: some words in a row that are
  // the answer, or the answer as one word, or nearly the answer, with or
  // without the spaces between words.
  function heardIn(words, answer) {
    const joined = answer.replace(/ /g, '');
    const n = answer.split(' ').length;
    for (let k = 1; k <= Math.min(words.length, n + 1); k++) {
      for (let i = 0; i + k <= words.length; i++) {
        const part = words.slice(i, i + k);
        if (part.join('') === joined || VOICE.likeness(part.join(' '), answer) >= MIN_SAID
          || VOICE.likeness(part.join(''), joined) >= MIN_SAID) return true;
      }
    }
    return false;
  }

  function said(heard, accept, rules = {}) {
    // As the words sound; an apostrophe parts words, so that an article
    // joined to its word is a word of its own ("l’oiseau", "nell’acqua").
    const spoken = (text) => VOICE.sound(String(text).replace(/['’`´]/g, ' '), rules.lang);
    const articles = (ARTICLES[rules.lang] || []).map(spoken);
    const answers = accept.map((a) => {
      const w = spoken(a).split(' ');
      return (w.length > 1 && articles.includes(w[0]) ? w.slice(1) : w).join(' ');
    }).filter(Boolean);
    return heard.some((text) => {
      const words = spoken(text).split(' ').filter(Boolean);
      return answers.some((answer) => heardIn(words, answer));
    });
  }

  const api = { written, said, ARTICLES, MIN_SAID };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ANSWER = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
