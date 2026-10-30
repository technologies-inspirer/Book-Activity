import { useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { Feedback, PasswordField } from './Shared.jsx';
import { SCHOOL_MODULES } from './demoStore.js';
import { getSubjectAssignments, learningClasses } from '../data/learningCatalog.js';

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
const subjectKey = subject => `${subject.seriesId}/${subject.subjectId}`;

function SchoolDetails({ account, creating = false }) {
  const { store } = useDemo();
  const [details, setDetails] = useState(() => initialDetails(account));
  const [principal, setPrincipal] = useState(() => ({ ...emptyPrincipal(), ...account.principals?.[0] }));
  const [modules, setModules] = useState(account.modules || ['Books']);
  const [message, setMessage] = useState(null);
  const [password, setPassword] = useState('');
  const set = (field, value) => setDetails(current => ({ ...current, [field]: value }));
  function save(event) {
    event.preventDefault();
    try {
      const { expiry, ...profile } = details;
      const hasPrincipal = Object.values(principal).some(value => value.trim());
      const principals = hasPrincipal ? [principal, ...(account.principals || []).slice(1)] : (account.principals || []).slice(1);
      if (creating) {
        store.importSchools([{
          name: details.name, email: details.email, schoolProfile: profile, principals, modules,
          password, allBooks: true, bookIds: [], expires: expiry.slice(0, 10), expiresAt: expiry
        }]);
        setPassword('');
        location.hash = '#/admin/schools';
        return;
      }
      store.updateSchool(account.id, {
        name: details.name, email: details.email, schoolProfile: profile, principals, modules,
        access: { allBooks: account.allBooks, bookIds: account.bookIds, expires: expiry === editExpiry(account) ? account.expires : expiry.slice(0, 10), expiresAt: expiry === editExpiry(account) ? account.expiresAt || '' : expiry }
      });
      setMessage({ text: 'School and principal details updated for this session.' });
    } catch (error) { setMessage({ error: true, text: error.message }); }
  }
  const field = (name, label, options = {}) => <label className="portal-field">{label}<input name={`edit-school-${name}`} placeholder={creating && name !== 'expiry' ? label : undefined} value={details[name]} onChange={event => set(name, event.target.value)} {...options} /></label>;
  const principalPresent = Object.values(principal).some(value => value.trim());

  return <form className="school-edit-details" onSubmit={save}>
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
      <p className="school-edit-hint">{creating ? 'Use the school email and this password to sign in. Principal details are contact records. All current books are included initially; class and subject selections can be changed through Edit.' : 'Principal details are contact records. School sign-in uses the school email.'} {account.principals?.length > 1 && `${account.principals.length - 1} additional principal contact(s) are kept; manage them through the Principals action.`}</p>
      <Feedback message={message} />
      <div className="school-edit-actions"><a href="#/admin/schools" className="portal-secondary">Cancel</a><button className="portal-primary" type="submit">{creating ? 'Save' : 'Update'}</button></div>
    </section>
  </form>;
}

function schoolClassDraft(account, rows) {
  return learningClasses.map(item => {
    const saved = account.schoolAssignments?.find(row => row.classId === item.id);
    const choices = rows.filter(row => row.classIds.includes(item.id));
    return { classId: item.id, selected: !Array.isArray(account.schoolAssignments) || !!saved, keys: saved ? saved.subjects.map(subjectKey) : !Array.isArray(account.schoolAssignments) ? choices.map(subjectKey) : [] };
  });
}

function SchoolClasses({ account }) {
  const { store, series, customSubjects, subjectAssignments } = useDemo();
  const rows = getSubjectAssignments(customSubjects, subjectAssignments);
  const [draft, setDraft] = useState(() => schoolClassDraft(account, rows));
  const [message, setMessage] = useState(null);
  const names = new Map(series.map(item => [item.id, item.name]));
  const patch = (classId, values) => setDraft(current => current.map(row => row.classId === classId ? { ...row, ...values } : row));
  function save(event) {
    event.preventDefault();
    try {
      store.updateSchoolAssignments(account.id, draft.filter(row => row.selected).map(row => ({
        classId: row.classId,
        subjects: rows.filter(subject => subject.classIds.includes(row.classId) && row.keys.includes(subjectKey(subject))).map(({ seriesId, subjectId }) => ({ seriesId, subjectId }))
      })));
      setMessage({ text: 'Classes and subjects updated. This school’s library now uses these selections.' });
    } catch (error) { setMessage({ error: true, text: error.message }); }
  }
  return <form className="school-edit-section school-edit-classes" onSubmit={save}>
    <h2>Classes</h2>
    <div className="school-edit-class-table" role="region" aria-label="School classes and subjects" tabIndex="0"><table><thead><tr><th scope="col">Class</th><th scope="col">Subjects</th><th scope="col"><span className="sr-only">Remove class</span></th></tr></thead><tbody>{draft.map(row => {
      const item = learningClasses.find(item => item.id === row.classId);
      const choices = rows.filter(subject => subject.classIds.includes(row.classId));
      return <tr key={row.classId}><th scope="row"><label><input type="checkbox" aria-label={`Enable ${item.name}`} checked={row.selected} onChange={event => patch(row.classId, { selected: event.target.checked, keys: event.target.checked && !row.keys.length ? choices.map(subjectKey) : row.keys })} />{item.name}</label></th><td><div className="school-edit-subjects">{choices.map(subject => {
        const key = subjectKey(subject), selected = row.selected && row.keys.includes(key);
        return <label key={key} className={selected ? 'selected' : ''}><input type="checkbox" aria-label={`${subject.name}, ${names.get(subject.seriesId)}, ${item.name}`} checked={selected} disabled={!row.selected} onChange={event => patch(row.classId, { keys: event.target.checked ? [...row.keys, key] : row.keys.filter(value => value !== key) })} /><span><bdi>{subject.name}</bdi> (Javed Publishers, {names.get(subject.seriesId) || subject.seriesId})</span></label>;
      })}{!choices.length && <span className="school-edit-hint">No subjects assigned to this class yet.</span>}</div></td><td><button type="button" className="school-edit-remove" disabled={!row.selected && !row.keys.length} aria-label={`Remove ${item.name}`} title={`Remove ${item.name}`} onClick={() => patch(row.classId, { selected: false, keys: [] })}>×</button></td></tr>;
    })}</tbody></table></div>
    <p className="school-edit-hint">Choose this school’s classes and subjects. Only existing assigned books are included; selections do not create or copy books. Module labels do not add new software.</p>
    <Feedback message={message} />
    <div className="school-edit-actions"><button type="button" className="portal-secondary" onClick={() => { setDraft(schoolClassDraft(account, rows)); setMessage({ text: 'Unsaved class selections cancelled.' }); }}>Cancel</button><button className="portal-primary">Update</button></div>
  </form>;
}

export function SchoolEdit({ id }) {
  const { accounts } = useDemo();
  const account = accounts.find(item => item.id === id && item.role === 'user');
  return <div className="school-edit-page">
    <a className="school-back" href="#/admin/schools" aria-label="Back to School Register">&#8592;</a>
    {account ? <><SchoolDetails key={`details/${id}`} account={account} /><SchoolClasses key={`classes/${id}`} account={account} /></> : <section className="portal-empty"><h1>School not found</h1><p>This school may belong to an earlier demo session. Return to School Register and select an existing school.</p><a href="#/admin/schools" className="portal-primary">School Register</a></section>}
  </div>;
}

const emptySchool = { name: '', email: '', allBooks: true, bookIds: [], expires: '', schoolProfile: {}, principals: [], modules: ['Books'] };
export function SchoolCreate() {
  return <div className="school-edit-page school-create-page">
    <a className="school-back" href="#/admin/schools" aria-label="Back to School Register">&#8592;</a>
    <SchoolDetails account={emptySchool} creating />
  </div>;
}
