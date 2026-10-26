import test from 'node:test';
import assert from 'node:assert/strict';
import { getLearningBooks, learningBookMetadata, learningClasses, learningSubjects, libraryLink } from '../src/data/learningCatalog.js';

globalThis.window = {};
await import('../books/library.js');
const books = window.PDF_BOOKS;

test('the learning catalogue covers all original book IDs without changing their data', () => {
  assert.deepEqual(Object.keys(learningBookMetadata).sort(), books.map(book => book.id).sort());
  assert.equal(getLearningBooks(books).length, 8);
  for (const metadata of Object.values(learningBookMetadata)) {
    assert.ok(learningClasses.some(item => item.id === metadata.classId));
    assert.ok(learningSubjects.some(item => item.id === metadata.subjectId));
    assert.ok(['stemford', 'maxford'].includes(metadata.seriesId));
  }
});

test('3+ books are Play Group and Book 1 titles are Class 1', () => {
  const playGroup = getLearningBooks(books, { classId: 'play-group' });
  assert.equal(playGroup.length, 5);
  for (const id of ['new-stemford-english-3', 'stemford-maths-3', 'stemford-urdu-3', 'maxford-global-qaida-3-english']) {
    assert.ok(playGroup.some(book => book.id === id));
  }
  assert.equal(getLearningBooks(books, { classId: 'class-1' }).length, 3);
  assert.deepEqual(getLearningBooks(books, { classId: 'class-3' }), []);
});

test('class, series and subject filters combine and respect the assigned input catalogue', () => {
  const selection = { classId: 'play-group', seriesId: 'stemford', subjectId: 'english' };
  const expected = books.find(book => book.id === 'new-stemford-english-3');
  assert.deepEqual(getLearningBooks(books, selection), [expected]);
  assert.deepEqual(getLearningBooks(books.filter(book => book.id !== expected.id), selection), []);
  assert.deepEqual(getLearningBooks([], selection), []);
  assert.deepEqual(getLearningBooks(books, { classId: 'class-1', seriesId: 'maxford' }), []);
  assert.equal(getLearningBooks(books, { classId: 'play-group', seriesId: 'maxford', subjectId: 'english' })[0].id, 'maxford-global-qaida-3-english');
});

test('class options and selection links support the complete navigation flow', () => {
  assert.equal(learningClasses.length, 11);
  assert.equal(libraryLink(), '#/user/library');
  assert.equal(libraryLink('play-group', 'stemford'), '#/user/library/play-group/stemford');
  assert.equal(libraryLink('class-1', 'stemford', 'science'), '#/user/library/class-1/stemford/science');
});
