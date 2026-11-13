const books = window.DEMO_BOOKS;

// A page's printed checklist (found by tools/find_checklists.py) as a question to tick, its button by its banner.
function checklist(book, page) {
  const c = window.BOOK_CHECKLISTS?.[book.id]?.[page];
  if (!c) return [];
  const [x, y, w, h] = c.crop, top = y + 5;
  return [{ type: 'question', kind: 'tick', title: book.rtl ? 'چیک لسٹ' : 'Checklist', button: book.rtl ? { x: 60, y: top - 6.2 } : { x: 19, y: top - 5.6 },
    crop: { x, y, w, h }, rows: c.rows, stars: c.stars }];
}

// Add each PDF book once, even if this module runs again (e.g. a dev-server hot reload).
const known = new Set(books.map(book => book.id));
books.unshift(...(window.PDF_BOOKS || []).filter(book => !known.has(book.id)).map(book => ({
  id: book.id,
  title: book.title,
  author: book.author || 'Imported from PDF',
  tag: 'Book',
  c1: book.c1,
  c2: book.c2,
  rtl: !!book.rtl,
  ratio: book.ratio,
  dir: book.dir,
  cover: `${book.dir}/cover.jpg`,
  // page 1 is not the cover (e.g. English 4+ starts with the credits page), so the opening shows cover.jpg
  frontCover: !!book.frontCover,
  pages: Array.from({ length: book.pages }, (_, index) => ({
    img: `${book.dir}/p${String(index + 1).padStart(3, '0')}.jpg`,
    qr: book.qr?.[index + 1],
    // a game's crop moved off half-cut words and pictures, and hand-set boxes, from tools/fit_game_crops.py (books/game-crops.js)
    acts: [].concat(window.BOOK_ACTIVITIES?.[book.id]?.[index + 1] || []).map((act, i) => {
      const fix = window.GAME_FIXES?.[book.id]?.[index + 1]?.[i];
      return fix && act.type === 'game' ? { ...act, ...fix } : act;
    }).concat(window.BOOK_QUESTIONS?.[book.id]?.[index + 1] || [], checklist(book, index + 1)),   // exercise questions (books/questions.js, books/checklists.js)
    zones: window.BOOK_ZONES?.[book.id]?.[index + 1] || []
  }))
})));

for (const book of books) {
  try {
    const saved = JSON.parse(localStorage.getItem(`zk.zones.${book.id}`));
    if (Array.isArray(saved)) {
      saved.forEach((zones, index) => {
        if (book.pages[index]) book.pages[index].zones = zones;
      });
    }
  } catch {
    // Ignore invalid browser data and keep the book's bundled zones.
  }
}

export { books };
