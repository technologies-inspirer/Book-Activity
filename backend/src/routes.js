import { Router } from 'express';
import { pool } from './db/pool.js';
import { createSession, requireAuth, requireAdmin, requireCsrf, publicUser, csrfFor, tokenFrom, digest, clearSession, fail } from './auth.js';
import { hashPassword, verifyPassword, dummyHash } from './passwords.js';
import { identity, metadata, permissions, image } from './accounts.js';
import { canRead, catalog } from './catalog.js';
import { searchCities } from './locations.js';
import { libraryRoutes } from './libraryRoutes.js';
import { allSeries, learningState, publishedAllowed } from './learning.js';

export const api = Router();
api.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });

async function transaction(action) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await action(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
async function limitLogin(request, email) {
  const keys = [`ip:${request.ip}`, `email:${email}`];
  for (const [index, key] of keys.entries()) {
    const { rows: [row] } = await pool.query("INSERT INTO login_attempts (key, attempts) VALUES ($1, 1) ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN login_attempts.window_start < now() - interval '15 minutes' THEN 1 ELSE login_attempts.attempts + 1 END, window_start = CASE WHEN login_attempts.window_start < now() - interval '15 minutes' THEN now() ELSE login_attempts.window_start END RETURNING attempts", [digest(key)]);
    if (row.attempts > (index === 0 ? 100 : 10)) throw fail(429, 'Too many sign-in attempts. Please try again in 15 minutes.');
  }
  await pool.query("DELETE FROM login_attempts WHERE window_start < now() - interval '1 day'");
}
api.post('/auth/login', async (request, response) => {
  const { email: rawEmail, password } = request.body || {};
  if (typeof rawEmail !== 'string' || rawEmail.length > 254 || typeof password !== 'string' || password.length > 128) throw fail(400, 'Enter your email and password.');
  const email = rawEmail.trim().toLowerCase();
  await limitLogin(request, email);
  const { rows: [found] } = await pool.query('SELECT * FROM users WHERE lower(email) = $1', [email]);
  const valid = await verifyPassword(password, found?.password_hash || dummyHash);
  if (!found || !valid || !found.enabled || (found.expires_at && found.expires_at <= new Date())) throw fail(401, 'Email or password is incorrect, or account access is unavailable.');
  const result = await transaction(async client => {
    const { rows: [user] } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [found.id]);
    if (user.password_hash !== found.password_hash || !user.enabled || (user.expires_at && user.expires_at <= new Date())) throw fail(401, 'Account access changed. Please sign in again.');
    const csrfToken = await createSession(client, user.id, request, response);
    return { account: publicUser(user), csrfToken };
  });
  await pool.query('DELETE FROM login_attempts WHERE key = $1', [digest(`email:${email}`)]);
  response.json(result);
});

api.use(requireAuth);
api.get('/locations/cities', requireAdmin, (request, response) => response.json(searchCities(request.query.state, request.query.q || '')));
api.get('/auth/me', (request, response) => response.json({ account: publicUser(request.user), csrfToken: csrfFor(request.sessionToken) }));
api.use((request, response, next) => ['GET', 'HEAD'].includes(request.method) ? next() : requireCsrf(request, response, next));
api.use(libraryRoutes);
api.post('/auth/logout', async (request, response) => {
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [digest(tokenFrom(request))]);
  clearSession(response); response.json({ ok: true });
});
api.get('/admin/users', requireAdmin, async (_request, response) => {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  response.json({ accounts: rows.map(publicUser) });
});
async function insertAccount(client, input) {
  if (input.role && input.role !== 'user') throw fail(400, 'Only user accounts can be created here.');
  const { name, email } = identity(input);
  const passwordHash = await hashPassword(input.password);
  const access = permissions(input);
  const learning = await learningState(client);
  const extra = metadata(input, {}, false, allSeries(learning), learning);
  const { rows: [user] } = await client.query("INSERT INTO users (name, email, password_hash, role, all_books, book_ids, expires_at, metadata) VALUES ($1, $2, $3, 'user', $4, $5, $6, $7) RETURNING *", [name, email, passwordHash, access.allBooks, access.bookIds, access.expiresAt, extra]);
  return publicUser(user);
}
api.post('/admin/users', requireAdmin, async (request, response) => {
  const account = await transaction(client => insertAccount(client, request.body));
  response.status(201).json({ account });
});
api.post('/admin/users/import', requireAdmin, async (request, response) => {
  const inputs = request.body.accounts;
  if (!Array.isArray(inputs) || !inputs.length || inputs.length > 500) throw fail(400, 'Import between 1 and 500 accounts.');
  const accounts = await transaction(async client => {
    const results = []; for (const input of inputs) results.push(await insertAccount(client, input)); return results;
  });
  response.status(201).json({ accounts });
});
const validId = (request, _response, next) => { if (!/^[a-f0-9-]{36}$/i.test(request.params.id)) throw fail(400, 'Invalid account ID.'); next(); };
api.patch('/admin/users/:id', requireAdmin, validId, async (request, response) => {
  if ('role' in request.body || 'password_hash' in request.body) throw fail(400, 'Role and password hash cannot be changed here.');
  const account = await transaction(async client => {
    const { rows: [user] } = await client.query("SELECT * FROM users WHERE id = $1 AND role = 'user' FOR UPDATE", [request.params.id]);
    if (!user) throw fail(404, 'User account not found.');
    const details = identity({ name: request.body.name ?? user.name, email: request.body.email ?? user.email });
    const access = permissions(request.body, user);
    const learning = await learningState(client);
    const extra = metadata(request.body, user.metadata, false, allSeries(learning), learning);
    if (request.body.isHeadSchool) await client.query("UPDATE users SET metadata=metadata || '{\"isHeadSchool\":false}'::jsonb WHERE role='user' AND id<>$1", [user.id]);
    const enabled = request.body.enabled ?? user.enabled;
    if (typeof enabled !== 'boolean') throw fail(400, 'Choose a valid account status.');
    const { rows: [updated] } = await client.query('UPDATE users SET name=$2, email=$3, enabled=$4, all_books=$5, book_ids=$6, expires_at=$7, metadata=$8, updated_at=now() WHERE id=$1 RETURNING *', [user.id, details.name, details.email, enabled, access.allBooks, access.bookIds, access.expiresAt, extra]);
    if (!enabled || (access.expiresAt && access.expiresAt <= new Date())) await client.query('DELETE FROM sessions WHERE user_id=$1', [user.id]);
    return publicUser(updated);
  });
  response.json({ account });
});
api.post('/admin/users/:id/reset-password', requireAdmin, validId, async (request, response) => {
  const hash = await hashPassword(request.body.password);
  await transaction(async client => {
    const result = await client.query("UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1 AND role='user' RETURNING id", [request.params.id, hash]);
    if (!result.rowCount) throw fail(404, 'User account not found.');
    await client.query('DELETE FROM sessions WHERE user_id=$1', [request.params.id]);
  });
  response.json({ ok: true });
});
api.patch('/me', async (request, response) => {
  const allowed = ['name', 'email', 'schoolProfile', 'schoolLogo', 'profileImage'];
  if (Object.keys(request.body).some(key => !allowed.includes(key))) throw fail(400, 'Only your profile details can be updated here.');
  const account = await transaction(async client => {
    const { rows: [user] } = await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [request.user.id]);
    const details = identity({ name: request.body.name ?? user.name, email: request.body.email ?? user.email });
    const extra = metadata(request.body, user.metadata, true);
    const { rows: [updated] } = await client.query('UPDATE users SET name=$2, email=$3, metadata=$4, updated_at=now() WHERE id=$1 RETURNING *', [user.id, details.name, details.email, extra]);
    return publicUser(updated);
  });
  response.json({ account });
});
api.post('/me/password', async (request, response) => {
  const { current, password } = request.body;
  const hash = await hashPassword(password);
  const csrfToken = await transaction(async client => {
    const { rows: [user] } = await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [request.user.id]);
    if (!await verifyPassword(current, user.password_hash)) throw fail(400, 'The current password is incorrect.');
    await client.query('UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1', [user.id, hash]);
    await client.query('DELETE FROM sessions WHERE user_id=$1', [user.id]);
    return createSession(client, user.id, request, response);
  });
  response.json({ csrfToken });
});
api.get('/me/progress', async (request, response) => {
  const { rows: [progress] } = await pool.query('SELECT book_id AS "bookId", page FROM user_progress WHERE user_id=$1', [request.user.id]);
  response.json({ progress: progress && await readableBook(request.user, progress.bookId) ? progress : null });
});
async function readableBook(user, id) {
  const original = catalog.find(item => item.id === id);
  if (original) return canRead(user, id) ? original : null;
  if (!/^[a-f0-9-]{36}$/i.test(id || '')) return null;
  const { rows: [book] } = await pool.query('SELECT id,series_id,class_id,subject_id,page_count FROM published_books WHERE id=$1', [id]);
  return book && publishedAllowed(user, book) ? { ...book, pages: book.page_count } : null;
}
api.put('/me/progress', async (request, response) => {
  const { bookId, page } = request.body;
  const book = await readableBook(request.user, bookId);
  if (!book) throw fail(403, 'This book is not in your library.');
  if (!Number.isInteger(page) || page < 0 || page >= book.pages) throw fail(400, 'Invalid book page.');
  await pool.query('INSERT INTO user_progress (user_id, book_id, page) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO UPDATE SET book_id=$2,page=$3,updated_at=now()', [request.user.id, bookId, page]);
  response.json({ ok: true });
});
api.get('/organization', async (_request, response) => {
  const { rows: [row] } = await pool.query("SELECT value FROM portal_settings WHERE key='organization'");
  response.json({ profile: row?.value || {} });
});
api.patch('/organization', requireAdmin, async (request, response) => {
  const profile = metadata({ schoolProfile: request.body }).schoolProfile;
  for (const key of ['logo', 'letterHead']) if (key in request.body) profile[key] = image(request.body[key]);
  await pool.query("INSERT INTO portal_settings (key,value) VALUES ('organization',$1) ON CONFLICT (key) DO UPDATE SET value=portal_settings.value || EXCLUDED.value", [profile]);
  response.json({ ok: true });
});
