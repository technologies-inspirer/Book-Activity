import { useRef, useEffect, useState } from 'react';
import { learningClasses } from '../data/learningCatalog.js';
import { subjectKey } from '../data/schoolAccess.js';
import { Modal } from './Shared.jsx';

function SelectAll({ options, selected, onChange }) {
  const ref = useRef(null);
  const count = options.filter(item => selected.includes(subjectKey(item))).length;
  useEffect(() => { ref.current.indeterminate = count > 0 && count < options.length; }, [count, options.length]);
  return <input ref={ref} type="checkbox" aria-label="Select all visible subjects" disabled={!options.length} checked={!!options.length && count === options.length} onChange={event => onChange(event.target.checked ? [...new Set([...selected, ...options.map(subjectKey)])] : selected.filter(key => !options.some(item => subjectKey(item) === key)))} />;
}
function AssignSchoolSubjects({ classItem, choices, series, value, onSave, onClose }) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(value.map(subjectKey));
  const options = choices.filter(item => item.classId === classItem.id);
  const visible = options.filter(item => !filter || item.seriesId === filter);
  const availableSeries = series.filter(item => options.some(row => row.seriesId === item.id));
  return <Modal title={`Assign Subjects — ${classItem.name}`} onClose={onClose}>
    <div className="school-subject-dialog"><p className="school-edit-hint">Select series</p><div className="school-subject-series" role="group" aria-label="Filter subjects by series">{[{ id: '', name: 'All Series' }, ...availableSeries].map(item => <button type="button" key={item.id} className={filter === item.id ? 'selected' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.name}</button>)}</div>
      <div className="school-subject-table-wrap"><table><thead><tr><th><label><SelectAll options={visible} selected={selected} onChange={setSelected} />Select All</label></th><th>Publisher</th><th>Series</th></tr></thead><tbody>{visible.map(item => {
        const key = subjectKey(item);
        return <tr key={key}><td><label><input type="checkbox" checked={selected.includes(key)} onChange={event => setSelected(event.target.checked ? [...selected, key] : selected.filter(id => id !== key))} /><bdi>{item.name}</bdi></label></td><td>Javed Publishers</td><td>{series.find(s => s.id === item.seriesId)?.name}</td></tr>;
      })}{!visible.length && <tr><td colSpan={3}>No subjects assigned to this class yet.</td></tr>}</tbody></table></div>
      <div className="portal-actions"><button type="button" className="portal-secondary" onClick={onClose}>Cancel</button><button type="button" className="portal-primary" onClick={() => { onSave(options.filter(item => selected.includes(subjectKey(item))).map(({ seriesId, subjectId }) => ({ seriesId, subjectId }))); onClose(); }}>Apply Selection</button></div><p className="school-edit-hint">Click Save Changes on the school page to save these permissions.</p>
    </div>
  </Modal>;
}
export function SchoolClassAccess({ value, onChange, choices, series, disabled }) {
  const [editing, setEditing] = useState(null);
  return <section className="school-class-access" aria-labelledby="school-classes-title"><h2 id="school-classes-title">Classes</h2>
    <div className="school-class-table-wrap"><table><thead><tr><th>Class</th><th>Subjects</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{learningClasses.map(item => {
      const row = value.find(row => row.classId === item.id);
      const available = choices.filter(subject => subject.classId === item.id);
      return <tr key={item.id}><td><label><input type="checkbox" aria-label={`Allow ${item.name}`} disabled={disabled || (!available.length && !row)} checked={!!row} onChange={event => onChange(event.target.checked ? [...value, { classId: item.id, subjects: available.map(({ seriesId, subjectId }) => ({ seriesId, subjectId })) }] : value.filter(row => row.classId !== item.id))} />{item.name}</label></td><td><div className="school-subject-badges">{row?.subjects.map(subject => <button type="button" className="school-subject-badge" key={subjectKey(subject)} disabled={disabled} onClick={() => setEditing(item)}><span aria-hidden="true">&#10003;</span><bdi>{choices.find(option => option.classId === item.id && subjectKey(option) === subjectKey(subject))?.name || subject.subjectId}</bdi> <span>(Javed Publishers, {series.find(s => s.id === subject.seriesId)?.name || subject.seriesId})</span></button>)}{!row?.subjects.length && <span className="school-class-empty">{available.length ? 'No subjects selected' : 'No subjects available'}</span>}</div></td><td><button type="button" className="school-class-assign" disabled={disabled || !available.length} onClick={() => setEditing(item)} aria-label={`Assign subjects to ${item.name}`}>Assign Subjects</button></td></tr>;
    })}</tbody></table></div>
    {editing && <AssignSchoolSubjects classItem={editing} choices={choices} series={series} value={value.find(row => row.classId === editing.id)?.subjects || []} onClose={() => setEditing(null)} onSave={subjects => onChange([...value.filter(row => row.classId !== editing.id), { classId: editing.id, subjects }])} />}
  </section>;
}
