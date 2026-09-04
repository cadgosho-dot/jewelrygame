#!/usr/bin/env python3
"""Verify remaining-time text formatting stays a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/time-remaining-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function timeRemainingLabel(minutes) {
  const remaining = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(remaining / 60);
  const restMinutes = remaining % 60;
  if (hours > 0 && restMinutes > 0) return `あと${hours}時間${restMinutes}分`;
  if (hours > 0) return `あと${hours}時間`;
  return `あと${restMinutes}分`;
}"""
wrapper = """function timeRemainingLabel(minutes) {
  return formatTimeRemainingLabel(minutes);
}"""

checks = {
    'versioned helper import exists': f"from './ui/time-remaining-label.js?v={VERSION}';" in APP,
    'app keeps thin timeRemainingLabel wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'existing timeRemainingLabel references retained': APP.count('timeRemainingLabel(') == 3,
    'wrapper delegates once': APP.count('return formatTimeRemainingLabel(minutes);') == 1,
    'helper exports formatter': 'export function formatTimeRemainingLabel(minutes)' in HELPER,
    'helper keeps legacy numeric normalization': 'Math.max(0, Math.round(Number(minutes) || 0))' in HELPER,
    'helper keeps hour calculation': 'Math.floor(remaining / 60)' in HELPER,
    'helper keeps minute remainder': 'remaining % 60' in HELPER,
    'helper keeps mixed hour/minute label': 'あと${hours}時間${restMinutes}分' in HELPER,
    'helper keeps hour-only label': 'あと${hours}時間' in HELPER,
    'helper keeps minute-only label': 'あと${restMinutes}分' in HELPER,
    'service worker precaches helper': f"./js/ui/time-remaining-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'time-remaining-label.js precache key'" in VS,
    'version sync knows helper import': "'time-remaining-label.js import key'" in VS,
    'current audit registers checker': "'残り時間表示ラベル'" in CURRENT and 'check-time-remaining-label.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'Math.random', 'gameDate',
    'advanceTime', 'canSpendMinutes', 'hunger', 'sleep',
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

unit = subprocess.run(['node', 'tools/test-time-remaining-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('time remaining label unit test')

if failed:
    print('\nTIME REMAINING LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nTIME REMAINING LABEL INTEGRATION: PASS')
print('残り時間の表示文字列変換だけをUI helperへ分離し、ゲーム内時間・行動可否・日付・セーブ処理はapp.js側に維持しています。')
