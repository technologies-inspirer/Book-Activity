import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { getLearningBooks, getLearningSubjects } from '../src/data/learningCatalog.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = { window: {} };
vm.createContext(context);
for (const file of ['books/library.js', 'books/activities.js', 'books/activities-urdu4.js']) vm.runInContext(read(file), context);
const library = JSON.parse(JSON.stringify(context.window.PDF_BOOKS));
const book = library.find(item => item.id === 'stemford-urdu-4');
const activities = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES[book.id]));
const lessons = JSON.parse(read('books/stemford-urdu-4/lessons.json'));
const exists = path => existsSync(new URL('../' + path, import.meta.url));
const within = (box, outer = [0, 0, 100, 100]) => {
  const [x, y, w, h] = box, [ox, oy, ow, oh] = outer;
  assert.ok(w > 0 && h > 0 && x >= ox && y >= oy && x+w <= ox+ow+.02 && y+h <= oy+oh+.02, JSON.stringify({ box, outer }));
};

test('Urdu 4+ is a complete RTL book assigned to Nursery / Stemford / Urdu', () => {
  assert.equal(book.rtl, true);
  assert.equal(book.pages, 96);
  assert.deepEqual(getLearningBooks(library, { classId: 'nursery', seriesId: 'stemford', subjectId: 'urdu' }), [book]);
  assert.deepEqual(getLearningSubjects(library, [], { classId: 'nursery', seriesId: 'stemford' }), [{ id: 'urdu', name: 'Urdu' }]);
  assert.equal(getLearningBooks(library, { classId: 'play-group', subjectId: 'urdu' }).some(item => item.id === book.id), false);
  assert.ok(exists(`${book.dir}/cover.jpg`));
  for (let page = 1; page <= 96; page++) assert.ok(exists(`${book.dir}/p${String(page).padStart(3, '0')}.jpg`));
});

test('Story, Vocabulary and Formation videos are linked for the 21 letters the publisher supplied', () => {
  const youtube = /^https:\/\/youtu\.be\/[\w-]{11}$/;
  const withVideos = lessons.filter(lesson => [].concat(activities[lesson.picturePage]).some(item => item.type === 'videos'));
  assert.deepEqual(withVideos.map(lesson => lesson.letter).join(''), 'ابپتٹثجچحخدذرژسشصضطظع');
  for (const lesson of lessons) {
    const picture = [].concat(activities[lesson.picturePage]).filter(item => item.type === 'videos');
    const formation = activities[lesson.tracePage].video;
    if (!withVideos.includes(lesson)) { assert.equal(picture.length, 0); assert.equal(formation, undefined); continue; }
    assert.deepEqual(picture.map(item => item.label), ['کہانی', 'ذخیرہ الفاظ']);
    for (const item of picture) assert.match(item.videos[0].src, youtube);
    assert.match(formation.src, youtube);
  }
  assert.equal(activities[4][0].videos[0].src, 'https://youtu.be/p890xf02Sdw');
  assert.equal(activities[5].video.src, 'https://youtu.be/U84ZPPlDU_o');
});

test('all 93 instructional pages have usable activities', () => {
  assert.deepEqual(Object.keys(activities).map(Number), Array.from({ length: 93 }, (_, index) => index+4));
  for (const [page, entries] of Object.entries(activities)) for (const activity of [].concat(entries)) {
    assert.ok(['story', 'game', 'fill', 'videos'].includes(activity.type), `Page ${page}`);
    assert.match(activity.title, /[\u0600-\u06ff]/);
    if (activity.type === 'game') {
      assert.equal(activity.ur, true);
      const c = activity.crop;
      within([c.x, c.y, c.w, c.h]);
      assert.ok(activity.targets.length >= 2);
      for (const t of activity.targets) {
        within([t.x, t.y, t.w, t.h], [c.x, c.y, c.w, c.h]);
        if (t.view) {
          within([t.view.x, t.view.y, t.view.w, t.view.h]);
          within([t.x, t.y, t.w, t.h], [t.view.x, t.view.y, t.view.w, t.view.h]);
        }
      }
    }
    if (activity.type === 'story') for (const scene of activity.scenes) {
      assert.equal(scene.page, Number(page));
      assert.match(scene.text, /[\u0600-\u06ff]/);
      for (const frame of [scene.from, scene.to]) {
        assert.ok(frame.cx >= 0 && frame.cx <= 100 && frame.cy >= 0 && frame.cy <= 100 && frame.w > 0 && frame.w <= 100);
      }
    }
  }
});

test('37 Urdu lessons use this book’s vocabulary and three tracing rows from right to left', () => {
  assert.equal(lessons.length, 37);
  assert.deepEqual(lessons[0].words, ['اخروٹ', 'امرود', 'انار']);
  for (const lesson of lessons) {
    const picture = activities[lesson.picturePage];
    assert.deepEqual(picture.find(item => item.type === 'game').targets.map(item => item.name), lesson.words);
    const trace = activities[lesson.tracePage];
    assert.equal(trace.type, 'fill');
    assert.equal(trace.steps.length, 3);
    for (const step of trace.steps) {
      assert.ok(step.marks.length >= 3);
      for (let i = 0; i < step.marks.length; i++) {
        const mark = step.marks[i];
        assert.equal(mark.glyph, 'ur');
        within(mark.box); within(mark.ink.box);
        assert.ok(mark.ink.src.startsWith(`${book.dir}/ink/p${String(lesson.tracePage).padStart(3, '0')}_`));
        assert.ok(exists(mark.ink.src));
        if (i) assert.ok(step.marks[i-1].box[0] > mark.box[0], 'Start at the rightmost letter');
      }
    }
  }
});

test('the ending lessons teach the actual vowel word pages and one-to-ten counting', () => {
  for (const [page, expected] of [[92, 'الف'], [93, 'واؤ'], [94, 'چھوٹی یے'], [95, 'بڑی یے']]) {
    assert.ok(activities[page][0].title.includes(expected));
    assert.equal(activities[page].find(item => item.type === 'game').targets.length, 30);
  }
  assert.equal(activities[96].find(item => item.type === 'game').targets.length, 10);
});

test('Listen has authored Urdu text for each instructional page of the raster-only PDF', () => {
  const narration = JSON.parse(read('books/stemford-urdu-4/text.json'));
  assert.equal(narration.length, 96);
  assert.deepEqual(narration.slice(0, 3), [[], [], []]);
  for (let page = 4; page <= 96; page++) {
    assert.match(narration[page-1].map(block => block[4]).join(' '), /[\u0600-\u06ff]/);
  }
});
