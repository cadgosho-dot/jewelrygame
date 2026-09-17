// セリフ切替などの再描画で .jxj-new-event-character のDOMが作り直されても、
// 同じイベント画面・同じ画像・同じ端末向きの間は最初の実表示位置とサイズを維持する。
// 承認済みの通常イベントUI / クイズイベントUIは別クラスなので、この保護の対象にしない。

const CHARACTER_SELECTOR = '.jxj-new-event-character';
const INSTALL_KEY = '__JXJ_NEW_EVENT_CHARACTER_POSITION_LOCK__';
const WIDTH_RESET_THRESHOLD_PX = 80;

const lockedRects = new Map();
const captureQueued = new WeakSet();
let activeScreen = '';
let lockedOrientation = '';
let lockedViewportWidth = 0;
let captureGeneration = 0;

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

function imageSource(image) {
  if (!(image instanceof HTMLImageElement)) return '';
  return String(image.currentSrc || image.getAttribute('src') || image.src || '');
}

function lockKey(screen, orientation, source) {
  return `${screen}\u0000${orientation}\u0000${source}`;
}

function clearLocks() {
  lockedRects.clear();
  lockedOrientation = '';
  lockedViewportWidth = 0;
  captureGeneration += 1;
}

function applyLock(image, rect) {
  if (!(image instanceof HTMLImageElement) || !rect) return false;
  image.style.setProperty('position', 'fixed', 'important');
  image.style.setProperty('left', `${rect.left}px`, 'important');
  image.style.setProperty('top', `${rect.top}px`, 'important');
  image.style.setProperty('width', `${rect.width}px`, 'important');
  image.style.setProperty('height', `${rect.height}px`, 'important');
  image.style.setProperty('max-width', 'none', 'important');
  image.style.setProperty('max-height', 'none', 'important');
  image.style.setProperty('margin', '0', 'important');
  image.style.setProperty('transform', 'none', 'important');
  image.style.setProperty('object-fit', 'contain', 'important');
  image.style.setProperty('object-position', 'center center', 'important');
  image.dataset.eventPositionLocked = 'true';
  return true;
}

function captureAndLock(image, screen, orientation, source, generation) {
  captureQueued.delete(image);
  if (!(image instanceof HTMLImageElement) || !image.isConnected) {
    queueMicrotask(syncCharacterLock);
    return;
  }
  if (generation !== captureGeneration) {
    queueMicrotask(syncCharacterLock);
    return;
  }
  if (String(document.body?.dataset?.screen || '') !== screen) return;
  if (currentOrientation() !== orientation) return;
  if (imageSource(image) !== source) return;

  const rect = image.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) return;

  const lockedRect = Object.freeze({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });
  lockedRects.set(lockKey(screen, orientation, source), lockedRect);
  lockedOrientation = orientation;
  lockedViewportWidth = currentViewportWidth();
  applyLock(image, lockedRect);
}

function queueCapture(image, screen, orientation, source) {
  if (captureQueued.has(image) || !(image instanceof HTMLImageElement)) return;
  captureQueued.add(image);
  const generation = captureGeneration;

  const captureAfterLayout = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => (
      captureAndLock(image, screen, orientation, source, generation)
    )));
  };

  if (image.complete && image.naturalWidth > 0) {
    captureAfterLayout();
    return;
  }

  image.addEventListener('load', captureAfterLayout, { once: true });
  image.addEventListener('error', () => {
    captureQueued.delete(image);
    queueMicrotask(syncCharacterLock);
  }, { once: true });
}

function syncCharacterLock() {
  const screen = String(document.body?.dataset?.screen || '');
  if (screen !== activeScreen) {
    clearLocks();
    activeScreen = screen;
  }

  const image = document.querySelector(CHARACTER_SELECTOR);
  if (!(image instanceof HTMLImageElement)) return;

  const orientation = currentOrientation();
  const viewportWidth = currentViewportWidth();
  if (lockedRects.size && (
    lockedOrientation !== orientation
    || Math.abs(viewportWidth - lockedViewportWidth) >= WIDTH_RESET_THRESHOLD_PX
  )) {
    clearLocks();
  }

  const source = imageSource(image);
  if (!source) return;
  const key = lockKey(screen, orientation, source);
  const lockedRect = lockedRects.get(key);
  if (lockedRect) {
    applyLock(image, lockedRect);
    return;
  }

  queueCapture(image, screen, orientation, source);
}

function installNewEventCharacterPositionLock() {
  if (globalThis[INSTALL_KEY]) return;
  globalThis[INSTALL_KEY] = true;

  const observer = new MutationObserver(syncCharacterLock);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-screen', 'data-orientation', 'src'],
  });

  globalThis.addEventListener('orientationchange', () => {
    clearLocks();
    queueMicrotask(syncCharacterLock);
  }, { passive: true });

  globalThis.addEventListener('resize', () => queueMicrotask(syncCharacterLock), { passive: true });
  syncCharacterLock();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installNewEventCharacterPositionLock, { once: true });
} else {
  installNewEventCharacterPositionLock();
}
