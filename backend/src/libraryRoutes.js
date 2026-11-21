import express, { Router } from 'express';
import JSZip from 'jszip';
import { randomUUID } from 'node:crypto';
import { pool } from './db/pool.js';
import { fail, requireAdmin } from './auth.js';
import { allSeries, learningState, publishedAllowed, publishedSummaries, saveLearning } from './learning.js';
import { getSubjectAssignments } from '../../frontend/src/data/learningCatalog.js';
import { catalog } from './catalog.js';

export const libraryRoutes = Router();
libraryRoutes.get('/learning', async (request, response) => response.json({ ...await learningState(), publishedBooks: await publishedSummaries(request.user) }));
for (const action of ['series', 'classes', 'subjects']) libraryRoutes.post(`/admin/learning/${action}`, requireAdmin, async (request, response) => response.status(action === 'series' ? 201 : 200).json(await saveLearning(action, request.body)));

export async function validateArchive(buffer, state) {
  if (!buffer?.length || buffer.length > 200 * 1024 * 1024) throw fail(400, 'Upload a book project below 200 MB.');
  let zip, data;
  try {
    zip = await JSZip.loadAsync(buffer);
    const entries = Object.values(zip.files).filter(item => !item.dir);
    if (entries.length > 1500 || entries.reduce((size, item) => size + (item._data?.uncompressedSize || 0), 0) > 200 * 1024 * 1024) throw new Error();
    const manifest = zip.file('project.json');
    if (!manifest || manifest._data.uncompressedSize > 2 * 1024 * 1024) throw new Error();
    data = JSON.parse(await manifest.async('string'));
  } catch { throw fail(400, 'Invalid or oversized book project ZIP.'); }
  if (data.format !== 'book-activity-draft' || data.version !== 1 || typeof data.title !== 'string' || !data.title.trim() || data.title.length > 200 || !Array.isArray(data.pages) || !data.pages.length || data.pages.length > 200) throw fail(400, 'Invalid book title or pages.');
  if (!allSeries(state).some(item => item.id === data.seriesId) || !state.seriesClasses.some(item => item.seriesId === data.seriesId && item.classIds.includes(data.classId)) || !getSubjectAssignments(state.customSubjects, state.subjectAssignments).some(item => item.seriesId === data.seriesId && item.subjectId === data.subjectId && item.classIds.includes(data.classId))) throw fail(400, 'Select an assigned series, class and subject before publishing.');
  let count = 0;
  const safe = path => typeof path === 'string' && /^[a-zA-Z0-9_./-]+$/.test(path) && !path.startsWith('/') && !path.split('/').includes('..') && zip.file(path);
  for (const [index, page] of data.pages.entries()) {
    if (page.number !== index + 1 || !Number.isInteger(page.width) || !Number.isInteger(page.height) || page.width < 1 || page.height < 1 || page.width > 4096 || page.height > 4096 || !safe(page.imagePath) || !safe(page.thumbnailPath) || !Array.isArray(page.activities) || (count += page.activities.length) > 1000) throw fail(400, 'Invalid page or activity data.');
    for (const activity of page.activities) if (activity.mediaPath && !safe(activity.mediaPath)) throw fail(400, 'An activity file is missing.');
  }
  const first = zip.file(data.pages[0].thumbnailPath);
  if (first._data.uncompressedSize > 2 * 1024 * 1024) throw fail(400, 'Book thumbnail is too large.');
  const cover = await first.async('nodebuffer');
  if (cover[0] !== 0xff || cover[1] !== 0xd8) throw fail(400, 'Use a JPEG book thumbnail.');
  const references = data.pages.flatMap(page => page.activities.filter(item => item.type === 'existing').map(item => item.templateId));
  const sources = catalog.filter(book => data.originalBookId === book.id || references.some(id => typeof id === 'string' && (id.startsWith(`activity:${book.id}/`) || id.startsWith(`qr:${book.id}/`) || id.startsWith(`recording:${book.dir}/`)))).map(book => book.id);
  return { data, cover, sources };
}

libraryRoutes.post('/admin/library/books', requireAdmin, express.raw({ type: 'application/zip', limit: '200mb' }), async (request, response) => {
  const state = await learningState();
  const { data, cover, sources } = await validateArchive(request.body, state);
  const id = randomUUID();
  await pool.query('INSERT INTO published_books(id,title,series_id,class_id,subject_id,page_count,archive,cover,source_book_ids) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id, data.title.trim(), data.seriesId, data.classId, data.subjectId, data.pages.length, request.body, cover, sources]);
  response.status(201).json({ id, publishedBooks: await publishedSummaries(request.user) });
});
libraryRoutes.put('/admin/library/books/:id', requireAdmin, express.raw({ type: 'application/zip', limit: '200mb' }), async (request, response) => {
  if (!/^[a-f0-9-]{36}$/i.test(request.params.id)) throw fail(400, 'Invalid book ID.');
  const { data, cover, sources } = await validateArchive(request.body, await learningState());
  const result = await pool.query('UPDATE published_books SET title=$2,series_id=$3,class_id=$4,subject_id=$5,page_count=$6,archive=$7,cover=$8,source_book_ids=$9,updated_at=now() WHERE id=$1', [request.params.id, data.title.trim(), data.seriesId, data.classId, data.subjectId, data.pages.length, request.body, cover, sources]);
  if (!result.rowCount) throw fail(404, 'Book not found.');
  response.json({ id: request.params.id, publishedBooks: await publishedSummaries(request.user) });
});
libraryRoutes.get('/library/books/:id/:file', async (request, response) => {
  if (!/^[a-f0-9-]{36}$/i.test(request.params.id) || !['archive', 'cover'].includes(request.params.file)) throw fail(404, 'Book not found.');
  const column = request.params.file === 'cover' ? 'cover' : 'archive';
  const { rows: [book] } = await pool.query(`SELECT id,series_id,class_id,subject_id,${column} FROM published_books WHERE id=$1`, [request.params.id]);
  if (!book || !publishedAllowed(request.user, book)) throw fail(403, 'This book is not in your library.');
  response.set('Content-Type', column === 'cover' ? 'image/jpeg' : 'application/zip').send(book[column]);
});
