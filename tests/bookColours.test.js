import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { englishLessons } from '../src/englishLessons.js';
import { componentColourRegion } from '../src/colourFill.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const reviewed = JSON.parse(read('books/colour-palettes.json'));
const regionRules = JSON.parse(read('books/colour-regions.json'));
const context = { window: {} };
vm.createContext(context);
for (const file of ['activities', 'activities-english3', 'activities-maxford', 'activities-urdu3', 'activities-urdu4', 'activities-maths3', 'activities-computer0', 'activities-english4', 'activities-maths4']) {
  vm.runInContext(read(`books/${file}.js`), context);
}
const activities = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES));
const fill = (book, page) => [].concat(activities[book][page]).find(activity => activity.type === 'fill');

test('Urdu Story, Vocabulary and Formation buttons retain all supplied YouTube links', () => {
  const links = JSON.parse(read('books/urdu3-videos.json'));
  const rows = [...read('tools/make_urdu3.py').matchAll(/^\s+\((\d+), '([^']+)', '([^']+)', '([^']+)'/gm)];
  let count = 0;
  for (const [, pageString, , , folder] of rows) {
    if (!links[folder]) continue;
    const page = Number(pageString), picture = activities['stemford-urdu-3'][page];
    for (const label of ['Story', 'Vocabulary']) {
      const buttons = picture.filter(activity => activity.type === 'videos' && activity.label === label);
      assert.equal(buttons.length, 1, `${folder}: ${label}`);
      assert.equal(buttons[0].videos[0].src, 'https://youtu.be/' + links[folder][label]);
      assert.match(links[folder][label], /^[\w-]{11}$/);
    }
    assert.equal(fill('stemford-urdu-3', page + 1).video.src, 'https://youtu.be/' + links[folder].Formation);
    assert.match(links[folder].Formation, /^[\w-]{11}$/);
    assert.ok(picture.some(activity => activity.type === 'game'), `${folder}: retain game`);
    count++;
  }
  assert.equal(count, 35, 'four earlier lessons plus 31 newly supplied lessons');
  assert.equal(activities['stemford-urdu-3'][17].find(activity => activity.label === 'Story').videos[0].src, 'https://youtu.be/e4815ka_wq8');
  assert.equal(fill('stemford-urdu-3', 18).video.src, 'https://youtu.be/_UXlxnjoG20');
  assert.equal(fill('stemford-urdu-3', 92).video.src, 'https://youtu.be/m1dAALoV24c');
  assert.equal(links['28 qaaf'].Formation, links['29 kaaf'].Formation, 'retain the shared link exactly as supplied');
});

test('English letter explorer connects all 26 letters to their real lesson and trace pages', () => {
  const id = 'new-stemford-english-3';
  vm.runInContext(read('books/library.js'), context);
  const metadata = context.window.PDF_BOOKS.find(book => book.id === id);
  const book = { id, pages: Array.from({ length: 82 }, (_, index) => ({ acts: [].concat(activities[id][index + 1] || []), qr: metadata.qr[index + 1] })) };
  const lessons = englishLessons(book);
  assert.equal(lessons.map(lesson => lesson.letter).join(''), 'abcdefghijklmnopqrstuvwxyz');
  for (const lesson of lessons) {
    assert.ok(lesson.words.length > 0);
    assert.ok(lesson.game && lesson.trace, lesson.letter);
    assert.ok(lesson.story || lesson.videos.length, lesson.letter);
    assert.ok(lesson.lessonVideo?.id, `QR video: ${lesson.letter}`);
    assert.ok(book.pages[lesson.page - 1].qr.videos.some(video => video.id === lesson.lessonVideo.id));
    assert.equal(lesson.tracePage, lesson.page + 1);
    assert.equal(lesson.trace, book.pages[lesson.tracePage - 1].acts.find(activity => activity.type === 'fill'));
    for (const video of lesson.videos) assert.ok(video.videos.length > 0);
  }
  assert.equal(lessons[1].page, 7);
  assert.equal(lessons[0].lessonVideo.id, '7hpynjvzeS0');
  assert.equal(lessons[1].lessonVideo.id, '4msW4WKxoQM');
  assert.equal(lessons[25].page, 73);
  assert.deepEqual(englishLessons({ ...book, id: 'maxford-global-qaida-3-english' }), []);
});

test('the other books find their letter and number pages from the publisher video titles', () => {
  const lessonsOf = id => {
    const metadata = context.window.PDF_BOOKS.find(book => book.id === id);
    return englishLessons({ id, pages: Array.from({ length: metadata.pages }, (_, index) => ({ acts: [].concat(activities[id][index + 1] || []), qr: metadata.qr?.[index + 1] })) });
  };
  const summary = id => lessonsOf(id).map(lesson => `${lesson.name}@${lesson.page}`);
  assert.deepEqual(summary('stemford-english-4').slice(0, 5), ['Aa@6', 'Bb@8', 'Cc@10', 'Dd@12', 'Ee@17']);
  assert.equal(lessonsOf('stemford-english-4').length, 26);
  assert.deepEqual(summary('stemford-maths-4').slice(0, 3), ['1@6', '2@8', '3@10']);
  assert.equal(lessonsOf('stemford-maths-4').length, 20);
  assert.equal(lessonsOf('stemford-maths-3').length, 20);
  assert.equal(lessonsOf('stemford-series-computer-book-0-curve')[0].name, 'Aa');
  assert.equal(lessonsOf('stemford-urdu-4')[1].name, 'بے');
  assert.ok(lessonsOf('stemford-urdu-3').length > 30);
  // Maths 4's Formation video is on the writing page after the number's picture page
  assert.ok(lessonsOf('stemford-maths-4')[0].videos.some(video => video.label === 'Formation'));
  for (const id of ['stemford-english-4', 'stemford-maths-4', 'stemford-urdu-4', 'stemford-series-computer-book-0-curve'])
    for (const lesson of lessonsOf(id)) assert.ok(lesson.lessonVideo?.id, `${id} ${lesson.name}`);
});

test('part rules refer to real activities and colours available on their pages', () => {
  for (const [book, pages] of Object.entries(regionRules)) for (const [page, regions] of Object.entries(pages)) {
    const activity = fill(book, page);
    assert.ok(activity, `${book} / ${page}`);
    for (const region of regions) {
      if (!region.colour) assert.equal(activity.drawingMode, 'regions', 'Only reviewed drawing boundaries may omit a required colour');
      else assert.ok(activity.colours.includes(region.colour), `Unavailable part colour: ${book} / ${page} / ${region.part}`);
      const box = region.box || region.componentBox;
      if (box) {
        const [x, y, w, h] = box;
        assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 100 && y + h <= 100);
      } else if (region.seed) {
        assert.ok(region.seed.every(n => n >= 0 && n <= 100));
        if (region.cut) assert.ok(region.cut.length === 2 && region.cut.every(point => point.every(n => n >= 0 && n <= 100)));
      } else {
        assert.ok(region.polygon.length >= 3);
        assert.ok(region.polygon.every(point => point.every(n => n >= 0 && n <= 100)));
      }
    }
  }
});

test('all 250 bundled drawing activities have their reviewed page palette', () => {
  let total = 0;
  for (const [book, pages] of Object.entries(activities)) {
    for (const [page, pageActivities] of Object.entries(pages)) {
      for (const activity of [].concat(pageActivities)) {
        if (activity.type !== 'fill') continue;
        const entry = reviewed.books[book]?.[page];
        assert.ok(entry, `Unreviewed activity: ${book} / ${page}`);
        const expected = entry.colours.map(name => {
          assert.match(reviewed.colours[name] || '', /^#[0-9a-f]{6}$/i, name);
          return reviewed.colours[name];
        });
        assert.ok(expected.length, `Empty palette: ${book} / ${page}`);
        assert.equal(new Set(expected).size, expected.length);
        for (const colour of activity.colours) assert.ok(expected.includes(colour), `Authored colour unavailable: ${book}/${page}/${colour}`);
        for (const step of activity.steps || []) for (const mark of step.marks || []) {
          if (mark.scribble) assert.ok(expected.includes(mark.scribble), `Demo colour unavailable: ${book} / ${page}`);
        }
        total++;
      }
    }
  }
  assert.equal(total, 250);
  assert.equal(Object.values(reviewed.books).reduce((n, pages) => n + Object.keys(pages).length, 0), 947);
});

test('apple and orange leaves remain available without unrelated fallback swatches', () => {
  for (const [book, apple, orange] of [
    ['new-stemford-english-3', 6, 44], ['maxford-global-qaida-3-english', 12, 78]
  ]) {
    assert.deepEqual(fill(book, apple).colours, ['#e63946', '#43aa8b']);
    assert.ok(fill(book, orange).colours.includes('#43aa8b'));
    assert.ok(fill(book, orange).colours.includes('#f4a261'));
    assert.ok(!fill(book, orange).colours.includes('#4aa3df'));
  }
});

test('secondary picture parts and printed colour hints are retained', () => {
  assert.deepEqual(fill('maxford-global-qaida-3-english', 24).colours, ['#f9c74f', '#f4a261']);
  assert.ok(fill('new-stemford-english-3', 40).colours.includes('#d4a373'), 'monkey face');
  assert.ok(fill('new-stemford-english-3', 74).colours.includes('#222222'), 'zebra stripes');
  assert.ok(fill('stemford-maths-3', 16).colours.includes('#43aa8b'), 'apple leaves');
  assert.deepEqual(fill('stemford-urdu-3', 16).colours, ['#f9c74f', '#4aa3df', '#e63946'], 'butterfly paper hints');
  for (const [book, page] of [['new-stemford-english-3', 64], ['maxford-global-qaida-3-english', 112]]) {
    const vase = fill(book, page);
    assert.ok(vase.colours.includes('#00aaa0'), 'teal vase stripe');
    assert.ok(vase.colours.includes('#ff8fab'), 'pink vase stripe');
    assert.ok(!vase.colours.includes('#f4a261'), 'vase has no orange hint');
    assert.ok(vase.steps.some(step => step.say.includes('make it red')));
  }
});

test('vase bands keep their own colours despite the red outer border in both editions', () => {
  for (const [book, page, x, samples] of [
    ['new-stemford-english-3', 64, 70, [[13, '#4aa3df'], [16, '#4aa3df'], [18, '#222222'], [20, '#e63946'], [24, '#ff8fab'], [28, '#ff8fab'], [32.3, '#8d5524'], [38, '#00aaa0']]],
    ['maxford-global-qaida-3-english', 112, 60, [[64, '#4aa3df'], [67, '#4aa3df'], [69, '#222222'], [71, '#e63946'], [75, '#ff8fab'], [79, '#ff8fab'], [82.5, '#8d5524'], [89, '#00aaa0']]]
  ]) {
    for (const [y, expected] of samples) {
      const w = 1000, h = 1000, mask = new Uint8Array(w*h);
      for (let yy = Math.round(y*10)-1; yy <= Math.round(y*10)+1; yy++) {
        for (let xx = x*10-10; xx <= x*10+10; xx++) mask[yy*w+xx] = 1;
      }
      assert.equal(componentColourRegion(mask, w, h, regionRules[book][page])?.colour, expected, `${book}: ${y}%`);
    }
  }
});

test('different-colour tasks keep multiple choices and writing tasks use a pen colour', () => {
  assert.ok(fill('maxford-global-qaida-3-english', 16).colours.length >= 5, 'balloons');
  assert.ok(fill('maxford-global-qaida-3-english', 120).colours.length >= 5, 'xylophone');
  assert.deepEqual(fill('stemford-series-computer-book-0-curve', 6).colours, ['#9aa5b1']);
  assert.deepEqual(fill('stemford-urdu-3', 88).colours, ['#222222']);
});


test('every bundled page has an explicit task palette with valid distinct colours', () => {
  vm.runInContext(read('books/library.js'), context);
  const library = context.window.PDF_BOOKS;
  assert.equal(library.length, 11);
  let total = 0;
  for (const book of library) {
    const pages = reviewed.books[book.id];
    assert.equal(Object.keys(pages).length, book.pages, book.id);
    for (let page = 1; page <= book.pages; page++) {
      const entry = pages[page];
      assert.ok(entry?.picture, `${book.id}/${page}`);
      assert.ok(entry.colours.length);
      assert.equal(new Set(entry.colours).size, entry.colours.length);
      for (const name of entry.colours) assert.match(reviewed.colours[name] || '', /^#[0-9a-f]{6}$/i);
      total++;
    }
  }
  assert.equal(total, 947);
});

test('reinforcement palette includes the four letter colours without decorative purple', () => {
  assert.deepEqual(reviewed.books['new-stemford-english-3'][57].colours, ['red', 'blue', 'orange', 'green']);
  assert.deepEqual(reviewed.books['stemford-maths-3'][27].colours, ['red']);
  assert.deepEqual(reviewed.books['stemford-maths-3'][39].colours, ['blue']);
  assert.deepEqual(reviewed.books['stemford-maths-3'][57].colours, ['yellow']);
  assert.deepEqual(reviewed.books['stemford-maths-3'][69].colours, ['green']);
  assert.deepEqual(reviewed.books['stemford-science-1'][1].colours, ['black']);
});
