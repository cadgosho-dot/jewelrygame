# JEWELRY×JEWELRY v0.10.600 実装内容

- スマートフォン水槽ミニゲームの縦画面表示を縦方向中央へ変更。
- 水槽iframe読み込み後、同一オリジンの水槽HTMLへ portrait 専用CSSを注入。
- `.tank-view` を portrait 時のみ `justify-content:center` / `padding-top:0` に上書き。
- landscape にはルールを適用しないため横画面は v0.10.599 のまま。
- 水槽内データ、観察対象、魚・水草・レイアウト、音、操作処理は変更していない。
