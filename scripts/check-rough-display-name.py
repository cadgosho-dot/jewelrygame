#!/usr/bin/env python3
"""Verify rough gemstone display-name formatting stays a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/rough-display-name.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function roughDisplayName(id) {
  const gem = GEMS[id];
  return gem?.roughName || (gem ? `${gem.name}原石` : '原石');
}"""
wrapper = """function roughDisplayName(id) {
  return formatRoughDisplayName(id, GEMS);
}"""

checks = {
    'versioned helper import exists': f"from './ui/rough-display-name.js?v={VERSION}';" in APP,
    'app keeps thin roughDisplayName wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'existing roughDisplayName references retained': APP.count('roughDisplayName(') == 11,
    'wrapper delegates once': APP.count('return formatRoughDisplayName(id, GEMS);') == 1,
    'helper exports formatter': 'export function formatRoughDisplayName(id, gems)' in HELPER,
    'helper keeps exact map lookup': 'const gem = gems[id];' in HELPER,
    'helper keeps roughName/name fallback': "return gem?.roughName || (gem ? `${gem.name}原石` : '原石');" in HELPER,
    'service worker precaches helper': f"./js/ui/rough-display-name.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'rough-display-name.js precache key'" in VS,
    'version sync knows helper import': "'rough-display-name.js import key'" in VS,
    'current audit registers checker': "'原石表示ラベル'" in CURRENT and 'check-rough-display-name.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'Math.random',
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

unit = subprocess.run(['node', 'tools/test-rough-display-name.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('rough display name unit test')

if failed:
    print('\nROUGH DISPLAY NAME INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nROUGH DISPLAY NAME INTEGRATION: PASS')
print('原石の表示名変換だけをUI helperへ分離し、GEMSデータ・所持数・採掘・研磨・価格・販売・セーブはapp.js側に維持しています。')
