const CACHE_NAME = 'jewelrygame-clean-v0.10.13';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/audio.js',
  './js/game-data.js',
  './js/firebase-config.js',
  './js/firebase-service.js',
  './assets/images/main.webp',
  './assets/images/main-portrait.webp',
  './assets/images/mining.webp',
  './assets/images/workshop.webp',
  './assets/images/store.webp',
  './assets/images/glab.webp',
  './assets/images/okachimachi.webp',
  './assets/images/okachimachi-portrait.webp',
  './assets/images/phone.webp',
  './assets/images/tools/placeholder.svg',
  './assets/images/customers/customer-placeholder.svg',
  './assets/images/sleep.webp',
  './assets/images/meal-menu.webp',
  './assets/images/meal-convenience.webp',
  './assets/images/meal-convenience-portrait.webp',
  './assets/images/meal-soba.webp',
  './assets/images/meal-soba-portrait.webp',
  './assets/images/meal-ramen.webp',
  './assets/images/meal-ramen-portrait.webp',
  './assets/images/meal-hamburger.webp',
  './assets/images/meal-hamburger-portrait.webp',
  './assets/images/meal-indian.webp',
  './assets/images/meal-indian-portrait.webp',
  './assets/images/meal-korean.webp',
  './assets/images/meal-korean-portrait.webp',
  './assets/images/meal-chinese.webp',
  './assets/images/meal-chinese-portrait.webp',
  './assets/images/meal-kebab.webp',
  './assets/images/meal-kebab-portrait.webp',
  './assets/images/gems/garnet.png',
  './assets/images/gems/amethyst.png',
  './assets/images/gems/aquamarine.png',
  './assets/images/gems/diamond.png',
  './assets/images/gems/emerald.png',
  './assets/images/gems/moonstone.png',
  './assets/images/gems/ruby.png',
  './assets/images/gems/peridot.png',
  './assets/images/gems/sapphire.png',
  './assets/images/gems/opal.png',
  './assets/images/gems/imperialtopaz.png',
  './assets/images/gems/turquoise.png',
  './assets/images/gems/lapislazuli.png',
  './assets/images/gems/paraibatourmaline.png',
  './assets/images/gems/tourmaline.png',
  './assets/images/gems/tanzanite.png',
  './assets/images/gems/citrine.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon.png',
  './assets/audio/bgm-main.ogg',
  './assets/audio/bgm-mining.ogg',
  './assets/audio/bgm-workshop.ogg',
  './assets/audio/bgm-store.ogg',
  './assets/audio/bgm-glab.ogg',
  './assets/audio/bgm-okachimachi.ogg',
  './assets/audio/bgm-phone.ogg',
  './assets/audio/bgm-sleep.ogg',
  './assets/audio/bgm-meal.ogg',
  './assets/audio/bgm-meal-convenience.ogg',
  './assets/audio/bgm-meal-soba.ogg',
  './assets/audio/bgm-meal-ramen.ogg',
  './assets/audio/bgm-meal-hamburger.ogg',
  './assets/audio/bgm-meal-indian.ogg',
  './assets/audio/bgm-meal-korean.ogg',
  './assets/audio/bgm-meal-chinese.ogg',
  './assets/audio/bgm-meal-kebab.ogg',
  './assets/audio/amb-main.ogg',
  './assets/audio/amb-mining.ogg',
  './assets/audio/amb-workshop.ogg',
  './assets/audio/amb-store.ogg',
  './assets/audio/amb-glab.ogg',
  './assets/audio/amb-okachimachi.ogg',
  './assets/audio/amb-phone.ogg',
  './assets/audio/amb-sleep.ogg',
  './assets/audio/amb-meal.ogg',
  './assets/audio/amb-meal-convenience.ogg',
  './assets/audio/amb-meal-soba.ogg',
  './assets/audio/amb-meal-ramen.ogg',
  './assets/audio/amb-meal-hamburger.ogg',
  './assets/audio/amb-meal-indian.ogg',
  './assets/audio/amb-meal-korean.ogg',
  './assets/audio/amb-meal-chinese.ogg',
  './assets/audio/amb-meal-kebab.ogg',
  './assets/audio/sfx-select.ogg',
  './assets/audio/sfx-impact.ogg',
  './assets/audio/sfx-success.ogg',
  './assets/audio/sfx-error.ogg',
  './assets/audio/sfx-explosion.ogg',
  './assets/audio/sfx-dig.ogg',
  './assets/audio/sfx-mining-win.ogg',
  './assets/audio/sfx-mining-miss.ogg',
  './assets/audio/sfx-sale.ogg',
  './assets/audio/sfx-eat.ogg',
  './assets/audio/sfx-levelup.ogg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))),
  );
});
