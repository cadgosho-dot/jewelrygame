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

const source = extractFunction('loadGame');

function plain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function harness(options = {}) {
  const calls = [];
  const preferredState = Object.prototype.hasOwnProperty.call(options, 'preferredState')
    ? options.preferredState
    : { game: { day: 5 }, notifications: [] };
  const ctx = {
    SAVE_SCHEMA_VERSION: options.schemaVersion ?? 77,
    saveRecoveryNotice: options.saveRecoveryNotice ?? '',
    saveRecoveryDetails: options.saveRecoveryDetails ?? '',
    preferredSavedState: () => {
      calls.push(['preferredSavedState']);
      if (options.preferredError) throw options.preferredError;
      return { state: preferredState };
    },
    migrateState: (state) => {
      calls.push(['migrateState', plain(state)]);
      if (options.migrateError) throw options.migrateError;
      if (Object.prototype.hasOwnProperty.call(options, 'migratedState')) return options.migratedState;
      return structuredClone(state);
    },
    isSaveStateCandidate: (state) => {
      calls.push(['isSaveStateCandidate', plain(state)]);
      return options.isCandidate ?? true;
    },
    isUnneededHungerNotification: (note) => {
      calls.push(['isUnneededHungerNotification', plain(note)]);
      return Boolean(note?.dropAsHungerNoise);
    },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:load-game' });
  return { ctx, calls };
}

function testMissingPreferredStateReturnsNullWithoutMigration() {
  const h = harness({ preferredState: null });
  assert.equal(h.ctx.loadGame(), null);
  assert.deepEqual(h.calls, [['preferredSavedState']]);
  assert.equal(h.ctx.saveRecoveryNotice, '');
  assert.equal(h.ctx.saveRecoveryDetails, '');
}

function testValidStateMigratesAndForcesCurrentSchemaVersion() {
  const input = { game: { day: 14 }, saveSchemaVersion: 2, notifications: [] };
  const h = harness({ preferredState: input, schemaVersion: 91 });
  const loaded = h.ctx.loadGame();
  assert.equal(loaded.game.day, 14);
  assert.equal(loaded.saveSchemaVersion, 91);
  assert.equal(h.calls[0][0], 'preferredSavedState');
  assert.equal(h.calls[1][0], 'migrateState');
  assert.equal(h.calls[2][0], 'isSaveStateCandidate');
}

function testUnneededHungerNotificationsAreFilteredAfterMigration() {
  const notifications = [
    { id: 'keep-1', text: '残す' },
    { id: 'drop', text: '空腹通知', dropAsHungerNoise: true },
    { id: 'keep-2', text: '残す2' },
  ];
  const h = harness({ preferredState: { game: { day: 2 }, notifications } });
  const loaded = h.ctx.loadGame();
  assert.deepEqual(plain(loaded.notifications).map((note) => note.id), ['keep-1', 'keep-2']);
  const filterCalls = h.calls.filter((call) => call[0] === 'isUnneededHungerNotification');
  assert.equal(filterCalls.length, 3);
}

function testStateWithoutNotificationsLoadsNormally() {
  const h = harness({ preferredState: { game: { day: 7 } }, schemaVersion: 55 });
  const loaded = h.ctx.loadGame();
  assert.deepEqual(plain(loaded), { game: { day: 7 }, saveSchemaVersion: 55 });
  assert.equal(h.calls.some((call) => call[0] === 'isUnneededHungerNotification'), false);
}

function testInvalidMigratedStateReturnsNullAndRecordsRecovery() {
  const h = harness({
    preferredState: { game: { day: 9 } },
    isCandidate: false,
  });
  assert.equal(h.ctx.loadGame(), null);
  assert.equal(h.ctx.saveRecoveryNotice, 'セーブデータの移行または整合性確認に失敗しました。');
  assert.equal(h.ctx.saveRecoveryDetails, '移行後のセーブデータが不正です。');
}

function testMigrationFailureReturnsNullAndRecordsMessage() {
  const h = harness({ migrateError: new Error('migration exploded') });
  assert.equal(h.ctx.loadGame(), null);
  assert.equal(h.ctx.saveRecoveryNotice, 'セーブデータの移行または整合性確認に失敗しました。');
  assert.equal(h.ctx.saveRecoveryDetails, 'migration exploded');
}

function testExistingRecoveryNoticeIsNotOverwritten() {
  const h = harness({
    preferredError: new Error('preferred read failed'),
    saveRecoveryNotice: '既存の復旧案内',
    saveRecoveryDetails: 'old details',
  });
  assert.equal(h.ctx.loadGame(), null);
  assert.equal(h.ctx.saveRecoveryNotice, '既存の復旧案内');
  assert.equal(h.ctx.saveRecoveryDetails, 'preferred read failed');
}

for (const test of [
  testMissingPreferredStateReturnsNullWithoutMigration,
  testValidStateMigratesAndForcesCurrentSchemaVersion,
  testUnneededHungerNotificationsAreFilteredAfterMigration,
  testStateWithoutNotificationsLoadsNormally,
  testInvalidMigratedStateReturnsNullAndRecordsRecovery,
  testMigrationFailureReturnsNullAndRecordsMessage,
  testExistingRecoveryNoticeIsNotOverwritten,
]) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('LOAD GAME REGRESSION: PASS');
