import assert from 'node:assert/strict';
import { createEventStateHelpers } from '../js/events/event-state-helpers.js';

const state = { events:{ wolfMotherButlerEvent:{ active:true, stage:'reward' } }, inventory:{ metals:{ gold:5 } } };
let saves = 0;
const toasts = [];
const sounds = [];
const helper = createEventStateHelpers(
  () => state,
  () => { saves += 1; },
  (...args) => toasts.push(args),
  (...args) => sounds.push(args),
  (value) => Math.round(Math.max(0, Number(value) || 0) * 10) / 10,
  { gold:{} },
);

const reward = helper.grantMetalIgnoreCapacity('gold', 20, { message:'K18YGが20g追加されました', type:'success', withSound:false });
assert.equal(reward.ok, true);
assert.equal(state.inventory.metals.gold, 25);
assert.equal(toasts.length, 1);
assert.equal(sounds.length, 0);
assert.equal(saves, 1);

const progressState = state.events.wolfMotherButlerEvent;
const progress = helper.patchEventState('wolfMotherButlerEvent', { stage:'dialogue8', rewardGranted:true });
assert.equal(progress.ok, true);
assert.strictEqual(state.events.wolfMotherButlerEvent, progressState);
assert.equal(progressState.stage, 'dialogue8');
assert.equal(progressState.rewardGranted, true);
assert.equal(progressState.active, true);
assert.equal(saves, 2);

const invalid = helper.grantMetalIgnoreCapacity('unknown', 20);
assert.equal(invalid.ok, false);
assert.equal(state.inventory.metals.gold, 25);
assert.equal(saves, 2);

console.log('EVENT STATE HELPERS TEST: PASS');
console.log('イベント状態の既存参照を維持したままreward→dialogue8へ進行し、K18YG 20g付与も維持することを確認しました。');
