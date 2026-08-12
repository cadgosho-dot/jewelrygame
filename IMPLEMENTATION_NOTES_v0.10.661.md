# JEWELRY×JEWELRY v0.10.661 実装メモ

## 御徒町 18:00以降の夜背景

ユーザー提供の御徒町夜景画像を、ゲーム内時刻18:00以降の背景として追加した。

### 切替条件
- 17:59まで: 既存の御徒町背景
  - 横: `assets/images/okachimachi.webp`
  - 縦: `assets/images/okachimachi-portrait.webp`
- 18:00以降: 夜背景
  - 横: `assets/images/okachimachi-night.webp`
  - 縦: `assets/images/okachimachi-night-portrait.webp`

判定は既存の `OKACHIMACHI_CLOSE_MINUTES = 18 * 60` を共用し、`state.game.minutes >= OKACHIMACHI_CLOSE_MINUTES` とした。
日付が進みゲーム時刻が朝へ戻れば、自動的に昼背景へ戻る。

### 適用範囲
`backgroundFor(target) === 'okachimachi'` の画面で時間帯切替を行う。
御徒町以外の専用背景（ルース屋、ジュエリーショップ、パンダ広場、映画館内部など）は既存仕様を維持する。
映画館イベントで御徒町駅前背景へ戻る段階についても、18:00以降は夜背景を使う。

### 画像
- 元横画像: ユーザー提供 `1000020361.png` (1536x768)
- 元縦画像: ユーザー提供 `1000020362.png` (1024x1536)
- 配布形式: WebP quality 94 / method 6
- 横出力: 1536x768
- 縦出力: 1024x1536

### 変更していないもの
- 上部バー・下部メニュー
- 御徒町の施設ボタン位置・サイズ
- 人物・イベント画面レイアウト
- 営業時間（18:00まで）
- イベント発生率・価格・報酬・セリフ
- BGM / SFX
- 加工知識
