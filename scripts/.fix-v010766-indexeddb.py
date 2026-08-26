#!/usr/bin/env python3
from pathlib import Path

storage_path = Path('js/local-save-storage.js')
storage = storage_path.read_text(encoding='utf-8')

replacements = [
    (
        """  const transaction = db.transaction(STORE_NAME, 'readonly');\n  const record = await requestResult(transaction.objectStore(STORE_NAME).get(key));\n  await transactionDone(transaction);\n""",
        """  const transaction = db.transaction(STORE_NAME, 'readonly');\n  const done = transactionDone(transaction);\n  const record = await requestResult(transaction.objectStore(STORE_NAME).get(key));\n  await done;\n""",
    ),
    (
        """  const transaction = db.transaction(STORE_NAME, 'readwrite');\n  transaction.objectStore(STORE_NAME).put({\n""",
        """  const transaction = db.transaction(STORE_NAME, 'readwrite');\n  const done = transactionDone(transaction);\n  transaction.objectStore(STORE_NAME).put({\n""",
    ),
    (
        """  }, key);\n  await transactionDone(transaction);\n  return true;\n""",
        """  }, key);\n  await done;\n  return true;\n""",
    ),
    (
        """  const transaction = db.transaction(STORE_NAME, 'readwrite');\n  transaction.objectStore(STORE_NAME).delete(key);\n  await transactionDone(transaction);\n""",
        """  const transaction = db.transaction(STORE_NAME, 'readwrite');\n  const done = transactionDone(transaction);\n  transaction.objectStore(STORE_NAME).delete(key);\n  await done;\n""",
    ),
]

for old, new in replacements:
    if storage.count(old) != 1:
        raise SystemExit(f'IndexedDB transaction fix anchor count={storage.count(old)} for {old[:60]!r}')
    storage = storage.replace(old, new, 1)
storage_path.write_text(storage, encoding='utf-8')

check_path = Path('scripts/check-indexeddb-save-policy.py')
check = check_path.read_text(encoding='utf-8')
check = check.replace("print('\nINDEXEDDB SAVE POLICY: FAIL')", "print('\\nINDEXEDDB SAVE POLICY: FAIL')")
check = check.replace("print('\nINDEXEDDB SAVE POLICY: PASS')", "print('\\nINDEXEDDB SAVE POLICY: PASS')")

anchor = "    'IndexedDB読み書き削除APIがある': all(token in STORAGE for token in ('export async function readIndexedDbSave', 'export async function writeIndexedDbSave', 'export async function deleteIndexedDbSave')),\n"
extra = anchor + "    'IndexedDB完了監視をリクエスト前に登録する': STORAGE.count('const done = transactionDone(transaction);') == 3 and STORAGE.count('await done;') == 3,\n"
if check.count(anchor) != 1:
    raise SystemExit(f'IndexedDB checker anchor count={check.count(anchor)}')
check = check.replace(anchor, extra, 1)
check_path.write_text(check, encoding='utf-8')

legacy_check_path = Path('scripts/check-save-storage-policy.py')
legacy_check = legacy_check_path.read_text(encoding='utf-8')
legacy_replacements = [
    (
        "    'クラウド採用時は安全保存を使う': \"persistBootLocalStateSafely(preferredAtBoot.state, 'クラウド採用セーブ');\" in APP and 'localStorage.setItem(localSaveKey(), JSON.stringify(preferredAtBoot.state));' not in APP,\n",
        "    'クラウド採用時は安全保存を使う': \"await persistBootDeviceStateSafely(preferredAtBoot.state, 'クラウド採用セーブ');\" in APP and 'persistBootLocalStateSafely(savedState, label)' in APP and 'localStorage.setItem(localSaveKey(), JSON.stringify(preferredAtBoot.state));' not in APP,\n",
    ),
    (
        "    '端末優先移行時は安全保存を使う': \"persistBootLocalStateSafely(migratedLocal, '起動時ローカル移行');\" in APP and 'localStorage.setItem(localSaveKey(), JSON.stringify(migratedLocal));' not in APP,\n",
        "    '端末優先移行時は安全保存を使う': \"await persistBootDeviceStateSafely(migratedLocal, '起動時ローカル移行');\" in APP and 'persistBootLocalStateSafely(savedState, label)' in APP and 'localStorage.setItem(localSaveKey(), JSON.stringify(migratedLocal));' not in APP,\n",
    ),
    (
        "    '端末保存失敗でもクラウド保存へ進む': \"端末保存失敗／クラウド保存を続行しています\" in APP and '.then(() => saveState(userId, snapshot))' in APP,\n",
        "    '端末保存失敗でもクラウド保存へ進む': \"端末保存失敗／クラウド保存を続行しています\" in APP and 'return saveState(userId, snapshot);' in APP and 'deviceSaved = indexedDbSaved || Boolean(localResult.saved);' in APP,\n",
    ),
]
for old, new in legacy_replacements:
    if legacy_check.count(old) != 1:
        raise SystemExit(f'legacy save checker anchor count={legacy_check.count(old)} for {old[:60]!r}')
    legacy_check = legacy_check.replace(old, new, 1)
legacy_check_path.write_text(legacy_check, encoding='utf-8')
