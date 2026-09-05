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

const buyMetalSource = extractFunctionSource('buyMetal');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createState({ money = 100000, owned = 5, minutes = 600 } = {}) {
  return {
    game: { money, minutes },
    inventory: { metals: { gold: owned } },
  };
}

function createHarness({
  state = createState(),
  tradeReady = true,
  product = { id: 'gold', name: 'ゴールド' },
  canSpend = true,
  quantity = 2,
  maximum = 10,
  unitPrice = 1000,
  storageLimit = 20,
} = {}) {
  const calls = {
    toasts: [],
    moneyFeedback: [],
    spendHours: [],
    finance: [],
    save: 0,
    render: 0,
  };
  const metalTradeDraft = { buy: { gold: quantity }, sell: {} };
  const METALS = product ? { gold: product } : {};
  const context = {
    state,
    METALS,
    metalTradeDraft,
    Number,
    Math,
    metalMarketTradeReady: () => tradeReady,
    canSpendHours: (hours) => hours === 1 && canSpend,
    metalTradeQuantity: (mode, id) => {
      assert.equal(mode, 'buy');
      assert.equal(id, 'gold');
      return quantity;
    },
    metalTradeMaximum: (mode, id) => {
      assert.equal(mode, 'buy');
      assert.equal(id, 'gold');
      return maximum;
    },
    metalTradePricePerGram: (mode, id) => {
      assert.equal(mode, 'buy');
      assert.equal(id, 'gold');
      return unitPrice;
    },
    metalOwnedWeight: (id) => Number(state.inventory.metals[id]) || 0,
    metalStorageLimit: (id) => {
      assert.equal(id, 'gold');
      return storageLimit;
    },
    roundedMetalWeight: (value) => Math.round(Number(value) * 1000) / 1000,
    startMoneyFeedback: (delta) => calls.moneyFeedback.push(delta),
    spendHours: (hours) => {
      calls.spendHours.push(hours);
      state.game.minutes += hours * 60;
    },
    addFinance: (label, income, expense) => calls.finance.push({ label, income, expense }),
    saveGame: () => { calls.save += 1; return Promise.resolve(); },
    showToast: (...args) => calls.toasts.push(args),
    render: () => { calls.render += 1; },
  };
  vm.createContext(context);
  new vm.Script(`"use strict";\n${buyMetalSource}\nglobalThis.__buyMetal = buyMetal;`).runInContext(context);
  return { state, calls, context, buyMetal: context.__buyMetal };
}

function testSuccessfulMetalPurchase() {
  const harness = createHarness();
  harness.buyMetal('gold');

  assert.equal(harness.state.game.money, 98000);
  assert.equal(harness.state.inventory.metals.gold, 7);
  assert.equal(harness.state.game.minutes, 660);
  assert.deepEqual(plain(harness.calls.moneyFeedback), [-2000]);
  assert.deepEqual(plain(harness.calls.spendHours), [1]);
  assert.deepEqual(plain(harness.calls.finance), [
    { label: 'ゴールドを2g購入', income: 0, expense: 2000 },
  ]);
  assert.equal(harness.context.metalTradeDraft.buy.gold, 1);
  assert.equal(harness.calls.save, 1);
  assert.deepEqual(plain(harness.calls.toasts), [
    ['ゴールドを2g購入しました', 'info', false],
  ]);
  assert.equal(harness.calls.render, 1);
}

function assertGuardNoPurchase(harness, expectedToast) {
  const before = plain(harness.state);
  const draftBefore = plain(harness.context.metalTradeDraft);
  harness.buyMetal('gold');
  assert.deepEqual(plain(harness.state), before);
  assert.deepEqual(plain(harness.context.metalTradeDraft), draftBefore);
  assert.deepEqual(plain(harness.calls.toasts), [expectedToast]);
  assert.equal(harness.calls.moneyFeedback.length, 0);
  assert.equal(harness.calls.spendHours.length, 0);
  assert.equal(harness.calls.finance.length, 0);
  assert.equal(harness.calls.save, 0);
  assert.equal(harness.calls.render, 0);
}

function testMetalPurchaseGuardRails() {
  assertGuardNoPurchase(
    createHarness({ tradeReady: false }),
    ['地金相場を確認できないため、現在は購入できません。', 'error'],
  );
  assertGuardNoPurchase(
    createHarness({ product: null }),
    ['この地金は購入できません。', 'error'],
  );
  assertGuardNoPurchase(
    createHarness({ canSpend: false }),
    ['今日は購入手続きをする時間がありません。', 'error'],
  );
  assertGuardNoPurchase(
    createHarness({ quantity: 0 }),
    ['購入する重量を▲▼で選んでください。', 'error'],
  );
  assertGuardNoPurchase(
    createHarness({ quantity: 11, maximum: 10 }),
    ['購入する重量を▲▼で選んでください。', 'error'],
  );
  assertGuardNoPurchase(
    createHarness({ state: createState({ money: 1999 }) }),
    ['所持金が足りません。', 'error'],
  );
  assertGuardNoPurchase(
    createHarness({ state: createState({ owned: 19 }), quantity: 2, storageLimit: 20 }),
    ['地金の保管上限を超えています。', 'error'],
  );
}

const tests = [
  testSuccessfulMetalPurchase,
  testMetalPurchaseGuardRails,
];

for (const test of tests) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('BUY METAL REGRESSION: PASS');
console.log('buyMetal() の所持金・地金在庫・時間・収支・保存・主要ガードを固定しました。');
