import { useEffect, useRef, useState } from 'react';
import { books } from '../data/books.js';
import { Book3D } from './Book3D.jsx';
import { SiteHeader } from './SiteHeader.jsx';
import { useDemo } from '../portal/DemoContext.jsx';

function BookCard({ book, onBookOpen }) {
  return (
    <a className="card" href={`#/book/${encodeURIComponent(book.id)}/read/1`} onClick={onBookOpen}>
      <div className="card-book"><Book3D book={book} /></div>
      <div className="card-cap">
        <b>{book.title}</b>
        <small>{book.pages.length} pages</small>
      </div>
    </a>
  );
}

export function SeriesPage({ item, onBookOpen, availableBooks = books }) {
  const { account } = useDemo();
  const shelfRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const seriesBooks = availableBooks.filter(item.of);

  useEffect(() => {
    const shelf = shelfRef.current;
    if (!shelf) return undefined;

    const sync = () => {
      setCanGoBack(shelf.scrollLeft >= 4);
      setCanGoForward(shelf.scrollLeft + shelf.clientWidth <= shelf.scrollWidth - 4);
    };
    shelf.addEventListener('scroll', sync);
    const observer = new ResizeObserver(sync);
    observer.observe(shelf);
    shelf.querySelectorAll('img').forEach(image => image.addEventListener('load', sync));
    const frame = requestAnimationFrame(sync);

    return () => {
      shelf.removeEventListener('scroll', sync);
      observer.disconnect();
      shelf.querySelectorAll('img').forEach(image => image.removeEventListener('load', sync));
      cancelAnimationFrame(frame);
    };
  }, [item.id]);

  const step = direction => {
    const shelf = shelfRef.current;
    if (shelf) shelf.scrollBy({ left: direction * shelf.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="lib dash series-page">
      <SiteHeader />
      <a className="btn ghost back-home" href={account?.role === 'admin' ? '#/admin/books' : '#/user'}>
        <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span>{account?.role === 'admin' ? 'Series & Books' : 'My Books'}</span>
      </a>
      <h1 className="series-title">{item.name}</h1>
      <div className="row-wrap">
        <button className="row-nav prev" title="Scroll left" disabled={!canGoBack} onClick={() => step(-1)}>
          <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="shelf row big" ref={shelfRef}>
          {seriesBooks.map(book => <BookCard key={book.id} book={book} onBookOpen={onBookOpen} />)}
        </div>
        <button className="row-nav next" title="Scroll right" disabled={!canGoForward} onClick={() => step(1)}>
          <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}
