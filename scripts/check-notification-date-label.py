#!/usr/bin/env python3
"""Verify notification date display stays a pure UI helper."""
from __future__ import annotations
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/notification-date-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'
APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function notificationDateLabel(dayNumber) {
  const date = gameDateForDay(dayNumber);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}"""
wrapper = """function notificationDateLabel(dayNumber) {
  return formatNotificationDateLabel(gameDateForDay(dayNumber));
}"""

checks = {
    'versioned helper import exists': f"from './ui/notification-date-label.js?v={VERSION}';" in APP,
    'app keeps thin notificationDateLabel wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'notificationDateLabel remains actively referenced': APP.count('notificationDateLabel(') == 2,
    'game-date calculation remains in app wrapper': 'formatNotificationDateLabel(gameDateForDay(dayNumber))' in APP,
    'wrapper delegates once': APP.count('return formatNotificationDateLabel(gameDateForDay(dayNumber));') == 1,
    'helper exports formatter': 'export function formatNotificationDateLabel(date)' in HELPER,
    'helper keeps Japanese year/month/day display': '${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日' in HELPER,
    'service worker precaches helper': f"./js/ui/notification-date-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'notification-date-label.js precache key'" in VS,
    'version sync knows helper import': "'notification-date-label.js import key'" in VS,
    'current audit registers checker': "'通知日付表示'" in CURRENT and 'check-notification-date-label.py' in CURRENT,
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
unit = subprocess.run(['node', 'tools/test-notification-date-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('notification date label unit test')
if failed:
    print('\nNOTIFICATION DATE LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)
print('\nNOTIFICATION DATE LABEL INTEGRATION: PASS')
print('ゲーム内日付の算出はapp.js側に維持し、通知用Dateを日本語年月日表示へ変える処理だけをUI helperへ分離しています。')
