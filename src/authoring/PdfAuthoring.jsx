import { useEffect, useRef, useState } from 'react';
import { useDemo } from '../portal/DemoContext.jsx';
import { Feedback, Modal } from '../portal/Shared.jsx';
import { getSubjectAssignments, learningClasses } from '../data/learningCatalog.js';
import { beginLoading } from '../loading/loadingState.js';
import { ActivityForm } from './ActivityForm.jsx';
import { ActivityPreview } from './ActivityPreview.jsx';
import { BlobImage } from './useBlobUrl.js';
import { activityTypes, deleteDraftPage, draftBytes, MAX_DRAFT_BYTES } from './project.js';
import { existingKindName, findExistingActivity } from './existingActivities.js';
import { downloadBlob, exportProject, importProject } from './projectArchive.js';
import './authoring.css';

export default function PdfAuthoring() {
  const { bookDraft: draft, setBookDraft, savedBookDraft, setSavedBookDraft, series, customSubjects, subjectAssignments } = useDemo();
  const [selected, setSelected] = useState(1);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(null);
  const [preview, setPreview] = useState(null);
  const [deletePage, setDeletePage] = useState(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const dirty = draft !== savedBookDraft;
  const operation = useRef(null);
  const lastLoading = useRef(null);
  useEffect(() => () => {
    operation.current?.controller.abort();
    operation.current?.finish(true);
    lastLoading.current?.(true);
    operation.current = null;
  }, []);
  const page = draft?.pages.find(item => item.number === selected) || draft?.pages[0];
  const subjects = draft ? getSubjectAssignments(customSubjects, subjectAssignments).filter(item => item.seriesId === draft.seriesId && item.classIds.includes(draft.classId)) : [];
  const activities = draft?.pages.reduce((total, item) => total + item.activities.length, 0) || 0;

  async function perform(label, work) {
    if (operation.current) return;
    lastLoading.current?.(true);
    const active = { controller: new AbortController(), finish: beginLoading(label) };
    lastLoading.current = active.finish;
    operation.current = active; setBusy(label); setMessage(null); setProgress(null);
    try { await work(active.controller.signal, active); }
    catch (error) {
      if (operation.current === active) setMessage({ error: error.name !== 'AbortError', text: error.name === 'AbortError' ? 'Operation cancelled.' : error.message });
    } finally {
      active.finish(active.controller.signal.aborted || operation.current !== active);
      if (operation.current === active) { operation.current = null; setBusy(''); setProgress(null); }
    }
  }
  function update(patch) { setBookDraft(current => current && ({ ...current, ...patch })); }
  function addActivity(activity) {
    if (activity.type === 'existing' && page.activities.some(item => item.templateId === activity.templateId)) throw new Error('This activity is already applied to this page.');
    if (activities >= 1000) throw new Error('This draft already has 1,000 activities. Split it into smaller books.');
    if (draftBytes(draft) + (activity.media?.size || 0) > MAX_DRAFT_BYTES) throw new Error('Draft limit reached (200 MB). Use smaller activity files.');
    setBookDraft(current => current?.id === draft.id ? { ...current, pages: current.pages.map(item => item.number === page.number ? { ...item, activities: [...item.activities, activity] } : item) } : current);
  }
  async function readPdf(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    await perform('Converting PDF pages...', async (signal, active) => {
      const { convertPdf } = await import('./pdfConverter.js');
      const converted = await convertPdf(file, { signal, onProgress: value => { if (operation.current === active) setProgress(value); } });
      if (operation.current !== active || signal.aborted) return;
      setBookDraft(converted); setSelected(1); setPreview(null);
      setMessage({ text: `${converted.pages.length} pages converted to JPEG images. Apply existing activities, then click Update to save.` });
    });
  }
  async function readDraft(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    await perform('Opening draft...', async (signal, active) => {
      const imported = await importProject(file, { signal });
      if (operation.current !== active || signal.aborted) return;
      setBookDraft(imported); setSelected(1); setPreview(null);
      setMessage({ text: 'Draft opened for editing. Click Update to save it, or Cancel to restore your last update.' });
    });
  }
  async function downloadDraft() {
    await perform('Preparing draft download...', async (signal, active) => {
      const blob = await exportProject(savedBookDraft, { signal });
      if (operation.current !== active || signal.aborted) return;
      downloadBlob(blob, `${(savedBookDraft.title || 'book').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80)}-draft.zip`);
      setMessage({ text: 'Draft ZIP downloaded with JPEG pages, activities and project settings. Import it here to continue editing.' });
    });
  }

  async function saveUpdate() {
    const snapshot = draft;
    await perform('Updating book...', async (signal, active) => {
      if (!snapshot) {
        setSavedBookDraft(null);
        setMessage({ text: 'Updated. All pages have been removed from the saved book.' });
        return;
      }
      const blob = await exportProject(snapshot, { signal });
      if (operation.current !== active || signal.aborted) return;
      downloadBlob(blob, `${(snapshot.title || 'book').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80)}-draft.zip`);
      setSavedBookDraft(snapshot);
      setMessage({ text: 'Updated successfully. Changes are saved for this session and an updated ZIP is ready to download.' });
    });
  }
  function cancelEdits() {
    setBookDraft(savedBookDraft); setSelected(1); setPreview(null); setDeletePage(null); setEditorRevision(value => value + 1);
    setMessage({ text: savedBookDraft ? 'Changes cancelled. Your last updated version has been restored.' : 'Upload cancelled. No book has been saved.' });
  }
  function confirmDelete() {
    if (!deletePage || draft?.id !== deletePage.draftId) { setDeletePage(null); return; }
    const updated = deleteDraftPage(draft, deletePage.number);
    setBookDraft(updated); setSelected(Math.min(deletePage.number, updated?.pages.length || 1)); setPreview(null); setEditorRevision(value => value + 1); setDeletePage(null);
    setMessage({ text: `Page ${deletePage.number} removed from the working copy. Click Update to save or Cancel to restore.` });
  }

  return <div className="pdf-authoring-page">
    <a className="school-back" href="#/admin" aria-label="Back to dashboard">&#8592;</a>
    <div className="portal-page-heading"><div><h1>PDF &amp; Activities</h1><p className="portal-muted">Upload a book, select a page, and apply activities from the existing collection.</p></div>{(draft || savedBookDraft || dirty) && <div className="pdf-save-actions"><span className="portal-pill" role="status">{dirty ? 'Unsaved changes' : 'Saved'}</span><button className="portal-primary" disabled={!!busy || !dirty} onClick={saveUpdate}>Update</button><button className="portal-secondary" disabled={!!busy} onClick={cancelEdits}>Cancel</button>{savedBookDraft && <button className="portal-secondary" disabled={!!busy} onClick={downloadDraft}>Download Saved ZIP</button>}</div>}</div>
    <Feedback message={message} />
    <section className="portal-panel pdf-upload-panel" aria-label="Upload PDF or draft">
      <div><h2>Upload your book PDF</h2><p className="portal-muted">PDF pages convert automatically into JPEG images. Up to 50 MB / 200 pages.</p><p className="portal-muted small">Apply existing activities to a page, then click Update to save changes and download an updated ZIP. Cancel restores the last update. Keep your ZIP before refreshing; server upload is not connected.</p></div>
      <div className="pdf-upload-actions"><label className={`portal-primary pdf-upload-label${busy ? ' disabled' : ''}`}>Upload PDF<input type="file" aria-label="Upload book PDF" accept=".pdf,application/pdf" disabled={!!busy} onChange={readPdf} /></label><label className={`portal-secondary pdf-upload-label${busy ? ' disabled' : ''}`}>Import Draft ZIP<input type="file" aria-label="Import draft ZIP" accept=".zip,application/zip" disabled={!!busy} onChange={readDraft} /></label></div>
      {busy && <div className="pdf-conversion-status" role="status"><div><strong>{busy}</strong>{progress && <span>Page {progress.completed} of {progress.total}</span>}</div>{progress && <progress max={progress.total} value={progress.completed} />}<button className="portal-secondary" onClick={() => operation.current?.controller.abort()}>Cancel</button></div>}
    </section>
    {draft ? <>
      <fieldset className="portal-panel pdf-book-details" aria-label="Book details" disabled={!!busy}>
        <label className="portal-field">Book title<input name="bookTitle" value={draft.title} maxLength={200} onChange={event => update({ title: event.target.value })} /></label>
        <label className="portal-field">Series<select name="bookSeries" value={draft.seriesId} onChange={event => update({ seriesId: event.target.value, subjectId: '' })}><option value="">Select series (optional)</option>{series.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="portal-field">Class<select name="bookClass" value={draft.classId} onChange={event => update({ classId: event.target.value, subjectId: '' })}><option value="">Select class (optional)</option>{learningClasses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="portal-field">Subject<select name="bookSubject" disabled={!draft.seriesId || !draft.classId} value={draft.subjectId} onChange={event => update({ subjectId: event.target.value })}><option value="">Select subject (optional)</option>{subjects.map(item => <option key={item.subjectId} value={item.subjectId}>{item.name}</option>)}</select></label>
        <p className="portal-muted small">{draft.pages.length} pages / {activities} activities / {(draftBytes(draft) / 1024 / 1024).toFixed(1)} MB. This is an editing draft; it is not published to the user library.</p>
      </fieldset>
      <div className="pdf-editor-layout" aria-busy={!!busy} inert={!!busy}>
        <nav className="pdf-page-thumbnails" aria-label="Choose a PDF page">{draft.pages.map(item => <button type="button" key={item.number} aria-label={`Select page ${item.number}`} aria-pressed={item.number === page.number} className={item.number === page.number ? 'selected' : ''} onClick={() => { setSelected(item.number); setPreview(null); }}><BlobImage blob={item.thumbnail} alt="" loading="lazy" /><span>Page {item.number}</span>{item.sourcePageNumber && item.sourcePageNumber !== item.number && <small>PDF page {item.sourcePageNumber}</small>}<small>{item.activities.length} activities</small></button>)}</nav>
        <section className="pdf-selected-page" aria-label={`Page ${page.number} editor`}>
          <div className="portal-page-heading"><h2>Page {page.number}</h2><a className="portal-textlink pdf-text-button" href="#" onClick={event => { event.preventDefault(); downloadBlob(page.image, `page-${String(page.number).padStart(3, '0')}.jpg`); }}>Download JPEG</a></div>
          <div className="pdf-page-navigation"><button className="portal-secondary" disabled={page.number === 1} onClick={() => setSelected(page.number - 1)}>Previous</button><label>Page<select aria-label="Jump to page" value={page.number} onChange={event => setSelected(Number(event.target.value))}>{draft.pages.map(item => <option key={item.number} value={item.number}>{item.number}</option>)}</select></label><button className="portal-secondary" disabled={page.number === draft.pages.length} onClick={() => setSelected(page.number + 1)}>Next</button></div>
          <div className="pdf-page-delete"><button type="button" className="portal-secondary pdf-danger" onClick={() => setDeletePage({ draftId: draft.id, number: page.number, count: page.activities.length })}>Delete Page</button></div>
          <div className="pdf-page-image"><BlobImage blob={page.image} alt={`Converted PDF page ${page.number}`} /></div>
          <section className="portal-panel pdf-saved-activities"><h2>Activities on page {page.number}</h2>{page.activities.length ? <ul>{page.activities.map(item => <li key={item.id}><div><strong>{item.title}</strong><span className="portal-muted small">{item.type === 'existing' ? existingKindName(findExistingActivity(item.templateId)?.kind) : activityTypes.find(type => type.id === item.type)?.name}{item.sourceName ? ` / ${item.sourceName}` : ''}</span></div><div><button className="portal-secondary" onClick={() => setPreview(item)}>Preview</button><button className="portal-secondary" aria-label={`Remove ${item.title}`} onClick={() => setBookDraft(current => ({ ...current, pages: current.pages.map(p => p.number === page.number ? { ...p, activities: p.activities.filter(a => a.id !== item.id) } : p) }))}>Remove</button></div></li>)}</ul> : <p className="portal-muted">No activities applied yet. Select an existing activity and click Apply Activity.</p>}</section>
        </section>
        <ActivityForm key={`${draft.id}/${page.number}/${editorRevision}`} onAdd={addActivity} appliedActivities={page.activities} pageNumber={page.number} />
      </div>
      {preview && <ActivityPreview key={preview.id} activity={preview} page={page} onClose={() => setPreview(null)} />}
    </> : <section className="portal-empty"><h2>{dirty ? 'All pages removed' : 'Start with a PDF'}</h2><p>{dirty ? 'Click Update to confirm removal, or Cancel to restore your last saved version.' : 'Upload your book to see its pages here. Then select and apply activities from the existing collection to each page.'}</p></section>}
    {deletePage && <Modal title={`Delete page ${deletePage.number}?`} onClose={() => setDeletePage(null)}><p>This removes the page{deletePage.count ? ` and its ${deletePage.count} activities` : ''} from your working copy.</p><p className="portal-muted">Click Update afterwards to save the deletion. Cancel restores the last updated book.</p><div className="portal-actions"><button className="portal-secondary" onClick={() => setDeletePage(null)}>Keep Page</button><button className="portal-primary pdf-danger" onClick={confirmDelete}>Delete Page</button></div></Modal>}
  </div>;
}
