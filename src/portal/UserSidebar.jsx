import { useDemo } from './DemoContext.jsx';
import { Logo, SignOut } from './Shared.jsx';

const items = [
  { page: 'books', href: '#/user', label: 'Dashboard', icon: '◫' },
  { page: 'school', href: '#/user/school', label: 'School Profile', icon: '▤' }
];

export function UserSidebar({ page, onClose, sidebarRef, closeRef, mobile }) {
  const { account } = useDemo();

  return (
    <aside id="user-sidebar" className="admin-sidebar user-sidebar" ref={sidebarRef} role={mobile ? 'dialog' : undefined} aria-modal={mobile ? true : undefined} aria-label="User menu" onClick={event => { if (event.target.closest('a')) onClose(); }}>
      <div className="admin-brand">
        <Logo href="#/user" />
        <button className="user-sidebar-close" type="button" ref={closeRef} aria-label="Close sidebar" onClick={onClose}>✕</button>
        <span className="portal-eyebrow">Reader workspace</span>
      </div>
      <nav id="user-sidebar-navigation" aria-label="User sidebar">
        {items.map(item => (
          <a key={item.page} href={item.href} className={page === item.page ? 'active' : ''} aria-current={page === item.page ? 'page' : undefined}>
            <span aria-hidden="true">{item.icon}</span>{item.label}
          </a>
        ))}
        <SignOut />
      </nav>
      <div className="sidebar-foot">
        <span className="portal-pill">Reader demo</span>
        <p>{account.name}</p>
      </div>
    </aside>
  );
}
