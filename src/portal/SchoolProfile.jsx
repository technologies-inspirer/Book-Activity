import { useEffect, useRef, useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { Feedback } from './Shared.jsx';
import { beginLoading } from '../loading/loadingState.js';

const logoTypes = ['image/png', 'image/jpeg', 'image/webp'];
const maxLogoSize = 2 * 1024 * 1024;

function UploadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" /></svg>;
}
function DeleteIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" /></svg>;
}

export function SchoolProfile() {
  const { account, store } = useDemo();
  const [details, setDetails] = useState(() => ({
    name: '', description: '', email: account.email, address: '', country: '', state: '', city: '',
    ...account.schoolProfile
  }));
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);
  const activeReader = useRef(null);
  useEffect(() => {
    if (uploading) return beginLoading('Loading school logo...');
  }, [uploading]);

  useEffect(() => () => {
    const reader = activeReader.current;
    activeReader.current = null;
    if (reader?.readyState === FileReader.LOADING) reader.abort();
  }, []);

  const update = event => setDetails(value => ({ ...value, [event.target.name]: event.target.value }));
  const save = event => {
    event.preventDefault();
    try {
      store.updateSchoolProfile(details);
      setMessage({ text: 'School details updated for this demo session.' });
    } catch (error) {
      setMessage({ error: true, text: error.message });
    }
  };

  const uploadLogo = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!logoTypes.includes(file.type)) {
      setMessage({ error: true, text: 'Choose a PNG, JPG or WebP image for the school logo.' });
      return;
    }
    if (file.size > maxLogoSize) {
      setMessage({ error: true, text: 'Choose a logo smaller than 2 MB.' });
      return;
    }
    const reader = new FileReader();
    activeReader.current = reader;
    setUploading(true);
    const finish = (error) => {
      if (activeReader.current !== reader) return;
      activeReader.current = null;
      setUploading(false);
      setMessage(error ? { error: true, text: error } : { text: 'School logo updated for this demo session.' });
    };
    reader.onerror = () => finish('The image could not be read. Please choose it again.');
    reader.onload = () => {
      if (activeReader.current !== reader) return;
      const image = new Image();
      image.onerror = () => finish('This image could not be opened. Choose a valid PNG, JPG or WebP file.');
      image.onload = () => {
        if (activeReader.current !== reader) return;
        try {
          store.updateSchoolLogo(reader.result);
          finish();
        } catch (error) {
          finish(error.message);
        }
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="school-profile school-profile-template" aria-labelledby="school-profile-heading">
      <a className="school-back" href="#/user" aria-label="Back to dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg></a>
      <h1 id="school-profile-heading">School</h1>
      <Feedback message={message} />
      <form onSubmit={save}>
        <div className="school-form-top">
          <div className="school-form-details">
            <label className="portal-field" htmlFor="school-name">Name<input id="school-name" name="name" autoComplete="organization" required value={details.name} onChange={update} /></label>
            <label className="portal-field" htmlFor="school-email">Email<input id="school-email" name="email" type="email" autoComplete="email" value={details.email} onChange={update} /></label>
            <label className="portal-field" htmlFor="school-address">Address<input id="school-address" name="address" autoComplete="street-address" value={details.address} onChange={update} /></label>
          </div>
          <label className="portal-field" htmlFor="school-description">Description<input id="school-description" name="description" value={details.description} onChange={update} /></label>
        </div>
        <div className="school-location-grid">
          <label className="portal-field" htmlFor="school-country">Country<input id="school-country" name="country" autoComplete="country-name" value={details.country} onChange={update} /></label>
          <label className="portal-field" htmlFor="school-state">State<input id="school-state" name="state" autoComplete="address-level1" value={details.state} onChange={update} /></label>
          <label className="portal-field" htmlFor="school-city">City<input id="school-city" name="city" autoComplete="address-level2" value={details.city} onChange={update} /></label>
        </div>
        <div className="school-update-row"><button className="portal-primary" type="submit">Update</button></div>
      </form>
      <section className="school-logo-section" aria-labelledby="school-logo-heading">
        <h2 id="school-logo-heading">Logo</h2>
        <div className="school-logo-panel" aria-busy={uploading}>
          {account.schoolLogo ? <img className="school-logo-preview" src={account.schoolLogo} alt={`${account.schoolProfile?.name || 'School'} logo`} /> : <div className="school-logo-placeholder" aria-label="No school logo uploaded"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m3 10 9-6 9 6M5 9v11h14V9M9 20v-6h6v6M10 9h4" /></svg></div>}
          <div className="school-logo-actions">
            <label className="sr-only" htmlFor="school-logo-file">Choose school logo</label>
            <input className="sr-only" id="school-logo-file" ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} tabIndex="-1" aria-describedby="school-logo-help" />
            <button className="school-logo-upload" type="button" aria-label="Upload school logo" title="Upload logo" disabled={uploading} onClick={() => fileInput.current.click()}><UploadIcon /></button>
            <button className="school-logo-remove" type="button" aria-label="Remove school logo" title="Remove logo" disabled={!account.schoolLogo || uploading} onClick={() => { store.updateSchoolLogo(''); setMessage({ text: 'School logo removed from this demo session.' }); }}><DeleteIcon /></button>
          </div>
          <p id="school-logo-help">{uploading ? 'Loading logo...' : 'PNG, JPG or WebP, up to 2 MB. Demo changes reset on refresh.'}</p>
        </div>
      </section>
    </section>
  );
}
