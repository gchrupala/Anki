# MaxApki: MnożenieMax, StoliceMax, ChemiaMax, LiteraturaMax, JęzykiMax and MapkiMax

A prototype browser app that teaches the multiplication tables with flash cards. The cards are scheduled with FSRS, the algorithm Anki offers alongside its older SM-2.

The same page also holds five sister apps with the same options: [StoliceMax](#stolicemax), which teaches the capitals of countries, [ChemiaMax](#chemiamax), which teaches the formulas of elements and common chemical compounds, [LiteraturaMax](#literaturamax), which teaches who wrote well-known books, [JęzykiMax](#językimax), which teaches French, Spanish, Dutch and Italian, and [MapkiMax](#mapkimax), which teaches where cities, mountains, lakes, rivers, seas, islands and deserts are on the map. The six apps form a family, MaxApki, installed as one app at one address. Tapping the app name at the top of the screen opens a menu with all six.

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

The home-screen name is "MaxApki", and its icon shows the cards of the six apps. MnożenieMax, StoliceMax, ChemiaMax, LiteraturaMax, JęzykiMax and MapkiMax are opened from inside it. On a tablet where the app was installed as "MnożenieMax", Chrome updates the name and icon by itself when it next checks the app, which can take up to a day; it may ask to confirm the change. Progress is stored on the tablet only, separately from the browser, and is lost if the app is removed.

The offline copy is kept by `sw.js` (a service worker). On every launch it asks the server whether the app files have changed, so a pushed change appears the next time the app is opened online, once GitHub Pages has published it (usually within a minute or two). Without internet, or if the server takes more than 4 seconds to answer, it uses the stored copy. A change to `sw.js` itself takes one extra launch: the first launch installs the new `sw.js`, the second uses it. Opening `index.html` as a local file still works, but without the offline copy or installation.

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

After a right answer the card stays on the screen for 1.4 seconds (2.2 when coins are paid), then the next one comes by itself; after a wrong answer, once the right one is tapped, it stays 0.9 seconds. A "Zatrzymaj" (Wait) button under the card shows the time left as a shrinking line. Tapping it keeps the card on the screen to look at it; the button then reads "Dalej" (Next), and tapping it, an answer or a key moves on. Tapping the card before it is held moves on at once. The setting "Następna karta po" (Next card after) keeps these times by default ("1,4 s"), or sets the time to 2, 5 or 10 seconds, or to "natychmiast" (at once: the next card comes after 0.4 seconds, just long enough to see the answer turn green, with no time for the coin message or a translation), or keeps every card until "Dalej" is tapped. Each app has its own setting.

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

Coins are spent in the shop ("Sklep" in the header) on rewards of the child's choice. In MnożenieMax these are keychains with the prime numbers from 2 to 19, each hanging from a key ring on a short chain. Prices rise with the number and its material:

| Keychain | Coins |
| --- | --- |
| Bronze 2 | 50 |
| Silver 3 | 100 |
| Gold 5 | 150 |
| Platinum 7 | 250 |
| Diamond 11 | 350 |
| Ruby 13 | 500 |
| Emerald 17 | 650 |
| Sapphire 19 | 800 |

Until October 2026 these were trophies in the same materials. A trophy bought then now shows as the keychain of its material.

Buying takes two taps (buy, then confirm), so a mis-tap does not spend coins. A purchase shows the keychain and lets confetti fall from the top of the screen for 4 seconds; with reduced motion switched on in the device settings, only the keychain is shown. The coin counter in the header shows the coins that can still be spent; next to it is the button of the [collection](#collection-and-gifts), with the number of rewards in all the apps and the latest one bought in this app. The shop lists all keychains bought, and the settings show the coins collected and spent. Tapping a reward on that list, or in the collection, shows it large, glowing in its colour, with its name and the date it was bought; a keychain swings gently on its ring. This works the same in all the apps. Done, Back or a tap around it goes back to where it was opened from. Prices, numbers and materials are set in `TROPHIES` in `index.html` (the code still calls all rewards trophies), the rewards in `LEVEL_COINS` and `DAY_BONUS`. In a simulation of a child practising daily with 10 new facts a day, buying each keychain as soon as possible, the bronze 2 comes on day 1, the gold 5 on day 5, the diamond 11 on day 13 and the sapphire 19 on day 29.

### Order of cards

- At most 10 new facts are introduced per day (adjustable). They are picked in a random order from all the selected tables, so easy facts such as 1 × 4 and harder ones such as 7 × 8 are mixed from the first day. To focus on particular tables, switch the others off in the settings panel.
- Cards that are due in their learning steps come first. Otherwise the next card is drawn at random from today's reviews and new cards.
- The card just answered and its twin (7 × 3 after 3 × 7) are not shown next unless nothing else is left.

### Settings and review log

The settings panel (the gear button, "Ustawienia" in Polish) lets you:

- choose the language;

- choose the size of the table (10 × 10 or 12 × 12), which tables to practise and which extra numbers to add (13 to 20, and 25);
- change the number of new facts per day and the target recall;
- switch the sound of the fireworks on or off (StoliceMax only; on by default);
- move the app clock ahead by a day, to see how reviews come back;
- copy the review log as CSV.

The log has one row per answer. Its first five columns (`card_id`, `review_time`, `review_rating`, `review_state`, `review_duration`) are the input format of the [FSRS optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer), so the log can be used to fit FSRS parameters to one child once there are enough reviews. Two more columns give the fact and the typed answer.

The progress square shows each fact: not started, practising (in the learning steps), learned, or mastered (interval of 21 days or more, which Anki calls "mature").

## StoliceMax

StoliceMax teaches the capitals of countries. It runs in the same page and at the same address as MnożenieMax, and has the same options: scheduling, time limit, coins and shop, languages, settings, review log, updates and offline use.

### Switching apps

The app name at the top of the screen is a button. It shows the icons of the apps and an arrow, and opens a menu with all the apps. Inside the app each icon has the colour of its app, with a card and a drawing in black and white; the home-screen icon of MaxApki is in full colour. For each app the menu says what it teaches and how many cards it has left today; an app not opened yet is marked "nowa" (new). The menu opens by itself the first time, and again the first time after a new app was added, and then explains how many apps there are. When all of the day's cards are done, the done card has a button to another app that still has cards for today.

The app that was open last opens on the next start. The address can also name the app: `#mnozenie`, `#stolice`, `#chemia`, `#literatura`, `#jezyki` or `#mapki` at the end (https://grzegorz.chrupala.me/Anki/#stolice). For a short time StoliceMax had its own address, https://grzegorz.chrupala.me/Anki/stolice/. That address now leads to `#stolice`, and its offline copy removes itself.

The share button in the header (three connected dots) opens the share menu of the device with the address of the app, https://grzegorz.chrupala.me/Anki/, for example to send it in a message. Where the browser has no share menu, it copies the address and says so.

Each app keeps its own cards, coins and rewards. The coins of MnożenieMax have an embossed ×, those of StoliceMax a star, those of ChemiaMax an atom, those of LiteraturaMax an open book, those of JęzykiMax a speech bubble, those of MapkiMax a compass rose. The atom is also the symbol on the ChemiaMax card in the app menu; the home-screen icon of MaxApki still shows a flask. The language is shared.

### Cards

- Each country is one card: the 193 members of the United Nations and the Vatican. The card shows the flag and the name of the country, and the child picks the capital from four capitals of the same continent, shown in a random order. After a wrong answer, or when the time is up, the right capital turns green and the child taps it to continue.
- The ratings follow the table above, with two differences. A right answer the first time a country is shown is never Easy, because with four answers it may be a guess; the country goes through the learning steps. Easy needs a right answer within 5 seconds instead of 4, because reading four names takes longer than typing a number. The default time limit is 15 seconds.
- The settings choose the continents; Europe is on by default. The continents follow Polish schools: Russia and Cyprus are in Europe, Turkey in Asia, and North America includes Central America and the Caribbean.
- The progress view has a square with the flag of each country, grouped by continent, with the number of capitals learned on each continent. A flag shows in colour once its country has been answered.
- The review log has a column for the country and one for the country whose capital was picked, both as ISO codes. The `card_id` the FSRS optimizer needs is the ISO code with its letters as numbers (FR is 618).

### Rewards

Coins follow the same rules as in MnożenieMax (2, 5 and 10 per country, 10 per finished day). The shop sells souvenirs: keychains with small glittering models of famous sights in capitals, hanging from a key ring on a short chain.

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

All 20 together cost 7700 coins. Learning all 194 capitals to the mastered level pays 3298 coins, and each finished day adds 10, so the full collection is a long-term goal. Each souvenir glitters: two layers of tiny coloured dots shimmer in turn, three stars twinkle on it, and a beam of light passes over it now and then. In the header the glitter stays still, so it does not distract from the cards. Buying a souvenir shows fireworks for 4 seconds: the screen darkens and rockets rise from the bottom and burst into sparks. A quiet sound goes with them: a whistle and a hiss as each rocket rises, and a bang with a crackle as it bursts, from the side of the screen where it is. The browser makes the sounds itself (Web Audio), so there are no sound files. The sound can be switched off in the settings ("Dźwięk fajerwerków"). Keychains in MnożenieMax keep their confetti. With reduced motion switched on in the device settings, the glitter stands still and only the souvenir is shown when one is bought.

The souvenirs and their prices are set in `SOUVENIRS` in `index.html`, their drawings, the places of their stars and the point where the chain holds them in `SOUVENIR_ART`, and their names in `i18n-capitals.js`.

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
- The settings choose the groups: elements, oxides, acids, bases, salts and organic compounds. All are on by default; the elements, added later, were switched on for progress saved before them. The progress view has a square with each formula, by group. Since the square shows the answer, the card being asked is only marked on it once it has been answered, and the label that shows when the mouse is over a square gives only when it comes back, not the name of the compound.
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

The prices are about a third lower than in the other shops, since ChemiaMax has fewer cards to earn coins with. Buying one makes an elixir explode, for 4 seconds in all: a bottle of glowing green elixir appears, shakes harder and harder while it bubbles, and its cork pops off. Then it bursts with a green flash and a shock wave, glass shards and green droplets fly all around, some splash onto the screen and drip down, green mist rises with sparkles in it, and the page shakes. With reduced motion switched on in the device settings, only the glassware is shown. The glassware and its prices are set in `GLASSWARE` in `index.html`, the drawings in `GLASS_ART`, the names in `i18n-chemistry.js`.

The elements and compounds and their names in the five languages are in `chemistry.js`. No two share a formula; glucose is there, fructose (also C₆H₁₂O₆) is not. Some everyday names stand for a close relative: gypsum is CaSO₄ with water in it, and the Persian کات کبود is copper sulfate with water.

## LiteraturaMax

LiteraturaMax teaches who wrote well-known books. It runs in the same page as the other apps and has the same options.

- Each card is a book: 126 books by 125 authors from 39 countries, in 26 languages, in seven categories: children's books, books for young people, fantasy and science fiction, crime and detective stories, adventure, classics, and poetry and epics. Eastern Europe and the Middle East are well represented: there are books from Poland, Ukraine, Russia, Czechia, Hungary, Bulgaria and Georgia, and from Iran, Egypt, Lebanon, Turkey and Morocco. There are also books from South Asia (India and Pakistan), East Asia (China, Japan and Korea), Latin America (Argentina, Uruguay and Brazil, besides Colombia) and Africa (Nigeria, Senegal and Kenya), and Dutch children's books.
- The card shows the title in the language of the page where the book has a well-known title in it, and below it the original title and the language the book was written in, such as "Крокодил Гена и его друзья · język rosyjski". Language names come from the browser (`Intl.DisplayNames`). Without a title in the language of the page, the card shows the original title if it is in the Latin alphabet, or else the English title.
- The child picks the author from four. One wrong answer is always the author most like the right one, and two more come from the next five most like it. Alike means writing in the same language (3 points), coming from the same country (2) or writing in the same category (2), so a Persian poem gets other Persian poets and a Polish adventure book other Polish authors. Each author appears once among the answers.
- As in StoliceMax, a right answer the first time is never Easy. Easy needs a right answer within 6 seconds. The default time limit is 20 seconds, and 5 new books a day. All categories are on by default.
- The progress view has a square for each book, with the flag of the country of its author, by category. As in ChemiaMax, the book being asked is only marked once it has been answered, and the label over a square leaves out the title, since the flag hints at the author.
- The review log uses the number of the book in `literature.js` as `card_id`, and has the book and the book whose author was picked (as `b1`, `b2` and so on).

The shop sells literary prizes from many countries and international ones, each a glittering medal on a ribbon or a statuette. Four white stars with a soft glow twinkle on each prize, besides the small golden ones the souvenirs have:

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

All 14 together cost 3020 coins; learning all 126 books to the mastered level pays 2142, plus 10 for each finished day. The Nobel medal is the largest and has golden rays around it. Buying a prize sets off a rain of letters: letters of the Latin, Cyrillic, Greek, Hebrew, Arabic and Persian, Georgian, Armenian, Devanagari, Thai, Chinese, Japanese and Korean scripts fall and turn. Each letter lands at the bottom of the screen and only fades there; new letters come for just over 2 seconds, and the last ones have faded about 5 seconds after the purchase. With reduced motion switched on in the device settings, only the prize is shown. The prizes and their prices are set in `PRIZES` in `index.html`, the drawings and the places of the white stars in `PRIZE_ART`, the names in `i18n-literature.js`.

The books and authors and their names in the five languages are in `literature.js`. Titles were chosen from published translations where they are well known; where a book has no known title in a language, the field is left empty and the rule above applies.

## JęzykiMax

JęzykiMax teaches French, Spanish, Dutch and Italian at the levels A1, A2, B1 and B2 of the Common European Framework of Reference for Languages. It runs in the same page as the other apps and has the same options. The language to learn is separate from the language of the interface: four buttons above the card choose it, and each language has its own cards and its own number of new cards a day. The coins of the four languages go into one purse.

- The cards are only in the language being learned, with pictures (emoji), so they need no translation into the five interface languages. The instruction ("Co to jest?", "Which word is missing?") is in the interface language. There are five kinds of card, each with four answers:
  - a picture, and the child picks the word or phrase ("la pomme", "Il pleut.", "Tengo frío.");
  - a word or phrase, and the child picks the picture;
  - a sentence with a gap, and the child picks the missing word ("Je vais ___ école." with "à l’", "au", "à la", "aux");
  - a question, and the child picks the answer that fits ("¿Por qué llegas tarde?" with "Porque perdí el autobús.", "Con mi hermano.", "A las nueve.", "En la cocina.");
  - a word, and the child picks its opposite.
- French, Spanish and Italian have 512 cards each: 176 pictures (vocabulary with articles, everyday phrases, idioms at B1 and B2), each as a picture card and a word card, 76 sentences with a gap, 48 questions and 36 pairs of opposites. Dutch has 21 more cards (91 gaps, 54 questions). Gaps and questions were written for each language and test its grammar: articles and gender, verb forms, past and future tenses, pronouns, at B1 the subjunctive, the conditional and relative clauses, and at B2 the passive, reported speech, conditionals about the past and linking words. The B2 picture cards are idioms, with a picture of what they mean (🤐 for keeping a secret).
- The words learned from pictures should come back in sentences, so that the child practises them in use and not only as a picture puzzle. Each gap and question lists the picture concepts it uses (the word or phrase is in the sentence with the gap filled in, or in the question or its right answer, in any form). `node tools/language-coverage.js` shows, per language and theme, how many concepts come back on two or more other cards (`node tools/language-coverage.js nl` lists them one by one). The Dutch jobs theme is the first one written this way: each job comes back in at least two gaps or questions, as the word to pick (*De ___ vliegt het vliegtuig.*), in a construction (*Mijn tante werkt ___ piloot.*, *Ze is piloot.*) or in a form (*Twee ___ schilderen ons huis.*).
- The wrong answers of gaps and questions are written with them. Those of picture, word and opposite cards are other cards of the same kind, of the same theme (food, animals, weather, jobs and so on) where it has enough, then of the same level.
- New cards come level by level: first A1, then A2, B1 and B2, at random within a level. Within a level the cards that show a word and ask for the picture come after the others, once the pictures are known. The levels can be switched off in the settings. As in StoliceMax, a right answer the first time is never Easy. Easy needs a right answer within 6 seconds. The default time limit is 30 seconds, and 10 new cards a day per language.
- Once a sentence with a gap is answered, the whole sentence is shown with the gap filled in, and below it what it means in the language of the interface (unless that is the language of the sentence, as with Dutch sentences in the Dutch interface). After a right answer the card then stays at least 3.5 seconds, to leave time to read it (except with "natychmiast"). The translations are in `languages-translations.js`.
- The speaker button reads the word or sentence aloud with a voice of the device for that language (the browser's `speechSynthesis`). It does not read what would give the answer away: a picture card is read only once answered, a gap only once filled in. Where the device has no voice for the language (or in the Android app, whose web view has none), the button is not shown. With the setting "Czytaj na głos automatycznie" (Read aloud by itself, off by default) the card is read aloud when it appears and again, with the answer, once it is answered, under the same rule; tapping the speaker button still reads it again. Browsers only let a page speak after it has been tapped once, so the very first card after opening the app may stay silent.
- The progress view has a square for each card of the language being learned, by level: the picture for picture and word cards, `_` for a gap, `?` for a question and `⇄` for opposites. As in ChemiaMax, the card being asked is only marked once it has been answered, and the label over a square leaves out the word, since the picture or the word can be the answer.
- The review log uses the number of the card as `card_id`, and has the card id (such as `fr.p.apple`) and the answer picked (the card id for the right answer, with `#1` to `#3` for the wrong ones).

The shop sells symbols of cities where these languages are spoken, drawn as glittering models like the souvenirs of StoliceMax:

| Symbol | City | Coins |
| --- | --- | --- |
| Linden tree (from its coat of arms) | Tilburg | 30 |
| Arc de Triomphe | Paris | 50 |
| Mouth of Truth | Rome | 60 |
| Giralda | Seville | 75 |
| Coat of arms | Amsterdam | 100 |
| Manneken Pis | Brussels | 125 |
| Leaning Tower | Pisa | 140 |
| Obelisk | Buenos Aires | 150 |
| Antwerp hand | Antwerp | 175 |
| Jet d’Eau | Geneva | 200 |
| Classic car | Havana | 250 |
| Gondola | Venice | 275 |
| Dom Tower | Utrecht | 300 |
| Château Frontenac | Quebec City | 350 |
| Angel of Independence | Mexico City | 400 |
| Notre-Dame de la Garde | Marseille | 450 |
| Cathedral dome | Florence | 500 |
| Erasmus Bridge | Rotterdam | 525 |
| Sagrada Família | Barcelona | 600 |

All 19 together cost 4755 coins; learning all the cards of one language to the mastered level pays 5610. Buying one makes thought bubbles (💭) pop up and rise for 4 seconds, with words such as "Bonjour !", "¡Hola!", "Goed zo!", "Evviva!" and greetings in many other languages and scripts. With reduced motion switched on in the device settings, only the symbol is shown. The symbols and their prices are set in `CITIES` in `index.html`, the drawings in `CITY_ART`, the names of the symbols and cities in `i18n-languages.js`.

The cards are in `languages.js`. They were written for this app; the French, Spanish, Dutch and Italian have not been checked by a teacher.

## MapkiMax

MapkiMax teaches where places are: cities, peaks, mountain ranges, lakes, rivers, seas, islands and deserts on all seven continents. It runs in the same page as the other apps and has the same options.

- Each place is one card: 480 places, from Warsaw, the Tatras and the Vistula to Lake Baikal, the Sahara and Lake Vostok in Antarctica, with many in Poland, the Netherlands and Iran. The card shows the kind of place and its name. Below it is the map of the continent the place lies on, without names. The map moves with a finger or the mouse and zooms with two fingers, the mouse wheel or the + and − buttons; the button with four corners shows the whole continent again.
- The child taps the map to place a pin, can place it again, and confirms with OK (or Enter). The distance from the pin to the place gives the Anki rating:

  | Distance | Anki rating |
  | --- | --- |
  | More than 400 km, or no answer in time | Again |
  | Up to 400 km | Hard |
  | Up to 150 km | Good |
  | Up to 50 km | Easy |

  The distance is along the surface of the Earth: to a city or peak, to the nearest edge of a lake, sea, island, desert or mountain range (0 km when the pin is inside it), and to the nearest stretch of a river. Unlike in the apps with four answers, a first answer can be Easy, since a pin close to a place is no guess. The time taken does not count, and there is no time limit by default.
- After OK the map shows the place in green with its name, and a dashed line from the pin to the nearest point of the place, and zooms to show both. After a right answer the card stays at least 3 seconds (except with "natychmiast"). After a wrong answer the pin turns red, and the child taps the green place to continue.
- The settings choose the continents (Europe by default) and the kinds of places (all by default). A place belongs to the continent it lies on, not to that of its country. Europe and Asia meet along the Ural Mountains, the Ural river, the Caspian Sea and the Kuma-Manych Depression, as taught in Polish schools: Moscow and Istanbul are in Europe; Novosibirsk, the Caucasus, Elbrus and Cyprus are in Asia; Hawaii is in Oceania. A sea on a border belongs to one continent: the Mediterranean and the Black Sea to Europe, the Caspian Sea to Asia, the Red Sea to Africa.
- Three settings under "Map" change how the map looks. "First view" shows either the whole continent (the default) or the region the place lies in, such as Scandinavia, the Middle East or Poland (see [The map](#the-map)). "Thick country borders" draws the borders as solid dark lines instead of thin dashed ones. "Country names" writes the names of countries on the map in capitals, as many as fit without overlapping, the larger countries first. A name that would give the answer away is left out: when the island of Cuba is asked, the map has no "CUBA". The progress view uses the same borders and names.
- The progress view shows the map of one continent, chosen with the buttons above it, which also give the number of places learned on each continent. Each place asked at least once is a dot in the colour of the legend. As in ChemiaMax, the place being asked only shows once it has been answered.
- The review log uses the number of the place in `places.js` as `card_id`, and has the place, the latitude and longitude of the pin, and its distance from the place in km.

### The map

Each continent has its own map in the Lambert azimuthal equal-area projection, centred on the continent, so areas keep their size. The land of the continent is coloured by height, as in a school atlas (below 200 m, then from 200, 500, 1500 and 3000 m); other land is grey, and ice white. Lakes, rivers and borders are drawn, but no names, except the names of countries when that setting is on. More than 100 degrees from the middle of a map the projection squeezes the land into slivers, so the map stops there. The first view shows the whole continent, and the map can be moved 40% of that view beyond it, for places such as Spitsbergen.

With "First view" set to "region", the first view shows the box around one of 30 regions: Poland, the Low Countries, the British Isles, the Nordic and Baltic countries, Western, Central, Southern and Eastern Europe; the Middle East (with Turkey and the Caucasus), Iran, Central Asia, South Asia, East Asia, Southeast Asia and Northern Asia; North, West, Central, East and Southern Africa; Mexico and Central America, the Caribbean, the United States, and Canada with Alaska and Greenland; the north and the south of South America; Australia, New Zealand, Melanesia and Polynesia. A place belongs to a region when the point where its name is written lies inside the outline of the region and the whole place fits in its box. Places too large for one region, such as the Alps, the Danube or the Sahara, and all places in Antarctica, are shown on the map of the continent. The map of a region can still be zoomed out and moved over the whole continent, and the button with four corners goes back to the region. On a wide screen, a tall region such as the Middle East shows much land on its sides, since the box has to fit the height of the screen.

The map comes from Natural Earth (public domain): the land at 1:10 million, simplified to about 2 km, and lakes, rivers, ice and borders at 1:50 million. The heights come from ETOPO1 (NOAA, public domain). The shapes of the places come from Natural Earth too: lakes, rivers, seas, mountain ranges, deserts and island groups as outlines, islands as their land on the map. The lakes and rivers that are places are drawn on the map as well. Cities, peaks and a few small places are points, at their coordinates in Wikidata. The Karun and the Zayandeh River are not in Natural Earth: their courses were traced by hand through the towns on their banks and are accurate to some 10 km. The names in the five languages come from Wikidata, some corrected by hand. Country names are written where Natural Earth places them (countries at 1:50 million), with the names of StoliceMax; for lands that are not countries in StoliceMax, such as Greenland, Taiwan or Antarctica, the names come from the browser.

`tools/make_maps.py` downloads these data and writes `maps.js` (about 640 KB) and `places.js` (about 190 KB) from the list in `tools/places.txt`:

```
python3 tools/make_maps.py DATA_DIR
```

It needs Python with pyshp, shapely, numpy, scipy, scikit-image and requests, and keeps the downloads in `DATA_DIR`. `python3 tools/make_maps.py DATA_DIR check` lists each place with its Wikidata id and names, to check them by eye.

### Rewards

The shop sells atlases, maps and globes, some ordinary and some famous from history:

| Reward | Made | Coins |
| --- | --- | --- |
| Treasure map | | 30 |
| School globe | | 50 |
| City map | | 70 |
| School atlas | | 100 |
| Celestial globe | | 125 |
| Peutinger Map (Tabula Peutingeriana) | Roman Empire | 150 |
| Al-Idrisi's map (Tabula Rogeriana) | Palermo, 1154 | 175 |
| Catalan Atlas | Majorca, 1375 | 200 |
| Piri Reis map | Gallipoli, 1513 | 250 |
| Mercator's Atlas | Duisburg, 1595 | 300 |
| Blaeu's Atlas Maior | Amsterdam, 1662 | 350 |
| Illuminated globe | | 400 |
| Behaim's globe (Erdapfel) | Nuremberg, 1492 | 475 |
| Jagiellonian Globe | Kraków, about 1510 | 550 |
| Golden globe | | 650 |

All 15 together cost 3875 coins; learning all 480 places to the mastered level pays 8160, plus 10 for each finished day. The Jagiellonian Globe, kept at the Jagiellonian University in Kraków, is one of the oldest globes that show America. Buying one sends a paper plane across the screen for 4 seconds: it leaves its route behind as a dashed line, and pins drop onto the route one after another, each with a ring where it lands. With reduced motion switched on in the device settings, only the reward is shown. The rewards and their prices are set in `ATLASES` in `index.html`, the drawings in `ATLAS_ART`, the names and where the famous ones were made in `i18n-maps.js`.

## Collection and gifts

The button with the latest reward in the header opens the collection: the rewards of all the apps, by app, with the number in each. A reward in the collection, or on the list in the shop, opens large, and from there it can be given away.

- **Giving.** "Podaruj" (give away), then a second tap to confirm, opens the share menu of the device with a gift link, for example to send it in a message. Without a share menu, the link is copied. Once the link is out, the reward leaves the collection and the link stays on show, to copy again. Closing the share menu without sharing keeps the reward. Coins are not given back. The device that gave the reward cannot take it back by opening the link.
- **Receiving.** Opening a gift link starts the app of the gift and puts the reward among its rewards, with the same celebration as buying it and "Prezent dla Ciebie!" (a gift for you). Shown large, it says when it was received. One link is received only once on a device.
- **Pasting a link.** A link opens in the browser, which on an iPad keeps its own progress, separate from the app added to the home screen. The collection therefore has a field "Odbierz prezent" (receive a gift) where a gift link can be pasted.
- **Trading** is two gifts, one each way.

A gift link is the address of the app followed by `#gift/<app>/<reward>/<code>`, for example `#gift/capitals/eiffel/k3f9q`. The code is random; it only keeps the same link from being received twice on one device, or on the device that gave it. Nothing checks that a link comes from a real gift, so anyone can write one for any reward: gifts are for fun, not safe against cheating.

## How the page holds several apps

`APPS` in `index.html` describes each app: its name, the key its progress is saved under, its default settings and its rewards. `CHOICE` holds what differs between StoliceMax, ChemiaMax, LiteraturaMax and JęzykiMax, the apps where the child picks one of four answers. MapkiMax has an entry there too, for what it shares with them (the continents and the review log), but no answers to pick from. Parts of the page that belong to some of the apps carry `data-app` with their names (`times`, `capitals`, `chemistry`, `literature`, `languages`, `maps`) and are hidden while another app is open. `i18n-capitals.js`, `i18n-chemistry.js`, `i18n-literature.js`, `i18n-languages.js` and `i18n-maps.js` have only the text that differs in those apps; the page puts it over the text of `i18n.js`. The open app, the language, the apps opened, the number of apps the menu was last seen with and the codes of the gift links received and given are saved under their own key (`max-apps`). The collection reads the rewards of the other apps from what they saved.

## Tests

`tests/srs.test.js` replays review sequences through `srs.js` and compares stability, difficulty and intervals with the values py-fsrs produces (`tests/fsrs_reference.json`). To regenerate that file, run `python tests/make_fsrs_reference.py` with the `fsrs` Python package installed.

`tests/countries.test.js` checks the StoliceMax data and text: 194 countries, each with a country and capital name in every language, at least four countries per continent, no two capitals with the same name on one continent, and the StoliceMax and app menu text in every language. `tests/chemistry.test.js` does the same for ChemiaMax: one formula and number per card, formulas made of element symbols, names in every language with no two alike, at least four cards per group, and the ChemiaMax text. `tests/literature.test.js` checks the LiteraturaMax data and text: one number per book, every author known and from a country with a flag, names and titles in every language with no two alike, books by at least four authors in each category, and the LiteraturaMax text. `tests/languages.test.js` checks the JęzykiMax data and text: one id and number per card, every kind of card at every level in every language, three different wrong answers for each gap and question and one gap per sentence, the concepts each gap and question uses, every word of the linked themes in at least two gaps or questions, the meaning of each sentence with a gap in the other interface languages, no picture or word twice, at least four pictures per theme, and the JęzykiMax text. `tests/maps.test.js` checks `geo.js` (decoding, distances, the projection) and the MapkiMax data and text: one id and number per place, names in every language (Persian ones in Persian letters), at least 20 places of each kind and five kinds on each continent, places in Iran, Poland and the Netherlands, every place within reach on the map of its continent (cities and peaks in its first view), every layer of the base map, every region with places of its own continent inside its outline, a label for every country, and the MapkiMax text.

## Limitations

- Progress is stored in the browser's `localStorage`, so it stays on one device and one browser. Progress from the earlier SM-2 version of the app is not carried over.
- The app uses the default FSRS parameters, which were fitted on Anki users in general, not on children. There is no optimizer in the app; the review log has to be exported and fitted elsewhere.
- The 3-, 4- and 10-second thresholds are guesses and have not been tested with children.

## Files

- `index.html`: the six apps (layout, styles and interface code).
- `i18n.js`: the interface text in Polish, English, Dutch, Spanish and Persian.
- `i18n-capitals.js`: the text that differs in StoliceMax.
- `countries.js`: the countries and capitals of StoliceMax.
- `i18n-chemistry.js`: the text that differs in ChemiaMax.
- `chemistry.js`: the compounds of ChemiaMax.
- `i18n-literature.js`: the text that differs in LiteraturaMax.
- `literature.js`: the books and authors of LiteraturaMax.
- `i18n-languages.js`: the text that differs in JęzykiMax.
- `languages.js`: the French, Spanish, Dutch and Italian cards of JęzykiMax.
- `languages-translations.js`: what the sentences with a gap mean, in the languages of the interface.
- `i18n-maps.js`: the text that differs in MapkiMax.
- `places.js`: the places of MapkiMax, with their names and shapes.
- `maps.js`: the base map of MapkiMax: land, heights, ice, lakes, rivers and borders, the outlines of the regions, and where country names are written.
- `geo.js`: the map projection, the encoded lines of `maps.js` and `places.js`, and distances on the Earth. It has no dependencies and works in the browser and in Node.
- `tools/make_maps.py`, `tools/places.txt`: how `maps.js` and `places.js` are made, and the list of places.
- `manifest.webmanifest`, `sw.js`, `icons/`: what makes the web app installable and usable offline. The SVG files in `icons/` are the sources of the PNG icons.
- `fonts/`: the Grandstander and Lexend fonts, and Vazirmatn for Persian, with their licences, bundled so the app looks the same offline.
- `srs.js`: the FSRS scheduler and card queues. It has no dependencies and works in the browser and in Node.
- `tests/`: scheduler tests and the py-fsrs reference data, and tests of the StoliceMax, ChemiaMax, LiteraturaMax and JęzykiMax data.
- `stolice/`: the first address of StoliceMax, which now leads to the app, and a service worker that removes the old offline copy.
