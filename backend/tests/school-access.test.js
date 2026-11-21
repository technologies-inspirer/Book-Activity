import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/passwords.js';
import { digest } from '../src/auth.js';
import { catalog } from '../src/catalog.js';
import { seriesOf } from '../../frontend/src/data/series.js';
import { availableBooks } from '../../frontend/src/portal/demoStore.js';
import { searchCities } from '../src/locations.js';

test('Pakistan city search covers all seven provinces/regions and rejects unknown states', () => {
  for (const [state, city] of [['Punjab', 'Lahore'], ['Sindh', 'Karachi'], ['Khyber Pakhtunkhwa', 'Peshawar'], ['Balochistan', 'Quetta'], ['Islamabad Capital Territory', 'Islamabad'], ['Gilgit-Baltistan', 'Gilgit'], ['Azad Jammu and Kashmir', 'Muzaffarabad']]) {
    assert.ok(searchCities(state, city).cities.includes(city), `${city} belongs to ${state}`);
  }
  const many = searchCities('Punjab');
  assert.ok(many.total > many.cities.length);
  assert.ok(many.cities.length <= 60);
  assert.throws(() => searchCities('Unknown state'), { status: 400 });
});

test('school series permissions persist, enforce direct file access and accept short passwords', async () => {
  const key = randomUUID();
  const adminEmail = `${key}-admin@example.test`, readerEmail = `${key}-reader@example.test`;
  const testIp = `2001:db8:${key.slice(0, 4)}:${key.slice(4, 8)}::3`;
  app.set('trust proxy', 'loopback');
  const { rows: [admin] } = await pool.query("INSERT INTO users(name,email,password_hash,role) VALUES ('Series test admin',$1,$2,'admin') RETURNING id", [adminEmail, await hashPassword('1')]);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const makeClient = () => {
    let cookie = '', token = '';
    return async (path, method = 'GET', body) => {
      const response = await fetch(base + path, { method, headers: { Cookie: cookie, 'X-CSRF-Token': token, 'X-Forwarded-For': testIp, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      const data = response.headers.get('content-type')?.includes('json') ? await response.json() : await response.arrayBuffer();
      if (data.csrfToken) token = data.csrfToken;
      return { status: response.status, data };
    };
  };
  const adminCall = makeClient(), reader = makeClient();
  const maxford = catalog.find(book => seriesOf(book).id === 'maxford');
  const stemford = catalog.find(book => seriesOf(book).id === 'stemford');
  const file = book => `/api/files/${book.dir}/p001.jpg`;
  try {
    assert.equal((await adminCall('/api/auth/login', 'POST', { email: adminEmail, password: '1' })).status, 200);
    const cities = await adminCall('/api/locations/cities?state=Sindh&q=Karachi');
    assert.equal(cities.status, 200); assert.ok(cities.data.cities.includes('Karachi'));
    const input = { name: 'Series School', email: readerEmail, password: '1', allowedSeriesIds: ['maxford'], schoolProfile: { country: 'Pakistan', state: 'Sindh', city: 'Karachi' } };
    assert.equal((await adminCall('/api/admin/users', 'POST', { ...input, allowedSeriesIds: ['unknown'] })).status, 400);
    assert.equal((await adminCall('/api/admin/users', 'POST', { ...input, schoolProfile: { country: 'Pakistan', state: 'Sindh', city: 'Not a real choice 999' } })).status, 400);
    const created = await adminCall('/api/admin/users', 'POST', input);
    assert.equal(created.status, 201);
    const id = created.data.account.id;
    assert.deepEqual(created.data.account.allowedSeriesIds, ['maxford']);
    assert.equal((await reader('/api/auth/login', 'POST', { email: readerEmail, password: '1' })).status, 200);
    assert.equal((await reader(file(maxford))).status, 200);
    assert.equal((await reader(file(stemford))).status, 403);
    let me = (await reader('/api/auth/me')).data.account;
    assert.ok(availableBooks(me, catalog).every(book => seriesOf(book).id === 'maxford'));
    assert.equal((await reader('/api/me', 'PATCH', { allowedSeriesIds: ['stemford'] })).status, 400);
    assert.equal((await reader('/api/locations/cities?state=Sindh&q=Karachi')).status, 403);
    assert.equal((await adminCall(`/api/admin/users/${id}`, 'PATCH', { allowedSeriesIds: ['stemford'] })).status, 200);
    assert.equal((await reader(file(maxford))).status, 403);
    assert.equal((await reader(file(stemford))).status, 200);
    me = (await reader('/api/auth/me')).data.account;
    assert.ok(availableBooks(me, catalog).every(book => seriesOf(book).id === 'stemford'));
    await adminCall(`/api/admin/users/${id}`, 'PATCH', { allowedSeriesIds: [] });
    assert.equal((await reader(file(stemford))).status, 403);
    assert.equal(availableBooks((await reader('/api/auth/me')).data.account, catalog).length, 0);
    assert.equal((await adminCall('/api/admin/users', 'POST', { ...input, email: `${key}-blank@example.test`, password: ' ' })).status, 400);
  } finally {
    await pool.query('DELETE FROM users WHERE email=ANY($1::text[])', [[adminEmail, readerEmail, `${key}-blank@example.test`]]);
    await pool.query('DELETE FROM login_attempts WHERE key=ANY($1::text[])', [[digest(`ip:${testIp}`), digest(`email:${adminEmail}`), digest(`email:${readerEmail}`)]]);
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
