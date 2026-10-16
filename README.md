# MnożenieMax

A prototype browser app that teaches the multiplication tables with flash cards. The cards are scheduled with FSRS, the algorithm Anki offers alongside its older SM-2.

## Running it

The app is published with GitHub Pages at https://grzegorz.chrupala.me/Anki/ (https://gchrupala.github.io/Anki/ redirects there).

Open `index.html` in a browser. There is no build step and no server is needed.

Run the scheduler tests with Node 18 or later:

```
npm test
```

## Installing on a tablet

The app can be installed as a home-screen app (a "progressive web app"). It then opens full screen, without the browser bars, and works without internet after the first visit.

This needs the files on an https web address, for example GitHub Pages (repository Settings → Pages → Deploy from a branch → `main`, `/ (root)`). The empty `.nojekyll` file tells GitHub Pages to publish the files as they are, without its Jekyll site generator. GitHub Pages for a private repository needs a paid GitHub plan; Netlify and Cloudflare Pages can serve a private repository for free.

Then, on the tablet:

- **iPad:** open the address in Safari, tap the Share button, then "Add to Home Screen".
- **Android:** open the address in Chrome, open the ⋮ menu, then "Install app" or "Add to Home screen".

The home-screen name is "MnożenieMax". Progress is stored on the tablet only, separately from the browser, and is lost if the app is removed.

The offline copy is kept by `sw.js` (a service worker). On every launch it asks the server whether the app files have changed, so a pushed change appears the next time the app is opened online, once GitHub Pages has published it (usually within a minute or two). Without internet, or if the server takes more than 4 seconds to answer, it uses the stored copy. A change to `sw.js` itself takes one extra launch: the first launch installs the new `sw.js`, the second uses it. Opening `index.html` as a local file still works, but without the offline copy or installation.

## Android app

`android/` builds an Android app (an APK) that contains the web app. It runs without internet and does not depend on Chrome, so Google Family Link treats it like any other app: it can have its own daily time limit, or be marked "Always allowed".

### Installing on a tablet with Family Link

1. In the Family Link app on the parent's phone, open the child's profile, then the tablet under the signed-in devices, and turn on "Apps from unknown sources". The exact place of this setting differs between Family Link versions.
2. Copy the APK to the tablet, for example through Google Drive, and open it there to install it.
3. Turn "Apps from unknown sources" off again.
4. In Family Link, set a limit for "MnożenieMax" under the app limits.

To update, install a newer APK over the old one. Progress is kept, but only if the new APK is signed with the same key as the old one. An APK signed with another key can only be installed after uninstalling the old app, which erases the progress.

### Building the APK

This needs JDK 17 or later and the Android SDK with platform 35 and build-tools 35, with `ANDROID_HOME` pointing to the SDK.

```
cd android
./gradlew assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. Its version number is the number of commits in the repository, so each new commit gives a higher version.

The signing key is not in the repository. To sign the APK, create `android/keystore.properties` (ignored by git):

```
storeFile=/path/to/tabliczka-release.jks
storePassword=...
keyAlias=tabliczka
keyPassword=...
```

Without this file the APK is built unsigned, and Android will not install it.

`MainActivity.java` shows the bundled files in Android's web view, under the address `https://appassets.androidplatform.net/`. Progress is saved in the app's own storage, separately from any browser.

## Languages

The interface follows the device language when it is Polish, English, Dutch or Spanish, and is in Polish otherwise. A fixed language can be chosen in the settings panel ("Ustawienia", behind the gear button); the first entry in the menu goes back to the device language. All languages write multiplication with ×. All text is in `i18n.js`. Times such as "tomorrow" or "in 3 days" and plural forms come from the browser (`Intl.RelativeTimeFormat` and `Intl.PluralRules`).

## How it works

Each fact, such as 7 × 8, is one card. 3 × 7 and 7 × 3 are separate cards. The tables go up to 12 × 12 (or 10 × 10). On top of that, extra numbers can be chosen, by default 15, 20 and 25. Each extra number is practised only with the numbers 1 to 12: there is 15 × 7 and 7 × 15, but no 12 × 14 and no 15 × 20. With the defaults that makes 216 cards (144 + 3 × 24).

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

- At most 10 new facts are introduced per day (adjustable). They are picked in a random order from all the selected tables, so easy facts such as 1 × 4 and harder ones such as 7 × 8 are mixed from the first day. To focus on particular tables, switch the others off in the settings panel.
- Cards that are due in their learning steps come first. Otherwise the next card is drawn at random from today's reviews and new cards.
- The card just answered and its twin (7 × 3 after 3 × 7) are not shown next unless nothing else is left.

### Settings and review log

The settings panel (the gear button, "Ustawienia" in Polish) lets you:

- choose the language;

- choose the size of the table (10 × 10 or 12 × 12), which tables to practise and which extra numbers to add (13 to 20, and 25);
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
- `i18n.js`: the interface text in Polish, English, Dutch and Spanish.
- `manifest.webmanifest`, `sw.js`, `icons/`: what makes the web app installable and usable offline. The SVG files in `icons/` are the sources of the PNG icons.
- `fonts/`: the Grandstander and Lexend fonts with their licences, bundled so the app looks the same offline.
- `android/`: the Android app.
- `srs.js`: the FSRS scheduler and card queues. It has no dependencies and works in the browser and in Node.
- `tests/`: scheduler tests and the py-fsrs reference data.
