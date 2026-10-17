/*
 * Service worker of StoliceMax: keeps a copy of the app so it starts without
 * internet. It works like ../sw.js (see there), and also keeps the files it
 * shares with MnożenieMax.
 *
 * Both apps store their copies on the same site, so each one removes only
 * its own old copies. Change CACHE when the list of app files changes.
 */
const CACHE = 'capitals-cards-v1';
const CACHE_PREFIX = 'capitals-cards-';
const APP_FILES = [
  './',
  './index.html',
  './i18n-stolice.js',
  './countries.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  '../srs.js',
  '../i18n.js',
  '../fonts/fonts.css',
  '../fonts/grandstander-latin.woff2',
  '../fonts/grandstander-latin-ext.woff2',
  '../fonts/lexend-latin.woff2',
  '../fonts/lexend-latin-ext.woff2',
  '../fonts/vazirmatn-arabic.woff2',
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
