import { useEffect, useRef } from 'react';
import { learningClasses, learningSubjects, getLearningBooks, libraryLink } from '../data/learningCatalog.js';
import { series } from '../data/series.js';
import { useDemo } from './DemoContext.jsx';
import { BookTile } from './BookCollection.jsx';
import { EmptyState } from './Shared.jsx';
import { LibraryBookIcon, LibraryClassIcon } from './LibraryIcons.jsx';

export function LearningLibrary({ segments = [], onBookOpen }) {
  const { assignedBooks } = useDemo();
  const titleRef = useRef(null);
  const selectedClass = learningClasses.find(item => item.id === segments[0]);
  const classBooks = selectedClass ? getLearningBooks(assignedBooks, { classId: selectedClass.id }) : [];
  const selectedSeries = series.find(item => item.id === segments[1]) || series.find(item => classBooks.some(item.of)) || series[0];
  const selection = { classId: selectedClass?.id, seriesId: selectedSeries.id };
  const subjectOptions = selectedClass ? learningSubjects.filter(subject => getLearningBooks(classBooks, { seriesId: selectedSeries.id, subjectId: subject.id }).length > 0) : [];
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
    <div className="learning-library">
      <a className="school-back" href={backHref} aria-label={step === 0 ? 'Back to dashboard' : 'Back to previous selection'}>←</a>
      <header className="library-heading portal-panel">
        <span className="library-heading-icon"><LibraryBookIcon /></span>
        <div>
          <h1 ref={titleRef} tabIndex="-1">Explore Books</h1>
          {selectedClass && <p>{selectedClass.name}{selectedSubject ? ` / ${selectedSeries.name} / ${selectedSubject.name}` : ''}</p>}
        </div>
      </header>
      <ol className="library-steps portal-panel" aria-label="Book selection steps">
        {steps.map((item, index) => (
          <li key={item.label} className={index < step ? 'complete' : index === step ? 'current' : ''} aria-current={index === step ? 'step' : undefined}>
            {index < step ? <a href={item.href}><span className="library-step-number">✓</span><span>{item.label}</span></a> : <div><span className="library-step-number">{index + 1}</span><span>{item.label}</span></div>}
          </li>
        ))}
      </ol>
      {step === 0 ? (assignedBooks.length ? (
        <section aria-label="Select your class" className="library-choice-grid library-class-grid">
          {learningClasses.map(item => {
            const count = getLearningBooks(assignedBooks, { classId: item.id }).length;
            return <a key={item.id} className="library-choice-card" href={libraryLink(item.id)}><LibraryClassIcon /><h2>{item.name}</h2><p>{count ? `${count} book${count === 1 ? '' : 's'} available` : 'No books available'}</p></a>;
          })}
        </section>
      ) : <EmptyState title="No books assigned">Contact your administrator to assign books to your demo library.</EmptyState>) : (
        <>
          <section className="library-series" aria-label="Select series">
            <h2>Series</h2>
            <div className="library-series-options">
              {series.map(item => <a key={item.id} href={libraryLink(selectedClass.id, item.id)} className={selectedSeries.id === item.id ? 'selected' : ''} aria-current={selectedSeries.id === item.id ? 'true' : undefined}>{item.name}</a>)}
            </div>
          </section>
          {step === 1 ? (
            subjectOptions.length ? <section className="library-choice-grid library-subject-grid" aria-label="Select your subject">
              {subjectOptions.map(subject => <a className="library-choice-card library-subject-card" key={subject.id} href={libraryLink(selectedClass.id, selectedSeries.id, subject.id)}><LibraryBookIcon /><h2>{subject.name}</h2><p>{selectedSeries.name}</p></a>)}
            </section> : <EmptyState title={assignedBooks.length ? 'No books available for this selection' : 'No books assigned'}>{assignedBooks.length ? `There are no assigned ${selectedSeries.name} books for ${selectedClass.name}. Choose another series or class.` : 'Contact your administrator to assign books to your demo library.'}</EmptyState>
          ) : (
            <section className="library-results" aria-label={`${selectedSubject.name} books`}>
              <div className="portal-page-heading"><h2>{selectedSubject.name} books</h2><span className="portal-pill">{selectedBooks.length} available</span></div>
              <div className="portal-book-grid">{selectedBooks.map(book => <BookTile key={book.id} book={book} onBookOpen={onBookOpen} />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
