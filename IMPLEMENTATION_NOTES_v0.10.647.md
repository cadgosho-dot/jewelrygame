# v0.10.647 実装メモ

## 修正内容
- 縦画面の完成画面で完成品画像が第2上部バーへ潜り込む問題を共通修正。
- これまでのリング・ペンダント・ピアス個別補正は維持しつつ、端末クラス判定に依存しない portrait 共通ルールを追加。
- `@media (orientation: portrait) and (max-width: 820px)` で、完成画面の `.completion-jewelry-preview` に `margin-top: 76px` を付与。
- 横画面は変更なし。

## 維持した仕様
- リング/ペンダントの完成時ルース縮小。
- ピアスの完成時ルース縮小。
- ピアスのルースは左右の丸玉中心へ配置。
- ルース屋専用50問JSON。
- 3Dメガネの正式会話仕様。

## バージョン同期
- js/game-data.js VERSION: 0.10.647
- js/app.js UI_BUILD_VERSION / lazy query: 0.10.647
- game.html CSS/JS query: 0.10.647
- sw.js VERSION / query: 0.10.647
