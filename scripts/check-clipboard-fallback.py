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
module_path = ROOT / 'js/ui/clipboard-fallback.js'
errors: list[str] = []

expected_import = f"import {{ fallbackCopyText }} from './ui/clipboard-fallback.js?v={version}';"
if expected_import not in app:
    errors.append('app.js: clipboard-fallback のVERSION付きimportがありません')
if 'function fallbackCopyText(text)' in app:
    errors.append('app.js: 旧fallbackCopyText DOM実装が残っています')
if app.count('fallbackCopyText(') != 2:
    errors.append(f'app.js: fallbackCopyText の既存呼び出し数が {app.count("fallbackCopyText(")} 件です（期待2件）')
for contract in (
    'copied = fallbackCopyText(code);',
    'if (!copied) copied = fallbackCopyText(text);',
):
    if contract not in app:
        errors.append(f'app.js: 既存clipboard fallback呼び出し契約がありません: {contract}')

if f"./js/ui/clipboard-fallback.js?v={version}" not in sw:
    errors.append('sw.js: clipboard-fallback がCORE_SHELLにありません')

if not module_path.is_file():
    errors.append('js/ui/clipboard-fallback.js がありません')
else:
    module = module_path.read_text(encoding='utf-8')
    for marker in (
        "documentRef.createElement('textarea')",
        "textarea.setAttribute('readonly', '');",
        "textarea.style.position = 'fixed';",
        "textarea.style.left = '-9999px';",
        "textarea.style.top = '0';",
        "documentRef.execCommand('copy')",
        'textarea.remove();',
    ):
        if marker not in module:
            errors.append(f'clipboard-fallback: 既存DOMコピー契約がありません: {marker}')
    for forbidden in ('state.', 'saveGame(', 'inventory', 'money', 'firebase', 'render(', 'setScreen(', 'aquarium', 'eventState'):
        if forbidden in module:
            errors.append(f'clipboard-fallback: ゲーム本体への逆依存があります: {forbidden}')

sw_rule = "Rule('sw.js', 'clipboard-fallback.js precache key'"
app_rule = "Rule('js/app.js', 'clipboard-fallback.js import key'"
if sw_rule not in version_sync:
    errors.append('version-sync.py: clipboard-fallback のSW同期ルールがありません')
if app_rule not in version_sync:
    errors.append('version-sync.py: clipboard-fallback のapp import同期ルールがありません')
if "('クリップボードフォールバック', [sys.executable, str(ROOT / 'scripts/check-clipboard-fallback.py')])," not in check_current:
    errors.append('scripts/check-current.py: clipboard fallback の総合検査登録がありません')

if errors:
    print('CLIPBOARD FALLBACK INTEGRATION: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

proc = subprocess.run(
    ['node', str(ROOT / 'tools/test-clipboard-fallback.mjs')],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8'
)
if proc.returncode != 0:
    print('CLIPBOARD FALLBACK INTEGRATION: FAIL')
    print(proc.stdout, end='')
    print(proc.stderr, end='', file=sys.stderr)
    sys.exit(proc.returncode)

print(proc.stdout, end='')
print('CLIPBOARD FALLBACK INTEGRATION: PASS')
print('Clipboard API失敗時の一時textarea DOMコピーだけをUI helperへ分離し、コピー判断・通知・効果音・ゲーム状態はapp.js側に維持しています。')
