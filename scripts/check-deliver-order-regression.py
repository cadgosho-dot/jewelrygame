#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-deliver-order-regression.mjs').read_text(encoding='utf-8')


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


DELIVER_ORDER = function_source('deliverOrder')
checks = {
    'deliverOrder definition exists once': APP.count('function deliverOrder(') == 1,
    'delivery requires completed order and jewelry': "order.status !== '完成'" in DELIVER_ORDER and '納品できる商品がありません。' in DELIVER_ORDER,
    'closed branch guard retained': 'storeBranchOperating(deliveryBranch)' in DELIVER_ORDER and '注文を受けた店舗が休業中のため納品できません。' in DELIVER_ORDER,
    'delivery hours guard retained': 'storeDeliveryOpen()' in DELIVER_ORDER and '注文品を納品できるのは9:00～19:00です。' in DELIVER_ORDER,
    'overdue order expires before sale': 'state.game.day > Number(order.deadlineDay)' in DELIVER_ORDER and 'expireOrder(order);' in DELIVER_ORDER,
    'order completion fields retained': "order.status = '完了';" in DELIVER_ORDER and 'order.closedDay = state.game.day;' in DELIVER_ORDER and 'order.deliveredDay = state.game.day;' in DELIVER_ORDER,
    'sold jewelry metadata retained': "item.status = 'sold';" in DELIVER_ORDER and "item.soldChannel = 'order';" in DELIVER_ORDER and 'item.soldPrice = Math.round(Number(order.price) || 0);' in DELIVER_ORDER,
    'money and store totals retained': 'state.game.money += order.price;' in DELIVER_ORDER and 'state.store.salesCount += 1;' in DELIVER_ORDER and 'state.store.totalRevenue += order.price;' in DELIVER_ORDER and 'state.store.totalProfit += order.price - item.cost;' in DELIVER_ORDER,
    'delivered order counter retained': 'state.store.deliveredOrderCount = Math.max(0, Math.floor(Number(state.store.deliveredOrderCount) || 0)) + 1;' in DELIVER_ORDER,
    'store progress retained': 'addStoreProgress({ branchNumber: order.branchNumber, rating: 1, orderDelivery: true });' in DELIVER_ORDER,
    'customer purchase and relation retained': 'customerState.purchases += 1;' in DELIVER_ORDER and "customerState.relation = customerState.purchases >= 3 ? '常連客' : 'リピーター';" in DELIVER_ORDER,
    'finance and case consumption retained': 'さんへ注文品を納品`, order.price, 0);' in DELIVER_ORDER and 'const caseUsed = consumeStoreCase(deliveryBranch);' in DELIVER_ORDER,
    'delivery save retained': 'saveGame();' in DELIVER_ORDER,
    'immediate completion route retained': 'if (immediateFromCompletion)' in DELIVER_ORDER and 'completionId = null;' in DELIVER_ORDER and "setScreen('orders', {}, false);" in DELIVER_ORDER,
    'success modal retained': "title: 'ありがとうございました！'" in DELIVER_ORDER and 'お客様へ納品しました。' in DELIVER_ORDER,
    'dynamic harness extracts current deliverOrder': "extractFunctionSource('deliverOrder')" in TEST,
    'success regression case': 'testSuccessfulDeliveryProtectsOrderSaleAndAccounting' in TEST,
    'double delivery regression case': 'testSecondDeliveryCannotPayTwice' in TEST,
    'guard regression case': 'testDeliveryGuardRails' in TEST,
    'overdue regression case': 'testOverdueDeliveryExpiresWithoutSale' in TEST,
    'immediate completion regression case': 'testImmediateCompletionDeliveryBypassesStoreGuardsAndReturnsToOrders' in TEST,
    'current audit registration': "'注文品納品処理保護'" in CURRENT and 'check-deliver-order-regression.py' in CURRENT,
}

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-deliver-order-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-deliver-order-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('DELIVER ORDER PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('DELIVER ORDER PROTECTION: PASS')
