import { bookIds } from './catalog.js';
import { fail } from './auth.js';
import { learningClasses } from '../../frontend/src/data/learningCatalog.js';
import { schoolSubjectChoices, subjectKey } from '../../frontend/src/data/schoolAccess.js';
import { series } from '../../frontend/src/data/series.js';
import { regionName } from '../../frontend/src/data/pakistanLocations.js';
import { validateLocation } from './locations.js';

export function identity(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!name || name.length > 150) throw fail(400, 'Enter a name between 1 and 150 characters.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, 'Enter a valid email address.');
  return { name, email };
}
export function image(value) {
  if (typeof value !== 'string' || value.length > 2800000 || (value && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))) throw fail(400, 'Choose a PNG, JPG or WebP image up to 2 MB.');
  return value;
}
function profile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail(400, 'Enter valid profile details.');
  return Object.fromEntries(['name', 'description', 'email', 'address', 'country', 'state', 'city', 'contactPerson', 'phone'].filter(key => key in value).map(key => {
    if (typeof value[key] !== 'string' || value[key].length > (['description', 'address'].includes(key) ? 1000 : 200)) throw fail(400, `Invalid profile ${key}.`);
    return [key, value[key].trim()];
  }));
}
export function metadata(input, previous = {}, self = false, seriesChoices = series, learning = null) {
  const result = { ...previous };
  if ('schoolProfile' in input) {
    result.schoolProfile = { ...previous.schoolProfile, ...profile(input.schoolProfile) };
    if (result.schoolProfile.state) result.schoolProfile.state = regionName(result.schoolProfile.state);
    validateLocation(result.schoolProfile, previous.schoolProfile);
  }
  if ('schoolLogo' in input) result.schoolLogo = image(input.schoolLogo);
  if ('profileImage' in input) result.profileImage = image(input.profileImage);
  if (self) return result;
  if ('allowedSeriesIds' in input) {
    if (!Array.isArray(input.allowedSeriesIds) || input.allowedSeriesIds.some(id => !seriesChoices.some(item => item.id === id))) throw fail(400, 'Choose valid book series.');
    result.allowedSeriesIds = [...new Set(input.allowedSeriesIds)];
  }
  if ('schoolAssignments' in input) {
    const selections = input.schoolAssignments;
    if (!Array.isArray(selections) || selections.length > learningClasses.length || !learning) throw fail(400, 'Choose valid class permissions.');
    const choices = schoolSubjectChoices(learning.customSubjects, learning.subjectAssignments, learning.seriesClasses);
    const seen = new Set();
    result.schoolAssignments = selections.map(row => {
      if (!row || !learningClasses.some(item => item.id === row.classId) || seen.has(row.classId) || !Array.isArray(row.subjects) || row.subjects.length > 500) throw fail(400, 'Choose valid classes and subjects.');
      seen.add(row.classId);
      const subjects = new Map();
      for (const subject of row.subjects) {
        if (!subject || !choices.some(item => item.classId === row.classId && item.seriesId === subject.seriesId && item.subjectId === subject.subjectId)) throw fail(400, 'Assign only subjects available in this class and series.');
        subjects.set(subjectKey(subject), { seriesId: subject.seriesId, subjectId: subject.subjectId });
      }
      return { classId: row.classId, subjects: [...subjects.values()] };
    });
    result.allowedSeriesIds = [...new Set(result.schoolAssignments.flatMap(row => row.subjects.map(subject => subject.seriesId)))];
  }
  if ('isHeadSchool' in input) {
    if (typeof input.isHeadSchool !== 'boolean') throw fail(400, 'Invalid school designation.');
    result.isHeadSchool = input.isHeadSchool;
  }
  if ('principals' in input) {
    if (!Array.isArray(input.principals) || input.principals.length > 50) throw fail(400, 'Use up to 50 principal contacts.');
    result.principals = input.principals.map(item => {
      const contact = profile(item);
      if (!contact.name) throw fail(400, 'Enter the principal name.');
      if (item.username !== undefined && (typeof item.username !== 'string' || item.username.length > 150)) throw fail(400, 'Invalid principal username.');
      return { ...contact, username: item.username || '' };
    });
  }
  if ('modules' in input) {
    if (!Array.isArray(input.modules) || input.modules.some(value => !['Books', 'Resources', 'Paper Maker'].includes(value))) throw fail(400, 'Choose valid modules.');
    result.modules = [...new Set(input.modules)];
  }
  if ('loginPrefix' in input) {
    if (typeof input.loginPrefix !== 'string' || !/^[a-zA-Z0-9_-]{0,30}$/.test(input.loginPrefix)) throw fail(400, 'Invalid login prefix.');
    result.loginPrefix = input.loginPrefix;
  }
  return result;
}
export function permissions(input, previous = { all_books: true, book_ids: [], expires_at: null }) {
  const source = input.access || input;
  const allBooks = source.allBooks ?? previous.all_books;
  const ids = source.bookIds ?? previous.book_ids;
  if (typeof allBooks !== 'boolean' || !Array.isArray(ids) || ids.some(id => !bookIds.includes(id))) throw fail(400, 'Choose valid book access.');
  let expiresAt = previous.expires_at;
  if ('expiresAt' in source) {
    if (source.expiresAt && (typeof source.expiresAt !== 'string' || !/(Z|[+-]\d\d:\d\d)$/.test(source.expiresAt) || !Number.isFinite(Date.parse(source.expiresAt)))) throw fail(400, 'Enter an expiry with a timezone.');
    expiresAt = source.expiresAt ? new Date(source.expiresAt) : null;
  } else if (source.expires) throw fail(400, 'Use an expiry date and time with a timezone.');
  return { allBooks, bookIds: [...new Set(ids)], expiresAt };
}
