#!/usr/bin/env python3
"""Validate the first app.js refactoring boundary: optional lazy modules."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
MODULE = (ROOT / 'js/runtime/lazy-modules.js').read_text(encoding='utf-8')
SW = (ROOT / 'sw.js').read_text(encoding='utf-8')

errors: list[str] = []


def require(ok: bool, message: str) -> None:
    if not ok:
        errors.append(message)


require(
    f"from './runtime/lazy-modules.js?v={VERSION}';" in APP,
    'app.js が遅延ロード管理を現行VERSION付きでimportしていません',
)
require('createLazyModuleManager({' in APP, 'app.js が遅延ロード管理を初期化していません')
for legacy in (
    'let dailyGemsModule = null;',
    'let dailyGemsLoadPromise = null;',
    'let looseProfessionalModule = null;',
    'let looseProfessionalLoadPromise = null;',
    "let kaitenzushiEmbeddedHtml = '';",
    'let kaitenzushiModuleLoadPromise = null;',
):
    require(legacy not in APP, f'app.js に分離前の可変状態が残っています: {legacy}')

for loader in (
    "import(`./daily-gems.js?v=${VERSION}`)",
    "import(`./loose-gem-professional.js?v=${VERSION}`)",
    "import(`./kaitenzushi-embedded.js?v=${VERSION}`)",
):
    require(loader in APP, f'現行の遅延import URLが維持されていません: {loader}')

require('export function createLazyModuleManager' in MODULE, '遅延ロード管理のexportがありません')
require('function createLazyResource' in MODULE, '共通の遅延ロード資源管理がありません')
require('loadPromise = null;' in MODULE, '読込失敗後に再試行できるpromise解除がありません')
require(
    f"'./js/runtime/lazy-modules.js?v={VERSION}'" in SW,
    'Service Workerが新しい遅延ロード管理モジュールをプリキャッシュしていません',
)

for relative in ('js/app.js', 'js/runtime/lazy-modules.js', 'tools/test-lazy-modules.mjs'):
    proc = subprocess.run(
        ['node', '--check', str(ROOT / relative)],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    require(proc.returncode == 0, f'{relative} の構文エラー: {proc.stderr.strip()}')

test = subprocess.run(
    ['node', str(ROOT / 'tools/test-lazy-modules.mjs')],
    cwd=ROOT,
    text=True,
    capture_output=True,
)
require(test.returncode == 0, '遅延ロード動作テストに失敗しました: ' + (test.stdout + test.stderr).strip())

if errors:
    print('LAZY MODULE LOADING: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

print('LAZY MODULE LOADING: PASS')
print('遅延ロード3系統の分離・再試行・PWAキャッシュを確認しました。')
