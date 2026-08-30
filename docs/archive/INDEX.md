# Archive Index — JEWELRY×JEWELRY

このフォルダは**過去の記録専用**です。ここにある資料は削除せず保存しますが、現在のゲーム仕様・作業基準・適用手順としては使用しません。

現行情報はリポジトリ直下の以下を参照してください。

- `VERSION`
- `README.md`
- `CHANGELOG.md`
- `GAME_RULES.md`
- `ASSETS.md`
- `TODO.md`
- `EVENT_PROBABILITY_LIST.md`

## アーカイブ済み資料

| ファイル | 元の位置/基準 | 扱い |
|---|---|---|
| `README_v0.10.356.md` | 旧ルート `README.md` / v0.10.356 | 過去更新説明 |
| `EVENT_PROBABILITY_LIST_v0.10.581.md` | 旧ルート確率表 / v0.10.581 | 過去確率資料 |
| `README_FIRST.txt` | 2026-08-14更新パッケージ | 過去適用手順 |
| `README_UPDATE_v0.10.728.txt` | v0.10.728 | 過去適用手順 |
| `README_UPDATE_v0.10.729.txt` | v0.10.729 | 過去適用手順 |
| `README_#U6700#U521d#U306b#U8aad#U3093#U3067#U304f#U3060#U3055#U3044.txt` | v0.10.751付近 | 過去GitHub更新手順 |
| `JEWELRYxJEWELRY_#U5f15#U304d#U7d99#U304e#U8cc7#U6599.md` | v0.10.356以前の追加引継ぎ | 過去引継ぎ記録 |
| `legacy-code/auth-cache-recovery-v707.js` | 旧認証/PWA復旧コード | 現在は未参照。履歴保存のみ |
| `verification-code/scripts/` | 旧 `check-vXXX` / 一回限り更新・旧最適化検査 43件 | 現行監査から分離。履歴保存のみ |
| `verification-code/tools/` | 旧 `validate-vXXX` 等 30件 | 現行監査から分離。履歴保存のみ |
| `asset-manifests/` | 工具画像の旧受領・実装・パッケージマニフェスト5件 | 由来追跡専用。現行参照には数えない |
| `legacy-markers/TRIGGER_V725.txt` | 旧更新トリガーマーカー | 履歴保存のみ |

## 過去の実装確認資料

ルートに残っていた `v0.10.xxx_*.md` の確認資料36件は、実行コード・検査スクリプトから参照されていないことを確認したうえで、`docs/archive/verification/` へ移動しました。

- 元ファイル名は維持。
- 現在の仕様・更新手順の根拠には使用しない。
- 一覧は `docs/archive/verification/INDEX.md` を参照。

今後不要ファイル整理を行う場合も、参照調査・バックアップ・削除候補一覧化を先に行い、名前が古いという理由だけでは削除しません。

## 過去の検証コード

`verification-code/` 以下は、当時のVERSIONやファイル配置を前提とする歴史コードです。現在の `scripts/check-current.py` からは実行しません。過去状態の調査が必要な場合は、作業用コピーで当時の配置へ戻して参照します。

`ASSETS.md` の使用場所集計では `docs/archive/` 内の歴史コードを除外し、現在の実行コード・現行検証コードからの参照だけを「静的参照」として扱います。受領マニフェストだけは由来情報として読み取ります。
