#!/usr/bin/env python3
"""Verify metal-market timestamp formatting stays a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/metal-price-date-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function metalPriceDateLabel(value) {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}"""
wrapper = """function metalPriceDateLabel(value) {
  return formatMetalPriceDateLabel(value);
}"""

checks = {
    'versioned helper import exists': f"from './ui/metal-price-date-label.js?v={VERSION}';" in APP,
    'app keeps thin metalPriceDateLabel wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'existing metalPriceDateLabel references retained': APP.count('metalPriceDateLabel(') == 3,
    'wrapper delegates once': APP.count('return formatMetalPriceDateLabel(value);') == 1,
    'helper exports formatter': 'export function formatMetalPriceDateLabel(value)' in HELPER,
    'helper keeps invalid-date fallback': "if (!Number.isFinite(date.getTime())) return '';" in HELPER,
    'helper keeps Japanese locale': "new Intl.DateTimeFormat('ja-JP'" in HELPER,
    'helper keeps JST timezone': "timeZone: 'Asia/Tokyo'" in HELPER,
    'helper keeps date fields': "year: 'numeric', month: 'numeric', day: 'numeric'" in HELPER,
    'helper keeps time fields': "hour: '2-digit', minute: '2-digit', hour12: false" in HELPER,
    'service worker precaches helper': f"./js/ui/metal-price-date-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'metal-price-date-label.js precache key'" in VS,
    'version sync knows helper import': "'metal-price-date-label.js import key'" in VS,
    'current audit registers checker': "'地金価格日時表示'" in CURRENT and 'check-metal-price-date-label.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'Math.random', 'metalMarket',
    'validSpotPrice', 'normalizeMetalHistory', 'applyMetalMarketData', 'advanceTime',
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

unit = subprocess.run(['node', 'tools/test-metal-price-date-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('metal price date label unit test')

if failed:
    print('\nMETAL PRICE DATE LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nMETAL PRICE DATE LABEL INTEGRATION: PASS')
print('地金相場の最終更新日時表示だけをUI helperへ分離し、価格・前日比・履歴・キャッシュ・売買・セーブ処理はapp.js側に維持しています。')
