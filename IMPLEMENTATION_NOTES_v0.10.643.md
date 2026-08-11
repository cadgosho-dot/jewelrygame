# JEWELRY×JEWELRY v0.10.643 実装メモ

## 修正内容
- 完成画面のピアスで、左右2石のルースが大きすぎる問題を修正。
- `jewelryLooseSetVisual(..., mode="completion")` のピアス完成時サイズを 48px 基準へ変更。
- スマートフォンでは CSS の最終上限を 42px とし、縦横どちらでもルースがピアス本体を覆いにくいようにした。
- 縦向きスマートフォンの完成画面だけ、ピアス本体とルースを 16px 下へ移動。
- リング・ペンダントの完成表示サイズは v0.10.642 のまま。

## 変更ファイル
- `js/app.js`
- `js/game-data.js`
- `game.html`
- `styles.css`
- `sw.js`
- `CHANGELOG.md`
