import pg from 'pg';
import { requiredEnv } from '../config.js';

export const pool = new pg.Pool({
  connectionString: requiredEnv('DATABASE_URL'),
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

pool.on('error', () => console.error('An idle database connection failed.'));
