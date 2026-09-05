#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-sell-loose-regression.mjs').read_text(encoding='utf-8')
SYNC_PATH = ROOT / '.github/workflows/phase10-sync-v010899.yml'
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


SELL_LOOSE = function_source('sellLoose')
registered_now = "'ルース売却処理保護'" in CURRENT and 'check-sell-loose-regression.py' in CURRENT
registered_by_sync = "'ルース売却処理保護'" in SYNC and 'check-sell-loose-regression.py' in SYNC
checks = {
    'sellLoose definition exists once': APP.count("function sellLoose(id, shapeId = '', sellAll = false)") == 1,
    'gem lookup retained': 'const gem = GEMS[id];' in SELL_LOOSE,
    'shape normalization retained': 'const resolvedShape = normalizeLooseShape(id, shapeId);' in SELL_LOOSE,
    'available loose calculation retained': 'const available = Math.max(0, Math.floor(looseAvailableQuantity(id, resolvedShape)));' in SELL_LOOSE,
    'reserved inventory guard retained': "if (!gem || available < 1) return showToast('使用可能なルースがありません。注文に使用予定のルースは売却できません。', 'error');" in SELL_LOOSE,
    'original loose trade guard retained': "if (gem.noLooseShopTrade) return showToast('このオリジナルルースはルース屋では売却できません。', 'error');" in SELL_LOOSE,
    'available time guard retained': "if (!canSpendHours(1)) return showToast('今日は売却手続きをする時間がありません。', 'error');" in SELL_LOOSE,
    'sell-all uses available quantity retained': 'const qty = sellAll ? available : 1;' in SELL_LOOSE,
    'sale price retained': 'const unitPrice = looseSalePrice(id, resolvedShape);' in SELL_LOOSE,
    'total price retained': 'const totalPrice = unitPrice * qty;' in SELL_LOOSE,
    'loose inventory decrease retained': 'adjustLooseInventory(id, resolvedShape, -qty);' in SELL_LOOSE,
    'money increase retained': 'state.game.money += totalPrice;' in SELL_LOOSE,
    'one hour sale time retained': 'spendHours(1);' in SELL_LOOSE,
    'daily loose sale record retained': 'state.daily.looseSold.push({ gem: id, looseShape: resolvedShape, qty, price: totalPrice, unitPrice });' in SELL_LOOSE,
    'display label retained': 'const itemLabel = looseDisplayLabel(id, resolvedShape, { suffix: true });' in SELL_LOOSE,
    'finance record retained': 'addFinance(`${itemLabel}をルース屋へ${qty}個売却`, totalPrice, 0);' in SELL_LOOSE,
    'save retained': 'saveGame();' in SELL_LOOSE,
    'money feedback retained': 'startMoneyFeedback(totalPrice);' in SELL_LOOSE,
    'single-sale toast retained': '`${itemLabel}を${yen(totalPrice)}で売却しました。`' in SELL_LOOSE,
    'multi-sale toast retained': '`${itemLabel}を${qty}個、${yen(totalPrice)}で売却しました。`' in SELL_LOOSE,
    'render retained': 'render();' in SELL_LOOSE,
    'dynamic harness extracts current sellLoose': "extractFunctionSource('sellLoose')" in TEST,
    'single-sale regression case': 'testSuccessfulSingleLooseSale' in TEST,
    'sell-all available-only regression case': 'testSellAllUsesOnlyAvailableLoose' in TEST,
    'guard regression case': 'testLooseSaleGuardRails' in TEST,
    'current audit registration or sync registration': registered_now or registered_by_sync,
}

failed: list[str] = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-sell-loose-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-sell-loose-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('SELL LOOSE PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('sellLoose() の注文予約分保護・形状・売却数量・売価・ルース在庫・所持金・時間・収支・保存・主要ガードを固定しました。')
print('SELL LOOSE PROTECTION: PASS')
