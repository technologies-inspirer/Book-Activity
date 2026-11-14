// Reviewed against the printed pages. `page` is the reader's one-based image
// index; `printedPage` accounts for the English book's unnumbered front cover.
const rhymes = {
  'new-stemford-english-3': [
    { title: 'Baa! Baa! Black Sheep', page: 16, printedPage: 15 },
    { title: 'I See the Moon', page: 38, printedPage: 37 },
    { title: 'Johnny, Johnny', page: 38, printedPage: 37 },
    { title: 'Twinkle, Twinkle', page: 60, printedPage: 59 },
    { title: 'Ring-a-Ring o’ Roses', page: 60, printedPage: 59 }
  ],
  'stemford-urdu-3': [
    { title: 'الف سے اللہ', page: 9 },
    { title: 'ا، ب، پ، ت، ث', page: 21 },
    { title: 'چندا ماموں', page: 31 },
    { title: 'راجا رانی', page: 47 },
    { title: 'سو جاؤ منّا', page: 57 },
    { title: 'طوطا ہوں میں', page: 67 },
    { title: 'کوّا', page: 81 },
    { title: 'ہاتھی', page: 93 }
  ]
};

export function bookRhymes(book) {
  return (rhymes[book.id] || []).filter(item => book.pages[item.page - 1]).map(item => ({ ...item, printedPage: item.printedPage || item.page }));
}

export function rhymeSpread(page) {
  return Math.floor((page - 1) / 2);
}
