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

test('Urdu 1 has no invented video links while its QR pages carry no videos', () => {
  assert.ok(!book.qr || Object.values(book.qr).every(item => Array.isArray(item.videos) && item.videos.length));
});
