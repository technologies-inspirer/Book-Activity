import { useEffect, useRef } from 'react';
import { learningClasses, getLearningSubjects, getLearningBooks, libraryLink, schoolAllowsSelection } from '../data/learningCatalog.js';
import { useDemo } from './DemoContext.jsx';
import { BookTile } from './BookCollection.jsx';
import { EmptyState } from './Shared.jsx';
import { LibraryBookIcon } from './LibraryIcons.jsx';
import { LearningIllustration } from './LearningIllustration.jsx';
import { LearningLandscape, LearningScenery } from './LearningScenery.jsx';
import classSelectionTemplate from '../../assets/class-selection-company-books.jpeg';
import subjectSelectionTemplate from '../../assets/subject-selection-company-books.jpeg';
import mathsSelectionTemplate from '../../assets/subject-maths-two-hands.png';
import computerBookCover from '../../assets/subject-computer-book-behind-laptop.png';

export function LearningLibrary({ segments = [], onBookOpen }) {
  const { account, assignedBooks, series, customSubjects, subjectAssignments } = useDemo();
  const classes = learningClasses.filter(item => ['play-group', 'nursery', 'prep'].includes(item.id) && schoolAllowsSelection(account, { classId: item.id }));
  const titleRef = useRef(null);
  const selectedClass = classes.find(item => item.id === segments[0]);
  const classBooks = selectedClass ? getLearningBooks(assignedBooks, { classId: selectedClass.id }) : [];
  const selectedSeries = series.find(item => item.id === segments[1]) || series.find(item => classBooks.some(item.of)) || series[0];
  const selection = { classId: selectedClass?.id, seriesId: selectedSeries.id };
  const subjectOptions = selectedClass ? getLearningSubjects(classBooks, customSubjects, selection, subjectAssignments).filter(subject => schoolAllowsSelection(account, { ...selection, subjectId: subject.id })) : [];
  const selectedSubject = subjectOptions.find(item => item.id === segments[2]);
  const selectedBooks = selectedSubject ? getLearningBooks(assignedBooks, { ...selection, subjectId: selectedSubject.id }) : [];
  const step = !selectedClass ? 0 : !selectedSubject ? 1 : 2;
  const steps = [
    { label: 'Select Class', href: libraryLink() },
    { label: 'Select Subject', href: selectedClass && libraryLink(selectedClass.id, selectedSeries.id) },
    { label: 'Open Book' }
  ];
  const backHref = step === 0 ? '#/user' : step === 1 ? libraryLink() : libraryLink(selectedClass.id, selectedSeries.id);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [segments.join('/')]);

  return (
    <div className={`learning-library ${step === 0 ? 'library-class-selection' : step === 1 ? 'library-subject-selection' : 'library-open-selection'}`} style={{ '--class-template': `url("${classSelectionTemplate}")`, '--subject-template': `url("${subjectSelectionTemplate}")`, '--maths-template': `url("${mathsSelectionTemplate}")`, '--computer-cover': `url("${computerBookCover}")` }}>
      <LearningScenery />
      <div className="library-navigation"><a className="library-back-link" href={backHref}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10 5-7 7 7 7M3 12h18" /></svg><span>{step === 0 ? 'Back to dashboard' : step === 1 ? 'Back to classes' : 'Back to subjects'}</span></a></div>
      <header className="library-heading portal-panel">
        <span className="library-heading-icon"><LibraryBookIcon /></span>
        <div>
          <h1 ref={titleRef} tabIndex="-1">Explore Books</h1>
          {selectedClass && <p>{selectedClass.name}{selectedSubject ? ` / ${selectedSubject.name}` : ''}</p>}
        </div>
        <LearningIllustration />
      </header>
      <nav className="library-progress portal-panel" aria-label="Book selection progress" style={{ '--step-progress': `${step * 50}%` }}>
        <div className="library-progress-summary"><span>Your reading journey</span><span>Step {step + 1} of {steps.length}</span></div>
        <ol className="library-steps" aria-label="Book selection steps">
        {steps.map((item, index) => (
          <li key={item.label} className={index < step ? 'complete' : index === step ? 'current' : ''} aria-current={index === step ? 'step' : undefined}>
            {index < step ? <a href={item.href}><span className="library-step-number" aria-hidden="true">✓</span><span className="library-step-label">{item.label}</span><small>Completed · Change</small></a> : <div><span className="library-step-number" aria-hidden="true">{index + 1}</span><span className="library-step-label">{item.label}</span><small>{index === step ? 'You are here' : 'Up next'}</small></div>}
          </li>
        ))}
        </ol>
      </nav>
      {step === 0 ? (assignedBooks.length ? (
        <section aria-label="Select your class" className="library-choice-grid library-class-grid">
          {classes.map(item => {
            const count = getLearningBooks(assignedBooks, { classId: item.id }).length;
            return <a key={item.id} className={`library-choice-card library-class-card class-${item.id}`} href={libraryLink(item.id)}><span className="library-class-art" aria-hidden="true" /><h2>{item.name}</h2><p>{count ? `${count} book${count === 1 ? '' : 's'} available` : 'No books available'}</p></a>;
          })}
        </section>
      ) : <EmptyState title="No books assigned">Contact your administrator to assign books to your demo library.</EmptyState>) : (
        <>
          {step === 1 && <section className="library-series" aria-label="Select series">
            <h2>Series</h2>
            <div className="library-series-options">
              {series.map(item => <a key={item.id} href={libraryLink(selectedClass.id, item.id)} className={selectedSeries.id === item.id ? 'selected' : ''} aria-current={selectedSeries.id === item.id ? 'true' : undefined}>{item.name}</a>)}
            </div>
          </section>}
          {step === 1 ? (
            subjectOptions.length ? <section className="library-choice-grid library-subject-grid" aria-label="Select your subject">
              {subjectOptions.map(subject => <a className={`library-choice-card library-subject-card library-class-card subject-${subject.id}`} key={subject.id} href={libraryLink(selectedClass.id, selectedSeries.id, subject.id)}><span className={['english', 'maths', 'urdu', 'computer'].includes(subject.id) ? 'library-subject-art' : 'library-subject-fallback'} aria-hidden="true">{!['english', 'maths', 'urdu', 'computer'].includes(subject.id) && <LibraryBookIcon />}</span><h2>{subject.name}</h2><p>{selectedSeries.name}</p></a>)}
            </section> : <EmptyState title={assignedBooks.length ? 'No books available for this selection' : 'No books assigned'}>{assignedBooks.length ? `There are no assigned ${selectedSeries.name} books for ${selectedClass.name}. Choose another series or class.` : 'Contact your administrator to assign books to your demo library.'}</EmptyState>
          ) : (
            <section className="library-results" aria-label={`${selectedSubject.name} books`}>
              <div className="portal-page-heading"><h2>{selectedSubject.name} books</h2><span className="portal-pill">{selectedBooks.length} available</span></div>
              {selectedBooks.length ? <div className="portal-book-grid">{selectedBooks.map(book => <BookTile key={book.id} book={book} onBookOpen={onBookOpen} showSeries={false} />)}</div> : <EmptyState title="No books added yet">Books for this subject will appear here when they are added.</EmptyState>}
            </section>
          )}
        </>
      )}
      <LearningLandscape />
    </div>
  );
}
