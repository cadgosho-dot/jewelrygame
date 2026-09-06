#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-home-rent-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase27-sync-v010916.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''


def block_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    brace = APP.find('{', start)
    if brace < 0:
        return ''
    depth = 0
    quote = None
    esc = False
    line = False
    block = False
    i = brace
    while i < len(APP):
        c = APP[i]
        n = APP[i + 1] if i + 1 < len(APP) else ''
        if line:
            if c == '\n':
                line = False
            i += 1
            continue
        if block:
            if c == '*' and n == '/':
                block = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if esc:
                esc = False
            elif c == '\\':
                esc = True
            elif c == quote:
                quote = None
            i += 1
            continue
        if c == '/' and n == '/':
            line = True
            i += 2
            continue
        if c == '/' and n == '*':
            block = True
            i += 2
            continue
        if c in "'\"`":
            quote = c
            i += 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return APP[start:i + 1]
        i += 1
    return ''


automatic = block_body('function automaticPaymentCapacity() {')
pay_fixed = block_body('function payFixedCost(label, amount, onUnpaid) {')
home_rent = block_body('function processHomeRent() {')
reconcile = block_body('function reconcileMorningPaymentsIdempotently() {')

checks = [
    ('automaticPaymentCapacity definition exists once', APP.count('function automaticPaymentCapacity() {') == 1),
    ('payFixedCost definition exists once', APP.count('function payFixedCost(label, amount, onUnpaid) {') == 1),
    ('processHomeRent definition exists once', APP.count('function processHomeRent() {') == 1),
    ('living cash reserve remains 10000', 'const MIN_LIVING_CASH_RESERVE = 10000;' in APP),

    ('automatic capacity normalizes money', 'const money = Math.max(0, Math.floor(Number(state.game.money) || 0));' in automatic),
    ('automatic capacity keeps living reserve', 'return Math.max(0, money - MIN_LIVING_CASH_RESERVE);' in automatic),
    ('automatic capacity has no direct save/time mutation', all(token not in automatic for token in ('saveGame(', 'advanceTime(', 'spendHours(', 'spendMinutes('))),

    ('fixed cost normalizes due', 'const due = Math.max(0, Math.floor(Number(amount) || 0));' in pay_fixed),
    ('fixed cost zero-due no-op retained', 'if (!due) return { paid: 0, unpaid: 0 };' in pay_fixed),
    ('fixed cost capacity clamp retained', 'const paid = Math.min(automaticPaymentCapacity(), due);' in pay_fixed),
    ('fixed cost money deduction retained', 'state.game.money -= paid;' in pay_fixed),
    ('fixed cost finance record only when paid retained', 'if (paid) addFinance(label, 0, paid);' in pay_fixed),
    ('fixed cost unpaid calculation retained', 'const unpaid = due - paid;' in pay_fixed),
    ('fixed cost unpaid callback retained', 'if (unpaid) onUnpaid(unpaid);' in pay_fixed),
    ('fixed cost return shape retained', 'return { paid, unpaid };' in pay_fixed),
    ('fixed cost has no direct save/time mutation', all(token not in pay_fixed for token in ('saveGame(', 'advanceTime(', 'spendHours(', 'spendMinutes('))),

    ('home rent current game date lookup retained', 'const today = gameDate();' in home_rent),
    ('home rent day-15 guard retained', 'if (today.getDate() !== 15) return null;' in home_rent),
    ('home rent month key retained', "const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;" in home_rent),
    ('home rent same-month idempotency retained', 'if (state.business.lastProcessedHomeRentMonth === monthKey) return null;' in home_rent),
    ('home rent first-30-day grace retained', 'if (Math.max(1, Number(state.game.day) || 1) <= 30)' in home_rent),
    ('home rent grace report shape retained', 'const report = { month: monthKey, amount: 0, paid: 0, unpaid: 0, grace: true };' in home_rent),
    ('home rent grace month marker retained', 'state.business.lastProcessedHomeRentMonth = monthKey;' in home_rent),
    ('home rent report append retained', 'state.business.homeRentReports.push(report);' in home_rent),
    ('home rent reports bounded to 24 retained', 'state.business.homeRentReports = state.business.homeRentReports.slice(-24);' in home_rent),
    ('home rent grace message retained', "const message = 'ゲーム開始から30日間は、自宅家賃の初回猶予期間です。今月の請求はありません。';" in home_rent),
    ('home rent morning messages bounded to 10 retained', 'state.tools.morningMessages = [...(state.tools.morningMessages || []), message].slice(-10);' in home_rent),
    ('home rent grace notification retained', "addNotification('自宅家賃の初回猶予', message, 'info');" in home_rent),
    ('home rent grace report return retained', home_rent.count('return report;') >= 2),

    ('home rent delegates payment to fixed-cost helper', 'const result = payFixedCost(`${monthKey} 自宅家賃`, HOME_MONTHLY_RENT, (unpaid) =>' in home_rent),
    ('home rent unpaid accumulation retained', 'state.business.homeRentUnpaid += unpaid;' in home_rent),
    ('home rent paid report shape retained', 'const report = { month: monthKey, amount: HOME_MONTHLY_RENT, paid: result.paid, unpaid: result.unpaid };' in home_rent),
    ('home rent unpaid message retains living reserve', '生活費${yen(MIN_LIVING_CASH_RESERVE)}は残しています。' in home_rent),
    ('home rent full-payment message retained', ': `自宅家賃 ${yen(HOME_MONTHLY_RENT)}を支払いました。`;' in home_rent),
    ('home rent payment morning message retained', 'state.tools.morningMessages = [...(state.tools.morningMessages || []), resultMessage].slice(-10);' in home_rent),
    ('home rent payment notification retained', "addNotification('自宅家賃支払日', resultMessage, result.unpaid ? 'warning' : 'info');" in home_rent),
    ('home rent has no direct save/time mutation', all(token not in home_rent for token in ('saveGame(', 'advanceTime(', 'spendHours(', 'spendMinutes('))),

    ('morning recovery helper still calls home rent', 'processHomeRent();' in reconcile),
    ('daily rollover still processes monthly costs then home rent', 'processMonthlyFixedCosts();\n  processHomeRent();\n  processExpiredOrders();' in APP),
    ('home rent retains multiple recovery/daily invocation routes', APP.count('processHomeRent();') >= 3),

    ('dynamic harness extracts automatic capacity', "extractFunction('automaticPaymentCapacity')" in TEST),
    ('dynamic harness extracts fixed cost helper', "extractFunction('payFixedCost')" in TEST),
    ('dynamic harness extracts home rent function', "extractFunction('processHomeRent')" in TEST),
    ('automatic capacity regression retained', 'testAutomaticPaymentCapacityKeepsLivingReserve' in TEST),
    ('fixed-cost full/partial regression retained', 'testPayFixedCostFullAndPartialPayment' in TEST),
    ('fixed-cost zero-due regression retained', 'testPayFixedCostZeroDueDoesNothing' in TEST),
    ('home rent day/idempotency guards regression retained', 'testHomeRentNonBillingDayAndDuplicateAreNoOps' in TEST),
    ('home rent grace/bounds regression retained', 'testHomeRentGracePeriodAndBounds' in TEST),
    ('home rent full-payment regression retained', 'testHomeRentFullPayment' in TEST),
    ('home rent partial/unpaid regression retained', 'testHomeRentPartialPaymentAccumulatesUnpaidAndKeepsReserve' in TEST),
    ('home rent no-capacity regression retained', 'testHomeRentNoAutomaticCapacityRecordsFullUnpaid' in TEST),
    ('home rent double-charge regression retained', 'testHomeRentSecondCallCannotChargeTwice' in TEST),
    ('current audit registration or sync registration', 'check-home-rent-regression.py' in CURRENT or 'check-home-rent-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(f"{'OK' if ok else 'NG'}: {label}")
    if not ok:
        failed.append(label)

if failed:
    print('\nHOME RENT PROTECTION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

result = subprocess.run(
    ['node', str(ROOT / 'tools/test-home-rent-regression.mjs')],
    cwd=ROOT,
    text=True,
    capture_output=True,
)
if result.stdout:
    print(result.stdout, end='' if result.stdout.endswith('\n') else '\n')
if result.stderr:
    print(result.stderr, end='' if result.stderr.endswith('\n') else '\n', file=sys.stderr)
if result.returncode != 0:
    print('HOME RENT PROTECTION: FAIL')
    sys.exit(result.returncode)

print('固定費の自動支払い可能額・全額/一部支払い・生活費留保と、自宅家賃の15日判定・二重請求防止・開始30日猶予・未払い累積・履歴/朝メッセージ上限・通知を現在の挙動のまま固定しました。')
print('HOME RENT PROTECTION: PASS')
