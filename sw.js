const CACHE_NAME = 'jewelife-v0.1.0';
const APP_SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/app.js', './js/audio.js', './js/game-data.js', './js/firebase-service.js', './js/firebase-config.js',
  './assets/images/main.webp', './assets/images/mining.webp', './assets/images/workshop.webp',
  './assets/images/glab.webp', './assets/images/okachimachi.webp', './assets/images/phone.webp',
  './assets/images/sleep.webp', './assets/images/store.webp', './assets/images/character-customize.webp',
  './assets/data/metal-prices.json',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/apple-touch-icon.png', './assets/icons/favicon.png',
  './assets/audio/bgm-main.ogg', './assets/audio/bgm-mining.ogg', './assets/audio/bgm-workshop.ogg',
  './assets/audio/bgm-store.ogg', './assets/audio/bgm-glab.ogg', './assets/audio/bgm-okachimachi.ogg', './assets/audio/bgm-sleep.ogg',
  './assets/audio/amb-main.ogg', './assets/audio/amb-mining.ogg', './assets/audio/amb-workshop.ogg',
  './assets/audio/amb-store.ogg', './assets/audio/amb-glab.ogg', './assets/audio/amb-okachimachi.ogg', './assets/audio/amb-sleep.ogg',
  './assets/audio/sfx-select.ogg', './assets/audio/sfx-impact.ogg', './assets/audio/sfx-success.ogg',
  './assets/audio/sfx-error.ogg', './assets/audio/sfx-explosion.ogg'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/assets/data/metal-prices.json')) {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  })));
});
