import { books } from '../data/books.js';
import { useDemo } from './DemoContext.jsx';
import { availableBooks, isExpired } from './demoStore.js';

const paths = {
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  book: 'M12 5v16 M3 3c4-1 6 0 9 2 3-2 5-3 9-2v16c-4-1-6 0-9 2-3-2-5-3-9-2Z',
  access: 'M4 4h16v16H4Z M8 8h8 M8 12h8 M8 16h5',
  series: 'M4 5h16v4H4Z M4 13h7v7H4Z M15 13h5v7h-5Z',
  plus: 'M12 5v14 M5 12h14',
  subject: 'M5 3h14v18H5Z M8 7h8 M8 11h8 M8 15h5',
  assign: 'M8 4H4v16h16v-8 M9 11l4 4L21 5',
  pdf: 'M14 2H5v20h14V7Z M14 2v6h5 M8 13h8 M8 17h5',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5'
};

function DashboardIcon({ name }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function SummaryCard({ icon, count, label, detail, href, warm }) {
  return <a href={href} className={`admin-summary-card${warm ? ' warm' : ''}`}>
    <span className="admin-summary-icon"><DashboardIcon name={icon} /></span>
    <span className="admin-summary-copy"><strong>{count}</strong><span>{label}</span><small>{detail}</small></span>
  </a>;
}

const shortcuts = [
  ['schools', 'School Register', 'users'],
  ['pdf-activities', 'PDF & Activities', 'pdf'],
  ['series', 'Add New Series', 'plus'],
  ['subjects-books', 'Add New Subject', 'subject'],
  ['assign-subject-to-classes', 'Assign Subjects', 'assign']
];

export function AdminDashboard() {
  const { accounts, account } = useDemo();
  const users = accounts.filter(item => item.role === 'user');
  const active = users.filter(item => item.enabled && !isExpired(item)).length;
  const accesses = users.reduce((sum, item) => sum + availableBooks(item, books).length, 0);

  function exportUsers() {
    const cell = value => {
      const text = String(value ?? '');
      return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`;
    };
    const rows = [['School Name', 'Username', 'Status', 'Assigned books'], ...users.map(item => [item.schoolProfile?.name || item.name, item.email, !item.enabled ? 'Disabled' : isExpired(item) ? 'Expired' : 'Active', availableBooks(item, books).length])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'javed-publishers-schools.csv';
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="admin-dashboard">
    <section className="admin-welcome-banner" aria-labelledby="admin-dashboard-title">
      <p>Welcome back, {account.name.split(' ')[0]}.</p>
      <h1 id="admin-dashboard-title">Javed Publishers Admin Portal</h1>
      <span><DashboardIcon name="access" />Publisher workspace <i aria-hidden="true">•</i> Frontend demo</span>
    </section>
    <div className="admin-summary-grid" aria-label="Dashboard overview and shortcuts">
      <SummaryCard icon="users" count={users.length} label="Total Schools" detail={`${active} active ${active === 1 ? 'account' : 'accounts'}`} href="#/admin/schools" />
      <SummaryCard icon="book" count={books.length} label="Total Books" detail="Existing collection" href="#/admin/books" warm />
      <SummaryCard icon="access" count={accesses} label="Assigned Accesses" detail="Per user" href="#/admin/schools" />
      {shortcuts.map(([id, label, icon]) => <a key={id} href={`#/admin/${id}`} className="admin-summary-card admin-shortcut-card"><span className="admin-summary-icon"><DashboardIcon name={icon} /></span><span className="admin-summary-copy"><span>{label}</span><small className="admin-shortcut-status"><span aria-hidden="true">✓</span> Available</small></span></a>)}
    </div>
    <div className="admin-export-row"><button type="button" className="admin-summary-card admin-export-card" onClick={exportUsers}><span className="admin-summary-icon"><DashboardIcon name="download" /></span><span className="admin-summary-copy"><span>Export Data</span><small>Schools (.csv)</small></span><span className="admin-export-arrow" aria-hidden="true">↓</span></button></div>
    <p className="admin-dashboard-note">Sample accounts and this session’s changes. Assigned accesses count each active user’s books separately.</p>
  </div>;
}
