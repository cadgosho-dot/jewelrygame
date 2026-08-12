# v0.10.673 実装メモ

- 対象: メイン画面の横画面時のみ、上部バーに残っていた曇り（半透明背景 / backdrop blur）を除去。
- 原因:
  - 共通 `.game-header` に半透明グラデーション背景と `backdrop-filter: blur(9px)` がある。
  - メイン画面の実DOMではヘッダーが `.main-screen` 内ではなく `#root` 直下にある。
  - 既存の最終透明化ガードは縦画面の `#root > .game-header.main-header` には存在したが、横画面には同等のガードがなく、旧スタイルが残る経路があった。
- 対応:
  - 横画面かつ `body[data-screen="main"]` の `#root > .game-header.main-header` のみに、背景・枠・影・backdrop-filter・filterを無効化する最終ガードを追加。
  - 縦画面、サブ画面、下部メニュー、上部バー内の文字配置は変更していない。
- バージョン同期:
  - `js/app.js` UI_BUILD_VERSION: 0.10.673
  - `js/game-data.js` VERSION: 0.10.673
  - `sw.js` VERSION / キャッシュ参照: 0.10.673
  - `game.html` styles.css / js/app.js query: 0.10.673
  - `js/app.js` の audio / audio-scene-map / daily-gems-index / firebase-service query: 0.10.673
