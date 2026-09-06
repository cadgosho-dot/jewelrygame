import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const match = new RegExp(`^function ${name}\\([^\\n]*\\) \\{`, 'm').exec(app);
  assert.ok(match, `${name} definition missing`);
  const start = match.index;
  const brace = start + match[0].length - 1;
  let depth = 0, quote = null, escaped = false, line = false, block = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i], next = app[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && next === '/') { block = false; i += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { line = true; i += 1; continue; }
    if (c === '/' && next === '*') { block = true; i += 1; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return app.slice(start, i + 1);
  }
  throw new Error(`${name} closing brace missing`);
}

const names = ['removeGiftFromGameState', 'addGiftToGameState', 'restoreGiftToGameState'];
const source = names.map(extractFunction).join('\n');
const plain = (value) => JSON.parse(JSON.stringify(value));

function baseState(overrides = {}) {
  return {
    game: { day: 17 },
    inventory: {
      rough: { ruby: 5 },
      loose: { ruby: { round: 4 } },
      items: { snack: 3 },
      metals: { gold: 5.5 },
      metalCapacity: { gold: 10 },
      jewelry: [
        { id: 'j1', item: 'ring', status: 'stored', displayBranchNumber: 1, orderId: 'old-order' },
        { id: 'j2', item: 'ring', status: 'displayed' },
      ],
    },
    gifts: { outbox: [], inbox: [] },
    notifications: [],
    ...structuredClone(overrides),
  };
}

function harness(options = {}) {
  const ctx = {
    GEMS: { ruby: { name: 'ルビー' } },
    GENERAL_ITEMS: { snack: { name: 'おやつ' } },
    METALS: { gold: { name: 'K18', shortName: 'K18', storageLimit: 10 } },
    ITEMS: { ring: { name: 'リング' } },
    looseShapeIdsForGem: (id) => id === 'ruby' ? ['round'] : [],
    giftRoundedWeight: (value) => Math.round((Number(value) || 0) * 10) / 10,
    ensureGiftState: (gameState) => {
      gameState.gifts = gameState.gifts || { outbox: [], inbox: [] };
      gameState.gifts.outbox = Array.isArray(gameState.gifts.outbox) ? gameState.gifts.outbox : [];
      gameState.gifts.inbox = Array.isArray(gameState.gifts.inbox) ? gameState.gifts.inbox : [];
      return gameState.gifts;
    },
    giftOutboxEntry: (code, payload, status) => ({ code, payload: structuredClone(payload), status }),
    giftPayloadSummary: (payload) => ({ name: payload.id || payload.type, quantity: payload.quantity }),
    finishedJewelryCapacity: () => options.jewelryCapacity ?? 10,
    structuredClone,
    Date: class extends Date { static now() { return 1234567890; } toISOString() { return '2026-09-06T00:00:00.000Z'; } },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:gift-inventory' });
  return ctx;
}

function testRemoveGiftInventoryAcrossCategories() {
  const ctx = harness();
  const s = baseState();
  ctx.removeGiftFromGameState(s, { type: 'rough', id: 'ruby', quantity: 2 }, 'R1');
  ctx.removeGiftFromGameState(s, { type: 'loose', id: 'ruby', shapeId: 'round', quantity: 2 }, 'L1');
  ctx.removeGiftFromGameState(s, { type: 'item', id: 'snack', quantity: 2 }, 'I1');
  ctx.removeGiftFromGameState(s, { type: 'metal', id: 'gold', quantity: 1.2 }, 'M1');
  ctx.removeGiftFromGameState(s, { type: 'jewelry', id: 'j1', quantity: 1 }, 'J1');
  assert.equal(s.inventory.rough.ruby, 3);
  assert.equal(s.inventory.loose.ruby.round, 2);
  assert.equal(s.inventory.items.snack, 1);
  assert.equal(s.inventory.metals.gold, 4.3);
  assert.deepEqual(s.inventory.jewelry.map((item) => item.id), ['j2']);
  assert.equal(s.gifts.outbox.length, 5);
  assert.equal(s.gifts.outbox[0].code, 'J1');
  assert.ok(s.gifts.outbox.every((entry) => entry.status === 'pending'));
}

function testRemoveGiftGuardsAndOutboxBound() {
  const ctx = harness();
  const s = baseState();
  assert.throws(() => ctx.removeGiftFromGameState(s, { type: 'rough', id: 'ruby', quantity: 99 }, 'BAD1'), /所持数/);
  assert.throws(() => ctx.removeGiftFromGameState(s, { type: 'loose', id: 'ruby', shapeId: 'bad', quantity: 1 }, 'BAD2'), /データ/);
  assert.throws(() => ctx.removeGiftFromGameState(s, { type: 'jewelry', id: 'j2', quantity: 1 }, 'BAD3'), /現在プレゼントにできません/);
  assert.throws(() => ctx.removeGiftFromGameState(s, { type: 'unknown', id: 'x', quantity: 1 }, 'BAD4'), /種類/);
  assert.equal(s.inventory.rough.ruby, 5);
  assert.equal(s.gifts.outbox.length, 0);
  s.gifts.outbox = Array.from({ length: 50 }, (_, i) => ({ code: `OLD${i}`, status: 'pending' }));
  ctx.removeGiftFromGameState(s, { type: 'item', id: 'snack', quantity: 1 }, 'NEW');
  assert.equal(s.gifts.outbox.length, 50);
  assert.equal(s.gifts.outbox[0].code, 'NEW');
  assert.equal(s.gifts.outbox.at(-1).code, 'OLD48');
}

function testAddGiftInventoryAcrossCategories() {
  const ctx = harness();
  const s = baseState();
  ctx.addGiftToGameState(s, { type: 'rough', id: 'ruby', quantity: 2 }, 'R2');
  ctx.addGiftToGameState(s, { type: 'loose', id: 'ruby', shapeId: 'round', quantity: 2 }, 'L2');
  ctx.addGiftToGameState(s, { type: 'item', id: 'snack', quantity: 2 }, 'I2');
  ctx.addGiftToGameState(s, { type: 'metal', id: 'gold', quantity: 1.2 }, 'M2');
  assert.equal(s.inventory.rough.ruby, 7);
  assert.equal(s.inventory.loose.ruby.round, 6);
  assert.equal(s.inventory.items.snack, 5);
  assert.equal(s.inventory.metals.gold, 6.7);
  assert.equal(s.gifts.inbox.length, 4);
  assert.equal(s.notifications.length, 4);
  assert.equal(s.notifications[0].title, 'プレゼントを受け取りました');
  assert.equal(s.notifications[0].unread, true);
}

function testAddJewelryNormalizesIdentityAndRejectsDuplicateOrCapacity() {
  const payload = {
    type: 'jewelry', id: 'sender-jewel', quantity: 1,
    itemData: { id: 'sender-jewel', item: 'ring', status: 'displayed', displayBranchNumber: 3, orderId: 'order-x' },
  };
  const ctx = harness({ jewelryCapacity: 5 });
  const s = baseState();
  ctx.addGiftToGameState(s, payload, 'AB-CD12');
  const item = s.inventory.jewelry.find((entry) => entry.id === 'gift-abcd12');
  assert.ok(item);
  assert.equal(item.status, 'stored');
  assert.equal(item.receivedGiftCode, 'AB-CD12');
  assert.equal(item.receivedDay, 17);
  assert.equal('displayBranchNumber' in item, false);
  assert.equal('orderId' in item, false);
  assert.throws(() => ctx.addGiftToGameState(s, payload, 'AB-CD12'), /すでに在庫/);
  assert.equal(s.inventory.jewelry.filter((entry) => entry.id === 'gift-abcd12').length, 1);

  const fullCtx = harness({ jewelryCapacity: 2 });
  const full = baseState();
  assert.throws(() => fullCtx.addGiftToGameState(full, payload, 'FULL'), /保管場所/);
  assert.equal(full.gifts.inbox.length, 0);
}

function testAddMetalCapacityGuard() {
  const ctx = harness();
  const s = baseState();
  s.inventory.metals.gold = 9.5;
  assert.throws(() => ctx.addGiftToGameState(s, { type: 'metal', id: 'gold', quantity: 0.6 }, 'CAP'), /保管上限/);
  assert.equal(s.inventory.metals.gold, 9.5);
  assert.equal(s.gifts.inbox.length, 0);
  assert.equal(s.notifications.length, 0);
}

function testRestoreGiftReturnsInventoryAndMarksCancelled() {
  const ctx = harness();
  const s = baseState();
  s.inventory.items.snack = 1;
  s.gifts.outbox = [{ code: 'CANCEL1', status: 'pending' }];
  ctx.restoreGiftToGameState(s, { type: 'item', id: 'snack', quantity: 2 }, 'CANCEL1');
  assert.equal(s.inventory.items.snack, 3);
  assert.equal(s.gifts.outbox[0].status, 'cancelled');
  assert.equal(s.notifications[0].title, 'プレゼントを取り消しました');
  assert.equal(s.notifications[0].unread, true);
}

function testRestoreJewelryIsIdempotentByOriginalId() {
  const ctx = harness();
  const s = baseState();
  s.inventory.jewelry = [];
  s.gifts.outbox = [{ code: 'CANCELJ', status: 'pending' }];
  const payload = { type: 'jewelry', id: 'j-original', quantity: 1, itemData: { id: 'j-original', item: 'ring', status: 'displayed', displayBranchNumber: 2, orderId: 'o1' } };
  ctx.restoreGiftToGameState(s, payload, 'CANCELJ');
  ctx.restoreGiftToGameState(s, payload, 'CANCELJ');
  assert.equal(s.inventory.jewelry.length, 1);
  assert.equal(s.inventory.jewelry[0].id, 'j-original');
  assert.equal(s.inventory.jewelry[0].status, 'stored');
  assert.equal('displayBranchNumber' in s.inventory.jewelry[0], false);
  assert.equal('orderId' in s.inventory.jewelry[0], false);
}

for (const test of [
  testRemoveGiftInventoryAcrossCategories,
  testRemoveGiftGuardsAndOutboxBound,
  testAddGiftInventoryAcrossCategories,
  testAddJewelryNormalizesIdentityAndRejectsDuplicateOrCapacity,
  testAddMetalCapacityGuard,
  testRestoreGiftReturnsInventoryAndMarksCancelled,
  testRestoreJewelryIsIdempotentByOriginalId,
]) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('GIFT INVENTORY REGRESSION: PASS');
