#!/usr/bin/env python3
from __future__ import annotations
import subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
HELPER = (ROOT / 'js/ui/artisan-title.js').read_text(encoding='utf-8')
SW = (ROOT / 'sw.js').read_text(encoding='utf-8')
VS = (ROOT / 'scripts/version-sync.py').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')

checks = {
    'versioned helper import': f"from './ui/artisan-title.js?v={VERSION}';" in APP,
    'active references retained': APP.count('artisanTitle(') == 4,
    'state default stays in app': 'function artisanTitle(level = state?.artisan?.level || 1)' in APP,
    'title table stays in app wrapper': 'return formatArtisanTitle(level, ARTISAN_LEVEL_TITLES);' in APP,
    'legacy normalization removed from app': 'Math.max(1, Math.min(20, Math.floor(Number(level) || 1)))' not in APP,
    'helper export': 'export function formatArtisanTitle(level, titles)' in HELPER,
    'helper normalization': 'Math.max(1, Math.min(20, Math.floor(Number(level) || 1)))' in HELPER,
    'helper title lookup': 'return titles[value] || titles[1];' in HELPER,
    'service worker precache': f"./js/ui/artisan-title.js?v={VERSION}" in SW,
    'version sync precache': "'artisan-title.js precache key'" in VS,
    'version sync import': "'artisan-title.js import key'" in VS,
    'current audit registration': "'職人称号表示'" in CURRENT and 'check-artisan-title.py' in CURRENT,
}
for forbidden in ('state.','state?.','ARTISAN_LEVEL_TITLES','ITEMS','GEMS','METALS','DESIGNS','saveGame','loadState','localStorage','sessionStorage','indexedDB','firebase','money','inventory','eventState','document.','window.','navigator.','Math.random','./assets/'):
    checks[f'helper independent: {forbidden}'] = forbidden not in HELPER

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

for source in (ROOT / 'js/app.js', ROOT / 'js/ui/artisan-title.js'):
    result = subprocess.run(['node', '--check', str(source)], cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        print(result.stderr, end='')
        failed.append(source.name + ' syntax')

unit = subprocess.run(['node', 'tools/test-artisan-title.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('unit test')

if failed:
    print('ARTISAN TITLE INTEGRATION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)
print('ARTISAN TITLE INTEGRATION: PASS')
