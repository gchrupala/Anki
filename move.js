/*
 * The move of MaxApki from https://grzegorz.chrupala.me/Anki/ to
 * https://maxapki.top/ (docs/new-address.md). The browser keeps progress
 * separately for each address, so the app at the old address sends it to the
 * new one in the address itself:
 *
 *   https://maxapki.top/#move/<the progress file, gzip, base64url>
 *
 * The progress file is the one of the settings, with two more entries: move,
 * a random id made once for the move, and backup, the connection to the
 * GitHub backup (with its token), so that the backup carries on by itself.
 * The part of an address after # is never sent to a server.
 *
 *   makeLink(file): the move link of a file ({ maxapki, saved, data, move,
 *     backup }), or null if it is too long for the browser.
 *   readLink(code): the text of the file in the part after #move/, or null.
 *   mergeBackup(here, sent): the connection to keep at the new address.
 *
 * Works in the browser (window.MOVE) and in Node (require('./move.js')).
 */
(function (root) {
  'use strict';

  const NEW_ORIGIN = 'https://maxapki.top';
  // https://gchrupala.github.io/Anki/ redirects to the first.
  const OLD_ORIGINS = ['https://grzegorz.chrupala.me'];
  const PREFIX = '#move/';
  // Chrome takes addresses of up to 2 MB.
  const MAX_LINK = 2 * 1024 * 1024;

  const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  async function gzip(text) {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function gunzip(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  // Bytes <-> base64url: letters, digits, - and _, without = at the end.
  function toBase64Url(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromBase64Url(text) {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  }

  async function makeLink(file) {
    const link = NEW_ORIGIN + '/' + PREFIX + toBase64Url(await gzip(JSON.stringify(file)));
    return link.length <= MAX_LINK ? link : null;
  }

  async function readLink(code) {
    if (!/^[A-Za-z0-9_-]+$/.test(code || '')) return null;
    try {
      return await gunzip(fromBase64Url(code));
    } catch (e) {
      return null;
    }
  }

  // The connection that came with a move is kept only if this device has
  // none of its own. It keeps the name of the device that sent it, so its
  // backups replace those of the old address without asking (backup.js).
  const connected = (c) => !!(c && c.repo && c.person && c.token);
  const mergeBackup = (here, sent) => (connected(here) || !connected(sent) ? here : sent);

  const api = { NEW_ORIGIN, OLD_ORIGINS, PREFIX, MAX_LINK, newId, makeLink, readLink, mergeBackup };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MOVE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
