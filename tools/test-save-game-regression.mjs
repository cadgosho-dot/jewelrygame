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

const source = extractFunction('saveGame');

function harness(options = {}) {
  const calls = [];
  const snapshot = options.snapshot === undefined ? { game: { day: 9 }, updatedAt: 'snapshot-time' } : options.snapshot;
  const localResult = options.localResult || { saved: true, snapshot, quota: false, quotaRecoveryUsed: false };
  const fingerprint = options.fingerprint ?? 'fp-current';
  const cloudFingerprint = options.cloudFingerprint ?? fingerprint;
  const priorQueue = Promise.resolve('prior');
  let timeoutCleared = null;
  const ctx = {
    state: options.state === undefined ? { game: { day: 9 }, history: {}, finance: {} } : options.state,
    currentUser: options.currentUser === undefined ? { uid: 'user-1' } : options.currentUser,
    sessionTakenOver: Boolean(options.sessionTakenOver),
    autosaveTimer: options.autosaveTimer ?? null,
    autosavePending: options.autosavePending ?? true,
    saveQueue: priorQueue,
    lastSavedFingerprint: options.lastSavedFingerprint ?? 'old-local',
    lastCloudSavedFingerprint: options.lastCloudSavedFingerprint ?? 'old-cloud',
    lastLifecycleLocalFingerprint: options.lastLifecycleLocalFingerprint ?? 'old-lifecycle',
    lastSuccessfulSaveAt: options.lastSuccessfulSaveAt ?? '',
    cloudSave: options.cloudSave ?? null,
    cloudSaveFailureActive: Boolean(options.cloudSaveFailureActive),
    syncGameClearState: () => calls.push(['syncGameClearState']),
    compactLongTermHistory: (value) => calls.push(['compactLongTermHistory', value === ctx.state]),
    compactFinanceHistory: (value) => calls.push(['compactFinanceHistory', value === ctx.state]),
    clearTimeout: (timer) => { timeoutCleared = timer; calls.push(['clearTimeout', timer]); },
    saveStateFingerprint: (value) => {
      calls.push(['fingerprint', value === ctx.state ? 'state' : 'snapshot']);
      return value === ctx.state ? fingerprint : cloudFingerprint;
    },
    saveLocalBackup: (payload) => {
      calls.push(['saveLocalBackup', structuredClone(payload)]);
      return localResult;
    },
    showAutosaveStatus: (mode, text, detail) => calls.push(['status', mode, text, detail ? structuredClone(detail) : null]),
    persistIndexedDbStateSafely: async (uid, value, label) => {
      calls.push(['indexedDb', uid, value === snapshot, label]);
      return options.indexedDbSaved ?? true;
    },
    saveState: async (uid, value) => {
      calls.push(['cloudSave', uid, value === snapshot]);
      if (options.cloudError) throw options.cloudError;
      return true;
    },
    firebaseErrorMessage: (error, scope) => {
      calls.push(['firebaseErrorMessage', error?.code || '', scope]);
      return options.cloudMessage || 'クラウド保存エラー';
    },
    console: { error: (...args) => calls.push(['consoleError', args[0]]), log: console.log, warn: console.warn },
    Promise,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:save-game' });
  return { ctx, calls, priorQueue, get timeoutCleared() { return timeoutCleared; } };
}

function statuses(calls) {
  return calls.filter((call) => call[0] === 'status');
}

async function testNoStateReturnsResolvedWithoutSideEffects() {
  const h = harness({ state: null });
  await h.ctx.saveGame();
  assert.deepEqual(h.calls, []);
}

async function testPreSaveMaintenanceRunsBeforeAuthGuard() {
  const h = harness({ currentUser: null });
  await h.ctx.saveGame();
  assert.deepEqual(h.calls.slice(0, 3), [
    ['syncGameClearState'],
    ['compactLongTermHistory', true],
    ['compactFinanceHistory', true],
  ]);
  assert.equal(h.calls.some((call) => call[0] === 'saveLocalBackup'), false);
  assert.equal(h.calls.some((call) => call[0] === 'cloudSave'), false);
}

async function testTakenOverSessionDoesNotPersist() {
  const h = harness({ sessionTakenOver: true });
  await h.ctx.saveGame();
  assert.equal(h.calls.some((call) => call[0] === 'saveLocalBackup'), false);
  assert.equal(h.calls.some((call) => call[0] === 'cloudSave'), false);
}

async function testDuplicateFingerprintReturnsExistingQueue() {
  const h = harness({ autosaveTimer: 77, fingerprint: 'same', lastSavedFingerprint: 'same', lastCloudSavedFingerprint: 'same' });
  const returned = h.ctx.saveGame();
  assert.strictEqual(returned, h.priorQueue);
  await returned;
  assert.equal(h.timeoutCleared, 77);
  assert.equal(h.ctx.autosaveTimer, null);
  assert.equal(h.ctx.autosavePending, false);
  assert.equal(h.calls.some((call) => call[0] === 'saveLocalBackup'), false);
}

async function testMissingSnapshotStopsBeforeDeviceAndCloudSave() {
  const h = harness({ localResult: { saved: false, snapshot: null, quota: false, quotaRecoveryUsed: false } });
  await h.ctx.saveGame();
  assert.equal(h.calls.some((call) => call[0] === 'indexedDb'), false);
  assert.equal(h.calls.some((call) => call[0] === 'cloudSave'), false);
  assert.deepEqual(statuses(h.calls).at(-1), ['status', 'error', 'セーブデータを準備できませんでした', { persistent: true }]);
}

async function testSuccessfulDeviceAndCloudSaveUpdatesFingerprints() {
  const snapshot = { updatedAt: '2026-09-07T00:00:00Z', game: { day: 9 } };
  const h = harness({ snapshot, fingerprint: 'fp-new', indexedDbSaved: true });
  await h.ctx.saveGame();
  assert.equal(h.calls.some((call) => call[0] === 'indexedDb' && call[1] === 'user-1' && call[2] === true && call[3] === '通常セーブ'), true);
  assert.equal(h.calls.some((call) => call[0] === 'cloudSave' && call[1] === 'user-1' && call[2] === true), true);
  assert.equal(h.ctx.lastLifecycleLocalFingerprint, 'fp-new');
  assert.equal(h.ctx.lastSuccessfulSaveAt, snapshot.updatedAt);
  assert.equal(h.ctx.lastSavedFingerprint, 'fp-new');
  assert.equal(h.ctx.lastCloudSavedFingerprint, 'fp-new');
  assert.deepEqual(structuredClone(h.ctx.cloudSave), snapshot);
}

async function testIndexedDbRecoversLocalStorageFailure() {
  const snapshot = { updatedAt: 'idb-time', game: { day: 9 } };
  const h = harness({ snapshot, localResult: { saved: false, snapshot, quota: false, quotaRecoveryUsed: false }, indexedDbSaved: true });
  await h.ctx.saveGame();
  assert.equal(statuses(h.calls).some((call) => call[1] === 'saved' && call[2] === '端末に保存しました（IndexedDB）'), true);
  assert.equal(h.ctx.lastSavedFingerprint, 'fp-current');
  assert.equal(h.calls.some((call) => call[0] === 'cloudSave'), true);
}

async function testCloudSuccessAfterNoDeviceSaveReportsRecovery() {
  const snapshot = { updatedAt: 'cloud-only', game: { day: 9 } };
  const h = harness({ snapshot, localResult: { saved: false, snapshot, quota: true, quotaRecoveryUsed: false }, indexedDbSaved: false, cloudSaveFailureActive: true });
  await h.ctx.saveGame();
  assert.equal(statuses(h.calls).some((call) => call[1] === 'error' && call[2] === '端末容量不足／クラウド保存を続行しています'), true);
  assert.equal(statuses(h.calls).some((call) => call[1] === 'saved' && call[2] === 'クラウドに保存しました（端末容量不足）'), true);
  assert.equal(h.ctx.cloudSaveFailureActive, false);
}

async function testCloudFailureKeepsDeviceSaveAndShowsPersistentStatus() {
  const error = Object.assign(new Error('offline'), { code: 'unavailable' });
  const h = harness({ cloudError: error, cloudMessage: 'クラウドへ接続できません', indexedDbSaved: true });
  await h.ctx.saveGame();
  assert.equal(h.ctx.cloudSaveFailureActive, true);
  assert.equal(statuses(h.calls).some((call) => call[1] === 'error' && call[2] === '端末保存済み／クラウドへ接続できません' && call[3]?.persistent === true), true);
}

async function testQuotaRecoveryNoticeIsRetained() {
  const snapshot = { updatedAt: 'quota-time', game: { day: 9 } };
  const h = harness({ snapshot, localResult: { saved: true, snapshot, quota: true, quotaRecoveryUsed: true } });
  await h.ctx.saveGame();
  assert.equal(statuses(h.calls).some((call) => call[1] === 'saved' && call[2] === '端末容量を節約して保存しました'), true);
}

for (const test of [
  testNoStateReturnsResolvedWithoutSideEffects,
  testPreSaveMaintenanceRunsBeforeAuthGuard,
  testTakenOverSessionDoesNotPersist,
  testDuplicateFingerprintReturnsExistingQueue,
  testMissingSnapshotStopsBeforeDeviceAndCloudSave,
  testSuccessfulDeviceAndCloudSaveUpdatesFingerprints,
  testIndexedDbRecoversLocalStorageFailure,
  testCloudSuccessAfterNoDeviceSaveReportsRecovery,
  testCloudFailureKeepsDeviceSaveAndShowsPersistentStatus,
  testQuotaRecoveryNoticeIsRetained,
]) {
  await test();
  console.log(`OK: ${test.name}`);
}

console.log('SAVE GAME REGRESSION: PASS');
