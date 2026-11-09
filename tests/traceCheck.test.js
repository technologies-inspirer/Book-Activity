import test from 'node:test';
import assert from 'node:assert/strict';
import { evenly, inkShape, inkDistance, cover, finished, nearlyFinished, printedTraceStart, orderedInkStrokes } from '../src/traceCheck.js';

// A dotted "L" in a 60 x 60 ink picture: a stick 4 pixels thick down from (20, 6) to (20, 50),
// then along to (48, 50). Its middle line is what a child should trace.
const W = 60, H = 60, alpha = new Uint8Array(W * H);
for (let y = 6; y < 52; y++) for (let x = 18; x < 22; x++) alpha[y * W + x] = 255;
for (let y = 48; y < 52; y++) for (let x = 18; x < 50; x++) alpha[y * W + x] = 255;
const ink = inkShape(alpha, W, H);
const R = Math.max(ink.half * 2.2, H * .07);          // how far around the finger the letter is coloured (app.js)
const trace = (...corners) => {
  const done = new Uint8Array(ink.middle.length);
  evenly(corners, 1).forEach(q => cover(ink, done, q, R));
  return done;
};

test('points come out evenly spaced', () => {
  const pts = evenly([[0, 0], [10, 0]], 2);
  assert.deepEqual(pts.map(p => p[0]), [0, 2, 4, 6, 8, 10]);
  assert.equal(evenly([[0, 0]], 1).length, 1);
});

test('the middle of the ink is found along the whole letter', () => {
  assert.ok(ink.half >= 1 && ink.half <= 3);
  assert.ok(ink.middle.some(([x, y]) => Math.abs(x - 20) <= 2 && y < 15));
  assert.ok(ink.middle.some(([x, y]) => x > 44 && Math.abs(y - 50) <= 2));
});

test('how far a point is from the ink', () => {
  assert.equal(inkDistance(ink, [20, 20]), 0);
  assert.ok(inkDistance(ink, [30, 20]) > 7);
  assert.equal(inkDistance(ink, [-5, 20]), Infinity);
});

test('going over the whole letter finishes it, even a little wobbly', () => {
  assert.ok(finished(ink, trace([20, 7], [20, 50], [48, 50])));
  const done = new Uint8Array(ink.middle.length);
  evenly([[20, 7], [20, 50], [48, 50]], 1).forEach(([x, y], k) => cover(ink, done, [x + Math.sin(k) * 1.5, y + Math.cos(k) * 1.5], R));
  assert.ok(finished(ink, done));
});

test('a letter only partly gone over is not finished', () => {
  assert.ok(!finished(ink, trace([20, 7], [20, 50])));                      // the foot is left
  assert.ok(!finished(ink, trace([20, 7], [20, 50], [34, 50])));            // the foot stops halfway
  assert.ok(!finished(ink, new Uint8Array(ink.middle.length)));
});

test('covering tells how many parts were new', () => {
  const done = new Uint8Array(ink.middle.length);
  const first = cover(ink, done, [20, 20], R);
  assert.ok(first > 0);
  assert.equal(cover(ink, done, [20, 20], R), 0);
});

test('Urdu starts on the printed black dot rather than the top-right corner or grey letter dot', () => {
  const w = 100, h = 100, rgba = new Uint8ClampedArray(w * h * 4).fill(255);
  const fill = (x, y, radius, colour) => {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (Math.hypot(xx - x, yy - y) <= radius) {
      const i = (yy * w + xx) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = colour;
    }
  };
  fill(24, 27, 3, 25);                 // actual start on the left of jeem's head
  fill(55, 55, 5, 118);               // letter's grey dot is not a start
  fill(90, 10, 6, 20);                // another letter outside the crop
  for (let x = 30; x < 65; x++) {
    const i = (22 * w + x) * 4;
    rgba[i] = rgba[i + 1] = rgba[i + 2] = 25;  // the thin upper stroke
  }
  const point = printedTraceStart(rgba, w, h, [10, 15, 65, 70]);
  assert.ok(Math.hypot(point[0] - 24, point[1] - 27) < .5);
  assert.equal(printedTraceStart(new Uint8ClampedArray(w * h * 4).fill(255), w, h, [10, 10, 60, 60]), null);
});

test('Urdu hint follows the connected body first and lifts before the separate letter dot', () => {
  const w = 110, h = 110, alpha = new Uint8Array(w * h);
  const body = [[20, 20], [60, 20], [30, 50], [30, 70], [50, 85], [75, 75], [85, 55]];
  for (const [x, y] of evenly(body, .5)) for (let yy = Math.max(0, Math.floor(y - 2)); yy <= Math.min(h - 1, y + 2); yy++) for (let xx = Math.max(0, Math.floor(x - 2)); xx <= Math.min(w - 1, x + 2); xx++) {
    if (Math.hypot(xx - x, yy - y) <= 2) alpha[yy * w + xx] = 255;
  }
  for (let y = 48; y <= 52; y++) for (let x = 58; x <= 62; x++) if (Math.hypot(x - 60, y - 50) <= 2) alpha[y * w + x] = 255;
  const shape = inkShape(alpha, w, h), strokes = orderedInkStrokes(shape, [20, 20]);
  assert.equal(strokes.length, 2);
  assert.ok(Math.hypot(strokes[0][0][0] - 20, strokes[0][0][1] - 20) < 2);
  assert.ok(Math.max(...strokes[0].map(point => point[1])) >= 80, 'body goes all the way around the lower curve');
  assert.ok(Math.hypot(strokes[0].at(-1)[0] - 85, strokes[0].at(-1)[1] - 55) < 5);
  assert.ok(strokes[1].every(point => Math.hypot(point[0] - 60, point[1] - 50) < 5), 'separate dot is last');
  for (const stroke of strokes) for (const point of evenly(stroke, 1)) assert.ok(inkDistance(shape, point) <= Math.max(1, shape.half * .35));
});

test('on lifting the finger, a letter mostly written is finished; one missing a whole part is not', () => {
  // the L gone over with short gaps all along (3 pixels missed in every 10): most of it done
  const gappy = new Uint8Array(ink.middle.length);
  evenly([[20, 7], [20, 50], [48, 50]], 1).filter((_, k) => k % 10 >= 3).forEach(q => cover(ink, gappy, q, 1.5));
  assert.ok(!finished(ink, gappy), 'not by the strict test');
  assert.ok(nearlyFinished(ink, gappy), 'but by the easy one');
  // the stick without its foot
  assert.ok(!nearlyFinished(ink, trace([20, 7], [20, 50])));
});