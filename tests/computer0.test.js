import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: { BOOK_ACTIVITIES: {} } };
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../books/activities-computer0.js', import.meta.url), 'utf8'), context);
const book = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES['stemford-series-computer-book-0-curve']));
const videosOn = p => [].concat(book[p] || []).filter(a => a.type === 'videos');

test('Computer Book 0 letter pages have the publisher Vocabulary and Formation videos instead of home-made stories', () => {
  const letterPages = [4, 5, 6, 7, 10, 11, 12, 13, 16, 17, 18, 19, 22, 23, 24, 25, 28, 29, 30, 31, 34, 35, 36, 37, 40, 41];
  for (const p of letterPages) {
    const labels = videosOn(p).map(v => v.label);
    // Jj has no formation link yet; the Pp vocabulary link was a copy of the Oo formation link
    assert.deepEqual(labels, p === 17 ? ['Vocabulary'] : p === 25 ? ['Formation'] : ['Vocabulary', 'Formation'], `page ${p}`);
    assert.ok(![].concat(book[p]).some(a => a.type === 'story'), `page ${p} keeps no home-made story`);
  }
  assert.equal(videosOn(4)[0].videos[0].src, 'https://youtu.be/3gZWKnCFu5U');
  assert.equal(videosOn(41)[1].videos[0].src, 'https://youtu.be/r6ktPgtbHSw');
});

test('Computer Book 0 revision and lesson pages each have their own video', () => {
  for (const p of [8, 9, 20, 21, 26, 27, 32, 33, 38, 39, 42, 43, 44, 45, 46, 47, 48, 49, 50, 52, 53, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65])
    assert.equal(videosOn(p).length, 1, `page ${p}`);
  const ids = Object.values(book).flat().filter(a => a.type === 'videos').map(a => a.videos[0].src);
  assert.equal(new Set(ids).size, ids.length, 'no video is linked twice');
});
