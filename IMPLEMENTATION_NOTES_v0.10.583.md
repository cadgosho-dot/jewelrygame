# v0.10.583 実装メモ

- 不動産屋の琥珀イベントに導入動画 `assets/videos/events/tattoo-woman-amber-intro.mp4` を追加。
- イベント開始時は `video` ステージから始め、動画終了後に既存の会話進行（intro1 → intro2 → intro3 → reward → farewell）へ移行。
- 縦画面・横画面とも中央で最大表示し、`object-fit: contain` により映像全体を切らずに表示。
- 動画再生中もBGM・環境音は継続し、音声停止系の制御は行わない。
- 自動再生不可端末では再生ボタンを表示し、読込エラー時は同じ動画を再試行できる。
