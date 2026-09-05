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

const sellLooseSource = extractFunctionSource('sellLoose');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createHarness({
  money = 10000,
  available = 4,
  unitPrice = 1500,
  canSpend = true,
  normalizedShape = 'round',
  noLooseShopTrade = false,
  includeGem = true,
} = {}) {
  const state = {
    game: { money },
    inventory: { loose: { 'ruby:round': 5, 'ruby:oval': 5 } },
    daily: { looseSold: [] },
  };
  const calls = {
    normalize: [], available: [], price: [], adjust: [], spendHours: [], labels: [],
    finance: [], saves: 0, moneyFeedback: [], toasts: [], renders: 0,
  };
  const gems = {};
  if (includeGem) gems.ruby = { id: 'ruby', name: 'ルビー', noLooseShopTrade };
  const context = {
    state,
    GEMS: gems,
    normalizeLooseShape: (id, shape) => { calls.normalize.push([id, shape]); return normalizedShape; },
    looseAvailableQuantity: (id, shape) => { calls.available.push([id, shape]); return available; },
    showToast: (...args) => { calls.toasts.push(args); return undefined; },
    canSpendHours: (hours) => hours === 1 && canSpend,
    looseSalePrice: (id, shape) => { calls.price.push([id, shape]); return unitPrice; },
    adjustLooseInventory: (id, shape, delta) => {
      calls.adjust.push([id, shape, delta]);
      const key = `${id}:${shape}`;
      state.inventory.loose[key] = (state.inventory.loose[key] || 0) + delta;
    },
    spendHours: (hours) => calls.spendHours.push(hours),
    looseDisplayLabel: (id, shape, options) => {
      calls.labels.push([id, shape, options]);
      return 'ルビー ラウンドカット';
    },
    addFinance: (...args) => calls.finance.push(args),
    saveGame: () => { calls.saves += 1; },
    startMoneyFeedback: (amount) => calls.moneyFeedback.push(amount),
    yen: (value) => `¥${Number(value).toLocaleString('en-US')}`,
    render: () => { calls.renders += 1; },
  };
  vm.createContext(context);
  new vm.Script(`"use strict";\n${sellLooseSource}\nglobalThis.__sellLoose = sellLoose;`).runInContext(context);
  return { state, calls, sellLoose: context.__sellLoose };
}

function testSuccessfulSingleLooseSale() {
  const h = createHarness({ money: 10000, available: 4, unitPrice: 1500, normalizedShape: 'oval' });
  h.sellLoose('ruby', 'round', false);
  assert.equal(h.state.game.money, 11500);
  assert.equal(h.state.inventory.loose['ruby:oval'], 4);
  assert.deepEqual(plain(h.calls.normalize), [['ruby', 'round']]);
  assert.deepEqual(plain(h.calls.available), [['ruby', 'oval']]);
  assert.deepEqual(plain(h.calls.price), [['ruby', 'oval']]);
  assert.deepEqual(plain(h.calls.adjust), [['ruby', 'oval', -1]]);
  assert.deepEqual(plain(h.calls.spendHours), [1]);
  assert.deepEqual(plain(h.state.daily.looseSold), [{ gem: 'ruby', looseShape: 'oval', qty: 1, price: 1500, unitPrice: 1500 }]);
  assert.deepEqual(plain(h.calls.labels), [['ruby', 'oval', { suffix: true }]]);
  assert.deepEqual(plain(h.calls.finance), [['ルビー ラウンドカットをルース屋へ1個売却', 1500, 0]]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(plain(h.calls.moneyFeedback), [1500]);
  assert.deepEqual(plain(h.calls.toasts), [['ルビー ラウンドカットを¥1,500で売却しました。', 'info', false]]);
  assert.equal(h.calls.renders, 1);
}

function testSellAllUsesOnlyAvailableLoose() {
  const h = createHarness({ money: 20000, available: 3, unitPrice: 2000 });
  h.sellLoose('ruby', 'round', true);
  assert.equal(h.state.game.money, 26000);
  assert.equal(h.state.inventory.loose['ruby:round'], 2);
  assert.deepEqual(plain(h.calls.adjust), [['ruby', 'round', -3]]);
  assert.deepEqual(plain(h.state.daily.looseSold), [{ gem: 'ruby', looseShape: 'round', qty: 3, price: 6000, unitPrice: 2000 }]);
  assert.deepEqual(plain(h.calls.finance), [['ルビー ラウンドカットをルース屋へ3個売却', 6000, 0]]);
  assert.deepEqual(plain(h.calls.toasts), [['ルビー ラウンドカットを3個、¥6,000で売却しました。', 'info', false]]);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.renders, 1);
}

function assertGuard(options, expectedMessage) {
  const h = createHarness(options);
  const before = JSON.stringify(h.state);
  h.sellLoose('ruby', 'round', true);
  assert.equal(JSON.stringify(h.state), before);
  assert.deepEqual(plain(h.calls.adjust), []);
  assert.deepEqual(plain(h.calls.spendHours), []);
  assert.deepEqual(plain(h.calls.finance), []);
  assert.equal(h.calls.saves, 0);
  assert.deepEqual(plain(h.calls.moneyFeedback), []);
  assert.equal(h.calls.renders, 0);
  assert.equal(h.calls.toasts.length, 1);
  assert.equal(h.calls.toasts[0][0], expectedMessage);
  assert.equal(h.calls.toasts[0][1], 'error');
}

function testLooseSaleGuardRails() {
  assertGuard({ includeGem: false }, '使用可能なルースがありません。注文に使用予定のルースは売却できません。');
  assertGuard({ available: 0 }, '使用可能なルースがありません。注文に使用予定のルースは売却できません。');
  assertGuard({ noLooseShopTrade: true }, 'このオリジナルルースはルース屋では売却できません。');
  assertGuard({ canSpend: false }, '今日は売却手続きをする時間がありません。');
}

for (const test of [testSuccessfulSingleLooseSale, testSellAllUsesOnlyAvailableLoose, testLooseSaleGuardRails]) {
  test();
  console.log(`OK: ${test.name}`);
}
console.log('SELL LOOSE REGRESSION: PASS');
