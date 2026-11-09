import { useState } from 'react';
import { Feedback } from '../portal/Shared.jsx';
import { activityTypes, gameTemplate, MAX_MEDIA_BYTES, validateActivity } from './project.js';

export function UploadedActivityForm({ initial = null, onSave, onCancel }) {
  const [type, setType] = useState(initial?.type || 'audio');
  const [title, setTitle] = useState(initial?.title || '');
  const [text, setText] = useState(initial?.text || '');
  const [url, setUrl] = useState(initial?.url || initial?.youtubeUrl || '');
  const [media, setMedia] = useState(initial?.media || null);
  const [sourceName, setSourceName] = useState(initial?.sourceName || '');
  const [game, setGame] = useState(JSON.stringify(initial?.game || gameTemplate, null, 2));
  const [area, setArea] = useState(initial?.area || { x: 0, y: 0, w: 100, h: 100 });
  const [message, setMessage] = useState(null);
  const definition = activityTypes.find(item => item.id === type);
  function submit(event) {
    event.preventDefault();
    try {
      onSave(validateActivity({ id: initial?.id, type, title, text, url, youtubeUrl: url, media, sourceName, game, area }));
      setMessage({ text: 'Activity saved in your working copy. Click Update to save the book.' });
    } catch (error) { setMessage({ error: true, text: error.message }); }
  }
  return <section className="portal-panel pdf-activity-form">
    <h2>{initial ? 'Edit activity' : 'Upload or link an activity'}</h2>
    <Feedback message={message} />
    <form onSubmit={submit}>
      <label className="portal-field">Activity type<select value={type} onChange={event => { setType(event.target.value); setMedia(null); setSourceName(''); setUrl(''); setMessage(null); }}>{activityTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <p className="portal-muted small">{definition.help}</p>
      <label className="portal-field">Title<input required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} /></label>
      {definition.accept && type !== 'game' && <label className="portal-field">{['tracing', 'colouring'].includes(type) ? 'Optional image (otherwise uses this PDF page)' : type === 'story' || type === 'video' ? 'Optional recording or video file' : 'Audio file'}<input type="file" accept={definition.accept} onChange={event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_MEDIA_BYTES) { setMessage({ error: true, text: 'Activity files must be smaller than 50 MB.' }); event.target.value = ''; return; }
        setMedia(file); setSourceName(file.name); setMessage(null);
      }} />{media && <span className="small">{sourceName || 'Saved upload'} <button type="button" className="pdf-text-button" onClick={() => { setMedia(null); setSourceName(''); }}>Remove upload</button></span>}</label>}
      {(type === 'link' || (type === 'video' && !media)) && <label className="portal-field">{type === 'link' ? 'Web address' : 'YouTube link'}<input type="url" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" /></label>}
      <label className="portal-field">{type === 'story' ? 'Narration text' : 'Instructions (optional)'}<textarea required={type === 'story'} maxLength={10000} rows={3} value={text} onChange={event => setText(event.target.value)} /></label>
      {type === 'game' && <><label className="portal-field">Upload game JSON<input type="file" accept=".json,application/json" onChange={async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 1024 * 1024) { setMessage({ error: true, text: 'Choose a game JSON file below 1 MB.' }); event.target.value = ''; return; }
        try { setGame(await file.text()); setMessage(null); } catch { setMessage({ error: true, text: 'Could not read this game file.' }); }
      }} /></label><label className="portal-field">Game configuration<textarea rows={9} required value={game} onChange={event => setGame(event.target.value)} /><span className="small">Edit the example or paste your game JSON. Coordinates are percentages of the page.</span></label></>}
      {['tracing', 'colouring'].includes(type) && <fieldset className="pdf-area-fields"><legend>Drawing area (%)</legend>{['x', 'y', 'w', 'h'].map(key => <label className="portal-field" key={key}>{({ x: 'Left', y: 'Top', w: 'Width', h: 'Height' })[key]}<input type="number" min={0} max={100} step="any" value={area[key]} onChange={event => setArea({ ...area, [key]: Number(event.target.value) })} /></label>)}</fieldset>}
      <div className="portal-actions"><button className="portal-primary">{initial ? 'Save activity' : 'Add to page'}</button>{initial && <button type="button" className="portal-secondary" onClick={onCancel}>Cancel edit</button>}</div>
    </form>
  </section>;
}
