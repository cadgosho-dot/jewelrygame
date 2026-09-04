#!/usr/bin/env python3
"""Verify craft surface UI mapping helpers stay isolated and behavior-compatible."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/craft-surface.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

checks = {
    'versioned helper import exists': f"from './ui/craft-surface.js?v={VERSION}';" in APP,
    'legacy craftSurfaceParts removed from app': 'function craftSurfaceParts(' not in APP,
    'legacy craftSurfaceFinishId removed from app': 'function craftSurfaceFinishId(' not in APP,
    'craftSurfaceParts existing call sites retained': APP.count('craftSurfaceParts(') == 2,
    'craftSurfaceFinishId existing call sites retained': APP.count('craftSurfaceFinishId(') == 2,
    'craft choice render still decodes surface': 'const surface = craftSurfaceParts(current);' in APP,
    'craft click handler still decodes draft finish': 'const current = craftSurfaceParts(craftDraft.finish);' in APP,
    'mirror/matte decorated toggle still encodes finish': 'craftDraft.finish = craftSurfaceFinishId(base, current.decorated);' in APP,
    'helper exports decoder': 'export function craftSurfaceParts(' in HELPER,
    'helper exports encoder': 'export function craftSurfaceFinishId(' in HELPER,
    'service worker precaches helper': f"./js/ui/craft-surface.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'craft-surface.js precache key'" in VS,
    'version sync knows helper import': "'craft-surface.js import key'" in VS,
    'current audit registers checker': "'表面仕上げUI変換'" in CURRENT and 'check-craft-surface.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'document.', 'window.',
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

unit = subprocess.run(['node', 'tools/test-craft-surface.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('craft surface unit test')

if failed:
    print('\nCRAFT SURFACE INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nCRAFT SURFACE INTEGRATION: PASS')
print('鏡面・つや消し・装飾ありのID相互変換だけをUI helperへ分離し、制作draft・保存・完成品生成はapp.js側に維持しています。')
