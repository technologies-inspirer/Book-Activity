import { lazy, Suspense, useState } from 'react';
import { books } from '../data/books.js';
import { useDemo } from './DemoContext.jsx';
import { availableBooks, isExpired } from './demoStore.js';
import { BookCollection } from './BookCollection.jsx';
import { DemoNotice, Logo, Resources, SignOut } from './Shared.jsx';
import { UsersAccess } from './UsersAccess.jsx';
import { ProfilePage } from './ProfilePage.jsx';
import { DashboardBanner } from './DashboardBanner.jsx';
import { AddSeries } from './AddSeries.jsx';
import { AddSubject } from './AddSubject.jsx';
import { AssignSubjects } from './AssignSubjects.jsx';
import { LoadingScreen } from '../loading/LoadingScreen.jsx';
const PdfAuthoring = lazy(() => import('../authoring/PdfAuthoring.jsx'));

const existingLinks = [['overview', 'Dashboard', '◫'], ['users', 'Users & Access', '♙'], ['books', 'Series & Books', '▤'], ['pdf-activities', 'PDF & Activities', '▤'], ['resources', 'Resources', '◇'], ['profile', 'My Profile', '○']];
const placeholderLinks = [
  ['series', 'Add New Series', '▤'],
  ['subjects-books', 'Add New Subject', '▤'],
  ['assign-subject-to-classes', 'Assign Subject to Classes', '▧'],
  ['smart-board-data', 'Smart Board Data', '□'],
  ['tutorial-management', 'Tutorial Management', '▷'],
  ['settings', 'Settings', '⚙'],
  ['resource-materials', 'Resource Materials', '◇'],
  ['course-tutorials', 'Course Tutorials', '▷'],
  ['data-clone', 'Data Clone', '▣']
];
const linksById = new Map([...existingLinks, ...placeholderLinks].map(link => [link[0], link]));
const links = [
  'overview',
  'users',
  'books',
  'series',
  'subjects-books',
  'assign-subject-to-classes',
  'pdf-activities',
  'resource-materials',
  'profile'
].map(id => linksById.get(id));

function Overview() {
  const { accounts, account } = useDemo();
  const users = accounts.filter(value => value.role === 'user');
  const counts = [[users.length, 'Demo users'], [users.filter(user => user.enabled && !isExpired(user)).length, 'Active accounts'], [users.reduce((sum, user) => sum + availableBooks(user, books).length, 0), 'Assigned book accesses']];
  return <><div className="portal-page-heading"><div><p className="portal-eyebrow">A place for every reader</p><h1>Welcome back, {account.name.split(' ')[0]}.</h1></div><span className="portal-pill">Admin demo</span></div><p className="portal-muted">A small view of a world of learning. Manage your readers and their books from here.</p><div className="portal-stats">{counts.map(([number, label]) => <section className="portal-panel" key={label}><span>{label}</span><strong>{number}</strong><small>Sample data + local demo changes</small></section>)}</div><DashboardBanner /><p className="portal-muted small">Counts represent sample accounts and this session’s edits. Assigned book accesses count each active user’s assignments separately.</p></>;
}
export function AdminPortal({ page = 'overview', onBookOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentPage = page === 'dashboard' ? 'overview' : page;
  const selected = links.some(([id]) => id === currentPage) ? currentPage : 'overview';
  const isPlaceholder = !['series', 'subjects-books', 'assign-subject-to-classes'].includes(selected) && placeholderLinks.some(([id]) => id === selected);

  return (
    <div className="portal admin-shell">
      <a className="portal-skip" href="#admin-main" onClick={event => {
        event.preventDefault();
        document.getElementById('admin-main').focus();
      }}>Skip to content</a>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Logo />
          <span className="portal-eyebrow">Publisher workspace</span>
          <button className="portal-secondary mobile-menu" aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
        </div>
        <nav id="admin-navigation" aria-label="Admin navigation" className={menuOpen ? 'open' : ''}>
          {links.map(([id, label, icon]) => (
            <a href={`#/admin/${id}`} key={id} className={selected === id ? 'active' : ''} aria-current={selected === id ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
              <span aria-hidden="true">{icon}</span>{label}
            </a>
          ))}
          <SignOut />
        </nav>
        <div className="sidebar-foot">
          <span className="portal-pill">Frontend prototype</span>
          <p>Small steps.<br />Wonderful discoveries.</p>
          <a href="#/admin/books">Book collection &#8599;</a>
        </div>
      </aside>
      <div className="admin-workspace">
        <div className="portal-topline">
          {isPlaceholder ? <span>Javed Publisher</span> : (
            <>
              <span>Javed Publishers <span aria-hidden="true">/</span> {links.find(([id]) => id === selected)[1]}</span>
              <span className="portal-pill">Sample workspace</span>
            </>
          )}
        </div>
        <main className="admin-main" id="admin-main" tabIndex="-1" key={selected}>
          {selected === 'overview' && <Overview />}
          {selected === 'users' && <UsersAccess />}
          {selected === 'series' && <AddSeries />}
          {selected === 'subjects-books' && <AddSubject />}
          {selected === 'assign-subject-to-classes' && <AssignSubjects />}
          {selected === 'pdf-activities' && <Suspense fallback={<LoadingScreen label="Opening PDF editor..." />}><PdfAuthoring /></Suspense>}
          {selected === 'books' && (
            <>
              <div className="portal-page-heading">
                <div><p className="portal-eyebrow">The original collection</p><h1>Series &amp; Books</h1></div>
                <span className="portal-pill">{books.length} existing books</span>
              </div>
              <p className="portal-muted">Explore the publisher&rsquo;s collection. Book files and activity data stay unchanged.</p>
              <BookCollection books={books} onBookOpen={onBookOpen} dropdownNavigation />
            </>
          )}
          {selected === 'resources' && <Resources />}
          {selected === 'profile' && <ProfilePage />}
        </main>
        {!isPlaceholder && <DemoNotice />}
      </div>
    </div>
  );
}
