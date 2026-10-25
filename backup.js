/*
 * Backup of the progress in a private GitHub repository, through the GitHub
 * REST API and a fine-grained personal access token. It follows the sync of
 * Myo (https://github.com/gchrupala/myo, js/sync.js). The backup is the
 * progress file of the settings, stored as maxapki.json, with the name of
 * the device that wrote it. Each backup is a commit, so the repository
 * keeps every earlier version.
 *
 * Progress from two devices cannot be merged. So a device replaces the
 * backup only if it wrote that backup itself, restored it, or is told to:
 *
 *   backupOnce({ remote, text, device, known, overwrite, message }): known
 *     is the sha of the backup this device last wrote or restored (null if
 *     none). Returns { sha } once the backup is written, or { conflict }
 *     with the backup ({ text, sha }) if another device wrote it since.
 *
 * Works in the browser (window.BACKUP) and in Node (require('./backup.js')).
 */
(function (root) {
  'use strict';

  const API = 'https://api.github.com';
  const PATH = 'maxapki.json';

  // kind: 'auth' (bad or expired token), 'forbidden' (no write access),
  // 'notFound' (no such repository or no access to it), 'public' (the
  // repository is public), 'conflict' (the file changed meanwhile),
  // 'network' (offline or unreachable), 'bad' (anything else).
  class BackupError extends Error {
    constructor(kind, status = 0) {
      super(kind);
      this.kind = kind;
      this.status = status;
    }
  }

  const KIND_BY_STATUS = { 401: 'auth', 403: 'forbidden', 404: 'notFound', 409: 'conflict', 422: 'conflict' };

  // "https://github.com/owner/name(.git)" or "owner/name" -> "owner/name", or
  // null when it is neither.
  function parseRepo(input) {
    const s = String(input == null ? '' : input)
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\/+$/, '')
      .replace(/\.git$/i, '');
    return /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(s) ? s : null;
  }

  // UTF-8 text <-> base64, which the contents API uses.
  function toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }

  function fromBase64(b64) {
    const binary = atob(String(b64).replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  }

  // A short fingerprint of a text (FNV-1a, 32 bits), to tell whether the
  // progress changed since the last backup.
  function fingerprint(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  // The device that wrote a backup, or null if it does not say.
  function deviceOf(text) {
    try {
      const file = JSON.parse(text);
      return (file && typeof file.device === 'string' && file.device) || null;
    } catch (e) {
      return null;
    }
  }

  function gitHubRemote({ repo, token, path = PATH, fetch: fetchFn = (...a) => root.fetch(...a) }) {
    const headers = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const repoUrl = API + '/repos/' + repo;
    const fileUrl = repoUrl + '/contents/' + encodeURIComponent(path);

    // no-store: a cached GET would return an old sha right after a backup.
    async function call(url, options = {}) {
      try {
        return await fetchFn(url, { cache: 'no-store', ...options, headers: { ...headers, ...options.headers } });
      } catch (e) {
        throw new BackupError('network');
      }
    }
    const fail = (res) => {
      throw new BackupError(KIND_BY_STATUS[res.status] || 'bad', res.status);
    };

    return {
      // The repository must exist, be reachable with the token and be private.
      async checkRepo() {
        const res = await call(repoUrl);
        if (!res.ok) fail(res);
        const info = await res.json();
        if (!info.private) throw new BackupError('public');
      },

      // The sha of the backup, or null when there is none yet. It is read
      // from the list of files, which does not bring their content.
      async sha() {
        const res = await call(repoUrl + '/contents/');
        if (res.status === 404) return null; // an empty repository
        if (!res.ok) fail(res);
        const list = await res.json();
        const entry = Array.isArray(list) ? list.find((f) => f.name === path && f.type === 'file') : null;
        return entry ? entry.sha : null;
      },

      // { text, sha } of the backup, or null when there is none yet.
      async pull() {
        const res = await call(fileUrl);
        if (res.status === 404) return null;
        if (!res.ok) fail(res);
        const meta = await res.json();
        let text = meta.content ? fromBase64(meta.content) : null;
        if (text === null) {
          // Files over 1 MB come without content; fetch them raw.
          const raw = await call(fileUrl, { headers: { Accept: 'application/vnd.github.raw+json' } });
          if (!raw.ok) fail(raw);
          text = await raw.text();
        }
        return { text, sha: meta.sha };
      },

      // Writes the backup; sha is the version it replaces (none for a new file).
      async push(text, sha, message) {
        const body = { message, content: toBase64(text) };
        if (sha) body.sha = sha;
        const res = await call(fileUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) fail(res);
        const written = await res.json();
        return (written && written.content && written.content.sha) || null;
      },
    };
  }

  // One backup. A backup this device does not know (another sha than the
  // one it last wrote or restored) is replaced only if this device wrote it
  // after all (its answer to the last backup got lost), or with overwrite.
  async function backupOnce({ remote, text, device, known = null, overwrite = false, message }) {
    const current = await remote.sha();
    if (current && current !== known && !overwrite) {
      const pulled = await remote.pull();
      if (pulled && deviceOf(pulled.text) !== device) return { conflict: pulled };
    }
    return { sha: await remote.push(text, current, message) };
  }

  const api = { PATH, BackupError, parseRepo, toBase64, fromBase64, fingerprint, deviceOf, gitHubRemote, backupOnce };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BACKUP = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
