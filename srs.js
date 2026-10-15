/*
 * Spaced-repetition scheduler modelled on Anki's classic SM-2 scheduler
 * (the "v3" scheduler without FSRS), with Anki's default deck options.
 *
 * Cards move through four states:
 *   new        -> never shown
 *   learning   -> short steps in minutes until the card "graduates"
 *   review     -> intervals in days, grown by the card's ease factor
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

  // Anki's default deck options, plus the answer-time thresholds this app
  // uses to turn a typed answer into one of the four Anki buttons.
  const DEFAULTS = Object.freeze({
    learningSteps: [1, 10], // minutes
    relearningSteps: [10], // minutes
    graduatingInterval: 1, // days
    easyInterval: 4, // days
    startingEase: 2.5,
    minEase: 1.3,
    easyBonus: 1.3,
    hardMultiplier: 1.2,
    lapseMultiplier: 0, // Anki's "New interval" after forgetting a card
    minLapseInterval: 1, // days
    maxInterval: 36500, // days
    learnAheadMinutes: 20,
    rolloverHour: 4, // a new day starts at 4 am, as in Anki
    fastSeconds: 4, // correct within this time counts as Easy
    slowSeconds: 10, // correct but slower than this counts as Hard
  });

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

  function dueInDays(now, days, cfg) {
    return dayStart(dayIndex(now, cfg.rolloverHour) + days, cfg.rolloverHour);
  }

  function roundEase(x) {
    return Math.round(x * 100) / 100;
  }

  function newCard(id) {
    return { id, type: 'new', step: 0, due: 0, interval: 0, ease: 0, reps: 0, lapses: 0 };
  }

  function isLearning(card) {
    return card.type === 'learning' || card.type === 'relearning';
  }

  function stepsFor(card, cfg) {
    return card.type === 'relearning' ? cfg.relearningSteps : cfg.learningSteps;
  }

  // Delay for Hard in (re)learning. On the first step Anki uses the average
  // of the first two steps, or 1.5x a single step; later steps are repeated.
  function hardDelay(steps, step) {
    if (step > 0) return steps[step];
    if (steps.length > 1) return (steps[0] + steps[1]) / 2;
    return Math.min(steps[0] * 1.5, steps[0] + 24 * 60);
  }

  function scheduleStep(card, minutes, now) {
    card.due = now + Math.round(minutes * MINUTE);
    return card;
  }

  function graduate(card, now, cfg, easy) {
    let interval;
    if (card.type === 'relearning') {
      // The interval was already shrunk when the card was forgotten.
      interval = card.interval + (easy ? 1 : 0);
    } else {
      interval = easy ? cfg.easyInterval : cfg.graduatingInterval;
    }
    card.type = 'review';
    card.step = 0;
    card.interval = Math.min(cfg.maxInterval, interval);
    card.due = dueInDays(now, card.interval, cfg);
    return card;
  }

  function answerLearning(card, grade, now, cfg) {
    const steps = stepsFor(card, cfg);
    if (grade === EASY || steps.length === 0) return graduate(card, now, cfg, grade === EASY);
    if (grade === AGAIN) {
      card.step = 0;
      return scheduleStep(card, steps[0], now);
    }
    if (grade === HARD) return scheduleStep(card, hardDelay(steps, card.step), now);
    if (card.step + 1 >= steps.length) return graduate(card, now, cfg, false);
    card.step += 1;
    return scheduleStep(card, steps[card.step], now);
  }

  // Day intervals for Hard, Good and Easy on a review card. Each is at least
  // one day longer than the one before, and a card answered late gets credit
  // for the extra days it was remembered.
  function reviewIntervals(card, daysLate, cfg) {
    const cap = (x) => Math.min(cfg.maxInterval, x);
    const hard = cap(Math.max(card.interval + 1, Math.round(card.interval * cfg.hardMultiplier)));
    const good = cap(Math.max(hard + 1, Math.round((card.interval + daysLate / 2) * card.ease)));
    const easy = cap(Math.max(good + 1, Math.round((card.interval + daysLate) * card.ease * cfg.easyBonus)));
    return { hard, good, easy };
  }

  function answerReview(card, grade, now, cfg) {
    const daysLate = Math.max(0, dayIndex(now, cfg.rolloverHour) - dayIndex(card.due, cfg.rolloverHour));
    if (grade === AGAIN) {
      card.lapses += 1;
      card.ease = roundEase(Math.max(cfg.minEase, card.ease - 0.2));
      card.interval = Math.max(cfg.minLapseInterval, Math.round(card.interval * cfg.lapseMultiplier));
      if (cfg.relearningSteps.length > 0) {
        card.type = 'relearning';
        card.step = 0;
        return scheduleStep(card, cfg.relearningSteps[0], now);
      }
      card.due = dueInDays(now, card.interval, cfg);
      return card;
    }
    const next = reviewIntervals(card, daysLate, cfg);
    if (grade === HARD) {
      card.ease = roundEase(Math.max(cfg.minEase, card.ease - 0.15));
      card.interval = next.hard;
    } else if (grade === GOOD) {
      card.interval = next.good;
    } else {
      card.ease = roundEase(card.ease + 0.15);
      card.interval = next.easy;
    }
    card.due = dueInDays(now, card.interval, cfg);
    return card;
  }

  // Returns a new card object; the input card is not changed.
  function answer(card, grade, now, cfg = DEFAULTS) {
    const c = { ...card, reps: card.reps + 1 };
    if (c.type === 'new') {
      c.type = 'learning';
      c.step = 0;
      c.ease = cfg.startingEase;
    }
    if (isLearning(c)) return answerLearning(c, grade, now, cfg);
    return answerReview(c, grade, now, cfg);
  }

  // Turns a typed answer into an Anki button. Easy is only given on a first
  // sight of a new card or on a review: during learning steps the card was
  // seen minutes ago, so a quick answer says little about long-term memory.
  function autoGrade(correct, seconds, cardType, cfg = DEFAULTS) {
    if (!correct) return AGAIN;
    if (seconds > cfg.slowSeconds) return HARD;
    if (seconds <= cfg.fastSeconds && (cardType === 'new' || cardType === 'review')) return EASY;
    return GOOD;
  }

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

  // Picks the next card, or null when nothing is left for now. Learning cards
  // that are due come first, then reviews mixed with new cards. When only
  // learning cards remain, they are shown up to learnAheadMinutes early, as
  // in Anki. The card just answered is avoided unless it is the only one.
  function pickNext(queues, lastId, rng = Math.random) {
    const other = (list) => list.find((c) => c.id !== lastId);
    const dueLearning = other(queues.learningNow);
    if (dueLearning) return dueLearning;

    const nReview = queues.review.length;
    const nFresh = queues.fresh.length;
    if (nReview + nFresh > 0) {
      const takeFresh = rng() < nFresh / (nReview + nFresh);
      return takeFresh ? queues.fresh[0] : queues.review[0];
    }

    return (
      queues.learningNow[0] ||
      other(queues.learningAhead) ||
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
    MINUTE,
    dayIndex,
    dayStart,
    newCard,
    isLearning,
    answer,
    reviewIntervals,
    autoGrade,
    buildQueues,
    pickNext,
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SRS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
