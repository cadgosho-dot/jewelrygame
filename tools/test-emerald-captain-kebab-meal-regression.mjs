#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

function extractFunction(name) {
  const re = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm');
  const match = re.exec(APP);
  assert.ok(match, `${name}: production definition not found`);
  const lineEnd = APP.indexOf('\n', match.index);
  const brace = APP.lastIndexOf('{', lineEnd);
  assert.ok(brace >= match.index, `${name}: opening brace not found`);
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

const productionSource = [
  extractFunction('finishEmeraldCaptainKebabMeal'),
  extractFunction('startEmeraldCaptainKebabMeal'),
].join('\n\n');

function createHarness({
  money = 5000,
  hunger = 2,
  lastMeal = '',
  mealsEaten = 0,
  active = true,
  stage = 'purchase',
  mealPaid = false,
  mealCompleted = false,
  hungerBefore = 0,
  preloadReject = false,
} = {}) {
  const calls = {
    finance: [],
    moneyFeedback: [],
    spendMealTime: 0,
    save: 0,
    render: 0,
    scheduled: 0,
    cleared: 0,
    sounds: [],
    goMain: 0,
    toasts: [],
    errors: [],
  };

  const state = {
    game: { money, screen: 'emeraldCaptainKebabEvent' },
    wellbeing: { hunger, lastMeal, mealsEaten },
    daily: { meals: [] },
    events: {
      emeraldCaptainKebab: {
        active,
        stage,
        mealPaid,
        mealCompleted,
        hungerBefore,
        hungerAfter: hunger,
      },
    },
  };

  const ctx = vm.createContext({
    console: { error: (...args) => calls.errors.push(args) },
    Math,
    Promise,
    structuredClone,
    EMERALD_CAPTAIN_KEBAB_EVENT_MEAL_ID: 'kebab',
    MEALS: {
      kebab: { id: 'kebab', name: 'ケバブ', price: 1200, recovery: 3 },
    },
    state,
    mealTransitioning: false,
    addFinance: (...args) => calls.finance.push(args),
    startMoneyFeedback: (...args) => calls.moneyFeedback.push(args),
    spendMealTime: () => { calls.spendMealTime += 1; },
    saveGame: () => { calls.save += 1; return Promise.resolve(true); },
    render: () => { calls.render += 1; },
    scheduleEmeraldCaptainMealWatchdog: () => { calls.scheduled += 1; },
    clearEmeraldCaptainMealWatchdog: () => { calls.cleared += 1; },
    waitForNextPaintWithTimeout: async () => {},
    wait: async () => {},
    preloadEmeraldCaptainMealAssets: async () => {
      if (preloadReject) throw new Error('asset preload failed');
    },
    playSfx: (...args) => calls.sounds.push(args),
    goMain: () => { calls.goMain += 1; ctx.state.game.screen = 'main'; },
    showToast: (...args) => calls.toasts.push(args),
  });
  ctx.emeraldCaptainKebabEventState = () => ctx.state.events.emeraldCaptainKebab;
  ctx.hungerLevel = () => Math.max(0, Math.min(7, Number(ctx.state.wellbeing.hunger) || 0));
  vm.runInContext(productionSource, ctx, { filename: 'emerald-captain-kebab-production.js' });
  return { ctx, calls };
}

async function testSuccessfulPurchaseMealLifecycle() {
  const { ctx, calls } = createHarness();
  await ctx.startEmeraldCaptainKebabMeal();
  const event = ctx.emeraldCaptainKebabEventState();
  assert.equal(ctx.state.game.money, 3800);
  assert.deepEqual(calls.finance, [['ケバブで食事', 0, 1200]]);
  assert.deepEqual(calls.moneyFeedback, [[-1200, 1200]]);
  assert.equal(event.mealPaid, true);
  assert.equal(event.mealCompleted, true);
  assert.equal(event.hungerBefore, 2);
  assert.equal(event.hungerAfter, 5);
  assert.equal(event.stage, 'farewell');
  assert.equal(ctx.state.wellbeing.hunger, 5);
  assert.equal(ctx.state.wellbeing.lastMeal, 'kebab');
  assert.equal(ctx.state.wellbeing.mealsEaten, 1);
  assert.equal(ctx.state.daily.meals.length, 1);
  assert.deepEqual(ctx.state.daily.meals[0], { id: 'kebab', name: 'ケバブ', price: 1200, recovery: 3 });
  assert.equal(calls.spendMealTime, 1);
  assert.equal(calls.scheduled, 1);
  assert.ok(calls.cleared >= 1);
  assert.equal(calls.save, 2);
  assert.equal(ctx.mealTransitioning, false);
}

async function testAlreadyPaidMealDoesNotChargeTwice() {
  const { ctx, calls } = createHarness({ mealPaid: true, hungerBefore: 2 });
  await ctx.startEmeraldCaptainKebabMeal();
  const event = ctx.emeraldCaptainKebabEventState();
  assert.equal(ctx.state.game.money, 5000);
  assert.equal(calls.finance.length, 0);
  assert.equal(calls.moneyFeedback.length, 0);
  assert.equal(calls.spendMealTime, 1);
  assert.equal(ctx.state.daily.meals.length, 1);
  assert.equal(event.mealCompleted, true);
  assert.equal(event.stage, 'farewell');
}

async function testTransitionGuardPreventsReentry() {
  const { ctx, calls } = createHarness();
  ctx.mealTransitioning = true;
  await ctx.startEmeraldCaptainKebabMeal();
  assert.equal(ctx.state.game.money, 5000);
  assert.equal(calls.finance.length, 0);
  assert.equal(calls.spendMealTime, 0);
  assert.equal(calls.save, 0);
  assert.equal(ctx.state.daily.meals.length, 0);
}

async function testInsufficientFundsRestoresAndClosesEvent() {
  const { ctx, calls } = createHarness({ money: 500 });
  await ctx.startEmeraldCaptainKebabMeal();
  const event = ctx.emeraldCaptainKebabEventState();
  assert.equal(ctx.state.game.money, 500);
  assert.equal(event.mealPaid, false);
  assert.equal(event.mealCompleted, false);
  assert.equal(event.active, false);
  assert.equal(event.stage, 'completed');
  assert.equal(calls.finance.length, 0);
  assert.equal(calls.spendMealTime, 0);
  assert.equal(ctx.state.daily.meals.length, 0);
  assert.equal(calls.goMain, 1);
  assert.equal(ctx.state.game.screen, 'main');
  assert.equal(calls.toasts.length, 1);
  assert.equal(calls.toasts[0][1], 'warning');
  assert.equal(ctx.mealTransitioning, false);
}

async function testPreloadFailureRestoresPaymentState() {
  const { ctx, calls } = createHarness({ preloadReject: true });
  await ctx.startEmeraldCaptainKebabMeal();
  const event = ctx.emeraldCaptainKebabEventState();
  assert.equal(ctx.state.game.money, 5000);
  assert.equal(event.mealPaid, false);
  assert.equal(event.active, false);
  assert.equal(event.stage, 'completed');
  assert.equal(calls.finance.length, 0);
  assert.equal(calls.spendMealTime, 0);
  assert.equal(ctx.state.daily.meals.length, 0);
  assert.equal(calls.goMain, 1);
  assert.equal(ctx.mealTransitioning, false);
}

function testFinishIsIdempotentForMealSettlement() {
  const { ctx, calls } = createHarness({ stage: 'eating', mealPaid: true, hungerBefore: 2 });
  assert.equal(ctx.finishEmeraldCaptainKebabMeal(), true);
  assert.equal(ctx.finishEmeraldCaptainKebabMeal(), true);
  const event = ctx.emeraldCaptainKebabEventState();
  assert.equal(calls.spendMealTime, 1);
  assert.equal(ctx.state.wellbeing.hunger, 5);
  assert.equal(ctx.state.wellbeing.mealsEaten, 1);
  assert.equal(ctx.state.daily.meals.length, 1);
  assert.equal(event.mealCompleted, true);
  assert.equal(event.stage, 'farewell');
}

function testFinishRejectsInactiveOrWrongStage() {
  const inactive = createHarness({ active: false, stage: 'eating', mealPaid: true });
  assert.equal(inactive.ctx.finishEmeraldCaptainKebabMeal(), false);
  assert.equal(inactive.calls.spendMealTime, 0);
  const wrong = createHarness({ stage: 'purchase', mealPaid: true });
  assert.equal(wrong.ctx.finishEmeraldCaptainKebabMeal(), false);
  assert.equal(wrong.calls.spendMealTime, 0);
}

for (const test of [
  testSuccessfulPurchaseMealLifecycle,
  testAlreadyPaidMealDoesNotChargeTwice,
  testTransitionGuardPreventsReentry,
  testInsufficientFundsRestoresAndClosesEvent,
  testPreloadFailureRestoresPaymentState,
  testFinishIsIdempotentForMealSettlement,
  testFinishRejectsInactiveOrWrongStage,
]) {
  await test();
  console.log(`PASS ${test.name}`);
}

console.log('EMERALD CAPTAIN KEBAB MEAL REGRESSION: PASS');
