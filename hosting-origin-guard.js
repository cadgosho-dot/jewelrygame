(() => {
  'use strict';
  // v0.10.542: Firebase Hosting の公開確認前に GitHub Pages から転送しない。
  // このファイル名は、旧キャッシュの index.html / game.html が読み込んでも転送が発生しないよう互換目的で残している。
  // v0.10.732 formal-release trigger.

  // v0.10.810: index.html は外側の表示シェルだけなので、ゲームDOM向け互換処理を起動しない。
  // 旧キャッシュ互換のためファイル自体は読み込ませるが、常時監視や追加スクリプト読込は game.html に限定する。
  const path = String(location.pathname || '').toLowerCase();
  if (path.endsWith('/') || path.endsWith('/index.html')) return;

  // 2026-08-28: v776-v782で追加した小さい料理画像だけ、ハンバーガー基準の表示枠へ統一する。
  // 本体CSSや既存料理画像は変更せず、正式画像への差し替え時にも同じ表示基準を維持する。
  const installMealImageSizeHotfix = () => {
    if (document.querySelector('link[data-meal-image-size-hotfix]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './meal-image-size-hotfix.css?v=20260829-7';
    link.dataset.mealImageSizeHotfix = '1';
    document.head?.appendChild(link);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installMealImageSizeHotfix, { once: true });
  } else {
    installMealImageSizeHotfix();
  }

  // 2026-08-29: ONE LOVE会話内の「○○○」を現在のプレイヤー名へ置き換える。
  (() => {
    const script = document.createElement('script');
    script.src = './one-love-player-name-hotfix.js?v=20260829-1';
    script.dataset.oneLovePlayerNameHotfix = '1';
    document.head?.appendChild(script);
  })();

  // v0.10.752: 旧画面／旧キャッシュからでも、最新画像と3Dメガネ縦横表示修正を互換的に読み込む。
  (() => {
    const script = document.createElement('script');
    script.src = './memories-event-image-overrides-v751.js?v=0.10.887';
    document.head?.appendChild(script);
  })();

  // v0.10.754: 雇用済みの職人スタッフ画面で、職人Lvに応じた透明PNGを表示する。
  (() => {
    const script = document.createElement('script');
    script.src = './workshop-staff-images-v754.js?v=0.10.887';
    document.head?.appendChild(script);
  })();

  // v0.10.732: iPhone Safari等で宇宙画面だけタップ不能になるケースを復旧する。
  // v0.10.749: 古いAndroid/WebViewでも3Dメガネ人物画像が巨大化しない互換CSSを同時に注入する。
  const STYLE_ID = 'alien-space-input-hotfix';
  const installStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-screen="main"] .alien-space-main-screen{isolation:isolate!important}
      body[data-screen="main"] .alien-space-main-screen>.alien-space-status{pointer-events:none!important}
      body[data-screen="main"] .alien-space-main-screen>.alien-space-menu,
      body[data-screen="main"] .alien-space-main-screen>.alien-hunger-emergency-card{
        z-index:220!important;pointer-events:auto!important;touch-action:manipulation!important;
        -webkit-user-select:none!important;user-select:none!important
      }
      body[data-screen="main"] .alien-space-main-screen>.alien-space-exit-button{
        position:fixed!important;top:calc(env(safe-area-inset-top,0px) + 112px)!important;right:18px!important;
        z-index:240!important;pointer-events:auto!important;touch-action:manipulation!important;
        border:1.25px solid rgba(255,235,188,.72)!important;border-radius:12px!important;
        background:rgba(12,8,18,.84)!important;color:#fff0d3!important;padding:10px 14px!important;
        font:700 15px/1.15 system-ui,-apple-system,sans-serif!important;box-shadow:0 4px 18px rgba(0,0,0,.34)!important;
        -webkit-user-select:none!important;user-select:none!important;-webkit-tap-highlight-color:transparent!important
      }
      body[data-screen="main"] .alien-space-main-screen>.alien-space-menu>button,
      body[data-screen="main"] .alien-space-main-screen>.alien-hunger-emergency-card{
        position:relative!important;z-index:221!important;pointer-events:auto!important;
        touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important
      }
      @media screen and (max-width:820px){
        body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2:not(.jxj-quiz-stage-reward-v2)>.jxj-quiz-character-area-v2{
          position:absolute!important;top:0!important;right:0!important;bottom:0!important;left:0!important;
          display:flex!important;align-items:center!important;justify-content:center!important;
          width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;
          overflow:hidden!important;pointer-events:none!important
        }
        body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-character-v2{
          position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;
          display:block!important;width:90%!important;height:auto!important;max-width:430px!important;max-height:72vh!important;
          margin:auto!important;transform:none!important;object-fit:contain!important;object-position:center center!important
        }
      }`;
    document.head?.appendChild(style);
  };

  const isAlienSpace = () => document.body?.dataset?.screen === 'main' && !!document.querySelector('.alien-space-main-screen');

  const ensureEmergencyExit = () => {
    if (!isAlienSpace()) return;
    const screen = document.querySelector('.alien-space-main-screen');
    if (!screen || screen.querySelector('.alien-space-exit-button')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'alien-space-exit-button';
    button.dataset.action = 'alien-force-exit-proxy';
    button.setAttribute('aria-label', '宇宙イベントを終了して地球へ帰還');
    button.textContent = 'イベント終了';
    screen.prepend(button);
  };

  const repairInvisibleBlockers = () => {
    installStyle();
    if (!isAlienSpace()) return;
    ensureEmergencyExit();
    const curtain = document.querySelector('#sleep-curtain');
    if (curtain?.classList.contains('active')) {
      const css = getComputedStyle(curtain);
      if (css.visibility === 'hidden' || Number.parseFloat(css.opacity || '0') < 0.05) {
        curtain.classList.remove('active', 'next-day-blackout', 'sleep-starting');
        curtain.style.pointerEvents = 'none';
      }
    }
    const morning = document.querySelector('#morning-brief');
    if (morning?.classList.contains('active')) {
      const css = getComputedStyle(morning);
      if (css.visibility === 'hidden' || Number.parseFloat(css.opacity || '0') < 0.05) {
        morning.classList.remove('active', 'persistent');
        morning.innerHTML = '';
        morning.style.pointerEvents = 'none';
      }
    }
    const modal = document.querySelector('#modal-layer');
    if (modal && !modal.classList.contains('hidden') && !modal.querySelector('.modal-card')) {
      modal.classList.add('hidden');
      modal.innerHTML = '';
      modal.style.pointerEvents = 'none';
    }
  };

  document.addEventListener('click', (event) => {
    if (!isAlienSpace()) return;
    const button = event.target instanceof Element ? event.target.closest('.alien-space-exit-button') : null;
    if (!(button instanceof HTMLButtonElement) || button.dataset.forceExitConfirmed === '1') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const accepted = window.confirm('宇宙イベントを終了して地球へ帰還しますか？\n非常脱出では通常帰還時の報酬は追加されません。');
    if (!accepted) return;
    button.dataset.forceExitConfirmed = '1';
    button.dataset.action = 'alien-return-next';
    button.click();
  }, true);

  document.addEventListener('touchend', (event) => {
    if (!isAlienSpace()) return;
    const target = event.target instanceof Element
      ? event.target.closest('.alien-space-menu button[data-action]:not(:disabled), .alien-hunger-emergency-card[data-action]:not(:disabled), .alien-space-exit-button[data-action]:not(:disabled)')
      : null;
    if (!(target instanceof HTMLButtonElement)) return;
    event.preventDefault();
    target.click();
  }, { capture: true, passive: false });

  let repairQueued = false;
  const scheduleRepair = () => {
    if (repairQueued) return;
    repairQueued = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      repairQueued = false;
      repairInvisibleBlockers();
    }));
  };
  const startRepairObserver = () => {
    const target = document.body;
    if (!target) return;
    new MutationObserver(scheduleRepair).observe(target, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-screen', 'style'],
    });
    scheduleRepair();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startRepairObserver, { once: true });
  else startRepairObserver();
  window.addEventListener('pageshow', scheduleRepair);
  window.addEventListener('focus', scheduleRepair);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleRepair(); });
})();
