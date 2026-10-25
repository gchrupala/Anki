# Moving MaxApki to a new address

The new address is `https://maxapki.top/`; the domain is registered at Namecheap. The move is built (`move.js`, `index.html`) and published at the new address. The sending version is not yet published at the old address ([Order of work](#order-of-work)).

This plan covers the app installed from Chrome on Android, and the app opened in a browser on a computer. It does not cover the app added to the home screen of an iPad (see [Not covered](#not-covered)).

## Starting point

- Progress is saved in `localStorage`. The browser keeps that storage separately for each address (more precisely, for each origin: `https://grzegorz.chrupala.me` now). The app at a new address starts with empty storage.
- A page at the new address cannot read the storage of the old one, not even through a hidden frame: Chrome gives a page embedded from another site its own, empty storage.
- So the progress has to be sent by the app at the old address, `https://grzegorz.chrupala.me/Anki/`.
- The settings can already save all progress to one file and load it back ([Moving progress](../README.md#moving-progress)). The move reuses this:
  - `progressData()` collects `max-apps` and the saved state of every app.
  - `readProgress(text)` checks a progress file and says which apps it holds.
  - `offerProgress(file)` says what the file holds and asks before storing it.
  - `replaceProgress(file)` stores it and starts the page again.
- The GitHub backup keeps its connection under `max-backup`: the repository, the person, the token, a random name of the device and the version of the last backup.

## What the user sees

1. They tap the MaxApki icon as usual. The old app opens and goes straight to the new address.
2. The new address is outside the installed app, so Chrome shows it in a browser view over the app, with the address at the top. All progress, coins and rewards are already there.
3. A message says that MaxApki has a new address and asks to install it again.
4. A new MaxApki icon appears. It opens with all the progress. The GitHub backup carries on by itself; nothing has to be entered.
5. They remove the old icon: long press, then "Uninstall". The new icon is called "MaxApki.top", the old one just "MaxApki" ([Telling the two apps apart](#telling-the-two-apps-apart)). Until it is removed, it only says that the app has moved.

Installing the new app and removing the old one are the two steps the user has to do. Chrome leaves both to the user. Chrome has a feature for moving an installed app to a new address ([PWA origin migration](https://developer.chrome.com/blog/seamless-pwa-origin-migration)), but it works only between addresses of the same site, such as `app.example.com` and `example.com`, and is announced for computers only.

## Hosting during the move

The old address has to keep serving the app until every device has opened it once after the change. Only the app at the old address can send that device's progress.

Today GitHub Pages redirects `https://gchrupala.github.io/Anki/` to `https://grzegorz.chrupala.me/Anki/`. If the new domain were set as the custom domain of this repository, GitHub would most likely redirect the old address to the new one in the same way (not confirmed in the GitHub documentation). The old app would then never run again, and the progress on the tablets would stay in the old storage.

So each address has its own repository, both on GitHub Pages:

- **`gchrupala/maxapki`** (new) serves `https://maxapki.top/`. The app is developed there from now on: it gets the whole history of this repository, and its own `CNAME` file with `maxapki.top`. It has to be public, as GitHub Pages for a private repository needs a paid plan.
- **`gchrupala/Anki`** (this one) keeps serving `https://grzegorz.chrupala.me/Anki/`, as part of the user site `gchrupala.github.io`. It gets the sending version, and after that only fixes to the sending. It never gets the `CNAME` file of the new repository: with that file, its Pages site would claim `maxapki.top` too. Once every tablet has moved, it can be archived.

No GitHub Action is needed: nothing is copied from one repository to the other after the split. The receiving and the sending code are written once, in `maxapki`, and the commit that adds them is also brought to `Anki` (cherry-picked, without `CNAME`). The page decides what to do from `location.origin`: at the old address it sends, at the new address it receives.

The new app is at the root of its address (`/`), the old one at `/Anki/`. Every path in the app is relative (`manifest.webmanifest`, `sw.js`, `stolice/`), so the files work at both without change. The manifest `id` (`./`) makes the app at the new address a different app for Chrome, which is why it has to be installed again.

### Telling the two apps apart

Both apps would be called "MaxApki" with the same icon, so it would be hard to tell which one to uninstall. So the app at the new address is called "MaxApki.top" (in `manifest.webmanifest`, and `apple-mobile-web-app-title` for an iPad), and the old one keeps the name "MaxApki". The message at the new address says to remove the icon called just "MaxApki", without ".top".

It is the new app that changes, not the old one. The new one is installed fresh, so it has the new name at once. An installed app keeps the name and icon it was installed with, and Chrome updates them only when it next checks the manifest, at most once a day, and may ask to confirm. For the same reason, the commit with the new name stays out of `gchrupala/Anki`, like `CNAME`.

### Setting up `maxapki.top`

1. Create the public repository `gchrupala/maxapki` and push `main` to it.
2. Add a `CNAME` file with `maxapki.top`, then turn on Pages: Settings → Pages → Deploy from a branch → `main`, `/ (root)`, custom domain `maxapki.top`.
3. At Namecheap (Domain List → Manage → Advanced DNS), delete the parking records and add one `ALIAS` record: host `@`, value `gchrupala.github.io.`. A bare domain cannot have a `CNAME` record; the `ALIAS` record does the same and follows GitHub's addresses if they change. (GitHub's own instructions list four `A` records instead.)
4. Once GitHub has made the certificate, turn on "Enforce HTTPS". If the Pages settings still say "DNS check unsuccessful" after the record is in, "Check again" starts it.
5. Optionally, verify the domain for the GitHub account (Settings → Pages → Verified domains, a `TXT` record at Namecheap), so that no other GitHub account can serve a site at it.

## The move link

The progress travels in the address itself:

```
https://maxapki.top/#move/<data>
```

`<data>` is the text of a progress file, compressed with gzip (`CompressionStream`) and written in base64url (letters, digits, `-` and `_`):

```
{ maxapki: 1, saved, move: <id>, data: <progressData()>, backup: <max-backup> }
```

- `move` is a random id, made once for the move and kept by the old app.
- `backup` is the whole `max-backup` entry, including the token, so that the GitHub backup carries on without being connected again.
- The part after `#` is never sent to a server.

`move.js` makes and reads the link (`makeLink`, `readLink`), and works in the browser and in Node.

Size: an estimate with a year of practice in made-up data (about 3,800 cards and 20,000 answers in the review log) gives 1.6 MB of JSON, 0.33 MB after gzip and a link of 0.44 MB. Chrome accepts addresses up to 2 MB. If a link would be longer, the old app does not send it and asks to move the progress as a file instead.

What is saved of the move goes under `max-move` at each address: `{ sent: { id, at }, received: [ids], install }`.

## At the old address

On start, if the move has not been sent yet (`sendMove`):

1. Wait until the new address answers (a request for its `manifest.webmanifest`; GitHub Pages allows it from another address). Without internet, or if the new address does not answer, the app works as before and tries again on the next start. Going to the new address while offline would leave the user on an error page.
2. Save under `max-move` that the move was sent, with its id and time.
3. Build the move link from `progressData()` and `max-backup`, and go there with `location.replace`.

Once the move was sent, the old app saves nothing and backs up nothing (`replacing` stays set), so that progress cannot grow apart on the two addresses. It shows only a message that MaxApki has moved, above everything else (`showMoved`). The message names the new address and has two buttons:

- "Otwórz nowe MaxApki" (open the new MaxApki) sends the same move again, with the token, in case it did not arrive.
- "Zapisz postępy do pliku" (save progress to a file) downloads the progress file, to be loaded at the new address in the settings. This is the way out when the link would be too long, and when the move did not arrive in the new app.

The old app keeps its token. The design first deleted it, so that only the new app would hold it, but then a move that did not arrive could not be sent again with the backup connection. The old app no longer backs up, so the token there is unused.

The share button at the old address shares the new address.

## At the new address

On start, the page copies `#move/` from the address before clearing it, as it does for gift links (`arrivingMove`). Once the page has started (`receiveMove`):

1. Decompress it and check it with `readProgress()`. A link that is not a move says so ("Ten link nie zawiera postępów z MaxApki").
2. If a move with this id was stored before, do nothing. This is the case when the old app sends the same move again.
3. If the new address has no progress yet, store the progress at once with `replaceProgress()`, without asking. Otherwise open the settings and ask with `offerProgress()`, which also warns when this device has newer answers. A move without any progress brings only the backup connection.
4. Once it is stored (`takeMove`, called from `replaceProgress()`): save the id of the move, and the `backup` that came with it under `max-backup`, unless this device already has a connection of its own (`MOVE.mergeBackup`). A move that was not stored (declined) is not recorded, so it can be sent again.
5. `replaceProgress()` starts the page again. From then on, each start in the browser asks to install the app (Chrome menu, "Zainstaluj aplikację"), and to remove the old one, until the app runs installed (`display-mode: standalone`). Where Chrome offers it (`beforeinstallprompt`), a button installs it at once.

The visit that brings a move does not register the offline copy (`sw.js`); the next start does. In a test with headless Chrome, starting the page again while the offline copy installed on the first visit to the new address left the files of the app unloaded, and the page broken until its next start.

The GitHub backup carries on as the same device, because the device name comes along. `backupOnce` replaces a backup without asking when it was written by a device of the same name (`backup.js`), so there is no conflict. The version of the last backup comes along too, so the new app backs up again only when the progress changes.

## The token in the link

The token travels in the move link, and again each time the old app sends the move again. It is not sent to any server, and the new page removes it from the address as soon as it starts. But Chrome may save the full address in its history before that. With history sync turned on, the token would then also be stored in the Google account.

This adds a copy of a token that is already readable on the device: anyone holding the unlocked tablet can read it with the developer tools of the browser (README, [Backing up to GitHub](../README.md#backing-up-to-github)). The token can only read and write the backup repository, and it expires after a year.

To avoid the extra copy, turn off history sync on the tablets before the move, or clear the browsing history afterwards.

I found no other way to send it. The new address is a static site, so it receives data only through the address. Sending it between two windows (`postMessage`) would need the new address opened as a window of the old app that stays linked to it. That is unlikely to hold when an installed app opens an address outside itself; it has not been tried.

## Order of work

1. Set up `gchrupala/maxapki` and `maxapki.top` ([Setting up `maxapki.top`](#setting-up-maxapkitop)).
2. Publish the receiving version at the new address (push `main` to `gchrupala/maxapki`). Check that it opens over HTTPS and can be installed.
3. Check on one Android tablet what the tests cannot ([To check on a tablet](#to-check-on-a-tablet)).
4. Publish the sending version at the old address: cherry-pick the commits of the move onto `main` of `gchrupala/Anki`, without `CNAME` and the name "MaxApki.top", and push it. Each tablet moves on its next start with internet. Nothing can limit this to one tablet: every device that opens the old address moves.
5. When all tablets have moved, `gchrupala/Anki` can be archived. Check that its Pages site still serves the sending version after that; if not, unarchive it. A tablet not opened before the old address stops working keeps its progress in the old storage.

## Tests

- `tests/move.test.js` (Node): a move link made and read back with Polish and Persian letters, links that are not a move, a year of practice that fits in a link and too much that does not, which backup connection is kept, and the text of the move in every language.
- The whole move was also run in headless Chrome, with both addresses served from a local HTTPS server (not part of the repository): progress, coins and the backup connection arriving at the new address, the request to install, the old address showing only that MaxApki has moved and keeping its token, the same move sent again and not stored twice, a move into existing progress asking first in the settings, a broken link, and the installed app no longer asking to install it. 29 of 30 runs passed; in the other, the old address went to the new one later than the test waited, and the move still arrived.

## To check on a tablet

- That the browser view opened from the installed app, Chrome itself and the app installed from the new address share their storage. Without this, the progress arrives in the browser view but not in the new app. The way out is then the progress file: "Zapisz postępy do pliku" on the moved screen of the old app, and "Wczytaj postępy z pliku" in the settings of the new one.
- Whether Chrome offers "Install app" in that browser view, or only after "Open in Chrome".
- The size of the move link on a tablet with real progress.
- Whether Chrome keeps the address with the token in its history after the page has removed the hash.

## Not covered

- **iPad.** On an iPad, the app added to the home screen keeps its own storage, separate from Safari and from any other home-screen app. A new home-screen app added from the new address starts empty, and nothing the old app does can store data in it. There the progress moves as a file: "Zapisz postępy do pliku" on the moved screen of the old app, then "Wczytaj postępy z pliku" in the settings of the new one.
- **Several browsers on one device.** Each browser keeps its own storage, so the move happens in each browser in which the old address is opened.
