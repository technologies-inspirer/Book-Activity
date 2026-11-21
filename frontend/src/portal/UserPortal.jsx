import { useCallback, useRef, useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { UserAccountMenu } from './UserAccountMenu.jsx';
import { ResourceLibrary } from './ResourceLibrary.jsx';
import { DashboardAmbient } from './DashboardAmbient.jsx';
import { ProfilePage } from './ProfilePage.jsx';
import { UserSidebar } from './UserSidebar.jsx';
import { SchoolProfile } from './SchoolProfile.jsx';
import { UserDashboard } from './UserDashboard.jsx';
import { LearningLibrary } from './LearningLibrary.jsx';
import { useMobileLayout, usePortalDrawer } from './usePortalDrawer.js';

export function UserPortal({ page = 'books', libraryRoute = [], onBookOpen }) {
  const { organizationProfile } = useDemo();
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
      {['books', 'library'].includes(selectedPage) && <DashboardAmbient />}
      <header className="portal-topline user-portal-header">
        <div className="user-header-start">
          <button className="user-sidebar-toggle" ref={toggleRef} type="button" aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} aria-expanded={sidebarOpen} aria-controls="user-sidebar" onClick={() => setSidebarOpen(value => !value)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <a className="user-company-logo" href="#/user" aria-label="Javed Publishers home"><img src={organizationProfile.logo || 'assets/logo.png'} alt="Javed Publishers" /></a>
          <span className="user-header-breadcrumb">{pageTitle}</span>
        </div>
        <UserAccountMenu />
      </header>
      <main className={`user-main${['school', 'library'].includes(selectedPage) ? ' user-school-main' : ''}`} key={selectedPage}>
        {selectedPage === 'school' ? <SchoolProfile /> :
          selectedPage === 'resources' ? <ResourceLibrary /> :
          selectedPage === 'profile' ? <ProfilePage /> :
          selectedPage === 'library' ? <LearningLibrary segments={libraryRoute} onBookOpen={onBookOpen} /> :
          <UserDashboard />}

      </main>
      </div>
    </div>
  );
}
