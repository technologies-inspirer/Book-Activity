import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { books } from '../data/books.js';
import { availableBooks, createDemoStore } from './demoStore.js';

const DemoContext = createContext(null);
export function DemoProvider({ children }) {
  const [store] = useState(() => createDemoStore(books.map(book => book.id)));
  const state = useSyncExternalStore(store.subscribe, store.snapshot);
  const [, updateClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => updateClock(value => value + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  const account = state.accounts.find(value => value.id === state.currentId) || null;
  return <DemoContext.Provider value={{ ...state, store, account, assignedBooks: availableBooks(account, books) }}>{children}</DemoContext.Provider>;
}
export const useDemo = () => useContext(DemoContext);
