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

const confirmOrderSource = extractFunctionSource('confirmOrder');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createBaseState() {
  return {
    game: { day: 20, minutes: 600, money: 100000 },
    store: { branchNumber: 2 },
    orders: [],
    customers: {
      c1: {
        met: false,
        visiting: true,
        visitingBranchNumber: 2,
        activeRequest: {
          item: 'ring', gem: 'garnet', looseShape: 'round', metal: 'silver', design: 'simple',
        },
        lastVisitDay: 0,
        wishesHeard: true,
        proposedItemIds: ['j1'],
      },
    },
  };
}

function createHarness({
  state = createBaseState(),
  activeOrders = 0,
  limit = 3,
  canSpend = true,
  feasibility = {
    possible: true,
    difficulty: { id: 'basic', days: 7 },
    requiredArtisanLevel: 1,
    requiredTools: ['jewelryBench'],
  },
} = {}) {
  const calls = {
    closeModal: 0,
    toasts: [],
    spendMinutes: [],
    notifications: [],
    save: 0,
    screens: [],
  };

  const request = state.customers?.c1?.activeRequest || {
    item: 'ring', gem: 'garnet', looseShape: 'round', metal: 'silver', design: 'simple',
  };

  const context = {
    state,
    CUSTOMERS: { c1: { name: 'テスト客' } },
    ITEMS: { ring: { metalWeight: 3, looseQuantity: 1 } },
    Number,
    Math,
    closeModal: () => { calls.closeModal += 1; },
    orderLimit: () => limit,
    activeOrderCount: () => activeOrders,
    showToast: (message, type = 'info') => calls.toasts.push({ message, type }),
    canSpendStoreMinutes: () => canSpend,
    activeCustomerRequest: () => request,
    orderFeasibility: () => plain(feasibility),
    orderEstimatedFigures: () => ({ budget: 50000, price: 42000, estimatedCost: 18000, estimatedProfit: 24000 }),
    customerProfileData: () => ({
      summary: 'テスト客プロフィール',
      traits: ['丁寧', '品質重視'],
      ageGroup: '30代', occupation: '会社員', purpose: '記念', wearer: '本人',
      preference: '長く使いやすいもの', budgetStyle: '品質重視',
    }),
    customerProfileDetailsSnapshot: (profile) => ({
      ageGroup: profile.ageGroup || '', occupation: profile.occupation || '', purpose: profile.purpose || '',
      wearer: profile.wearer || '', preference: profile.preference || '', budgetStyle: profile.budgetStyle || '',
    }),
    uid: () => 'order-test-1',
    normalizeLooseShape: (_gem, shape) => shape || 'round',
    customerRequestDescription: () => 'テスト注文条件',
    spendMinutes: (minutes) => { calls.spendMinutes.push(minutes); state.game.minutes += minutes; },
    addNotification: (title, body, type = 'info') => calls.notifications.push({ title, body, type }),
    gameDateLabel: (day) => `Day ${day}`,
    saveGame: () => { calls.save += 1; return Promise.resolve(); },
    setScreen: (target, data = {}, push = true) => calls.screens.push({ target, data: plain(data), push }),
  };

  vm.createContext(context);
  new vm.Script(`"use strict";\n${confirmOrderSource}\nglobalThis.__confirmOrder = confirmOrder;`).runInContext(context);
  return { state, calls, confirmOrder: context.__confirmOrder };
}

function testSuccessfulOrderAcceptance() {
  const state = createBaseState();
  const harness = createHarness({ state });
  harness.confirmOrder('c1');

  assert.equal(state.orders.length, 1);
  const order = state.orders[0];
  assert.equal(order.id, 'order-test-1');
  assert.equal(order.customerId, 'c1');
  assert.equal(order.customerName, 'テスト客');
  assert.equal(order.customerProfile, 'テスト客プロフィール');
  assert.deepEqual(plain(order.customerTraits), ['丁寧', '品質重視']);
  assert.equal(order.item, 'ring');
  assert.equal(order.gem, 'garnet');
  assert.equal(order.looseShape, 'round');
  assert.equal(order.metal, 'silver');
  assert.equal(order.design, 'simple');
  assert.equal(order.difficulty, 'basic');
  assert.equal(order.requiredArtisanLevel, 1);
  assert.deepEqual(plain(order.requiredTools), ['jewelryBench']);
  assert.equal(order.budget, 50000);
  assert.equal(order.price, 42000);
  assert.equal(order.estimatedCost, 18000);
  assert.equal(order.estimatedProfit, 24000);
  assert.equal(order.desiredConditions, 'テスト注文条件');
  assert.equal(order.requiredMetalWeight, 3);
  assert.equal(order.requiredLooseQuantity, 1);
  assert.equal(order.acceptedDay, 20);
  assert.equal(order.deadlineDay, 27);
  assert.equal(order.branchNumber, 2);
  assert.equal(order.overduePenaltyApplied, false);
  assert.equal(order.status, '受注');
  assert.equal(order.jewelryId, null);

  assert.equal(state.game.minutes, 630);
  const customer = state.customers.c1;
  assert.equal(customer.met, true);
  assert.equal(customer.visiting, false);
  assert.equal(customer.visitingBranchNumber, null);
  assert.equal(customer.activeRequest, null);
  assert.equal(customer.lastVisitDay, 20);
  assert.equal(customer.wishesHeard, false);
  assert.deepEqual(plain(customer.proposedItemIds), []);

  assert.deepEqual(plain(harness.calls.spendMinutes), [30]);
  assert.equal(harness.calls.notifications.length, 1);
  assert.equal(harness.calls.notifications[0].title, '注文を受けました');
  assert.match(harness.calls.notifications[0].body, /テスト客さんの注文はDay 27が納期です。/);
  assert.equal(harness.calls.closeModal, 1);
  assert.equal(harness.calls.save, 1);
  assert.deepEqual(plain(harness.calls.toasts), [{ message: '注文を受けました。', type: 'info' }]);
  assert.deepEqual(plain(harness.calls.screens), [{ target: 'orders', data: {}, push: false }]);
}

function assertGuardNoMutation(harness, expectedToast = null, expectedClose = 0) {
  const before = plain(harness.state);
  harness.confirmOrder('c1');
  assert.deepEqual(plain(harness.state), before);
  if (expectedToast) assert.deepEqual(plain(harness.calls.toasts), [expectedToast]);
  else assert.equal(harness.calls.toasts.length, 0);
  assert.equal(harness.calls.closeModal, expectedClose);
  assert.equal(harness.calls.spendMinutes.length, 0);
  assert.equal(harness.calls.notifications.length, 0);
  assert.equal(harness.calls.save, 0);
  assert.equal(harness.calls.screens.length, 0);
}

function testInvalidCustomerStateClosesModalOnly() {
  const state = createBaseState();
  state.customers.c1.wishesHeard = false;
  assertGuardNoMutation(createHarness({ state }), null, 1);
}

function testOrderLimitGuard() {
  assertGuardNoMutation(createHarness({ activeOrders: 3, limit: 3 }), {
    message: '同時に受けられる注文は3件までです。', type: 'error',
  });
}

function testStoreTimeGuard() {
  assertGuardNoMutation(createHarness({ canSpend: false }), {
    message: '店舗営業時間内に注文相談を完了できません。', type: 'error',
  });
}

function testFeasibilityGuard() {
  assertGuardNoMutation(createHarness({ feasibility: {
    possible: false,
    difficulty: { id: 'basic', days: 7 },
    requiredArtisanLevel: 1,
    requiredTools: ['jewelryBench'],
  } }), {
    message: '現在はこの注文を製作できません。', type: 'error',
  });
}

testSuccessfulOrderAcceptance();
testInvalidCustomerStateClosesModalOnly();
testOrderLimitGuard();
testStoreTimeGuard();
testFeasibilityGuard();

console.log('CONFIRM ORDER REGRESSION: PASS');
console.log('confirmOrder() の受注生成・納期・顧客状態・時間消費・通知・保存・主要ガードを固定しました。');
