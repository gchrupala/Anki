const test = require('node:test');
const assert = require('node:assert/strict');
require('../i18n.js');
require('../i18n-languages.js');
require('../languages-translations.js');
require('../languages-recall.js');
require('../languages.js');
const { written, said } = require('../answer.js');
const VOICE = require('../voice.js');

const { LANGUAGE_CARDS, LANGUAGE_TARGETS, LANGUAGE_LEVELS, I18N } = globalThis;
const all = Object.values(LANGUAGE_CARDS).flat();
const BY_ID = Object.fromEntries(all.map((c) => [c.id, c]));

test('each card has its own id and number, a level and a kind', () => {
  assert.deepEqual(LANGUAGE_TARGETS, ['fr', 'es', 'nl', 'it', 'pl']);
  assert.equal(new Set(all.map((c) => c.id)).size, all.length);
  assert.equal(new Set(all.map((c) => c.number)).size, all.length);
  for (const c of all) {
    assert.ok(LANGUAGE_LEVELS.includes(c.level), c.id);
    assert.ok('pwgqosdfhla'.includes(c.kind), c.id);
    assert.ok(c.show && c.answer && c.label, c.id);
  }
});

test('every language has cards of every kind at every level it teaches', () => {
  for (const lang of LANGUAGE_TARGETS) {
    const cards = LANGUAGE_CARDS[lang];
    assert.ok(cards.length >= 300, lang);
    for (const level of LANGUAGE_LEVELS) {
      for (const kind of 'pwgq') assert.ok(cards.some((c) => c.level === level && c.kind === kind), `${lang} ${level} ${kind}`);
    }
  }
});

test('gaps and questions have one right and three different wrong answers', () => {
  for (const c of all.filter((x) => x.kind === 'g' || x.kind === 'q')) {
    assert.equal(c.wrong.length, 3, c.id);
    assert.equal(new Set([c.answer, ...c.wrong]).size, 4, c.id);
  }
  for (const c of all.filter((x) => x.kind === 'g')) {
    assert.equal(c.show.split('___').length, 2, c.id);
  }
});

test('the length of the answers does not give the right one away', () => {
  // Always picking the longest answer, or the second longest and so on (at
  // random among answers of the same length), is right on at most a third
  // of the gaps and of the questions of each language. A guess is right on
  // a quarter.
  const length = (s) => [...s].length;
  for (const lang of LANGUAGE_TARGETS) {
    for (const kind of 'gq') {
      const cards = LANGUAGE_CARDS[lang].filter((c) => c.kind === kind);
      const right = [0, 0, 0, 0];
      for (const c of cards) {
        const longer = c.wrong.filter((w) => length(w) > length(c.answer)).length;
        const same = c.wrong.filter((w) => length(w) === length(c.answer)).length;
        for (let k = longer; k <= longer + same; k++) right[k] += 1 / (same + 1);
      }
      right.forEach((n, k) => {
        assert.ok(n <= cards.length / 3, `${lang} ${kind}: answer ${k + 1} by length is right on ${n.toFixed(1)} of ${cards.length}`);
      });
    }
  }
});

test('pictures and words are not repeated, so the four answers always differ', () => {
  for (const lang of LANGUAGE_TARGETS) {
    for (const kind of 'pwo') {
      const answers = LANGUAGE_CARDS[lang].filter((c) => c.kind === kind).map((c) => c.answer);
      assert.equal(new Set(answers).size, answers.length, `${lang} ${kind}`);
    }
  }
  // Each theme has at least four pictures, for the wrong answers.
  const themes = {};
  for (const c of LANGUAGE_CARDS.fr.filter((x) => x.kind === 'p')) themes[c.theme] = (themes[c.theme] || 0) + 1;
  for (const [theme, n] of Object.entries(themes)) assert.ok(n >= 4, theme);
});

test('every card has its meaning in the other interface languages', () => {
  for (const c of all) {
    for (const lang of I18N.LANGS) {
      if (lang === c.lang) assert.equal(c.meaning[lang], '', `${c.id} ${lang}`);
      else assert.ok(c.meaning[lang], `${c.id} ${lang}`);
    }
  }
  // A question is translated with its answer.
  for (const c of all.filter((x) => x.kind === 'q')) {
    for (const lang of I18N.LANGS) {
      if (lang !== c.lang) assert.ok(c.meaning[lang].includes(' – '), `${c.id} ${lang}`);
    }
  }
});

test('the translations have one row for each card, so none is shifted', () => {
  const { GAP_TRANSLATIONS, QUESTION_TRANSLATIONS, PICTURE_TRANSLATIONS, OPPOSITE_TRANSLATIONS } = globalThis;
  for (const lang of LANGUAGE_TARGETS) {
    const count = (kind) => LANGUAGE_CARDS[lang].filter((c) => c.kind === kind).length;
    assert.equal(GAP_TRANSLATIONS[lang].length, count('g'), `${lang} gaps`);
    assert.equal(QUESTION_TRANSLATIONS[lang].length, count('q'), `${lang} questions`);
    assert.equal(OPPOSITE_TRANSLATIONS.length, count('o'), `${lang} opposites`);
  }
  const concepts = LANGUAGE_CARDS.fr.filter((c) => c.kind === 'p').map((c) => c.id.split('.')[2]);
  assert.deepEqual(Object.keys(PICTURE_TRANSLATIONS).sort(), concepts.slice().sort());
});

test('every language has the JęzykiMax text', () => {
  const cities = ['tilburg', 'paris', 'bocca', 'pisa', 'venezia', 'firenze', 'sevilla', 'amsterdamarms', 'bruxelles', 'buenosaires', 'antwerpen', 'geneve', 'habana',
    'utrecht', 'quebec', 'mexico', 'marseille', 'rotterdam', 'barcelona', 'warszawa', 'krakow', 'wroclaw', 'gdansk'];
  for (const lang of I18N.LANGS) {
    const t = I18N.LANGUAGES[lang];
    assert.equal(t.appName, 'JęzykiMax');
    for (const key of ['newOne', 'choicesAria', 'targetAria', 'listen', 'translate', 'translateHint', 'autoSay', 'autoSayHint', 'voice', 'voiceHint', 'voiceSay', 'voiceListening', 'heardNote', 'voiceDenied', 'voiceNetwork', 'voiceNoMic', 'voiceLanguage', 'groupsTitle', 'groupsHint', 'ruleFastRating', 'shopHint', 'yourTrophies', 'noTrophies']) {
      assert.ok(t[key], `${lang} ${key}`);
    }
    for (const key of ['rightIs', 'typeToGoOn', 'trophyName', 'trophyTitle', 'trophiesAria', 'cityName']) {
      assert.equal(typeof t[key], 'function', `${lang} ${key}`);
    }
    for (const kind of 'pwgqosdfhla') assert.ok(t.prompts[kind], `${lang} prompt ${kind}`);
    for (const key of ['answerAria', 'answerPlaceholder', 'copyPlaceholder', 'lettersAria', 'dontKnow', 'copyToGoOn', 'sayToGoOn', 'nearlyRight', 'mindSpelling',
      'speakCards', 'speakCardsHint', 'writeCards', 'writeCardsHint', 'articleCards', 'articleCardsHint']) {
      assert.ok(t[key], `${lang} ${key}`);
    }
    assert.equal(typeof t.heardOther, 'function', `${lang} heardOther`);
    for (const level of LANGUAGE_LEVELS) assert.ok(t.groups[level], `${lang} ${level}`);
    for (const id of cities) {
      assert.ok(t.trophyName(id), `${lang} ${id}`);
      assert.ok(t.cityName(id), `${lang} city ${id}`);
    }
    assert.ok(I18N.STRINGS[lang].appWhat.languages, `${lang} appWhat`);
    assert.ok(I18N.STRINGS[lang].hold && I18N.STRINGS[lang].goOn && I18N.STRINGS[lang].nextNow, `${lang} hold`);
    assert.ok(I18N.STRINGS[lang].undo && I18N.STRINGS[lang].undoTitle, `${lang} undo`);
  }
});

test('the concepts a gap or question uses are pictures of its language', () => {
  for (const c of all) {
    if (!'gqfh'.includes(c.kind)) assert.equal(c.uses, undefined, c.id);
    else {
      assert.equal(new Set(c.uses).size, c.uses.length, c.id);
      for (const id of c.uses) assert.ok(BY_ID[`${c.lang}.p.${id}`], `${c.id} ${id}`);
    }
  }
});

test('every picture word comes back in at least two gaps or questions', () => {
  for (const lang of LANGUAGE_TARGETS) {
    const cards = LANGUAGE_CARDS[lang];
    for (const p of cards.filter((c) => c.kind === 'p')) {
      const concept = p.id.split('.')[2];
      const users = cards.filter((c) => (c.uses || []).includes(concept));
      assert.ok(users.length >= 2, `${p.id}: ${users.map((c) => c.id).join(' ')}`);
    }
  }
});

// ---------- the cards answered in the child's own words ----------

const recall = (lang, kind) => LANGUAGE_CARDS[lang].filter((c) => c.kind === kind);
const ARTICLES = require('../answer.js').ARTICLES;
// A text as words, without accents or punctuation, and a word without its
// article: whether a definition holds its own answer.
const words = (text) => ' ' + text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
const bare = (lang, word) => ARTICLES[lang].reduce((w, a) => (w.startsWith(a.replace("'", '’')) && a.endsWith("'") ? w.slice(a.length)
  : w.startsWith(a + ' ') ? w.slice(a.length + 1) : w), word);

test('every language has the cards answered in own words, built on its own cards', () => {
  for (const lang of LANGUAGE_TARGETS) {
    for (const kind of 'sdfhla') assert.ok(recall(lang, kind).length >= 30, `${lang} ${kind}`);
    for (const c of LANGUAGE_CARDS[lang].filter((x) => 'sdlah'.includes(x.kind))) {
      assert.ok(BY_ID[c.base], `${c.id} base`);
      assert.equal(BY_ID[c.base].kind, c.kind === 'h' ? 'g' : 'p', c.id);
      assert.equal(BY_ID[c.base].level, c.level, c.id);
    }
  }
});

test('each answer in own words is short and counts as itself, written and said', () => {
  for (const lang of LANGUAGE_TARGETS) {
    for (const c of LANGUAGE_CARDS[lang].filter((x) => 'sdfhl'.includes(x.kind))) {
      assert.ok(c.accept.length >= 1 && c.accept[0] === c.answer, c.id);
      assert.ok(bare(lang, c.answer).split(' ').length <= 3, `${c.id}: ${c.answer}`);
      for (const a of c.accept) assert.ok(said([a], c.accept, { lang }), `${c.id} said ${a}`);
      if ('dhl'.includes(c.kind)) {
        const rules = c.kind === 'h' ? { lang } : { lang, articles: true };
        assert.equal(written(c.answer, c.accept, rules), 'right', c.id);
        assert.equal(written(bare(lang, c.answer), c.accept, rules), 'right', c.id);
      }
    }
  }
});

test('a definition does not hold its answer, nor any other word it accepts', () => {
  for (const lang of LANGUAGE_TARGETS) {
    for (const c of recall(lang, 'd')) {
      for (const a of c.accept) assert.ok(!words(c.show).includes(words(bare(lang, a))), `${c.id}: ${a} in ${c.show}`);
    }
  }
});

test('no two definitions or questions are the same, and each has its translations', () => {
  for (const lang of LANGUAGE_TARGETS) {
    for (const kind of 'df') {
      const shown = recall(lang, kind).map((c) => c.show);
      assert.equal(new Set(shown).size, shown.length, `${lang} ${kind}`);
    }
    for (const c of [...recall(lang, 'd'), ...recall(lang, 'f')]) {
      for (const ui of I18N.LANGS.filter((l) => l !== lang)) assert.ok(/\S – \S/.test(c.meaning[ui]), `${c.id} ${ui}`);
    }
  }
});

test('a gap to write in has a hint and its sentence filled in has the answer', () => {
  for (const lang of LANGUAGE_TARGETS) {
    for (const c of recall(lang, 'h')) {
      assert.ok(c.hint && c.show.includes('___'), c.id);
      assert.equal(c.answer, BY_ID[c.base].answer, c.id);
      // The other forms that count are not the wrong answers of the gap.
      for (const a of c.accept) assert.ok(!BY_ID[c.base].wrong.includes(a), `${c.id} ${a}`);
    }
  }
});

test('an article card asks the article of a noun in the singular, or in Polish its gender', () => {
  const choices = { fr: ['le', 'la'], es: ['el', 'la'], nl: ['de', 'het'], it: ['il', 'lo', 'la'], pl: ['ten', 'ta', 'to'] };
  for (const lang of LANGUAGE_TARGETS) {
    for (const c of recall(lang, 'a')) {
      assert.deepEqual(c.choices, choices[lang], c.id);
      assert.deepEqual([c.answer, ...c.wrong].sort(), choices[lang].slice().sort(), c.id);
      const noun = c.show.replace('___ ', '');
      assert.equal(lang === 'pl' ? noun : c.answer + ' ' + noun, BY_ID[c.base].answer, c.id);
    }
  }
});

test('the right answer of each card with answers to pick, said, is picked', () => {
  for (const lang of LANGUAGE_TARGETS) {
    for (const c of LANGUAGE_CARDS[lang].filter((x) => 'gqoa'.includes(x.kind) && x.wrong)) {
      const options = [...c.wrong, c.answer];
      const context = c.kind === 'g' ? c.show.split('___') : null;
      assert.equal(VOICE.pick([c.answer], options, context, { lang, right: options.length - 1 }), options.length - 1, c.id);
    }
  }
});
