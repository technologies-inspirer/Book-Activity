import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);
const duration = 5000;

function Toast({ item, dismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), duration);
    return () => clearTimeout(timer);
  }, [item.id, dismiss]);
  return <div className={`portal-toast ${item.error ? 'is-error' : 'is-success'}`} role={item.error ? 'alert' : 'status'}>
    <span className="portal-toast-icon" aria-hidden="true">{item.error ? '!' : '\u2713'}</span>
    <div className="portal-toast-content"><strong>{item.error ? 'Please check' : 'Success'}</strong><p>{item.text}</p></div>
    <button type="button" className="portal-toast-close" aria-label="Dismiss notification" onClick={() => dismiss(item.id)}>&#215;</button>
    <span className="portal-toast-progress" style={{ animationDuration: `${duration}ms` }} aria-hidden="true" />
  </div>;
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const [target, setTarget] = useState(document.body);
  const sequence = useRef(0);
  const notify = useCallback(message => {
    if (!message?.text) return;
    const item = { ...message, id: ++sequence.current };
    setItems(current => [...current.slice(-3), item]);
  }, []);
  const dismiss = useCallback(id => setItems(current => current.filter(item => item.id !== id)), []);
  useEffect(() => {
    // Keep notifications visible and interactive above a native modal dialog.
    const sync = () => setTarget([...document.querySelectorAll('dialog[open]')].at(-1) || document.body);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    sync();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let reported = false;
    const invalid = event => {
      event.preventDefault();
      if (reported) return;
      reported = true;
      queueMicrotask(() => { reported = false; });
      const field = event.target;
      const label = field.labels?.[0]?.childNodes[0]?.textContent?.trim() || field.name || 'this field';
      notify({ error: true, text: field.validity.valueMissing ? `Please fill ${label}.` : field.validationMessage });
      field.focus();
    };
    document.addEventListener('invalid', invalid, true);
    return () => document.removeEventListener('invalid', invalid, true);
  }, [notify]);
  return <ToastContext.Provider value={notify}>{children}{createPortal(<div className="portal-toast-stack" aria-label="Notifications">{items.map(item => <Toast key={item.id} item={item} dismiss={dismiss} />)}</div>, target)}</ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);
