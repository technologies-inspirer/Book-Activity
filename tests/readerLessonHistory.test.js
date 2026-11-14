import test from 'node:test';
import assert from 'node:assert/strict';
import { createLessonHistory } from '../src/readerLessonHistory.js';

function setup(bookId) {
  const entries = [{ state: null, url: `#/book/${bookId}` }, { state: { reader: true }, url: `#/book/${bookId}/read/5` }];
  let index = 1;
  const history = {
    get state() { return entries[index].state; },
    get url() { return entries[index].url; },
    get length() { return entries.length; },
    pushState(state, _title, url) { entries.splice(index + 1); entries.push({ state, url }); index++; },
    replaceState(state, _title, url) { entries[index] = { state, url }; },
    back() { index--; navigation.pop(); },
    forward() { index++; navigation.pop(); }
  };
  const returned = [], restored = [];
  const navigation = createLessonHistory({ history, onReturn: entry => returned.push(entry), onRestore: entry => { restored.push(entry); return entry.bookId === bookId; } });
  return { history, navigation, returned, restored };
}

test('browser Back from a lesson leaves every supported book open, not on its cover', () => {
  for (const bookId of ['new-stemford-english-3', 'stemford-english-4', 'stemford-urdu-3', 'stemford-urdu-4', 'stemford-urdu-5', 'stemford-maths-3', 'stemford-maths-4', 'stemford-series-computer-book-0-curve']) {
    const { navigation, history, returned } = setup(bookId);
    const readerHash = `#/book/${bookId}/read/5`;
    navigation.open(bookId, 'a', readerHash);
    assert.equal(history.length, 3);
    history.back();
    assert.equal(history.url, readerHash);
    assert.equal(returned.length, 1);
    assert.equal(history.state.reader, true);
  }
});

test('Back to book consumes the lesson entry and Forward can restore it', () => {
  const { navigation, history, returned, restored } = setup('book');
  assert.equal(navigation.close(), false);
  navigation.open('book', 'a', '#/book/book/read/5');
  assert.equal(navigation.close(), true);
  assert.equal(returned.length, 1);
  assert.equal(history.url, '#/book/book/read/5');
  history.forward();
  assert.equal(restored[0].lessonKey, 'a');
  assert.equal(navigation.close(), true);
  assert.equal(returned.length, 2);
});

test('moving to another lesson retains a single Back step and the latest open spread', () => {
  const { navigation, history, returned } = setup('book');
  navigation.open('book', 'a', '#/book/book/read/5');
  navigation.open('book', 'b', '#/book/book/read/7');
  assert.equal(history.length, 3);
  history.back();
  assert.equal(history.url, '#/book/book/read/7');
  assert.equal(returned[0].lessonKey, 'b');
  assert.equal(navigation.close(), false);
});
