import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { getLearningBooks } from '../src/data/learningCatalog.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const exists = path => existsSync(new URL('../' + path, import.meta.url));
const context = { window: {} };
vm.createContext(context);
for (const file of ['books/library.js', 'books/activities-english4.js']) vm.runInContext(read(file), context);
const library = JSON.parse(JSON.stringify(context.window.PDF_BOOKS));
const book = library.find(b => b.id === 'stemford-english-4');
const activities = JSON.parse(JSON.stringify(context.window.BOOK_ACTIVITIES[book.id]));
const palettes = JSON.parse(read('books/colour-palettes.json'));
const english3Videos = new Set([...read('tools/make_english3.py').matchAll(/'([\w-]{11})'/g)].map(m=>m[1]));
const picturePages = [6,8,10,12,17,19,21,23,28,30,32,34,39,41,43,45,50,52,54,56,58,63,65,67,69,71];
const within = (box, outer = [0,0,100,100]) => {
  const [x,y,w,h] = box, [ox,oy,ow,oh] = outer;
  assert.ok(w > 0 && h > 0 && x >= ox && y >= oy && x+w <= ox+ow+.03 && y+h <= oy+oh+.03, JSON.stringify({box,outer}));
};

test('English 4+ imports all 80 supplied pages and appears under Nursery / Stemford / English', () => {
  assert.equal(book.pages, 80);
  assert.equal(book.rtl, false);
  assert.deepEqual(getLearningBooks(library, {classId:'nursery', seriesId:'stemford', subjectId:'english'}), [book]);
  assert.ok(exists(`${book.dir}/cover.jpg`));
  for (let p=1;p<=80;p++) assert.ok(exists(`${book.dir}/p${String(p).padStart(3,'0')}.jpg`));
  assert.deepEqual(Object.keys(activities).map(Number), Array.from({length:76},(_,i)=>i+5));
});

test('Watch video uses only resolved QR codes printed in this English 4+ book', () => {
  const scanned = JSON.parse(read(`${book.dir}/qr.json`));
  assert.equal(Object.keys(scanned).length,37);
  assert.equal(Object.keys(book.qr).length,36);
  assert.ok(!book.qr[1], 'The cover has no playable lesson');
  for (const [p,item] of Object.entries(book.qr)) {
    assert.deepEqual(item,scanned[p]);within(item.box);
    assert.match(item.url,/^https:\/\/o2o\.to\/i\/\w+$/);
    for (const video of item.videos) assert.match(video.id,/^[\w-]{11}$/);
  }
  for (const p of picturePages) assert.ok(book.qr[p]?.videos.length);
  assert.equal(book.qr[6].videos[0].id,'jLaZ91z8GUw');
  assert.equal(book.qr[76].videos[0].id,'jGyb75cNQOI');
});

test('each alphabet lesson uses its own vocabulary pictures and three rows of real capital/small tracing masks', () => {
  let masks = 0;
  for (const [i,p] of picturePages.entries()) {
    const letter = String.fromCharCode(97+i);
    const picture = activities[p];
    assert.equal(picture.find(a=>a.type==='game').targets.length, 3);
    assert.ok(!picture.some(a=>a.type==='story'), 'the publisher videos replace the home-made story');
    const vids = picture.filter(a=>a.type==='videos').map(a=>a.label);
    assert.deepEqual(vids, letter==='e' ? ['Story'] : ['Story','Vocabulary']);
    assert.ok(!activities[p+1].some(a=>a.type==='story'));
    assert.match(activities[p+1].find(a=>a.type==='fill').video.src,/^https:\/\/youtu\.be\/[\w-]{11}$/);
    const trace = activities[p+1].find(a=>a.type==='fill');
    assert.equal(trace.steps.length,4);
    assert.equal(trace.steps[0].marks.length,2, 'the big model capital and small letter come first');
    assert.ok(trace.steps[0].marks.every(m=>m.ink.src.includes('_model_') && m.box[3]>5));
    assert.deepEqual(trace.colours,palettes.books[book.id][p+1].colours.map(c=>palettes.colours[c]));
    const marks = trace.steps.flatMap(s=>s.marks);
    assert.ok([20,22].includes(marks.length));
    for (const [k,m] of marks.entries()) {
      assert.equal(m.glyph,k%2===0?letter.toUpperCase():letter);
      within(m.box);within(m.ink.box);
      assert.ok(m.box[1] > 34 && m.box[1]+m.box[3] < 75);
      assert.ok(m.ink.src.startsWith(`${book.dir}/ink/p${String(p+1).padStart(3,'0')}_`));
      const png=readFileSync(new URL('../'+m.ink.src,import.meta.url));
      assert.equal(png.subarray(1,4).toString(),'PNG');
      assert.ok(png.length>100);
      masks++;
    }
  }
  assert.ok(masks>=562);
});

test('every traced letter has pen strokes, and capitals are not cut off at the top rule', () => {
  const app = read('app.js'), glyphs = app.slice(app.indexOf('const GLYPHS = {'), app.indexOf('};', app.indexOf('const GLYPHS = {')));
  const known = new Set([...glyphs.matchAll(/^\s*(\w+): '/gm)].map(m => m[1]));
  for (const p of picturePages) for (const m of activities[p+1].find(a=>a.type==='fill').steps.flatMap(s=>s.marks)) {
    assert.ok(m.pen || known.has(m.glyph), `page ${p+1}: no pen strokes for ${m.glyph}`);
    // A full capital is about 4.8% of the page tall; the old cut-off tops left only ~3.9%.
    if (m.glyph === m.glyph.toUpperCase()) assert.ok(m.box[3] > 4.5, `page ${p+1}: ${m.glyph} is cut off (${m.box[3]})`);
  }
  for (const p of [29,31]) for (const m of activities[p].find(a=>a.type==='fill').steps.flatMap(s=>s.marks))
    if ((m.glyph === 'i' || m.glyph === 'j') && !m.ink.src.includes('_model_')) assert.match(m.pen, /^M/);   // the dotted rows
});

test('each colouring picture names what it shows and uses its real colours', () => {
  const pages = palettes.books[book.id];
  assert.match(pages[9].picture, /butterfly/);
  assert.deepEqual(pages[20].colours, ['dark green','brown','black']);    // Pakistan flag
  for (const p of picturePages) assert.doesNotMatch(pages[p+1].picture, /illustration/);
});

test('all game hit areas remain inside the printed exercise crop and every narration uses its own page', () => {
  for (const [p,entries] of Object.entries(activities)) for (const activity of entries) {
    for (const v of [activity.video, ...(activity.videos||[])].filter(Boolean))
      assert.ok(!english3Videos.has(v.src.slice(-11)), 'No videos may be borrowed from other editions');
    if (activity.type==='story') for (const scene of activity.scenes) {
      assert.equal(scene.page,Number(p));assert.ok(scene.text.trim());
    }
    if (activity.type==='game') {
      const crop=activity.crop;within([crop.x,crop.y,crop.w,crop.h]);
      for (const t of activity.targets) within([t.x,t.y,t.w,t.h],[crop.x,crop.y,crop.w,crop.h]);
    }
  }
});

test('blending, vowel colour code and grammar match this edition and Listen uses the reader text schema', () => {
  for (const p of [16,27,38,49,62]) assert.equal(activities[p].find(a=>a.type==='game').targets.length,12);
  assert.deepEqual(palettes.books[book.id][76].colours,['yellow','green','brown','blue','red']);
  assert.deepEqual(palettes.books[book.id][79].colours,['black']);
  assert.deepEqual(activities[79].find(a=>a.type==='game').targets.map(t=>t.name),['a duck','an orange','a swan','an igloo','an ice cream']);
  const text=JSON.parse(read(`${book.dir}/text.json`));
  assert.equal(text.length,80);
  for(let p=5;p<=80;p++) assert.ok(text[p-1].every(block=>typeof block[4]==='string' && block[4].length>20));
  assert.match(text[76][0][4],/zip/);
  assert.match(text[79][0][4],/cat and mat/);
});
