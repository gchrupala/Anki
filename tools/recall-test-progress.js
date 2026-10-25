/*
 * Makes a progress file for trying the Dutch cards of JęzykiMax answered in
 * the child's own words (languages-recall.js) without first learning the
 * cards they are built on. In the file, every Dutch card with answers to
 * pick from has been learned and comes back in one to two months, so the
 * new cards come at once, 20 a day. Load it in the settings ("Wczytaj
 * postępy z pliku"). It replaces the JęzykiMax progress of that browser,
 * so use a browser where there is nothing to keep.
 *
 *   node tools/recall-test-progress.js > JezykiMax-nl-test.json
 */
global.window = global;
const SRS = require('../srs.js');
require('../languages-translations.js');
require('../languages-recall.js');
require('../languages.js');

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const cards = {};
for (const c of global.LANGUAGE_CARDS.nl) {
  if (!'pwgqo'.includes(c.kind)) continue;
  const interval = 30 + Math.floor(Math.random() * 30);
  cards[c.id] = {
    ...SRS.newCard(c.id),
    type: 'review',
    due: now + interval * DAY,
    last: now - 3 * DAY,
    stability: interval,
    difficulty: 5,
    interval,
    reps: 3,
    reward: 2, // the coins of a card learned and known a week were paid
    seed: Math.random(),
  };
}
const settings = {
  nextAfter: 5, target: 'nl', levels: ['A1', 'A2', 'B1', 'B2'], newPerDay: 20, retention: 0.9, answerTime: 30,
  translate: true, autoSay: false, speak: true, write: true, articles: true, layout: 2,
};
const languages = { cards, settings, daily: null, coins: 0, spent: 0, trophies: [], clockOffset: 0, log: [] };
const prefs = { app: 'languages', lang: 'pl', appsSeen: 8, opened: ['times', 'capitals', 'languages'], gifts: [], given: [] };
process.stdout.write(JSON.stringify({ maxapki: 1, saved: now, data: { 'max-apps': prefs, 'languages-cards-v1': languages } }) + '\n');
