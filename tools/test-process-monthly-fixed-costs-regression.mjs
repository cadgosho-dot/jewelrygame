import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const re = new RegExp(`(?:^|\\n)function\\s+${name}\\s*\\([^\\n]*\\)\\s*\\{`, 'm');
  const m = re.exec(app);
  assert.ok(m, `${name} definition not found`);
  const start = m.index + (m[0].startsWith('\n') ? 1 : 0);
  const brace = app.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escape = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return app.slice(start, i + 1);
    }
  }
  throw new Error(`${name} end not found`);
}

const source = extractFunction('processMonthlyFixedCosts');
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeHarness(overrides = {}) {
  const calls = { fixed: [], notifications: [] };
  const today = overrides.today || new Date(2026, 3, 1, 12, 0, 0, 0);
  const start = overrides.start || new Date(2026, 0, 15, 12, 0, 0, 0);
  const state = {
    business: {
      lastProcessedMonth: '',
      workshopUnpaid: 0,
      workshopSuspended: false,
      monthlyReports: [],
    },
    store: { branches: [] },
    tools: { morningMessages: [] },
  };
  if (overrides.business) Object.assign(state.business, structuredClone(overrides.business));
  if (overrides.branches) state.store.branches = structuredClone(overrides.branches);
  if (overrides.morningMessages) state.tools.morningMessages = structuredClone(overrides.morningMessages);

  const contractDates = overrides.contractDates || {};
  const context = {
    state,
    WORKSHOP_MONTHLY_COST: overrides.workshopCost ?? 30000,
    MIN_LIVING_CASH_RESERVE: overrides.reserve ?? 50000,
    gameDate: () => new Date(today.getTime()),
    previousMonthKey: (date) => {
      const previous = new Date(date.getFullYear(), date.getMonth() - 1, 1, 12, 0, 0, 0);
      return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
    },
    parseGameStartDate: () => new Date(start.getTime()),
    monthIndex: (date) => date.getFullYear() * 12 + date.getMonth(),
    gameDateForDay: (day) => new Date((contractDates[day] || new Date(2026, 0, 1, 12, 0, 0, 0)).getTime()),
    storeMonthlyRent: (number) => number * 10000,
    storeBranchLabel: (number) => `第${number}号店`,
    payFixedCost: (label, amount, onUnpaid) => {
      calls.fixed.push([label, amount]);
      const result = overrides.paymentPolicy
        ? overrides.paymentPolicy(label, amount, calls.fixed.length - 1)
        : { paid: amount, unpaid: 0 };
      if (result.unpaid > 0) onUnpaid(result.unpaid);
      return result;
    },
    yen: (amount) => `Y${amount}`,
    addNotification: (...args) => calls.notifications.push(args),
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__processMonthlyFixedCosts = processMonthlyFixedCosts;`, context);
  return { state, calls, process: context.__processMonthlyFixedCosts };
}

function testNonFirstDayDoesNothing() {
  const h = makeHarness({ today: new Date(2026, 3, 2, 12, 0, 0, 0) });
  const result = h.process();
  assert.equal(result, null);
  assert.deepEqual(h.calls.fixed, []);
  assert.deepEqual(h.calls.notifications, []);
  assert.equal(h.state.business.lastProcessedMonth, '');
  assert.deepEqual(h.state.business.monthlyReports, []);
}

function testAlreadyProcessedMonthDoesNothing() {
  const h = makeHarness({ business: { lastProcessedMonth: '2026-03' } });
  const result = h.process();
  assert.equal(result, null);
  assert.deepEqual(h.calls.fixed, []);
  assert.deepEqual(h.calls.notifications, []);
  assert.deepEqual(h.state.business.monthlyReports, []);
}

function testSuccessfulMonthlyProcessing() {
  const h = makeHarness({
    branches: [
      { number: 2, rentedDay: 20, unpaidRent: 0, suspended: false },
      { number: 1, rentedDay: 10, unpaidRent: 0, suspended: false },
    ],
    contractDates: {
      10: new Date(2026, 1, 10, 12, 0, 0, 0),
      20: new Date(2026, 0, 20, 12, 0, 0, 0),
    },
  });
  const report = plain(h.process());
  assert.deepEqual(h.calls.fixed, [
    ['2026-03 工房維持費', 30000],
    ['2026-03 第1号店家賃', 10000],
    ['2026-03 第2号店家賃', 20000],
  ]);
  assert.deepEqual(report, {
    month: '2026-03',
    workshop: 30000,
    rents: [
      { branchNumber: 1, amount: 10000, paid: 10000, unpaid: 0 },
      { branchNumber: 2, amount: 20000, paid: 20000, unpaid: 0 },
    ],
    paid: 60000,
    unpaid: 0,
  });
  assert.equal(h.state.business.lastProcessedMonth, '2026-03');
  assert.deepEqual(plain(h.state.business.monthlyReports.at(-1)), report);
  assert.equal(h.state.store.branches[0].suspended, false);
  assert.equal(h.state.store.branches[1].suspended, false);
  assert.deepEqual(h.calls.notifications, [
    ['月初の固定費', '2026-03分の固定費 Y60000を支払いました。', 'info'],
  ]);
  assert.deepEqual(plain(h.state.tools.morningMessages), [
    '工房維持費 Y30000を支払いました。',
    '店舗家賃 Y30000を支払いました。',
  ]);
}

function testGracePeriodsSkipCosts() {
  const h = makeHarness({
    start: new Date(2026, 1, 15, 12, 0, 0, 0),
    branches: [{ number: 1, rentedDay: 30, unpaidRent: 0, suspended: false }],
    contractDates: { 30: new Date(2026, 2, 15, 12, 0, 0, 0) },
  });
  const report = plain(h.process());
  assert.deepEqual(h.calls.fixed, []);
  assert.deepEqual(report, { month: '2026-03', workshop: 0, rents: [], paid: 0, unpaid: 0 });
  assert.equal(h.state.business.lastProcessedMonth, '2026-03');
  assert.deepEqual(h.calls.notifications, [['月初の固定費', '2026-03分の固定費 Y0を支払いました。', 'info']]);
  assert.deepEqual(plain(h.state.tools.morningMessages), []);
}

function testUnpaidCostsSuspendWorkshopAndStore() {
  const h = makeHarness({
    business: { workshopUnpaid: 500 },
    branches: [{ number: 1, rentedDay: 10, unpaidRent: 100, suspended: false }],
    contractDates: { 10: new Date(2026, 1, 10, 12, 0, 0, 0) },
    paymentPolicy: (_label, amount) => amount === 30000
      ? { paid: 10000, unpaid: 20000 }
      : { paid: 4000, unpaid: 6000 },
  });
  const report = plain(h.process());
  assert.equal(h.state.business.workshopUnpaid, 20500);
  assert.equal(h.state.business.workshopSuspended, true);
  assert.equal(h.state.store.branches[0].unpaidRent, 6100);
  assert.equal(h.state.store.branches[0].suspended, true);
  assert.deepEqual(report, {
    month: '2026-03', workshop: 30000,
    rents: [{ branchNumber: 1, amount: 10000, paid: 4000, unpaid: 6000 }],
    paid: 14000, unpaid: 26000,
  });
  assert.deepEqual(h.calls.notifications, [[
    '月初の固定費',
    '2026-03分の固定費を処理しました。生活費Y50000を残し、未払いはY26000です。',
    'warning',
  ]]);
  assert.deepEqual(plain(h.state.tools.morningMessages), [
    '工房維持費 Y30000の支払い後、未払い残高はY20500です。',
    '店舗家賃 Y10000のうちY4000を支払い、Y6000が未払いです。',
  ]);
}

function testHistoryAndMorningMessageBounds() {
  const reports = Array.from({ length: 24 }, (_, index) => ({ month: `old-${index}` }));
  const messages = Array.from({ length: 9 }, (_, index) => `old-${index}`);
  const h = makeHarness({
    business: { monthlyReports: reports },
    morningMessages: messages,
    branches: [{ number: 1, rentedDay: 10, unpaidRent: 0, suspended: false }],
    contractDates: { 10: new Date(2026, 1, 10, 12, 0, 0, 0) },
  });
  h.process();
  assert.equal(h.state.business.monthlyReports.length, 24);
  assert.equal(h.state.business.monthlyReports[0].month, 'old-1');
  assert.equal(h.state.business.monthlyReports.at(-1).month, '2026-03');
  assert.equal(h.state.tools.morningMessages.length, 10);
  assert.equal(h.state.tools.morningMessages[0], 'old-1');
  assert.deepEqual(plain(h.state.tools.morningMessages.slice(-2)), [
    '工房維持費 Y30000を支払いました。',
    '店舗家賃 Y10000を支払いました。',
  ]);
}

testNonFirstDayDoesNothing();
testAlreadyProcessedMonthDoesNothing();
testSuccessfulMonthlyProcessing();
testGracePeriodsSkipCosts();
testUnpaidCostsSuspendWorkshopAndStore();
testHistoryAndMorningMessageBounds();

console.log('PROCESS MONTHLY FIXED COSTS REGRESSION: PASS');
console.log('processMonthlyFixedCosts() current behavior protected: first-day/idempotency gates, workshop and store rent grace periods, sorted branch rent processing, unpaid suspension, reports/notifications, and bounded morning/history records.');
