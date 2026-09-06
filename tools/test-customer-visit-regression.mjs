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

const source = [
  extractFunction('startCustomerVisit'),
  extractFunction('clearCustomerVisitsForIllness'),
  extractFunction('scheduleCustomerVisit'),
].join('\n\n');

function defaultState() {
  return {
    game: { day: 5 },
    customers: {
      alice: { met: true, lastVisitDay: 1, visiting: false, visitingBranchNumber: null, activeRequest: null, wishesHeard: true, proposedItemIds: ['old'] },
      bob: { met: false, lastVisitDay: 0, visiting: false, visitingBranchNumber: null, activeRequest: null, wishesHeard: true, proposedItemIds: ['old'] },
      brownBunny: { met: false, lastVisitDay: 0, visiting: false, visitingBranchNumber: null, activeRequest: null, wishesHeard: true, proposedItemIds: ['old'] },
      specialGuest: { met: false, lastVisitDay: 0, visiting: false, visitingBranchNumber: null, activeRequest: null, wishesHeard: true, proposedItemIds: ['old'] },
    },
  };
}

function harness(options = {}) {
  const calls = [];
  const state = structuredClone(options.state || defaultState());
  const branches = structuredClone(options.branches || [
    { number: 1, operating: true, visitorsToday: 0 },
    { number: 2, operating: true, visitorsToday: 3 },
    { number: 3, operating: true, visitorsToday: 1 },
  ]);
  const whiteBunnyEvent = { pendingCustomerVisit: Boolean(options.pendingWhiteBunny) };
  const customMath = Object.create(Math);
  customMath.random = () => Number(options.random ?? 0);
  const customers = options.customers || {
    alice: { name: 'Alice' },
    bob: { name: 'Bob' },
    brownBunny: { name: 'Brown Bunny', specialOnly: true },
    specialGuest: { name: 'Special Guest', specialOnly: true },
  };
  const visitBranchNumber = Number(options.visitBranchNumber || 1);

  const ctx = {
    state,
    CUSTOMERS: customers,
    CUSTOMER_REPEAT_COOLDOWN_DAYS: Number(options.cooldownDays ?? 3),
    CUSTOMER_REGULAR_VISIT_CHANCE: Number(options.regularChance ?? 0.60),
    CUSTOMER_FIRST_VISIT_CHANCE: Number(options.firstChance ?? 0.40),
    illnessEventSuppressionActive: () => Boolean(options.illness),
    pearlHumanEffectActive: () => Boolean(options.pearlHuman),
    schedulePearlHumanGuaranteedCustomer: (payload) => calls.push(['pearlHuman', structuredClone(payload)]),
    whiteBunnyIceEventState: () => whiteBunnyEvent,
    salesStoreBranch: () => options.noVisitBranch ? null : branches.find((branch) => Number(branch.number) === visitBranchNumber) || null,
    storeBusinessOpen: () => options.businessOpen ?? true,
    hasCraftedJewelry: () => options.hasCraftedJewelry ?? true,
    storeBranchByNumber: (number) => branches.find((branch) => Number(branch.number) === Number(number)) || null,
    storeBranchOperating: (branch) => Boolean(branch?.operating),
    customerVisitRequest: (customerId, branchNumber) => {
      calls.push(['request', customerId, branchNumber]);
      return { customerId, branchNumber, kind: 'visit-request' };
    },
    customerRequestSignature: (request) => `sig:${request.customerId}:${request.branchNumber}`,
    activeStoreStaff: () => options.hasStaff ? { id: 'staff-1' } : null,
    storeStaffCustomerVisitBonus: () => Number(options.employeeBonus ?? 0),
    clamp: (value, min, max) => {
      calls.push(['clamp', value, min, max]);
      return Math.max(min, Math.min(max, value));
    },
    randomFrom: (values) => {
      calls.push(['randomFrom', [...values]]);
      if (options.pickCustomer && values.includes(options.pickCustomer)) return options.pickCustomer;
      return values[0];
    },
    addNotification: (title, body, kind) => calls.push(['notification', title, body, kind]),
    storeBranchLabel: (number) => `${number}号店`,
    Math: customMath,
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:customer-visit' });
  return { ctx, calls, branches, whiteBunnyEvent };
}

function hasCall(calls, expected) {
  return calls.some((call) => JSON.stringify(call) === JSON.stringify(expected));
}

function testStartCustomerVisitInitializesVisitState() {
  const { ctx, calls, branches } = harness();
  const result = ctx.startCustomerVisit('alice', 2);
  assert.equal(result, true);
  const customer = structuredClone(ctx.state.customers.alice);
  assert.equal(customer.visiting, true);
  assert.equal(customer.visitingBranchNumber, 2);
  assert.deepEqual(customer.activeRequest, { customerId: 'alice', branchNumber: 2, kind: 'visit-request' });
  assert.equal(customer.lastRequestSignature, 'sig:alice:2');
  assert.equal(customer.wishesHeard, false);
  assert.deepEqual(customer.proposedItemIds, []);
  assert.equal(branches.find((branch) => branch.number === 2).visitorsToday, 4);
  assert.ok(hasCall(calls, ['request', 'alice', 2]));
}

function testStartCustomerVisitRejectsIllnessAndInvalidBranch() {
  const illness = harness({ illness: true });
  assert.equal(illness.ctx.startCustomerVisit('alice', 1), false);
  assert.equal(illness.ctx.state.customers.alice.visiting, false);
  assert.equal(illness.calls.some((call) => call[0] === 'request'), false);

  const invalid = harness({ branches: [{ number: 1, operating: false, visitorsToday: 0 }] });
  assert.equal(invalid.ctx.startCustomerVisit('alice', 1), false);
  assert.equal(invalid.ctx.state.customers.alice.visiting, false);
}

function testIllnessScheduleClearsExistingVisits() {
  const state = defaultState();
  state.customers.alice.visiting = true;
  state.customers.alice.visitingBranchNumber = 2;
  state.customers.alice.activeRequest = { old: true };
  const { ctx, calls } = harness({ state, illness: true });
  ctx.scheduleCustomerVisit();
  const customer = structuredClone(ctx.state.customers.alice);
  assert.equal(customer.visiting, false);
  assert.equal(customer.visitingBranchNumber, null);
  assert.equal(customer.activeRequest, null);
  assert.equal(customer.wishesHeard, false);
  assert.deepEqual(customer.proposedItemIds, []);
  assert.equal(calls.some((call) => call[0] === 'notification'), false);
}

function testPearlHumanScheduleDelegatesAndStops() {
  const { ctx, calls } = harness({ pearlHuman: true });
  ctx.scheduleCustomerVisit();
  assert.ok(hasCall(calls, ['pearlHuman', { preserveExistingToday: false }]));
  assert.equal(calls.some((call) => call[0] === 'randomFrom'), false);
  assert.equal(calls.some((call) => call[0] === 'notification'), false);
}

function testClosedOrUnreadyStoreClearsVisits() {
  const state = defaultState();
  state.customers.alice.visiting = true;
  state.customers.alice.visitingBranchNumber = 1;
  state.customers.alice.activeRequest = { old: true };
  const { ctx } = harness({ state, hasCraftedJewelry: false, pendingWhiteBunny: false });
  ctx.scheduleCustomerVisit();
  const customer = structuredClone(ctx.state.customers.alice);
  assert.equal(customer.visiting, false);
  assert.equal(customer.visitingBranchNumber, null);
  assert.equal(customer.activeRequest, null);
  assert.equal(customer.wishesHeard, false);
  assert.deepEqual(customer.proposedItemIds, []);
}

function testExistingVisitorPreventsDuplicateScheduling() {
  const state = defaultState();
  state.customers.alice.visiting = true;
  state.customers.alice.visitingBranchNumber = 1;
  const { ctx, calls } = harness({ state });
  ctx.scheduleCustomerVisit();
  assert.equal(ctx.state.customers.alice.visiting, true);
  assert.equal(calls.some((call) => call[0] === 'randomFrom'), false);
  assert.equal(calls.some((call) => call[0] === 'notification'), false);
}

function testPendingWhiteBunnyVisitBypassesCraftRequirement() {
  const { ctx, calls, whiteBunnyEvent } = harness({
    pendingWhiteBunny: true,
    hasCraftedJewelry: false,
    visitBranchNumber: 2,
  });
  ctx.scheduleCustomerVisit();
  assert.equal(ctx.state.customers.brownBunny.visiting, true);
  assert.equal(ctx.state.customers.brownBunny.visitingBranchNumber, 2);
  assert.equal(whiteBunnyEvent.pendingCustomerVisit, false);
  assert.ok(hasCall(calls, ['request', 'brownBunny', 2]));
  assert.equal(calls.some((call) => call[0] === 'notification' && call[1] === 'ブラウンバニーが来店しています' && call[3] === 'special'), true);
  assert.equal(calls.some((call) => call[0] === 'randomFrom'), false);
}

function testRegularScheduleUsesEligibleNormalCustomerAndStaffChance() {
  const state = defaultState();
  state.customers.alice.lastVisitDay = 4;
  const { ctx, calls } = harness({
    state,
    visitBranchNumber: 3,
    hasStaff: true,
    employeeBonus: 0.08,
    regularChance: 0.60,
    random: 0.20,
    pickCustomer: 'bob',
  });
  ctx.scheduleCustomerVisit();
  const randomCall = calls.find((call) => call[0] === 'randomFrom');
  assert.deepEqual(randomCall, ['randomFrom', ['bob']]);
  const clampCall = calls.find((call) => call[0] === 'clamp');
  assert.ok(clampCall);
  assert.ok(Math.abs(clampCall[1] - 0.83) < 1e-9);
  assert.deepEqual(clampCall.slice(2), [0, 0.90]);
  assert.equal(ctx.state.customers.bob.visiting, true);
  assert.equal(ctx.state.customers.bob.visitingBranchNumber, 3);
  assert.equal(ctx.state.customers.specialGuest.visiting, false);
  assert.equal(ctx.state.customers.brownBunny.visiting, false);
  assert.equal(calls.some((call) => call[0] === 'notification' && call[1] === 'お客様が来店しています'), true);
}

for (const test of [
  testStartCustomerVisitInitializesVisitState,
  testStartCustomerVisitRejectsIllnessAndInvalidBranch,
  testIllnessScheduleClearsExistingVisits,
  testPearlHumanScheduleDelegatesAndStops,
  testClosedOrUnreadyStoreClearsVisits,
  testExistingVisitorPreventsDuplicateScheduling,
  testPendingWhiteBunnyVisitBypassesCraftRequirement,
  testRegularScheduleUsesEligibleNormalCustomerAndStaffChance,
]) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('CUSTOMER VISIT REGRESSION: PASS');
