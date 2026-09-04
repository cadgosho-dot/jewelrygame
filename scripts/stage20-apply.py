#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def write(rel, text):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

# app.js: add helper import next to the preceding loose-shape UI helper and keep a thin wrapper.
app = read('js/app.js')
import_re = re.compile(r"(?m)^(import[^\n]+from '\./ui/loose-shape-label\.js\?v=0\.10\.867';\n)")
matches = list(import_re.finditer(app))
if len(matches) != 1:
    raise SystemExit(f'app helper import anchor: expected 1 match, got {len(matches)}')
new_import = "import { formatRoughDisplayName } from './ui/rough-display-name.js?v=0.10.867';\n"
anchor = matches[0].group(1)
app = app[:matches[0].start()] + anchor + new_import + app[matches[0].end():]
legacy = """function roughDisplayName(id) {
  const gem = GEMS[id];
  return gem?.roughName || (gem ? `${gem.name}原石` : '原石');
}"""
wrapper = """function roughDisplayName(id) {
  return formatRoughDisplayName(id, GEMS);
}"""
app = replace_once(app, legacy, wrapper, 'roughDisplayName legacy body')
write('js/app.js', app)

# Pure display helper.
write('js/ui/rough-display-name.js', """// Pure display-name helper for rough gemstones.
export function formatRoughDisplayName(id, gems) {
  const gem = gems[id];
  return gem?.roughName || (gem ? `${gem.name}原石` : '原石');
}
""")

# Unit test for all legacy fallbacks.
write('tools/test-rough-display-name.mjs', """import assert from 'node:assert/strict';
import { formatRoughDisplayName } from '../js/ui/rough-display-name.js';

const gems = Object.freeze({
  ruby: Object.freeze({ name: 'ルビー', roughName: 'ルビーの原石' }),
  sapphire: Object.freeze({ name: 'サファイア' }),
  emerald: Object.freeze({ name: 'エメラルド', roughName: '' }),
});

assert.equal(formatRoughDisplayName('ruby', gems), 'ルビーの原石');
assert.equal(formatRoughDisplayName('sapphire', gems), 'サファイア原石');
assert.equal(formatRoughDisplayName('emerald', gems), 'エメラルド原石');
assert.equal(formatRoughDisplayName('unknown', gems), '原石');
assert.equal(formatRoughDisplayName('', gems), '原石');
assert.equal(Object.keys(gems).length, 3);
console.log('ROUGH DISPLAY NAME TEST: PASS');
""")

checker = r'''#!/usr/bin/env python3
"""Verify rough gemstone display-name formatting stays a pure UI helper."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/rough-display-name.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

legacy_function = """function roughDisplayName(id) {
  const gem = GEMS[id];
  return gem?.roughName || (gem ? `${gem.name}原石` : '原石');
}"""
wrapper = """function roughDisplayName(id) {
  return formatRoughDisplayName(id, GEMS);
}"""

checks = {
    'versioned helper import exists': f"from './ui/rough-display-name.js?v={VERSION}';" in APP,
    'app keeps thin roughDisplayName wrapper': wrapper in APP,
    'legacy implementation removed from app': legacy_function not in APP,
    'existing roughDisplayName references retained': APP.count('roughDisplayName(') == 11,
    'wrapper delegates once': APP.count('return formatRoughDisplayName(id, GEMS);') == 1,
    'helper exports formatter': 'export function formatRoughDisplayName(id, gems)' in HELPER,
    'helper keeps exact map lookup': 'const gem = gems[id];' in HELPER,
    'helper keeps roughName/name fallback': "return gem?.roughName || (gem ? `${gem.name}原石` : '原石');" in HELPER,
    'service worker precaches helper': f"./js/ui/rough-display-name.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'rough-display-name.js precache key'" in VS,
    'version sync knows helper import': "'rough-display-name.js import key'" in VS,
    'current audit registers checker': "'原石表示ラベル'" in CURRENT and 'check-rough-display-name.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'document.', 'window.',
    'navigator.', 'setTimeout', 'setInterval', './assets/', 'Math.random',
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

unit = subprocess.run(['node', 'tools/test-rough-display-name.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('rough display name unit test')

if failed:
    print('\nROUGH DISPLAY NAME INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nROUGH DISPLAY NAME INTEGRATION: PASS')
print('原石の表示名変換だけをUI helperへ分離し、GEMSデータ・所持数・採掘・研磨・価格・販売・セーブはapp.js側に維持しています。')
'''
write('scripts/check-rough-display-name.py', checker)

# Service worker precache registration.
sw = read('sw.js')
sw_anchor = "  './js/ui/loose-shape-label.js?v=0.10.867',\n"
sw = replace_once(sw, sw_anchor, sw_anchor + "  './js/ui/rough-display-name.js?v=0.10.867',\n", 'sw helper anchor')
write('sw.js', sw)

# Version synchronization rules.
vs = read('scripts/version-sync.py')
precache_anchor = "    Rule('sw.js', 'loose-shape-label.js precache key', qparam(r'\\./js/ui/loose-shape-label\\.js'), keep_prefix),\n"
precache_new = precache_anchor + "    Rule('sw.js', 'rough-display-name.js precache key', qparam(r'\\./js/ui/rough-display-name\\.js'), keep_prefix),\n"
vs = replace_once(vs, precache_anchor, precache_new, 'version-sync precache anchor')
import_anchor = "    Rule('js/app.js', 'loose-shape-label.js import key', qparam(r'\\./ui/loose-shape-label\\.js'), keep_prefix),\n"
import_new = import_anchor + "    Rule('js/app.js', 'rough-display-name.js import key', qparam(r'\\./ui/rough-display-name\\.js'), keep_prefix),\n"
vs = replace_once(vs, import_anchor, import_new, 'version-sync import anchor')
write('scripts/version-sync.py', vs)

# Register dedicated integration checker in the one-command audit.
current = read('scripts/check-current.py')
current_anchor = "    ('ルースカット表示ラベル', [sys.executable, str(ROOT / 'scripts/check-loose-shape-label.py')]),\n"
current = replace_once(current, current_anchor, current_anchor + "    ('原石表示ラベル', [sys.executable, str(ROOT / 'scripts/check-rough-display-name.py')]),\n", 'check-current anchor')
write('scripts/check-current.py', current)

# Changelog: one stage, one purpose.
changelog = read('CHANGELOG.md')
section = """## v0.10.868
- 原石IDから表示名を作る純粋な文字列変換だけを `js/ui/rough-display-name.js` へ分離。
- 既存 `roughDisplayName()` は薄いラッパーとして残し、既存10か所の呼び出し位置と「専用原石名 → 宝石名+原石 → 原石」のfallbackを維持。
- `GEMS` データ・原石所持数・採掘・研磨・価格・販売・画面遷移・画像・セーブには変更なし。
- 新UI helperをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。

"""
changelog = replace_once(changelog, '## v0.10.867\n', section + '## v0.10.867\n', 'CHANGELOG insertion')
write('CHANGELOG.md', changelog)

print('STAGE20 PATCH APPLIED')
