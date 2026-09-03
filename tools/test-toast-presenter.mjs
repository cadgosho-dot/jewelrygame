import assert from 'node:assert/strict';
import { createToastPresenter } from '../js/ui/toast-presenter.js';

class FakeClassList {
  constructor() {
    this.values = new Set();
  }
  add(value) {
    this.values.add(value);
  }
  remove(value) {
    this.values.delete(value);
  }
  contains(value) {
    return this.values.has(value);
  }
}

class FakeElement {
  constructor() {
    this.textContent = '';
    this.dataset = {};
    this.classList = new FakeClassList();
    this.innerHTML = '';
  }
}

const timers = new Map();
const cleared = [];
let nextTimerId = 1;
const element = new FakeElement();
const presenter = createToastPresenter({
  element,
  setTimeoutImpl(callback, delay) {
    const id = nextTimerId++;
    timers.set(id, { callback, delay });
    return id;
  },
  clearTimeoutImpl(id) {
    cleared.push(id);
    timers.delete(id);
  },
});

presenter.show('最初の通知', 'info');
assert.equal(element.textContent, '最初の通知');
assert.equal(element.dataset.type, 'info');
assert.equal(element.classList.contains('show'), true);
assert.equal(timers.get(1)?.delay, 2100, 'default hide delay must remain 2100ms');

presenter.show('売れました', 'sale');
assert.deepEqual(cleared, [1], 'showing another toast must clear the previous hide timer');
assert.equal(element.textContent, '売れました');
assert.equal(element.dataset.type, 'sale');
assert.equal(element.classList.contains('show'), true);
assert.equal(timers.get(2)?.delay, 2100);

timers.get(2).callback();
assert.equal(element.classList.contains('show'), false, 'latest timer must hide the toast');

presenter.show('標準type');
assert.equal(element.dataset.type, 'info', 'default toast type must remain info');
assert.equal(element.classList.contains('show'), true);

const customElement = new FakeElement();
const customTimers = [];
const customPresenter = createToastPresenter({
  element: customElement,
  durationMs: 500,
  setTimeoutImpl(callback, delay) {
    customTimers.push({ callback, delay });
    return customTimers.length;
  },
  clearTimeoutImpl() {},
});
customPresenter.show('短時間');
assert.equal(customTimers[0].delay, 500, 'custom duration must be supported without changing the default');

assert.throws(() => createToastPresenter(), /element is required/);
assert.throws(() => createToastPresenter({ element, durationMs: -1 }), /durationMs/);

console.log('TOAST PRESENTER: PASS');
