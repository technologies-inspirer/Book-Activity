import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteDraftPage, parseGame, validateActivity, validateArea, validYoutube, draftBytes, MAX_MEDIA_BYTES } from '../src/authoring/project.js';

const game = { crop: { x: 0, y: 0, w: 100, h: 100 }, targets: [{ name: 'Apple', x: 10, y: 20, w: 20, h: 20 }] };
test('game uploads retain the existing crop and target format while rejecting invalid geometry', () => {
  assert.equal(parseGame(JSON.stringify(game)).targets[0].name, 'Apple');
  assert.throws(() => parseGame({ ...game, targets: [{ ...game.targets[0], x: 95 }] }), /target/);
  assert.throws(() => parseGame({ ...game, crop: { x: 0, y: 0, w: 0, h: 100 } }), /crop/);
  assert.throws(() => parseGame('<script>bad</script>'));
  assert.equal(validateArea({ x: 5, y: 5, w: 95, h: 95 }), true);
  assert.equal(validateArea({ x: 5, y: 5, w: 96, h: 95 }), false);
});
test('each supported activity requires its own usable file or content', () => {
  assert.throws(() => validateActivity({ type: 'audio', title: 'Listen' }), /audio file/);
  assert.throws(() => validateActivity({ type: 'story', title: 'Story', text: ' ' }), /story/);
  assert.throws(() => validateActivity({ type: 'video', title: 'Watch', youtubeUrl: 'javascript:alert(1)' }), /YouTube/);
  const audio = new Blob(['test'], { type: 'audio/wav' });
  assert.equal(validateActivity({ type: 'audio', title: ' Listen ', media: audio }).title, 'Listen');
  assert.equal(validateActivity({ type: 'story', title: 'Story', text: 'Hello world' }).text, 'Hello world');
  assert.equal(validateActivity({ type: 'game', title: 'Play', game }).game.targets.length, 1);
  for (const type of ['tracing', 'colouring']) assert.equal(validateActivity({ type, title: 'Draw', area: { x: 0, y: 0, w: 100, h: 100 } }).area.w, 100);
  assert.throws(() => validateActivity({ type: 'tracing', title: 'Draw', media: new Blob(['bad'], { type: 'image/svg+xml' }), area: { x: 0, y: 0, w: 100, h: 100 } }), /PNG/);
  assert.throws(() => validateActivity({ type: 'audio', title: 'Big', media: { size: MAX_MEDIA_BYTES + 1 } }), /50 MB/);
});
test('video URLs allow YouTube hosts and reject lookalikes and executable schemes', () => {
  assert.equal(validYoutube('https://youtu.be/7hpynjvzeS0'), true);
  assert.equal(validYoutube('https://www.youtube.com/watch?v=7hpynjvzeS0'), true);
  assert.equal(validYoutube('https://youtube.com.evil.test/watch?v=7hpynjvzeS0'), false);
  assert.equal(validYoutube('https://youtube.com/redirect?v=7hpynjvzeS0'), false);
  assert.equal(validYoutube('javascript:alert(1)'), false);
});
test('draft size includes pages, thumbnails and activity uploads', () => {
  const draft = { pages: [{ image: new Blob(['12345']), thumbnail: new Blob(['12']), activities: [{ media: new Blob(['123']) }, { media: null }] }] };
  assert.equal(draftBytes(draft), 10);
});


test('deleting a draft page preserves other pages and activities and renumbers for ZIP import', () => {
  const pages = [1, 2, 3].map(number => ({ number, image: new Blob([String(number)]), thumbnail: new Blob(['thumb']), activities: [{ id: `activity-${number}` }] }));
  const original = { id: 'book', title: 'Book', pages };
  const updated = deleteDraftPage(original, 2);
  assert.deepEqual(updated.pages.map(page => page.number), [1, 2]);
  assert.deepEqual(updated.pages.map(page => page.sourcePageNumber), [1, 3]);
  assert.equal(updated.pages[1].activities[0].id, 'activity-3');
  assert.equal(updated.pages[1].image, pages[2].image);
  assert.equal(original.pages.length, 3);
  const next = deleteDraftPage(updated, 1);
  assert.equal(next.pages[0].sourcePageNumber, 3);
  assert.equal(deleteDraftPage(next, 1), null);
  assert.throws(() => deleteDraftPage(original, 99), /no longer/);
});


test('only real bundled activities can be applied and exported as reusable references', async () => {
  const { buildExistingActivities, registerExistingActivities, applyExistingActivity, existingActivityKinds } = await import('../src/authoring/existingActivities.js');
  globalThis.window = {}; globalThis.localStorage = { getItem: () => null };
  for (const file of ['data.js', 'books/library.js', 'books/zones.js', 'books/activities.js', 'books/audio-urdu3.js', 'books/activities-english3.js', 'books/activities-computer0.js', 'books/activities-maxford.js', 'books/activities-maths3.js', 'books/activities-urdu3.js']) await import('../' + file);
  const { books } = await import('../src/data/books.js');
  const catalogue = buildExistingActivities(books, window.RECORDED);
  registerExistingActivities(catalogue);
  assert.equal(catalogue.filter(item => item.source === 'activity').length, 347);
  assert.equal(new Set(catalogue.map(item => item.id)).size, catalogue.length);
  for (const kind of existingActivityKinds) assert.ok(catalogue.some(item => item.kind === kind.id), kind.name);
  const source = catalogue.find(item => item.kind === 'game');
  const sourceBook = books.find(book => book.id === source.bookId);
  const before = JSON.stringify(sourceBook.pages[source.pageNumber - 1]);
  const applied = applyExistingActivity(source.id);
  assert.equal(applied.type, 'existing');
  assert.equal(applied.title, source.title);
  assert.equal(applied.media, null, 'No source assets are duplicated into a PDF draft');
  assert.equal(validateActivity({ ...applied, title: 'tampered title' }).title, source.title);
  assert.throws(() => validateActivity({ type: 'existing', templateId: 'made-up-activity' }), /existing collection/);
  assert.equal(JSON.stringify(sourceBook.pages[source.pageNumber - 1]), before);
});
