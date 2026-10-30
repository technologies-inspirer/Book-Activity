import { useCallback, useRef, useState } from 'react';
import { DemoNotice, Resources } from './Shared.jsx';
import { ProfilePage } from './ProfilePage.jsx';
import { UserSidebar } from './UserSidebar.jsx';
import { SchoolProfile } from './SchoolProfile.jsx';
import { UserDashboard } from './UserDashboard.jsx';
import { LearningLibrary } from './LearningLibrary.jsx';
import { useMobileLayout, usePortalDrawer } from './usePortalDrawer.js';

export function UserPortal({ page = 'books', libraryRoute = [], onBookOpen }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleRef = useRef(null);
  const sidebarRef = useRef(null), closeRef = useRef(null);
  const mobile = useMobileLayout();
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);
  usePortalDrawer({ open: sidebarOpen, mobile, sidebarRef, closeRef, toggleRef, onClose: closeSidebar });
  const selectedPage = ['resources', 'profile', 'school', 'library'].includes(page) ? page : 'books';
  const pageTitle = { books: 'Dashboard', library: 'Explore Books', school: 'School Profile', resources: 'Resources', profile: 'My Profile' }[selectedPage];
  return (
    <div className={`portal user-shell user-portal-shell${sidebarOpen ? ' sidebar-open' : ''}`}>
      {sidebarOpen && <>{mobile && <button className="portal-drawer-backdrop" type="button" tabIndex="-1" aria-label="Close sidebar" onClick={closeSidebar} />}<UserSidebar page={selectedPage === 'library' ? 'books' : selectedPage} onClose={closeSidebar} sidebarRef={sidebarRef} closeRef={closeRef} mobile={mobile} /></>}
      <div className="user-workspace" inert={mobile && sidebarOpen}>
      <header className="portal-topline user-portal-header">
        <div className="user-header-start">
          <button className="user-sidebar-toggle" ref={toggleRef} type="button" aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} aria-expanded={sidebarOpen} aria-controls="user-sidebar" onClick={() => setSidebarOpen(value => !value)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <span className="user-header-breadcrumb"><span className="header-publisher">Javed Publishers <span aria-hidden="true">/</span> </span>{pageTitle}</span>
        </div>
        <nav aria-label="User account links">
          <a className="portal-textlink" href="#/user/resources" onClick={closeSidebar} aria-label="Resources" aria-current={selectedPage === 'resources' ? 'page' : undefined}><svg className="mobile-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 5h6l2 3h8v12H4Z" /></svg><span className="user-header-link-text">Resources</span></a>
          <a className="portal-textlink" href="#/user/profile" onClick={closeSidebar} aria-label="Profile" aria-current={selectedPage === 'profile' ? 'page' : undefined}><svg className="mobile-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></svg><span className="user-header-link-text">Profile</span></a>
        </nav>
      </header>
      <main className={`user-main${['school', 'library'].includes(selectedPage) ? ' user-school-main' : ''}`} key={selectedPage}>
        {selectedPage === 'school' ? <SchoolProfile /> :
          selectedPage === 'resources' ? <Resources /> :
          selectedPage === 'profile' ? <ProfilePage /> :
          selectedPage === 'library' ? <LearningLibrary segments={libraryRoute} onBookOpen={onBookOpen} /> :
          <UserDashboard />}

      </main>
      <DemoNotice />
      </div>
    </div>
  );
}
