import { useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { Feedback, PasswordField } from './Shared.jsx';
import { PakistanLocationFields } from './PakistanLocationFields.jsx';
import { SeriesAccessFields } from './SeriesAccessFields.jsx';
import { allowedSeries } from '../data/seriesAccess.js';
import { regionName } from '../data/pakistanLocations.js';
import { validateSchoolForm } from './schoolFormValidation.js';
import { useToast } from './ToastProvider.jsx';

const editExpiry = account => account.expiresAt || (account.expires ? `${account.expires}T23:59` : '');
const initialDetails = account => ({
  name: account.schoolProfile?.name || account.name,
  email: account.email,
  description: account.schoolProfile?.description || '',
  phone: account.schoolProfile?.phone || '',
  address: account.schoolProfile?.address || '',
  country: 'Pakistan',
  state: regionName(account.schoolProfile?.state || ''),
  city: account.schoolProfile?.city || '',
  expiry: editExpiry(account)
});
const emptyPrincipal = () => ({ name: '', email: '', phone: '', username: '' });

function SchoolDetails({ account, creating = false }) {
  const { store, series } = useDemo();
  const notify = useToast();
  const [details, setDetails] = useState(() => initialDetails(account));
  const [principal, setPrincipal] = useState(() => ({ ...emptyPrincipal(), ...account.principals?.[0] }));
  const [allowedSeriesIds, setAllowedSeriesIds] = useState(() => allowedSeries(account, series).map(item => item.id));
  const [message, setMessage] = useState(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const formErrors = validateSchoolForm({ details, principal, password, creating, allowedSeriesIds });
  const errors = Object.fromEntries(Object.entries(formErrors).filter(([key]) => submitted || touched[key]));
  const touch = key => setTouched(current => ({ ...current, [key]: true }));
  const set = (field, value) => setDetails(current => ({ ...current, [field]: value }));
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setSubmitted(true); setMessage(null);
    if (Object.keys(formErrors).length) {
      const missing = Object.values(formErrors);
      notify({ error: true, text: missing.length > 1 ? `${missing[0]} ${missing.length - 1} more fields need attention.` : missing[0] });
      const form = event.currentTarget;
      requestAnimationFrame(() => form.querySelector('input[aria-invalid="true"], select[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    try {
      const { expiry, ...profile } = details;
      const hasPrincipal = Object.values(principal).some(value => value.trim());
      const principals = hasPrincipal ? [principal, ...(account.principals || []).slice(1)] : (account.principals || []).slice(1);
      if (creating) {
        await store.importSchools([{
          name: details.name, email: details.email, schoolProfile: profile, principals, allowedSeriesIds,
          password, allBooks: true, bookIds: [], expires: expiry.slice(0, 10), expiresAt: expiry
        }]);
        setPassword('');
        notify({ text: 'School account created successfully.' });
        location.hash = '#/admin/schools';
        return;
      }
      await store.updateSchool(account.id, {
        name: details.name, email: details.email, schoolProfile: profile, principals, allowedSeriesIds,
        access: { allBooks: true, bookIds: [], expires: expiry === editExpiry(account) ? account.expires : expiry.slice(0, 10), expiresAt: expiry === editExpiry(account) ? account.expiresAt || '' : expiry }
      });
      setMessage({ text: 'School and principal details saved.' });
    } catch (error) { setMessage({ error: true, text: error.message }); } finally { setBusy(false); }
  }
  const field = (name, label, options = {}) => <label className="portal-field" htmlFor={`edit-school-${name}`}>
    {label}<input {...options} id={`edit-school-${name}`} name={`edit-school-${name}`} required={name !== 'expiry'} placeholder={creating && name !== 'expiry' ? label : undefined} value={details[name]} onChange={event => set(name, event.target.value)} onBlur={() => touch(name)} aria-invalid={!!errors[name]} aria-describedby={[options['aria-describedby'], errors[name] ? `edit-school-${name}-error` : ''].filter(Boolean).join(' ') || undefined} />
    {errors[name] && <span className="sr-only" id={`edit-school-${name}-error`}>{errors[name]}</span>}
  </label>;

  return <form className="school-edit-details" onSubmit={save} aria-busy={busy} noValidate>
    <section className="school-edit-section" aria-labelledby="school-edit-title">
      <h1 id="school-edit-title">School</h1>
      <p className="school-edit-hint school-required-note">All fields are required except expiry.</p>
      <div className="school-edit-grid">
        {field('name', 'School Name', { required: true, maxLength: 150 })}
        {field('description', 'Description', { maxLength: 1000 })}
        {field('email', 'Email', { type: 'email', required: true })}
        {field('phone', 'Phone', { type: 'tel', maxLength: 50 })}
        {field('address', 'Address', { maxLength: 1000 })}
        <div>{field('expiry', 'Expiry Date & Time (optional)', { type: 'datetime-local', 'aria-describedby': 'school-edit-expiry-note' })}<p className="school-edit-hint" id="school-edit-expiry-note">Leave empty for no expiry. Access stops after this date and time, using your device's local time.</p></div>
      </div>
      <PakistanLocationFields value={details} onChange={setDetails} errors={errors} onBlurField={touch} />
      <SeriesAccessFields choices={series} value={allowedSeriesIds} onChange={setAllowedSeriesIds} error={errors.allowedSeriesIds} onBlur={() => touch('allowedSeriesIds')} />
    </section>
    <section className="school-edit-section" aria-labelledby="school-edit-principal-title">
      <h2 id="school-edit-principal-title">Principal</h2>
      <div className="school-edit-grid">{[['name', 'Name'], ['email', 'Email'], ['phone', 'Phone Number'], ['username', 'Username']].map(([key, label]) => {
        const fieldKey = `principal-${key}`;
        return <label key={key} className="portal-field" htmlFor={`edit-${fieldKey}`}>{label}
          <input id={`edit-${fieldKey}`} name={`edit-${fieldKey}`} placeholder={creating ? label : undefined} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} maxLength={key === 'phone' ? 50 : 150} required value={principal[key]} onChange={event => setPrincipal({ ...principal, [key]: event.target.value })} onBlur={() => touch(fieldKey)} aria-invalid={!!errors[fieldKey]} aria-describedby={errors[fieldKey] ? `${fieldKey}-error` : undefined} />
          {errors[fieldKey] && <span className="sr-only" id={`${fieldKey}-error`}>{errors[fieldKey]}</span>}
        </label>;
      })}
        {creating && <PasswordField id="create-school-password" label="Password" value={password} onChange={setPassword} error={errors.password} onBlur={() => touch('password')} />}
      </div>
      <p className="school-edit-hint">{creating ? 'Use the school email and this password to sign in. Principal details are contact records. Only the selected book series will be available to this school.' : 'Principal details are contact records. School sign-in uses the school email.'} {account.principals?.length > 1 && `${account.principals.length - 1} additional principal contact(s) are kept; manage them through the Principals action.`}</p>
      <Feedback message={message} />
      <div className="school-edit-actions"><a href="#/admin/schools" className="portal-secondary">Cancel</a><button className="portal-primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Changes'}</button></div>
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

const emptySchool = { name: '', email: '', allBooks: true, bookIds: [], expires: '', schoolProfile: {}, principals: [] };
export function SchoolCreate() {
  return <div className="school-edit-page school-create-page">
    <a className="school-back" href="#/admin/schools" aria-label="Back to School Register">&#8592;</a>
    <SchoolDetails account={emptySchool} creating />
  </div>;
}
