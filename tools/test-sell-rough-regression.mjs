import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

function extractFunctionSource(name) {
  const marker = `function ${name}(`;
  const start = appSource.indexOf(marker);
  if (start < 0) throw new Error(`${name} definition was not found`);
  let depth = 0;
  let seen = false;
  let quote = null;
  let escaped = false;
  let templateDepth = 0;
  for (let i = start; i < appSource.length; i += 1) {
    const ch = appSource[i];
    const next = appSource[i + 1];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (quote === '`' && ch === '$' && next === '{') { templateDepth += 1; i += 1; continue; }
      if (quote === '`' && ch === '}' && templateDepth > 0) { templateDepth -= 1; continue; }
      if (ch === quote && templateDepth === 0) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') { depth += 1; seen = true; }
    if (ch === '}') {
      depth -= 1;
      if (seen && depth === 0) return appSource.slice(start, i + 1);
    }
  }
  throw new Error(`${name} closing brace was not found`);
}

const sellRoughSource = extractFunctionSource('sellRough');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createHarness({
  money = 10000,
  owned = 4,
  unitPrice = 1500,
  canSpend = true,
  includeGem = true,
} = {}) {
  const state = {
    game: { money },
    inventory: { rough: { ruby: owned } },
    daily: { roughSold: [] },
  };
  const calls = {
    price: [], spendHours: [], finance: [], saves: 0,
    moneyFeedback: [], toasts: [], renders: 0,
  };
  const gems = {};
  if (includeGem) gems.ruby = { id: 'ruby', name: 'ルビー' };
  const context = {
    state,
    GEMS: gems,
    showToast: (...args) => { calls.toasts.push(args); return undefined; },
    canSpendHours: (hours) => hours === 1 && canSpend,
    roughSalePrice: (id) => { calls.price.push(id); return unitPrice; },
    spendHours: (hours) => calls.spendHours.push(hours),
    addFinance: (...args) => calls.finance.push(args),
    saveGame: () => { calls.saves += 1; },
    startMoneyFeedback: (amount) => calls.moneyFeedback.push(amount),
    yen: (value) => `¥${Number(value).toLocaleString('en-US')}`,
    render: () => { calls.renders += 1; },
  };
  vm.createContext(context);
  new vm.Script(`"use strict";\n${sellRoughSource}\nglobalThis.__sellRough = sellRough;`).runInContext(context);
  return { state, calls, sellRough: context.__sellRough };
}

function testSuccessfulSingleRoughSale() {
  const h = createHarness({ money: 10000, owned: 4, unitPrice: 1500 });
  h.sellRough('ruby', false);
  assert.equal(h.state.game.money, 11500);
  assert.equal(h.state.inventory.rough.ruby, 3);
  assert.deepEqual(plain(h.calls.price), ['ruby']);
  assert.deepEqual(plain(h.calls.spendHours), [1]);
  assert.deepEqual(plain(h.state.daily.roughSold), [{ gem: 'ruby', qty: 1, price: 1500, unitPrice: 1500 }]);
  assert.deepEqual(plain(h.calls.finance), [['ルビー原石をルース屋へ1個売却', 1500, 0]]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(plain(h.calls.moneyFeedback), [1500]);
  assert.deepEqual(plain(h.calls.toasts), [['ルビー原石を¥1,500で売却しました。', 'info', false]]);
  assert.equal(h.calls.renders, 1);
}

function testSellAllUsesOwnedRough() {
  const h = createHarness({ money: 20000, owned: 3, unitPrice: 2000 });
  h.sellRough('ruby', true);
  assert.equal(h.state.game.money, 26000);
  assert.equal(h.state.inventory.rough.ruby, 0);
  assert.deepEqual(plain(h.calls.price), ['ruby']);
  assert.deepEqual(plain(h.calls.spendHours), [1]);
  assert.deepEqual(plain(h.state.daily.roughSold), [{ gem: 'ruby', qty: 3, price: 6000, unitPrice: 2000 }]);
  assert.deepEqual(plain(h.calls.finance), [['ルビー原石をルース屋へ3個売却', 6000, 0]]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(plain(h.calls.moneyFeedback), [6000]);
  assert.deepEqual(plain(h.calls.toasts), [['ルビー原石を3個、¥6,000で売却しました。', 'info', false]]);
  assert.equal(h.calls.renders, 1);
}

function assertGuard(options, expectedMessage) {
  const h = createHarness(options);
  const before = JSON.stringify(h.state);
  h.sellRough('ruby', true);
  assert.equal(JSON.stringify(h.state), before);
  assert.deepEqual(plain(h.calls.price), []);
  assert.deepEqual(plain(h.calls.spendHours), []);
  assert.deepEqual(plain(h.calls.finance), []);
  assert.equal(h.calls.saves, 0);
  assert.deepEqual(plain(h.calls.moneyFeedback), []);
  assert.equal(h.calls.renders, 0);
  assert.equal(h.calls.toasts.length, 1);
  assert.equal(h.calls.toasts[0][0], expectedMessage);
  assert.equal(h.calls.toasts[0][1], 'error');
}

function testRoughSaleGuardRails() {
  assertGuard({ includeGem: false, owned: 4 }, '売却できる原石がありません。');
  assertGuard({ owned: 0 }, '売却できる原石がありません。');
  assertGuard({ canSpend: false }, '今日は売却手続きをする時間がありません。');
}

for (const test of [testSuccessfulSingleRoughSale, testSellAllUsesOwnedRough, testRoughSaleGuardRails]) {
  test();
  console.log(`OK: ${test.name}`);
}
console.log('SELL ROUGH REGRESSION: PASS');
