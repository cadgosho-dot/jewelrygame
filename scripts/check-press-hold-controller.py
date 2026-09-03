#!/usr/bin/env python3
"""Validate the first quantity press/hold extraction: metal controls only."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
module_path = ROOT / 'js/ui/press-hold-controller.js'
errors: list[str] = []

expected_import = f"import {{ createPressHoldController }} from './ui/press-hold-controller.js?v={version}';"
if expected_import not in app:
    errors.append('app.js: press-hold-controller のVERSION付きimportがありません')
if f"./js/ui/press-hold-controller.js?v={version}" not in sw:
    errors.append('sw.js: press-hold-controller が必須キャッシュにありません')
if not module_path.is_file():
    errors.append('js/ui/press-hold-controller.js がありません')

for token in (
    'metalQuantityHoldTimeout',
    'metalQuantityHoldInterval',
    'metalQuantityHoldButton',
    'metalQuantityHoldTriggered',
    'function clearMetalQuantityHold',
    'function startMetalQuantityHold',
    'function finishMetalQuantityHold',
):
    if token in app:
        errors.append(f'app.js: 地金の旧長押し状態/関数が残っています: {token}')

required_metal = (
    'const metalQuantityPressHold = createPressHoldController({',
    'metalQuantityPressHold.start(metalButton);',
    'metalQuantityPressHold.activeButton()',
    'metalQuantityPressHold.finish(metalButton);',
    'metalQuantityPressHold.cancel();',
    'metalQuantityPressHold.handleClick(button);',
)
for token in required_metal:
    if token not in app:
        errors.append(f'app.js: 地金controller導線が不足しています: {token}')

# Phase 2 is deliberately one region only. These three legacy groups must remain
# until separately reviewed, preventing an accidental broad migration.
for token in (
    'function clearLooseQuantityHold',
    'function clearDisplayCaseHold',
    'function clearSellingPriceHold',
):
    if token not in app:
        errors.append(f'app.js: 今回触らない領域まで変更されています: {token}')

if errors:
    print('PRESS HOLD INTEGRATION: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

proc = subprocess.run(
    ['node', str(ROOT / 'tools/test-press-hold-controller.mjs')],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8'
)
if proc.returncode != 0:
    print('PRESS HOLD INTEGRATION: FAIL')
    print(proc.stdout, end='')
    print(proc.stderr, end='', file=sys.stderr)
    sys.exit(proc.returncode)

print(proc.stdout, end='')
print('PRESS HOLD INTEGRATION: PASS')
print('地金だけをcontrollerへ分離し、他3領域を未変更のまま維持しています。')
