import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

function extractFunctionSource(name) {
  const lines = appSource.split(/\r?\n/);
  const pattern = new RegExp(`^\\s*function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`);
  for (let start = 0; start < lines.length; start += 1) {
    if (!pattern.test(lines[start])) continue;
    let depth = 0;
    let seen = false;
    for (let end = start; end < lines.length; end += 1) {
      const line = lines[end];
      depth += (line.match(/\{/g) || []).length;
      depth -= (line.match(/\}/g) || []).length;
      if (line.includes('{')) seen = true;
      if (seen && depth <= 0) return lines.slice(start, end + 1).join('\n');
    }
  }
  throw new Error(`${name} definition was not found`);
}

const craftSource = extractFunctionSource('craft');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createDraft(overrides = {}) {
  return {
    orderId: null,
    item: 'ring',
    useLoose: true,
    gem: 'garnet',
    looseShape: 'round',
    metal: 'silver',
    design: 'simple',
    finish: 'mirror',
    ...overrides,
  };
}

function createBaseState({ order = false, capacity = 10 } = {}) {
  return {
    game: { day: 30, minutes: 600, money: 100000 },
    workshop: { activeHours: 4 },
    inventory: {
      metals: { silver: 10 },
      loose: { garnet: { round: 3 } },
      jewelry: [],
      capacity,
    },
    daily: { crafted: [] },
    store: { playerCraftedCount: 2 },
    artisan: { xp: 40 },
    orders: order ? [{ id: 'o1', customerName: 'テスト客', status: '受注', jewelryId: null }] : [],
  };
}

function createHarness({
  state = createBaseState(),
  draft = createDraft(),
  workshopOpen = true,
  benchUsable = true,
  canSpend = true,
  requirements = {
    enoughLoose: true,
    enoughMetal: true,
    requiredLooseQuantity: 1,
    requiredMetalWeight: 3,
    ownedMetalWeight: 10,
  },
  hours = 2,
  toolFailure = null,
} = {}) {
  const calls = {
    closeModal: 0,
    toasts: [],
    looseAdjustments: [],
    spendHours: [],
    workshopHours: [],
    artisanXp: [],
    notifications: [],
    save: 0,
    sfx: [],
    vibrations: [],
    screens: [],
    toolFailureChecks: 0,
  };

  const context = {
    state,
    craftDraft: draft,
    completionId: null,
    Number,
    Math,
    closeModal: () => { calls.closeModal += 1; },
    workshopOperating: () => workshopOpen,
    toolUsable: (toolId) => toolId === 'jewelryBench' ? benchUsable : true,
    showToast: (message, type = 'info') => calls.toasts.push({ message, type }),
    productionHours: () => hours,
    canSpendHours: () => canSpend,
    materialRequirementsFor: () => plain(requirements),
    adjustLooseInventory: (gem, shape, delta) => {
      calls.looseAdjustments.push({ gem, shape, delta });
      state.inventory.loose[gem] = state.inventory.loose[gem] || {};
      state.inventory.loose[gem][shape] = (Number(state.inventory.loose[gem][shape]) || 0) + delta;
    },
    roundedMetalWeight: (value) => Math.round(Number(value) * 1000) / 1000,
    spendHours: (value) => {
      calls.spendHours.push(value);
      state.game.minutes += value * 60;
    },
    addWorkshopActiveHours: (value) => {
      calls.workshopHours.push(value);
      state.workshop.activeHours = Math.round((Number(state.workshop.activeHours) + value) * 10) / 10;
    },
    qualityRoll: () => 'excellent',
    craftProductionProfile: () => ({ version: 1, craftsmanshipScore: 88, tier: '熟練', priceMultiplier: 1.1, tags: ['精密成形'] }),
    artisanXpForCraft: () => 12,
    uid: () => 'j-craft-1',
    itemName: () => 'テストリング',
    productionCost: () => 18000,
    craftsmanshipRecommendedPrice: () => 50000,
    craftsmanshipSnapshot: (profile) => ({
      craftsmanshipProfileVersion: profile.version,
      craftsmanshipScore: profile.craftsmanshipScore,
      craftsmanshipTier: profile.tier,
      craftsmanshipPriceMultiplier: profile.priceMultiplier,
      craftsmanshipTags: [...profile.tags],
    }),
    addArtisanXp: (xp) => {
      calls.artisanXp.push(xp);
      state.artisan.xp += xp;
    },
    addNotification: (title, body, type = 'info') => calls.notifications.push({ title, body, type }),
    checkWorkshopToolFailure: () => { calls.toolFailureChecks += 1; return toolFailure; },
    saveGame: () => { calls.save += 1; return Promise.resolve(); },
    playSfx: (name, options = {}) => calls.sfx.push({ name, options: plain(options) }),
    vibrate: (pattern) => calls.vibrations.push(plain(pattern)),
    setScreen: (target, data = {}, push = true) => calls.screens.push({ target, data: plain(data), push }),
  };

  vm.createContext(context);
  new vm.Script(`"use strict";\n${craftSource}\nglobalThis.__craft = craft;`).runInContext(context);
  return { state, calls, context, craft: context.__craft };
}

function testSuccessfulStandaloneCraft() {
  const state = createBaseState();
  const harness = createHarness({ state, toolFailure: 'ヤスリ' });
  harness.craft();

  assert.equal(state.inventory.metals.silver, 7);
  assert.equal(state.inventory.loose.garnet.round, 2);
  assert.equal(state.game.minutes, 720);
  assert.equal(state.workshop.activeHours, 6);
  assert.equal(state.inventory.jewelry.length, 1);
  const jewelry = state.inventory.jewelry[0];
  assert.equal(jewelry.id, 'j-craft-1');
  assert.equal(jewelry.name, 'テストリング');
  assert.equal(jewelry.item, 'ring');
  assert.equal(jewelry.useLoose, true);
  assert.equal(jewelry.gem, 'garnet');
  assert.equal(jewelry.looseShape, 'round');
  assert.equal(jewelry.metal, 'silver');
  assert.equal(jewelry.design, 'simple');
  assert.equal(jewelry.quality, 'excellent');
  assert.equal(jewelry.cost, 18000);
  assert.equal(jewelry.recommendedPrice, 50000);
  assert.equal(jewelry.xp, 12);
  assert.equal(jewelry.status, 'stored');
  assert.equal(jewelry.createdDay, 30);
  assert.equal(jewelry.craftsmanshipScore, 88);
  assert.equal(jewelry.craftsmanshipTier, '熟練');

  assert.deepEqual(plain(state.daily.crafted), ['j-craft-1']);
  assert.equal(state.store.playerCraftedCount, 3);
  assert.equal(state.artisan.xp, 52);
  assert.deepEqual(plain(harness.calls.looseAdjustments), [{ gem: 'garnet', shape: 'round', delta: -1 }]);
  assert.deepEqual(plain(harness.calls.spendHours), [2]);
  assert.deepEqual(plain(harness.calls.workshopHours), [2]);
  assert.deepEqual(plain(harness.calls.artisanXp), [12]);
  assert.equal(harness.calls.toolFailureChecks, 1);
  assert.equal(harness.context.completionId, 'j-craft-1');
  assert.equal(harness.context.craftDraft, null);
  assert.equal(harness.calls.save, 1);
  assert.deepEqual(plain(harness.calls.sfx), [{ name: 'jewelry-complete', options: { gain: 1.2 } }]);
  assert.deepEqual(plain(harness.calls.vibrations), [[45, 25, 65, 25, 100]]);
  assert.deepEqual(plain(harness.calls.screens), [{ target: 'completion', data: { toolFailure: 'ヤスリ' }, push: true }]);
  assert.equal(harness.calls.notifications.length, 0);
  assert.equal(harness.calls.toasts.length, 0);
  assert.equal(harness.calls.closeModal, 1);
}

function testCraftWithoutLooseDoesNotConsumeLoose() {
  const state = createBaseState();
  const harness = createHarness({ state, draft: createDraft({ useLoose: false }) });
  harness.craft();

  assert.equal(state.inventory.loose.garnet.round, 3);
  assert.equal(harness.calls.looseAdjustments.length, 0);
  assert.equal(state.inventory.metals.silver, 7);
  assert.equal(state.inventory.jewelry.length, 1);
  assert.equal(state.inventory.jewelry[0].useLoose, false);
}

function testOrderCraftMarksOrderComplete() {
  const state = createBaseState({ order: true });
  const harness = createHarness({ state, draft: createDraft({ orderId: 'o1' }) });
  harness.craft();

  const order = state.orders[0];
  const jewelry = state.inventory.jewelry[0];
  assert.equal(jewelry.status, 'order');
  assert.equal(order.status, '完成');
  assert.equal(order.jewelryId, jewelry.id);
  assert.deepEqual(plain(harness.calls.notifications), [{
    title: '注文品が完成しました', body: 'テスト客さんの注文品を納品できます。', type: 'info',
  }]);
  assert.equal(harness.calls.save, 1);
  assert.equal(harness.context.completionId, jewelry.id);
}

function assertGuardNoProduction(harness, expectedToast) {
  const before = plain(harness.state);
  const originalDraft = plain(harness.context.craftDraft);
  harness.craft();
  assert.deepEqual(plain(harness.state), before);
  assert.deepEqual(plain(harness.context.craftDraft), originalDraft);
  assert.equal(harness.context.completionId, null);
  assert.deepEqual(plain(harness.calls.toasts), [expectedToast]);
  assert.equal(harness.calls.closeModal, 1);
  assert.equal(harness.calls.looseAdjustments.length, 0);
  assert.equal(harness.calls.spendHours.length, 0);
  assert.equal(harness.calls.workshopHours.length, 0);
  assert.equal(harness.calls.artisanXp.length, 0);
  assert.equal(harness.calls.notifications.length, 0);
  assert.equal(harness.calls.toolFailureChecks, 0);
  assert.equal(harness.calls.save, 0);
  assert.equal(harness.calls.sfx.length, 0);
  assert.equal(harness.calls.vibrations.length, 0);
  assert.equal(harness.calls.screens.length, 0);
}

function testCraftGuardRails() {
  assertGuardNoProduction(createHarness({ workshopOpen: false }), { message: '工房は作業停止中です。', type: 'error' });
  assertGuardNoProduction(createHarness({ benchUsable: false }), { message: 'ジュエリー作成には使用可能な彫金机が必要です。', type: 'error' });
  assertGuardNoProduction(createHarness({ draft: createDraft({ useLoose: undefined }) }), { message: 'ルースを使用するか選択してください。', type: 'error' });
  assertGuardNoProduction(createHarness({ canSpend: false }), { message: '今日は制作する時間がありません。', type: 'error' });
  assertGuardNoProduction(createHarness({ requirements: {
    enoughLoose: false, enoughMetal: true, requiredLooseQuantity: 1, requiredMetalWeight: 3, ownedMetalWeight: 10,
  } }), { message: '材料が足りません。', type: 'error' });

  const capacityState = createBaseState({ capacity: 1 });
  capacityState.inventory.jewelry.push({ id: 'existing', status: 'stored' });
  assertGuardNoProduction(createHarness({ state: capacityState }), { message: '完成品の保管場所に空きがありません。', type: 'error' });
}

const tests = [
  testSuccessfulStandaloneCraft,
  testCraftWithoutLooseDoesNotConsumeLoose,
  testOrderCraftMarksOrderComplete,
  testCraftGuardRails,
];

for (const test of tests) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('CRAFT REGRESSION: PASS');
console.log('craft() の材料消費・時間・完成品生成・職人経験値・注文完成連携・保存・主要ガードを固定しました。');
