import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const match = new RegExp(`^function ${name}\\([^\\n]*\\) \\{`, 'm').exec(app);
  assert.ok(match, `${name} definition missing`);
  const start = match.index;
  const brace = start + match[0].length - 1;
  let depth = 0, quote = null, escaped = false, line = false, block = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i], next = app[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && next === '/') { block = false; i += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { line = true; i += 1; continue; }
    if (c === '/' && next === '*') { block = true; i += 1; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return app.slice(start, i + 1);
  }
  throw new Error(`${name} closing brace missing`);
}

const names = ['customerBuy'];
const source = names.map(extractFunction).join('\n');
const plain = (value) => JSON.parse(JSON.stringify(value));

function harness(options = {}) {
  const calls = [];
  const branch = { number: 1, casesInstalled: 5 };
  const item = {
    id: 'j1', name: 'テストリング', status: options.itemStatus || 'displayed', cost: 300,
  };
  const customerState = {
    visiting: options.visiting !== false,
    visitingBranchNumber: options.visitingBranchNumber ?? 1,
    activeRequest: { item: 'ring' },
    wishesHeard: options.wishesHeard !== false,
    proposedItemIds: options.proposedItemIds ? [...options.proposedItemIds] : [],
    met: false,
    lastVisitDay: 0,
    purchases: options.purchases ?? 2,
    relation: '初回来店',
  };
  const fakeMath = Object.create(Math);
  fakeMath.random = () => options.random ?? 0;
  const ctx = {
    state: {
      game: { money: options.money ?? 1000, day: 5, minutes: 600 },
      store: { branchNumber: 1, salesCount: 2, totalRevenue: 5000, totalProfit: 1000 },
      inventory: { jewelry: [item] },
      customers: { alice: customerState },
      playerName: 'テスト職人',
    },
    CUSTOMERS: { alice: { name: 'アリス' } },
    screen: 'customer',
    Math: fakeMath,
    console,
    canServeCustomers: () => options.canServe !== false,
    showToast: (...args) => { calls.push(['toast', ...plain(args)]); },
    storeBranchByNumber: (number) => number === 1 ? branch : null,
    showcaseSlotForJewelry: () => options.inShowcase !== false,
    customerProposalMinutes: () => 60,
    canSpendStoreMinutes: () => options.canSpendTime !== false,
    activeCustomerRequest: () => ({ item: 'ring', budget: 1000 }),
    customerMatchResult: () => ({ price: options.price ?? 700, chance: options.chance ?? 0.5, label: '適正' }),
    spendMinutes: (minutes) => { calls.push(['spend-minutes', minutes]); ctx.state.game.minutes += minutes; },
    removeJewelry: (itemId, meta) => {
      calls.push(['remove-jewelry', itemId, plain(meta)]);
      const found = ctx.state.inventory.jewelry.find((entry) => entry.id === itemId);
      if (found) found.status = 'sold';
    },
    startMoneyFeedback: (...args) => calls.push(['money-feedback', ...plain(args)]),
    addStoreProgress: (payload) => calls.push(['store-progress', plain(payload)]),
    addFinance: (...args) => calls.push(['finance', ...plain(args)]),
    addNotification: (...args) => calls.push(['notification', ...plain(args)]),
    storeBranchLabel: (number) => `店舗${number}`,
    consumeStoreCase: () => { calls.push(['consume-case']); return options.caseUsed !== false; },
    storeCaseRemaining: () => 4,
    esc: (value) => String(value),
    yen: (value) => `¥${Number(value).toLocaleString('ja-JP')}`,
    showModal: (payload) => calls.push(['modal', plain(payload)]),
    saveGame: () => calls.push(['save']),
    storeBusinessOpen: () => options.storeOpen !== false,
    render: () => calls.push(['render']),
    setScreen: (name, data = {}, push = true) => {
      ctx.screen = name;
      calls.push(['screen', name, plain(data), push]);
    },
    setTimeout: (fn, ms) => {
      calls.push(['set-timeout', ms]);
      if (options.runTimeout) fn();
      return 1;
    },
    structuredClone,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:customer-sale' });
  return {
    ctx, calls, branch, item, customerState,
    buy: (customerId = 'alice', itemId = 'j1') => ctx.customerBuy(customerId, itemId),
  };
}

const count = (h, name) => h.calls.filter((row) => row[0] === name).length;

function testCustomerSaleGuards() {
  const cases = [
    [{ canServe: false }, '現在は接客できません。'],
    [{ wishesHeard: false }, '先にお客様の希望を聞いてください。'],
    [{ inShowcase: false }, 'この商品は現在の店舗では提案できません。'],
    [{ proposedItemIds: ['j1'] }, 'この商品はすでに提案しています。'],
    [{ proposedItemIds: ['x1', 'x2'] }, '店頭商品を提案できるのは2点までです。'],
    [{ canSpendTime: false }, '店舗営業時間内に接客を完了できません。'],
  ];
  for (const [options, message] of cases) {
    const h = harness(options);
    h.buy();
    assert.ok(h.calls.some((row) => row[0] === 'toast' && row[1] === message), message);
    assert.equal(count(h, 'spend-minutes'), 0);
    assert.equal(count(h, 'remove-jewelry'), 0);
    assert.equal(h.ctx.state.game.money, 1000);
  }
}

function testRejectedProposalPreservesSaleState() {
  const h = harness({ random: 0.9, chance: 0.5 });
  h.buy();
  assert.deepEqual(plain(h.customerState.proposedItemIds), ['j1']);
  assert.equal(h.ctx.state.game.minutes, 660);
  assert.equal(h.customerState.met, true);
  assert.equal(h.customerState.lastVisitDay, 5);
  assert.equal(h.customerState.visiting, true);
  assert.equal(h.item.status, 'displayed');
  assert.equal(h.ctx.state.game.money, 1000);
  assert.equal(h.ctx.state.store.salesCount, 2);
  assert.equal(h.ctx.state.store.totalRevenue, 5000);
  assert.equal(h.ctx.state.store.totalProfit, 1000);
  assert.equal(h.customerState.purchases, 2);
  assert.equal(count(h, 'remove-jewelry'), 0);
  assert.equal(count(h, 'finance'), 0);
  assert.equal(count(h, 'store-progress'), 0);
  assert.equal(count(h, 'save'), 1);
  assert.equal(count(h, 'render'), 1);
  assert.ok(h.calls.some((row) => row[0] === 'modal' && row[1].title === '今回は購入されませんでした。'));
}

function testSuccessfulCustomerSaleSettlement() {
  const h = harness({ random: 0, chance: 0.5, price: 700, purchases: 2, caseUsed: true });
  h.buy();
  assert.equal(h.ctx.state.game.minutes, 660);
  assert.equal(h.customerState.met, true);
  assert.equal(h.customerState.lastVisitDay, 5);
  assert.equal(h.customerState.visiting, false);
  assert.equal(h.customerState.visitingBranchNumber, null);
  assert.equal(h.customerState.activeRequest, null);
  assert.equal(h.customerState.wishesHeard, false);
  assert.deepEqual(plain(h.customerState.proposedItemIds), []);
  assert.deepEqual(h.calls.find((row) => row[0] === 'remove-jewelry'), ['remove-jewelry', 'j1', { price: 700, branchNumber: 1, channel: 'customer' }]);
  assert.equal(h.item.status, 'sold');
  assert.equal(h.ctx.state.game.money, 1700);
  assert.equal(h.ctx.state.store.salesCount, 3);
  assert.equal(h.ctx.state.store.totalRevenue, 5700);
  assert.equal(h.ctx.state.store.totalProfit, 1400);
  assert.deepEqual(h.calls.find((row) => row[0] === 'store-progress'), ['store-progress', { branchNumber: 1, rating: 0, sale: true, revenue: 700, serviceSuccess: true }]);
  assert.equal(h.customerState.purchases, 3);
  assert.equal(h.customerState.relation, '常連客');
  assert.deepEqual(h.calls.find((row) => row[0] === 'finance'), ['finance', 'アリスさんへ販売', 700, 0]);
  assert.equal(count(h, 'notification'), 1);
  assert.equal(count(h, 'consume-case'), 1);
  assert.equal(count(h, 'money-feedback'), 1);
  assert.equal(count(h, 'save'), 1);
  assert.ok(h.calls.some((row) => row[0] === 'modal' && row[1].title === '商品を購入していただきました。'));
  assert.equal(count(h, 'render'), 0);
}

function testRejectedProposalAfterClosingReturnsStore() {
  const h = harness({ random: 0.9, chance: 0.5, storeOpen: false, runTimeout: true });
  h.buy();
  assert.equal(h.ctx.state.game.money, 1000);
  assert.equal(h.item.status, 'displayed');
  assert.equal(count(h, 'save'), 1);
  assert.equal(count(h, 'render'), 1);
  assert.ok(h.calls.some((row) => row[0] === 'modal' && row[1].body.includes('19:00になったため')));
  assert.ok(h.calls.some((row) => row[0] === 'screen' && row[1] === 'store' && row[2].branchId === 'branch-1'));
}

for (const test of [
  testCustomerSaleGuards,
  testRejectedProposalPreservesSaleState,
  testSuccessfulCustomerSaleSettlement,
  testRejectedProposalAfterClosingReturnsStore,
]) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('CUSTOMER SALE REGRESSION: PASS');
