import assert from 'node:assert/strict';
import { createPressHoldController } from '../js/ui/press-hold-controller.js';

function fakeTimers() {
  let nextId = 1;
  const timeouts = new Map();
  const intervals = new Map();
  return {
    api: {
      setTimeout(fn, ms) { const id = nextId++; timeouts.set(id, { fn, ms }); return id; },
      clearTimeout(id) { timeouts.delete(id); },
      setInterval(fn, ms) { const id = nextId++; intervals.set(id, { fn, ms }); return id; },
      clearInterval(id) { intervals.delete(id); },
    },
    fireTimeout() { const [id, item] = timeouts.entries().next().value || []; assert.ok(item); timeouts.delete(id); item.fn(); return item.ms; },
    fireInterval() { const item = intervals.values().next().value; assert.ok(item); item.fn(); return item.ms; },
    counts() { return { timeouts: timeouts.size, intervals: intervals.size }; },
  };
}

function fakeButton(disabled = false) {
  const classes = new Set();
  return {
    disabled,
    dataset: {},
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      contains(value) { return classes.has(value); },
    },
  };
}

const timers = fakeTimers();
let taps = 0;
let holds = 0;
const controller = createPressHoldController({
  onTap: () => { taps += 1; },
  onLongPress: () => { holds += 1; },
  timers: timers.api,
});

const button = fakeButton();
assert.equal(controller.start(button), true);
assert.equal(controller.activeButton(), button);
assert.equal(button.classList.contains('is-holding'), true);
assert.equal(timers.fireTimeout(), 320);
assert.equal(holds, 1);
assert.equal(timers.fireInterval(), 65);
assert.equal(timers.fireInterval(), 65);
assert.equal(holds, 3);
assert.equal(controller.finish(button), true);
assert.equal(button.classList.contains('is-holding'), false);
assert.equal(controller.activeButton(), null);
assert.equal(button.dataset.skipNextClick, 'true');
assert.equal(controller.handleClick(button), false);
assert.equal(taps, 0);
assert.equal(button.dataset.skipNextClick, undefined);
assert.equal(controller.handleClick(button), true);
assert.equal(taps, 1);

const cancelled = fakeButton();
assert.equal(controller.start(cancelled), true);
controller.cancel();
assert.deepEqual(timers.counts(), { timeouts: 0, intervals: 0 });
assert.equal(cancelled.classList.contains('is-holding'), false);

const disabled = fakeButton(true);
assert.equal(controller.start(disabled), false);
assert.equal(controller.activeButton(), null);
assert.deepEqual(timers.counts(), { timeouts: 0, intervals: 0 });

const sellingTimers = fakeTimers();
let sellingHolds = 0;
let sellingActive = true;
const sellingController = createPressHoldController({
  onTap: () => {},
  onLongPress: () => { sellingHolds += 1; },
  holdDelayMs: 420,
  repeatMs: 110,
  canContinue: () => sellingActive,
  timers: sellingTimers.api,
});
const sellingButton = fakeButton();
assert.equal(sellingController.start(sellingButton), true);
assert.equal(sellingTimers.fireTimeout(), 420);
assert.equal(sellingHolds, 1);
assert.equal(sellingTimers.fireInterval(), 110);
assert.equal(sellingHolds, 2);
sellingActive = false;
assert.equal(sellingTimers.fireInterval(), 110);
assert.equal(sellingHolds, 2);
assert.deepEqual(sellingTimers.counts(), { timeouts: 0, intervals: 0 });
assert.equal(sellingController.activeButton(), null);
assert.equal(sellingButton.classList.contains('is-holding'), false);
assert.equal(sellingController.finish(sellingButton), false);

const blockedSellingButton = fakeButton();
assert.equal(sellingController.start(blockedSellingButton), false);
assert.equal(blockedSellingButton.classList.contains('is-holding'), false);

const noClassTimers = fakeTimers();
let noClassHolds = 0;
const noClassController = createPressHoldController({
  onTap: () => {},
  onLongPress: () => { noClassHolds += 1; },
  holdingClass: null,
  timers: noClassTimers.api,
});
const noClassButton = fakeButton();
assert.equal(noClassController.start(noClassButton), true);
assert.equal(noClassButton.classList.contains('is-holding'), false);
assert.equal(noClassTimers.fireTimeout(), 320);
assert.equal(noClassHolds, 1);
assert.equal(noClassTimers.fireInterval(), 65);
assert.equal(noClassHolds, 2);
assert.equal(noClassController.finish(noClassButton), true);
assert.equal(noClassButton.classList.contains('is-holding'), false);

console.log('PRESS HOLD CONTROLLER: PASS');
console.log('標準320ms/65ms、販売価格420ms/110ms、継続条件停止、表示クラスなし、長押し後クリック抑止・cancel・disabledを確認しました。');
