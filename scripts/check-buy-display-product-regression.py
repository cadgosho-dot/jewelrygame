#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-buy-display-product-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase13-sync-v010902.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''

start = APP.find('function buyDisplayProduct(productId) {')
if start < 0:
    raise SystemExit('NG: buyDisplayProduct definition missing')
end = APP.find('\nfunction ', start + 1)
body = APP[start:end if end >= 0 else len(APP)]

checks = [
    ('definition exists once', APP.count('function buyDisplayProduct(productId) {') == 1),
    ('product lookup retained', 'const product = DISPLAY_SHOP_PRODUCTS[productId];' in body),
    ('invalid product guard retained', 'if (!product) return;' in body),
    ('facility availability retained', "okachimachiFacilityAvailability('displayShop')" in body and 'if (!availability.open)' in body),
    ('case quantity retained', "productId === 'case' ? displayCasePurchaseQuantity() : 1" in body),
    ('quantity guard retained', "購入する数量を選択してください。" in body),
    ('purchase limit retained', 'if (product.purchaseLimit)' in body and 'owned + installed + quantity' in body),
    ('installed case count retained', 'storeCaseRemaining(currentStoreBranch())' in body),
    ('total price retained', 'const totalPrice = product.price * quantity;' in body),
    ('money guard retained', 'state.game.money < totalPrice' in body),
    ('one hour guard retained', '!canSpendHours(1)' in body),
    ('money deduction retained', 'state.game.money -= totalPrice;' in body),
    ('money feedback retained', 'startMoneyFeedback(-totalPrice);' in body),
    ('one hour cost retained', 'spendHours(1);' in body),
    ('display inventory increase retained', 'state.store.displayInventory[productId]' in body and '+ quantity' in body),
    ('finance record retained', 'addFinance(`${product.name}を${quantity}個購入`, 0, totalPrice);' in body),
    ('case draft reset retained', "if (productId === 'case') displayCasePurchaseDraft = 1;" in body),
    ('save retained', 'saveGame();' in body),
    ('completion toast retained', 'showToast(`${product.name}を${quantity}個購入しました。`);' in body),
    ('render retained', 'render();' in body),
    ('dynamic harness extracts current function', "extractFunction('buyDisplayProduct')" in TEST),
    ('successful showcase regression case', 'testSuccessfulShowcasePurchase' in TEST),
    ('case quantity regression case', 'testSuccessfulCaseQuantityPurchaseAndDraftReset' in TEST),
    ('purchase limit regression case', 'testPurchaseLimitIncludesInstalledCases' in TEST),
    ('guard regression case', 'testGuardRails' in TEST),
    ('current audit registration or sync registration', 'check-buy-display-product-regression.py' in CURRENT or 'check-buy-display-product-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('BUY DISPLAY PRODUCT PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-buy-display-product-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('buyDisplayProduct() の営業判定・数量/保有上限・所持金・時間・未設置在庫・収支・保存・通知・主要ガードを固定しました。')
print('BUY DISPLAY PRODUCT PROTECTION: PASS')
