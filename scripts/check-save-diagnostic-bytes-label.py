#!/usr/bin/env python3
"""Verify save diagnostic byte-size display stays a pure UI helper."""
from __future__ import annotations
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/save-diagnostic-bytes-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'
APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function formatSaveDiagnosticBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return `${Math.round(bytes).toLocaleString('ja-JP')} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}"""
wrapper = """function formatSaveDiagnosticBytes(value) {
  return formatSaveDiagnosticBytesLabel(value);
}"""

checks = {
    'versioned helper import exists': f"from './ui/save-diagnostic-bytes-label.js?v={VERSION}';" in APP,
    'app keeps thin formatSaveDiagnosticBytes wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'formatSaveDiagnosticBytes remains referenced': APP.count('formatSaveDiagnosticBytes(') >= 2,
    'wrapper delegates once': APP.count('return formatSaveDiagnosticBytesLabel(value);') == 1,
    'helper exports formatter': 'export function formatSaveDiagnosticBytesLabel(value)' in HELPER,
    'helper keeps non-negative numeric normalization': 'Math.max(0, Number(value) || 0)' in HELPER,
    'helper keeps byte threshold': 'if (bytes < 1024)' in HELPER,
    'helper keeps rounded byte locale display': "Math.round(bytes).toLocaleString('ja-JP')" in HELPER,
    'helper keeps KB precision': "(bytes / 1024).toFixed(1)" in HELPER,
    'helper keeps MB precision': "(bytes / (1024 * 1024)).toFixed(2)" in HELPER,
    'service worker precaches helper': f"./js/ui/save-diagnostic-bytes-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'save-diagnostic-bytes-label.js precache key'" in VS,
    'version sync knows helper import': "'save-diagnostic-bytes-label.js import key'" in VS,
    'current audit registers checker': "'セーブ診断容量表示'" in CURRENT and 'check-save-diagnostic-bytes-label.py' in CURRENT,
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
unit = subprocess.run(['node', 'tools/test-save-diagnostic-bytes-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('save diagnostic bytes label unit test')
if failed:
    print('\nSAVE DIAGNOSTIC BYTES LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)
print('\nSAVE DIAGNOSTIC BYTES LABEL INTEGRATION: PASS')
print('セーブ容量診断の容量文字列だけをUI helperへ分離し、保存・復元・クラウド同期・IndexedDB・容量計測処理はapp.js側に維持しています。')
