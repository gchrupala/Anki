const test = require('node:test');
const assert = require('node:assert/strict');
require('../i18n.js');
require('../i18n-astronomy.js');
require('../astronomy.js');

const { ASTRO_ANSWERS, ASTRO_QUESTIONS, ASTRO_GROUPS, ASTRO_TEXT, I18N } = globalThis;

// The answers of each kind, as the app picks wrong answers from them.
const kinds = {};
for (const a of Object.values(ASTRO_ANSWERS)) (kinds[a.kind] = kinds[a.kind] || []).push(a.id);
const isNumber = (answer) => /^-?\d+(\.\d+)?( [a-z-]+)?$/.test(answer);

test('each question has its own number and id', () => {
  assert.ok(ASTRO_QUESTIONS.length >= 120);
  assert.equal(new Set(ASTRO_QUESTIONS.map((q) => q.number)).size, ASTRO_QUESTIONS.length);
  assert.equal(new Set(ASTRO_QUESTIONS.map((q) => q.id)).size, ASTRO_QUESTIONS.length);
});

test('every question is asked in every language, no two the same', () => {
  for (const q of ASTRO_QUESTIONS) {
    assert.ok(q.pic, q.id);
    for (const lang of I18N.LANGS) assert.ok(q.text[lang], `${q.id} ${lang}`);
    // Persian questions write numbers in Persian digits.
    assert.doesNotMatch(q.text.fa, /[0-9]/, q.id);
  }
  for (const lang of I18N.LANGS) {
    const texts = ASTRO_QUESTIONS.map((q) => q.text[lang]);
    assert.equal(new Set(texts).size, texts.length, lang);
  }
});

test('every answer has a text in every language', () => {
  for (const q of ASTRO_QUESTIONS) {
    for (const answer of [q.answer, ...(q.wrong || [])]) {
      assert.ok(ASTRO_ANSWERS[answer] || isNumber(answer), `${q.id} ${answer}`);
      for (const lang of I18N.LANGS) assert.ok(ASTRO_TEXT(answer, lang), `${q.id} ${answer} ${lang}`);
    }
  }
});

test('each question offers four different answers in every language', () => {
  for (const q of ASTRO_QUESTIONS) {
    if (q.wrong) {
      assert.equal(q.wrong.length, 3, q.id);
      for (const lang of I18N.LANGS) {
        const texts = [q.answer, ...q.wrong].map((a) => ASTRO_TEXT(a, lang));
        assert.equal(new Set(texts).size, 4, `${q.id} ${lang}`);
      }
    } else {
      // Wrong answers of the same kind, picked by the app.
      const answer = ASTRO_ANSWERS[q.answer];
      assert.ok(answer, `${q.id} needs wrong answers of its own`);
      assert.ok(!['type', 'other'].includes(answer.kind), `${q.id} needs wrong answers of its own`);
      assert.ok(kinds[answer.kind].length >= 4, `${q.id} ${answer.kind}`);
    }
  }
  for (const [kind, ids] of Object.entries(kinds)) {
    for (const lang of I18N.LANGS) {
      const names = ids.map((id) => ASTRO_TEXT(id, lang));
      assert.equal(new Set(names).size, names.length, `${kind} ${lang}`);
    }
  }
});

test('each topic has enough questions and every question has a topic', () => {
  for (const group of ASTRO_GROUPS) {
    assert.ok(ASTRO_QUESTIONS.filter((q) => q.group === group).length >= 10, group);
  }
  for (const q of ASTRO_QUESTIONS) assert.ok(ASTRO_GROUPS.includes(q.group), q.id);
});

test('every language has the AstronomiaMax text', () => {
  const trophies = ['moon', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'sun'];
  for (const lang of I18N.LANGS) {
    const t = I18N.ASTRONOMY[lang];
    assert.equal(t.appName, 'AstronomiaMax');
    for (const key of ['typeAnswer', 'newOne', 'choicesAria', 'groupsTitle', 'groupsHint', 'ruleSlow', 'ruleFastRating', 'shopHint', 'yourTrophies', 'noTrophies']) {
      assert.ok(t[key], `${lang} ${key}`);
    }
    for (const key of ['rightIs', 'typeToGoOn', 'trophyName', 'trophyTitle', 'trophiesAria', 'bodyKind']) {
      assert.equal(typeof t[key], 'function', `${lang} ${key}`);
    }
    for (const group of ASTRO_GROUPS) assert.ok(t.groups[group], `${lang} ${group}`);
    for (const id of trophies) {
      assert.ok(t.trophyName(id), `${lang} ${id}`);
      assert.ok(t.bodyKind(id), `${lang} ${id}`);
    }
    assert.ok(I18N.STRINGS[lang].appWhat.astronomy, `${lang} appWhat`);
  }
});
