const test = require('node:test');
const assert = require('node:assert/strict');
require('../i18n.js');
require('../i18n-chemistry.js');
require('../chemistry.js');

const { COMPOUNDS, COMPOUND_GROUPS, I18N } = globalThis;

test('each element and compound has its own formula and number', () => {
  assert.ok(COMPOUNDS.length >= 70);
  assert.ok(COMPOUNDS.filter((c) => c.group === 'EL').length >= 20);
  assert.equal(new Set(COMPOUNDS.map((c) => c.formula)).size, COMPOUNDS.length);
  assert.equal(new Set(COMPOUNDS.map((c) => c.number)).size, COMPOUNDS.length);
});

test('formulas are made of element symbols, numbers and brackets', () => {
  for (const c of COMPOUNDS) {
    assert.match(c.formula, /^([A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d+)+$/, c.formula);
  }
});

test('every element and compound has a name in every language, no two the same', () => {
  for (const c of COMPOUNDS) {
    for (const lang of I18N.LANGS) {
      assert.ok(c.name[lang], `${c.formula} name ${lang}`);
      assert.equal(typeof c.nick[lang], 'string', `${c.formula} everyday name ${lang}`);
    }
  }
  for (const lang of I18N.LANGS) {
    const names = COMPOUNDS.map((c) => c.name[lang]);
    assert.equal(new Set(names).size, names.length, lang);
  }
});

test('each group has enough compounds and every compound has a group', () => {
  for (const group of COMPOUND_GROUPS) {
    assert.ok(COMPOUNDS.filter((c) => c.group === group).length >= 4, group);
  }
  for (const c of COMPOUNDS) assert.ok(COMPOUND_GROUPS.includes(c.group), c.formula);
});

test('every language has the ChemiaMax text', () => {
  const glassware = ['tubeblue', 'tubegreen', 'conical', 'retortpurple', 'roundflask', 'rack', 'beaker', 'retortflame',
    'volumetric', 'separatory', 'retortgold', 'rainbow'];
  for (const lang of I18N.LANGS) {
    const t = I18N.CHEMISTRY[lang];
    assert.equal(t.appName, 'ChemiaMax');
    for (const key of ['typeAnswer', 'newOne', 'choicesAria', 'groupsTitle', 'groupsHint', 'ruleFastRating', 'shopHint', 'yourTrophies', 'noTrophies']) {
      assert.ok(t[key], `${lang} ${key}`);
    }
    for (const key of ['rightIs', 'typeToGoOn', 'trophyName', 'trophyTitle', 'trophiesAria']) {
      assert.equal(typeof t[key], 'function', `${lang} ${key}`);
    }
    for (const group of COMPOUND_GROUPS) assert.ok(t.groups[group], `${lang} ${group}`);
    for (const id of glassware) assert.ok(t.trophyName(id), `${lang} ${id}`);
  }
});
