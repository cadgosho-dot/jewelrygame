#!/usr/bin/env python3
"""Verify the meal no-time-left message stays a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/meal-time-message.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function mealTimeUnavailableMessage() {
  return '今日は食事をする時間がありません。';
}"""
wrapper = """function mealTimeUnavailableMessage() {
  return mealTimeUnavailableText();
}"""

checks = {
    'versioned helper import exists': f"from './ui/meal-time-message.js?v={VERSION}';" in APP,
    'app keeps thin mealTimeUnavailableMessage wrapper': wrapper in APP,
    'legacy message implementation removed from app': legacy_function not in APP,
    'existing mealTimeUnavailableMessage references retained': APP.count('mealTimeUnavailableMessage(') == 3,
    'wrapper delegates once': APP.count('return mealTimeUnavailableText();') == 1,
    'helper exports message': 'export function mealTimeUnavailableText()' in HELPER,
    'exact Japanese message retained': "return '今日は食事をする時間がありません。';" in HELPER,
    'service worker precaches helper': f"./js/ui/meal-time-message.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'meal-time-message.js precache key'" in VS,
    'version sync knows helper import': "'meal-time-message.js import key'" in VS,
    'current audit registers checker': "'食事時間不足メッセージ'" in CURRENT and 'check-meal-time-message.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/',
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

unit = subprocess.run(['node', 'tools/test-meal-time-message.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('meal time message unit test')

if failed:
    print('\nMEAL TIME MESSAGE INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nMEAL TIME MESSAGE INTEGRATION: PASS')
print('食事をする時間が残っていない場合の表示文言だけをUI helperへ分離し、時間判定・空腹度・所持金・食事処理・画面遷移はapp.js側に維持しています。')
