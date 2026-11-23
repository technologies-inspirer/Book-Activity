import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { detectPrintedQrs } from '../src/authoring/printedQr.js';
import { automaticButtonPlacement, pageButtonPlacement, findPublishedBooks, validatePrintedQrs } from '../src/authoring/pageLinks.js';
import { validateActivity } from '../src/authoring/project.js';
import { exportProject, importProject } from '../src/authoring/projectArchive.js';

function pageWithCodes(codes) {
  const width = 720, height = 1000, data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (const { text, left, top } of codes) {
    const modules = QRCode.create(text).modules, scale = 4;
    for (let y = 0; y < modules.size; y++) for (let x = 0; x < modules.size; x++) {
      if (!modules.get(y, x)) continue;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const at = ((top + y * scale + dy) * width + left + x * scale + dx) * 4;
        data[at] = data[at + 1] = data[at + 2] = 0;
      }
    }
  }
  return { data, width, height };
}

test('locates multiple printed QR codes without assigning the encoded destinations', () => {
  const pixels = pageWithCodes([{ text: 'https://example.com/original', left: 40, top: 80 }, { text: 'https://example.com/second', left: 470, top: 700 }]);
  const before = new Uint8ClampedArray(pixels.data);
  const qrs = detectPrintedQrs(pixels);
  assert.equal(qrs.length, 2);
  assert.ok(qrs[0].x < 10 && qrs[0].y < 10);
  assert.ok(qrs[1].x > 60 && qrs[1].y > 60);
  assert.ok(qrs.every(qr => !('url' in qr) && !('data' in qr)));
  assert.deepEqual(pixels.data, before, 'scanning leaves the book image untouched');
  assert.deepEqual(detectPrintedQrs(pixels), qrs, 'QR identifiers remain stable on rescan');
});

test('blank pages do not gain QR links and invalid regions are rejected', () => {
  assert.deepEqual(detectPrintedQrs(pageWithCodes([])), []);
  assert.throws(() => validatePrintedQrs([{ id: 'bad', x: 99, y: 0, w: 10, h: 10 }]), /Invalid/);
  const p = { id: 'qr-1', x: 10, y: 10, w: 10, h: 10 };
  assert.throws(() => validatePrintedQrs([p, p]), /Invalid/);
});

test('fixed button sizes are automatic while legacy layout remains readable', () => {
  for (let index = 0; index < 24; index++) {
    const p = automaticButtonPlacement(index);
    assert.equal(p.w, 29); assert.equal(p.h, 5.5);
    assert.ok(p.x + p.w <= 100 && p.y + p.h <= 100);
  }
  const placement = { x: 90, y: 98, w: 3, h: 1 };
  assert.deepEqual(pageButtonPlacement({ placement }, 0), placement);
  assert.deepEqual(pageButtonPlacement({ placement, fixedButton: true }, 0), { x: 71, y: 94.5, w: 29, h: 5.5 });
});

test('printed QR links and button labels/colours survive book export and reload', async () => {
  globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onload?.({ target: this }); }); } };
  const qrAnchor = { id: 'qr-1', x: 12, y: 70, w: 12, h: 9 };
  const activity = validateActivity({ type: 'link', title: 'Watch my lesson', url: 'https://example.com/manual-link', qrAnchor, buttonColour: '#195a73' });
  assert.equal(activity.fixedButton, true);
  const image = new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' });
  const draft = { title: 'Additional book', pages: [{ number: 1, width: 600, height: 800, image, thumbnail: image, printedQrs: [qrAnchor], qrScanned: true, activities: [activity] }] };
  const file = await exportProject(draft), bytes = new Uint8Array(await file.arrayBuffer()); bytes.size = bytes.byteLength;
  const restored = await importProject(bytes), page = restored.pages[0];
  assert.equal(page.qrScanned, true); assert.deepEqual(page.printedQrs, [qrAnchor]);
  assert.deepEqual(page.activities[0].qrAnchor, qrAnchor);
  assert.equal(page.activities[0].url, 'https://example.com/manual-link');
  assert.equal(page.activities[0].title, 'Watch my lesson');
  assert.equal(page.activities[0].buttonColour, '#195a73');
  assert.throws(() => validateActivity({ ...activity, url: 'javascript:alert(1)' }), /HTTP/);
});

test('book search matches series/class with optional subject and case-insensitive name', () => {
  const books = [{ title: 'Additional English', seriesId: 'additional', classId: 'prep', subjectId: 'english' }, { title: 'English', seriesId: 'stemford', classId: 'prep', subjectId: 'english' }];
  assert.deepEqual(findPublishedBooks(books, { seriesId: 'additional', classId: 'prep', query: ' ENGLISH ' }), [books[0]]);
  assert.deepEqual(findPublishedBooks(books, { seriesId: 'additional', classId: 'class-8' }), []);
  assert.deepEqual(findPublishedBooks(books, { seriesId: 'additional', subjectId: 'urdu' }), []);
});


test('QR companion buttons automatically sit beside their printed codes without covering them', () => {
  for (const qrAnchor of [{ x: 32, y: 6, w: 7, h: 5 }, { x: 85, y: 85, w: 9, h: 8 }]) {
    const p = pageButtonPlacement({ fixedButton: true, qrAnchor }, 0);
    assert.equal(p.w, 29); assert.equal(p.h, 5.5);
    assert.ok(p.x + p.w <= qrAnchor.x || p.x >= qrAnchor.x + qrAnchor.w || p.y + p.h <= qrAnchor.y || p.y >= qrAnchor.y + qrAnchor.h);
    assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w <= 100 && p.y + p.h <= 100);
  }
});
