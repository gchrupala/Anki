# MaxApki: MnożenieMax, StoliceMax, ChemiaMax and LiteraturaMax

A prototype browser app that teaches the multiplication tables with flash cards. The cards are scheduled with FSRS, the algorithm Anki offers alongside its older SM-2.

The same page also holds three sister apps with the same options: [StoliceMax](#stolicemax), which teaches the capitals of countries, [ChemiaMax](#chemiamax), which teaches the formulas of elements and common chemical compounds, and [LiteraturaMax](#literaturamax), which teaches who wrote well-known books. The four apps form a family, MaxApki, installed as one app at one address. Tapping the app name at the top of the screen opens a menu with all four.

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

The home-screen name is "MaxApki", and its icon shows the cards of the four apps. MnożenieMax, StoliceMax, ChemiaMax and LiteraturaMax are opened from inside it. On a tablet where the app was installed as "MnożenieMax", Chrome updates the name and icon by itself when it next checks the app, which can take up to a day; it may ask to confirm the change. Progress is stored on the tablet only, separately from the browser, and is lost if the app is removed.

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

The interface follows the device language when it is Polish, English, Dutch, Spanish or Persian, and is in Polish otherwise. A fixed language can be chosen in the settings panel ("Ustawienia", behind the gear button); the first entry in the menu goes back to the device language. All languages write multiplication with ×. Persian is shown right to left, with Persian digits (۷ × ۸ = ۵۶); sums, the keypad and the progress square stay left to right, as in Persian maths. A keyboard may type Persian, Arabic or Western digits. All text is in `i18n.js`, and the text that differs in StoliceMax in `i18n-capitals.js`. Times such as "tomorrow" or "in 3 days" and plural forms come from the browser (`Intl.RelativeTimeFormat` and `Intl.PluralRules`).

## How it works

Each fact, such as 7 × 8, is one card. 3 × 7 and 7 × 3 are separate cards. The tables go up to 12 × 12 (or 10 × 10). On top of that, extra numbers can be chosen, by default 15, 20 and 25. Each extra number is practised only with the numbers 1 to 12: there is 15 × 7 and 7 × 15, but no 12 × 14 and no 15 × 20. With the defaults that makes 216 cards (144 + 3 × 24).

The child types the answer on the on-screen keypad or the keyboard. The answer is checked as soon as it has as many digits as the right answer. A shorter answer is checked after 3 seconds without typing, or when the child presses OK. If nothing is typed within the time limit (10 seconds by default; 10 to 60 seconds or no limit in the settings), the fact counts as not known: the app shows the answer, as after a wrong answer. The limit pauses while the settings panel is open or the app is in the background. The app then picks one of the four Anki ratings on the child's behalf:

| Answer | Anki rating |
| --- | --- |
| Wrong, or nothing typed within the time limit | Again |
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

### Coins

Coins reward what the child remembers, not the number of cards done. In spaced repetition a well-known fact comes back rarely, so coins per answer would reward forgetting. Instead:

| When | Coins |
| --- | --- |
| A new fact is learned (it leaves the first-day steps) | 2 |
| The gap before its next review reaches a week | 5 |
| The fact is mastered (a gap of 21 days or more) | 10 |
| All of the day's cards are done (once a day) | 10 |

Each fact pays each reward once, so forgetting and relearning earns nothing. Coins never change the schedule. Facts learned before coins were added counted towards the starting balance.

Coins are spent in the shop ("Sklep" in the header) on trophies of the child's choice. Prices rise with the material:

| Trophy | Coins |
| --- | --- |
| Bronze | 50 |
| Silver | 100 |
| Gold | 150 |
| Platinum | 250 |
| Diamond | 350 |
| Ruby | 500 |
| Emerald | 650 |
| Sapphire | 800 |

Buying takes two taps (buy, then confirm), so a mis-tap does not spend coins. A purchase shows the trophy and lets confetti fall from the top of the screen for 4 seconds; with reduced motion switched on in the device settings, only the trophy is shown. The coin counter in the header shows the coins that can still be spent; next to it are the number of trophies and the latest one bought. The shop lists all trophies bought, and the settings show the coins collected and spent. Prices and materials are set in `TROPHIES` in `index.html`, the rewards in `LEVEL_COINS` and `DAY_BONUS`. In a simulation of a child practising daily with 10 new facts a day, buying each trophy as soon as possible, bronze comes on day 1, gold on day 5, diamond on day 13 and sapphire on day 29.

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

## StoliceMax

StoliceMax teaches the capitals of countries. It runs in the same page and at the same address as MnożenieMax, and has the same options: scheduling, time limit, coins and shop, languages, settings, review log, updates and offline use.

### Switching apps

The app name at the top of the screen is a button. It shows the icons of the apps and an arrow, and opens a menu with all the apps. Inside the app the icons are black and white; the home-screen icon of MaxApki keeps its colours. For each app the menu says what it teaches and how many cards it has left today; an app not opened yet is marked "nowa" (new). The menu opens by itself the first time, and again the first time after a new app was added, and then explains how many apps there are. When all of the day's cards are done, the done card has a button to another app that still has cards for today.

The app that was open last opens on the next start. The address can also name the app: `#mnozenie`, `#stolice`, `#chemia` or `#literatura` at the end (https://grzegorz.chrupala.me/Anki/#stolice). For a short time StoliceMax had its own address, https://grzegorz.chrupala.me/Anki/stolice/. That address now leads to `#stolice`, and its offline copy removes itself.

The share button in the header (three connected dots) opens the share menu of the device with the address of the app, https://grzegorz.chrupala.me/Anki/, for example to send it in a message. Where the browser has no share menu, it copies the address and says so.

Each app keeps its own cards, coins and rewards. The coins of MnożenieMax have an embossed ×, those of StoliceMax a star, those of ChemiaMax an atom, those of LiteraturaMax an open book. The atom is also the symbol on the ChemiaMax card in the app menu; the home-screen icon of MaxApki still shows a flask. The language is shared.

### Cards

- Each country is one card: the 193 members of the United Nations and the Vatican. The card shows the flag and the name of the country, and the child picks the capital from four capitals of the same continent, shown in a random order. After a wrong answer, or when the time is up, the right capital turns green and the child taps it to continue.
- The ratings follow the table above, with two differences. A right answer the first time a country is shown is never Easy, because with four answers it may be a guess; the country goes through the learning steps. Easy needs a right answer within 5 seconds instead of 4, because reading four names takes longer than typing a number. The default time limit is 15 seconds.
- The settings choose the continents; Europe is on by default. The continents follow Polish schools: Russia and Cyprus are in Europe, Turkey in Asia, and North America includes Central America and the Caribbean.
- The progress view has a square with the flag of each country, grouped by continent, with the number of capitals learned on each continent. A flag shows in colour once its country has been answered.
- The review log has a column for the country and one for the country whose capital was picked, both as ISO codes. The `card_id` the FSRS optimizer needs is the ISO code with its letters as numbers (FR is 618).

### Rewards

Coins follow the same rules as in MnożenieMax (2, 5 and 10 per country, 10 per finished day). The shop sells souvenirs instead of trophies: small glittering models of famous sights in capitals.

| Souvenir | Capital | Coins |
| --- | --- | --- |
| Palace of Culture and Science | Warsaw | 50 |
| Eiffel Tower | Paris | 75 |
| Canal houses | Amsterdam | 100 |
| Big Ben | London | 125 |
| Giant Ferris Wheel | Vienna | 150 |
| The Bear and the Strawberry Tree | Madrid | 175 |
| Brandenburg Gate | Berlin | 200 |
| Yellow tram | Lisbon | 250 |
| Atomium | Brussels | 300 |
| Colosseum | Rome | 350 |
| Parthenon | Athens | 400 |
| White House | Washington | 450 |
| Torii gate | Tokyo | 500 |
| Azadi Tower | Tehran | 525 |
| Petronas Towers | Kuala Lumpur | 550 |
| Lotus Temple | New Delhi | 600 |
| Cathedral of Brasília | Brasília | 650 |
| Sheikh Zayed Mosque | Abu Dhabi | 700 |
| Pyramids of Giza | Cairo (Giza is part of greater Cairo) | 750 |
| Forbidden City | Beijing | 800 |

All 20 together cost 7700 coins. Learning all 194 capitals to the mastered level pays 3298 coins, and each finished day adds 10, so the full collection is a long-term goal. Each souvenir glitters: two layers of tiny coloured dots shimmer in turn, three stars twinkle on it, and a beam of light passes over it now and then. In the header the glitter stays still, so it does not distract from the cards. Buying a souvenir shows fireworks for 4 seconds: the screen darkens and rockets rise from the bottom and burst into sparks. Trophies in MnożenieMax keep their confetti. With reduced motion switched on in the device settings, the glitter stands still and only the souvenir is shown when one is bought.

The souvenirs and their prices are set in `SOUVENIRS` in `index.html`, their drawings and the places of their stars in `SOUVENIR_ART`, and their names in `i18n-capitals.js`.

### Names of countries and capitals

The names are in `countries.js`. Country names come from the Unicode CLDR data that browsers use for `Intl.DisplayNames`, capitals and their names from Wikidata. Both were checked and some were corrected by hand. Some choices to be aware of:

- Where a country has more than one capital, the app uses the one Wikidata lists first: Pretoria (South Africa), Sucre (Bolivia), Porto-Novo (Benin), Yamoussoukro (Côte d’Ivoire), Dodoma (Tanzania), Gitega (Burundi), Mbabane (Eswatini) and Sri Jayawardenepura Kotte (Sri Lanka). The others never appear as answers.
- Equatorial Guinea has Ciudad de la Paz, which replaced Malabo in January 2026 according to Wikidata. Older school books give Malabo.
- Israel has Jerusalem, as in Wikidata. Many countries do not recognise it as the capital.

## ChemiaMax

ChemiaMax teaches the formulas of elements and common chemical compounds. It runs in the same page as the other apps and has the same options.

- Each card is an element or a compound: 28 elements and 53 compounds a child meets at home, in nature and in school chemistry, from oxygen, iron and gold to water, table salt, caffeine and vitamin C. Elements are written as they occur: gases such as oxygen as molecules (O₂, N₂, Cl₂), noble gases and metals as single atoms (He, Fe, Au), and sulfur, carbon and phosphorus by their symbol. The card shows the name, as in school chemistry ("Tlenek węgla(IV)" in Polish), with the everyday name below it if there is one ("dwutlenek węgla"). The child picks the formula from four, written with small numbers (H₂O).
- One wrong answer is always the formula most like the right one, and two more come from the next five most like it. For a compound, alike means the most of its elements and the fewest others: carbon monoxide always gets CO₂, and nitrogen dioxide N₂O and maybe HNO₃. For an element, it means another form of the same element or a symbol with the same first letter: oxygen always gets O₃, iron F₂, silver Au, Ar or Al.
- As in StoliceMax, a right answer the first time is never Easy. Easy needs a right answer within 6 seconds. The default time limit is 20 seconds, and 5 new compounds a day, because formulas are harder to learn than capitals.
- The settings choose the groups: elements, oxides, acids, bases, salts and organic compounds. All are on by default; the elements, added later, were switched on for progress saved before them. The progress view has a square with each formula, by group.
- The review log uses the number of the element or compound in `chemistry.js` as `card_id`, and has the formula and the formula picked.

The shop sells laboratory glassware with coloured liquid that bubbles and glitters:

| Glassware | Coins |
| --- | --- |
| Blue test tube | 30 |
| Green test tube | 50 |
| Pink conical flask | 70 |
| Purple retort | 100 |
| Orange round flask | 140 |
| Rack of test tubes | 175 |
| Yellow beaker | 200 |
| Retort over a flame | 275 |
| Turquoise volumetric flask | 350 |
| Separating funnel | 425 |
| Golden retort | 500 |
| Rainbow flask | 575 |

The prices are about a third lower than in the other shops, since ChemiaMax has fewer cards to earn coins with. Buying one sets off an explosion for 4 seconds: a flash, a shock wave, a fireball, sparks and drops of the liquid flying out, smoke, and the page shakes. With reduced motion switched on in the device settings, only the glassware is shown. The glassware and its prices are set in `GLASSWARE` in `index.html`, the drawings in `GLASS_ART`, the names in `i18n-chemistry.js`.

The elements and compounds and their names in the five languages are in `chemistry.js`. No two share a formula; glucose is there, fructose (also C₆H₁₂O₆) is not. Some everyday names stand for a close relative: gypsum is CaSO₄ with water in it, and the Persian کات کبود is copper sulfate with water.

## LiteraturaMax

LiteraturaMax teaches who wrote well-known books. It runs in the same page as the other apps and has the same options.

- Each card is a book: 126 books by 125 authors from 39 countries, in 26 languages, in seven categories: children's books, books for young people, fantasy and science fiction, crime and detective stories, adventure, classics, and poetry and epics. Eastern Europe and the Middle East are well represented: there are books from Poland, Ukraine, Russia, Czechia, Hungary, Bulgaria and Georgia, and from Iran, Egypt, Lebanon, Turkey and Morocco. There are also books from South Asia (India and Pakistan), East Asia (China, Japan and Korea), Latin America (Argentina, Uruguay and Brazil, besides Colombia) and Africa (Nigeria, Senegal and Kenya), and Dutch children's books.
- The card shows the title in the language of the page where the book has a well-known title in it, and below it the original title and the language the book was written in, such as "Крокодил Гена и его друзья · język rosyjski". Language names come from the browser (`Intl.DisplayNames`). Without a title in the language of the page, the card shows the original title if it is in the Latin alphabet, or else the English title.
- The child picks the author from four. One wrong answer is always the author most like the right one, and two more come from the next five most like it. Alike means writing in the same language (3 points), coming from the same country (2) or writing in the same category (2), so a Persian poem gets other Persian poets and a Polish adventure book other Polish authors. Each author appears once among the answers.
- As in StoliceMax, a right answer the first time is never Easy. Easy needs a right answer within 6 seconds. The default time limit is 20 seconds, and 5 new books a day. All categories are on by default.
- The progress view has a square for each book, with the flag of the country of its author, by category.
- The review log uses the number of the book in `literature.js` as `card_id`, and has the book and the book whose author was picked (as `b1`, `b2` and so on).

The shop sells literary prizes from many countries and international ones, each a glittering medal on a ribbon or a statuette:

| Prize | Country | Coins |
| --- | --- | --- |
| Newbery Medal | United States | 30 |
| Carnegie Medal | United Kingdom | 40 |
| Franz Kafka Prize | Czechia | 50 |
| Prix Goncourt | France | 75 |
| Cervantes Prize | Spain | 100 |
| Shevchenko Prize | Ukraine | 125 |
| Jalal Al-e Ahmad Prize | Iran | 150 |
| Gouden Griffel | Netherlands | 175 |
| Hugo Award | international | 200 |
| International Prize for Arabic Fiction | international | 250 |
| Nike Award | Poland | 300 |
| Booker Prize | United Kingdom | 375 |
| Hans Christian Andersen Award | international | 450 |
| Nobel Prize in Literature | Sweden | 700 |

All 14 together cost 3020 coins; learning all 126 books to the mastered level pays 2142, plus 10 for each finished day. The Nobel medal is the largest and has golden rays around it. Buying a prize sets off a rain of letters for 4 seconds: letters of the Latin, Cyrillic, Greek, Hebrew, Arabic and Persian, Georgian, Armenian, Devanagari, Thai, Chinese, Japanese and Korean scripts fall and turn. With reduced motion switched on in the device settings, only the prize is shown. The prizes and their prices are set in `PRIZES` in `index.html`, the drawings in `PRIZE_ART`, the names in `i18n-literature.js`.

The books and authors and their names in the five languages are in `literature.js`. Titles were chosen from published translations where they are well known; where a book has no known title in a language, the field is left empty and the rule above applies.

## How the page holds several apps

`APPS` in `index.html` describes each app: its name, the key its progress is saved under, its default settings and its rewards. `CHOICE` holds what differs between StoliceMax, ChemiaMax and LiteraturaMax, the apps where the child picks one of four answers. Parts of the page that belong to some of the apps carry `data-app` with their names (`times`, `capitals`, `chemistry`, `literature`) and are hidden while another app is open. `i18n-capitals.js`, `i18n-chemistry.js` and `i18n-literature.js` have only the text that differs in those apps; the page puts it over the text of `i18n.js`. The open app, the language, the apps opened and the number of apps the menu was last seen with are saved under their own key (`max-apps`).

## Tests

`tests/srs.test.js` replays review sequences through `srs.js` and compares stability, difficulty and intervals with the values py-fsrs produces (`tests/fsrs_reference.json`). To regenerate that file, run `python tests/make_fsrs_reference.py` with the `fsrs` Python package installed.

`tests/countries.test.js` checks the StoliceMax data and text: 194 countries, each with a country and capital name in every language, at least four countries per continent, no two capitals with the same name on one continent, and the StoliceMax and app menu text in every language. `tests/chemistry.test.js` does the same for ChemiaMax: one formula and number per card, formulas made of element symbols, names in every language with no two alike, at least four cards per group, and the ChemiaMax text. `tests/literature.test.js` checks the LiteraturaMax data and text: one number per book, every author known and from a country with a flag, names and titles in every language with no two alike, books by at least four authors in each category, and the LiteraturaMax text.

## Limitations

- Progress is stored in the browser's `localStorage`, so it stays on one device and one browser. Progress from the earlier SM-2 version of the app is not carried over.
- The app uses the default FSRS parameters, which were fitted on Anki users in general, not on children. There is no optimizer in the app; the review log has to be exported and fitted elsewhere.
- The 3-, 4- and 10-second thresholds are guesses and have not been tested with children.

## Files

- `index.html`: the four apps (layout, styles and interface code).
- `i18n.js`: the interface text in Polish, English, Dutch, Spanish and Persian.
- `i18n-capitals.js`: the text that differs in StoliceMax.
- `countries.js`: the countries and capitals of StoliceMax.
- `i18n-chemistry.js`: the text that differs in ChemiaMax.
- `chemistry.js`: the compounds of ChemiaMax.
- `i18n-literature.js`: the text that differs in LiteraturaMax.
- `literature.js`: the books and authors of LiteraturaMax.
- `manifest.webmanifest`, `sw.js`, `icons/`: what makes the web app installable and usable offline. The SVG files in `icons/` are the sources of the PNG icons.
- `fonts/`: the Grandstander and Lexend fonts, and Vazirmatn for Persian, with their licences, bundled so the app looks the same offline.
- `android/`: the Android app.
- `srs.js`: the FSRS scheduler and card queues. It has no dependencies and works in the browser and in Node.
- `tests/`: scheduler tests and the py-fsrs reference data, and tests of the StoliceMax, ChemiaMax and LiteraturaMax data.
- `stolice/`: the first address of StoliceMax, which now leads to the app, and a service worker that removes the old offline copy.
