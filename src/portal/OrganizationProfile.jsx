import { useEffect, useRef, useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { Feedback } from './Shared.jsx';
import { beginLoading } from '../loading/loadingState.js';

function ImageActionIcon({ remove = false }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={remove ? 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7' : 'M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5'} /></svg>;
}

function ProfileImagePanel({ kind, title, source }) {
  const { store } = useDemo();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(null);
  const input = useRef(null), operation = useRef(null), lastFinish = useRef(null);
  useEffect(() => () => {
    const active = operation.current;
    operation.current = null;
    lastFinish.current?.(true);
    if (!active) return;
    active.reader.onload = active.reader.onerror = null;
    if (active.reader.readyState === FileReader.LOADING) active.reader.abort();
    if (active.image) active.image.onload = active.image.onerror = null;
    active.finish(true);
  }, []);

  function upload(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) {
      setMessage({ error: true, text: 'Choose a PNG, JPG or WebP image up to 2 MB.' }); return;
    }
    const active = { reader: new FileReader(), finish: beginLoading(`Loading ${title.toLowerCase()}...`) };
    lastFinish.current = active.finish;
    operation.current = active; setBusy(true); setMessage(null);
    const done = error => {
      if (operation.current !== active) return;
      operation.current = null;
      active.reader.onload = active.reader.onerror = null;
      if (active.image) active.image.onload = active.image.onerror = null;
      active.finish(); setBusy(false);
      setMessage(error ? { error: true, text: error } : { text: `${title} updated for this session.` });
    };
    active.reader.onerror = () => done('This image could not be read.');
    active.reader.onload = () => {
      if (operation.current !== active) return;
      const image = new Image(); active.image = image;
      image.onerror = () => done('This image could not be opened. Choose a valid image file.');
      image.onload = () => {
        if (operation.current !== active) return;
        try {
          if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 25000000) throw new Error('Choose an image with fewer than 25 million pixels.');
          store.updateOrganizationImage(kind, active.reader.result); done();
        } catch (error) { done(error.message); }
      };
      image.src = active.reader.result;
    };
    active.reader.readAsDataURL(file);
  }

  return <section className="organization-image-section" aria-labelledby={`organization-${kind}-title`}>
    <h2 id={`organization-${kind}-title`}>{title}</h2>
    <div className="organization-image-panel" aria-busy={busy}>
      {source ? <img className={`organization-image-preview ${kind}`} src={source} alt={`Organization ${title.toLowerCase()}`} /> : <span className="organization-image-empty">No {title.toLowerCase()} uploaded</span>}
      <div className="school-logo-actions">
        <input ref={input} type="file" className="sr-only" aria-label={`Choose organization ${title.toLowerCase()}`} accept="image/png,image/jpeg,image/webp" onChange={upload} tabIndex={-1} />
        <button type="button" className="school-logo-upload" aria-label={`Upload organization ${title.toLowerCase()}`} title={`Upload ${title.toLowerCase()}`} disabled={busy} onClick={() => input.current.click()}><ImageActionIcon /></button>
        <button type="button" className="school-logo-remove" aria-label={`Remove organization ${title.toLowerCase()}`} title={`Remove ${title.toLowerCase()}`} disabled={busy || !source} onClick={() => { try { store.updateOrganizationImage(kind, ''); setMessage({ text: `${title} removed for this session.` }); } catch (error) { setMessage({ error: true, text: error.message }); } }}><ImageActionIcon remove /></button>
      </div>
      {busy && <span role="status" className="organization-image-empty">Loading image…</span>}
    </div>
    <Feedback message={message} />
  </section>;
}

export function OrganizationProfile() {
  const { organizationProfile, store } = useDemo();
  const [details, setDetails] = useState(() => Object.fromEntries(['name', 'description', 'email', 'address', 'country', 'state', 'city'].map(key => [key, organizationProfile[key]])));
  const [message, setMessage] = useState(null);
  const field = (key, label, options = {}) => <label className="portal-field">{label}<input name={`organization-${key}`} value={details[key]} onChange={event => setDetails({ ...details, [key]: event.target.value })} {...options} /></label>;
  return <div className="organization-profile-page">
    <a className="school-back" href="#/admin" aria-label="Back to dashboard">&#8592;</a>
    <div className="organization-profile-heading"><h1>Profile</h1><span>Manage Profile</span></div>
    <ProfileImagePanel kind="logo" title="Logo" source={organizationProfile.logo} />
    <ProfileImagePanel kind="letterHead" title="Letter Head" source={organizationProfile.letterHead} />
    <form className="organization-details-panel" onSubmit={event => { event.preventDefault(); try { store.updateOrganizationProfile(details); setMessage({ text: 'Organization profile updated for this session.' }); } catch (error) { setMessage({ error: true, text: error.message }); } }}>
      <div className="organization-details-grid">
        {field('name', 'Name', { required: true, maxLength: 150, autoComplete: 'organization' })}
        {field('description', 'Description', { maxLength: 1000 })}
        {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {field('address', 'Address', { maxLength: 1000, autoComplete: 'street-address' })}
      </div>
      <div className="organization-location-grid">
        {field('country', 'Country', { maxLength: 100, autoComplete: 'country-name' })}
        {field('state', 'State', { maxLength: 100, autoComplete: 'address-level1' })}
        {field('city', 'City', { maxLength: 100, autoComplete: 'address-level2' })}
      </div>
      <Feedback message={message} />
      <div className="school-edit-actions"><button className="portal-primary">Update</button></div>
    </form>
    <p className="organization-profile-note">PNG, JPG or WebP images up to 2 MB. Profile and image changes are saved for this session and reset on refresh.</p>
  </div>;
}
