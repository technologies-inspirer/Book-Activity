import assert from 'node:assert/strict';
import { pool } from '../src/db/pool.js';

try {
  const result = await pool.query("SELECT current_database() AS database, to_regclass('public.users') AS users, to_regclass('public.sessions') AS sessions");
  assert.equal(result.rows[0].database, 'book_activity');
  assert.ok(result.rows[0].users && result.rows[0].sessions);
  console.log('PASS: PostgreSQL connection, book_activity database, users and sessions tables.');
} catch (error) {
  console.error(`Database check failed (${error.code || 'missing database/tables'}).`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
