import test from 'node:test';
import assert from 'node:assert/strict';
import { evenly, inkShape, inkDistance, cover, finished } from '../src/traceCheck.js';

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
