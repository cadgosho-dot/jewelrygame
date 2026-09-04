#!/usr/bin/env python3
from __future__ import annotations
import subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
HELPER = (ROOT / 'js/ui/loose-display-label.js').read_text(encoding='utf-8')
SW = (ROOT / 'sw.js').read_text(encoding='utf-8')
VS = (ROOT / 'scripts/version-sync.py').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')

checks = {
    'versioned helper import': f"from './ui/loose-display-label.js?v={VERSION}';" in APP,
    'active references retained': APP.count('looseDisplayLabel(') == 19,
    'gem lookup stays in app': "const gemName = GEMS[gemId]?.name || 'ルース';" in APP,
    'shape lookup stays in app': "const shapeLabel = gemId === 'pearl' ? '' : looseShapeLabel(shapeId);" in APP,
    'thin wrapper delegates': 'return formatLooseDisplayLabel(gemId, gemName, shapeLabel, { suffix });' in APP,
    'legacy pearl formatting removed from app': "if (gemId === 'pearl') return `${gemName}${suffix ? 'ルース' : ''}`;" not in APP,
    'helper export': 'export function formatLooseDisplayLabel(gemId, gemName, shapeLabel, { suffix = false } = {})' in HELPER,
    'helper pearl rule': "if (gemId === 'pearl') return `${gemName}${suffix ? 'ルース' : ''}`;" in HELPER,
    'helper shaped rule': "return `${gemName}・${shapeLabel}${suffix ? 'ルース' : ''}`;" in HELPER,
    'service worker precache': f"./js/ui/loose-display-label.js?v={VERSION}" in SW,
    'version sync precache': "'loose-display-label.js precache key'" in VS,
    'version sync import': "'loose-display-label.js import key'" in VS,
    'current audit registration': "'ルース表示名'" in CURRENT and 'check-loose-display-label.py' in CURRENT,
}
for forbidden in ('state.','state?.','GEMS','LOOSE_SHAPES','looseShapeLabel','ITEMS','METALS','DESIGNS','saveGame','loadState','localStorage','sessionStorage','indexedDB','firebase','money','inventory','eventState','document.','window.','navigator.','Math.random','./assets/'):
    checks[f'helper independent: {forbidden}'] = forbidden not in HELPER

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

for source in (ROOT / 'js/app.js', ROOT / 'js/ui/loose-display-label.js'):
    result = subprocess.run(['node', '--check', str(source)], cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        print(result.stderr, end='')
        failed.append(source.name + ' syntax')

unit = subprocess.run(['node', 'tools/test-loose-display-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('unit test')

if failed:
    print('LOOSE DISPLAY LABEL INTEGRATION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)
print('LOOSE DISPLAY LABEL INTEGRATION: PASS')
