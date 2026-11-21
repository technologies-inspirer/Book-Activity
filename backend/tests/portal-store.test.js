import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/passwords.js';
import { digest } from '../src/auth.js';
import { createPortalStore } from '../../frontend/src/portal/portalStore.js';

test('frontend store creates, edits and restores real accounts across reloads', async () => {
  const key = randomUUID();
  app.set('trust proxy', 'loopback');
  const testIp = `2001:db8:${key.slice(0, 4)}:${key.slice(4, 8)}::2`;
  const adminEmail = `${key}-admin@example.test`;
  const userEmail = `${key}-reader@example.test`;
  const password = randomUUID();
  await pool.query("INSERT INTO users(name,email,password_hash,role) VALUES ('Store Admin',$1,$2,'admin')", [adminEmail, await hashPassword(password)]);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const nativeFetch = globalThis.fetch;
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  globalThis.fetch = async (path, options = {}) => {
    const response = await nativeFetch(new URL(path, base), { ...options, headers: { ...options.headers, Cookie: cookie, 'X-Forwarded-For': testIp } });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return response;
  };
  try {
    const store = createPortalStore();
    await store.initialize();
    assert.equal(store.snapshot().currentId, null);
    assert.equal(store.snapshot().bootError, '');
    assert.equal(await store.signIn(adminEmail, password), 'admin');
    const [id] = await store.importSchools([{ name: 'Store School', email: userEmail, password, allBooks: true, bookIds: [], expires: '', expiresAt: '', modules: ['Books'], principals: [] }]);
    const account = store.snapshot().accounts.find(item => item.id === id);
    assert.equal(account.name, 'Store School');
    // Mirrors the expiry dialog, which sends the complete UI account.
    await store.updateAccess(id, { ...account, expires: '2035-01-02', expiresAt: '2035-01-02T12:30' });
    assert.equal(store.snapshot().accounts.find(item => item.id === id).expiresAt, '2035-01-02T12:30');
    assert.equal(store.snapshot().accounts.find(item => item.id === id).expires, '2035-01-02');
    await store.updateSchool(id, { schoolProfile: { city: 'Lahore' } });
    const reloaded = createPortalStore();
    await reloaded.initialize();
    assert.equal(reloaded.snapshot().currentId, store.snapshot().currentId);
    assert.equal(reloaded.snapshot().accounts.find(item => item.id === id).schoolProfile.city, 'Lahore');
    await reloaded.signOut();
    assert.equal(await store.signIn(userEmail, password), 'user');
    assert.equal(store.snapshot().accounts.length, 1);
    await store.updateProfile({ name: 'Updated Reader', email: userEmail });
    const readerReloaded = createPortalStore();
    await readerReloaded.initialize();
    assert.equal(readerReloaded.snapshot().accounts[0].name, 'Updated Reader');
    const profileImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC90AAAAASUVORK5CYII=';
    await readerReloaded.updateProfile({ profileImage });
    const photoReloaded = createPortalStore(); await photoReloaded.initialize();
    assert.equal(photoReloaded.snapshot().accounts[0].profileImage, profileImage);
    await assert.rejects(photoReloaded.updateProfile({ profileImage: 'data:image/svg+xml;base64,PHN2Zz4=' }), /PNG/);
    await photoReloaded.updateProfile({ profileImage: '' });
    assert.equal(photoReloaded.snapshot().accounts[0].profileImage, '');
    await readerReloaded.changePassword(password, 'Changed-Password-For-Test');
    await readerReloaded.signOut();
    await assert.rejects(readerReloaded.signIn(userEmail, password));
    assert.equal(await readerReloaded.signIn(userEmail, 'Changed-Password-For-Test'), 'user');
    await readerReloaded.signOut();
  } finally {
    globalThis.fetch = nativeFetch;
    await pool.query('DELETE FROM users WHERE email=ANY($1::text[])', [[adminEmail, userEmail]]);
    await pool.query('DELETE FROM login_attempts WHERE key=ANY($1::text[])', [[digest(`ip:${testIp}`), ...[adminEmail, userEmail].map(email => digest(`email:${email}`))]]);
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
