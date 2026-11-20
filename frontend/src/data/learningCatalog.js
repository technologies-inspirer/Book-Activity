// UI classification only: original book IDs, page data and assets stay unchanged.
// The publisher's 3+ age group belongs to Play Group, not Class 3.
export const learningClasses = [
  { id: 'play-group', name: 'Play Group' },
  { id: 'nursery', name: 'Nursery' },
  { id: 'prep', name: 'Prep' },
  ...Array.from({ length: 8 }, (_, index) => ({ id: `class-${index + 1}`, name: `Class ${index + 1}` }))
];

export const learningSubjects = [
  { id: 'english', name: 'English' },
  { id: 'urdu', name: 'Urdu' },
  { id: 'maths', name: 'Maths' },
  { id: 'computer', name: 'Computer' },
  { id: 'science', name: 'Science' },
  { id: 'social-studies', name: 'Social Studies' },
  { id: 'islamiat', name: 'Islamiat' }
];

export const learningBookMetadata = {
  'maxford-global-qaida-3-english': { classId: 'play-group', seriesId: 'maxford', subjectId: 'english' },
  'new-stemford-english-3': { classId: 'play-group', seriesId: 'stemford', subjectId: 'english' },
  'stemford-maths-4': { classId: 'nursery', seriesId: 'stemford', subjectId: 'maths' },
  'stemford-maths-5': { classId: 'prep', seriesId: 'stemford', subjectId: 'maths' },
  'stemford-maths-3': { classId: 'play-group', seriesId: 'stemford', subjectId: 'maths' },
  'stemford-urdu-3': { classId: 'play-group', seriesId: 'stemford', subjectId: 'urdu' },
  'stemford-english-4': { classId: 'nursery', seriesId: 'stemford', subjectId: 'english' },
  'stemford-english-5': { classId: 'prep', seriesId: 'stemford', subjectId: 'english' },
  'stemford-urdu-5': { classId: 'prep', seriesId: 'stemford', subjectId: 'urdu' },
  'stemford-urdu-4': { classId: 'nursery', seriesId: 'stemford', subjectId: 'urdu' },
  'stemford-series-computer-book-0-curve': { classId: 'play-group', seriesId: 'stemford', subjectId: 'computer' },
  'stemford-computer-book-1': { classId: 'class-1', seriesId: 'stemford', subjectId: 'computer' },
  'stemford-english-1': { classId: 'class-1', seriesId: 'stemford', subjectId: 'english' },
  'stemford-science-1': { classId: 'class-1', seriesId: 'stemford', subjectId: 'science' },
  'stemford-urdu-1': { classId: 'class-1', seriesId: 'stemford', subjectId: 'urdu' },
  'stemford-social-studies-1': { classId: 'class-1', seriesId: 'stemford', subjectId: 'social-studies' },
  'stemford-maths-1': { classId: 'class-1', seriesId: 'stemford', subjectId: 'maths' },
  'stemford-islamiat-1': { classId: 'class-1', seriesId: 'stemford', subjectId: 'islamiat' },
  'stemford-english-2': { classId: 'class-2', seriesId: 'stemford', subjectId: 'english' },
  'stemford-maths-2': { classId: 'class-2', seriesId: 'stemford', subjectId: 'maths' },
  'stemford-computer-2': { classId: 'class-2', seriesId: 'stemford', subjectId: 'computer' },
  'stemford-social-studies-2': { classId: 'class-2', seriesId: 'stemford', subjectId: 'social-studies' }
};

// Kept in the project but not shown in the reader's library (the publisher adds Class 1 books one by one:
// Urdu 1, Social Studies 1, Science 1, Maths 1, English 1 and Islamiat 1 so far). Remove an ID here to show that book again.
export const hiddenFromLibrary = new Set(['stemford-computer-book-1']);

// Schools without explicit class selections retain their existing library access.
export function schoolAllowsSelection(account, selection) {
  if (account?.role === 'admin' || !Array.isArray(account?.schoolAssignments)) return true;
  return account.schoolAssignments.some(row => row.classId === selection.classId && (!selection.seriesId || row.subjects.some(subject => subject.seriesId === selection.seriesId && (!selection.subjectId || subject.subjectId === selection.subjectId))));
}

export function getLearningBooks(books, selection = {}) {
  return books.filter(book => {
    const metadata = learningBookMetadata[book.id];
    return metadata && !hiddenFromLibrary.has(book.id) && ['classId', 'seriesId', 'subjectId'].every(key => !selection[key] || selection[key] === metadata[key]);
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
