# Backing up progress to GitHub or Google Drive

Design proposal. Nothing here is implemented yet.

## Starting point

Progress lives in `localStorage` only. It is lost when the browser data is cleared or the home-screen app is removed. The settings can already save all progress to one file and load it back ([Moving progress](../README.md#moving-progress)):

- `progressFile()` builds the file: `{ maxapki: 1, saved, data }`, with `max-apps` and the saved state of every app.
- `readProgress(text)` checks a file and says which apps it holds.
- `newerHere(file)` tells whether this device has newer answers or rewards.
- `replaceProgress(file)` stores the file after "Zastąp postępy" (replace progress) and reloads.

A backup only needs a second place to put this file and a way to fetch it back. The format, the checks and the confirmation stay the same.

## Proposal

Add a "Kopia zapasowa" (backup) section to the settings, under "Postępy". It does three things:

1. **Back up**: send the text of `progressFile()` to GitHub or Google Drive.
2. **Restore**: fetch a backup and pass its text to `readProgress()`. From there it is the same as loading a file: the app says when the backup was saved and which apps it holds, warns if this device has newer progress, and stores it only after "Zastąp postępy".
3. **Show status**: the time of the last backup, or why it failed (no internet, token expired).

The backup settings (where to, the token, the time of the last backup) are saved under a new key, `max-backup`. `progressFile()` copies only `max-apps` and the keys of the apps, so the token never ends up in a progress file. "Erase all progress" leaves the backup settings alone.

Each device writes its own file, named after the device (for example `ipad.json`). Two devices then never overwrite each other's backup, and no merging is needed. This matches the current rule: practise on one device at a time.

## GitHub (recommended)

### Setup, once per family

1. Create a private repository, for example `maxapki-backup`.
2. Create a fine-grained personal access token with access to that repository only, permission "Contents: Read and write", and an expiry date (GitHub suggests at most a year).
3. In the settings of MaxApki on each device, enter the repository (`owner/name`), the token and a device name.

No Google or GitHub app has to be registered, and there is no sign-in window.

### Backing up

The page calls the GitHub REST API directly. `api.github.com` accepts requests from other web pages (CORS), so no server is needed.

1. `GET /repos/{owner}/{repo}/contents/{device}.json` with `Accept: application/vnd.github.object` returns the `sha` of the current file (404 if there is none yet). This media type works for files up to 100 MB.
2. `PUT` to the same address with `{ message, content, sha }`, where `content` is the file in base64. The file has Persian and Polish letters, so it is encoded from its UTF-8 bytes (for example with `FileReader.readAsDataURL` on a `Blob`), not with `btoa` on the string.

Each backup is a commit, so the repository keeps every earlier version.

When it runs:

- Automatically, when the app is opened or brought back to the screen (`visibilitychange` to visible), it is online, and the last backup is more than a day old. At most about a day of practice can be lost.
- On request, with a "Zrób kopię teraz" (back up now) button.

Backing up when the app is hidden would lose less, but iPadOS may suspend the page before the request finishes, and `fetch` with `keepalive` is limited to 64 KB.

### Restoring

1. `GET /repos/{owner}/{repo}/contents/` lists the backups, one per device. The user picks one.
2. `GET .../contents/{device}.json` with `Accept: application/vnd.github.raw+json` returns the file as text, which goes to `readProgress()`.

An older version is restored by hand: open the history of the file on GitHub, download that version and load it with "Wczytaj postępy z pliku" (load progress from a file). The app needs no screen for versions.

### Security

- The token can read and write only the backup repository. It cannot touch other repositories or the GitHub account.
- It is stored in `localStorage` on the device. Someone holding the unlocked tablet could read it with developer tools. The page loads no scripts from other sites, which limits the risk of it being read by another page.
- When the token expires, GitHub answers 401, and the status line asks for a new token.

## Google Drive (alternative)

Worth it only if families without a GitHub account should use backups.

### Setup

Once, by the maintainer:

1. Create a Google Cloud project and enable the Drive API.
2. Set up the OAuth consent screen with only the `drive.file` scope. Google lists it as non-sensitive, so it should not need Google review, only basic app details.
3. Create an OAuth client ID of type "Web application", with `https://grzegorz.chrupala.me` as an allowed origin. The client ID is public and goes in `index.html`.

Per family: tap "Połącz z Google Drive" (connect Google Drive) and agree.

With `drive.file` the app sees only the files it created. The backup is a normal file, `MaxApki-ipad.json`, which the parent can see and download in Drive. The `drive.appdata` scope would hide the file in a folder the user cannot open, which makes restoring by hand impossible.

### Backing up and restoring

- First backup: `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` with the name and the file. The returned file id is saved under `max-backup`.
- Later backups: `PATCH https://www.googleapis.com/upload/drive/v3/files/{id}?uploadType=media`. Drive keeps earlier versions of the file for a limited time (30 days or 100 versions by default).
- Restore: `GET https://www.googleapis.com/drive/v3/files/{id}?alt=media`, then `readProgress()` as above. Backups of other devices are found with `GET /drive/v3/files?q=name contains 'MaxApki-'`.

### What makes it harder than GitHub

- **Sign-in each time.** A page without a server gets an access token that lasts about an hour and no refresh token. A backup after that hour needs a Google sign-in step started by a tap, so automatic backups only work while the token is still valid. In practice backups would mostly be done by hand.
- **Sign-in on the iPad home-screen app.** A sign-in in a separate window (the Google Identity Services library) may not return to an app opened from the home screen. Sending the whole page to Google and back avoids that, at the cost of a reload. This has to be tried on the iPad.
- **More setup and code.** A Google Cloud project to keep, about twice the code of the GitHub version, and, with the Google library, the first script on the page from another site.

## Comparison

| | GitHub | Google Drive |
| --- | --- | --- |
| Setup by the maintainer | none | Google Cloud project, consent screen, client ID |
| Setup per family | repository, token, paste into settings | tap and agree |
| Automatic backup | yes | only within an hour of signing in |
| Earlier versions | all, as commits | 30 days or 100 versions |
| Suits | the maintainer's family, users with GitHub | any family with a Google account |

## Work for the GitHub version

- `index.html`: the "Kopia zapasowa" section (repository, token, device name, "Zrób kopię teraz", "Przywróć z kopii", status line), about 100 lines of code next to "moving progress".
- `i18n.js`: about 15 new strings in Polish, English, Dutch, Spanish and Persian.
- `sw.js`: no change. It handles only `GET` requests to its own site, so requests to `api.github.com` pass through.
- README: a "Backing up" section, and the Limitations section updated.
- Tests: the base64 encoding of a file with Persian text, and the choice of when to back up, as small functions that can be tested with Node.

## To check before building

- The size of a backup after long use. Each answer adds about 40 bytes to the review log, so a year of daily practice in several apps comes to a few MB. Upload a file of that size with the contents API once, to confirm it is accepted.
- Whether a token without an expiry date is allowed for a personal account; otherwise the family renews it once a year.
