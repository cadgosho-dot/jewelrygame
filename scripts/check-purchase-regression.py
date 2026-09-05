#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-purchase-regression.mjs').read_text(encoding='utf-8')
SYNC_PATH = ROOT / '.github/workflows/phase9-sync-v010898.yml'
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


PURCHASE = function_source('purchase')
registered_now = "'ルース購入処理保護'" in CURRENT and 'check-purchase-regression.py' in CURRENT
registered_by_sync = "'ルース購入処理保護'" in SYNC and 'check-purchase-regression.py' in SYNC
checks = {
    'purchase definition exists once': APP.count("function purchase(kind, id, shapeId = '')") == 1,
    'metal purchase delegation retained': "if (kind === 'metal') return buyMetal(id);" in PURCHASE,
    'loose product lookup retained': "const product = kind === 'loose' ? GEMS[id] : null;" in PURCHASE,
    'invalid product guard retained': "if (!product) return showToast('この商品は購入できません。', 'error');" in PURCHASE,
    'original loose trade guard retained': "if (product.noLooseShopTrade) return showToast('このオリジナルルースはルース屋では購入できません。イベントで入手してください。', 'error');" in PURCHASE,
    'shape normalization retained': 'const resolvedShape = normalizeLooseShape(id, shapeId);' in PURCHASE,
    'quantity lookup retained': 'const quantity = loosePurchaseQuantity(id, resolvedShape);' in PURCHASE,
    'price lookup retained': 'const unitPrice = loosePurchasePrice(id, resolvedShape);' in PURCHASE,
    'total price retained': 'const totalPrice = unitPrice * quantity;' in PURCHASE,
    'scroll snapshot retained': 'const scrollSnapshot = captureLooseShopScrollState();' in PURCHASE,
    'available time guard retained': "if (!canSpendHours(1)) return showToast('今日は購入手続きをする時間がありません。', 'error');" in PURCHASE,
    'quantity guard retained': "if (quantity < 1) return showToast('購入する数を選択してください。', 'error');" in PURCHASE,
    'money guard retained': "if (state.game.money < totalPrice) return showToast('所持金が足りません。', 'error');" in PURCHASE,
    'money deduction retained': 'state.game.money -= totalPrice;' in PURCHASE,
    'money feedback retained': 'startMoneyFeedback(-totalPrice);' in PURCHASE,
    'loose inventory increase retained': 'adjustLooseInventory(id, resolvedShape, quantity);' in PURCHASE,
    'one hour purchase time retained': 'spendHours(1);' in PURCHASE,
    'purchase label retained': 'const itemLabel = looseDisplayLabel(id, resolvedShape, { suffix: true });' in PURCHASE,
    'finance record retained': 'addFinance(`${itemLabel}を${quantity}個購入`, 0, totalPrice);' in PURCHASE,
    'purchase draft reset retained': 'loosePurchaseDraft[loosePurchaseDraftKey(id, resolvedShape)] = 1;' in PURCHASE,
    'save retained': 'saveGame();' in PURCHASE,
    'completion toast retained': 'showToast(`${itemLabel}を${quantity}個、${yen(totalPrice)}で購入しました。`, \'info\', false);' in PURCHASE,
    'render retained': 'render();' in PURCHASE,
    'scroll restore retained': 'restoreLooseShopScrollState(scrollSnapshot);' in PURCHASE,
    'dynamic harness extracts current purchase': "extractFunctionSource('purchase')" in TEST,
    'metal delegation regression case': 'testMetalPurchaseDelegatesToBuyMetal' in TEST,
    'successful loose purchase regression case': 'testSuccessfulLoosePurchase' in TEST,
    'guard regression case': 'testLoosePurchaseGuardRails' in TEST,
    'current audit registration or sync registration': registered_now or registered_by_sync,
}

failed: list[str] = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-purchase-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-purchase-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('PURCHASE PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('purchase() の地金購入委譲・ルース購入不可判定・形状・数量・価格・所持金・在庫・時間・収支・保存・スクロール復元・主要ガードを固定しました。')
print('PURCHASE PROTECTION: PASS')
