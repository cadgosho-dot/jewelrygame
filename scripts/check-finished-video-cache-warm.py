#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
check_current = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
module_path = ROOT / 'js/runtime/finished-video-cache-warm.js'
errors: list[str] = []

expected_import = f"import {{ installFinishedVideoCacheWarm }} from './runtime/finished-video-cache-warm.js?v={version}';"
if expected_import not in app:
    errors.append('app.js: finished-video-cache-warm のVERSION付きimportがありません')
if 'installFinishedVideoCacheWarm();' not in app:
    errors.append('app.js: finished video cache warmer のinstall呼び出しがありません')
if 'function warmFinishedVideoCache(video)' in app:
    errors.append('app.js: 旧 warmFinishedVideoCache 実装が残っています')
if "document.addEventListener('ended', (event) =>" in app and 'warmFinishedVideoCache(event.target)' in app:
    errors.append('app.js: 旧 ended listener が残っています')
if f"./js/runtime/finished-video-cache-warm.js?v={version}" not in sw:
    errors.append('sw.js: finished-video-cache-warm がCORE_SHELLにありません')
if not module_path.is_file():
    errors.append('js/runtime/finished-video-cache-warm.js がありません')
if "('終了動画キャッシュ管理', [sys.executable, str(ROOT / 'scripts/check-finished-video-cache-warm.py')])," not in check_current:
    errors.append('scripts/check-current.py: 終了動画キャッシュ管理の総合検査登録がありません')

if errors:
    print('FINISHED VIDEO CACHE INTEGRATION: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

proc = subprocess.run(
    ['node', str(ROOT / 'tools/test-finished-video-cache-warm.mjs')],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8'
)
if proc.returncode != 0:
    print('FINISHED VIDEO CACHE INTEGRATION: FAIL')
    print(proc.stdout, end='')
    print(proc.stderr, end='', file=sys.stderr)
    sys.exit(proc.returncode)

print(proc.stdout, end='')
print('FINISHED VIDEO CACHE INTEGRATION: PASS')
print('再生終了動画のキャッシュウォーム処理をruntime moduleへ分離し、従来の対象・fetch設定・idle/fallback・capture監視を維持しています。')
