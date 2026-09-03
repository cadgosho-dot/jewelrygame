// DOM-only toast presentation controller.
// Sound effects, winter text effects and game decisions remain owned by app.js.
export function createToastPresenter({
  element,
  durationMs = 2100,
  setTimeoutImpl = globalThis.setTimeout?.bind(globalThis),
  clearTimeoutImpl = globalThis.clearTimeout?.bind(globalThis),
} = {}) {
  if (!element || typeof element !== 'object') throw new TypeError('element is required');
  if (!element.dataset || typeof element.dataset !== 'object') throw new TypeError('element.dataset is required');
  if (!element.classList || typeof element.classList.add !== 'function' || typeof element.classList.remove !== 'function') {
    throw new TypeError('element.classList add/remove are required');
  }
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new TypeError('durationMs must be a non-negative number');
  if (typeof setTimeoutImpl !== 'function') throw new TypeError('setTimeoutImpl must be a function');
  if (typeof clearTimeoutImpl !== 'function') throw new TypeError('clearTimeoutImpl must be a function');

  let hideTimer = null;

  function show(message, type = 'info') {
    element.textContent = message;
    element.dataset.type = type;
    element.classList.add('show');
    if (hideTimer !== null) clearTimeoutImpl(hideTimer);
    hideTimer = setTimeoutImpl(() => {
      hideTimer = null;
      element.classList.remove('show');
    }, durationMs);
  }

  return Object.freeze({ show });
}
