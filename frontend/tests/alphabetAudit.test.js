import test from 'node:test';
import assert from 'node:assert/strict';
import {alphabetFixtures} from './helpers/alphabetFixtures.js';
import {readInkPng} from './helpers/readInkPng.js';
import {samplePen} from './helpers/samplePen.js';
import {inkShape,inkDistance,evenly} from '../src/traceCheck.js';
import {formationPen,formationInInk,pencilAnimation} from '../src/letterFormation.js';
import {createStrokeTracer} from '../src/strokeTracing.js';

const marks=alphabetFixtures();
test('bundled alphabet coverage includes every capital and small letter',()=>{
  const letters=new Set(marks.map(mark=>mark.glyph));
  for(const glyph of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz') assert.ok(letters.has(glyph),glyph);
  assert.ok(marks.length>=1272);
});

for(const book of [...new Set(marks.map(mark=>mark.book))]) {
  test(`${book}: every printed alphabet target traces fully and has a valid pencil timeline`,()=>{
    const cache=new Map(), failures=[];
    for(const mark of marks.filter(mark=>mark.book===book)) {
      const ink=mark.dots||mark.ink;
      let shape=cache.get(ink.src);
      if(!shape){const png=readInkPng(new URL('../'+ink.src,import.meta.url));shape=inkShape(png.alpha,png.w,png.h);cache.set(ink.src,shape);}
      assert.ok(shape.parts.length>0,`${ink.src}: empty letter image`);
      const paths=formationInInk(samplePen(formationPen(mark,undefined,shape)),mark,shape);
      const bodyPoints=paths.filter(path=>path.length>2).flat();
      const offInk=bodyPoints.filter(point=>inkDistance(shape,point)>Math.max(1,shape.h*.012)).length;
      if(offInk/bodyPoints.length>.25)failures.push(`${mark.page} ${mark.glyph}: path misaligned with printed ink`);
      for(const speed of [.008,.04]) {
        const tracer=createStrokeTracer(paths,Math.max(2,Math.min(shape.w,shape.h)*.09));
        for(const path of paths) {
          if(!tracer.begin(path[0]))break;
          for(const point of evenly(path,Math.max(.2,shape.h*speed)))tracer.move(point);
          tracer.end();
        }
        if(!tracer.done()) failures.push(`${mark.page} ${mark.glyph}: incomplete at speed ${speed}`);
      }
      const frames=pencilAnimation(paths,.75,true);
      if(frames.some((frame,index)=>!Number.isFinite(frame.offset)||index&&frame.offset<=frames[index-1].offset)) failures.push(`${mark.page} ${mark.glyph}: invalid animation`);
      if(paths.flat().some(point=>point.some(value=>!Number.isFinite(value)))) failures.push(`${mark.page} ${mark.glyph}: invalid coordinate`);
    }
    assert.deepEqual(failures,[]);
  });
}
