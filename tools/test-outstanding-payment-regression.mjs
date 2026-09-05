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

const sources = {
  targets: extractFunction('outstandingPaymentTargets'),
  total: extractFunction('totalOutstandingBusinessCost'),
  target: extractFunction('outstandingPaymentTarget'),
  apply: extractFunction('applyOutstandingPayment'),
  payItem: extractFunction('payOutstandingBusinessCostItem'),
  payAll: extractFunction('payOutstandingBusinessCosts'),
};
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeHarness(overrides = {}) {
  const calls = { finance: [], feedback: [], saves: 0, toasts: [], renders: 0 };
  const workshopStaff = { wageUnpaid: overrides.workshopWageDue ?? 0 };
  const branches = structuredClone(overrides.branches || []);
  for (const branch of branches) {
    branch.employee ||= { name: 'スタッフ', wageUnpaid: 0 };
  }
  const state = {
    game: { money: overrides.money ?? 100000 },
    business: {
      workshopUnpaid: overrides.workshopDue ?? 0,
      workshopSuspended: overrides.workshopSuspended ?? false,
      homeRentUnpaid: overrides.homeDue ?? 0,
    },
    store: {
      branchNumber: overrides.currentBranchNumber ?? 1,
      branches,
    },
  };

  const context = {
    state,
    MIN_LIVING_CASH_RESERVE: overrides.reserve ?? 1000,
    contractedStoreBranches: () => state.store.branches,
    storeBranchDisplayName: (branch) => branch?.name || branch?.label || `第${branch?.number || 1}号店`,
    storeBranchEmployee: (branch) => branch.employee,
    workshopStaffState: () => workshopStaff,
    addFinance: (...args) => calls.finance.push(args),
    startMoneyFeedback: (amount) => calls.feedback.push(amount),
    saveGame: () => { calls.saves += 1; },
    showToast: (...args) => calls.toasts.push(args),
    render: () => { calls.renders += 1; },
    yen: (amount) => `Y${Math.floor(Number(amount) || 0)}`,
  };
  vm.createContext(context);
  vm.runInContext(`
    ${sources.targets}
    ${sources.total}
    ${sources.target}
    ${sources.apply}
    ${sources.payItem}
    ${sources.payAll}
    globalThis.__targets = outstandingPaymentTargets;
    globalThis.__total = totalOutstandingBusinessCost;
    globalThis.__target = outstandingPaymentTarget;
    globalThis.__apply = applyOutstandingPayment;
    globalThis.__payItem = payOutstandingBusinessCostItem;
    globalThis.__payAll = payOutstandingBusinessCosts;
  `, context);

  return {
    state,
    workshopStaff,
    calls,
    targets: context.__targets,
    total: context.__total,
    target: context.__target,
    apply: context.__apply,
    payItem: context.__payItem,
    payAll: context.__payAll,
  };
}

function sampleBranches() {
  return [
    {
      id: 'store-1', number: 1, name: '1号店', unpaidRent: 500,
      suspended: true, employee: { name: '一郎', wageUnpaid: 700 },
    },
    {
      id: 'store-2', number: 2, name: '2号店', unpaidRent: 600,
      suspended: true, employee: { name: '二郎', wageUnpaid: 800 },
    },
  ];
}

function testOutstandingTargetsProtectPriorityAndAllCostKinds() {
  const h = makeHarness({
    currentBranchNumber: 2,
    workshopDue: 400,
    workshopWageDue: 900,
    homeDue: 1000,
    branches: sampleBranches(),
  });
  assert.deepEqual(plain(h.targets()), [
    { kind: 'workshop', id: '', label: '工房維持費', due: 400 },
    { kind: 'store-rent', id: 'store-2', label: '2号店 家賃', due: 600 },
    { kind: 'store-rent', id: 'store-1', label: '1号店 家賃', due: 500 },
    { kind: 'store-wage', id: 'store-2', label: '2号店 二郎さんの給与', due: 800 },
    { kind: 'store-wage', id: 'store-1', label: '1号店 一郎さんの給与', due: 700 },
    { kind: 'workshop-wage', id: '', label: '職人スタッフの給与', due: 900 },
    { kind: 'home', id: '', label: '自宅家賃', due: 1000 },
  ]);
  assert.equal(h.total(), 4900);
  assert.deepEqual(plain(h.target('store-rent', 'store-2')), {
    kind: 'store-rent', id: 'store-2', label: '2号店 家賃', due: 600,
  });
  assert.equal(h.target('store-rent', 'missing'), null);
}

function testApplyOutstandingPaymentProtectsKindsClampUnlockAndPrefix() {
  const h = makeHarness({
    workshopDue: 3000,
    workshopSuspended: true,
    workshopWageDue: 900,
    homeDue: 1100,
    branches: [{
      id: 'store-1', number: 1, name: '1号店', unpaidRent: 2400, suspended: true,
      employee: { name: '一郎', wageUnpaid: 800 },
    }],
  });

  assert.equal(h.apply(null, 1000), 0);
  assert.equal(h.apply(h.target('workshop'), 0), 0);
  assert.equal(h.apply(h.target('workshop'), 9999, '手動 '), 3000);
  assert.equal(h.state.business.workshopUnpaid, 0);
  assert.equal(h.state.business.workshopSuspended, false);

  assert.equal(h.apply(h.target('store-rent', 'store-1'), 2400), 2400);
  assert.equal(h.state.store.branches[0].unpaidRent, 0);
  assert.equal(h.state.store.branches[0].suspended, false);

  assert.equal(h.apply(h.target('store-wage', 'store-1'), 500), 500);
  assert.equal(h.state.store.branches[0].employee.wageUnpaid, 300);
  assert.equal(h.apply(h.target('workshop-wage'), 900), 900);
  assert.equal(h.workshopStaff.wageUnpaid, 0);
  assert.equal(h.apply(h.target('home'), 1100), 1100);
  assert.equal(h.state.business.homeRentUnpaid, 0);

  assert.deepEqual(h.calls.finance, [
    ['手動 工房維持費を支払い', 0, 3000],
    ['1号店 家賃を支払い', 0, 2400],
    ['1号店 一郎さんの給与を支払い', 0, 500],
    ['職人スタッフの給与を支払い', 0, 900],
    ['自宅家賃を支払い', 0, 1100],
  ]);

  const missingBranch = { kind: 'store-rent', id: 'missing', label: '消滅店舗 家賃', due: 1000 };
  assert.equal(h.apply(missingBranch, 1000), 0);
}

function testIndividualPaymentCanUseAllCashAndKeepsPartialDebt() {
  const h = makeHarness({ money: 1500, workshopDue: 3000, workshopSuspended: true });
  h.payItem('workshop');
  assert.equal(h.state.game.money, 0);
  assert.equal(h.state.business.workshopUnpaid, 1500);
  assert.equal(h.state.business.workshopSuspended, true);
  assert.deepEqual(h.calls.feedback, [-1500]);
  assert.deepEqual(h.calls.finance, [['工房維持費を支払い', 0, 1500]]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(h.calls.toasts, [['Y1500を支払いました。残りY1500です。', 'info', false]]);
  assert.equal(h.calls.renders, 1);
}

function testIndividualPaymentFullSettlementAndGuards() {
  const full = makeHarness({ money: 5000, workshopDue: 3000, workshopSuspended: true });
  full.payItem('workshop');
  assert.equal(full.state.game.money, 2000);
  assert.equal(full.state.business.workshopUnpaid, 0);
  assert.equal(full.state.business.workshopSuspended, false);
  assert.deepEqual(full.calls.toasts, [['工房維持費を完済しました。', 'info', false]]);
  assert.equal(full.calls.saves, 1);

  const resolved = makeHarness({ money: 5000 });
  resolved.payItem('workshop');
  assert.deepEqual(resolved.calls.toasts, [['この未払いはすでに解消されています。']]);
  assert.equal(resolved.calls.saves, 0);

  const noMoney = makeHarness({ money: 0, workshopDue: 3000 });
  noMoney.payItem('workshop');
  assert.deepEqual(noMoney.calls.toasts, [['支払いに使える所持金がありません。', 'error']]);
  assert.equal(noMoney.state.business.workshopUnpaid, 3000);
  assert.equal(noMoney.calls.saves, 0);
}

function testBatchPaymentProtectsPriorityAndLivingCashReserve() {
  const h = makeHarness({
    money: 4500,
    reserve: 1000,
    currentBranchNumber: 2,
    workshopDue: 2000,
    workshopSuspended: true,
    workshopWageDue: 700,
    homeDue: 800,
    branches: [
      { id: 'store-1', number: 1, name: '1号店', unpaidRent: 900, suspended: true, employee: { name: '一郎', wageUnpaid: 500 } },
      { id: 'store-2', number: 2, name: '2号店', unpaidRent: 3000, suspended: true, employee: { name: '二郎', wageUnpaid: 600 } },
    ],
  });
  const beforeTotal = h.total();
  h.payAll();
  assert.equal(h.state.game.money, 1000);
  assert.equal(h.state.business.workshopUnpaid, 0);
  assert.equal(h.state.business.workshopSuspended, false);
  assert.equal(h.state.store.branches[1].unpaidRent, 1500);
  assert.equal(h.state.store.branches[1].suspended, true);
  assert.equal(h.state.store.branches[0].unpaidRent, 900);
  assert.deepEqual(h.calls.finance, [
    ['工房維持費を支払い', 0, 2000],
    ['2号店 家賃を支払い', 0, 1500],
  ]);
  assert.deepEqual(h.calls.feedback, [-3500]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(h.calls.toasts, [[`Y3500を優先順で支払いました。未払い残高はY${beforeTotal - 3500}です。`, 'info', false]]);
  assert.equal(h.calls.renders, 1);
}

function testBatchPaymentFullSettlementAndGuards() {
  const full = makeHarness({
    money: 10000,
    reserve: 1000,
    workshopDue: 2000,
    workshopSuspended: true,
    homeDue: 1000,
    branches: [{ id: 'store-1', number: 1, name: '1号店', unpaidRent: 1500, suspended: true, employee: { name: '一郎', wageUnpaid: 0 } }],
  });
  full.payAll();
  assert.equal(full.total(), 0);
  assert.equal(full.state.game.money, 5500);
  assert.equal(full.state.business.workshopSuspended, false);
  assert.equal(full.state.store.branches[0].suspended, false);
  assert.deepEqual(full.calls.feedback, [-4500]);
  assert.deepEqual(full.calls.toasts, [['未払いをすべて支払いました。', 'info', false]]);
  assert.equal(full.calls.saves, 1);

  const empty = makeHarness({ money: 10000, reserve: 1000 });
  empty.payAll();
  assert.deepEqual(empty.calls.toasts, [['未払いはありません。']]);
  assert.equal(empty.calls.saves, 0);

  const reserveOnly = makeHarness({ money: 1000, reserve: 1000, workshopDue: 2000 });
  reserveOnly.payAll();
  assert.deepEqual(reserveOnly.calls.toasts, [['一括支払いでは生活費Y1000を残します。個別支払いを利用してください。', 'error']]);
  assert.equal(reserveOnly.state.game.money, 1000);
  assert.equal(reserveOnly.state.business.workshopUnpaid, 2000);
  assert.equal(reserveOnly.calls.saves, 0);
}

testOutstandingTargetsProtectPriorityAndAllCostKinds();
testApplyOutstandingPaymentProtectsKindsClampUnlockAndPrefix();
testIndividualPaymentCanUseAllCashAndKeepsPartialDebt();
testIndividualPaymentFullSettlementAndGuards();
testBatchPaymentProtectsPriorityAndLivingCashReserve();
testBatchPaymentFullSettlementAndGuards();

console.log('OUTSTANDING PAYMENT REGRESSION: PASS');
console.log('Outstanding business-cost payment behavior protected: target priority, workshop/store rent/staff/home debts, partial/full individual payments, batch living-cash reserve, suspension release, money, finance, save, toast, feedback, and render.');
