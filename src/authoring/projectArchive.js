import JSZip from 'jszip';
import { MAX_DRAFT_BYTES, MAX_PAGES, validateActivity } from './project.js';
import { youtubeId } from './readerBook.js';

const abort = signal => { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); };
const safePath = value => typeof value === 'string' && /^[a-zA-Z0-9_./-]+$/.test(value) && !value.startsWith('/') && !value.split('/').some(part => part === '..');
const suffix = blob => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'video/mp4': 'mp4', 'video/webm': 'webm' }[blob.type] || 'bin');

export async function exportProject(draft, { signal, onProgress } = {}) {
  const zip = new JSZip();
  const pages = draft.pages.map(page => {
    const prefix = `pages/p${String(page.number).padStart(3, '0')}`;
    zip.file(`${prefix}.jpg`, page.image); zip.file(`${prefix}-thumbnail.jpg`, page.thumbnail);
    const activities = page.activities.map((item, index) => {
      const { media, ...metadata } = item;
      if (media) {
        metadata.mediaPath = `activities/p${page.number}-${index + 1}.${suffix(media)}`;
        metadata.mediaType = media.type;
        zip.file(metadata.mediaPath, media);
      }
      return metadata;
    });
    return { number: page.number, sourcePageNumber: page.sourcePageNumber || page.number, width: page.width, height: page.height, text: page.text || '', embeddedVideos: page.embeddedVideos || [], imagePath: `${prefix}.jpg`, thumbnailPath: `${prefix}-thumbnail.jpg`, activities };
  });
  const manifest = JSON.stringify({ format: 'book-activity-draft', version: 1, title: draft.title, fileName: draft.fileName, originalBookId: draft.originalBookId || '', rtl: !!draft.rtl, seriesId: draft.seriesId, classId: draft.classId, subjectId: draft.subjectId, pages }, null, 2);
  if (new TextEncoder().encode(manifest).length > 2 * 1024 * 1024) throw new Error('Draft settings are too large. Split this book into smaller drafts.');
  zip.file('project.json', manifest);
  zip.file('README.txt', 'Book-Activity authoring draft. Import this ZIP on the admin PDF & Activities page to continue editing. JPEG pages are in pages/; activity files are in activities/. This package does not publish a book to the live reader.');
  abort(signal);
  return zip.generateAsync({ type: 'blob', compression: 'STORE' }, metadata => { abort(signal); onProgress?.(metadata.percent); });
}

export async function importProject(file, { signal } = {}) {
  if (!file?.size || file.size > MAX_DRAFT_BYTES) throw new Error('Choose a draft ZIP smaller than 200 MB.');
  const zip = await JSZip.loadAsync(file);
  abort(signal);
  const entries = Object.values(zip.files).filter(entry => !entry.dir);
  if (entries.length > 1500 || entries.reduce((size, entry) => size + (entry._data?.uncompressedSize || 0), 0) > MAX_DRAFT_BYTES) throw new Error('This draft contains too much uncompressed data.');
  const config = zip.file('project.json');
  if (!config || config._data?.uncompressedSize > 2 * 1024 * 1024) throw new Error('This ZIP does not contain a valid Book-Activity project.');
  const data = JSON.parse(await config.async('string'));
  if (data.format !== 'book-activity-draft' || data.version !== 1 || !Array.isArray(data.pages) || !data.pages.length || data.pages.length > MAX_PAGES || typeof data.title !== 'string' || data.title.length > 200) throw new Error('Unsupported or invalid draft project.');
  let bytes = 0;
  const blob = async (path, type) => {
    abort(signal);
    if (!safePath(path) || !zip.file(path)) throw new Error('A page or activity file is missing from this draft.');
    const result = new Blob([await zip.file(path).async('uint8array')], { type });
    bytes += result.size;
    if (bytes > MAX_DRAFT_BYTES) throw new Error('This draft is too large to open.');
    return result;
  };
  const pages = [];
  let activitiesCount = 0;
  for (let index = 0; index < data.pages.length; index++) {
    const page = data.pages[index];
    if (page.number !== index + 1 || !Number.isInteger(page.width) || !Number.isInteger(page.height) || page.width < 1 || page.height < 1 || page.width > 4096 || page.height > 4096 || !Array.isArray(page.activities) || (activitiesCount += page.activities.length) > 1000) throw new Error('Invalid page or activity data in this draft.');
    const activities = [];
    for (const item of page.activities) {
      const media = item.mediaPath ? await blob(item.mediaPath, item.mediaType) : null;
      activities.push(validateActivity({ ...item, id: crypto.randomUUID(), media }));
    }
    if (page.sourcePageNumber !== undefined && (!Number.isInteger(page.sourcePageNumber) || page.sourcePageNumber < 1 || page.sourcePageNumber > MAX_PAGES)) throw new Error('Invalid original page number in this draft.');
    if (page.text !== undefined && (typeof page.text !== 'string' || page.text.length > 4000)) throw new Error('Invalid page text in this draft.');
    if (page.embeddedVideos !== undefined && (!Array.isArray(page.embeddedVideos) || page.embeddedVideos.length > 20 || !page.embeddedVideos.every(video => youtubeId(video?.url) && typeof video.title === 'string' && video.title.length <= 200))) throw new Error('Invalid linked video in this draft.');
    pages.push({ number: page.number, sourcePageNumber: page.sourcePageNumber || page.number, width: page.width, height: page.height, text: page.text || '', embeddedVideos: page.embeddedVideos || [], image: await blob(page.imagePath, 'image/jpeg'), thumbnail: await blob(page.thumbnailPath, 'image/jpeg'), activities });
  }
  abort(signal);
  if (data.originalBookId !== undefined && (typeof data.originalBookId !== 'string' || data.originalBookId.length > 200 || !/^[a-z0-9-]*$/.test(data.originalBookId))) throw new Error('Invalid original book reference.');
  return { version: 1, id: crypto.randomUUID(), title: data.title, fileName: String(data.fileName || ''), originalBookId: data.originalBookId || '', rtl: !!data.rtl, seriesId: String(data.seriesId || ''), classId: String(data.classId || ''), subjectId: String(data.subjectId || ''), pages };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
