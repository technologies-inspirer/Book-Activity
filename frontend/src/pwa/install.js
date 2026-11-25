// Installation uses the browser address bar/menu. Never intercept or cancel
// beforeinstallprompt or show a separate dashboard install button.
export function registerPwa(browser = window, production = import.meta.env.PROD, baseUrl = import.meta.env.BASE_URL) {
  if (!production || !browser.isSecureContext || !browser.navigator?.serviceWorker) return;
  // No forced reloads: a deployment must not interrupt a reading or editing session.
  return browser.navigator.serviceWorker.register(`${baseUrl}sw.js`, {
    scope: baseUrl, updateViaCache: 'none'
  }).catch(error => console.warn('App installation is unavailable on this browser.', error));
}
