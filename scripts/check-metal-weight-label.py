#!/usr/bin/env python3
"""Verify metal-weight formatting stays a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/metal-weight-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function metalWeightLabel(value) {
  const amount = roundedMetalWeight(value);
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
}"""
wrapper = """function metalWeightLabel(value) {
  return formatMetalWeightLabel(value);
}"""

checks = {
    'versioned helper import exists': f"from './ui/metal-weight-label.js?v={VERSION}';" in APP,
    'app keeps thin metalWeightLabel wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'existing metalWeightLabel references retained': APP.count('metalWeightLabel(') == 19,
    'wrapper delegates once': APP.count('return formatMetalWeightLabel(value);') == 1,
    'app keeps weight calculation function': 'function roundedMetalWeight(value)' in APP,
    'app keeps non-display weight calculations': APP.count('roundedMetalWeight(') == 16,
    'helper exports formatter': 'export function formatMetalWeightLabel(value)' in HELPER,
    'helper keeps tenth-gram rounding': 'Math.round(Math.max(0, Number(value) || 0) * 10) / 10' in HELPER,
    'helper keeps integer formatting': 'Number.isInteger(amount) ? String(amount)' in HELPER,
    'helper keeps one-decimal formatting': "amount.toFixed(1)" in HELPER,
    'service worker precaches helper': f"./js/ui/metal-weight-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'metal-weight-label.js precache key'" in VS,
    'version sync knows helper import': "'metal-weight-label.js import key'" in VS,
    'current audit registers checker': "'地金重量表示'" in CURRENT and 'check-metal-weight-label.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'Math.random', 'gameDate',
    'advanceTime', 'canSpendMinutes', 'hunger', 'sleep', 'roundedMetalWeight', 'metalOwnedWeight',
    'metalReservedWeight', 'metalAvailableWeight', 'materialRequirementsFor',
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

unit = subprocess.run(['node', 'tools/test-metal-weight-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('metal weight label unit test')

if failed:
    print('\nMETAL WEIGHT LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nMETAL WEIGHT LABEL INTEGRATION: PASS')
print('地金重量の表示変換だけをUI helperへ分離し、重量計算・在庫・予約・制作・売却・セーブ処理はapp.js側に維持しています。')
