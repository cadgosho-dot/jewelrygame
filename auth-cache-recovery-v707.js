(() => {
  'use strict';

  // v0.10.755: force the current Service Worker URL so the meal-screen fix is not hidden by an older cache.
  const BUILD_VERSION = '0.10.755';
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

  // Update only the Service Worker cache. Authentication state and game saves
  // are never removed here; existing sessions must remain available to resume.
  const refreshWorker = () => {
    navigator.serviceWorker.register(`./sw.js?v=${BUILD_VERSION}`)
      .then((registration) => registration.update())
      .catch((error) => console.warn('[SW recovery] update failed', error));
  };

  refreshWorker();
})();
