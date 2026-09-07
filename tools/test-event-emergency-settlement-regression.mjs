import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const match = new RegExp(`^(?:async\\s+)?function ${name}\\([^\\n]*\\) \\{`, 'm').exec(app);
  assert.ok(match, `${name} definition missing`);
  const start = match.index;
  const brace = start + match[0].length - 1;
  let depth = 0, quote = null, escaped = false, line = false, block = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i], next = app[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && next === '/') { block = false; i += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { line = true; i += 1; continue; }
    if (c === '/' && next === '*') { block = true; i += 1; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return app.slice(start, i + 1);
  }
  throw new Error(`${name} closing brace missing`);
}

const source = extractFunction('runEventEmergencySettlement');

function harness(options = {}) {
  const calls = [];
  const ownedTools = new Set(options.ownedTools || []);
  const ctx = {
    state: {
      game: { money: options.money ?? 200000 },
      inventory: { loose: {} },
    },
    activeEventState: null,
    kawaharaState: options.kawaharaState || { stage: 'idle', knowledgeId: '' },
    TATTOO_WOMAN_AMBER_EVENT_GEM_ID: 'amber',
    TATTOO_WOMAN_AMBER_EVENT_SHAPE_ID: 'cabochon',
    OKACHIMACHI_TOLL_EVENT_COST: 1000,
    GANESHA_TUSK_GEM_ID: 'ivory',
    YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID: 'roseQuartz',
    YOWAMUSHI_ROSE_QUARTZ_EVENT_SHAPE_ID: 'oval',
    HAUNTING_EVENT_COST: 5000,
    CINEMA_VISIT_EVENT_COST: 1800,
    CINEMA_VISIT_EVENT_HOURS: 2,
    APPRENTICE_CINEMA_EVENT_COST: 2400,
    APPRENTICE_CINEMA_EVENT_HOURS: 3,
    KAWAHARA_KNOWLEDGE_EVENT_SOURCE: '川原イベント',
    grantWesternUnionAntiqueDiamond: (eventState) => {
      if (eventState.rewardGranted) return false;
      eventState.rewardGranted = true;
      calls.push(['westernReward']);
      return true;
    },
    grantPazupan: (eventState) => {
      if (eventState.rewardGranted) return false;
      eventState.rewardGranted = true;
      calls.push(['pazupanReward']);
      return true;
    },
    grantMermaidPearl: (eventState) => {
      if (eventState.rewardGranted) return false;
      eventState.rewardGranted = true;
      calls.push(['mermaidReward']);
      return true;
    },
    adjustLooseInventory: (gemId, shapeId, delta) => {
      ctx.state.inventory.loose[gemId] ||= {};
      const before = Number(ctx.state.inventory.loose[gemId][shapeId] || 0);
      ctx.state.inventory.loose[gemId][shapeId] = before + Number(delta || 0);
      calls.push(['adjustLoose', gemId, shapeId, delta]);
      return delta;
    },
    addNotification: (...args) => calls.push(['notification', ...args]),
    addFinance: (...args) => calls.push(['finance', ...args]),
    grantEmergencyRough: (eventState, id, title, body) => {
      if (eventState.rewardGranted) return false;
      eventState.rewardGranted = true;
      calls.push(['roughReward', id, title, body]);
      return true;
    },
    grantEmergencyItem: (eventState, id, title, body) => {
      if (eventState.rewardGranted) return false;
      eventState.rewardGranted = true;
      calls.push(['itemReward', id, title, body]);
      return true;
    },
    toolOwned: (id) => ownedTools.has(id),
    grantDiamondPolishingLap: (eventState) => {
      eventState.rewardGranted = true;
      ownedTools.add('diamondPolishingLap');
      calls.push(['diamondLap']);
      return true;
    },
    settleMysteryChineseMealEmergency: (eventState) => {
      calls.push(['mysteryMeal']);
      if (eventState.mealApplied) return false;
      eventState.mealApplied = true;
      return options.mysteryChanged ?? true;
    },
    spendHours: (hours) => calls.push(['spendHours', hours]),
    yen: (amount) => `¥${Number(amount).toLocaleString('ja-JP')}`,
    kawaharaKnowledgeEventState: () => ctx.kawaharaState,
    grantProcessingKnowledge: (knowledgeId, sourceLabel) => calls.push(['knowledge', knowledgeId, sourceLabel]),
    applyStoreTheftEventLoss: () => {
      calls.push(['storeTheft']);
      if (ctx.activeEventState) ctx.activeEventState.theftApplied = true;
      return true;
    },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:event-emergency-settlement' });
  return { ctx, calls };
}

function count(calls, key) {
  return calls.filter((call) => call[0] === key).length;
}

function testInvalidArgumentsDoNothing() {
  const h = harness();
  assert.equal(h.ctx.runEventEmergencySettlement('', {}), false);
  assert.equal(h.ctx.runEventEmergencySettlement('westernUnionEvent', null), false);
  assert.deepEqual(h.calls, []);
}

function testWesternUnionStageGateAndIdempotency() {
  const h = harness();
  const eventState = { stage: 'choice', rewardGranted: false };
  assert.equal(h.ctx.runEventEmergencySettlement('westernUnionEvent', eventState), false);
  assert.equal(count(h.calls, 'westernReward'), 0);
  eventState.stage = 'gift';
  assert.equal(h.ctx.runEventEmergencySettlement('westernUnionEvent', eventState), true);
  assert.equal(eventState.rewardGranted, true);
  assert.equal(count(h.calls, 'westernReward'), 1);
  assert.equal(h.ctx.runEventEmergencySettlement('westernUnionEvent', eventState), false);
  assert.equal(count(h.calls, 'westernReward'), 1);
}

function testTollRewardAndPaymentApplyOnce() {
  const h = harness({ money: 10000 });
  const eventState = { stage: 'paymentDemand', rewardGranted: false, paymentApplied: false };
  assert.equal(h.ctx.runEventEmergencySettlement('okachimachiTollEvent', eventState), true);
  assert.equal(eventState.rewardGranted, true);
  assert.equal(eventState.paymentApplied, true);
  assert.equal(h.ctx.state.game.money, 9000);
  assert.equal(count(h.calls, 'roughReward'), 1);
  assert.equal(count(h.calls, 'finance'), 1);
  assert.equal(h.ctx.runEventEmergencySettlement('okachimachiTollEvent', eventState), false);
  assert.equal(h.ctx.state.game.money, 9000);
  assert.equal(count(h.calls, 'finance'), 1);
}

function testYowamushiRewardAddsOneLooseOnce() {
  const h = harness();
  const eventState = { stage: 'reward', rewardGranted: false };
  assert.equal(h.ctx.runEventEmergencySettlement('yowamushiRoseQuartzEvent', eventState), true);
  assert.equal(h.ctx.state.inventory.loose.roseQuartz.oval, 1);
  assert.equal(eventState.rewardGranted, true);
  assert.equal(count(h.calls, 'notification'), 1);
  assert.equal(h.ctx.runEventEmergencySettlement('yowamushiRoseQuartzEvent', eventState), false);
  assert.equal(h.ctx.state.inventory.loose.roseQuartz.oval, 1);
  assert.equal(count(h.calls, 'notification'), 1);
}

function testClockTowerDonationAppliesOnce() {
  const h = harness({ money: 150000 });
  const eventState = { stage: 'intro3', donationApplied: false };
  assert.equal(h.ctx.runEventEmergencySettlement('clockTowerDonationEvent', eventState), true);
  assert.equal(h.ctx.state.game.money, 50000);
  assert.equal(eventState.donationApplied, true);
  assert.equal(count(h.calls, 'finance'), 1);
  assert.equal(count(h.calls, 'notification'), 1);
  assert.equal(h.ctx.runEventEmergencySettlement('clockTowerDonationEvent', eventState), false);
  assert.equal(h.ctx.state.game.money, 50000);
  assert.equal(count(h.calls, 'finance'), 1);
}

function testCinemaInvitationDoesNotChargeOrSpendTime() {
  const h = harness({ money: 10000 });
  const eventState = { stage: 'invitation', settled: false, selectedVideo: 'movie-a' };
  assert.equal(h.ctx.runEventEmergencySettlement('cinemaVisitEvent', eventState), false);
  assert.equal(h.ctx.state.game.money, 10000);
  assert.equal(eventState.settled, false);
  assert.equal(eventState.selectedVideo, '');
  assert.equal(count(h.calls, 'spendHours'), 0);
  assert.equal(count(h.calls, 'finance'), 0);
}

function testCinemaPlayingSettlesOnce() {
  const h = harness({ money: 10000 });
  const eventState = { stage: 'playing', settled: false, selectedVideo: 'movie-a', lastVideo: '' };
  assert.equal(h.ctx.runEventEmergencySettlement('cinemaVisitEvent', eventState), true);
  assert.equal(h.ctx.state.game.money, 8200);
  assert.equal(eventState.settled, true);
  assert.equal(eventState.lastVideo, 'movie-a');
  assert.equal(eventState.selectedVideo, '');
  assert.deepEqual(h.calls.find((call) => call[0] === 'spendHours'), ['spendHours', 2]);
  assert.equal(count(h.calls, 'finance'), 1);
  assert.equal(h.ctx.runEventEmergencySettlement('cinemaVisitEvent', eventState), false);
  assert.equal(h.ctx.state.game.money, 8200);
  assert.equal(count(h.calls, 'spendHours'), 1);
  assert.equal(count(h.calls, 'finance'), 1);
}

function testApprenticeCinemaSettlementStages() {
  const h = harness({ money: 10000 });
  const eventState = { stage: 'outro1', settled: false, selectedVideo: 'training-movie', lastVideo: '' };
  assert.equal(h.ctx.runEventEmergencySettlement('apprenticeCinemaEvent', eventState), true);
  assert.equal(h.ctx.state.game.money, 7600);
  assert.equal(eventState.settled, true);
  assert.equal(eventState.lastVideo, 'training-movie');
  assert.equal(eventState.selectedVideo, '');
  assert.deepEqual(h.calls.find((call) => call[0] === 'spendHours'), ['spendHours', 3]);
  assert.equal(count(h.calls, 'finance'), 1);
}

function testMysteryMealDelegatesAndClearsSelection() {
  const h = harness();
  const eventState = { stage: 'eating', mealApplied: false, selectedDish: '麻婆豆腐' };
  assert.equal(h.ctx.runEventEmergencySettlement('mysteryChineseMealEvent', eventState), true);
  assert.equal(eventState.mealApplied, true);
  assert.equal(eventState.selectedDish, '');
  assert.equal(count(h.calls, 'mysteryMeal'), 1);
  assert.equal(h.ctx.runEventEmergencySettlement('mysteryChineseMealEvent', eventState), false);
  assert.equal(count(h.calls, 'mysteryMeal'), 2);
}

function testStoreTheftStageGateAndIdempotency() {
  const h = harness();
  const eventState = { stage: 'choice', theftApplied: false };
  h.ctx.activeEventState = eventState;
  assert.equal(h.ctx.runEventEmergencySettlement('storeTheftEvent', eventState), false);
  assert.equal(count(h.calls, 'storeTheft'), 0);
  eventState.stage = 'intro2';
  assert.equal(h.ctx.runEventEmergencySettlement('storeTheftEvent', eventState), true);
  assert.equal(eventState.theftApplied, true);
  assert.equal(count(h.calls, 'storeTheft'), 1);
  assert.equal(h.ctx.runEventEmergencySettlement('storeTheftEvent', eventState), false);
  assert.equal(count(h.calls, 'storeTheft'), 1);
}

function testKawaharaKnowledgeSettlementUsesNormalizedState() {
  const h = harness({ kawaharaState: { stage: 'reward', knowledgeId: 'stone-setting' } });
  const passedState = { stage: 'completed' };
  assert.equal(h.ctx.runEventEmergencySettlement('kawaharaKnowledgeEvent', passedState), false);
  assert.deepEqual(h.calls.find((call) => call[0] === 'knowledge'), ['knowledge', 'stone-setting', '川原イベント']);
}

function testInvasiveTurtlesEmergencySettlementIsNoOp() {
  const h = harness();
  assert.equal(h.ctx.runEventEmergencySettlement('okachimachiInvasiveTurtlesEvent', { stage: 'video' }), false);
  assert.deepEqual(h.calls, []);
}

for (const test of [
  testInvalidArgumentsDoNothing,
  testWesternUnionStageGateAndIdempotency,
  testTollRewardAndPaymentApplyOnce,
  testYowamushiRewardAddsOneLooseOnce,
  testClockTowerDonationAppliesOnce,
  testCinemaInvitationDoesNotChargeOrSpendTime,
  testCinemaPlayingSettlesOnce,
  testApprenticeCinemaSettlementStages,
  testMysteryMealDelegatesAndClearsSelection,
  testStoreTheftStageGateAndIdempotency,
  testKawaharaKnowledgeSettlementUsesNormalizedState,
  testInvasiveTurtlesEmergencySettlementIsNoOp,
]) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('EVENT EMERGENCY SETTLEMENT REGRESSION: PASS');
