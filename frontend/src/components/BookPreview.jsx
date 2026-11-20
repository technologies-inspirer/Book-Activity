import { useEffect, useRef } from 'react';
import { seriesOf } from '../data/series.js';
import { Book3D } from './Book3D.jsx';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function BookPreview({ book, justClosed, onBookOpen, onClosedAnimationComplete }) {
  const stageRef = useRef(null);
  const modelRef = useRef(null);
  const rotation = useRef({ y: justClosed ? 0 : -32, x: justClosed ? 0 : 8 });
  const pointer = useRef(null);
  const moved = useRef(false);
  const opening = useRef(false);
  const openTimer = useRef(null);
  const previousBookId = useRef(book.id);

  const applyRotation = () => {
    if (!modelRef.current) return;
    modelRef.current.style.setProperty('--ry', `${rotation.current.y}deg`);
    modelRef.current.style.setProperty('--rx', `${rotation.current.x}deg`);
  };

  useEffect(() => {
    if (previousBookId.current !== book.id) {
      previousBookId.current = book.id;
      rotation.current = { y: -32, x: 8 };
      opening.current = false;
      pointer.current = null;
    }
    modelRef.current = stageRef.current?.querySelector('.b3d') || null;
    applyRotation();
    let first, second;
    if (justClosed) {
      first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => {
          rotation.current = { y: -32, x: 8 };
          applyRotation();
          onClosedAnimationComplete();
        });
      });
    }
    return () => {
      if (first) cancelAnimationFrame(first);
      if (second) cancelAnimationFrame(second);
      if (openTimer.current) clearTimeout(openTimer.current);
    };
  }, [book.id, justClosed]);

  const open = () => {
    if (opening.current) return;
    opening.current = true;
    rotation.current = { y: Math.round(rotation.current.y / 360) * 360, x: 0 };
    applyRotation();
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      onBookOpen();
      location.hash = `#/book/${encodeURIComponent(book.id)}/read/1`;
    }, 520);
  };

  const onPointerDown = event => {
    if (opening.current) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    moved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    modelRef.current?.classList.add('dragging');
  };

  const onPointerMove = event => {
    if (!pointer.current) return;
    const dx = event.clientX - pointer.current.x;
    const dy = event.clientY - pointer.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
    rotation.current = {
      y: rotation.current.y + dx * 0.6,
      x: clamp(rotation.current.x - dy * 0.3, -30, 30)
    };
    pointer.current = { x: event.clientX, y: event.clientY };
    applyRotation();
  };

  const onPointerUp = event => {
    modelRef.current?.classList.remove('dragging');
    const wasClick = pointer.current && !moved.current;
    pointer.current = null;
    if (wasClick && modelRef.current?.contains(document.elementFromPoint(event.clientX, event.clientY))) open();
  };

  const zones = book.pages.flatMap(page => page.zones || []);
  const count = predicate => zones.filter(predicate).length;

  return (
    <div className="pv">
      <div className="pv-stage" ref={stageRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => {
        pointer.current = null;
        modelRef.current?.classList.remove('dragging');
      }}>
        <Book3D book={book} className="preview-book" />
        <div className="pv-hint">Drag to turn the book · click it to open</div>
      </div>
      <div className="pv-info">
        <span className="pv-tag">{book.tag || 'Book'}</span>
        <h1>{book.title}</h1>
        <p>{book.author}</p>
        <ul className="chips">
          <li>{book.pages.length} pages</li>
          <li>{count(zone => zone.type === 'section' && zone.narration)} voice sections</li>
          <li>{count(zone => zone.video)} videos</li>
          <li>{count(zone => zone.type === 'fill')} activities</li>
        </ul>
        <div className="pv-actions">
          <button className="btn primary big" onClick={open}>Open book</button>
          <a href={`#/series/${seriesOf(book).id}`}>← Back to library</a>
        </div>
      </div>
    </div>
  );
}
