#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js/app.js'
SW = ROOT / 'sw.js'
VERSION_SYNC = ROOT / 'scripts/version-sync.py'
CHECK_CURRENT = ROOT / 'scripts/check-current.py'
CHANGELOG = ROOT / 'CHANGELOG.md'
version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()

app = APP.read_text(encoding='utf-8')
import_marker = f"import {{ installFinishedVideoCacheWarm }} from './runtime/finished-video-cache-warm.js?v={version}';\n"
new_import = import_marker + f"import {{ createWinterColdTextEffect }} from './ui/winter-cold-text-effect.js?v={version}';\n"
if app.count(import_marker) != 1:
    raise SystemExit('app.js: finished-video import marker mismatch')
if 'createWinterColdTextEffect' not in app:
    app = app.replace(import_marker, new_import, 1)

legacy_boot = """const winterColdOriginalText = new WeakMap();
const winterColdOriginalAttributes = new WeakMap();
let winterColdGarbleScheduled = false;
const winterColdTextObserver = new MutationObserver(() => scheduleWinterColdTextEffect());
winterColdTextObserver.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ['placeholder', 'title', 'aria-label', 'alt', 'value'],
});
"""
if app.count(legacy_boot) != 1:
    raise SystemExit(f'app.js: legacy winter-cold observer block count={app.count(legacy_boot)}')
controller_boot = """const winterColdTextEffect = createWinterColdTextEffect({
  isActive: () => winterColdTextActive(),
});
"""
app = app.replace(legacy_boot, controller_boot, 1)

start_marker = 'function winterColdGarbleText(value) {'
end_marker = 'function clearMorningBrief() {'
if app.count(start_marker) != 1 or app.count(end_marker) != 1:
    raise SystemExit('app.js: winter-cold text function range marker mismatch')
start = app.index(start_marker)
end = app.index(end_marker, start)
legacy_range = app[start:end]
required_legacy_functions = [
    'function winterColdGarbleText(value)',
    'function winterColdReadableElement(element)',
    'function applyWinterColdTextEffect()',
    'function scheduleWinterColdTextEffect()',
]
for token in required_legacy_functions:
    if token not in legacy_range:
        raise SystemExit(f'app.js: expected legacy function missing in range: {token}')
app = app[:start] + app[end:]

legacy_calls = app.count('scheduleWinterColdTextEffect();')
if legacy_calls < 4:
    raise SystemExit(f'app.js: expected >=4 schedule calls, found {legacy_calls}')
app = app.replace('scheduleWinterColdTextEffect();', 'winterColdTextEffect.schedule();')
if 'scheduleWinterColdTextEffect' in app:
    raise SystemExit('app.js: legacy schedule symbol remains after replacement')
APP.write_text(app, encoding='utf-8')

sw = SW.read_text(encoding='utf-8')
sw_marker = f"'./js/runtime/finished-video-cache-warm.js?v={version}', './js/ui/press-hold-controller.js?v={version}',"
sw_replacement = f"'./js/runtime/finished-video-cache-warm.js?v={version}', './js/ui/winter-cold-text-effect.js?v={version}', './js/ui/press-hold-controller.js?v={version}',"
if sw.count(sw_marker) != 1:
    raise SystemExit('sw.js: UI module cache marker mismatch')
sw = sw.replace(sw_marker, sw_replacement, 1)
SW.write_text(sw, encoding='utf-8')

version_sync = VERSION_SYNC.read_text(encoding='utf-8')
sw_rule = "    Rule('sw.js', 'finished-video-cache-warm.js precache key', qparam(r'\\./js/runtime/finished-video-cache-warm\\.js'), keep_prefix),\n"
sw_extra = "    Rule('sw.js', 'winter-cold-text-effect.js precache key', qparam(r'\\./js/ui/winter-cold-text-effect\\.js'), keep_prefix),\n"
if version_sync.count(sw_rule) != 1:
    raise SystemExit('version-sync.py: finished-video SW rule marker mismatch')
if sw_extra not in version_sync:
    version_sync = version_sync.replace(sw_rule, sw_rule + sw_extra, 1)
app_rule = "    Rule('js/app.js', 'finished-video-cache-warm.js import key', qparam(r'\\./runtime/finished-video-cache-warm\\.js'), keep_prefix),\n"
app_extra = "    Rule('js/app.js', 'winter-cold-text-effect.js import key', qparam(r'\\./ui/winter-cold-text-effect\\.js'), keep_prefix),\n"
if version_sync.count(app_rule) != 1:
    raise SystemExit('version-sync.py: finished-video app rule marker mismatch')
if app_extra not in version_sync:
    version_sync = version_sync.replace(app_rule, app_rule + app_extra, 1)
VERSION_SYNC.write_text(version_sync, encoding='utf-8')

check_current = CHECK_CURRENT.read_text(encoding='utf-8')
check_marker = "    ('終了動画キャッシュ管理', [sys.executable, str(ROOT / 'scripts/check-finished-video-cache-warm.py')]),\n"
check_extra = "    ('冬の体調不良文字効果', [sys.executable, str(ROOT / 'scripts/check-winter-cold-text-effect.py')]),\n"
if check_current.count(check_marker) != 1:
    raise SystemExit('check-current.py: finished-video check marker mismatch')
if check_extra not in check_current:
    check_current = check_current.replace(check_marker, check_marker + check_extra, 1)
CHECK_CURRENT.write_text(check_current, encoding='utf-8')

changelog = CHANGELOG.read_text(encoding='utf-8')
marker = '## v0.10.855\n'
if changelog.count(marker) != 1:
    raise SystemExit('CHANGELOG marker mismatch')
entry = """## v0.10.856
- 冬の体調不良中に画面テキストを文字化けさせるDOM表示処理を `js/ui/winter-cold-text-effect.js` へ分離。
- 文字列変換、元文字/属性の復元、読める操作ボタンの除外、MutationObserver監視、microtaskの重複抑止を従来どおり維持。
- 体調不良の有効判定は `isActive` callbackとして `app.js` から注入し、新UI moduleはゲーム状態・イベント状態・セーブデータを一切保持しない構造に変更。
- 新UI moduleをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。
- 風邪イベントの発生条件、発生率、療養日数、就寝、誕生日/支払い競合復旧、セーブ、在庫、金額には変更なし。

## v0.10.855
"""
CHANGELOG.write_text(changelog.replace(marker, entry, 1), encoding='utf-8')

print(f'WINTER COLD TEXT EFFECT REFACTOR: PASS (replaced schedule calls={legacy_calls})')
