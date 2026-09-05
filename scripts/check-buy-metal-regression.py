#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-buy-metal-regression.mjs').read_text(encoding='utf-8')

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

BUY_METAL = function_source('buyMetal')
checks = {
    'buyMetal definition exists once': APP.count('function buyMetal(') == 1,
    'market availability guard retained': "if (!metalMarketTradeReady()) return showToast('地金相場を確認できないため、現在は購入できません。', 'error');" in BUY_METAL,
    'product guard retained': "if (!product) return showToast('この地金は購入できません。', 'error');" in BUY_METAL,
    'available time guard retained': "if (!canSpendHours(1)) return showToast('今日は購入手続きをする時間がありません。', 'error');" in BUY_METAL,
    'quantity selection retained': "const quantity = metalTradeQuantity('buy', id);" in BUY_METAL,
    'maximum quantity retained': "const maximum = metalTradeMaximum('buy', id);" in BUY_METAL,
    'quantity guard retained': "if (quantity < 1 || quantity > maximum) return showToast('購入する重量を▲▼で選んでください。', 'error');" in BUY_METAL,
    'market price calculation retained': "const unitPrice = metalTradePricePerGram('buy', id);" in BUY_METAL and 'const totalPrice = unitPrice * quantity;' in BUY_METAL,
    'money guard retained': "if (state.game.money < totalPrice) return showToast('所持金が足りません。', 'error');" in BUY_METAL,
    'storage capacity guard retained': "if (metalOwnedWeight(id) + quantity > metalStorageLimit(id) + 1e-9) return showToast('地金の保管上限を超えています。', 'error');" in BUY_METAL,
    'money deduction retained': 'state.game.money -= totalPrice;' in BUY_METAL,
    'metal inventory increase retained': 'state.inventory.metals[id] = roundedMetalWeight(metalOwnedWeight(id) + quantity);' in BUY_METAL,
    'money feedback retained': 'startMoneyFeedback(-totalPrice);' in BUY_METAL,
    'one hour cost retained': 'spendHours(1);' in BUY_METAL,
    'finance record retained': 'addFinance(`${product.name}を${quantity}g購入`, 0, totalPrice);' in BUY_METAL,
    'purchase draft reset retained': 'metalTradeDraft.buy[id] = 1;' in BUY_METAL,
    'save retained': 'saveGame();' in BUY_METAL,
    'purchase completion toast retained': "showToast(`${product.name}を${quantity}g購入しました`, 'info', false);" in BUY_METAL,
    'render retained': 'render();' in BUY_METAL,
    'dynamic harness extracts current buyMetal': "extractFunctionSource('buyMetal')" in TEST,
    'successful purchase regression case': 'testSuccessfulMetalPurchase' in TEST,
    'guard regression case': 'testMetalPurchaseGuardRails' in TEST,
    'current audit registration': "'地金購入処理保護'" in CURRENT and 'check-buy-metal-regression.py' in CURRENT,
}

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-buy-metal-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-buy-metal-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('BUY METAL PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('BUY METAL PROTECTION: PASS')
