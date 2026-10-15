# Times Table Cards

A prototype browser app that teaches the multiplication tables (1 × 1 to 10 × 10) with flash cards. The cards are scheduled with Anki's classic algorithm (SM-2).

## Running it

Open `index.html` in a browser. There is no build step and no server is needed.

Run the scheduler tests with Node 18 or later:

```
npm test
```

## How it works

Each fact, such as 7 × 8, is one card. 3 × 7 and 7 × 3 are separate cards, so there are 100 cards in total.

The child types the answer on the on-screen keypad or the keyboard. The app then picks one of the four Anki buttons on the child's behalf:

| Answer | Anki button |
| --- | --- |
| Wrong | Again |
| Right, but slower than 10 seconds | Hard |
| Right | Good |
| Right within 4 seconds | Easy |

Easy is only given when the card is shown for the first time or as a review. During the short learning steps the child saw the card a few minutes earlier, so a quick answer then says little about long-term memory.

After a wrong answer the app shows the right one, and the child types it to continue.

The scheduler in `srs.js` follows Anki's default deck options:

- New cards go through learning steps of 1 and 10 minutes, then come back after 1 day. Easy on a new card skips to 4 days.
- After that, each Good multiplies the interval by the card's ease, which starts at 2.5. Hard multiplies it by 1.2 and lowers the ease by 0.15. Easy multiplies it by ease × 1.3 and raises the ease by 0.15.
- A forgotten review card loses 0.2 ease (never below 1.3), goes through a 10-minute relearning step, and restarts at a 1-day interval.
- A card reviewed late gets credit for the extra days it was remembered.
- A day starts at 4 am. When only learning cards are left, they are shown up to 20 minutes early, as in Anki.
- At most 10 new facts are introduced per day (adjustable). Tables are introduced in the order ×1, ×2, ×10, ×5, ×3, ×4, ×9, ×6, ×8, ×7.

The "Grown-ups" panel lets you choose the tables, change the number of new facts per day, and move the app clock ahead by a day to see how reviews come back.

The progress square on the right shows each fact: not started, practising (in the learning steps), learned, or mastered (interval of 21 days or more, which Anki calls "mature").

## Limitations

- Progress is stored in the browser's `localStorage`, so it stays on one device and one browser.
- Anki adds a small random "fuzz" to intervals so cards learned together don't stay together. This prototype leaves it out.
- Newer Anki versions can use the FSRS algorithm instead of SM-2. This prototype uses SM-2 only.
- The 4- and 10-second thresholds are guesses and have not been tested with children.

## Files

- `index.html`: the app (layout, styles and interface code).
- `srs.js`: the scheduler. It has no dependencies and works in the browser and in Node.
- `tests/srs.test.js`: tests for the scheduler.
