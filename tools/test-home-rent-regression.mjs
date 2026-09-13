import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHomePropertyController } from '../js/finance/home-property-controller.js';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const re = new RegExp(`(?:^|\\n)function\\s+${name}\\s*\\([^\\n]*\\)\\s*\\{`, 'm');
  const match = re.exec(app);
  assert.ok(match, `${name} definition not found`);
  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const brace = app.indexOf('{', start);
  let depth = 0, quote = null, escape = false, lineComment = false, blockComment = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i], next = app[i + 1] || '';
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (quote) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === quote) quote = null; continue; }
    if (c === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') { depth -= 1; if (depth === 0) return app.slice(start, i + 1); }
  }
  throw new Error(`${name} end not found`);
}

const automaticPaymentCapacitySource = extractFunction('automaticPaymentCapacity');
const payFixedCostSource = extractFunction('payFixedCost');
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeHarness(overrides = {}) {
  const calls = { finance: [], notifications: [] };
  const HOME_MONTHLY_RENT = overrides.homeRent ?? 30000;
  const MIN_LIVING_CASH_RESERVE = overrides.reserve ?? 10000;
  const state = {
    game: { money: overrides.money ?? 50000, day: overrides.day ?? 31 },
    business: {
      homeProperty: overrides.homeProperty,
      lastProcessedHomeRentMonth: overrides.lastProcessedHomeRentMonth ?? '',
      homeRentReports: [...(overrides.homeRentReports ?? [])],
      homeRentUnpaid: overrides.homeRentUnpaid ?? 0,
    },
    tools: { morningMessages: [...(overrides.morningMessages ?? [])] },
  };
  const dateText = overrides.date ?? '2026-09-15';
  const context = {
    state,
    MIN_LIVING_CASH_RESERVE,
    addFinance: (...args) => calls.finance.push(args),
    Math, Number, String,
  };
  vm.createContext(context);
  vm.runInContext(`
    ${automaticPaymentCapacitySource}
    ${payFixedCostSource}
    globalThis.__automaticPaymentCapacity = automaticPaymentCapacity;
    globalThis.__payFixedCost = payFixedCost;
  `, context);

  const controller = createHomePropertyController({
    getState: () => state,
    getScreenData: () => ({}),
    shell: () => '',
    yen: (value) => `¥${Number(value)}`,
    version: '0.10.944',
    isPortraitLayout: () => false,
    showToast: () => {},
    addFinance: (...args) => calls.finance.push(args),
    saveGame: () => {},
    gameDate: () => new Date(`${dateText}T12:00:00`),
    rerender: () => {},
    payFixedCost: context.__payFixedCost,
    addNotification: (...args) => calls.notifications.push(args),
    propertyARent: HOME_MONTHLY_RENT,
    getMinLivingCashReserve: () => MIN_LIVING_CASH_RESERVE,
  });

  return {
    state,
    calls,
    automaticPaymentCapacity: context.__automaticPaymentCapacity,
    payFixedCost: context.__payFixedCost,
    processHomeRent: controller.processRent,
  };
}

function testAutomaticPaymentCapacityKeepsLivingReserve() {
  assert.equal(makeHarness({ money: 50000, reserve: 10000 }).automaticPaymentCapacity(), 40000);
  assert.equal(makeHarness({ money: 10000, reserve: 10000 }).automaticPaymentCapacity(), 0);
  assert.equal(makeHarness({ money: 8000, reserve: 10000 }).automaticPaymentCapacity(), 0);
  assert.equal(makeHarness({ money: 12345.9, reserve: 10000 }).automaticPaymentCapacity(), 2345);
}

function testPayFixedCostFullAndPartialPayment() {
  const full = makeHarness({ money: 60000, reserve: 10000 });
  const fullUnpaid = [];
  assert.deepEqual(plain(full.payFixedCost('固定費', 30000, (amount) => fullUnpaid.push(amount))), { paid: 30000, unpaid: 0 });
  assert.equal(full.state.game.money, 30000);
  assert.deepEqual(full.calls.finance, [['固定費', 0, 30000]]);
  assert.deepEqual(fullUnpaid, []);
  const partial = makeHarness({ money: 25000, reserve: 10000 });
  const partialUnpaid = [];
  assert.deepEqual(plain(partial.payFixedCost('固定費', 30000, (amount) => partialUnpaid.push(amount))), { paid: 15000, unpaid: 15000 });
  assert.equal(partial.state.game.money, 10000);
  assert.deepEqual(partialUnpaid, [15000]);
}

function testPayFixedCostZeroDueDoesNothing() {
  const h = makeHarness({ money: 20000, reserve: 10000 });
  const unpaid = [];
  assert.deepEqual(plain(h.payFixedCost('固定費', -10, (amount) => unpaid.push(amount))), { paid: 0, unpaid: 0 });
  assert.equal(h.state.game.money, 20000);
  assert.deepEqual(h.calls.finance, []);
  assert.deepEqual(unpaid, []);
}

function testHomeRentNonBillingDayAndDuplicateAreNoOps() {
  const nonBilling = makeHarness({ date: '2026-09-14', day: 31, money: 50000 });
  assert.equal(nonBilling.processHomeRent(), null);
  assert.equal(nonBilling.state.game.money, 50000);
  const duplicate = makeHarness({ date: '2026-09-15', day: 31, money: 50000, lastProcessedHomeRentMonth: '2026-09' });
  assert.equal(duplicate.processHomeRent(), null);
  assert.equal(duplicate.state.game.money, 50000);
}

function testHomeRentGracePeriodAndBounds() {
  const reports = Array.from({ length: 24 }, (_, i) => ({ month: `old-${i}` }));
  const morning = Array.from({ length: 10 }, (_, i) => `old-message-${i}`);
  const h = makeHarness({ date: '2026-09-15', day: 30, money: 50000, homeRentReports: reports, morningMessages: morning });
  const report = h.processHomeRent();
  assert.deepEqual(plain(report), { month: '2026-09', amount: 0, paid: 0, unpaid: 0, grace: true });
  assert.equal(h.state.business.homeRentReports.length, 24);
  assert.equal(h.state.tools.morningMessages.length, 10);
}

function testHomeRentFullPayment() {
  const h = makeHarness({ date: '2026-09-15', day: 31, money: 50000, homeRent: 30000, reserve: 10000 });
  const report = h.processHomeRent();
  assert.deepEqual(plain(report), { month: '2026-09', amount: 30000, paid: 30000, unpaid: 0 });
  assert.equal(h.state.game.money, 20000);
  assert.deepEqual(h.calls.notifications, [['自宅家賃支払日', '自宅家賃 ¥30000を支払いました。', 'info']]);
}

function testHomeRentPartialPaymentAccumulatesUnpaidAndKeepsReserve() {
  const h = makeHarness({ date: '2026-09-15', day: 31, money: 25000, homeRent: 30000, reserve: 10000, homeRentUnpaid: 5000 });
  const report = h.processHomeRent();
  assert.deepEqual(plain(report), { month: '2026-09', amount: 30000, paid: 15000, unpaid: 15000 });
  assert.equal(h.state.game.money, 10000);
  assert.equal(h.state.business.homeRentUnpaid, 20000);
}

function testHomeRentNoAutomaticCapacityRecordsFullUnpaid() {
  const h = makeHarness({ date: '2026-09-15', day: 31, money: 9000, homeRent: 30000, reserve: 10000 });
  const report = h.processHomeRent();
  assert.deepEqual(plain(report), { month: '2026-09', amount: 30000, paid: 0, unpaid: 30000 });
  assert.equal(h.state.business.homeRentUnpaid, 30000);
}

function testHomeRentSecondCallCannotChargeTwice() {
  const h = makeHarness({ date: '2026-09-15', day: 31, money: 50000, homeRent: 30000, reserve: 10000 });
  assert.ok(h.processHomeRent());
  assert.equal(h.processHomeRent(), null);
  assert.equal(h.state.game.money, 20000);
  assert.equal(h.state.business.homeRentReports.length, 1);
}

function testHomeRentPropertyBUses200000() {
  const h = makeHarness({ date: '2026-09-15', day: 351, money: 250000, homeRent: 70000, reserve: 10000, homeProperty: 'B' });
  const report = h.processHomeRent();
  assert.deepEqual(plain(report), { month: '2026-09', amount: 200000, paid: 200000, unpaid: 0 });
  assert.equal(h.state.game.money, 50000);
}

testAutomaticPaymentCapacityKeepsLivingReserve();
testPayFixedCostFullAndPartialPayment();
testPayFixedCostZeroDueDoesNothing();
testHomeRentNonBillingDayAndDuplicateAreNoOps();
testHomeRentGracePeriodAndBounds();
testHomeRentFullPayment();
testHomeRentPartialPaymentAccumulatesUnpaidAndKeepsReserve();
testHomeRentNoAutomaticCapacityRecordsFullUnpaid();
testHomeRentSecondCallCannotChargeTwice();
testHomeRentPropertyBUses200000();

console.log('HOME RENT REGRESSION: PASS');
