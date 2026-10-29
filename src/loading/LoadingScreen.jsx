import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { loadingState } from './loadingState.js';

export function LoadingScreen({ label = 'Loading your books...' }) {
  return <div className="book-loading-screen" role="status" aria-live="polite" aria-atomic="true">
    <div className="book-loading-card">
      <div className="book-loading-art" aria-hidden="true"><span className="book-loading-glow" /><img src={`${import.meta.env.BASE_URL}assets/loading-owl.png`} alt="" width="1316" height="1195" /><span className="book-loading-shadow" /></div>
      <p>{label}</p><span className="book-loading-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  </div>;
}

export function GlobalLoader() {
  const label = useSyncExternalStore(loadingState.subscribe, loadingState.snapshot);
  return label ? createPortal(<LoadingScreen label={label} />, document.querySelector('dialog[open]') || document.body) : null;
}
