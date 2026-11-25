/* Only the public reconnect page is cached. Never store authenticated content. */
const CACHE_PREFIX = 'book-activity-offline-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const APP_PATH = '/Book-Activity/';
const OFFLINE_URL = new URL(`${APP_PATH}offline.html`, self.location.origin).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.add(new Request(OFFLINE_URL, { cache: 'reload', credentials: 'omit' }))));
  // Let an updated worker wait until existing readers have closed their tabs.
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))
  )));
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  // APIs, book pages, PDFs, media, uploads and other websites always use the network.
  // Only actual app-shell navigations get a generic offline fallback.
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin ||
      ![APP_PATH, `${APP_PATH}index.html`, `${APP_PATH}app.html`].includes(url.pathname)) return;
  event.respondWith(fetch(request).catch(async () => {
    return (await caches.match(OFFLINE_URL)) || new Response('You are offline. Reconnect to open your books.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }));
});
