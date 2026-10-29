import { useEffect, useRef, useState } from 'react';
import { Modal } from '../portal/Shared.jsx';
import { BlobImage, useBlobUrl } from './useBlobUrl.js';
import { createLoadingScope } from '../loading/loadingState.js';
import { findExistingActivity } from './existingActivities.js';
import { ExistingActivityPreview } from './ExistingActivityPreview.jsx';
import { pencilCursor, eraserCursor } from '../drawingCursors.js';

function DrawingPreview({ activity, page }) {
  const canvas = useRef(null);
  const stroke = useRef(null);
  const [colour, setColour] = useState(activity.colours[0]);
  const [size, setSize] = useState(8);
  const [erase, setErase] = useState(false);
  const imageUrl = useBlobUrl(activity.media || page.image);
  const [dimensions, setDimensions] = useState({ width: page.width, height: page.height });
  function point(event) {
    const rect = canvas.current.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * dimensions.width, y: (event.clientY - rect.top) / rect.height * dimensions.height };
  }
  function draw(event) {
    if (!stroke.current) return;
    const p = point(event), a = activity.area;
    if (p.x < a.x / 100 * dimensions.width || p.x > (a.x + a.w) / 100 * dimensions.width || p.y < a.y / 100 * dimensions.height || p.y > (a.y + a.h) / 100 * dimensions.height) { stroke.current = p; return; }
    const ctx = canvas.current.getContext('2d');
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    ctx.save(); ctx.beginPath(); ctx.rect(a.x / 100 * dimensions.width, a.y / 100 * dimensions.height, a.w / 100 * dimensions.width, a.h / 100 * dimensions.height); ctx.clip();
    ctx.beginPath(); ctx.moveTo(stroke.current.x, stroke.current.y); ctx.lineTo(p.x, p.y); ctx.lineWidth = size; ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = colour; ctx.stroke(); ctx.restore(); stroke.current = p;
  }
  return <>
    <div className="pdf-draw-tools"><label>Colour<input type="color" aria-label="Drawing colour" value={colour} onChange={event => { setColour(event.target.value); setErase(false); }} /></label><label>Brush<input type="range" aria-label="Brush size" min={2} max={35} value={size} onChange={event => setSize(Number(event.target.value))} /></label><button className="portal-secondary" aria-pressed={erase} onClick={() => setErase(value => !value)}>Eraser</button><button className="portal-secondary" onClick={() => canvas.current.getContext('2d').clearRect(0, 0, dimensions.width, dimensions.height)}>Clear drawing</button></div>
    <div className="pdf-drawing-preview">{imageUrl && <img src={imageUrl} alt={activity.title} onLoad={event => { const scale = Math.min(1, 2000 / Math.max(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)); setDimensions({ width: Math.round(event.currentTarget.naturalWidth * scale), height: Math.round(event.currentTarget.naturalHeight * scale) }); }} />}<canvas ref={canvas} style={{ cursor: erase ? eraserCursor : pencilCursor }} width={dimensions.width} height={dimensions.height} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); stroke.current = point(event); draw(event); }} onPointerMove={draw} onPointerUp={() => { stroke.current = null; }} onPointerCancel={() => { stroke.current = null; }} /><span className="pdf-drawing-area" style={{ left: `${activity.area.x}%`, top: `${activity.area.y}%`, width: `${activity.area.w}%`, height: `${activity.area.h}%` }} /></div>
  </>;
}

function GamePreview({ activity, page }) {
  const [round, setRound] = useState(0);
  const [message, setMessage] = useState('');
  const { crop, targets } = activity.game;
  const complete = round === targets.length;
  return <>
    <p role="status">{complete ? 'Well done! All objects found.' : `Find: ${targets[round].name}`} ({round} / {targets.length})</p>
    <div className="pdf-game-scene" style={{ aspectRatio: `${crop.w * page.width / (crop.h * page.height)}` }}>
      <BlobImage blob={page.image} alt="Game page" style={{ width: `${10000 / crop.w}%`, left: `${-crop.x / crop.w * 100}%`, top: `${-crop.y / crop.h * 100}%` }} />
      {targets.map((target, index) => <button key={index} aria-label={target.name} disabled={complete} style={{ left: `${(target.x - crop.x) / crop.w * 100}%`, top: `${(target.y - crop.y) / crop.h * 100}%`, width: `${target.w / crop.w * 100}%`, height: `${target.h / crop.h * 100}%` }} onClick={() => { if (index === round) { setRound(round + 1); setMessage('Correct!'); } else setMessage('Try another object.'); }} />)}
    </div><p role="status">{message}</p><button className="portal-secondary" onClick={() => { setRound(0); setMessage(''); }}>Restart game</button>
  </>;
}

function UploadedActivityPreview({ activity, page, onClose }) {
  const url = useBlobUrl(activity.media);
  const mediaRef = useRef(null);
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    const loading = createLoadingScope(); loading.media(media);
    return () => { loading.dispose(); media.pause(); media.removeAttribute('src'); media.load(); };
  }, []);
  return <Modal title={activity.title} onClose={onClose}>
    <div className="pdf-activity-preview">
      {activity.text && <p className="pdf-preview-text">{activity.text}</p>}
      {['audio', 'story'].includes(activity.type) && activity.media && <audio ref={mediaRef} src={url || undefined} controls preload="metadata" />}
      {activity.type === 'video' && (activity.media ? <video ref={mediaRef} src={url || undefined} controls preload="metadata" playsInline /> : <p><a className="portal-primary" href={activity.youtubeUrl} target="_blank" rel="noopener noreferrer">Open YouTube video</a></p>)}
      {['tracing', 'colouring'].includes(activity.type) && <DrawingPreview activity={activity} page={page} />}
      {activity.type === 'game' && <GamePreview activity={activity} page={page} />}
      {activity.type === 'story' && !activity.media && <p className="portal-muted small">Text narration saved. Add a recording to preview audio.</p>}
    </div>
  </Modal>;
}

export function ActivityPreview(props) {
  if (props.activity.type === 'existing') {
    const template = findExistingActivity(props.activity.templateId);
    if (!template) return <Modal title="Activity unavailable" onClose={props.onClose}><p>This existing activity is not available in this version of the collection.</p></Modal>;
    return <ExistingActivityPreview template={template} onClose={props.onClose} />;
  }
  return <UploadedActivityPreview {...props} />;
}
