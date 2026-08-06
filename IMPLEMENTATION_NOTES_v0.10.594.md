# JEWELRY×JEWELRY v0.10.594 実装内容

## アイス
- 食事ID: `ice`
- 表示名: アイス
- 価格: 300円
- 空腹度回復: 1
- 所要時間: 既存の食事共通処理により1時間
- 連続選択: アイスのみ許可
- 空腹度7/7では従来どおり選択不可

## 画像
- 横背景: `assets/images/meal-ice.webp`
- 縦背景: `assets/images/meal-ice-portrait.webp`
- アイス: `assets/images/foods/ice-chocomint.png`
- アイス画像は背景透明PNG。表示時のみCSSで左へ9度回転。

## 音
- BGM: `assets/audio/bgm-meal-ice.ogg`
- 環境音: `assets/audio/amb-meal-ice.ogg`
- 音楽・環境音それぞれのミュート設定と音量設定を反映。
- アイス画面終了時に停止・先頭へ巻き戻し。

## レイアウト
- 横画面の食事選択は、通常食事9件＋回転寿司1件の10カード対応。
- 縦画面は既存の2列表示を維持。
