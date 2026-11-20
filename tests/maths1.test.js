import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { learningBookMetadata } from '../src/data/learningCatalog.js';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../books/library.js', import.meta.url), 'utf8'), context);
vm.runInContext(readFileSync(new URL('../books/activities-maths1.js', import.meta.url), 'utf8'), context);
const book = context.window.PDF_BOOKS.find(item => item.id === 'stemford-maths-1');
const acts = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES['stemford-maths-1']));

test('Maths 1 is a 128-page Class 1 Stemford book', () => {
  assert.ok(book, 'registered in the library');
  assert.equal(book.pages, 128);
  assert.ok(!book.rtl);
  assert.equal(book.frontCover, true, 'opens on the publisher front cover, not the title page');
  assert.equal(book.dir, 'books/stemford-maths-1');
  assert.deepEqual(learningBookMetadata['stemford-maths-1'], { classId: 'class-1', seriesId: 'stemford', subjectId: 'maths' });
  for (const p of [1, 64, 128]) assert.ok(existsSync(new URL(`../books/stemford-maths-1/p${String(p).padStart(3, '0')}.jpg`, import.meta.url)), `page ${p}`);
  assert.ok(existsSync(new URL('../books/stemford-maths-1/cover.jpg', import.meta.url)));
});

test('Maths 1 named pictures and matching exercise are picture games and every lesson page can be written on and coloured', () => {
  const games = Object.entries(acts).flatMap(([page, list]) => list.filter(a => a.type === 'game').map(game => ({ page: +page, ...game })));
  assert.deepEqual(games.map(game => game.page), [26, 93, 117]);
  assert.deepEqual(games.map(game => game.targets.length), [10, 8, 4]);
  for (const game of games) {
    const { x, y, w, h } = game.crop;
    for (const t of game.targets) assert.ok(t.x >= x && t.y >= y && t.x + t.w <= x + w && t.y + t.h <= y + h, `page ${game.page}: ${t.name} inside the game view`);
    assert.ok(game.button.x >= 0 && game.button.x <= 100 && game.button.y >= 0 && game.button.y <= 100);
  }
  for (let page = 3; page <= 128; page++) assert.ok(acts[page].some(a => a.type === 'fill'), `page ${page} write and colour`);
  assert.ok(!acts[1] && !acts[2], 'title and contents pages stay plain');
  assert.ok(Object.values(acts).flat().every(a => !['story', 'tick'].includes(a.type)), 'no AI stories or checklists');
});

test('Maths 1 QR buttons open exactly the videos on the pages its printed QR codes open', () => {
  const supplied = JSON.parse(readFileSync(new URL('../books/maths1-videos.json', import.meta.url), 'utf8'));
  const printed = JSON.parse(readFileSync(new URL('../books/stemford-maths-1/qr.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(printed).length, 38);
  assert.equal(Object.keys(book.qr).length, 33);
  for (const page of ['3', '21', '22', '53', '94']) assert.ok(!book.qr[page], `page ${page}: its publisher page has no video`);
  for (const [page, item] of Object.entries(book.qr)) {
    assert.equal(item.url, supplied[page].source, `page ${page} QR`);
    assert.deepEqual(JSON.parse(JSON.stringify(item.videos)), supplied[page].videos.map(({ id, title }) => ({ id, title })));
    for (const video of item.videos) assert.match(video.id, /^[\w-]{11}$/);
    const [x, y, w, h] = item.box;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 100 && y + h <= 100, `page ${page} box`);
  }
  assert.equal(Object.values(book.qr).reduce((n, item) => n + item.videos.length, 0), 39);
});
