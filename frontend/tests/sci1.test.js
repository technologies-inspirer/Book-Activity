import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { learningBookMetadata } from '../src/data/learningCatalog.js';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../books/library.js', import.meta.url), 'utf8'), context);
vm.runInContext(readFileSync(new URL('../books/activities-sci1.js', import.meta.url), 'utf8'), context);
const book = context.window.PDF_BOOKS.find(item => item.id === 'stemford-science-1');
const acts = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES['stemford-science-1']));

test('Science 1 is a 72-page Class 1 Stemford book', () => {
  assert.ok(book, 'registered in the library');
  assert.equal(book.pages, 72);
  assert.ok(!book.rtl);
  assert.equal(book.frontCover, true, 'opens on the publisher front cover, not the title page');
  assert.equal(book.dir, 'books/stemford-science-1');
  assert.deepEqual(learningBookMetadata['stemford-science-1'], { classId: 'class-1', seriesId: 'stemford', subjectId: 'science' });
  for (const p of [1, 36, 72]) assert.ok(existsSync(new URL(`../books/stemford-science-1/p${String(p).padStart(3, '0')}.jpg`, import.meta.url)), `page ${p}`);
  assert.ok(existsSync(new URL('../books/stemford-science-1/cover.jpg', import.meta.url)));
});

test('Science 1 match exercises are picture games and every lesson page can be written on and coloured', () => {
  const games = Object.entries(acts).flatMap(([page, list]) => list.filter(a => a.type === 'game').map(game => ({ page: +page, ...game })));
  assert.deepEqual(games.map(game => game.page), [38, 47, 67]);
  assert.deepEqual(games.map(game => game.targets.length), [4, 5, 5]);
  for (const game of games) {
    const { x, y, w, h } = game.crop;
    for (const t of game.targets) assert.ok(t.x >= x && t.y >= y && t.x + t.w <= x + w && t.y + t.h <= y + h, `page ${game.page}: ${t.name} inside the game view`);
    assert.ok(game.button.x >= 0 && game.button.x <= 100 && game.button.y >= 0 && game.button.y <= 100);
  }
  for (let page = 4; page <= 72; page++) assert.ok(acts[page].some(a => a.type === 'fill'), `page ${page} write and colour`);
  assert.ok(!acts[1] && !acts[2] && !acts[3], 'title, inside and contents pages stay plain');
  assert.ok(Object.values(acts).flat().every(a => !['story', 'tick'].includes(a.type)), 'no AI stories or checklists');
});

test('Science 1 QR buttons open each chapter’s own publisher videos', () => {
  // the printed QR codes of chapters 6-8 open each other's pages, so those chapters take their own page's videos
  const supplied0 = JSON.parse(readFileSync(new URL('../books/science1-videos.json', import.meta.url), 'utf8'));
  assert.deepEqual(['49', '55', '64'].map(page => supplied0[page].videosFrom), ['https://javedpublishers.com/6-12/', 'https://javedpublishers.com/7-13/', 'https://javedpublishers.com/8-12/']);
  const supplied = JSON.parse(readFileSync(new URL('../books/science1-videos.json', import.meta.url), 'utf8'));
  const printed = JSON.parse(readFileSync(new URL('../books/stemford-science-1/qr.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(printed).map(Number), [4, 14, 25, 32, 41, 49, 55, 64, 69]);
  assert.equal(Object.keys(book.qr).length, 9);
  for (const [page, item] of Object.entries(book.qr)) {
    assert.equal(item.url, supplied[page].source, `page ${page} QR`);
    assert.deepEqual(JSON.parse(JSON.stringify(item.videos)), supplied[page].videos.map(({ id, title }) => ({ id, title })));
    for (const video of item.videos) assert.match(video.id, /^[\w-]{11}$/);
    const [x, y, w, h] = item.box;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 100 && y + h <= 100, `page ${page} box`);
  }
  assert.equal(Object.values(book.qr).reduce((n, item) => n + item.videos.length, 0), 27);
});
