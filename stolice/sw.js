/*
 * StoliceMax had its own address and offline copy here for a short time. It
 * is now part of the app one level up, which keeps the offline copy of both
 * apps (../sw.js). A device that still has the old worker gets this one,
 * which removes the old copy and then itself.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('capitals-cards-')).map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
  );
});
