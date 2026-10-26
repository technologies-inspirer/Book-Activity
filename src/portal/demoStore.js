// Fictional prototype accounts. Passwords and sessions never leave this module's memory.
export const DEMO_CREDENTIALS = {
  admin: { email: 'admin@javed.example', password: 'AdminDemo!2026' },
  user: { email: 'reader@javed.example', password: 'ReaderDemo!2026' }
};

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const isExpired = account => !!account.expires && account.expires < localDate();
export const availableBooks = (account, books) => !account || !account.enabled || isExpired(account)
  ? [] : books.filter(book => account.role === 'admin' || account.allBooks || account.bookIds.includes(book.id));

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const validatePassword = value => {
  if (typeof value !== 'string' || value.trim().length < 8) throw new Error('Use a demo password with at least 8 characters.');
};
function identity(input, accounts, exceptId) {
  const name = String(input.name || '').trim();
  const email = normalizeEmail(input.email);
  if (!name) throw new Error('Enter a full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (accounts.some(account => account.id !== exceptId && account.email === email)) throw new Error('A demo account with this email already exists.');
  return { name, email };
}
function access(input, validIds) {
  const expires = input.expires || '';
  if (expires && (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || Number.isNaN(Date.parse(expires)))) throw new Error('Enter a valid expiry date.');
  return { allBooks: !!input.allBooks, bookIds: [...new Set(input.bookIds || [])].filter(id => validIds.includes(id)), expires };
}

export function createDemoStore(bookIds) {
  const listeners = new Set();
  let state = {
    currentId: null,
    accounts: [
      { id: 'demo-admin', name: 'Amina — Demo Admin', email: DEMO_CREDENTIALS.admin.email, role: 'admin', enabled: true, allBooks: true, bookIds: [], expires: '' },
      { id: 'demo-reader', name: 'Sana — Demo Reader', email: DEMO_CREDENTIALS.user.email, role: 'user', enabled: true, allBooks: false, bookIds: bookIds.slice(0, 3), expires: '' },
      { id: 'demo-disabled', name: 'Ali — Sample Account', email: 'ali@javed.example', role: 'user', enabled: false, allBooks: false, bookIds: [], expires: '' }
    ],
    progress: {}
  };
  const passwords = new Map([
    ['demo-admin', DEMO_CREDENTIALS.admin.password], ['demo-reader', DEMO_CREDENTIALS.user.password], ['demo-disabled', 'DisabledDemo!2026']
  ]);
  let nextId = 1;
  const publish = patch => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const requireAdmin = () => {
    if (!state.accounts.some(a => a.id === state.currentId && a.role === 'admin')) throw new Error('Sign in with the fictional admin account to use this demo action.');
  };
  const find = id => {
    const account = state.accounts.find(a => a.id === id);
    if (!account) throw new Error('Demo account not found.');
    return account;
  };
  const replace = (id, patch) => publish({ accounts: state.accounts.map(account => account.id === id ? { ...account, ...patch } : account) });
  return {
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    snapshot: () => state,
    signIn(email, password) {
      const account = state.accounts.find(a => a.email === normalizeEmail(email));
      if (!account || passwords.get(account.id) !== password) throw new Error('Incorrect demo email or password.');
      if (!account.enabled) throw new Error('This demo account is disabled. Contact the demo administrator.');
      if (isExpired(account)) throw new Error('This demo account’s access has expired. Contact the demo administrator.');
      publish({ currentId: account.id });
      return account.role;
    },
    signOut() { publish({ currentId: null }); },
    createUser(input) {
      requireAdmin();
      const details = identity(input, state.accounts);
      validatePassword(input.password);
      const permissions = access(input, bookIds);
      const id = `local-user-${nextId++}`;
      passwords.set(id, input.password);
      publish({ accounts: [...state.accounts, { id, ...details, ...permissions, role: 'user', enabled: true }] });
      return id;
    },
    updateAccess(id, input) { requireAdmin(); find(id); replace(id, access(input, bookIds)); },
    toggleEnabled(id) { requireAdmin(); const account = find(id); if (account.role === 'admin') throw new Error('Use a user account for this demo action.'); replace(id, { enabled: !account.enabled }); },
    resetPassword(id, password) { requireAdmin(); find(id); validatePassword(password); passwords.set(id, password); },
    updateProfile(input) { const account = find(state.currentId); replace(account.id, identity(input, state.accounts, account.id)); },
    changePassword(current, next) {
      const account = find(state.currentId);
      if (passwords.get(account.id) !== current) throw new Error('The current demo password is incorrect.');
      validatePassword(next);
      passwords.set(account.id, next);
    },
    rememberPosition(bookId, page) {
      if (!state.currentId || !bookIds.includes(bookId)) return;
      publish({ progress: { ...state.progress, [state.currentId]: { bookId, page } } });
    }
  };
}
