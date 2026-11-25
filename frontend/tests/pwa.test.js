import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { registerPwa } from '../src/pwa/install.js';

test('native browser install UI is not intercepted and worker uses the deployment scope', async () => {
  const browser = new EventTarget();
  const calls = [];
  const registration = { scope: 'https://school.example/Book-Activity/' };
  browser.isSecureContext = true;
  browser.navigator = { serviceWorker: { async register(...args) { calls.push(args); return registration; } } };
  assert.equal(await registerPwa(browser, true, '/Book-Activity/'), registration);
  assert.deepEqual(calls, [['/Book-Activity/sw.js', { scope: '/Book-Activity/', updateViaCache: 'none' }]]);
  const event = new Event('beforeinstallprompt', { cancelable: true });
  browser.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
});

test('unsupported browsers, insecure HTTP and development skip worker registration', () => {
  const fail = () => assert.fail('Unexpected service-worker registration');
  assert.equal(registerPwa({ isSecureContext: true, navigator: {} }, true, '/Book-Activity/'), undefined);
  const browser = { isSecureContext: false, navigator: { serviceWorker: { register: fail } } };
  assert.equal(registerPwa(browser, true, '/Book-Activity/'), undefined);
  browser.isSecureContext = true;
  assert.equal(registerPwa(browser, false, '/Book-Activity/'), undefined);
});

test('worker registration failure does not prevent normal website startup', async t => {
  const warnings = t.mock.method(console, 'warn', () => {});
  const browser = { isSecureContext: true, navigator: { serviceWorker: {
    async register() { throw new Error('Browser refused'); }
  } } };
  await assert.doesNotReject(async () => registerPwa(browser, true, '/Book-Activity/'));
  assert.equal(warnings.mock.calls.length, 1);
});

async function worker() {
  const handlers = {};
  const writes = [];
  const removed = [];
  const fallback = new Response('Reconnect');
  let online = true;
  vm.runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { location: { origin: 'https://school.example' }, addEventListener: (name, handler) => { handlers[name] = handler; } },
    URL, Request, Response,
    caches: {
      open: async () => ({ add: async request => { writes.push(request); } }),
      keys: async () => ['book-activity-offline-v0', 'book-activity-offline-v1', 'ats-cache'],
      delete: async key => { removed.push(key); },
      match: async () => fallback
    },
    fetch: async () => { if (!online) throw new Error('Offline'); return new Response('Online'); }
  });
  return { handlers, writes, removed, offline() { online = false; } };
}

test('worker precaches only public offline page and deletes only its own old caches', async () => {
  const sw = await worker();
  let pending;
  sw.handlers.install({ waitUntil(promise) { pending = promise; } });
  await pending;
  assert.equal(sw.writes.length, 1);
  assert.equal(new URL(sw.writes[0].url).pathname, '/Book-Activity/offline.html');
  assert.equal(sw.writes[0].credentials, 'omit');
  sw.handlers.activate({ waitUntil(promise) { pending = promise; } });
  await pending;
  assert.deepEqual(sw.removed, ['book-activity-offline-v0']);
});

test('worker never intercepts API, protected books, media, POST or another app', async () => {
  const sw = await worker();
  sw.offline();
  for (const [path, mode, method] of [
    ['/api/auth/me', 'cors', 'GET'], ['/api/library/books/1/archive', 'cors', 'GET'],
    ['/Book-Activity/books/page.jpg', 'cors', 'GET'], ['/Book-Activity/books/book.pdf', 'navigate', 'GET'],
    ['/Book-Activity/sounds/a.mp3', 'cors', 'GET'], ['/Book-Activity/videos/a.mp4', 'cors', 'GET'],
    ['/Book-Activity/site-assets/app.js', 'cors', 'GET'], ['/', 'navigate', 'GET'],
    ['/Book-Activity/', 'navigate', 'POST'], ['https://other.example/Book-Activity/', 'navigate', 'GET']
  ]) {
    sw.handlers.fetch({ request: { url: new URL(path, 'https://school.example').href, mode, method }, respondWith() { assert.fail(`Intercepted ${path}`); } });
  }
});

test('online navigations stay fresh; offline app launches show reconnect fallback', async () => {
  const sw = await worker();
  let response;
  const navigate = () => sw.handlers.fetch({
    request: { url: 'https://school.example/Book-Activity/?from=home', mode: 'navigate', method: 'GET' },
    respondWith(promise) { response = promise; }
  });
  navigate();
  assert.equal(await (await response).text(), 'Online');
  sw.offline();
  navigate();
  assert.equal(await (await response).text(), 'Reconnect');
});

test('manifest keeps the deployment scope, permits both orientations and includes install icons', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.scope, '/Book-Activity/');
  assert.equal(manifest.start_url, manifest.scope);
  assert.equal(manifest.id, manifest.scope);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'any');
  for (const icon of manifest.icons) {
    const png = await readFile(new URL(`../public/${icon.src}`, import.meta.url));
    const [width, height] = icon.sizes.split('x').map(Number);
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
  }
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
});
