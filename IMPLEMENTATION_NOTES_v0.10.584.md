# v0.10.584 実装メモ

- 対象: 雨の朝に発生するアンティークダイヤ（ウエスタン・ユニオン）イベント。
- 導入動画: `assets/videos/events/western-union-antique-diamond-intro.mp4`
- イベント開始時は `video` ステージから始まり、再生終了後に `choice` へ進む。
- 縦画面・横画面とも画面中央で最大表示し、`object-fit: contain` で動画全体を表示。
- 動画中もBGM・環境音を維持し、`suspendAudio()` は呼ばない。
- 旧バージョンからイベント途中のセーブを読み込んだ場合も、動画を再生後に元の段階へ戻る。
