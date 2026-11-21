import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { validateActivity } from '../src/authoring/project.js';
import { exportProject, importProject } from '../src/authoring/projectArchive.js';
import { getLearningBooks } from '../src/data/learningCatalog.js';
import { allowsBookSeries } from '../src/data/seriesAccess.js';

// JSZip's browser Blob reader is used by the same export path in these Node tests.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onload?.({ target: this }); }, error => this.onerror?.(error)); }
};

test('QR and question templates preserve their content, colour and percentage placement through a ZIP', async () => {
  const url = 'https://www.youtube.com/watch?v=7hpynjvzeS0';
  const qrImage = await QRCode.toDataURL(url);
  const placement = { x: 70, y: 5, w: 25, h: 15 };
  const qr = validateActivity({ type: 'qr', title: 'Watch the lesson', url, qrImage, placement, buttonColour: '#123456' });
  const question = validateActivity({ type: 'question', title: 'Quick question', text: 'What is 2 + 2?', answer: '4' });
  const image = new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' });
  const draft = { title: 'Test', seriesId: 'custom-test', classId: 'class-8', subjectId: 'history', pages: [{ number: 1, width: 600, height: 800, image, thumbnail: image, activities: [qr, question] }] };
  const exported = await exportProject(draft);
  // The browser import path accepts a File. The test gives JSZip its supported bytes.
  const bytes = new Uint8Array(await exported.arrayBuffer()); bytes.size = bytes.byteLength;
  const restored = await importProject(bytes);
  assert.equal(restored.pages[0].activities[0].url, url);
  assert.equal(restored.pages[0].activities[0].qrImage, qrImage);
  assert.deepEqual(restored.pages[0].activities[0].placement, placement);
  assert.equal(restored.pages[0].activities[0].buttonColour, '#123456');
  assert.equal(restored.pages[0].activities[1].answer, '4');
  assert.equal(restored.classId, 'class-8');
});

test('invalid QR targets, out-of-page buttons and missing question answers are rejected', async () => {
  const qrImage = await QRCode.toDataURL('https://example.com');
  assert.throws(() => validateActivity({ type: 'qr', title: 'Bad', url: 'javascript:alert(1)', qrImage }), /HTTP/);
  assert.throws(() => validateActivity({ type: 'link', title: 'Bad', url: 'https://example.com', placement: { x: 95, y: 5, w: 20, h: 10 } }), /inside the page/);
  assert.throws(() => validateActivity({ type: 'question', title: 'Question', text: 'Question' }), /answer/);
});

test('published books use their assigned class, subject and custom series in library filters', () => {
  const book = { id: 'uploaded', published: true, seriesId: 'custom-test', classId: 'class-8', subjectId: 'history' };
  assert.deepEqual(getLearningBooks([book], { seriesId: 'custom-test', classId: 'class-8', subjectId: 'history' }), [book]);
  assert.deepEqual(getLearningBooks([book], { classId: 'class-1' }), []);
  assert.equal(allowsBookSeries({ allowedSeriesIds: ['custom-test'] }, book), true);
  assert.equal(allowsBookSeries({ allowedSeriesIds: ['stemford'] }, book), false);
});
