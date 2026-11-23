import { useState } from 'react';
import QRCode from 'qrcode';
import { Feedback } from '../portal/Shared.jsx';
import { activityTypes, gameTemplate, MAX_MEDIA_BYTES, validateActivity } from './project.js';

export function UploadedActivityForm({ initial = null, onSave, onCancel }) {
  const [type, setType] = useState(initial?.type || 'link');
  const [title, setTitle] = useState(initial?.title || '');
  const [text, setText] = useState(initial?.text || '');
  const [url, setUrl] = useState(initial?.url || initial?.youtubeUrl || '');
  const [media, setMedia] = useState(initial?.media || null);
  const [sourceName, setSourceName] = useState(initial?.sourceName || '');
  const [game, setGame] = useState(JSON.stringify(initial?.game || gameTemplate, null, 2));
  const [area, setArea] = useState(initial?.area || { x: 0, y: 0, w: 100, h: 100 });
  const [answer, setAnswer] = useState(initial?.answer || '');
  const [buttonColour, setButtonColour] = useState(initial?.buttonColour || '#0b625e');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const definition = activityTypes.find(item => item.id === type);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const qrImage = type === 'qr' ? await QRCode.toDataURL(url, { width: 240, margin: 2, errorCorrectionLevel: 'M' }) : undefined;
      onSave(validateActivity({ qrImage, answer, placement: initial?.placement || (type === 'qr' ? { x: 75, y: 5, w: 20, h: 16 } : undefined), fixedButton: type !== 'qr', qrAnchor: initial?.qrAnchor, buttonColour, id: initial?.id, type, title, text, url, youtubeUrl: url, media, sourceName, game, area }));
      setMessage({ text: 'Activity saved in your working copy. Click Save Changes to save the book.' });
    } catch (error) { setMessage({ error: true, text: error.message }); } finally { setBusy(false); }
  }
  return <section className="portal-panel pdf-activity-form">
    <h2>{initial ? 'Edit activity' : 'Apply a Page Template'}</h2>
    <Feedback message={message} />
    <form onSubmit={submit}>
      {!initial?.qrAnchor && <label className="portal-field">Activity type<select value={type} onChange={event => { setType(event.target.value); setMedia(null); setSourceName(''); setUrl(''); setMessage(null); }}>{activityTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <p className="portal-muted small">{definition.help}</p>
      <label className="portal-field">Button text<input required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} /></label>
      {definition.accept && type !== 'game' && <label className="portal-field">{['tracing', 'colouring'].includes(type) ? 'Optional image (otherwise uses this PDF page)' : type === 'story' || type === 'video' ? 'Optional recording or video file' : 'Audio file'}<input type="file" accept={definition.accept} onChange={event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_MEDIA_BYTES) { setMessage({ error: true, text: 'Activity files must be smaller than 50 MB.' }); event.target.value = ''; return; }
        setMedia(file); setSourceName(file.name); setMessage(null);
      }} />{media && <span className="small">{sourceName || 'Saved upload'} <button type="button" className="pdf-text-button" onClick={() => { setMedia(null); setSourceName(''); }}>Remove upload</button></span>}</label>}
      {(['link', 'qr'].includes(type) || (type === 'video' && !media)) && <label className="portal-field">{type === 'video' ? 'YouTube link' : 'Video / lesson web address'}<input type="url" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" /></label>}
      {!initial?.qrAnchor && <label className="portal-field">{type === 'question' ? 'Question' : type === 'story' ? 'Narration text' : 'Instructions (optional)'}<textarea required={['story', 'question'].includes(type)} maxLength={10000} rows={3} value={text} onChange={event => setText(event.target.value)} /></label>}
      {type === 'game' && <><label className="portal-field">Upload game JSON<input type="file" accept=".json,application/json" onChange={async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 1024 * 1024) { setMessage({ error: true, text: 'Choose a game JSON file below 1 MB.' }); event.target.value = ''; return; }
        try { setGame(await file.text()); setMessage(null); } catch { setMessage({ error: true, text: 'Could not read this game file.' }); }
      }} /></label><label className="portal-field">Game configuration<textarea rows={9} required value={game} onChange={event => setGame(event.target.value)} /><span className="small">Edit the example or paste your game JSON. Coordinates are percentages of the page.</span></label></>}
      {['tracing', 'colouring'].includes(type) && <fieldset className="pdf-area-fields"><legend>Drawing area (%)</legend>{['x', 'y', 'w', 'h'].map(key => <label className="portal-field" key={key}>{({ x: 'Left', y: 'Top', w: 'Width', h: 'Height' })[key]}<input type="number" min={0} max={100} step="any" value={area[key]} onChange={event => setArea({ ...area, [key]: Number(event.target.value) })} /></label>)}</fieldset>}
      {type === 'question' && <label className="portal-field">Model answer<textarea required rows={3} maxLength={4000} value={answer} onChange={event => setAnswer(event.target.value)} /></label>}
      <label className="portal-field">Button colour<input type="color" value={buttonColour} onChange={event => setButtonColour(event.target.value)} /></label>
      <p className="portal-muted small">Button size and icon are automatic. You can move the button on the page.</p>
      <div className="portal-actions"><button className="portal-primary" disabled={busy}>{initial ? 'Save activity' : 'Add to page'}</button>{initial && <button type="button" className="portal-secondary" onClick={onCancel}>Cancel edit</button>}</div>
    </form>
  </section>;
}
