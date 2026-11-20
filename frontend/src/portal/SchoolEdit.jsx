import { useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { Feedback, PasswordField } from './Shared.jsx';
import { SCHOOL_MODULES } from './demoStore.js';

const editExpiry = account => account.expiresAt || (account.expires ? `${account.expires}T23:59` : '');
const initialDetails = account => ({
  name: account.schoolProfile?.name || account.name,
  email: account.email,
  description: account.schoolProfile?.description || '',
  phone: account.schoolProfile?.phone || '',
  address: account.schoolProfile?.address || '',
  country: account.schoolProfile?.country || '',
  state: account.schoolProfile?.state || '',
  city: account.schoolProfile?.city || '',
  expiry: editExpiry(account)
});
const emptyPrincipal = () => ({ name: '', email: '', phone: '', username: '' });

function SchoolDetails({ account, creating = false }) {
  const { store } = useDemo();
  const [details, setDetails] = useState(() => initialDetails(account));
  const [principal, setPrincipal] = useState(() => ({ ...emptyPrincipal(), ...account.principals?.[0] }));
  const [modules, setModules] = useState(account.modules || ['Books']);
  const [message, setMessage] = useState(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field, value) => setDetails(current => ({ ...current, [field]: value }));
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      const { expiry, ...profile } = details;
      const hasPrincipal = Object.values(principal).some(value => value.trim());
      const principals = hasPrincipal ? [principal, ...(account.principals || []).slice(1)] : (account.principals || []).slice(1);
      if (creating) {
        await store.importSchools([{
          name: details.name, email: details.email, schoolProfile: profile, principals, modules,
          password, allBooks: true, bookIds: [], expires: expiry.slice(0, 10), expiresAt: expiry
        }]);
        setPassword('');
        location.hash = '#/admin/schools';
        return;
      }
      await store.updateSchool(account.id, {
        name: details.name, email: details.email, schoolProfile: profile, principals, modules,
        access: { allBooks: account.allBooks, bookIds: account.bookIds, expires: expiry === editExpiry(account) ? account.expires : expiry.slice(0, 10), expiresAt: expiry === editExpiry(account) ? account.expiresAt || '' : expiry }
      });
      setMessage({ text: 'School and principal details saved.' });
    } catch (error) { setMessage({ error: true, text: error.message }); } finally { setBusy(false); }
  }
  const field = (name, label, options = {}) => <label className="portal-field">{label}<input name={`edit-school-${name}`} placeholder={creating && name !== 'expiry' ? label : undefined} value={details[name]} onChange={event => set(name, event.target.value)} {...options} /></label>;
  const principalPresent = Object.values(principal).some(value => value.trim());

  return <form className="school-edit-details" onSubmit={save} aria-busy={busy}>
    <section className="school-edit-section" aria-labelledby="school-edit-title">
      <h1 id="school-edit-title">School</h1>
      <div className="school-edit-grid">
        {field('name', 'School Name', { required: true, maxLength: 150 })}
        {field('description', 'Description', { maxLength: 1000 })}
        {field('email', 'Email', { type: 'email', required: true })}
        {field('phone', 'Phone', { type: 'tel', maxLength: 50 })}
        {field('address', 'Address', { maxLength: 1000 })}
        <div>{field('expiry', 'Expiry Date & Time (optional)', { type: 'datetime-local', 'aria-describedby': 'school-edit-expiry-note' })}<p className="school-edit-hint" id="school-edit-expiry-note">Leave empty for no expiry. Access stops after this date and time, using your device's local time.</p></div>
      </div>
      <div className="school-edit-location">
        {field('country', 'Country', { maxLength: 100 })}
        {field('state', 'State', { maxLength: 100 })}
        {field('city', 'City', { maxLength: 100 })}
      </div>
      <fieldset className="school-edit-modules"><legend>School Modules</legend><div>{SCHOOL_MODULES.map(module => <label className={modules.includes(module) ? 'selected' : ''} key={module}><input type="checkbox" name="edit-school-module" value={module} checked={modules.includes(module)} onChange={event => setModules(event.target.checked ? [...modules, module] : modules.filter(item => item !== module))} />{module}<span aria-hidden="true">{modules.includes(module) ? '✓' : '+'}</span></label>)}</div></fieldset>
    </section>
    <section className="school-edit-section" aria-labelledby="school-edit-principal-title">
      <h2 id="school-edit-principal-title">Principal</h2>
      <div className="school-edit-grid">{[['name', 'Name'], ['email', 'Email'], ['phone', 'Phone Number'], ['username', 'Username']].map(([key, label]) => <label key={key} className="portal-field">{label}<input name={`edit-principal-${key}`} placeholder={creating ? label : undefined} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} maxLength={key === 'phone' ? 50 : 150} required={key === 'name' && principalPresent} value={principal[key]} onChange={event => setPrincipal({ ...principal, [key]: event.target.value })} /></label>)}
        {creating && <PasswordField id="create-school-password" label="Password" value={password} onChange={setPassword} />}
      </div>
      <p className="school-edit-hint">{creating ? 'Use the school email and this password to sign in. Principal details are contact records. All current books are included initially.' : 'Principal details are contact records. School sign-in uses the school email.'} {account.principals?.length > 1 && `${account.principals.length - 1} additional principal contact(s) are kept; manage them through the Principals action.`}</p>
      <Feedback message={message} />
      <div className="school-edit-actions"><a href="#/admin/schools" className="portal-secondary">Cancel</a><button className="portal-primary" type="submit" disabled={busy}>{busy ? 'Saving...' : creating ? 'Save' : 'Update'}</button></div>
    </section>
  </form>;
}

export function SchoolEdit({ id }) {
  const { accounts } = useDemo();
  const account = accounts.find(item => item.id === id && item.role === 'user');
  return <div className="school-edit-page">
    <a className="school-back" href="#/admin/schools" aria-label="Back to School Register">&#8592;</a>
    {account ? <><SchoolDetails key={`details/${id}`} account={account} /></> : <section className="portal-empty"><h1>School not found</h1><p>Return to School Register and select an existing account.</p><a href="#/admin/schools" className="portal-primary">School Register</a></section>}
  </div>;
}

const emptySchool = { name: '', email: '', allBooks: true, bookIds: [], expires: '', schoolProfile: {}, principals: [], modules: ['Books'] };
export function SchoolCreate() {
  return <div className="school-edit-page school-create-page">
    <a className="school-back" href="#/admin/schools" aria-label="Back to School Register">&#8592;</a>
    <SchoolDetails account={emptySchool} creating />
  </div>;
}
