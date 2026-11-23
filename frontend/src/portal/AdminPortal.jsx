import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useMobileLayout, usePortalDrawer } from './usePortalDrawer.js';
import { books } from '../data/books.js';
import { BookCollection } from './BookCollection.jsx';
import { DemoNotice, Logo, Resources, SignOut } from './Shared.jsx';
import { SchoolRegister } from './SchoolRegister.jsx';
import { SchoolCreate, SchoolEdit } from './SchoolEdit.jsx';
import { OrganizationProfile } from './OrganizationProfile.jsx';
import { AdminDashboard } from './AdminDashboard.jsx';
import { AddSeries } from './AddSeries.jsx';
import { CatalogAssignments } from './CatalogAssignments.jsx';
import { useDemo } from './DemoContext.jsx';
const PdfAuthoring = lazy(() => import('../authoring/PdfAuthoring.jsx'));

const links = [
  ['overview', 'Dashboard', '\u25eb'],
  ['schools', 'School Register', '\u2659'],
  ['series', 'Add Series', '+'],
  ['classes', 'Assign Classes', '\u25a6'],
  ['subjects', 'Assign Subjects', '\u2637'],
  ['pdf-activities', 'PDF & Activities', '\u25a7'],
  ['books', 'Series & Books', '\u25a4'],
  ['profile', 'My Profile', '\u25cb']
];

export function AdminPortal({ page = 'overview', segments = [], onBookOpen }) {
  const { allBooks } = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const mobile = useMobileLayout();
  const sidebarRef = useRef(null), closeRef = useRef(null), toggleRef = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  usePortalDrawer({ open: menuOpen, mobile, sidebarRef, closeRef, toggleRef, onClose: closeMenu });
  useEffect(closeMenu, [page, segments.join('/'), closeMenu]);
  const currentPage = page === 'dashboard' ? 'overview' : page === 'users' ? 'schools' : page;
  const selected = links.some(([id]) => id === currentPage) ? currentPage : 'overview';

  return (
    <div className="portal admin-shell">
      <a className="portal-skip" href="#admin-main" onClick={event => {
        event.preventDefault();
        document.getElementById('admin-main').focus();
      }}>Skip to content</a>
      {mobile && menuOpen && <button className="portal-drawer-backdrop" aria-label="Close admin menu" tabIndex={-1} onClick={closeMenu} />}
      <aside id="admin-sidebar" ref={sidebarRef} className={`admin-sidebar admin-navigation-drawer${menuOpen ? ' is-open' : ''}`} inert={mobile && !menuOpen} role={mobile ? 'dialog' : undefined} aria-modal={mobile && menuOpen ? true : undefined} aria-label="Admin menu" onClick={event => { if (event.target.closest('a')) closeMenu(); }}>
        <div className="admin-brand">
          <Logo href="#/admin" />
          <button ref={closeRef} type="button" className="portal-drawer-close" aria-label="Close admin menu" onClick={closeMenu}>×</button>
          <span className="portal-eyebrow">Publisher workspace</span>
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
          <span className="portal-pill">Publisher portal</span>
          <p>Small steps.<br />Wonderful discoveries.</p>
          <a href="#/admin/books">Book collection &#8599;</a>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-mobile-header" inert={mobile && menuOpen}>
          <button ref={toggleRef} type="button" className="portal-menu-toggle" aria-label="Open admin menu" aria-expanded={menuOpen} aria-controls="admin-sidebar" onClick={() => setMenuOpen(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <Logo href="#/admin" />
          <a href="#/admin/profile" className="portal-mobile-account" aria-label="My profile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></svg></a>
        </header>
        <div className="admin-workspace-content" inert={mobile && menuOpen}>
        <div className="portal-topline">
          <span>Javed Publishers <span aria-hidden="true">/</span> {links.find(([id]) => id === selected)[1]}</span>
          <span className="portal-pill">Administrator</span>
        </div>
        <main className="admin-main" id="admin-main" tabIndex="-1" key={selected}>
          {selected === 'overview' && <AdminDashboard />}
          {selected === 'schools' && (segments[0] === 'add' ? <SchoolCreate /> : segments[0] === 'edit' ? <SchoolEdit id={segments[1]} /> : <SchoolRegister />)}
          {selected === 'series' && <AddSeries />}
          {selected === 'classes' && <CatalogAssignments />}
          {selected === 'subjects' && <CatalogAssignments subjects />}
          {selected === 'pdf-activities' && <Suspense fallback={<p role="status">Opening PDF editor...</p>}><PdfAuthoring editOnOpen={segments[0] === 'edit'} /></Suspense>}
          {selected === 'books' && (
            <>
              <div className="portal-page-heading">
                <div><p className="portal-eyebrow">The original collection</p><h1>Series &amp; Books</h1></div>
                <span className="portal-pill">{allBooks.length} books</span>
              </div>
              <p className="portal-muted">Explore the publisher&rsquo;s collection. Book files and activity data stay unchanged.</p>
              <BookCollection books={allBooks} onBookOpen={onBookOpen} dropdownNavigation />
            </>
          )}
          {selected === 'resources' && <Resources />}
          {selected === 'profile' && <OrganizationProfile />}
        </main>
        <DemoNotice />
        </div>
      </div>
    </div>
  );
}
