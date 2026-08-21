(() => {
  'use strict';
  // v0.10.542: Firebase Hosting の公開確認前に GitHub Pages から転送しない。
  // このファイル名は、旧キャッシュの index.html / game.html が読み込んでも
  // 転送が発生しないよう互換目的で残している。

  // v0.10.731 hotfix: iPhone Safari等で宇宙画面だけタップ不能になるケースを復旧する。
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
        z-index:110!important;pointer-events:auto!important;touch-action:manipulation!important;
        -webkit-user-select:none!important;user-select:none!important
      }
      body[data-screen="main"] .alien-space-main-screen>.alien-space-menu>button,
      body[data-screen="main"] .alien-space-main-screen>.alien-hunger-emergency-card{
        position:relative!important;z-index:111!important;pointer-events:auto!important;
        touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important
      }`;
    document.head?.appendChild(style);
  };

  const isAlienSpace = () => document.body?.dataset?.screen === 'main' && !!document.querySelector('.alien-space-main-screen');

  const repairInvisibleBlockers = () => {
    installStyle();
    if (!isAlienSpace()) return;

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

  // Safariでclick合成が落ちた場合の予備入力経路。
  document.addEventListener('touchend', (event) => {
    if (!isAlienSpace()) return;
    const target = event.target instanceof Element
      ? event.target.closest('.alien-space-menu button[data-action]:not(:disabled), .alien-hunger-emergency-card[data-action]:not(:disabled)')
      : null;
    if (!(target instanceof HTMLButtonElement)) return;
    event.preventDefault();
    target.click();
  }, { capture: true, passive: false });

  const scheduleRepair = () => requestAnimationFrame(() => requestAnimationFrame(repairInvisibleBlockers));
  new MutationObserver(scheduleRepair).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-screen'],
  });
  window.addEventListener('pageshow', scheduleRepair);
  window.addEventListener('focus', scheduleRepair);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleRepair(); });
  window.setInterval(repairInvisibleBlockers, 1200);
  scheduleRepair();
})();