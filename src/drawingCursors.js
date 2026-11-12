// Drawing cursors: a big crayon-pencil whose tip shows the chosen colour, and an eraser.
// 44px reads clearly for children; the hotspot is the pencil point / eraser edge.
const cursor = (svg, x, y, fallback = 'crosshair') => `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, ${fallback}`;
const safeColour = colour => (/^#[0-9a-f]{3,8}$/i.test(colour || '') ? colour : '#e63946');

export function pencilCursorFor(colour) {
  const tip = safeColour(colour);
  return cursor(`<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
<g stroke="#173f49" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
<path d="M10 34L33 11l6 6-23 23Z" fill="#ffbf47"/>
<path d="M14 38l23-23" stroke="#ffd98a" stroke-width="2.5"/>
<path d="M33 11l3-3a3.5 3.5 0 015 0l1 1a3.5 3.5 0 010 5l-3 3Z" fill="#f28c9a"/>
<path d="M30 14l6 6" stroke="#5c7481"/>
<path d="M10 34l6 6-12 4Z" fill="#f8dfb0"/>
<path d="M4 44l2-6 4 4Z" fill="${tip}"/>
</g>
</svg>`, 4, 42);
}

export const pencilCursor = pencilCursorFor('#173f49');

export const eraserCursor = cursor(`<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
<g stroke="#173f49" stroke-width="2" stroke-linejoin="round">
<path d="M4 28L24 6a4 4 0 016 0l10 9a4 4 0 010 6L22 40H12l-8-7a4 4 0 010-5Z" fill="#f28c9a"/>
<path d="M4 28l8-9 17 15-7 6H12l-8-7a4 4 0 010-5Z" fill="#e3f2ed"/>
<path d="M12 40h28" stroke-linecap="round"/>
</g></svg>`, 10, 38);

// colour: the brush colour, shown on the pencil tip. The same cursor goes on the canvas's page, so
// tracing start dots and colour hints on top of the drawing keep the pencil too (see .fx-page.pen).
export function setDrawingCursor(canvas, erase, colour) {
  const value = erase ? eraserCursor : pencilCursorFor(colour);
  canvas.style.cursor = value;
  canvas.parentElement?.style.setProperty('--draw-cursor', value);
}
