#!/usr/bin/env python3
from __future__ import annotations
import subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
HELPER = (ROOT / 'js/ui/customer-preference-label.js').read_text(encoding='utf-8')
SW = (ROOT / 'sw.js').read_text(encoding='utf-8')
VS = (ROOT / 'scripts/version-sync.py').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
checks = {
    'versioned helper import': f"from './ui/customer-preference-label.js?v={VERSION}';" in APP,
    'active references retained': APP.count('customerPreferenceLabel(') == 2,
    'thin wrapper delegates': 'return formatCustomerPreferenceLabel(preference, resolvedName);' in APP,
    'explicit label path retained': 'if (preference.label) return formatCustomerPreferenceLabel(preference);' in APP,
    'metal lookup stays in app': 'METALS[preference.value]?.name' in APP,
    'design lookup stays in app': 'DESIGNS[preference.value]?.name' in APP,
    'gem lookup stays in app': 'GEMS[preference.value]?.name' in APP,
    'helper export': "export function formatCustomerPreferenceLabel(preference = {}, resolvedName = '')" in HELPER,
    'metal fallback': "resolvedName || '地金指定'" in HELPER,
    'design fallback': "resolvedName || 'デザイン指定'" in HELPER,
    'color fallback': "preference?.value || '色指定'" in HELPER,
    'gem fallback': "resolvedName || '石指定'" in HELPER,
    'service worker precache': f"./js/ui/customer-preference-label.js?v={VERSION}" in SW,
    'version sync precache': "'customer-preference-label.js precache key'" in VS,
    'version sync import': "'customer-preference-label.js import key'" in VS,
    'current audit registration': "'顧客希望表示'" in CURRENT and 'check-customer-preference-label.py' in CURRENT,
}
for forbidden in ('METALS','DESIGNS','GEMS','state.','saveGame','loadState','localStorage','sessionStorage','indexedDB','firebase','money','inventory','eventState','document.','window.','navigator.','Math.random','./assets/'):
    checks[f'helper independent: {forbidden}'] = forbidden not in HELPER
failed=[]
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok: failed.append(label)
for source in (ROOT / 'js/app.js', ROOT / 'js/ui/customer-preference-label.js'):
    result=subprocess.run(['node','--check',str(source)], cwd=ROOT, text=True, capture_output=True)
    if result.returncode: failed.append(source.name + ' syntax')
unit=subprocess.run(['node','tools/test-customer-preference-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode: failed.append('unit test')
if failed:
    print('CUSTOMER PREFERENCE LABEL INTEGRATION: FAIL')
    for label in failed: print('- ' + label)
    sys.exit(1)
print('CUSTOMER PREFERENCE LABEL INTEGRATION: PASS')
