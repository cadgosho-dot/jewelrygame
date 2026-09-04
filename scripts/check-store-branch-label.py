#!/usr/bin/env python3
"""Verify store branch label formatting stays isolated and behavior-compatible."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/store-branch-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function storeBranchLabel(number = 1) {
  const branchNumber = Math.max(1, Number(number) || 1);
  return `店舗${branchNumber}`;
}"""
wrapper = """function storeBranchLabel(number = 1) {
  return formatStoreBranchLabel(number);
}"""

checks = {
    'versioned helper import exists': f"from './ui/store-branch-label.js?v={VERSION}';" in APP,
    'app keeps thin storeBranchLabel wrapper': wrapper in APP,
    'legacy storeBranchLabel implementation removed from app': legacy_function not in APP,
    'existing storeBranchLabel references retained': APP.count('storeBranchLabel(') == 30,
    'wrapper delegates once': APP.count('return formatStoreBranchLabel(number);') == 1,
    'helper exports formatter': 'export function formatStoreBranchLabel(number = 1)' in HELPER,
    'minimum branch number behavior retained': 'Math.max(1, Number(number) || 1)' in HELPER,
    'Japanese label format retained': 'return `店舗${branchNumber}`;' in HELPER,
    'service worker precaches helper': f"./js/ui/store-branch-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'store-branch-label.js precache key'" in VS,
    'version sync knows helper import': "'store-branch-label.js import key'" in VS,
    'current audit registers checker': "'店舗番号表示ラベル'" in CURRENT and 'check-store-branch-label.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.', './assets/',
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

unit = subprocess.run(['node', 'tools/test-store-branch-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('store branch label unit test')

if failed:
    print('\nSTORE BRANCH LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nSTORE BRANCH LABEL INTEGRATION: PASS')
print('店舗番号の表示文字列変換だけをUI helperへ分離し、店舗状態・所持金・在庫・販売・画面遷移はapp.js側に維持しています。')
