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

export function getSubjectAssignments(customSubjects = [], overrides = []) {
  const rows = new Map();
  const add = (subject, seriesId, classId, hasBooks = false) => {
    const key = JSON.stringify([seriesId, subject.name.toLowerCase()]);
    if (!rows.has(key)) rows.set(key, { subjectId: subject.id, name: subject.name, seriesId, classIds: [], bookClassIds: [] });
    const row = rows.get(key);
    if (!row.classIds.includes(classId)) row.classIds.push(classId);
    if (hasBooks && !row.bookClassIds.includes(classId)) row.bookClassIds.push(classId);
  };
  Object.values(learningBookMetadata).forEach(meta => add(learningSubjects.find(s => s.id === meta.subjectId), meta.seriesId, meta.classId, true));
  customSubjects.forEach(subject => add(subject, subject.seriesId, subject.classId));
  return [...rows.values()].map(row => {
    const override = overrides.find(item => item.seriesId === row.seriesId && item.subjectId === row.subjectId);
    return { ...row, classIds: override ? override.classIds : row.classIds };
  });
}

export function getLearningSubjects(books, customSubjects, selection, assignments = []) {
  return getSubjectAssignments(customSubjects, assignments)
    .filter(row => row.seriesId === selection.seriesId && row.classIds.includes(selection.classId))
    .filter(row => !row.bookClassIds.includes(selection.classId) || getLearningBooks(books, { ...selection, subjectId: row.subjectId }).length > 0)
    .map(row => ({ id: row.subjectId, name: row.name }));
}

export function libraryLink(classId, seriesId, subjectId) {
  return '#/user/library' + [classId, seriesId, subjectId].filter(Boolean).map(part => `/${encodeURIComponent(part)}`).join('');
}
