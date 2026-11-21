export const series = [
  { id: 'stemford', name: 'StemFord Series', of: book => book.seriesId ? book.seriesId === 'stemford' : !/^maxford/.test(book.id) },
  { id: 'maxford', name: 'MaxFord Series', of: book => book.seriesId ? book.seriesId === 'maxford' : /^maxford/.test(book.id) }
];

export const seriesOf = book => book.seriesId ? { id: book.seriesId, name: series.find(item => item.id === book.seriesId)?.name || book.seriesId } : series.find(item => item.of(book)) || series[0];
