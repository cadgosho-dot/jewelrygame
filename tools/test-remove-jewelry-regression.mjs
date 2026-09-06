import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const match = new RegExp(`^(?:async\\s+)?function ${name}\\([^\\n]*\\) \\{`, 'm').exec(app);
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

const source = extractFunction('removeJewelry');

function harness(options = {}) {
  const calls = [];
  const state = structuredClone(options.state || {
    game: { day: 12 },
    inventory: {
      jewelry: [
        { id: 'j-1', name: 'Ring', status: 'displayed', cost: 1000, displayBranchNumber: 1 },
        { id: 'j-2', name: 'Pendant', status: 'displayed', cost: 700, displayBranchNumber: 2 },
      ],
    },
    store: {
      branches: [
        { id: 'branch-1', number: 1, showcases: [{ id: 'a', slots: [{ jewelryId: 'j-1' }, { jewelryId: 'j-2' }, null] }] },
        { id: 'branch-2', number: 2, showcases: [{ id: 'b', slots: [null, { jewelryId: 'j-1' }] }] },
      ],
    },
  });
  const current = state.store.branches[0] || null;
  const ctx = {
    state,
    branchShowcases: (branch) => branch.showcases || [],
    currentStoreBranch: () => current,
    mirrorCurrentStoreDisplay: (branch) => calls.push(branch?.id || null),
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:remove-jewelry' });
  return { ctx, calls };
}

function testSaleClearsAllShowcasesAndRecordsMetadata() {
  const { ctx, calls } = harness();
  ctx.removeJewelry('j-1', { price: 2500.4, branchNumber: 2.8, channel: 'customer' });
  const item = ctx.state.inventory.jewelry.find((entry) => entry.id === 'j-1');
  assert.equal(item.status, 'sold');
  assert.equal(item.removedDay, 12);
  assert.equal(item.soldDay, 12);
  assert.equal(item.soldPrice, 2500);
  assert.equal(item.soldProfit, 1500);
  assert.equal(item.soldBranchNumber, 2);
  assert.equal(item.soldChannel, 'customer');
  assert.equal('displayBranchNumber' in item, false);
  assert.equal(ctx.state.store.branches[0].showcases[0].slots[0], null);
  assert.deepEqual(ctx.state.store.branches[0].showcases[0].slots[1], { jewelryId: 'j-2' });
  assert.equal(ctx.state.store.branches[1].showcases[0].slots[1], null);
  assert.deepEqual(calls, ['branch-1']);
}

function testStolenRemovalUsesFallbackReasonWithoutSaleFields() {
  const { ctx } = harness({
    state: {
      game: { day: 5 },
      inventory: { jewelry: [{ id: 'stolen', status: 'displayed', cost: 900, stolenDay: 4, displayBranchNumber: 1 }] },
      store: { branches: [{ id: 'branch-1', showcases: [{ slots: [{ jewelryId: 'stolen' }] }] }] },
    },
  });
  ctx.removeJewelry('stolen');
  const item = ctx.state.inventory.jewelry[0];
  assert.equal(item.status, 'sold');
  assert.equal(item.removedDay, 5);
  assert.equal(item.removalReason, 'stolen');
  assert.equal('soldDay' in item, false);
  assert.equal('soldPrice' in item, false);
  assert.equal('soldProfit' in item, false);
  assert.equal('displayBranchNumber' in item, false);
}

function testExplicitReasonOverridesStolenAndNormalizesBranch() {
  const { ctx } = harness({
    state: {
      game: { day: 0 },
      inventory: { jewelry: [{ id: 'x', status: 'stored', cost: -200, stolenDay: 1, displayBranchNumber: 9 }] },
      store: { branches: [] },
    },
  });
  ctx.removeJewelry('x', { price: 100.6, branchNumber: 0, channel: 123, reason: 'gift-cleanup' });
  const item = ctx.state.inventory.jewelry[0];
  assert.equal(item.removedDay, 1);
  assert.equal(item.soldPrice, 101);
  assert.equal(item.soldProfit, 101);
  assert.equal(item.soldBranchNumber, 1);
  assert.equal(item.soldChannel, '123');
  assert.equal(item.removalReason, 'gift-cleanup');
}

function testInvalidPriceDoesNotCreateSaleAccountingFields() {
  const { ctx } = harness();
  ctx.removeJewelry('j-2', { price: 'not-a-number', branchNumber: 3, channel: 'wholesale' });
  const item = ctx.state.inventory.jewelry.find((entry) => entry.id === 'j-2');
  assert.equal(item.status, 'sold');
  assert.equal('soldDay' in item, false);
  assert.equal('soldPrice' in item, false);
  assert.equal('soldProfit' in item, false);
  assert.equal(item.soldBranchNumber, 3);
  assert.equal(item.soldChannel, 'wholesale');
}

function testMissingItemStillClearsDanglingShowcaseReferencesAndMirrors() {
  const { ctx, calls } = harness({
    state: {
      game: { day: 8 },
      inventory: { jewelry: [] },
      store: {
        branches: [
          { id: 'branch-1', showcases: [{ slots: [{ jewelryId: 'ghost' }, { jewelryId: 'keep' }] }] },
          { id: 'branch-2', showcases: [{ slots: [{ jewelryId: 'ghost' }] }] },
        ],
      },
    },
  });
  ctx.removeJewelry('ghost', { price: 500 });
  assert.equal(ctx.state.store.branches[0].showcases[0].slots[0], null);
  assert.deepEqual(ctx.state.store.branches[0].showcases[0].slots[1], { jewelryId: 'keep' });
  assert.equal(ctx.state.store.branches[1].showcases[0].slots[0], null);
  assert.deepEqual(calls, ['branch-1']);
}

for (const test of [
  testSaleClearsAllShowcasesAndRecordsMetadata,
  testStolenRemovalUsesFallbackReasonWithoutSaleFields,
  testExplicitReasonOverridesStolenAndNormalizesBranch,
  testInvalidPriceDoesNotCreateSaleAccountingFields,
  testMissingItemStillClearsDanglingShowcaseReferencesAndMirrors,
]) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('REMOVE JEWELRY REGRESSION: PASS');
