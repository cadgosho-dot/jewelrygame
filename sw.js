const VERSION = '0.10.752';
const APP_CACHE = `jewelrygame-app-v${VERSION}`;
const RUNTIME_CACHE = `jewelrygame-runtime-v${VERSION}`;
const MEDIA_CACHE = 'jewelrygame-media-v1';
const CORE_SHELL = [
  './', './index.html', './game.html', './auth.html', './auth-cache-recovery-v707.js', './hosting-origin-guard.js', './viewport-shell.css', './viewport-shell.js', './styles.css',
  './manifest.webmanifest', './js/app.js', './js/audio.js?v=0.10.752', './js/audio-scene-map.js?v=0.10.752', './js/game-data.js', './js/memories-screen.js?v=0.10.752', './js/memories-backgrounds.js?v=0.10.752', './js/daily-gems-index.js?v=0.10.691',
  './js/japan-holidays.js', './js/firebase-config.js',
  './js/google-auth-bridge.js?v=0.10.752', './js/security-config.js', './js/firebase-service.js?v=0.10.752',
  './assets/images/okachimachi-night.webp', './assets/images/okachimachi-night-portrait.webp',
  './assets/images/meal-after18-v727.webp', './assets/images/meal-after18-portrait-v727.webp',
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

const AQUARIUM_OBSERVE_PATCH_URL = new URL('./js/aquarium-observe-v734-hotfix.js?v=20260822-1', self.registration.scope).href;

async function aquariumDocumentNetworkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  let response = null;
  try {
    response = await fetch(request);
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
  } catch (_) {
    response = (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
  }
  if (!response || !response.ok) return response || Response.error();
  const contentType = String(response.headers.get('content-type') || '');
  if (!contentType.includes('text/html')) return response;
  const html = await response.text();
  if (html.includes('aquarium-observe-v734-hotfix.js')) {
    return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
  }
  const tag = `<script src="${AQUARIUM_OBSERVE_PATCH_URL}"></script>`;
  const patched = html.includes('</body>') ? html.replace('</body>', `${tag}</body>`) : `${html}${tag}`;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control', 'no-store');
  return new Response(patched, { status: response.status, statusText: response.statusText, headers });
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
      .then((keys) => Promise.all(keys.filter((key) => ![APP_CACHE, RUNTIME_CACHE, MEDIA_CACHE].includes(key)).map((key) => caches.delete(key))))
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
  if (url.pathname.endsWith('/assets/minigames/aquarium/index.html')) {
    event.respondWith(aquariumDocumentNetworkFirst(event.request));
    return;
  }
  if (event.request.mode === 'navigate' || destination === 'document') {
    event.respondWith(networkFirst(event.request));
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
