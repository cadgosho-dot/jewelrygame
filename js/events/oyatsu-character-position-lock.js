// おやつ大好きイベント専用。
// セリフ切替の再描画でキャラクターDOMが作り直されても、同じ端末向きの間は
// 最初に確定した実表示位置・サイズを維持する。ほかのイベントには作用しない。

const OYATSU_SCREEN = 'oyatsuDaisukiEvent';
const CHARACTER_SELECTOR = `body[data-screen="${OYATSU_SCREEN}"] .oyatsu-event-screen .jxj-new-event-character`;
const INSTALL_KEY = '__JXJ_OYATSU_CHARACTER_POSITION_LOCK__';
const WIDTH_RESET_THRESHOLD_PX = 80;

let lockedRect = null;
let lockedOrientation = '';
let lockedViewportWidth = 0;
let wasActive = false;
let captureQueued = false;

function currentOrientation() {
  const declared = String(document.documentElement?.dataset?.orientation || '');
  if (declared === 'portrait' || declared === 'landscape') return declared;
  return globalThis.matchMedia?.('(orientation: portrait)')?.matches ? 'portrait' : 'landscape';
}

function currentViewportWidth() {
  const visualWidth = Number(globalThis.visualViewport?.width);
  if (Number.isFinite(visualWidth) && visualWidth > 0) return Math.round(visualWidth);
  const innerWidth = Number(globalThis.innerWidth);
  if (Number.isFinite(innerWidth) && innerWidth > 0) return Math.round(innerWidth);
  return Math.round(Number(document.documentElement?.clientWidth) || 0);
}

function clearLock() {
  lockedRect = null;
  lockedOrientation = '';
  lockedViewportWidth = 0;
  captureQueued = false;
}

function applyLock(image) {
  if (!(image instanceof HTMLImageElement) || !lockedRect) return false;
  image.style.setProperty('position', 'fixed', 'important');
  image.style.setProperty('left', `${lockedRect.left}px`, 'important');
  image.style.setProperty('top', `${lockedRect.top}px`, 'important');
  image.style.setProperty('width', `${lockedRect.width}px`, 'important');
  image.style.setProperty('height', `${lockedRect.height}px`, 'important');
  image.style.setProperty('max-width', 'none', 'important');
  image.style.setProperty('max-height', 'none', 'important');
  image.style.setProperty('margin', '0', 'important');
  image.style.setProperty('transform', 'none', 'important');
  image.style.setProperty('object-fit', 'contain', 'important');
  image.style.setProperty('object-position', 'center center', 'important');
  image.dataset.oyatsuPositionLocked = 'true';
  return true;
}

function captureAndLock(image) {
  captureQueued = false;
  if (!(image instanceof HTMLImageElement)) return;
  if (document.body?.dataset?.screen !== OYATSU_SCREEN) return;

  const rect = image.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) return;

  lockedRect = Object.freeze({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });
  lockedOrientation = currentOrientation();
  lockedViewportWidth = currentViewportWidth();
  applyLock(image);
}

function queueCapture(image) {
  if (captureQueued || !(image instanceof HTMLImageElement)) return;
  captureQueued = true;

  const captureAfterLayout = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => captureAndLock(image)));
  };

  if (image.complete && image.naturalWidth > 0) {
    captureAfterLayout();
    return;
  }

  image.addEventListener('load', captureAfterLayout, { once: true });
  image.addEventListener('error', () => { captureQueued = false; }, { once: true });
}

function syncCharacterLock() {
  const active = document.body?.dataset?.screen === OYATSU_SCREEN;
  if (!active) {
    if (wasActive) clearLock();
    wasActive = false;
    return;
  }
  wasActive = true;

  const orientation = currentOrientation();
  const viewportWidth = currentViewportWidth();
  if (lockedRect && (
    lockedOrientation !== orientation
    || Math.abs(viewportWidth - lockedViewportWidth) >= WIDTH_RESET_THRESHOLD_PX
  )) {
    clearLock();
  }

  const image = document.querySelector(CHARACTER_SELECTOR);
  if (!(image instanceof HTMLImageElement)) return;
  if (lockedRect) {
    applyLock(image);
    return;
  }
  queueCapture(image);
}

function installOyatsuCharacterPositionLock() {
  if (globalThis[INSTALL_KEY]) return;
  globalThis[INSTALL_KEY] = true;

  const observer = new MutationObserver(syncCharacterLock);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-screen', 'data-orientation'],
  });

  globalThis.addEventListener('orientationchange', () => {
    clearLock();
    queueMicrotask(syncCharacterLock);
  }, { passive: true });

  globalThis.addEventListener('resize', () => queueMicrotask(syncCharacterLock), { passive: true });
  syncCharacterLock();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installOyatsuCharacterPositionLock, { once: true });
} else {
  installOyatsuCharacterPositionLock();
}
