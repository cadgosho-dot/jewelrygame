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
  const LOOSE_QUIZ_STYLE_ID = 'loose-quiz-display-fix-v937';

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
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2{
        width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important
      }
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2{
        position:relative!important;color:#fff!important;
        text-shadow:0 2px 6px rgba(0,0,0,.96),0 0 10px rgba(0,0,0,.72)!important
      }
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-name-v2{
        color:var(--gold-light,#e7bd67)!important
      }
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-dialogue-panel-v2,
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-dialogue-panel-v2 strong,
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-tap-v2,
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-question-panel-v2,
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-question-panel-v2 h2,
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-answer-v2,
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-answer-v2 strong,
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-answer-v2>span{
        color:#fff!important
      }
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2>.jxj-quiz-dialogue-panel-v2{
        background:transparent!important;background-image:none!important;
        box-shadow:0 6px 20px rgba(0,0,0,.22)!important
      }
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2>.jxj-quiz-question-panel-v2{
        background:rgba(0,0,0,.22)!important;
        box-shadow:inset 0 0 28px rgba(0,0,0,.26)!important
      }
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-answer-v2{
        background:rgba(18,14,11,.18)!important
      }

      html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2{
        display:block!important;padding:0!important
      }
      html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2>.jxj-quiz-character-area-v2{
        position:absolute!important;z-index:1!important;
        left:50%!important;right:auto!important;top:max(42px,env(safe-area-inset-top,0px))!important;bottom:132px!important;
        width:min(92vw,460px)!important;height:auto!important;transform:translateX(-50%)!important;
        display:flex!important;align-items:flex-end!important;justify-content:center!important;
        padding:0!important;overflow:hidden!important;pointer-events:none!important
      }
      html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2 .jxj-quiz-character-v2{
        position:relative!important;inset:auto!important;display:block!important;
        width:auto!important;height:auto!important;max-width:min(92vw,430px)!important;max-height:56dvh!important;
        margin:0 auto!important;transform:none!important;object-fit:contain!important;object-position:center bottom!important
      }
      html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2>.jxj-quiz-dialogue-panel-v2{
        position:absolute!important;z-index:20!important;left:7px!important;right:7px!important;
        top:auto!important;bottom:max(14px,calc(env(safe-area-inset-bottom,0px) + 9px))!important;
        width:auto!important;height:auto!important;max-height:34dvh!important;margin:0!important;
        padding:12px 14px!important;overflow-y:auto!important;transform:none!important;
        border-radius:18px!important;background:transparent!important;box-shadow:0 6px 20px rgba(0,0,0,.22)!important
      }

      html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2{
        display:grid!important;grid-template-columns:minmax(0,1fr)!important;
        grid-template-rows:minmax(0,1fr) auto!important;gap:4px!important;
        padding:max(4px,env(safe-area-inset-top,0px)) 6px max(14px,calc(env(safe-area-inset-bottom,0px) + 10px))!important
      }
      html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2>.jxj-quiz-character-area-v2{
        position:relative!important;z-index:1!important;inset:auto!important;
        grid-column:1!important;grid-row:1!important;
        display:flex!important;align-items:flex-start!important;justify-content:center!important;
        width:100%!important;height:auto!important;min-height:0!important;
        padding:clamp(38px,5vh,64px) 0 0!important;overflow:hidden!important;transform:none!important;pointer-events:none!important
      }
      html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2 .jxj-quiz-character-v2{
        position:relative!important;inset:auto!important;display:block!important;
        width:auto!important;height:auto!important;max-width:96vw!important;max-height:100%!important;
        margin:0 auto!important;transform:translateY(clamp(60px,7dvh,100px))!important;object-fit:contain!important;object-position:center bottom!important
      }
      html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2>.jxj-quiz-question-panel-v2{
        position:relative!important;z-index:20!important;inset:auto!important;transform:none!important;
        grid-column:1!important;grid-row:2!important;align-self:end!important;
        width:auto!important;height:auto!important;min-height:0!important;max-height:46dvh!important;
        margin:0!important;padding:8px!important;gap:5px!important;overflow-y:auto!important;
        border-radius:18px!important;background:rgba(0,0,0,.22)!important;
        box-shadow:inset 0 0 28px rgba(0,0,0,.26)!important
      }
      html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2 .jxj-quiz-question-panel-v2 h2{
        margin:0!important
      }
      html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2 .jxj-quiz-answer-grid-v2{
        display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:7px!important;width:100%!important;margin:8px 0 0!important;align-content:start!important
      }

      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2{
        display:grid!important;grid-template-columns:minmax(0,43%) minmax(0,57%)!important;
        grid-template-rows:minmax(0,1fr)!important;gap:8px!important;
        padding:max(4px,env(safe-area-inset-top,0px)) 10px max(6px,env(safe-area-inset-bottom,0px))!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2>.jxj-quiz-character-area-v2{
        position:relative!important;inset:auto!important;grid-column:1!important;grid-row:1!important;
        display:flex!important;align-items:flex-end!important;justify-content:center!important;
        width:100%!important;height:100%!important;padding:0!important;overflow:hidden!important;transform:none!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2 .jxj-quiz-character-v2{
        position:relative!important;inset:auto!important;width:auto!important;height:auto!important;
        max-width:min(100%,430px)!important;max-height:calc(100dvh - 28px)!important;
        margin:auto!important;transform:none!important;object-fit:contain!important;object-position:center bottom!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2>.jxj-quiz-question-panel-v2{
        position:relative!important;inset:auto!important;transform:none!important;
        grid-column:2!important;grid-row:1!important;align-self:center!important;
        width:100%!important;height:auto!important;max-height:calc(100dvh - 22px)!important;
        margin:0!important;padding:10px 12px 12px!important;overflow-y:auto!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2>.jxj-quiz-character-area-v2{
        position:absolute!important;inset:0 0 clamp(92px,25vh,150px) 0!important;
        display:flex!important;align-items:flex-start!important;justify-content:center!important;
        padding:0!important;overflow:hidden!important;transform:none!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2 .jxj-quiz-character-v2{
        width:auto!important;height:auto!important;max-width:min(58vw,760px)!important;max-height:100%!important;
        margin:auto!important;transform:none!important;object-fit:contain!important;object-position:center top!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2>.jxj-quiz-dialogue-panel-v2{
        position:absolute!important;z-index:20!important;left:50%!important;right:auto!important;top:auto!important;
        bottom:max(6px,env(safe-area-inset-bottom,0px))!important;width:min(92vw,980px)!important;max-height:min(28vh,150px)!important;
        margin:0!important;padding:8px 12px 7px!important;transform:translateX(-50%)!important;overflow-y:auto!important
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