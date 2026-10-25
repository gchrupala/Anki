# Moving MaxApki to a new address

Design proposal. Nothing here is implemented yet. The domain is not chosen yet; the plan assumes `maxapki.top`.

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
5. They remove the old icon: long press, then "Uninstall". Until then, the old icon only says that the app has moved and opens the new address.

Installing the new app and removing the old one are the two steps the user has to do. Chrome leaves both to the user. Chrome has a feature for moving an installed app to a new address ([PWA origin migration](https://developer.chrome.com/blog/seamless-pwa-origin-migration)), but it works only between addresses of the same site, such as `app.example.com` and `example.com`, and is announced for computers only.

## Hosting during the move

The old address has to keep serving the app until every device has opened it once after the change. Only the app at the old address can send that device's progress.

Today GitHub Pages redirects `https://gchrupala.github.io/Anki/` to `https://grzegorz.chrupala.me/Anki/`. If the new domain is set as the custom domain of this repository, GitHub will most likely redirect the old address to the new one in the same way (not confirmed in the GitHub documentation). The old app would then never run again, and the progress on the tablets would stay in the old storage until the redirect is removed.

So the new address is served by a second deployment of the same files:

- a second repository with GitHub Pages and the new domain as its custom domain, updated from this one by a GitHub Action on every push to `main`, or
- Cloudflare Pages, building from this repository.

Chosen: the repository `gchrupala/maxapki`. On every push to `main`, `.github/workflows/maxapki-top.yml` replaces its content with the files of `main` and a `CNAME` file with `maxapki.top`. When all tablets have moved, `maxapki.top` becomes the custom domain of this repository, and `gchrupala/maxapki` and the workflow can be deleted (see [Order of work](#order-of-work)).

Both addresses serve the same files. The page decides what to do from `location.origin`: at the old address it sends, at the new address it receives.

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
- `backup` is the whole `max-backup` entry, including the token, so that the GitHub backup carries on without being connected again. It is left out once the old app has deleted its token.
- The part after `#` is never sent to a server.

Size: an estimate with a year of practice in made-up data (about 3,800 cards and 20,000 answers in the review log) gives 1.6 MB of JSON, 0.33 MB after gzip and a link of 0.44 MB. Chrome accepts addresses up to 2 MB. If a link is longer than that, the old app offers the progress file instead ("Zapisz postępy do pliku").

## At the old address

On start, if the move has not been sent yet:

1. Wait until the new address answers (a request for its `manifest.webmanifest`). Without internet, or if the new address does not answer, the app works as before and tries again on the next start. Going to the new address while offline would leave the user on an error page.
2. Build the move link from `progressData()` and `max-backup`.
3. Save under `max-moved` that the move was sent, with its id and time.
4. Delete the token from `max-backup`. Only the new app keeps it.
5. Go to the move link with `location.replace`.

Once the move was sent, the old app no longer lets cards be answered and no longer backs up, so that progress cannot grow apart on the two addresses. It shows only a message that MaxApki has moved, with a button that opens the new address with the move link again (without the token).

## At the new address

On start, before the page clears `location.hash` (where gift links are read):

1. Read `#move/`, decompress it and check it with `readProgress()`.
2. If a move with this id was received before, ignore the data and just open the app. This is the case when the old icon is opened again.
3. If the new address has no progress yet, store the progress at once with `replaceProgress()`, without asking. Otherwise ask with `offerProgress()`, which also warns when this device has newer answers.
4. Store the `backup` that came with it under `max-backup`, together with the progress. If it has no token (a link sent again, see above) and a connection is already saved here, keep that connection.
5. Save the id of the move, so that the same link is not stored twice.
6. Show the message that asks to install the app (Chrome menu, "Install app"). The message is shown again on later starts in the browser view, until the app runs installed (`display-mode: standalone`).

`replaceProgress()` already starts the page again, and the hash is removed from the address as for gift links.

The GitHub backup carries on as the same device, because the device name comes along. `backupOnce` replaces a backup without asking when it was written by a device of the same name (`backup.js`), so there is no conflict. The version of the last backup comes along too, so the new app backs up again only when the progress changes.

## The token in the link

The token travels in the move link. It is not sent to any server, and the new page removes it from the address as soon as it starts. But Chrome may save the full address in its history before that. With history sync turned on, the token would then also be stored in the Google account.

This adds a copy of a token that is already readable on the device: anyone holding the unlocked tablet can read it with the developer tools of the browser (README, [Backing up to GitHub](../README.md#backing-up-to-github)). The token can only read and write the backup repository, and it expires after a year.

To avoid the extra copy, turn off history sync on the tablets before the move, or clear the browsing history afterwards.

I found no other way to send it. The new address is a static site, so it receives data only through the address. Sending it between two windows (`postMessage`) would need the new address opened as a window of the old app that stays linked to it. That is unlikely to hold when an installed app opens an address outside itself; it has not been tried.

## Order of work

1. Choose and buy the domain, and point it at the second deployment.
2. Publish the receiving version at the new address. Check that it opens over HTTPS and can be installed.
3. Publish the sending version at the old address. Each tablet moves on its next start with internet.
4. When all tablets have moved, the old address can redirect to the new one, for example by setting the custom domain on this repository. A tablet not opened by then keeps its progress in the old storage; removing the redirect brings the sending version back.

## Work

- `index.html`: sending at the old address and receiving at the new one, next to "moving progress"; the message at each address. About 100 lines.
- `i18n.js`: about 5 new strings in Polish, English, Dutch, Spanish and Persian.
- `sw.js`: no change. It answers only requests to its own address, and the part of an address after `#` is not sent with a request.
- README: a section on the move, and the address in "Running it" and "Installing on a tablet".
- The second deployment (a repository and a GitHub Action, or Cloudflare Pages).
- Tests, with Node: a move link made and read back with Polish and Persian letters, a link received twice, and a link without a token next to a saved connection.

## To check before building

- On an Android tablet: that the browser view opened from the installed app, Chrome itself and the app installed from the new address share their storage. Without this, the progress arrives in the browser view but not in the new app.
- Whether Chrome offers "Install app" in that browser view, or only after "Open in Chrome".
- The size of the move link on a tablet with real progress.
- Whether Chrome keeps the address with the token in its history after the page has removed the hash.

## Not covered

- **iPad.** On an iPad, the app added to the home screen keeps its own storage, separate from Safari and from any other home-screen app. A new home-screen app added from the new address starts empty, and nothing the old app does can store data in it. There the move needs a step by hand, such as copying the move link in the old app and pasting it in the new one.
- **Several browsers on one device.** Each browser keeps its own storage, so the move happens in each browser in which the old address is opened.
