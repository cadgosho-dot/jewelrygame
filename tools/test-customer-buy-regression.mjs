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

const customerBuySource = extractFunctionSource('customerBuy');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createBaseState({ purchases = 0, proposedItemIds = [], wishesHeard = true } = {}) {
  return {
    playerName: '店主',
    game: { day: 20, minutes: 600, money: 100000 },
    wellbeing: { hunger: 7 },
    store: {
      rented: true,
      branchNumber: 1,
      salesCount: 4,
      totalRevenue: 12000,
      totalProfit: 5000,
      branches: [{
        number: 1,
        name: '本店',
        casesInstalled: 50,
        showcases: [{ slots: [{ jewelryId: 'j1', sellingPrice: 1500 }] }],
      }],
    },
    inventory: {
      jewelry: [{ id: 'j1', name: 'テストリング', cost: 500, recommendedPrice: 1400, status: 'displayed' }],
    },
    customers: {
      c1: {
        met: false,
        visiting: true,
        visitingBranchNumber: 1,
        activeRequest: { item: 'ring', budget: 2000 },
        wishesHeard,
        proposedItemIds: [...proposedItemIds],
        lastVisitDay: 0,
        purchases,
        relation: purchases ? 'リピーター' : '初回',
      },
    },
    daily: { income: 0, expense: 0 },
  };
}

function createHarness({
  state = createBaseState(),
  canServe = true,
  canSpend = true,
  storeOpenAfterProposal = true,
  match = { price: 1500, chance: 0.9, label: 'かなり売れやすい' },
  randomValue = 0.1,
  caseUsed = true,
  caseRemaining = 49,
  screenValue = 'customer',
} = {}) {
  const calls = {
    toasts: [],
    match: [],
    spendMinutes: [],
    removeJewelry: [],
    moneyFeedback: [],
    storeProgress: [],
    finance: [],
    notifications: [],
    consumeCase: 0,
    modals: [],
    save: 0,
    render: 0,
    timeouts: [],
    screens: [],
  };

  const mathStub = Object.create(Math);
  mathStub.random = () => randomValue;
  const branchByNumber = (number) => (state.store.branches || []).find((branch) => Number(branch.number) === Number(number)) || null;
  const htmlEscape = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  const context = {
    state,
    CUSTOMERS: { c1: { name: 'テスト客' } },
    Math: mathStub,
    Number,
    Array,
    screen: screenValue,
    canServeCustomers: () => canServe,
    showToast: (message, type = 'info') => calls.toasts.push({ message, type }),
    storeBranchByNumber: branchByNumber,
    showcaseSlotForJewelry: (itemId, branch) => {
      for (const showcase of branch?.showcases || []) {
        const slot = (showcase.slots || []).find((row) => row?.jewelryId === itemId);
        if (slot) return slot;
      }
      return null;
    },
    customerProposalMinutes: () => 60,
    canSpendStoreMinutes: () => canSpend,
    activeCustomerRequest: (customerId) => state.customers[customerId]?.activeRequest || {},
    customerMatchResult: (item, request, branchNumber) => {
      calls.match.push({ itemId: item?.id, request: plain(request), branchNumber });
      return { ...match };
    },
    spendMinutes: (minutes) => {
      calls.spendMinutes.push(minutes);
      state.game.minutes += minutes;
      state.wellbeing.hunger = Math.max(0, state.wellbeing.hunger - Math.floor(minutes / 60));
    },
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
        item.soldChannel = String(saleMeta.channel || '');
      }
    },
    startMoneyFeedback: (amount) => calls.moneyFeedback.push(amount),
    addStoreProgress: (payload) => calls.storeProgress.push(plain(payload)),
    addFinance: (label, income = 0, expense = 0) => {
      calls.finance.push({ label, income, expense });
      state.daily.income += income;
      state.daily.expense += expense;
    },
    addNotification: (title, body, type = 'info') => calls.notifications.push({ title, body, type }),
    storeBranchLabel: (number) => `第${number}店舗`,
    yen: (value) => `¥${Math.round(Number(value) || 0)}`,
    consumeStoreCase: () => { calls.consumeCase += 1; return caseUsed; },
    esc: htmlEscape,
    storeCaseRemaining: () => caseRemaining,
    showModal: (payload) => calls.modals.push(plain(payload)),
    saveGame: () => { calls.save += 1; return Promise.resolve(); },
    setTimeout: (fn, delay) => { calls.timeouts.push(delay); fn(); return 1; },
    setScreen: (target, data = {}, push = true) => calls.screens.push({ target, data: plain(data), push }),
    storeBusinessOpen: () => storeOpenAfterProposal,
    render: () => { calls.render += 1; },
  };

  vm.createContext(context);
  new vm.Script(`"use strict";\n${customerBuySource}\nglobalThis.__customerBuy = customerBuy;`).runInContext(context);
  return { state, calls, context, customerBuy: context.__customerBuy };
}

function testSuccessfulPurchaseProtectsMoneyInventoryAndCustomerState() {
  const state = createBaseState({ purchases: 2 });
  const harness = createHarness({ state, randomValue: 0.1, match: { price: 1500, chance: 0.9, label: 'かなり売れやすい' } });
  harness.customerBuy('c1', 'j1');

  const customer = state.customers.c1;
  const item = state.inventory.jewelry[0];
  assert.equal(state.game.money, 101500);
  assert.equal(state.game.minutes, 660);
  assert.equal(state.wellbeing.hunger, 6);
  assert.equal(item.status, 'sold');
  assert.equal(item.soldPrice, 1500);
  assert.equal(item.soldBranchNumber, 1);
  assert.equal(item.soldChannel, 'customer');
  assert.equal(state.store.branches[0].showcases[0].slots[0], null);
  assert.equal(state.store.salesCount, 5);
  assert.equal(state.store.totalRevenue, 13500);
  assert.equal(state.store.totalProfit, 6000);
  assert.equal(state.daily.income, 1500);
  assert.equal(state.daily.expense, 0);

  assert.equal(customer.met, true);
  assert.equal(customer.lastVisitDay, 20);
  assert.equal(customer.visiting, false);
  assert.equal(customer.visitingBranchNumber, null);
  assert.equal(customer.activeRequest, null);
  assert.equal(customer.wishesHeard, false);
  assert.deepEqual(plain(customer.proposedItemIds), []);
  assert.equal(customer.purchases, 3);
  assert.equal(customer.relation, '常連客');

  assert.deepEqual(plain(harness.calls.match), [{ itemId: 'j1', request: { item: 'ring', budget: 2000 }, branchNumber: 1 }]);
  assert.deepEqual(plain(harness.calls.spendMinutes), [60]);
  assert.deepEqual(plain(harness.calls.removeJewelry), [{ itemId: 'j1', saleMeta: { price: 1500, branchNumber: 1, channel: 'customer' } }]);
  assert.deepEqual(plain(harness.calls.moneyFeedback), [1500]);
  assert.deepEqual(plain(harness.calls.storeProgress), [{ branchNumber: 1, rating: 0, sale: true, revenue: 1500, serviceSuccess: true }]);
  assert.deepEqual(plain(harness.calls.finance), [{ label: 'テスト客さんへ販売', income: 1500, expense: 0 }]);
  assert.equal(harness.calls.notifications.length, 1);
  assert.equal(harness.calls.notifications[0].title, '商品が売れました');
  assert.match(harness.calls.notifications[0].body, /第1店舗でテストリングが¥1500で売れました。/);
  assert.equal(harness.calls.notifications[0].type, 'sale');
  assert.equal(harness.calls.consumeCase, 1);
  assert.equal(harness.calls.modals.length, 1);
  assert.equal(harness.calls.modals[0].title, '商品を購入していただきました。');
  assert.match(harness.calls.modals[0].body, /店主さんのご提案を気に入っていただけました。/);
  assert.match(harness.calls.modals[0].body, /テストリング/);
  assert.match(harness.calls.modals[0].body, /売上：¥1500/);
  assert.match(harness.calls.modals[0].body, /ケースを1個使用しました。残り49個です。/);
  assert.equal(harness.calls.save, 1);
  assert.deepEqual(plain(harness.calls.timeouts), [50]);
  assert.deepEqual(plain(harness.calls.screens), [{ target: 'store', data: { branchId: 'branch-1' }, push: false }]);
  assert.equal(harness.calls.render, 0);
  assert.equal(harness.calls.toasts.length, 0);
}

function testNoPurchaseKeepsMoneyAndInventoryAndAllowsSecondProposal() {
  const state = createBaseState();
  const harness = createHarness({ state, randomValue: 0.9, match: { price: 1500, chance: 0.5, label: '購入の可能性あり' }, storeOpenAfterProposal: true });
  harness.customerBuy('c1', 'j1');

  const customer = state.customers.c1;
  const item = state.inventory.jewelry[0];
  assert.equal(state.game.money, 100000);
  assert.equal(item.status, 'displayed');
  assert.equal(state.store.branches[0].showcases[0].slots[0].jewelryId, 'j1');
  assert.equal(state.store.salesCount, 4);
  assert.equal(state.store.totalRevenue, 12000);
  assert.equal(state.store.totalProfit, 5000);
  assert.equal(state.daily.income, 0);
  assert.equal(customer.visiting, true);
  assert.equal(customer.visitingBranchNumber, 1);
  assert.deepEqual(plain(customer.activeRequest), { item: 'ring', budget: 2000 });
  assert.equal(customer.wishesHeard, true);
  assert.deepEqual(plain(customer.proposedItemIds), ['j1']);
  assert.equal(customer.met, true);
  assert.equal(customer.lastVisitDay, 20);
  assert.equal(customer.purchases, 0);
  assert.deepEqual(plain(harness.calls.spendMinutes), [60]);
  assert.equal(harness.calls.removeJewelry.length, 0);
  assert.equal(harness.calls.moneyFeedback.length, 0);
  assert.equal(harness.calls.storeProgress.length, 0);
  assert.equal(harness.calls.finance.length, 0);
  assert.equal(harness.calls.notifications.length, 0);
  assert.equal(harness.calls.consumeCase, 0);
  assert.equal(harness.calls.save, 1);
  assert.equal(harness.calls.render, 1);
  assert.equal(harness.calls.modals.length, 1);
  assert.equal(harness.calls.modals[0].title, '今回は購入されませんでした。');
  assert.match(harness.calls.modals[0].body, /別の商品をあと1点提案するか/);
  assert.equal(harness.calls.timeouts.length, 0);
  assert.equal(harness.calls.screens.length, 0);
}

function testSecondFailedProposalAndClosingRoute() {
  const state = createBaseState({ proposedItemIds: ['j0'] });
  const harness = createHarness({ state, randomValue: 0.9, match: { price: 1500, chance: 0.5, label: '購入の可能性あり' }, storeOpenAfterProposal: false });
  harness.customerBuy('c1', 'j1');

  assert.deepEqual(plain(state.customers.c1.proposedItemIds), ['j0', 'j1']);
  assert.equal(state.game.money, 100000);
  assert.equal(state.inventory.jewelry[0].status, 'displayed');
  assert.equal(harness.calls.save, 1);
  assert.equal(harness.calls.render, 1);
  assert.equal(harness.calls.modals.length, 1);
  assert.match(harness.calls.modals[0].body, /19:00になったため、本日の接客は終了しました。/);
  assert.deepEqual(plain(harness.calls.timeouts), [50]);
  assert.deepEqual(plain(harness.calls.screens), [{ target: 'store', data: { branchId: 'branch-1' }, push: false }]);
}

function assertGuardNoMutation(harness, expectedMessage) {
  const before = plain(harness.state);
  harness.customerBuy('c1', 'j1');
  assert.deepEqual(plain(harness.state), before);
  assert.deepEqual(plain(harness.calls.toasts), [{ message: expectedMessage, type: 'error' }]);
  assert.equal(harness.calls.spendMinutes.length, 0);
  assert.equal(harness.calls.removeJewelry.length, 0);
  assert.equal(harness.calls.save, 0);
  assert.equal(harness.calls.modals.length, 0);
}

function testGuardRails() {
  assertGuardNoMutation(createHarness({ canServe: false }), '現在は接客できません。');
  assertGuardNoMutation(createHarness({ state: createBaseState({ wishesHeard: false }) }), '先にお客様の希望を聞いてください。');
  assertGuardNoMutation(createHarness({ canSpend: false }), '店舗営業時間内に接客を完了できません。');
  assertGuardNoMutation(createHarness({ state: createBaseState({ proposedItemIds: ['j1'] }) }), 'この商品はすでに提案しています。');
}

testSuccessfulPurchaseProtectsMoneyInventoryAndCustomerState();
testNoPurchaseKeepsMoneyAndInventoryAndAllowsSecondProposal();
testSecondFailedProposalAndClosingRoute();
testGuardRails();
console.log('CUSTOMER BUY REGRESSION: PASS');
