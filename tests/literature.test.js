const test = require('node:test');
const assert = require('node:assert/strict');
require('../i18n.js');
require('../i18n-literature.js');
require('../countries.js');
require('../literature.js');

const { AUTHORS, BOOKS, BOOK_GROUPS, COUNTRIES, I18N } = globalThis;

test('each book has its own number and id', () => {
  assert.ok(BOOKS.length >= 100);
  assert.equal(new Set(BOOKS.map((b) => b.number)).size, BOOKS.length);
  assert.equal(new Set(BOOKS.map((b) => b.id)).size, BOOKS.length);
});

test('every author is known, from a country with a flag, with a name in every language', () => {
  const isos = new Set(COUNTRIES.map((c) => c.iso));
  for (const b of BOOKS) assert.ok(AUTHORS[b.author], `${b.number} ${b.author}`);
  for (const a of Object.values(AUTHORS)) {
    assert.ok(isos.has(a.country), `${a.id} ${a.country}`);
    for (const lang of I18N.LANGS) assert.ok(a.name[lang], `${a.id} ${lang}`);
  }
  for (const lang of I18N.LANGS) {
    const names = Object.values(AUTHORS).map((a) => a.name[lang]);
    assert.equal(new Set(names).size, names.length, lang);
  }
});

test('every book has a title in every language, no two the same', () => {
  for (const b of BOOKS) {
    assert.ok(b.original, b.id);
    assert.match(b.lang, /^[a-z]{2,3}$/, b.id);
    for (const lang of I18N.LANGS) assert.ok(b.title[lang], `${b.id} ${lang}`);
  }
  for (const lang of I18N.LANGS) {
    const titles = BOOKS.map((b) => b.title[lang]);
    assert.equal(new Set(titles).size, titles.length, lang);
  }
});

test('each category has books by enough authors for four answers', () => {
  for (const group of BOOK_GROUPS) {
    const authors = new Set(BOOKS.filter((b) => b.group === group).map((b) => b.author));
    assert.ok(authors.size >= 4, group);
  }
  for (const b of BOOKS) assert.ok(BOOK_GROUPS.includes(b.group), b.id);
});

test('every language has the LiteraturaMax text', () => {
  const prizes = ['newbery', 'carnegie', 'kafka', 'goncourt', 'cervantes', 'shevchenko', 'jalal', 'hugo', 'arabic', 'nike',
    'booker', 'andersen', 'nobel'];
  for (const lang of I18N.LANGS) {
    const t = I18N.LITERATURE[lang];
    assert.equal(t.appName, 'LiteraturaMax');
    for (const key of ['typeAnswer', 'newOne', 'choicesAria', 'groupsTitle', 'groupsHint', 'ruleFastRating', 'shopHint', 'yourTrophies', 'noTrophies', 'international']) {
      assert.ok(t[key], `${lang} ${key}`);
    }
    for (const key of ['rightIs', 'typeToGoOn', 'inLanguage', 'trophyName', 'trophyTitle', 'trophiesAria']) {
      assert.equal(typeof t[key], 'function', `${lang} ${key}`);
    }
    for (const group of BOOK_GROUPS) assert.ok(t.groups[group], `${lang} ${group}`);
    for (const id of prizes) assert.ok(t.trophyName(id), `${lang} ${id}`);
    assert.ok(I18N.STRINGS[lang].appWhat.literature, `${lang} appWhat`);
  }
});
