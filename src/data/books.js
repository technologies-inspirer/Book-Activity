const books = window.DEMO_BOOKS;

books.unshift(...(window.PDF_BOOKS || []).map(book => ({
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
  pages: Array.from({ length: book.pages }, (_, index) => ({
    img: `${book.dir}/p${String(index + 1).padStart(3, '0')}.jpg`,
    qr: book.qr?.[index + 1],
    acts: [].concat(window.BOOK_ACTIVITIES?.[book.id]?.[index + 1] || []),
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
