const CACHE_NAME = 'sftools-v3.7-admin-auth-fix';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

/* Install — pre-cache core assets */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

/* Activate — clean old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch — network-first for HTML, cache-first for static assets */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Only handle same-origin requests */
  if (url.origin !== location.origin) return;

  /* For navigation requests (SPA pages), serve the main HTML */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    );
    return;
  }

  /* For other assets — cache-first, fallback to network */
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      return res;
    }))
  );
});
