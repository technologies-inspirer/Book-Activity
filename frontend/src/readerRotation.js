// Coordinates remain relative to the page even when the user turns the reader.
export function readerPoint(event, node, width, height) {
  const r = node.getBoundingClientRect();
  return node.closest('.reader-manual-rotated')
    ? [(event.clientY - r.top) / r.height * width, (r.right - event.clientX) / r.width * height]
    : [(event.clientX - r.left) / r.width * width, (event.clientY - r.top) / r.height * height];
}

export function attachReaderRotation(root, book, stage, ratio) {
  const doc = root.ownerDocument, win = doc.defaultView;
  function control(label, className) {
    const node = doc.createElement('button');
    node.type = 'button'; node.className = className; node.textContent = label;
    return node;
  }
  const button = control('? Rotate', 'btn ghost reader-rotate');
  button.setAttribute('aria-label', 'Rotate book view 90 degrees');
  button.setAttribute('aria-pressed', 'false');
  const full = control('Full screen', 'btn ghost reader-fullscreen');
  full.setAttribute('aria-pressed', 'false');
  root.querySelector('.rbar').append(button, full);
  const controls = doc.createElement('div'); controls.className = 'reader-expanded-controls';
  const exit = control('Exit full screen', 'btn ghost');
  const rotateFull = control('? Rotate', 'btn ghost');
  controls.append(rotateFull, exit); root.append(controls);
  let rotated = false, expanded = false, native = false, disposed = false;
  function fit() {
    if (!rotated && !expanded) { book.style.removeProperty('width'); return; }
    root.style.setProperty('--rotated-width', (win.visualViewport?.height || win.innerHeight) + 'px');
    root.style.setProperty('--rotated-height', (win.visualViewport?.width || win.innerWidth) + 'px');
    const style = win.getComputedStyle(stage);
    const height = Math.max(0, stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 22);
    book.style.width = Math.max(0, Math.min(book.parentElement.clientWidth - 24, height * ratio * 2)) + 'px';
  }
  function rotate() {
    rotated = !rotated;
    root.classList.toggle('reader-manual-rotated', rotated);
    button.setAttribute('aria-pressed', String(rotated));
    rotateFull.setAttribute('aria-pressed', String(rotated));
    fit();
  }
  function update() {
    root.classList.toggle('reader-manual-fullscreen', expanded);
    full.setAttribute('aria-pressed', String(expanded));
    fit();
  }
  async function fullscreen() {
    if (expanded) {
      expanded = false; update();
      if (native && doc.fullscreenElement) { try { await doc.exitFullscreen(); } catch { /* already exited */ } }
      native = false; return;
    }
    expanded = true; update();
    try {
      if (!doc.fullscreenElement && doc.documentElement.requestFullscreen) {
        await doc.documentElement.requestFullscreen(); native = true;
      }
    } catch { /* expanded viewport remains usable without the browser API */ }
    if (disposed) { if (native && doc.fullscreenElement) void doc.exitFullscreen().catch(() => {}); return; }
    update();
  }
  function changed() {
    if (native && !doc.fullscreenElement) { native = false; expanded = false; update(); }
  }
  function key(event) {
    if (event.key === 'Escape' && expanded) {
      event.preventDefault(); event.stopImmediatePropagation(); void fullscreen();
    }
  }
  button.addEventListener('click', rotate); rotateFull.addEventListener('click', rotate);
  full.addEventListener('click', fullscreen); exit.addEventListener('click', fullscreen);
  doc.addEventListener('fullscreenchange', changed); doc.addEventListener('keydown', key, true);
  const observer = new win.ResizeObserver(fit); observer.observe(stage);
  win.addEventListener('resize', fit); win.visualViewport?.addEventListener('resize', fit);
  return () => {
    disposed = true; observer.disconnect();
    win.removeEventListener('resize', fit); win.visualViewport?.removeEventListener('resize', fit);
    doc.removeEventListener('fullscreenchange', changed); doc.removeEventListener('keydown', key, true);
    if (native && doc.fullscreenElement) void doc.exitFullscreen().catch(() => {});
    root.classList.remove('reader-manual-rotated', 'reader-manual-fullscreen');
    book.style.removeProperty('width'); button.remove(); full.remove(); controls.remove();
  };
}
