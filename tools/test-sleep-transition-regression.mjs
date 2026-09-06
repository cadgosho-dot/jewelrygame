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

const source = extractFunction('beginSleepTransition');

function createClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    values,
  };
}

function harness(options = {}) {
  const calls = [];
  const initialState = structuredClone(options.state || {
    game: { day: 3, money: 10000 },
    marker: 'before-sleep',
  });
  const classList = createClassList();
  let ctx;
  ctx = {
    sleepTransitioning: Boolean(options.sleepTransitioning),
    canSleepNow: () => options.canSleepNow ?? true,
    closeModal: () => calls.push(['closeModal']),
    showToast: (message, type) => calls.push(['toast', message, type]),
    sleepRestrictionMessage: () => 'sleep blocked',
    sleepCurtainEl: { classList },
    requestAnimationFrame: (callback) => { calls.push(['raf']); callback(); return 1; },
    state: initialState,
    structuredClone,
    markNightTransitionCheckpoint: () => calls.push(['checkpoint']),
    flushAutosaveLocally: (reason) => calls.push(['flushAutosaveLocally', reason]),
    switchAudio: async (scene) => {
      calls.push(['switchAudio', scene]);
      if (options.audioError) throw options.audioError;
    },
    isAlienAbducted: () => Boolean(options.alien),
    wait: async (milliseconds) => { calls.push(['wait', milliseconds]); },
    settleDay: (payload) => {
      calls.push(['settleDay', structuredClone(payload)]);
      if (options.settleDayMutate) options.settleDayMutate(ctx.state);
      if (options.settleDayError) throw options.settleDayError;
      return Promise.resolve(options.settleDayResult);
    },
    pendingDayMoneyDelta: Number(options.pendingDayMoneyDelta || 0),
    startMoneyFeedback: (amount, duration) => calls.push(['moneyFeedback', amount, duration]),
    render: () => calls.push(['render']),
    screen: options.screen || 'workshop',
    screenData: structuredClone(options.screenData || { sample: true }),
    navigation: structuredClone(options.navigation || ['main', 'workshop']),
    saveGame: () => { calls.push(['saveGame']); return Promise.resolve(); },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:sleep-transition' });
  return { ctx, calls, classList, initialState: structuredClone(initialState) };
}

function hasCall(calls, expected) {
  return calls.some((call) => JSON.stringify(call) === JSON.stringify(expected));
}

async function testTransitionGuardBlocksDuplicateSleep() {
  const { ctx, calls } = harness({ sleepTransitioning: true });
  await ctx.beginSleepTransition();
  assert.equal(ctx.sleepTransitioning, true);
  assert.equal(calls.length, 0);
}

async function testRegularSleepGuardShowsRestriction() {
  const { ctx, calls, classList } = harness({ canSleepNow: false });
  await ctx.beginSleepTransition();
  assert.equal(ctx.sleepTransitioning, false);
  assert.ok(hasCall(calls, ['closeModal']));
  assert.ok(hasCall(calls, ['toast', 'sleep blocked', 'error']));
  assert.equal(calls.some((call) => call[0] === 'checkpoint'), false);
  assert.equal(calls.some((call) => call[0] === 'settleDay'), false);
  assert.equal(classList.values.size, 0);
}

async function testSuccessfulSleepCreatesCheckpointAndSettlesDay() {
  const { ctx, calls, classList } = harness({
    pendingDayMoneyDelta: 300,
    settleDayMutate: (state) => { state.game.day += 1; },
  });
  await ctx.beginSleepTransition();
  assert.equal(ctx.sleepTransitioning, false);
  assert.equal(ctx.state.game.day, 4);
  assert.ok(hasCall(calls, ['closeModal']));
  assert.ok(hasCall(calls, ['checkpoint']));
  assert.ok(hasCall(calls, ['flushAutosaveLocally', 'sleep-checkpoint']));
  assert.ok(hasCall(calls, ['switchAudio', 'sleep']));
  assert.ok(hasCall(calls, ['settleDay', { hospitalCheck: true }]));
  assert.ok(hasCall(calls, ['moneyFeedback', 300, 1200]));
  assert.equal(ctx.pendingDayMoneyDelta, 0);
  assert.equal(calls.some((call) => call[0] === 'render'), true);
  assert.equal(calls.some((call) => call[0] === 'saveGame'), false);
  assert.equal(classList.contains('active'), false);
  assert.equal(classList.contains('sleep-starting'), false);
  const checkpointIndex = calls.findIndex((call) => call[0] === 'checkpoint');
  const flushIndex = calls.findIndex((call) => call[0] === 'flushAutosaveLocally');
  const settleIndex = calls.findIndex((call) => call[0] === 'settleDay');
  assert.ok(checkpointIndex >= 0 && flushIndex > checkpointIndex && settleIndex > flushIndex);
}

async function testAllowEarlyBypassesRestrictionAndUsesSpaceAudio() {
  const { ctx, calls } = harness({ canSleepNow: false, alien: true });
  await ctx.beginSleepTransition({ allowEarly: true });
  assert.equal(calls.some((call) => call[0] === 'toast'), false);
  assert.ok(hasCall(calls, ['switchAudio', 'space']));
  assert.ok(hasCall(calls, ['settleDay', { hospitalCheck: true }]));
  assert.equal(ctx.sleepTransitioning, false);
}

async function testSettlementFailureRollsBackStateAndUnlocks() {
  const state = { game: { day: 8, money: 4321 }, nested: { value: 'original' } };
  const { ctx, calls, classList, initialState } = harness({
    state,
    screen: 'store',
    screenData: { branch: 2 },
    navigation: ['main', 'store'],
    pendingDayMoneyDelta: 250,
    settleDayMutate: (current) => {
      current.game.day = 99;
      current.nested.value = 'mutated';
    },
    settleDayError: new Error('settlement failed'),
  });
  await ctx.beginSleepTransition();
  assert.deepEqual(structuredClone(ctx.state), initialState);
  assert.equal(ctx.screen, 'main');
  assert.deepEqual(structuredClone(ctx.screenData), {});
  assert.deepEqual(structuredClone(ctx.navigation), []);
  assert.equal(ctx.pendingDayMoneyDelta, 0);
  assert.ok(hasCall(calls, ['saveGame']));
  assert.ok(hasCall(calls, ['toast', '翌日の処理を中断し、暗転前の状態へ戻しました。', 'error']));
  assert.equal(calls.some((call) => call[0] === 'render'), true);
  assert.equal(ctx.sleepTransitioning, false);
  assert.equal(classList.contains('active'), false);
  assert.equal(classList.contains('sleep-starting'), false);
}

for (const test of [
  testTransitionGuardBlocksDuplicateSleep,
  testRegularSleepGuardShowsRestriction,
  testSuccessfulSleepCreatesCheckpointAndSettlesDay,
  testAllowEarlyBypassesRestrictionAndUsesSpaceAudio,
  testSettlementFailureRollsBackStateAndUnlocks,
]) {
  await test();
  console.log(`OK: ${test.name}`);
}

console.log('SLEEP TRANSITION REGRESSION: PASS');
