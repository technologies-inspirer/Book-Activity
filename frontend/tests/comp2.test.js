import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { learningBookMetadata } from '../src/data/learningCatalog.js';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../books/library.js', import.meta.url), 'utf8'), context);
vm.runInContext(readFileSync(new URL('../books/activities-comp2.js', import.meta.url), 'utf8'), context);
const book = context.window.PDF_BOOKS.find(item => item.id === 'stemford-computer-2');
const acts = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES['stemford-computer-2']));

test('Computer 2 is a 62-page Class 2 Stemford book', () => {
  assert.ok(book, 'registered in the library');
  assert.equal(book.pages, 62);
  assert.ok(!book.rtl);
  assert.equal(book.frontCover, true, 'opens on the publisher front cover, not the title page');
  assert.equal(book.dir, 'books/stemford-computer-2');
  assert.deepEqual(learningBookMetadata['stemford-computer-2'], { classId: 'class-2', seriesId: 'stemford', subjectId: 'computer' });
  for (const p of [1, 31, 62]) assert.ok(existsSync(new URL(`../books/stemford-computer-2/p${String(p).padStart(3, '0')}.jpg`, import.meta.url)), `page ${p}`);
  assert.ok(existsSync(new URL('../books/stemford-computer-2/cover.jpg', import.meta.url)));
});

test('Computer 2 identify-the-pictures exercises are games and every lesson page can be written on and coloured', () => {
  const games = Object.entries(acts).flatMap(([page, list]) => list.filter(a => a.type === 'game').map(game => ({ page: +page, ...game })));
  assert.deepEqual(games.map(game => game.page), [11, 15]);
  assert.deepEqual(games.map(game => game.targets.length), [3, 4]);
  for (const game of games) {
    const { x, y, w, h } = game.crop;
    for (const t of game.targets) assert.ok(t.x >= x && t.y >= y && t.x + t.w <= x + w && t.y + t.h <= y + h, `page ${game.page}: ${t.name} inside the game view`);
    assert.ok(game.button.x >= 0 && game.button.x <= 100 && game.button.y >= 0 && game.button.y <= 100);
  }
  for (let page = 3; page <= 62; page++) assert.ok(acts[page].some(a => a.type === 'fill'), `page ${page} write and colour`);
  assert.ok(!acts[1] && !acts[2], 'title and contents pages stay plain');
  assert.ok(Object.values(acts).flat().every(a => !['story', 'tick'].includes(a.type)), 'no AI stories or checklists');
});

test('Computer 2 prints no QR codes, so it has no Watch-this videos', () => {
  assert.ok(!existsSync(new URL('../books/stemford-computer-2/qr.json', import.meta.url)));
  assert.ok(!book.qr || Object.keys(book.qr).length === 0);
});
