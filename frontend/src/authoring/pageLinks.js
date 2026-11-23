export { validatePrintedQrs } from '../data/printedQrPositions.js';

// Fixed proportions for every uploaded book; only position can be changed in the editor.
export function automaticButtonPlacement(index) {
  const column = Math.floor(index / 8) % 3, row = index % 8;
  return { x: 3 + column * 32, y: 5 + row * 10.5, w: 29, h: 5.5 };
}

export function pageButtonPlacement(activity, index) {
  if (!activity.fixedButton && activity.placement) return activity.placement;
  let automatic = automaticButtonPlacement(index);
  if (activity.qrAnchor && !activity.placement) {
    const qr = activity.qrAnchor;
    const right = qr.x + qr.w + 1.5, left = qr.x - automatic.w - 1.5;
    const x = right + automatic.w <= 97 ? right : left >= 3 ? left : Math.min(71, qr.x);
    const beside = right + automatic.w <= 97 || left >= 3;
    const y = beside ? qr.y + qr.h / 2 - automatic.h / 2 : qr.y + qr.h + 1.5 + automatic.h <= 98 ? qr.y + qr.h + 1.5 : qr.y - automatic.h - 1.5;
    automatic = { ...automatic, x: Math.max(0, x), y: Math.max(0, Math.min(94.5, y)) };
  }
  return { ...automatic, ...(activity.placement ? { x: Math.min(71, activity.placement.x), y: Math.min(94.5, activity.placement.y) } : {}) };
}

export function findPublishedBooks(books, selection) {
  const query = (selection.query || '').trim().toLocaleLowerCase();
  return books.filter(book => ['seriesId', 'classId', 'subjectId'].every(key => !selection[key] || book[key] === selection[key]) && (!query || book.title.toLocaleLowerCase().includes(query)));
}
