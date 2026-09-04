#!/usr/bin/env python3
"""Verify finance-row date display stays a pure UI helper."""
from __future__ import annotations
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/finance-row-date-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'
APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function financeRowDateLabel(dayNumber) {
  const date = gameDateForDay(dayNumber);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}"""
wrapper = """function financeRowDateLabel(dayNumber) {
  return formatFinanceRowDateLabel(gameDateForDay(dayNumber));
}"""

checks = {
    'versioned helper import exists': f"from './ui/finance-row-date-label.js?v={VERSION}';" in APP,
    'app keeps thin financeRowDateLabel wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'financeRowDateLabel remains actively referenced': APP.count('financeRowDateLabel(') >= 2,
    'game-date calculation remains in app wrapper': 'formatFinanceRowDateLabel(gameDateForDay(dayNumber))' in APP,
    'wrapper delegates once': APP.count('return formatFinanceRowDateLabel(gameDateForDay(dayNumber));') == 1,
    'helper exports formatter': 'export function formatFinanceRowDateLabel(date)' in HELPER,
    'helper keeps Japanese month/day display': '`${date.getMonth() + 1}月${date.getDate()}日`' in HELPER,
    'service worker precaches helper': f"./js/ui/finance-row-date-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'finance-row-date-label.js precache key'" in VS,
    'version sync knows helper import': "'finance-row-date-label.js import key'" in VS,
    'current audit registers checker': "'収支履歴日付表示'" in CURRENT and 'check-finance-row-date-label.py' in CURRENT,
}
for forbidden in (
    'state.', 'state =', 'gameDateForDay', 'saveGame', 'loadState', 'localStorage',
    'sessionStorage', 'indexedDB', 'firebase', 'money', 'inventory', 'eventState',
    'screenData', 'document.', 'window.', 'navigator.', 'setTimeout', 'setInterval',
    './assets/', 'Math.random', 'advanceTime', 'delete', 'write', 'cloud',
):
    checks[f'helper has no reverse dependency: {forbidden}'] = forbidden not in HELPER

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
for source in (APP_PATH, HELPER_PATH):
    syntax = subprocess.run(['node', '--check', str(source)], cwd=ROOT, text=True, capture_output=True)
    if syntax.returncode:
        failed.append(f'{source.name} JavaScript syntax')
        print(syntax.stdout)
        print(syntax.stderr)
unit = subprocess.run(['node', 'tools/test-finance-row-date-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('finance row date label unit test')
if failed:
    print('\nFINANCE ROW DATE LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)
print('\nFINANCE ROW DATE LABEL INTEGRATION: PASS')
print('ゲーム内日付の算出はapp.js側に維持し、収支履歴用のDateをM月D日表示へ変える処理だけをUI helperへ分離しています。')
