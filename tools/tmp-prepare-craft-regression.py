#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEW_VERSION = '0.10.894'

subprocess.run(['python3', 'scripts/version-sync.py', '--set', NEW_VERSION], cwd=ROOT, check=True)

current_path = ROOT / 'scripts/check-current.py'
current = current_path.read_text(encoding='utf-8')
registration = "    ('ジュエリー制作処理保護', [sys.executable, str(ROOT / 'scripts/check-craft-regression.py')]),\n"
anchor = "    ('注文受付処理保護', [sys.executable, str(ROOT / 'scripts/check-confirm-order-regression.py')]),\n"
if registration not in current:
    if anchor not in current:
        raise SystemExit('check-current registration anchor not found')
    current = current.replace(anchor, anchor + registration, 1)
    current_path.write_text(current, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
section = """## v0.10.894
- 中核処理保護・第5段階として、`craft()` 本体を変更せず、ジュエリー制作処理を直接実行する動的回帰テストを追加。
- 正常制作時のルース・地金消費、制作時間、工房稼働時間、品質・職人評価、完成品生成、制作件数、職人経験値、保存、完成画面遷移を固定。
- ルース不使用制作、注文品完成連携、工房停止・彫金机使用不可・未選択・時間不足・材料不足・保管容量不足のガードを固定。
- ゲーム内容、価格、在庫仕様、注文仕様、イベント、画像、音声、動画、セーブ形式は変更なし。

"""
if '## v0.10.894\n' not in changelog:
    marker = '## v0.10.893\n'
    if marker not in changelog:
        raise SystemExit('CHANGELOG insertion marker not found')
    changelog = changelog.replace(marker, section + marker, 1)
    changelog_path.write_text(changelog, encoding='utf-8')

print('craft regression release preparation complete')
