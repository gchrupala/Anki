const test = require('node:test');
const assert = require('node:assert/strict');
const SRS = require('../srs.js');

const { AGAIN, HARD, GOOD, EASY, MINUTE, DEFAULTS: cfg } = SRS;
const DAY = 24 * 60 * MINUTE;

// 15 Oct 2026, 10:00 local time.
const NOW = new Date(2026, 9, 15, 10, 0).getTime();

function reviewCard(interval, ease, due = NOW) {
  return { ...SRS.newCard('7x8'), type: 'review', interval, ease, due };
}

test('a new card goes through the learning steps and graduates to one day', () => {
  let c = SRS.answer(SRS.newCard('7x8'), GOOD, NOW);
  assert.equal(c.type, 'learning');
  assert.equal(c.due - NOW, 10 * MINUTE);
  assert.equal(c.ease, 2.5);

  c = SRS.answer(c, GOOD, NOW + 10 * MINUTE);
  assert.equal(c.type, 'review');
  assert.equal(c.interval, 1);
  assert.equal(c.due, new Date(2026, 9, 16, 4).getTime());
});

test('Again restarts the steps, Hard on the first step averages the first two', () => {
  const again = SRS.answer(SRS.newCard('a'), AGAIN, NOW);
  assert.equal(again.due - NOW, 1 * MINUTE);
  const hard = SRS.answer(SRS.newCard('a'), HARD, NOW);
  assert.equal(hard.due - NOW, 5.5 * MINUTE);
});

test('Easy on a new card graduates straight to the easy interval', () => {
  const c = SRS.answer(SRS.newCard('a'), EASY, NOW);
  assert.equal(c.type, 'review');
  assert.equal(c.interval, 4);
});

test('review intervals grow by the ease factor', () => {
  let c = SRS.answer(reviewCard(1, 2.5), GOOD, NOW);
  assert.equal(c.interval, 3);
  c = SRS.answer(reviewCard(3, 2.5), GOOD, NOW);
  assert.equal(c.interval, 8);
  assert.equal(c.ease, 2.5);
});

test('Hard and Easy change the ease factor', () => {
  const hard = SRS.answer(reviewCard(10, 2.5), HARD, NOW);
  assert.equal(hard.interval, 12);
  assert.equal(hard.ease, 2.35);
  const easy = SRS.answer(reviewCard(10, 2.5), EASY, NOW);
  assert.equal(easy.interval, 33);
  assert.equal(easy.ease, 2.65);
});

test('a late review gets credit for the extra days', () => {
  const c = SRS.answer(reviewCard(10, 2.5, NOW - 4 * DAY), GOOD, NOW);
  assert.equal(c.interval, 30);
});

test('forgetting a review card lowers ease and starts relearning', () => {
  let c = SRS.answer(reviewCard(20, 2.5), AGAIN, NOW);
  assert.equal(c.type, 'relearning');
  assert.equal(c.lapses, 1);
  assert.equal(c.ease, 2.3);
  assert.equal(c.interval, 1);
  assert.equal(c.due - NOW, 10 * MINUTE);

  c = SRS.answer(c, GOOD, NOW + 10 * MINUTE);
  assert.equal(c.type, 'review');
  assert.equal(c.interval, 1);
});

test('ease never drops below the minimum', () => {
  const c = SRS.answer(reviewCard(5, 1.35), AGAIN, NOW);
  assert.equal(c.ease, 1.3);
});

test('answer does not change the card it is given', () => {
  const before = SRS.newCard('a');
  SRS.answer(before, GOOD, NOW);
  assert.equal(before.type, 'new');
});

test('typed answers map to Anki buttons', () => {
  assert.equal(SRS.autoGrade(false, 2, 'review'), AGAIN);
  assert.equal(SRS.autoGrade(true, 15, 'review'), HARD);
  assert.equal(SRS.autoGrade(true, 6, 'review'), GOOD);
  assert.equal(SRS.autoGrade(true, 2, 'review'), EASY);
  assert.equal(SRS.autoGrade(true, 2, 'new'), EASY);
  assert.equal(SRS.autoGrade(true, 2, 'learning'), GOOD);
});

test('the day starts at 4 am', () => {
  const late = new Date(2026, 9, 15, 3, 59).getTime();
  const early = new Date(2026, 9, 15, 4, 0).getTime();
  assert.equal(SRS.dayIndex(early, 4) - SRS.dayIndex(late, 4), 1);
  assert.equal(SRS.dayStart(SRS.dayIndex(NOW, 4), 4), early);
});

test('due learning cards come first, but not the card just answered', () => {
  const learning = { ...SRS.newCard('l'), type: 'learning', due: NOW - MINUTE };
  const review = reviewCard(3, 2.5, NOW - DAY);
  const fresh = SRS.newCard('n');
  const q = SRS.buildQueues([learning, review, fresh], NOW, 10);
  assert.equal(SRS.pickNext(q, null).id, 'l');
  assert.notEqual(SRS.pickNext(q, 'l').id, 'l');
});

test('the daily limit caps new cards', () => {
  const cards = ['a', 'b', 'c'].map(SRS.newCard);
  assert.deepEqual(SRS.buildQueues(cards, NOW, 2).fresh.map((c) => c.id), ['a', 'b']);
  assert.equal(SRS.buildQueues(cards, NOW, 0).fresh.length, 0);
});

test('learning cards are shown early when nothing else is left', () => {
  const soon = { ...SRS.newCard('s'), type: 'learning', due: NOW + 5 * MINUTE };
  const later = { ...SRS.newCard('t'), type: 'learning', due: NOW + 30 * MINUTE };
  const q = SRS.buildQueues([soon, later], NOW, 10);
  assert.equal(SRS.pickNext(q, null).id, 's');
  assert.equal(SRS.pickNext(q, 's').id, 's');
  const none = SRS.buildQueues([later], NOW, 10);
  assert.equal(SRS.pickNext(none, null), null);
});
