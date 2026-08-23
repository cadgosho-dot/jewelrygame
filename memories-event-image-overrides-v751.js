(() => {
  'use strict';

  const V751 = {
    glasses: './assets/images/events/loose-shop-original-quiz-v751.png',
    storyteller: './assets/images/events/storyteller-v751.png',
  };

  const setImage = (img, src) => {
    if (!(img instanceof HTMLImageElement) || !src) return;
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    if (img.dataset.memoryImage) img.dataset.memoryImage = src;
  };

  const apply = () => {
    document.querySelectorAll('img').forEach((img) => {
      const src = String(img.getAttribute('src') || '');
      const alt = String(img.getAttribute('alt') || '').trim();

      if (
        alt === '3Dメガネ' ||
        /loose-shop-original-quiz(?:-v\d+)?\.png(?:\?|$)/i.test(src)
      ) {
        setImage(img, V751.glasses);
        return;
      }

      if (
        alt === 'ストーリーテラー' ||
        /storyteller(?:-v\d+)?\.png(?:\?|$)/i.test(src)
      ) {
        setImage(img, V751.storyteller);
      }
    });

    const memories = document.getElementById('jxj-memories-overlay');
    if (memories) {
      memories.querySelectorAll('img.memory-person').forEach((img) => {
        const alt = String(img.getAttribute('alt') || '').trim();
        if (alt === '3Dメガネ') setImage(img, V751.glasses);
        if (alt === 'ストーリーテラー') setImage(img, V751.storyteller);
      });
    }

    if (document.body?.dataset?.screen === 'looseShopOriginalQuizEvent') {
      document.querySelectorAll('img.jxj-quiz-character-v2').forEach((img) => setImage(img, V751.glasses));
    }
  };

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data-screen'],
  });
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  apply();
})();
