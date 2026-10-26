import { useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { Feedback, PasswordField } from './Shared.jsx';

export function ProfilePage() {
  const { account, store } = useDemo();
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [profileMessage, setProfileMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);
  return <><div className="portal-page-heading"><div><p className="portal-eyebrow">Your learning identity</p><h1>My Profile</h1></div><span className="portal-pill">{account.role === 'admin' ? 'Sample administrator' : 'Demo reader'}</span></div><div className="profile-grid"><section className="portal-panel"><h2>Your details</h2><p className="portal-muted">Edits apply only to this demo session.</p><form onSubmit={event => { event.preventDefault(); try { store.updateProfile({ name, email }); setProfileMessage({ text: 'Your demo profile has been updated. Use the updated email at your next demo sign in.' }); } catch (error) { setProfileMessage({ error: true, text: error.message }); } }}><label className="portal-field" htmlFor="profile-name">Full name<input id="profile-name" required value={name} onChange={event => setName(event.target.value)} /></label><label className="portal-field" htmlFor="profile-email">Email<input id="profile-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label><Feedback message={profileMessage} /><button className="portal-primary">Save details</button></form></section>{account.role === 'user' && <section className="portal-panel"><h2>Change demo password</h2><p className="portal-muted">Use a fictional password. This is an in-memory change only.</p><form onSubmit={event => { event.preventDefault(); try { if (next !== confirm) throw new Error('The new passwords do not match.'); store.changePassword(current, next); setCurrent(''); setNext(''); setConfirm(''); setPasswordMessage({ text: 'Demo password changed. Use it at your next sign in during this page session.' }); } catch (error) { setPasswordMessage({ error: true, text: error.message }); } }}><PasswordField id="profile-current-password" label="Current demo password" value={current} onChange={setCurrent} autoComplete="current-password" minLength={1} /><PasswordField id="profile-new-password" label="New demo password" value={next} onChange={setNext} /><PasswordField id="profile-confirm-password" label="Confirm new demo password" value={confirm} onChange={setConfirm} /><Feedback message={passwordMessage} /><button className="portal-primary">Change password</button></form></section>}</div></>;
}
