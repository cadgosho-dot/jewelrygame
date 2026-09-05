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

const purchaseSource = extractFunctionSource('purchase');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createHarness({
  money = 10000,
  quantity = 3,
  unitPrice = 1250,
  canSpend = true,
  normalizedShape = 'round',
  noLooseShopTrade = false,
  includeProduct = true,
} = {}) {
  const state = {
    game: { money },
    inventory: { loose: {} },
  };
  const loosePurchaseDraft = {};
  const scrollSnapshot = { top: 321, activeElement: 'ruby:round' };
  const calls = {
    metal: [], normalize: [], quantity: [], price: [], capture: 0, toasts: [],
    moneyFeedback: [], looseAdjust: [], spendHours: [], finance: [], saves: 0,
    renders: 0, restores: [], labels: [], draftKeys: [],
  };
  const gems = {};
  if (includeProduct) gems.ruby = { id: 'ruby', name: 'ルビー', noLooseShopTrade };
  const context = {
    state,
    GEMS: gems,
    loosePurchaseDraft,
    buyMetal: (id) => { calls.metal.push(id); return `metal:${id}`; },
    showToast: (...args) => { calls.toasts.push(args); return undefined; },
    normalizeLooseShape: (id, shape) => { calls.normalize.push([id, shape]); return normalizedShape; },
    loosePurchaseQuantity: (id, shape) => { calls.quantity.push([id, shape]); return quantity; },
    loosePurchasePrice: (id, shape) => { calls.price.push([id, shape]); return unitPrice; },
    captureLooseShopScrollState: () => { calls.capture += 1; return scrollSnapshot; },
    canSpendHours: (hours) => hours === 1 && canSpend,
    startMoneyFeedback: (amount) => calls.moneyFeedback.push(amount),
    adjustLooseInventory: (id, shape, delta) => {
      calls.looseAdjust.push([id, shape, delta]);
      const key = `${id}:${shape}`;
      state.inventory.loose[key] = (state.inventory.loose[key] || 0) + delta;
    },
    spendHours: (hours) => calls.spendHours.push(hours),
    looseDisplayLabel: (id, shape, options) => {
      calls.labels.push([id, shape, options]);
      return 'ルビー ラウンドカット';
    },
    addFinance: (...args) => calls.finance.push(args),
    loosePurchaseDraftKey: (id, shape) => { calls.draftKeys.push([id, shape]); return `${id}:${shape}`; },
    saveGame: () => { calls.saves += 1; },
    yen: (value) => `¥${Number(value).toLocaleString('en-US')}`,
    render: () => { calls.renders += 1; },
    restoreLooseShopScrollState: (snapshot) => calls.restores.push(snapshot),
  };
  vm.createContext(context);
  new vm.Script(`"use strict";\n${purchaseSource}\nglobalThis.__purchase = purchase;`).runInContext(context);
  return { state, calls, context, loosePurchaseDraft, scrollSnapshot, purchase: context.__purchase };
}

function testMetalPurchaseDelegatesToBuyMetal() {
  const h = createHarness();
  const result = h.purchase('metal', 'gold', 'ignored');
  assert.equal(result, 'metal:gold');
  assert.deepEqual(plain(h.calls.metal), ['gold']);
  assert.deepEqual(plain(h.calls.normalize), []);
  assert.equal(h.calls.capture, 0);
  assert.equal(h.calls.saves, 0);
}

function testSuccessfulLoosePurchase() {
  const h = createHarness({ normalizedShape: 'oval', quantity: 3, unitPrice: 1250, money: 10000 });
  h.purchase('loose', 'ruby', 'round');
  assert.equal(h.state.game.money, 6250);
  assert.equal(h.state.inventory.loose['ruby:oval'], 3);
  assert.deepEqual(plain(h.calls.normalize), [['ruby', 'round']]);
  assert.deepEqual(plain(h.calls.quantity), [['ruby', 'oval']]);
  assert.deepEqual(plain(h.calls.price), [['ruby', 'oval']]);
  assert.equal(h.calls.capture, 1);
  assert.deepEqual(plain(h.calls.moneyFeedback), [-3750]);
  assert.deepEqual(plain(h.calls.looseAdjust), [['ruby', 'oval', 3]]);
  assert.deepEqual(plain(h.calls.spendHours), [1]);
  assert.deepEqual(plain(h.calls.labels), [['ruby', 'oval', { suffix: true }]]);
  assert.deepEqual(plain(h.calls.finance), [['ルビー ラウンドカットを3個購入', 0, 3750]]);
  assert.deepEqual(plain(h.calls.draftKeys), [['ruby', 'oval']]);
  assert.equal(h.loosePurchaseDraft['ruby:oval'], 1);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(plain(h.calls.toasts), [['ルビー ラウンドカットを3個、¥3,750で購入しました。', 'info', false]]);
  assert.equal(h.calls.renders, 1);
  assert.deepEqual(plain(h.calls.restores), [h.scrollSnapshot]);
}

function assertGuard(options, args, expectedMessage, { capture = null } = {}) {
  const h = createHarness(options);
  const before = JSON.stringify(h.state);
  h.purchase(...args);
  assert.equal(JSON.stringify(h.state), before);
  assert.equal(h.calls.saves, 0);
  assert.equal(h.calls.renders, 0);
  assert.deepEqual(plain(h.calls.moneyFeedback), []);
  assert.deepEqual(plain(h.calls.looseAdjust), []);
  assert.deepEqual(plain(h.calls.spendHours), []);
  assert.deepEqual(plain(h.calls.finance), []);
  assert.deepEqual(plain(h.calls.restores), []);
  assert.equal(h.calls.toasts.length, 1);
  assert.equal(h.calls.toasts[0][0], expectedMessage);
  assert.equal(h.calls.toasts[0][1], 'error');
  if (capture !== null) assert.equal(h.calls.capture, capture);
}

function testLoosePurchaseGuardRails() {
  assertGuard({ includeProduct: false }, ['loose', 'ruby', 'round'], 'この商品は購入できません。', { capture: 0 });
  assertGuard({}, ['rough', 'ruby', 'round'], 'この商品は購入できません。', { capture: 0 });
  assertGuard({ noLooseShopTrade: true }, ['loose', 'ruby', 'round'], 'このオリジナルルースはルース屋では購入できません。イベントで入手してください。', { capture: 0 });
  assertGuard({ canSpend: false }, ['loose', 'ruby', 'round'], '今日は購入手続きをする時間がありません。', { capture: 1 });
  assertGuard({ quantity: 0 }, ['loose', 'ruby', 'round'], '購入する数を選択してください。', { capture: 1 });
  assertGuard({ money: 3000, quantity: 3, unitPrice: 1250 }, ['loose', 'ruby', 'round'], '所持金が足りません。', { capture: 1 });
}

for (const test of [testMetalPurchaseDelegatesToBuyMetal, testSuccessfulLoosePurchase, testLoosePurchaseGuardRails]) {
  test();
  console.log(`OK: ${test.name}`);
}
console.log('PURCHASE REGRESSION: PASS');
