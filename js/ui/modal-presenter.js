// DOM-only modal presentation controller.
// Game actions, save/event decisions and post-close hooks remain owned by app.js.
export function createModalPresenter({
  element,
  escapeHtml,
} = {}) {
  if (!element || typeof element !== 'object') throw new TypeError('element is required');
  if (!element.classList || typeof element.classList.add !== 'function' || typeof element.classList.remove !== 'function') {
    throw new TypeError('element.classList add/remove are required');
  }
  if (typeof escapeHtml !== 'function') throw new TypeError('escapeHtml must be a function');

  function show({
    title = '',
    body = '',
    confirm = '決定',
    cancel = 'キャンセル',
    cancelAction = 'modal-close',
    confirmDisabled = false,
    danger = false,
    hideCancel = false,
    hideActions = false,
    action = '',
    className = '',
  } = {}) {
    const esc = escapeHtml;
    element.innerHTML = `
    <div class="modal-backdrop">
      <section class="modal-card ${esc(className)}" role="dialog" aria-modal="true">
        ${title ? `<h2>${esc(title)}</h2>` : ''}
        <div class="modal-body">${body}</div>
        ${hideActions ? '' : `<div class="modal-actions">
          ${hideCancel ? '' : `<button class="secondary-button" data-action="${esc(cancelAction)}">${esc(cancel)}</button>`}
          <button class="${danger ? 'danger-button' : 'primary-button'}" data-action="${esc(action)}" ${action === 'do-sleep' ? 'data-illness-readable="true"' : ''} ${confirmDisabled ? 'disabled' : ''}>${esc(confirm)}</button>
        </div>`}
      </section>
    </div>`;
    element.classList.remove('hidden');
  }

  function close() {
    element.classList.add('hidden');
    element.innerHTML = '';
  }

  return Object.freeze({ show, close });
}
