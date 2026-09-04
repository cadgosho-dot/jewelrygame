#!/usr/bin/env python3
"""Verify viewport UI-scale clamping stays isolated and behavior-compatible."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/viewport-clamp.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function clampViewportValue(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}"""
wrapper = """function clampViewportValue(value, min, max) {
  return clampViewportNumber(value, min, max);
}"""

checks = {
    'versioned helper import exists': f"from './ui/viewport-clamp.js?v={VERSION}';" in APP,
    'app keeps thin clampViewportValue wrapper': wrapper in APP,
    'legacy clamp implementation removed from app': legacy_function not in APP,
    'existing clampViewportValue references retained': APP.count('clampViewportValue(') == 2,
    'phone UI scale call retained': 'clampViewportValue(uiScale || (scaleAxis / 390), .84, 1.08)' in APP,
    'wrapper delegates once': APP.count('return clampViewportNumber(value, min, max);') == 1,
    'helper exports clamp': 'export function clampViewportNumber(value, min, max)' in HELPER,
    'legacy numeric fallback retained': 'Number(value) || min' in HELPER,
    'legacy min/max formula retained': 'Math.min(max, Math.max(min, Number(value) || min))' in HELPER,
    'service worker precaches helper': f"./js/ui/viewport-clamp.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'viewport-clamp.js precache key'" in VS,
    'version sync knows helper import': "'viewport-clamp.js import key'" in VS,
    'current audit registers checker': "'表示倍率クランプ'" in CURRENT and 'check-viewport-clamp.py' in CURRENT,
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

unit = subprocess.run(['node', 'tools/test-viewport-clamp.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('viewport clamp unit test')

if failed:
    print('\nVIEWPORT CLAMP INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nVIEWPORT CLAMP INTEGRATION: PASS')
print('端末表示倍率のmin/maxクランプだけをUI helperへ分離し、端末判定・DOM・画面遷移・セーブ・画像はapp.js側に維持しています。')
