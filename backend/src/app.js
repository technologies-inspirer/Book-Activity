import express from 'express';
import { pool } from './db/pool.js';
import { api } from './routes.js';
import { checkOrigin } from './auth.js';
import { protectedFiles, frontendRoot } from './files.js';
import { join, posix } from 'node:path';
import { existsSync } from 'node:fs';

export const app = express();

app.disable('x-powered-by');
app.use((_request, response, next) => {
  response.set('X-Content-Type-Options', 'nosniff');
  response.set('Referrer-Policy', 'same-origin');
  response.set('X-Frame-Options', 'DENY');
  next();
});
app.use('/api', checkOrigin, express.json({ limit: '6mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'book-activity-backend' });
});

app.get('/api/health/db', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch {
    response.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

app.use('/api/files', ...protectedFiles);
app.use('/api', api);

// Production serves the build through Express so raw book/media URLs stay protected.
app.use('/Book-Activity', (request, response, next) => {
  let path;
  try { path = posix.normalize(decodeURIComponent(request.path).replaceAll('\\', '/')); } catch { return next(Object.assign(new Error('Invalid file path.'), { status: 400 })); }
  if (/^\/+(books|videos|sounds)(\/|$)/i.test(path)) {
    let index = 0;
    const run = error => error ? next(error) : protectedFiles[index++]?.(request, response, run);
    return run();
  }
  next();
});
const buildRoot = join(frontendRoot, 'dist');
if (existsSync(join(buildRoot, 'index.html'))) app.use('/Book-Activity', express.static(buildRoot, { index: 'index.html' }));

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found' });
});

app.use((error, _request, response, _next) => {
  const status = error.code === '23505' ? 409 : error.status || (['ECONNREFUSED', '57P01', '53300'].includes(error.code) ? 503 : 500);
  if (status >= 500) console.error(`Request failed (${error.code || 'internal error'}).`);
  const message = status === 409 ? 'An account with this email already exists.' : status === 404 ? 'Resource not found.' : status >= 500 ? 'The service is temporarily unavailable. Please try again.' : error.type === 'entity.parse.failed' ? 'Send valid JSON request data.' : error.message;
  response.status(status).json({ error: message });
});
