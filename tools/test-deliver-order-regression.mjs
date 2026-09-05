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

const deliverOrderSource = extractFunctionSource('deliverOrder');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createBaseState({ day = 10, status = '完成', purchases = 2 } = {}) {
  return {
    game: { day, minutes: 600, money: 100000 },
    orders: [{
      id: 'o1',
      customerId: 'c1',
      customerName: 'テスト客',
      status,
      jewelryId: 'j1',
      deadlineDay: 12,
      branchNumber: 1,
      price: 20000,
      closedDay: null,
      deliveredDay: null,
    }],
    inventory: {
      jewelry: [{
        id: 'j1',
        name: 'テストリング',
        cost: 8000,
        status: 'stored',
      }],
    },
    store: {
      branchNumber: 1,
      salesCount: 2,
      totalRevenue: 40000,
      totalProfit: 10000,
      deliveredOrderCount: 1,
      branches: [{ number: 1, name: '本店', casesInstalled: 50 }],
    },
    customers: {
      c1: {
        purchases,
        relation: purchases ? 'リピーター' : '初回',
      },
    },
    daily: { income: 0, expense: 0 },
  };
}

function createHarness({
  state = createBaseState(),
  branchOperating = true,
  deliveryOpen = true,
  caseUsed = true,
  caseRemaining = 49,
  completionId = 'j1',
} = {}) {
  const calls = {
    toasts: [],
    expire: [],
    save: 0,
    render: 0,
    moneyFeedback: [],
    storeProgress: [],
    finance: [],
    consumeCase: 0,
    screens: [],
    modals: [],
  };

  const branchByNumber = (number) => (state.store.branches || []).find((branch) => Number(branch.number) === Number(number)) || null;
  const htmlEscape = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  const context = {
    state,
    completionId,
    Number,
    Math,
    storeBranchByNumber: branchByNumber,
    storeBranchOperating: () => branchOperating,
    storeDeliveryOpen: () => deliveryOpen,
    showToast: (message, type = 'info') => calls.toasts.push({ message, type }),
    expireOrder: (order) => {
      calls.expire.push(order.id);
      const item = state.inventory.jewelry.find((entry) => entry.id === order.jewelryId);
      if (item) item.status = 'stored';
      order.status = '期限切れ';
      order.closedDay = state.game.day;
      order.expiredDay = state.game.day;
      order.overduePenaltyApplied = true;
      return true;
    },
    saveGame: () => { calls.save += 1; return Promise.resolve(); },
    render: () => { calls.render += 1; },
    startMoneyFeedback: (amount) => calls.moneyFeedback.push(amount),
    addStoreProgress: (payload) => calls.storeProgress.push(plain(payload)),
    addFinance: (label, income = 0, expense = 0) => {
      calls.finance.push({ label, income, expense });
      state.daily.income += income;
      state.daily.expense += expense;
    },
    consumeStoreCase: () => { calls.consumeCase += 1; return caseUsed; },
    setScreen: (target, data = {}, push = true) => calls.screens.push({ target, data: plain(data), push }),
    showModal: (payload) => calls.modals.push(plain(payload)),
    esc: htmlEscape,
    yen: (value) => `¥${Math.round(Number(value) || 0)}`,
    storeCaseRemaining: () => caseRemaining,
  };

  vm.createContext(context);
  new vm.Script(`"use strict";\n${deliverOrderSource}\nglobalThis.__deliverOrder = deliverOrder;`).runInContext(context);
  return { state, calls, context, deliverOrder: context.__deliverOrder };
}

function testSuccessfulDeliveryProtectsOrderSaleAndAccounting() {
  const state = createBaseState({ purchases: 2 });
  const harness = createHarness({ state });
  harness.deliverOrder('o1');

  const order = state.orders[0];
  const item = state.inventory.jewelry[0];
  const customer = state.customers.c1;

  assert.equal(order.status, '完了');
  assert.equal(order.closedDay, 10);
  assert.equal(order.deliveredDay, 10);
  assert.equal(item.status, 'sold');
  assert.equal(item.removedDay, 10);
  assert.equal(item.soldDay, 10);
  assert.equal(item.soldPrice, 20000);
  assert.equal(item.soldProfit, 12000);
  assert.equal(item.soldBranchNumber, 1);
  assert.equal(item.soldChannel, 'order');

  assert.equal(state.game.money, 120000);
  assert.equal(state.store.salesCount, 3);
  assert.equal(state.store.totalRevenue, 60000);
  assert.equal(state.store.totalProfit, 22000);
  assert.equal(state.store.deliveredOrderCount, 2);
  assert.equal(state.daily.income, 20000);
  assert.equal(state.daily.expense, 0);
  assert.equal(customer.purchases, 3);
  assert.equal(customer.relation, '常連客');

  assert.deepEqual(plain(harness.calls.moneyFeedback), [20000]);
  assert.deepEqual(plain(harness.calls.storeProgress), [{ branchNumber: 1, rating: 1, orderDelivery: true }]);
  assert.deepEqual(plain(harness.calls.finance), [{ label: 'テスト客さんへ注文品を納品', income: 20000, expense: 0 }]);
  assert.equal(harness.calls.consumeCase, 1);
  assert.equal(harness.calls.save, 1);
  assert.equal(harness.calls.render, 1);
  assert.equal(harness.calls.modals.length, 1);
  assert.equal(harness.calls.modals[0].title, 'ありがとうございました！');
  assert.match(harness.calls.modals[0].body, /テストリングをお客様へ納品しました。/);
  assert.match(harness.calls.modals[0].body, /売上：¥20000/);
  assert.match(harness.calls.modals[0].body, /現在の所持金：¥120000/);
  assert.match(harness.calls.modals[0].body, /ケースを1個使用しました。残り49個です。/);
  assert.equal(harness.calls.screens.length, 0);
  assert.equal(harness.calls.toasts.length, 0);
}

function testSecondDeliveryCannotPayTwice() {
  const state = createBaseState();
  const harness = createHarness({ state });
  harness.deliverOrder('o1');
  const afterFirst = plain(state);
  harness.deliverOrder('o1');

  assert.deepEqual(plain(state), afterFirst);
  assert.equal(state.game.money, 120000);
  assert.equal(state.store.salesCount, 3);
  assert.equal(state.store.deliveredOrderCount, 2);
  assert.equal(harness.calls.save, 1);
  assert.equal(harness.calls.consumeCase, 1);
  assert.equal(harness.calls.modals.length, 1);
  assert.deepEqual(plain(harness.calls.toasts), [{ message: '納品できる商品がありません。', type: 'error' }]);
}

function assertGuardNoMutation(harness, expectedMessage) {
  const before = plain(harness.state);
  harness.deliverOrder('o1');
  assert.deepEqual(plain(harness.state), before);
  assert.deepEqual(plain(harness.calls.toasts), [{ message: expectedMessage, type: 'error' }]);
  assert.equal(harness.calls.save, 0);
  assert.equal(harness.calls.render, 0);
  assert.equal(harness.calls.moneyFeedback.length, 0);
  assert.equal(harness.calls.storeProgress.length, 0);
  assert.equal(harness.calls.finance.length, 0);
  assert.equal(harness.calls.consumeCase, 0);
  assert.equal(harness.calls.modals.length, 0);
}

function testDeliveryGuardRails() {
  assertGuardNoMutation(createHarness({ branchOperating: false }), '注文を受けた店舗が休業中のため納品できません。');
  assertGuardNoMutation(createHarness({ deliveryOpen: false }), '注文品を納品できるのは9:00～19:00です。');
  assertGuardNoMutation(createHarness({ state: createBaseState({ status: '完了' }) }), '納品できる商品がありません。');

  const missingItemState = createBaseState();
  missingItemState.inventory.jewelry = [];
  assertGuardNoMutation(createHarness({ state: missingItemState }), '納品できる商品がありません。');
}

function testOverdueDeliveryExpiresWithoutSale() {
  const state = createBaseState({ day: 13 });
  const harness = createHarness({ state });
  harness.deliverOrder('o1');

  const order = state.orders[0];
  assert.equal(order.status, '期限切れ');
  assert.equal(order.closedDay, 13);
  assert.equal(order.expiredDay, 13);
  assert.equal(order.overduePenaltyApplied, true);
  assert.equal(state.inventory.jewelry[0].status, 'stored');
  assert.equal(state.game.money, 100000);
  assert.equal(state.store.salesCount, 2);
  assert.equal(state.store.totalRevenue, 40000);
  assert.equal(state.store.totalProfit, 10000);
  assert.equal(state.store.deliveredOrderCount, 1);
  assert.deepEqual(plain(harness.calls.expire), ['o1']);
  assert.equal(harness.calls.save, 1);
  assert.equal(harness.calls.render, 1);
  assert.deepEqual(plain(harness.calls.toasts), [{ message: '納期を過ぎたため納品できません。', type: 'error' }]);
  assert.equal(harness.calls.moneyFeedback.length, 0);
  assert.equal(harness.calls.storeProgress.length, 0);
  assert.equal(harness.calls.finance.length, 0);
  assert.equal(harness.calls.consumeCase, 0);
  assert.equal(harness.calls.modals.length, 0);
}

function testImmediateCompletionDeliveryBypassesStoreGuardsAndReturnsToOrders() {
  const state = createBaseState({ purchases: 0 });
  const harness = createHarness({ state, branchOperating: false, deliveryOpen: false, completionId: 'j1', caseUsed: false });
  harness.deliverOrder('o1', { immediateFromCompletion: true });

  assert.equal(state.orders[0].status, '完了');
  assert.equal(state.game.money, 120000);
  assert.equal(state.customers.c1.purchases, 1);
  assert.equal(state.customers.c1.relation, 'リピーター');
  assert.equal(harness.context.completionId, null);
  assert.deepEqual(plain(harness.calls.screens), [{ target: 'orders', data: {}, push: false }]);
  assert.equal(harness.calls.save, 1);
  assert.equal(harness.calls.render, 1);
  assert.equal(harness.calls.toasts.length, 0);
  assert.equal(harness.calls.modals.length, 1);
  assert.match(harness.calls.modals[0].body, /ケースなしで納品しました。/);
}

const tests = [
  testSuccessfulDeliveryProtectsOrderSaleAndAccounting,
  testSecondDeliveryCannotPayTwice,
  testDeliveryGuardRails,
  testOverdueDeliveryExpiresWithoutSale,
  testImmediateCompletionDeliveryBypassesStoreGuardsAndReturnsToOrders,
];

for (const test of tests) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('DELIVER ORDER REGRESSION: PASS');
