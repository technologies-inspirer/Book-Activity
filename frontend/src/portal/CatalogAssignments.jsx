import { useState } from 'react';
import { getSubjectAssignments, learningClasses, learningSubjects } from '../data/learningCatalog.js';
import { useDemo } from './DemoContext.jsx';
import { useToast } from './ToastProvider.jsx';

export function CatalogAssignments({ subjects = false }) {
  const { series, seriesClasses, customSubjects, subjectAssignments, store } = useDemo();
  const notify = useToast();
  const [seriesId, setSeriesId] = useState('');
  const [classId, setClassId] = useState('');
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [savedSelection, setSavedSelection] = useState({ seriesId: '', classId: '', selected: [] });
  const rows = getSubjectAssignments(customSubjects, subjectAssignments);
  const classes = learningClasses.filter(item => seriesClasses.find(row => row.seriesId === seriesId)?.classIds.includes(item.id));
  function chooseSeries(id) { setSeriesId(id); setClassId(''); setSelected(subjects ? [] : seriesClasses.find(row => row.seriesId === id)?.classIds || []); }
  function chooseClass(id) { setClassId(id); setSelected(rows.filter(row => row.seriesId === seriesId && row.classIds.includes(id)).map(row => row.subjectId)); }
  const choices = subjects ? learningSubjects : learningClasses;
  const ready = seriesId && (!subjects || classId);
  return <section className="portal-panel catalog-assignment-panel">
    <p className="portal-eyebrow">Library management</p><h1>Assign {subjects ? 'Subjects' : 'Classes'}</h1>
    <p className="portal-muted">{subjects ? 'Choose a series and class, then select its subjects.' : 'Choose a series, then assign its classes from Play Group to Class 8.'}</p>
    <form onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true);
      try {
        if (subjects) await store.assignClassSubjects({ seriesId, classId, subjectIds: selected });
        else await store.assignSeriesClasses({ seriesId, classIds: selected });
        setSavedSelection({ seriesId, classId, selected: [...selected] });
        notify({ text: `${subjects ? 'Subjects' : 'Classes'} assigned successfully. School libraries are updated.` });
      } catch (error) { notify({ error: true, text: error.message }); } finally { setBusy(false); }
    }}>
      <div className="school-edit-grid"><label className="portal-field">Series<select required disabled={busy} value={seriesId} onChange={event => chooseSeries(event.target.value)}><option value="">Select series</option>{series.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {subjects && <label className="portal-field">Class<select required disabled={busy || !seriesId} value={classId} onChange={event => chooseClass(event.target.value)}><option value="">Select class</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}</div>
      {subjects && seriesId && !classes.length && <p className="portal-muted">Assign classes to this series first. <a href="#/admin/classes">Assign Classes</a></p>}
      <fieldset disabled={!ready || busy} className="assignment-class-fieldset"><legend>{subjects ? 'Subjects' : 'Classes'}</legend><div className="assignment-class-options">{choices.map(item => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={event => setSelected(event.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id))} />{item.name}</label>)}</div></fieldset>
      <p className="portal-muted small">Removing a selection hides it from the library. Saved books are kept. Schools see the series allowed on their account.</p>
      <div className="portal-actions"><button type="button" className="portal-secondary" disabled={!ready || busy} onClick={() => setSelected(choices.map(item => item.id))}>Select All</button><button className="portal-primary" disabled={!ready || busy}>{busy ? 'Saving...' : 'Save Changes'}</button><button type="button" className="portal-secondary" disabled={busy} onClick={() => { setSeriesId(savedSelection.seriesId); setClassId(savedSelection.classId); setSelected([...savedSelection.selected]); notify({ text: 'Changes cancelled. Previous selections restored.' }); }}>Cancel</button></div>
    </form>
    <div className="catalog-series-summary">{(subjects ? classes : series).map(item => <article key={item.id}><h3>{item.name}</h3><div className="assignment-badges">{(subjects ? rows.filter(row => row.seriesId === seriesId && row.classIds.includes(item.id)) : learningClasses.filter(c => seriesClasses.find(row => row.seriesId === item.id)?.classIds.includes(c.id))).map(choice => <span className="portal-pill" key={choice.subjectId || choice.id}>{choice.name}</span>)}</div></article>)}</div>
  </section>;
}
