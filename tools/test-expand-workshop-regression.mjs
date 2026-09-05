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
  const marker = 'export const WORKSHOP_LEVEL_REQUIREMENTS = Object.freeze([';
  const start = core.indexOf(marker);
  assert.ok(start >= 0, 'WORKSHOP_LEVEL_REQUIREMENTS start not found');
  const endMarker = '\n]);';
  const end = core.indexOf(endMarker, start);
  assert.ok(end >= 0, 'WORKSHOP_LEVEL_REQUIREMENTS end not found');
  return core.slice(start, end + endMarker.length);
}

const requirementBlock = extractRequirementBlock();
const REQUIREMENTS_SHA256 = '97a772f0963dfd6a6401113a12f8ac6994660ded0396ec872c1f83ffb03ccec0';
assert.equal(crypto.createHash('sha256').update(requirementBlock).digest('hex'), REQUIREMENTS_SHA256);

const requirementContext = {};
vm.createContext(requirementContext);
vm.runInContext(`${requirementBlock.replace('export const ', 'const ')}\nglobalThis.__requirements = WORKSHOP_LEVEL_REQUIREMENTS;`, requirementContext);
const WORKSHOP_LEVEL_REQUIREMENTS = requirementContext.__requirements;
const plain = (value) => JSON.parse(JSON.stringify(value));

const levelSource = extractFunction('workshopLevel');
const requirementSource = extractFunction('workshopLevelRequirement');
const cumulativeToolsSource = extractFunction('cumulativeWorkshopRequiredTools');
const statusSource = extractFunction('workshopUpgradeStatus');
const expandSource = extractFunction('expandWorkshop');

function makeHarness(overrides = {}) {
  const state = {
    game: { money: overrides.money ?? 50000 },
    workshop: {
      level: overrides.level ?? 1,
      peakLevel: overrides.peakLevel ?? (overrides.level ?? 1),
      activeHours: overrides.activeHours ?? 20,
      paidThroughLevel: overrides.paidThroughLevel ?? 1,
    },
  };
  const unusable = new Set(overrides.unusableTools ?? []);
  const calls = {
    closeModal: 0,
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
    WORKSHOP_LEVEL_REQUIREMENTS,
    toolUsable: (id) => !unusable.has(id),
    workshopQualityPoints: () => overrides.quality ?? 3,
    workshopOperating: () => overrides.operating ?? true,
    closeModal: () => { calls.closeModal += 1; },
    startMoneyFeedback: (...args) => calls.feedback.push(args),
    addFinance: (...args) => calls.finance.push(args),
    addNotification: (...args) => calls.notifications.push(args),
    saveGame: () => { calls.saves += 1; },
    showToast: (...args) => calls.toasts.push(args),
    render: () => { calls.renders += 1; },
    spendHours: () => { calls.spendHours += 1; },
    spendMinutes: () => { calls.spendMinutes += 1; },
    advanceTime: () => { calls.advanceTime += 1; },
    Boolean,
    Math,
    Number,
    Set,
  };
  vm.createContext(context);
  vm.runInContext(`
    ${levelSource}
    ${requirementSource}
    ${cumulativeToolsSource}
    ${statusSource}
    ${expandSource}
    globalThis.__level = workshopLevel;
    globalThis.__requirement = workshopLevelRequirement;
    globalThis.__cumulative = cumulativeWorkshopRequiredTools;
    globalThis.__status = workshopUpgradeStatus;
    globalThis.__expand = expandWorkshop;
  `, context);
  return {
    state,
    calls,
    level: context.__level,
    requirement: context.__requirement,
    cumulative: context.__cumulative,
    status: context.__status,
    expand: context.__expand,
  };
}

function assertNoTimeCost(h) {
  assert.equal(h.calls.spendHours, 0);
  assert.equal(h.calls.spendMinutes, 0);
  assert.equal(h.calls.advanceTime, 0);
}

function testExactRequirementTableIsProtected() {
  const rows = plain(WORKSHOP_LEVEL_REQUIREMENTS);
  assert.equal(rows.length, 20);
  assert.deepEqual(rows[0], { level: 1, hours: 0, quality: 0, cost: 0, requiredTools: [] });
  assert.deepEqual(rows[1], { level: 2, hours: 20, quality: 3, cost: 50000, requiredTools: ['jewelryBench', 'benchPeg'] });
  assert.deepEqual(rows[7], {
    level: 8,
    hours: 420,
    quality: 20,
    cost: 850000,
    requiredTools: ['jewelryBench', 'benchPeg', 'piercingSaw', 'file', 'pliers', 'nipper', 'hammer', 'torch', 'graver', 'dividers', 'rotaryTool', 'buffer', 'ultrasonicCleaner', 'electronicScale', 'magnifier', 'engravingBlock', 'stamps', 'milgrainTool', 'polishingMachine', 'rollingMill'],
  });
  assert.deepEqual(rows[19], { level: 20, hours: 4500, quality: 66, cost: 14000000, requiredTools: [] });
}

function testWorkshopLevelClampAndRequirementLookup() {
  assert.equal(makeHarness({ level: 0 }).level(), 1);
  assert.equal(makeHarness({ level: 7.9 }).level(), 7);
  assert.equal(makeHarness({ level: 99 }).level(), 20);
  const h = makeHarness({ level: 1 });
  assert.equal(plain(h.requirement(2)).cost, 50000);
  assert.equal(h.requirement(21), null);
}

function testCumulativeToolsRemainRequiredThroughHigherLevels() {
  const h = makeHarness({ level: 8 });
  const tools = plain(h.cumulative(9));
  assert.equal(tools.length, 20);
  assert.ok(tools.includes('jewelryBench'));
  assert.ok(tools.includes('benchPeg'));
  assert.ok(tools.includes('polishingMachine'));
  assert.ok(tools.includes('rollingMill'));
}

function testExactLevelTwoThresholdIsEligible() {
  const h = makeHarness({ level: 1, activeHours: 20, quality: 3, money: 50000, paidThroughLevel: 1, operating: true });
  const status = plain(h.status());
  assert.equal(status.current, 1);
  assert.equal(status.requirement.level, 2);
  assert.equal(status.cost, 50000);
  assert.equal(status.alreadyPaid, false);
  assert.deepEqual(status.conditions.map((row) => row.id), ['hours', 'quality', 'tools']);
  assert.deepEqual(status.conditions.map((row) => row.met), [true, true, true]);
  assert.deepEqual(status.missingTools, []);
  assert.equal(status.complete, true);
}

function testEachUpgradeGateBlocksExpansion() {
  const cases = [
    { activeHours: 19 },
    { quality: 2 },
    { money: 49999 },
    { operating: false },
    { unusableTools: ['benchPeg'] },
  ];
  for (const overrides of cases) {
    const h = makeHarness(overrides);
    const before = plain(h.state);
    assert.equal(h.status().complete, false, `expected incomplete for ${JSON.stringify(overrides)}`);
    h.expand();
    assert.deepEqual(plain(h.state), before);
    assert.equal(h.calls.closeModal, 0);
    assert.deepEqual(h.calls.toasts, [['工房拡張の条件を満たしていません。', 'error']]);
    assert.equal(h.calls.feedback.length, 0);
    assert.equal(h.calls.finance.length, 0);
    assert.equal(h.calls.notifications.length, 0);
    assert.equal(h.calls.saves, 0);
    assert.equal(h.calls.renders, 0);
    assertNoTimeCost(h);
  }
}

function testHigherLevelStillRequiresCumulativeTools() {
  const h = makeHarness({ level: 8, activeHours: 560, quality: 23, money: 1200000, paidThroughLevel: 8, unusableTools: ['benchPeg'] });
  const status = plain(h.status());
  assert.equal(status.requirement.level, 9);
  assert.ok(status.missingTools.includes('benchPeg'));
  assert.equal(status.conditions.find((row) => row.id === 'tools').met, false);
  assert.equal(status.complete, false);
}

function testSuccessfulPaidExpansionProtectsMoneyLevelAndPersistence() {
  const h = makeHarness({ level: 1, peakLevel: 1, activeHours: 20, quality: 3, money: 150000, paidThroughLevel: 1 });
  h.expand();
  assert.equal(h.calls.closeModal, 1);
  assert.equal(h.state.game.money, 100000);
  assert.deepEqual(h.calls.feedback, [[-50000]]);
  assert.deepEqual(h.calls.finance, [['工房をレベル2へ拡張', 0, 50000]]);
  assert.equal(h.state.workshop.paidThroughLevel, 2);
  assert.equal(h.state.workshop.level, 2);
  assert.equal(h.state.workshop.peakLevel, 2);
  assert.deepEqual(h.calls.notifications, [['工房レベルが上がりました', '工房レベル2になりました。']]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(h.calls.toasts, [['工房レベル2になりました。', 'info', false]]);
  assert.equal(h.calls.renders, 1);
  assertNoTimeCost(h);
}

function testAlreadyPaidCompatibilityPathDoesNotChargeAgain() {
  const h = makeHarness({ level: 1, peakLevel: 4, activeHours: 20, quality: 3, money: 0, paidThroughLevel: 2 });
  const status = plain(h.status());
  assert.equal(status.alreadyPaid, true);
  assert.equal(status.cost, 0);
  assert.equal(status.complete, true);
  h.expand();
  assert.equal(h.calls.closeModal, 1);
  assert.equal(h.state.game.money, 0);
  assert.equal(h.calls.feedback.length, 0);
  assert.equal(h.calls.finance.length, 0);
  assert.equal(h.state.workshop.paidThroughLevel, 2);
  assert.equal(h.state.workshop.level, 2);
  assert.equal(h.state.workshop.peakLevel, 4);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.renders, 1);
  assertNoTimeCost(h);
}

function testLevelTwentyClosesModalWithoutMutation() {
  const h = makeHarness({ level: 20, peakLevel: 20, activeHours: 4500, quality: 66, money: 99999999, paidThroughLevel: 20 });
  const before = plain(h.state);
  const status = plain(h.status());
  assert.equal(status.requirement, null);
  assert.equal(status.complete, true);
  assert.equal(status.cost, 0);
  h.expand();
  assert.deepEqual(plain(h.state), before);
  assert.equal(h.calls.closeModal, 1);
  assert.equal(h.calls.feedback.length, 0);
  assert.equal(h.calls.finance.length, 0);
  assert.equal(h.calls.notifications.length, 0);
  assert.equal(h.calls.saves, 0);
  assert.equal(h.calls.toasts.length, 0);
  assert.equal(h.calls.renders, 0);
  assertNoTimeCost(h);
}

testExactRequirementTableIsProtected();
testWorkshopLevelClampAndRequirementLookup();
testCumulativeToolsRemainRequiredThroughHigherLevels();
testExactLevelTwoThresholdIsEligible();
testEachUpgradeGateBlocksExpansion();
testHigherLevelStillRequiresCumulativeTools();
testSuccessfulPaidExpansionProtectsMoneyLevelAndPersistence();
testAlreadyPaidCompatibilityPathDoesNotChargeAgain();
testLevelTwentyClosesModalWithoutMutation();

console.log('EXPAND WORKSHOP REGRESSION: PASS');
console.log('workshopUpgradeStatus()/expandWorkshop() current behavior protected: level 1-20 requirements, cumulative tools, hours/quality/money/operating gates, prepaid compatibility, money/finance, level/peak level, notification, save, toast, render, and no time cost.');
