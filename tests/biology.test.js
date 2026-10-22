const test = require('node:test');
const assert = require('node:assert/strict');
require('../i18n.js');
require('../i18n-biology.js');
require('../biology.js');

const { BIO_ANSWERS, BIO_QUESTIONS, BIO_GROUPS, BIO_TEXT, I18N } = globalThis;

// The answers of each kind, as the app picks wrong answers from them.
const kinds = {};
for (const a of Object.values(BIO_ANSWERS)) (kinds[a.kind] = kinds[a.kind] || []).push(a.id);
const isNumber = (answer) => /^\d+(\.\d+)?( [a-z-]+)?$/.test(answer);

// Emoji added after Emoji 13 (2020), which some tablets show as an empty
// box: the ranges of Emoji 14 and 15, and the newer sequences that join a
// bird, mushroom or lemon with a colour (🐦‍⬛, 🍄‍🟫, 🍋‍🟩) or a fire (🐦‍🔥).
const NEWER = [[0x1fa75, 0x1fa77], [0x1fa7b, 0x1fa7c], [0x1fa87, 0x1fa88], [0x1faa9, 0x1faaf], [0x1fab7, 0x1fabf],
  [0x1fac3, 0x1fac5], [0x1face, 0x1facf], [0x1fad7, 0x1fadb], [0x1fae0, 0x1fae8], [0x1faf0, 0x1faf8]];
const newerEmoji = (pic) => /‍(⬛|\u{1f525}|\u{1f7eb}|\u{1f7e9})/u.test(pic) ||
  [...pic].some((ch) => NEWER.some(([lo, hi]) => ch.codePointAt(0) >= lo && ch.codePointAt(0) <= hi));

test('each question has its own number and id', () => {
  assert.ok(BIO_QUESTIONS.length >= 140);
  assert.equal(new Set(BIO_QUESTIONS.map((q) => q.number)).size, BIO_QUESTIONS.length);
  assert.equal(new Set(BIO_QUESTIONS.map((q) => q.id)).size, BIO_QUESTIONS.length);
  for (const q of BIO_QUESTIONS) assert.equal(q.id, 'o' + q.number);
});

test('every question has a picture and is asked in every language, no two the same', () => {
  for (const q of BIO_QUESTIONS) {
    assert.ok(q.pic, q.id);
    assert.ok(!newerEmoji(q.pic), `${q.id} ${q.pic}`);
    for (const lang of I18N.LANGS) assert.ok(q.text[lang], `${q.id} ${lang}`);
    // Persian questions write numbers in Persian digits.
    assert.doesNotMatch(q.text.fa, /[0-9]/, q.id);
    // A Latin name is a genus and a species, or a hybrid such as Fragaria × ananassa.
    if (q.latin) assert.match(q.latin, /^[A-Z][a-z]+ (× )?[a-z-]+$/, q.id);
  }
  for (const lang of I18N.LANGS) {
    const texts = BIO_QUESTIONS.map((q) => q.text[lang]);
    assert.equal(new Set(texts).size, texts.length, lang);
  }
});

test('every answer has a text in every language', () => {
  for (const q of BIO_QUESTIONS) {
    for (const answer of [q.answer, ...(q.wrong || [])]) {
      assert.ok(BIO_ANSWERS[answer] || isNumber(answer), `${q.id} ${answer}`);
      for (const lang of I18N.LANGS) assert.ok(BIO_TEXT(answer, lang), `${q.id} ${answer} ${lang}`);
    }
  }
  // Families have their Latin name: -idae for animals, -aceae for plants.
  for (const id of kinds.family) assert.match(BIO_ANSWERS[id].latin, /^[A-Z][a-z]+(idae|aceae)$/, id);
});

test('each question offers four different answers in every language', () => {
  for (const q of BIO_QUESTIONS) {
    if (q.wrong) {
      assert.equal(q.wrong.length, 3, q.id);
      for (const lang of I18N.LANGS) {
        const texts = [q.answer, ...q.wrong].map((a) => BIO_TEXT(a, lang));
        assert.equal(new Set(texts).size, 4, `${q.id} ${lang}`);
      }
    } else {
      // Wrong answers of the same kind, picked by the app.
      const answer = BIO_ANSWERS[q.answer];
      assert.ok(answer, `${q.id} needs wrong answers of its own`);
      assert.ok(!['type', 'family'].includes(answer.kind), `${q.id} needs wrong answers of its own`);
      assert.ok(kinds[answer.kind].length >= 4, `${q.id} ${answer.kind}`);
    }
  }
  for (const [kind, ids] of Object.entries(kinds)) {
    if (kind === 'type') continue; // only offered with the wrong answers written for them
    for (const lang of I18N.LANGS) {
      const names = ids.map((id) => BIO_TEXT(id, lang));
      assert.equal(new Set(names).size, names.length, `${kind} ${lang}`);
    }
  }
});

test('each topic has enough questions and every question has a topic', () => {
  for (const group of BIO_GROUPS) {
    assert.ok(BIO_QUESTIONS.filter((q) => q.group === group).length >= 10, group);
  }
  for (const q of BIO_QUESTIONS) assert.ok(BIO_GROUPS.includes(q.group), q.id);
});

test('every language has the BiologiaMax text', () => {
  const specimens = ['jayfeather', 'fishbone', 'sharktooth', 'nautilus', 'peacock', 'antler', 'amber', 'ammonite',
    'trilobite', 'dinobone', 'smilodon', 'tusk', 'rextooth', 'megalodon', 'rexskull'];
  for (const lang of I18N.LANGS) {
    const t = I18N.BIOLOGY[lang];
    assert.equal(t.appName, 'BiologiaMax');
    for (const key of ['typeAnswer', 'newOne', 'choicesAria', 'groupsTitle', 'groupsHint', 'ruleSlow', 'ruleFast', 'ruleFastRating', 'shopHint', 'yourTrophies', 'noTrophies']) {
      assert.ok(t[key], `${lang} ${key}`);
    }
    for (const key of ['rightIs', 'typeToGoOn', 'trophyName', 'trophyTitle', 'trophiesAria', 'specimenFrom']) {
      assert.equal(typeof t[key], 'function', `${lang} ${key}`);
    }
    for (const group of BIO_GROUPS) assert.ok(t.groups[group], `${lang} ${group}`);
    for (const id of specimens) {
      assert.ok(t.trophyName(id), `${lang} ${id}`);
      assert.ok(t.specimenFrom(id), `${lang} ${id}`);
    }
    if (lang === 'fa') for (const id of specimens) assert.doesNotMatch(t.specimenFrom(id), /[0-9]/, id);
    assert.ok(I18N.STRINGS[lang].appWhat.biology, `${lang} appWhat`);
  }
});
