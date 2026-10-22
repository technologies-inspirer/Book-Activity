(() => {
  'use strict';

  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const books = window.DEMO_BOOKS;
  const app = document.getElementById('app');

  const drawings = {};                       // `${bookId}:${pageIndex}:${zoneId}` -> data URL
  const brush = { color: '#e63946', size: 12, erase: false };
  let R = null;                              // the open reader, if any
  let editMode = false;
  let menu = null;                           // open section menu
  let modalEl = null;
  let focusEl = null;                        // the zoomed-in page, if one is open
  let introNext = false;                     // play the cover opening when the reader appears
  let justClosed = false;                    // the reader just closed the book onto the preview

  const I = {
    speaker: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M4 20l1-4L16 5l3 3L8 19z"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 16V5M7 10l5-5 5 5M5 19h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /* ---------- helpers ---------- */
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    n.append(...kids.flat().filter(k => k != null && k !== false));
    return n;
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pageOf = (book, i) => book.pages[i];

  let toastTimer;
  function toast(msg, ms = 2600) {
    document.querySelector('.toast')?.remove();
    document.body.append(el('div', { class: 'toast', role: 'status' }, msg));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => document.querySelector('.toast')?.remove(), ms);
  }

  function ytId(v) {
    if (!v) return null;
    v = v.trim();
    if (/^[\w-]{11}$/.test(v)) return v;
    const m = v.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  /* ---------- zones saved by the publisher (this browser only, for now) ---------- */
  const zkey = b => 'zk.zones.' + b.id;
  function saveZones(b) {
    try { localStorage.setItem(zkey(b), JSON.stringify(b.pages.map(p => p.zones || []))); } catch (e) { /* storage unavailable */ }
  }
  function loadZones(b) {
    try {
      const saved = JSON.parse(localStorage.getItem(zkey(b)));
      if (Array.isArray(saved)) saved.forEach((z, i) => { if (b.pages[i]) b.pages[i].zones = z; });
    } catch (e) { /* nothing saved */ }
  }
  // Books converted from PDF (tools/import_pdf.py) go first on the shelf.
  books.unshift(...(window.PDF_BOOKS || []).map(b => ({
    id: b.id, title: b.title, author: b.author || 'Imported from PDF', tag: 'Book', c1: b.c1, c2: b.c2, rtl: !!b.rtl,
    ratio: b.ratio, dir: b.dir, cover: `${b.dir}/cover.jpg`,
    pages: Array.from({ length: b.pages }, (_, i) => ({ img: `${b.dir}/p${String(i + 1).padStart(3, '0')}.jpg`, qr: b.qr?.[i + 1], acts: [].concat(window.BOOK_ACTIVITIES?.[b.id]?.[i + 1] || []), zones: window.BOOK_ZONES?.[b.id]?.[i + 1] || [] }))
  })));
  books.forEach(loadZones);

  /* ---------- routing: #/book/<id>/read/<page>/video/<zoneId> ---------- */
  const link = (b, page, zid) =>
    `#/book/${encodeURIComponent(b.id)}` + (page ? `/read/${page}` : '') + (zid ? `/video/${encodeURIComponent(zid)}` : '');

  function parseHash() {
    const p = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    return {
      series: p[0] === 'series' ? SERIES.find(x => x.id === p[1]) : null,
      book: p[0] === 'book' ? books.find(b => b.id === p[1]) : null,
      read: p[2] === 'read',
      page: Math.max(1, parseInt(p[3], 10) || 1),
      video: p[4] === 'video' ? p[5] : null
    };
  }

  function route() {
    const r = parseHash();
    if (!r.book) { leaveReader(); return showLibrary(r.series); }
    if (!r.read) { leaveReader(); return showPreview(r.book); }
    const s = Math.floor((r.page - 1) / 2);
    if (!R || R.book !== r.book) showReader(r.book, s, introNext);
    else if (R.spread !== s && !R.busy) R.show(s);
    introNext = false;
    syncVideo(r);
  }

  /* ---------- phones: a book is read sideways (landscape), full screen ---------- */
  const isPhone = () => matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  // Needs a tap (the browser only allows it then). Android turns the screen; an iPhone cannot be turned by a
  // website, so there the reader asks the child to turn the phone.
  function goLandscape() {
    if (!isPhone()) return;
    const root = document.documentElement;
    const full = document.fullscreenElement || !root.requestFullscreen ? Promise.resolve() : root.requestFullscreen({ navigationUI: 'hide' });
    full.then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  }
  function leaveLandscape() {
    if (!isPhone()) return;
    try { screen.orientation?.unlock?.(); } catch (e) { /* not locked */ }
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  function leaveReader() {
    if (R) leaveLandscape();
    stopSpeak();
    closeMenu();
    closeModal();
    focusEl?.remove();
    focusEl = null;
    closeGame();
    closeStory();
    R = null;
    editMode = false;
  }

  /* ---------- 3D book ---------- */
  function coverFace(b) {
    if (b.cover) return el('img', { class: 'cover-img', src: b.cover, alt: '' });
    return el('div', { class: 'cover-art' },
      el('span', { class: 'cv-tag' }, b.tag || 'Book'),
      el('div', { class: 'cv-icon' }, b.icon || '📖'),
      el('b', { class: 'cv-title' }, b.title),
      el('span', { class: 'cv-author' }, b.author));
  }

  function book3d(b) {
    return el('div', { class: 'b3d', style: `--c1:${b.c1 || '#34495e'};--c2:${b.c2 || '#1f2d3d'}` },
      el('div', { class: 'b3d-back' }),
      el('div', { class: 'b3d-spine' }, el('span', {}, b.title)),
      el('div', { class: 'b3d-edge r' }), el('div', { class: 'b3d-edge t' }), el('div', { class: 'b3d-edge b' }),
      el('div', { class: 'b3d-first' }),
      el('div', { class: 'b3d-cover' },
        el('div', { class: 'face front' }, coverFace(b)),
        el('div', { class: 'face inner' })));
  }

  /* ---------- library: the series first, then the books of the chosen series in a row ---------- */
  const SERIES = [
    { id: 'stemford', name: 'StemFord Series', of: b => !/^maxford/.test(b.id) },
    { id: 'maxford', name: 'MaxFord Series', of: b => /^maxford/.test(b.id) }
  ];
  const seriesOf = b => SERIES.find(x => x.of(b)) || SERIES[0];

  function header() {
    const home = () => !location.hash.replace(/^#\/?/, '');
    const go = id => e => {
      e.preventDefault();
      if (!home()) location.hash = '#/';
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 60);
    };
    return el('header', { class: 'topbar' },
      el('a', { class: 'logo', href: '#/', title: 'Javed Publishers' }, el('img', { src: 'assets/logo-white.png', alt: 'Javed Publishers' })),
      el('nav', { class: 'topnav' },
        el('a', { href: '#/', onclick: go('series') }, 'Series'),
        el('a', { href: '#/', onclick: go('resources') }, 'Resources')));
  }

  // Home: a dashboard. Logo bar, a welcome panel with the numbers, the series, and room for book resources.
  function showLibrary(series) {
    if (series) return showSeries(series);
    document.title = 'Javed Publishers — Interactive Books';
    const pages = books.reduce((t, b) => t + b.pages.length, 0);
    const videos = books.reduce((t, b) => t + b.pages.filter(p => p.qr || p.acts.some(a => a.type === 'videos' || a.video)).length, 0);
    const acts = books.reduce((t, b) => t + b.pages.reduce((u, p) => u + p.acts.length, 0), 0);
    const stat = (n, label) => el('div', { class: 'stat' }, el('b', {}, n.toLocaleString()), el('span', {}, label));
    const tiles = el('div', { class: 'series-tiles' }, SERIES.map(x => {
      const list = books.filter(x.of);
      return el('a', { class: 'series-tile', href: `#/series/${x.id}` },
        el('div', { class: 'series-covers' }, list.slice(0, 3).map((b, k) =>
          el('img', { src: b.cover, alt: '', style: `--k:${k};--n:${Math.min(3, list.length)}` }))),
        el('b', {}, x.name), el('small', {}, `${list.length} book${list.length === 1 ? '' : 's'}`),
        el('span', { class: 'tile-go' }, 'Open series →'));
    }));
    app.replaceChildren(el('div', { class: 'lib dash' }, header(),
      el('section', { class: 'welcome' },
        el('div', { class: 'welcome-text' },
          el('span', { class: 'eyebrow' }, 'Interactive digital books'),
          el('h1', {}, 'Learning that ', el('em', {}, 'comes alive')),
          el('p', {}, 'Every book opens like a real one. Pages read aloud, play videos, teach with animations and games, and let children trace and colour.')),
        el('div', { class: 'stats' }, stat(books.length, 'Books'), stat(pages, 'Pages'), stat(acts, 'Activities'), stat(videos, 'Pages with videos'))),
      el('section', { class: 'panel', id: 'series' },
        el('div', { class: 'panel-head' }, el('h2', {}, 'Our Series'), el('small', {}, 'Choose a series to see its books')),
        tiles),
      el('section', { class: 'panel', id: 'resources' },
        el('div', { class: 'panel-head' }, el('h2', {}, 'Book Resources'), el('small', {}, 'Teacher guides, worksheets and downloads')),
        // the publisher's resources go here
        el('div', { class: 'resources-empty' }, 'Resources will appear here soon.')),
      el('footer', { class: 'foot' }, `© ${new Date().getFullYear()} Javed Publishers. All rights reserved.`)));
  }

  // A series on its own page: all its books, big, in one row that scrolls sideways.
  function showSeries(series) {
    document.title = series.name + ' — Javed Publishers';
    const shelf = el('div', { class: 'shelf row big' },
      books.filter(series.of).map(b => el('a', { class: 'card', href: link(b, 1), onclick: () => { introNext = true; goLandscape(); } },
        el('div', { class: 'card-book' }, book3d(b)),
        el('div', { class: 'card-cap' }, el('b', {}, b.title), el('small', {}, `${b.pages.length} pages`)))));
    const step = d => shelf.scrollBy({ left: d * shelf.clientWidth * .8, behavior: 'smooth' });
    const back = el('button', { class: 'row-nav prev', title: 'Scroll left', html: I.left, onclick: () => step(-1) });
    const fwd = el('button', { class: 'row-nav next', title: 'Scroll right', html: I.right, onclick: () => step(1) });
    const sync = () => {
      back.disabled = shelf.scrollLeft < 4;
      fwd.disabled = shelf.scrollLeft + shelf.clientWidth > shelf.scrollWidth - 4;
    };
    shelf.addEventListener('scroll', sync);
    app.replaceChildren(el('div', { class: 'lib dash series-page' }, header(),
      el('a', { class: 'btn ghost back-home', href: '#/', html: I.left + '<span>All series</span>' }),
      el('h1', { class: 'series-title' }, series.name),
      el('div', { class: 'row-wrap' }, back, shelf, fwd)));
    requestAnimationFrame(sync);
  }

  /* ---------- 3D preview ---------- */
  function showPreview(b) {
    document.title = b.title + ' — Javed Publishers';
    const zones = b.pages.flatMap(p => p.zones || []);
    const count = f => zones.filter(f).length;
    const model = book3d(b);
    let ry = -32, rx = 8, moved = false, opening = false;
    const apply = () => { model.style.setProperty('--ry', ry + 'deg'); model.style.setProperty('--rx', rx + 'deg'); };
    apply();

    const open = () => {
      if (opening) return;
      opening = true;
      // Turn the book to face the reader; the cover itself opens in the reader.
      ry = Math.round(ry / 360) * 360; rx = 0; apply();
      goLandscape();
      setTimeout(() => { introNext = true; location.hash = link(b, 1); }, 520);
    };
    if (justClosed) {                        // arriving from a closed book: settle back to the resting angle
      justClosed = false;
      ry = 0; rx = 0; apply();
      requestAnimationFrame(() => requestAnimationFrame(() => { ry = -32; rx = 8; apply(); }));
    }

    const stage = el('div', { class: 'pv-stage' }, model, el('div', { class: 'pv-hint' }, 'Drag to turn the book · click it to open'));
    let last = null;
    stage.addEventListener('pointerdown', e => {
      if (opening) return;
      last = [e.clientX, e.clientY]; moved = false;
      stage.setPointerCapture(e.pointerId);
      model.classList.add('dragging');
    });
    stage.addEventListener('pointermove', e => {
      if (!last) return;
      const dx = e.clientX - last[0], dy = e.clientY - last[1];
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      ry += dx * 0.6; rx = clamp(rx - dy * 0.3, -30, 30);
      last = [e.clientX, e.clientY];
      apply();
    });
    stage.addEventListener('pointerup', e => {
      model.classList.remove('dragging');
      const wasClick = last && !moved;
      last = null;
      if (wasClick && model.contains(document.elementFromPoint(e.clientX, e.clientY))) open();
    });

    app.replaceChildren(el('div', { class: 'pv' },
      stage,
      el('div', { class: 'pv-info' },
        el('span', { class: 'pv-tag' }, b.tag || 'Book'),
        el('h1', {}, b.title),
        el('p', {}, b.author),
        el('ul', { class: 'chips' },
          el('li', {}, `${b.pages.length} pages`),
          el('li', {}, `${count(z => z.type === 'section' && z.narration)} voice sections`),
          el('li', {}, `${count(z => z.video)} videos`),
          el('li', {}, `${count(z => z.type === 'fill')} activities`)),
        el('div', { class: 'pv-actions' },
          el('button', { class: 'btn primary big', onclick: open }, 'Open book'),
          el('a', { href: `#/series/${seriesOf(b).id}` }, '← Back to library')))));
  }

  /* ---------- pages ---------- */
  function renderZone(book, idx, z, live) {
    const box = el('div', { class: 'zone ' + z.type, style: `left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%` });
    const content = z.content ? el('div', { class: 'zone-content', html: z.content }) : null;
    if (content) box.append(content);
    box.append(el('span', { class: 'zone-name' }, z.title || (z.type === 'fill' ? 'Fill area' : 'Section')));

    if (z.type === 'fill') {
      const key = `${book.id}:${idx}:${z.id}`;
      if (live) box.append(inkCanvas(book, z, key));
      else if (drawings[key]) box.append(el('img', { class: 'ink', src: drawings[key], alt: '' }));
    } else {
      box.append(el('span', { class: 'zone-badge', html: I.speaker }));
    }
    if (live) box.addEventListener('click', () => {
      if (editMode) editZone(book, idx, z, false);
      else if (z.type === 'section') openMenu(book, idx, z, box);
    });
    return box;
  }

  function renderPage(book, idx, live) {
    const pg = pageOf(book, idx);
    const node = el('div', { class: 'page ' + ((idx % 2) ^ (book.rtl ? 1 : 0) ? 'right' : 'left') });
    if (!pg) { node.classList.add('blank'); return node; }
    if (pg.img || pg.pdf) {
      const img = el('img', { class: 'page-bg', alt: `Page ${idx + 1}`, draggable: 'false' });
      if (pg.img) img.src = pg.img; else pageImage(book, pg.pdf).then(u => { img.src = u; });
      node.append(img);
    }
    if (pg.html) node.append(el('div', { class: 'page-html', html: pg.html }));
    (pg.zones || []).forEach(z => node.append(renderZone(book, idx, z, live)));
    if (pg.html) node.append(el('div', { class: 'page-no' }, String(idx + 1)));
    if (!pg.html) {
      // Book pages: what the child wrote in the zoomed view stays on the page, and a click zooms in.
      const ink = drawings[`${book.id}:${idx}:page`];
      if (ink) node.append(el('img', { class: 'ink', src: ink, alt: '' }));
      if (pg.qr) node.append(videoButton(book, idx, live));
      (pg.acts || []).forEach(a => {
        if (a.type === 'game') node.append(gameButton(book, idx, a, live));
        if (a.type === 'story' || a.type === 'videos') node.append(storyButton(book, idx, a, live));
      });
      if (live) {
        node.classList.add('zoomable');
        node.addEventListener('click', e => { if (!editMode && !e.target.closest('.zone, .vid-hot, .watch-btn, .game-btn, .story-btn')) openFocus(book, idx, node); });
      }
    }
    if (live) bindZoneDrawing(node, book, idx);
    return node;
  }

  // Sits on the QR code printed in the book: clicking it plays that QR's video here.
  // A "Watch this" button sits to the right of the QR, or under it when the page edge is too close.
  function videoButton(book, idx, live) {
    const [x, y, w, h] = pageOf(book, idx).qr.box;
    const hot = el('button', { class: 'vid-hot', style: `left:${x}%;top:${y}%;width:${w}%;height:${h}%`, title: 'Watch the video' });
    const pos = x + w + 20 < 100 ? `left:${x + w + 1.2}%;top:${y + h / 2}%` : `left:${x + w / 2}%;top:${y + h + 2.4}%`;
    const btn = el('button', { class: 'watch-btn' + (x + w + 20 < 100 ? '' : ' under'), style: pos, html: I.play + '<span>Watch this</span>' });
    const frag = document.createDocumentFragment();
    frag.append(hot, btn);
    if (live) [hot, btn].forEach(b => b.addEventListener('click', e => { e.stopPropagation(); if (!editMode) playVideo(book, idx, { id: 'page' }); }));
    return frag;
  }

  function storyButton(book, idx, a, live) {
    const btn = el('button', { class: 'story-btn', style: `left:${a.button.x}%;top:${a.button.y}%`, html: `<b>${a.icon || '📖'}</b><span>${a.label || 'Story time'}</span>` });
    if (live) btn.addEventListener('click', e => { e.stopPropagation(); if (!editMode) a.type === 'videos' ? openVideos(a.title, a.videos) : openStory(book, idx, a); });
    return btn;
  }

  // The publisher's own video files, with a choice between them when there are several.
  function openVideos(title, vids, start = 0) {
    stopSpeak(); closeMenu();
    const player = el('video', { controls: true, autoplay: true, playsinline: true, class: 'own-video' });
    const picks = el('div', { class: 'video-picks' });
    const play = k => {
      player.src = encodeURI(vids[k].src);
      player.play().catch(() => {});
      picks.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === k));
    };
    if (vids.length > 1) vids.forEach((v, k) => picks.append(el('button', { onclick: () => play(k) }, v.title)));
    play(start);
    modal(el('div', { class: 'modal-card video-card' }, player,
      el('div', { class: 'video-cap' }, title, picks, el('small', {}, 'Press ✕ to go back to the page'))));
  }

  /* ---------- story animation: the book's own pictures move while the story is read ---------- */
  let storyEl = null, storyToken = 0;
  function closeStory() {
    storyToken++;
    stopSpeak();
    storyEl?.remove();
    storyEl = null;
  }

  function openStory(book, idx, st) {
    closeStory(); closeMenu();
    const ratio = book.ratio || 0.75, ASPECT = 16 / 9;
    let at = 0, paused = false;
    const pic = el('img', { alt: '', draggable: 'false' });
    const stage = el('div', { class: 'story-stage' }, pic);
    const caption = el('div', { class: 'story-text' });
    const dots = el('div', { class: 'story-dots' }, st.scenes.map((_, k) => el('button', { 'aria-label': `Part ${k + 1}`, onclick: () => show(k) })));
    const pauseBtn = el('button', { class: 'story-ctl', title: 'Pause', html: I.pause });
    const end = el('div', { class: 'story-end', hidden: true },
      el('b', {}, 'The End ⭐'),
      el('button', { class: 'fx-btn listen', onclick: () => show(0), html: '<b>↻</b><span>Watch again</span>' }));
    stage.append(end);
    storyEl = el('div', { class: 'story' },
      el('div', { class: 'story-card' },
        el('button', { class: 'modal-x', title: 'Close', onclick: closeStory, html: I.x }),
        el('h3', {}, st.title), stage, caption,
        el('div', { class: 'story-bar' },
          el('button', { class: 'story-ctl', title: 'Back', onclick: () => show(at - 1), html: I.left }),
          pauseBtn,
          el('button', { class: 'story-ctl', title: 'Next', onclick: () => show(at + 1), html: I.right }),
          dots)));
    storyEl.addEventListener('pointerdown', e => { if (e.target === storyEl) closeStory(); });
    document.body.append(storyEl);

    // Place the page picture so the view rect {cx, cy, w} (in % of the page) fills the stage.
    const frame = v => {
      const W = stage.clientWidth, H = W / ASPECT, imgW = W * 100 / v.w, imgH = imgW / ratio;
      return `translate(${W / 2 - v.cx / 100 * imgW}px, ${H / 2 - v.cy / 100 * imgH}px) scale(${100 / v.w})`;
    };
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      paused ? synth?.pause() : synth?.resume();
      stage.classList.toggle('paused', paused);
      pauseBtn.innerHTML = paused ? I.play : I.pause;
    });

    function show(k) {
      if (k < 0 || k >= st.scenes.length) return;
      const token = ++storyToken;
      at = k; paused = false;
      pauseBtn.innerHTML = I.pause;
      stage.classList.remove('paused');
      end.hidden = true;
      dots.querySelectorAll('button').forEach((d, i) => d.classList.toggle('on', i === k));
      const sc = st.scenes[k];
      const secs = Math.max(5, sc.text.split(' ').length * 0.42 + 1);
      pic.src = pageOf(book, sc.page - 1).img;
      pic.style.width = stage.clientWidth + 'px';
      pic.style.transition = 'none';
      pic.style.transform = frame(sc.from);
      pic.getBoundingClientRect();
      pic.style.transition = `transform ${secs}s ease-in-out`;
      pic.style.transform = frame(sc.to);
      let moved = false;
      const next = () => {
        if (moved || token !== storyToken) return;
        moved = true;
        setTimeout(() => {
          if (token !== storyToken) return;
          if (k + 1 < st.scenes.length) show(k + 1);
          else { end.hidden = false; speak(st.title, 'The end.', null, caption); }
        }, 900);
      };
      speak(st.title, sc.text, next, caption);
      // Without a working voice the story still moves on; with one, speech normally ends well before this.
      setTimeout(next, (synth ? secs * 2 : secs) * 1000);
    }
    show(0);
  }

  function gameButton(book, idx, a, live) {
    const btn = el('button', { class: 'game-btn', style: `left:${a.button.x}%;top:${a.button.y}%`, html: `<b>🎮</b><span>${a.label || 'Play'}</span>` });
    if (live) btn.addEventListener('click', e => { e.stopPropagation(); if (!editMode) openGame(book, idx, a); });
    return btn;
  }

  /* ---------- find-the-thing game ---------- */
  let gameEl = null;
  function closeGame() {
    stopSpeak();
    gameEl?.remove();
    gameEl = null;
  }

  function openGame(book, idx, g) {
    closeGame(); closeMenu();
    const pg = pageOf(book, idx), ratio = book.ratio || 0.75, c = g.crop;
    const order = g.targets.slice().sort(() => Math.random() - 0.5);
    let round = 0, stars = 0, busy = false;

    const prompt = el('div', { class: 'game-prompt', dir: g.ur ? 'rtl' : null });
    // what is being said shows inside the card, so nothing covers the stars and score
    const said = el('div', { class: 'game-said', dir: g.ur ? 'rtl' : null });
    const starsEl = el('div', { class: 'game-stars' });
    const scoreEl = el('div', { class: 'game-score' });
    const showScore = () => {
      starsEl.replaceChildren(...order.map((_, k) => el('span', { class: k < stars ? 'on' : '' }, k < stars ? '⭐' : '☆')));
      scoreEl.textContent = `Score: ${stars} / ${order.length}`;
    };
    // Show only the cropped part of the page; targets are placed relative to that crop.
    const pic = el('img', { src: pg.img, alt: '', draggable: 'false',
      style: `width:${100 / c.w * 100}%;left:${-c.x / c.w * 100}%;top:${-c.y / c.h * 100}%` });
    const scene = el('div', { class: 'game-scene', style: `aspect-ratio:${(c.w * ratio) / c.h}` }, pic);
    g.targets.forEach(t => {
      const b = el('button', { class: 'game-hit', 'aria-label': t.name,
        style: `left:${(t.x - c.x) / c.w * 100}%;top:${(t.y - c.y) / c.h * 100}%;width:${t.w / c.w * 100}%;height:${t.h / c.h * 100}%` });
      b.addEventListener('click', () => pick(t, b));
      scene.append(b);
    });
    const again = el('button', { class: 'fx-btn listen', hidden: true, html: '<b>↻</b><span>Play again</span>', onclick: () => openGame(book, idx, g) });
    gameEl = el('div', { class: 'game' },
      el('div', { class: 'game-card' },
        el('button', { class: 'modal-x', title: 'Close', onclick: closeGame, html: I.x }),
        el('h3', { dir: g.ur ? 'rtl' : null }, g.title || 'Game'), prompt, scene, said, el('div', { class: 'game-result' }, starsEl, scoreEl), again));
    gameEl.addEventListener('pointerdown', e => { if (e.target === gameEl) closeGame(); });
    document.body.append(gameEl);
    const me = gameEl;
    showScore();

    const ask = () => {
      const t = order[round];
      prompt.innerHTML = g.ur ? `سوال ${round + 1} / ${order.length}: <b>${t.name}</b> کہاں ہے؟ اس پر ٹیپ کریں!` : `Question ${round + 1} of ${order.length}: Can you find the <b>${t.name}</b>? Tap it!`;
      speak(g.title, g.ur ? `${t.name} کہاں ہے؟ اس پر ٹیپ کریں!` : `Can you find the ${t.name}? Tap it!`, null, said);
    };
    const pick = (t, b) => {
      if (busy || round >= order.length) return;
      if (t !== order[round]) {
        b.classList.remove('no'); b.offsetWidth; b.classList.add('no');
        speak(g.title, g.ur ? `یہ ${t.name} ہے۔ دوبارہ کوشش کریں!` : `That is the ${t.name}. Try again!`, null, said);
        return;
      }
      busy = true;
      b.classList.add('yes');
      stars++;
      round++;
      showScore();
      const done = round >= order.length;
      // Go on when the voice finishes, or after a few seconds if the voice stops or is missing.
      let moved = false;
      const next = () => {
        if (moved || gameEl !== me) return;
        moved = true;
        busy = false;
        if (!done) ask();
      };
      speak(g.title, g.ur ? `شاباش! ${t.say}` + (done ? ` آپ نے ${order.length} میں سے ${stars} ستارے جیتے۔ بہت خوب!` : '')
        : `Yes! ${t.say}` + (done ? ` You got ${stars} out of ${order.length} stars. Well done!` : ''), next, said);
      if (!done) setTimeout(next, 3500);
      if (done) { prompt.innerHTML = g.ur ? `<b>سب مل گئے! 🎉 ${stars} / ${order.length} ستارے</b>` : `<b>You found them all! 🎉 ${stars} / ${order.length} stars</b>`; again.hidden = false; }
    };
    ask();
  }

  /* ---------- zoomed page: listen, watch, write ---------- */
  // The worked answers: a pencil moves to each answer and writes it while the step is read aloud.
  let demoToken = 0;
  function stopDemo(layer) {
    demoToken++;
    stopSpeak();
    layer.replaceChildren();
  }

  function playDemo(act, layer) {
    stopDemo(layer);
    const token = demoToken;
    const pencil = el('div', { class: 'pencil' }, '✏️');
    layer.append(pencil);
    const step = i => {
      if (token !== demoToken) return;
      if (i >= act.steps.length) { pencil.remove(); return; }
      const s = act.steps[i];
      // The next step waits until the voice has finished and every mark has been drawn.
      let spoke = false, drew = false, next = false;
      const go = () => { if (spoke && drew && !next) { next = true; setTimeout(() => step(i + 1), 500); } };
      const gap = k => s.marks.slice(0, k).reduce((t, m) => t + (m.scribble ? 2600 : m.letter || m.glyph ? 1700 : 1400), 0);
      s.marks.forEach((m, k) => setTimeout(() => {
        if (token !== demoToken) return;
        const mark = makeMark(m, layer);
        pencil.style.left = (m.px ?? m.x) + '%';
        pencil.style.top = (m.py ?? m.y) + '%';
        setTimeout(() => token === demoToken && layer.append(mark), 450);
      }, gap(k)));
      setTimeout(() => { drew = true; go(); }, gap(s.marks.length) + 600);
      speak('Show me how', s.say, () => { spoke = true; go(); });
      setTimeout(() => { spoke = true; go(); }, Math.max(4000, s.say.split(' ').length * 450));   // keep going even without a voice
    };
    step(0);
  }

  // Stroke shapes in a 1 x 1 box, written in the order a child is taught.
  const LETTERS = {
    a: 'M.74 .3C.62 .08 .2 .1 .14 .5C.1 .86 .52 .98 .72 .62M.75 .14V.8C.77 .96 .9 .98 1 .88'
  };

  // Each letter as pen strokes, in order, inside the box the dotted letter fills on the page (0..1 both ways).
  const GLYPHS = {
    a: 'M.72 .3C.6 .08 .18 .1 .12 .5C.08 .9 .55 1 .7 .62M.74 .12V.82C.76 .97 .9 .98 1 .88',
    b: 'M.22 0V.97M.22 .62C.38 .38 .9 .4 .9 .7C.9 1 .4 1.02 .22 .9',
    c: 'M.88 .28C.72 .02 .12 .05 .1 .5C.08 .95 .7 1 .95 .8',
    d: 'M.68 .52C.55 .36 .12 .36 .1 .7C.08 1 .55 1.02 .68 .78M.7 0V.88C.72 .98 .86 1 .98 .92',
    e: 'M.1 .52H.88C.88 .15 .22 .08 .1 .5C.05 .95 .7 1 .95 .82',
    f: 'M.92 .1C.78 -.02 .45 .02 .45 .22V1M.12 .42H.82',
    g: 'M.78 .14C.62 -.02 .15 .02 .12 .3C.1 .58 .62 .6 .78 .36M.8 .06V.8C.8 1 .3 1.02 .12 .86',
    h: 'M.18 0V1M.18 .64C.32 .4 .74 .4 .74 .66V.88C.76 1 .9 1 .98 .92',
    i: 'M.5 .16V.86C.52 .98 .72 1 .9 .92M.5 -.08V-.06',
    j: 'M.62 .14V.82C.62 1 .2 1.02 .05 .86M.62 -.06V-.04',
    k: 'M.2 0V1M.85 .45L.24 .72L.9 1',
    l: 'M.45 0V.86C.47 .98 .65 1 .85 .9',
    m: 'M.06 .06V1M.06 .32C.14 0 .46 0 .48 .32V1M.48 .32C.54 0 .88 0 .9 .32V.92C.92 .98 .96 1 1 .96',
    n: 'M.12 .06V1M.12 .32C.22 0 .76 0 .78 .36V.88C.8 .98 .9 1 .98 .94',
    o: 'M.5 .04C.08 .04 .06 .96 .5 .96C.94 .96 .92 .04 .5 .04Z',
    p: 'M.2 .04V1M.2 .2C.36 .02 .88 .03 .88 .3C.88 .58 .36 .6 .2 .44',
    q: 'M.76 .2C.6 .02 .14 .03 .12 .3C.1 .58 .6 .6 .76 .4M.78 .04V1',
    r: 'M.18 .06V1M.18 .44C.28 .08 .66 0 .92 .16',
    s: 'M.88 .16C.72 0 .14 .02 .18 .3C.22 .5 .88 .44 .88 .72C.88 1 .24 1 .08 .84',
    t: 'M.42 0V.86C.44 .98 .64 1 .88 .9M.1 .32H.82',
    u: 'M.12 .06V.62C.12 1 .74 1 .78 .6M.8 .06V.88C.82 .98 .9 1 .98 .94',
    v: 'M.04 .04L.5 .96L.96 .04',
    w: 'M.02 .04L.26 .96L.5 .3L.74 .96L.98 .04',
    x: 'M.08 .04L.92 .96M.92 .04L.08 .96',
    y: 'M.14 .04V.32C.14 .6 .74 .6 .78 .32M.8 .04V.8C.8 1 .3 1.02 .12 .86',
    z: 'M.1 .06H.9L.08 .94H.94',
    B: 'M.18 0V1M.18 0H.55C.88 0 .88 .48 .55 .48H.18M.55 .48C.95 .48 .95 1 .55 1H.18',
    // Urdu letters: the pen sweeps the letter's own ink from right to left, line by line
    ur: 'M1 0H0V.3H1V.6H0V.9H1',
    // numbers, written the way the maths books teach them
    0: 'M.5 .02C.06 .02 .04 .98 .5 .98C.96 .98 .94 .02 .5 .02',
    1: 'M.5 0V1',
    2: 'M.08 .26C.12 .02 .86 -.04 .9 .28C.94 .52 .46 .72 .04 .98H.98',
    3: 'M.08 .14C.4 -.06 .94 .02 .9 .26C.86 .44 .58 .48 .4 .48C.7 .48 .98 .58 .94 .78C.9 1 .32 1.04 .06 .86',
    4: 'M.62 .02L.04 .68H.98M.74 .3V.98',
    5: 'M.9 .02H.16L.1 .44C.4 .3 .94 .38 .94 .68C.94 1 .34 1.04 .06 .86',
    6: 'M.82 .06C.32 -.06 .02 .4 .06 .7C.1 1 .9 1.04 .92 .68C.94 .36 .4 .34 .08 .6',
    7: 'M.04 .02H.96L.36 .98',
    8: 'M.5 .48C.12 .42 .12 .02 .5 .02C.88 .02 .88 .42 .5 .48C.06 .54 .06 .98 .5 .98C.94 .98 .94 .54 .5 .48',
    9: 'M.92 .3C.9 .02 .1 .02 .1 .3C.1 .56 .8 .6 .92 .3V.98'
  };

  function makeMark(m, layer) {
    if (m.ring || m.line) {
      // drawn on a page-sized sheet so circles and lines keep their shape
      const H = 100 * layer.clientHeight / layer.clientWidth, Y = v => (v * H / 100).toFixed(2);
      let d;
      if (m.ring) {
        const ry = m.ry * H / 100, cy = m.cy * H / 100;
        d = `M${m.cx + m.rx} ${cy.toFixed(2)}A${m.rx} ${ry.toFixed(2)} 0 1 1 ${m.cx + m.rx - .01} ${(cy - .3).toFixed(2)}`;
        m.px = m.cx + m.rx; m.py = m.cy;
      } else {
        const [x1, y1, x2, y2] = m.line;
        d = `M${x1} ${Y(y1)}L${x2} ${Y(y2)}`;
        m.px = x2; m.py = y2;
      }
      return el('div', { class: 'mk draw', html: `<svg viewBox="0 0 100 ${H.toFixed(1)}"><path pathLength="1" d="${d}"/></svg>` });
    }
    if (m.glyph) {
      // box = [x, y, w, h] in % of the page, measured from the dotted letter (tools/find_glyphs.py)
      const [x, y, w, h] = m.box, d = GLYPHS[m.glyph];
      const [sx, sy] = d.match(/^M([-\d.]+) ([-\d.]+)/).slice(1).map(Number);
      m.px = x + sx * w; m.py = y + sy * h;
      if (m.ink) {
        // The letter's own shape, cut from the page (tools/ink.py), is uncovered along the pen strokes,
        // so the colour lands exactly on the book's letter. ink.box is the box plus a 25% margin.
        const [ix, iy, iw, ih] = m.ink.box, id = 'mk' + Math.random().toString(36).slice(2);
        const mk = el('div', { class: 'mk glyph', style: `left:${ix}%;top:${iy}%;width:${iw}%;height:${ih}%`,
          html: `<svg viewBox="0 0 1 1" preserveAspectRatio="none"><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1" height="1">`
            + `<path class="brush" pathLength="1" d="${d}" transform="translate(.1667 .1667) scale(.6667)"/></mask></defs>`
            + `<image href="${m.ink.src}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" mask="url(#${id})"/></svg>` });
        // once the pen has finished, show the whole letter in case the brush missed a corner
        setTimeout(() => mk.querySelector('image')?.removeAttribute('mask'), 1900);
        return mk;
      }
      const px = (layer.clientWidth * (w > 7 ? .011 : .007)).toFixed(1);
      return el('div', { class: 'mk glyph', style: `left:${x}%;top:${y}%;width:${w}%;height:${h}%`,
        html: `<svg viewBox="0 0 1 1" preserveAspectRatio="none"><path pathLength="1" d="${d}" vector-effect="non-scaling-stroke" style="stroke-width:${px}px"/></svg>` });
    }
    if (m.letter) {
      // x, y = top-left of the letter, s = its width; all in % of the page width
      m.px = m.x + m.s * .74; m.py = m.y + m.s * .3 * layer.clientWidth / layer.clientHeight;
      const mk = el('div', { class: 'mk path', style: `left:${m.x}%;top:${m.y}%;width:${m.s}%`,
        html: `<svg viewBox="0 0 1 1"><path pathLength="1" d="${LETTERS[m.letter]}" style="stroke-width:${m.weight || .09}"/></svg>` });
      return mk;
    }
    if (m.scribble) {
      // Zig-zag back and forth inside an ellipse: cx, cy in % of the page, rx in % of width, ry in % of height.
      const H = 100 * layer.clientHeight / layer.clientWidth, cy = m.cy * H / 100, ry = m.ry * H / 100;
      let d = '', dir = 1;
      for (let y = cy - ry * .92; y <= cy + ry * .92; y += 1.3) {
        const half = m.rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)) * .92;
        d += (d ? 'L' : 'M') + (m.cx - dir * half).toFixed(1) + ' ' + y.toFixed(1) + 'L' + (m.cx + dir * half).toFixed(1) + ' ' + (y + .65).toFixed(1);
        dir = -dir;
      }
      m.px = m.cx; m.py = m.cy;
      return el('div', { class: 'mk scrib', html: `<svg viewBox="0 0 100 ${H.toFixed(1)}"><path pathLength="1" d="${d}" style="stroke:${m.scribble}"/></svg>` });
    }
    const mark = m.tick ? el('div', { class: 'mk tick', html: '<svg viewBox="0 0 24 24"><path d="M4 13l5 5L20 6"/></svg>' })
      : m.circle ? el('div', { class: 'mk circ' }, m.circle)
      : el('div', { class: 'mk write' }, m.write);
    mark.style.left = m.x + '%';
    mark.style.top = m.y + '%';
    return mark;
  }

  function closeFocus() {
    if (!focusEl) return;
    demoToken++;
    stopSpeak();
    focusEl.remove();
    focusEl = null;
    if (R && !R.busy) R.show(R.spread);      // redraw the spread so new writing shows on the page
  }

  function openFocus(book, idx, fromEl) {
    if (focusEl || R?.busy) return;
    stopSpeak(); closeMenu();
    const pg = pageOf(book, idx), ratio = book.ratio || 0.75, key = `${book.id}:${idx}:page`;
    const img = el('img', { class: 'page-bg', alt: `Page ${idx + 1}`, draggable: 'false' });
    if (pg.img) img.src = pg.img; else pageImage(book, pg.pdf).then(u => { img.src = u; });
    const canvasFor = () => inkCanvas(book, { w: 100, h: 100 }, key);
    const sheet = el('div', { class: 'fx-page' }, img, canvasFor());
    if (pg.qr) sheet.append(videoButton(book, idx, true));

    const listen = el('button', { class: 'fx-btn listen', hidden: true, html: I.speaker + '<span>Listen</span>' });
    pageText(book).then(pages => {
      const text = (pages[idx] || []).map(b => b[4]).filter(t => /[a-z]{2}/i.test(t)).join('. ');
      if (!text || !focusEl) return;
      listen.hidden = false;
      listen.addEventListener('click', () => speak(`Page ${idx + 1}`, text));
    });
    // Fill pages: "Show me how" plays the worked answers; "I'll do it myself" hands over the pen.
    const fillAct = (pg.acts || []).find(a => a.type === 'fill'), fill = !!fillAct;
    // A page that names its colours (an apple: red and green) offers only those.
    const tools = drawTools(() => { delete drawings[key]; sheet.querySelector('canvas').replaceWith(canvasFor()); }, fillAct?.colours);
    const demo = el('div', { class: 'demo' });
    sheet.append(demo);
    const showHow = fill && el('button', { class: 'fx-btn how', html: I.play + '<span>Show me how</span>',
      onclick: () => { sheet.classList.remove('pen'); tools.hidden = true; playDemo(fillAct, demo); } });
    const myself = fill && el('button', { class: 'fx-btn self', html: I.pen + "<span>I'll do it myself</span>",
      onclick: () => { stopDemo(demo); sheet.classList.add('pen'); tools.hidden = false; } });
    if (!fill) { sheet.classList.add('pen'); tools.hidden = false; }
    const panel = el('div', { class: 'fx-panel' },
      el('button', { class: 'fx-btn close', onclick: closeFocus, html: I.x + '<span>Close</span>' }),
      showHow, myself,
      fillAct?.video && el('button', { class: 'fx-btn video', onclick: () => openVideos(fillAct.video.title, [fillAct.video]), html: I.play + `<span>${fillAct.video.title}</span>` }),
      listen,
      pg.qr && el('button', { class: 'fx-btn video', onclick: () => playVideo(book, idx, { id: 'page' }), html: I.play + '<span>Watch video</span>' }),
      tools);
    focusEl = el('div', { class: 'fx' }, sheet, panel);
    focusEl.addEventListener('pointerdown', e => { if (e.target === focusEl) closeFocus(); });
    document.body.append(focusEl);

    // Fit the whole page on screen, then grow it out of the page that was clicked.
    const side = innerWidth > 760;
    const pr = panel.getBoundingClientRect();
    const h = Math.min(innerHeight - (side ? 24 : pr.height + 36), (innerWidth - (side ? pr.width + 52 : 16)) / ratio);
    sheet.style.height = h + 'px';
    sheet.style.width = h * ratio + 'px';
    const to = sheet.getBoundingClientRect(), from = fromEl.getBoundingClientRect();
    sheet.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`;
    sheet.getBoundingClientRect();
    sheet.classList.add('grow');
    sheet.style.transform = '';
  }

  // The canvas keeps a fixed resolution tied to the zone, so drawings survive resizes and page turns.
  function inkCanvas(book, z, key) {
    const c = el('canvas', { class: 'ink' });
    c.width = Math.round(z.w * 12);
    c.height = Math.round(z.h * 12 / (book.ratio || 0.75));
    const ctx = c.getContext('2d');
    if (drawings[key]) {
      const im = new Image();
      im.onload = () => ctx.drawImage(im, 0, 0);
      im.src = drawings[key];
    }
    let last = null;
    const pos = e => {
      const r = c.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width * c.width, (e.clientY - r.top) / r.height * c.height];
    };
    const seg = (a, b) => {
      ctx.globalCompositeOperation = brush.erase ? 'destination-out' : 'source-over';
      ctx.strokeStyle = brush.color;
      ctx.lineWidth = brush.size * (brush.erase ? 2.5 : 1);
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    };
    const end = () => { if (last) { last = null; drawings[key] = c.toDataURL(); } };
    c.addEventListener('pointerdown', e => {
      if (editMode) return;
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      last = pos(e);
      seg(last, [last[0] + 0.1, last[1] + 0.1]);
    });
    c.addEventListener('pointermove', e => { if (last) { const p = pos(e); seg(last, p); last = p; } });
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    return c;
  }

  /* ---------- reader ---------- */
  function showReader(book, startSpread, intro) {
    document.title = book.title + ' — Javed Publishers';
    editMode = false;
    const spreads = Math.ceil(book.pages.length / 2);
    const ratio = book.ratio || 0.75;

    const left = el('div', { class: 'slot left' }), right = el('div', { class: 'slot right' });
    // Urdu books open from the right: the earlier page of a spread is on the right, and pages turn the other way.
    const rtl = !!book.rtl, L = s => s * 2 + (rtl ? 1 : 0), Rt = s => s * 2 + (rtl ? 0 : 1);
    const bookEl = el('div', { class: 'book' + (rtl ? ' rtl' : ''), style: `--ratio:${ratio};aspect-ratio:${ratio * 2};--c1:${book.c2 || '#1f2d3d'}` }, left, right);
    const label = el('span', { class: 'r-pages' });
    const slider = el('input', { type: 'range', min: 0, max: spreads - 1, step: 1, 'aria-label': 'Go to pages', oninput: e => show(+e.target.value) });
    // the button on the left goes back in a left-to-right book and forward in a right-to-left one
    const prev = el('button', { class: 'nav prev', title: rtl ? 'Next pages' : 'Previous pages', html: I.left, onclick: () => flip(rtl ? 1 : -1) });
    const next = el('button', { class: 'nav next', title: rtl ? 'Previous pages' : 'Next pages', html: I.right, onclick: () => flip(rtl ? -1 : 1) });
    const tools = drawTools(() => {
      [0, 1].forEach(k => (pageOf(book, R.spread * 2 + k)?.zones || []).forEach(z => delete drawings[`${book.id}:${R.spread * 2 + k}:${z.id}`]));
      show(R.spread);
    });
    const editBtn = el('button', { class: 'btn ghost', title: 'Mark stories, videos and fill areas on the pages', html: I.pen + '<span class="hide-sm">Publisher mode</span>' });
    editBtn.addEventListener('click', () => {
      editMode = !editMode;
      root.classList.toggle('edit', editMode);
      editBtn.classList.toggle('on', editMode);
      stopSpeak(); closeMenu();
      show(R.spread);
      if (editMode) toast('Publisher mode: drag a box on a page to add a section. Click a box to edit it.', 5000);
    });

    const root = el('div', { class: 'reader' },
      el('div', { class: 'rbar' },
        el('a', { class: 'btn ghost', href: `#/series/${seriesOf(book).id}`, html: I.left + '<span>Library</span>' }),
        el('button', { class: 'btn ghost', onclick: () => R.close() }, 'Close book'),
        el('b', {}, book.title),
        el('span', { class: 'grow' }),
        label, editBtn,
        el('button', { class: 'btn ghost hide-sm', onclick: () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.() }, 'Full screen')),
      el('div', { class: 'rstage' }, prev, el('div', { class: 'book-wrap' }, bookEl), next),
      el('div', { class: 'rfoot' }, slider, tools),
      // shown only on a phone held upright
      el('div', { class: 'rotate-hint' },
        el('div', { class: 'rotate-ic' }, '📱'),
        el('b', {}, 'Turn your phone sideways'),
        el('small', {}, 'Phone ko ghuma kar landscape mein parhein'),
        el('button', { class: 'btn primary', onclick: goLandscape }, 'Turn to landscape'),
        el('button', { class: 'btn ghost', onclick: () => root.classList.add('hint-off') }, 'Read upright')));
    app.replaceChildren(root);

    function after() {
      const s = R.spread, a = s * 2 + 1, b = Math.min(a + 1, book.pages.length);
      label.textContent = (a === b ? `Page ${a}` : `Pages ${a}–${b}`) + ` of ${book.pages.length}`;
      slider.value = s;
      (rtl ? next : prev).disabled = s === 0;
      (rtl ? prev : next).disabled = s >= spreads - 1;
      const hasFill = [0, 1].some(k => (pageOf(book, s * 2 + k)?.zones || []).some(z => z.type === 'fill'));
      tools.hidden = !hasFill || editMode;
      // Keep the address in step with the pages, but leave a video deep link alone.
      const h = parseHash();
      if (!(h.video && Math.floor((h.page - 1) / 2) === s)) history.replaceState(null, '', link(book, a));
      // Fetch the neighbouring spreads now so the next page turn has its pictures ready.
      [-2, -1, 2, 3].forEach(k => { const p = pageOf(book, s * 2 + k); if (p?.img) new Image().src = p.img; });
    }

    function show(s) {
      if (R.busy) return;
      stopSpeak(); closeMenu();
      R.spread = clamp(s, 0, spreads - 1);
      left.replaceChildren(renderPage(book, L(R.spread), true));
      right.replaceChildren(renderPage(book, Rt(R.spread), true));
      after();
    }

    // One sheet turns over the spine: its front is the page leaving, its back the page arriving.
    function flip(dir) {
      const s = R.spread, t = s + dir;
      if (R.busy || t < 0 || t >= spreads) return;
      R.busy = true;
      stopSpeak(); closeMenu();
      pageSound();
      // fwd: the right-hand sheet turns over to the left (going on in an English book, back in an Urdu one)
      const fwd = (dir > 0) !== rtl;
      const sheet = el('div', { class: 'flipper ' + (fwd ? 'fwd' : 'back') },
        el('div', { class: 'ff' }, renderPage(book, fwd ? Rt(s) : L(s), false)),
        el('div', { class: 'ff rev' }, renderPage(book, fwd ? L(t) : Rt(t), false)));
      bookEl.append(sheet);
      (fwd ? right : left).replaceChildren(renderPage(book, fwd ? Rt(t) : L(t), true));
      sheet.getBoundingClientRect();
      sheet.classList.add('go');
      setTimeout(() => {
        (fwd ? left : right).replaceChildren(renderPage(book, fwd ? L(t) : Rt(t), true));
        sheet.remove();
        R.spread = t;
        R.busy = false;
        after();
      }, 830);
    }

    // The front cover as a sheet hinged on the spine: cover outside, the current left page inside.
    function coverSheet() {
      const src = book.pages[0]?.img || book.cover;
      const cover = el('div', { class: 'page cover-pg ' + (rtl ? 'left' : 'right'), style: `--c1:${book.c1 || '#34495e'};--c2:${book.c2 || '#1f2d3d'}` },
        src ? el('img', { class: 'page-bg', src, alt: '' }) : coverFace(book));
      return el('div', { class: 'flipper cover-sheet no-anim ' + (rtl ? 'back' : 'fwd') },
        el('div', { class: 'ff' }, cover),
        el('div', { class: 'ff rev' }, renderPage(book, rtl ? Rt(R.spread) : L(R.spread), false)));
    }

    function openBook() {
      R.busy = true;
      const sheet = coverSheet();
      bookEl.classList.add('closed', 'no-anim');
      (rtl ? right : left).style.visibility = 'hidden';
      bookEl.append(sheet);
      sheet.getBoundingClientRect();
      bookEl.classList.remove('no-anim');
      sheet.classList.remove('no-anim');
      setTimeout(() => { bookEl.classList.remove('closed'); sheet.classList.add('go'); pageSound('book-open'); }, 350);
      setTimeout(() => { (rtl ? right : left).style.visibility = ''; sheet.remove(); R.busy = false; }, 1500);
    }

    function closeBook() {
      if (R.busy) return;
      R.busy = true;
      stopSpeak(); closeMenu();
      pageSound('book-open');
      const sheet = coverSheet();
      sheet.classList.add('go');
      bookEl.append(sheet);
      (rtl ? right : left).style.visibility = 'hidden';
      sheet.getBoundingClientRect();
      sheet.classList.remove('no-anim', 'go');
      bookEl.classList.add('closed');
      setTimeout(() => { justClosed = true; location.hash = link(book); }, 1250);
    }

    if (rtl) slider.style.direction = 'rtl';
    R = { book, root, spread: 0, busy: false, rtl, show, flip, close: closeBook };
    show(startSpread);
    if (intro) openBook();
  }

  // Recordings of a real book (CC0, "Book Flip Sounds" by Voltiment555 on OpenGameArt).
  const sounds = {};
  function pageSound(name = 'page-flip') {
    try {
      const a = sounds[name] = sounds[name] || new Audio(`sounds/${name}.wav`);
      a.volume = 0.6;
      a.currentTime = 0;
      a.play().catch(() => {});        // the browser may hold sound back until the first click
    } catch (e) { /* no sound on this browser; the page still turns */ }
  }
  ['page-flip', 'book-open'].forEach(n => { sounds[n] = new Audio(`sounds/${n}.wav`); sounds[n].preload = 'auto'; });

  function drawTools(onClear, only) {
    const colors = only?.length ? only : ['#e63946', '#f4a261', '#4aa3df'];
    if (!colors.includes(brush.color)) brush.color = colors[0];
    const wrap = el('div', { class: 'tools', hidden: true }, el('span', { class: 'tools-lbl' }, 'Colour & write'));
    const sync = () => wrap.querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', !!(
        (b.dataset.c && !brush.erase && b.dataset.c === brush.color) ||
        (b.dataset.s && +b.dataset.s === brush.size) ||
        (b.dataset.e && brush.erase)));
    });
    colors.forEach(c => wrap.append(el('button', { class: 'sw', style: `--c:${c}`, 'data-c': c, title: 'Colour', onclick: () => { brush.color = c; brush.erase = false; sync(); } })));
    wrap.append(el('i', { class: 'sep' }));
    [[6, 6], [12, 11], [26, 18]].forEach(([s, px]) => wrap.append(el('button', { class: 'sz', 'data-s': s, title: 'Brush size', onclick: () => { brush.size = s; sync(); } }, el('i', { style: `--s:${px}px` }))));
    wrap.append(el('i', { class: 'sep' }),
      el('button', { class: 'txt', 'data-e': 1, onclick: () => { brush.erase = !brush.erase; sync(); } }, 'Eraser'),
      el('button', { class: 'txt', onclick: onClear }, 'Clear'));
    sync();
    return wrap;
  }

  /* ---------- section menu: Listen / Video / QR ---------- */
  function closeMenu() {
    if (!menu) return;
    menu.m.remove();
    menu.box.classList.remove('active');
    menu = null;
  }

  function openMenu(book, idx, z, box) {
    closeMenu();
    box.classList.add('active');
    const hasVideo = !!ytId(z.video);
    const m = el('div', { class: 'zmenu' },
      el('b', {}, z.title || 'Section'),
      el('button', { disabled: !z.narration, onclick: () => speak(z.title, z.narration), html: I.speaker + '<span>Listen</span>' }),
      hasVideo && el('button', { onclick: () => playVideo(book, idx, z), html: I.play + '<span>Video</span>' }),
      el('button', { class: 'x', title: 'Close', onclick: closeMenu, html: I.x }));
    document.body.append(m);
    const r = box.getBoundingClientRect(), mr = m.getBoundingClientRect();
    let top = r.top - mr.height - 10;
    if (top < 8) top = Math.min(r.top + 10, innerHeight - mr.height - 8);
    m.style.top = top + 'px';
    m.style.left = clamp(r.left + r.width / 2 - mr.width / 2, 8, innerWidth - mr.width - 8) + 'px';
    menu = { m, box };
  }

  /* ---------- voice ---------- */
  const synth = window.speechSynthesis;
  let speakToken = 0, narrEl = null;
  if (synth) synth.getVoices();              // voices load lazily in Chrome

  function pickVoice(urdu) {
    if (urdu) {
      const ur = synth.getVoices().filter(v => /^ur/i.test(v.lang));
      return ur.find(v => /PK/i.test(v.lang) && /عظمیٰ|Uzma/.test(v.name)) || ur.find(v => /PK/i.test(v.lang)) || ur[0] || null;
    }
    const en = synth.getVoices().filter(v => /^en/i.test(v.lang));
    return ['Google US English', 'Aria', 'Jenny', 'Samantha', 'Zira'].map(n => en.find(v => v.name.includes(n))).find(Boolean) || en[0] || null;
  }

  function stopSpeak() {
    speakToken++;
    if (synth) synth.cancel();
    narrEl?.remove();
    narrEl = null;
  }

  // Read sentence by sentence (long single utterances get cut off in Chrome) and highlight the spoken word.
  function speak(title, text, onDone, captionHost) {
    stopSpeak();
    if (!synth) return toast('This browser cannot read aloud.');
    const sentences = (text || '').match(/[^.!?۔؟]+[.!?۔؟]*\s*/g) || [];
    if (!sentences.length) return;
    const token = speakToken;
    let paused = false;
    const caption = el('div', { class: 'narr-text' });
    const pauseBtn = el('button', { title: 'Pause', html: I.pause });
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      paused ? synth.pause() : synth.resume();
      pauseBtn.innerHTML = paused ? I.play : I.pause;
      pauseBtn.title = paused ? 'Play' : 'Pause';
    });
    if (captionHost) captionHost.replaceChildren(caption);
    else {
      narrEl = el('div', { class: 'narr' },
        el('div', { class: 'narr-ic', html: I.speaker }),
        el('div', { class: 'narr-body' }, el('small', {}, title || 'Listening'), caption),
        pauseBtn,
        el('button', { title: 'Stop', onclick: stopSpeak, html: I.stop }));
      document.body.append(narrEl);
    }

    const say = i => {
      if (token !== speakToken) return;
      if (i >= sentences.length) { stopSpeak(); onDone?.(); return; }
      const s = sentences[i];
      const words = [];
      caption.replaceChildren();
      s.replace(/\S+/g, (w, at) => { const sp = el('span', {}, w); words.push([at, sp]); caption.append(sp, ' '); return w; });
      const u = new SpeechSynthesisUtterance(s);
      const urdu = /[؀-ۿ]/.test(s);
      u.lang = urdu ? 'ur-PK' : 'en-US';
      u.voice = pickVoice(urdu);
      caption.dir = urdu ? 'rtl' : 'ltr';
      u.rate = 0.92;
      u.onboundary = e => {
        if (e.name && e.name !== 'word') return;
        words.forEach(([at, sp], k) => sp.classList.toggle('on', at <= e.charIndex && (k === words.length - 1 || words[k + 1][0] > e.charIndex)));
      };
      u.onend = () => say(i + 1);
      u.onerror = () => { if (token === speakToken) { stopSpeak(); onDone?.(); } };
      synth.speak(u);
    };
    say(0);
  }

  /* ---------- modals: video, QR, zone editor ---------- */
  function closeModal() {
    modalEl?.remove();
    modalEl = null;
  }

  function modal(card, onClose) {
    closeModal();
    const close = () => { closeModal(); onClose?.(); };
    card.prepend(el('button', { class: 'modal-x', title: 'Close', onclick: close, html: I.x }));
    modalEl = el('div', { class: 'modal' }, card);
    modalEl.addEventListener('pointerdown', e => { if (e.target === modalEl) close(); });
    modalEl.close = close;
    document.body.append(modalEl);
  }

  function playVideo(book, idx, z) {
    closeMenu();
    location.hash = link(book, idx + 1, z.id);   // route() opens it, so a scanned QR lands in the same place
  }

  function syncVideo(r) {
    const open = modalEl?.dataset.video;
    if (!r.video) { if (open) closeModal(); return; }
    if (open === r.video) return;
    // 'page' is the video behind the QR code printed on that page; anything else is a zone id.
    let idx = r.page - 1, title = 'Video', vids = [];
    if (r.video === 'page') {
      vids = pageOf(r.book, idx)?.qr?.videos || [];
      title = pageOf(r.book, idx)?.qr?.title || title;
    } else {
      idx = [r.page - 1, r.page - 1 ^ 1].find(i => (pageOf(r.book, i)?.zones || []).some(z => z.id === r.video));
      const z = idx == null ? null : pageOf(r.book, idx).zones.find(z => z.id === r.video);
      if (z && ytId(z.video)) { vids = [{ id: ytId(z.video), title: z.title }]; title = z.title || title; }
    }
    if (!vids.length) return history.replaceState(null, '', link(r.book, r.page));
    stopSpeak();
    // YouTube refuses to play (error 153) unless it is told which site the player sits on.
    // A page opened as a file has no site to tell, so there the video opens on YouTube itself.
    const asFile = location.protocol === 'file:';
    const frame = asFile
      ? el('a', { class: 'yt-out', target: '_blank', rel: 'noopener' }, el('span', { html: I.play }), 'Watch on YouTube')
      : el('iframe', { title, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin' });
    const picks = el('div', { class: 'video-picks' });
    const play = k => {
      if (asFile) {
        frame.href = `https://www.youtube.com/watch?v=${vids[k].id}`;
        frame.style.backgroundImage = `url(https://i.ytimg.com/vi/${vids[k].id}/hqdefault.jpg)`;
      } else frame.src = `https://www.youtube.com/embed/${vids[k].id}?autoplay=1&rel=0&playsinline=1`;
      picks.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === k));
    };
    if (vids.length > 1) vids.forEach((v, k) => {
      // YouTube titles read "Class | Chapter | Introduction": the last part tells the videos apart.
      const part = (v.title || '').split('|').pop().trim();
      picks.append(el('button', { onclick: () => play(k) }, part && part.length <= 30 ? part : `Video ${k + 1}`));
    });
    play(0);
    const card = el('div', { class: 'modal-card video-card' },
      frame,
      el('div', { class: 'video-cap' }, title, picks,
        el('small', {}, asFile
          ? 'Opened as a file, so the video plays on YouTube. Open the site with start.bat to watch it here.'
          : `Press ✕ to go back to page ${idx + 1}`)));
    // Closing puts the address back on the page, so the reader is exactly where they left.
    modal(card, () => history.replaceState(null, '', link(r.book, R ? R.spread * 2 + 1 : r.page)));
    modalEl.dataset.video = r.video;
  }

  function editZone(book, idx, z, isNew) {
    const pg = pageOf(book, idx);
    const radio = (val, text) => el('label', {}, el('input', { type: 'radio', name: 'type', value: val, checked: z.type === val }), text);
    const narration = el('textarea', { name: 'narration', rows: 5, placeholder: 'The English text that will be read aloud for this story or topic.' });
    narration.value = z.narration || '';
    const form = el('form', { class: 'zform' + (z.type === 'fill' ? ' is-fill' : '') },
      el('h3', {}, isNew ? 'New interactive area' : 'Edit area'),
      el('p', { class: 'muted' }, `${book.title} · page ${idx + 1}`),
      el('div', { class: 'seg' }, radio('section', 'Story / topic'), radio('fill', 'Fill / draw area')),
      el('label', {}, 'Title', el('input', { type: 'text', name: 'title', value: z.title || '', placeholder: 'e.g. The Thirsty Crow' })),
      el('label', { class: 'sec-only' }, 'Voice text (English)', narration),
      el('label', { class: 'sec-only' }, 'YouTube video link', el('input', { type: 'text', name: 'video', value: z.video || '', placeholder: 'https://www.youtube.com/watch?v=…' })),
      el('div', { class: 'row' },
        !isNew && el('button', { type: 'button', class: 'btn danger', onclick: () => { pg.zones = pg.zones.filter(x => x !== z); done(); } }, 'Delete'),
        el('span', { class: 'grow' }),
        el('button', { type: 'button', class: 'btn', onclick: () => closeModal() }, 'Cancel'),
        el('button', { type: 'submit', class: 'btn primary' }, 'Save')));
    const done = () => { saveZones(book); closeModal(); R?.show(R.spread); };
    form.addEventListener('change', e => { if (e.target.name === 'type') form.classList.toggle('is-fill', e.target.value === 'fill'); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(form);
      const type = f.get('type'), video = type === 'fill' ? '' : f.get('video').trim();
      if (video && !ytId(video)) return toast('That does not look like a YouTube link.');
      Object.assign(z, { type, title: f.get('title').trim(), video, narration: type === 'fill' ? '' : f.get('narration').trim() });
      if (isNew) (pg.zones ||= []).push(z);
      done();
    });
    modal(el('div', { class: 'modal-card' }, form));
    // A new box on a converted PDF page: offer the text printed inside it as the voice text.
    if (isNew && book.dir) pageText(book).then(pages => {
      const inside = (pages[idx] || []).filter(([x0, y0, x1, y1]) => {
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        return cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h;
      }).map(b => b[4]);
      if (inside.length && !narration.value) narration.value = inside.join(' ');
      if (inside.length && !form.elements.title.value) form.elements.title.value = inside[0].slice(0, 40);
    });
  }

  function pageText(book) {
    if (!book.dir) return Promise.resolve([]);
    return book.text ||= fetch(`${book.dir}/text.json`).then(r => r.ok ? r.json() : []).catch(() => []);
  }

  // Publisher mode: drag an empty part of the page to mark a new area.
  function bindZoneDrawing(node, book, idx) {
    node.addEventListener('pointerdown', e => {
      if (!editMode || e.target.closest('.zone')) return;
      e.preventDefault();
      const r = node.getBoundingClientRect();
      const pt = ev => [clamp((ev.clientX - r.left) / r.width * 100, 0, 100), clamp((ev.clientY - r.top) / r.height * 100, 0, 100)];
      const a = pt(e);
      let rect = null;
      const ghost = el('div', { class: 'zone ghost' });
      node.append(ghost);
      node.setPointerCapture(e.pointerId);
      const move = ev => {
        const b = pt(ev);
        rect = { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) };
        Object.assign(ghost.style, { left: rect.x + '%', top: rect.y + '%', width: rect.w + '%', height: rect.h + '%' });
      };
      const up = () => {
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', up);
        ghost.remove();
        if (!rect || rect.w < 4 || rect.h < 3) return;
        for (const k in rect) rect[k] = Math.round(rect[k] * 10) / 10;
        editZone(book, idx, { id: 'z' + Date.now().toString(36), type: 'section', ...rect, title: '', narration: '', video: '' }, true);
      };
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', up);
    });
  }

  /* ---------- PDF upload ---------- */
  let pdfReady = null;
  function loadPdfJs() {
    return pdfReady ||= new Promise((resolve, reject) => {
      const s = el('script', { src: PDFJS + 'pdf.min.js' });
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; resolve(); };
      s.onerror = () => { pdfReady = null; reject(new Error('Could not load the PDF reader')); };
      document.head.append(s);
    });
  }

  // Pages are rendered only when they are first shown, then cached.
  function pageImage(book, n) {
    return book.imgs[n] ||= (async () => {
      const page = await book.doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(3, 1400 / base.width) });
      const c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      return new Promise(res => c.toBlob(b => res(URL.createObjectURL(b)), 'image/jpeg', 0.9));
    })();
  }

  /* ---------- global wiring ---------- */
  document.addEventListener('pointerdown', e => {
    if (menu && !menu.m.contains(e.target) && !menu.box.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (modalEl) modalEl.close(); else if (storyEl) closeStory(); else if (gameEl) closeGame(); else if (focusEl) closeFocus(); else if (menu) closeMenu(); else stopSpeak(); return; }
    if (!R || modalEl || focusEl || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') R.flip(R.rtl ? -1 : 1);
    if (e.key === 'ArrowLeft') R.flip(R.rtl ? 1 : -1);
  });
  // Opened as a file, YouTube will not play: move over to the local server when it is running.
  if (location.protocol === 'file:') {
    const SERVER = 'http://127.0.0.1:5173/';
    fetch(SERVER + 'index.html', { mode: 'no-cors', cache: 'no-store' })
      .then(() => location.replace(SERVER + location.hash), () => {});
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', () => synth?.cancel());
  route();
})();
