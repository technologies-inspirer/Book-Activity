import { ResponsiveTable } from './ResponsiveTable.jsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDemo } from './DemoContext.jsx';
import { isExpired, SCHOOL_MODULES } from './demoStore.js';
import { Feedback, Modal, PasswordField } from './Shared.jsx';
import { AccessFields } from './AccessFields.jsx';

const schoolName = account => account.schoolProfile?.name || account.name;

function SchoolDialog({ type, account, onClose, onSaved }) {
  const { store } = useDemo();
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState(account?.expiresAt || (account?.expires ? `${account.expires}T23:59` : ''));
  const [prefix, setPrefix] = useState(account?.loginPrefix || '');
  const [principals, setPrincipals] = useState(account?.principals || []);
  const [modules, setModules] = useState(account?.modules || ['Books']);
  const [access, setAccess] = useState({ allBooks: account?.allBooks ?? true, bookIds: account?.bookIds || [], expires: account?.expires || '', expiresAt: account?.expiresAt || '' });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const titles = { password: 'Update Password', expiry: 'Set Expiry Date & Time', features: 'School Features', prefix: 'Login Prefix', principals: 'Principals' };
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      if (type === 'password') await store.resetPassword(account.id, password);
      if (type === 'expiry') await store.updateAccess(account.id, { ...account, expires: expiry.slice(0, 10), expiresAt: expiry });
      if (type === 'prefix') await store.updateSchool(account.id, { loginPrefix: prefix });
      if (type === 'principals') await store.updateSchool(account.id, { principals });
      if (type === 'features') {
        await store.updateSchool(account.id, { modules, access });
      }
      onSaved('School account saved.');
      onClose();
    } catch (error) { setMessage({ error: true, text: error.message }); } finally { setBusy(false); }
  }
  return <Modal title={titles[type]} onClose={onClose}><form onSubmit={save}>
    <Feedback message={message} />
    {type === 'password' && <PasswordField id="school-password" label="Temporary password" value={password} onChange={setPassword} />}
    {type === 'expiry' && <><label className="portal-field">Expiry date and time<input name="schoolExpiry" type="datetime-local" value={expiry} onChange={event => setExpiry(event.target.value)} /></label><p className="portal-muted small">Uses your device's local time. Leave empty for no expiry.</p></>}
    {type === 'prefix' && <><label className="portal-field">Login prefix<input name="loginPrefix" maxLength={30} pattern="[a-zA-Z0-9_-]*" value={prefix} onChange={event => setPrefix(event.target.value)} /></label><p className="portal-muted small">Saved as a school label. Sign in continues to use the school's email username.</p></>}
    {type === 'features' && <><fieldset className="school-module-options"><legend>Modules</legend>{SCHOOL_MODULES.map(module => <label key={module}><input type="checkbox" checked={modules.includes(module)} onChange={event => setModules(event.target.checked ? [...modules, module] : modules.filter(item => item !== module))} />{module}</label>)}</fieldset><p className="portal-muted small">Module labels are recorded for the school. Paper Maker uses the resource link when configured. Book access is controlled below.</p><AccessFields value={access} onChange={setAccess} prefix="school-access" /></>}
    {type === 'principals' && <><p className="portal-muted small">School contact records; these do not create separate sign-in accounts.</p><div className="school-principals">{principals.map((principal, index) => <fieldset key={index}><legend>Principal {index + 1}</legend>{['name', 'email', 'phone'].map(field => <label className="portal-field" key={field}>{field === 'name' ? 'Name' : field === 'email' ? 'Email' : 'Phone'}<input name={`principal-${index}-${field}`} type={field === 'email' ? 'email' : 'text'} required={field === 'name'} value={principal[field]} onChange={event => setPrincipals(principals.map((item, at) => at === index ? { ...item, [field]: event.target.value } : item))} /></label>)}<button type="button" className="portal-secondary" onClick={() => setPrincipals(principals.filter((_, at) => at !== index))}>Remove principal</button></fieldset>)}</div><button type="button" className="portal-secondary" disabled={principals.length >= 50} onClick={() => setPrincipals([...principals, { name: '', email: '', phone: '' }])}>+ Add Principal</button></>}
    <div className="portal-actions"><button type="button" className="portal-secondary" onClick={onClose}>Cancel</button><button className="portal-primary" disabled={busy}>{busy ? 'Saving...' : 'Save Changes'}</button></div>
  </form></Modal>;
}

function SchoolActions({ account, onDialog }) {
  const [position, setPosition] = useState(null);
  const trigger = useRef(null), menu = useRef(null);
  useLayoutEffect(() => {
    if (!position || !menu.current) return;
    const rect = menu.current.getBoundingClientRect();
    const top = Math.max(12, Math.min(position.top, innerHeight - rect.height - 12));
    if (top !== position.top) setPosition({ ...position, top });
  }, [position]);
  useEffect(() => {
    if (!position) return;
    const close = event => { if (!trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) setPosition(null); };
    const key = event => { if (event.key === 'Escape') { setPosition(null); trigger.current?.focus(); } };
    const reset = event => { if (!(event.target instanceof Node) || !menu.current?.contains(event.target)) setPosition(null); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', key);
    window.addEventListener('resize', reset); window.addEventListener('scroll', reset, true);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); window.removeEventListener('resize', reset); window.removeEventListener('scroll', reset, true); };
  }, [position]);
  const actions = [
    ['Edit', () => onDialog('edit')], ['Update Password', () => onDialog('password')],
    ['Activate', () => onDialog('activate'), account.enabled],
    ['Deactivate', () => onDialog('deactivate'), !account.enabled],
    ['Set Expiry Date & Time', () => onDialog('expiry')], ['Features', () => onDialog('features')],
    ['Login Prefix', () => onDialog('prefix')], ['Principals', () => onDialog('principals')],
    [account.isHeadSchool ? 'Remove Head School' : 'Set as Head School', () => onDialog('head')]
  ];
  return <><button ref={trigger} type="button" className="portal-secondary school-actions-trigger" aria-label={`Actions for ${schoolName(account)}`} aria-expanded={!!position} onClick={() => {
    const rect = trigger.current.getBoundingClientRect();
    setPosition(position ? null : { left: Math.max(8, Math.min(rect.left, innerWidth - 224)), top: Math.max(8, Math.min(rect.bottom + 4, innerHeight - 370)) });
  }}>⚙ Actions</button>{position && createPortal(<div ref={menu} className="portal school-action-menu" style={position} aria-label={`School actions for ${schoolName(account)}`}>{actions.map(([label, action, disabled]) => <button key={label} disabled={!!disabled} type="button" onClick={() => { setPosition(null); action(); }}>{label}</button>)}</div>, document.body)}</>;
}

function ImportSchools({ onClose, onSaved }) {
  const { store } = useDemo();
  const [rows, setRows] = useState([]), [message, setMessage] = useState(null), [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function choose(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBusy(true); setRows([]); setMessage(null);
    try { const { readSchoolWorkbook } = await import('./schoolImport.js'); const values = await readSchoolWorkbook(file); if (mounted.current) setRows(values); }
    catch (error) { if (mounted.current) setMessage({ error: true, text: error.message }); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <Modal title="Import Schools from Excel" onClose={onClose}><p className="portal-muted small">Use the template columns: School Name, Address, Username (email), City and Password. Up to 500 schools / 5 MB. Imported schools initially have access to all books.</p><Feedback message={message} /><div className="portal-actions"><button className="portal-secondary" disabled={busy} onClick={async () => { try { const { schoolImportTemplate, downloadSchoolTemplate } = await import('./schoolImport.js'); downloadSchoolTemplate(await schoolImportTemplate()); } catch (error) { if (mounted.current) setMessage({ error: true, text: error.message }); } }}>Download Template</button><label className="portal-field">Excel file<input aria-label="Import schools Excel file" type="file" accept=".xlsx" disabled={busy} onChange={choose} /></label></div>{busy && <p role="status">Reading workbook…</p>}{!!rows.length && <><p>{rows.length} schools ready to import.</p><ul className="school-import-preview">{rows.map((row, index) => <li key={index}><strong>{row.name}</strong><span>{row.email} · {row.schoolProfile.city || 'No city'}</span></li>)}</ul></>}<div className="portal-actions"><button className="portal-secondary" onClick={onClose}>Cancel</button><button className="portal-primary" disabled={busy || !rows.length} onClick={async () => { setBusy(true); try { await store.importSchools(rows); onSaved(`${rows.length} schools imported successfully.`); onClose(); } catch (error) { setMessage({ error: true, text: error.message }); } finally { setBusy(false); } }}>Import Schools</button></div></Modal>;
}

export function SchoolRegister() {
  const { accounts, store } = useDemo();
  const [search, setSearch] = useState(''), [city, setCity] = useState(''), [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1), [size, setSize] = useState(20);
  const [dialog, setDialog] = useState(null), [message, setMessage] = useState(null);
  const [working, setWorking] = useState(false);
  const schools = accounts.filter(item => item.role === 'user');
  const cities = [...new Set(schools.map(item => item.schoolProfile?.city).filter(Boolean))].sort();
  const query = search.trim().toLowerCase();
  const filtered = schools.filter(item => (!city || item.schoolProfile?.city === city) && [schoolName(item), item.schoolProfile?.address, item.email, item.schoolProfile?.city, item.loginPrefix].filter(Boolean).join(' ').toLowerCase().includes(query));
  const pages = Math.max(1, Math.ceil(filtered.length / size)), current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * size, current * size);
  const account = dialog?.id && schools.find(item => item.id === dialog.id);
  const success = text => setMessage({ text });
  async function action(work) { if (working) return; setWorking(true); try { await work(); } catch (error) { setMessage({ error: true, text: error.message }); } finally { setWorking(false); } }
  function open(type, school) {
    if (type === 'edit') { location.hash = `#/admin/schools/edit/${encodeURIComponent(school.id)}`; return; }
    if (['activate', 'deactivate'].includes(type)) return action(async () => { await store.setSchoolsEnabled([school.id], type === 'activate'); success(`School ${type === 'activate' ? 'activated' : 'deactivated'}.`); });
    if (type === 'head') return action(async () => { await store.setHeadSchool(school.id); success(school.isHeadSchool ? 'Head school designation removed.' : `${schoolName(school)} is now the head school.`); });
    setDialog({ type, id: school?.id });
  }
  return <div className="school-register-page" aria-busy={working}>
    <a className="school-back" href="#/admin" aria-label="Back to dashboard">&#8592;</a>
    <div className="portal-page-heading"><div><h1>Schools</h1><p className="portal-muted">Create accounts and manage access to your learning library</p></div><div className="portal-actions"><button className="portal-secondary" onClick={() => setDialog({ type: 'import' })}>Import Excel</button><button className="portal-primary" onClick={() => { location.hash = '#/admin/schools/add'; }}>+ Create Account</button></div></div>
    <div className="account-overview"><div><span>Total accounts</span><strong>{schools.length}</strong></div><div><span>Active access</span><strong>{schools.filter(item => item.enabled && !isExpired(item)).length}</strong></div><div><span>Access paused</span><strong>{schools.filter(item => !item.enabled || isExpired(item)).length}</strong></div></div>
    <Feedback message={message} />
    {working && <p role="status" className="portal-muted">Saving account changes...</p>}
    <div className="school-register-filters"><label className="portal-field"><span className="sr-only">Search schools</span><input aria-label="Search schools" type="search" placeholder="Search school, address, username or city" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label><label className="portal-field"><span className="sr-only">Filter by city</span><select aria-label="Filter schools by city" value={city} onChange={event => { setCity(event.target.value); setPage(1); }}><option value="">All Cities</option>{cities.map(item => <option key={item}>{item}</option>)}</select></label><button className="portal-secondary" onClick={() => { setSearch(''); setCity(''); setPage(1); }}>Clear Filters</button></div>
    {!!selected.length && <div className="school-bulk-actions"><span>{selected.length} selected</span>{[true, false].map(enabled => <button className="portal-secondary" key={String(enabled)} onClick={() => action(async () => { await store.setSchoolsEnabled(selected, enabled); success(`Selected schools ${enabled ? 'activated' : 'deactivated'}.`); setSelected([]); })}>{enabled ? 'Activate' : 'Deactivate'}</button>)}<button className="portal-secondary" onClick={() => setSelected([])}>Clear Selection</button></div>}
    <ResponsiveTable className="school-register-table" label="Schools register table"><table><caption className="sr-only">School accounts, modules, principals, expiry and status</caption><thead><tr><th><input type="checkbox" aria-label="Select all schools on this page" checked={!!shown.length && shown.every(item => selected.includes(item.id))} onChange={event => setSelected(event.target.checked ? [...new Set([...selected, ...shown.map(item => item.id)])] : selected.filter(id => !shown.some(item => item.id === id)))} /></th>{['Actions', 'School Name', 'Address', 'Username', 'City', 'Modules', 'P.Count', 'Expiry', 'Status'].map(label => <th scope="col" key={label} title={label === 'P.Count' ? 'Principal count' : undefined}>{label}</th>)}</tr></thead><tbody>{shown.map(item => <tr key={item.id}><td><input type="checkbox" aria-label={`Select ${schoolName(item)}`} checked={selected.includes(item.id)} onChange={event => setSelected(event.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id))} /></td><td><SchoolActions account={item} onDialog={type => open(type, item)} /></td><td>{schoolName(item)}{item.isHeadSchool && <span className="school-head-label">Head School</span>}</td><td>{item.schoolProfile?.address || '—'}</td><td>{item.email}{item.loginPrefix && <small className="table-email">Prefix: {item.loginPrefix}</small>}</td><td>{item.schoolProfile?.city || '—'}</td><td>{(item.modules || ['Books']).join(', ') || 'None'}</td><td>{item.principals?.length || 0}</td><td>{item.expiresAt ? item.expiresAt.replace('T', ' ') : item.expires || 'No expiry'}</td><td><span className={`status-badge${!item.enabled || isExpired(item) ? ' inactive' : ''}`}>{!item.enabled ? 'Deactivated' : isExpired(item) ? 'Expired' : 'Activated'}</span></td></tr>)}{!shown.length && <tr><td colSpan={10} className="assignment-no-results">No accounts found. Create an account to welcome your first reader.</td></tr>}</tbody></table></ResponsiveTable>
    <div className="assignment-pagination"><div><button className="portal-secondary" disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button><span>Page {current} of {pages}</span><button className="portal-secondary" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button></div><label>Show<select aria-label="Schools per page" value={size} onChange={event => { setSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50].map(value => <option key={value}>{value}</option>)}</select><span>{filtered.length} schools</span></label></div>
    <p className="portal-muted small">Accounts and access changes are saved securely. Share each account’s email and password with its reader.</p>
    {dialog?.type === 'import' && <ImportSchools onClose={() => setDialog(null)} onSaved={success} />}
    {dialog && dialog.type !== 'import' && account && <SchoolDialog key={`${dialog.type}/${dialog.id}`} type={dialog.type} account={account} onClose={() => setDialog(null)} onSaved={success} />}
  </div>;
}
