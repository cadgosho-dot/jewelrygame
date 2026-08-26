#!/usr/bin/env python3
from pathlib import Path

version = Path('VERSION').read_text(encoding='utf-8').strip()
if version != '0.10.765':
    raise SystemExit(f'想定外のVERSIONです: {version}（期待 0.10.765）')

storage_module = '''const DB_NAME = 'jewelrygame-device-save-v1';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
let databasePromise = null;

function normalizedUserId(uid) {
  const value = String(uid || '').trim();
  if (!value) throw new Error('IndexedDB save requires a user id.');
  return value;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
  });
}

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB is unavailable.'));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    let request;
    try {
      request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed.'));
    request.onblocked = () => reject(new Error('IndexedDB open was blocked.'));
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

function parseRecord(record) {
  if (!record) return null;
  try {
    const raw = typeof record === 'string' ? record : record.raw;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : record.state;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

export async function readIndexedDbSave(uid) {
  const key = normalizedUserId(uid);
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const record = await requestResult(transaction.objectStore(STORE_NAME).get(key));
  await transactionDone(transaction);
  return parseRecord(record);
}

export async function writeIndexedDbSave(uid, state) {
  const key = normalizedUserId(uid);
  const raw = JSON.stringify(state);
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put({
    raw,
    saveRevision: Math.max(0, Math.floor(Number(state?.saveRevision) || 0)),
    updatedAt: String(state?.updatedAt || ''),
    writtenAt: new Date().toISOString(),
  }, key);
  await transactionDone(transaction);
  return true;
}

export async function deleteIndexedDbSave(uid) {
  const key = normalizedUserId(uid);
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(key);
  await transactionDone(transaction);
}
'''
Path('js/local-save-storage.js').write_text(storage_module, encoding='utf-8')

app_path = Path('js/app.js')
app = app_path.read_text(encoding='utf-8')

import_anchor = """} from './firebase-service.js?v=0.10.765';



const root = document.querySelector('#root');
"""
import_replacement = """} from './firebase-service.js?v=0.10.765';
import { readIndexedDbSave, writeIndexedDbSave, deleteIndexedDbSave } from './local-save-storage.js?v=0.10.765';



const root = document.querySelector('#root');
"""
if app.count(import_anchor) != 1:
    raise SystemExit(f'app import anchor count={app.count(import_anchor)}')
app = app.replace(import_anchor, import_replacement, 1)

variable_anchor = """let currentUser = null;
let cloudSave = null;
let authReady = false;
"""
variable_replacement = """let currentUser = null;
let cloudSave = null;
let indexedDbSave = null;
let indexedDbStorageReady = false;
let authReady = false;
"""
if app.count(variable_anchor) != 1:
    raise SystemExit(f'app variable anchor count={app.count(variable_anchor)}')
app = app.replace(variable_anchor, variable_replacement, 1)

helper_anchor = "\nfunction saveStateFingerprint(value = state) {"
helper_insert = '''
async function persistIndexedDbStateSafely(uid, savedState, label = '端末セーブ') {
  if (!uid || !savedState) return false;
  try {
    await writeIndexedDbSave(uid, savedState);
    indexedDbSave = structuredClone(savedState);
    indexedDbStorageReady = true;
    return true;
  } catch (error) {
    indexedDbStorageReady = false;
    console.warn(`${label}をIndexedDBへ保存できませんでした。localStorage／クラウドの安全網を継続します。`, error);
    return false;
  }
}

async function persistBootDeviceStateSafely(savedState, label = '起動時セーブ') {
  const uid = currentUser?.uid || '';
  const indexedDbSaved = await persistIndexedDbStateSafely(uid, savedState, label);
  const legacySaved = persistBootLocalStateSafely(savedState, label);
  return indexedDbSaved || legacySaved;
}
'''
if app.count(helper_anchor) != 1:
    raise SystemExit(f'app helper anchor count={app.count(helper_anchor)}')
app = app.replace(helper_anchor, helper_insert + helper_anchor, 1)

preferred_old = """function preferredSavedState() {
  const safeCloudSave = isSaveStateCandidate(cloudSave) ? cloudSave : null;
  return chooseNewestSavedState(localSavedState(), safeCloudSave);
}
"""
preferred_new = """function preferredDeviceSavedState() {
  const legacyLocalSave = localSavedState();
  const preferred = chooseNewestSavedState(indexedDbSave, legacyLocalSave);
  if (preferred.source === 'local') return { source: 'indexeddb', state: preferred.state };
  if (preferred.source === 'cloud') return { source: 'local', state: preferred.state };
  return { source: 'none', state: null };
}

function preferredSavedState() {
  const safeCloudSave = isSaveStateCandidate(cloudSave) ? cloudSave : null;
  const device = preferredDeviceSavedState();
  const preferred = chooseNewestSavedState(device.state, safeCloudSave);
  if (preferred.source === 'local') return { source: device.source, state: preferred.state };
  if (preferred.source === 'cloud') return { source: 'cloud', state: preferred.state };
  return { source: 'none', state: null };
}
"""
if app.count(preferred_old) != 1:
    raise SystemExit(f'app preferred anchor count={app.count(preferred_old)}')
app = app.replace(preferred_old, preferred_new, 1)

cloud_load_anchor = "        cloudSave = await loadState(user.uid);"
cloud_load_replacement = """        try {
          indexedDbSave = await readIndexedDbSave(user.uid);
          indexedDbStorageReady = true;
        } catch (error) {
          indexedDbSave = null;
          indexedDbStorageReady = false;
          console.warn('IndexedDBの端末セーブを読み込めませんでした。旧localStorage／クラウドから継続します。', error);
        }
        cloudSave = await loadState(user.uid);"""
if app.count(cloud_load_anchor) != 1:
    raise SystemExit(f'app cloud load anchor count={app.count(cloud_load_anchor)}')
app = app.replace(cloud_load_anchor, cloud_load_replacement, 1)

declaration_old = "const localWasNewer = preferredAtBoot.source === 'local' && Boolean(preferredAtBoot.state);"
declaration_new = "const deviceWasNewer = ['local', 'indexeddb'].includes(preferredAtBoot.source) && Boolean(preferredAtBoot.state);"
if app.count(declaration_old) != 1:
    raise SystemExit(f'app local newer declaration count={app.count(declaration_old)}')
app = app.replace(declaration_old, declaration_new, 1)
if app.count('localWasNewer') != 2:
    raise SystemExit(f'app localWasNewer remaining count={app.count("localWasNewer")}（期待2）')
app = app.replace('localWasNewer', 'deviceWasNewer')

cloud_boot_old = "persistBootLocalStateSafely(preferredAtBoot.state, 'クラウド採用セーブ');"
cloud_boot_new = "await persistBootDeviceStateSafely(preferredAtBoot.state, 'クラウド採用セーブ');"
if app.count(cloud_boot_old) != 1:
    raise SystemExit(f'app cloud boot save count={app.count(cloud_boot_old)}')
app = app.replace(cloud_boot_old, cloud_boot_new, 1)

migration_boot_old = "persistBootLocalStateSafely(migratedLocal, '起動時ローカル移行');"
migration_boot_new = "await persistBootDeviceStateSafely(migratedLocal, '起動時ローカル移行');"
if app.count(migration_boot_old) != 1:
    raise SystemExit(f'app migration boot save count={app.count(migration_boot_old)}')
app = app.replace(migration_boot_old, migration_boot_new, 1)

status_old = """  if (!localResult.saved) {
    showAutosaveStatus(
      'error',
      localResult.quota ? '端末容量不足／クラウド保存を続行しています' : '端末保存失敗／クラウド保存を続行しています',
      { persistent: true },
    );
  } else if (localResult.quotaRecoveryUsed) {
    showAutosaveStatus('saved', '端末容量を節約して保存しました');
  }

  // 端末保存の成否に関係なく、作成済みスナップショットをクラウドへ送る。
  // 長期プレイ端末がlocalStorage上限に達しても進行を失わない。
  const userId = currentUser.uid;
  const cloudFingerprint = fingerprint || saveStateFingerprint(snapshot);
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => saveState(userId, snapshot))
"""
status_new = """  if (localResult.saved && localResult.quotaRecoveryUsed) {
    showAutosaveStatus('saved', '端末容量を節約して保存しました');
  }

  // 通常保存ではIndexedDBを端末側の第一保存先とする。
  // localStorageは旧版互換・終了直前の同期バックアップとして残し、どちらか一方が失敗してもクラウド保存を続行する。
  const userId = currentUser.uid;
  const cloudFingerprint = fingerprint || saveStateFingerprint(snapshot);
  let deviceSaved = Boolean(localResult.saved);
  saveQueue = saveQueue
    .catch(() => {})
    .then(async () => {
      const indexedDbSaved = await persistIndexedDbStateSafely(userId, snapshot, '通常セーブ');
      deviceSaved = indexedDbSaved || Boolean(localResult.saved);
      if (indexedDbSaved) {
        lastSuccessfulSaveAt = String(snapshot.updatedAt || lastSuccessfulSaveAt || '');
        lastSavedFingerprint = cloudFingerprint;
        if (!localResult.saved) showAutosaveStatus('saved', '端末に保存しました（IndexedDB）');
      } else if (!deviceSaved) {
        showAutosaveStatus(
          'error',
          localResult.quota ? '端末容量不足／クラウド保存を続行しています' : '端末保存失敗／クラウド保存を続行しています',
          { persistent: true },
        );
      }
      return saveState(userId, snapshot);
    })
"""
if app.count(status_old) != 1:
    raise SystemExit(f'app save queue anchor count={app.count(status_old)}')
app = app.replace(status_old, status_new, 1)

success_old = "if (!localResult.saved) {\n        cloudSaveFailureActive = false;"
success_new = "if (!deviceSaved) {\n        cloudSaveFailureActive = false;"
if app.count(success_old) != 1:
    raise SystemExit(f'app cloud success local-result count={app.count(success_old)}')
app = app.replace(success_old, success_new, 1)

catch_old = "if (localResult.saved) {\n        // 端末保存は成功しているので"
catch_new = "if (deviceSaved) {\n        // IndexedDBまたはlocalStorageへの端末保存は成功しているので"
if app.count(catch_old) != 1:
    raise SystemExit(f'app cloud catch local-result count={app.count(catch_old)}')
app = app.replace(catch_old, catch_new, 1)

delete_save_anchor = """    await deleteGameData(currentUser.uid);
    localStorage.removeItem(localSaveKey());
"""
delete_save_replacement = """    await deleteGameData(currentUser.uid);
    await deleteIndexedDbSave(currentUser.uid).catch((error) => console.warn('IndexedDB端末セーブの削除に失敗しました。', error));
    indexedDbSave = null;
    indexedDbStorageReady = false;
    localStorage.removeItem(localSaveKey());
"""
if app.count(delete_save_anchor) != 1:
    raise SystemExit(f'app delete save anchor count={app.count(delete_save_anchor)}')
app = app.replace(delete_save_anchor, delete_save_replacement, 1)

account_delete_anchor = """    await deleteAccountCompletely(password);
    if (stopSessionWatch) { stopSessionWatch(); stopSessionWatch = null; }
"""
account_delete_replacement = """    await deleteAccountCompletely(password);
    await deleteIndexedDbSave(currentUser.uid).catch((error) => console.warn('削除済みアカウントのIndexedDB端末セーブを削除できませんでした。', error));
    indexedDbSave = null;
    indexedDbStorageReady = false;
    if (stopSessionWatch) { stopSessionWatch(); stopSessionWatch = null; }
"""
if app.count(account_delete_anchor) != 1:
    raise SystemExit(f'app account delete anchor count={app.count(account_delete_anchor)}')
app = app.replace(account_delete_anchor, account_delete_replacement, 1)

clear_anchor = """  titleSettings = structuredClone(initialState().settings);
  cloudSave = null;
  state = null;
"""
clear_replacement = """  titleSettings = structuredClone(initialState().settings);
  cloudSave = null;
  indexedDbSave = null;
  indexedDbStorageReady = false;
  state = null;
"""
if app.count(clear_anchor) != 1:
    raise SystemExit(f'app clear client anchor count={app.count(clear_anchor)}')
app = app.replace(clear_anchor, clear_replacement, 1)
app_path.write_text(app, encoding='utf-8')

firebase_path = Path('js/firebase-service.js')
firebase = firebase_path.read_text(encoding='utf-8')

firebase_import_old = "import { SAVE_KEY } from './game-data-core.js';"
firebase_import_new = """import { SAVE_KEY, chooseNewestSavedState } from './game-data-core.js';
import { readIndexedDbSave, writeIndexedDbSave } from './local-save-storage.js?v=0.10.765';"""
if firebase.count(firebase_import_old) != 1:
    raise SystemExit(f'firebase import anchor count={firebase.count(firebase_import_old)}')
firebase = firebase.replace(firebase_import_old, firebase_import_new, 1)

gift_read_start = firebase.index('function readGiftLocalState(uid) {')
gift_read_end = firebase.index('\nfunction writeGiftLocalStateSafely', gift_read_start)
new_gift_read = """async function readGiftLocalState(uid) {
  let legacyState = null;
  try {
    const raw = localStorage.getItem(giftLocalSaveKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      legacyState = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    }
  } catch (_) {}

  let indexedState = null;
  try {
    indexedState = await readIndexedDbSave(uid);
  } catch (_) {}

  return chooseNewestSavedState(indexedState, legacyState).state;
}
"""
firebase = firebase[:gift_read_start] + new_gift_read + firebase[gift_read_end:]

local_read_old = 'const localState = readGiftLocalState(uid);'
local_read_new = 'const localState = await readGiftLocalState(uid);'
if firebase.count(local_read_old) != 1:
    raise SystemExit(f'gift local read anchor count={firebase.count(local_read_old)}')
firebase = firebase.replace(local_read_old, local_read_new, 1)

finalize_old = """  const finalizeCommitted = (result) => {
    cloudStorageMetaByUid.set(uid, staged.metadata);
    writeGiftLocalStateSafely(uid, nextState);
    if (expectedMetadata?.mode === 'chunked' && expectedMetadata.generation !== staged.metadata.generation) {
      void cleanupChunkGeneration(uid, expectedMetadata);
    }
    return result;
  };
"""
finalize_new = """  const finalizeCommitted = async (result) => {
    cloudStorageMetaByUid.set(uid, staged.metadata);
    try {
      await writeIndexedDbSave(uid, nextState);
    } catch (error) {
      console.warn('プレゼント確定後のIndexedDB端末保存に失敗しました。localStorage／クラウドの保存を維持します。', error);
    }
    writeGiftLocalStateSafely(uid, nextState);
    if (expectedMetadata?.mode === 'chunked' && expectedMetadata.generation !== staged.metadata.generation) {
      void cleanupChunkGeneration(uid, expectedMetadata);
    }
    return result;
  };
"""
if firebase.count(finalize_old) != 1:
    raise SystemExit(f'gift finalize anchor count={firebase.count(finalize_old)}')
firebase = firebase.replace(finalize_old, finalize_new, 1)

return_result_old = '    return finalizeCommitted(result);'
return_result_new = '    return await finalizeCommitted(result);'
if firebase.count(return_result_old) != 1:
    raise SystemExit(f'gift finalize result count={firebase.count(return_result_old)}')
firebase = firebase.replace(return_result_old, return_result_new, 1)

recovery_old = "return finalizeCommitted(typeof recoverCommitted === 'function' ? recoverCommitted() : { gameState: nextState });"
recovery_new = "return await finalizeCommitted(typeof recoverCommitted === 'function' ? recoverCommitted() : { gameState: nextState });"
if firebase.count(recovery_old) != 1:
    raise SystemExit(f'gift finalize recovery count={firebase.count(recovery_old)}')
firebase = firebase.replace(recovery_old, recovery_new, 1)
firebase_path.write_text(firebase, encoding='utf-8')

check = '''#!/usr/bin/env python3
"""Validate IndexedDB-first local save migration and fallbacks."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
FIREBASE = (ROOT / 'js/firebase-service.js').read_text(encoding='utf-8')
STORAGE = (ROOT / 'js/local-save-storage.js').read_text(encoding='utf-8')

boot_start = APP.find('indexedDbSave = await readIndexedDbSave(user.uid);')
cloud_start = APP.find('cloudSave = await loadState(user.uid);')
normal_idb = APP.find("persistIndexedDbStateSafely(userId, snapshot, '通常セーブ')")
normal_cloud = APP.find('return saveState(userId, snapshot);')
boot_helper_start = APP.find('async function persistBootDeviceStateSafely')
boot_helper_end = APP.find('function saveStateFingerprint', boot_helper_start)
boot_helper = APP[boot_helper_start:boot_helper_end] if boot_helper_start >= 0 and boot_helper_end > boot_helper_start else ''

checks = {
    'IndexedDB保存モジュールがある': "indexedDB.open(DB_NAME, DB_VERSION)" in STORAGE and "db.transaction(STORE_NAME, 'readwrite')" in STORAGE,
    'IndexedDBはユーザー別キーで保存する': 'normalizedUserId(uid)' in STORAGE and '.put({' in STORAGE,
    'IndexedDB読み書き削除APIがある': all(token in STORAGE for token in ('export async function readIndexedDbSave', 'export async function writeIndexedDbSave', 'export async function deleteIndexedDbSave')),
    '起動時にクラウドより先にIndexedDBを読む': 0 <= boot_start < cloud_start,
    'IndexedDBと旧localStorageを比較する': 'chooseNewestSavedState(indexedDbSave, legacyLocalSave)' in APP,
    '端末候補とクラウドをrevision比較する': 'chooseNewestSavedState(device.state, safeCloudSave)' in APP,
    '旧localStorageユーザーをIndexedDBへ自動移行する': "['local', 'indexeddb'].includes(preferredAtBoot.source)" in APP and "await persistBootDeviceStateSafely(migratedLocal, '起動時ローカル移行');" in APP,
    'クラウド採用データもIndexedDBへ保存する': "await persistBootDeviceStateSafely(preferredAtBoot.state, 'クラウド採用セーブ');" in APP,
    '起動時はlocalStorage互換コピーを残す': 'persistBootLocalStateSafely(savedState, label)' in boot_helper,
    '通常保存はIndexedDBをクラウドより先に確定する': 0 <= normal_idb < normal_cloud,
    'IndexedDB失敗時もlocalStorage結果をフォールバックに使う': 'deviceSaved = indexedDbSaved || Boolean(localResult.saved);' in APP,
    '終了直前のlocalStorage緊急コピーを維持する': "window.addEventListener('beforeunload', () => saveLocalBackup" in APP,
    'ゲームデータ削除でIndexedDBも削除する': 'await deleteIndexedDbSave(currentUser.uid)' in APP,
    'アカウント削除でIndexedDBも削除する': '削除済みアカウントのIndexedDB端末セーブ' in APP,
    'プレゼント競合判定もIndexedDBを見る': 'const localState = await readGiftLocalState(uid);' in FIREBASE and 'await readIndexedDbSave(uid)' in FIREBASE,
    'プレゼント確定後もIndexedDBへ保存する': 'await writeIndexedDbSave(uid, nextState);' in FIREBASE,
    'プレゼントは旧localStorageフォールバックを残す': 'localStorage.getItem(giftLocalSaveKey(uid))' in FIREBASE and 'writeGiftLocalStateSafely(uid, nextState);' in FIREBASE,
    '移行時に旧localStorageを削除しない': 'removeItem(localSaveKey())' not in boot_helper,
}

failed = [label for label, ok in checks.items() if not ok]
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)

for target in ('js/local-save-storage.js', 'js/app.js', 'js/firebase-service.js'):
    proc = subprocess.run(['node', '--check', target], cwd=ROOT)
    if proc.returncode != 0:
        failed.append(f'JavaScript構文: {target}')

if failed:
    print('\nINDEXEDDB SAVE POLICY: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)
print('\nINDEXEDDB SAVE POLICY: PASS')
'''
Path('scripts/check-indexeddb-save-policy.py').write_text(check, encoding='utf-8')

current_path = Path('scripts/check-current.py')
current = current_path.read_text(encoding='utf-8')
current_anchor = "    ('長期セーブ容量対策', [sys.executable, str(ROOT / 'scripts/check-save-storage-policy.py')]),\n"
current_insert = current_anchor + "    ('IndexedDB端末セーブ', [sys.executable, str(ROOT / 'scripts/check-indexeddb-save-policy.py')]),\n"
if current.count(current_anchor) != 1:
    raise SystemExit(f'check-current anchor count={current.count(current_anchor)}')
current = current.replace(current_anchor, current_insert, 1)
current_path.write_text(current, encoding='utf-8')
