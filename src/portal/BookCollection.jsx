import { useState } from 'react';
import { Book3D } from '../components/Book3D.jsx';
import { useDemo } from './DemoContext.jsx';
import { EmptyState } from './Shared.jsx';

export function BookTile({ book, onBookOpen }) {
  const { series } = useDemo();
  return (
    <a className="portal-book-card" href={`#/book/${encodeURIComponent(book.id)}/read/1`} onClick={onBookOpen}>
      <div className="portal-cover-stage"><Book3D book={book} /></div>
      <div className="portal-book-caption">
        <span className="portal-eyebrow">{series.find(item => item.of(book))?.name}</span>
        <h3>{book.title}</h3>
        <span className="portal-muted">{book.pages.length} pages</span>
        <span className="book-open-label">Open book <span aria-hidden="true">&#8599;</span></span>
      </div>
    </a>
  );
}

export function BookCollection({ books, onBookOpen, dropdownNavigation = false }) {
  const { series } = useDemo();
  const [filter, setFilter] = useState('all');
  const shown = books.filter(book => filter === 'all' || series.find(item => item.id === filter)?.of(book));

  const choose = event => {
    const value = event.target.value;
    if (value.startsWith('book:')) {
      const book = books.find(item => item.id === value.slice(5));
      if (!book) return;
      onBookOpen?.();
      location.hash = `#/book/${encodeURIComponent(book.id)}/read/1`;
    } else {
      setFilter(value);
    }
  };

  return (
    <section className="portal-book-collection">
      <div className="portal-page-heading">
        <h2>Your bookshelf</h2>
        {dropdownNavigation ? (
          <select className="portal-book-select" aria-label="Browse series or open a book" value={filter} onChange={choose}>
            <option value="all">All books</option>
            <optgroup label="Series">
              {series.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </optgroup>
            <optgroup label="Open a book">
              {books.map(book => <option key={book.id} value={`book:${book.id}`}>{book.title}</option>)}
            </optgroup>
          </select>
        ) : (
          <div className="portal-filters" role="group" aria-label="Filter books by series">
            {[{ id: 'all', name: 'All books' }, ...series].map(item => (
              <button className={filter === item.id ? 'selected' : ''} aria-pressed={filter === item.id} key={item.id} onClick={() => setFilter(item.id)}>{item.name}</button>
            ))}
          </div>
        )}
      </div>
      {shown.length ? (
        <div className="portal-book-grid">
          {shown.map(book => (
            <BookTile key={book.id} book={book} onBookOpen={onBookOpen} />
          ))}
        </div>
      ) : (
        <EmptyState title={books.length ? 'No books in this series' : 'No books assigned'}>
          {books.length ? 'Choose another series to explore your books.' : 'Contact your administrator to add books to your demo library.'}
        </EmptyState>
      )}
    </section>
  );
}
