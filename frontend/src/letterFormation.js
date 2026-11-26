import { LETTER_GLYPHS } from './letterGlyphs.js';
import { PRINTED_ALPHABET_DOTS } from './printedAlphabetDots.js';

// Closed bowls are explicit: completing the round part must not depend on a
// later stem stroke happening to cover a missing piece of the loop.
const bowls = {
  a: 'M.72 .3C.6 .08 .18 .1 .12 .5C.08 .9 .55 1 .7 .62C.76 .5 .78 .38 .72 .3M.74 .12V.82C.76 .97 .9 .98 1 .88',
  b: 'M.22 0V.97M.22 .62C.38 .38 .9 .4 .9 .7C.9 1 .4 1.02 .22 .9L.22 .62',
  d: 'M.7 .5C.55 .36 .12 .36 .1 .7C.08 1 .55 1.02 .68 .78C.73 .68 .73 .58 .7 .5M.72 0V.88C.74 .98 .88 1 .98 .92',
  g: 'M.78 .14C.62 -.02 .15 .02 .12 .3C.1 .58 .62 .6 .78 .36C.83 .28 .83 .2 .78 .14M.8 .06V.8C.8 1 .3 1.02 .12 .86',
  p: 'M.2 .04V1M.2 .2C.36 .02 .88 .03 .88 .3C.88 .58 .36 .6 .2 .44L.2 .2',
  q: 'M.76 .2C.6 .02 .14 .03 .12 .3C.1 .58 .6 .6 .76 .4C.81 .32 .81 .25 .76 .2M.78 .04V1'
};

export const loopE = 'M.12 .58C.44 .47 .96 .16 .73 .05C.43 -.1 .06 .16 .1 .54C.14 .98 .58 1.1 .98 .78';

export function formationPen(mark, fallback = LETTER_GLYPHS[mark.glyph], shape = null) {
  if (mark.pen) return mark.pen;
  const source = (mark.dots || mark.ink)?.src || '';
  const cursive = /books\/(new-stemford-english-3|stemford-english-4)\//.test(source);
  const friendly = /books\/maxford-global-qaida-3-english\//.test(source);
  if (mark.glyph === 'e' && cursive) return loopE;
  if (cursive) {
    const pens = {
      c: 'M.78 .12C.62 -.02 .12 .02 .1 .5C.08 .95 .7 1 .95 .8',
      k: 'M.12 0V1M.78 .44L.12 .68M.12 .68L.78 .96C.88 1.02 .94 .98 1 .9',
      l: 'M.12 0V.86C.14 .98 .5 1 .9 .9',
      m: 'M.06 .06V1M.06 .32C.14 0 .42 0 .44 .32V1M.44 .32C.52 0 .78 0 .8 .32V.88C.82 1 .92 1 1 .9',
      u: 'M.12 .06V.62C.12 1 .72 1 .76 .6M.76 .06V.84C.78 1 .9 1 1 .82'
    };
    if (pens[mark.glyph]) return pens[mark.glyph];
  }
  if (friendly && mark.glyph === 'l') return 'M.5 .05V.95';
  if (friendly && mark.glyph === 'f' && shape?.bounds) {
    const [x,y,w,h]=shape.bounds;
    let left=x+w,right=x;
    for(let py=y;py<y+h*.2;py++)for(let px=x;px<x+w;px++)if(shape.outside[Math.floor(py)*shape.w+px]===0){left=Math.min(left,px);right=Math.max(right,px);}
    if((right-left)/w<.38)return 'M.5 .04V.96M.08 .38H.94';
  }
  if (friendly) {
    const pens = {
      a: 'M.78 .2C.64 .02 .15 .02 .12 .5C.08 .98 .65 1 .78 .76L.78 .2M.8 .08V.94',
      d: 'M.88 .55C.73 .35 .12 .35 .12 .74C.12 1.03 .76 1.03 .88 .8C.94 .7 .94 .63 .88 .55M.9 .04V.96',
      h: 'M.2 .03V.97M.2 .6C.32 .28 .85 .3 .85 .6V.97',
      k: 'M.18 .04V.96M.9 .44L.2 .68M.4 .6L.92 .96',
      m: 'M.1 .1V.94M.1 .35C.1 .04 .46 .04 .48 .35V.94M.48 .35C.48 .04 .88 .04 .9 .35V.94',
      n: 'M.12 .06V.96M.12 .28C.28 -.04 .86 -.04 .88 .3V.96',
      q: 'M.6 .18C.5 .02 .08 .02 .08 .3C.08 .6 .5 .62 .6 .4C.66 .3 .66 .23 .6 .18M.63 .05V.92L.98 .65',
      r: 'M.16 .06V.96M.16 .42C.34 .12 .68 .12 .92 .26',
      t: 'M.42 .02V.78C.42 1 .9 1 .96 .75M.04 .44H.8',
      u: 'M.12 .06V.62C.12 1 .78 1 .8 .6M.8 .06V.94'
    };
    if (pens[mark.glyph]) return pens[mark.glyph];
  }
  if ((cursive || friendly) && ['i','j'].includes(mark.glyph)) {
    const stem = mark.glyph === 'i' ? (cursive ? .12 : .5) : .84;
    const body = shape?.parts?.[0];
    const dot = shape?.parts?.find(part => body && part !== body && part.y + part.h <= body.y);
    let dotX = stem, dotY = dot ? .04 : -.22;
    if (dot) {
      const [ix,iy,iw,ih] = (mark.dots || mark.ink).box, [x,y,w,h] = mark.box;
      dotX = (ix + (dot.x + dot.w/2)/shape.w*iw-x)/w;
      dotY = (iy + (dot.y + dot.h/2)/shape.h*ih-y)/h;
    }
    if (PRINTED_ALPHABET_DOTS[source]) [dotX,dotY]=PRINTED_ALPHABET_DOTS[source];
    const ink=mark.dots||mark.ink;
    const top=body&&ink ? Math.max(0,Math.min(.6,(ink.box[1]+body.y/shape.h*ink.box[3]-mark.box[1])/mark.box[3]+.025)) : (dot ? .28 : 0);
    const down = mark.glyph === 'i'
      ? (cursive ? `M${stem} ${top}V.82C.14 .98 .5 1 .95 .8` : `M${stem} ${top}V.95`)
      : `M${stem} ${top}V.78C.84 1 .3 1.02 .08 .9`;
    return `${down}M${dotX} ${dotY}L${dotX} ${dotY}`;
  }
  return bowls[mark.glyph] || fallback;
}

// Map the smooth pen geometry directly into its measured letter crop. Snapping
// each sample to an unordered raster grid reverses direction around curves/e.
export function formationInInk(strokes, mark, shape) {
  const [x, y, w, h] = mark.box;
  const [ix, iy, iw, ih] = (mark.dots || mark.ink).box;
  let left=(x-ix)/iw*shape.w, top=(y-iy)/ih*shape.h;
  let width=w/iw*shape.w, height=h/ih*shape.h;
  // Some imported small-letter boxes contain excess blank space. Correct only
  // substantial crop mismatches, keeping deliberately authored coordinates intact.
  if (shape.bounds && !mark.pen && !['i','j'].includes(mark.glyph)) {
    const [bx,by,bw,bh]=shape.bounds;
    if (bw/width<.8 || bw/width>1.25) {left=bx;width=bw;}
    if (bh/height<.8 || bh/height>1.25) {top=by;height=bh;}
  }
  return strokes.map(path => fitToInk(path.map(([u, v]) => [left+u*width,top+v*height]), shape));
}

function fitToInk(path, shape) {
  if (!shape.inside || path.length < 2) return path;
  const closed = Math.hypot(path[0][0] - path.at(-1)[0], path[0][1] - path.at(-1)[1]) < 1e-6;
  const count = closed ? path.length - 1 : path.length;
  const at = i => path[closed ? (i + count) % count : Math.max(0, Math.min(count - 1, i))];
  const normals = [], offsets = [], limit = Math.min(shape.w, shape.h) * .1;
  for (let i = 0; i < count; i++) {
    const before = at(i - 1), after = at(i + 1), q = path[i];
    const dx = after[0] - before[0], dy = after[1] - before[1], length = Math.hypot(dx, dy) || 1;
    const normal = [-dy / length, dx / length];
    normals.push(normal);
    let best = 0, score = -Infinity;
    for (let offset = -limit; offset <= limit; offset += .5) {
      const px = Math.round(q[0] + normal[0] * offset), py = Math.round(q[1] + normal[1] * offset);
      if (px < 0 || py < 0 || px >= shape.w || py >= shape.h) continue;
      const candidate = shape.inside[py * shape.w + px] - Math.abs(offset) * .2;
      if (candidate > score) { score = candidate; best = offset; }
    }
    offsets.push(best);
  }
  // Smooth normal-only corrections: never jump forwards/backwards to a nearby
  // crossing, and never inherit the raster centre grid's stair-step motion.
  const fitted = path.slice(0, count).map((q, i) => {
    let sum = offsets[i], weight = 1;
    const sigma = Math.max(1, Math.min(shape.w, shape.h) * .035);
    for (const direction of [-1, 1]) {
      let distance = 0, previous = i;
      for (let k = 1; k < count; k++) {
        let n = i + k * direction;
        if (!closed && (n < 0 || n >= count)) break;
        n = (n + count) % count;
        distance += Math.hypot(path[n][0] - path[previous][0], path[n][1] - path[previous][1]);
        if (distance > sigma * 3) break;
        const w = Math.exp(-(distance ** 2) / (2 * sigma ** 2));
        sum += offsets[n] * w; weight += w; previous = n;
      }
    }
    const before=at(i-1),after=at(i+1),ax=q[0]-before[0],ay=q[1]-before[1],bx=after[0]-q[0],by=after[1]-q[1];
    const length=Math.hypot(ax,ay)*Math.hypot(bx,by);
    const correction=length && (ax*bx+ay*by)/length<.5 ? offsets[i] : sum/weight;
    return [q[0] + normals[i][0] * correction, q[1] + normals[i][1] * correction];
  });
  if (closed) fitted.push(fitted[0]);
  return fitted;
}

// Shared by the idle hint and worked example. Invisible travel between pen
// strokes prevents a visible diagonal jump between E's bars or separate dots.
export function pencilAnimation(strokes, ratio = 1, repeat = false, paintBox = null) {
  ratio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  const lines = strokes.filter(path => path.length);
  if (!lines.length) return [];
  const frames = [];
  let time = 0, written = 0;
  const add = (point, opacity) => frames.push({ left: `${point[0]}%`, top: `${point[1]}%`, opacity, offset: time, written });
  lines.forEach((line, index) => {
    if (index) {
      time += .15; add(lines[index - 1].at(-1), 0);
      time += 2; add(line[0], 0);
      time += .15;
    }
    line.forEach((point, k) => {
      if (k) {
        const dx = point[0] - line[k - 1][0], dy = point[1] - line[k - 1][1];
        time += Math.max(.001, Math.hypot(dx, dy / ratio));
        if (paintBox) written += Math.hypot(dx / paintBox[0], dy / paintBox[1]);
      }
      add(point, 1);
    });
    if (line.length === 1) { time += 1; add(line[0], 1); }
  });
  time += 1; add(lines.at(-1).at(-1), 1);
  time += .15; add(lines.at(-1).at(-1), 0);
  if (repeat) { time += 3; add(lines[0][0], 0); }
  return frames.map(({ written: ink, ...frame }) => paintBox
    ? { strokeDashoffset: written ? 1 - ink / written : 0, offset: frame.offset / time }
    : { ...frame, offset: frame.offset / time });
}
