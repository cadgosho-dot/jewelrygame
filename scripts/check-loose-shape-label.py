#!/usr/bin/env python3
"""Verify loose-stone cut display labels stay a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/loose-shape-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function looseShapeLabel(shapeId) {
  return LOOSE_SHAPES[shapeId]?.name || shapeId || 'カット不明';
}"""
wrapper = """function looseShapeLabel(shapeId) {
  return formatLooseShapeLabel(shapeId, LOOSE_SHAPES);
}"""

checks = {
    'versioned helper import exists': f"from './ui/loose-shape-label.js?v={VERSION}';" in APP,
    'app keeps thin looseShapeLabel wrapper': wrapper in APP,
    'legacy label implementation removed from app': legacy_function not in APP,
    'existing looseShapeLabel references retained': APP.count('looseShapeLabel(') == 10,
    'wrapper delegates once': APP.count('return formatLooseShapeLabel(shapeId, LOOSE_SHAPES);') == 1,
    'helper exports formatter': 'export function formatLooseShapeLabel(shapeId, shapes)' in HELPER,
    'exact legacy fallback rule retained': "return shapes[shapeId]?.name || shapeId || 'カット不明';" in HELPER,
    'service worker precaches helper': f"./js/ui/loose-shape-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'loose-shape-label.js precache key'" in VS,
    'version sync knows helper import': "'loose-shape-label.js import key'" in VS,
    'current audit registers checker': "'ルースカット表示ラベル'" in CURRENT and 'check-loose-shape-label.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'GEMS', 'LOOSE_SHAPES',
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

unit = subprocess.run(['node', 'tools/test-loose-shape-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('loose shape label unit test')

if failed:
    print('\nLOOSE SHAPE LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nLOOSE SHAPE LABEL INTEGRATION: PASS')
print('ルースのカット名表示文字列だけをUI helperへ分離し、LOOSE_SHAPESデータ・在庫・制作・販売処理はapp.js側に維持しています。')
