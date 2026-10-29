const cursor = (svg, x, y) => `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, crosshair`;

export const pencilCursor = cursor('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M3 29l3-10L22 3a3 3 0 014 0l3 3a3 3 0 010 4L13 26Z" fill="#ffbf47" stroke="#173f49" stroke-width="1.5" stroke-linejoin="round"/><path d="M19 6l7 7M22 3l7 7" stroke="#173f49" stroke-width="1.5"/><path d="M22 3a3 3 0 014 0l3 3a3 3 0 010 4l-3 3-7-7Z" fill="#f28c9a" stroke="#173f49" stroke-width="1.5"/><path d="M6 19l7 7-10 3Z" fill="#f8dfb0" stroke="#173f49" stroke-width="1.5"/><path d="M3 29l2-6 4 4Z" fill="#173f49"/><path d="M9 20L21 8" stroke="#fff0b6" stroke-width="2"/></svg>', 3, 29);

export const eraserCursor = cursor('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M3 20L17 4a3 3 0 014 0l8 7a3 3 0 010 4L16 29H9l-6-5a3 3 0 010-4Z" fill="#f28c9a" stroke="#173f49" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 20l6-7 13 11-6 5H9l-6-5a3 3 0 010-4Z" fill="#e3f2ed" stroke="#173f49" stroke-width="1.5"/><path d="M9 29h20" stroke="#173f49" stroke-width="1.5" stroke-linecap="round"/></svg>', 8, 27);

export function setDrawingCursor(canvas, erase) {
  canvas.style.cursor = erase ? eraserCursor : pencilCursor;
}
