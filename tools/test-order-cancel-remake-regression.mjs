import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function findMatchingBrace(text, brace) {
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < text.length; i += 1) {
    const c = text[i];
    const next = text[i + 1] || '';
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && next === '/') { blockComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error('matching brace not found');
}

function extractFunction(name) {
  const re = new RegExp(`(?:^|\\n)function\\s+${name}\\s*\\([^\\n]*\\)\\s*\\{`, 'm');
  const match = re.exec(app);
  assert.ok(match, `${name} definition not found`);
  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const brace = app.indexOf('{', start);
  const end = findMatchingBrace(app, brace);
  return app.slice(start, end + 1);
}

const sources = {
  confirmCancelOrder: extractFunction('confirmCancelOrder'),
  cancelOrder: extractFunction('cancelOrder'),
  remakeOrderFromCompletion: extractFunction('remakeOrderFromCompletion'),
};
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeHarness(overrides = {}) {
  const day = overrides.day ?? 42;
  const defaultOrder = {
    id: 'order-1',
    status: overrides.orderStatus ?? '完成',
    jewelryId: overrides.orderJewelryId ?? 'j-order',
    branchNumber: overrides.branchNumber ?? 2,
  };
  const defaultItem = {
    id: overrides.itemId ?? 'j-order',
    status: overrides.itemStatus ?? 'order',
    name: '注文リング',
  };
  const orders = overrides.orders ?? [defaultOrder];
  const jewelry = overrides.jewelry ?? [defaultItem];
  const state = {
    game: { day, money: overrides.money ?? 500000 },
    orders,
    inventory: {
      capacity: overrides.capacity ?? 10,
      jewelry,
    },
  };
  const calls = {
    modals: [],
    toasts: [],
    closes: 0,
    saves: 0,
    renders: 0,
    progress: [],
    defaultDraft: [],
    productionHours: [],
    requirements: [],
    craft: 0,
    spendHours: 0,
    spendMinutes: 0,
    advanceTime: 0,
  };
  const nextDraft = overrides.nextDraft ?? { orderId: 'order-1', item: 'ring', useLoose: true };
  const hours = overrides.hours ?? 3;
  const requirements = overrides.requirements ?? { enoughLoose: true, enoughMetal: true };
  const context = {
    state,
    showModal: (value) => calls.modals.push(value),
    showToast: (...args) => calls.toasts.push(args),
    closeModal: () => { calls.closes += 1; },
    saveGame: () => { calls.saves += 1; },
    render: () => { calls.renders += 1; },
    addStoreProgress: (value) => calls.progress.push(value),
    defaultDraft: (orderId) => { calls.defaultDraft.push(orderId); return nextDraft; },
    productionHours: (draft) => { calls.productionHours.push(plain(draft)); return hours; },
    materialRequirementsFor: (draft) => { calls.requirements.push(plain(draft)); return requirements; },
    workshopOperating: () => overrides.workshopOperating ?? true,
    toolUsable: (toolId) => toolId === 'jewelryBench' && (overrides.benchUsable ?? true),
    canSpendHours: (value) => (overrides.canSpendHours ?? true) && value === hours,
    craft: () => { calls.craft += 1; },
    spendHours: () => { calls.spendHours += 1; },
    spendMinutes: () => { calls.spendMinutes += 1; },
    advanceTime: () => { calls.advanceTime += 1; },
    Number,
    Math,
  };
  vm.createContext(context);
  vm.runInContext(`
    var completionId = ${JSON.stringify(overrides.completionId ?? defaultItem.id)};
    var craftDraft = ${JSON.stringify(overrides.initialCraftDraft ?? null)};
    ${sources.confirmCancelOrder}
    ${sources.cancelOrder}
    ${sources.remakeOrderFromCompletion}
    globalThis.__api = {
      confirmCancelOrder,
      cancelOrder,
      remakeOrderFromCompletion,
      getCompletionId: () => completionId,
      getCraftDraft: () => craftDraft,
    };
  `, context);
  return { state, order: orders[0], item: jewelry[0], calls, nextDraft, api: context.__api };
}

function assertNoDirectTimeOrMoneyChange(h, initialMoney = 500000) {
  assert.equal(h.state.game.money, initialMoney);
  assert.equal(h.calls.spendHours, 0);
  assert.equal(h.calls.spendMinutes, 0);
  assert.equal(h.calls.advanceTime, 0);
}

function testCancelConfirmationModal() {
  const h = makeHarness({ orderStatus: '受注' });
  h.api.confirmCancelOrder('order-1');
  assert.equal(h.calls.modals.length, 1);
  assert.deepEqual(plain(h.calls.modals[0]), {
    title: 'この注文をキャンセルしますか？',
    body: '<p>店舗評価が2下がります。制作済みの商品は通常在庫へ戻ります。</p>',
    confirm: 'キャンセルする',
    cancel: '戻る',
    danger: true,
    action: 'cancel-order:order-1',
  });
  assert.equal(h.calls.saves, 0);
  assertNoDirectTimeOrMoneyChange(h);

  const invalid = makeHarness({ orderStatus: '完了' });
  invalid.api.confirmCancelOrder('order-1');
  assert.equal(invalid.calls.modals.length, 0);
  assert.deepEqual(invalid.calls.toasts, [['キャンセルできる注文がありません。', 'error']]);
  assertNoDirectTimeOrMoneyChange(invalid);
}

function testCancelAcceptedOrder() {
  const h = makeHarness({ orderStatus: '受注', orderJewelryId: null, jewelry: [] });
  h.api.cancelOrder('order-1');
  assert.equal(h.order.status, '取消');
  assert.equal(h.order.closedDay, 42);
  assert.equal(h.order.cancelledDay, 42);
  assert.deepEqual(plain(h.calls.progress), [{ branchNumber: 2, rating: -2 }]);
  assert.equal(h.calls.closes, 1);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(h.calls.toasts, [['注文をキャンセルしました。', 'info', false]]);
  assert.equal(h.calls.renders, 1);
  assertNoDirectTimeOrMoneyChange(h);
}

function testCancelCompletedOrderReturnsJewelryToStorage() {
  const h = makeHarness({ orderStatus: '完成', itemStatus: 'order' });
  h.api.cancelOrder('order-1');
  assert.equal(h.item.status, 'stored');
  assert.equal(h.order.status, '取消');
  assert.equal(h.order.jewelryId, 'j-order');
  assert.deepEqual(plain(h.calls.progress), [{ branchNumber: 2, rating: -2 }]);
  assert.equal(h.calls.saves, 1);
  assertNoDirectTimeOrMoneyChange(h);
}

function testCancelInvalidStateOnlyClosesModal() {
  const h = makeHarness({ orderStatus: '完了', itemStatus: 'sold' });
  const before = plain(h.state);
  h.api.cancelOrder('order-1');
  assert.deepEqual(plain(h.state), before);
  assert.equal(h.calls.closes, 1);
  assert.equal(h.calls.saves, 0);
  assert.equal(h.calls.renders, 0);
  assert.equal(h.calls.progress.length, 0);
  assert.equal(h.calls.toasts.length, 0);
  assertNoDirectTimeOrMoneyChange(h);
}

function testSuccessfulRemakeResetsOldCompletionAndDelegatesToCraft() {
  const sold = { id: 'sold-1', status: 'sold' };
  const h = makeHarness({ capacity: 2, jewelry: [{ id: 'j-order', status: 'order' }, sold] });
  h.api.remakeOrderFromCompletion('order-1', 'j-order');
  assert.deepEqual(h.calls.defaultDraft, ['order-1']);
  assert.deepEqual(h.calls.productionHours, [plain(h.nextDraft)]);
  assert.deepEqual(h.calls.requirements, [plain(h.nextDraft)]);
  assert.equal(h.item.status, 'stored');
  assert.equal(h.order.status, '受注');
  assert.equal(h.order.jewelryId, null);
  assert.equal(h.api.getCompletionId(), null);
  assert.deepEqual(plain(h.api.getCraftDraft()), plain(h.nextDraft));
  assert.equal(h.calls.craft, 1);
  assert.equal(h.calls.saves, 0);
  assert.equal(h.calls.renders, 0);
  assert.equal(h.calls.toasts.length, 0);
  assertNoDirectTimeOrMoneyChange(h);
}

function testRemakeIdentityGuard() {
  const cases = [
    { label: 'missing order', overrides: { orders: [] } },
    { label: 'missing item', overrides: { jewelry: [] } },
    { label: 'order not completed', overrides: { orderStatus: '受注' } },
    { label: 'order points to another item', overrides: { orderJewelryId: 'other' } },
    { label: 'item is not order status', overrides: { itemStatus: 'stored' } },
  ];
  for (const row of cases) {
    const h = makeHarness(row.overrides);
    const before = plain(h.state);
    h.api.remakeOrderFromCompletion('order-1', 'j-order');
    assert.deepEqual(plain(h.state), before, row.label);
    assert.deepEqual(h.calls.toasts, [['作り直せる注文品が見つかりません。', 'error']], row.label);
    assert.equal(h.calls.craft, 0, row.label);
    assert.equal(h.calls.defaultDraft.length, 0, row.label);
    assertNoDirectTimeOrMoneyChange(h);
  }
}

function testRemakeOperationalGuards() {
  const cases = [
    { label: 'workshop stopped', overrides: { workshopOperating: false }, toast: ['工房は作業停止中です。', 'error'] },
    { label: 'bench unusable', overrides: { benchUsable: false }, toast: ['注文品の制作には使用可能な彫金机が必要です。', 'error'] },
    { label: 'not enough time', overrides: { canSpendHours: false }, toast: ['今日は注文品を作り直す時間がありません。', 'error'] },
    { label: 'loose missing', overrides: { requirements: { enoughLoose: false, enoughMetal: true } }, toast: ['作り直しに必要な材料が足りません。', 'error'] },
    { label: 'metal missing', overrides: { requirements: { enoughLoose: true, enoughMetal: false } }, toast: ['作り直しに必要な材料が足りません。', 'error'] },
    { label: 'capacity full', overrides: { capacity: 1 }, toast: ['完成品の保管場所に空きがありません。', 'error'] },
  ];
  for (const row of cases) {
    const h = makeHarness(row.overrides);
    const before = plain(h.state);
    h.api.remakeOrderFromCompletion('order-1', 'j-order');
    assert.deepEqual(plain(h.state), before, row.label);
    assert.deepEqual(h.calls.toasts, [row.toast], row.label);
    assert.equal(h.calls.craft, 0, row.label);
    assert.equal(h.calls.defaultDraft.length, 1, row.label);
    assert.equal(h.calls.productionHours.length, 1, row.label);
    assert.equal(h.calls.requirements.length, 1, row.label);
    assert.equal(h.api.getCompletionId(), 'j-order', row.label);
    assert.equal(h.api.getCraftDraft(), null, row.label);
    assertNoDirectTimeOrMoneyChange(h);
  }
}

testCancelConfirmationModal();
testCancelAcceptedOrder();
testCancelCompletedOrderReturnsJewelryToStorage();
testCancelInvalidStateOnlyClosesModal();
testSuccessfulRemakeResetsOldCompletionAndDelegatesToCraft();
testRemakeIdentityGuard();
testRemakeOperationalGuards();

console.log('ORDER CANCEL/REMAKE REGRESSION: PASS');
console.log('Current order cancel/remake behavior protected: confirmation, rating -2, completed-item storage return, cancel close/save/toast/render, remake identity/workshop/tool/time/material/capacity guards, reset to accepted state, old completion storage, and delegation to craft().');
