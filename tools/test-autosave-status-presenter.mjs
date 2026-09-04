import assert from 'node:assert/strict';
import { createAutosaveStatusPresenter } from '../js/ui/autosave-status-presenter.js';

function createFakeElement() {
  return {
    className: '',
    dataset: {},
    hidden: false,
    textContent: '',
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); },
  };
}

function createHarness() {
  let statusElement = null;
  const appended = [];
  const timers = new Map();
  const cleared = [];
  let nextTimerId = 1;
  const documentRef = {
    body: {
      appendChild(element) {
        appended.push(element);
        statusElement = element;
      },
    },
    querySelector(selector) {
      return selector === '[data-autosave-status]' ? statusElement : null;
    },
    createElement(tagName) {
      assert.equal(tagName, 'div');
      return createFakeElement();
    },
  };
  const setTimeoutFn = (callback, delay) => {
    const id = nextTimerId++;
    timers.set(id, { callback, delay });
    return id;
  };
  const clearTimeoutFn = (id) => {
    cleared.push(id);
    timers.delete(id);
  };
  return { documentRef, appended, timers, cleared, setTimeoutFn, clearTimeoutFn, getElement: () => statusElement };
}

{
  const h = createHarness();
  const presenter = createAutosaveStatusPresenter({
    documentRef: h.documentRef,
    setTimeoutFn: h.setTimeoutFn,
    clearTimeoutFn: h.clearTimeoutFn,
  });
  const element = presenter.ensureElement();
  assert.equal(h.appended.length, 1);
  assert.equal(element.className, 'autosave-status');
  assert.equal(element.dataset.autosaveStatus, 'idle');
  assert.equal(element.attributes.role, 'status');
  assert.equal(element.attributes['aria-live'], 'polite');
  assert.equal(element.hidden, true);
  assert.equal(presenter.ensureElement(), element);
  assert.equal(h.appended.length, 1, 'existing status element must be reused');

  presenter.show('saved', '端末に保存しました');
  assert.equal(element.dataset.autosaveStatus, 'saved');
  assert.equal(element.textContent, '端末に保存しました');
  assert.equal(element.hidden, false);
  assert.equal(h.timers.size, 1);
  const firstTimer = [...h.timers.entries()][0];
  assert.equal(firstTimer[1].delay, 2200, 'default hide delay must remain 2200ms');
  firstTimer[1].callback();
  assert.equal(element.hidden, true);
  assert.equal(element.dataset.autosaveStatus, 'idle');
}

{
  const h = createHarness();
  const presenter = createAutosaveStatusPresenter({
    documentRef: h.documentRef,
    setTimeoutFn: h.setTimeoutFn,
    clearTimeoutFn: h.clearTimeoutFn,
  });
  const element = presenter.show('error', '保存できませんでした', { persistent: true });
  assert.equal(element.hidden, false);
  assert.equal(element.dataset.autosaveStatus, 'error');
  assert.equal(h.timers.size, 0, 'persistent message must not auto-hide');
  presenter.show('saved', '復旧しました');
  const timerId = [...h.timers.keys()][0];
  presenter.show('error', '再試行中', { persistent: true });
  assert.ok(h.cleared.includes(timerId), 'next status must cancel prior auto-hide timer');
  assert.equal(h.timers.size, 0);
  presenter.show('', '');
  assert.equal(element.hidden, true);
  assert.equal(element.dataset.autosaveStatus, 'idle');
  assert.equal(element.textContent, '');
}

console.log('AUTOSAVE STATUS PRESENTER TEST: PASS');
