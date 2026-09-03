#!/usr/bin/env python3
"""Validate quantity press/hold extraction for metal, loose and display-case controls."""
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

legacy_tokens = {
    '地金': (
        'metalQuantityHoldTimeout',
        'metalQuantityHoldInterval',
        'metalQuantityHoldButton',
        'metalQuantityHoldTriggered',
        'function clearMetalQuantityHold',
        'function startMetalQuantityHold',
        'function finishMetalQuantityHold',
    ),
    'ルース': (
        'looseQuantityHoldTimeout',
        'looseQuantityHoldInterval',
        'looseQuantityHoldButton',
        'looseQuantityHoldTriggered',
        'function clearLooseQuantityHold',
        'function startLooseQuantityHold',
        'function finishLooseQuantityHold',
    ),
    'ディスプレイケース': (
        'displayCaseHoldTimeout',
        'displayCaseHoldInterval',
        'displayCaseHoldButton',
        'displayCaseHoldTriggered',
        'function clearDisplayCaseHold',
        'function startDisplayCaseHold',
        'function finishDisplayCaseHold',
    ),
}
for label, tokens in legacy_tokens.items():
    for token in tokens:
        if token in app:
            errors.append(f'app.js: {label}の旧長押し状態/関数が残っています: {token}')

required_controller_paths = {
    '地金': (
        'const metalQuantityPressHold = createPressHoldController({',
        'metalQuantityPressHold.start(metalButton);',
        'metalQuantityPressHold.activeButton()',
        'metalQuantityPressHold.finish(metalButton);',
        'metalQuantityPressHold.cancel();',
        'metalQuantityPressHold.handleClick(button);',
    ),
    'ルース': (
        'const looseQuantityPressHold = createPressHoldController({',
        'looseQuantityPressHold.start(looseButton);',
        'looseQuantityPressHold.activeButton()',
        'looseQuantityPressHold.finish(looseButton);',
        'looseQuantityPressHold.cancel();',
        'looseQuantityPressHold.handleClick(button);',
    ),
    'ディスプレイケース': (
        'const displayCaseQuantityPressHold = createPressHoldController({',
        'displayCaseQuantityPressHold.start(caseButton);',
        'displayCaseQuantityPressHold.activeButton()',
        'displayCaseQuantityPressHold.finish(caseButton);',
        'displayCaseQuantityPressHold.cancel();',
    ),
}
for label, tokens in required_controller_paths.items():
    for token in tokens:
        if token not in app:
            errors.append(f'app.js: {label}controller導線が不足しています: {token}')

if app.count('displayCaseQuantityPressHold.handleClick(button);') != 2:
    errors.append('app.js: ケース購入・設置の2系統がcontroller click導線へ揃っていません')

# This phase migrates only the third region. Selling-price remains legacy until
# its own isolated review.
if 'function clearSellingPriceHold' not in app:
    errors.append('app.js: 今回触らない販売価格領域まで変更されています')

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
print('地金・ルース・ケースをcontrollerへ分離し、販売価格は未変更のまま維持しています。')
