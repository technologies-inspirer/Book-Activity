import jsQR from 'jsqr';
import { validatePrintedQrs } from './pageLinks.js';

export function detectPrintedQrs({ data, width, height }, decode = jsQR) {
  const pixels = new Uint8ClampedArray(data), found = [];
  // Widely separated codes can confuse a single full-page finder-pattern search.
  // Overlapping tiles also detect multiple codes without relying on their encoded links.
  const tileW = Math.ceil(width * .6), tileH = Math.ceil(height * .6);
  const regions = [[0, 0, width, height], [0, 0, tileW, tileH], [width - tileW, 0, tileW, tileH], [0, height - tileH, tileW, tileH], [width - tileW, height - tileH, tileW, tileH]];
  for (const [ox, oy, rw, rh] of regions) for (let n = 0; n < 20 && found.length < 20; n++) {
    let sample = pixels;
    if (rw !== width || rh !== height) {
      sample = new Uint8ClampedArray(rw * rh * 4);
      for (let y = 0; y < rh; y++) sample.set(pixels.subarray(((oy + y) * width + ox) * 4, ((oy + y) * width + ox + rw) * 4), y * rw * 4);
    }
    const result = decode(sample, rw, rh, { inversionAttempts: 'attemptBoth' });
    if (!result) break;
    const corners = ['topLeftCorner', 'topRightCorner', 'bottomLeftCorner', 'bottomRightCorner'].map(k => result.location[k]);
    const x = Math.max(0, Math.floor(ox + Math.min(...corners.map(p => p.x)) - 2));
    const y = Math.max(0, Math.floor(oy + Math.min(...corners.map(p => p.y)) - 2));
    const right = Math.min(width, Math.ceil(ox + Math.max(...corners.map(p => p.x)) + 2));
    const bottom = Math.min(height, Math.ceil(oy + Math.max(...corners.map(p => p.y)) + 2));
    if (right <= x || bottom <= y) break;
    const box = { x: x / width * 100, y: y / height * 100, w: (right - x) / width * 100, h: (bottom - y) / height * 100 };
    const id = `qr-${[box.x, box.y, box.w, box.h].map(v => Math.round(v * 10)).join('-')}`;
    if (found.some(p => p.id === id)) break;
    found.push({ id, ...box });
    // Do not copy the encoded URL: administrators explicitly supply the destination.
    for (let yy = y; yy < bottom; yy++) for (let xx = x; xx < right; xx++) {
      const at = (yy * width + xx) * 4; pixels[at] = pixels[at + 1] = pixels[at + 2] = pixels[at + 3] = 255;
    }
  }
  return validatePrintedQrs(found.sort((a, b) => a.y - b.y || a.x - b.x));
}

export async function scanBookQrCodes(draft, { signal, onProgress } = {}) {
  const pages = [];
  for (const page of draft.pages) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (page.qrScanned) { pages.push(page); continue; }
    const bitmap = await createImageBitmap(page.image);
    try {
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(bitmap, 0, 0);
      const detected = detectPrintedQrs(ctx.getImageData(0, 0, canvas.width, canvas.height));
      pages.push({ ...page, printedQrs: page.printedQrs?.length ? page.printedQrs : detected, qrScanned: true });
      canvas.width = canvas.height = 0;
    } finally { bitmap.close(); }
    onProgress?.({ completed: pages.length, total: draft.pages.length });
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return pages.every((page, i) => page === draft.pages[i]) ? draft : { ...draft, pages };
}
