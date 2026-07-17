const VERSION = '0.10.138';
const APP_CACHE = `jewelrygame-app-v${VERSION}`;
const RUNTIME_CACHE = `jewelrygame-runtime-v${VERSION}`;
const APP_SHELL = [
  './', './index.html', './game.html', './viewport-shell.css', './viewport-shell.js', './styles.css',
  './manifest.webmanifest', './js/app.js', './js/audio.js', './js/game-data.js', './js/japan-holidays.js', './js/firebase-config.js',
  './js/security-config.js', './js/firebase-service.js', './data/metals.json', './assets/images/main.webp', './assets/images/main-portrait.webp',
  './assets/images/tools/placeholder.svg', './assets/images/equipment/basic-pickaxe.png', './assets/images/customers/customer-placeholder.svg',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/apple-touch-icon.png', './assets/icons/favicon.png',
  './assets/audio/bgm-main.ogg', './assets/audio/amb-main-clear.ogg', './assets/audio/amb-main-cloudy.ogg',
  './assets/audio/amb-main-rain.ogg', './assets/audio/amb-main-snow.ogg',
];

const OPTIONAL_MEDIA = [
  './assets/images/mining.webp', './assets/images/workshop.webp', './assets/images/glab.webp',
  './assets/images/okachimachi.webp', './assets/images/okachimachi-portrait.webp', './assets/images/store.webp',
  './assets/images/phone.webp', './assets/images/sleep.webp', './assets/images/meal-menu.webp',
  './assets/images/meal-convenience.webp', './assets/images/meal-convenience-portrait.webp',
  './assets/images/meal-chinese.webp', './assets/images/meal-chinese-portrait.webp',
  './assets/images/meal-korean.webp', './assets/images/meal-korean-portrait.webp',
  './assets/images/meal-indian.webp', './assets/images/meal-indian-portrait.webp',
  './assets/images/meal-kebab.webp', './assets/images/meal-kebab-portrait.webp',
  './assets/images/meal-ramen.webp', './assets/images/meal-ramen-portrait.webp',
  './assets/images/meal-soba.webp', './assets/images/meal-soba-portrait.webp',
  './assets/images/meal-hamburger.webp', './assets/images/meal-hamburger-portrait.webp',
  './assets/images/foods/convenience.png', './assets/images/foods/chinese.png', './assets/images/foods/korean.png', './assets/images/foods/indian.png',
  './assets/images/foods/kebab.png', './assets/images/foods/ramen.png', './assets/images/foods/soba.png', './assets/images/foods/hamburger.png',
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(async (cache) => {
        await cache.addAll(APP_SHELL);
        await Promise.allSettled(OPTIONAL_MEDIA.map((asset) => cache.add(asset)));
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![APP_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const destination = event.request.destination;
  if (event.request.mode === 'navigate' || ['document', 'script', 'style'].includes(destination)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  if (['image', 'audio', 'font'].includes(destination) || url.pathname.includes('/assets/')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  event.respondWith(networkFirst(event.request));
});
