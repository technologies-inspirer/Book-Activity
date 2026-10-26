import { useState } from 'react';
import { useDemo } from '../portal/DemoContext.jsx';
import { SignOut } from '../portal/Shared.jsx';

export function SiteHeader() {
  const { account } = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollTo = id => event => {
    event.preventDefault();
    if (location.hash.replace(/^#\/?/, '')) location.hash = '#/';
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  return (
    <header className={`topbar ${account?.role === 'user' ? 'portal-user-header' : 'public-header'}`}>
      <a className="logo" href={account?.role === 'user' ? '#/user' : '#/'} title="Javed Publishers">
        <img src="assets/logo-white.png" alt="Javed Publishers" />
      </a>
      {account?.role === 'user' ? <><button className="mobile-menu" type="button" aria-expanded={menuOpen} aria-controls="user-navigation" onClick={() => setMenuOpen(!menuOpen)}>Menu</button><nav id="user-navigation" aria-label="Reader navigation" className={`topnav ${menuOpen ? 'open' : ''}`}><a href="#/user" onClick={() => setMenuOpen(false)}>My Books</a><a href="#/user/resources" onClick={() => setMenuOpen(false)}>Resources</a><a href="#/user/profile" onClick={() => setMenuOpen(false)}>Profile</a><SignOut /></nav></> : <nav className="topnav">
        <a href="#/" onClick={scrollTo('series')}>Series</a>
        <a href="#/" onClick={scrollTo('resources')}>Resources</a>
        {account?.role === 'admin' ? <><a className="public-signin" href="#/admin">Admin portal</a><SignOut /></> : <a className="public-signin" href="#/login">Sign in</a>}
      </nav>}
    </header>
  );
}
