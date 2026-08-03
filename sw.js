const VERSION = '0.10.532';
const APP_CACHE = `jewelrygame-app-v${VERSION}`;
const RUNTIME_CACHE = `jewelrygame-runtime-v${VERSION}`;
const APP_SHELL = [
  './', './index.html', './game.html', './auth.html', './hosting-origin-guard.js', './viewport-shell.css', './viewport-shell.js', './styles.css',
  './manifest.webmanifest', './js/app.js', './js/audio.js', './js/audio-scene-map.js', './js/game-data.js', './js/kaitenzushi-embedded.js?v=0.10.532', './js/daily-gems.js?v=0.10.532', './js/japan-holidays.js', './js/firebase-config.js', './js/google-auth-bridge.js',
  './js/security-config.js', './js/firebase-service.js', './data/metals.json', './data/jewelry_okachimachi_quiz_200_game_format.json',
  './data/daily-gems-365.json', './data/cinema-event-videos.json', './assets/minigames/kaitenzushi/game/index.html', './assets/images/main.webp', './assets/images/main-portrait.webp', './assets/images/main-menu.webp', './assets/images/main-menu-portrait.webp', './assets/images/today-gem.webp',
  './assets/images/tools/placeholder.svg', './assets/images/tools/jewelry-bench.png', './assets/images/tools/loupe.png', './assets/images/tools/gem-polishing-machine.png', './assets/images/tools/diamond-polishing-lap.png', './assets/images/tools/piercing-saw.png', './assets/images/tools/nipper.png', './assets/images/tools/electronic-scale.png', './assets/images/tools/wood-block.png', './assets/images/tools/dividers.png', './assets/images/tools/milgrain-tool.png', './assets/images/tools/rolling-mill.png', './assets/images/tools/file.png', './assets/images/tools/pliers.png', './assets/images/tools/torch.png', './assets/images/tools/hammer.png', './assets/images/tools/magnifier.png', './assets/images/tools/bench-peg.png', './assets/images/tools/graver.png', './assets/images/tools/engraving-block.png', './assets/images/tools/stamps.png', './assets/images/tools/rotary-tool.png', './assets/images/tools/buffer.png', './assets/images/tools/ultrasonic-cleaner.png', './assets/images/events/indian-restaurant-manager.png', './assets/images/robbery-newspaper.webp', './assets/images/equipment/basic-pickaxe.png', './assets/images/customers/customer-placeholder.svg',
  './assets/images/quiz/quiz-king-normal.png', './assets/images/quiz/quiz-king-player-incorrect.png', './assets/images/quiz/quiz-king-player-correct.png',
  './assets/images/events/gray-hood-aquarium.png', './assets/images/events/aquarium-tank.png', './assets/minigames/aquarium/index.html',
  './assets/images/events/western-union-messenger.png', './assets/images/events/antique-diamond.png', './assets/images/events/pazupan-miner.png', './assets/images/events/pazupan.png', './assets/images/events/mermaid.png', './assets/images/events/pearl.png',
  './assets/images/events/okachimachi-toll-frog.png', './assets/images/events/sushi-chef.png', './assets/images/events/cyclops.png', './assets/images/events/ganesha.png', './assets/images/events/ganesha-tusk.png', './assets/images/events/ivory-loose.png', './assets/images/events/kappa.png', './assets/images/events/tattoo-woman.png', './assets/images/events/amber.png', './assets/images/events/tourist.png', './assets/images/events/alien.png', './assets/images/events/haunting-ghost.png', './assets/images/events/store-thief-old-woman.png', './assets/images/events/mystery-chinese-chef.png', './assets/images/events/mystery-chinese-food-01.png', './assets/images/events/mystery-chinese-food-02.png', './assets/images/events/clock-tower-donation-old-woman.png', './assets/audio/sfx-haunting-appear.wav', './assets/audio/sfx-haunting-whisper.wav', './assets/images/gems/ivory.png', './assets/images/gems/jade.png', './assets/images/loose/ivory/round-cabochon.png', './assets/images/loose/ivory/oval-cabochon.png', './assets/images/loose/jade/round-cabochon.png', './assets/images/loose/jade/oval-cabochon.png', './assets/images/loose/amber/amber.png', './assets/images/items/energy-drink.png', './assets/images/items/bokuto.png', './assets/images/items/body-chip.png', './assets/images/space.webp', './assets/images/meal-kaitenzushi-event.webp', './assets/images/panda-hiroba.webp', './assets/images/panda-hiroba-portrait.webp', './assets/images/cinema-event.webp', './assets/images/cinema-event-portrait.webp',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/apple-touch-icon.png', './assets/icons/favicon.png',
];

const CORE_SHELL = [
  './', './index.html', './game.html', './hosting-origin-guard.js', './viewport-shell.css', './viewport-shell.js', './styles.css',
  './manifest.webmanifest', './js/app.js', './js/audio.js', './js/audio-scene-map.js', './js/game-data.js',
  './js/kaitenzushi-embedded.js?v=0.10.532', './js/daily-gems.js?v=0.10.532', './js/japan-holidays.js', './js/firebase-config.js',
  './js/google-auth-bridge.js', './js/security-config.js', './js/firebase-service.js',
];

const AUDIO_MEDIA = [
  './assets/audio/amb-craft.ogg',
  './assets/audio/amb-displayShop.ogg',
  './assets/audio/amb-glab.ogg',
  './assets/audio/amb-jewelryShop.ogg',
  './assets/audio/amb-looseShop.ogg',
  './assets/audio/amb-main-clear.ogg',
  './assets/audio/amb-main-cloudy.ogg',
  './assets/audio/amb-main-rain.ogg',
  './assets/audio/amb-main-snow.ogg',
  './assets/audio/space-main-bgm.mp3',
  './assets/audio/space-ambient.mp3',
  './assets/audio/amb-materialShop.ogg',
  './assets/audio/amb-meal-chinese.ogg',
  './assets/audio/amb-meal-convenience.ogg',
  './assets/audio/amb-meal-hamburger.ogg',
  './assets/audio/amb-meal-indian.ogg',
  './assets/audio/amb-meal-kebab.ogg',
  './assets/audio/amb-meal-korean.ogg',
  './assets/audio/amb-meal-ramen.ogg',
  './assets/audio/amb-meal-soba.ogg',
  './assets/audio/amb-meal.ogg',
  './assets/audio/amb-mining.ogg',
  './assets/audio/amb-okachimachi.ogg',
  './assets/audio/amb-polishing.ogg',
  './assets/audio/amb-realEstate.ogg',
  './assets/audio/amb-sleep.ogg',
  './assets/audio/amb-store.ogg',
  './assets/audio/amb-street-crowd.ogg',
  './assets/audio/amb-workshop.ogg',
  './assets/audio/bgm-glab.ogg',
  './assets/audio/bgm-main.ogg',
  './assets/audio/bgm-meal-chinese.ogg',
  './assets/audio/bgm-meal-convenience.ogg',
  './assets/audio/bgm-meal-hamburger.ogg',
  './assets/audio/bgm-meal-indian.ogg',
  './assets/audio/bgm-meal-kebab.ogg',
  './assets/audio/bgm-meal-korean.ogg',
  './assets/audio/bgm-meal-ramen.ogg',
  './assets/audio/bgm-meal-soba.ogg',
  './assets/audio/bgm-meal.ogg',
  './assets/audio/bgm-mining.ogg',
  './assets/audio/bgm-okachimachi.ogg',
  './assets/audio/bgm-sleep.ogg',
  './assets/audio/bgm-store.ogg',
  './assets/audio/bgm-workshop.ogg',
  './assets/audio/quiz_correct_sfx.mp3',
  './assets/audio/quiz_incorrect_sfx.mp3',
  './assets/audio/quiz_show_thinking_bgm_60s_loop.mp3',
  './assets/audio/sfx-alarm.ogg',
  './assets/audio/sfx-barcode-beeps.ogg',
  './assets/audio/sfx-bomb-jii-appear.ogg',
  './assets/audio/sfx-mermaid-splash.ogg',
  './assets/audio/sfx-ganesha-appear.ogg',
  './assets/audio/sfx-ganesha-gift.ogg',
  './assets/audio/sfx-kappa-appear.wav',
  './assets/audio/sfx-jade-gift.wav',
  './assets/audio/sfx-old-lady-appear.wav',
  './assets/audio/sfx-shoplift-steal.wav',
  './assets/audio/sfx-quiz-intro.ogg',
  './assets/audio/sfx-quiz-question.ogg',
  './assets/audio/sfx-western-union-arrival.ogg',
  './assets/audio/sfx-western-union-handover.ogg',
  './assets/audio/sfx-coin.ogg',
  './assets/audio/sfx-dig.ogg',
  './assets/audio/sfx-earth-dig.ogg',
  './assets/audio/sfx-eat.ogg',
  './assets/audio/sfx-error.ogg',
  './assets/audio/sfx-explosion.ogg',
  './assets/audio/sfx-impact.ogg',
  './assets/audio/sfx-jewelry-complete.ogg',
  './assets/audio/sfx-levelup.ogg',
  './assets/audio/sfx-loose-sparkle.ogg',
  './assets/audio/sfx-mining-miss.ogg',
  './assets/audio/sfx-mining-win.ogg',
  './assets/audio/sfx-police-siren.ogg',
  './assets/audio/sfx-sale.ogg',
  './assets/audio/sfx-select.ogg',
  './assets/audio/sfx-sleep.ogg',
  './assets/audio/sfx-success.ogg',
  './assets/minigames/kaitenzushi/assets/audio/eat_sfx.ogg',
  './assets/minigames/kaitenzushi/assets/audio/enka_bgm.ogg',
  './assets/minigames/kaitenzushi/assets/audio/izakaya_ambient.ogg',
];

const OPTIONAL_MEDIA = [
  './assets/images/mining.webp', './assets/images/mining-portrait.webp', './assets/images/workshop.webp', './assets/images/workshop-portrait.webp', './assets/images/craft.webp', './assets/images/craft-portrait.webp', './assets/images/glab.webp', './assets/images/glab-portrait.webp',
  './assets/images/okachimachi.webp', './assets/images/okachimachi-portrait.webp', './assets/images/loose-shop-v385.webp', './assets/images/loose-shop-portrait-v385.webp', './assets/images/jewelry-shop.webp', './assets/images/jewelry-shop-portrait.webp', './assets/images/jewelry-shop-buy-character.png', './assets/images/jewelry-shop-sell-character.png', './assets/images/display-shop-v380.webp', './assets/images/display-shop-portrait-v380.webp', './assets/images/real-estate.webp', './assets/images/real-estate-portrait.webp', './assets/images/store.webp', './assets/images/store-portrait.webp',
  './assets/images/phone.webp', './assets/images/sleep.webp', './assets/images/sleep-portrait.webp', './assets/images/today-gem.webp', './assets/images/today-gem-portrait.webp', './assets/images/meal-menu.webp', './assets/images/meal-menu-portrait.webp', './assets/images/metalshop.webp', './assets/images/metalshop-portrait.webp', './assets/images/space-portrait.webp',
  './assets/images/meal-convenience.webp', './assets/images/meal-convenience-portrait.webp',
  './assets/images/meal-chinese.webp', './assets/images/meal-chinese-portrait.webp',
  './assets/images/meal-korean.webp', './assets/images/meal-korean-portrait.webp',
  './assets/images/meal-indian.webp', './assets/images/meal-indian-portrait.webp',
  './assets/images/meal-kebab.webp', './assets/images/meal-kebab-portrait.webp',
  './assets/images/meal-ramen-v386.webp', './assets/images/meal-ramen-portrait-v386.webp', './assets/images/meal-ramen-reunion-v387.webp', './assets/images/meal-ramen-reunion-portrait-v387.webp',
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
  './assets/minigames/kaitenzushi/assets/background/kaitenzushi_counter_background.png',
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(async (cache) => {
        // 起動に必要なファイルだけは厳密に確認する。
        await cache.addAll(CORE_SHELL);
        // 画像・音声などの補助ファイル不足で更新全体を失敗させない。
        const coreSet = new Set(CORE_SHELL);
        const supplemental = [...APP_SHELL, ...AUDIO_MEDIA].filter((asset) => !coreSet.has(asset));
        await Promise.allSettled(supplemental.map((asset) => cache.add(asset)));
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
  if (destination === 'video' || url.pathname.includes('/assets/videos/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (url.pathname.endsWith('/js/daily-gems.js')) {
    const freshRequest = new Request(event.request, { cache: 'no-store' });
    event.respondWith(networkFirst(freshRequest));
    return;
  }
  if (url.pathname.endsWith('/assets/minigames/kaitenzushi/game/index.html')) {
    event.respondWith(kaitenzushiDocumentNetworkFirst(event.request));
    return;
  }
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
