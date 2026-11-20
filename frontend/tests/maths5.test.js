import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { getLearningBooks } from '../src/data/learningCatalog.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ctx={window:{}};vm.createContext(ctx);
for(const p of ['library','activities-maths5','questions'])vm.runInContext(read(`books/${p}.js`),ctx);
const plain=x=>JSON.parse(JSON.stringify(x));
const library=plain(ctx.window.PDF_BOOKS),book=library.find(b=>b.id==='stemford-maths-5');
const acts=plain(ctx.window.BOOK_ACTIVITIES[book.id]),qs=plain(ctx.window.BOOK_QUESTIONS[book.id]);
const topics=JSON.parse(read('books/maths5-videos.json')),regions=JSON.parse(read('books/colour-regions.json'))[book.id];
const palette=JSON.parse(read('books/colour-palettes.json'));
const arr=b=>[b.x,b.y,b.w,b.h];
function inside(r,c=[0,0,100,100]){const[x,y,w,h]=r,[a,b,cw,ch]=c;assert.ok(w>0&&h>0&&x>=a-.02&&y>=b-.02&&x+w<=a+cw+.03&&y+h<=b+ch+.03,JSON.stringify({r,c}));}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

test('Maths 5+ has all 80 pages and is assigned to Prep / Stemford / Maths',()=>{
 assert.equal(book.pages,80);assert.equal(book.rtl,false);
 assert.deepEqual(getLearningBooks(library,{classId:'prep',seriesId:'stemford',subjectId:'maths'}),[book]);
 for(const file of ['cover.jpg',...Array.from({length:80},(_,i)=>`p${String(i+1).padStart(3,'0')}.jpg`)])assert.ok(existsSync(new URL(`../${book.dir}/${file}`,import.meta.url)),file);
 for(let p=4;p<=80;p++)assert.ok(acts[p].length||qs[p]?.length,`Missing lesson ${p}`);
});

test('all 72 supplied Maths 5+ links keep their topic and Student / Teacher / Parents roles',()=>{
 assert.equal(Object.keys(topics).length,24);const supplied=new Set(),used=new Set(),pages=new Set();
 for(const t of Object.values(topics))for(const role of ['Student','Teacher','Parents']){assert.match(t[role],/^https:\/\/youtu\.be\/[\w-]{11}$/);supplied.add(t[role]);}
 assert.equal(supplied.size,72);
 for(const t of Object.values(topics))for(const p of t.pages){assert.ok(!pages.has(p),'Ambiguous video topic');pages.add(p);const a=acts[p].filter(a=>a.type==='videos');assert.equal(a.length,1);assert.equal(a[0].title,t.title);const lessons=(t.lessons||[]).filter(l=>l.pages.includes(p)).map(l=>({title:l.title,src:l.src}));assert.deepEqual(a[0].videos,[...lessons,...['Student','Teacher','Parents'].map(title=>({title,src:t[title]}))]);a[0].videos.slice(lessons.length).forEach(v=>used.add(v.src));}
 assert.deepEqual(used,supplied);assert.equal(topics.money.Student,'https://youtu.be/u_-IIRKDpzs');
 for(const p of [50,51,52,53,59,77,78])assert.ok(!acts[p].some(a=>a.type==='videos'),'No borrowed unrelated videos');
 for(const a of Object.values(acts).flat()){assert.ok(!a.scenes);assert.ok(!['story','tick'].includes(a.type));}
});

test('the 13 pending lesson videos sit on their own pages, first in the Videos list',()=>{
 const lessons=Object.values(topics).flatMap(t=>t.lessons||[]);
 assert.equal(lessons.length,13);assert.equal(new Set(lessons.map(l=>l.src)).size,13);
 const at=Object.fromEntries(lessons.flatMap(l=>l.pages.map(p=>[p,l.title])));
 assert.deepEqual(at,{19:'Forward and Backward Counting',20:'Forward and Backward Counting',21:'Forward and Backward Counting',36:'Forward and Backward Counting',37:'Forward and Backward Counting',39:'Addition with Fingers',40:'Addition on Number Line',41:'Addition with Objects',42:'Horizontal and Vertical Addition',43:'Addition in Columns',45:'Word Problems',61:'Subtraction with Fingers',62:'Subtraction Using Number Line',63:'Subtraction with Objects',65:'Horizontal and Vertical Subtraction',66:'Subtraction in Columns',67:'Word Problems'});
 for(const l of lessons){assert.match(l.src,/^https:\/\/youtu\.be\/[\w-]{11}$/);for(const p of l.pages)assert.equal(acts[p].find(a=>a.type==='videos').videos[0].src,l.src);}
});

test('the printed lesson QR buttons open exactly the supplied role videos',()=>{
 const raw=JSON.parse(read(`${book.dir}/qr.json`));assert.equal(Object.keys(raw).length,25);assert.equal(Object.keys(book.qr).length,24);assert.ok(!book.qr[1]);
 for(const[p,q]of Object.entries(book.qr)){inside(q.box);assert.deepEqual(q,raw[p]);const t=Object.values(topics).find(t=>t.pages.includes(+p));assert.ok(t);assert.deepEqual(q.videos,['Student','Teacher','Parents'].map(title=>({title,id:t[title].split('/').at(-1)})));}
});

test('Maths 5+ question controls and game targets stay in their own measured crops',()=>{
 assert.ok(Object.values(qs).flat().length>100);
 for(const[p,items]of Object.entries(qs))for(const q of items){inside(arr(q.crop));assert.ok(['write','choose','match','colour'].includes(q.kind));
  const boxes=[...(q.lines||[]),...(q.parts||[]).map(p=>p.box),...(q.options||[]),...(q.hide||[])];for(const r of boxes)inside(arr(r),arr(q.crop));
  if(q.kind==='write')assert.ok(q.lines.length);
  if(q.kind==='choose'){assert.ok(q.options.some(o=>o.correct));assert.ok(q.options.some(o=>!o.correct));}
  if(q.kind==='match'){const counts={};for(const d of q.dots){counts[d.id]=(counts[d.id]||0)+1;inside([d.x,d.y,.01,.01],arr(q.crop));}assert.ok(Object.values(counts).every(n=>n===2));}
 }
 for(const list of Object.values(acts))for(const a of list)if(a.type==='game'){inside(arr(a.crop));for(const t of a.targets)inside(arr(t),arr(a.crop));}
});

test('buttons avoid answer spaces, each other and the printed QR codes',()=>{
 for(let p=4;p<=80;p++){
  const questions=qs[p]||[],controls=[...acts[p],...questions].filter(a=>a.button).map(a=>({...a.button,w:17,h:4.8}));
  const answers=questions.flatMap(q=>[...q.lines||[],...(q.parts||[]).map(p=>p.box),...q.options||[]]);
  for(const[i,b]of controls.entries()){inside(arr(b));for(const r of answers)assert.ok(!overlap(b,r),`page ${p}: button covers answer`);for(const other of controls.slice(i+1))assert.ok(!overlap(b,other),`page ${p}: buttons overlap`);if(book.qr[p]){const[x,y,w,h]=book.qr[p].box;assert.ok(!overlap(b,{x,y,w,h}));}}
 }
});

test('writing and colouring are bounded, with only this page’s required colours',()=>{
 for(const[p,items]of Object.entries(acts))for(const a of items)if(a.type==='fill'){
  assert.equal(a.drawingMode,'regions');assert.ok(regions[p]?.length);const allowed=palette.books[book.id][p].colours.map(c=>palette.colours[c]);assert.deepEqual(new Set(a.colours),new Set(allowed));
 }
 assert.deepEqual(qs[28].find(q=>q.kind==='colour').parts.map(p=>p.colours[0]),['blue','red','red','blue','blue','red','blue','red'].map(k=>palette.colours[k]));
 assert.equal(qs[48].filter(q=>q.kind==='colour').length,1);assert.equal(qs[48][0].parts.length,13);
 assert.ok(qs[80].every(q=>q.kind==='write'),'Equivalent money combinations must not have a false fixed choice key');
});
