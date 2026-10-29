const pending = new Map();
const listeners = new Set();
let snapshot = null;
const publish = () => {
  const next = [...pending.values()].find(item => item.visible)?.label || null;
  if (snapshot === next) return;
  snapshot = next;
  listeners.forEach(listener => listener());
};

export const loadingState = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  snapshot: () => snapshot
};

export function beginLoading(label = 'Loading...', delay = 200, { minimum = 1200, onRelease } = {}) {
  const id = Symbol();
  const item = { label, visible: delay === 0 };
  let visibleAt = item.visible ? Date.now() : null;
  let hideTimer;
  let finished = false;
  pending.set(id, item);
  const timer = setTimeout(() => { if (!item.visible) { visibleAt = Date.now(); item.visible = true; publish(); } }, delay);
  const release = () => { clearTimeout(hideTimer); pending.delete(id); publish(); onRelease?.(); };
  publish();
  return (immediate = false) => {
    clearTimeout(timer);
    if (immediate === true) { finished = true; release(); return; }
    if (finished) return;
    finished = true;
    const remaining = visibleAt === null ? 0 : Math.max(0, minimum - (Date.now() - visibleAt));
    if (remaining) hideTimer = setTimeout(release, remaining);
    else release();
  };
}

// Reader-owned work must never leave a loader behind after navigation or closing media.
export function createLoadingScope() {
  const tasks = new Set();
  const bindings = new Map();
  let disposed = false;
  function begin(label) {
    if (disposed) return () => {};
    const end = beginLoading(label, 200, { onRelease: () => tasks.delete(finish) });
    const finish = immediate => end(immediate);
    tasks.add(finish);
    return finish;
  }
  function bind(target, events, stopWhenDetached) {
    bindings.get(target)?.cleanup();
    const cleanup = (immediate = true) => {
      Object.entries(events).forEach(([event, handler]) => target.removeEventListener(event, handler));
      events.stop?.(immediate);
      bindings.delete(target);
    };
    Object.entries(events).filter(([event]) => event !== 'stop').forEach(([event, handler]) => target.addEventListener(event, handler));
    bindings.set(target, { cleanup, stopWhenDetached });
  }
  const observer = new MutationObserver(() => {
    for (const [target, binding] of bindings) if (binding.stopWhenDetached && !target.isConnected) binding.cleanup();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return {
    begin,
    image(image) {
      if (disposed || image.complete) return;
      const stop = begin('Loading your page...');
      const done = () => bindings.get(image)?.cleanup(false);
      bind(image, { load: done, error: done, stop }, true);
    },
    media(media) {
      if (disposed) return;
      let finish;
      const stop = immediate => { finish?.(immediate === true); finish = null; };
      const start = () => { if (!media.paused || media.autoplay) finish ||= begin(media.tagName === 'VIDEO' ? 'Buffering video...' : 'Loading audio...'); };
      bind(media, { loadstart: start, waiting: start, stalled: () => { if (media.readyState < 3) start(); }, playing: stop, canplay: stop, pause: stop, ended: stop, error: stop, abort: stop, emptied: stop, stop }, media.tagName === 'VIDEO');
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      for (const binding of [...bindings.values()]) binding.cleanup();
      tasks.forEach(finish => finish(true));
    }
  };
}
