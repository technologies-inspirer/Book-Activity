import { useEffect, useRef, useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { ResourceOptions } from './ResourceOptions.jsx';

export function DemoNotice() {
  return <div className="demo-notice"><span className="demo-dot" />Javed Publishers <span>Account access is managed by your administrator.</span></div>;
}
export function Logo({ href = '#/' }) {
  return <a className="portal-logo" href={href} aria-label="Javed Publishers home"><img src="assets/logo-white.png" alt="Javed Publishers" /></a>;
}
export function SignOut() {
  const { store } = useDemo();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <><button type="button" className="portal-signout" disabled={busy} onClick={async () => {
    setBusy(true); setError('');
    try { await store.signOut(); location.hash = '#/login'; }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }}>{busy ? 'Signing out...' : 'Sign Out'}</button>{error && <span role="alert">{error}</span>}</>;
}
export function Feedback({ message }) {
  return message ? <p className={`portal-feedback ${message.error ? 'error' : 'success'}`} role={message.error ? 'alert' : 'status'}>{message.text}</p> : null;
}
export function PasswordField({ id, label = 'Password', value, onChange, autoComplete = 'new-password', minLength = 8 }) {
  const [show, setShow] = useState(false);
  return <label className="portal-field" htmlFor={id}>{label}<span className="password-wrap"><input id={id} name={id} type={show ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)} autoComplete={autoComplete} required minLength={minLength} /><button type="button" aria-label={`${show ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={show} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></span></label>;
}
export function EmptyState({ title, children }) {
  return <div className="portal-empty"><span aria-hidden="true">◇</span><h2>{title}</h2><p>{children}</p></div>;
}
export function Resources() {
  return <section className="portal-panel"><p className="portal-eyebrow">Learning materials</p><h1>Resources</h1><ResourceOptions showHeading={false} /></section>;
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog className="portal portal-dialog" ref={ref} aria-labelledby="portal-dialog-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) onClose(); }}><div className="portal-dialog-head"><h2 id="portal-dialog-title">{title}</h2><button type="button" className="portal-secondary" aria-label="Close dialog" onClick={onClose}>✕</button></div>{children}</dialog>;
}
