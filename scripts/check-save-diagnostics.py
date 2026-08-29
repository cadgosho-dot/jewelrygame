#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
firebase = (ROOT / 'js/firebase-service.js').read_text(encoding='utf-8')

checks = [
    ('Firebaseに読み取り専用診断APIが残っている', 'export async function getCloudSaveDiagnostics(uid)' in firebase),
    ('診断APIは現行saveMetaを読む', 'metadata = await readCurrentCloudMetadata(uid);' in firebase),
    ('内部診断はstateの複製を使う', 'const snapshot = structuredClone(state || {});' in app),
    ('内部診断は終了履歴を整理する', 'compactLongTermHistory(snapshot);' in app),
    ('内部診断は収支履歴も整理する', 'compactFinanceHistory(snapshot);' in app),
    ('設定画面に容量診断ボタンを出さない', 'data-action="save-diagnostics"' not in app and 'セーブ容量を確認する' not in app),
    ('プレイヤー操作から容量診断を開けない', "case 'save-diagnostics':" not in app),
]

failed = [label for label, ok in checks if not ok]
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
if failed:
    print('\nSAVE DIAGNOSTICS INTERNAL POLICY: FAIL')
    sys.exit(1)
print('\nSAVE DIAGNOSTICS INTERNAL POLICY: PASS')
