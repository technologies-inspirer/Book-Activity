import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonAtSpread, rhymeAtSpread } from '../src/readerSelection.js';
import { bookRhymes, rhymeSpread } from '../src/data/bookRhymes.js';

const lessons = [{ key: 'a', page: 5, tracePage: 6 }, { key: 'b', page: 7, tracePage: 8 }];
test('cover and non-lesson pages have no active letter; A and B track their own pages', () => {
  assert.equal(lessonAtSpread(lessons, 0), null);
  assert.equal(lessonAtSpread(lessons, 2)?.key, 'a');
  assert.equal(lessonAtSpread(lessons, 3)?.key, 'b');
  assert.equal(lessonAtSpread(lessons, 18), null);
});
test('only the selected rhyme is active when two titles share the same page', () => {
  const entries = bookRhymes({ id: 'new-stemford-english-3', pages: Array(82).fill({}) });
  const moon = entries.find(item => item.title === 'I See the Moon');
  const johnny = entries.find(item => item.title === 'Johnny, Johnny');
  assert.equal(moon.page, johnny.page);
  assert.equal(rhymeAtSpread(entries, rhymeSpread(moon.page), moon), moon);
  assert.equal(rhymeAtSpread(entries, rhymeSpread(johnny.page), johnny), johnny);
  const selected = rhymeAtSpread(entries, rhymeSpread(johnny.page), johnny);
  assert.equal(entries.filter(item => item === selected).length, 1);
});
test('direct page navigation chooses one rhyme and clears the previous page selection', () => {
  const entries = bookRhymes({ id: 'new-stemford-english-3', pages: Array(82).fill({}) });
  assert.equal(rhymeAtSpread(entries, 0, entries[1]), null);
  assert.equal(rhymeAtSpread(entries, 18, null), entries[1]);
  assert.equal(rhymeAtSpread(entries, 29, entries[1]), entries[3]);
});
