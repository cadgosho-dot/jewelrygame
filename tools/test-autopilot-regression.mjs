import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const re = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = re.exec(source);
  assert.ok(match, `function ${name} not found`);

  const parenOpen = source.indexOf('(', match.index);
  assert.ok(parenOpen >= 0, `function ${name} parameter list not found`);
  let parenDepth = 0;
  let parenClose = -1;
  for (let i = parenOpen; i < source.length; i += 1) {
    if (source[i] === '(') parenDepth += 1;
    else if (source[i] === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        parenClose = i;
        break;
      }
    }
  }
  assert.ok(parenClose >= 0, `function ${name} parameter list did not close`);

  const bodyOpen = source.indexOf('{', parenClose);
  assert.ok(bodyOpen >= 0, `function ${name} opening brace not found`);
  let braceDepth = 0;
  for (let i = bodyOpen; i < source.length; i += 1) {
    if (source[i] === '{') braceDepth += 1;
    else if (source[i] === '}') {
      braceDepth -= 1;
      if (braceDepth === 0) return source.slice(match.index, i + 1);
    }
  }
  throw new Error(`function ${name} closing brace not found`);
}

function makeContext(extra = {}) {
  return vm.createContext({
    console,
    structuredClone,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    ...extra,
  });
}

function load(ctx, names) {
  for (const name of names) {
    vm.runInContext(`${extractFunction(name)}\nthis.${name} = ${name};`, ctx, { filename: `app.js:${name}` });
  }
}

// Real-date helpers: UTC day arithmetic and year rollover.
{
  const ctx = makeContext({ tokyoRealDateKey: () => '2026-09-06' });
  load(ctx, ['autopilotDateValue', 'autopilotDateDifference', 'addAutopilotDateDays']);
  assert.equal(ctx.autopilotDateDifference('2026-09-01', '2026-09-06'), 5);
  assert.equal(ctx.autopilotDateDifference('2026-09-06', '2026-09-01'), 0);
  assert.equal(ctx.addAutopilotDateDays('2026-09-05', 1), '2026-09-06');
  assert.equal(ctx.addAutopilotDateDays('2026-12-31', 1), '2027-01-01');
}

// Persisted autopilot metadata is normalized conservatively.
{
  const ctx = makeContext({
    state: { autopilot: { lastRealDate: 'bad-date', lastRunAt: 123, totalDays: -7, lastSummary: [] } },
  });
  load(ctx, ['ensureAutopilotState']);
  const result = ctx.ensureAutopilotState();
  assert.equal(result.lastRealDate, '');
  assert.equal(result.lastRunAt, '');
  assert.equal(result.totalDays, 0);
  assert.equal(result.lastSummary, null);
}

// Outstanding-cost payment must leave the living-cash reserve untouched.
{
  const paid = [];
  const ctx = makeContext({
    MIN_LIVING_CASH_RESERVE: 10000,
    state: { game: { money: 25000 } },
    outstandingPaymentTargets: () => [
      { kind: 'workshop', due: 7000, label: '工房維持費' },
      { kind: 'home', due: 12000, label: '自宅家賃' },
    ],
    applyOutstandingPayment: (target, requested, prefix) => {
      const amount = Math.min(target.due, requested);
      paid.push([target.kind, amount, prefix]);
      return amount;
    },
  });
  load(ctx, ['autopilotPayOutstandingCosts']);
  const summary = { expense: 0 };
  ctx.autopilotPayOutstandingCosts(summary);
  assert.equal(ctx.state.game.money, 10000);
  assert.equal(summary.expense, 15000);
  assert.deepEqual(paid, [
    ['workshop', 7000, '自動操縦：'],
    ['home', 8000, '自動操縦：'],
  ]);
}

// Hunger-zero auto meal uses the current Chinese meal and records payment/time/history.
{
  const finance = [];
  const ctx = makeContext({
    state: {
      game: { money: 5000, minutes: 540 },
      wellbeing: { hunger: 0, maxHunger: 7, lastMeal: '', mealsEaten: 0 },
      daily: { meals: [] },
    },
    MEALS: { chinese: { id: 'chinese', name: '中華料理', price: 1000, recovery: 3 } },
    hungerLevel: () => ctx.state.wellbeing.hunger,
    canSpendMealTime: () => true,
    spendMealTime: () => { ctx.state.game.minutes += 60; },
    addFinance: (...args) => finance.push(args),
  });
  load(ctx, ['autopilotEat']);
  const summary = { meals: 0, expense: 0 };
  assert.equal(ctx.autopilotEat(summary), true);
  assert.equal(ctx.state.game.money, 4000);
  assert.equal(ctx.state.game.minutes, 600);
  assert.equal(ctx.state.wellbeing.hunger, 3);
  assert.equal(ctx.state.wellbeing.lastMeal, '中華料理');
  assert.equal(ctx.state.wellbeing.mealsEaten, 1);
  assert.equal(ctx.state.daily.meals.length, 1);
  assert.equal(ctx.state.daily.meals[0].autopilot, true);
  assert.equal(summary.meals, 1);
  assert.equal(summary.expense, 1000);
  assert.equal(finance.length, 1);

  ctx.state.wellbeing.hunger = 1;
  assert.equal(ctx.autopilotEat(summary), true);
  assert.equal(ctx.state.game.money, 4000);
}

// Auto mining keeps the current 40% success branch and progress accounting.
{
  const controlledMath = Object.create(Math);
  controlledMath.random = () => 0.1;
  let unlockCalls = 0;
  const ctx = makeContext({
    Math: controlledMath,
    state: {
      game: { minutes: 540 },
      inventory: { rough: { amethyst: 0 } },
      daily: { mined: [] },
      miningProgress: { successfulFinds: 0 },
      miningMisses: 0,
    },
    availableMiningLocations: () => [{
      id: 'river', hours: 2,
      gems: [{ id: 'amethyst', weight: 100 }, { id: 'diamond', weight: 1 }],
    }],
    canSpendHours: () => true,
    roughSalePrice: (id) => id === 'diamond' ? 1000 : 100,
    autopilotCanSpendHours: () => true,
    spendHours: (hours) => { ctx.state.game.minutes += hours * 60; },
    toolOwned: () => false,
    weightedPick: (pool) => pool[0].id,
    unlockMiningLocationsIfNeeded: () => { unlockCalls += 1; },
  });
  load(ctx, ['autopilotMineOnce']);
  const summary = { minedActions: 0, roughFound: 0 };
  assert.equal(ctx.autopilotMineOnce(summary), true);
  assert.equal(ctx.state.game.minutes, 660);
  assert.equal(ctx.state.inventory.rough.amethyst, 1);
  assert.equal(ctx.state.daily.mined[0].autopilot, true);
  assert.equal(ctx.state.miningProgress.successfulFinds, 1);
  assert.equal(summary.minedActions, 1);
  assert.equal(summary.roughFound, 1);
  assert.equal(unlockCalls, 1);
}

// A single auto day keeps the current top-level priority and 9:00 lower bound.
{
  const calls = [];
  const ctx = makeContext({
    DAY_START_MINUTES: 540,
    DAY_END_MINUTES: 1320,
    OKACHIMACHI_CLOSE_MINUTES: 1080,
    state: {
      game: { minutes: 300, money: 1000 },
      inventory: { jewelry: [] },
      daily: { income: 50, expense: 20 },
    },
    autopilotPayOutstandingCosts: () => calls.push('pay'),
    autopilotDeliverCompletedOrders: () => calls.push('deliver'),
    autopilotRepairTools: () => calls.push('repair'),
    toolOwned: () => false,
    autopilotBuyTool: () => calls.push('buyTool'),
    autopilotFulfillOrders: () => calls.push('fulfill'),
    autopilotPrepareStore: () => calls.push('prepare'),
    autopilotDisplayStoredItems: () => calls.push('display'),
    autopilotWholesaleStoredItems: () => { calls.push('wholesale'); return false; },
    autopilotSellRough: () => { calls.push('sellRough'); return false; },
    canSpendHours: () => false,
    autopilotCraftStock: () => false,
    autopilotMineOnce: () => false,
  });
  load(ctx, ['createAutopilotDaySummary', 'runAutopilotDay']);
  const summary = ctx.runAutopilotDay();
  assert.equal(ctx.state.game.minutes, 540);
  assert.deepEqual(calls, [
    'pay', 'deliver', 'repair', 'buyTool', 'fulfill', 'prepare', 'display',
    'wholesale', 'sellRough', 'display', 'wholesale',
  ]);
  assert.equal(summary.income, 50);
  assert.equal(summary.expense, 20);
}

// Enabling auto mode establishes today's baseline; it must not advance immediately.
{
  let saves = 0;
  let runs = 0;
  const ctx = makeContext({
    state: {
      settings: { autopilotEnabled: true },
      autopilot: { lastRealDate: '', lastRunAt: '', totalDays: 0, lastSummary: null },
      game: { screen: 'main' },
    },
    autopilotRunning: false,
    sleepTransitioning: false,
    sessionTakenOver: false,
    illnessEventSuppressionActive: () => false,
    ensureAutopilotState: () => ctx.state.autopilot,
    tokyoRealDateKey: () => '2026-09-06',
    saveGame: async () => { saves += 1; },
    render: () => {},
    runAutopilotDay: () => { runs += 1; return {}; },
  });
  load(ctx, ['processAutopilotIfDue']);
  const days = await ctx.processAutopilotIfDue({ renderAfter: false, showNotice: false });
  assert.equal(days, 0);
  assert.equal(runs, 0);
  assert.equal(saves, 1);
  assert.equal(ctx.state.autopilot.lastRealDate, '2026-09-06');
  assert.ok(ctx.state.autopilot.lastRunAt);
}

// Catch-up advances exactly one game day per elapsed real day, then saves once and returns main.
{
  let runs = 0;
  let settles = 0;
  let saves = 0;
  let notices = 0;
  const settleArgs = [];
  const emptySummary = () => ({
    minedActions: 0, roughFound: 0, roughSold: 0, polished: 0, crafted: 0,
    displayed: 0, sold: 0, ordersCompleted: 0, toolsPurchased: 0,
    repairsRequested: 0, meals: 0, income: 0, expense: 0, notes: [],
  });
  const ctx = makeContext({
    state: {
      settings: { autopilotEnabled: true },
      autopilot: { lastRealDate: '2026-09-03', lastRunAt: '', totalDays: 5, lastSummary: null },
      game: { day: 20, money: 12345, screen: 'phone' },
    },
    autopilotRunning: false,
    sleepTransitioning: false,
    sessionTakenOver: false,
    illnessEventSuppressionActive: () => false,
    ensureAutopilotState: () => ctx.state.autopilot,
    tokyoRealDateKey: () => '2026-09-06',
    autopilotDateDifference: () => 3,
    createAutopilotDaySummary: emptySummary,
    runAutopilotDay: () => { runs += 1; return { ...emptySummary(), crafted: 1, income: 100, expense: 10 }; },
    mergeAutopilotSummary: (target, source) => {
      target.crafted += source.crafted;
      target.income += source.income;
      target.expense += source.expense;
      return target;
    },
    settleDay: (args) => { settles += 1; settleArgs.push(args); ctx.state.game.day += 1; },
    addAutopilotDateDays: (key) => ({
      '2026-09-03': '2026-09-04',
      '2026-09-04': '2026-09-05',
      '2026-09-05': '2026-09-06',
    }[key] || '2026-09-06'),
    wait: async () => {},
    clearMorningBrief: () => {},
    modalEl: { classList: { add: () => {} }, innerHTML: 'x' },
    autopilotSummaryBody: () => 'summary',
    addNotification: () => { notices += 1; },
    navigation: ['phone'],
    screenData: { tab: 'settings' },
    screen: 'phone',
    saveGame: async () => { saves += 1; },
    render: () => {},
    showToast: () => {},
    maybeResumeMorningSequence: () => {},
  });
  load(ctx, ['processAutopilotIfDue']);
  const days = await ctx.processAutopilotIfDue({ renderAfter: false, showNotice: false });
  assert.equal(days, 3);
  assert.equal(runs, 3);
  assert.equal(settles, 3);
  assert.ok(settleArgs.every((args) => args.showResult === false && args.save === false));
  assert.equal(ctx.state.autopilot.totalDays, 8);
  assert.equal(ctx.state.autopilot.lastRealDate, '2026-09-06');
  assert.equal(ctx.state.autopilot.lastSummary.days, 3);
  assert.equal(ctx.state.autopilot.lastSummary.crafted, 3);
  assert.equal(ctx.state.game.screen, 'main');
  assert.equal(saves, 1);
  assert.equal(notices, 1);
  assert.equal(ctx.autopilotRunning, false);
}

console.log('AUTOPILOT REGRESSION: PASS');
