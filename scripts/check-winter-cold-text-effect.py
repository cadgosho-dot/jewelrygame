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
module_path = ROOT / 'js/ui/winter-cold-text-effect.js'
errors: list[str] = []

expected_import = f"import {{ createWinterColdTextEffect }} from './ui/winter-cold-text-effect.js?v={version}';"
if expected_import not in app:
    errors.append('app.js: winter-cold-text-effect のVERSION付きimportがありません')
if 'const winterColdTextEffect = createWinterColdTextEffect({' not in app:
    errors.append('app.js: winter cold text effect controller の生成がありません')
if 'isActive: () => winterColdTextActive(),' not in app:
    errors.append('app.js: event state はcallback注入で参照する必要があります')
for legacy in [
    'const winterColdOriginalText = new WeakMap();',
    'const winterColdOriginalAttributes = new WeakMap();',
    'let winterColdGarbleScheduled = false;',
    'const winterColdTextObserver = new MutationObserver(',
    'function winterColdGarbleText(value)',
    'function winterColdReadableElement(element)',
    'function applyWinterColdTextEffect()',
    'function scheduleWinterColdTextEffect()',
]:
    if legacy in app:
        errors.append(f'app.js: 旧文字効果実装が残っています: {legacy}')
if 'scheduleWinterColdTextEffect();' in app:
    errors.append('app.js: 旧 scheduleWinterColdTextEffect 呼び出しが残っています')
if app.count('winterColdTextEffect.schedule();') < 4:
    errors.append('app.js: 既存の主要schedule呼び出しがcontrollerへ移行していません')
if f"./js/ui/winter-cold-text-effect.js?v={version}" not in sw:
    errors.append('sw.js: winter-cold-text-effect がCORE_SHELLにありません')
if not module_path.is_file():
    errors.append('js/ui/winter-cold-text-effect.js がありません')
if "Rule('sw.js', 'winter-cold-text-effect.js precache key'" not in version_sync:
    errors.append('scripts/version-sync.py: Service Worker側のVERSION同期登録がありません')
if "Rule('js/app.js', 'winter-cold-text-effect.js import key'" not in version_sync:
    errors.append('scripts/version-sync.py: app import側のVERSION同期登録がありません')
if "('冬の体調不良文字効果', [sys.executable, str(ROOT / 'scripts/check-winter-cold-text-effect.py')])," not in check_current:
    errors.append('scripts/check-current.py: 冬文字効果の総合検査登録がありません')

if errors:
    print('WINTER COLD TEXT EFFECT INTEGRATION: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

proc = subprocess.run(
    ['node', str(ROOT / 'tools/test-winter-cold-text-effect.mjs')],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8'
)
if proc.returncode != 0:
    print('WINTER COLD TEXT EFFECT INTEGRATION: FAIL')
    print(proc.stdout, end='')
    print(proc.stderr, end='', file=sys.stderr)
    sys.exit(proc.returncode)

print(proc.stdout, end='')
print('WINTER COLD TEXT EFFECT INTEGRATION: PASS')
print('文字化け・元文字復元・属性処理・MutationObserver・microtask重複抑止だけをUI moduleへ分離し、イベント/セーブ状態はapp.js側に維持しています。')
