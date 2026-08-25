#!/usr/bin/env python3
"""Validate current PWA update/cache policy without changing user data."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding='utf-8')


def require(ok: bool, message: str) -> None:
    if not ok:
        print(f'NG: {message}')
        raise SystemExit(1)


index = read('index.html')
game = read('game.html')
app = read('js/app.js')
sw = read('sw.js')
recovery = read('auth-cache-recovery.js')

canonical_tag = f'<script src="./auth-cache-recovery.js?v={VERSION}"></script>'
require(canonical_tag in index, 'index.html が現行PWA復旧スクリプトをバージョン付きで読み込んでいません')
require(canonical_tag in game, 'game.html が現行PWA復旧スクリプトをバージョン付きで読み込んでいません')
for source_name, source in [('index.html', index), ('game.html', game), ('sw.js', sw)]:
    require('auth-cache-recovery-v707.js' not in source, f'{source_name} が旧v707復旧スクリプトを現役参照しています')

require(f"const BUILD_VERSION = '{VERSION}';" in recovery, 'PWA復旧スクリプトのBUILD_VERSIONがVERSIONと一致しません')
require("register(`./sw.js?v=${BUILD_VERSION}`, { updateViaCache: 'none' })" in recovery,
        'PWA復旧スクリプトがService WorkerのHTTPキャッシュ回避登録になっていません')
require("register(`./sw.js?v=${UI_BUILD_VERSION}`, { updateViaCache: 'none' })" in app,
        'app.js のService Worker登録がHTTPキャッシュ回避になっていません')

require(f"const VERSION = '{VERSION}';" in sw, 'sw.js のVERSIONがVERSIONファイルと一致しません')
require(f"'./auth-cache-recovery.js?v={VERSION}'" in sw, 'Service Workerが現行PWA復旧スクリプトをプリキャッシュしていません')
require("fetch(request, { cache: 'no-store' })" in sw, 'HTML更新時のHTTPキャッシュ回避がありません')
require('event.respondWith(documentNetworkFirst(event.request));' in sw,
        '画面遷移がdocumentNetworkFirstを使用していません')
require("const CACHE_PREFIX = 'jewelrygame-';" in sw, '自アプリ用キャッシュprefixが定義されていません')
require('key.startsWith(CACHE_PREFIX)' in sw, 'activate時の削除対象が自アプリのキャッシュに限定されていません')
require("const MEDIA_CACHE = 'jewelrygame-media-v1';" in sw, '動画用永続キャッシュが維持されていません')

# Every active CORE_SHELL local asset must exist. Query strings are cache keys only.
match = re.search(r'const CORE_SHELL\s*=\s*\[(.*?)\];', sw, re.S)
require(bool(match), 'CORE_SHELLを解析できません')
entries = re.findall(r"['\"](\./[^'\"]+)['\"]", match.group(1))
require(bool(entries), 'CORE_SHELLが空です')
missing: list[str] = []
for entry in entries:
    rel = entry.split('?', 1)[0]
    if rel == './':
        continue
    path = ROOT / rel.removeprefix('./')
    if not path.is_file():
        missing.append(rel)
require(not missing, 'CORE_SHELLに存在しないファイルがあります: ' + ', '.join(missing))

# Firebase Hosting is still supported; when used, SW and HTML must revalidate.
firebase = json.loads(read('firebase.json'))
headers = firebase.get('hosting', {}).get('headers', [])
header_map = {item.get('source'): {h.get('key', '').lower(): h.get('value', '') for h in item.get('headers', [])} for item in headers}
require('no-cache' in header_map.get('/sw.js', {}).get('cache-control', ''), 'Firebaseのsw.js Cache-Controlにno-cacheがありません')
require('no-cache' in header_map.get('**/*.html', {}).get('cache-control', ''), 'FirebaseのHTML Cache-Controlにno-cacheがありません')

# Syntax-check the cache/update JavaScript that can affect startup.
for rel in ('sw.js', 'auth-cache-recovery.js'):
    proc = subprocess.run(['node', '--check', str(ROOT / rel)], text=True, capture_output=True)
    require(proc.returncode == 0, f'{rel} のJavaScript構文エラー: {proc.stderr.strip()}')

print('PWA CACHE/UPDATE POLICY: PASS')
print('現行HTML・Service Worker・復旧ブートストラップの更新経路を確認しました。')
