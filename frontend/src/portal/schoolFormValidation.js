import { pakistanRegions } from '../data/pakistanLocations.js';

const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateSchoolForm({ details, principal, password = '', creating = false, allowedSeriesIds, schoolAssignments }) {
  const errors = {};
  const required = (key, value, label, limit) => {
    if (typeof value !== 'string' || !value.trim()) errors[key] = `Please fill ${label}.`;
    else if (value.length > limit) errors[key] = `${label} is too long.`;
  };
  for (const [key, label, limit] of [['name', 'School Name', 150], ['description', 'Description', 1000], ['email', 'School Email', 254], ['phone', 'Phone', 50], ['address', 'Address', 1000], ['country', 'Country', 100], ['state', 'Province / Region', 100], ['city', 'City', 150]]) {
    required(key, details[key], label, limit);
  }
  if (!errors.email && !email.test(details.email.trim())) errors.email = 'Enter a valid school email address.';
  if (!errors.country && details.country !== 'Pakistan') errors.country = 'Select Pakistan.';
  if (!errors.state && !pakistanRegions.some(item => item.name === details.state)) errors.state = 'Select a province or region from the list.';
  if (errors.city) errors.city = 'Please select a city from the list.';
  for (const [key, label, limit] of [['name', 'Principal Name', 150], ['email', 'Principal Email', 150], ['phone', 'Principal Phone Number', 50], ['username', 'Principal Username', 150]]) {
    required(`principal-${key}`, principal[key], label, limit);
  }
  if (!errors['principal-email'] && !email.test(principal.email.trim())) errors['principal-email'] = 'Enter a valid principal email address.';
  if (creating) required('password', password, 'Password', 128);
  if (!Array.isArray(schoolAssignments) && (!Array.isArray(allowedSeriesIds) || !allowedSeriesIds.length)) errors.allowedSeriesIds = 'Please select at least one series.';
  if (details.expiry && !Number.isFinite(Date.parse(details.expiry))) errors.expiry = 'Enter a valid expiry date and time.';
  return errors;
}
