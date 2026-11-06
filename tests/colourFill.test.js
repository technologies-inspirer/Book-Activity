import test from 'node:test';
import assert from 'node:assert/strict';
import { regionFrom, spread, partColour, closestColour, colourName, hexOf, pageColours } from '../src/colourFill.js';

// A white 40 x 40 picture with a black ring (radius 10 to 12) round (20, 20), and a red dot outside it.
function picture({ gap = false } = {}) {
  const w = 40, h = 40, rgba = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot(x - 20, y - 20), i = (y * w + x) * 4;
    const onRing = d >= 10 && d <= 12 && !(gap && x === 20 && y > 20);   // gap: a 1 pixel break at the bottom
    if (onRing) rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
  }
  const i = (5 * w + 5) * 4; rgba[i] = 230; rgba[i + 1] = 30; rgba[i + 2] = 40;
  return { rgba, w, h };
}
const at = (m, w, x, y) => m[y * w + x];

test('colouring inside a shape stays inside it', () => {
  const { rgba, w, h } = picture();
  const m = regionFrom(rgba, w, h, 20, 20, { grow: 0 });
  assert.equal(at(m, w, 20, 20), 1);
  assert.equal(at(m, w, 25, 20), 1);
  assert.equal(at(m, w, 2, 2), 0, 'outside the ring');
  assert.equal(at(m, w, 31, 20), 0, 'on the ring');
});

test('colouring outside a shape does not go into it', () => {
  const { rgba, w, h } = picture();
  const m = regionFrom(rgba, w, h, 2, 2, { grow: 0 });
  assert.equal(at(m, w, 2, 2), 1);
  assert.equal(at(m, w, 38, 38), 1);
  assert.equal(at(m, w, 20, 20), 0);
});

test('the colour reaches a little into the outline, and a touch on the line still colours beside it', () => {
  const { rgba, w, h } = picture();
  // the line is thickened by 1 to close gaps, so growing by 2 (the default) reaches into it
  const m = regionFrom(rgba, w, h, 20, 20);
  assert.equal(at(m, w, 30, 20), 1, 'just into the ring');
  assert.equal(at(m, w, 33, 20), 0, 'not past it');
  const onLine = regionFrom(rgba, w, h, 31, 20, { grow: 0 });
  assert.ok(onLine);
  assert.equal(at(onLine, w, 31, 20), 0);
});

test('a tiny gap in a line does not let the colour out', () => {
  const { rgba, w, h } = picture({ gap: true });
  const m = regionFrom(rgba, w, h, 20, 20, { grow: 0 });
  assert.equal(at(m, w, 2, 2), 0);
});

test('a shape grows by the asked number of pixels', () => {
  const m = new Uint8Array(25); m[12] = 1;                  // the middle of 5 x 5
  assert.equal(spread(m, 5, 5, 1).reduce((a, b) => a + b), 5);
  assert.equal(spread(m, 5, 5, 2).reduce((a, b) => a + b), 13);
});

// A 60 x 60 white picture: a red-outlined "strawberry" (ring round (15, 30)) and a black-outlined circle (round (45, 30)).
function fruit() {
  const w = 60, h = 60, rgba = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (Math.abs(Math.hypot(x - 15, y - 30) - 9) <= 1) { rgba[i] = 230; rgba[i + 1] = 40; rgba[i + 2] = 45; }
    if (Math.abs(Math.hypot(x - 45, y - 30) - 9) <= 1) rgba[i] = rgba[i + 1] = rgba[i + 2] = 20;
  }
  return { rgba, w, h };
}

test('a part ringed in colour wants that colour; one ringed in black, or the page itself, wants none', () => {
  const { rgba, w, h } = fruit();
  const berry = partColour(rgba, w, h, regionFrom(rgba, w, h, 15, 30, { grow: 0 }));
  assert.ok(berry && berry[0] > 200 && berry[1] < 80, 'red');
  assert.equal(partColour(rgba, w, h, regionFrom(rgba, w, h, 45, 30, { grow: 0 })), null);
  assert.equal(partColour(rgba, w, h, regionFrom(rgba, w, h, 2, 2, { grow: 0 })), null);
});

test('the colour on offer that is meant, and none when nothing is close', () => {
  const palette = ['#e63946', '#f4a261', '#4aa3df'];
  assert.equal(closestColour([235, 40, 50], palette), '#e63946');
  assert.equal(closestColour([60, 160, 70], palette), null);      // green is not on offer
});

test('colours are named the way a child would say them, in English and Urdu', () => {
  assert.deepEqual(colourName('#e63946'), { en: 'red', ur: 'لال' });
  assert.equal(colourName('#a3ce62').en, 'green');
  assert.equal(colourName('#b470b8').en, 'purple');
  assert.equal(colourName('#8d5524').en, 'brown');
  assert.equal(colourName('#222222').en, 'black');
});
test('a colour written as #rrggbb', () => {
  assert.equal(hexOf([230, 57, 70]), '#e63946');
  assert.equal(hexOf([0, 5.4, 255]), '#0005ff');
});
test('a hint of colour inside a black-outlined shape says its colour; a plain box to write in says none', () => {
  // a 120 x 120 picture: black ring round (60, 60) with a little blue scribble just inside it, at the top
  const w = 120, h = 120, rgba = new Uint8ClampedArray(w * h * 4).fill(255);
  const paint = (x, y, c) => { const i = (y * w + x) * 4; [rgba[i], rgba[i + 1], rgba[i + 2]] = c; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.abs(Math.hypot(x - 60, y - 60) - 20) <= 1) paint(x, y, [20, 20, 20]);
  for (let y = 42; y < 47; y++) for (let x = 56; x < 64; x++) paint(x, y, [40, 140, 220]);
  const ring = partColour(rgba, w, h, regionFrom(rgba, w, h, 60, 65, { grow: 0 }));
  assert.ok(ring && ring[2] > 180 && ring[0] < 100, 'blue');
  // a box with light blue sides, like a cell of the writing grid
  const box = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 10; y <= 40; y++) for (let x = 10; x <= 40; x++) if (x === 10 || x === 40 || y === 10 || y === 40) { const i = (y * w + x) * 4; box[i] = 120; box[i + 1] = 200; box[i + 2] = 240; }
  assert.equal(partColour(box, w, h, regionFrom(box, w, h, 25, 25, { grow: 0 })), null);
});
test('a page offers the colours of its pictures, not those of the letters to trace or of black lines', () => {
  // 200 x 200 page: a red ring and a black ring (pictures), and a blue ring inside a box marked as a letter to trace
  const w = 200, h = 200, rgba = new Uint8ClampedArray(w * h * 4).fill(255);
  const ring = (cx, cy, c) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.abs(Math.hypot(x - cx, y - cy) - 18) <= 1.2) { const i = (y * w + x) * 4; [rgba[i], rgba[i + 1], rgba[i + 2]] = c; } };
  ring(40, 40, [230, 40, 45]); ring(120, 40, [20, 20, 20]); ring(60, 140, [40, 120, 220]);
  const names = cs => cs.map(c => colourName(hexOf(c)).en);
  assert.deepEqual(names(pageColours(rgba, w, h, { skip: [[30, 110, 90, 170]] })), ['red']);
  assert.deepEqual(names(pageColours(rgba, w, h)).sort(), ['blue', 'red']);
});