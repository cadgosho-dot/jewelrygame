#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEW_VERSION = '0.10.893'

subprocess.run(['python3', 'scripts/version-sync.py', '--set', NEW_VERSION], cwd=ROOT, check=True)

current_path = ROOT / 'scripts/check-current.py'
current = current_path.read_text(encoding='utf-8')
registration = "    ('注文受付処理保護', [sys.executable, str(ROOT / 'scripts/check-confirm-order-regression.py')]),\n"
anchor = "    ('注文品納品処理保護', [sys.executable, str(ROOT / 'scripts/check-deliver-order-regression.py')]),\n"
if registration not in current:
    if anchor not in current:
        raise SystemExit('check-current registration anchor not found')
    current = current.replace(anchor, anchor + registration, 1)
    current_path.write_text(current, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
section = """## v0.10.893
- 中核処理保護・第4段階として、`confirmOrder()` 本体を変更せず、注文受付処理を直接実行する動的回帰テストを追加。
- 正常受注時の注文生成、受注日・納期、店舗番号、注文条件、顧客状態リセット、30分消費、通知、保存、注文画面遷移を固定。
- 不正な顧客状態、同時注文上限、営業時間不足、製作不能時のガードを固定。
- ゲーム内容、価格、在庫、イベント、画像、音声、動画、セーブ形式は変更なし。

"""
if '## v0.10.893\n' not in changelog:
    marker = '## v0.10.892\n'
    if marker not in changelog:
        raise SystemExit('CHANGELOG insertion marker not found')
    changelog = changelog.replace(marker, section + marker, 1)
    changelog_path.write_text(changelog, encoding='utf-8')

print('confirmOrder regression release preparation complete')
