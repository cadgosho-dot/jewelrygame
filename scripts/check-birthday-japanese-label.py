#!/usr/bin/env python3
"""Verify birthday Japanese display stays a pure UI helper."""
from __future__ import annotations
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/birthday-japanese-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'
APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function birthdayJapaneseLabel(value = configuredBirthday()) {
  const birthday = normalizeBirthday(value);
  if (!birthday) return '';
  return `${Number(birthday.slice(0, 2))}月${Number(birthday.slice(3, 5))}日`;
}"""
wrapper = """function birthdayJapaneseLabel(value = configuredBirthday()) {
  return formatBirthdayJapaneseLabel(normalizeBirthday(value));
}"""

checks = {
    'versioned helper import exists': f"from './ui/birthday-japanese-label.js?v={VERSION}';" in APP,
    'app keeps thin birthdayJapaneseLabel wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'birthdayJapaneseLabel remains actively referenced': APP.count('birthdayJapaneseLabel(') >= 3,
    'normalization remains in app wrapper': 'formatBirthdayJapaneseLabel(normalizeBirthday(value))' in APP,
    'wrapper delegates once': APP.count('return formatBirthdayJapaneseLabel(normalizeBirthday(value));') == 1,
    'helper exports formatter': 'export function formatBirthdayJapaneseLabel(birthday)' in HELPER,
    'helper keeps empty-label rule': "if (!birthday) return '';" in HELPER,
    'helper keeps month/day display': '月${Number(birthday.slice(3, 5))}日' in HELPER,
    'service worker precaches helper': f"./js/ui/birthday-japanese-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'birthday-japanese-label.js precache key'" in VS,
    'version sync knows helper import': "'birthday-japanese-label.js import key'" in VS,
    'current audit registers checker': "'誕生日日本語表示'" in CURRENT and 'check-birthday-japanese-label.py' in CURRENT,
}
for forbidden in (
    'state.', 'state =', 'configuredBirthday', 'normalizeBirthday', 'saveGame', 'loadState',
    'localStorage', 'sessionStorage', 'indexedDB', 'firebase', 'money', 'inventory',
    'eventState', 'screenData', 'document.', 'window.', 'navigator.', 'setTimeout',
    'setInterval', './assets/', 'Math.random', 'advanceTime', 'delete', 'write', 'cloud',
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
unit = subprocess.run(['node', 'tools/test-birthday-japanese-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('birthday Japanese label unit test')
if failed:
    print('\nBIRTHDAY JAPANESE LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)
print('\nBIRTHDAY JAPANESE LABEL INTEGRATION: PASS')
print('誕生日の正規化はapp.js側に維持し、正規化済みMM-DDをM月D日へ変える表示処理だけをUI helperへ分離しています。')
