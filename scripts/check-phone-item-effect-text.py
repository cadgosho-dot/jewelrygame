#!/usr/bin/env python3
"""Verify phone item effect feedback stays a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/phone-item-effect-text.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function phoneItemEffectText(item, beforeHunger, afterHunger) {
  if (Number(item?.effect?.hunger) > 0) return `空腹度 ${beforeHunger} → ${afterHunger}`;
  return '効果が発動しました。';
}"""
wrapper = """function phoneItemEffectText(item, beforeHunger, afterHunger) {
  return formatPhoneItemEffectText(item, beforeHunger, afterHunger);
}"""

checks = {
    'versioned helper import exists': f"from './ui/phone-item-effect-text.js?v={VERSION}';" in APP,
    'app keeps thin phoneItemEffectText wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'existing phoneItemEffectText references retained': APP.count('phoneItemEffectText(') == 2,
    'wrapper delegates once': APP.count('return formatPhoneItemEffectText(item, beforeHunger, afterHunger);') == 1,
    'helper exports formatter': 'export function formatPhoneItemEffectText(item, beforeHunger, afterHunger)' in HELPER,
    'helper keeps positive hunger condition': 'Number(item?.effect?.hunger) > 0' in HELPER,
    'helper keeps hunger transition text': '空腹度 ${beforeHunger} → ${afterHunger}' in HELPER,
    'helper keeps generic effect text': "return '効果が発動しました。';" in HELPER,
    'service worker precaches helper': f"./js/ui/phone-item-effect-text.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'phone-item-effect-text.js precache key'" in VS,
    'version sync knows helper import': "'phone-item-effect-text.js import key'" in VS,
    'current audit registers checker': "'スマホアイテム効果表示'" in CURRENT and 'check-phone-item-effect-text.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'Math.random', 'advanceTime',
    'adjust', 'remove', 'consume', 'useItem', 'hunger =', 'hunger +=', 'hunger -=',
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

unit = subprocess.run(['node', 'tools/test-phone-item-effect-text.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('phone item effect text unit test')

if failed:
    print('\nPHONE ITEM EFFECT TEXT INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nPHONE ITEM EFFECT TEXT INTEGRATION: PASS')
print('スマートフォンでアイテム使用後に出す効果表示文言だけをUI helperへ分離し、所持数・空腹度計算・アイテム効果発動・セーブ処理はapp.js側に維持しています。')
