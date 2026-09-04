# JEWELRY×JEWELRY

現在の開発基準は、リポジトリ直下 `VERSION` に記録された **v0.10.887** です。

このリポジトリでは、古いZIPや過去版のREADMEを正本として使用しません。**最新版の完全プロジェクト + ルート `VERSION`** を唯一の作業基準にします。

## 正本となる管理ファイル

- `VERSION` — 現行ビルド番号の唯一の正本
- `CHANGELOG.md` — 確定した更新履歴
- `GAME_RULES.md` — 現在実装されているゲーム仕様
- `ASSETS.md` — 画像・音源・動画・データの棚卸し
- `TODO.md` — 未実装・保留・要調査
- `EVENT_PROBABILITY_LIST.md` — 現行コードから生成したイベント確率表
- `docs/archive/` — 過去版README・旧確率資料・旧引継ぎ資料・旧実装確認資料

## 開発手順

1. 作業前に `VERSION` を確認する。
2. `python3 scripts/version-sync.py --check` を実行する。
3. 変更対象を限定し、依頼されていない機能は原則変更しない。
4. 実装後に構文検査・対象機能検査を行う。
5. `python3 scripts/check-current.py` を実行し、`CURRENT BUILD AUDIT: PASS` を確認する。
6. GitHub反映は、ユーザーから明示されたタイミングで行う。

`check-current.py` には静的検査だけでなく、Playwright Chromiumが利用できる環境では実ブラウザ・スモークテストも含まれます。GitHub ActionsではChromiumを準備し、`JXJ_REQUIRE_BROWSER_SMOKE=1` で実ブラウザ検査を必須にします。

## バージョン更新

バージョン番号を各ファイルへ手入力しません。ルート `VERSION` を起点に同期します。

```bash
python3 scripts/version-sync.py --check
python3 scripts/version-sync.py --bump-patch
```

`version-sync.py` は、HTML・Service Worker・主要JavaScriptの有効なキャッシュバスターも確認します。`?v=0.10.xxx` の古い参照が残っている場合はFAILします。

## イベント確率資料

`EVENT_PROBABILITY_LIST.md` は手書きの固定資料ではなく、`js/app.js` の現行定数から生成します。

```bash
python3 scripts/generate-event-probability-list.py --write
python3 scripts/generate-event-probability-list.py --check
```

確率を変更した場合、資料を再生成しないままでは全体監査を通さない運用にします。

## 画像・音源

ユーザー提供画像は、明示許可がない限り以下を禁止します。

- 再生成
- 色変更
- 彩度変更
- 画風変更

「輪郭でトリミング・背景透明PNG」の指定では、原則として元画像のRGBを変えず、アルファと余白だけを処理します。詳細は `ASSETS.md` を確認してください。`ASSETS.md` は `python3 scripts/generate-assets-manifest.py --write` で実ファイルから再生成し、全体監査で一致を確認します。

## セーブ・共通機能

セーブ／ロード、日付進行、所持金、アイテム管理、イベント判定、画像読み込み、PWAは編集注意領域です。必要のない更新では触りません。

現在の `SAVE_SCHEMA_VERSION` は **1** です。

## リポジトリ整理

- `scripts/` と `tools/` には、**現在のビルドを検査・生成・更新するコードだけ**を置きます。
- 過去VERSION専用の `check-vXXX` / `validate-vXXX` / 一回限りの更新スクリプトは `docs/archive/verification-code/` に保存します。
- 過去のアセット受領・実装マニフェストは `docs/archive/asset-manifests/` に保存します。由来追跡には使いますが、現行の実行参照とはみなしません。
- `python3 scripts/check-repository-hygiene.py` で、過去専用コードや生成キャッシュが現行フォルダへ戻っていないことを検査します。この検査は `check-current.py` に含まれます。
- GitHub Pagesはゲーム実行に必要なファイルだけを公開し、`docs/`・`tools/`・設定/検証ファイルは公開対象から除外します。`check-pages-publish-policy.py` で公開設定を検査します。

## 検索・SEO公開

- 正式公開URL（canonical）は `https://cadgosho-dot.github.io/jewelrygame/`。
- `index.html` はゲーム本体の検索入口、`about.html` は検索エンジンと初見ユーザー向けのゲーム紹介ページ。
- `game.html` と `auth.html` は検索結果の重複を避けるため `noindex`。
- `sitemap.xml` は `index.html` と `about.html` の2URLだけを掲載する。
- `index.html` にはOGP / Twitter Card / `VideoGame + WebApplication` の構造化データを置く。
- `python3 scripts/check-seo.py` でSEO要素を検査し、この検査は `check-current.py` に含める。
- GitHub Pagesのプロジェクトサイトは `/jewelrygame/` 配下なので、リポジトリ内の `robots.txt` はホスト直下robotsとしては扱われない。Google向けのサイトマップ登録は公開後にSearch Consoleから `https://cadgosho-dot.github.io/jewelrygame/sitemap.xml` を直接送信する。

## 過去資料について

過去版README、旧イベント確率資料、旧更新パッケージ説明、旧引継ぎ資料、旧実装確認資料は `docs/archive/` に保存しています。履歴確認には使用できますが、**現在の仕様・更新方法の根拠には使用しません**。

アーカイブの分類は `docs/archive/INDEX.md` を参照してください。
