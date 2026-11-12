import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { getLearningBooks } from '../src/data/learningCatalog.js';

const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const exists = p => existsSync(new URL('../'+p,import.meta.url));
const ctx={window:{}};vm.createContext(ctx);
for(const p of ['books/library.js','books/activities-maths4.js'])vm.runInContext(read(p),ctx);
const library=JSON.parse(JSON.stringify(ctx.window.PDF_BOOKS));
const book=library.find(b=>b.id==='stemford-maths-4');
const acts=JSON.parse(JSON.stringify(ctx.window.BOOK_ACTIVITIES[book.id]));
const lessons=JSON.parse(read(`${book.dir}/lessons.json`));
const palettes=JSON.parse(read('books/colour-palettes.json'));
const regions=JSON.parse(read('books/colour-regions.json'))[book.id];
const boxInside=([x,y,w,h],outer=[0,0,100,100])=>{
 const [ox,oy,ow,oh]=outer;
 assert.ok(w>0&&h>0&&x>=ox-.02&&y>=oy-.02&&x+w<=ox+ow+.03&&y+h<=oy+oh+.03,JSON.stringify({box:[x,y,w,h],outer}));
};

test('Maths 4+ imports the supplied 72 pages and belongs to Nursery / Stemford / Maths',()=>{
 assert.equal(book.pages,72);assert.equal(book.rtl,false);
 assert.deepEqual(getLearningBooks(library,{classId:'nursery',seriesId:'stemford',subjectId:'maths'}),[book]);
 assert.ok(exists(`${book.dir}/cover.jpg`));
 for(let p=1;p<=72;p++)assert.ok(exists(`${book.dir}/p${String(p).padStart(3,'0')}.jpg`));
 assert.deepEqual(Object.keys(acts).map(Number),Array.from({length:69},(_,i)=>i+4));
});

test('numbers 1-20 have the publisher Story, Vocabulary and Formation videos and no AI stories',()=>{
 const supplied=JSON.parse(read('books/maths4-videos.json'));
 const links=new Set(Object.values(supplied).flatMap(Object.values));
 const used=[];
 for(const [p,entries] of Object.entries(acts))for(const a of entries){
  assert.notEqual(a.type,'story');assert.ok(!a.scenes);
  if(a.type==='videos'){assert.ok(links.has(a.videos[0].src),`page ${p}: unsupplied video`);used.push(a.videos[0].src);}
  assert.ok(!a.video,'No borrowed formation videos');
 }
 assert.equal(used.length,60);assert.equal(new Set(used).size,60,'each link used once');
 for(const l of lessons)if(l.number){
  assert.deepEqual(acts[l.picturePage].filter(a=>a.type==='videos').map(a=>a.videos[0].src),[supplied[l.number].Story,supplied[l.number].Vocabulary],`number ${l.number}`);
  assert.equal(acts[l.tracePage].find(a=>a.type==='videos').videos[0].src,supplied[l.number].Formation,`number ${l.number}`);
 }
 // the number pages keep tracing and bead colouring, without a game on the empty bead circles
 for(const l of lessons)assert.ok(!acts[l.picturePage].some(a=>a.type==='game'));
});

test('every button sits on the page, clear of the QR code',()=>{
 const scanned=JSON.parse(read(`${book.dir}/qr.json`));
 for(const [p,entries] of Object.entries(acts))for(const a of entries)if(a.button){
  const {x,y}=a.button;assert.ok(x>=0&&y>=0&&x+17<=100&&y+4.8<=100,`page ${p}`);
  const q=scanned[p]?.box;if(q)assert.ok(x+17<=q[0]||q[0]+q[2]<=x||y+4.8<=q[1]||q[1]+q[3]<=y,`page ${p}: button on the QR code`);
 }
});

test('printed Maths 4+ QR codes open their own publisher videos on all 30 lesson pages',()=>{
 const scanned=JSON.parse(read(`${book.dir}/qr.json`));
 assert.equal(Object.keys(scanned).length,31);
 assert.equal(Object.keys(book.qr).length,30);
 assert.ok(!book.qr[1]);
 for(const [p,item] of Object.entries(book.qr)){
  assert.deepEqual(item,scanned[p]);boxInside(item.box);
  assert.match(item.url,/^https:\/\/o2o\.to\/i\/\w+$/);
  assert.ok(item.videos.length);
  for(const video of item.videos)assert.match(video.id,/^[\w-]{11}$/);
 }
 for(const lesson of lessons)assert.ok(book.qr[lesson.picturePage]?.videos.length);
 assert.equal(book.qr[6].videos[0].id,'XW0O4OQqD0s');
 assert.equal(book.qr[66].videos[0].id,'Rxb4xSgHN_o');
 assert.equal(book.qr[72].videos[0].id,'BUUR3YF1SH8');
});

test('all number lessons use this edition, colour exactly the requested beads, and trace their own digits',()=>{
 assert.deepEqual(lessons.map(l=>l.number).sort((a,b)=>a-b),Array.from({length:21},(_,i)=>i));
 for(const lesson of lessons){
  const p=lesson.picturePage,fill=acts[p].find(a=>a.type==='fill');
  assert.equal(fill.steps.flatMap(s=>s.marks).filter(m=>m.scribble).length,lesson.number);
  assert.equal(fill.steps[0].marks.map(m=>m.glyph).slice(0,String(lesson.number).length).join(''),String(lesson.number));
  if(lesson.tracePage){
   const trace=acts[lesson.tracePage].find(a=>a.type==='fill');
   assert.ok(trace.steps.flatMap(s=>s.marks).length>=String(lesson.number).length*2);
  }
 }
 assert.equal(lessons.find(l=>l.number===11).objects,'vases');
 assert.equal(lessons.find(l=>l.number===20).objects,'eggs');
});

test('every tracing mask is this book’s asset and all game targets stay in their printed exercise',()=>{
 let masks=0;
 for(const [p,entries] of Object.entries(acts))for(const a of entries){
  if(a.type==='fill'){
   assert.equal(a.drawingMode,'regions');assert.ok(regions[p]?.length);
   assert.deepEqual(a.colours,palettes.books[book.id][p].colours.map(c=>palettes.colours[c]));
   for(const s of a.steps)for(const m of s.marks||[])if(m.ink){
    boxInside(m.box);assert.ok(m.ink.box.every(Number.isFinite));
    assert.ok(m.ink.src.startsWith(`${book.dir}/ink/p${String(p).padStart(3,'0')}_`));
    const png=readFileSync(new URL('../'+m.ink.src,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.length>80);masks++;
   }
  }
  if(a.type==='game'){
   const c=a.crop;boxInside([c.x,c.y,c.w,c.h]);assert.ok(a.targets.length);
   for(const t of a.targets)boxInside([t.x,t.y,t.w,t.h],[c.x,c.y,c.w,c.h]);
  }
 }
 assert.ok(masks>220);
});

test('numbers 21–100, operations and page colour codes retain their printed exercises',()=>{
 for(const [p,first,last] of [[61,21,30],[62,31,40],[63,41,50],[65,51,100]]){
  const a=acts[p].find(a=>a.type==='fill');const text=a.steps.flatMap(s=>s.marks).map(m=>m.glyph).join('');
  assert.ok(text.includes(String(first)));assert.ok(text.includes(String(last)));
 }
 assert.deepEqual(palettes.books[book.id][58].colours,['red','yellow','blue','green','black']);
 assert.deepEqual(palettes.books[book.id][66].colours,['blue','yellow','green','red','black']);
 for(const p of [67,68,69,70,71,72])assert.ok(acts[p].some(a=>a.type==='game'));
 assert.ok(regions[58].every(r=>r.surface==='object'&&r.colour));
 assert.ok(regions[66].some(r=>r.part==='triangle'&&r.colour==='#43aa8b'));
 for(const rows of Object.values(regions))for(const r of rows){
  if(r.box)boxInside(r.box);
  else for(const [x,y] of r.polygon)assert.ok(x>=0&&x<=100&&y>=0&&y<=100);
 }
});
