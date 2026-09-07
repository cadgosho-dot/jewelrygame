#!/usr/bin/env python3
"""Protect the shared finance ledger helper without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-finance-ledger-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase40-sync-v010929.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


finance = section('addFinance')
append_token = 'state.finance.push({ id: uid(), day: state.game.day, label, income, expense });'
compact_token = 'compactFinanceHistory(state);'
income_token = 'state.daily.income += income;'
expense_token = 'state.daily.expense += expense;'
order_ok = all(token in finance for token in [append_token, compact_token, income_token, expense_token])
if order_ok:
    order_ok = finance.index(append_token) < finance.index(compact_token) < finance.index(income_token) < finance.index(expense_token)

checks = {
    'addFinance definition exists once': APP.count('function addFinance(') == 1,
    'default income and expense retained': 'function addFinance(label, income = 0, expense = 0) {' in finance,
    'finance row append retained': append_token in finance,
    'finance row uses generated id retained': 'id: uid()' in finance,
    'finance row records current game day retained': 'day: state.game.day' in finance,
    'finance row preserves label/income/expense retained': all(token in finance for token in ['label, income, expense', 'state.finance.push']),
    'finance history compaction retained': compact_token in finance,
    'daily income accumulation retained': income_token in finance,
    'daily expense accumulation retained': expense_token in finance,
    'append compact daily-total order retained': order_ok,
    'dynamic test extracts current production function': all(token in TEST for token in [
        "extractFunction('addFinance')",
        'vm.runInContext(source, ctx',
        'addFinance(',
    ]),
    'registered in audit or pending formal sync': 'check-finance-ledger-regression.py' in CURRENT or (SYNC.is_file() and 'check-finance-ledger-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testIncomeEntryRecordsCurrentDayAndDailyIncome',
    'testExpenseEntryRecordsCurrentDayAndDailyExpense',
    'testMixedEntryUpdatesBothDailyTotals',
    'testDefaultAmountsAreZeroAndTotalsStayUnchanged',
    'testCompactionRunsAfterEntryAppendBeforeDailyTotals',
    'testRepeatedEntriesUseDistinctIdsAndAccumulate',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('FINANCE LEDGER PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-finance-ledger-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('FINANCE LEDGER PROTECTION: PASS')
