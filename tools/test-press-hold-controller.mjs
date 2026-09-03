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

console.log('PRESS HOLD CONTROLLER: PASS');
console.log('320ms開始・65ms反復・長押し後クリック抑止・cancel・disabledを確認しました。');
