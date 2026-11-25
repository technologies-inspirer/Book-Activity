import { useState, useSyncExternalStore } from 'react';
import { installController } from './install.js';
import './pwa.css';

export function PwaInstall() {
  const state = useSyncExternalStore(installController.subscribe, installController.getSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const [help, setHelp] = useState(false);
  const [error, setError] = useState(false);
  if (state.installed || (!state.available && !error) || dismissed) return null;
  async function install() {
    if (state.manual) { setHelp(!help); return; }
    try { await installController.install(); } catch { setError(true); }
  }
  return <aside className="pwa-install" aria-label="Install Javed Books">
    {help && state.manual && <p id="pwa-install-help">{state.instructions}</p>}
    {error && <p role="status">Use your browser menu to install this app.</p>}
    <div>{!error && <button type="button" className="pwa-install-action" onClick={install} disabled={state.busy} aria-describedby={help && state.manual ? 'pwa-install-help' : undefined} aria-expanded={state.manual ? help : undefined}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" /></svg>
      {state.busy ? 'Installing…' : 'Install App'}
    </button>}<button className="pwa-install-dismiss" type="button" aria-label="Dismiss install suggestion" onClick={() => setDismissed(true)}>×</button></div>
  </aside>;
}
