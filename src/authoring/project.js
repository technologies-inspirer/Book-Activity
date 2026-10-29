import { restoreExistingActivity } from './existingActivities.js';

export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const MAX_DRAFT_BYTES = 200 * 1024 * 1024;
export const MAX_PAGES = 200;
export const activityTypes = [
  { id: 'audio', name: 'Audio', accept: '.mp3,.wav,.ogg,.m4a,audio/*', help: 'Upload a recorded lesson, pronunciation or read-aloud.' },
  { id: 'video', name: 'Video', accept: '.mp4,.webm,video/mp4,video/webm', help: 'Upload an MP4/WebM video or add a YouTube link.' },
  { id: 'story', name: 'Story / Narration', accept: '.mp3,.wav,.ogg,.m4a,audio/*', help: 'Add story text and an optional recording.' },
  { id: 'game', name: 'Game', accept: '.json,application/json', help: 'Upload a find-the-object game JSON using the existing activity format.' },
  { id: 'tracing', name: 'Tracing', accept: '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp', help: 'Use this page or upload a tracing image, then choose the drawing area.' },
  { id: 'colouring', name: 'Colouring', accept: '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp', help: 'Use this page or upload an outline image, then choose the colouring area.' }
];
export const gameTemplate = { type: 'game', title: 'Find the objects', crop: { x: 0, y: 0, w: 100, h: 100 }, targets: [{ name: 'Apple', x: 10, y: 20, w: 20, h: 20 }, { name: 'Ball', x: 50, y: 40, w: 20, h: 20 }] };
export function validateArea(area) {
  return area && ['x', 'y', 'w', 'h'].every(key => Number.isFinite(area[key])) && area.x >= 0 && area.y >= 0 && area.w > 0 && area.h > 0 && area.x + area.w <= 100 && area.y + area.h <= 100;
}
export function parseGame(value) {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  if (!data || !validateArea(data.crop) || !Array.isArray(data.targets) || !data.targets.length || data.targets.length > 100) throw new Error('Game JSON needs a crop and 1–100 targets. Download the example format.');
  const crop = Object.fromEntries(['x', 'y', 'w', 'h'].map(key => [key, data.crop[key]]));
  const targets = data.targets.map(target => {
    if (!validateArea(target) || typeof target.name !== 'string' || !target.name.trim() || target.name.length > 200 || target.x < crop.x || target.y < crop.y || target.x + target.w > crop.x + crop.w || target.y + target.h > crop.y + crop.h) throw new Error('Each game target needs a name and a valid percentage rectangle inside the crop.');
    return { name: target.name.trim(), ...Object.fromEntries(['x', 'y', 'w', 'h'].map(key => [key, target[key]])) };
  });
  return { crop, targets, ur: !!data.ur };
}
export function validYoutube(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && /^(www\.|m\.)?(youtube\.com|youtu\.be)$/.test(url.hostname) && ((url.pathname === '/watch' && /^[\w-]{11}$/.test(url.searchParams.get('v') || '')) || /^\/(?:embed\/|shorts\/)?[\w-]{11}\/?$/.test(url.pathname)); } catch { return false; }
}
export function validateActivity(input) {
  if (input.type === 'existing') return restoreExistingActivity(input);
  if (!activityTypes.some(type => type.id === input.type)) throw new Error('Choose an activity type.');
  const title = String(input.title || '').trim();
  if (!title || title.length > 120) throw new Error('Enter an activity title up to 120 characters.');
  if (input.media && input.media.size > MAX_MEDIA_BYTES) throw new Error('Activity files must be smaller than 50 MB.');
  const text = String(input.text || '').trim();
  if (text.length > 10000) throw new Error('Keep narration and instructions within 10,000 characters.');
  if (input.type === 'audio' && !input.media) throw new Error('Upload an audio file.');
  if (input.type === 'video' && !input.media && !validYoutube(input.youtubeUrl)) throw new Error('Upload a video or enter a valid YouTube link.');
  if (input.type === 'story' && !text) throw new Error('Enter the story or narration text.');
  if (input.media && ['audio', 'story'].includes(input.type) && !/^audio\//.test(input.media.type)) throw new Error('Choose a supported audio file.');
  if (input.media && input.type === 'video' && !/^video\/(mp4|webm)$/.test(input.media.type)) throw new Error('Choose an MP4 or WebM video.');
  if (input.media && ['tracing', 'colouring'].includes(input.type) && !/^image\/(png|jpeg|webp)$/.test(input.media.type)) throw new Error('Choose a PNG, JPG or WebP image.');
  const activity = { id: input.id || crypto.randomUUID(), type: input.type, title, text, sourceName: String(input.sourceName || ''), media: input.media || null };
  if (input.type === 'video') activity.youtubeUrl = input.media ? '' : input.youtubeUrl.trim();
  if (input.type === 'game') activity.game = parseGame(input.game);
  if (['tracing', 'colouring'].includes(input.type)) {
    if (!validateArea(input.area)) throw new Error('The drawing area must stay inside the page (0–100%).');
    activity.area = Object.fromEntries(['x', 'y', 'w', 'h'].map(key => [key, input.area[key]]));
    activity.colours = ['#e63946', '#f4a261', '#4aa3df', '#198754'];
  }
  return activity;
}
export const draftBytes = draft => draft?.pages.reduce((total, page) => total + page.image.size + page.thumbnail.size + page.activities.reduce((size, item) => size + (item.media?.size || 0), 0), 0) || 0;

export function deleteDraftPage(draft, number) {
  if (!draft?.pages.some(page => page.number === number)) throw new Error('This page is no longer in the draft.');
  const remaining = draft.pages.filter(page => page.number !== number);
  if (!remaining.length) return null;
  return { ...draft, pages: remaining.map((page, index) => ({ ...page, sourcePageNumber: page.sourcePageNumber || page.number, number: index + 1 })) };
}
