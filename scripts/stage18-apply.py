#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)

app = read('js/app.js')
if app.count('mealTimeUnavailableMessage(') != 3:
    raise SystemExit(f'mealTimeUnavailableMessage refs: expected 3, got {app.count("mealTimeUnavailableMessage(")}')

old_import = "import { clampViewportNumber } from './ui/viewport-clamp.js?v=0.10.865';"
new_import = old_import + "\nimport { mealTimeUnavailableText } from './ui/meal-time-message.js?v=0.10.865';"
app = replace_once(app, old_import, new_import, 'app import anchor')

old_fn = """function mealTimeUnavailableMessage() {
  return '今日は食事をする時間がありません。';
}"""
new_fn = """function mealTimeUnavailableMessage() {
  return mealTimeUnavailableText();
}"""
app = replace_once(app, old_fn, new_fn, 'mealTimeUnavailableMessage implementation')
write('js/app.js', app)

write('js/ui/meal-time-message.js', """// Pure UI text helper for the no-time-left meal message.\nexport function mealTimeUnavailableText() {\n  return '今日は食事をする時間がありません。';\n}\n""")

write('tools/test-meal-time-message.mjs', r"""import assert from 'node:assert/strict';
import { mealTimeUnavailableText } from '../js/ui/meal-time-message.js';

const expected = '今日は食事をする時間がありません。';
assert.equal(mealTimeUnavailableText(), expected);
assert.equal(typeof mealTimeUnavailableText(), 'string');
assert.equal(mealTimeUnavailableText().trim(), expected);
console.log('MEAL TIME MESSAGE TEST: PASS');
""")

write('scripts/check-meal-time-message.py', r'''#!/usr/bin/env python3
"""Verify the meal no-time-left message stays a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/meal-time-message.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function mealTimeUnavailableMessage() {
  return '今日は食事をする時間がありません。';
}"""
wrapper = """function mealTimeUnavailableMessage() {
  return mealTimeUnavailableText();
}"""

checks = {
    'versioned helper import exists': f"from './ui/meal-time-message.js?v={VERSION}';" in APP,
    'app keeps thin mealTimeUnavailableMessage wrapper': wrapper in APP,
    'legacy message implementation removed from app': legacy_function not in APP,
    'existing mealTimeUnavailableMessage references retained': APP.count('mealTimeUnavailableMessage(') == 3,
    'wrapper delegates once': APP.count('return mealTimeUnavailableText();') == 1,
    'helper exports message': 'export function mealTimeUnavailableText()' in HELPER,
    'exact Japanese message retained': "return '今日は食事をする時間がありません。';" in HELPER,
    'service worker precaches helper': f"./js/ui/meal-time-message.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'meal-time-message.js precache key'" in VS,
    'version sync knows helper import': "'meal-time-message.js import key'" in VS,
    'current audit registers checker': "'食事時間不足メッセージ'" in CURRENT and 'check-meal-time-message.py' in CURRENT,
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

unit = subprocess.run(['node', 'tools/test-meal-time-message.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('meal time message unit test')

if failed:
    print('\nMEAL TIME MESSAGE INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nMEAL TIME MESSAGE INTEGRATION: PASS')
print('食事をする時間が残っていない場合の表示文言だけをUI helperへ分離し、時間判定・空腹度・所持金・食事処理・画面遷移はapp.js側に維持しています。')
''')

vs = read('scripts/version-sync.py')
vs = replace_once(
    vs,
    "    Rule('sw.js', 'viewport-clamp.js precache key', qparam(r'\\./js/ui/viewport-clamp\\.js'), keep_prefix),",
    "    Rule('sw.js', 'viewport-clamp.js precache key', qparam(r'\\./js/ui/viewport-clamp\\.js'), keep_prefix),\n    Rule('sw.js', 'meal-time-message.js precache key', qparam(r'\\./js/ui/meal-time-message\\.js'), keep_prefix),",
    'version-sync sw rule',
)
vs = replace_once(
    vs,
    "    Rule('js/app.js', 'viewport-clamp.js import key', qparam(r'\\./ui/viewport-clamp\\.js'), keep_prefix),",
    "    Rule('js/app.js', 'viewport-clamp.js import key', qparam(r'\\./ui/viewport-clamp\\.js'), keep_prefix),\n    Rule('js/app.js', 'meal-time-message.js import key', qparam(r'\\./ui/meal-time-message\\.js'), keep_prefix),",
    'version-sync app rule',
)
write('scripts/version-sync.py', vs)

sw = read('sw.js')
sw = replace_once(
    sw,
    "  './js/ui/viewport-clamp.js?v=0.10.865',",
    "  './js/ui/viewport-clamp.js?v=0.10.865',\n  './js/ui/meal-time-message.js?v=0.10.865',",
    'service worker precache anchor',
)
write('sw.js', sw)

current = read('scripts/check-current.py')
current = replace_once(
    current,
    "    ('表示倍率クランプ', [sys.executable, str(ROOT / 'scripts/check-viewport-clamp.py')]),",
    "    ('表示倍率クランプ', [sys.executable, str(ROOT / 'scripts/check-viewport-clamp.py')]),\n    ('食事時間不足メッセージ', [sys.executable, str(ROOT / 'scripts/check-meal-time-message.py')]),",
    'check-current anchor',
)
write('scripts/check-current.py', current)

changelog = read('CHANGELOG.md')
entry = """## v0.10.866
- 食事をする時間が残っていない場合に表示する固定文言だけを `js/ui/meal-time-message.js` へ分離。
- 既存 `mealTimeUnavailableMessage()` は薄いラッパーとして残し、「今日は食事をする時間がありません。」の文言と既存2か所の呼び出し位置を維持。
- 食事可否の時間判定・空腹度・所持金・食事履歴・イベント・画面遷移・画像・セーブには変更なし。
- 新UI helperをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。

"""
changelog = replace_once(changelog, '## v0.10.865\n', entry + '## v0.10.865\n', 'CHANGELOG insertion')
write('CHANGELOG.md', changelog)

print('STAGE18 APPLY: PASS')
