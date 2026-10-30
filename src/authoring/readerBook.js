import { validYoutube } from './project.js';
import { findExistingActivity } from './existingActivities.js';

export function buildKnownLessonLinks(books) {
  const links = new Map();
  for (const book of books) book.pages.forEach((page, index) => {
    if (!page.qr?.url) return;
    const entry = links.get(page.qr.url) || { videos: page.qr.videos || [], sources: [] };
    entry.sources.push({ bookId: book.id, pageNumber: index + 1 });
    links.set(page.qr.url, entry);
  });
  return links;
}

export function identifyOriginalBook(pages, books) {
  const evidence = pages.filter(page => page.sourceMatches?.length);
  if (evidence.length < 2) return '';
  const matches = books.filter(book => book.pages.length === pages.length && evidence.every(page => page.sourceMatches.some(source => source.bookId === book.id && source.pageNumber === page.number)));
  return matches.length === 1 ? matches[0].id : '';
}

export function youtubeId(value) {
  if (!validYoutube(value)) return null;
  const url = new URL(value);
  return url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).at(-1);
}

export function extractPdfContent(content, annotations, lessonLinks = new Map()) {
  const text = (content?.items || []).map(item => typeof item.str === 'string' ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim().slice(0, 4000);
  const videos = [];
  const sourceMatches = [];
  for (const annotation of annotations || []) {
    const url = annotation.url;
    if (youtubeId(url)) videos.push({ url, title: 'Watch this lesson' });
    else {
      const known = lessonLinks.get(url);
      if (known?.sources) sourceMatches.push(...known.sources);
      for (const video of (Array.isArray(known) ? known : known?.videos) || []) {
      const link = video.src || (video.id ? `https://www.youtube.com/watch?v=${video.id}` : '');
      if (youtubeId(link)) videos.push({ url: link, title: String(video.title || 'Watch this lesson').slice(0, 200) });
      }
    }
  }
  return { text, sourceMatches, embeddedVideos: [...new Map(videos.map(video => [youtubeId(video.url), video])).values()].slice(0, 20) };
}

export function buildDraftReaderBook(draft, pageUrls, originalBooks = []) {
  const original = originalBooks.find(book => book.id === draft.originalBookId);
  return {
    id: `draft-reader-${draft.id}-${draft.pages.map(page => page.sourcePageNumber || page.number).join('-')}`,
    title: draft.title || 'Uploaded book', cover: pageUrls[0], rtl: !!draft.rtl || !!original?.rtl, c1: '#0b625e', c2: '#ffbf47',
    ratio: draft.pages[0].width / draft.pages[0].height,
    text: draft.pages.map(page => [[0, 0, 0, 0, page.text || '']]),
    ...(original ? { storyPages: original.pages.map((page, index) => { const at = draft.pages.findIndex(p => (p.sourcePageNumber || p.number) === index + 1); return at >= 0 ? { ...page, img: pageUrls[at] } : page; }) } : {}),
    pages: draft.pages.map((page, index) => {
      const videos = (page.embeddedVideos || []).filter(video => youtubeId(video.url)).map(video => ({ id: youtubeId(video.url), title: video.title || 'Watch this lesson' }));
      const sourceNumber = page.sourcePageNumber || page.number;
      const native = original?.pages[sourceNumber - 1];
      const linkedActivities = page.activities.filter(activity => {
        const template = activity.type === 'existing' && findExistingActivity(activity.templateId);
        return !(native && template && template.bookId === original.id && template.pageNumber === sourceNumber && ['activity', 'qr'].includes(template.source));
      });
      return { img: pageUrls[index], text: page.text || '', zones: native?.zones || [], acts: native?.acts || [], linkedActivities, ...(native?.qr ? { qr: native.qr } : videos.length ? { qr: { box: [84, 6, 8, 6], title: 'Page videos', videos } } : {}) };
    })
  };
}
