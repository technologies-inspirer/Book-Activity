import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { learningBookMetadata } from '../src/data/learningCatalog.js';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../books/library.js', import.meta.url), 'utf8'), context);
vm.runInContext(readFileSync(new URL('../books/activities-sst2.js', import.meta.url), 'utf8'), context);
const book = context.window.PDF_BOOKS.find(item => item.id === 'stemford-social-studies-2');
const acts = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES['stemford-social-studies-2']));

test('Social Studies 2 is a 72-page Class 2 Stemford book', () => {
  assert.ok(book, 'registered in the library');
  assert.equal(book.pages, 72);
  assert.ok(!book.rtl);
  assert.equal(book.frontCover, true, 'opens on the publisher front cover, not the title page');
  assert.equal(book.dir, 'books/stemford-social-studies-2');
  assert.deepEqual(learningBookMetadata['stemford-social-studies-2'], { classId: 'class-2', seriesId: 'stemford', subjectId: 'social-studies' });
  for (const p of [1, 36, 72]) assert.ok(existsSync(new URL(`../books/stemford-social-studies-2/p${String(p).padStart(3, '0')}.jpg`, import.meta.url)), `page ${p}`);
  assert.ok(existsSync(new URL('../books/stemford-social-studies-2/cover.jpg', import.meta.url)));
});

test('Social Studies 2 flags exercise is a game and every lesson page can be written on and coloured', () => {
  const games = Object.entries(acts).flatMap(([page, list]) => list.filter(a => a.type === 'game').map(game => ({ page: +page, ...game })));
  assert.deepEqual(games.map(game => game.page), [18]);
  assert.deepEqual(games.map(game => game.targets.length), [6]);
  for (const game of games) {
    const { x, y, w, h } = game.crop;
    for (const t of game.targets) assert.ok(t.x >= x && t.y >= y && t.x + t.w <= x + w && t.y + t.h <= y + h, `page ${game.page}: ${t.name} inside the game view`);
    assert.ok(game.button.x >= 0 && game.button.x <= 100 && game.button.y >= 0 && game.button.y <= 100);
  }
  for (let page = 4; page <= 72; page++) assert.ok(acts[page].some(a => a.type === 'fill'), `page ${page} write and colour`);
  assert.ok(!acts[1] && !acts[2] && !acts[3], 'title, inside and contents pages stay plain');
  assert.ok(Object.values(acts).flat().every(a => !['story', 'tick'].includes(a.type)), 'no AI stories or checklists');
});

test('Social Studies 2 QR buttons open exactly the videos on the pages its printed QR codes open', () => {
  const supplied = JSON.parse(readFileSync(new URL('../books/social-studies2-videos.json', import.meta.url), 'utf8'));
  const printed = JSON.parse(readFileSync(new URL('../books/stemford-social-studies-2/qr.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(printed).map(Number), [4, 13, 19, 27, 34, 39, 45, 52, 58, 64]);
  assert.equal(Object.keys(book.qr).length, 10);
  for (const [page, item] of Object.entries(book.qr)) {
    assert.equal(item.url, supplied[page].source, `page ${page} QR`);
    assert.deepEqual(JSON.parse(JSON.stringify(item.videos)), supplied[page].videos.map(({ id, title }) => ({ id, title })));
    for (const video of item.videos) assert.match(video.id, /^[\w-]{11}$/);
    const [x, y, w, h] = item.box;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 100 && y + h <= 100, `page ${page} box`);
  }
  assert.equal(Object.values(book.qr).reduce((n, item) => n + item.videos.length, 0), 22);
});
