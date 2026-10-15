# Times Table Cards

A prototype browser app that teaches the multiplication tables with flash cards. The cards are scheduled with FSRS, the algorithm Anki offers alongside its older SM-2.

## Running it

Open `index.html` in a browser. There is no build step and no server is needed.

Run the scheduler tests with Node 18 or later:

```
npm test
```

## How it works

Each fact, such as 7 × 8, is one card. 3 × 7 and 7 × 3 are separate cards. The tables go up to 12 × 12 by default (144 cards). They can be set to 10 × 10, 15 × 15 or 20 × 20.

The child types the answer on the on-screen keypad or the keyboard. The answer is checked as soon as it has as many digits as the right answer. A shorter answer is checked after 3 seconds without typing, or when the child presses OK. The app then picks one of the four Anki ratings on the child's behalf:

| Answer | Anki rating |
| --- | --- |
| Wrong | Again |
| Right, but slower than 10 seconds | Hard |
| Right | Good |
| Right within 4 seconds | Easy |

Easy is only given when the card is shown for the first time or as a review. During the short learning steps the child saw the card a few minutes earlier, so a quick answer then says little about long-term memory.

After a wrong answer the app shows the right one, and the child types it to continue.

### Scheduling

`srs.js` implements FSRS-6 with its default parameters, following the reference implementation [py-fsrs](https://github.com/open-spaced-repetition/py-fsrs).

- FSRS keeps two numbers per card. Stability is the number of days until the chance of remembering drops to 90%. Difficulty runs from 1 to 10 and controls how fast stability grows.
- The next review is set for when the chance of remembering is expected to fall to the target recall: 90% by default, adjustable from 80% to 95%.
- New cards go through learning steps of 1 and 10 minutes before their first interval in days. A forgotten card goes through a 10-minute relearning step.
- Intervals get a small random shift ("fuzz"), as in Anki, so cards learned together don't keep coming back together.
- As in Anki, a day starts at 4 am and elapsed time is counted in calendar days. When only learning cards are left, they are shown up to 20 minutes early.

### Order of cards

- At most 10 new facts are introduced per day (adjustable). Tables are introduced in the order ×1, ×2, ×10, ×5, ×3, ×4, ×9, ×6, ×8, ×7, then ×11 and up. The facts within a table are introduced in a random order.
- Cards that are due in their learning steps come first. Otherwise the next card is drawn at random from today's reviews and new cards.
- The card just answered and its twin (7 × 3 after 3 × 7) are not shown next unless nothing else is left.

### Settings and review log

The "Grown-ups" panel lets you:

- choose the size of the table and which tables to practise;
- change the number of new facts per day and the target recall;
- move the app clock ahead by a day, to see how reviews come back;
- copy the review log as CSV.

The log has one row per answer. Its first five columns (`card_id`, `review_time`, `review_rating`, `review_state`, `review_duration`) are the input format of the [FSRS optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer), so the log can be used to fit FSRS parameters to one child once there are enough reviews. Two more columns give the fact and the typed answer.

The progress square shows each fact: not started, practising (in the learning steps), learned, or mastered (interval of 21 days or more, which Anki calls "mature").

## Tests

`tests/srs.test.js` replays review sequences through `srs.js` and compares stability, difficulty and intervals with the values py-fsrs produces (`tests/fsrs_reference.json`). To regenerate that file, run `python tests/make_fsrs_reference.py` with the `fsrs` Python package installed.

## Limitations

- Progress is stored in the browser's `localStorage`, so it stays on one device and one browser. Progress from the earlier SM-2 version of the app is not carried over.
- The app uses the default FSRS parameters, which were fitted on Anki users in general, not on children. There is no optimizer in the app; the review log has to be exported and fitted elsewhere.
- The 3-, 4- and 10-second thresholds are guesses and have not been tested with children.

## Files

- `index.html`: the app (layout, styles and interface code).
- `srs.js`: the FSRS scheduler and card queues. It has no dependencies and works in the browser and in Node.
- `tests/`: scheduler tests and the py-fsrs reference data.
