import assert from 'node:assert/strict';
import { createEventStateHelpers } from '../js/events/event-state-helpers.js';

const state = { playerName:'確認職人', game:{ day:12, startDate:'2026-09-01', minutes:720, money:10000, weather:'晴れ' }, wellbeing:{ hunger:2, maxHunger:7, lastMeal:'', mealsEaten:0 }, events:{ wolfMotherButlerEvent:{ active:true, stage:'reward' }, oyatsuMalatangEvent:{ active:true, stage:'meal', charged:false } }, inventory:{ metals:{ gold:5 } } };
let saves = 0;
const toasts = [];
const sounds = [];
const finances = [];
const notifications = [];
let mealTimeSpendCount = 0;
const mealFeedbacks = [];
let renders = 0;
const helper = createEventStateHelpers(
  () => state,
  () => { saves += 1; },
  (...args) => toasts.push(args),
  (...args) => sounds.push(args),
  (value) => Math.round(Math.max(0, Number(value) || 0) * 10) / 10,
  { gold:{} },
);
helper.configureServices({
  canSpendMealTime: () => true,
  spendMealTime: () => { mealTimeSpendCount += 1; state.game.minutes += 60; },
  addFinance: (...args) => finances.push(args),
  addNotification: (...args) => notifications.push(args),
  setMealFeedback: (...args) => mealFeedbacks.push(args),
  render: () => { renders += 1; },
});

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

const runtime = helper.eventRuntimeSnapshot('oyatsuMalatangEvent');
assert.equal(runtime.ok, true);
assert.equal(runtime.playerName, '確認職人');
assert.equal(runtime.game.money, 10000);
assert.equal(runtime.wellbeing.hunger, 2);
assert.equal(runtime.event.stage, 'meal');
assert.equal(runtime.mealTimeAvailable, true);

const meal = helper.settleEventMeal('oyatsuMalatangEvent', { price:3500, mealId:'oyatsuMalatang', mealLabel:'麻辣湯' });
assert.equal(meal.ok, true);
assert.equal(meal.alreadyCharged, undefined);
assert.equal(state.game.money, 6500);
assert.equal(state.wellbeing.hunger, 7);
assert.equal(state.wellbeing.lastMeal, 'oyatsuMalatang');
assert.equal(state.wellbeing.mealsEaten, 1);
assert.equal(state.events.oyatsuMalatangEvent.charged, true);
assert.equal(state.game.minutes, 780);
assert.equal(mealTimeSpendCount, 1);
assert.deepEqual(finances[0], ['麻辣湯で食事', 0, 3500]);
assert.equal(notifications.length, 1);
assert.equal(state.daily.meals.length, 1);
assert.equal(state.daily.meals[0].name, '麻辣湯');
assert.equal(saves, 3);

const duplicateMeal = helper.settleEventMeal('oyatsuMalatangEvent', { price:3500, mealId:'oyatsuMalatang', mealLabel:'麻辣湯' });
assert.equal(duplicateMeal.ok, true);
assert.equal(duplicateMeal.alreadyCharged, true);
assert.equal(state.game.money, 6500);
assert.equal(state.wellbeing.mealsEaten, 1);
assert.equal(mealTimeSpendCount, 1);
assert.equal(finances.length, 1);
assert.equal(state.daily.meals.length, 1);
assert.equal(saves, 3);

state.events.oyatsuMalatangEvent.charged = false;
state.game.money = 1000;
const insufficientMeal = helper.settleEventMeal('oyatsuMalatangEvent', { price:3500, mealId:'oyatsuMalatang', mealLabel:'麻辣湯' });
assert.equal(insufficientMeal.ok, false);
assert.equal(insufficientMeal.reason, 'insufficient-funds');
assert.equal(state.game.money, 1000);
assert.equal(state.wellbeing.mealsEaten, 1);
assert.equal(saves, 3);

const mealUi = helper.completeEventMealUi({ before:2, after:7, mealName:'麻辣湯' });
assert.equal(mealUi.ok, true);
assert.deepEqual(mealFeedbacks, [[2, 7, '麻辣湯']]);
assert.equal(renders, 1);
assert.deepEqual(toasts.at(-1), ['ごちそうさまでした', 'meal-complete', false]);
assert.deepEqual(sounds.at(-1), ['levelup']);

console.log('EVENT STATE HELPERS TEST: PASS');
console.log('イベント状態参照・K18報酬・麻辣湯3500円一度だけ決済と空腹度全回復を確認しました。');
