#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEW_VERSION = '0.10.892'

subprocess.run(['python3', 'scripts/version-sync.py', '--set', NEW_VERSION], cwd=ROOT, check=True)

current_path = ROOT / 'scripts/check-current.py'
current = current_path.read_text(encoding='utf-8')
registration = "    ('注文品納品処理保護', [sys.executable, str(ROOT / 'scripts/check-deliver-order-regression.py')]),\n"
anchor = "    ('顧客店頭購入処理保護', [sys.executable, str(ROOT / 'scripts/check-customer-buy-regression.py')]),\n"
if registration not in current:
    if anchor not in current:
        raise SystemExit('check-current registration anchor not found')
    current = current.replace(anchor, anchor + registration, 1)
    current_path.write_text(current, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
section = """## v0.10.892
- 中核処理保護・第3段階として、`deliverOrder()` 本体を変更せず、注文品の納品処理を直接実行する動的回帰テストを追加。
- 正常納品時の注文完了化、完成品の売却化、所持金・店舗売上・利益・納品件数、店舗評価、顧客購入回数、収支、ケース消費、保存を固定。
- 二重納品防止、店舗休業・営業時間外・商品欠落のガード、納期超過時の期限切れ処理、完成直後の即時納品経路を固定。
- ゲーム内容、価格、在庫、イベント、画像、音声、動画、セーブ形式は変更なし。

"""
if '## v0.10.892\n' not in changelog:
    marker = '## v0.10.891\n'
    if marker not in changelog:
        raise SystemExit('CHANGELOG insertion marker not found')
    changelog = changelog.replace(marker, section + marker, 1)
    changelog_path.write_text(changelog, encoding='utf-8')

print('deliverOrder regression release preparation complete')
