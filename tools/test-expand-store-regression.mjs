import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const re = new RegExp(`(?:^|\\n)function\\s+${name}\\s*\\([^\\n]*\\)\\s*\\{`, 'm');
  const match = re.exec(app);
  assert.ok(match, `${name} definition not found`);
  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const brace = app.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i];
    const next = app[i + 1] || '';
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
      if (depth === 0) return app.slice(start, i + 1);
    }
  }
  throw new Error(`${name} end not found`);
}

const conditionsSource = extractFunction('storeExpansionConditions');
const eligibleSource = extractFunction('expansionEligible');
const expandSource = extractFunction('expandStore');
const plain = (value) => JSON.parse(JSON.stringify(value));

const STORE_EXPANSION_REQUIREMENTS = Object.freeze({
  salesCount: 20,
  totalRevenue: 500000,
  orderDeliveries: 3,
  storePoints: 30,
  storeRating: 55,
  money: 300000,
  cost: 300000,
});

function makeHarness(overrides = {}) {
  const branch = {
    number: overrides.branchNumber ?? 1,
    orderDeliveries: overrides.orderDeliveries ?? 3,
    points: overrides.storePoints ?? 30,
  };
  const state = {
    game: { money: overrides.money ?? 300000 },
    store: {
      rented: overrides.rented ?? true,
      expanded: overrides.expanded ?? false,
      salesCount: overrides.salesCount ?? 20,
      totalRevenue: overrides.totalRevenue ?? 500000,
      showcaseCount: overrides.showcaseCount ?? 0,
    },
    inventory: { capacity: overrides.capacity ?? 10 },
  };
  const calls = {
    feedback: [],
    finance: [],
    notifications: [],
    saves: 0,
    toasts: [],
    renders: 0,
    syncCapacity: 0,
    installedShowcaseCount: 0,
  };
  const context = {
    state,
    STORE_EXPANSION_REQUIREMENTS,
    currentStoreBranch: () => branch,
    storeRating: () => overrides.rating ?? 55,
    yen: (value) => `¥${Number(value).toLocaleString('ja-JP')}`,
    installedShowcaseCount: () => {
      calls.installedShowcaseCount += 1;
      return overrides.installedShowcases ?? 2;
    },
    syncFinishedJewelryCapacity: () => {
      calls.syncCapacity += 1;
      state.inventory.capacity = overrides.syncedCapacity ?? 30;
      return state.inventory.capacity;
    },
    startMoneyFeedback: (...args) => calls.feedback.push(args),
    addFinance: (...args) => calls.finance.push(args),
    addNotification: (...args) => calls.notifications.push(args),
    saveGame: () => { calls.saves += 1; },
    showToast: (...args) => calls.toasts.push(args),
    render: () => { calls.renders += 1; },
    Boolean,
    Math,
    Number,
  };
  vm.createContext(context);
  vm.runInContext(`
    ${conditionsSource}
    ${eligibleSource}
    ${expandSource}
    globalThis.__conditions = storeExpansionConditions;
    globalThis.__eligible = expansionEligible;
    globalThis.__expand = expandStore;
  `, context);
  return {
    branch,
    state,
    calls,
    conditions: context.__conditions,
    eligible: context.__eligible,
    expand: context.__expand,
  };
}

function assertNoEffects(h, beforeMoney) {
  assert.equal(h.state.game.money, beforeMoney);
  assert.equal(h.calls.feedback.length, 0);
  assert.equal(h.calls.finance.length, 0);
  assert.equal(h.calls.notifications.length, 0);
  assert.equal(h.calls.saves, 0);
  assert.equal(h.calls.toasts.length, 0);
  assert.equal(h.calls.renders, 0);
  assert.equal(h.calls.syncCapacity, 0);
  assert.equal(h.calls.installedShowcaseCount, 0);
}

function testExactThresholdConditionsAreEligible() {
  const h = makeHarness();
  const rows = plain(h.conditions());
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map((row) => row.met), [true, true, true, true, true, true]);
  assert.equal(h.eligible(), true);
  assert.equal(rows[0].progress, '20/20点');
  assert.equal(rows[1].progress, '3/3件');
  assert.equal(rows[2].progress, '¥500,000');
  assert.equal(rows[3].progress, '30/30pt');
  assert.equal(rows[4].progress, '55/100');
  assert.equal(rows[5].progress, '¥300,000');
}

function testSuccessfulExpansionProtectsMoneyStateAccountingAndFeedback() {
  const h = makeHarness({ money: 900000, installedShowcases: 2, syncedCapacity: 30 });
  h.expand();
  assert.equal(h.state.game.money, 600000);
  assert.deepEqual(h.calls.feedback, [[-300000]]);
  assert.equal(h.state.store.expanded, true);
  assert.equal(h.state.store.showcaseCount, 2);
  assert.equal(h.calls.installedShowcaseCount, 1);
  assert.equal(h.calls.syncCapacity, 1);
  assert.equal(h.state.inventory.capacity, 30);
  assert.deepEqual(h.calls.finance, [['店舗を拡大', 0, 300000]]);
  assert.deepEqual(h.calls.notifications, [[
    '店舗を拡大しました',
    'ショーケースを最大3台まで設置でき、店舗スタッフを1人雇えるようになりました。',
  ]]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(h.calls.toasts, [['店舗を拡大しました。', 'info', false]]);
  assert.equal(h.calls.renders, 1);
}

function testEachRequirementBelowThresholdBlocksExpansion() {
  const cases = [
    { salesCount: 19 },
    { totalRevenue: 499999 },
    { orderDeliveries: 2 },
    { storePoints: 29 },
    { rating: 54 },
    { money: 299999 },
  ];
  for (const overrides of cases) {
    const h = makeHarness(overrides);
    const beforeMoney = h.state.game.money;
    assert.equal(h.eligible(), false, `expected ineligible for ${JSON.stringify(overrides)}`);
    h.expand();
    assertNoEffects(h, beforeMoney);
    assert.equal(h.state.store.expanded, false);
  }
}

function testBranchRentalAndAlreadyExpandedGuards() {
  const cases = [
    { branchNumber: 2 },
    { rented: false },
    { expanded: true },
  ];
  for (const overrides of cases) {
    const h = makeHarness(overrides);
    const beforeMoney = h.state.game.money;
    assert.equal(h.eligible(), false, `expected ineligible for ${JSON.stringify(overrides)}`);
    h.expand();
    assertNoEffects(h, beforeMoney);
  }
}

function testSecondExpansionCannotChargeTwice() {
  const h = makeHarness({ money: 900000 });
  h.expand();
  assert.equal(h.state.game.money, 600000);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.finance.length, 1);
  h.expand();
  assert.equal(h.state.game.money, 600000);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.finance.length, 1);
  assert.equal(h.calls.notifications.length, 1);
  assert.equal(h.calls.renders, 1);
}

testExactThresholdConditionsAreEligible();
testSuccessfulExpansionProtectsMoneyStateAccountingAndFeedback();
testEachRequirementBelowThresholdBlocksExpansion();
testBranchRentalAndAlreadyExpandedGuards();
testSecondExpansionCannotChargeTwice();

console.log('EXPAND STORE REGRESSION: PASS');
console.log('storeExpansionConditions()/expansionEligible()/expandStore() current behavior protected: six thresholds, first-store/rented/not-expanded guards, ¥300,000 cost, expansion state/capacity sync, finance, notification, save, toast, render, and double-charge prevention.');
