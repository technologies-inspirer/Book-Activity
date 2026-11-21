import { series, seriesOf } from './series.js';

// Missing permissions preserve existing accounts' access; an explicit empty array allows none.
export function allowedSeries(account, choices = series) {
  if (account?.role === 'admin' || !Array.isArray(account?.allowedSeriesIds)) return choices;
  return choices.filter(item => account.allowedSeriesIds.includes(item.id));
}

export function allowsBookSeries(account, book) {
  return account?.role === 'admin' || !Array.isArray(account?.allowedSeriesIds) || account.allowedSeriesIds.includes(seriesOf(book).id);
}
