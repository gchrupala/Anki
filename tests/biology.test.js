const test = require('node:test');
const assert = require('node:assert/strict');
require('../i18n.js');
require('../i18n-biology.js');
require('../biology.js');

const { BIO_FAMILIES, BIO_ORGANISMS, BIO_GROUPS, BIO_KINSHIP, I18N } = globalThis;

// Emoji added after Emoji 13 (2020), which some tablets show as an empty
// box: the ranges of Emoji 14 and 15, and the newer sequences that join a
// bird, mushroom or lemon with a colour (🐦‍⬛, 🍄‍🟫, 🍋‍🟩) or a fire (🐦‍🔥).
const NEWER = [[0x1fa75, 0x1fa77], [0x1fa7b, 0x1fa7c], [0x1fa87, 0x1fa88], [0x1faa9, 0x1faaf], [0x1fab7, 0x1fabf],
  [0x1fac3, 0x1fac5], [0x1face, 0x1facf], [0x1fad7, 0x1fadb], [0x1fae0, 0x1fae8], [0x1faf0, 0x1faf8]];
const newerEmoji = (pic) => /‍(⬛|\u{1f525}|\u{1f7eb}|\u{1f7e9})/u.test(pic) ||
  [...pic].some((ch) => NEWER.some(([lo, hi]) => ch.codePointAt(0) >= lo && ch.codePointAt(0) <= hi));

test('each organism has its own number and id', () => {
  assert.ok(BIO_ORGANISMS.length >= 200);
  assert.equal(new Set(BIO_ORGANISMS.map((o) => o.number)).size, BIO_ORGANISMS.length);
  assert.equal(new Set(BIO_ORGANISMS.map((o) => o.id)).size, BIO_ORGANISMS.length);
});

test('every organism has a picture, a Latin name and a name in every language, no two alike', () => {
  for (const o of BIO_ORGANISMS) {
    assert.ok(o.pic, o.id);
    assert.ok(!newerEmoji(o.pic), `${o.id} ${o.pic}`);
    // A genus and a species, or a hybrid such as Citrus × limon.
    assert.match(o.latin, /^[A-Z][a-z]+ (× )?[a-z-]+$/, o.id);
    for (const lang of I18N.LANGS) assert.ok(o.name[lang], `${o.id} ${lang}`);
    assert.doesNotMatch(o.name.fa, /[A-Za-z0-9]/, o.id);
  }
  for (const lang of I18N.LANGS) {
    const names = BIO_ORGANISMS.map((o) => o.name[lang]);
    assert.equal(new Set(names).size, names.length, lang);
  }
});

test('every family has a name in every language, no two alike, and organisms of its own', () => {
  const used = new Set(BIO_ORGANISMS.map((o) => o.family));
  for (const f of Object.values(BIO_FAMILIES)) {
    // Animal families end in -idae, those of plants and fungi in -aceae.
    assert.match(f.latin, f.place[0] === 'A' ? /^[A-Z][a-z]+idae$/ : /^[A-Z][a-z]+aceae$/, f.id);
    assert.ok(['A', 'P', 'F'].includes(f.place[0]), f.id);
    for (const lang of I18N.LANGS) assert.ok(f.name[lang], `${f.id} ${lang}`);
    assert.doesNotMatch(f.name.fa, /[A-Za-z]/, f.id);
    assert.ok(used.has(f.id), `${f.id} has no organisms`);
  }
  for (const o of BIO_ORGANISMS) assert.ok(BIO_FAMILIES[o.family], `${o.id} ${o.family}`);
  for (const lang of I18N.LANGS) {
    const names = Object.values(BIO_FAMILIES).map((f) => f.name[lang]);
    assert.equal(new Set(names).size, names.length, lang);
  }
});

test('the wrong answers come from the same kingdom', () => {
  // The app offers the family most closely related to the right one and
  // two of the next five: all six must be animals for an animal, plants
  // for a plant and fungi for a fungus.
  const ids = Object.keys(BIO_FAMILIES);
  for (const id of ids) {
    const closest = ids.filter((f) => f !== id).sort((x, y) => BIO_KINSHIP(id, y) - BIO_KINSHIP(id, x)).slice(0, 6);
    for (const f of closest) assert.ok(BIO_KINSHIP(id, f) >= 1, `${id} ${f}`);
  }
  assert.equal(BIO_KINSHIP('canidae', 'felidae'), 4);
  assert.equal(BIO_KINSHIP('canidae', 'rosaceae'), 0);
});

test('each group has enough organisms and every organism has a group', () => {
  for (const group of BIO_GROUPS) {
    assert.ok(BIO_ORGANISMS.filter((o) => o.group === group).length >= 10, group);
  }
  for (const o of BIO_ORGANISMS) assert.ok(BIO_GROUPS.includes(o.group), o.id);
});

test('every language has the BiologiaMax text', () => {
  const specimens = ['jayfeather', 'fishbone', 'sharktooth', 'nautilus', 'peacock', 'antler', 'amber', 'ammonite',
    'trilobite', 'dinobone', 'smilodon', 'tusk', 'rextooth', 'megalodon', 'rexskull'];
  for (const lang of I18N.LANGS) {
    const t = I18N.BIOLOGY[lang];
    assert.equal(t.appName, 'BiologiaMax');
    for (const key of ['typeAnswer', 'newOne', 'choicesAria', 'groupsTitle', 'groupsHint', 'ruleFast', 'ruleFastRating', 'shopHint', 'yourTrophies', 'noTrophies']) {
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
