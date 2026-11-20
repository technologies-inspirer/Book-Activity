import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { learningBookMetadata } from '../src/data/learningCatalog.js';

const context = { window: {} };
vm.createContext(context);
for (const file of ['books/library.js', 'books/activities-english5.js']) vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
const book = context.window.PDF_BOOKS.find(item => item.id === 'stemford-english-5');
const acts = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES['stemford-english-5']));

test('English 5+ is an 80-page Prep book', () => {
  assert.equal(book.pages, 80);
  assert.deepEqual(learningBookMetadata['stemford-english-5'], { classId: 'prep', seriesId: 'stemford', subjectId: 'english' });
});

test('English 5+ topic pages carry the publisher videos, each once, and no AI stories', () => {
  const videos = Object.entries(acts).flatMap(([page, list]) => list.filter(a => a.type === 'videos').map(a => ({ page: +page, ...a })));
  assert.equal(videos.length, 34);
  const ids = videos.map(v => v.videos[0].src);
  assert.equal(new Set(ids).size, ids.length, 'no video is linked twice');
  assert.equal(videos.find(v => v.page === 4).videos[0].src, 'https://youtu.be/JiRu-zpu2Co');
  assert.equal(videos.find(v => v.page === 73).videos[0].src, 'https://youtu.be/0uOV35lGOX0');
  for (const v of videos) assert.ok(v.button.x >= 0 && v.button.y >= 0 && v.button.x + 17 <= 100 && v.button.y + 4.8 <= 100, `page ${v.page}`);
  assert.ok(!Object.values(acts).flat().some(a => a.type === 'story'));
});

test('every English 5+ page from the alphabet onwards can be written on and coloured', () => {
  for (let page = 4; page <= 80; page++) assert.ok(acts[page].some(a => a.type === 'fill'), `page ${page}`);
});

test('English 5+ picture pages have Play games whose targets lie inside the game picture', () => {
  const games = Object.entries(acts).flatMap(([page, list]) => list.filter(a => a.type === 'game').map(g => ({ page: +page, ...g })));
  assert.equal(games.length, 24);
  for (const g of games) {
    assert.ok(g.targets.length >= 3, `page ${g.page}`);
    for (const t of g.targets) {
      assert.ok(t.x >= g.crop.x && t.y >= g.crop.y && t.x + t.w <= g.crop.x + g.crop.w + .01 && t.y + t.h <= g.crop.y + g.crop.h + .01, `page ${g.page} ${t.name}`);
    }
    // the Play button is not on a picture the child taps
    const b = g.button;
    assert.ok(!g.targets.some(t => b.x < t.x + t.w && t.x < b.x + 17 && b.y < t.y + t.h && t.y < b.y + 4.8), `page ${g.page}`);
  }
  assert.deepEqual(games.find(g => g.page === 6).targets.map(t => t.name).slice(0, 5), ['cat', 'hen', 'pin', 'dog', 'bun']);
});

test('English 5+ QR codes open their Watch-this videos', () => {
  assert.ok(Object.keys(book.qr).length >= 50);
  assert.ok(book.qr['8'].videos.length > 0);
});
