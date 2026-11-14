import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: { BOOK_ACTIVITIES: {} } };
vm.createContext(context);
for (const file of ['activities', 'activities-english3', 'activities-english4', 'activities-english5', 'activities-maths3', 'activities-maths4',
  'activities-urdu3', 'activities-urdu4', 'activities-computer0', 'activities-maxford', 'activities-urdu5', 'game-crops']) {
  vm.runInContext(readFileSync(new URL(`../books/${file}.js`, import.meta.url), 'utf8'), context);
}
const { BOOK_ACTIVITIES: acts, GAME_FIXES: fixes } = JSON.parse(JSON.stringify(context.window));

test('every game fix belongs to a real game and keeps its crop on the page', () => {
  let count = 0;
  for (const [book, pages] of Object.entries(fixes)) for (const [page, games] of Object.entries(pages)) for (const [i, fix] of Object.entries(games)) {
    const game = [].concat(acts[book][page])[i];
    assert.equal(game?.type, 'game', `${book} ${page} ${i}`);
    const c = fix.crop;
    assert.ok(c.x >= 0 && c.y >= 0 && c.w > 5 && c.h > 5 && c.x + c.w <= 100.01 && c.y + c.h <= 100.01, `${book} ${page}`);
    // a fitted crop never moves far off the pictures the child taps
    for (const t of fix.targets || game.targets) {
      assert.ok(t.x + t.w > c.x && t.x < c.x + c.w && t.y + t.h > c.y && t.y < c.y + c.h, `${book} ${page} ${t.name}`);
    }
    count++;
  }
  assert.ok(count > 150);
});

test('hand-measured games put their tap boxes on the pictures', () => {
  const e4 = fixes['stemford-english-4'];
  const p15 = Object.values(e4['15'])[0].targets;
  assert.deepEqual(p15.map(t => t.name).slice(0, 4), ['axe', 'bear', 'cup', 'alligator']);
  assert.equal(p15.find(t => t.name === 'cup').y, 28.5);
  // the spoken words of each picture are kept
  assert.equal(Object.values(e4['26'])[0].targets[0].say, [].concat(acts['stemford-english-4']['26']).find(a => a.type === 'game').targets[0].say);
});
