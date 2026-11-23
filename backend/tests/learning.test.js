import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/passwords.js';
import { digest } from '../src/auth.js';
import { changeLearning, initialLearning, learningState } from '../src/learning.js';
import { catalog } from '../src/catalog.js';
import { getSubjectAssignments, learningClasses } from '../../frontend/src/data/learningCatalog.js';

test('class and subject assignments validate their parents and preserve unassigned books', () => {
  let state = changeLearning(initialLearning(), 'series', { name: 'Unit test series' }).state;
  const seriesId = state.customSeries[0].id;
  assert.throws(() => changeLearning(state, 'subjects', { seriesId, classId: 'class-8', subjectIds: ['history'] }), /Assign this class/);
  state = changeLearning(state, 'classes', { seriesId, classIds: learningClasses.map(item => item.id) }).state;
  state = changeLearning(state, 'subjects', { seriesId, classId: 'class-8', subjectIds: ['history', 'geography'] }).state;
  assert.deepEqual(getSubjectAssignments(state.customSubjects, state.subjectAssignments).filter(row => row.seriesId === seriesId && row.classIds.includes('class-8')).map(row => row.subjectId), ['history', 'geography']);
  state = changeLearning(state, 'subjects', { seriesId, classId: 'class-8', subjectIds: [] }).state;
  assert.equal(getSubjectAssignments(state.customSubjects, state.subjectAssignments).filter(row => row.seriesId === seriesId && row.classIds.includes('class-8')).length, 0);
  assert.throws(() => changeLearning(state, 'classes', { seriesId, classIds: ['class-99'] }), /valid classes/);
  assert.throws(() => changeLearning(state, 'series', { name: 'Unit test series' }), /already exists/);
});

test('admin catalog and published PDF projects persist and enforce school access', async () => {
  const key = randomUUID(), email = `${key}@example.test`, readerEmail = `${key}-reader@example.test`;
  const testIp = `2001:db8:${key.slice(0, 4)}:${key.slice(4, 8)}::4`;
  app.set('trust proxy', 'loopback');
  await pool.query("INSERT INTO users(name,email,password_hash,role) VALUES ('Catalog test admin',$1,$2,'admin')", [email, await hashPassword('1')]);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const client = () => {
    let cookie = '', csrf = '';
    return async (path, method = 'GET', body, raw = false) => {
      const response = await fetch(base + '/api' + path, { method, headers: { Cookie: cookie, 'X-CSRF-Token': csrf, 'X-Forwarded-For': testIp, ...(body ? { 'Content-Type': raw ? 'application/zip' : 'application/json' } : {}) }, ...(body ? { body: raw ? body : JSON.stringify(body) } : {}) });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      const data = response.headers.get('content-type')?.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
      if (data.csrfToken) csrf = data.csrfToken;
      return { status: response.status, data };
    };
  };
  const admin = client(), reader = client(), anonymous = client();
  let seriesId, bookId;
  try {
    assert.equal((await anonymous('/learning')).status, 401);
    await admin('/auth/login', 'POST', { email, password: '1' });
    const created = await admin('/admin/learning/series', 'POST', { name: `Test ${key}` });
    assert.equal(created.status, 201); seriesId = created.data.created.id;
    assert.equal((await admin('/admin/learning/classes', 'POST', { seriesId, classIds: ['play-group', 'class-8'] })).status, 200);
    assert.equal((await admin('/admin/learning/subjects', 'POST', { seriesId, classId: 'class-8', subjectIds: ['history', 'geography'] })).status, 200);
    const school = await admin('/admin/users', 'POST', { name: 'Catalog school', email: readerEmail, password: '1', allowedSeriesIds: [seriesId] });
    assert.equal(school.status, 201);
    await reader('/auth/login', 'POST', { email: readerEmail, password: '1' });
    assert.equal((await reader('/admin/learning/series', 'POST', { name: 'Forbidden' })).status, 403);
    assert.equal((await reader(`/files/${catalog[0].dir}/p001.jpg`)).status, 403);
    const page = await readFile(new URL(`../../frontend/${catalog[0].dir}/cover.jpg`, import.meta.url));
    const zip = new JSZip(); zip.file('page.jpg', page);
    const manifest = { format: 'book-activity-draft', version: 1, title: 'Published test book', originalBookId: catalog[0].id, seriesId, classId: 'class-8', subjectId: 'history', pages: [{ number: 1, width: 600, height: 800, imagePath: 'page.jpg', thumbnailPath: 'page.jpg', activities: [] }] };
    const qrAnchor = { id: 'qr-test', x: 10, y: 60, w: 12, h: 9 };
    manifest.pages[0].printedQrs = [qrAnchor]; manifest.pages[0].qrScanned = true;
    manifest.pages[0].activities = [{ id: 'lesson-test', type: 'link', title: 'Watch lesson', url: 'https://example.com/manual-lesson', buttonColour: '#195a73', fixedButton: true, qrAnchor }];
    zip.file('project.json', JSON.stringify(manifest));
    const archive = await zip.generateAsync({ type: 'nodebuffer' });
    assert.equal((await admin('/admin/library/books', 'POST', Buffer.from('bad zip'), true)).status, 400);
    assert.equal((await reader('/admin/library/books', 'POST', archive, true)).status, 403);
    const published = await admin('/admin/library/books', 'POST', archive, true);
    assert.equal(published.status, 201, JSON.stringify(published.data)); bookId = published.data.id;
    assert.ok((await reader('/learning')).data.publishedBooks.some(book => book.id === bookId));
    assert.deepEqual((await reader(`/library/books/${bookId}/archive`)).data, archive);
    assert.equal((await reader(`/library/books/${bookId}/cover`)).status, 200);
    assert.equal((await reader(`/files/${catalog[0].dir}/p001.jpg`)).status, 200, 'Reused original activities can load their source artwork');
    assert.equal((await reader('/me/progress', 'PUT', { bookId, page: 0 })).status, 200);
    assert.equal((await reader('/me/progress')).data.progress.bookId, bookId);
    await admin(`/admin/users/${school.data.account.id}`, 'PATCH', { schoolAssignments: [{ classId: 'class-8', subjects: [{ seriesId, subjectId: 'geography' }] }] });
    assert.equal((await reader(`/library/books/${bookId}/archive`)).status, 403);
    assert.equal((await reader(`/library/books/${bookId}/cover`)).status, 403);
    await admin(`/admin/users/${school.data.account.id}`, 'PATCH', { schoolAssignments: [{ classId: 'class-8', subjects: [{ seriesId, subjectId: 'history' }] }] });
    assert.equal((await reader(`/library/books/${bookId}/archive`)).status, 200);
    const savedArchive = await JSZip.loadAsync((await reader(`/library/books/${bookId}/archive`)).data);
    const savedManifest = JSON.parse(await savedArchive.file('project.json').async('string'));
    assert.deepEqual(savedManifest.pages[0].printedQrs, [qrAnchor]);
    assert.equal(savedManifest.pages[0].activities[0].url, 'https://example.com/manual-lesson');
    const badLink = structuredClone(manifest); badLink.pages[0].activities[0].url = 'javascript:alert(1)';
    zip.file('project.json', JSON.stringify(badLink));
    assert.equal((await admin(`/admin/library/books/${bookId}`, 'PUT', await zip.generateAsync({ type: 'nodebuffer' }), true)).status, 400);
    manifest.title = 'Updated test book'; zip.file('project.json', JSON.stringify(manifest));
    assert.equal((await admin(`/admin/library/books/${bookId}`, 'PUT', await zip.generateAsync({ type: 'nodebuffer' }), true)).status, 200);
    assert.equal((await reader('/learning')).data.publishedBooks.find(book => book.id === bookId).title, 'Updated test book');
    assert.ok((await learningState()).customSeries.some(item => item.id === seriesId));
    await admin(`/admin/users/${school.data.account.id}`, 'PATCH', { allowedSeriesIds: [] });
    assert.equal((await reader(`/library/books/${bookId}/archive`)).status, 403);
    assert.equal((await reader('/learning')).data.publishedBooks.length, 0);
    assert.equal((await reader(`/files/${catalog[0].dir}/p001.jpg`)).status, 403);
    assert.equal((await reader('/me/progress')).data.progress, null);
  } finally {
    if (bookId) await pool.query('DELETE FROM published_books WHERE id=$1', [bookId]);
    await pool.query('DELETE FROM users WHERE email=ANY($1::text[])', [[email, readerEmail]]);
    await pool.query('DELETE FROM login_attempts WHERE key=ANY($1::text[])', [[digest(`ip:${testIp}`), digest(`email:${email}`), digest(`email:${readerEmail}`)]]);
    if (seriesId) {
      const connection = await pool.connect();
      try {
        await connection.query('BEGIN'); await connection.query('SELECT pg_advisory_xact_lock(7261043)');
        const state = await learningState(connection);
        state.customSeries = state.customSeries.filter(item => item.id !== seriesId);
        for (const field of ['customSubjects', 'subjectAssignments', 'seriesClasses']) state[field] = state[field].filter(item => item.seriesId !== seriesId);
        await connection.query("UPDATE portal_settings SET value=$1 WHERE key='learning-catalog'", [state]); await connection.query('COMMIT');
      } finally { connection.release(); }
    }
    await new Promise(resolve => server.close(resolve)); await pool.end();
  }
});
