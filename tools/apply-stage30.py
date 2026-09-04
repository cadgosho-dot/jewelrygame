#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one anchor, found {count}: {old[:80]!r}')
    write(path, text.replace(old, new, 1))


def write_new(path: str, text: str) -> None:
    target = ROOT / path
    if target.exists():
        raise SystemExit(f'{path}: already exists')
    target.write_text(text, encoding='utf-8')


if read('VERSION').strip() != '0.10.877':
    raise SystemExit('Stage 30 must start from VERSION 0.10.877')

helper = """export function formatSaveDiagnosticCapacityLabel(projectedCount, maxCount) {
  if (maxCount <= 0) return '確認不能';
  if (projectedCount > maxCount) return 'クラウド上限超過';
  if (projectedCount === maxCount) return '上限付近';
  if (projectedCount >= Math.ceil(maxCount * 0.8)) return '注意';
  return '余裕あり';
}
"""
write_new('js/ui/save-diagnostic-capacity-label.js', helper)

app_import_anchor = "import { formatSaveDiagnosticBytesLabel } from './ui/save-diagnostic-bytes-label.js?v=0.10.877';"
app_import_new = app_import_anchor + "\nimport { formatSaveDiagnosticCapacityLabel } from './ui/save-diagnostic-capacity-label.js?v=0.10.877';"
replace_once('js/app.js', app_import_anchor, app_import_new)

legacy = """function saveDiagnosticsCapacityLabel(projectedCount, maxCount) {
  if (maxCount <= 0) return '確認不能';
  if (projectedCount > maxCount) return 'クラウド上限超過';
  if (projectedCount === maxCount) return '上限付近';
  if (projectedCount >= Math.ceil(maxCount * 0.8)) return '注意';
  return '余裕あり';
}"""
wrapper = """function saveDiagnosticsCapacityLabel(projectedCount, maxCount) {
  return formatSaveDiagnosticCapacityLabel(projectedCount, maxCount);
}"""
replace_once('js/app.js', legacy, wrapper)

sw_anchor = "  './js/ui/save-diagnostic-bytes-label.js?v=0.10.877',"
sw_new = sw_anchor + "\n  './js/ui/save-diagnostic-capacity-label.js?v=0.10.877',"
replace_once('sw.js', sw_anchor, sw_new)

vs_precache_anchor = "    Rule('sw.js', 'save-diagnostic-bytes-label.js precache key', qparam(r'\\./js/ui/save-diagnostic-bytes-label\\.js'), keep_prefix),"
vs_precache_new = vs_precache_anchor + "\n    Rule('sw.js', 'save-diagnostic-capacity-label.js precache key', qparam(r'\\./js/ui/save-diagnostic-capacity-label\\.js'), keep_prefix),"
replace_once('scripts/version-sync.py', vs_precache_anchor, vs_precache_new)

vs_import_anchor = "    Rule('js/app.js', 'save-diagnostic-bytes-label.js import key', qparam(r'\\./ui/save-diagnostic-bytes-label\\.js'), keep_prefix),"
vs_import_new = vs_import_anchor + "\n    Rule('js/app.js', 'save-diagnostic-capacity-label.js import key', qparam(r'\\./ui/save-diagnostic-capacity-label\\.js'), keep_prefix),"
replace_once('scripts/version-sync.py', vs_import_anchor, vs_import_new)

current_anchor = "    ('セーブ診断容量表示', [sys.executable, str(ROOT / 'scripts/check-save-diagnostic-bytes-label.py')]),"
current_new = current_anchor + "\n    ('セーブ診断容量判定表示', [sys.executable, str(ROOT / 'scripts/check-save-diagnostic-capacity-label.py')]),"
replace_once('scripts/check-current.py', current_anchor, current_new)

unit_test = """import assert from 'node:assert/strict';
import { formatSaveDiagnosticCapacityLabel } from '../js/ui/save-diagnostic-capacity-label.js';

assert.equal(formatSaveDiagnosticCapacityLabel(0, 0), '確認不能');
assert.equal(formatSaveDiagnosticCapacityLabel(1, -1), '確認不能');
assert.equal(formatSaveDiagnosticCapacityLabel(0, 10), '余裕あり');
assert.equal(formatSaveDiagnosticCapacityLabel(7, 10), '余裕あり');
assert.equal(formatSaveDiagnosticCapacityLabel(8, 10), '注意');
assert.equal(formatSaveDiagnosticCapacityLabel(9, 10), '注意');
assert.equal(formatSaveDiagnosticCapacityLabel(10, 10), '上限付近');
assert.equal(formatSaveDiagnosticCapacityLabel(11, 10), 'クラウド上限超過');
assert.equal(formatSaveDiagnosticCapacityLabel('8', '10'), '注意');
console.log('SAVE DIAGNOSTIC CAPACITY LABEL UNIT: PASS');
"""
write_new('tools/test-save-diagnostic-capacity-label.mjs', unit_test)

integration = '''#!/usr/bin/env python3
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
'''
write_new('scripts/check-save-diagnostic-capacity-label.py', integration)

changelog_entry = """## v0.10.878
- セーブ容量診断の容量判定表示だけを `js/ui/save-diagnostic-capacity-label.js` へ分離。
- 既存 `saveDiagnosticsCapacityLabel()` は薄いラッパーとして残し、「確認不能」「クラウド上限超過」「上限付近」「注意」「余裕あり」の既存判定規則を維持。
- セーブ作成・復元・クラウド同期・IndexedDB・容量計測・所持金・在庫・イベント・画像には変更なし。
- 新UI helperをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。
"""
replace_once('CHANGELOG.md', '## v0.10.877\n', changelog_entry + '## v0.10.877\n')

subprocess.run(['python3', 'scripts/version-sync.py', '--set', '0.10.878'], cwd=ROOT, check=True)
print('STAGE 30 APPLY: PASS')
