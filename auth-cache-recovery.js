(() => {
  'use strict';

  // Canonical PWA recovery bootstrap. Keep BUILD_VERSION synchronized with VERSION.
  const BUILD_VERSION = '0.10.799';
  const RELOAD_MARKER = `jxj-sw-controller-reloaded-${BUILD_VERSION}`;
  if (!('serviceWorker' in navigator)) return;
  if (window.top !== window.self) return;

  const hadControllerAtStart = Boolean(navigator.serviceWorker.controller);
  let reloadStarted = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAtStart || reloadStarted) return;
    try {
      if (sessionStorage.getItem(RELOAD_MARKER) === '1') return;
      sessionStorage.setItem(RELOAD_MARKER, '1');
    } catch (_) {}
    reloadStarted = true;
    location.reload();
  });

  // Fetch the Service Worker update without reusing the HTTP cache. Authentication
  // state and game saves are never deleted here.
  const refreshWorker = () => {
    navigator.serviceWorker.register(`./sw.js?v=${BUILD_VERSION}`, { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((error) => console.warn('[SW recovery] update failed', error));
  };

  refreshWorker();
})();
