import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { pool } from '../src/db/pool.js';
import { app } from '../src/app.js';

after(() => pool.end());

async function transaction(action) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await action(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

const email = () => `${randomUUID()}@example.test`;
const addUser = (client, address) => client.query("INSERT INTO users (name, email, password_hash) VALUES ('Test reader', $1, 'test-only-placeholder') RETURNING id, role, enabled", [address]);

test('Express health routes respond over HTTP with a working database', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const live = await fetch(`${base}/api/health`);
    assert.equal(live.status, 200);
    const response = await fetch(`${base}/api/health/db`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', database: 'connected' });
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('application connection has no administrator, role creation or database creation privileges', async () => {
  const { rows: [role] } = await pool.query('SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = current_user');
  assert.deepEqual(role, { rolsuper: false, rolcreatedb: false, rolcreaterole: false });
});

test('new accounts default to active user and duplicate email casing is rejected', async () => {
  await transaction(async client => {
    const address = email();
    const { rows: [user] } = await addUser(client, address);
    assert.equal(user.role, 'user');
    assert.equal(user.enabled, true);
    await assert.rejects(addUser(client, address.toUpperCase()), { code: '23505' });
  });
});

test('sessions reference valid users and are deleted with their account', async () => {
  await transaction(async client => {
    const { rows: [user] } = await addUser(client, email());
    const token = 'a'.repeat(64);
    await client.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [token, user.id]);
    await client.query('DELETE FROM users WHERE id = $1', [user.id]);
    const result = await client.query('SELECT 1 FROM sessions WHERE token_hash = $1', [token]);
    assert.equal(result.rowCount, 0);
    await assert.rejects(client.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [token, user.id]), { code: '23503' });
  });
});
