export const series = [
  { id: 'stemford', name: 'StemFord Series', of: book => !/^maxford/.test(book.id) },
  { id: 'maxford', name: 'MaxFord Series', of: book => /^maxford/.test(book.id) }
];

export const seriesOf = book => series.find(item => item.of(book)) || series[0];
