import { books } from '../data/books.js';
import { series } from '../data/series.js';
import { SiteHeader } from './SiteHeader.jsx';

function Stat({ value, label }) {
  return <div className="stat"><b>{value.toLocaleString()}</b><span>{label}</span></div>;
}

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

export function BookLibrary() {
  const pages = books.reduce((total, book) => total + book.pages.length, 0);
  const activities = books.reduce(
    (total, book) => total + book.pages.reduce((count, page) => count + page.acts.length, 0),
    0
  );
  const videos = books.reduce(
    (total, book) => total + book.pages.filter(page => page.qr || page.acts.some(activity => activity.type === 'videos' || activity.video)).length,
    0
  );

  return (
    <div className="lib dash">
      <SiteHeader />
      <section className="welcome">
        <div className="welcome-text">
          <span className="eyebrow">Interactive digital books</span>
          <h1>Learning that <em>comes alive</em></h1>
          <p>Every book opens like a real one. Pages read aloud, play videos, teach with animations and games, and let children trace and colour.</p>
        </div>
        <div className="stats">
          <Stat value={books.length} label="Books" />
          <Stat value={pages} label="Pages" />
          <Stat value={activities} label="Activities" />
          <Stat value={videos} label="Pages with videos" />
        </div>
      </section>
      <section className="panel" id="series">
        <div className="panel-head">
          <h2>Our Series</h2>
          <small>Choose a series to see its books</small>
        </div>
        <div className="series-tiles">
          {series.map(item => <SeriesTile key={item.id} item={item} />)}
        </div>
      </section>
      <section className="panel" id="resources">
        <div className="panel-head">
          <h2>Book Resources</h2>
          <small>Teacher guides, worksheets and downloads</small>
        </div>
        <div className="resources-empty">Resources will appear here soon.</div>
      </section>
      <footer className="foot">© {new Date().getFullYear()} Javed Publishers. All rights reserved.</footer>
    </div>
  );
}
