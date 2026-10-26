import { useEffect, useRef } from 'react';
import { mountBookActivityApp } from '../../app.js';
import { useDemo } from '../portal/DemoContext.jsx';

export function BookReader({ intro, onIntroConsumed }) {
  const hostRef = useRef(null);
  const { store } = useDemo();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const cleanup = mountBookActivityApp(host, { intro, onPositionChange: store.rememberPosition });
    if (intro) onIntroConsumed();
    return cleanup;
  }, []);

  return <div ref={hostRef} />;
}
