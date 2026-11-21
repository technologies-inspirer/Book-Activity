export const pageSpread = page => Math.floor((page - 1) / 2);

export function lessonAtSpread(lessons, spread) {
  return lessons.find(lesson => pageSpread(lesson.page) === spread) || lessons.find(lesson => pageSpread(lesson.tracePage) === spread) || null;
}

// Multiple rhymes can share a printed page. Keep the selected title distinct.
export function rhymeAtSpread(rhymes, spread, selected) {
  const matches = rhymes.filter(rhyme => pageSpread(rhyme.page) === spread);
  return matches.find(rhyme => rhyme.page === selected?.page && rhyme.title === selected?.title) || matches[0] || null;
}
