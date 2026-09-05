import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const re = new RegExp(`(?:^|\\n)function\\s+${name}\\s*\\([^\\n]*\\)\\s*\\{`, 'm');
  const m = re.exec(app);
  assert.ok(m, `${name} definition not found`);
  const start = m.index + (m[0].startsWith('\n') ? 1 : 0);
  const brace = app.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escape = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return app.slice(start, i + 1);
    }
  }
  throw new Error(`${name} end not found`);
}

const source = extractFunction('confirmJewelryShopTrade');
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeHarness(overrides = {}) {
  const calls = { close: 0, toast: [], finance: [], feedback: [], spend: [], save: 0, render: 0, remove: [] };
  const state = {
    game: { money: 100000, day: 12 },
    inventory: { jewelry: [], capacity: 10 },
    daily: { sold: [] },
  };
  const screenData = { stock: [] };
  const context = {
    state,
    screenData,
    JEWELRY_SHOP_TRANSACTION_HOURS: 1,
    closeModal: () => { calls.close += 1; },
    canSpendHours: () => true,
    uid: () => 'uid-1',
    spendHours: (hours) => calls.spend.push(hours),
    addFinance: (...args) => calls.finance.push(args),
    saveGame: () => { calls.save += 1; },
    startMoneyFeedback: (amount) => calls.feedback.push(amount),
    showToast: (...args) => calls.toast.push(args),
    render: () => { calls.render += 1; },
    jewelryShopSellOffer: () => 12000,
    removeJewelry: (id, options) => calls.remove.push([id, plain(options)]),
    yen: (amount) => `¥${amount}`,
  };
  if (overrides.money != null) state.game.money = overrides.money;
  if (overrides.day != null) state.game.day = overrides.day;
  if (overrides.capacity != null) state.inventory.capacity = overrides.capacity;
  if (overrides.jewelry) state.inventory.jewelry = structuredClone(overrides.jewelry);
  if (overrides.stock) screenData.stock = structuredClone(overrides.stock);
  Object.assign(context, overrides.context || {});
  vm.createContext(context);
  vm.runInContext(`let jewelryShopPendingTrade = null;\n${source}\nglobalThis.__confirm = confirmJewelryShopTrade;\nglobalThis.__setPending = (value) => { jewelryShopPendingTrade = value; };\nglobalThis.__getPending = () => jewelryShopPendingTrade;`, context);
  return {
    context, state, screenData, calls,
    confirm: context.__confirm,
    setPending: context.__setPending,
    getPending: context.__getPending,
  };
}

function stockItem() {
  return {
    id: 'stock-1', item: 'ring', metal: 'gold', gem: 'ruby', useLoose: true,
    looseShape: 'round', design: 'simple', finish: 'mirror', quality: 'good',
    name: 'Ruby Ring', purchasePrice: 50000, recommendedPrice: 70000,
  };
}

function assertNoCommit(h, expectedMoney) {
  assert.equal(h.state.game.money, expectedMoney);
  assert.equal(h.calls.spend.length, 0);
  assert.equal(h.calls.finance.length, 0);
  assert.equal(h.calls.save, 0);
  assert.equal(h.calls.feedback.length, 0);
  assert.equal(h.calls.render, 0);
  assert.equal(h.calls.remove.length, 0);
}

function testSuccessfulPurchase() {
  const h = makeHarness({ stock: [stockItem()] });
  h.setPending({ type: 'buy', itemId: 'stock-1' });
  h.confirm();
  assert.equal(h.getPending(), null);
  assert.equal(h.calls.close, 1);
  assert.equal(h.state.game.money, 50000);
  assert.equal(h.state.inventory.jewelry.length, 1);
  const purchased = h.state.inventory.jewelry[0];
  assert.equal(purchased.id, 'uid-1');
  assert.equal(purchased.name, 'Ruby Ring');
  assert.equal(purchased.cost, 50000);
  assert.equal(purchased.status, 'stored');
  assert.equal(purchased.createdDay, 12);
  assert.equal(purchased.purchasedDay, 12);
  assert.equal(purchased.acquisition, 'jewelryShop');
  assert.equal(purchased.shopPurchasePrice, 50000);
  assert.equal(h.screenData.stock.length, 0);
  assert.deepEqual(h.calls.spend, [1]);
  assert.deepEqual(h.calls.finance[0], ['ジュエリーショップでRuby Ringを購入', 0, 50000]);
  assert.equal(h.calls.save, 1);
  assert.deepEqual(h.calls.feedback, [-50000]);
  assert.deepEqual(h.calls.toast.at(-1), ['Ruby Ringを購入しました。', 'info', false]);
  assert.equal(h.calls.render, 1);
}

function testSuccessfulWholesaleSale() {
  const item = { id: 'owned-1', name: 'Owned Ring', status: 'stored', cost: 10000 };
  const h = makeHarness({ money: 2000, jewelry: [item] });
  h.setPending({ type: 'sell', itemId: 'owned-1' });
  h.confirm();
  assert.equal(h.getPending(), null);
  assert.equal(h.calls.close, 1);
  assert.equal(h.state.game.money, 14000);
  assert.deepEqual(h.calls.remove[0], ['owned-1', { price: 12000, channel: 'jewelryShop' }]);
  assert.deepEqual(plain(h.state.daily.sold[0]), { itemId: 'owned-1', name: 'Owned Ring', price: 12000, profit: 2000, channel: 'jewelryShop' });
  assert.deepEqual(h.calls.spend, [1]);
  assert.deepEqual(h.calls.finance[0], ['Owned Ringをジュエリーショップへ卸販売', 12000, 0]);
  assert.equal(h.calls.save, 1);
  assert.deepEqual(h.calls.feedback, [12000]);
  assert.deepEqual(h.calls.toast.at(-1), ['Owned Ringを¥12000で卸販売しました。', 'info', false]);
  assert.equal(h.calls.render, 1);
}

function testNoPendingAndTimeGuard() {
  {
    const h = makeHarness();
    h.confirm();
    assert.equal(h.calls.close, 1);
    assert.equal(h.getPending(), null);
    assertNoCommit(h, 100000);
    assert.equal(h.calls.toast.length, 0);
  }
  {
    const h = makeHarness({ stock: [stockItem()], context: { canSpendHours: () => false } });
    h.setPending({ type: 'buy', itemId: 'stock-1' });
    h.confirm();
    assert.equal(h.calls.close, 1);
    assert.equal(h.getPending(), null);
    assertNoCommit(h, 100000);
    assert.equal(h.state.inventory.jewelry.length, 0);
    assert.equal(h.screenData.stock.length, 1);
    assert.equal(h.calls.toast.at(-1)?.[0], '今日は売買手続きをする時間がありません。');
  }
}

function testPurchaseGuards() {
  {
    const h = makeHarness();
    h.setPending({ type: 'buy', itemId: 'missing' });
    h.confirm();
    assertNoCommit(h, 100000);
    assert.equal(h.calls.toast.at(-1)?.[0], 'この商品は売り切れました。');
  }
  {
    const existing = [{ id: 'a', status: 'stored' }, { id: 'b', status: 'displayed' }, { id: 'c', status: 'sold' }];
    const h = makeHarness({ capacity: 2, jewelry: existing, stock: [stockItem()] });
    h.setPending({ type: 'buy', itemId: 'stock-1' });
    h.confirm();
    assertNoCommit(h, 100000);
    assert.equal(h.state.inventory.jewelry.length, 3);
    assert.equal(h.calls.toast.at(-1)?.[0], '完成品の保管場所に空きがありません。');
  }
  {
    const h = makeHarness({ money: 49999, stock: [stockItem()] });
    h.setPending({ type: 'buy', itemId: 'stock-1' });
    h.confirm();
    assertNoCommit(h, 49999);
    assert.equal(h.state.inventory.jewelry.length, 0);
    assert.equal(h.calls.toast.at(-1)?.[0], '所持金が足りません。');
  }
}

function testSaleMissingGuard() {
  const h = makeHarness({ jewelry: [{ id: 'owned-1', name: 'Sold Ring', status: 'sold', cost: 10000 }] });
  h.setPending({ type: 'sell', itemId: 'owned-1' });
  h.confirm();
  assertNoCommit(h, 100000);
  assert.equal(h.state.daily.sold.length, 0);
  assert.equal(h.calls.toast.at(-1)?.[0], 'この商品は現在売却できません。');
}

testSuccessfulPurchase();
testSuccessfulWholesaleSale();
testNoPendingAndTimeGuard();
testPurchaseGuards();
testSaleMissingGuard();

console.log('JEWELRY SHOP TRADE REGRESSION: PASS');
console.log('confirmJewelryShopTrade() current behavior protected: pending reset/modal close, 1h guard, purchase capacity/money/stock mutation, wholesale sale/profit/daily record, finance, save, feedback, toast, render.');
