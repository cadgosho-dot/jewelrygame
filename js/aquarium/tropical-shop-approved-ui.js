// Approved tropical-fish-shop UI lock (mobile portrait/landscape).
// Keeps the approved category-menu flow independent from purchase/accounting logic.

const SCREEN = 'tropicalFishShop';
const BODY_CLASS = 'jxj-tropical-shop-approved';
const HIDDEN_CLASS = 'jxj-tropical-approved-hidden';

let viewMode = 'menu';
let wasActive = false;
let syncFrame = 0;

function isActive() {
  return String(document.body?.dataset?.screen || '') === SCREEN;
}

function orientation() {
  const declared = String(document.documentElement?.dataset?.orientation || '');
  if (declared === 'portrait' || declared === 'landscape') return declared;
  return globalThis.matchMedia?.('(orientation: portrait)')?.matches ? 'portrait' : 'landscape';
}

function queueSync() {
  if (syncFrame) return;
  syncFrame = requestAnimationFrame(() => {
    syncFrame = 0;
    syncApprovedTropicalShopUi();
  });
}

function clearInlineLayout() {
  document.documentElement.style.removeProperty('--jwj-tropical-content-top');
  const header = document.querySelector(`body[data-screen="${SCREEN}"] .game-header`);
  const content = document.querySelector(`body[data-screen="${SCREEN}"] .tropical-fish-shop-content`);
  header?.style.removeProperty('height');
  content?.style.removeProperty('top');
}

function ensureCategoryScreen(content) {
  if (!(content instanceof HTMLElement)) return { wrapper: null, grid: null };
  let wrapper = content.querySelector('.tropical-category-screen');
  let grid = content.querySelector('.tropical-product-grid');
  if (!(grid instanceof HTMLElement)) return { wrapper, grid: null };

  if (!(wrapper instanceof HTMLElement)) {
    wrapper = document.createElement('div');
    wrapper.className = 'tropical-category-screen';
    wrapper.dataset.categoryScreen = grid.dataset.tropicalCategory || '';
    grid.before(wrapper);
    wrapper.append(grid);
  } else if (grid.parentElement !== wrapper) {
    wrapper.append(grid);
  }
  return { wrapper, grid };
}

function hideAxolotlDescription(content) {
  content?.querySelectorAll('.tropical-product-card').forEach((card) => {
    const image = card.querySelector('img');
    if (!(image instanceof HTMLImageElement) || !String(image.getAttribute('src') || '').includes('fish-axolotl.png')) return;
    const smalls = card.querySelectorAll('div small');
    if (smalls.length > 1) smalls[1].classList.add(HIDDEN_CLASS);
  });

  const modal = document.querySelector(`body[data-screen="${SCREEN}"] .tropical-modal`);
  if (!(modal instanceof HTMLElement)) return;
  const title = String(modal.querySelector('h2')?.textContent || '').trim();
  if (title !== 'ウーパールーパー') return;
  modal.querySelectorAll('p').forEach((node) => node.classList.add(HIDDEN_CLASS));
}

function resetCategoryScroll(wrapper, content) {
  if (wrapper instanceof HTMLElement) {
    wrapper.scrollTop = 0;
    wrapper.scrollLeft = 0;
  }
  if (content instanceof HTMLElement) {
    content.scrollTop = 0;
    content.scrollLeft = 0;
  }
}

function syncHeaderReservation(content) {
  const header = document.querySelector(`body[data-screen="${SCREEN}"] .game-header`);
  if (!(header instanceof HTMLElement)) return;

  if (orientation() === 'portrait') {
    header.style.removeProperty('height');
    content?.style.removeProperty('top');
    const headerBottom = Math.ceil(header.getBoundingClientRect().bottom + 6);
    document.documentElement.style.setProperty('--jwj-tropical-content-top', `${Math.max(1, headerBottom)}px`);
    return;
  }

  const barOne = header.querySelector('.top-bar-one');
  const barTwo = header.querySelector('.top-bar-two');
  const measured = Math.ceil(
    (barOne?.getBoundingClientRect().height || 0)
    + (barTwo?.getBoundingClientRect().height || 0)
    + 20
  );
  const contentTop = Math.max(1, measured);
  header.style.setProperty('height', `${Math.max(0, contentTop - 6)}px`, 'important');
  content?.style.setProperty('top', `${contentTop}px`, 'important');
  document.documentElement.style.setProperty('--jwj-tropical-content-top', `${contentTop}px`);
}

function syncApprovedTropicalShopUi() {
  const active = isActive();
  if (!active) {
    if (wasActive) {
      viewMode = 'menu';
      document.body?.classList.remove(BODY_CLASS);
      clearInlineLayout();
    }
    wasActive = false;
    return;
  }

  if (!wasActive) viewMode = 'menu';
  wasActive = true;
  document.body.classList.add(BODY_CLASS);

  const content = document.querySelector('.tropical-fish-shop-content');
  if (!(content instanceof HTMLElement)) return;

  const controls = content.querySelector('.tropical-shop-controls');
  const tabs = content.querySelector('.tropical-shop-tabs');
  const { wrapper, grid } = ensureCategoryScreen(content);

  tabs?.querySelectorAll('[data-action="tropical-shop-tab"]').forEach((button) => {
    button.classList.add('tropical-transparent-tab');
    if (viewMode === 'menu') {
      button.classList.remove('active');
      button.setAttribute('aria-current', 'false');
      button.setAttribute('aria-selected', 'false');
    }
  });

  if (controls instanceof HTMLElement) controls.hidden = viewMode !== 'menu';
  if (wrapper instanceof HTMLElement) wrapper.hidden = viewMode === 'menu';
  if (grid instanceof HTMLElement) grid.hidden = viewMode === 'menu';

  hideAxolotlDescription(content);
  syncHeaderReservation(content);

  if (viewMode === 'category') resetCategoryScroll(wrapper, content);
}

function returnToCategoryMenu(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  viewMode = 'menu';
  syncApprovedTropicalShopUi();
}

function handleClick(event) {
  if (!isActive() || !(event.target instanceof Element)) return;

  const modal = document.querySelector(`body[data-screen="${SCREEN}"] .tropical-modal`);
  const back = event.target.closest('[data-action="back"]');
  if (back) {
    if (modal) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const close = modal.querySelector('[data-action="tropical-shop-close-qty"]');
      if (close instanceof HTMLElement) close.click();
      return;
    }
    if (viewMode === 'category') {
      returnToCategoryMenu(event);
      return;
    }
  }

  const tab = event.target.closest('[data-action="tropical-shop-tab"]');
  if (tab) {
    viewMode = 'category';
    queueMicrotask(queueSync);
    return;
  }
}

function installApprovedTropicalShopUi() {
  document.addEventListener('click', handleClick, true);
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
    document.addEventListener('DOMContentLoaded', installApprovedTropicalShopUi, { once: true });
  } else {
    installApprovedTropicalShopUi();
  }
}
