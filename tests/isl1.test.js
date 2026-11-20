import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { learningBookMetadata } from '../src/data/learningCatalog.js';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../books/library.js', import.meta.url), 'utf8'), context);
vm.runInContext(readFileSync(new URL('../books/activities-isl1.js', import.meta.url), 'utf8'), context);
const book = context.window.PDF_BOOKS.find(item => item.id === 'stemford-islamiat-1');
const acts = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES['stemford-islamiat-1']));

test('Islamiat 1 senses page has a tap-the-picture game and every lesson page can be written on and coloured', () => {
  const games = Object.entries(acts).flatMap(([page, list]) => list.filter(a => a.type === 'game').map(game => ({ page: +page, ...game })));
  assert.deepEqual(games.map(game => game.page), [17]);
  assert.deepEqual(games.map(game => game.targets.length), [5]);
  for (const game of games) {
    assert.equal(game.ur, true);
    const { x, y, w, h } = game.crop;
    for (const t of game.targets) {
      assert.ok(t.name && t.say === t.name, `page ${game.page} target name`);
      assert.ok(t.x >= x && t.y >= y && t.x + t.w <= x + w && t.y + t.h <= y + h, `page ${game.page}: ${t.name} inside the game view`);
    }
    assert.ok(game.button.x >= 0 && game.button.x <= 100 && game.button.y >= 0 && game.button.y <= 100);
  }
  for (let page = 5; page <= 56; page++) assert.ok(acts[page].some(a => a.type === 'fill'), `page ${page} write and colour`);
  assert.ok(!acts[1] && !acts[2] && !acts[3] && !acts[4], 'title, plan and contents pages stay plain');
  assert.ok(Object.values(acts).flat().every(a => !['story', 'tick'].includes(a.type)), 'no AI stories or checklists');
});

test('Islamiat 1 is a 56-page right-to-left Class 1 Islamiat book', () => {
  assert.ok(book, 'registered in the library');
  assert.equal(book.pages, 56);
  assert.equal(book.rtl, true);
  assert.equal(book.frontCover, true, 'opens on the publisher front cover, not the title page');
  assert.equal(book.dir, 'books/stemford-islamiat-1');
  assert.deepEqual(learningBookMetadata['stemford-islamiat-1'], { classId: 'class-1', seriesId: 'stemford', subjectId: 'islamiat' });
  for (const p of [1, 28, 56]) assert.ok(existsSync(new URL(`../books/stemford-islamiat-1/p${String(p).padStart(3, '0')}.jpg`, import.meta.url)), `page ${p}`);
  assert.ok(existsSync(new URL('../books/stemford-islamiat-1/cover.jpg', import.meta.url)));
});

test('Islamiat 1 QR buttons open each lesson’s own publisher video', () => {
  const supplied = JSON.parse(readFileSync(new URL('../books/islamiat1-videos.json', import.meta.url), 'utf8'));
  const printed = JSON.parse(readFileSync(new URL('../books/stemford-islamiat-1/qr.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(printed).map(Number), [5, 7, 9, 11, 13, 14, 19, 23, 27, 31, 37, 42, 47, 52]);
  assert.equal(Object.keys(book.qr).length, 14);
  // the page 14 QR opens the duas page of page 13: page 14 takes its own lesson's video (Tauheed)
  assert.equal(supplied['14'].videosFrom, 'https://stemintpublishingco.com/islamiat-class-1-stemford-series-7/');
  assert.notDeepEqual(JSON.parse(JSON.stringify(book.qr['14'].videos)), JSON.parse(JSON.stringify(book.qr['13'].videos)));
  for (const [page, item] of Object.entries(book.qr)) {
    assert.equal(item.url, supplied[page].source, `page ${page} QR`);
    assert.deepEqual(JSON.parse(JSON.stringify(item.videos)), supplied[page].videos.map(({ id, title }) => ({ id, title })));
    for (const video of item.videos) assert.match(video.id, /^[\w-]{11}$/);
    const [x, y, w, h] = item.box;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 100 && y + h <= 100, `page ${page} box`);
  }
});
