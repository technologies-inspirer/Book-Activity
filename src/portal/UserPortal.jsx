import { useCallback, useRef, useState } from 'react';
import { DemoNotice, Resources } from './Shared.jsx';
import { ProfilePage } from './ProfilePage.jsx';
import { UserSidebar } from './UserSidebar.jsx';
import { SchoolProfile } from './SchoolProfile.jsx';
import { UserDashboard } from './UserDashboard.jsx';
import { LearningLibrary } from './LearningLibrary.jsx';

export function UserPortal({ page = 'books', libraryRoute = [], onBookOpen }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleRef = useRef(null);
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    toggleRef.current?.focus();
  }, []);
  const selectedPage = ['resources', 'profile', 'school', 'library'].includes(page) ? page : 'books';
  const pageTitle = { books: 'Dashboard', library: 'Explore Books', school: 'School Profile', resources: 'Resources', profile: 'My Profile' }[selectedPage];
  return (
    <div className={`portal user-shell user-portal-shell${sidebarOpen ? ' sidebar-open' : ''}`}>
      {sidebarOpen && <><button className="user-sidebar-backdrop" type="button" tabIndex="-1" aria-label="Close sidebar" onClick={closeSidebar} /><UserSidebar page={selectedPage === 'library' ? 'books' : selectedPage} onClose={closeSidebar} /></>}
      <div className="user-workspace">
      <header className="portal-topline user-portal-header">
        <div className="user-header-start">
          <button className="user-sidebar-toggle" ref={toggleRef} type="button" aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} aria-expanded={sidebarOpen} aria-controls="user-sidebar" onClick={() => setSidebarOpen(value => !value)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <span>Javed Publishers <span aria-hidden="true">/</span> {pageTitle}</span>
        </div>
        <nav aria-label="User account links">
          <a className="portal-textlink" href="#/user/resources" onClick={closeSidebar} aria-current={selectedPage === 'resources' ? 'page' : undefined}>Resources</a>
          <a className="portal-textlink" href="#/user/profile" onClick={closeSidebar} aria-current={selectedPage === 'profile' ? 'page' : undefined}>Profile</a>
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
