import express from 'express';
import { fileURLToPath } from 'node:url';
import { fail, requireAuth } from './auth.js';
import { catalog, canRead } from './catalog.js';
import { canUsePublishedSource } from './learning.js';

export const frontendRoot = fileURLToPath(new URL('../../frontend/', import.meta.url));
export async function fileAccess(request, response, next) {
  let path;
  try { path = decodeURIComponent(request.path); } catch { throw fail(400, 'Invalid file path.'); }
  const [kind, directory] = path.split('/').filter(Boolean);
  if (!['books', 'videos', 'sounds'].includes(kind) || path.includes('\\') || path.split('/').includes('..')) throw fail(404, 'File not found.');
  if (kind === 'books') {
    const book = catalog.find(item => item.dir === `books/${directory}`);
    if (!book || (!canRead(request.user, book.id) && !await canUsePublishedSource(request.user, book.id))) throw fail(403, 'This book is not in your library.');
  }
  if (kind === 'videos') {
    const aliases = { 'stemford-english-3': 'new-stemford-english-3', 'maxford-qaida-3': 'maxford-global-qaida-3-english' };
    const source = aliases[directory] || directory;
    if (!canRead(request.user, source) && !await canUsePublishedSource(request.user, source)) throw fail(403, 'This video is not in your library.');
  }
  response.set('Cache-Control', 'private, no-store');
  next();
}
export const protectedFiles = [requireAuth, fileAccess, express.static(frontendRoot, { index: false, dotfiles: 'deny', fallthrough: false, cacheControl: false })];
