const VERSION = '0.10.292';
const APP_CACHE = `jewelrygame-app-v${VERSION}`;
const RUNTIME_CACHE = `jewelrygame-runtime-v${VERSION}`;
const APP_SHELL = [
  './', './index.html', './game.html', './auth.html', './viewport-shell.css', './viewport-shell.js', './styles.css',
  './manifest.webmanifest', './js/app.js', './js/audio.js', './js/game-data.js', './js/daily-gems.js', './js/japan-holidays.js', './js/firebase-config.js', './js/google-auth-bridge.js',
  './js/security-config.js', './js/firebase-service.js', './data/metals.json', './data/jewelry_okachimachi_quiz_200_game_format.json', './assets/minigames/kaitenzushi/game/index.html', './assets/images/main.webp', './assets/images/main-portrait.webp',
  './assets/images/tools/placeholder.svg', './assets/images/tools/jewelry-bench.png', './assets/images/tools/loupe.png', './assets/images/robbery-newspaper.webp', './assets/images/equipment/basic-pickaxe.png', './assets/images/customers/customer-placeholder.svg',
  './assets/images/quiz/quiz-king-normal.png', './assets/images/quiz/quiz-king-player-incorrect.png', './assets/images/quiz/quiz-king-player-correct.png',
  './assets/images/events/western-union-messenger.png', './assets/images/events/antique-diamond.png', './assets/images/events/pazupan-miner.png', './assets/images/events/pazupan.png', './assets/images/events/mermaid.png', './assets/images/events/pearl.png',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/apple-touch-icon.png', './assets/icons/favicon.png',
  './assets/audio/bgm-main.ogg', './assets/audio/amb-main-clear.ogg', './assets/audio/amb-main-cloudy.ogg',
  './assets/audio/amb-main-rain.ogg', './assets/audio/amb-main-snow.ogg',
  './assets/audio/amb-street-crowd.ogg',
  './assets/audio/amb-craft.ogg', './assets/audio/amb-polishing.ogg', './assets/audio/amb-realEstate.ogg', './assets/audio/amb-materialShop.ogg', './assets/audio/amb-looseShop.ogg', './assets/audio/amb-jewelryShop.ogg',
  './assets/audio/sfx-jewelry-complete.ogg', './assets/audio/sfx-loose-sparkle.ogg', './assets/audio/sfx-police-siren.ogg',
  './assets/audio/quiz_show_thinking_bgm_60s_loop.mp3', './assets/audio/quiz_correct_sfx.mp3', './assets/audio/quiz_incorrect_sfx.mp3',
];

const OPTIONAL_MEDIA = [
  './assets/images/mining.webp', './assets/images/workshop.webp', './assets/images/glab.webp',
  './assets/images/okachimachi.webp', './assets/images/okachimachi-portrait.webp', './assets/images/loose-shop.webp', './assets/images/jewelry-shop.webp', './assets/images/jewelry-shop-buy-character.png', './assets/images/jewelry-shop-sell-character.png', './assets/images/display-shop.webp', './assets/images/display-shop-portrait.webp', './assets/images/real-estate.webp', './assets/images/real-estate-portrait.webp', './assets/images/store.webp',
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
  './assets/images/display-products/showcase.png', './assets/images/display-products/display-supplies.png', './assets/images/display-products/case.png',
  './assets/images/metals/k18yg.png', './assets/images/metals/pt900.png', './assets/images/metals/sv925.png',
  './assets/images/mining-rocks/rock-01.png', './assets/images/mining-rocks/rock-02.png', './assets/images/mining-rocks/rock-03.png', './assets/images/mining-rocks/rock-04.png', './assets/images/mining-rocks/rock-05.png',
  './assets/images/mining-rocks/rock-06.png', './assets/images/mining-rocks/rock-07.png', './assets/images/mining-rocks/rock-08.png', './assets/images/mining-rocks/rock-09.png', './assets/images/mining-rocks/rock-10.png',
  './assets/images/mining-rocks-broken/broken-01.png', './assets/images/mining-rocks-broken/broken-02.png', './assets/images/mining-rocks-broken/broken-03.png', './assets/images/mining-rocks-broken/broken-04.png', './assets/images/mining-rocks-broken/broken-05.png',
  './assets/minigames/kaitenzushi/data/game_rules.json', './assets/minigames/kaitenzushi/data/sushi_catalog.json',
  './assets/minigames/kaitenzushi/assets/audio/eat_sfx.ogg', './assets/minigames/kaitenzushi/assets/audio/enka_bgm.ogg', './assets/minigames/kaitenzushi/assets/audio/izakaya_ambient.ogg', './assets/minigames/kaitenzushi/assets/background/kaitenzushi_counter_background.png',
  './assets/minigames/kaitenzushi/assets/plates/plate_blue_190.png', './assets/minigames/kaitenzushi/assets/plates/plate_red_250.png', './assets/minigames/kaitenzushi/assets/plates/plate_purple_350.png', './assets/minigames/kaitenzushi/assets/plates/plate_black_850.png',
  './assets/minigames/kaitenzushi/assets/sushi/blue_190/ika.png', './assets/minigames/kaitenzushi/assets/sushi/blue_190/shimesaba.png', './assets/minigames/kaitenzushi/assets/sushi/blue_190/iwashi.png', './assets/minigames/kaitenzushi/assets/sushi/blue_190/salmon.png', './assets/minigames/kaitenzushi/assets/sushi/blue_190/tako.png', './assets/minigames/kaitenzushi/assets/sushi/blue_190/ebi.png',
  './assets/minigames/kaitenzushi/assets/sushi/red_250/shiromi.png', './assets/minigames/kaitenzushi/assets/sushi/red_250/maguro.png', './assets/minigames/kaitenzushi/assets/sushi/red_250/anago.png', './assets/minigames/kaitenzushi/assets/sushi/red_250/melon_sign.png',
  './assets/minigames/kaitenzushi/assets/sushi/purple_350/chutoro.png', './assets/minigames/kaitenzushi/assets/sushi/purple_350/ikura.png', './assets/minigames/kaitenzushi/assets/sushi/purple_350/uni.png',
  './assets/minigames/kaitenzushi/assets/sushi/black_850/otoro.png', './assets/minigames/kaitenzushi/assets/sushi/black_850/kani.png',
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
