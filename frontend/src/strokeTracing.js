import { evenly } from './traceCheck.js';

// Follow adjacent points in pen order. Coverage from rubbing is never used.
// Coordinates and tolerance use the same space (the letter crop's pixels).
export function createStrokeTracer(strokes, tolerance) {
  const radius = Math.max(1, tolerance);
  const paths = strokes.filter(path => path.length).map(path => evenly(path, radius / 4));
  let stroke = 0, index = 0, held = false, lift = false, last = null;
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const expected = () => paths[stroke]?.[index] || null;
  const done = () => stroke >= paths.length;
  return {
    expected, done,
    guide: () => lift && paths[stroke + 1] ? paths[stroke + 1][0] : expected(),
    remaining: () => done() ? [] : [paths[stroke].slice(index), ...paths.slice(stroke + 1)],
    begin(point) {
      if (done() || lift || distance(point, expected()) > radius * 1.35) return false;
      held = true; last = point;
      // Detached dots require a deliberate visit after the main stroke.
      if (paths[stroke].length === 1) lift = true;
      return true;
    },
    move(point) {
      const accepted = [];
      if (!held || done()) return accepted;
      let started = false;
      if (lift) {
        // Keep the finger/pen down between strokes. Visiting the next start is
        // enough; the gap between separate strokes never receives a connector.
        const next = paths[stroke + 1];
        if (!next) return accepted;
        const connected = next.length > 1 && distance(paths[stroke].at(-1), next[0]) <= radius * .75;
        if (!connected && distance(point, next[0]) > radius * 1.35) return accepted;
        stroke++; index = 0; lift = false; last = next[0]; started = true;
        if (next.length === 1) { lift = true; return [next[0], next[0]]; }
      }
      const length = distance(last, point);
      if (length < .001) return started ? [expected(), expected()] : accepted;
      const from = last, path = paths[stroke];
      // A fast pen can travel many dots between browser events. Match its new
      // position in one pass and draw the intervening dots immediately, rather
      // than making progress wait for synthetic tiny pointer steps.
      let best = index, gap = distance(point, path[index]), ahead = 0;
      const budget = length * 1.7 + radius * .5;
      for (let next = index + 1; next < path.length; next++) {
        ahead += distance(path[next - 1], path[next]);
        if (ahead > budget) break;
        const nextGap = distance(point, path[next]);
        if (nextGap < gap) { best = next; gap = nextGap; }
      }
      // Ignore an off-path sample, keeping the last valid anchor. A child can
      // drift back onto the next dots without lifting or returning to a lock point.
      if (gap > radius * 1.35) return accepted;
      if (distance(point, path.at(-1)) <= radius * .8) {
        let tail = 0;
        for (let next = best + 1; next < path.length; next++) tail += distance(path[next - 1], path[next]);
        if (tail <= radius * 1.5) best = path.length - 1;
      }
      // Allow a short chord across a curved dotted stroke, but reject shortcuts
      // through the middle of a letter or across an untraced bend.
      const segmentGap = q => {
        const dx = point[0] - from[0], dy = point[1] - from[1];
        const t = Math.max(0, Math.min(1, ((q[0] - from[0]) * dx + (q[1] - from[1]) * dy) / (length * length)));
        return distance(q, [from[0] + t * dx, from[1] + t * dy]);
      };
      for (let next = index; next <= best; next++) {
        if (segmentGap(path[next]) > radius * 2) return accepted;
      }
      last = point;
      if (best > index) {
        accepted.push(...path.slice(index, best + 1));
        index = best;
        if (index === path.length - 1) lift = true;
      }
      return started && !accepted.length ? [expected(), expected()] : accepted;
    },
    end() {
      held = false; last = null;
      if (lift) { stroke++; index = 0; lift = false; }
    },
    reset() { stroke = 0; index = 0; held = false; lift = false; last = null; }
  };
}

// Preserve real intermediate pen positions when the browser batches touch/stylus
// events. Include the latest event too, without drawing its position twice.
export function tracingPointerSamples(event) {
  const samples = event.getCoalescedEvents?.() || [];
  const last = samples[samples.length - 1];
  return last && last.clientX === event.clientX && last.clientY === event.clientY
    ? samples : [...samples, event];
}

// Join letters that share a writing row. Blank gaps between letters are writing
// space too, rather than closed strips of paper that can be flood-coloured.
export function tracingRows(boxes) {
  const rows = [];
  for (const [x, y, w, h] of boxes) {
    let row = rows.find(r => y < r[3] && y + h > r[1]);
    if (!row) { rows.push([x, y, x + w, y + h]); continue; }
    row[0] = Math.min(row[0], x); row[1] = Math.min(row[1], y);
    row[2] = Math.max(row[2], x + w); row[3] = Math.max(row[3], y + h);
  }
  return rows;
}

// Ruled practice lines close off long white strips. They are paper for writing,
// even though flood fill would otherwise mistake them for colouring shapes.
export function isWritingStrip(mask, width, height) {
  let left = width, right = -1, top = height, bottom = -1, area = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) {
    const x = i % width, y = Math.floor(i / width);
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y); area++;
  }
  const w = right - left + 1, h = bottom - top + 1;
  return area > 0 && w > width * .4 && h < height * .12 && w > h * 4 && area / (w * h) > .85;
}
