import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

function extractFunctionSource(name) {
  const lines = appSource.split(/\r?\n/);
  const pattern = new RegExp(`^\\s*function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`);
  for (let start = 0; start < lines.length; start += 1) {
    if (!pattern.test(lines[start])) continue;
    let depth = 0;
    let seen = false;
    for (let end = start; end < lines.length; end += 1) {
      const line = lines[end];
      depth += (line.match(/\{/g) || []).length;
      depth -= (line.match(/\}/g) || []).length;
      if (line.includes('{')) seen = true;
      if (seen && depth <= 0) return lines.slice(start, end + 1).join('\n');
    }
  }
  throw new Error(`${name} definition was not found`);
}

const settleDaySource = extractFunctionSource('settleDay');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createBaseState() {
  return {
    game: { day: 12, minutes: 1320, weather: '晴', money: 100000 },
    store: {
      expanded: false,
      totalVisitors: 8,
      salesCount: 0,
      totalRevenue: 0,
      totalProfit: 0,
      branches: [],
      lastResult: null,
    },
    inventory: {
      jewelry: [],
      loose: { ruby: { round: 2 } },
    },
    daily: {
      mined: [{ id: 'rough-ruby', count: 2 }],
      polished: [{ id: 'ruby', count: 1 }],
      roughSold: [{ id: 'rough-quartz', count: 1, price: 100 }],
      looseSold: [{ id: 'amethyst', count: 1, price: 200 }],
      crafted: [{ id: 'crafted-1', name: 'テストリング' }],
      workshopStaffCrafted: [],
      sold: [{ itemId: 'old-sale', name: '既存販売', price: 300, caseUsed: false }],
      meals: [{ id: 'meal-1', name: '昼食' }],
      visitors: 2,
      income: 1234,
      expense: 567,
    },
    wellbeing: { hunger: 2 },
    customers: {
      customerA: {
        met: true,
        visiting: true,
        visitingBranchNumber: 1,
        activeRequest: { item: 'ring' },
        ignoredToday: true,
        wishesHeard: true,
        proposedItemIds: ['j1'],
      },
    },
  };
}

function createHarness({
  state = createBaseState(),
  illness = false,
  alienAbducted = false,
  nextWeatherValue = '雨',
  randomSequence = [],
  mutateLooseDuringSchedule = false,
  caseRemaining = 0,
} = {}) {
  const calls = {
    birthdaySuppressed: 0,
    random: 0,
    removeJewelry: [],
    storeProgress: [],
    finance: [],
    notifications: [],
    consumeCase: 0,
    winterSleep: [],
    fishMortality: 0,
    plantMortality: 0,
    alienSleep: 0,
    completedRepairs: 0,
    monthlyCosts: 0,
    homeRent: 0,
    expiredOrders: 0,
    robbery: 0,
    resetWorkshopStaff: 0,
    scheduleCustomerVisit: 0,
    updateOrderNotifications: 0,
    restoreLoose: [],
    morningTransition: [],
    hospitalSleepCheck: 0,
    screens: [],
    saveAfterPaint: 0,
    save: 0,
  };

  let randomIndex = 0;
  const mathStub = Object.create(Math);
  mathStub.random = () => {
    calls.random += 1;
    const value = randomSequence[randomIndex];
    randomIndex += 1;
    return value == null ? 0.99 : value;
  };

  const firstBranch = () => (state.store.branches || [])[0] || null;
  const context = {
    state,
    pendingDayMoneyDelta: 0,
    DAY_START_MINUTES: 540,
    Math: mathStub,
    Promise,
    structuredClone: globalThis.structuredClone,
    console,
    looseInventorySnapshot: () => structuredClone(state.inventory.loose || {}),
    illnessEventSuppressionActive: () => illness,
    suppressBirthdaySleepEventForIllness: () => { calls.birthdaySuppressed += 1; return true; },
    contractedStoreBranches: () => state.store.branches || [],
    storeBranchOperating: (branch) => Boolean(branch && branch.operating !== false && !branch.suspended),
    storeEmployeeAvailable: () => false,
    activeStoreStaff: () => null,
    storeStaffVisitorBonus: () => 0,
    branchShowcases: (branch) => branch?.showcases || [],
    showcaseSellingPrice: (slot, item) => Number(slot?.sellingPrice || item?.recommendedPrice || 1000),
    clamp: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0)),
    storeStaffSaleBonus: () => 0,
    pearlHumanEffectActive: () => false,
    removeJewelry: (itemId, saleMeta = {}) => {
      calls.removeJewelry.push({ itemId, saleMeta: plain(saleMeta) });
      for (const branch of state.store.branches || []) {
        for (const showcase of branch.showcases || []) {
          showcase.slots = (showcase.slots || []).map((slot) => slot?.jewelryId === itemId ? null : slot);
        }
      }
      const item = (state.inventory.jewelry || []).find((entry) => entry.id === itemId);
      if (item) {
        item.status = 'sold';
        item.soldPrice = Number(saleMeta.price) || 0;
        item.soldBranchNumber = Number(saleMeta.branchNumber) || 1;
        item.soldChannel = saleMeta.channel || '';
      }
    },
    addStoreProgress: (payload) => calls.storeProgress.push(plain(payload)),
    addFinance: (label, income = 0, expense = 0) => {
      calls.finance.push({ label, income, expense });
      state.daily.income += income;
      state.daily.expense += expense;
    },
    storeBranchLabel: (number) => `第${number}店舗`,
    addNotification: (title, body, type = 'info') => calls.notifications.push({ title, body, type }),
    yen: (value) => `¥${Math.round(Number(value) || 0)}`,
    consumeStoreCase: () => { calls.consumeCase += 1; return true; },
    storeBranchEmployee: () => null,
    storeStaffDefinition: () => ({ dailyWage: 5000, level: 1, label: '見習い' }),
    payFixedCost: () => ({ paid: 0, unpaid: 0 }),
    storeBranchDisplayName: (branch) => branch?.name || `第${branch?.number || 1}店舗`,
    settleWorkshopStaffDay: () => ({ worked: false, crafted: 0, items: [] }),
    storeCaseRemaining: () => caseRemaining,
    salesStoreBranch: () => firstBranch(),
    currentStoreBranch: () => firstBranch(),
    progressWinterColdSleep: (options) => calls.winterSleep.push(plain(options)),
    processAquariumFishMortality: () => { calls.fishMortality += 1; return []; },
    processAquariumPlantMortality: () => { calls.plantMortality += 1; return []; },
    progressAlienAbductionSleep: () => { calls.alienSleep += 1; },
    nextWeather: () => nextWeatherValue,
    gameDate: () => new Date(2026, 0, state.game.day, 12, 0, 0, 0),
    processCompletedWorkshopRepairs: () => { calls.completedRepairs += 1; return []; },
    processMonthlyFixedCosts: () => { calls.monthlyCosts += 1; return null; },
    processHomeRent: () => { calls.homeRent += 1; return null; },
    processExpiredOrders: () => { calls.expiredOrders += 1; },
    isAlienAbducted: () => alienAbducted,
    maybeTriggerRobberyEvent: () => { calls.robbery += 1; },
    resetWorkshopStaffDaily: () => { calls.resetWorkshopStaff += 1; },
    scheduleCustomerVisit: () => {
      calls.scheduleCustomerVisit += 1;
      if (mutateLooseDuringSchedule) state.inventory.loose.ruby.round = 999;
    },
    updateOrderNotifications: () => { calls.updateOrderNotifications += 1; },
    restoreLooseInventory: (before, label = '') => {
      const restored = JSON.stringify(before) !== JSON.stringify(state.inventory.loose);
      calls.restoreLoose.push({ label, restored });
      if (restored) state.inventory.loose = structuredClone(before || {});
      return restored;
    },
    markMorningTransitionPending: () => {
      calls.morningTransition.push(state.game.day);
      return { phase: 'morningPending', toDay: state.game.day };
    },
    markHospitalSleepCheckForMorning: () => { calls.hospitalSleepCheck += 1; return {}; },
    setScreen: (target, data = {}, push = true) => calls.screens.push({ target, data: plain(data), push }),
    saveGameAfterPaint: () => { calls.saveAfterPaint += 1; return Promise.resolve('after-paint'); },
    saveGame: () => { calls.save += 1; return Promise.resolve('save'); },
  };

  vm.createContext(context);
  new vm.Script(`"use strict";\n${settleDaySource}\nglobalThis.__settleDay = settleDay;`).runInContext(context);
  return { state, calls, context, settleDay: context.__settleDay };
}

async function testBasicRolloverAndGuards() {
  const harness = createHarness({ nextWeatherValue: '雪', mutateLooseDuringSchedule: true });
  const beforeDaily = plain(harness.state.daily);
  const result = await harness.settleDay({ showResult: false, save: false, hospitalCheck: true });

  assert.equal(result, undefined);
  assert.equal(harness.state.store.lastResult.day, 12);
  assert.deepEqual(plain(harness.state.store.lastResult.mined), beforeDaily.mined);
  assert.deepEqual(plain(harness.state.store.lastResult.polished), beforeDaily.polished);
  assert.deepEqual(plain(harness.state.store.lastResult.roughSold), beforeDaily.roughSold);
  assert.deepEqual(plain(harness.state.store.lastResult.looseSold), beforeDaily.looseSold);
  assert.deepEqual(plain(harness.state.store.lastResult.crafted), beforeDaily.crafted);
  assert.deepEqual(plain(harness.state.store.lastResult.sold), beforeDaily.sold);
  assert.deepEqual(plain(harness.state.store.lastResult.meals), beforeDaily.meals);
  assert.equal(harness.state.store.lastResult.income, 1234);
  assert.equal(harness.state.store.lastResult.expense, 567);

  assert.equal(harness.state.game.day, 13);
  assert.equal(harness.state.game.minutes, 540);
  assert.equal(harness.state.game.weather, '雪');
  assert.equal(harness.state.wellbeing.hunger, 7);
  assert.equal(harness.context.pendingDayMoneyDelta, 0);

  assert.deepEqual(plain(harness.state.daily), {
    mined: [], polished: [], roughSold: [], looseSold: [], crafted: [], workshopStaffCrafted: [], sold: [], meals: [], visitors: 0, income: 0, expense: 0,
  });
  assert.deepEqual(plain(harness.state.customers.customerA), {
    met: true,
    visiting: false,
    visitingBranchNumber: null,
    activeRequest: null,
    ignoredToday: false,
    wishesHeard: false,
    proposedItemIds: [],
  });

  assert.equal(harness.calls.fishMortality, 1);
  assert.equal(harness.calls.plantMortality, 1);
  assert.equal(harness.calls.alienSleep, 1);
  assert.equal(harness.calls.completedRepairs, 1);
  assert.equal(harness.calls.monthlyCosts, 1);
  assert.equal(harness.calls.homeRent, 1);
  assert.equal(harness.calls.expiredOrders, 1);
  assert.equal(harness.calls.robbery, 1);
  assert.equal(harness.calls.resetWorkshopStaff, 1);
  assert.equal(harness.calls.scheduleCustomerVisit, 1);
  assert.equal(harness.calls.updateOrderNotifications, 1);
  assert.deepEqual(plain(harness.calls.winterSleep), [{ showResult: false }]);
  assert.deepEqual(plain(harness.calls.restoreLoose), [{ label: 'settleDay', restored: true }]);
  assert.equal(harness.state.inventory.loose.ruby.round, 2);
  assert.deepEqual(harness.calls.morningTransition, [13]);
  assert.equal(harness.calls.hospitalSleepCheck, 1);
  assert.equal(harness.calls.screens.length, 0);
  assert.equal(harness.calls.saveAfterPaint, 0);
  assert.equal(harness.calls.save, 0);
}

async function testDeterministicShowcaseSale() {
  const state = createBaseState();
  state.daily.sold = [];
  state.daily.income = 0;
  state.daily.expense = 0;
  state.inventory.jewelry = [{ id: 'j1', name: 'テストリング', cost: 500, recommendedPrice: 1400, status: 'available' }];
  state.store.branches = [{
    number: 1,
    name: '本店',
    operating: true,
    suspended: false,
    openMinutesToday: 300,
    visitorsToday: 0,
    operatingDays: 2,
    showcases: [{ slots: [{ jewelryId: 'j1', sellingPrice: 1500 }] }],
  }];

  const harness = createHarness({ state, randomSequence: [0.99, 0], caseRemaining: 49 });
  await harness.settleDay({ showResult: false, save: false });

  assert.equal(harness.calls.random, 2);
  assert.equal(harness.state.game.money, 101500);
  assert.equal(harness.context.pendingDayMoneyDelta, 1500);
  assert.equal(harness.state.store.salesCount, 1);
  assert.equal(harness.state.store.totalRevenue, 1500);
  assert.equal(harness.state.store.totalProfit, 1000);
  assert.equal(harness.state.store.totalVisitors, 11);
  assert.equal(state.store.branches[0].operatingDays, 3);
  assert.equal(state.store.branches[0].openMinutesToday, 0);
  assert.equal(state.store.branches[0].visitorsToday, 0);
  assert.equal(state.inventory.jewelry[0].status, 'sold');

  const dayResult = harness.state.store.lastResult;
  assert.equal(dayResult.visitors, 3);
  assert.deepEqual(plain(dayResult.branchResults), [{ branchNumber: 1, visitors: 3, openMinutes: 300 }]);
  assert.equal(dayResult.sold.length, 1);
  assert.equal(dayResult.sold[0].itemId, 'j1');
  assert.equal(dayResult.sold[0].price, 1500);
  assert.equal(dayResult.sold[0].profit, 1000);
  assert.equal(dayResult.sold[0].caseUsed, true);
  assert.equal(dayResult.casesUsed, 1);
  assert.equal(dayResult.casesRemaining, 49);
  assert.equal(dayResult.income, 1500);
  assert.equal(dayResult.expense, 0);
  assert.equal(harness.calls.removeJewelry.length, 1);
  assert.equal(harness.calls.storeProgress.length, 1);
  assert.equal(harness.calls.finance.length, 1);
  assert.equal(harness.calls.consumeCase, 1);
  assert.equal(harness.calls.notifications.some((note) => note.title === '商品が売れました'), true);
}

async function testIllnessSuppressesStoreSettlementAndRobbery() {
  const state = createBaseState();
  state.inventory.jewelry = [{ id: 'j1', name: '病気中販売禁止確認', cost: 500, recommendedPrice: 1500, status: 'available' }];
  state.store.branches = [{
    number: 1,
    operating: true,
    suspended: false,
    openMinutesToday: 300,
    visitorsToday: 2,
    operatingDays: 5,
    showcases: [{ slots: [{ jewelryId: 'j1', sellingPrice: 1500 }] }],
  }];

  const harness = createHarness({ state, illness: true, randomSequence: [0, 0] });
  await harness.settleDay({ showResult: false, save: false });

  assert.equal(harness.calls.birthdaySuppressed, 1);
  assert.equal(harness.calls.random, 0);
  assert.equal(harness.calls.removeJewelry.length, 0);
  assert.equal(harness.state.game.money, 100000);
  assert.equal(harness.context.pendingDayMoneyDelta, 0);
  assert.equal(harness.state.store.totalVisitors, 8);
  assert.equal(harness.state.inventory.jewelry[0].status, 'available');
  assert.equal(harness.calls.robbery, 0);
  assert.equal(state.store.branches[0].openMinutesToday, 0);
  assert.equal(state.store.branches[0].visitorsToday, 0);
}

async function testSaveAndResultRouting() {
  const withResult = createHarness();
  const resultA = await withResult.settleDay({ showResult: true, save: true });
  assert.equal(resultA, 'after-paint');
  assert.deepEqual(plain(withResult.calls.screens), [{ target: 'dayResult', data: {}, push: false }]);
  assert.equal(withResult.calls.saveAfterPaint, 1);
  assert.equal(withResult.calls.save, 0);

  const withoutResult = createHarness();
  const resultB = await withoutResult.settleDay({ showResult: false, save: true });
  assert.equal(resultB, 'save');
  assert.equal(withoutResult.calls.screens.length, 0);
  assert.equal(withoutResult.calls.saveAfterPaint, 0);
  assert.equal(withoutResult.calls.save, 1);
}

await testBasicRolloverAndGuards();
await testDeterministicShowcaseSale();
await testIllnessSuppressesStoreSettlementAndRobbery();
await testSaveAndResultRouting();
console.log('SETTLE DAY REGRESSION: PASS');
