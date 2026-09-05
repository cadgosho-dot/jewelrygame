#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-sell-metal-regression.mjs').read_text(encoding='utf-8')

def function_source(name: str) -> str:
    lines = APP.splitlines()
    marker = f'function {name}('
    for start, line in enumerate(lines):
        if marker not in line:
            continue
        depth = 0
        seen = False
        for end in range(start, len(lines)):
            row = lines[end]
            depth += row.count('{') - row.count('}')
            if '{' in row:
                seen = True
            if seen and depth <= 0:
                return '\n'.join(lines[start:end + 1])
    return ''

SELL_METAL = function_source('sellMetal')
checks = {
    'sellMetal definition exists once': APP.count('function sellMetal(') == 1,
    'market availability guard retained': "if (!metalMarketTradeReady()) return showToast('地金相場を確認できないため、現在は売却できません。', 'error');" in SELL_METAL,
    'product guard retained': "if (!product) return showToast('この地金は売却できません。', 'error');" in SELL_METAL,
    'available time guard retained': "if (!canSpendHours(1)) return showToast('今日は売却手続きをする時間がありません。', 'error');" in SELL_METAL,
    'quantity selection retained': "const quantity = metalTradeQuantity('sell', id);" in SELL_METAL,
    'maximum quantity retained': "const maximum = metalTradeMaximum('sell', id);" in SELL_METAL,
    'quantity guard retained': "if (quantity < 1 || quantity > maximum) return showToast('売却する重量を▲▼で選んでください。', 'error');" in SELL_METAL,
    'market price calculation retained': "const unitPrice = metalTradePricePerGram('sell', id);" in SELL_METAL and 'const totalPrice = unitPrice * quantity;' in SELL_METAL,
    'metal inventory decrease retained': 'state.inventory.metals[id] = roundedMetalWeight(metalOwnedWeight(id) - quantity);' in SELL_METAL,
    'money increase retained': 'state.game.money += totalPrice;' in SELL_METAL,
    'one hour cost retained': 'spendHours(1);' in SELL_METAL,
    'finance record retained': 'addFinance(`${product.name}を${quantity}g売却`, totalPrice, 0);' in SELL_METAL,
    'sale draft reset retained': 'metalTradeDraft.sell[id] = 1;' in SELL_METAL,
    'save retained': 'saveGame();' in SELL_METAL,
    'money feedback retained': 'startMoneyFeedback(totalPrice);' in SELL_METAL,
    'sale completion toast retained': "showToast(`${product.name}を${quantity}g売却しました`, 'info', false);" in SELL_METAL,
    'render retained': 'render();' in SELL_METAL,
    'dynamic harness extracts current sellMetal': "extractFunctionSource('sellMetal')" in TEST,
    'successful sale regression case': 'testSuccessfulMetalSale' in TEST,
    'guard regression case': 'testMetalSaleGuardRails' in TEST,
    'current audit registration': "'地金売却処理保護'" in CURRENT and 'check-sell-metal-regression.py' in CURRENT,
}

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-sell-metal-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-sell-metal-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('SELL METAL PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('SELL METAL PROTECTION: PASS')
