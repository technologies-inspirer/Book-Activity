import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
globalThis.window = {};
globalThis.localStorage = { getItem: () => null };
for (const file of [
  'data.js', 'books/library.js', 'books/zones.js', 'books/activities.js',
  'books/audio-urdu3.js', 'books/activities-english3.js',
  'books/activities-computer0.js', 'books/activities-maxford.js',
  'books/activities-maths3.js', 'books/activities-urdu3.js'
]) await import(new URL(`../${file}`, import.meta.url));

const originalDemoIds = window.DEMO_BOOKS.map(book => book.id);
const { books } = await import('../src/data/books.js');
assert.deepEqual(books.map(book => book.id), [
  ...window.PDF_BOOKS.map(book => book.id), ...originalDemoIds
]);
assert.equal(new Set(books.map(book => book.id)).size, books.length);
let pages = 0, activities = 0;
const missingVideos = new Set();
const checkAsset = path => {
  if (typeof path !== 'string' || !/^(assets|books|sounds|videos)\//.test(path)) return;
  const relative = decodeURI(path.split('#')[0]);
  if (relative.startsWith('videos/') && !existsSync(resolve(root, relative))) {
    missingVideos.add(relative);
    return;
  }
  assert.ok(existsSync(resolve(root, relative)), `Missing source asset: ${relative}`);
  assert.ok(existsSync(resolve(root, 'dist', relative)), `Missing build asset: ${relative}`);
};
const inspect = value => {
  if (typeof value === 'string') checkAsset(value);
  else if (Array.isArray(value)) value.forEach(inspect);
  else if (value && typeof value === 'object') Object.values(value).forEach(inspect);
};
for (const book of books) {
  pages += book.pages.length;
  for (const page of book.pages) activities += page.acts?.length || 0;
  if (book.dir) {
    const original = window.PDF_BOOKS.find(item => item.id === book.id);
    assert.equal(book.pages.length, original.pages);
    book.pages.forEach((page, index) => {
      assert.deepEqual(page.acts, [].concat(window.BOOK_ACTIVITIES?.[book.id]?.[index + 1] || []));
      assert.deepEqual(page.zones, window.BOOK_ZONES?.[book.id]?.[index + 1] || []);
      assert.deepEqual(page.qr, original.qr?.[index + 1]);
    });
  }
  inspect(book);
}
inspect(window.RECORDED);
['assets/logo.png', 'assets/logo-white.png', 'sounds/page-flip.wav', 'sounds/book-open.wav'].forEach(checkAsset);
const html = readFileSync(resolve(root, 'dist/index.html'), 'utf8');
assert.match(html, /\/Book-Activity\/assets\//);
assert.doesNotMatch(html, /src\/main\.jsx/);
console.log(`PASS: ${books.length} book IDs, ${pages} pages, ${activities} activities; data, QR links and build assets preserved.`);
console.log(`Optional local lesson videos absent: ${missingVideos.size}. Supply these files to verify their playback.`);
