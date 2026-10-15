/*
 * Spaced-repetition scheduler using FSRS-6, the algorithm Anki offers as an
 * alternative to SM-2. It follows the reference implementation (py-fsrs)
 * with its default parameters, and Anki's handling of days and queues.
 *
 * FSRS gives each card two numbers:
 *   stability  -> days until the chance of remembering drops to 90%
 *   difficulty -> 1 (easy) to 10 (hard); controls how fast stability grows
 * The next review is set for when the chance of remembering is expected to
 * fall to the desired retention.
 *
 * Cards move through four states:
 *   new        -> never shown
 *   learning   -> short steps in minutes on the first day
 *   review     -> intervals in days
 *   relearning -> a review card that was forgotten; short steps again
 *
 * Works in the browser (window.SRS) and in Node (require('./srs.js')).
 */
(function (root) {
  'use strict';

  const MINUTE = 60 * 1000;

  const AGAIN = 1;
  const HARD = 2;
  const GOOD = 3;
  const EASY = 4;

  // FSRS-6 default parameters, fitted by the FSRS authors on many Anki users.
  const DEFAULT_WEIGHTS = Object.freeze([
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796,
    1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
  ]);

  const DEFAULTS = Object.freeze({
    w: DEFAULT_WEIGHTS,
    desiredRetention: 0.9,
    learningSteps: [1, 10], // minutes
    relearningSteps: [10], // minutes
    maxInterval: 36500, // days
    fuzz: true, // spread review days a little, as Anki does
    learnAheadMinutes: 20,
    rolloverHour: 4, // a new day starts at 4 am, as in Anki
    fastSeconds: 4, // correct within this time counts as Easy
    slowSeconds: 10, // correct but slower than this counts as Hard
  });

  const MIN_STABILITY = 0.001;

  // ---------- days ----------

  // Number of the local calendar day, where each day starts at rolloverHour.
  function dayIndex(ts, rolloverHour) {
    const d = new Date(ts - rolloverHour * 60 * MINUTE);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / (24 * 60 * MINUTE));
  }

  // Timestamp at which day number `index` starts.
  function dayStart(index, rolloverHour) {
    const d = new Date(index * 24 * 60 * MINUTE);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), rolloverHour).getTime();
  }

  // ---------- FSRS memory model ----------

  const clampDifficulty = (d) => Math.min(10, Math.max(1, d));
  const clampStability = (s) => Math.max(MIN_STABILITY, s);
  const decay = (w) => -w[20];
  const factor = (w) => Math.pow(0.9, 1 / decay(w)) - 1;

  // Chance of remembering a card `days` after the last review.
  function retrievability(days, stability, w = DEFAULT_WEIGHTS) {
    return Math.pow(1 + (factor(w) * days) / stability, decay(w));
  }

  function initialStability(grade, w) {
    return clampStability(w[grade - 1]);
  }

  function initialDifficulty(grade, w) {
    return w[4] - Math.exp(w[5] * (grade - 1)) + 1;
  }

  // Again and Hard raise difficulty, Easy lowers it; the change shrinks as
  // difficulty nears 10, and drifts slightly back towards the default.
  function nextDifficulty(d, grade, w) {
    const delta = -w[6] * (grade - 3);
    const damped = d + ((10 - d) * delta) / 9;
    return clampDifficulty(w[7] * initialDifficulty(EASY, w) + (1 - w[7]) * damped);
  }

  // Stability after a second review on the same day.
  function shortTermStability(s, grade, w) {
    let increase = Math.exp(w[17] * (grade - 3 + w[18])) * Math.pow(s, -w[19]);
    if (grade >= HARD) increase = Math.max(increase, 1);
    return clampStability(s * increase);
  }

  // Stability after remembering: grows more for easier cards, for lower
  // stability, and when the card was closer to being forgotten.
  function recallStability(d, s, r, grade, w) {
    const hardPenalty = grade === HARD ? w[15] : 1;
    const easyBonus = grade === EASY ? w[16] : 1;
    return (
      s *
      (1 +
        Math.exp(w[8]) *
          (11 - d) *
          Math.pow(s, -w[9]) *
          (Math.exp((1 - r) * w[10]) - 1) *
          hardPenalty *
          easyBonus)
    );
  }

  // Stability after forgetting.
  function forgetStability(d, s, r, w) {
    const longTerm = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]);
    const shortTerm = s / Math.exp(w[17] * w[18]);
    return Math.min(longTerm, shortTerm);
  }

  // Days until the chance of remembering falls to the desired retention.
  function nextInterval(stability, cfg = DEFAULTS) {
    const w = cfg.w;
    const days = (stability / factor(w)) * (Math.pow(cfg.desiredRetention, 1 / decay(w)) - 1);
    return Math.min(cfg.maxInterval, Math.max(1, Math.round(days)));
  }

  // Anki's interval fuzz: a random shift of a few percent, so cards learned
  // together don't keep coming back together.
  const FUZZ_RANGES = [
    { start: 2.5, end: 7, factor: 0.15 },
    { start: 7, end: 20, factor: 0.1 },
    { start: 20, end: Infinity, factor: 0.05 },
  ];

  function fuzzInterval(days, cfg, rng) {
    if (days < 2.5) return days;
    let delta = 1;
    for (const r of FUZZ_RANGES) delta += r.factor * Math.max(Math.min(days, r.end) - r.start, 0);
    const max = Math.min(Math.round(days + delta), cfg.maxInterval);
    const min = Math.min(Math.max(2, Math.round(days - delta)), max);
    return Math.min(Math.round(rng() * (max - min + 1) + min), cfg.maxInterval);
  }

  // ---------- scheduling ----------

  function newCard(id) {
    return {
      id,
      type: 'new',
      step: 0,
      due: 0,
      last: null,
      stability: null,
      difficulty: null,
      interval: 0,
      reps: 0,
      lapses: 0,
    };
  }

  function isLearning(card) {
    return card.type === 'learning' || card.type === 'relearning';
  }

  function updateMemory(card, grade, now, cfg) {
    const w = cfg.w;
    if (card.stability == null) {
      card.stability = initialStability(grade, w);
      card.difficulty = clampDifficulty(initialDifficulty(grade, w));
      return;
    }
    // Elapsed time is counted in calendar days, as Anki does (py-fsrs counts
    // full 24-hour periods instead).
    const days = Math.max(0, dayIndex(now, cfg.rolloverHour) - dayIndex(card.last, cfg.rolloverHour));
    if (days < 1) {
      card.stability = shortTermStability(card.stability, grade, w);
    } else {
      const r = retrievability(days, card.stability, w);
      card.stability = clampStability(
        grade === AGAIN
          ? forgetStability(card.difficulty, card.stability, r, w)
          : recallStability(card.difficulty, card.stability, r, grade, w)
      );
    }
    card.difficulty = nextDifficulty(card.difficulty, grade, w);
  }

  function scheduleStep(card, minutes, now) {
    card.due = now + Math.round(minutes * MINUTE);
    return card;
  }

  function scheduleReview(card, now, cfg, rng) {
    let days = nextInterval(card.stability, cfg);
    if (cfg.fuzz) days = fuzzInterval(days, cfg, rng);
    card.type = 'review';
    card.step = 0;
    card.interval = days;
    card.due = dayStart(dayIndex(now, cfg.rolloverHour) + days, cfg.rolloverHour);
    return card;
  }

  // Delay for Hard in (re)learning. On the first step it is the average of
  // the first two steps, or 1.5x a single step; later steps are repeated.
  function hardDelay(steps, step) {
    if (step > 0) return steps[step];
    if (steps.length > 1) return (steps[0] + steps[1]) / 2;
    return steps[0] * 1.5;
  }

  // Returns a new card object; the input card is not changed.
  function answer(card, grade, now, cfg = DEFAULTS, rng = Math.random) {
    const c = { ...card, reps: card.reps + 1 };
    if (c.type === 'new') {
      c.type = 'learning';
      c.step = 0;
    }
    updateMemory(c, grade, now, cfg);
    c.last = now;

    if (c.type === 'review') {
      if (grade !== AGAIN) return scheduleReview(c, now, cfg, rng);
      c.lapses += 1;
      if (cfg.relearningSteps.length === 0) return scheduleReview(c, now, cfg, rng);
      c.type = 'relearning';
      c.step = 0;
      return scheduleStep(c, cfg.relearningSteps[0], now);
    }

    const steps = c.type === 'relearning' ? cfg.relearningSteps : cfg.learningSteps;
    if (steps.length === 0 || (c.step >= steps.length && grade !== AGAIN)) {
      return scheduleReview(c, now, cfg, rng);
    }
    if (grade === AGAIN) {
      c.step = 0;
      return scheduleStep(c, steps[0], now);
    }
    if (grade === HARD) return scheduleStep(c, hardDelay(steps, c.step), now);
    if (grade === EASY || c.step + 1 >= steps.length) return scheduleReview(c, now, cfg, rng);
    c.step += 1;
    return scheduleStep(c, steps[c.step], now);
  }

  // Turns a typed answer into an Anki rating. Easy is only given on a first
  // sight of a new card or on a review: during learning steps the card was
  // seen minutes ago, so a quick answer says little about long-term memory.
  function autoGrade(correct, seconds, cardType, cfg = DEFAULTS) {
    if (!correct) return AGAIN;
    if (seconds > cfg.slowSeconds) return HARD;
    if (seconds <= cfg.fastSeconds && (cardType === 'new' || cardType === 'review')) return EASY;
    return GOOD;
  }

  // ---------- queues ----------

  // Sorts the cards that take part in today's study into Anki's queues.
  // `cards` must be in the order new cards should be introduced.
  function buildQueues(cards, now, newLeft, cfg = DEFAULTS) {
    const today = dayIndex(now, cfg.rolloverHour);
    const aheadLimit = now + cfg.learnAheadMinutes * MINUTE;
    const byDue = (x, y) => x.due - y.due;
    const learning = cards.filter(isLearning).sort(byDue);
    return {
      learningNow: learning.filter((c) => c.due <= now),
      learningAhead: learning.filter((c) => c.due > now && c.due <= aheadLimit),
      learningLater: learning.filter((c) => c.due > aheadLimit),
      review: cards
        .filter((c) => c.type === 'review' && dayIndex(c.due, cfg.rolloverHour) <= today)
        .sort(byDue),
      fresh: cards.filter((c) => c.type === 'new').slice(0, Math.max(0, newLeft)),
    };
  }

  // Picks the next card, or null when nothing is left for now.
  // Learning cards that are due come first, oldest first. Otherwise a random
  // card is drawn from today's reviews and new cards together. When only
  // learning cards remain, they are shown up to learnAheadMinutes early, as in
  // Anki. Cards whose ids are in `avoid` (such as the card just answered) are
  // skipped unless nothing else is left.
  function pickNext(queues, avoid = [], rng = Math.random) {
    const ok = (c) => !avoid.includes(c.id);
    const draw = (list) => (list.length ? list[Math.floor(rng() * list.length)] : null);
    const pool = queues.fresh.concat(queues.review);
    return (
      queues.learningNow.find(ok) ||
      draw(pool.filter(ok)) ||
      draw(pool) ||
      queues.learningNow[0] ||
      queues.learningAhead.find(ok) ||
      queues.learningAhead[0] ||
      null
    );
  }

  const api = {
    AGAIN,
    HARD,
    GOOD,
    EASY,
    DEFAULTS,
    DEFAULT_WEIGHTS,
    MINUTE,
    dayIndex,
    dayStart,
    retrievability,
    nextInterval,
    newCard,
    isLearning,
    answer,
    autoGrade,
    buildQueues,
    pickNext,
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SRS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
