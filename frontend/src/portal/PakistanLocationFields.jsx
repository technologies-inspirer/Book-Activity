import { useEffect, useId, useRef, useState } from 'react';
import { pakistanRegions } from '../data/pakistanLocations.js';
import { useDemo } from './DemoContext.jsx';

function CitySelect({ state, value, onChange, validationError, onBlurField }) {
  const { store } = useDemo();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState({ cities: [], total: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(-1);
  const listId = useId();
  const input = useRef(null);
  useEffect(() => {
    if (!state || !open) return;
    let cancelled = false;
    setBusy(true); setError(''); setActive(-1);
    const timer = setTimeout(() => {
      store.searchCities(state, query).then(data => { if (!cancelled) setResult(data); })
        .catch(error => { if (!cancelled) setError(error.message); })
        .finally(() => { if (!cancelled) setBusy(false); });
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [state, query, open, store]);
  const choose = city => { setQuery(city); onChange(city); setOpen(false); input.current?.focus(); };
  const cities = busy || error ? [] : result.cities;
  return <div className="portal-field city-select" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); onBlurField?.(); } }}>
    <label htmlFor={`${listId}-input`}>City</label>
    <div className="city-select-input"><input ref={input} id={`${listId}-input`} name="school-city-search" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} autoComplete="off" required aria-invalid={!!validationError} aria-describedby={validationError ? `${listId}-validation` : undefined} value={query} disabled={!state} placeholder={state ? 'Search and select a city' : 'Select province / region first'} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); onChange(''); setOpen(true); }} onKeyDown={event => {
      if (event.key === 'Escape') { setOpen(false); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); setOpen(true);
        if (cities.length) { const next = event.key === 'ArrowDown' ? Math.min(active + 1, cities.length - 1) : Math.max(active - 1, 0); setActive(next); document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: 'nearest' }); }
      }
      if (event.key === 'Enter' && open && cities.length) { event.preventDefault(); choose(cities[Math.max(0, active)]); }
    }} /><button type="button" aria-label="Show city choices" disabled={!state} onMouseDown={event => event.preventDefault()} onClick={() => { setOpen(!open); input.current?.focus(); }}>&#9662;</button></div>
    {open && state && <div className="city-select-popup"><ul id={listId} role="listbox" aria-label="Cities">
      {cities.map((city, index) => <li key={city} id={`${listId}-${index}`} role="option" aria-selected={city === value || index === active}><button type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => choose(city)}>{city}</button></li>)}
    </ul><p role="status">{busy ? 'Searching cities...' : error || (!cities.length ? 'No matching city. Try another spelling.' : result.total > cities.length ? `${result.total.toLocaleString()} matches. Type to narrow the list.` : `${result.total.toLocaleString()} matches`)}</p></div>}
    {validationError ? <span className="sr-only" id={`${listId}-validation`}>{validationError}</span> : query && !value && !open && <span className="school-edit-hint">Select a city from the matching choices.</span>}
  </div>;
}

export function PakistanLocationFields({ value, onChange, errors = {}, onBlurField }) {
  return <div className="school-edit-location">
    <label className="portal-field">Country<select name="school-country" value="Pakistan" required aria-invalid={!!errors.country} aria-describedby={errors.country ? 'school-country-error' : undefined} onBlur={() => onBlurField?.('country')} onChange={() => onChange({ ...value, country: 'Pakistan' })}><option value="Pakistan">Pakistan</option></select>{errors.country && <span className="sr-only" id="school-country-error">{errors.country}</span>}</label>
    <label className="portal-field">Province / Region<select name="school-state" value={value.state} required aria-invalid={!!errors.state} aria-describedby={errors.state ? 'school-state-error' : undefined} onBlur={() => onBlurField?.('state')} onChange={event => onChange({ ...value, country: 'Pakistan', state: event.target.value, city: '' })}>
      <option value="">Select province / region</option>
      {value.state && !pakistanRegions.some(item => item.name === value.state) && <option value={value.state}>{value.state}</option>}
      {pakistanRegions.map(item => <option key={item.code} value={item.name}>{item.name}</option>)}
    </select>{errors.state && <span className="sr-only" id="school-state-error">{errors.state}</span>}</label>
    <CitySelect key={value.state} state={value.state} value={value.city} validationError={errors.city} onBlurField={() => onBlurField?.('city')} onChange={city => onChange({ ...value, city })} />
  </div>;
}
