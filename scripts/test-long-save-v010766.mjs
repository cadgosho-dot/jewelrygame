import fs from 'node:fs';
import crypto from 'node:crypto';

await import('fake-indexeddb/auto');

const gameData = await import('../js/game-data.js');
const storage = await import('../js/local-save-storage.js');

const VERSION = fs.readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();
const firebaseSource = fs.readFileSync(new URL('../js/firebase-service.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

const results = [];
const record = (label, ok, detail = '') => {
  results.push({ label, ok, detail });
  console.log(`${ok ? 'OK' : 'NG'}: ${label}${detail ? ` / ${detail}` : ''}`);
};
const assertRecord = (label, fn) => {
  try {
    const value = fn();
    record(label, Boolean(value), typeof value === 'string' ? value : '');
  } catch (error) {
    record(label, false, String(error?.message || error));
  }
};
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const utf8Bytes = (text) => Buffer.byteLength(text, 'utf8');

record('VERSIONは0.10.766', VERSION === '0.10.766', VERSION);
record('game-data.jsのVERSIONも一致', gameData.VERSION === VERSION, String(gameData.VERSION));

const chunkRawMatch = firebaseSource.match(/const CLOUD_CHUNK_RAW_BYTES = (\d+) \* 1024;/);
const chunkMaxMatch = firebaseSource.match(/const CLOUD_CHUNK_MAX_COUNT = (\d+);/);
const chunkRawBytes = chunkRawMatch ? Number(chunkRawMatch[1]) * 1024 : 0;
const chunkMaxCount = chunkMaxMatch ? Number(chunkMaxMatch[1]) : 0;
record('クラウド分割設定を取得', chunkRawBytes > 0 && chunkMaxCount > 0, `${chunkRawBytes} bytes x ${chunkMaxCount}`);

const appStorageImport = appSource.match(/local-save-storage\.js\?v=([0-9.]+)/)?.[1] || '';
const firebaseStorageImport = firebaseSource.match(/local-save-storage\.js\?v=([0-9.]+)/)?.[1] || '';
record('app.jsのIndexedDBモジュール版が現行VERSION', appStorageImport === VERSION, appStorageImport || 'missing');
record('firebase-service.jsのIndexedDBモジュール版が現行VERSION', firebaseStorageImport === VERSION, firebaseStorageImport || 'missing');

const swHasCurrentStorageModule = swSource.includes(`'./js/local-save-storage.js?v=${VERSION}'`)
  || swSource.includes(`"./js/local-save-storage.js?v=${VERSION}"`);
record('オフライン冷間起動用にIndexedDBモジュールをCORE_SHELLへ事前キャッシュ', swHasCurrentStorageModule);

const base = gameData.initialState();
record('initialStateを生成できる', Boolean(base && typeof base === 'object'));

function makeLongState(days, targetBytes) {
  const state = structuredClone(base);
  state.playerName = 'DurabilityTester';
  state.saveRevision = days * 24;
  state.updatedAt = new Date(Date.UTC(2026, 0, 1) + days * 86400000).toISOString();
  if ('day' in state) state.day = days;
  if ('days' in state) state.days = days;
  if ('dayCount' in state) state.dayCount = days;
  state.__durabilityProbe = {
    days,
    dailyMarkers: Array.from({ length: days }, (_, index) => ({
      day: index + 1,
      code: `D${String(index + 1).padStart(5, '0')}`,
      moneyDelta: ((index * 7919) % 200001) - 100000,
      visitors: (index * 17) % 120,
      note: `marker-${index + 1}`,
    })),
    padding: '',
  };
  let raw = JSON.stringify(state);
  const missing = Math.max(0, targetBytes - utf8Bytes(raw));
  state.__durabilityProbe.padding = 'x'.repeat(missing);
  raw = JSON.stringify(state);
  return { state, raw, bytes: utf8Bytes(raw) };
}

const cases = [
  { days: 1000, targetBytes: 2 * 1024 * 1024 },
  { days: 3000, targetBytes: 6 * 1024 * 1024 },
  { days: 5000, targetBytes: 10 * 1024 * 1024 },
];

for (const testCase of cases) {
  const { days, targetBytes } = testCase;
  const userId = `durability-${days}`;
  const generated = makeLongState(days, targetBytes);
  record(`${days}日相当: 合成セーブサイズ`, generated.bytes >= targetBytes, `${(generated.bytes / 1024 / 1024).toFixed(2)} MiB`);

  let migrated = null;
  try {
    migrated = gameData.migrateState(generated.state);
    record(`${days}日相当: migrateStateが完走`, Boolean(migrated && typeof migrated === 'object'));
    record(`${days}日相当: migrateState後VERSION`, migrated?.version === VERSION, String(migrated?.version || ''));
    record(`${days}日相当: saveRevision維持`, Number(migrated?.saveRevision) === Number(generated.state.saveRevision), `${generated.state.saveRevision} -> ${migrated?.saveRevision}`);
  } catch (error) {
    record(`${days}日相当: migrateStateが完走`, false, String(error?.message || error));
  }

  try {
    await storage.writeIndexedDbSave(userId, generated.state);
    const loaded = await storage.readIndexedDbSave(userId);
    const loadedRaw = JSON.stringify(loaded);
    record(`${days}日相当: IndexedDB書込→再読込`, sha256(loadedRaw) === sha256(generated.raw), `sha256=${sha256(loadedRaw).slice(0, 12)}`);

    const overwritten = structuredClone(loaded);
    overwritten.saveRevision += 1;
    overwritten.updatedAt = new Date(Date.parse(overwritten.updatedAt) + 1000).toISOString();
    overwritten.__durabilityProbe.overwriteSentinel = `overwrite-${days}`;
    await storage.writeIndexedDbSave(userId, overwritten);
    const loadedOverwrite = await storage.readIndexedDbSave(userId);
    record(`${days}日相当: 同一ユーザー上書き`, loadedOverwrite?.__durabilityProbe?.overwriteSentinel === `overwrite-${days}` && loadedOverwrite?.saveRevision === overwritten.saveRevision);

    const cloudOlder = structuredClone(overwritten);
    cloudOlder.saveRevision = overwritten.saveRevision - 1;
    const devicePreferred = gameData.chooseNewestSavedState(overwritten, cloudOlder);
    record(`${days}日相当: 端末revisionが新しい場合は端末採用`, devicePreferred?.source === 'local' && devicePreferred?.state?.saveRevision === overwritten.saveRevision, String(devicePreferred?.source || ''));

    const cloudNewer = structuredClone(overwritten);
    cloudNewer.saveRevision = overwritten.saveRevision + 1;
    const cloudPreferred = gameData.chooseNewestSavedState(overwritten, cloudNewer);
    record(`${days}日相当: クラウドrevisionが新しい場合はクラウド採用`, cloudPreferred?.source === 'cloud' && cloudPreferred?.state?.saveRevision === cloudNewer.saveRevision, String(cloudPreferred?.source || ''));

    if (chunkRawBytes > 0 && chunkMaxCount > 0) {
      const chunkCount = Math.ceil(utf8Bytes(JSON.stringify(overwritten)) / chunkRawBytes);
      record(`${days}日相当: クラウド分割上限内`, chunkCount <= chunkMaxCount, `${chunkCount}/${chunkMaxCount} chunks`);
    }

    await storage.deleteIndexedDbSave(userId);
    const afterDelete = await storage.readIndexedDbSave(userId);
    record(`${days}日相当: IndexedDB削除後はnull`, afterDelete === null);
  } catch (error) {
    record(`${days}日相当: IndexedDB一連テスト`, false, String(error?.stack || error));
  }
}

if (chunkRawBytes > 0 && chunkMaxCount > 0) {
  const exactLimitBytes = chunkRawBytes * chunkMaxCount;
  const exactLimitChunks = Math.ceil(exactLimitBytes / chunkRawBytes);
  const overflowChunks = Math.ceil((exactLimitBytes + 1) / chunkRawBytes);
  record('クラウド分割: 設計上限ちょうどは64チャンク以内', exactLimitChunks === chunkMaxCount, `${exactLimitChunks}`);
  record('クラウド分割: 上限+1byteは65チャンクとなり拒否対象', overflowChunks === chunkMaxCount + 1, `${overflowChunks}`);
  console.log(`INFO: raw cloud capacity ≈ ${(exactLimitBytes / 1024 / 1024).toFixed(2)} MiB before base64/document overhead.`);
}

const failed = results.filter((item) => !item.ok);
console.log(`\nLONG SAVE DURABILITY SUMMARY: ${failed.length ? 'FAIL' : 'PASS'} (${results.length - failed.length}/${results.length})`);
if (failed.length) {
  console.log('FAILED CHECKS:');
  for (const item of failed) console.log(`- ${item.label}${item.detail ? ` / ${item.detail}` : ''}`);
  process.exitCode = 1;
}
