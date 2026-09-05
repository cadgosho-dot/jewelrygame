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
  return app.slice(start, findMatchingBrace(brace) + 1);
}

function findMatchingBrace(brace) {
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
      if (depth === 0) return i;
    }
  }
  throw new Error('matching brace not found');
}

function extractSellingPriceConfirmBody() {
  const marker = "case 'selling-price-confirm': {";
  const start = app.indexOf(marker);
  assert.ok(start >= 0, 'selling-price-confirm action not found');
  const brace = app.indexOf('{', start);
  const end = findMatchingBrace(brace);
  return app.slice(brace + 1, end).replace(/\bbreak;/g, 'return;');
}

const functionNames = [
  'normalizeSellingPrice',
  'storeMaximumShowcases',
  'branchShowcases',
  'installedShowcaseCount',
  'storeMaximumDisplaySupplies',
  'storeDisplaySuppliesInstalled',
  'mirrorCurrentStoreDisplay',
  'findEmptyShowcasePosition',
  'showcaseLocationForJewelry',
  'displayCaseInstallMaximum',
  'setDisplayCaseInstallQuantity',
  'displayCaseInstallQuantity',
  'showcaseSellingPrice',
  'adjustShowcaseSellingPrice',
  'placeItem',
  'placeItemInShowcaseSlot',
  'removeShowcase',
  'moveShowcaseItem',
  'installDisplayProduct',
];
const sources = Object.fromEntries(functionNames.map((name) => [name, extractFunction(name)]));
const confirmBody = extractSellingPriceConfirmBody();
const plain = (value) => JSON.parse(JSON.stringify(value));

function showcase(id = 'showcase-1', slots = [null, null, null, null, null]) {
  return { id, slots: [...slots] };
}

function makeHarness(overrides = {}) {
  const branch1 = {
    id: 'store-1',
    number: 1,
    showcases: overrides.branch1Showcases ?? [],
    displaySuppliesInstalled: overrides.branch1DisplaySupplies ?? 0,
    casesInstalled: overrides.branch1Cases ?? 0,
    showcaseCount: (overrides.branch1Showcases ?? []).length,
  };
  const branch2 = {
    id: 'store-2',
    number: 2,
    showcases: overrides.branch2Showcases ?? [],
    displaySuppliesInstalled: overrides.branch2DisplaySupplies ?? 0,
    casesInstalled: overrides.branch2Cases ?? 0,
    showcaseCount: (overrides.branch2Showcases ?? []).length,
  };
  const branches = overrides.branches ?? [branch1, branch2];
  const currentNumber = overrides.currentNumber ?? 1;
  const state = {
    game: { money: overrides.money ?? 777777 },
    store: {
      rented: overrides.rented ?? true,
      expanded: overrides.expanded ?? true,
      branchNumber: currentNumber,
      branches,
      displayInventory: {
        showcase: overrides.showcaseOwned ?? 0,
        displaySupplies: overrides.displaySuppliesOwned ?? 0,
        case: overrides.caseOwned ?? 0,
      },
      displaySuppliesInstalled: 0,
      casesInstalled: 0,
      showcases: [],
      showcaseCount: 0,
    },
    inventory: {
      capacity: overrides.capacity ?? 20,
      jewelry: overrides.jewelry ?? [],
    },
  };
  const calls = {
    saves: 0,
    renders: 0,
    toasts: [],
    screens: [],
    closes: 0,
    capacitySync: 0,
    levelSync: 0,
    capturedScroll: 0,
    restoredScroll: [],
    preview: [],
    spendHours: 0,
    spendMinutes: 0,
    advanceTime: 0,
  };
  let screen = overrides.screen ?? 'store';
  const screenData = overrides.screenData ?? {};
  const context = {
    state,
    screen,
    screenData,
    DISPLAY_SHOP_PRODUCTS: {
      showcase: { id: 'showcase', name: 'ショーケース' },
      displaySupplies: { id: 'displaySupplies', name: 'ディスプレイ用品' },
      case: { id: 'case', name: 'ケース' },
    },
    currentStoreBranch: () => state.store.branches.find((row) => Number(row.number) === Number(state.store.branchNumber)) || null,
    storeBranchByNumber: (number) => state.store.branches.find((row) => Number(row.number) === Number(number)) || null,
    storeCaseRemaining: (branch) => Math.max(0, Math.floor(Number(branch?.casesInstalled) || 0)),
    storeMaximumCases: () => 50,
    facilityUnlocked: () => true,
    storeBranchLabel: (number) => `店舗${number}`,
    captureStoreScrollSnapshot: () => { calls.capturedScroll += 1; return { top: 123 }; },
    restoreStoreScrollSnapshot: (snapshot) => calls.restoredScroll.push(snapshot),
    syncFinishedJewelryCapacity: () => { calls.capacitySync += 1; state.inventory.capacity = 25; },
    syncStoreLevel: () => { calls.levelSync += 1; },
    saveGame: () => { calls.saves += 1; },
    showToast: (...args) => calls.toasts.push(args),
    render: () => { calls.renders += 1; },
    setScreen: (...args) => { calls.screens.push(args); screen = args[0]; context.screen = screen; },
    closeModal: () => { calls.closes += 1; },
    updateShowcaseDetailPricePreview: (...args) => { calls.preview.push(args); return overrides.previewResult ?? true; },
    yen: (value) => `¥${Number(value).toLocaleString('ja-JP')}`,
    spendHours: () => { calls.spendHours += 1; },
    spendMinutes: () => { calls.spendMinutes += 1; },
    advanceTime: () => { calls.advanceTime += 1; },
    Date,
    Math,
    Number,
  };
  vm.createContext(context);
  vm.runInContext(`
    var displayCaseInstallDraft = ${JSON.stringify(overrides.caseDraft ?? 1)};
    ${functionNames.map((name) => sources[name]).join('\n')}
    function __confirmSellingPrice(button) { ${confirmBody} }
    globalThis.__api = {
      normalizeSellingPrice, storeMaximumShowcases, branchShowcases, installedShowcaseCount,
      storeMaximumDisplaySupplies, storeDisplaySuppliesInstalled, mirrorCurrentStoreDisplay,
      findEmptyShowcasePosition, showcaseLocationForJewelry, displayCaseInstallMaximum,
      setDisplayCaseInstallQuantity, displayCaseInstallQuantity, showcaseSellingPrice,
      adjustShowcaseSellingPrice, placeItem, placeItemInShowcaseSlot, removeShowcase,
      moveShowcaseItem, installDisplayProduct, confirmSellingPrice: __confirmSellingPrice,
      getCaseDraft: () => displayCaseInstallDraft,
    };
  `, context);
  return { state, branch1, branch2, calls, screenData, api: context.__api };
}

function assertNoTimeOrMoneyCost(h, initialMoney = 777777) {
  assert.equal(h.state.game.money, initialMoney);
  assert.equal(h.calls.spendHours, 0);
  assert.equal(h.calls.spendMinutes, 0);
  assert.equal(h.calls.advanceTime, 0);
}

function testShowcaseInstallationAndLimits() {
  const h = makeHarness({ showcaseOwned: 1, expanded: true });
  h.api.installDisplayProduct('showcase');
  assert.equal(h.branch1.showcases.length, 1);
  assert.equal(h.branch1.showcases[0].slots.length, 5);
  assert.deepEqual(plain(h.branch1.showcases[0].slots), [null, null, null, null, null]);
  assert.equal(h.branch1.showcaseCount, 1);
  assert.equal(h.state.store.displayInventory.showcase, 0);
  assert.equal(h.calls.capacitySync, 1);
  assert.equal(h.calls.levelSync, 1);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.renders, 1);
  assert.equal(h.calls.capturedScroll, 1);
  assert.deepEqual(plain(h.calls.restoredScroll), [{ top: 123 }]);
  assertNoTimeOrMoneyCost(h);

  const blocked = makeHarness({ showcaseOwned: 1, expanded: false, branch1Showcases: [showcase()] });
  const before = plain(blocked.state);
  blocked.api.installDisplayProduct('showcase');
  assert.deepEqual(plain(blocked.state), before);
  assert.equal(blocked.calls.saves, 0);
  assert.deepEqual(blocked.calls.toasts, [['この店舗にはショーケースを1台まで設置できます。', 'error']]);
  assertNoTimeOrMoneyCost(blocked);
  assert.equal(blocked.api.storeMaximumShowcases(blocked.branch2), 3);
}

function testDisplaySuppliesInstallationAndGuards() {
  const h = makeHarness({ displaySuppliesOwned: 1, branch1Showcases: [showcase()] });
  h.api.installDisplayProduct('displaySupplies');
  assert.equal(h.branch1.displaySuppliesInstalled, 1);
  assert.equal(h.state.store.displaySuppliesInstalled, 1);
  assert.equal(h.state.store.displayInventory.displaySupplies, 0);
  assert.equal(h.calls.levelSync, 1);
  assert.equal(h.calls.saves, 1);
  assertNoTimeOrMoneyCost(h);

  const noShowcase = makeHarness({ displaySuppliesOwned: 1, branch1Showcases: [] });
  noShowcase.api.installDisplayProduct('displaySupplies');
  assert.equal(noShowcase.state.store.displayInventory.displaySupplies, 1);
  assert.equal(noShowcase.calls.saves, 0);
  assert.deepEqual(noShowcase.calls.toasts, [['先にショーケースを設置してください。', 'error']]);
  assertNoTimeOrMoneyCost(noShowcase);
}

function testCaseMultiInstallAndMaximum() {
  const h = makeHarness({ caseOwned: 12, branch1Cases: 5, caseDraft: 10 });
  assert.equal(h.api.displayCaseInstallMaximum(h.branch1), 12);
  h.api.installDisplayProduct('case');
  assert.equal(h.branch1.casesInstalled, 15);
  assert.equal(h.state.store.casesInstalled, 15);
  assert.equal(h.state.store.displayInventory.case, 2);
  assert.equal(h.api.getCaseDraft(), 1);
  assert.equal(h.calls.levelSync, 1);
  assert.equal(h.calls.saves, 1);
  assertNoTimeOrMoneyCost(h);

  const full = makeHarness({ caseOwned: 4, branch1Cases: 50, caseDraft: 1 });
  full.api.installDisplayProduct('case');
  assert.equal(full.state.store.displayInventory.case, 4);
  assert.equal(full.calls.saves, 0);
  assert.deepEqual(full.calls.toasts, [['設置するケース数を選択してください。', 'error']]);
  assertNoTimeOrMoneyCost(full);
}

function testPlaceItemUsesFirstEmptyShowcaseSlot() {
  const item = { id: 'j-1', name: 'リング', status: 'stored', recommendedPrice: 12345 };
  const h = makeHarness({ jewelry: [item], branch1Showcases: [showcase()] });
  h.api.placeItem(item.id);
  assert.deepEqual(plain(h.branch1.showcases[0].slots[0]), { jewelryId: 'j-1', sellingPrice: 12345 });
  assert.equal(item.status, 'displayed');
  assert.equal(item.displayBranchNumber, 1);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.screens.length, 1);
  assert.equal(h.calls.screens[0][0], 'store');
  assertNoTimeOrMoneyCost(h);
}

function testPlaceItemInExactSlotAndOccupiedGuard() {
  const item = { id: 'j-2', name: 'ペンダント', status: 'stored', recommendedPrice: 30000 };
  const h = makeHarness({ jewelry: [item], branch1Showcases: [showcase()] });
  h.screenData.returnStoreShowcaseScroll = { branchId: 'store-1', showcaseIndex: 0, top: 55 };
  h.api.placeItemInShowcaseSlot(item.id, 'store-1', 0, 3);
  assert.deepEqual(plain(h.branch1.showcases[0].slots[3]), { jewelryId: 'j-2', sellingPrice: 30000 });
  assert.equal(item.status, 'displayed');
  assert.equal(item.displayBranchNumber, 1);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(plain(h.calls.screens[0][1].restoreShowcaseScroll), { branchId: 'store-1', showcaseIndex: 0, top: 55 });
  assertNoTimeOrMoneyCost(h);

  const other = { id: 'j-3', status: 'stored', recommendedPrice: 20000 };
  const occupied = makeHarness({ jewelry: [other], branch1Showcases: [showcase('s1', [{ jewelryId: 'old', sellingPrice: 9000 }, null, null, null, null])] });
  const before = plain(occupied.state);
  occupied.api.placeItemInShowcaseSlot(other.id, 'store-1', 0, 0);
  assert.deepEqual(plain(occupied.state), before);
  assert.equal(occupied.calls.saves, 0);
  assert.equal(occupied.calls.screens.length, 1);
  assertNoTimeOrMoneyCost(occupied);
}

function testRemoveShowcaseReturnsJewelryToStorage() {
  const item = { id: 'j-4', status: 'displayed', displayBranchNumber: 1, recommendedPrice: 20000 };
  const h = makeHarness({ screen: 'showcaseDetail', jewelry: [item], branch1Showcases: [showcase('s1', [{ jewelryId: item.id, sellingPrice: 21000 }, null, null, null, null])] });
  h.api.removeShowcase(0, 0, 'store-1');
  assert.equal(item.status, 'stored');
  assert.equal('displayBranchNumber' in item, false);
  assert.equal(h.branch1.showcases[0].slots[0], null);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.screens[0][0], 'store');
  assertNoTimeOrMoneyCost(h);
}

function testMoveShowcaseItemPreservesSellingPrice() {
  const item = { id: 'j-5', status: 'displayed', displayBranchNumber: 1, recommendedPrice: 20000 };
  const sourceSlot = { jewelryId: item.id, sellingPrice: 27000 };
  const h = makeHarness({ jewelry: [item], branch1Showcases: [showcase('s1', [sourceSlot, null, null, null, null])], branch2Showcases: [showcase('s2')] });
  h.api.moveShowcaseItem(item.id, 2);
  assert.equal(h.branch1.showcases[0].slots[0], null);
  assert.deepEqual(plain(h.branch2.showcases[0].slots[0]), sourceSlot);
  assert.equal(item.status, 'displayed');
  assert.equal(item.displayBranchNumber, 2);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.closes, 1);
  assert.equal(h.calls.renders, 1);
  assertNoTimeOrMoneyCost(h);

  const sameItem = { id: 'j-5', status: 'displayed', displayBranchNumber: 1, recommendedPrice: 20000 };
  const sameSlot = { jewelryId: sameItem.id, sellingPrice: 27000 };
  const same = makeHarness({ jewelry: [sameItem], branch1Showcases: [showcase('s1', [sameSlot, null, null, null, null])], branch2Showcases: [showcase('s2')] });
  const before = plain(same.state);
  same.api.moveShowcaseItem(sameItem.id, 1);
  assert.deepEqual(plain(same.state), before);
  assert.equal(same.calls.saves, 0);
  assertNoTimeOrMoneyCost(same);
}

function testSellingPriceAdjustmentIsDraftOnlyAndFloored() {
  const item = { id: 'j-6', status: 'displayed', displayBranchNumber: 1, recommendedPrice: 10000 };
  const h = makeHarness({ screen: 'showcaseDetail', jewelry: [item], branch1Showcases: [showcase('s1', [{ jewelryId: item.id, sellingPrice: 10000 }, null, null, null, null])] });
  const up = { disabled: false, dataset: { branch: 'store-1', showcase: '0', slot: '0', delta: '1' } };
  assert.equal(h.api.adjustShowcaseSellingPrice(up), true);
  assert.equal(h.screenData.pendingSellingPrice, 11000);
  assert.equal(h.branch1.showcases[0].slots[0].sellingPrice, 10000);
  assert.equal(h.calls.saves, 0);
  assert.equal(h.calls.preview.length, 1);
  assertNoTimeOrMoneyCost(h);

  const floorItem = { id: 'j-floor', status: 'displayed', displayBranchNumber: 1, recommendedPrice: 1000 };
  const floor = makeHarness({ screen: 'showcaseDetail', jewelry: [floorItem], branch1Showcases: [showcase('s1', [{ jewelryId: floorItem.id, sellingPrice: 1000 }, null, null, null, null])] });
  const down = { disabled: false, dataset: { branch: 'store-1', showcase: '0', slot: '0', delta: '-1' } };
  assert.equal(floor.api.adjustShowcaseSellingPrice(down), false);
  assert.equal(floor.branch1.showcases[0].slots[0].sellingPrice, 1000);
  assert.equal(floor.calls.saves, 0);
  assertNoTimeOrMoneyCost(floor);
}

function testSellingPriceConfirmCommitsPendingPrice() {
  const item = { id: 'j-7', status: 'displayed', displayBranchNumber: 1, recommendedPrice: 10000 };
  const h = makeHarness({ screen: 'showcaseDetail', screenData: { pendingSellingPrice: 17000 }, jewelry: [item], branch1Showcases: [showcase('s1', [{ jewelryId: item.id, sellingPrice: 10000 }, null, null, null, null])] });
  const button = { dataset: { branch: 'store-1', showcase: '0', slot: '0' } };
  h.api.confirmSellingPrice(button);
  assert.equal(h.branch1.showcases[0].slots[0].sellingPrice, 17000);
  assert.equal(h.screenData.pendingSellingPrice, 17000);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(h.calls.toasts, [['販売価格を¥17,000で決定しました。']]);
  assert.equal(h.calls.preview.length, 1);
  assertNoTimeOrMoneyCost(h);

  const sameItem = { id: 'j-8', status: 'displayed', displayBranchNumber: 1, recommendedPrice: 10000 };
  const same = makeHarness({ screen: 'showcaseDetail', screenData: { pendingSellingPrice: 10000 }, jewelry: [sameItem], branch1Showcases: [showcase('s1', [{ jewelryId: sameItem.id, sellingPrice: 10000 }, null, null, null, null])] });
  const sameButton = { dataset: { branch: 'store-1', showcase: '0', slot: '0' } };
  same.api.confirmSellingPrice(sameButton);
  assert.equal(same.calls.saves, 0);
  assertNoTimeOrMoneyCost(same);
}

function testInstallationBasicGuards() {
  const unrented = makeHarness({ rented: false, showcaseOwned: 1 });
  unrented.api.installDisplayProduct('showcase');
  assert.equal(unrented.calls.saves, 0);
  assert.deepEqual(unrented.calls.toasts, [['店舗を契約してから設置できます。', 'error']]);
  assertNoTimeOrMoneyCost(unrented);

  const unowned = makeHarness({ showcaseOwned: 0 });
  unowned.api.installDisplayProduct('showcase');
  assert.equal(unowned.calls.saves, 0);
  assert.deepEqual(unowned.calls.toasts, [['設置できる商品を所持していません。', 'error']]);
  assertNoTimeOrMoneyCost(unowned);
}

testShowcaseInstallationAndLimits();
testDisplaySuppliesInstallationAndGuards();
testCaseMultiInstallAndMaximum();
testPlaceItemUsesFirstEmptyShowcaseSlot();
testPlaceItemInExactSlotAndOccupiedGuard();
testRemoveShowcaseReturnsJewelryToStorage();
testMoveShowcaseItemPreservesSellingPrice();
testSellingPriceAdjustmentIsDraftOnlyAndFloored();
testSellingPriceConfirmCommitsPendingPrice();
testInstallationBasicGuards();

console.log('STORE DISPLAY MANAGEMENT REGRESSION: PASS');
console.log('Store display management current behavior protected: equipment install, showcase slots, case quantities, display supplies, placement/removal/move, selling-price draft/confirm, save/display sync, and no time or money cost.');
