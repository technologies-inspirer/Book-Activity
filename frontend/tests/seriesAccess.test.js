import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedSeries, allowsBookSeries } from '../src/data/seriesAccess.js';
import { availableBooks } from '../src/portal/demoStore.js';

const choices = [{ id: 'stemford', name: 'StemFord Series' }, { id: 'maxford', name: 'MaxFord Series' }];
const books = [{ id: 'stemford-english-1' }, { id: 'maxford-global-qaida-3-english' }];
const reader = { role: 'user', enabled: true, allBooks: true, bookIds: [], expires: '' };

test('existing school accounts retain access until explicit series choices are saved', () => {
  assert.deepEqual(allowedSeries(reader, choices), choices);
  assert.deepEqual(availableBooks(reader, books), books);
});
test('a school only sees books and series explicitly allowed by the admin', () => {
  const school = { ...reader, allowedSeriesIds: ['maxford'] };
  assert.deepEqual(allowedSeries(school, choices), [choices[1]]);
  assert.deepEqual(availableBooks(school, books), [books[1]]);
  assert.equal(allowsBookSeries(school, books[0]), false);
  assert.deepEqual(availableBooks({ ...school, allowedSeriesIds: [] }, books), []);
});
test('new registered series appear in the selector without granting them to restricted schools', () => {
  const expanded = [...choices, { id: 'new-series', name: 'New Series' }];
  assert.equal(allowedSeries(reader, expanded).length, 3);
  assert.deepEqual(allowedSeries({ ...reader, allowedSeriesIds: ['maxford'] }, expanded), [choices[1]]);
});
