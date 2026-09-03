// Isolated runtime helper for warming completed event videos into the browser/service-worker cache.
export function installFinishedVideoCacheWarm({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  videoElementCtor = globalThis.HTMLVideoElement,
  fetchImpl = (...args) => globalThis.fetch(...args),
  setTimeoutImpl = (...args) => globalThis.setTimeout(...args),
} = {}) {
  if (!documentRef?.addEventListener) throw new TypeError('documentRef must support addEventListener');
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (typeof setTimeoutImpl !== 'function') throw new TypeError('setTimeoutImpl must be a function');

  function warmFinishedVideoCache(video) {
    if (typeof videoElementCtor !== 'function' || !(video instanceof videoElementCtor)) return false;
    const url = String(video.currentSrc || video.src || '');
    if (!url || !url.includes('/assets/videos/')) return false;

    const warm = () => Promise.resolve(fetchImpl(url, {
      cache: 'force-cache',
      credentials: 'same-origin',
    })).catch(() => {});

    if (typeof windowRef?.requestIdleCallback === 'function') {
      windowRef.requestIdleCallback(warm, { timeout: 2500 });
    } else {
      setTimeoutImpl(warm, 0);
    }
    return true;
  }

  const onEnded = (event) => {
    warmFinishedVideoCache(event?.target);
  };
  documentRef.addEventListener('ended', onEnded, true);

  return Object.freeze({
    warmFinishedVideoCache,
    uninstall() {
      documentRef.removeEventListener?.('ended', onEnded, true);
    },
  });
}
