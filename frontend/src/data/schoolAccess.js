import { getSubjectAssignments, learningClasses } from './learningCatalog.js';

export const subjectKey = subject => `${subject.seriesId}/${subject.subjectId}`;
export function schoolSubjectChoices(customSubjects, subjectAssignments, seriesClasses) {
  return getSubjectAssignments(customSubjects, subjectAssignments).flatMap(row => row.classIds
    .filter(classId => seriesClasses.some(item => item.seriesId === row.seriesId && item.classIds.includes(classId)))
    .map(classId => ({ classId, seriesId: row.seriesId, subjectId: row.subjectId, name: row.name })));
}
export function initialSchoolAssignments(account, choices, series) {
  if (Array.isArray(account.schoolAssignments)) return structuredClone(account.schoolAssignments);
  const allowed = account.allowedSeriesIds || series.map(item => item.id);
  return learningClasses.map(item => ({ classId: item.id, subjects: choices.filter(row => row.classId === item.id && allowed.includes(row.seriesId)).map(({ seriesId, subjectId }) => ({ seriesId, subjectId })) })).filter(row => row.subjects.length);
}
export const assignedSeriesIds = assignments => [...new Set(assignments.flatMap(row => row.subjects.map(item => item.seriesId)))];
