#!/usr/bin/env python3
"""Verify metal-market date formatting stays a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/metal-market-date-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function metalMarketDateLabel(value, includeYear = true) {
  const match = String(value || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  if (!match) return '';
  const [, year, month, day] = match;
  return includeYear ? `${Number(year)}年${Number(month)}月${Number(day)}日` : `${Number(month)}月${Number(day)}日`;
}"""
wrapper = """function metalMarketDateLabel(value, includeYear = true) {
  return formatMetalMarketDateLabel(value, includeYear);
}"""

checks = {
    'versioned helper import exists': f"from './ui/metal-market-date-label.js?v={VERSION}';" in APP,
    'app keeps thin metalMarketDateLabel wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'existing metalMarketDateLabel references retained': APP.count('metalMarketDateLabel(') == 3,
    'wrapper delegates once': APP.count('return formatMetalMarketDateLabel(value, includeYear);') == 1,
    'helper exports formatter': 'export function formatMetalMarketDateLabel(value, includeYear = true)' in HELPER,
    'helper keeps strict date format': ".match(/^(\\d{4})-(\\d{2})-(\\d{2})$/)" in HELPER,
    'helper keeps invalid-date fallback': "if (!match) return '';" in HELPER,
    'helper keeps year-inclusive label': '`${Number(year)}年${Number(month)}月${Number(day)}日`' in HELPER,
    'helper keeps year-omitted label': '`${Number(month)}月${Number(day)}日`' in HELPER,
    'service worker precaches helper': f"./js/ui/metal-market-date-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'metal-market-date-label.js precache key'" in VS,
    'version sync knows helper import': "'metal-market-date-label.js import key'" in VS,
    'current audit registers checker': "'地金相場日付表示'" in CURRENT and 'check-metal-market-date-label.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'Math.random', 'gameDate',
    'advanceTime', 'canSpendMinutes', 'hunger', 'sleep', 'validSpotPrice',
    'normalizeMetalHistory', 'applyMetalMarketData',
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

unit = subprocess.run(['node', 'tools/test-metal-market-date-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('metal market date label unit test')

if failed:
    print('\nMETAL MARKET DATE LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nMETAL MARKET DATE LABEL INTEGRATION: PASS')
print('地金相場の日付表示変換だけをUI helperへ分離し、価格・前日比・履歴・キャッシュ・売買・セーブ処理はapp.js側に維持しています。')
