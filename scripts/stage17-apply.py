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


if (ROOT / 'VERSION').read_text(encoding='utf-8').strip() != '0.10.864':
    raise SystemExit('VERSION is not 0.10.864')

app_path = ROOT / 'js/app.js'
app = app_path.read_text(encoding='utf-8')
if app.count('clampViewportValue(') != 2:
    raise SystemExit(f"js/app.js: clampViewportValue occurrence count={app.count('clampViewportValue(')}, expected=2")

replace_once(
    'js/app.js',
    "import { formatStoreBranchLabel } from './ui/store-branch-label.js?v=0.10.864';\nimport { createPressHoldController } from './ui/press-hold-controller.js?v=0.10.864';",
    "import { formatStoreBranchLabel } from './ui/store-branch-label.js?v=0.10.864';\nimport { clampViewportNumber } from './ui/viewport-clamp.js?v=0.10.864';\nimport { createPressHoldController } from './ui/press-hold-controller.js?v=0.10.864';",
)

legacy_function = """function clampViewportValue(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}"""
wrapper_function = """function clampViewportValue(value, min, max) {
  return clampViewportNumber(value, min, max);
}"""
replace_once('js/app.js', legacy_function, wrapper_function)

(ROOT / 'js/ui/viewport-clamp.js').write_text("""// Pure numeric helper for device viewport UI scale bounds.
export function clampViewportNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}
""", encoding='utf-8')

(ROOT / 'tools/test-viewport-clamp.mjs').write_text("""import assert from 'node:assert/strict';
import { clampViewportNumber } from '../js/ui/viewport-clamp.js';

function legacyClampViewportValue(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}

const cases = [
  [undefined, 0.84, 1.08], [null, 0.84, 1.08], [0, 0.84, 1.08],
  [0.5, 0.84, 1.08], [0.84, 0.84, 1.08], [0.9, 0.84, 1.08],
  [1.08, 0.84, 1.08], [2, 0.84, 1.08], [-1, 0.84, 1.08],
  ['0.9', 0.84, 1.08], ['abc', 0.84, 1.08], [NaN, 0.84, 1.08],
  [Infinity, 0.84, 1.08], [-Infinity, 0.84, 1.08],
  [1.25, -2, 2], [0, -2, 2], [10, 5, 3],
];
for (const [value, min, max] of cases) {
  assert.equal(
    clampViewportNumber(value, min, max),
    legacyClampViewportValue(value, min, max),
    `viewport clamp mismatch: value=${String(value)} min=${min} max=${max}`,
  );
}
assert.equal(clampViewportNumber(0.7, 0.84, 1.08), 0.84);
assert.equal(clampViewportNumber(0.95, 0.84, 1.08), 0.95);
assert.equal(clampViewportNumber(1.2, 0.84, 1.08), 1.08);
console.log('VIEWPORT CLAMP TEST: PASS');
""", encoding='utf-8')

(ROOT / 'scripts/check-viewport-clamp.py').write_text("""#!/usr/bin/env python3
\"\"\"Verify viewport UI-scale clamping stays isolated and behavior-compatible.\"\"\"
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/viewport-clamp.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = \"\"\"function clampViewportValue(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}\"\"\"
wrapper = \"\"\"function clampViewportValue(value, min, max) {
  return clampViewportNumber(value, min, max);
}\"\"\"

checks = {
    'versioned helper import exists': f\"from './ui/viewport-clamp.js?v={VERSION}';\" in APP,
    'app keeps thin clampViewportValue wrapper': wrapper in APP,
    'legacy clamp implementation removed from app': legacy_function not in APP,
    'existing clampViewportValue references retained': APP.count('clampViewportValue(') == 2,
    'phone UI scale call retained': 'clampViewportValue(uiScale || (scaleAxis / 390), .84, 1.08)' in APP,
    'wrapper delegates once': APP.count('return clampViewportNumber(value, min, max);') == 1,
    'helper exports clamp': 'export function clampViewportNumber(value, min, max)' in HELPER,
    'legacy numeric fallback retained': 'Number(value) || min' in HELPER,
    'legacy min/max formula retained': 'Math.min(max, Math.max(min, Number(value) || min))' in HELPER,
    'service worker precaches helper': f\"./js/ui/viewport-clamp.js?v={VERSION}\" in SW,
    'version sync knows helper precache': \"'viewport-clamp.js precache key'\" in VS,
    'version sync knows helper import': \"'viewport-clamp.js import key'\" in VS,
    'current audit registers checker': \"'表示倍率クランプ'\" in CURRENT and 'check-viewport-clamp.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/',
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

unit = subprocess.run(['node', 'tools/test-viewport-clamp.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('viewport clamp unit test')

if failed:
    print('\nVIEWPORT CLAMP INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nVIEWPORT CLAMP INTEGRATION: PASS')
print('端末表示倍率のmin/maxクランプだけをUI helperへ分離し、端末判定・DOM・画面遷移・セーブ・画像はapp.js側に維持しています。')
""", encoding='utf-8')

replace_once(
    'sw.js',
    "  './js/ui/store-branch-label.js?v=0.10.864',",
    "  './js/ui/store-branch-label.js?v=0.10.864',\n  './js/ui/viewport-clamp.js?v=0.10.864',",
)
replace_once(
    'scripts/version-sync.py',
    "    Rule('sw.js', 'store-branch-label.js precache key', qparam(r'\\./js/ui/store-branch-label\\.js'), keep_prefix),\n    Rule('sw.js', 'press-hold-controller.js precache key', qparam(r'\\./js/ui/press-hold-controller\\.js'), keep_prefix),",
    "    Rule('sw.js', 'store-branch-label.js precache key', qparam(r'\\./js/ui/store-branch-label\\.js'), keep_prefix),\n    Rule('sw.js', 'viewport-clamp.js precache key', qparam(r'\\./js/ui/viewport-clamp\\.js'), keep_prefix),\n    Rule('sw.js', 'press-hold-controller.js precache key', qparam(r'\\./js/ui/press-hold-controller\\.js'), keep_prefix),",
)
replace_once(
    'scripts/version-sync.py',
    "    Rule('js/app.js', 'store-branch-label.js import key', qparam(r'\\./ui/store-branch-label\\.js'), keep_prefix),\n    Rule('js/app.js', 'press-hold-controller.js import key', qparam(r'\\./ui/press-hold-controller\\.js'), keep_prefix),",
    "    Rule('js/app.js', 'store-branch-label.js import key', qparam(r'\\./ui/store-branch-label\\.js'), keep_prefix),\n    Rule('js/app.js', 'viewport-clamp.js import key', qparam(r'\\./ui/viewport-clamp\\.js'), keep_prefix),\n    Rule('js/app.js', 'press-hold-controller.js import key', qparam(r'\\./ui/press-hold-controller\\.js'), keep_prefix),",
)
replace_once(
    'scripts/check-current.py',
    "    ('店舗番号表示ラベル', [sys.executable, str(ROOT / 'scripts/check-store-branch-label.py')]),\n    ('数量長押し管理', [sys.executable, str(ROOT / 'scripts/check-press-hold-controller.py')]),",
    "    ('店舗番号表示ラベル', [sys.executable, str(ROOT / 'scripts/check-store-branch-label.py')]),\n    ('表示倍率クランプ', [sys.executable, str(ROOT / 'scripts/check-viewport-clamp.py')]),\n    ('数量長押し管理', [sys.executable, str(ROOT / 'scripts/check-press-hold-controller.py')]),",
)
replace_once(
    'CHANGELOG.md',
    '## v0.10.864\n',
    "## v0.10.865\n- 端末レイアウトのUI倍率を上下限へ収める純粋な数値処理だけを `js/ui/viewport-clamp.js` へ分離。\n- 既存 `clampViewportValue()` は薄いラッパーとして残し、スマートフォン表示倍率の `.84〜1.08` 制限と `Number(value) || min` の既存変換規則を維持。\n- 端末種別判定・向き判定・DOM/CSS変数更新・画面遷移・セーブ・所持金・在庫・イベント・画像には変更なし。\n- 新UI helperをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。\n\n## v0.10.864\n",
)

print('STAGE17 APPLY: PASS')
