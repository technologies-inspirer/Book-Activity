import { useEffect, useState } from 'react';
import { useDemo } from '../portal/DemoContext.jsx';
import { Feedback } from '../portal/Shared.jsx';
import { DraftBookReader } from './DraftBookReader.jsx';
import { ActivityPreview } from './ActivityPreview.jsx';
import { importProject } from './projectArchive.js';
import './activityCatalogue.js';
import './authoring.css';

export function PublishedBookReader({ id }) {
  const { account, store, setBookDraft, setSavedBookDraft, progress } = useDemo();
  const [draft, setDraft] = useState(null);
  const [selected, setSelected] = useState(() => progress[account.id]?.bookId === id ? progress[account.id].page + 1 : 1);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const back = `#/${account.role === 'admin' ? 'admin/books' : 'user/library'}`;
  useEffect(() => {
    let cancelled = false;
    store.loadPublishedBook(id).then(file => importProject(file)).then(value => { if (!cancelled) setDraft({ ...value, publishedId: id }); }).catch(error => { if (!cancelled) setError({ error: true, text: error.message }); });
    return () => { cancelled = true; };
  }, [id, store]);
  return <div className="portal session-screen"><div className="portal-panel"><h1>{error ? 'Book unavailable' : 'Opening your book'}</h1><Feedback message={error} /><a href={back} className="portal-secondary">Back to library</a></div>
    {draft && <DraftBookReader draft={draft} selected={selected} readOnly onClose={() => { location.hash = back; }} onSelect={number => { setSelected(number); store.rememberPosition(id, number - 1); }} activityOpen={!!preview} onActivity={(activity, number) => { setSelected(number); if (['qr', 'link'].includes(activity.type)) window.open(activity.url, '_blank', 'noopener,noreferrer'); else setPreview(activity); }} onCustomize={account.role === 'admin' ? () => { setBookDraft(draft); setSavedBookDraft(draft); location.hash = '#/admin/pdf-activities/edit'; } : undefined} />}
    {preview && <ActivityPreview activity={preview} page={draft.pages[selected - 1]} onClose={() => setPreview(null)} />}
  </div>;
}
