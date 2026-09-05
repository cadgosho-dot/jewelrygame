#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-confirm-order-regression.mjs').read_text(encoding='utf-8')

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

CONFIRM_ORDER = function_source('confirmOrder')
checks = {
    'confirmOrder definition exists once': APP.count('function confirmOrder(') == 1,
    'order limit guard retained': 'activeOrderCount() >= limit' in CONFIRM_ORDER,
    'store time guard retained': 'canSpendStoreMinutes(30)' in CONFIRM_ORDER,
    'feasibility guard retained': 'if (!feasibility.possible)' in CONFIRM_ORDER,
    'accepted order is pushed': 'state.orders.push(order);' in CONFIRM_ORDER,
    'consultation spends 30 minutes': 'spendMinutes(30);' in CONFIRM_ORDER,
    'accepted day retained': 'acceptedDay: state.game.day' in CONFIRM_ORDER,
    'deadline retained': 'deadlineDay: state.game.day + difficulty.days' in CONFIRM_ORDER,
    'branch number retained': 'branchNumber: Math.max(1, Number(state.store.branchNumber) || 1)' in CONFIRM_ORDER,
    'accepted status retained': "status: '受注'" in CONFIRM_ORDER,
    'customer visiting state clears': 'customerState.visiting = false;' in CONFIRM_ORDER and 'customerState.activeRequest = null;' in CONFIRM_ORDER,
    'customer proposal state clears': 'customerState.wishesHeard = false;' in CONFIRM_ORDER and 'customerState.proposedItemIds = [];' in CONFIRM_ORDER,
    'acceptance notification retained': "addNotification('注文を受けました'" in CONFIRM_ORDER,
    'save retained': 'saveGame();' in CONFIRM_ORDER,
    'orders screen route retained': "setScreen('orders', {}, false);" in CONFIRM_ORDER,
    'dynamic harness extracts current confirmOrder': "extractFunctionSource('confirmOrder')" in TEST,
    'success regression case': 'testSuccessfulOrderAcceptance' in TEST,
    'invalid state regression case': 'testInvalidCustomerStateClosesModalOnly' in TEST,
    'limit regression case': 'testOrderLimitGuard' in TEST,
    'time regression case': 'testStoreTimeGuard' in TEST,
    'feasibility regression case': 'testFeasibilityGuard' in TEST,
    'current audit registration': "'注文受付処理保護'" in CURRENT and 'check-confirm-order-regression.py' in CURRENT,
}

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-confirm-order-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-confirm-order-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('CONFIRM ORDER PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('CONFIRM ORDER PROTECTION: PASS')
