import { useEffect, useRef, useState } from 'react';
import { BookPreview } from './components/BookPreview.jsx';
import { BookReader } from './components/BookReader.jsx';
import { SeriesPage } from './components/SeriesPage.jsx';
import { books } from './data/books.js';
import { series } from './data/series.js';
import { DemoProvider, useDemo } from './portal/DemoContext.jsx';
import { isExpired } from './portal/demoStore.js';
import { LoginPage } from './portal/LoginPage.jsx';
import { AdminPortal } from './portal/AdminPortal.jsx';
import { UserPortal } from './portal/UserPortal.jsx';
import { DemoNotice, SignOut } from './portal/Shared.jsx';
import { SiteHeader } from './components/SiteHeader.jsx';
import { GlobalLoader } from './loading/LoadingScreen.jsx';
import './portal/portal.css';

export function App() {
  return <DemoProvider><AppRoutes /><GlobalLoader /></DemoProvider>;
}

function AppRoutes() {
  const { account, assignedBooks } = useDemo();
  const [route, setRoute] = useState(readRoute);
  const [introNext, setIntroNext] = useState(false);
  const cameFromReader = useRef(false);
  const lastLibraryRoute = useRef('#/user/library');

  useEffect(() => {
    const updateRoute = () => setRoute(readRoute());
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  useEffect(() => {
    if (route.type === 'user' && route.page === 'library') lastLibraryRoute.current = location.hash;
    if (!account) {
      document.title = 'Sign in — Javed Publishers';
      return;
    }
    if (route.type === 'reader') {
      document.title = `${route.book.title} — Javed Publishers`;
      cameFromReader.current = true;
    } else if (route.type === 'series') {
      document.title = `${route.item.name} — Javed Publishers`;
    } else if (route.type === 'preview') {
      document.title = `${route.book.title} — Javed Publishers`;
    } else {
      document.title = `${route.type === 'login' ? 'Sign in' : route.type === 'admin' ? 'Admin portal' : route.type === 'user' ? 'My Books' : 'Interactive Books'} — Javed Publishers`;
    }
  }, [route, account?.id]);

  if (!account || route.type === 'login') {
    return <LoginPage returnTo={['reader', 'preview', 'series'].includes(route.type) || (route.type === 'user' && route.page === 'library') ? location.hash : null} />;
  }
  if (account && (!account.enabled || isExpired(account))) {
    return <div className="portal"><SiteHeader /><main className="user-main"><section className="portal-panel"><h1>Demo access unavailable</h1><p>This demo account is disabled or its access has expired. Contact the demo administrator.</p><SignOut /></section></main><DemoNotice /></div>;
  }
  if (route.type === 'admin' || route.type === 'user') {
    if (account.role !== (route.type === 'admin' ? 'admin' : 'user')) {
      return <div className="portal"><main className="user-main"><section className="portal-panel"><h1>Choose your demo workspace</h1><p>This page belongs to the other fictional demo role. These UI checks do not provide real security.</p><a className="portal-primary" href={`#/${account.role === 'admin' ? 'admin' : 'user'}`}>Open my workspace</a> <SignOut /></section></main><DemoNotice /></div>;
    }
    return route.type === 'admin'
      ? <AdminPortal page={route.page} onBookOpen={() => setIntroNext(true)} />
      : <UserPortal page={route.page} libraryRoute={route.segments} onBookOpen={() => setIntroNext(true)} />;
  }
  if (account?.role === 'user' && route.book && !assignedBooks.some(book => book.id === route.book.id)) {
    return <div className="portal"><SiteHeader /><main className="user-main"><section className="portal-panel"><h1>This book isn’t in your demo library</h1><p>Ask the demo administrator to assign it. This is only a frontend demonstration of access filtering.</p><a className="portal-primary" href="#/user">Back to My Books</a></section></main><DemoNotice /></div>;
  }

  if (route.type === 'reader') {
    return (
      <BookReader
        key={route.book.id}
        intro={introNext}
        libraryHref={account.role === 'user' ? lastLibraryRoute.current : undefined}
        onIntroConsumed={() => setIntroNext(false)}
      />
    );
  }
  if (route.type === 'series') {
    return <SeriesPage item={route.item} availableBooks={account?.role === 'user' ? assignedBooks : books} onBookOpen={() => setIntroNext(true)} />;
  }
  if (route.type === 'preview') {
    return (
      <BookPreview
        key={route.book.id}
        book={route.book}
        justClosed={cameFromReader.current}
        onBookOpen={() => setIntroNext(true)}
        onClosedAnimationComplete={() => { cameFromReader.current = false; }}
      />
    );
  }
  return account.role === 'user'
    ? <UserPortal onBookOpen={() => setIntroNext(true)} />
    : <AdminPortal onBookOpen={() => setIntroNext(true)} />;
}

function readRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(part => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  if (['login', 'admin', 'user'].includes(parts[0])) return { type: parts[0], page: parts[1] || (parts[0] === 'admin' ? 'overview' : 'books'), segments: parts.slice(2) };
  const book = parts[0] === 'book' ? books.find(item => item.id === parts[1]) : null;
  if (book && parts[2] === 'read') return { type: 'reader', book };

  const item = parts[0] === 'series' ? series.find(value => value.id === parts[1]) : null;
  if (item) return { type: 'series', item };
  if (book) return { type: 'preview', book };
  return { type: 'home' };
}
