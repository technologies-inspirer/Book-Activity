import { readFileSync } from 'node:fs';
import { pakistanRegions, regionName } from '../../frontend/src/data/pakistanLocations.js';
import { fail } from './auth.js';

const data = JSON.parse(readFileSync(new URL('../data/pakistan-cities.json', import.meta.url), 'utf8'));
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const index = new Map(Object.entries(data).map(([state, names]) => [state, names.map(name => ({ name, search: normalize(name) }))]));
export function searchCities(state, query = '') {
  const name = regionName(state);
  const cities = index.get(name);
  if (!cities) throw fail(400, 'Choose a valid province or region.');
  if (typeof query !== 'string' || query.length > 150) throw fail(400, 'Enter a shorter city search.');
  const term = normalize(query.trim());
  const matches = !term ? cities : cities.filter(item => item.search.includes(term));
  const starts = term ? matches.filter(item => item.search.startsWith(term)) : matches;
  const rest = term ? matches.filter(item => !item.search.startsWith(term)) : [];
  return { cities: [...starts, ...rest].slice(0, 60).map(item => item.name), total: matches.length };
}
export function validateLocation(profile, previous = {}) {
  if (!profile || profile.country !== 'Pakistan') return;
  if (profile.state && !pakistanRegions.some(item => item.name === profile.state)) {
    if (profile.state !== previous.state) throw fail(400, 'Choose a valid province or region.');
    return;
  }
  if (profile.state && profile.city && (profile.state !== previous.state || profile.city !== previous.city)) {
    if (!index.get(profile.state)?.some(item => item.name === profile.city)) throw fail(400, 'Choose a city from the selected province or region.');
  }
}
