(() => {
  'use strict';

  const BUILD_VERSION = '0.10.706';
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

  // This uniquely named bootstrap is fetched even when an older Service Worker
  // ignores query strings. It updates the worker before authentication modules
  // are allowed to remain stale, then reloads once when control changes.
  const refreshWorker = () => {
    navigator.serviceWorker.register(`./sw.js?v=${BUILD_VERSION}`)
      .then((registration) => registration.update())
      .catch((error) => console.warn('[SW recovery] update failed', error));
  };

  refreshWorker();
})();
