export const existingActivityKinds = [
  { id: 'story', name: 'Animated Stories' },
  { id: 'video', name: 'Videos / Phonics / Vocabulary' },
  { id: 'game', name: 'Games' },
  { id: 'fill', name: 'Tracing / Colouring' },
  { id: 'audio', name: 'Recorded Audio' }
];

export function buildExistingActivities(books, recordings = {}) {
  const entries = [];
  for (const book of books) book.pages.forEach((page, index) => {
    (page.acts || []).forEach((activity, activityIndex) => {
      const kind = { videos: 'video', story: 'story', game: 'game', fill: 'fill' }[activity.type];
      if (!kind) return;
      const title = activity.title || activity.label || existingActivityKinds.find(item => item.id === kind).name;
      entries.push({ id: `activity:${book.id}/${index + 1}/${activityIndex}/${encodeURIComponent(title)}`, kind, title, bookId: book.id, bookTitle: book.title, pageNumber: index + 1, source: 'activity', activityIndex, image: page.img || book.cover });
    });
    if (page.qr?.videos?.length) entries.push({ id: `qr:${book.id}/${index + 1}`, kind: 'video', title: page.qr.title || `Page ${index + 1} videos`, bookId: book.id, bookTitle: book.title, pageNumber: index + 1, source: 'qr', image: page.img || book.cover });
  });
  for (const [text, src] of Object.entries(recordings)) {
    const book = books.find(item => src.startsWith(`${item.dir}/`));
    if (!book || !src.endsWith('.mp3')) continue;
    entries.push({ id: `recording:${src}`, kind: 'audio', title: text, bookId: book.id, bookTitle: book.title, source: 'recording', audioSrc: src, image: book.cover });
  }
  return entries;
}

let catalogue = [];
export const registerExistingActivities = entries => { catalogue = entries; };
export const getExistingActivities = () => catalogue;
export const findExistingActivity = id => catalogue.find(item => item.id === id);
export const existingKindName = kind => existingActivityKinds.find(item => item.id === kind)?.name || kind;

export function applyExistingActivity(templateId) {
  const template = findExistingActivity(templateId);
  if (!template) throw new Error('Choose an activity from the existing collection.');
  return { id: crypto.randomUUID(), type: 'existing', templateId: template.id, title: template.title, sourceName: `${template.bookTitle}${template.pageNumber ? ` / Page ${template.pageNumber}` : ''}`, media: null };
}

export function restoreExistingActivity(input) {
  const activity = applyExistingActivity(input.templateId);
  return { ...activity, id: input.id || activity.id };
}
