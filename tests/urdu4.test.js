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
  assert.deepEqual(getLearningSubjects(library, [], { classId: 'nursery', seriesId: 'stemford' }), [{ id: 'english', name: 'English' }, { id: 'urdu', name: 'Urdu' }]);
  assert.equal(getLearningBooks(library, { classId: 'play-group', subjectId: 'urdu' }).some(item => item.id === book.id), false);
  assert.ok(exists(`${book.dir}/cover.jpg`));
  for (let page = 1; page <= 96; page++) assert.ok(exists(`${book.dir}/p${String(page).padStart(3, '0')}.jpg`));
});

test('printed QR codes open the videos they lead to, on the right pages', () => {
  const pages = Object.keys(book.qr).map(Number);
  assert.equal(pages.length, 45);
  assert.ok(!pages.includes(1), 'The cover QR leads to no video');
  for (const page of [4, 6, 30, 60, 82, 85, 88, 91, 96]) assert.ok(pages.includes(page), `Page ${page}`);
  for (const [page, item] of Object.entries(book.qr)) {
    within(item.box);
    assert.ok(item.box[0] < 20 && item.box[1] < 10, `QR on page ${page} is in the top-left corner`);
    assert.match(item.url, /^https:\/\/o2o\.to\/i\/\w+$/);
    assert.ok(item.videos.length >= 1);
    for (const video of item.videos) assert.match(video.id, /^[\w-]{11}$/);
  }
  assert.equal(book.qr[4].videos[0].id, 'Y0WQFJp_-Pk');
});

test('Story, Vocabulary and Formation videos are linked for all 33 supplied lessons, including partially supplied lessons', () => {
  const youtube = /^https:\/\/youtu\.be\/[\w-]{11}$/;
  const withVideos = lessons.filter(lesson => [].concat(activities[lesson.picturePage]).some(item => item.type === 'videos'));
  assert.deepEqual(withVideos.map(lesson => lesson.letter).join(''), 'ابپتٹثجچحخدذرژسشصضطظعغفقکگلمنوہءی، ے');
  for (const lesson of lessons) {
    const picture = [].concat(activities[lesson.picturePage]).filter(item => item.type === 'videos');
    const formation = activities[lesson.tracePage].video;
    if (!withVideos.includes(lesson)) { assert.equal(picture.length, 0); assert.equal(formation, undefined); continue; }
    // the same buttons as Urdu 3+: Story and Vocabulary, then the game (shown above them on the page)
    const partial = ['\u063a', '\u0646'].includes(lesson.letter);
    assert.deepEqual([].concat(activities[lesson.picturePage]).map(item => item.label), partial ? ['Story', '\u06a9\u06be\u06cc\u0644\u06cc\u06ba'] : ['Story', 'Vocabulary', '\u06a9\u06be\u06cc\u0644\u06cc\u06ba']);
    if (partial) { assert.equal(formation, undefined); continue; }
    assert.equal(formation.title, `How to write ${lesson.name}`);
    for (const item of picture) assert.match(item.videos[0].src, youtube);
    assert.match(formation.src, youtube);
  }
  assert.equal(activities[4][0].videos[0].src, 'https://youtu.be/p890xf02Sdw');
  assert.equal(activities[5].video.src, 'https://youtu.be/U84ZPPlDU_o');
  assert.equal(activities[60][0].videos[0].src, 'https://youtu.be/PG_1t7cSIBw');
  assert.equal(activities[61].video, undefined);
  assert.equal(activities[74][0].videos[0].src, 'https://youtu.be/mMMqEMUczPE');
  assert.equal(activities[75].video, undefined);
  assert.equal(activities[82][1].videos[0].src, 'https://youtu.be/Tk75DfX9GIw');
  assert.equal(activities[83].video.src, 'https://youtu.be/3KE0FXCWbeM');
});

test('instructional pages have usable activities, without home-made story animations', () => {
  // Pages 88-90 only had an authored story; like Urdu 3+, those are not shown (Listen still reads them).
  assert.deepEqual(Object.keys(activities).map(Number), Array.from({ length: 93 }, (_, index) => index+4).filter(page => page < 88 || page > 90));
  for (const [page, entries] of Object.entries(activities)) for (const activity of [].concat(entries)) {
    assert.ok(['game', 'fill', 'videos'].includes(activity.type), `Page ${page}`);
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
  // the first word of each printed table: alif, wao, choti ye and bari ye
  for (const [page, first] of [[92, 'باپ'], [93, 'اور'], [94, 'چابی'], [95, 'گاتے']]) {
    const targets = activities[page].find(item => item.type === 'game').targets;
    assert.equal(targets.length, 30);
    assert.equal(targets[0].name, first);
  }
  assert.equal(activities[96].find(item => item.type === 'game').targets.length, 10);
});

test('like Urdu 3+, no home-made narration is read aloud (no Listen text)', () => {
  const narration = JSON.parse(read('books/stemford-urdu-4/text.json'));
  assert.equal(narration.length, 96);
  assert.ok(narration.every(page => page.length === 0));
});
