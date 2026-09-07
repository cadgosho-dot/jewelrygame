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

const source = [
  extractFunction('artisanLevelForXp'),
  extractFunction('addArtisanXp'),
  extractFunction('applyArtisanLevelPenalty'),
  extractFunction('recoverArtisanLevelPenalty'),
].join('\n\n');

function createHarness(artisan = {}) {
  const notifications = [];
  const ctx = {
    state: {
      artisan: {
        xp: 0,
        level: 1,
        peakLevel: 1,
        levelPenalty: 0,
        ...artisan,
      },
    },
    artisanBaseLevelForXp: (xp) => Math.max(1, Math.min(20, Math.floor((Number(xp) || 0) / 100) + 1)),
    artisanTitle: (level) => `TITLE-${level}`,
    addNotification: (...args) => notifications.push(args),
    Math,
    Number,
    String,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'artisan-progression-production.js' });
  return { ctx, notifications };
}

function testArtisanLevelForXpAppliesPenaltyAndClamps() {
  const { ctx } = createHarness({ levelPenalty: 2 });
  assert.equal(ctx.artisanLevelForXp(500), 4);
  ctx.state.artisan.levelPenalty = 99;
  assert.equal(ctx.artisanLevelForXp(500), 1);
  ctx.state.artisan.levelPenalty = 0;
  assert.equal(ctx.artisanLevelForXp(99999), 20);
}

function testAddArtisanXpIgnoresInvalidOrNonPositiveGain() {
  const { ctx, notifications } = createHarness({ xp: 40, level: 1, peakLevel: 1 });
  for (const amount of [0, -3, NaN, null, undefined, 'bad']) ctx.addArtisanXp(amount);
  assert.equal(ctx.state.artisan.xp, 40);
  assert.equal(ctx.state.artisan.level, 1);
  assert.equal(ctx.state.artisan.peakLevel, 1);
  assert.deepEqual(notifications, []);
}

function testAddArtisanXpNormalizesAndAccumulatesXp() {
  const { ctx } = createHarness({ xp: 40, level: 1, peakLevel: 1 });
  ctx.addArtisanXp(60.9);
  assert.equal(ctx.state.artisan.xp, 100);
  assert.equal(ctx.state.artisan.level, 2);
  ctx.addArtisanXp('25.8');
  assert.equal(ctx.state.artisan.xp, 125);
  assert.equal(ctx.state.artisan.level, 2);
}

function testAddArtisanXpRecalculatesLevelAndPeakLevel() {
  const { ctx } = createHarness({ xp: 90, level: 1, peakLevel: 4, levelPenalty: 0 });
  ctx.addArtisanXp(210);
  assert.equal(ctx.state.artisan.xp, 300);
  assert.equal(ctx.state.artisan.level, 4);
  assert.equal(ctx.state.artisan.peakLevel, 4);
  ctx.state.artisan.peakLevel = 2;
  ctx.addArtisanXp(100);
  assert.equal(ctx.state.artisan.level, 5);
  assert.equal(ctx.state.artisan.peakLevel, 5);
}

function testAddArtisanXpNotifiesOnlyOnLevelIncrease() {
  const { ctx, notifications } = createHarness({ xp: 90, level: 1, peakLevel: 1 });
  ctx.addArtisanXp(5);
  assert.equal(notifications.length, 0);
  ctx.addArtisanXp(5);
  assert.equal(ctx.state.artisan.level, 2);
  assert.deepEqual(notifications, [[
    '職人レベルが上がりました',
    '職人レベル2（TITLE-2）になりました。',
  ]]);
}

function testApplyArtisanLevelPenaltyClampsAmountAndNotifiesOnDrop() {
  const { ctx, notifications } = createHarness({ xp: 500, level: 6, peakLevel: 6, levelPenalty: 0 });
  const level = ctx.applyArtisanLevelPenalty(99, '疲労');
  assert.equal(ctx.state.artisan.levelPenalty, 2);
  assert.equal(level, 4);
  assert.equal(ctx.state.artisan.level, 4);
  assert.deepEqual(notifications, [[
    '職人レベルが低下しました',
    '疲労 Lv.6 → Lv.4',
    'warning',
  ]]);
}

function testApplyArtisanLevelPenaltyUsesMinimumOne() {
  const { ctx } = createHarness({ xp: 300, level: 4, peakLevel: 4, levelPenalty: 0 });
  ctx.applyArtisanLevelPenalty(0);
  assert.equal(ctx.state.artisan.levelPenalty, 1);
  assert.equal(ctx.state.artisan.level, 3);
}

function testRecoverArtisanLevelPenaltyFloorsAtZeroUpdatesPeakAndNotifies() {
  const { ctx, notifications } = createHarness({ xp: 500, level: 4, peakLevel: 4, levelPenalty: 2 });
  const level = ctx.recoverArtisanLevelPenalty(99, '休養');
  assert.equal(ctx.state.artisan.levelPenalty, 0);
  assert.equal(level, 6);
  assert.equal(ctx.state.artisan.level, 6);
  assert.equal(ctx.state.artisan.peakLevel, 6);
  assert.deepEqual(notifications, [[
    '職人レベルが回復しました',
    '休養 Lv.4 → Lv.6',
    'success',
  ]]);
}

function testPenaltyAndRecoveryDoNotNotifyWithoutLevelChange() {
  const { ctx, notifications } = createHarness({ xp: 0, level: 1, peakLevel: 1, levelPenalty: 0 });
  ctx.applyArtisanLevelPenalty(1);
  assert.equal(ctx.state.artisan.level, 1);
  assert.equal(notifications.length, 0);
  ctx.recoverArtisanLevelPenalty(1);
  assert.equal(ctx.state.artisan.level, 1);
  assert.equal(ctx.state.artisan.levelPenalty, 0);
  assert.equal(notifications.length, 0);
}

const tests = [
  testArtisanLevelForXpAppliesPenaltyAndClamps,
  testAddArtisanXpIgnoresInvalidOrNonPositiveGain,
  testAddArtisanXpNormalizesAndAccumulatesXp,
  testAddArtisanXpRecalculatesLevelAndPeakLevel,
  testAddArtisanXpNotifiesOnlyOnLevelIncrease,
  testApplyArtisanLevelPenaltyClampsAmountAndNotifiesOnDrop,
  testApplyArtisanLevelPenaltyUsesMinimumOne,
  testRecoverArtisanLevelPenaltyFloorsAtZeroUpdatesPeakAndNotifies,
  testPenaltyAndRecoveryDoNotNotifyWithoutLevelChange,
];

for (const test of tests) {
  test();
  console.log(`PASS: ${test.name}`);
}
console.log('ARTISAN PROGRESSION REGRESSION: PASS');
