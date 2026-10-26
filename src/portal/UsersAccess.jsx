import { useState } from 'react';
import { books } from '../data/books.js';
import { useDemo } from './DemoContext.jsx';
import { isExpired } from './demoStore.js';
import { Feedback, Modal, PasswordField } from './Shared.jsx';

const initialAccess = () => ({ allBooks: true, bookIds: [], expires: '' });
export function AccessFields({ value, onChange, prefix }) {
  const set = patch => onChange({ ...value, ...patch });
  return <div className="access-fields"><fieldset><legend>Book access</legend><div className="access-options"><label><input type="radio" name={`${prefix}-mode`} checked={value.allBooks} onChange={() => set({ allBooks: true })} />All Books</label><label><input type="radio" name={`${prefix}-mode`} checked={!value.allBooks} onChange={() => set({ allBooks: false })} />Selected Books</label></div></fieldset><fieldset className="book-checks" disabled={value.allBooks}><legend>{value.allBooks ? 'All current books are included' : 'Choose books for this user'}</legend>{books.map(book => <label key={book.id}><input type="checkbox" checked={value.allBooks || value.bookIds.includes(book.id)} onChange={event => set({ bookIds: event.target.checked ? [...value.bookIds, book.id] : value.bookIds.filter(id => id !== book.id) })} /><span>{book.title}</span></label>)}</fieldset><label className="portal-field" htmlFor={`${prefix}-expiry`}>Access expiry <span className="portal-optional">(optional, inclusive)</span><input id={`${prefix}-expiry`} type="date" value={value.expires} onChange={event => set({ expires: event.target.value })} /></label><p className="portal-muted small">Leave the date empty for no expiry. Selected Books can be empty.</p></div>;
}

function AccessDialog({ account, onClose, onSaved }) {
  const { store } = useDemo();
  const [value, setValue] = useState({ allBooks: account.allBooks, bookIds: [...account.bookIds], expires: account.expires });
  const [message, setMessage] = useState(null);
  return <Modal title={`Edit access · ${account.name}`} onClose={onClose}><form onSubmit={event => { event.preventDefault(); try { store.updateAccess(account.id, value); onSaved('Book access updated for this demo session.'); onClose(); } catch (error) { setMessage({ error: true, text: error.message }); } }}><AccessFields value={value} onChange={setValue} prefix="edit" /><Feedback message={message} /><div className="portal-actions"><button className="portal-secondary" type="button" onClick={onClose}>Cancel</button><button className="portal-primary">Save access</button></div></form></Modal>;
}
function ResetDialog({ account, onClose, onSaved }) {
  const { store } = useDemo();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  return <Modal title="Reset demo password" onClose={onClose}><p className="portal-muted">Set a new in-memory password for {account.email}. No email will be sent.</p><form onSubmit={event => { event.preventDefault(); try { store.resetPassword(account.id, password); setPassword(''); onSaved('Demo password reset. Use the new password at sign in.'); onClose(); } catch (error) { setMessage({ error: true, text: error.message }); } }}><PasswordField id="reset-password" label="New demo password" value={password} onChange={setPassword} /><Feedback message={message} /><div className="portal-actions"><button className="portal-secondary" type="button" onClick={onClose}>Cancel</button><button className="portal-primary">Reset password</button></div></form></Modal>;
}

export function UsersAccess() {
  const { accounts, store } = useDemo();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [access, setAccess] = useState(initialAccess);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);
  const [dialog, setDialog] = useState(null);
  const users = accounts.filter(account => account.role === 'user' && `${account.name} ${account.email}`.toLowerCase().includes(search.toLowerCase().trim()));
  const success = text => setMessage({ text });
  const create = event => {
    event.preventDefault();
    try {
      store.createUser({ name, email, password, ...access });
      success(`Created ${email.trim()}. Sign out and use the temporary password you entered to try this demo account during the current page session.`);
      setName(''); setEmail(''); setPassword(''); setAccess(initialAccess());
    } catch (error) { setMessage({ error: true, text: error.message }); }
  };
  const generate = () => {
    const random = new Uint32Array(3);
    crypto.getRandomValues(random);
    setPassword(`Demo!${[...random].map(number => number.toString(36)).join('')}`);
    success('Temporary demo password generated. Use Show to read it before creating the user.');
  };
  return <><div className="portal-page-heading"><div><p className="portal-eyebrow">Make room for curiosity</p><h1>Users &amp; Access</h1></div><span className="portal-pill">Local demo accounts</span></div><p className="portal-muted">Create an account and choose its books. Everything here resets on a full refresh.</p><Feedback message={message} /><form className="users-create-grid" onSubmit={create}><section className="portal-panel"><h2>Create User</h2><p className="portal-muted">A new reader, a new adventure.</p><label className="portal-field" htmlFor="create-name">Full name<input id="create-name" autoComplete="off" required value={name} onChange={event => setName(event.target.value)} /></label><label className="portal-field" htmlFor="create-email">Email<input id="create-email" type="email" autoComplete="off" required value={email} onChange={event => setEmail(event.target.value)} /></label><PasswordField id="create-password" label="Temporary password" value={password} onChange={setPassword} /><button type="button" className="portal-secondary" onClick={generate}>Generate Password</button><p className="portal-muted small">At least 8 characters. Passwords stay in memory and are never saved to browser storage.</p><button type="submit" className="portal-primary full">Create User <span aria-hidden="true">＋</span></button></section><section className="portal-panel"><h2>Assign Access</h2><p className="portal-muted">A library that fits their learning.</p><AccessFields value={access} onChange={setAccess} prefix="create" /></section></form><section className="portal-panel users-list"><div className="portal-page-heading"><div><h2>Readers in your demo</h2><p className="portal-muted">Sample data and accounts you create.</p></div><label className="portal-field search-field" htmlFor="user-search">Search users<input id="user-search" type="search" placeholder="Name or email" value={search} onChange={event => setSearch(event.target.value)} /></label></div><div className="portal-table-wrap" tabIndex="0" role="region" aria-label="Users and access table"><table><caption className="sr-only">Local demo users and their assigned book access</caption><thead><tr><th scope="col">Name / email</th><th scope="col">Assigned books</th><th scope="col">Status</th><th scope="col">Expiry</th><th scope="col">Actions</th></tr></thead><tbody>{users.map(account => <tr key={account.id}><td><b>{account.name}</b><span className="table-email">{account.email}</span></td><td>{account.allBooks ? `All Books (${books.length})` : account.bookIds.length ? <ul className="assigned-list">{books.filter(book => account.bookIds.includes(book.id)).map(book => <li key={book.id}>{book.title}</li>)}</ul> : 'No books assigned'}</td><td><span className={`status-badge ${!account.enabled || isExpired(account) ? 'inactive' : ''}`}>{!account.enabled ? 'Disabled' : isExpired(account) ? 'Expired' : 'Active'}</span></td><td>{account.expires || 'No expiry'}</td><td><div className="table-actions"><button className="portal-secondary" onClick={() => setDialog({ type: 'access', account })}>Edit Access</button><button className="portal-secondary" onClick={() => setDialog({ type: 'reset', account })}>Reset Password</button><button className="portal-secondary" onClick={() => { store.toggleEnabled(account.id); success(`${account.name} ${account.enabled ? 'disabled' : 'enabled'} in this demo.`); }}>{account.enabled ? 'Disable' : 'Enable'}</button></div></td></tr>)}</tbody></table></div>{!users.length && <p className="portal-muted">No users match your search.</p>}</section>{dialog?.type === 'access' && <AccessDialog account={dialog.account} onClose={() => setDialog(null)} onSaved={success} />}{dialog?.type === 'reset' && <ResetDialog account={dialog.account} onClose={() => setDialog(null)} onSaved={success} />}</>;
}
