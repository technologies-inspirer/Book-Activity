import test from 'node:test';
import assert from 'node:assert/strict';
import { createStrokeTracer, tracingRows, isWritingStrip, tracingPointerSamples } from '../src/strokeTracing.js';
import { evenly } from '../src/traceCheck.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const follow = (tracer, path, step = 1) => {
  assert.equal(tracer.begin(path[0]), true);
  const drawn = evenly(path, step).flatMap(point => tracer.move(point));
  tracer.end();
  return drawn;
};

test('a stroke draws from start to end, including very slow pencil movements', () => {
  const path = [[10, 10], [10, 80], [60, 80]];
  for (const step of [.02, 1, 15]) {
    const tracer = createStrokeTracer([path], 6);
    assert.ok(follow(tracer, path, step).length > 0);
    assert.equal(tracer.done(), true, `movement step ${step}`);
  }
});

test('starting in the middle, tapping or rubbing around one spot cannot complete a letter', () => {
  const tracer = createStrokeTracer([[[0, 0], [0, 80], [60, 80]]], 6);
  assert.equal(tracer.begin([0, 40]), false);
  assert.equal(tracer.begin([0, 0]), true);
  for (let n = 0; n < 200; n++) {
    tracer.move([3, 4]); tracer.move([-3, 0]); tracer.move([0, 0]);
  }
  tracer.end();
  assert.equal(tracer.done(), false);
  assert.ok(tracer.expected()[1] < 12);
});

test('moving off the path draws nothing there and cannot jump to the end', () => {
  const tracer = createStrokeTracer([[[0, 0], [0, 60], [60, 60]]], 5);
  assert.equal(tracer.begin([0, 0]), true);
  assert.deepEqual(tracer.move([60, 0]), []);
  assert.deepEqual(tracer.move([60, 60]), []);
  tracer.end();
  assert.equal(tracer.done(), false);
  assert.ok(follow(tracer, [[0, 0], [0, 60], [60, 60]]).length);
  assert.equal(tracer.done(), true);
});

test('a diagonal shortcut across a rounded or bent letter does not count', () => {
  const tracer = createStrokeTracer([[[0, 0], [0, 80], [80, 80]]], 5);
  tracer.begin([0, 0]); tracer.move([80, 80]); tracer.end();
  assert.equal(tracer.done(), false);
});

test('separate strokes still require their own start, including disconnected dots', () => {
  const tracer = createStrokeTracer([[[0, 0], [0, 60]], [[20, 10], [20, 60]], [[10, -10]]], 5);
  tracer.begin([0, 0]); tracer.move([0, 60]);
  assert.deepEqual(tracer.move([20, 60]), []);
  assert.equal(tracer.begin([20, 10]), false);
  tracer.end();
  assert.equal(tracer.done(), false);
  assert.equal(tracer.begin([20, 60]), false);
  follow(tracer, [[20, 10], [20, 60]]);
  assert.equal(tracer.done(), false);
  follow(tracer, [[10, -10]]);
  assert.equal(tracer.done(), true);
});

test('a brief drift recovers on the next forward dots without lifting or returning to a locked point', () => {
  const tracer = createStrokeTracer([[[0, 0], [0, 100]]], 6);
  tracer.begin([0, 0]);
  tracer.move([0, 20]);
  assert.deepEqual(tracer.move([20, 25]), []);
  const continued = tracer.move([0, 45]);
  assert.ok(continued.length > 0);
  assert.ok(tracer.expected()[1] >= 43);
  tracer.move([0, 100]); tracer.end();
  assert.equal(tracer.done(), true);
});

test('one held gesture flows between strokes and detached dots without drawing across the gaps', () => {
  const tracer = createStrokeTracer([[[0, 0], [0, 60]], [[20, 10], [20, 60]], [[10, -10]]], 5);
  tracer.begin([0, 0]);
  tracer.move([0, 58]); // Near the last dot is enough; no exact-pixel stopping point.
  assert.deepEqual(tracer.guide(), [20, 10]);
  assert.deepEqual(tracer.move([20, 60]), [], 'cannot skip the start of the next stroke');
  assert.deepEqual(tracer.move([20, 10]), [[20, 10], [20, 10]]);
  const second = tracer.move([20, 60]);
  assert.ok(second.length > 10);
  assert.ok(second.every(([x]) => x === 20), 'no diagonal connector between strokes');
  assert.deepEqual(tracer.guide(), [10, -10]);
  assert.deepEqual(tracer.move([10, -10]), [[10, -10], [10, -10]]);
  tracer.end();
  assert.equal(tracer.done(), true);
});

test('joined strokes continue immediately even with sparse fast pointer events at their shared corner', () => {
  const tracer = createStrokeTracer([[[0, 0], [0, 60]], [[0, 60], [60, 60]]], 5);
  tracer.begin([0, 0]);
  tracer.move([0, 60]);
  const next = tracer.move([60, 60]);
  assert.ok(next.length > 10);
  assert.deepEqual(next.at(-1), [60, 60]);
  tracer.end();
  assert.equal(tracer.done(), true);
});

test('partial work resumes from the last accepted point; lifting early never awards completion', () => {
  const tracer = createStrokeTracer([[[0, 0], [0, 100]]], 5);
  tracer.begin([0, 0]); tracer.move([0, 80]); tracer.end();
  assert.equal(tracer.done(), false);
  assert.equal(tracer.begin([0, 100]), false);
  const next = tracer.expected();
  assert.ok(next[1] >= 75 && next[1] <= 85);
  assert.deepEqual(tracer.remaining()[0][0], next);
  follow(tracer, [next, [0, 100]]);
  assert.equal(tracer.done(), true);
  tracer.reset();
  assert.equal(tracer.done(), false);
  assert.deepEqual(tracer.expected(), [0, 0]);
});

test('a loop followed by a separate downstroke completes only after both are traced', () => {
  const loop = Array.from({ length: 101 }, (_, k) => {
    const angle = -k / 100 * Math.PI * 2;
    return [40 + Math.cos(angle) * 25, 40 + Math.sin(angle) * 30];
  });
  const stem = [[66, 10], [66, 70], [78, 74]];
  const tracer = createStrokeTracer([loop, stem], 6);
  follow(tracer, loop);
  assert.equal(tracer.done(), false);
  assert.deepEqual(tracer.expected(), stem[0]);
  follow(tracer, stem);
  assert.equal(tracer.done(), true);
});

test('fast curved writing catches up in the same event and stays snapped to the dotted arc', () => {
  const arc = Array.from({ length: 101 }, (_, k) => {
    const angle = k / 100 * Math.PI / 2;
    return [40 + Math.cos(angle) * 25, 40 + Math.sin(angle) * 30];
  });
  const tracer = createStrokeTracer([arc], 6);
  tracer.begin(arc[0]);
  const drawn = tracer.move(arc.at(-1));
  assert.ok(drawn.length > 20, 'intermediate dots are drawn immediately');
  assert.deepEqual(tracer.expected(), arc.at(-1));
  assert.ok(drawn.every(([x, y]) => Math.abs(((x - 40) / 25) ** 2 + ((y - 40) / 30) ** 2 - 1) < .01));
  tracer.end();
  assert.equal(tracer.done(), true);
});

test('batched touch positions preserve curved movement and include the latest point once', () => {
  const first = { clientX: 10, clientY: 10 }, next = { clientX: 15, clientY: 20 };
  const event = { clientX: 20, clientY: 25, getCoalescedEvents: () => [first, next] };
  assert.deepEqual(tracingPointerSamples(event), [first, next, event]);
  const same = { ...next, getCoalescedEvents: () => [first, next] };
  assert.deepEqual(tracingPointerSamples(same), [first, next]);
  assert.deepEqual(tracingPointerSamples(first), [first]);
});

test('small hand wobble is accepted, but drawn coordinates always stay on the path', () => {
  const tracer = createStrokeTracer([[[0, 0], [0, 100]]], 6);
  tracer.begin([0, 0]);
  const drawn = [];
  for (let y = 1; y <= 100; y++) drawn.push(...tracer.move([Math.sin(y) * 2, y]));
  tracer.end();
  assert.equal(tracer.done(), true);
  assert.ok(drawn.length > 0);
  assert.ok(drawn.every(([x]) => x === 0));
});

test('the writing gaps between letters are protected without blocking a picture beside them', () => {
  assert.deepEqual(tracingRows([[10, 25, 15, 10], [30, 25, 15, 10], [10, 50, 10, 8], [70, 50, 10, 8]]),
    [[10, 25, 45, 35], [10, 50, 80, 58]]);
});

test('closed practice-line strips are paper; ordinary picture shapes remain colourable', () => {
  const width = 200, height = 400;
  const strip = new Uint8Array(width * height), picture = new Uint8Array(width * height);
  for (let y = 220; y < 232; y++) for (let x = 10; x < 190; x++) strip[y * width + x] = 1;
  for (let y = 20; y < 100; y++) for (let x = 100; x < 180; x++) if (Math.hypot(x - 140, y - 60) < 38) picture[y * width + x] = 1;
  assert.equal(isWritingStrip(strip, width, height), true);
  assert.equal(isWritingStrip(picture, width, height), false);
  assert.equal(isWritingStrip(new Uint8Array(width * height), width, height), false);
});

// Exercise the shared legacy page handler as well as the path maths. In particular,
// starting a real activity must produce pencil strokes rather than blocking input.
function activityFixture() {
  const nodes = [], lines = [];
  const inkCanvas = { width: 1200, height: 1600 };
  function element(tag, attributes = {}, ...children) {
    const node = {
      ...attributes, tag, children, style: {}, handlers: {},
      classList: { add() {}, remove() {}, toggle() {} },
      append(...items) { this.children.push(...items); },
      replaceChildren(...items) { this.children = items; },
      remove() {},
      addEventListener(name, fn) { this.handlers[name] = fn; },
      querySelector(selector) { return selector === 'canvas.ink' ? inkCanvas : null; },
      querySelectorAll() { return []; },
      getContext() { return {
        lineWidth: 0, save() {}, restore() {}, beginPath() {}, moveTo() {},
        lineTo(x, y) { lines.push([x, y, this.lineWidth]); }, stroke() {}, arc() {}, fill() {}, clearRect() {},
        drawImage() {}, getImageData() { return { data: new Uint8ClampedArray(100 * 100 * 4) }; }
      }; },
      toDataURL() { return 'data:image/png;base64,test'; }
    };
    nodes.push(node);
    return node;
  }
  const sheet = element('div'), score = element('span');
  const context = {
    createStrokeTracer, tracingRows, evenly,
    el: element, document: { createElement: tag => element(tag) },
    Image: class { naturalWidth = 100; naturalHeight = 100; set src(value) { this.onload?.(); } },
    inkShape: () => ({ w: 100, h: 100, half: 3, middle: [[100 / 6, 100 / 6], [100 / 6, 500 / 6], [500 / 6, 500 / 6]] }),
    penOf: () => 'M0 0V1H1', glyphStrokes: () => [[[0, 0], [0, 1], [1, 1]]],
    warmUp() {}, chime() {}, speak() {}, schedule() { return 1; }, clearTimeout() {},
    PRAISE: { en: ['Good job'] }, SAY: { en: { tap: 'Start here', done: 'Done' } }, ALL_DONE: { en: 'Done' },
    brush: { color: '#e63946', size: 60 }, drawings: {}, traced: {}, sheet, score
  };
  const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('  function traceChecker('), source.indexOf('  /* ---------- reader ---------- */'));
  vm.runInNewContext(`${handler}\nthis.checker = traceChecker({ ratio: .75 }, { steps: [{ marks: [{ glyph: 'L', box: [10,20,20,20], ink: { src: 'letter.png', box: [5,15,30,30] } }] }] }, sheet, score, 'test');`, context);
  return { checker: context.checker, inkCanvas, score, lines, context };
}

test('the activity accepts writing, draws narrow pencil strokes and awards a star only after lifting at the end', () => {
  const { checker, inkCanvas, score, lines } = activityFixture();
  assert.equal(checker.down([120, 320], inkCanvas, false), 'own');
  checker.move([120, 640], inkCanvas);
  assert.equal(score.textContent, undefined);
  checker.move([360, 640], inkCanvas);
  checker.up(inkCanvas);
  assert.match(score.textContent, /1 \/ 1/);
  assert.ok(lines.length > 10, 'writing is visible');
  assert.ok(lines.every(([, , width]) => width < 30), 'large colouring brush never affects pencil width');
  assert.ok(lines.every(([x, y]) => Math.abs(x - 120) < .01 || Math.abs(y - 640) < .01));
});

test('the activity blocks a middle start and rubbing, leaves picture colouring available and supports clear/retry', () => {
  const { checker, inkCanvas, score } = activityFixture();
  assert.equal(checker.down([240, 480], inkCanvas, false), 'block');
  assert.equal(checker.down([1000, 100], inkCanvas, false), 'free');
  assert.equal(checker.down([120, 320], inkCanvas, false), 'own');
  for (let n = 0; n < 40; n++) { checker.move([120, 330], inkCanvas); checker.move([120, 320], inkCanvas); }
  checker.up(inkCanvas);
  assert.equal(score.textContent, undefined);
  checker.reset();
  assert.match(score.textContent, /0 \/ 1/);
  assert.equal(checker.down([120, 320], inkCanvas, false), 'own');
  checker.move([120, 640], inkCanvas); checker.move([360, 640], inkCanvas); checker.up(inkCanvas);
  assert.match(score.textContent, /1 \/ 1/);
});

test('batched activity input continues after a drift without an extra down/up gesture', () => {
  const { checker, inkCanvas, score, lines } = activityFixture();
  assert.equal(checker.down([120, 320], inkCanvas, false), 'own');
  checker.moves([[120, 400], [210, 420], [120, 500], [120, 640], [360, 640]], inkCanvas);
  checker.up(inkCanvas);
  assert.match(score.textContent, /1 \/ 1/);
  assert.ok(lines.every(([x, y]) => Math.abs(x - 120) < .01 || Math.abs(y - 640) < .01));
});
