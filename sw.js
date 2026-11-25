// Makes the site installable as a tablet app (with manifest.webmanifest) and opens its shell without a network.
// Network first: a new build is always used when online. Only the app shell is kept (the page, its scripts
// and styles, icons); book pages, videos and sounds are not cached, so the tablet's storage does not fill up.
const CACHE = 'javed-books-shell-v1';
const SHELL = /\/(index\.html|manifest\.webmanifest|site-assets\/[^/]+|assets\/(app-icon-[^/]+|apple-touch-icon\.png|logo[^/]*\.png|loading-owl\.png))$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isPage = request.mode === 'navigate';
  if (!isPage && !SHELL.test(url.pathname)) return;   // books, videos, sounds: the browser as usual
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok) cache.put(isPage ? new URL('index.html', self.registration.scope).href : request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(isPage ? new URL('index.html', self.registration.scope).href : request);
      if (cached) return cached;
      throw error;
    }
  })());
});
