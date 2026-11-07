// The maths behind a child tracing a letter. No DOM here, so it can be tested on its own.
//
// Each dotted letter comes with a picture of its own ink (the dots), cut from the book page. As the child's
// finger moves over the letter, the parts of the letter near it are coloured in (never anything off the
// letter), and those parts of the letter's middle line are marked done. The letter is finished when its
// whole middle line has been gone over.

// The same line, with points an even `step` apart.
export function evenly(line, step) {
  if (line.length < 2) return line.slice();
  const out = [line[0]];
  let left = step;
  for (let k = 1; k < line.length; k++) {
    let [ax, ay] = line[k - 1];
    const [bx, by] = line[k];
    let len = Math.hypot(bx - ax, by - ay);
    while (len >= left) {
      const t = left / len;
      ax += (bx - ax) * t; ay += (by - ay) * t;
      out.push([ax, ay]);
      len -= left; left = step;
    }
    left -= len;
  }
  const end = line[line.length - 1], last = out[out.length - 1];
  if (Math.hypot(end[0] - last[0], end[1] - last[1]) > step * .3) out.push(end);
  return out;
}

// For each pixel, how far (in pixels, roughly) it is from the nearest pixel where `on` is true.
// edgeOn: count the ground just outside the picture as `on` too (so ink that runs to the picture's edge
// is measured as ending there, not as going on for ever).
export function distanceTo(on, w, h, edgeOn = false) {
  const d = new Float32Array(w * h), F = 1e9, E = edgeOn ? 0 : F;
  for (let i = 0; i < d.length; i++) d[i] = on(i) ? 0 : F;
  // two sweeps of a 3-4 chamfer, so 3 = one pixel
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], (x ? d[i - 1] : E) + 3, (y ? d[i - w] : E) + 3, (x && y ? d[i - w - 1] : E) + 4, (y && x < w - 1 ? d[i - w + 1] : E) + 4);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], (x < w - 1 ? d[i + 1] : E) + 3, (y < h - 1 ? d[i + w] : E) + 3, (x < w - 1 && y < h - 1 ? d[i + w + 1] : E) + 4, (y < h - 1 && x ? d[i + w - 1] : E) + 4);
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

// What the checker needs to know about a letter's ink picture (alpha values, w x h):
//   outside: distance from each pixel to the ink   middle: points along the middle of the ink
//   half:    about half the ink's thickness
export function inkShape(alpha, w, h) {
  const outside = distanceTo(i => alpha[i] > 100, w, h);
  const inside = distanceTo(i => alpha[i] <= 100, w, h, true);
  const step = Math.max(2, Math.round(h / 30));
  const middle = inkMiddle(alpha, w, h, step, inside);
  const depths = middle.map(([x, y]) => inside[y * w + x]).sort((a, b) => a - b);
  return { w, h, outside, middle, step, half: depths[Math.floor(depths.length / 2)] || 1 };
}

// How close a point (in the ink picture's pixels) is to the letter's ink: 0 on it, Infinity off the picture.
export function inkDistance(ink, [x, y]) {
  const px = Math.round(x), py = Math.round(y);
  return px >= 0 && py >= 0 && px < ink.w && py < ink.h ? ink.outside[py * ink.w + px] : Infinity;
}

// The book's dark, round start-dot is larger than its little tracing dashes. Grey letter dots and
// coloured writing lines are excluded. rect is the padded letter crop in source-image pixels.
export function printedTraceStart(rgba, w, h, rect) {
  const [rx, ry, rw, rh] = rect, x0 = Math.max(0, Math.floor(rx)), y0 = Math.max(0, Math.floor(ry));
  const x1 = Math.min(w, Math.ceil(rx + rw)), y1 = Math.min(h, Math.ceil(ry + rh));
  const seen = new Uint8Array(w * h);
  const dark = i => Math.max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]) < 90;
  let best = null;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const seed = y * w + x;
    if (seen[seed] || !dark(seed)) continue;
    const stack = [seed]; seen[seed] = 1;
    let area = 0, sx = 0, sy = 0, ax = x, bx = x, ay = y, by = y;
    while (stack.length) {
      const i = stack.pop(), px = i % w, py = Math.floor(i / w);
      area++; sx += px; sy += py;
      ax = Math.min(ax, px); bx = Math.max(bx, px); ay = Math.min(ay, py); by = Math.max(by, py);
      for (let yy = Math.max(y0, py - 1); yy <= Math.min(y1 - 1, py + 1); yy++) for (let xx = Math.max(x0, px - 1); xx <= Math.min(x1 - 1, px + 1); xx++) {
        const next = yy * w + xx;
        if (!seen[next] && dark(next)) { seen[next] = 1; stack.push(next); }
      }
    }
    const width = bx - ax + 1, height = by - ay + 1, density = area / (width * height);
    if (area < 3 || width < 2 || height < 2 || width / height < .6 || width / height > 1.65 || density < .55 || Math.max(width, height) > Math.min(rw, rh) * .22) continue;
    const score = area * density;
    if (!best || score > best.score) best = { score, point: [sx / area, sy / area] };
  }
  return best?.point || null;
}

// Follow connected ink by distance along the stroke, not a greedy jump to the next nearby dot.
// The body is traced before disconnected letter dots, with a pen lift between components.
export function orderedInkStrokes(ink, start) {
  const points = ink.middle;
  if (!points.length) return [];
  const edges = points.map(() => []), radius = (ink.step || 3) * 3.1;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    const distance = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
    if (distance > radius) continue;
    if (evenly([points[i], points[j]], 1).some(point => inkDistance(ink, point) > Math.max(1, ink.half * .35))) continue;
    edges[i].push([j, distance]); edges[j].push([i, distance]);
  }
  let first = 0;
  points.forEach((point, index) => { if (Math.hypot(point[0] - start[0], point[1] - start[1]) < Math.hypot(points[first][0] - start[0], points[first][1] - start[1])) first = index; });
  const seen = new Set(), groups = [];
  for (let i = 0; i < points.length; i++) {
    if (seen.has(i)) continue;
    const group = [i]; seen.add(i);
    for (let k = 0; k < group.length; k++) for (const [next] of edges[group[k]]) if (!seen.has(next)) { seen.add(next); group.push(next); }
    groups.push(group);
  }
  groups.sort((a, b) => Number(b.includes(first)) - Number(a.includes(first)) || b.length - a.length);
  const strokes = [];
  let at = start;
  for (const group of groups) {
    const from = group.reduce((a, b) => Math.hypot(points[b][0] - at[0], points[b][1] - at[1]) < Math.hypot(points[a][0] - at[0], points[a][1] - at[1]) ? b : a);
    const distances = new Map(group.map(index => [index, Infinity])), previous = new Map(), waiting = new Set(group);
    distances.set(from, 0);
    while (waiting.size) {
      const next = [...waiting].reduce((a, b) => distances.get(b) < distances.get(a) ? b : a);
      waiting.delete(next);
      for (const [neighbor, length] of edges[next]) {
        const distance = distances.get(next) + length;
        if (waiting.has(neighbor) && distance < distances.get(neighbor)) { distances.set(neighbor, distance); previous.set(neighbor, next); }
      }
    }
    const last = group.reduce((a, b) => distances.get(b) > distances.get(a) ? b : a), path = [];
    let index = last;
    while (index != null) { path.unshift(points[index]); index = previous.get(index); }
    if (!strokes.length && Math.hypot(path[0][0] - start[0], path[0][1] - start[1]) > .1) path.unshift(start);
    strokes.push(path); at = path[path.length - 1];
  }
  return strokes;
}

// Mark the parts of the letter's middle within `r` of the finger at q as gone over. Returns how many were new.
export function cover(ink, covered, q, r) {
  let fresh = 0;
  ink.middle.forEach((m, k) => {
    if (!covered[k] && (m[0] - q[0]) ** 2 + (m[1] - q[1]) ** 2 <= r * r) { covered[k] = 1; fresh++; }
  });
  return fresh;
}

// Finished: nearly all of the middle gone over, and no stretch longer than about one dot left
// (maxGap is a share of the ink picture's height).
export function finished(ink, covered, maxGap = .08) {
  const missed = ink.middle.filter((_, k) => !covered[k]);
  return missed.length <= ink.middle.length * .05 && longestGap(missed, ink.step || 3) / ink.h <= maxGap;
}
// Group missed points that touch (within two grid steps) and give the size of the biggest group.
function longestGap(points, step) {
  const seen = new Uint8Array(points.length), near = (step * 2.1) ** 2;
  let best = 0;
  for (let s = 0; s < points.length; s++) {
    if (seen[s]) continue;
    seen[s] = 1;
    const group = [points[s]];
    for (let g = 0; g < group.length; g++) for (let k = 0; k < points.length; k++) {
      if (seen[k]) continue;
      if ((points[k][0] - group[g][0]) ** 2 + (points[k][1] - group[g][1]) ** 2 <= near) { seen[k] = 1; group.push(points[k]); }
    }
    let size = 0;
    for (const a of group) for (const b of group) size = Math.max(size, Math.hypot(a[0] - b[0], a[1] - b[1]));
    best = Math.max(best, size + step);
  }
  return points.length ? best : 0;
}

// The middle of the letter's ink, as points about `gap` pixels apart (in the ink picture's pixels):
// in each little square, the pixel deepest inside the ink, kept when it is nearly as deep as anything
// close by (so squares on the middle of a stroke are kept, squares at its edge are not, and thin parts
// of the letter are found as well as thick ones).
export function inkMiddle(alpha, w, h, gap = 3, inside = distanceTo(i => alpha[i] <= 100, w, h, true)) {
  const d = inside, out = [];
  for (let y = 0; y < h; y += gap) for (let x = 0; x < w; x += gap) {
    let best = 0, bx = 0, by = 0;
    for (let yy = y; yy < Math.min(h, y + gap); yy++) for (let xx = x; xx < Math.min(w, x + gap); xx++) if (d[yy * w + xx] > best) { best = d[yy * w + xx]; bx = xx; by = yy; }
    if (best < 1) continue;
    let around = 0;
    for (let yy = Math.max(0, by - gap); yy <= Math.min(h - 1, by + gap); yy++)
      for (let xx = Math.max(0, bx - gap); xx <= Math.min(w - 1, bx + gap); xx++) around = Math.max(around, d[yy * w + xx]);
    if (best >= around * .8) out.push([bx, by]);
  }
  return out;
}
