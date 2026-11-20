import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { books } from '../data/books.js';
import { mountBookActivityApp } from '../../app.js';
import { Modal } from '../portal/Shared.jsx';
import { createLoadingScope } from '../loading/loadingState.js';

function RecordingPreview({ template, onClose }) {
  const media = useRef(null);
  useEffect(() => {
    const player = media.current;
    const loading = createLoadingScope(); loading.media(player);
    return () => { loading.dispose(); player.pause(); player.removeAttribute('src'); player.load(); };
  }, []);
  return <Modal title="Existing Audio" onClose={onClose}><p dir="auto">{template.title}</p><p className="portal-muted small">{template.bookTitle}</p><audio ref={media} controls preload="metadata" src={`${import.meta.env.BASE_URL}${template.audioSrc}`} style={{ width: '100%' }} /></Modal>;
}

function EnginePreview({ template, onClose }) {
  const host = useRef(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const book = books.find(item => item.id === template.bookId);
    const pageIndex = template.pageNumber - 1;
    const page = book.pages[pageIndex];
    const options = template.source === 'qr'
      ? { book, pageIndex, title: template.title, videos: page.qr.videos.map(item => ({ title: item.title, src: item.src || `https://www.youtube.com/watch?v=${item.id}` })) }
      : { book, pageIndex, activity: page.acts[template.activityIndex] };
    return mountBookActivityApp(host.current, { activityPreview: options, onPreviewClose: () => closeRef.current() });
  }, [template.id]);
  return createPortal(<div className="portal existing-engine-preview" role="region" aria-label={`Original activity: ${template.title}`}><div className="existing-preview-heading"><div><strong>{template.title}</strong><p>{template.bookTitle} / Page {template.pageNumber}</p></div><button className="portal-secondary" onClick={onClose}>Close preview</button></div><div ref={host} className="existing-preview-origin" /></div>, document.body);
}

export function ExistingActivityPreview({ template, onClose }) {
  return template.source === 'recording' ? <RecordingPreview template={template} onClose={onClose} /> : <EnginePreview template={template} onClose={onClose} />;
}
