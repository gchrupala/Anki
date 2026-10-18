const test = require('node:test');
const assert = require('node:assert/strict');
require('../i18n.js');
require('../i18n-languages.js');
require('../languages-translations.js');
require('../languages.js');

const { LANGUAGE_CARDS, LANGUAGE_TARGETS, LANGUAGE_LEVELS, I18N } = globalThis;
const all = Object.values(LANGUAGE_CARDS).flat();

test('each card has its own id and number, a level and a kind', () => {
  assert.deepEqual(LANGUAGE_TARGETS, ['fr', 'es', 'nl', 'it']);
  assert.equal(new Set(all.map((c) => c.id)).size, all.length);
  assert.equal(new Set(all.map((c) => c.number)).size, all.length);
  for (const c of all) {
    assert.ok(LANGUAGE_LEVELS.includes(c.level), c.id);
    assert.ok('pwgqo'.includes(c.kind), c.id);
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

test('every sentence with a gap has its meaning in the other interface languages', () => {
  for (const c of all.filter((x) => x.kind === 'g')) {
    for (const lang of I18N.LANGS) {
      if (lang === c.lang) assert.equal(c.meaning[lang], '', `${c.id} ${lang}`);
      else assert.ok(c.meaning[lang], `${c.id} ${lang}`);
    }
  }
});

test('every language has the JęzykiMax text', () => {
  const cities = ['tilburg', 'paris', 'bocca', 'pisa', 'venezia', 'firenze', 'sevilla', 'amsterdamarms', 'bruxelles', 'buenosaires', 'antwerpen', 'geneve', 'habana',
    'utrecht', 'quebec', 'mexico', 'marseille', 'rotterdam', 'barcelona'];
  for (const lang of I18N.LANGS) {
    const t = I18N.LANGUAGES[lang];
    assert.equal(t.appName, 'JęzykiMax');
    for (const key of ['newOne', 'choicesAria', 'targetAria', 'listen', 'groupsTitle', 'groupsHint', 'ruleFastRating', 'shopHint', 'yourTrophies', 'noTrophies']) {
      assert.ok(t[key], `${lang} ${key}`);
    }
    for (const key of ['rightIs', 'typeToGoOn', 'trophyName', 'trophyTitle', 'trophiesAria', 'cityName']) {
      assert.equal(typeof t[key], 'function', `${lang} ${key}`);
    }
    for (const kind of 'pwgqo') assert.ok(t.prompts[kind], `${lang} prompt ${kind}`);
    for (const level of LANGUAGE_LEVELS) assert.ok(t.groups[level], `${lang} ${level}`);
    for (const id of cities) {
      assert.ok(t.trophyName(id), `${lang} ${id}`);
      assert.ok(t.cityName(id), `${lang} city ${id}`);
    }
    assert.ok(I18N.STRINGS[lang].appWhat.languages, `${lang} appWhat`);
    assert.ok(I18N.STRINGS[lang].hold && I18N.STRINGS[lang].goOn, `${lang} hold`);
  }
});
