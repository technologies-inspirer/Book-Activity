import test from 'node:test';
import assert from 'node:assert/strict';
import { readerPoint, attachReaderRotation } from '../src/readerRotation.js';

test('normal pointer positions keep their original canvas coordinates', () => {
  const node = { closest: () => null, getBoundingClientRect: () => ({ left: 200, top: 100, width: 100, height: 200, right: 300 }) };
  assert.deepEqual(readerPoint({ clientX: 225, clientY: 150 }, node, 400, 200), [100, 50]);
});

test('writing coordinates follow the canvas after a clockwise reader rotation', () => {
  const node = { closest: () => ({}), getBoundingClientRect: () => ({ left: 200, top: 100, width: 100, height: 200, right: 300 }) };
  assert.deepEqual(readerPoint({ clientX: 275, clientY: 150 }, node, 400, 200), [100, 50]);
});


function fixture(native = false) {
  const elements = [];
  const make = () => Object.assign(new EventTarget(), { setAttribute(k, v) { this[k] = v; }, remove() {}, append() {} });
  const doc = Object.assign(new EventTarget(), { documentElement: {}, createElement() { const n = make(); elements.push(n); return n; } });
  if (native) doc.documentElement.requestFullscreen = async () => { doc.fullscreenElement = doc.documentElement; };
  doc.exitFullscreen = async () => { doc.fullscreenElement = null; doc.dispatchEvent(new Event('fullscreenchange')); };
  const win = Object.assign(new EventTarget(), { innerWidth: 400, innerHeight: 800,
    getComputedStyle: () => ({ paddingTop: '10', paddingBottom: '10' }),
    ResizeObserver: class { observe() {} disconnect() {} }
  });
  doc.defaultView = win;
  const classes = new Set(), bar = { append() {} };
  const root = { ownerDocument: doc, append() {}, querySelector: () => bar,
    style: { setProperty(k, v) { this[k] = v; } },
    classList: { toggle(k, on) { if (on) classes.add(k); else classes.delete(k); }, remove(...keys) { keys.forEach(k => classes.delete(k)); } }
  };
  const book = { parentElement: { clientWidth: 600 }, style: { removeProperty(k) { delete this[k]; } } };
  const cleanup = attachReaderRotation(root, book, { clientHeight: 300 }, .75);
  const click = async index => { elements[index].dispatchEvent(new Event('click')); await new Promise(resolve => setImmediate(resolve)); };
  return { doc, root, book, classes, cleanup, click };
}

test('reader starts normally, rotates only on click and returns on the next click', async () => {
  const r = fixture();
  assert.equal(r.classes.size, 0);
  assert.equal(r.book.style.width, undefined);
  await r.click(0);
  assert.ok(r.classes.has('reader-manual-rotated'));
  assert.equal(r.root.style['--rotated-width'], '800px');
  assert.equal(r.root.style['--rotated-height'], '400px');
  await r.click(0);
  assert.equal(r.classes.size, 0);
  assert.equal(r.book.style.width, undefined);
  r.cleanup();
});

test('full screen works without native API and Escape exits while preserving the rotation choice', async () => {
  const r = fixture();
  await r.click(0); await r.click(1);
  assert.ok(r.classes.has('reader-manual-fullscreen'));
  const key = new Event('keydown'); Object.defineProperty(key, 'key', { value: 'Escape' });
  r.doc.dispatchEvent(key);
  assert.equal(r.classes.has('reader-manual-fullscreen'), false);
  assert.ok(r.classes.has('reader-manual-rotated'));
  r.cleanup();
});

test('native browser exit and on-screen exit both restore normal viewing', async () => {
  const r = fixture(true);
  await r.click(1); await r.doc.exitFullscreen();
  assert.equal(r.classes.has('reader-manual-fullscreen'), false);
  await r.click(1); await r.click(3);
  assert.equal(r.classes.has('reader-manual-fullscreen'), false);
  assert.equal(r.book.style.width, undefined);
  r.cleanup();
});
