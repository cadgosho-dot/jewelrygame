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

const targetsSource = extractFunction('outstandingPaymentTargets');
const applySource = extractFunction('applyOutstandingPayment');
const renderSource = extractFunction('renderOutstandingPayments');
const plain = (value) => JSON.parse(JSON.stringify(value));

class FakeElement {
  constructor({ value = '', dataset = {} } = {}) {
    this.value = String(value);
    this.dataset = { ...dataset };
    this.textContent = '';
    this.listeners = new Map();
  }
  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }
  click() {
    const handler = this.listeners.get('click');
    if (handler) handler({ currentTarget: this, target: this });
  }
  input(value) {
    this.value = String(value);
    const handler = this.listeners.get('input');
    if (handler) handler({ currentTarget: this, target: this });
  }
}

class FakeModalContent {
  constructor(elements) {
    this.elements = elements;
    this.selectionButtons = [];
    this._innerHTML = '';
  }
  set innerHTML(html) {
    this._innerHTML = String(html);
    this.selectionButtons = [...this._innerHTML.matchAll(/data-target-id="([^"]+)"/g)]
      .map((match) => new FakeElement({ dataset: { targetId: match[1] } }));
    const rangeValue = this._innerHTML.match(/id="outstandingPaymentRange"[^>]*value="(\d+)"/i)?.[1] ?? '1';
    this.elements.set('outstandingPaymentRange', new FakeElement({ value: rangeValue }));
    this.elements.set('outstandingPaymentAmount', new FakeElement());
    this.elements.set('payOutstandingPartial', new FakeElement());
    this.elements.set('payOutstandingAll', new FakeElement());
  }
  get innerHTML() {
    return this._innerHTML;
  }
  querySelectorAll(selector) {
    return selector === '[data-action="selectOutstandingPayment"]' ? this.selectionButtons : [];
  }
}

function makeHarness(overrides = {}) {
  const calls = {
    finance: [], notifications: [], saves: 0, sfx: [], feedback: [], toasts: [], modals: [],
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
  const modalContent = new FakeModalContent(elements);
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
    modalContent,
    document,
    ensureOutstandingCosts,
    storeBranchesForRender,
    storeBranchByNumber,
    branchLabel,
    outstandingCostTotal,
    formatYen: (amount) => `Y${Math.floor(Number(amount) || 0)}`,
    esc: (value) => String(value),
    showModal: (html) => calls.modals.push(String(html)),
    closeModal: () => {},
    showToast: (...args) => calls.toasts.push(args),
    startMoneyFeedback: (amount) => calls.feedback.push(amount),
    addFinance: (...args) => calls.finance.push(args),
    addNotification: (...args) => calls.notifications.push(args),
    saveGame: () => { calls.saves += 1; },
    playSfx: (name) => calls.sfx.push(name),
  };
  vm.createContext(context);
  vm.runInContext(`
    let outstandingPaymentTargetId = '';
    let outstandingPaymentDraft = 1;
    ${targetsSource}
    ${applySource}
    ${renderSource}
    globalThis.__targets = outstandingPaymentTargets;
    globalThis.__apply = applyOutstandingPayment;
    globalThis.__render = renderOutstandingPayments;
    globalThis.__setTarget = (value) => { outstandingPaymentTargetId = value; };
    globalThis.__setDraft = (value) => { outstandingPaymentDraft = value; };
    globalThis.__getDraft = () => outstandingPaymentDraft;
    globalThis.__getTarget = () => outstandingPaymentTargetId;
  `, context);

  return {
    state, calls, elements, modalContent,
    targets: context.__targets,
    apply: context.__apply,
    open: context.__render,
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

function testWorkshopPartialPaymentProtectsMoneyDebtAccountingAndSuspension() {
  const h = makeHarness({ money: 10000, workshopDebt: 5000, workshopSuspended: true });
  h.setDraft(2000);
  h.open();
  h.elements.get('payOutstandingPartial').click();
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
  assert.deepEqual(h.calls.toasts, []);
}

function testWorkshopFullPaymentClearsSuspension() {
  const h = makeHarness({ money: 7000, workshopDebt: 5000, workshopSuspended: true });
  h.open();
  h.elements.get('payOutstandingAll').click();
  assert.equal(h.state.game.money, 2000);
  assert.equal(h.state.fixedCosts.outstanding.workshop, 0);
  assert.equal(h.state.workshop.suspended, false);
  assert.deepEqual(h.calls.finance, [['工房 維持費支払', 0, 5000]]);
  assert.equal(h.calls.saves, 1);
  assert.ok(h.calls.modals.some((html) => html.includes('現在、未払いはありません。')));
}

function testBranchPartialAndFullPayment() {
  const h = makeHarness({
    money: 10000,
    branchDebts: { 2: 6000 },
    branches: [{ number: 2, label: '第2号店', suspended: true }],
  });
  h.setTarget('branch-2');
  h.setDraft(2500);
  h.open();
  h.elements.get('payOutstandingPartial').click();
  assert.equal(h.state.game.money, 7500);
  assert.equal(h.state.fixedCosts.outstanding.branches[2], 3500);
  assert.equal(h.state.store.branches[0].suspended, true);
  assert.deepEqual(h.calls.finance[0], ['第2号店 家賃支払', 0, 2500]);
  assert.deepEqual(h.calls.notifications[0], [
    '第2号店 家賃を支払いました',
    'Y2500を支払いました。残り未払いはY3500です。',
    '完済すると対象店舗の利用停止が解除されます。',
  ]);

  h.elements.get('payOutstandingAll').click();
  assert.equal(h.state.game.money, 4000);
  assert.equal(h.state.fixedCosts.outstanding.branches[2], 0);
  assert.equal(h.state.store.branches[0].suspended, false);
  assert.deepEqual(h.calls.finance[1], ['第2号店 家賃支払', 0, 3500]);
  assert.equal(h.calls.saves, 2);
}

function testInsufficientMoneyDoesNotMutateDebtOrSave() {
  const h = makeHarness({ money: 1000, workshopDebt: 5000, workshopSuspended: true });
  h.setDraft(2000);
  h.open();
  h.elements.get('payOutstandingPartial').click();
  assert.equal(h.state.game.money, 1000);
  assert.equal(h.state.fixedCosts.outstanding.workshop, 5000);
  assert.equal(h.state.workshop.suspended, true);
  assert.deepEqual(h.calls.toasts, [['所持金が足りません。', 'error']]);
  assert.deepEqual(h.calls.feedback, []);
  assert.deepEqual(h.calls.finance, []);
  assert.deepEqual(h.calls.notifications, []);
  assert.equal(h.calls.saves, 0);
  assert.deepEqual(h.calls.sfx, []);
}

function testSelectionResetsDraftWithFiftyThousandCap() {
  const h = makeHarness({
    workshopDebt: 1000,
    branchDebts: { 3: 80000 },
    branches: [{ number: 3, label: '第3号店', suspended: true }],
  });
  h.open();
  const branchButton = h.modalContent.selectionButtons.find((button) => button.dataset.targetId === 'branch-3');
  assert.ok(branchButton);
  branchButton.click();
  assert.equal(h.getTarget(), 'branch-3');
  assert.equal(h.getDraft(), 50000);
}

function testNoOutstandingShowsNoDebtModalWithoutMutation() {
  const h = makeHarness({ money: 12345 });
  h.open();
  assert.equal(h.state.game.money, 12345);
  assert.equal(h.calls.saves, 0);
  assert.equal(h.calls.finance.length, 0);
  assert.ok(h.calls.modals.some((html) => html.includes('現在、未払いはありません。')));
}

function testApplyPaymentClampsToDueAndRejectsZero() {
  const h = makeHarness({ workshopDebt: 3000, workshopSuspended: true });
  const target = plain(h.targets()[0]);
  assert.equal(h.apply(target, 0), 0);
  assert.equal(h.state.fixedCosts.outstanding.workshop, 3000);
  assert.equal(h.apply(target, 9999), 3000);
  assert.equal(h.state.fixedCosts.outstanding.workshop, 0);
  assert.equal(h.state.workshop.suspended, false);
  assert.deepEqual(h.calls.finance, [['工房 維持費支払', 0, 3000]]);
}

testOutstandingTargetsIncludeOnlyPositiveWorkshopAndBranchDebts();
testWorkshopPartialPaymentProtectsMoneyDebtAccountingAndSuspension();
testWorkshopFullPaymentClearsSuspension();
testBranchPartialAndFullPayment();
testInsufficientMoneyDoesNotMutateDebtOrSave();
testSelectionResetsDraftWithFiftyThousandCap();
testNoOutstandingShowsNoDebtModalWithoutMutation();
testApplyPaymentClampsToDueAndRejectsZero();

console.log('OUTSTANDING PAYMENT REGRESSION: PASS');
console.log('Outstanding fixed-cost payment behavior protected: target generation, partial/full workshop and branch payments, money/debt mutation, suspension release, accounting, notification, save/sfx/feedback, insufficient-money guard, selection draft cap, and empty state.');
