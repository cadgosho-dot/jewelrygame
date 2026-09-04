#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
if VERSION != '0.10.866':
    raise SystemExit(f'Unexpected VERSION before stage19: {VERSION}')

app_path = ROOT / 'js/app.js'
app = app_path.read_text(encoding='utf-8')
legacy = """function looseShapeLabel(shapeId) {
  return LOOSE_SHAPES[shapeId]?.name || shapeId || 'カット不明';
}"""
wrapper = """function looseShapeLabel(shapeId) {
  return formatLooseShapeLabel(shapeId, LOOSE_SHAPES);
}"""
if app.count(legacy) != 1:
    raise SystemExit(f'legacy looseShapeLabel count mismatch: {app.count(legacy)}')
if app.count('looseShapeLabel(') != 10:
    raise SystemExit(f'looseShapeLabel reference count mismatch: {app.count("looseShapeLabel(")}')
if 'formatLooseShapeLabel' in app:
    raise SystemExit('formatLooseShapeLabel already exists in app.js')

meal_import_re = re.compile(r"(?m)^(import .*from './ui/meal-time-message\.js\?v=0\.10\.866';)$")
m = meal_import_re.search(app)
if not m:
    raise SystemExit('meal-time-message import anchor not found')
new_import = "import { formatLooseShapeLabel } from './ui/loose-shape-label.js?v=0.10.866';"
app = app[:m.end()] + '\n' + new_import + app[m.end():]
app = app.replace(legacy, wrapper, 1)
app_path.write_text(app, encoding='utf-8')

helper_path = ROOT / 'js/ui/loose-shape-label.js'
if helper_path.exists():
    raise SystemExit('helper already exists')
helper_path.write_text("""export function formatLooseShapeLabel(shapeId, shapes) {
  return shapes[shapeId]?.name || shapeId || 'カット不明';
}
""", encoding='utf-8')

test_path = ROOT / 'tools/test-loose-shape-label.mjs'
test_path.write_text("""import assert from 'node:assert/strict';
import { formatLooseShapeLabel } from '../js/ui/loose-shape-label.js';

const shapes = {
  round: { name: 'ラウンド' },
  oval: { name: 'オーバル' },
  empty: { name: '' },
  1: { name: '数値カット' },
};

assert.equal(formatLooseShapeLabel('round', shapes), 'ラウンド');
assert.equal(formatLooseShapeLabel('oval', shapes), 'オーバル');
assert.equal(formatLooseShapeLabel('unknown-shape', shapes), 'unknown-shape');
assert.equal(formatLooseShapeLabel('empty', shapes), 'empty');
assert.equal(formatLooseShapeLabel('', shapes), 'カット不明');
assert.equal(formatLooseShapeLabel(null, shapes), 'カット不明');
assert.equal(formatLooseShapeLabel(undefined, shapes), 'カット不明');
assert.equal(formatLooseShapeLabel(1, shapes), '数値カット');
assert.equal(formatLooseShapeLabel(0, shapes), 'カット不明');
console.log('LOOSE SHAPE LABEL TEST: PASS');
""", encoding='utf-8')

checker_path = ROOT / 'scripts/check-loose-shape-label.py'
checker_path.write_text(r'''#!/usr/bin/env python3
"""Verify loose-stone cut display labels stay a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/loose-shape-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function looseShapeLabel(shapeId) {
  return LOOSE_SHAPES[shapeId]?.name || shapeId || 'カット不明';
}"""
wrapper = """function looseShapeLabel(shapeId) {
  return formatLooseShapeLabel(shapeId, LOOSE_SHAPES);
}"""

checks = {
    'versioned helper import exists': f"from './ui/loose-shape-label.js?v={VERSION}';" in APP,
    'app keeps thin looseShapeLabel wrapper': wrapper in APP,
    'legacy label implementation removed from app': legacy_function not in APP,
    'existing looseShapeLabel references retained': APP.count('looseShapeLabel(') == 10,
    'wrapper delegates once': APP.count('return formatLooseShapeLabel(shapeId, LOOSE_SHAPES);') == 1,
    'helper exports formatter': 'export function formatLooseShapeLabel(shapeId, shapes)' in HELPER,
    'exact legacy fallback rule retained': "return shapes[shapeId]?.name || shapeId || 'カット不明';" in HELPER,
    'service worker precaches helper': f"./js/ui/loose-shape-label.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'loose-shape-label.js precache key'" in VS,
    'version sync knows helper import': "'loose-shape-label.js import key'" in VS,
    'current audit registers checker': "'ルースカット表示ラベル'" in CURRENT and 'check-loose-shape-label.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'GEMS', 'LOOSE_SHAPES',
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

unit = subprocess.run(['node', 'tools/test-loose-shape-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('loose shape label unit test')

if failed:
    print('\nLOOSE SHAPE LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nLOOSE SHAPE LABEL INTEGRATION: PASS')
print('ルースのカット名表示文字列だけをUI helperへ分離し、LOOSE_SHAPESデータ・在庫・制作・販売処理はapp.js側に維持しています。')
''', encoding='utf-8')

sw_path = ROOT / 'sw.js'
sw = sw_path.read_text(encoding='utf-8')
sw_anchor = "  './js/ui/meal-time-message.js?v=0.10.866',"
if sw.count(sw_anchor) != 1:
    raise SystemExit(f'sw anchor count mismatch: {sw.count(sw_anchor)}')
sw = sw.replace(sw_anchor, sw_anchor + "\n  './js/ui/loose-shape-label.js?v=0.10.866',", 1)
sw_path.write_text(sw, encoding='utf-8')

vs_path = ROOT / 'scripts/version-sync.py'
vs = vs_path.read_text(encoding='utf-8')
precache_anchor = "    Rule('sw.js', 'meal-time-message.js precache key', qparam(r'\\./js/ui/meal-time-message\\.js'), keep_prefix),"
import_anchor = "    Rule('js/app.js', 'meal-time-message.js import key', qparam(r'\\./ui/meal-time-message\\.js'), keep_prefix),"
if vs.count(precache_anchor) != 1 or vs.count(import_anchor) != 1:
    raise SystemExit('version-sync anchor mismatch')
vs = vs.replace(precache_anchor, precache_anchor + "\n    Rule('sw.js', 'loose-shape-label.js precache key', qparam(r'\\./js/ui/loose-shape-label\\.js'), keep_prefix),", 1)
vs = vs.replace(import_anchor, import_anchor + "\n    Rule('js/app.js', 'loose-shape-label.js import key', qparam(r'\\./ui/loose-shape-label\\.js'), keep_prefix),", 1)
vs_path.write_text(vs, encoding='utf-8')

current_path = ROOT / 'scripts/check-current.py'
current = current_path.read_text(encoding='utf-8')
current_anchor = "    ('食事時間不足メッセージ', [sys.executable, str(ROOT / 'scripts/check-meal-time-message.py')]),"
if current.count(current_anchor) != 1:
    raise SystemExit('check-current anchor mismatch')
current = current.replace(current_anchor, current_anchor + "\n    ('ルースカット表示ラベル', [sys.executable, str(ROOT / 'scripts/check-loose-shape-label.py')]),", 1)
current_path.write_text(current, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
section_anchor = '## v0.10.866\n'
if changelog.count(section_anchor) != 1:
    raise SystemExit('CHANGELOG anchor mismatch')
new_section = """## v0.10.867
- ルースのカットIDから表示名を作る純粋な文字列変換だけを `js/ui/loose-shape-label.js` へ分離。
- 既存 `looseShapeLabel()` は薄いラッパーとして残し、登録済みカット名・不明IDのそのまま表示・空値時の「カット不明」という既存fallbackと9か所の呼び出し位置を維持。
- `LOOSE_SHAPES` データ、ルース在庫、制作、販売、価格、イベント、画面遷移、画像、セーブには変更なし。
- 新UI helperをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。

"""
changelog = changelog.replace(section_anchor, new_section + section_anchor, 1)
changelog_path.write_text(changelog, encoding='utf-8')

print('STAGE19 APPLY: OK')
