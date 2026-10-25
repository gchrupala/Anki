const test = require('node:test');
const assert = require('node:assert/strict');
const MOVE = require('../move.js');
require('../i18n.js');
const { I18N } = globalThis;

const connection = { device: 'old1', repo: 'jan/maxapki-data', person: 'zosia', token: 'github_pat_x', sha: 'abc', hash: 'h', at: 1 };

test('a move link gives back the file it was made from, Polish and Persian letters included', async () => {
  const file = {
    maxapki: 1,
    saved: 1761400000000,
    data: { 'max-apps': { app: 'capitals', lang: 'fa' }, note: 'Zażółć gęślą jaźń — پیشرفت ۱۲۳' },
    move: MOVE.newId(),
    backup: connection,
  };
  const link = await MOVE.makeLink(file);
  assert.ok(link.startsWith('https://maxapki.top/#move/'), link);
  const code = link.slice('https://maxapki.top/'.length + MOVE.PREFIX.length);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(JSON.parse(await MOVE.readLink(code)), file);
});

test('a link that is not a move gives nothing', async () => {
  assert.equal(await MOVE.readLink(''), null);
  assert.equal(await MOVE.readLink(null), null);
  assert.equal(await MOVE.readLink('gift/capitals/eiffel/k3f9q'), null);
  assert.equal(await MOVE.readLink('bm90IGd6aXA'), null); // base64url, but not gzip
});

test('a year of practice fits in a link, and too much does not', async () => {
  // About 20,000 answers in the review log: [time, card, rating, ms].
  const log = Array.from({ length: 20000 }, (_, i) => [1761400000000 + i * 61000, 'c' + (i % 3800), 1 + (i % 4), 900 + (i % 5000)]);
  const cards = Object.fromEntries(Array.from({ length: 3800 }, (_, i) => ['c' + i, { reps: 5, stability: 12.5 + i / 7, difficulty: 5.1, due: 1761400000000 + i * 3600000 }]));
  const year = await MOVE.makeLink({ maxapki: 1, saved: 1, data: { s: { cards, log, settings: {} } }, move: 'm', backup: connection });
  assert.ok(year && year.length < MOVE.MAX_LINK, String(year && year.length));

  let noise = '';
  while (noise.length < 3e6) noise += Math.random().toString(36).slice(2);
  assert.equal(await MOVE.makeLink({ maxapki: 1, saved: 1, data: { noise }, move: 'm' }), null);
});

test('the backup connection that came along is kept only where there is none', () => {
  const fresh = { device: 'new1' };
  const here = { device: 'new1', repo: 'ola/data', person: 'ola', token: 'github_pat_y' };
  // A device with no connection of its own carries on as the old one.
  assert.equal(MOVE.mergeBackup(fresh, connection), connection);
  // A device connected already keeps its own connection.
  assert.equal(MOVE.mergeBackup(here, connection), here);
  // A connection without a token, or none, is no connection.
  assert.equal(MOVE.mergeBackup(here, { device: 'old1', repo: 'jan/maxapki-data', person: 'zosia' }), here);
  assert.equal(MOVE.mergeBackup(fresh, { device: 'old1' }), fresh);
  assert.equal(MOVE.mergeBackup(fresh, null), fresh);
});

test('each move has its own id', () => {
  assert.notEqual(MOVE.newId(), MOVE.newId());
});

test('the text of the move is there in every language', () => {
  const keys = ['movedTitle', 'movedText', 'movedOpen', 'movedHint', 'movedTooMuch', 'installTitle', 'installText', 'installButton', 'moveBad'];
  for (const lang of I18N.LANGS) {
    const t = I18N.STRINGS[lang];
    for (const key of keys) assert.ok(t[key], lang + ' ' + key);
    assert.ok(t.movedText('maxapki.top').includes('maxapki.top'), lang);
  }
});
