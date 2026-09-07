#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

function extractFunction(name) {
  const re = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm');
  const match = re.exec(APP);
  assert.ok(match, `${name}: production definition not found`);
  const brace = APP.indexOf('{', match.index);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < APP.length; i += 1) {
    const c = APP[i];
    const n = APP[i + 1];
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && n === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (c === '/' && n === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}' && --depth === 0) return APP.slice(match.index, i + 1);
  }
  throw new Error(`${name}: unterminated function`);
}

const source = extractFunction('maybeTriggerRobberyEvent');

function createHarness({
  illness = false,
  pendingReport = null,
  history = [],
  day = 100,
  branches = [{ id: '', number: 2 }],
  products = [
    { item: { id: 'ring-1', name: 'ルビーリング' }, sellingPrice: 5000 },
    { item: { id: 'pendant-1', name: 'サファイアペンダント' }, sellingPrice: 1234.4 },
  ],
  hasWoodSword = false,
  dailyChance = 0.2,
  woodSwordMultiplier = 0.25,
  historyLimit = 30,
} = {}) {
  const robbery = {
    pendingReport,
    lastTriggeredDay: 0,
    history: structuredClone(history),
  };
  const removals = [];
  const mirrors = [];
  const notifications = [];
  const branchCalls = [];
  const candidateProducts = products.map((entry) => ({ item: { ...entry.item }, sellingPrice: entry.sellingPrice }));
  const branchObjects = branches.map((branch) => ({ ...branch }));
  const currentBranch = { id: 'current', number: 1 };
  const state = { game: { day } };
  const ctx = {
    state,
    ROBBERY_DAILY_CHANCE: dailyChance,
    WOOD_SWORD_ROBBERY_MULTIPLIER: woodSwordMultiplier,
    ROBBERY_HISTORY_LIMIT: historyLimit,
    illnessEventSuppressionActive: () => illness,
    robberyEventState: () => robbery,
    contractedStoreBranches: () => branchObjects,
    robberyItemsInBranch: (branch) => {
      branchCalls.push(branch);
      return branch.number === branchObjects[0]?.number ? candidateProducts : [];
    },
    hasBokuto: () => hasWoodSword,
    randomFrom: (entries, fallback) => entries[0] || fallback,
    storeBranchLabel: (number) => `第${number}店舗`,
    uid: () => 'uid-fixed',
    removeJewelry: (id) => {
      const entry = candidateProducts.find(({ item }) => item.id === id);
      removals.push({ id, snapshot: structuredClone(entry?.item || null) });
    },
    mirrorCurrentStoreDisplay: (branch) => mirrors.push(branch),
    currentStoreBranch: () => currentBranch,
    addNotification: (...args) => notifications.push(args),
    yen: (value) => `¥${Number(value).toLocaleString('ja-JP')}`,
    Math,
    Number,
    String,
    structuredClone,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'robbery-event-production.js' });
  return { ctx, robbery, removals, mirrors, notifications, branchCalls, candidateProducts, currentBranch };
}

function testIllnessSuppressionReturnsFalseWithoutMutation() {
  const h = createHarness({ illness: true });
  assert.equal(h.ctx.maybeTriggerRobberyEvent(0), false);
  assert.equal(h.branchCalls.length, 0);
  assert.equal(h.removals.length, 0);
  assert.equal(h.robbery.history.length, 0);
  assert.equal(h.notifications.length, 0);
}

function testPendingReportPreventsSecondRobbery() {
  const pending = { id: 'existing-report' };
  const h = createHarness({ pendingReport: pending });
  assert.equal(h.ctx.maybeTriggerRobberyEvent(0), null);
  assert.equal(h.robbery.pendingReport, pending);
  assert.equal(h.branchCalls.length, 0);
  assert.equal(h.removals.length, 0);
  assert.equal(h.notifications.length, 0);
}

function testNoCandidatesOrFailedRollDoesNothing() {
  const empty = createHarness({ products: [] });
  assert.equal(empty.ctx.maybeTriggerRobberyEvent(0), null);
  assert.equal(empty.removals.length, 0);
  assert.equal(empty.robbery.pendingReport, null);

  const failedRoll = createHarness({ dailyChance: 0.2 });
  assert.equal(failedRoll.ctx.maybeTriggerRobberyEvent(0.2), null);
  assert.equal(failedRoll.removals.length, 0);
  assert.equal(failedRoll.robbery.history.length, 0);
  assert.equal(failedRoll.notifications.length, 0);
}

function testWoodSwordChanceMultiplierIsApplied() {
  const guarded = createHarness({ hasWoodSword: true, dailyChance: 0.2, woodSwordMultiplier: 0.25 });
  assert.equal(guarded.ctx.maybeTriggerRobberyEvent(0.06), null);
  assert.equal(guarded.removals.length, 0);

  const unguarded = createHarness({ hasWoodSword: false, dailyChance: 0.2, woodSwordMultiplier: 0.25 });
  assert.ok(unguarded.ctx.maybeTriggerRobberyEvent(0.06));
  assert.equal(unguarded.removals.length, 2);
}

function testSuccessfulRobberyRemovesAllItemsAndBuildsReport() {
  const h = createHarness({ day: 100 });
  const report = h.ctx.maybeTriggerRobberyEvent(0);
  assert.ok(report);
  assert.equal(report.id, 'robbery-100-uid-fixed');
  assert.equal(report.incidentDay, 99);
  assert.equal(report.reportDay, 100);
  assert.equal(report.branchId, 'branch-2');
  assert.equal(report.branchNumber, 2);
  assert.equal(report.branchLabel, '第2店舗');
  assert.equal(report.itemCount, 2);
  assert.equal(report.lossAmount, 6234);
  assert.deepEqual(Array.from(report.itemNames), ['ルビーリング', 'サファイアペンダント']);
  assert.equal(report.stage, 'waitingMorning');

  assert.deepEqual(h.removals.map((entry) => entry.id), ['ring-1', 'pendant-1']);
  assert.equal(h.removals[0].snapshot.stolenDay, 100);
  assert.equal(h.removals[0].snapshot.stolenBranchNumber, 2);
  assert.equal(h.removals[0].snapshot.stolenLossValue, 5000);
  assert.equal(h.removals[1].snapshot.stolenLossValue, 1234);
  assert.equal(h.mirrors.length, 1);
  assert.equal(h.mirrors[0], h.currentBranch);

  assert.equal(h.robbery.lastTriggeredDay, 100);
  assert.equal(h.robbery.pendingReport, report);
  assert.equal(h.robbery.history.length, 1);
  assert.deepEqual(h.robbery.history[0], structuredClone(report));
  assert.notEqual(h.robbery.history[0], report);
  assert.equal(h.notifications.length, 1);
  assert.equal(h.notifications[0][0], '強盗事件が発生しました');
  assert.match(h.notifications[0][1], /第2店舗/);
  assert.match(h.notifications[0][1], /完成品2点/);
  assert.match(h.notifications[0][1], /¥6,234/);
  assert.equal(h.notifications[0][2], 'warning');
}

function testHistoryIsTrimmedToConfiguredLimit() {
  const h = createHarness({
    history: [{ id: 'old-1' }, { id: 'old-2' }, { id: 'old-3' }],
    historyLimit: 3,
  });
  const report = h.ctx.maybeTriggerRobberyEvent(0);
  assert.ok(report);
  assert.equal(h.robbery.history.length, 3);
  assert.deepEqual(h.robbery.history.map((entry) => entry.id), ['old-2', 'old-3', report.id]);
}

function testImmediateSecondCallCannotDoubleRemoveOrNotify() {
  const h = createHarness();
  const first = h.ctx.maybeTriggerRobberyEvent(0);
  assert.ok(first);
  const second = h.ctx.maybeTriggerRobberyEvent(0);
  assert.equal(second, null);
  assert.equal(h.removals.length, 2);
  assert.equal(h.robbery.history.length, 1);
  assert.equal(h.notifications.length, 1);
  assert.equal(h.robbery.pendingReport, first);
}

const tests = [
  testIllnessSuppressionReturnsFalseWithoutMutation,
  testPendingReportPreventsSecondRobbery,
  testNoCandidatesOrFailedRollDoesNothing,
  testWoodSwordChanceMultiplierIsApplied,
  testSuccessfulRobberyRemovesAllItemsAndBuildsReport,
  testHistoryIsTrimmedToConfiguredLimit,
  testImmediateSecondCallCannotDoubleRemoveOrNotify,
];

for (const test of tests) {
  test();
  console.log(`PASS: ${test.name}`);
}
console.log('ROBBERY EVENT REGRESSION: PASS');
