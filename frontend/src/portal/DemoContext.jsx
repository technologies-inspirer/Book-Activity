import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { books } from '../data/books.js';
import { availableBooks } from './demoStore.js';
import { createPortalStore } from './portalStore.js';
import { series as originalSeries } from '../data/series.js';

const DemoContext = createContext(null);
export function DemoProvider({ children }) {
  const [bookDraft, setBookDraft] = useState(null);
  const [savedBookDraft, setSavedBookDraft] = useState(null);
  const [store] = useState(createPortalStore);
  useEffect(() => {
    store.initialize();
    const refresh = () => { if (store.snapshot().currentId) store.refresh().catch(() => {}); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [store]);
  const state = useSyncExternalStore(store.subscribe, store.snapshot);
  useEffect(() => {
    if (!state.bootError) return;
    const retry = setTimeout(() => store.initialize(), 3000);
    return () => clearTimeout(retry);
  }, [state.bootError, store]);
  const [, updateClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => updateClock(value => value + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  const account = state.accounts.find(value => value.id === state.currentId) || null;
  const series = [...originalSeries, ...state.customSeries.map(item => ({ ...item, of: () => false }))];
  return <DemoContext.Provider value={{ ...state, series, store, account, bookDraft, setBookDraft, savedBookDraft, setSavedBookDraft, assignedBooks: availableBooks(account, books) }}>{children}</DemoContext.Provider>;
}
export const useDemo = () => useContext(DemoContext);
