// Approved "おやつ大好き" presentation lock.
// Only decorates the already-registered event/meal DOM; event state, dialogue,
// rewards, purchases and save data remain owned by app.js.

const SHOP_CONFIRM_CLASS = 'jxj-oyatsu-shop-confirm-approved-bg';
const ICE_BODY_CLASS = 'jxj-oyatsu-ice-approved';
let syncFrame = 0;

function queueSync() {
  if (syncFrame) return;
  syncFrame = requestAnimationFrame(() => {
    syncFrame = 0;
    syncOyatsuApprovedUi();
  });
}

function syncOyatsuApprovedUi() {
  const body = document.body;
  const root = document.getElementById('root');
  if (!(body instanceof HTMLBodyElement) || !(root instanceof HTMLElement)) return;

  body.classList.remove(SHOP_CONFIRM_CLASS, ICE_BODY_CLASS);
  const screen = String(body.dataset.screen || '');

  if (screen === 'oyatsuDaisukiEvent') {
    const shopConfirm = root.querySelector('[data-action="oyatsu-shop-confirm-choice"]');
    if (shopConfirm) body.classList.add(SHOP_CONFIRM_CLASS);
    return;
  }

  if (screen !== 'meal') return;
  const panel = root.querySelector('.meal-eating-panel-ice');
  if (!(panel instanceof HTMLElement)) return;

  body.classList.add(ICE_BODY_CLASS);
  panel.classList.add('oyatsu-ice-approved-panel');
  const figure = panel.querySelector('.meal-food-display-ice');
  figure?.classList.add('oyatsu-ice-approved-figure');
  const image = figure?.querySelector('img');
  image?.classList.add('oyatsu-ice-approved-image');
  const text = Array.from(panel.children).find((node) => node instanceof HTMLElement && node.tagName === 'STRONG');
  text?.classList.add('oyatsu-ice-approved-text');
}

function installOyatsuApprovedUi() {
  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-screen', 'data-orientation'],
  });
  globalThis.addEventListener('resize', queueSync, { passive: true });
  globalThis.addEventListener('orientationchange', () => setTimeout(queueSync, 60), { passive: true });
  queueSync();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installOyatsuApprovedUi, { once: true });
  } else {
    installOyatsuApprovedUi();
  }
}
