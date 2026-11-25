import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createInstallController } from '../src/pwa/install.js';

function browser({ ios = false, installed = false } = {}) {
  const target = new EventTarget();
  const media = new EventTarget();
  media.matches = installed;
  target.matchMedia = () => media;
  target.navigator = { userAgent: ios ? 'iPhone' : 'Chrome', standalone: installed };
  return target;
}

test('install prompt is consumed once and can be offered again after dismissal', async () => {
  const win = browser();
  const controller = createInstallController(win);
  assert.equal(controller.getSnapshot().available, true);
  assert.equal(controller.getSnapshot().manual, true);
  let prompted = 0;
  function offer() {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { prompted++; };
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    win.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
  }
  offer();
  assert.equal(controller.getSnapshot().available, true);
  assert.equal(controller.getSnapshot().manual, false);
  await Promise.all([controller.install(), controller.install()]);
  assert.equal(prompted, 1);
  assert.equal(controller.getSnapshot().busy, false);
  assert.equal(controller.getSnapshot().available, true);
  assert.equal(controller.getSnapshot().manual, true);
  offer();
  await controller.install();
  assert.equal(prompted, 2);
  win.dispatchEvent(new Event('appinstalled'));
  assert.equal(controller.getSnapshot().installed, true);
  assert.equal(controller.getSnapshot().available, false);
});

test('iOS offers manual installation while standalone app is already installed', () => {
  const ios = createInstallController(browser({ ios: true }));
  assert.equal(ios.getSnapshot().available, true);
  assert.equal(ios.getSnapshot().manual, true);
  assert.match(ios.getSnapshot().instructions, /Safari/);
  const installed = createInstallController(browser({ installed: true }));
  assert.equal(installed.getSnapshot().installed, true);
});

test('desktop and Android offer installation guidance before a native prompt is available', async () => {
  for (const userAgent of ['Chrome Windows', 'Chrome Android', 'Firefox Linux']) {
    const win = browser();
    win.navigator.userAgent = userAgent;
    const controller = createInstallController(win);
    assert.equal(controller.getSnapshot().available, true);
    assert.equal(controller.getSnapshot().manual, true);
    assert.match(controller.getSnapshot().instructions, /browser menu/);
    await controller.install();
    assert.equal(controller.getSnapshot().available, true);
  }
});

test('installation completed during prompt keeps the install suggestion hidden', async () => {
  const win = browser();
  const controller = createInstallController(win);
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = async () => { win.dispatchEvent(new Event('appinstalled')); };
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  win.dispatchEvent(event);
  await controller.install();
  assert.equal(controller.getSnapshot().installed, true);
  assert.equal(controller.getSnapshot().available, false);
});

test('failed prompt clears pending state without preventing normal app usage', async () => {
  const win = browser();
  const controller = createInstallController(win);
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = async () => { throw new Error('Browser refused'); };
  win.dispatchEvent(event);
  await assert.rejects(controller.install(), /Browser refused/);
  assert.equal(controller.getSnapshot().busy, false);
  await controller.install();
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
