// Colouring inside the lines. No DOM here, so it can be tested on its own.
//
// When the child starts colouring, the part of the page picture they touched is found: everything joined to that
// spot and of about the same colour, up to the picture's outlines (any pixel clearly different, like a black or red
// line). Their colour then only lands inside that part, however far the finger wanders.

const near = (data, i, r, g, b, tol) => (data[i] - r) ** 2 + (data[i + 1] - g) ** 2 + (data[i + 2] - b) ** 2 <= tol * tol;

// rgba: the picture's pixels (w x h, 4 bytes each); (x, y): where the finger came down.
// tol: how different a pixel may be from the touched colour and still be part of it.
// Returns the part as a Uint8Array (1 inside), grown by `grow` pixels so the colour reaches into the outline,
// or null when the touch is on a line with no space to colour near it.
export function regionFrom(rgba, w, h, x, y, { tol = 70, grow = 2, gapClose = 1, cuts = [] } = {}) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  // Start from the lightest pixel close by: a touch landing on an outline still colours the space beside it.
  let best = -1, sx = x, sy = y;
  for (let yy = Math.max(0, y - 4); yy <= Math.min(h - 1, y + 4); yy++) for (let xx = Math.max(0, x - 4); xx <= Math.min(w - 1, x + 4); xx++) {
    const i = (yy * w + xx) * 4, light = rgba[i] + rgba[i + 1] + rgba[i + 2] - Math.abs(xx - x) * 6 - Math.abs(yy - y) * 6;
    if (light > best) { best = light; sx = xx; sy = yy; }
  }
  const s = (sy * w + sx) * 4, r = rgba[s], g = rgba[s + 1], b = rgba[s + 2];

  // The outlines: pixels unlike the touched colour, thickened a little so a tiny gap in a line does not let the
  // colour run out.
  const line = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (!near(rgba, i * 4, r, g, b, tol)) line[i] = 1;
  // Close a reviewed opening between two printed outline endpoints. Flooding then follows the real
  // leaf outline, rather than a broad approximate polygon that can include part of the apple.
  for (const [[ax, ay], [bx, by]] of cuts) {
    const x0 = ax / 100 * w, y0 = ay / 100 * h, dx = (bx - ax) / 100 * w, dy = (by - ay) / 100 * h;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    for (let k = 0; k <= steps; k++) {
      const xx = Math.round(x0 + dx * k / steps), yy = Math.round(y0 + dy * k / steps);
      if (xx >= 0 && xx < w && yy >= 0 && yy < h) line[yy * w + xx] = 1;
    }
  }
  const wall = gapClose ? spread(line, w, h, gapClose) : line;
  if (wall[sy * w + sx]) wall[sy * w + sx] = 0;

  // Flood out from the touch, through everything not a wall.
  const inside = new Uint8Array(w * h), stack = [sy * w + sx];
  inside[sy * w + sx] = 1;
  while (stack.length) {
    const i = stack.pop(), px = i % w;
    const step = j => { if (!inside[j] && !wall[j]) { inside[j] = 1; stack.push(j); } };
    if (px > 0) step(i - 1);
    if (px < w - 1) step(i + 1);
    if (i >= w) step(i - w);
    if (i < w * (h - 1)) step(i + w);
  }
  return grow ? spread(inside, w, h, grow) : inside;
}

// The shape made `by` pixels bigger on every side.
export function spread(mask, w, h, by) {
  let cur = mask;
  for (let k = 0; k < by; k++) {
    const next = cur.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (cur[i]) continue;
      if ((x > 0 && cur[i - 1]) || (x < w - 1 && cur[i + 1]) || (y > 0 && cur[i - w]) || (y < h - 1 && cur[i + w])) next[i] = 1;
    }
    cur = next;
  }
  return cur;
}

// The colour a part of the picture should be, from the colour the book printed round it or in it: the strawberry's
// red outline, the blue scribble the book put in the big 9 as a hint (black and grey lines say nothing, so they
// are not counted). (inside: the part, not grown.) Null when the book does not say: the part is big (the page
// itself), already coloured, a plain box to write in (a square, like the cells of the writing grid), or its
// colours are mixed with none clearly the most.
export function partColour(rgba, w, h, inside, { ring = 3, maxShare = .15 } = {}) {
  let area = 0, seen = 0, coloured = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 0; i < inside.length; i++) if (inside[i]) {
    area++;
    const x = i % w, y = (i - x) / w;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (area % 7 === 0) { seen++; if (saturated(rgba, i * 4)) coloured++; }
  }
  if (!area || area > w * h * maxShare || coloured > seen * .5) return null;
  if (area > (x1 - x0 + 1) * (y1 - y0 + 1) * .92) return null;      // fills its box: a cell to write in
  const around = spread(inside, w, h, ring), bins = new Map();
  let sat = 0;
  for (let i = 0; i < inside.length; i++) {
    if (!around[i] || inside[i]) continue;
    const p = i * 4;
    if (!saturated(rgba, p)) continue;
    sat++;
    const k = Math.round(hue(rgba[p], rgba[p + 1], rgba[p + 2]) / 30) % 12, b = bins.get(k) || [0, 0, 0, 0];
    b[0] += rgba[p]; b[1] += rgba[p + 1]; b[2] += rgba[p + 2]; b[3]++;
    bins.set(k, b);
  }
  let best = null;
  for (const b of bins.values()) if (!best || b[3] > best[3]) best = b;
  if (!best || best[3] < Math.max(12, sat * .6)) return null;
  return [best[0] / best[3], best[1] / best[3], best[2] / best[3]].map(Math.round);
}

const saturated = (d, p) => { const mx = Math.max(d[p], d[p + 1], d[p + 2]), mn = Math.min(d[p], d[p + 1], d[p + 2]); return mx - mn > 60 && mx > 70; };
function hue(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn || 1;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const rgbOf = hex => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16));
// [r, g, b] as '#rrggbb'
export const hexOf = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// The colour on offer closest to the one the book wants, if one is close enough to be meant.
export function closestColour(want, palette, maxFar = 80) {
  let best = null, d = Infinity;
  for (const c of palette) { const e = far(want, rgbOf(c)); if (e < d) { d = e; best = c; } }
  return d <= maxFar ? best : null;
}

// Reviewed parts supplement the book's printed colour hints, especially black-outline pictures.
// Earlier regions take priority: a leaf polygon can sit over its fruit's larger bounding box.
export function colourRegionAt(regions = [], x, y) {
  return regions.find(region => {
    if (region.box) {
      const [a, b, w, h] = region.box;
      return x >= a && y >= b && x <= a + w && y <= b + h;
    }
    let inside = false;
    const points = region.polygon || [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[i], [bx, by] = points[j];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    }
    return inside;
  }) || null;
}

// Closed black-outline parts use their component's centre, not the finger position. A beak remains
// orange even when touched at its very tip; the original outline supplies its complete boundary.
export function componentColourRegion(mask, w, h, regions = []) {
  const seeded = regions.find(region => {
    if (!region.seed) return false;
    const [x, y] = region.seed;
    return !!mask[Math.round(y / 100 * h) * w + Math.round(x / 100 * w)];
  });
  if (seeded) return seeded;
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let i = 0; i < mask.length; i++) if (mask[i]) {
    const x = i % w, y = Math.floor(i / w);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x1 < 0) return null;
  const x = (x0 + x1) / 2 / w * 100, y = (y0 + y1) / 2 / h * 100;
  return regions.find(region => {
    if (!region.componentBox) return false;
    const [a, b, width, height] = region.componentBox;
    return x >= a && y >= b && x <= a + width && y <= b + height;
  }) || null;
}

// The original outline still supplies the shape. Reviewed boundaries only separate parts when the
// printed outlines join (the apple and leaf share an open neck). They never fill outside that shape.
export function restrictColourRegion(mask, w, h, regions, selected) {
  if (!regions?.length) return mask;
  const clipped = mask.slice();
  for (let i = 0; i < clipped.length; i++) if (clipped[i]) {
    const part = colourRegionAt(regions, (i % w) / w * 100, Math.floor(i / w) / h * 100);
    if (part !== selected) clipped[i] = 0;
  }
  return clipped;
}

// What to call a colour, in English and Urdu, by its hue and how light it is.
// tools/make_urdu_audio.py records "<Urdu name> رنگ لگائیں۔" for each: keep the two lists the same.
export const COLOUR_NAMES = {
  red: 'لال', pink: 'گلابی', orange: 'نارنجی', brown: 'بھورا', 'light brown': 'ہلکا بھورا', yellow: 'پیلا',
  green: 'ہرا', 'dark green': 'گہرا ہرا', blue: 'نیلا', 'light blue': 'ہلکا نیلا', purple: 'جامنی', grey: 'سرمئی', black: 'کالا'
};
export function colourName(hex) {
  const [r, g, b] = rgbOf(hex), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const light = (mx + mn) / 2 / 255, strong = (mx - mn) / (mx || 1), h = hue(r, g, b);
  let en;
  if (mx - mn < 40) en = light < .25 ? 'black' : 'grey';
  else if (h < 15 || h >= 340) en = light > .68 ? 'pink' : 'red';
  else if (h < 38) en = light < .45 ? 'brown' : strong < .55 ? 'light brown' : 'orange';
  else if (h < 70) en = light < .4 ? 'brown' : 'yellow';
  else if (h < 165) en = light < .35 ? 'dark green' : 'green';
  else if (h < 255) en = light > .7 ? 'light blue' : 'blue';
  else if (h < 305) en = 'purple';
  else en = 'pink';
  return { en, ur: COLOUR_NAMES[en] };
}

// Printed greens/blues can be much lighter than the crayon swatch. They still require that colour,
// rather than silently dropping the restriction because the RGB distance exceeds closestColour's limit.
export function requiredSwatch(want, palette) {
  const closest = closestColour(want, palette);
  if (closest) return closest;
  const family = colour => colourName(colour).en.replace(/^(light|dark) /, '');
  const name = family(hexOf(want));
  return palette.find(colour => family(colour) === name) || null;
}
// Every colour the book shows for the parts of a page picture (each part's colour as partColour finds it), so only
// those are offered. The picture is cut into its parts in one pass: the open areas between its lines. Each part's
// colour comes from the coloured line pixels next to it (black and grey say nothing). Parts not counted: tiny
// ones (the holes of printed letters), the paper round the pictures, plain boxes to write in, and any part whose
// middle is inside one of the `skip` boxes ([x0, y0, x1, y1] in pixels, like the letters to trace).
// Returns colours as [r, g, b], one per kind (close ones joined), most used first.
export function pageColours(rgba, w, h, { tol = 70, skip = [], minArea = 150, maxShare = .15 } = {}) {
  const N = w * h, line = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (!near(rgba, i * 4, 255, 255, 255, tol)) line[i] = 1;
  const wall = spread(line, w, h, 1), label = new Int32Array(N).fill(-1), parts = [];
  for (let s = 0; s < N; s++) {
    if (wall[s] || label[s] >= 0) continue;
    const id = parts.length, part = { area: 0, x0: w, y0: h, x1: 0, y1: 0, bins: new Map(), sat: 0 };
    parts.push(part);
    const stack = [s];
    label[s] = id;
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i - x) / w;
      part.area++;
      if (x < part.x0) part.x0 = x; if (x > part.x1) part.x1 = x; if (y < part.y0) part.y0 = y; if (y > part.y1) part.y1 = y;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
        if (j >= 0 && !wall[j] && label[j] < 0) { label[j] = id; stack.push(j); }
    }
  }
  // each coloured line pixel tells the parts within 3 pixels of it
  for (let i = 0; i < N; i++) {
    if (!line[i] || !saturated(rgba, i * 4)) continue;
    const x = i % w, y = (i - x) / w, p = i * 4, told = new Set();
    for (let yy = Math.max(0, y - 3); yy <= Math.min(h - 1, y + 3); yy++) for (let xx = Math.max(0, x - 3); xx <= Math.min(w - 1, x + 3); xx++) {
      const id = label[yy * w + xx];
      if (id < 0 || told.has(id)) continue;
      told.add(id);
      // the colour is averaged with the strongest pixels counting most, so a thin line's pale edges do not
      // wash it out (a thin red line would otherwise come out pink)
      const part = parts[id], k = Math.round(hue(rgba[p], rgba[p + 1], rgba[p + 2]) / 30) % 12, b = part.bins.get(k) || [0, 0, 0, 0, 0];
      const wt = (Math.max(rgba[p], rgba[p + 1], rgba[p + 2]) - Math.min(rgba[p], rgba[p + 1], rgba[p + 2])) ** 2;
      b[0] += rgba[p] * wt; b[1] += rgba[p + 1] * wt; b[2] += rgba[p + 2] * wt; b[3]++; b[4] += wt;
      part.bins.set(k, b);
      part.sat++;
    }
  }
  const found = [];
  for (const part of parts) {
    if (part.area < minArea || part.area > N * maxShare) continue;
    if (part.area > (part.x1 - part.x0 + 1) * (part.y1 - part.y0 + 1) * .92) continue;
    const mx = (part.x0 + part.x1) / 2, my = (part.y0 + part.y1) / 2;
    if (skip.some(([a, b, c, d]) => mx >= a && mx <= c && my >= b && my <= d)) continue;
    let best = null;
    for (const b of part.bins.values()) if (!best || b[3] > best[3]) best = b;
    if (!best || best[3] < Math.max(12, part.sat * .6)) continue;
    const rgb = [best[0] / best[4], best[1] / best[4], best[2] / best[4]];
    // one of each colour a child would name (a light green outline and a green hint are both "green"), and one of
    // each hue (a pale teal outline and a teal hint are one colour; red and pink differ enough to stay two)
    const h0 = hue(...rgb), hueGap = f => { const d = Math.abs(hue(...f.rgb) - h0); return Math.min(d, 360 - d); };
    const same = found.find(f => far(f.rgb, rgb) < 60 || colourName(hexOf(f.rgb)).en === colourName(hexOf(rgb)).en || hueGap(f) < 10);
    if (same) same.n++; else found.push({ rgb, n: 1 });
  }
  return found.sort((a, b) => b.n - a.n).map(f => f.rgb.map(Math.round));
}
