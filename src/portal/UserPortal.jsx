import { SiteHeader } from '../components/SiteHeader.jsx';
import { SeriesTile } from '../components/BookLibrary.jsx';
import { useDemo } from './DemoContext.jsx';
import { series } from '../data/series.js';
import { BookCollection } from './BookCollection.jsx';
import { DemoNotice, Resources } from './Shared.jsx';
import { ProfilePage } from './ProfilePage.jsx';

export function UserPortal({ page = 'books', onBookOpen }) {
  const { account, assignedBooks, progress } = useDemo();
  const position = progress[account.id];
  const continuedBook = position && assignedBooks.find(book => book.id === position.bookId);
  return (
    <div className="portal user-shell">
      <SiteHeader />
      <main className="user-main" key={page}>
        {page === 'resources' ? <Resources /> : page === 'profile' ? <ProfilePage /> : (
          <>
            <section className="user-welcome">
              <div>
                <p className="portal-eyebrow">Your next discovery awaits</p>
                <h1>Welcome, {account.name}.</h1>
                <p>There&rsquo;s a whole world between these pages.<br />Pick a book and let your curiosity lead the way.</p>
              </div>
              <span className="welcome-monogram" aria-hidden="true">
                {account.name.charAt(0).toUpperCase()}<span>&#10022;</span>
              </span>
            </section>
            {continuedBook && (
              <section className="continue-reading portal-panel">
                <img src={continuedBook.cover} alt="" />
                <div>
                  <p className="portal-eyebrow">Continue Reading</p>
                  <h2>{continuedBook.title}</h2>
                  <p className="portal-muted">Page {position.page} of {continuedBook.pages.length} &middot; This session</p>
                </div>
                <a className="portal-primary" href={`#/book/${encodeURIComponent(continuedBook.id)}/read/${position.page}`}>
                  Pick up where you left off &rarr;
                </a>
              </section>
            )}
            {assignedBooks.length > 0 && (
              <section className="portal-series-section" aria-label="Your series">
                <h2>Your series</h2>
                <div className="series-tiles">
                  {series.filter(item => assignedBooks.some(item.of)).map(item => (
                    <SeriesTile key={item.id} item={item} availableBooks={assignedBooks} />
                  ))}
                </div>
              </section>
            )}
            <BookCollection books={assignedBooks} onBookOpen={onBookOpen} />
          </>
        )}
      </main>
      <DemoNotice />
    </div>
  );
}
