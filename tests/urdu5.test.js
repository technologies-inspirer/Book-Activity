import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { learningBookMetadata } from '../src/data/learningCatalog.js';

const context = { window: {} };
vm.createContext(context);
for (const file of ['books/library.js', 'books/activities-urdu5.js', 'books/questions.js']) vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
const book = context.window.PDF_BOOKS.find(item => item.id === 'stemford-urdu-5');
const acts = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES['stemford-urdu-5']));
const questions = JSON.parse(JSON.stringify(context.window.BOOK_QUESTIONS['stemford-urdu-5']));

test('Urdu 5+ is an 80-page right-to-left Prep book with its QR videos', () => {
  assert.equal(book.pages, 80);
  assert.equal(book.rtl, true);
  assert.deepEqual(learningBookMetadata['stemford-urdu-5'], { classId: 'prep', seriesId: 'stemford', subjectId: 'urdu' });
  assert.ok(Object.keys(book.qr).length >= 40);
});

test('Urdu 5+ story pages 8-24 carry the publisher Story, Vocabulary and Formation videos, each once', () => {
  const videos = Object.entries(acts).flatMap(([page, list]) => list.filter(a => a.type === 'videos').map(a => ({ page: +page, ...a })));
  assert.equal(videos.length, 48);
  assert.equal(new Set(videos.map(v => v.videos[0].src)).size, 48);
  assert.ok(videos.every(v => v.page >= 8 && v.page <= 24));
  assert.equal(videos.find(v => v.page === 8 && v.label === 'Story').videos[0].src, 'https://youtu.be/NXQwMZL4ClE');
  assert.equal(videos.find(v => v.page === 24 && v.label === 'Formation').videos[0].src, 'https://youtu.be/TgGzeOw8XRo');
});

test('Urdu 5+ has Play games, write-and-colour pages and no AI stories', () => {
  const all = Object.values(acts).flat();
  assert.equal(all.filter(a => a.type === 'game').length, 13);
  assert.ok(!all.some(a => a.type === 'story'));
  for (let page = 4; page <= 80; page++) assert.ok(acts[page].some(a => a.type === 'fill'), `page ${page}`);
});

test('Urdu 5+ exercise questions: every button on the page, every choice and match well formed', () => {
  const list = Object.entries(questions).flatMap(([page, qs]) => qs.map(q => ({ page: +page, ...q })));
  assert.ok(list.length >= 75);
  for (const q of list) {
    const { x, y } = q.button;
    assert.ok(x >= 0 && y >= 0 && x + 17 <= 100 && y + 4.8 <= 100, `page ${q.page}`);
    if (q.kind === 'choose') assert.ok(q.options.some(o => o.correct), `page ${q.page}: a right answer`);
    if (q.kind === 'match') for (const id of new Set(q.dots.map(d => d.id))) assert.equal(q.dots.filter(d => d.id === id).length, 2, `page ${q.page} ${id}`);
  }
  // page 71: one hat is "ہے", every group of things is "ہیں"
  const p71 = questions[71].find(q => q.kind === 'choose').options.filter(o => o.correct).map(o => o.label);
  assert.deepEqual(p71, ['ہے', 'ہیں', 'ہیں', 'ہیں', 'ہیں']);
});
