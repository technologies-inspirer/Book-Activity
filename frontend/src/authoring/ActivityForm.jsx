import { useState } from 'react';
import { books } from '../data/books.js';
import { existingActivities } from './activityCatalogue.js';
import { applyExistingActivity, existingActivityKinds, existingKindName } from './existingActivities.js';
import { ExistingActivityPreview } from './ExistingActivityPreview.jsx';
import { Feedback } from '../portal/Shared.jsx';

export function ActivityForm({ onAdd, appliedActivities = [], pageNumber }) {
  const [bookId, setBookId] = useState('');
  const [kind, setKind] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState(null);
  const options = existingActivities.filter(item => item.bookId === bookId && (!kind || item.kind === kind) && `${item.title} ${item.pageNumber || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = options.find(item => item.id === selectedId);
  const applied = selected && appliedActivities.some(item => item.type === 'existing' && item.templateId === selected.id);
  function apply(event) {
    event.preventDefault();
    try {
      if (applied) throw new Error('This activity is already applied to this page.');
      onAdd(applyExistingActivity(selected?.id));
      setMessage({ text: `Activity applied to PDF page ${pageNumber}. Click Update to save.` });
    } catch (error) { setMessage({ error: true, text: error.message }); }
  }
  return <section className="portal-panel pdf-activity-form existing-activity-picker">
    <p className="portal-eyebrow">PDF page {pageNumber}</p>
    <h2>Apply Existing Activity</h2>
    <p className="portal-muted small">Select a book and an activity from the current collection. Existing activities keep their original artwork, audio and answers.</p>
    <Feedback message={message} />
    <form onSubmit={apply}>
      <label className="portal-field">Source book<select name="existingBook" value={bookId} onChange={event => { setBookId(event.target.value); setSelectedId(''); setMessage(null); }}><option value="">Select an existing book</option>{books.filter(book => existingActivities.some(item => item.bookId === book.id)).map(book => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
      <label className="portal-field">Activity type<select name="existingKind" value={kind} onChange={event => { setKind(event.target.value); setSelectedId(''); setMessage(null); }}><option value="">All existing types</option>{existingActivityKinds.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="portal-field">Search activities<input name="existingSearch" placeholder="Activity name or source page" value={search} onChange={event => { setSearch(event.target.value); setSelectedId(''); }} /></label>
      <div className="existing-activity-results" role="group" aria-label="Existing activities">
        {!bookId ? <p className="portal-muted">Choose a source book to see its existing activities.</p> : !options.length ? <p className="portal-muted">No existing activities match this selection.</p> : options.map(item => <button key={item.id} type="button" className={`existing-activity-option${selected?.id === item.id ? ' selected' : ''}`} aria-pressed={selected?.id === item.id} onClick={() => { setSelectedId(item.id); setMessage(null); }}><img src={`${import.meta.env.BASE_URL}${item.image}`} alt="" loading="lazy" /><span><strong>{item.title}</strong><small>{existingKindName(item.kind)} / {item.pageNumber ? `Page ${item.pageNumber}` : 'Original recording'}</small></span></button>)}
      </div>
      {bookId && <p className="portal-muted small">{options.length} existing activities</p>}
      {selected && <p className="existing-activity-selection"><strong>Selected: {selected.title}</strong><span>Apply to PDF page {pageNumber}</span></p>}
      <div className="portal-actions"><button type="button" className="portal-secondary" disabled={!selected} onClick={() => setPreview(selected)}>Preview</button><button className="portal-primary" disabled={!selected || applied}>{applied ? 'Already Applied' : 'Apply Activity'}</button></div>
    </form>
    {preview && <ExistingActivityPreview template={preview} onClose={() => setPreview(null)} />}
  </section>;
}
