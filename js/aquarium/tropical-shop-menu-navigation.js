// 熱帯魚屋は入口でカテゴリだけを選び、選択後に各商品一覧へ進む。
// 既存の商品購入・水槽同期ロジックには触れず、表示遷移だけを分離する。

const SHOP_SELECTOR = '.tropical-fish-shop-content';
const TAB_SELECTOR = '[data-action="tropical-shop-tab"]';
const BACK_SELECTOR = '[data-action="back"]';

let viewMode = 'menu';
let wasShopActive = false;

function shopContent() {
  return document.querySelector(SHOP_SELECTOR);
}

function syncTropicalShopMenu() {
  const content = shopContent();
  const isShopActive = Boolean(content);

  if (!isShopActive) {
    if (wasShopActive) viewMode = 'menu';
    wasShopActive = false;
    return;
  }

  if (!wasShopActive) viewMode = 'menu';
  wasShopActive = true;

  const tabs = content.querySelector('.tropical-shop-tabs');
  const hint = content.querySelector('.tropical-shop-swipe-hint');
  const productGrid = content.querySelector('.tropical-product-grid');

  if (tabs) {
    tabs.hidden = viewMode !== 'menu';
    tabs.style.display = viewMode === 'menu' ? '' : 'none';
    if (viewMode === 'menu') {
      tabs.querySelectorAll(TAB_SELECTOR).forEach((button) => {
        button.classList.remove('active');
        button.setAttribute('aria-current', 'false');
        button.setAttribute('aria-selected', 'false');
      });
    }
  }

  if (hint) {
    hint.hidden = true;
    hint.style.display = 'none';
  }

  if (productGrid) {
    productGrid.hidden = viewMode === 'menu';
    productGrid.style.display = viewMode === 'menu' ? 'none' : '';
  }
}

function handleShopClick(event) {
  const content = shopContent();
  if (!content || !(event.target instanceof Element)) return;

  const tab = event.target.closest(TAB_SELECTOR);
  if (tab && content.contains(tab)) {
    viewMode = 'category';
    queueMicrotask(syncTropicalShopMenu);
    return;
  }

  const back = event.target.closest(BACK_SELECTOR);
  if (back && viewMode === 'category') {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    viewMode = 'menu';
    queueMicrotask(syncTropicalShopMenu);
  }
}

function installTropicalShopMenuNavigation() {
  const observer = new MutationObserver(syncTropicalShopMenu);
  observer.observe(document.documentElement, { subtree: true, childList: true });
  document.addEventListener('click', handleShopClick, true);
  syncTropicalShopMenu();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installTropicalShopMenuNavigation, { once: true });
  } else {
    installTropicalShopMenuNavigation();
  }
}
