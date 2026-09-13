#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CONTROLLER = (ROOT / 'js/finance/home-property-controller.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-home-rent-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')

def block_body(text, signature):
    start = text.find(signature)
    if start < 0: return ''
    brace = text.find('{', start)
    if brace < 0: return ''
    depth = 0; quote = None; esc = False; line = False; block = False; i = brace
    while i < len(text):
        c = text[i]; n = text[i + 1] if i + 1 < len(text) else ''
        if line:
            if c == '\n': line = False
            i += 1; continue
        if block:
            if c == '*' and n == '/': block = False; i += 2; continue
            i += 1; continue
        if quote:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == quote: quote = None
            i += 1; continue
        if c == '/' and n == '/': line = True; i += 2; continue
        if c == '/' and n == '*': block = True; i += 2; continue
        if c in "'\"`": quote = c; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return text[start:i + 1]
        i += 1
    return ''

automatic = block_body(APP, 'function automaticPaymentCapacity() {')
pay_fixed = block_body(APP, 'function payFixedCost(label, amount, onUnpaid) {')
home_wrapper = block_body(APP, 'function processHomeRent() {')
process_rent = block_body(CONTROLLER, 'function processRent() {')
reconcile = block_body(APP, 'function reconcileMorningPaymentsIdempotently() {')

checks = [
    ('automaticPaymentCapacity definition exists once', APP.count('function automaticPaymentCapacity() {') == 1),
    ('payFixedCost definition exists once', APP.count('function payFixedCost(label, amount, onUnpaid) {') == 1),
    ('processHomeRent wrapper exists once', APP.count('function processHomeRent() {') == 1),
    ('home rent wrapper delegates to controller', 'return homePropertyController.processRent();' in home_wrapper),
    ('living cash reserve remains 10000', 'const MIN_LIVING_CASH_RESERVE = 10000;' in APP),
    ('automatic capacity normalizes money', 'const money = Math.max(0, Math.floor(Number(state.game.money) || 0));' in automatic),
    ('automatic capacity keeps living reserve', 'return Math.max(0, money - MIN_LIVING_CASH_RESERVE);' in automatic),
    ('fixed cost normalizes due', 'const due = Math.max(0, Math.floor(Number(amount) || 0));' in pay_fixed),
    ('fixed cost capacity clamp retained', 'const paid = Math.min(automaticPaymentCapacity(), due);' in pay_fixed),
    ('fixed cost money deduction retained', 'state.game.money -= paid;' in pay_fixed),
    ('fixed cost unpaid callback retained', 'if (unpaid) onUnpaid(unpaid);' in pay_fixed),
    ('home rent date lookup retained in controller', 'const today = gameDate();' in process_rent),
    ('home rent day-15 guard retained', 'if (today.getDate() !== 15) return null;' in process_rent),
    ('home rent month idempotency retained', 'lastProcessedHomeRentMonth === monthKey' in process_rent),
    ('home rent first-30-day grace retained', 'Number(currentState.game.day) || 1) <= 30' in process_rent),
    ('home rent current property amount retained', 'const homeRent = currentRent();' in process_rent),
    ('home rent fixed cost helper retained', 'payFixedCost(`${monthKey} 自宅家賃`, homeRent' in process_rent),
    ('home rent unpaid accumulation retained', 'currentState.business.homeRentUnpaid += unpaid;' in process_rent),
    ('home rent reports bounded to 24 retained', 'homeRentReports.slice(-24)' in process_rent),
    ('home rent messages bounded to 10 retained', 'morningMessages || []), resultMessage].slice(-10)' in process_rent),
    ('home rent notifications retained', "addNotification('自宅家賃支払日'" in process_rent),
    ('morning recovery helper still calls home rent', 'processHomeRent();' in reconcile),
    ('daily rollover still processes monthly costs then home rent', 'processMonthlyFixedCosts();\n  processHomeRent();\n  processExpiredOrders();' in APP),
    ('home rent retains multiple invocation routes', APP.count('processHomeRent();') >= 3),
    ('dynamic harness imports controller', 'createHomePropertyController' in TEST),
    ('B rent dynamic regression retained', 'testHomeRentPropertyBUses200000' in TEST),
    ('home rent audit registered', 'check-home-rent-regression.py' in CURRENT),
]

failed = []
for label, ok in checks:
    print(f"{'OK' if ok else 'NG'}: {label}")
    if not ok: failed.append(label)
if failed:
    print('\nHOME RENT PROTECTION: FAIL')
    for label in failed: print(f'- {label}')
    sys.exit(1)

result = subprocess.run(['node', str(ROOT / 'tools/test-home-rent-regression.mjs')], cwd=ROOT, text=True, capture_output=True)
if result.stdout: print(result.stdout, end='' if result.stdout.endswith('\n') else '\n')
if result.stderr: print(result.stderr, end='' if result.stderr.endswith('\n') else '\n', file=sys.stderr)
if result.returncode != 0:
    print('HOME RENT PROTECTION: FAIL')
    sys.exit(result.returncode)
print('HOME RENT PROTECTION: PASS')
