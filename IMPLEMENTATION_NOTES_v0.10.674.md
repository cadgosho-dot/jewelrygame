# v0.10.674 implementation notes

- v0.10.673 の横画面メインヘッダー最終ガードに含まれていた `border:0!important` と `box-shadow:none!important` を削除。
- これにより既存のヘッダー枠線・影は従来CSSから継承される。
- `background: transparent` / `backdrop-filter: none` は維持し、曇り・ぼかしは復活させない。
- 修正対象はスマートフォン横画面の `body[data-screen="main"] #root > .game-header.main-header` のみ。
- バージョンを 0.10.674 に同期。
