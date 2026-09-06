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

const names = ['createGiftFromDraft', 'claimGiftPreview', 'cancelGift'];
const source = names.map(extractFunction).join('\n');
const plain = (value) => JSON.parse(JSON.stringify(value));

function harness(options = {}) {
  const calls = [];
  const toasts = [];
  const ctx = {
    giftBusy: false,
    currentUser: options.currentUser === undefined ? { uid: 'user-1' } : options.currentUser,
    giftDraft: structuredClone(options.giftDraft || { category: 'rough', itemKey: 'ruby', quantity: 2 }),
    giftPreview: options.giftPreview === undefined ? {
      code: 'GIFT-1234', senderName: 'Sender', payload: { type: 'rough', id: 'ruby', quantity: 1 },
    } : structuredClone(options.giftPreview),
    giftCodeInput: options.giftCodeInput ?? 'GIFT-1234',
    giftLastCreated: null,
    giftLastReceived: null,
    giftView: 'send',
    screen: 'phone',
    phoneTab: 'gift',
    state: structuredClone(options.state || {
      playerName: 'Craftsman',
      saveRevision: 42,
      gifts: { outbox: [{ code: 'CANCEL-1', status: 'pending' }], inbox: [] },
    }),
    normalizeGiftDraft: () => ({ row: options.row === undefined ? {
      key: 'ruby', max: 5, payload: { type: 'rough', id: 'ruby' },
    } : structuredClone(options.row) }),
    giftRoundedWeight: (value) => Math.round((Number(value) || 0) * 10) / 10,
    render: () => { calls.push('render'); },
    saveGame: async () => { calls.push('save'); return true; },
    confirmGiftCloudSave: async (uid, revision) => {
      calls.push(`confirm:${uid}:${revision}`);
      if (options.confirmError) throw options.confirmError;
      return true;
    },
    createGiftCode: async (uid, playerName, payload, callback) => {
      calls.push(`create:${uid}:${playerName}`);
      ctx.createdPayload = plain(payload);
      ctx.createdCallback = callback;
      if (options.createError) throw options.createError;
      return { code: 'NEW-CODE', gameState: { marker: 'created' } };
    },
    claimGiftCode: async (uid, playerName, code, callback) => {
      calls.push(`claim:${uid}:${playerName}:${code}`);
      ctx.claimCallback = callback;
      if (options.claimError) throw options.claimError;
      return { gameState: { marker: 'claimed' } };
    },
    cancelGiftCode: async (uid, code, callback) => {
      calls.push(`cancel:${uid}:${code}`);
      ctx.cancelCallback = callback;
      if (options.cancelError) throw options.cancelError;
      return { gameState: { marker: 'cancelled' } };
    },
    persistTransactionalGiftState: (gameState) => {
      calls.push(`persist:${gameState?.marker || 'none'}`);
      ctx.persistedState = plain(gameState);
    },
    removeGiftFromGameState: function removeGiftFromGameState() {},
    addGiftToGameState: function addGiftToGameState() {},
    restoreGiftToGameState: function restoreGiftToGameState() {},
    ensureGiftState: () => ctx.state.gifts,
    playSfx: (name) => { calls.push(`sfx:${name}`); },
    vibrate: () => { calls.push('vibrate'); },
    setTimeout: (fn) => { fn(); return 1; },
    showToast: (message, kind, autoHide) => { toasts.push({ message, kind, autoHide }); },
    giftErrorMessage: (error) => `gift-error:${error?.code || error?.message || 'unknown'}`,
    structuredClone,
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:gift-transaction' });
  return { ctx, calls, toasts };
}

async function testCreateGiftPersistsSaveBeforeCloudTransaction() {
  const { ctx, calls } = harness();
  await ctx.createGiftFromDraft();
  const saveIndex = calls.indexOf('save');
  const confirmIndex = calls.indexOf('confirm:user-1:42');
  const createIndex = calls.indexOf('create:user-1:Craftsman');
  const persistIndex = calls.indexOf('persist:created');
  assert.ok(saveIndex >= 0 && saveIndex < confirmIndex && confirmIndex < createIndex && createIndex < persistIndex);
  assert.deepEqual(ctx.createdPayload, { type: 'rough', id: 'ruby', quantity: 2 });
  assert.equal(ctx.createdCallback, ctx.removeGiftFromGameState);
  assert.deepEqual(plain(ctx.giftLastCreated), { code: 'NEW-CODE', payload: { type: 'rough', id: 'ruby', quantity: 2 } });
  assert.equal(ctx.giftView, 'created');
  assert.equal(ctx.giftBusy, false);
}

async function testCreateGiftGuardsInvalidDraftAndQuantity() {
  const missing = harness({ row: null });
  await missing.ctx.createGiftFromDraft();
  assert.equal(missing.calls.includes('save'), false);
  assert.match(missing.toasts[0]?.message || '', /渡せるプレゼント/);

  const tooMany = harness({ row: { key: 'ruby', max: 1, payload: { type: 'rough', id: 'ruby' } }, giftDraft: { category: 'rough', itemKey: 'ruby', quantity: 2 } });
  await tooMany.ctx.createGiftFromDraft();
  assert.equal(tooMany.calls.includes('save'), false);
  assert.match(tooMany.toasts[0]?.message || '', /数量/);
}

async function testCreateGiftMapsNoSaveAndUnlocksBusyState() {
  const error = Object.assign(new Error('no save'), { code: 'gift/no-save' });
  const { ctx, calls, toasts } = harness({ createError: error });
  await ctx.createGiftFromDraft();
  assert.ok(calls.indexOf('save') < calls.indexOf('confirm:user-1:42'));
  assert.equal(ctx.giftLastCreated, null);
  assert.equal(ctx.giftBusy, false);
  assert.equal(toasts.at(-1)?.message, 'gift-error:gift/cloud-save-unavailable');
  assert.equal(toasts.at(-1)?.kind, 'error');
}

async function testClaimGiftPersistsTransactionAndClearsPreview() {
  const { ctx, calls } = harness();
  const originalPreview = plain(ctx.giftPreview);
  await ctx.claimGiftPreview();
  assert.ok(calls.indexOf('save') < calls.indexOf('claim:user-1:Craftsman:GIFT-1234'));
  assert.ok(calls.indexOf('claim:user-1:Craftsman:GIFT-1234') < calls.indexOf('persist:claimed'));
  assert.equal(ctx.claimCallback, ctx.addGiftToGameState);
  assert.deepEqual(plain(ctx.giftLastReceived), {
    code: originalPreview.code,
    senderName: originalPreview.senderName,
    payload: originalPreview.payload,
  });
  assert.equal(ctx.giftPreview, null);
  assert.equal(ctx.giftCodeInput, '');
  assert.equal(ctx.giftView, 'received');
  assert.equal(ctx.giftBusy, false);
}

async function testClaimGiftFailureKeepsPreviewAndUnlocksBusyState() {
  const error = Object.assign(new Error('claimed'), { code: 'gift/already-claimed' });
  const { ctx, toasts } = harness({ claimError: error });
  const before = plain(ctx.giftPreview);
  await ctx.claimGiftPreview();
  assert.deepEqual(plain(ctx.giftPreview), before);
  assert.equal(ctx.giftLastReceived, null);
  assert.equal(ctx.giftBusy, false);
  assert.equal(toasts.at(-1)?.message, 'gift-error:gift/already-claimed');
}

async function testCancelGiftPersistsRestoredTransaction() {
  const { ctx, calls, toasts } = harness();
  await ctx.cancelGift('CANCEL-1');
  assert.ok(calls.indexOf('save') < calls.indexOf('cancel:user-1:CANCEL-1'));
  assert.ok(calls.indexOf('cancel:user-1:CANCEL-1') < calls.indexOf('persist:cancelled'));
  assert.equal(ctx.cancelCallback, ctx.restoreGiftToGameState);
  assert.equal(toasts.at(-1)?.message, 'プレゼントを取り消し、在庫へ戻しました。');
  assert.equal(toasts.at(-1)?.kind, 'info');
  assert.equal(ctx.giftBusy, false);
}

async function testCancelAlreadyClaimedMarksOutboxAndResaves() {
  const error = Object.assign(new Error('claimed'), { code: 'gift/already-claimed' });
  const { ctx, calls, toasts } = harness({ cancelError: error });
  await ctx.cancelGift('CANCEL-1');
  assert.equal(ctx.state.gifts.outbox[0].status, 'claimed');
  assert.equal(calls.filter((entry) => entry === 'save').length, 2);
  assert.equal(toasts.at(-1)?.message, 'gift-error:gift/already-claimed');
  assert.equal(ctx.giftBusy, false);
}

for (const test of [
  testCreateGiftPersistsSaveBeforeCloudTransaction,
  testCreateGiftGuardsInvalidDraftAndQuantity,
  testCreateGiftMapsNoSaveAndUnlocksBusyState,
  testClaimGiftPersistsTransactionAndClearsPreview,
  testClaimGiftFailureKeepsPreviewAndUnlocksBusyState,
  testCancelGiftPersistsRestoredTransaction,
  testCancelAlreadyClaimedMarksOutboxAndResaves,
]) {
  await test();
  console.log(`OK: ${test.name}`);
}

console.log('GIFT TRANSACTION REGRESSION: PASS');
