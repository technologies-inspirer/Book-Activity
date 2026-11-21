import test from 'node:test';
import assert from 'node:assert/strict';
import { schoolSubjectChoices, initialSchoolAssignments, assignedSeriesIds } from '../src/data/schoolAccess.js';
const series = [{ id: 'stemford' }, { id: 'maxford' }];
const classes = [{ seriesId: 'stemford', classIds: ['play-group'] }, { seriesId: 'maxford', classIds: ['play-group'] }];
const choices = schoolSubjectChoices([], [], classes);
test('legacy series access becomes matching class and subject selections', () => {
  const rows = initialSchoolAssignments({ allowedSeriesIds: ['maxford'] }, choices, series);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].classId, 'play-group');
  assert.ok(rows[0].subjects.every(item => item.seriesId === 'maxford'));
  assert.deepEqual(assignedSeriesIds(rows), ['maxford']);
  assert.ok(choices.every(item => item.classId === 'play-group'));
});
test('explicit empty permissions and saved subject selections never expand automatically', () => {
  assert.deepEqual(initialSchoolAssignments({ schoolAssignments: [] }, choices, series), []);
  const account = { schoolAssignments: [{ classId: 'play-group', subjects: [{ seriesId: 'stemford', subjectId: 'maths' }] }] };
  const rows = initialSchoolAssignments(account, choices, series);
  assert.deepEqual(rows, account.schoolAssignments);
  rows[0].subjects.push({ seriesId: 'maxford', subjectId: 'english' });
  assert.equal(account.schoolAssignments[0].subjects.length, 1);
  assert.deepEqual(assignedSeriesIds(rows), ['stemford', 'maxford']);
});
