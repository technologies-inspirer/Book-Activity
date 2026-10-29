import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { books } from '../data/books.js';
import { availableBooks, createDemoStore } from './demoStore.js';
import { series as originalSeries } from '../data/series.js';

const DemoContext = createContext(null);
export function DemoProvider({ children }) {
  const [bookDraft, setBookDraft] = useState(null);
  const [savedBookDraft, setSavedBookDraft] = useState(null);
  const [store] = useState(() => {
    let storage;
    try { storage = window.localStorage; } catch { /* Browser storage may be disabled. */ }
    return createDemoStore(books.map(book => book.id), storage);
  });
  const state = useSyncExternalStore(store.subscribe, store.snapshot);
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
