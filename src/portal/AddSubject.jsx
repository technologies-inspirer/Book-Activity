import { useState } from 'react';
import { getSubjectAssignments, learningClasses } from '../data/learningCatalog.js';
import { useDemo } from './DemoContext.jsx';
import { Feedback, Modal } from './Shared.jsx';
import { CatalogPage } from './CatalogPage.jsx';

function CreateSubjectDialog({ onClose, onSaved }) {
  const { store, series } = useDemo();
  const [name, setName] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [classId, setClassId] = useState('');
  const [feedback, setFeedback] = useState(null);
  function submit(event) {
    event.preventDefault();
    try {
      const created = store.createSubject({ name, classId, seriesId });
      onSaved(`${created.name} created. Readers can now select it in the chosen class and series.`);
      onClose();
    } catch (error) { setFeedback({ text: error.message, error: true }); }
  }
  return <Modal title="Add New Subject" onClose={onClose}>
      <form onSubmit={submit}>
        <Feedback message={feedback} />
        <label className="portal-field">Publisher<input value="Javed Publishers" readOnly /></label>
        <label className="portal-field">Series<select name="seriesId" value={seriesId} onChange={event => setSeriesId(event.target.value)} required><option value="" disabled>Select a series</option>{series.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="portal-field">Class<select name="classId" value={classId} onChange={event => setClassId(event.target.value)} required><option value="" disabled>Select a class</option>{learningClasses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="portal-field">Subject name<input name="name" value={name} onChange={event => setName(event.target.value)} maxLength={100} required placeholder="e.g. General Knowledge" /></label>
        <p className="portal-muted small">New subjects start without books. You can find them in Explore Books under the selected class and series.</p>
        <div className="portal-actions"><button type="button" className="portal-secondary" onClick={onClose}>Cancel</button><button type="submit" className="portal-primary">Create Subject</button></div>
      </form>
  </Modal>;
}

export function AddSubject() {
  const { series, customSubjects, subjectAssignments } = useDemo();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const rows = getSubjectAssignments(customSubjects, subjectAssignments).map(row => ({ ...row, key: `${row.seriesId}/${row.subjectId}`, seriesName: series.find(item => item.id === row.seriesId)?.name }));
  const fields = [
    { id: 'publisher', label: 'Publisher', initial: 'Javed Publishers' },
    { id: 'seriesId', label: 'Series', placeholder: 'All series', options: series },
    { id: 'name', label: 'Subject', placeholder: 'Search subject name' },
    { id: 'classId', label: 'Classes', placeholder: 'All classes', options: learningClasses }
  ];
  const columns = [
    { id: 'publisher', label: 'Publisher', render: () => 'Javed Publishers' },
    { id: 'seriesName', label: 'Series' },
    { id: 'name', label: 'Subject' },
    { id: 'classIds', label: 'Assigned Classes', render: row => <div className="assignment-badges">{learningClasses.filter(item => row.classIds.includes(item.id)).map(item => <span className="portal-pill" key={item.id}>&#10003; {item.name}</span>)}{!row.classIds.length && <span className="portal-muted">No classes assigned</span>}</div> }
  ];
  const matches = (row, filters) => 'javed publishers'.includes(filters.publisher.trim().toLowerCase()) && (!filters.seriesId || row.seriesId === filters.seriesId) && row.name.toLowerCase().includes(filters.name.trim().toLowerCase()) && (!filters.classId || row.classIds.includes(filters.classId));
  return <CatalogPage title="Add New Subject" description="Manage subjects across your series and classes" fields={fields} columns={columns} rows={rows} matches={matches} onAdd={() => setOpen(true)} message={message} emptyText="No subjects match your filters.">
    {open && <CreateSubjectDialog onClose={() => setOpen(false)} onSaved={text => setMessage({ text })} />}
  </CatalogPage>;
}
