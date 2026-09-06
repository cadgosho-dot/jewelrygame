import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

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

const automaticPaymentCapacitySource = extractFunction('automaticPaymentCapacity');
const payFixedCostSource = extractFunction('payFixedCost');
const processHomeRentSource = extractFunction('processHomeRent');
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeHarness(overrides = {}) {
  const calls = {
    finance: [],
    notifications: [],
  };

  const HOME_MONTHLY_RENT = overrides.homeRent ?? 30000;
  const MIN_LIVING_CASH_RESERVE = overrides.reserve ?? 10000;
  const state = {
    game: {
      money: overrides.money ?? 50000,
      day: overrides.day ?? 31,
    },
    business: {
      lastProcessedHomeRentMonth: overrides.lastProcessedHomeRentMonth ?? '',
      homeRentReports: [...(overrides.homeRentReports ?? [])],
      homeRentUnpaid: overrides.homeRentUnpaid ?? 0,
    },
    tools: {
      morningMessages: [...(overrides.morningMessages ?? [])],
    },
  };

  const dateText = overrides.date ?? '2026-09-15';
  const context = {
    state,
    HOME_MONTHLY_RENT,
    MIN_LIVING_CASH_RESERVE,
    gameDate: () => new Date(`${dateText}T12:00:00`),
    addFinance: (...args) => calls.finance.push(args),
    addNotification: (...args) => calls.notifications.push(args),
    yen: (value) => `¥${Number(value)}`,
    Math,
    Number,
    String,
  };

  vm.createContext(context);
  vm.runInContext(`
    ${automaticPaymentCapacitySource}
    ${payFixedCostSource}
    ${processHomeRentSource}
    globalThis.__automaticPaymentCapacity = automaticPaymentCapacity;
    globalThis.__payFixedCost = payFixedCost;
    globalThis.__processHomeRent = processHomeRent;
  `, context);

  return {
    state,
    calls,
    automaticPaymentCapacity: context.__automaticPaymentCapacity,
    payFixedCost: context.__payFixedCost,
    processHomeRent: context.__processHomeRent,
  };
}

function testAutomaticPaymentCapacityKeepsLivingReserve() {
  const normal = makeHarness({ money: 50000, reserve: 10000 });
  assert.equal(normal.automaticPaymentCapacity(), 40000);

  const exact = makeHarness({ money: 10000, reserve: 10000 });
  assert.equal(exact.automaticPaymentCapacity(), 0);

  const short = makeHarness({ money: 8000, reserve: 10000 });
  assert.equal(short.automaticPaymentCapacity(), 0);

  const fractional = makeHarness({ money: 12345.9, reserve: 10000 });
  assert.equal(fractional.automaticPaymentCapacity(), 2345);
}

function testPayFixedCostFullAndPartialPayment() {
  const full = makeHarness({ money: 60000, reserve: 10000 });
  const fullUnpaid = [];
  const fullResult = full.payFixedCost('固定費', 30000, (amount) => fullUnpaid.push(amount));
  assert.deepEqual(plain(fullResult), { paid: 30000, unpaid: 0 });
  assert.equal(full.state.game.money, 30000);
  assert.deepEqual(full.calls.finance, [['固定費', 0, 30000]]);
  assert.deepEqual(fullUnpaid, []);

  const partial = makeHarness({ money: 25000, reserve: 10000 });
  const partialUnpaid = [];
  const partialResult = partial.payFixedCost('固定費', 30000, (amount) => partialUnpaid.push(amount));
  assert.deepEqual(plain(partialResult), { paid: 15000, unpaid: 15000 });
  assert.equal(partial.state.game.money, 10000);
  assert.deepEqual(partial.calls.finance, [['固定費', 0, 15000]]);
  assert.deepEqual(partialUnpaid, [15000]);
}

function testPayFixedCostZeroDueDoesNothing() {
  const h = makeHarness({ money: 20000, reserve: 10000 });
  const unpaid = [];
  const result = h.payFixedCost('固定費', -10, (amount) => unpaid.push(amount));
  assert.deepEqual(plain(result), { paid: 0, unpaid: 0 });
  assert.equal(h.state.game.money, 20000);
  assert.deepEqual(h.calls.finance, []);
  assert.deepEqual(unpaid, []);
}

function testHomeRentNonBillingDayAndDuplicateAreNoOps() {
  const nonBilling = makeHarness({ date: '2026-09-14', day: 31, money: 50000 });
  assert.equal(nonBilling.processHomeRent(), null);
  assert.equal(nonBilling.state.game.money, 50000);
  assert.deepEqual(nonBilling.state.business.homeRentReports, []);
  assert.deepEqual(nonBilling.calls.notifications, []);

  const duplicate = makeHarness({
    date: '2026-09-15',
    day: 31,
    money: 50000,
    lastProcessedHomeRentMonth: '2026-09',
  });
  assert.equal(duplicate.processHomeRent(), null);
  assert.equal(duplicate.state.game.money, 50000);
  assert.deepEqual(duplicate.state.business.homeRentReports, []);
  assert.deepEqual(duplicate.calls.finance, []);
  assert.deepEqual(duplicate.calls.notifications, []);
}

function testHomeRentGracePeriodAndBounds() {
  const reports = Array.from({ length: 24 }, (_, i) => ({ month: `old-${i}` }));
  const morning = Array.from({ length: 10 }, (_, i) => `old-message-${i}`);
  const h = makeHarness({
    date: '2026-09-15',
    day: 30,
    money: 50000,
    homeRentReports: reports,
    morningMessages: morning,
  });

  const report = h.processHomeRent();
  assert.deepEqual(plain(report), { month: '2026-09', amount: 0, paid: 0, unpaid: 0, grace: true });
  assert.equal(h.state.game.money, 50000);
  assert.equal(h.state.business.lastProcessedHomeRentMonth, '2026-09');
  assert.equal(h.state.business.homeRentReports.length, 24);
  assert.equal(h.state.business.homeRentReports[0].month, 'old-1');
  assert.deepEqual(plain(h.state.business.homeRentReports.at(-1)), plain(report));
  assert.equal(h.state.tools.morningMessages.length, 10);
  assert.equal(h.state.tools.morningMessages[0], 'old-message-1');
  assert.equal(h.state.tools.morningMessages.at(-1), 'ゲーム開始から30日間は、自宅家賃の初回猶予期間です。今月の請求はありません。');
  assert.deepEqual(h.calls.finance, []);
  assert.deepEqual(h.calls.notifications, [[
    '自宅家賃の初回猶予',
    'ゲーム開始から30日間は、自宅家賃の初回猶予期間です。今月の請求はありません。',
    'info',
  ]]);
}

function testHomeRentFullPayment() {
  const h = makeHarness({ date: '2026-09-15', day: 31, money: 50000, homeRent: 30000, reserve: 10000 });
  const report = h.processHomeRent();

  assert.deepEqual(plain(report), { month: '2026-09', amount: 30000, paid: 30000, unpaid: 0 });
  assert.equal(h.state.game.money, 20000);
  assert.equal(h.state.business.homeRentUnpaid, 0);
  assert.equal(h.state.business.lastProcessedHomeRentMonth, '2026-09');
  assert.deepEqual(plain(h.state.business.homeRentReports), [plain(report)]);
  assert.deepEqual(h.calls.finance, [['2026-09 自宅家賃', 0, 30000]]);
  assert.deepEqual(plain(h.state.tools.morningMessages), ['自宅家賃 ¥30000を支払いました。']);
  assert.deepEqual(h.calls.notifications, [['自宅家賃支払日', '自宅家賃 ¥30000を支払いました。', 'info']]);
}

function testHomeRentPartialPaymentAccumulatesUnpaidAndKeepsReserve() {
  const h = makeHarness({
    date: '2026-09-15',
    day: 31,
    money: 25000,
    homeRent: 30000,
    reserve: 10000,
    homeRentUnpaid: 5000,
  });
  const report = h.processHomeRent();

  assert.deepEqual(plain(report), { month: '2026-09', amount: 30000, paid: 15000, unpaid: 15000 });
  assert.equal(h.state.game.money, 10000);
  assert.equal(h.state.business.homeRentUnpaid, 20000);
  assert.deepEqual(h.calls.finance, [['2026-09 自宅家賃', 0, 15000]]);
  const message = '自宅家賃 ¥30000のうち¥15000を支払い、¥15000が未払いです。生活費¥10000は残しています。';
  assert.deepEqual(plain(h.state.tools.morningMessages), [message]);
  assert.deepEqual(h.calls.notifications, [['自宅家賃支払日', message, 'warning']]);
}

function testHomeRentNoAutomaticCapacityRecordsFullUnpaid() {
  const h = makeHarness({ date: '2026-09-15', day: 31, money: 9000, homeRent: 30000, reserve: 10000 });
  const report = h.processHomeRent();

  assert.deepEqual(plain(report), { month: '2026-09', amount: 30000, paid: 0, unpaid: 30000 });
  assert.equal(h.state.game.money, 9000);
  assert.equal(h.state.business.homeRentUnpaid, 30000);
  assert.deepEqual(h.calls.finance, []);
  assert.equal(h.calls.notifications[0][2], 'warning');
}

function testHomeRentSecondCallCannotChargeTwice() {
  const h = makeHarness({ date: '2026-09-15', day: 31, money: 50000, homeRent: 30000, reserve: 10000 });
  const first = h.processHomeRent();
  const second = h.processHomeRent();

  assert.ok(first);
  assert.equal(second, null);
  assert.equal(h.state.game.money, 20000);
  assert.equal(h.state.business.homeRentReports.length, 1);
  assert.equal(h.calls.finance.length, 1);
  assert.equal(h.calls.notifications.length, 1);
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

console.log('HOME RENT REGRESSION: PASS');
console.log('automaticPaymentCapacity()/payFixedCost()/processHomeRent() current behavior protected: living-cash reserve, due normalization, full/partial payment, day-15/idempotency gates, first-30-day grace, unpaid accumulation, bounded reports/messages, notifications, and no direct save/time cost.');
