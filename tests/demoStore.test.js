import test from 'node:test';
import assert from 'node:assert/strict';
import { availableBooks, createDemoStore, DEMO_CREDENTIALS, localDate } from '../src/portal/demoStore.js';

const books = ['book-one', 'book-two', 'book-three', 'book-four'].map(id => ({ id }));
const fresh = () => createDemoStore(books.map(book => book.id));
const loginAdmin = store => store.signIn(DEMO_CREDENTIALS.admin.email, DEMO_CREDENTIALS.admin.password);
const newUser = (overrides = {}) => ({ name: 'Fictional Learner', email: 'learner@example.test', password: 'Temporary!2026', allBooks: false, bookIds: ['book-two'], expires: '', ...overrides });

test('organization profile and image changes are admin-only, independent and session-scoped', () => {
  const store = fresh();
  assert.throws(() => store.updateOrganizationProfile({ name: 'Example Publisher' }), /fictional admin/);
  loginAdmin(store);
  const originalAccounts = JSON.stringify(store.snapshot().accounts);
  store.updateOrganizationProfile({ name: 'Example Publisher', description: 'Demo publisher', email: 'publisher@example.test', address: 'Example Road', country: 'Pakistan', state: 'Punjab', city: 'Lahore' });
  assert.equal(store.snapshot().organizationProfile.city, 'Lahore');
  assert.equal(JSON.stringify(store.snapshot().accounts), originalAccounts, 'Organization contact changes do not change login credentials or schools');
  const before = JSON.stringify(store.snapshot().organizationProfile);
  assert.throws(() => store.updateOrganizationProfile({ name: ' ' }), /organization name/);
  assert.throws(() => store.updateOrganizationProfile({ email: 'invalid' }), /email/);
  assert.equal(JSON.stringify(store.snapshot().organizationProfile), before);
  const image = 'data:image/png;base64,aGVsbG8=';
  store.updateOrganizationImage('logo', image);
  store.updateOrganizationImage('letterHead', image);
  store.updateOrganizationImage('logo', '');
  assert.equal(store.snapshot().organizationProfile.logo, '');
  assert.equal(store.snapshot().organizationProfile.letterHead, image);
  store.updateOrganizationProfile({ name: 'Updated Publisher', logo: 'javascript:bad' });
  assert.equal(store.snapshot().organizationProfile.logo, '', 'Text form cannot overwrite image fields');
  assert.throws(() => store.updateOrganizationImage('other', image), /Logo or Letter Head/);
  assert.throws(() => store.updateOrganizationImage('logo', 'data:image/svg+xml;base64,aGVsbG8='), /valid PNG/);
  assert.throws(() => store.updateOrganizationImage('logo', 'data:image/png;base64,' + 'A'.repeat(2800000)), /2 MB/);
  store.signOut();store.signIn(DEMO_CREDENTIALS.user.email, DEMO_CREDENTIALS.user.password);
  assert.throws(() => store.updateOrganizationImage('logo', image), /fictional admin/);
  assert.throws(() => store.updateOrganizationProfile({ name: 'Other' }), /fictional admin/);
  assert.equal(fresh().snapshot().organizationProfile.name, 'Javed Publishers');
});

test('school class selections restrict only that school and retain independent book permissions', () => {
  const realBooks = ['new-stemford-english-3', 'stemford-maths-3', 'stemford-english-1'].map(id => ({ id }));
  const store = createDemoStore(realBooks.map(book => book.id)); loginAdmin(store);
  const [id, other] = store.importSchools([newUser({ allBooks: true }), newUser({ email: 'another@example.test', allBooks: true })]);
  const school = () => store.snapshot().accounts.find(item => item.id === id);
  assert.equal(availableBooks(school(), realBooks).length, 3, 'Existing schools retain their library until selections are saved');
  const assignments = [{ classId: 'play-group', subjects: [{ seriesId: 'stemford', subjectId: 'maths' }] }];
  store.updateSchoolAssignments(id, assignments);
  assert.deepEqual(availableBooks(school(), realBooks), [realBooks[1]]);
  assert.equal(availableBooks(store.snapshot().accounts.find(item => item.id === other), realBooks).length, 3);
  assert.throws(() => store.updateSchoolAssignments(id, [{ classId: 'class-8', subjects: [{ seriesId: 'stemford', subjectId: 'maths' }] }]), /subjects/);
  assert.throws(() => store.updateSchoolAssignments(id, [...assignments, ...assignments]), /classes/);
  assert.deepEqual(school().schoolAssignments, assignments, 'Invalid selections do not partially save');
  store.updateAccess(id, { allBooks: false, bookIds: [realBooks[0].id] });
  assert.equal(availableBooks(school(), realBooks).length, 0, 'Class selection cannot grant an unassigned book');
  store.updateSchoolAssignments(id, []);
  assert.deepEqual(availableBooks(school(), realBooks), []);
  assert.throws(() => store.updateSchoolAssignments('demo-admin', []), /school/);
  store.signOut();store.signIn('learner@example.test', 'Temporary!2026');
  assert.throws(() => store.updateSchoolAssignments(other, []), /fictional admin/);
});

test('school editing saves full details atomically and preserves other principals and credentials', () => {
  const store = fresh(); loginAdmin(store);
  const [id] = store.importSchools([newUser({ principals: [{ name: 'Principal One', username: 'first' }, { name: 'Principal Two', username: 'second' }] })]);
  const school = () => store.snapshot().accounts.find(item => item.id === id);
  store.updateSchool(id, { schoolProfile: { name: 'Example School', description: 'School description', phone: '0000', country: 'Pakistan', state: 'Punjab', city: 'Lahore' }, principals: [{ ...school().principals[0], name: 'Updated Principal' }, school().principals[1]], modules: ['Books', 'Resources'], access: { allBooks: true, expiresAt: '2099-01-01T12:00' } });
  assert.equal(school().schoolProfile.description, 'School description');
  assert.equal(school().schoolProfile.country, 'Pakistan');
  assert.equal(school().principals[1].username, 'second');
  const previous = JSON.stringify(school());
  assert.throws(() => store.updateSchool(id, { schoolProfile: { city: 'Karachi' }, principals: [{ name: '', email: 'bad' }] }), /principal/);
  assert.equal(JSON.stringify(school()), previous);
  store.signOut(); assert.equal(store.signIn('learner@example.test', 'Temporary!2026'), 'user');
});

test('school imports are atomic, retain existing accounts and support reader sign in', () => {
  const store = fresh();
  const school = newUser({ name: 'Example School', schoolProfile: { name: 'Example School', address: 'Demo Road', city: 'Lahore' } });
  assert.throws(() => store.importSchools([school]), /fictional admin/);
  loginAdmin(store);
  const before = store.snapshot().accounts.length;
  assert.throws(() => store.importSchools([school, { ...school }]), /already exists/);
  assert.equal(store.snapshot().accounts.length, before, 'Duplicate rows do not partially import');
  assert.throws(() => store.importSchools([school, { ...school, email: 'other@example.test', password: 'short' }]), /8 characters/);
  assert.equal(store.snapshot().accounts.length, before);
  const [id] = store.importSchools([school]);
  assert.equal(store.snapshot().accounts.length, before + 1);
  assert.equal(store.snapshot().accounts.find(item => item.id === id).schoolProfile.city, 'Lahore');
  assert.ok(!JSON.stringify(store.snapshot()).includes(school.password));
  store.signOut();
  assert.equal(store.signIn(school.email, school.password), 'user');
  assert.deepEqual(availableBooks(store.snapshot().accounts.find(item => item.id === id), books), [books[1]]);
});

test('school details, principals, activation and expiry affect the existing account', () => {
  const store = fresh(); loginAdmin(store);
  const [id, second] = store.importSchools([newUser(), newUser({ email: 'second@example.test' })]);
  store.updateSchool(id, { name: 'Updated School', schoolProfile: { name: 'Updated School', city: 'Karachi' }, principals: [{ name: 'Demo Principal', email: 'principal@example.test', phone: '000' }], loginPrefix: 'example', modules: ['Books', 'Resources'] });
  assert.equal(store.snapshot().accounts.find(item => item.id === id).principals.length, 1);
  assert.throws(() => store.updateSchool(id, { principals: [{ name: '' }] }), /principal/);
  assert.throws(() => store.updateSchool(id, { modules: ['Unknown'] }), /modules/);
  assert.throws(() => store.updateSchool(id, { modules: ['Paper Maker'], access: { expires: 'invalid' } }), /expiry/);
  assert.deepEqual(store.snapshot().accounts.find(item => item.id === id).modules, ['Books', 'Resources'], 'Invalid book access does not partially update features');
  store.setHeadSchool(id); store.setHeadSchool(second);
  assert.equal(store.snapshot().accounts.filter(item => item.isHeadSchool).length, 1);
  assert.equal(store.snapshot().accounts.find(item => item.id === second).isHeadSchool, true);
  store.setSchoolsEnabled([id, second], false);
  assert.throws(() => store.signIn('learner@example.test', 'Temporary!2026'), /disabled/);
  assert.throws(() => store.setSchoolsEnabled([id, 'demo-admin'], true), /school/);
  assert.equal(store.snapshot().accounts.find(item => item.id === id).enabled, false, 'Invalid bulk action is atomic');
  store.setSchoolsEnabled([id], true);
  store.updateAccess(id, { allBooks: true, expiresAt: '2000-01-01T12:00' });
  assert.equal(availableBooks(store.snapshot().accounts.find(item => item.id === id), books).length, 0);
  assert.throws(() => store.signIn('learner@example.test', 'Temporary!2026'), /expired/);
  store.updateAccess(id, { allBooks: true, expires: '', expiresAt: '' });
  store.resetPassword(id, 'NewSchool!2026');
  store.signOut();
  assert.equal(store.signIn('learner@example.test', 'NewSchool!2026'), 'user');
  assert.equal(store.snapshot().accounts.find(item => item.id === id).schoolProfile.city, 'Karachi');
  assert.throws(() => store.updateSchool(second, {}), /fictional admin/);
});

test('fictional login, invalid credentials, disabled accounts and sign out', () => {
  const store = fresh();
  assert.throws(() => store.signIn('admin@javed.example', 'incorrect'), /Incorrect demo/);
  assert.equal(store.snapshot().currentId, null);
  assert.equal(loginAdmin(store), 'admin');
  store.signOut();
  assert.equal(store.snapshot().currentId, null);
  assert.equal(store.signIn('  READER@JAVED.EXAMPLE ', DEMO_CREDENTIALS.user.password), 'user');
  assert.deepEqual(availableBooks(store.snapshot().accounts.find(a => a.id === store.snapshot().currentId), books), books, 'The default reader dashboard contains the complete catalogue');
  store.signOut();
  assert.throws(() => store.signIn('ali@javed.example', 'DisabledDemo!2026'), /disabled/);
});

test('new accounts can sign in and see only assignments in the same session', () => {
  const store = fresh();
  loginAdmin(store);
  const input = newUser();
  const id = store.createUser(input);
  assert.ok(!JSON.stringify(store.snapshot()).includes(input.password), 'Passwords are excluded from UI account snapshots');
  store.signOut();
  store.signIn(input.email, input.password);
  assert.equal(store.snapshot().currentId, id);
  assert.deepEqual(availableBooks(store.snapshot().accounts.find(a => a.id === id), books), [books[1]]);
  assert.throws(() => store.createUser(newUser()), /fictional admin/);
  store.signOut();
  loginAdmin(store);
  store.updateAccess(id, { allBooks: true });
  assert.equal(availableBooks(store.snapshot().accounts.find(a => a.id === id), books).length, books.length);
  store.updateAccess(id, { allBooks: false, bookIds: ['missing-book', 'book-three', 'book-three'] });
  assert.deepEqual(availableBooks(store.snapshot().accounts.find(a => a.id === id), books), [books[2]]);
  store.updateAccess(id, { allBooks: false, bookIds: [] });
  assert.deepEqual(availableBooks(store.snapshot().accounts.find(a => a.id === id), books), []);
});

test('required details, duplicate email, temporary password and expiry validation', () => {
  const store = fresh(); loginAdmin(store);
  assert.throws(() => store.createUser(newUser({ name: '  ' })), /full name/);
  assert.throws(() => store.createUser(newUser({ email: 'invalid' })), /valid email/);
  assert.throws(() => store.createUser(newUser({ password: 'short' })), /8 characters/);
  assert.throws(() => store.createUser(newUser({ email: ' READER@JAVED.EXAMPLE ' })), /already exists/);
  assert.throws(() => store.createUser(newUser({ expires: 'invalid' })), /expiry/);
  store.createUser(newUser());
  assert.throws(() => store.createUser(newUser({ email: 'LEARNER@example.test' })), /already exists/);
});

test('disable, enable, expiry and reset password affect the next demo sign in', () => {
  const store = fresh(); loginAdmin(store);
  const input = newUser(); const id = store.createUser(input);
  store.toggleEnabled(id); store.signOut();
  assert.throws(() => store.signIn(input.email, input.password), /disabled/);
  loginAdmin(store); store.toggleEnabled(id); store.resetPassword(id, 'ChangedDemo!2026'); store.signOut();
  assert.throws(() => store.signIn(input.email, input.password), /Incorrect/);
  assert.equal(store.signIn(input.email, 'ChangedDemo!2026'), 'user');
  store.signOut(); loginAdmin(store);
  store.updateAccess(id, { allBooks: true, expires: '2000-01-01' }); store.signOut();
  assert.throws(() => store.signIn(input.email, 'ChangedDemo!2026'), /expired/);
  loginAdmin(store); store.updateAccess(id, { allBooks: true, expires: localDate() }); store.signOut();
  assert.equal(store.signIn(input.email, 'ChangedDemo!2026'), 'user', 'Expiry date is inclusive');
});

test('profile, password change, per-user reading progress and refresh reset', () => {
  const store = fresh();
  store.signIn(DEMO_CREDENTIALS.user.email, DEMO_CREDENTIALS.user.password);
  const id = store.snapshot().currentId;
  assert.throws(() => store.changePassword('incorrect', 'ChangedDemo!2026'), /current demo password/);
  store.changePassword(DEMO_CREDENTIALS.user.password, 'ChangedDemo!2026');
  store.updateProfile({ name: 'Updated Fictional Reader', email: 'updated@example.test' });
  store.rememberPosition('book-two', 5);
  assert.deepEqual(store.snapshot().progress[id], { bookId: 'book-two', page: 5 });
  store.signOut(); loginAdmin(store);
  assert.equal(store.snapshot().progress[store.snapshot().currentId], undefined);
  store.signOut();
  assert.equal(store.signIn('updated@example.test', 'ChangedDemo!2026'), 'user');
  const reloaded = fresh();
  assert.equal(reloaded.snapshot().currentId, null);
  assert.throws(() => reloaded.signIn('updated@example.test', 'ChangedDemo!2026'), /Incorrect/);
  assert.equal(reloaded.signIn(DEMO_CREDENTIALS.user.email, DEMO_CREDENTIALS.user.password), 'user');
  assert.deepEqual(reloaded.snapshot().progress, {});
});

test('school profiles are validated and scoped to the signed-in demo reader', () => {
  const store = fresh();
  loginAdmin(store);
  assert.throws(() => store.updateSchoolProfile({ name: 'Demo School' }), /demo reader/);
  const secondId = store.createUser(newUser());
  store.signOut();
  store.signIn(DEMO_CREDENTIALS.user.email, DEMO_CREDENTIALS.user.password);
  assert.throws(() => store.updateSchoolProfile({ name: '  ' }), /school name/);
  assert.throws(() => store.updateSchoolProfile({ name: 'Demo School', email: 'invalid' }), /school email/);
  store.updateSchoolProfile({ name: ' Demo School ', description: ' Fictional school description ', country: 'Pakistan', state: 'Punjab', city: 'Demo City', contactPerson: ' Demo Contact ', email: 'school@example.test', phone: '12345', address: 'Fictional campus' });
  const reader = store.snapshot().accounts.find(account => account.id === store.snapshot().currentId);
  assert.equal(reader.schoolProfile.name, 'Demo School');
  assert.equal(reader.schoolProfile.contactPerson, 'Demo Contact');
  assert.equal(reader.schoolProfile.description, 'Fictional school description');
  assert.equal(reader.schoolProfile.country, 'Pakistan');
  assert.equal(reader.schoolProfile.state, 'Punjab');
  assert.equal(reader.schoolProfile.city, 'Demo City');
  store.updateSchoolProfile({ name: 'Updated Demo School' });
  assert.equal(store.snapshot().accounts.find(account => account.id === 'demo-reader').schoolProfile.city, 'Demo City');
  assert.equal(store.snapshot().accounts.find(account => account.id === secondId).schoolProfile, undefined);
  store.signOut();
  store.signIn(DEMO_CREDENTIALS.user.email, DEMO_CREDENTIALS.user.password);
  assert.equal(store.snapshot().accounts.find(account => account.id === store.snapshot().currentId).schoolProfile.address, 'Fictional campus');
  assert.equal(fresh().snapshot().accounts.find(account => account.id === 'demo-reader').schoolProfile, undefined);
});

test('school logos stay in the reader account memory and can be replaced or removed', () => {
  const store = fresh();
  loginAdmin(store);
  assert.throws(() => store.updateSchoolLogo(''), /demo reader/);
  store.signOut();
  store.signIn(DEMO_CREDENTIALS.user.email, DEMO_CREDENTIALS.user.password);
  assert.throws(() => store.updateSchoolLogo('https://example.test/logo.png'), /valid PNG/);
  assert.throws(() => store.updateSchoolLogo('data:image/svg+xml;base64,PHN2Zz4='), /valid PNG/);
  assert.throws(() => store.updateSchoolLogo('data:image/png;base64,' + 'A'.repeat(2800000)), /2 MB/);
  const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
  store.updateSchoolLogo(logo);
  assert.equal(store.snapshot().accounts.find(account => account.id === 'demo-reader').schoolLogo, logo);
  assert.equal(store.snapshot().accounts.find(account => account.id === 'demo-disabled').schoolLogo, undefined);
  store.signOut();
  store.signIn(DEMO_CREDENTIALS.user.email, DEMO_CREDENTIALS.user.password);
  assert.equal(store.snapshot().accounts.find(account => account.id === 'demo-reader').schoolLogo, logo);
  store.updateSchoolLogo('');
  assert.equal(store.snapshot().accounts.find(account => account.id === 'demo-reader').schoolLogo, '');
  assert.equal(fresh().snapshot().accounts.find(account => account.id === 'demo-reader').schoolLogo, undefined);
});

test('admin series creation validates names, survives refresh and appears after reader sign-in', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const store = createDemoStore(books.map(book => book.id), storage);
  assert.throws(() => store.createSeries({ name: 'New Series' }), /admin/);
  loginAdmin(store);
  assert.throws(() => store.createSeries({ name: '  ' }), /series name/);
  assert.throws(() => store.createSeries({ name: ' stemford series ' }), /already exists/);
  const created = store.createSeries({ name: ' Bright Minds ', description: ' A new collection ' });
  assert.equal(created.name, 'Bright Minds');
  assert.equal(created.description, 'A new collection');
  assert.throws(() => store.createSeries({ name: 'BRIGHT MINDS' }), /already exists/);
  store.signOut();
  store.signIn(DEMO_CREDENTIALS.user.email, DEMO_CREDENTIALS.user.password);
  assert.deepEqual(store.snapshot().customSeries, [created]);
  assert.throws(() => store.createSeries({ name: 'Reader Series' }), /admin/);
  const refreshed = createDemoStore(books.map(book => book.id), storage);
  assert.deepEqual(refreshed.snapshot().customSeries, [created]);
});

test('corrupt series storage recovers and failed saves do not publish a series', () => {
  const store = createDemoStore([], { getItem: () => 'invalid json', setItem: () => { throw Error('Quota exceeded'); } });
  assert.deepEqual(store.snapshot().customSeries, []);
  loginAdmin(store);
  assert.throws(() => store.createSeries({ name: 'Unsaved Series' }), /Cannot save/);
  assert.deepEqual(store.snapshot().customSeries, []);
});

test('subjects are admin-created, scoped to class and series, and survive refresh', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const store = createDemoStore([], storage);
  const input = { name: ' General Knowledge ', classId: 'play-group', seriesId: 'stemford' };
  assert.throws(() => store.createSubject(input), /admin/);
  loginAdmin(store);
  assert.throws(() => store.createSubject({ ...input, name: ' ' }), /subject name/);
  assert.throws(() => store.createSubject({ ...input, classId: 'missing' }), /valid class/);
  assert.throws(() => store.createSubject({ ...input, seriesId: 'missing' }), /valid class/);
  assert.throws(() => store.createSubject({ ...input, name: 'ENGLISH' }), /already exists/);
  const created = store.createSubject(input);
  assert.equal(created.name, 'General Knowledge');
  assert.throws(() => store.createSubject({ ...input, name: 'general knowledge' }), /already exists/);
  store.createSubject({ ...input, classId: 'class-1' });
  const customSeries = store.createSeries({ name: 'Future Series' });
  store.createSubject({ ...input, seriesId: customSeries.id });
  store.signOut();
  store.signIn(DEMO_CREDENTIALS.user.email, DEMO_CREDENTIALS.user.password);
  assert.equal(store.snapshot().customSubjects.length, 3);
  assert.throws(() => store.createSubject(input), /admin/);
  assert.deepEqual(createDemoStore([], storage).snapshot().customSubjects, store.snapshot().customSubjects);
});

test('invalid saved subjects and failed subject writes do not affect the catalogue', () => {
  const storage = { getItem: () => '[{"id":"subject-one","name":"Invalid","classId":"missing","seriesId":"stemford"}]', setItem: () => { throw Error('blocked'); } };
  const store = createDemoStore([], storage);
  assert.deepEqual(store.snapshot().customSubjects, []);
  loginAdmin(store);
  assert.throws(() => store.createSubject({ name: 'Drawing', classId: 'play-group', seriesId: 'stemford' }), /Cannot save/);
  assert.deepEqual(store.snapshot().customSubjects, []);
});

test('assignment edits require admin, validate selections, support unassigning and persist', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const store = createDemoStore([], storage);
  const input = { seriesId: 'stemford', subjectId: 'english', classIds: ['prep', 'nursery', 'prep'] };
  assert.throws(() => store.assignSubjectClasses(input), /admin/);
  loginAdmin(store);
  assert.throws(() => store.assignSubjectClasses({ ...input, subjectId: 'missing' }), /valid series/);
  assert.throws(() => store.assignSubjectClasses({ ...input, classIds: ['bad'] }), /valid classes/);
  store.assignSubjectClasses(input);
  assert.deepEqual(store.snapshot().subjectAssignments[0].classIds, ['prep', 'nursery']);
  const subject = store.createSubject({ name: 'Drawing', seriesId: 'stemford', classId: 'prep' });
  store.assignSubjectClasses({ ...input, subjectId: subject.id, classIds: ['class-2'] });
  assert.deepEqual(createDemoStore([], storage).snapshot().subjectAssignments, store.snapshot().subjectAssignments);
  store.assignSubjectClasses({ ...input, classIds: [] });
  assert.deepEqual(store.snapshot().subjectAssignments.find(row => row.subjectId === 'english').classIds, []);
  store.signOut();
  store.signIn(DEMO_CREDENTIALS.user.email, DEMO_CREDENTIALS.user.password);
  assert.equal(store.snapshot().subjectAssignments.length, 2);
  assert.throws(() => store.assignSubjectClasses(input), /admin/);
});

test('invalid stored assignments are ignored and failed saves leave defaults intact', () => {
  const store = createDemoStore([], { getItem: () => '[{"subjectId":"missing","seriesId":"stemford","classIds":["prep"]}]', setItem: () => { throw Error('blocked'); } });
  assert.deepEqual(store.snapshot().subjectAssignments, []);
  loginAdmin(store);
  assert.throws(() => store.assignSubjectClasses({ subjectId: 'english', seriesId: 'stemford', classIds: ['prep'] }), /Cannot save assignments/);
  assert.deepEqual(store.snapshot().subjectAssignments, []);
});
