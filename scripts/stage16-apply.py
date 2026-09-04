#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: exact target count={count}, expected=1\nTARGET:\n{old}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


if (ROOT / 'VERSION').read_text(encoding='utf-8').strip() != '0.10.863':
    raise SystemExit('VERSION is not 0.10.863')

app_path = ROOT / 'js/app.js'
app = app_path.read_text(encoding='utf-8')
if app.count('storeBranchLabel(') != 30:
    raise SystemExit(f"js/app.js: storeBranchLabel occurrence count={app.count('storeBranchLabel(')}, expected=30")

replace_once(
    'js/app.js',
    "import { renderToolBriefMarkup } from './ui/tool-brief.js?v=0.10.863';\nimport { createPressHoldController } from './ui/press-hold-controller.js?v=0.10.863';",
    "import { renderToolBriefMarkup } from './ui/tool-brief.js?v=0.10.863';\nimport { formatStoreBranchLabel } from './ui/store-branch-label.js?v=0.10.863';\nimport { createPressHoldController } from './ui/press-hold-controller.js?v=0.10.863';",
)

legacy_function = """function storeBranchLabel(number = 1) {
  const branchNumber = Math.max(1, Number(number) || 1);
  return `店舗${branchNumber}`;
}"""
wrapper_function = """function storeBranchLabel(number = 1) {
  return formatStoreBranchLabel(number);
}"""
replace_once('js/app.js', legacy_function, wrapper_function)

(ROOT / 'js/ui/store-branch-label.js').write_text("""// Pure presentation helper for store branch number labels.
export function formatStoreBranchLabel(number = 1) {
  const branchNumber = Math.max(1, Number(number) || 1);
  return `店舗${branchNumber}`;
}
""", encoding='utf-8')

(ROOT / 'tools/test-store-branch-label.mjs').write_text("""import assert from 'node:assert/strict';
import { formatStoreBranchLabel } from '../js/ui/store-branch-label.js';

function legacyStoreBranchLabel(number = 1) {
  const branchNumber = Math.max(1, Number(number) || 1);
  return `店舗${branchNumber}`;
}

const cases = [undefined, null, 0, 1, 2, 3, -1, '2', ' 3 ', 2.5, NaN, Infinity, -Infinity, 'abc'];
for (const value of cases) {
  const expected = value === undefined ? legacyStoreBranchLabel() : legacyStoreBranchLabel(value);
  const actual = value === undefined ? formatStoreBranchLabel() : formatStoreBranchLabel(value);
  assert.equal(actual, expected, `store branch label mismatch: ${String(value)}`);
}

assert.equal(formatStoreBranchLabel(), '店舗1');
assert.equal(formatStoreBranchLabel(3), '店舗3');
console.log('STORE BRANCH LABEL TEST: PASS');
""", encoding='utf-8')

(ROOT / 'scripts/check-store-branch-label.py').write_text("""#!/usr/bin/env python3
\"\"\"Verify store branch label formatting stays isolated and behavior-compatible.\"\"\"
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/store-branch-label.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = \"\"\"function storeBranchLabel(number = 1) {
  const branchNumber = Math.max(1, Number(number) || 1);
  return `店舗${branchNumber}`;
}\"\"\"
wrapper = \"\"\"function storeBranchLabel(number = 1) {
  return formatStoreBranchLabel(number);
}\"\"\"

checks = {
    'versioned helper import exists': f\"from './ui/store-branch-label.js?v={VERSION}';\" in APP,
    'app keeps thin storeBranchLabel wrapper': wrapper in APP,
    'legacy storeBranchLabel implementation removed from app': legacy_function not in APP,
    'existing storeBranchLabel references retained': APP.count('storeBranchLabel(') == 30,
    'wrapper delegates once': APP.count('return formatStoreBranchLabel(number);') == 1,
    'helper exports formatter': 'export function formatStoreBranchLabel(number = 1)' in HELPER,
    'minimum branch number behavior retained': 'Math.max(1, Number(number) || 1)' in HELPER,
    'Japanese label format retained': 'return `店舗${branchNumber}`;' in HELPER,
    'service worker precaches helper': f\"./js/ui/store-branch-label.js?v={VERSION}\" in SW,
    'version sync knows helper precache': \"'store-branch-label.js precache key'\" in VS,
    'version sync knows helper import': \"'store-branch-label.js import key'\" in VS,
    'current audit registers checker': \"'店舗番号表示ラベル'\" in CURRENT and 'check-store-branch-label.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.', './assets/',
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

unit = subprocess.run(['node', 'tools/test-store-branch-label.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('store branch label unit test')

if failed:
    print('\nSTORE BRANCH LABEL INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nSTORE BRANCH LABEL INTEGRATION: PASS')
print('店舗番号の表示文字列変換だけをUI helperへ分離し、店舗状態・所持金・在庫・販売・画面遷移はapp.js側に維持しています。')
""", encoding='utf-8')

replace_once(
    'sw.js',
    "  './js/ui/tool-brief.js?v=0.10.863',",
    "  './js/ui/tool-brief.js?v=0.10.863',\n  './js/ui/store-branch-label.js?v=0.10.863',",
)
replace_once(
    'scripts/version-sync.py',
    "    Rule('sw.js', 'tool-brief.js precache key', qparam(r'\\./js/ui/tool-brief\\.js'), keep_prefix),\n    Rule('sw.js', 'press-hold-controller.js precache key', qparam(r'\\./js/ui/press-hold-controller\\.js'), keep_prefix),",
    "    Rule('sw.js', 'tool-brief.js precache key', qparam(r'\\./js/ui/tool-brief\\.js'), keep_prefix),\n    Rule('sw.js', 'store-branch-label.js precache key', qparam(r'\\./js/ui/store-branch-label\\.js'), keep_prefix),\n    Rule('sw.js', 'press-hold-controller.js precache key', qparam(r'\\./js/ui/press-hold-controller\\.js'), keep_prefix),",
)
replace_once(
    'scripts/version-sync.py',
    "    Rule('js/app.js', 'tool-brief.js import key', qparam(r'\\./ui/tool-brief\\.js'), keep_prefix),\n    Rule('js/app.js', 'press-hold-controller.js import key', qparam(r'\\./ui/press-hold-controller\\.js'), keep_prefix),",
    "    Rule('js/app.js', 'tool-brief.js import key', qparam(r'\\./ui/tool-brief\\.js'), keep_prefix),\n    Rule('js/app.js', 'store-branch-label.js import key', qparam(r'\\./ui/store-branch-label\\.js'), keep_prefix),\n    Rule('js/app.js', 'press-hold-controller.js import key', qparam(r'\\./ui/press-hold-controller\\.js'), keep_prefix),",
)
replace_once(
    'scripts/check-current.py',
    "    ('工具説明UI', [sys.executable, str(ROOT / 'scripts/check-tool-brief.py')]),\n    ('数量長押し管理', [sys.executable, str(ROOT / 'scripts/check-press-hold-controller.py')]),",
    "    ('工具説明UI', [sys.executable, str(ROOT / 'scripts/check-tool-brief.py')]),\n    ('店舗番号表示ラベル', [sys.executable, str(ROOT / 'scripts/check-store-branch-label.py')]),\n    ('数量長押し管理', [sys.executable, str(ROOT / 'scripts/check-press-hold-controller.py')]),",
)
replace_once(
    'CHANGELOG.md',
    '## v0.10.863\n',
    "## v0.10.864\n- 店舗1・店舗2・店舗3などの店舗番号表示文字列を作る純粋処理だけを `js/ui/store-branch-label.js` へ分離。\n- 既存 `storeBranchLabel()` は薄いラッパーとして残し、既存の全呼び出し位置・店舗表示文言・数値変換ルールを維持。\n- 店舗状態・所持金・在庫・販売・家賃・来店・通知・画面遷移・セーブ・イベント・画像には変更なし。\n- 新UI helperをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。\n\n## v0.10.863\n",
)

print('STAGE16 APPLY: PASS')
