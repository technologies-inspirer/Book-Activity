import pg from 'pg';
import { requiredEnv } from '../src/config.js';

const appUrl = new URL(requiredEnv('DATABASE_URL'));
const role = decodeURIComponent(appUrl.username);
const database = decodeURIComponent(appUrl.pathname.slice(1));
const password = decodeURIComponent(appUrl.password);
if (!/^[a-z_][a-z0-9_]*$/.test(role) || !/^[a-z_][a-z0-9_]*$/.test(database) || !password) {
  throw new Error('Use lowercase SQL identifiers and a password in DATABASE_URL.');
}
const admin = new pg.Client({ connectionString: requiredEnv('DATABASE_ADMIN_URL'), connectionTimeoutMillis: 5000 });
try {
  await admin.connect();
  const foundRole = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
  if (!foundRole.rowCount) {
    await admin.query(`CREATE ROLE "${role}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password.replaceAll("'", "''")}'`);
  }
  const foundDb = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (!foundDb.rowCount) await admin.query(`CREATE DATABASE "${database}" OWNER "${role}"`);
  console.log('Database and application role are ready. Run npm run db:migrate.');
} catch (error) {
  console.error(`Database setup failed (${error.code || 'connection/configuration error'}).`);
  process.exitCode = 1;
} finally {
  await admin.end();
}
