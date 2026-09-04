#!/usr/bin/env python3
"""Verify workshop loose-name formatting stays a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/workshop-loose-display-name.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function workshopLooseDisplayName(gem, shape) {
  if (!gem) return 'ルース';
  if (gem.originalLoose) return gem.name;
  if (gem.id === 'pearl') return gem.name;
  return `${gem.name}・${shape?.name || ''}`;
}"""
wrapper = """function workshopLooseDisplayName(gem, shape) {
  return formatWorkshopLooseDisplayName(gem, shape);
}"""

checks = {
    'versioned helper import exists': f"from './ui/workshop-loose-display-name.js?v={VERSION}';" in APP,
    'app keeps thin workshopLooseDisplayName wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'existing workshopLooseDisplayName references retained': APP.count('workshopLooseDisplayName(') == 2,
    'wrapper delegates once': APP.count('return formatWorkshopLooseDisplayName(gem, shape);') == 1,
    'helper exports formatter': 'export function formatWorkshopLooseDisplayName(gem, shape)' in HELPER,
    'helper keeps missing-gem fallback': "if (!gem) return 'ルース';" in HELPER,
    'helper keeps original-loose name': 'if (gem.originalLoose) return gem.name;' in HELPER,
    'helper keeps pearl name': "if (gem.id === 'pearl') return gem.name;" in HELPER,
    'helper keeps normal gem-shape label': "return `${gem.name}・${shape?.name || ''}`;" in HELPER,
    'service worker precaches helper': f"./js/ui/workshop-loose-display-name.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'workshop-loose-display-name.js precache key'" in VS,
    'version sync knows helper import': "'workshop-loose-display-name.js import key'" in VS,
    'current audit registers checker': "'工房ルース表示名'" in CURRENT and 'check-workshop-loose-display-name.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'Math.random', 'gameDate',
    'advanceTime', 'canSpendMinutes', 'hunger', 'sleep', 'GEMS', 'LOOSE_SHAPES',
    'looseOwned', 'looseReservedQuantity', 'adjustLooseInventory',
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

unit = subprocess.run(['node', 'tools/test-workshop-loose-display-name.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('workshop loose display name unit test')

if failed:
    print('\nWORKSHOP LOOSE DISPLAY NAME INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nWORKSHOP LOOSE DISPLAY NAME INTEGRATION: PASS')
print('工房ルース一覧の表示名変換だけをUI helperへ分離し、ルース定義・在庫・予約・制作・価格・セーブ処理はapp.js側に維持しています。')
