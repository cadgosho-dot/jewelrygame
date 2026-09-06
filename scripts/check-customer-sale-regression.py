#!/usr/bin/env python3
"""Protect direct customer finished-jewelry sale processing without modifying gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-customer-sale-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase31-sync-v010920.yml'


def section(name):
    matches = list(re.finditer(r'^function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^function |^async function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


customer_buy = section('customerBuy')
checks = {
    'customer service guard retained': "if (!canServeCustomers()) return showToast('現在は接客できません。', 'error');" in customer_buy,
    'displayed item and visiting store showcase are required': all(token in customer_buy for token in [
        "item.status !== 'displayed'", 'showcaseSlotForJewelry(item.id, visitBranch)', "showToast('この商品は現在の店舗では提案できません。', 'error')",
    ]),
    'customer wishes must be heard first': "if (!customerState.wishesHeard) return showToast('先にお客様の希望を聞いてください。', 'error');" in customer_buy,
    'duplicate and two-item proposal limits retained': all(token in customer_buy for token in [
        'customerState.proposedItemIds.includes(itemId)', 'customerState.proposedItemIds.length >= 2',
        'この商品はすでに提案しています。', '店頭商品を提案できるのは2点までです。',
    ]),
    'proposal must fit store hours': all(token in customer_buy for token in [
        'const proposalMinutes = customerProposalMinutes(customerState.visitingBranchNumber);',
        "if (!canSpendStoreMinutes(proposalMinutes)) return showToast('店舗営業時間内に接客を完了できません。', 'error');",
    ]),
    'purchase roll uses current match result': all(token in customer_buy for token in [
        'const result = customerMatchResult(item, request, customerState.visitingBranchNumber);',
        'const price = result.price;', 'const willBuy = Math.random() < result.chance;',
    ]),
    'proposal and service time are committed before purchase branch': (
        customer_buy.index('customerState.proposedItemIds.push(itemId);')
        < customer_buy.index('spendMinutes(proposalMinutes);')
        < customer_buy.index('if (willBuy) {')
    ),
    'successful sale closes customer visit': all(token in customer_buy for token in [
        'customerState.visiting = false;', 'customerState.visitingBranchNumber = null;',
        'customerState.activeRequest = null;', 'customerState.wishesHeard = false;', 'customerState.proposedItemIds = [];',
    ]),
    'successful sale delegates sold metadata': "removeJewelry(itemId, { price, branchNumber: state.store.branchNumber, channel: 'customer' });" in customer_buy,
    'successful sale credits money and store totals': all(token in customer_buy for token in [
        'state.game.money += price;', 'state.store.salesCount += 1;', 'state.store.totalRevenue += price;',
        'state.store.totalProfit += price - item.cost;',
    ]),
    'branch progress records sale revenue and service success': "addStoreProgress({ branchNumber: state.store.branchNumber, rating: 0, sale: true, revenue: price, serviceSuccess: true });" in customer_buy,
    'repeat customer relationship advances': all(token in customer_buy for token in [
        'customerState.purchases += 1;', "customerState.relation = customerState.purchases >= 3 ? '常連客' : 'リピーター';",
    ]),
    'sale finance notification and case consumption retained': all(token in customer_buy for token in [
        'addFinance(`${customer.name}さんへ販売`, price, 0);', "addNotification('商品が売れました'", 'const caseUsed = consumeStoreCase(saleBranch);',
    ]),
    'successful sale saves before returning': customer_buy.count('saveGame();') == 2 and "title: '商品を購入していただきました。'" in customer_buy,
    'rejected proposal saves renders and explains retry state': all(token in customer_buy for token in [
        'const storeStillOpen = storeBusinessOpen();',
        'const canTryAgain = storeStillOpen && customerState.visiting && customerState.proposedItemIds.length < 2;',
        'saveGame();', 'render();', "title: '今回は購入されませんでした。'",
        '19:00になったため、本日の接客は終了しました。',
    ]),
    'test executes current production source': "names.map(extractFunction).join('\\n')" in TEST and 'vm.runInContext(source, ctx' in TEST,
    'registered in audit or pending formal sync': 'check-customer-sale-regression.py' in CURRENT or (SYNC.is_file() and 'check-customer-sale-regression.py' in SYNC.read_text(encoding='utf-8')),
}
for name in [
    'testCustomerSaleGuards',
    'testRejectedProposalPreservesSaleState',
    'testSuccessfulCustomerSaleSettlement',
    'testRejectedProposalAfterClosingReturnsStore',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('CUSTOMER SALE PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-customer-sale-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('CUSTOMER SALE PROTECTION: PASS')
