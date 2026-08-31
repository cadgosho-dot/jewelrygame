# TODO — JEWELRY×JEWELRY

> 現行基準: **v0.10.815** / 棚卸し日: 2026-08-31
> **未実装・保留・要調査だけ**を置く。実装済み仕様は `GAME_RULES.md`、履歴は `CHANGELOG.md`、メディアは `ASSETS.md` に分離する。

## 優先度A — 安全な開発基盤

- [ ] **Firebase App Checkの管理画面設定を完了する（外部設定）**
  - コード側の初期化・設定検査・不完全設定拒否は実装済み。
  - Google Cloud / Firebase ConsoleでreCAPTCHA Enterpriseのsite keyを取得し、メトリクス確認後にEnforceを有効化する作業だけが残る。詳細は `SECURITY_SETUP.md`。
  - site key未取得のまま `enabled: true` にしない。

- [ ] **Google Search Consoleへ正式公開URLを登録する（v0.10.813公開後の外部作業）**
  - URLプレフィックス `https://cadgosho-dot.github.io/jewelrygame/` を登録する。
  - `https://cadgosho-dot.github.io/jewelrygame/sitemap.xml` を送信する。
  - トップページと `about.html` のインデックス登録をリクエストし、canonicalが正式URLとして認識されたことを確認する。
  - GitHubへv0.10.813以降を公開する前には実行しない。

- [ ] **アセット由来の未分類を減らす**
  - `ASSETS.md` で「由来記録なし」とした画像・音源は、過去チャットや元データが確認できた時だけ由来を追記する。
  - 推測で「ユーザー提供」「GPT生成」に分類しない。

## 優先度B — 不要ファイル整理の前準備

- [ ] `ASSETS.md` の「直接参照未検出」だけを理由に削除せず、動的ファイル名、Service Worker、CSS、ミニゲーム内参照を追加調査する。
- [ ] 今後アセット削除を行う場合は、削除候補一覧とバックアップを先に作り、1件ずつ検証する。
- [ ] 削除後は `python3 scripts/check-current.py` に加え、新規ゲーム・続きから・PWA再起動を実機確認する。

## 優先度C — 未実装・保留のゲーム機能

- [ ] **病院イベント第5回以降**
  - 現在の `HOSPITAL_EVENT_EPISODES` は第1〜4回。第4回完了後は次回発生を停止する。
  - 第5回以降の内容が確定した時だけ追加する。

- [ ] **水槽の魚繁殖**
  - `AQUARIUM_CONFIG` には `juveniles` と `fishBreeding` の制限ルールがあるが、現行 `js/app.js` には実際の繁殖・出生・成長処理を確認できない。
  - 実装する場合は、死亡処理・負荷40・魚種上限と競合しない設計が必要。

- [ ] **水草の自然繁殖**
  - 現行仕様は `plantPropagation: false`。枯死は実装済みだが増殖はしない。
  - 将来追加する場合のみ仕様決定する。

## 履歴上の保留

- [ ] v0.10.792〜798の個別変更記録は、現行 `CHANGELOG.md` から確認できない。
  - v0.10.799が v0.10.791からの統合更新であることは分かる。
  - 過去ZIPや当時の記録が見つかった場合だけ復元し、推測で履歴を作らない。

## 今後の更新テンプレート

新しい作業を始める時は、この形式で1件追加する。

```text
[ ] 目的:
    変更対象:
    変更禁止領域:
    必要アセット:
    セーブ互換への影響:
    完了条件:
```

完了した項目はTODOから削除して終わりではなく、必要に応じて `CHANGELOG.md` と `GAME_RULES.md` へ確定内容を移す。
