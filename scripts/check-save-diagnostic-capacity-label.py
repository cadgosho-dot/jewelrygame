#!/usr/bin/env python3
"""Verify save diagnostic capacity judgement stays a pure UI helper."""
from __future__ import annotations
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/save-diagnostic-capacity-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'
APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function saveDiagnosticsCapacityLabel(projectedCount, maxCount) {
  if (maxCount <= 0) return '確認不能';
  if (projectedCount > maxCount) return 'クラウド上限超過';
  if (projectedCount === maxCount) return '上限付近';
  if (projectedCount >= Math.ceil(maxCount * 0.8)) return '注意';
  return '余裕あり';
}"""
wrapper = """function saveDiagnosticsCapacityLabel(projectedCount, maxCount) {
  return formatSaveDiagnosticCapacityLabel(projectedCount, maxCount);
}"""

checks = {
    'versioned helper import exists': f"from './ui/save-diagnostic-capacity-label.js?v={VERSION}';" in APP,
    'app keeps thin saveDiagnosticsCapacityLabel wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'saveDiagnosticsCapacityLabel remains referenced': APP.count('saveDiagnosticsCapacityLabel(') >= 2,
    'wrapper delegates once': APP.count('return formatSaveDiagnosticCapacityLabel(projectedCount, maxCount);') == 1,
    'helper exports formatter': 'export function formatSaveDiagnosticCapacityLabel(projectedCount, maxCount)' in HELPER,
    'helper keeps invalid max rule': "if (maxCount <= 0) return '確認不能';" in HELPER,
    'helper keeps over-limit rule': "if (projectedCount > maxCount) return 'クラウド上限超過';" in HELPER,
    'helper keeps at-limit rule': "if (projectedCount === maxCount) return '上限付近';" in HELPER,
    'helper keeps 80 percent rule': "projectedCount >= Math.ceil(maxCount * 0.8)" in HELPER,
    'helper keeps warning label': "return '注意';" in HELPER,
    'helper keeps safe label': "return '余裕あり';" in HELPER,
    'service worker precaches helper': f"./js/ui/save-diagnostic-capacity-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'save-diagnostic-capacity-label.js precache key'" in VS,
    'version sync knows helper import': "'save-diagnostic-capacity-label.js import key'" in VS,
    'current audit registers checker': "'セーブ診断容量判定表示'" in CURRENT and 'check-save-diagnostic-capacity-label.py' in CURRENT,
}
for forbidden in (
    'state.', 'state =', 'saveGame', 'loadState', 'localStorage', 'sessionStorage', 'indexedDB',
    'firebase', 'money', 'inventory', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'Math.random', 'advanceTime',
    'delete', 'write', 'readIndexedDbSave', 'writeIndexedDbSave', 'cloud',
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
unit = subprocess.run(['node', 'tools/test-save-diagnostic-capacity-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('save diagnostic capacity label unit test')
if failed:
    print('\nSAVE DIAGNOSTIC CAPACITY LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)
print('\nSAVE DIAGNOSTIC CAPACITY LABEL INTEGRATION: PASS')
print('セーブ容量診断の容量判定文字列だけをUI helperへ分離し、保存・復元・クラウド同期・IndexedDB・容量計測処理はapp.js側に維持しています。')
