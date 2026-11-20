import { useEffect, useState } from 'react';

export function useMobileLayout() {
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 1023px)').matches);
  useEffect(() => {
    const query = matchMedia('(max-width: 1023px)');
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update); update();
    return () => query.removeEventListener('change', update);
  }, []);
  return mobile;
}

export function usePortalDrawer({ open, mobile, sidebarRef, closeRef, toggleRef, onClose }) {
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    if (mobile) document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !mobile) return;
      const targets = [...(sidebarRef.current?.querySelectorAll('a[href],button:not(:disabled)') || [])];
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      if (mobile) document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      queueMicrotask(() => { if (toggleRef.current?.isConnected) toggleRef.current.focus(); });
    };
  }, [open, mobile, sidebarRef, closeRef, toggleRef, onClose]);
}
