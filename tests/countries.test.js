const test = require('node:test');
const assert = require('node:assert/strict');
require('../i18n.js');
require('../i18n-capitals.js');
require('../countries.js');

const { COUNTRIES, CONTINENTS, I18N } = globalThis;

test('193 UN members and the Vatican, each once', () => {
  assert.equal(COUNTRIES.length, 194);
  assert.equal(new Set(COUNTRIES.map((c) => c.iso)).size, 194);
  for (const c of COUNTRIES) assert.match(c.iso, /^[A-Z]{2}$/);
});

test('every country and capital has a name in every language', () => {
  for (const c of COUNTRIES) {
    for (const lang of I18N.LANGS) {
      assert.ok(c.name[lang], `${c.iso} name ${lang}`);
      assert.ok(c.capital[lang], `${c.iso} capital ${lang}`);
    }
  }
});

test('each continent has enough countries for three wrong answers', () => {
  for (const continent of CONTINENTS) {
    assert.ok(COUNTRIES.filter((c) => c.continent === continent).length >= 4, continent);
  }
  for (const c of COUNTRIES) assert.ok(CONTINENTS.includes(c.continent), c.iso);
});

test('no two capitals of a continent share a name, so one answer is right', () => {
  for (const lang of I18N.LANGS) {
    for (const continent of CONTINENTS) {
      const names = COUNTRIES.filter((c) => c.continent === continent).map((c) => c.capital[lang]);
      assert.equal(new Set(names).size, names.length, `${continent} ${lang}`);
    }
  }
});

test('every language has the StoliceMax text', () => {
  const souvenirs = ['palace', 'eiffel', 'amsterdam', 'bigben', 'riesenrad', 'bear', 'brandenburg', 'tram', 'atomium', 'colosseum',
    'parthenon', 'whitehouse', 'torii', 'azadi', 'petronas', 'lotus', 'brasilia', 'mosque', 'pyramids', 'forbidden'];
  for (const lang of I18N.LANGS) {
    const t = I18N.CAPITALS[lang];
    assert.equal(t.appName, 'StoliceMax');
    for (const key of ['typeAnswer', 'newOne', 'choicesAria', 'groupsTitle', 'groupsHint', 'ruleFastRating', 'shopHint', 'yourTrophies', 'noTrophies']) {
      assert.ok(t[key], `${lang} ${key}`);
    }
    for (const key of ['rightIs', 'typeToGoOn', 'trophyName', 'trophyTitle', 'trophiesAria']) {
      assert.equal(typeof t[key], 'function', `${lang} ${key}`);
    }
    for (const continent of CONTINENTS) assert.ok(t.groups[continent], `${lang} ${continent}`);
    for (const id of souvenirs) assert.ok(t.trophyName(id), `${lang} ${id}`);
  }
});

test('every language has the text of the app menu', () => {
  for (const lang of I18N.LANGS) {
    const t = I18N.STRINGS[lang];
    for (const key of ['appsAria', 'appsIntro', 'appsHint', 'appDone', 'appOpen']) assert.ok(t[key], `${lang} ${key}`);
    assert.ok(t.appWhat.times && t.appWhat.capitals && t.appWhat.chemistry, `${lang} appWhat`);
    assert.ok(t.appNew, `${lang} appNew`);
    assert.equal(typeof t.goTo, 'function', `${lang} goTo`);
    for (const key of ['shareAria', 'shareText', 'shareCopied']) assert.ok(t[key], `${lang} ${key}`);
    assert.equal(typeof t.shareLink, 'function', `${lang} shareLink`);
  }
});

test('every language has the text for moving progress', () => {
  for (const lang of I18N.LANGS) {
    const t = I18N.STRINGS[lang];
    for (const key of ['moveHint', 'saveProgress', 'loadProgress', 'progressNone', 'progressBad',
      'progressSettings', 'progressNewer', 'replaceProgress', 'cancel', 'progressFailed']) assert.ok(t[key], `${lang} ${key}`);
    assert.ok(t.progressDownloaded('MaxApki.json').includes('MaxApki.json'), `${lang} progressDownloaded`);
    const from = t.progressFrom('DATE', 'APPS');
    assert.ok(from.includes('DATE') && from.includes('APPS'), `${lang} progressFrom`);
  }
});
