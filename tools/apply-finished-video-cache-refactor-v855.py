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
old_block = """function warmFinishedVideoCache(video) {
  if (!(video instanceof HTMLVideoElement)) return;
  const url = String(video.currentSrc || video.src || '');
  if (!url || !url.includes('/assets/videos/')) return;
  const warm = () => fetch(url, { cache: 'force-cache', credentials: 'same-origin' }).catch(() => {});
  if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 2500 });
  else setTimeout(warm, 0);
}

document.addEventListener('ended', (event) => {
  warmFinishedVideoCache(event.target);
}, true);

"""
if app.count(old_block) != 1:
    raise SystemExit(f'app.js: old finished video cache block count={app.count(old_block)}')
app = app.replace(old_block, 'installFinishedVideoCacheWarm();\n\n', 1)

import_marker = f"import {{ createLazyModuleManager }} from './runtime/lazy-modules.js?v={version}';\n"
new_import = import_marker + f"import {{ installFinishedVideoCacheWarm }} from './runtime/finished-video-cache-warm.js?v={version}';\n"
if app.count(import_marker) != 1:
    raise SystemExit('app.js: lazy module import marker mismatch')
app = app.replace(import_marker, new_import, 1)
APP.write_text(app, encoding='utf-8')

sw = SW.read_text(encoding='utf-8')
sw_marker = f"'./js/runtime/lazy-modules.js?v={version}', './js/ui/press-hold-controller.js?v={version}',"
sw_replacement = f"'./js/runtime/lazy-modules.js?v={version}', './js/runtime/finished-video-cache-warm.js?v={version}', './js/ui/press-hold-controller.js?v={version}',"
if sw.count(sw_marker) != 1:
    raise SystemExit('sw.js: runtime cache marker mismatch')
sw = sw.replace(sw_marker, sw_replacement, 1)
SW.write_text(sw, encoding='utf-8')

version_sync = VERSION_SYNC.read_text(encoding='utf-8')
sw_rule = "    Rule('sw.js', 'lazy-modules.js precache key', qparam(r'\\./js/runtime/lazy-modules\\.js'), keep_prefix),\n"
sw_rule_new = sw_rule + "    Rule('sw.js', 'finished-video-cache-warm.js precache key', qparam(r'\\./js/runtime/finished-video-cache-warm\\.js'), keep_prefix),\n"
if version_sync.count(sw_rule) != 1:
    raise SystemExit('version-sync.py: sw lazy-module rule marker mismatch')
version_sync = version_sync.replace(sw_rule, sw_rule_new, 1)
app_rule = "    Rule('js/app.js', 'lazy-modules.js import key', qparam(r'\\./runtime/lazy-modules\\.js'), keep_prefix),\n"
app_rule_new = app_rule + "    Rule('js/app.js', 'finished-video-cache-warm.js import key', qparam(r'\\./runtime/finished-video-cache-warm\\.js'), keep_prefix),\n"
if version_sync.count(app_rule) != 1:
    raise SystemExit('version-sync.py: app lazy-module rule marker mismatch')
version_sync = version_sync.replace(app_rule, app_rule_new, 1)
VERSION_SYNC.write_text(version_sync, encoding='utf-8')

check_current = CHECK_CURRENT.read_text(encoding='utf-8')
check_marker = "    ('遅延ロード管理', [sys.executable, str(ROOT / 'scripts/check-lazy-module-loading.py')]),\n"
check_line = check_marker + "    ('終了動画キャッシュ管理', [sys.executable, str(ROOT / 'scripts/check-finished-video-cache-warm.py')]),\n"
if check_current.count(check_marker) != 1:
    raise SystemExit('check-current.py: lazy module check marker mismatch')
check_current = check_current.replace(check_marker, check_line, 1)
CHECK_CURRENT.write_text(check_current, encoding='utf-8')

changelog = CHANGELOG.read_text(encoding='utf-8')
marker = '## v0.10.854\n'
if changelog.count(marker) != 1:
    raise SystemExit('CHANGELOG marker mismatch')
entry = """## v0.10.855
- `js/app.js` 冒頭に直書きされていた「イベント動画再生終了後のキャッシュウォーム処理」を `js/runtime/finished-video-cache-warm.js` へ分離。
- 従来どおり HTMLVideoElement のみ、`/assets/videos/` のみを対象とし、`fetch(..., { cache: 'force-cache', credentials: 'same-origin' })` を維持。
- `requestIdleCallback` 使用時の2500ms timeout、未対応端末の0ms `setTimeout` fallback、`ended` イベントのcapture監視を維持。
- 新runtime moduleを `version-sync.py` とService Worker必須キャッシュへ登録し、今後のVERSION更新でも同期対象に固定。
- ゲーム状態、セーブ、在庫、金額、イベント発生条件、動画再生開始/停止制御には変更なし。

## v0.10.854
"""
CHANGELOG.write_text(changelog.replace(marker, entry, 1), encoding='utf-8')

print('FINISHED VIDEO CACHE REFACTOR: PASS')
