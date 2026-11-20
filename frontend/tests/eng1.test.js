import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { learningBookMetadata } from '../src/data/learningCatalog.js';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../books/library.js', import.meta.url), 'utf8'), context);
vm.runInContext(readFileSync(new URL('../books/activities.js', import.meta.url), 'utf8'), context);
vm.runInContext(readFileSync(new URL('../books/activities-eng1.js', import.meta.url), 'utf8'), context);
const book = context.window.PDF_BOOKS.find(item => item.id === 'stemford-english-1');
const acts = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES['stemford-english-1']));

test('English 1 is a 112-page Class 1 Stemford book', () => {
  assert.ok(book, 'registered in the library');
  assert.equal(book.pages, 112);
  assert.ok(!book.rtl);
  assert.equal(book.frontCover, true, 'opens on the publisher front cover, not the title page');
  assert.equal(book.dir, 'books/stemford-english-1');
  assert.deepEqual(learningBookMetadata['stemford-english-1'], { classId: 'class-1', seriesId: 'stemford', subjectId: 'english' });
  for (const p of [1, 56, 112]) assert.ok(existsSync(new URL(`../books/stemford-english-1/p${String(p).padStart(3, '0')}.jpg`, import.meta.url)), `page ${p}`);
  assert.ok(existsSync(new URL('../books/stemford-english-1/cover.jpg', import.meta.url)));
});

test('English 1 picture-match exercises are games and every lesson page can be written on and coloured', () => {
  const games = Object.entries(acts).flatMap(([page, list]) => [].concat(list).filter(a => a.type === 'game').map(game => ({ page: +page, ...game })));
  assert.deepEqual(games.map(game => game.page), [11, 22, 97, 106]);
  assert.deepEqual(games.map(game => game.targets.length), [4, 4, 6, 5]);
  for (const game of games) {
    const { x, y, w, h } = game.crop;
    for (const t of game.targets) assert.ok(t.x >= x && t.y >= y && t.x + t.w <= x + w && t.y + t.h <= y + h, `page ${game.page}: ${t.name} inside the game view`);
    assert.ok(game.button.x >= 0 && game.button.x <= 100 && game.button.y >= 0 && game.button.y <= 100);
  }
  for (let page = 4; page <= 112; page++) assert.ok([].concat(acts[page]).some(a => a.type === 'fill'), `page ${page} write and colour`);
  assert.ok(!acts[1] && !acts[2] && !acts[3], 'title and contents pages stay plain');
  // the only story is the read-along of the book's own printed story on pages 5-7
  assert.deepEqual(Object.entries(acts).flatMap(([page, list]) => [].concat(list).filter(a => a.type === 'story').map(() => +page)), [5]);
});

test('English 1 QR buttons open the videos on the pages its printed QR codes open', () => {
  const printed = JSON.parse(readFileSync(new URL('../books/stemford-english-1/qr.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(printed).length, 13);
  assert.deepEqual(Object.keys(book.qr).map(Number), [4, 16, 27, 32, 40, 52, 59, 70, 81, 86, 97, 106]);
  for (const [page, item] of Object.entries(book.qr)) {
    assert.equal(item.url, printed[page].url, `page ${page} QR`);
    for (const video of item.videos) assert.match(video.id, /^[\w-]{11}$/);
  }
});
