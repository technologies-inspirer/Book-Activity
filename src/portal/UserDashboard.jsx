import { useDemo } from './DemoContext.jsx';
import { LibraryBookIcon } from './LibraryIcons.jsx';
import { ResourceOptions } from './ResourceOptions.jsx';
import { LearningScenery } from './LearningScenery.jsx';
import { DashboardArtwork } from './DashboardArtwork.jsx';

export function UserDashboard() {
  const { account, assignedBooks, progress } = useDemo();
  const position = progress[account.id];
  const continuedBook = position && assignedBooks.find(book => book.id === position.bookId);

  return (
    <div className="learning-dashboard">
      <LearningScenery />
      <section className="user-welcome">
        <div>
          <p className="portal-eyebrow">Welcome to Javed Publishers!</p>
          <h1>A new day.<br />A new discovery.</h1>
          <p>Choose your class, explore a series and subject, and open your next book.</p>
        </div>
        <DashboardArtwork variant="welcome" />
      </section>
      <a className="learning-entry portal-panel" href="#/user/library">
        <span className="learning-entry-icon"><LibraryBookIcon /></span>
        <span className="learning-entry-copy">
          <span className="portal-eyebrow">Your digital library</span>
          <h2>Explore Books</h2>
          <span className="portal-muted">Select a class, choose your series and subject, then start reading.</span>
          <span className="learning-entry-count">{assignedBooks.length} book{assignedBooks.length === 1 ? '' : 's'} available in your library</span>
        </span>
        <DashboardArtwork variant="library" />
        <span className="learning-entry-go" aria-hidden="true">→</span>
      </a>
      <ResourceOptions classFolders illustrated />
      {continuedBook && (
        <section className="continue-reading portal-panel">
          <img src={continuedBook.cover} alt="" />
          <div>
            <p className="portal-eyebrow">Continue Reading</p>
            <h2>{continuedBook.title}</h2>
            <p className="portal-muted">Page {position.page} of {continuedBook.pages.length} · This session</p>
          </div>
          <a className="portal-primary" href={`#/book/${encodeURIComponent(continuedBook.id)}/read/${position.page}`}>Continue reading →</a>
        </section>
      )}
      <DashboardArtwork variant="landscape" />
    </div>
  );
}
