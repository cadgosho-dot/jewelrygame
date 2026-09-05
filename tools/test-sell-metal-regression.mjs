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

const sellMetalSource = extractFunctionSource('sellMetal');
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
  maximum = 5,
  unitPrice = 800,
} = {}) {
  const calls = {
    toasts: [],
    moneyFeedback: [],
    spendHours: [],
    finance: [],
    save: 0,
    render: 0,
  };
  const metalTradeDraft = { buy: {}, sell: { gold: quantity } };
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
      assert.equal(mode, 'sell');
      assert.equal(id, 'gold');
      return quantity;
    },
    metalTradeMaximum: (mode, id) => {
      assert.equal(mode, 'sell');
      assert.equal(id, 'gold');
      return maximum;
    },
    metalTradePricePerGram: (mode, id) => {
      assert.equal(mode, 'sell');
      assert.equal(id, 'gold');
      return unitPrice;
    },
    metalOwnedWeight: (id) => Number(state.inventory.metals[id]) || 0,
    roundedMetalWeight: (value) => Math.round(Number(value) * 1000) / 1000,
    spendHours: (hours) => {
      calls.spendHours.push(hours);
      state.game.minutes += hours * 60;
    },
    addFinance: (label, income, expense) => calls.finance.push({ label, income, expense }),
    saveGame: () => { calls.save += 1; return Promise.resolve(); },
    startMoneyFeedback: (delta) => calls.moneyFeedback.push(delta),
    showToast: (...args) => calls.toasts.push(args),
    render: () => { calls.render += 1; },
  };
  vm.createContext(context);
  new vm.Script(`"use strict";\n${sellMetalSource}\nglobalThis.__sellMetal = sellMetal;`).runInContext(context);
  return { state, calls, context, sellMetal: context.__sellMetal };
}

function testSuccessfulMetalSale() {
  const harness = createHarness();
  harness.sellMetal('gold');

  assert.equal(harness.state.game.money, 101600);
  assert.equal(harness.state.inventory.metals.gold, 3);
  assert.equal(harness.state.game.minutes, 660);
  assert.deepEqual(plain(harness.calls.spendHours), [1]);
  assert.deepEqual(plain(harness.calls.finance), [
    { label: 'ゴールドを2g売却', income: 1600, expense: 0 },
  ]);
  assert.equal(harness.context.metalTradeDraft.sell.gold, 1);
  assert.equal(harness.calls.save, 1);
  assert.deepEqual(plain(harness.calls.moneyFeedback), [1600]);
  assert.deepEqual(plain(harness.calls.toasts), [
    ['ゴールドを2g売却しました', 'info', false],
  ]);
  assert.equal(harness.calls.render, 1);
}

function assertGuardNoSale(harness, expectedToast) {
  const before = plain(harness.state);
  const draftBefore = plain(harness.context.metalTradeDraft);
  harness.sellMetal('gold');
  assert.deepEqual(plain(harness.state), before);
  assert.deepEqual(plain(harness.context.metalTradeDraft), draftBefore);
  assert.deepEqual(plain(harness.calls.toasts), [expectedToast]);
  assert.equal(harness.calls.moneyFeedback.length, 0);
  assert.equal(harness.calls.spendHours.length, 0);
  assert.equal(harness.calls.finance.length, 0);
  assert.equal(harness.calls.save, 0);
  assert.equal(harness.calls.render, 0);
}

function testMetalSaleGuardRails() {
  assertGuardNoSale(
    createHarness({ tradeReady: false }),
    ['地金相場を確認できないため、現在は売却できません。', 'error'],
  );
  assertGuardNoSale(
    createHarness({ product: null }),
    ['この地金は売却できません。', 'error'],
  );
  assertGuardNoSale(
    createHarness({ canSpend: false }),
    ['今日は売却手続きをする時間がありません。', 'error'],
  );
  assertGuardNoSale(
    createHarness({ quantity: 0 }),
    ['売却する重量を▲▼で選んでください。', 'error'],
  );
  assertGuardNoSale(
    createHarness({ quantity: 6, maximum: 5 }),
    ['売却する重量を▲▼で選んでください。', 'error'],
  );
}

const tests = [
  testSuccessfulMetalSale,
  testMetalSaleGuardRails,
];

for (const test of tests) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('SELL METAL REGRESSION: PASS');
console.log('sellMetal() の地金在庫・所持金・時間・収支・保存・主要ガードを固定しました。');
