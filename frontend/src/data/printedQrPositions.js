export const validBox = p => p && ['x', 'y', 'w', 'h'].every(k => Number.isFinite(p[k])) && p.x >= 0 && p.y >= 0 && p.w > 0 && p.h > 0 && p.x + p.w <= 100.001 && p.y + p.h <= 100.001;

export function validatePrintedQrs(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20 || !value.every(p => validBox(p) && typeof p.id === 'string' && /^[\w-]{1,100}$/.test(p.id)) || new Set(value.map(p => p.id)).size !== value.length) throw new Error('Invalid printed QR positions.');
  return value.map(p => Object.fromEntries(['id', 'x', 'y', 'w', 'h'].map(k => [k, p[k]])));
}
