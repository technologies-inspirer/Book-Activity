import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSchoolForm } from '../src/portal/schoolFormValidation.js';

const valid = () => ({
  details: { name: 'School', description: 'Primary school', email: 'school@example.test', phone: '03001234567', address: 'Main Road', country: 'Pakistan', state: 'Punjab', city: 'Lahore', expiry: '' },
  principal: { name: 'Principal', email: 'principal@example.test', phone: '03007654321', username: 'principal' },
  allowedSeriesIds: ['stemford'], creating: true, password: '1'
});

test('empty visible school and principal fields are individually identified', () => {
  const input = valid();
  for (const key of Object.keys(input.details)) input.details[key] = '';
  for (const key of Object.keys(input.principal)) input.principal[key] = '';
  input.password = ''; input.allowedSeriesIds = [];
  const errors = validateSchoolForm(input);
  for (const key of ['name', 'description', 'email', 'phone', 'address', 'country', 'state', 'city', 'principal-name', 'principal-email', 'principal-phone', 'principal-username', 'password', 'allowedSeriesIds']) assert.ok(errors[key], key);
  assert.equal(errors.expiry, undefined);
});
test('complete registration accepts an empty expiry and a one-character password', () => {
  assert.deepEqual(validateSchoolForm(valid()), {});
});
test('editing an account does not require a password field that is not displayed', () => {
  assert.deepEqual(validateSchoolForm({ ...valid(), creating: false, password: '' }), {});
});
test('whitespace fields and invalid emails are rejected before submission', () => {
  const input = valid();
  input.details.address = '   '; input.details.email = 'invalid'; input.principal.email = 'invalid'; input.password = ' ';
  const errors = validateSchoolForm(input);
  assert.ok(errors.address); assert.ok(errors.email); assert.ok(errors['principal-email']); assert.ok(errors.password);
});
test('city choice, province, series and non-empty invalid expiry are checked', () => {
  const input = valid();
  input.details.state = 'Unknown'; input.details.city = ''; input.details.expiry = 'not-a-date'; input.allowedSeriesIds = [];
  const errors = validateSchoolForm(input);
  assert.ok(errors.state); assert.ok(errors.city); assert.ok(errors.expiry); assert.ok(errors.allowedSeriesIds);
});
