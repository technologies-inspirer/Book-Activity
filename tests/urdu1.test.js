import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { learningBookMetadata } from '../src/data/learningCatalog.js';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../books/library.js', import.meta.url), 'utf8'), context);
const book = context.window.PDF_BOOKS.find(item => item.id === 'stemford-urdu-1');

test('Urdu 1 is a 120-page right-to-left Class 1 Urdu book', () => {
  assert.ok(book, 'registered in the library');
  assert.equal(book.pages, 120);
  assert.equal(book.rtl, true);
  assert.equal(book.dir, 'books/stemford-urdu-1');
  assert.deepEqual(learningBookMetadata['stemford-urdu-1'], { classId: 'class-1', seriesId: 'stemford', subjectId: 'urdu' });
  for (const p of [1, 60, 120]) assert.ok(existsSync(new URL(`../books/stemford-urdu-1/p${String(p).padStart(3, '0')}.jpg`, import.meta.url)), `page ${p}`);
  assert.ok(existsSync(new URL('../books/stemford-urdu-1/cover.jpg', import.meta.url)));
});

test('Urdu 1 QR buttons open exactly the videos on the pages its printed QR codes open', () => {
  const supplied = JSON.parse(readFileSync(new URL('../books/urdu1-videos.json', import.meta.url), 'utf8'));
  const printed = JSON.parse(readFileSync(new URL('../books/stemford-urdu-1/qr.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(printed).length, 22);
  assert.equal(Object.keys(book.qr).length, 21);
  assert.ok(!book.qr['75'], 'page 75: its publisher page has no video yet');
  for (const [page, item] of Object.entries(book.qr)) {
    assert.equal(item.url, supplied[page].source, `page ${page} QR`);
    assert.deepEqual(JSON.parse(JSON.stringify(item.videos)), supplied[page].videos.map(({ id, title }) => ({ id, title })));
    for (const video of item.videos) assert.match(video.id, /^[\w-]{11}$/);
    const [x, y, w, h] = item.box;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 100 && y + h <= 100, `page ${page} box`);
  }
  assert.equal(Object.values(book.qr).reduce((n, item) => n + item.videos.length, 0), 39);
});
