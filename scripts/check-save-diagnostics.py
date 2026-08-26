#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
firebase = (ROOT / 'js/firebase-service.js').read_text(encoding='utf-8')

checks = [
    ('Firebaseに読み取り専用診断APIがある', 'export async function getCloudSaveDiagnostics(uid)' in firebase),
    ('診断APIは現行saveMetaを読む', 'metadata = await readCurrentCloudMetadata(uid);' in firebase),
    ('診断APIはチャンク上限を返す', 'maxCount: CLOUD_CHUNK_MAX_COUNT' in firebase),
    ('診断APIはチャンク実サイズを返す', 'chunkRawBytes: CLOUD_CHUNK_RAW_BYTES' in firebase),
    ('アプリが診断APIを読み込む', 'saveState, getCloudSaveDiagnostics, deleteGameData' in app),
    ('設定にセーブ容量診断ボタンがある', 'data-action="save-diagnostics"' in app and 'セーブ容量を確認する' in app),
    ('診断はstateの複製を使う', 'const snapshot = structuredClone(state || {});' in app),
    ('診断用複製だけ履歴圧縮する', 'compactLongTermHistory(snapshot);' in app),
    ('完了注文アーカイブ件数を表示する', "snapshot.history?.closedOrders" in app and '完了注文アーカイブ' in app),
    ('売却済みアーカイブ件数を表示する', "snapshot.history?.soldJewelry" in app and '売却済みアーカイブ' in app),
    ('次回チャンク数を実チャンクサイズから計算する', 'Math.ceil(local.bytes / chunkRawBytes)' in app),
    ('診断は保存データを変更しない旨を明示する', 'ゲームデータやsaveRevisionは変更しません' in app),
    ('クリックで読み取り専用診断を開く', "case 'save-diagnostics':" in app and 'await showSaveDiagnostics();' in app),
]

failed = [label for label, ok in checks if not ok]
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
if failed:
    print('\nSAVE DIAGNOSTICS POLICY: FAIL')
    sys.exit(1)
print('\nSAVE DIAGNOSTICS POLICY: PASS')
