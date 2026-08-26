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
