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

const names = ['spendMinutes', 'spendHours'];
const source = names.map(extractFunction).join('\n');

function harness(options = {}) {
  const calls = [];
  const birthdayEvent = { restPending: false, triggerReason: '' };
  const branches = structuredClone(options.branches || [
    { id: 1, operating: true, openMinutesToday: 5 },
    { id: 2, operating: false, openMinutesToday: 7 },
  ]);
  const ctx = {
    DAY_END_MINUTES: 22 * 60,
    STORE_OPEN_MINUTES: 11 * 60,
    STORE_CLOSE_MINUTES: 19 * 60,
    state: structuredClone(options.state || {
      game: { minutes: 10 * 60 },
      wellbeing: { hunger: 7 },
    }),
    hungerLevel: () => Number(ctx.state.wellbeing.hunger) || 0,
    contractedStoreBranches: () => branches,
    storeBranchOperating: (branch) => branch.operating !== false,
    processWorkshopStaffElapsedTime: (before, after) => calls.push(`workshop:${before}:${after}`),
    closeVisitingCustomersAtStoreClosing: () => calls.push('close-store'),
    birthdaySleepAvailableToday: () => Boolean(options.birthday),
    birthdaySleepEventState: () => birthdayEvent,
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:spend-minutes' });
  return { ctx, calls, branches, birthdayEvent };
}

function testSpendMinutesAdvancesTimeHungerAndOperatingStoreMinutes() {
  const { ctx, calls, branches } = harness();
  ctx.spendMinutes(180);
  assert.equal(ctx.state.game.minutes, 13 * 60);
  assert.equal(ctx.state.wellbeing.hunger, 4);
  assert.equal(branches[0].openMinutesToday, 125);
  assert.equal(branches[1].openMinutesToday, 7);
  assert.deepEqual(calls, ['workshop:600:780']);
}

function testSpendMinutesClampsAtDayEnd() {
  const { ctx, calls } = harness({ state: { game: { minutes: 21 * 60 + 50 }, wellbeing: { hunger: 3 } } });
  ctx.spendMinutes(30, { consumeHunger: false });
  assert.equal(ctx.state.game.minutes, 22 * 60);
  assert.equal(ctx.state.wellbeing.hunger, 3);
  assert.deepEqual(calls, ['workshop:1310:1320']);
}

function testSpendMinutesClosesVisitorsWhenCrossingStoreClose() {
  const { ctx, calls, branches } = harness({ state: { game: { minutes: 18 * 60 + 30 }, wellbeing: { hunger: 5 } } });
  ctx.spendMinutes(60);
  assert.equal(ctx.state.game.minutes, 19 * 60 + 30);
  assert.equal(ctx.state.wellbeing.hunger, 4);
  assert.equal(branches[0].openMinutesToday, 35);
  assert.equal(branches[1].openMinutesToday, 7);
  assert.deepEqual(calls, ['workshop:1110:1170', 'close-store']);
}

function testSpendMinutesCanSkipHungerAndBirthdayRest() {
  const { ctx, birthdayEvent, branches } = harness({
    birthday: true,
    state: { game: { minutes: 10 * 60 + 30 }, wellbeing: { hunger: 1 } },
  });
  ctx.spendMinutes(60, { consumeHunger: false });
  assert.equal(ctx.state.game.minutes, 11 * 60 + 30);
  assert.equal(ctx.state.wellbeing.hunger, 1);
  assert.equal(branches[0].openMinutesToday, 35);
  assert.equal(birthdayEvent.restPending, false);
  assert.equal(birthdayEvent.triggerReason, '');
}

function testSpendMinutesMarksBirthdayRestPendingAtLowHunger() {
  const { ctx, birthdayEvent } = harness({
    birthday: true,
    state: { game: { minutes: 12 * 60 }, wellbeing: { hunger: 2 } },
  });
  ctx.spendMinutes(60);
  assert.equal(ctx.state.wellbeing.hunger, 1);
  assert.equal(birthdayEvent.restPending, true);
  assert.equal(birthdayEvent.triggerReason, 'energy');
}

function testSpendMinutesNormalizesNegativeAndFractionalInput() {
  const negative = harness({ state: { game: { minutes: 12 * 60 }, wellbeing: { hunger: 5 } } });
  negative.ctx.spendMinutes(-90);
  assert.equal(negative.ctx.state.game.minutes, 12 * 60);
  assert.equal(negative.ctx.state.wellbeing.hunger, 5);
  assert.deepEqual(negative.calls, ['workshop:720:720']);

  const rounded = harness({ state: { game: { minutes: 12 * 60 }, wellbeing: { hunger: 5 } } });
  rounded.ctx.spendMinutes(89.6);
  assert.equal(rounded.ctx.state.game.minutes, 13 * 60 + 30);
  assert.equal(rounded.ctx.state.wellbeing.hunger, 4);
}

function testSpendHoursRoundsAndDelegatesToMinutes() {
  const { ctx } = harness({ state: { game: { minutes: 12 * 60 }, wellbeing: { hunger: 6 } } });
  ctx.spendHours(1.6);
  assert.equal(ctx.state.game.minutes, 14 * 60);
  assert.equal(ctx.state.wellbeing.hunger, 4);
}

for (const test of [
  testSpendMinutesAdvancesTimeHungerAndOperatingStoreMinutes,
  testSpendMinutesClampsAtDayEnd,
  testSpendMinutesClosesVisitorsWhenCrossingStoreClose,
  testSpendMinutesCanSkipHungerAndBirthdayRest,
  testSpendMinutesMarksBirthdayRestPendingAtLowHunger,
  testSpendMinutesNormalizesNegativeAndFractionalInput,
  testSpendHoursRoundsAndDelegatesToMinutes,
]) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('SPEND MINUTES REGRESSION: PASS');