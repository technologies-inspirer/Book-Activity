const LETTER_PAGES = [5, 7, 9, 11, 17, 19, 21, 23, 27, 29, 31, 33, 39, 41, 43, 45, 49, 51, 53, 55, 61, 63, 65, 67, 71, 73];

// Reuse the book's real lessons, videos and games. No separate copy of lesson content.
export function englishLessons(book) {
  if (book.id !== 'new-stemford-english-3') return [];
  return LETTER_PAGES.map((page, index) => {
    const activities = book.pages[page - 1]?.acts || [];
    const game = activities.find(activity => activity.type === 'game');
    const qrVideos = book.pages[page - 1]?.qr?.videos || [];
    return {
      letter: String.fromCharCode(97 + index), page, tracePage: page + 1,
      words: (game?.targets || []).map(target => target.name), game,
      lessonVideo: qrVideos.find(video => /for students/i.test(video.title)) || qrVideos[0] || null,
      story: activities.find(activity => activity.type === 'story'),
      videos: activities.filter(activity => activity.type === 'videos'),
      trace: book.pages[page]?.acts?.find(activity => activity.type === 'fill')
    };
  });
}
