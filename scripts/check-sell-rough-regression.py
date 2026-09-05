#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-sell-rough-regression.mjs').read_text(encoding='utf-8')
SYNC_PATH = ROOT / '.github/workflows/phase12-sync-v010901.yml'
SYNC = SYNC_PATH.read_text(encoding='utf-8') if SYNC_PATH.is_file() else ''


def function_source(name: str) -> str:
    marker = f'function {name}('
    start = APP.find(marker)
    if start < 0:
        return ''
    depth = 0
    seen = False
    quote = None
    escaped = False
    template_depth = 0
    i = start
    while i < len(APP):
        ch = APP[i]
        nxt = APP[i + 1] if i + 1 < len(APP) else ''
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif quote == '`' and ch == '$' and nxt == '{':
                template_depth += 1
                i += 1
            elif quote == '`' and ch == '}' and template_depth > 0:
                template_depth -= 1
            elif ch == quote and template_depth == 0:
                quote = None
            i += 1
            continue
        if ch in ('"', "'", '`'):
            quote = ch
        elif ch == '{':
            depth += 1
            seen = True
        elif ch == '}':
            depth -= 1
            if seen and depth == 0:
                return APP[start:i + 1]
        i += 1
    return ''


SELL_ROUGH = function_source('sellRough')
registered_now = "'原石売却処理保護'" in CURRENT and 'check-sell-rough-regression.py' in CURRENT
registered_by_sync = "'原石売却処理保護'" in SYNC and 'check-sell-rough-regression.py' in SYNC
checks = {
    'sellRough definition exists once': APP.count('function sellRough(id, sellAll = false)') == 1,
    'gem lookup retained': 'const gem = GEMS[id];' in SELL_ROUGH,
    'owned rough calculation retained': 'const owned = Number(state.inventory.rough[id]) || 0;' in SELL_ROUGH,
    'missing rough guard retained': "if (!gem || owned < 1) return showToast('売却できる原石がありません。', 'error');" in SELL_ROUGH,
    'available time guard retained': "if (!canSpendHours(1)) return showToast('今日は売却手続きをする時間がありません。', 'error');" in SELL_ROUGH,
    'sell-all uses owned quantity retained': 'const qty = sellAll ? owned : 1;' in SELL_ROUGH,
    'sale price retained': 'const unitPrice = roughSalePrice(id);' in SELL_ROUGH,
    'total price retained': 'const totalPrice = unitPrice * qty;' in SELL_ROUGH,
    'rough inventory decrease retained': 'state.inventory.rough[id] -= qty;' in SELL_ROUGH,
    'money increase retained': 'state.game.money += totalPrice;' in SELL_ROUGH,
    'one hour sale time retained': 'spendHours(1);' in SELL_ROUGH,
    'daily rough sale record retained': 'state.daily.roughSold.push({ gem: id, qty, price: totalPrice, unitPrice });' in SELL_ROUGH,
    'finance record retained': 'addFinance(`${gem.name}原石をルース屋へ${qty}個売却`, totalPrice, 0);' in SELL_ROUGH,
    'save retained': 'saveGame();' in SELL_ROUGH,
    'money feedback retained': 'startMoneyFeedback(totalPrice);' in SELL_ROUGH,
    'single-sale toast retained': '`${gem.name}原石を${yen(totalPrice)}で売却しました。`' in SELL_ROUGH,
    'multi-sale toast retained': '`${gem.name}原石を${qty}個、${yen(totalPrice)}で売却しました。`' in SELL_ROUGH,
    'info toast retained': "'info',\n    false" in SELL_ROUGH,
    'render retained': 'render();' in SELL_ROUGH,
    'dynamic harness extracts current sellRough': "extractFunctionSource('sellRough')" in TEST,
    'single-sale regression case': 'testSuccessfulSingleRoughSale' in TEST,
    'sell-all owned regression case': 'testSellAllUsesOwnedRough' in TEST,
    'guard regression case': 'testRoughSaleGuardRails' in TEST,
    'current audit registration or sync registration': registered_now or registered_by_sync,
}

failed: list[str] = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-sell-rough-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-sell-rough-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('SELL ROUGH PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('sellRough() の原石在庫・1個/全売却・売価・所持金・時間・daily/finance記録・保存・通知・主要ガードを固定しました。')
print('SELL ROUGH PROTECTION: PASS')
