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

const maxSource = extractFunction('tropicalShopMaxQuantity');
const purchaseSource = extractFunction('purchaseTropicalShopItem');
const plain = (value) => JSON.parse(JSON.stringify(value));

const products = {
  fish: { category: 'fish', id: 'tetra', name: 'テトラ', price: 100 },
  plant: { category: 'plant', id: 'anubias', name: 'アヌビアス', price: 200 },
  display: { category: 'display', id: 'rock', name: 'レイアウトストーン', price: 300, family: 'rock' },
  driftwood: { category: 'display', id: 'wood', name: '流木', price: 400, family: 'driftwood' },
};

function makeAquarium() {
  return {
    fish: { tetra: { owned: 1, inTank: 1 } },
    plants: { anubias: { owned: 0, inTank: 0 } },
    displayItems: {
      rock: { owned: 0, installed: 0 },
      wood: { owned: 0, installed: 0 },
    },
    lastSyncRevision: 10,
  };
}

function makeHarness(overrides = {}) {
  const calls = {
    ensureFish: 0,
    ensurePlants: 0,
    addFish: [],
    addPlants: [],
    refresh: 0,
    finance: [],
    notifications: [],
    saves: 0,
    feedback: [],
    sfx: [],
    vibrations: [],
    renders: 0,
    toasts: [],
  };
  const aquarium = overrides.aquarium || makeAquarium();
  const state = {
    game: {
      money: overrides.money ?? 1000,
      day: overrides.day ?? 12,
    },
  };
  const screenData = overrides.hasOwnProperty('screenData')
    ? overrides.screenData
    : { tropicalModal: { category: overrides.category ?? 'fish', id: overrides.id ?? 'tetra', qty: overrides.qty ?? 1 } };
  const familyCounts = { rock: overrides.rockCount ?? 0, driftwood: overrides.driftwoodCount ?? 0 };
  const context = {
    state,
    screenData,
    AQUARIUM_CONFIG: { capacity: { fishLoadMax: overrides.fishLoadMax ?? 10, plantTotalMax: overrides.plantTotalMax ?? 5 } },
    aquariumState: () => aquarium,
    aquariumFishDefinition: (id) => id === 'tetra' ? { speciesMax: overrides.speciesMax ?? 5, loadPoint: overrides.loadPoint ?? 2 } : null,
    aquariumFishLoad: () => overrides.currentFishLoad ?? (aquarium.fish.tetra.inTank * (overrides.loadPoint ?? 2)),
    aquariumPlantTotal: () => overrides.currentPlantTotal ?? Object.values(aquarium.plants).reduce((sum, row) => sum + row.inTank, 0),
    tropicalShopFamilyCount: (family) => familyCounts[family] ?? 0,
    tropicalShopFindProduct: (category, id) => Object.values(products).find((product) => product.category === category && product.id === id) || null,
    ensureAquariumFishIndividuals: () => { calls.ensureFish += 1; },
    ensureAquariumPlantIndividuals: () => { calls.ensurePlants += 1; },
    addAquariumFishIndividuals: (...args) => calls.addFish.push(args),
    addAquariumPlantIndividuals: (...args) => calls.addPlants.push(args),
    refreshAquariumLoad: () => { calls.refresh += 1; },
    addFinance: (...args) => calls.finance.push(args),
    addNotification: (...args) => calls.notifications.push(args),
    saveGame: () => { calls.saves += 1; },
    startMoneyFeedback: (...args) => calls.feedback.push(args),
    playSfx: (...args) => calls.sfx.push(args),
    vibrate: (...args) => calls.vibrations.push(args),
    render: () => { calls.renders += 1; },
    showToast: (...args) => calls.toasts.push(args),
    Math,
    Number,
  };
  vm.createContext(context);
  const maxDefinition = overrides.mockMax
    ? `globalThis.tropicalShopMaxQuantity = () => ${Number(overrides.maxValue ?? 1)};`
    : `${maxSource}\nglobalThis.tropicalShopMaxQuantity = tropicalShopMaxQuantity;`;
  vm.runInContext(`
    ${maxDefinition}
    ${purchaseSource}
    globalThis.__max = globalThis.tropicalShopMaxQuantity;
    globalThis.__purchase = purchaseTropicalShopItem;
  `, context);
  return { state, aquarium, screenData, calls, max: context.__max, purchase: context.__purchase };
}

function testMaxQuantityProtectsFishCapacityLoadAndAffordability() {
  const normal = makeHarness({ money: 1000, speciesMax: 5, currentFishLoad: 2, fishLoadMax: 10, loadPoint: 2 });
  assert.equal(normal.max(products.fish), 4);

  const speciesBound = makeHarness({ money: 1000, speciesMax: 2, currentFishLoad: 2, fishLoadMax: 10, loadPoint: 2 });
  assert.equal(speciesBound.max(products.fish), 1);

  const loadBound = makeHarness({ money: 1000, speciesMax: 20, currentFishLoad: 8, fishLoadMax: 10, loadPoint: 2 });
  assert.equal(loadBound.max(products.fish), 1);

  const moneyBound = makeHarness({ money: 250, speciesMax: 20, currentFishLoad: 0, fishLoadMax: 20, loadPoint: 1 });
  assert.equal(moneyBound.max(products.fish), 2);
}

function testMaxQuantityProtectsPlantAndDisplayCaps() {
  const plants = makeHarness({ money: 1000, currentPlantTotal: 3, plantTotalMax: 5 });
  assert.equal(plants.max(products.plant), 2);

  const rock = makeHarness({ money: 5000, rockCount: 4 });
  assert.equal(rock.max(products.display), 1);

  const driftwood = makeHarness({ money: 5000, driftwoodCount: 2 });
  assert.equal(driftwood.max(products.driftwood), 1);
}

function testFishPurchaseProtectsAquariumMoneyAccountingAndFeedback() {
  const h = makeHarness({ category: 'fish', id: 'tetra', qty: 2, money: 1000 });
  h.purchase();
  assert.equal(h.aquarium.fish.tetra.owned, 3);
  assert.equal(h.aquarium.fish.tetra.inTank, 3);
  assert.equal(h.calls.ensureFish, 1);
  assert.deepEqual(plain(h.calls.addFish), [['tetra', 2, h.aquarium, 12]].map((row) => plain(row)));
  assert.equal(h.calls.refresh, 1);
  assert.equal(h.aquarium.lastSyncRevision, 11);
  assert.equal(h.state.game.money, 800);
  assert.deepEqual(h.calls.finance, [['熱帯魚屋 テトラ', 0, 200]]);
  assert.deepEqual(h.calls.notifications, [['テトラを購入しました', '2匹を水槽へ入れました。', 'special']]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(h.calls.feedback, [[-200, 1200]]);
  assert.deepEqual(h.calls.sfx, [['coin', { gain: 0.86 }]]);
  assert.deepEqual(h.calls.vibrations, [[28]]);
  assert.equal(h.calls.renders, 1);
  assert.equal('tropicalModal' in h.screenData, false);
}

function testPlantAndDisplayPurchaseBranches() {
  const plant = makeHarness({ category: 'plant', id: 'anubias', qty: 2, money: 1000 });
  plant.purchase();
  assert.equal(plant.aquarium.plants.anubias.owned, 2);
  assert.equal(plant.aquarium.plants.anubias.inTank, 2);
  assert.equal(plant.calls.ensurePlants, 1);
  assert.deepEqual(plain(plant.calls.addPlants), [['anubias', 2, plant.aquarium, 12]].map((row) => plain(row)));
  assert.deepEqual(plant.calls.notifications, [['アヌビアスを購入しました', '2株を水槽へ入れました。', 'special']]);

  const display = makeHarness({ category: 'display', id: 'rock', qty: 2, money: 1000 });
  display.purchase();
  assert.equal(display.aquarium.displayItems.rock.owned, 2);
  assert.equal(display.aquarium.displayItems.rock.installed, 2);
  assert.deepEqual(display.calls.notifications, [['レイアウトストーンを購入しました', '2個を水槽へ設置しました。', 'special']]);
}

function testRequestedQuantityIsClampedToCurrentMaximum() {
  const h = makeHarness({ category: 'fish', id: 'tetra', qty: 99, money: 250, speciesMax: 20, currentFishLoad: 0, fishLoadMax: 20, loadPoint: 1 });
  h.purchase();
  assert.equal(h.aquarium.fish.tetra.owned, 3);
  assert.equal(h.aquarium.fish.tetra.inTank, 3);
  assert.equal(h.state.game.money, 50);
  assert.deepEqual(h.calls.finance, [['熱帯魚屋 テトラ', 0, 200]]);
}

function testPurchaseGuardRails() {
  const noModal = makeHarness({ screenData: {}, money: 1000 });
  noModal.purchase();
  assert.equal(noModal.state.game.money, 1000);
  assert.equal(noModal.calls.saves, 0);

  const missingProduct = makeHarness({ category: 'fish', id: 'missing', qty: 1, money: 1000 });
  missingProduct.purchase();
  assert.equal(missingProduct.state.game.money, 1000);
  assert.equal(missingProduct.calls.saves, 0);

  const zero = makeHarness({ category: 'fish', id: 'tetra', qty: 0, money: 1000 });
  zero.purchase();
  assert.deepEqual(zero.calls.toasts, [['購入できません。', 'error']]);
  assert.equal(zero.calls.saves, 0);

  const noAffordableUnit = makeHarness({ category: 'fish', id: 'tetra', qty: 1, money: 50 });
  noAffordableUnit.purchase();
  assert.deepEqual(noAffordableUnit.calls.toasts, [['購入できません。', 'error']]);
  assert.equal(noAffordableUnit.calls.saves, 0);

  const explicitMoneyGuard = makeHarness({ category: 'fish', id: 'tetra', qty: 1, money: 50, mockMax: true, maxValue: 1 });
  explicitMoneyGuard.purchase();
  assert.deepEqual(explicitMoneyGuard.calls.toasts, [['所持金が足りません。', 'error']]);
  assert.equal(explicitMoneyGuard.calls.saves, 0);
}

testMaxQuantityProtectsFishCapacityLoadAndAffordability();
testMaxQuantityProtectsPlantAndDisplayCaps();
testFishPurchaseProtectsAquariumMoneyAccountingAndFeedback();
testPlantAndDisplayPurchaseBranches();
testRequestedQuantityIsClampedToCurrentMaximum();
testPurchaseGuardRails();

console.log('TROPICAL SHOP PURCHASE REGRESSION: PASS');
console.log('tropicalShopMaxQuantity()/purchaseTropicalShopItem() current behavior protected: fish/load/species, plants, display family, affordability, quantity clamp, aquarium updates, money, finance, notification, save, feedback, sfx, vibration, modal cleanup, and render.');
