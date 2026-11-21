import { useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { UserAvatar } from './UserAccountMenu.jsx';
import { useToast } from './ToastProvider.jsx';
import { Feedback, PasswordField } from './Shared.jsx';

function ProfilePhoto() {
  const { account, store } = useDemo();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  return <section className="portal-panel user-profile-photo"><UserAvatar account={account} /><div><h2>Profile photo</h2><p>PNG, JPG or WebP, up to 2 MB.</p></div><div className="user-profile-photo-actions"><label className="portal-secondary">{busy ? 'Saving...' : 'Upload Photo'}<input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { notify({ error: true, text: 'Choose a PNG, JPG or WebP image up to 2 MB.' }); return; }
    setBusy(true);
    try {
      const profileImage = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read this image.')); reader.readAsDataURL(file); });
      await store.updateProfile({ profileImage }); notify({ text: 'Profile photo updated.' });
    } catch (error) { notify({ error: true, text: error.message }); } finally { setBusy(false); }
  }} /></label>{account.profileImage && <button className="portal-secondary" type="button" disabled={busy} onClick={async () => {
    setBusy(true); try { await store.updateProfile({ profileImage: '' }); notify({ text: 'Profile photo removed.' }); } catch (error) { notify({ error: true, text: error.message }); } finally { setBusy(false); }
  }}>Remove</button>}</div></section>;
}

export function ProfilePage() {
  const { account, store } = useDemo();
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [profileMessage, setProfileMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);
  return <><div className="portal-page-heading"><div><p className="portal-eyebrow">Your learning identity</p><h1>My Profile</h1></div><span className="portal-pill">{account.role === 'admin' ? 'Administrator' : 'Young reader'}</span></div><ProfilePhoto /><div className="profile-grid"><section className="portal-panel"><h2>Your details</h2><p className="portal-muted">Keep your name and email up to date.</p><form onSubmit={async event => { event.preventDefault(); try { await store.updateProfile({ name, email }); setProfileMessage({ text: 'Your profile has been updated. Use the updated email at your next sign in.' }); } catch (error) { setProfileMessage({ error: true, text: error.message }); } }}><label className="portal-field" htmlFor="profile-name">Full name<input id="profile-name" required value={name} onChange={event => setName(event.target.value)} /></label><label className="portal-field" htmlFor="profile-email">Email<input id="profile-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label><Feedback message={profileMessage} /><button className="portal-primary">Save details</button></form></section>{<section className="portal-panel"><h2>Change password</h2><p className="portal-muted">Choose a new password you will remember.</p><form onSubmit={async event => { event.preventDefault(); try { if (next !== confirm) throw new Error('The new passwords do not match.'); await store.changePassword(current, next); setCurrent(''); setNext(''); setConfirm(''); setPasswordMessage({ text: 'Password changed. Use it at your next sign in.' }); } catch (error) { setPasswordMessage({ error: true, text: error.message }); } }}><PasswordField id="profile-current-password" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" minLength={1} /><PasswordField id="profile-new-password" label="New password" value={next} onChange={setNext} /><PasswordField id="profile-confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm} /><Feedback message={passwordMessage} /><button className="portal-primary">Change password</button></form></section>}</div></>;
}
