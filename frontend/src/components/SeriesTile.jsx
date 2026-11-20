import { books } from '../data/books.js';

export function SeriesTile({ item, availableBooks = books }) {
  const list = availableBooks.filter(item.of);
  const covers = list.slice(0, 3);

  return (
    <a className="series-tile" href={`#/series/${item.id}`}>
      <div className="series-covers">
        {covers.map((book, index) => (
          <img
            key={book.id}
            src={book.cover}
            alt=""
            style={{ '--k': index, '--n': Math.min(3, list.length) }}
          />
        ))}
      </div>
      <b>{item.name}</b>
      <small>{list.length} book{list.length === 1 ? '' : 's'}</small>
      <span className="tile-go">Open series →</span>
    </a>
  );
}
