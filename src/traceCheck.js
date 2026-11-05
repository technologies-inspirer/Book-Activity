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
