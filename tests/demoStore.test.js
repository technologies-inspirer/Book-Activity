import test from 'node:test';
import assert from 'node:assert/strict';
import { availableBooks, createDemoStore, DEMO_CREDENTIALS, localDate } from '../src/portal/demoStore.js';

const books = ['book-one', 'book-two', 'book-three', 'book-four'].map(id => ({ id }));
const fresh = () => createDemoStore(books.map(book => book.id));
const loginAdmin = store => store.signIn(DEMO_CREDENTIALS.admin.email, DEMO_CREDENTIALS.admin.password);
const newUser = (overrides = {}) => ({ name: 'Fictional Learner', email: 'learner@example.test', password: 'Temporary!2026', allBooks: false, bookIds: ['book-two'], expires: '', ...overrides });

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
