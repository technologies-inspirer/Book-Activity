import { pageButtonPlacement } from './pageLinks.js';
import { useRef } from 'react';
import { BlobImage } from './useBlobUrl.js';

export function PageActivityLayout({ page, onChange, onSelectQr }) {
  const host = useRef(null);
  const drag = useRef(null);
  return <div className="pdf-page-image pdf-layout-page" ref={host}>
    <BlobImage blob={page.image} alt={`PDF page ${page.number}`} />
    {(page.printedQrs || []).map((qr, index) => <button type="button" key={qr.id} className="pdf-qr-location" aria-label={`Configure printed QR ${index + 1}`} style={{ left: `${qr.x}%`, top: `${qr.y}%`, width: `${qr.w}%`, height: `${qr.h}%` }} onClick={() => onSelectQr(qr)}><span>QR {index + 1}</span></button>)}
    {page.activities.map((activity, index) => {
      const p = pageButtonPlacement(activity, index);
      return <button type="button" key={activity.id} className={`pdf-layout-activity${activity.type === 'qr' ? ' is-qr' : ''}${activity.fixedButton ? ' is-standard' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%`, background: activity.buttonColour || '#0b625e' }} aria-label={`Move ${activity.title}; use arrow keys for precise placement`} onPointerDown={event => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: activity.id, startX: event.clientX, startY: event.clientY, placement: p };
      }} onPointerMove={event => {
        const moving = drag.current;
        if (moving?.id !== activity.id) return;
        const rect = host.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100 - p.w, moving.placement.x + (event.clientX - moving.startX) / rect.width * 100));
        const y = Math.max(0, Math.min(100 - p.h, moving.placement.y + (event.clientY - moving.startY) / rect.height * 100));
        onChange(activity.id, { ...p, x, y });
      }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={event => {
        const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!move) return;
        event.preventDefault();
        onChange(activity.id, { ...p, x: Math.max(0, Math.min(100 - p.w, p.x + move[0])), y: Math.max(0, Math.min(100 - p.h, p.y + move[1])) });
      }}>{activity.fixedButton && <svg className="uploaded-button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}{activity.type === 'qr' && <img src={activity.qrImage} alt="" />}<span>{activity.title}</span></button>;
    })}
  </div>;
}
