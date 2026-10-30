import { getSubjectAssignments, learningClasses } from '../data/learningCatalog.js';
import { useDemo } from './DemoContext.jsx';

export function ClassesSubjects() {
  const { series, customSubjects, subjectAssignments } = useDemo();
  const assignments = getSubjectAssignments(customSubjects, subjectAssignments);
  const seriesNames = new Map(series.map(item => [item.id, item.name]));

  return <div className="classes-subjects-page">
    <a className="school-back" href="#/admin" aria-label="Back to dashboard">&#8592;</a>
    <div className="portal-page-heading"><div><h1>Classes And Subjects</h1><p className="portal-muted">See assigned classes and subjects</p></div></div>
    <div className="classes-subjects-list">
      {learningClasses.map(item => {
        const subjects = assignments.filter(row => row.classIds.includes(item.id));
        return <section className="class-subject-panel" key={item.id} aria-labelledby={`class-subject-${item.id}`}>
          <h2 id={`class-subject-${item.id}`}>{item.name}</h2>
          {subjects.length ? <ul className="class-subject-badges">{subjects.map(subject => <li key={`${subject.seriesId}/${subject.subjectId}`}>
            <span className="class-subject-check" aria-hidden="true">&#10003;</span>
            <span><bdi>{subject.name}</bdi> <span className="class-subject-source">(Javed Publishers, {seriesNames.get(subject.seriesId) || subject.seriesId})</span></span>
          </li>)}</ul> : <p className="class-subject-empty">No subjects assigned yet.</p>}
        </section>;
      })}
    </div>
  </div>;
}
