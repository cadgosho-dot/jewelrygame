import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const core = fs.readFileSync(new URL('../js/game-data-core.js', import.meta.url), 'utf8');

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

function extractRequirementBlock() {
  const marker = 'export const STORE_LEVEL_REQUIREMENTS = Object.freeze([';
  const start = core.indexOf(marker);
  assert.ok(start >= 0, 'STORE_LEVEL_REQUIREMENTS start not found');
  const endMarker = ')));';
  const end = core.indexOf(endMarker, start);
  assert.ok(end >= 0, 'STORE_LEVEL_REQUIREMENTS end not found');
  return core.slice(start, end + endMarker.length);
}

const requirementBlock = extractRequirementBlock();
const REQUIREMENTS_SHA256 = '2f6cc2a876ec531904bfd736ce4a6c1fffe1d9fbdbdb99ea3f58511d8f6f51ff';
assert.equal(crypto.createHash('sha256').update(requirementBlock).digest('hex'), REQUIREMENTS_SHA256);

const requirementContext = {};
vm.createContext(requirementContext);
vm.runInContext(`${requirementBlock.replace('export const ', 'const ')}\nglobalThis.__requirements = STORE_LEVEL_REQUIREMENTS;`, requirementContext);
const STORE_LEVEL_REQUIREMENTS = requirementContext.__requirements;
const plain = (value) => JSON.parse(JSON.stringify(value));

const levelSource = extractFunction('storeLevel');
const ratingSource = extractFunction('storeRating');
const requirementSource = extractFunction('storeLevelRequirement');
const statusSource = extractFunction('storeUpgradeStatus');
const syncSource = extractFunction('syncStoreLevel');
const upgradeSource = extractFunction('upgradeStoreLevel');

function makeHarness(overrides = {}) {
  const branch = overrides.branch === null ? null : {
    id: 'store-1',
    number: overrides.number ?? 1,
    level: overrides.level ?? 1,
    peakLevel: overrides.peakLevel ?? (overrides.level ?? 1),
    paidThroughLevel: overrides.paidThroughLevel ?? 1,
    rating: overrides.rating ?? 50,
    operatingDays: overrides.operatingDays ?? 15,
    salesCount: overrides.salesCount ?? 10,
    totalRevenue: overrides.totalRevenue ?? 500000,
    serviceSuccesses: overrides.serviceSuccesses ?? 5,
  };
  const state = {
    game: { money: overrides.money ?? 100000 },
    store: {
      branchNumber: 1,
      level: overrides.storeLevel ?? (branch?.level ?? 1),
      rating: overrides.storeRating ?? (branch?.rating ?? 50),
      branches: branch ? [branch] : [],
    },
  };
  const calls = {
    feedback: [],
    finance: [],
    notifications: [],
    saves: 0,
    toasts: [],
    renders: 0,
    spendHours: 0,
    spendMinutes: 0,
    advanceTime: 0,
  };
  const context = {
    state,
    STORE_LEVEL_REQUIREMENTS,
    currentStoreBranch: () => branch,
    storeBranchOperating: () => overrides.operating ?? true,
    storeBranchLabel: (number) => `店舗${number}`,
    startMoneyFeedback: (...args) => calls.feedback.push(args),
    addFinance: (...args) => calls.finance.push(args),
    addNotification: (...args) => calls.notifications.push(args),
    saveGame: () => { calls.saves += 1; },
    showToast: (...args) => calls.toasts.push(args),
    render: () => { calls.renders += 1; },
    spendHours: () => { calls.spendHours += 1; },
    spendMinutes: () => { calls.spendMinutes += 1; },
    advanceTime: () => { calls.advanceTime += 1; },
    Math,
    Number,
  };
  vm.createContext(context);
  vm.runInContext(`
    ${levelSource}
    ${ratingSource}
    ${requirementSource}
    ${statusSource}
    ${syncSource}
    ${upgradeSource}
    globalThis.__level = storeLevel;
    globalThis.__rating = storeRating;
    globalThis.__requirement = storeLevelRequirement;
    globalThis.__status = storeUpgradeStatus;
    globalThis.__sync = syncStoreLevel;
    globalThis.__upgrade = upgradeStoreLevel;
  `, context);
  return {
    state,
    branch,
    calls,
    level: context.__level,
    rating: context.__rating,
    requirement: context.__requirement,
    status: context.__status,
    sync: context.__sync,
    upgrade: context.__upgrade,
  };
}

function assertNoTimeCost(h) {
  assert.equal(h.calls.spendHours, 0);
  assert.equal(h.calls.spendMinutes, 0);
  assert.equal(h.calls.advanceTime, 0);
}

function testExactRequirementTableIsProtected() {
  const rows = plain(STORE_LEVEL_REQUIREMENTS);
  assert.equal(rows.length, 20);
  assert.deepEqual(rows[0], { level: 1, operatingDays: 0, sales: 0, revenue: 0, serviceSuccesses: 0, cost: 0 });
  assert.deepEqual(rows[1], { level: 2, operatingDays: 15, sales: 10, revenue: 500000, serviceSuccesses: 5, cost: 100000 });
  assert.deepEqual(rows[9], { level: 10, operatingDays: 390, sales: 450, revenue: 50000000, serviceSuccesses: 220, cost: 2100000 });
  assert.deepEqual(rows[19], { level: 20, operatingDays: 2400, sales: 3500, revenue: 650000000, serviceSuccesses: 1500, cost: 17000000 });
}

function testStoreLevelClampAndRequirementLookup() {
  assert.equal(makeHarness({ level: 0 }).level(), 1);
  assert.equal(makeHarness({ level: 7.9 }).level(), 7);
  assert.equal(makeHarness({ level: 99 }).level(), 20);
  const h = makeHarness();
  assert.equal(plain(h.requirement(2)).cost, 100000);
  assert.equal(h.requirement(21), null);
}

function testExactLevelTwoThresholdIsEligible() {
  const h = makeHarness({ level: 1, operatingDays: 15, salesCount: 10, totalRevenue: 500000, serviceSuccesses: 5, money: 100000, paidThroughLevel: 1, operating: true });
  const status = plain(h.status());
  assert.equal(status.current, 1);
  assert.equal(status.requirement.level, 2);
  assert.equal(status.cost, 100000);
  assert.equal(status.alreadyPaid, false);
  assert.deepEqual(status.conditions.map((row) => row.id), ['days', 'sales', 'revenue', 'service']);
  assert.deepEqual(status.conditions.map((row) => row.met), [true, true, true, true]);
  assert.equal(status.complete, true);
}

function testEachUpgradeGateBlocksLevelUp() {
  const cases = [
    { operatingDays: 14 },
    { salesCount: 9 },
    { totalRevenue: 499999 },
    { serviceSuccesses: 4 },
    { money: 99999 },
    { operating: false },
  ];
  for (const overrides of cases) {
    const h = makeHarness(overrides);
    const before = plain(h.state);
    assert.equal(h.status().complete, false, `expected incomplete for ${JSON.stringify(overrides)}`);
    h.upgrade();
    assert.deepEqual(plain(h.state), before);
    assert.deepEqual(h.calls.toasts, [['店舗改装の条件を満たしていません。', 'error']]);
    assert.equal(h.calls.feedback.length, 0);
    assert.equal(h.calls.finance.length, 0);
    assert.equal(h.calls.notifications.length, 0);
    assert.equal(h.calls.saves, 0);
    assert.equal(h.calls.renders, 0);
    assertNoTimeCost(h);
  }
}

function testSuccessfulPaidUpgradeProtectsMoneyLevelAndPersistence() {
  const h = makeHarness({ level: 1, peakLevel: 1, rating: 55, operatingDays: 15, salesCount: 10, totalRevenue: 500000, serviceSuccesses: 5, money: 250000, paidThroughLevel: 1 });
  h.upgrade();
  assert.equal(h.state.game.money, 150000);
  assert.deepEqual(h.calls.feedback, [[-100000]]);
  assert.deepEqual(h.calls.finance, [['店舗1を店舗レベル2へ改装', 0, 100000]]);
  assert.equal(h.branch.paidThroughLevel, 2);
  assert.equal(h.branch.level, 2);
  assert.equal(h.branch.peakLevel, 2);
  assert.equal(h.state.store.level, 2);
  assert.equal(h.state.store.rating, 55);
  assert.deepEqual(h.calls.notifications, [['店舗レベルが上がりました', '店舗1が店舗レベル2になりました。']]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(h.calls.toasts, [['店舗レベル2になりました。', 'info', false]]);
  assert.equal(h.calls.renders, 1);
  assertNoTimeCost(h);
}

function testAlreadyPaidCompatibilityPathDoesNotChargeAgain() {
  const h = makeHarness({ level: 2, peakLevel: 4, paidThroughLevel: 3, operatingDays: 35, salesCount: 25, totalRevenue: 1500000, serviceSuccesses: 12, money: 0 });
  const status = plain(h.status());
  assert.equal(status.requirement.level, 3);
  assert.equal(status.alreadyPaid, true);
  assert.equal(status.cost, 0);
  assert.equal(status.complete, true);
  h.upgrade();
  assert.equal(h.state.game.money, 0);
  assert.equal(h.calls.feedback.length, 0);
  assert.equal(h.calls.finance.length, 0);
  assert.equal(h.branch.paidThroughLevel, 3);
  assert.equal(h.branch.level, 3);
  assert.equal(h.branch.peakLevel, 4);
  assert.equal(h.state.store.level, 3);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.renders, 1);
  assertNoTimeCost(h);
}

function testMaximumLevelAndMissingBranchDoNotMutate() {
  const max = makeHarness({ level: 20, peakLevel: 20, paidThroughLevel: 20, money: 99999999 });
  const beforeMax = plain(max.state);
  const status = plain(max.status());
  assert.equal(status.requirement, null);
  assert.equal(status.complete, true);
  max.upgrade();
  assert.deepEqual(plain(max.state), beforeMax);
  assert.deepEqual(max.calls.toasts, [['店舗は最大レベルです。']]);
  assert.equal(max.calls.saves, 0);
  assert.equal(max.calls.renders, 0);
  assertNoTimeCost(max);

  const missing = makeHarness({ branch: null, storeLevel: 1, money: 100000 });
  const beforeMissing = plain(missing.state);
  missing.upgrade(null);
  assert.deepEqual(plain(missing.state), beforeMissing);
  assert.deepEqual(missing.calls.toasts, [['店舗は最大レベルです。']]);
  assert.equal(missing.calls.saves, 0);
  assertNoTimeCost(missing);
}

testExactRequirementTableIsProtected();
testStoreLevelClampAndRequirementLookup();
testExactLevelTwoThresholdIsEligible();
testEachUpgradeGateBlocksLevelUp();
testSuccessfulPaidUpgradeProtectsMoneyLevelAndPersistence();
testAlreadyPaidCompatibilityPathDoesNotChargeAgain();
testMaximumLevelAndMissingBranchDoNotMutate();

console.log('UPGRADE STORE LEVEL REGRESSION: PASS');
console.log('storeUpgradeStatus()/upgradeStoreLevel() current behavior protected: level 1-20 requirements, days/sales/revenue/service/money/operating gates, prepaid compatibility, money/finance, branch/state level sync, peak level, notification, save, toast, render, and no time cost.');
