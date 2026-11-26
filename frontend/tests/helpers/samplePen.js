// A geometry-only test sampler for the absolute SVG commands used by the pens.
// Production uses the browser's SVG getPointAtLength implementation.
export function samplePen(d) {
  const tokens = d.match(/[MLHVCZ]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g);
  let i = 0, command, current = [0, 0], path;
  const strokes = [], number = () => Number(tokens[i++]);
  const line = end => {
    const from = current;
    const count = Math.max(1, Math.ceil(Math.hypot(end[0] - from[0], end[1] - from[1]) * 100));
    for (let k = 1; k <= count; k++) path.push([from[0] + (end[0] - from[0]) * k / count, from[1] + (end[1] - from[1]) * k / count]);
    current = end;
  };
  while (i < tokens.length) {
    if (/^[A-Z]$/.test(tokens[i])) command = tokens[i++];
    if (command === 'M') { current = [number(), number()]; path = [current]; strokes.push(path); command = 'L'; }
    else if (command === 'L') line([number(), number()]);
    else if (command === 'H') line([number(), current[1]]);
    else if (command === 'V') line([current[0], number()]);
    else if (command === 'Z') { line(path[0]); command = null; }
    else if (command === 'C') {
      const a = current, b = [number(), number()], c = [number(), number()], end = [number(), number()];
      for (let k = 1; k <= 100; k++) {
        const t = k / 100, u = 1 - t;
        path.push([0, 1].map(axis => u ** 3 * a[axis] + 3 * u ** 2 * t * b[axis] + 3 * u * t ** 2 * c[axis] + t ** 3 * end[axis]));
      }
      current = end;
    } else throw new Error(`Unsupported pen command: ${command}`);
  }
  return strokes;
}
