import { ResponsiveTable } from './ResponsiveTable.jsx';
import { useState } from 'react';
import { getSubjectAssignments, learningClasses } from '../data/learningCatalog.js';
import { useDemo } from './DemoContext.jsx';
import { Feedback, Modal } from './Shared.jsx';

const emptyFilters = { publisher: 'Javed Publishers', seriesId: '', subjectId: '', classId: '' };

function AssignmentDialog({ rows, series, initial, onClose, onSaved }) {
  const { store } = useDemo();
  const [seriesId, setSeriesId] = useState(initial?.seriesId || '');
  const [subjectId, setSubjectId] = useState(initial?.subjectId || '');
  const [classIds, setClassIds] = useState(initial?.classIds || []);
  const [message, setMessage] = useState(null);
  const subjects = rows.filter(row => row.seriesId === seriesId);
  function chooseSubject(value) {
    setSubjectId(value);
    setClassIds(subjects.find(row => row.subjectId === value)?.classIds || []);
  }
  function save(event) {
    event.preventDefault();
    try {
      store.assignSubjectClasses({ seriesId, subjectId, classIds });
      onSaved('Subject assignments saved. The user library now uses these class selections.');
      onClose();
    } catch (error) { setMessage({ error: true, text: error.message }); }
  }
  return <Modal title={initial ? 'Edit assigned classes' : 'Assign subject to classes'} onClose={onClose}>
    <form onSubmit={save}>
      <Feedback message={message} />
      <label className="portal-field">Publisher<input value="Javed Publishers" readOnly /></label>
      <label className="portal-field">Series<select name="assignmentSeries" required value={seriesId} disabled={!!initial} onChange={event => { setSeriesId(event.target.value); setSubjectId(''); setClassIds([]); }}><option value="" disabled>Select a series</option>{series.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label className="portal-field">Subject<select name="assignmentSubject" required value={subjectId} disabled={!!initial || !seriesId} onChange={event => chooseSubject(event.target.value)}><option value="" disabled>Select a subject</option>{subjects.map(row => <option key={row.subjectId} value={row.subjectId}>{row.name}</option>)}</select></label>
      {seriesId && !subjects.length && <p className="portal-muted">No subjects in this series yet. <a className="portal-textlink" href="#/admin/subjects-books">Create a subject first</a>.</p>}
      <fieldset className="assignment-class-fieldset"><legend>Assigned classes</legend>
        <div className="assignment-class-options">{learningClasses.map(item => <label key={item.id}><input type="checkbox" name="assignmentClasses" value={item.id} checked={classIds.includes(item.id)} onChange={event => setClassIds(event.target.checked ? [...classIds, item.id] : classIds.filter(id => id !== item.id))} />{item.name}</label>)}</div>
      </fieldset>
      <p className="portal-muted small">Clear all classes to unassign this subject. Assigning a subject does not copy its books into another class.</p>
      <div className="portal-actions"><button type="button" className="portal-secondary" onClick={onClose}>Cancel</button><button className="portal-primary" disabled={!subjectId}>Save assignments</button></div>
    </form>
  </Modal>;
}

export function AssignSubjects() {
  const { series, customSubjects, subjectAssignments } = useDemo();
  const rows = getSubjectAssignments(customSubjects, subjectAssignments);
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialog, setDialog] = useState(null);
  const [message, setMessage] = useState(null);
  const subjectOptions = rows.filter(row => !filters.seriesId || row.seriesId === filters.seriesId);
  const uniqueSubjects = [...new Map(subjectOptions.map(row => [row.subjectId, row])).values()];
  const filtered = rows.filter(row => 'javed publishers'.includes(applied.publisher.trim().toLowerCase()) && (!applied.seriesId || row.seriesId === applied.seriesId) && (!applied.subjectId || row.subjectId === applied.subjectId) && (!applied.classId || row.classIds.includes(applied.classId)));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const shown = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const set = patch => setFilters({ ...filters, ...patch });

  return <div className="assignment-page">
    <a className="school-back" href="#/admin" aria-label="Back to dashboard">&#8592;</a>
    <div className="portal-page-heading"><div><h1>Assign Subject to Classes</h1><p className="portal-muted">Manage and assign subjects to classes</p></div><button className="portal-primary" onClick={() => setDialog({})}>+ Add</button></div>
    <Feedback message={message} />
    <form className="assignment-filters" onSubmit={event => { event.preventDefault(); setApplied({ ...filters }); setPage(1); }}>
      <label className="portal-field">Publisher<input name="publisher" value={filters.publisher} onChange={event => set({ publisher: event.target.value })} /></label>
      <label className="portal-field">Series<select name="seriesFilter" value={filters.seriesId} onChange={event => set({ seriesId: event.target.value, subjectId: '' })}><option value="">All series</option>{series.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label className="portal-field">Subjects<select name="subjectFilter" value={filters.subjectId} onChange={event => set({ subjectId: event.target.value })}><option value="">All subjects</option>{uniqueSubjects.map(row => <option key={row.subjectId} value={row.subjectId}>{row.name}</option>)}</select></label>
      <label className="portal-field">Classes<select name="classFilter" value={filters.classId} onChange={event => set({ classId: event.target.value })}><option value="">All classes</option>{learningClasses.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <div className="assignment-search"><button type="button" className="portal-secondary" onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); setPage(1); }}>Reset</button><button className="portal-primary">Search</button></div>
    </form>
    <ResponsiveTable className="assignment-table" label="Subjects and assigned classes"><table><caption className="sr-only">Subjects and their assigned classes</caption><thead><tr><th scope="col">Actions</th><th scope="col">Publisher</th><th scope="col">Series</th><th scope="col">Subject</th><th scope="col">Assigned Classes</th></tr></thead><tbody>
      {shown.map(row => <tr key={`${row.seriesId}/${row.subjectId}`}><td><button className="portal-secondary assignment-edit" aria-label={`Edit classes for ${row.name} in ${series.find(item => item.id === row.seriesId)?.name}`} onClick={() => setDialog({ initial: row })}>Edit classes</button></td><td>Javed Publishers</td><td>{series.find(item => item.id === row.seriesId)?.name}</td><td>{row.name}</td><td><div className="assignment-badges">{learningClasses.filter(item => row.classIds.includes(item.id)).map(item => <span className="portal-pill" key={item.id}>&#10003; {item.name}</span>)}{!row.classIds.length && <span className="portal-muted">No classes assigned</span>}</div></td></tr>)}
      {!shown.length && <tr><td colSpan={5} className="assignment-no-results">No assignments match your filters.</td></tr>}
    </tbody></table></ResponsiveTable>
    <div className="assignment-pagination"><div><button type="button" className="portal-secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span aria-live="polite">Page {currentPage} of {pages}</span><button type="button" className="portal-secondary" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div><label>Show<select aria-label="Rows per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}</select><span>{filtered.length} results</span></label></div>
    <p className="portal-muted small">Assignments are saved in this browser when local storage is available.</p>
    {dialog && <AssignmentDialog rows={rows} series={series} initial={dialog.initial} onClose={() => setDialog(null)} onSaved={text => setMessage({ text })} />}
  </div>;
}
