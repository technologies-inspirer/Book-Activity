// Fictional prototype accounts. Passwords and sessions never leave this module's memory.
export const DEMO_CREDENTIALS = {
  admin: { email: 'admin@javed.example', password: 'AdminDemo!2026' },
  user: { email: 'reader@javed.example', password: 'ReaderDemo!2026' }
};

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const isExpired = account => account.expiresAt ? Date.parse(account.expiresAt) < Date.now() : !!account.expires && account.expires < localDate();
export const availableBooks = (account, books) => !account || !account.enabled || isExpired(account)
  ? [] : books.filter(book => (account.role === 'admin' || account.allBooks || account.bookIds.includes(book.id)) && schoolAllowsSelection(account, learningBookMetadata[book.id] || {}));

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const validatePassword = value => {
  if (typeof value !== 'string' || value.trim().length < 8) throw new Error('Use a demo password with at least 8 characters.');
};
function identity(input, accounts, exceptId) {
  const name = String(input.name || '').trim();
  const email = normalizeEmail(input.email);
  if (!name) throw new Error('Enter a full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (accounts.some(account => (exceptId === undefined || account.id !== exceptId) && account.email === email)) throw new Error('A demo account with this email already exists.');
  return { name, email };
}
function access(input, validIds) {
  const expires = input.expires || '';
  if (expires && (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || Number.isNaN(Date.parse(expires)))) throw new Error('Enter a valid expiry date.');
  const expiresAt = input.expiresAt || '';
  if (expiresAt && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(expiresAt) || Number.isNaN(Date.parse(expiresAt)))) throw new Error('Enter a valid expiry date and time.');
  return { allBooks: !!input.allBooks, bookIds: [...new Set(input.bookIds || [])].filter(id => validIds.includes(id)), expires, expiresAt };
}

export const SCHOOL_MODULES = ['Books', 'Resources', 'Paper Maker'];
function schoolDetails(input, previous = {}) {
  const profile = { ...previous.schoolProfile, ...input.schoolProfile };
  const schoolProfile = { ...profile, name: String(profile.name || input.name || previous.name || '').trim(), address: String(profile.address || '').trim(), city: String(profile.city || '').trim() };
  if (!schoolProfile.name || schoolProfile.name.length > 150 || schoolProfile.address.length > 1000 || schoolProfile.city.length > 100) throw new Error('Enter a valid school name, address and city.');
  for (const [key, limit] of [['description', 1000], ['phone', 50], ['country', 100], ['state', 100]]) {
    schoolProfile[key] = String(profile[key] || '').trim();
    if (schoolProfile[key].length > limit) throw new Error(`School ${key} is too long.`);
  }
  const modules = input.modules ?? previous.modules ?? ['Books'];
  if (!Array.isArray(modules) || modules.some(item => !SCHOOL_MODULES.includes(item))) throw new Error('Choose valid school modules.');
  const loginPrefix = String(input.loginPrefix ?? previous.loginPrefix ?? '').trim();
  if (loginPrefix && !/^[a-zA-Z0-9_-]{1,30}$/.test(loginPrefix)) throw new Error('Login prefix can contain up to 30 letters, numbers, underscores or hyphens.');
  const principals = input.principals ?? previous.principals ?? [];
  if (!Array.isArray(principals) || principals.length > 50) throw new Error('A school can have up to 50 principals.');
  const checkedPrincipals = principals.map(item => {
    const principal = { name: String(item.name || '').trim(), email: String(item.email || '').trim(), phone: String(item.phone || '').trim(), username: String(item.username || '').trim() };
    if (!principal.name || principal.name.length > 150 || principal.phone.length > 50 || principal.username.length > 150 || (principal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(principal.email))) throw new Error('Enter a valid principal name and email.');
    return principal;
  });
  return { schoolProfile, modules: [...new Set(modules)], loginPrefix, principals: checkedPrincipals };
}

import { series as originalSeries } from '../data/series.js';
import { learningClasses, learningSubjects, learningBookMetadata, getSubjectAssignments, schoolAllowsSelection } from '../data/learningCatalog.js';

export const SERIES_STORAGE_KEY = 'book-activity.custom-series.v1';
export const SUBJECT_STORAGE_KEY = 'book-activity.custom-subjects.v1';
export const ASSIGNMENT_STORAGE_KEY = 'book-activity.subject-assignments.v1';

export function createDemoStore(bookIds, seriesStorage = null) {
  const listeners = new Set();
  let customSeries = [];
  try {
    const saved = JSON.parse(seriesStorage?.getItem(SERIES_STORAGE_KEY) || '[]');
    const names = new Set(originalSeries.map(item => item.name.toLowerCase()));
    const ids = new Set(originalSeries.map(item => item.id));
    if (Array.isArray(saved)) customSeries = saved.filter(item => {
      if (!item || typeof item.id !== 'string' || !/^custom-[a-z0-9-]+$/.test(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100 || ids.has(item.id) || names.has(item.name.trim().toLowerCase())) return false;
      ids.add(item.id); names.add(item.name.trim().toLowerCase()); return true;
    }).map(item => ({ id: item.id, name: item.name.trim(), description: typeof item.description === 'string' ? item.description.slice(0, 500) : '' }));
  } catch { /* Invalid or unavailable browser storage starts with the original collection. */ }
  const validSubject = (item, seriesList) => item && typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 100 && learningClasses.some(c => c.id === item.classId) && seriesList.some(s => s.id === item.seriesId);
  const originalSubjectExists = item => learningSubjects.some(subject => subject.name.toLowerCase() === item.name.trim().toLowerCase() && Object.values(learningBookMetadata).some(meta => meta.subjectId === subject.id && meta.classId === item.classId && meta.seriesId === item.seriesId));
  let customSubjects = [];
  try {
    const saved = JSON.parse(seriesStorage?.getItem(SUBJECT_STORAGE_KEY) || '[]');
    const ids = new Set(); const names = new Set();
    if (Array.isArray(saved)) customSubjects = saved.filter(item => {
      if (!validSubject(item, [...originalSeries, ...customSeries]) || typeof item.id !== 'string' || !/^subject-[a-z0-9-]+$/.test(item.id) || ids.has(item.id) || originalSubjectExists(item)) return false;
      const key = JSON.stringify([item.classId, item.seriesId, item.name.trim().toLowerCase()]);
      if (names.has(key)) return false;
      ids.add(item.id); names.add(key); return true;
    }).map(({ id, name, classId, seriesId }) => ({ id, name: name.trim(), classId, seriesId }));
  } catch { /* Ignore invalid saved subjects without affecting books or series. */ }
  let subjectAssignments = [];
  try {
    const saved = JSON.parse(seriesStorage?.getItem(ASSIGNMENT_STORAGE_KEY) || '[]');
    const rows = getSubjectAssignments(customSubjects);
    const keys = new Set();
    if (Array.isArray(saved)) subjectAssignments = saved.filter(item => {
      if (!item || !rows.some(row => row.subjectId === item.subjectId && row.seriesId === item.seriesId) || !Array.isArray(item.classIds) || !item.classIds.every(id => learningClasses.some(c => c.id === id))) return false;
      const key = JSON.stringify([item.seriesId, item.subjectId]);
      if (keys.has(key)) return false;
      keys.add(key); return true;
    }).map(({ seriesId, subjectId, classIds }) => ({ seriesId, subjectId, classIds: [...new Set(classIds)] }));
  } catch { /* Invalid stored assignments leave the default class selections intact. */ }
  let state = {
    organizationProfile: { name: 'Javed Publishers', description: 'Publishing company', email: '', address: '', country: '', state: '', city: '', logo: 'assets/logo.png', letterHead: 'assets/logo.png' },
    customSeries,
    customSubjects,
    subjectAssignments,
    currentId: null,
    accounts: [
      { id: 'demo-admin', name: 'Amina — Demo Admin', email: DEMO_CREDENTIALS.admin.email, role: 'admin', enabled: true, allBooks: true, bookIds: [], expires: '' },
      { id: 'demo-reader', name: 'Sana — Demo Reader', email: DEMO_CREDENTIALS.user.email, role: 'user', enabled: true, allBooks: true, bookIds: [], expires: '' },
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
    createSeries(input) {
      requireAdmin();
      const name = String(input.name || '').trim();
      const description = String(input.description || '').trim();
      if (!name || name.length > 100) throw new Error('Enter a series name between 1 and 100 characters.');
      if (description.length > 500) throw new Error('Keep the description within 500 characters.');
      if ([...originalSeries, ...state.customSeries].some(item => item.name.toLowerCase() === name.toLowerCase())) throw new Error('A series with this name already exists.');
      const item = { id: `custom-${globalThis.crypto.randomUUID()}`, name, description };
      const updated = [...state.customSeries, item];
      if (seriesStorage) {
        try { seriesStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(updated)); }
        catch { throw new Error('Cannot save the series. Allow browser storage and try again.'); }
      }
      publish({ customSeries: updated });
      return item;
    },
    createSubject(input) {
      requireAdmin();
      const item = { id: `subject-${globalThis.crypto.randomUUID()}`, name: String(input.name || '').trim(), classId: input.classId, seriesId: input.seriesId };
      if (!item.name || item.name.length > 100) throw new Error('Enter a subject name between 1 and 100 characters.');
      if (!validSubject(item, [...originalSeries, ...state.customSeries])) throw new Error('Choose a valid class and series.');
      if (originalSubjectExists(item) || state.customSubjects.some(subject => subject.classId === item.classId && subject.seriesId === item.seriesId && subject.name.toLowerCase() === item.name.toLowerCase())) throw new Error('This subject already exists in the selected class and series.');
      const updated = [...state.customSubjects, item];
      if (seriesStorage) {
        try { seriesStorage.setItem(SUBJECT_STORAGE_KEY, JSON.stringify(updated)); }
        catch { throw new Error('Cannot save the subject. Allow browser storage and try again.'); }
      }
      publish({ customSubjects: updated });
      return item;
    },
    assignSubjectClasses({ seriesId, subjectId, classIds }) {
      requireAdmin();
      if (!getSubjectAssignments(state.customSubjects).some(row => row.seriesId === seriesId && row.subjectId === subjectId)) throw new Error('Choose a valid series and subject.');
      if (!Array.isArray(classIds) || !classIds.every(id => learningClasses.some(c => c.id === id))) throw new Error('Choose valid classes.');
      const assignment = { seriesId, subjectId, classIds: [...new Set(classIds)] };
      const updated = [...state.subjectAssignments.filter(item => item.seriesId !== seriesId || item.subjectId !== subjectId), assignment];
      if (seriesStorage) {
        try { seriesStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(updated)); }
        catch { throw new Error('Cannot save assignments. Allow browser storage and try again.'); }
      }
      publish({ subjectAssignments: updated });
    },
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
    importSchools(inputs) {
      requireAdmin();
      if (!Array.isArray(inputs) || !inputs.length || inputs.length > 500) throw new Error('Import between 1 and 500 schools.');
      const pending = [];
      for (const input of inputs) {
        const details = identity(input, [...state.accounts, ...pending]);
        validatePassword(input.password);
        const permissions = access(input, bookIds);
        pending.push({ ...details, ...permissions, ...schoolDetails(input), role: 'user', enabled: true });
      }
      const added = pending.map((item, index) => ({ ...item, id: `local-user-${nextId + index}` }));
      added.forEach((item, index) => passwords.set(item.id, inputs[index].password));
      nextId += added.length;
      publish({ accounts: [...state.accounts, ...added] });
      return added.map(item => item.id);
    },
    updateSchool(id, input) {
      requireAdmin();
      const account = find(id);
      if (account.role !== 'user') throw new Error('Choose a school account.');
      const details = identity({ name: input.name ?? account.name, email: input.email ?? account.email }, state.accounts, id);
      const metadata = schoolDetails(input, account);
      const permissions = input.access ? access(input.access, bookIds) : {};
      replace(id, { ...details, ...metadata, ...permissions });
    },
    setSchoolsEnabled(ids, enabled) {
      requireAdmin();
      if (!ids.length || ids.some(id => find(id).role !== 'user')) throw new Error('Choose school accounts.');
      publish({ accounts: state.accounts.map(item => ids.includes(item.id) ? { ...item, enabled: !!enabled } : item) });
    },
    updateSchoolAssignments(id, selections) {
      requireAdmin();
      if (find(id).role !== 'user') throw new Error('Choose a school account.');
      if (!Array.isArray(selections) || selections.length > learningClasses.length) throw new Error('Choose valid school classes.');
      const rows = getSubjectAssignments(state.customSubjects, state.subjectAssignments);
      const classes = new Set();
      const schoolAssignments = selections.map(selection => {
        if (!learningClasses.some(item => item.id === selection.classId) || classes.has(selection.classId) || !Array.isArray(selection.subjects)) throw new Error('Choose valid school classes.');
        classes.add(selection.classId);
        const subjects = new Set();
        return { classId: selection.classId, subjects: selection.subjects.map(subject => {
          const key = `${subject.seriesId}/${subject.subjectId}`;
          if (subjects.has(key) || !rows.some(row => row.seriesId === subject.seriesId && row.subjectId === subject.subjectId && row.classIds.includes(selection.classId))) throw new Error('Choose subjects assigned to this class.');
          subjects.add(key);
          return { seriesId: subject.seriesId, subjectId: subject.subjectId };
        }) };
      });
      replace(id, { schoolAssignments });
    },
    setHeadSchool(id) {
      requireAdmin();
      const account = find(id);
      if (account.role !== 'user') throw new Error('Choose a school account.');
      const isHeadSchool = !account.isHeadSchool;
      publish({ accounts: state.accounts.map(item => ({ ...item, isHeadSchool: item.id === id && isHeadSchool })) });
    },
    updateAccess(id, input) { requireAdmin(); find(id); replace(id, access(input, bookIds)); },
    toggleEnabled(id) { requireAdmin(); const account = find(id); if (account.role === 'admin') throw new Error('Use a user account for this demo action.'); replace(id, { enabled: !account.enabled }); },
    resetPassword(id, password) { requireAdmin(); find(id); validatePassword(password); passwords.set(id, password); },
    updateProfile(input) { const account = find(state.currentId); replace(account.id, identity(input, state.accounts, account.id)); },
    updateOrganizationProfile(input) {
      requireAdmin();
      const values = { ...state.organizationProfile, ...input };
      const fields = Object.fromEntries(['name', 'description', 'email', 'address', 'country', 'state', 'city'].map(key => [key, String(values[key] || '').trim()]));
      if (!fields.name || fields.name.length > 150) throw new Error('Enter an organization name of up to 150 characters.');
      if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw new Error('Enter a valid organization email.');
      if (['description', 'address'].some(key => fields[key].length > 1000) || ['country', 'state', 'city'].some(key => fields[key].length > 100)) throw new Error('Organization details are too long.');
      publish({ organizationProfile: { ...state.organizationProfile, ...fields } });
    },
    updateOrganizationImage(kind, image) {
      requireAdmin();
      if (!['logo', 'letterHead'].includes(kind)) throw new Error('Choose Logo or Letter Head.');
      if (typeof image !== 'string' || (image && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image))) throw new Error('Choose a valid PNG, JPG or WebP image.');
      if (image.length > 2800000) throw new Error('Choose an image smaller than 2 MB.');
      publish({ organizationProfile: { ...state.organizationProfile, [kind]: image } });
    },
    updateSchoolProfile(input) {
      const account = find(state.currentId);
      if (account.role !== 'user') throw new Error('Sign in as a demo reader to edit a school profile.');
      const values = { ...account.schoolProfile, ...input };
      const schoolProfile = Object.fromEntries(['name', 'description', 'email', 'address', 'country', 'state', 'city', 'contactPerson', 'phone'].map(key => [key, String(values[key] || '').trim()]));
      if (!schoolProfile.name) throw new Error('Enter the school name.');
      if (schoolProfile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(schoolProfile.email)) throw new Error('Enter a valid school email address.');
      replace(account.id, { schoolProfile });
    },
    updateSchoolLogo(logo) {
      const account = find(state.currentId);
      if (account.role !== 'user') throw new Error('Sign in as a demo reader to update a school logo.');
      if (typeof logo !== 'string' || (logo && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo))) throw new Error('Choose a valid PNG, JPG or WebP logo.');
      if (logo.length > 2800000) throw new Error('Choose a logo smaller than 2 MB.');
      replace(account.id, { schoolLogo: logo });
    },
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
