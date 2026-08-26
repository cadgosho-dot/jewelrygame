#!/usr/bin/env python3
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
    'IndexedDB完了監視をリクエスト前に登録する': STORAGE.count('const done = transactionDone(transaction);') == 3 and STORAGE.count('await done;') == 3,
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
