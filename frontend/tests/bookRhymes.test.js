import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { bookRhymes, rhymeSpread } from '../src/data/bookRhymes.js';

test('English rhymes open their actual image pages despite the printed-page offset', () => {
  const book = { id: 'new-stemford-english-3', pages: Array(82).fill({}) };
  const entries = bookRhymes(book);
  assert.equal(entries.length, 5);
  assert.deepEqual(entries.map(item => item.page), [16, 38, 38, 60, 60]);
  assert.deepEqual(entries.map(item => item.printedPage), [15, 37, 37, 59, 59]);
  assert.deepEqual(entries.map(item => rhymeSpread(item.page)), [7, 18, 18, 29, 29]);
  for (const item of entries) assert.ok(existsSync(`books/${book.id}/p${String(item.page).padStart(3, '0')}.jpg`));
});

test('Urdu popup titles are Urdu and refer only to reviewed rhyme pages', () => {
  const book = { id: 'stemford-urdu-3', pages: Array(96).fill({}) };
  const entries = bookRhymes(book);
  assert.deepEqual(entries.map(item => item.page), [9, 21, 31, 47, 57, 67, 81, 93]);
  for (const item of entries) {
    assert.match(item.title, /\p{Script=Arabic}/u);
    assert.doesNotMatch(item.title, /[a-z]/i);
    assert.equal(item.printedPage, item.page);
    assert.ok(existsSync(`books/${book.id}/p${String(item.page).padStart(3, '0')}.jpg`));
  }
});

test('the rhyme shortcut does not leak into other classes or books with missing pages', () => {
  assert.deepEqual(bookRhymes({ id: 'stemford-english-4', pages: Array(100).fill({}) }), []);
  assert.deepEqual(bookRhymes({ id: 'stemford-maths-3', pages: Array(100).fill({}) }), []);
  assert.deepEqual(bookRhymes({ id: 'new-stemford-english-3', pages: [] }), []);
});
