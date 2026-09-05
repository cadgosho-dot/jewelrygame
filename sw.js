const VERSION = '0.10.908';
const APP_CACHE = `jewelrygame-app-v${VERSION}`;
const RUNTIME_CACHE = `jewelrygame-runtime-v${VERSION}`;
const MEDIA_CACHE = 'jewelrygame-media-v1';
const CACHE_PREFIX = 'jewelrygame-';
const CORE_SHELL = [
  './', './index.html', './game.html', './auth.html', './auth-cache-recovery.js?v=0.10.908', './hosting-origin-guard.js', './viewport-shell.css', './viewport-shell.js', './styles.css',
  './manifest.webmanifest', './quiz-event-v2.css?v=0.10.908', './js/app.js?v=0.10.908', './js/runtime/lazy-modules.js?v=0.10.908', './js/runtime/finished-video-cache-warm.js?v=0.10.908', './js/ui/winter-cold-text-effect.js?v=0.10.908', './js/ui/toast-presenter.js?v=0.10.908', './js/ui/modal-presenter.js?v=0.10.908', './js/ui/autosave-status-presenter.js?v=0.10.908', './js/ui/clipboard-fallback.js?v=0.10.908', './js/ui/gift-labels.js?v=0.10.908', './js/ui/craft-surface.js?v=0.10.908', './js/ui/press-hold-controller.js?v=0.10.908', './js/audio.js?v=0.10.908', './js/audio-scene-map.js?v=0.10.908', './js/game-data.js?v=0.10.908', './js/memories-screen.js?v=0.10.908', './js/memories-backgrounds.js?v=0.10.908', './js/daily-gems-index.js?v=0.10.908',
  './js/ui/tool-brief.js?v=0.10.908',
  './js/ui/store-branch-label.js?v=0.10.908',
  './js/ui/viewport-clamp.js?v=0.10.908',
  './js/ui/meal-time-message.js?v=0.10.908',
  './js/ui/loose-shape-label.js?v=0.10.908',
  './js/ui/rough-display-name.js?v=0.10.908',
  './js/ui/time-remaining-label.js?v=0.10.908',
  './js/ui/workshop-staff-quality-description.js?v=0.10.908',
  './js/ui/workshop-loose-display-name.js?v=0.10.908',
  './js/ui/metal-market-date-label.js?v=0.10.908',
  './js/ui/metal-price-date-label.js?v=0.10.908',
  './js/ui/phone-item-effect-text.js?v=0.10.908',
  './js/ui/save-diagnostic-date-label.js?v=0.10.908',
  './js/ui/save-diagnostic-bytes-label.js?v=0.10.908',
  './js/ui/save-diagnostic-capacity-label.js?v=0.10.908',
  './js/ui/birthday-japanese-label.js?v=0.10.908',
  './js/ui/game-date-label.js?v=0.10.908',
  './js/ui/finance-row-date-label.js?v=0.10.908',
  './js/ui/notification-date-label.js?v=0.10.908',
  './js/ui/customer-preference-label.js?v=0.10.908',
  './js/ui/customer-template-text.js?v=0.10.908',
  './js/ui/store-display-name.js?v=0.10.908',
  './js/ui/artisan-title.js?v=0.10.908',
  './js/ui/loose-display-label.js?v=0.10.908',
  './js/ui/install-status-text.js?v=0.10.908',
  './js/ui/metal-weight-label.js?v=0.10.908',
  './js/japan-holidays.js', './js/firebase-config.js',
  './js/google-auth-bridge.js?v=0.10.908', './js/security-config.js', './js/firebase-service.js?v=0.10.908', './js/local-save-storage.js?v=0.10.908',
  './assets/images/okachimachi-night.webp', './assets/images/okachimachi-night-portrait.webp',
  './assets/images/meal-after18-v727.webp', './assets/images/meal-after18-portrait-v727.webp',
  // v0.10.759: seasonal main-screen backgrounds (landscape + portrait).
  './assets/images/main-menu-new-year.webp', './assets/images/main-menu-new-year-portrait.webp',
  './assets/images/main-menu-spring.webp', './assets/images/main-menu-spring-portrait.webp',
  './assets/images/main-menu-tanabata.webp', './assets/images/main-menu-tanabata-portrait.webp',
  './assets/images/main-menu-obon.webp', './assets/images/main-menu-obon-portrait.webp',
  './assets/images/main-menu-late-summer.webp', './assets/images/main-menu-late-summer-portrait.webp',
  './assets/images/main-menu-halloween.webp', './assets/images/main-menu-halloween-portrait.webp',
  './assets/images/main-menu-late-autumn.webp', './assets/images/main-menu-late-autumn-portrait.webp',
  './assets/images/main-menu-christmas.webp', './assets/images/main-menu-christmas-portrait.webp',
  './assets/images/main-menu-snow.webp', './assets/images/main-menu-snow-portrait.webp',
  './assets/images/events/yowamushi.png', './assets/images/events/one-love.png', './assets/images/loose/rosequartz/oval-cabochon.png',
  './assets/images/events/hospital-room-landscape.jpg', './assets/images/events/hospital-room-portrait.jpg', './assets/audio/amb-hospital-clock.wav',
  // v0.10.666: large event images and quiz data are runtime-cached on first use instead of being downloaded during every SW install.
];

async function trimCache(cacheName, maxEntries = 320) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  while (keys.length > maxEntries) await cache.delete(keys.shift());
}

async function networkFirst(request, fallback = './index.html') {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (_) {
    return (await cache.match(request)) || (await cache.match(fallback));
  }
}

// Documents are always revalidated from the network so an old browser HTTP cache
// cannot keep index.html/game.html on a previous build after a deploy.
async function documentNetworkFirst(request, fallback = './index.html') {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (_) {
    return (await cache.match(request))
      || (await cache.match(request, { ignoreSearch: true }))
      || (await cache.match(fallback, { ignoreSearch: true }))
      || Response.error();
  }
}

async function kaitenzushiDocumentNetworkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  const canonicalUrl = new URL('./assets/minigames/kaitenzushi/game/index.html', self.registration.scope).href;
  try {
    const response = await fetch(request);
    if (response.ok) {
      await Promise.allSettled([
        cache.put(request, response.clone()),
        cache.put(canonicalUrl, response.clone()),
      ]);
      return response;
    }
  } catch (_) {}
  const cached = (await cache.match(request, { ignoreSearch: true }))
    || (await cache.match(canonicalUrl, { ignoreSearch: true }));
  if (cached) return cached;
  return new Response(`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>回転寿司 読み込みエラー</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#120b08;color:#fff2d2;font-family:sans-serif;text-align:center"><main><strong>回転寿司を読み込めませんでした</strong><p>通信またはキャッシュを更新して、もう一度お試しください。</p></main></body></html>`, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const appCache = await caches.open(APP_CACHE);
  const cached = (await cache.match(request)) || (await appCache.match(request, { ignoreSearch: true }));
  const update = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(RUNTIME_CACHE).catch(() => {});
    }
    return response;
  }).catch(() => null);

  if (cached) {
    update.catch(() => {});
    return cached;
  }
  return (await update) || Response.error();
}

async function cacheFirst(request, cacheName = APP_CACHE) {
  const cache = await caches.open(cacheName);
  const cached = (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone()).catch(() => {});
  return response;
}

// v0.10.706: scripts and styles must not be served from an older cache merely
// because their query string differs. Online loads fetch the current bytes;
// exact-version cache and the unversioned app shell are offline fallbacks only.
// v0.10.751: 古い端末の更新取りこぼし対策を維持し、オンライン時はHTTPキャッシュも再利用しない。
async function versionedResourceNetworkFirst(request) {
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const appCache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) runtimeCache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (_) {
    return (await runtimeCache.match(request))
      || (await appCache.match(request))
      || (await appCache.match(request, { ignoreSearch: true }))
      || Response.error();
  }
}

function parseByteRange(rangeHeader, totalLength) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader || '').trim());
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : NaN;
  let end = match[2] ? Number(match[2]) : NaN;
  if (!Number.isFinite(start) && Number.isFinite(end)) {
    start = Math.max(0, totalLength - end);
    end = totalLength - 1;
  } else {
    if (!Number.isFinite(start)) start = 0;
    if (!Number.isFinite(end)) end = totalLength - 1;
  }
  start = Math.max(0, Math.floor(start));
  end = Math.min(totalLength - 1, Math.floor(end));
  if (start > end || start >= totalLength) return null;
  return { start, end };
}

async function videoCacheFirst(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const canonicalRequest = new Request(request.url, { method: 'GET' });
  const cached = await cache.match(canonicalRequest);
  const rangeHeader = request.headers.get('range');

  if (cached && cached.ok) {
    if (!rangeHeader) return cached;
    try {
      const buffer = await cached.arrayBuffer();
      const range = parseByteRange(rangeHeader, buffer.byteLength);
      if (range) {
        const headers = new Headers(cached.headers);
        headers.set('Content-Range', `bytes ${range.start}-${range.end}/${buffer.byteLength}`);
        headers.set('Content-Length', String(range.end - range.start + 1));
        headers.set('Accept-Ranges', 'bytes');
        return new Response(buffer.slice(range.start, range.end + 1), { status: 206, statusText: 'Partial Content', headers });
      }
    } catch (_) {}
  }

  const response = await fetch(request);
  if (!rangeHeader && response.ok && response.status === 200) {
    cache.put(canonicalRequest, response.clone()).then(() => trimCache(MEDIA_CACHE, 24)).catch(() => {});
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(CORE_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && ![APP_CACHE, RUNTIME_CACHE, MEDIA_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const destination = event.request.destination;
  if (destination === 'video' || url.pathname.includes('/assets/videos/')) {
    event.respondWith(videoCacheFirst(event.request));
    return;
  }
  if (url.pathname.endsWith('/assets/minigames/kaitenzushi/game/index.html')) {
    event.respondWith(kaitenzushiDocumentNetworkFirst(event.request));
    return;
  }
  if (event.request.mode === 'navigate' || destination === 'document') {
    event.respondWith(documentNetworkFirst(event.request));
    return;
  }
  if (['script', 'style'].includes(destination) || url.pathname.includes('/js/')) {
    event.respondWith(versionedResourceNetworkFirst(event.request));
    return;
  }
  if (['image', 'audio', 'font'].includes(destination) || url.pathname.includes('/assets/')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  event.respondWith(networkFirst(event.request));
});
