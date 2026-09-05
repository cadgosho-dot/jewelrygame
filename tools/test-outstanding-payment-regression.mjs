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
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i];
    const n = app[i + 1] || '';
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') { blockComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return app.slice(start, i + 1);
    }
  }
  throw new Error(`${name} end not found`);
}

const targetsSource = extractFunction('outstandingPaymentTargets');
const applySource = extractFunction('applyOutstandingPayment');
const phoneSource = extractFunction('renderPhoneOutstandingPayments');
const handleShopSource = extractFunction('handleShop');
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeActionEvent(action, extra = {}) {
  const node = {
    dataset: { action, ...(extra.dataset || {}) },
    value: extra.value ?? '',
    closest() { return node; },
  };
  return { target: node };
}

function makeHarness(overrides = {}) {
  const calls = {
    finance: [],
    notifications: [],
    saves: 0,
    sfx: [],
    feedback: [],
    toasts: [],
    renders: 0,
  };
  const state = {
    game: { money: overrides.money ?? 100000 },
    workshop: { suspended: overrides.workshopSuspended ?? false },
    fixedCosts: {
      outstanding: {
        workshop: overrides.workshopDebt ?? 0,
        branches: { ...(overrides.branchDebts || {}) },
      },
    },
    store: {
      branches: structuredClone(overrides.branches || []),
    },
  };

  const elements = new Map();
  const document = {
    getElementById: (id) => elements.get(id) || null,
  };
  const ensureOutstandingCosts = () => state.fixedCosts.outstanding;
  const storeBranchesForRender = () => state.store.branches;
  const storeBranchByNumber = (number) => state.store.branches.find((branch) => Number(branch.number) === Number(number)) || null;
  const branchLabel = (branch) => branch?.label || `第${Math.max(1, Math.floor(Number(branch?.number) || 1))}号店`;
  const outstandingCostTotal = () => {
    const outstanding = ensureOutstandingCosts();
    return Math.max(0, Math.floor(Number(outstanding.workshop) || 0))
      + Object.values(outstanding.branches || {}).reduce((sum, amount) => sum + Math.max(0, Math.floor(Number(amount) || 0)), 0);
  };

  const context = {
    state,
    document,
    ensureOutstandingCosts,
    storeBranchesForRender,
    storeBranchByNumber,
    branchLabel,
    outstandingCostTotal,
    formatYen: (amount) => `Y${Math.floor(Number(amount) || 0)}`,
    esc: (value) => String(value),
    showToast: (...args) => calls.toasts.push(args),
    startMoneyFeedback: (amount) => calls.feedback.push(amount),
    addFinance: (...args) => calls.finance.push(args),
    addNotification: (...args) => calls.notifications.push(args),
    saveGame: () => { calls.saves += 1; },
    playSfx: (name) => calls.sfx.push(name),
    render: () => { calls.renders += 1; },
  };
  vm.createContext(context);
  vm.runInContext(`
    let outstandingPaymentTargetId = '';
    let outstandingPaymentDraft = 1;
    ${targetsSource}
    ${applySource}
    ${phoneSource}
    ${handleShopSource}
    globalThis.__targets = outstandingPaymentTargets;
    globalThis.__apply = applyOutstandingPayment;
    globalThis.__phone = renderPhoneOutstandingPayments;
    globalThis.__handle = handleShop;
    globalThis.__setTarget = (value) => { outstandingPaymentTargetId = value; };
    globalThis.__setDraft = (value) => { outstandingPaymentDraft = value; };
    globalThis.__getDraft = () => outstandingPaymentDraft;
    globalThis.__getTarget = () => outstandingPaymentTargetId;
  `, context);

  return {
    state,
    calls,
    elements,
    targets: context.__targets,
    apply: context.__apply,
    phone: context.__phone,
    handle: context.__handle,
    setTarget: context.__setTarget,
    setDraft: context.__setDraft,
    getDraft: context.__getDraft,
    getTarget: context.__getTarget,
  };
}

function testOutstandingTargetsIncludeOnlyPositiveWorkshopAndBranchDebts() {
  const h = makeHarness({
    workshopDebt: 1200,
    branchDebts: { 1: 0, 2: 3400 },
    branches: [
      { number: 1, label: '第1号店', suspended: false },
      { number: 2, label: '第2号店', suspended: true },
    ],
  });
  assert.deepEqual(plain(h.targets()), [
    { id: 'workshop', type: 'workshop', label: '工房 維持費', amount: 1200 },
    { id: 'branch-2', type: 'branch', branchNumber: 2, label: '第2号店 家賃', amount: 3400 },
  ]);
}

function testApplyPaymentClampSuspensionReleaseAndPrefix() {
  const workshop = makeHarness({ workshopDebt: 3000, workshopSuspended: true });
  const workshopTarget = plain(workshop.targets()[0]);
  assert.equal(workshop.apply(workshopTarget, 0, '一括 '), 0);
  assert.equal(workshop.state.fixedCosts.outstanding.workshop, 3000);
  assert.equal(workshop.apply(workshopTarget, 9999, '一括 '), 3000);
  assert.equal(workshop.state.fixedCosts.outstanding.workshop, 0);
  assert.equal(workshop.state.workshop.suspended, false);
  assert.deepEqual(workshop.calls.finance, [['一括 工房 維持費支払', 0, 3000]]);

  const branch = makeHarness({
    branchDebts: { 2: 2400 },
    branches: [{ number: 2, label: '第2号店', suspended: true }],
  });
  const branchTarget = plain(branch.targets()[0]);
  assert.equal(branch.apply(branchTarget, 2400, '一括 '), 2400);
  assert.equal(branch.state.fixedCosts.outstanding.branches[2], 0);
  assert.equal(branch.state.store.branches[0].suspended, false);
  assert.deepEqual(branch.calls.finance, [['一括 第2号店 家賃支払', 0, 2400]]);
}

function testPartialWorkshopPaymentThroughHandleShop() {
  const h = makeHarness({ money: 10000, workshopDebt: 5000, workshopSuspended: true });
  h.setTarget('workshop');
  h.setDraft(2000);
  h.handle(makeActionEvent('pay-outstanding'));
  assert.equal(h.state.game.money, 8000);
  assert.equal(h.state.fixedCosts.outstanding.workshop, 3000);
  assert.equal(h.state.workshop.suspended, true);
  assert.deepEqual(h.calls.feedback, [-2000]);
  assert.deepEqual(h.calls.finance, [['工房 維持費支払', 0, 2000]]);
  assert.deepEqual(h.calls.notifications, [[
    '工房 維持費を支払いました',
    'Y2000を支払いました。残り未払いはY3000です。',
    '完済すると工房の利用停止が解除されます。',
  ]]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(h.calls.sfx, ['purchase']);
  assert.equal(h.calls.renders, 1);
  assert.deepEqual(h.calls.toasts, []);
}

function testPartialBranchPaymentThroughHandleShop() {
  const h = makeHarness({
    money: 10000,
    branchDebts: { 2: 6000 },
    branches: [{ number: 2, label: '第2号店', suspended: true }],
  });
  h.setTarget('branch-2');
  h.setDraft(2500);
  h.handle(makeActionEvent('pay-outstanding'));
  assert.equal(h.state.game.money, 7500);
  assert.equal(h.state.fixedCosts.outstanding.branches[2], 3500);
  assert.equal(h.state.store.branches[0].suspended, true);
  assert.deepEqual(h.calls.finance, [['第2号店 家賃支払', 0, 2500]]);
  assert.deepEqual(h.calls.notifications, [[
    '第2号店 家賃を支払いました',
    'Y2500を支払いました。残り未払いはY3500です。',
    '完済すると対象店舗の利用停止が解除されます。',
  ]]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(h.calls.sfx, ['purchase']);
  assert.equal(h.calls.renders, 1);
}

function testPartialPaymentGuards() {
  const noTarget = makeHarness({ money: 10000, workshopDebt: 5000 });
  noTarget.setTarget('missing');
  noTarget.setDraft(1000);
  noTarget.handle(makeActionEvent('pay-outstanding'));
  assert.deepEqual(noTarget.calls.toasts, [['支払い対象を選んでください。', 'error']]);
  assert.equal(noTarget.state.game.money, 10000);
  assert.equal(noTarget.calls.saves, 0);

  const insufficient = makeHarness({ money: 1000, workshopDebt: 5000, workshopSuspended: true });
  insufficient.setTarget('workshop');
  insufficient.setDraft(2000);
  insufficient.handle(makeActionEvent('pay-outstanding'));
  assert.deepEqual(insufficient.calls.toasts, [['所持金が足りません。', 'error']]);
  assert.equal(insufficient.state.game.money, 1000);
  assert.equal(insufficient.state.fixedCosts.outstanding.workshop, 5000);
  assert.equal(insufficient.state.workshop.suspended, true);
  assert.equal(insufficient.calls.saves, 0);
  assert.deepEqual(insufficient.calls.finance, []);
}

function testSelectionAndAmountDraftActions() {
  const h = makeHarness({
    workshopDebt: 1000,
    branchDebts: { 3: 80000 },
    branches: [{ number: 3, label: '第3号店', suspended: true }],
  });
  h.handle(makeActionEvent('select-outstanding-target', { dataset: { outstandingId: 'branch-3' } }));
  assert.equal(h.getTarget(), 'branch-3');
  assert.equal(h.getDraft(), 50000);
  assert.equal(h.calls.renders, 1);

  h.elements.set('outstandingPaymentAmount', { textContent: '' });
  h.handle(makeActionEvent('set-outstanding-amount', { value: '1234' }));
  assert.equal(h.getDraft(), 1234);
  assert.equal(h.elements.get('outstandingPaymentAmount').textContent, 'Y1234');
}

function testPayAllSuccessClearsAllDebtAndSuspensions() {
  const h = makeHarness({
    money: 10000,
    workshopDebt: 3000,
    workshopSuspended: true,
    branchDebts: { 2: 4000 },
    branches: [{ number: 2, label: '第2号店', suspended: true }],
  });
  h.setDraft(777);
  h.handle(makeActionEvent('pay-outstanding-all'));
  assert.equal(h.state.game.money, 3000);
  assert.equal(h.state.fixedCosts.outstanding.workshop, 0);
  assert.equal(h.state.fixedCosts.outstanding.branches[2], 0);
  assert.equal(h.state.workshop.suspended, false);
  assert.equal(h.state.store.branches[0].suspended, false);
  assert.deepEqual(h.calls.finance, [
    ['一括 工房 維持費支払', 0, 3000],
    ['一括 第2号店 家賃支払', 0, 4000],
  ]);
  assert.deepEqual(h.calls.feedback, [-7000]);
  assert.deepEqual(h.calls.notifications, [[
    '未払いを全額支払いました',
    'Y7000を支払い、工房維持費・店舗家賃の未払いを解消しました。',
    '完済した工房・店舗は利用停止が解除されます。',
  ]]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(h.calls.sfx, ['purchase']);
  assert.equal(h.getDraft(), 1);
  assert.equal(h.calls.renders, 1);
}

function testPayAllGuards() {
  const empty = makeHarness({ money: 10000 });
  empty.handle(makeActionEvent('pay-outstanding-all'));
  assert.deepEqual(empty.calls.toasts, [['現在、未払いはありません。', 'error']]);
  assert.equal(empty.calls.saves, 0);

  const insufficient = makeHarness({ money: 1000, workshopDebt: 5000 });
  insufficient.handle(makeActionEvent('pay-outstanding-all'));
  assert.deepEqual(insufficient.calls.toasts, [['全額支払いにはY5000必要です。', 'error']]);
  assert.equal(insufficient.state.game.money, 1000);
  assert.equal(insufficient.state.fixedCosts.outstanding.workshop, 5000);
  assert.equal(insufficient.calls.saves, 0);
}

function testPhoneOutstandingPaymentRenderContract() {
  const empty = makeHarness({ money: 12345 });
  const emptyHtml = empty.phone();
  assert.ok(emptyHtml.includes('現在、未払いはありません。'));
  assert.ok(emptyHtml.includes('data-action="phone-menu"'));

  const h = makeHarness({
    money: 9000,
    workshopDebt: 1200,
    branchDebts: { 2: 3400 },
    branches: [{ number: 2, label: '第2号店', suspended: true }],
  });
  h.setTarget('missing');
  h.setDraft(99999);
  const html = h.phone();
  assert.equal(h.getTarget(), 'workshop');
  assert.equal(h.getDraft(), 1200);
  assert.ok(html.includes('未払い合計：<strong>Y4600</strong>'));
  assert.ok(html.includes('data-action="pay-outstanding-all"'));
  assert.ok(!html.includes('data-action="pay-outstanding-all" disabled'));
  assert.ok(html.includes('data-action="select-outstanding-target"'));
  assert.ok(html.includes('data-outstanding-id="workshop"'));
  assert.ok(html.includes('data-outstanding-id="branch-2"'));
  assert.ok(html.includes('data-action="set-outstanding-amount"'));
  assert.ok(html.includes('data-action="pay-outstanding"'));

  const poor = makeHarness({ money: 100, workshopDebt: 1200 });
  const poorHtml = poor.phone();
  assert.ok(/data-action="pay-outstanding-all"\s+disabled/.test(poorHtml));
}

testOutstandingTargetsIncludeOnlyPositiveWorkshopAndBranchDebts();
testApplyPaymentClampSuspensionReleaseAndPrefix();
testPartialWorkshopPaymentThroughHandleShop();
testPartialBranchPaymentThroughHandleShop();
testPartialPaymentGuards();
testSelectionAndAmountDraftActions();
testPayAllSuccessClearsAllDebtAndSuspensions();
testPayAllGuards();
testPhoneOutstandingPaymentRenderContract();

console.log('OUTSTANDING PAYMENT REGRESSION: PASS');
console.log('Outstanding fixed-cost payment behavior protected: phone target rendering, target selection/amount draft, partial and full-all payments, money/debt mutation, suspension release, finance prefixes, notifications, save/sfx/feedback, and guard rails.');
