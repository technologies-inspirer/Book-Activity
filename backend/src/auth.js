import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { pool } from './db/pool.js';

export const cookieName = 'ba_session';
export const digest = token => createHash('sha256').update(token).digest('hex');
export const csrfFor = token => digest(`csrf:${token}`);
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
export const fail = (status, message) => Object.assign(new Error(message), { status });
export function clearSession(response) { response.clearCookie(cookieName, cookieOptions); }
export function tokenFrom(request) {
  const value = (request.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
}
export async function createSession(client, userId, request, response) {
  const old = tokenFrom(request);
  if (old) await client.query('DELETE FROM sessions WHERE token_hash = $1', [digest(old)]);
  await client.query('DELETE FROM sessions WHERE expires_at <= now()');
  const token = randomBytes(32).toString('hex');
  await client.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '12 hours')", [digest(token), userId]);
  response.cookie(cookieName, token, { ...cookieOptions, maxAge: 12 * 60 * 60 * 1000 });
  return csrfFor(token);
}
export async function requireAuth(request, response, next) {
  const token = tokenFrom(request);
  if (!token) throw fail(401, 'Please sign in to continue.');
  const { rows: [user] } = await pool.query('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now() AND u.enabled AND (u.expires_at IS NULL OR u.expires_at > now())', [digest(token)]);
  if (!user) { clearSession(response); throw fail(401, 'Your session has ended or access is unavailable. Please sign in again.'); }
  request.user = user;
  request.sessionToken = token;
  next();
}
export function requireAdmin(request, _response, next) {
  if (request.user.role !== 'admin') throw fail(403, 'Administrator access is required.');
  next();
}
export function requireCsrf(request, _response, next) {
  const supplied = request.get('x-csrf-token') || '';
  const expected = csrfFor(request.sessionToken);
  if (!/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw fail(403, 'Please refresh the page and try again.');
  next();
}
export function checkOrigin(request, _response, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
  const origins = (process.env.APP_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001').split(',').map(value => value.trim());
  if (request.get('sec-fetch-site') === 'cross-site' || (request.get('origin') && !origins.includes(request.get('origin')))) throw fail(403, 'Requests from this origin are not allowed.');
  if (!request.is('application/json')) throw fail(415, 'Send requests as JSON.');
  next();
}
export function publicUser(row) {
  return { ...row.metadata, id: row.id, name: row.name, email: row.email, role: row.role, enabled: row.enabled, allBooks: row.all_books, bookIds: row.book_ids, expiresAt: row.expires_at?.toISOString() || '', expires: '', createdAt: row.created_at.toISOString() };
}
