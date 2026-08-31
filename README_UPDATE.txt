JEWELRY×JEWELRY — 未公開実装 更新データ
作成日: 2026-08-31
基準: v0.10.814
バージョン更新: 保留（0.10.814のまま）
GitHub更新: 保留

【このパッケージに含まれる実装】
1. 水槽ミニゲーム
   - 縦画面で水槽表示を縦方向中央へ配置。
   - 「観察する」ボタンは水槽の下に維持。
   - 横画面レイアウトは変更しない。

2. スマートフォン > プレゼント
   - 「取り消す」確認ダイアログで確定ボタンをタップしても反応しない不具合を修正。
   - 原因は、確認ダイアログ専用の modalEl click handler に gift-cancel-confirm が無かったこと。
   - 確定後、対象コード取得 → ダイアログを閉じる → cancelGift(code) を実行する。

【追加した回帰検査】
- scripts/check-aquarium-portrait-center.py
- scripts/check-gift-cancel-modal.py
- scripts/check-current.py に上記2検査を追加

【管理資料】
- assets/minigames/aquarium/index.html のサイズ/SHA変更に合わせて ASSETS.md を同期。

【重要】
- VERSIONは変更していません。
- Service Worker / PWAキャッシュ番号は変更していません。
- GitHub commit / push / Pages公開は行っていません。
- 後で他の修正とまとめて正式更新する前提の「未公開実装パッケージ」です。

【適用方法】
リポジトリ直下をカレントディレクトリにして:
  python <このパッケージ>/APPLY_UPDATE.py .

検証のみ:
  python <このパッケージ>/VERIFY_UPDATE.py .

総合監査まで実行する場合:
  python <このパッケージ>/VERIFY_UPDATE.py . --full-check

APPLY_UPDATE.py は基準ファイルのSHA-256を確認し、別の変更が混ざっている場合は上書きせず停止します。
