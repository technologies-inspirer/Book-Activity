import test from 'node:test';
import assert from 'node:assert/strict';
import { beginLoading, createLoadingScope, loadingState } from '../src/loading/loadingState.js';

test('overlapping work stays visible until all tasks finish and cancelled delays never appear', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const finishPage = beginLoading('Page', 200, { minimum: 0 });
  assert.equal(loadingState.snapshot(), null);
  const finishAudio = beginLoading('Audio', 0, { minimum: 0 });
  assert.equal(loadingState.snapshot(), 'Audio');
  t.mock.timers.tick(200);
  assert.equal(loadingState.snapshot(), 'Page');
  finishPage();
  assert.equal(loadingState.snapshot(), 'Audio');
  finishAudio(); finishAudio();
  const cancelled = beginLoading('Cancelled', 200);
  cancelled(); t.mock.timers.tick(300);
  assert.equal(loadingState.snapshot(), null);
});

test('reader loading ends on image errors, playback, detachment and scope disposal', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let notify;
  const previousObserver = globalThis.MutationObserver;
  const previousDocument = globalThis.document;
  globalThis.MutationObserver = class { constructor(callback) { notify = callback; } observe() {} disconnect() {} };
  globalThis.document = { body: {} };
  t.after(() => { globalThis.MutationObserver = previousObserver; globalThis.document = previousDocument; });
  const scope = createLoadingScope();
  const image = Object.assign(new EventTarget(), { complete: false, isConnected: true });
  scope.image(image); t.mock.timers.tick(200);
  assert.equal(loadingState.snapshot(), 'Loading your page...');
  image.dispatchEvent(new Event('error')); t.mock.timers.tick(1200);
  assert.equal(loadingState.snapshot(), null);
  const video = Object.assign(new EventTarget(), { tagName: 'VIDEO', paused: false, readyState: 0, isConnected: true });
  scope.media(video); video.dispatchEvent(new Event('waiting')); t.mock.timers.tick(200);
  assert.equal(loadingState.snapshot(), 'Buffering video...');
  video.dispatchEvent(new Event('playing')); t.mock.timers.tick(1200);
  assert.equal(loadingState.snapshot(), null);
  video.dispatchEvent(new Event('waiting')); t.mock.timers.tick(200);
  video.isConnected = false; notify();
  assert.equal(loadingState.snapshot(), null);
  scope.begin('PDF'); t.mock.timers.tick(200); scope.dispose();
  assert.equal(loadingState.snapshot(), null);
  video.dispatchEvent(new Event('waiting')); t.mock.timers.tick(200);
  scope.begin('After leaving'); t.mock.timers.tick(200);
  assert.equal(loadingState.snapshot(), null);
});


test('visible loaders remain for 1.2 seconds but forced cleanup clears them immediately', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const finish = beginLoading('Visible', 0);
  t.mock.timers.tick(400);
  finish();
  t.mock.timers.tick(799);
  assert.equal(loadingState.snapshot(), 'Visible');
  t.mock.timers.tick(1);
  assert.equal(loadingState.snapshot(), null);
  const cancel = beginLoading('Leaving', 0);
  cancel(); cancel(true);
  assert.equal(loadingState.snapshot(), null);
  t.mock.timers.tick(2000);
  assert.equal(loadingState.snapshot(), null);
});
