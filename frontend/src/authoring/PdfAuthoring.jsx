import { useEffect, useRef, useState } from 'react';
import { useDemo } from '../portal/DemoContext.jsx';
import { Feedback, Modal } from '../portal/Shared.jsx';
import { books } from '../data/books.js';
import { DraftBookReader } from './DraftBookReader.jsx';
import { buildKnownLessonLinks } from './readerBook.js';
import './activityCatalogue.js';
import { beginLoading } from '../loading/loadingState.js';
import { ActivityPreview } from './ActivityPreview.jsx';
import { BlobImage } from './useBlobUrl.js';
import { deleteDraftPage, draftBytes, updateDraftPage } from './project.js';
import { PageActivityLayout } from './PageActivityLayout.jsx';
import { ActivityForm } from './ActivityForm.jsx';
import { UploadedActivityForm } from './UploadedActivityForm.jsx';
import { getLearningSubjects, getSubjectAssignments, learningClasses, learningSubjects } from '../data/learningCatalog.js';
import { downloadBlob, exportProject, importProject } from './projectArchive.js';
import './authoring.css';

export default function PdfAuthoring() {
  const { bookDraft: draft, setBookDraft, savedBookDraft, setSavedBookDraft, series, customSubjects, subjectAssignments, seriesClasses, store, publishedBooks } = useDemo();
  const [selected, setSelected] = useState(1);
  const [uploadSelection, setUploadSelection] = useState(() => ({ seriesId: draft?.seriesId || '', classId: draft?.classId || '', subjectId: draft?.subjectId || '' }));
  const [message, setMessage] = useState(null);
  const [savedUploadSelection, setSavedUploadSelection] = useState(() => ({ seriesId: savedBookDraft?.seriesId || '', classId: savedBookDraft?.classId || '', subjectId: savedBookDraft?.subjectId || '' }));
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(null);
  const [preview, setPreview] = useState(null);
  const [deletePage, setDeletePage] = useState(null);
  const [readerOpen, setReaderOpen] = useState(!!draft);
  const [editing, setEditing] = useState(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [activitySource, setActivitySource] = useState('upload');
  const editorRef = useRef(null);
  const dirty = draft !== savedBookDraft;
  const uploadSelectionDirty = ['seriesId', 'classId', 'subjectId'].some(key => uploadSelection[key] !== savedUploadSelection[key]);
  const operation = useRef(null);
  const lastLoading = useRef(null);
  useEffect(() => () => {
    operation.current?.controller.abort();
    operation.current?.finish(true);
    lastLoading.current?.(true);
    operation.current = null;
  }, []);
  const page = draft?.pages.find(item => item.number === selected) || draft?.pages[0];
  const activities = draft?.pages.reduce((total, item) => total + item.activities.length, 0) || 0;
  const subjectChoices = getLearningSubjects(books, customSubjects, { classId: draft?.classId, seriesId: draft?.seriesId }, subjectAssignments);
  const classChoices = learningClasses.filter(item => seriesClasses.find(row => row.seriesId === draft?.seriesId)?.classIds.includes(item.id));
  const uploadSeries = series.find(item => item.id === uploadSelection.seriesId);
  const uploadClasses = learningClasses.filter(item => seriesClasses.find(row => row.seriesId === uploadSelection.seriesId)?.classIds.includes(item.id));
  const uploadClass = uploadClasses.find(item => item.id === uploadSelection.classId);
  const uploadSubjects = getSubjectAssignments(customSubjects, subjectAssignments).filter(row => row.seriesId === uploadSelection.seriesId && row.classIds.includes(uploadSelection.classId));
  const uploadSubject = uploadSubjects.find(item => item.subjectId === uploadSelection.subjectId);
  const uploadReady = !!(uploadSeries && uploadClass && uploadSubject);
  const destinationText = `${uploadSeries?.name || 'Select series'} / ${uploadClass?.name || 'Select class'} / ${uploadSubject?.name || 'Select subject'}`;


  function changePage(patch) {
    const updated = updateDraftPage(draft, page.number, patch);
    setBookDraft(updated);
    return updated;
  }
  function saveActivity(activity) {
    const editingLink = editing?.pageNumber === page.number && Number.isInteger(editing.embeddedIndex);
    const next = editing && editing.pageNumber === page.number && !editingLink
      ? page.activities.map(item => item.id === editing.activity.id ? activity : item)
      : [...page.activities, activity];
    changePage({ activities: next, ...(editingLink ? { embeddedVideos: page.embeddedVideos.filter((_, index) => index !== editing.embeddedIndex) } : {}) });
    setEditing(null);
  }
  function customize() {
    setReaderOpen(false);
    requestAnimationFrame(() => { editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); editorRef.current?.focus({ preventScroll: true }); });
  }

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
  async function readPdf(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!uploadReady) { setMessage({ error: true, text: 'Select a series, class and subject before uploading a PDF.' }); return; }
    const destination = { ...uploadSelection };
    await perform('Converting PDF pages...', async (signal, active) => {
      const { convertPdf } = await import('./pdfConverter.js');
      const lessonLinks = buildKnownLessonLinks(books);
      const converted = await convertPdf(file, { signal, lessonLinks, originalBooks: books, onProgress: value => { if (operation.current === active) setProgress(value); } });
      if (operation.current !== active || signal.aborted) return;
      setBookDraft({ ...converted, ...destination }); setSelected(1); setPreview(null); setEditing(null); setReaderOpen(false);
      setMessage({ text: `${converted.pages.length} pages ready for ${destinationText}. Apply page activities, then click Save Changes.` });
    });
  }
  async function readDraft(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!uploadReady) { setMessage({ error: true, text: 'Select a series, class and subject before importing a draft.' }); return; }
    const destination = { ...uploadSelection };
    await perform('Opening draft...', async (signal, active) => {
      const imported = await importProject(file, { signal });
      if (operation.current !== active || signal.aborted) return;
      setBookDraft({ ...imported, ...destination }); setSelected(1); setPreview(null); setEditing(null); setReaderOpen(false);
      setMessage({ text: `Draft opened for ${destinationText}. Review activities, then click Save Changes.` });
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
        throw new Error('A published book needs at least one page. Cancel to restore your saved book.');
      }
      if (!snapshot.seriesId || !snapshot.classId || !snapshot.subjectId) throw new Error('Select an assigned series, class and subject before publishing.');
      if (!snapshot.title.trim()) throw new Error('Enter a book title before saving.');
      const blob = await exportProject(snapshot, { signal });
      if (operation.current !== active || signal.aborted) return;
      const publishedId = await store.publishBook(blob, snapshot.publishedId);
      const saved = { ...snapshot, publishedId };
      setBookDraft(saved); setSavedBookDraft(saved);
      const destination = { seriesId: saved.seriesId, classId: saved.classId, subjectId: saved.subjectId };
      setUploadSelection(destination); setSavedUploadSelection(destination);
      setMessage({ text: 'Book published successfully. Pages and activities are saved in the database and available to permitted school accounts.' });
    });
  }
  function cancelEdits() {
    setUploadSelection({ ...savedUploadSelection });
    setEditorRevision(value => value + 1);
    setBookDraft(savedBookDraft); setSelected(1); setPreview(null); setEditing(null); setDeletePage(null); setReaderOpen(open => open && !!savedBookDraft);
    setMessage({ text: savedBookDraft ? 'Changes cancelled. Your last updated version has been restored.' : 'Upload cancelled. No book has been saved.' });
  }
  function confirmDelete() {
    if (!deletePage || draft?.id !== deletePage.draftId) { setDeletePage(null); return; }
    const updated = deleteDraftPage(draft, deletePage.number);
    setBookDraft(updated); setSelected(Math.min(deletePage.number, updated?.pages.length || 1)); setPreview(null); setEditing(null); setDeletePage(null);
    setMessage({ text: `Page ${deletePage.number} removed from the working copy. Click Save Changes to save or Cancel to restore.` });
  }

  return <div className="pdf-authoring-page">
    <a className="school-back" href="#/admin" aria-label="Back to dashboard">&#8592;</a>
    <div className="portal-page-heading"><div><h1>PDF &amp; Activities</h1><p className="portal-muted">Choose its library location, upload a PDF, then add page activities.</p></div>{(draft || savedBookDraft || dirty || uploadSelectionDirty) && <div className="pdf-save-actions"><span className="portal-pill" role="status">{dirty || uploadSelectionDirty ? 'Unsaved changes' : 'Saved'}</span><button className="portal-primary" disabled={!!busy || !draft || !dirty} onClick={saveUpdate}>{busy ? 'Saving...' : 'Save Changes'}</button><button className="portal-secondary" disabled={!!busy} onClick={cancelEdits}>Cancel</button>{savedBookDraft && <button className="portal-secondary" disabled={!!busy} onClick={downloadDraft}>Download Saved ZIP</button>}</div>}</div>
    <Feedback message={message} />
    <section className="portal-panel pdf-upload-panel" aria-label="Choose PDF destination and upload">
      <div className="pdf-upload-intro"><h2>Choose where this book belongs</h2><p className="portal-muted">Select the series, class and subject first, then upload its PDF.</p></div>
      <fieldset className="pdf-upload-destination" disabled={!!busy}><legend className="sr-only">Book destination</legend>
        <label className="portal-field"><span>1. Series</span><select value={uploadSelection.seriesId} onChange={event => setUploadSelection({ seriesId: event.target.value, classId: '', subjectId: '' })}><option value="">Select series</option>{series.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="portal-field"><span>2. Class</span><select disabled={!uploadSeries} value={uploadSelection.classId} onChange={event => setUploadSelection({ ...uploadSelection, classId: event.target.value, subjectId: '' })}><option value="">Select class</option>{uploadClasses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="portal-field"><span>3. Subject</span><select disabled={!uploadClass} value={uploadSelection.subjectId} onChange={event => setUploadSelection({ ...uploadSelection, subjectId: event.target.value })}><option value="">Select subject</option>{uploadSubjects.map(item => <option key={item.subjectId} value={item.subjectId}>{item.name}</option>)}</select></label>
      </fieldset>
      {uploadSeries && !uploadClasses.length && <p className="portal-muted small">This series has no assigned classes. Assign its classes from the sidebar first.</p>}
      {uploadClass && !uploadSubjects.length && <p className="portal-muted small">This class has no assigned subjects. Assign its subjects from the sidebar first.</p>}
      <div className={`pdf-destination-summary${uploadReady ? ' is-ready' : ''}`}><span>{uploadReady ? 'This PDF will belong to' : 'Complete the selection to upload'}</span><strong>{destinationText}</strong><p>{uploadReady ? 'After publishing, permitted school accounts will find this book here in their library.' : 'Upload becomes available after all three selections.'}</p></div>
      <div className="pdf-upload-footer"><div><p className="portal-muted small">PDF limit: 50 MB / 200 pages.</p><p className="portal-muted small">Upload prepares the book for editing. Click Save Changes to publish it to the selected location.</p></div><div className="pdf-upload-actions"><label className={`portal-primary pdf-upload-label${busy || !uploadReady ? ' disabled' : ''}`} aria-disabled={!!busy || !uploadReady}>Upload PDF<input type="file" aria-label="Upload book PDF" accept=".pdf,application/pdf" disabled={!!busy || !uploadReady} onChange={readPdf} /></label><label className={`portal-secondary pdf-upload-label${busy || !uploadReady ? ' disabled' : ''}`} aria-disabled={!!busy || !uploadReady}>Import Draft ZIP<input type="file" aria-label="Import draft ZIP" accept=".zip,application/zip" disabled={!!busy || !uploadReady} onChange={readDraft} /></label></div></div>
      {busy && <div className="pdf-conversion-status" role="status"><div><strong>{busy}</strong>{progress && <span>Page {progress.completed} of {progress.total}</span>}</div>{progress && <progress max={progress.total} value={progress.completed} />}<button className="portal-secondary" onClick={() => operation.current?.controller.abort()}>Cancel</button></div>}
    </section>
    {!!publishedBooks.length && <section className="portal-panel"><h2>Published Books</h2><div className="published-book-list">{publishedBooks.map(book => <article key={book.id}><img src={book.cover} alt="" /><div><strong>{book.title}</strong><p className="portal-muted small">{series.find(item => item.id === book.seriesId)?.name} / {learningClasses.find(item => item.id === book.classId)?.name} / {learningSubjects.find(item => item.id === book.subjectId)?.name}</p></div><a className="portal-secondary" href={`#/admin/published/${book.id}`}>Open / Edit</a></article>)}</div></section>}
    {draft ? <section className="portal-panel draft-uploaded-book">
      <button type="button" className="draft-cover-button" onClick={() => setReaderOpen(true)} aria-label={`Open ${draft.title}`}><BlobImage blob={draft.pages[0].image} alt={draft.title} /></button>
      <div><p className="portal-eyebrow">Your uploaded book</p><h2>{draft.title}</h2><p className="pdf-book-location">{series.find(item => item.id === draft.seriesId)?.name} / {learningClasses.find(item => item.id === draft.classId)?.name} / {getSubjectAssignments(customSubjects, subjectAssignments).find(item => item.seriesId === draft.seriesId && item.subjectId === draft.subjectId)?.name}</p><p className="portal-muted">{draft.pages.length} pages / {draft.originalBookId ? 'Original book activities detected' : `${activities} linked activities`} / {(draftBytes(draft) / 1024 / 1024).toFixed(1)} MB</p><button className="portal-primary" onClick={() => setReaderOpen(true)}>Open Book Preview</button><p className="portal-muted small">Page turning, zoom and writing work directly in the reader. Listen uses the PDF's text; videos and games appear when the book contains linked content.</p></div>
    </section> : <section className="portal-empty"><h2>{dirty ? 'All pages removed' : 'Open your PDF as a book'}</h2><p>{dirty ? 'Click Save Changes to confirm removal, or Cancel to restore your last saved version.' : 'Select a series, class and subject above, then upload its PDF.'}</p></section>}
    {draft && <section ref={editorRef} tabIndex={-1} className="pdf-customization" aria-label="Customize PDF pages" inert={!!busy}>
      <div className="portal-page-heading"><h2>Customize your book</h2><button className="portal-secondary" onClick={() => setReaderOpen(true)}>Preview reader</button></div>
      <div className="portal-panel pdf-book-details">
        <label className="portal-field">Book title<input maxLength={200} value={draft.title} onChange={event => setBookDraft({ ...draft, title: event.target.value })} /></label>
        <label className="portal-field">Series<select value={draft.seriesId || ''} onChange={event => setBookDraft({ ...draft, seriesId: event.target.value, classId: '', subjectId: '' })}><option value="">Select series</option>{series.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="portal-field">Class<select disabled={!draft.seriesId} value={draft.classId || ''} onChange={event => setBookDraft({ ...draft, classId: event.target.value, subjectId: '' })}><option value="">Select class</option>{classChoices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="portal-field">Subject<select disabled={!draft.classId} value={draft.subjectId || ''} onChange={event => setBookDraft({ ...draft, subjectId: event.target.value })}><option value="">Select subject</option>{subjectChoices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><input type="checkbox" checked={!!draft.rtl} onChange={event => setBookDraft({ ...draft, rtl: event.target.checked })} /> Read right to left (Urdu)</label>
      </div>
      <div className="pdf-editor-layout">
        <nav className="pdf-page-thumbnails" aria-label="Choose a PDF page">{draft.pages.map(item => <button type="button" key={item.number} className={page.number === item.number ? 'selected' : ''} aria-current={page.number === item.number ? 'page' : undefined} onClick={() => { setSelected(item.number); setEditing(null); }}><BlobImage blob={item.thumbnail} alt="" /><span>Page {item.number}</span><small>{item.activities.length} activities</small></button>)}</nav>
        <section className="pdf-selected-page">
          <h3>Page {page.number}</h3><p className="portal-muted small">Drag an activity button or QR code to position it. Arrow keys move it precisely. Activities without a saved position use the reader toolbar.</p><PageActivityLayout page={page} onChange={(id, placement) => changePage({ activities: page.activities.map(item => item.id === id ? { ...item, placement } : item) })} />
          <label className="portal-field">Page text / narration<textarea maxLength={4000} rows={4} value={page.text || ''} onChange={event => changePage({ text: event.target.value })} /></label>
          <div className="portal-panel pdf-linked-activities"><h3>Page activities</h3>{!page.activities.length && <p className="portal-muted small">Add an upload, a link or an existing activity.</p>}{page.activities.map(activity => <div className="pdf-linked-activity" key={activity.id}><div><strong>{activity.title}</strong><small>{activity.type}</small></div><div className="portal-actions"><button className="pdf-text-button" onClick={() => setPreview(activity)}>Preview</button>{activity.type !== 'existing' && <button className="pdf-text-button" onClick={() => { setActivitySource('upload'); setEditing({ pageNumber: page.number, activity }); }}>Edit</button>}<button className="pdf-text-button" onClick={() => { changePage({ activities: page.activities.filter(item => item.id !== activity.id) }); setEditing(null); }}>Remove</button></div></div>)}</div>
          {!!page.embeddedVideos?.length && <div className="portal-panel pdf-linked-activities"><h3>Links detected in PDF</h3>{page.embeddedVideos.map((video, index) => <div className="pdf-linked-activity" key={`${video.url}-${index}`}><span>{video.title}<small>{video.url}</small></span><button className="pdf-text-button" onClick={() => { setActivitySource('upload'); setEditing({ pageNumber: page.number, embeddedIndex: index, activity: { id: crypto.randomUUID(), type: 'video', title: video.title, youtubeUrl: video.url } }); }}>Edit</button><button className="pdf-text-button" onClick={() => changePage({ embeddedVideos: page.embeddedVideos.filter((_, at) => at !== index) })}>Remove</button></div>)}</div>}
        </section>
        <div><div className="portal-actions pdf-activity-tabs" role="group" aria-label="Activity source"><button className={activitySource === 'upload' ? 'portal-primary' : 'portal-secondary'} aria-pressed={activitySource === 'upload'} onClick={() => setActivitySource('upload')}>Page Templates</button><button className={activitySource === 'existing' ? 'portal-primary' : 'portal-secondary'} aria-pressed={activitySource === 'existing'} onClick={() => { setActivitySource('existing'); setEditing(null); }}>Existing activities</button></div>{activitySource === 'existing' ? <ActivityForm key={`${draft.id}-${page.number}-${editorRevision}`} pageNumber={page.number} appliedActivities={page.activities} onAdd={saveActivity} /> : <UploadedActivityForm key={`${draft.id}-${page.number}-${editing?.activity.id || 'new'}-${editorRevision}`} initial={editing?.pageNumber === page.number ? editing.activity : null} onSave={saveActivity} onCancel={() => setEditing(null)} />}</div>
      </div>
    </section>}
    {draft && readerOpen && <DraftBookReader draft={draft} selected={page.number} dirty={dirty} busy={busy} activityOpen={!!preview || !!deletePage} onSelect={setSelected} onClose={() => setReaderOpen(false)} onCustomize={customize} onActivity={(activity, number) => { setSelected(number); if (['qr', 'link'].includes(activity.type)) window.open(activity.url, '_blank', 'noopener,noreferrer'); else setPreview(activity); }} onDelete={() => setDeletePage({ draftId: draft.id, number: page.number, count: page.activities.length })} onUpdate={saveUpdate} onCancel={cancelEdits} onStop={() => operation.current?.controller.abort()} />}
    {preview && draft && <ActivityPreview key={preview.id} activity={preview} page={page} onClose={() => setPreview(null)} />}
    {deletePage && <Modal title={`Delete page ${deletePage.number}?`} onClose={() => setDeletePage(null)}><p>This removes the page{deletePage.count ? ` and its ${deletePage.count} activities` : ''} from your working copy.</p><p className="portal-muted">Click Save Changes afterwards to save the deletion. Cancel restores the last updated book.</p><div className="portal-actions"><button className="portal-secondary" onClick={() => setDeletePage(null)}>Keep Page</button><button className="portal-primary pdf-danger" onClick={confirmDelete}>Delete Page</button></div></Modal>}
  </div>;
}
