const LETTER_PAGES = [5, 7, 9, 11, 17, 19, 21, 23, 27, 29, 31, 33, 39, 41, 43, 45, 49, 51, 53, 55, 61, 63, 65, 67, 71, 73];

// Books whose letter or number pages are found from their publisher video titles
// ("Story of letter Aa", "Vocabulary Aa", "Story: Number 5", "Story: بے").
const VIDEO_LESSON_BOOKS = {
  'stemford-english-4': { subject: 'English', kind: 'Letter' },
  'stemford-series-computer-book-0-curve': { subject: 'Computer', kind: 'Letter' },
  'stemford-maths-3': { subject: 'Maths', kind: 'Number' },
  'stemford-maths-4': { subject: 'Maths', kind: 'Number' },
  'stemford-urdu-3': { subject: 'Urdu', kind: 'Letter' },
  'stemford-urdu-4': { subject: 'Urdu', kind: 'Letter' }
};

const acts = (book, page) => book.pages[page - 1]?.acts || [];
const lessonVideo = (book, page) => {
  const qrVideos = book.pages[page - 1]?.qr?.videos || [];
  return qrVideos.find(video => /for students/i.test(video.title)) || qrVideos[0] || null;
};
const storyVideo = activities => {
  const story = ['story', 'vocabulary'].map(label => activities.find(activity => activity.type === 'videos' && (activity.label || '').toLowerCase() === label)).find(Boolean);
  const id = story?.videos?.[0]?.src?.match(/(?:youtu\.be\/|[?&]v=)([\w-]{11})/)?.[1];
  return id ? { id, title: story.title } : null;
};
const nameOf = activity => (activity.title || '').replace(/^(story|vocabulary)(\s+of\s+letter)?\s*:?\s*/i, '').replace(/^number\s+/i, '').trim();

// Reuse the book's real lessons, videos and games. No separate copy of lesson content.
// Each lesson: key (unique), name ("Gg", "5", "بے"), big/small (side button), kind, page, tracePage, videos, game, trace.
export function englishLessons(book) {
  if (book.id === 'new-stemford-english-3') return LETTER_PAGES.map((page, index) => {
    const activities = acts(book, page);
    const game = activities.find(activity => activity.type === 'game');
    const letter = String.fromCharCode(97 + index);
    return {
      letter, key: letter, name: letter.toUpperCase() + letter, big: letter.toUpperCase(), small: letter, kind: 'Letter', subject: 'English',
      page, tracePage: page + 1,
      words: (game?.targets || []).map(target => target.name), game,
      lessonVideo: lessonVideo(book, page),
      story: activities.find(activity => activity.type === 'story'),
      videos: activities.filter(activity => activity.type === 'videos'),
      trace: acts(book, page + 1).find(activity => activity.type === 'fill')
    };
  });
  const config = VIDEO_LESSON_BOOKS[book.id];
  if (!config) return [];
  const lessons = [];
  book.pages.forEach((_, index) => {
    const page = index + 1;
    const intro = acts(book, page).find(activity => activity.type === 'videos' && /^(story|vocabulary)$/i.test(activity.label || ''));
    const name = intro && nameOf(intro);
    if (!name || lessons.some(lesson => lesson.name === name)) return;
    // the writing page is this page if it has its own tracing, otherwise the next page when that is not another lesson
    const next = acts(book, page + 1);
    const nextIsLesson = next.some(activity => activity.type === 'videos' && /^(story|vocabulary)$/i.test(activity.label || ''));
    const own = acts(book, page).find(activity => activity.type === 'fill');
    const tracePage = own ? page : !nextIsLesson && next.some(activity => activity.type === 'fill') ? page + 1 : page;
    // the next page belongs to this lesson (its writing page and Formation video) unless it starts another one
    const pages = nextIsLesson || page === book.pages.length ? [page] : [page, page + 1];
    const all = pages.flatMap(p => acts(book, p));
    const game = all.find(activity => activity.type === 'game');
    const letters = /^[A-Za-z]{2}$/.test(name);
    lessons.push({
      letter: name, key: name, name, big: letters ? name[0] : name, small: letters ? name[1] : '', kind: config.kind, subject: config.subject,
      page, tracePage,
      words: (game?.targets || []).map(target => target.name), game,
      // the publisher's Story (or Vocabulary) video plays on the lesson page; the page's QR video otherwise
      lessonVideo: storyVideo(all) || lessonVideo(book, page),
      story: all.find(activity => activity.type === 'story'),
      videos: all.filter(activity => activity.type === 'videos'),
      trace: acts(book, tracePage).find(activity => activity.type === 'fill')
    });
  });
  return lessons;
}
