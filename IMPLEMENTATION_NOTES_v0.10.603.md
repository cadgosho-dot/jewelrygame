# JEWELRY×JEWELRY v0.10.603 実装内容

## テリー・カリフォルニアイベントの定数宣言修正

`js/app.js` で参照されていたテリー・カリフォルニアイベント用の5定数を明示的に宣言しました。

- `TERRY_CALIFORNIA_EVENT_CHANCE = 30`
- `TERRY_CALIFORNIA_BENITOITE_PRICE = 200000`
- `TERRY_CALIFORNIA_GEM_ID = 'benitoite'`
- `TERRY_CALIFORNIA_GEM_SHAPE = 'oval'`
- `TERRY_CALIFORNIA_MEAL_ID = 'hamburger'`

これにより、ハンバーガー選択時のテリーイベント抽選・ベニトアイト購入・在庫追加・食事復帰処理で未宣言変数によるReferenceErrorが発生する問題を防ぎます。

## その他
- v0.10.602までのイベントレイアウト修正、水槽、ピアス表示、ホワイトバニー等の仕様は変更していません。
- キャッシュ参照をv0.10.603へ更新しました。
