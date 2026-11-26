import test from 'node:test';
import assert from 'node:assert/strict';
import { formationPen, formationInInk, loopE, pencilAnimation } from '../src/letterFormation.js';
import { createStrokeTracer } from '../src/strokeTracing.js';
import { samplePen } from './helpers/samplePen.js';
import { inkShape } from '../src/traceCheck.js';
import { inkDistance } from '../src/traceCheck.js';
import { readInkPng } from './helpers/readInkPng.js';
import { alphabetFixtures } from './helpers/alphabetFixtures.js';

test('round letter bowls close exactly before switching strokes', () => {
  for (const glyph of ['a', 'b', 'd', 'g', 'p', 'q']) {
    const paths = samplePen(formationPen({ glyph }, ''));
    const bowl = paths[glyph === 'b' || glyph === 'p' ? 1 : 0];
    assert.deepEqual(bowl.at(-1), bowl[0], glyph);
    const scaled = bowl.map(p => p.map(v => v * 120));
    const tracer = createStrokeTracer([scaled], 8);
    assert.equal(tracer.begin(scaled[0]), true);
    const drawn = scaled.flatMap(point => tracer.move(point));
    assert.deepEqual(drawn.at(-1), scaled[0], `${glyph} closes the visible ring`);
    tracer.end();
    assert.equal(tracer.done(), true, glyph);
  }
});

test('loop e matches the Stemford font while Maxford retains its printed horizontal bar', () => {
  const barE = 'M.1 .52H.88C.88 .15 .22 .08 .1 .5C.05 .95 .7 1 .95 .82';
  for (const book of ['new-stemford-english-3', 'stemford-english-4']) {
    assert.equal(formationPen({ glyph: 'e', ink: { src: `books/${book}/ink/e.png` } }, barE), loopE);
  }
  assert.equal(formationPen({ glyph: 'e', ink: { src: 'books/maxford-global-qaida-3-english/ink/e.png' } }, barE), barE);
  const path = samplePen(loopE)[0];
  assert.ok(path[30][0] > path[0][0] && path[30][1] < path[0][1], 'starts upwards through the loop, without an extra horizontal stroke');
  assert.ok(path.every(p => p.every(Number.isFinite)));
});

test('authored pen paths remain authoritative', () => {
  assert.equal(formationPen({ glyph: 'd', pen: 'M0 0V1' }, ''), 'M0 0V1');
});

test('narrow model i follows the printed stem and places its dot above the crop', () => {
  const mark=alphabetFixtures().find(m=>m.ink?.src==='books/stemford-english-4/ink/p029_model_1.png');
  const png=readInkPng(new URL('../'+mark.ink.src,import.meta.url));
  const shape=inkShape(png.alpha,png.w,png.h);
  const strokes=formationInInk(samplePen(formationPen(mark,undefined,shape)),mark,shape);
  assert.ok(strokes[1][0][1]<shape.bounds[1]);
  assert.ok(inkDistance(shape,strokes[0][Math.floor(strokes[0].length/3)])<=2);
});

test('an oversized imported b box still follows the actual printed letter', () => {
  const mark=alphabetFixtures().find(m=>m.ink?.src==='books/maxford-global-qaida-3-english/ink/p016_640_506.png');
  const png=readInkPng(new URL('../'+mark.ink.src,import.meta.url));
  const shape=inkShape(png.alpha,png.w,png.h);
  const points=formationInInk(samplePen(formationPen(mark,undefined,shape)),mark,shape).flat();
  const outside=points.filter(point=>inkDistance(shape,point)>Math.max(1,shape.h*.012));
  assert.ok(outside.length/points.length<.1);
});

test('model and small letters use measured boxes without raster-grid backtracking', () => {
  const mark = { box: [11.9, 27.2, 8.2, 7.9], ink: { box: [9.85, 25.22, 12.3, 11.85] } };
  const path = [[[0, .5], [.25, .5], [.5, .5], [.75, .5], [1, .5]]];
  const mapped = formationInInk(path, mark, { w: 246, h: 237, middle: [[0,0],[246,237]] })[0];
  for (let i = 1; i < mapped.length; i++) {
    assert.ok(mapped[i][0] > mapped[i - 1][0]);
    assert.equal(mapped[i][1], mapped[0][1]);
  }
});

test('fitting to printed ink closes a dotted ring without reversing pen direction', () => {
  const w = 100, h = 100, alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = Math.hypot((x - 50) / 25, (y - 50) / 35);
    if (r > .82 && r < 1.18) alpha[y * w + x] = 255;
  }
  // Little gaps represent the dotted centre printed on model letters.
  for (let k = 0; k < 20; k++) {
    const a = k / 20 * Math.PI * 2;
    alpha[Math.round(50 + Math.sin(a) * 35) * w + Math.round(50 + Math.cos(a) * 25)] = 0;
  }
  const raw = Array.from({ length: 161 }, (_, k) => {
    const a = k / 160 * Math.PI * 2;
    return [.51 + Math.cos(a) * .25, .5 + Math.sin(a) * .35];
  });
  const mark = { box: [0,0,100,100], ink: { box: [0,0,100,100] } };
  const fitted = formationInInk([raw], mark, inkShape(alpha,w,h))[0];
  assert.deepEqual(fitted.at(-1), fitted[0]);
  for (let k = 1; k < fitted.length; k++) {
    const dx = fitted[k][0] - fitted[k - 1][0], dy = fitted[k][1] - fitted[k - 1][1];
    const ux = raw[k][0] - raw[k - 1][0], uy = raw[k][1] - raw[k - 1][1];
    assert.ok(dx * ux + dy * uy > 0, `no backwards jump at point ${k}`);
  }
});

test('E pencil lifts between bars and repeats while hidden instead of flying back', () => {
  const strokes = samplePen('M.06 0V1M.06 0H.95M.06 .5H.8M.06 1H.95');
  const frames = pencilAnimation(strokes, .75, true);
  assert.equal(frames[0].offset, 0);
  assert.equal(frames.at(-1).offset, 1);
  assert.equal(frames.at(-1).opacity, 0);
  for (let i = 1; i < frames.length; i++) {
    assert.ok(frames[i].offset > frames[i - 1].offset);
    if (!frames[i - 1].opacity && frames[i].opacity) {
      assert.equal(frames[i].left, frames[i - 1].left);
      assert.equal(frames[i].top, frames[i - 1].top);
    }
  }
  assert.deepEqual(pencilAnimation([]), []);
});

test('worked-example ink and pencil use the same timeline, pausing ink during pen lifts', () => {
  const strokes = [[[10,10],[10,30]], [[10,10],[30,10]]];
  const pencil = pencilAnimation(strokes, .75);
  const ink = pencilAnimation(strokes, .75, false, [20,20]);
  assert.deepEqual(ink.map(frame => frame.offset), pencil.map(frame => frame.offset));
  assert.equal(ink[0].strokeDashoffset, 1);
  assert.equal(ink.at(-1).strokeDashoffset, 0);
  for (let i = 1; i < ink.length; i++) {
    assert.ok(ink[i].strokeDashoffset <= ink[i - 1].strokeDashoffset);
    if (!pencil[i - 1].opacity && !pencil[i].opacity) assert.equal(ink[i].strokeDashoffset, ink[i - 1].strokeDashoffset);
  }
});
