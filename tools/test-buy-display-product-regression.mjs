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

const source = extractFunction('buyDisplayProduct');

function makeHarness(overrides = {}) {
  const calls = { toast: [], finance: [], feedback: [], spend: 0, save: 0, render: 0 };
  const state = {
    game: { money: 300000 },
    store: { displayInventory: { showcase: 0, displaySupplies: 0, case: 0 } },
  };
  const branch = { casesInstalled: 0 };
  const context = {
    DISPLAY_SHOP_PRODUCTS: {
      showcase: { id: 'showcase', name: 'ショーケース', price: 150000 },
      displaySupplies: { id: 'displaySupplies', name: 'ディスプレイ用品', price: 50000 },
      case: { id: 'case', name: 'ケース', price: 500, purchaseLimit: 50 },
    },
    state,
    displayCasePurchaseDraft: 1,
    okachimachiFacilityAvailability: () => ({ open: true, reason: '' }),
    displayCasePurchaseQuantity: () => 1,
    currentStoreBranch: () => branch,
    storeCaseRemaining: (b) => Math.max(0, Number(b?.casesInstalled) || 0),
    canSpendHours: () => true,
    startMoneyFeedback: (amount) => calls.feedback.push(amount),
    spendHours: (hours) => { calls.spend += hours; },
    addFinance: (...args) => calls.finance.push(args),
    saveGame: () => { calls.save += 1; },
    showToast: (...args) => { calls.toast.push(args); },
    render: () => { calls.render += 1; },
  };
  Object.assign(context, overrides.context || {});
  if (overrides.money != null) state.game.money = overrides.money;
  if (overrides.inventory) Object.assign(state.store.displayInventory, overrides.inventory);
  if (overrides.installedCases != null) branch.casesInstalled = overrides.installedCases;
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__buyDisplayProduct = buyDisplayProduct;`, context);
  return { context, state, branch, calls, buy: context.__buyDisplayProduct };
}

function assertNoMutation(h, beforeMoney, beforeInventory) {
  assert.equal(h.state.game.money, beforeMoney);
  assert.deepEqual(h.state.store.displayInventory, beforeInventory);
  assert.equal(h.calls.spend, 0);
  assert.equal(h.calls.finance.length, 0);
  assert.equal(h.calls.save, 0);
  assert.equal(h.calls.render, 0);
}

function testSuccessfulShowcasePurchase() {
  const h = makeHarness();
  h.buy('showcase');
  assert.equal(h.state.game.money, 150000);
  assert.equal(h.state.store.displayInventory.showcase, 1);
  assert.deepEqual(h.calls.feedback, [-150000]);
  assert.equal(h.calls.spend, 1);
  assert.deepEqual(h.calls.finance[0], ['ショーケースを1個購入', 0, 150000]);
  assert.equal(h.calls.save, 1);
  assert.equal(h.calls.render, 1);
  assert.equal(h.calls.toast.at(-1)?.[0], 'ショーケースを1個購入しました。');
}

function testSuccessfulCaseQuantityPurchaseAndDraftReset() {
  const h = makeHarness({
    money: 10000,
    context: { displayCasePurchaseQuantity: () => 10 },
  });
  h.context.displayCasePurchaseDraft = 10;
  h.buy('case');
  assert.equal(h.state.game.money, 5000);
  assert.equal(h.state.store.displayInventory.case, 10);
  assert.equal(h.context.displayCasePurchaseDraft, 1);
  assert.deepEqual(h.calls.feedback, [-5000]);
  assert.equal(h.calls.spend, 1);
  assert.deepEqual(h.calls.finance[0], ['ケースを10個購入', 0, 5000]);
  assert.equal(h.calls.save, 1);
  assert.equal(h.calls.render, 1);
}

function testPurchaseLimitIncludesInstalledCases() {
  const h = makeHarness({
    inventory: { case: 45 },
    installedCases: 4,
    context: { displayCasePurchaseQuantity: () => 2 },
  });
  const before = { ...h.state.store.displayInventory };
  h.buy('case');
  assertNoMutation(h, 300000, before);
  assert.match(h.calls.toast.at(-1)?.[0] || '', /50個まで保有できます/);
}

function testGuardRails() {
  {
    const h = makeHarness();
    const before = { ...h.state.store.displayInventory };
    h.buy('missing');
    assertNoMutation(h, 300000, before);
    assert.equal(h.calls.toast.length, 0);
  }
  {
    const h = makeHarness({ context: { okachimachiFacilityAvailability: () => ({ open: false, reason: '休業中です。' }) } });
    const before = { ...h.state.store.displayInventory };
    h.buy('showcase');
    assertNoMutation(h, 300000, before);
    assert.equal(h.calls.toast.at(-1)?.[0], '休業中です。');
  }
  {
    const h = makeHarness({ money: 1000 });
    const before = { ...h.state.store.displayInventory };
    h.buy('showcase');
    assertNoMutation(h, 1000, before);
    assert.equal(h.calls.toast.at(-1)?.[0], '購入費が足りません。');
  }
  {
    const h = makeHarness({ context: { canSpendHours: () => false } });
    const before = { ...h.state.store.displayInventory };
    h.buy('showcase');
    assertNoMutation(h, 300000, before);
    assert.equal(h.calls.toast.at(-1)?.[0], '今日は購入手続きをする時間がありません。');
  }
  {
    const h = makeHarness({ context: { displayCasePurchaseQuantity: () => 0 } });
    const before = { ...h.state.store.displayInventory };
    h.buy('case');
    assertNoMutation(h, 300000, before);
    assert.equal(h.calls.toast.at(-1)?.[0], '購入する数量を選択してください。');
  }
}

testSuccessfulShowcasePurchase();
testSuccessfulCaseQuantityPurchaseAndDraftReset();
testPurchaseLimitIncludesInstalledCases();
testGuardRails();

console.log('BUY DISPLAY PRODUCT REGRESSION: PASS');
console.log('buyDisplayProduct() current behavior protected: availability, quantity/limit, money, 1h, inventory, finance, save, feedback, toast, render.');
