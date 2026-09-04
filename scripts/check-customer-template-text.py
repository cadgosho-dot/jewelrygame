#!/usr/bin/env python3
from __future__ import annotations
import subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
HELPER = (ROOT / 'js/ui/customer-template-text.js').read_text(encoding='utf-8')
SW = (ROOT / 'sw.js').read_text(encoding='utf-8')
VS = (ROOT / 'scripts/version-sync.py').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')

checks = {
    'versioned helper import': f"from './ui/customer-template-text.js?v={VERSION}';" in APP,
    'active references retained': APP.count('customerTemplateText(') == 4,
    'item lookup stays in app': "const itemLabel = ITEMS[request.item]?.name || 'ジュエリー';" in APP,
    'wrapper delegates': 'return formatCustomerTemplateText(template, itemLabel);' in APP,
    'legacy replace removed from app': "return String(template || '').replace(/\{item\}/g, itemLabel);" not in APP,
    'helper export': "export function formatCustomerTemplateText(template, itemLabel = 'ジュエリー')" in HELPER,
    'helper replacement': "String(template || '').replace(/\{item\}/g, itemLabel)" in HELPER,
    'service worker precache': f"./js/ui/customer-template-text.js?v={VERSION}" in SW,
    'version sync precache': "'customer-template-text.js precache key'" in VS,
    'version sync import': "'customer-template-text.js import key'" in VS,
    'current audit registration': "'顧客テンプレート表示'" in CURRENT and 'check-customer-template-text.py' in CURRENT,
}
for forbidden in ('ITEMS','GEMS','METALS','DESIGNS','state.','saveGame','loadState','localStorage','sessionStorage','indexedDB','firebase','money','inventory','eventState','document.','window.','navigator.','Math.random','./assets/'):
    checks[f'helper independent: {forbidden}'] = forbidden not in HELPER

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

for source in (ROOT / 'js/app.js', ROOT / 'js/ui/customer-template-text.js'):
    result = subprocess.run(['node', '--check', str(source)], cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        print(result.stderr, end='')
        failed.append(source.name + ' syntax')

unit = subprocess.run(['node', 'tools/test-customer-template-text.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('unit test')

if failed:
    print('CUSTOMER TEMPLATE TEXT INTEGRATION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)
print('CUSTOMER TEMPLATE TEXT INTEGRATION: PASS')
