#!/usr/bin/env python3
"""Validate quantity/price press-hold extraction for the four staged control groups."""
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
    '販売価格': (
        'sellingPriceHoldTimeout',
        'sellingPriceHoldInterval',
        'sellingPriceHoldButton',
        'sellingPriceHoldTriggered',
        'function clearSellingPriceHold',
        'function startSellingPriceHold',
        'function finishSellingPriceHold',
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
    '販売価格': (
        'const sellingPricePressHold = createPressHoldController({',
        'sellingPricePressHold.start(sellingPriceButton);',
        'sellingPricePressHold.activeButton()',
        'sellingPricePressHold.finish(sellingPriceButton);',
        'sellingPricePressHold.cancel();',
        'sellingPricePressHold.handleClick(button);',
        'holdDelayMs: 420,',
        'repeatMs: 110,',
        "canContinue: (button) => !button.disabled && screen === 'showcaseDetail',",
    ),
}
for label, tokens in required_controller_paths.items():
    for token in tokens:
        if token not in app:
            errors.append(f'app.js: {label}controller導線が不足しています: {token}')

if app.count('displayCaseQuantityPressHold.handleClick(button);') != 2:
    errors.append('app.js: ケース購入・設置の2系統がcontroller click導線へ揃っていません')

# Tropical-shop hold handling is a separate implementation and is intentionally
# outside this four-group staged cleanup. Keep it untouched in this release.
if 'function clearTropicalShopQuantityHold' not in app:
    errors.append('app.js: 今回対象外の熱帯魚屋数量長押しまで変更されています')

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
print('地金・ルース・ディスプレイケース・販売価格の4領域をcontrollerへ分離し、各領域の既存タイミングと販売価格の継続停止条件を維持しています。')
