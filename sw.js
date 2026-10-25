/*
 * Service worker: keeps a copy of the app so it starts without internet.
 *
 * App files are fetched from the network first, so updates show up as soon
 * as the tablet is online; the stored copy is used when the network is down
 * or slow. Each launch asks the server whether the files changed, rather than
 * trusting the browser's own copy (which GitHub Pages lets it keep for 10
 * minutes).
 *
 * It removes only its own old copies (those named CACHE_PREFIX...), not
 * other copies stored on the same site. Change CACHE when the list of app
 * files changes.
 */
const CACHE = 'times-table-cards-v16';
const CACHE_PREFIX = 'times-table-cards-';
const APP_FILES = [
  './',
  './index.html',
  './srs.js',
  './voice.js',
  './answer.js',
  './backup.js',
  './move.js',
  './geo.js',
  './i18n.js',
  './i18n-capitals.js',
  './i18n-chemistry.js',
  './i18n-literature.js',
  './i18n-languages.js',
  './i18n-maps.js',
  './i18n-astronomy.js',
  './i18n-biology.js',
  './countries.js',
  './chemistry.js',
  './literature.js',
  './languages-translations.js',
  './languages-recall.js',
  './languages.js',
  './places.js',
  './maps.js',
  './astronomy.js',
  './biology.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './fonts/fonts.css',
  './fonts/grandstander-latin.woff2',
  './fonts/grandstander-latin-ext.woff2',
  './fonts/lexend-latin.woff2',
  './fonts/lexend-latin-ext.woff2',
  './fonts/vazirmatn-arabic.woff2',
];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  // "no-cache" makes the browser check with the server (a short "not modified"
  // answer when nothing changed). The request is rebuilt from its URL, because
  // a page navigation request cannot be copied with new options.
  const fromNetwork = fetch(new Request(request.url, { cache: 'no-cache' })).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  fromNetwork.catch(() => {}); // handled below when the stored copy is used
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  try {
    const response = await Promise.race([fromNetwork, timeout]);
    if (response) return response;
  } catch (e) {
    // offline: fall through to the stored copy
  }
  const stored =
    (await cache.match(request, { ignoreSearch: true })) ||
    (request.mode === 'navigate' ? await cache.match('./index.html') : undefined);
  return stored || fromNetwork;
}
