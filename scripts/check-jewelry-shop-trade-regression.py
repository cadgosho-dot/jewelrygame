#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-jewelry-shop-trade-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase14-sync-v010903.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''

start = APP.find('function confirmJewelryShopTrade() {')
if start < 0:
    raise SystemExit('NG: confirmJewelryShopTrade definition missing')
end = APP.find('\nfunction ', start + 1)
body = APP[start:end if end >= 0 else len(APP)]

checks = [
    ('definition exists once', APP.count('function confirmJewelryShopTrade() {') == 1),
    ('pending captured', 'const pending = jewelryShopPendingTrade;' in body),
    ('pending reset retained', 'jewelryShopPendingTrade = null;' in body),
    ('modal close retained', 'closeModal();' in body),
    ('no pending guard retained', 'if (!pending) return;' in body),
    ('transaction time guard retained', '!canSpendHours(JEWELRY_SHOP_TRANSACTION_HOURS)' in body and '今日は売買手続きをする時間がありません。' in body),
    ('buy branch retained', "if (pending.type === 'buy')" in body),
    ('stock lookup retained', 'screenData.stock.find((item) => item.id === pending.itemId)' in body),
    ('sold out guard retained', 'この商品は売り切れました。' in body),
    ('capacity count retained', "state.inventory.jewelry.filter((item) => item.status !== 'sold').length" in body),
    ('capacity guard retained', 'usedCapacity >= state.inventory.capacity' in body and '完成品の保管場所に空きがありません。' in body),
    ('purchase money guard retained', 'state.game.money < stockItem.purchasePrice' in body and '所持金が足りません。' in body),
    ('purchased item identity retained', 'id: uid()' in body and 'name: stockItem.name' in body),
    ('purchased item storage metadata retained', "status: 'stored'" in body and 'createdDay: state.game.day' in body and 'purchasedDay: state.game.day' in body),
    ('jewelry shop acquisition metadata retained', "acquisition: 'jewelryShop'" in body and 'shopPurchasePrice: stockItem.purchasePrice' in body),
    ('purchase money deduction retained', 'state.game.money -= stockItem.purchasePrice;' in body),
    ('purchase inventory append retained', 'state.inventory.jewelry.push(purchased);' in body),
    ('shop stock removal retained', 'screenData.stock = screenData.stock.filter((item) => item.id !== pending.itemId);' in body),
    ('purchase time cost retained', body.count('spendHours(JEWELRY_SHOP_TRANSACTION_HOURS);') >= 2),
    ('purchase finance retained', 'addFinance(`ジュエリーショップで${purchased.name}を購入`, 0, stockItem.purchasePrice);' in body),
    ('purchase save retained', body.count('saveGame();') >= 2),
    ('purchase feedback retained', 'startMoneyFeedback(-stockItem.purchasePrice);' in body),
    ('purchase toast retained', "showToast(`${purchased.name}を購入しました。`, 'info', false);" in body),
    ('sell stored item lookup retained', "entry.id === pending.itemId && entry.status === 'stored'" in body),
    ('sell missing guard retained', 'この商品は現在売却できません。' in body),
    ('sell offer retained', 'const offer = jewelryShopSellOffer(item);' in body),
    ('sell profit retained', 'const profit = offer - Math.max(0, Number(item.cost) || 0);' in body),
    ('sell removal retained', "removeJewelry(item.id, { price: offer, channel: 'jewelryShop' });" in body),
    ('sell money increase retained', 'state.game.money += offer;' in body),
    ('sell daily record retained', "state.daily.sold.push({ itemId: item.id, name: item.name, price: offer, profit, channel: 'jewelryShop' });" in body),
    ('sell finance retained', 'addFinance(`${item.name}をジュエリーショップへ卸販売`, offer, 0);' in body),
    ('sell feedback retained', 'startMoneyFeedback(offer);' in body),
    ('sell toast retained', "showToast(`${item.name}を${yen(offer)}で卸販売しました。`, 'info', false);" in body),
    ('render retained for both branches', body.count('render();') >= 2),
    ('dynamic harness extracts current function', "extractFunction('confirmJewelryShopTrade')" in TEST),
    ('successful purchase regression case', 'testSuccessfulPurchase' in TEST),
    ('successful wholesale sale regression case', 'testSuccessfulWholesaleSale' in TEST),
    ('pending/time guard regression case', 'testNoPendingAndTimeGuard' in TEST),
    ('purchase guard regression case', 'testPurchaseGuards' in TEST),
    ('sale guard regression case', 'testSaleMissingGuard' in TEST),
    ('current audit registration or sync registration', 'check-jewelry-shop-trade-regression.py' in CURRENT or 'check-jewelry-shop-trade-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('JEWELRY SHOP TRADE PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-jewelry-shop-trade-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('confirmJewelryShopTrade() の購入・卸販売・保管上限・所持金・時間・在庫・収支・保存・主要ガードを固定しました。')
print('JEWELRY SHOP TRADE PROTECTION: PASS')
