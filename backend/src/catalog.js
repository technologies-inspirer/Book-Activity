import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { learningBookMetadata } from '../../frontend/src/data/learningCatalog.js';
import { seriesOf } from '../../frontend/src/data/series.js';

const context = vm.createContext({ window: {} });
vm.runInContext(readFileSync(new URL('../../frontend/books/library.js', import.meta.url), 'utf8'), context);
export const catalog = context.window.PDF_BOOKS;
export const bookIds = catalog.map(book => book.id);
export function canRead(user, id) {
  if (!bookIds.includes(id)) return false;
  if (user.role === 'admin') return true;
  if (Array.isArray(user.metadata.allowedSeriesIds) && !user.metadata.allowedSeriesIds.includes(seriesOf(catalog.find(book => book.id === id)).id)) return false;
  if (!user.all_books && !user.book_ids.includes(id)) return false;
  const selections = user.metadata.schoolAssignments;
  if (Array.isArray(selections)) {
    const meta = learningBookMetadata[id];
    return !!meta && selections.some(row => row.classId === meta.classId && row.subjects?.some(subject => subject.seriesId === meta.seriesId && subject.subjectId === meta.subjectId));
  }
  return true;
}
