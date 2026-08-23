(() => {
  'use strict';

  const V751 = {
    glasses: './assets/images/events/loose-shop-original-quiz-v751.png',
    storyteller: './assets/images/events/storyteller-v751.png',
  };
  const LOOSE_SHOP_BACKGROUNDS = {
    portrait: './assets/images/loose-shop-portrait-v385.webp',
    landscape: './assets/images/loose-shop-v385.webp',
  };
  const LOOSE_QUIZ_STYLE_ID = 'loose-quiz-display-fix-v752';

  const setImage = (img, src) => {
    if (!(img instanceof HTMLImageElement) || !src) return;
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    if (img.dataset.memoryImage) img.dataset.memoryImage = src;
  };

  const resolvedOrientation = () => {
    const type = String(window.screen?.orientation?.type || '').toLowerCase();
    if (type.startsWith('portrait')) return 'portrait';
    if (type.startsWith('landscape')) return 'landscape';
    if (window.matchMedia?.('(orientation: portrait)').matches) return 'portrait';
    if (window.matchMedia?.('(orientation: landscape)').matches) return 'landscape';
    const viewport = window.visualViewport;
    const width = Math.max(1, Number(viewport?.width) || window.innerWidth || document.documentElement.clientWidth || 1);
    const height = Math.max(1, Number(viewport?.height) || window.innerHeight || document.documentElement.clientHeight || 1);
    return height >= width ? 'portrait' : 'landscape';
  };

  const installLooseQuizStyle = () => {
    if (document.getElementById(LOOSE_QUIZ_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = LOOSE_QUIZ_STYLE_ID;
    style.textContent = `
      body[data-screen="looseShopOriginalQuizEvent"] .screen-shell.event-shell-no-header>.screen-content,
      body[data-screen="looseShopOriginalQuizEvent"] .main-screen,
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2:not(.jxj-quiz-stage-reward-v2){
        width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important
      }
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2:not(.jxj-quiz-stage-reward-v2){
        position:relative!important;display:block!important;padding:0!important
      }
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2:not(.jxj-quiz-stage-reward-v2)>.jxj-quiz-character-area-v2{
        position:absolute!important;top:0!important;right:0!important;bottom:0!important;left:0!important;
        display:flex!important;align-items:center!important;justify-content:center!important;
        width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;
        padding:8px 8px 112px!important;box-sizing:border-box!important;overflow:hidden!important;pointer-events:none!important
      }
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-character-v2{
        position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;
        display:block!important;width:90%!important;height:auto!important;max-width:430px!important;max-height:72vh!important;
        margin:auto!important;transform:none!important;object-fit:contain!important;object-position:center bottom!important
      }
      html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-character-v2{
        width:84%!important;max-width:390px!important;max-height:60vh!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2:not(.jxj-quiz-stage-reward-v2)>.jxj-quiz-character-area-v2{
        padding:8px 16px 96px!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-character-v2{
        width:38%!important;max-width:360px!important;max-height:68vh!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2>.jxj-quiz-dialogue-panel-v2,
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2>.jxj-quiz-question-panel-v2{
        position:absolute!important;z-index:2!important;left:50%!important;right:auto!important;top:auto!important;
        bottom:14px!important;width:calc(100% - 28px)!important;max-width:900px!important;margin:0!important;
        transform:translateX(-50%)!important;box-sizing:border-box!important;overflow-y:auto!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2>.jxj-quiz-dialogue-panel-v2{
        max-height:34vh!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2>.jxj-quiz-question-panel-v2{
        max-height:48vh!important
      }`;
    document.head?.appendChild(style);
  };

  const repairLooseQuizDisplay = () => {
    installLooseQuizStyle();
    const active = document.body?.dataset?.screen === 'looseShopOriginalQuizEvent';
    const layer = document.getElementById('background-layer');
    if (!active) {
      document.documentElement.removeAttribute('data-loose-quiz-orientation');
      if (layer?.dataset?.looseQuizV752 === '1') {
        layer.style.removeProperty('background-image');
        layer.style.removeProperty('background-size');
        layer.style.removeProperty('background-position');
        delete layer.dataset.looseQuizV752;
      }
      return;
    }

    const orientation = resolvedOrientation();
    document.documentElement.dataset.looseQuizOrientation = orientation;
    const background = LOOSE_SHOP_BACKGROUNDS[orientation];
    if (layer && background) {
      layer.style.setProperty('background-image', `url("${background}")`, 'important');
      layer.style.setProperty('background-size', 'cover', 'important');
      layer.style.setProperty('background-position', 'center center', 'important');
      layer.dataset.looseQuizV752 = '1';
    }
    document.querySelectorAll('img.jxj-quiz-character-v2').forEach((img) => setImage(img, V751.glasses));
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

    repairLooseQuizDisplay();
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
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(schedule, 120), { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  window.screen?.orientation?.addEventListener?.('change', () => window.setTimeout(schedule, 120));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  window.setInterval(() => {
    if (document.body?.dataset?.screen === 'looseShopOriginalQuizEvent') schedule();
  }, 900);
  apply();
})();
