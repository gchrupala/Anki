const test = require('node:test');
const assert = require('node:assert/strict');
const SRS = require('../srs.js');
const reference = require('./fsrs_reference.json');

const { AGAIN, HARD, GOOD, EASY, MINUTE } = SRS;
const DAY = 24 * 60 * MINUTE;
const noFuzz = { ...SRS.DEFAULTS, fuzz: false };

// 15 Oct 2026, 10:00 local time.
const NOW = new Date(2026, 9, 15, 10, 0).getTime();

for (const [name, reviews] of Object.entries(reference.sequences)) {
  test(`matches py-fsrs: ${name}`, () => {
    let card = SRS.newCard('7x8');
    for (const r of reviews) {
      const now = NOW + r.minutes * MINUTE;
      card = SRS.answer(card, r.rating, now, noFuzz);
      const at = `${name} at ${r.minutes} min`;
      assert.equal(card.type, r.state, at);
      assert.ok(Math.abs(card.stability - r.stability) < 1e-9, `${at}: stability ${card.stability} vs ${r.stability}`);
      assert.ok(Math.abs(card.difficulty - r.difficulty) < 1e-9, `${at}: difficulty ${card.difficulty} vs ${r.difficulty}`);
      if (card.type === 'review') {
        assert.equal(card.interval, r.dueMinutes / 1440, at);
        assert.equal(SRS.dayIndex(card.due, 4) - SRS.dayIndex(now, 4), card.interval, at);
      } else {
        assert.equal(card.due - now, r.dueMinutes * MINUTE, at);
      }
    }
  });
}

test('retrievability is 90% after `stability` days', () => {
  assert.ok(Math.abs(SRS.retrievability(12, 12) - 0.9) < 1e-12);
  assert.ok(SRS.retrievability(24, 12) < 0.9);
});

test('a higher target retention gives shorter intervals', () => {
  const at90 = SRS.nextInterval(30, noFuzz);
  const at95 = SRS.nextInterval(30, { ...noFuzz, desiredRetention: 0.95 });
  assert.equal(at90, 30);
  assert.ok(at95 < at90);
});

test('fuzz keeps intervals within a few percent', () => {
  const card = { ...SRS.newCard('a'), type: 'review', stability: 40, difficulty: 5, last: NOW - 40 * DAY, due: NOW };
  const plain = SRS.answer(card, GOOD, NOW, noFuzz).interval;
  const low = SRS.answer(card, GOOD, NOW, SRS.DEFAULTS, () => 0).interval;
  const high = SRS.answer(card, GOOD, NOW, SRS.DEFAULTS, () => 0.999).interval;
  assert.ok(low < plain && plain < high, `${low} < ${plain} < ${high}`);
  assert.ok(high - low <= Math.ceil(plain * 0.15), `${low}..${high}`);
});

test('forgetting a review card counts a lapse and starts relearning', () => {
  const card = { ...SRS.newCard('a'), type: 'review', stability: 20, difficulty: 5, last: NOW - 20 * DAY, due: NOW };
  const c = SRS.answer(card, AGAIN, NOW, noFuzz);
  assert.equal(c.type, 'relearning');
  assert.equal(c.lapses, 1);
  assert.equal(c.due - NOW, 10 * MINUTE);
  assert.ok(c.stability < 20);
});

test('answer does not change the card it is given', () => {
  const before = SRS.newCard('a');
  SRS.answer(before, GOOD, NOW);
  assert.equal(before.type, 'new');
  assert.equal(before.stability, null);
});

test('typed answers map to Anki ratings', () => {
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

test('due learning cards come first, but not an avoided card', () => {
  const learning = { ...SRS.newCard('l'), type: 'learning', due: NOW - MINUTE };
  const review = { ...SRS.newCard('r'), type: 'review', due: NOW - DAY };
  const fresh = SRS.newCard('n');
  const q = SRS.buildQueues([learning, review, fresh], NOW, 10);
  assert.equal(SRS.pickNext(q, []).id, 'l');
  assert.notEqual(SRS.pickNext(q, ['l']).id, 'l');
});

test('reviews and new cards are drawn at random', () => {
  const cards = ['a', 'b', 'c', 'd'].map(SRS.newCard);
  const q = SRS.buildQueues(cards, NOW, 10);
  assert.equal(SRS.pickNext(q, [], () => 0).id, 'a');
  assert.equal(SRS.pickNext(q, [], () => 0.99).id, 'd');
  assert.equal(SRS.pickNext(q, ['a'], () => 0).id, 'b');
  assert.equal(SRS.pickNext(q, ['a', 'b', 'c', 'd'], () => 0).id, 'a');
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
  assert.equal(SRS.pickNext(q, []).id, 's');
  assert.equal(SRS.pickNext(q, ['s']).id, 's');
  assert.equal(SRS.pickNext(SRS.buildQueues([later], NOW, 10), []), null);
});
