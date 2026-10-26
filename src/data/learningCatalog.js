// UI classification only: original book IDs, page data and assets stay unchanged.
// The publisher's 3+ age group belongs to Play Group, not Class 3.
export const learningClasses = [
  { id: 'play-group', name: 'Play Group' },
  { id: 'prep', name: 'Prep' },
  { id: 'nursery', name: 'Nursery' },
  ...Array.from({ length: 8 }, (_, index) => ({ id: `class-${index + 1}`, name: `Class ${index + 1}` }))
];

export const learningSubjects = [
  { id: 'english', name: 'English' },
  { id: 'urdu', name: 'Urdu' },
  { id: 'maths', name: 'Maths' },
  { id: 'computer', name: 'Computer' },
  { id: 'science', name: 'Science' }
];

export const learningBookMetadata = {
  'maxford-global-qaida-3-english': { classId: 'play-group', seriesId: 'maxford', subjectId: 'english' },
  'new-stemford-english-3': { classId: 'play-group', seriesId: 'stemford', subjectId: 'english' },
  'stemford-maths-3': { classId: 'play-group', seriesId: 'stemford', subjectId: 'maths' },
  'stemford-urdu-3': { classId: 'play-group', seriesId: 'stemford', subjectId: 'urdu' },
  'stemford-series-computer-book-0-curve': { classId: 'play-group', seriesId: 'stemford', subjectId: 'computer' },
  'stemford-computer-book-1': { classId: 'class-1', seriesId: 'stemford', subjectId: 'computer' },
  'stemford-english-1': { classId: 'class-1', seriesId: 'stemford', subjectId: 'english' },
  'stemford-science-1': { classId: 'class-1', seriesId: 'stemford', subjectId: 'science' }
};

export function getLearningBooks(books, selection = {}) {
  return books.filter(book => {
    const metadata = learningBookMetadata[book.id];
    return metadata && ['classId', 'seriesId', 'subjectId'].every(key => !selection[key] || selection[key] === metadata[key]);
  });
}

export function libraryLink(classId, seriesId, subjectId) {
  return '#/user/library' + [classId, seriesId, subjectId].filter(Boolean).map(part => `/${encodeURIComponent(part)}`).join('');
}
