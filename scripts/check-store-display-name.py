#!/usr/bin/env python3
from __future__ import annotations
import subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
HELPER = (ROOT / 'js/ui/store-display-name.js').read_text(encoding='utf-8')
SW = (ROOT / 'sw.js').read_text(encoding='utf-8')
VS = (ROOT / 'scripts/version-sync.py').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')

checks = {
    'versioned helper import': f"from './ui/store-display-name.js?v={VERSION}';" in APP,
    'active references retained': APP.count('storeDisplayName(') == 5,
    'state lookup stays in app': 'return formatStoreDisplayName(state?.store?.name);' in APP,
    'legacy trim removed from app': "const name = String(state?.store?.name || '').trim();" not in APP,
    'helper export': 'export function formatStoreDisplayName(name)' in HELPER,
    'helper trim': "const value = String(name || '').trim();" in HELPER,
    'helper fallback': "return value || '店舗';" in HELPER,
    'service worker precache': f"./js/ui/store-display-name.js?v={VERSION}" in SW,
    'version sync precache': "'store-display-name.js precache key'" in VS,
    'version sync import': "'store-display-name.js import key'" in VS,
    'current audit registration': "'店舗名表示'" in CURRENT and 'check-store-display-name.py' in CURRENT,
}
for forbidden in ('state.','state?.','ITEMS','GEMS','METALS','DESIGNS','saveGame','loadState','localStorage','sessionStorage','indexedDB','firebase','money','inventory','eventState','document.','window.','navigator.','Math.random','./assets/'):
    checks[f'helper independent: {forbidden}'] = forbidden not in HELPER

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

for source in (ROOT / 'js/app.js', ROOT / 'js/ui/store-display-name.js'):
    result = subprocess.run(['node', '--check', str(source)], cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        print(result.stderr, end='')
        failed.append(source.name + ' syntax')

unit = subprocess.run(['node', 'tools/test-store-display-name.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('unit test')

if failed:
    print('STORE DISPLAY NAME INTEGRATION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)
print('STORE DISPLAY NAME INTEGRATION: PASS')
