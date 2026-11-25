export function createInstallController(browser) {
  const display = browser.matchMedia('(display-mode: standalone)');
  const ios = /iPad|iPhone|iPod/.test(browser.navigator.userAgent) ||
    (browser.navigator.platform === 'MacIntel' && browser.navigator.maxTouchPoints > 1);
  const listeners = new Set();
  let prompt;
  let state = {
    installed: display.matches || browser.navigator.standalone === true,
    available: true, manual: true, busy: false,
    instructions: ios
      ? 'Open this site in Safari, tap Share, then Add to Home Screen and Add.'
      : 'Open your browser menu and look for Install app or Add to Home Screen. If that option is unavailable, open this site in a browser that supports app installation.'
  };
  const update = changes => {
    state = { ...state, ...changes };
    listeners.forEach(listener => listener());
  };
  browser.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    prompt = event;
    update({ available: true, manual: false });
  });
  browser.addEventListener('appinstalled', () => {
    prompt = null;
    update({ installed: true, available: false, busy: false });
  });
  display.addEventListener('change', () => update({ installed: display.matches || browser.navigator.standalone === true }));
  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async install() {
      if (!prompt || state.busy || state.installed) return;
      const current = prompt;
      prompt = null;
      update({ busy: true });
      try {
        await current.prompt();
        await current.userChoice;
      } finally {
        update({ busy: false, available: !state.installed, manual: !prompt });
      }
    }
  };
}

// Listen before the asynchronous book catalog finishes loading.
export const installController = typeof window === 'undefined' ? null : createInstallController(window);

export function registerPwa() {
  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  // No forced reloads: a deployment must not interrupt a reading or editing session.
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
    scope: import.meta.env.BASE_URL, updateViaCache: 'none'
  }).catch(error => console.warn('App installation is unavailable on this browser.', error));
}
