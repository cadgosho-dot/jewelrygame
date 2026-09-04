// DOM-only autosave status presenter.
// Save decisions, persistence and error handling remain owned by app.js.
export function createAutosaveStatusPresenter({
  documentRef = globalThis.document,
  hideDelayMs = 2200,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
} = {}) {
  if (!documentRef || typeof documentRef.querySelector !== 'function' || typeof documentRef.createElement !== 'function') {
    throw new TypeError('documentRef with querySelector/createElement is required');
  }
  if (!documentRef.body || typeof documentRef.body.appendChild !== 'function') {
    throw new TypeError('documentRef.body.appendChild is required');
  }
  if (typeof setTimeoutFn !== 'function' || typeof clearTimeoutFn !== 'function') {
    throw new TypeError('timer functions are required');
  }

  let hideTimer = null;

  function ensureElement() {
    let element = documentRef.querySelector('[data-autosave-status]');
    if (element) return element;
    element = documentRef.createElement('div');
    element.className = 'autosave-status';
    element.dataset.autosaveStatus = 'idle';
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.hidden = true;
    documentRef.body.appendChild(element);
    return element;
  }

  function show(mode, text, { persistent = false } = {}) {
    const element = ensureElement();
    if (hideTimer) {
      clearTimeoutFn(hideTimer);
      hideTimer = null;
    }
    element.dataset.autosaveStatus = String(mode || 'idle');
    element.textContent = String(text || '');
    element.hidden = !text;
    if (!persistent && text) {
      hideTimer = setTimeoutFn(() => {
        element.hidden = true;
        element.dataset.autosaveStatus = 'idle';
        hideTimer = null;
      }, hideDelayMs);
    }
    return element;
  }

  return Object.freeze({ ensureElement, show });
}
