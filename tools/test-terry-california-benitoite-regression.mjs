#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

function extractFunction(name) {
  const re = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, 'm');
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

const PRICE = 12345;
const GEM_ID = 'benitoite';
const SHAPE_ID = 'oval';
const source = `
const TERRY_CALIFORNIA_BENITOITE_PRICE = ${PRICE};
const TERRY_CALIFORNIA_GEM_ID = '${GEM_ID}';
const TERRY_CALIFORNIA_GEM_SHAPE = '${SHAPE_ID}';
${extractFunction('buyTerryCaliforniaBenitoite')}
`;

function createHarness({ active = true, stage = 'offer', rewardGranted = false, lastOutcome = '', money = PRICE * 2, loose = {} } = {}) {
  const eventState = { active, stage, rewardGranted, lastOutcome };
  const finance = [];
  const feedback = [];
  const notifications = [];
  const saves = [];
  const sfx = [];
  const vibrations = [];
  const renders = [];
  const toasts = [];
  const timeouts = [];
  const state = {
    game: { money },
    inventory: { loose },
  };
  const ctx = {
    state,
    terryCaliforniaEventState: () => eventState,
    addFinance: (...args) => finance.push(args),
    startMoneyFeedback: (...args) => feedback.push(args),
    addNotification: (...args) => notifications.push(args),
    saveGame: () => saves.push(true),
    playSfx: (...args) => sfx.push(args),
    vibrate: (...args) => vibrations.push(args),
    render: () => renders.push(true),
    showToast: (...args) => toasts.push(args),
    setTimeout: (fn, ms) => { timeouts.push(ms); fn(); return 1; },
    Math,
    Number,
    String,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'terry-california-benitoite-production.js' });
  return { ctx, eventState, finance, feedback, notifications, saves, sfx, vibrations, renders, toasts, timeouts };
}

function testInactiveEventDoesNothing() {
  const h = createHarness({ active: false, stage: 'offer' });
  h.ctx.buyTerryCaliforniaBenitoite();
  assert.equal(h.ctx.state.game.money, PRICE * 2);
  assert.deepEqual(h.ctx.state.inventory.loose, {});
  assert.equal(h.eventState.stage, 'offer');
  assert.equal(h.saves.length, 0);
  assert.equal(h.renders.length, 0);
}

function testWrongStageDoesNothing() {
  const h = createHarness({ active: true, stage: 'purchased' });
  h.ctx.buyTerryCaliforniaBenitoite();
  assert.equal(h.ctx.state.game.money, PRICE * 2);
  assert.deepEqual(h.ctx.state.inventory.loose, {});
  assert.equal(h.finance.length, 0);
  assert.equal(h.saves.length, 0);
}

function testInsufficientFundsAdvancesOnlyToInsufficientFunds() {
  const h = createHarness({ money: PRICE - 1 });
  h.ctx.buyTerryCaliforniaBenitoite();
  assert.equal(h.ctx.state.game.money, PRICE - 1);
  assert.equal(h.eventState.stage, 'insufficientFunds');
  assert.equal(h.eventState.rewardGranted, false);
  assert.equal(h.eventState.lastOutcome, '');
  assert.deepEqual(h.ctx.state.inventory.loose, {});
  assert.equal(h.finance.length, 0);
  assert.equal(h.feedback.length, 0);
  assert.equal(h.notifications.length, 0);
  assert.equal(h.saves.length, 1);
  assert.deepEqual(h.sfx, [['alarm', { gain: 0.52, rate: 0.92 }]]);
  assert.deepEqual(h.vibrations, [[38]]);
  assert.equal(h.renders.length, 1);
}

function testExactFundsPurchaseDeductsAndGrantsOnce() {
  const h = createHarness({ money: PRICE });
  h.ctx.buyTerryCaliforniaBenitoite();
  assert.equal(h.ctx.state.game.money, 0);
  assert.equal(h.ctx.state.inventory.loose[GEM_ID][SHAPE_ID], 1);
  assert.equal(h.eventState.rewardGranted, true);
  assert.equal(h.eventState.lastOutcome, 'purchased');
  assert.equal(h.eventState.stage, 'purchased');
  assert.deepEqual(h.finance, [['テリー・カリフォルニアからベニトアイト購入', 0, PRICE]]);
  assert.deepEqual(h.feedback, [[-PRICE, 1400]]);
  assert.deepEqual(h.notifications, [[
    'ベニトアイトを手に入れた',
    '工房のルースにベニトアイトを追加しました。テリー・カリフォルニアから特別価格で購入した希少石です。',
    'special',
  ]]);
  assert.equal(h.saves.length, 1);
  assert.deepEqual(h.toasts, [['ベニトアイトを手に入れた', 'success', false]]);
  assert.deepEqual(h.sfx, [
    ['coin', { gain: 0.92, rate: 1.02 }],
    ['loose-sparkle', { gain: 1.08 }],
  ]);
  assert.deepEqual(h.timeouts, [120]);
  assert.deepEqual(h.vibrations, [[[24, 24, 52]]]);
  assert.equal(h.renders.length, 1);
}

function testMissingLooseContainersAreCreated() {
  const h = createHarness({ loose: null });
  h.ctx.buyTerryCaliforniaBenitoite();
  assert.equal(h.ctx.state.inventory.loose[GEM_ID][SHAPE_ID], 1);
}

function testExistingLooseCountIsNormalizedBeforeIncrement() {
  const h = createHarness({ loose: { [GEM_ID]: { [SHAPE_ID]: '2.9' } } });
  h.ctx.buyTerryCaliforniaBenitoite();
  assert.equal(h.ctx.state.inventory.loose[GEM_ID][SHAPE_ID], 3);
}

function testNegativeLooseCountFloorsAtZeroBeforeIncrement() {
  const h = createHarness({ loose: { [GEM_ID]: { [SHAPE_ID]: -5 } } });
  h.ctx.buyTerryCaliforniaBenitoite();
  assert.equal(h.ctx.state.inventory.loose[GEM_ID][SHAPE_ID], 1);
}

function testRepeatedCallDoesNotDoubleChargeOrGrant() {
  const h = createHarness({ money: PRICE * 3, loose: { [GEM_ID]: { [SHAPE_ID]: 4 } } });
  h.ctx.buyTerryCaliforniaBenitoite();
  h.ctx.buyTerryCaliforniaBenitoite();
  assert.equal(h.ctx.state.game.money, PRICE * 2);
  assert.equal(h.ctx.state.inventory.loose[GEM_ID][SHAPE_ID], 5);
  assert.equal(h.finance.length, 1);
  assert.equal(h.notifications.length, 1);
  assert.equal(h.saves.length, 1);
}

const tests = [
  testInactiveEventDoesNothing,
  testWrongStageDoesNothing,
  testInsufficientFundsAdvancesOnlyToInsufficientFunds,
  testExactFundsPurchaseDeductsAndGrantsOnce,
  testMissingLooseContainersAreCreated,
  testExistingLooseCountIsNormalizedBeforeIncrement,
  testNegativeLooseCountFloorsAtZeroBeforeIncrement,
  testRepeatedCallDoesNotDoubleChargeOrGrant,
];

for (const test of tests) {
  test();
  console.log(`PASS: ${test.name}`);
}
console.log('TERRY CALIFORNIA BENITOITE REGRESSION: PASS');
