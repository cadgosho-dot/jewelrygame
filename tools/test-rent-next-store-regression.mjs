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

const source = extractFunction('rentNextStore');
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeHarness(overrides = {}) {
  const calls = {
    toast: [], feedback: [], finance: [], notifications: [], save: 0, screens: [], focus: 0, spend: [],
  };
  const state = {
    game: { money: 100000, day: 12 },
    store: {
      name: '', branches: [], branchNumber: 0, rented: false, rentedDay: 0,
      showcases: ['legacy'], showcaseCount: 9, displaySuppliesInstalled: 4, casesInstalled: 5,
      level: 7, points: 99, rating: 12,
    },
    facilities: { realEstate: false },
  };
  if (overrides.money != null) state.game.money = overrides.money;
  if (overrides.day != null) state.game.day = overrides.day;
  if (overrides.store) Object.assign(state.store, structuredClone(overrides.store));
  if (overrides.facilities) Object.assign(state.facilities, structuredClone(overrides.facilities));

  const input = {
    value: overrides.inputValue ?? 'g-Lab.',
    focus: () => { calls.focus += 1; },
  };
  const branchNumber = overrides.branchNumber ?? 1;
  const context = {
    state,
    MAX_STORE_BRANCHES: overrides.maxBranches ?? 3,
    nextStoreBranchNumber: () => branchNumber,
    document: { querySelector: (selector) => selector === '#store-name-input' ? input : null },
    storeLeaseCost: (number) => number * 10000,
    startMoneyFeedback: (amount) => calls.feedback.push(amount),
    contractedStoreBranches: () => state.store.branches.map((branch) => ({ ...branch })),
    storeBranchLabel: (number) => `第${number}号店`,
    storeEmployeeDefaults: (number) => ({ id: `employee-${number}`, level: 1 }),
    addFinance: (...args) => calls.finance.push(args),
    addNotification: (...args) => calls.notifications.push(args),
    saveGame: () => { calls.save += 1; },
    showToast: (...args) => calls.toast.push(args),
    setScreen: (...args) => calls.screens.push(args),
    spendHours: (...args) => calls.spend.push(args),
  };
  Object.assign(context, overrides.context || {});
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__rentNextStore = rentNextStore;`, context);
  return { state, calls, input, rent: context.__rentNextStore };
}

function assertNoCommit(h, expectedMoney) {
  assert.equal(h.state.game.money, expectedMoney);
  assert.equal(h.calls.feedback.length, 0);
  assert.equal(h.calls.finance.length, 0);
  assert.equal(h.calls.notifications.length, 0);
  assert.equal(h.calls.save, 0);
  assert.equal(h.calls.screens.length, 0);
  assert.equal(h.calls.spend.length, 0);
}

function testSuccessfulFirstStoreRental() {
  const h = makeHarness();
  h.rent();
  assert.equal(h.state.game.money, 90000);
  assert.deepEqual(h.calls.feedback, [-10000]);
  assert.equal(h.state.store.name, 'g-Lab.');
  assert.equal(h.state.store.branchNumber, 1);
  assert.equal(h.state.store.rented, true);
  assert.equal(h.state.store.rentedDay, 12);
  assert.deepEqual(plain(h.state.store.showcases), []);
  assert.equal(h.state.store.showcaseCount, 0);
  assert.equal(h.state.store.displaySuppliesInstalled, 0);
  assert.equal(h.state.store.casesInstalled, 0);
  assert.equal(h.state.store.level, 1);
  assert.equal(h.state.store.points, 0);
  assert.equal(h.state.store.rating, 50);
  assert.equal(h.state.store.branches.length, 1);
  assert.deepEqual(plain(h.state.store.branches[0]), {
    id: 'branch-1', number: 1, label: '第1号店', name: 'g-Lab.', rentedDay: 12,
    suspended: false, unpaidRent: 0, points: 0, level: 1, peakLevel: 1, paidThroughLevel: 1,
    operatingDays: 0, totalRevenue: 0, serviceSuccesses: 0, openMinutesToday: 0, visitorsToday: 0,
    rating: 50, salesCount: 0, orderDeliveries: 0, displaySuppliesInstalled: 0, casesInstalled: 0,
    showcases: [], showcaseCount: 0, employee: { id: 'employee-1', level: 1 },
  });
  assert.equal(h.state.facilities.realEstate, true);
  assert.deepEqual(h.calls.finance[0], ['g-Lab. 第1号店を契約', 0, 10000]);
  assert.deepEqual(h.calls.notifications[0], ['店舗を契約しました', '第1号店が店舗画面から選択できるようになりました。']);
  assert.equal(h.calls.save, 1);
  assert.deepEqual(h.calls.toast.at(-1), ['第1号店を契約しました。', 'info', false]);
  assert.deepEqual(h.calls.screens[0], ['realEstate', {}, false]);
  assert.equal(h.calls.spend.length, 0);
}

function testSuccessfulAdditionalStoreRental() {
  const existing = {
    id: 'branch-1', number: 1, label: '第1号店', name: 'g-Lab.', rentedDay: 3,
    suspended: false, unpaidRent: 0, points: 8, level: 2, peakLevel: 2, paidThroughLevel: 2,
    operatingDays: 5, totalRevenue: 50000, serviceSuccesses: 3, openMinutesToday: 0, visitorsToday: 0,
    rating: 60, salesCount: 2, orderDeliveries: 1, displaySuppliesInstalled: 1, casesInstalled: 2,
    showcases: [{ id: 'showcase-1' }], showcaseCount: 1, employee: { id: 'employee-1', level: 2 },
  };
  const h = makeHarness({
    branchNumber: 2,
    inputValue: 'ignored-name',
    store: { name: 'g-Lab.', branches: [existing], branchNumber: 1, rented: true, showcases: ['keep'], level: 7, points: 99, rating: 12 },
  });
  h.rent();
  assert.equal(h.state.game.money, 80000);
  assert.deepEqual(h.calls.feedback, [-20000]);
  assert.equal(h.state.store.name, 'g-Lab.');
  assert.equal(h.state.store.branchNumber, 1);
  assert.deepEqual(plain(h.state.store.showcases), ['keep']);
  assert.equal(h.state.store.level, 7);
  assert.equal(h.state.store.points, 99);
  assert.equal(h.state.store.rating, 12);
  assert.equal(h.state.store.branches.length, 2);
  assert.equal(h.state.store.branches[0].name, 'g-Lab.');
  assert.equal(h.state.store.branches[0].points, 8);
  assert.equal(h.state.store.branches[1].number, 2);
  assert.equal(h.state.store.branches[1].name, 'g-Lab.');
  assert.equal(h.state.store.branches[1].label, '第2号店');
  assert.equal(h.state.store.branches[1].rentedDay, 12);
  assert.equal(h.state.store.branches[1].level, 1);
  assert.deepEqual(plain(h.state.store.branches[1].employee), { id: 'employee-2', level: 1 });
  assert.deepEqual(h.calls.finance[0], ['g-Lab. 第2号店を契約', 0, 20000]);
  assert.equal(h.calls.save, 1);
  assert.deepEqual(h.calls.screens[0], ['realEstate', {}, false]);
  assert.equal(h.calls.spend.length, 0);
}

function testStoreNameNormalization() {
  const h = makeHarness({ inputValue: `   ${'A'.repeat(40)}   ` });
  h.rent();
  assert.equal(h.state.store.name, 'A'.repeat(30));
  assert.equal(h.state.store.branches[0].name, 'A'.repeat(30));
}

function testStoreRentalGuardRails() {
  {
    const h = makeHarness({ branchNumber: 4, maxBranches: 3 });
    h.rent();
    assertNoCommit(h, 100000);
    assert.equal(h.calls.toast.at(-1)?.[0], '現在契約できる店舗はありません。');
  }
  {
    const h = makeHarness({ inputValue: '   ' });
    h.rent();
    assertNoCommit(h, 100000);
    assert.equal(h.calls.focus, 1);
    assert.equal(h.calls.toast.at(-1)?.[0], '店舗名を入力してください。');
  }
  {
    const h = makeHarness({ money: 9999 });
    h.rent();
    assertNoCommit(h, 9999);
    assert.equal(h.state.store.name, '');
    assert.equal(h.calls.toast.at(-1)?.[0], '店舗の契約費が足りません。');
  }
}

testSuccessfulFirstStoreRental();
testSuccessfulAdditionalStoreRental();
testStoreNameNormalization();
testStoreRentalGuardRails();

console.log('RENT NEXT STORE REGRESSION: PASS');
console.log('rentNextStore() current behavior protected: branch limit, store name normalization, lease money, first-store initialization, branch creation, real-estate flag, finance, notification, save, toast, route, and no time cost.');
