#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
version_sync = (ROOT / 'scripts/version-sync.py').read_text(encoding='utf-8')
check_current = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
module_path = ROOT / 'js/ui/gift-labels.js'
errors: list[str] = []

expected_import = f"import {{ giftCategoryLabel, giftStatusLabel }} from './ui/gift-labels.js?v={version}';"
if expected_import not in app:
    errors.append('app.js: gift-labels のVERSION付きimportがありません')
for legacy in ('function giftCategoryLabel(category)', 'function giftStatusLabel(status)'):
    if legacy in app:
        errors.append(f'app.js: 旧ラベル実装が残っています: {legacy}')
if app.count('giftCategoryLabel(') != 1:
    errors.append(f'app.js: giftCategoryLabel の呼び出し数が {app.count("giftCategoryLabel(")} 件です（期待1件）')
if app.count('giftStatusLabel(') != 1:
    errors.append(f'app.js: giftStatusLabel の呼び出し数が {app.count("giftStatusLabel(")} 件です（期待1件）')
for contract in (
    'category: giftCategoryLabel(payload?.type),',
    '${esc(giftStatusLabel(entry.status))}',
):
    if contract not in app:
        errors.append(f'app.js: 既存ラベル呼び出し契約がありません: {contract}')

if f"./js/ui/gift-labels.js?v={version}" not in sw:
    errors.append('sw.js: gift-labels がCORE_SHELLにありません')

if not module_path.is_file():
    errors.append('js/ui/gift-labels.js がありません')
else:
    module = module_path.read_text(encoding='utf-8')
    for marker in (
        "rough: '原石'",
        "loose: 'ルース'",
        "item: 'アイテム'",
        "metal: '地金'",
        "jewelry: '完成品'",
        "pending: '未受取'",
        "claimed: '受取済み'",
        "cancelled: '取消済み'",
        "return CATEGORY_LABELS[category] || 'プレゼント';",
        "return STATUS_LABELS[status] || status || '不明';",
    ):
        if marker not in module:
            errors.append(f'gift-labels: 既存表示契約がありません: {marker}')
    for forbidden in ('state.', 'saveGame(', 'inventory', 'money', 'firebase', 'render(', 'setScreen(', 'aquarium', 'eventState', 'localStorage', 'indexedDB'):
        if forbidden in module:
            errors.append(f'gift-labels: ゲーム本体への逆依存があります: {forbidden}')

if "Rule('sw.js', 'gift-labels.js precache key'" not in version_sync:
    errors.append('version-sync.py: gift-labels のSW同期ルールがありません')
if "Rule('js/app.js', 'gift-labels.js import key'" not in version_sync:
    errors.append('version-sync.py: gift-labels のapp import同期ルールがありません')
if "('プレゼント表示ラベル', [sys.executable, str(ROOT / 'scripts/check-gift-labels.py')])," not in check_current:
    errors.append('scripts/check-current.py: gift-labels の総合検査登録がありません')

if errors:
    print('GIFT LABELS INTEGRATION: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

proc = subprocess.run(
    ['node', str(ROOT / 'tools/test-gift-labels.mjs')],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8'
)
if proc.returncode != 0:
    print('GIFT LABELS INTEGRATION: FAIL')
    print(proc.stdout, end='')
    print(proc.stderr, end='', file=sys.stderr)
    sys.exit(proc.returncode)

print(proc.stdout, end='')
print('GIFT LABELS INTEGRATION: PASS')
print('プレゼントのカテゴリ名・発行状態名だけを純粋UI helperへ分離し、送受信・在庫・クラウド保存・取消処理はapp.js側に維持しています。')
