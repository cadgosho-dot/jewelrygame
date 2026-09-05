#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-customer-buy-regression.mjs').read_text(encoding='utf-8')

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

CUSTOMER_BUY = function_source('customerBuy')
checks = {
    'customerBuy definition exists once': APP.count('function customerBuy(') == 1,
    'proposal is recorded': 'customerState.proposedItemIds.push(itemId);' in CUSTOMER_BUY,
    'proposal time is spent': 'spendMinutes(proposalMinutes);' in CUSTOMER_BUY,
    'purchase removes jewelry with customer channel': "removeJewelry(itemId, { price, branchNumber: state.store.branchNumber, channel: 'customer' });" in CUSTOMER_BUY,
    'purchase adds money': 'state.game.money += price;' in CUSTOMER_BUY,
    'store sales total increments': 'state.store.salesCount += 1;' in CUSTOMER_BUY,
    'store revenue increments': 'state.store.totalRevenue += price;' in CUSTOMER_BUY,
    'store profit increments': 'state.store.totalProfit += price - item.cost;' in CUSTOMER_BUY,
    'customer purchase count increments': 'customerState.purchases += 1;' in CUSTOMER_BUY,
    'customer relation update retained': "customerState.relation = customerState.purchases >= 3 ? '常連客' : 'リピーター';" in CUSTOMER_BUY,
    'finance sale retained': 'さんへ販売`, price, 0);' in CUSTOMER_BUY,
    'case consumption retained': 'const caseUsed = consumeStoreCase(saleBranch);' in CUSTOMER_BUY,
    'success save retained': 'showModal({ title: \'商品を購入していただきました。\'' in CUSTOMER_BUY and 'saveGame();' in CUSTOMER_BUY,
    'failure route retained': "title: '今回は購入されませんでした。'" in CUSTOMER_BUY and 'render();' in CUSTOMER_BUY,
    'dynamic harness extracts current customerBuy': "extractFunctionSource('customerBuy')" in TEST,
    'success regression case': 'testSuccessfulPurchaseProtectsMoneyInventoryAndCustomerState' in TEST,
    'failure regression case': 'testNoPurchaseKeepsMoneyAndInventoryAndAllowsSecondProposal' in TEST,
    'closing regression case': 'testSecondFailedProposalAndClosingRoute' in TEST,
    'guard regression case': 'testGuardRails' in TEST,
    'current audit registration': "'顧客店頭購入処理保護'" in CURRENT and 'check-customer-buy-regression.py' in CURRENT,
}

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-customer-buy-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-customer-buy-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('CUSTOMER BUY PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('CUSTOMER BUY PROTECTION: PASS')
