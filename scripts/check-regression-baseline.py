#!/usr/bin/env python3
"""Current JEWELRY×JEWELRY regression baseline.

Historical version-specific checks remain in the repository for archaeology,
but this file is the maintained baseline for the current build.  It avoids
brittle assertions against code that was intentionally moved to
js/game-data-core.js or redesigned later.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
notes: list[str] = []


def read(relative: str) -> str:
    path = ROOT / relative
    if not path.is_file():
        errors.append(f'必須ファイルがありません: {relative}')
        return ''
    return path.read_text(encoding='utf-8')


def require_file(relative: str) -> None:
    if not (ROOT / relative).is_file():
        errors.append(f'必須ファイルがありません: {relative}')


def run(label: str, command: list[str]) -> None:
    proc = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if proc.returncode != 0:
        body = (proc.stdout + proc.stderr).strip()
        errors.append(f'{label}に失敗しました' + (f': {body}' if body else ''))
    else:
        notes.append(label)


app = read('js/app.js')
game_data = read('js/game-data.js')
game_data_core = read('js/game-data-core.js')
data = game_data + '\n' + game_data_core
sw = read('sw.js')
index_html = read('index.html')
game_html = read('game.html')

# 1) Build version consistency.  Use current markers instead of a fixed number.
patterns = {
    'game-data': (game_data, r"export const VERSION = '([0-9.]+)'"),
    'service-worker': (sw, r"const VERSION = '([0-9.]+)'"),
    'app-ui': (app, r"const UI_BUILD_VERSION = '([0-9.]+)'"),
    'index-shell': (index_html, r"viewport-shell\.css\?v=([0-9.]+)"),
    'game-css': (game_html, r"styles\.css\?v=([0-9.]+)"),
    'game-app': (game_html, r"js/app\.js\?v=([0-9.]+)"),
}
versions: dict[str, str] = {}
for name, (source, pattern) in patterns.items():
    match = re.search(pattern, source)
    if not match:
        errors.append(f'バージョンを確認できません: {name}')
    else:
        versions[name] = match.group(1)
if versions and len(set(versions.values())) != 1:
    errors.append('バージョン番号が一致していません: ' + ', '.join(f'{k}={v}' for k, v in versions.items()))
else:
    notes.append('主要バージョン整合')

# 2) Split game-data contract.  Both wrapper and core must exist and the wrapper
# must re-export core while keeping current overrides possible.
if "import * as core from './game-data-core.js';" not in game_data or "export * from './game-data-core.js';" not in game_data:
    errors.append('game-data.js と game-data-core.js の分割契約が崩れています')
else:
    notes.append('game-data wrapper/core分割')

# 3) High-value data files and current static assets.
for asset in [
    'assets/images/main-menu.webp',
    'assets/images/main-menu-portrait.webp',
    'assets/images/okachimachi.webp',
    'assets/images/mining-portrait.webp',
    'assets/images/workshop-portrait.webp',
    'assets/images/store-portrait.webp',
    'assets/images/meal-menu-portrait.webp',
    'assets/images/space-portrait.webp',
    'assets/images/quiz/quiz-king-normal.png',
    'assets/images/events/western-union-messenger.png',
    'assets/images/events/mermaid.png',
    'assets/images/events/sushi-chef.png',
]:
    require_file(asset)

try:
    daily_gems = json.loads((ROOT / 'data/daily-gems-365.json').read_text(encoding='utf-8'))
    if not isinstance(daily_gems, list) or len(daily_gems) != 365:
        errors.append('今日の宝石が365件ではありません')
    elif len({str(row.get('id', '')) for row in daily_gems if isinstance(row, dict)}) != 365:
        errors.append('今日の宝石IDに不足または重複があります')
    else:
        notes.append('今日の宝石365件')
except Exception as exc:
    errors.append(f'今日の宝石データを確認できません: {exc}')

try:
    quiz = json.loads((ROOT / 'data/jewelry_okachimachi_quiz_200_game_format.json').read_text(encoding='utf-8'))
    if not isinstance(quiz, list) or len(quiz) != 200:
        errors.append('4択クイズが200問ではありません')
    else:
        notes.append('御徒町4択クイズ200問')
except Exception as exc:
    errors.append(f'4択クイズデータを確認できません: {exc}')

# 4) Important current-state contracts in the data layer.
for marker, label in [
    ('export const DAY_END_MINUTES = 22 * 60', '行動終了22:00'),
    ('export const MEAL_DURATION_MINUTES = 60', '食事1時間'),
    ("STORE_MONTHLY_RENTS = Object.freeze({ 1: 150000, 2: 400000, 3: 700000 })", '店舗家賃'),
    ('STORE_STAFF_GROWTH_LEVELS', '店舗スタッフ成長'),
    ('WORKSHOP_STAFF_GROWTH_LEVELS', '職人スタッフ成長'),
    ('customers: Object.fromEntries(Object.keys(CUSTOMERS)', 'お客様初期状態'),
]:
    if marker not in data:
        errors.append(f'回帰の可能性: {label} の基準がありません')

# 5) Current maintained executable checks.  Historical validate-vXXX files are
# intentionally not run here because they assert their old VERSION values.
run('起動安全性', [sys.executable, str(ROOT / 'scripts/check-startup-diagnostics.py')])
run('携帯表示基準', [sys.executable, str(ROOT / 'scripts/check_phone_layout_baseline.py')])
run('イベント整合性', [sys.executable, str(ROOT / 'scripts/check-event-integrity.py')])
run('18時以降の御徒町背景', [sys.executable, str(ROOT / 'scripts/check-okachimachi-night-background.py')])
run('時間・食事ルール', ['node', str(ROOT / 'tools/validate-time-and-meals.mjs')])
run('BGM・環境音割り当て', ['node', str(ROOT / 'tools/validate-audio-scenes.mjs')])
run('BGM・環境音遷移', ['node', str(ROOT / 'tools/test-audio-transitions.mjs')])
run('店舗スタッフ仕様', ['node', str(ROOT / 'tools/validate-store-staff.mjs')])
run('店舗スタッフ成長境界', ['node', str(ROOT / 'tools/test-store-staff-growth.mjs')])
run('職人スタッフ仕様', ['node', str(ROOT / 'tools/validate-workshop-staff.mjs')])
run('職人スタッフ成長境界', ['node', str(ROOT / 'tools/test-workshop-staff-growth.mjs')])
run('店舗ショーケース位置維持', ['node', str(ROOT / 'tools/validate-store-showcase-return.mjs')])
run('店舗来店表示', ['node', str(ROOT / 'tools/validate-store-customer-indicator.mjs')])
run('原石研磨完了画面', ['node', str(ROOT / 'tools/validate-polishing-result-modal.mjs')])
run('ダイヤモンド研磨盤イベント終了導線', ['node', str(ROOT / 'tools/validate-diamond-polishing-lap-event.mjs')])

if errors:
    print('回帰防止チェック: NG')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

version = next(iter(versions.values()), '不明')
print(f'回帰防止チェック: OK（v{version}）')
print(f'維持対象チェック: {len(notes)}件')
for note in notes:
    print(f'OK: {note}')
