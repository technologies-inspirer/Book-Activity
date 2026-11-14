const key = 'bookActivityLesson';

// A lesson is a view above an open reader, not a new visit to the book cover.
export function createLessonHistory({ history, onReturn, onRestore }) {
  let active = null;
  return {
    open(bookId, lessonKey, readerHash) {
      const replacing = active?.bookId === bookId;
      active = { bookId, lessonKey, readerHash };
      history[replacing ? 'replaceState' : 'pushState']({ ...history.state, [key]: active }, '', readerHash);
    },
    close() {
      if (!active) return false;
      history.back();
      return true;
    },
    pop() {
      const entry = history.state?.[key];
      if (entry && onRestore(entry)) {
        active = entry;
      } else if (active) {
        const previous = active;
        active = null;
        // Stepping through other letters must return to the latest lesson's page.
        history.replaceState(history.state, '', previous.readerHash);
        onReturn(previous);
      }
    }
  };
}
