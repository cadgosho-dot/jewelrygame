# JEWELRY×JEWELRY 通常イベントUI 共通固定仕様

承認日: 2026-09-21  
基準: 携帯確認版 v6（オオカミ少年・犬探しシーン）

## 対象
`visit-character-event` 基盤を使う通常会話イベント。

## キャラクター表示

### 縦画面
- キャラクターは画面下寄せ。
- 確認版 v6 の位置を正式基準とする。
- `.visit-character-area`: `bottom: clamp(84px, 20vh, 164px)`
- `.visit-character`: `max-width: min(94vw, 720px)`
- `.visit-character`: `max-height: min(62dvh, 860px)`
- `object-position: center bottom`

### 横画面
- キャラクターは上詰め。
- 頭が画面上端で切れないこと。
- キャラクター下部はセリフ枠へ少しかかってよい。
- 確認版 v6 の位置を正式基準とする。
- `.visit-character-area`: `top: max(0px, env(safe-area-inset-top))`
- `.visit-character-area`: `bottom: clamp(118px, 21vh, 184px)`
- `.visit-character`: `max-width: min(50vw, 680px)`
- `.visit-character`: `max-height: calc(100dvh - 20px)`
- `object-position: center top`

## 「タップして進む」
- 携帯確認版 v6 の大きさを正式基準とする。
- 案内文字側: `font-size: .78rem`
- 内側文字: `transform: scale(.82)`
- 既存の上下アニメーションは維持する。
- 縦・横ともこの大きさを基準にする。

## レイヤー
「背景 < キャラクター < セリフ枠 < セリフ文字」の順を維持する。

## 対象外
- `is-reward`: 報酬アイテム画面。
- `is-jade-reward`: 特殊報酬画面。
- `is-after` / `is-vanishing`: 消失・結果演出。
- クイズイベントUI。
- その他、既にイベント固有の承認済み固定仕様がある特殊イベント。

## 保護ルール
- 通常イベントUIの変更でクイズイベントUIを変更しない。
- クイズイベントUIの変更で通常イベントUIを変更しない。
- 背景画像・キャラクター画像そのもの・セリフ内容はイベント固有とし、勝手に差し替えない。
- 既存の固定イベントは、共通修正の副作用で崩さない。
- 今後の通常イベント携帯確認版・実装は、この基準を使用する。
