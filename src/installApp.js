// Install the site as a tablet app: an "Install app" button when the browser offers it (Chrome, Edge, Samsung
// Internet on Android tablets), and the menu steps where it does not (Opera, Samsung Internet, Firefox, iPad Safari).
// Once installed it opens full screen from its own icon (manifest.webmanifest), so neither shows there.

const installed = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
const DISMISSED = 'javed-books.install-dismissed';
const remembered = () => { try { return localStorage.getItem(DISMISSED) === '1'; } catch { return false; } };
const remember = () => { try { localStorage.setItem(DISMISSED, '1'); } catch { /* private mode: ask again next time */ } };

function banner(text, action) {
  document.querySelector('.install-app')?.remove();
  const box = document.createElement('div');
  box.className = 'install-app';
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', 'Install the app');
  const img = document.createElement('img');
  img.src = 'assets/app-icon-192.png'; img.alt = '';
  const copy = document.createElement('span');
  copy.textContent = text;
  box.append(img, copy);
  if (action) {
    const go = document.createElement('button');
    go.type = 'button'; go.className = 'install-app-go'; go.textContent = 'Install app';
    go.addEventListener('click', action);
    box.append(go);
  }
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'install-app-close'; close.setAttribute('aria-label', 'Not now'); close.textContent = '×';
  close.addEventListener('click', () => { remember(); box.remove(); });
  box.append(close);
  document.body.append(box);
  return box;
}

export function startInstallApp() {
  // the service worker makes the app installable; development keeps the live-reloading server untouched
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(error => console.warn('App install: no service worker.', error));
  }
  if (installed() || remembered()) return;
  let offered = false;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    offered = true;
    const box = banner('Use Javed Books as an app on this tablet: full screen, from its own icon.', async () => {
      box.remove();
      event.prompt();
      await event.userChoice.catch(() => null);
    });
  });
  window.addEventListener('appinstalled', () => document.querySelector('.install-app')?.remove());
  // Browsers without an install prompt (or that offer it only from their menu) get their own steps, once.
  // The same app installs in each: manifest.webmanifest, sw.js.
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const steps = ios ? (/CriOS|FxiOS|EdgiOS|OPT\//.test(ua) ? null : 'Use it as an app: tap Share, then "Add to Home Screen".')
    : /OPR\/|OPT\/|Opera/.test(ua) ? 'Use it as an app in Opera: tap the menu (⋮ or O), then "Add to", then "Home screen".'
    : /SamsungBrowser/.test(ua) ? 'Use it as an app in Samsung Internet: tap the menu (≡), then "Add page to", then "Home screen".'
    : /Firefox|FxiOS/.test(ua) ? 'Use it as an app in Firefox: tap the menu (⋮), then "Install" or "Add to Home screen".'
    : null;
  if (steps && matchMedia('(any-pointer: coarse)').matches) {
    setTimeout(() => { if (!offered && !installed() && !remembered()) banner(steps); }, 3000);
  }
}
