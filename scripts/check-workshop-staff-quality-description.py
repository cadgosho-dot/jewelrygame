#!/usr/bin/env python3
"""Verify workshop-staff quality text stays a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/workshop-staff-quality-description.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function workshopStaffQualityDescription(definition = workshopStaffDefinition()) {
  const good = Math.round((Number(definition?.goodChance) || 0) * 100);
  const premium = Math.round((Number(definition?.premiumChance) || 0) * 100);
  if (!good && !premium) return '品質：標準のみ';
  return `品質：良品${good}%${premium ? `・上質${premium}%` : ''}`;
}"""
wrapper = """function workshopStaffQualityDescription(definition = workshopStaffDefinition()) {
  return formatWorkshopStaffQualityDescription(definition);
}"""

checks = {
    'versioned helper import exists': f"from './ui/workshop-staff-quality-description.js?v={VERSION}';" in APP,
    'app keeps thin workshopStaffQualityDescription wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'existing workshopStaffQualityDescription references retained': APP.count('workshopStaffQualityDescription(') == 2,
    'wrapper delegates once': APP.count('return formatWorkshopStaffQualityDescription(definition);') == 1,
    'helper exports formatter': 'export function formatWorkshopStaffQualityDescription(definition)' in HELPER,
    'helper keeps good percentage rounding': 'Math.round((Number(definition?.goodChance) || 0) * 100)' in HELPER,
    'helper keeps premium percentage rounding': 'Math.round((Number(definition?.premiumChance) || 0) * 100)' in HELPER,
    'helper keeps standard-only fallback': "if (!good && !premium) return '品質：標準のみ';" in HELPER,
    'helper keeps good and premium label': '品質：良品${good}%${premium ? `・上質${premium}%` : \'\'}' in HELPER,
    'service worker precaches helper': f"./js/ui/workshop-staff-quality-description.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'workshop-staff-quality-description.js precache key'" in VS,
    'version sync knows helper import': "'workshop-staff-quality-description.js import key'" in VS,
    'current audit registers checker': "'工房スタッフ品質説明'" in CURRENT and 'check-workshop-staff-quality-description.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'Math.random', 'gameDate',
    'advanceTime', 'canSpendMinutes', 'hunger', 'sleep', 'workshopStaffDefinition',
    'workshopStaffQualityRoll', 'workshopStaffGrowthForWorkDays',
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

unit = subprocess.run(['node', 'tools/test-workshop-staff-quality-description.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('workshop staff quality description unit test')

if failed:
    print('\nWORKSHOP STAFF QUALITY DESCRIPTION INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nWORKSHOP STAFF QUALITY DESCRIPTION INTEGRATION: PASS')
print('工房スタッフの品質確率を説明文へ変換する表示処理だけをUI helperへ分離し、品質抽選・制作結果・スタッフ成長処理はapp.js側に維持しています。')
