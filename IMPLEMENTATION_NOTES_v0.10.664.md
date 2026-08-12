# v0.10.664 実装メモ

- 対象: 店舗ショーケース内の完成品表示、および店舗の商品詳細表示。
- 背景: 店舗側では small / large 用ルース表示を使っていたため、リング・ペンダントで石が本体イラストへ大きく被っていた。工房の完成画面の見え方を基準に合わせる。
- 対応:
  - `jewelryLooseSetVisual()` に `showcaseSmall` モードを追加。
  - 店舗ショーケース枠と陳列選択画面で `showcaseSmall` を使用し、石サイズを item別固定px へ縮小。
  - 店舗の商品詳細画面は `completion-jewelry-preview` + `completion-jewelry-artwork` を使用し、ルース描画も `completion` モードへ統一。
- 非変更: 工房完成画面、制作途中プレビュー、完成品在庫一覧、販売価格・販売確率・ゲームバランス。
