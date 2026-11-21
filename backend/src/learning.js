import { randomUUID } from 'node:crypto';
import { pool } from './db/pool.js';
import { fail } from './auth.js';
import { series } from '../../frontend/src/data/series.js';
import { learningClasses, learningSubjects, learningBookMetadata, getSubjectAssignments } from '../../frontend/src/data/learningCatalog.js';

export const initialLearning = () => ({ customSeries: [], customSubjects: [], subjectAssignments: [], seriesClasses: series.map(item => ({ seriesId: item.id, classIds: [...new Set(Object.values(learningBookMetadata).filter(meta => meta.seriesId === item.id).map(meta => meta.classId))] })) });
export async function learningState(client = pool) {
  const { rows: [row] } = await client.query("SELECT value FROM portal_settings WHERE key='learning-catalog'");
  return { ...initialLearning(), ...row?.value };
}
export const allSeries = state => [...series, ...state.customSeries];
export function changeLearning(state, action, input) {
  const next = structuredClone(state);
  if (action === 'series') {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    if (!name || name.length > 100 || description.length > 500) throw fail(400, 'Enter a series name up to 100 characters and description up to 500 characters.');
    if (allSeries(next).some(item => item.name.toLowerCase() === name.toLowerCase())) throw fail(409, 'This series already exists.');
    const created = { id: `custom-${randomUUID()}`, name, description };
    next.customSeries.push(created);
    next.seriesClasses.push({ seriesId: created.id, classIds: [] });
    return { state: next, created };
  }
  if (!allSeries(next).some(item => item.id === input.seriesId)) throw fail(400, 'Select a valid series.');
  if (action === 'classes') {
    if (!Array.isArray(input.classIds) || input.classIds.some(id => !learningClasses.some(item => item.id === id))) throw fail(400, 'Choose valid classes.');
    next.seriesClasses = [...next.seriesClasses.filter(item => item.seriesId !== input.seriesId), { seriesId: input.seriesId, classIds: [...new Set(input.classIds)] }];
  } else if (action === 'subjects') {
    if (!next.seriesClasses.some(item => item.seriesId === input.seriesId && item.classIds.includes(input.classId))) throw fail(400, 'Assign this class to the series first.');
    if (!Array.isArray(input.subjectIds) || input.subjectIds.some(id => !learningSubjects.some(item => item.id === id))) throw fail(400, 'Choose valid subjects.');
    for (const subject of learningSubjects) {
      const rows = getSubjectAssignments(next.customSubjects, next.subjectAssignments);
      let row = rows.find(item => item.seriesId === input.seriesId && item.subjectId === subject.id);
      if (!row && !input.subjectIds.includes(subject.id)) continue;
      if (!row) {
        next.customSubjects.push({ ...subject, seriesId: input.seriesId, classId: input.classId });
        row = { classIds: [] };
      }
      const classIds = row.classIds.filter(id => id !== input.classId);
      if (input.subjectIds.includes(subject.id)) classIds.push(input.classId);
      next.subjectAssignments = [...next.subjectAssignments.filter(item => !(item.seriesId === input.seriesId && item.subjectId === subject.id)), { seriesId: input.seriesId, subjectId: subject.id, classIds }];
    }
  } else throw fail(400, 'Unknown catalog action.');
  return { state: next };
}
export async function saveLearning(action, input) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(7261043)');
    const result = changeLearning(await learningState(client), action, input);
    await client.query("INSERT INTO portal_settings(key,value) VALUES ('learning-catalog',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value", [result.state]);
    await client.query('COMMIT');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export function publishedAllowed(user, book) {
  if (user.role === 'admin') return true;
  const extra = user.metadata || {};
  return (!Array.isArray(extra.allowedSeriesIds) || extra.allowedSeriesIds.includes(book.series_id)) &&
    (user.all_books || user.book_ids.includes(book.id)) &&
    (!Array.isArray(extra.schoolAssignments) || extra.schoolAssignments.some(row => row.classId === book.class_id && row.subjects?.some(subject => subject.seriesId === book.series_id && subject.subjectId === book.subject_id)));
}
export async function canUsePublishedSource(user, sourceId) {
  const { rows } = await pool.query('SELECT id,series_id,class_id,subject_id FROM published_books WHERE $1=ANY(source_book_ids)', [sourceId]);
  return rows.some(book => publishedAllowed(user, book));
}
export async function publishedSummaries(user) {
  const { rows } = await pool.query('SELECT id,title,series_id,class_id,subject_id,page_count,updated_at FROM published_books ORDER BY updated_at DESC');
  return rows.filter(book => publishedAllowed(user, book)).map(book => ({ id: book.id, title: book.title, seriesId: book.series_id, classId: book.class_id, subjectId: book.subject_id, published: true, pageCount: book.page_count, pages: Array.from({ length: book.page_count }, () => ({})), cover: `/api/library/books/${book.id}/cover`, c1: '#0b625e', c2: '#ffbf47', ratio: .707 }));
}
