const test = require('node:test');
const assert = require('node:assert/strict');
const { written, said } = require('../answer.js');

const noun = { lang: 'nl', articles: true, typo: true };
const form = { lang: 'nl' };
const dictation = { lang: 'nl', articles: true };

test('a written answer counts with or without its article, whatever the case', () => {
  assert.equal(written('de hond', ['de hond'], noun), 'right');
  assert.equal(written('hond', ['de hond'], noun), 'right');
  assert.equal(written(' Hond. ', ['de hond'], noun), 'right');
  assert.equal(written('een hond', ['de hond'], noun), 'right');
  // The article cards practise the articles: a wrong one counts as none.
  assert.equal(written('het hond', ['de hond'], noun), 'right');
  assert.equal(written('poes', ['de kat', 'de poes'], noun), 'right');
});

test('a written answer wrong only in accents, hyphens or one letter is close', () => {
  assert.equal(written('een', ['één'], noun), 'close');
  assert.equal(written('tshirts', ['T-shirts'], form), 'close');
  assert.equal(written('skien', ['skiën'], dictation), 'close');
  assert.equal(written('sleutl', ['de sleutel'], noun), 'close');
  assert.equal(written('sleutl', ['de sleutel'], dictation), 'wrong');
  // Not in a short word, where one letter makes another word.
  assert.equal(written('kot', ['de kat'], noun), 'wrong');
});

test('the form of a word in a gap has to be the right one', () => {
  assert.equal(written('word', ['word'], form), 'right');
  assert.equal(written('wordt', ['word'], form), 'wrong');
  assert.equal(written('Haalde', ['haalt', 'haalde'], form), 'right');
  assert.equal(written('', ['haalt'], form), 'wrong');
  assert.equal(written('de', ['de hond'], noun), 'wrong');
});

test('an answer said counts in other words, without article, as digits or in two words', () => {
  const nl = { lang: 'nl' };
  assert.ok(said(['de hond'], ['de hond'], nl));
  assert.ok(said(['hond'], ['de hond'], nl));
  assert.ok(said(['dat is een hond'], ['de hond'], nl));
  assert.ok(said(['Hond!'], ['de hond'], nl));
  assert.ok(said(['4'], ['vier', '4'], nl));
  assert.ok(said(['politie agent'], ['de politieagent'], nl));
  assert.ok(said(['in het water'], ['in het water', 'water'], nl));
  assert.ok(said(['water'], ['in het water', 'water'], nl));
  // The likeliest text is not always the one with the answer.
  assert.ok(said(['hand', 'hond'], ['de hond'], nl));
  assert.ok(said(['een'], ['één', '1'], nl));
});

test('another word said is no answer', () => {
  const nl = { lang: 'nl' };
  assert.ok(!said(['de kat'], ['de hond'], nl));
  assert.ok(!said(['hand'], ['de hond'], nl));
  assert.ok(!said(['kater'], ['de kat'], nl));
  assert.ok(!said([''], ['de kat'], nl));
  assert.ok(!said(['de'], ['de kat'], nl));
  // One letter off counts only in a longer word.
  assert.ok(said(['thermometr'], ['de thermometer'], nl));
  assert.ok(!said(['bloed'], ['de bloem'], nl));
});
