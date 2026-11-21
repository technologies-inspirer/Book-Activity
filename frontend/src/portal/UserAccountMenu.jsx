import { useEffect, useId, useRef, useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { SignOut } from './Shared.jsx';

export function UserAvatar({ account }) {
  return <span className="user-account-avatar">{account.profileImage ? <img src={account.profileImage} alt="" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></svg>}</span>;
}
export function UserAccountMenu() {
  const { account } = useDemo();
  const [open, setOpen] = useState(false);
  const host = useRef(null), trigger = useRef(null), profile = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!host.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    const close = () => setOpen(false);
    window.addEventListener('hashchange', close);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('hashchange', close); };
  }, [open]);
  return <div className="user-account-menu" ref={host} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" className="user-account-trigger" ref={trigger} aria-expanded={open} aria-controls={id} aria-label={`Profile: ${account.email}`} onClick={() => setOpen(value => !value)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); requestAnimationFrame(() => profile.current?.focus()); } }}><UserAvatar account={account} /><span className="user-account-trigger-copy"><strong>Profile</strong><span>{account.email}</span></span><span className="user-account-chevron" aria-hidden="true">⌄</span></button>
    {open && <div className="user-account-dropdown" id={id}><div className="user-account-identity"><UserAvatar account={account} /><strong>{account.name}</strong><span>{account.email}</span><small>School account</small></div><a ref={profile} href="#/user/profile" onClick={() => setOpen(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></svg>My Profile</a><div className="user-account-signout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M9 4H4v16h5 M10 12h12 M18 8l4 4-4 4" /></svg><SignOut /></div></div>}
  </div>;
}
