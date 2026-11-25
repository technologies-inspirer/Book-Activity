import { useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { Feedback } from './Shared.jsx';
export function SchoolProfile() {
  const { account, store } = useDemo();
  const [details, setDetails] = useState(() => ({
    name: '', description: '', email: account.email, address: '', country: '', state: '', city: '',
    ...account.schoolProfile
  }));
  const [message, setMessage] = useState(null);
  const update = event => setDetails(value => ({ ...value, [event.target.name]: event.target.value }));
  const save = async event => {
    event.preventDefault();
    try {
      await store.updateSchoolProfile(details);
      setMessage({ text: 'School details updated.' });
    } catch (error) {
      setMessage({ error: true, text: error.message });
    }
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
    </section>
  );
}
