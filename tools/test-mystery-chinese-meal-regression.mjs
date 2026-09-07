#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

function extractFunction(name) {
  const re = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, 'm');
  const match = re.exec(APP);
  assert.ok(match, `${name}: production definition not found`);
  const brace = APP.indexOf('{', match.index);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < APP.length; i += 1) {
    const c = APP[i];
    const n = APP[i + 1];
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && n === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (c === '/' && n === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}' && --depth === 0) return APP.slice(match.index, i + 1);
  }
  throw new Error(`${name}: unterminated function`);
}

const COST = 4200;
const MEAL = { id: 'chinese', name: '中華料理', price: COST, recovery: 3 };
const source = `${extractFunction('applyMysteryChineseMeal')}`;

function createHarness({
  active = true,
  mealApplied = false,
  selectedDish = '麻婆豆腐',
  lastDish = '',
  hungerBefore = null,
  hungerAfter = null,
  money = COST * 2,
  hunger = 2,
  lastMeal = '',
  mealsEaten = 0,
  dailyMeals = [],
  includeMeal = true,
} = {}) {
  const eventState = { active, mealApplied, selectedDish, lastDish, hungerBefore, hungerAfter };
  const finance = [];
  const feedback = [];
  const timeCalls = [];
  const notifications = [];
  const saves = [];
  const toasts = [];
  const state = {
    game: { money },
    wellbeing: { hunger, lastMeal, mealsEaten },
    daily: { meals: dailyMeals },
  };
  const ctx = {
    state,
    MYSTERY_CHINESE_MEAL_EVENT_COST: COST,
    MEALS: includeMeal ? { chinese: MEAL } : {},
    mysteryChineseMealEventState: () => eventState,
    showToast: (...args) => toasts.push(args),
    hungerLevel: () => Math.max(0, Math.min(7, Math.floor(Number(state.wellbeing.hunger) || 0))),
    addFinance: (...args) => finance.push(args),
    startMoneyFeedback: (...args) => feedback.push(args),
    spendMealTime: () => timeCalls.push(true),
    addNotification: (...args) => notifications.push(args),
    yen: (value) => `¥${Number(value).toLocaleString('ja-JP')}`,
    saveGame: () => saves.push(true),
    Math,
    Number,
    String,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'mystery-chinese-meal-production.js' });
  return { ctx, eventState, finance, feedback, timeCalls, notifications, saves, toasts };
}

function testInactiveOrMissingMealDoesNothing() {
  const inactive = createHarness({ active: false });
  assert.equal(inactive.ctx.applyMysteryChineseMeal(), false);
  assert.equal(inactive.ctx.state.game.money, COST * 2);
  assert.equal(inactive.saves.length, 0);

  const missing = createHarness({ includeMeal: false });
  assert.equal(missing.ctx.applyMysteryChineseMeal(), false);
  assert.equal(missing.ctx.state.game.money, COST * 2);
  assert.equal(missing.saves.length, 0);
}

function testAlreadyAppliedIsIdempotent() {
  const h = createHarness({ mealApplied: true, money: COST * 3, dailyMeals: [{ id: 'old' }] });
  assert.equal(h.ctx.applyMysteryChineseMeal(), true);
  assert.equal(h.ctx.state.game.money, COST * 3);
  assert.equal(h.ctx.state.daily.meals.length, 1);
  assert.equal(h.finance.length, 0);
  assert.equal(h.timeCalls.length, 0);
  assert.equal(h.notifications.length, 0);
  assert.equal(h.saves.length, 0);
}

function testInsufficientFundsDoesNotPartiallyCommit() {
  const h = createHarness({ money: COST - 1, hunger: 1 });
  assert.equal(h.ctx.applyMysteryChineseMeal(), false);
  assert.equal(h.ctx.state.game.money, COST - 1);
  assert.equal(h.eventState.mealApplied, false);
  assert.equal(h.eventState.hungerBefore, null);
  assert.equal(h.eventState.lastDish, '');
  assert.equal(h.finance.length, 0);
  assert.equal(h.timeCalls.length, 0);
  assert.equal(h.notifications.length, 0);
  assert.equal(h.saves.length, 0);
  assert.deepEqual(h.toasts, [['所持金が足りません。', 'warning']]);
}

function testSuccessfulMealCommitsMoneyTimeHungerAndHistory() {
  const h = createHarness({ money: COST, hunger: 2, selectedDish: '麻婆豆腐', mealsEaten: 4, dailyMeals: [] });
  assert.equal(h.ctx.applyMysteryChineseMeal(), true);
  assert.equal(h.ctx.state.game.money, 0);
  assert.equal(h.eventState.mealApplied, true);
  assert.equal(h.eventState.hungerBefore, 2);
  assert.equal(h.eventState.lastDish, '麻婆豆腐');
  assert.equal(h.ctx.state.wellbeing.hunger, 5);
  assert.equal(h.eventState.hungerAfter, 5);
  assert.equal(h.ctx.state.wellbeing.lastMeal, 'chinese');
  assert.equal(h.ctx.state.wellbeing.mealsEaten, 5);
  assert.deepEqual(h.finance, [['謎の中華料理', 0, COST]]);
  assert.deepEqual(h.feedback, [[-COST, 1200]]);
  assert.equal(h.timeCalls.length, 1);
  assert.equal(h.ctx.state.daily.meals.length, 1);
  assert.equal(h.ctx.state.daily.meals[0].id, 'chinese');
  assert.equal(h.ctx.state.daily.meals[0].name, '謎の中華料理');
  assert.equal(h.ctx.state.daily.meals[0].price, COST);
  assert.equal(h.ctx.state.daily.meals[0].recovery, 3);
  assert.deepEqual(h.notifications, [[
    '謎の中華料理を食べた',
    `¥${COST.toLocaleString('ja-JP')}を支払い、空腹度が回復しました。`,
    'special',
  ]]);
  assert.equal(h.saves.length, 1);
}

function testHungerRecoveryCapsAtSeven() {
  const h = createHarness({ hunger: 6, money: COST * 2 });
  assert.equal(h.ctx.applyMysteryChineseMeal(), true);
  assert.equal(h.ctx.state.wellbeing.hunger, 7);
  assert.equal(h.eventState.hungerBefore, 6);
  assert.equal(h.eventState.hungerAfter, 7);
  assert.equal(h.ctx.state.daily.meals[0].recovery, 1);
}

function testDailyMealsAndMealsEatenAreNormalized() {
  const h = createHarness({ dailyMeals: null, mealsEaten: '2.9', hunger: 0 });
  assert.equal(h.ctx.applyMysteryChineseMeal(), true);
  assert.ok(Array.isArray(h.ctx.state.daily.meals));
  assert.equal(h.ctx.state.daily.meals.length, 1);
  assert.equal(h.ctx.state.wellbeing.mealsEaten, 3);
}

function testRepeatedCallCannotDoubleChargeSpendTimeOrRecordHistory() {
  const h = createHarness({ money: COST * 3, hunger: 1, dailyMeals: [] });
  assert.equal(h.ctx.applyMysteryChineseMeal(), true);
  assert.equal(h.ctx.applyMysteryChineseMeal(), true);
  assert.equal(h.ctx.state.game.money, COST * 2);
  assert.equal(h.finance.length, 1);
  assert.equal(h.feedback.length, 1);
  assert.equal(h.timeCalls.length, 1);
  assert.equal(h.ctx.state.daily.meals.length, 1);
  assert.equal(h.notifications.length, 1);
  assert.equal(h.saves.length, 1);
}

const tests = [
  testInactiveOrMissingMealDoesNothing,
  testAlreadyAppliedIsIdempotent,
  testInsufficientFundsDoesNotPartiallyCommit,
  testSuccessfulMealCommitsMoneyTimeHungerAndHistory,
  testHungerRecoveryCapsAtSeven,
  testDailyMealsAndMealsEatenAreNormalized,
  testRepeatedCallCannotDoubleChargeSpendTimeOrRecordHistory,
];

for (const test of tests) {
  test();
  console.log(`PASS: ${test.name}`);
}
console.log('MYSTERY CHINESE MEAL REGRESSION: PASS');
