import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const reviewed = JSON.parse(read('books/colour-palettes.json'));
const context = { window: {} };
vm.createContext(context);
for (const file of ['activities', 'activities-english3', 'activities-maxford', 'activities-urdu3', 'activities-maths3', 'activities-computer0']) {
  vm.runInContext(read(`books/${file}.js`), context);
}
const activities = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES));
const fill = (book, page) => [].concat(activities[book][page]).find(activity => activity.type === 'fill');

test('all 117 bundled drawing activities have their reviewed page palette', () => {
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
        assert.deepEqual(activity.colours, expected, `${book} / ${page}`);
        for (const step of activity.steps || []) for (const mark of step.marks || []) {
          if (mark.scribble) assert.ok(expected.includes(mark.scribble), `Demo colour unavailable: ${book} / ${page}`);
        }
        total++;
      }
    }
  }
  assert.equal(total, 117);
  assert.equal(Object.values(reviewed.books).reduce((n, pages) => n + Object.keys(pages).length, 0), total);
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

test('different-colour tasks keep multiple choices and writing tasks use a pen colour', () => {
  assert.ok(fill('maxford-global-qaida-3-english', 16).colours.length >= 5, 'balloons');
  assert.ok(fill('maxford-global-qaida-3-english', 120).colours.length >= 5, 'xylophone');
  assert.deepEqual(fill('stemford-series-computer-book-0-curve', 6).colours, ['#9aa5b1']);
  assert.deepEqual(fill('stemford-urdu-3', 88).colours, ['#222222']);
});
