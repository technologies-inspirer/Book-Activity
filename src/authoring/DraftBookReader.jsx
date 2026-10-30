import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { mountBookActivityApp } from '../../app.js';
import { buildDraftReaderBook } from './readerBook.js';
import { books } from '../data/books.js';

export function DraftBookReader(props) {
  const { draft, selected, dirty, busy } = props;
  const host = useRef(null), controller = useRef(null), latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const urls = draft.pages.map(page => URL.createObjectURL(page.image));
    const book = buildDraftReaderBook(draft, urls, books);
    const cleanup = mountBookActivityApp(host.current, {
      readerBook: book,
      onPositionChange: (_id, number) => latest.current.onSelect(number),
      readerOptions: {
        initialPage: latest.current.selected,
        onClose: () => latest.current.onClose(),
        onReady: value => { controller.current = value; },
        onActivity: (activity, number) => latest.current.onActivity(activity, number),
        isBlocked: () => !!latest.current.activityOpen
      }
    });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { cleanup(); urls.forEach(url => URL.revokeObjectURL(url)); controller.current = null; document.body.style.overflow = overflow; };
  }, [draft]);
  useEffect(() => {
    if (controller.current && controller.current.getSelectedPage() !== selected) controller.current.goToPage(selected);
  }, [selected]);
  return createPortal(<div className="portal draft-reader-overlay" aria-label="Uploaded book reader">
    <div className="draft-reader-adminbar">
      <span className="portal-pill">{dirty ? 'Unsaved changes' : 'Saved'}</span>
      <label>Selected page<select aria-label="Selected book page" value={selected} disabled={!!busy} onChange={event => controller.current?.goToPage(Number(event.target.value))}>{draft.pages.map(page => <option key={page.number} value={page.number}>{page.number}</option>)}</select></label>
      <button className="portal-secondary pdf-danger" disabled={!!busy} onClick={props.onDelete}>Delete Page</button>
      <span className="draft-reader-spacer" />
      <button className="portal-primary" disabled={!!busy || !dirty} onClick={props.onUpdate}>Update</button>
      <button className="portal-secondary" disabled={!!busy} onClick={props.onCancel}>Cancel</button>
      {busy && <button className="portal-secondary" onClick={props.onStop}>Stop</button>}
    </div>
    <div ref={host} className="draft-reader-host" inert={!!busy} />
  </div>, document.body);
}
