import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pool } from '../src/db/pool.js';

let client;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(7261042)');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory = new URL('../migrations/', import.meta.url);
  for (const name of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) {
    const sql = readFileSync(new URL(name, directory), 'utf8');
    const checksum = createHash('sha256').update(sql.replaceAll('\r\n', '\n')).digest('hex');
    const existing = await client.query('SELECT checksum FROM schema_migrations WHERE name = $1', [name]);
    if (existing.rowCount) {
      if (existing.rows[0].checksum !== checksum) throw new Error('Applied migration was modified.');
      continue;
    }
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [name, checksum]);
    console.log(`Applied ${name}`);
  }
  await client.query('COMMIT');
  console.log('Database migrations are up to date.');
} catch (error) {
  if (client) await client.query('ROLLBACK').catch(() => {});
  console.error(`Migration failed (${error.code || 'connection or migration validation error'}).`);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
