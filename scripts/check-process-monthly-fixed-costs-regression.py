#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-process-monthly-fixed-costs-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase17-sync-v010906.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''


def function_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    end = APP.find('\nfunction ', start + 1)
    return APP[start:end if end >= 0 else len(APP)]


monthly = function_body('function processMonthlyFixedCosts() {')

checks = [
    ('processMonthlyFixedCosts definition exists once', APP.count('function processMonthlyFixedCosts() {') == 1),
    ('current game date lookup retained', 'const today = gameDate();' in monthly),
    ('first day guard retained', 'if (today.getDate() !== 1) return null;' in monthly),
    ('previous month key retained', 'const targetKey = previousMonthKey(today);' in monthly),
    ('same month idempotency guard retained', 'if (state.business.lastProcessedMonth === targetKey) return null;' in monthly),
    ('game start date retained', 'const start = parseGameStartDate();' in monthly),
    ('previous month target date retained', 'new Date(today.getFullYear(), today.getMonth() - 1, 1, 12, 0, 0, 0)' in monthly),
    ('report initial shape retained', "const report = { month: targetKey, workshop: 0, rents: [], paid: 0, unpaid: 0 };" in monthly),
    ('workshop two month grace retained', 'monthIndex(targetDate) - monthIndex(start) >= 2' in monthly),
    ('workshop monthly cost retained', 'report.workshop = WORKSHOP_MONTHLY_COST;' in monthly),
    ('workshop fixed cost payment retained', 'payFixedCost(`${targetKey} 工房維持費`, WORKSHOP_MONTHLY_COST' in monthly),
    ('workshop unpaid accumulation retained', 'state.business.workshopUnpaid += unpaid;' in monthly),
    ('workshop suspension on unpaid retained', 'state.business.workshopSuspended = true;' in monthly),
    ('workshop paid/unpaid report totals retained', 'report.paid += result.paid;' in monthly and 'report.unpaid += result.unpaid;' in monthly),
    ('branch copy and number sort retained', "for (const branch of [...(state.store.branches || [])].sort((a, b) => Number(a.number) - Number(b.number)))" in monthly),
    ('branch contract date retained', 'const contractDate = gameDateForDay(branch.rentedDay || 1);' in monthly),
    ('store rent one month grace retained', 'if (monthIndex(targetDate) - monthIndex(contractDate) < 1) continue;' in monthly),
    ('store monthly rent lookup retained', 'const rent = storeMonthlyRent(Number(branch.number));' in monthly),
    ('store fixed cost payment retained', 'payFixedCost(`${targetKey} ${storeBranchLabel(branch.number)}家賃`, rent' in monthly),
    ('branch unpaid rent accumulation retained', 'branch.unpaidRent = Math.max(0, Number(branch.unpaidRent) || 0) + unpaid;' in monthly),
    ('branch suspension on unpaid retained', 'branch.suspended = true;' in monthly),
    ('rent report row retained', 'report.rents.push({ branchNumber: Number(branch.number), amount: rent, paid: result.paid, unpaid: result.unpaid });' in monthly),
    ('processed month marker retained', 'state.business.lastProcessedMonth = targetKey;' in monthly),
    ('monthly report append retained', 'state.business.monthlyReports.push(report);' in monthly),
    ('monthly reports bounded to 24 retained', 'state.business.monthlyReports = state.business.monthlyReports.slice(-24);' in monthly),
    ('unpaid summary retains living cash reserve', 'MIN_LIVING_CASH_RESERVE' in monthly and '未払いは${yen(report.unpaid)}です。' in monthly),
    ('paid summary retained', '`${targetKey}分の固定費 ${yen(report.paid)}を支払いました。`' in monthly),
    ('monthly notification retained', "addNotification('月初の固定費', summary, report.unpaid ? 'warning' : 'info');" in monthly),
    ('workshop morning payment message retained', '工房維持費 ${yen(report.workshop)}' in monthly and 'state.business.workshopUnpaid' in monthly),
    ('store rent totals retained', 'const rentTotal = report.rents.reduce((sum, row) => sum + row.amount, 0);' in monthly and 'const rentUnpaid = report.rents.reduce((sum, row) => sum + row.unpaid, 0);' in monthly),
    ('store rent morning payment message retained', '店舗家賃 ${yen(rentTotal)}' in monthly and '${yen(rentUnpaid)}が未払いです。' in monthly),
    ('morning messages bounded to 10 retained', 'state.tools.morningMessages = [...(state.tools.morningMessages || []), ...paymentMessages].slice(-10);' in monthly),
    ('report return retained', 'return report;' in monthly),
    ('no direct save introduced', 'saveGame(' not in monthly),
    ('dynamic harness extracts current function', "extractFunction('processMonthlyFixedCosts')" in TEST),
    ('non first day regression case', 'testNonFirstDayDoesNothing' in TEST),
    ('idempotency regression case', 'testAlreadyProcessedMonthDoesNothing' in TEST),
    ('successful processing regression case', 'testSuccessfulMonthlyProcessing' in TEST),
    ('grace period regression case', 'testGracePeriodsSkipCosts' in TEST),
    ('unpaid suspension regression case', 'testUnpaidCostsSuspendWorkshopAndStore' in TEST),
    ('bounded history regression case', 'testHistoryAndMorningMessageBounds' in TEST),
    ('current audit registration or sync registration', 'check-process-monthly-fixed-costs-regression.py' in CURRENT or 'check-process-monthly-fixed-costs-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('PROCESS MONTHLY FIXED COSTS PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-process-monthly-fixed-costs-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('processMonthlyFixedCosts() の月初判定・二重処理防止・工房維持費猶予・店舗家賃猶予・未払い停止・月次履歴・通知・朝メッセージ上限を固定しました。')
print('PROCESS MONTHLY FIXED COSTS PROTECTION: PASS')
