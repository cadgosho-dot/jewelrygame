import assert from 'node:assert/strict';
import { createModalPresenter } from '../js/ui/modal-presenter.js';

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function makeElement() {
  const classes = new Set(['hidden']);
  return {
    innerHTML: '',
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
  };
}

{
  const element = makeElement();
  const presenter = createModalPresenter({ element, escapeHtml: esc });
  presenter.show({ title: '確認', body: '<p>本文</p>', action: 'ok' });
  assert.equal(element.classList.contains('hidden'), false);
  assert.match(element.innerHTML, /modal-backdrop/);
  assert.match(element.innerHTML, /<h2>確認<\/h2>/);
  assert.match(element.innerHTML, /<div class="modal-body"><p>本文<\/p><\/div>/);
  assert.match(element.innerHTML, /data-action="modal-close">キャンセル<\/button>/);
  assert.match(element.innerHTML, /class="primary-button" data-action="ok"/);
  assert.match(element.innerHTML, />決定<\/button>/);
  presenter.close();
  assert.equal(element.classList.contains('hidden'), true);
  assert.equal(element.innerHTML, '');
}

{
  const element = makeElement();
  const presenter = createModalPresenter({ element, escapeHtml: esc });
  presenter.show({
    title: '<危険>',
    body: '<strong>raw body</strong>',
    confirm: '削除<実行>',
    cancel: '戻る&閉じる',
    cancelAction: 'cancel"x',
    action: 'delete"x',
    className: 'wide"x',
    danger: true,
    confirmDisabled: true,
  });
  assert.match(element.innerHTML, /<h2>&lt;危険&gt;<\/h2>/);
  assert.match(element.innerHTML, /<strong>raw body<\/strong>/);
  assert.match(element.innerHTML, /modal-card wide&quot;x/);
  assert.match(element.innerHTML, /secondary-button" data-action="cancel&quot;x">戻る&amp;閉じる/);
  assert.match(element.innerHTML, /danger-button" data-action="delete&quot;x"  disabled>削除&lt;実行&gt;/);
}

{
  const element = makeElement();
  const presenter = createModalPresenter({ element, escapeHtml: esc });
  presenter.show({ action: 'do-sleep', hideCancel: true });
  assert.doesNotMatch(element.innerHTML, /secondary-button/);
  assert.match(element.innerHTML, /data-action="do-sleep" data-illness-readable="true"/);
}

{
  const element = makeElement();
  const presenter = createModalPresenter({ element, escapeHtml: esc });
  presenter.show({ title: '本文のみ', body: 'x', hideActions: true });
  assert.doesNotMatch(element.innerHTML, /modal-actions/);
  assert.doesNotMatch(element.innerHTML, /<button/);
}

assert.throws(() => createModalPresenter({ escapeHtml: esc }), /element is required/);
assert.throws(() => createModalPresenter({ element: makeElement() }), /escapeHtml must be a function/);

console.log('MODAL PRESENTER TEST: PASS');
